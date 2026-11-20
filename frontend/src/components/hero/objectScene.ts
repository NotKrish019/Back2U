/**
 * Back2U hero scene — a small, art-directed set of everyday objects built procedurally
 * (no model downloads). Imported lazily by Hero3D so three.js never blocks first paint.
 *
 * The scene is purely illustrative: the bracket that moves between objects is a visual
 * metaphor for the detect → crop step of the real pipeline, not a live computation.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export type FocusRect = { x: number; y: number; w: number; h: number; label: string; index: number };

export type SceneHandle = {
  dispose: () => void;
  setActive: (active: boolean) => void;
};

type Options = {
  canvas: HTMLCanvasElement;
  container: HTMLElement;
  reducedMotion: boolean;
  compact: boolean; // small viewport: tighter composition
  onFocus: (r: FocusRect | null) => void;
};

const C = {
  ink: 0x1a1816,
  bone: 0xece6da,
  paper: 0xf3efe7,
  signal: 0xd92d55,
  brass: 0xb5955c,
  aluminium: 0xc9c6bf,
  cognac: 0x7a4026,
  glass: 0x0f0f12,
};

export function createObjectScene({ canvas, container, reducedMotion, compact, onFocus }: Options): SceneHandle {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.98;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  camera.position.set(0, 0, 15);

  const key = new THREE.DirectionalLight(0xfff4e6, 1.7);
  key.position.set(-2.2, 3.6, 12);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0006;
  key.shadow.radius = 14;
  key.shadow.blurSamples = 20;
  Object.assign(key.shadow.camera, { left: -7, right: 7, top: 6, bottom: -6, near: 1, far: 30 });
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffe2e8, 0.7);
  rim.position.set(6, -2, -4);
  scene.add(rim);
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));

  const disposables: { dispose: () => void }[] = [envRT, pmrem];
  const track = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x);

  const mat = (color: number, opts: Partial<THREE.MeshPhysicalMaterialParameters> = {}) =>
    track(new THREE.MeshPhysicalMaterial({ color, roughness: 0.55, metalness: 0, ...opts }));

  const M = {
    inkGloss: mat(C.ink, { roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.15 }),
    glass: mat(C.glass, { roughness: 0.08, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.03 }),
    bone: mat(C.bone, { roughness: 0.62, sheen: 0.4, sheenColor: new THREE.Color(0xffffff) }),
    signal: mat(C.signal, { roughness: 0.5, clearcoat: 0.4, clearcoatRoughness: 0.4 }),
    brass: mat(C.brass, { roughness: 0.32, metalness: 1 }),
    alu: mat(C.aluminium, { roughness: 0.26, metalness: 1 }),
    cognac: mat(C.cognac, { roughness: 0.72, sheen: 0.6, sheenColor: new THREE.Color(0xc98a62) }),
    inkMatte: mat(C.ink, { roughness: 0.8 }),
  };

  const geo = <T extends THREE.BufferGeometry>(g: T) => track(g);
  const mesh = (g: THREE.BufferGeometry, m: THREE.Material) => new THREE.Mesh(g, m);

  // ------------------------------------------------------------ objects
  function phone() {
    const g = new THREE.Group();
    g.add(mesh(geo(new RoundedBoxGeometry(0.82, 1.68, 0.09, 6, 0.1)), M.inkGloss));
    const screen = mesh(geo(new RoundedBoxGeometry(0.74, 1.58, 0.01, 4, 0.07)), M.glass);
    screen.position.z = 0.046;
    g.add(screen);
    const cam = mesh(geo(new RoundedBoxGeometry(0.32, 0.32, 0.05, 4, 0.08)), M.inkGloss);
    cam.position.set(-0.2, 0.6, -0.065);
    g.add(cam);
    return g;
  }

  function keyShape() {
    const s = new THREE.Shape();
    s.absarc(0, 0, 0.26, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0.08, 0.07, 0, Math.PI * 2, true);
    s.holes.push(hole);
    const blade = new THREE.Shape();
    blade.moveTo(-0.07, -0.2);
    blade.lineTo(0.07, -0.2);
    blade.lineTo(0.07, -0.62);
    blade.lineTo(0.14, -0.66);
    blade.lineTo(0.07, -0.72);
    blade.lineTo(0.13, -0.78);
    blade.lineTo(0.07, -0.84);
    blade.lineTo(0.07, -1.02);
    blade.lineTo(-0.07, -1.06);
    blade.lineTo(-0.07, -0.2);
    return [s, blade];
  }
  function keys() {
    const g = new THREE.Group();
    const ring = mesh(geo(new THREE.TorusGeometry(0.32, 0.028, 16, 64)), M.alu);
    ring.rotation.y = 0.5;
    g.add(ring);
    const shapes = keyShape();
    const kGeo = geo(new THREE.ExtrudeGeometry(shapes, { depth: 0.04, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2, curveSegments: 24 }));
    kGeo.center();
    const k1 = mesh(kGeo, M.brass);
    k1.position.set(-0.06, -0.72, 0);
    k1.rotation.z = 0.22;
    g.add(k1);
    const k2 = mesh(kGeo, M.alu);
    k2.position.set(0.2, -0.66, -0.06);
    k2.rotation.z = -0.32;
    g.add(k2);
    // signal fob
    const fob = mesh(geo(new RoundedBoxGeometry(0.22, 0.42, 0.08, 4, 0.1)), M.signal);
    fob.position.set(-0.36, -0.42, 0.05);
    fob.rotation.z = 0.7;
    g.add(fob);
    g.position.y = 0.4;
    return g;
  }

  function wallet() {
    const g = new THREE.Group();
    g.add(mesh(geo(new RoundedBoxGeometry(1.32, 0.98, 0.2, 6, 0.08)), M.cognac));
    const flap = mesh(geo(new RoundedBoxGeometry(0.5, 0.98, 0.04, 4, 0.02)), M.cognac);
    flap.position.set(0.42, 0, 0.11);
    g.add(flap);
    const snap = mesh(geo(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 24)), M.brass);
    snap.rotation.x = Math.PI / 2;
    snap.position.set(0.5, 0, 0.14);
    g.add(snap);
    const card = mesh(geo(new RoundedBoxGeometry(0.62, 0.4, 0.015, 2, 0.02)), M.bone);
    card.position.set(-0.28, 0.42, 0.02);
    card.rotation.z = 0.08;
    g.add(card);
    return g;
  }

  function headphones() {
    const g = new THREE.Group();
    const band = mesh(geo(new THREE.TorusGeometry(0.72, 0.06, 16, 64, Math.PI)), M.bone);
    g.add(band);
    const pad = mesh(geo(new THREE.TorusGeometry(0.72, 0.045, 12, 48, Math.PI * 0.5)), M.inkMatte);
    pad.rotation.z = Math.PI * 0.25;
    pad.position.z = 0.0;
    pad.scale.setScalar(0.985);
    g.add(pad);
    const cupGeo = geo(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 40));
    const cushGeo = geo(new THREE.TorusGeometry(0.24, 0.07, 14, 40));
    const armGeo = geo(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 12));
    for (const side of [-1, 1]) {
      const cup = mesh(cupGeo, M.bone);
      cup.rotation.z = Math.PI / 2;
      cup.position.set(side * 0.74, -0.3, 0);
      g.add(cup);
      const cush = mesh(cushGeo, M.inkMatte);
      cush.rotation.y = Math.PI / 2;
      cush.position.set(side * 0.62, -0.3, 0);
      g.add(cush);
      const arm = mesh(armGeo, M.alu);
      arm.position.set(side * 0.74, -0.02, 0);
      g.add(arm);
    }
    g.position.y = 0.2;
    return g;
  }

  function bottle() {
    const pts: THREE.Vector2[] = [];
    const prof: [number, number][] = [
      [0.0, -0.95], [0.3, -0.95], [0.34, -0.9], [0.35, -0.8], [0.35, 0.42], [0.33, 0.55],
      [0.24, 0.7], [0.2, 0.76], [0.2, 0.8],
    ];
    prof.forEach(([x, y]) => pts.push(new THREE.Vector2(x, y)));
    const g = new THREE.Group();
    g.add(mesh(geo(new THREE.LatheGeometry(pts, 48)), M.signal));
    const cap = mesh(geo(new THREE.CylinderGeometry(0.21, 0.22, 0.24, 40)), M.inkGloss);
    cap.position.y = 0.92;
    g.add(cap);
    const loop = mesh(geo(new THREE.TorusGeometry(0.1, 0.025, 10, 24)), M.inkGloss);
    loop.position.set(0, 1.1, 0);
    g.add(loop);
    return g;
  }

  function idCard() {
    const g = new THREE.Group();
    g.add(mesh(geo(new RoundedBoxGeometry(1.1, 0.7, 0.025, 3, 0.04)), M.bone));
    const stripe = mesh(geo(new THREE.BoxGeometry(1.1, 0.12, 0.028)), M.signal);
    stripe.position.y = 0.22;
    g.add(stripe);
    const photo = mesh(geo(new RoundedBoxGeometry(0.26, 0.3, 0.03, 2, 0.02)), M.inkMatte);
    photo.position.set(-0.34, -0.08, 0.002);
    g.add(photo);
    const lineGeo = geo(new THREE.BoxGeometry(0.46, 0.035, 0.03));
    [-0.02, -0.1, -0.18].forEach((y, i) => {
      const l = mesh(lineGeo, M.alu);
      l.scale.x = i === 2 ? 0.6 : 1;
      l.position.set(0.14 - (i === 2 ? 0.09 : 0), y, 0.002);
      g.add(l);
    });
    const lanyard = mesh(geo(new THREE.TorusGeometry(0.07, 0.02, 8, 20)), M.alu);
    lanyard.position.set(0, 0.42, 0);
    g.add(lanyard);
    return g;
  }

  // ------------------------------------------------------------ composition
  type Item = { obj: THREE.Group; label: string; base: THREE.Vector3; rot: THREE.Euler; phase: number; spin: number; scale: number };
  const wide: [() => THREE.Group, string, [number, number, number], [number, number, number], number][] = [
    [phone, "Phone", [0.1, 0.3, 0.6], [0.12, -0.5, 0.18], 1.15],
    [keys, "Keys", [2.35, 1.85, -0.4], [0.3, 0.6, -0.2], 1.1],
    [wallet, "Wallet", [2.25, -1.45, 0.2], [-0.35, -0.55, 0.1], 1.05],
    [headphones, "Headphones", [-2.05, 1.85, -1.0], [0.25, 0.5, -0.12], 1.05],
    [bottle, "Water bottle", [-1.95, -1.45, -0.2], [0.18, 0.2, -0.38], 1.0],
    [idCard, "ID card", [0.45, -2.55, -1.2], [-0.5, 0.35, 0.22], 1.0],
  ];
  const root = new THREE.Group();
  scene.add(root);
  // invisible paper wall that only receives soft shadows — product-photography depth
  const wall = new THREE.Mesh(geo(new THREE.PlaneGeometry(60, 40)), track(new THREE.ShadowMaterial({ color: 0x3a2a1a, opacity: 0.075 })));
  wall.position.z = -2.8;
  wall.receiveShadow = true;
  scene.add(wall);
  const items: Item[] = wide.map(([make, label, p, r, s], i) => {
    const obj = make();
    const base = new THREE.Vector3(...p);
    if (compact) base.multiply(new THREE.Vector3(0.78, 0.86, 1));
    obj.position.copy(base);
    obj.rotation.set(...r);
    obj.scale.setScalar(s);
    obj.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
    root.add(obj);
    return { obj, label, base, rot: new THREE.Euler(...r), phase: i * 1.37, spin: (i % 2 ? -1 : 1) * (0.05 + (i % 3) * 0.02), scale: s };
  });

  // ------------------------------------------------------------ sizing
  let w = 1, h = 1;
  const resize = () => {
    const r = container.getBoundingClientRect();
    w = Math.max(1, r.width);
    h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the composition inside the frame on narrow aspect ratios
    camera.position.z = camera.aspect < 1 ? 15 / Math.max(0.62, camera.aspect) : 15;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  // ------------------------------------------------------------ pointer
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointer = (e: PointerEvent) => {
    if (e.pointerType === "touch") return;
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener("pointermove", onPointer, { passive: true });

  // ------------------------------------------------------------ focus bracket
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  let focus = 0;
  let focusSince = 0;
  const FOCUS_MS = 2800;
  const projectFocus = () => {
    const it = items[focus];
    box.setFromObject(it.obj);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < 8; i++) {
      v.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(camera);
      const sx = (v.x * 0.5 + 0.5) * w;
      const sy = (-v.y * 0.5 + 0.5) * h;
      minX = Math.min(minX, sx); maxX = Math.max(maxX, sx);
      minY = Math.min(minY, sy); maxY = Math.max(maxY, sy);
    }
    const pad = 10;
    onFocus({ x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2, label: it.label, index: focus });
  };

  // ------------------------------------------------------------ loop
  let raf = 0;
  let running = false;
  const clock = new THREE.Clock();
  const frame = () => {
    const t = clock.getElapsedTime();
    const now = performance.now();
    pointer.x += (pointer.tx - pointer.x) * 0.045;
    pointer.y += (pointer.ty - pointer.y) * 0.045;
    root.rotation.y = pointer.x * 0.22;
    root.rotation.x = pointer.y * 0.12;

    if (now - focusSince > FOCUS_MS) {
      focus = (focus + 1) % items.length;
      focusSince = now;
    }
    items.forEach((it, i) => {
      it.obj.position.y = it.base.y + Math.sin(t * 0.6 + it.phase) * 0.12;
      it.obj.position.x = it.base.x + Math.cos(t * 0.45 + it.phase) * 0.05;
      it.obj.rotation.y = it.rot.y + Math.sin(t * 0.3 + it.phase) * 0.25 + t * it.spin;
      it.obj.rotation.x = it.rot.x + Math.cos(t * 0.4 + it.phase) * 0.06;
      const target = it.scale * (i === focus ? 1.08 : 1);
      const s = it.obj.scale.x + (target - it.obj.scale.x) * 0.06;
      it.obj.scale.setScalar(s);
    });
    renderer.render(scene, camera);
    projectFocus();
    raf = requestAnimationFrame(frame);
  };

  const renderStatic = () => {
    // reduced motion: one composed frame, bracket parked on the phone
    renderer.render(scene, camera);
    projectFocus();
  };

  const setActive = (active: boolean) => {
    if (reducedMotion) {
      renderStatic();
      return;
    }
    if (active && !running) {
      running = true;
      clock.start();
      focusSince = performance.now();
      raf = requestAnimationFrame(frame);
    } else if (!active && running) {
      running = false;
      cancelAnimationFrame(raf);
      clock.stop();
    }
  };

  const onResizeStatic = () => reducedMotion && renderStatic();
  ro.disconnect();
  const ro2 = new ResizeObserver(() => { resize(); onResizeStatic(); });
  ro2.observe(container);

  return {
    setActive,
    dispose: () => {
      running = false;
      cancelAnimationFrame(raf);
      ro2.disconnect();
      window.removeEventListener("pointermove", onPointer);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      onFocus(null);
    },
  };
}

export function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch {
    return false;
  }
}
