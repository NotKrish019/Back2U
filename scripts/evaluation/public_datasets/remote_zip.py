"""Read members of a remote .zip with HTTP Range requests — no full download.

Used to (a) audit public archives from metadata only and (b) later fetch only the selected
files (e.g. 8 frames of one CO3D sequence out of a 20 GB chunk). Requires the server to answer
Range requests with 206 (verified 2026-11-02 for dl.fbaipublicfiles.com and the Mendeley S3 host).

    python scripts/evaluation/public_datasets/remote_zip.py URL [--list] [--get MEMBER --out FILE]
"""
from __future__ import annotations

import argparse
import struct
import zlib
from dataclasses import dataclass

import requests


@dataclass
class Member:
    name: str
    method: int
    compressed_size: int
    size: int
    offset: int


class RemoteZip:
    def __init__(self, url: str, timeout: float = 120, session: requests.Session | None = None):
        self.s = session or requests.Session()
        self.timeout = timeout
        head = self.s.head(url, allow_redirects=True, timeout=timeout)
        head.raise_for_status()
        self.url = head.url
        self.size = int(head.headers["Content-Length"])
        self.bytes_fetched = 0
        self.members = self._read_central_directory()

    def _range(self, a: int, b: int) -> bytes:
        r = self.s.get(self.url, headers={"Range": f"bytes={a}-{b}"}, timeout=self.timeout)
        if r.status_code != 206:
            raise RuntimeError(f"server ignored Range request (HTTP {r.status_code})")
        self.bytes_fetched += len(r.content)
        return r.content

    def _read_central_directory(self) -> dict[str, Member]:
        tail = self._range(max(0, self.size - 65536 - 22), self.size - 1)
        i = tail.rfind(b"PK\x05\x06")
        if i < 0:
            raise RuntimeError("end-of-central-directory not found")
        n, cd_size, cd_off = struct.unpack("<HII", tail[i + 10:i + 20])
        if cd_off == 0xFFFFFFFF or n == 0xFFFF or cd_size == 0xFFFFFFFF:
            j = tail.rfind(b"PK\x06\x07")
            (z64,) = struct.unpack("<Q", tail[j + 8:j + 16])
            z = self._range(z64, z64 + 55)
            n, cd_size, cd_off = struct.unpack("<QQQ", z[32:56])
        cd = self._range(cd_off, cd_off + cd_size - 1)
        out, p = {}, 0
        while p < len(cd) and cd[p:p + 4] == b"PK\x01\x02":
            method = struct.unpack("<H", cd[p + 10:p + 12])[0]
            cs, us = struct.unpack("<II", cd[p + 20:p + 28])
            fl, el, cl = struct.unpack("<HHH", cd[p + 28:p + 34])
            off = struct.unpack("<I", cd[p + 42:p + 46])[0]
            name = cd[p + 46:p + 46 + fl].decode("utf-8", errors="replace")
            extra = cd[p + 46 + fl:p + 46 + fl + el]
            k = 0
            while k + 4 <= len(extra):
                hid, hl = struct.unpack("<HH", extra[k:k + 4])
                if hid == 1:  # zip64 extended information
                    vals = list(struct.unpack("<" + "Q" * (hl // 8), extra[k + 4:k + 4 + 8 * (hl // 8)]))
                    if us == 0xFFFFFFFF:
                        us = vals.pop(0)
                    if cs == 0xFFFFFFFF:
                        cs = vals.pop(0)
                    if off == 0xFFFFFFFF:
                        off = vals.pop(0)
                k += 4 + hl
            out[name] = Member(name, method, cs, us, off)
            p += 46 + fl + el + cl
        return out

    def read_single_request(self, name: str, session: requests.Session | None = None) -> bytes:
        """Fetch header+data in ONE Range request (over-reads ≤ 512 B of header slack).

        Thread-safe when each thread passes its own ``session``. Does not update bytes_fetched
        (callers count len(result) themselves)."""
        m = self.members[name]
        if m.compressed_size == 0:
            return b""
        s = session or requests
        end = m.offset + 30 + 512 + m.compressed_size - 1
        r = s.get(self.url, headers={"Range": f"bytes={m.offset}-{min(end, self.size - 1)}"}, timeout=self.timeout)
        if r.status_code != 206:
            raise RuntimeError(f"server ignored Range request (HTTP {r.status_code})")
        blob = r.content
        if blob[:4] != b"PK\x03\x04":
            raise RuntimeError(f"bad local header for {name}")
        fl, el = struct.unpack("<HH", blob[26:30])
        start = 30 + fl + el
        data = blob[start:start + m.compressed_size]
        if len(data) != m.compressed_size:
            return self.read(name)  # header larger than the slack: fall back to two requests
        if m.method == 0:
            return data
        if m.method == 8:
            return zlib.decompress(data, -15)
        raise RuntimeError(f"unsupported compression method {m.method} for {name}")

    def read(self, name: str) -> bytes:
        m = self.members[name]
        if m.compressed_size == 0:
            return b""
        h = self._range(m.offset, m.offset + 29)
        fl, el = struct.unpack("<HH", h[26:30])
        start = m.offset + 30 + fl + el
        data = self._range(start, start + m.compressed_size - 1)
        if m.method == 0:
            return data
        if m.method == 8:
            return zlib.decompress(data, -15)
        raise RuntimeError(f"unsupported compression method {m.method} for {name}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("url")
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--get")
    ap.add_argument("--out")
    a = ap.parse_args()
    z = RemoteZip(a.url)
    print(f"archive {z.size / 1e9:.2f} GB, {len(z.members)} members, fetched {z.bytes_fetched / 1e6:.2f} MB for the directory")
    if a.list:
        for m in list(z.members.values())[:50]:
            print(f"{m.compressed_size:>12d}  {m.name}")
    if a.get:
        data = z.read(a.get)
        open(a.out or a.get.rsplit("/", 1)[-1], "wb").write(data)
        print(f"wrote {len(data)} bytes; total fetched {z.bytes_fetched / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
