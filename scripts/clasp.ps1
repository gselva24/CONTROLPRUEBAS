param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Command,

    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$CommandArguments
)

$repoRoot = Split-Path -Parent $PSScriptRoot
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodePath = if ($nodeCommand) {
    $nodeCommand.Source
} else {
    Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
}

if (-not (Test-Path -LiteralPath $nodePath)) {
    throw "No se encontro Node.js. Abra el proyecto en Codex o instale Node.js 20 o superior."
}

$claspPackage = Get-ChildItem -LiteralPath (Join-Path $repoRoot "node_modules\.pnpm") -Directory |
    Where-Object { $_.Name -like "@google+clasp@*" } |
    Select-Object -First 1

if (-not $claspPackage) {
    throw "No se encontro clasp. Ejecute pnpm install antes de continuar."
}

$claspEntry = Join-Path $claspPackage.FullName "node_modules\@google\clasp\build\src\index.js"
if (-not (Test-Path -LiteralPath $claspEntry)) {
    throw "La instalacion local de clasp esta incompleta."
}

Push-Location $repoRoot
try {
    & $nodePath $claspEntry $Command @CommandArguments
    $exitCode = $LASTEXITCODE
} finally {
    Pop-Location
}

exit $exitCode
