param([string]$Directory = (Join-Path $PSScriptRoot '..\.verification\native-v04'))
$ErrorActionPreference = 'Stop'
$Directory = [IO.Path]::GetFullPath($Directory)
$source = Join-Path $Directory 'native-export-acceptance.pptx'
$roundtrip = Join-Path $Directory 'native-editability-roundtrip.pptx'
$resultPath = Join-Path $Directory 'office-acceptance.json'
$app = $null
$presentation = $null
$reopened = $null
$initialPresentations = -1
$initialExcelProcesses = @(Get-Process EXCEL -ErrorAction SilentlyContinue).Count
$excelApps = [Collections.Generic.List[object]]::new()
$sourceHash = (Get-FileHash $source -Algorithm SHA256).Hash.ToLowerInvariant()
$result = [ordered]@{
  schemaVersion = 1; sourceSha256 = $sourceHash; success = $false
  openAndRepair = $false; sourceUnchanged = $false; slideCount = 0
  officeVersion = ''; nativeTables = @(); nativeCharts = @(); nativeGroups = @()
  images = @(); editedTableReopened = $false; editedChartReopened = $false
  originalMathCount = 0; roundtripMathCount = 0; error = $null
}

function Count-OfficeMath([string]$file) {
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $zip = [IO.Compression.ZipFile]::OpenRead($file)
  try {
    $count = 0
    foreach ($entry in $zip.Entries) {
      if ($entry.FullName -notmatch '^ppt/slides/slide[0-9]+\.xml$') { continue }
      $reader = [IO.StreamReader]::new($entry.Open())
      try { $xml = [xml]$reader.ReadToEnd() } finally { $reader.Dispose() }
      $count += $xml.SelectNodes('//*[local-name()="oMath"]').Count
    }
    return $count
  } finally { $zip.Dispose() }
}

function Read-ChartWorkbook($shape, [bool]$edit = $false) {
  $shape.Chart.ChartData.Activate()
  $workbook = $shape.Chart.ChartData.Workbook
  $excelApps.Add($workbook.Application)
  try {
    $sheet = $workbook.Worksheets.Item(1)
    $zero = $sheet.Range('B2').Value2
    if ($null -eq $zero -or [double]$zero -ne 0) { throw "Chart $($shape.Name) lost a numeric zero." }
    $values = [ordered]@{ name = $shape.Name; B2 = $zero; B3 = $sheet.Range('B3').Value2; B4 = $sheet.Range('B4').Value2 }
    if ($edit) { $sheet.Range('B3').Value2 = 4.5 }
    return $values
  } finally { $workbook.Close($edit) }
}

