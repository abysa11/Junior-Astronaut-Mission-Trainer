/* =====================================================================
   Испытание 1. Астероидный пояс / Mission 1. Asteroid Belt
   Шаги: брифинг → выбор маршрута → пилотирование (canvas).
   Все тексты на двух языках: L('по-русски', 'in English').
   На телефоне корабль управляется джойстиком-кружком.
   ===================================================================== */
Game.register({
  id: 'asteroids', order: 1, img: 'asteroids',
  get tag() { return L('Пилотирование', 'Piloting'); },
  get title() { return L('Астероидный пояс', 'Asteroid Belt'); },
  get situation() { return L('Корабль влетел в область, где много астероидов. Один из них летит прямо на нас!', 'The ship has entered a zone full of asteroids. One of them is heading straight for us!'); },
  get skills() { return L(['Ориентация', 'Скорость', 'Траектория'], ['Orientation', 'Speed', 'Trajectory']); },
  get learn() {
    return L([
      '<b>Траектория</b> — это линия, по которой движется тело. Зная направление и скорость астероида, можно предсказать, где он окажется через секунду.',
      'Уклоняться нужно от того места, где астероид <b>будет</b>, а не от того, где он сейчас.',
      'Чем быстрее летит корабль, тем меньше времени на реакцию. В опасных местах пилоты <b>сбавляют скорость</b>.',
      'Самый короткий путь не всегда самый безопасный. Маршрут выбирают по риску и по запасу топлива.',
      'В настоящем поясе астероидов между Марсом и Юпитером между крупными астероидами в среднем сотни тысяч километров, так что зонды пролетают его спокойно.'
    ], [
      'A <b>trajectory</b> is the path an object moves along. If you know an asteroid’s direction and speed, you can predict where it will be a second later.',
      'Dodge the place where the asteroid <b>will be</b>, not where it is right now.',
      'The faster the ship flies, the less time you have to react. In dangerous places pilots <b>slow down</b>.',
      'The shortest route is not always the safest. Pilots choose a route by its risk and by how much fuel they have.',
      'In the real asteroid belt between Mars and Jupiter, big asteroids are on average hundreds of thousands of kilometres apart, so space probes fly through it safely.'
    ]);
  },

  start(ctx) {
    const { h, sfx, shuffle, clamp } = ctx;
    ctx.steps(L(['Брифинг', 'Маршрут', 'Пилотирование'], ['Briefing', 'Route', 'Piloting']));
    let routeMistakes = 0;
    let density = 1;      // зависит от выбранного маршрута
    let routeOk = false;
    const touch = Game.isTouch;

    briefing();

    /* ---------------- 1. Брифинг ---------------- */
    function briefing() {
      ctx.step(0);
      ctx.mc(L('Внимание, пилот! Впереди <b>астероидный пояс</b>. Нужно выбрать маршрут и провести корабль к станции «Орбита-7», не задев ни одного камня.',
               'Attention, pilot! There is an <b>asteroid belt</b> ahead. Choose a route and fly the ship to the “Orbit-7” station without touching a single rock.'));
      const controls = touch
        ? L('<b>Управление:</b> под игровым полем есть <b>джойстик</b>: положи на него палец и веди в нужную сторону. Справа — кнопки скорости.',
            '<b>Controls:</b> below the game screen there is a <b>joystick</b>: put your thumb on it and slide where you want to fly. Speed buttons are on the right.')
        : L('<b>Управление:</b> <span class="kbd">↑</span> <span class="kbd">↓</span> <span class="kbd">←</span> <span class="kbd">→</span> или <span class="kbd">W A S D</span>, или веди мышкой по полю. Скорость: кнопки или <span class="kbd">1</span> <span class="kbd">2</span> <span class="kbd">3</span>.',
            '<b>Controls:</b> <span class="kbd">↑</span> <span class="kbd">↓</span> <span class="kbd">←</span> <span class="kbd">→</span> or <span class="kbd">W A S D</span>, or drag with the mouse. Speed: buttons or <span class="kbd">1</span> <span class="kbd">2</span> <span class="kbd">3</span>.');
      const el = h(`
        <div class="panel card">
          <div class="task-title"><span class="num">1</span><h2>${L('Как читать траекторию', 'How to read a trajectory')}</h2></div>
          <div class="closeup">
            <div class="screen traj-demo">
              <svg viewBox="0 0 220 160" preserveAspectRatio="none"><line x1="165" y1="42" x2="72" y2="112" stroke="#ff8a9a" stroke-width="3" stroke-dasharray="8 6"/></svg>
              ${ctx.ico('rock1', 'rock')}
              ${ctx.ico('ship', 'ship')}
              <span class="lbl">${L('РАДАР ТРАЕКТОРИЙ', 'TRAJECTORY RADAR')}</span>
            </div>
            <div>
              <p>${L('У каждого астероида есть <b>направление</b> и <b>скорость</b>. Радар корабля рисует пунктир — путь, по которому камень полетит дальше.',
                     'Every asteroid has a <b>direction</b> and a <b>speed</b>. The ship’s radar draws a dashed line — the path the rock will follow.')}</p>
              <p>${L('Если пунктир упирается в твой корабль, он станет <b style="color:var(--bad)">красным</b>: уходи вверх или вниз, пока не поздно!',
                     'If the line points at your ship, it turns <b style="color:var(--bad)">red</b>: move up or down before it’s too late!')}</p>
              <div class="fact">${controls}</div>
            </div>
          </div>
          <div class="actions"><button class="btn orange big">${L('Понятно, к маршруту →', 'Got it, to the route →')}</button></div>
        </div>`);
      el.querySelector('button').onclick = () => { sfx.click(); routes(); };
      ctx.stage.appendChild(el);
    }

    /* ---------------- 2. Маршрут ---------------- */
    function routes() {
      ctx.step(1);
      ctx.mc(L('Сканер построил три маршрута. Топлива на борту: <b>100 единиц</b>. Выбери <b>самый безопасный</b> путь, на который хватит топлива.',
               'The scanner found three routes. Fuel on board: <b>100 units</b>. Choose the <b>safest</b> route that we have enough fuel for.'));
      // Профили маршрутов. Безопасный уходит то вверх, то вниз — каждый раз по-разному.
      const sides = shuffle(['top', 'bottom']);
      const fast = L('быстрые', 'fast'), slow = L('медленные', 'slow');
      const profiles = [
        { key: 'short', path: 'mid', color: '#ff7e8a', name: L('Прямой', 'Direct'), len: 400, rocks: 18, speed: fast, fuel: 60,
          verdict: L('Короткий, но через самую гущу быстрых астероидов. Риск столкновения очень высокий.', 'Short, but right through a crowd of fast asteroids. The risk of a crash is very high.') },
        { key: 'safe', path: sides[0], color: '#7ee0a0', name: L('Обходной', 'Detour'), len: 520, rocks: 5, speed: slow, fuel: 80,
          verdict: L('Правильно! Путь чуть длиннее, но астероидов мало и они медленные. Топлива хватает.', 'Correct! The route is a bit longer, but there are few asteroids and they are slow. We have enough fuel.') },
        { key: 'long', path: sides[1], color: '#ffd166', name: L('Дальний', 'Long way'), len: 900, rocks: 1, speed: slow, fuel: 135,
          verdict: L('Астероидов почти нет, но нужно 135 единиц топлива, а у нас только 100. Не долетим!', 'Almost no asteroids, but it needs 135 units of fuel and we only have 100. We won’t make it!') }
      ];
      const letters = ['A', 'B', 'C'];
      const order = shuffle(profiles);
      order.forEach((p, i) => p.letter = letters[i]);

      const P = {
        mid: 'M70 180 L730 180',
        top: 'M70 180 C200 40, 600 40, 730 180',
        bottom: 'M70 180 C160 340, 640 340, 730 180'
      };
      // точки астероидов вдоль маршрутов
      function rocksAlong(p) {
        const pts = [];
        const n = p.rocks;
        for (let i = 0; i < n; i++) {
          const t = (i + 0.5) / n * 0.8 + 0.1;
          const x = 70 + 660 * t;
          let y;
          if (p.path === 'mid') y = 180;
          else y = 180 + (p.path === 'top' ? -1 : 1) * 140 * Math.sin(Math.PI * t);
          pts.push({ x: x + (Math.random() - 0.5) * 30, y: y + (Math.random() - 0.5) * 50, r: p.key === 'short' ? 5 + Math.random() * 7 : 4 + Math.random() * 6 });
        }
        return pts;
      }
      let svgRocks = '';
      profiles.forEach(p => rocksAlong(p).forEach(r => {
        const d = r.r * 2.6;
        svgRocks += `<image href="assets/sprites/${Math.random() < 0.5 ? 'rock1' : 'rock2'}.png" x="${(r.x - d / 2).toFixed(0)}" y="${(r.y - d / 2).toFixed(0)}" width="${d.toFixed(0)}" height="${d.toFixed(0)}"/>`;
      }));

      const el = h(`
        <div class="panel card">
          <div class="task-title"><span class="num">2</span><h2>${L('Выбери маршрут', 'Choose a route')}</h2></div>
          <svg class="route-map screen" viewBox="0 0 800 360">
            ${profiles.map(p => `<path d="${P[p.path]}" data-k="${p.key}" fill="none" stroke="${p.color}" stroke-width="5" stroke-dasharray="12 10" opacity=".85"/>`).join('')}
            ${svgRocks}
            ${profiles.map(p => {
              const lx = 400, ly = p.path === 'mid' ? 160 : p.path === 'top' ? 62 : 300;
              return `<g><rect x="${lx - 16}" y="${ly - 16}" width="32" height="32" rx="9" fill="${p.color}"/><text x="${lx}" y="${ly + 6}" text-anchor="middle" font-weight="900" font-size="18" fill="#1d2466">${p.letter}</text></g>`;
            }).join('')}
            <image href="assets/sprites/ship.png" x="14" y="152" width="84" height="56"/>
            <text x="56" y="228" fill="#cfe6ff" font-size="14" font-weight="800" text-anchor="middle">${L('Мы', 'Us')}</text>
            <image href="assets/sprites/station.png" x="700" y="134" width="92" height="92"/>
            <text x="746" y="240" fill="#cfe6ff" font-size="14" font-weight="800" text-anchor="middle">${L('Станция', 'Station')}</text>
          </svg>
          <div class="route-cards">
            ${order.map(p => `
              <button class="opt route-card" data-k="${p.key}">
                <h4><span class="dot" style="background:${p.color}"></span> ${L('Маршрут', 'Route')} ${p.letter} · ${p.name}</h4>
                <div class="stats">
                  <span>${L('Длина', 'Length')}</span><b>${p.len} ${L('тыс. км', 'thousand km')}</b>
                  <span>${L('Астероидов', 'Asteroids')}</span><b>${p.rocks}</b>
                  <span>${L('Их скорость', 'Their speed')}</span><b>${p.speed}</b>
                  <span>${L('Нужно топлива', 'Fuel needed')}</span><b style="color:${p.fuel > 100 ? 'var(--bad)' : 'inherit'}">${p.fuel} ${L('ед.', 'units')}</b>
                </div>
              </button>`).join('')}
          </div>
          <div class="fuel-line">${L('Топливо на борту: 100 единиц', 'Fuel on board: 100 units')}</div>
          <div class="fb"></div>
          <div class="actions"><button class="btn orange big go" disabled>${L('Лететь этим маршрутом', 'Fly this route')}</button></div>
        </div>`);
      let chosen = null;
      const go = el.querySelector('.go');
      el.querySelectorAll('.route-card').forEach(b => b.onclick = () => {
        sfx.click();
        el.querySelectorAll('.route-card').forEach(x => x.classList.remove('sel'));
        b.classList.add('sel');
        chosen = profiles.find(p => p.key === b.dataset.k);
        el.querySelectorAll('path[data-k]').forEach(p => p.setAttribute('stroke-width', p.dataset.k === chosen.key ? 9 : 4));
        go.disabled = false;
      });
      go.onclick = () => {
        const fb = el.querySelector('.fb');
        const card = el.querySelector(`.route-card[data-k=${chosen.key}]`);
        if (chosen.key === 'long') {
          routeMistakes++;
          sfx.bad();
          card.classList.add('wrong'); card.disabled = true;
          fb.innerHTML = `<div class="feedback no">${chosen.verdict} ${L('Выбери другой маршрут.', 'Choose another route.')}</div>`;
          ctx.mc(L('Отказ! На этот маршрут не хватит топлива — корабль застрянет в пустоте. Сравни «нужно топлива» с тем, что есть на борту.',
                   'Denied! There isn’t enough fuel for this route — the ship would get stuck in empty space. Compare “fuel needed” with the fuel on board.'), 'bad');
          go.disabled = true; chosen = null;
          return;
        }
        if (chosen.key === 'short') {
          routeMistakes++;
          density = 1.55;
          ctx.mc(L('Принято, но это рискованно: на прямом пути много быстрых камней. Будь очень внимателен!',
                   'Accepted, but it’s risky: the direct route is full of fast rocks. Be very careful!'), 'bad');
        } else {
          routeOk = true;
          density = 1;
          ctx.mc(L('Отличный выбор! Обходной маршрут — самый безопасный. Запускаем двигатели!',
                   'Great choice! The detour is the safest route. Starting the engines!'), 'good');
        }
        sfx.ok();
        el.querySelectorAll('button').forEach(b => b.disabled = true);
        fb.innerHTML = `<div class="feedback ${chosen.key === 'safe' ? 'ok' : 'no'}">${chosen.verdict}</div>`;
        ctx.after(1600, flight);
      };
      ctx.stage.appendChild(el);
    }

    /* ---------------- 3. Пилотирование ---------------- */
    function flight() {
      ctx.step(2);
      ctx.stage.classList.add('wide');
      ctx.mc(L('Ты за штурвалом! Следи за <b>пунктиром</b> радара. Скорость можно менять: медленнее — безопаснее, но дольше.',
               'You’re at the controls! Watch the radar’s <b>dashed lines</b>. You can change speed: slower is safer, but takes longer.'));
      const W = 960, H = 540;
      const speedBtns = `
              <button class="btn small ghost" data-s="0">1 · ${L('Тихо', 'Slow')}</button>
              <button class="btn small ghost on" data-s="1">2 · ${L('Средне', 'Medium')}</button>
              <button class="btn small ghost" data-s="2">3 · ${L('Быстро', 'Fast')}</button>`;
      const el = h(`
        <div class="flight ${touch ? 'is-touch' : ''}">
          <canvas class="screen" width="${W}" height="${H}" aria-label="${L('Игровое поле: уклоняйся от астероидов', 'Game screen: dodge the asteroids')}"></canvas>
          <div class="overlay-msg"><div>${ctx.ico('ship')}<h2>${L('Готов?', 'Ready?')}</h2><p>${L('Долети до станции, не задев астероиды. У корабля 3 щита.', 'Reach the station without hitting the asteroids. The ship has 3 shields.')}</p><button class="btn orange big">${L('Старт!', 'Start!')}</button></div></div>
          ${touch ? `
          <div class="pad panel flat">
            <div class="joy" aria-label="${L('Джойстик', 'Joystick')}">
              <div class="joy-base"><div class="joy-knob"></div></div>
            </div>
            <div class="throttle vertical"><span>${L('СКОРОСТЬ', 'SPEED')}</span>${speedBtns}</div>
          </div>` : `
          <div class="flight-ui panel flat">
            <div class="throttle">${L('СКОРОСТЬ', 'SPEED')} ${speedBtns}</div>
            <div class="hint-keys"><span class="kbd">↑↓←→</span> / <span class="kbd">WASD</span> ${L('или веди мышкой', 'or drag with the mouse')}</div>
          </div>`}
        </div>`);
      ctx.stage.appendChild(el);
      const cv = el.querySelector('canvas');
      const g = cv.getContext('2d');
      const overlay = el.querySelector('.overlay-msg');

      // спрайты из Higgsfield
      const IMG = {};
      ['ship', 'rock1', 'rock2', 'rockbig', 'station'].forEach(n => { IMG[n] = new Image(); IMG[n].src = `assets/sprites/${n}.png`; });
      IMG.bg = new Image(); IMG.bg.src = 'assets/img/asteroids.jpg';
      let trail = [], bgX = 0;
      function drawBg() {
        const im = IMG.bg;
        if (!im.complete || !im.naturalWidth) { g.fillStyle = '#17206e'; g.fillRect(-20, -20, W + 40, H + 40); return; }
        const sc = H / im.naturalHeight * 1.05, iw = im.naturalWidth * sc;
        // каждая вторая копия фона отзеркалена, поэтому края совпадают и склейки не видно
        bgX = (bgX + (running ? 0.25 * SPEEDS[sIdx] : 0)) % (iw * 2);
        for (let k = 0, x = -bgX; x < W; k++, x += iw) {
          if (k % 2 === 0) g.drawImage(im, x, -10, iw, H + 20);
          else { g.save(); g.translate(x + iw, 0); g.scale(-1, 1); g.drawImage(im, 0, -10, iw, H + 20); g.restore(); }
        }
        g.fillStyle = 'rgba(15,18,70,0.52)'; g.fillRect(-20, -20, W + 40, H + 40);
      }
      IMG.bg.onload = () => { if (!running) draw(); };

      const SPEEDS = [0.65, 1, 1.45];
      let sIdx = 1;
      const thrBtns = el.querySelectorAll('[data-s]');
      function setSpeed(i) {
        sIdx = clamp(i, 0, 2);
        thrBtns.forEach(b => b.classList.toggle('on', +b.dataset.s === sIdx));
      }
      thrBtns.forEach(b => b.onclick = () => { sfx.click(); setSpeed(+b.dataset.s); });

      // состояние
      const ship = { x: 150, y: H / 2, r: 20, vx: 0, vy: 0 };
      let rocks = [], stars = [], sparks = [];
      let shields = 3, hits = 0, inv = 0, progress = 0, spawnT = 0, t = 0;
      let bigDone = false, bigWarn = 0, running = false, shakeT = 0, last = 0, closeCalls = 0;
      const GOAL = 48; // «секунд» полёта при средней скорости
      for (let i = 0; i < 90; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, z: Math.random() * 0.9 + 0.1 });

      /* --- клавиатура --- */
      const keys = {};
      const kd = e => {
        const k = e.key.toLowerCase();
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
        keys[k] = true;
        if (k === '1' || k === '2' || k === '3') setSpeed(+k - 1);
      };
      const ku = e => { keys[e.key.toLowerCase()] = false; };
      window.addEventListener('keydown', kd);
      window.addEventListener('keyup', ku);
      ctx.onCleanup(() => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); });

      /* --- мышь: корабль летит к курсору, пока кнопка зажата --- */
      let target = null;
      function toLocal(e) {
        const r = cv.getBoundingClientRect();
        return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
      }
      cv.addEventListener('pointerdown', e => { target = toLocal(e); try { cv.setPointerCapture(e.pointerId); } catch (err) { /* не критично */ } });
      cv.addEventListener('pointermove', e => { if (target) target = toLocal(e); });
      cv.addEventListener('pointerup', () => { target = null; });
      cv.addEventListener('pointercancel', () => { target = null; });

      /* --- джойстик-кружок для телефона ---
         Палец можно поставить в любое место зоны: кружок «прыгает» под палец,
         а смещение ручки от центра задаёт направление и силу движения. */
      const joy = { x: 0, y: 0, id: null };
      const zone = el.querySelector('.joy');
      if (zone) {
        const base = zone.querySelector('.joy-base'), knob = zone.querySelector('.joy-knob');
        let cx = 0, cy = 0, R = 50;
        const home = () => { base.style.left = '50%'; base.style.top = '50%'; };
        const moveKnob = (dx, dy) => { knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`; };
        function setFrom(e) {
          let dx = e.clientX - cx, dy = e.clientY - cy;
          const len = Math.hypot(dx, dy);
          if (len > R) { dx = dx / len * R; dy = dy / len * R; }
          moveKnob(dx, dy);
          joy.x = dx / R; joy.y = dy / R;
        }
        zone.addEventListener('pointerdown', e => {
          e.preventDefault();
          if (joy.id !== null) return;
          joy.id = e.pointerId;
          try { zone.setPointerCapture(e.pointerId); } catch (err) { /* не критично */ }
          const zr = zone.getBoundingClientRect(), br = base.getBoundingClientRect();
          R = br.width * 0.38;
          // кружок встаёт под палец, но не вылезает за край зоны
          const half = br.width / 2;
          cx = clamp(e.clientX, zr.left + half, zr.right - half);
          cy = clamp(e.clientY, zr.top + half, zr.bottom - half);
          base.style.left = (cx - zr.left) + 'px';
          base.style.top = (cy - zr.top) + 'px';
          zone.classList.add('active');
          setFrom(e);
        });
        zone.addEventListener('pointermove', e => { if (e.pointerId === joy.id) setFrom(e); });
        const release = e => {
          if (e.pointerId !== joy.id) return;
          joy.id = null; joy.x = 0; joy.y = 0;
          moveKnob(0, 0); home();
          zone.classList.remove('active');
        };
        zone.addEventListener('pointerup', release);
        zone.addEventListener('pointercancel', release);
        zone.addEventListener('contextmenu', e => e.preventDefault());
      }

      overlay.querySelector('button').onclick = () => {
        sfx.ok();
        overlay.remove();
        running = true;
        last = performance.now();
        ctx.frame(loop);
        if (touch) el.querySelector('.pad').scrollIntoView({ behavior: 'smooth', block: 'end' });
      };

      function spawn(big) {
        if (big) {
          // крупный астероид, нацеленный прямо в корабль
          const x = W + 70, y = ship.y;
          const time = 3.2;
          rocks.push({ x, y, r: 54, vx: -(x - ship.x) / time, vy: 0, big: true, rot: 0, vr: 0.4 });
          return;
        }
        const r = 12 + Math.random() * 24;
        const y = Math.random() * H;
        const vx = -(110 + Math.random() * 120) * (density > 1 ? 1.2 : 1);
        const vy = (Math.random() - 0.5) * 110;
        rocks.push({ x: W + r + 10, y, r, vx, vy, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 2, alt: Math.random() < 0.5 });
      }

      function loop(now) {
        if (!running) return;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        update(dt);
        draw();
        if (running) ctx.frame(loop);
      }

      function update(dt) {
        t += dt;
        const sp = SPEEDS[sIdx];
        // движение корабля
        const acc = 900, max = 300;
        let ax = 0, ay = 0;
        if (keys.arrowup || keys.w || keys['ц']) ay -= 1;
        if (keys.arrowdown || keys.s || keys['ы']) ay += 1;
        if (keys.arrowleft || keys.a || keys['ф']) ax -= 1;
        if (keys.arrowright || keys.d || keys['в']) ax += 1;
        if (joy.id !== null) {
          // джойстик: чем дальше ручка от центра, тем быстрее
          ship.vx += (joy.x * max * 1.1 - ship.vx) * Math.min(1, dt * 12);
          ship.vy += (joy.y * max * 1.1 - ship.vy) * Math.min(1, dt * 12);
        } else if (target) {
          const dx = target.x - ship.x, dy = target.y - ship.y;
          ship.vx = clamp(dx * 6, -max, max);
          ship.vy = clamp(dy * 6, -max, max);
        } else {
          ship.vx = ax ? clamp(ship.vx + ax * acc * dt, -max, max) : ship.vx * Math.pow(0.02, dt);
          ship.vy = ay ? clamp(ship.vy + ay * acc * dt, -max, max) : ship.vy * Math.pow(0.02, dt);
        }
        ship.x = clamp(ship.x + ship.vx * dt, 40, W * 0.55);
        ship.y = clamp(ship.y + ship.vy * dt, 26, H - 26);

        // прогресс: быстрее летишь — быстрее прилетишь
        progress += dt * sp / GOAL;

        // звёзды
        stars.forEach(s => { s.x -= 120 * s.z * sp * dt * 2; if (s.x < 0) { s.x = W; s.y = Math.random() * H; } });

        // крупный астероид в середине пути
        if (!bigDone && progress > 0.48) {
          bigDone = true; bigWarn = 3.2;
          ctx.mc(L('<b>Крупный астероид прямо по курсу!</b> Смотри на красную линию и уходи с его траектории!',
                   '<b>Big asteroid dead ahead!</b> Watch the red line and get out of its path!'), 'alarm');
          spawn(true);
        }
        if (bigWarn > 0) bigWarn -= dt;

        // новые астероиды (меньше, пока летит большой)
        spawnT -= dt;
        if (spawnT <= 0 && progress < 0.97) {
          spawn(false);
          const base = 0.85 / density;
          spawnT = (bigWarn > 0 ? base * 2.5 : base) / sp * (0.6 + Math.random() * 0.8) * (t < 4 ? 1.8 : 1);
        }

        // движение астероидов (их скорость относительно нас зависит и от нашей скорости)
        rocks.forEach(r => {
          r.x += r.vx * (r.big ? 1 : sp) * dt;
          r.y += r.vy * dt;
          r.rot += r.vr * dt;
          if (r.y < -r.r || r.y > H + r.r) r.vy *= -1;
          const d = Math.hypot(r.x - ship.x, r.y - ship.y);
          if (inv <= 0 && d < r.r * 0.85 + ship.r) { hit(r); }
          else if (!r.counted && d < r.r + ship.r + 18 && r.x < ship.x) { r.counted = true; closeCalls++; }
        });
        rocks = rocks.filter(r => r.x > -r.r - 20 && !r.dead);
        sparks.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; });
        sparks = sparks.filter(p => p.life > 0);
        if (inv > 0) inv -= dt;
        if (shakeT > 0) shakeT -= dt;

        if (progress >= 1) win();
      }

      function hit(r) {
        shields--; hits++; inv = 1.6; shakeT = 0.35;
        sfx.hit();
        if (navigator.vibrate) navigator.vibrate(120);
        if (!r.big) r.dead = true;
        for (let i = 0; i < 18; i++) sparks.push({ x: ship.x, y: ship.y, vx: (Math.random() - 0.5) * 300, vy: (Math.random() - 0.5) * 300, life: 0.6 });
        if (shields <= 0) {
          running = false;
          ctx.after(700, () => ctx.fail(
            L('Щиты корабля исчерпаны — три столкновения с астероидами.', 'The ship’s shields are gone — three asteroid hits.'),
            L('Смотри на пунктир радара: уходи с линии заранее. И попробуй скорость «Тихо» — у тебя будет больше времени на реакцию.',
              'Watch the radar lines and move out of the way early. Try the “Slow” speed — you’ll have more time to react.')));
        } else {
          ctx.mc(L(`Удар по корпусу! Осталось щитов: <b>${shields}</b>. Сбавь скорость и следи за траекториями.`,
                   `Hull hit! Shields left: <b>${shields}</b>. Slow down and watch the trajectories.`), 'bad');
        }
      }

      function win() {
        running = false;
        draw(true);
        let score = 3;
        const notes = [];
        if (routeOk && routeMistakes === 0) notes.push({ ok: true, text: L('Выбран самый безопасный маршрут с первого раза.', 'You chose the safest route on the first try.') });
        else {
          score--;
          notes.push({ ok: false, text: routeOk
            ? L('Безопасный маршрут найден не с первого раза: сравнивай риск и запас топлива.', 'It took more than one try to find the safe route: compare the risk and the fuel.')
            : L('Выбран рискованный прямой маршрут. Безопаснее был обходной: мало медленных астероидов, и топлива хватает.', 'You took the risky direct route. The detour was safer: few slow asteroids and enough fuel.') });
        }
        if (hits === 0) notes.push({ ok: true, text: L('Ни одного столкновения — идеальное пилотирование!', 'Not a single hit — perfect piloting!') });
        else { score -= hits >= 2 ? 2 : 1; notes.push({ ok: false, text: L(`Столкновений: ${hits}. Уходи с траектории астероида заранее.`, `Hits: ${hits}. Move out of an asteroid’s path early.`) }); }
        if (closeCalls > 0) notes.push({ ok: true, text: L(`Опасных сближений, из которых ты вышел без повреждений: ${closeCalls}.`, `Close calls you escaped without damage: ${closeCalls}.`) });
        ctx.mc(L('Стыковка со станцией «Орбита-7» прошла успешно. Отличная работа, пилот!', 'Docking with “Orbit-7” station complete. Great job, pilot!'), 'good');
        ctx.after(1500, () => ctx.finish(score, notes));
      }

      /* ---------- рисование ---------- */
      function draw(final) {
        g.save();
        if (shakeT > 0) g.translate((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12);
        drawBg();
        stars.forEach(s => { g.fillStyle = `rgba(255,255,255,${0.3 + s.z * 0.7})`; g.fillRect(s.x, s.y, 1 + s.z * 2, 1 + s.z * 2); });

        // траектории
        rocks.forEach(r => {
          const vx = r.vx * (r.big ? 1 : SPEEDS[sIdx]);
          const ahead = 1.3;
          const ex = r.x + vx * ahead, ey = r.y + r.vy * ahead;
          // опасна ли траектория: минимальное расстояние от корабля до отрезка
          const danger = segDist(ship.x, ship.y, r.x, r.y, ex, ey) < r.r + ship.r + 6;
          g.strokeStyle = danger ? 'rgba(255,90,110,0.95)' : 'rgba(111,211,255,0.35)';
          g.lineWidth = danger ? 3 : 2;
          g.setLineDash([8, 8]);
          g.beginPath(); g.moveTo(r.x, r.y); g.lineTo(ex, ey); g.stroke();
        });
        g.setLineDash([]);

        // астероиды
        rocks.forEach(r => {
          const im = r.big ? IMG.rockbig : r.alt ? IMG.rock2 : IMG.rock1;
          const d = r.r * 2.5;
          g.save(); g.translate(r.x, r.y); g.rotate(r.rot);
          if (im.complete && im.naturalWidth) g.drawImage(im, -d / 2, -d / 2, d, d);
          g.restore();
        });

        // корабль
        if (!(inv > 0 && Math.floor(inv * 10) % 2)) drawShip(ship.x, ship.y);
        sparks.forEach(p => { g.fillStyle = `rgba(255,${150 + Math.random() * 100 | 0},60,${p.life / 0.6})`; g.fillRect(p.x, p.y, 4, 4); });

        // станция в конце
        if (progress > 0.85) {
          const sx = W + 120 - (progress - 0.85) / 0.15 * 260;
          g.drawImage(IMG.station, sx - 80, H / 2 - 80, 160, 160);
        }

        // предупреждение
        if (bigWarn > 0 && Math.floor(bigWarn * 4) % 2 === 0) {
          g.fillStyle = 'rgba(255,84,104,0.18)'; g.fillRect(0, 0, W, H);
          g.fillStyle = '#fff'; g.font = '30px "Russo One", Nunito, sans-serif'; g.textAlign = 'center';
          g.fillText(L('АСТЕРОИД ПО КУРСУ!', 'ASTEROID AHEAD!'), W / 2, 100);
        }
        g.restore();
        hud();
        if (final) {
          g.fillStyle = 'rgba(13,18,64,0.5)'; g.fillRect(0, 0, W, H);
          g.fillStyle = '#fff'; g.font = '44px "Russo One", Nunito, sans-serif'; g.textAlign = 'center';
          g.fillText(L('Станция достигнута!', 'Station reached!'), W / 2, H / 2);
        }
      }

      function drawShip(x, y) {
        // выхлоп: светящиеся частицы позади корабля
        for (let i = 0; i < 3; i++) trail.push({ x: x - 34, y: y + 8 + (Math.random() - 0.5) * 6, life: 0.35 });
        trail.forEach(p => { p.x -= 260 * SPEEDS[sIdx] * 0.016; p.life -= 0.016; });
        trail = trail.filter(p => p.life > 0);
        trail.forEach(p => { g.fillStyle = `rgba(120,220,255,${p.life * 2})`; g.beginPath(); g.arc(p.x, p.y, 2 + p.life * 8, 0, 7); g.fill(); });
        const w = 84, hh = 56;
        g.save(); g.translate(x, y);
        g.rotate(clamp(ship.vy / 1600, -0.18, 0.18));
        g.drawImage(IMG.ship, -w / 2, -hh / 2, w, hh);
        if (inv > 0) { g.strokeStyle = 'rgba(95,216,255,0.7)'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 44, 0, 7); g.stroke(); }
        g.restore();
      }

      function hud() {
        // на телефоне поле мельче, поэтому подписи крупнее
        const big = touch ? 1.45 : 1;
        // прогресс
        g.fillStyle = 'rgba(13,18,64,0.7)';
        roundRect(16, 14, 330 * big, 46 * big, 14); g.fill();
        g.fillStyle = '#cfe6ff'; g.font = `800 ${13 * big}px Nunito, sans-serif`; g.textAlign = 'left';
        g.fillText(L('ДО СТАНЦИИ', 'TO STATION'), 30, 14 + 18 * big);
        g.fillStyle = 'rgba(255,255,255,0.15)'; roundRect(30, 14 + 25 * big, 300 * big, 10 * big, 5); g.fill();
        g.fillStyle = '#ffb454'; roundRect(30, 14 + 25 * big, 300 * big * clamp(progress, 0, 1), 10 * big, 5); g.fill();
        // щиты
        const sw = 180 * big;
        g.fillStyle = 'rgba(13,18,64,0.7)'; roundRect(W - sw - 16, 14, sw, 46 * big, 14); g.fill();
        g.fillStyle = '#cfe6ff'; g.fillText(L('ЩИТЫ', 'SHIELDS'), W - sw - 2, 14 + 28 * big);
        for (let i = 0; i < 3; i++) {
          g.fillStyle = i < shields ? '#6fd3ff' : 'rgba(255,255,255,0.15)';
          roundRect(W - 16 - (3 - i) * 30 * big, 14 + 12 * big, 22 * big, 22 * big, 6); g.fill();
        }
        if (touch) return; // на телефоне скорость видна на кнопках под полем
        g.fillStyle = 'rgba(13,18,64,0.7)'; roundRect(16, H - 52, 230, 38, 12); g.fill();
        g.fillStyle = '#ffd166'; g.font = '800 15px Nunito, sans-serif';
        g.fillText(L('Скорость: ', 'Speed: ') + L(['тихо', 'средне', 'быстро'], ['slow', 'medium', 'fast'])[sIdx] + ' ' + '▸'.repeat(sIdx + 1), 30, H - 27);
      }
      function roundRect(x, y, w, hh, r) {
        g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r);
        g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
      }
      function segDist(px, py, ax, ay, bx, by) {
        const dx = bx - ax, dy = by - ay;
        const l = dx * dx + dy * dy || 1;
        const k = clamp(((px - ax) * dx + (py - ay) * dy) / l, 0, 1);
        return Math.hypot(px - (ax + k * dx), py - (ay + k * dy));
      }
      draw();
    }
  }
});
