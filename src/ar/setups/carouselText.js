import { THREE } from "../engine.js";
import { clamp, easeOutCubic, roundedRectPath, loadTextureRobust } from "../utils.js";

export function setupCarouselText({
  setStatus,
  scene,
  camera,
  cameraRig,
  config
}) {
  const CAROUSEL_IMAGES = config.carouselImages ?? [];
  const BODY_TEXT = config.bodyText ?? "";

  const TRANSITION_DURATION_S = 0.70;
  const FREE_FILL = 0.92;
  const FREE_BOB_AMPL = 0.012;
  const FREE_BOB_SPEED = 1.2;
  const FREE_OFFSET = new THREE.Vector3(0.0, 0.0, -30.0);
  const REVEAL_DURATION_S = 2.70;

  const PANEL_W = 0.78;
  const PANEL_H = 0.78;

  const CAROUSEL_RADIUS = 0.34;
  const CAROUSEL_Y = 0.20;
  const CAROUSEL_Z = 0.5;
  const CAROUSEL_ITEM_W = 0.28;
  const CAROUSEL_ITEM_H = 0.18;
  const CAROUSEL_OFFSET = new THREE.Vector3(0.0, 0.0, 0.0); // x,y,z in panel space

  const TEXT_Y = -0.10;
  const TEXT_W = 0.62;
  const TEXT_H = 0.26;

  const CLOSE_SIZE = 0.085;
  const CLOSE_PAD = 0.02;

  const DRAG_TO_ROT = 0.005;
  const ROT_FRICTION = 0.93;
  const ROT_SPRING = 0.11;
  const TEXT_SCROLL_SPEED = 1.25;

  const root = new THREE.Group();
  root.name = "contentRoot";
  root.visible = false;

  let isOpen = false;
  let closedByUser = false;

  let isRevealing = false;
  let revealT = 0;

  let mode = "tracked"; // "tracked" | "free"
  let transitioningToFree = false;
  let transitionT = 0;

  const fromPose = {
    pos: new THREE.Vector3(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3()
  };

  const freePose = {
    pos: new THREE.Vector3(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(1, 1, 1),
    init: false
  };

  const pickables = [];

  let carouselGroup;
  let carouselMeshes = [];
  let textMesh;
  let closeMesh;

  let carouselAngle = 0;
  let carouselVel = 0;

  function makeCloseTexture(size = 256) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    roundedRectPath(ctx, 16, 16, size - 32, size - 32, 44);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    const w = 16, L = 120;
    ctx.fillRect(-L/2, -w/2, L, w);
    ctx.rotate(Math.PI / 2);
    ctx.fillRect(-L/2, -w/2, L, w);
    ctx.restore();

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }

  function makePanelMaterial(map) {
    return new THREE.MeshStandardMaterial({
      map,
      transparent: true,
      opacity: 1.0,
      roughness: 0.35,
      metalness: 0.05,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.12
    });
  }

  function makeTextPanelTexture({
    width = 1024,
    height = 512,
    text = "",
    padding = 44,
    font = "28px system-ui, -apple-system, Segoe UI, Roboto, Arial",
    lineHeight = 38
  }) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;

    const state = { scroll: 0, maxScroll: 0, textLines: [] };

    function layoutLines() {
      ctx.font = font;
      const contentW = width - padding * 2;
      const paragraphs = text.split("\n");
      const lines = [];
      for (const para of paragraphs) {
        const p = para.trimEnd();
        if (p.length === 0) { lines.push(""); continue; }
        const words = p.split(/\s+/);
        let line = "";
        for (const w of words) {
          const test = line ? (line + " " + w) : w;
          if (ctx.measureText(test).width <= contentW) line = test;
          else { lines.push(line); line = w; }
        }
        if (line) lines.push(line);
      }
      state.textLines = lines;

      const contentH = lines.length * lineHeight;
      const viewH = height - padding * 2;
      state.maxScroll = Math.max(0, contentH - viewH);
      state.scroll = clamp(state.scroll, 0, state.maxScroll);
    }

    function draw() {
      const w = width, h = height;
      ctx.clearRect(0, 0, w, h);

      ctx.save();
      roundedRectPath(ctx, 18, 18, w - 36, h - 36, 34);
      ctx.fillStyle = "rgba(0,0,0,0.52)";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.stroke();
      ctx.restore();

      const innerX = padding;
      const innerY = padding;
      const innerH = h - padding * 2;

      ctx.save();
      roundedRectPath(ctx, 28, 28, w - 56, h - 56, 28);
      ctx.clip();

      ctx.font = font;
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.textBaseline = "top";

      const y0 = innerY - state.scroll;
      for (let i = 0; i < state.textLines.length; i++) {
        const line = state.textLines[i];
        const y = y0 + i * lineHeight;
        if (y < -lineHeight || y > h) continue;
        ctx.fillText(line, innerX, y);
      }

      if (state.maxScroll > 0) {
        const t = state.scroll / state.maxScroll;
        const barH = Math.max(40, innerH * 0.25);
        const barY = innerY + (innerH - barH) * t;
        const barX = w - padding + 10;
        ctx.fillStyle = "rgba(255,255,255,0.20)";
        roundedRectPath(ctx, barX, barY, 8, barH, 6);
        ctx.fill();
      }

      ctx.restore();
      texture.needsUpdate = true;
    }

    function setScroll(deltaPx) {
      state.scroll = clamp(state.scroll + deltaPx, 0, state.maxScroll);
      draw();
    }

    layoutLines();
    draw();

    return { texture, state, setScroll, draw };
  }

  function cameraVisibleHeightAtDistance(camera, d) {
    const vFov = (camera.fov * Math.PI) / 180;
    return 2 * d * Math.tan(vFov / 2);
  }

  function computeFreeTargetPose(elapsed) {
    const d = 20.0;

    const rigPos = new THREE.Vector3();
    const rigQuat = new THREE.Quaternion();
    cameraRig.updateMatrixWorld(true);
    cameraRig.getWorldPosition(rigPos);
    cameraRig.getWorldQuaternion(rigQuat);

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(rigQuat);
    const pos = rigPos.addScaledVector(forward, d);

    pos.y += Math.sin(elapsed * FREE_BOB_SPEED) * FREE_BOB_AMPL;
    pos.add(FREE_OFFSET.clone().applyQuaternion(rigQuat));

    const quat = rigQuat.clone();

    const visibleH = cameraVisibleHeightAtDistance(camera, d);
    const s = (visibleH * FREE_FILL) / PANEL_H;
    const scale = new THREE.Vector3(s, s, s);

    return { pos, quat, scale };
  }

  function captureWorldPose(obj, out) {
    obj.updateMatrixWorld(true);
    obj.matrixWorld.decompose(out.pos, out.quat, out.scale);
  }

  function reparentKeepingWorld(obj, newParent, worldPose) {
    newParent.add(obj);
    obj.position.copy(worldPose.pos);
    obj.quaternion.copy(worldPose.quat);
    obj.scale.copy(worldPose.scale);
  }

  async function build() {
    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(PANEL_W, PANEL_H),
      new THREE.MeshStandardMaterial({
        color: 0x0a0a0f,
        transparent: true,
        opacity: 0.35,
        roughness: 0.55,
        metalness: 0.02,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0.04
      })
    );
    back.position.set(0, 0.02, -0.01);
    root.add(back);

    closeMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(CLOSE_SIZE, CLOSE_SIZE),
      new THREE.MeshStandardMaterial({
        map: makeCloseTexture(256),
        transparent: true,
        opacity: 0.0,
        roughness: 0.25,
        metalness: 0.02,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0.12
      })
    );
    closeMesh.name = "closeButton";
    closeMesh.position.set(
      (PANEL_W / 2) - (CLOSE_SIZE / 2) - CLOSE_PAD,
      (PANEL_H / 2) - (CLOSE_SIZE / 2) - CLOSE_PAD + 0.02,
      0.03
    );
    root.add(closeMesh);
    pickables.push(closeMesh);

    carouselGroup = new THREE.Group();
    carouselGroup.position.set(0, CAROUSEL_Y, CAROUSEL_Z);
    carouselGroup.add(CAROUSEL_OFFSET);
    root.add(carouselGroup);

    const textures = [];
    for (let i = 0; i < CAROUSEL_IMAGES.length; i++) {
      setStatus(`loading images ${i+1}/${CAROUSEL_IMAGES.length}`, false);
      textures.push(await loadTextureRobust(CAROUSEL_IMAGES[i]));
    }

    const angleStep = (Math.PI * 2) / CAROUSEL_IMAGES.length;
    for (let i = 0; i < CAROUSEL_IMAGES.length; i++) {
      const tex = textures[i];
      const geo = new THREE.PlaneGeometry(CAROUSEL_ITEM_W, CAROUSEL_ITEM_H);
      const mat = makePanelMaterial(tex);
      mat.opacity = 0.0;

      const mesh = new THREE.Mesh(geo, mat);

      const a = i * angleStep;
      mesh.position.set(Math.sin(a) * CAROUSEL_RADIUS, 0, Math.cos(a) * CAROUSEL_RADIUS);
      mesh.lookAt(0, 0, 0);

      const border = new THREE.Mesh(
        new THREE.PlaneGeometry(CAROUSEL_ITEM_W + 0.012, CAROUSEL_ITEM_H + 0.012),
        new THREE.MeshStandardMaterial({
          color: 0x111118,
          roughness: 0.6,
          metalness: 0.02,
          transparent: true,
          opacity: 0.65
        })
      );
      border.position.set(0, 0, -0.002);
      mesh.add(border);

      carouselGroup.add(mesh);
      carouselMeshes.push(mesh);
      pickables.push(mesh);
    }

    const textPanel = makeTextPanelTexture({
      width: 1024,
      height: 512,
      text: BODY_TEXT,
      padding: 56,
      font: "28px system-ui, -apple-system, Segoe UI, Roboto, Arial",
      lineHeight: 40
    });

    textMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(TEXT_W, TEXT_H),
      new THREE.MeshStandardMaterial({
        map: textPanel.texture,
        transparent: true,
        opacity: 0.0,
        roughness: 0.35,
        metalness: 0.02,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0.10
      })
    );
    textMesh.name = "textPanel";
    textMesh.position.set(0, TEXT_Y, 0.02);
    root.add(textMesh);
    pickables.push(textMesh);

    api.onDragText = (dy) => textPanel.setScroll(-dy * TEXT_SCROLL_SPEED);

    root.scale.setScalar(0.001);
    root.visible = false;
    root.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });

    setStatus("ready", true);
  }

  function resetRevealState() {
    isRevealing = false;
    revealT = 0;
    root.scale.setScalar(0.001);

    for (const m of carouselMeshes) {
      if (!m.material) continue;
      m.material.userData._baseOpacity = 0;
      m.material.opacity = 0;
    }
    if (textMesh?.material) textMesh.material.opacity = 0;
    if (closeMesh?.material) closeMesh.material.opacity = 0;

    carouselVel = 0;
  }

  function open() {
    closedByUser = false;
    isOpen = true;
    root.visible = true;
    isRevealing = true;
    revealT = 0;
    root.scale.setScalar(0.001);
  }

  function close() {
    closedByUser = true;
    isOpen = false;
    resetRevealState();
    root.visible = false;
  }

  function updateReveal(dt) {
    if (!isRevealing) return;

    revealT += dt / REVEAL_DURATION_S;
    const t = clamp(revealT, 0, 1);
    const e = easeOutCubic(t);

    root.scale.setScalar(0.001 + e * 0.999);

    for (const m of carouselMeshes) {
      if (!m.material) continue;
      m.material.userData._baseOpacity = e;
      m.material.opacity = e * 0.9;
    }
    if (textMesh?.material) textMesh.material.opacity = e;
    if (closeMesh?.material) closeMesh.material.opacity = e;

    if (t >= 1) isRevealing = false;
  }

  function updateCarousel(dt, pointerDown) {
    if (!isOpen) return;

    carouselAngle += carouselVel;
    carouselVel *= ROT_FRICTION;

    const n = carouselMeshes.length;
    if (n > 0 && Math.abs(carouselVel) < 0.0009 && !pointerDown) {
      const angleStep = (Math.PI * 2) / n;
      const target = Math.round(carouselAngle / angleStep) * angleStep;
      const diff = (target - carouselAngle);
      carouselVel += diff * ROT_SPRING * dt * 60;
    }

    carouselGroup.rotation.y = carouselAngle;

    for (const m of carouselMeshes) {
      const localZ = m.position.z;
      const zNorm = (localZ / CAROUSEL_RADIUS + 1) * 0.5;
      const s = 0.88 + zNorm * 0.22;
      m.scale.setScalar(s);

      if (m.material?.transparent) {
        const base = m.material.userData._baseOpacity ?? 1.0;
        const boost = 0.55 + zNorm * 0.45;
        m.material.opacity = base * boost;
      }
    }
  }

  function switchToFree(elapsed) {
    mode = "free";
    captureWorldPose(root, fromPose);
    reparentKeepingWorld(root, scene, fromPose);
    transitioningToFree = true;
    transitionT = 0;
    freePose.init = false;
  }

  function switchToTracked(anchorGroup) {
    mode = "tracked";

    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    const worldScale = new THREE.Vector3();
    root.updateMatrixWorld(true);
    root.matrixWorld.decompose(worldPos, worldQuat, worldScale);

    anchorGroup.add(root);

    anchorGroup.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(anchorGroup.matrixWorld).invert();
    const m = new THREE.Matrix4().compose(worldPos, worldQuat, worldScale).premultiply(inv);

    const lp = new THREE.Vector3();
    const lq = new THREE.Quaternion();
    const ls = new THREE.Vector3();
    m.decompose(lp, lq, ls);

    root.position.copy(lp);
    root.quaternion.copy(lq);
    root.scale.copy(ls);

    transitioningToFree = false;
    transitionT = 0;
  }

  function updateFree(dt, elapsed) {
    if (mode !== "free" || !isOpen) return;

    transitionT += dt / TRANSITION_DURATION_S;
    const t = clamp(transitionT, 0, 1);
    const e = t * t * (3 - 2 * t);

    const target = computeFreeTargetPose(elapsed);

    if (transitioningToFree) {
      root.position.lerpVectors(fromPose.pos, target.pos, e);
      root.quaternion.slerpQuaternions(fromPose.quat, target.quat, e);
      root.scale.lerpVectors(fromPose.scale, target.scale, e);

      if (t >= 1) {
        transitioningToFree = false;
        freePose.init = false;
      }
    } else {
      const k = 10.0;
      const tt = 1 - Math.exp(-k * dt);
      if (!freePose.init) {
        freePose.pos.copy(root.position);
        freePose.quat.copy(root.quaternion);
        freePose.scale.copy(root.scale);
        freePose.init = true;
      }
      freePose.pos.lerp(target.pos, tt);
      freePose.quat.slerp(target.quat, tt);
      freePose.scale.lerp(target.scale, tt);

      root.position.copy(freePose.pos);
      root.quaternion.copy(freePose.quat);
      root.scale.copy(freePose.scale);
    }
  }

  const api = {
    root,
    pickables,
    build,
    isOpen: () => isOpen,
    closedByUser: () => closedByUser,
    open,
    close,
    resetRevealState,
    onDragCarousel: (dx) => { carouselVel += dx * DRAG_TO_ROT; },
    onDragText: null,
    tick: ({ dt, elapsed, pointerDown }) => {
      updateReveal(dt);
      updateCarousel(dt, pointerDown);
      updateFree(dt, elapsed);
    },
    onTargetFound: ({ anchorGroup }) => {
      if (!isOpen || closedByUser) open();
      if (mode === "free") switchToTracked(anchorGroup);
    },
    onTargetLost: ({ elapsed }) => {
      if (isOpen && mode === "tracked") switchToFree(elapsed);
    },
    dispose: () => {}
  };

  return api;
}
