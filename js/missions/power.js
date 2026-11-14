/* =====================================================================
   Испытание 4. Поломка системы питания
   Шаги: приоритеты (что оставить, что отключить, E = P·t) →
   восстановить питание (повернуть солнечную панель к Солнцу) →
   включать системы обратно по приоритету.
   ===================================================================== */
Game.register({
  id: 'power', order: 4, icon: '', img: 'power', tag: 'Энергия',
  title: 'Поломка питания',
  situation: 'Система электропитания вышла из строя. Энергии в резервной батарее мало — нужно решать, что важнее.',
  skills: ['Энергия', 'Логика', 'Приоритеты'],
  learn: [
    'Энергия считается по формуле <b>E = P × t</b>: мощность (кВт) умножить на время (часы). Получаются киловатт-часы (кВт·ч).',
    'Если батарея 12 кВт·ч, а всё вместе потребляет 2 кВт, её хватит на 12 ÷ 2 = <b>6 часов</b>.',
    'В аварии сначала оставляют то, что <b>сохраняет жизнь</b> (воздух, тепло), потом то, что <b>помогает вернуться</b> (связь, навигация). Всё остальное может подождать.',
    'Солнечная панель даёт больше всего энергии, когда свет падает на неё <b>прямо</b>, под углом 90°. Если панель повернуть боком, энергии почти не будет.',
    'Когда питание вернулось, системы включают <b>по очереди</b>, начиная с самых важных, чтобы не перегрузить сеть.',
    'Солнечные панели МКС размером почти с футбольное поле. Они сами поворачиваются вслед за Солнцем.'
  ],

  start(ctx) {
    const { h, sfx, shuffle, clamp, esc } = ctx;
    ctx.steps(['Приоритеты', 'Солнечная панель', 'Перезапуск']);

    const BATTERY = 12, NEED_H = 6;
    const ITEMS = [
      { id: 'life', img: 'dev-lifesupport', name: 'Жизнеобеспечение', desc: 'Очистка воздуха и кислород', kw: 0.8, role: 'critical', why: 'Без жизнеобеспечения экипажу нечем дышать!' },
      { id: 'heat', img: 'c-heat', name: 'Обогрев кабины', desc: 'В тени в космосе очень холодно', kw: 0.4, role: 'critical', why: 'Без обогрева в кабине станет очень холодно. Тепло — это жизнь.' },
      { id: 'comm', img: 'dev-antenna', name: 'Связь с ЦУП', desc: 'Канал с Землёй', kw: 0.3, role: 'needed', why: 'Связь нужна: ЦУП поможет найти решение.' },
      { id: 'nav', img: 'c-nav', name: 'Навигация', desc: 'Знает, где корабль и куда он летит', kw: 0.3, role: 'needed', why: 'Без навигации корабль потеряет ориентацию.' },
      { id: 'elight', img: 'c-elight', name: 'Аварийное освещение', desc: 'Тусклый свет в кабине', kw: 0.1, role: 'needed', why: 'Совсем без света в кабине работать нельзя. Аварийный свет почти ничего не тратит.' },
      { id: 'light', img: 'c-light', name: 'Яркий свет во всех отсеках', desc: 'Основное освещение', kw: 0.5, role: 'optional' },
      { id: 'exp', img: 'c-exp', name: 'Научный эксперимент', desc: 'Его можно повторить позже', kw: 0.6, role: 'optional' },
      { id: 'green', img: 'c-green', name: 'Лампы оранжереи', desc: 'Растения потерпят несколько часов', kw: 0.5, role: 'optional' },
      { id: 'screen', img: 'c-screen', name: 'Развлекательные экраны', desc: 'Фильмы и игры', kw: 0.4, role: 'optional' },
      { id: 'coffee', img: 'c-coffee', name: 'Кофемашина', desc: 'Горячие напитки', kw: 0.3, role: 'optional' }
    ];
    let mistakes = 0, angleTries = 0;

    stepPriorities();

    /* ---------------- 1. Приоритеты ---------------- */
    function stepPriorities() {
      ctx.step(0);
      ctx.mc('<b>Авария питания!</b> Главная батарея отключилась, работает только резервная: <b>12 кВт·ч</b>. Её должно хватить минимум на <b>6 часов</b>, пока мы чиним систему. Отключи лишнее!', 'alarm');
      const on = {};
      ITEMS.forEach(i => on[i.id] = true);
      const el = h(`
        <div class="power-layout">
          <div class="panel card" style="margin:0">
            <div class="task-title"><span class="num">1</span><h2>Что оставить, а что отключить?</h2></div>
            <p>Нажимай на систему, чтобы включить или выключить её. Подумай, без чего экипаж <b>не сможет</b> обойтись.</p>
            <div class="consumers"></div>
            <div class="fb"></div>
          </div>
          <div class="screen meter">
            <div class="lbl">Потребление</div>
            <div class="big p">0 кВт</div>
            <div class="lbl">Батарея ${BATTERY} кВт·ч хватит на</div>
            <div class="big hrs">0 ч</div>
            <div class="battery"><i></i><span class="need"></span></div>
            <div class="small">Жёлтая черта — нужно ${NEED_H} часов</div>
            <div class="formula f"></div>
            <button class="btn orange big go" style="width:100%;margin-top:14px">Подтвердить</button>
          </div>
        </div>`);
      const list = el.querySelector('.consumers');
      ITEMS.forEach(it => {
        const c = h(`
          <div class="consumer" role="switch" tabindex="0" aria-checked="true">
            ${ctx.ico(it.img)}
            <div class="c-main"><div class="c-name">${esc(it.name)}</div><div class="c-desc">${esc(it.desc)}</div></div>
            <span class="c-kw">${it.kw.toFixed(1)} кВт</span>
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
        pEl.textContent = P.toFixed(1) + ' кВт';
        hEl.textContent = P > 0 ? hrs.toFixed(1) + ' ч' : '∞';
        hEl.style.color = hrs >= NEED_H - 1e-9 ? '#7ee0a0' : '#ff8a8a';
        bat.querySelector('i').style.width = Math.min(100, hrs / maxH * 100) + '%';
        bat.classList.toggle('low', hrs < NEED_H - 1e-9);
        fEl.innerHTML = `t = E ÷ P = ${BATTERY} ÷ ${P.toFixed(1)} = ${P > 0 ? hrs.toFixed(1) : '∞'} ч`;
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
          ctx.mc('Стоп! Ты отключил систему, без которой нельзя. Включи её обратно.', 'bad');
          return;
        }
        if (hrs < NEED_H - 1e-9) {
          mistakes++; sfx.bad();
          const extra = ITEMS.filter(i => i.role === 'optional' && on[i.id]);
          extra.forEach(i => i.el.classList.add('flag'));
          fb.innerHTML = `<div class="feedback no">Батареи хватит только на ${hrs.toFixed(1)} ч, а нужно ${NEED_H}. Ещё работают второстепенные системы: ${extra.map(i => esc(i.name)).join(', ')}.</div>`;
          ctx.mc('Энергии не хватит! Посчитай: 12 кВт·ч ÷ мощность = часы. Отключи всё второстепенное.', 'bad');
          return;
        }
        sfx.ok();
        el.querySelectorAll('.consumer').forEach(c => { c.onclick = null; c.style.cursor = 'default'; });
        el.querySelector('.go').remove();
        fb.innerHTML = `<div class="feedback ok">Отлично! ${P.toFixed(1)} кВт × ${NEED_H} ч = ${(P * NEED_H).toFixed(1)} кВт·ч — батареи хватает. Важные системы работают.</div><div class="actions"><button class="btn orange big">Искать причину поломки →</button></div>`;
        fb.querySelector('.actions button').onclick = () => { sfx.click(); stepPanel(); };
        ctx.mc('Энергия под контролем. Теперь найдём, почему пропало питание.', 'good');
      };
      ctx.stage.appendChild(el);
    }

    /* ---------------- 2. Солнечная панель ---------------- */
    function stepPanel() {
      ctx.step(1);
      ctx.mc('Диагностика показала: от удара мелкого метеорита <b>солнечная панель развернулась</b> и смотрит мимо Солнца. Поверни её так, чтобы свет падал прямо!');
      const sunAngle = Math.round((Math.random() * 60 - 30) / 5) * 5; // направление на Солнце
      let panel = sunAngle + (Math.random() < 0.5 ? -1 : 1) * (65 + Math.random() * 20);
      const el = h(`
        <div class="panel card">
          <div class="task-title"><span class="num">2</span><h2>Поверни солнечную панель к Солнцу</h2></div>
          <div class="sun-game">
            <div class="screen sun-view">
              <svg viewBox="0 0 520 320" preserveAspectRatio="none"><g class="rays"></g></svg>
              <img class="ico sun" src="assets/sprites/sun.png" alt="Солнце">
              <img class="ico pnl" src="assets/sprites/panel.png" alt="Солнечная панель">
              <img class="ico craft" src="assets/sprites/ship.png" alt="">
            </div>
            <div>
              <div class="eyebrow">Выработка энергии</div>
              <div class="out out-big">0%</div>
              <div class="bar" style="height:16px"><i class="outbar" style="width:0%"></i></div>
              <p class="small" style="margin-top:12px">Поворачивай панель ползунком или стрелками. Нужно не меньше <b>95%</b>.</p>
              <input type="range" min="-90" max="90" step="1" class="rng" aria-label="Угол поворота панели">
              <div class="actions" style="justify-content:flex-start"><button class="btn orange big fix">Зафиксировать</button></div>
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
          fb.innerHTML = `<div class="feedback ok">${e}%! Свет падает на панель прямо, и она даёт максимум энергии.</div><div class="actions" style="justify-content:flex-start"><button class="btn orange big">Восстановить питание →</button></div>`;
          fb.querySelector('.actions button').onclick = () => { sfx.click(); stepRestart(); };
          ctx.mc('Панель снова смотрит на Солнце, энергия поступает! Теперь включим системы обратно.', 'good');
        } else {
          sfx.bad(); mistakes++;
          fb.innerHTML = `<div class="feedback no">Только ${e}%. Поверни панель так, чтобы её <b>плоская сторона</b> смотрела прямо на Солнце.</div>`;
        }
      };
      ctx.stage.appendChild(el);
    }

    /* ---------------- 3. Перезапуск по приоритету ---------------- */
    function stepRestart() {
      ctx.step(2);
      ctx.mc('Питание вернулось! Включай системы <b>по очереди</b>: сначала самое важное для жизни, потом то, что нужно для полёта, и только потом остальное.');
      const GROUPS = [
        { icon: '', text: 'Жизнеобеспечение и обогрев', note: 'жизнь экипажа' },
        { icon: '', text: 'Связь с ЦУП и навигация', note: 'управление полётом' },
        { icon: '', text: 'Основное освещение', note: 'удобная работа' },
        { icon: '', text: 'Оранжерея и научный эксперимент', note: 'наука' },
        { icon: '', text: 'Экраны и кофемашина', note: 'отдых' }
      ];
      let pos = 0;
      const el = h(`
        <div class="panel card">
          <div class="task-title"><span class="num">3</span><h2>Включи системы по приоритету</h2></div>
          <p>Нажимай на группы систем в том порядке, в котором их нужно включать.</p>
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
            fb.innerHTML = `<div class="feedback no">Пока рано. Сначала нужно включить то, что важнее: «${esc(GROUPS[pos].note)}».</div>`;
            return;
          }
          sfx.ok(); pos++;
          b.classList.remove('wrong'); b.classList.add('done'); b.disabled = true;
          b.querySelector('.n').textContent = pos;
          fb.innerHTML = '';
          if (pos === GROUPS.length) {
            ctx.mc('Все системы снова работают! Корабль спасён. Отличное управление энергией, бортинженер! ', 'good');
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
      if (mistakes === 0) notes.push({ ok: true, text: 'Без единой ошибки: правильные приоритеты, точный поворот панели и верный порядок включения.' });
      else if (mistakes <= 2) { score--; notes.push({ ok: false, text: `Ошибок: ${mistakes}. Помни порядок: жизнь → полёт → удобство.` }); }
      else { score -= 2; notes.push({ ok: false, text: `Ошибок: ${mistakes}. Перечитай, какие системы критически важны.` }); }
      notes.push({ ok: true, text: `Расчёт энергии: ${BATTERY} кВт·ч ÷ 1,9 кВт ≈ 6,3 ч — батареи хватило.` });
      if (angleTries === 1) notes.push({ ok: true, text: 'Солнечная панель повёрнута точно с первой попытки.' });
      ctx.finish(score, notes);
    }
  }
});
