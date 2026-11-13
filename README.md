# Cards redesign mock

A design mock for the cards.genjiball.us redesign: a 3D card viewer with one finish per rarity and two card backs. It is a prototype for discussion, not the live site.

Live: https://genji-ball-team.github.io/cards-redesign-mock/

```sh
npm install
npm run dev
```

The `gh-pages` branch holds the built site (`npx vite build --base=/cards-redesign-mock/`).
In Git Bash, put `MSYS_NO_PATHCONV=1` in front: otherwise the shell turns the base into a
Windows path and every asset on the published site returns 404.
