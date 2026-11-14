# Картинки для Higgsfield (через Claude chat)

Безлимит Higgsfield работает в Claude chat, поэтому картинки генерируем там, а в игру их вставляет Claude Code.

## Как генерировать

1. В Claude chat (с подключённым Higgsfield) вставь блок **«Сообщение для Claude chat»** ниже, а за ним нужную часть списка. Лучше по 8–12 картинок за раз.
2. Модели:
   - **фоны и текстуры** (без прозрачности): `nano_banana_pro`;
   - **предметы и спрайты** (с прозрачным фоном): `gpt_image_2_6` с параметром `background: transparent`.
3. Когда картинки готовы, попроси Claude chat дать **прямые ссылки** на файлы и вставь их сюда в Claude Code вместе с именами из таблицы. Я сам скачаю, уменьшу и разложу по папкам.
   Можно и вручную: скачай и положи в указанную папку под указанным именем (`.png` или `.jpg`, размер любой).

### Сообщение для Claude chat

```
Сгенерируй в Higgsfield картинки по списку ниже. Для строк «фон/текстура» используй модель nano_banana_pro,
для строк «спрайт» — gpt_image_2_6 с background: transparent. Соотношение сторон указано в каждой строке.
Ко всем промптам добавь в начало общий стиль:
"Anime cel-shaded game art, cozy kid-friendly sci-fi style, soft lavender, white, cyan-blue and warm orange palette, clean dark indigo outlines, soft shading, no text, no letters, no watermark."
Когда всё будет готово, дай мне прямые ссылки на каждый файл и подпиши их именами из списка.
```

---

## Часть 1. Финальное испытание «Последний шанс на Марсе» (папка `assets/mars/`)

### Сюжетные картинки (фон, 16:9)

| Имя файла | Промпт |
|---|---|
| `mars-intro` | Cute white spaceship with orange fins making an emergency landing on Mars, smoke trailing from a damaged engine, rusty orange dunes, pale butterscotch sky, dramatic but friendly mood |
| `mars-abandoned` | A lonely old abandoned spaceship half buried in red Martian sand in a canyon, dusty white hull with faded blue stripes, broken antenna, open hatch, warm afternoon light |
| `mars-launch` | Cute white spaceship with orange fins launching from the surface of Mars, bright blue engine flame, cloud of red dust, Mars sunset with a small blue sun, triumphant mood |
| `mars-card` | Young astronaut in a white spacesuit with orange stripes standing on Mars looking at an abandoned spaceship in the distance, rusty dunes, pinkish sky, adventure mood |

### Текстуры для мира от первого лица (фон, 1:1, бесшовные)

| Имя файла | Промпт |
|---|---|
| `mars-sky` (21:9) | Panoramic Martian sky above the horizon, pale butterscotch-pink sky fading to lavender at the top, distant low orange mountains along the bottom edge, two tiny moons, seamless horizontally, flat game background |
| `tex-mars-ground` | Seamless tileable texture of Martian ground seen from above, rusty orange sand with small dark pebbles and fine ripples, flat even lighting |
| `tex-mars-rock` | Seamless tileable texture of a red Martian canyon rock wall, layered orange-brown sandstone strata with cracks, flat even lighting, front view |
| `tex-hull-outside` | Seamless tileable texture of an old spaceship outer hull, dusty white metal panels with rivets, faded blue stripe, scratches and red Martian dust, front view, flat lighting |
| `tex-ship-wall` | Seamless tileable texture of an abandoned spaceship interior wall, lavender-white panels, dim broken light strip, scattered red dust, front view, flat lighting |
| `tex-ship-floor` | Seamless tileable texture of a spaceship metal floor grating with orange safety lines and red dust, seen from above, flat lighting |
| `tex-ship-door` | Front view of a closed sci-fi hatch door in a spaceship wall, white panels with orange stripe and a small cyan control light, dusty, square composition |
| `tex-ship-console` | Front view of a spaceship wall with a dark broken control console, cracked cyan screens, dangling wires, square composition, dusty |
| `tex-ship-engine` | Front view of an old spaceship engine room wall with a big round reactor hatch, pipes and an empty socket for a fuel module glowing faintly orange, square composition |

### Предметы (спрайт, прозрачный фон, 1:1)

