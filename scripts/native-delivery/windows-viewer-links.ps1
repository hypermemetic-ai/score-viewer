# Point the existing taskbar pin at a newly installed viewer.
#
# The viewer is read on a second display and launched from the taskbar pin
# there. Windows opens a window launched from a taskbar on that taskbar's
# screen; desktop icons always live on the primary screen. So an install never creates a pin or a shortcut, and a
# desktop shortcut to the viewer is set aside in -Keep, because it can only ever
# open from the wrong screen.
#
# The pin itself never has to change. It targets
# <packages>\current\iso-score-viewer.exe, and current is a junction that this
# script points at the new package. Explorer keeps its own record of every pin
# and tracks the .lnk file by identity: a pin whose file was swapped through
# File.Replace or a temporary file resolves to that temporary name, launches
# nothing and cannot be unpinned. So a pin that still targets a package folder
# (as every new pin does, because Windows records the junction's target) is
# rewritten in place, once, to target current. Every changed or removed link is
# kept in -Keep.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File windows-viewer-links.ps1 `
#     -Destination "$env:USERPROFILE\ISO Score Viewer\<package>" -Keep '<backup folder>'
#
# Run it after the old viewer has stopped and the new package is installed.
# Every link is classified and every backup name checked before anything
# changes, so a refusal leaves all links as they were. Running it again after
# success changes nothing; running it with an older package rolls back.
# -Pins, -UserDesktop, -PublicDesktop and -Current default to the real
# locations; a rehearsal points them at copies.
param(
 [Parameter(Mandatory=$true)][string]$Destination,
 [Parameter(Mandatory=$true)][string]$Keep,
 [string]$Pins=(Join-Path $env:APPDATA 'Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar'),
 [string]$UserDesktop=[Environment]::GetFolderPath('Desktop'),
 [string]$PublicDesktop=(Join-Path $env:PUBLIC 'Desktop'),
 [string]$Current=(Join-Path $env:USERPROFILE 'ISO Score Viewer\current')
)
$ErrorActionPreference='Stop'
if(@(Get-Process -Name iso-score-viewer -ErrorAction SilentlyContinue).Count -gt 0){throw 'The viewer is still open'}
$packages=[IO.Path]::GetFullPath((Join-Path $env:USERPROFILE 'ISO Score Viewer'))+'\'
$Current=[IO.Path]::GetFullPath($Current)
$currentExe=Join-Path $Current 'iso-score-viewer.exe'
function Is-Viewer([string]$target){
 if(-not $target){return $false}
 # Shell and Store pins have targets that are not file paths; none is the viewer.
 try{$full=[IO.Path]::GetFullPath($target)}catch{return $false}
 if($full -ieq $currentExe){return $true}
 return $full.StartsWith($packages,[StringComparison]::OrdinalIgnoreCase) -and [IO.Path]::GetFileName($full) -ieq 'iso-score-viewer.exe'
}
$Destination=(Resolve-Path -LiteralPath $Destination).ProviderPath.TrimEnd('\')
$exe=Join-Path $Destination 'iso-score-viewer.exe'
if(-not (Test-Path -LiteralPath $exe -PathType Leaf)){throw "New package missing: $exe"}
if(-not (Is-Viewer $exe) -or $exe -ieq $currentExe){throw "Not an installed viewer package: $exe"}
$previousPackage=$null
if(Test-Path -LiteralPath $Current){
 $item=Get-Item -LiteralPath $Current -Force
 if($item.LinkType -ne 'Junction'){throw "$Current exists and is not a junction; nothing was changed"}
 $previousPackage=@($item.Target)[0]
}
$shell=New-Object -ComObject WScript.Shell

# Plan every change first.
$plan=@()
foreach($link in @(Get-ChildItem -LiteralPath $Pins -Filter *.lnk -ErrorAction SilentlyContinue)){
 $target=$shell.CreateShortcut($link.FullName).TargetPath
 if(-not (Is-Viewer $target)){continue}
 if([IO.Path]::GetFullPath($target) -ieq $currentExe){continue}
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
if($plan.Count){New-Item -ItemType Directory -Force -Path $Keep | Out-Null}
$out=[ordered]@{current=[ordered]@{path=$Current;previous=$previousPackage;now=$Destination};pins=@();desktop=@()}
if($previousPackage -ine $Destination){
 # Deleting a junction without recursion removes only the link, never the package it points at.
 if($previousPackage){[IO.Directory]::Delete($Current)}
 try{New-Item -ItemType Junction -Path $Current -Target $Destination | Out-Null}
 catch{if($previousPackage -and -not (Test-Path -LiteralPath $Current)){New-Item -ItemType Junction -Path $Current -Target $previousPackage | Out-Null};throw}
}
if(-not (Test-Path -LiteralPath $currentExe -PathType Leaf)){throw "$currentExe does not open the new package"}
foreach($step in @($plan|Where-Object kind -eq 'pin')){
 Copy-Item -LiteralPath $step.link -Destination $step.backup
 if((Get-FileHash -LiteralPath $step.link).Hash -ne (Get-FileHash -LiteralPath $step.backup).Hash){throw "Could not keep $($step.link)"}
 # Save over the same file, never a swapped copy, so Explorer's record of the pin still resolves.
 $n=$shell.CreateShortcut($step.link);$icon=[Environment]::ExpandEnvironmentVariables(($n.IconLocation -split ',')[0])
 if($icon -and $icon.StartsWith($packages,[StringComparison]::OrdinalIgnoreCase)){$n.IconLocation="$currentExe,0"}
 $n.TargetPath=$currentExe;$n.WorkingDirectory=$Current;$n.Save()
 # SHCNE_UPDATEITEM, SHCNF_PATHW: let the taskbar reread the pin.
 [ScoreViewer.Shell]::SHChangeNotify(0x2000,0x5,$step.link,[IntPtr]::Zero)
 $out.pins+=[ordered]@{link=$step.link;previous=$step.target;now=$shell.CreateShortcut($step.link).TargetPath;kept=$step.backup}
}
foreach($step in @($plan|Where-Object kind -eq 'desktop')){
 Move-Item -LiteralPath $step.link -Destination $step.backup
 $out.desktop+=[ordered]@{link=$step.link;target=$step.target;kept=$step.backup}
}
$pinned=@(Get-ChildItem -LiteralPath $Pins -Filter *.lnk -ErrorAction SilentlyContinue|Where-Object{$t=$shell.CreateShortcut($_.FullName).TargetPath;$t -and (Is-Viewer $t) -and ([IO.Path]::GetFullPath($t) -ieq $currentExe)})
$out.pinned=@($pinned|ForEach-Object FullName)
if(-not $pinned.Count){$out.warning="No taskbar pin targets the viewer. Start $currentExe, pin it from the taskbar of the display it is read on, close it and run this again; nothing was created."}
$out|ConvertTo-Json -Depth 4
