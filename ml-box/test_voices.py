import os
import torch
import torchaudio

def main():
    device = torch.device('cpu')
    torch.set_num_threads(4)
    local_file = 'model.pt'
    
    if not os.path.isfile(local_file):
        print("Downloading Silero TTS model...")
        torch.hub.download_url_to_file('https://models.silero.ai/models/tts/ru/v4_ru.pt', local_file)  

    print("Loading model...")
    model = torch.package.PackageImporter(local_file).load_pickle("tts_models", "model")
    model.to(device)

    sample_rate = 48000
    speakers = ['aidar', 'baya', 'kseniya', 'xenia', 'eugene']
    
    text = "Привет! Я один из дикторов. Как тебе мой голос? Надеюсь, звучит достаточно убедительно."
    
    os.makedirs("voice_samples", exist_ok=True)
    
    for speaker in speakers:
        print(f"Generating for {speaker}...")
        audio_path = f"voice_samples/{speaker}.wav"
        try:
            audio = model.apply_tts(text=text,
                                    speaker=speaker,
                                    sample_rate=sample_rate)
            import soundfile as sf
            sf.write(audio_path, audio.numpy(), sample_rate)
            print(f"Saved: {audio_path}")
        except Exception as e:
            print(f"Failed for {speaker}: {e}")

if __name__ == "__main__":
    main()
