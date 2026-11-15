---
paths:
  - "**/assets/js/**/*.js"
---

# JavaScript のルール（社内共通／叩き台）

> **叩き台です。** 【論点11】と書いた所は、チームで決める前の仮の決まりです（チームの提案書を参照）。
> ビルドの方法・入口のファイルの分け方・ライブラリごとの注意は、案件の `CLAUDE.md` に書きます。

共通のルール（アクセシビリティ基準・クラス名の役割分担）は `CLAUDE.md` を参照。

## 1. 基本

- フレームワークを使わない、素の JavaScript（ES2023 以降）＋ ES Modules で書く。
- **新しい案件では jQuery を使わない。**【論点11】今のブラウザは、jQuery が無くても同じことが短く書ける。
  読み込む量が減り、表示が速くなる。既存の案件の保守では、その案件の書き方に合わせる。
- 機能が多い案件は、1つの機能につき1ファイルに分け、ビルドで1本にまとめる。ファイル名はハイフンでつなぐ（`header-nav.js`）。
  **小さい案件は、1つのファイル（`common.js`）に、機能ごとの関数を並べる形でもよい。**【論点11】
  どちらにするかは、案件の `CLAUDE.md` に書く。
- `<script type="module">` で読み込む（自動で、HTML の読み込みを止めない形になる）。
- 外部のライブラリを足すときは、先に相談する（更新が続いているか、キーボード操作・読み上げに対応しているか）。
  スライダーは Splide を標準にする。

## 2. JS の役目

**JS がやるのは「状態クラスの付け外し」「`aria-*` の更新」「`inert` の更新」まで。**
色・大きさ・表示／非表示・アニメーションは、CSS が状態クラスを起点に行う。

- `element.style.xxx = …` で、見た目を直接書き換えない
  （CSS だけでは値を決められないとき＝中身の高さに合わせる、などに限って認める。理由をコメントに書く）。
- **状態は DOM から読む。JS の変数に、同じ状態を持たない**（表示と中身がずれるバグを防ぐ）。

```js
// 良い例：いまの状態を DOM から読む
const isOpen = button.getAttribute('aria-expanded') === 'true';

// 悪い例：JS の変数と DOM で、状態を二重に持つ
if (this.#isOpen) { … }
```

- 要素を探すのは、`js-` で始まるクラスか `data-` 属性だけ。見た目のクラス（`c-` `p-` `l-`）を、JS から探さない。【論点8】
- 状態のクラスは `is-` で始める（`open` `fixed` `isFixed` ではなく `is-open` `is-fixed`）。【論点8】

## 3. モジュールの形

どちらの形でも、次は同じにする。

- **セレクタとクラス名は、ファイルの先頭の定数（`SELECTORS` / `CLASSES`）にまとめる。**
- 入口は `init()`。要素が無いページでは、何もせずに抜ける。
- ファイルの先頭に、何をする部品か・どこで使うかを、コメントで書く。
- 2つ以上のファイルで使う値は、`constants.js` にまとめる（同じ値を、あちこちに書かない）。

### 形A：関数だけ（単純な部品）【論点11】

開閉だけ・表示だけなど、ほかの部品と連携しないものに使う。

```js
/**
 * accordion.js
 * アコーディオンの開閉。複数を同時に開ける。
 */

const SELECTORS = {
  root: '.js-accordion',
  button: '.js-accordion-button',
  panel: '.js-accordion-panel',
};

const CLASSES = {
  open: 'is-open',
  enhanced: 'is-enhanced',
};

/**
 * 1つ分の開閉を切り替える。
 * @param {HTMLButtonElement} button 押されたボタン
 */
const toggle = (button) => {
  const panel = button.closest(SELECTORS.root)?.querySelector(SELECTORS.panel);
  if (!panel) return;

  const willOpen = button.getAttribute('aria-expanded') !== 'true';
  button.setAttribute('aria-expanded', String(willOpen));
  panel.classList.toggle(CLASSES.open, willOpen);
  // 高さを 0 にして隠すだけでは、Tab キーで中に入れてしまうため、閉じている間は inert にする
  panel.inert = !willOpen;
};

/** 初期化。入口のファイルから呼ぶ。 */
export const initAccordion = () => {
  const buttons = document.querySelectorAll(SELECTORS.button);
  if (buttons.length === 0) return;

  // CSS は「開いた状態」が初期値。JS が動いたときだけ、閉じられるようにする
  document.querySelectorAll(SELECTORS.root).forEach((root) => {
    root.classList.add(CLASSES.enhanced);
  });

  buttons.forEach((button) => {
    // HTML の初期値（aria-expanded）に、パネルの状態を合わせる
    const isOpen = button.getAttribute('aria-expanded') === 'true';
    const panel = button.closest(SELECTORS.root)?.querySelector(SELECTORS.panel);
    panel?.classList.toggle(CLASSES.open, isOpen);
    if (panel) panel.inert = !isOpen;

    button.addEventListener('click', () => toggle(button));
  });
};
```

