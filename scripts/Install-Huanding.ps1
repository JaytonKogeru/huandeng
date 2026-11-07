param(
    [string]$ApplicationPath = "",
    [switch]$NoDesktopShortcut
)
$ErrorActionPreference = "Stop"
$project = Split-Path -Parent $PSScriptRoot
if (-not $ApplicationPath) {
    $ApplicationPath = Join-Path $project "dist\HUANDING-win32-x64\HUANDING Editor.exe"
}
$application = (Resolve-Path -LiteralPath $ApplicationPath).Path
$applicationDirectory = Split-Path -Parent $application
$icon = Join-Path $applicationDirectory "resources\app\icon.ico"
$shortcutShell = New-Object -ComObject WScript.Shell
$locations = @([Environment]::GetFolderPath("Programs"))
if (-not $NoDesktopShortcut) { $locations += [Environment]::GetFolderPath("DesktopDirectory") }
foreach ($location in $locations) {
    $shortcutPath = Join-Path $location "HUANDING Editor.lnk"
    $shortcut = $shortcutShell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $application
    $shortcut.WorkingDirectory = $applicationDirectory
    $shortcut.Description = "HUANDING Editor"
    if (Test-Path -LiteralPath $icon) { $shortcut.IconLocation = $icon }
    $shortcut.Save()
    Write-Output $shortcutPath
}
