# Установщик резьбовых вставок с предварительным сжатием — shlif

Static concept page exported from site-factory (shlif-inserts / a-close). Open `index.html` in a browser — no build needed.

## Publish on GitHub Pages

```bash
cd clients/shlif-inserts/final/a-close
git init && git add . && git commit -m "Concept page"
git branch -M main
gh repo create shlif-inserts --public --source=. --push          # or create the repo on github.com and: git remote add origin … && git push -u origin main
gh api -X POST repos/{owner}/shlif-inserts/pages -f "source[branch]=main" -f "source[path]=/"   # or: repo Settings → Pages → Deploy from a branch → main / root
```

After changes in the prototype, export again (`npm run final -- shlif-inserts`) and push: `git add -A && git commit -m "Update" && git push` — the export keeps this folder's `.git`.

The page appears at `https://<your-user>.github.io/shlif-inserts/` after a minute. Re-export with `--url=https://<your-user>.github.io/shlif-inserts/` so link previews show `og.jpg`.

Search engines are told not to index it (`noindex`). The edit panel is off.

## Photos

These images are AI-generated placeholders (Gemini, SynthID watermark) — don't present them as real work, people or premises:

- media/banner-housing-dark-1.webp
