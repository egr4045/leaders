import json
import redis
import uuid

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=False)
data_bytes = r.get('room:K997')
if data_bytes:
    data = json.loads(data_bytes.decode('utf-8'))
    
    # Check if china is already taken
    has_china = any(p.get('countryId') == 'china' for p in data.get('players', []))
    if not has_china:
        china_player = {
            "playerId": str(uuid.uuid4()),
            "name": "Настька Т",
            "token": str(uuid.uuid4()),
            "countryId": "china",
            "isHost": False,
            "isBot": False,
            "connected": False
        }
        data['players'].append(china_player)
        r.set('room:K997', json.dumps(data, ensure_ascii=False).encode('utf-8'))
        print("Restored China")
    else:
        print("China already exists")
