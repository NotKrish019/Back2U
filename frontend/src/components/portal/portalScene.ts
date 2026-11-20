/**
 * "The Identification Portal" — the home page's search-entry instrument.
 * A graphite inspection bed with an aluminium bezel, a glass plate, two rails and a gantry that carries
 * a lens head. The user's real photo becomes a texture on the plate; focus brackets fit its real
 * proportions. Visual states mirror real UI state only: empty / drag / loaded / handing (navigating to /search).
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export type PortalState = "empty" | "drag" | "loaded" | "handing";
export type PortalFrame = { rect: { x: number; y: number; w: number; h: number }; quad: [number, number][]; center: { x: number; y: number } };
export type PortalHandle = {
  setState: (s: PortalState) => void;
  setImage: (url: string | null, onResult?: (ok: boolean, w?: number, h?: number) => void) => void;
  setEnter: (q: number) => void;
  setFocus: (on: boolean) => void;
  setActive: (on: boolean) => void;
  dispose: () => void;
};

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ss = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function createPortalScene(opts: {
  canvas: HTMLCanvasElement; container: HTMLElement; compact: boolean; reducedMotion: boolean; onFrame: (f: PortalFrame) => void;
}): PortalHandle {
  const { canvas, container, compact, reducedMotion, onFrame } = opts;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = !compact;
  renderer.shadowMap.type = THREE.VSMShadowMap;

  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x);
  const scene = new THREE.Scene();
  const pmrem = track(new THREE.PMREMGenerator(renderer));
  scene.environment = track(pmrem.fromScene(new RoomEnvironment(), 0.03)).texture;
  scene.environmentIntensity = 0.9;
  const camera = new THREE.PerspectiveCamera(compact ? 36 : 28, 1, 0.1, 80);

  const key = new THREE.DirectionalLight(0xfff3e6, 1.6);
  key.position.set(-4, 9, 6); key.castShadow = !compact;
  key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 10; key.shadow.blurSamples = 14; key.shadow.bias = -0.0005;
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 30 });
  scene.add(key);
  const signal = new THREE.PointLight(0xe8395f, 0, 6, 1.6);
  scene.add(signal);

  // ------------------------------------------------------------- materials
  const M = {
    graphite: track(new THREE.MeshPhysicalMaterial({ color: 0x2b2825, roughness: 0.42, metalness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.3 })),
    alu: track(new THREE.MeshPhysicalMaterial({ color: 0xd4d1cb, metalness: 1, roughness: 0.24 })),
    aluDark: track(new THREE.MeshPhysicalMaterial({ color: 0x8f8b84, metalness: 1, roughness: 0.35 })),
    lens: track(new THREE.MeshPhysicalMaterial({ color: 0x0a0a0d, roughness: 0.04, metalness: 0.4, clearcoat: 1, iridescence: 0.7, iridescenceIOR: 1.5 })),
    signal: track(new THREE.MeshStandardMaterial({ color: 0xd92d55, emissive: 0xd92d55, emissiveIntensity: 0.2, roughness: 0.5 })),
    bracket: track(new THREE.MeshStandardMaterial({ color: 0xf3efe7, emissive: 0xf3efe7, emissiveIntensity: 0.25, roughness: 0.6 })),
  };
  const gridTex = (() => {
    const c = document.createElement("canvas"); c.width = 1024; c.height = 720;
    const g = c.getContext("2d")!;
    const gr = g.createRadialGradient(512, 360, 40, 512, 360, 620);
    gr.addColorStop(0, "#24211e"); gr.addColorStop(1, "#141210");
    g.fillStyle = gr; g.fillRect(0, 0, 1024, 720);
    g.strokeStyle = "rgba(243,239,231,0.07)"; g.lineWidth = 1;
    for (let x = 0; x <= 1024; x += 32) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, 720); g.stroke(); }
    for (let y = 0; y <= 720; y += 32) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(1024, y + 0.5); g.stroke(); }
    g.strokeStyle = "rgba(243,239,231,0.16)";
    g.beginPath(); g.moveTo(512, 300); g.lineTo(512, 420); g.moveTo(452, 360); g.lineTo(572, 360); g.stroke();
    const t = track(new THREE.CanvasTexture(c)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  })();
  const plateMat = track(new THREE.MeshPhysicalMaterial({ map: gridTex, emissive: 0xffffff, emissiveMap: gridTex, emissiveIntensity: 0.6, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 }));

  // ------------------------------------------------------------- the instrument
  const PW = 4.8, PD = 3.4;                // plate size (x, z)
  const inst = new THREE.Group();
  scene.add(inst);
  const base = new THREE.Mesh(track(new RoundedBoxGeometry(PW + 1.6, 0.5, PD + 1.3, 6, 0.18)), M.graphite);
  base.position.y = -0.25; base.castShadow = base.receiveShadow = true; inst.add(base);
  // brushed aluminium bezel
  const bz = 0.12;
  [[0, PD / 2 + bz / 2, PW + 2 * bz, bz], [0, -PD / 2 - bz / 2, PW + 2 * bz, bz]].forEach(([x, z, w, d]) => {
    const m = new THREE.Mesh(track(new RoundedBoxGeometry(w, 0.1, d, 2, 0.03)), M.alu); m.position.set(x, 0.03, z); m.castShadow = true; inst.add(m);
  });
  [[PW / 2 + bz / 2, 0], [-PW / 2 - bz / 2, 0]].forEach(([x, z]) => {
    const m = new THREE.Mesh(track(new RoundedBoxGeometry(bz, 0.1, PD, 2, 0.03)), M.alu); m.position.set(x, 0.03, z); m.castShadow = true; inst.add(m);
  });
  const plate = new THREE.Mesh(track(new THREE.PlaneGeometry(PW, PD)), plateMat);
  plate.rotation.x = -Math.PI / 2; plate.position.y = 0.012; plate.receiveShadow = true; inst.add(plate);
  // photo layer (aspect-fitted inside the plate)
  const photoMat = track(new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, toneMapped: false }));
  const photo = new THREE.Mesh(track(new THREE.PlaneGeometry(1, 1)), photoMat);
  photo.rotation.x = -Math.PI / 2; photo.position.y = 0.02; inst.add(photo);
  // fine graduations along the bezel
  const tickPts: number[] = [];
  for (let i = 0; i <= 48; i++) {
    const x = -PW / 2 + (PW * i) / 48, len = i % 8 === 0 ? 0.16 : i % 4 === 0 ? 0.1 : 0.05;
    tickPts.push(x, 0.002, PD / 2 + 0.2, x, 0.002, PD / 2 + 0.2 + len);
  }
  for (let i = 0; i <= 34; i++) {
    const z = -PD / 2 + (PD * i) / 34, len = i % 8 === 0 ? 0.16 : i % 4 === 0 ? 0.1 : 0.05;
    tickPts.push(-PW / 2 - 0.2, 0.002, z, -PW / 2 - 0.2 - len, 0.002, z);
  }
  const tickGeo = track(new THREE.BufferGeometry()); tickGeo.setAttribute("position", new THREE.Float32BufferAttribute(tickPts, 3));
  const ticks = new THREE.LineSegments(tickGeo, track(new THREE.LineBasicMaterial({ color: 0xc8c4bb, transparent: true, opacity: 0.6 })));
  ticks.position.y = 0.002; inst.add(ticks);
  // rails
  const railGeo = track(new THREE.CylinderGeometry(0.05, 0.05, PD + 1.0, 20));
  [-1, 1].forEach((sx) => {
    const r = new THREE.Mesh(railGeo, M.alu); r.rotation.x = Math.PI / 2; r.position.set(sx * (PW / 2 + 0.55), 0.35, 0); r.castShadow = true; inst.add(r);
    [-1, 1].forEach((sz) => { const post = new THREE.Mesh(track(new RoundedBoxGeometry(0.22, 0.38, 0.22, 2, 0.05)), M.graphite); post.position.set(sx * (PW / 2 + 0.55), 0.16, sz * (PD / 2 + 0.45)); post.castShadow = true; inst.add(post); });
  });
  // gantry + lens head
  const gantry = new THREE.Group();
  const bridge = new THREE.Mesh(track(new RoundedBoxGeometry(PW + 1.4, 0.16, 0.34, 3, 0.05)), M.aluDark); bridge.position.y = 0.62; bridge.castShadow = true; gantry.add(bridge);
  [-1, 1].forEach((sx) => { const shoe = new THREE.Mesh(track(new RoundedBoxGeometry(0.3, 0.36, 0.46, 3, 0.06)), M.graphite); shoe.position.set(sx * (PW / 2 + 0.55), 0.45, 0); shoe.castShadow = true; gantry.add(shoe); });
  const head = new THREE.Group();
  const carriage = new THREE.Mesh(track(new RoundedBoxGeometry(0.62, 0.3, 0.5, 3, 0.06)), M.graphite); carriage.position.y = 0.62; head.add(carriage);
  const barrel = new THREE.Mesh(track(new THREE.CylinderGeometry(0.2, 0.24, 0.42, 40)), M.alu); barrel.position.y = 0.36; head.add(barrel);
  const glass = new THREE.Mesh(track(new THREE.CircleGeometry(0.19, 40)), M.lens); glass.rotation.x = Math.PI / 2; glass.position.y = 0.149; head.add(glass);
  const ring = new THREE.Mesh(track(new THREE.TorusGeometry(0.215, 0.018, 10, 48)), M.signal); ring.rotation.x = Math.PI / 2; ring.position.y = 0.16; head.add(ring);
  head.traverse((o) => (o.castShadow = true));
  gantry.add(head);
  inst.add(gantry);
  // scan line on the plate under the gantry + a soft beam
  const scanMat = track(new THREE.MeshBasicMaterial({ color: 0xf0617f, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  const scan = new THREE.Mesh(track(new THREE.PlaneGeometry(PW, 0.035)), scanMat);
  scan.rotation.x = -Math.PI / 2; scan.position.y = 0.025; inst.add(scan);
  const glowMat = track(new THREE.MeshBasicMaterial({ color: 0xf0617f, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  const glow = new THREE.Mesh(track(new THREE.PlaneGeometry(PW, 0.5)), glowMat);
  glow.rotation.x = -Math.PI / 2; glow.position.y = 0.022; inst.add(glow);
  // focus brackets (4 × L)
  const bL = 0.42, bT = 0.035;
  const bars = { a: track(new THREE.BoxGeometry(bL, 0.02, bT)), b: track(new THREE.BoxGeometry(bT, 0.02, bL)) };
  const brackets = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => {
    const g = new THREE.Group();
    const h = new THREE.Mesh(bars.a, M.bracket); h.position.set(sx * -(bL / 2 - bT / 2), 0, 0);
    const v = new THREE.Mesh(bars.b, M.bracket); v.position.set(0, 0, sz * -(bL / 2 - bT / 2));
    g.add(h, v); inst.add(g);
    return { g, sx, sz };
  });

  // ------------------------------------------------------------- state
  let state: PortalState = "empty", enter = 0, focusOn = false, time = 0;
  let aspect = PW / PD, hasPhoto = false;
  const fit = { w: PW * 0.82, d: PD * 0.82 };
  const cur = { w: PW * 0.82, d: PD * 0.82, drag: 0, photo: 0, hand: 0 };
  let photoTex: THREE.Texture | null = null;
  let gx = 0, gv = 0;   // gantry z
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointer = (e: PointerEvent) => {
    if (e.pointerType === "touch" || reducedMotion) return;
    const r = container.getBoundingClientRect();
    ptr.tx = ((e.clientX - r.left) / r.width) * 2 - 1; ptr.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
  };
  container.addEventListener("pointermove", onPointer, { passive: true });

  let w = 1, h = 1;
  const resize = () => {
    const r = container.getBoundingClientRect(); w = Math.max(1, r.width); h = Math.max(1, r.height);
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); if (!running) renderOnce();
  };
  const ro = new ResizeObserver(resize); ro.observe(container);

  const v = new THREE.Vector3();
  const frame: PortalFrame = { rect: { x: 0, y: 0, w: 0, h: 0 }, quad: [[0, 0], [0, 0], [0, 0], [0, 0]], center: { x: 0, y: 0 } };
  const corners = [[-PW / 2, -PD / 2], [PW / 2, -PD / 2], [PW / 2, PD / 2], [-PW / 2, PD / 2]];

  const update = (dt: number) => {
    time += reducedMotion ? 0 : dt;
    ptr.x += (ptr.tx - ptr.x) * 0.06; ptr.y += (ptr.ty - ptr.y) * 0.06;
    const k = Math.min(1, dt * 6 || 1);
    cur.drag += ((state === "drag" ? 1 : 0) - cur.drag) * k;
    cur.photo += ((hasPhoto && state !== "drag" ? 1 : 0) - cur.photo) * Math.min(1, dt * 3 || 1);
    cur.hand += ((state === "handing" ? 1 : 0) - cur.hand) * k;
    // bracket target: the photo's real proportions, the drop target, or a relaxed idle frame
    let tw = PW * 0.82, td = PD * 0.82;
    if (hasPhoto) { tw = fit.w + 0.12; td = fit.d + 0.12; }
    if (state === "drag") { tw = PW * 0.64; td = PD * 0.64; }
    if (!hasPhoto && state === "empty") { const b = reducedMotion ? 0 : Math.sin(time * 1.6) * 0.06; tw += b; td += b; }
    if (focusOn && !hasPhoto && state === "empty") { tw = PW * 0.74; td = PD * 0.74; }
    cur.w += (tw - cur.w) * Math.min(1, dt * 7 || 1); cur.d += (td - cur.d) * Math.min(1, dt * 7 || 1);
    brackets.forEach(({ g, sx, sz }) => g.position.set(sx * cur.w / 2, 0.03, sz * cur.d / 2));
    const hot = Math.max(cur.drag, cur.hand, focusOn ? 0.6 : 0);
    M.bracket.color.setRGB(lerp(0.95, 0.85, hot), lerp(0.94, 0.18, hot), lerp(0.91, 0.33, hot));
    M.bracket.emissive.copy(M.bracket.color); M.bracket.emissiveIntensity = 0.25 + hot * 0.5;
    plateMat.emissiveIntensity = 0.6 + cur.drag * 0.5;
    photoMat.opacity = cur.photo;
    plateMat.color.setScalar(1 - cur.photo * 0.5);
    // gantry: idle sweep · fast sweep while handing · centred over a fresh photo
    let target = reducedMotion ? 0 : Math.sin(time * 0.45) * (PD / 2 - 0.2);
    if (state === "drag") target = 0;
    if (state === "loaded") target = -PD / 2 - 0.15; // park behind the photo so it stays fully visible
    if (state === "handing") target = Math.sin(time * 3.2) * (PD / 2 - 0.1);
    gv += ((target - gx) * 9 - gv * 5) * Math.min(dt, 0.05); gx += gv * Math.min(dt, 0.05);
    const parked = (1 - enter) * (PD / 2 + 0.6);
    gantry.position.z = gx * enter - parked;
    head.position.x = (reducedMotion ? 0 : Math.sin(time * 0.7) * 0.6) * (1 - cur.drag) * (1 - cur.photo * 0.6);
    scan.position.z = gantry.position.z; glow.position.z = gantry.position.z;
    const scanOn = enter * (0.35 + cur.photo * 0.25 + cur.hand * 0.6 + cur.drag * 0.4);
    scanMat.opacity = scanOn; glowMat.opacity = scanOn * 0.18;
    M.signal.emissiveIntensity = 0.2 + enter * 0.6 + cur.hand * 1.2;
    signal.intensity = (cur.drag * 2 + cur.hand * 3) * enter;
    signal.position.set(head.position.x, 1.2, gantry.position.z);
    // entrance: the instrument tilts up into view and powers on
    inst.position.y = -0.6 * (1 - enter);
    inst.rotation.set(0, -0.32 + ptr.x * 0.06, 0);
    const dist = compact ? 9.6 : 12.0;
    camera.position.set(ptr.x * 0.5 + (compact ? 0 : 0.5), lerp(4.6, compact ? 8.6 : 7.0, enter) - ptr.y * 0.3, dist - enter * 1.0);
    camera.lookAt(0, -0.3, 0.3);
    // overlay geometry: the plate's screen quad
    inst.updateMatrixWorld(true);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    corners.forEach(([cx, cz], i) => {
      v.set(cx, 0.02, cz).applyMatrix4(inst.matrixWorld).project(camera);
      const sx = (v.x * 0.5 + 0.5) * w, sy = (-v.y * 0.5 + 0.5) * h;
      frame.quad[i] = [sx, sy]; x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
    });
    frame.rect = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    v.set(0, 0.02, 0).applyMatrix4(inst.matrixWorld).project(camera);
    frame.center = { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h };
    onFrame(frame);
  };

  let raf = 0, running = false, last = performance.now();
  const renderOnce = () => { update(0.016); renderer.render(scene, camera); };
  const loop = (now: number) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; update(dt); renderer.render(scene, camera); raf = requestAnimationFrame(loop); };
  resize();

  return {
    setState: (s) => { state = s; if (!running) renderOnce(); },
    setEnter: (q) => { enter = q; if (!running) renderOnce(); },
    setFocus: (on) => { focusOn = on; if (!running) renderOnce(); },
    setImage: (url, onResult) => {
      if (!url) {
        hasPhoto = false;
        if (!running) renderOnce();
        return;
      }
      new THREE.TextureLoader().load(url, (t) => {
        photoTex?.dispose();
        photoTex = t; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
        const img = t.image as HTMLImageElement;
        aspect = img.width / Math.max(1, img.height);
        const maxW = PW * 0.86, maxD = PD * 0.86;
        if (aspect > maxW / maxD) { fit.w = maxW; fit.d = maxW / aspect; } else { fit.d = maxD; fit.w = maxD * aspect; }
        photo.scale.set(fit.w, fit.d, 1);
        photoMat.map = t; photoMat.needsUpdate = true;
        hasPhoto = true;
        onResult?.(true, img.width, img.height);
        if (!running) renderOnce();
      }, undefined, () => { hasPhoto = false; onResult?.(false); });
    },
    setActive: (on) => {
      if (on && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(loop); }
      else if (!on && running) { running = false; cancelAnimationFrame(raf); }
    },
    dispose: () => {
      running = false; cancelAnimationFrame(raf); ro.disconnect();
      container.removeEventListener("pointermove", onPointer);
      photoTex?.dispose();
      disposables.forEach((d) => { try { d.dispose(); } catch { /* gone */ } });
      renderer.dispose(); renderer.forceContextLoss();
    },
  };
}

export function webglOK() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; }
}
