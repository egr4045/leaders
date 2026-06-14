"""
Leaders ML-box — TTS via Silero v4 (Local Parallel Rendering)

Speed: ~0.5s per item per core.
"""

import asyncio
import base64
import os
import sys
import time
import requests

from humanizer import humanize_text
from tts_renderer import ParallelTTSRenderer
from mixer import mix_audio, mix_audio_to_wav

SERVER      = os.environ.get("ML_BOX_SERVER", "https://mygame-quiz.ru")
TOKEN       = os.environ.get("ML_BOX_TOKEN", "")
POLL_INTERVAL = 1
CONCURRENCY = int(os.environ.get("ML_BOX_CONCURRENCY", "4"))
BATCH_SIZE  = CONCURRENCY * 2

# Инициализация глобального пула рендера
tts_renderer = ParallelTTSRenderer(max_workers=CONCURRENCY)

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

def process_tts_sync(text: str, voice: str) -> bytes:
    """Синхронная функция, которая вызывается в отдельном потоке"""
    sentences = humanize_text(text)
    wav_chunks = tts_renderer.render_sentences(sentences, speaker=voice)
    try:
        return mix_audio(wav_chunks, voice=voice)
    except Exception as e:
        print(f"  FFMPEG fallback to wav: {e}")
        return mix_audio_to_wav(wav_chunks, voice=voice)

async def handle_job(job):
    async with sem:
        jid     = job.get("id", "?")
        jtype   = job.get("type", "")
        payload = job.get("payload", {})
        print(f"\n[job] {jid}  type={jtype}")

        if jtype == "tts":
            text = payload.get("text", "").strip()
            
            # В админке может передаваться voice (имя диктора ИЛИ название страны), иначе default (eugene)
            voice_raw = payload.get("voice", "eugene")
            
            VOICE_MAPPING = {
                "usa": "eugene", "uk": "eugene", "russia": "eugene", "israel": "eugene",
                "germany": "xenia", "china": "xenia", "japan": "xenia",
                "dprk": "kseniya", "india": "kseniya", "armenia": "kseniya"
            }
            voice = VOICE_MAPPING.get(voice_raw, voice_raw)
            
            # Если voice всё еще неизвестный, ставим default
            if voice not in ["aidar", "baya", "kseniya", "xenia", "eugene", "random"]:
                voice = "eugene"
                
            if not text:
                await asyncio.to_thread(fail, jid, "empty text")
                return
            try:
                t0  = time.time()
                audio_bytes = await asyncio.to_thread(process_tts_sync, text, voice)
                dt  = time.time() - t0
                print(f"  {dt:.2f}s  {len(audio_bytes) // 1024} KB")
                
                # Если у нас mp3 (начинается с ID3 или FFFb), шлем mp3, иначе wav
                ext = "mp3" if audio_bytes[:2] in (b"ID", b"\xff\xfb") else "wav"
                
                # Сохраняем копию локально для прослушивания
                debug_path = os.path.join(os.path.dirname(__file__), "output", f"{jid}.{ext}")
                os.makedirs(os.path.dirname(debug_path), exist_ok=True)
                with open(debug_path, "wb") as f:
                    f.write(audio_bytes)
                    
                await asyncio.to_thread(submit, jid, ext, audio_bytes)
            except Exception as e:
                print(f"  TTS error: {e}")
                await asyncio.to_thread(fail, jid, str(e))

        elif jtype == "image":
            await asyncio.to_thread(fail, jid, "image not supported")
        else:
            await asyncio.to_thread(fail, jid, f"unknown type: {jtype}")

async def main():
    print(f"Starting ML-Box with Silero TTS. Concurrency: {CONCURRENCY}")
    print(f"Server: {SERVER}")
    print("Initializing TTS Renderer...")
    tts_renderer.start()
    print("Waiting for jobs...")

    try:
        while True:
            jobs = await asyncio.to_thread(poll)
            if jobs:
                print(f"\n--- batch: {len(jobs)} jobs ---")
                await asyncio.gather(*[handle_job(j) for j in jobs])
            else:
                sys.stdout.write(".")
                sys.stdout.flush()
            await asyncio.sleep(POLL_INTERVAL)
    finally:
        tts_renderer.stop()

if __name__ == "__main__":
    asyncio.run(main())
