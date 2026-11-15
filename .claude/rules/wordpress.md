---
paths:
  - "**/wp-content/themes/**"
  - "**/wp-content/mu-plugins/**/*.php"
---

# WordPress 共通のルール

テーマの種類に関係なく守る決まり。共通のルール（アクセシビリティ・クラス名の役割分担・Claude がやらないこと）は `CLAUDE.md` を参照。
テーマの作り方は、案件の種類に合わせて次に従う。

- クラシックテーマ・ハイブリッドテーマ：`.claude/rules/wordpress-classic.md`（**社内の標準はハイブリッド**）
- ブロックテーマ：`.claude/rules/wordpress-block.md`

**この案件のテーマの種類は `CLAUDE.md` の「プロジェクトの概要」に書いてある。書いていなければ、作る前に質問する。**

> 【要確認】と書いた所は、既存の案件から読み取った内容か、まだ決まっていない内容です。
> システムチームに確かめてから、決まりにしてください。

## 1. 開発環境とフォルダ（社内の標準）

開発環境は、社内のテンプレートで作った Docker 環境。

```
案件のリポジトリ/
├── .env                      … 開発環境の設定（Claude は読めない。項目は .env.example を見る）
├── docker-compose.yml
├── setup.sh など             … 環境を作るスクリプト（人が実行する）
├── theme-preset/             … テーマのひな形（functions.php と、ブロックエディタの拡張）
└── document_root/
    ├── _html/                … 静的コーディングの成果物（WordPress に組み込む前の HTML）
    └── 【サブディレクトリ】/   … WordPress 本体（例：cms）
        └── wp-content/themes/【テーマ名】/   … ここだけを編集する
```

- サイトの URL は `http://【.env の LOCAL_HOST】/`、phpMyAdmin は `:8080`。
- メールは MailHog に届く。`mu-plugins/mailhog-development.php` を外さない・本番に置かない。
- DB のユーザー名・パスワードは `.env` で決める、開発環境だけの値（Claude は読めない）。

## 2. 触ってよい場所

- 編集するのは **自社テーマ（`wp-content/themes/【テーマ名】/`）と `_html/` だけ**。
- **WordPress 本体（`wp-admin/` `wp-includes/`）とプラグインのファイルは編集しない。**
  更新のたびに上書きされて消えるため。動きを変えたいときは、テーマからフック
  （`add_action` / `add_filter` ＝ 決まったタイミングに処理を差し込む仕組み）で行う。
- `wp-config.php` は Claude からは読めない・書けない（設定で禁止）。直すときは人が行う。
- `.htaccess` は、頼まれたときだけ触る。開発用に書き換えた内容（HTTPS のリダイレクトのコメントアウトなど）を、
  そのままコミットしない（GitHub には、本番と同じ状態を置く決まりのため）。

## 3. Git と本番への反映

- **GitHub には、「いまの本番環境と同じ状態」だけを置く。** 本番に反映する前に `git push` しない
  （Claude は `git push` を実行できない設定になっている）。
- Git で管理するのは、テーマと、環境を作るためのファイルだけ（WordPress 本体・アップロードしたファイルは対象外）。
- 本番への反映は人が行い、テーマのフォルダだけを反映する。Claude は、反映するファイルの一覧と確認項目を用意するまで。
- 作業を始める前に、本番が開発環境より進んでいないか（プラグインの更新、直接の編集）を、人に確認する。

## 4. セキュリティ（必須）

値を「受け取る → 使う → 出す」の順に、5つの決まりを守る。

### (1) 最初に nonce を確かめる

nonce（ノンス）＝その画面から送られたことを確かめる合言葉。他のサイトから勝手に送信させる攻撃（CSRF）を防ぐ。
**自分で作るフォームの送信・Ajax では、`$_POST` や `$_GET` の値を読む前に、最初に確かめる。**

```php
if ( ! isset( $_POST['contact_nonce'] )
  || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['contact_nonce'] ) ), 'contact_send' ) ) {
  wp_die( esc_html( '送信元を確認できませんでした。もう一度お試しください。' ) );
}
```

お問い合わせフォームは、自分で作らず Contact Form 7 を使う（§6）。

### (2) 受け取った値を無害化する（サニタイズ）

`wp_unslash()` を通してから、値の種類に合った関数に渡す。`$_SERVER` の値（`REQUEST_URI` など）も、同じように扱う。

| 値の種類 | 書き方 |
|---|---|
| 1行の文字 | `sanitize_text_field( wp_unslash( $_POST['name'] ?? '' ) )` |
| 複数行の文字 | `sanitize_textarea_field( wp_unslash( $_POST['body'] ?? '' ) )` |
| 数値・ID | `absint( $_GET['id'] ?? 0 )` |
| メールアドレス | `sanitize_email( wp_unslash( $_POST['email'] ?? '' ) )` |
| URL（保存用） | `esc_url_raw( wp_unslash( $_POST['url'] ?? '' ) )` |
| スラッグ・キー | `sanitize_key( wp_unslash( $_GET['lang'] ?? '' ) )` |

### (3) 値が正しいか確かめる（バリデーション）

