const Redis = require('ioredis');
const redis = new Redis();

async function run() {
  const data = await redis.get('room:K997');
  if (data) {
    const parsed = JSON.parse(data);
    let found = false;
    for (const p of parsed.players || []) {
      if (p.name === 'Егор') {
        p.isHost = true;
        found = true;
        console.log("Set Егор as host");
      }
    }
    if (found) {
      await redis.set('room:K997', JSON.stringify(parsed));
    } else {
      console.log("Could not find Егор");
    }
  } else {
    console.log("Room not found");
  }
  process.exit(0);
}
run();
