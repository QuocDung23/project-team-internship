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

Write-Host "Installing Python dependencies..."
Invoke-Checked $PythonBin -m pip install -r requirements.txt -r backend/requirements.txt

Write-Host "Installing frontend dependencies..."
Push-Location frontend
try {
    Invoke-Checked npm install
}
finally {
    Pop-Location
}

# Write-Host "Starting database (Docker Compose)..."
# if (Get-Command docker -ErrorAction SilentlyContinue) {
#     Invoke-Checked docker-compose up -d
# } else {
#     Write-Host "WARNING: docker not found — skipping DB start"
# }

Write-Host "Setup complete."
