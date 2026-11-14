import json
import threading
from pathlib import Path

import numpy as np
import pytest

from src.retrieval.gallery_store import GalleryStore

V, S = 256, 768


def vec(seed, dim):
    v = np.random.default_rng(seed).normal(size=dim).astype(np.float32)
    return v / np.linalg.norm(v)


def new_store(path, version="mv-1", v=V, s=S):
    return GalleryStore(path, version, v, s).load()


def test_persists_across_restart(tmp_path):
    st = new_store(tmp_path / "g")
    for i in range(3):
        st.add(f"item_{i}", "laptop", vec(i, V), vec(100 + i, S), f"sha{i}", f"/img/{i}.jpg", {"source": "detector"})

    st2 = new_store(tmp_path / "g")  # simulated restart
    assert [e.item_id for e in st2.entries] == ["item_0", "item_1", "item_2"]
    assert np.allclose(st2.visual, st.visual) and np.allclose(st2.siglip, st.siglip)
    sims, idx = st2.search(vec(1, V), 1)
    assert st2.entries[idx[0]].item_id == "item_1" and sims[0] == pytest.approx(1.0, abs=1e-5)
    # only the current generation's vector files remain on disk
    assert sorted(p.name for p in (tmp_path / "g").glob("*.npy")) == ["siglip.3.npy", "visual.3.npy"]


@pytest.mark.parametrize("kwargs,why", [
    ({"version": "mv-2"}, "model_version"),
    ({"v": 128}, "dims"),
    ({"s": 512}, "dims"),
])
def test_incompatible_store_is_quarantined_not_overwritten(tmp_path, kwargs, why):
    st = new_store(tmp_path / "g")
    st.add("item_0", "laptop", vec(0, V), vec(1, S), "sha0", "/img/0.jpg")

    v, s = kwargs.get("v", V), kwargs.get("s", S)
    st2 = GalleryStore(tmp_path / "g", kwargs.get("version", "mv-1"), v, s).load()

    assert len(st2) == 0
    assert why in st2.load_error
    q = Path(st2.quarantined_to)
    assert q.exists() and json.loads((q / "manifest.json").read_text())["count"] == 1
    assert st2.info()["quarantined_to"] == str(q)


def test_corrupt_manifest_is_quarantined(tmp_path):
    st = new_store(tmp_path / "g")
    st.add("item_0", None, vec(0, V), vec(1, S), "sha0", "/img/0.jpg")
    (tmp_path / "g" / "manifest.json").write_text("{not json")
    st2 = new_store(tmp_path / "g")
    assert len(st2) == 0 and "corrupt manifest" in st2.load_error


def test_vector_count_mismatch_is_quarantined(tmp_path):
    st = new_store(tmp_path / "g")
    st.add("item_0", None, vec(0, V), vec(1, S), "sha0", "/img/0.jpg")
    np.save(tmp_path / "g" / "visual.1.npy", np.zeros((5, V), dtype=np.float32))
    st2 = new_store(tmp_path / "g")
    assert len(st2) == 0 and "do not match" in st2.load_error


def test_duplicate_content_detection(tmp_path):
    st = new_store(tmp_path / "g")
    r1 = st.add("item_a", None, vec(0, V), vec(1, S), "same", "/img/a.jpg")
    r2 = st.add("item_a", None, vec(0, V), vec(1, S), "same", "/img/a.jpg")
    r3 = st.add("item_b", None, vec(0, V), vec(1, S), "same", "/img/a.jpg")
    assert (r1.status, r1.duplicate_of) == ("added", [])
    assert (r2.status, r2.duplicate_of) == ("already_indexed", [])
    assert (r3.status, r3.duplicate_of) == ("added", ["item_a"])
    assert len(st) == 2
    assert new_store(tmp_path / "g").entries[1].duplicate_of == ["item_a"]


def test_wrong_dimension_is_rejected_and_nothing_persisted(tmp_path):
    st = new_store(tmp_path / "g")
    with pytest.raises(ValueError):
        st.add("item_x", None, vec(0, 128), vec(1, S), "sha", "/img/x.jpg")
    assert len(new_store(tmp_path / "g")) == 0


def test_concurrent_adds_all_persist(tmp_path):
    st = new_store(tmp_path / "g")
    errors = []

    def worker(i):
        try:
            st.add(f"item_{i}", None, vec(i, V), vec(1000 + i, S), f"sha{i}", f"/img/{i}.jpg")
        except Exception as e:  # pragma: no cover
            errors.append(e)

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(24)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert not errors
    reloaded = new_store(tmp_path / "g")
    assert sorted(reloaded.item_ids()) == sorted(f"item_{i}" for i in range(24))
    for i, e in enumerate(reloaded.entries):  # vectors stay aligned with their entries
        n = int(e.item_id.split("_")[1])
        assert np.allclose(reloaded.visual[i], vec(n, V))
