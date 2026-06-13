// E2E-смоук волны 1: война + суд ООН + битва + сводка года.
// Запуск на сервере: node e2e-war-smoke.mjs (рядом с node_modules).
import { io } from 'socket.io-client';

const URL = 'http://127.0.0.1:3000';
const socket = io(URL, { transports: ['websocket'] });

let snapshot = null;
const checks = [];
function check(name, ok, extra = '') {
  checks.push({ name, ok });
  console.log(`${ok ? '✅' : '❌'} ${name}${extra ? ` — ${extra}` : ''}`);
}
function emit(event, body = {}) {
  return new Promise((resolve) => {
    socket.timeout(7000).emit(event, body, (err, res) => {
      resolve(err ? { ok: false, error: 'timeout' } : res);
    });
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitPhase(phase, timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (snapshot?.phase === phase) return true;
    await sleep(500);
  }
  return false;
}

socket.on('room:state', (s) => (snapshot = s));
socket.on('game:announcement', (a) => console.log(`📢 ${a.title}`));

socket.on('connect', async () => {
  try {
    // 1. комната + боты + старт
    const created = await emit('room:create', { name: 'Смоук' });
    check('room:create', created.ok);
    const add = await emit('room:add_bots', { count: 5 });
    check('room:add_bots', add.ok);
    const started = await emit('room:start', {});
    check('room:start', started.ok);
    await waitPhase('cabinet', 5000);
    check('фаза cabinet', snapshot?.phase === 'cabinet');

    const target = snapshot.players.find((p) => p.isBot && p.countryId);

    // 2. объявление войны
    const decl = await emit('war:declare', {
      targetCountryId: target.countryId,
      casusBelli: 'Они укрывают наших налоговых беглецов',
    });
    check('war:declare', decl.ok, decl.error);
    const warId = decl.data?.warId;
    await sleep(700);
    const war = snapshot?.wars?.find((w) => w.id === warId);
    check('война в снапшоте', !!war);
    check('шанс победы виден участнику', typeof war?.estimatedWinChancePct === 'number', `${war?.estimatedWinChancePct}%`);

    // 3. вложение в кампанию
    const inv = await emit('war:invest', { warId, amount: 100 });
    check('war:invest', inv.ok, inv.error);
    await sleep(500);
    const war2 = snapshot?.wars?.find((w) => w.id === warId);
    check('вложение видно владельцу', war2?.yourInvestedThisYear === 100);

    // 4. мирное предложение (создаём и отзываем — мир не подписываем)
    const peace = await emit('trade:offer', {
      toCountryId: target.countryId,
      give: { resources: { money: 10 } },
      take: {},
      peaceWarId: warId,
    });
    check('trade:offer с peaceWarId', peace.ok, peace.error);
    if (peace.ok) await emit('trade:cancel', { offerId: peace.data.offerId });

    // 5. в ООН: готов → un_summary → прыжок председателя в un_vote
    await emit('cabinet:ready', {});
    check('переход в un_summary', await waitPhase('un_summary', 8000));
    const jump = await emit('room:host_set_phase', { phase: 'un_vote' });
    check('прыжок в un_vote', jump.ok, jump.error);
    await waitPhase('un_vote', 5000);

    // боты голосуют по войне ~1-3с
    await sleep(5000);
    const tally = snapshot?.warVoteTally?.[warId];
    check('боты судят войну', !!tally && tally.just + tally.unjust > 0, JSON.stringify(tally));

    // моя попытка голосовать (я участник — должна быть отклонена)
    const myVote = await emit('un:war_vote', { warId, verdict: 'just' });
    check('участник не голосует (отказ)', !myVote.ok, myVote.error);

    // 6. ждём конец un_vote (60s) → results (битва в тике)
    check('переход в results (битва)', await waitPhase('results', 75000));
    const war3 = snapshot?.wars?.find((w) => w.id === warId);
    const scored = (war3?.attacker.score ?? 0) + (war3?.defender.score ?? 0);
    check('битва сыграна (счёт 1)', scored === 1, `${war3?.attacker.score}:${war3?.defender.score}`);
    check('вердикт ООН вынесен', war3?.unVerdict !== 'pending', war3?.unVerdict);

    // 7. results → (таймер 45s) waitingContinue → host_continue → year_summary
    const t0 = Date.now();
    while (!snapshot?.waitingContinue && Date.now() - t0 < 60000) await sleep(1000);
    const cont = await emit('room:host_continue', {});
    check('host_continue', cont.ok, cont.error);
    check('фаза year_summary', await waitPhase('year_summary', 5000));
    const rep = snapshot?.yearReport;
    check('сводка года пришла', !!rep);
    check('дельты ресурсов в сводке', !!rep?.resources?.money);
    check('события войны в сводке', (rep?.warEvents?.length ?? 0) > 0, rep?.warEvents?.[0]);

    // 8. в кабинет года 2
    await emit('cabinet:ready', {});
    check('кабинет года 2', await waitPhase('cabinet', 8000));
    check('год = 2', snapshot?.year === 2);

    const failed = checks.filter((c) => !c.ok).length;
    console.log(`\n=== ИТОГ: ${checks.length - failed}/${checks.length} OK ===`);
    process.exit(failed ? 1 : 0);
  } catch (e) {
    console.error('💥', e);
    process.exit(1);
  }
});

setTimeout(() => {
  console.error('⏰ глобальный таймаут e2e');
  process.exit(1);
}, 240000);