try {
  $app = New-Object -ComObject PowerPoint.Application
  $initialPresentations = $app.Presentations.Count
  $result.officeVersion = $app.Version
  foreach ($existing in $app.Presentations) {
    if ($existing.FullName -eq $source -or $existing.FullName -eq $roundtrip) {
      throw 'The acceptance file is already open. Close that temporary fixture before running this check.'
    }
  }
  # Open2007 defaults to repair; explicitly disable repair so damaged output cannot silently pass.
  $presentation = $app.Presentations.Open2007($source, -1, 0, 0, 0)
  $result.slideCount = $presentation.Slides.Count
  if ($result.slideCount -ne 5) { throw 'The native acceptance deck must contain five slides.' }
  Write-Output 'Opened five slides with OpenAndRepair disabled.'
  for ($i = 1; $i -le $presentation.Slides.Count; $i++) {
    $slide = $presentation.Slides.Item($i)
    foreach ($shape in $slide.Shapes) {
      if ($shape.HasTable -eq -1) {
        $result.nativeTables += [ordered]@{ slide = $i; name = $shape.Name; rows = $shape.Table.Rows.Count; columns = $shape.Table.Columns.Count; sample = $shape.Table.Cell(3, 1).Shape.TextFrame.TextRange.Text }
      }
      if ($shape.HasChart -eq -1) {
        $values = Read-ChartWorkbook $shape
        $result.nativeCharts += [ordered]@{ slide = $i; name = $shape.Name; chartType = $shape.Chart.ChartType; series = $shape.Chart.SeriesCollection().Count; workbook = $values }
      }
      if ($shape.Type -eq 6) {
        $result.nativeGroups += [ordered]@{ slide = $i; name = $shape.Name; members = $shape.GroupItems.Count }
      }
    }
    $png = Join-Path $Directory ('slide-' + $i + '.png')
    $slide.Export($png, 'PNG', 1280, 720)
    if (-not (Test-Path $png)) { throw "Slide $i did not export an image." }
    $result.images += [ordered]@{ slide = $i; path = $png; bytes = (Get-Item $png).Length; sha256 = (Get-FileHash $png -Algorithm SHA256).Hash.ToLowerInvariant() }
    Write-Output "Verified objects and exported slide $i."
  }
  if ($result.nativeTables.Count -ne 1 -or $result.nativeCharts.Count -ne 6 -or $result.nativeGroups.Count -ne 1) {
    throw 'Native table/chart/group counts did not match the generated fixture.'
  }
  if ($result.nativeGroups[0].members -ne 3) { throw 'The diagram group lost members.' }
  $presentation.Slides.Item(1).Shapes.Item('results-table').Table.Cell(3, 1).Shape.TextFrame.TextRange.Text = 'Control edited in PowerPoint'
  $firstChart = $presentation.Slides.Item(2).Shapes.Item('Bar data with zero')
  $null = Read-ChartWorkbook $firstChart $true
  $firstChart.Chart.Refresh()
  $presentation.SaveCopyAs($roundtrip, 24)
  $presentation.Saved = -1
  $presentation.Close()
  $presentation = $null
  $reopened = $app.Presentations.Open2007($roundtrip, -1, 0, 0, 0)
  $result.editedTableReopened = $reopened.Slides.Item(1).Shapes.Item('results-table').Table.Cell(3, 1).Shape.TextFrame.TextRange.Text -eq 'Control edited in PowerPoint'
  $reopenedValues = Read-ChartWorkbook $reopened.Slides.Item(2).Shapes.Item('Bar data with zero')
  $result.editedChartReopened = [double]$reopenedValues.B3 -eq 4.5
  $result.originalMathCount = Count-OfficeMath $source
  $result.roundtripMathCount = Count-OfficeMath $roundtrip
  $result.sourceUnchanged = (Get-FileHash $source -Algorithm SHA256).Hash.ToLowerInvariant() -eq $sourceHash
  if (-not $result.editedTableReopened -or -not $result.editedChartReopened) { throw 'Native table/chart edits did not survive save and reopen.' }
  if ($result.originalMathCount -lt 5 -or $result.roundtripMathCount -ne $result.originalMathCount) { throw 'Office math objects were lost during roundtrip.' }
  if (-not $result.sourceUnchanged) { throw 'The acceptance source file was changed.' }
  $result.success = $true
  Write-Output 'Native object edits survived save/reopen; source hash is unchanged.'
} catch {
  $result.error = $_.Exception.Message
  throw
} finally {
  foreach ($owned in @($presentation, $reopened)) {
    if ($null -ne $owned) { try { $owned.Saved = -1; $owned.Close() } catch {} }
  }
  if ($null -ne $app -and $initialPresentations -eq 0) {
    try { if ($app.Presentations.Count -eq 0) { $app.Quit() } } catch {}
  }
  if ($initialExcelProcesses -eq 0) {
    foreach ($excel in $excelApps) {
      try { if ($excel.Workbooks.Count -eq 0) { $excel.Quit() } } catch {}
    }
  }
  [IO.File]::WriteAllText($resultPath, ($result | ConvertTo-Json -Depth 12), [Text.UTF8Encoding]::new($false))
  Write-Output $resultPath
}
