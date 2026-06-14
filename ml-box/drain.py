import requests, os, time

SERVER = 'https://mygame-quiz.ru'
with open('.env', 'r', encoding='utf-8') as f:
    token = f.read().split('=')[1].strip()

def fail_all():
    while True:
        try:
            r = requests.get(f'{SERVER}/api/ml/jobs', params={'max': 10}, headers={'Authorization': f'Bearer {token}'}, timeout=10)
            jobs = r.json().get('jobs', [])
            if not jobs:
                print('Queue empty!')
                break
            for j in jobs:
                requests.post(f'{SERVER}/api/ml/jobs/{j["id"]}/fail', json={'error': 'flushed'}, headers={'Authorization': f'Bearer {token}'}, timeout=10)
            print(f'Flushed {len(jobs)} jobs...')
            time.sleep(0.5)
        except Exception as e:
            print(f'Error: {e}, retrying in 2 seconds...')
            time.sleep(2)

if __name__ == '__main__':
    fail_all()