### 形B：クラス（ほかの部品と連携するもの）

ほかの部品から呼ぶメソッドがあるもの（例：ハンバーガーメニューが、ヘッダーのナビを閉じる）に使う。

- クラスを定義し、インスタンスを1つだけ作って `export default` する。
- 外から呼ぶのは `init()` と、公開するメソッドだけ。それ以外は `#` を付けてプライベートにする。
- 部品どうしは、直接 `import` し合わない。入口のファイルで、セッター経由でつなぐ（依存の向きを、1か所で見られる）。
- つないだ相手は、`init()` の中では使わない（まだつながっていない）。イベントの処理の中で使う。

## 4. 入口のファイル

- 入口のファイル（`common.js` など）は、各モジュールの `init` を呼ぶだけにする。処理を直接書かない。
- **1ページで `<script>` から読む入口は、1本だけ**（同じ部品が2回初期化されるのを防ぐ）。
- ページ専用の機能は、そのページでだけ読み込む（全ページで、要らない JS を読み込まない）。

## 5. アクセシビリティ（必須）

開閉する部品を作るときは、次をすべて行う。

- ボタンは `<button type="button">`。`aria-expanded` と `aria-controls` を持たせ、開閉に合わせて更新する。
- **閉じている領域は `inert = true`**（見えない所に、Tab キーや読み上げが入らないように）。
- 画面の上に重なるもの（ハンバーガーメニュー・ドロップダウン・ダイアログ）は、Esc キーで閉じ、
  閉じたあと、開いたボタンにフォーカスを戻す。開いている間は、背後のコンテンツを `inert` にする。
- ページの中で開閉するアコーディオンは、Esc キーでは閉じない（WAI-ARIA のパターンに無い）。
- 自動で動くもの（スライダーなど）には、止めるボタンを用意する。`prefers-reduced-motion: reduce` のときは、自動で動かさない。
- `transitionend` を待つ処理は、`prefers-reduced-motion: reduce` のときに発火しないことがある。
  動きを減らす設定のときは、すぐに完了の状態にする分岐を入れる。

## 6. イベント

- `addEventListener` を使う（HTML に `onclick` を書かない）。
- 画面の幅の切り替わりは、`resize` ではなく `matchMedia().addEventListener('change', …)` で受け取る。
- `matchMedia()` には、SCSS と同じ書き方（`(width < 1024px)`）を使う。ブレークポイントの値は、SCSS と対にして `constants.js` に置く。
- スクロールに合わせた表示は、`scroll` イベントではなく `IntersectionObserver` を使う。
- 続けて何度も起きるイベントに、重い処理を直接つながない。

## 7. 既存の案件を直すとき

- その案件の書き方に合わせる（jQuery を使っている案件に、別の書き方を混ぜない。逆も同じ）。
- 見た目のクラスを JS が直接探している案件では、クラス名を変える前に、JS の中を検索する。

## 8. 書き方

- `var` は使わない。変えない値は `const`、変える値は `let`。
- アロー関数、テンプレートリテラル、オプショナルチェイニング（`?.`）、Null 合体演算子（`??`）を使う。
- 公開する関数・メソッドと、引数のあるものには、JSDoc（`/** */`）を書く。
- コメントは「何をしているか」より「なぜそうしているか」を書く。コードを変えたら、コメントも直す。
- `console.log` を残さない。`localStorage` などは、使えない環境があるので `try` / `catch` で囲む。
- HTML を文字列で組み立てて `innerHTML` に入れない（外から来た値が混ざると、スクリプトを埋め込まれる）。
  `textContent` と `createElement` を使う。
