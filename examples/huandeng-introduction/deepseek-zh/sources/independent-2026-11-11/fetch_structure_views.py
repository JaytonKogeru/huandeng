import hashlib
import json
import os
import urllib.error
import urllib.request
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
UA = "huandeng-introduction-deepseek-zh/1.0 (independent acquisition; research deck)"
URLS = [
    "https://www.ebi.ac.uk/pdbe/static/entry/1bna_deposited_chain_side_image-800x800.png",
    "https://www.ebi.ac.uk/pdbe/static/entry/1bna_updated_chain_front_image-800x800.png",
    "https://www.ebi.ac.uk/pdbe/static/entry/1bna_updated_chain_side_image-800x800.png",
]
out = []
for url in URLS:
    target = os.path.join(HERE, os.path.basename(url))
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data, status, ctype = resp.read(), resp.status, resp.headers.get("Content-Type", "")
    except Exception as exc:  # noqa: BLE001
        out.append({"url": url, "error": repr(exc)})
        print(url, "FAILED", exc)
        continue
    open(target, "wb").write(data)
    item = {
        "url": url,
        "httpStatus": status,
        "contentType": ctype,
        "method": "GET (urllib.request, python 3.14)",
        "target": os.path.basename(target),
        "bytes": len(data),
        "sha256": hashlib.sha256(data).hexdigest(),
        "retrievedAt": datetime.now(timezone.utc).isoformat(),
    }
    out.append(item)
    print(json.dumps(item, ensure_ascii=False))

with open(os.path.join(HERE, "structure-image-retrievals.json"), "w", encoding="utf-8") as fh:
    json.dump(out, fh, ensure_ascii=False, indent=2)
    fh.write("\n")
