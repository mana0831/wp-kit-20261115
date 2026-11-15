---
paths:
  - "**/wp-content/themes/**/*.php"
  - "**/wp-content/themes/**/theme.json"
  - "**/wp-content/themes/**/js/block-extensions/**"
---

# WordPress クラシックテーマ・ハイブリッドテーマのルール

セキュリティなど共通の決まりは `.claude/rules/wordpress.md` を参照。

- **クラシックテーマ**：PHP のテンプレートファイルでページを作る、従来の形。
- **ハイブリッドテーマ（社内の標準）**：ページの骨組みは PHP のテンプレートのまま、`theme.json` を足して、
  記事の本文をブロックエディタで組めるようにした形。

> 【要確認】と書いた所は、既存の案件から読み取った内容か、これまでと変える提案です。システムチームに確かめてください。

## 1. テーマの構成

```
themes/【テーマ名】/
├── style.css            … テーマ情報のコメントだけ（実際の CSS は assets/css/）
├── theme.json           … ブロックエディタの色・幅などの設定（ハイブリッドの場合）
├── functions.php        … テーマの機能（theme-preset のひな形から始める）
├── header.php / footer.php
├── front-page.php       … トップページ
├── page.php             … 固定ページ（本文をブロックエディタで入力するページ）
├── templates/           … 専用の固定ページのテンプレート（先頭に Template Name を書く）
├── archive-【投稿タイプ】.php / single-【投稿タイプ】.php / taxonomy-【タクソノミー】.php
├── 404.php / index.php
├── template-parts/      … 共通パーツ（静的コーディングの include/ にあたる）
├── js/block-extensions/ … ブロックエディタの拡張（theme-preset のひな形）
└── assets/
    ├── scss/            … Sass の元ファイル
    ├── css/             … style.css / editor-style.css（コンパイルの出力先。直接編集しない）
    ├── js/
    └── img/
```

- 共通パーツのフォルダ名は `template-parts/` にそろえる（既存の案件には `module/` のものもある）。【要確認】
- どのファイルがどのページに使われるかは、WordPress のテンプレート階層（決まった優先順位）に従う。
- 専用のテンプレートは、先頭にこう書く（管理画面の「テンプレート」で選べるようになる）。

```php
<?php
/*
Template Name: お問い合わせ
Template Post Type: page
*/
get_header();
?>
```

- 共通パーツは `get_template_part( 'template-parts/breadcrumbs', null, $args )` で読み込み、
  値は第3引数の `$args` で渡す。パーツの中では、最初に値を取り出して、無いときの値を決める。

```php
<?php
$lang = $args['lang'] ?? 'ja';
?>
```

- `wp_head()` を `</head>` の直前、`wp_body_open()` を `<body>` の直後、`wp_footer()` を `</body>` の直前に必ず置く。

## 2. functions.php（theme-preset のひな形）

新しい案件は、`theme-preset/functions.php` から始める。ひな形に入っているもの：

| 機能 | 内容 |
|---|---|
| ブロックエディタの拡張 | `$enabled_extensions` で、案件ごとに使う・使わないを切り替える（§5） |
| Yoast SEO との連携 | `title-tag` を有効にする。説明文が空のときは、`meta description` と OGP の説明文を出さない |

既存の案件で、よく足しているもの（必要な案件だけ）：

- アイキャッチ画像を使えるようにする（`add_theme_support( 'post-thumbnails' )`。出し方は §7）
- エディタ用の CSS の読み込み（`enqueue_block_editor_assets` で `assets/css/editor-style.css`）
- 一覧の件数の変更（`pre_get_posts`。`! is_admin() && $query->is_main_query()` を必ず確かめる）
- 使わない標準のページ（投稿・カテゴリ・タグ・作成者・日付）を 404 にする
- 管理画面の、使わないメニューを隠す
- お知らせのパーマリンクを投稿 ID にする（`post_type_link` と `add_rewrite_rule`。足したあと、管理画面でパーマリンクを保存し直す）
- Contact Form 7：自動の `<p>` を止める、送信後にサンクスページへ移る

`functions.php` が長くなったら（目安：300行）、機能ごとに `inc/` のファイルに分けて、`functions.php` から読み込む。

## 3. CSS・JS の読み込み【これまでと変える提案】

既存の案件は、`header.php` に `<link>`、`footer.php` に `<script>` を直接書き、
キャッシュ対策を手で付けている（`common.js?日付-番号`）。**新しい案件では、`wp_enqueue_style()` / `wp_enqueue_script()` を使う。**

- 更新日時が自動でバージョンになり、**番号を手で書き換え忘れる事故が無くなる**。
- 読み込みの重複を防ぎ、プラグインと順番を調整できる。

```php
/**
 * CSS と JS を読み込む。
 */
function 【接頭辞】_enqueue_assets() {
  $css = 'assets/css/style.css';
  wp_enqueue_style(
    '【接頭辞】-style',
    get_theme_file_uri( $css ),
    [],
    (string) filemtime( get_theme_file_path( $css ) )
  );

  $js = 'assets/js/common.js';
  wp_enqueue_script(
    '【接頭辞】-common',
    get_theme_file_uri( $js ),
    [],
    (string) filemtime( get_theme_file_path( $js ) ),
    [ 'strategy' => 'defer', 'in_footer' => true ]
  );
}
add_action( 'wp_enqueue_scripts', '【接頭辞】_enqueue_assets' );
```

