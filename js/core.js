/* =====================================================================
   Тренажёр юного астронавта — ядро игры
   Экран старта, мостик (выбор миссии), рамка миссии, итоги, сертификат.
   Каждая миссия лежит в js/missions/*.js и регистрируется через Game.register().

   Языки: русский и английский. Любой текст пишется как L('по-русски', 'in English'),
   L() возвращает вариант для текущего языка (работает и для массивов).
   ===================================================================== */
(function () {
  'use strict';

  const SAVE_KEY = 'junior-astronaut-v1';
  const app = document.getElementById('app');
  const missions = [];

  /* ---------- сохранение ---------- */
  let memory = {};
  function load() {
    try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; }
    catch (e) { return memory; }
  }
  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); }
    catch (e) { memory = save; }
  }
  const save = load();
  save.best = save.best || {};

  /* ---------- язык ---------- */
  if (save.lang !== 'ru' && save.lang !== 'en') {
    const nav = (navigator.language || 'ru').toLowerCase();
    save.lang = /^(ru|uk|be|kk)/.test(nav) ? 'ru' : 'en';
  }
  const L = (ru, en) => (save.lang === 'en' ? en : ru);
  window.L = L;
  function applyLang() {
    document.documentElement.lang = save.lang;
    document.title = L('Тренажёр юного астронавта · Junior Astronaut Mission Trainer', 'Junior Astronaut Mission Trainer');
  }
  function setLang(lang, rerender) {
    if (lang === save.lang) return;
    save.lang = lang; persist(); applyLang();
    sfx.click();
    rerender();
  }
  function langSwitch() {
    return `<div class="lang-switch" role="group" aria-label="Language / Язык">
      <button type="button" data-lang="ru" class="${save.lang === 'ru' ? 'on' : ''}">RU</button>
      <button type="button" data-lang="en" class="${save.lang === 'en' ? 'on' : ''}">EN</button>
    </div>`;
  }
  function bindLang(el, rerender) {
    el.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang, rerender)));
  }

  /* ---------- маленькие помощники ---------- */
  function h(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const pick = a => a[Math.floor(Math.random() * a.length)];
  // Картинка из Higgsfield (assets/sprites). Если файла нет — просто не показываем.
  function ico(name, cls = '') {
    const src = name.includes('.') ? name : name + '.png';
    return `<img class="ico ${cls}" src="assets/sprites/${src}" alt="" onerror="this.remove()">`;
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // Русское число с правильным окончанием: plural(3, 'звезда', 'звезды', 'звёзд')
  function plural(n, one, few, many) {
    const a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b === 1) return one;
    if (b >= 2 && b <= 4) return few;
    return many;
  }

  function setBg(name) {
    document.querySelector('.bg').style.backgroundImage = `url("assets/img/${name}.jpg")`;
  }

  /* ---------- звук (без файлов, через WebAudio) ---------- */
  let ac;
  function beep(freq = 600, dur = 0.12, type = 'sine', vol = 0.07, delay = 0) {
    if (save.mute) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = ac.currentTime + delay;
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(ac.destination);
      o.start(t0); o.stop(t0 + dur + 0.02);
    } catch (e) { /* звук не обязателен */ }
  }
  const sfx = {
    click: () => beep(820, 0.05, 'triangle', 0.04),
    ok: () => { beep(660, 0.1); beep(990, 0.16, 'sine', 0.07, 0.09); },
    bad: () => beep(170, 0.28, 'square', 0.04),
    alarm: () => { beep(880, 0.18, 'sawtooth', 0.035); beep(620, 0.18, 'sawtooth', 0.035, 0.2); },
    radio: () => { beep(1200, 0.06, 'square', 0.025); beep(1500, 0.06, 'square', 0.025, 0.09); beep(1200, 0.06, 'square', 0.025, 0.18); },
    hit: () => { beep(120, 0.35, 'sawtooth', 0.07); beep(70, 0.4, 'square', 0.05, 0.05); },
    win: () => [523, 659, 784, 1046].forEach((f, i) => beep(f, 0.2, 'sine', 0.07, i * 0.12)),
    type: () => beep(1800 + Math.random() * 400, 0.015, 'square', 0.012)
  };

  /* ---------- ранги ---------- */
  const RANKS = [
    { min: 0, ru: 'Кадет', en: 'Cadet' },
    { min: 3, ru: 'Стажёр', en: 'Trainee' },
    { min: 6, ru: 'Бортинженер', en: 'Flight Engineer' },
    { min: 10, ru: 'Пилот', en: 'Pilot' },
    { min: 15, ru: 'Командир миссии', en: 'Mission Commander' }
  ];
  function totalStars() { return missions.reduce((s, m) => s + (save.best[m.id] || 0), 0); }
  function rank() { const t = totalStars(); const r = RANKS.filter(x => t >= x.min).pop(); return L(r.ru, r.en); }
  function starsHtml(n, max = 3, cls = '') {
    let s = '';
    for (let i = 0; i < max; i++) s += `<span class="star ${i < n ? 'on' : ''} ${cls}"></span>`;
    return `<span class="stars" aria-label="${L(`${n} из ${max}`, `${n} of ${max}`)}">${s}</span>`;
  }

  /* ---------- устройство с сенсорным экраном? ---------- */
  const isTouch = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;
  document.documentElement.classList.toggle('touch', isTouch);

  /* ---------- активная миссия: таймеры, чтобы всё чистилось при выходе ---------- */
  let live = null;
  function stopLive() {
    if (!live) return;
    live.timers.forEach(id => { clearTimeout(id); clearInterval(id); });
    live.rafs.forEach(id => cancelAnimationFrame(id));
    live.cleanups.forEach(fn => { try { fn(); } catch (e) {} });
    live.dead = true;
    live = null;
  }

  /* =====================================================================
     ЭКРАНЫ
     ===================================================================== */

  function screenStart() {
    stopLive();
    setBg('bridge');
    app.innerHTML = '';
    const typed = document.getElementById('cadet');
    const nameVal = typed ? typed.value : (save.name || '');
    const el = h(`
      <section class="start fade-in">
        <div class="panel start-card">
          ${langSwitch()}
          <img class="start-logo" src="assets/sprites/logo.png" alt="${L('Эмблема учебного центра', 'Training centre emblem')}">
          <p class="eyebrow">${L('Junior Astronaut Mission Trainer', 'Space Training Centre')}</p>
          <h1>${L('Тренажёр юного&nbsp;астронавта', 'Junior Astronaut Mission&nbsp;Trainer')}</h1>
          <p class="lead">${L('Перед настоящим полётом каждый астронавт проходит тренировки. Пройди испытания на борту учебного корабля «Звёздный вихрь», выживи на Марсе и получи сертификат!',
                             'Before a real flight, every astronaut trains. Complete the challenges aboard the training ship “Star Whirl”, survive on Mars and earn your certificate!')}</p>
          <ul class="start-list">
            <li><i class="thumb" style="background-image:url('assets/img/asteroids.jpg')"></i><div><b>${L('Астероиды', 'Asteroids')}</b><span>${L('пилотирование', 'piloting')}</span></div></li>
            <li><i class="thumb" style="background-image:url('assets/img/oxygen.jpg')"></i><div><b>${L('Утечка кислорода', 'Oxygen leak')}</b><span>${L('ремонт', 'repair')}</span></div></li>
            <li><i class="thumb" style="background-image:url('assets/img/storm.jpg')"></i><div><b>${L('Солнечная буря', 'Solar storm')}</b><span>${L('защита', 'protection')}</span></div></li>
            <li><i class="thumb" style="background-image:url('assets/img/power.jpg')"></i><div><b>${L('Поломка питания', 'Power failure')}</b><span>${L('энергия', 'energy')}</span></div></li>
            <li class="final"><i class="thumb" style="background-image:url('assets/img/mars.jpg')"></i><div><b>${L('Финал: Последний шанс на Марсе', 'Final: Last Chance on Mars')}</b><span>${L('приключение от первого лица', 'first-person adventure')}</span></div></li>
          </ul>
          <form class="name-form">
            <label for="cadet">${L('Как тебя зовут, кадет?', 'What’s your name, cadet?')}</label>
            <div class="row">
              <input id="cadet" maxlength="24" autocomplete="off" placeholder="${L('Твоё имя', 'Your name')}" value="${esc(nameVal)}" required>
              <button class="btn big orange" type="submit">${L('На борт!', 'All aboard!')}</button>
            </div>
          </form>
        </div>
      </section>`);
    app.appendChild(el);
    bindLang(el, screenStart);
    const input = el.querySelector('#cadet');
    if (!save.name && !isTouch) input.focus();
    el.querySelector('form').addEventListener('submit', e => {
      e.preventDefault();
      const name = input.value.trim();
      if (!name) { input.focus(); return; }
      save.name = name; persist();
      sfx.ok();
      screenHub();
    });
  }

  function screenHub() {
    stopLive();
    setBg('bridge');
    const total = totalStars();
    const done = missions.filter(m => save.best[m.id]).length;
    const max = missions.length * 3;
    app.innerHTML = '';
    const el = h(`
      <section class="hub fade-in">
        <header class="hub-top panel">
          <div class="who">
            ${ico('cadet', 'avatar')}
            <div>
              <div class="eyebrow">${esc(rank())}</div>
              <div class="cadet-name">${esc(save.name || L('Кадет', 'Cadet'))}</div>
            </div>
          </div>
          <div class="progress-wrap">
            <div class="progress-label">${L(
              `Подготовка: <b>${done} из ${missions.length}</b> испытаний · <b>${total} из ${max}</b> звёзд`,
              `Training: <b>${done} of ${missions.length}</b> challenges · <b>${total} of ${max}</b> stars`)}</div>
            <div class="bar"><i style="width:${(total / max) * 100}%"></i></div>
          </div>
          <div class="top-actions">
            ${langSwitch()}
            <button class="btn ghost small" data-act="mute">${soundLabel()}</button>
            <button class="btn ghost small" data-act="name">${L('Сменить имя', 'Change name')}</button>
          </div>
        </header>

        <div class="hub-title">
          <h2>${L('Мостик корабля «Звёздный вихрь»', 'Bridge of the “Star Whirl”')}</h2>
          <p>${L('Выбери тренировку. Их можно проходить в любом порядке и повторять, чтобы собрать все звёзды.',
                 'Pick a training. You can play them in any order and replay them to collect all the stars.')}</p>
        </div>

        <div class="cards"></div>

        <div class="cert-cta panel ${done === missions.length ? 'ready' : ''}">
          ${done === missions.length
            ? `<div>${ico('logo')}<span>${L('<b>Все испытания пройдены!</b> Ты готов к настоящей миссии.', '<b>All challenges complete!</b> You are ready for a real mission.')}</span></div><button class="btn orange" data-act="cert">${L('Получить сертификат', 'Get your certificate')}</button>`
            : `<div>${ico('logo')}<span>${L(`Пройди все ${missions.length} испытания, чтобы получить <b>сертификат астронавта</b>.`, `Complete all ${missions.length} challenges to earn your <b>astronaut certificate</b>.`)}</span></div>`}
        </div>
      </section>`);
    const cards = el.querySelector('.cards');
    missions.forEach((m, i) => {
      const best = save.best[m.id] || 0;
      const c = h(`
        <article class="mcard panel ${best ? 'done' : ''}" style="--d:${i * 70}ms">
          <div class="mcard-img" data-done="${L('✓ пройдено', '✓ complete')}" style="background-image:url('assets/img/${m.img}.jpg')">
            <span class="mnum">${m.final ? L('Финальное испытание', 'Final challenge') : `${L('Испытание', 'Challenge')} ${i + 1}`}</span>
            <span class="mtag">${esc(m.tag)}</span>
          </div>
          <div class="mcard-body">
            <h3>${esc(m.title)}</h3>
            <p>${esc(m.situation)}</p>
            <div class="chips">${m.skills.map(s => `<span class="chip">${esc(s)}</span>`).join('')}</div>
            <div class="mcard-foot">
              ${starsHtml(best)}
              <button class="btn ${best ? '' : 'orange'}">${best ? L('Повторить', 'Replay') : L('Начать', 'Start')}</button>
            </div>
          </div>
        </article>`);
      c.querySelector('button').addEventListener('click', () => { sfx.click(); runMission(m); });
      c.querySelector('.mcard-img').addEventListener('click', () => { sfx.click(); runMission(m); });
      cards.appendChild(c);
    });
    bindLang(el, screenHub);
    el.addEventListener('click', e => {
      const act = e.target.closest('[data-act]');
      if (!act) return;
      const a = act.dataset.act;
      if (a === 'mute') { save.mute = !save.mute; persist(); act.textContent = soundLabel(); sfx.click(); }
      if (a === 'name') screenStart();
      if (a === 'cert') screenCertificate();
    });
    app.appendChild(el);
  }
  function soundLabel() { return save.mute ? L('Звук: выкл', 'Sound: off') : L('Звук: вкл', 'Sound: on'); }

  /* ---------- рамка миссии ---------- */
  function runMission(m) {
    stopLive();
    setBg(m.img);
    app.innerHTML = '';
    const el = h(`
      <section class="mission fade-in">
        <header class="mbar panel">
          <button class="btn ghost small" data-act="back">${L('← На мостик', '← To the bridge')}</button>
          <div class="mtitle">${esc(m.title)}</div>
          <ol class="steps"></ol>
          <div class="mstat"></div>
        </header>
        <div class="mc-slot"></div>
        <div class="stage"></div>
      </section>`);
    app.appendChild(el);
    el.querySelector('[data-act=back]').addEventListener('click', () => { sfx.click(); screenHub(); });

    const ctx = live = { timers: [], rafs: [], cleanups: [], dead: false, mission: m, mistakes: 0 };
    const stepsEl = el.querySelector('.steps');
    const mcSlot = el.querySelector('.mc-slot');
    ctx.stage = el.querySelector('.stage');
    ctx.stat = el.querySelector('.mstat');
    ctx.root = el;
    Object.assign(ctx, {
      h, esc, shuffle, pick, clamp, sfx, starsHtml, ico, plural, L,
      after(ms, fn) { const id = setTimeout(() => { if (!ctx.dead) fn(); }, ms); ctx.timers.push(id); return id; },
      every(ms, fn) { const id = setInterval(() => { if (!ctx.dead) fn(); }, ms); ctx.timers.push(id); return id; },
      frame(fn) { const id = requestAnimationFrame(t => { if (!ctx.dead) fn(t); }); ctx.rafs.push(id); return id; },
      onCleanup(fn) { ctx.cleanups.push(fn); },
      steps(names) {
        ctx._steps = names;
        stepsEl.innerHTML = names.map((n, i) => `<li data-i="${i}"><span>${i + 1}</span><em>${esc(n)}</em></li>`).join('');
      },
      // keep = true: только подсветить шаг, не очищая сцену (нужно для мира от первого лица)
      step(i, keep) {
        stepsEl.querySelectorAll('li').forEach((li, j) => {
          li.classList.toggle('now', j === i);
          li.classList.toggle('past', j < i);
        });
        if (keep) return;
        ctx.stage.innerHTML = '';
        ctx.stage.classList.remove('wide');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      /* Сообщение от Центра управления полётами */
      mc(text, mood = 'info') {
        mcSlot.innerHTML = '';
        if (!text) return;
        const b = h(`<div class="mc screen ${mood}" role="status">
            <div class="mc-ava"><img src="assets/sprites/mc.png" alt="${L('ЦУП', 'Mission Control')}"></div>
            <div class="mc-text"><b>${L('Центр управления:', 'Mission Control:')}</b> <span></span></div>
          </div>`);
        b.querySelector('.mc-text span').innerHTML = text;
        mcSlot.appendChild(b);
        if (mood === 'alarm') sfx.alarm(); else if (mood === 'bad') sfx.bad(); else sfx.radio();
      },
      /* Итог: stars 1..3, notes — что получилось / что улучшить */
      finish(stars, notes = []) {
        stars = clamp(Math.round(stars), 1, 3);
        const prev = save.best[m.id] || 0;
        if (stars > prev) { save.best[m.id] = stars; persist(); }
        stopLive();
        screenResult(m, stars, notes, stars > prev && prev > 0);
      },
      fail(reason, tip) {
        stopLive();
        screenFail(m, reason, tip);
      },
      mistake() { ctx.mistakes++; }
    });
    m.start(ctx);
  }

  function screenResult(m, stars, notes, improved) {
    sfx.win();
    app.innerHTML = '';
    const idx = missions.indexOf(m);
    const next = missions.find((x, i) => i > idx && !save.best[x.id]) || missions.find(x => !save.best[x.id]);
    const verdicts = L(
      ['', 'Задание выполнено, но есть что улучшить.', 'Хорошая работа, кадет!', 'Безупречно! Настоящий астронавт!'],
      ['', 'Mission complete, but there’s room to improve.', 'Good job, cadet!', 'Flawless! A real astronaut!']);
    const el = h(`
      <section class="result fade-in">
        <div class="panel result-card">
          <p class="eyebrow">${L('Испытание пройдено', 'Challenge complete')}</p>
          <h2>${esc(m.title)}</h2>
          <div class="big-stars">${starsHtml(stars, 3, 'pop')}</div>
          <p class="verdict">${verdicts[stars]}${improved ? ` <b>${L('Новый рекорд!', 'New record!')}</b>` : ''}</p>
          ${notes.length ? `<ul class="notes">${notes.map(n => `<li class="${n.ok ? 'ok' : 'warn'}">${n.text}</li>`).join('')}</ul>` : ''}
          <div class="learn screen">
            <h3>${L('Что ты узнал', 'What you learned')}</h3>
            <ul>${m.learn.map(t => `<li>${t}</li>`).join('')}</ul>
          </div>
          <div class="row center">
            <button class="btn ghost" data-act="again">${L('Ещё раз', 'Play again')}</button>
            <button class="btn" data-act="hub">${L('На мостик', 'To the bridge')}</button>
            ${next ? `<button class="btn orange" data-act="next">${L('Дальше', 'Next')}: ${esc(next.title)}</button>` : ''}
          </div>
        </div>
      </section>`);
    el.querySelector('[data-act=again]').onclick = () => runMission(m);
    el.querySelector('[data-act=hub]').onclick = screenHub;
    const n = el.querySelector('[data-act=next]');
    if (n) n.onclick = () => runMission(next);
    app.appendChild(el);
    confetti();
  }

  function screenFail(m, reason, tip) {
    sfx.bad();
    app.innerHTML = '';
    const el = h(`
      <section class="result fade-in">
        <div class="panel result-card fail">
          ${ico('mc', 'fail-ico')}
          <p class="eyebrow">${L('Тренировка остановлена', 'Training stopped')}</p>
          <h2>${esc(m.title)}</h2>
          <p class="verdict">${reason}</p>
          ${tip ? `<p class="tip"><b>${L('Совет инструктора:', 'Instructor’s tip:')}</b> ${tip}</p>` : ''}
          <p class="small muted">${L('Это тренажёр — здесь ошибаться не страшно. Именно для этого астронавты и тренируются!',
                                    'This is a simulator — mistakes are okay here. That’s exactly why astronauts train!')}</p>
          <div class="row center">
            <button class="btn ghost" data-act="hub">${L('На мостик', 'To the bridge')}</button>
            <button class="btn orange" data-act="again">${L('Попробовать снова', 'Try again')}</button>
          </div>
        </div>
      </section>`);
    el.querySelector('[data-act=again]').onclick = () => runMission(m);
    el.querySelector('[data-act=hub]').onclick = screenHub;
    app.appendChild(el);
  }

  function screenCertificate() {
    stopLive();
    setBg('bridge');
    const total = totalStars();
    const date = new Date().toLocaleDateString(L('ru-RU', 'en-GB'), { day: 'numeric', month: 'long', year: 'numeric' });
    app.innerHTML = '';
    const el = h(`
      <section class="result fade-in">
        <div class="certificate panel">
          <div class="cert-inner">
            ${ico('logo')}
            <p class="eyebrow">${L('Учебный центр «Звёздный вихрь»', '“Star Whirl” Training Centre')}</p>
            <h2>${L('Сертификат юного астронавта', 'Junior Astronaut Certificate')}</h2>
            <p>${L('Настоящим подтверждается, что', 'This certifies that')}</p>
            <div class="cert-name">${esc(save.name || L('Кадет', 'Cadet'))}</div>
            <p>${L('успешно прошёл(ла) подготовку к космической миссии и получает звание', 'has successfully completed space mission training and is awarded the rank of')}</p>
            <div class="cert-rank">${esc(rank())}</div>
            <ul class="cert-list">
              ${missions.map(m => `<li>${esc(m.title)} ${starsHtml(save.best[m.id] || 0)}</li>`).join('')}
            </ul>
            <div class="cert-foot">
              <span>${L('Всего', 'Total')}: <b>${total} ${L(plural(total, 'звезда', 'звезды', 'звёзд'), total === 1 ? 'star' : 'stars')}</b></span>
              <span>${date}</span>
              <span>${L('Руководитель полётов: ЦУП', 'Flight Director: Mission Control')}</span>
            </div>
          </div>
        </div>
        <div class="row center no-print">
          ${langSwitch()}
          <button class="btn ghost" data-act="hub">${L('На мостик', 'To the bridge')}</button>
          <button class="btn orange" data-act="print">${L('Распечатать', 'Print')}</button>
        </div>
      </section>`);
    bindLang(el, screenCertificate);
    el.querySelector('[data-act=hub]').onclick = screenHub;
    el.querySelector('[data-act=print]').onclick = () => window.print();
    app.appendChild(el);
    sfx.win();
    confetti();
  }

  /* ---------- конфетти ---------- */
  function confetti() {
    const box = h('<div class="confetti" aria-hidden="true"></div>');
    const colors = ['#ff9a3c', '#5fd8ff', '#8a7ff0', '#ffd166', '#ff8fc0', '#fff'];
    for (let i = 0; i < 70; i++) {
      const p = document.createElement('i');
      p.style.left = Math.random() * 100 + '%';
      p.style.background = pick(colors);
      p.style.animationDelay = Math.random() * 0.6 + 's';
      p.style.animationDuration = 1.8 + Math.random() * 1.6 + 's';
      p.style.transform = `rotate(${Math.random() * 360}deg)`;
      box.appendChild(p);
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 4000);
  }

  /* =====================================================================
     ПУБЛИЧНЫЙ API
     ===================================================================== */
  applyLang();
  window.Game = {
    register(m) { missions.push(m); missions.sort((a, b) => a.order - b.order); },
    boot() { save.name ? screenHub() : screenStart(); },
    hub: screenHub,
    isTouch,
    get lang() { return save.lang; }
  };
})();
