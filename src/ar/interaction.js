export function attachInteraction({
  touchEl,
  getState // () => { isOpen, ray, pickables, onCloseTapped, onDragCarousel(dx), onDragText(dy) }
}) {
  const pointer = {
    down: false,
    x0: 0, y0: 0,
    lastX: 0, lastY: 0,
    mode: "none",
    moved: false
  };

  const TAP_SLOP = 8;

  const onDown = (e) => {
    const s = getState();
    const t = (e.touches && e.touches[0]) ? e.touches[0] : e;

    pointer.down = true;
    pointer.x0 = pointer.lastX = t.clientX;
    pointer.y0 = pointer.lastY = t.clientY;
    pointer.mode = "none";
    pointer.moved = false;

    if (!s.isOpen) return;

    const hits = s.ray.pick(s.pickables, t.clientX, t.clientY);
    if (hits.length) {
      const obj = hits[0].object;
      if (obj?.name === "closeButton") pointer.mode = "close";
      else if (obj?.name === "textPanel") pointer.mode = "text";
      else pointer.mode = "carousel";
    } else {
      pointer.mode = "carousel";
    }
  };

  const onMove = (e) => {
    const s = getState();
    if (!pointer.down || !s.isOpen) return;

    const t = (e.touches && e.touches[0]) ? e.touches[0] : e;
    const dx = t.clientX - pointer.lastX;
    const dy = t.clientY - pointer.lastY;

    if (Math.abs(t.clientX - pointer.x0) > TAP_SLOP || Math.abs(t.clientY - pointer.y0) > TAP_SLOP) {
      pointer.moved = true;
    }

    if (pointer.mode === "carousel") s.onDragCarousel?.(dx);
    else if (pointer.mode === "text") s.onDragText?.(dy);

    pointer.lastX = t.clientX;
    pointer.lastY = t.clientY;
  };

  const onUp = () => {
    const s = getState();
    if (!pointer.down) return;

    if (s.isOpen && pointer.mode === "close" && !pointer.moved) {
      s.onCloseTapped?.();
    }

    pointer.down = false;
    pointer.mode = "none";
    pointer.moved = false;
  };

  touchEl.addEventListener("touchstart", (e) => { e.preventDefault(); onDown(e); }, { passive:false });
  touchEl.addEventListener("touchmove",  (e) => { e.preventDefault(); onMove(e); }, { passive:false });
  touchEl.addEventListener("touchend",   (e) => { e.preventDefault(); onUp(); }, { passive:false });
  touchEl.addEventListener("touchcancel",(e) => { e.preventDefault(); onUp(); }, { passive:false });

  touchEl.addEventListener("mousedown", (e) => { e.preventDefault(); onDown(e); });
  window.addEventListener("mousemove", (e) => onMove(e));
  window.addEventListener("mouseup", () => onUp());

  return () => {};
}
