"""
Leaders ML-box — TTS через Microsoft Edge Neural Voices.

Качество: production (те же голоса что в Edge/Cortana/Windows Narrator).
Русские голоса:
  ru-RU-SvetlanaNeural  — женский (по умолчанию)
  ru-RU-DmitryNeural    — мужской
  ru-RU-DarinaNeural    — женский, более современный

Требования: pip install edge-tts requests
Запуск: python ml-box.py
Токен: env ML_BOX_TOKEN=...
"""

import asyncio
import base64
import io
import os
import sys
import time

import requests
import edge_tts

SERVER = os.environ.get("ML_BOX_SERVER", "https://mygame-quiz.ru")
TOKEN  = os.environ.get("ML_BOX_TOKEN", "")
VOICE  = os.environ.get("ML_BOX_VOICE", "ru-RU-SvetlanaNeural")
POLL_INTERVAL = 5


async def _tts_bytes(text: str) -> bytes:
    communicate = edge_tts.Communicate(text, VOICE)
    buf = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            buf += chunk["data"]
    return buf  # MP3


def generate_tts(text: str) -> bytes:
    return asyncio.run(_tts_bytes(text))


def api(method: str, path: str, **kwargs):
    url = f"{SERVER}/api/{path.lstrip('/')}"
    r = getattr(requests, method)(
        url,
        headers={"Authorization": f"Bearer {TOKEN}"},
        timeout=20,
        **kwargs,
    )
    r.raise_for_status()
    return r.json()


def poll() -> list:
    try:
        return api("get", "ml/jobs", params={"max": 3}).get("jobs", [])
    except Exception as e:
        print(f"\n[poll error] {e}")
        return []


def submit(job_id: str, ext: str, data: bytes):
    b64 = base64.b64encode(data).decode()
    try:
        api("post", f"ml/jobs/{job_id}/result", json={"ext": ext, "dataBase64": b64})
        print(f"  ok: {job_id}")
    except Exception as e:
        print(f"  submit error: {e}")


def fail(job_id: str, error: str):
    try:
        api("post", f"ml/jobs/{job_id}/fail", json={"error": error})
    except Exception as e:
        print(f"  fail-report error: {e}")


print(f"Voice: {VOICE}")
print(f"Server: {SERVER}")
print("Waiting for jobs...")

while True:
    jobs = poll()
    for job in jobs:
        jid   = job.get("id", "?")
        jtype = job.get("type", "")
        payload = job.get("payload", {})
        print(f"\n[job] {jid}  type={jtype}")

        if jtype == "tts":
            text = payload.get("text", "").strip()
            if not text:
                fail(jid, "empty text")
                continue
            try:
                mp3 = generate_tts(text)
                submit(jid, "mp3", mp3)
            except Exception as e:
                print(f"  TTS error: {e}")
                fail(jid, str(e))

        elif jtype == "image":
            fail(jid, "image not supported in local ml-box")

        else:
            fail(jid, f"unknown job type: {jtype}")

    if not jobs:
        sys.stdout.write(".")
        sys.stdout.flush()

    time.sleep(POLL_INTERVAL)
