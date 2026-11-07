param(
    [string]$Deck = "",
    [int]$Port = 4850,
    [switch]$ReadOnly
)
$ErrorActionPreference = "Stop"
$project = Split-Path -Parent $PSScriptRoot
Set-Location $project
if (-not $Deck) { $Deck = Join-Path $project "tests\fixtures\studio\deck.pptd" }
$entry = (Resolve-Path -LiteralPath $Deck).Path
$launcher = Join-Path $project "packages\core\huandeng.js"
if (-not (Test-Path (Join-Path $project "packages\core\dist\huandeng\bin.js"))) {
    throw "Build Huandeng first: corepack pnpm --filter @open-slide/core build"
}
$arguments = @($launcher, "open", $entry, "--port", "$Port")
if ($ReadOnly) { $arguments += "--read-only" }
& node @arguments
exit $LASTEXITCODE
