param(
    [string]$ApplicationPath = "",
    [switch]$RemoveApplication,
    [ValidatePattern('^HKCU:\\Software(?:\\|$)')][string]$RegistrationRoot = "HKCU:\Software",
    [string]$ShortcutDirectory = ""
)
$ErrorActionPreference = "Stop"
if (-not $ApplicationPath) { $ApplicationPath = Join-Path $PSScriptRoot "HUANDENG Editor.exe" }
$application = [System.IO.Path]::GetFullPath($ApplicationPath)
$applicationDirectory = Split-Path -Parent $application
$marker = Get-Content -LiteralPath (Join-Path $applicationDirectory "huandeng-build.json") -Raw -Encoding UTF8 | ConvertFrom-Json
if ($marker.product -ne "HUANDENG Editor") { throw "Refusing to remove an application without a HUANDENG build identity." }
$removable = @()
$retained = @()
$directories = @{}
if ($RemoveApplication) {
    $running = Get-Process -ErrorAction SilentlyContinue | Where-Object {
        $_.Path -and $_.Path.StartsWith($applicationDirectory + "\", [StringComparison]::OrdinalIgnoreCase)
    }
    if ($running) { throw "Close HUANDENG Editor before removing its application files." }
    $manifestPath = Join-Path $applicationDirectory "huandeng-content.json"
    $manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($manifest.schemaVersion -ne 1 -or $manifest.productVersion -ne $marker.productVersion) { throw "Invalid application content manifest." }
    foreach ($item in $manifest.files.PSObject.Properties) {
        if ([System.IO.Path]::IsPathRooted($item.Name) -or $item.Name -match '(^|[\\/])\.\.([\\/]|$)' -or $item.Value.sha256 -notmatch '^[a-f0-9]{64}$') {
            throw "Invalid path or digest in the application content manifest."
        }
        $candidate = [System.IO.Path]::GetFullPath((Join-Path $applicationDirectory $item.Name))
        if (-not $candidate.StartsWith($applicationDirectory + "\", [StringComparison]::OrdinalIgnoreCase)) { throw "The content manifest escapes the application directory." }
        $parent = Split-Path -Parent $candidate
        $safe = $true
        while ($parent.StartsWith($applicationDirectory + "\", [StringComparison]::OrdinalIgnoreCase)) {
            if ((Test-Path -LiteralPath $parent) -and ((Get-Item -LiteralPath $parent).Attributes -band [System.IO.FileAttributes]::ReparsePoint)) { $safe = $false }
            $directories[$parent] = $true
            $parent = Split-Path -Parent $parent
        }
        if (-not (Test-Path -LiteralPath $candidate)) { continue }
        $file = Get-Item -LiteralPath $candidate
        if (-not $safe -or ($file.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -or $file.PSIsContainer -or (Get-FileHash -LiteralPath $candidate -Algorithm SHA256).Hash.ToLowerInvariant() -ne $item.Value.sha256) {
            $retained += $item.Name
            continue
        }
        $removable += $candidate
    }
}
$commandPath = "$RegistrationRoot\Classes\HUANDENG.PPTD\shell\open\command"
$expectedCommand = '"{0}" "%1"' -f $application
$registeredCommand = if (Test-Path -Path $commandPath) { (Get-Item -Path $commandPath).GetValue("") } else { "" }
$ownsRegistration = [string]::Equals($registeredCommand, $expectedCommand, [StringComparison]::OrdinalIgnoreCase)
if ($ownsRegistration) {
    Remove-Item -Path "$RegistrationRoot\Classes\HUANDENG.PPTD" -Recurse -Force
    $extensionPath = "$RegistrationRoot\Classes\.pptd"
    if (Test-Path -Path $extensionPath) {
        $extension = Get-Item -Path $extensionPath
        if ($extension.GetValue("") -eq "HUANDENG.PPTD") { $extension.DeleteValue("", $false) }
    }
    Remove-ItemProperty -Path "$extensionPath\OpenWithProgids" -Name "HUANDENG.PPTD" -ErrorAction SilentlyContinue
}
$statePath = "$RegistrationRoot\HUANDENG\InstallState"
$installedPath = (Get-ItemProperty -Path $statePath -ErrorAction SilentlyContinue).ApplicationPath
if (($ownsRegistration -or -not $registeredCommand) -and [string]::Equals($installedPath, $application, [StringComparison]::OrdinalIgnoreCase)) {
    Remove-Item -Path "$RegistrationRoot\HUANDENG\Capabilities" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-ItemProperty -Path "$RegistrationRoot\RegisteredApplications" -Name "HUANDENG Editor" -ErrorAction SilentlyContinue
    Remove-Item -Path $statePath -Recurse -Force
}
. "$PSScriptRoot\Windows-Shortcut.ps1"
$shortcutShell = New-Object -TypeName Huandeng.WindowsShortcutShell
$locations = if ($ShortcutDirectory) { @([System.IO.Path]::GetFullPath($ShortcutDirectory)) } else { @([Environment]::GetFolderPath("Programs"), [Environment]::GetFolderPath("DesktopDirectory")) }
foreach ($location in $locations) {
    $shortcutPath = Join-Path $location "HUANDENG Editor.lnk"
    if (Test-Path -LiteralPath $shortcutPath) {
        $target = $shortcutShell.CreateShortcut($shortcutPath).TargetPath
        if ([string]::Equals($target, $application, [StringComparison]::OrdinalIgnoreCase)) { Remove-Item -LiteralPath $shortcutPath }
    }
}
if ($RemoveApplication) {
    foreach ($candidate in $removable) { Remove-Item -LiteralPath $candidate -Force }
    Remove-Item -LiteralPath $manifestPath
    foreach ($directory in ($directories.Keys | Sort-Object Length -Descending)) {
        if ((Test-Path -LiteralPath $directory) -and -not (Get-ChildItem -LiteralPath $directory -Force | Select-Object -First 1)) { Remove-Item -LiteralPath $directory }
    }
    if (-not (Get-ChildItem -LiteralPath $applicationDirectory -Force | Select-Object -First 1)) { Remove-Item -LiteralPath $applicationDirectory }
    if ($retained.Count) { Write-Warning ("Retained modified application files: " + ($retained -join ", ")) }
}
Write-Output "Removed this installation's registrations and shortcuts. User projects and preferences are retained."
