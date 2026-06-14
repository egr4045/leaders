#Requires -Version 5.1
$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot

# --- Token ---
$EnvFile = Join-Path $Root ".env"
$Token = $null
if (Test-Path $EnvFile) {
    foreach ($line in Get-Content $EnvFile) {
        if ($line -match "^ML_BOX_TOKEN=(.+)$") { $Token = $Matches[1] }
    }
}
if (-not $Token) {
    Write-Host "Need ML_BOX_TOKEN from the server."
    Write-Host "Run: ssh root@186.246.11.239 grep ML_BOX_TOKEN /root/leaders/.env"
    $Token = Read-Host "Paste ML_BOX_TOKEN"
    if (-not $Token) { Write-Error "No token."; exit 1 }
    Set-Content $EnvFile "ML_BOX_TOKEN=$Token" -Encoding utf8
    Write-Host "Saved to $EnvFile"
}

# --- Python ---
$Py = $null
foreach ($cmd in @("python", "python3", "py")) {
    try {
        $ver = & $cmd --version 2>&1
        if ($ver -match "Python 3\.") { $Py = $cmd; break }
    } catch { }
}
if (-not $Py) { Write-Error "Python 3 not found."; exit 1 }
Write-Host "Python: $(& $Py --version)"

# --- Venv ---
$Venv   = Join-Path $Root ".venv"
$VenvPy = Join-Path $Venv "Scripts\python.exe"
$VenvPip = Join-Path $Venv "Scripts\pip.exe"
if (-not (Test-Path $VenvPy)) {
    Write-Host "Creating venv..."
    & $Py -m venv $Venv
}

# --- Dependencies ---
$Marker = Join-Path $Root ".deps_ok_v2"
if (-not (Test-Path $Marker)) {
    Write-Host "Installing dependencies from requirements.txt..."
    $OldErr = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & $VenvPip install --upgrade pip -q
    & $VenvPip install -r (Join-Path $Root "requirements.txt")
    $ErrorActionPreference = $OldErr
    if ($LASTEXITCODE -eq 0) {
        Set-Content $Marker "ok" -Encoding utf8
    } else {
        Write-Error "pip install failed with code $LASTEXITCODE"
        exit 1
    }
}

# --- Run ---
Write-Host ""
Write-Host "====================================================="
Write-Host "  TTS anchor running  (Edge Neural ru-RU-DmitryNeural)"
Write-Host "  Speed: ~0.5s per news item"
Write-Host "  Keep window open during game.  Ctrl+C to stop."
Write-Host "====================================================="
Write-Host ""

$Script = Join-Path $Root "ml-box.py"
while ($true) {
    $env:ML_BOX_TOKEN = $Token
    & $VenvPy $Script
    $code = $LASTEXITCODE
    if ($code -eq 0) { break }
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Crashed ($code), restarting in 5s..."
    Start-Sleep 5
}
