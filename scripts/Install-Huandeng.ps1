param(
    [string]$ApplicationPath = "",
    [switch]$NoDesktopShortcut
)
$ErrorActionPreference = "Stop"
$project = Split-Path -Parent $PSScriptRoot
if (-not $ApplicationPath) {
    $ApplicationPath = Join-Path $project "dist\HUANDENG-win32-x64\HUANDENG Editor.exe"
}
$application = (Resolve-Path -LiteralPath $ApplicationPath).Path
$applicationDirectory = Split-Path -Parent $application
$icon = Join-Path $applicationDirectory "resources\app\icon.ico"
$shortcutShell = New-Object -ComObject WScript.Shell
$locations = @([Environment]::GetFolderPath("Programs"))
if (-not $NoDesktopShortcut) { $locations += [Environment]::GetFolderPath("DesktopDirectory") }
foreach ($location in $locations) {
    $shortcutPath = Join-Path $location "HUANDENG Editor.lnk"
    $shortcut = $shortcutShell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $application
    $shortcut.WorkingDirectory = $applicationDirectory
    $shortcut.Description = "HUANDENG Editor"
    if (Test-Path -LiteralPath $icon) { $shortcut.IconLocation = $icon }
    $shortcut.Save()
    $legacyPath = Join-Path $location 'HUANDING Editor.lnk'
    if (Test-Path -LiteralPath $legacyPath) {
        $legacyTarget = $shortcutShell.CreateShortcut($legacyPath).TargetPath
        $expectedLegacy = Join-Path $project 'dist\HUANDING-win32-x64\HUANDING Editor.exe'
        if ([string]::Equals($legacyTarget, $expectedLegacy, [StringComparison]::OrdinalIgnoreCase)) {
            Remove-Item -LiteralPath $legacyPath
        }
    }
    Write-Output $shortcutPath
}
