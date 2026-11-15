/* =====================================================================
   ASTRO — детальная 3D-модель робота-помощника (Three.js).
   Не из одних шаров и цилиндров: точёные профили (Lathe), пластины со
   скосами (Extrude), изогнутые по корпусу, визор-«сквиркл» на поверхности
   шлема со своей текстурой экрана, швы и рамки из трубок по кривым,
   ботинки из бокового профиля, пальцы из фаланг.
   Использование: AstroModel.build(THREE, { toon, add }) →
     { root, armL, armR, jet, eyes }
   Рост около 1,45 м, смотрит вперёд по +Z, ноги на y = 0.
   ===================================================================== */
window.AstroModel = {
  build(THREE, { toon, add }) {
    const root = new THREE.Group();
    const V2 = (x, y) => new THREE.Vector2(x, y);
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

    /* ---------- материалы ---------- */
    const white = toon(0xf7f8ff), white2 = toon(0xe4e6f6), org = toon(0xff8a2a), orgD = toon(0xd9611a);
    const cyan = toon(0x3fd6ea, { emissive: 0x0b6a80 }), grey = toon(0x4b4b5e), greyL = toon(0x6c6c82), navy = toon(0x23225a);
    const glowMat = c => new THREE.MeshBasicMaterial({ color: c });

    /* ---------- помощники для сложных форм ---------- */
    // точёная деталь по профилю [радиус, высота]
    const lathe = (pts, seg = 48, smooth = true) => {
      if (pts[0][1] > pts[pts.length - 1][1]) pts = pts.slice().reverse(); // профиль снизу вверх — иначе нормали смотрят внутрь
      const p = pts.map(([r, y]) => V2(Math.max(0.0005, r), y));
      return new THREE.LatheGeometry(smooth ? new THREE.SplineCurve(p).getPoints(pts.length * 8) : p, seg);
    };
    const roundRect = (w, h, r) => {
      const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
      s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
      s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
      s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
    };
    // пластина со скруглёнными углами и скосом по краю
    const plate = (w, h, r, d, bev) => {
      const g = new THREE.ExtrudeGeometry(roundRect(w, h, r), { depth: d, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 4, curveSegments: 10 });
      g.translate(0, 0, -d / 2); return g;
    };
    // изгибаем плоскую деталь по цилиндру радиуса R (передняя сторона — +Z)
    const wrapCyl = (geo, R) => {
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = x / R, r = R + z;
        p.setXYZ(i, Math.sin(a) * r, y, Math.cos(a) * r);
      }
      geo.computeVertexNormals(); return geo;
    };
    const tube = (pts, rad, mat, closed = false, seg = 64) =>
      new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, closed), seg, rad, 8, closed), mat);
    const canvasTex = (w, h, draw) => {
      const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    };

    /* =================================================================
       ШЛЕМ
       ================================================================= */
    const head = new THREE.Group(); head.position.y = 1.06; root.add(head);
    const HR = 0.36;
    // корпус шлема: чуть приплюснутая сфера, сзади — гребень
    const shellG = lathe([[0, -0.33], [0.2, -0.315], [0.31, -0.24], [0.36, -0.1], [0.365, 0.02], [0.35, 0.14], [0.3, 0.25], [0.2, 0.33], [0.0, 0.36]], 64);
    add(new THREE.Mesh(shellG, white), head, 0.022);
    // радиус шлема на высоте y (по профилю) — нужен, чтобы детали ложились на поверхность
    const shellR = y => { const t = Math.max(-1, Math.min(1, y / HR)); return Math.sqrt(1 - t * t) * HR * 1.01; };

    // параметризация «сквиркла» на поверхности шлема: px, py ∈ [-1, 1]
    const squircle = (s, t, n) => {
      const len = Math.hypot(s, t); if (len < 1e-6) return [0, 0];
      const dx = s / len, dy = t / len;
      const rq = 1 / Math.max(Math.abs(dx), Math.abs(dy));
      const rs = Math.pow(Math.pow(Math.abs(dx), n) + Math.pow(Math.abs(dy), n), -1 / n);
      return [s * rs / rq, t * rs / rq];
    };
    const VIS = { phi: Math.PI / 2, th: 1.4, hp: 0.82, ht: 0.56, n: 4.2 };
    const onSphere = (phi, th, r) => V3(-Math.cos(phi) * Math.sin(th) * r, Math.cos(th) * r, Math.sin(phi) * Math.sin(th) * r);
    const visorPos = (px, py, dr, hp = VIS.hp, ht = VIS.ht, bulge = 0.045) =>
      onSphere(VIS.phi + px * hp, VIS.th - py * ht, HR + dr + bulge * (1 - px * px) * (1 - py * py));
    function visorPatch(hp, ht, dr, bulge, segU = 48, segV = 32) {
      const pos = [], uv = [], idx = [];
      for (let j = 0; j <= segV; j++) for (let i = 0; i <= segU; i++) {
        const [px, py] = squircle(i / segU * 2 - 1, j / segV * 2 - 1, VIS.n);
        const v = visorPos(px, py, dr, hp, ht, bulge);
        pos.push(v.x, v.y, v.z); uv.push(px * 0.5 + 0.5, py * 0.5 + 0.5);
      }
      for (let j = 0; j < segV; j++) for (let i = 0; i < segU; i++) {
        const a = j * (segU + 1) + i, b = a + 1, c = a + segU + 1, d = c + 1;
        idx.push(a, b, d, a, d, c);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx); g.computeVertexNormals(); return g;
    }
    const outline = (hp, ht, dr, bulge, n = 96) => {
      const pts = [];
      for (let k = 0; k < n; k++) {
        const a = k / n * Math.PI * 2;
        const [px, py] = squircle(Math.cos(a), Math.sin(a), VIS.n);
        pts.push(visorPos(px, py, dr, hp, ht, bulge));
      }
      return pts;
    };
    // тёмная «чаша» под визором и белая рамка вокруг
    head.add(new THREE.Mesh(visorPatch(VIS.hp + 0.07, VIS.ht + 0.06, 0.004, 0.03), navy));
    add(tube(outline(VIS.hp + 0.07, VIS.ht + 0.06, 0.006, 0.03), 0.022, white2, true, 120), head, 0.012);
    // экран визора: градиент, блики и мягкие полосы
    const visorTex = canvasTex(256, 192, (g, W, H) => {
      const gr = g.createRadialGradient(W * 0.5, H * 0.35, 10, W * 0.5, H * 0.55, W * 0.7);
      gr.addColorStop(0, '#9ff7ff'); gr.addColorStop(0.5, '#3fd6ea'); gr.addColorStop(1, '#1590b8');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,255,255,0.06)'; for (let y = 0; y < H; y += 6) g.fillRect(0, y, W, 2);
      g.fillStyle = 'rgba(255,255,255,0.55)';
      g.beginPath(); g.ellipse(W * 0.25, H * 0.2, W * 0.12, H * 0.06, -0.35, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.ellipse(W * 0.4, H * 0.14, W * 0.04, H * 0.03, -0.35, 0, 7); g.fill();
    });
    head.add(new THREE.Mesh(visorPatch(VIS.hp, VIS.ht, 0.012, 0.045), new THREE.MeshBasicMaterial({ map: visorTex })));
    // глаза: светящиеся круги с ореолом (без зрачков) и улыбка, изогнутая по визору
    // глаза: чёткие светящиеся круги с голубым ободком (без зрачков и без размытых ореолов)
    const eyes = [];
    [-0.36, 0.36].forEach(px => {
      const out = visorPos(px, 0.12, 0.3);
      const ring = new THREE.Mesh(new THREE.CircleGeometry(0.088, 40), glowMat(0x8ff3ff)); ring.position.copy(visorPos(px, 0.12, 0.02)); ring.lookAt(out); head.add(ring);
      const eye = new THREE.Mesh(new THREE.CircleGeometry(0.07, 40), glowMat(0xf4ffff)); eye.position.copy(visorPos(px, 0.12, 0.024)); eye.lookAt(out); head.add(eye);
      eyes.push(eye, ring);
    });
    const smilePts = []; for (let k = 0; k <= 16; k++) { const a = k / 16; smilePts.push(visorPos(-0.16 + a * 0.32, -0.42 - Math.sin(a * Math.PI) * 0.12, 0.024)); }
    head.add(tube(smilePts, 0.011, glowMat(0xe8ffff), false, 32));

    // оранжевая пластина на макушке со своей рамкой
    const capVis = { phi: Math.PI / 2, th: 0.38 };
    const capPatch = (() => {
      const pos = [], idx = [], segU = 40, segV = 20;
      for (let j = 0; j <= segV; j++) for (let i = 0; i <= segU; i++) {
        const [px, py] = squircle(i / segU * 2 - 1, j / segV * 2 - 1, 3);
        const v = onSphere(capVis.phi + px * 1.1, capVis.th - py * 0.33, HR * 1.015 + 0.006);
        pos.push(v.x, v.y, v.z);
      }
      for (let j = 0; j < segV; j++) for (let i = 0; i < segU; i++) { const a = j * (segU + 1) + i, b = a + 1, c = a + segU + 1, d = c + 1; idx.push(a, b, d, a, d, c); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
    })();
    add(new THREE.Mesh(capPatch, org), head, 0.012);
    // гребень по центру шлема — от лба к затылку
    const crest = []; for (let k = 0; k <= 24; k++) { const a = 0.72 - k / 24 * 2.05, r = HR * 1.015 + 0.01; crest.push(V3(0, Math.cos(a) * r, Math.sin(a) * r)); }
    add(tube(crest, 0.017, orgD, false, 40), head, 0);
    // затылок: решётка вентиляции и маленький датчик
    const backVent = new THREE.Group(); backVent.position.copy(onSphere(-Math.PI / 2, 1.55, HR * 1.0)); backVent.lookAt(onSphere(-Math.PI / 2, 1.55, HR * 2)); head.add(backVent);
    add(new THREE.Mesh(plate(0.2, 0.13, 0.045, 0.02, 0.01), org), backVent, 0.01);
    for (let k = 0; k < 4; k++) { const v = new THREE.Mesh(plate(0.15, 0.012, 0.005, 0.01, 0.003), navy); v.position.set(0, 0.04 - k * 0.027, 0.016); backVent.add(v); }
    const sensor = new THREE.Group(); sensor.position.copy(onSphere(-Math.PI / 2, 0.75, HR)); sensor.lookAt(onSphere(-Math.PI / 2, 0.75, HR * 2)); head.add(sensor);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.03, 16), greyL), sensor, 0.006).rotation.x = Math.PI / 2;
    const sl = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 8), glowMat(0xff7a5a)); sl.position.z = 0.022; sensor.add(sl);
    // швы-полосы по бокам шлема
    [-1, 1].forEach(sd => {
      const seam = []; for (let k = 0; k <= 24; k++) { const th = 0.55 + k / 24 * 1.6; seam.push(onSphere(Math.PI / 2 + sd * 1.15, th, HR * 1.005 + 0.003)); }
      head.add(tube(seam, 0.006, greyL, false, 32));
    });
    // наушники: точёный профиль с канавкой, светодиод и болты
    const earG = lathe([[0, 0.07], [0.105, 0.07], [0.125, 0.055], [0.13, 0.0], [0.125, -0.04], [0.11, -0.05], [0.0, -0.05]], 40);
    const ringG = lathe([[0.07, 0.074], [0.085, 0.078], [0.09, 0.07], [0.075, 0.066]], 32, false);
    [-1, 1].forEach(sd => {
      const e = new THREE.Group(); e.position.set(sd * 0.345, 0, 0); e.rotation.z = -sd * Math.PI / 2; head.add(e);
      add(new THREE.Mesh(earG, org), e, 0.015);
      const inset = new THREE.Mesh(lathe([[0, 0.071], [0.065, 0.071], [0.07, 0.066], [0, 0.066]], 32, false), orgD); e.add(inset);
      e.add(new THREE.Mesh(ringG, white2));
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.022, 14, 10), glowMat(0x7ff3ff)); led.position.y = 0.078; e.add(led);
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, b = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), greyL); b.position.set(Math.cos(a) * 0.105, 0.072, Math.sin(a) * 0.105); e.add(b); }
    });

    /* =================================================================
       ШЕЯ И ТУЛОВИЩЕ
       ================================================================= */
    // гофрированная шея
    add(new THREE.Mesh(lathe([[0.13, 0.66], [0.15, 0.675], [0.12, 0.69], [0.145, 0.705], [0.115, 0.72], [0.14, 0.735], [0.11, 0.75], [0.0, 0.76]], 32), grey), root, 0.012);
    // туловище — точёный «бочонок»
    const TP = [[0.0, 0.33], [0.16, 0.335], [0.215, 0.38], [0.245, 0.45], [0.258, 0.53], [0.252, 0.6], [0.22, 0.655], [0.15, 0.685], [0.0, 0.69]];
    add(new THREE.Mesh(lathe(TP, 64), white), root, 0.022);
    const torsoR = y => { for (let i = 0; i < TP.length - 1; i++) { const [r0, y0] = TP[i], [r1, y1] = TP[i + 1]; if (y >= y0 && y <= y1) return r0 + (r1 - r0) * (y - y0) / (y1 - y0); } return 0.2; };
    // швы корпуса
    [-1.35, 1.35, Math.PI].forEach(a => {
      const pts = []; for (let k = 0; k <= 16; k++) { const y = 0.37 + k / 16 * 0.27, r = torsoR(y) + 0.003; pts.push(V3(Math.sin(a) * r, y, Math.cos(a) * r)); }
      root.add(tube(pts, 0.005, greyL, false, 24));
    });
    // оранжевые нагрудные пластины, изогнутые по корпусу
    [-1, 1].forEach(sd => {
      const g = wrapCyl(plate(0.13, 0.15, 0.045, 0.012, 0.01), 0.262);
      const m = add(new THREE.Mesh(g, org), root, 0.01); m.position.y = 0.575; m.rotation.y = sd * 0.62;
      const s = wrapCyl(plate(0.075, 0.055, 0.02, 0.006, 0.005), 0.262);
      const p = new THREE.Mesh(s, cyan); p.position.y = 0.455; p.rotation.y = sd * 0.42; root.add(p);
      // вентиляционные прорези под пластиной
      for (let k = 0; k < 3; k++) { const v = new THREE.Mesh(wrapCyl(plate(0.05, 0.008, 0.003, 0.003, 0.001), 0.26), navy); v.position.y = 0.505 - k * 0.016; v.rotation.y = sd * 0.95; root.add(v); }
    });
    // нагрудный «реактор»: точёная оправа, оранжевое кольцо, светящаяся линза, болты
    const core = new THREE.Group(); core.position.set(0, 0.545, 0.245); core.rotation.x = Math.PI / 2 - 0.1; root.add(core);
    add(new THREE.Mesh(lathe([[0, -0.01], [0.075, -0.01], [0.095, 0.0], [0.1, 0.02], [0.09, 0.034], [0.07, 0.036], [0.06, 0.028], [0, 0.028]], 40), white), core, 0.01);
    const cRing = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 10, 40), org); cRing.rotation.x = Math.PI / 2; cRing.position.y = 0.034; core.add(cRing);
    const lens = new THREE.Mesh(new THREE.SphereGeometry(0.055, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), glowMat(0x7ff3ff)); lens.scale.y = 0.45; lens.position.y = 0.026; core.add(lens);
    for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + Math.PI / 4, b = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), greyL); b.position.set(Math.cos(a) * 0.088, 0.03, Math.sin(a) * 0.088); core.add(b); }
    // пояс с пряжкой и подсумками
    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.212, 0.028, 12, 64), grey); belt.rotation.x = Math.PI / 2; belt.position.y = 0.405; root.add(belt);
    const buckle = add(new THREE.Mesh(wrapCyl(plate(0.085, 0.05, 0.015, 0.012, 0.008), 0.24), cyan), root, 0.008); buckle.position.y = 0.405;
    [-1, 1].forEach(sd => { const pch = add(new THREE.Mesh(wrapCyl(plate(0.07, 0.065, 0.018, 0.035, 0.01), 0.235), orgD), root, 0.01); pch.position.y = 0.39; pch.rotation.y = sd * 1.1; });
    // таз
    add(new THREE.Mesh(lathe([[0.0, 0.27], [0.12, 0.275], [0.18, 0.3], [0.2, 0.34], [0.19, 0.38], [0.0, 0.385]], 48), white2), root, 0.015);

    /* ---------- ранец с соплами ---------- */
    const pack = new THREE.Group(); pack.position.set(0, 0.56, -0.255); root.add(pack);
    add(new THREE.Mesh(plate(0.34, 0.32, 0.08, 0.1, 0.025), org), pack, 0.015);
    const lid = add(new THREE.Mesh(plate(0.26, 0.1, 0.03, 0.02, 0.008), orgD), pack, 0.008); lid.position.set(0, 0.07, -0.065);
    for (let k = 0; k < 4; k++) { const v = new THREE.Mesh(plate(0.2, 0.012, 0.005, 0.01, 0.003), navy); v.position.set(0, -0.03 - k * 0.025, -0.066); pack.add(v); }
    const nozG = lathe([[0.035, 0.0], [0.045, -0.02], [0.055, -0.06], [0.07, -0.1], [0.075, -0.11]], 32, true);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0x7ef0ff, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
    let jet = null;
    [-0.09, 0.09].forEach(x => {
      const nz = new THREE.Mesh(nozG, toon(0x6c6c82, { side: THREE.DoubleSide })); nz.position.set(x, -0.15, 0.0); pack.add(nz);
      const nr = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.01, 8, 24), org); nr.rotation.x = Math.PI / 2; nr.position.set(x, -0.15, 0); pack.add(nr);
      const fl = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 16, 1, true), flameMat); fl.rotation.x = Math.PI; fl.position.set(x, -0.41, 0); pack.add(fl);
      if (!jet) jet = fl;
    });

    /* =================================================================
       РУКИ: наплечник, плечо, локоть, наруч, перчатка с фалангами
       ================================================================= */
    const upperG = lathe([[0, 0.0], [0.05, -0.01], [0.057, -0.05], [0.052, -0.13], [0.04, -0.15], [0, -0.155]], 32);
    const foreG = lathe([[0, -0.17], [0.046, -0.175], [0.056, -0.21], [0.063, -0.27], [0.06, -0.3], [0, -0.305]], 32);
    const padG = new THREE.SphereGeometry(0.098, 28, 16, 0, Math.PI * 2, 0, 1.45);
    const finger = (len) => {
      const f = new THREE.Group();
      add(new THREE.Mesh(new THREE.CapsuleGeometry(0.017, len, 4, 10), grey), f, 0.005).position.y = -len / 2 - 0.017;
      const k2 = new THREE.Group(); k2.position.y = -len - 0.03; k2.rotation.x = 0.35; f.add(k2);
      add(new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), greyL), k2, 0);
      add(new THREE.Mesh(new THREE.CapsuleGeometry(0.016, len * 0.8, 4, 10), grey), k2, 0.005).position.y = -len * 0.4 - 0.016;
      return f;
    };
    const arm = sd => {
      const g = new THREE.Group(); g.position.set(sd * 0.275, 0.625, 0); root.add(g);
      add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), grey), g, 0.01);
      const pad = add(new THREE.Mesh(padG, org), g, 0.012); pad.position.y = 0.01; pad.rotation.z = -sd * 0.35;
      const pr = new THREE.Mesh(new THREE.TorusGeometry(0.094, 0.012, 8, 28), white2); pr.rotation.x = Math.PI / 2; pr.rotation.y = -sd * 0.35; pr.position.y = 0.012; g.add(pr);
      add(new THREE.Mesh(upperG, white), g, 0.012).position.y = -0.03;
      const elbow = add(new THREE.Mesh(new THREE.SphereGeometry(0.047, 14, 10), grey), g, 0.008); elbow.position.y = -0.19;
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.056, 0.013, 8, 24), cyan); band.rotation.x = Math.PI / 2; band.position.y = -0.155; g.add(band);
      add(new THREE.Mesh(foreG, white), g, 0.012).position.y = -0.04;
      const wrist = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.013, 8, 24), org); wrist.rotation.x = Math.PI / 2; wrist.position.y = -0.345; g.add(wrist);
      // перчатка
      const hand = new THREE.Group(); hand.position.y = -0.39; hand.rotation.y = sd * 0.3; g.add(hand);
      add(new THREE.Mesh(plate(0.085, 0.075, 0.03, 0.035, 0.014), grey), hand, 0.008);
      const knuck = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.07, 4, 10), greyL); knuck.rotation.z = Math.PI / 2; knuck.position.set(0, -0.035, 0.012); hand.add(knuck);
      for (let k = 0; k < 4; k++) { const f = finger(k === 0 || k === 3 ? 0.03 : 0.036); f.position.set(-0.034 + k * 0.023, -0.04, 0.0); f.rotation.set(0.25, 0, (k - 1.5) * 0.08); hand.add(f); }
      const th = finger(0.026); th.position.set(-sd * 0.05, 0.0, 0.015); th.rotation.set(0.3, 0, -sd * 1.05); hand.add(th);
      g.rotation.z = sd * 0.22; return g;
    };
    const armL = arm(-1), armR = arm(1);

    /* =================================================================
       НОГИ И БОТИНКИ
       ================================================================= */
    const thighG = lathe([[0, 0.335], [0.06, 0.33], [0.072, 0.29], [0.068, 0.24], [0.058, 0.215], [0, 0.21]], 32);
    const shinG = lathe([[0, 0.205], [0.055, 0.2], [0.064, 0.17], [0.07, 0.14], [0.068, 0.12], [0, 0.115]], 32);
    // ботинок из бокового профиля (носок вперёд)
    const bootShape = new THREE.Shape();
    bootShape.moveTo(-0.07, 0.0); bootShape.lineTo(0.11, 0.0);
    bootShape.quadraticCurveTo(0.16, 0.0, 0.155, 0.045); bootShape.quadraticCurveTo(0.15, 0.08, 0.09, 0.085);
    bootShape.quadraticCurveTo(0.05, 0.09, 0.035, 0.125); bootShape.lineTo(-0.065, 0.13);
    bootShape.quadraticCurveTo(-0.09, 0.07, -0.07, 0.0);
    const bootG = new THREE.ExtrudeGeometry(bootShape, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.018, bevelSegments: 5, curveSegments: 16 });
    bootG.translate(0, 0, -0.05);
    const soleShape = new THREE.Shape();
    soleShape.moveTo(-0.08, -0.01); soleShape.lineTo(0.13, -0.01); soleShape.quadraticCurveTo(0.175, -0.01, 0.17, 0.02); soleShape.lineTo(-0.085, 0.02); soleShape.closePath();
    const soleG = new THREE.ExtrudeGeometry(soleShape, { depth: 0.13, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 3, curveSegments: 10 });
    soleG.translate(0, 0, -0.065);
    [-1, 1].forEach(sd => {
      add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), grey), root, 0.008).position.set(sd * 0.1, 0.33, 0);
      add(new THREE.Mesh(thighG, white), root, 0.012).position.x = sd * 0.1;
      const knee = add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 18, 12, 0, Math.PI * 2, 0, 1.3), org), root, 0.008); knee.position.set(sd * 0.1, 0.205, 0.035); knee.rotation.x = 1.3;
      add(new THREE.Mesh(shinG, white), root, 0.012).position.x = sd * 0.1;
      const boot = new THREE.Group(); boot.position.set(sd * 0.1, 0.03, 0.0); boot.rotation.y = -Math.PI / 2; root.add(boot);
      add(new THREE.Mesh(bootG, org), boot, 0.014);
      const sole = new THREE.Mesh(soleG, cyan); boot.add(sole);
      for (let k = 0; k < 5; k++) { const tr = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.13), navy); tr.position.set(-0.05 + k * 0.045, -0.014, 0); boot.add(tr); }
      const strap = add(new THREE.Mesh(plate(0.03, 0.06, 0.01, 0.13, 0.005), white2), boot, 0.006); strap.position.set(0.055, 0.075, 0); strap.rotation.z = 0.5;
      const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.066, 0.017, 8, 28), white2); cuff.rotation.x = Math.PI / 2; cuff.position.set(sd * 0.1, 0.155, 0); root.add(cuff);
    });
    // свечение под ногами
    const footGlow = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.4, 20, 1, true), flameMat); footGlow.rotation.x = Math.PI; footGlow.position.y = -0.18; root.add(footGlow);

    return { root, armL, armR, jet, eyes };
  }
};
