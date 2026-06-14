import re
import random

# Слова-паразиты и звуки раздумья
FILLER_WORDS = ["э-э...", "м-м...", "ну...", "значит..."]

# Слова для дублирования (короткие слова, которые люди часто повторяют, сбиваясь)
REPEATABLE_WORDS = {"что", "как", "мы", "вы", "они", "это", "вот", "где", "там", "тут", "так", "уже", "если", "или"}

# Слова для безопасного акцентирования КАПСОМ (усилительные наречия и прилагательные)
# Их выделение никогда не сломает смысл, а только добавит эмоций диктору
EMPHASIS_WORDS = {"абсолютно", "совершенно", "полностью", "действительно", "крайне", "очень", "категорически", "исключительно", "единственный", "главное", "важно", "обязательно"}

def add_stutters(text: str, probability=0.15) -> str:
    """Добавляет фонетические запинания перед длинными словами."""
    def replacer(match):
        word = match.group(0)
        # Если слово длиннее 6 букв и мы попали в вероятность
        if len(word) > 6 and random.random() < probability:
            # берем первую букву, добавляем дефис и само слово (п-правительство)
            first_char = word[0]
            if first_char.isalpha():
                return f"{first_char}-{word.lower()}" if not word.istitle() else f"{first_char.upper()}-{word.lower()}"
        return word

    # Ищем слова, состоящие из букв кириллицы
    return re.sub(r'[а-яА-ЯёЁ]+', replacer, text)

def add_word_repeats(text: str, probability=0.15) -> str:
    """Дублирует короткие слова (например: что... что это)."""
    def replacer(match):
        word = match.group(0)
        if word.lower() in REPEATABLE_WORDS and random.random() < probability:
            return f"{word}... {word.lower()}"
        return word

    return re.sub(r'\b[а-яА-ЯёЁ]+\b', replacer, text)

def add_caps_emphasis(text: str, probability=0.5) -> str:
    """Безопасно переводит усилительные слова в КАПС для эмоционального акцента."""
    def replacer(match):
        word = match.group(0)
        if word.lower() in EMPHASIS_WORDS and random.random() < probability:
            return word.upper()
        return word

    return re.sub(r'\b[а-яА-ЯёЁ]+\b', replacer, text)

def add_fillers_and_ellipses(text: str, filler_prob=0.03, ellipse_prob=0.20) -> str:
    """Добавляет слова-паразиты после запятых, или превращает запятые в задумчивое многоточие."""
    def replacer(match):
        comma = match.group(0)
        rnd = random.random()
        if rnd < filler_prob:
            filler = random.choice(FILLER_WORDS)
            return f"{comma} {filler}"
        elif rnd < filler_prob + ellipse_prob:
            return "..."
        return comma

    return re.sub(r',', replacer, text)

def space_before_punct(text: str) -> str:
    """Добавляет пробел перед знаками препинания (подход 17), что смягчает интонацию."""
    return re.sub(r'([.!?])', r' \1', text)

def split_into_sentences(text: str) -> list[str]:
    """Разбивает текст на отдельные предложения для удобного рендера."""
    # Убираем лишние пробелы и переносы
    text = re.sub(r'\s+', ' ', text).strip()
    
    # Разбиваем по знакам окончания предложения, сохраняя сам знак
    sentences = re.split(r'(?<=[.!?…])\s+(?=[А-ЯЁA-Z])', text)
    
    # Отфильтруем пустые строки
    return [s.strip() for s in sentences if s.strip()]

def humanize_text(text: str) -> list[str]:
    """
    Основная функция пайплайна хуманизации:
    1. Повторение слов
    2. Эмоциональные акценты
    3. Запинки
    4. Запятые -> паразиты/многоточия
    5. Разбивка на предложения
    """
    text = add_word_repeats(text)
    text = add_caps_emphasis(text)
    text = add_stutters(text)
    text = add_fillers_and_ellipses(text)
    text = space_before_punct(text)
    sentences = split_into_sentences(text)
    return sentences

if __name__ == "__main__":
    # Тестовый прогон
    sample = "Правительство Соединенных Штатов приняло решение о выделении дополнительных субсидий. Однако, экономическая ситуация остается нестабильной."
    print("Original:", sample)
    for _ in range(3):
        print("Humanized:", humanize_text(sample))
