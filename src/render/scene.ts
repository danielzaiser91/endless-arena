import * as THREE from 'three';

export interface SceneCtx {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  heroSlot: THREE.Group;
  enemySlot: THREE.Group;
  updateCamera: (dt: number) => void;
  dispose: () => void;
}

const ORBIT_RADIUS = 9;
const ORBIT_HEIGHT = 4.5;
const ORBIT_SPEED = 0.06; // radians/sec

/** One fixed arena: floating platform, gradient skybox, slow orbiting camera (implementation.md §12). */
export function createScene(canvas: HTMLCanvasElement): SceneCtx {
  const scene = new THREE.Scene();
  scene.background = makeSkyGradient();

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const hemi = new THREE.HemisphereLight(0x8fb3ff, 0x201830, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2d0, 1.2);
  sun.position.set(4, 8, 3);
  scene.add(sun);

  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(4.2, 4.4, 0.4, 32),
    new THREE.MeshStandardMaterial({ color: 0x2a2540, metalness: 0.3, roughness: 0.6 }),
  );
  platform.position.y = -0.2;
  scene.add(platform);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(4.2, 0.06, 8, 48),
    new THREE.MeshStandardMaterial({ color: 0xe8b64c, emissive: 0x6b4d17, emissiveIntensity: 0.6 }),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.01;
  scene.add(rim);

  const heroSlot = new THREE.Group();
  heroSlot.position.set(-1.6, 0, 0);
  scene.add(heroSlot);

  const enemySlot = new THREE.Group();
  enemySlot.position.set(1.6, 0, 0);
  scene.add(enemySlot);

  let orbitAngle = 0;
  function resize(): void {
    const parent = canvas.parentElement!;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  function updateCamera(dt: number): void {
    orbitAngle += ORBIT_SPEED * dt;
    camera.position.set(Math.sin(orbitAngle) * ORBIT_RADIUS, ORBIT_HEIGHT, Math.cos(orbitAngle) * ORBIT_RADIUS);
    camera.lookAt(0, 0.8, 0);
  }

  function dispose(): void {
    window.removeEventListener('resize', resize);
    renderer.dispose();
  }

  return { scene, camera, renderer, heroSlot, enemySlot, updateCamera, dispose };
}

function makeSkyGradient(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#1a1436');
  grad.addColorStop(0.55, '#241a44');
  grad.addColorStop(1, '#0a0a12');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
