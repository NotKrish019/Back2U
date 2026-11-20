/**
 * Back2U scroll story — one persistent WebGL scene whose state is a pure function of
 * scroll progress p ∈ [0, 1]. Lazily imported; never blocks first paint.
 *
 *   0.00–0.24  I   Object universe: belongings suspended in space, camera flies through
 *   0.24–0.40  II  Identification: one object isolated inside an analysis instrument
 *   0.40–0.62  III Search process: upload → understanding → search → matching → recovery
 *   0.62–0.86  IV  Instance: nine near-identical cameras, only one is yours
 *   0.86–1.00  V   Hand-off to the real search interface
 *
 * Everything here is illustration. No model output is shown or implied.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { buildProcedural } from "./procedural";
import { buildArchive } from "./archive";

export type FrameInfo = {
  focus: { x: number; y: number; w: number; h: number; visible: boolean };
  markers: { x: number; y: number }[];
  scan: { x: number; y: number; w: number; h: number; index: number; locked: boolean; visible: boolean };
  cloud: { x: number; y: number };
  /** Chapter I only: the object currently "discovered" (auto cycle, hover or click). */
  hero1: { x: number; y: number; visible: boolean; label: string; n: number; name: string; hover: boolean };
  /** Chapter V only — the archive: object in focus / under the pointer, and the scene phase. */
  arc: { k: number; u: number; fx: number; fy: number; focus: string; hx: number; hy: number; hover: string };
};

export type StoryHandle = {
  setProgress: (p: number) => void;
  /** Chapter I: bring one object forward (index bar / keyboard). */
  discover: (name: string) => void;
  setActive: (on: boolean) => void;
  dispose: () => void;
};

type Opts = {
  canvas: HTMLCanvasElement;
  container: HTMLElement;
  compact: boolean;
  reducedMotion: boolean;
  onLoad: (fraction: number) => void;
  onFrame: (f: FrameInfo) => void;
};

