# Контракт ML-коробки (TTS + картинки)

VPS ставит задания в очередь, твоя ML-коробка (Python/FastAPI или просто скрипт)
**сама опрашивает** VPS исходящими HTTP-запросами и пушит результаты обратно.
Входящих соединений к ML-коробке нет → Cloudflare Tunnel **не обязателен**
(он нужен, только если захочешь принимать команды push-ом).

- База: `https://mygame-quiz.ru/api/ml`
- Авторизация: заголовок `Authorization: Bearer <ML_BOX_TOKEN>` (значение в `/root/leaders/.env`)
- Пока на VPS включён mock-режим (`ML_MOCK=1` по умолчанию): задания в очередь не попадают,
  а закрываются заглушками. Чтобы работать с реальной коробкой, запусти сервер с `ML_MOCK=0`.

## 1. Забрать задания

```
GET /api/ml/jobs?max=3
→ 200 {"jobs":[{
    "id":"7f3c…","type":"tts","priority":"high",
    "payload":{"text":"Сводка по Империи: …","style":"новостной диктор, мужской"},
    "roomCode":"AB12","year":3,"countryId":"imperiya","createdAt":1781220000000
  }]}
```

- `type: "tts"` → `payload.text` — текст для озвучки. Верни аудио (wav/mp3/ogg).
- `type: "image"` → `payload.prompt` — промпт картинки-вставки. Верни png/jpg/webp.
- Приоритетные (`high` = озвучка сводок) отдаются первыми.
- Забранное задание помечается `processing` и из очереди исчезает — не теряй его.

## 2. Отдать результат

```
POST /api/ml/jobs/<id>/result
Content-Type: application/json
{"ext":"wav","dataBase64":"<base64 файла>"}
→ 200 {"ok":true}
```

Ассет ляжет на VPS в `assets-cache/<id>.<ext>` и сразу станет доступен клиентам
по `https://mygame-quiz.ru/media/<id>.<ext>`.

## 3. Сообщить о провале

```
POST /api/ml/jobs/<id>/fail
{"error":"CUDA out of memory"}
```

Игра не ждёт вечно: если ассет не пришёл к началу сводки, клиент показывает
текст без озвучки (фолбэк). Так что провал — не катастрофа.

## Референсный цикл коробки (псевдокод)

```python
while True:
    jobs = GET("/api/ml/jobs?max=2").json()["jobs"]
    for job in jobs:
        try:
            if job["type"] == "tts":
                data, ext = tts(job["payload"]["text"]), "wav"
            else:
                data, ext = gen_image(job["payload"]["prompt"]), "png"
            POST(f"/api/ml/jobs/{job['id']}/result",
                 json={"ext": ext, "dataBase64": b64(data)})
        except Exception as e:
            POST(f"/api/ml/jobs/{job['id']}/fail", json={"error": str(e)})
    sleep(1.5)
```

## Тайминг (раздел 4 спеки)

Задания ставятся в момент конца фазы Кабинета. До начала озвучки сводки есть
форы: переход фаз + заставка (~30 секунд). TTS должен укладываться в это окно;
картинки могут доехать позже — клиент покажет их, когда появятся.
