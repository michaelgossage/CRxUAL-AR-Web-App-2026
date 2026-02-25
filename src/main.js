import { createARApp } from "./ar/app.js";

const app = createARApp({
  container: document.querySelector("#container"),
  touchEl: document.querySelector("#touch"),
  startOverlay: document.getElementById("startOverlay"),
  startBtn: document.getElementById("startBtn"),
  hudStatusEl: document.getElementById("status")
});

app.mount();

// Debug hook
window.__closeARUI = () => app.closeActive();
