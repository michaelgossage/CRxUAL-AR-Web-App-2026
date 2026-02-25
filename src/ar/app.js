import { AR_CONFIG } from "./config.js";
import { createMindAREngine } from "./engine.js";
import { setHud, makeRaycaster } from "./utils.js";
import { attachInteraction } from "./interaction.js";

export function createARApp({ container, touchEl, startOverlay, startBtn, hudStatusEl }) {
  let engine = null;
  let ray = null;

  // targetId -> { anchor, reveal, target }
  const reveals = new Map();

  // active reveal = last found target (for HUD + interaction focus)
  let active = null;

  // pointer state (for snap behavior)
  const pointerState = { down: false };

  function setStatus(text, ok) {
    setHud(hudStatusEl, text, ok);
  }

  function closeActive() {
    if (!active) return;
    active.reveal.close();
    setStatus("closed", false);
  }

  async function init() {
    engine = await createMindAREngine({
      container,
      mindFileUrl: AR_CONFIG.mindFileUrl
    });

    const { mindarThree, camera, renderer } = engine;

    ray = makeRaycaster(camera);

    for (const t of AR_CONFIG.targets) {
      const anchor = mindarThree.addAnchor(t.index);

      const reveal = t.setup({
        statusEl: hudStatusEl,
        setStatus,
        scene: engine.scene,
        camera: engine.camera,
        cameraRig: engine.cameraRig,
        config: t.setupConfig ?? {}
      });

      await reveal.build();

      anchor.group.add(reveal.root);

      anchor.onTargetFound = () => {
        active = { anchor, reveal, target: t };
        setStatus(`marker found (${t.id})`, true);
        reveal.onTargetFound({ anchorGroup: anchor.group });
      };

      anchor.onTargetLost = () => {
        if (active?.target?.id === t.id) setStatus(`marker lost (${t.id})`, false);
        reveal.onTargetLost({ elapsed: performance.now() / 1000 });
      };

      reveals.set(t.id, { anchor, reveal, target: t });
    }

    attachInteraction({
      touchEl,
      getState: () => {
        const reveal = active?.reveal;
        return {
          isOpen: !!reveal?.isOpen(),
          ray,
          pickables: reveal ? reveal.pickables : [],
          onCloseTapped: () => closeActive(),
          onDragCarousel: (dx) => reveal?.onDragCarousel?.(dx),
          onDragText: (dy) => reveal?.onDragText?.(dy)
        };
      }
    });

    touchEl.addEventListener("touchstart", () => { pointerState.down = true; }, { passive: true });
    touchEl.addEventListener("touchend", () => { pointerState.down = false; }, { passive: true });
    touchEl.addEventListener("mousedown", () => { pointerState.down = true; }, { passive: true });
    window.addEventListener("mouseup", () => { pointerState.down = false; }, { passive: true });

    let last = performance.now();
    renderer.setAnimationLoop(() => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const elapsed = now / 1000;

      for (const { reveal } of reveals.values()) {
        reveal.tick?.({ dt, elapsed, pointerDown: pointerState.down });
      }

      renderer.render(engine.scene, engine.camera);
    });

    setStatus("point at a target image", false);
  }

  function mount() {
    setStatus("tap start, allow camera", false);

    startBtn.addEventListener("click", async () => {
      startOverlay.style.display = "none";
      try {
        await init();
      } catch (err) {
        console.error(err);
        startOverlay.style.display = "grid";
        startOverlay.querySelector("p").textContent =
          "Could not start AR. Make sure camera permissions are allowed and you’re on HTTPS. Check console for details.";
      }
    });
  }

  return {
    mount,
    closeActive,
    destroy: async () => {
      if (!engine) return;
      for (const { reveal } of reveals.values()) {
        try { reveal.dispose?.(); } catch {}
      }
      reveals.clear();
      await engine.dispose();
      engine = null;
    }
  };
}
