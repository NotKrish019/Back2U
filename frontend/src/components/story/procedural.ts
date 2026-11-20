/**
 * Procedurally modelled belongings for the objects no CC0/CC-BY asset covered
 * (smartphone, wallet, keys, headphones). PBR materials + generated textures so they
 * sit in the same lighting world as the scanned glTF models.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

type Track = <T extends { dispose: () => void }>(x: T) => T;

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d")!] as const;
}

/** Height-noise → tangent-space normal map. Gives leather / plastic a physical grain. */
function grainNormal(track: Track, size = 256, scale = 1.6, cells = 46) {
  const [c, g] = canvas(size, size);
  const h = new Float32Array(size * size);
  // pebbled leather: sum of soft random cells
  for (let i = 0; i < size * size; i++) h[i] = Math.random() * 0.25;
  for (let n = 0; n < cells * cells; n++) {
    const cx = Math.random() * size, cy = Math.random() * size, r = (size / cells) * (0.7 + Math.random() * 0.6);
    for (let y = Math.floor(cy - r); y < cy + r; y++) for (let x = Math.floor(cx - r); x < cx + r; x++) {
      const d = Math.hypot(x - cx, y - cy) / r;
      if (d < 1) h[((y + size) % size) * size + ((x + size) % size)] += (1 - d * d) * 0.8;
    }
  }
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const at = (xx: number, yy: number) => h[((yy + size) % size) * size + ((xx + size) % size)];
    const dx = (at(x + 1, y) - at(x - 1, y)) * scale;
    const dy = (at(x, y + 1) - at(x, y - 1)) * scale;
    const len = Math.hypot(dx, dy, 1);
    const i = (y * size + x) * 4;
    img.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
    img.data[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
    img.data[i + 2] = (1 / len) * 255;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = track(new THREE.CanvasTexture(c));
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Transparent stitch decal: a dashed inset rectangle. */
function stitchTexture(track: Track, w = 512, h = 384, inset = 18) {
  const [c, g] = canvas(w, h);
  g.strokeStyle = "rgba(240, 220, 190, 0.95)";
  g.lineWidth = 3.2;
  g.setLineDash([11, 8]);
  g.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
  const t = track(new THREE.CanvasTexture(c));
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** A lock screen for the phone — Back2U palette, no third-party UI. */
function screenTexture(track: Track) {
  const [c, g] = canvas(400, 840);
  const grad = g.createLinearGradient(0, 0, 400, 840);
  grad.addColorStop(0, "#2a2140");
  grad.addColorStop(0.55, "#141210");
  grad.addColorStop(1, "#3b1424");
  g.fillStyle = grad;
  g.fillRect(0, 0, 400, 840);
  // soft signal glow
  const rg = g.createRadialGradient(300, 640, 10, 300, 640, 320);
  rg.addColorStop(0, "rgba(217,45,85,0.55)");
  rg.addColorStop(1, "rgba(217,45,85,0)");
  g.fillStyle = rg;
  g.fillRect(0, 0, 400, 840);
  g.fillStyle = "rgba(251,249,244,0.92)";
  g.font = "300 118px Helvetica, Arial, sans-serif";
  g.textAlign = "center";
  g.fillText("10:24", 200, 250);
  g.font = "500 26px Helvetica, Arial, sans-serif";
  g.fillStyle = "rgba(251,249,244,0.6)";
  g.fillText("Thursday 20 November", 200, 120);
  // notification card
  g.fillStyle = "rgba(251,249,244,0.14)";
  g.beginPath(); g.roundRect(30, 560, 340, 110, 26); g.fill();
  g.fillStyle = "#d92d55";
  g.beginPath(); g.roundRect(52, 586, 58, 58, 14); g.fill();
  g.fillStyle = "#fff"; g.font = "700 32px Helvetica, Arial"; g.fillText("2", 81, 627);
  g.textAlign = "left";
  g.fillStyle = "rgba(251,249,244,0.95)"; g.font = "600 22px Helvetica, Arial"; g.fillText("Back2U", 128, 604);
  g.fillStyle = "rgba(251,249,244,0.7)"; g.font = "400 20px Helvetica, Arial"; g.fillText("Possible match near Library", 128, 636);
  g.fillStyle = "rgba(251,249,244,0.5)";
  g.beginPath(); g.roundRect(150, 800, 100, 7, 4); g.fill();
  const t = track(new THREE.CanvasTexture(c));
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function buildProcedural(track: Track) {
  const geo = <T extends THREE.BufferGeometry>(g: T) => track(g);
  const leatherN = grainNormal(track, 256, 1.2, 70);
  leatherN.repeat.set(3, 3);
  const fineN = grainNormal(track, 128, 0.6, 30);

  const M = {
    titanium: track(new THREE.MeshPhysicalMaterial({ color: 0x8d8a84, metalness: 1, roughness: 0.32 })),
    backGlass: track(new THREE.MeshPhysicalMaterial({ color: 0x2b2a2e, roughness: 0.42, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.35 })),
    lensGlass: track(new THREE.MeshPhysicalMaterial({ color: 0x07070a, roughness: 0.05, metalness: 0.5, clearcoat: 1, clearcoatRoughness: 0.02, iridescence: 0.6, iridescenceIOR: 1.6 })),
    lensRing: track(new THREE.MeshPhysicalMaterial({ color: 0x9b9890, metalness: 1, roughness: 0.18 })),
    screen: track(new THREE.MeshPhysicalMaterial({ map: screenTexture(track), emissive: 0xffffff, emissiveMap: null, emissiveIntensity: 0, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02 })),
    cognac: track(new THREE.MeshPhysicalMaterial({ color: 0x7a3d22, roughness: 0.58, normalMap: leatherN, normalScale: new THREE.Vector2(0.18, 0.18), sheen: 0.7, sheenColor: new THREE.Color(0xc98a62), sheenRoughness: 0.5 })),
    cognacDark: track(new THREE.MeshPhysicalMaterial({ color: 0x5b2c18, roughness: 0.66, normalMap: leatherN, normalScale: new THREE.Vector2(0.15, 0.15) })),
    stitch: track(new THREE.MeshBasicMaterial({ map: stitchTexture(track), transparent: true, depthWrite: false })),
    card: track(new THREE.MeshPhysicalMaterial({ color: 0xece6da, roughness: 0.35, clearcoat: 0.6 })),
    signal: track(new THREE.MeshPhysicalMaterial({ color: 0xd92d55, roughness: 0.4, clearcoat: 0.5 })),
    brass: track(new THREE.MeshPhysicalMaterial({ color: 0xc3a160, metalness: 1, roughness: 0.28 })),
    steel: track(new THREE.MeshPhysicalMaterial({ color: 0xd2d0cb, metalness: 1, roughness: 0.2 })),
    sand: track(new THREE.MeshPhysicalMaterial({ color: 0xd9d0c1, roughness: 0.55, normalMap: fineN, normalScale: new THREE.Vector2(0.15, 0.15), sheen: 0.3 })),
    padLeather: track(new THREE.MeshPhysicalMaterial({ color: 0x1d1b19, roughness: 0.55, normalMap: leatherN, normalScale: new THREE.Vector2(0.35, 0.35), sheen: 0.5, sheenColor: new THREE.Color(0x6b6560) })),
    fob: track(new THREE.MeshPhysicalMaterial({ color: 0xd92d55, roughness: 0.6, normalMap: leatherN, normalScale: new THREE.Vector2(0.4, 0.4), sheen: 0.6, sheenColor: new THREE.Color(0xffb3c4) })),
  };
  (M.screen as THREE.MeshPhysicalMaterial).emissiveMap = (M.screen as THREE.MeshPhysicalMaterial).map;
  (M.screen as THREE.MeshPhysicalMaterial).emissiveIntensity = 0.55;

  const mesh = (g: THREE.BufferGeometry, m: THREE.Material) => new THREE.Mesh(g, m);

  // ---------------------------------------------------------------- smartphone
  function phone() {
    const g = new THREE.Group();
    const W = 0.78, H = 1.62, D = 0.085;
    g.add(mesh(geo(new RoundedBoxGeometry(W, H, D, 8, 0.11)), M.titanium));
    const back = mesh(geo(new RoundedBoxGeometry(W - 0.03, H - 0.03, 0.012, 6, 0.1)), M.backGlass);
    back.position.z = -D / 2 - 0.001;
    g.add(back);
    const front = mesh(geo(new THREE.PlaneGeometry(W - 0.05, H - 0.05)), M.screen);
    front.position.z = D / 2 + 0.002;
    g.add(front);
    // camera plateau + lenses on the back
    const plateau = mesh(geo(new RoundedBoxGeometry(0.36, 0.36, 0.03, 6, 0.08)), M.backGlass);
    plateau.position.set(-0.16, 0.56, -D / 2 - 0.015);
    g.add(plateau);
    const ringG = geo(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 40));
    const lensG = geo(new THREE.CylinderGeometry(0.058, 0.058, 0.032, 40));
    [[-0.24, 0.64], [-0.24, 0.48], [-0.08, 0.56]].forEach(([x, y]) => {
      const r = mesh(ringG, M.lensRing); r.rotation.x = Math.PI / 2; r.position.set(x, y, -D / 2 - 0.035); g.add(r);
      const l = mesh(lensG, M.lensGlass); l.rotation.x = Math.PI / 2; l.position.set(x, y, -D / 2 - 0.037); g.add(l);
    });
    // side buttons
    const btn = geo(new RoundedBoxGeometry(0.02, 0.18, 0.03, 2, 0.008));
    const b1 = mesh(btn, M.titanium); b1.position.set(W / 2 + 0.006, 0.3, 0); g.add(b1);
    const b2 = mesh(btn, M.titanium); b2.position.set(-W / 2 - 0.006, 0.4, 0); g.add(b2);
    return g;
  }

  // ---------------------------------------------------------------- wallet
  function wallet() {
    const g = new THREE.Group();
    const W = 1.3, H = 0.96;
    const half = geo(new RoundedBoxGeometry(W, H, 0.07, 6, 0.035));
    const a = mesh(half, M.cognac); a.position.z = 0.04; g.add(a);
    const b = mesh(half, M.cognacDark); b.position.z = -0.04; g.add(b);
    // fold spine
    const spine = mesh(geo(new THREE.CylinderGeometry(0.075, 0.075, H - 0.02, 24, 1, false, Math.PI / 2, Math.PI)), M.cognac);
    spine.position.x = -W / 2 + 0.01;
    g.add(spine);
    const st = geo(new THREE.PlaneGeometry(W - 0.02, H - 0.02));
    const s1 = mesh(st, M.stitch); s1.position.z = 0.0765; g.add(s1);
    const s2 = mesh(st, M.stitch); s2.position.z = -0.0765; s2.rotation.y = Math.PI; g.add(s2);
    // cards peeking out between the halves
    const cardG = geo(new RoundedBoxGeometry(0.86, 0.54, 0.008, 2, 0.03));
    const c1 = mesh(cardG, M.card); c1.position.set(0.08, 0.3, 0); c1.rotation.z = 0.04; g.add(c1);
    const c2 = mesh(cardG, M.signal); c2.position.set(0.16, 0.24, -0.012); c2.rotation.z = -0.03; g.add(c2);
    return g;
  }

  // ---------------------------------------------------------------- keys
  function keyShapes() {
    const bow = new THREE.Shape();
    bow.absellipse(0, 0, 0.24, 0.2, 0, Math.PI * 2, false, 0);
    const hole = new THREE.Path();
    hole.absarc(0, 0.07, 0.055, 0, Math.PI * 2, true);
    bow.holes.push(hole);
    const blade = new THREE.Shape();
    const pts: [number, number][] = [[-0.06, -0.16], [0.06, -0.16], [0.06, -0.5], [0.12, -0.53], [0.06, -0.58], [0.12, -0.63], [0.07, -0.68], [0.12, -0.74], [0.06, -0.79], [0.06, -0.96], [-0.01, -1.0], [-0.06, -0.96]];
    blade.moveTo(pts[0][0], pts[0][1]);
    pts.slice(1).forEach(([x, y]) => blade.lineTo(x, y));
    blade.lineTo(-0.06, -0.16);
    return [bow, blade];
  }
  function keys() {
    const g = new THREE.Group();
    const ring = mesh(geo(new THREE.TorusGeometry(0.3, 0.022, 20, 80)), M.steel);
    ring.rotation.y = 0.9;
    g.add(ring);
    const kg = geo(new THREE.ExtrudeGeometry(keyShapes(), { depth: 0.035, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 3, curveSegments: 32 }));
    kg.translate(0, -0.07, -0.0175);
    const k1 = mesh(kg, M.brass); k1.position.set(-0.02, -0.28, 0.02); k1.rotation.z = 0.25; g.add(k1);
    const k2 = mesh(kg, M.steel); k2.position.set(0.12, -0.26, -0.05); k2.rotation.z = -0.35; k2.rotation.y = 0.3; g.add(k2);
    // leather fob with metal clip
    const fob = mesh(geo(new RoundedBoxGeometry(0.26, 0.62, 0.05, 4, 0.05)), M.fob);
    fob.position.set(-0.36, -0.52, 0.06); fob.rotation.z = 0.55; g.add(fob);
    const clip = mesh(geo(new THREE.TorusGeometry(0.06, 0.016, 12, 32)), M.steel);
    clip.position.set(-0.2, -0.2, 0.06); clip.rotation.z = 0.5; g.add(clip);
    g.position.y = 0.35;
    return g;
  }

  // ---------------------------------------------------------------- headphones
  function headphones() {
    const g = new THREE.Group();
    const arc = new THREE.CatmullRomCurve3(
      Array.from({ length: 21 }, (_, i) => {
        const t = (i / 20) * Math.PI;
        return new THREE.Vector3(Math.cos(t) * 0.74, Math.sin(t) * 0.82, 0);
      })
    );
    g.add(mesh(geo(new THREE.TubeGeometry(arc, 80, 0.045, 16, false)), M.sand));
    const padArc = new THREE.CatmullRomCurve3(
      Array.from({ length: 15 }, (_, i) => {
        const t = Math.PI * 0.22 + (i / 14) * Math.PI * 0.56;
        return new THREE.Vector3(Math.cos(t) * 0.7, Math.sin(t) * 0.775, 0);
      })
    );
    const pad = mesh(geo(new THREE.TubeGeometry(padArc, 48, 0.052, 14, false)), M.padLeather);
    pad.scale.z = 1.5;
    g.add(pad);
    // cup: lathe profile (rounded puck)
    const prof: THREE.Vector2[] = [];
    for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI / 2; prof.push(new THREE.Vector2(0.27 + Math.sin(a) * 0.06, -Math.cos(a) * 0.06 - 0.04)); }
    for (let i = 0; i <= 12; i++) { const a = Math.PI / 2 + (i / 12) * Math.PI / 2; prof.push(new THREE.Vector2(0.27 + Math.sin(a) * 0.06, -Math.cos(a) * 0.06 + 0.04)); }
    prof.unshift(new THREE.Vector2(0, -0.1));
    prof.push(new THREE.Vector2(0, 0.1));
    const cupG = geo(new THREE.LatheGeometry(prof, 64));
    const cushG = geo(new THREE.TorusGeometry(0.24, 0.075, 24, 64));
    const sliderG = geo(new THREE.CylinderGeometry(0.018, 0.018, 0.34, 16));
    const yokeCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.36, 0.18), new THREE.Vector3(0, 0.38, 0), new THREE.Vector3(0, 0.36, -0.18)]);
    const yokeG = geo(new THREE.TubeGeometry(yokeCurve, 20, 0.018, 10, false));
    for (const side of [-1, 1]) {
      const cup = mesh(cupG, M.sand);
      cup.rotation.z = Math.PI / 2;
      cup.position.set(side * 0.8, -0.32, 0);
      g.add(cup);
      const cush = mesh(cushG, M.padLeather);
      cush.rotation.y = Math.PI / 2;
      cush.position.set(side * 0.68, -0.32, 0);
      g.add(cush);
      const sl = mesh(sliderG, M.steel);
      sl.position.set(side * 0.77, 0.02, 0);
      g.add(sl);
      const yoke = mesh(yokeG, M.steel);
      yoke.position.set(side * 0.8, -0.65, 0);
      g.add(yoke);
      const logo = mesh(geo(new THREE.CircleGeometry(0.07, 32)), M.brass);
      logo.rotation.y = side * Math.PI / 2;
      logo.position.set(side * 0.905, -0.32, 0);
      g.add(logo);
    }
    g.position.y = 0.15;
    return g;
  }

  return { phone, wallet, keys, headphones, materials: M };
}
