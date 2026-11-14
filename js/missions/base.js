/* =====================================================================
   Симулятор «База на Луне или Марсе» / Moon or Mars Base Simulator
   Живая симуляция по солам: энергия, кислород, вода, еда, радиация,
   теплица, поломки и задержка связи с Землёй. У каждого решения есть цена,
   а последствия видны сразу (прогноз «+/− за сол») и в конце (графики).
   ===================================================================== */
Game.register({
  id: 'base', order: 6, img: 'base-mars',
  get tag() { return L('Симулятор', 'Simulator'); },
  get title() { return L('База на Луне или Марсе', 'Moon or Mars Base'); },
  get situation() { return L('Ты — командир базы. 30 солов распределяй энергию, воду и еду, береги экипаж от радиации и справляйся с бурями и поломками.', 'You command a base. For 30 sols, share out energy, water and food, protect the crew from radiation and handle storms and breakdowns.'); },
  get skills() { return L(['Жизнеобеспечение', 'Энергия', 'Еда', 'Радиация', 'Связь'], ['Life support', 'Energy', 'Food', 'Radiation', 'Comms']); },
  get learn() {
    return L([
      'Человеку в сутки нужно примерно <b>0,84 кг кислорода</b>, 3–4 литра воды и около 0,6 кг сухой еды.',
      'Кислород на базе получают из воды <b>электролизом</b>: электричество разделяет воду на кислород и водород. Поэтому вода, кислород и энергия связаны.',
      'Системы очистки возвращают до <b>85–90% воды</b>. Без них запасы тают в разы быстрее.',
      'На <b>Луне</b> ночь длится около 14 земных суток: солнечные панели молчат, нужна ядерная установка и большие аккумуляторы. На <b>Марсе</b> бывают пыльные бури, которые закрывают Солнце на дни и недели.',
      'Сигнал от Марса до Земли идёт от <b>4 до 24 минут</b> в одну сторону, а до Луны — около <b>1,3 секунды</b>. На Марсе экипаж должен уметь решать проблемы сам.',
      'На Луне нет атмосферы и магнитного поля, поэтому радиации больше, чем на Марсе. Лучшая защита — толстый слой грунта (реголита) или воды.',
      'Теплица даёт свежую еду и радует экипаж, но растениям нужны свет, вода и время.'
    ], [
      'A person needs about <b>0.84 kg of oxygen</b>, 3–4 litres of water and about 0.6 kg of dry food a day.',
      'Bases make oxygen from water by <b>electrolysis</b>: electricity splits water into oxygen and hydrogen. So water, oxygen and energy are all linked.',
      'Recycling systems recover up to <b>85–90% of water</b>. Without them, supplies run out many times faster.',
      'On the <b>Moon</b> a night lasts about 14 Earth days: solar panels go quiet, so a nuclear generator and big batteries are needed. On <b>Mars</b> dust storms can hide the Sun for days or weeks.',
      'A signal from Mars to Earth takes <b>4 to 24 minutes</b> one way; from the Moon about <b>1.3 seconds</b>. On Mars the crew must be able to solve problems on their own.',
      'The Moon has no atmosphere or magnetic field, so there’s more radiation than on Mars. The best protection is a thick layer of soil (regolith) or water.',
      'A greenhouse gives fresh food and cheers the crew up, but plants need light, water and time.'
    ]);
  },

  start(ctx) {
    const { h, sfx, esc, clamp, pick } = ctx;
    const B = 'assets/base/';
    ctx.steps(L(['Выбор места', 'Управление базой', 'Итоги'], ['Location', 'Run the base', 'Results']));
    const SOLS = 30;
    const fmt = (n, d = 0) => L(n.toFixed(d).replace('.', ','), n.toFixed(d));
    const signed = (n, d = 1) => (n > 0 ? '+' : n < 0 ? '−' : '±') + fmt(Math.abs(n), d);

    /* ---------- места ---------- */
    const PLACES = {
      mars: {
        id: 'mars', img: 'base-mars', name: L('Марс', 'Mars'), day: L('сол', 'sol'),
        facts: L(['Сила тяжести: 38% от земной', 'Сутки (сол): 24 ч 37 мин', 'Связь с Землёй: 4–24 мин', 'Опасность: пыльные бури', 'Радиация: средняя'],
                 ['Gravity: 38% of Earth’s', 'Day (sol): 24 h 37 min', 'Signal to Earth: 4–24 min', 'Danger: dust storms', 'Radiation: medium']),
        solar: 7.5, nuclear: 0, panels: 6, rad: 0.35, radEva: 0.8, delay: 0.6, delayText: L('12 минут', '12 minutes')
      },
      moon: {
        id: 'moon', img: 'base-moon', name: L('Луна', 'Moon'), day: L('день', 'day'),
        facts: L(['Сила тяжести: 17% от земной', 'Ночь длится 14 земных суток', 'Связь с Землёй: 1,3 секунды', 'Опасность: долгая ночь и холод', 'Радиация: высокая'],
                 ['Gravity: 17% of Earth’s', 'A night lasts 14 Earth days', 'Signal to Earth: 1.3 seconds', 'Danger: long cold night', 'Radiation: high']),
        solar: 9, nuclear: 10, panels: 4, rad: 0.5, radEva: 1.2, delay: 0.02, delayText: L('1,3 секунды', '1.3 seconds')
      }
    };
    let C = null; // выбранное место
    let S = null; // состояние базы
    let modal = null;

    choose();

    /* =================================================================
       1. ВЫБОР МЕСТА
       ================================================================= */
    function choose() {
      ctx.step(0);
      ctx.mc(L('Командир, Земля поручает тебе первую постоянную базу. Где её построим? У каждого места свои трудности.',
               'Commander, Earth is handing you the first permanent base. Where shall we build it? Each place has its own challenges.'));
      const card = p => `
        <button class="place-card panel" data-p="${p.id}">
          <span class="ph" style="background-image:url('${B}${p.img}.jpg')"></span>
          <h3>${p.name}</h3>
          <ul>${p.facts.map(f => `<li>${esc(f)}</li>`).join('')}</ul>
          <span class="btn orange">${L('Строить здесь', 'Build here')}</span>
        </button>`;
      const el = h(`
        <div>
          <div class="place-grid">${card(PLACES.moon)}${card(PLACES.mars)}</div>
          <div class="panel card" style="margin-top:16px">
            <h3>${L('Цель', 'Goal')}</h3>
            <p>${L('Продержись <b>30 солов</b>, сохрани экипаж здоровым и набери <b>60 очков науки</b> в лаборатории. Время идёт само, но его можно поставить на паузу. Следи за цифрами «за сол»: они показывают, что будет завтра.',
                   'Survive <b>30 sols</b>, keep the crew healthy and earn <b>60 science points</b> in the lab. Time runs by itself, but you can pause it. Watch the “per sol” numbers: they show what will happen tomorrow.')}</p>
          </div>
        </div>`);
      el.querySelectorAll('.place-card').forEach(b => b.onclick = () => { sfx.click(); C = PLACES[b.dataset.p]; setup(); });
      ctx.stage.appendChild(el);
    }

    /* =================================================================
       2. СИМУЛЯЦИЯ
       ================================================================= */
    const TASKS = ['farm', 'repair', 'science', 'eva', 'rest'];
    const TASK = {
      farm: L('Теплица', 'Farm'), repair: L('Ремонт', 'Repair'), science: L('Наука', 'Science'), eva: L('Вылазка', 'EVA'), rest: L('Отдых', 'Rest')
    };
    const TASK_HINT = {
      farm: L('урожай +50%', 'harvest +50%'), repair: L('чинит поломки', 'fixes breakdowns'), science: L('очки науки', 'science points'),
      eva: L('лёд → вода, иногда запчасти; радиация', 'ice → water, sometimes parts; radiation'), rest: L('здоровье и настроение', 'health and mood')
    };
    const SYS = {
      o2: { name: L('Генератор кислорода', 'Oxygen generator'), icon: 'o2gen', kw: 5, desc: L('4 кг O₂ из 4,5 л воды', '4 kg O₂ from 4.5 L of water') },
      water: { name: L('Очистка воды', 'Water recycler'), icon: 'recycler', kw: 3, desc: L('возвращает 85% воды', 'recovers 85% of water') },
      lab: { name: L('Лаборатория', 'Laboratory'), icon: 'habitat', kw: 3, desc: L('учёные получают очки науки', 'scientists earn points') }
    };

    function setup() {
      const crew = L(['Айгерим', 'Тимур', 'Лена', 'Макс'], ['Aigerim', 'Timur', 'Lena', 'Max']);
      S = {
        sol: 1, t: 0, speed: 1, running: false,
        battery: 40, cap: 60, panels: C.panels, o2: 40, waterL: 300, food: 50, parts: 10, science: 0,
        sys: { o2: true, water: true, lab: true }, lamps: 1, ration: 'normal', grow: 0,
        broken: {}, shelter: false, building: [],
        crew: crew.map((n, i) => ({ name: n, task: ['farm', 'science', 'repair', 'science'][i], hp: 100, mood: 80, dose: 0, gone: false })),
        storm: 0, stormAt: C.id === 'mars' ? 6 + Math.floor(Math.random() * 6) : 0,
        flareAt: 16 + Math.floor(Math.random() * 7), supplyAt: 15,
        askEta: null, askFor: null, hint: false,
        log: [], hist: []
      };
      ctx.step(1);
      ctx.stage.classList.add('wide');
      ctx.mc(L(`База на ${C.id === 'mars' ? 'Марсе' : 'Луне'} развёрнута! Всё работает, но запасы ограничены. Нажми <b>«Пуск»</b>, чтобы пошло время.`,
               `The base on ${C.id === 'mars' ? 'Mars' : 'the Moon'} is set up! Everything works, but supplies are limited. Press <b>“Run”</b> to start the clock.`));
      document.querySelector('.bg').style.backgroundImage = `url("${B}${C.img}.jpg")`; // фон под выбранное место
      buildUI();
      addLog(L('База развёрнута. Экипаж из 4 человек приступил к работе.', 'Base deployed. The crew of 4 has started work.'));
      ctx.every(100, tick);
    }

    /* ---------- расчёт одного сола (dry = только прогноз) ---------- */
    function isNight(sol) { return C.id === 'moon' && sol >= 11 && sol <= 20; }
    function alive() { return S.crew.filter(c => !c.gone); }
    function workers(task) { return alive().filter(c => c.task === task).length; }
    function solarFactor(sol) {
      if (isNight(sol)) return 0;
      if (S.storm > 0) return 0.25;
      return 1;
    }
    function balance(sol = S.sol) {
      const n = alive().length;
      const night = isNight(sol), cold = night || S.storm > 0;
      const prod = S.panels * C.solar * solarFactor(sol) - (S.broken.panel ? C.solar * 2 : 0) + C.nuclear;
      const use = {
        life: 6 + (cold ? 4 : 0),
        o2: S.sys.o2 && !S.broken.o2 ? SYS.o2.kw : 0,
        water: S.sys.water && !S.broken.water ? SYS.water.kw : 0,
        lamps: S.broken.lamps ? 0 : S.lamps * 2,
        lab: S.sys.lab ? SYS.lab.kw : 0
      };
      const cons = Object.values(use).reduce((a, b) => a + b, 0);
      const rationKg = { low: 0.4, normal: 0.6, high: 0.8 }[S.ration];
      const o2Made = use.o2 ? 4 : 0;
      const waterUse = n * 4 + (use.o2 ? 4.5 : 0) + (S.lamps && !S.broken.lamps ? S.lamps * 2 : 0);
      const waterBack = use.water ? n * 4 * 0.85 : 0;
      const ice = workers('eva') * 12;
      const harvest = S.grow >= 4 && use.lamps ? S.lamps * 0.7 * (1 + 0.5 * Math.min(1, workers('farm'))) : 0;
      return {
        prod, cons, net: prod - cons, use,
        o2: o2Made - n * 0.84,
        water: -waterUse + waterBack + ice,
        food: harvest - n * rationKg,
        harvest, ice, rationKg
      };
    }

    function step() {
      // ---- энергия и отключения по приоритету
      let b = balance();
      let bat = S.battery + b.net;
      const shed = [];
      const order = [['lab', () => { S.sys.lab = false; }], ['lamps', () => { S.lamps = 0; }], ['water', () => { S.sys.water = false; }], ['o2', () => { S.sys.o2 = false; }]];
      for (const [k, off] of order) {
        if (bat >= 0) break;
        if (b.use[k] > 0) { off(); shed.push(k); b = balance(); bat = S.battery + b.net; }
      }
      let freezing = false;
      if (bat < 0) { freezing = true; bat = 0; }
      S.battery = clamp(bat, 0, S.cap);
      if (shed.length) addLog(L(`Энергии не хватило! Автоматика отключила: ${shed.map(sysName).join(', ')}.`, `Not enough energy! The system switched off: ${shed.map(sysName).join(', ')}.`), 'bad');

      // ---- ресурсы
      S.o2 += b.o2; S.waterL += b.water; S.food += b.food;
      if (b.harvest > 0 && Math.random() < 0.35) addLog(L(`Урожай в теплице: +${fmt(b.harvest, 1)} кг еды.`, `Greenhouse harvest: +${fmt(b.harvest, 1)} kg of food.`), 'good');
      if (b.ice > 0) addLog(L(`Вылазка: добыто ${fmt(b.ice)} л воды из льда.`, `EVA: ${fmt(b.ice)} L of water mined from ice.`));
      if (S.lamps > 0 && !S.broken.lamps) S.grow++; else S.grow = Math.max(0, S.grow - 1);
      // вылазка иногда находит запчасти
      for (let i = 0; i < workers('eva'); i++) if (Math.random() < 0.3) { S.parts++; addLog(L('Вылазка нашла полезные обломки: +1 запчасть.', 'The EVA found useful scrap: +1 spare part.')); }
      // наука
      if (S.sys.lab) alive().filter(c => c.task === 'science').forEach(c => { S.science += 2.2 * (0.5 + c.mood / 200); });

      // ---- экипаж
      const lackO2 = S.o2 <= 0, lackFood = S.food <= 0, lackWater = S.waterL <= 0;
      S.o2 = Math.max(0, S.o2); S.food = Math.max(0, S.food); S.waterL = Math.max(0, S.waterL);
      alive().forEach(c => {
        let dose = C.rad * (S.shelter ? 0.7 : 1) + (c.task === 'eva' ? C.radEva : 0);
        c.dose += dose;
        if (lackO2) c.hp -= 25;
        if (lackFood) c.hp -= 10;
        if (lackWater) c.hp -= 15;
        if (freezing) c.hp -= 8;
        if (c.dose > 30) c.hp -= 3;
        if (S.ration === 'low') { c.mood -= 4; c.hp -= 1; }
        if (S.ration === 'high') c.mood += 2;
        if (c.task === 'rest') { c.hp += 6; c.mood += 6; } else c.mood -= 1.5;
        if (S.lamps > 0) c.mood += 0.8; // зелень радует
        if (c.task === 'eva' && Math.random() < 0.04) { c.hp -= 15; addLog(L(`${c.name} поранился на вылазке (−15 здоровья).`, `${c.name} got hurt on the EVA (−15 health).`), 'bad'); }
        c.hp = clamp(c.hp, 0, 100); c.mood = clamp(c.mood, 0, 100);
        if (c.hp <= 0 && !c.gone) { c.gone = true; addLog(L(`${c.name} эвакуирован на Землю: здоровье на нуле.`, `${c.name} was evacuated to Earth: health hit zero.`), 'bad'); }
      });
      if (lackO2) addLog(L('Кислород кончился! Экипаж задыхается.', 'Oxygen ran out! The crew is suffocating.'), 'bad');
      if (lackFood) addLog(L('Еда кончилась! Экипаж голодает.', 'Food ran out! The crew is starving.'), 'bad');
      if (lackWater) addLog(L('Вода кончилась!', 'Water ran out!'), 'bad');
      if (freezing) addLog(L('Даже жизнеобеспечению не хватило энергии — на базе холодно.', 'Even life support lacked energy — it’s cold in the base.'), 'bad');

      // ---- ремонт
      const fixers = workers('repair');
      const brokenKeys = Object.keys(S.broken);
      if (fixers && brokenKeys.length) {
        const k = brokenKeys[0];
        const need = S.hint ? 1 : 2;
        if (S.parts >= need) {
          S.parts -= need; delete S.broken[k];
          addLog(L(`Отремонтировано: ${sysName(k)} (−${need} запч.).`, `Repaired: ${sysName(k)} (−${need} parts).`), 'good');
          if (S.hint) S.hint = false;
        } else addLog(L('Для ремонта не хватает запчастей!', 'Not enough spare parts for the repair!'), 'bad');
      }

      // ---- стройка
      S.building = S.building.filter(bd => {
        bd.left--;
        if (bd.left > 0) return true;
        bd.done();
        addLog(L(`Построено: ${bd.name}.`, `Built: ${bd.name}.`), 'good');
        return false;
      });

      // ---- история для графиков
      S.hist.push({ sol: S.sol, bat: S.battery / S.cap * 100, o2: S.o2, water: S.waterL, food: S.food, crew: alive().length, sci: S.science });

      S.sol++;
      events();
      if (S.storm > 0) { S.storm--; if (S.storm === 0) addLog(L('Пыльная буря закончилась. Солнце снова светит!', 'The dust storm is over. The Sun is shining again!'), 'good'); }
      // ответ Земли пришёл?
      checkEnd();
    }

    function sysName(k) {
      return ({ o2: SYS.o2.name, water: SYS.water.name, lab: SYS.lab.name, lamps: L('Лампы теплицы', 'Greenhouse lamps'), panel: L('Солнечная панель', 'Solar panel') })[k] || k;
    }

    /* ---------- события ---------- */
    function events() {
      const sol = S.sol;
      // Луна: ночь
      if (C.id === 'moon' && sol === 10) ask(L('Завтра наступает лунная ночь', 'Lunar night begins tomorrow'),
        L('Солнце уйдёт за горизонт на 10 дней. Панели перестанут давать энергию, останется только ядерная установка: 10 кВт·ч в день. Обогрев потребует больше. Что сделаем?',
          'The Sun will set for 10 days. The panels will stop producing; only the nuclear generator remains: 10 kWh a day. Heating will need more. What shall we do?'),
        [
          { t: L('Экономить: выключить лабораторию и оставить 1 лампу', 'Save energy: turn off the lab and keep 1 lamp'), f: () => { S.sys.lab = false; S.lamps = Math.min(S.lamps, 1); addLog(L('Режим экономии на лунную ночь.', 'Energy-saving mode for the lunar night.')); } },
          { t: L('Работать как обычно', 'Work as usual'), f: () => addLog(L('Решили работать как обычно — аккумуляторы быстро разрядятся.', 'Decided to work as usual — the batteries will drain fast.'), 'bad') }
        ]);
      if (C.id === 'moon' && sol === 21) addLog(L('Рассвет! Солнце снова освещает панели.', 'Sunrise! The Sun lights up the panels again.'), 'good');
      // Марс: пыльная буря (предупреждение приходит с задержкой связи)
      if (C.id === 'mars' && sol === S.stormAt) {
        ask(L('Пыльная буря!', 'Dust storm!'),
          L(`Пыль закрыла Солнце: панели дают лишь четверть энергии на ближайшие 4 сола. Предупреждение с Земли шло ${C.delayText} и пришло, когда буря уже началась. Что сделаем?`,
            `Dust has blocked the Sun: the panels give only a quarter of the energy for the next 4 sols. Earth’s warning took ${C.delayText} and arrived after the storm began. What shall we do?`),
          [
            { t: L('Отключить лабораторию и лампы, отправить всех отдыхать', 'Turn off the lab and lamps, send everyone to rest'), f: () => { S.sys.lab = false; S.lamps = 0; alive().forEach(c => { c.task = 'rest'; }); } },
            { t: L('Отключить только лабораторию', 'Turn off only the lab'), f: () => { S.sys.lab = false; } },
            { t: L('Ничего не менять', 'Change nothing'), f: () => {} }
          ]);
        S.storm = 4;
      }
      // солнечная вспышка
      if (sol === S.flareAt) {
        const opts = [];
        if (S.shelter) opts.push({ t: L('Все в укрытие из реголита на 1 сол', 'Everyone into the regolith shelter for 1 sol'), f: () => { alive().forEach(c => { c.dose += 1; c.task = 'rest'; }); addLog(L('Экипаж переждал вспышку в укрытии: +1 мЗв.', 'The crew waited out the flare in the shelter: +1 mSv.'), 'good'); } });
        opts.push({ t: L('Спрятаться за баками с водой', 'Hide behind the water tanks'), f: () => { alive().forEach(c => { c.dose += 6; }); S.waterL -= 0; addLog(L('Экипаж спрятался за баками с водой: +6 мЗв.', 'The crew hid behind the water tanks: +6 mSv.')); } });
        opts.push({ t: L('Продолжать работу', 'Keep working'), f: () => { alive().forEach(c => { c.dose += 18; c.hp -= 10; }); S.science += 4; addLog(L('Работали во время вспышки: +18 мЗв и −10 здоровья каждому.', 'Worked through the flare: +18 mSv and −10 health each.'), 'bad'); } });
        ask(L('Солнечная вспышка!', 'Solar flare!'),
          L(`ЦУП предупреждает: через несколько часов придёт поток частиц. ${C.id === 'mars' ? 'Сигнал шёл 12 минут.' : 'Сигнал пришёл почти мгновенно.'} ${S.shelter ? 'У нас есть укрытие.' : 'Укрытия из реголита у нас нет.'}`,
            `Mission Control warns: a stream of particles arrives in a few hours. ${C.id === 'mars' ? 'The signal took 12 minutes.' : 'The signal arrived almost instantly.'} ${S.shelter ? 'We have a shelter.' : 'We have no regolith shelter.'}`), opts);
      }
      // грузовой корабль
      if (sol === S.supplyAt) { S.parts += 6; S.food += 15; addLog(L('Прибыл грузовой корабль с Земли: +6 запчастей, +15 кг еды!', 'A cargo ship arrived from Earth: +6 spare parts, +15 kg of food!'), 'good'); sfx.ok(); }
      // случайные поломки
      if (sol > 3 && Math.random() < 0.13) {
        const k = pick(['o2', 'water', 'lamps', 'panel'].filter(x => !S.broken[x]));
        if (k) {
          S.broken[k] = true;
          sfx.alarm();
          addLog(L(`Поломка: ${sysName(k)}! Поставь кого-нибудь на ремонт.`, `Breakdown: ${sysName(k)}! Assign someone to repair.`), 'bad');
          ctx.mc(L(`<b>Поломка: ${sysName(k)}.</b> Назначь члена экипажа на «Ремонт». Можно спросить совет у Земли — тогда понадобится меньше запчастей.`,
                   `<b>Breakdown: ${sysName(k)}.</b> Assign a crew member to “Repair”. You can ask Earth for advice — then fewer parts will be needed.`), 'alarm');
        }
      }
      // ответ Земли
      if (S.askEta !== null && S.sol + S.t >= S.askEta) {
        S.askEta = null; S.hint = true;
        addLog(L('Пришёл ответ ЦУП с инструкцией по ремонту: следующий ремонт потребует 1 запчасть вместо 2.', 'Mission Control’s answer arrived with repair instructions: the next repair needs 1 part instead of 2.'), 'good');
        ctx.mc(L('ЦУП: «Получили ваш вопрос. Высылаем инструкцию — ремонт будет проще».', 'Mission Control: “Got your question. Sending instructions — the repair will be easier.”'), 'good');
      }
    }

    // окно с решением: время на паузе, пока игрок не выберет
    function ask(title, text, opts) {
      S.running = false; renderTop();
      sfx.alarm();
      modal = h(`<div class="fp-modal"><div class="panel card fp-modal-card">
        <div class="eyebrow">${L('Сол', 'Sol')} ${S.sol} · ${L('решение командира', 'commander’s decision')}</div>
        <h2>${title}</h2><p>${text}</p>
        <div class="options">${opts.map((o, i) => `<button class="opt" data-i="${i}">${esc(o.t)}</button>`).join('')}</div>
      </div></div>`);
      document.body.appendChild(modal);
      modal.querySelectorAll('.opt').forEach(b => b.onclick = () => {
        sfx.click();
        opts[+b.dataset.i].f();
        modal.remove(); modal = null;
        render();
      });
    }
    ctx.onCleanup(() => { if (modal) modal.remove(); });

    function checkEnd() {
      const n = alive().length;
      if (n === 0) { finish(false, L('Весь экипаж эвакуирован — база закрыта.', 'The whole crew was evacuated — the base is closed.')); return; }
      if (S.sol > SOLS) finish(true);
    }

    /* ---------- таймер ---------- */
    function tick() {
      if (!S || !S.running || modal) return;
      S.t += 0.1 / 7 * S.speed; // 1 сол ≈ 7 секунд на скорости 1×
      if (S.t >= 1) { S.t = 0; step(); render(); } else renderTop();
    }

    /* ---------- интерфейс ---------- */
    let el = null;
    function addLog(text, mood) {
      S.log.unshift({ sol: S.sol, text, mood });
      S.log = S.log.slice(0, 40);
    }
    function buildUI() {
      el = h(`
        <div class="base">
          <div class="base-top panel">
            <div class="base-scene" style="background-image:url('${B}${C.img}.jpg')">
              <div class="sol-badge screen"><span class="eyebrow">${C.name}</span><b class="sol"></b><i class="bar"><i></i></i><span class="daynight small"></span></div>
              <div class="speed">
                <button class="btn small orange" data-sp="run"></button>
                <button class="btn small ghost" data-sp="1">1×</button>
                <button class="btn small ghost" data-sp="3">3×</button>
              </div>
            </div>
            <div class="res-row"></div>
          </div>
          <div class="base-grid">
            <div class="panel card flat"><h3>${L('Экипаж', 'Crew')}</h3><div class="crew"></div></div>
            <div class="panel card flat"><h3>${L('Энергия и системы', 'Energy and systems')}</h3><div class="energy screen"></div><div class="systems"></div></div>
            <div class="panel card flat"><h3>${L('Еда и теплица', 'Food and greenhouse')}</h3><div class="farm"></div>
              <h3 style="margin-top:14px">${L('Стройка', 'Build')}</h3><div class="build"></div></div>
            <div class="panel card flat"><h3>${L('Журнал базы', 'Base log')}</h3><div class="comms"></div><ul class="log"></ul></div>
          </div>
        </div>`);
      ctx.stage.appendChild(el);
      el.querySelectorAll('[data-sp]').forEach(b => b.onclick = () => {
        sfx.click();
        const v = b.dataset.sp;
        if (v === 'run') S.running = !S.running; else { S.speed = +v; S.running = true; }
        renderTop();
      });
      render();
    }

    const icon = n => `<img class="mod" src="${B}mod-${n}.png" alt="" onerror="this.remove()">`;

    function renderTop() {
      el.querySelector('.sol').textContent = `${L('Сол', 'Sol')} ${Math.min(S.sol, SOLS)} / ${SOLS}`;
      el.querySelector('.sol-badge .bar i').style.width = (S.t * 100) + '%';
      const night = isNight(S.sol);
      el.querySelector('.daynight').textContent = night ? L('Лунная ночь', 'Lunar night') : S.storm > 0 ? L('Пыльная буря', 'Dust storm') : L('День', 'Day');
      el.querySelector('[data-sp=run]').textContent = S.running ? L('Пауза', 'Pause') : L('Пуск', 'Run');
      el.querySelectorAll('[data-sp="1"],[data-sp="3"]').forEach(b => b.classList.toggle('on', S.running && +b.dataset.sp === S.speed));
    }

    function render() {
      if (!el) return;
      renderTop();
      const b = balance();
      const n = alive().length;
      const daysLeft = (v, d) => d >= 0 ? '∞' : fmt(Math.max(0, v / -d), 0);
      const res = [
        { k: 'bat', name: L('Энергия', 'Energy'), v: `${fmt(S.battery)} / ${S.cap} ${L('кВт·ч', 'kWh')}`, d: b.net, unit: L('кВт·ч', 'kWh'), pct: S.battery / S.cap, left: daysLeft(S.battery, b.net) },
        { k: 'o2', name: L('Кислород', 'Oxygen'), v: `${fmt(S.o2, 1)} ${L('кг', 'kg')}`, d: b.o2, unit: L('кг', 'kg'), pct: Math.min(1, S.o2 / 60), left: daysLeft(S.o2, b.o2) },
        { k: 'water', name: L('Вода', 'Water'), v: `${fmt(S.waterL)} ${L('л', 'L')}`, d: b.water, unit: L('л', 'L'), pct: Math.min(1, S.waterL / 400), left: daysLeft(S.waterL, b.water) },
        { k: 'food', name: L('Еда', 'Food'), v: `${fmt(S.food, 1)} ${L('кг', 'kg')}`, d: b.food, unit: L('кг', 'kg'), pct: Math.min(1, S.food / 70), left: daysLeft(S.food, b.food) },
        { k: 'parts', name: L('Запчасти', 'Parts'), v: `${S.parts}`, d: 0, unit: '', pct: Math.min(1, S.parts / 15), left: null },
        { k: 'sci', name: L('Наука', 'Science'), v: `${fmt(S.science)} / 60`, d: 0, unit: '', pct: Math.min(1, S.science / 60), left: null }
      ];
      el.querySelector('.res-row').innerHTML = res.map(r => `
        <div class="res ${r.pct < 0.2 && r.k !== 'sci' ? 'low' : ''}">
          <div class="r-name">${r.name}</div>
          <div class="r-val">${r.v}</div>
          <div class="bar"><i style="width:${Math.max(0, r.pct) * 100}%"></i></div>
          ${r.unit ? `<div class="r-d ${r.d < 0 ? 'neg' : 'pos'}">${signed(r.d)} ${r.unit}/${C.day}${r.d < 0 ? ` · ${L('хватит на', 'lasts')} ${r.left} ${C.day}` : ''}</div>` : ''}
        </div>`).join('');

      // экипаж
      el.querySelector('.crew').innerHTML = S.crew.map((c, i) => `
        <div class="crew-card ${c.gone ? 'gone' : ''}">
          <div class="c-top"><img src="assets/sprites/cadet.png" alt=""><b>${esc(c.name)}</b>${c.gone ? `<em>${L('эвакуирован', 'evacuated')}</em>` : ''}</div>
          <div class="c-bars">
            <span>${L('Здоровье', 'Health')}</span><i class="bar hp"><i style="width:${c.hp}%"></i></i>
            <span>${L('Настроение', 'Mood')}</span><i class="bar mood"><i style="width:${c.mood}%"></i></i>
            <span>${L('Доза', 'Dose')}</span><b class="${c.dose > 30 ? 'warn' : ''}">${fmt(c.dose, 1)} ${L('мЗв', 'mSv')}</b>
          </div>
          ${c.gone ? '' : `<div class="tasks">${TASKS.map(t => `<button data-c="${i}" data-t="${t}" class="${c.task === t ? 'on' : ''}" title="${esc(TASK_HINT[t])}">${TASK[t]}</button>`).join('')}</div>`}
        </div>`).join('');
      el.querySelectorAll('.tasks button').forEach(bt => bt.onclick = () => { sfx.click(); S.crew[+bt.dataset.c].task = bt.dataset.t; render(); });

      // энергия
      el.querySelector('.energy').innerHTML = `
        <div><span>${L('Выработка', 'Production')}</span><b>${fmt(b.prod, 1)}</b></div>
        <div><span>${L('Расход', 'Use')}</span><b>${fmt(b.cons, 1)}</b></div>
        <div><span>${L('Итог за', 'Net per')} ${C.day}</span><b class="${b.net < 0 ? 'neg' : 'pos'}">${signed(b.net)}</b></div>
        <div class="small">${L('панелей', 'panels')}: ${S.panels}${C.nuclear ? ` · ${L('ядерная установка', 'nuclear generator')}: ${C.nuclear}` : ''} · ${L('жизнеобеспечение', 'life support')}: ${fmt(b.use.life)} ${L('кВт·ч', 'kWh')}</div>`;
      el.querySelector('.systems').innerHTML = Object.entries(SYS).map(([k, s]) => `
        <div class="sys ${S.broken[k] ? 'broken' : ''} ${S.sys[k] ? '' : 'off'}" data-k="${k}">
          ${icon(s.icon)}
          <div class="s-main"><b>${s.name}</b><span>${S.broken[k] ? L('Сломано — нужен ремонт', 'Broken — needs repair') : esc(s.desc)} · ${s.kw} ${L('кВт·ч', 'kWh')}</span></div>
          <span class="switch"></span>
        </div>`).join('');
      el.querySelectorAll('.sys').forEach(d => d.onclick = () => { sfx.click(); const k = d.dataset.k; S.sys[k] = !S.sys[k]; render(); });

      // теплица и рацион
      el.querySelector('.farm').innerHTML = `
        <div class="farm-row">${icon('greenhouse')}<div class="s-main"><b>${L('Лампы теплицы', 'Greenhouse lamps')}</b>
          <span>${S.broken.lamps ? L('Сломано — нужен ремонт', 'Broken — needs repair') : S.lamps ? (S.grow >= 4 ? L(`урожай ${fmt(b.harvest, 1)} кг за ${C.day}`, `harvest ${fmt(b.harvest, 1)} kg per ${C.day}`) : L(`растения растут: ${S.grow}/4 ${C.day}`, `plants growing: ${S.grow}/4 ${C.day}`)) : L('выключены — растения не растут', 'off — plants don’t grow')} · ${L('2 кВт·ч и 2 л воды за уровень', '2 kWh and 2 L water per level')}</span></div></div>
        <div class="seg wide lamps">${[0, 1, 2, 3].map(v => `<button data-l="${v}" class="${S.lamps === v ? 'on' : ''}">${v === 0 ? L('Выкл', 'Off') : v}</button>`).join('')}</div>
        <div class="s-main" style="margin-top:10px"><b>${L('Рацион', 'Rations')}</b><span>${L(`на человека: ${fmt(b.rationKg, 1)} кг за ${C.day}`, `per person: ${fmt(b.rationKg, 1)} kg per ${C.day}`)}</span></div>
        <div class="seg wide ration">${[['low', L('Урезанный', 'Reduced')], ['normal', L('Обычный', 'Normal')], ['high', L('Усиленный', 'Extra')]].map(([v, t]) => `<button data-r="${v}" class="${S.ration === v ? 'on' : ''}">${t}</button>`).join('')}</div>`;
      el.querySelectorAll('.lamps button').forEach(bt => bt.onclick = () => { sfx.click(); S.lamps = +bt.dataset.l; render(); });
      el.querySelectorAll('.ration button').forEach(bt => bt.onclick = () => { sfx.click(); S.ration = bt.dataset.r; render(); });

      // стройка
      const BUILD = [
        { id: 'panel', icon: 'solar', name: L('Солнечная панель', 'Solar panel'), cost: 3, time: 1, info: L(`+${C.solar} кВт·ч днём`, `+${C.solar} kWh in daylight`), done: () => { S.panels++; } },
        { id: 'battery', icon: 'battery', name: L('Аккумулятор', 'Battery'), cost: 3, time: 1, info: L('+30 кВт·ч запаса', '+30 kWh storage'), done: () => { S.cap += 30; } },
        { id: 'shelter', icon: 'shelter', name: L('Укрытие из реголита', 'Regolith shelter'), cost: 5, time: 2, info: L('защита от вспышек, −30% радиации', 'flare protection, −30% radiation'), once: true, done: () => { S.shelter = true; } }
      ];
      el.querySelector('.build').innerHTML = BUILD.map(bd => {
        const busy = S.building.some(x => x.id === bd.id), done = bd.once && S.shelter;
        return `<button class="build-btn" data-b="${bd.id}" ${busy || done || S.parts < bd.cost ? 'disabled' : ''}>
          ${icon(bd.icon)}<span><b>${bd.name}</b><em>${done ? L('построено', 'built') : busy ? L('строится…', 'building…') : `${bd.cost} ${L('запч.', 'parts')} · ${bd.time} ${C.day} · ${bd.info}`}</em></span></button>`;
      }).join('');
      el.querySelectorAll('.build-btn').forEach(bt => bt.onclick = () => {
        const bd = BUILD.find(x => x.id === bt.dataset.b);
        S.parts -= bd.cost; sfx.ok();
        S.building.push({ id: bd.id, name: bd.name, left: bd.time, done: bd.done });
        addLog(L(`Начали строить: ${bd.name}.`, `Started building: ${bd.name}.`));
        render();
      });

      // связь с Землёй
      const waiting = S.askEta !== null;
      el.querySelector('.comms').innerHTML = `
        <div class="comms-box">${icon('antenna')}<div class="s-main"><b>${L('Связь с Землёй', 'Link to Earth')}</b><span>${L('сигнал идёт', 'signal takes')} ${C.delayText}</span></div>
        <button class="btn small ${waiting || !Object.keys(S.broken).length ? 'ghost' : 'orange'}" ${waiting || !Object.keys(S.broken).length ? 'disabled' : ''}>${waiting ? L('Ждём ответ…', 'Waiting…') : L('Спросить совет', 'Ask for advice')}</button></div>`;
      const askBtn = el.querySelector('.comms button');
      if (askBtn) askBtn.onclick = () => {
        S.askEta = S.sol + S.t + C.delay; sfx.radio();
        addLog(L(`Отправили вопрос на Землю. Ответ придёт ${C.id === 'mars' ? 'не раньше чем через пол сола: сигнал идёт туда и обратно' : 'почти сразу'}.`,
                 `Sent a question to Earth. The answer will come ${C.id === 'mars' ? 'in about half a sol: the signal goes there and back' : 'almost immediately'}.`));
        if (C.id === 'moon') { // с Луны ответ приходит почти мгновенно
          S.askEta = null; S.hint = true;
          addLog(L('ЦУП ответил через пару секунд: следующий ремонт потребует 1 запчасть вместо 2.', 'Mission Control answered in a couple of seconds: the next repair needs 1 part instead of 2.'), 'good');
        }
        render();
      };
      el.querySelector('.log').innerHTML = S.log.slice(0, 12).map(l => `<li class="${l.mood || ''}"><span>${C.day} ${l.sol}</span>${l.text}</li>`).join('');
    }

    /* =================================================================
       3. ИТОГИ: графики последствий
       ================================================================= */
    function finish(ok, reason) {
      S.running = false;
      const n = alive().length;
      const healthy = alive().filter(c => c.hp >= 50).length;
      const maxDose = Math.max(...S.crew.map(c => c.dose));
      ctx.step(2);
      ctx.stage.classList.add('wide');
      const el2 = h(`
        <div class="panel card">
          <div class="task-title"><span class="num">3</span><h2>${ok ? L('База продержалась 30 солов!', 'The base held out for 30 sols!') : L('База закрыта', 'The base is closed')}</h2></div>
          ${reason ? `<p class="verdict">${reason}</p>` : ''}
          <p>${L('Вот как менялись запасы базы. Посмотри, где принятые решения сработали, а где пришлось расплачиваться.', 'Here is how the base’s supplies changed. See where your decisions worked and where you had to pay the price.')}</p>
          <canvas class="chart screen" width="900" height="320"></canvas>
          <div class="legend"><span style="--c:#ffd166">${L('Энергия, %', 'Energy, %')}</span><span style="--c:#5fd8ff">${L('Кислород, кг', 'Oxygen, kg')}</span><span style="--c:#7ea8ff">${L('Вода ÷ 5, л', 'Water ÷ 5, L')}</span><span style="--c:#7ee0a0">${L('Еда, кг', 'Food, kg')}</span><span style="--c:#ff9a3c">${L('Наука', 'Science')}</span></div>
          <h3>${L('Главные события', 'Key events')}</h3>
          <ul class="log big">${S.log.filter(l => l.mood).slice(0, 10).map(l => `<li class="${l.mood}"><span>${C.day} ${l.sol}</span>${l.text}</li>`).join('')}</ul>
          <div class="actions"><button class="btn orange big">${L('Получить оценку', 'See my rating')}</button></div>
        </div>`);
      ctx.stage.appendChild(el2);
      drawChart(el2.querySelector('.chart'));
      el2.querySelector('.actions button').onclick = () => {
        if (!ok) { ctx.fail(reason, L('Следи за цифрами «за сол»: если число красное — запас тает. Отключай второстепенное заранее, держи теплицу и очистку воды включёнными.', 'Watch the “per sol” numbers: red means a supply is shrinking. Turn off non-essentials early and keep the greenhouse and water recycler on.')); return; }
        let score = 1;
        const notes = [{ ok: true, text: L(`База на ${C.id === 'mars' ? 'Марсе' : 'Луне'} продержалась 30 солов. В строю: ${n} из 4.`, `The base on ${C.id === 'mars' ? 'Mars' : 'the Moon'} held out for 30 sols. Crew remaining: ${n} of 4.`) }];
        if (healthy >= 3) score++; else notes.push({ ok: false, text: L('Часть экипажа сильно пострадала. Давай отдых, следи за едой, кислородом и радиацией.', 'Some of the crew got badly hurt. Give rest and watch food, oxygen and radiation.') });
        if (S.science >= 60) { score++; notes.push({ ok: true, text: L(`Наука: ${fmt(S.science)} очков — цель выполнена!`, `Science: ${fmt(S.science)} points — goal reached!`) }); }
        else notes.push({ ok: false, text: L(`Наука: ${fmt(S.science)} из 60. Держи лабораторию включённой, когда хватает энергии.`, `Science: ${fmt(S.science)} of 60. Keep the lab on when there’s enough energy.`) });
        notes.push({ ok: maxDose < 30, text: L(`Самая большая доза радиации у экипажа: ${fmt(maxDose, 1)} мЗв.`, `Highest crew radiation dose: ${fmt(maxDose, 1)} mSv.`) });
        ctx.finish(score, notes);
      };
    }

    function drawChart(cv) {
      const g = cv.getContext('2d'), W = cv.width, H = cv.height, P = 34;
      g.clearRect(0, 0, W, H);
      g.strokeStyle = 'rgba(255,255,255,0.15)'; g.lineWidth = 1; g.fillStyle = 'rgba(232,246,255,0.7)'; g.font = '12px Nunito, sans-serif';
      for (let i = 0; i <= 4; i++) { const y = P + (H - 2 * P) * i / 4; g.beginPath(); g.moveTo(P, y); g.lineTo(W - 10, y); g.stroke(); g.fillText(String(100 - i * 25), 4, y + 4); }
      const xs = i => P + (W - P - 10) * (i / Math.max(1, S.hist.length - 1));
      const ys = v => H - P - (H - 2 * P) * Math.max(0, Math.min(100, v)) / 100;
      const line = (key, color, k = 1) => {
        g.strokeStyle = color; g.lineWidth = 3; g.beginPath();
        S.hist.forEach((p, i) => { const y = ys(p[key] * k); i ? g.lineTo(xs(i), y) : g.moveTo(xs(i), y); });
        g.stroke();
      };
      line('bat', '#ffd166'); line('o2', '#5fd8ff'); line('water', '#7ea8ff', 0.2); line('food', '#7ee0a0'); line('sci', '#ff9a3c');
      g.fillStyle = 'rgba(232,246,255,0.8)';
      S.hist.forEach((p, i) => { if (i % 5 === 0) g.fillText(String(p.sol), xs(i) - 4, H - 10); });
    }
  }
});
