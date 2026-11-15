---
paths:
  - "**/*.html"
  - "**/*.ejs"
  - "**/*.php"
---

# HTML（マークアップ）のルール（社内共通／叩き台）

> **叩き台です。** 静的 HTML・EJS・PHP のテンプレートに共通する、マークアップの決まりです。
> 静的コーディングの作り方は `static.md`（PHP は `static-php.md`、EJS は `static-ejs.md`）、
> WordPress・Movable Type の決まりは、それぞれのルールを見てください。

共通のルール（アクセシビリティ基準・クラス名の役割分担）は `CLAUDE.md` を参照。

## 1. 文書の構造

- `<html lang="ja">`。ページの骨組みは `<header>` `<nav>` `<main>` `<footer>` で作る。`<main>` は1ページに1つ。
- 見出しは、文書の構造どおりに付ける（見た目の大きさで選ばない）。`h1` は1ページに1つ。レベルを飛ばさない。
- `<section>` には、見出しを入れる。見出しの無いまとまりは `<div>`。
- 一覧は `<ul>` / `<ol>`、用語と説明の組は `<dl>`、日付は `<time datetime="2026-11-10">`。
- 押して何かが起きるものは `<button type="button">`、別のページ・場所へ移るものは `<a href>`。
  `<div>` や `<span>` をクリックできるようにしない（キーボードで操作できなくなる）。

## 2. クラスの付け方

- 見た目のクラス（BEM）・状態（`is-`）・JS の目印（`js-`）を、役目で分けて付ける。
  例：`<button class="c-accordion__button js-accordion-button" …>`
- 見た目を付ける要素には、必ずクラスを付ける。要素名や `id` に、CSS を当てない。
- `style` 属性と、`onclick` などのイベント属性は書かない。
- 1つの要素に、別々の部品のクラス（`c-card` と `c-news-list__item` など）を付けるのは、
  「置く側（`__item`）が位置を決め、部品（`c-card`）が見た目を決める」ときだけにする。

## 3. 画像

- 内容が伝わる `alt` を付ける。飾りだけの画像は `alt=""`。画像に文字が入っているときは、その文字を `alt` に書く。
- `width` と `height` を必ず書く（読み込みの途中で、レイアウトがずれるのを防ぐ）。
- 最初の画面に出ない画像は `loading="lazy"`。最初の画面のいちばん大きい画像には付けず、`fetchpriority="high"` を付ける。
- 写真は WebP（か AVIF）。アイコン・ロゴは SVG。
- 画面の幅で画像を出し分けるときは `<picture>` と `srcset` を使う。

## 4. リンク・ボタン

- リンクの文字だけで、行き先がわかるようにする（「こちら」「詳しくは」だけにしない）。
- 別のタブで開くリンクは `target="_blank" rel="noopener"` にし、別のタブで開くことが伝わるようにする（アイコンと、読み上げ用の文字）。
- アイコンだけのボタンには `aria-label` を付ける。

## 5. 開閉する部品

- ボタンに `aria-expanded` と `aria-controls` を、最初から書いておく（初期値は HTML が正。JS がそれを引き継ぐ）。
- 中身は、開いた状態で書く（JS が動かなくても読めるように）。閉じる処理は JS が行う。
- `<details>` / `<summary>` で足りるなら、JS を書かずにそれを使う。

## 6. フォーム

- すべての入力欄に `<label>` を関連付ける（`for` と `id`）。`placeholder` を、ラベルの代わりにしない。
- 必須は、色だけで示さず、文字（「必須」）でも示す。`required` を付ける。
- `type`（`email` `tel` など）と `autocomplete`（`name` `email` `tel` など）を、内容に合わせて付ける。
- エラーの文は、どう直せばよいかを具体的に書く。入力欄と `aria-describedby` で関連付ける。
- ラジオボタン・チェックボックスのグループは `<fieldset>` と `<legend>` でまとめる。

## 7. `<head>`

- `<title>` は「ページ名 | サイト名」。`meta description` は、ページごとに違う文（120文字前後）。
- `<meta name="viewport" content="width=device-width, initial-scale=1">`（拡大を禁止しない）。
- CSS は `<link>`、JS は `<script type="module">` で読み込む。
- Web フォントは `<link>` で読み込み、`preconnect` を付ける。使う太さだけを読み込む。
- OGP（`og:title` `og:description` `og:image` `og:url`）と、`<link rel="canonical">` を書く。

## 8. CMS に組み込む前提で書く

- 共通パーツ（ヘッダー・フッター・`<head>`）の境目を、はっきり分ける（そのまま CMS のパーツの境目になる）。
- クラス名・`id` は、ほかのテンプレートやプラグインと重ならない、具体的な名前にする。
- CMS のエディタで入力する本文の枠には、決めたクラス（例：`c-entry`）を付け、中の要素（`h2` `p` `ul` `table` など）には
  クラスを付けずに見た目を当てる（入力する人は、クラスを付けられないため）。
- パスの書き方（ルート相対など）は、案件の `CLAUDE.md` に従う。
