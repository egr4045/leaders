import os
import io
import random
import imageio_ffmpeg
from pydub import AudioSegment

# Указываем pydub использовать бинарник из imageio_ffmpeg
AudioSegment.converter = imageio_ffmpeg.get_ffmpeg_exe()

BREATHS_DIR = os.path.join(os.path.dirname(__file__), "breaths")

# Авто-создание нужных папок, если их нет
os.makedirs(os.path.join(BREATHS_DIR, "male"), exist_ok=True)
os.makedirs(os.path.join(BREATHS_DIR, "female"), exist_ok=True)

def load_breaths(gender_dir: str) -> list[AudioSegment]:
    """Загружает все WAV файлы из указанной папки breaths/gender."""
    breaths = []
    if os.path.exists(gender_dir):
        for f in os.listdir(gender_dir):
            if f.endswith('.wav'):
                try:
                    audio = AudioSegment.from_wav(os.path.join(gender_dir, f))
                    breaths.append(audio)
                except Exception as e:
                    print(f"Error loading breath {f}: {e}")
    return breaths

_cached_breaths = {
    "male": None,
    "female": None
}

def get_breaths(voice: str) -> list[AudioSegment]:
    gender = "female" if voice in ["baya", "kseniya", "xenia"] else "male"
    
    global _cached_breaths
    if _cached_breaths[gender] is None:
        gender_dir = os.path.join(BREATHS_DIR, gender)
        _cached_breaths[gender] = load_breaths(gender_dir)
        
    return _cached_breaths[gender]

def mix_audio(wav_buffers: list[bytes], voice: str, breath_probability=0.35) -> bytes:
    """
    Собирает список сырых WAV фрагментов в один итоговый аудиофайл (в памяти),
    добавляя вздохи диктора перед некоторыми предложениями.
    Возвращает байты MP3 файла.
    """
    breaths = get_breaths(voice)
    final_audio = AudioSegment.empty()
    
    # Небольшая пауза между предложениями
    sentence_pause = AudioSegment.silent(duration=300) # 300ms
    
    volume_drop = 0.0
    for wav_bytes in wav_buffers:
        chunk = AudioSegment.from_wav(io.BytesIO(wav_bytes))
        
        # Динамическое снижение громкости
        if volume_drop > 0:
            chunk = chunk - volume_drop
            
        # С шансом добавляем случайный вздох, если есть файлы вздохов
        if breaths and random.random() < breath_probability:
            breath = random.choice(breaths)
            final_audio += breath
            final_audio += AudioSegment.silent(duration=100)
            
        final_audio += chunk
        final_audio += sentence_pause
        volume_drop += 0.5
        
    out_buffer = io.BytesIO()
    final_audio.export(out_buffer, format="mp3", bitrate="192k")
    return out_buffer.getvalue()

def mix_audio_to_wav(wav_buffers: list[bytes], voice: str, breath_probability=0.35) -> bytes:
    """
    То же самое, но возвращает WAV для тех случаев, когда MP3 не требуется.
    """
    breaths = get_breaths(voice)
    final_audio = AudioSegment.empty()
    sentence_pause = AudioSegment.silent(duration=300)
    
    volume_drop = 0.0
    for wav_bytes in wav_buffers:
        chunk = AudioSegment.from_wav(io.BytesIO(wav_bytes))
        
        if volume_drop > 0:
            chunk = chunk - volume_drop
            
        if breaths and random.random() < breath_probability:
            breath = random.choice(breaths)
            final_audio += breath
            final_audio += AudioSegment.silent(duration=100)
            
        final_audio += chunk
        final_audio += sentence_pause
        volume_drop += 0.5
        
    out_buffer = io.BytesIO()
    final_audio.export(out_buffer, format="wav")
    return out_buffer.getvalue()
