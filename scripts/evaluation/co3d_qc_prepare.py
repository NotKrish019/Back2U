"""Prepare the CO3D pilot human-QC workflow (Phase 2C). Writes NO decisions.

Outputs (all under reports/evaluation/co3d_pilot/, git-ignored where they contain CO3D imagery):
  contact_sheets/seq__<cat>__<seq>.jpg   one sheet per sequence that must be reviewed
  contact_sheets/group__<cat>__<prefix>.jpg  side-by-side overview of a high-risk prefix group
  qc_review/review_items.json            the exact list of required decisions
  qc_review/index.html                   LOCAL review page (open in a browser; exports JSON)
  human_qc_results.json                  created only if absent: PENDING template, every decision null

The HTML page must never be published or uploaded: it displays CC BY-NC 4.0 CO3D imagery.

    python scripts/evaluation/co3d_qc_prepare.py
"""
import json
import sys
from collections import defaultdict
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "evaluation"))
from co3d_pilot_contact_sheets import sheet, tile, TILE  # noqa: E402

MANIFEST = ROOT / "data/processed/co3d_phase2_pilot_manifest.jsonl"
QC = ROOT / "reports/evaluation/co3d_pilot"
SHEETS = QC / "contact_sheets"
REVIEW = QC / "qc_review"
RESULTS = QC / "human_qc_results.json"

SEQ_FLAGS = ["wrong_category", "different_object_within_sequence", "incorrect_bounding_box",
             "poor_viewpoint_diversity", "severe_blur"]
SEQ_DECISIONS = ["APPROVE", "REJECT", "UNCERTAIN"]
PAIR_DECISIONS = ["same_physical_unit", "same_model_different_unit", "different_physical_units", "uncertain_identity"]
HIGH_RISK_GROUPS = [("book", "209"), ("laptop", "372"), ("laptop", "373"), ("laptop", "374"),
                    ("laptop", "378"), ("laptop", "391")]


