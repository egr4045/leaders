import os
import io
import torch
import soundfile as sf
from concurrent.futures import ProcessPoolExecutor

# Глобальная переменная для хранения модели в рамках одного процесса-воркера
_model = None
_device = None

def init_worker():
    """Инициализатор воркера: загружает модель Silero TTS в память процесса."""
    global _model, _device
    
    _device = torch.device('cpu')
    torch.set_num_threads(1)  # Ограничиваем кол-во потоков внутри PyTorch для каждого воркера, так как используем много процессов
    
    local_file = 'model.pt'
    if not os.path.isfile(local_file):
        print(f"[Worker {os.getpid()}] Downloading Silero TTS model...")
        torch.hub.download_url_to_file('https://models.silero.ai/models/tts/ru/v4_ru.pt', local_file)
        
    print(f"[Worker {os.getpid()}] Loading model...")
    _model = torch.package.PackageImporter(local_file).load_pickle("tts_models", "model")
    _model.to(_device)
    print(f"[Worker {os.getpid()}] Model loaded successfully.")

def render_sentence(sentence: str, speaker: str) -> bytes:
    """
    Рендерит одно предложение в WAV-формат (в памяти) и возвращает байты.
    """
    global _model
    if not _model:
        raise RuntimeError("Model is not initialized in this worker!")
        
    sample_rate = 48000
    
    # Добавляем put_accent=True, put_yo=True для более естественного звучания
    audio = _model.apply_tts(
        text=sentence,
        speaker=speaker,
        sample_rate=sample_rate,
        put_accent=True,
        put_yo=True
    )
    
    # Сохраняем аудио в In-Memory buffer в формате WAV
    buffer = io.BytesIO()
    sf.write(buffer, audio.numpy(), sample_rate, format='WAV')
    return buffer.getvalue()

class ParallelTTSRenderer:
    def __init__(self, max_workers=6):
        self.max_workers = max_workers
        self.executor = None

    def start(self):
        if self.executor is None:
            print(f"Starting ProcessPoolExecutor with {self.max_workers} workers...")
            self.executor = ProcessPoolExecutor(
                max_workers=self.max_workers,
                initializer=init_worker
            )

    def stop(self):
        if self.executor is not None:
            self.executor.shutdown(wait=True)
            self.executor = None

    def render_sentences(self, sentences: list[str], speaker: str) -> list[bytes]:
        """
        Отправляет список предложений на рендер в пул и возвращает упорядоченный список WAV-байтов.
        """
        if self.executor is None:
            self.start()
            
        # map гарантирует сохранение порядка
        results = list(self.executor.map(render_sentence, sentences, [speaker]*len(sentences)))
        return results

if __name__ == "__main__":
    # Тестовый прогон
    renderer = ParallelTTSRenderer(max_workers=2)
    renderer.start()
    sentences = ["Первое предложение для теста.", "А это второе предложение, чуть длиннее."]
    wavs = renderer.render_sentences(sentences, "eugene")
    print(f"Rendered {len(wavs)} wav buffers. Sizes: {[len(w) for w in wavs]}")
    renderer.stop()
