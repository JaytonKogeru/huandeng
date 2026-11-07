param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Directory,
    [int]$ExpectedSlides = 80
)
$ErrorActionPreference = 'Stop'
$Source = (Resolve-Path -LiteralPath $Source).Path
New-Item -ItemType Directory -Force -Path $Directory | Out-Null
$Directory = (Resolve-Path -LiteralPath $Directory).Path
$evidence = [ordered]@{
    schemaVersion = 1
    source = $Source
    expectedSlides = $ExpectedSlides
    openAndRepair = $false
    success = $false
    sourceUnchanged = $false
    visualReview = 'Pending separate inspection of the exported PNGs.'
    pages = @()
    contactSheets = @()
    error = $null
}
$application = $null
$presentation = $null
$initialCount = -1
try {
    $evidence.bytes = (Get-Item -LiteralPath $Source).Length
    $evidence.sourceSha256 = (Get-FileHash -LiteralPath $Source -Algorithm SHA256).Hash.ToLowerInvariant()
    $application = New-Object -ComObject PowerPoint.Application
    $initialCount = $application.Presentations.Count
    $evidence.officeVersion = $application.Version
    $presentation = $application.Presentations.Open2007($Source, -1, 0, 0, 0)
    $evidence.readOnly = ($presentation.ReadOnly -ne 0)
    $evidence.slideCount = $presentation.Slides.Count
    if ($evidence.slideCount -ne $ExpectedSlides) { throw "Expected $ExpectedSlides slides, opened $($evidence.slideCount)." }
    $evidence.topLevelObjects = 0
    $evidence.nativeTables = 0
    $evidence.nativeCharts = 0
    $evidence.nativeGroups = 0
    Write-Output "Opened $($evidence.slideCount) slides read-only with OpenAndRepair disabled."
    for ($index = 1; $index -le $evidence.slideCount; $index++) {
        $exportSlide = $presentation.Slides.Item($index)
        try {
            $evidence.topLevelObjects += $exportSlide.Shapes.Count
            for ($objectIndex = 1; $objectIndex -le $exportSlide.Shapes.Count; $objectIndex++) {
                $shape = $exportSlide.Shapes.Item($objectIndex)
                try {
                    if ($shape.HasTable -ne 0) { $evidence.nativeTables++ }
                    if ($shape.HasChart -ne 0) { $evidence.nativeCharts++ }
                    if ($shape.Type -eq 6) { $evidence.nativeGroups++ }
                } finally { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($shape) }
            }
            $png = Join-Path $Directory ('slide-{0:D3}.png' -f $index)
            $exportSlide.Export($png, 'PNG', 1600, 900)
            $evidence.pages += [ordered]@{
                slide = $index
                path = $png
                bytes = (Get-Item -LiteralPath $png).Length
                sha256 = (Get-FileHash -LiteralPath $png -Algorithm SHA256).Hash.ToLowerInvariant()
            }
        } finally { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($exportSlide) }
        if ($index % 10 -eq 0) { Write-Output "Exported $index of $($evidence.slideCount) original slides." }
    }
    $presentation.Close()
    $evidence.closedOwnDocument = $true
    [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($presentation)
    $presentation = $null
    if ($initialCount -eq 0 -and $application.Presentations.Count -eq 0) { $application.Quit() }
    [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($application)
    $application = $null

    Add-Type -AssemblyName System.Drawing
    $thumbWidth = 800
    $thumbHeight = 450
    $labelHeight = 32
    $font = [Drawing.Font]::new('Arial', 14)
    try {
        for ($first = 1; $first -le $evidence.slideCount; $first += 8) {
            $sheet = [Drawing.Bitmap]::new($thumbWidth * 2, ($thumbHeight + $labelHeight) * 4)
            $graphics = [Drawing.Graphics]::FromImage($sheet)
            try {
                $graphics.Clear([Drawing.Color]::White)
                $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $last = [Math]::Min($first + 7, $evidence.slideCount)
                for ($number = $first; $number -le $last; $number++) {
                    $slot = $number - $first
                    $left = ($slot % 2) * $thumbWidth
                    $top = [Math]::Floor($slot / 2) * ($thumbHeight + $labelHeight)
                    $graphics.FillRectangle([Drawing.Brushes]::LightGray, $left, $top, $thumbWidth, $labelHeight)
                    $graphics.DrawString("Slide $number", $font, [Drawing.Brushes]::Black, [single]($left + 10), [single]($top + 4))
                    $image = [Drawing.Image]::FromFile((Join-Path $Directory ('slide-{0:D3}.png' -f $number)))
                    try {
                        if ($image.Width -ne 1600 -or $image.Height -ne 900) { throw "Slide $number has unexpected PNG dimensions." }
                        $target = [Drawing.Rectangle]::new($left, $top + $labelHeight, $thumbWidth, $thumbHeight)
                        $graphics.DrawImage($image, $target)
                    } finally { $image.Dispose() }
                }
                $contact = Join-Path $Directory ('contact-{0:D3}-{1:D3}.png' -f $first, $last)
                $sheet.Save($contact, [Drawing.Imaging.ImageFormat]::Png)
                $evidence.contactSheets += [ordered]@{
                    first = $first
                    last = $last
                    path = $contact
                    sha256 = (Get-FileHash -LiteralPath $contact -Algorithm SHA256).Hash.ToLowerInvariant()
                }
            } finally { $graphics.Dispose(); $sheet.Dispose() }
        }
    } finally { $font.Dispose() }
    $evidence.success = $true
} catch {
    $evidence.error = $_.Exception.Message
    Write-Output $evidence.error
} finally {
    if ($presentation) {
        try { $presentation.Close(); $evidence.closedOwnDocument = $true } catch { $evidence.success = $false; $evidence.closeError = $_.Exception.Message }
        [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($presentation)
    }
    if ($application) {
        if ($initialCount -eq 0 -and $application.Presentations.Count -eq 0) { $application.Quit() }
        [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($application)
    }
    $evidence.finalSha256 = (Get-FileHash -LiteralPath $Source -Algorithm SHA256).Hash.ToLowerInvariant()
    $evidence.sourceUnchanged = ($evidence.sourceSha256 -eq $evidence.finalSha256)
    if (-not $evidence.sourceUnchanged) { $evidence.success = $false }
    $report = Join-Path $Directory 'office-render-acceptance.json'
    [IO.File]::WriteAllText($report, ($evidence | ConvertTo-Json -Depth 8), [Text.UTF8Encoding]::new($false))
    Write-Output $report
}
if (-not $evidence.success) { throw 'PowerPoint opening or PNG export acceptance failed.' }
