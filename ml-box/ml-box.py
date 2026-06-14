"""
Leaders ML-box — TTS via Microsoft Edge Neural Voices.

Speed: ~0.5s per item (internet request to Microsoft).
Voice: ru-RU-DmitryNeural — professional male news anchor style.

Other Russian voices:
  ru-RU-SvetlanaNeural   female, professional
  ru-RU-DarinaNeural     female, warmer

reference.wav is saved for future voice cloning (XTTS v2 / F5-TTS)
when a CUDA GPU becomes available — edit VOICE_CLONE_MODE below.
"""

import asyncio
import base64
import os
import sys
import time

import requests
import edge_tts

SERVER = os.environ.get("ML_BOX_SERVER", "https://mygame-quiz.ru")
TOKEN  = os.environ.get("ML_BOX_TOKEN", "")
VOICE  = os.environ.get("ML_BOX_VOICE", "ru-RU-DmitryNeural")
POLL_INTERVAL = 1


def _clean_text(text: str) -> str:
    """Заменяет символы, на которых edge-tts может упасть с NoAudioReceived."""
    return (
        text
        .replace("—", ", ")
        .replace("–", ", ")
        .replace("«", '"')
        .replace("»", '"')
        .replace("…", "...")
    )


async def _synth(text: str) -> bytes:
    communicate = edge_tts.Communicate(text, VOICE)
    buf = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            buf += chunk["data"]
    if not buf:
        raise RuntimeError("No audio was received. Please verify that your parameters are correct.")
    return buf  # MP3


def generate_tts(text: str) -> bytes:
    """Пробует до 3 раз; на 2-й попытке чистит спецсимволы."""
    last_err: Exception = RuntimeError("unknown")
    for attempt in range(3):
        use_text = _clean_text(text) if attempt > 0 else text
        try:
            result = asyncio.run(_synth(use_text))
            if attempt > 0:
                print(f"  ok on attempt {attempt + 1} (cleaned text)")
            return result
        except KeyboardInterrupt:
            raise RuntimeError("cancelled")
        except Exception as e:
            last_err = e
            print(f"  attempt {attempt + 1} failed: {e}")
            time.sleep(1 + attempt)
    raise last_err


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
        return api("get", "ml/jobs", params={"max": 10}).get("jobs", [])
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
        jid     = job.get("id", "?")
        jtype   = job.get("type", "")
        payload = job.get("payload", {})
        print(f"\n[job] {jid}  type={jtype}")

        if jtype == "tts":
            text = payload.get("text", "").strip()
            if not text:
                fail(jid, "empty text")
                continue
            try:
                t0  = time.time()
                mp3 = generate_tts(text)
                dt  = time.time() - t0
                print(f"  {dt:.2f}s  {len(mp3)//1024} KB")
                submit(jid, "mp3", mp3)
            except Exception as e:
                print(f"  TTS error: {e}")
                fail(jid, str(e))

        elif jtype == "image":
            fail(jid, "image not supported")
        else:
            fail(jid, f"unknown type: {jtype}")

    if not jobs:
        sys.stdout.write(".")
        sys.stdout.flush()

    time.sleep(POLL_INTERVAL)
