/* =====================================================================
   Испытание 4. Поломка системы питания / Mission 4. Power Failure
   Шаги: приоритеты (что оставить, что отключить, E = P·t) →
   восстановить питание (повернуть солнечную панель к Солнцу) →
   включать системы обратно по приоритету.
   ===================================================================== */
Game.register({
  id: 'power', order: 4, img: 'power',
  get tag() { return L('Энергия', 'Energy'); },
  get title() { return L('Поломка питания', 'Power Failure'); },
  get situation() { return L('Система электропитания вышла из строя. Энергии в резервной батарее мало — нужно решать, что важнее.', 'The power system has failed. The backup battery is low — you must decide what matters most.'); },
  get skills() { return L(['Энергия', 'Логика', 'Приоритеты'], ['Energy', 'Logic', 'Priorities']); },
  get learn() {
    return L([
      'Энергия считается по формуле <b>E = P × t</b>: мощность (кВт) умножить на время (часы). Получаются киловатт-часы (кВт·ч).',
      'Если батарея 12 кВт·ч, а всё вместе потребляет 2 кВт, её хватит на 12 ÷ 2 = <b>6 часов</b>.',
      'В аварии сначала оставляют то, что <b>сохраняет жизнь</b> (воздух, тепло), потом то, что <b>помогает вернуться</b> (связь, навигация). Всё остальное может подождать.',
      'Солнечная панель даёт больше всего энергии, когда свет падает на неё <b>прямо</b>, под углом 90°. Если панель повернуть боком, энергии почти не будет.',
      'Когда питание вернулось, системы включают <b>по очереди</b>, начиная с самых важных, чтобы не перегрузить сеть.',
      'Солнечные панели МКС размером почти с футбольное поле. Они сами поворачиваются вслед за Солнцем.'
    ], [
      'Energy is calculated with the formula <b>E = P × t</b>: power (kW) times time (hours). The result is in kilowatt-hours (kWh).',
      'If a battery holds 12 kWh and everything together uses 2 kW, it will last 12 ÷ 2 = <b>6 hours</b>.',
      'In an emergency you first keep what <b>keeps people alive</b> (air, heat), then what <b>helps you get home</b> (communications, navigation). Everything else can wait.',
      'A solar panel makes the most energy when sunlight hits it <b>straight on</b>, at 90°. If the panel is turned sideways, it makes almost nothing.',
      'When power comes back, systems are turned on <b>one by one</b>, most important first, so the network isn’t overloaded.',
      'The ISS solar panels are almost as big as a football field. They turn by themselves to follow the Sun.'
    ]);
  },

  start(ctx) {
    const { h, sfx, shuffle, clamp, esc } = ctx;
    ctx.steps(L(['Приоритеты', 'Солнечная панель', 'Перезапуск'], ['Priorities', 'Solar panel', 'Restart']));

    const kW = L('кВт', 'kW'), kWh = L('кВт·ч', 'kWh'), hr = L('ч', 'h');
    const dec = n => L(n.toFixed(1).replace('.', ','), n.toFixed(1));
    const BATTERY = 12, NEED_H = 6;
    const ITEMS = [
      { id: 'life', img: 'dev-lifesupport', name: L('Жизнеобеспечение', 'Life support'), desc: L('Очистка воздуха и кислород', 'Air cleaning and oxygen'), kw: 0.8, role: 'critical',
        why: L('Без жизнеобеспечения экипажу нечем дышать!', 'Without life support the crew can’t breathe!') },
      { id: 'heat', img: 'c-heat', name: L('Обогрев кабины', 'Cabin heating'), desc: L('В тени в космосе очень холодно', 'It’s very cold in the shade in space'), kw: 0.4, role: 'critical',
        why: L('Без обогрева в кабине станет очень холодно. Тепло — это жизнь.', 'Without heating the cabin gets very cold. Warmth means life.') },
      { id: 'comm', img: 'dev-antenna', name: L('Связь с ЦУП', 'Link to Mission Control'), desc: L('Канал с Землёй', 'Channel to Earth'), kw: 0.3, role: 'needed',
        why: L('Связь нужна: ЦУП поможет найти решение.', 'You need the link: Mission Control will help find a solution.') },
      { id: 'nav', img: 'c-nav', name: L('Навигация', 'Navigation'), desc: L('Знает, где корабль и куда он летит', 'Knows where the ship is and where it’s going'), kw: 0.3, role: 'needed',
        why: L('Без навигации корабль потеряет ориентацию.', 'Without navigation the ship loses its orientation.') },
      { id: 'elight', img: 'c-elight', name: L('Аварийное освещение', 'Emergency lighting'), desc: L('Тусклый свет в кабине', 'Dim light in the cabin'), kw: 0.1, role: 'needed',
        why: L('Совсем без света в кабине работать нельзя. Аварийный свет почти ничего не тратит.', 'You can’t work in total darkness. Emergency light uses almost nothing.') },
      { id: 'light', img: 'c-light', name: L('Яркий свет во всех отсеках', 'Bright light in every module'), desc: L('Основное освещение', 'Main lighting'), kw: 0.5, role: 'optional' },
      { id: 'exp', img: 'c-exp', name: L('Научный эксперимент', 'Science experiment'), desc: L('Его можно повторить позже', 'It can be repeated later'), kw: 0.6, role: 'optional' },
      { id: 'green', img: 'c-green', name: L('Лампы оранжереи', 'Greenhouse lamps'), desc: L('Растения потерпят несколько часов', 'The plants can wait a few hours'), kw: 0.5, role: 'optional' },
      { id: 'screen', img: 'c-screen', name: L('Развлекательные экраны', 'Entertainment screens'), desc: L('Фильмы и игры', 'Movies and games'), kw: 0.4, role: 'optional' },
      { id: 'coffee', img: 'c-coffee', name: L('Кофемашина', 'Coffee machine'), desc: L('Горячие напитки', 'Hot drinks'), kw: 0.3, role: 'optional' }
    ];
    let mistakes = 0, angleTries = 0;

    stepPriorities();

    /* ---------------- 1. Приоритеты ---------------- */
    function stepPriorities() {
      ctx.step(0);
      ctx.mc(L('<b>Авария питания!</b> Главная батарея отключилась, работает только резервная: <b>12 кВт·ч</b>. Её должно хватить минимум на <b>6 часов</b>, пока мы чиним систему. Отключи лишнее!',
               '<b>Power emergency!</b> The main battery is down, only the backup is working: <b>12 kWh</b>. It must last at least <b>6 hours</b> while we fix the system. Turn off what you don’t need!'), 'alarm');
      const on = {};
      ITEMS.forEach(i => on[i.id] = true);
      const el = h(`
        <div class="power-layout">
          <div class="panel card" style="margin:0">
            <div class="task-title"><span class="num">1</span><h2>${L('Что оставить, а что отключить?', 'What to keep and what to turn off?')}</h2></div>
            <p>${L('Нажимай на систему, чтобы включить или выключить её. Подумай, без чего экипаж <b>не сможет</b> обойтись.', 'Tap a system to turn it on or off. Think about what the crew <b>can’t</b> do without.')}</p>
            <div class="consumers"></div>
            <div class="fb"></div>
          </div>
          <div class="screen meter">
            <div class="lbl">${L('Потребление', 'Power use')}</div>
            <div class="big p">0 ${kW}</div>
            <div class="lbl">${L(`Батарея ${BATTERY} кВт·ч хватит на`, `A ${BATTERY} kWh battery will last`)}</div>
            <div class="big hrs">0 ${hr}</div>
            <div class="battery"><i></i><span class="need"></span></div>
            <div class="small">${L(`Жёлтая черта — нужно ${NEED_H} часов`, `Yellow line — ${NEED_H} hours needed`)}</div>
            <div class="formula f"></div>
            <button class="btn orange big go" style="width:100%;margin-top:14px">${L('Подтвердить', 'Confirm')}</button>
          </div>
        </div>`);
      const list = el.querySelector('.consumers');
      ITEMS.forEach(it => {
        const c = h(`
          <div class="consumer" role="switch" tabindex="0" aria-checked="true">
            ${ctx.ico(it.img)}
            <div class="c-main"><div class="c-name">${esc(it.name)}</div><div class="c-desc">${esc(it.desc)}</div></div>
            <span class="c-kw">${dec(it.kw)} ${kW}</span>
            <span class="switch"></span>
          </div>`);
        const toggle = () => {
          sfx.click();
          on[it.id] = !on[it.id];
          c.classList.toggle('off', !on[it.id]);
          c.classList.remove('flag');
          c.setAttribute('aria-checked', on[it.id]);
          update();
        };
        c.onclick = toggle;
        c.onkeydown = e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); } };
        it.el = c;
        list.appendChild(c);
      });
      const pEl = el.querySelector('.p'), hEl = el.querySelector('.hrs'), bat = el.querySelector('.battery'), fEl = el.querySelector('.f');
      const maxH = 10;
      bat.querySelector('.need').style.left = (NEED_H / maxH * 100) + '%';
      function power() { return ITEMS.reduce((s, i) => s + (on[i.id] ? i.kw : 0), 0); }
      function update() {
        const P = power();
        const hrs = P > 0 ? BATTERY / P : Infinity;
        pEl.textContent = `${dec(P)} ${kW}`;
        hEl.textContent = P > 0 ? `${dec(hrs)} ${hr}` : '∞';
        hEl.style.color = hrs >= NEED_H - 1e-9 ? '#7ee0a0' : '#ff8a8a';
        bat.querySelector('i').style.width = Math.min(100, hrs / maxH * 100) + '%';
        bat.classList.toggle('low', hrs < NEED_H - 1e-9);
        fEl.innerHTML = `t = E ÷ P = ${BATTERY} ÷ ${dec(P)} = ${P > 0 ? dec(hrs) : '∞'} ${hr}`;
      }
      update();
      el.querySelector('.go').onclick = () => {
        const fb = el.querySelector('.fb');
        const offCritical = ITEMS.filter(i => i.role !== 'optional' && !on[i.id]);
        const P = power();
        const hrs = BATTERY / P;
        if (offCritical.length) {
          mistakes++; sfx.bad();
          offCritical.forEach(i => i.el.classList.add('flag'));
          fb.innerHTML = `<div class="feedback no">${offCritical.map(i => `<b>${esc(i.name)}</b>: ${i.why}`).join('<br>')}</div>`;
          ctx.mc(L('Стоп! Ты отключил систему, без которой нельзя. Включи её обратно.', 'Stop! You turned off a system the crew can’t do without. Turn it back on.'), 'bad');
          return;
        }
        if (hrs < NEED_H - 1e-9) {
          mistakes++; sfx.bad();
          const extra = ITEMS.filter(i => i.role === 'optional' && on[i.id]);
          extra.forEach(i => i.el.classList.add('flag'));
          fb.innerHTML = `<div class="feedback no">${L(
            `Батареи хватит только на ${dec(hrs)} ч, а нужно ${NEED_H}. Ещё работают второстепенные системы: ${extra.map(i => esc(i.name)).join(', ')}.`,
            `The battery will only last ${dec(hrs)} h, but ${NEED_H} are needed. These non-essential systems are still on: ${extra.map(i => esc(i.name)).join(', ')}.`)}</div>`;
          ctx.mc(L('Энергии не хватит! Посчитай: 12 кВт·ч ÷ мощность = часы. Отключи всё второстепенное.', 'Not enough energy! Work it out: 12 kWh ÷ power = hours. Turn off everything non-essential.'), 'bad');
          return;
        }
        sfx.ok();
        el.querySelectorAll('.consumer').forEach(c => { c.onclick = null; c.style.cursor = 'default'; });
        el.querySelector('.go').remove();
        fb.innerHTML = `<div class="feedback ok">${L('Отлично!', 'Excellent!')} ${dec(P)} ${kW} × ${NEED_H} ${hr} = ${dec(P * NEED_H)} ${kWh} — ${L('батареи хватает. Важные системы работают.', 'the battery is enough. The vital systems are running.')}</div><div class="actions"><button class="btn orange big">${L('Искать причину поломки →', 'Find the cause of the failure →')}</button></div>`;
        fb.querySelector('.actions button').onclick = () => { sfx.click(); stepPanel(); };
        ctx.mc(L('Энергия под контролем. Теперь найдём, почему пропало питание.', 'Energy is under control. Now let’s find out why the power went out.'), 'good');
      };
      ctx.stage.appendChild(el);
    }

    /* ---------------- 2. Солнечная панель ---------------- */
    function stepPanel() {
      ctx.step(1);
      ctx.mc(L('Диагностика показала: от удара мелкого метеорита <b>солнечная панель развернулась</b> и смотрит мимо Солнца. Поверни её так, чтобы свет падал прямо!',
               'Diagnostics show: a small meteorite hit <b>turned the solar panel</b> away from the Sun. Rotate it so the light hits it straight on!'));
      const sunAngle = Math.round((Math.random() * 60 - 30) / 5) * 5; // направление на Солнце
      const panel = sunAngle + (Math.random() < 0.5 ? -1 : 1) * (65 + Math.random() * 20);
      const el = h(`
        <div class="panel card">
          <div class="task-title"><span class="num">2</span><h2>${L('Поверни солнечную панель к Солнцу', 'Turn the solar panel to the Sun')}</h2></div>
          <div class="sun-game">
            <div class="screen sun-view">
              <svg viewBox="0 0 520 320" preserveAspectRatio="none"><g class="rays"></g></svg>
              <img class="ico sun" src="assets/sprites/sun.png" alt="${L('Солнце', 'Sun')}">
              <img class="ico pnl" src="assets/sprites/panel.png" alt="${L('Солнечная панель', 'Solar panel')}">
              <img class="ico craft" src="assets/sprites/ship.png" alt="">
            </div>
            <div>
              <div class="eyebrow">${L('Выработка энергии', 'Energy output')}</div>
              <div class="out out-big">0%</div>
              <div class="bar" style="height:16px"><i class="outbar" style="width:0%"></i></div>
              <p class="small" style="margin-top:12px">${L('Поворачивай панель ползунком или стрелками. Нужно не меньше <b>95%</b>.', 'Rotate the panel with the slider or the arrow keys. You need at least <b>95%</b>.')}</p>
              <input type="range" min="-90" max="90" step="1" class="rng" aria-label="${L('Угол поворота панели', 'Panel angle')}">
              <div class="actions" style="justify-content:flex-start"><button class="btn orange big fix">${L('Зафиксировать', 'Lock it')}</button></div>
              <div class="fb"></div>
            </div>
          </div>
        </div>`);
      const view = el.querySelector('.sun-view');
      const sun = view.querySelector('.sun'), rays = view.querySelector('.rays'), pg = view.querySelector('.pnl');
      const rng = el.querySelector('.rng'), out = el.querySelector('.out'), outbar = el.querySelector('.outbar');
      // координаты в системе 520×320; панель в точке (291, 160), Солнце — по линии под углом sunAngle
      const cx = 291, cy = 160;
      const rad = sunAngle * Math.PI / 180;
      const sunX = cx - Math.cos(rad) * 235, sunY = cy - Math.sin(rad) * 235;
      sun.style.left = (sunX / 520 * 100) + '%';
      sun.style.top = (sunY / 320 * 100) + '%';
      let rayHtml = '';
      for (let i = -2; i <= 2; i++) {
        const ox = -Math.sin(rad) * i * 18, oy = Math.cos(rad) * i * 18;
        rayHtml += `<line x1="${sunX + ox + Math.cos(rad) * 70}" y1="${sunY + oy + Math.sin(rad) * 70}" x2="${cx - Math.cos(rad) * 22 + ox}" y2="${cy - Math.sin(rad) * 22 + oy}" stroke="#ffd166" stroke-width="2.5" stroke-dasharray="6 8" opacity=".75"/>`;
      }
      rays.innerHTML = rayHtml;
      rng.value = clamp(Math.round(panel - sunAngle), -90, 90);
      function eff() { return Math.max(0, Math.cos((+rng.value) * Math.PI / 180)); }
      function render() {
        const ang = +rng.value + sunAngle;
        pg.style.transform = `translate(-50%, -50%) rotate(${ang}deg)`;
        const e = Math.round(eff() * 100);
        out.textContent = e + '%';
        out.style.color = e >= 95 ? 'var(--good)' : e >= 60 ? 'var(--orange-2)' : 'var(--bad)';
        outbar.style.width = e + '%';
      }
      rng.oninput = render;
      render();
      el.querySelector('.fix').onclick = () => {
        angleTries++;
        const e = Math.round(eff() * 100);
        const fb = el.querySelector('.fb');
        if (e >= 95) {
          sfx.ok();
          rng.disabled = true;
          el.querySelector('.fix').remove();
          fb.innerHTML = `<div class="feedback ok">${e}%! ${L('Свет падает на панель прямо, и она даёт максимум энергии.', 'Light hits the panel straight on, so it gives the most energy.')}</div><div class="actions" style="justify-content:flex-start"><button class="btn orange big">${L('Восстановить питание →', 'Restore power →')}</button></div>`;
          fb.querySelector('.actions button').onclick = () => { sfx.click(); stepRestart(); };
          ctx.mc(L('Панель снова смотрит на Солнце, энергия поступает! Теперь включим системы обратно.', 'The panel faces the Sun again and energy is flowing! Now let’s turn the systems back on.'), 'good');
        } else {
          sfx.bad(); mistakes++;
          fb.innerHTML = `<div class="feedback no">${L(`Только ${e}%. Поверни панель так, чтобы её <b>плоская сторона</b> смотрела прямо на Солнце.`, `Only ${e}%. Turn the panel so its <b>flat side</b> faces the Sun directly.`)}</div>`;
        }
      };
      ctx.stage.appendChild(el);
    }

    /* ---------------- 3. Перезапуск по приоритету ---------------- */
    function stepRestart() {
      ctx.step(2);
      ctx.mc(L('Питание вернулось! Включай системы <b>по очереди</b>: сначала самое важное для жизни, потом то, что нужно для полёта, и только потом остальное.',
               'Power is back! Turn the systems on <b>one by one</b>: first what’s vital for life, then what’s needed to fly, and only then the rest.'));
      const GROUPS = [
        { text: L('Жизнеобеспечение и обогрев', 'Life support and heating'), note: L('жизнь экипажа', 'the crew’s lives') },
        { text: L('Связь с ЦУП и навигация', 'Mission Control link and navigation'), note: L('управление полётом', 'flight control') },
        { text: L('Основное освещение', 'Main lighting'), note: L('удобная работа', 'comfortable work') },
        { text: L('Оранжерея и научный эксперимент', 'Greenhouse and science experiment'), note: L('наука', 'science') },
        { text: L('Экраны и кофемашина', 'Screens and coffee machine'), note: L('отдых', 'relaxing') }
      ];
      let pos = 0;
      const el = h(`
        <div class="panel card">
          <div class="task-title"><span class="num">3</span><h2>${L('Включи системы по приоритету', 'Turn systems on by priority')}</h2></div>
          <p>${L('Нажимай на группы систем в том порядке, в котором их нужно включать.', 'Tap the groups of systems in the order they should be turned on.')}</p>
          <div class="seq"></div>
          <div class="fb"></div>
        </div>`);
      const box = el.querySelector('.seq'), fb = el.querySelector('.fb');
      shuffle(GROUPS).forEach(gp => {
        const b = h(`<button class="seq-btn"><span class="n"></span><span>${esc(gp.text)}</span></button>`);
        b.onclick = () => {
          if (GROUPS[pos] !== gp) {
            mistakes++; sfx.bad();
            b.classList.remove('wrong'); void b.offsetWidth; b.classList.add('wrong');
            fb.innerHTML = `<div class="feedback no">${L(`Пока рано. Сначала нужно включить то, что важнее: «${esc(GROUPS[pos].note)}».`, `Not yet. First turn on what’s more important: “${esc(GROUPS[pos].note)}”.`)}</div>`;
            return;
          }
          sfx.ok(); pos++;
          b.classList.remove('wrong'); b.classList.add('done'); b.disabled = true;
          b.querySelector('.n').textContent = pos;
          fb.innerHTML = '';
          if (pos === GROUPS.length) {
            ctx.mc(L('Все системы снова работают! Корабль спасён. Отличное управление энергией, бортинженер!', 'All systems are running again! The ship is saved. Great energy management, engineer!'), 'good');
            ctx.after(1200, finish);
          }
        };
        box.appendChild(b);
      });
      ctx.stage.appendChild(el);
    }

    function finish() {
      let score = 3;
      const notes = [];
      if (mistakes === 0) notes.push({ ok: true, text: L('Без единой ошибки: правильные приоритеты, точный поворот панели и верный порядок включения.', 'Not a single mistake: the right priorities, an exact panel angle and the correct restart order.') });
      else if (mistakes <= 2) { score--; notes.push({ ok: false, text: L(`Ошибок: ${mistakes}. Помни порядок: жизнь → полёт → удобство.`, `Mistakes: ${mistakes}. Remember the order: life → flight → comfort.`) }); }
      else { score -= 2; notes.push({ ok: false, text: L(`Ошибок: ${mistakes}. Перечитай, какие системы критически важны.`, `Mistakes: ${mistakes}. Read again which systems are critical.`) }); }
      notes.push({ ok: true, text: L(`Расчёт энергии: ${BATTERY} кВт·ч ÷ 1,9 кВт ≈ 6,3 ч — батареи хватило.`, `Energy check: ${BATTERY} kWh ÷ 1.9 kW ≈ 6.3 h — the battery lasted.`) });
      if (angleTries === 1) notes.push({ ok: true, text: L('Солнечная панель повёрнута точно с первой попытки.', 'The solar panel was aimed exactly on the first try.') });
      ctx.finish(score, notes);
    }
  }
});
