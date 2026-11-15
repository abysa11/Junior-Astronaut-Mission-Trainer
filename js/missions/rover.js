/* =====================================================================
   Испытание «Исследование лунных кратеров» / Lunar Crater Explorer
   Вид от третьего лица: игрок ведёт луноход по Луне, объезжает камни и
   кратеры, собирает образцы грунта, фотографирует интересные места
   камерой на мачте (они отмечаются на карте) и чинит поломки.
   Цель — найти место для будущей лунной базы: нужна вода (лёд) и свет.
   В конце — выбор образцов в капсулу (не больше 3 кг) и места для базы.
   ===================================================================== */
Game.register({
  id: 'rover', order: 6, img: 'rover', main: true,
  get tag() { return L('Исследование', 'Exploration'); },
  get title() { return L('Исследование лунных кратеров', 'Lunar Crater Explorer'); },
  get situation() { return L('Управляй луноходом: объезжай камни и кратеры, собирай образцы, фотографируй находки и найди лёд для будущей лунной базы.', 'Drive a moon rover: steer around rocks and craters, collect samples, photograph discoveries and find ice for a future lunar base.'); },
  get skills() { return L(['Вождение', 'Наблюдение', 'Ремонт', 'Расчёты', 'Выбор'], ['Driving', 'Observation', 'Repair', 'Maths', 'Choices']); },
  get learn() {
    return L([
      'На полюсах Луны есть <b>кратеры, куда никогда не заглядывает Солнце</b>. Там очень холодно, и в грунте может храниться лёд.',
      'Лунная пыль — <b>реголит</b> — острая и липкая. Она оседает на солнечных панелях и забирает энергию.',
      'Колёса луноходов делают <b>без воздуха</b>: из металлической сетки или пластин. Накачать их нельзя — в вакууме это бессмысленно.',
      'Тёмные равнины Луны — застывшая <b>лава</b> (базальт), а светлые горы — порода <b>анортозит</b>.',
      'С Луны Земля видна в небе всегда в одном и том же месте и в <b>4 раза больше</b>, чем Луна с Земли.',
      'Ракета или капсула может поднять только ограниченный вес, поэтому учёные тщательно выбирают, какие образцы везти.'
    ], [
      'At the Moon’s poles there are <b>craters the Sun never reaches</b>. They are very cold, and ice may be stored in the ground.',
      'Moon dust — <b>regolith</b> — is sharp and sticky. It settles on solar panels and steals energy.',
      'Rover wheels have <b>no air</b>: they are made of metal mesh or plates. You can’t pump them up — in a vacuum it makes no sense.',
      'The Moon’s dark plains are frozen <b>lava</b> (basalt), and the bright highlands are <b>anorthosite</b> rock.',
      'From the Moon, Earth always hangs in the same place in the sky and looks <b>4 times bigger</b> than the Moon does from Earth.',
      'A rocket or capsule can only lift a limited weight, so scientists choose carefully which samples to bring.'
    ]);
  },

  start(ctx) {
    const { h, sfx, clamp, shuffle } = ctx;
    const touch = Game.isTouch;
    ctx.steps(L(['Брифинг', 'Исследование', 'Анализ'], ['Briefing', 'Exploration', 'Analysis']));
    const num = (n, d = 1) => L(Number(n).toFixed(d).replace('.', ','), Number(n).toFixed(d));
    const CAP_KG = 3;

    /* ---------- образцы и интересные места ---------- */
    const SAMPLES = [
      { id: 'ice', x: 22, z: -112, name: L('Ледяной реголит', 'Icy regolith'), kg: 1.2, water: 8, pts: 40, where: L('дно Тёмного кратера', 'floor of the Dark crater'),
        fact: L('Внутри — крошечные кристаллы <b>льда</b>! Здесь никогда не бывает Солнца, температура около −230 °C, поэтому лёд не испарился миллиарды лет.', 'Inside there are tiny <b>ice</b> crystals! The Sun never shines here, it’s about −230 °C, so the ice hasn’t evaporated for billions of years.') },
      { id: 'rim', x: 46, z: -96, name: L('Грунт с края Тёмного кратера', 'Dark crater rim soil'), kg: 0.6, water: 2, pts: 20, where: L('край Тёмного кратера', 'rim of the Dark crater'),
        fact: L('Немного воды есть и на краю кратера — <b>2%</b>. Зато здесь бывает Солнце. Интересное сочетание!', 'There’s a little water on the rim too — <b>2%</b>. And the Sun shines here. Interesting combination!') },
      { id: 'basalt', x: 48, z: -38, name: L('Базальт (застывшая лава)', 'Basalt (frozen lava)'), kg: 1.4, water: 0, pts: 15, where: L('кратер Малыш', 'Little crater'),
        fact: L('Тёмный тяжёлый <b>базальт</b> — это застывшая лава. Миллиарды лет назад на Луне были вулканы!', 'Dark heavy <b>basalt</b> is frozen lava. Billions of years ago the Moon had volcanoes!') },
      { id: 'glass', x: 38, z: -28, name: L('Оранжевое стекло', 'Orange glass'), kg: 0.4, water: 0.1, pts: 20, where: L('край кратера Малыш', 'edge of Little crater'),
        fact: L('Крошечные шарики <b>вулканического стекла</b>. В них есть следы воды из недр Луны — совсем чуть-чуть.', 'Tiny beads of <b>volcanic glass</b>. They hold traces of water from deep inside the Moon — just a tiny bit.') },
      { id: 'anorth', x: -60, z: -42, name: L('Анортозит (светлая порода)', 'Anorthosite (bright rock)'), kg: 0.9, water: 0, pts: 20, where: L('центральная горка кратера Сияние', 'central peak of Shining crater'),
        fact: L('Светлый <b>анортозит</b> — одна из самых древних пород Луны, ей около 4,4 миллиарда лет.', 'Bright <b>anorthosite</b> is one of the Moon’s oldest rocks, about 4.4 billion years old.') },
      { id: 'meteor', x: 104, z: -4, name: L('Осколок метеорита', 'Meteorite fragment'), kg: 1.0, water: 0, pts: 25, where: L('свежий маленький кратер', 'small fresh crater'),
        fact: L('Кусочек <b>метеорита</b>, который недавно упал и выбил маленький кратер. В нём много железа — он тяжёлый и блестит.', 'A piece of a <b>meteorite</b> that fell recently and made a small crater. It’s full of iron — heavy and shiny.') }
    ];
    const SIGHTS = [
      { id: 'earth', name: L('Земля в небе', 'Earth in the sky'), sky: true,
        fact: L('Это наша <b>Земля</b>! С Луны она висит в небе почти неподвижно и выглядит в 4 раза больше, чем Луна с Земли.', 'That’s our <b>Earth</b>! From the Moon it hangs almost still in the sky and looks 4 times bigger than the Moon from Earth.') },
      { id: 'probe', x: 72, z: 44, name: L('Старый зонд', 'Old probe'),
        fact: L('Старый автоматический <b>зонд</b>, который сел здесь много лет назад. В вакууме нет ветра и дождя, поэтому он почти не изменился.', 'An old robotic <b>probe</b> that landed here many years ago. With no wind or rain in a vacuum, it has hardly changed.') },
      { id: 'tube', x: -96, z: 54, name: L('Вход в лавовую трубу', 'Lava tube entrance'),
        fact: L('Это <b>лавовая труба</b> — подземный туннель, где когда-то текла лава. Внутри безопасно от метеоритов и радиации — отличное место для базы в будущем!', 'This is a <b>lava tube</b> — an underground tunnel where lava once flowed. Inside it’s safe from meteorites and radiation — a great future base spot!') },
      { id: 'layers', x: -62, z: -64, name: L('Слои породы', 'Rock layers'),
        fact: L('Полосы на скале — <b>слои</b> от разных извержений и ударов. По ним учёные читают историю Луны, как страницы книги.', 'The stripes on the rock are <b>layers</b> from different eruptions and impacts. Scientists read the Moon’s history from them like pages of a book.') },
      { id: 'track', x: -18, z: -84, name: L('След катящегося валуна', 'Rolling boulder track'),
        fact: L('Этот <b>валун скатился</b> со склона и оставил длинную борозду. На Луне нет ветра, поэтому след сохраняется очень долго.', 'This <b>boulder rolled</b> down the slope and left a long groove. There’s no wind on the Moon, so the track lasts a very long time.') }
    ];
    const S = {
      battery: 100, got: [], photos: {}, broken: null, fixed: 0, mistakes: 0, dusty: false,
      events: { wire: false, dust: false, wheel: false }, done: false, started: false, inCraterBefore: false
    };

    /* ---------- брифинг ASTRO ---------- */
    ctx.step(0);
    ctx.astroBrief([
      [L('Привет, исследователь! Я <b>ASTRO</b>. Сегодня ты поведёшь <b>луноход</b> по Луне. Люди хотят построить здесь первую базу.', 'Hi, explorer! I’m <b>ASTRO</b>. Today you’ll drive a <b>moon rover</b> across the Moon. People want to build the first base here.'), 'wave'],
      [L('Для базы нужны <b>вода</b> и <b>солнечный свет</b>. Вода может прятаться в виде льда в <b>Тёмном кратере</b>, куда никогда не светит Солнце.', 'A base needs <b>water</b> and <b>sunlight</b>. Water may hide as ice in the <b>Dark crater</b>, where the Sun never shines.'), 'point'],
      [L('Задание: собери <b>образцы грунта</b> у голубых маяков, сфотографируй <b>интересные места</b> камерой на мачте — они отметятся на карте.', 'Your job: collect <b>soil samples</b> at the blue beacons and photograph <b>interesting places</b> with the mast camera — they’ll be marked on the map.'), 'point'],
      [touch
        ? L('<b>Управление:</b> джойстик — газ и руль. «Действие» — взять образец или сделать снимок. «Камера» — смотреть глазами лунохода.', '<b>Controls:</b> joystick — throttle and steering. “Action” — take a sample or a photo. “Camera” — look through the rover’s eyes.')
        : L('<b>Управление:</b> <span class="kbd">W</span><span class="kbd">S</span> — газ и назад, <span class="kbd">A</span><span class="kbd">D</span> — руль, <span class="kbd">E</span> — взять образец или снимок, <span class="kbd">C</span> — камера, <span class="kbd">M</span> — карта. Мышью можно крутить вид.', '<b>Controls:</b> <span class="kbd">W</span><span class="kbd">S</span> — drive and reverse, <span class="kbd">A</span><span class="kbd">D</span> — steer, <span class="kbd">E</span> — sample or photo, <span class="kbd">C</span> — camera, <span class="kbd">M</span> — map. Drag the mouse to turn the view.'), 'point'],
      [L('Осторожно: не врезайся в камни на скорости и следи за <b>батареей</b>. Луноход может сломаться — тогда будем чинить вместе!', 'Careful: don’t hit rocks at speed and watch the <b>battery</b>. The rover may break — then we’ll fix it together!'), 'alarm'],
      [L('В конце вернёмся к посадочному модулю. Капсула на Землю поднимает только <b>3 кг</b> — придётся выбрать самые ценные образцы. Поехали!', 'At the end we’ll return to the lander. The capsule to Earth lifts only <b>3 kg</b> — you’ll have to pick the most valuable samples. Let’s go!'), 'wave']
    ], L('Поехали!', 'Let’s go!'), begin);

    /* ---------- модальные окна ---------- */
    let modal = null, world = null;
    function openModal(html, onReady) {
      if (modal) modal.remove();
      modal = h(`<div class="fp-modal"><div class="panel card fp-modal-card wide">${html}</div></div>`);
      document.body.appendChild(modal);
      if (world) world.paused = true;
      onReady && onReady(modal);
      return modal;
    }
    function closeModal() { if (modal) { modal.remove(); modal = null; } if (world) world.paused = false; renderHud(); }
    ctx.onCleanup(() => { if (modal) modal.remove(); });
    const say = (t, mood) => { ctx.mc(t, mood); if (world) world.astroMood(mood); };

    /* =================================================================
       ИГРА
       ================================================================= */
    let hudEl = null;
    function begin() {
      ctx.step(1);
      ctx.stage.classList.add('wide');
      world = makeWorld();
      say(L('Луноход готов! Голубые маяки — это места для образцов. Начни с ближайшего: стрелка вверху покажет дорогу.', 'The rover is ready! Blue beacons mark sample spots. Start with the nearest one: the arrow at the top shows the way.'), 'good');
      S.started = true;
      ctx.every(250, tick);
    }
    function renderHud() {
      if (!hudEl) return;
      const b = Math.round(S.battery);
      hudEl.querySelector('.rv-bat b').textContent = b + '%';
      hudEl.querySelector('.rv-bat i i').style.width = b + '%';
      hudEl.querySelector('.rv-bat').classList.toggle('low', b < 25);
      hudEl.querySelector('.rv-smp b').textContent = `${S.got.length}/${SAMPLES.length}`;
      hudEl.querySelector('.rv-pho b').textContent = `${Object.keys(S.photos).length}/${SIGHTS.length}`;
      const br = hudEl.querySelector('.rv-broken');
      br.hidden = !S.broken;
      if (S.broken) br.querySelector('span').textContent = { wheel: L('Сломано колесо', 'Wheel broken'), dust: L('Панель в пыли', 'Dusty panel'), wire: L('Камера без связи', 'Camera offline') }[S.broken];
    }

    // каждые 0,25 с: батарея и события
    function tick() {
      if (!world || world.paused || S.done) return;
      const st = world.state();
      const drive = Math.min(1, Math.abs(st.throttle));
      let d = -(0.05 + drive * 0.5) * 0.25;
      if (st.dark) d -= 0.2 * 0.25;                               // фары в темноте
      if (!st.dark && !S.dusty) d += 0.32 * 0.25;                 // солнечная панель
      S.battery = clamp(S.battery + d, 0, 100);
      if (S.battery < 25 && !S.warnBat) { S.warnBat = true; say(L('Внимание! Батарея садится. Постой на солнце — панель подзарядит её. В тёмном кратере зарядки нет!', 'Warning! The battery is low. Stand in the sunlight — the panel will recharge it. There’s no charging in the dark crater!'), 'alarm'); }
      if (S.battery > 40) S.warnBat = false;
      if (S.battery <= 0) {
        S.done = true; world.stop();
        ctx.fail(L('Батарея лунохода разрядилась — он остановился посреди Луны.', 'The rover’s battery ran out — it stopped in the middle of the Moon.'),
                 L('Следи за зарядом: на солнце панель заряжает батарею, а в тёмном кратере и с пыльной панелью — нет. Почисти панель, если она запылилась.', 'Watch the charge: in sunlight the panel recharges the battery, but not in the dark crater or with a dusty panel. Clean the panel if it gets dusty.'));
        return;
      }
      // пыль: после первого выезда из кратера
      if (st.inCrater) S.inCraterBefore = true;
      if (!st.inCrater && S.inCraterBefore && !S.events.dust && !S.broken) breakdown('dust');
      renderHud();
    }

    /* ---------- поломки ---------- */
    function breakdown(kind) {
      if (S.events[kind] || S.broken) return;
      S.events[kind] = true; S.broken = kind;
      if (kind === 'dust') S.dusty = true;
      sfx.alarm();
      const msg = {
        wheel: L('<b>Ой! Колесо погнулось</b> об острый камень. Луноход еле ползёт. Нажми «Починить», разберёмся вместе.', '<b>Oops! A wheel got bent</b> on a sharp rock. The rover can barely crawl. Press “Repair” and we’ll sort it out together.'),
        dust: L('<b>Солнечная панель покрылась пылью</b> после кратера! Батарея больше не заряжается. Нажми «Починить».', '<b>The solar panel got covered in dust</b> after the crater! The battery no longer charges. Press “Repair”.'),
        wire: L('<b>Камера не отвечает!</b> Похоже, от тряски отошли провода. Без камеры не сфотографировать находки. Нажми «Починить».', '<b>The camera isn’t responding!</b> Looks like the shaking loosened the wires. No photos without the camera. Press “Repair”.')
      }[kind];
      say(msg, 'alarm');
      if (world) world.setBroken(kind);
      renderHud();
    }
    function fixed() {
      const kind = S.broken;
      S.broken = null; S.fixed++;
      if (kind === 'dust') S.dusty = false;
      if (world) world.setBroken(null);
      closeModal();
      sfx.win();
      say(L('Отлично! Система снова работает! Едем дальше.', 'Great job! The system is working again! Let’s keep going.'), 'good');
    }
    function repairUI() {
      if (!S.broken) return;
      if (S.broken === 'wheel') return repairWheel();
      if (S.broken === 'dust') return repairDust();
      if (S.broken === 'wire') return repairWire();
    }
    // общий шаг: выбрать правильный способ ремонта
    function choiceStep(m, q, opts, onRight) {
      const box = m.querySelector('.rp-step');
      box.innerHTML = `<h3>${q}</h3><div class="options">${shuffle(opts.slice()).map((o, i) => `<button class="opt" data-ok="${o.ok ? 1 : 0}" data-why="${encodeURIComponent(o.why)}">${o.t}</button>`).join('')}</div><div class="rp-fb"></div>`;
      box.querySelectorAll('.opt').forEach(b => b.onclick = () => {
        const fb = box.querySelector('.rp-fb');
        if (b.dataset.ok === '1') { sfx.ok(); b.classList.add('right'); fb.innerHTML = `<div class="feedback ok">${decodeURIComponent(b.dataset.why)}</div>`; ctx.after(1200, onRight); }
        else { S.mistakes++; sfx.bad(); b.classList.remove('wrong'); void b.offsetWidth; b.classList.add('wrong'); fb.innerHTML = `<div class="feedback no">${decodeURIComponent(b.dataset.why)}</div>`; }
      });
    }
    function repairShell(title, intro) {
      return openModal(`
        <div class="task-title"><span class="num"><img class="mod" src="assets/sprites/astro-point.png" alt=""></span><h2>${title}</h2></div>
        <p>${intro}</p><div class="rp-step"></div>
        <div class="actions"><button class="btn ghost" data-close>${L('Позже', 'Later')}</button></div>`, m => {
        m.querySelector('[data-close]').onclick = () => { sfx.click(); closeModal(); };
      });
    }
    // 1) колесо: способ ремонта + болты крест-накрест
    function repairWheel() {
      const m = repairShell(L('Ремонт колеса', 'Wheel repair'), L('ASTRO: «Острый камень погнул пластину-грунтозацеп на переднем колесе. Как будем чинить?»', 'ASTRO: “A sharp rock bent a tread plate on the front wheel. How shall we fix it?”'));
      choiceStep(m, L('Что сделать?', 'What should we do?'), [
        { t: L('Накачать колесо насосом', 'Pump up the wheel'), ok: false, why: L('Не получится: у лунных колёс нет воздуха — они из металла. В вакууме шина с воздухом могла бы лопнуть.', 'Won’t work: moon wheels have no air — they’re metal. In a vacuum an air tyre could burst.') },
        { t: L('Снять погнутую пластину, поставить запасную и затянуть болты', 'Remove the bent plate, fit a spare and tighten the bolts'), ok: true, why: L('Верно! Запасная пластина есть в ящике с инструментами. Теперь затяни болты.', 'Right! There’s a spare plate in the toolbox. Now tighten the bolts.') },
        { t: L('Ехать дальше как есть', 'Keep driving as it is'), ok: false, why: L('Опасно: погнутая пластина зацепится за камни, и колесо развалится совсем.', 'Dangerous: the bent plate will catch on rocks and the wheel will fall apart.') }
      ], () => {
        const box = m.querySelector('.rp-step');
        // 4 болта; затягивать крест-накрест: после каждого болта — противоположный
        const pos = [[50, 12], [88, 50], [50, 88], [12, 50]]; // верх, право, низ, лево
        box.innerHTML = `<h3>${L('Затяни 4 болта <b>крест-накрест</b>: после каждого болта — противоположный ему. Так пластина сядет ровно.', 'Tighten the 4 bolts <b>criss-cross</b>: after each bolt, the one opposite it. That way the plate sits evenly.')}</h3>
          <div class="rv-wheel">${pos.map((p, i) => `<button class="rv-bolt" data-i="${i}" style="left:${p[0]}%;top:${p[1]}%"></button>`).join('')}<span class="hub"></span></div><div class="rp-fb"></div>`;
        const done = [];
        box.querySelectorAll('.rv-bolt').forEach(b => b.onclick = () => {
          const i = +b.dataset.i;
          if (done.includes(i)) return;
          const prev = done[done.length - 1];
          const okMove = done.length % 2 === 0 || i === (prev + 2) % 4;
          const fb = box.querySelector('.rp-fb');
          if (!okMove) { S.mistakes++; sfx.bad(); fb.innerHTML = `<div class="feedback no">${L('Не так: сейчас нужен болт напротив предыдущего.', 'Not that one: you need the bolt opposite the previous one.')}</div>`; return; }
          sfx.ok(); done.push(i); b.classList.add('tight'); fb.innerHTML = '';
          if (done.length === 4) ctx.after(500, fixed);
        });
      });
    }
    // 2) пыль: инструмент + протереть панель
    function repairDust() {
      const m = repairShell(L('Чистка солнечной панели', 'Cleaning the solar panel'), L('ASTRO: «Лунная пыль острая и липкая. Чем её убрать?»', 'ASTRO: “Moon dust is sharp and sticky. What do we clean it with?”'));
      choiceStep(m, L('Выбери инструмент', 'Choose a tool'), [
        { t: L('Полить водой', 'Pour water on it'), ok: false, why: L('Нет: в вакууме вода сразу закипит и замёрзнет, а пыль превратится в грязную корку.', 'No: in a vacuum water instantly boils and freezes, and the dust turns into a dirty crust.') },
        { t: L('Мягкая щётка', 'Soft brush'), ok: true, why: L('Да! Мягкая щётка сметёт пыль и не поцарапает панель. Теперь протри её — води пальцем или мышкой.', 'Yes! A soft brush sweeps the dust off without scratching the panel. Now wipe it — drag with your finger or the mouse.') },
        { t: L('Тряпка с маслом', 'Oily rag'), ok: false, why: L('Нет: к маслу пыль прилипнет ещё сильнее.', 'No: the dust will stick to the oil even more.') }
      ], () => {
        const box = m.querySelector('.rp-step');
        box.innerHTML = `<h3>${L('Протри панель щёткой — убери почти всю пыль.', 'Brush the panel — remove almost all the dust.')}</h3><canvas class="rv-panel" width="480" height="240"></canvas><div class="rp-fb"><b class="pct">0%</b></div>`;
        const cv = box.querySelector('canvas'), g = cv.getContext('2d');
        // пыль рисуем сверху; ячейки панели нарисованы фоном в CSS
        for (let i = 0; i < 2200; i++) { g.fillStyle = ['#9b968c', '#b7b1a6', '#857f74', '#c9c3b8'][i % 4]; g.beginPath(); g.arc(Math.random() * 480, Math.random() * 240, 6 + Math.random() * 10, 0, 7); g.fill(); }
        let down = false, doneFlag = false, last = 0;
        const wipe = e => {
          const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * 480 / r.width, y = (e.clientY - r.top) * 240 / r.height;
          g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(x, y, 26, 0, 7); g.fill(); g.globalCompositeOperation = 'source-over';
          if (performance.now() - last > 200) {
            last = performance.now();
            const d = g.getImageData(0, 0, 480, 240).data; let clear = 0;
            for (let i = 3; i < d.length; i += 64) if (d[i] < 40) clear++;
            const pct = Math.round(clear / (d.length / 64) * 100);
            box.querySelector('.pct').textContent = pct + '%';
            if (pct >= 88 && !doneFlag) { doneFlag = true; sfx.ok(); ctx.after(400, fixed); }
            else if (Math.random() < 0.15) sfx.type();
          }
        };
        cv.addEventListener('pointerdown', e => { down = true; try { cv.setPointerCapture(e.pointerId); } catch (err) {} wipe(e); });
        cv.addEventListener('pointermove', e => { if (down) wipe(e); });
        cv.addEventListener('pointerup', () => { down = false; });
      });
    }
    // 3) провода камеры: соединить по цветам
    function repairWire() {
      const m = repairShell(L('Ремонт камеры', 'Camera repair'), L('ASTRO: «От тряски отошли провода камеры. Сначала обесточим её, потом соединим провода».', 'ASTRO: “The shaking loosened the camera wires. First we switch off the power, then reconnect the wires.”'));
      choiceStep(m, L('Что сделать первым делом?', 'What do we do first?'), [
        { t: L('Выключить питание камеры', 'Switch off the camera’s power'), ok: true, why: L('Правильно! С проводами работают только без тока — так безопасно и ничего не сгорит.', 'Correct! Wires are handled only with the power off — it’s safe and nothing burns out.') },
        { t: L('Сразу соединять провода под током', 'Connect the wires with the power on'), ok: false, why: L('Опасно: может проскочить искра и сгореть электроника.', 'Dangerous: a spark may jump and burn the electronics.') },
        { t: L('Постучать по камере', 'Tap the camera'), ok: false, why: L('Так провода не соединятся, а камера может разбиться.', 'That won’t connect the wires, and the camera may break.') }
      ], () => {
        const box = m.querySelector('.rp-step');
        const cols = [['#ff5468', L('красный', 'red')], ['#ffd166', L('жёлтый', 'yellow')], ['#5fa8ff', L('синий', 'blue')]];
        const L2 = shuffle(cols.slice()), R2 = shuffle(cols.slice());
        box.innerHTML = `<h3>${L('Соедини провода одинакового цвета: нажми провод слева, потом гнездо справа.', 'Connect wires of the same colour: tap a wire on the left, then a socket on the right.')}</h3>
          <div class="rv-wires"><div>${L2.map(c => `<button class="wire-end" data-c="${c[0]}" style="--c:${c[0]}">${c[1]}</button>`).join('')}</div>
          <div>${R2.map(c => `<button class="wire-sock" data-c="${c[0]}" style="--c:${c[0]}">${c[1]}</button>`).join('')}</div></div><div class="rp-fb"></div>`;
        let sel = null, ok = 0;
        box.querySelectorAll('.wire-end').forEach(b => b.onclick = () => { if (b.classList.contains('done')) return; box.querySelectorAll('.wire-end').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); sel = b; sfx.click(); });
        box.querySelectorAll('.wire-sock').forEach(b => b.onclick = () => {
          if (!sel || b.classList.contains('done')) return;
          const fb = box.querySelector('.rp-fb');
          if (sel.dataset.c === b.dataset.c) { sfx.ok(); sel.classList.add('done'); sel.classList.remove('sel'); b.classList.add('done'); sel = null; ok++; fb.innerHTML = ''; if (ok === 3) ctx.after(500, fixed); }
          else { S.mistakes++; sfx.bad(); fb.innerHTML = `<div class="feedback no">${L('Цвета не совпадают — так камера не заработает.', 'The colours don’t match — the camera won’t work like that.')}</div>`; }
        });
      });
    }

    /* ---------- образцы и снимки ---------- */
    function takeSample(sm) {
      if (S.got.includes(sm.id)) return;
      S.got.push(sm.id); sfx.ok();
      say(`${L('Образец взят', 'Sample collected')}: <b>${sm.name}</b> — ${num(sm.kg)} ${L('кг', 'kg')}, ${L('вода', 'water')} ${String(sm.water).replace('.', L(',', '.'))}%. ${sm.fact}`, 'good');
      renderHud();
      if (S.got.length === 2) ctx.after(6000, () => breakdown('wire'));
      if (S.got.length === 4 && !S.events.wheel) ctx.after(5000, () => breakdown('wheel'));
      if (S.got.length >= 4) ctx.after(9000, () => { if (!S.done && !S.broken) say(L(`Собрано образцов: ${S.got.length}. Можно возвращаться к посадочному модулю — или собрать ещё. Стрелка ведёт к модулю.`, `Samples collected: ${S.got.length}. You can head back to the lander — or collect more. The arrow points to the lander.`)); });
    }
    function takePhoto(sg) {
      if (S.photos[sg.id]) return;
      S.photos[sg.id] = true; sfx.ok();
      say(`<b>${sg.name}</b> — ${L('снимок сделан и отмечен на карте!', 'photo taken and marked on the map!')} ${sg.fact}`, 'good');
      renderHud();
    }

    /* ---------- карта ---------- */
    function mapUI() {
      openModal(`
        <div class="task-title"><span class="num"><img class="mod" src="assets/sprites/astro-point.png" alt=""></span><h2>${L('Карта района', 'Area map')}</h2></div>
        <div class="base-map"><canvas width="560" height="460"></canvas>
          <div class="place-list">
            <div class="rv-legend"><i class="l-smp"></i>${L('образец', 'sample')}</div><div class="rv-legend"><i class="l-got"></i>${L('образец собран', 'sample collected')}</div>
            <div class="rv-legend"><i class="l-pho"></i>${L('находка сфотографирована', 'discovery photographed')}</div><div class="rv-legend"><i class="l-base"></i>${L('посадочный модуль', 'lander')}</div>
            <ul class="log big">${SIGHTS.filter(s => S.photos[s.id]).map(s => `<li><b>${s.name}</b></li>`).join('') || `<li>${L('Пока нет снимков. Включи камеру и найди интересные места!', 'No photos yet. Turn on the camera and look for interesting places!')}</li>`}</ul>
          </div></div>
        <div class="actions"><button class="btn orange" data-close>${L('Закрыть', 'Close')}</button></div>`, m => {
        world.drawMap(m.querySelector('canvas'), true);
        m.querySelector('[data-close]').onclick = () => { sfx.click(); closeModal(); };
      });
    }

    /* =================================================================
       ФИНАЛ: капсула (≤ 3 кг) и место для базы
       ================================================================= */
    function capsuleUI() {
      if (S.got.length < 3) { say(L('Капсулу рано загружать: нужно хотя бы 3 образца.', 'Too early to load the capsule: you need at least 3 samples.')); return; }
      const got = SAMPLES.filter(s => S.got.includes(s.id));
      const sel = {};
      openModal(`
        <div class="task-title"><span class="num"><img class="mod" src="assets/sprites/astro-point.png" alt=""></span><h2>${L('Капсула на Землю', 'Capsule to Earth')}</h2></div>
        <p>${L('Капсула поднимет <b>не больше 3 кг</b>. Наша цель — <b>вода для будущей базы</b>, но учёным важны и другие находки. Отметь образцы и следи за весом.', 'The capsule lifts <b>no more than 3 kg</b>. Our goal is <b>water for a future base</b>, but scientists value other finds too. Tick the samples and watch the weight.')}</p>
        <div class="crop-list">${got.map(s => `<label class="crop"><input type="checkbox" data-id="${s.id}"><span class="c-name">${s.name}</span><span class="c-need">${num(s.kg)} ${L('кг', 'kg')}</span><span class="c-hp">${L('вода', 'water')} ${String(s.water).replace('.', L(',', '.'))}% · ${'★'.repeat(Math.round(s.pts / 10))}</span></label>`).join('')}</div>
        <div class="calc"><span>${L('Вес в капсуле:', 'Capsule weight:')}</span><b class="cap-w">0 ${L('кг', 'kg')}</b><span>/ ${CAP_KG} ${L('кг', 'kg')}</span></div>
        <div class="calc-fb"></div>
        <div class="actions"><button class="btn ghost" data-close>${L('Ещё поисследовать', 'Explore more')}</button><button class="btn orange big" data-go disabled>${L('Отправить капсулу', 'Launch the capsule')}</button></div>`, m => {
        m.querySelector('[data-close]').onclick = () => { sfx.click(); closeModal(); };
        const upd = () => {
          const w = got.filter(s => sel[s.id]).reduce((a, s) => a + s.kg, 0);
          m.querySelector('.cap-w').textContent = `${num(w)} ${L('кг', 'kg')}`;
          const over = w > CAP_KG + 1e-6;
          m.querySelector('.cap-w').style.color = over ? 'var(--bad)' : '';
          m.querySelector('.calc-fb').innerHTML = over ? `<div class="feedback no">${L(`Перегруз на ${num(w - CAP_KG)} кг — капсула не взлетит! Убери что-нибудь.`, `Overloaded by ${num(w - CAP_KG)} kg — the capsule won’t lift off! Remove something.`)}</div>` : '';
          m.querySelector('[data-go]').disabled = over || w === 0;
        };
        m.querySelectorAll('[data-id]').forEach(cb => cb.onchange = () => { sel[cb.dataset.id] = cb.checked; sfx.click(); upd(); });
        m.querySelector('[data-go]').onclick = () => { sfx.ok(); ctx.step(2, true); baseSiteUI(got.filter(s => sel[s.id]), got); };
      });
    }
    function bestPoints(got) {
      let best = 0;
      for (let mask = 1; mask < 1 << got.length; mask++) {
        let w = 0, p = 0; got.forEach((s, i) => { if (mask & (1 << i)) { w += s.kg; p += s.pts; } });
        if (w <= CAP_KG + 1e-6 && p > best) best = p;
      }
      return best;
    }
    function baseSiteUI(chosen, got) {
      const opts = shuffle([
        { id: 'rim', t: L('На освещённом краю Тёмного кратера', 'On the sunlit rim of the Dark crater'), ok: true, why: L('Лучший выбор: Солнце даёт энергию, а лёд совсем рядом — на дне кратера.', 'Best choice: the Sun gives energy, and the ice is right next door — at the bottom of the crater.') },
        { id: 'inside', t: L('На дне Тёмного кратера, прямо у льда', 'At the bottom of the Dark crater, right by the ice'), ok: false, why: L('Там всегда темно и −230 °C: солнечные панели не будут работать.', 'It’s always dark and −230 °C there: solar panels won’t work.') },
        { id: 'plain', t: L('На ровной равнине у посадочного модуля', 'On the flat plain by the lander'), ok: false, why: L('Солнца много, но лёд далеко — воду придётся долго возить.', 'Plenty of sunshine, but the ice is far away — water would have to be hauled a long way.') }
      ]);
      openModal(`
        <div class="task-title"><span class="num"><img class="mod" src="assets/sprites/astro-wave.png" alt=""></span><h2>${L('Где построить базу?', 'Where to build the base?')}</h2></div>
        <p>${L('Последний вопрос от учёных: где лучше построить будущую лунную базу? Вспомни: нужны <b>вода</b> и <b>солнечный свет</b>.', 'One last question from the scientists: where should the future lunar base go? Remember: it needs <b>water</b> and <b>sunlight</b>.')}</p>
        <div class="options">${opts.map(o => `<button class="opt" data-id="${o.id}">${o.t}</button>`).join('')}</div><div class="calc-fb"></div>`, m => {
        let tries = 0;
        m.querySelectorAll('.opt').forEach(b => b.onclick = () => {
          const o = opts.find(x => x.id === b.dataset.id), fb = m.querySelector('.calc-fb');
          if (o.ok) { sfx.ok(); b.classList.add('right'); fb.innerHTML = `<div class="feedback ok">${o.why}</div>`; ctx.after(1600, () => finish(chosen, got, tries === 0)); }
          else { tries++; S.mistakes++; sfx.bad(); b.classList.add('wrong'); fb.innerHTML = `<div class="feedback no">${o.why}</div>`; }
        });
      });
    }
    function finish(chosen, got, siteFirst) {
      S.done = true; closeModal(); world.stop();
      const pts = chosen.reduce((a, s) => a + s.pts, 0), best = bestPoints(got), kg = chosen.reduce((a, s) => a + s.kg, 0);
      const hasIce = chosen.some(s => s.id === 'ice'), photos = Object.keys(S.photos).length;
      let score = 3; const notes = [];
      notes.push({ ok: hasIce, text: hasIce ? L('В капсуле есть лёд — учёные подтвердят воду для базы!', 'The capsule has ice — scientists will confirm water for the base!') : L('Льда в капсуле нет — главная цель не выполнена. Ищи его на дне Тёмного кратера.', 'No ice in the capsule — the main goal isn’t met. Look for it at the bottom of the Dark crater.') });
      if (!hasIce) score--;
      notes.push({ ok: pts >= best - 5, text: L(`Ценность груза: ${pts} из ${best} возможных при весе ${num(kg)} кг.`, `Cargo value: ${pts} of ${best} possible at ${num(kg)} kg.`) });
      if (pts < best - 10) score--;
      notes.push({ ok: photos >= 3, text: L(`Находок на карте: ${photos} из ${SIGHTS.length}.`, `Discoveries on the map: ${photos} of ${SIGHTS.length}.`) });
      if (photos < 2) score--;
      notes.push({ ok: S.mistakes <= 2, text: L(`Поломок починено: ${S.fixed}. Ошибок при ремонте и выборе: ${S.mistakes}.`, `Breakdowns fixed: ${S.fixed}. Mistakes in repairs and choices: ${S.mistakes}.`) });
      if (S.mistakes > 4) score--;
      if (!siteFirst) notes.push({ ok: false, text: L('Место для базы выбрано не с первого раза.', 'The base site wasn’t chosen on the first try.') });
      ctx.finish(score, notes);
    }

    /* =================================================================
       3D-МИР: Луна, кратеры и луноход, камера от третьего лица
       ================================================================= */
    function makeWorld() {
      const self = { paused: false, stop, state: () => ({ throttle: 0, dark: false, inCrater: false }), setBroken() {}, astroMood() {}, drawMap() {} };
      let running = true, renderer = null, onResize = null;
      const el = h(`
        <div class="fp rv ${touch ? 'is-touch' : ''}">
          <div class="fp-view">
            <div class="fp-canvas"></div>
            <div class="fp-loading screen"><b>${L('Загружаю Луну…', 'Loading the Moon…')}</b><i class="bar"><i></i></i></div>
            <div class="fp-compass"><span class="arrow">▲</span><span class="dist"></span></div>
            <canvas class="fp-map" width="120" height="120"></canvas>
            <div class="rv-hud">
              <div class="rv-bat"><span>${L('Батарея', 'Battery')}</span><b></b><i class="bar"><i></i></i></div>
              <div class="rv-smp"><span>${L('Образцы', 'Samples')}</span><b></b></div>
              <div class="rv-pho"><span>${L('Находки', 'Finds')}</span><b></b></div>
              <button class="btn small orange rv-broken" hidden><span></span> · ${L('Починить', 'Repair')}</button>
            </div>
            <div class="rv-cam-ui" hidden><div class="rv-reticle"></div><span class="rv-cam-label">${L('КАМЕРА', 'CAMERA')}</span></div>
            <div class="rv-flash"></div>
            <div class="fp-prompt" hidden></div>
          </div>
          ${touch ? `<div class="pad panel flat">
            <div class="joy"><div class="joy-base"><div class="joy-knob"></div></div></div>
            <div class="rv-btns"><button class="btn orange big fp-act">${L('Действие', 'Action')}</button>
              <button class="btn ghost rv-cam-btn">${L('Камера', 'Camera')}</button><button class="btn ghost rv-map-btn">${L('Карта', 'Map')}</button></div>
          </div>` : `<div class="fp-bar panel flat"><div class="hint-keys"><span class="kbd">W A S D</span> ${L('ехать', 'drive')} · <span class="kbd">E</span> ${L('образец / снимок', 'sample / photo')} · <span class="kbd">C</span> ${L('камера', 'camera')} · <span class="kbd">M</span> ${L('карта', 'map')} · ${L('мышь — повернуть вид', 'mouse — turn view')}</div>
            <button class="btn small ghost rv-cam-btn">${L('Камера', 'Camera')}</button><button class="btn small ghost rv-map-btn">${L('Карта', 'Map')}</button></div>`}
        </div>`);
      ctx.stage.appendChild(el);
      hudEl = el.querySelector('.rv-hud');
      hudEl.querySelector('.rv-broken').onclick = () => { sfx.click(); repairUI(); };
      el.querySelectorAll('.rv-map-btn').forEach(b => b.onclick = () => { sfx.click(); mapUI(); });
      renderHud();
      const holder = el.querySelector('.fp-canvas'), loadingEl = el.querySelector('.fp-loading');
      const mapCv = el.querySelector('.fp-map'), mg = mapCv.getContext('2d');
      const promptEl = el.querySelector('.fp-prompt');
      const arrowEl = el.querySelector('.fp-compass .arrow'), distEl = el.querySelector('.fp-compass .dist');
      const camUi = el.querySelector('.rv-cam-ui'), flashEl = el.querySelector('.rv-flash');

      function stop() {
        running = false;
        if (onResize) window.removeEventListener('resize', onResize);
        if (renderer) { renderer.dispose(); renderer.forceContextLoss(); renderer = null; }
      }
      ctx.onCleanup(stop);
      import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js')
        .then(THREE => { if (running) init(THREE); })
        .catch(() => { loadingEl.innerHTML = `<b>${L('Не получилось загрузить 3D-движок.', 'Couldn’t load the 3D engine.')}</b>`; });

      function init(THREE) {
        const clamp01 = v => Math.max(0, Math.min(1, v));
        let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
        const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

        /* ---------- рендер ---------- */
        renderer = new THREE.WebGLRenderer({ antialias: !touch, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, touch ? 1.25 : 1.75));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        holder.appendChild(renderer.domElement);
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0d0c2a);
        const camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.05, 900);
        scene.add(camera);
        onResize = () => { const w = holder.clientWidth || 640, hh = Math.round(w * 9 / 16); renderer.setSize(w, hh, false); camera.aspect = w / hh; camera.updateProjectionMatrix(); };
        window.addEventListener('resize', onResize); onResize();
        const canvasTex = (w, hh, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = hh; draw(c.getContext('2d'), w, hh); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };

        /* ---------- мультяшный стиль ---------- */
        const grad = new THREE.DataTexture(new Uint8Array([95, 175, 255]), 3, 1, THREE.RedFormat);
        grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
        const toon = (color, extra = {}) => new THREE.MeshToonMaterial(Object.assign({ color, gradientMap: grad }, extra));
        const oc = {};
        const outlineMat = th => { if (oc[th]) return oc[th]; const m = new THREE.MeshBasicMaterial({ color: 0x1d1c4a, side: THREE.BackSide }); m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `vec3 transformed = position + normal * ${th.toFixed(3)};`); }; m.customProgramCacheKey = () => 'o' + th; return (oc[th] = m); };
        function add(mesh, parent = scene, th = 0.04, cast = true) { parent.add(mesh); mesh.castShadow = cast; if (th) mesh.add(new THREE.Mesh(mesh.geometry, outlineMat(th))); return mesh; }
        const roundRect = (w, hh, r) => { const s = new THREE.Shape(), x = -w / 2, y = -hh / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + hh - r); s.quadraticCurveTo(x + w, y + hh, x + w - r, y + hh); s.lineTo(x + r, y + hh); s.quadraticCurveTo(x, y + hh, x, y + hh - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; };
        const plate = (w, hh, r, d, bev) => { const g = new THREE.ExtrudeGeometry(roundRect(w, hh, r), { depth: d, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 8 }); g.translate(0, 0, -d / 2); return g; };

        /* ---------- свет, небо, звёзды, Земля ---------- */
        const hemi = new THREE.HemisphereLight(0xdcd8ff, 0x4a4566, 1.15); scene.add(hemi);
        const sun = new THREE.DirectionalLight(0xfff6e8, 2.6);
        sun.position.set(-60, 45, 40); sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 220 });
        sun.shadow.bias = -0.0008;
        scene.add(sun); scene.add(sun.target);
        {
          const pts = []; for (let i = 0; i < 1600; i++) { const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, r = 600; const s = Math.sqrt(1 - u * u); pts.push(Math.cos(a) * s * r, Math.abs(u) * r * 0.9 + 20, Math.sin(a) * s * r); }
          const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
          scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false })));
        }
        const earthTex = canvasTex(256, 256, (g) => {
          const gr = g.createRadialGradient(110, 100, 10, 128, 128, 120); gr.addColorStop(0, '#7cc8ff'); gr.addColorStop(1, '#2a6fd6');
          g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 118, 0, 7); g.fill();
          g.fillStyle = '#5fcf6a'; [[95, 100, 34, 22, 0.5], [160, 150, 28, 40, -0.3], [150, 70, 20, 12, 0.2]].forEach(([x, y, a, b, r]) => { g.beginPath(); g.ellipse(x, y, a, b, r, 0, 7); g.fill(); });
          g.fillStyle = 'rgba(255,255,255,0.75)'; [[120, 60, 40, 8], [80, 160, 30, 7], [170, 110, 26, 6]].forEach(([x, y, a, b]) => { g.beginPath(); g.ellipse(x, y, a, b, 0.2, 0, 7); g.fill(); });
          g.fillStyle = 'rgba(10,10,40,0.55)'; g.beginPath(); g.arc(128, 128, 118, -0.6, 1.9); g.arc(70, 160, 130, 1.55, -0.25, true); g.fill();
        });
        const EARTH_DIR = V3(0.35, 0.42, -0.84).normalize();
        const earth = new THREE.Sprite(new THREE.SpriteMaterial({ map: earthTex, fog: false, depthWrite: false }));
        earth.scale.set(70, 70, 1); scene.add(earth);
        const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, g => { const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,240,1)'); gr.addColorStop(0.25, 'rgba(255,240,200,0.8)'); gr.addColorStop(1, 'rgba(255,220,160,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }), depthWrite: false, transparent: true }));
        sunGlow.scale.set(90, 90, 1); scene.add(sunGlow);

        /* ---------- рельеф: кратеры ---------- */
        const CRATERS = [
          { id: 'small', name: L('Кратер Малыш', 'Little crater'), x: 45, z: -36, r: 13, d: 3.5 },
          { id: 'bright', name: L('Кратер Сияние', 'Shining crater'), x: -60, z: -42, r: 20, d: 5, peak: 3.5 },
          { id: 'dark', name: L('Тёмный кратер', 'Dark crater'), x: 22, z: -114, r: 26, d: 8.5, dark: true },
          { id: 'fresh', name: L('Свежий кратер', 'Fresh crater'), x: 104, z: -4, r: 7, d: 2.2 }
        ];
        for (let i = 0; i < 34; i++) {
          const x = (rnd() - 0.5) * 300, z = (rnd() - 0.5) * 300;
          if (Math.hypot(x, z - 22) < 18 || CRATERS.some(c => Math.hypot(x - c.x, z - c.z) < c.r + 8)) continue;
          const r = 2 + rnd() * 6; CRATERS.push({ x, z, r, d: r * 0.25, deco: true });
        }
        const LIMIT = 145;
        function groundH(x, z) {
          let y = 1.2 * Math.sin(x * 0.031 + 1.1) * Math.cos(z * 0.027) + 0.6 * Math.sin((x + z) * 0.07) + 0.25 * Math.sin(x * 0.21) * Math.sin(z * 0.19);
          const rr = Math.hypot(x, z); y += Math.max(0, rr - 120) * 0.35; // горы по краю карты
          for (const c of CRATERS) {
            const t = Math.hypot(x - c.x, z - c.z) / c.r;
            if (t > 1.7) continue;
            if (t < 1) y -= c.d * (1 - t * t);
            y += c.d * 0.35 * Math.exp(-(((t - 1) / 0.22) ** 2));
            if (c.peak) y += c.peak * Math.exp(-((t / 0.2) ** 2));
          }
          return y;
        }
        const craterAt = (x, z) => CRATERS.find(c => !c.deco && Math.hypot(x - c.x, z - c.z) < c.r * 0.85);
        const SIZE = 320, SEG = 220;
        const gGeo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG); gGeo.rotateX(-Math.PI / 2);
        const gp = gGeo.attributes.position, cols = [];
        const cBase = new THREE.Color(0xc9c5d8), cDark = new THREE.Color(0x8e8aa6), cRim = new THREE.Color(0xe6e2f2), cShadow = new THREE.Color(0x3a3a5e), tmp = new THREE.Color();
        for (let i = 0; i < gp.count; i++) {
          const x = gp.getX(i), z = gp.getZ(i), y = groundH(x, z); gp.setY(i, y);
          tmp.copy(cBase);
          // тёмные «моря» и светлые возвышенности
          const mare = 0.5 + 0.5 * Math.sin(x * 0.018 + 0.7) * Math.sin(z * 0.022 - 0.4);
          tmp.lerp(cDark, clamp01(mare - 0.35) * 0.9);
          for (const c of CRATERS) {
            const t = Math.hypot(x - c.x, z - c.z) / c.r;
            if (t < 1.25 && t > 0.85) tmp.lerp(cRim, 0.45 * (1 - Math.abs(t - 1.05) / 0.2));
            if (t < 0.9 && c.dark) tmp.lerp(cShadow, 0.85);
            else if (t < 0.85) tmp.lerp(cDark, 0.25);
          }
          tmp.offsetHSL(0, 0, (Math.sin(x * 1.3) * Math.sin(z * 1.7)) * 0.02);
          cols.push(tmp.r, tmp.g, tmp.b);
        }
        gGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
        gGeo.computeVertexNormals();
        // зернистая текстура реголита: мелкие камешки, ямки и пятна
        const regTex = canvasTex(256, 256, g => {
          g.fillStyle = '#e9e7f2'; g.fillRect(0, 0, 256, 256);
          for (let i = 0; i < 2600; i++) { const v = 200 + Math.floor(Math.random() * 55); g.fillStyle = `rgba(${v - 20},${v - 22},${v},0.55)`; g.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1 + Math.random() * 2); }
          for (let i = 0; i < 60; i++) { const x = Math.random() * 256, y = Math.random() * 256, r = 2 + Math.random() * 6; g.strokeStyle = 'rgba(120,116,150,0.35)'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, r, 0.6, 3.6); g.stroke(); g.strokeStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(x, y, r, 3.8, 6.6); g.stroke(); }
        });
        regTex.wrapS = regTex.wrapT = THREE.RepeatWrapping; regTex.repeat.set(55, 55); regTex.anisotropy = 4;
        const ground = new THREE.Mesh(gGeo, toon(0xffffff, { vertexColors: true, map: regTex })); ground.receiveShadow = true; scene.add(ground);
        // искорки льда на дне Тёмного кратера
        {
          const dc = CRATERS.find(c => c.dark), pts = [];
          for (let i = 0; i < 220; i++) { const a = rnd() * Math.PI * 2, r = rnd() * dc.r * 0.75, x = dc.x + Math.cos(a) * r, z = dc.z + Math.sin(a) * r; pts.push(x, groundH(x, z) + 0.06, z); }
          const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
          self.iceSparks = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x9ff7ff, size: 0.12, transparent: true, opacity: 0.9 })); scene.add(self.iceSparks);
        }

        /* ---------- камни ---------- */
        const obstacles = [];
        const rockGeo = (() => { const g = new THREE.IcosahedronGeometry(1, 2), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + (Math.sin(x * 3.1 + y * 2) * Math.cos(z * 2.7) * 0.18 + Math.sin((x - z) * 5) * 0.06); p.setXYZ(i, x * k, y * k * 0.8, z * k); } g.computeVertexNormals(); return g; })();
        const rockMats = [toon(0xa9a5bd), toon(0x8f8ba6), toon(0xbdb9cf)];
        for (let i = 0; i < 150; i++) {
          const x = (rnd() - 0.5) * 280, z = (rnd() - 0.5) * 280;
          if (Math.hypot(x, z - 22) < 10) continue;
          if (SAMPLES.some(s => Math.hypot(x - s.x, z - s.z) < 5)) continue;
          const big = rnd() < 0.25, s = big ? 1.1 + rnd() * 1.6 : 0.35 + rnd() * 0.5;
          const m = new THREE.Mesh(rockGeo, rockMats[i % 3]);
          m.scale.set(s * (0.8 + rnd() * 0.5), s * (0.6 + rnd() * 0.5), s); m.rotation.y = rnd() * 6;
          m.position.set(x, groundH(x, z) + s * 0.25, z); add(m, scene, big ? 0.04 : 0.02, big); m.receiveShadow = true;
          if (big) obstacles.push({ x, z, r: s * 1.05, rock: true });
        }

        /* ---------- посадочный модуль (база) ---------- */
        const BASE = { x: 0, z: 22 };
        const gold = toon(0xd9a441), white = toon(0xf4f3fb), steel = toon(0x8f8ba6), dark = toon(0x2e2c58), orange = toon(0xff8a2a), cyanM = toon(0x3fd6ea);
        {
          const g = new THREE.Group(); g.position.set(BASE.x, groundH(BASE.x, BASE.z), BASE.z); scene.add(g);
          const body = add(new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 1.6, 8), gold), g, 0.05); body.position.y = 1.9;
          const top = add(new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 1.4, 8), white), g, 0.05); top.position.y = 3.4;
          const win = add(new THREE.Mesh(new THREE.CircleGeometry(0.35, 20), cyanM), g, 0); win.position.set(0, 3.5, 1.27);
          for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; const leg = add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.4, 8), steel), g, 0.02); leg.position.set(Math.cos(a) * 1.9, 0.9, Math.sin(a) * 1.9); leg.rotation.set(Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45); const foot = add(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.1, 14), steel), g, 0.02); foot.position.set(Math.cos(a) * 2.4, 0.05, Math.sin(a) * 2.4); }
          const capsule = add(new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.4, 16), orange), g, 0.04); capsule.position.y = 4.8;
          const dish = add(new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 8, 0, Math.PI * 2, 0, 1.2), white.clone()), g, 0.03); dish.material.side = THREE.DoubleSide; dish.position.set(1.4, 4.4, 0); dish.rotation.z = -0.8;
          const ladder = add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.8, 0.06), steel), g, 0.02); ladder.position.set(0, 0.9, 1.85); ladder.rotation.x = -0.3;
          obstacles.push({ x: BASE.x, z: BASE.z, r: 2.6 });
        }

        /* ---------- интересные места ---------- */
        const qTex = canvasTex(128, 128, g => { g.fillStyle = '#ffb547'; g.strokeStyle = '#1d1c4a'; g.lineWidth = 10; g.beginPath(); g.arc(64, 60, 46, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#1d1c4a'; g.font = '900 70px Nunito, sans-serif'; g.textAlign = 'center'; g.fillText('?', 64, 84); });
        const sightMarks = {};
        SIGHTS.forEach(sg => {
          if (sg.sky) return;
          const y0 = groundH(sg.x, sg.z), g = new THREE.Group(); g.position.set(sg.x, y0, sg.z); scene.add(g);
          if (sg.id === 'probe') {
            add(new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 0.7, 6), gold), g, 0.04).position.y = 1.0;
            add(new THREE.Mesh(new THREE.SphereGeometry(0.45, 14, 10), steel), g, 0.03).position.y = 1.6;
            [0, 2.1, 4.2].forEach(a => { const l = add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.3, 6), steel), g, 0.02); l.position.set(Math.cos(a) * 0.8, 0.5, Math.sin(a) * 0.8); l.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); });
            const p = add(new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 0.8), toon(0x3550d8)), g, 0.02); p.position.set(1.2, 1.1, 0); p.rotation.z = -0.5;
            g.rotation.z = 0.12; obstacles.push({ x: sg.x, z: sg.z, r: 1.6 });
          } else if (sg.id === 'tube') {
            const hole = new THREE.Mesh(new THREE.CircleGeometry(4, 40), new THREE.MeshBasicMaterial({ color: 0x05040f })); hole.rotation.x = -Math.PI / 2; hole.position.y = 0.08; g.add(hole);
            for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, s = 0.6 + rnd() * 0.8; const r = add(new THREE.Mesh(rockGeo, rockMats[i % 3]), g, 0.03); r.scale.set(s, s * 0.7, s); r.position.set(Math.cos(a) * 4.6, s * 0.2, Math.sin(a) * 4.6); }
            obstacles.push({ x: sg.x, z: sg.z, r: 4.8 });
          } else if (sg.id === 'layers') {
            const lt = canvasTex(256, 256, gg => { const c = ['#cfcade', '#9e99b6', '#e2deef', '#8a85a3', '#bdb8cf', '#a6a1bd']; for (let i = 0; i < 12; i++) { gg.fillStyle = c[i % 6]; gg.fillRect(0, i * 22 + Math.sin(i) * 4, 256, 24); } });
            const rock = add(new THREE.Mesh(new THREE.BoxGeometry(7, 3.6, 2.4, 6, 4, 2), toon(0xffffff, { map: lt })), g, 0.05); rock.position.y = 1.4; rock.rotation.set(0.1, 0.4, 0.05);
            obstacles.push({ x: sg.x, z: sg.z, r: 3.6 });
          } else if (sg.id === 'track') {
            const b = add(new THREE.Mesh(rockGeo, rockMats[1]), g, 0.05); b.scale.setScalar(1.8); b.position.y = 1.1; obstacles.push({ x: sg.x, z: sg.z, r: 2 });
            for (let k = 1; k < 26; k++) { const x = sg.x - k * 1.2, z = sg.z - k * 0.9; const d = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.5), toon(0x6f6b8a)); d.position.set(x - sg.x, groundH(x, z) - y0 + 0.04, z - sg.z); d.rotation.y = Math.atan2(1.2, 0.9); g.add(d); }
          }
          const q = new THREE.Sprite(new THREE.SpriteMaterial({ map: qTex, depthTest: false, transparent: true })); q.scale.set(1.6, 1.6, 1); q.position.y = 5.5; q.renderOrder = 9; g.add(q);
          sightMarks[sg.id] = q; sg.pos = V3(sg.x, y0 + 1.5, sg.z);
        });

        /* ---------- маяки образцов ---------- */
        const beacons = {};
        SAMPLES.forEach(sm => {
          const y0 = groundH(sm.x, sm.z), g = new THREE.Group(); g.position.set(sm.x, y0, sm.z); scene.add(g);
          const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 14, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0x5fe8ff, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })); beam.position.y = 7; g.add(beam);
          const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.07, 8, 36), new THREE.MeshBasicMaterial({ color: 0x5fe8ff })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.15; g.add(ring);
          const stone = add(new THREE.Mesh(rockGeo, toon(sm.id === 'ice' ? 0xbff6ff : sm.id === 'glass' ? 0xffa64a : sm.id === 'meteor' ? 0x6d6a7e : sm.id === 'anorth' ? 0xf1eef8 : 0x7a7690)), g, 0.02); stone.scale.setScalar(0.35); stone.position.y = 0.2;
          beacons[sm.id] = { g, ring, beam };
        });

        /* ---------- ЛУНОХОД ---------- */
        const rover = new THREE.Group(); scene.add(rover);
        const body = new THREE.Group(); rover.add(body);
        // корпус: скруглённая коробка в золотой плёнке, белые панели сверху
        add(new THREE.Mesh(plate(1.5, 0.55, 0.12, 2.1, 0.06), gold), body, 0.035).position.y = 0.95;
        const deck = add(new THREE.Mesh(plate(1.56, 2.16, 0.1, 0.08, 0.03), white), body, 0.03); deck.rotation.x = -Math.PI / 2; deck.position.y = 1.27;
        // складки золотой плёнки — тонкие полосы
        for (let k = 0; k < 5; k++) [-1, 1].forEach(sd => { const f = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.4, 0.3), toon(0xbf8a2e)); f.position.set(sd * 0.79, 0.95, -0.8 + k * 0.4); body.add(f); });
        // солнечная панель с ячейками
        const cellTex = canvasTex(256, 256, g => { g.fillStyle = '#2a55e0'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#a8e6ff'; g.lineWidth = 4; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, 256); g.stroke(); g.beginPath(); g.moveTo(0, i * 32); g.lineTo(256, i * 32); g.stroke(); } g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(120, 0); g.lineTo(0, 120); g.fill(); });
        const panelG = new THREE.Group(); panelG.position.set(0, 1.42, -0.2); body.add(panelG);
        add(new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 1.3), steel), panelG, 0.02);
        const cells = new THREE.Mesh(new THREE.PlaneGeometry(1.34, 1.24), toon(0xffffff, { map: cellTex })); cells.rotation.x = -Math.PI / 2; cells.position.y = 0.03; panelG.add(cells);
        const dustM = new THREE.Mesh(new THREE.PlaneGeometry(1.34, 1.24), new THREE.MeshBasicMaterial({ map: canvasTex(128, 128, g => { for (let i = 0; i < 500; i++) { g.fillStyle = ['#9b968c', '#b7b1a6', '#857f74'][i % 3]; g.beginPath(); g.arc(Math.random() * 128, Math.random() * 128, 3 + Math.random() * 5, 0, 7); g.fill(); } }), transparent: true }));
        dustM.rotation.x = -Math.PI / 2; dustM.position.y = 0.04; dustM.visible = false; panelG.add(dustM);
        // крылья панели
        [-1, 1].forEach(sd => { const w = new THREE.Group(); w.position.set(sd * 0.72, 0, 0); w.rotation.z = sd * 0.15; panelG.add(w); add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 1.3), steel), w, 0.015).position.x = sd * 0.35; const c2 = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 1.24), toon(0xffffff, { map: cellTex })); c2.rotation.x = -Math.PI / 2; c2.position.set(sd * 0.35, 0.025, 0); w.add(c2); });
        // мачта с «головой»-камерой (два объектива — как глаза)
        const mast = add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.3, 10), steel), body, 0.02); mast.position.set(0, 1.95, 0.75);
        const headG = new THREE.Group(); headG.position.set(0, 2.65, 0.78); body.add(headG);
        add(new THREE.Mesh(plate(0.6, 0.28, 0.07, 0.3, 0.03), white), headG, 0.02);
        const lensMat = new THREE.MeshBasicMaterial({ color: 0x46d4ff });
        [-0.15, 0.15].forEach(x => { const r = add(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 18), dark), headG, 0.01); r.rotation.x = Math.PI / 2; r.position.set(x, 0, 0.18); const l = new THREE.Mesh(new THREE.CircleGeometry(0.065, 18), lensMat); l.position.set(x, 0, 0.225); headG.add(l); });
        const camLed = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0x7ee0a0 })); camLed.position.set(0.24, 0.1, 0.16); headG.add(camLed);
        // антенна-тарелка
        const antG = new THREE.Group(); antG.position.set(-0.5, 1.5, -0.85); body.add(antG);
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8), steel), antG, 0.01).position.y = 0.3;
        const dsh = add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 10, 0, Math.PI * 2, 0, 1.1), white.clone()), antG, 0.015); dsh.material.side = THREE.DoubleSide; dsh.position.y = 0.65; dsh.rotation.x = 2.3;
        // манипулятор с ковшом (впереди, сложен)
        const armG = new THREE.Group(); armG.position.set(0.45, 0.85, 1.12); body.add(armG);
        const a1 = add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.7, 8), white), armG, 0.012); a1.rotation.x = Math.PI / 2 - 0.4; a1.position.set(0, 0.12, 0.28);
        const elbowArm = new THREE.Group(); elbowArm.position.set(0, 0.26, 0.6); armG.add(elbowArm);
        add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), steel), elbowArm, 0.01);
        const a2 = add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.55, 8), white), elbowArm, 0.012); a2.position.set(0, -0.25, 0.05);
        const scoop = add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8, 0, Math.PI * 2, 0, 1.5), orange), elbowArm, 0.01); scoop.position.set(0, -0.55, 0.1); scoop.rotation.x = Math.PI;
        // фары
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
        [-0.5, 0.5].forEach(x => { const f = add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.06), dark), body, 0.01); f.position.set(x, 1.05, 1.08); const l = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.08), lightMat); l.position.set(x, 1.05, 1.115); body.add(l); });
        const spots = [-0.5, 0.5].map(x => { const s = new THREE.SpotLight(0xfff2cc, 0, 40, 0.5, 0.5, 1.2); s.position.set(x, 1.05, 1.1); s.target.position.set(x, 0, 8); body.add(s); body.add(s.target); return s; });
        // ящик для образцов сзади с огоньками
        const drawer = add(new THREE.Mesh(plate(1.1, 0.35, 0.05, 0.3, 0.02), white), body, 0.015); drawer.position.set(0, 0.85, -1.18);
        const slotLeds = SAMPLES.map((s, i) => { const l = new THREE.Mesh(new THREE.CircleGeometry(0.045, 12), new THREE.MeshBasicMaterial({ color: 0x3b3770 })); l.position.set(-0.4 + i * 0.16, 0.85, -1.345); l.rotation.y = Math.PI; body.add(l); return l; });
        // подвеска «рокер-боги» и 6 колёс с грунтозацепами
        const wheels = [];
        const tread = new THREE.BoxGeometry(0.06, 0.05, 0.3);
        const mkWheel = () => {
          const w = new THREE.Group();
          const rim = add(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.28, 24, 1, true), toon(0xc9c6d6, { side: THREE.DoubleSide })), w, 0.015); rim.rotation.z = Math.PI / 2;
          [-1, 1].forEach(s => { const disc = add(new THREE.Mesh(new THREE.CircleGeometry(0.32, 24), steel), w, 0); disc.position.x = s * 0.14; disc.rotation.y = s * Math.PI / 2; });
          for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; const tr = new THREE.Mesh(tread, dark); tr.position.set(0, Math.cos(a) * 0.335, Math.sin(a) * 0.335); tr.rotation.x = a; tr.rotation.y = Math.PI / 2; w.add(tr); }
          const hub = add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.34, 12), orange), w, 0.01); hub.rotation.z = Math.PI / 2;
          return w;
        };
        [-1, 1].forEach(sd => {
          const rocker = add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8), white), body, 0.012); rocker.rotation.x = Math.PI / 2 - 0.25; rocker.position.set(sd * 0.95, 0.62, 0.35);
          const bogie = add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.1, 8), white), body, 0.012); bogie.rotation.x = Math.PI / 2 + 0.2; bogie.position.set(sd * 0.95, 0.5, -0.65);
          const piv = add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), steel), body, 0.01); piv.position.set(sd * 0.85, 0.8, 0.0);
          [0.95, 0.0, -0.95].forEach(z => { const w = mkWheel(); w.rotation.order = 'YXZ'; w.position.set(sd * 1.05, 0.32, z); body.add(w); wheels.push(w); });
        });
        // ASTRO едет на луноходе
        let am = null;
        if (window.AstroModel) {
          am = window.AstroModel.build(THREE, { toon, add: (m, p, th) => add(m, p, th ? th * 0.6 : 0, true) });
          am.root.scale.setScalar(0.42); am.root.position.set(-0.42, 1.31, 0.78); am.root.rotation.y = 0.35; body.add(am.root);
        }
        let astroMood = 'idle', moodT = 0;
        self.astroMood = mood => { astroMood = mood === 'alarm' || mood === 'bad' ? 'alarm' : mood === 'good' ? 'wave' : 'point'; moodT = 6; };
        rover.scale.setScalar(1.15);
        const R = { x: BASE.x + 5, z: BASE.z - 12, yaw: 0, speed: 0, steer: 0, throttle: 0, wheelRot: 0, pitch: 0, roll: 0, y: 0 };

        self.setBroken = kind => {
          if (kind === 'wire' && camMode) toggleCam();
          dustM.visible = !!S.dusty;
          camLed.material.color.setHex(kind === 'wire' ? 0xff5468 : 0x7ee0a0);
          wheels[0].rotation.z = kind === 'wheel' ? 0.25 : 0;
        };

        /* ---------- управление ---------- */
        const keys = {};
        const kd = e => {
          if (self.paused || (e.target && e.target.tagName === 'INPUT')) return;
          const k = e.key.toLowerCase();
          if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
          keys[k] = true;
          if (e.repeat) return;
          if (k === 'e' || k === 'у' || k === ' ' || k === 'enter') act();
          if (k === 'c' || k === 'с') toggleCam();
          if (k === 'm' || k === 'ь') mapUI();
          if (k === 'r' || k === 'к') repairUI();
        };
        const ku = e => { keys[e.key.toLowerCase()] = false; };
        window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
        ctx.onCleanup(() => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); });
        const cv = renderer.domElement;
        let drag = null, orbit = 0, camPitch = 0.22, camMode = false, camYaw = 0, camTilt = 0.05;
        cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; try { cv.setPointerCapture(e.pointerId); } catch (err) {} });
        cv.addEventListener('pointermove', e => {
          if (!drag || self.paused) return;
          const dx = (e.clientX - drag.x), dy = (e.clientY - drag.y);
          if (camMode) { camYaw -= dx * 0.005; camTilt = clamp(camTilt - dy * 0.004, -0.5, 0.9); }
          else { orbit -= dx * 0.006; camPitch = clamp(camPitch + dy * 0.003, 0.05, 0.7); }
          drag = { x: e.clientX, y: e.clientY };
        });
        cv.addEventListener('pointerup', () => { drag = null; });
        cv.addEventListener('pointercancel', () => { drag = null; });
        const joy = { x: 0, y: 0, id: null };
        const zone = el.querySelector('.joy');
        if (zone) {
          const base = zone.querySelector('.joy-base'), knob = zone.querySelector('.joy-knob');
          let cx = 0, cy = 0, JR = 50;
          const moveKnob = (dx, dy) => { knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`; };
          const setFrom = e => { let dx = e.clientX - cx, dy = e.clientY - cy; const len = Math.hypot(dx, dy); if (len > JR) { dx = dx / len * JR; dy = dy / len * JR; } moveKnob(dx, dy); joy.x = dx / JR; joy.y = dy / JR; };
          zone.addEventListener('pointerdown', e => { e.preventDefault(); if (joy.id !== null) return; joy.id = e.pointerId; try { zone.setPointerCapture(e.pointerId); } catch (err) {} const zr = zone.getBoundingClientRect(), br = base.getBoundingClientRect(); JR = br.width * 0.38; const half = br.width / 2; cx = clamp(e.clientX, zr.left + half, zr.right - half); cy = clamp(e.clientY, zr.top + half, zr.bottom - half); base.style.left = (cx - zr.left) + 'px'; base.style.top = (cy - zr.top) + 'px'; zone.classList.add('active'); setFrom(e); });
          zone.addEventListener('pointermove', e => { if (e.pointerId === joy.id) setFrom(e); });
          const release = e => { if (e.pointerId !== joy.id) return; joy.id = null; joy.x = 0; joy.y = 0; moveKnob(0, 0); base.style.left = '50%'; base.style.top = '50%'; zone.classList.remove('active'); };
          zone.addEventListener('pointerup', release); zone.addEventListener('pointercancel', release);
        }
        const actBtn = el.querySelector('.fp-act'); if (actBtn) actBtn.addEventListener('click', () => act());
        el.querySelectorAll('.rv-cam-btn').forEach(b => b.onclick = () => { sfx.click(); toggleCam(); });

        function toggleCam() {
          if (self.paused || S.done) return;
          if (!camMode && S.broken === 'wire') { say(L('Камера не работает — сначала почини провода!', 'The camera isn’t working — fix the wires first!'), 'alarm'); return; }
          camMode = !camMode; camYaw = 0; camTilt = 0.05;
          camUi.hidden = !camMode;
          el.querySelectorAll('.rv-cam-btn').forEach(b => b.textContent = camMode ? L('Выйти из камеры', 'Exit camera') : L('Камера', 'Camera'));
          if (camMode) say(L('Режим камеры: поворачивай взгляд и наведи прицел на находку со знаком «?» — или найди в небе Землю. Потом нажми «Действие».', 'Camera mode: turn your view and aim the reticle at a find marked “?” — or find Earth in the sky. Then press “Action”.'));
        }
        // что сейчас можно сделать
        function focus() {
          if (camMode) {
            const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
            for (const sg of SIGHTS) {
              if (S.photos[sg.id]) continue;
              if (sg.sky) { if (dir.angleTo(EARTH_DIR) < 0.2) return { kind: 'photo', sg }; continue; }
              const to = sg.pos.clone().sub(camera.position), d = to.length();
              if (d < 55 && dir.angleTo(to.normalize()) < 0.14) return { kind: 'photo', sg };
            }
            return null;
          }
          if (Math.hypot(R.x - BASE.x, R.z - BASE.z) < 7) return { kind: 'base' };
          for (const sm of SAMPLES) if (!S.got.includes(sm.id) && Math.hypot(R.x - sm.x, R.z - sm.z) < 3.4) return { kind: 'sample', sm };
          return null;
        }
        let scooping = 0;
        function act() {
          if (self.paused || S.done) return;
          const f = focus();
          if (!f) return;
          if (f.kind === 'photo') { flashEl.classList.remove('on'); void flashEl.offsetWidth; flashEl.classList.add('on'); sfx.click(); takePhoto(f.sg); return; }
          if (f.kind === 'base') { capsuleUI(); return; }
          if (f.kind === 'sample') {
            if (Math.abs(R.speed) > 1) { say(L('Сначала остановись — на ходу манипулятор не дотянется до грунта.', 'Stop first — the arm can’t reach the ground while moving.')); return; }
            scooping = 1.6; ctx.after(1500, () => takeSample(f.sm));
          }
        }
        function target() {
          if (S.got.length >= 4 || S.got.length === SAMPLES.length) return { x: BASE.x, z: BASE.z, name: L('модуль', 'lander') };
          let best = null;
          SAMPLES.forEach(sm => { if (S.got.includes(sm.id)) return; const d = Math.hypot(sm.x - R.x, sm.z - R.z); if (!best || d < best.d) best = { x: sm.x, z: sm.z, d }; });
          return best || { x: BASE.x, z: BASE.z };
        }
        self.state = () => ({ throttle: R.throttle, dark: !!(craterAt(R.x, R.z) || {}).dark, inCrater: !!craterAt(R.x, R.z) });

        /* ---------- карта ---------- */
        self.drawMap = (cvs, big) => {
          const g = cvs.getContext('2d'), W = cvs.width, H = cvs.height, sc = big ? H / 215 : W / 120, ox = W / 2 - (big ? 0 : R.x * sc), oy = H / 2 - (big ? -35 * sc : R.z * sc);
          const X = x => ox + x * sc, Y = z => oy + z * sc;
          g.fillStyle = '#b9b5cc'; g.fillRect(0, 0, W, H);
          CRATERS.forEach(c => { g.fillStyle = c.dark ? '#3a3a5e' : c.deco ? '#a9a5bd' : '#9894b0'; g.strokeStyle = '#e6e2f2'; g.lineWidth = big ? 3 : 1.5; g.beginPath(); g.arc(X(c.x), Y(c.z), c.r * sc, 0, 7); g.fill(); g.stroke();
            if (big && c.name) { g.fillStyle = c.dark ? '#ffffff' : '#1d1c4a'; g.font = '800 13px Nunito, sans-serif'; g.textAlign = 'center'; g.fillText(c.name, X(c.x), Y(c.z) + 4); } });
          g.fillStyle = '#ff8a2a'; g.beginPath(); g.arc(X(BASE.x), Y(BASE.z), big ? 9 : 4, 0, 7); g.fill();
          SAMPLES.forEach(sm => { const got = S.got.includes(sm.id); g.fillStyle = got ? '#7ee0a0' : '#5fe8ff'; g.strokeStyle = '#1d1c4a'; g.lineWidth = 2; g.beginPath(); g.arc(X(sm.x), Y(sm.z), big ? 7 : 3.5, 0, 7); g.fill(); g.stroke(); });
          SIGHTS.forEach(sg => { if (sg.sky || !S.photos[sg.id]) return; const x = X(sg.x), y = Y(sg.z), r = big ? 10 : 5; g.fillStyle = '#ffd166'; g.beginPath(); for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); g.strokeStyle = '#1d1c4a'; g.stroke();
            if (big) { g.fillStyle = '#1d1c4a'; g.font = '800 12px Nunito, sans-serif'; g.textAlign = 'center'; g.fillText(sg.name, x, y + 22); } });
          g.save(); g.translate(X(R.x), Y(R.z)); g.rotate(-R.yaw); const k = big ? 2.2 : 1; g.fillStyle = '#ff3d6e'; g.beginPath(); g.moveTo(0, -7 * k); g.lineTo(5 * k, 5 * k); g.lineTo(-5 * k, 5 * k); g.closePath(); g.fill(); g.restore();
        };

        /* ---------- цикл ---------- */
        loadingEl.hidden = true;
        let last = performance.now(), t = 0;
        const camPos = new THREE.Vector3(R.x, 5, R.z + 9), look = new THREE.Vector3();
        function loop(now) {
          if (!running) return;
          const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
          if (!self.paused) update(dt);
          renderer.render(scene, camera);
          self.drawMap(mapCv, false);
          ctx.frame(loop);
        }
        ctx.frame(loop);

        function update(dt) {
          // ввод
          let thr = (keys.w || keys.arrowup || keys['ц'] ? 1 : 0) - (keys.s || keys.arrowdown || keys['ы'] ? 1 : 0) - joy.y;
          let str = (keys.d || keys.arrowright || keys['в'] ? 1 : 0) - (keys.a || keys.arrowleft || keys['ф'] ? 1 : 0) + joy.x;
          thr = clamp(thr, -1, 1); str = clamp(str, -1, 1);
          if (camMode) { camYaw -= str * 1.4 * dt; camTilt = clamp(camTilt + thr * 0.9 * dt, -0.5, 0.9); thr = 0; str = 0; }
          if (scooping > 0) { thr = 0; str = 0; }
          R.throttle = thr;
          const maxV = S.broken === 'wheel' ? 1.4 : 6.5;
          // уклон по направлению движения: в гору тяжелее, с горы — быстрее (гравитация Луны 1,62 м/с²)
          const fx = -Math.sin(R.yaw), fz = -Math.cos(R.yaw);
          const slope = (groundH(R.x + fx, R.z + fz) - groundH(R.x - fx, R.z - fz)) / 2;
          let acc = thr * 3.2 - 1.62 * slope * 1.2;
          if (!thr) acc -= Math.sign(R.speed) * Math.min(Math.abs(R.speed) / dt, 2.6);
          R.speed = clamp(R.speed + acc * dt, -2.5, maxV);
          if (slope > 0.75 && R.speed > 0) { R.speed *= 0.9; if (!S.warnSlope) { S.warnSlope = true; say(L('Слишком крутой склон! Объезжай по более пологому месту.', 'Too steep! Find a gentler way around.')); } }
          R.steer += (str - R.steer) * Math.min(1, dt * 6);
          R.yaw -= R.steer * 1.25 * dt * clamp(Math.abs(R.speed) / 2, 0.4, 1) * Math.sign(R.speed || 1);
          const nx = R.x + fx * R.speed * dt, nz = R.z + fz * R.speed * dt;
          let hit = null;
          for (const o of obstacles) if (Math.hypot(o.x - nx, o.z - nz) < o.r + 1.3) { hit = o; break; }
          if (Math.hypot(nx, nz) > LIMIT) hit = { edge: true };
          if (hit) {
            if (hit.rock && Math.abs(R.speed) > 3.2 && !S.events.wheel) breakdown('wheel');
            else if (Math.abs(R.speed) > 1.5) sfx.bad();
            R.speed = -R.speed * 0.2;
          } else { R.x = nx; R.z = nz; }
          // подвеска: наклон корпуса по рельефу
          const rx = Math.cos(R.yaw), rz = -Math.sin(R.yaw);
          const hF = groundH(R.x + fx * 1.1, R.z + fz * 1.1), hB = groundH(R.x - fx * 1.1, R.z - fz * 1.1);
          const hL = groundH(R.x - rx * 1.1, R.z - rz * 1.1), hR = groundH(R.x + rx * 1.1, R.z + rz * 1.1);
          R.pitch += (Math.atan2(hF - hB, 2.2) - R.pitch) * Math.min(1, dt * 8);
          R.roll += (Math.atan2(hR - hL, 2.2) - R.roll) * Math.min(1, dt * 8);
          R.y = (hF + hB + hL + hR) / 4;
          rover.position.set(R.x, R.y + Math.sin(t * 13) * 0.01 * Math.min(1, Math.abs(R.speed)), R.z);
          rover.rotation.set(0, 0, 0); rover.rotateY(R.yaw + Math.PI); rover.rotateX(-R.pitch); rover.rotateZ(-R.roll);
          R.wheelRot += R.speed * dt / 0.33;
          wheels.forEach((w, i) => { w.rotation.x = R.wheelRot; if (i === 0 || i === 3) w.rotation.y = -R.steer * 0.4; });
          // манипулятор опускается за образцом
          if (scooping > 0) scooping -= dt;
          const sc = scooping > 0 ? Math.sin(Math.min(1, (1.6 - scooping) / 1.4) * Math.PI) : 0;
          armG.rotation.x = sc * 0.9; elbowArm.rotation.x = -sc * 1.2;
          // мачта и камера
          headG.rotation.y = camMode ? camYaw : Math.sin(t * 0.5) * 0.3; headG.rotation.x = camMode ? -camTilt : 0;
          // фары в тёмном кратере
          const dark = self.state().dark;
          spots.forEach(s => { s.intensity += ((dark ? 40 : 0) - s.intensity) * Math.min(1, dt * 3); });
          lightMat.color.setHex(dark ? 0xffffff : 0xfff6c8);
          hemi.intensity += ((dark ? 0.45 : 1.15) - hemi.intensity) * Math.min(1, dt * 2);
          sun.intensity += ((dark ? 0.6 : 2.6) - sun.intensity) * Math.min(1, dt * 2);
          // маяки
          SAMPLES.forEach(sm => { const b = beacons[sm.id]; b.g.visible = !S.got.includes(sm.id); b.ring.scale.setScalar(1 + Math.sin(t * 3) * 0.08); });
          slotLeds.forEach((l, i) => l.material.color.setHex(S.got.includes(SAMPLES[i].id) ? 0x7ee0a0 : 0x3b3770));
          Object.entries(sightMarks).forEach(([id, q]) => { q.visible = !S.photos[id]; q.position.y = 5.5 + Math.sin(t * 2.5) * 0.25; });
          dustM.visible = !!S.dusty;
          // ASTRO на луноходе
          if (am) { moodT -= dt; am.pose(moodT > 0 ? astroMood : (S.broken ? 'alarm' : 'idle'), t, dt); }
          // камера: от третьего лица или из «глаз» лунохода
          if (camMode) {
            headG.updateWorldMatrix(true, false);
            const p = new THREE.Vector3(0, 0.05, 0.3).applyMatrix4(headG.matrixWorld);
            camera.position.copy(p);
            const yaw = R.yaw + camYaw;
            look.set(p.x - Math.sin(yaw) * 10, p.y + Math.tan(camTilt) * 10, p.z - Math.cos(yaw) * 10);
            camera.lookAt(look);
          } else {
            const yaw = R.yaw + orbit, dist = 8.5;
            const want = V3(R.x + Math.sin(yaw) * dist * Math.cos(camPitch), R.y + 2.2 + Math.sin(camPitch) * dist, R.z + Math.cos(yaw) * dist * Math.cos(camPitch));
            want.y = Math.max(want.y, groundH(want.x, want.z) + 1.2);
            camPos.lerp(want, Math.min(1, dt * 4)); camera.position.copy(camPos);
            look.set(R.x, R.y + 1.4, R.z); camera.lookAt(look);
            if (!drag) orbit *= Math.pow(0.4, dt);
          }
          // небо следует за камерой
          earth.position.copy(camera.position).addScaledVector(EARTH_DIR, 420);
          sunGlow.position.copy(camera.position).addScaledVector(sun.position.clone().normalize(), 430);
          sun.target.position.set(R.x, R.y, R.z); sun.position.set(R.x - 60, R.y + 45, R.z + 40);
          // подсказка
          const f = focus();
          promptEl.hidden = !f;
          if (f) promptEl.innerHTML = (touch ? '' : '<span class="kbd">E</span> ') + (f.kind === 'photo' ? L(`Сфотографировать: ${f.sg.name}`, `Take a photo: ${f.sg.name}`) : f.kind === 'base' ? L('Посадочный модуль: загрузить капсулу', 'Lander: load the capsule') : L(`Взять образец: ${f.sm.name}`, `Take a sample: ${f.sm.name}`));
          // компас
          const tg = target(), dx = tg.x - R.x, dz = tg.z - R.z, cyaw = camMode ? R.yaw + camYaw : R.yaw + orbit;
          const ang = Math.atan2(dx * Math.cos(cyaw) - dz * Math.sin(cyaw), -(dx * Math.sin(cyaw) + dz * Math.cos(cyaw)));
          arrowEl.style.transform = `rotate(${ang * 180 / Math.PI}deg)`;
          distEl.textContent = Math.round(Math.hypot(dx, dz)) + L(' м', ' m');
        }
      }
      return self;
    }
  }
});
