param(
    [string]$ApplicationPath = "",
    [switch]$NoDesktopShortcut,
    [switch]$NoFileAssociation
)
$ErrorActionPreference = "Stop"
$project = Split-Path -Parent $PSScriptRoot
if (-not $ApplicationPath) {
    $ApplicationPath = Join-Path $project "dist\HUANDENG-win32-x64\HUANDENG Editor.exe"
}
$application = (Resolve-Path -LiteralPath $ApplicationPath).Path
$applicationDirectory = Split-Path -Parent $application
$icon = Join-Path $applicationDirectory "resources\app\icon.ico"
if (-not $NoFileAssociation) {
    $classes = "HKCU:\Software\Classes"
    $programId = "HUANDENG.PPTD"
    $typePath = Join-Path $classes $programId
    foreach ($key in @($typePath, "$typePath\DefaultIcon", "$typePath\shell\open\command", "$classes\.pptd", "$classes\.pptd\OpenWithProgids")) {
        New-Item -Path $key -Force | Out-Null
    }
    Set-Item -Path $typePath -Value "HUANDENG Presentation"
    Set-Item -Path "$typePath\shell\open\command" -Value ('"{0}" "%1"' -f $application)
    $fileIcon = if (Test-Path -LiteralPath $icon) { $icon } else { $application }
    Set-Item -Path "$typePath\DefaultIcon" -Value ('"{0}",0' -f $fileIcon)
    Set-Item -Path "$classes\.pptd" -Value $programId
    New-ItemProperty -Path "$classes\.pptd\OpenWithProgids" -Name $programId -PropertyType String -Value "" -Force | Out-Null
    $capabilities = "HKCU:\Software\HUANDENG\Capabilities"
    New-Item -Path "$capabilities\FileAssociations" -Force | Out-Null
    New-ItemProperty -Path $capabilities -Name ApplicationName -Value "HUANDENG Editor" -Force | Out-Null
    New-ItemProperty -Path $capabilities -Name ApplicationDescription -Value "Edit HUANDENG PPTD Projects" -Force | Out-Null
    New-ItemProperty -Path "$capabilities\FileAssociations" -Name ".pptd" -Value $programId -Force | Out-Null
    New-Item -Path "HKCU:\Software\RegisteredApplications" -Force | Out-Null
    New-ItemProperty -Path "HKCU:\Software\RegisteredApplications" -Name "HUANDENG Editor" -Value "Software\HUANDENG\Capabilities" -Force | Out-Null
    $choice = Get-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.pptd\UserChoice" -ErrorAction SilentlyContinue
    if ($choice.ProgId -and $choice.ProgId -ne $programId) {
        Write-Warning "Windows has an explicit user choice for PPTD. Select HUANDENG Editor in Default Apps to change it; the protected UserChoice key was retained."
    }
    if (-not ("HuandengAssociationNotification" -as [type])) {
        Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class HuandengAssociationNotification {
    [DllImport("shell32.dll")] public static extern void SHChangeNotify(uint eventId, uint flags, IntPtr first, IntPtr second);
}
"@
    }
    [HuandengAssociationNotification]::SHChangeNotify(0x08000000, 0, [IntPtr]::Zero, [IntPtr]::Zero)
    Write-Output "Registered PPTD documents with HUANDENG Editor."
}
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
