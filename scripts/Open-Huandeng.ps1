param(
    [string]$Deck = "",
    [int]$Port = 4850,
    [switch]$ReadOnly,
    [switch]$Welcome,
    [string]$ElectronPath = ""
)
$ErrorActionPreference = "Stop"
& (Join-Path $PSScriptRoot "Open-Huanding.ps1") -Deck $Deck -ReadOnly:$ReadOnly -Welcome:$Welcome -ElectronPath $ElectronPath
