import { THREE } from "./engine.js";

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const smoothstep = (t) => t * t * (3 - 2 * t);
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

export function setHud(statusEl, status, ok) {
  statusEl.textContent = status;
  statusEl.classList.toggle("ok", !!ok);
  statusEl.classList.toggle("warn", !ok);
}

export function roundedRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function makeRaycaster(camera) {
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  return {
    pick(objects, clientX, clientY) {
      const w = window.innerWidth, h = window.innerHeight;
      ndc.x = (clientX / w) * 2 - 1;
      ndc.y = -(clientY / h) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      return raycaster.intersectObjects(objects, true);
    }
  };
}

export async function loadTextureRobust(url) {
  try {
    const res = await fetch(url, { mode: "cors", cache: "force-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const blob = await res.blob();

    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = "anonymous";
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = URL.createObjectURL(blob);
    });

    const c = document.createElement("canvas");
    c.width = img.naturalWidth || img.width;
    c.height = img.naturalHeight || img.height;
    c.getContext("2d").drawImage(img, 0, 0);

    try { URL.revokeObjectURL(img.src); } catch {}

    const dataUrl = c.toDataURL("image/jpeg", 0.92);

    const tex = await new Promise((resolve, reject) => {
      new THREE.TextureLoader().load(dataUrl, resolve, undefined, reject);
    });

    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  } catch (e) {
    console.warn("loadTextureRobust fallback:", e);
    const tex = await new Promise((resolve, reject) => {
      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin("anonymous");
      loader.load(url, resolve, undefined, reject);
    });
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }
}

export function cameraVisibleHeightAtDistance(camera, d) {
  const vFov = (camera.fov * Math.PI) / 180;
  return 2 * d * Math.tan(vFov / 2);
}

export function dampVec3(current, target, lambda, dt) {
  const t = 1 - Math.exp(-lambda * dt);
  current.lerp(target, t);
}
export function dampQuat(current, target, lambda, dt) {
  const t = 1 - Math.exp(-lambda * dt);
  current.slerp(target, t);
}

export function captureWorldPose(obj, out) {
  obj.updateMatrixWorld(true);
  obj.matrixWorld.decompose(out.pos, out.quat, out.scale);
}

export function reparentKeepingWorld(obj, newParent, worldPose) {
  newParent.add(obj);
  obj.position.copy(worldPose.pos);
  obj.quaternion.copy(worldPose.quat);
  obj.scale.copy(worldPose.scale);
}
