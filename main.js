/* The First Cup — 最小限のふるまい。ライブラリなし。 */
(() => {
  "use strict";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. スクロールで要素をあらわす ---------- */
  const targets = document.querySelectorAll(".figure, .callout, .big-para, .closing");
  targets.forEach(el => el.classList.add("reveal"));
  if (reduce || !("IntersectionObserver" in window)) {
    targets.forEach(el => el.classList.add("in"));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });
    targets.forEach(el => io.observe(el));
  }

  /* ---------- 2. クイズ（外しても恥にしない） ----------
     ★4つとも同じ形にする: 「それは○○です」→ flat white との違いを1つだけ。
     "Not quite" は使わない。正解を当てたあとに別のカップを押しても文が壊れないため。
     ★根拠は本文に書かず、出典 8 に置く（無用な説明を本文に入れない）。
       latte / flat white  材料は似ているが、latte の方が大きくミルクが多い
       cappuccino          上に厚い泡の層（INEI: ミルク100 ml を泡立てて約125 ml）
       cortado             espresso と同量のミルク・泡なし
     ★数値を触るときは index.html の出典 8 と必ずそろえる。 */
  const ANSWERS = {
    "latte": "That is a latte. Like a flat white, but larger and with more milk.",
    "cappuccino": "That is a cappuccino. It has more foam than a flat white.",
    "flat white": "Yes — that is the flat white. Like a latte, but smaller and with less milk.",
    "cortado": "That is a cortado. It has equal parts espresso and milk, with no foam."
  };
  const quiz = document.getElementById("quiz");
  if (quiz) {
    const opts = [...quiz.querySelectorAll(".quiz-opt")];
    const out = quiz.querySelector(".quiz-result");
    opts.forEach(btn => {
      btn.setAttribute("aria-pressed", "false");
      btn.addEventListener("click", () => {
        // 押したあとも全部押せる。4つのカップの名前を順に確かめられるようにする
        opts.forEach(o => o.setAttribute("aria-pressed", "false"));
        btn.setAttribute("aria-pressed", "true");
        const picked = btn.dataset.name;
        out.textContent = ANSWERS[picked] || "";
      });
    });
  }

  /* ---------- 2d. 配合マップのラベル位置 ---------- */
  const drinkMap = document.querySelector("#fig-space .c-space");
  if (drinkMap) {
    const labels = [...drinkMap.querySelectorAll("text")];
    const espressoMacchiato = labels.find(el => el.textContent.trim() === "ESPRESSO MACCHIATO");
    const latteLabel = labels.find(el => el.textContent.trim() === "LATTE");
    const espressoMacchiatoLine = drinkMap.querySelector('line[x1="241.2"][y1="460.1"]');
    const latteLine = drinkMap.querySelector('line[x1="626.2"][y1="482.8"]');

    if (espressoMacchiato) {
      espressoMacchiato.setAttribute("x", "278");
      espressoMacchiato.setAttribute("y", "414");
      espressoMacchiato.setAttribute("text-anchor", "start");
    }
    if (espressoMacchiatoLine) {
      espressoMacchiatoLine.setAttribute("x1", "261.8");
      espressoMacchiatoLine.setAttribute("y1", "458");
      espressoMacchiatoLine.setAttribute("x2", "274");
      espressoMacchiatoLine.setAttribute("y2", "420");
    }
    if (latteLabel) {
      latteLabel.setAttribute("x", "575");
      latteLabel.setAttribute("y", "456");
      latteLabel.setAttribute("text-anchor", "end");
    }
    if (latteLine) {
      latteLine.setAttribute("x1", "604.5");
      latteLine.setAttribute("y1", "456.5");
      latteLine.setAttribute("x2", "580");
      latteLine.setAttribute("y2", "452");
    }
  }

  /* ---------- 3. Build your own（最近傍で名前を当てる） ----------
     2c/2d と同じ6次元（espresso / brewed / milk / foam / water / choc の割合）で
     15種と比べ、いちばん近いものを答える。魔法ではなく最近傍探索。

     ★2026-08-11 全部作り直した。直した点3つ:
       1. **配合を出典値にした**（`analyze_drink_space.py` → CSV が正本）。
          この配列は `_gen_drinks.py` が CSV から生成する。**手で書き換えない。**
       2. ★**`other` を `brewed` と `choc` に割った。** 旧版は1つの次元に
          チョコ（mocha）とドリップ（café au lait）を混ぜていたので、
          読者がチョコを入れると café au lait が返るという誤りがあった。
       3. **Breve を落とした**（分量の出典が無い）。16種 → 15種。

     ⚠️`brewed`（ドリップ）は読者側の選択肢に無い。だから café au lait は当たらない。
       読者が作れるのは espresso 系だけ、という状態を正しく反映している。
     出典: /Users/yyyoshie/sandbox/data/drink_composition_space.csv */
  const PARTS = ["espresso", "brewed", "milk", "foam", "water", "choc"];
  const DRINKS = [
    ["Ristretto", [1, 0, 0, 0, 0, 0], 20, "espresso only"],
    ["Espresso", [1, 0, 0, 0, 0, 0], 27.5, "espresso only"],
    ["Doppio", [1, 0, 0, 0, 0, 0], 60, "espresso only"],
    ["Lungo", [1, 0, 0, 0, 0, 0], 60, "espresso only"],
    ["Americano", [0.2, 0, 0, 0, 0.8, 0], 150, "espresso→water"],
    ["Long black", [0.2143, 0, 0, 0, 0.7857, 0], 140, "water→espresso"],
    ["Espresso macchiato", [0.8, 0, 0.2, 0, 0, 0], 37.5, "espresso→milk"],
    ["Cortadito", [0.4615, 0, 0.4615, 0.0769, 0, 0], 65, "espumita→espresso→milk"],
    ["Cortado", [0.5, 0, 0.5, 0, 0, 0], 60, "espresso→milk"],
    ["Café au lait", [0, 0.5, 0.5, 0, 0, 0], 240, "brewed+milk"],
    ["Flat white", [0.1714, 0, 0.8, 0.0286, 0, 0], 175, "espresso→milk"],
    ["Latte", [0.1333, 0, 0.8667, 0, 0, 0], 225, "espresso→milk"],
    ["Latte macchiato", [0.0667, 0, 0.9333, 0, 0, 0], 225, "milk→espresso"],
    ["Caffè mocha", [0.1333, 0, 0.7556, 0, 0, 0.1111], 225, "choc→espresso→milk"],
    ["Cappuccino", [0.1667, 0, 0.6667, 0.1667, 0, 0], 150, "espresso→milk→foam"]
  ];

  /* 段（0〜5）→ ml。実在するレシピの上に目盛りが乗るように選んである。
     こうすると「メニューに近いものがない」がほとんど出ない。
     バーをやめて5段にしたのは、バーは動きが大きすぎて値が曖昧になるため。 */
  /* ★段は 0〜3。5段だと選択肢が多いだけで曖昧になり、どのメニューにも無い
     組み合わせ（コーヒー0杯、湯150ml＋ミルク240ml など）が増える。

     ★そして泡は独立した材料ではない。泡はミルクを泡立てて作る。
     だから「泡」の段は量ではなく《ミルクのうちどれだけを泡にするか》を選ぶ。
     こうすると泡100%のような物理的にあり得ない状態が構造的に作れない。 */
  const STEPS = {
    espresso: [27.5, 45, 70],       // 1〜3。single / double / lungo
    dairy:    [0, 35, 135, 215],    // 0〜3。ミルクの総量（泡になる分を含む）
    water:    [0, 45, 90, 135],     // 0〜3。90ml がアメリカーノ
    choc:     [0, 12, 25]           // 0〜2。チョコレート（旧 `other`。名前を中身に合わせた）
  };
  // ミルクのうち泡にする割合。0.5 でカプチーノ、0.06 でフラットホワイト。
  const FOAM_FRAC = [0, 0.06, 0.25, 0.5];
  const MIN = { espresso: 1, dairy: 0, foam: 0, water: 0, choc: 0 };
  const MAX = { espresso: 3, dairy: 3, foam: 3, water: 3, choc: 2 };
  const VESSEL = (ml) => ml < 90 ? "demitasse" : ml < 200 ? "tumbler" : "mug";
  /* 器の容量。液面の高さは「量 ÷ 器の容量」で決まる。
     器は量で選ばれるので、同じ器の中で量が増えれば液面も上がる。
     最大は espresso 70 + milk 215 + chocolate 25 = 310 ml。 */
  const CAP = { demitasse: 90, tumbler: 200, mug: 320 };

  /* 器の内側の寸法（index.html の clipPath と必ず同じ値にする）。
     top/bot = 内側の上端と下端の y。SVG の viewBox は 200×260。
     ★デザイナーの器に差し替えるときは、clipPath のパスとこの3つだけを直す。 */
  const VESSELS = {
    demitasse: { top: 158, bot: 240 },
    tumbler: { top: 64, bot: 240 },
    mug: { top: 56, bot: 240 }
  };
  // 材料ごとのしずくの色（層と同じ色にする）
  const DROP_FILL = {
    espresso: "var(--d4)", water: "var(--d2)", dairy: "var(--d1)",
    foam: "var(--cream)", choc: "var(--d3)", brewed: "var(--d3)"
  };

  const sim = document.getElementById("sim");
  if (sim) {
    const steps = [...sim.querySelectorAll(".step")];
    const layers = {};
    sim.querySelectorAll(".cup-layer").forEach(b => { layers[b.dataset.part] = b; });
    const cupWrap = sim.querySelector(".sim-cup");
    const svg = sim.querySelector(".cup-svg");
    const liquid = sim.querySelector(".cup-liquid");
    const dropPos = sim.querySelector(".cup-droppos");
    const drop = sim.querySelector(".cup-drop");
    const volOut = sim.querySelector(".cup-vol");
    const vesselOut = sim.querySelector(".cup-vessel");
    const result = sim.querySelector(".sim-out");
    const dist = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
    const state = {};

    /* 押した瞬間に、その材料の色のしずくを1粒落とす。
       器の縁から液面まで落として、着水で液面を1回ふるわせる。
       ★動きを減らす設定のときは何もしない。 */
    let dropTimer = 0;
    const pour = (part) => {
      if (reduce || !drop) return;
      const v = VESSELS[svg.dataset.vessel] || VESSELS.tumbler;
      drop.setAttribute("fill", DROP_FILL[part] || "var(--d4)");
      // 縁の少し上から出して、いまの液面まで落とす
      const from = v.top - 14;
      dropPos.setAttribute("transform", `translate(100 ${from})`);
      cupWrap.style.setProperty("--fall", (surfaceY() - from) + "px");
      cupWrap.classList.remove("pouring");
      void cupWrap.offsetWidth;                       // アニメを作り直させる
      cupWrap.classList.add("pouring");
      clearTimeout(dropTimer);
      dropTimer = setTimeout(() => cupWrap.classList.remove("pouring"), 300);
    };
    // いまの液面の y（着水点）。update() が最後に計算した比率を使う
    let filled = 0;                                   // 液が占める割合 0〜1
    const surfaceY = () => {
      const v = VESSELS[svg.dataset.vessel] || VESSELS.tumbler;
      return v.bot - (v.bot - v.top) * filled;
    };

    steps.forEach(s => {
      const p = s.dataset.part;
      state[p] = Math.max(MIN[p], Math.min(MAX[p], +s.querySelector("output").value));
      s.querySelectorAll("button").forEach(b => {
        b.addEventListener("click", () => {
          const before = state[p];
          state[p] = Math.max(MIN[p], Math.min(MAX[p], state[p] + (+b.dataset.d)));
          if (state[p] > before) pour(p);             // 増やしたときだけ注ぐ
          /* ★湯とミルクは排他にする。18種のどれにも「湯とミルクの両方」は無い。
             PCA の PC2（水の軸）がまさにこの2家系を分けていたので、
             UI でそれを体験させる方がデータに忠実になる。
             同時に、どのメニューにも無い組み合わせが到達不能になる。 */
          if (p === "water" && state.water > 0) { state.dairy = 0; state.foam = 0; }
          if (p === "dairy" && state.dairy > 0) { state.water = 0; }
          if (state.dairy === 0) state.foam = 0;
          update();
        });
      });
    });

    const paintIcons = () => {
      steps.forEach(s => {
        const p = s.dataset.part, n = state[p], slots = MAX[p];
        s.querySelector("output").value = n;
        s.setAttribute("aria-label",
          `${s.querySelector(".step-name").textContent}, ${n} of ${slots}`);
        s.querySelector(".step-icons").innerHTML = Array.from({ length: slots }, (_, i) =>
          `<svg class="ic${i < n ? " on" : ""}" viewBox="0 0 24 24" aria-hidden="true">`
          + `<use href="#${s.dataset.icon}"/></svg>`).join("");
        // ミルクが無ければ泡は作れない（泡はミルクを泡立てたもの）
        const locked = (p === "foam" && state.dairy === 0);
        s.classList.toggle("locked", locked);
        s.querySelectorAll("button").forEach(b => {
          b.disabled = locked
            || (+b.dataset.d < 0 && n === MIN[p]) || (+b.dataset.d > 0 && n === MAX[p]);
        });
      });
    };

    const update = () => {
      paintIcons();
      // 泡はミルクの一部。総量から泡の分を取り、残りが液体のミルクになる。
      const dairy = STEPS.dairy[state.dairy];
      const foam = dairy * FOAM_FRAC[state.foam];
      const ml = {
        espresso: STEPS.espresso[state.espresso - 1],
        // ★読者はドリップを選べない。だから常に 0。café au lait は当たらない。
        brewed: 0,
        water: STEPS.water[state.water],
        choc: STEPS.choc[state.choc],
        foam: foam,
        milk: dairy - foam
      };
      const total = PARTS.reduce((s, p) => s + ml[p], 0);

      const vessel = VESSEL(total);
      const v = VESSELS[vessel];
      const inner = v.bot - v.top;
      // 器のどこまで満たすか。器は量に合わせて選ばれるので、上限 0.92 で縁を残す
      filled = total ? Math.min(total / CAP[vessel], 0.92) : 0;
      const liquidPx = inner * filled;                // 液の高さ（SVG 座標）

      /* 層を下から積む。各層は viewBox 全高（260）の長方形1枚。
         scaleY で厚みを作り、translateY で内側の底から自分の位置まで持ち上げる。
         層の下端は transform-origin が 50% 100%（= y 260）にあるので、
         そこから (v.bot - 260 - 下の層の合計) だけずらせば正しい位置に来る。 */
      let cpx = 0;
      // ★2c の断面図と同じ順に積む（下から espresso / brewed / water / choc / milk / foam）
      ["espresso", "brewed", "water", "choc", "milk", "foam"].forEach(p => {
        const el = layers[p];
        if (!el) return;
        const h = total ? (ml[p] / total) * liquidPx : 0;
        el.style.transform =
          `translateY(${(v.bot - 260 - cpx).toFixed(2)}px) scaleY(${(h / 260).toFixed(5)})`;
        cpx += h;
      });
      // 液面は一番上の層の上端そのもの。線は引かないので描くものは無い

      volOut.textContent = Math.round(total);
      vesselOut.textContent = vessel;
      svg.dataset.vessel = vessel;
      liquid.setAttribute("clip-path", `url(#in-${vessel})`);

      if (total < 10) {
        result.textContent = "An empty cup is still a cup. Add something.";
        return;
      }
      const mine = PARTS.map(p => ml[p] / total);
      const ranked = DRINKS
        .map(([name, share, vol, order]) => ({ name, order, vol, d: dist(mine, share) }))
        .sort((a, b) => a.d - b.d);

      // 割合が同じものは「量」で決まる。これが ristretto/espresso/doppio/lungo の違いそのもの。
      const tied = ranked.filter(r => r.d - ranked[0].d < 0.03);
      tied.sort((a, b) => Math.abs(a.vol - total) - Math.abs(b.vol - total));
      const first = tied[0];
      const rest = tied.slice(1);
      const vol = Math.round(total);
      const cup = `${vol}&nbsp;ml in a ${vessel}`;

      // ★行き止まりを作らない。遠いときも必ず名前を出し、確信度を言葉で分ける。
      //   「近いものがない」で終わると読者の手が止まる。
      if (first.d > 0.20) {
        result.innerHTML = `Nothing on the menu is quite this. The nearest is a `
          + `<strong>${first.name}</strong>, so what you have is a variant of one — `
          + `${cup}. Which is how most of these were invented.`;
      } else if (rest.length && rest.some(r => r.vol === first.vol)) {
        const twin = rest.find(r => r.vol === first.vol);
        result.innerHTML = `That is a <strong>${first.name}</strong> — and also a `
          + `<strong>${twin.name}</strong>. Same ingredients, same ${cup}. `
          + `The only thing that separates them is the order you pour: `
          + `${first.order} against ${twin.order}.`;
      } else if (rest.length) {
        result.innerHTML = `That is a <strong>${first.name}</strong>, ${cup}. `
          + `The recipe is identical to a ${rest.map(r => r.name).join(" and a ")} — `
          + `<strong>only the size gives it a different name.</strong>`;
      } else {
        const lead = first.d < 0.07 ? "That is a" : "Closest on the menu: a";
        result.innerHTML = `${lead} <strong>${first.name}</strong>, ${cup}. `
          + `Ask for it as ${first.order}. Next nearest is a ${ranked[1].name}.`;
      }
    };

    update();
  }

  /* ---------- 4. コーダ：国ごとのテンポで持ち上がるカップ ----------
     杯/年 → 1杯あたりの間隔（時間）= 8760 / 杯数。
     出典: USDA PSD (MY2026) domestic consumption ÷ World Bank population、1杯 = 生豆12g。
     算出: /Users/yyyoshie/sandbox/data/coffee_land_per_capita.csv（67カ国・実データ）

     ⚠️ EU は集計単位なので加盟国を個別に出せない。EU 行は除外している。
     ⚠️ 消費が 0 と報告されている国は除外（データ無しと区別できないため）。
     ⚠️ 画面上のテンポは対数で圧縮している（12時間〜9か月を1画面に収めるため）。
        実際の間隔は各カップの title と下の段落に数字で書く。 */
  const CUPS = [
    ["Albania", 262.9], ["Algeria", 219.0], ["Angola", 1.3], ["Argentina", 94.6],
    ["Armenia", 379.1], ["Australia", 487.2], ["Bolivia", 18.1],
    ["Bosnia and Herzegovina", 474.0], ["Brazil", 528.1], ["Burundi", 5.3],
    ["Cameroon", 11.2], ["Canada", 618.0], ["Chile", 63.2], ["China", 24.0],
    ["Colombia", 208.0], ["Costa Rica", 311.9], ["Cote d'Ivoire", 7.8], ["Cuba", 41.0],
    ["Dominican Republic", 50.3], ["Ecuador", 103.4], ["Egypt", 54.7],
    ["El Salvador", 267.4], ["Ethiopia", 189.3], ["Georgia", 118.0],
    ["Guatemala", 244.5], ["Guinea", 8.5], ["Honduras", 191.7], ["India", 5.4],
    ["Indonesia", 85.2], ["Jamaica", 8.8], ["Japan", 278.3], ["Jordan", 357.1],
    ["Kazakhstan", 139.6], ["Kenya", 5.5], ["Korea, South", 328.5], ["Kosovo", 235.2],
    ["Madagascar", 31.3], ["Malaysia", 84.4], ["Mexico", 123.8], ["Montenegro", 360.9],
    ["Morocco", 124.7], ["New Zealand", 510.4], ["Nicaragua", 115.7],
    ["North Macedonia", 219.3], ["Norway", 735.8], ["Panama", 221.5],
    ["Papua New Guinea", 23.6], ["Peru", 44.6], ["Philippines", 290.3],
    ["Russia", 167.0], ["Saudi Arabia", 205.4], ["Senegal", 27.0], ["Serbia", 550.4],
    ["Sierra Leone", 5.8], ["Singapore", 91.1], ["South Africa", 56.6],
    ["Switzerland", 721.8], ["Tanzania", 6.6], ["Thailand", 78.5], ["Turkey", 112.5],
    ["Uganda", 33.5], ["Ukraine", 151.9], ["United Kingdom", 350.0],
    ["United States", 396.3], ["Uruguay", 73.8], ["Venezuela", 88.0],
    ["Vietnam", 247.6]
  ];

  /* 1週あたりに直す。1年 = 52.1775 週（365.25 / 7）。
     ★週にした理由: 最長が 14.1杯で階級に割れる。そして 1日1杯 = ちょうど 7杯 になる。
       年（736）・月（61）・日（2）はどれも階級として読めない。
     ★★行は「階級」で、幅は 1杯/週。国名も小数も出さない。
       0.1杯の差は、国の合計を人口で割った値の精度を超えている。だから階級で足りる。 */
  const WEEKS = 52.1775;
  const BIN = 1;                                    // 階級の幅（杯/週）
  const A_DAY = 7;                                  // 1日1杯 = 7杯/週。階級の境目に来る

  /* 国旗スプライト（site/flags.webp）の位置。10列 × 8行、全74枚。
     出所: lipis/flag-icons（MIT）を22px表示用に簡略化・共通トーン化。
     絵文字の国旗は Windows の Chrome / Edge で
     2文字のアルファベットになるため使わない。この方式なら Kosovo も出せる。 */
  const FLAG = {
    "Albania": [0, 0],
    "Algeria": [1, 2],
    "Angola": [2, 0],
    "Argentina": [3, 0],
    "Armenia": [1, 0],
    "Australia": [4, 0],
    "Bolivia": [7, 0],
    "Bosnia and Herzegovina": [5, 0],
    "Brazil": [8, 0],
    "Burundi": [6, 0],
    "Cameroon": [4, 1],
    "Canada": [0, 1],
    "Chile": [3, 1],
    "China": [5, 1],
    "Colombia": [6, 1],
    "Costa Rica": [7, 1],
    "Cote d'Ivoire": [2, 1],
    "Cuba": [8, 1],
    "Dominican Republic": [0, 2],
    "France": [6, 7],
    "Germany": [8, 7],
    "Ecuador": [2, 2],
    "Egypt": [3, 2],
    "El Salvador": [1, 6],
    "Ethiopia": [4, 2],
    "Georgia": [6, 2],
    "Guatemala": [8, 2],
    "Guinea": [7, 2],
    "Honduras": [0, 3],
    "India": [2, 3],
    "Indonesia": [1, 3],
    "Italy": [9, 7],
    "Jamaica": [3, 3],
    "Japan": [5, 3],
    "Jordan": [4, 3],
    "Kazakhstan": [8, 3],
    "Kenya": [6, 3],
    "Korea, South": [7, 3],
    "Kosovo": [2, 7],
    "Madagascar": [2, 4],
    "Malaysia": [5, 4],
    "Mexico": [4, 4],
    "Montenegro": [1, 4],
    "Morocco": [0, 4],
    "New Zealand": [8, 4],
    "Nicaragua": [6, 4],
    "Netherlands": [7, 7],
    "North Macedonia": [3, 4],
    "Norway": [7, 4],
    "Panama": [0, 5],
    "Papua New Guinea": [2, 5],
    "Peru": [1, 5],
    "Philippines": [3, 5],
    "Poland": [9, 6],
    "Portugal": [4, 7],
    "Russia": [5, 5],
    "Saudi Arabia": [6, 5],
    "Senegal": [0, 6],
    "Serbia": [4, 5],
    "Sierra Leone": [8, 5],
    "Singapore": [7, 5],
    "South Africa": [3, 7],
    "Spain": [5, 7],
    "Switzerland": [1, 1],
    "Tanzania": [4, 6],
    "Thailand": [2, 6],
    "Turkey": [3, 6],
    "Uganda": [6, 6],
    "Ukraine": [5, 6],
    "United Kingdom": [5, 2],
    "United States": [7, 6],
    "Uruguay": [8, 6],
    "Venezuela": [0, 7],
    "Vietnam": [1, 7]
  };

  const grid = document.getElementById("cupgrid");
  if (grid) {
    const wk = CUPS.map(([n, c]) => [n, c / WEEKS]).sort((a, b) => b[1] - a[1]);
    const top = Math.floor(wk[0][1] / BIN) + 1;     // 14.1 → 15 本
    const frag = document.createDocumentFragment();

    const head = document.createElement("div");
    head.className = "wkhead";
    head.innerHTML = "<span>cups a week</span><span>countries</span><span></span>";
    frag.appendChild(head);


    for (let k = top - 1; k >= 0; k--) {            // 多い順に上から
      const lo = k * BIN, hi = lo + BIN;
      const got = wk.filter(([, v]) => v >= lo && v < hi);
      // ★該当する国が無い階級は行を出さない（縦の空きを作らない）。
      //   目盛りはカップの数そのものなので、段が飛べば抜けたことは絵で分かる。
      if (got.length) {
        const row = document.createElement("div");
        row.className = "wkrow";
        // ★0個の行はカップが描けない。空欄だとデータ欠けに見えるので文字で言う
        const scale = lo === 0 ? `<span class="wknone">less than one cup</span>`
          : `<span class="wkcups" style="width:calc(var(--u) * ${lo})"></span>`;
        row.innerHTML = scale
          + `<span class="wkn">${got.length}</span>`
          + `<span class="wkflags">` + got.map(([n, v]) => {
            const [col, r] = FLAG[n] || [0, 0];
            return `<span class="wkflag" role="img" aria-label="${n}"`
              + ` title="${n} — ${v.toFixed(1)} cups a week"`
              + ` style="background-position:calc(var(--fw) * ${-col})`
              + ` calc(var(--fw) * .75 * ${-r})"></span>`;
          }).join("") + `</span>`;
        frag.appendChild(row);
      }
      if (lo === A_DAY) {                           // この行の下が「1日1杯」の境目
        const line = document.createElement("div");
        line.className = "wkline";
        line.textContent = "one cup a day";
        frag.appendChild(line);
      }
    }
    grid.appendChild(frag);
    grid.setAttribute("aria-describedby", "cupgrid-alt");
  }
})();


/* ============================================================
   1c 発音の再生（ライブラリなし・外部リクエストなし）
   - 音声は site/audio/ に同梱。相対パスのみ
   - 自動再生しない。押したときだけ鳴らす
   - 押し直しで鳴らし直せる。別の行を押したら前の音を止める
   ============================================================ */
(function () {
  var buttons = document.querySelectorAll('.say-play');
  if (!buttons.length) return;

  var current = null;      // いま鳴っている Audio
  var currentBtn = null;

  function reset(btn) {
    if (btn) btn.setAttribute('aria-pressed', 'false');
  }

  buttons.forEach(function (btn) {
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', function () {
      if (current) { current.pause(); reset(currentBtn); }

      var src = btn.getAttribute('data-audio');
      var a = new Audio(src);
      current = a;
      currentBtn = btn;
      btn.setAttribute('aria-pressed', 'true');

      a.addEventListener('ended', function () { reset(btn); });
      a.addEventListener('error', function () {
        reset(btn);
        btn.disabled = true;
        btn.title = 'Audio unavailable';
      });
      a.play().catch(function () { reset(btn); });
    });
  });
})();
