/* =====================================================================
   Испытание 3. Солнечная буря / Mission 3. Solar Storm
   Шаги: сообщение ЦУП + вопрос → выбор укрытия → безопасный режим
   оборудования → буря (дозиметр). Всё на таймере до прихода бури.
   ===================================================================== */
Game.register({
  id: 'storm', order: 3, img: 'storm',
  get tag() { return L('Защита', 'Protection'); },
  get title() { return L('Солнечная буря', 'Solar Storm'); },
  get situation() { return L('ЦУП предупреждает: приближается солнечная буря. Радиация опасна для экипажа и техники.', 'Mission Control warns: a solar storm is coming. Radiation is dangerous for the crew and the equipment.'); },
  get skills() { return L(['Космическая погода', 'Радиация', 'Быстрые решения'], ['Space weather', 'Radiation', 'Quick decisions']); },
  get learn() {
    return L([
      '<b>Солнечная вспышка</b> — это мощный взрыв на Солнце. Он выбрасывает поток заряженных частиц (в основном протонов), и они летят через космос.',
      'Землю от частиц защищают магнитное поле и атмосфера. В космосе такой защиты нет, поэтому экипажу нужно <b>укрытие</b>.',
      'Лучшая защита — толстый слой вещества, особенно <b>воды</b> и запасов еды. Поэтому укрытие делают в центре корабля, среди баков с водой.',
      'Окна и тонкие стены защищают плохо. В кабине с большими иллюминаторами прятаться нельзя.',
      'Электронику переводят в <b>безопасный режим</b>, чтобы частицы не сбили программы. А системы жизнеобеспечения, дозиметр и связь оставляют включёнными.',
      'Учёные следят за Солнцем круглые сутки. Это называют <b>космической погодой</b>: по ней предупреждают астронавтов, как синоптики предупреждают о грозе.'
    ], [
      'A <b>solar flare</b> is a powerful explosion on the Sun. It throws out a stream of charged particles (mostly protons) that fly through space.',
      'Earth is protected from these particles by its magnetic field and atmosphere. In space there is no such protection, so the crew needs a <b>shelter</b>.',
      'The best protection is a thick layer of material, especially <b>water</b> and food supplies. That’s why the shelter is in the middle of the ship, among the water tanks.',
      'Windows and thin walls give poor protection. Never hide in a cockpit with big windows.',
      'Electronics are switched to <b>safe mode</b> so the particles don’t crash their programs. Life support, the dosimeter and communications stay on.',
      'Scientists watch the Sun around the clock. This is called <b>space weather</b>: it’s used to warn astronauts, just like weather forecasters warn about thunderstorms.'
    ]);
  },

  start(ctx) {
    const { h, sfx, shuffle, esc } = ctx;
    ctx.steps(L(['Сигнал ЦУП', 'Укрытие', 'Безопасный режим', 'Буря'], ['Signal', 'Shelter', 'Safe mode', 'Storm']));

    const TOTAL = 100; // секунд до прихода бури
    const sec = L('с', 's');
    let left = TOTAL, timerOn = false, quizOk = false, shelter = null, shelterTries = 0, devScore = 0, devTotal = 0, early = false;
    ctx.stat.innerHTML = `<div class="timer" title="${L('До прихода бури', 'Until the storm arrives')}">—:—</div>`;
    const timerEl = ctx.stat.querySelector('.timer');
    function fmt(s) { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
    ctx.every(250, () => {
      if (!timerOn) return;
      left -= 0.25;
      timerEl.textContent = L('Буря через ', 'Storm in ') + fmt(left);
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
          <h2>${L('Входящее сообщение от Центра управления полётами', 'Incoming message from Mission Control')}</h2>
          <p class="muted">${L('Срочный канал · приоритет «красный»', 'Urgent channel · priority “red”')}</p>
          <button class="btn orange big">${L('Принять сигнал', 'Accept the signal')}</button>
        </div>`);
      const ring = ctx.every(900, () => sfx.radio());
      el.querySelector('button').onclick = () => { clearInterval(ring); sfx.click(); message(); };
      ctx.stage.appendChild(el);
    }

    function message() {
      ctx.stage.innerHTML = '';
      const text = L(
        'ВНИМАНИЕ, ЭКИПАЖ!\nНа Солнце произошла мощная вспышка класса X.\nК кораблю летит поток заряженных частиц.\nОн будет у вас меньше чем через 2 минуты.\n\n1) Найдите самое защищённое место на корабле.\n2) Переведите оборудование в безопасный режим.\nКонец связи.',
        'ATTENTION, CREW!\nA powerful X-class flare has erupted on the Sun.\nA stream of charged particles is heading for the ship.\nIt will reach you in less than 2 minutes.\n\n1) Find the best-protected place on the ship.\n2) Switch the equipment to safe mode.\nOver and out.');
      const el = h(`
        <div class="panel card">
          <div class="task-title"><span class="num">1</span><h2>${L('Сообщение ЦУП', 'Mission Control message')}</h2></div>
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
        ctx.mc(L('Таймер бури запущен! Сначала короткая проверка: ты понял, что к нам летит?', 'The storm timer has started! First a quick check: do you understand what’s coming?'), 'alarm');
        const opts = shuffle([
          { t: L('Поток заряженных частиц от Солнца', 'A stream of charged particles from the Sun'), ok: true },
          { t: L('Метеоритный дождь из камней', 'A meteor shower of rocks'), ok: false },
          { t: L('Облако горячего газа, которое обожжёт корпус', 'A cloud of hot gas that will burn the hull'), ok: false },
          { t: L('Обычный солнечный свет, только ярче', 'Ordinary sunlight, just brighter'), ok: false }
        ]);
        const q = el.querySelector('.quiz');
        q.innerHTML = `<h3 style="margin-top:16px">${L('Что летит к кораблю?', 'What is heading for the ship?')}</h3><div class="options"></div><div class="fb"></div>`;
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
              fb.innerHTML = `<div class="feedback ok">${L('Верно! Частицы невидимы и проходят сквозь тонкие стенки. Поэтому нужна защита.', 'Correct! The particles are invisible and pass through thin walls. That’s why we need protection.')}</div><div class="actions"><button class="btn orange big">${L('Искать укрытие →', 'Find a shelter →')}</button></div>`;
              fb.querySelector('button').onclick = () => { sfx.click(); stepShelter(); };
            } else {
              sfx.bad(); b.classList.add('wrong'); b.disabled = true;
              fb.innerHTML = `<div class="feedback no">${L('Нет. В сообщении сказано про <b>заряженные частицы</b> от Солнца.', 'No. The message talks about <b>charged particles</b> from the Sun.')}</div>`;
            }
          };
          box.appendChild(b);
        });
      }
    }

    /* ---------------- 2. Укрытие ---------------- */
    const ROOMS = [
      { id: 'cab', name: L('Кабина пилотов', 'Cockpit'), prot: 1, dose: 5.0,
        props: L(['большие иллюминаторы', 'тонкие стены', 'на краю корабля'], ['big windows', 'thin walls', 'at the edge of the ship']) },
      { id: 'lock', name: L('Шлюзовой отсек', 'Airlock'), prot: 1, dose: 4.6,
        props: L(['у внешнего борта', 'тонкая стенка люка', 'пустой'], ['next to the outer hull', 'thin hatch wall', 'empty']) },
      { id: 'lab', name: L('Лаборатория', 'Laboratory'), prot: 2, dose: 2.6,
        props: L(['обычные стены', 'есть окно', 'много приборов'], ['normal walls', 'has a window', 'lots of instruments']) },
      { id: 'live', name: L('Жилой модуль', 'Crew quarters'), prot: 3, dose: 1.4,
        props: L(['стены потолще', 'маленький иллюминатор', 'спальные места'], ['thicker walls', 'small porthole', 'sleeping bunks']) },
      { id: 'water', name: L('Склад с баками воды', 'Water tank storage'), prot: 5, dose: 0.3,
        props: L(['в центре корабля', 'со всех сторон баки с водой', 'без окон'], ['in the middle of the ship', 'water tanks on every side', 'no windows']) }
    ];
    const bars = n => `${'■'.repeat(n)}${'□'.repeat(5 - n)}`;
    function stepShelter() {
      ctx.step(1);
      ctx.mc(L('Выбери, где укрыться экипажу. Нажми на отсек, чтобы узнать о нём больше, и подумай, где частицам <b>труднее всего</b> пройти.',
               'Choose where the crew should shelter. Tap a module to learn more about it, and think where it’s <b>hardest</b> for particles to get through.'));
      const el = h(`
        <div class="panel card">
          <div class="task-title"><span class="num">2</span><h2>${L('Самое защищённое место', 'The safest place')}</h2></div>
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
              <div class="actions" style="margin-top:6px"><button class="btn orange">${L('Укрыться здесь', 'Shelter here')}</button></div>
              <div class="fb"></div></div>`;
          info.querySelector('button').onclick = () => choose(b);
        };
        b.dataset.id = r.id;
        map.appendChild(b);
      });
      const toDevices = L('К оборудованию →', 'To the equipment →');
      function choose(b) {
        shelterTries++;
        const fb = info.querySelector('.fb');
        if (sel.prot === 5) {
          shelter = sel; sfx.ok();
          map.querySelectorAll('.room').forEach(x => x.disabled = true);
          info.querySelector('button').disabled = true;
          fb.innerHTML = `<div class="feedback ok">${L('Отлично! Вода — один из лучших щитов от частиц, а центр корабля дальше всего от внешних стен.', 'Excellent! Water is one of the best shields against particles, and the middle of the ship is farthest from the outer walls.')}</div><div class="actions"><button class="btn orange big">${toDevices}</button></div>`;
          fb.querySelector('.actions button').onclick = () => { sfx.click(); stepDevices(); };
          ctx.mc(L('Экипаж перебирается на склад с водой. Теперь быстро защитите технику!', 'The crew is moving to the water storage. Now protect the equipment, quickly!'), 'good');
        } else if (shelterTries >= 2) {
          // со второй ошибки идём дальше с худшим укрытием
          shelter = sel; sfx.bad();
          map.querySelectorAll('.room').forEach(x => x.disabled = true);
          info.querySelector('button').disabled = true;
          fb.innerHTML = `<div class="feedback no">${L(`Времени нет — укрываемся здесь. Защита: ${bars(sel.prot)}. Лучше всего был бы склад с баками воды.`, `No time left — we shelter here. Protection: ${bars(sel.prot)}. The water tank storage would have been best.`)}</div><div class="actions"><button class="btn orange big">${toDevices}</button></div>`;
          fb.querySelector('.actions button').onclick = () => { sfx.click(); stepDevices(); };
        } else {
          sfx.bad();
          b.disabled = true;
          const why = sel.prot === 1
            ? L('Окна и тонкие стены почти не задерживают частицы.', 'Windows and thin walls barely stop particles.')
            : L('Есть место надёжнее.', 'There’s a safer place.');
          fb.innerHTML = `<div class="feedback no">${L(`Здесь защита слабая: ${bars(sel.prot)}.`, `Weak protection here: ${bars(sel.prot)}.`)} ${why} ${L('Подсказка: <b>вода</b> хорошо задерживает частицы.', 'Hint: <b>water</b> is good at stopping particles.')}</div>`;
          ctx.mc(L('Можно найти место надёжнее! Ищи отсек в центре корабля, где больше всего вещества вокруг.', 'You can find a safer place! Look for a module in the middle of the ship with the most material around it.'), 'bad');
        }
      }
      ctx.stage.appendChild(el);
    }

    /* ---------------- 3. Безопасный режим ---------------- */
    const turnOff = L('Выключить', 'Turn off');
    const DEVICES = [
      { img: 'panel', name: L('Солнечные панели', 'Solar panels'), desc: L('Дают энергию кораблю', 'Power the ship'), want: 'safe', safeTxt: L('Повернуть ребром', 'Turn edge-on'),
        why: L('Панели повернули ребром к Солнцу: так в них попадёт меньше частиц.', 'The panels are turned edge-on to the Sun, so fewer particles hit them.') },
      { img: 'dev-computer', name: L('Главный компьютер', 'Main computer'), desc: L('Управляет системами корабля', 'Controls the ship’s systems'), want: 'safe', safeTxt: L('Безопасный режим', 'Safe mode'),
        why: L('Частицы могут сбить программу. В безопасном режиме компьютер сохраняет данные и работает только с главным.', 'Particles can crash a program. In safe mode the computer saves its data and runs only the essentials.') },
      { img: 'dev-telescope', name: L('Научный телескоп', 'Science telescope'), desc: L('Чувствительная камера', 'A sensitive camera'), want: 'safe', safeTxt: L('Закрыть и выключить', 'Cover and turn off'),
        why: L('Чувствительную камеру частицы могут повредить. Её закрывают крышкой и выключают.', 'Particles can damage a sensitive camera. It’s covered with a lid and turned off.') },
      { img: 'dev-robot', name: L('Робот-манипулятор', 'Robotic arm'), desc: L('Рука снаружи корабля', 'An arm outside the ship'), want: 'safe', safeTxt: L('Сложить', 'Fold away'),
        why: L('Робота складывают и паркуют, чтобы сбой электроники не сдвинул его.', 'The arm is folded and parked so an electronics glitch can’t move it.') },
      { img: 'dev-lifesupport', name: L('Жизнеобеспечение', 'Life support'), desc: L('Воздух, температура, вода', 'Air, temperature, water'), want: 'on', safeTxt: turnOff,
        why: L('Жизнеобеспечение отключать нельзя никогда — экипажу нужно дышать!', 'Never turn off life support — the crew needs to breathe!') },
      { img: 'dev-dosimeter', name: L('Дозиметр', 'Dosimeter'), desc: L('Измеряет радиацию', 'Measures radiation'), want: 'on', safeTxt: turnOff,
        why: L('Дозиметр нужен именно сейчас: он показывает, сколько радиации получил экипаж.', 'The dosimeter is needed right now: it shows how much radiation the crew gets.') },
      { img: 'dev-antenna', name: L('Связь с ЦУП', 'Link to Mission Control'), desc: L('Канал с Землёй', 'Channel to Earth'), want: 'on', safeTxt: turnOff,
        why: L('Связь оставляют: ЦУП сообщит, когда буря закончится.', 'Keep the link on: Mission Control will tell you when the storm is over.') }
    ];
    function stepDevices() {
      ctx.step(2);
      ctx.mc(L('Переведи оборудование в <b>безопасный режим</b>. Но осторожно: некоторые системы <b>нельзя</b> выключать даже в бурю!',
               'Switch the equipment to <b>safe mode</b>. But careful: some systems must <b>never</b> be turned off, even in a storm!'));
      const state = {};
      const el = h(`
        <div class="panel card">
          <div class="task-title"><span class="num">3</span><h2>${L('Защити оборудование', 'Protect the equipment')}</h2></div>
          <p>${L('Для каждой системы выбери: <b>оставить работать</b> или <b>защитить / выключить</b>.', 'For each system choose: <b>keep it running</b> or <b>protect / turn it off</b>.')}</p>
          <div class="devices"></div>
          <div class="fb"></div>
          <div class="actions"><button class="btn orange big go" disabled>${L('Готово, всё защищено', 'Done, everything is protected')}</button></div>
        </div>`);
      const box = el.querySelector('.devices'), go = el.querySelector('.go');
      const list = shuffle(DEVICES);
      list.forEach((d, i) => {
        const c = h(`
          <div class="device">
            ${ctx.ico(d.img)}
            <div class="d-main"><div class="d-name">${esc(d.name)}</div><div class="d-desc">${esc(d.desc)}</div><div class="d-why"></div></div>
            <div class="seg"><button data-v="on">${L('Работает', 'Keep on')}</button><button data-v="safe">${esc(d.safeTxt)}</button></div>
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
          c.querySelector('.d-why').innerHTML = d.why;
          c.querySelector('.d-why').style.color = ok ? 'var(--good)' : 'var(--bad)';
          c.querySelectorAll('button').forEach(b => b.disabled = true);
        });
        go.remove();
        const fb = el.querySelector('.fb');
        if (devScore === devTotal) { sfx.ok(); fb.innerHTML = `<div class="feedback ok">${L('Всё верно! Техника защищена, а важные системы работают.', 'All correct! The equipment is protected and the vital systems are running.')}</div>`; }
        else { sfx.bad(); fb.innerHTML = `<div class="feedback no">${L(`Правильно: ${devScore} из ${devTotal}. Прочитай пояснения под каждой системой.`, `Correct: ${devScore} of ${devTotal}. Read the explanation under each system.`)}</div>`; }
        fb.innerHTML += `<div class="actions"><button class="btn orange big">${L('Ждать бурю в укрытии →', 'Wait out the storm in the shelter →')}</button></div>`;
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
      timerEl.textContent = L('Буря!', 'Storm!');
      timerEl.classList.add('low');
      if (!shelter) shelter = ROOMS[2]; // не успели — остались в лаборатории
      if (!devTotal) { devTotal = DEVICES.length; devScore = 3; } // защищены только «по умолчанию работающие»
      ctx.step(3);
      ctx.mc(early
        ? L('<b>Буря началась раньше, чем вы успели подготовиться!</b> Держитесь!', '<b>The storm hit before you were ready!</b> Hold on!')
        : L('Буря у корабля! Экипаж в укрытии. Следим за дозиметром…', 'The storm has reached the ship! The crew is in the shelter. Watching the dosimeter…'), 'alarm');
      const mSv = L('мЗв', 'mSv');
      const el = h(`
        <div class="panel card">
          <div class="task-title"><span class="num">4</span><h2>${L('Солнечная буря проходит', 'The solar storm is passing')}</h2></div>
          <div class="storm-scene screen">
            <canvas width="900" height="300"></canvas>
            <div class="dosimeter"><div class="small">${L('ДОЗИМЕТР', 'DOSIMETER')}</div><div class="v">0.00</div><div class="small">${mSv}</div></div>
          </div>
          <p class="small muted" style="margin-top:10px">${L('Укрытие', 'Shelter')}: <b>${esc(shelter.name)}</b> · ${L('Техника защищена', 'Equipment protected')}: <b>${devScore} ${L('из', 'of')} ${devTotal}</b></p>
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
        ctx.mc(L('Буря прошла! Можно выходить из укрытия. Спасибо за чёткую работу, экипаж.', 'The storm is over! You can leave the shelter. Thanks for the great work, crew.'), 'good');
        const fb = el.querySelector('.fb');
        fb.innerHTML = `<div class="fact">${L(
          `Экипаж получил дозу <b>${finalDose.toFixed(2)} мЗв</b>. Для сравнения: человек на Земле за целый год получает от природы около <b>2–3 мЗв</b>.`,
          `The crew received a dose of <b>${finalDose.toFixed(2)} mSv</b>. For comparison: a person on Earth gets about <b>2–3 mSv</b> from nature in a whole year.`)}</div>`;
        let score = 3;
        const notes = [];
        if (shelter.prot === 5 && shelterTries === 1) notes.push({ ok: true, text: L('Сразу выбрано лучшее укрытие — склад с баками воды.', 'You picked the best shelter right away — the water tank storage.') });
        else if (shelter.prot === 5) { score -= 0.5; notes.push({ ok: false, text: L('Лучшее укрытие найдено со второй попытки. Помни: вода задерживает частицы.', 'You found the best shelter on the second try. Remember: water stops particles.') }); }
        else { score -= 1; notes.push({ ok: false, text: L(`Укрытие «${shelter.name}» защищает слабо. Лучше всего — склад с баками воды в центре корабля.`, `The ${shelter.name} gives weak protection. The best is the water tank storage in the middle of the ship.`) }); }
        if (devScore === devTotal) notes.push({ ok: true, text: L('Всё оборудование защищено правильно.', 'All the equipment was protected correctly.') });
        else { score -= devTotal - devScore >= 3 ? 1.5 : 1; notes.push({ ok: false, text: L(`Оборудование: ${devScore} из ${devTotal}. Жизнеобеспечение, дозиметр и связь всегда оставляют включёнными.`, `Equipment: ${devScore} of ${devTotal}. Life support, the dosimeter and communications always stay on.`) }); }
        if (early) { score -= 1; notes.push({ ok: false, text: L('Буря пришла раньше, чем вы закончили подготовку. Действуй быстрее!', 'The storm arrived before you finished preparing. Work faster!') }); }
        else notes.push({ ok: true, text: L(`Подготовка закончена за ${TOTAL - timeLeft} ${sec} — до бури оставалось ${timeLeft} ${sec}.`, `Preparation done in ${TOTAL - timeLeft} ${sec} — ${timeLeft} ${sec} before the storm.`) });
        if (quizOk) notes.push({ ok: true, text: L('Правильно понял сообщение ЦУП с первого раза.', 'You understood the Mission Control message on the first try.') });
        ctx.after(2600, () => ctx.finish(score, notes));
      }
    }
  }
});