- 決まった選択肢：`in_array( $lang, [ 'ja', 'en', 'zhs' ], true )`。違ったら、既定の値にする。
  **受け取った値を、そのままファイル名やテンプレート名に使わない**（選択肢と照らし合わせてから使う）。
- 受け取った値を正規表現に入れるときは、`preg_quote()` を通す（検索の言葉を目立たせる処理など）。

### (4) 出す直前にエスケープする（無害化して出力する）

管理画面から入れた値でも、自分で作った文字列でも、例外にしない。悪意のあるスクリプトを埋め込まれる攻撃（XSS）を防ぐため。

| 出す場所 | 使う関数 | 例 |
|---|---|---|
| HTML の文字として | `esc_html()` | `<?php echo esc_html( $term->name ); ?>` |
| 属性の値として | `esc_attr()` | `datetime="<?php echo esc_attr( get_the_date( 'Y-m-d' ) ); ?>"` |
| URL として | `esc_url()` | `href="<?php echo esc_url( get_term_link( $term ) ); ?>"` |
| HTML タグを含む本文として | `wp_kses_post()` | `<?php echo wp_kses_post( $body ); ?>` |
| JavaScript に渡すデータとして | `wp_json_encode()` | |

- `the_title()` `the_content()` `the_permalink()` など、WordPress が用意した表示用の関数は、そのまま使ってよい。
- **`echo` で出す値（`get_the_date()`、`$term->name`、`get_term_link()`、`get_theme_file_uri()`、自分で作った変数）は、必ずエスケープする。**
- 文字列をつなげて HTML を `echo` しない。HTML はテンプレートにそのまま書き、値の所だけ PHP にする。

```php
// 悪い例：つなげて echo（エスケープが抜けやすい）
echo '<a class="c-news-item__category" href="' . get_term_link( $term ) . '">' . $term->name . '</a>';
```

```php
<!-- 良い例 -->
<a class="c-news-item__category" href="<?php echo esc_url( get_term_link( $term ) ); ?>"><?php echo esc_html( $term->name ); ?></a>
```

### (5) 権限を確かめる

管理者だけができる処理（設定の保存、データの書き出しなど）は、`current_user_can()` で確かめてから行う。

### そのほか

- **SQL を直接書くときは、必ず `$wpdb->prepare()` を通す。** できるだけ `WP_Query` / `get_posts()` を使い、SQL は書かない。
- `eval()`、`extract()` は使わない。
- テンプレート以外の PHP ファイル（`inc/` の中など）の先頭には、直接アクセスを止める指定を入れる：
  `if ( ! defined( 'ABSPATH' ) ) { exit; }`

## 5. PHP の書き方

- インデントは半角スペース2つ、配列は `[]`、文字コードは UTF-8（BOM なし）。【要確認：システムチームの標準】
- テーマで作る関数・定数には、**案件ごとに1つ決めた接頭辞**を付ける（`【接頭辞】_`）。
  既存の案件では `my_` `mytheme_` `custom_` や、接頭辞なしが混ざっている。プラグインと名前が重なると、
  画面が真っ白になるエラーの原因になるので、新しい案件ではそろえる。
- 関数の前に、何をするかをコメント（`/** */`）で書く。
- 投稿の ID を、コードに直接書かない（`const JA_TOP = 40;` のような書き方）。開発環境と本番で ID が違うと、動かなくなる。
  スラッグで探すか、管理画面で選べるようにする。
- 使わなくなったコードを、コメントアウトで残さない（履歴は Git で追える）。

## 6. よく使うプラグイン（社内の標準）【要確認】

既存の案件で使われているもの。新しい案件でも、まずこれらを使う。**別のプラグインを、勝手に足さない。**

| 役目 | プラグイン | テーマ側で行うこと |
|---|---|---|
| SEO（タイトル・説明文・OGP） | Yoast SEO | `add_theme_support( 'title-tag' )`。`<title>` と `meta description` を、テンプレートに自分で書かない |
| お問い合わせフォーム | Contact Form 7 | フォームの HTML は、静的コーディングのクラスをそのまま使う。`wpcf7_autop_or_not` を `false` にする |
| ログイン画面の保護 | 案件で決める | 開発環境でログインできなくなる設定があれば、開発環境でだけ外す（本番の設定は変えない） |
| スパム対策 | Cloudflare Turnstile など | フォームに組み込む。キーは、コードに書かない |

- カスタム投稿タイプ・カスタムフィールドを、プラグインで作るか、コードで書くかは、案件の `CLAUDE.md` に従う。【要確認】
- プラグインの追加・更新・削除は、人が行う。Claude は、候補と理由を出すまで。

## 7. 画像

- テーマに含める固定の画像は、`get_theme_file_uri( 'assets/img/…' )` をエスケープして出す。
  **テーマのパス（`/cms/wp-content/themes/【テーマ名】/…`）を、直接書かない**（サブディレクトリの名前やテーマ名が変わると、切れる）。
- 管理画面から入れる画像は `wp_get_attachment_image()` で出す
  （`srcset`・`width`・`height`・`loading` が自動で付き、表示が速くなる）。`alt` は、管理画面の「代替テキスト」を使う。
