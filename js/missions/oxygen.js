/* =====================================================================
   Испытание 2. Утечка кислорода / Mission 2. Oxygen Leak
   Шаги: найти утечку (сканер давления) → выбрать инструмент →
   изолировать отсек и восстановить подачу (правильный порядок действий).
   Кислород всё время убывает, пока утечка не перекрыта.
   ===================================================================== */
Game.register({
  id: 'oxygen', order: 2, img: 'oxygen',
  get tag() { return L('Ремонт', 'Repair'); },
  get title() { return L('Утечка кислорода', 'Oxygen Leak'); },
  get situation() { return L('Система сообщает об утечке кислорода. Его запасы постепенно уменьшаются!', 'The system reports an oxygen leak. The supply is slowly running out!'); },
  get skills() { return L(['Жизнеобеспечение', 'Ремонт', 'Порядок действий'], ['Life support', 'Repair', 'Order of actions']); },
  get learn() {
    return L([
      'Кислород на корабле хранится в баках под давлением и раздаётся по трубам во все отсеки. Если где-то дыра, <b>давление падает</b>. По датчикам давления утечку и ищут.',
      'Нормальное давление в кабине такое же, как на Земле: примерно <b>101 кПа</b>.',
      'Повреждённый отсек сначала <b>изолируют</b>: закрывают люк и перекрывают трубу. Тогда воздух не уходит из всего корабля.',
      'Для каждой поломки свой инструмент: гайку затягивают ключом, трещину закрывают <b>герметичной заплаткой</b>, порванный шланг меняют.',
      'Обычный скотч в космосе не поможет: он не держит давление и трескается от холода.',
      'На МКС кислород получают из воды: электричество разделяет её на кислород и водород. Это называется <b>электролиз</b>.'
    ], [
      'Oxygen on a ship is stored in pressurised tanks and sent through pipes to every module. If there is a hole somewhere, <b>the pressure drops</b>. That’s how pressure sensors find a leak.',
      'Normal cabin pressure is the same as on Earth: about <b>101 kPa</b>.',
      'A damaged module is <b>isolated</b> first: close the hatch and shut off the pipe. Then air doesn’t escape from the whole ship.',
      'Every kind of damage needs its own tool: a nut is tightened with a wrench, a crack is covered with a <b>sealing patch</b>, a torn hose is replaced.',
      'Ordinary sticky tape won’t help in space: it can’t hold the pressure and cracks in the cold.',
      'On the ISS oxygen is made from water: electricity splits it into oxygen and hydrogen. This is called <b>electrolysis</b>.'
    ]);
  },

  start(ctx) {
    const { h, sfx, shuffle, pick, clamp, esc, plural } = ctx;
    ctx.steps(L(['Найти утечку', 'Инструмент', 'Изолировать и починить'], ['Find the leak', 'Tool', 'Isolate and repair']));

    const ROOMS = [
      { id: 'cab', name: L('Кабина пилотов', 'Cockpit') },
      { id: 'lab', name: L('Лаборатория', 'Laboratory') },
      { id: 'live', name: L('Жилой модуль', 'Crew quarters') },
      { id: 'store', name: L('Склад', 'Storage') },
      { id: 'green', name: L('Оранжерея', 'Greenhouse') },
      { id: 'lss', name: L('Отсек жизнеобеспечения', 'Life support module') }
    ];
    const LEAKS = [
      { kind: 'nut', part: L('стык трубы', 'pipe joint'), tool: 'wrench',
        what: L('Гайка на стыке трубы кислорода разболталась от вибрации. Газ со свистом выходит из щели.', 'The nut on an oxygen pipe joint has come loose from vibration. Gas is hissing out of the gap.') },
      { kind: 'crack', part: L('стенка трубы', 'pipe wall'), tool: 'patch',
        what: L('Микрометеорит оставил на трубе маленькую трещину. Из неё выходят пузырьки газа.', 'A micrometeorite left a small crack in the pipe. Gas bubbles are coming out of it.') },
      { kind: 'hose', part: L('гибкий шланг', 'flexible hose'), tool: 'hose',
        what: L('Старый гибкий шланг подачи кислорода порвался вдоль. Чинить его уже нельзя.', 'The old flexible oxygen hose has torn along its length. It can’t be fixed any more.') }
    ];
    const TOOLS = [
      { id: 'wrench', name: L('Гаечный ключ', 'Wrench'), why: {
        ok: L('Затягиваем гайку — щель закрыта!', 'Tightening the nut — the gap is closed!'),
        no: L('Ключом затягивают гайки, но здесь нечего затягивать.', 'A wrench tightens nuts, but there’s nothing to tighten here.') } },
      { id: 'patch', name: L('Герметичная заплатка', 'Sealing patch'), why: {
        ok: L('Заплатка с герметиком плотно закрывает трещину.', 'The patch with sealant closes the crack tightly.'),
        no: L('Заплатка хороша для трещин, но здесь другая поломка.', 'A patch is good for cracks, but this damage is different.') } },
      { id: 'hose', name: L('Новый шланг и хомут', 'New hose and clamp'), why: {
        ok: L('Меняем порванный шланг на новый и крепко зажимаем хомутом.', 'We replace the torn hose with a new one and tighten the clamp.'),
        no: L('Шланг менять не нужно — он цел.', 'There’s no need to replace the hose — it isn’t damaged.') } },
      { id: 'hammer', name: L('Молоток', 'Hammer'), why: {
        no: L('Стучать по трубе с газом под давлением опасно — можно сделать дыру ещё больше!', 'Hitting a pressurised gas pipe is dangerous — you could make the hole even bigger!') } },
      { id: 'tape', name: L('Обычный скотч', 'Ordinary tape'), why: {
        no: L('Обычный скотч не держит давление и трескается от холода. Нужна специальная герметичная заплатка.', 'Ordinary tape can’t hold the pressure and cracks in the cold. You need a special sealing patch.') } },
      { id: 'scissors', name: L('Ножницы', 'Scissors'), why: {
        no: L('Ножницами ничего не заделать — только разрезать.', 'Scissors can’t seal anything — they only cut.') } },
      { id: 'screwdriver', name: L('Отвёртка', 'Screwdriver'), why: {
        no: L('Отвёрткой откручивают винты. Утечку она не закроет.', 'A screwdriver is for screws. It won’t stop a leak.') } }
    ];

    const leakRoom = pick(ROOMS);
    const leak = pick(LEAKS);
    const tool = TOOLS.find(t => t.id === leak.tool);
    const kPa = L('кПа', 'kPa');

    /* --- кислород --- */
    let o2 = 100, rate = 0.55, mistakes = 0, scans = 0, gone = false;
    ctx.stat.innerHTML = `<div class="gauge o2"><div class="g-label"><span>${L('O₂ кислород', 'O₂ oxygen')}</span><span class="v">100%</span></div><div class="bar"><i style="width:100%"></i></div></div>`;
    const gauge = ctx.stat.querySelector('.gauge'), gBar = gauge.querySelector('i'), gVal = gauge.querySelector('.v');
    let warned = false;
    function renderO2() {
      gBar.style.width = o2 + '%';
      gVal.textContent = Math.round(o2) + '%';
      gauge.classList.toggle('low', o2 < 30);
    }
    function drain(n) { o2 = clamp(o2 - n, 0, 100); renderO2(); check(); }
    function check() {
      if (gone) return;
      if (o2 < 30 && !warned) { warned = true; ctx.mc(L('Кислорода меньше 30%! Действуй быстрее, но без паники.', 'Oxygen is below 30%! Hurry, but don’t panic.'), 'alarm'); }
      if (o2 <= 0) {
        gone = true;
        ctx.fail(L('Запас кислорода закончился, и ЦУП остановил тренировку.', 'The oxygen ran out, and Mission Control stopped the training.'),
                 L('Сканируй отсеки по очереди и присматривайся к облачкам газа: они подсказывают, где утечка. Неправильные действия тратят кислород.',
                   'Scan the modules one by one and look for little gas clouds: they show where the leak is. Wrong actions waste oxygen.'));
      }
    }
    ctx.every(250, () => { if (rate > 0) { o2 = clamp(o2 - rate / 4, 0, 100); renderO2(); check(); } });

    stepFind();

    /* ---------------- 1. Найти утечку ---------------- */
    function stepFind() {
      ctx.step(0);
      ctx.mc(L('<b>Тревога!</b> Давление кислорода падает. Возьми <b>датчик давления</b> и проверь отсеки: нажимай на них по очереди.',
               '<b>Alarm!</b> Oxygen pressure is dropping. Take the <b>pressure sensor</b> and check the modules: tap them one by one.'), 'alarm');
      const el = h(`
        <div class="panel card">
          <div class="task-title"><span class="num">1</span><h2>${L('Найди повреждённый отсек', 'Find the damaged module')}</h2></div>
          <p>${L('Нормальное давление — <b>около 101 кПа</b>. Если давление ниже и продолжает падать, значит, утечка там. <span class="muted">Подсказка: присмотрись, где видны облачка газа.</span>',
                 'Normal pressure is <b>about 101 kPa</b>. If it’s lower and still falling, the leak is there. <span class="muted">Hint: look for little clouds of gas.</span>')}</p>
          <div class="screen ship-map"></div>
          <div class="fb"></div>
        </div>`);
      const map = el.querySelector('.ship-map');
      ROOMS.forEach(r => {
        const b = h(`<button class="room" data-id="${r.id}">${ctx.ico('room-' + r.id, 'r-img')}<span class="r-name">${esc(r.name)}</span><span class="r-read">${L('нажми, чтобы проверить', 'tap to check')}</span></button>`);
        if (r === leakRoom) {
          for (let i = 0; i < 4; i++) {
            const p = document.createElement('span');
            p.className = 'puff';
            p.style.left = 55 + Math.random() * 35 + '%';
            p.style.top = 35 + Math.random() * 45 + '%';
            p.style.animationDelay = i * 0.6 + 's';
            b.appendChild(p);
          }
        }
        b.onclick = () => scan(b, r);
        map.appendChild(b);
      });
      let busy = false;
      function scan(b, r) {
        if (busy || b.classList.contains('normal')) return;
        busy = true; scans++;
        sfx.click();
        b.classList.add('scan');
        b.querySelector('.r-read').textContent = L('сканирую…', 'scanning…');
        ctx.after(800, () => {
          busy = false;
          b.classList.remove('scan');
          if (r !== leakRoom) {
            b.classList.add('normal');
            b.querySelector('.r-read').textContent = `${(100.8 + Math.random() * 0.6).toFixed(1)} ${kPa} · ${L('норма', 'normal')}`;
            sfx.radio();
            return;
          }
          b.classList.add('leak');
          let p = 88.4;
          const read = b.querySelector('.r-read');
          const falling = L('падает!', 'falling!');
          read.textContent = `${p.toFixed(1)} ${kPa} ↓ ${falling}`;
          ctx.every(500, () => { p -= 0.3; read.textContent = `${p.toFixed(1)} ${kPa} ↓ ${falling}`; });
          sfx.ok();
          map.querySelectorAll('.room').forEach(x => x.disabled = true);
          ctx.mc(L(`Нашёл! В отсеке «<b>${esc(r.name)}</b>» давление падает. Повреждение: <b>${leak.part}</b>.`,
                   `Found it! Pressure is falling in the <b>${esc(r.name)}</b>. Damage: <b>${leak.part}</b>.`), 'good');
          const fb = el.querySelector('.fb');
          const found = L(`Утечка найдена за ${scans} ${plural(scans, 'проверку', 'проверки', 'проверок')}.`,
                          `Leak found in ${scans} ${scans === 1 ? 'check' : 'checks'}.`);
          fb.innerHTML = `<div class="feedback ok">${found}</div><div class="actions"><button class="btn orange big">${L('Осмотреть повреждение →', 'Inspect the damage →')}</button></div>`;
          fb.querySelector('button').onclick = () => { sfx.click(); stepTool(); };
        });
      }
      ctx.stage.appendChild(el);
    }

    /* ---------------- 2. Инструмент ---------------- */
    // Крупный план повреждения (Higgsfield). Если отдельной картинки нет — кадр из фона отсека с трубами.
    function closeupShot() {
      return `<div class="shot screen" style="background-image:url('assets/sprites/leak-${leak.kind}.jpg'), url('assets/img/oxygen.jpg'); background-size: cover, 300%; background-position: center, 66% 48%"></div>`;
    }
    function stepTool() {
      ctx.step(1);
      ctx.mc(L('Хорошо. Теперь посмотри на повреждение и выбери <b>правильный инструмент</b> из ящика. Неверный выбор тратит время и кислород.',
               'Good. Now look at the damage and pick the <b>right tool</b> from the toolbox. A wrong choice wastes time and oxygen.'));
      const el = h(`
        <div class="panel card">
          <div class="task-title"><span class="num">2</span><h2>${L('Какой инструмент нужен?', 'Which tool do you need?')}</h2></div>
          <div class="closeup">
            ${closeupShot()}
            <div><h3>${L('Повреждение', 'Damage')}: ${leak.part}</h3><p>${leak.what}</p></div>
          </div>
          <h3 style="margin-top:16px">${L('Ящик с инструментами', 'Toolbox')}</h3>
          <div class="tools"></div>
          <div class="fb"></div>
        </div>`);
      const box = el.querySelector('.tools'), fb = el.querySelector('.fb');
      shuffle(TOOLS).forEach(t => {
        const b = h(`<button class="tool">${ctx.ico('tool-' + t.id)}${esc(t.name)}</button>`);
        b.onclick = () => {
          if (t.id === tool.id) {
            sfx.ok();
            b.classList.add('right');
            box.querySelectorAll('.tool').forEach(x => x.disabled = true);
            fb.innerHTML = `<div class="feedback ok">${t.why.ok}</div><div class="actions"><button class="btn orange big">${L('Взять инструмент →', 'Take the tool →')}</button></div>`;
            fb.querySelector('button').onclick = () => { sfx.click(); stepFix(); };
            ctx.mc(L(`Верно: <b>${esc(t.name)}</b>. Но чинить сразу нельзя — сначала нужно изолировать отсек!`,
                     `Correct: <b>${esc(t.name)}</b>. But don’t repair yet — first isolate the module!`), 'good');
          } else {
            mistakes++;
            sfx.bad(); drain(5);
            b.classList.add('wrong'); b.disabled = true;
            fb.innerHTML = `<div class="feedback no">${t.why.no}</div>`;
          }
        };
        box.appendChild(b);
      });
      ctx.stage.appendChild(el);
    }

    /* ---------------- 3. Изолировать и восстановить ---------------- */
    function stepFix() {
      ctx.step(2);
      ctx.mc(L('Последний шаг. Нажимай на действия <b>в правильном порядке</b>: сначала безопасность, потом ремонт, потом подача кислорода.',
               'Last step. Tap the actions <b>in the right order</b>: safety first, then the repair, then the oxygen supply.'));
      const SEQ = [
        { id: 'hatch', text: L(`Закрыть люк отсека «${leakRoom.name}»`, `Close the hatch of the ${leakRoom.name}`),
          fx: () => { rate = 0.3; ctx.mc(L('Люк закрыт: воздух больше не уходит из всего корабля. Утечка замедлилась.', 'Hatch closed: air no longer escapes from the whole ship. The leak has slowed down.'), 'good'); } },
        { id: 'valve', text: L('Перекрыть трубу подачи O₂ в этот отсек', 'Shut off the O₂ pipe to this module'),
          fx: () => { rate = 0.08; ctx.mc(L('Труба перекрыта. Кислород почти не теряется — отсек изолирован!', 'Pipe shut off. Almost no oxygen is lost — the module is isolated!'), 'good'); } },
        { id: 'repair', text: L(`Починить: ${tool.name.toLowerCase()}`, `Repair with: ${tool.name.toLowerCase()}`),
          fx: () => { rate = 0.05; ctx.mc(L('Ремонт выполнен. Но открывать подачу ещё рано: убедимся, что всё герметично.', 'Repair done. It’s too early to open the supply: let’s make sure everything is sealed.'), 'good'); } },
        { id: 'test', text: L('Проверить давление в отсеке', 'Check the pressure in the module'),
          fx: () => { ctx.mc(L('Давление держится стабильно — утечки больше нет!', 'The pressure is stable — the leak is gone!'), 'good'); } },
        { id: 'open', text: L('Открыть люк и включить подачу кислорода', 'Open the hatch and turn the oxygen supply back on'), fx: () => {} }
      ];
      const TRAPS = [
        { id: 'airlock', text: L('Открыть внешний шлюз', 'Open the outer airlock'),
          why: L('Ни в коем случае! Через шлюз весь воздух улетит в космос.', 'Never! All the air would escape into space through the airlock.'), cost: 12 },
        { id: 'vent', text: L('Выключить вентиляцию во всём корабле', 'Turn off ventilation in the whole ship'),
          why: L('Без вентиляции экипажу станет нечем дышать. Отключать нужно только повреждённый отсек.', 'Without ventilation the crew can’t breathe. Only the damaged module should be shut off.'), cost: 8 }
      ];
      const HINTS = {
        valve: L('Сначала закрой люк, чтобы утечка не тянула воздух из всего корабля.', 'Close the hatch first so the leak doesn’t pull air from the whole ship.'),
        repair: L('Чинить можно только в изолированном отсеке: закрой люк и перекрой трубу.', 'You can only repair an isolated module: close the hatch and shut off the pipe.'),
        test: L('Сначала нужно что-то починить, а потом проверять.', 'You need to repair something before you check it.'),
        open: L('Открывать подачу можно только после проверки давления. Вдруг утечка осталась?', 'Only open the supply after checking the pressure. What if the leak is still there?'),
        hatch: ''
      };
      let pos = 0;
      const el = h(`
        <div class="panel card">
          <div class="task-title"><span class="num">3</span><h2>${L('Изолируй отсек и восстанови подачу', 'Isolate the module and restore the supply')}</h2></div>
          <p>${L(`Пульт управления отсеком «<b>${esc(leakRoom.name)}</b>». Расставь действия по порядку, нажимая на них.`,
                 `Control panel of the <b>${esc(leakRoom.name)}</b>. Put the actions in order by tapping them.`)}</p>
          <div class="seq"></div>
          <div class="fb"></div>
        </div>`);
      const box = el.querySelector('.seq'), fb = el.querySelector('.fb');
      shuffle([...SEQ, ...TRAPS]).forEach(a => {
        const b = h(`<button class="seq-btn"><span class="n"></span><span>${esc(a.text)}</span></button>`);
        b.onclick = () => {
          if (TRAPS.includes(a)) {
            mistakes++; sfx.bad(); drain(a.cost);
            b.classList.add('wrong'); b.disabled = true;
            fb.innerHTML = `<div class="feedback no">${a.why}</div>`;
            return;
          }
          if (SEQ[pos] !== a) {
            mistakes++; sfx.bad(); drain(3);
            b.classList.remove('wrong'); void b.offsetWidth; b.classList.add('wrong');
            fb.innerHTML = `<div class="feedback no">${L('Пока рано.', 'Not yet.')} ${HINTS[a.id] || ''}</div>`;
            return;
          }
          sfx.ok();
          pos++;
          b.classList.remove('wrong');
          b.classList.add('done'); b.disabled = true;
          b.querySelector('.n').textContent = pos;
          fb.innerHTML = '';
          a.fx();
          if (pos === SEQ.length) done();
        };
        box.appendChild(b);
      });
      ctx.stage.appendChild(el);

      function done() {
        rate = 0;
        box.querySelectorAll('button').forEach(x => x.disabled = true);
        const before = Math.round(o2);
        ctx.mc(L('Подача кислорода восстановлена! Система регенерации пополняет запас. Экипаж в безопасности.',
                 'Oxygen supply restored! The regeneration system is refilling the supply. The crew is safe.'), 'good');
        const id = ctx.every(60, () => {
          o2 = Math.min(100, o2 + 1.5); renderO2();
          if (o2 >= 100) { clearInterval(id); finish(before); }
        });
      }
    }

    function finish(minO2) {
      let score = 3;
      const notes = [];
      notes.push({ ok: true, text: L(`Утечка найдена в отсеке «${leakRoom.name}», проверок: ${scans}.`, `Leak found in the ${leakRoom.name}, checks: ${scans}.`) });
      if (mistakes === 0) notes.push({ ok: true, text: L('Ни одной ошибки: правильный инструмент и верный порядок действий.', 'No mistakes: the right tool and the right order of actions.') });
      else if (mistakes <= 2) { score--; notes.push({ ok: false, text: L(`Ошибок: ${mistakes}. Помни: сначала изолируй отсек, потом чини, потом проверяй.`, `Mistakes: ${mistakes}. Remember: isolate first, then repair, then check.`) }); }
      else { score -= 2; notes.push({ ok: false, text: L(`Ошибок: ${mistakes}. Каждое неверное действие тратит драгоценный кислород.`, `Mistakes: ${mistakes}. Every wrong action wastes precious oxygen.`) }); }
      if (minO2 >= 45) notes.push({ ok: true, text: L(`Сохранено ${minO2}% кислорода — быстрая работа!`, `${minO2}% of the oxygen saved — fast work!`) });
      else { score--; notes.push({ ok: false, text: L(`Осталось всего ${minO2}% кислорода. Действуй быстрее.`, `Only ${minO2}% oxygen left. Work faster.`) }); }
      ctx.after(600, () => ctx.finish(score, notes));
    }
  }
});
