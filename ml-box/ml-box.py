"""
Leaders ML-box — voice cloning via XTTS v2 (Coqui).

SETUP:
  1. Put 15-30s of a Russian TV anchor in ml-box/reference.wav
     (mono or stereo, any sample rate — will be resampled)
     e.g. from Rossiya-1 / Perviy Kanal clip via yt-dlp or any downloader

  2. pip install TTS requests  (first run downloads ~1.8 GB XTTS model)

  3. python ml-box.py

ENV:
  ML_BOX_TOKEN  — Bearer token (from /root/leaders/.env on server)
  ML_BOX_SERVER — defaults to https://mygame-quiz.ru
"""

import base64
import os
import sys
import time
import tempfile

import requests

SERVER    = os.environ.get("ML_BOX_SERVER", "https://mygame-quiz.ru")
TOKEN     = os.environ.get("ML_BOX_TOKEN", "")
REFERENCE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "reference.wav")
POLL_INTERVAL = 5

# ── Check reference audio ─────────────────────────────────────────────────────
if not os.path.exists(REFERENCE):
    print("=" * 60)
    print("  ERROR: reference.wav not found!")
    print(f"  Expected: {REFERENCE}")
    print()
    print("  Download 15-30s of a Russian TV anchor voice and save it")
    print("  as ml-box/reference.wav  (WAV, MP3, or M4A all work)")
    print()
    print("  Quick method:")
    print("    1. Find clip on YouTube (e.g. Perviy Kanal news)")
    print("    2. yt-dlp -x --audio-format wav -o reference.wav <URL>")
    print("       (or use any online youtube-to-mp3 and rename to .wav)")
    print("    3. Trim to 15-30s with Audacity or ffmpeg:")
    print("       ffmpeg -i reference.wav -ss 10 -t 25 -ar 22050 ref_trim.wav")
    print("       mv ref_trim.wav reference.wav")
    print("=" * 60)
    sys.exit(1)

# ── Load XTTS v2 ──────────────────────────────────────────────────────────────
print("Loading XTTS v2...")
print("(First run downloads ~1.8 GB model — takes a few minutes)")
print()

from TTS.api import TTS  # noqa: E402  imported after error check for faster fail

# CPU inference — AMD on Windows has no ROCm; CPU is fine for async news gen
tts_model = TTS(
    model_name="tts_models/multilingual/multi-dataset/xtts_v2",
    progress_bar=True,
    gpu=False,
)

print(f"\nXTTS v2 ready.")
print(f"Reference voice: {REFERENCE}")
print(f"Server: {SERVER}")
print("Waiting for TTS jobs...\n")


def generate_tts(text: str) -> bytes:
    """Synthesise text in the reference voice, return WAV bytes."""
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        tmp = f.name
    try:
        tts_model.tts_to_file(
            text=text,
            speaker_wav=REFERENCE,
            language="ru",
            file_path=tmp,
        )
        with open(tmp, "rb") as f:
            return f.read()
    finally:
        try:
            os.unlink(tmp)
        except OSError:
            pass


# ── API helpers ───────────────────────────────────────────────────────────────
def api(method: str, path: str, **kwargs):
    url = f"{SERVER}/api/{path.lstrip('/')}"
    r = getattr(requests, method)(
        url,
        headers={"Authorization": f"Bearer {TOKEN}"},
        timeout=30,
        **kwargs,
    )
    r.raise_for_status()
    return r.json()


def poll() -> list:
    try:
        return api("get", "ml/jobs", params={"max": 3}).get("jobs", [])
    except Exception as e:
        print(f"[poll error] {e}")
        return []


def submit(job_id: str, ext: str, data: bytes):
    b64 = base64.b64encode(data).decode()
    try:
        api("post", f"ml/jobs/{job_id}/result", json={"ext": ext, "dataBase64": b64})
        print(f"  [ok] {job_id}")
    except Exception as e:
        print(f"  [submit error] {e}")


def fail(job_id: str, error: str):
    try:
        api("post", f"ml/jobs/{job_id}/fail", json={"error": error})
    except Exception as e:
        print(f"  [fail-report error] {e}")


# ── Main loop ─────────────────────────────────────────────────────────────────
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
                wav = generate_tts(text)
                dt  = time.time() - t0
                print(f"  generated in {dt:.1f}s  ({len(wav)//1024} KB)")
                submit(jid, "wav", wav)
            except Exception as e:
                print(f"  [TTS error] {e}")
                fail(jid, str(e))

        elif jtype == "image":
            fail(jid, "image not supported in local ml-box")

        else:
            fail(jid, f"unknown job type: {jtype}")

    if not jobs:
        sys.stdout.write(".")
        sys.stdout.flush()

    time.sleep(POLL_INTERVAL)
