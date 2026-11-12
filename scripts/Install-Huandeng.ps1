param(
    [string]$ApplicationPath = "",
    [switch]$NoDesktopShortcut,
    [switch]$NoFileAssociation,
    [ValidatePattern('^HKCU:\\Software(?:\\|$)')][string]$RegistrationRoot = "HKCU:\Software",
    [string]$ShortcutDirectory = ""
)
$ErrorActionPreference = "Stop"
$project = Split-Path -Parent $PSScriptRoot
if (-not $ApplicationPath) {
    $portable = Join-Path $PSScriptRoot "HUANDENG Editor.exe"
    $ApplicationPath = if (Test-Path -LiteralPath $portable) { $portable } else { Join-Path $project "dist\HUANDENG-win32-x64\HUANDENG Editor.exe" }
}
$application = (Resolve-Path -LiteralPath $ApplicationPath).Path
$applicationDirectory = Split-Path -Parent $application
$markerPath = Join-Path $applicationDirectory "huandeng-build.json"
$marker = Get-Content -LiteralPath $markerPath -Raw -Encoding UTF8 | ConvertFrom-Json
if ($marker.product -ne "HUANDENG Editor") { throw "The selected application has no valid HUANDENG build identity." }
$icon = Join-Path $applicationDirectory "resources\app\icon.ico"
if (-not $NoFileAssociation) {
    $statePath = "$RegistrationRoot\HUANDENG\InstallState"
    New-Item -Path $statePath -Force | Out-Null
    New-ItemProperty -Path $statePath -Name ApplicationPath -Value $application -Force | Out-Null
    New-ItemProperty -Path $statePath -Name ProductVersion -Value $marker.productVersion -Force | Out-Null
    $classes = "$RegistrationRoot\Classes"
    $programId = "HUANDENG.PPTD"
    $typePath = Join-Path $classes $programId
    foreach ($key in @($typePath, "$typePath\DefaultIcon", "$typePath\shell\open\command", "$classes\.pptd", "$classes\.pptd\OpenWithProgids")) {
        if (-not (Test-Path -Path $key)) { New-Item -Path $key -Force | Out-Null }
    }
    Set-Item -Path $typePath -Value "HUANDENG Presentation"
    Set-Item -Path "$typePath\shell\open\command" -Value ('"{0}" "%1"' -f $application)
    $fileIcon = if (Test-Path -LiteralPath $icon) { $icon } else { $application }
    Set-Item -Path "$typePath\DefaultIcon" -Value ('"{0}",0' -f $fileIcon)
    $existingDefault = (Get-Item -Path "$classes\.pptd").GetValue("")
    if (-not $existingDefault -or $existingDefault -eq $programId) {
        Set-Item -Path "$classes\.pptd" -Value $programId
    }
    New-ItemProperty -Path "$classes\.pptd\OpenWithProgids" -Name $programId -PropertyType String -Value "" -Force | Out-Null
    $capabilities = "$RegistrationRoot\HUANDENG\Capabilities"
    New-Item -Path "$capabilities\FileAssociations" -Force | Out-Null
    New-ItemProperty -Path $capabilities -Name ApplicationName -Value "HUANDENG Editor" -Force | Out-Null
    New-ItemProperty -Path $capabilities -Name ApplicationDescription -Value "Edit HUANDENG PPTD Projects" -Force | Out-Null
    New-ItemProperty -Path "$capabilities\FileAssociations" -Name ".pptd" -Value $programId -Force | Out-Null
    New-Item -Path "$RegistrationRoot\RegisteredApplications" -Force | Out-Null
    New-ItemProperty -Path "$RegistrationRoot\RegisteredApplications" -Name "HUANDENG Editor" -Value "Software\HUANDENG\Capabilities" -Force | Out-Null
    $choice = Get-ItemProperty -Path "$RegistrationRoot\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.pptd\UserChoice" -ErrorAction SilentlyContinue
    if (($choice.ProgId -and $choice.ProgId -ne $programId) -or ($existingDefault -and $existingDefault -ne $programId)) {
        Write-Warning "An existing PPTD choice was retained. Select HUANDENG Editor in Open with or Windows Default Apps."
    }
    if ($RegistrationRoot -eq "HKCU:\Software") {
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
    }
}
$shortcutShell = New-Object -ComObject WScript.Shell
$locations = @(if ($ShortcutDirectory) { [System.IO.Path]::GetFullPath($ShortcutDirectory) } else { [Environment]::GetFolderPath("Programs") })
if (-not $ShortcutDirectory -and -not $NoDesktopShortcut) { $locations += [Environment]::GetFolderPath("DesktopDirectory") }
foreach ($location in $locations) {
    New-Item -ItemType Directory -Path $location -Force | Out-Null
    $shortcutPath = Join-Path $location "HUANDENG Editor.lnk"
    $shortcut = $shortcutShell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $application
    $shortcut.WorkingDirectory = $applicationDirectory
    $shortcut.Description = "HUANDENG Editor"
    if (Test-Path -LiteralPath $icon) { $shortcut.IconLocation = $icon }
    $shortcut.Save()
    Write-Output $shortcutPath
}
Write-Output ("Installed/repaired HUANDENG Editor {0} for the current user at {1}" -f $marker.productVersion, $applicationDirectory)
