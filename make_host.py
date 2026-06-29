import json
import redis

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=False)
data_bytes = r.get('room:K997')
if data_bytes:
    data = json.loads(data_bytes.decode('utf-8'))
    
    found = False
    for p in data.get('players', []):
        if p.get('name') == 'Егор':
            p['isHost'] = True
            found = True
            print("Set Егор as host")
    
    if found:
        r.set('room:K997', json.dumps(data, ensure_ascii=False).encode('utf-8'))
    else:
        print("Could not find Егор")
else:
    print("Room not found")
