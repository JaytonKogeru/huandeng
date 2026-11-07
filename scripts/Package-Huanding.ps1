param(
    [string]$ElectronRuntimePath = "",
    [string]$OutputDirectory = "",
    [switch]$Replace
)
$ErrorActionPreference = "Stop"
$project = Split-Path -Parent $PSScriptRoot
if (-not $OutputDirectory) { $OutputDirectory = Join-Path $project "dist\HUANDING-win32-x64" }
$OutputDirectory = [System.IO.Path]::GetFullPath($OutputDirectory)
if (-not $ElectronRuntimePath) {
    $ElectronRuntimePath = Join-Path $project "packages\desktop\node_modules\electron\dist"
}
if ([System.IO.Path]::GetExtension($ElectronRuntimePath) -eq ".exe") {
    $ElectronRuntimePath = Split-Path -Parent $ElectronRuntimePath
}
$runtime = (Resolve-Path -LiteralPath $ElectronRuntimePath).Path
if (-not (Test-Path -LiteralPath (Join-Path $runtime "electron.exe"))) {
    throw "ElectronRuntimePath must contain an Electron 38.7.2 Windows distribution."
}
if (-not (Test-Path -LiteralPath (Join-Path $project "packages\core\dist\huandeng\bin.js"))) {
    throw "Build the document service first: corepack pnpm --filter @open-slide/core build"
}
if (Test-Path -LiteralPath $OutputDirectory) {
    if (-not $Replace) { throw "Output already exists; use -Replace to update this build: $OutputDirectory" }
    if (-not (Test-Path -LiteralPath (Join-Path $OutputDirectory "huanding-build.json"))) {
        throw "Refusing to replace a directory without a HUANDING build marker."
    }
    $running = Get-Process -ErrorAction SilentlyContinue | Where-Object {
        $_.Path -and $_.Path.StartsWith($OutputDirectory + "\", [StringComparison]::OrdinalIgnoreCase)
    }
    if ($running) { throw "Close HUANDING Editor before replacing its desktop build." }
}
$buildId = [Guid]::NewGuid().ToString("N")
$stage = Join-Path $project (".verification\desktop-package-" + $buildId)
$buildWorkspace = Join-Path $project (".verification\desktop-workspace-" + $buildId)
New-Item -ItemType Directory -Path $stage -Force | Out-Null
Get-ChildItem -LiteralPath $runtime | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $stage -Recurse -Force
}
$appDirectory = Join-Path $stage "resources\app"
& node (Join-Path $PSScriptRoot "prepare-desktop-workspace.mjs") $buildWorkspace
if ($LASTEXITCODE -ne 0) { throw "Preparing the desktop build workspace failed." }
Push-Location $buildWorkspace
try {
    & corepack pnpm --config.node-linker=hoisted --config.package-import-method=copy --filter @huanding/desktop deploy --prod $appDirectory
    if ($LASTEXITCODE -ne 0) { throw "pnpm deploy failed with exit code $LASTEXITCODE" }
} finally {
    Pop-Location
}
Remove-Item -LiteralPath $buildWorkspace -Recurse -Force
& node (Join-Path $PSScriptRoot "verify-desktop-package.mjs") $appDirectory
if ($LASTEXITCODE -ne 0) { throw "The staged application is not self-contained." }
$sourceRevision = (& git -C $project rev-parse HEAD).Trim()
$defaultApp = Join-Path $stage "resources\default_app.asar"
if (Test-Path -LiteralPath $defaultApp) { Remove-Item -LiteralPath $defaultApp }
Rename-Item -LiteralPath (Join-Path $stage "electron.exe") -NewName "HUANDING Editor.exe"
$crashReporter = Join-Path $stage "electron_wer.dll"
if (Test-Path -LiteralPath $crashReporter) {
    Rename-Item -LiteralPath $crashReporter -NewName "HUANDING Editor_wer.dll"
}
$marker = @{
    product = "HUANDING Editor"
    desktopProtocol = 1
    electronVersion = "38.7.2"
    nodeLinker = "hoisted"
    sourceRevision = $sourceRevision
    sourceDirty = [bool](& git -C $project status --porcelain)
    builtAt = [DateTime]::UtcNow.ToString("o")
}
[System.IO.File]::WriteAllText((Join-Path $stage "huanding-build.json"), ($marker | ConvertTo-Json), [System.Text.UTF8Encoding]::new($false))
New-Item -ItemType Directory -Path (Split-Path -Parent $OutputDirectory) -Force | Out-Null
if (Test-Path -LiteralPath $OutputDirectory) { Remove-Item -LiteralPath $OutputDirectory -Recurse -Force }
Move-Item -LiteralPath $stage -Destination $OutputDirectory
& node (Join-Path $PSScriptRoot "verify-desktop-package.mjs") (Join-Path $OutputDirectory "resources\app")
if ($LASTEXITCODE -ne 0) { throw "The application did not pass its relocation check." }
Write-Output (Join-Path $OutputDirectory "HUANDING Editor.exe")
