$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$testRoot = Join-Path $root (".verification\installer-contract-" + [Guid]::NewGuid().ToString("N"))
$registration = "HKCU:\Software\HUANDENG-Installer-Test-" + [Guid]::NewGuid().ToString("N")
$unicode = [string][char]0x9A8C + [char]0x6536 + " " + [char]0x0645 + [char]0x0631 + [char]0x062D + [char]0x0628 + [char]0x0627 + " " + [char]::ConvertFromUtf32(0x1F9EA)
$shortcuts = Join-Path $testRoot ("shortcuts, " + $unicode)
$version = (Get-Content -LiteralPath "$root\packages\desktop\release.json" -Raw -Encoding UTF8 | ConvertFrom-Json).version
New-Item -ItemType Directory -Path $testRoot -Force | Out-Null
. "$PSScriptRoot\Windows-Shortcut.ps1"
$checks = @()
function Assert-True($condition, $message) { if (-not $condition) { throw $message } }
function New-TestApplication($name) {
    $directory = Join-Path $testRoot $name
    New-Item -ItemType Directory -Path (Join-Path $directory "resources\app") -Force | Out-Null
    [System.IO.File]::WriteAllText((Join-Path $directory "HUANDENG Editor.exe"), "synthetic executable")
    [System.IO.File]::WriteAllText((Join-Path $directory "owned.txt"), "original application file")
    [System.IO.File]::WriteAllText((Join-Path $directory "resources\app\icon.ico"), "synthetic icon")
    [System.IO.File]::WriteAllText((Join-Path $directory "huandeng-build.json"), (@{ product="HUANDENG Editor"; productVersion=$version } | ConvertTo-Json))
    $files = @{}
    foreach ($file in @("HUANDENG Editor.exe", "owned.txt", "huandeng-build.json", "resources/app/icon.ico")) {
        $files[$file] = @{ sha256 = (Get-FileHash -LiteralPath (Join-Path $directory $file)).Hash.ToLowerInvariant(); bytes = (Get-Item -LiteralPath (Join-Path $directory $file)).Length }
    }
    [System.IO.File]::WriteAllText((Join-Path $directory "huandeng-content.json"), (@{schemaVersion=1;productVersion=$version;files=$files} | ConvertTo-Json -Depth 8))
    return Join-Path $directory "HUANDENG Editor.exe"
}
function Read-TestShortcut([string]$path) {
    Assert-True (Test-Path -LiteralPath $path) "The saved shortcut is missing."
    return ([Huandeng.WindowsShortcutShell]::new()).CreateShortcut($path)
}
function Assert-Shortcut([string]$path, [string]$application) {
    $link = Read-TestShortcut $path
    Assert-True ([string]::Equals($link.TargetPath, $application, [StringComparison]::OrdinalIgnoreCase)) "Saved shortcut target differs from the full Unicode application path."
    Assert-True ([string]::Equals($link.WorkingDirectory, (Split-Path -Parent $application), [StringComparison]::OrdinalIgnoreCase)) "Saved shortcut working directory is incorrect."
    Assert-True ($link.Description -ceq "HUANDENG Editor") "Saved shortcut description is incorrect."
    Assert-True ([string]::Equals($link.IconPath, (Join-Path (Split-Path -Parent $application) "resources\app\icon.ico"), [StringComparison]::OrdinalIgnoreCase)) "Saved shortcut icon path is incorrect."
    Assert-True ($link.IconIndex -eq 0) "Saved shortcut icon index is incorrect."
}
function Test-DefaultShortcutLocations([string]$application) {
    $directories = [Collections.Generic.List[string]]::new()
    $fakeShell = [pscustomobject]@{ Shortcuts = [Collections.Generic.List[object]]::new() }
    $fakeShell | Add-Member -MemberType ScriptMethod -Name CreateShortcut -Value {
        param([string]$file)
        $shortcut = [pscustomobject]@{ Path=$file; TargetPath=""; WorkingDirectory=""; Description=""; IconPath=""; IconIndex=0; Saved=$false }
        $shortcut | Add-Member -MemberType ScriptMethod -Name Save -Value { $this.Saved = $true }
        $this.Shortcuts.Add($shortcut)
        return $shortcut
    }
    function New-Item([string]$ItemType, [string]$Path, [switch]$Force) {
        Assert-True ($ItemType -eq "Directory") "The default shortcut check must not write registrations."
        $directories.Add($Path)
    }
    function New-Object([string]$TypeName) {
        Assert-True ($TypeName -eq "Huandeng.WindowsShortcutShell") "Unexpected side effect in shortcut check."
        return $fakeShell
    }
    & "$PSScriptRoot\Install-Huandeng.ps1" -ApplicationPath $application -NoFileAssociation | Out-Null
    Assert-True ($directories.Count -eq 2 -and $fakeShell.Shortcuts.Count -eq 2) "Default installation must create two separate shortcut targets."
    $expected = @([Environment]::GetFolderPath("Programs"), [Environment]::GetFolderPath("DesktopDirectory"))
    foreach ($index in @(0, 1)) {
        Assert-True ($directories[$index] -eq $expected[$index]) "Default shortcut directory is incorrect."
        Assert-True ($fakeShell.Shortcuts[$index].Path -eq (Join-Path $expected[$index] "HUANDENG Editor.lnk")) "Default shortcut path is incorrect."
        Assert-True ($fakeShell.Shortcuts[$index].TargetPath -eq $application -and $fakeShell.Shortcuts[$index].Saved) "Default shortcut was not saved for the selected application."
    }
    $directories.Clear()
    $fakeShell.Shortcuts.Clear()
    & "$PSScriptRoot\Install-Huandeng.ps1" -ApplicationPath $application -NoFileAssociation -NoDesktopShortcut | Out-Null
    Assert-True ($directories.Count -eq 1 -and $directories[0] -eq $expected[0] -and $fakeShell.Shortcuts.Count -eq 1) "NoDesktopShortcut must retain only the Start Menu shortcut."
}
try {
    $first = New-TestApplication ("first, " + $unicode)
    $second = New-TestApplication ("second, " + $unicode)
    $shortcutPath = Join-Path $shortcuts "HUANDENG Editor.lnk"
    Test-DefaultShortcutLocations $first
    $checks += "Default shortcuts use separate Start Menu/Desktop paths and honor NoDesktopShortcut."
    $choicePath = "$registration\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.pptd\UserChoice"
    New-Item -Path $choicePath -Force | Out-Null
    New-ItemProperty -Path $choicePath -Name ProgId -Value "Other.Application" -Force | Out-Null
    New-Item -Path "$registration\Classes\.pptd" -Force | Out-Null
    Set-Item -Path "$registration\Classes\.pptd" -Value "Other.Application"
    & "$PSScriptRoot\Install-Huandeng.ps1" -ApplicationPath $first -RegistrationRoot $registration -ShortcutDirectory $shortcuts | Out-Null
    $commandKey = "$registration\Classes\HUANDENG.PPTD\shell\open\command"
    Assert-True ((Get-Item -Path $commandKey).GetValue("") -eq ('"{0}" "%1"' -f $first)) "Install command is incorrect."
    Assert-True ((Get-Item -Path "$registration\Classes\.pptd").GetValue("") -eq "Other.Application") "Existing default was overwritten."
    Assert-True ((Get-ItemProperty -Path $choicePath).ProgId -eq "Other.Application") "Protected choice was changed."
    Assert-Shortcut $shortcutPath $first
    $checks += "Saved links retain Chinese, Arabic and emoji paths, working directory, description and icon."
    $roundTripPath = Join-Path $shortcuts ("roundtrip " + $unicode + ".lnk")
    $roundTrip = ([Huandeng.WindowsShortcutShell]::new()).CreateShortcut($roundTripPath)
    $roundTrip.TargetPath = $first
    $roundTrip.WorkingDirectory = Split-Path -Parent $first
    $roundTrip.Description = $unicode
    $roundTrip.Arguments = '--label "' + $unicode + '"'
    $roundTrip.IconPath = Join-Path (Split-Path -Parent $first) "resources\app\icon.ico"
    $roundTrip.IconIndex = 3
    $roundTrip.Save()
    $saved = Read-TestShortcut $roundTripPath
    Assert-True ($saved.Description -ceq $unicode -and $saved.Arguments -ceq $roundTrip.Arguments -and $saved.IconPath -ceq $roundTrip.IconPath -and $saved.IconIndex -eq 3) "Unicode link metadata did not survive saving and loading."
    $checks += "Unicode descriptions, arguments and icon metadata survive native save/load."
    $damaged = Read-TestShortcut $shortcutPath
    $damaged.TargetPath = $second
    $damaged.WorkingDirectory = Split-Path -Parent $second
    $damaged.Description = "Damaged shortcut"
    $damaged.IconPath = ""
    $damaged.Save()
    foreach ($attempt in @(1, 2)) {
        & "$PSScriptRoot\Install-Huandeng.ps1" -ApplicationPath $first -RegistrationRoot $registration -ShortcutDirectory $shortcuts | Out-Null
        Assert-Shortcut $shortcutPath $first
    }
    $checks += "Repair restores a damaged shortcut and is repeatable."
    & "$PSScriptRoot\Install-Huandeng.ps1" -ApplicationPath $second -RegistrationRoot $registration -ShortcutDirectory $shortcuts | Out-Null
    $replacementHash = (Get-FileHash -LiteralPath $shortcutPath).Hash
    & "$PSScriptRoot\Uninstall-Huandeng.ps1" -ApplicationPath $first -RegistrationRoot $registration -ShortcutDirectory $shortcuts | Out-Null
    Assert-True ((Get-Item -Path $commandKey).GetValue("") -eq ('"{0}" "%1"' -f $second)) "Old uninstall removed the newer installation."
    Assert-Shortcut $shortcutPath $second
    Assert-True ((Get-FileHash -LiteralPath $shortcutPath).Hash -eq $replacementHash) "Old uninstall changed the replacement shortcut."
    $checks += "Old installation cannot unregister or change its replacement's Unicode shortcut."
    $secondDirectory = Split-Path -Parent $second
    $project = Join-Path $secondDirectory "My Research"
    New-Item -ItemType Directory -Path $project | Out-Null
    [System.IO.File]::WriteAllText((Join-Path $project "deck.pptd"), "user project")
    [System.IO.File]::WriteAllText((Join-Path $secondDirectory "owned.txt"), "user modified")
    & "$PSScriptRoot\Uninstall-Huandeng.ps1" -ApplicationPath $second -RegistrationRoot $registration -ShortcutDirectory $shortcuts -RemoveApplication | Out-Null
    Assert-True (-not (Test-Path -LiteralPath $second)) "Owned executable was not removed."
    Assert-True (-not (Test-Path -LiteralPath $shortcutPath)) "Owned Unicode shortcut was not removed."
    Assert-True (Test-Path -LiteralPath $roundTripPath) "Uninstall removed an unrelated shortcut."
    Assert-True ((Get-Content -LiteralPath (Join-Path $project "deck.pptd") -Raw) -eq "user project") "User Project changed."
    Assert-True ((Get-Content -LiteralPath (Join-Path $secondDirectory "owned.txt") -Raw) -eq "user modified") "Modified file was removed."
    Assert-True (-not (Test-Path -Path $commandKey)) "Owned registration remained."
    Assert-True ((Get-ItemProperty -Path $choicePath).ProgId -eq "Other.Application") "Uninstall changed protected choice."
    $checks += "Uninstall removes owned Unicode links/files and preserves Projects, edits and UserChoice."
    $third = New-TestApplication "malformed manifest"
    $thirdDirectory = Split-Path -Parent $third
    $bad = @{ schemaVersion=1; productVersion=$version; files=@{ "../outside.txt"=@{sha256=("0"*64)} } }
    [System.IO.File]::WriteAllText((Join-Path $thirdDirectory "huandeng-content.json"), ($bad | ConvertTo-Json -Depth 8))
    $rejected = $false
    try { & "$PSScriptRoot\Uninstall-Huandeng.ps1" -ApplicationPath $third -RegistrationRoot $registration -ShortcutDirectory $shortcuts -RemoveApplication | Out-Null } catch { $rejected = $true }
    Assert-True $rejected "Traversal manifest was accepted."
    Assert-True (Test-Path -LiteralPath $third) "Malformed manifest caused partial application deletion."
    $checks += "Malformed manifest is rejected before deletion."
    $report = @{passed=$true;checks=$checks;count=$checks.Count;defaultCodePage=[Text.Encoding]::Default.CodePage;unicodePath=$shortcuts}
    [System.IO.File]::WriteAllText((Join-Path $testRoot "result.json"), ($report | ConvertTo-Json -Depth 5))
    $report | ConvertTo-Json -Depth 5
} finally {
    if (Test-Path -Path $registration) { Remove-Item -Path $registration -Recurse -Force }
}
