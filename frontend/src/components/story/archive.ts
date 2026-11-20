/**
 * Chapter V — "The Lost Object Archive".
 * A walnut cabinet wall of catalogued drawers; one large drawer slides open toward the viewer,
 * revealing belongings resting in felt-lined compartments with paper index cards.
 * Built procedurally (wood grain, felt, brushed brass, paper labels are generated textures).
 * Everything lives in `group`, which is hidden outside chapter V.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

type Track = <T extends { dispose: () => void }>(x: T) => T;

export const ARCHIVE_SLOTS: { name: string; code: string; label: string; col: number; row: number }[] = [
  { name: "headphones", code: "A-01", label: "Headphones", col: 0, row: 0 },
  { name: "camera", code: "A-02", label: "Camera · tagged", col: 1, row: 0 },
  { name: "phone", code: "A-03", label: "Smartphone", col: 2, row: 0 },
  { name: "notebook", code: "A-04", label: "Notebook", col: 3, row: 0 },
  { name: "wallet", code: "A-05", label: "Wallet", col: 0, row: 1 },
  { name: "keys", code: "A-06", label: "Keys", col: 1, row: 1 },
  { name: "watch", code: "A-07", label: "Watch", col: 2, row: 1 },
  { name: "sunglasses", code: "A-08", label: "Sunglasses", col: 3, row: 1 },
];

function canvasTex(track: Track, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d")!);
  const t = track(new THREE.CanvasTexture(c));
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function woodTexture(track: Track) {
  return canvasTex(track, 512, 512, (g) => {
    g.fillStyle = "#5b3a24"; g.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y++) {
      const wave = Math.sin(y * 0.045) * 6 + Math.sin(y * 0.013) * 14;
      for (let x = 0; x < 512; x += 2) {
        const v = Math.sin((x + wave + Math.sin(x * 0.02) * 8) * 0.09) * 0.5 + 0.5;
        const n = Math.random() * 0.08;
        const k = 0.78 + v * 0.22 - n;
        g.fillStyle = `rgba(${Math.round(92 * k)}, ${Math.round(58 * k)}, ${Math.round(36 * k)}, 0.55)`;
        g.fillRect(x, y, 2, 1);
      }
    }
  });
}

function paperLabel(track: Track, lines: [string, string, string?], w = 512, h = 192) {
  return canvasTex(track, w, h, (g) => {
    g.fillStyle = "#ebe1cd"; g.fillRect(0, 0, w, h);
    // fibres
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(120,95,60,${Math.random() * 0.06})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 1); }
    g.strokeStyle = "rgba(60,40,25,.35)"; g.lineWidth = 2; g.strokeRect(10, 10, w - 20, h - 20);
    g.fillStyle = "#b41f44"; g.font = `600 ${Math.round(h * 0.16)}px Menlo, monospace`; g.textBaseline = "top";
    g.fillText(lines[0], 26, 24);
    g.fillStyle = "#1c1612"; g.font = `500 ${Math.round(h * 0.3)}px Georgia, 'Times New Roman', serif`;
    g.fillText(lines[1], 26, h * 0.36);
    if (lines[2]) { g.fillStyle = "rgba(28,22,18,.6)"; g.font = `${Math.round(h * 0.12)}px Menlo, monospace`; g.fillText(lines[2], 26, h * 0.76); }
  });
}

export function buildArchive(track: Track, compact: boolean) {
  const group = new THREE.Group();
  group.visible = false;

  const wood = woodTexture(track);
  wood.wrapS = wood.wrapT = THREE.RepeatWrapping;
  const M = {
    walnut: track(new THREE.MeshPhysicalMaterial({ map: wood, color: 0x9c7f6a, roughness: 0.5, clearcoat: 0.5, clearcoatRoughness: 0.35 })),
    walnutDark: track(new THREE.MeshPhysicalMaterial({ map: wood, color: 0x5e4c40, roughness: 0.6, clearcoat: 0.3 })),
    felt: track(new THREE.MeshPhysicalMaterial({ color: 0x3a0d18, roughness: 1, sheen: 0.45, sheenColor: new THREE.Color(0x9c4a5c), sheenRoughness: 0.8 })),
    brass: track(new THREE.MeshPhysicalMaterial({ color: 0xc09a5b, metalness: 1, roughness: 0.34 })),
    floor: track(new THREE.MeshStandardMaterial({ color: 0x1f1714, roughness: 0.85 })),
  };

  // ------------------------------------------------------------- cabinet wall of small drawers
  const WALL_Z = -4;
  const cols = compact ? 3 : 5, rows = 3;
  const dw = compact ? 2.5 : 2.9, dh = 1.25, gap = 0.12;
  const wallW = cols * dw + (cols + 1) * gap;
  const bigH = 1.35;
  const wallH = rows * dh + (rows + 1) * gap + bigH + gap * 2;
  const wallBase = -1.45;
  const carcass = new THREE.Mesh(track(new THREE.BoxGeometry(wallW + 0.3, wallH + 0.3, 5)), M.walnutDark);
  carcass.position.set(0, wallBase + wallH / 2, WALL_Z - 2.5);
  carcass.receiveShadow = true;
  group.add(carcass);
  const handleGeo = track(new RoundedBoxGeometry(0.7, 0.07, 0.07, 3, 0.03));
  const postGeo = track(new THREE.CylinderGeometry(0.025, 0.025, 0.12, 10));
  const holderGeo = track(new RoundedBoxGeometry(0.86, 0.34, 0.03, 2, 0.02));
  const labelGeo = track(new THREE.PlaneGeometry(0.76, 0.26));
  const frontGeo = track(new RoundedBoxGeometry(dw, dh, 0.12, 3, 0.03));
  let n = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = -wallW / 2 + gap + dw / 2 + c * (dw + gap);
      const y = wallBase + bigH + gap * 2 + gap + dh / 2 + r * (dh + gap);
      const front = new THREE.Mesh(frontGeo, M.walnut);
      front.position.set(x, y, WALL_Z + 0.06);
      front.castShadow = front.receiveShadow = true;
      group.add(front);
      const holder = new THREE.Mesh(holderGeo, M.brass);
      holder.position.set(x, y + 0.24, WALL_Z + 0.135);
      group.add(holder);
      const code = `B2U · ${String(rows - r).padStart(2, "0")}-${String(c + 1).padStart(2, "0")}`;
      const lm = track(new THREE.MeshStandardMaterial({ map: paperLabel(track, [code, ["Umbrellas", "Bottles", "Cards", "Chargers", "Scarves", "Books", "Laptops", "Bags", "Jewellery", "Tech", "Gloves", "Mugs", "Pens", "Hats", "Misc."][n % 15]], 256, 96), roughness: 0.9 }));
      const label = new THREE.Mesh(labelGeo, lm);
      label.position.set(x, y + 0.24, WALL_Z + 0.152);
      group.add(label);
      const handle = new THREE.Mesh(handleGeo, M.brass);
      handle.position.set(x, y - 0.22, WALL_Z + 0.24);
      group.add(handle);
      [-0.28, 0.28].forEach((dx) => { const p = new THREE.Mesh(postGeo, M.brass); p.rotation.x = Math.PI / 2; p.position.set(x + dx, y - 0.22, WALL_Z + 0.17); group.add(p); });
      n++;
    }
  }
  // floor
  const floor = new THREE.Mesh(track(new THREE.PlaneGeometry(60, 40)), M.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = wallBase - 0.02;
  floor.receiveShadow = true;
  group.add(floor);

  // ------------------------------------------------------------- the big drawer (slides along +z)
  const IW = compact ? 5.6 : 7.4, ID = 4.2, IH = 0.95, T = 0.12;
  const drawer = new THREE.Group();
  const drawerY = wallBase + 0.1;
  const add = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(g, m); mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; drawer.add(mesh); return mesh;
  };
  add(track(new THREE.BoxGeometry(IW + 2 * T, T, ID + 2 * T)), M.walnut, 0, -T / 2, 0); // base
  add(track(new THREE.BoxGeometry(IW, 0.04, ID)), M.felt, 0, 0.02, 0);               // felt
  add(track(new THREE.BoxGeometry(T, IH, ID + 2 * T)), M.walnut, -IW / 2 - T / 2, IH / 2, 0);
  add(track(new THREE.BoxGeometry(T, IH, ID + 2 * T)), M.walnut, IW / 2 + T / 2, IH / 2, 0);
  add(track(new THREE.BoxGeometry(IW, IH, T)), M.walnut, 0, IH / 2, -ID / 2 - T / 2);
  // front panel, taller than the box, with label holder and a long brass pull
  const frontPanel = add(track(new RoundedBoxGeometry(IW + 0.5, bigH, 0.18, 4, 0.04)), M.walnut, 0, bigH / 2 - 0.15, ID / 2 + 0.09);
  add(track(new RoundedBoxGeometry(2.4, 0.5, 0.04, 2, 0.02)), M.brass, -IW / 4, bigH * 0.62 - 0.15, ID / 2 + 0.2);
  const frontLabel = new THREE.Mesh(track(new THREE.PlaneGeometry(2.2, 0.4)), track(new THREE.MeshStandardMaterial({ map: paperLabel(track, ["DRAWER 05 · LOST & FOUND", "Objects A-01 — A-08", "CATALOGUED · AWAITING OWNERS"], 768, 140), roughness: 0.9 })));
  frontLabel.position.set(-IW / 4, bigH * 0.62 - 0.15, ID / 2 + 0.225);
  drawer.add(frontLabel);
  add(track(new RoundedBoxGeometry(1.8, 0.1, 0.1, 3, 0.045)), M.brass, IW / 4 + 0.6, bigH * 0.5 - 0.15, ID / 2 + 0.38);
  [-0.75, 0.75].forEach((dx) => { const p = add(postGeo, M.brass, IW / 4 + 0.6 + dx, bigH * 0.5 - 0.15, ID / 2 + 0.26); p.rotation.x = Math.PI / 2; });
  void frontPanel;
  // dividers: 4 × 2 compartments (3 × 2 + spill on compact)
  const COLS = compact ? 3 : 4;
  const cw = IW / COLS, cd = ID / 2;
  const divGeoX = track(new THREE.BoxGeometry(0.05, IH * 0.62, ID));
  const divGeoZ = track(new THREE.BoxGeometry(IW, IH * 0.62, 0.05));
  for (let c = 1; c < COLS; c++) add(divGeoX, M.walnut, -IW / 2 + c * cw, IH * 0.31, 0);
  add(divGeoZ, M.walnut, 0, IH * 0.31, 0);
  // index cards in each compartment
  // phones: a 3 × 2 drawer with six belongings
  const COMPACT = ["headphones", "camera", "phone", "wallet", "watch", "sunglasses"];
  const slots = compact
    ? COMPACT.map((name, i) => ({ ...ARCHIVE_SLOTS.find((s) => s.name === name)!, col: i % 3, row: Math.floor(i / 3) }))
    : ARCHIVE_SLOTS;
  const slotLocal = new Map<string, THREE.Vector3>();
  const cardGeo = track(new THREE.PlaneGeometry(cw * 0.56, 0.3));
  slots.forEach((s) => {
    const x = -IW / 2 + cw * (s.col + 0.5);
    const z = -ID / 2 + cd * (s.row + 0.5);
    slotLocal.set(s.name, new THREE.Vector3(x, 0.04, z - 0.12));
    const card = new THREE.Mesh(cardGeo, track(new THREE.MeshStandardMaterial({ map: paperLabel(track, [s.code, s.label], 384, 144), roughness: 0.85 })));
    card.rotation.x = -Math.PI / 2;
    card.position.set(x - cw * 0.12, 0.046, z + cd * 0.5 - 0.24);
    card.rotation.z = (Math.random() - 0.5) * 0.08;
    card.receiveShadow = true;
    drawer.add(card);
  });
  group.add(drawer);
  const CLOSED_Z = WALL_Z - ID / 2 - 0.18;
  const OPEN_Z = WALL_Z + (compact ? 2.2 : 2.5);
  drawer.position.set(0, drawerY, CLOSED_Z);

  // ------------------------------------------------------------- a notebook (archive-only belonging)
  const notebook = new THREE.Group();
  const cover = track(new THREE.MeshPhysicalMaterial({ color: 0x3d4a2f, roughness: 0.7, sheen: 0.5, sheenColor: new THREE.Color(0x9fb07a) }));
  const pages = track(new THREE.MeshStandardMaterial({ color: 0xece2cc, roughness: 0.95 }));
  const body = new THREE.Mesh(track(new RoundedBoxGeometry(0.9, 0.16, 1.25, 3, 0.03)), cover);
  const pg = new THREE.Mesh(track(new THREE.BoxGeometry(0.86, 0.12, 1.2)), pages);
  pg.position.x = 0.03;
  const band = new THREE.Mesh(track(new THREE.BoxGeometry(0.04, 0.17, 1.27)), track(new THREE.MeshStandardMaterial({ color: 0x1a1512, roughness: 0.6 })));
  band.position.x = 0.32;
  const ribbon = new THREE.Mesh(track(new THREE.BoxGeometry(0.05, 0.005, 0.5)), track(new THREE.MeshStandardMaterial({ color: 0xc8264d, roughness: 0.7 })));
  ribbon.position.set(-0.1, -0.06, 0.82);
  notebook.add(body, pg, band, ribbon);
  notebook.traverse((o) => { o.castShadow = true; });
  group.add(notebook);

  // ------------------------------------------------------------- lighting: an archive lamp + an inspection lamp
  const lamp = new THREE.SpotLight(0xffe2bf, 0, 30, 0.62, 0.75, 1.4);
  lamp.position.set(1.5, 9.5, WALL_Z + 4.5);
  lamp.target.position.set(0, wallBase, WALL_Z + 2.5);
  lamp.castShadow = !compact;
  lamp.shadow.mapSize.set(1024, 1024);
  lamp.shadow.bias = -0.0004;
  lamp.shadow.radius = 6;
  group.add(lamp, lamp.target);
  const inspect = new THREE.SpotLight(0xfff1dd, 0, 12, 0.22, 0.6, 1.2);
  inspect.position.set(2.5, 6, WALL_Z + 6);
  group.add(inspect, inspect.target);
  const glow = new THREE.PointLight(0xd92d55, 0, 6, 1.5); // muted pink bounce from the felt
  glow.position.set(0, wallBase + 1.2, WALL_Z + 3);
  group.add(glow);

  const tmp = new THREE.Vector3();
  return {
    group,
    drawer,
    notebook,
    slots,
    slotNames: slots.map((s) => s.name),
    slotInfo: (name: string) => slots.find((s) => s.name === name),
    /** world position of a compartment's centre on the felt */
    slotWorld: (name: string, out: THREE.Vector3) => {
      const l = slotLocal.get(name);
      if (!l) return null;
      drawer.updateWorldMatrix(true, false);
      return out.copy(l).applyMatrix4(drawer.matrixWorld);
    },
    feltY: () => drawer.position.y + group.position.y + 0.04,
    /** open ∈ [0,1] slides the drawer; light ∈ [0,1] brings up the lamps */
    update: (open: number, light: number, focusWorld: THREE.Vector3 | null, time: number) => {
      drawer.position.z = CLOSED_Z + (OPEN_Z - CLOSED_Z) * open;
      lamp.intensity = 150 * light;
      glow.intensity = 1.2 * light * open;
      if (focusWorld) {
        tmp.copy(focusWorld);
        inspect.target.position.copy(group.worldToLocal(tmp));
        inspect.position.set(inspect.target.position.x + 1.6, inspect.target.position.y + 5.2, inspect.target.position.z + 3.2);
        inspect.intensity += (55 - inspect.intensity) * 0.12;
      } else inspect.intensity *= 0.85;
      void time;
    },
  };
}

export type Archive = ReturnType<typeof buildArchive>;
