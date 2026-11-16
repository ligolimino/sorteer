/* ================================================================
   Letterlab — koppelen en sorteren

   Hetzelfde bestand staat in twee repositories:
   - koppel:  'Wat hoort bij elkaar?' Vaste items met een leeg vakje
              ernaast of eronder. De cursist sleept het juiste kaartje
              in elk vakje.
   - sorteer: 2 tot 4 groepen (bv. k en d). De cursist sleept elk
              kaartje naar de juiste groep.
   Welke tool het is, staat in index.html (<body data-tool="...">).

   Een kaartje (of vast item, of groepskop) kan tekst, een afbeelding
   en/of geluid hebben. In de link staan de delen met ~ ertussen:
       kat            alleen tekst
       b:kat          alleen een afbeelding (afbeeldingen/kat.webp ...)
       g:k            alleen geluid (een luisterknop)
       kat~b:kat      afbeelding met het woord eronder
       kat~g:kat      woord dat je kunt beluisteren
   Items staan na elkaar met | ertussen. Zie README.md.
   ================================================================ */

(function () {
    "use strict";

    /* ------------------------------------------------------------
       Instellingen die je zelf kunt aanpassen
       ------------------------------------------------------------ */

    // Alles staat centraal in de repository 'assets'.
    const CENTRAL = "../assets/";
    const IMAGE_FOLDERS = [`${CENTRAL}afbeeldingen/`, "assets/afbeeldingen/"];
    const AUDIO = `${CENTRAL}audio/`;
    const INSTRUCTION_FOLDERS = [`${AUDIO}instructies/`, "assets/audio/instructies/"];
    const IMAGE_EXTENSIONS = [".webp", ".jpg", ".png", ".jpeg"];
    const AUDIO_EXTENSIONS = [".mp3", ".m4a", ".wav"];

    // Hoe ver (in pixels) naast een vakje een kaartje nog vastklikt.
    const MAGNET_EXTRA_PX = 30;
    // Vanaf hoeveel pixels beweging een aanraking slepen is (en geen tik).
    const DRAG_START_PX = 6;
    // Grootste en kleinste maat van een kaartje (zie --u in styles.css).
    const MAX_UNIT = 150;
    const MIN_UNIT = 14;

    // Namen die Windows niet toelaat als bestandsnaam ('nul' → 'nul_').
    const RESERVED_NAMES = ["con", "prn", "aux", "nul"];

    /* ------------------------------------------------------------
       Link lezen
       ------------------------------------------------------------ */

    const TOOL = document.body.dataset.tool === "sorteer" ? "sorteer" : "koppel";
    const params = new URLSearchParams(window.location.search);
    const app = document.getElementById("app");

    function param(name) {
        return (params.get(name) || "").trim();
    }

    function isYes(value) {
        return ["ja", "j", "yes", "1", "true", "waar"].includes(value.toLowerCase());
    }

    function textSizeFactor(value) {
        const number = Number.parseFloat(String(value).replace(",", "."));
        if (!Number.isFinite(number) || number <= 0) {
            return 1;
        }
        return Math.min(2, Math.max(0.5, number / 100));
    }

    const settings = {
        vertical: ["verticaal", "v", "onder"].includes(param("richting").toLowerCase()),
        instant: ["meteen", "direct", "ja"].includes(param("nakijken").toLowerCase()),
        // Tekst zonder eigen geluid laat de opname van het woord (of de
        // klank) horen bij een tik.
        listen: isYes(param("luister")),
        compact: param("weergave").toLowerCase() !== "volledig",
        instruction: param("instructie"),
        textSize: textSizeFactor(param("grootte")),
    };

    // Eén item: "kat~b:kat~g:kat" → { text, image, sound, key }
    function parseItem(raw) {
        const item = { text: "", image: "", sound: "", key: "" };
        raw.split("~").forEach((piece) => {
            const part = piece.trim();
            if (!part) {
                return;
            }
            const match = part.match(/^([bg]):(.*)$/i);
            if (match && match[1].toLowerCase() === "b") {
                item.image = match[2].trim();
            } else if (match && match[1].toLowerCase() === "g") {
                item.sound = match[2].trim();
            } else {
                item.text = item.text ? `${item.text} ${part}` : part;
            }
        });
        item.key = [item.text, item.image, item.sound].join("~");
        return item.text || item.image || item.sound ? item : null;
    }

    function parseList(value) {
        return value
            .split("|")
            .map(parseItem)
            .filter(Boolean);
    }

    function shuffle(list) {
        for (let i = list.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [list[i], list[j]] = [list[j], list[i]];
        }
        return list;
    }

    // De oefening zelf.
    // targets: de plaatsen waar kaartjes naartoe kunnen
    //   koppel:  één vakje per vast item, met het juiste kaartje
    //   sorteer: één vak per groep, met alle kaartjes die erin horen
    // cards: alle kaartjes in het keuzevak (door elkaar)
    const exercise = { targets: [], cards: [] };

    function readExercise() {
        if (TOOL === "koppel") {
            const fixed = parseList(param("vast"));
            const answers = parseList(param("kaart"));
            const extras = parseList(param("extra"));
            const count = Math.min(fixed.length, answers.length);
            for (let i = 0; i < count; i += 1) {
                exercise.targets.push({ head: fixed[i], accepts: [answers[i].key] });
            }
            exercise.cards = [...answers.slice(0, count), ...extras];
        } else {
            const heads = parseList(param("groep")).slice(0, 4);
            heads.forEach((head, index) => {
                const members = parseList(param(`g${index + 1}`));
                exercise.targets.push({ head, accepts: members.map((m) => m.key), size: members.length });
                exercise.cards.push(...members);
            });
        }
        shuffle(exercise.cards);
        return TOOL === "koppel"
            ? exercise.targets.length > 0
            : exercise.targets.length >= 2 && exercise.cards.length > 0;
    }

    /* ------------------------------------------------------------
       Kleine hulpfuncties
       ------------------------------------------------------------ */

    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) {
            node.className = className;
        }
        if (text !== undefined) {
            node.textContent = text;
        }
        return node;
    }

    function icon(name, filled) {
        const ns = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(ns, "svg");
        svg.setAttribute("class", filled ? "icon filled" : "icon");
        svg.setAttribute("aria-hidden", "true");
        const use = document.createElementNS(ns, "use");
        use.setAttribute("href", `#i-${name}`);
        svg.appendChild(use);
        return svg;
    }

    function encodePath(path) {
        return path.split("/").map((segment) => encodeURIComponent(segment)).join("/");
    }

    function isLink(value) {
        return /^(https?:)?\/\//i.test(value) || /^\.{0,2}\//.test(value);
    }

    // Een naam uit de link → een lijst adressen om na elkaar te proberen.
    function mediaCandidates(value, folders, extensions) {
        if (!value) {
            return [];
        }
        if (isLink(value)) {
            return [value];
        }
        if (/\.[a-z0-9]{2,4}$/i.test(value)) {
            return folders.map((folder) => folder + encodePath(value));
        }
        return folders.flatMap((folder) => extensions.map((ext) => folder + encodePath(value + ext)));
    }

    // Waar kan de opname van een klank, woord, getal of zin staan?
    function soundCandidates(value) {
        if (!value) {
            return [];
        }
        if (isLink(value) || /\.(mp3|m4a|wav)$/i.test(value)) {
            return mediaCandidates(value, [AUDIO], AUDIO_EXTENSIONS);
        }
        const name = value.trim().toLowerCase();
        if (!/[\p{L}\p{N}]/u.test(name)) {
            return [];
        }
        if (/^\d+$/.test(name)) {
            return [`${AUDIO}getallen/${Number(name)}.mp3`];
        }
        const list = [];
        const sound = name === "ij" || name === "ei" ? "ij-ei" : name;
        const short = name.length <= 3;
        const soundFile = `${AUDIO}klanken/${encodeURIComponent(sound)}.mp3`;
        if (/\s/.test(name)) {
            // Een zin: de createpagina bewaart 'De koffie!' als 'de-koffie'.
            const plain = name.replace(/[.?!,;:]+$/, "").replace(/[^a-z0-9à-ÿ\s-]/g, "").trim();
            list.push(`${AUDIO}zinnen/${encodeURIComponent(plain.replace(/\s+/g, "-"))}.mp3`);
            return list;
        }
        const file = encodeURIComponent(RESERVED_NAMES.includes(name) ? `${name}_` : name);
        const first = encodeURIComponent(name.charAt(0));
        if (short) {
            list.push(soundFile);
        }
        list.push(`${AUDIO}woorden/${first}/${file}.mp3`, `${AUDIO}woorden/nonsens/${file}.mp3`);
        if (!short) {
            list.push(soundFile);
        }
        return list;
    }

    // Zoekt het eerste adres dat echt een geluid is (of null).
    const audioCache = new Map();
    function findAudio(candidates) {
        const key = candidates.join("|");
        if (audioCache.has(key)) {
            return audioCache.get(key);
        }
        const promise = new Promise((resolve) => {
            let index = 0;
            const tryNext = () => {
                if (index >= candidates.length) {
                    resolve(null);
                    return;
                }
                const source = candidates[index];
                index += 1;
                const probe = new Audio();
                probe.preload = "metadata";
                const done = (ok) => {
                    probe.removeAttribute("src");
                    if (ok) {
                        resolve(source);
                    } else {
                        tryNext();
                    }
                };
                probe.addEventListener("loadedmetadata", () => done(true), { once: true });
                probe.addEventListener("error", () => done(false), { once: true });
                probe.src = source;
            };
            tryNext();
        });
        audioCache.set(key, promise);
        return promise;
    }

    /* ------------------------------------------------------------
       Geluid afspelen (één geluid tegelijk)
       ------------------------------------------------------------ */

    const player = {
        audio: null,
        node: null,
        stop() {
            if (this.audio) {
                this.audio.pause();
            }
            if (this.node) {
                this.node.classList.remove("is-playing");
                if (this.node.classList.contains("play-btn")) {
                    this.node.replaceChildren(icon("play", true));
                }
            }
            this.audio = null;
            this.node = null;
        },
        play(node, source, toggle) {
            const same = this.node === node;
            this.stop();
            if ((toggle && same) || !source) {
                return;
            }
            const audio = new Audio(source);
            this.audio = audio;
            this.node = node;
            node.classList.add("is-playing");
            if (node.classList.contains("play-btn")) {
                node.replaceChildren(icon("pause"));
            }
            const end = () => {
                if (this.audio === audio) {
                    this.stop();
                }
            };
            audio.addEventListener("ended", end);
            audio.play().catch(end);
        },
    };

    /* ------------------------------------------------------------
       Kaartjes en vaste items opbouwen
       ------------------------------------------------------------ */

    // Maakt de inhoud van een kaartje of vast item. Het geluid wordt
    // opgezocht; pas als het bestaat, verschijnt het luidsprekertje.
    function fillItem(node, item) {
        node.classList.add("item");
        const hasImage = Boolean(item.image);
        const hasText = Boolean(item.text);
        if (hasImage) {
            node.classList.add("has-image");
            const img = el("img", "item-img");
            img.alt = item.text || "";
            img.draggable = false;
            const candidates = mediaCandidates(item.image, IMAGE_FOLDERS, IMAGE_EXTENSIONS);
            let index = 0;
            img.addEventListener("error", () => {
                index += 1;
                if (index < candidates.length) {
                    img.src = candidates[index];
                } else if (hasText) {
                    // Afbeelding niet gevonden: dan alleen het woord.
                    img.remove();
                    node.classList.remove("has-image");
                    node.classList.add("text-only");
                    scheduleFit();
                } else {
                    // Geen woord om op terug te vallen: een neutraal vlak.
                    const blank = el("span", "item-img missing");
                    img.replaceWith(blank);
                    scheduleFit();
                }
            });
            img.addEventListener("load", () => scheduleFit());
            img.src = candidates[0];
            node.appendChild(img);
        }
        if (hasText) {
            node.appendChild(el("span", "item-text", item.text));
        }
        node.classList.toggle("text-only", hasText && !hasImage);

        const soundName = item.sound || (settings.listen && hasText ? item.text : "");
        const soundOnly = !hasText && !hasImage;
        if (soundOnly) {
            node.classList.add("sound-only");
            node.appendChild(icon("speaker"));
            node.setAttribute("aria-label", "Luister");
        }
        node.dataset.sound = "";
        if (soundName) {
            findAudio(soundCandidates(soundName)).then((found) => {
                if (!found) {
                    return;
                }
                node.dataset.sound = found;
                if (!soundOnly) {
                    // Klein luidsprekertje in de hoek: dit kaartje kun je
                    // beluisteren.
                    const mark = el("span", "sound-mark");
                    mark.appendChild(icon("speaker"));
                    node.appendChild(mark);
                }
            });
        }
        return node;
    }

    function playItem(node) {
        if (node.dataset.sound) {
            player.play(node, node.dataset.sound, false);
        }
    }

    /* ------------------------------------------------------------
       Uitlegpagina als er geen (geldige) oefening in de link staat
       ------------------------------------------------------------ */

    function showHelp() {
        const base = window.location.pathname;
        const koppel = TOOL === "koppel";
        const examples = koppel
            ? [
                ["Kleine letter bij hoofdletter", "?vast=a|e|o|i|u&kaart=A|E|O|I|U"],
                ["Klank bij letter (luisterknoppen)", "?vast=g:k|g:m|g:s&kaart=k|m|s&extra=p"],
                ["Woord bij afbeelding, verticaal", "?vast=b:kat|b:vis|b:maan&kaart=kat|vis|maan&richting=verticaal"],
                ["Meteen nakijken, woorden beluisteren", "?vast=a|e|o&kaart=A|E|O&nakijken=meteen&luister=ja"],
            ]
            : [
                ["Woorden bij k of d", "?groep=k|d&g1=kat|kip|kam&g2=das|dak|doos"],
                ["Met luisterknoppen, verticaal", "?groep=k~g:k|d~g:d&g1=kat|kip&g2=das|dak&richting=verticaal&luister=ja"],
                ["Drie groepen, meteen nakijken", "?groep=a|o|i&g1=kat|tak&g2=bol|pot&g3=vis|kip&nakijken=meteen"],
            ];
        const help = el("section", "help");
        help.innerHTML = koppel
            ? `<h1>Letterlab — wat hoort bij elkaar?</h1>
               <p>Deze pagina verschijnt omdat de link nog geen oefening bevat.
               Maak een oefening het eenvoudigst met de createpagina.</p>
               <table>
                 <tr><th>In de link</th><th>Betekenis</th></tr>
                 <tr><td><code>vast=a|e|o</code></td><td>De vaste items, met een leeg vakje erbij.</td></tr>
                 <tr><td><code>kaart=A|E|O</code></td><td>De kaartjes, in dezelfde volgorde: het eerste kaartje hoort bij het eerste vaste item.</td></tr>
                 <tr><td><code>extra=U|I</code></td><td>Extra kaartjes die nergens bij horen (afleiders).</td></tr>
                 ${commonRows()}
               </table>`
            : `<h1>Letterlab — sorteren</h1>
               <p>Deze pagina verschijnt omdat de link nog geen oefening bevat.
               Maak een oefening het eenvoudigst met de createpagina.</p>
               <table>
                 <tr><th>In de link</th><th>Betekenis</th></tr>
                 <tr><td><code>groep=k|d</code></td><td>De groepen (2 tot 4).</td></tr>
                 <tr><td><code>g1=kat|kip</code></td><td>De kaartjes die bij groep 1 horen. Zo ook <code>g2=</code>, <code>g3=</code> en <code>g4=</code>.</td></tr>
                 ${commonRows()}
               </table>`;
        help.insertAdjacentHTML("beforeend", "<p><b>Voorbeelden</b></p>");
        const list = el("ul");
        examples.forEach(([label, query]) => {
            const item = el("li");
            const link = el("a", "", label);
            link.href = base + query;
            item.appendChild(link);
            list.appendChild(item);
        });
        help.appendChild(list);
        app.replaceChildren(help);
        app.classList.add("help-page");
    }

    function commonRows() {
        return `
            <tr><td>Een item</td><td>Tekst, afbeelding en/of geluid met <code>~</code> ertussen:
                <code>kat</code>, <code>b:kat</code> (afbeelding), <code>g:k</code> (luisterknop),
                <code>kat~b:kat</code> (afbeelding met woord).</td></tr>
            <tr><td><code>richting=verticaal</code></td><td>Onder elkaar in plaats van naast elkaar.</td></tr>
            <tr><td><code>nakijken=meteen</code></td><td>Elk kaartje meteen nakijken: een fout kaartje springt terug.
                Zonder deze toevoeging wordt nagekeken als alles op zijn plaats staat.</td></tr>
            <tr><td><code>luister=ja</code></td><td>Tik op een woord of letter: de opname is te horen (als ze bestaat).</td></tr>
            <tr><td><code>weergave=volledig</code></td><td>Volledige versie met instructie-audio. Zonder deze toevoeging: doorzichtig, voor Genially.</td></tr>
            <tr><td><code>instructie=</code></td><td>Instructie-audio uit de map <code>audio/instructies/</code>.</td></tr>
            <tr><td><code>grootte=80</code></td><td>Kaartjes kleiner (50 tot 100).</td></tr>`;
    }

    /* ------------------------------------------------------------
       De pagina opbouwen
       ------------------------------------------------------------ */

    const cardNodes = [];     // per kaartje: het kaartje zelf
    const homeNodes = [];     // per kaartje: zijn vaste plaats in het keuzevak
    const targetNodes = [];   // per vakje of groep: de plaats om te droppen
    let boardNode;
    let bankNode;
    let feedbackNode;
    let stageNode;

    // Waar staat elk kaartje? -1 = in het keuzevak, anders het nummer van
    // het vakje of de groep.
    const state = {
        place: [],
        locked: [],
        result: "",
        selected: -1,
    };

    function build() {
        const children = [];
        if (!settings.compact) {
            const instruction = mediaCandidates(settings.instruction, INSTRUCTION_FOLDERS, AUDIO_EXTENSIONS);
            if (instruction.length > 0) {
                const bar = el("div", "instruction-bar");
                const button = el("button", "play-btn is-hidden");
                button.type = "button";
                button.setAttribute("aria-label", "Luister naar de opdracht");
                button.appendChild(icon("play", true));
                bar.appendChild(button);
                children.push(bar);
                findAudio(instruction).then((found) => {
                    if (found) {
                        button.classList.remove("is-hidden");
                        button.addEventListener("click", () => player.play(button, found, true));
                    } else {
                        bar.remove();
                        scheduleFit();
                    }
                });
            }
        }

        stageNode = el("section", "stage");
        boardNode = el("div", `board ${TOOL}`);
        exercise.targets.forEach((target, index) => {
            const group = el("div", TOOL === "koppel" ? "pair" : "group");
            const head = fillItem(el("div", TOOL === "koppel" ? "fixed" : "head"), target.head);
            const drop = el("div", TOOL === "koppel" ? "slot" : "zone");
            drop.dataset.target = String(index);
            group.append(head, drop);
            boardNode.appendChild(group);
            targetNodes.push(drop);
        });
        stageNode.appendChild(boardNode);
        feedbackNode = el("div", "feedback");
        stageNode.appendChild(feedbackNode);

        bankNode = el("div", "bank");
        bankNode.setAttribute("aria-label", "Kaartjes");
        exercise.cards.forEach((card, index) => {
            const home = el("div", "home");
            const node = fillItem(el("div", "card"), card);
            node.dataset.card = String(index);
            node.tabIndex = 0;
            node.setAttribute("role", "button");
            home.appendChild(node);
            bankNode.appendChild(home);
            cardNodes.push(node);
            homeNodes.push(home);
            state.place.push(-1);
            state.locked.push(false);
        });

        const main = el("div", "main");
        main.append(stageNode, bankNode);
        children.push(main);
        app.replaceChildren(...children);
        app.classList.add(TOOL, settings.vertical ? "vertical" : "horizontal");
        if (settings.compact) {
            document.documentElement.classList.add("compact");
            app.classList.add("compact");
        }
    }

    /* ------------------------------------------------------------
       Automatische maat: alles past op het scherm, zonder scrollen
       ------------------------------------------------------------ */

    // Alle kaartjes zijn even groot (het grootste kaartje bepaalt de maat),
    // zodat de vorm van een kaartje geen hint geeft. Vaste items en
    // groepskoppen krijgen samen ook één maat.
    function sizeItems() {
        app.style.removeProperty("--cw");
        app.style.removeProperty("--ch");
        app.style.removeProperty("--fw");
        app.style.removeProperty("--fh");
        let cw = 0;
        let ch = 0;
        cardNodes.forEach((node) => {
            cw = Math.max(cw, node.offsetWidth);
            ch = Math.max(ch, node.offsetHeight);
        });
        let fw = 0;
        let fh = 0;
        boardNode.querySelectorAll(".fixed, .head").forEach((node) => {
            fw = Math.max(fw, node.offsetWidth);
            fh = Math.max(fh, node.offsetHeight);
        });
        app.style.setProperty("--cw", `${Math.ceil(cw)}px`);
        app.style.setProperty("--ch", `${Math.ceil(ch)}px`);
        app.style.setProperty("--fw", `${Math.ceil(fw)}px`);
        app.style.setProperty("--fh", `${Math.ceil(fh)}px`);
        sizeZones();
    }

    // Een groep (sorteren) krijgt plaats voor de kaartjes die erin horen,
    // plus één. Bij meer kaartjes groeit de groep mee. Hoeveel kaartjes
    // naast elkaar passen, kiest fit(): de verdeling met de grootste
    // kaartjes wint.
    let zoneCols = 1;

    function zoneCapacity() {
        return Math.max(...exercise.targets.map((t) => t.size)) + 1;
    }

    function zoneOptions() {
        if (TOOL !== "sorteer") {
            return [0];
        }
        const most = zoneCapacity();
        const options = [];
        for (let cols = 1; cols <= most; cols += 1) {
            const rows = Math.ceil(most / cols);
            // Alleen verdelingen zonder overbodige lege rij.
            if (cols === 1 || Math.ceil(most / (cols - 1)) !== rows) {
                options.push(cols);
            }
        }
        return options;
    }

    function sizeZones() {
        if (TOOL !== "sorteer") {
            return;
        }
        const most = zoneCapacity();
        const cols = Math.min(zoneCols, most);
        app.style.setProperty("--zone-cols", String(cols));
        app.style.setProperty("--zone-rows", String(Math.ceil(most / cols)));
    }

    function overflowing() {
        const tooHigh = app.scrollHeight > app.clientHeight + 1;
        const tooWide = app.scrollWidth > app.clientWidth + 1;
        const main = app.querySelector(".main");
        const mainOver = main && (main.scrollWidth > main.clientWidth + 1 || main.scrollHeight > main.clientHeight + 1);
        const rows = [boardNode, bankNode].some((node) => node.scrollWidth > node.clientWidth + 1);
        // Steekt iets boven, onder of naast het scherm uit (ook bij
        // centreren)?
        const box = app.getBoundingClientRect();
        const outside = [boardNode, bankNode, feedbackNode].some((node) => {
            const r = node.getBoundingClientRect();
            return r.top < box.top - 1 || r.bottom > box.bottom + 1 || r.left < box.left - 1 || r.right > box.right + 1;
        });
        return tooHigh || tooWide || mainOver || rows || outside;
    }

    let fitTimer = 0;
    function scheduleFit() {
        window.clearTimeout(fitTimer);
        fitTimer = window.setTimeout(fit, 60);
    }

    function apply(unit) {
        app.style.setProperty("--u", `${unit.toFixed(1)}px`);
        sizeItems();
    }

    function fit() {
        if (!boardNode) {
            return;
        }
        // Verticaal koppelen op een breed scherm: kaartjes rechts.
        const wide = app.clientWidth > app.clientHeight * 1.15;
        app.classList.toggle("side-bank", settings.vertical && TOOL === "koppel" && wide);
        const largest = () => {
            let low = MIN_UNIT;
            let high = MAX_UNIT * Math.max(1, settings.textSize);
            apply(high);
            if (!overflowing()) {
                return high;
            }
            for (let step = 0; step < 11; step += 1) {
                const middle = (low + high) / 2;
                apply(middle);
                if (overflowing()) {
                    high = middle;
                } else {
                    low = middle;
                }
            }
            return low;
        };
        let best = { unit: 0, cols: 1 };
        zoneOptions().forEach((cols) => {
            zoneCols = cols;
            const unit = largest();
            // Een bredere verdeling moet merkbaar grotere kaartjes geven.
            if (unit > best.unit * 1.05) {
                best = { unit, cols };
            }
        });
        zoneCols = best.cols;
        apply(Math.max(MIN_UNIT, best.unit * Math.min(1, settings.textSize)));
    }

    /* ------------------------------------------------------------
       Kaartjes verplaatsen
       ------------------------------------------------------------ */

    function cardsIn(target) {
        return state.place
            .map((place, index) => (place === target ? index : -1))
            .filter((index) => index >= 0);
    }

    function select(index) {
        state.selected = index;
        cardNodes.forEach((node, i) => node.classList.toggle("selected", i === index));
        targetNodes.forEach((node) => node.classList.toggle("can-drop", index >= 0));
    }

    // Zet kaartje 'index' in vakje/groep 'target' (-1 = terug naar het
    // keuzevak).
    function moveCard(index, target) {
        clearResult();
        select(-1);
        if (target >= 0 && TOOL === "koppel") {
            // Een vakje heeft plaats voor één kaartje: wat erin stond, gaat
            // terug naar het keuzevak.
            cardsIn(target).forEach((other) => {
                if (other !== index) {
                    placeCard(other, -1);
                }
            });
        }
        placeCard(index, target);
        if (target >= 0 && settings.instant) {
            checkOne(index);
            return;
        }
        if (target >= 0 && allPlaced()) {
            window.setTimeout(checkAll, 220);
        }
        if (overflowing()) {
            scheduleFit();
        }
    }

    function placeCard(index, target) {
        state.place[index] = target;
        const node = cardNodes[index];
        node.classList.remove("good", "wrong");
        if (target < 0) {
            homeNodes[index].appendChild(node);
        } else {
            targetNodes[target].appendChild(node);
        }
        targetNodes.forEach((drop, i) => drop.classList.toggle("filled", cardsIn(i).length > 0));
    }

    function isRight(index, target) {
        return target >= 0 && exercise.targets[target].accepts.includes(exercise.cards[index].key);
    }

    function allPlaced() {
        if (TOOL === "koppel") {
            return targetNodes.every((_, target) => cardsIn(target).length > 0);
        }
        return state.place.every((place) => place >= 0);
    }

    function allDone() {
        if (TOOL === "koppel") {
            return targetNodes.every((_, target) => cardsIn(target).some((i) => state.locked[i]));
        }
        return state.locked.every(Boolean);
    }

    // Nakijken = meteen: één kaartje.
    function checkOne(index) {
        const target = state.place[index];
        const node = cardNodes[index];
        if (isRight(index, target)) {
            state.locked[index] = true;
            node.classList.add("good", "locked");
            if (allDone()) {
                finish(true);
            }
            return;
        }
        node.classList.add("wrong");
        window.setTimeout(() => {
            if (state.place[index] === target && !state.locked[index]) {
                glideHome(index);
            }
        }, 650);
    }

    // Nakijken als alles geplaatst is.
    function checkAll() {
        if (!allPlaced() || state.result) {
            return;
        }
        // Alleen de foute kaartjes worden rood (zoals in de sleep-
        // oefening): de juiste worden pas groen als alles juist is, zodat
        // de oplossing niet verklapt wordt.
        let good = true;
        state.place.forEach((target, index) => {
            if (target >= 0 && !isRight(index, target)) {
                cardNodes[index].classList.add("wrong");
                good = false;
            }
        });
        if (good) {
            state.place.forEach((target, index) => {
                if (target >= 0) {
                    cardNodes[index].classList.add("good");
                }
            });
        }
        finish(good);
    }

    function finish(good) {
        state.result = good ? "good" : "wrong";
        player.stop();
        app.classList.add("has-result");
        feedbackNode.replaceChildren();
        feedbackNode.className = `feedback ${good ? "good" : "bad"}`;
        feedbackNode.appendChild(icon(good ? "check" : "close"));
        const retry = el("button", `retry-btn ${good ? "good" : "bad"}`);
        retry.type = "button";
        retry.setAttribute("aria-label", "Opnieuw");
        retry.appendChild(icon("retry"));
        retry.addEventListener("click", resetAll);
        feedbackNode.appendChild(retry);
        if (good) {
            app.classList.add("done");
            state.locked = state.locked.map(() => true);
            cardNodes.forEach((node) => node.classList.add("locked"));
        }
        try {
            window.parent.postMessage({ bron: `letterlab-${TOOL}`, resultaat: state.result }, "*");
        } catch (error) {
            /* geen omringende pagina */
        }
    }

    function clearResult() {
        if (!state.result) {
            return;
        }
        state.result = "";
        app.classList.remove("has-result", "done");
        feedbackNode.className = "feedback";
        feedbackNode.replaceChildren();
        cardNodes.forEach((node, index) => {
            if (!state.locked[index]) {
                node.classList.remove("good", "wrong");
            }
        });
    }

    function resetAll() {
        player.stop();
        clearResult();
        select(-1);
        state.locked = state.locked.map(() => false);
        cardNodes.forEach((node, index) => {
            node.classList.remove("good", "wrong", "locked");
            placeCard(index, -1);
        });
    }

    /* ------------------------------------------------------------
       Slepen, tikken en vastklikken
       ------------------------------------------------------------ */

    let drag = null;

    function centerOf(rect) {
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }

    // Het vakje of de groep onder (of vlak bij) een punt.
    function targetAt(point) {
        let best = -1;
        let bestDistance = Infinity;
        targetNodes.forEach((node, index) => {
            const rect = node.getBoundingClientRect();
            const inside = point.x >= rect.left && point.x <= rect.right
                && point.y >= rect.top && point.y <= rect.bottom;
            const c = centerOf(rect);
            const distance = inside ? 0 : Math.hypot(point.x - c.x, point.y - c.y);
            const reach = Math.max(rect.width, rect.height) * 0.75 + MAGNET_EXTRA_PX;
            if ((inside || distance <= reach) && distance < bestDistance) {
                best = index;
                bestDistance = distance;
            }
        });
        return best;
    }

    function overBank(point) {
        const rect = bankNode.getBoundingClientRect();
        return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
    }

    function makeGhost(node) {
        const rect = node.getBoundingClientRect();
        const ghost = node.cloneNode(true);
        ghost.classList.add("ghost");
        ghost.classList.remove("selected", "good", "wrong");
        ghost.style.width = `${rect.width}px`;
        ghost.style.height = `${rect.height}px`;
        ghost.style.transform = `translate(${rect.left}px, ${rect.top}px)`;
        app.appendChild(ghost);
        return { ghost, rect };
    }

    function glide(ghost, rect, then) {
        let finished = false;
        const finish = () => {
            if (finished) {
                return;
            }
            finished = true;
            ghost.remove();
            then();
        };
        ghost.style.transition = "transform 0.18s ease-out";
        ghost.style.transform = `translate(${rect.left}px, ${rect.top}px)`;
        ghost.addEventListener("transitionend", finish, { once: true });
        window.setTimeout(finish, 260);
    }

    // Een kaartje glijdt netjes naar een vakje, groep of terug.
    function glideTo(index, target) {
        const node = cardNodes[index];
        const { ghost } = makeGhost(node);
        node.classList.add("in-flight");
        const destination = target >= 0 ? targetNodes[target] : homeNodes[index];
        const box = destination.getBoundingClientRect();
        // In een groep: naar het eerste vrije plekje (ongeveer).
        let rect = box;
        if (target >= 0 && TOOL === "sorteer") {
            const others = cardsIn(target).filter((i) => i !== index);
            const last = others.length ? cardNodes[others[others.length - 1]].getBoundingClientRect() : null;
            rect = last
                ? { left: last.right + 6, top: last.top }
                : { left: box.left + 6, top: box.top + 6 };
        }
        requestAnimationFrame(() =>
            glide(ghost, rect, () => {
                node.classList.remove("in-flight");
                moveCard(index, target);
            }),
        );
    }

    function glideHome(index) {
        const node = cardNodes[index];
        const { ghost } = makeGhost(node);
        node.classList.add("in-flight");
        placeCard(index, -1);
        requestAnimationFrame(() =>
            glide(ghost, homeNodes[index].getBoundingClientRect(), () => {
                node.classList.remove("in-flight", "wrong");
            }),
        );
    }

    function onCardDown(event, index) {
        if (event.button !== 0 || state.locked[index]) {
            return;
        }
        event.preventDefault();
        drag = {
            pointerId: event.pointerId,
            index,
            node: event.currentTarget,
            startX: event.clientX,
            startY: event.clientY,
            moved: false,
        };
        try {
            drag.node.setPointerCapture(event.pointerId);
        } catch (error) {
            /* niet overal ondersteund */
        }
    }

    function onMove(event) {
        if (!drag || event.pointerId !== drag.pointerId) {
            return;
        }
        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;
        if (!drag.moved) {
            if (Math.hypot(dx, dy) < DRAG_START_PX) {
                return;
            }
            drag.moved = true;
            player.stop();
            select(-1);
            const { ghost, rect } = makeGhost(drag.node);
            drag.ghost = ghost;
            drag.offsetX = drag.startX - rect.left;
            drag.offsetY = drag.startY - rect.top;
            drag.node.classList.add("in-flight");
        }
        const x = event.clientX - drag.offsetX;
        const y = event.clientY - drag.offsetY;
        drag.ghost.style.transform = `translate(${x}px, ${y}px) scale(1.06)`;
        const point = centerOf(drag.ghost.getBoundingClientRect());
        // Boven het keuzevak: daar gaat het kaartje naartoe.
        const near = overBank(point) ? -1 : targetAt(point);
        targetNodes.forEach((node, i) => node.classList.toggle("near", i === near));
        event.preventDefault();
    }

    function onUp(event) {
        if (!drag || event.pointerId !== drag.pointerId) {
            return;
        }
        const current = drag;
        drag = null;
        targetNodes.forEach((node) => node.classList.remove("near"));
        if (!current.moved) {
            tapCard(current.index);
            return;
        }
        const point = centerOf(current.ghost.getBoundingClientRect());
        const from = state.place[current.index];
        let target = overBank(point) ? -1 : targetAt(point);
        if (target < 0 && !(from >= 0 && overBank(point))) {
            // Nergens bij: terug naar waar het stond.
            target = from;
        }
        const node = cardNodes[current.index];
        const destination = target >= 0 ? targetNodes[target] : homeNodes[current.index];
        let rect = destination.getBoundingClientRect();
        if (target >= 0 && TOOL === "sorteer" && target !== from) {
            const others = cardsIn(target);
            const last = others.length ? cardNodes[others[others.length - 1]].getBoundingClientRect() : null;
            rect = last ? { left: last.right + 6, top: last.top } : { left: rect.left + 6, top: rect.top + 6 };
        } else if (target === from && from >= 0) {
            rect = node.getBoundingClientRect();
        }
        glide(current.ghost, rect, () => {
            node.classList.remove("in-flight");
            if (target !== from) {
                moveCard(current.index, target);
            }
        });
    }

    function onCancel() {
        if (!drag) {
            return;
        }
        if (drag.ghost) {
            drag.ghost.remove();
        }
        drag.node.classList.remove("in-flight");
        drag = null;
        targetNodes.forEach((node) => node.classList.remove("near"));
    }

    // Tik op een kaartje: het wordt gekozen (en laat zijn geluid horen).
    // Tik daarna op een vakje of groep om het daar te zetten. Nog eens
    // tikken op hetzelfde kaartje: niet meer gekozen.
    function tapCard(index) {
        playItem(cardNodes[index]);
        if (state.result === "good" || state.locked[index]) {
            return;
        }
        select(state.selected === index ? -1 : index);
    }

    function tapTarget(target) {
        if (state.selected < 0) {
            return;
        }
        const index = state.selected;
        if (state.place[index] === target) {
            select(-1);
            return;
        }
        select(-1);
        glideTo(index, target);
    }

    function tapBank() {
        const index = state.selected;
        if (index < 0 || state.place[index] < 0) {
            return;
        }
        select(-1);
        glideTo(index, -1);
    }

    function wireEvents() {
        cardNodes.forEach((node, index) => {
            node.addEventListener("pointerdown", (event) => onCardDown(event, index));
            node.addEventListener("keydown", (event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    tapCard(index);
                }
            });
        });
        targetNodes.forEach((node, target) => {
            node.addEventListener("click", (event) => {
                if (event.target.closest(".card")) {
                    return;
                }
                tapTarget(target);
            });
        });
        bankNode.addEventListener("click", (event) => {
            if (!event.target.closest(".card")) {
                tapBank();
            }
        });
        // Vaste items en groepskoppen: tik om te luisteren.
        boardNode.querySelectorAll(".fixed, .head").forEach((node) => {
            node.addEventListener("click", () => playItem(node));
        });
        document.addEventListener("pointermove", onMove, { passive: false });
        document.addEventListener("pointerup", onUp);
        document.addEventListener("pointercancel", onCancel);
        window.addEventListener("blur", onCancel);
        window.addEventListener("resize", scheduleFit);
    }

    /* ------------------------------------------------------------
       Start
       ------------------------------------------------------------ */

    if (!readExercise()) {
        showHelp();
        return;
    }
    document.title = TOOL === "koppel" ? "Letterlab — wat hoort bij elkaar?" : "Letterlab — sorteren";
    build();
    wireEvents();
    fit();
    if (document.fonts && document.fonts.ready) {
        document.fonts.load("400 40px Andika", "abc").catch(() => null)
            .then(() => document.fonts.ready)
            .then(fit);
    }

    // Voor de tests: de toestand van buitenaf kunnen bekijken.
    window.__oefening = { state, exercise };
})();
