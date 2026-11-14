/* =====================================================================
   Финальное испытание «Последний шанс на Марсе» / Final: Last Chance on Mars
   Этапы: посадка → исследование → поиск деталей → расшифровка →
   ремонт → запуск. Исследование и поиск — от первого лица:
   свой лёгкий 3D-движок на лучах (как в классических играх), без библиотек.
   Все картинки — из Higgsfield (assets/mars/).
   ===================================================================== */
Game.register({
  id: 'mars', order: 5, img: 'mars', final: true,
  get tag() { return L('Финал', 'Final'); },
  get title() { return L('Последний шанс на Марсе', 'Last Chance on Mars'); },
  get situation() { return L('Авария! Корабль сел на Марс без топлива. Рядом — заброшенный корабль прошлой экспедиции. Найди детали и улети домой.', 'Crash! The ship landed on Mars with no fuel. Nearby is an abandoned ship from an earlier expedition. Find the parts and fly home.'); },
  get skills() { return L(['Исследование', 'Расшифровка', 'Ремонт', 'Запуск'], ['Exploring', 'Decoding', 'Repair', 'Launch']); },
  get learn() {
    return L([
      'Марс называют <b>Красной планетой</b>: его грунт содержит много ржавчины — оксида железа.',
      'У Марса <b>два спутника</b>: Фобос и Деймос. Марс — <b>четвёртая</b> планета от Солнца, а всего планет в Солнечной системе <b>восемь</b>.',
      'Воздух на Марсе очень разреженный и почти весь состоит из углекислого газа. Без скафандра дышать там нельзя.',
      'Марсианские сутки называются <b>сол</b>. Они почти как земные: 24 часа 37 минут.',
      'Чтобы улететь с Марса, нужна скорость около <b>5 км/с</b>. С Земли — около 11 км/с: Марс легче, поэтому взлетать с него проще.',
      'Болты на крышке затягивают <b>крест-накрест</b>, чтобы её не перекосило. Так делают и механики на Земле.'
    ], [
      'Mars is called the <b>Red Planet</b>: its soil contains lots of rust — iron oxide.',
      'Mars has <b>two moons</b>: Phobos and Deimos. Mars is the <b>fourth</b> planet from the Sun, and there are <b>eight</b> planets in the Solar System.',
      'The air on Mars is very thin and almost entirely carbon dioxide. You can’t breathe there without a spacesuit.',
      'A Martian day is called a <b>sol</b>. It’s almost like an Earth day: 24 hours 37 minutes.',
      'To leave Mars you need a speed of about <b>5 km/s</b>. From Earth it’s about 11 km/s: Mars is lighter, so taking off is easier.',
      'Bolts on a cover are tightened <b>in a cross pattern</b> so the cover doesn’t tilt. Mechanics on Earth do the same.'
    ]);
  },

  start(ctx) {
    const { h, sfx, shuffle, clamp, esc } = ctx;
    const A = 'assets/mars/';
    ctx.steps(L(['Посадка', 'Исследование', 'Поиск деталей', 'Расшифровка', 'Ремонт', 'Запуск'],
                ['Landing', 'Explore', 'Find parts', 'Decode', 'Repair', 'Launch']));

    /* ---------- общее состояние ---------- */
    const S = {
      inv: { battery: false, cables: false, toolkit: false, fuel: false },
      logs: [false, false, false],
      o2: 100, minO2: 100, codeTries: 0, repairMistakes: 0, launchMistakes: 0,
      hatchSeen: false, lockOpen: false, t0: performance.now()
    };
    const ITEM = {
      battery: { img: 'item-battery', name: L('Аккумулятор', 'Battery') },
      cables: { img: 'item-cables', name: L('Кабели', 'Cables') },
      toolkit: { img: 'item-toolkit', name: L('Ящик с инструментами', 'Toolkit') },
      fuel: { img: 'item-fuel', name: L('Топливный модуль', 'Fuel module') }
    };
    const CODE = '248';
    const LOGS = [
      L('Запись 1. Говорит капитан Арман, экспедиция «Заря-7». При посадке повредился двигатель, связи с Землёй нет. Последний топливный модуль я запер в двигательном отсеке. Код спрятан в трёх загадках. <b>Первая цифра: сколько спутников у Марса?</b>',
        'Log 1. This is Captain Arman, expedition “Dawn-7”. The engine was damaged on landing and we lost contact with Earth. I locked the last fuel module in the engine room. The code is hidden in three riddles. <b>First digit: how many moons does Mars have?</b>'),
      L('Запись 2. Мы ждём помощи уже сорок солов — так называют марсианские сутки. Аккумулятор и кабели ещё целы, пригодятся тому, кто придёт после нас. <b>Вторая цифра: какая по счёту от Солнца планета Марс?</b>',
        'Log 2. We’ve been waiting for help for forty sols — that’s what Martian days are called. The battery and cables still work; they’ll help whoever comes after us. <b>Second digit: which planet from the Sun is Mars?</b>'),
      L('Запись 3. За нами прилетела спасательная капсула, а корабль остаётся здесь. Если ты это читаешь — возьми всё, что нужно, и лети домой. <b>Третья цифра: сколько всего планет в Солнечной системе?</b> Удачи, астронавт!',
        'Log 3. A rescue capsule came for us, but the ship stays here. If you’re reading this, take everything you need and fly home. <b>Third digit: how many planets are in the Solar System?</b> Good luck, astronaut!')
    ];

    /* ---------- кислород скафандра ---------- */
    ctx.stat.innerHTML = `<div class="gauge o2"><div class="g-label"><span>${L('O₂ скафандра', 'Suit O₂')}</span><span class="v">100%</span></div><div class="bar"><i style="width:100%"></i></div></div>`;
    const gauge = ctx.stat.querySelector('.gauge'), gBar = gauge.querySelector('i'), gVal = gauge.querySelector('.v');
    let o2Warned = false, failed = false;
    function renderO2() {
      gBar.style.width = S.o2 + '%';
      gVal.textContent = Math.round(S.o2) + '%';
      gauge.classList.toggle('low', S.o2 < 30);
    }

    /* ---------- модальное окно поверх игры ---------- */
    let modal = null;
    function openModal(html, onReady) {
      closeModal();
      modal = h(`<div class="fp-modal"><div class="panel card fp-modal-card">${html}</div></div>`);
      document.body.appendChild(modal);
      if (world) world.paused = true;
      onReady && onReady(modal);
      return modal;
    }
    function closeModal() {
      if (modal) { modal.remove(); modal = null; }
      if (world) world.paused = false;
    }
    ctx.onCleanup(closeModal);

    let world = null;
    intro();

    /* =================================================================
       0. ПОСАДКА
       ================================================================= */
    function intro() {
      ctx.step(0);
      ctx.mc(L('<b>Авария!</b> Двигатель повреждён, топливо почти на нуле. «Звёздному вихрю» пришлось сесть на Марс. Без ремонта домой не вернуться.',
               '<b>Emergency!</b> The engine is damaged and we’re almost out of fuel. The “Star Whirl” had to land on Mars. We can’t get home without repairs.'), 'alarm');
      const parts = Object.values(ITEM).map(it => `<li><img class="ico" src="${A}${it.img}.png" alt="">${esc(it.name)}</li>`).join('');
      const el = h(`
        <div class="panel card mars-intro">
          <div class="scene" style="background-image:url('${A}mars-intro.jpg')"></div>
          <div class="task-title"><span class="num">!</span><h2>${L('Последний шанс на Марсе', 'Last Chance on Mars')}</h2></div>
          <p>${L('Радар засёк неподалёку <b>заброшенный корабль</b>. Несколько лет назад здесь потерпела аварию другая экспедиция. Её экипаж оставил инструменты и запчасти.',
                 'The radar has spotted an <b>abandoned ship</b> nearby. A few years ago another expedition crashed here. Its crew left tools and spare parts behind.')}</p>
          <p>${L('Найди всё, что нужно для ремонта:', 'Find everything you need for the repair:')}</p>
          <ul class="need-list">${parts}</ul>
          <div class="fact"><b>${L('Важно:', 'Important:')}</b> ${L('снаружи кислород в скафандре расходуется. Внутри кораблей баллоны его пополняют.', 'outside, your suit uses up oxygen. Inside the ships, the tanks refill it.')}</div>
          <div class="actions"><button class="btn orange big">${L('Выйти на поверхность →', 'Step outside →')}</button></div>
        </div>`);
      el.querySelector('button').onclick = () => { sfx.click(); explore(); };
      ctx.stage.appendChild(el);
    }

    /* =================================================================
       1–2. МИР ОТ ПЕРВОГО ЛИЦА
       ================================================================= */
    function explore() {
      ctx.step(1);
      ctx.stage.classList.add('wide');
      ctx.mc(L('Ты на поверхности Марса. Стрелка вверху показывает, куда идти. Доберись до <b>заброшенного корабля</b> и открой люк.',
               'You’re on the surface of Mars. The arrow at the top shows the way. Reach the <b>abandoned ship</b> and open the hatch.'));
      world = makeWorld();
    }

    function makeWorld() {
      const touch = Game.isTouch;
      const self = { paused: false, stop };
      let running = true, renderer = null, onResize = null;

      const el = h(`
        <div class="fp ${touch ? 'is-touch' : ''}">
          <div class="fp-view">
            <div class="fp-canvas"></div>
            <div class="fp-loading screen"><b>${L('Загружаю 3D-мир Марса…', 'Loading the 3D world of Mars…')}</b><i class="bar"><i></i></i></div>
            <div class="fp-compass"><span class="arrow">▲</span><span class="dist"></span></div>
            <canvas class="fp-map" width="104" height="96"></canvas>
            <div class="fp-prompt" hidden></div>
            <div class="fp-cross"></div>
          </div>
          <div class="fp-bar panel flat">
            <div class="fp-goal"><span class="eyebrow">${L('Задача', 'Objective')}</span><b class="goal"></b></div>
            <div class="fp-inv"></div>
            ${touch ? '' : `<div class="hint-keys"><span class="kbd">W A S D</span> / <span class="kbd">↑↓←→</span> ${L('ходить', 'move')} · ${L('тяни мышью — осмотреться', 'drag mouse — look around')} · <span class="kbd">E</span> ${L('действие', 'action')}</div>`}
          </div>
          ${touch ? `
          <div class="pad panel flat">
            <div class="joy" aria-label="${L('Джойстик', 'Joystick')}"><div class="joy-base"><div class="joy-knob"></div></div></div>
            <button class="btn orange big fp-act">${L('Действие', 'Action')}</button>
          </div>` : ''}
        </div>`);
      ctx.stage.appendChild(el);
      const holder = el.querySelector('.fp-canvas');
      const loadingEl = el.querySelector('.fp-loading'), loadBar = loadingEl.querySelector('.bar i');
      const mapCv = el.querySelector('.fp-map'), mg = mapCv.getContext('2d');
      const promptEl = el.querySelector('.fp-prompt'), goalEl = el.querySelector('.goal');
      const arrowEl = el.querySelector('.fp-compass .arrow'), distEl = el.querySelector('.fp-compass .dist');
      const invEl = el.querySelector('.fp-inv');

      function renderInv() {
        invEl.innerHTML = Object.entries(ITEM).map(([k, it]) =>
          `<span class="slot ${S.inv[k] ? 'got' : ''}" title="${esc(it.name)}"><img src="${A}${it.img}.png" alt="${esc(it.name)}"></span>`).join('') +
          `<span class="slot logs ${S.logs.every(Boolean) ? 'got' : ''}" title="${L('Записи экипажа', 'Crew logs')}"><img src="${A}item-logbook.png" alt=""><em>${S.logs.filter(Boolean).length}/3</em></span>`;
      }
      renderInv();

      function stop() {
        running = false;
        if (onResize) window.removeEventListener('resize', onResize);
        if (renderer) { renderer.dispose(); renderer.forceContextLoss(); renderer = null; }
      }
      ctx.onCleanup(stop);

      import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js')
        .then(THREE => { if (running) init(THREE); })
        .catch(() => {
          loadingEl.innerHTML = `<b>${L('Не получилось загрузить 3D-движок.', 'Couldn’t load the 3D engine.')}</b><span>${L('Для этого испытания нужен интернет. Проверь подключение и нажми «Ещё раз».', 'This challenge needs the internet. Check your connection and try again.')}</span>`;
        });

      function init(THREE) {
        /* ---------- геометрия мира ---------- */
        const OS = { x: -26, z: 22 };                                   // наш корабль
        const HULL = { x0: 8, x1: 32, z: -20, R: 3.6, cy: 2.0, floor: 0.4 }; // заброшенный корабль
        const HATCH = { x: 19, z: HULL.z + 3.25 };
        const BULK = [16, 22, 28];                                      // переборки (28 — с замком)
        const clamp01 = v => Math.max(0, Math.min(1, v));
        const smooth = (e0, e1, v) => { const t = clamp01((v - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
        let seed = 7;
        const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

        function dunes(x, z) {
          return 1.3 * Math.sin(x * 0.07 + z * 0.045) + 0.9 * Math.sin(z * 0.1 - x * 0.035 + 1.3) +
                 0.45 * Math.sin((x + z) * 0.19) + 0.25 * Math.sin(x * 0.43 - z * 0.31) + 1.6;
        }
        function flatness(x, z) {
          const a = smooth(11, 5, Math.hypot(x - OS.x, z - OS.z));
          const dx = Math.max(HULL.x0 - 5 - x, 0, x - (HULL.x1 + 5)), dz = Math.max(Math.abs(z - HULL.z) - 6, 0);
          const b = smooth(7, 0, Math.hypot(dx, dz));
          return Math.max(a, b);
        }
        function groundH(x, z) {
          const r = Math.hypot(x, z);
          return dunes(x, z) * (1 - flatness(x, z)) * 0.85 + smooth(52, 80, r) * 32;
        }

        /* ---------- рендер, сцена, камера ---------- */
        renderer = new THREE.WebGLRenderer({ antialias: !touch, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, touch ? 1.25 : 1.75));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        holder.appendChild(renderer.domElement);
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xa99cf0); // цвет верха неба
        scene.fog = new THREE.Fog(0xe7b49c, 40, 165);
        const camera = new THREE.PerspectiveCamera(72, 16 / 9, 0.05, 700);
        camera.rotation.order = 'YXZ';
        onResize = () => {
          const w = holder.clientWidth || 640, hh = Math.round(w * 9 / 16);
          renderer.setSize(w, hh, false);
          camera.aspect = w / hh; camera.updateProjectionMatrix();
        };
        window.addEventListener('resize', onResize);
        onResize();

        const manager = new THREE.LoadingManager();
        manager.onProgress = (u, done, total) => { loadBar.style.width = Math.round(done / total * 100) + '%'; };
        manager.onLoad = () => { loadingEl.hidden = true; };
        const loader = new THREE.TextureLoader(manager);
        const tex = (file, rx = 1, ry = 1, mirror) => {
          const t = loader.load(file);
          t.colorSpace = THREE.SRGBColorSpace;
          t.wrapS = mirror ? THREE.MirroredRepeatWrapping : THREE.RepeatWrapping;
          t.wrapT = mirror ? THREE.MirroredRepeatWrapping : THREE.RepeatWrapping; // зеркальные повторы прячут швы
          t.repeat.set(rx, ry);
          t.anisotropy = 4;
          return t;
        };

        /* ---------- свет ---------- */
        scene.add(new THREE.HemisphereLight(0xffe6d0, 0x8a4a35, 1.25));
        const sun = new THREE.DirectionalLight(0xfff0dc, 1.7);
        sun.position.set(-60, 80, 40);
        scene.add(sun);

        // небо: плавный градиент в цветах марсианского неба (лаванда сверху, персик у горизонта)
        function skyGradient() {
          const c = document.createElement('canvas'); c.width = 4; c.height = 256;
          const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
          gr.addColorStop(0, '#a99cf0'); gr.addColorStop(0.45, '#c9b8ee'); gr.addColorStop(0.78, '#efc6cf'); gr.addColorStop(1, '#f8cdb2');
          g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
          const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
        }
        /* ---------- небо: купол с картинкой из Higgsfield + два спутника Марса ---------- */
        const sky = new THREE.Mesh(new THREE.SphereGeometry(340, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.62),
          new THREE.MeshBasicMaterial({ map: skyGradient(), side: THREE.BackSide, fog: false }));
        sky.position.y = -40;
        scene.add(sky);
        [[-150, 165, -210, 30], [230, 120, 80, 13]].forEach(([x, y, z, s]) => {
          const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(A + 'obj-phobos.png'), fog: false, transparent: true }));
          moon.scale.set(s, s, 1); moon.position.set(x, y, z);
          scene.add(moon);
        });

        /* ---------- грунт: дюны и склоны каньона ---------- */
        const gGeo = new THREE.PlaneGeometry(210, 210, 180, 180);
        gGeo.rotateX(-Math.PI / 2);
        const gp = gGeo.attributes.position;
        for (let i = 0; i < gp.count; i++) gp.setY(i, groundH(gp.getX(i), gp.getZ(i)));
        gGeo.computeVertexNormals();
        scene.add(new THREE.Mesh(gGeo, new THREE.MeshStandardMaterial({ map: tex(A + 'tex-mars-sand.jpg', 22, 22, true), color: 0xffe2cc, roughness: 1 })));

        /* ---------- столовые горы и валуны (неровные, с текстурой скалы) ---------- */
        const obstacles = []; // {x, z, r}
        function jitter(geo, amount, axisY) {
          const p = geo.attributes.position;
          for (let i = 0; i < p.count; i++) {
            const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
            const n = Math.sin(x * 2.1 + y * 1.3) * Math.cos(z * 1.7 - y * 0.9) + Math.sin((x + z) * 3.3) * 0.5;
            const k = 1 + n * amount;
            if (axisY) { p.setX(i, x * k); p.setZ(i, z * k); } else { p.setXYZ(i, x * k, y * k, z * k); }
          }
          geo.computeVertexNormals();
          return geo;
        }
        const rockMat = (rx, ry) => new THREE.MeshStandardMaterial({ map: tex(A + 'tex-mars-rock.jpg', rx, ry, true), roughness: 0.95 });
        const boulderMat = () => new THREE.MeshStandardMaterial({ map: tex(A + 'tex-mars-boulder.jpg', 1, 1), roughness: 1 });
        const MESAS = [[-2, 12, 4.2, 8], [12, 16, 3.5, 7], [-34, -6, 5, 11], [28, 12, 4, 8], [-14, -26, 4.5, 10], [40, -4, 3.2, 6], [2, -38, 5, 9], [-40, 30, 3.5, 7], [-10, 38, 3, 6], [22, 36, 4, 8], [-44, 8, 4, 9]];
        MESAS.forEach(([x, z, r, hgt]) => {
          const g = jitter(new THREE.CylinderGeometry(r * 0.72, r, hgt, 18, 6), 0.12, true);
          const m = new THREE.Mesh(g, rockMat(3, Math.max(1, hgt / 3.5)));
          m.position.set(x, groundH(x, z) + hgt / 2 - 0.6, z);
          m.rotation.y = rnd() * 6;
          scene.add(m);
          obstacles.push({ x, z, r: r * 0.95 });
        });
        // кольцо крупных скал по краю долины
        for (let i = 0; i < 26; i++) {
          const a = i / 26 * Math.PI * 2 + rnd() * 0.15, rr = 53 + rnd() * 6, s = 3.5 + rnd() * 4;
          const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
          const m = new THREE.Mesh(jitter(new THREE.IcosahedronGeometry(1, 2), 0.18), boulderMat());
          m.scale.set(s * (1 + rnd() * 0.6), s * (0.7 + rnd() * 0.5), s);
          // наполовину в грунте — валуны не «висят» на склоне
          m.position.set(x, Math.min(groundH(x, z), groundH(x * 0.94, z * 0.94)) - s * 0.15, z);
          m.rotation.set(rnd(), rnd() * 6, rnd());
          scene.add(m);
        }
        // валуны поменьше
        for (let i = 0; i < 70; i++) {
          const x = (rnd() - 0.5) * 100, z = (rnd() - 0.5) * 100;
          if (Math.hypot(x, z) > 50) continue;
          if (Math.hypot(x - OS.x, z - OS.z) < 8) continue;
          if (x > HULL.x0 - 5 && x < HULL.x1 + 5 && Math.abs(z - HULL.z) < 8) continue;
          if (obstacles.some(o => Math.hypot(o.x - x, o.z - z) < o.r + 2)) continue;
          const s = 0.3 + rnd() * rnd() * 2.2;
          const m = new THREE.Mesh(jitter(new THREE.IcosahedronGeometry(1, 1), 0.22), boulderMat());
          m.scale.set(s * (1 + rnd() * 0.5), s * (0.6 + rnd() * 0.4), s);
          m.position.set(x, groundH(x, z) + s * 0.05, z);
          m.rotation.set(rnd(), rnd() * 6, rnd());
          scene.add(m);
          if (s > 0.9) obstacles.push({ x, z, r: s * 0.95 });
        }

        /* ---------- наш корабль «Звёздный вихрь» ---------- */
        const shipSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex('assets/sprites/ship.png') }));
        shipSpr.scale.set(12, 8.07, 1);
        shipSpr.position.set(OS.x, groundH(OS.x, OS.z) + 3.3, OS.z);
        scene.add(shipSpr);
        obstacles.push({ x: OS.x, z: OS.z, r: 3.2 });

        /* ---------- заброшенный корабль: обтекаемый корпус ---------- */
        // профиль корпуса вдоль оси X: острый нос с кабиной, ровная середина, сужение к двигателям
        const NOSE = 1.6, TAIL = 33.4;
        function hullR(x) {
          if (x <= NOSE) return 0;
          if (x < HULL.x0) { const t = (HULL.x0 - x) / (HULL.x0 - NOSE); return HULL.R * Math.sqrt(1 - t * t); }
          if (x <= 29) return HULL.R;
          return HULL.R - (x - 29) / (TAIL - 29) * 0.75;
        }
        const ship3d = new THREE.Group();
        scene.add(ship3d);
        const outerMat = (len) => new THREE.MeshStandardMaterial({ map: tex(A + 'tex-hull-smooth.jpg', 5, len / 4.5), roughness: 0.45, metalness: 0.15, side: THREE.DoubleSide });
        const innerMat = (len) => new THREE.MeshStandardMaterial({ map: tex(A + 'tex-ship-wall.jpg', 7, len / 3), side: THREE.DoubleSide, roughness: 0.8 });
        // проём люка на южной стороне (+z): углы, где высота от пола 0.4 до 2.75
        const gA = -Math.asin((2.75 - HULL.cy) / HULL.R) - 0.03, gB = -Math.asin((HULL.floor - HULL.cy) / HULL.R) + 0.03;
        function lathe(x0, x1, inset, mat, gap) {
          const pts = [];
          const n = Math.max(2, Math.ceil((x1 - x0) / 0.35));
          for (let i = 0; i <= n; i++) {
            const x = x0 + (x1 - x0) * i / n;
            pts.push(new THREE.Vector2(Math.max(0.001, hullR(x) - inset), x));
          }
          const g = gap ? new THREE.LatheGeometry(pts, 56, gB, Math.PI * 2 - (gB - gA)) : new THREE.LatheGeometry(pts, 56);
          g.rotateZ(-Math.PI / 2);
          const m = new THREE.Mesh(g, mat);
          m.position.set(0, HULL.cy, HULL.z);
          ship3d.add(m);
          return m;
        }
        const HX0 = HATCH.x - 1.15, HX1 = HATCH.x + 1.15;
        [[NOSE, HX0, false], [HX0, HX1, true], [HX1, TAIL, false]].forEach(([a, b, gap]) => {
          lathe(a, b, 0, outerMat(b - a), gap);
          lathe(Math.max(a, HULL.x0 - 0.2), b, 0.2, innerMat(b - a), gap);
        });
        // стекло кабины на носу
        const glass = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
          new THREE.MeshStandardMaterial({ color: 0x3fc6ff, emissive: 0x0b4a7a, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.85 }));
        glass.scale.set(2.6, 1.0, 1.6);
        glass.rotation.z = -0.32;
        glass.position.set(5.6, HULL.cy + 1.75, HULL.z);
        ship3d.add(glass);
        // пол
        const floorLen = HULL.x1 - HULL.x0;
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(floorLen, 6.3), new THREE.MeshStandardMaterial({ map: tex(A + 'tex-ship-floor.jpg', floorLen / 2.5, 2.5), roughness: 0.9 }));
        floor.rotation.x = -Math.PI / 2;
        floor.position.set((HULL.x0 + HULL.x1) / 2, HULL.floor, HULL.z);
        scene.add(floor);
        // пульт в кабине и стена двигателя
        const consoleWall = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 3.2), new THREE.MeshStandardMaterial({ map: tex(A + 'tex-ship-console.jpg'), emissive: 0x16306a, emissiveIntensity: 0.6, roughness: 0.6 }));
        consoleWall.rotation.y = Math.PI / 2;
        consoleWall.position.set(HULL.x0 + 0.05, HULL.floor + 1.6, HULL.z);
        scene.add(consoleWall);
        const engR = hullR(HULL.x1) - 0.22;
        const engWall = new THREE.Mesh(new THREE.CircleGeometry(engR, 48), new THREE.MeshStandardMaterial({ map: tex(A + 'tex-ship-engine.jpg'), roughness: 0.7 }));
        engWall.rotation.y = -Math.PI / 2;
        engWall.position.set(HULL.x1, HULL.cy, HULL.z);
        scene.add(engWall);
        // корма: плита и три сопла
        const metal = new THREE.MeshStandardMaterial({ color: 0x8f8bb8, roughness: 0.35, metalness: 0.7 });
        const back = new THREE.Mesh(new THREE.CircleGeometry(hullR(TAIL), 48), metal);
        back.rotation.y = Math.PI / 2; back.position.set(TAIL, HULL.cy, HULL.z);
        ship3d.add(back);
        [[0, 1.0], [0.95, -0.6], [-0.95, -0.6]].forEach(([dz, dy]) => {
          const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.05, 1.6, 28, 1, true), new THREE.MeshStandardMaterial({ color: 0x5d5a86, roughness: 0.3, metalness: 0.8, side: THREE.DoubleSide }));
          noz.rotation.z = -Math.PI / 2;
          noz.position.set(TAIL + 0.8, HULL.cy + dy, HULL.z + dz * 1.3);
          ship3d.add(noz);
          const glow = new THREE.Mesh(new THREE.CircleGeometry(0.72, 24), new THREE.MeshBasicMaterial({ color: 0x3a2a4a }));
          glow.rotation.y = Math.PI / 2; glow.position.set(TAIL + 0.3, HULL.cy + dy, HULL.z + dz * 1.3);
          ship3d.add(glow);
        });
        // крылья и киль (оранжевые, как на нашем корабле)
        const finMat = new THREE.MeshStandardMaterial({ map: tex(A + 'tex-hull-smooth.jpg', 0.25, 0.25), color: 0xffa04a, roughness: 0.5, metalness: 0.1 });
        function wing(side) {
          const sh = new THREE.Shape();
          sh.moveTo(19, 0); sh.lineTo(30.5, 0); sh.lineTo(32.2, 5.6); sh.lineTo(28.6, 6.0); sh.closePath();
          const g = new THREE.ExtrudeGeometry(sh, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 2 });
          g.rotateX(Math.PI / 2);
          const m = new THREE.Mesh(g, finMat);
          m.scale.z = side;
          m.position.set(0, HULL.cy - 0.9, HULL.z + side * (HULL.R - 0.4));
          m.rotation.x = side * 0.12;
          ship3d.add(m);
        }
        wing(1); wing(-1);
        const fin = new THREE.Shape();
        fin.moveTo(26, 0); fin.lineTo(32.6, 0); fin.lineTo(33.4, 3.4); fin.lineTo(31.2, 3.4); fin.closePath();
        const finG = new THREE.ExtrudeGeometry(fin, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2 });
        const finM = new THREE.Mesh(finG, finMat);
        finM.position.set(0, HULL.cy + HULL.R - 0.5, HULL.z - 0.1);
        ship3d.add(finM);
        // антенна и трап
        const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.0, 8), metal);
        ant.position.set(13, HULL.cy + HULL.R + 1.1, HULL.z - 0.6); ant.rotation.z = 0.55;
        ship3d.add(ant);
        const ramp = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 1.8), new THREE.MeshStandardMaterial({ map: tex(A + 'tex-ship-floor.jpg', 1, 1) }));
        ramp.position.set(HATCH.x, 0.25, HATCH.z + 1.3); ramp.rotation.x = 0.12;
        scene.add(ramp);

        /* ---------- арочные двери ---------- */
        const DW = 1.6, DH = 2.35; // ширина и высота проёма
        function archPath(path, w, hgt, y0) {
          const r = w / 2;
          path.moveTo(-r, y0); path.lineTo(r, y0); path.lineTo(r, y0 + hgt - r);
          path.absarc(0, y0 + hgt - r, r, 0, Math.PI, false);
          path.lineTo(-r, y0);
          return path;
        }
        function normUV(geo) {
          geo.computeBoundingBox();
          const b = geo.boundingBox, p = geo.attributes.position, uv = geo.attributes.uv;
          for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - b.min.x) / (b.max.x - b.min.x), (p.getY(i) - b.min.y) / (b.max.y - b.min.y));
          return geo;
        }
        const frameMat = new THREE.MeshStandardMaterial({ color: 0xffa24a, emissive: 0x5a2400, roughness: 0.4, metalness: 0.3 });
        function archFrame(w, hgt) {
          const r = w / 2 + 0.06, V = (x, y) => new THREE.Vector3(x, y, 0), pts = [];
          for (let i = 0; i <= 6; i++) pts.push(V(-r, (hgt - r) * i / 6));
          for (let i = 1; i < 24; i++) { const a = Math.PI - Math.PI * i / 24; pts.push(V(Math.cos(a) * r, hgt - r + Math.sin(a) * r)); }
          for (let i = 0; i <= 6; i++) pts.push(V(r, (hgt - r) * (1 - i / 6)));
          return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), 90, 0.09, 8, false), frameMat);
        }
        // панель двери: начало координат — вверху проёма, чтобы створка «сворачивалась» вверх
        function doorPanel(locked) {
          const g = normUV(new THREE.ShapeGeometry(archPath(new THREE.Shape(), DW, DH, 0), 24));
          g.translate(0, -DH, 0);
          const pm = new THREE.MeshStandardMaterial({ map: tex(A + 'tex-ship-door.jpg'), side: THREE.DoubleSide, roughness: 0.55 });
          if (locked) { pm.color = new THREE.Color(0xffa0a8); pm.emissive = new THREE.Color(0x661020); }
          return new THREE.Mesh(g, pm);
        }
        const DOORS = [];
        function bulkhead(x, locked) {
          const r = hullR(x) - 0.2;
          const sh = new THREE.Shape();
          sh.absarc(0, 0, r, 0, Math.PI * 2, false);
          sh.holes.push(archPath(new THREE.Path(), DW, DH, HULL.floor - HULL.cy));
          const wall = new THREE.Mesh(new THREE.ShapeGeometry(sh, 40), new THREE.MeshStandardMaterial({ map: tex(A + 'tex-ship-wall.jpg', 0.3, 0.3), side: THREE.DoubleSide, roughness: 0.8 }));
          wall.rotation.y = Math.PI / 2;
          wall.position.set(x, HULL.cy, HULL.z);
          scene.add(wall);
          const frame = archFrame(DW, DH);
          frame.rotation.y = Math.PI / 2; frame.position.set(x, HULL.floor, HULL.z);
          scene.add(frame);
          const panel = doorPanel(locked);
          panel.rotation.y = Math.PI / 2;
          panel.position.set(x + 0.03, HULL.floor + DH, HULL.z);
          scene.add(panel);
          DOORS.push({ type: locked ? 'lock' : 'door', x, z: HULL.z, panel, open: false, k: 0 });
        }
        BULK.forEach(x => bulkhead(x, x === 28));
        // люк: пластина с арочным проёмом поверх выреза в обшивке, рамка и створка
        const plate = new THREE.Shape();
        plate.moveTo(-1.25, -0.15); plate.lineTo(1.25, -0.15); plate.lineTo(1.25, 1.4); plate.absarc(0, 1.4, 1.25, 0, Math.PI, false); plate.lineTo(-1.25, -0.15);
        plate.holes.push(archPath(new THREE.Path(), DW, DH, 0));
        const plateM = new THREE.Mesh(normUV(new THREE.ShapeGeometry(plate, 24)), new THREE.MeshStandardMaterial({ color: 0xe6e1f5, side: THREE.DoubleSide, roughness: 0.4, metalness: 0.2 }));
        plateM.position.set(HATCH.x, HULL.floor, HATCH.z + 0.28);
        scene.add(plateM);
        const hFrame = archFrame(DW, DH);
        hFrame.position.set(HATCH.x, HULL.floor, HATCH.z + 0.32);
        scene.add(hFrame);
        const hatchPanel = doorPanel(false);
        hatchPanel.position.set(HATCH.x, HULL.floor + DH, HATCH.z + 0.24);
        scene.add(hatchPanel);
        const hatchDoor = { type: 'hatch', x: HATCH.x, z: HATCH.z + 0.6, panel: hatchPanel, open: false, k: 0 };
        DOORS.push(hatchDoor);
        // свет в отсеках
        [[11.5, 0xffc48a], [19, 0xffb070], [25, 0x9fd8ff], [30, 0xff9a6a]].forEach(([x, c]) => {
          const pl = new THREE.PointLight(c, 14, 10, 1.6);
          pl.position.set(x, HULL.cy + 1.8, HULL.z);
          scene.add(pl);
        });
        // крылья мешают пройти — добавляем их в препятствия
        [[24, 5.6], [28, 7], [24, -5.6], [28, -7]].forEach(([x, dz]) => obstacles.push({ x, z: HULL.z + dz, r: 2.0 }));

        /* ---------- предметы, записи, ящики (картинки из Higgsfield) ---------- */
        const glowTex = (() => {
          const c = document.createElement('canvas'); c.width = c.height = 64;
          const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 32);
          gr.addColorStop(0, 'rgba(255,214,102,0.9)'); gr.addColorStop(1, 'rgba(255,214,102,0)');
          g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
          const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
        })();
        const PICKS = [];
        function pickable(kind, id, img, x, z, s = 0.75) {
          const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(A + img + '.png') }));
          spr.scale.set(s, s, 1);
          const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
          glow.scale.set(s * 2, s * 2, 1);
          scene.add(glow); scene.add(spr);
          PICKS.push({ kind, id, x, z, spr, glow, gone: false, ph: rnd() * 6 });
        }
        pickable('log', 0, 'item-logbook', 10.2, HULL.z - 1.2);
        pickable('item', 'battery', 'item-battery', 13.2, HULL.z + 1.0);
        pickable('log', 1, 'item-logbook', 17.4, HULL.z - 1.6);
        pickable('item', 'toolkit', 'item-toolkit', 24.0, HULL.z - 1.4, 0.85);
        pickable('item', 'cables', 'item-cables', 26.6, HULL.z + 1.3);
        pickable('log', 2, 'item-logbook', 27.2, HULL.z - 1.8);
        pickable('item', 'fuel', 'item-fuel', 30.3, HULL.z, 0.85);
        function deco(img, x, y, z, s) {
          const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(A + img + '.png') }));
          spr.scale.set(s, s, 1); spr.position.set(x, y + s * 0.45, z); scene.add(spr);
        }
        deco('obj-crate', 21.0, HULL.floor, HULL.z - 2.0, 1.2);
        deco('obj-crate', 9.2, HULL.floor, HULL.z + 1.8, 1.0);
        deco('obj-crate', HATCH.x + 3.2, groundH(HATCH.x + 3.2, HATCH.z + 2.5), HATCH.z + 2.5, 1.3);
        deco('obj-crate', OS.x + 4, groundH(OS.x + 4, OS.z - 2), OS.z - 2, 1.2);

        /* ---------- игрок ---------- */
        const P = { x: OS.x + 6, z: OS.z - 3, yaw: Math.atan2(-(HATCH.x - (OS.x + 6)), -(HATCH.z - (OS.z - 3))) + 0.6, pitch: -0.05 };
        const inHull = (x, z) => x > HULL.x0 + 0.5 && x < HULL.x1 - 0.5 && Math.abs(z - HULL.z) < 2.6;
        function free(x, z) {
          const dz = Math.abs(z - HULL.z);
          const hr = x > TAIL ? (x < TAIL + 1.8 ? 2.6 : 0) : hullR(Math.max(x, NOSE));
          if (x > NOSE - 0.4 && x < TAIL + 1.8 && dz < hr + 0.4) {
            if (inHull(x, z)) {
              for (const d of DOORS) {
                if (d.type === 'hatch') continue;
                if (Math.abs(x - d.x) < 0.35 && (!d.open || dz > 0.7)) return false;
              }
              return true;
            }
            // проём люка
            return hatchDoor.open && z > HULL.z && x > HATCH.x - 0.85 && x < HATCH.x + 0.85;
          }
          if (Math.hypot(x, z) > 50) return false;
          for (const o of obstacles) if (Math.hypot(o.x - x, o.z - z) < o.r + 0.3) return false;
          return true;
        }

        /* ---------- управление ---------- */
        const keys = {};
        const kd = e => {
          if (self.paused) return;
          const k = e.key.toLowerCase();
          if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
          keys[k] = true;
          if (k === 'e' || k === 'у' || k === 'enter' || k === ' ') act();
        };
        const ku = e => { keys[e.key.toLowerCase()] = false; };
        window.addEventListener('keydown', kd);
        window.addEventListener('keyup', ku);
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
        const endDrag = () => { drag = null; };
        cv.addEventListener('pointerup', endDrag);
        cv.addEventListener('pointercancel', endDrag);

        const joy = { x: 0, y: 0, id: null };
        const zone = el.querySelector('.joy');
        if (zone) {
          const base = zone.querySelector('.joy-base'), knob = zone.querySelector('.joy-knob');
          let cx = 0, cy = 0, R = 50;
          const moveKnob = (dx, dy) => { knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`; };
          const setFrom = e => {
            let dx = e.clientX - cx, dy = e.clientY - cy;
            const len = Math.hypot(dx, dy);
            if (len > R) { dx = dx / len * R; dy = dy / len * R; }
            moveKnob(dx, dy); joy.x = dx / R; joy.y = dy / R;
          };
          zone.addEventListener('pointerdown', e => {
            e.preventDefault();
            if (joy.id !== null) return;
            joy.id = e.pointerId;
            try { zone.setPointerCapture(e.pointerId); } catch (err) {}
            const zr = zone.getBoundingClientRect(), br = base.getBoundingClientRect();
            R = br.width * 0.38;
            const half = br.width / 2;
            cx = clamp(e.clientX, zr.left + half, zr.right - half);
            cy = clamp(e.clientY, zr.top + half, zr.bottom - half);
            base.style.left = (cx - zr.left) + 'px'; base.style.top = (cy - zr.top) + 'px';
            zone.classList.add('active');
            setFrom(e);
          });
          zone.addEventListener('pointermove', e => { if (e.pointerId === joy.id) setFrom(e); });
          const release = e => {
            if (e.pointerId !== joy.id) return;
            joy.id = null; joy.x = 0; joy.y = 0; moveKnob(0, 0);
            base.style.left = '50%'; base.style.top = '50%';
            zone.classList.remove('active');
          };
          zone.addEventListener('pointerup', release);
          zone.addEventListener('pointercancel', release);
          zone.addEventListener('contextmenu', e => e.preventDefault());
        }
        const actBtn = el.querySelector('.fp-act');
        if (actBtn) actBtn.addEventListener('click', () => act());

        /* ---------- цели, фокус, действия ---------- */
        const fwd = () => ({ x: -Math.sin(P.yaw), z: -Math.cos(P.yaw) });
        const right = () => ({ x: Math.cos(P.yaw), z: -Math.sin(P.yaw) });
        const relAngle = (tx, tz) => {
          const dx = tx - P.x, dz = tz - P.z, f = fwd(), r = right();
          return Math.atan2(dx * r.x + dz * r.z, dx * f.x + dz * f.z);
        };
        const lockDoor = DOORS.find(d => d.type === 'lock');
        function target() {
          if (!S.hatchSeen) return { x: HATCH.x, z: HATCH.z + 1, text: L('Дойди до заброшенного корабля и открой люк', 'Reach the abandoned ship and open the hatch') };
          const left = PICKS.filter(p => !p.gone && p.id !== 'fuel');
          if (left.length) {
            const n = left.reduce((b, p) => (!b || Math.hypot(p.x - P.x, p.z - P.z) < Math.hypot(b.x - P.x, b.z - P.z) ? p : b), null);
            return { x: n.x, z: n.z, text: L('Найди аккумулятор, кабели, инструменты и 3 записи экипажа', 'Find the battery, cables, toolkit and 3 crew logs') };
          }
          if (!S.lockOpen) return { x: lockDoor.x - 0.8, z: lockDoor.z, text: L('Открой двигательный отсек: введи код из записей', 'Open the engine room: enter the code from the logs') };
          if (!S.inv.fuel) return { x: 30.3, z: HULL.z, text: L('Забери топливный модуль', 'Take the fuel module') };
          return { x: OS.x, z: OS.z, text: L('Вернись к своему кораблю и почини его', 'Go back to your ship and repair it') };
        }
        function focus() {
          let best = null;
          const consider = (o, reach) => {
            const d = Math.hypot(o.x - P.x, o.z - P.z);
            if (d > reach) return;
            if (Math.abs(relAngle(o.x, o.z)) > 0.5) return;
            if (!best || d < best.d) best = { o, d };
          };
          PICKS.forEach(p => { if (!p.gone) consider(p, 2.1); });
          DOORS.forEach(d => { if (!d.open) consider(d, d.type === 'hatch' ? 3.2 : 2.3); });
          consider({ type: 'ship', x: OS.x, z: OS.z }, 7);
          return best && best.o;
        }
        function promptText(f) {
          if (!f) return '';
          const key = touch ? '' : '<span class="kbd">E</span> ';
          if (f.kind === 'item') return key + L('Взять: ', 'Take: ') + esc(ITEM[f.id].name);
          if (f.kind === 'log') return key + L('Прочитать запись экипажа', 'Read the crew log');
          if (f.type === 'hatch') return key + L('Открыть люк', 'Open the hatch');
          if (f.type === 'door') return key + L('Открыть дверь', 'Open the door');
          if (f.type === 'lock') return key + (S.lockOpen ? L('Открыть дверь', 'Open the door') : L('Кодовый замок', 'Code lock'));
          if (f.type === 'ship') return key + L('Твой корабль «Звёздный вихрь»: ремонт', 'Your ship “Star Whirl”: repair');
          return '';
        }
        function act() {
          if (self.paused || failed) return;
          const f = focus();
          if (!f) return;
          if (f.kind === 'item') {
            f.gone = true; f.spr.visible = false; f.glow.visible = false;
            S.inv[f.id] = true; sfx.ok(); renderInv();
            if (f.id === 'fuel') {
              ctx.step(4, true);
              ctx.mc(L('Топливный модуль у тебя! Все детали собраны. Возвращайся к «Звёздному вихрю» — стрелка покажет дорогу.',
                       'You have the fuel module! All the parts are collected. Head back to the “Star Whirl” — the arrow shows the way.'), 'good');
            } else ctx.mc(L(`Найдено: <b>${esc(ITEM[f.id].name)}</b>.`, `Found: <b>${esc(ITEM[f.id].name)}</b>.`), 'good');
            return;
          }
          if (f.kind === 'log') { f.gone = true; f.spr.visible = false; f.glow.visible = false; S.logs[f.id] = true; sfx.radio(); renderInv(); readLog(f.id); return; }
          if (f.type === 'hatch' || f.type === 'door') {
            f.open = true; sfx.click();
            if (f.type === 'hatch' && !S.hatchSeen) { S.hatchSeen = true; foundShip(); }
            return;
          }
          if (f.type === 'lock') {
            if (S.lockOpen) { f.open = true; sfx.click(); return; }
            const n = S.logs.filter(Boolean).length;
            if (n < 3) {
              sfx.bad();
              ctx.mc(L(`Дверь заперта на кодовый замок. Капитан оставил подсказки в записях. Найдено записей: <b>${n} из 3</b>.`,
                       `The door has a code lock. The captain left clues in the logs. Logs found: <b>${n} of 3</b>.`), 'bad');
            } else decode(() => { f.open = true; f.panel.material.emissive.setHex(0x000000); f.panel.material.color.setHex(0xffffff); });
            return;
          }
          if (f.type === 'ship') {
            const missing = Object.keys(ITEM).filter(k => !S.inv[k]);
            if (missing.length) {
              sfx.bad();
              ctx.mc(L(`Для ремонта не хватает: <b>${missing.map(k => esc(ITEM[k].name)).join(', ')}</b>.`,
                       `Still missing for the repair: <b>${missing.map(k => esc(ITEM[k].name)).join(', ')}</b>.`), 'bad');
            } else { sfx.ok(); stop(); repair(); }
          }
        }

        /* ---------- цикл ---------- */
        let last = performance.now(), t = 0;
        function loop(now) {
          if (!running) return;
          const dt = Math.min(0.05, (now - last) / 1000);
          last = now; t += dt;
          if (!self.paused) update(dt);
          animate(dt);
          renderer.render(scene, camera);
          drawMap();
          ctx.frame(loop);
        }
        ctx.frame(loop);

        function update(dt) {
          const fw = (keys.w || keys.arrowup || keys['ц'] ? 1 : 0) - (keys.s || keys.arrowdown || keys['ы'] ? 1 : 0) - joy.y;
          const st = (keys.d || keys['в'] ? 1 : 0) - (keys.a || keys['ф'] ? 1 : 0);
          const turn = (keys.arrowright ? 1 : 0) - (keys.arrowleft ? 1 : 0) + (keys.q || keys['й'] ? -1 : 0) + joy.x * 0.9;
          P.yaw -= turn * 2.0 * dt;
          const inside = inHull(P.x, P.z);
          const speed = (inside ? 3.0 : 5.2) * dt;
          const f = fwd(), r = right();
          const mx = (f.x * clamp(fw, -1, 1) + r.x * st) * speed, mz = (f.z * clamp(fw, -1, 1) + r.z * st) * speed;
          if (free(P.x + mx, P.z)) P.x += mx;
          if (free(P.x, P.z + mz)) P.z += mz;
          const groundY = inHull(P.x, P.z) || (Math.abs(P.z - HULL.z) < 4 && P.x > HULL.x0 && P.x < HULL.x1) ? HULL.floor : groundH(P.x, P.z);
          camera.position.set(P.x, groundY + 1.6 + (fw || st ? Math.sin(t * 9) * 0.035 : 0), P.z);
          camera.rotation.set(P.pitch, P.yaw, 0);

          // кислород: снаружи тратится, в кораблях и рядом со своим — пополняется
          const refill = inside || Math.hypot(P.x - OS.x, P.z - OS.z) < 7;
          S.o2 = clamp(S.o2 + (refill ? 6 : -0.42) * dt, 0, 100);
          S.minO2 = Math.min(S.minO2, S.o2);
          renderO2();
          if (S.o2 < 30 && !o2Warned) {
            o2Warned = true;
            ctx.mc(L('<b>Кислорода в скафандре меньше 30%!</b> Зайди в корабль — там баллоны пополнят запас.', '<b>Suit oxygen below 30%!</b> Get inside a ship — the tanks will refill it.'), 'alarm');
          }
          if (S.o2 > 60) o2Warned = false;
          if (S.o2 <= 0 && !failed) {
            failed = true; stop();
            ctx.fail(L('Кислород в скафандре закончился, и ЦУП остановил тренировку.', 'The suit ran out of oxygen, and Mission Control stopped the training.'),
                     L('Снаружи кислород тратится. Не задерживайся на поверхности: внутри кораблей баллоны пополняют запас.', 'Oxygen runs out outside. Don’t linger on the surface: inside the ships the tanks refill it.'));
            return;
          }
          const fo = focus(), txt = promptText(fo);
          promptEl.hidden = !txt;
          if (txt) promptEl.innerHTML = txt;
          const tg = target();
          goalEl.textContent = tg.text;
          arrowEl.style.transform = `rotate(${relAngle(tg.x, tg.z) * 180 / Math.PI}deg)`;
          distEl.textContent = Math.round(Math.hypot(tg.x - P.x, tg.z - P.z)) + L(' м', ' m');
        }

        function animate(dt) {
          // предметы покачиваются и светятся
          PICKS.forEach(p => {
            if (p.gone) return;
            const y = HULL.floor + 0.55 + Math.sin(t * 2.6 + p.ph) * 0.07;
            p.spr.position.set(p.x, y, p.z);
            p.glow.position.set(p.x, y, p.z);
            p.glow.material.opacity = 0.45 + 0.25 * Math.sin(t * 4 + p.ph);
          });
          // двери: створка плавно уезжает вверх
          DOORS.forEach(d => {
            const goal = d.open ? 1 : 0;
            d.k += (goal - d.k) * Math.min(1, dt * 5);
            // створка «сворачивается» вверх: её начало координат — верх проёма
            d.panel.scale.y = Math.max(0.02, 1 - d.k);
            d.panel.visible = d.k < 0.97;
          });
        }

        function drawMap() {
          const mw = mapCv.width, mh = mapCv.height, sc = 0.95, ox = mw / 2, oy = mh / 2;
          const X = x => ox + x * sc, Y = z => oy + z * sc;
          mg.clearRect(0, 0, mw, mh);
          mg.fillStyle = '#c86d43'; mg.fillRect(0, 0, mw, mh);
          mg.fillStyle = '#e39a66'; mg.beginPath(); mg.arc(ox, oy, 50 * sc, 0, 7); mg.fill();
          mg.fillStyle = '#8a4430';
          obstacles.forEach(o => { mg.beginPath(); mg.arc(X(o.x), Y(o.z), Math.max(1.2, o.r * sc), 0, 7); mg.fill(); });
          mg.fillStyle = '#e8e6ff'; mg.fillRect(X(HULL.x0), Y(HULL.z - 3.6), (HULL.x1 - HULL.x0) * sc, 7.2 * sc);
          mg.fillStyle = '#ffffff'; mg.beginPath(); mg.arc(X(OS.x), Y(OS.z), 3, 0, 7); mg.fill();
          if (S.hatchSeen) PICKS.forEach(p => { if (!p.gone) { mg.fillStyle = '#5fd8ff'; mg.fillRect(X(p.x) - 1.5, Y(p.z) - 1.5, 3, 3); } });
          const f = fwd();
          mg.save(); mg.translate(X(P.x), Y(P.z)); mg.rotate(Math.atan2(f.z, f.x));
          mg.fillStyle = '#ffb547'; mg.beginPath(); mg.moveTo(6, 0); mg.lineTo(-4, -4); mg.lineTo(-4, 4); mg.closePath(); mg.fill();
          mg.restore();
        }
      }

      return self;
    }

    /* --- нашли заброшенный корабль --- */
    function foundShip() {
      ctx.step(2, true);
      openModal(`
        <div class="scene" style="background-image:url('${A}mars-abandoned.jpg')"></div>
        <h2>${L('Корабль экспедиции «Заря-7»', 'The “Dawn-7” expedition ship')}</h2>
        <p>${L('Люк открыт. Внутри темно и тихо, повсюду красная пыль. Кажется, здесь давно никого нет. Обыщи отсеки: нужны <b>аккумулятор, кабели и инструменты</b>. И почитай <b>записи экипажа</b> — в них может быть что-то важное.',
               'The hatch is open. It’s dark and quiet inside, with red dust everywhere. No one has been here for a long time. Search the modules: you need the <b>battery, cables and toolkit</b>. And read the <b>crew logs</b> — they may hold something important.')}</p>
        <div class="actions"><button class="btn orange big">${L('Войти внутрь →', 'Go inside →')}</button></div>`, m => {
        m.querySelector('button').onclick = () => { sfx.click(); closeModal(); };
      });
      ctx.mc(L('Внутри баллоны ещё работают — скафандр будет пополнять кислород.', 'The oxygen tanks still work inside — your suit will refill.'), 'good');
    }

    /* --- запись экипажа --- */
    function readLog(i) {
      const n = S.logs.filter(Boolean).length;
      openModal(`
        <div class="log-head">
          <img src="${A}ui-old-crew.jpg" alt="">
          <div><div class="eyebrow">${L('Запись экипажа', 'Crew log')} ${i + 1} / 3</div><h2>${L('Капитан Арман', 'Captain Arman')}</h2></div>
        </div>
        <div class="screen log-text">${LOGS[i]}</div>
        <p class="small muted">${L(`Найдено записей: ${n} из 3. Запомни ответы на загадки — это код от двигательного отсека.`, `Logs found: ${n} of 3. Remember the answers to the riddles — they’re the engine room code.`)}</p>
        <div class="actions"><button class="btn orange big">${L('Закрыть', 'Close')}</button></div>`, m => {
        m.querySelector('button').onclick = () => { sfx.click(); closeModal(); };
      });
    }

    /* =================================================================
       3. РАСШИФРОВКА: кодовый замок
       ================================================================= */
    function decode(onOpen) {
      ctx.step(3, true);
      let entry = '';
      const m = openModal(`
        <div class="task-title"><span class="num">3</span><h2>${L('Кодовый замок двигательного отсека', 'Engine room code lock')}</h2></div>
        <p>${L('Капитан разделил код на три загадки. Ответ на каждую — одна цифра.', 'The captain split the code into three riddles. Each answer is one digit.')}</p>
        <div class="log-list">${LOGS.map((t, i) => `<details ${i === 0 ? 'open' : ''}><summary>${L('Запись', 'Log')} ${i + 1}</summary><div class="screen log-text">${t}</div></details>`).join('')}</div>
        <div class="keypad-wrap">
          <div class="code-view">${[0, 1, 2].map(() => '<span></span>').join('')}</div>
          <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<button data-d="${d}">${d}</button>`).join('')}<button data-d="del">⌫</button><button data-d="0">0</button><button data-d="ok" class="ok">OK</button></div>
        </div>
        <div class="fb"></div>
        <div class="actions"><button class="btn ghost" data-act="close">${L('Отойти от замка', 'Step away')}</button></div>`);
      const view = [...m.querySelectorAll('.code-view span')], fb = m.querySelector('.fb');
      const show = () => view.forEach((s, i) => { s.textContent = entry[i] || ''; s.classList.toggle('fill', !!entry[i]); });
      m.querySelector('[data-act=close]').onclick = () => { sfx.click(); closeModal(); };
      m.querySelectorAll('.keypad button').forEach(b => b.onclick = () => {
        const d = b.dataset.d;
        if (d === 'del') { entry = entry.slice(0, -1); sfx.click(); show(); return; }
        if (d === 'ok') {
          if (entry.length < 3) { sfx.bad(); fb.innerHTML = `<div class="feedback no">${L('Нужно три цифры.', 'You need three digits.')}</div>`; return; }
          S.codeTries++;
          if (entry === CODE) {
            S.lockOpen = true; sfx.ok(); onOpen && onOpen();
            fb.innerHTML = `<div class="feedback ok">${L('Код верный: 2 спутника, 4-я планета, 8 планет. Замок открыт!', 'Correct: 2 moons, 4th planet, 8 planets. The lock is open!')}</div>`;
            ctx.mc(L('Двигательный отсек открыт! Забери <b>топливный модуль</b>.', 'The engine room is open! Take the <b>fuel module</b>.'), 'good');
            ctx.after(1400, closeModal);
          } else {
            sfx.bad(); entry = ''; show();
            fb.innerHTML = `<div class="feedback no">${L('Код неверный. Подсказки: спутники Марса — Фобос и Деймос. Порядок планет: Меркурий, Венера, Земля, Марс…',
                                                           'Wrong code. Hints: the moons of Mars are Phobos and Deimos. The order of planets: Mercury, Venus, Earth, Mars…')}</div>`;
          }
          return;
        }
        if (entry.length < 3) { entry += d; sfx.click(); show(); }
      });
      show();
    }

    /* =================================================================
       4. РЕМОНТ (у своего корабля)
       ================================================================= */
    function repair() {
      ctx.step(4);
      ctx.mc(L('Ты у «Звёздного вихря». Установи детали: подключи аккумулятор, закрепи крышку и заправь топливо.', 'You’re at the “Star Whirl”. Install the parts: connect the battery, secure the cover and refuel.'));
      const el = h(`
        <div class="panel card repair">
          <div class="task-title"><span class="num">4</span><h2>${L('Ремонт корабля', 'Repairing the ship')}</h2></div>
          <div class="repair-step" data-s="1">
            <h3><img class="ico mini" src="${A}item-cables.png" alt=""> ${L('Подключи аккумулятор: соедини провода по цветам', 'Connect the battery: match the wires by colour')}</h3>
            <p class="small muted">${L('Нажми на штекер слева, а потом на гнездо такого же цвета справа.', 'Tap a plug on the left, then the socket of the same colour on the right.')}</p>
            <div class="wires"><div class="col plugs"></div><svg class="wire-lines"></svg><div class="col sockets"></div></div>
          </div>
          <div class="repair-step" data-s="2" hidden>
            <h3><img class="ico mini" src="${A}item-toolkit.png" alt=""> ${L('Закрепи крышку аккумулятора: затяни болты крест-накрест', 'Secure the battery cover: tighten the bolts in a cross pattern')}</h3>
            <p class="small muted">${L('Начни с любого болта. Следующим всегда затягивай болт по диагонали напротив.', 'Start with any bolt. Always tighten the bolt diagonally opposite next.')}</p>
            <div class="bolts"><img class="cover" src="${A}item-battery.png" alt="">${[0, 1, 2, 3].map(i => `<button class="bolt b${i}" data-b="${i}"></button>`).join('')}</div>
          </div>
          <div class="repair-step" data-s="3" hidden>
            <h3><img class="ico mini" src="${A}item-fuel.png" alt=""> ${L('Заправь корабль', 'Refuel the ship')}</h3>
            <p class="small muted">${L('Для взлёта с Марса нужно от <b>70 до 85%</b> топлива. Меньше — не хватит, чтобы выйти на орбиту. Больше — бак перегреется от давления.', 'To lift off from Mars you need <b>70 to 85%</b> fuel. Less isn’t enough to reach orbit. More and the tank overheats from the pressure.')}</p>
            <div class="fuel">
              <div class="tank"><i class="lvl"></i><span class="band"></span></div>
              <div class="fuel-ctrl"><div class="out-big pct">0%</div><input type="range" min="0" max="100" value="0" class="rng" aria-label="${L('Уровень топлива', 'Fuel level')}"><button class="btn orange big go">${L('Заправить', 'Refuel')}</button></div>
            </div>
          </div>
          <div class="fb"></div>
        </div>`);
      ctx.stage.appendChild(el);
      const fb = el.querySelector('.fb');
      const show = n => el.querySelectorAll('.repair-step').forEach(s => { s.hidden = +s.dataset.s !== n; });

      /* провода */
      const WIRES = [
        { k: 'o', color: '#ff9a3c', name: L('Двигатель', 'Engine') },
        { k: 'b', color: '#4b63e6', name: L('Навигация', 'Navigation') },
        { k: 'c', color: '#5fd8ff', name: L('Связь', 'Comms') },
        { k: 'v', color: '#8a7ff0', name: L('Жизнеобеспечение', 'Life support') }
      ];
      const plugs = el.querySelector('.plugs'), socks = el.querySelector('.sockets'), svg = el.querySelector('.wire-lines'), wiresBox = el.querySelector('.wires');
      WIRES.forEach(w => plugs.appendChild(h(`<button class="plug" data-k="${w.k}"><i style="background:${w.color}"></i>${esc(w.name)}</button>`)));
      shuffle(WIRES).forEach(w => socks.appendChild(h(`<button class="sock" data-k="${w.k}"><i style="background:${w.color}"></i></button>`)));
      let pick = null, joined = 0;
      plugs.querySelectorAll('.plug').forEach(b => b.onclick = () => {
        if (b.classList.contains('done')) return;
        sfx.click(); pick = b;
        plugs.querySelectorAll('.plug').forEach(x => x.classList.toggle('sel', x === b));
      });
      socks.querySelectorAll('.sock').forEach(b => b.onclick = () => {
        if (!pick || b.classList.contains('done')) return;
        if (b.dataset.k !== pick.dataset.k) {
          S.repairMistakes++; sfx.bad(); b.classList.remove('wrong'); void b.offsetWidth; b.classList.add('wrong');
          fb.innerHTML = `<div class="feedback no">${L('Цвета не совпадают — так можно устроить короткое замыкание!', 'The colours don’t match — that could cause a short circuit!')}</div>`;
          return;
        }
        sfx.ok(); fb.innerHTML = '';
        pick.classList.add('done'); pick.classList.remove('sel'); b.classList.add('done');
        const r0 = wiresBox.getBoundingClientRect(), a = pick.querySelector('i').getBoundingClientRect(), z = b.querySelector('i').getBoundingClientRect();
        const color = WIRES.find(w => w.k === b.dataset.k).color;
        svg.insertAdjacentHTML('beforeend', `<line x1="${a.left + a.width / 2 - r0.left}" y1="${a.top + a.height / 2 - r0.top}" x2="${z.left + z.width / 2 - r0.left}" y2="${z.top + z.height / 2 - r0.top}" stroke="${color}" stroke-width="5" stroke-linecap="round"/>`);
        pick = null; joined++;
        if (joined === WIRES.length) ctx.after(700, () => { show(2); ctx.mc(L('Аккумулятор подключён! Теперь закрепи крышку.', 'Battery connected! Now secure the cover.'), 'good'); });
      });

      /* болты крест-накрест: 0 ↖, 1 ↗, 2 ↙, 3 ↘ */
      const OPP = { 0: 3, 3: 0, 1: 2, 2: 1 };
      const done = [];
      el.querySelectorAll('.bolt').forEach(b => b.onclick = () => {
        const i = +b.dataset.b;
        if (done.includes(i)) return;
        const lastB = done[done.length - 1];
        const needOpp = done.length % 2 === 1;
        if (needOpp && i !== OPP[lastB]) {
          S.repairMistakes++; sfx.bad();
          fb.innerHTML = `<div class="feedback no">${L('Не тот болт! После этого болта затягивают тот, что по диагонали напротив, — иначе крышку перекосит.', 'Wrong bolt! Next you tighten the one diagonally opposite — otherwise the cover tilts.')}</div>`;
          return;
        }
        sfx.ok(); fb.innerHTML = '';
        done.push(i); b.classList.add('tight'); b.textContent = done.length;
        if (done.length === 4) ctx.after(700, () => { show(3); ctx.mc(L('Крышка закреплена. Осталось заправиться.', 'The cover is secured. Now refuel.'), 'good'); });
      });

      /* топливо */
      const rng = el.querySelector('.rng'), lvl = el.querySelector('.lvl'), pct = el.querySelector('.pct');
      const renderFuel = () => {
        const v = +rng.value;
        lvl.style.height = v + '%'; pct.textContent = v + '%';
        pct.style.color = v >= 70 && v <= 85 ? 'var(--good)' : v > 85 ? 'var(--bad)' : 'var(--orange-2)';
      };
      rng.oninput = renderFuel; renderFuel();
      el.querySelector('.go').onclick = () => {
        const v = +rng.value;
        if (v < 70) { S.repairMistakes++; sfx.bad(); fb.innerHTML = `<div class="feedback no">${L(`${v}% мало: корабль не наберёт скорость 5 км/с, чтобы выйти на орбиту.`, `${v}% is too little: the ship won’t reach the 5 km/s needed for orbit.`)}</div>`; return; }
        if (v > 85) { S.repairMistakes++; sfx.bad(); fb.innerHTML = `<div class="feedback no">${L(`${v}% слишком много: давление в баке станет опасным.`, `${v}% is too much: the tank pressure would be dangerous.`)}</div>`; return; }
        sfx.ok();
        fb.innerHTML = `<div class="feedback ok">${L(`${v}% — отлично! Топлива хватит, чтобы улететь домой.`, `${v}% — perfect! There’s enough fuel to fly home.`)}</div>`;
        ctx.after(1200, launch);
      };
    }

    /* =================================================================
       5. ЗАПУСК
       ================================================================= */
    function launch() {
      ctx.step(5);
      ctx.mc(L('Корабль починен! Проведи предполётную проверку <b>в правильном порядке</b>.', 'The ship is repaired! Run the pre-flight check <b>in the right order</b>.'));
      const SEQ = [
        { text: L('Пристегнуть ремни безопасности', 'Fasten the safety belts') },
        { text: L('Закрыть люк и проверить герметичность', 'Close the hatch and check the seal') },
        { text: L('Проверить заряд аккумулятора и топливо', 'Check the battery charge and fuel') }
      ];
      const TRAP = { text: L('Сразу включить двигатель на полную мощность', 'Fire the engine at full power right away'),
        why: L('Сначала двигатель проверяют на малой тяге, иначе он может перегреться!', 'First the engine is tested at low thrust, otherwise it could overheat!') };
      const HINT = L('Сначала безопасность экипажа: ремни, потом люк, потом системы.', 'Crew safety first: belts, then the hatch, then the systems.');
      let pos = 0;
      const el = h(`
        <div class="panel card">
          <div class="task-title"><span class="num">5</span><h2>${L('Предполётная проверка', 'Pre-flight check')}</h2></div>
          <div class="seq"></div>
          <div class="engine-test" hidden>
            <h3>${L('Тест двигателя', 'Engine test')}</h3>
            <p class="small muted">${L('Зажми кнопку, чтобы набрать тягу, и отпусти в <b>зелёной зоне</b>.', 'Hold the button to build up thrust and release it in the <b>green zone</b>.')}</p>
            <div class="thrust"><i class="lvl"></i><span class="zone"></span></div>
            <button class="btn orange big hold">${L('Держать', 'Hold')}</button>
          </div>
          <div class="fb"></div>
        </div>`);
      ctx.stage.appendChild(el);
      const box = el.querySelector('.seq'), fb = el.querySelector('.fb');
      shuffle([...SEQ, TRAP]).forEach(a => {
        const b = h(`<button class="seq-btn"><span class="n"></span><span>${esc(a.text)}</span></button>`);
        b.onclick = () => {
          if (a === TRAP) { S.launchMistakes++; sfx.bad(); b.disabled = true; b.classList.add('wrong'); fb.innerHTML = `<div class="feedback no">${TRAP.why}</div>`; return; }
          if (SEQ[pos] !== a) { S.launchMistakes++; sfx.bad(); b.classList.remove('wrong'); void b.offsetWidth; b.classList.add('wrong'); fb.innerHTML = `<div class="feedback no">${L('Пока рано.', 'Not yet.')} ${HINT}</div>`; return; }
          sfx.ok(); pos++; b.classList.add('done'); b.disabled = true; b.querySelector('.n').textContent = pos; fb.innerHTML = '';
          if (pos === SEQ.length) { box.querySelectorAll('button').forEach(x => x.disabled = true); engineTest(); }
        };
        box.appendChild(b);
      });

      function engineTest() {
        const et = el.querySelector('.engine-test'); et.hidden = false;
        ctx.mc(L('Все системы готовы. Проверь двигатель на тестовой тяге.', 'All systems ready. Test the engine at trial thrust.'));
        const lvl = et.querySelector('.lvl'), btn = et.querySelector('.hold');
        let v = 0, holding = false, doneTest = false;
        ctx.every(30, () => {
          if (doneTest) return;
          v = holding ? Math.min(100, v + 1.6) : Math.max(0, v - 2.5);
          lvl.style.width = v + '%';
        });
        const down = e => { e.preventDefault(); if (!doneTest) { holding = true; sfx.click(); } };
        const up = () => {
          if (!holding || doneTest) return;
          holding = false;
          if (v >= 80 && v <= 95) {
            doneTest = true; sfx.ok();
            fb.innerHTML = `<div class="feedback ok">${L(`Тяга ${Math.round(v)}% — двигатель работает отлично!`, `Thrust ${Math.round(v)}% — the engine works perfectly!`)}</div>`;
            ctx.after(900, countdown);
          } else {
            S.launchMistakes++; sfx.bad();
            fb.innerHTML = `<div class="feedback no">${v < 80 ? L('Слишком слабая тяга. Держи дольше.', 'Thrust too weak. Hold longer.') : L('Перегрев! Отпускай раньше.', 'Overheating! Release earlier.')}</div>`;
          }
        };
        btn.addEventListener('pointerdown', down);
        btn.addEventListener('pointerup', up);
        btn.addEventListener('pointerleave', up);
        btn.addEventListener('pointercancel', up);
      }
    }

    function countdown() {
      const m = openModal(`
        <div class="scene launch" style="background-image:url('${A}mars-launch.jpg')"><div class="count">5</div></div>
        <h2>${L('Взлёт!', 'Lift-off!')}</h2>
        <p>${L('«Звёздный вихрь» покидает Марс. Курс — домой, на Землю.', 'The “Star Whirl” is leaving Mars. Course: home, to Earth.')}</p>`);
      const c = m.querySelector('.count'), scene = m.querySelector('.scene');
      let n = 5;
      sfx.alarm();
      const id = ctx.every(800, () => {
        n--;
        if (n > 0) { c.textContent = n; sfx.click(); return; }
        clearInterval(id);
        c.textContent = L('Пуск!', 'Go!');
        scene.classList.add('go');
        sfx.win();
        ctx.after(2600, () => { closeModal(); finish(); });
      });
    }

    function finish() {
      const mins = Math.round((performance.now() - S.t0) / 60000);
      let score = 3;
      const notes = [];
      notes.push({ ok: true, text: L(`Корабль починен и улетел с Марса. Время миссии: около ${mins} мин.`, `The ship was repaired and left Mars. Mission time: about ${mins} min.`) });
      if (S.codeTries <= 1) notes.push({ ok: true, text: L('Код от двигательного отсека разгадан с первой попытки.', 'You cracked the engine room code on the first try.') });
      else { score -= 0.5; notes.push({ ok: false, text: L(`Код подобран с ${S.codeTries}-й попытки. Перечитай факты о Марсе в «Что ты узнал».`, `The code took ${S.codeTries} tries. Reread the Mars facts in “What you learned”.`) }); }
      if (S.repairMistakes === 0) notes.push({ ok: true, text: L('Ремонт без единой ошибки.', 'Repair with no mistakes.') });
      else { score -= S.repairMistakes >= 3 ? 1 : 0.5; notes.push({ ok: false, text: L(`Ошибок при ремонте: ${S.repairMistakes}.`, `Repair mistakes: ${S.repairMistakes}.`) }); }
      if (S.launchMistakes) { score -= 0.5; notes.push({ ok: false, text: L(`Ошибок при подготовке к взлёту: ${S.launchMistakes}. Помни: безопасность экипажа — первой.`, `Pre-flight mistakes: ${S.launchMistakes}. Remember: crew safety comes first.`) }); }
      if (S.minO2 < 30) { score -= 0.5; notes.push({ ok: false, text: L(`Кислород в скафандре опускался до ${Math.round(S.minO2)}%. Не задерживайся снаружи.`, `Suit oxygen dropped to ${Math.round(S.minO2)}%. Don’t linger outside.`) }); }
      else notes.push({ ok: true, text: L(`Кислород под контролем: минимум ${Math.round(S.minO2)}%.`, `Oxygen under control: lowest ${Math.round(S.minO2)}%.`) });
      ctx.finish(score, notes);
    }
  }
});
