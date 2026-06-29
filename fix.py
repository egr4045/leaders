import json
import redis

# read backup
with open('/root/backup.json', 'r') as f:
    text = f.read().strip()
    data = json.loads(text)

players = data.get('players', [])
for p in players:
    name = p.get('name', '')
    if '╨' in name or '╤' in name:
        try:
            p['name'] = name.encode('cp1251').decode('utf-8')
        except Exception:
            pass

# exclude Nastya
data['players'] = [p for p in players if 'Настька' not in p.get('name', '') and '╨' not in p.get('name', '')]

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=False)
r.set('room:K997', json.dumps(data, ensure_ascii=False).encode('utf-8'))
print(f"Restored backup with {len(data['players'])} players")
