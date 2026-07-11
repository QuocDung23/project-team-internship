$ErrorActionPreference = "Stop"

$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$PythonBin = if ($env:PYTHON) { $env:PYTHON } else { "python" }
$NpmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
if ($NpmCommand) {
    $NpmBin = $NpmCommand.Source
}
else {
    $NpmBin = (Get-Command npm -ErrorAction Stop).Source
}
$BackendHost = if ($env:BACKEND_HOST) { $env:BACKEND_HOST } else { "127.0.0.1" }
$BackendPort = if ($env:BACKEND_PORT) { $env:BACKEND_PORT } else { "8000" }
$FrontendHost = if ($env:FRONTEND_HOST) { $env:FRONTEND_HOST } else { "127.0.0.1" }
$FrontendPort = if ($env:FRONTEND_PORT) { $env:FRONTEND_PORT } else { "5173" }
$DetectorEnabled = if ($env:DETECTOR_ENABLED) { $env:DETECTOR_ENABLED } else { "true" }
$DetectorScript = if ($env:DETECTOR_SCRIPT) { $env:DETECTOR_SCRIPT } else { "intergrate_cnn.py" }
$DetectorCamera = if ($env:DETECTOR_CAMERA) { $env:DETECTOR_CAMERA } else { "0" }

Set-Location $RootDir

$Processes = @()

function Stop-DevProcesses {
    Write-Host ""
    Write-Host "Stopping development servers..."
    foreach ($Process in $Processes) {
        if ($Process -and -not $Process.HasExited) {
            Stop-Process -Id $Process.Id -Force -ErrorAction SilentlyContinue
        }
    }
}

try {
    Write-Host "Starting FastAPI backend on http://${BackendHost}:${BackendPort}"
    $Backend = Start-Process -FilePath $PythonBin `
        -ArgumentList @("-m", "uvicorn", "backend.app:app", "--reload", "--host", $BackendHost, "--port", $BackendPort) `
        -WorkingDirectory $RootDir `
        -NoNewWindow `
        -PassThru
    $Processes += $Backend

    Write-Host "Starting Vite frontend on http://${FrontendHost}:${FrontendPort}"
    $Frontend = Start-Process -FilePath $NpmBin `
        -ArgumentList @("run", "dev", "--", "--host", $FrontendHost, "--port", $FrontendPort) `
        -WorkingDirectory (Join-Path $RootDir "frontend") `
        -NoNewWindow `
        -PassThru
    $Processes += $Frontend

    if ($DetectorEnabled -ne "false" -and $DetectorEnabled -ne "0") {
        Write-Host "Starting detector from ${DetectorScript} on camera ${DetectorCamera}"
        $Detector = Start-Process -FilePath $PythonBin `
            -ArgumentList @(
                $DetectorScript,
                "--camera", $DetectorCamera
            ) `
            -WorkingDirectory $RootDir `
            -NoNewWindow `
            -PassThru
        $Processes += $Detector
    }

    Write-Host ""
    Write-Host "Development services are running. Press Ctrl+C to stop."

    while ($true) {
        Start-Sleep -Seconds 1
        foreach ($Process in $Processes) {
            if ($Process.HasExited) {
                throw "A development server exited with code $($Process.ExitCode)."
            }
        }
    }
}
finally {
    Stop-DevProcesses
}
