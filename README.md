# mindar-vite-multi-target

Vite + MindAR (CDN) multi-target framework.

## Install & run
```bash
npm i
npm run dev
```

Open the dev URL on a camera-capable device (HTTPS required in production).

## Configure targets
Edit `src/ar/config.js` and add more items to `targets`.
Targets are indices (0..N-1) inside the same `.mind` file.

## Add new reveals
Create a new module in `src/ar/setups/` exporting a setup function, then map it in `config.js`.
