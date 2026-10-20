# Point the laptop's existing taskbar pin at a newly installed viewer.
#
# The owner reads from the television, never the laptop panel, and launches the
# viewer from its taskbar pin there. Windows opens a window launched from a
# taskbar on that taskbar's screen; desktop icons always live on the primary
# (laptop) screen. So an install repoints every pin that targets a viewer
# package and never creates a pin or a shortcut. A desktop shortcut to the
# viewer is set aside in -Keep rather than repointed, because it can only ever
# open from the wrong screen. Every changed or removed link is kept in -Keep.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File windows-viewer-links.ps1 `
#     -Destination 'C:\Users\qqp\ISO Score Viewer\<package>' -Keep '<backup folder>'
#
# Run it after the old viewer has stopped and the new package is installed.
# -Pins and -Desktops default to the real folders; a rehearsal points them at
# copies.
param(
 [Parameter(Mandatory=$true)][string]$Destination,
 [Parameter(Mandatory=$true)][string]$Keep,
 [string]$Pins=(Join-Path $env:APPDATA 'Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar'),
 [string[]]$Desktops=@([Environment]::GetFolderPath('Desktop'),(Join-Path $env:PUBLIC 'Desktop'))
)
$ErrorActionPreference='Stop'
if(@(Get-Process -Name iso-score-viewer -ErrorAction SilentlyContinue).Count -gt 0){throw 'The viewer is still open'}
$exe=Join-Path $Destination 'iso-score-viewer.exe'
if(-not (Test-Path -LiteralPath $exe)){throw "New package missing: $exe"}
New-Item -ItemType Directory -Force -Path $Keep | Out-Null
$packages=[IO.Path]::GetFullPath((Join-Path $env:USERPROFILE 'ISO Score Viewer'))+'\'
$shell=New-Object -ComObject WScript.Shell
function Is-Viewer([string]$target){
 if(-not $target){return $false}
 $full=[IO.Path]::GetFullPath($target)
 return $full.StartsWith($packages,[StringComparison]::OrdinalIgnoreCase) -and [IO.Path]::GetFileName($full) -ieq 'iso-score-viewer.exe'
}
function Kept([string]$kind,[string]$link){
 $name='previous-'+$kind+'-'+[IO.Path]::GetFileName($link)
 $path=Join-Path $Keep $name
 if(Test-Path -LiteralPath $path){throw "$path already exists"}
 return $path
}
$out=[ordered]@{pins=@();desktop=@()}
foreach($link in @(Get-ChildItem -LiteralPath $Pins -Filter *.lnk -ErrorAction SilentlyContinue)){
 $before=$shell.CreateShortcut($link.FullName).TargetPath
 if(-not (Is-Viewer $before)){continue}
 $keep=Kept 'pin' $link.FullName
 # Edit a copy, then swap it in atomically, keeping the original.
 $temp=Join-Path $Pins ('.sv-update-'+[Guid]::NewGuid().ToString('N')+'.lnk')
 Copy-Item -LiteralPath $link.FullName -Destination $temp
 try{$n=$shell.CreateShortcut($temp);$n.TargetPath=$exe;$n.WorkingDirectory=$Destination;$n.Save();[IO.File]::Replace($temp,$link.FullName,$keep)}
 finally{if(Test-Path -LiteralPath $temp){Remove-Item -LiteralPath $temp}}
 $out.pins+=[ordered]@{link=$link.FullName;previous=$before;now=$shell.CreateShortcut($link.FullName).TargetPath;kept=$keep}
}
foreach($desktop in $Desktops){
 foreach($link in @(Get-ChildItem -LiteralPath $desktop -Filter *.lnk -ErrorAction SilentlyContinue)){
  $target=$shell.CreateShortcut($link.FullName).TargetPath
  if(-not (Is-Viewer $target)){continue}
  $keep=Kept 'desktop' $link.FullName
  Move-Item -LiteralPath $link.FullName -Destination $keep
  $out.desktop+=[ordered]@{link=$link.FullName;target=$target;kept=$keep}
 }
}
if(-not $out.pins.Count){$out.warning='No taskbar pin targets the viewer. Open the viewer and pin it from the television''s taskbar; nothing was created.'}
$out|ConvertTo-Json -Depth 4
