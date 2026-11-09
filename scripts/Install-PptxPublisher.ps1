param(
    [string]$ApplicationPath = "",
    [string]$ConfigPath = "",
    [string]$TaskName = "HUANDENG-ShareBox-Slides",
    [switch]$Apply
)
$ErrorActionPreference = "Stop"
$project = Split-Path -Parent $PSScriptRoot
if (-not $ApplicationPath) { $ApplicationPath = Join-Path $project "dist\HUANDENG-win32-x64\HUANDENG Editor.exe" }
if (-not $ConfigPath) { $ConfigPath = Join-Path $env:LOCALAPPDATA "Huandeng\ShareBoxPublisher\config.json" }
$application = (Resolve-Path -LiteralPath $ApplicationPath).Path
$config = (Resolve-Path -LiteralPath $ConfigPath).Path
$directory = Split-Path -Parent $config
$appDirectory = Join-Path (Split-Path -Parent $application) "resources\app"
$publisher = (Resolve-Path -LiteralPath (Join-Path $appDirectory "publisher.cjs")).Path
$launcher = (Resolve-Path -LiteralPath (Join-Path $appDirectory "publish-hidden.vbs")).Path
$settings = Get-Content -LiteralPath $config -Raw -Encoding UTF8 | ConvertFrom-Json
if ($settings.schemaVersion -ne 1 -or -not $settings.projects) { throw "Invalid publisher configuration." }
foreach ($item in $settings.projects) {
    if (-not [IO.Path]::IsPathRooted($item.entry) -or [IO.Path]::GetExtension($item.entry) -ne ".pptd") { throw "An absolute PPTD entry is required." }
    if (-not [IO.Path]::IsPathRooted($item.destination) -or [IO.Path]::GetExtension($item.destination) -ne ".pptx") { throw "An absolute PPTX destination is required." }
    if (-not (Test-Path -LiteralPath $item.entry -PathType Leaf)) { throw "Configured Project is missing: $($item.id)" }
}
$hostPath = Join-Path $env:SystemRoot "System32\wscript.exe"
$arguments = '//B //Nologo "{0}" "{1}" "{2}" "{3}"' -f $launcher, $application, $publisher, $config
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
$plan = [ordered]@{
    taskName = $TaskName
    executable = $hostPath
    arguments = $arguments
    intervalMinutes = 10
    configuredProjects = @($settings.projects).Count
    usesConsoleHost = $false
    mode = $(if ($Apply) { "apply" } else { "plan" })
}
if (-not $Apply) { $plan | ConvertTo-Json -Depth 4; return }
if ($existing -and $existing.State -eq "Running") { throw "The previous publisher is still running. Let it finish before replacing its task." }
$backup = Join-Path $directory ("previous-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
New-Item -ItemType Directory -Path $backup | Out-Null
if ($existing) { Export-ScheduledTask -TaskName $TaskName | Set-Content -LiteralPath (Join-Path $backup "task.xml") -Encoding Unicode }
foreach ($name in @("publish.cjs", "publisher.log", "state.json", "README.md")) {
    $source = Join-Path $directory $name
    if (Test-Path -LiteralPath $source -PathType Leaf) { Copy-Item -LiteralPath $source -Destination (Join-Path $backup $name) }
}
$action = New-ScheduledTaskAction -Execute $hostPath -Argument $arguments -WorkingDirectory $directory
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 10)
$principal = New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
$taskSettings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes 12) -MultipleInstances IgnoreNew -StartWhenAvailable
$task = New-ScheduledTask -Action $action -Trigger $trigger -Principal $principal -Settings $taskSettings -Description "Refresh saved HUANDENG Project PPTX exports and atomically mirror validated copies. Runs without a console window."
Register-ScheduledTask -TaskName $TaskName -InputObject $task -Force | Out-Null
$installed = Get-ScheduledTask -TaskName $TaskName
if ($installed.Actions.Execute -ne $hostPath -or $installed.Actions.Arguments -ne $arguments) { throw "Scheduled publisher action did not match the reviewed plan." }
$readme = @"
# HUANDENG PPTX publishing

The Project's fixed output is Exports/deck.pptx (or the matching PPTD entry basename).
The configured shared destination is an atomically replaced, validated copy.
OneDrive does not support symbolic-link or junction synchronization, so shared outputs are ordinary files.

Saved changes in an open Editor schedule a quiet update. The Windows task '$TaskName' provides a ten-minute fallback while this user is signed in.
The task starts wscript.exe and the packaged Editor runtime without a console window. It does not open an Editor window.
Only projects listed in config.json are published. Source pages are never edited by the publisher.
Missing assets, export errors, edits during export, or locked destination files retain the previous shared PPTX.
The publisher does not close Office or OneDrive processes. A later attempt retries a locked destination.

Status: state-v2.json
Failures and updates: publisher-v2.log
Previous task and configuration evidence: $(Split-Path -Leaf $backup)
"@
[IO.File]::WriteAllText((Join-Path $directory "README.md"), $readme, (New-Object Text.UTF8Encoding($false)))
$plan["backup"] = $backup
$plan | ConvertTo-Json -Depth 4
