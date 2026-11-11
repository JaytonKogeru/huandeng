"""Independent acquisition for the worked example, 2026-11-12.

Downloads the public RCSB PDB entry 1BNA and the official RCSB assembly image
straight from the recorded URLs. Writes only into this directory.
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import requests

HERE = Path(__file__).resolve().parent
SOURCES = [
    (
        "1BNA.pdb",
        "https://files.rcsb.org/download/1BNA.pdb",
        "text/plain",
    ),
    (
        "rcsb-1bna-assembly.jpeg",
        "https://cdn.rcsb.org/images/structures/1bna_assembly-1.jpeg",
        "image/jpeg",
    ),
]
HEADERS = {
    "User-Agent": "huandeng-introduction-deepseek-en/1.0 (independent figure acquisition)"
}

records = []
for filename, url, expected_type in SOURCES:
    requested = datetime.now(timezone.utc).isoformat()
    response = requests.get(url, headers=HEADERS, timeout=60)
    response.raise_for_status()
    content_type = response.headers.get("Content-Type", "")
    if expected_type not in content_type:
        raise SystemExit(f"Unexpected content type for {url}: {content_type}")
    target = HERE / filename
    target.write_bytes(response.content)
    records.append(
        {
            "file": filename,
            "url": url,
            "requestedAtUtc": requested,
            "completedAtUtc": datetime.now(timezone.utc).isoformat(),
            "httpStatus": response.status_code,
            "contentType": content_type,
            "contentLengthHeader": response.headers.get("Content-Length"),
            "lastModified": response.headers.get("Last-Modified"),
            "etag": response.headers.get("ETag"),
            "bytes": len(response.content),
            "sha256": hashlib.sha256(response.content).hexdigest(),
            "method": "Single GET from the recorded public URL; bytes written unchanged.",
        }
    )
    print(filename, response.status_code, len(response.content), records[-1]["sha256"])

(HERE / "download-record.json").write_text(
    json.dumps(
        {
            "note": "Independent download for this edition. No old science file was used as input; the new script reads only its own download.",
            "records": records,
        },
        indent=2,
        ensure_ascii=False,
    )
    + "\n",
    encoding="utf-8",
)
