/**
 * Section 02 — "The Exchange". A museum still life: one travertine slab, a camera-shaped impression
 * on the owner's side, the camera itself on a smoked-glass plinth on the finder's side, and the
 * pink tag that travels a brass inlay between them. State = f(scroll progress q, hover emphasis).
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export type ExchangeHandle = {
  setProgress: (q: number) => void;
  setEmphasis: (s: "" | "owner" | "finder") => void;
  setActive: (on: boolean) => void;
  dispose: () => void;
};

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ss = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function travertine(track: <T extends { dispose: () => void }>(x: T) => T) {
  const c = document.createElement("canvas"); c.width = c.height = 512;
  const g = c.getContext("2d")!;
  g.fillStyle = "#e8dccb"; g.fillRect(0, 0, 512, 512);
  // banded veining
  for (let y = 0; y < 512; y += 2) {
    const v = Math.sin(y * 0.05 + Math.sin(y * 0.013) * 3) * 0.5 + 0.5;
    g.fillStyle = `rgba(170, 140, 105, ${0.05 + v * 0.07})`; g.fillRect(0, y, 512, 1 + (v > 0.85 ? 1 : 0));
  }
  // travertine pores
  for (let i = 0; i < 1400; i++) {
    const x = Math.random() * 512, y = Math.random() * 512, w = 1 + Math.random() * 7, h = 0.6 + Math.random() * 1.6;
    g.fillStyle = `rgba(120, 95, 70, ${0.12 + Math.random() * 0.2})`; g.beginPath(); g.ellipse(x, y, w, h, 0, 0, Math.PI * 2); g.fill();
  }
  const t = track(new THREE.CanvasTexture(c)); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}

function plaque(track: <T extends { dispose: () => void }>(x: T) => T, code: string, title: string) {
  const c = document.createElement("canvas"); c.width = 512; c.height = 128;
  const g = c.getContext("2d")!;
  const gr = g.createLinearGradient(0, 0, 512, 128); gr.addColorStop(0, "#c9a868"); gr.addColorStop(0.5, "#e2c890"); gr.addColorStop(1, "#b8955a");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 128);
  for (let i = 0; i < 128; i += 2) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`; g.fillRect(0, i, 512, 1); }
  g.fillStyle = "rgba(70,48,20,.85)"; g.font = "600 22px Menlo, monospace"; g.textBaseline = "top"; g.fillText(code, 26, 20);
  g.font = "italic 46px Georgia, 'Times New Roman', serif"; g.fillText(title, 26, 54);
  const t = track(new THREE.CanvasTexture(c)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

export function createExchangeScene(opts: { canvas: HTMLCanvasElement; container: HTMLElement; vertical: boolean; reducedMotion: boolean }): ExchangeHandle {
  const { canvas, container, vertical, reducedMotion } = opts;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, vertical ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;

  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x);
  const scene = new THREE.Scene();
  const pmrem = track(new THREE.PMREMGenerator(renderer));
  scene.environment = track(pmrem.fromScene(new RoomEnvironment(), 0.04)).texture;
  scene.environmentIntensity = 0.55;
  const camera = new THREE.PerspectiveCamera(vertical ? 40 : 28, 1, 0.1, 100);

  // ---- light: one soft gallery key + two pin spots (owner / finder)
  const key = new THREE.DirectionalLight(0xfff1e2, 1.5);
  key.position.set(-5, 11, 7); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 9; key.shadow.blurSamples = 16; key.shadow.bias = -0.0004;
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 6, bottom: -6, near: 1, far: 40 });
  scene.add(key);
  const spotOwner = new THREE.SpotLight(0xffe6d6, 0, 14, 0.32, 0.65, 1.3);
  const spotFinder = new THREE.SpotLight(0xfff4e6, 0, 14, 0.32, 0.65, 1.3);
  spotOwner.castShadow = spotFinder.castShadow = !vertical;
  scene.add(spotOwner, spotOwner.target, spotFinder, spotFinder.target);

  const world = new THREE.Group(); scene.add(world);
  const stoneMap = travertine(track);
  const M = {
    stone: track(new THREE.MeshPhysicalMaterial({ map: stoneMap, roughness: 0.62, clearcoat: 0.25, clearcoatRoughness: 0.5 })),
    felt: track(new THREE.MeshPhysicalMaterial({ color: 0xd9a0a3, emissive: 0x3a1018, roughness: 1, sheen: 1, sheenColor: new THREE.Color(0xffd0d4), sheenRoughness: 0.6 })),
    glass: track(new THREE.MeshPhysicalMaterial({ color: 0x5a524c, roughness: 0.05, metalness: 0.15, clearcoat: 1, transparent: true, opacity: 0.55 })),
    steel: track(new THREE.MeshPhysicalMaterial({ color: 0xbdb8b0, metalness: 1, roughness: 0.3 })),
    brass: track(new THREE.MeshPhysicalMaterial({ color: 0xc3a160, metalness: 1, roughness: 0.28 })),
    pink: track(new THREE.MeshStandardMaterial({ color: 0xd92d55, emissive: 0xd92d55, emissiveIntensity: 0.35, roughness: 0.5 })),
    tag: track(new THREE.MeshPhysicalMaterial({ color: 0xd23a5f, roughness: 0.6, sheen: 0.6, sheenColor: new THREE.Color(0xffb3c4) })),
    cord: track(new THREE.LineBasicMaterial({ color: 0x8a5b48 })),
  };

  // ---- the slab: one long travertine block with a camera-shaped impression on the owner's side
  const SW = 13, SD = 4.2, SH = 0.55, HOLE_X = -3.7;
  const outline = new THREE.Shape();
  outline.moveTo(-SW / 2, -SD / 2); outline.lineTo(SW / 2, -SD / 2); outline.lineTo(SW / 2, SD / 2); outline.lineTo(-SW / 2, SD / 2); outline.lineTo(-SW / 2, -SD / 2);
  // impression: camera body (rounded rect) + lens bump toward the viewer (shape y = -world z)
  const bw = 2.7, bd = 1.0, r = 0.2, lens = 0.5;
  const hole = new THREE.Path();
  const x0 = HOLE_X - bw / 2, x1 = HOLE_X + bw / 2, y0 = -bd / 2, y1 = bd / 2;
  hole.moveTo(x0 + r, y0); hole.lineTo(HOLE_X - lens, y0);
  hole.absarc(HOLE_X + 0.25, y0, lens, Math.PI, 0, true); // lens bulge (clockwise, outward)
  hole.lineTo(x1 - r, y0); hole.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false);
  hole.lineTo(x1, y1 - r); hole.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false);
  hole.lineTo(x0 + r, y1); hole.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false);
  hole.lineTo(x0, y0 + r); hole.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
  outline.holes.push(hole);
  const slabGeo = track(new THREE.ExtrudeGeometry(outline, { depth: SH, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 3, curveSegments: 48 }));
  slabGeo.rotateX(-Math.PI / 2); // extrude now runs up (+y); shape y → -z
  const uv = slabGeo.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.09, uv.getY(i) * 0.09);
  const slab = new THREE.Mesh(slabGeo, M.stone); slab.castShadow = slab.receiveShadow = true;
  world.add(slab);
  // felt floor of the impression, a little below the top
  const felt = new THREE.Mesh(track(new THREE.PlaneGeometry(bw + 1.2, bd + 1.2)), M.felt);
  felt.rotation.x = -Math.PI / 2; felt.position.set(HOLE_X, SH - 0.13, 0.15); felt.receiveShadow = true; world.add(felt);
  // base under the slab: a dark recessed plinth so the slab floats a few cm
  const base = new THREE.Mesh(track(new RoundedBoxGeometry(SW - 0.8, 0.5, SD - 0.8, 4, 0.08)), track(new THREE.MeshStandardMaterial({ color: 0x2a2421, roughness: 0.7 })));
  base.position.y = -0.3; base.castShadow = true; world.add(base);
  // brass inlay groove along the front edge, from the plinth to the impression; pink inlay grows over it
  const GX0 = 3.7, GX1 = HOLE_X + 0.9, GZ = 1.55;
  const groove = new THREE.Mesh(track(new THREE.BoxGeometry(GX0 - GX1, 0.02, 0.05)), M.brass);
  groove.position.set((GX0 + GX1) / 2, SH + 0.045, GZ); world.add(groove);
  const inlay = new THREE.Mesh(track(new THREE.BoxGeometry(1, 0.026, 0.085)), M.pink);
  inlay.position.set(GX0, SH + 0.048, GZ); world.add(inlay);
  // plaques on the slab's front face
  const plaqueGeo = track(new THREE.PlaneGeometry(2.4, 0.6));
  const pOwner = new THREE.Mesh(plaqueGeo, track(new THREE.MeshStandardMaterial({ map: plaque(track, "EXHIBIT 02·A — THE OWNER", "something missing"), metalness: 0.6, roughness: 0.35 })));
  pOwner.position.set(HOLE_X, SH * 0.5, SD / 2 + 0.045); world.add(pOwner);
  const pFinder = new THREE.Mesh(plaqueGeo, track(new THREE.MeshStandardMaterial({ map: plaque(track, "EXHIBIT 02·B — THE FINDER", "something found"), metalness: 0.6, roughness: 0.35 })));
  pFinder.position.set(3.7, SH * 0.5, SD / 2 + 0.045); world.add(pFinder);

  // ---- the finder's plinth: brushed steel base + smoked glass
  const plinth = new THREE.Group(); plinth.position.set(3.7, SH, 0); world.add(plinth);
  const steel = new THREE.Mesh(track(new RoundedBoxGeometry(3.0, 0.08, 2.1, 3, 0.03)), M.steel); steel.position.y = 0.04; steel.castShadow = steel.receiveShadow = true; plinth.add(steel);
  const glass = new THREE.Mesh(track(new RoundedBoxGeometry(2.8, 0.26, 1.9, 3, 0.04)), M.glass); glass.position.y = 0.21; glass.castShadow = true; glass.receiveShadow = true; plinth.add(glass);
  const PLINTH_TOP = SH + 0.34;

  // ---- the tag (on a cord from the camera's strap lug)
  const tagShape = new THREE.Shape();
  tagShape.moveTo(-0.16, 0.08); tagShape.lineTo(-0.06, 0.18); tagShape.lineTo(0.06, 0.18); tagShape.lineTo(0.16, 0.08); tagShape.lineTo(0.16, -0.32); tagShape.lineTo(-0.16, -0.32); tagShape.lineTo(-0.16, 0.08);
  const eye = new THREE.Path(); eye.absarc(0, 0.09, 0.035, 0, Math.PI * 2, true); tagShape.holes.push(eye);
  const tagGeo = track(new THREE.ExtrudeGeometry(tagShape, { depth: 0.02, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.006, bevelSegments: 2 }));
  tagGeo.rotateX(-Math.PI / 2);
  const tag = new THREE.Mesh(tagGeo, M.tag); tag.castShadow = true; tag.scale.setScalar(2.1); world.add(tag);
  const grommet = new THREE.Mesh(track(new THREE.TorusGeometry(0.04, 0.012, 8, 20)), M.brass); grommet.rotation.x = Math.PI / 2; tag.add(grommet); grommet.position.set(0, 0.025, -0.09);
  const CORD_N = 40, cordPos = new Float32Array(CORD_N * 3);
  const cordGeo = track(new THREE.BufferGeometry()); cordGeo.setAttribute("position", new THREE.BufferAttribute(cordPos, 3));
  const cord = new THREE.Line(cordGeo, M.cord); world.add(cord);

  // ---- the camera (the found object)
  let cam: THREE.Group | null = null;
  const lug = new THREE.Vector3(3.7 + 1.0, PLINTH_TOP + 0.6, 0.35);
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  let disposed = false;
  loader.loadAsync("/models/camera.glb").then((g) => {
    if (disposed) return;
    const m = g.scene;
    m.traverse((o) => { const mesh = o as THREE.Mesh; if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; track(mesh.geometry); const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]; mats.forEach((mt) => { track(mt); Object.values(mt).forEach((v) => { if ((v as THREE.Texture)?.isTexture) track(v as THREE.Texture); }); }); } });
    const box = new THREE.Box3().setFromObject(m); const size = box.getSize(new THREE.Vector3()); const c = box.getCenter(new THREE.Vector3());
    m.position.set(-c.x, -box.min.y, -c.z);
    const g2 = new THREE.Group(); g2.add(m); g2.scale.setScalar(2.6 / Math.max(size.x, size.z));
    cam = new THREE.Group(); cam.add(g2); cam.position.set(3.7, PLINTH_TOP, 0.05); world.add(cam);
    if (!running) renderOnce();
  }).catch(() => {});

  if (vertical) world.rotation.y = Math.PI / 2; // phones: owner's impression far, the camera near

  // ---- sizing / pointer
  let w = 1, h = 1;
  const resize = () => { const rr = container.getBoundingClientRect(); w = Math.max(1, rr.width); h = Math.max(1, rr.height); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); if (!running) renderOnce(); };
  const ro = new ResizeObserver(resize); ro.observe(container);
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointer = (e: PointerEvent) => { if (e.pointerType === "touch" || reducedMotion) return; const rr = container.getBoundingClientRect(); ptr.tx = ((e.clientX - rr.left) / rr.width) * 2 - 1; ptr.ty = ((e.clientY - rr.top) / rr.height) * 2 - 1; };
  window.addEventListener("pointermove", onPointer, { passive: true });

  let q = 0, time = 0, emph: "" | "owner" | "finder" = "", eo = 0, ef = 0;
  const v = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), mid = new THREE.Vector3();
  const cordCurve = new THREE.QuadraticBezierCurve3(a, mid, b);
  const update = (dt: number) => {
    time += reducedMotion ? 0 : dt;
    ptr.x += (ptr.tx - ptr.x) * 0.05; ptr.y += (ptr.ty - ptr.y) * 0.05;
    eo += ((emph === "owner" ? 1 : 0) - eo) * Math.min(1, dt * 6 || 1);
    ef += ((emph === "finder" ? 1 : 0) - ef) * Math.min(1, dt * 6 || 1);
    const enter = ss(0, 0.2, q), absence = ss(0.16, 0.32, q), found = ss(0.3, 0.46, q), connect = ss(0.48, 0.7, q), resolve = ss(0.72, 0.95, q);

    // camera: a low gallery dolly across the slab → three-quarter → pulled back over the pathways
    const P0 = vertical ? [5, 12, 22] : [-11, 3.0, 11.5], P1 = vertical ? [1.5, 26, 15] : [-2.2, 7.2, 17.5], P2 = vertical ? [1, 28, 17] : [0.4, 8.2, 18.0];
    const L0 = vertical ? [0, 0, 1] : [-3.6, 1.2, 0], L1 = vertical ? [0, 0, -1.2] : [0.2, 1.4, 0], L2 = vertical ? [0, 0, -0.2] : [0.2, 0.2, 0.6];
    const t1 = ss(0, 0.4, q), t2 = resolve;
    const px = lerp(lerp(P0[0], P1[0], t1), P2[0], t2), py = lerp(lerp(P0[1], P1[1], t1), P2[1], t2), pz = lerp(lerp(P0[2], P1[2], t1), P2[2], t2);
    camera.position.set(px + ptr.x * 0.7, py - ptr.y * 0.4, pz);
    camera.lookAt(lerp(lerp(L0[0], L1[0], t1), L2[0], t2), lerp(lerp(L0[1], L1[1], t1), L2[1], t2), lerp(lerp(L0[2], L1[2], t1), L2[2], t2));

    // light: the key catches the slab on entry; pin spots reveal absence, then the found object
    key.intensity = lerp(0.35, 1.5, enter);
    world.localToWorld(spotOwner.target.position.set(HOLE_X, SH, 0));
    world.localToWorld(spotOwner.position.set(HOLE_X - 0.6, 7.5, 2.4));
    world.localToWorld(spotFinder.target.position.set(3.7, PLINTH_TOP, 0));
    world.localToWorld(spotFinder.position.set(3.7 + 0.8, 7.5, 2.4));
    spotOwner.intensity = 70 * absence * (1 + eo * 0.9 - ef * 0.6);
    spotFinder.intensity = 70 * found * (1 + ef * 0.9 - eo * 0.6);
    M.felt.emissive.setRGB(0.18 * eo, 0.06 * eo, 0.08 * eo);

    // the camera descends onto the plinth and turns slowly; hover lifts it a touch
    if (cam) {
      cam.position.y = PLINTH_TOP + (1 - found) * 1.6 + ef * 0.08;
      cam.rotation.y = -0.45 + (1 - found) * 0.9 + (reducedMotion ? 0 : Math.sin(time * 0.25) * 0.08) + q * 0.4 + ptr.x * 0.12;
      cam.visible = found > 0.001;
      cam.traverse((o) => { const mt = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined; if (mt && "opacity" in mt) { mt.transparent = found < 1; mt.opacity = found; } });
    }
    // the tag travels the brass inlay from the camera toward the empty impression
    const tx = lerp(GX0 - 0.6, GX1 + 0.3, connect);
    tag.position.set(tx, SH + 0.08, GZ - 0.45 + Math.sin(connect * Math.PI) * 0.12);
    tag.rotation.set(0, 0.35 - connect * 0.5 + (reducedMotion ? 0 : Math.sin(time * 0.8) * 0.03), 0);
    tag.visible = found > 0.5;
    inlay.scale.x = Math.max(0.001, (GX0 - tx) );
    inlay.position.x = (GX0 + tx) / 2;
    inlay.visible = connect > 0.001;
    M.pink.emissiveIntensity = 0.35 + connect * 0.5 + (eo + ef) * 0.3;
    // cord from the camera's strap lug to the tag grommet
    a.copy(lug); tag.localToWorld(b.set(0, 0.03, -0.09)); world.worldToLocal(b);
    mid.copy(a).lerp(b, 0.5); mid.y = Math.min(a.y, b.y) - 0.05;
    for (let i = 0; i < CORD_N; i++) { cordCurve.getPoint(i / (CORD_N - 1), v); cordPos.set([v.x, v.y, v.z], i * 3); }
    cordGeo.attributes.position.needsUpdate = true;
    cord.visible = found > 0.6 && !!cam;
  };

  let raf = 0, running = false, last = performance.now();
  const renderOnce = () => { update(0.016); renderer.render(scene, camera); };
  const loop = (now: number) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; update(dt); renderer.render(scene, camera); raf = requestAnimationFrame(loop); };
  resize();
  return {
    setProgress: (nq) => { q = nq; if (!running) renderOnce(); },
    setEmphasis: (s) => { emph = s; if (!running) renderOnce(); },
    setActive: (on) => { if (on && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(loop); } else if (!on && running) { running = false; cancelAnimationFrame(raf); } },
    dispose: () => {
      disposed = true; running = false; cancelAnimationFrame(raf); ro.disconnect();
      window.removeEventListener("pointermove", onPointer);
      disposables.forEach((d) => { try { d.dispose(); } catch { /* gone */ } });
      renderer.dispose(); renderer.forceContextLoss();
    },
  };
}

export function webglOK() { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; } }
