import fs from "fs";
import path from "path";
import resolve from "@rollup/plugin-node-resolve";
import postcss from "rollup-plugin-postcss";

// Custom plugin to inline JS and CSS into HTML
function inlineAssetsPlugin({ htmlFile, outputFile }) {
  return {
    name: "inline-assets",
    async writeBundle(options, bundle) {
      const htmlPath = path.resolve(htmlFile);
      let html = fs.readFileSync(htmlPath, "utf8");

      // Find JS and CSS output from bundle
      const jsBundle = Object.values(bundle).find(
        (file) => file.type === "chunk" && file.isEntry
      );
      const cssBundle = Object.values(bundle).find(
        (file) => file.type === "asset" && file.fileName.endsWith(".css")
      );

      const js = jsBundle ? jsBundle.code : "";
      const css = cssBundle ? cssBundle.source : "";

      // Replace <script src=...> and <link rel="stylesheet" ...> with inline tags
      html = html.replace(
        /<script\s+src="[^"]*"[^>]*><\/script>/,
        `<script>${js}</script>`
      );
      // Replace any <link rel="stylesheet" ...> (with any attributes)
      html = html.replace(
        /<link\s+rel=["']stylesheet["'][^>]*>/gi,
        `<style>${css}</style>`
      );

      // Write the inlined HTML
      fs.writeFileSync(path.resolve(options.dir, outputFile), html);
    },
  };
}

export default {
  input: "src/public/js/index.js", // Use JS entry point
  output: {
    dir: "dist",
    format: "iife",
  },
  plugins: [
    resolve(),
    postcss({
      inject: false,
      extract: true,
    }),
    inlineAssetsPlugin({
      htmlFile: "src/public/analytics.html",
      outputFile: "analytics.html",
    }),
  ],
};
