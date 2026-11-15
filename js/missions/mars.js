/* =====================================================================
   Финальное испытание «Последний шанс на Марсе» / Final: Last Chance on Mars
   Корабль сломался на Марсе. Нужно продержаться 10 солов на станции:
   поливать теплицу с картошкой, считать энергию на ночь, решать —
   мыть пыльные панели или беречь воду для грядок, чинить поломки,
   получать инструкции с Земли и шаг за шагом ремонтировать корабль.
   3D: Three.js (с CDN), мультяшный стиль — toon-материалы и контуры.
   ===================================================================== */
Game.register({
  id: 'mars', order: 6, img: 'mars', final: true,
  get tag() { return L('Финал', 'Final'); },
  get title() { return L('Последний шанс на Марсе', 'Last Chance on Mars'); },
  get situation() { return L('Корабль сломался на Марсе. Продержись 10 солов на станции, вырасти картошку, следи за энергией и почини корабль по инструкциям с Земли.', 'The ship broke down on Mars. Survive 10 sols at the station, grow potatoes, watch the energy and repair the ship using Earth’s instructions.'); },
  get skills() { return L(['Выживание', 'Расчёты', 'Энергия', 'Теплица', 'Ремонт'], ['Survival', 'Maths', 'Energy', 'Greenhouse', 'Repair']); },
  get learn() {
    return L([
      'Энергию считают в <b>киловатт-часах</b>: мощность × время. Если приборы берут 3 кВт, то за 7 часов ночи уйдёт 3 × 7 = 21 кВт·ч.',
      'Марсианская пыль оседает на солнечных панелях и отнимает до половины энергии. Марсоходы иногда спасал ветер, который сдувал пыль.',
      'Средняя температура на поверхности Марса — около <b>−65 °C</b>. Растения могут расти только в тёплой теплице.',
      'Давление воздуха на Марсе примерно в <b>100 раз</b> меньше, чем на Земле, а сам воздух почти весь из углекислого газа.',
      'Вода на Марсе есть в виде <b>льда</b> под грунтом. Её можно добывать буром, но для этого нужна энергия.',
      'Картофель — хороший выбор для теплицы: он сытный и неприхотливый. Но растениям нужны свет, вода и время.',
      'Сигнал от Марса до Земли идёт от <b>4 до 24 минут</b>, поэтому экипаж не может ждать подсказки на каждом шагу.',
      'Улететь с Марса можно не в любой день: нужно ждать <b>окна запуска</b>, когда Земля и Марс удачно расположены.'
    ], [
      'Energy is measured in <b>kilowatt-hours</b>: power × time. If devices use 3 kW, a 7-hour night takes 3 × 7 = 21 kWh.',
      'Martian dust settles on solar panels and can steal up to half the energy. Sometimes the wind saved rovers by blowing the dust away.',
      'The average surface temperature on Mars is about <b>−65 °C</b>. Plants can only grow in a warm greenhouse.',
      'Air pressure on Mars is about <b>100 times</b> lower than on Earth, and the air is almost all carbon dioxide.',
      'Mars has water as <b>ice</b> under the ground. A drill can mine it, but that needs energy.',
      'Potatoes are a good greenhouse crop: filling and hardy. But plants need light, water and time.',
      'A signal from Mars to Earth takes <b>4 to 24 minutes</b>, so the crew can’t wait for help at every step.',
      'You can’t leave Mars on any day: you have to wait for a <b>launch window</b>, when Earth and Mars line up well.'
    ]);
  },

  start(ctx) {
    const { h, sfx, clamp, shuffle } = ctx;
    const A = 'assets/mars/', BA = 'assets/base/';
    const DAYS = 10;
    ctx.steps(L(['Авария', 'Выживание', 'Взлёт'], ['Crash', 'Survival', 'Lift-off']));
    const num = (n, d = 0) => L(Number(n).toFixed(d).replace('.', ','), Number(n).toFixed(d));

    /* =================================================================
       СОСТОЯНИЕ И ПРАВИЛА
       ================================================================= */
    const CROPS = {
      potato: { name: L('Картофель', 'Potatoes'), need: 3 },
      tomato: { name: L('Томаты', 'Tomatoes'), need: 2 },
      lettuce: { name: L('Салат', 'Lettuce'), need: 1 }
    };
    const BEDS = ['potato', 'potato', 'potato', 'tomato', 'tomato', 'lettuce'];
    // события по дням: пыль на панелях (0..1), жара (+1 л картошке), поломка, сбор урожая
    const PLAN = {
      1: {}, 2: { hot: true, brk: 'leak' }, 3: { dust: 0.4 }, 4: { hot: true, brk: 'drill' }, 5: { harvest: true, brk: 'antenna' },
      6: { dust: 0.7 }, 7: { hot: true, brk: 'battery' }, 8: { dust: 0.5 }, 9: { harvest: true, brk: 'leak' }, 10: {}
    };
    const PANEL_N = 8, PANEL_KWH = 5;
    const S = {
      day: 1, time: 0, running: false,
      battery: 35, cap: 50, water: 90, food: 6, parts: 5,
      beds: BEDS.map(c => ({ crop: c, hp: 80 })),
      dust: 0, drill: true, lampsNight: true, heaterNight: true,
      repair: 0, instructions: 0, msgs: [],
      today: null, broken: {}, blackouts: 0, mistakes: 0, calcOk: 0, done: false,
      can: { has: false, liters: 0 }, seen: {}, ghTutorial: 0, indicators: {}, started: false
    };
    const CAN_CAP = 8, TOL = 0.6; // лейка вмещает 8 л; «зелёная зона» влажности — нужное количество ± 0,6 л
    // инструкции Земли по ремонту корабля (каждая — задача с расчётом)
    const STEPS = [
      { part: true, title: L('Предохранитель двигателя', 'Engine fuse'),
        text: L('Земля: «Перегорел предохранитель двигателя. Через него идёт ток 12 ампер. Поставьте предохранитель, который выдержит этот ток, — самый маленький из подходящих».', 'Earth: “The engine fuse has blown. A current of 12 amps flows through it. Fit a fuse that can take this current — the smallest one that fits.”'),
        q: L('Какой предохранитель поставить?', 'Which fuse should you fit?'), opts: ['5 A', '10 A', '15 A', '20 A'], answer: '15 A',
        hint: L('Предохранитель должен быть больше 12 А, но как можно меньше.', 'The fuse must be more than 12 A, but as small as possible.') },
      { part: false, title: L('Аккумуляторы', 'Batteries'),
        text: L('Земля: «Бортовой компьютер работает от 48 вольт. Один аккумулятор даёт 12 вольт. Соедините их последовательно — напряжения складываются».', 'Earth: “The flight computer runs on 48 volts. One battery gives 12 volts. Connect them in series — the voltages add up.”'),
        q: L('Сколько аккумуляторов соединить?', 'How many batteries should you connect?'), answer: 4,
        hint: L('Сколько раз по 12 помещается в 48?', 'How many 12s fit into 48?') },
      { part: true, title: L('Кислородный бак', 'Oxygen tank'),
        text: L('Земля: «Для полёта нужно 70 литров кислорода. В баке сейчас 25 литров. Одна канистра — 15 литров».', 'Earth: “The flight needs 70 litres of oxygen. The tank now has 25 litres. One canister holds 15 litres.”'),
        q: L('Сколько канистр нужно долить?', 'How many canisters do you need to add?'), answer: 3,
        hint: L('Сначала посчитай, сколько не хватает: 70 − 25. Потом раздели на 15.', 'First work out what’s missing: 70 − 25. Then divide by 15.') },
      { part: false, title: L('Заправка топливом', 'Refuelling'),
        text: L('Земля: «Для взлёта нужно 120 кг топлива. В баках 48 кг. Насос качает 8 кг в минуту».', 'Earth: “Lift-off needs 120 kg of fuel. The tanks hold 48 kg. The pump moves 8 kg per minute.”'),
        q: L('Сколько минут должен работать насос?', 'How many minutes must the pump run?'), answer: 9,
        hint: L('Сколько топлива не хватает? 120 − 48. Сколько раз по 8 в этом числе?', 'How much fuel is missing? 120 − 48. How many 8s are in that?') },
      { part: false, title: L('Курс домой', 'Course home'),
        text: L('Земля: «Двигатели нужно прогреть заранее: за 2 сола и 6 часов до старта. Компьютеру время нужно ввести в часах. Считайте сол равным 24 часам».', 'Earth: “The engines must warm up in advance: 2 sols and 6 hours before lift-off. The computer needs the time in hours. Count a sol as 24 hours.”'),
        q: L('Сколько это часов?', 'How many hours is that?'), answer: 54,
        hint: L('2 × 24 + 6', '2 × 24 + 6') }
    ];
    const BREAK = {
      leak: { name: L('Протечка в теплице', 'Greenhouse leak'), effect: L('теряется 8 л воды в сол', 'loses 8 L of water per sol') },
      drill: { name: L('Заклинило ледяной бур', 'Ice drill jammed'), effect: L('бур не добывает воду', 'the drill mines no water') },
      antenna: { name: L('Сбилась антенна связи', 'Antenna knocked off course'), effect: L('нет связи с Землёй', 'no contact with Earth') },
      battery: { name: L('Перегрелся аккумулятор', 'Battery overheated'), effect: L('батареи вмещают на 10 кВт·ч меньше', 'batteries hold 10 kWh less') }
    };

    function newDay() {
      const p = PLAN[S.day] || {};
      S.dust = Math.max(S.dust * 0.3, p.dust || 0); // часть пыли сдувает ветром
      if (S.dust < 0.05) S.dust = 0;
      S.today = {
        hot: !!p.hot, watered: false, energyPlanned: false, called: false, cleaned: 0, cleaning: false, decidedDust: false,
        nightHours: 6 + (S.day % 3), heat: p.dust ? 2 : 1, waitMsg: null,
        bedWater: BEDS.map(() => 0), bedZone: BEDS.map(() => 'dry'), tips: {}, calcAsked: false
      };
      if (p.brk) S.broken[p.brk] = true;
      S.time = 0;
    }
    const cap = () => S.cap - (S.broken.battery ? 10 : 0);
    const dustLeft = () => S.dust * (1 - S.today.cleaned / PANEL_N);
    const production = () => Math.round(PANEL_N * PANEL_KWH * (1 - dustLeft()));
    const drillOn = () => S.drill && !S.broken.drill;
    const dayUse = () => 8 + (drillOn() ? 5 : 0) + (S.today.called ? 3 : 0) + (S.today.cleaned ? 8 : 0);
    const nightKW = () => 1 + (S.heaterNight ? S.today.heat : 0) + (S.lampsNight ? 1 : 0);
    const nightNeed = () => nightKW() * S.today.nightHours;
    const potNeed = () => CROPS.potato.need + (S.today.hot ? 1 : 0);
    const cropNeed = c => c === 'potato' ? potNeed() : CROPS[c].need;
    const waterNeed = crops => crops.reduce((sum, c) => sum + BEDS.filter(b => b === c).length * cropNeed(c), 0);
    const bedNeed = i => cropNeed(BEDS[i]);
    const bedZone = i => { const m = S.today.bedWater[i], n = bedNeed(i); return m < n - TOL ? 'dry' : m > n + TOL ? 'wet' : 'ok'; };
    const evening = () => clamp(Math.min(cap(), S.battery + production() - dayUse()), 0, 999);
    const icon = n => `<img class="mod" src="${BA}mod-${n}.png" alt="">`;

    /* =================================================================
       ВСТУПЛЕНИЕ
       ================================================================= */
    ctx.step(0);
    ctx.astroBrief([
      [L('Привет! Это я, <b>ASTRO</b>. Это финальное испытание! «Звёздный вихрь» сел на Марс, но при посадке двигатель и системы повредились.', 'Hi! It’s me, <b>ASTRO</b>. This is the final challenge! The “Star Whirl” landed on Mars, but the engine and systems were damaged.'), 'alarm'],
      [L('Рядом есть научная станция с теплицей. Окно запуска к Земле откроется через <b>10 солов</b> — сол это марсианские сутки. До этого нужно выжить и починить корабль.', 'There’s a research station with a greenhouse nearby. The launch window to Earth opens in <b>10 sols</b> — a sol is a Martian day. Until then we must survive and repair the ship.'), 'point'],
      [L('На станции я всё покажу и буду подсказывать. Готов выйти на поверхность Марса?', 'At the station I’ll show you everything and give you tips. Ready to step out onto Mars?'), 'wave']
    ], L('Выйти к станции →', 'Head to the station →'), () => { sfx.click(); begin(); }, { img: A + 'mars-intro.jpg' });

    /* =================================================================
       МОДАЛЬНЫЕ ОКНА
       ================================================================= */
    let modal = null, world = null, hud = null;
    function openModal(html, onReady, wide) {
      if (modal) { modal.remove(); modal = null; }
      modal = h(`<div class="fp-modal"><div class="panel card fp-modal-card ${wide ? 'wide' : ''}">${html}</div></div>`);
      document.body.appendChild(modal);
      if (world) world.paused = true;
      onReady && onReady(modal);
      return modal;
    }
    function closeModal() {
      if (modal) { modal.remove(); modal = null; }
      if (world) world.paused = false;
      renderHud();
    }
    ctx.onCleanup(() => { if (modal) modal.remove(); });
    const parseNum = v => parseFloat(String(v).replace(',', '.').trim());

    // поле ввода числа с проверкой
    function numberInput(m, answer, onRight, onWrong) {
      const inp = m.querySelector('.calc-input'), btn = m.querySelector('.calc-go'), fb = m.querySelector('.calc-fb');
      const go = () => {
        const v = parseNum(inp.value);
        if (Number.isNaN(v)) { fb.innerHTML = `<div class="feedback no">${L('Введи число.', 'Enter a number.')}</div>`; return; }
        if (Math.abs(v - answer) < 0.01) { S.calcOk++; sfx.ok(); onRight(v); }
        else { S.mistakes++; sfx.bad(); onWrong(v, fb); }
      };
      btn.onclick = go;
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
      setTimeout(() => inp.focus(), 50);
    }

    /* =================================================================
       ASTRO — робот-помощник: диалоги и подсказки
       ================================================================= */
    let astroBox = null, astroTimer = null, astroSeqOn = false, astroQueue = [], astroNext = null;
    function astroRender(text, pose, btns) {
      if (!astroBox) return;
      astroBox.hidden = false;
      astroBox.querySelector('.astro-img').src = `assets/sprites/astro-${pose}.png`;
      astroBox.querySelector('.astro-text').innerHTML = text;
      const bw = astroBox.querySelector('.astro-btns'); bw.innerHTML = '';
      btns.forEach(([label, fn, cls]) => { const b = h(`<button class="btn small ${cls || 'orange'}">${label}</button>`); b.onclick = e => { e.stopPropagation(); sfx.click(); fn(); }; bw.appendChild(b); });
      astroBox.classList.remove('pop'); void astroBox.offsetWidth; astroBox.classList.add('pop');
      if (world) world.astroShow(pose);
    }
    function astroHide() { clearTimeout(astroTimer); astroNext = null; if (astroBox) astroBox.hidden = true; if (world) world.astroHide(); }
    // цепочка реплик с кнопкой «Далее»: игрок читает, ходить в это время нельзя
    function astroSeq(lines, onDone, lastLabel) {
      clearTimeout(astroTimer); astroSeqOn = true; if (world) world.talk = true;
      let i = 0;
      const next = () => {
        if (i >= lines.length) {
          astroSeqOn = false; if (world) world.talk = false; astroHide();
          if (onDone) onDone();
          const q = astroQueue.pop(); astroQueue = []; if (q && !astroSeqOn) say(q[0], q[1]);
          return;
        }
        const [text, pose] = lines[i++];
        sfx.radio();
        astroRender(text, pose || 'point', [[i >= lines.length ? (lastLabel || L('Понятно!', 'Got it!')) : L('Далее →', 'Next →'), next]]);
        astroNext = next;
      };
      next();
    }
    // короткая подсказка: не мешает ходить и сама исчезает
    function say(text, mood) {
      if (!astroBox) { ctx.mc(text, mood); return; }
      if (astroSeqOn) { astroQueue.push([text, mood]); return; }
      clearTimeout(astroTimer);
      const pose = mood === 'alarm' || mood === 'bad' ? 'alarm' : mood === 'good' ? 'wave' : 'point';
      if (mood === 'alarm') sfx.alarm(); else if (mood === 'bad') sfx.bad(); else sfx.radio();
      astroRender(text, pose, [[L('Хорошо', 'OK'), astroHide, 'ghost']]);
      astroNext = astroHide;
      astroTimer = ctx.after(Math.max(6500, text.replace(/<[^>]+>/g, '').length * 75), astroHide);
    }
    const sayOnce = (key, text, mood) => { const T = S.today; if (!T || T.tips[key]) return; T.tips[key] = true; say(text, mood); };

    // вступление: приветствие, предыстория, цели, карта базы
    const INTRO = [
      [L('Привет, астронавт! Добро пожаловать на Марс! Я <b>ASTRO</b>, твой робот-помощник.', 'Hello, astronaut! Welcome to Mars! I’m <b>ASTRO</b>, your robot helper.'), 'wave'],
      [L('Твой корабль «Звёздный вихрь» повреждён при посадке, и экипаж теперь живёт на этой научной станции.', 'Your spacecraft, the “Star Whirl”, has been damaged, and your crew is now staying at this research station.'), 'point'],
      [L('Твоя миссия — продержаться <b>10 марсианских дней</b> (они называются солы), поддерживать работу базы, следить за запасами и починить корабль.', 'Your mission is to survive for <b>10 Martian days</b> (they’re called sols), keep the base running, manage resources and repair your spacecraft.'), 'point'],
      [L('Но будь осторожен! <b>Вода, энергия, еда и запчасти</b> ограничены. Каждое твоё решение повлияет на станцию.', 'But be careful! <b>Water, energy, food and spare parts</b> are limited. Every decision you make will affect the station.'), 'alarm'],
      [L('Не волнуйся, я буду подсказывать тебе по пути. Ты готов начать миссию?', 'Don’t worry. I’ll guide you along the way. Are you ready to begin your mission?'), 'wave']
    ];
    function mapUI(first) {
      const places = world.places;
      openModal(`
        <div class="task-title"><span class="num"><img class="mod" src="assets/sprites/astro-point.png" alt=""></span><h2>${L('Карта базы', 'Base map')}</h2></div>
        <p>${first ? L('Вот пять главных мест нашей базы. <b>Выбери, куда отправиться сначала</b> — компас покажет дорогу.', 'Here are the five main places of our base. <b>Choose where to go first</b> — the compass will show the way.') : L('Выбери место — компас покажет дорогу.', 'Choose a place — the compass will show the way.')}</p>
        <div class="base-map"><canvas width="560" height="420"></canvas>
          <div class="place-list">${places.map((pl, i) => `<button class="place" data-i="${i}"><span class="n">${i + 1}</span><img src="${pl.img}" alt=""><span><b>${pl.name}</b><em>${pl.desc}</em></span></button>`).join('')}</div>
        </div>
        ${first ? '' : `<div class="actions"><button class="btn ghost" data-close>${L('Закрыть', 'Close')}</button></div>`}`, m => {
        world.drawBigMap(m.querySelector('canvas'));
        const c = m.querySelector('[data-close]'); if (c) c.onclick = () => { sfx.click(); closeModal(); };
        m.querySelectorAll('.place').forEach(b => b.onclick = () => {
          sfx.ok();
          const pl = places[+b.dataset.i];
          world.goal = pl;
          closeModal();
          if (!S.started) { S.started = true; S.running = true; }
          say(L(`Отличный выбор! Иди за стрелкой компаса вверху — она ведёт к месту «${pl.name}». Если что, кнопка «Карта» всегда рядом.`, `Great choice! Follow the compass arrow at the top — it leads to “${pl.name}”. The “Map” button is always there if you need it.`), 'good');
        });
      }, true);
    }
    // научные факты при первом посещении мест
    const FACTS = {
      habitat: [
        [L('Это жилой модуль — наш дом на Марсе. Знаешь, почему он закрытый и прочный? Давление воздуха на Марсе в <b>100 раз меньше</b>, чем на Земле, а воздух почти весь из углекислого газа — дышать им нельзя!', 'This is the habitat — our home on Mars. Do you know why it’s sealed and strong? Air pressure on Mars is <b>100 times lower</b> than on Earth, and the air is almost all carbon dioxide — you can’t breathe it!'), 'point'],
        [L('Здесь <b>радиостанция</b> для связи с Землёй, <b>склад запчастей</b> и <b>кровать</b>: когда закончишь дела, ложись спать — так закончится сол. Коридоры ведут в теплицу и энергоблок.', 'Here you’ll find the <b>radio</b> to talk to Earth, the <b>spare parts store</b> and the <b>bed</b>: when your tasks are done, go to sleep to end the sol. Corridors lead to the greenhouse and the power room.'), 'wave']
      ],
      power: [
        [L('Это энергоблок. Марс в полтора раза дальше от Солнца, чем Земля, поэтому солнечного света здесь <b>почти вдвое меньше</b>. Каждый киловатт-час на счету!', 'This is the power room. Mars is one and a half times farther from the Sun than Earth, so sunlight here is <b>almost half as strong</b>. Every kilowatt-hour counts!'), 'point'],
        [L('Ночью панели не работают, и станция живёт на батареях. Каждый вечер считай на пульте: <b>мощность × часы ночи</b> = сколько энергии нужно.', 'At night the panels don’t work and the station runs on batteries. Every evening work it out at the console: <b>power × night hours</b> = the energy needed.'), 'wave']
      ],
      panels: [
        [L('Солнечные панели — наша электростанция. Марсианская пыль мелкая, как пудра, а пыльные бури бывают такими огромными, что <b>закрывают всю планету</b>!', 'The solar panels are our power plant. Martian dust is as fine as powder, and dust storms can be so huge that they <b>cover the whole planet</b>!'), 'point'],
        [L('Запылённые панели можно промыть водой. Но вода нужна и растениям, а насосы съедают столько энергии, что в этот сол не будет связи с Землёй. Решать тебе!', 'Dusty panels can be washed with water. But the plants need water too, and the pumps use so much energy that there’s no contact with Earth that sol. Your call!'), 'alarm']
      ],
      ship: [
        [L('Вот наш «Звёздный вихрь». Чтобы его починить, нужны инструкции с Земли. Радиосигнал до Земли идёт <b>от 4 до 24 минут</b>, поэтому ответ приходит не сразу.', 'Here’s our “Star Whirl”. To repair it we need instructions from Earth. A radio signal takes <b>4 to 24 minutes</b> to reach Earth, so replies don’t come at once.'), 'point'],
        [L('Окно запуска к Земле откроется через 10 солов. Каждая инструкция — задача с расчётом. Ты справишься!', 'The launch window to Earth opens in 10 sols. Every instruction is a maths task. You can do it!'), 'wave']
      ],
      drill: [[L('Это ледяной бур. Под марсианским грунтом есть <b>лёд</b>! Бур растапливает его, и у нас появляется вода — 15 литров в сол. Но он тратит энергию.', 'This is the ice drill. There’s <b>ice</b> under the Martian ground! The drill melts it and gives us water — 15 litres per sol. But it uses energy.'), 'point']],
      antenna: [[L('Эта антенна смотрит на Землю. С Марса наша планета видна как <b>яркая голубая звёздочка</b> на небе. Если антенна собьётся, связи не будет.', 'This antenna points at Earth. From Mars, our planet looks like a <b>bright blue star</b> in the sky. If the antenna gets knocked off course, there’s no contact.'), 'point']],
      greenhouse: [
        [L('Добро пожаловать в теплицу, астронавт! Здесь мы выращиваем еду для экипажа. Растениям нужны <b>вода, свет и правильная температура</b>.', 'Welcome to the greenhouse, astronaut! This is where we grow food for our crew. Plants need <b>water, light and the right temperature</b> to survive.'), 'wave'],
        [L('А ты знаешь, что на Марсе очень холодно? Средняя температура на поверхности — около <b>−65 °C</b>! Растения в таком холоде не выживут. Поэтому теплица держит их в тепле.', 'Did you know that Mars is extremely cold? Its average surface temperature is about <b>−65 °C</b>! Plants cannot grow in these conditions. That’s why our greenhouse keeps them warm.'), 'point'],
        [L('Давай проверим, всё ли работает! Подойди к трём индикаторам у входа — <b>термометру</b>, <b>датчику влажности</b> и <b>датчику света</b> — и проверь каждый.', 'Let’s check if everything is working properly! Walk up to the three indicators by the entrance — the <b>thermometer</b>, the <b>soil moisture meter</b> and the <b>light meter</b> — and check each one.'), 'point']
      ]
    };
    function onZone(id) {
      if (id === 'greenhouse' && S.ghTutorial === 0) { astroSeq(FACTS.greenhouse, () => { S.ghTutorial = 1; renderHud(); }, L('Проверим!', 'Let’s check!')); return; }
      if (FACTS[id]) astroSeq(FACTS[id]);
    }
    // что делать дальше — кнопка «Спросить ASTRO»
    function hint() {
      const T = S.today;
      if (S.day === DAYS && S.repair >= STEPS.length) return say(L('Окно запуска открыто! Беги к кораблю — летим домой!', 'The launch window is open! Run to the ship — we’re flying home!'), 'good');
      if (!T.watered) {
        if (S.ghTutorial < 2) return say(L('Начнём с теплицы: проверь три индикатора у входа.', 'Let’s start with the greenhouse: check the three indicators by the entrance.'));
        if (!S.can.has) return say(L('Возьми лейку у входа в теплицу.', 'Take the watering can by the greenhouse entrance.'));
        if (S.can.liters < 0.3) return say(L('Лейка пустая — наполни её у бака с водой.', 'The can is empty — fill it at the water tank.'));
        return say(L('Полей каждую грядку: держи кнопку, пока шкала не станет <b>зелёной</b>.', 'Water each bed: hold the button until the bar turns <b>green</b>.'));
      }
      if (S.instructions > S.repair) return say(L('С Земли пришла инструкция — иди чинить корабль!', 'An instruction from Earth has arrived — go and repair the ship!'));
      if (!T.called && !T.cleaning && !S.broken.antenna) return say(L('Свяжись с Землёй по радио в жилом модуле — без инструкций корабль не починить.', 'Contact Earth by radio in the habitat — we can’t fix the ship without instructions.'));
      if (S.broken.antenna) return say(L('Антенна сбита — почини её, иначе связи с Землёй не будет.', 'The antenna is off course — fix it, or there’ll be no contact with Earth.'), 'alarm');
      if (!T.energyPlanned) return say(L('Загляни в энергоблок и посчитай, сколько энергии нужно на ночь.', 'Visit the power room and work out how much energy the night needs.'));
      return say(L('Все главные дела сделаны! Можешь лечь спать в жилом модуле.', 'All the main tasks are done! You can go to bed in the habitat.'), 'good');
    }

    /* ----- теплица: индикаторы, лейка, бак и полив ----- */
    function indicatorUI(kind) {
      const T = S.today;
      const txt = {
        temp: T.hot ? L('Термометр: в теплице <b>+28 °C</b> — сегодня жарко! Картофелю нужно на 1 литр больше воды. А снаружи около −65 °C.', 'Thermometer: <b>+28 °C</b> in the greenhouse — it’s hot today! Potatoes need 1 litre more water. Outside it’s about −65 °C.')
                    : L('Термометр: в теплице <b>+22 °C</b>, а снаружи около <b>−65 °C</b>! Обогреватели и двойное стекло держат тепло. Температура в норме.', 'Thermometer: <b>+22 °C</b> in the greenhouse and about <b>−65 °C</b> outside! Heaters and double glass keep the warmth in. The temperature is fine.'),
        water: L(`Датчик влажности почвы: на одну грядку нужно — <b>картофель ${cropNeed('potato')} л</b>, <b>томаты 2 л</b>, <b>салат 1 л</b>. Сейчас сухих грядок: <b>${BEDS.filter((c, i) => bedZone(i) === 'dry').length} из ${BEDS.length}</b>.`, `Soil moisture meter: each bed needs — <b>potatoes ${cropNeed('potato')} L</b>, <b>tomatoes 2 L</b>, <b>lettuce 1 L</b>. Dry beds now: <b>${BEDS.filter((c, i) => bedZone(i) === 'dry').length} of ${BEDS.length}</b>.`),
        light: L(`Датчик света: лампы роста светят растениям <b>16 часов</b> в сол. Свет розовый, потому что растениям больше всего нужны <b>красные и синие лучи</b>. Ночью лампы ${S.lampsNight ? 'включены' : 'выключены'}.`, `Light meter: the grow lamps shine for <b>16 hours</b> per sol. The light is pink because plants need <b>red and blue light</b> the most. At night the lamps are ${S.lampsNight ? 'on' : 'off'}.`)
      }[kind];
      S.indicators[kind] = true;
      const all = ['temp', 'water', 'light'].every(k => S.indicators[k]);
      if (S.ghTutorial === 1 && all) {
        S.ghTutorial = 2;
        astroSeq([[txt, 'point'],
          [L('Отлично! Теперь позаботимся о растениях.', 'Great! Now let’s take care of our plants.'), 'wave'],
          [L('Растениям нужна вода, чтобы расти. Но осторожно! Мало воды — они засохнут, много воды — испортятся корни.', 'Plants need water to grow. But be careful! Too little water can make them dry, and too much water can damage their roots.'), 'alarm'],
          [L('Возьми <b>лейку у входа</b>, наполни её у <b>бака с водой</b> и полей каждую грядку: держи кнопку, пока шкала влажности не станет <b>зелёной</b>. Красная — сухо, синяя — слишком много воды.', 'Take the <b>watering can by the entrance</b>, fill it at the <b>water tank</b> and water each bed: hold the button until the moisture bar is <b>green</b>. Red means too dry, blue means too much water.'), 'point']
        ], () => renderHud(), L('Беру лейку!', 'Grab the can!'));
      } else {
        const left = ['temp', 'water', 'light'].filter(k => !S.indicators[k]).length;
        say(txt + (S.ghTutorial === 1 ? L(` Осталось проверить: ${left}.`, ` Left to check: ${left}.`) : ''), 'point');
      }
      renderHud();
    }
    function canUI() {
      if (S.ghTutorial < 2) { say(L('Сначала проверь три индикатора у входа — термометр, влажность и свет.', 'First check the three indicators by the entrance — temperature, moisture and light.')); return; }
      sfx.click();
      if (S.can.has) {
        // ставим лейку обратно на подставку; вода в ней остаётся
        S.can.has = false;
        say(S.can.liters > 0.05
          ? L(`Лейка на месте. В ней осталось ${num(S.can.liters, 1)} л — вода не пропадёт, можно взять её снова.`, `The can is back in place. It still has ${num(S.can.liters, 1)} L — the water stays in it, you can take it again.`)
          : L('Лейка на месте. Молодец, что убрал за собой!', 'The can is back in place. Nice tidying up!'), 'good');
      } else {
        S.can.has = true;
        say(S.can.liters > 0.05
          ? L(`Лейка у тебя! В ней ${num(S.can.liters, 1)} л из ${CAN_CAP}.`, `You’ve got the can! It has ${num(S.can.liters, 1)} of ${CAN_CAP} L.`)
          : L(`Лейка у тебя! В неё помещается ${CAN_CAP} литров. Теперь наполни её у бака с водой.`, `You’ve got the can! It holds ${CAN_CAP} litres. Now fill it at the water tank.`), 'good');
      }
      renderHud();
    }
    function tankUI() {
      const T = S.today;
      if (!S.can.has) { say(L('Сначала возьми лейку — она стоит у входа в теплицу.', 'First take the watering can — it’s by the greenhouse entrance.')); return; }
      if (S.can.liters >= CAN_CAP - 0.05) { say(L('Лейка уже полная!', 'The can is already full!')); return; }
      if (S.water < 0.5) { say(L('Вода в баке станции закончилась!', 'The station’s water tank is empty!'), 'alarm'); return; }
      const fill = () => {
        const add = Math.min(CAN_CAP - S.can.liters, S.water);
        S.can.liters += add; S.water -= add; sfx.ok();
        say(L(`Лейка наполнена: ${num(S.can.liters, 1)} л. В баке станции осталось ${Math.round(S.water)} л.`, `Can filled: ${num(S.can.liters, 1)} L. ${Math.round(S.water)} L left in the station tank.`), 'good');
        if (S.water < 25) sayOnce('lowwater', L('Осторожно! Воды осталось мало — её нужно беречь на следующие дни.', 'Careful! Water is running low — we need to save it for the next days.'), 'alarm');
        renderHud();
      };
      if (T.calcAsked) return fill();
      T.calcAsked = true;
      const total = waterNeed(Object.keys(CROPS));
      let tries = 0;
      const m = openModal(`
        <div class="task-title"><span class="num"><img class="mod" src="assets/sprites/astro-point.png" alt=""></span><h2>${L('Сколько воды нужно?', 'How much water is needed?')}</h2></div>
        <p>${L('ASTRO: «Прежде чем наливать, посчитаем, сколько воды нужно всем грядкам сегодня».', 'ASTRO: “Before we pour, let’s work out how much water all the beds need today.”')}</p>
        <ul class="need-calc">${Object.entries(CROPS).map(([k, c]) => { const n = BEDS.filter(b => b === k).length; return `<li><b>${c.name}</b>: ${n} × ${cropNeed(k)} ${L('л', 'L')}</li>`; }).join('')}</ul>
        ${T.hot ? `<p class="warn"><b>${L('Сегодня жарко: картофелю нужно на 1 литр больше!', 'It’s hot today: potatoes need 1 litre more!')}</b></p>` : ''}
        <div class="calc"><span>${L('Всего:', 'Total:')}</span><input class="calc-input" inputmode="decimal" autocomplete="off"><span>${L('л', 'L')}</span><button class="btn orange calc-go">${L('Проверить', 'Check')}</button></div>
        <div class="calc-fb"></div>`);
      numberInput(m, total, () => {
        const trips = Math.ceil(total / CAN_CAP);
        m.querySelector('.calc-fb').innerHTML = `<div class="feedback ok">${L(`Верно, ${total} л! А лейка вмещает ${CAN_CAP} л — значит, наполнять её придётся ${trips} ${trips === 1 ? 'раз' : 'раза'}.`, `Correct, ${total} L! The can holds ${CAN_CAP} L, so you’ll need to fill it ${trips} time${trips === 1 ? '' : 's'}.`)}</div>`;
        ctx.after(1800, () => { closeModal(); fill(); });
      }, (v, fb) => {
        tries++;
        if (tries < 2) { fb.innerHTML = `<div class="feedback no">${L('Не так. Умножь число грядок на литры для каждой культуры и сложи.', 'Not quite. Multiply the number of beds by the litres for each crop and add up.')}</div>`; return; }
        fb.innerHTML = `<div class="feedback no">${L(`Правильный ответ — <b>${total} л</b>. Ничего, в следующий раз получится!`, `The right answer is <b>${total} L</b>. Never mind, you’ll get it next time!`)}</div><div class="actions"><button class="btn orange" data-fill>${L('Наполнить лейку', 'Fill the can')}</button></div>`;
        fb.querySelector('[data-fill]').onclick = () => { sfx.click(); closeModal(); fill(); };
      });
    }
    function plotUI(i) {
      if (!S.can.has) { say(L('Возьми лейку — она стоит у входа в теплицу.', 'Take the watering can — it’s by the greenhouse entrance.')); return; }
      if (S.can.liters < 0.05) { say(L('Лейка пустая — наполни её у бака с водой.', 'The can is empty — fill it at the water tank.')); return; }
    }
    // вызывается из 3D-мира, пока игрок держит кнопку полива над грядкой
    function pourCheck(i) {
      const T = S.today, prev = T.bedZone[i], z = bedZone(i);
      if (z === prev) return;
      T.bedZone[i] = z;
      if (z === 'ok') sfx.ok();
      if (z === 'wet') { sfx.bad(); sayOnce('wet', L('Осторожно! Это уже слишком много воды — корни могут испортиться. Нам нужно беречь воду на следующие дни.', 'Careful! That’s too much water — the roots can be damaged. We need to save water for the next days.'), 'alarm'); }
      if (!T.watered && T.bedZone.every(x => x === 'ok')) {
        T.watered = true;
        astroHide();
        say(L('Отлично! Растениям хватает воды. Не забывай проверять почву каждый сол!', 'Excellent! Your plants have enough water. Remember to check the soil every day!'), 'good');
      }
      renderHud();
    }
    function canEmpty() { sayOnce('empty', L('Лейка пустая — наполни её у бака с водой.', 'The can is empty — fill it at the water tank.')); renderHud(); }

    /* =================================================================
       ИГРА
       ================================================================= */
    function begin() {
      ctx.step(1);
      ctx.stage.classList.add('wide');
      newDay();
      buildHud();
      world = makeWorld();
      world.onReady = () => world.flyIn(() => astroSeq(INTRO, () => mapUI(true), L('Я готов!', 'I’m ready!')));
      ctx.every(250, tickClock);
    }

    /* ---------- часы: сол длится ~4 минуты ---------- */
    const DAY_SECONDS = 240;
    function tickClock() {
      if (!S.running || !world || world.paused || world.talk || S.done) return;
      S.time += 0.25 / DAY_SECONDS;
      const w = S.today.waitMsg;
      if (w && S.time >= w) { S.today.waitMsg = null; earthReply(); }
      if (S.day === DAYS && S.repair >= STEPS.length) S.time = Math.min(S.time, 0.97); // в день запуска ждём игрока
      const T = S.today;
      if (S.time > 0.55 && !T.watered) sayOnce('water', L('Растениям нужна вода! Проверь влажность почвы в теплице.', 'Your plants need water! Check the soil moisture in the greenhouse.'), 'alarm');
      if (S.time > 0.4 && !T.energyPlanned && evening() < nightNeed()) sayOnce('bat', L('Внимание! Заряда батарей может не хватить на ночь. Загляни в энергоблок.', 'Warning! Your battery level is getting low. Check the power room.'), 'alarm');
      if (S.time > 0.8) sayOnce('late', L('Скоро вечер! Закончи важные дела и ложись спать в жилом модуле.', 'Evening is coming! Finish the important tasks and go to bed in the habitat.'));
      if (S.time >= 1) { S.time = 1; endDay(L('Наступил вечер.', 'Evening has come.')); }
      renderClock();
    }

    function buildHud() {
      hud = h(`
        <div class="mars-hud">
          <div class="hud-top panel flat">
            <div class="hud-day screen"><span>${L('Сол', 'Sol')}</span><b class="d"></b><em class="clock"></em></div>
            <div class="hud-res"></div>
          </div>
          <div class="hud-tasks panel flat"><h3>${L('Дела на сол', 'Tasks for the sol')}</h3><ul></ul></div>
        </div>`);
      ctx.stage.appendChild(hud);
      renderHud();
    }
    function renderClock() {
      if (!hud) return;
      const hours = 6 + S.time * 14;
      hud.querySelector('.d').textContent = `${S.day} / ${DAYS}`;
      hud.querySelector('.clock').textContent = `${String(Math.floor(hours)).padStart(2, '0')}:${String(Math.floor((hours % 1) * 60)).padStart(2, '0')}`;
    }
    function renderHud() {
      if (!hud) return;
      renderClock();
      const res = [
        ['battery', L('Энергия', 'Energy'), `${Math.round(S.battery)}/${cap()} ${L('кВт·ч', 'kWh')}`, S.battery / cap(), true],
        ['recycler', L('Вода', 'Water'), `${Math.round(S.water)} ${L('л', 'L')}`, S.water / 100, S.water < 25],
        ['greenhouse', L('Еда', 'Food'), `${num(S.food, 1)} ${L('кг', 'kg')}`, S.food / 10, S.food < 2],
        ['shelter', L('Запчасти', 'Parts'), `${S.parts}`, S.parts / 5, S.parts < 2],
        ['habitat', L('Корабль', 'Ship'), `${S.repair}/${STEPS.length}`, S.repair / STEPS.length, false]
      ];
      hud.querySelector('.hud-res').innerHTML = res.map(([ic, n, v, p, low]) => `
        <div class="hr ${low && ic !== 'battery' ? 'low' : ''} ${ic === 'battery' && p < 0.25 ? 'low' : ''}">${icon(ic)}<div><span>${n}</span><b>${v}</b><i class="bar"><i style="width:${clamp(p, 0, 1) * 100}%"></i></i></div></div>`).join('');
      const T = S.today, tasks = [];
      tasks.push([T.watered, S.ghTutorial < 2 ? L('Теплица: проверить индикаторы', 'Greenhouse: check the indicators') : L(`Полить все грядки (зелёных: ${T.bedZone.filter(z => z === 'ok').length} из ${BEDS.length})`, `Water all beds (green: ${T.bedZone.filter(z => z === 'ok').length} of ${BEDS.length})`)]);
      tasks.push([T.energyPlanned, L('Рассчитать энергию на ночь (энергоблок)', 'Work out the night energy (power room)')]);
      if (S.dust > 0) tasks.push([T.cleaned >= PANEL_N || T.decidedDust, L(`Пыль на панелях (−${Math.round(dustLeft() * 100)}%): мыть или нет?`, `Dust on panels (−${Math.round(dustLeft() * 100)}%): wash or not?`)]);
      tasks.push([T.called, T.cleaning ? L('Связь сегодня невозможна — работают насосы', 'No contact today — the pumps are running')
        : T.waitMsg ? L('Ждём ответ с Земли…', 'Waiting for Earth’s reply…') : L('Связаться с Землёй (радио в жилом модуле)', 'Contact Earth (radio in the habitat)')]);
      if (S.instructions > S.repair) tasks.push([false, L(`Починить корабль: ${STEPS[S.repair].title}`, `Repair the ship: ${STEPS[S.repair].title}`), 'go']);
      Object.keys(S.broken).forEach(k => tasks.push([false, `${BREAK[k].name}: ${BREAK[k].effect}`, 'bad']));
      if (S.day === DAYS && S.repair >= STEPS.length) tasks.push([false, L('ЗАПУСК! Иди к кораблю', 'LIFT-OFF! Go to the ship'), 'go']);
      else tasks.push([false, L('Лечь спать — кровать в жилом модуле', 'Go to bed — in the habitat'), 'muted']);
      hud.querySelector('.hud-tasks ul').innerHTML = tasks.map(([ok, t, cls]) => `<li class="${ok ? 'ok' : ''} ${cls || ''}">${t}</li>`).join('');
      if (world) world.refresh();
    }

    function interact(id) {
      if (S.done) return;
      if (id === 'can') return canUI();
      if (id === 'tank') return tankUI();
      if (id.startsWith('ind-')) return indicatorUI(id.slice(4));
      if (id.startsWith('plot')) return plotUI(+id.slice(4));
      if (id === 'power') return powerUI();
      if (id === 'radio') return radioUI();
      if (id === 'bed') return sleepUI();
      if (id === 'storage') return storageUI();
      if (id === 'ship') return shipUI();
      if (id === 'drill' || id === 'antenna' || id === 'leak' || id === 'battery') return fixUI(id);
      if (id.startsWith('panel')) return cleanPanel(+id.slice(5));
    }

    /* ----- энергоблок: расчёт энергии на ночь ----- */
    function powerUI() {
      const T = S.today;
      const prod = production(), use = dayUse(), ev = evening();
      const m = openModal(`
        <div class="task-title"><span class="num">${icon('battery')}</span><h2>${L('Энергоблок', 'Power room')}</h2></div>
        <div class="energy-board screen">
          <div><span>${L('Сейчас в батареях', 'Batteries now')}</span><b>${Math.round(S.battery)}</b></div>
          <div><span>${L('Панели дадут за день', 'Panels give today')}</span><b>+${prod}</b><em>${dustLeft() > 0 ? L(`пыль −${Math.round(dustLeft() * 100)}%`, `dust −${Math.round(dustLeft() * 100)}%`) : L('панели чистые', 'panels clean')}</em></div>
          <div><span>${L('Станция потратит днём', 'Station uses by day')}</span><b>−${use}</b><em>${L('жизнеобеспечение 8', 'life support 8')}${drillOn() ? L(', бур 5', ', drill 5') : ''}${T.called ? L(', связь 3', ', radio 3') : ''}${T.cleaned ? L(', насосы 8', ', pumps 8') : ''}</em></div>
          <div class="hl"><span>${L('Будет к вечеру', 'By evening')}</span><b>${Math.round(ev)}</b><em>${L(`батареи вмещают ${cap()}`, `batteries hold ${cap()}`)}</em></div>
        </div>
        <h3>${L('Что работает ночью', 'What runs at night')}</h3>
        <div class="crop-list">
          <label class="crop locked"><input type="checkbox" checked disabled><span class="c-name">${L('Жизнеобеспечение', 'Life support')}</span><span class="c-need">1 ${L('кВт', 'kW')}</span><span class="c-hp">${L('нельзя выключить', 'can’t be off')}</span></label>
          <label class="crop"><input type="checkbox" data-s="heater" ${S.heaterNight ? 'checked' : ''}><span class="c-name">${L('Обогрев', 'Heating')}</span><span class="c-need">${T.heat} ${L('кВт', 'kW')}</span><span class="c-hp">${T.heat > 1 ? L('буря — холодно!', 'storm — it’s cold!') : L('без него прохладно', 'chilly without it')}</span></label>
          <label class="crop"><input type="checkbox" data-s="lamps" ${S.lampsNight ? 'checked' : ''}><span class="c-name">${L('Лампы теплицы', 'Greenhouse lamps')}</span><span class="c-need">1 ${L('кВт', 'kW')}</span><span class="c-hp">${L('без них растения −5', 'without them plants −5')}</span></label>
        </div>
        <label class="crop wide-row"><input type="checkbox" data-s="drill" ${S.drill ? 'checked' : ''} ${S.broken.drill ? 'disabled' : ''}><span class="c-name">${L('Ледяной бур (днём)', 'Ice drill (by day)')}</span><span class="c-need">${L('5 кВт·ч → +15 л воды', '5 kWh → +15 L water')}</span><span class="c-hp">${S.broken.drill ? L('сломан!', 'broken!') : ''}</span></label>
        <p>${L(`Ночь длится <b>${T.nightHours} ч</b>. Сколько кВт·ч понадобится за ночь включённым системам?`, `The night lasts <b>${T.nightHours} h</b>. How many kWh will the switched-on systems need for the night?`)}</p>
        <div class="calc"><span>${L('За ночь:', 'Night:')}</span><input class="calc-input" inputmode="decimal" autocomplete="off"><span>${L('кВт·ч', 'kWh')}</span><button class="btn orange calc-go">${L('Проверить', 'Check')}</button></div>
        <div class="calc-fb"></div>
        <div class="actions"><button class="btn ghost" data-close>${L('Отойти', 'Step away')}</button></div>`, null, true);
      m.querySelector('[data-close]').onclick = () => { sfx.click(); closeModal(); };
      m.querySelectorAll('[data-s]').forEach(cb => cb.onchange = () => {
        sfx.click();
        if (cb.dataset.s === 'heater') S.heaterNight = cb.checked;
        if (cb.dataset.s === 'lamps') S.lampsNight = cb.checked;
        if (cb.dataset.s === 'drill') S.drill = cb.checked;
        T.energyPlanned = false;
        powerUI();
      });
      numberInput(m, nightNeed(), () => {
        const ok = ev >= nightNeed();
        m.querySelector('.calc-fb').innerHTML = `<div class="feedback ${ok ? 'ok' : 'no'}">${L(`Верно: ${nightKW()} кВт × ${T.nightHours} ч = ${nightNeed()} кВт·ч.`, `Correct: ${nightKW()} kW × ${T.nightHours} h = ${nightNeed()} kWh.`)} ${ok
          ? L(`К вечеру будет ${Math.round(ev)} кВт·ч — хватит!`, `By evening there’ll be ${Math.round(ev)} kWh — enough!`)
          : L(`Но к вечеру будет только ${Math.round(ev)} кВт·ч — не хватит! Выключи что-нибудь и посчитай заново.`, `But by evening there’ll only be ${Math.round(ev)} kWh — not enough! Switch something off and work it out again.`)}</div>`;
        if (ok) { T.energyPlanned = true; ctx.after(1500, closeModal); }
        renderHud();
      }, (v, fb) => {
        fb.innerHTML = `<div class="feedback no">${L('Неверно. Сложи мощность всех включённых на ночь систем и умножь на число часов ночи.', 'Not right. Add up the power of all systems on at night and multiply by the hours of night.')}</div>`;
      });
    }

    /* ----- радиостанция: связь с Землёй (с задержкой) ----- */
    function radioUI() {
      const T = S.today;
      let body;
      if (T.waitMsg) body = L('Сигнал летит до Земли и обратно… Ответ придёт через несколько минут. Пока займись другими делами.', 'The signal is travelling to Earth and back… The reply will come in a few minutes. Do other tasks meanwhile.');
      else if (T.called) body = L('Сегодня связь уже была. Следующий сеанс — завтра.', 'You’ve already had contact today. The next session is tomorrow.');
      else if (T.cleaning) body = L('Связи нет: насосы для промывки панелей забрали всю свободную энергию. Попробуй завтра.', 'No contact: the panel-washing pumps took all the spare energy. Try tomorrow.');
      else if (S.broken.antenna) body = L('Антенна сбита с курса — сигнал не доходит до Земли. Почини антенну (нужна 1 запчасть).', 'The antenna is off course — the signal can’t reach Earth. Fix the antenna (needs 1 spare part).');
      const can = !body;
      const m = openModal(`
        <div class="task-title"><span class="num">${icon('antenna')}</span><h2>${L('Радиостанция', 'Radio station')}</h2></div>
        <div class="screen log-text">${body || L('Канал свободен. Передача потратит 3 кВт·ч. Сигнал до Земли идёт около 12 минут, поэтому ответ придёт не сразу.', 'The channel is clear. Transmitting uses 3 kWh. The signal takes about 12 minutes to reach Earth, so the reply won’t come at once.')}</div>
        ${S.msgs.length ? `<h3>${L('Сообщения с Земли', 'Messages from Earth')}</h3><ul class="log big">${S.msgs.slice().reverse().map(t => `<li>${t}</li>`).join('')}</ul>` : ''}
        <div class="actions">${can ? `<button class="btn orange" data-call>${L('Вызвать Землю', 'Call Earth')}</button>` : ''}<button class="btn ghost" data-close>${L('Отойти', 'Step away')}</button></div>`);
      m.querySelector('[data-close]').onclick = () => { sfx.click(); closeModal(); };
      const c = m.querySelector('[data-call]');
      if (c) c.onclick = () => {
        sfx.radio();
        T.called = true; T.energyPlanned = false;
        T.waitMsg = Math.min(0.95, S.time + 0.1);
        say(L('Сигнал отправлен. Пока он летит до Земли и обратно, займись делами. (Связь съела 3 кВт·ч — если ночь уже была рассчитана, пересчитай.)', 'Signal sent. While it travels to Earth and back, get on with your tasks. (The radio used 3 kWh — if you’d planned the night, check it again.)'));
        closeModal();
      };
    }
    function earthReply() {
      const parts = [];
      if (S.instructions < STEPS.length) {
        S.instructions++;
        const st = STEPS[S.instructions - 1];
        parts.push(`<b>${L('Инструкция', 'Instruction')} ${S.instructions}: ${st.title}.</b> ${st.text}`);
      } else parts.push(L('Все инструкции переданы. Вы молодцы!', 'All instructions sent. Well done!'));
      const next = PLAN[S.day + 1];
      if (next && next.dust) parts.push(L(`<b>Прогноз:</b> завтра пыльная буря, панели потеряют ${Math.round(next.dust * 100)}% мощности, а ночь будет холодной. Запасите энергию и воду!`, `<b>Forecast:</b> a dust storm tomorrow, panels will lose ${Math.round(next.dust * 100)}% of their power and the night will be cold. Store up energy and water!`));
      else if (next && next.hot) parts.push(L('<b>Прогноз:</b> завтра жарко, картофелю понадобится больше воды.', '<b>Forecast:</b> hot tomorrow, the potatoes will need more water.'));
      else if (next) parts.push(L('<b>Прогноз:</b> завтра спокойный сол.', '<b>Forecast:</b> a calm sol tomorrow.'));
      S.msgs.push(`${L('Сол', 'Sol')} ${S.day}: ${parts.join(' ')}`);
      ctx.mc(L('<b>Ответ для экипажа отправлен.</b> Новая инструкция уже на вашей радиостанции.', '<b>Reply sent to the crew.</b> The new instruction is on your radio station.'), 'good');
      say(L('Пришёл ответ с Земли! Прочитай его на радиостанции, а потом иди чинить корабль.', 'A reply from Earth has arrived! Read it at the radio station, then go and repair the ship.'), 'good');
      renderHud();
    }

    /* ----- ремонт корабля по инструкции ----- */
    function shipUI() {
      if (S.day === DAYS && S.repair >= STEPS.length) return launchUI();
      if (S.repair >= STEPS.length) { say(L(`Корабль полностью починен! Окно запуска откроется на ${DAYS}-й сол — продержись до него.`, `The ship is fully repaired! The launch window opens on sol ${DAYS} — hold out until then.`), 'good'); return; }
      if (S.instructions <= S.repair) { sfx.bad(); say(L('Без инструкции с Земли непонятно, что чинить дальше. Свяжись с Землёй по радио.', 'Without Earth’s instruction it’s unclear what to fix next. Contact Earth by radio.'), 'bad'); return; }
      const st = STEPS[S.repair];
      if (st.part && S.parts < 1) { sfx.bad(); say(L('Для этого шага нужна запчасть, а склад пуст!', 'This step needs a spare part, but the store is empty!'), 'bad'); return; }
      const m = openModal(`
        <div class="task-title"><span class="num">${S.repair + 1}</span><h2>${L('Ремонт', 'Repair')}: ${st.title}</h2></div>
        <div class="screen log-text">${st.text}</div>
        ${st.part ? `<p class="small muted">${L('На этот шаг уйдёт 1 запчасть со склада.', 'This step uses 1 spare part from the store.')}</p>` : ''}
        <h3>${st.q}</h3>
        ${st.opts ? `<div class="options">${shuffle(st.opts.slice()).map(o => `<button class="opt" data-o="${o}">${o}</button>`).join('')}</div>`
                  : `<div class="calc"><input class="calc-input" inputmode="decimal" autocomplete="off"><button class="btn orange calc-go">${L('Готово', 'Done')}</button></div>`}
        <div class="calc-fb"></div>
        <div class="actions"><button class="btn ghost" data-close>${L('Отойти', 'Step away')}</button></div>`);
      m.querySelector('[data-close]').onclick = () => { sfx.click(); closeModal(); };
      const fb = m.querySelector('.calc-fb');
      const done = () => {
        if (st.part) S.parts--;
        S.repair++;
        world.shipUpdate();
        fb.innerHTML = `<div class="feedback ok">${L(`Готово! Ремонт корабля: ${S.repair} из ${STEPS.length}.`, `Done! Ship repair: ${S.repair} of ${STEPS.length}.`)}</div>`;
        say(S.repair >= STEPS.length ? L(`Отлично! Корабль полностью починен! Взлетаем на ${DAYS}-й сол, когда откроется окно запуска.`, `The ship is repaired! We lift off on sol ${DAYS}, when the launch window opens.`)
                                        : L('Отлично! Система снова работает! Следующую инструкцию пришлёт Земля.', 'Great job! The system is working again! Earth will send the next instruction.'), 'good');
        ctx.after(1200, closeModal);
      };
      const wrong = b => { fb.innerHTML = `<div class="feedback no">${L('Не так.', 'Not quite.')} ${st.hint}</div>`; if (b) { b.classList.remove('wrong'); void b.offsetWidth; b.classList.add('wrong'); } };
      if (st.opts) m.querySelectorAll('.opt').forEach(b => b.onclick = () => {
        if (b.dataset.o === st.answer) { S.calcOk++; sfx.ok(); b.classList.add('right'); done(); } else { S.mistakes++; sfx.bad(); wrong(b); }
      });
      else numberInput(m, st.answer, done, () => wrong());
    }

    /* ----- склад ----- */
    function storageUI() {
      const need = STEPS.slice(S.repair).filter(s => s.part).length;
      openModal(`
        <div class="task-title"><span class="num">${icon('shelter')}</span><h2>${L('Склад запчастей', 'Spare parts store')}</h2></div>
        <p>${L(`На складе <b>${S.parts}</b> шт. Кораблю ещё нужно: <b>${need}</b>.`, `The store has <b>${S.parts}</b>. The ship still needs: <b>${need}</b>.`)}</p>
        <div class="fact">${L(`Значит, на поломки станции можно потратить не больше <b>${Math.max(0, S.parts - need)}</b>. Подумай заранее, что важнее всего.`, `So you can spend at most <b>${Math.max(0, S.parts - need)}</b> on station breakdowns. Think ahead about what matters most.`)}</div>
        <div class="actions"><button class="btn orange" data-close>${L('Понятно', 'Got it')}</button></div>`, m => {
        m.querySelector('[data-close]').onclick = () => { sfx.click(); closeModal(); };
      });
    }

    /* ----- поломки ----- */
    function fixUI(key) {
      if (!S.broken[key]) { sfx.click(); say(L('Здесь всё работает исправно.', 'Everything works fine here.'), 'good'); return; }
      const b = BREAK[key], need = STEPS.slice(S.repair).filter(s => s.part).length;
      openModal(`
        <div class="task-title"><span class="num">!</span><h2>${b.name}</h2></div>
        <p>${L('Пока не починено:', 'Until it’s fixed:')} <b>${b.effect}</b>.</p>
        <p>${L(`Ремонт займёт 1 запчасть. На складе: <b>${S.parts}</b>, кораблю ещё нужно: <b>${need}</b>.`, `The repair uses 1 spare part. In the store: <b>${S.parts}</b>, the ship still needs: <b>${need}</b>.`)}</p>
        ${S.parts <= need && S.parts > 0 ? `<div class="feedback no">${L('Если потратить запчасть сейчас, корабль будет нечем чинить!', 'If you use a part now, there’ll be nothing to repair the ship with!')}</div>` : ''}
        <div class="actions">${S.parts > 0 ? `<button class="btn orange" data-fix>${L('Починить', 'Fix it')}</button>` : `<span class="feedback no">${L('Запчастей нет!', 'No parts left!')}</span>`}<button class="btn ghost" data-close>${L('Не сейчас', 'Not now')}</button></div>`, m => {
        m.querySelector('[data-close]').onclick = () => { sfx.click(); closeModal(); };
        const f = m.querySelector('[data-fix]');
        if (f) f.onclick = () => {
          S.parts--; delete S.broken[key]; sfx.ok();
          say(L(`Отлично! Система снова работает! Починено: ${b.name.toLowerCase()}.`, `Great job! The system is working again! Fixed: ${b.name.toLowerCase()}.`), 'good');
          closeModal();
        };
      });
    }

    /* ----- промывка панелей ----- */
    function cleanPanel(i) {
      const T = S.today;
      if (!S.dust) { say(L('Панели чистые, промывать не нужно.', 'The panels are clean, no washing needed.')); return; }
      if (world.panelClean(i)) { say(L('Эта панель уже чистая.', 'This panel is already clean.')); return; }
      if (!T.cleaning) {
        if (T.called) { sfx.bad(); say(L('Сегодня уже была связь с Землёй — на насосы не хватит энергии. Промыть можно завтра.', 'You already contacted Earth today — not enough energy for the pumps. You can wash tomorrow.'), 'bad'); return; }
        openModal(`
          <div class="task-title"><span class="num">${icon('solar')}</span><h2>${L('Промыть панели?', 'Wash the panels?')}</h2></div>
          <p>${L(`Пыль отнимает <b>${Math.round(S.dust * 100)}%</b> энергии панелей: сегодня они дадут ${production()} кВт·ч вместо ${PANEL_N * PANEL_KWH}. Промывка одной панели — <b>2 литра</b> воды, а всего панелей ${PANEL_N}.`, `Dust steals <b>${Math.round(S.dust * 100)}%</b> of the panels’ energy: today they’ll give ${production()} kWh instead of ${PANEL_N * PANEL_KWH}. Washing one panel takes <b>2 litres</b> of water, and there are ${PANEL_N} panels.`)}</p>
          <p>${L('Насосы заберут <b>8 кВт·ч</b>, и сегодня <b>не будет связи с Землёй</b> — значит, не придёт новая инструкция.', 'The pumps take <b>8 kWh</b>, and today there will be <b>no contact with Earth</b> — so no new instruction.')}</p>
          <p>${L(`Воды сейчас: <b>${Math.round(S.water)} л</b>. Грядкам сегодня нужно ${waterNeed(Object.keys(CROPS))} л.`, `Water now: <b>${Math.round(S.water)} L</b>. The beds need ${waterNeed(Object.keys(CROPS))} L today.`)}</p>
          <div class="actions"><button class="btn orange" data-yes>${L('Включить насосы и мыть', 'Start the pumps and wash')}</button><button class="btn ghost" data-no>${L('Не мыть — беречь воду и связь', 'Don’t wash — save water and contact')}</button></div>`, m => {
          m.querySelector('[data-yes]').onclick = () => { sfx.click(); T.cleaning = true; T.energyPlanned = false; closeModal(); cleanPanel(i); };
          m.querySelector('[data-no]').onclick = () => { sfx.click(); T.decidedDust = true; closeModal(); say(L('Решили не мыть панели. Энергии будет меньше — продумай ночь.', 'Decided not to wash the panels. There’ll be less energy — plan the night carefully.')); };
        });
        return;
      }
      if (S.water < 2) { sfx.bad(); say(L('Вода закончилась — мыть нечем!', 'Out of water — nothing to wash with!'), 'bad'); return; }
      S.water -= 2; T.cleaned++; sfx.ok();
      world.panelSet(i, true);
      say(T.cleaned >= PANEL_N ? L('Все панели чистые! Энергии сегодня будет больше. Не забудь пересчитать ночь.', 'All panels are clean! More energy today. Don’t forget to re-plan the night.')
                                  : L(`Панель промыта (${T.cleaned} из ${PANEL_N}). Потрачено ${T.cleaned * 2} л воды.`, `Panel washed (${T.cleaned} of ${PANEL_N}). ${T.cleaned * 2} L of water used.`), 'good');
      if (T.cleaned >= PANEL_N) T.decidedDust = true;
      renderHud();
    }

    /* =================================================================
       КОНЕЦ СОЛА: ночь, итоги, последствия
       ================================================================= */
    function sleepUI() {
      if (S.day === DAYS && S.repair >= STEPS.length) { say(L('Сегодня не время спать — окно запуска открыто! Иди к кораблю.', 'No time to sleep today — the launch window is open! Go to the ship.'), 'alarm'); return; }
      const T = S.today, miss = [];
      if (!T.watered) miss.push(L('грядки не политы', 'beds not watered'));
      if (!T.energyPlanned) miss.push(L('энергия на ночь не рассчитана', 'night energy not worked out'));
      if (T.waitMsg) miss.push(L('ответ с Земли ещё не пришёл', 'Earth’s reply hasn’t arrived yet'));
      openModal(`
        <div class="task-title"><span class="num">${icon('habitat')}</span><h2>${L('Закончить сол?', 'End the sol?')}</h2></div>
        ${miss.length ? `<div class="feedback no">${L('Не сделано', 'Not done')}: ${miss.join(', ')}.</div>` : `<p>${L('Главные дела сделаны. Можно отдохнуть.', 'The main tasks are done. Time to rest.')}</p>`}
        <div class="actions"><button class="btn orange" data-yes>${L('Спать', 'Sleep')}</button><button class="btn ghost" data-no>${L('Ещё поработаю', 'Keep working')}</button></div>`, m => {
        m.querySelector('[data-yes]').onclick = () => { sfx.click(); closeModal(); endDay(L('Экипаж лёг спать.', 'The crew went to sleep.')); };
        m.querySelector('[data-no]').onclick = () => { sfx.click(); closeModal(); };
      });
    }

    function endDay(why) {
      if (S.done || !S.running) return;
      S.running = false;
      const T = S.today, lines = [];
      if (T.waitMsg) { T.waitMsg = null; earthReply(); }
      const prod = production(), use = dayUse();
      S.battery = evening();
      lines.push(L(`Панели дали +${prod} кВт·ч, станция потратила ${use}.`, `Panels gave +${prod} kWh, the station used ${use}.`));
      if (drillOn()) { S.water += 15; lines.push(L('Ледяной бур добыл 15 л воды.', 'The ice drill mined 15 L of water.')); }
      if (S.broken.leak) { S.water -= 8; lines.push(L('Протечка в теплице: потеряно 8 л воды.', 'Greenhouse leak: 8 L of water lost.')); }
      S.water -= 3;
      let dry = 0, wet = 0;
      S.beds.forEach((b, i) => {
        const z = bedZone(i);
        if (z === 'ok') b.hp = clamp(b.hp + 12, 0, 100);
        else if (z === 'dry') { dry++; b.hp = clamp(b.hp - (T.bedWater[i] > 0 ? 12 : 25), 0, 100); }
        else { wet++; b.hp = clamp(b.hp - 10, 0, 100); }
      });
      if (!dry && !wet) lines.push(L('Все грядки политы как надо — растения подросли.', 'All beds were watered just right — the plants have grown.'));
      if (dry) lines.push(L(`Сухих грядок: ${dry} — растения вянут.`, `Dry beds: ${dry} — the plants are wilting.`));
      if (wet) lines.push(L(`Перелитых грядок: ${wet} — у растений болят корни.`, `Over-watered beds: ${wet} — the roots are suffering.`));
      if (!S.lampsNight) S.beds.forEach(b => { b.hp = clamp(b.hp - 5, 0, 100); });
      if (!S.heaterNight && T.heat > 1) S.beds.forEach(b => { b.hp = clamp(b.hp - 10, 0, 100); });
      const need = nightNeed();
      if (!T.energyPlanned) lines.push(L('Энергию на ночь не проверили.', 'The night energy wasn’t checked.'));
      S.battery -= need;
      lines.push(L(`Ночью ушло ${need} кВт·ч (${nightKW()} кВт × ${T.nightHours} ч).`, `The night took ${need} kWh (${nightKW()} kW × ${T.nightHours} h).`));
      if (S.battery < 0) {
        S.battery = 0; S.blackouts++;
        S.beds.forEach(b => { b.hp = clamp(b.hp - 30, 0, 100); });
        lines.push(L(`<b>Ночью станция обесточилась!</b> Растения замёрзли. ${S.blackouts === 1 ? 'Ещё одно отключение — и экипаж придётся эвакуировать.' : ''}`, `<b>The station blacked out at night!</b> The plants froze. ${S.blackouts === 1 ? 'One more blackout and the crew must be evacuated.' : ''}`));
      }
      if ((PLAN[S.day] || {}).harvest) {
        const kg = S.beds.reduce((a, b) => a + (b.crop === 'potato' ? 2.2 : 0.8) * b.hp / 100, 0);
        S.food += kg;
        lines.push(L(`<b>Урожай!</b> Собрано ${num(kg, 1)} кг картофеля и овощей. Чем здоровее грядки, тем больше урожай.`, `<b>Harvest!</b> ${num(kg, 1)} kg of potatoes and vegetables picked. Healthier beds give a bigger harvest.`));
      }
      S.food -= 1;
      lines.push(L('Экипаж съел 1 кг еды и выпил 3 л воды.', 'The crew ate 1 kg of food and drank 3 L of water.'));
      S.water = Math.max(0, S.water); S.food = Math.max(0, S.food);
      // прогноз воды: думай наперёд
      const net = (drillOn() ? 15 : 0) - 3 - waterNeed(Object.keys(CROPS)) - (S.broken.leak ? 8 : 0);
      if (net < 0 && S.day < DAYS) {
        const left = Math.floor(S.water / -net);
        lines.push(L(`<b>Прогноз воды:</b> каждый сол запас уменьшается примерно на ${-net} л. Воды хватит ещё на ${left} ${left === 1 ? 'сол' : left < 5 && left > 0 ? 'сола' : 'солов'}${left < DAYS - S.day ? ' — этого мало! Почини бур или протечку.' : '.'}`,
                          `<b>Water forecast:</b> the stock drops by about ${-net} L each sol. Water will last ${left} more sol${left === 1 ? '' : 's'}${left < DAYS - S.day ? ' — not enough! Fix the drill or the leak.' : '.'}`));
      }
      let fail = null;
      if (S.food <= 0) fail = L('Еда закончилась — экипажу нечего есть.', 'The food ran out — the crew has nothing to eat.');
      else if (S.water <= 0) fail = L('Вода закончилась.', 'The water ran out.');
      else if (S.blackouts >= 2) fail = L('Станция дважды обесточилась ночью — экипаж замёрз, и его пришлось эвакуировать.', 'The station blacked out twice at night — the crew froze and had to be evacuated.');
      else if (S.day >= DAYS) fail = L('Окно запуска закрылось, а корабль так и не починили.', 'The launch window closed and the ship was never repaired.');
      openModal(`
        <div class="eyebrow">${L('Ночь', 'Night')} · ${L('сол', 'sol')} ${S.day}</div>
        <h2>${why}</h2>
        <ul class="log big">${lines.map(l => `<li>${l}</li>`).join('')}</ul>
        <div class="night-res">
          <span>${icon('battery')}<b>${Math.round(S.battery)} ${L('кВт·ч', 'kWh')}</b></span><span>${icon('recycler')}<b>${Math.round(S.water)} ${L('л', 'L')}</b></span>
          <span>${icon('greenhouse')}<b>${num(S.food, 1)} ${L('кг', 'kg')}</b></span><span>${icon('habitat')}<b>${S.repair}/${STEPS.length}</b></span>
        </div>
        <div class="actions"><button class="btn orange big">${fail ? L('Дальше', 'Continue') : L(`Утро сола ${S.day + 1} →`, `Morning of sol ${S.day + 1} →`)}</button></div>`, m => {
        m.querySelector('button').onclick = () => {
          sfx.click(); closeModal();
          if (fail) {
            S.done = true; world.stop();
            ctx.fail(fail, L('Каждый сол поливай точно по расчёту, проверяй энергию на ночь и не пропускай связь с Землёй слишком часто — без инструкций корабль не починить.', 'Every sol water exactly as calculated, check the night energy and don’t skip contact with Earth too often — without instructions the ship can’t be fixed.'));
            return;
          }
          S.day++; newDay();
          world.morning();
          const p = PLAN[S.day] || {};
          const news = [];
          if (p.dust) news.push(L(`Ночью прошла пыльная буря: панели потеряли ${Math.round(p.dust * 100)}% мощности.`, `A dust storm passed in the night: the panels lost ${Math.round(p.dust * 100)}% of their power.`));
          else if (S.dust) news.push(L(`Ветер сдул часть пыли, осталось −${Math.round(S.dust * 100)}%.`, `The wind blew some dust away, −${Math.round(S.dust * 100)}% left.`));
          if (p.hot) news.push(L('Сегодня жарко — картофелю нужно больше воды.', 'It’s hot today — the potatoes need more water.'));
          if (p.brk) news.push(L(`<b>Поломка:</b> ${BREAK[p.brk].name.toLowerCase()}!`, `<b>Breakdown:</b> ${BREAK[p.brk].name.toLowerCase()}!`));
          if (p.harvest) news.push(L('Вечером — сбор урожая!', 'Harvest this evening!'));
          if (S.day === DAYS) news.push(S.repair >= STEPS.length ? L('<b>Окно запуска открыто!</b> Иди к кораблю.', '<b>The launch window is open!</b> Go to the ship.') : L('<b>Последний сол!</b> Окно запуска открыто — успей закончить ремонт.', '<b>Last sol!</b> The launch window is open — finish the repair in time.'));
          if (S.battery < cap() * 0.3) news.push(L('<b>Внимание! Заряд батарей низкий.</b> Береги энергию.', '<b>Warning! Your battery level is getting low.</b> Save energy.'));
          if (S.water < 30) news.push(L('<b>Осторожно! Воды мало</b> — нужно беречь её на следующие дни.', '<b>Careful! Water is low</b> — we need to save it for the next days.'));
          news.push(L('Не забудь полить грядки!', 'Don’t forget to water the beds!'));
          const bad = p.brk || p.dust || S.battery < cap() * 0.3 || S.water < 30;
          astroSeq([[`${L('Доброе утро! Сол', 'Good morning! Sol')} ${S.day}. ${news.join(' ')}`, bad ? 'alarm' : 'wave']], null, L('Вперёд!', 'Let’s go!'));
          S.running = true; renderHud();
        };
      });
    }

    /* =================================================================
       ВЗЛЁТ
       ================================================================= */
    function launchUI() {
      S.done = true; S.running = false;
      ctx.step(2, true);
      const m = openModal(`
        <div class="scene launch" style="background-image:url('${A}mars-launch.jpg')"><div class="count">5</div></div>
        <h2>${L('Взлёт!', 'Lift-off!')}</h2>
        <p>${L('«Звёздный вихрь» покидает Марс. Курс — домой, на Землю.', 'The “Star Whirl” is leaving Mars. Course: home, to Earth.')}</p>`);
      const c = m.querySelector('.count'), scene = m.querySelector('.scene');
      let n = 5; sfx.alarm();
      const id = ctx.every(800, () => {
        n--;
        if (n > 0) { c.textContent = n; sfx.click(); return; }
        clearInterval(id); c.textContent = L('Пуск!', 'Go!'); scene.classList.add('go'); sfx.win();
        ctx.after(2600, () => { closeModal(); world.stop(); finish(); });
      });
    }
    function finish() {
      const garden = Math.round(S.beds.reduce((a, b) => a + b.hp, 0) / S.beds.length);
      let score = 3;
      const notes = [{ ok: true, text: L(`Экипаж продержался ${DAYS} солов и улетел домой!`, `The crew survived ${DAYS} sols and flew home!`) }];
      notes.push({ ok: S.mistakes <= 3, text: L(`Расчётов верно: ${S.calcOk}, ошибок: ${S.mistakes}.`, `Correct calculations: ${S.calcOk}, mistakes: ${S.mistakes}.`) });
      if (S.mistakes > 3) score--;
      if (S.blackouts) { score--; notes.push({ ok: false, text: L('Однажды станция обесточилась ночью. Считай энергию заранее.', 'Once the station blacked out at night. Work out the energy in advance.') }); }
      notes.push({ ok: garden >= 60, text: L(`Здоровье теплицы к концу: ${garden}%.`, `Greenhouse health at the end: ${garden}%.`) });
      if (garden < 40) score--;
      ctx.finish(score, notes);
    }

    /* =================================================================
       3D-МИР: яркий мультяшный Марс со станцией
       ================================================================= */
    function makeWorld() {
      const touch = Game.isTouch;
      const self = { paused: false, talk: false, goal: null, places: [], stop, refresh() {}, plantsUpdate() {}, shipUpdate() {}, morning() {}, panelClean() { return false; }, panelSet() {},
        astroShow() {}, astroHide() {}, flyIn(done) { done(); }, drawBigMap() {}, onReady: null };
      let running = true, renderer = null, onResize = null;
      const el = h(`
        <div class="fp ${touch ? 'is-touch' : ''}">
          <div class="fp-view">
            <div class="fp-canvas"></div>
            <div class="fp-loading screen"><b>${L('Загружаю 3D-мир Марса…', 'Loading the 3D world of Mars…')}</b><i class="bar"><i></i></i></div>
            <div class="fp-compass"><span class="arrow">▲</span><span class="dist"></span></div>
            <canvas class="fp-map" width="120" height="120"></canvas>
            <div class="fp-prompt" hidden></div>
            <div class="fp-cross"></div>
            <div class="fp-tools"><button class="btn small ghost" data-map>${L('Карта', 'Map')}</button><button class="btn small ghost" data-help>${L('Спросить ASTRO', 'Ask ASTRO')}</button></div>
            <div class="fp-can" hidden><span>${L('Лейка', 'Can')}</span><b></b><i class="bar"><i></i></i></div>
            <div class="astro-box" hidden><img class="astro-img" src="assets/sprites/astro-wave.png" alt="ASTRO"><div class="astro-body"><b class="astro-name">ASTRO</b><p class="astro-text"></p><div class="astro-btns"></div></div></div>
          </div>
          ${touch ? `<div class="pad panel flat">
            <div class="joy" aria-label="${L('Джойстик', 'Joystick')}"><div class="joy-base"><div class="joy-knob"></div></div></div>
            <button class="btn orange big fp-act">${L('Действие', 'Action')}</button>
          </div>` : `<div class="fp-bar panel flat"><div class="hint-keys"><span class="kbd">W A S D</span> / <span class="kbd">↑↓←→</span> ${L('ходить', 'move')} · ${L('тяни мышью — осмотреться', 'drag mouse — look around')} · <span class="kbd">E</span> ${L('действие', 'action')}</div></div>`}
        </div>`);
      hud.before(el);
      const holder = el.querySelector('.fp-canvas');
      const loadingEl = el.querySelector('.fp-loading'), loadBar = loadingEl.querySelector('.bar i');
      const mapCv = el.querySelector('.fp-map'), mg = mapCv.getContext('2d');
      const promptEl = el.querySelector('.fp-prompt');
      const arrowEl = el.querySelector('.fp-compass .arrow'), distEl = el.querySelector('.fp-compass .dist');
      astroBox = el.querySelector('.astro-box');
      const canEl = el.querySelector('.fp-can');
      el.querySelector('[data-map]').onclick = () => { sfx.click(); if (S.started && !self.talk) mapUI(false); };
      el.querySelector('[data-help]').onclick = () => { sfx.click(); if (S.started && !self.talk) hint(); };

      function stop() {
        running = false;
        if (onResize) window.removeEventListener('resize', onResize);
        if (renderer) { renderer.dispose(); renderer.forceContextLoss(); renderer = null; }
      }
      ctx.onCleanup(stop);

      import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js')
        .then(THREE => { if (running) init(THREE); })
        .catch(() => { loadingEl.innerHTML = `<b>${L('Не получилось загрузить 3D-движок.', 'Couldn’t load the 3D engine.')}</b><span>${L('Для этого испытания нужен интернет.', 'This challenge needs the internet.')}</span>`; });

      function init(THREE) {
        const clamp01 = v => Math.max(0, Math.min(1, v));
        const smooth = (e0, e1, v) => { const t = clamp01((v - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
        let seed = 11;
        const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

        /* ---------- план станции ---------- */
        const DOMES = [
          { id: 'habitat', x: 0, z: 0, R: 6, doors: [Math.PI / 2, Math.PI, 0], outside: Math.PI / 2, name: L('Жилой модуль', 'Habitat') },
          { id: 'greenhouse', x: -17, z: 0, R: 6.5, doors: [0], glass: true, name: L('Теплица', 'Greenhouse') },
          { id: 'power', x: 16, z: 0, R: 5.2, doors: [Math.PI], name: L('Энергоблок', 'Power room') }
        ];
        const HB = DOMES[0], GH = DOMES[1], PW = DOMES[2];
        // проходы: вход в жилой модуль снаружи и два закрытых коридора (в теплицу и энергоблок только через жилой модуль)
        const passage = (d, dir, len) => ({ sx: d.x + Math.cos(dir) * (d.R - 1.4), sz: d.z + Math.sin(dir) * (d.R - 1.4), dx: Math.cos(dir), dz: Math.sin(dir), len });
        const PASSAGES = [
          passage(HB, Math.PI / 2, 3.2),
          Object.assign(passage(HB, Math.PI, Math.abs(GH.x) - (HB.R - 1.4) - (GH.R - 1.4)), { to: GH }),
          Object.assign(passage(HB, 0, PW.x - (HB.R - 1.4) - (PW.R - 1.4)), { to: PW })
        ];
        const SHIP = { x: 6, z: 24 }, DRILL = { x: -22, z: 13 }, ANT = { x: -9, z: 21 };
        // точки пультов в мировых координатах
        const POS = {
          garden: { x: GH.x + 4.4, z: GH.z + 2.6 }, tank: { x: GH.x + 3.0, z: GH.z + 4.4 }, power: { x: PW.x, z: PW.z - 3.4 }, radio: { x: 3.0, z: -2.6 },
          bed: { x: -3.1, z: -2.2 }, storage: { x: -2.8, z: 2.6 }, leak: { x: GH.x - 5.4, z: GH.z }, battery: { x: PW.x + 2.8, z: PW.z }
        };
        const PANELS = [];
        for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) PANELS.push({ x: 10 + c * 4.2, z: 9 + r * 5, clean: true });

        function groundH(x, z) {
          const r = Math.hypot(x, z);
          const dunes = 1.4 * Math.sin(x * 0.06 + z * 0.04) + 0.9 * Math.sin(z * 0.09 - x * 0.03 + 1.3) + 0.4 * Math.sin((x + z) * 0.17) + 1.4;
          const flat = smooth(36, 28, r);
          return dunes * (1 - flat) + smooth(56, 82, r) * 30;
        }

        /* ---------- рендер ---------- */
        renderer = new THREE.WebGLRenderer({ antialias: !touch, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, touch ? 1.25 : 1.75));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        holder.appendChild(renderer.domElement);
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xc8b4ff);
        scene.fog = new THREE.Fog(0xffcdb8, 70, 200);
        const camera = new THREE.PerspectiveCamera(72, 16 / 9, 0.05, 800);
        camera.rotation.order = 'YXZ';
        onResize = () => {
          const w = holder.clientWidth || 640, hh = Math.round(w * 9 / 16);
          renderer.setSize(w, hh, false);
          camera.aspect = w / hh; camera.updateProjectionMatrix();
        };
        window.addEventListener('resize', onResize);
        onResize();
        const manager = new THREE.LoadingManager();
        manager.onProgress = (u, d, t) => { loadBar.style.width = Math.round(d / t * 100) + '%'; };
        let readyFired = false;
        const fireReady = () => { if (readyFired) return; readyFired = true; loadingEl.hidden = true; if (self.onReady) self.onReady(); };
        manager.onLoad = fireReady;
        ctx.after(8000, fireReady);
        manager.onError = () => {};
        const loader = new THREE.TextureLoader(manager);
        const tex = (file, rx = 1, ry = 1) => {
          const t = loader.load(file);
          t.colorSpace = THREE.SRGBColorSpace;
          t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping;
          t.repeat.set(rx, ry); t.anisotropy = 4;
          return t;
        };
        const canvasTex = (w, hh, draw) => {
          const c = document.createElement('canvas'); c.width = w; c.height = hh;
          draw(c.getContext('2d'), w, hh);
          const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
        };

        /* ---------- мультяшный стиль: toon-материалы и контуры ---------- */
        const grad = new THREE.DataTexture(new Uint8Array([110, 185, 255]), 3, 1, THREE.RedFormat);
        grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
        const toon = (color, extra = {}) => new THREE.MeshToonMaterial(Object.assign({ color, gradientMap: grad }, extra));
        const outlineCache = {};
        function outlineMat(th) {
          if (outlineCache[th]) return outlineCache[th];
          const m = new THREE.MeshBasicMaterial({ color: 0x2b2a6b, side: THREE.BackSide });
          m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `vec3 transformed = position + normal * ${th.toFixed(3)};`); };
          m.customProgramCacheKey = () => 'outline' + th;
          return (outlineCache[th] = m);
        }
        function add(mesh, parent = scene, th = 0.05) {
          parent.add(mesh);
          if (th) mesh.add(new THREE.Mesh(mesh.geometry, outlineMat(th)));
          return mesh;
        }

        /* ---------- свет и небо ---------- */
        scene.add(new THREE.HemisphereLight(0xfff4ec, 0xf0a080, 1.35));
        const sun = new THREE.DirectionalLight(0xfff4e0, 2.0);
        sun.position.set(-50, 90, 60); scene.add(sun);
        const skyT = canvasTex(4, 256, (g) => {
          const gr = g.createLinearGradient(0, 0, 0, 256);
          gr.addColorStop(0, '#8f7dff'); gr.addColorStop(0.45, '#c1acff'); gr.addColorStop(0.78, '#ffc2d8'); gr.addColorStop(1, '#ffd6b8');
          g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
        });
        scene.add(new THREE.Mesh(new THREE.SphereGeometry(360, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), new THREE.MeshBasicMaterial({ map: skyT, side: THREE.BackSide, fog: false })).translateY(-40));
        // облачка
        const cloudT = canvasTex(256, 128, g => {
          g.fillStyle = 'rgba(255,255,255,0.85)';
          [[70, 80, 46], [125, 62, 56], [185, 82, 42], [128, 92, 40]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); });
        });
        for (let i = 0; i < 9; i++) {
          const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudT, transparent: true, fog: false, depthWrite: false, opacity: 0.55 }));
          const a = i / 9 * Math.PI * 2 + 0.3; s.position.set(Math.cos(a) * 230, 70 + (i % 3) * 22, Math.sin(a) * 230); s.scale.set(90, 45, 1); scene.add(s);
        }
        // солнце и спутники
        const glowT = canvasTex(128, 128, g => {
          const gr = g.createRadialGradient(64, 64, 6, 64, 64, 64);
          gr.addColorStop(0, 'rgba(255,255,240,1)'); gr.addColorStop(0.25, 'rgba(255,236,190,0.9)'); gr.addColorStop(1, 'rgba(255,200,150,0)');
          g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
        });
        const sunSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, fog: false, transparent: true, depthWrite: false }));
        sunSpr.scale.set(70, 70, 1); sunSpr.position.set(-160, 170, 190); scene.add(sunSpr);
        [[150, 150, -220, 26], [-230, 110, -60, 12]].forEach(([x, y, z, s]) => {
          const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(A + 'obj-phobos.png'), fog: false, transparent: true }));
          m.scale.set(s, s, 1); m.position.set(x, y, z); scene.add(m);
        });

        /* ---------- грунт: яркие персиковые дюны ---------- */
        const gGeo = new THREE.PlaneGeometry(220, 220, 170, 170);
        gGeo.rotateX(-Math.PI / 2);
        const gp = gGeo.attributes.position;
        for (let i = 0; i < gp.count; i++) gp.setY(i, groundH(gp.getX(i), gp.getZ(i)));
        gGeo.computeVertexNormals();
        scene.add(new THREE.Mesh(gGeo, toon(0xffbf98, { map: tex(A + 'tex-mars-sand.jpg', 26, 26) })));
        // площадка станции; дорожки нарисованы прямо на ней, концы скруглены
        const PAD_R = 29, PAD_PX = 2048;
        const padT = canvasTex(PAD_PX, PAD_PX, g => {
          const k = PAD_PX / (PAD_R * 2), X = x => (x + PAD_R) * k, Z = z => (z + PAD_R) * k;
          g.fillStyle = '#f9c3a2'; g.fillRect(0, 0, PAD_PX, PAD_PX);
          for (let i = 0; i < 260; i++) { g.fillStyle = i % 2 ? 'rgba(240,170,130,0.35)' : 'rgba(255,215,190,0.35)'; g.beginPath(); g.arc((i * 733) % PAD_PX, (i * 389) % PAD_PX, 8 + (i % 7) * 5, 0, 7); g.fill(); }
          g.strokeStyle = '#fff4ea'; g.lineWidth = 1.6 * k; g.lineCap = 'round'; g.lineJoin = 'round';
          [
            [[0, 7.6], [0, 14], [4.5, 19.3]],      // от входа к кораблю
            [[0, 11], [-10, 13], [-19.3, 13]],     // к ледяному буру
            [[-3.5, 12], [-6.5, 13.5], [-8.3, 18.6]], // к антенне
            [[0, 11], [7, 11.5], [24.5, 11.5]]     // между рядами панелей
          ].forEach(([p0, c, p1]) => { g.beginPath(); g.moveTo(X(p0[0]), Z(p0[1])); g.quadraticCurveTo(X(c[0]), Z(c[1]), X(p1[0]), Z(p1[1])); g.stroke(); });
        });
        padT.anisotropy = 8;
        const pad = new THREE.Mesh(new THREE.CircleGeometry(PAD_R, 96), toon(0xffffff, { map: padT }));
        pad.rotation.x = -Math.PI / 2; pad.position.y = 0.02; scene.add(pad);
        const padRing = new THREE.Mesh(new THREE.RingGeometry(PAD_R - 0.4, PAD_R + 0.2, 96), toon(0xff9a3c));
        padRing.rotation.x = -Math.PI / 2; padRing.position.y = 0.03; scene.add(padRing);

        /* ---------- скалы ---------- */
        const obstacles = [];
        function jitter(geo, a) {
          const p = geo.attributes.position;
          for (let i = 0; i < p.count; i++) {
            const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
            const k = 1 + (Math.sin(x * 2.1 + y * 1.3) * Math.cos(z * 1.7 - y * 0.9) + Math.sin((x + z) * 3.3) * 0.5) * a;
            p.setXYZ(i, x * k, y * k, z * k);
          }
          geo.computeVertexNormals(); return geo;
        }
        const rockColors = [0xe8785a, 0xdf6a4a, 0xf39466, 0xd2664e];
        const rockGeo = jitter(new THREE.IcosahedronGeometry(1, 2), 0.18);
        for (let i = 0; i < 50; i++) {
          const a = rnd() * Math.PI * 2, r = 33 + rnd() * 27;
          const x = Math.cos(a) * r, z = Math.sin(a) * r;
          const s = r > 52 ? 4 + rnd() * 5 : 0.8 + rnd() * 2.2;
          const m = new THREE.Mesh(rockGeo, toon(rockColors[i % 4]));
          m.scale.set(s * (1 + rnd() * 0.5), s * (0.6 + rnd() * 0.5), s);
          m.position.set(x, groundH(x, z) + s * 0.1, z); m.rotation.set(rnd(), rnd() * 6, rnd());
          add(m, scene, 0.05);
          if (r < 52) obstacles.push({ x, z, r: s * 1.05 });
        }
        // мелкие камушки на площадке
        for (let i = 0; i < 30; i++) {
          const a = rnd() * Math.PI * 2, r = 8 + rnd() * 20, x = Math.cos(a) * r, z = Math.sin(a) * r;
          if (DOMES.some(d => Math.hypot(x - d.x, z - d.z) < d.R + 3) || PANELS.some(p => Math.hypot(x - p.x, z - p.z) < 3)) continue;
          const m = new THREE.Mesh(rockGeo, toon(rockColors[i % 4])); m.scale.setScalar(0.15 + rnd() * 0.25); m.position.set(x, 0.05, z); scene.add(m);
        }
        // столовые горы вдали
        [[-48, -30, 7, 14], [40, -42, 6, 11], [55, 20, 8, 16], [-55, 25, 6, 12], [5, -58, 9, 15], [-20, 55, 7, 10]].forEach(([x, z, r, hgt]) => {
          const m = new THREE.Mesh(jitter(new THREE.CylinderGeometry(r * 0.75, r, hgt, 16, 5), 0.07), toon(0xe27a58));
          m.position.set(x, groundH(x, z) + hgt / 2 - 1, z); add(m, scene, 0.08);
          const top = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.72, r * 0.76, 0.6, 16), toon(0xffb48a)); top.position.set(x, groundH(x, z) + hgt - 0.9, z); scene.add(top);
        });

        /* ---------- материалы станции ---------- */
        const white = toon(0xf7f5ff), lav = toon(0xd9d4ff), orange = toon(0xff9a3c), steel = toon(0x9a96d0), dark = toon(0x3b3770), cyan = toon(0x5fd8ff);

        /* ---------- купола станции ---------- */
        const arch = (s, w, hgt) => { const r = w / 2; s.moveTo(-r, 0); s.lineTo(r, 0); s.lineTo(r, hgt - r); s.absarc(0, hgt - r, r, 0, Math.PI, false); s.lineTo(-r, 0); return s; };
        function canvasSign(text, color) {
          const t = canvasTex(512, 128, g => {
            g.fillStyle = color; g.beginPath(); if (g.roundRect) g.roundRect(6, 6, 500, 116, 30); else g.rect(6, 6, 500, 116); g.fill();
            g.lineWidth = 8; g.strokeStyle = '#2b2a6b'; g.stroke();
            g.fillStyle = '#fff'; g.font = '800 54px Nunito, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
            g.fillText(text, 256, 66);
          });
          return new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.85), new THREE.MeshBasicMaterial({ map: t, transparent: true }));
        }
        // пол модулей: мягкая плитка и круглый коврик
        const floorT = canvasTex(512, 512, g => {
          g.fillStyle = '#e6e1ff'; g.fillRect(0, 0, 512, 512);
          g.strokeStyle = '#cfc8f7'; g.lineWidth = 6;
          for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 512); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(512, i * 64); g.stroke(); }
          g.fillStyle = '#b9b0f5'; g.beginPath(); g.arc(256, 256, 120, 0, 7); g.fill();
          g.fillStyle = '#f2efff'; g.beginPath(); g.arc(256, 256, 100, 0, 7); g.fill();
          g.strokeStyle = '#ff9a3c'; g.lineWidth = 10; g.beginPath(); g.arc(256, 256, 70, 0, 7); g.stroke();
        });
        function dome(d) {
          const g = new THREE.Group(); g.position.set(d.x, 0, d.z); scene.add(g);
          const RING = Math.asin(Math.min(0.9, 2.65 / d.R)); // высота пояса с проёмами
          const gap = Math.asin(1.1 / d.R);
          const shellMat = d.glass
            ? new THREE.MeshToonMaterial({ color: 0xc4f0ff, gradientMap: grad, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false })
            : toon(0xf7f5ff, { side: THREE.DoubleSide });
          const capM = new THREE.Mesh(new THREE.SphereGeometry(d.R, 56, 22, 0, Math.PI * 2, 0, Math.PI / 2 - RING), shellMat);
          if (d.glass) g.add(capM); else add(capM, g, 0.07);
          // нижний пояс и цоколь — кусками между проёмами
          const TAU = Math.PI * 2, norm = a => ((a % TAU) + TAU) % TAU;
          const segs = start => {
            const cs = d.doors.map(dir => norm(start(dir))).sort((x, y) => x - y);
            return cs.map((c, i) => { const n = i + 1 < cs.length ? cs[i + 1] : cs[0] + TAU; return [c + gap, n - c - gap * 2]; });
          };
          segs(dir => Math.PI - dir).forEach(([st, len]) => {
            const band = new THREE.Mesh(new THREE.SphereGeometry(d.R, 48, 6, st, len, Math.PI / 2 - RING, RING), shellMat);
            if (d.glass) g.add(band); else add(band, g, 0);
          });
          segs(dir => Math.PI / 2 - dir).forEach(([st, len]) => {
            const base = new THREE.Mesh(new THREE.CylinderGeometry(d.R + 0.08, d.R + 0.15, 0.35, 48, 1, true, st, len), toon(0x8f8bc4, { side: THREE.DoubleSide }));
            base.position.y = 0.17; g.add(base);
          });
          // каркас: рёбра и кольца
          const ribMat = d.glass ? orange : lav;
          for (let i = 0; i < 10; i++) {
            const a = i / 10 * Math.PI * 2 + 0.31;
            if (d.doors.some(dir => Math.abs(Math.atan2(Math.sin(a - dir), Math.cos(a - dir))) < 0.35)) continue;
            const pts = [];
            for (let k = 0; k <= 16; k++) { const t = k / 16 * Math.PI / 2; pts.push(new THREE.Vector3(Math.cos(a) * Math.cos(t) * (d.R + 0.03), Math.sin(t) * (d.R + 0.03), Math.sin(a) * Math.cos(t) * (d.R + 0.03))); }
            g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, d.glass ? 0.1 : 0.07, 6, false), ribMat));
          }
          [RING + 0.08, 0.95].forEach(f => {
            const ring = new THREE.Mesh(new THREE.TorusGeometry(Math.cos(f) * d.R + 0.03, d.glass ? 0.1 : 0.08, 6, 72), ribMat);
            ring.rotation.x = Math.PI / 2; ring.position.y = Math.sin(f) * d.R; g.add(ring);
          });
          const top = add(new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, 0.35, 24), d.glass ? orange : lav), g, 0.04); top.position.y = d.R - 0.05;
          const fl = new THREE.Mesh(new THREE.CircleGeometry(d.R - 0.05, 48), d.glass ? toon(0xf6e6cf) : toon(0xffffff, { map: floorT }));
          fl.rotation.x = -Math.PI / 2; fl.position.y = 0.06; g.add(fl);
          // наружный вход (только у жилого модуля): тамбур, оранжевая арка и табличка
          if (d.outside !== undefined) {
            const dirV = new THREE.Vector3(Math.cos(d.outside), 0, Math.sin(d.outside));
            const rotY = Math.atan2(dirV.x, dirV.z);
            const ts = arch(new THREE.Shape(), 3.1, 3.2); ts.holes.push(arch(new THREE.Path(), 2.0, 2.5));
            const tunnel = add(new THREE.Mesh(new THREE.ExtrudeGeometry(ts, { depth: 2.7, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 2, curveSegments: 24 }), white), g, 0.05);
            tunnel.rotation.y = rotY; tunnel.position.copy(dirV.clone().multiplyScalar(d.R - 1.3));
            const fs = arch(new THREE.Shape(), 3.5, 3.45); fs.holes.push(arch(new THREE.Path(), 2.0, 2.5));
            const frame = add(new THREE.Mesh(new THREE.ExtrudeGeometry(fs, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2, curveSegments: 24 }), orange), g, 0.05);
            frame.rotation.y = rotY; frame.position.copy(dirV.clone().multiplyScalar(d.R + 1.4));
            const tf = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 3.2), toon(0xeae6ff));
            tf.rotation.x = -Math.PI / 2; tf.rotation.z = rotY;
            tf.position.copy(dirV.clone().multiplyScalar(d.R + 0.1)).setY(0.07); g.add(tf);
            const sign = canvasSign(d.name, '#6b5fd8');
            sign.position.copy(dirV.clone().multiplyScalar(d.R + 1.8)).setY(3.95); sign.rotation.y = rotY; g.add(sign);
          }
          const pl = new THREE.PointLight(d.glass ? 0xffc0ea : 0xfff0d8, 4, d.R * 2.6, 1.3);
          pl.position.set(0, d.R * 0.7, 0); g.add(pl);
          d.group = g;
        }
        DOMES.forEach(dome);
        // закрытые коридоры от жилого модуля к теплице и энергоблоку
        PASSAGES.filter(p => p.to).forEach(p => {
          const rotY = Math.atan2(p.dx, p.dz), len = p.len + 0.2;
          const ts = arch(new THREE.Shape(), 3.1, 3.2); ts.holes.push(arch(new THREE.Path(), 2.0, 2.5));
          const tube = add(new THREE.Mesh(new THREE.ExtrudeGeometry(ts, { depth: len, bevelEnabled: false, curveSegments: 24 }), white), scene, 0.05);
          tube.rotation.y = rotY; tube.position.set(p.sx - p.dx * 0.1, 0, p.sz - p.dz * 0.1);
          const fs = arch(new THREE.Shape(), 3.4, 3.4); fs.holes.push(arch(new THREE.Path(), 2.0, 2.5));
          const ribGeo = new THREE.ExtrudeGeometry(fs, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2, curveSegments: 24 });
          const t0 = 1.7, t1 = len - 1.7; // рёбра — только на открытой части коридора, между куполами
          for (let k = 0; k < 3; k++) {
            const t = t0 + (t1 - t0) * k / 2;
            const r = add(new THREE.Mesh(ribGeo, p.to.glass ? toon(0x7ee0a0) : orange), scene, 0.04);
            r.rotation.y = rotY; r.position.set(p.sx + p.dx * (t - 0.15), 0, p.sz + p.dz * (t - 0.15));
          }
          const fl = new THREE.Mesh(new THREE.PlaneGeometry(2.0, len), toon(0xeae6ff));
          fl.rotation.x = -Math.PI / 2; fl.rotation.z = rotY;
          fl.position.set(p.sx + p.dx * len / 2, 0.07, p.sz + p.dz * len / 2); scene.add(fl);
          // табличка на коридоре снаружи (видна с площадки) и над проходом внутри жилого модуля
          const outS = canvasSign(p.to.name, p.to.glass ? '#ff9a3c' : '#6b5fd8');
          outS.position.set(p.sx + p.dx * len / 2, 3.75, p.sz + p.dz * len / 2); scene.add(outS);
          const inS = canvasSign(p.to.name, p.to.glass ? '#ff9a3c' : '#6b5fd8');
          inS.scale.setScalar(0.7);
          inS.position.set(p.sx - p.dx * 0.3, 2.85, p.sz); inS.rotation.y = rotY + Math.PI; scene.add(inS);
        });


        /* ---------- экран-табло на CanvasTexture ---------- */
        function screenMesh(w, hgt, draw) {
          const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * hgt / w);
          const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
          const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, hgt), new THREE.MeshBasicMaterial({ map: t }));
          const upd = () => { draw(c.getContext('2d'), c.width, c.height); t.needsUpdate = true; };
          upd();
          return { mesh, upd };
        }
        const scr = (g, W, H, title) => {
          const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#3550d8'); gr.addColorStop(1, '#1b2584');
          g.fillStyle = gr; g.fillRect(0, 0, W, H);
          g.strokeStyle = '#5fd8ff'; g.lineWidth = 12; g.strokeRect(6, 6, W - 12, H - 12);
          g.fillStyle = 'rgba(95,216,255,0.15)'; for (let y = 0; y < H; y += 8) g.fillRect(0, y, W, 2);
          g.fillStyle = '#5fd8ff'; g.font = '900 42px Nunito, sans-serif'; g.textAlign = 'left'; g.fillText(title, 30, 62);
          g.font = '800 34px Nunito, sans-serif';
        };
        const meter = (g, x, y, w, p, col) => {
          g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x, y, w, 26);
          g.fillStyle = col; g.fillRect(x, y, w * clamp01(p), 26);
          g.strokeStyle = '#fff'; g.lineWidth = 3; g.strokeRect(x, y, w, 26);
        };
        // пульт: тумба, столешница, кнопки, наклонный экран в рамке
        function consoleDesk(parent, x, z, rotY, draw) {
          const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; parent.add(g);
          const bodyShape = new THREE.Shape(); bodyShape.moveTo(-0.5, 0); bodyShape.lineTo(0.5, 0); bodyShape.lineTo(0.5, 0.9); bodyShape.lineTo(0.15, 1.15); bodyShape.lineTo(-0.5, 1.15); bodyShape.closePath();
          const body = add(new THREE.Mesh(new THREE.ExtrudeGeometry(bodyShape, { depth: 2.4, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 3 }), lav), g, 0.04);
          body.rotation.y = -Math.PI / 2; body.position.set(1.2, 0, 0);
          const strip = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.08, 0.05), new THREE.MeshBasicMaterial({ color: 0x5fd8ff })); strip.position.set(0, 0.3, 0.55); g.add(strip);
          [-0.8, -0.4, 0, 0.4, 0.8].forEach((bx, i) => {
            const b = add(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.08, 16), toon([0xff9a3c, 0x5fd8ff, 0x7ee0a0, 0xff6b8a, 0xffe066][i])), g, 0.02);
            b.position.set(bx, 1.04, 0.3); b.rotation.x = 0.66;
          });
          const lever = add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8), steel), g, 0.02); lever.position.set(0.95, 1.25, 0.05);
          const knob = add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), orange), g, 0.02); knob.position.set(0.95, 1.47, 0.05);
          const s = screenMesh(2.2, 1.25, draw);
          s.mesh.position.set(0, 2.0, -0.32); s.mesh.rotation.x = -0.15; g.add(s.mesh);
          const fr = add(new THREE.Mesh(new THREE.BoxGeometry(2.45, 1.5, 0.12), dark), g, 0.04); fr.position.set(0, 2.0, -0.4); fr.rotation.x = -0.15;
          const stand = add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 0.12), steel), g, 0.03); stand.position.set(0, 1.25, -0.42);
          return s;
        }

        /* ---------- жилой модуль: кровать, радио, склад, стол ---------- */
        const habitat = DOMES[0].group;
        {
          const bed = new THREE.Group(); bed.position.set(POS.bed.x, 0, POS.bed.z); bed.rotation.y = 0.5; habitat.add(bed);
          add(new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.45, 1.3), lav), bed, 0.04).position.y = 0.3;
          const matt = add(new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.25, 1.15), white), bed, 0.03); matt.position.y = 0.64;
          const blanket = add(new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 1.2), toon(0x6f8cff)), bed, 0.03); blanket.position.set(0.35, 0.8, 0);
          const pillow = add(new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 10), white), bed, 0.03); pillow.scale.set(1, 0.4, 1.3); pillow.position.set(-0.75, 0.86, 0);
          const head = add(new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.1, 1.3), orange), bed, 0.03); head.position.set(-1.15, 0.6, 0);
          // склад: ящики
          const crate = new THREE.Group(); crate.position.set(POS.storage.x, 0, POS.storage.z); habitat.add(crate);
          [[0, 0.45, 0, 0.9, 0xff9a3c], [0.95, 0.35, 0.1, 0.7, 0x6b5fd8], [0.3, 1.2, 0, 0.6, 0x7ee0a0]].forEach(([x, y, z, s, c]) => {
            const b = add(new THREE.Mesh(new THREE.BoxGeometry(s, s, s), toon(c)), crate, 0.04); b.position.set(x, y, z); b.rotation.y = x * 0.4;
            const band = new THREE.Mesh(new THREE.BoxGeometry(s + 0.02, 0.1, s + 0.02), white); band.position.copy(b.position); band.rotation.y = b.rotation.y; crate.add(band);
          });
          const tbl = add(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.1, 28), white), habitat, 0.03); tbl.position.set(2.2, 0.85, 1.6);
          add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 0.8, 12), lav), habitat, 0.03).position.set(2.2, 0.4, 1.6);
          const mug = add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.2, 12), orange), habitat, 0.02); mug.position.set(2.4, 1.0, 1.5);
          // плакат-окно с видом на Землю
          const earthT = canvasTex(256, 256, g => {
            g.fillStyle = '#1b2584'; g.fillRect(0, 0, 256, 256);
            for (let i = 0; i < 40; i++) { g.fillStyle = '#fff'; g.fillRect((i * 97) % 256, (i * 53) % 256, 3, 3); }
            g.fillStyle = '#4fa8ff'; g.beginPath(); g.arc(128, 128, 70, 0, 7); g.fill();
            g.fillStyle = '#5fcf6a'; g.beginPath(); g.ellipse(105, 110, 30, 22, 0.4, 0, 7); g.fill(); g.beginPath(); g.ellipse(160, 160, 22, 16, -0.3, 0, 7); g.fill();
            g.fillStyle = '#fff'; g.font = '800 26px Nunito'; g.textAlign = 'center'; g.fillText(L('ДОМ', 'HOME'), 128, 236);
          });
          const poster = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: earthT }));
          poster.position.set(-4.6, 2.3, 2.6); poster.lookAt(0, 2.3, 0); habitat.add(poster);
        }
        const radio = consoleDesk(habitat, POS.radio.x, POS.radio.z, -0.75, (g, W, H) => {
          scr(g, W, H, L('СВЯЗЬ С ЗЕМЛЁЙ', 'LINK TO EARTH'));
          const T = S.today || {};
          g.fillStyle = T.waitMsg ? '#ffd166' : '#e8f6ff';
          g.fillText(T.waitMsg ? L('ждём ответ…', 'waiting…') : T.called ? L('сеанс был ✓', 'done today ✓') : T.cleaning ? L('нет энергии', 'no power') : S.broken.antenna ? L('антенна сбита!', 'antenna off!') : L('канал свободен', 'channel clear'), 30, 130);
          g.fillStyle = '#ffd166'; g.fillText(L(`инструкций: ${S.instructions} из 5`, `instructions: ${S.instructions} of 5`), 30, 190);
          meter(g, 30, 220, W - 60, S.instructions / 5, '#7ee0a0');
        });
        // антенка на пульте
        const whip = add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6), steel), habitat, 0.02);
        whip.position.set(POS.radio.x + 0.6, 3.1, POS.radio.z - 0.3);

        /* ---------- теплица: грядки с картошкой, томатами и салатом ---------- */
        const ghG = GH.group;
        const soil = toon(0x8a5538), bedBox = toon(0xfff1e6);
        const plantGroups = [];
        BEDS.forEach((crop, i) => {
          const row = Math.floor(i / 3), col = i % 3;
          const g = new THREE.Group(); g.position.set(-3.8 + col * 2.8, 0, row === 0 ? -1.9 : 1.9); ghG.add(g);
          add(new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.5, 1.45), bedBox), g, 0.04).position.y = 0.25;
          const sl = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 1.25), soil); sl.position.y = 0.52; g.add(sl);
          // табличка с названием
          const tag = add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.04), toon(crop === 'potato' ? 0xffd166 : crop === 'tomato' ? 0xff6b8a : 0x9ae66e)), g, 0.02);
          tag.position.set(-0.9, 0.75, row === 0 ? 0.76 : -0.76);
          const plants = new THREE.Group(); plants.position.y = 0.55; g.add(plants);
          for (let k = 0; k < 4; k++) {
            const p = new THREE.Group(); p.position.set(-0.75 + k * 0.5, 0, (k % 2 ? 0.25 : -0.25)); plants.add(p);
            if (crop === 'potato') {
              for (let l = 0; l < 6; l++) { const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 8), toon(0x5fcf6a)); leaf.position.set(Math.cos(l * 1.1) * 0.17, 0.22 + (l % 2) * 0.14, Math.sin(l * 1.1) * 0.17); leaf.scale.set(1, 0.7, 1); p.add(leaf); }
              const fl = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), toon(0xf3eaff)); fl.position.y = 0.52; p.add(fl);
              const tuber = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), toon(0xd9a066)); tuber.scale.set(1.3, 0.8, 1); tuber.position.set(0.15, 0.02, 0.1); p.add(tuber);
            } else if (crop === 'tomato') {
              const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.9, 6), toon(0x3e9b4b)); stem.position.y = 0.45; p.add(stem);
              const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 6), toon(0xd9a066)); stick.position.set(0.08, 0.5, 0); p.add(stick);
              for (let l = 0; l < 4; l++) { const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 6), toon(0x4fbf5a)); leaf.position.set(Math.cos(l * 1.6) * 0.15, 0.35 + l * 0.13, Math.sin(l * 1.6) * 0.15); p.add(leaf); }
              for (let l = 0; l < 3; l++) { const t = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), toon(0xff4f5e)); t.position.set(Math.cos(l * 2.1) * 0.2, 0.45 + l * 0.12, Math.sin(l * 2.1) * 0.2); p.add(t); }
            } else {
              for (let l = 0; l < 7; l++) { const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 6), toon(l % 2 ? 0x9ae66e : 0xb8f080)); leaf.position.set(Math.cos(l) * 0.12, 0.12, Math.sin(l) * 0.12); leaf.scale.set(1, 0.45, 1.3); leaf.rotation.y = l; p.add(leaf); }
            }
          }
          plantGroups.push(plants);
        });
        // розовые лампы роста на тросах
        [-1.9, 1.9].forEach(z => {
          const lamp = add(new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.14, 0.4), dark), ghG, 0.02); lamp.position.set(-1.0, 3.3, z);
          const glow = new THREE.Mesh(new THREE.BoxGeometry(8.0, 0.04, 0.3), new THREE.MeshBasicMaterial({ color: 0xff8ae0 })); glow.position.set(-1.0, 3.21, z); ghG.add(glow);
          [-4.5, 2.5].forEach(x => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.2, 4), dark); w.position.set(x, 4.4, z); ghG.add(w); });
        });
        // бак с водой (из него наполняют лейку)
        const tankG = new THREE.Group(); tankG.position.set(POS.tank.x - GH.x, 0, POS.tank.z - GH.z); ghG.add(tankG);
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.3, 24), toon(0x6fc8ff)), tankG, 0.04).position.y = 0.65;
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.64, 0.12, 24), white), tankG, 0.03).position.y = 1.32;
        const tap = add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.4, 10), steel), tankG, 0.02); tap.rotation.x = Math.PI / 2; tap.position.set(0, 0.5, -0.75);
        const tapK = add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), orange), tankG, 0.02); tapK.position.set(0, 0.62, -0.62);
        const dropT = canvasTex(128, 128, g => { g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(64, 14); g.bezierCurveTo(104, 64, 108, 112, 64, 114); g.bezierCurveTo(20, 112, 24, 64, 64, 14); g.fill(); g.fillStyle = '#5fd8ff'; g.beginPath(); g.moveTo(64, 30); g.bezierCurveTo(94, 70, 96, 102, 64, 104); g.bezierCurveTo(32, 102, 34, 70, 64, 30); g.fill(); });
        const dropS = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), new THREE.MeshBasicMaterial({ map: dropT, transparent: true })); dropS.position.set(0, 0.75, -0.62); dropS.rotation.y = Math.PI; tankG.add(dropS);
        // лейка: одна модель для подставки и для руки
        function makeCan() {
          const g = new THREE.Group();
          add(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.28, 20), toon(0x7ee0a0)), g, 0.015).position.y = 0.14;
          const sp = add(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.38, 10), toon(0x7ee0a0)), g, 0.01); sp.position.set(0.24, 0.24, 0); sp.rotation.z = -0.95;
          const rose = add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.035, 0.05, 12), orange), g, 0.01); rose.position.set(0.39, 0.35, 0); rose.rotation.z = -0.95;
          const hd = add(new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 8, 20, Math.PI), orange), g, 0.01); hd.position.set(-0.02, 0.3, 0);
          return g;
        }
        const standG = new THREE.Group(); standG.position.set(POS.garden.x - GH.x, 0, POS.garden.z - GH.z); ghG.add(standG);
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.7, 16), lav), standG, 0.03).position.y = 0.35;
        const standCan = makeCan(); standCan.position.y = 0.7; standCan.rotation.y = 2.2; standG.add(standCan);
        // индикаторы: термометр, влажность почвы, свет
        const IND = [
          { k: 'temp', x: 4.6, z: -2.4, col: '#ff5d6c', name: L('Термометр', 'Thermometer') },
          { k: 'water', x: 3.6, z: -3.5, col: '#5fd8ff', name: L('Влажность почвы', 'Soil moisture') },
          { k: 'light', x: 2.4, z: -4.3, col: '#ffd166', name: L('Датчик света', 'Light meter') }
        ];
        IND.forEach(ind => {
          const g = new THREE.Group(); g.position.set(ind.x, 0, ind.z); g.rotation.y = Math.atan2(-ind.x, -ind.z) + Math.PI; ghG.add(g);
          add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 1.3, 10), steel), g, 0.02).position.y = 0.65;
          const face = add(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.1, 28), white), g, 0.03); face.rotation.x = Math.PI / 2; face.position.y = 1.55;
          ind.scr = screenMesh(0.7, 0.7, (gg, W, H) => {
            gg.fillStyle = '#1b2584'; gg.beginPath(); gg.arc(W / 2, H / 2, W / 2, 0, 7); gg.fill();
            gg.lineWidth = 18; gg.strokeStyle = ind.col; gg.beginPath(); gg.arc(W / 2, H / 2, W / 2 - 14, 0, 7); gg.stroke();
            gg.fillStyle = ind.col; gg.textAlign = 'center'; gg.textBaseline = 'middle';
            const T = S.today || { bedZone: [] };
            if (ind.k === 'temp') {
              gg.fillRect(W / 2 - 22, 120, 44, 190); gg.beginPath(); gg.arc(W / 2, 330, 48, 0, 7); gg.fill();
              gg.fillStyle = '#fff'; gg.font = '900 92px Nunito, sans-serif'; gg.fillText(T.hot ? '+28°' : '+22°', W / 2, 440);
            } else if (ind.k === 'water') {
              gg.beginPath(); gg.moveTo(W / 2, 90); gg.bezierCurveTo(W / 2 + 110, 230, W / 2 + 100, 330, W / 2, 330); gg.bezierCurveTo(W / 2 - 100, 330, W / 2 - 110, 230, W / 2, 90); gg.fill();
              const ok = (T.bedZone || []).filter(z => z === 'ok').length;
              gg.fillStyle = '#fff'; gg.font = '900 80px Nunito, sans-serif'; gg.fillText(`${ok}/${BEDS.length}`, W / 2, 430);
            } else {
              gg.beginPath(); gg.arc(W / 2, 220, 80, 0, 7); gg.fill();
              for (let r = 0; r < 8; r++) { const a = r / 8 * Math.PI * 2; gg.fillRect(W / 2 + Math.cos(a) * 110 - 12, 220 + Math.sin(a) * 110 - 12, 24, 24); }
              gg.fillStyle = '#fff'; gg.font = '900 80px Nunito, sans-serif'; gg.fillText(L('16 ч', '16 h'), W / 2, 430);
            }
          });
          ind.scr.mesh.position.set(0, 1.55, 0.06); g.add(ind.scr.mesh);
          ind.pos = { x: GH.x + ind.x, z: GH.z + ind.z };
          obstacles.push({ x: ind.pos.x, z: ind.pos.z, r: 0.3 });
        });
        // шкала влажности над каждой грядкой: красная — сухо, зелёная — норма, синяя — много воды
        const plotPos = [], bars = [];
        BEDS.forEach((crop, i) => {
          const col = i % 3, row = Math.floor(i / 3), lx = -3.8 + col * 2.8, lz = row === 0 ? -1.9 : 1.9;
          plotPos.push({ x: GH.x + lx, z: GH.z + lz });
          const c = document.createElement('canvas'); c.width = 320; c.height = 110;
          const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
          const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false }));
          sp.scale.set(1.6, 0.55, 1); sp.position.set(lx, 1.75, lz); ghG.add(sp);
          const draw = () => {
            const g = c.getContext('2d'), T = S.today, n = bedNeed(i), m = T ? T.bedWater[i] : 0, max = Math.max(2, n * 2);
            g.clearRect(0, 0, 320, 110);
            g.fillStyle = 'rgba(27,37,132,0.88)'; g.beginPath(); g.roundRect ? g.roundRect(4, 4, 312, 102, 18) : g.rect(4, 4, 312, 102); g.fill();
            g.fillStyle = '#fff'; g.font = '900 26px Nunito, sans-serif'; g.textAlign = 'left'; g.fillText(CROPS[crop].name, 16, 36);
            g.textAlign = 'right'; g.fillText(`${num(m, 1)} / ${n} ${L('л', 'L')}`, 304, 36);
            const x0 = 16, w = 288, y0 = 52, hh = 34, X = v => x0 + w * Math.min(1, v / max);
            g.fillStyle = '#ff6b8a'; g.fillRect(x0, y0, X(n - TOL) - x0, hh);
            g.fillStyle = '#7ee0a0'; g.fillRect(X(n - TOL), y0, X(n + TOL) - X(n - TOL), hh);
            g.fillStyle = '#6fa8ff'; g.fillRect(X(n + TOL), y0, x0 + w - X(n + TOL), hh);
            g.lineWidth = 4; g.strokeStyle = '#fff'; g.strokeRect(x0, y0, w, hh);
            const mx = X(m); g.fillStyle = '#fff'; g.fillRect(mx - 5, y0 - 8, 10, hh + 16); g.strokeStyle = '#2b2a6b'; g.lineWidth = 3; g.strokeRect(mx - 5, y0 - 8, 10, hh + 16);
            tx.needsUpdate = true;
          };
          bars.push(draw); draw();
        });
        const leakMark = new THREE.Group(); leakMark.position.set(POS.leak.x - GH.x, 0, 0); ghG.add(leakMark);
        { const pipe = add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.4, 10), steel), leakMark, 0.02); pipe.position.y = 1.2;
          for (let k = 0; k < 4; k++) { const dr = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshBasicMaterial({ color: 0x5fd8ff })); dr.scale.y = 1.4; dr.userData.k = k; leakMark.add(dr); }
          const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.7, 24), new THREE.MeshBasicMaterial({ color: 0x5fd8ff, transparent: true, opacity: 0.7 })); puddle.rotation.x = -Math.PI / 2; puddle.position.y = 0.08; puddle.name = 'puddle'; leakMark.add(puddle); }

        /* ---------- энергоблок: стойки батарей и пульт ---------- */
        const pwG = PW.group;
        const cells = [];
        for (let r = 0; r < 3; r++) {
          const rack = new THREE.Group(); rack.position.set(2.8, 0, -2.2 + r * 2.2); rack.rotation.y = -Math.PI / 2; pwG.add(rack);
          add(new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.3, 0.8), lav), rack, 0.04).position.y = 1.15;
          const capTop = add(new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 0.9), orange), rack, 0.03); capTop.position.y = 2.36;
          for (let k = 0; k < 5; k++) { const c = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.26, 0.1), new THREE.MeshBasicMaterial({ color: 0x5fd8ff })); c.position.set(0, 0.35 + k * 0.4, 0.42); rack.add(c); cells.push(c); }
        }
        // кабели по полу
        [-2.2, 0, 2.2].forEach(z => {
          const cab = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(2.4, 0.1, z), new THREE.Vector3(1.2, 0.08, z * 0.6 - 0.8), new THREE.Vector3(0.2, 0.08, -2.6)]), 16, 0.06, 6), toon(z ? 0xff9a3c : 0x5fd8ff));
          pwG.add(cab);
        });
        const powerScr = consoleDesk(pwG, POS.power.x - PW.x, POS.power.z - PW.z, 0, (g, W, H) => {
          scr(g, W, H, L('ЭНЕРГИЯ', 'ENERGY'));
          g.fillStyle = '#e8f6ff'; g.fillText(L(`батареи ${Math.round(S.battery)}/${cap()} кВт·ч`, `battery ${Math.round(S.battery)}/${cap()} kWh`), 30, 130);
          meter(g, 30, 150, W - 60, S.battery / cap(), S.battery / cap() > 0.3 ? '#5fd8ff' : '#ff6b8a');
          g.fillStyle = S.today && S.today.energyPlanned ? '#7ee0a0' : '#ffd166';
          g.fillText(S.today && S.today.energyPlanned ? L('ночь рассчитана ✓', 'night planned ✓') : L('рассчитай ночь!', 'plan the night!'), 30, 230);
        });
        const hotMark = new THREE.Group(); hotMark.position.set(POS.battery.x - PW.x - 0.5, 2.9, 0); pwG.add(hotMark);
        for (let k = 0; k < 3; k++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.5, 10), new THREE.MeshBasicMaterial({ color: k === 1 ? 0xffd166 : 0xff5468 })); f.position.set(0, 0, -0.35 + k * 0.35); hotMark.add(f); }

        /* ---------- солнечные панели ---------- */
        const cellT = canvasTex(128, 128, g => {
          g.fillStyle = '#2a55e0'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#a8e6ff'; g.lineWidth = 3;
          for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, 128); g.stroke(); g.beginPath(); g.moveTo(0, i * 32); g.lineTo(128, i * 32); g.stroke(); }
          g.fillStyle = 'rgba(255,255,255,0.28)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(60, 0); g.lineTo(0, 60); g.fill();
        });
        const dustT = canvasTex(128, 128, g => {
          g.fillStyle = '#d9925e'; g.fillRect(0, 0, 128, 128);
          for (let i = 0; i < 160; i++) { g.fillStyle = i % 2 ? 'rgba(160,90,50,0.5)' : 'rgba(255,200,150,0.5)'; g.beginPath(); g.arc((i * 71) % 128, (i * 37) % 128, 2 + (i % 4), 0, 7); g.fill(); }
        });
        const panelMat = new THREE.MeshToonMaterial({ color: 0xffffff, map: cellT, gradientMap: grad });
        PANELS.forEach(p => {
          const g = new THREE.Group(); g.position.set(p.x, 0, p.z); g.rotation.y = 0.15; scene.add(g);
          add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 1.4, 10), steel), g, 0.03).position.y = 0.7;
          const foot = add(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.15, 16), steel), g, 0.03); foot.position.y = 0.08;
          const tilt = new THREE.Group(); tilt.position.y = 1.45; tilt.rotation.x = -0.45; g.add(tilt);
          add(new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.1, 2.3), white), tilt, 0.04);
          const board = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 2.1), panelMat); board.rotation.x = -Math.PI / 2; board.position.y = 0.06; tilt.add(board);
          const dust = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 2.1), new THREE.MeshBasicMaterial({ map: dustT, transparent: true, opacity: 0 }));
          dust.rotation.x = -Math.PI / 2; dust.position.y = 0.07; tilt.add(dust);
          p.dustMesh = dust;
          obstacles.push({ x: p.x, z: p.z, r: 0.6 });
        });

        /* ---------- ледяной бур и антенна ---------- */
        const drill = new THREE.Group(); drill.position.set(DRILL.x, 0, DRILL.z); scene.add(drill);
        add(new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.7, 1.0, 24), white), drill, 0.05).position.y = 0.5;
        const ringD = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.1, 8, 32), orange); ringD.rotation.x = Math.PI / 2; ringD.position.y = 1.0; drill.add(ringD);
        const tank = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.9, 1.4, 8, 20), toon(0x6fc8ff)), drill, 0.05); tank.position.set(2.6, 1.6, 0);
        const tankLevel = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.6, 0.05), new THREE.MeshBasicMaterial({ color: 0xffffff })); tankLevel.position.set(2.6, 1.6, 0.92); drill.add(tankLevel);
        const frameD = [[-0.9, -0.9], [0.9, -0.9], [0, 1.0]];
        frameD.forEach(([x, z]) => { const leg = add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 5.2, 8), steel), drill, 0.03); leg.position.set(x * 0.55, 3.3, z * 0.55); leg.rotation.set(-z * 0.12, 0, x * 0.12); });
        const motor = add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.9), orange), drill, 0.04); motor.position.y = 5.6;
        const shaft = add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 4.4, 10), steel), drill, 0.03); shaft.position.y = 3.2;
        const bit = new THREE.Group(); bit.position.y = 1.0; drill.add(bit);
        const screw = add(new THREE.Mesh(new THREE.TorusKnotGeometry(0.28, 0.07, 60, 8, 1, 6), orange), bit, 0); screw.rotation.x = Math.PI / 2; screw.scale.set(1, 1, 2.2);
        const pipeD = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(1.2, 0.6, 0), new THREE.Vector3(1.9, 0.3, 0.2), new THREE.Vector3(2.4, 0.6, 0)]), 10, 0.1, 6), steel); drill.add(pipeD);
        const smokeDrill = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), new THREE.MeshBasicMaterial({ color: 0x5a5470, transparent: true, opacity: 0.6 })); smokeDrill.position.y = 6.3; drill.add(smokeDrill);
        obstacles.push({ x: DRILL.x, z: DRILL.z, r: 1.9 }, { x: DRILL.x + 2.6, z: DRILL.z, r: 1.1 });
        const ant = new THREE.Group(); ant.position.set(ANT.x, 0, ANT.z); scene.add(ant);
        add(new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.3, 0.6, 20), white), ant, 0.04).position.y = 0.3;
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 6, 14), steel), ant, 0.05).position.y = 3.3;
        const dishPts = []; for (let i = 0; i <= 14; i++) { const r = i / 14 * 2.7; dishPts.push(new THREE.Vector2(r, r * r * 0.16)); }
        const dishHolder = new THREE.Group(); dishHolder.position.y = 6.4; ant.add(dishHolder);
        const dishTilt = new THREE.Group(); dishHolder.add(dishTilt); dishTilt.rotation.x = -0.9;
        add(new THREE.Mesh(new THREE.LatheGeometry(dishPts, 40), toon(0xf7f5ff, { side: THREE.DoubleSide })), dishTilt, 0.05);
        const dishRim = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.08, 8, 48), orange); dishRim.rotation.x = Math.PI / 2; dishRim.position.y = 1.17; dishTilt.add(dishRim);
        [0, 2.1, 4.2].forEach(a => { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.0, 6), steel); st.position.set(Math.cos(a) * 0.8, 1.2, Math.sin(a) * 0.8); st.lookAt(0, 2.2, 0); st.rotateX(Math.PI / 2); dishTilt.add(st); });
        const feed = add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), orange), dishTilt, 0.03); feed.position.y = 2.1;
        const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff5468 })); beacon.position.y = 6.4; ant.add(beacon);
        obstacles.push({ x: ANT.x, z: ANT.z, r: 1.3 });

        /* ---------- наш корабль «Звёздный вихрь» ---------- */
        const ourShip = new THREE.Group();
        let hatch;
        {
          const prof = [[0.001, 0.4], [1.15, 0.55], [1.55, 1.3], [1.75, 2.6], [1.7, 3.8], [1.45, 4.8], [1.0, 5.7], [0.45, 6.35], [0.001, 6.6]].map(([r, y]) => new THREE.Vector2(r, y));
          add(new THREE.Mesh(new THREE.LatheGeometry(new THREE.SplineCurve(prof).getPoints(48), 48), white), ourShip, 0.06);
          // красный нос
          const noseProf = [[0.001, 6.62], [0.47, 6.36], [0.92, 5.78], [0.96, 5.7]].map(([r, y]) => new THREE.Vector2(r, y));
          add(new THREE.Mesh(new THREE.LatheGeometry(noseProf.reverse(), 48), toon(0xff5d6c, { side: THREE.DoubleSide })), ourShip, 0);
          [[1.3, 1.6], [4.25, 1.6], [5.65, 1.03]].forEach(([y, r]) => { const b = new THREE.Mesh(new THREE.TorusGeometry(r, 0.11, 8, 48), orange); b.rotation.x = Math.PI / 2; b.position.y = y; ourShip.add(b); });
          const win = add(new THREE.Mesh(new THREE.SphereGeometry(0.62, 24, 14), toon(0x46d4ff)), ourShip, 0.04); win.scale.z = 0.45; win.position.set(0, 3.5, 1.6);
          const shine = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); shine.position.set(-0.22, 3.7, 1.85); ourShip.add(shine);
          const rim = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.12, 10, 32), steel); rim.position.set(0, 3.5, 1.64); ourShip.add(rim);
          for (let i = 0; i < 3; i++) {
            const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(1.5, -0.7); sh.quadraticCurveTo(1.8, 0, 1.6, 0.5); sh.lineTo(0, 2.4); sh.closePath();
            const holderG = new THREE.Group(); holderG.rotation.y = i * Math.PI * 2 / 3 + 0.5; ourShip.add(holderG);
            const fin = add(new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 3 }), toon(0xff5d6c)), holderG, 0.04);
            fin.position.set(1.4, 0.6, -0.09);
          }
          add(new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.05, 0.8, 28, 1, true), toon(0x5d5a86, { side: THREE.DoubleSide })), ourShip, 0.04).position.y = 0.2;
          for (let i = 0; i < 3; i++) {
            const a = i * Math.PI * 2 / 3 + 0.5 + Math.PI / 3;
            const leg = add(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 2.2, 8), steel), ourShip, 0.03);
            leg.position.set(Math.cos(a) * 1.75, 0.15, Math.sin(a) * 1.75); leg.lookAt(Math.cos(a) * 1.2, 1.5, Math.sin(a) * 1.2); leg.rotateX(Math.PI / 2);
            const foot = add(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 0.12, 16), steel), ourShip, 0.03); foot.position.set(Math.cos(a) * 2.15, -0.78, Math.sin(a) * 2.15);
          }
          // открытый технический люк — закрывается, когда ремонт закончен
          const hatchHolder = new THREE.Group(); hatchHolder.position.set(0, 2.2, 0); hatchHolder.rotation.y = -0.9; ourShip.add(hatchHolder);
          const hole = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.0), toon(0x2b2a6b)); hole.position.set(0, 0, 1.76); hatchHolder.add(hole);
          hatch = add(new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.05, 0.06), orange), hatchHolder, 0.03);
          hatch.geometry.translate(0.475, 0, 0); hatch.position.set(-0.475 + 0.0, 0, 1.8); hatch.rotation.y = 1.3;
          // искры/провода в люке
          const wire = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-0.2, 0.2, 1.75), new THREE.Vector3(0.1, -0.3, 2.05), new THREE.Vector3(0.3, -0.7, 2.0)]), 12, 0.04, 6), toon(0xffe066)); hatchHolder.add(wire); wire.name = 'wire';
        }
        ourShip.scale.setScalar(1.25);
        ourShip.position.set(SHIP.x, 1.0, SHIP.z);
        ourShip.rotation.set(0.06, 2.6, -0.05);
        scene.add(ourShip);
        obstacles.push({ x: SHIP.x, z: SHIP.z, r: 2.9 });
        // ящик с инструментами у корабля
        const toolbox = add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.5), toon(0xff5d6c)), scene, 0.04); toolbox.position.set(SHIP.x - 3.2, 0.25, SHIP.z - 1.4); toolbox.rotation.y = 0.4;
        const smokeT = canvasTex(64, 64, g => { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(110,100,140,0.85)'); gr.addColorStop(1, 'rgba(140,130,160,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
        const SMOKE = [];
        for (let i = 0; i < 12; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeT, transparent: true, depthWrite: false })); scene.add(sp); SMOKE.push({ sp, t: i / 12 }); }
        // маркеры заданий над объектами
        const markT = canvasTex(128, 128, g => {
          g.fillStyle = '#ffb547'; g.strokeStyle = '#2b2a6b'; g.lineWidth = 10; g.beginPath(); g.arc(64, 60, 48, 0, 7); g.fill(); g.stroke();
          g.fillStyle = '#2b2a6b'; g.font = '900 76px Nunito, sans-serif'; g.textAlign = 'center'; g.fillText('!', 64, 86);
        });
        const marker = (x, y, z) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: markT, transparent: true, depthTest: false })); s.scale.set(1.1, 1.1, 1); s.position.set(x, y, z); s.userData.y = y; s.renderOrder = 10; scene.add(s); return s; };
        const MARK = {
          garden: marker(POS.garden.x, 3.6, POS.garden.z), power: marker(POS.power.x, 3.6, POS.power.z), radio: marker(POS.radio.x, 3.6, POS.radio.z),
          ship: marker(SHIP.x, 10.5, SHIP.z), drill: marker(DRILL.x, 7.4, DRILL.z), antenna: marker(ANT.x, 9.8, ANT.z),
          leak: marker(POS.leak.x, 3.0, POS.leak.z), battery: marker(POS.battery.x - 0.5, 3.8, POS.battery.z), bed: marker(POS.bed.x, 2.4, POS.bed.z)
        };

        /* ---------- лейка в руке (видна от первого лица) ---------- */
        scene.add(camera);
        // держатель лейки: сама лейка повёрнута носиком вперёд (от игрока), держатель наклоняет её при поливе
        const handCan = new THREE.Group(); handCan.position.set(0.36, -0.42, -0.9); camera.add(handCan);
        const canInHand = makeCan(); canInHand.scale.setScalar(0.8); canInHand.rotation.y = Math.PI / 2 + 0.35; canInHand.position.y = -0.12; handCan.add(canInHand);
        const spoutTip = new THREE.Object3D(); spoutTip.position.set(0.4, 0.35, 0); canInHand.add(spoutTip);
        const drops = [];
        for (let k = 0; k < 8; k++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), new THREE.MeshBasicMaterial({ color: 0x5fd8ff })); d.visible = false; camera.add(d); drops.push({ d, t: k / 8, dx: (Math.random() - 0.5) * 0.04 }); }
        const tipV = new THREE.Vector3();
        let pourAmt = 0;

        /* ---------- ASTRO в 3D: белый робот с голубым визором ---------- */
        const astro = new THREE.Group(), aBody = new THREE.Group(); astro.add(aBody); scene.add(astro); aBody.scale.setScalar(1.2);
        {
          // детальная модель — в js/astro3d.js
          const AM = window.AstroModel.build(THREE, { toon, add });
          aBody.add(AM.root);
          astro.userData.am = AM; astro.userData.armL = AM.armL; astro.userData.armR = AM.armR; astro.userData.jet = AM.jet; astro.userData.eyes = AM.eyes;
        }
        const A_STAND = { x: 0, z: 11.5 };
        astro.position.set(A_STAND.x, 0.2, A_STAND.z);
        let astroMode = 'stand', astroPose = 'wave', astroVis = 1, astroWant = 1;
        self.astroShow = pose => { astroPose = pose; astroWant = 1; };
        self.astroHide = () => { if (astroMode === 'follow') astroWant = 0; };

        /* ---------- игрок и интерактивные точки ---------- */
        const P = { x: SHIP.x - 5, z: SHIP.z - 5, yaw: 0, pitch: -0.05 };
        P.yaw = Math.atan2(-(0 - P.x), -(7 - P.z));
        const SPOTS = [
          { id: 'can', ...POS.garden, r: 2.0, label: () => S.can.has ? L('Подставка: поставить лейку на место', 'Stand: put the can back') : L('Лейка: взять', 'Watering can: take it') },
          { id: 'tank', ...POS.tank, r: 2.2, label: () => L(`Бак с водой: наполнить лейку (в запасе ${Math.round(S.water)} л)`, `Water tank: fill the can (${Math.round(S.water)} L in stock)`) },
          ...IND.map(ind => ({ id: 'ind-' + ind.k, ...ind.pos, r: 1.9, label: L(`${ind.name}: проверить`, `${ind.name}: check`) })),
          ...plotPos.map((pp, i) => ({ id: 'plot' + i, ...pp, r: 2.0, plot: i, label: () => {
            const m = S.today.bedWater[i], n = bedNeed(i);
            const act = touch ? L('держи «Действие»', 'hold “Action”') : L('держи E', 'hold E');
            return S.can.has && S.can.liters > 0.05 ? `${CROPS[BEDS[i]].name}: ${num(m, 1)} / ${n} ${L('л', 'L')} — ${act}` : `${CROPS[BEDS[i]].name}: ${num(m, 1)} / ${n} ${L('л', 'L')}`;
          } })),
          { id: 'power', ...POS.power, r: 2.6, label: L('Пульт энергоблока', 'Power console') },
          { id: 'radio', ...POS.radio, r: 2.6, label: L('Радиостанция', 'Radio station') },
          { id: 'bed', ...POS.bed, r: 2.4, label: L('Кровать: закончить сол', 'Bed: end the sol') },
          { id: 'storage', ...POS.storage, r: 2.3, label: L('Склад запчастей', 'Spare parts store') },
          { id: 'ship', ...SHIP, r: 5.4, label: L('«Звёздный вихрь»: ремонт', '“Star Whirl”: repair') },
          { id: 'drill', ...DRILL, r: 3.8, label: L('Ледяной бур', 'Ice drill') },
          { id: 'antenna', ...ANT, r: 3.2, label: L('Антенна связи', 'Antenna') },
          { id: 'leak', ...POS.leak, r: 2.2, label: L('Протечка: починить', 'Leak: fix it'), only: () => S.broken.leak },
          { id: 'battery', ...POS.battery, r: 2.4, label: L('Перегретый аккумулятор', 'Overheated battery'), only: () => S.broken.battery },
          ...PANELS.map((p, i) => ({ id: 'panel' + i, x: p.x, z: p.z, r: 2.6, label: L('Солнечная панель: промыть', 'Solar panel: wash'), only: () => S.dust > 0 && !p.clean }))
        ];
        obstacles.push({ ...POS.bed, r: 1.0 }, { ...POS.storage, r: 0.9 }, { x: 2.2, z: 1.6, r: 0.8 });
        obstacles.push({ ...POS.garden, r: 0.4 });
        [POS.radio, POS.power].forEach(p => obstacles.push({ x: p.x - 0.6, z: p.z, r: 0.65 }, { x: p.x + 0.6, z: p.z, r: 0.65 }));
        BEDS.forEach((c, i) => { const col = i % 3, row = Math.floor(i / 3); [-0.6, 0.6].forEach(o => obstacles.push({ x: GH.x - 3.8 + col * 2.8 + o, z: GH.z + (row ? 1.9 : -1.9), r: 0.75 })); });
        obstacles.push({ ...POS.tank, r: 0.65 });
        for (let r = 0; r < 3; r++) obstacles.push({ x: PW.x + 2.8, z: PW.z - 2.2 + r * 2.2, r: 0.9 });

        // столкновения с куполами: стену можно пройти только через тамбур
        function free(x, z) {
          if (Math.hypot(x, z) > 52) return false;
          let inPass = false;
          for (const p of PASSAGES) {
            const rx = x - p.sx, rz = z - p.sz, along = rx * p.dx + rz * p.dz, across = Math.abs(rx * -p.dz + rz * p.dx);
            if (along > -0.4 && along < p.len + 0.4 && across < 0.75) inPass = true;
            if (along > 0 && along < p.len && across > 0.75 && across < 1.9) return false;
          }
          if (!inPass) for (const d of DOMES) { const dist = Math.hypot(x - d.x, z - d.z); if (dist < d.R + 0.4 && dist > d.R - 0.6) return false; }
          for (const o of obstacles) if (Math.hypot(o.x - x, o.z - z) < o.r + 0.3) return false;
          return true;
        }
        const inside = (x, z) => DOMES.find(d => Math.hypot(x - d.x, z - d.z) < d.R - 0.3);

        /* ---------- управление ---------- */
        const keys = {};
        const kd = e => {
          if (self.paused || (e.target && e.target.tagName === 'INPUT')) return;
          const k = e.key.toLowerCase();
          if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
          if (self.talk) { if ((k === 'e' || k === 'у' || k === 'enter' || k === ' ') && !e.repeat && astroNext) astroNext(); return; }
          keys[k] = true;
          if ((k === 'e' || k === 'у' || k === 'enter' || k === ' ') && !e.repeat) act();
        };
        const ku = e => { keys[e.key.toLowerCase()] = false; };
        window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
        ctx.onCleanup(() => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); });
        const cv = renderer.domElement;
        let drag = null;
        cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; try { cv.setPointerCapture(e.pointerId); } catch (err) {} });
        cv.addEventListener('pointermove', e => {
          if (!drag || self.paused) return;
          P.yaw -= (e.clientX - drag.x) * 0.0055;
          P.pitch = clamp(P.pitch - (e.clientY - drag.y) * 0.004, -0.7, 0.6);
          drag = { x: e.clientX, y: e.clientY };
        });
        cv.addEventListener('pointerup', () => { drag = null; });
        cv.addEventListener('pointercancel', () => { drag = null; });
        const joy = { x: 0, y: 0, id: null };
        const zone = el.querySelector('.joy');
        if (zone) {
          const base = zone.querySelector('.joy-base'), knob = zone.querySelector('.joy-knob');
          let cx = 0, cy = 0, R = 50;
          const moveKnob = (dx, dy) => { knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`; };
          const setFrom = e => { let dx = e.clientX - cx, dy = e.clientY - cy; const len = Math.hypot(dx, dy); if (len > R) { dx = dx / len * R; dy = dy / len * R; } moveKnob(dx, dy); joy.x = dx / R; joy.y = dy / R; };
          zone.addEventListener('pointerdown', e => {
            e.preventDefault(); if (joy.id !== null) return; joy.id = e.pointerId;
            try { zone.setPointerCapture(e.pointerId); } catch (err) {}
            const zr = zone.getBoundingClientRect(), br = base.getBoundingClientRect(); R = br.width * 0.38; const half = br.width / 2;
            cx = clamp(e.clientX, zr.left + half, zr.right - half); cy = clamp(e.clientY, zr.top + half, zr.bottom - half);
            base.style.left = (cx - zr.left) + 'px'; base.style.top = (cy - zr.top) + 'px'; zone.classList.add('active'); setFrom(e);
          });
          zone.addEventListener('pointermove', e => { if (e.pointerId === joy.id) setFrom(e); });
          const release = e => { if (e.pointerId !== joy.id) return; joy.id = null; joy.x = 0; joy.y = 0; moveKnob(0, 0); base.style.left = '50%'; base.style.top = '50%'; zone.classList.remove('active'); };
          zone.addEventListener('pointerup', release); zone.addEventListener('pointercancel', release);
          zone.addEventListener('contextmenu', e => e.preventDefault());
        }
        const actBtn = el.querySelector('.fp-act');
        let actHeld = false;
        if (actBtn) {
          actBtn.addEventListener('pointerdown', e => { e.preventDefault(); if (self.talk) { if (astroNext) astroNext(); return; } actHeld = true; act(); });
          const up = () => { actHeld = false; };
          actBtn.addEventListener('pointerup', up); actBtn.addEventListener('pointercancel', up); actBtn.addEventListener('pointerleave', up);
          actBtn.addEventListener('contextmenu', e => e.preventDefault());
        }

        const fwd = () => ({ x: -Math.sin(P.yaw), z: -Math.cos(P.yaw) });
        const right = () => ({ x: Math.cos(P.yaw), z: -Math.sin(P.yaw) });
        const relAngle = (tx, tz) => { const dx = tx - P.x, dz = tz - P.z, f = fwd(), r = right(); return Math.atan2(dx * r.x + dz * r.z, dx * f.x + dz * f.z); };
        function focus() {
          let best = null;
          SPOTS.forEach(s => {
            if (s.only && !s.only()) return;
            const d = Math.hypot(s.x - P.x, s.z - P.z);
            if (d > s.r || (d > 1.2 && Math.abs(relAngle(s.x, s.z)) > 0.8)) return;
            if (!best || d < best.d) best = { s, d };
          });
          return best && best.s;
        }
        function act() { if (self.paused || self.talk || S.done) return; const f = focus(); if (f) interact(f.id); }
        self.act = act;

        // куда идти: первое невыполненное важное дело
        function ghTarget() {
          if (S.ghTutorial < 2) { const ind = IND.find(x => !S.indicators[x.k]) || IND[0]; return ind.pos; }
          if (!S.can.has) return POS.garden;
          const dryI = BEDS.findIndex((c, i) => bedZone(i) === 'dry');
          if (S.can.liters < 0.3 && dryI >= 0) return POS.tank;
          return dryI >= 0 ? plotPos[dryI] : POS.garden;
        }
        function target() {
          const T = S.today;
          if (self.goal) { if (Math.hypot(self.goal.x - P.x, self.goal.z - P.z) < 4) self.goal = null; else return self.goal; }
          if (S.day === DAYS && S.repair >= STEPS.length) return SHIP;
          if (!T.watered) return ghTarget();
          if (S.instructions > S.repair && !(STEPS[S.repair].part && S.parts < 1)) return SHIP;
          if (!T.called && !T.cleaning && !S.broken.antenna) return POS.radio;
          if (!T.energyPlanned) return POS.power;
          return POS.bed;
        }

        self.places = [
          { key: 'habitat', x: HB.x, z: HB.z, name: L('Жилой модуль', 'Habitat'), desc: L('радио, кровать, склад', 'radio, bed, store'), img: BA + 'mod-habitat.png' },
          { key: 'greenhouse', x: GH.x, z: GH.z, name: L('Теплица', 'Greenhouse'), desc: L('картофель, томаты, салат', 'potatoes, tomatoes, lettuce'), img: BA + 'mod-greenhouse.png' },
          { key: 'power', x: PW.x, z: PW.z, name: L('Энергоблок', 'Power room'), desc: L('батареи и расчёт энергии', 'batteries and energy plan'), img: BA + 'mod-battery.png' },
          { key: 'panels', x: 16.3, z: 11.5, name: L('Солнечные панели', 'Solar panels'), desc: L('энергия и пыль', 'energy and dust'), img: BA + 'mod-solar.png' },
          { key: 'ship', x: SHIP.x, z: SHIP.z, name: L('Корабль', 'Ship'), desc: L('«Звёздный вихрь», ремонт', '“Star Whirl”, repair'), img: 'assets/sprites/ship.png' }
        ];
        self.drawBigMap = cvs => {
          const g = cvs.getContext('2d'), W = cvs.width, H = cvs.height;
          drawMapOn(g, W, H, 6.4, W / 2 + 10, H / 2 - 30);
          const X = x => W / 2 + 10 + x * 6.4, Y = z => H / 2 - 30 + z * 6.4;
          self.places.forEach((pl, i) => {
            g.fillStyle = '#ff9a3c'; g.strokeStyle = '#2b2a6b'; g.lineWidth = 4; g.beginPath(); g.arc(X(pl.x), Y(pl.z), 17, 0, 7); g.fill(); g.stroke();
            g.fillStyle = '#fff'; g.font = '900 20px Nunito, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(i + 1, X(pl.x), Y(pl.z) + 1);
          });
          g.font = '800 15px Nunito, sans-serif'; g.fillStyle = '#2b2a6b';
          g.fillText(L('бур', 'drill'), X(DRILL.x), Y(DRILL.z) + 22); g.fillText(L('антенна', 'antenna'), X(ANT.x), Y(ANT.z) + 20); g.fillText(L('ты', 'you'), X(P.x), Y(P.z) - 18);
        };
        // зоны, где ASTRO рассказывает факты
        const ZONES = [
          { id: 'habitat', test: () => Math.hypot(P.x - HB.x, P.z - HB.z) < HB.R - 0.8 },
          { id: 'greenhouse', test: () => Math.hypot(P.x - GH.x, P.z - GH.z) < GH.R - 1.2 },
          { id: 'power', test: () => Math.hypot(P.x - PW.x, P.z - PW.z) < PW.R - 1.0 },
          { id: 'panels', test: () => P.x > 8 && P.x < 25 && P.z > 6.5 && P.z < 16.5 },
          { id: 'ship', test: () => Math.hypot(P.x - SHIP.x, P.z - SHIP.z) < 7.5 },
          { id: 'drill', test: () => Math.hypot(P.x - DRILL.x, P.z - DRILL.z) < 6 },
          { id: 'antenna', test: () => Math.hypot(P.x - ANT.x, P.z - ANT.z) < 5.5 }
        ];
        // пролёт камеры к ASTRO во вступлении
        let intro = null;
        self.flyIn = done => { intro = { k: 0, done }; };

        /* ---------- обновления по событиям игры ---------- */
        const wilt = new THREE.Color(0xa88a56);
        plantGroups.forEach(g => g.traverse(o => { if (o.material && o.material.color) o.userData.base = o.material.color.clone(); }));
        self.plantsUpdate = () => {
          S.beds.forEach((b, i) => {
            const g = plantGroups[i], k = b.hp / 100;
            g.scale.set(0.5 + k * 0.6, 0.35 + k * 0.75, 0.5 + k * 0.6);
            g.traverse(o => { if (o.userData.base) o.material.color.copy(o.userData.base).lerp(wilt, clamp01(1 - k * 1.3)); });
          });
        };
        self.shipUpdate = () => {
          hatch.rotation.y = S.repair >= STEPS.length ? 0 : 1.3;
                  };
        self.panelClean = i => PANELS[i].clean;
        self.panelSet = (i, clean) => { PANELS[i].clean = clean; PANELS[i].dustMesh.material.opacity = clean ? 0 : clamp01(0.25 + S.dust); };
        self.morning = () => { PANELS.forEach((p, i) => self.panelSet(i, !S.dust)); self.plantsUpdate(); };
        self.refresh = () => {
          const T = S.today;
          MARK.garden.visible = !T.watered && S.started; MARK.power.visible = !T.energyPlanned;
          MARK.radio.visible = !T.called && !T.cleaning && !S.broken.antenna;
          MARK.ship.visible = S.instructions > S.repair || (S.day === DAYS && S.repair >= STEPS.length);
          MARK.drill.visible = !!S.broken.drill; MARK.antenna.visible = !!S.broken.antenna;
          MARK.leak.visible = !!S.broken.leak; MARK.battery.visible = !!S.broken.battery;
          MARK.bed.visible = T.watered && T.energyPlanned && !(S.day === DAYS && S.repair >= STEPS.length);
          leakMark.visible = !!S.broken.leak; hotMark.visible = !!S.broken.battery; smokeDrill.visible = !!S.broken.drill;
          dishTilt.rotation.x = S.broken.antenna ? 0.5 : -0.9;
          beacon.material.color.setHex(S.broken.antenna ? 0xff5468 : 0x7ee0a0);
          const lit = Math.round(S.battery / cap() * cells.length);
          cells.forEach((c, i) => c.material.color.setHex(i < lit ? (S.battery / cap() > 0.3 ? 0x5fd8ff : 0xff6b8a) : 0x3b3770));
          tankLevel.scale.y = clamp01(S.water / 100) + 0.02; tankLevel.position.y = 0.8 + tankLevel.scale.y * 0.8;
          radio.upd(); powerScr.upd(); IND.forEach(ind => ind.scr.upd()); bars.forEach(d => d());
          standCan.visible = !S.can.has; handCan.visible = S.can.has;
          const gt = ghTarget(); MARK.garden.position.x = gt.x; MARK.garden.position.z = gt.z;
          canEl.hidden = !S.can.has;
          if (S.can.has) { canEl.querySelector('b').textContent = `${num(S.can.liters, 1)} / ${CAN_CAP} ${L('л', 'L')}`; canEl.querySelector('.bar i').style.width = (S.can.liters / CAN_CAP * 100) + '%'; }
        };
        self.morning(); self.shipUpdate(); self.refresh();

        /* ---------- цикл ---------- */
        let last = performance.now(), t = 0;
        function loop(now) {
          if (!running) return;
          const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
          if (intro) flyStep(dt);
          else if (!self.paused && !self.talk) update(dt);
          else { promptEl.hidden = true; pourAmt = 0; }
          animate(dt);
          renderer.render(scene, camera);
          drawMap();
          ctx.frame(loop);
        }
        ctx.frame(loop);
        function flyStep(dt) {
          intro.k = Math.min(1, intro.k + dt / 4.5);
          const e = intro.k < 0.5 ? 2 * intro.k * intro.k : 1 - Math.pow(-2 * intro.k + 2, 2) / 2;
          const from = new THREE.Vector3(-6, 26, 52), to = new THREE.Vector3(0, 1.6, 14.3);
          camera.position.lerpVectors(from, to, e);
          const look = new THREE.Vector3(0, 2, -2).lerp(new THREE.Vector3(A_STAND.x, 1.25, A_STAND.z), e);
          camera.lookAt(look);
          promptEl.hidden = true;
          if (intro.k >= 1) {
            P.x = to.x; P.z = to.z; P.yaw = 0; P.pitch = Math.atan2(1.25 - 1.6, 15 - A_STAND.z);
            camera.rotation.set(P.pitch, P.yaw, 0);
            const d = intro.done; intro = null; d();
          }
        }
        function update(dt) {
          const fw = (keys.w || keys.arrowup || keys['ц'] ? 1 : 0) - (keys.s || keys.arrowdown || keys['ы'] ? 1 : 0) - joy.y;
          const st = (keys.d || keys['в'] ? 1 : 0) - (keys.a || keys['ф'] ? 1 : 0);
          const turn = (keys.arrowright ? 1 : 0) - (keys.arrowleft ? 1 : 0) + joy.x * 0.9;
          P.yaw -= turn * 2.0 * dt;
          const sp = (inside(P.x, P.z) ? 3.4 : 6) * dt, f = fwd(), r = right();
          const mx = (f.x * clamp(fw, -1, 1) + r.x * st) * sp, mz = (f.z * clamp(fw, -1, 1) + r.z * st) * sp;
          if (free(P.x + mx, P.z)) P.x += mx;
          if (free(P.x, P.z + mz)) P.z += mz;
          const gy = Math.hypot(P.x, P.z) < 29 ? 0.06 : groundH(P.x, P.z);
          camera.position.set(P.x, gy + 1.6 + (fw || st ? Math.sin(t * 9) * 0.035 : 0), P.z);
          camera.rotation.set(P.pitch, P.yaw, 0);
          const fo = focus();
          promptEl.hidden = !fo;
          if (fo) promptEl.innerHTML = (touch ? '' : '<span class="kbd">E</span> ') + (typeof fo.label === 'function' ? fo.label() : fo.label);
          // полив: пока игрок держит кнопку над грядкой
          const hold = keys.e || keys['у'] || keys[' '] || actHeld;
          pourAmt = 0;
          if (fo && fo.plot !== undefined && hold && S.can.has) {
            if (S.can.liters > 0.001) {
              pourAmt = Math.min(dt * 1.2, S.can.liters);
              S.can.liters -= pourAmt; S.today.bedWater[fo.plot] += pourAmt;
              bars[fo.plot](); pourCheck(fo.plot);
              canEl.querySelector('b').textContent = `${num(S.can.liters, 1)} / ${CAN_CAP} ${L('л', 'L')}`; canEl.querySelector('.bar i').style.width = (S.can.liters / CAN_CAP * 100) + '%';
              if (S.can.liters <= 0.001) { S.can.liters = 0; canEmpty(); }
            }
          }
          // факты ASTRO при первом посещении мест
          if (S.started && !modal) for (const z of ZONES) if (!S.seen[z.id] && z.test()) { S.seen[z.id] = true; onZone(z.id); break; }
          const tg = target();
          arrowEl.style.transform = `rotate(${relAngle(tg.x, tg.z) * 180 / Math.PI}deg)`;
          distEl.textContent = Math.round(Math.hypot(tg.x - P.x, tg.z - P.z)) + L(' м', ' m');
        }
        function animate(dt) {
          // ASTRO: во вступлении стоит у входа, потом появляется рядом с игроком, когда говорит
          if (astroMode === 'stand' && S.started && !self.talk) astroMode = 'follow';
          if (astroMode === 'follow') {
            const f = fwd(), r = right();
            const tx = P.x + f.x * 2.1 + r.x * 0.95, tz = P.z + f.z * 2.1 + r.z * 0.95;
            if (astroVis < 0.05 && astroWant) astro.position.set(tx, 0, tz);
            astro.position.x += (tx - astro.position.x) * Math.min(1, dt * 4);
            astro.position.z += (tz - astro.position.z) * Math.min(1, dt * 4);
            astro.position.y = (Math.hypot(P.x, P.z) < 29 ? 0.06 : groundH(P.x, P.z)) + 0.55;
          } else astro.position.y = 0.25;
          astroVis += ((astroMode === 'stand' ? 1 : astroWant) - astroVis) * Math.min(1, dt * 6);
          astro.visible = astroVis > 0.03; astro.scale.setScalar(Math.max(0.001, astroVis));
          aBody.position.y = Math.sin(t * 2.4) * 0.06;
          astro.lookAt(camera.position.x, astro.position.y, camera.position.z);
          astro.userData.am.pose(astroWant || astroMode === 'stand' ? astroPose : 'idle', t, dt);
          astro.userData.jet.material.opacity = 0.4 + Math.random() * 0.25;
          const blink = (t % 3.2) < 0.12; astro.userData.eyes.forEach(e => { e.scale.y = blink ? 0.15 : 1; });
          // лейка в руке наклоняется, когда льёшь воду
          handCan.rotation.x += ((pourAmt > 0 ? -0.85 : 0) - handCan.rotation.x) * Math.min(1, dt * 8);
          if (pourAmt > 0) { spoutTip.getWorldPosition(tipV); camera.worldToLocal(tipV); }
          drops.forEach(p => {
            p.d.visible = pourAmt > 0 && handCan.visible;
            if (p.d.visible) { p.t = (p.t + dt * 2.4) % 1; p.d.position.set(tipV.x + p.dx, tipV.y - p.t * 0.6, tipV.z - p.t * 0.12); }
          });
          dishHolder.rotation.y += S.broken.antenna ? 0 : dt * 0.25;
          beacon.visible = Math.sin(t * 5) > 0;
          if (drillOn()) bit.rotation.y += dt * 7;
          Object.values(MARK).forEach(m => { m.position.y = m.userData.y + Math.sin(t * 3) * 0.15; });
          SMOKE.forEach(p => {
            p.t = (p.t + dt * 0.12) % 1; const k = p.t;
            p.sp.visible = S.repair < 3;
            p.sp.position.set(SHIP.x + 1 + k * 2, 3 + k * 9, SHIP.z + Math.sin(k * 6) * 0.6);
            const sc = 1.2 + k * 4.5; p.sp.scale.set(sc, sc, 1); p.sp.material.opacity = (1 - k) * 0.7 * (S.repair < 2 ? 1 : 0.5);
          });
          if (leakMark.visible) leakMark.children.forEach(c => { if (c.userData.k !== undefined) { const k = (t * 0.8 + c.userData.k / 4) % 1; c.position.set(0.15, 2.2 - k * 2.1, 0); } });
          if (hotMark.visible) hotMark.children.forEach((c, i) => { c.scale.setScalar(0.8 + Math.abs(Math.sin(t * 7 + i)) * 0.5); });
          if (smokeDrill.visible) { smokeDrill.position.y = 6.3 + (t % 2) * 1.5; smokeDrill.scale.setScalar(1 + (t % 2)); smokeDrill.material.opacity = 0.6 - (t % 2) * 0.3; }
        }
        function drawMap() { drawMapOn(mg, mapCv.width, mapCv.height, 1.75, mapCv.width / 2, mapCv.height / 2 - 6, true); }
        function drawMapOn(mg, W, H, sc, ox, oy, small) {
          const X = x => ox + x * sc, Y = z => oy + z * sc, q = small ? 1 : 2.6;
          mg.clearRect(0, 0, W, H);
          mg.fillStyle = '#ffb48a'; mg.fillRect(0, 0, W, H);
          mg.fillStyle = '#ffdcc6'; mg.beginPath(); mg.arc(X(0), Y(0), 29 * sc, 0, 7); mg.fill();
          PASSAGES.filter(p => p.to).forEach(p => { mg.strokeStyle = '#2b2a6b'; mg.lineWidth = 5; mg.beginPath(); mg.moveTo(X(p.sx), Y(p.sz)); mg.lineTo(X(p.sx + p.dx * p.len), Y(p.sz + p.dz * p.len)); mg.stroke(); mg.strokeStyle = '#fff'; mg.lineWidth = 3; mg.stroke(); });
          DOMES.forEach(d => { mg.fillStyle = d.glass ? '#9fe8ff' : '#ffffff'; mg.strokeStyle = '#2b2a6b'; mg.lineWidth = 1.5; mg.beginPath(); mg.arc(X(d.x), Y(d.z), d.R * sc, 0, 7); mg.fill(); mg.stroke(); });
          PANELS.forEach(p => { mg.fillStyle = p.clean ? '#2a55e0' : '#b9774c'; mg.fillRect(X(p.x) - 3 * q, Y(p.z) - 2 * q, 6 * q, 4 * q); });
          mg.fillStyle = '#ff5d6c'; mg.beginPath(); mg.arc(X(SHIP.x), Y(SHIP.z), 4 * q, 0, 7); mg.fill();
          mg.fillStyle = '#6fc8ff'; mg.beginPath(); mg.arc(X(DRILL.x), Y(DRILL.z), 3 * q, 0, 7); mg.fill();
          mg.fillStyle = '#9a96d0'; mg.beginPath(); mg.arc(X(ANT.x), Y(ANT.z), 2.5 * q, 0, 7); mg.fill();
          if (small) { const tg = target(); mg.strokeStyle = '#ff9a3c'; mg.lineWidth = 2; mg.beginPath(); mg.arc(X(tg.x), Y(tg.z), 5 + Math.sin(t * 5), 0, 7); mg.stroke(); }
          const f = fwd();
          mg.save(); mg.translate(X(P.x), Y(P.z)); mg.rotate(Math.atan2(f.z, f.x));
          const k = small ? 1 : 2.2;
          mg.fillStyle = '#ff3d6e'; mg.beginPath(); mg.moveTo(6 * k, 0); mg.lineTo(-4 * k, -4 * k); mg.lineTo(-4 * k, 4 * k); mg.closePath(); mg.fill();
          mg.restore();
        }
      }
      return self;
    }
  }
});
