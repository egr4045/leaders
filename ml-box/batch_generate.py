import os
import json
import time
from humanizer import humanize_text
from tts_renderer import ParallelTTSRenderer
from mixer import mix_audio, mix_audio_to_wav

INPUT_DIR = os.path.join(os.path.dirname(__file__), "inputs")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output")

# Вы можете переназначить голоса для разных стран здесь
VOICE_MAPPING = {
    "usa": "eugene",
    "uk": "eugene",
    "russia": "eugene",
    "germany": "xenia",
    "dprk": "kseniya",
    "china": "xenia",
    "india": "kseniya",
    "japan": "xenia",
    "armenia": "kseniya",
    "israel": "eugene",
    "default": "eugene"
}

def extract_texts(filepath: str) -> list[tuple[str, str, str]]:
    """
    Парсит JSON файл и возвращает список кортежей: (id_фразы, текст_фразы, голос_спикера).
    Поддерживается структура файлов из content/advisors.
    Если файл простой TXT, то построчно.
    """
    items = []
    if filepath.endswith('.json'):
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        country = data.get("country", "default")
        voice = VOICE_MAPPING.get(country, VOICE_MAPPING["default"])
        
        for card in data.get("cards", []):
            cid = card.get("id")
            if "situation" in card:
                items.append((f"{cid}_situation", card["situation"], voice))
            
            for i, choice in enumerate(card.get("choices", [])):
                news = choice.get("newsLines", {})
                if "state" in news:
                    items.append((f"{cid}_choice{i}_state", news["state"], voice))
                if "liberal" in news:
                    items.append((f"{cid}_choice{i}_liberal", news["liberal"], voice))
    elif filepath.endswith('.txt'):
        with open(filepath, 'r', encoding='utf-8') as f:
            for i, line in enumerate(f):
                line = line.strip()
                if line:
                    items.append((f"txt_line_{i}", line, VOICE_MAPPING["default"]))
    return items

def main():
    os.makedirs(INPUT_DIR, exist_ok=True)
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    files = [f for f in os.listdir(INPUT_DIR) if f.endswith('.json') or f.endswith('.txt')]
    if not files:
        print(f"No files found in {INPUT_DIR}. Please place your json/txt files there.")
        return

    # Запускаем рендерер с учетом кол-ва ядер (на Ryzen 5 2600x - 6 ядер)
    renderer = ParallelTTSRenderer(max_workers=6)
    renderer.start()
    
    total_items = 0
    t0 = time.time()
    
    try:
        for filename in files:
            filepath = os.path.join(INPUT_DIR, filename)
            items = extract_texts(filepath)
            print(f"Processing {filename} ({len(items)} items)...")
            
            for item_id, text, voice in items:
                print(f"  Generating: {item_id} (voice: {voice})")
                
                # 1. Хуманизатор
                sentences = humanize_text(text)
                
                # 2. Параллельный TTS
                wav_chunks = renderer.render_sentences(sentences, speaker=voice)
                
                # 3. Миксер и экспорт в MP3
                try:
                    final_mp3 = mix_audio(wav_chunks, voice=voice, breath_probability=0.35)
                    out_path = os.path.join(OUTPUT_DIR, f"{item_id}.mp3")
                    with open(out_path, 'wb') as f:
                        f.write(final_mp3)
                except Exception as e:
                    print(f"    Mixer error (ffmpeg might be missing): {e}. Falling back to WAV.")
                    final_wav = mix_audio_to_wav(wav_chunks, voice=voice, breath_probability=0.35)
                    out_path = os.path.join(OUTPUT_DIR, f"{item_id}.wav")
                    with open(out_path, 'wb') as f:
                        f.write(final_wav)

                total_items += 1
                
    except KeyboardInterrupt:
        print("\nInterrupted by user.")
    finally:
        renderer.stop()
        
    dt = time.time() - t0
    print(f"\nDone! Processed {total_items} items in {dt:.1f}s.")

if __name__ == "__main__":
    main()
