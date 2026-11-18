# Baseplate

The game is one static file (`index.html`) hosted on **GitHub Pages**. Multiplayer goes through a small relay server (`server/`) hosted on **Render**.

## 1. Put it on GitHub
Push these files to a repo (`index.html` must be in the repo root). Then **Settings > Pages > Deploy from a branch > main / (root)**. Your game will be at `https://<you>.github.io/<repo>/`.

## 2. Deploy the relay on Render
1. On render.com choose **New > Blueprint** and pick your repo. It reads `render.yaml` and creates the `baseplate-relay` web service.
2. When it is live, copy its URL, for example `https://baseplate-relay.onrender.com`.
3. Optional: add an environment variable `ALLOWED_ORIGINS` = `https://<you>.github.io` so only your site can connect.

## 3. Point the game at it
Open `index.html`, find `const RELAY_URL = '';` and set it to your URL with `wss://`, for example:

    const RELAY_URL = 'wss://baseplate-relay.onrender.com';

Commit and push. Players on the same room code (or invite link) now meet through the relay.
To test before editing, add `?server=wss://baseplate-relay.onrender.com` to the game URL.

If `RELAY_URL` is empty the game falls back to the old serverless WebRTC mode.

## Notes
- Render's free plan sleeps when idle. The first connection after a nap can take 30 to 60 seconds; the game keeps retrying by itself.
- Rooms hold up to 16 players.
- Admin panel: press the backtick key. Admin commands are signed in the browser, so the relay cannot forge them.
- Local test: `cd server && npm install && node server.js`, then open the game with `?server=ws://localhost:8080`.
