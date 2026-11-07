param(
    [string]$Deck = "",
    [switch]$ReadOnly,
    [switch]$Welcome,
    [string]$ElectronPath = ""
)
$ErrorActionPreference = "Stop"
$project = Split-Path -Parent $PSScriptRoot
$packagedApp = Join-Path $project "dist\HUANDENG-win32-x64\HUANDENG Editor.exe"
$appArguments = @()
if (Test-Path -LiteralPath $packagedApp) {
    $executable = $packagedApp
} else {
    if (-not $ElectronPath) { $ElectronPath = $env:HUANDENG_ELECTRON_PATH }
    if (-not $ElectronPath) {
        $ElectronPath = Join-Path $project "packages\desktop\node_modules\electron\dist\electron.exe"
    }
    if (-not (Test-Path -LiteralPath $ElectronPath)) {
        throw "Build HUANDENG Editor first with scripts\Package-Huandeng.ps1, or set HUANDENG_ELECTRON_PATH to an installed Electron 38.7.2 executable."
    }
    $executable = (Resolve-Path -LiteralPath $ElectronPath).Path
    $appArguments += Join-Path $project "packages\desktop"
}
if ($Deck) {
    $appArguments += @("--entry", (Resolve-Path -LiteralPath $Deck).Path)
}
if ($ReadOnly) { $appArguments += "--read-only" }
if ($Welcome) { $appArguments += "--welcome" }
$startOptions = @{
    FilePath = $executable
    WorkingDirectory = $project
}
if ($appArguments.Count) {
    $startOptions.ArgumentList = ($appArguments | ForEach-Object { '"' + $_ + '"' }) -join " "
}
Start-Process @startOptions | Out-Null
