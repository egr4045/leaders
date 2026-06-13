"""
Leaders ML-box — локальная генерация TTS (Silero v4).

Запуск:
    pip install torch torchaudio silero requests
    python ml-box.py

Конфигурация через переменные окружения (или правка констант ниже):
    ML_BOX_SERVER  — URL сервера, по умолч. https://mygame-quiz.ru
    ML_BOX_TOKEN   — Bearer-токен (совпадает с ML_BOX_TOKEN на сервере)
    ML_BOX_SPEAKER — голос Silero: aidar | baya | kseniya | xenia | eugene
                     (мужские: aidar, eugene; женские: baya, kseniya, xenia)
"""

import io
import base64
import time
import os
import sys
import requests
import torch
import torchaudio

SERVER   = os.environ.get("ML_BOX_SERVER", "https://mygame-quiz.ru")
TOKEN    = os.environ.get("ML_BOX_TOKEN", "REPLACE_ME")
SPEAKER  = os.environ.get("ML_BOX_SPEAKER", "baya")
SAMPLE_RATE = 24000
POLL_INTERVAL = 5  # секунд между опросами

# ---------------------------------------------------------------------------
# Загрузка модели (один раз при старте, ~60 MB)
# ---------------------------------------------------------------------------
print("Загрузка Silero TTS v4 для русского языка...")
model, _ = torch.hub.load(
    repo_or_dir="snakers4/silero-models",
    model="silero_tts",
    language="ru",
    speaker="v4_ru",
    verbose=False,
)
model.eval()
print(f"Модель загружена. Голос: {SPEAKER}. Сервер: {SERVER}")


def generate_tts(text: str) -> bytes:
    """Синтезировать речь и вернуть WAV-байты."""
    audio = model.apply_tts(text=text, speaker=SPEAKER, sample_rate=SAMPLE_RATE)
    buf = io.BytesIO()
    torchaudio.save(buf, audio.unsqueeze(0), SAMPLE_RATE, format="wav")
    return buf.getvalue()


def api(method: str, path: str, **kwargs):
    url = f"{SERVER}/api/{path.lstrip('/')}"
    headers = {"Authorization": f"Bearer {TOKEN}"}
    r = getattr(requests, method)(url, headers=headers, timeout=15, **kwargs)
    r.raise_for_status()
    return r.json()


def poll() -> list:
    try:
        data = api("get", "ml/jobs", params={"max": 3})
        return data.get("jobs", [])
    except Exception as e:
        print(f"[poll error] {e}")
        return []


def submit(job_id: str, ext: str, data: bytes):
    b64 = base64.b64encode(data).decode()
    try:
        api("post", f"ml/jobs/{job_id}/result", json={"ext": ext, "dataBase64": b64})
        print(f"  ✓ done: {job_id}")
    except Exception as e:
        print(f"  ✗ submit error: {e}")


def fail(job_id: str, error: str):
    try:
        api("post", f"ml/jobs/{job_id}/fail", json={"error": error})
    except Exception as e:
        print(f"  ✗ fail-report error: {e}")


# ---------------------------------------------------------------------------
# Основной цикл
# ---------------------------------------------------------------------------
print("Жду задания от сервера...")
while True:
    jobs = poll()
    for job in jobs:
        jid = job.get("id", "?")
        jtype = job.get("type", "")
        payload = job.get("payload", {})
        print(f"[job] {jid} type={jtype}")

        if jtype == "tts":
            text = payload.get("text", "")
            if not text:
                fail(jid, "empty text")
                continue
            try:
                wav = generate_tts(text)
                submit(jid, "wav", wav)
            except Exception as e:
                print(f"  TTS error: {e}")
                fail(jid, str(e))

        elif jtype == "image":
            # Изображения пока не поддерживаются локально
            fail(jid, "image generation not supported in local ml-box")

        else:
            fail(jid, f"unknown job type: {jtype}")

    if not jobs:
        sys.stdout.write(".")
        sys.stdout.flush()
    else:
        print()

    time.sleep(POLL_INTERVAL)
