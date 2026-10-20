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
# Every link is classified and every backup name checked before anything
# changes, so a refusal leaves all links as they were. Running it again after
# success changes nothing. -Pins and -Desktops default to the real folders; a
# rehearsal points them at copies.
param(
 [Parameter(Mandatory=$true)][string]$Destination,
 [Parameter(Mandatory=$true)][string]$Keep,
 [string]$Pins=(Join-Path $env:APPDATA 'Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar'),
 [string]$UserDesktop=[Environment]::GetFolderPath('Desktop'),
 [string]$PublicDesktop=(Join-Path $env:PUBLIC 'Desktop')
)
$ErrorActionPreference='Stop'
if(@(Get-Process -Name iso-score-viewer -ErrorAction SilentlyContinue).Count -gt 0){throw 'The viewer is still open'}
$packages=[IO.Path]::GetFullPath((Join-Path $env:USERPROFILE 'ISO Score Viewer'))+'\'
function Is-Viewer([string]$target){
 if(-not $target){return $false}
 # Shell and Store pins have targets that are not file paths; none is the viewer.
 try{$full=[IO.Path]::GetFullPath($target)}catch{return $false}
 return $full.StartsWith($packages,[StringComparison]::OrdinalIgnoreCase) -and [IO.Path]::GetFileName($full) -ieq 'iso-score-viewer.exe'
}
$Destination=(Resolve-Path -LiteralPath $Destination).ProviderPath
$exe=Join-Path $Destination 'iso-score-viewer.exe'
if(-not (Test-Path -LiteralPath $exe -PathType Leaf)){throw "New package missing: $exe"}
if(-not (Is-Viewer $exe)){throw "Not an installed viewer package: $exe"}
$shell=New-Object -ComObject WScript.Shell

# Plan every change first.
$plan=@()
foreach($link in @(Get-ChildItem -LiteralPath $Pins -Filter *.lnk -ErrorAction SilentlyContinue)){
 $target=$shell.CreateShortcut($link.FullName).TargetPath
 if(-not (Is-Viewer $target)){continue}
 if([IO.Path]::GetFullPath($target) -ieq $exe){continue}
 $plan+=[pscustomobject]@{kind='pin';link=$link.FullName;target=$target;backup=(Join-Path $Keep ('previous-pin-'+$link.Name))}
}
foreach($desktop in @(@('user',$UserDesktop),@('public',$PublicDesktop))){
 foreach($link in @(Get-ChildItem -LiteralPath $desktop[1] -Filter *.lnk -ErrorAction SilentlyContinue)){
  $target=$shell.CreateShortcut($link.FullName).TargetPath
  if(-not (Is-Viewer $target)){continue}
  $plan+=[pscustomobject]@{kind='desktop';link=$link.FullName;target=$target;backup=(Join-Path $Keep ('previous-desktop-'+$desktop[0]+'-'+$link.Name))}
 }
}
$names=@{}
foreach($step in $plan){
 if(Test-Path -LiteralPath $step.backup){throw "$($step.backup) already exists; nothing was changed"}
 if($names.ContainsKey($step.backup)){throw "Two links would be kept as $($step.backup); nothing was changed"}
 $names[$step.backup]=$true
}

Add-Type -Namespace ScoreViewer -Name Shell -MemberDefinition '[DllImport("shell32.dll", CharSet=CharSet.Unicode)] public static extern void SHChangeNotify(int eventId, uint flags, string item1, IntPtr item2);'
New-Item -ItemType Directory -Force -Path $Keep | Out-Null
$out=[ordered]@{pins=@();desktop=@()}
foreach($step in @($plan|Where-Object kind -eq 'pin')){
 # Keep the original first, then edit a copy beside the pin and swap it in.
 Copy-Item -LiteralPath $step.link -Destination $step.backup
 if((Get-FileHash -LiteralPath $step.link).Hash -ne (Get-FileHash -LiteralPath $step.backup).Hash){throw "Could not keep $($step.link)"}
 $temp=Join-Path $Pins ('.sv-update-'+[Guid]::NewGuid().ToString('N')+'.lnk')
 Copy-Item -LiteralPath $step.link -Destination $temp
 try{
  $n=$shell.CreateShortcut($temp);$oldDirectory=Split-Path -Parent ([IO.Path]::GetFullPath($step.target))
  if($n.IconLocation -and $n.IconLocation.StartsWith($oldDirectory,[StringComparison]::OrdinalIgnoreCase)){$n.IconLocation="$exe,0"}
  $n.TargetPath=$exe;$n.WorkingDirectory=$Destination;$n.Save()
  [IO.File]::Replace($temp,$step.link,[NullString]::Value)
 }finally{if(Test-Path -LiteralPath $temp){Remove-Item -LiteralPath $temp}}
 # SHCNE_UPDATEITEM, SHCNF_PATHW: let the taskbar reread the pin.
 [ScoreViewer.Shell]::SHChangeNotify(0x2000,0x5,$step.link,[IntPtr]::Zero)
 $out.pins+=[ordered]@{link=$step.link;previous=$step.target;now=$shell.CreateShortcut($step.link).TargetPath;kept=$step.backup}
}
foreach($step in @($plan|Where-Object kind -eq 'desktop')){
 Move-Item -LiteralPath $step.link -Destination $step.backup
 $out.desktop+=[ordered]@{link=$step.link;target=$step.target;kept=$step.backup}
}
$current=@(Get-ChildItem -LiteralPath $Pins -Filter *.lnk -ErrorAction SilentlyContinue|Where-Object{$t=$shell.CreateShortcut($_.FullName).TargetPath;$t -and (Is-Viewer $t) -and ([IO.Path]::GetFullPath($t) -ieq $exe)})
$out.current=@($current|ForEach-Object FullName)
if(-not $current.Count){$out.warning='No taskbar pin targets the viewer. Open the viewer and pin it from the television''s taskbar; nothing was created.'}
$out|ConvertTo-Json -Depth 4