| Имя файла | Промпт |
|---|---|
| `item-battery` | Big sci-fi spaceship battery block, white casing with orange stripes and a glowing cyan charge indicator, slightly dusty, single object centered |
| `item-cables` | Coiled bundle of thick power cables with orange and blue connectors, single object centered |
| `item-toolkit` | Opened astronaut repair toolkit case with wrench, screwdriver and pliers inside, white case with orange handle, single object centered |
| `item-fuel` | Cylindrical spaceship fuel module canister, white with orange bands, glowing blue fuel window, single object centered |
| `item-logbook` | Old crew data tablet with a cracked screen showing a glowing cyan log, a few loose paper notes beside it, single object centered |
| `item-keycard` | Small white access keycard with an orange stripe and a cyan chip, single object centered |

### Объекты мира (спрайт, прозрачный фон)

| Имя файла | Пропорции | Промпт |
|---|---|---|
| `obj-our-ship` | 3:2 | Cute white spaceship with orange fins standing on Mars on landing legs, damaged smoking engine, seen from the front-side, single object, no ground |
| `obj-rock1` | 1:1 | Single big red Martian boulder, single object, no ground |
| `obj-rock2` | 1:1 | Cluster of small orange-brown Martian rocks, single object, no ground |
| `obj-crate` | 1:1 | Old dusty supply crate with orange stripes and a faded expedition emblem, single object |
| `obj-rover` | 3:2 | Small broken six-wheeled Mars rover covered in red dust, single object, no ground |
| `obj-old-astronaut-flag` | 2:3 | Old expedition flag on a pole, faded white flag with a rocket emblem, single object, no ground |

### Интерфейс (спрайт, прозрачный фон)

| Имя файла | Пропорции | Промпт |
|---|---|---|
| `ui-visor` | 16:9 | First-person view through an astronaut helmet visor: only the thin rounded white-and-orange helmet frame around the edges with small cyan HUD lights, the whole center fully transparent |
| `ui-old-crew` | 1:1 | Friendly portrait of a bearded astronaut captain from an earlier expedition in an old white spacesuit, smiling, slightly faded photo look |

---

## Часть 2. Иконки, которых не хватало раньше (папка `assets/sprites/`)

Все — **спрайт, прозрачный фон, 1:1**. Общий конец промпта: *game icon, single object centered*.

| Имя файла | Что нарисовать |
|---|---|
| `tool-wrench` | Silver adjustable wrench with orange rubber grip |
| `tool-hose` | Coiled new flexible grey hose with a shiny metal hose clamp |
| `tool-scissors` | Pair of scissors with orange handles |
| `room-cab` | Tiny spaceship cockpit with two seats and a big window, isometric room icon |
| `room-lab` | Tiny science lab with microscope and test tubes, isometric room icon |
| `room-live` | Tiny crew quarters with bunk beds, isometric room icon |
| `room-store` | Tiny storage room with stacked crates, isometric room icon |
| `room-green` | Tiny space greenhouse with plants under lamps, isometric room icon |
| `room-lss` | Tiny life support room with oxygen tanks and pipes, isometric room icon |
| `room-lock` | Tiny airlock room with a round outer hatch, isometric room icon |
| `room-water` | Tiny storage room full of big blue water tanks, isometric room icon |
| `dev-computer` | Spaceship main computer with glowing cyan screen |
| `dev-telescope` | Small science space telescope with a lens cap |
| `dev-robot` | White robotic space arm folded up |
| `dev-lifesupport` | Life support unit with air fan and oxygen bubbles |
| `dev-dosimeter` | Handheld radiation dosimeter with a yellow screen |
| `dev-antenna` | Satellite dish antenna emitting cyan signal waves |
| `c-heat` | Small cabin heater glowing orange |
| `c-nav` | Navigation compass screen with a star map |
| `c-elight` | Small emergency lamp glowing dim red-orange |
| `c-light` | Bright ceiling light panel |
| `c-exp` | Science experiment box with a test tube and a plant sprout |
| `c-green` | Grow lamp shining on small plants |
| `c-screen` | Entertainment screen showing a cartoon rocket |
| `c-coffee` | Small space coffee machine with a cup |

Крупные планы поломок (**фон, 4:3**, папка `assets/sprites/`):

| Имя файла | Промпт |
|---|---|
| `leak-nut` | Close-up of a grey spaceship oxygen pipe joint with a loose hexagonal nut, white gas hissing out of the gap, lavender wall behind |
| `leak-crack` | Close-up of a grey spaceship oxygen pipe with a small crack from a micrometeorite, white gas bubbles leaking out, lavender wall behind |
