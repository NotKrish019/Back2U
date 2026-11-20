/**
 * Section 04 — "The Journey Back". An architectural-model campus (library, lecture hall, cafeteria,
 * courtyard) on a stone plinth, with belongings left behind in ordinary places and a pink thread that
 * connects them. State is a pure function of scroll progress q ∈ [0,1]. Storytelling only — nothing
 * here represents real location data.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { buildProcedural } from "@/components/story/procedural";

export type Pin = { x: number; y: number; on: number };
export type CampusFrame = { places: Pin[]; objs: Pin[]; hover: number; back: boolean };
export type CampusHandle = { setProgress: (q: number) => void; setActive: (on: boolean) => void; dispose: () => void };

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ss = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const PLACES = [
  { name: "Library", at: [-7, 2.9, -3.5] },
  { name: "Lecture hall", at: [6.5, 3.0, -4] },
  { name: "Cafeteria", at: [-7.2, 3.0, 4.6] },
  { name: "Courtyard", at: [0.8, 1.2, 2.2] },
] as const;
export const OBJECTS = ["Headphones", "Wallet", "Keys", "Backpack", "Water bottle"] as const;

export function createCampusScene(opts: { canvas: HTMLCanvasElement; container: HTMLElement; compact: boolean; reducedMotion: boolean; onFrame: (f: CampusFrame) => void }): CampusHandle {
  const { canvas, container, compact, reducedMotion, onFrame } = opts;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x);
  const scene = new THREE.Scene();
  const pmrem = track(new THREE.PMREMGenerator(renderer));
  scene.environment = track(pmrem.fromScene(new RoomEnvironment(), 0.04)).texture;
  scene.environmentIntensity = 0.45;
  scene.fog = new THREE.Fog(0xead9c4, 34, 70);
  const camera = new THREE.PerspectiveCamera(compact ? 42 : 30, 1, 0.1, 200);

  // ---- golden-hour light
  const sun = new THREE.DirectionalLight(0xffdcb0, 2.6);
  sun.position.set(-14, 18, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(compact ? 1024 : 2048, compact ? 1024 : 2048);
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 12, bottom: -12, near: 1, far: 60 });
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xfff1de, 0x6b5a48, 0.55));
  const focusLight = new THREE.SpotLight(0xffe2c8, 0, 9, 0.5, 0.7, 1.5);
  scene.add(focusLight, focusLight.target);

  // ---- materials (architectural model palette)
  const mat = (color: number, o: Partial<THREE.MeshPhysicalMaterialParameters> = {}) => track(new THREE.MeshPhysicalMaterial({ color, roughness: 0.85, ...o }));
  const M = {
    plinth: mat(0x2b2521, { roughness: 0.6 }), stone: mat(0xe9dfcd), stone2: mat(0xd6c8b0), path: mat(0xddd0b8, { roughness: 0.95 }),
    lawn: mat(0x7c925f, { roughness: 1 }), lawn2: mat(0x6c8452, { roughness: 1 }), wood: mat(0x9c6c45, { roughness: 0.6 }), woodDark: mat(0x6e4a30, { roughness: 0.6 }),
    glass: track(new THREE.MeshPhysicalMaterial({ color: 0xcfdfe2, roughness: 0.1, transparent: true, opacity: 0.28 })),
    water: mat(0x8fa6a4, { roughness: 0.08, clearcoat: 1, metalness: 0.1 }), roof: mat(0x8d8579, { roughness: 0.7 }),
    trunk: mat(0x5b4636), leafA: mat(0x5f7c4a, { roughness: 0.95, sheen: 0.4 }), leafB: mat(0x76904f, { roughness: 0.95, sheen: 0.4 }), leafC: mat(0xb47a43, { roughness: 0.95, sheen: 0.4 }),
    figure: mat(0xf4efe6, { roughness: 0.7 }), lamp: mat(0x3f5a43, { roughness: 0.4, metalness: 0.2 }), brass: mat(0xc39f5e, { metalness: 1, roughness: 0.35 }),
    canvas: mat(0x6e7a5c, { roughness: 0.9 }), bottle: mat(0x9fb6c4, { roughness: 0.2, metalness: 0.6 }),
  };
  const BOOKS = [0x7a3b2e, 0x2f4a5c, 0xb38a4a, 0x4d5e3c, 0x8a6a8c, 0xc7b79c, 0x5a2f2f].map((c) => mat(c, { roughness: 0.8 }));
  const G = new Map<string, THREE.BufferGeometry>();
  const boxGeo = (w: number, h: number, d: number) => { const k = `b${w}|${h}|${d}`; let g = G.get(k); if (!g) { g = track(new THREE.BoxGeometry(w, h, d)); G.set(k, g); } return g; };
  const root = new THREE.Group(); scene.add(root);
  const add = (parent: THREE.Object3D, g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, cast = true) => {
    const mesh = new THREE.Mesh(g, m); mesh.position.set(x, y, z); mesh.castShadow = cast; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };
  const box = (p: THREE.Object3D, w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, cast = true) => add(p, boxGeo(w, h, d), m, x, y + h / 2, z, cast);

  // ---- plinth + ground
  add(root, track(new RoundedBoxGeometry(27, 1.2, 19, 4, 0.25)), M.plinth, 0, -0.6, 0, false);
  box(root, 26.4, 0.06, 18.4, M.stone2, 0, 0, 0, false);
  // lawns
  box(root, 9, 0.08, 6.2, M.lawn, 0.8, 0.02, 2.2, false);
  box(root, 6.5, 0.08, 4.5, M.lawn2, 9.2, 0.02, 4.6, false);
  box(root, 4.2, 0.08, 4.0, M.lawn2, -11, 0.02, 4.2, false);
  box(root, 25, 0.08, 1.8, M.lawn2, 0, 0.02, -8.0, false);
  // paths
  box(root, 1.3, 0.1, 17, M.path, -2.6, 0.02, 0, false);
  box(root, 26, 0.1, 1.2, M.path, 0, 0.02, -0.4, false);
  box(root, 1.2, 0.1, 6, M.path, 4.2, 0.02, 3.4, false);
  box(root, 9, 0.1, 1.1, M.path, 0.8, 0.02, 5.85, false);

  // ---- trees (architectural-model style: clustered foliage)
  const sph = track(new THREE.IcosahedronGeometry(1, 3));
  const tree = (x: number, z: number, s: number, leaf: THREE.Material) => {
    const t = new THREE.Group(); t.position.set(x, 0, z); t.scale.setScalar(s);
    add(t, boxGeo(0.12, 1.2, 0.12), M.trunk, 0, 0.6, 0);
    [[0, 1.6, 0, 0.62], [0.32, 1.35, 0.15, 0.45], [-0.3, 1.4, -0.12, 0.48], [0.05, 2.0, -0.1, 0.42]].forEach(([a, b, c, r]) => { const m = add(t, sph, leaf, a, b, c); m.scale.setScalar(r); });
    root.add(t);
  };
  [[-3.6, 0.9, 1.0, M.leafA], [-3.8, 3.6, 0.9, M.leafB], [5.3, 1.2, 1.05, M.leafC], [5.1, 5.6, 0.9, M.leafA], [-1.5, 6.4, 0.85, M.leafB], [3.1, 6.6, 0.95, M.leafA],
   [11.5, 3.2, 1.0, M.leafB], [10.6, 6.6, 0.85, M.leafC], [7.6, 6.2, 0.9, M.leafA], [-12, 6.8, 0.95, M.leafA], [-10.4, 2.4, 0.8, M.leafC], [-12.2, -7.8, 0.9, M.leafB],
   [-1.8, -7.9, 1.0, M.leafA], [2.8, -8.0, 0.9, M.leafC], [11.6, -7.9, 0.95, M.leafB]].forEach(([x, z, s, l]) => tree(x as number, z as number, s as number, l as THREE.Material));

  // ---- library (cutaway colonnade)
  const lib = new THREE.Group(); lib.position.set(-7, 0, -3.5); root.add(lib);
  box(lib, 8, 0.12, 5, M.wood, 0, 0.04, 0);
  box(lib, 8, 2.5, 0.25, M.stone, 0, 0.1, -2.4);
  box(lib, 0.25, 2.5, 5, M.stone, -3.9, 0.1, 0);
  for (let i = 0; i < 4; i++) box(lib, 0.25, 2.5, 0.5, M.stone, 3.9, 0.1, -2.0 + i * 1.3);
  box(lib, 0.25, 0.5, 5, M.glass, 3.9, 1.6, 0, false);
  const col = track(new THREE.CylinderGeometry(0.13, 0.15, 2.4, 20));
  for (let i = 0; i < 7; i++) add(lib, col, M.stone, -3.4 + i * 1.13, 1.3, 2.3);
  box(lib, 8.2, 0.22, 0.4, M.stone, 0, 2.5, 2.3); box(lib, 8.2, 0.22, 0.3, M.stone, 0, 2.5, -2.4);
  box(lib, 0.3, 0.22, 5, M.stone, -3.9, 2.5, 0); box(lib, 0.3, 0.22, 5, M.stone, 3.9, 2.5, 0);
  box(lib, 8.2, 0.12, 0.6, M.stone2, 0, 0.1, 2.6); // steps
  // shelves with books
  for (let s = 0; s < 4; s++) {
    const sx = -3.0 + s * 2.0;
    box(lib, 1.7, 2.0, 0.4, M.woodDark, sx, 0.16, -2.05);
    for (let r = 0; r < 4; r++) for (let b = 0; b < 9; b++) {
      const h = 0.3 + ((b * 7 + r * 3 + s) % 5) * 0.03;
      box(lib, 0.15, h, 0.3, BOOKS[(b + r * 2 + s) % BOOKS.length], sx - 0.66 + b * 0.165, 0.28 + r * 0.46, -1.88, false);
    }
  }
  // reading tables, chairs, lamps
  const table = (p: THREE.Object3D, x: number, z: number, w: number) => {
    box(p, w, 0.07, 0.9, M.wood, x, 0.72, z);
    [-1, 1].forEach((sx) => box(p, 0.08, 0.72, 0.8, M.woodDark, x + sx * (w / 2 - 0.15), 0.0, z, false));
    for (let i = 0; i < Math.floor(w / 0.9); i++) [-1, 1].forEach((sz) => {
      const cx = x - w / 2 + 0.45 + i * 0.9, cz = z + sz * 0.7;
      box(p, 0.42, 0.06, 0.42, M.wood, cx, 0.42, cz); box(p, 0.42, 0.5, 0.05, M.wood, cx, 0.48, cz + sz * 0.2, false);
    });
    for (let i = 0; i < 3; i++) { const lx = x - w / 3 + i * (w / 3); add(p, boxGeo(0.04, 0.3, 0.04), M.brass, lx, 0.92, z, false); const sh = add(p, sph, M.lamp, lx, 1.08, z); sh.scale.set(0.16, 0.07, 0.1); }
  };
  table(lib, -0.4, -0.6, 5.4); table(lib, -0.4, 1.1, 5.4);

  // ---- lecture hall (tiered, cutaway)
  const hall = new THREE.Group(); hall.position.set(6.5, 0, -4); root.add(hall);
  box(hall, 7, 0.1, 5.5, M.stone2, 0, 0.04, 0);
  for (let t = 0; t < 6; t++) {
    const z = 1.6 - t * 0.7, y = 0.1 + t * 0.22;
    box(hall, 6, y, 0.7, M.stone, 0, 0.04, z, true);
    box(hall, 5.4, 0.05, 0.28, M.wood, 0, y + 0.42, z + 0.12); box(hall, 5.4, 0.42, 0.04, M.woodDark, 0, y, z + 0.26, false);
    for (let c = 0; c < 9; c++) box(hall, 0.36, 0.34, 0.06, M.wood, -2.4 + c * 0.6, y + 0.05, z - 0.18, false);
  }
  box(hall, 7, 3.0, 0.25, M.stone, 0, 0.04, -2.7);
  box(hall, 0.25, 3.0, 5.5, M.stone, -3.5, 0.04, 0); box(hall, 0.25, 3.0, 5.5, M.stone, 3.5, 0.04, 0);
  box(hall, 0.25, 0.8, 5.5, M.glass, 3.5, 2.2, 0, false);
  box(hall, 0.7, 0.9, 0.4, M.woodDark, -1.6, 0.04, 2.35); // lectern
  box(hall, 7.4, 0.25, 0.35, M.stone, 0, 3.0, -2.7);

  // ---- cafeteria (pergola pavilion + terrace)
  const caf = new THREE.Group(); caf.position.set(-7.4, 0, 4.4); root.add(caf);
  box(caf, 6.2, 0.12, 4.2, M.stone, 0, 0.04, 0);
  const post = track(new THREE.CylinderGeometry(0.07, 0.07, 2.4, 12));
  [[-2.9, -1.9], [0, -1.9], [2.9, -1.9], [-2.9, 1.9], [0, 1.9], [2.9, 1.9]].forEach(([x, z]) => add(caf, post, M.woodDark, x, 1.36, z));
  for (let i = 0; i < 16; i++) box(caf, 0.07, 0.12, 4.2, M.wood, -2.9 + i * 0.387, 2.5, 0); // pergola slats
  box(caf, 6.2, 0.14, 0.14, M.woodDark, 0, 2.42, -1.9); box(caf, 6.2, 0.14, 0.14, M.woodDark, 0, 2.42, 1.9);
  box(caf, 3.6, 0.95, 0.6, M.wood, -0.6, 0.16, -1.4); // counter
  const roundTop = track(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 28)), stem = track(new THREE.CylinderGeometry(0.04, 0.05, 0.7, 10));
  [[-1.8, 0.3], [0.8, 0.4], [-0.4, 1.4], [2.0, 1.3]].forEach(([x, z]) => {
    add(caf, roundTop, M.stone, x, 0.85, z); add(caf, stem, M.woodDark, x, 0.5, z, false);
    [[0.65, 0], [-0.65, 0], [0, 0.65], [0, -0.65]].forEach(([dx, dz]) => { box(caf, 0.36, 0.05, 0.36, M.wood, x + dx, 0.48, z + dz); box(caf, 0.05, 0.4, 0.36, M.wood, x + dx * 1.3, 0.52, z + dz * 1.3, false); });
  });

  // ---- courtyard: reflecting pool, benches
  box(root, 3.4, 0.16, 1.6, M.stone, 0.8, 0.06, 2.2);
  box(root, 3.1, 0.06, 1.3, M.water, 0.8, 0.18, 2.2, false);
  const bench = (x: number, z: number, ry: number) => { const b = new THREE.Group(); b.position.set(x, 0, z); b.rotation.y = ry; box(b, 1.4, 0.07, 0.38, M.wood, 0, 0.42, 0); box(b, 1.4, 0.32, 0.06, M.wood, 0, 0.5, -0.18); [-0.6, 0.6].forEach((dx) => box(b, 0.08, 0.42, 0.34, M.stone2, dx, 0.06, 0, false)); root.add(b); return b; };
  bench(-1.2, 3.9, 0); bench(2.8, 3.9, 0); bench(-1.2, 0.5, Math.PI); bench(2.8, 0.5, Math.PI);

  // ---- scale figures (abstract, white)
  const body = track(new THREE.CapsuleGeometry(0.12, 0.42, 4, 10));
  const figure = (x: number, z: number, ry = 0) => { const f = new THREE.Group(); f.position.set(x, 0.1, z); f.rotation.y = ry; add(f, body, M.figure, 0, 0.36, 0); const hd = add(f, sph, M.figure, 0, 0.78, 0); hd.scale.setScalar(0.11); root.add(f); return f; };
  [[-2.3, -2.6], [-2.9, 2.2, 1], [4.5, 0.4, 2], [9.3, 3.8], [-9.6, 5.6, 0.5]].forEach(([x, z, r]) => figure(x, z, r ?? 0));
  const owner = figure(3.4, 5.2, -2.4);

  // ---- belongings, left behind in ordinary places
  const P = buildProcedural(track);
  const pivot = (o: THREE.Object3D, s: number, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => {
    const g = new THREE.Group(); const bb = new THREE.Box3().setFromObject(o); const c = bb.getCenter(new THREE.Vector3()); const sz = bb.getSize(new THREE.Vector3());
    o.position.sub(c); g.add(o); g.scale.setScalar(s / Math.max(sz.x, sz.y, sz.z)); g.position.set(x, y, z); g.rotation.set(rx, ry, rz);
    g.traverse((m) => { m.castShadow = true; }); root.add(g); return g;
  };
  const backpack = (() => {
    const g = new THREE.Group();
    add(g, track(new RoundedBoxGeometry(0.9, 1.2, 0.5, 4, 0.18)), M.canvas, 0, 0, 0);
    add(g, track(new RoundedBoxGeometry(0.7, 0.5, 0.2, 3, 0.08)), M.canvas, 0, -0.2, 0.32);
    add(g, boxGeo(0.12, 0.9, 0.06), M.woodDark, -0.25, 0.05, -0.28); add(g, boxGeo(0.12, 0.9, 0.06), M.woodDark, 0.25, 0.05, -0.28);
    return g;
  })();
  const bottle = (() => { const g = new THREE.Group(); add(g, track(new THREE.CylinderGeometry(0.18, 0.18, 0.9, 24)), M.bottle, 0, 0, 0); add(g, track(new THREE.CylinderGeometry(0.12, 0.12, 0.18, 20)), M.woodDark, 0, 0.54, 0); return g; })();
  const OBJ = [
    pivot(P.headphones(), 0.42, -6.1, 0.97, -2.9, -1.2, 0.4, 0.3),  // library, second table
    pivot(P.wallet(), 0.38, -6.0, 0.18, 5.85, -Math.PI / 2, 0.5, 0), // cafeteria, by a chair
    pivot(P.keys(), 0.46, 7.3, 1.12, -3.9, -Math.PI / 2, 0.3, 0),  // lecture hall desk
    pivot(backpack, 0.48, 3.75, 0.36, 3.95, 0.2, -0.4, 0.15),      // courtyard bench
    pivot(bottle, 0.3, -8.6, 0.93, -4.1, 0, 0, 0),                 // library, first table
  ];
  const objBase = OBJ.map((o) => ({ p: o.position.clone(), s: o.scale.x }));

  // ---- the pink thread: library → cafeteria → courtyard → lecture hall → back to the owner
  const thread = new THREE.CatmullRomCurve3([
    [-6.1, 1.0, -2.9], [-5.6, 0.35, 0.6], [-6.6, 0.35, 2.2], [-8.2, 0.35, 5.2], [-5.0, 0.35, 6.6], [-2.6, 0.35, 4.6], [-2.6, 0.35, 0.3],
    [3.0, 0.35, -0.4], [6.0, 0.6, -1.8], [7.2, 1.15, -3.7], [5.2, 0.35, -0.6], [4.3, 0.35, 2.4], [3.75, 0.5, 3.9], [3.4, 0.7, 5.0],
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z)), false, "catmullrom", 0.4);
  const TUBE_SEG = 600;
  const tube = track(new THREE.TubeGeometry(thread, TUBE_SEG, 0.035, 8, false));
  const tubeMat = track(new THREE.MeshStandardMaterial({ color: 0xe8395f, emissive: 0xe8395f, emissiveIntensity: 0.9, roughness: 0.4 }));
  const tubeMesh = new THREE.Mesh(tube, tubeMat); tubeMesh.castShadow = false; root.add(tubeMesh);
  tube.setDrawRange(0, 0);
  const headMat = track(new THREE.MeshBasicMaterial({ color: 0xff7a96 }));
  const head = new THREE.Mesh(sph, headMat); head.scale.setScalar(0.09); root.add(head);

  // ---- sizing / input
  let w = 1, h = 1;
  const resize = () => { const r = container.getBoundingClientRect(); w = Math.max(1, r.width); h = Math.max(1, r.height); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); if (!running) renderOnce(); };
  const ro = new ResizeObserver(resize); ro.observe(container);
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 }, ndc = new THREE.Vector2(-9, -9);
  const onPointer = (e: PointerEvent) => {
    const r = container.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    if (e.pointerType === "touch" || reducedMotion) return;
    ptr.tx = ndc.x; ptr.ty = -ndc.y;
  };
  const onLeave = () => ndc.set(-9, -9);
  container.addEventListener("pointermove", onPointer, { passive: true });
  container.addEventListener("pointerleave", onLeave);
  const ray = new THREE.Raycaster();

  // ---- camera keyframes: [pos, target]
  const K = compact ? [
    [[12, 26, 30], [0, 0, 0.5]], [[-4.6, 5.4, 4.4], [-6.4, 0.8, -3]], [[-3.5, 5, 11.5], [-7, 0.4, 4.8]], [[9.5, 7, 6.5], [6.6, 1, -3.6]], [[0, 30, 20], [0, 0, 0.8]], [[8.5, 6.5, 15], [2.4, 0.6, 3.4]],
  ] : [
    [[6, 24, 30], [-6.5, -1.5, 1.5]], [[-3.4, 4.2, 3.6], [-6.2, 0.8, -3]], [[-3.2, 4.2, 10.8], [-6.6, 0.3, 5.2]], [[10.4, 5.2, 3.6], [7.0, 1.0, -3.8]], [[0, 23, 15], [0, 0, 0.8]], [[6.5, 9.0, 16.5], [0.4, -0.4, 3.4]],
  ];
  const STOPS = [0, 0.2, 0.32, 0.44, 0.62, 0.82]; // q at which each keyframe is fully reached
  const cpos = new THREE.Vector3(), ctgt = new THREE.Vector3(), va = new THREE.Vector3(), vb = new THREE.Vector3();
  const frame: CampusFrame = { places: PLACES.map(() => ({ x: 0, y: 0, on: 0 })), objs: OBJ.map(() => ({ x: 0, y: 0, on: 0 })), hover: -1, back: false };
  let q = 0, time = 0, hoverIdx = -1;
  const hl = OBJ.map(() => 0);

  const project = (v: THREE.Vector3, out: Pin) => { va.copy(v).project(camera); out.x = (va.x * 0.5 + 0.5) * w; out.y = (-va.y * 0.5 + 0.5) * h; };

  const update = (dt: number) => {
    time += reducedMotion ? 0 : dt;
    ptr.x += (ptr.tx - ptr.x) * 0.05; ptr.y += (ptr.ty - ptr.y) * 0.05;
    // camera along keyframes
    let i = 0; while (i < STOPS.length - 2 && q > STOPS[i + 1]) i++;
    const seg = ss(STOPS[i] + (STOPS[i + 1] - STOPS[i]) * 0.15, STOPS[i + 1], q);
    cpos.fromArray(K[i][0]).lerp(vb.fromArray(K[i + 1][0]), seg);
    ctgt.fromArray(K[i][1]).lerp(vb.fromArray(K[i + 1][1]), seg);
    const orbit = (1 - ss(0, 0.2, q)) * (reducedMotion ? 0 : Math.sin(time * 0.12) * 1.2);
    camera.position.set(cpos.x + ptr.x * 0.8 + orbit, cpos.y - ptr.y * 0.5, cpos.z);
    camera.lookAt(ctgt);

    // which belonging is in focus (scene 02): library → cafeteria → lecture hall; then the journey (scene 04)
    const focus = q > 0.14 && q < 0.26 ? 0 : q >= 0.26 && q < 0.38 ? 1 : q >= 0.38 && q < 0.52 ? 2 : -1;
    // hover
    hoverIdx = -1;
    if (ndc.x > -2) {
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(OBJ, true)[0];
      if (hit) { let n: THREE.Object3D | null = hit.object; while (n && !OBJ.includes(n as THREE.Group)) n = n.parent; hoverIdx = OBJ.indexOf(n as THREE.Group); }
    }
    container.style.cursor = hoverIdx >= 0 ? "pointer" : "";
    // thread draws through scene 03, the headphones travel it in scene 04
    const draw = ss(0.5, 0.66, q);
    tube.setDrawRange(0, Math.floor(TUBE_SEG * 8 * 6 * draw)); // index count ≈ segments × radial × 6
    const journey = ss(0.68, 0.94, q);
    thread.getPointAt(Math.max(0.001, draw * (1 - journey) + journey), va);
    head.position.copy(va); head.visible = draw > 0.01 && journey < 0.99;
    tubeMat.emissiveIntensity = 0.8 + Math.sin(time * 2) * 0.15 + journey * 0.4;

    OBJ.forEach((o, k) => {
      const target = k === focus || k === hoverIdx ? 1 : 0;
      hl[k] += (target - hl[k]) * Math.min(1, dt * 5 || 1);
      const b = objBase[k];
      o.position.copy(b.p); o.position.y += hl[k] * 0.12 + (reducedMotion ? 0 : Math.sin(time * 1.4 + k) * 0.015 * hl[k]);
      o.scale.setScalar(b.s * (1 + hl[k] * 0.12));
      project(vb.copy(o.position).add(new THREE.Vector3(0, 0.35, 0)), frame.objs[k]);
      frame.objs[k].on = Math.max(k === focus ? 1 : 0, k === hoverIdx ? 1 : 0);
    });
    // scene 04: the headphones travel the thread back to their owner
    if (journey > 0) {
      thread.getPointAt(journey, va);
      OBJ[0].position.copy(objBase[0].p).lerp(va.add(new THREE.Vector3(0, 0.25, 0)), ss(0, 0.08, journey));
      if (journey > 0.08) { thread.getPointAt(journey, va); OBJ[0].position.copy(va).add(new THREE.Vector3(0, 0.25, 0)); }
      OBJ[0].rotation.y = 0.4 + journey * 6;
      frame.objs[0].on = journey > 0.9 ? 1 : 0;
      project(vb.copy(OBJ[0].position).add(new THREE.Vector3(0, 0.35, 0)), frame.objs[0]);
    }
    owner.rotation.y = -2.4 + ss(0.85, 0.95, q) * 0.6;
    // a soft warm pool of light on the place in focus
    const f = focus >= 0 ? focus : hoverIdx;
    if (f >= 0) { focusLight.target.position.copy(OBJ[f].position); focusLight.position.copy(OBJ[f].position).add(vb.set(0.6, 3.5, 1.2)); }
    focusLight.intensity += ((f >= 0 ? 22 : 0) - focusLight.intensity) * Math.min(1, dt * 4 || 1);
    // place labels: scene 01 and scene 03 (overview shots)
    const labelsOn = Math.max(1 - ss(0.1, 0.16, q), ss(0.54, 0.6, q) * (1 - ss(0.7, 0.76, q)));
    PLACES.forEach((pl, k) => { project(vb.fromArray(pl.at as unknown as number[]), frame.places[k]); frame.places[k].on = labelsOn; });
    frame.hover = hoverIdx;
    frame.back = journey > 0.9;
    onFrame(frame);
  };

  let raf = 0, running = false, last = performance.now();
  const renderOnce = () => { update(0.016); renderer.render(scene, camera); };
  const loop = (now: number) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; update(dt); renderer.render(scene, camera); raf = requestAnimationFrame(loop); };
  resize();
  return {
    setProgress: (nq) => { q = nq; if (!running) renderOnce(); },
    setActive: (on) => { if (on && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(loop); } else if (!on && running) { running = false; cancelAnimationFrame(raf); } },
    dispose: () => {
      running = false; cancelAnimationFrame(raf); ro.disconnect();
      container.removeEventListener("pointermove", onPointer); container.removeEventListener("pointerleave", onLeave); container.style.cursor = "";
      disposables.forEach((d) => { try { d.dispose(); } catch { /* gone */ } });
      renderer.dispose(); renderer.forceContextLoss();
    },
  };
}

export function webglOK() { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; } }
