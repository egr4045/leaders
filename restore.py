import json

with open('d:/dev/leaders/room_k997_utf8.json', 'r', encoding='utf-8-sig') as f:
    text = f.read().strip()
    if text.startswith('"'):
        text = json.loads(text)
    data = json.loads(text)
    players = data.get('players', [])
    print(f'Total players in original backup: {len(players)}')
    
    # decode CP866 and filter nastya
    fixed_players = []
    for p in players:
        name = p.get('name', '')
        # fix encoding if broken
        if '╨' in name or '╤' in name:
            try:
                name = name.encode('cp866').decode('utf-8')
                p['name'] = name
            except Exception:
                pass
        
        if 'Настька' not in name:
            fixed_players.append(p)
            
    data['players'] = fixed_players
    print(f'Total players after filter: {len(fixed_players)}')
    
    with open('d:/dev/leaders/room_k997_restored.json', 'w', encoding='utf-8') as out:
        out.write(json.dumps(data, ensure_ascii=False))
