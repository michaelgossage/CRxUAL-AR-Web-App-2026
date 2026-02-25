// Three + MindAR from CDN to keep compatibility/stability with MindAR’s published bundle.
import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { MindARThree } from "https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js";

export { THREE };

export async function createMindAREngine({ container, mindFileUrl }) {
  const mindarThree = new MindARThree({
    container,
    imageTargetSrc: mindFileUrl
  });

  const { renderer, scene, camera } = mindarThree;

  const cameraRig = camera.parent || camera;

  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Lighting baseline
  scene.add(new THREE.HemisphereLight(0xffffff, 0x111111, 1.15));
  const dir = new THREE.DirectionalLight(0xffffff, 0.85);
  dir.position.set(1.2, 2.0, 1.0);
  scene.add(dir);

  const onResize = () => renderer.setSize(window.innerWidth, window.innerHeight);
  window.addEventListener("resize", onResize);

  await mindarThree.start();

  return {
    THREE,
    mindarThree,
    renderer,
    scene,
    camera,
    cameraRig,
    dispose: async () => {
      window.removeEventListener("resize", onResize);
      try { renderer.setAnimationLoop(null); } catch {}
      try { await mindarThree.stop(); } catch {}
    }
  };
}
