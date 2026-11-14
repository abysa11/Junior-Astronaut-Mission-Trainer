/* =====================================================================
   Испытание 3. Солнечная буря
   Шаги: сообщение ЦУП + вопрос → выбор укрытия → безопасный режим
   оборудования → буря (дозиметр). Всё на таймере до прихода бури.
   ===================================================================== */
Game.register({
  id: 'storm', order: 3, icon: '', img: 'storm', tag: 'Защита',
  title: 'Солнечная буря',
  situation: 'ЦУП предупреждает: приближается солнечная буря. Радиация опасна для экипажа и техники.',
  skills: ['Космическая погода', 'Радиация', 'Быстрые решения'],
  learn: [
    '<b>Солнечная вспышка</b> — это мощный взрыв на Солнце. Он выбрасывает поток заряженных частиц (в основном протонов), и они летят через космос.',
    'Землю от частиц защищают магнитное поле и атмосфера. В космосе такой защиты нет, поэтому экипажу нужно <b>укрытие</b>.',
    'Лучшая защита — толстый слой вещества, особенно <b>воды</b> и запасов еды. Поэтому укрытие делают в центре корабля, среди баков с водой.',
    'Окна и тонкие стены защищают плохо. В кабине с большими иллюминаторами прятаться нельзя.',
    'Электронику переводят в <b>безопасный режим</b>, чтобы частицы не сбили программы. А системы жизнеобеспечения, дозиметр и связь оставляют включёнными.',
    'Учёные следят за Солнцем круглые сутки. Это называют <b>космической погодой</b>: по ней предупреждают астронавтов, как синоптики предупреждают о грозе.'
  ],

  start(ctx) {
    const { h, sfx, shuffle, esc } = ctx;
    ctx.steps(['Сигнал ЦУП', 'Укрытие', 'Безопасный режим', 'Буря']);

    const TOTAL = 100; // секунд до прихода бури
    let left = TOTAL, timerOn = false, quizOk = false, shelter = null, shelterTries = 0, devScore = 0, devTotal = 0, early = false;
    ctx.stat.innerHTML = `<div class="timer" title="До прихода бури"> —:—</div>`;
    const timerEl = ctx.stat.querySelector('.timer');
    function fmt(s) { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
    ctx.every(250, () => {
      if (!timerOn) return;
      left -= 0.25;
      timerEl.textContent = ' ' + fmt(left);
      timerEl.classList.toggle('low', left < 25);
      if (left <= 0) { timerOn = false; early = true; stormNow(); }
    });

    incoming();

    /* ---------------- 1. Сигнал ---------------- */
    function incoming() {
      ctx.step(0);
      ctx.mc('');
      const el = h(`
        <div class="panel card incoming">
          ${ctx.ico('radio')}
          <h2>Входящее сообщение от Центра управления полётами</h2>
          <p class="muted">Срочный канал · приоритет «красный»</p>
          <button class="btn orange big">Принять сигнал</button>
        </div>`);
      const ring = ctx.every(900, () => sfx.radio());
      el.querySelector('button').onclick = () => { clearInterval(ring); sfx.click(); message(); };
      ctx.stage.appendChild(el);
    }

    function message() {
      ctx.stage.innerHTML = '';
      const text = 'ВНИМАНИЕ, ЭКИПАЖ!\nНа Солнце произошла мощная вспышка класса X.\nК кораблю летит поток заряженных частиц.\nОн будет у вас меньше чем через 2 минуты.\n\n1) Найдите самое защищённое место на корабле.\n2) Переведите оборудование в безопасный режим.\nКонец связи.';
      const el = h(`
        <div class="panel card">
          <div class="task-title"><span class="num">1</span><h2>Сообщение ЦУП</h2></div>
          <div class="screen typewriter"></div>
          <div class="quiz"></div>
        </div>`);
      const tw = el.querySelector('.typewriter');
      let i = 0;
      const id = ctx.every(22, () => {
        tw.textContent = text.slice(0, ++i);
        if (i % 3 === 0) sfx.type();
        if (i >= text.length) { clearInterval(id); tw.classList.add('done'); quiz(); }
      });
      tw.onclick = () => { i = text.length - 1; };
      ctx.stage.appendChild(el);

      function quiz() {
        timerOn = true;
        ctx.mc('Таймер бури запущен! Сначала короткая проверка: ты понял, что к нам летит?', 'alarm');
        const opts = shuffle([
          { t: 'Поток заряженных частиц от Солнца', ok: true },
          { t: 'Метеоритный дождь из камней', ok: false },
          { t: 'Облако горячего газа, которое обожжёт корпус', ok: false },
          { t: 'Обычный солнечный свет, только ярче', ok: false }
        ]);
        const q = el.querySelector('.quiz');
        q.innerHTML = `<h3 style="margin-top:16px">Что летит к кораблю?</h3><div class="options"></div><div class="fb"></div>`;
        const box = q.querySelector('.options'), fb = q.querySelector('.fb');
        let tries = 0;
        opts.forEach(o => {
          const b = h(`<button class="opt">${esc(o.t)}</button>`);
          b.onclick = () => {
            tries++;
            if (o.ok) {
              sfx.ok(); b.classList.add('right');
              quizOk = tries === 1;
              box.querySelectorAll('button').forEach(x => x.disabled = true);
              fb.innerHTML = `<div class="feedback ok">Верно! Частицы невидимы и проходят сквозь тонкие стенки. Поэтому нужна защита.</div><div class="actions"><button class="btn orange big">Искать укрытие →</button></div>`;
              fb.querySelector('button').onclick = () => { sfx.click(); stepShelter(); };
            } else {
              sfx.bad(); b.classList.add('wrong'); b.disabled = true;
              fb.innerHTML = `<div class="feedback no">Нет. В сообщении сказано про <b>заряженные частицы</b> от Солнца.</div>`;
            }
          };
          box.appendChild(b);
        });
      }
    }

    /* ---------------- 2. Укрытие ---------------- */
    const ROOMS = [
      { id: 'cab', icon: '', name: 'Кабина пилотов', prot: 1, dose: 5.0, props: ['большие иллюминаторы', 'тонкие стены', 'на краю корабля'] },
      { id: 'lock', icon: '', name: 'Шлюзовой отсек', prot: 1, dose: 4.6, props: ['у внешнего борта', 'тонкая стенка люка', 'пустой'] },
      { id: 'lab', icon: '', name: 'Лаборатория', prot: 2, dose: 2.6, props: ['обычные стены', 'есть окно', 'много приборов'] },
      { id: 'live', icon: '', name: 'Жилой модуль', prot: 3, dose: 1.4, props: ['стены потолще', 'маленький иллюминатор', 'спальные места'] },
      { id: 'water', icon: '', name: 'Склад с баками воды', prot: 5, dose: 0.3, props: ['в центре корабля', 'со всех сторон баки с водой', 'без окон'] }
    ];
    function stepShelter() {
      ctx.step(1);
      ctx.mc('Выбери, где укрыться экипажу. Нажми на отсек, чтобы узнать о нём больше, и подумай, где частицам <b>труднее всего</b> пройти.');
      const el = h(`
        <div class="panel card">
          <div class="task-title"><span class="num">2</span><h2>Самое защищённое место</h2></div>
          <div class="screen ship-map"></div>
          <div class="room-info"></div>
        </div>`);
      const map = el.querySelector('.ship-map'), info = el.querySelector('.room-info');
      let sel = null;
      shuffle(ROOMS).forEach(r => {
        const b = h(`<button class="room">${ctx.ico('room-' + r.id, 'r-img')}<span class="r-name">${esc(r.name)}</span><span class="r-read">${esc(r.props[0])}</span></button>`);
        b.onclick = () => {
          sfx.click();
          sel = r;
          map.querySelectorAll('.room').forEach(x => x.classList.remove('picked'));
          b.classList.add('picked');
          info.innerHTML = `<div class="panel card flat" style="margin:0">
              <h3>${esc(r.name)}</h3>
              <div class="chips">${r.props.map(p => `<span class="chip">${esc(p)}</span>`).join('')}</div>
              <div class="actions" style="margin-top:6px"><button class="btn orange">Укрыться здесь</button></div>
              <div class="fb"></div></div>`;
          info.querySelector('button').onclick = () => choose(b);
        };
        b.dataset.id = r.id;
        map.appendChild(b);
      });
      function choose(b) {
        shelterTries++;
        const fb = info.querySelector('.fb');
        if (sel.prot === 5) {
          shelter = sel; sfx.ok();
          map.querySelectorAll('.room').forEach(x => x.disabled = true);
          info.querySelector('button').disabled = true;
          fb.innerHTML = `<div class="feedback ok">Отлично! Вода — один из лучших щитов от частиц, а центр корабля дальше всего от внешних стен.</div><div class="actions"><button class="btn orange big">К оборудованию →</button></div>`;
          fb.querySelector('.actions button').onclick = () => { sfx.click(); stepDevices(); };
          ctx.mc('Экипаж перебирается на склад с водой. Теперь быстро защитите технику!', 'good');
        } else if (shelterTries >= 2) {
          // со второй ошибки идём дальше с худшим укрытием
          shelter = sel; sfx.bad();
          map.querySelectorAll('.room').forEach(x => x.disabled = true);
          info.querySelector('button').disabled = true;
          fb.innerHTML = `<div class="feedback no">Времени нет — укрываемся здесь. Защита: ${'■'.repeat(sel.prot)}${'□'.repeat(5 - sel.prot)}. Лучше всего был бы склад с баками воды.</div><div class="actions"><button class="btn orange big">К оборудованию →</button></div>`;
          fb.querySelector('.actions button').onclick = () => { sfx.click(); stepDevices(); };
        } else {
          sfx.bad();
          b.disabled = true;
          fb.innerHTML = `<div class="feedback no">Здесь защита слабая: ${'■'.repeat(sel.prot)}${'□'.repeat(5 - sel.prot)}. ${sel.prot === 1 ? 'Окна и тонкие стены почти не задерживают частицы.' : 'Есть место надёжнее.'} Подсказка: <b>вода</b> хорошо задерживает частицы.</div>`;
          ctx.mc('Можно найти место надёжнее! Ищи отсек в центре корабля, где больше всего вещества вокруг.', 'bad');
        }
      }
      ctx.stage.appendChild(el);
    }

    /* ---------------- 3. Безопасный режим ---------------- */
    const DEVICES = [
      { img: 'panel', name: 'Солнечные панели', desc: 'Дают энергию кораблю', want: 'safe', safeTxt: 'Повернуть ребром', why: 'Панели повернули ребром к Солнцу: так в них попадёт меньше частиц.' },
      { img: 'dev-computer', name: 'Главный компьютер', desc: 'Управляет системами корабля', want: 'safe', safeTxt: 'Безопасный режим', why: 'Частицы могут сбить программу. В безопасном режиме компьютер сохраняет данные и работает только с главным.' },
      { img: 'dev-telescope', name: 'Научный телескоп', desc: 'Чувствительная камера', want: 'safe', safeTxt: 'Закрыть и выключить', why: 'Чувствительную камеру частицы могут повредить. Её закрывают крышкой и выключают.' },
      { img: 'dev-robot', name: 'Робот-манипулятор', desc: 'Рука снаружи корабля', want: 'safe', safeTxt: 'Сложить', why: 'Робота складывают и паркуют, чтобы сбой электроники не сдвинул его.' },
      { img: 'dev-lifesupport', name: 'Жизнеобеспечение', desc: 'Воздух, температура, вода', want: 'on', safeTxt: 'Выключить', why: 'Жизнеобеспечение отключать нельзя никогда — экипажу нужно дышать!' },
      { img: 'dev-dosimeter', name: 'Дозиметр', desc: 'Измеряет радиацию', want: 'on', safeTxt: 'Выключить', why: 'Дозиметр нужен именно сейчас: он показывает, сколько радиации получил экипаж.' },
      { img: 'dev-antenna', name: 'Связь с ЦУП', desc: 'Канал с Землёй', want: 'on', safeTxt: 'Выключить', why: 'Связь оставляют: ЦУП сообщит, когда буря закончится.' }
    ];
    function stepDevices() {
      ctx.step(2);
      ctx.mc('Переведи оборудование в <b>безопасный режим</b>. Но осторожно: некоторые системы <b>нельзя</b> выключать даже в бурю!');
      const state = {};
      const el = h(`
        <div class="panel card">
          <div class="task-title"><span class="num">3</span><h2>Защити оборудование</h2></div>
          <p>Для каждой системы выбери: <b>оставить работать</b> или <b>защитить / выключить</b>.</p>
          <div class="devices"></div>
          <div class="fb"></div>
          <div class="actions"><button class="btn orange big go" disabled>Готово, всё защищено</button></div>
        </div>`);
      const box = el.querySelector('.devices'), go = el.querySelector('.go');
      const list = shuffle(DEVICES);
      list.forEach((d, i) => {
        const c = h(`
          <div class="device">
            ${ctx.ico(d.img)}
            <div class="d-main"><div class="d-name">${esc(d.name)}</div><div class="d-desc">${esc(d.desc)}</div><div class="d-why"></div></div>
            <div class="seg"><button data-v="on">Работает</button><button data-v="safe">${esc(d.safeTxt)}</button></div>
          </div>`);
        c.querySelectorAll('.seg button').forEach(b => b.onclick = () => {
          sfx.click();
          state[i] = b.dataset.v;
          c.querySelectorAll('.seg button').forEach(x => x.classList.toggle('on', x === b));
          go.disabled = Object.keys(state).length < list.length;
        });
        box.appendChild(c);
      });
      go.onclick = () => {
        devTotal = list.length; devScore = 0;
        box.querySelectorAll('.device').forEach((c, i) => {
          const d = list[i], ok = state[i] === d.want;
          if (ok) devScore++;
          c.classList.add(ok ? 'right' : 'wrong');
          c.querySelector('.d-why').innerHTML = (ok ? ' ' : ' ') + d.why;
          c.querySelector('.d-why').style.color = ok ? 'var(--good)' : 'var(--bad)';
          c.querySelectorAll('button').forEach(b => b.disabled = true);
        });
        go.remove();
        const fb = el.querySelector('.fb');
        if (devScore === devTotal) { sfx.ok(); fb.innerHTML = `<div class="feedback ok">Всё верно! Техника защищена, а важные системы работают.</div>`; }
        else { sfx.bad(); fb.innerHTML = `<div class="feedback no">Правильно: ${devScore} из ${devTotal}. Прочитай пояснения под каждой системой.</div>`; }
        fb.innerHTML += `<div class="actions"><button class="btn orange big">Ждать бурю в укрытии →</button></div>`;
        fb.querySelector('.actions button').onclick = () => { sfx.click(); timerOn = false; stormNow(); };
      };
      ctx.stage.appendChild(el);
    }

    /* ---------------- 4. Буря ---------------- */
    let stormStarted = false;
    function stormNow() {
      if (stormStarted) return;
      stormStarted = true;
      timerOn = false;
      const timeLeft = Math.max(0, Math.round(left));
      timerEl.textContent = ' буря!';
      timerEl.classList.add('low');
      if (!shelter) shelter = ROOMS[2]; // не успели — остались в лаборатории
      if (!devTotal) { devTotal = DEVICES.length; devScore = 3; } // защищены только «по умолчанию работающие»
      ctx.step(3);
      ctx.mc(early ? ' <b>Буря началась раньше, чем вы успели подготовиться!</b> Держитесь!' : ' Буря у корабля! Экипаж в укрытии. Следим за дозиметром…', 'alarm');
      const el = h(`
        <div class="panel card">
          <div class="task-title"><span class="num">4</span><h2>Солнечная буря проходит</h2></div>
          <div class="storm-scene screen">
            <canvas width="900" height="300"></canvas>
            <div class="dosimeter"><div class="small"> ДОЗИМЕТР</div><div class="v">0.00</div><div class="small">мЗв</div></div>
          </div>
          <p class="small muted" style="margin-top:10px">Укрытие: <b>${esc(shelter.name)}</b> · Техника защищена: <b>${devScore} из ${devTotal}</b></p>
          <div class="fb"></div>
        </div>`);
      ctx.stage.appendChild(el);
      const cv = el.querySelector('canvas'), g = cv.getContext('2d');
      const W = 900, H = 300;
      const v = el.querySelector('.v');
      let parts = [], t = 0, last = performance.now();
      const SUN = new Image(); SUN.src = 'assets/sprites/sun.png';
      const SHIP = new Image(); SHIP.src = 'assets/sprites/ship.png';
      const DURATION = 7;
      const finalDose = shelter.dose * (early ? 1.3 : 1);
      function frame(now) {
        const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
        const k = Math.min(1, t / DURATION);
        const intensity = Math.sin(Math.PI * k);
        for (let i = 0; i < 14 * intensity + 1; i++) parts.push({ x: -10, y: Math.random() * H, vx: 500 + Math.random() * 400, vy: (Math.random() - 0.5) * 60 });
        g.fillStyle = '#17206e'; g.fillRect(0, 0, W, H);
        // Солнце и корабль — спрайты Higgsfield
        const sx = 600, sy = H / 2;
        const shieldR = 80 + shelter.prot * 8;
        if (SUN.complete) g.drawImage(SUN, -150, H / 2 - 150, 300, 300);
        g.strokeStyle = `rgba(95,216,255,${0.15 + shelter.prot * 0.12})`; g.lineWidth = 2 + shelter.prot * 2;
        g.beginPath(); g.arc(sx, sy, shieldR, 0, 7); g.stroke();
        if (SHIP.complete) g.drawImage(SHIP, sx - 100, sy - 67, 200, 134);
        // частицы
        parts.forEach(p => {
          p.x += p.vx * dt; p.y += p.vy * dt;
          const d = Math.hypot(p.x - sx, p.y - sy);
          if (d < shieldR && Math.random() < shelter.prot / 5.5) p.dead = true; // щит задерживает
          g.fillStyle = 'rgba(255,209,102,0.9)';
          g.fillRect(p.x, p.y, 6, 2);
        });
        parts = parts.filter(p => p.x < W + 10 && !p.dead);
        v.textContent = (finalDose * (1 - Math.cos(Math.PI * k)) / 2).toFixed(2);
        if (k < 1) ctx.frame(frame); else end();
      }
      ctx.frame(frame);

      function end() {
        v.textContent = finalDose.toFixed(2);
        ctx.mc('Буря прошла! Можно выходить из укрытия. Спасибо за чёткую работу, экипаж.', 'good');
        const fb = el.querySelector('.fb');
        fb.innerHTML = `<div class="fact">Экипаж получил дозу <b>${finalDose.toFixed(2)} мЗв</b>. Для сравнения: человек на Земле за целый год получает от природы около <b>2–3 мЗв</b>.</div>`;
        let score = 3;
        const notes = [];
        if (shelter.prot === 5 && shelterTries === 1) notes.push({ ok: true, text: 'Сразу выбрано лучшее укрытие — склад с баками воды.' });
        else if (shelter.prot === 5) { score -= 0.5; notes.push({ ok: false, text: 'Лучшее укрытие найдено со второй попытки. Помни: вода задерживает частицы.' }); }
        else { score -= 1; notes.push({ ok: false, text: `Укрытие «${shelter.name}» защищает слабо. Лучше всего — склад с баками воды в центре корабля.` }); }
        if (devScore === devTotal) notes.push({ ok: true, text: 'Всё оборудование защищено правильно.' });
        else { score -= devTotal - devScore >= 3 ? 1.5 : 1; notes.push({ ok: false, text: `Оборудование: ${devScore} из ${devTotal}. Жизнеобеспечение, дозиметр и связь всегда оставляют включёнными.` }); }
        if (early) { score -= 1; notes.push({ ok: false, text: 'Буря пришла раньше, чем вы закончили подготовку. Действуй быстрее!' }); }
        else notes.push({ ok: true, text: `Подготовка закончена за ${TOTAL - timeLeft} с — до бури оставалось ${timeLeft} с.` });
        if (quizOk) notes.push({ ok: true, text: 'Правильно понял сообщение ЦУП с первого раза.' });
        ctx.after(2600, () => ctx.finish(score, notes));
      }
    }
  }
});