- JS を機能ごとのファイルに分けて、`type="module"` で読み込む案件では、`wp_enqueue_script_module()` を使う（WordPress 6.5 以降）。
- Google Fonts は、`<link rel="preconnect">` と一緒に `header.php` に書いてよい。使う太さだけを読み込む。
- アクセス解析のタグ（Google タグなど）の ID を、テンプレートに直接書くかどうかは、案件で決める。【要確認】

## 4. theme.json（ハイブリッドの場合）

- 色のパレット（`settings.color.palette`）に、デザインで決めた色を登録する。
  標準のパレットと、自由な色の指定は止める（`"defaultPalette": false`、`"custom": false`）。デザインに無い色を使えないようにするため。
- 本文の幅（`settings.layout.contentSize`）を、デザインのコンテンツ幅に合わせる。
- パレットの色は、CSS 変数（`--wp--preset--color--【スラッグ】`）として出力される。
  SCSS のトークン（`--color-main` など）は、この変数を参照する形にして、値を2か所に書かない。
- 名前（`"name"`）は、入力する人に見えるので、日本語でわかりやすく付ける。

## 5. ブロックエディタの拡張（`js/block-extensions/`）

標準のブロックに、「独自のクラスを付けるスイッチ」を足す仕組み。ビルドは要らない（素の JavaScript で書いてある）。

| ファイル | 対象のブロック | 付くクラス |
|---|---|---|
| `background.js` | グループ・カラム | `ex-has-bg-color` |
| `border.js` | グループ・カラム | `ex-has-border` |
| `table-layout.js` | テーブル | `ex-has-scope-row-table` |
| `table-scroll.js` | テーブル | `ex-has-scroll-table` |
| `table-full.js` | テーブル | `ex-has-full-table` |
| `group-map.js` | グループ | `ex-has-map` |

- 使う・使わないは、`functions.php` の `$enabled_extensions` で切り替える。使わないものは `false` にする。
- 新しい拡張を足すときは、既存のファイルと同じ形で書き、クラス名は `ex-` で始める。上の表にも足す。
- 付いたクラスの見た目は、本文の枠の SCSS に書く。**エディタの中と公開ページで、同じ見た目にする。**

## 6. 記事の本文（ブロックエディタで入力する所）

- `the_content()` は、決めたクラスの枠で囲む（クラス名は、案件の `CLAUDE.md` に従う。共通ルールの案は `c-entry`）。

```php
<div class="c-entry">
  <?php the_content(); ?>
</div>
```

- エディタ用の CSS（`editor-style.css`）には、本文の枠と同じ SCSS を読み込む。リセットとベースは入れない
  （管理画面の見た目が崩れる）。
- 本文の中の見出しは `h2` から始まる前提で、テンプレート側でページのタイトルを `h1` にする。

## 7. 一覧・ループ

- `query_posts()` は使わない。追加の一覧は `new WP_Query()` か `get_posts()` で作り、
  ループのあとに必ず `wp_reset_postdata()` を呼ぶ。
- メインの一覧の件数や並び順を変えるときは、`pre_get_posts` フックで行う（テンプレートの中で、もう一度問い合わせない）。
- 一覧の件数を `-1`（全件）にしない。上限とページ送り（`the_posts_pagination()`）を付ける。
- 0件のときの表示を、必ず用意する。
- アイキャッチ画像は、`the_post_thumbnail()` で出す（`srcset`・`width`・`height` が自動で付く）。
  **設定されていない記事があるので、必ず `has_post_thumbnail()` で確かめ、無いときの画像を用意する。**
  記事のタイトルが横にある一覧では、同じ内容を2回読み上げないよう、`alt` を空にする。

```php
<?php if ( has_post_thumbnail() ) : ?>
  <?php the_post_thumbnail( 'medium', [ 'class' => 'c-card__img', 'alt' => '' ] ); ?>
<?php else : ?>
  <img class="c-card__img" src="<?php echo esc_url( get_theme_file_uri( 'assets/img/common/no-image.jpg' ) ); ?>" alt="" width="300" height="200">
<?php endif; ?>
```

## 8. 静的 HTML（`_html/`）から置き換えるときの決まり

- **クラス名・`js-` フック・`aria-*`・`inert` は変えない。** JS と CSS が、そのクラスと属性を見て動いているため。
- 静的コーディングの共通パーツの境目を、そのまま `header.php` `footer.php` `template-parts/` の境目にする。
- サイト内のリンクは `home_url( '/company/' )` をエスケープして出す（開発環境と本番で、ドメインが違うため）。
- トップページのロゴだけ `h1` にする、などの出し分けは、`is_front_page()` で行う。
- パンくずリストは、`<nav aria-label="パンくずリスト">` と `<ol>` で作り、いまのページに `aria-current="page"` を付ける。
- グローバルナビは、顧客が変えない場合、テンプレートに直接書いてよい（マークアップをそのまま保てる）。
  顧客が変える場合だけ、`register_nav_menus()` と `wp_nav_menu()` を使う。
- 文言・リンク先を、テンプレートに直接書くか、管理画面で変えられるようにするかは、
  **勝手に決めず `docs/workflow.md` の「更新箇所の一覧」に従う**。一覧に無い所は、作る前に質問する。
