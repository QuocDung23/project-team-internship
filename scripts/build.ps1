$ErrorActionPreference = "Stop"

$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$PythonBin = if ($env:PYTHON) { $env:PYTHON } else { "python" }

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,
        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]]$Arguments
    )

    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed with exit code ${LASTEXITCODE}: $FilePath $($Arguments -join ' ')"
    }
}

Set-Location $RootDir

Write-Host "Validating database schema..."
Invoke-Checked $PythonBin -m backend.db.schema validate

Write-Host "Checking Python syntax..."
$CompileTargets = @(
    (Join-Path $RootDir "integrate_cnn.py"),
    (Join-Path $RootDir "intergrate_cnn.py"),
    (Join-Path $RootDir "detector_backend.py"),
    (Join-Path $RootDir "probe_cameras.py")
)
$CompileTargets += Get-ChildItem -Path backend, ai_runtime, tools -Recurse -File -Filter "*.py" | ForEach-Object { $_.FullName }
Invoke-Checked $PythonBin -m py_compile @CompileTargets

Write-Host "Building frontend..."
Push-Location frontend
try {
    Invoke-Checked npm run build
}
finally {
    Pop-Location
}

Write-Host "Build completed."
