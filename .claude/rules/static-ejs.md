---
paths:
  - "**/*.ejs"
  - "**/eleventy.config.js"
---

# 静的コーディング：Eleventy + EJS で作る

Movable Type・PowerCMS X・CMS なしの案件の標準。部品に分けた EJS から、ビルドで HTML を出力する。
目的と成果物は `static.md`、マークアップの決まりは `html.md` を参照。

- Eleventy（イレブンティ）＝ひな形から、静的な HTML を作る道具。
- EJS ＝ HTML の中に、JavaScript で「共通パーツの読み込み」や「くり返し」を書ける書き方。

**この方法を選ぶ理由**：納品するものが、純粋な HTML になる。どの CMS にも、そのまま渡せる。

> 一般的な内容で書いた叩き台です。社内に、この形で作った案件があるので、細かい所はその案件を見本にしてください。

## 1. フォルダ構成

```
案件のリポジトリ/
├── eleventy.config.js   … Eleventy の設定
├── package.json         … 使う道具と、コマンド
├── src/                 … 元のファイル（ここを編集する）
│   ├── index.ejs          … トップページ
│   ├── 【ページ名】.ejs    … 各ページ
│   ├── entry-parts.ejs    … 本文の見本ページ
│   ├── include/           … 共通パーツ（head.ejs / header.ejs / footer.ejs など）
│   ├── _data/             … 全ページで使う値（サイト名、ナビの項目など）
│   └── assets/            … SCSS・CSS・JS・画像
└── dist/                … 出力された HTML（**直接編集しない**。ビルドのたびに作り直される）
```

## 2. コマンド

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発用のサーバーを立ち上げる。ファイルを保存すると、自動で作り直す |
| `npm run build` | `dist/` に、納品用のファイルを出力する |

- コマンドの名前と中身は、案件の `package.json` に従う。
- 直したら、`npm run build` が通ることを確かめる。`dist/` を見て、「できた」と報告する。

## 3. EJS の書き方

| 書き方 | 意味 | 使う場面 |
|---|---|---|
| `<%= 値 %>` | 値を出す（自動でエスケープされる） | 文字・属性の値を出すとき。**基本はこれ** |
| `<%- 値 %>` | 値を、そのまま出す（エスケープされない） | `include` で、共通パーツの HTML を出すときだけ |
| `<% 処理 %>` | 何も出さずに、処理だけ行う | 変数の宣言、`if`、くり返し |

- **ページの変数は、必ず `const` で宣言する。** 宣言しないと、値が次のページのビルドに残って、別のページに出てしまう。
- 共通パーツに渡す値は、`include` の第2引数で、**必ず明示して渡す**（パーツの側で、どの値を使うかが、ひと目でわかる）。

```ejs
<%
const pageTitle = '会社概要';
const pageDescription = '株式会社〇〇の会社概要です。';
%>
<%- include('include/head', { title: pageTitle, description: pageDescription }) %>
<%- include('include/header', { current: 'company' }) %>

<main>
  <h1 class="c-page-header__title"><%= pageTitle %></h1>
</main>

<%- include('include/footer') %>
```

- 共通パーツの側では、渡されなかったときの値を決めておく。

```ejs
<% const currentPage = typeof current === 'undefined' ? '' : current; %>
```

- **EJS で書くのは、「変数」「共通パーツの読み込み」「同じ部品のくり返し」「ページによる出し分け」だけ。**
  複雑な処理を、ページの中に書かない。
- 同じ部品のくり返しは、配列と `forEach` で書く（CMS では、そこがループになる）。

```ejs
<%
const newsItems = [
  { date: '2026-11-10', title: 'お知らせのタイトル', url: '/news/001/' },
  { date: '2026-11-01', title: '長いタイトルのお知らせ。2行以上になったときの表示を確かめるための文章です', url: '/news/002/' },
];
%>
<ul class="c-news-list">
  <% newsItems.forEach((item) => { %>
  <li class="c-news-list__item">
    <a class="c-news-list__link" href="<%= item.url %>">
      <time class="c-news-list__date" datetime="<%= item.date %>"><%= item.date.replaceAll('-', '.') %></time>
      <span class="c-news-list__title"><%= item.title %></span>
    </a>
  </li>
  <% }); %>
</ul>
```

## 4. パス

- 画像・CSS・JS・リンクは、ルート相対パス（`/` で始まる）で書く：`/assets/img/logo.svg`
- そのため、`dist/` の HTML を、エクスプローラーから直接開いても、正しく表示されない。
  確かめるときは、開発用のサーバー（`npm run dev`）を使う。
- CMS の側で、サイトがサブディレクトリに置かれる場合は、先に相談する（パスの書き方が変わる）。

## 5. CMS に渡すとき

- 渡すのは、`dist/` の中身（HTML・CSS・JS・画像）と、引き継ぎメモ（`static.md` §6）。
- CMS を実装する人は、EJS を読まなくてよい。**共通パーツの境目が、出力された HTML のコメントでわかるようにしておく。**

```ejs
<!-- CMS: ここからヘッダー（全ページ共通） -->
<header class="l-header">…</header>
<!-- CMS: ここまでヘッダー -->
```

- ビルドでコメントを消す設定にしている案件では、`CMS:` で始まるコメントだけは残す。
- **CMS に組み込んだあとも、`src/` は直し続ける。** デザインの変更があったら、先に静的 HTML を直して確かめ、
  そのあとで CMS のテンプレートに反映する。
