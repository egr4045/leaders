#Requires -Version 5.1
<#
.SYNOPSIS
  Запустить локальный TTS-диктор для Leaders.
  Первый запуск: создаёт venv, ставит зависимости, сохраняет токен.
  Последующие: просто стартует ml-box.py (токен читается из .env).
#>

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot

# ---------- 1. Читаем / спрашиваем токен ----------
$EnvFile = Join-Path $Root ".env"
$Token = $null
if (Test-Path $EnvFile) {
    foreach ($line in Get-Content $EnvFile) {
        if ($line -match "^ML_BOX_TOKEN=(.+)$") { $Token = $Matches[1] }
    }
}
if (-not $Token) {
    Write-Host ""
    Write-Host "┌─────────────────────────────────────────────────────────┐"
    Write-Host "│  Нужен ML_BOX_TOKEN — он записан в /root/leaders/.env   │"
    Write-Host "│  на сервере 186.246.11.239.                              │"
    Write-Host "│  Посмотреть: ssh root@186.246.11.239 grep ML_BOX_TOKEN /root/leaders/.env"
    Write-Host "└─────────────────────────────────────────────────────────┘"
    Write-Host ""
    $Token = Read-Host "Вставьте ML_BOX_TOKEN"
    if (-not $Token) { Write-Error "Токен не введён. Выход."; exit 1 }
    "ML_BOX_TOKEN=$Token" | Out-File $EnvFile -Encoding utf8
    Write-Host "✓ Токен сохранён в $EnvFile (не попадёт в git)"
}

# ---------- 2. Python ----------
$Py = $null
foreach ($cmd in @("python", "python3", "py")) {
    try {
        $ver = & $cmd --version 2>&1
        if ($ver -match "Python 3\.") { $Py = $cmd; break }
    } catch {}
}
if (-not $Py) {
    Write-Error "Python 3 не найден. Установите с https://python.org (добавьте в PATH)."
    exit 1
}
Write-Host "✓ Python: $(& $Py --version)"

# ---------- 3. Виртуальное окружение ----------
$Venv = Join-Path $Root ".venv"
if (-not (Test-Path (Join-Path $Venv "Scripts\python.exe"))) {
    Write-Host "Создаю venv..."
    & $Py -m venv $Venv
}
$VenvPy = Join-Path $Venv "Scripts\python.exe"
$VenvPip = Join-Path $Venv "Scripts\pip.exe"

# ---------- 4. Зависимости ----------
$SileroMarker = Join-Path $Venv "silero_installed"
if (-not (Test-Path $SileroMarker)) {
    Write-Host "Устанавливаю зависимости (первый раз ~5 мин, скачивает PyTorch ~2 GB)..."
    & $VenvPip install --upgrade pip -q
    & $VenvPip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu
    & $VenvPip install requests
    # silero загружается через torch.hub при первом запуске (~60 MB) — pip не нужен
    "ok" | Out-File $SileroMarker -Encoding utf8
    Write-Host "✓ Зависимости установлены"
}

# ---------- 5. Запуск ml-box (авторестарт при краше) ----------
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "  Диктор запущен. Оставьте окно открытым."
Write-Host "  Ctrl+C — остановить."
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host ""

$Script = Join-Path $Root "ml-box.py"
while ($true) {
    $env:ML_BOX_TOKEN = $Token
    & $VenvPy $Script
    $code = $LASTEXITCODE
    if ($code -eq 0) { break }   # штатный выход (Ctrl+C)
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Краш ($code), перезапуск через 10 с..."
    Start-Sleep 10
}
