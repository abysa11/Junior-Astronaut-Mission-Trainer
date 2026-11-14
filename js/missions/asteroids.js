/* =====================================================================
   Испытание 1. Астероидный пояс
   Шаги: брифинг → выбор маршрута → пилотирование (canvas).
   ===================================================================== */
Game.register({
  id: 'asteroids', order: 1, img: 'asteroids', tag: 'Пилотирование',
  title: 'Астероидный пояс',
  situation: 'Корабль влетел в область, где много астероидов. Один из них летит прямо на нас!',
  skills: ['Ориентация', 'Скорость', 'Траектория'],
  learn: [
    '<b>Траектория</b> — это линия, по которой движется тело. Зная направление и скорость астероида, можно предсказать, где он окажется через секунду.',
    'Уклоняться нужно от того места, где астероид <b>будет</b>, а не от того, где он сейчас.',
    'Чем быстрее летит корабль, тем меньше времени на реакцию. В опасных местах пилоты <b>сбавляют скорость</b>.',
    'Самый короткий путь не всегда самый безопасный. Маршрут выбирают по риску и по запасу топлива.',
    'В настоящем поясе астероидов между Марсом и Юпитером между крупными астероидами в среднем сотни тысяч километров, так что зонды пролетают его спокойно.'
  ],

  start(ctx) {
    const { h, sfx, shuffle, clamp } = ctx;
    ctx.steps(['Брифинг', 'Маршрут', 'Пилотирование']);
    let routeMistakes = 0;
    let density = 1;      // зависит от выбранного маршрута
    let routeOk = false;

    briefing();

    /* ---------------- 1. Брифинг ---------------- */
    function briefing() {
      ctx.step(0);
      ctx.mc('Внимание, пилот! Впереди <b>астероидный пояс</b>. Нужно выбрать маршрут и провести корабль к станции «Орбита-7», не задев ни одного камня.');
      const el = h(`
        <div class="panel card">
          <div class="task-title"><span class="num">1</span><h2>Как читать траекторию</h2></div>
          <div class="closeup">
            <div class="screen traj-demo">
              <svg viewBox="0 0 220 160" preserveAspectRatio="none"><line x1="165" y1="42" x2="72" y2="112" stroke="#ff8a9a" stroke-width="3" stroke-dasharray="8 6"/></svg>
              ${ctx.ico('rock1', 'rock')}
              ${ctx.ico('ship', 'ship')}
              <span class="lbl">РАДАР ТРАЕКТОРИЙ</span>
            </div>
            <div>
              <p>У каждого астероида есть <b>направление</b> и <b>скорость</b>. Радар корабля рисует пунктир — путь, по которому камень полетит дальше.</p>
              <p>Если пунктир упирается в твой корабль, он станет <b style="color:var(--bad)">красным</b>: уходи вверх или вниз, пока не поздно!</p>
              <div class="fact"><b>Управление:</b> <span class="kbd">↑</span> <span class="kbd">↓</span> <span class="kbd">←</span> <span class="kbd">→</span> или <span class="kbd">W A S D</span>. На телефоне — веди пальцем по экрану. Скорость: кнопки или <span class="kbd">1</span> <span class="kbd">2</span> <span class="kbd">3</span>.</div>
            </div>
          </div>
          <div class="actions"><button class="btn orange big">Понятно, к маршруту →</button></div>
        </div>`);
      el.querySelector('button').onclick = () => { sfx.click(); routes(); };
      ctx.stage.appendChild(el);
    }

    /* ---------------- 2. Маршрут ---------------- */
    function routes() {
      ctx.step(1);
      ctx.mc('Сканер построил три маршрута. Топлива на борту: <b>100 единиц</b>. Выбери <b>самый безопасный</b> путь, на который хватит топлива.');
      // Профили маршрутов. Безопасный уходит то вверх, то вниз — каждый раз по-разному.
      const sides = shuffle(['top', 'bottom']);
      const profiles = [
        { key: 'short', path: 'mid', color: '#ff7e8a', name: 'Прямой', len: 400, rocks: 18, speed: 'быстрые', fuel: 60,
          verdict: 'Короткий, но через самую гущу быстрых астероидов. Риск столкновения очень высокий.' },
        { key: 'safe', path: sides[0], color: '#7ee0a0', name: 'Обходной', len: 520, rocks: 5, speed: 'медленные', fuel: 80,
          verdict: 'Правильно! Путь чуть длиннее, но астероидов мало и они медленные. Топлива хватает.' },
        { key: 'long', path: sides[1], color: '#ffd166', name: 'Дальний', len: 900, rocks: 1, speed: 'медленные', fuel: 135,
          verdict: 'Астероидов почти нет, но нужно 135 единиц топлива, а у нас только 100. Не долетим!' }
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
          let x = 70 + 660 * t, y;
          if (p.path === 'mid') y = 180;
          else {
            const dir = p.path === 'top' ? -1 : 1;
            y = 180 + dir * 140 * Math.sin(Math.PI * t) * 1.0;
          }
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
          <div class="task-title"><span class="num">2</span><h2>Выбери маршрут</h2></div>
          <svg class="route-map screen" viewBox="0 0 800 360">
            ${profiles.map(p => `<path d="${P[p.path]}" data-k="${p.key}" fill="none" stroke="${p.color}" stroke-width="5" stroke-dasharray="12 10" opacity=".85"/>`).join('')}
            ${svgRocks}
            ${profiles.map(p => {
              const lx = 400, ly = p.path === 'mid' ? 160 : p.path === 'top' ? 62 : 300;
              return `<g><rect x="${lx - 16}" y="${ly - 16}" width="32" height="32" rx="9" fill="${p.color}"/><text x="${lx}" y="${ly + 6}" text-anchor="middle" font-weight="900" font-size="18" fill="#1d2466">${p.letter}</text></g>`;
            }).join('')}
            <image href="assets/sprites/ship.png" x="14" y="152" width="84" height="56"/>
            <text x="56" y="228" fill="#cfe6ff" font-size="14" font-weight="800" text-anchor="middle">Мы</text>
            <image href="assets/sprites/station.png" x="700" y="134" width="92" height="92"/>
            <text x="746" y="240" fill="#cfe6ff" font-size="14" font-weight="800" text-anchor="middle">Станция</text>
          </svg>
          <div class="route-cards">
            ${order.map(p => `
              <button class="opt route-card" data-k="${p.key}">
                <h4><span class="dot" style="background:${p.color}"></span> Маршрут ${p.letter} · ${p.name}</h4>
                <div class="stats">
                  <span>Длина</span><b>${p.len} тыс. км</b>
                  <span>Астероидов</span><b>${p.rocks}</b>
                  <span>Их скорость</span><b>${p.speed}</b>
                  <span>Нужно топлива</span><b style="color:${p.fuel > 100 ? 'var(--bad)' : 'inherit'}">${p.fuel} ед.</b>
                </div>
              </button>`).join('')}
          </div>
          <div class="fuel-line">Топливо на борту: 100 единиц</div>
          <div class="fb"></div>
          <div class="actions"><button class="btn orange big go" disabled>Лететь этим маршрутом</button></div>
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
          fb.innerHTML = `<div class="feedback no">${chosen.verdict} Выбери другой маршрут.</div>`;
          ctx.mc('Отказ! На этот маршрут не хватит топлива — корабль застрянет в пустоте. Сравни «нужно топлива» с тем, что есть на борту.', 'bad');
          go.disabled = true; chosen = null;
          return;
        }
        if (chosen.key === 'short') {
          routeMistakes++;
          density = 1.55;
          ctx.mc('Принято, но это рискованно: на прямом пути много быстрых камней. Будь очень внимателен!', 'bad');
        } else {
          routeOk = true;
          density = 1;
          ctx.mc('Отличный выбор! Обходной маршрут — самый безопасный. Запускаем двигатели!', 'good');
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
      ctx.mc('Ты за штурвалом! Следи за <b>пунктиром</b> радара. Скорость можно менять: медленнее — безопаснее, но дольше.');
      const W = 960, H = 540;
      const el = h(`
        <div class="flight">
          <canvas class="screen" width="${W}" height="${H}" aria-label="Игровое поле: уклоняйся от астероидов"></canvas>
          <div class="overlay-msg"><div>${ctx.ico('ship')}<h2>Готов?</h2><p>Долети до станции, не задев астероиды. У корабля 3 щита.</p><button class="btn orange big">Старт!</button></div></div>
          <div class="flight-ui panel flat">
            <div class="throttle">СКОРОСТЬ
              <button class="btn small ghost" data-s="0">1 · Тихо</button>
              <button class="btn small ghost on" data-s="1">2 · Средне</button>
              <button class="btn small ghost" data-s="2">3 · Быстро</button>
            </div>
            <div class="hint-keys"><span class="kbd">↑↓←→</span> / <span class="kbd">WASD</span> или веди пальцем</div>
          </div>
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

      let target = null;
      function toLocal(e) {
        const r = cv.getBoundingClientRect();
        return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
      }
      cv.addEventListener('pointerdown', e => { target = toLocal(e); cv.setPointerCapture(e.pointerId); });
      cv.addEventListener('pointermove', e => { if (target) target = toLocal(e); });
      cv.addEventListener('pointerup', () => { target = null; });
      cv.addEventListener('pointercancel', () => { target = null; });

      overlay.querySelector('button').onclick = () => {
        sfx.ok();
        overlay.remove();
        running = true;
        last = performance.now();
        ctx.frame(loop);
      };

      function spawn(big) {
        const sp = SPEEDS[sIdx];
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
        let dt = Math.min(0.05, (now - last) / 1000);
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
        if (target) {
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
          ctx.mc('<b>Крупный астероид прямо по курсу!</b> Смотри на красную линию и уходи с его траектории!', 'alarm');
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
          // столкновение
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
        if (!r.big) r.dead = true;
        for (let i = 0; i < 18; i++) sparks.push({ x: ship.x, y: ship.y, vx: (Math.random() - 0.5) * 300, vy: (Math.random() - 0.5) * 300, life: 0.6 });
        if (shields <= 0) {
          running = false;
          ctx.after(700, () => ctx.fail('Щиты корабля исчерпаны — три столкновения с астероидами.', 'Смотри на пунктир радара: уходи с линии заранее. И попробуй скорость «Тихо» — у тебя будет больше времени на реакцию.'));
        } else {
          ctx.mc(`Удар по корпусу! Осталось щитов: <b>${shields}</b>. Сбавь скорость и следи за траекториями.`, 'bad');
        }
      }

      function win() {
        running = false;
        draw(true);
        let score = 3;
        const notes = [];
        if (routeOk && routeMistakes === 0) notes.push({ ok: true, text: 'Выбран самый безопасный маршрут с первого раза.' });
        else { score--; notes.push({ ok: false, text: routeOk ? 'Безопасный маршрут найден не с первого раза: сравнивай риск и запас топлива.' : 'Выбран рискованный прямой маршрут. Безопаснее был обходной: мало медленных астероидов, и топлива хватает.' }); }
        if (hits === 0) notes.push({ ok: true, text: 'Ни одного столкновения — идеальное пилотирование!' });
        else { score -= hits >= 2 ? 2 : 1; notes.push({ ok: false, text: `Столкновений: ${hits}. Уходи с траектории астероида заранее.` }); }
        if (closeCalls > 0) notes.push({ ok: true, text: `Опасных сближений, из которых ты вышел без повреждений: ${closeCalls}.` });
        ctx.mc('Стыковка со станцией «Орбита-7» прошла успешно. Отличная работа, пилот!', 'good');
        ctx.after(1500, () => ctx.finish(score, notes));
      }

      /* ---------- рисование ---------- */
      function draw(final) {
        g.save();
        if (shakeT > 0) g.translate((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12);
        // фон из Higgsfield, медленно «плывёт» влево
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
          g.fillStyle = '#fff'; g.font = '900 30px Nunito, sans-serif'; g.textAlign = 'center';
          g.fillText('АСТЕРОИД ПО КУРСУ!', W / 2, 60);
        }
        g.restore();
        hud();
        if (final) {
          g.fillStyle = 'rgba(13,18,64,0.5)'; g.fillRect(0, 0, W, H);
          g.fillStyle = '#fff'; g.font = '900 44px Nunito, sans-serif'; g.textAlign = 'center';
          g.fillText('Станция достигнута!', W / 2, H / 2);
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
        // прогресс
        g.fillStyle = 'rgba(13,18,64,0.7)';
        roundRect(16, 14, 330, 46, 14); g.fill();
        g.fillStyle = '#cfe6ff'; g.font = '800 13px Nunito, sans-serif'; g.textAlign = 'left';
        g.fillText('ДО СТАНЦИИ', 30, 32);
        g.fillStyle = 'rgba(255,255,255,0.15)'; roundRect(30, 39, 300, 10, 5); g.fill();
        g.fillStyle = '#ffb454'; roundRect(30, 39, 300 * clamp(progress, 0, 1), 10, 5); g.fill();
        // щиты
        g.fillStyle = 'rgba(13,18,64,0.7)'; roundRect(W - 196, 14, 180, 46, 14); g.fill();
        g.fillStyle = '#cfe6ff'; g.fillText('ЩИТЫ', W - 182, 42);
        for (let i = 0; i < 3; i++) {
          g.fillStyle = i < shields ? '#6fd3ff' : 'rgba(255,255,255,0.15)';
          roundRect(W - 120 + i * 32, 26, 24, 22, 6); g.fill();
        }
        // скорость
        g.fillStyle = 'rgba(13,18,64,0.7)'; roundRect(16, H - 52, 210, 38, 12); g.fill();
        g.fillStyle = '#ffd166'; g.font = '800 15px Nunito, sans-serif';
        g.fillText('Скорость: ' + ['тихо', 'средне', 'быстро'][sIdx] + ' ' + '▸'.repeat(sIdx + 1), 30, H - 27);
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