const PAPER = new THREE.Color(0xf3efe7);
const INK = new THREE.Color(0x141210);

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ss = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function createStoryScene({ canvas, container, compact, reducedMotion, onLoad, onFrame }: Opts): StoryHandle {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = !compact;
  renderer.localClippingEnabled = true; // used only by the chapter-I orbit hairlines
  renderer.shadowMap.type = THREE.VSMShadowMap;

  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x);

  const scene = new THREE.Scene();
  const pmrem = track(new THREE.PMREMGenerator(renderer));
  const env = track(pmrem.fromScene(new RoomEnvironment(), 0.035));
  scene.environment = env.texture;
  scene.fog = new THREE.Fog(PAPER.clone(), 20, 40);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 120);
  camera.position.set(0, 0, 16);
  const lookAt = new THREE.Vector3();

  // ---------------------------------------------------------------- lights
  const key = new THREE.DirectionalLight(0xfff1e2, 1.9);
  key.position.set(-3, 5, 12);
  key.castShadow = !compact;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.radius = 14;
  key.shadow.blurSamples = 16;
  key.shadow.bias = -0.0006;
  Object.assign(key.shadow.camera, { left: -11, right: 11, top: 7, bottom: -7, near: 1, far: 40 });
  scene.add(key);
  const rimA = new THREE.DirectionalLight(0xffd6e0, 0.6); // signal-tinted rim for the dark chapters
  rimA.position.set(6, 2, -6);
  scene.add(rimA);
  const rimB = new THREE.DirectionalLight(0xdfe8ff, 0.3);
  rimB.position.set(-7, -3, -4);
  scene.add(rimB);
  const fill = new THREE.AmbientLight(0xffffff, 0.2);
  scene.add(fill);

  const wall = new THREE.Mesh(track(new THREE.PlaneGeometry(80, 50)), track(new THREE.ShadowMaterial({ color: 0x3a2a1a, opacity: 0.06 })));
  wall.position.z = -9;
  wall.receiveShadow = true;
  scene.add(wall);

  // ---------------------------------------------------------------- objects
  type Obj = {
    name: string;
    pivot: THREE.Group;      // positioned/rotated by the story
    base: THREE.Vector3;     // universe position
    rot: THREE.Euler;        // universe rotation
    size: number;            // universe scale (pivot.scale)
    phase: number;
    ready: boolean;
    appear: number;          // 0→1 pop-in when its asset finishes loading
  };
  const objs: Obj[] = [];
  const root = new THREE.Group();
  scene.add(root);

  // universe composition — text lives on the left, so mass sits centre-right and recedes behind it
  const LAYOUT: Record<string, [number, number, number, number, number, number, number]> = {
    //            x     y     z    size   rx    ry    rz
    camera:     [ 3.0, -0.25,  0.6, 3.0,  0.06, -0.62, 0.02],
    headphones: [ 1.2,  2.6, -1.6, 2.1,  0.25,  0.45, -0.1],
    watch:      [ 7.4,  1.0, -3.0, 1.4,  0.9,   0.3,  0.2],
    sunglasses: [ 5.6, -2.6,  0.6, 1.9,  0.25, -0.5,  0.08],
    phone:      [ 1.5, -2.5,  0.4, 1.7,  0.12,  0.55, 0.22],
    wallet:     [ 6.0,  2.6, -1.0, 1.4,  0.9,  -0.35, 0.18],
    keys:       [ 3.6, -1.9, -2.6, 1.2,  0.2,   0.5,  0.3],
    bottle:     [ 9.4, -2.4, -7.0, 2.2,  0.1,   0.2, -0.32],
    shoe:       [10.2,  3.6, -8.0, 2.6,  0.3,  -0.9,  0.1],
    suitcase:   [-1.6,  4.6,-10.0, 2.6,  0.05,  0.6,  0.0],
  };
  const COMPACT_SKIP = new Set(["shoe", "suitcase", "keys"]);

  const addObj = (name: string, model: THREE.Object3D, ready: boolean) => {
    const L = LAYOUT[name];
    if (!L || (compact && COMPACT_SKIP.has(name))) return null;
    // normalise: centre + unit max dimension
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const norm = new THREE.Group();
    model.position.sub(center);
    norm.add(model);
    norm.scale.setScalar(1 / Math.max(size.x, size.y, size.z));
    const pivot = new THREE.Group();
    pivot.add(norm);
    pivot.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; } });
    let [x, y, z, s, rx, ry, rz] = L;
    if (compact) { x = (x - 4) * 0.42; y = y * 0.33 - 4.1; z = z * 0.6; s *= 0.8; }
    if (name === "camera") { x = H_CENTER.x; y = H_CENTER.y; z = H_CENTER.z; s = hc ? 2.3 : 3.5; }
    const o: Obj = { name, pivot, base: new THREE.Vector3(x, y, z), rot: new THREE.Euler(rx, ry, rz), size: s, phase: objs.length * 1.37, ready, appear: 0 };
    pivot.position.copy(o.base);
    pivot.rotation.copy(o.rot);
    pivot.scale.setScalar(0.0001);
    root.add(pivot);
    objs.push(o);
    return o;
  };

  const P = buildProcedural(track);
  addObj("phone", P.phone(), true);
  addObj("wallet", P.wallet(), true);
  addObj("keys", P.keys(), true);
  addObj("headphones", P.headphones(), true);

  // ---------------------------------------------------------------- the protagonist: "your" camera
  let hero: Obj | null = null;
  let heroModel: THREE.Object3D | null = null;
  const tagGroup = new THREE.Group(); // pink luggage tag — the one detail that makes it yours
  const tagSwing = new THREE.Group();

  // ================================================================ CHAPTER I — "the orbit of lost objects"
  // Everything in this block is multiplied by heroK (= 1 in chapter I, exactly 0 from p = 0.24),
  // so chapters II–V render precisely as before.
  const LABELS: Record<string, string> = {
    camera: "Camera", headphones: "Headphones", phone: "Smartphone", wallet: "Wallet", keys: "Keys",
    watch: "Watch", sunglasses: "Sunglasses", bottle: "Water bottle", shoe: "Sneaker", suitcase: "Suitcase",
  };
  const ORDER = ["camera", "headphones", "phone", "wallet", "keys", "watch", "sunglasses", "bottle", "shoe", "suitcase"];
  // two counter-rotating orbits: [ring, angle offset (rad), size]
  const ORBIT: Record<string, [0 | 1, number, number]> = {
    headphones: [0, 0.35, 1.5], wallet: [0, 1.95, 1.15], watch: [0, 3.5, 1.0], keys: [0, 5.0, 1.0],
    phone: [1, 0.0, 1.35], sunglasses: [1, 1.25, 1.45], bottle: [1, 2.5, 1.4], shoe: [1, 3.75, 1.7], suitcase: [1, 5.0, 1.7],
  };
  const hc = compact || window.innerWidth / Math.max(1, window.innerHeight) < 0.9; // chapter-I layout only
  const H_CENTER = hc ? new THREE.Vector3(0, -3.35, 0.4) : new THREE.Vector3(3.35, -0.2, 0.6);
  const RING = hc
    ? [{ rx: 1.9, rz: 1.35, y: 1.15, w: 0.07 }, { rx: 2.75, rz: 1.9, y: -0.55, w: -0.05 }]
    : [{ rx: 4.1, rz: 3.05, y: 1.6, w: 0.065 }, { rx: 4.6, rz: 3.3, y: -0.85, w: -0.045 }];
  const YAW = hc ? -0.25 : -0.78; // orbit plane yaw: left side recedes behind the headline, right side sweeps forward
  const orbitPoint = (ring: number, theta: number, out: THREE.Vector3) => {
    const R = RING[ring];
    const lx = R.rx * Math.cos(theta), lz = R.rz * Math.sin(theta);
    out.set(lx * Math.cos(YAW) + lz * Math.sin(YAW), R.y, -lx * Math.sin(YAW) + lz * Math.cos(YAW)).add(H_CENTER);
    // desktop: anything drifting toward the headline sinks deeper into the atmosphere
    if (!hc) { const k = clamp01((1.6 - out.x) / 3.2); out.z -= k * 3.2; out.y += k * 0.6; }
    return out;
  };
  const install = new THREE.Group();
  scene.add(install);
  // display plinth: glossy, receives the camera's shadow
  const plinthMat = track(new THREE.MeshPhysicalMaterial({ color: 0xeee6d8, roughness: 0.28, clearcoat: 0.9, clearcoatRoughness: 0.18 }));
  const plinth = new THREE.Mesh(track(new THREE.CylinderGeometry(hc ? 1.45 : 2.05, hc ? 1.5 : 2.12, 0.16, 96)), plinthMat);
  plinth.receiveShadow = true;
  plinth.castShadow = true;
  const brassMat = track(new THREE.MeshPhysicalMaterial({ color: 0xc3a160, metalness: 1, roughness: 0.3 }));
  const plinthRim = new THREE.Mesh(track(new THREE.TorusGeometry(hc ? 1.47 : 2.08, 0.018, 12, 120)), brassMat);
  plinthRim.rotation.x = Math.PI / 2;
  plinthRim.position.y = 0.08;
  const plinthG = new THREE.Group();
  plinthG.add(plinth, plinthRim);
  plinthG.position.copy(H_CENTER).add(new THREE.Vector3(0, hc ? -1.15 : -1.62, 0));
  install.add(plinthG);
  // the instrument dial: a brass circle with graduations, slowly turning behind the camera
  const dial = new THREE.Group();
  const dialR = hc ? 2.0 : 2.85;
  dial.add(new THREE.Mesh(track(new THREE.TorusGeometry(dialR, 0.012, 8, 200)), brassMat));
  const tickPos: number[] = [];
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * Math.PI * 2, len = i % 10 === 0 ? 0.22 : i % 5 === 0 ? 0.13 : 0.07;
    tickPos.push(Math.cos(a) * dialR, Math.sin(a) * dialR, 0, Math.cos(a) * (dialR - len), Math.sin(a) * (dialR - len), 0);
  }
  const tickGeo = track(new THREE.BufferGeometry());
  tickGeo.setAttribute("position", new THREE.Float32BufferAttribute(tickPos, 3));
  const tickMat = track(new THREE.LineBasicMaterial({ color: 0xa88b57, transparent: true, opacity: 0.75 }));
  dial.add(new THREE.LineSegments(tickGeo, tickMat));
  const dialInnerMat = track(new THREE.MeshBasicMaterial({ color: 0xa88b57, transparent: true, opacity: 0.35 }));
  dial.add(new THREE.Mesh(track(new THREE.TorusGeometry(dialR * 0.86, 0.006, 6, 200)), dialInnerMat));
  dial.position.copy(H_CENTER).add(new THREE.Vector3(0, hc ? 0.15 : 0.2, -1.6));
  install.add(dial);
  // orbit paths as hairlines
  const orbitMats: THREE.LineBasicMaterial[] = [];
  RING.forEach((_, ri) => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 256; i++) pts.push(orbitPoint(ri, (i / 256) * Math.PI * 2, new THREE.Vector3()));
    const m = track(new THREE.LineBasicMaterial({ color: ri === 0 ? 0xd92d55 : 0xa88b57, transparent: true, opacity: 0 }));
    // desktop: orbit hairlines stop short of the headline column
    if (!hc) m.clippingPlanes = [new THREE.Plane(new THREE.Vector3(1, 0, 0), -0.9)];
    orbitMats.push(m);
    install.add(new THREE.Line(track(new THREE.BufferGeometry().setFromPoints(pts)), m));
  });
  // discovery ring: billboarded, blooms around the object in focus
  const scanRingMat = track(new THREE.MeshBasicMaterial({ color: 0xd92d55, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
  const scanRing = new THREE.Mesh(track(new THREE.RingGeometry(0.985, 1, 128)), scanRingMat);
  const scanRing2Mat = track(new THREE.MeshBasicMaterial({ color: 0xa88b57, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
  const scanRing2 = new THREE.Mesh(track(new THREE.RingGeometry(0.992, 1, 128)), scanRing2Mat);
  install.add(scanRing, scanRing2);

  // per-object chapter-I state
  type HState = { hl: number; push: THREE.Vector3 };
  const hstate = new Map<string, HState>();
  const hs = (n: string) => { let v = hstate.get(n); if (!v) { v = { hl: 0, push: new THREE.Vector3() }; hstate.set(n, v); } return v; };
  let realT = 0;                    // wall-clock seconds (advances even with reduced motion; `time` drives idle motion only)
  let introAt = -1;                 // realT when the entrance choreography starts (when the camera has loaded)
  let disc = { name: "camera", t0: reducedMotion ? -99 : 0, manual: false };
  let hoverName = "";
  const DISC_LEN = 3.4, DISC_GAP = 2.4;
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2(-10, -10);
  const zPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const pointerWorld = new THREE.Vector3(999, 999, 0);
  const tmpOrbit = new THREE.Vector3();
  const tmpSize = new THREE.Vector3();

  // ================================================================ CHAPTER V — "the lost object archive"
  // A separate environment (archive.ts). Every term is gated by a5 factors that are exactly 0 for p <= 0.86.
  const archive = buildArchive(track, compact);
  scene.add(archive.group);
  const TOBACCO = new THREE.Color(0x1a1411);
  // how each belonging rests in its compartment: [rx, ry, rz, size]
  const REST: Record<string, [number, number, number, number]> = {
    headphones: [-1.25, 0.2, 0.35, 1.45], camera: [0, -0.62, 0, 1.6], phone: [-Math.PI / 2, 0, 0.32, 1.25],
    notebook: [0, 0.25, 0, 1.0], wallet: [-Math.PI / 2, 0, -0.22, 1.15], keys: [-Math.PI / 2, 0, 0.7, 1.3],
    watch: [0.2, 0.6, 0, 1.45], sunglasses: [-1.2, 0, 0.25, 1.3],
  };
  const FOCUS_ORDER = ["headphones", "phone", "wallet", "watch", "sunglasses"];
  const arcHL = new Map<string, number>();
  let arcHover = "";
  const archCam = new THREE.Vector3(), archLook = new THREE.Vector3(), slotV = new THREE.Vector3();
  const camKeys = (portraitView: boolean) => portraitView
    ? [ // phones: a steeper, more top-down three-quarter view
      [0, 1.4, 19, 0, 0.3, -4], [1.4, 12.5, 9.5, 0, -1.4, -1.5], [-1.1, 12, 9, -0.3, -1.4, -1.4], [0.4, 13.5, 10.5, 0, -1.3, -1.6],
    ]
    : [
      [0, 1.0, 13.5, 0, 0.5, -4], [4.4, 5.4, 6.6, 0.3, -1.25, -1.7], [-3.2, 4.8, 5.4, -0.7, -1.3, -1.5], [0.9, 6.6, 7.8, 0.1, -1.2, -1.9],
    ];

  // instances (chapter IV)
  type Inst = { pivot: THREE.Group; slot: THREE.Vector3; mats: THREE.MeshStandardMaterial[]; tint: THREE.Color; delay: number };
  const instances: Inst[] = [];
  const GRID_ORDER = [0, 1, 2, 5, 4, 3, 6, 7, 8]; // serpentine scan order
  const TARGET_SLOT = 4; // centre

  // ---------------------------------------------------------------- embedding cloud (chapter III)
  const CLOUD_N = compact ? 360 : 720;
  const cloudCenter = new THREE.Vector3(compact ? 0 : 2.9, compact ? -1.6 : 0.3, -0.5);
  const cloudPos = new Float32Array(CLOUD_N * 3);
  const cloudCol = new Float32Array(CLOUD_N * 3);
  const near: number[] = [];
  for (let i = 0; i < CLOUD_N; i++) {
    // clustered gaussian-ish shell: looks like an embedding space, not a starfield
    const c = i % 6;
    const cAng = (c / 6) * Math.PI * 2;
    const cc = new THREE.Vector3(Math.cos(cAng) * 1.2, Math.sin(cAng * 1.3) * 0.8, Math.sin(cAng) * 1.0);
    const r = Math.pow(Math.random(), 0.7) * 0.9;
    const u = Math.random() * Math.PI * 2, v = Math.acos(2 * Math.random() - 1);
    cloudPos[i * 3] = cc.x + r * Math.sin(v) * Math.cos(u);
    cloudPos[i * 3 + 1] = cc.y + r * Math.sin(v) * Math.sin(u);
    cloudPos[i * 3 + 2] = cc.z + r * Math.cos(v);
  }
  // pick the "nearest neighbours" in the first cluster
  const anchor = new THREE.Vector3(1.2, 0, 0);
  const dists = Array.from({ length: CLOUD_N }, (_, i) => [i, anchor.distanceToSquared(new THREE.Vector3(cloudPos[i * 3], cloudPos[i * 3 + 1], cloudPos[i * 3 + 2]))] as const);
  dists.sort((a, b) => a[1] - b[1]).slice(0, 6).forEach(([i]) => near.push(i));
  const cloudGeo = track(new THREE.BufferGeometry());
  cloudGeo.setAttribute("position", new THREE.BufferAttribute(cloudPos, 3));
  cloudGeo.setAttribute("color", new THREE.BufferAttribute(cloudCol, 3));
  const dotTex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.45, "rgba(255,255,255,0.9)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return track(new THREE.CanvasTexture(c));
  })();
  const cloudMat = track(new THREE.PointsMaterial({ size: 0.095, map: dotTex, vertexColors: true, transparent: true, depthWrite: false, opacity: 0 }));
  const cloud = new THREE.Points(cloudGeo, cloudMat);
  cloud.position.copy(cloudCenter);
  scene.add(cloud);
  const linkGeo = track(new THREE.BufferGeometry());
  const linkPos = new Float32Array(near.length * 6);
  linkGeo.setAttribute("position", new THREE.BufferAttribute(linkPos, 3));
  const linkMat = track(new THREE.LineBasicMaterial({ color: 0xf0617f, transparent: true, opacity: 0, depthWrite: false }));
  const links = new THREE.LineSegments(linkGeo, linkMat);
  scene.add(links);
  const ALU = new THREE.Color(0xc8c4bb), SIG = new THREE.Color(0xf0617f);

  // ---------------------------------------------------------------- loading
  const manager = new THREE.LoadingManager();
  manager.onProgress = (_u, loaded, total) => onLoad(loaded / total);
  const loader = new GLTFLoader(manager);
  loader.setMeshoptDecoder(MeshoptDecoder);
  const trackScene = (o: THREE.Object3D) => o.traverse((m) => {
    const mesh = m as THREE.Mesh;
    if (mesh.isMesh) {
      track(mesh.geometry);
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((mt) => {
        track(mt);
        Object.values(mt).forEach((v) => { if ((v as THREE.Texture)?.isTexture) track(v as THREE.Texture); });
      });
    }
  });

  let disposed = false;
  const load = (file: string, name: string) =>
    loader.loadAsync(`/models/${file}`).then((g) => {
      if (disposed) return null;
      trackScene(g.scene);
      const o = addObj(name, g.scene, false);
      return { o, model: g.scene };
    });

  load("camera.glb", "camera").then((r) => {
    if (!r?.o) return;
    hero = r.o;
    heroModel = r.model;
    introAt = realT;
    buildTag();
    buildInstances(r.model);
  }).catch(() => {});
  (["watch.glb:watch", "sunglasses.glb:sunglasses", "bottle.glb:bottle", "shoe.glb:shoe", "suitcase.glb:suitcase"] as const).forEach((s) => {
    const [f, n] = s.split(":");
    if (compact && COMPACT_SKIP.has(n)) return;
    load(f, n).catch(() => {});
  });

  function buildTag() {
    if (!hero) return;
    const tagMat = track(new THREE.MeshPhysicalMaterial({ color: 0xc8264d, roughness: 0.6, sheen: 0.5, sheenColor: new THREE.Color(0xffb3c4) }));
    const eyeMat = track(new THREE.MeshPhysicalMaterial({ color: 0xc3a160, metalness: 1, roughness: 0.25 }));
    const shape = new THREE.Shape();
    shape.moveTo(-0.11, 0.05); shape.lineTo(-0.04, 0.12); shape.lineTo(0.04, 0.12); shape.lineTo(0.11, 0.05);
    shape.lineTo(0.11, -0.2); shape.lineTo(-0.11, -0.2); shape.lineTo(-0.11, 0.05);
    const tag = new THREE.Mesh(track(new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.004, bevelSegments: 2 })), tagMat);
    const eye = new THREE.Mesh(track(new THREE.TorusGeometry(0.022, 0.007, 8, 20)), eyeMat);
    eye.position.y = 0.08;
    const string = new THREE.Mesh(track(new THREE.CylinderGeometry(0.004, 0.004, 0.16, 6)), eyeMat);
    string.position.y = 0.17;
    // swing pivot at the top of the string; with zero rotation this renders exactly as before
    tagSwing.position.set(0, 0.25, 0);
    [tag, eye, string].forEach((m) => { m.position.y -= 0.25; tagSwing.add(m); });
    tagGroup.add(tagSwing);
    tagGroup.position.set(0.4, 0.06, 0.14);
    tagGroup.scale.setScalar(0.55);
    tagGroup.rotation.set(0.1, -0.3, 0.18);
    tagGroup.traverse((o) => (o.castShadow = true));
    hero.pivot.add(tagGroup);
  }

  function buildInstances(model: THREE.Object3D) {
    const cols = 3, gapX = compact ? 1.25 : 2.55, gapY = compact ? 1.5 : 2.05;
    const offX = compact ? 0 : 2.3;
    for (let i = 0; i < 9; i++) {
      if (i === TARGET_SLOT) continue;
      const r = Math.floor(i / cols), c = i % cols;
      const slot = new THREE.Vector3((c - 1) * gapX + offX, (1 - r) * gapY - (compact ? 0.4 : 0.1), 0);
      const clone = model.clone(true);
      const mats: THREE.MeshStandardMaterial[] = [];
      const tint = new THREE.Color().setHSL(0.08 + Math.random() * 0.04, 0.05 + Math.random() * 0.12, 0.82 + Math.random() * 0.18);
      clone.traverse((m) => {
        const mesh = m as THREE.Mesh;
        if (mesh.isMesh) {
          const mt = track((mesh.material as THREE.MeshStandardMaterial).clone());
          mt.transparent = true;
          mt.color.multiply(tint);
          (mt as any).userData.base = mt.color.clone();
          mesh.material = mt;
          mats.push(mt);
        }
      });
      const norm = (hero!.pivot.children[0] as THREE.Group).clone(false);
      norm.add(clone);
      const pivot = new THREE.Group();
      pivot.add(norm);
      pivot.visible = false;
      scene.add(pivot);
      instances.push({ pivot, slot, mats, tint, delay: Math.random() * 0.4 });
    }
  }

  // ---------------------------------------------------------------- sizing + input
  let w = 1, h = 1;
  const resize = () => {
    const r = container.getBoundingClientRect();
    w = Math.max(1, r.width); h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(() => { resize(); if (!running) renderOnce(); });
  ro.observe(container);
  resize();

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointer = (e: PointerEvent) => {
    if (e.pointerType === "touch" || reducedMotion) return;
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
    const r = container.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  };
  const pickAt = () => {
    if (p > 0.05 || ndc.x < -2) return "";
    raycaster.setFromCamera(ndc, camera);
    const targets = objs.filter((o) => o.pivot.visible).map((o) => o.pivot);
    const hit = raycaster.intersectObjects(targets, true)[0];
    if (!hit) return "";
    let n: THREE.Object3D | null = hit.object;
    while (n && !targets.includes(n as THREE.Group)) n = n.parent;
    return objs.find((o) => o.pivot === n)?.name ?? "";
  };
  const onClick = () => {
    const n = pickAt();
    if (n) disc = { name: n, t0: realT, manual: true };
  };
  const onLeave = () => ndc.set(-10, -10);
  container.addEventListener("click", onClick);
  container.addEventListener("pointerleave", onLeave);
  window.addEventListener("pointermove", onPointer, { passive: true });

  // ---------------------------------------------------------------- state
  let p = 0;          // smoothed by GSAP scrub upstream
  let time = 0;
  const v3 = new THREE.Vector3(), v3b = new THREE.Vector3();
  const box = new THREE.Box3();
  const info: FrameInfo = {
    focus: { x: 0, y: 0, w: 0, h: 0, visible: false },
    markers: [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }],
    scan: { x: 0, y: 0, w: 0, h: 0, index: 0, locked: false, visible: false },
    cloud: { x: 0, y: 0 },
    hero1: { x: 0, y: 0, visible: false, label: "", n: 0, name: "", hover: false },
    arc: { k: 0, u: 0, fx: 0, fy: 0, focus: "", hx: 0, hy: 0, hover: "" },
  };
  const bg = new THREE.Color();

  const project = (obj: THREE.Object3D, out: { x: number; y: number; w: number; h: number }, pad = 12) => {
    box.setFromObject(obj);
    if (box.isEmpty()) return false;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < 8; i++) {
      v3.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(camera);
      const sx = (v3.x * 0.5 + 0.5) * w, sy = (-v3.y * 0.5 + 0.5) * h;
      minX = Math.min(minX, sx); maxX = Math.max(maxX, sx); minY = Math.min(minY, sy); maxY = Math.max(maxY, sy);
    }
    out.x = minX - pad; out.y = minY - pad; out.w = maxX - minX + pad * 2; out.h = maxY - minY + pad * 2;
    return true;
  };
  const toScreen = (v: THREE.Vector3, out: { x: number; y: number }) => {
    v3b.copy(v).project(camera);
    out.x = (v3b.x * 0.5 + 0.5) * w; out.y = (-v3b.y * 0.5 + 0.5) * h;
  };

  // chapter V helper: rest an object on the felt of its compartment, lifted when in focus
  const restBox = new THREE.Box3();
  const placeInArchive = (pivot: THREE.Object3D, name: string, k: number) => {
    const r = REST[name];
    if (!r || !archive.slotWorld(name, slotV)) return;
    const hl = arcHL.get(name) ?? 0;
    const sz = r[3] * (compact ? 0.9 : 1) * (1 + hl * 0.08);
    const target = slotV.clone();
    // orientation + scale first, so the resting height can be measured
    const fromPos = pivot.position.clone(), fromRot = pivot.quaternion.clone(), fromScale = pivot.scale.x;
    pivot.position.set(0, 0, 0);
    pivot.rotation.set(r[0] - hl * 0.25, r[1] + Math.sin(time * 0.3) * 0.02 * hl, r[2]);
    pivot.scale.setScalar(sz);
    pivot.updateMatrixWorld(true);
    restBox.setFromObject(pivot);
    target.y += -restBox.min.y + 0.005 + hl * 0.5;
    if (k < 1) {
      const toQ = pivot.quaternion.clone();
      pivot.position.copy(fromPos.lerp(target, easeInOut(k)));
      pivot.quaternion.copy(fromRot.slerp(toQ, easeInOut(k)));
      pivot.scale.setScalar(lerp(fromScale, sz, easeInOut(k)));
    } else pivot.position.copy(target);
    pivot.visible = true;
  };

  // ---------------------------------------------------------------- the story, as a function of p
  const update = (dt: number) => {
    time += reducedMotion ? 0 : dt;
    realT += dt;
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;

    const fly = ss(0.04, 0.24, p);          // I → II camera flight
    const dark = ss(0.17, 0.27, p) * (1 - ss(0.86, 0.95, p));
    const ch3 = ss(0.4, 0.46, p) * (1 - ss(0.6, 0.65, p));
    const ch4 = ss(0.62, 0.68, p);
    const isolate = ss(0.77, 0.84, p);      // others recede
    const handoff = ss(0.86, 0.97, p);
    const heroK = 1 - easeInOut(fly);     // chapter-I strength: exactly 0 from p = 0.24 onward
    // chapter V — archive phases (all exactly 0 for p <= 0.86)
    const u5 = clamp01((p - 0.86) / 0.14);
    const a5 = ss(0.865, 0.89, p);        // environment takes over from chapter IV
    const open5 = ss(0.868, 0.9, p);      // the drawer slides open
    const toSlot = ss(0.874, 0.904, p);   // your camera settles into compartment A-02
    // safety: if the camera model never loads, still bring the other objects in
    if (introAt < 0 && realT > 4) introAt = realT;
    const sinceIntro = introAt < 0 ? -1 : reducedMotion ? 99 : realT - introAt;

    // background / fog / light mood
    bg.copy(PAPER).lerp(INK, dark);
    (scene.fog as THREE.Fog).color.copy(bg);
    (scene.fog as THREE.Fog).near = lerp(20, 12, dark);
    (scene.fog as THREE.Fog).far = lerp(40, 30, dark);
    scene.environmentIntensity = lerp(1, 0.55, dark);
    key.intensity = lerp(1.9, 1.25, dark);
    rimA.intensity = lerp(0.5, 2.6, dark);
    rimB.intensity = lerp(0.3, 1.2, dark);
    (wall.material as THREE.ShadowMaterial).opacity = 0.06 * (1 - dark) * (1 - ss(0.62, 1, p));
    // chapter V: a warm, dark archive
    if (a5 > 0) {
      (scene.fog as THREE.Fog).color.lerp(TOBACCO, a5);
      (scene.fog as THREE.Fog).near = lerp((scene.fog as THREE.Fog).near, 14, a5);
      (scene.fog as THREE.Fog).far = lerp((scene.fog as THREE.Fog).far, 34, a5);
      scene.environmentIntensity = lerp(scene.environmentIntensity, 0.3, a5);
      key.intensity = lerp(key.intensity, 0.35, a5);
      rimA.intensity = lerp(rimA.intensity, 0.7, a5);
      rimB.intensity = lerp(rimB.intensity, 0.35, a5);
    }
    // chapter I: a little more atmosphere so the back of the orbit recedes
    (scene.fog as THREE.Fog).near = lerp((scene.fog as THREE.Fog).near, 13.5, heroK);
    (scene.fog as THREE.Fog).far = lerp((scene.fog as THREE.Fog).far, 31, heroK);

    // camera path
    const portrait = camera.aspect < 0.9;
    const camZ0 = portrait ? 22 : 16;
    let cz = lerp(camZ0, portrait ? 11 : 8.4, easeInOut(fly));
    cz = lerp(cz, portrait ? 19 : 13.5, ch4);
    cz = lerp(cz, portrait ? 15 : 11, handoff);
    const cx = lerp(0, 0, fly) + pointer.x * lerp(0.6, 0.35, fly) + pointer.x * 0.5 * heroK;
    const cy = pointer.y * -0.35 + lerp(0, 0.2, fly) * (1 - ch4) + (portrait ? 0.9 : 1.6) * heroK + pointer.y * -0.25 * heroK;
    camera.position.set(cx, cy, cz);
    lookAt.set(0, 0, 0);
    if (a5 > 0) {
      // the archive camera: approach → three-quarter over the drawer → travel across → wide → close on your camera
      const K = camKeys(portrait);
      const seg = (k0: number, k1: number, t: number) => {
        const a = K[k0], b = K[k1];
        archCam.set(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t));
        archLook.set(lerp(a[3], b[3], t), lerp(a[4], b[4], t), lerp(a[5], b[5], t));
      };
      if (u5 < 0.3) seg(0, 1, ss(0.02, 0.3, u5));
      else if (u5 < 0.62) seg(1, 2, ss(0.3, 0.62, u5));
      else seg(2, 3, ss(0.62, 0.8, u5));
      // close-up on compartment A-02 (your camera) for the hand-off
      const close = ss(0.8, 0.97, u5);
      if (close > 0 && archive.slotWorld("camera", slotV)) {
        archCam.lerp(slotV.clone().add(new THREE.Vector3(portrait ? 0.6 : 1.5, portrait ? 3.4 : 2.5, portrait ? 3.0 : 2.7)), close);
        archLook.lerp(slotV.clone().add(new THREE.Vector3(0, 0.35, 0)), close);
      }
      archCam.x += pointer.x * 0.45; archCam.y -= pointer.y * 0.3;
      camera.position.lerp(archCam, a5);
      lookAt.lerp(archLook, a5);
    }
    camera.lookAt(lookAt);

    // chapter I: discovery cycle + hover
    if (heroK > 0.001) {
      hoverName = pickAt();
      container.style.cursor = hoverName ? "pointer" : "";
      const present = ORDER.filter((n) => objs.some((o) => o.name === n && o.appear > 0.9));
      if (!reducedMotion && sinceIntro > 2.4 && !hoverName && realT - disc.t0 > DISC_LEN + DISC_GAP && present.length) {
        const i = present.indexOf(disc.name);
        disc = { name: present[(i + 1) % present.length], t0: realT, manual: false };
      }
      raycaster.setFromCamera(ndc, camera);
      if (ndc.x < -2 || !raycaster.ray.intersectPlane(zPlane, pointerWorld)) pointerWorld.set(999, 999, 0);
    } else {
      hoverName = "";
      if (container.style.cursor) container.style.cursor = "";
    }
    const dPhase = (realT - disc.t0) / DISC_LEN;
    const discK = (sinceIntro > 2.4 || disc.manual) ? ss(0, 0.18, dPhase) * (1 - ss(0.78, 1, dPhase)) : 0;
    const focusName = hoverName || (discK > 0.01 ? disc.name : "");

    // universe objects
    for (const o of objs) {
      if (o === hero) continue;
      // entrance: secondaries arrive after the camera, staggered by catalogue order
      const delay = 0.9 + Math.max(0, ORDER.indexOf(o.name) - 1) * 0.14;
      if (sinceIntro >= delay && o.appear < 1) o.appear = Math.min(1, o.appear + dt * (reducedMotion ? 99 : 1.25));
      if (heroK < 0.001 && o.appear < 1) o.appear = 1;
      const pop = easeInOut(o.appear);
      const float = Math.sin(time * 0.6 + o.phase) * 0.14;
      // chapter I: the base position is a point on its orbit (two counter-rotating rings)
      const orb = ORBIT[o.name];
      const st = hs(o.name);
      const isFocus = focusName === o.name;
      st.hl += ((isFocus ? (hoverName === o.name ? 1 : discK) : 0) - st.hl) * Math.min(1, dt * 6);
      if (orb && heroK > 0.001) {
        const [ring, a0, osz] = orb;
        orbitPoint(ring, a0 + time * RING[ring].w, tmpOrbit);
        // pointer: nearby objects ease away from the cursor
        const dx = tmpOrbit.x - pointerWorld.x, dy = tmpOrbit.y - pointerWorld.y, dist = Math.hypot(dx, dy);
        const f = dist < 2.6 && !isFocus ? (1 - dist / 2.6) * 0.45 : 0;
        st.push.x += ((dist > 0 ? (dx / dist) * f : 0) - st.push.x) * Math.min(1, dt * 4);
        st.push.y += ((dist > 0 ? (dy / dist) * f : 0) - st.push.y) * Math.min(1, dt * 4);
        // focus: step toward the camera; entrance: rise into place
        tmpOrbit.x += st.push.x + (tmpOrbit.x - H_CENTER.x) * 0.08 * st.hl;
        tmpOrbit.y += st.push.y - (1 - pop) * 1.4 + 0.2 * st.hl;
        tmpOrbit.z += 0.9 * st.hl;
        o.base.copy(tmpOrbit);
        o.size = osz * (hc ? 0.68 : 1) * (1 + st.hl * 0.1);
      }
      // fly past the camera, spreading outward
      const t = easeInOut(fly);
      o.pivot.position.set(
        o.base.x * (1 + t * 1.1),
        (o.base.y + float) * (1 + t * 0.9),
        o.base.z + t * (cz + 6 - o.base.z) * 0.9
      );
      o.pivot.rotation.set(
        o.rot.x + Math.cos(time * 0.35 + o.phase) * 0.08 + t * 0.6,
        o.rot.y + Math.sin(time * 0.28 + o.phase) * 0.35 + time * 0.04 + t * 1.2 + (st.hl * 0.6 + (1 - pop) * 1.2) * heroK,
        o.rot.z
      );
      let s = o.size * pop * (1 - ss(0.75, 1, t));
      // chapter I keep-out: objects passing behind the headline / buttons slip out of view
      if (heroK > 0.001) {
        v3.copy(o.pivot.position).project(camera);
        const clear = hc ? 1 - ss(-0.32, -0.08, v3.y) : ss(-0.06, 0.2, v3.x);
        s *= lerp(1, clear, heroK);
      }
      o.pivot.scale.setScalar(Math.max(0.0001, s));
      o.pivot.visible = s > (heroK > 0.001 ? 0.06 : 0.002);
      // chapter V: belongings rest in their compartments of the open drawer
      if (a5 > 0.001 && REST[o.name] && archive.slotWorld(o.name, slotV)) placeInArchive(o.pivot, o.name, 1);
    }

    // the protagonist
    if (hero) {
      if (hero.appear < 1) hero.appear = Math.min(1, hero.appear + dt * (reducedMotion ? 99 : 0.85));
      if (heroK < 0.001) hero.appear = 1;
      const pop = easeInOut(hero.appear);
      const hst = hs("camera");
      hst.hl += ((focusName === "camera" ? (hoverName === "camera" ? 1 : discK) : 0) - hst.hl) * Math.min(1, dt * 6);
      const t = easeInOut(fly);
      const float = Math.sin(time * 0.6 + hero.phase) * 0.12 * (1 - t);
      // universe → centre stage
      let x = lerp(hero.base.x, 0, t), y = lerp(hero.base.y + float, 0, t), z = lerp(hero.base.z, 0, t);
      let s = lerp(hero.size, portrait ? 2.5 : 3.4, t);
      // chapter III: step aside for the embedding space
      y = lerp(y, portrait ? 0.9 : 0.55, ss(0.22, 0.3, p) * (1 - ch3));
      x = lerp(x, portrait ? 0 : -1.35, ch3); y = lerp(y, portrait ? 1.7 : 0.2, ch3); s = lerp(s, portrait ? 2.2 : 2.35, ch3);
      // chapter IV: take a slot in the grid (centre), then step forward when isolated
      x = lerp(x, portrait ? 0 : 2.3, ch4); y = lerp(y, portrait ? -0.4 : -0.1, ch4); s = lerp(s, portrait ? 1.15 : 1.8, ch4);
      z = lerp(z, 1.4, isolate); s = lerp(s, portrait ? 1.9 : 2.7, isolate);
      // chapter V: settle low and small, handing over to the upload frame
      y = lerp(y, portrait ? -1.2 : -0.6, handoff); x = lerp(x, portrait ? 0 : 2.8, handoff); s = lerp(s, portrait ? 1.6 : 2.4, handoff);
      // chapter I: entrance rise + step forward when in focus (vanishes as heroK → 0)
      y += (-(1 - pop) * 1.2 + hst.hl * 0.25) * heroK;
      z += hst.hl * 1.1 * heroK;
      hero.pivot.position.set(x, y, z);
      const turn = lerp(0, 1, ss(0.24, 0.4, p)) * 0.9 + ss(0.4, 0.62, p) * 0.6 - ch4 * 1.5 + isolate * 0.55;
      hero.pivot.rotation.set(
        lerp(hero.rot.x, 0.08, t) + pointer.y * 0.12,
        lerp(hero.rot.y, -0.35, t) + turn + Math.sin(time * 0.25) * 0.08 + pointer.x * 0.25
          + heroK * (Math.sin(time * 0.22) * 0.55 - (1 - pop) * 1.6 + hst.hl * 0.35),
        lerp(hero.rot.z, 0, t)
      );
      hero.pivot.scale.setScalar(Math.max(0.0001, s * pop * (1 + hst.hl * 0.06 * heroK)));
      // chapter V: your camera travels into compartment A-02
      if (toSlot > 0 && archive.slotWorld("camera", slotV)) placeInArchive(hero.pivot, "camera", toSlot);
    }

    // embedding cloud + matching links (chapter III)
    const cloudIn = ss(0.48, 0.52, p) * (1 - ss(0.6, 0.66, p));
    const linkIn = ss(0.53, 0.57, p) * (1 - ss(0.6, 0.66, p));
    const narrow = ss(0.575, 0.6, p);
    cloudMat.opacity = cloudIn * 0.95;
    cloud.visible = cloudIn > 0.001;
    if (cloud.visible) {
      cloud.rotation.y = time * 0.05 + p * 2;
      for (let i = 0; i < CLOUD_N; i++) {
        const isNear = near.includes(i);
        const c = isNear ? ALU.clone().lerp(SIG, linkIn) : ALU;
        const fade = isNear ? 1 : 1 - narrow * 0.85;
        cloudCol[i * 3] = c.r * fade; cloudCol[i * 3 + 1] = c.g * fade; cloudCol[i * 3 + 2] = c.b * fade;
      }
      cloudGeo.attributes.color.needsUpdate = true;
    }
    linkMat.opacity = linkIn * 0.9;
    links.visible = linkIn > 0.001 && !!hero;
    if (links.visible && hero) {
      cloud.updateMatrixWorld();
      near.forEach((idx, k) => {
        v3.set(cloudPos[idx * 3], cloudPos[idx * 3 + 1], cloudPos[idx * 3 + 2]).applyMatrix4(cloud.matrixWorld);
        linkPos.set([hero!.pivot.position.x + 0.9, hero!.pivot.position.y, hero!.pivot.position.z, v3.x, v3.y, v3.z], k * 6);
      });
      linkGeo.attributes.position.needsUpdate = true;
    }

    // instances (chapter IV)
    const scanT = ss(0.7, 0.77, p);
    for (const inst of instances) {
      const arrive = ss(0.62 + inst.delay * 0.08, 0.7 + inst.delay * 0.04, p) * (1 - handoff) * (1 - ss(0.86, 0.885, p)); // chapter V clears the look-alikes quickly
      inst.pivot.visible = arrive > 0.001;
      if (!inst.pivot.visible) continue;
      const sz = portrait ? 1.15 : 1.8;
      const back = isolate;
      inst.pivot.position.set(
        (inst.slot.x - (portrait ? 0 : 2.3)) * (1 + back * 0.25) + (portrait ? 0 : 2.3),
        inst.slot.y * (1 + back * 0.25) + Math.sin(time * 0.5 + inst.delay * 9) * 0.05,
        lerp(-30, 0, easeInOut(arrive)) - back * 5
      );
      inst.pivot.rotation.set(0.08, (hero ? hero.pivot.rotation.y : 0) + (inst.delay - 0.2) * 0.5 + Math.sin(time * 0.3 + inst.delay * 5) * 0.06, 0);
      inst.pivot.scale.setScalar(sz * (1 - back * 0.25));
      const grey = back;
      for (const mt of inst.mats) {
        const base = (mt as any).userData.base as THREE.Color;
        mt.color.copy(base).lerp(new THREE.Color(0x3a3733), grey * 0.75);
        mt.opacity = lerp(1, 0.18, grey);
      }
    }
    tagGroup.visible = true;
    tagGroup.scale.setScalar(0.55 * (1 + isolate * 0.2));
    tagSwing.rotation.set(0, 0, 0);

    // chapter V: the archive environment
    archive.group.visible = a5 > 0.001;
    info.arc.k = a5; info.arc.u = u5; info.arc.focus = ""; info.arc.hover = "";
    if (archive.group.visible) {
      // focus travels across the drawer (scene B), then rests on your camera (scene D)
      const present = FOCUS_ORDER.filter((n) => objs.some((o) => o.name === n) && archive.slotWorld(n, slotV));
      let focus = "";
      if (u5 > 0.3 && u5 < 0.62 && present.length) focus = present[Math.min(present.length - 1, Math.floor(((u5 - 0.3) / 0.32) * present.length))];
      if (u5 > 0.8) focus = "camera";
      // hover: lift a belonging under the pointer
      arcHover = "";
      if (a5 > 0.5 && open5 > 0.9 && ndc.x > -2 && u5 < 0.8) {
        raycaster.setFromCamera(ndc, camera);
        const cands = objs.filter((o) => REST[o.name] && o.pivot.visible).map((o) => o.pivot);
        cands.push(archive.notebook);
        const hit = raycaster.intersectObjects(cands, true)[0];
        let nn: THREE.Object3D | null = hit ? hit.object : null;
        while (nn && !cands.includes(nn as THREE.Group)) nn = nn.parent;
        arcHover = nn === archive.notebook ? "notebook" : nn ? objs.find((o) => o.pivot === nn)?.name ?? "" : "";
      }
      container.style.cursor = arcHover ? "pointer" : "";
      Object.keys(REST).forEach((n) => {
        const tgt = n === arcHover ? 1 : n === focus ? 1 : 0;
        arcHL.set(n, (arcHL.get(n) ?? 0) + (tgt - (arcHL.get(n) ?? 0)) * Math.min(1, dt * 5));
      });
      // notebook is archive-only
      archive.notebook.visible = !!archive.slotWorld("notebook", slotV);
      if (archive.notebook.visible) placeInArchive(archive.notebook, "notebook", 1);
      const fName = arcHover || focus;
      const fWorld = fName && archive.slotWorld(fName, slotV) ? slotV.clone() : null;
      archive.update(open5, ss(0.866, 0.9, p), fWorld, time);
      info.arc.focus = focus; info.arc.hover = arcHover;
      const proj = (n: string, out: { x: number; y: number }) => {
        if (!archive.slotWorld(n, slotV)) return;
        slotV.y += 0.9; v3.copy(slotV).project(camera);
        out.x = (v3.x * 0.5 + 0.5) * w; out.y = (-v3.y * 0.5 + 0.5) * h;
      };
      if (focus) { const o2 = { x: 0, y: 0 }; proj(focus, o2); info.arc.fx = o2.x; info.arc.fy = o2.y; }
      if (arcHover) { const o3 = { x: 0, y: 0 }; proj(arcHover, o3); info.arc.hx = o3.x; info.arc.hy = o3.y; }
    } else if (container.style.cursor && heroK < 0.001) container.style.cursor = "";

    // chapter I installation: plinth, dial, orbits, discovery ring    // chapter I installation: plinth, dial, orbits, discovery ring
    install.visible = heroK > 0.001;
    info.hero1.visible = false;
    if (install.visible) {
      const intro = (k0: number, k1: number) => (reducedMotion ? 1 : ss(k0, k1, sinceIntro < 0 ? 0 : sinceIntro));
      const plinthIn = intro(0.1, 1.3) * heroK;
      plinthG.scale.setScalar(Math.max(0.0001, plinthIn));
      plinthG.position.y = H_CENTER.y + (hc ? -1.15 : -1.62) - (1 - plinthIn) * 0.6;
      dial.scale.setScalar(Math.max(0.0001, lerp(0.85, 1, intro(0.4, 1.8)) * heroK));
      dial.rotation.z = -time * 0.05;
      tickMat.opacity = 0.75 * intro(0.4, 1.8) * heroK;
      dialInnerMat.opacity = 0.35 * intro(0.6, 2.0) * heroK;
      orbitMats[0].opacity = 0.22 * intro(0.8, 2.2) * heroK;
      orbitMats[1].opacity = 0.3 * intro(1.0, 2.4) * heroK;
      // discovery ring around the object in focus
      const fo = focusName ? objs.find((o) => o.name === focusName) : undefined;
      const ringK = fo ? (hoverName ? hs(focusName).hl : discK) * heroK : 0;
      scanRing.visible = scanRing2.visible = ringK > 0.01 && !!fo;
      if (fo && scanRing.visible) {
        box.setFromObject(fo.pivot);
        box.getCenter(tmpOrbit);
        const rad = box.getSize(tmpSize).length() * 0.42;
        const bloom = hoverName ? 1 : ss(0, 0.3, dPhase);
        scanRing.position.copy(tmpOrbit); scanRing2.position.copy(tmpOrbit);
        scanRing.quaternion.copy(camera.quaternion); scanRing2.quaternion.copy(camera.quaternion);
        scanRing.scale.setScalar(rad * lerp(1.7, 1, bloom));
        scanRing2.scale.setScalar(rad * lerp(2.3, 1.18, hoverName ? 1 : ss(0, 0.45, dPhase)));
        scanRingMat.opacity = 0.9 * ringK;
        scanRing2Mat.opacity = 0.5 * ringK;
        // identification indicator anchored to the ring's upper-right
        tmpOrbit.y += rad * 0.95;
        toScreen(tmpOrbit, info.hero1);
        info.hero1.visible = ringK > 0.05;
        info.hero1.label = LABELS[fo.name] ?? fo.name;
        info.hero1.name = fo.name;
        info.hero1.n = ORDER.indexOf(fo.name) + 1;
        info.hero1.hover = !!hoverName;
      }
    }

    // ------------------------------------------------ overlay geometry
    info.focus.visible = !!hero && p > 0.2 && p < 0.62;
    if (hero) project(hero.pivot, info.focus, 18);
    if (hero && info.focus.visible) {
      // illustrative regions of interest, relative to the projected box
      const f = info.focus;
      info.markers[0].x = f.x + f.w * 0.62; info.markers[0].y = f.y + f.h * 0.52; // lens
      info.markers[1].x = f.x + f.w * 0.3; info.markers[1].y = f.y + f.h * 0.3;   // body
      info.markers[2].x = f.x + f.w * 0.82; info.markers[2].y = f.y + f.h * 0.34; // tag
    }
    toScreen(cloudCenter, info.cloud);
    // scanning bracket hops across instances in order, then locks on the target
    info.scan.visible = p > 0.69 && p < 0.86 && !!hero;
    if (info.scan.visible && hero) {
      const order = GRID_ORDER;
      const k = Math.min(order.length - 1, Math.floor(scanT * order.length));
      const slotIdx = order[k];
      info.scan.locked = scanT >= 0.999;
      let target: THREE.Object3D = hero.pivot;
      if (!info.scan.locked && slotIdx !== TARGET_SLOT) {
        const inst = instances[slotIdx > TARGET_SLOT ? slotIdx - 1 : slotIdx];
        if (inst) target = inst.pivot;
      }
      info.scan.index = info.scan.locked ? TARGET_SLOT : slotIdx;
      project(target, info.scan, 10);
    }
    onFrame(info);
  };

  // ---------------------------------------------------------------- loop
  let raf = 0, running = false, last = performance.now();
  const renderOnce = () => { update(0); renderer.render(scene, camera); };
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };
  const setActive = (on: boolean) => {
    if (on && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
    else if (!on && running) { running = false; cancelAnimationFrame(raf); }
  };

  return {
    setProgress: (np) => { p = np; if (!running) renderOnce(); },
    discover: (name) => { if (objs.some((o) => o.name === name)) { disc = { name, t0: realT, manual: true }; if (!running) renderOnce(); } },
    setActive,
    dispose: () => {
      disposed = true;
      setActive(false);
      ro.disconnect();
      window.removeEventListener("pointermove", onPointer);
      container.removeEventListener("click", onClick);
      container.removeEventListener("pointerleave", onLeave);
      container.style.cursor = "";
      disposables.forEach((d) => { try { d.dispose(); } catch { /* already gone */ } });
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}

export function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch { return false; }
}
