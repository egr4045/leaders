import json
import redis

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=False)
data_bytes = r.get('room:K997')
if data_bytes:
    text = data_bytes.decode('utf-8')
    data = json.loads(text)
    
    players = data.get('players', [])
    filtered = [p for p in players if p.get('countryId')]
    data['players'] = filtered
    
    r.set('room:K997', json.dumps(data, ensure_ascii=False).encode('utf-8'))
    print(f'Kept {len(filtered)} players with countries.')
