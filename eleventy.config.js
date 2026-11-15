import fs from "node:fs/promises";
import path from "node:path";
import * as sass from "sass";
import ejsPlugin from "@11ty/eleventy-plugin-ejs";

// SCSS の入口と、出力先。
// 出力先を src/ ではなく dist/ にするのは、src/ に書き出すと Eleventy の監視が反応して、
// ビルドが止まらなくなるため（出力した CSS は直接編集しない）。
const SCSS_ENTRY = "src/assets/scss/style.scss";
const CSS_OUTPUT = "dist/assets/css/style.css";

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(ejsPlugin);

  // この案件の .gitignore には src/ が入っている（顧客の情報を GitHub に置かないため）。
  // Eleventy は初期設定で .gitignore のファイルを読まないので、それをやめる
  eleventyConfig.setUseGitIgnore(false);
  eleventyConfig.ignores.add("node_modules/**");

  // 画像・JS はそのまま dist へコピーする。SCSS は下でコンパイルするので、コピーしない
  eleventyConfig.addPassthroughCopy("src/assets/img");
  eleventyConfig.addPassthroughCopy("src/assets/js");
  // 外部のライブラリの CSS（Splide）。自分で書く CSS ではないので、SCSS に入れずにそのままコピーする
  eleventyConfig.addPassthroughCopy("src/assets/vendor");

  // SCSS を保存したときも、作り直す（npm run dev の1つのコマンドで済ませるため）
  eleventyConfig.addWatchTarget("src/assets/scss/");

  eleventyConfig.on("eleventy.before", async () => {
    // SCSS をまだ作っていないうちは、コンパイルしない（雛形のままでも npm run build が通るように）
    try {
      await fs.access(SCSS_ENTRY);
    } catch {
      return;
    }
    const result = sass.compile(SCSS_ENTRY, { style: "expanded" });
    await fs.mkdir(path.dirname(CSS_OUTPUT), { recursive: true });
    await fs.writeFile(CSS_OUTPUT, result.css);
  });

  eleventyConfig.setServerOptions({
    port: 8090,
  });

  return {
    dir: {
      input: "src",
      output: "dist",
      includes: "include",
      data: "_data",
    },
  };
}
