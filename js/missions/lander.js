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
    choose();

    function choose() {
      ctx.step(0);
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
          <div class="panel card" style="margin-top:16px"><div class="fact">${Game.isTouch
            ? L('<b>Управление:</b> большая кнопка «Газ» включает двигатель, кнопки по бокам наклоняют модуль.', '<b>Controls:</b> the big “Thrust” button fires the engine, the side buttons tilt the lander.')
            : L('<b>Управление:</b> <span class="kbd">↑</span> / <span class="kbd">W</span> / <span class="kbd">Пробел</span> — двигатель, <span class="kbd">←</span> <span class="kbd">→</span> — наклон.', '<b>Controls:</b> <span class="kbd">↑</span> / <span class="kbd">W</span> / <span class="kbd">Space</span> — engine, <span class="kbd">←</span> <span class="kbd">→</span> — tilt.')}
          ${L('Сядь на <b>площадку с огнями</b>: вертикальная скорость меньше 2 м/с, модуль ровно.', 'Land on the <b>pad with lights</b>: vertical speed under 2 m/s, lander level.')}</div></div>
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
      let pattern = null;

      // рельеф: холмы и ровная площадка
      const WORLD = W / M;
      const padX = 60 + Math.random() * (WORLD - 120), padW = 26;
      const terrain = [];
      for (let x = 0; x <= WORLD; x += 4) {
        let y = 18 + Math.sin(x * 0.05) * 7 + Math.sin(x * 0.13 + 2) * 4 + Math.sin(x * 0.31) * 1.5;
        terrain.push([x, y]);
      }
      const padY = 16;
      terrain.forEach(p => { if (Math.abs(p[0] - padX) < padW / 2 + 6) p[1] = Math.abs(p[0] - padX) < padW / 2 ? padY : (p[1] + padY) / 2; });
      const groundAt = x => {
        const i = clamp(Math.floor(x / 4), 0, terrain.length - 2);
        const [x0, y0] = terrain[i], [x1, y1] = terrain[i + 1];
        return y0 + (y1 - y0) * ((x - x0) / (x1 - x0));
      };

      const L_ = { x: padX < WORLD / 2 ? WORLD - 40 : 40, y: 140, vx: padX < WORLD / 2 ? -3 : 3, vy: 0, a: 0, fuel: B.fuel, on: false };
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
        const soft = -L_.vy < 2.2, slide = Math.abs(L_.vx) < 1.5, level = Math.abs(L_.a) < 0.22;
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
            : !soft ? L(`Слишком быстро: ${vy.toFixed(1).replace('.', ',')} м/с (нужно меньше 2).`, `Too fast: ${vy.toFixed(1)} m/s (needs to be under 2).`)
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
        if (imgs.bg.complete && imgs.bg.naturalWidth) {
          const im = imgs.bg, sc = Math.max(W / im.naturalWidth, H / im.naturalHeight);
          g.drawImage(im, (W - im.naturalWidth * sc) / 2, (H - im.naturalHeight * sc) / 2, im.naturalWidth * sc, im.naturalHeight * sc);
          g.fillStyle = 'rgba(20,16,60,0.35)'; g.fillRect(0, 0, W, H);
        } else { g.fillStyle = '#17206e'; g.fillRect(0, 0, W, H); }
        // грунт
        if (!pattern && imgs.tex.complete && imgs.tex.naturalWidth) pattern = g.createPattern(imgs.tex, 'repeat');
        g.beginPath(); g.moveTo(0, H);
        terrain.forEach(([x, y]) => g.lineTo(X(x), Y(y)));
        g.lineTo(W, H); g.closePath();
        g.fillStyle = B.ground; g.fill();
        if (pattern) { g.save(); if (B.id === 'moon') g.filter = 'grayscale(1) brightness(1.1)'; g.globalAlpha = 0.55; g.fillStyle = pattern; g.fill(); g.restore(); }
        // площадка
        const px0 = X(padX - padW / 2), px1 = X(padX + padW / 2), py = Y(padY);
        g.fillStyle = '#e8e6ff'; g.fillRect(px0, py - 4, px1 - px0, 6);
        for (let i = 0; i < 6; i++) { g.fillStyle = Math.sin(t * 6 + i) > 0 ? '#ffd166' : '#ff9a3c'; g.fillRect(px0 + i * (px1 - px0) / 5 - 3, py - 8, 6, 5); }
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
        const vy = -L_.vy;
        g.fillStyle = 'rgba(13,18,64,0.75)'; g.fillRect(14, 14, 260, 122);
        g.font = '800 15px Nunito, sans-serif'; g.textAlign = 'left';
        const row = (label, val, color, y) => { g.fillStyle = '#cfe6ff'; g.fillText(label, 26, y); g.fillStyle = color; g.fillText(val, 170, y); };
        row(L('Высота', 'Altitude'), `${alt.toFixed(0)} ${L('м', 'm')}`, '#fff', 38);
        row(L('Скорость вниз', 'Fall speed'), `${vy.toFixed(1)} ${L('м/с', 'm/s')}`, vy < 2.2 ? '#7ee0a0' : vy < 5 ? '#ffd166' : '#ff8a9a', 62);
        row(L('Вбок', 'Sideways'), `${Math.abs(L_.vx).toFixed(1)} ${L('м/с', 'm/s')}`, Math.abs(L_.vx) < 1.5 ? '#7ee0a0' : '#ffd166', 86);
        g.fillStyle = '#cfe6ff'; g.fillText(L('Топливо', 'Fuel'), 26, 112);
        g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(110, 101, 150, 12);
        g.fillStyle = L_.fuel > 25 ? '#ffb454' : '#ff5468'; g.fillRect(110, 101, 150 * L_.fuel / 100, 12);
        g.fillStyle = 'rgba(13,18,64,0.75)'; g.fillRect(W - 200, 14, 186, 40);
        g.fillStyle = '#ffd166'; g.fillText(`g = ${B.g} ${L('м/с²', 'm/s²')}`, W - 186, 40);
        // стрелка к площадке
        if (Math.abs(L_.x - padX) > padW / 2) {
          g.fillStyle = '#ffd166'; g.font = '900 22px Nunito, sans-serif'; g.textAlign = 'center';
          g.fillText(padX > L_.x ? L('площадка ▶', 'pad ▶') : L('◀ площадка', '◀ pad'), W / 2, 40);
        }
      }
    }
  }
});
