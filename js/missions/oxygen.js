/* =====================================================================
   Испытание 2. Утечка кислорода
   Шаги: найти утечку (сканер давления) → выбрать инструмент →
   изолировать отсек и восстановить подачу (правильный порядок действий).
   Кислород всё время убывает, пока утечка не перекрыта.
   ===================================================================== */
Game.register({
  id: 'oxygen', order: 2, icon: '', img: 'oxygen', tag: 'Ремонт',
  title: 'Утечка кислорода',
  situation: 'Система сообщает об утечке кислорода. Его запасы постепенно уменьшаются!',
  skills: ['Жизнеобеспечение', 'Ремонт', 'Порядок действий'],
  learn: [
    'Кислород на корабле хранится в баках под давлением и раздаётся по трубам во все отсеки. Если где-то дыра, <b>давление падает</b>. По датчикам давления утечку и ищут.',
    'Нормальное давление в кабине такое же, как на Земле: примерно <b>101 кПа</b>.',
    'Повреждённый отсек сначала <b>изолируют</b>: закрывают люк и перекрывают трубу. Тогда воздух не уходит из всего корабля.',
    'Для каждой поломки свой инструмент: гайку затягивают ключом, трещину закрывают <b>герметичной заплаткой</b>, порванный шланг меняют.',
    'Обычный скотч в космосе не поможет: он не держит давление и трескается от холода.',
    'На МКС кислород получают из воды: электричество разделяет её на кислород и водород. Это называется <b>электролиз</b>.'
  ],

  start(ctx) {
    const { h, sfx, shuffle, pick, clamp, esc } = ctx;
    ctx.steps(['Найти утечку', 'Инструмент', 'Изолировать и починить']);

    const ROOMS = [
      { id: 'cab', name: 'Кабина пилотов', icon: '' },
      { id: 'lab', name: 'Лаборатория', icon: '' },
      { id: 'live', name: 'Жилой модуль', icon: '' },
      { id: 'store', name: 'Склад', icon: '' },
      { id: 'green', name: 'Оранжерея', icon: '' },
      { id: 'lss', name: 'Отсек жизнеобеспечения', icon: '' }
    ];
    const LEAKS = [
      { kind: 'nut', part: 'стык трубы', tool: 'wrench', what: 'Гайка на стыке трубы кислорода разболталась от вибрации. Газ со свистом выходит из щели.' },
      { kind: 'crack', part: 'стенка трубы', tool: 'patch', what: 'Микрометеорит оставил на трубе маленькую трещину. Из неё выходят пузырьки газа.' },
      { kind: 'hose', part: 'гибкий шланг', tool: 'hose', what: 'Старый гибкий шланг подачи кислорода порвался вдоль. Чинить его уже нельзя.' }
    ];
    const TOOLS = [
      { id: 'wrench', ico: '', name: 'Гаечный ключ', why: { ok: 'Затягиваем гайку — щель закрыта!', no: 'Ключом затягивают гайки, но здесь нечего затягивать.' } },
      { id: 'patch', ico: '', name: 'Герметичная заплатка', why: { ok: 'Заплатка с герметиком плотно закрывает трещину.', no: 'Заплатка хороша для трещин, но здесь другая поломка.' } },
      { id: 'hose', ico: '', name: 'Новый шланг и хомут', why: { ok: 'Меняем порванный шланг на новый и крепко зажимаем хомутом.', no: 'Шланг менять не нужно — он цел.' } },
      { id: 'hammer', ico: '', name: 'Молоток', why: { no: 'Стучать по трубе с газом под давлением опасно — можно сделать дыру ещё больше!' } },
      { id: 'tape', ico: '', name: 'Обычный скотч', why: { no: 'Обычный скотч не держит давление и трескается от холода. Нужна специальная герметичная заплатка.' } },
      { id: 'scissors', ico: '', name: 'Ножницы', why: { no: 'Ножницами ничего не заделать — только разрезать.' } },
      { id: 'screwdriver', ico: '', name: 'Отвёртка', why: { no: 'Отвёрткой откручивают винты. Утечку она не закроет.' } }
    ];

    const leakRoom = pick(ROOMS);
    const leak = pick(LEAKS);
    const tool = TOOLS.find(t => t.id === leak.tool);

    /* --- кислород --- */
    let o2 = 100, rate = 0.55, mistakes = 0, scans = 0, gone = false;
    ctx.stat.innerHTML = `<div class="gauge o2"><div class="g-label"><span>O₂ кислород</span><span class="v">100%</span></div><div class="bar"><i style="width:100%"></i></div></div>`;
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
      if (o2 < 30 && !warned) { warned = true; ctx.mc('Кислорода меньше 30%! Действуй быстрее, но без паники.', 'alarm'); }
      if (o2 <= 0) {
        gone = true;
        ctx.fail('Запас кислорода закончился, и ЦУП остановил тренировку.', 'Сканируй отсеки по очереди и присматривайся к облачкам газа: они подсказывают, где утечка. Неправильные действия тратят кислород.');
      }
    }
    ctx.every(250, () => { if (rate > 0) { o2 = clamp(o2 - rate / 4, 0, 100); renderO2(); check(); } });

    stepFind();

    /* ---------------- 1. Найти утечку ---------------- */
    function stepFind() {
      ctx.step(0);
      ctx.mc('<b>Тревога!</b> Давление кислорода падает. Возьми <b>датчик давления</b> и проверь отсеки: нажимай на них по очереди.', 'alarm');
      const el = h(`
        <div class="panel card">
          <div class="task-title"><span class="num">1</span><h2>Найди повреждённый отсек</h2></div>
          <p>Нормальное давление — <b>около 101 кПа</b>. Если давление ниже и продолжает падать, значит, утечка там. <span class="muted">Подсказка: присмотрись, где видны облачка газа.</span></p>
          <div class="screen ship-map"></div>
          <div class="fb"></div>
        </div>`);
      const map = el.querySelector('.ship-map');
      ROOMS.forEach(r => {
        const b = h(`<button class="room" data-id="${r.id}">${ctx.ico('room-' + r.id, 'r-img')}<span class="r-name">${esc(r.name)}</span><span class="r-read">нажми, чтобы проверить</span></button>`);
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
        b.querySelector('.r-read').textContent = 'сканирую…';
        ctx.after(800, () => {
          busy = false;
          b.classList.remove('scan');
          if (r !== leakRoom) {
            b.classList.add('normal');
            b.querySelector('.r-read').textContent = `${(100.8 + Math.random() * 0.6).toFixed(1)} кПа  норма`;
            sfx.radio();
            return;
          }
          b.classList.add('leak');
          let p = 88.4;
          const read = b.querySelector('.r-read');
          read.textContent = `${p.toFixed(1)} кПа ↓ падает!`;
          ctx.every(500, () => { p -= 0.3; read.textContent = `${p.toFixed(1)} кПа ↓ падает!`; });
          sfx.ok();
          map.querySelectorAll('.room').forEach(x => x.disabled = true);
          ctx.mc(`Нашёл! В отсеке «<b>${esc(r.name)}</b>» давление падает. Повреждение: <b>${leak.part}</b>.`, 'good');
          const fb = el.querySelector('.fb');
          fb.innerHTML = `<div class="feedback ok">Утечка найдена за ${scans} ${scans === 1 ? 'проверку' : scans < 5 ? 'проверки' : 'проверок'}.</div><div class="actions"><button class="btn orange big">Осмотреть повреждение →</button></div>`;
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
      ctx.mc('Хорошо. Теперь посмотри на повреждение и выбери <b>правильный инструмент</b> из ящика. Неверный выбор тратит время и кислород.');
      const el = h(`
        <div class="panel card">
          <div class="task-title"><span class="num">2</span><h2>Какой инструмент нужен?</h2></div>
          <div class="closeup">
            ${closeupShot()}
            <div><h3>Повреждение: ${leak.part}</h3><p>${leak.what}</p></div>
          </div>
          <h3 style="margin-top:16px">Ящик с инструментами</h3>
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
            fb.innerHTML = `<div class="feedback ok">${t.why.ok}</div><div class="actions"><button class="btn orange big">Взять инструмент →</button></div>`;
            fb.querySelector('button').onclick = () => { sfx.click(); stepFix(); };
            ctx.mc(`Верно: <b>${esc(t.name)}</b>. Но чинить сразу нельзя — сначала нужно изолировать отсек!`, 'good');
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
      ctx.mc('Последний шаг. Нажимай на действия <b>в правильном порядке</b>: сначала безопасность, потом ремонт, потом подача кислорода.');
      const SEQ = [
        { id: 'hatch', text: `Закрыть люк отсека «${leakRoom.name}»`, ico: '', fx: () => { rate = 0.3; ctx.mc('Люк закрыт: воздух больше не уходит из всего корабля. Утечка замедлилась.', 'good'); } },
        { id: 'valve', text: 'Перекрыть трубу подачи O₂ в этот отсек', ico: '', fx: () => { rate = 0.08; ctx.mc('Труба перекрыта. Кислород почти не теряется — отсек изолирован!', 'good'); } },
        { id: 'repair', text: `Починить: ${tool.name.toLowerCase()}`, ico: '', fx: () => { rate = 0.05; ctx.mc('Ремонт выполнен. Но открывать подачу ещё рано: убедимся, что всё герметично.', 'good'); } },
        { id: 'test', text: 'Проверить давление в отсеке', ico: '', fx: () => { ctx.mc('Давление держится стабильно — утечки больше нет!', 'good'); } },
        { id: 'open', text: 'Открыть люк и включить подачу кислорода', ico: '', fx: () => {} }
      ];
      const TRAPS = [
        { id: 'airlock', text: 'Открыть внешний шлюз', ico: '', why: 'Ни в коем случае! Через шлюз весь воздух улетит в космос.', cost: 12 },
        { id: 'vent', text: 'Выключить вентиляцию во всём корабле', ico: '', why: 'Без вентиляции экипажу станет нечем дышать. Отключать нужно только повреждённый отсек.', cost: 8 }
      ];
      const HINTS = {
        valve: 'Сначала закрой люк, чтобы утечка не тянула воздух из всего корабля.',
        repair: 'Чинить можно только в изолированном отсеке: закрой люк и перекрой трубу.',
        test: 'Сначала нужно что-то починить, а потом проверять.',
        open: 'Открывать подачу можно только после проверки давления. Вдруг утечка осталась?',
        hatch: ''
      };
      let pos = 0;
      const el = h(`
        <div class="panel card">
          <div class="task-title"><span class="num">3</span><h2>Изолируй отсек и восстанови подачу</h2></div>
          <p>Пульт управления отсеком «<b>${esc(leakRoom.name)}</b>». Расставь действия по порядку, нажимая на них.</p>
          <div class="seq"></div>
          <div class="fb"></div>
        </div>`);
      const box = el.querySelector('.seq'), fb = el.querySelector('.fb');
      shuffle([...SEQ, ...TRAPS]).forEach(a => {
        const b = h(`<button class="seq-btn"><span class="n"></span><span>${esc(a.text)}</span></button>`);
        b.onclick = () => {
          const trap = TRAPS.includes(a);
          if (trap) {
            mistakes++; sfx.bad(); drain(a.cost);
            b.classList.add('wrong'); b.disabled = true;
            fb.innerHTML = `<div class="feedback no">${a.why}</div>`;
            return;
          }
          if (SEQ[pos] !== a) {
            mistakes++; sfx.bad(); drain(3);
            b.classList.remove('wrong'); void b.offsetWidth; b.classList.add('wrong');
            fb.innerHTML = `<div class="feedback no">Пока рано. ${HINTS[a.id] || ''}</div>`;
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
        ctx.mc('Подача кислорода восстановлена! Система регенерации пополняет запас. Экипаж в безопасности. ', 'good');
        const id = ctx.every(60, () => {
          o2 = Math.min(100, o2 + 1.5); renderO2();
          if (o2 >= 100) { clearInterval(id); finish(before); }
        });
      }
    }

    function finish(minO2) {
      let score = 3;
      const notes = [];
      notes.push({ ok: true, text: `Утечка найдена в отсеке «${leakRoom.name}», проверок: ${scans}.` });
      if (mistakes === 0) notes.push({ ok: true, text: 'Ни одной ошибки: правильный инструмент и верный порядок действий.' });
      else if (mistakes <= 2) { score--; notes.push({ ok: false, text: `Ошибок: ${mistakes}. Помни: сначала изолируй отсек, потом чини, потом проверяй.` }); }
      else { score -= 2; notes.push({ ok: false, text: `Ошибок: ${mistakes}. Каждое неверное действие тратит драгоценный кислород.` }); }
      if (minO2 >= 45) notes.push({ ok: true, text: `Сохранено ${minO2}% кислорода — быстрая работа!` });
      else { score--; notes.push({ ok: false, text: `Осталось всего ${minO2}% кислорода. Действуй быстрее.` }); }
      ctx.after(600, () => ctx.finish(score, notes));
    }
  }
});
