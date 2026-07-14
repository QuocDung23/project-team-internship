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

Write-Host "Running Python tests..."
Invoke-Checked $PythonBin -m unittest discover -s tests

Write-Host "Checking Python syntax..."
$CompileTargets = @(
    "integrate_cnn.py",
    "detector_backend.py",
    "backend/app.py",
    "backend/models/schemas.py"
)
$CompileTargets += Get-ChildItem backend/services/*.py
$CompileTargets += Get-ChildItem backend/routes/*.py
$CompileTargets += Get-ChildItem backend/core/*.py
$CompileTargets += Get-ChildItem backend/db/*.py
$CompileTargets += Get-ChildItem backend/auth/*.py
$CompileTargets += Get-ChildItem backend/repositories/*.py
$CompileTargets += Get-ChildItem backend/api/routes/*.py
Invoke-Checked $PythonBin -m py_compile @CompileTargets

Write-Host "Running frontend checks..."
Push-Location frontend
try {
    Invoke-Checked npm run lint
    Invoke-Checked npm run build

    $NodeMajor = [int]((node --version).TrimStart("v").Split(".")[0])
    if ($NodeMajor -ge 22) {
        Invoke-Checked npm run test
    }
    else {
        Write-Warning "Skipping frontend unit tests: npm run test requires Node 22+ for --experimental-strip-types. Current runtime: $(node --version)."
    }
}
finally {
    Pop-Location
}

Write-Host "All checks passed."