def group_sheet(cat, prefix, seqs, by_seq, path):
    rows = []
    for s in seqs:
        rs = sorted(by_seq[s], key=lambda r: r["source_frame_id"])
        pick = [rs[0], rs[len(rs) // 2], rs[-1]]
        tiles = []
        for r in pick:
            img = Image.open(ROOT / r["image_path"]).convert("RGB")
            tiles.append(tile(img.crop(tuple(r["ground_truth_bbox"])), f"{s} f{r['source_frame_id']}"))
        tiles.insert(0, tile(Image.open(ROOT / pick[0]["image_path"]).convert("RGB"), f"{s} full"))
        rows.append(tiles)
    W = 4 * (TILE + 6) + 6
    H = 34 + len(rows) * (TILE + 22)
    canvas = Image.new("RGB", (W, H), (235, 235, 235))
    ImageDraw.Draw(canvas).text((8, 8), f"GROUP {cat} prefix {prefix}_* — {len(seqs)} sequences: are any two the SAME physical unit?", fill="black")
    for i, row in enumerate(rows):
        for j, t in enumerate(row):
            canvas.paste(t, (6 + j * (TILE + 6), 34 + i * (TILE + 22)))
    canvas.save(path, quality=85)


def main():
    recs = [json.loads(l) for l in MANIFEST.read_text().splitlines() if l.strip()]
    by_seq = defaultdict(list)
    cat_of = {}
    for r in recs:
        by_seq[r["source_sequence_id"]].append(r)
        cat_of[r["source_sequence_id"]] = r["category"]
    idx = json.loads((SHEETS / "index.json").read_text())
    sample = [s["sequence"] for s in idx["sampled"]]
    pairs = [(p["a"].split(":", 1)[1], p["b"].split(":", 1)[1], p["max_view_cosine"]) for p in idx["cross_sequence_pairs"]]
    groups = {}
    for cat, prefix in HIGH_RISK_GROUPS:
        groups[f"{cat}:{prefix}"] = sorted(s for s in by_seq if cat_of[s] == cat and s.split("_")[0] == prefix)

    must_review = list(dict.fromkeys(sample + [s for p in pairs for s in p[:2]] + [s for g in groups.values() for s in g]))
    REVIEW.mkdir(parents=True, exist_ok=True)
    seq_items = []
    for s in must_review:
        p = SHEETS / f"seq__{cat_of[s]}__{s}.jpg"
        if not p.exists():
            sheet(sorted(by_seq[s], key=lambda r: r["source_frame_id"]),
                  f"{cat_of[s]} | co3d:{s} | {len(by_seq[s])} views | QC review", p)
        reasons = []
        if s in sample:
            reasons.append("5pct_sample")
        if any(s in p_[:2] for p_ in pairs):
            reasons.append("suspicious_pair_member")
        reasons += [f"high_risk_group:{g}" for g, ss in groups.items() if s in ss]
        seq_items.append({"sequence": s, "category": cat_of[s], "views": len(by_seq[s]),
                          "sheet": str(p.relative_to(QC)), "why_required": reasons})
    group_items = []
    for g, ss in groups.items():
        cat, prefix = g.split(":")
        p = SHEETS / f"group__{cat}__{prefix}.jpg"
        group_sheet(cat, prefix, ss, by_seq, p)
        group_items.append({"group": g, "sequences": ss, "sheet": str(p.relative_to(QC))})
    pair_items = [{"a": a, "b": b, "category": cat_of[a], "max_view_cosine": c,
                   "sheet": f"contact_sheets/pair__{a}__{b}.jpg"} for a, b, c in pairs]
    items = {"sequence_flags": SEQ_FLAGS, "sequence_decisions": SEQ_DECISIONS, "pair_decisions": PAIR_DECISIONS,
             "sequences": seq_items, "pairs": pair_items, "groups": group_items}
    (REVIEW / "review_items.json").write_text(json.dumps(items, indent=1))

    if not RESULTS.exists():
        RESULTS.write_text(json.dumps({
            "status": "PENDING",
            "note": "Fill via qc_review/index.html (export) or by hand. Every decision must be explicit; "
                    "nothing is approved by default. Apply with scripts/evaluation/co3d_apply_qc.py.",
            "reviewer": None, "review_date": None, "final_approval": False,
            "sequences": {s["sequence"]: {"decision": None, "flags": [], "notes": ""} for s in seq_items},
            "pairs": {f"{p['a']}|{p['b']}": {"decision": None, "notes": ""} for p in pair_items},
            "groups": {g["group"]: {"reviewed": False, "same_unit_sets": [], "notes": ""} for g in group_items},
        }, indent=1))

    html = HTML.replace("__ITEMS__", json.dumps(items))
    (REVIEW / "index.html").write_text(html)
    print(json.dumps({"sequences_to_review": len(seq_items), "pairs": len(pair_items), "groups": len(group_items),
                      "review_page": str((REVIEW / "index.html").relative_to(ROOT)),
                      "results_file": str(RESULTS.relative_to(ROOT))}, indent=1))


HTML = r"""<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CO3D Pilot QC</title>
<style>
:root{--bg:#f6f6f4;--fg:#1d1d1b;--card:#fff;--mute:#666;--line:#ddd;--ok:#1b7a3a;--bad:#b3261e;--warn:#9a6700}
@media (prefers-color-scheme:dark){:root{--bg:#161615;--fg:#eee;--card:#222;--mute:#aaa;--line:#333}}
body{background:var(--bg);color:var(--fg);font:15px/1.45 system-ui,sans-serif;margin:0;padding:16px;max-width:1100px;margin:auto}
h1{font-size:20px}h2{font-size:17px;margin-top:28px}
.card{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:12px;margin:12px 0}
img{max-width:100%;border:1px solid var(--line);border-radius:4px}
label{margin-right:14px;white-space:nowrap}.mute{color:var(--mute);font-size:13px}
.pending{border-left:4px solid var(--warn)}.done{border-left:4px solid var(--ok)}
textarea,input[type=text]{width:100%;box-sizing:border-box;background:var(--card);color:var(--fg);border:1px solid var(--line);border-radius:4px;padding:6px}
button{padding:8px 14px;border-radius:6px;border:1px solid var(--line);background:var(--card);color:var(--fg);cursor:pointer}
#bar{position:sticky;top:0;background:var(--bg);padding:8px 0;border-bottom:1px solid var(--line);z-index:2}
</style></head><body>
<h1>CO3D pilot — human QC</h1>
<p class="mute">LOCAL ONLY. Shows CC BY-NC 4.0 CO3D imagery — do not publish or upload this page. Nothing is approved by default: every item needs an explicit decision.</p>
<div id="bar"><b id="progress"></b> &nbsp; <button onclick="exportJSON()">Export human_qc_results.json</button>
<label><input type="file" accept=".json" onchange="importJSON(this)"> resume from JSON</label></div>
<div class="card"><label>Reviewer name <input type="text" id="reviewer"></label>
<label><input type="checkbox" id="final"> I have reviewed every item below and approve these decisions</label></div>
<h2>Sequences</h2><div id="seqs"></div><h2>Suspicious cross-sequence pairs</h2><div id="pairs"></div>
<h2>High-risk prefix groups</h2><div id="groups"></div>
<script>
const ITEMS=__ITEMS__;let S={sequences:{},pairs:{},groups:{}};
try{const d=JSON.parse(localStorage.getItem('co3dqc')||'null');if(d)S=d}catch(e){}
const save=()=>{try{localStorage.setItem('co3dqc',JSON.stringify(S))}catch(e){};progress()};
function radios(name,opts,cur,cb){return opts.map(o=>`<label><input type="radio" name="${name}" value="${o}" ${cur===o?'checked':''} onchange="${cb}(this)"> ${o}</label>`).join('')}
function render(){
 seqs.innerHTML=ITEMS.sequences.map(s=>{const v=S.sequences[s.sequence]||{decision:null,flags:[],notes:''};S.sequences[s.sequence]=v;
  return `<div class="card ${v.decision?'done':'pending'}" id="s_${s.sequence}"><b>${s.category} · co3d:${s.sequence}</b> <span class="mute">${s.views} views · ${s.why_required.join(', ')}</span><br>
  <a href="../${s.sheet}" target="_blank"><img loading="lazy" src="../${s.sheet}"></a><div>Flags: ${ITEMS.sequence_flags.map(f=>`<label><input type="checkbox" data-s="${s.sequence}" value="${f}" ${v.flags.includes(f)?'checked':''} onchange="flag(this)"> ${f}</label>`).join('')}</div>
  <div>Decision: ${radios('d_'+s.sequence,ITEMS.sequence_decisions,v.decision,'sdec')}</div><textarea data-s="${s.sequence}" placeholder="notes" onchange="snote(this)">${v.notes}</textarea></div>`}).join('');
 pairs.innerHTML=ITEMS.pairs.map(p=>{const k=p.a+'|'+p.b,v=S.pairs[k]||{decision:null,notes:''};S.pairs[k]=v;
  return `<div class="card ${v.decision?'done':'pending'}"><b>${p.category}: ${p.a} vs ${p.b}</b> <span class="mute">max view cosine ${p.max_view_cosine}</span><br>
  <a href="../${p.sheet}" target="_blank"><img loading="lazy" src="../${p.sheet}"></a><div>${radios('p_'+k,ITEMS.pair_decisions,v.decision,'pdec')}</div>
  <textarea data-k="${k}" placeholder="notes" onchange="pnote(this)">${v.notes}</textarea></div>`}).join('');
 groups.innerHTML=ITEMS.groups.map(g=>{const v=S.groups[g.group]||{reviewed:false,same_unit_sets:[],notes:''};S.groups[g.group]=v;
  return `<div class="card ${v.reviewed?'done':'pending'}"><b>${g.group}_*</b> <span class="mute">${g.sequences.length} sequences</span><br>
  <a href="../${g.sheet}" target="_blank"><img loading="lazy" src="../${g.sheet}"></a>
  <div class="mute">Same-unit sets: one set per line, sequence ids separated by spaces (leave empty if none). Use the pair section for single pairs.</div>
  <textarea data-g="${g.group}" onchange="gsets(this)">${v.same_unit_sets.map(x=>x.join(' ')).join('\n')}</textarea>
  <label><input type="checkbox" data-g="${g.group}" ${v.reviewed?'checked':''} onchange="grev(this)"> group reviewed</label>
  <textarea data-gn="${g.group}" placeholder="notes" onchange="gnote(this)">${v.notes}</textarea></div>`}).join('');
 reviewer.value=S.reviewer||'';final.checked=!!S.final_approval;save()}
function sdec(e){S.sequences[e.name.slice(2)].decision=e.value;render()}
function flag(e){const v=S.sequences[e.dataset.s];v.flags=e.checked?[...new Set([...v.flags,e.value])]:v.flags.filter(x=>x!==e.value);save()}
function snote(e){S.sequences[e.dataset.s].notes=e.value;save()}
function pdec(e){S.pairs[e.name.slice(2)].decision=e.value;render()}
function pnote(e){S.pairs[e.dataset.k].notes=e.value;save()}
function gsets(e){S.groups[e.dataset.g].same_unit_sets=e.value.split('\n').map(l=>l.trim().split(/\s+/).filter(Boolean)).filter(x=>x.length>1);save()}
function grev(e){S.groups[e.dataset.g].reviewed=e.checked;render()}
function gnote(e){S.groups[e.dataset.gn].notes=e.value;save()}
reviewer.onchange=()=>{S.reviewer=reviewer.value;save()};final.onchange=()=>{S.final_approval=final.checked;save()};
function progress(){const n=ITEMS.sequences.filter(s=>S.sequences[s.sequence]?.decision).length+ITEMS.pairs.filter(p=>S.pairs[p.a+'|'+p.b]?.decision).length+ITEMS.groups.filter(g=>S.groups[g.group]?.reviewed).length;
 const t=ITEMS.sequences.length+ITEMS.pairs.length+ITEMS.groups.length;document.getElementById('progress').textContent=`${n}/${t} decisions recorded`}
function exportJSON(){const out={status:'SUBMITTED',reviewer:S.reviewer||null,review_date:new Date().toISOString().slice(0,10),final_approval:!!S.final_approval,sequences:S.sequences,pairs:S.pairs,groups:S.groups};
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(out,null,1)],{type:'application/json'}));a.download='human_qc_results.json';a.click()}
function importJSON(inp){const f=inp.files[0];if(!f)return;f.text().then(t=>{const d=JSON.parse(t);S={sequences:d.sequences||{},pairs:d.pairs||{},groups:d.groups||{},reviewer:d.reviewer,final_approval:d.final_approval};render()})}
render();
</script></body></html>"""

if __name__ == "__main__":
    main()
