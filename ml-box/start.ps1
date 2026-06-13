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
    Write-Host "Token saved to $EnvFile"
}

# --- 2. reference.wav check ---
$RefWav = Join-Path $Root "reference.wav"
if (-not (Test-Path $RefWav)) {
    Write-Host ""
    Write-Host "================================================================"
    Write-Host "  MISSING: ml-box\reference.wav"
    Write-Host ""
    Write-Host "  Download 15-30 seconds of a Russian TV anchor voice:"
    Write-Host "  Option A (yt-dlp):"
    Write-Host "    yt-dlp -x --audio-format wav -o reference.wav <YouTube URL>"
    Write-Host "  Option B: download any news clip, rename audio to reference.wav"
    Write-Host ""
    Write-Host "  Then trim to 15-30s (Audacity or ffmpeg):"
    Write-Host "    ffmpeg -i reference.wav -ss 10 -t 25 -ar 22050 ref2.wav"
    Write-Host "    rename ref2.wav reference.wav"
    Write-Host ""
    Write-Host "  Put the file in: $Root"
    Write-Host "================================================================"
    Write-Host ""
    Read-Host "Press Enter after placing reference.wav"
}

# --- 3. Python (3.9-3.12 recommended; 3.13 may have TTS package issues) ---
$Py = $null
foreach ($cmd in @("python3.12", "python3.11", "python3.10", "python", "python3", "py")) {
    try {
        $ver = & $cmd --version 2>&1
        if ($ver -match "Python 3\.(9|10|11|12|13)\.") { $Py = $cmd; break }
    } catch { }
}
if (-not $Py) {
    Write-Error "Python 3.9+ not found. Install from https://python.org"
    exit 1
}
$pyver = & $Py --version
Write-Host "Python: $pyver"
if ($pyver -match "Python 3\.13") {
    Write-Host "  Note: Python 3.13 is very new. If TTS install fails, try 3.11 or 3.12."
}

# --- 4. Venv ---
$Venv    = Join-Path $Root ".venv"
$VenvPy  = Join-Path $Venv "Scripts\python.exe"
$VenvPip = Join-Path $Venv "Scripts\pip.exe"
if (-not (Test-Path $VenvPy)) {
    Write-Host "Creating venv..."
    & $Py -m venv $Venv
}

# --- 5. Dependencies ---
$Marker = Join-Path $Root ".deps_xtts_ok"
if (-not (Test-Path $Marker)) {
    Write-Host ""
    Write-Host "Installing Coqui TTS + XTTS v2 dependencies..."
    Write-Host "(~500 MB packages; model ~1.8 GB downloads on first synthesis)"
    Write-Host ""
    & $VenvPip install --upgrade pip setuptools wheel -q
    & $VenvPip install TTS requests
    Set-Content $Marker "ok" -Encoding utf8
    Write-Host "Dependencies installed."
}

# --- 6. Run with auto-restart ---
Write-Host ""
Write-Host "========================================================"
Write-Host "  XTTS v2 anchor running (voice cloning)."
Write-Host "  Keep this window open during the game."
Write-Host "  First synthesis downloads model (~1.8 GB) — wait once."
Write-Host "  Ctrl+C to stop."
Write-Host "========================================================"
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
