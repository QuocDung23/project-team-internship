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
$BackendPort = if ($env:BACKEND_PORT) { $env:BACKEND_PORT } else { "8001" }
$FrontendHost = if ($env:FRONTEND_HOST) { $env:FRONTEND_HOST } else { "127.0.0.1" }
$FrontendPort = if ($env:FRONTEND_PORT) { $env:FRONTEND_PORT } else { "5173" }

if (-not $env:BACKEND_PORT) {
    $CandidatePort = [int]$BackendPort
    while (Get-NetTCPConnection -LocalPort $CandidatePort -State Listen -ErrorAction SilentlyContinue) {
        Write-Host "Backend port ${CandidatePort} is busy; trying $($CandidatePort + 1)."
        $CandidatePort += 1
    }
    $BackendPort = [string]$CandidatePort
}

$BackendProxyTarget = if ($env:VITE_BACKEND_PROXY_TARGET) {
    $env:VITE_BACKEND_PROXY_TARGET
}
else {
    "http://${BackendHost}:${BackendPort}"
}
$DetectorEnabled = if ($env:DETECTOR_ENABLED) { $env:DETECTOR_ENABLED } else { "true" }
$DetectorScript = if ($env:DETECTOR_SCRIPT) { $env:DETECTOR_SCRIPT } else { "integrate_cnn.py" }
$DetectorCamera = if ($env:DETECTOR_CAMERA) { $env:DETECTOR_CAMERA } else { "0" }
$DetectorBackend = if ($env:DETECTOR_BACKEND) { $env:DETECTOR_BACKEND } else { "dshow" }
$DetectorCameraReadTimeout = if ($env:DETECTOR_CAMERA_READ_TIMEOUT) { $env:DETECTOR_CAMERA_READ_TIMEOUT } else { "60" }
$DetectorDeviceName = if ($env:DETECTOR_DEVICE_NAME) { $env:DETECTOR_DEVICE_NAME } else { "" }

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

function Stop-OldWorkspaceDevProcesses {
    if ($env:DEV_CLEAN_OLD -eq "false" -or $env:DEV_CLEAN_OLD -eq "0") {
        return
    }

    $escapedRoot = [Regex]::Escape([string]$RootDir)
    $patterns = @(
        "uvicorn.*backend\.app:app",
        "vite",
        "integrate_cnn\.py",
        "intergrate_cnn\.py"
    )

    $oldProcesses = Get-CimInstance Win32_Process |
        Where-Object {
            $CommandLine = $_.CommandLine
            $_.ProcessId -ne $PID `
                -and $CommandLine `
                -and $CommandLine -match $escapedRoot `
                -and (($patterns | Where-Object { $CommandLine -match $_ }).Count -gt 0)
        }

    foreach ($OldProcess in $oldProcesses) {
        Write-Host "Stopping old dev process $($OldProcess.ProcessId): $($OldProcess.Name)"
        Stop-Process -Id $OldProcess.ProcessId -Force -ErrorAction SilentlyContinue
    }
}

try {
    Stop-OldWorkspaceDevProcesses
    Start-Sleep -Milliseconds 500

    Write-Host "Starting FastAPI backend on http://${BackendHost}:${BackendPort}"
    $Backend = Start-Process -FilePath $PythonBin `
        -ArgumentList @("-m", "uvicorn", "backend.app:app", "--reload", "--host", $BackendHost, "--port", $BackendPort) `
        -WorkingDirectory $RootDir `
        -NoNewWindow `
        -PassThru
    $Processes += $Backend

    Write-Host "Starting Vite frontend on http://${FrontendHost}:${FrontendPort}"
    Write-Host "Proxying frontend /api requests to ${BackendProxyTarget}"
    $PreviousBackendProxyTarget = $env:VITE_BACKEND_PROXY_TARGET
    $env:VITE_BACKEND_PROXY_TARGET = $BackendProxyTarget
    try {
        $Frontend = Start-Process -FilePath $NpmBin `
            -ArgumentList @("run", "dev", "--", "--host", $FrontendHost, "--port", $FrontendPort) `
            -WorkingDirectory (Join-Path $RootDir "frontend") `
            -NoNewWindow `
            -PassThru
    }
    finally {
        if ($null -eq $PreviousBackendProxyTarget) {
            Remove-Item Env:VITE_BACKEND_PROXY_TARGET -ErrorAction SilentlyContinue
        }
        else {
            $env:VITE_BACKEND_PROXY_TARGET = $PreviousBackendProxyTarget
        }
    }
    $Processes += $Frontend

    if ($DetectorEnabled -ne "false" -and $DetectorEnabled -ne "0") {
        Write-Host "Starting detector from ${DetectorScript} on camera ${DetectorCamera}"
        $DetectorArgs = @(
            $DetectorScript,
            "--backend", $DetectorBackend,
            "--camera-read-timeout", $DetectorCameraReadTimeout,
            "--monitoring-backend-url", "${BackendProxyTarget}/api/v1",
            "--safety-backend-url", $BackendProxyTarget
        )
        if ($DetectorDeviceName) {
            $DetectorArgs += @("--device-name", $DetectorDeviceName)
        }
        else {
            $DetectorArgs += @("--camera", $DetectorCamera)
        }
        $Detector = Start-Process -FilePath $PythonBin `
            -ArgumentList $DetectorArgs `
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
