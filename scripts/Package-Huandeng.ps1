param(
    [string]$ElectronRuntimePath = "",
    [string]$OutputDirectory = "",
    [switch]$Replace,
    [switch]$Official
)
$ErrorActionPreference = "Stop"
$project = Split-Path -Parent $PSScriptRoot
if (-not $OutputDirectory) { $OutputDirectory = Join-Path $project "dist\HUANDENG-win32-x64" }
$OutputDirectory = [System.IO.Path]::GetFullPath($OutputDirectory)
if (-not $ElectronRuntimePath) {
    $ElectronRuntimePath = Join-Path $project "packages\desktop\node_modules\electron\dist"
}
if ([System.IO.Path]::GetExtension($ElectronRuntimePath) -eq ".exe") {
    $ElectronRuntimePath = Split-Path -Parent $ElectronRuntimePath
}
$runtime = (Resolve-Path -LiteralPath $ElectronRuntimePath).Path
if (-not (Test-Path -LiteralPath (Join-Path $runtime "electron.exe"))) {
    throw "ElectronRuntimePath must contain the pinned Electron Windows distribution."
}
if (-not (Test-Path -LiteralPath (Join-Path $project "packages\core\dist\huandeng\bin.js"))) {
    throw "Build the document service first: corepack pnpm --filter @open-slide/core build"
}
if (Test-Path -LiteralPath $OutputDirectory) {
    if (-not $Replace) { throw "Output already exists; use -Replace to update this build: $OutputDirectory" }
    if (-not (Test-Path -LiteralPath (Join-Path $OutputDirectory "huandeng-build.json"))) {
        throw "Refusing to replace a directory without a HUANDENG build marker."
    }
    $running = Get-Process -ErrorAction SilentlyContinue | Where-Object {
        $_.Path -and $_.Path.StartsWith($OutputDirectory + "\", [StringComparison]::OrdinalIgnoreCase)
    }
    if ($running) { throw "Close HUANDENG Editor before replacing its desktop build." }
}
$desktopManifest = Get-Content -LiteralPath (Join-Path $project "packages\desktop\package.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$runtimeVersion = (Get-Content -LiteralPath (Join-Path $runtime "version") -Raw -Encoding UTF8).Trim()
if ($runtimeVersion -ne $desktopManifest.devDependencies.electron) { throw "The selected Electron runtime does not match the pinned package version." }
if ($Official) {
    $releaseVersion = (Get-Content -LiteralPath (Join-Path $project "packages\desktop\release.json") -Raw -Encoding UTF8 | ConvertFrom-Json).version
    $sourceChanges = & git -c core.fsmonitor=false -C $project status --porcelain
    if ($LASTEXITCODE -ne 0 -or $sourceChanges) { throw "Official packages require a clean checkout." }
    $sourceTags = @(& git -c core.fsmonitor=false -C $project tag --points-at HEAD)
    if ($LASTEXITCODE -ne 0 -or $sourceTags -notcontains ("editor-v" + $releaseVersion)) { throw "Official packages require the matching editor-v tag at HEAD." }
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
    & corepack pnpm --config.node-linker=hoisted --config.package-import-method=copy --filter @huandeng/desktop deploy --prod $appDirectory
    if ($LASTEXITCODE -ne 0) { throw "pnpm deploy failed with exit code $LASTEXITCODE" }
} finally {
    Pop-Location
}
Copy-Item -LiteralPath (Join-Path $buildWorkspace "desktop-runtime.json") -Destination (Join-Path $stage "huandeng-runtime.json")
$verifiedWorkspace = (Resolve-Path -LiteralPath $buildWorkspace).Path
$verificationRoot = [System.IO.Path]::GetFullPath((Join-Path $project '.verification'))
if (-not $verifiedWorkspace.StartsWith($verificationRoot + '\', [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Build workspace escaped the verification directory; cleanup was not performed.'
}
Remove-Item -LiteralPath $verifiedWorkspace -Recurse -Force
& node (Join-Path $PSScriptRoot "prune-desktop-sourcemaps.mjs") $appDirectory
if ($LASTEXITCODE -ne 0) { throw "Pruning staged dependency source maps failed." }
& node (Join-Path $PSScriptRoot "verify-desktop-package.mjs") $appDirectory
if ($LASTEXITCODE -ne 0) { throw "The staged application is not self-contained." }
$defaultApp = Join-Path $stage "resources\default_app.asar"
if (Test-Path -LiteralPath $defaultApp) { Remove-Item -LiteralPath $defaultApp }
Rename-Item -LiteralPath (Join-Path $stage "electron.exe") -NewName "HUANDENG Editor.exe"
$crashReporter = Join-Path $stage "electron_wer.dll"
if (Test-Path -LiteralPath $crashReporter) {
    Rename-Item -LiteralPath $crashReporter -NewName "HUANDENG Editor_wer.dll"
}
& node (Join-Path $PSScriptRoot "brand-desktop.mjs") $stage
if ($LASTEXITCODE -ne 0) { throw "Setting Windows product identity failed." }
foreach ($name in @("Install-Huandeng.ps1", "Uninstall-Huandeng.ps1", "Install-Huandeng.cmd", "Uninstall-Huandeng.cmd")) {
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot $name) -Destination (Join-Path $stage $name)
}
Copy-Item -LiteralPath (Join-Path $project "docs\WINDOWS-INSTALL.md") -Destination (Join-Path $stage "INSTALL.md")
$identityArguments = @((Join-Path $PSScriptRoot "write-desktop-build.mjs"), $stage)
if ($Official) { $identityArguments += "--official" }
& node @identityArguments
if ($LASTEXITCODE -ne 0) { throw "Writing the package identity and content manifest failed." }
New-Item -ItemType Directory -Path (Split-Path -Parent $OutputDirectory) -Force | Out-Null
if (Test-Path -LiteralPath $OutputDirectory) {
    & node (Join-Path $PSScriptRoot "verify-replaceable-build.mjs") $OutputDirectory
    if ($LASTEXITCODE -ne 0) { throw "Existing build contains missing, changed or unowned files. Choose a new output directory." }
    Remove-Item -LiteralPath $OutputDirectory -Recurse -Force
}
$verifiedStage = (Resolve-Path -LiteralPath $stage).Path
if (-not $verifiedStage.StartsWith($verificationRoot + '\', [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Package staging escaped the verification directory; move was not performed.'
}
Move-Item -LiteralPath $verifiedStage -Destination $OutputDirectory
& node (Join-Path $PSScriptRoot "verify-desktop-package.mjs") (Join-Path $OutputDirectory "resources\app")
if ($LASTEXITCODE -ne 0) { throw "The application did not pass its relocation check." }
Write-Output (Join-Path $OutputDirectory "HUANDENG Editor.exe")
