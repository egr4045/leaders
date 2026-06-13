#Requires -Version 5.1
$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot

# --- 1. Token ---
$EnvFile = Join-Path $Root ".env"
$Token = $null
if (Test-Path $EnvFile) {
    foreach ($line in Get-Content $EnvFile) {
        if ($line -match "^ML_BOX_TOKEN=(.+)$") { $Token = $Matches[1] }
    }
}
if (-not $Token) {
    Write-Host ""
    Write-Host "Need ML_BOX_TOKEN from the server."
    Write-Host "Run: ssh root@186.246.11.239 grep ML_BOX_TOKEN /root/leaders/.env"
    Write-Host ""
    $Token = Read-Host "Paste ML_BOX_TOKEN"
    if (-not $Token) { Write-Error "No token. Exiting."; exit 1 }
    Set-Content $EnvFile "ML_BOX_TOKEN=$Token" -Encoding utf8
    Write-Host "Token saved to $EnvFile (gitignored)"
}

# --- 2. Python ---
$Py = $null
foreach ($cmd in @("python", "python3", "py")) {
    try {
        $ver = & $cmd --version 2>&1
        if ($ver -match "Python 3\.") { $Py = $cmd; break }
    } catch { }
}
if (-not $Py) {
    Write-Error "Python 3 not found. Install from https://python.org and add to PATH."
    exit 1
}
Write-Host "Python: $(& $Py --version)"

# --- 3. Venv ---
$Venv    = Join-Path $Root ".venv"
$VenvPy  = Join-Path $Venv "Scripts\python.exe"
$VenvPip = Join-Path $Venv "Scripts\pip.exe"
if (-not (Test-Path $VenvPy)) {
    Write-Host "Creating venv..."
    & $Py -m venv $Venv
}

# --- 4. Dependencies (edge-tts + requests, installs in seconds) ---
Write-Host "Checking dependencies..."
& $VenvPip install --upgrade pip -q 2>$null
& $VenvPip install edge-tts requests -q

# --- 5. Run with auto-restart ---
Write-Host ""
Write-Host "============================================"
Write-Host "  TTS anchor running. Keep this window open."
Write-Host "  Voice: ru-RU-SvetlanaNeural (Edge Neural)"
Write-Host "  Ctrl+C to stop."
Write-Host "============================================"
Write-Host ""

$Script = Join-Path $Root "ml-box.py"
while ($true) {
    $env:ML_BOX_TOKEN = $Token
    & $VenvPy $Script
    $code = $LASTEXITCODE
    if ($code -eq 0) { break }
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Crashed ($code), restarting in 10s..."
    Start-Sleep 10
}
