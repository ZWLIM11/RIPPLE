"""Download a pinned research corpus. Never commit the downloaded data."""
import concurrent.futures
import hashlib
import json
from pathlib import Path
import time
import urllib.request

REVISION = "4b73468fc5b0f1950f9f66fada70ad3a4f9327cb"
BASE = f"https://raw.githubusercontent.com/statsbomb/open-data/{REVISION}"
ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "work" / "statsbomb"


def fetch(relative):
    path = CACHE / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        for attempt in range(4):
            try:
                with urllib.request.urlopen(f"{BASE}/{relative}", timeout=60) as response:
                    raw = response.read()
                if relative.endswith(".json"):
                    json.loads(raw)
                temporary = path.with_suffix(path.suffix + ".part")
                temporary.write_bytes(raw)
                temporary.replace(path)
                break
            except Exception:
                if attempt == 3:
                    raise
                time.sleep(1 + attempt)
    raw = path.read_bytes()
    return {"path": relative, "sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw)}


def main():
    manifest = {"revision": REVISION, "source": BASE, "files": []}
    for year, season in [(2018, 3), (2022, 106)]:
        relative = f"data/matches/43/{season}.json"
        manifest["files"].append(fetch(relative))
        matches = json.loads((CACHE / relative).read_text(encoding="utf-8"))
        assert len(matches) == 64, f"Unexpected {year} corpus size"
        paths = [f"data/events/{m['match_id']}.json" for m in matches]
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            for index, record in enumerate(pool.map(fetch, paths), 1):
                manifest["files"].append(record)
                if index % 16 == 0:
                    print(f"{year}: {index}/64 matches downloaded", flush=True)
    (CACHE / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print("Pinned corpus and SHA-256 manifest ready.", flush=True)


if __name__ == "__main__":
    main()
