import os
import torch
import torchaudio

# Пути
OUT_DIR = "experiments"
os.makedirs(OUT_DIR, exist_ok=True)

# Инициализация модели Silero
device = torch.device('cpu')
local_file = 'model.pt'

if not os.path.isfile(local_file):
    torch.hub.download_url_to_file('https://models.silero.ai/models/tts/ru/v4_ru.pt', local_file)  

model = torch.package.PackageImporter(local_file).load_pickle("tts_models", "model")
model.to(device)

sample_rate = 48000
speaker = 'eugene'

variations = {
    "01_baseline": "Правительство США приняло решение о выделении дополнительных субсидий.",
    "02_acronym_spell": "Правительство Сэ Шэ А приняло решение о выделении дополнительных субсидий.",
    "03_acronym_dots": "Правительство С. Ш. А. приняло решение о выделении дополнительных субсидий.",
    "04_all_caps": "ПРАВИТЕЛЬСТВО США ПРИНЯЛО РЕШЕНИЕ О ВЫДЕЛЕНИИ ДОПОЛНИТЕЛЬНЫХ СУБСИДИЙ.",
    "05_all_lowercase": "правительство сша приняло решение о выделении дополнительных субсидий",
    "06_heavy_commas": "Правительство, США, приняло решение, о выделении, дополнительных субсидий.",
    "07_ellipses": "Правительство... США... приняло решение... о выделении дополнительных субсидий...",
    "08_dashes": "Правительство США — приняло решение — о выделении дополнительных субсидий.",
    "09_exclamation": "Правительство США приняло решение о выделении дополнительных субсидий!",
    "10_question": "Правительство США приняло решение о выделении дополнительных субсидий?",
    "11_double_exclamation": "Правительство США приняло решение о выделении дополнительных субсидий!!",
    "12_stretched_vowels": "Правиииительство США приняло решеееение о выделении субсидий.",
    "13_syllables": "Пра-ви-тель-ство Сэ Шэ А при-ня-ло ре-ше-ни-е о вы-де-ле-ни-и суб-си-дий.",
    "14_quotes": "Правительство «США» приняло «решение» о выделении дополнительных субсидий.",
    "15_verbs_caps": "Правительство США ПРИНЯЛО РЕШЕНИЕ о ВЫДЕЛЕНИИ дополнительных субсидий.",
    "16_nouns_caps": "ПРАВИТЕЛЬСТВО США приняло решение о выделении дополнительных СУБСИДИЙ.",
    "17_space_before_punct": "Правительство США приняло решение ! о выделении дополнительных субсидий .",
    "18_colons": "Правительство США: приняло решение: о выделении дополнительных субсидий.",
    "19_natural_fillers": "Ну, правительство Сэ Шэ А, значит, приняло решение о выделении субсидий.",
    "20_mixed_emotions": "ПРАВИТЕЛЬСТВО США... приняло решение? О выделении дополнительных субсидий!"
}

for name, text in variations.items():
    print(f"Генерация {name}...")
    try:
        audio_tensor = model.apply_tts(
            text=text,
            speaker=speaker,
            sample_rate=sample_rate,
            put_accent=True,
            put_yo=True
        )
        import soundfile as sf
        
        out_path = os.path.join(OUT_DIR, f"{name}.wav")
        audio_np = audio_tensor.cpu().numpy()
        if len(audio_np.shape) == 1:
            sf.write(out_path, audio_np, sample_rate)
        else:
            sf.write(out_path, audio_np.T, sample_rate)
    except Exception as e:
        print(f"Ошибка при генерации {name}: {e}")

print("Эксперименты сгенерированы в папку experiments/")
