/* =====================================================================
   Игра «Мягкая посадка» / Soft Landing
   Посадить модуль на Луну или Марс: тяга против силы тяжести,
   ограниченное топливо, наклон. Учит гравитации и скорости.
   ===================================================================== */
Game.register({
  id: 'lander', order: 5, img: 'lander-bg',
  get tag() { return L('Посадка', 'Landing'); },
  get title() { return L('Мягкая посадка', 'Soft Landing'); },
  get situation() { return L('Посади посадочный модуль на площадку. Слишком быстро — авария, слишком долго — кончится топливо.', 'Land the lander on the pad. Too fast — crash; too slow — you run out of fuel.'); },
  get skills() { return L(['Гравитация', 'Скорость', 'Топливо'], ['Gravity', 'Speed', 'Fuel']); },
  get learn() {
    return L([
      'Сила тяжести на Луне — <b>1,62 м/с²</b>, на Марсе — <b>3,71 м/с²</b>, на Земле — 9,81 м/с². Чем она больше, тем быстрее разгоняется падающий модуль.',
      'Чтобы не падать, двигатель должен толкать вверх <b>сильнее</b>, чем тянет гравитация. Поэтому на Марсе топливо тратится быстрее, чем на Луне.',
      'Посадка считается мягкой, если скорость касания меньше примерно <b>2 м/с</b> — это как спрыгнуть со стула.',
      'Наклоняя модуль, ты направляешь тягу вбок и двигаешься горизонтально. Перед касанием модуль нужно выровнять.',
      'В 1969 году Нил Армстронг вручную облетал камни при посадке «Аполлона-11». Когда модуль коснулся Луны, топлива оставалось меньше чем на минуту.',
      'На Марсе есть тонкая атмосфера, поэтому настоящие аппараты сначала тормозят о воздух и парашютом, а уже потом включают двигатели.'
    ], [
      'Gravity on the Moon is <b>1.62 m/s²</b>, on Mars <b>3.71 m/s²</b>, on Earth 9.81 m/s². The stronger it is, the faster a falling lander speeds up.',
      'To stop falling, the engine must push up <b>harder</b> than gravity pulls down. That’s why fuel runs out faster on Mars than on the Moon.',
      'A landing is soft if the touchdown speed is below about <b>2 m/s</b> — like jumping off a chair.',
      'Tilting the lander points the thrust sideways so you move horizontally. Before touchdown the lander must be level.',
      'In 1969 Neil Armstrong flew Apollo 11 around boulders by hand. When it touched the Moon, less than a minute of fuel was left.',
      'Mars has a thin atmosphere, so real landers first slow down with the air and a parachute, and only then fire their engines.'
    ]);
  },

  start(ctx) {
    const { h, sfx, esc, clamp } = ctx;
    ctx.steps(L(['Выбор цели', 'Посадка'], ['Target', 'Landing']));
    const BODY = {
      moon: { id: 'moon', name: L('Луна', 'Moon'), g: 1.62, ground: '#9a98b4', bg: 'assets/base/moon-surface.jpg', fuel: 100, wind: 0 },
      mars: { id: 'mars', name: L('Марс', 'Mars'), g: 3.71, ground: '#d9824f', bg: 'assets/base/base-mars.jpg', fuel: 100, wind: 0.25 }
    };
    let B = null, attempts = 0, runId = 0, stopKeys = null;
    ctx.step(0);
    ctx.astroBrief([
      [L('Привет! Я <b>ASTRO</b>. Сейчас будем сажать <b>посадочный модуль</b>. Гравитация тянет его вниз, а двигатель толкает вверх.', 'Hi! I’m <b>ASTRO</b>. Now we’ll land the <b>lander</b>. Gravity pulls it down and the engine pushes it up.'), 'wave'],
      [L('Садись на <b>площадку с огнями</b> — над ней написано «СЮДА». Скорость вниз должна быть меньше <b>4 м/с</b>, модуль — ровно, без скольжения вбок.', 'Land on the <b>pad with lights</b> — it says “HERE” above it. Fall speed must be under <b>4 m/s</b>, the lander level, not sliding sideways.'), 'point'],
      [Game.isTouch
        ? L('<b>Управление:</b> большая кнопка «Газ» включает двигатель, кнопки по бокам наклоняют модуль. Включай двигатель короткими нажатиями!', '<b>Controls:</b> the big “Thrust” button fires the engine, the side buttons tilt the lander. Fire the engine in short bursts!')
        : L('<b>Управление:</b> <span class="kbd">↑</span> / <span class="kbd">W</span> / <span class="kbd">Пробел</span> — двигатель, <span class="kbd">←</span> <span class="kbd">→</span> — наклон. Включай двигатель короткими нажатиями!', '<b>Controls:</b> <span class="kbd">↑</span> / <span class="kbd">W</span> / <span class="kbd">Space</span> — engine, <span class="kbd">←</span> <span class="kbd">→</span> — tilt. Fire the engine in short bursts!'), 'point'],
      [L('Садиться можно на <b>Луну</b> — там легко, или на <b>Марс</b> — гравитация сильнее, да ещё ветер. Выбирай!', 'You can land on the <b>Moon</b> — it’s easy, or on <b>Mars</b> — stronger gravity and some wind. Your choice!'), 'wave']
    ], L('Выбрать цель →', 'Choose a target →'), choose);

    function choose() {
      ctx.step(0);
      ctx.stage.innerHTML = '';
      ctx.mc(L('Посадочный модуль готов к спуску. Куда садимся? На Марсе гравитация сильнее — будет труднее.', 'The lander is ready to descend. Where are we landing? Mars has stronger gravity — it’ll be harder.'));
      const card = b => `
        <button class="place-card panel" data-b="${b.id}">
          <span class="ph" style="background-image:url('${b.bg}')"></span>
          <h3>${b.name}</h3>
          <ul><li>${L('Сила тяжести', 'Gravity')}: <b>${String(b.g).replace('.', L(',', '.'))} ${L('м/с²', 'm/s²')}</b></li>
          <li>${b.id === 'moon' ? L('Нет воздуха, нет ветра', 'No air, no wind') : L('Тонкая атмосфера, лёгкий ветер', 'Thin air, light wind')}</li>
          <li>${b.id === 'moon' ? L('Сложность: легко', 'Difficulty: easy') : L('Сложность: труднее', 'Difficulty: harder')}</li></ul>
          <span class="btn orange">${L('Садиться здесь', 'Land here')}</span>
        </button>`;
      const el = h(`
        <div>
          <div class="place-grid">${card(BODY.moon)}${card(BODY.mars)}</div>
        </div>`);
      el.querySelectorAll('.place-card').forEach(b => b.onclick = () => { sfx.click(); B = BODY[b.dataset.b]; fly(); });
      ctx.stage.appendChild(el);
    }

    function fly() {
      ctx.step(1);
      ctx.stage.classList.add('wide');
      attempts++;
      const myRun = ++runId;
      if (stopKeys) stopKeys();
      ctx.mc(L(`Спуск на ${B.id === 'moon' ? 'Луну' : 'Марс'}! Гравитация тянет вниз с ускорением ${String(B.g).replace('.', ',')} м/с². Включай двигатель короткими импульсами.`,
               `Descending to ${B.id === 'moon' ? 'the Moon' : 'Mars'}! Gravity pulls down at ${B.g} m/s². Fire the engine in short bursts.`));
      const W = 960, H = 540, M = 3.4; // пикселей в метре
      const touch = Game.isTouch;
      const el = h(`
        <div class="flight lander ${touch ? 'is-touch' : ''}">
          <canvas class="screen" width="${W}" height="${H}"></canvas>
          ${touch ? `<div class="pad panel flat lander-pad">
            <button class="btn ghost big" data-k="left">${L('◀ Наклон', '◀ Tilt')}</button>
            <button class="btn orange big" data-k="up">${L('Газ', 'Thrust')}</button>
            <button class="btn ghost big" data-k="right">${L('Наклон ▶', 'Tilt ▶')}</button>
          </div>` : ''}
        </div>`);
      ctx.stage.appendChild(el);
      const cv = el.querySelector('canvas'), g = cv.getContext('2d');
      const imgs = {};
      [['bg', B.bg], ['lander', 'assets/base/lander.png'], ['tex', B.id === 'moon' ? 'assets/mars/tex-mars-boulder.jpg' : 'assets/mars/tex-mars-sand.jpg']]
        .forEach(([k, src]) => { imgs[k] = new Image(); imgs[k].src = src; });
      let pattern = null, bgCv = null;

      // рельеф: холмы и ровная площадка
      const WORLD = W / M;
      const padX = 60 + Math.random() * (WORLD - 120), padW = 26;
      const terrain = [];
      for (let x = 0; x <= WORLD; x += 4) {
        let y = 34 + Math.sin(x * 0.05) * 8 + Math.sin(x * 0.13 + 2) * 4 + Math.sin(x * 0.31) * 1.5;
        terrain.push([x, y]);
      }
      const padY = 30;
      terrain.forEach(p => { if (Math.abs(p[0] - padX) < padW / 2 + 6) p[1] = Math.abs(p[0] - padX) < padW / 2 ? padY : (p[1] + padY) / 2; });
      const groundAt = x => {
        const i = clamp(Math.floor(x / 4), 0, terrain.length - 2);
        const [x0, y0] = terrain[i], [x1, y1] = terrain[i + 1];
        return y0 + (y1 - y0) * ((x - x0) / (x1 - x0));
      };

      const L_ = { x: padX < WORLD / 2 ? WORLD - 40 : 40, y: 128, vx: padX < WORLD / 2 ? -3 : 3, vy: 0, a: 0, fuel: B.fuel, on: false };
      const keys = {};
      const kd = e => { const k = e.key.toLowerCase(); if (['arrowup', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault(); keys[k] = true; };
      const ku = e => { keys[e.key.toLowerCase()] = false; };
      window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
      stopKeys = () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
      ctx.onCleanup(stopKeys);
      el.querySelectorAll('[data-k]').forEach(b => {
        const k = b.dataset.k;
        const on = e => { e.preventDefault(); keys['t_' + k] = true; };
        const off = () => { keys['t_' + k] = false; };
        b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
        b.addEventListener('contextmenu', e => e.preventDefault());
      });

      let last = performance.now(), done = false, t = 0, sparks = [], flame = 0;
      const THRUST = B.g * 2.4 + 2; // ускорение двигателя, м/с²
      function loop(now) {
        if (myRun !== runId) return; // началась новая попытка — старый цикл останавливается
        const dt = Math.min(0.04, (now - last) / 1000); last = now; t += dt;
        if (!done) update(dt);
        draw();
        sparks.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= 9 * dt; p.life -= dt; });
        sparks = sparks.filter(p => p.life > 0);
        ctx.frame(loop);
      }
      ctx.frame(loop);

      function update(dt) {
        const up = keys.arrowup || keys.w || keys['ц'] || keys[' '] || keys.t_up;
        const left = keys.arrowleft || keys.a || keys['ф'] || keys.t_left;
        const right = keys.arrowright || keys.d || keys['в'] || keys.t_right;
        L_.a = clamp(L_.a + ((right ? 1 : 0) - (left ? 1 : 0)) * 1.6 * dt, -1.2, 1.2);
        L_.on = up && L_.fuel > 0;
        let ax = 0, ay = -B.g;
        if (L_.on) {
          ax += Math.sin(L_.a) * THRUST; ay += Math.cos(L_.a) * THRUST;
          L_.fuel = Math.max(0, L_.fuel - (5 + B.g) * dt);
          if (Math.random() < 0.5) sfx.type();
        }
        if (B.wind) ax += Math.sin(t * 0.7) * B.wind - L_.vx * 0.05; // ветер и сопротивление воздуха на Марсе
        L_.vx += ax * dt; L_.vy += ay * dt;
        L_.x += L_.vx * dt; L_.y += L_.vy * dt;
        flame = L_.on ? 0.6 + Math.random() * 0.4 : flame * 0.8;
        if (L_.x < 5 || L_.x > WORLD - 5) { L_.x = clamp(L_.x, 5, WORLD - 5); L_.vx *= -0.3; }
        const gy = groundAt(L_.x);
        if (L_.y - 2.2 <= gy) touchdown(gy);
      }

      function touchdown(gy) {
        done = true;
        L_.y = gy + 2.2;
        const onPad = Math.abs(L_.x - padX) < padW / 2 - 2;
        const soft = -L_.vy < 4, slide = Math.abs(L_.vx) < 2.5, level = Math.abs(L_.a) < 0.22;
        const vy = -L_.vy, vx = Math.abs(L_.vx);
        if (onPad && soft && slide && level) {
          sfx.win();
          ctx.mc(L(`<b>Модуль на поверхности!</b> Скорость касания ${vy.toFixed(1).replace('.', ',')} м/с. Отличная посадка!`, `<b>The lander is down!</b> Touchdown speed ${vy.toFixed(1)} m/s. Great landing!`), 'good');
          ctx.after(1800, () => {
            let score = 3;
            const notes = [{ ok: true, text: L(`Посадка на ${B.id === 'moon' ? 'Луну' : 'Марс'}: скорость касания ${vy.toFixed(1).replace('.', ',')} м/с.`, `Landing on ${B.id === 'moon' ? 'the Moon' : 'Mars'}: touchdown speed ${vy.toFixed(1)} m/s.`) }];
            if (L_.fuel < 20) { score--; notes.push({ ok: false, text: L(`Топлива осталось всего ${Math.round(L_.fuel)}%. Включай двигатель короткими импульсами.`, `Only ${Math.round(L_.fuel)}% fuel left. Fire the engine in short bursts.`) }); }
            else notes.push({ ok: true, text: L(`Осталось ${Math.round(L_.fuel)}% топлива.`, `${Math.round(L_.fuel)}% fuel left.`) });
            if (attempts > 2) { score--; notes.push({ ok: false, text: L(`Посадка удалась с ${attempts}-й попытки.`, `Landed on attempt ${attempts}.`) }); }
            if (B.id === 'mars' && score === 3) notes.push({ ok: true, text: L('Посадка на Марс сложнее из-за сильной гравитации — это высший класс!', 'Landing on Mars is harder because of stronger gravity — top class!') });
            ctx.finish(score, notes);
          });
        } else {
          sfx.hit();
          for (let i = 0; i < 40; i++) sparks.push({ x: L_.x, y: L_.y, vx: (Math.random() - 0.5) * 30, vy: Math.random() * 20, life: 1 + Math.random() });
          const why = !onPad ? L('Модуль сел мимо площадки, на неровный грунт.', 'The lander missed the pad and hit rough ground.')
            : !soft ? L(`Слишком быстро: ${vy.toFixed(1).replace('.', ',')} м/с (нужно меньше 4).`, `Too fast: ${vy.toFixed(1)} m/s (needs to be under 4).`)
            : !level ? L('Модуль стоял с наклоном и опрокинулся.', 'The lander was tilted and tipped over.')
            : L(`Модуль скользил вбок со скоростью ${vx.toFixed(1)} м/с.`, `The lander was sliding sideways at ${vx.toFixed(1)} m/s.`);
          ctx.mc(L(`<b>Жёсткая посадка!</b> ${why}`, `<b>Hard landing!</b> ${why}`), 'bad');
          const ov = h(`<div class="overlay-msg"><div><h2>${L('Авария', 'Crash')}</h2><p>${why}</p><button class="btn orange big">${L('Ещё попытка', 'Try again')}</button></div></div>`);
          ov.querySelector('button').onclick = () => { sfx.click(); fly(); };
          ctx.after(900, () => el.appendChild(ov));
        }
      }

      const X = x => x * M, Y = y => H - y * M;
      function draw() {
        if (!bgCv && imgs.bg.complete && imgs.bg.naturalWidth) {
          bgCv = document.createElement('canvas'); bgCv.width = W; bgCv.height = H;
          const b = bgCv.getContext('2d'), im = imgs.bg, sc = Math.max(W / im.naturalWidth, H / im.naturalHeight);
          b.filter = 'blur(3px) saturate(0.8)';
          b.drawImage(im, (W - im.naturalWidth * sc) / 2, (H - im.naturalHeight * sc) / 2 - H * 0.12, im.naturalWidth * sc, im.naturalHeight * sc);
          b.filter = 'none'; b.fillStyle = 'rgba(20,16,60,0.6)'; b.fillRect(0, 0, W, H);
        }
        if (bgCv) g.drawImage(bgCv, 0, 0); else { g.fillStyle = '#17206e'; g.fillRect(0, 0, W, H); }
        // грунт
        if (!pattern && imgs.tex.complete && imgs.tex.naturalWidth) pattern = g.createPattern(imgs.tex, 'repeat');
        g.beginPath(); g.moveTo(0, H);
        terrain.forEach(([x, y]) => g.lineTo(X(x), Y(y)));
        g.lineTo(W, H); g.closePath();
        g.fillStyle = B.ground; g.fill();
        if (pattern) { g.save(); if (B.id === 'moon') g.filter = 'grayscale(1) brightness(1.1)'; g.globalAlpha = 0.55; g.fillStyle = pattern; g.fill(); g.restore(); }
        // яркая кромка грунта — чтобы поверхность была хорошо видна
        g.beginPath(); terrain.forEach(([x, y], i) => i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)));
        g.lineWidth = 6; g.strokeStyle = B.id === 'moon' ? '#e8e6ff' : '#ffc79a'; g.lineJoin = 'round'; g.stroke();
        // площадка: толстая плита, опоры, мигающие маяки и луч света вверх
        const px0 = X(padX - padW / 2), px1 = X(padX + padW / 2), py = Y(padY), pw = px1 - px0, pcx = (px0 + px1) / 2;
        const beam = g.createLinearGradient(0, py - 260, 0, py);
        beam.addColorStop(0, 'rgba(126,224,160,0)'); beam.addColorStop(1, 'rgba(126,224,160,0.28)');
        g.fillStyle = beam; g.fillRect(px0, py - 260, pw, 260);
        g.fillStyle = '#4b3fb5'; g.fillRect(px0 + 8, py + 12, 14, 30); g.fillRect(px1 - 22, py + 12, 14, 30);
        g.fillStyle = '#e8e6ff'; g.fillRect(px0 - 6, py - 4, pw + 12, 18);
        g.lineWidth = 4; g.strokeStyle = '#2b2a6b'; g.strokeRect(px0 - 6, py - 4, pw + 12, 18);
        for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#ffd166' : '#2b2a6b'; g.fillRect(px0 + i * pw / 8, py, pw / 8, 10); }
        [px0 - 2, px1 + 2].forEach((bx, i) => {
          g.fillStyle = '#c8c4f0'; g.fillRect(bx - 3, py - 34, 6, 32);
          g.fillStyle = Math.sin(t * 6 + i * 3) > 0 ? '#7ee0a0' : '#2f8f5a';
          g.beginPath(); g.arc(bx, py - 38, 9, 0, 7); g.fill(); g.lineWidth = 3; g.strokeStyle = '#2b2a6b'; g.stroke();
        });
        // стрелка «сюда» над площадкой
        const bob = Math.sin(t * 5) * 8;
        g.fillStyle = '#7ee0a0'; g.strokeStyle = '#2b2a6b'; g.lineWidth = 4;
        g.beginPath(); g.moveTo(pcx - 22, py - 110 + bob); g.lineTo(pcx + 22, py - 110 + bob); g.lineTo(pcx, py - 80 + bob); g.closePath(); g.fill(); g.stroke();
        g.font = '900 26px Nunito, sans-serif'; g.textAlign = 'center'; g.lineWidth = 6; g.strokeText(L('СЮДА', 'HERE'), pcx, py - 120 + bob); g.fillText(L('СЮДА', 'HERE'), pcx, py - 120 + bob);
        // модуль
        const lx = X(L_.x), ly = Y(L_.y), size = 72;
        g.save(); g.translate(lx, ly); g.rotate(L_.a);
        if (flame > 0.05) {
          const fl = g.createLinearGradient(0, 18, 0, 18 + 50 * flame);
          fl.addColorStop(0, 'rgba(160,230,255,0.95)'); fl.addColorStop(1, 'rgba(255,160,60,0)');
          g.fillStyle = fl; g.beginPath(); g.moveTo(-9, 22); g.lineTo(9, 22); g.lineTo(0, 22 + 55 * flame); g.closePath(); g.fill();
        }
        if (imgs.lander.complete && imgs.lander.naturalWidth) g.drawImage(imgs.lander, -size / 2, -size / 2 - 6, size, size);
        g.restore();
        sparks.forEach(p => { g.fillStyle = `rgba(255,${120 + Math.random() * 120 | 0},60,${Math.min(1, p.life)})`; g.fillRect(X(p.x), Y(p.y), 4, 4); });
        hud();
      }
      function hud() {
        const alt = Math.max(0, L_.y - 2.2 - groundAt(L_.x));
        const vy = -L_.vy, k = touch ? 1.6 : 1; // на телефоне холст сильно уменьшен — табло крупнее
        g.save(); g.scale(k, k);
        const w = W / k, cell = (w - 20) / 5;
        g.fillStyle = 'rgba(13,18,64,0.8)'; g.fillRect(10, 8, w - 20, 44);
        g.textAlign = 'left';
        const item = (i, label, val, color) => {
          const x = 10 + cell * i + 12;
          g.font = '800 11px Nunito, sans-serif'; g.fillStyle = '#cfe6ff'; g.fillText(label, x, 25);
          if (val !== null) { g.font = '900 16px Nunito, sans-serif'; g.fillStyle = color; g.fillText(val, x, 44); }
        };
        item(0, L('Высота', 'Altitude'), `${alt.toFixed(0)} ${L('м', 'm')}`, '#fff');
        item(1, L('Вниз', 'Down'), `${vy.toFixed(1)} ${L('м/с', 'm/s')}`, vy < 4 ? '#7ee0a0' : vy < 6 ? '#ffd166' : '#ff8a9a');
        item(2, L('Вбок', 'Sideways'), `${Math.abs(L_.vx).toFixed(1)} ${L('м/с', 'm/s')}`, Math.abs(L_.vx) < 2.5 ? '#7ee0a0' : '#ffd166');
        item(3, L('Топливо', 'Fuel'), null);
        const fx = 10 + cell * 3 + 12, fw = cell - 24;
        g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(fx, 33, fw, 12);
        g.fillStyle = L_.fuel > 25 ? '#ffb454' : '#ff5468'; g.fillRect(fx, 33, fw * L_.fuel / 100, 12);
        item(4, L('Гравитация', 'Gravity'), `${B.g} ${L('м/с²', 'm/s²')}`, '#ffd166');
        // подсказка, в какую сторону площадка
        if (Math.abs(L_.x - padX) > padW / 2) {
          g.fillStyle = '#ffd166'; g.font = '900 20px Nunito, sans-serif'; g.textAlign = 'center';
          g.fillText(padX > L_.x ? L('площадка ▶', 'pad ▶') : L('◀ площадка', '◀ pad'), w / 2, 80);
        }
        g.restore();
      }
    }
  }
});
