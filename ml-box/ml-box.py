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

SERVER      = os.environ.get("ML_BOX_SERVER", "https://mygame-quiz.ru")
TOKEN       = os.environ.get("ML_BOX_TOKEN", "")
VOICE       = os.environ.get("ML_BOX_VOICE", "ru-RU-DmitryNeural")
POLL_INTERVAL = 1
CONCURRENCY = int(os.environ.get("ML_BOX_CONCURRENCY", "8"))
BATCH_SIZE  = CONCURRENCY * 2   # сколько брать за раз из очереди


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
    return buf


async def _synth_with_retry(text: str) -> bytes:
    last_err: Exception = RuntimeError("unknown")
    for attempt in range(3):
        use_text = _clean_text(text) if attempt > 0 else text
        try:
            return await _synth(use_text)
        except asyncio.CancelledError:
            raise
        except Exception as e:
            last_err = e
            print(f"  attempt {attempt + 1} failed: {e}")
            if attempt > 0:
                print(f"  (cleaned text)")
            await asyncio.sleep(1 + attempt)
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
        return api("get", "ml/jobs", params={"max": BATCH_SIZE}).get("jobs", [])
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


sem = asyncio.Semaphore(CONCURRENCY)


async def handle_job(job):
    async with sem:
        jid     = job.get("id", "?")
        jtype   = job.get("type", "")
        payload = job.get("payload", {})
        print(f"\n[job] {jid}  type={jtype}")

        if jtype == "tts":
            text = payload.get("text", "").strip()
            if not text:
                await asyncio.to_thread(fail, jid, "empty text")
                return
            try:
                t0  = time.time()
                mp3 = await _synth_with_retry(text)
                dt  = time.time() - t0
                print(f"  {dt:.2f}s  {len(mp3) // 1024} KB")
                await asyncio.to_thread(submit, jid, "mp3", mp3)
            except Exception as e:
                print(f"  TTS error: {e}")
                await asyncio.to_thread(fail, jid, str(e))

        elif jtype == "image":
            await asyncio.to_thread(fail, jid, "image not supported")
        else:
            await asyncio.to_thread(fail, jid, f"unknown type: {jtype}")


async def main():
    print(f"Voice: {VOICE}  |  Concurrency: {CONCURRENCY}  |  Batch: {BATCH_SIZE}")
    print(f"Server: {SERVER}")
    print("Waiting for jobs...")

    while True:
        jobs = await asyncio.to_thread(poll)
        if jobs:
            print(f"\n--- batch: {len(jobs)} jobs ---")
            await asyncio.gather(*[handle_job(j) for j in jobs])
        else:
            sys.stdout.write(".")
            sys.stdout.flush()
        await asyncio.sleep(POLL_INTERVAL)


asyncio.run(main())
