"""Independently fetch the official identity marks used by this edition.

This does not read or copy the historical `sources/brand` image files. It fetches the
recorded official URLs, keeps the downloaded originals and records the HTTP
metadata, timestamps and hashes. SVG marks are rasterised separately.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import zipfile
from datetime import datetime, timezone
from pathlib import Path

import requests

HERE = Path(__file__).resolve().parent
UA = {"User-Agent": "huandeng-introduction-deepseek-en/1.0 (independent mark acquisition)"}

DOWNLOADS = [
    (
        "codex.png",
        "https://openai.gallerycdn.vsassets.io/extensions/openai/chatgpt/26.51021.22027/1792788319200/Microsoft.VisualStudio.Services.Icons.Default",
    ),
    ("claude-code.png", "https://claude.com/icon.png"),
    ("deepseek.png", "https://avatars.githubusercontent.com/u/148330874?v=4"),
    ("chatgpt.svg", "https://chatgpt.com/cdn/assets/favicon.6a33781f61.svg"),
    (
        "open-slide.svg",
        "https://raw.githubusercontent.com/open-slide/open-slide/3233309b72af27f58f01b7d3b6a13f4011cf06e7/apps/web/app/icon.svg",
    ),
    ("pptxgenjs.png", "https://gitbrent.github.io/PptxGenJS/img/favicon.png"),
    ("GitHub_Logos.zip", "https://brand.github.com/GitHub_Logos.zip"),
]

records = []
errors = []
for name, url in DOWNLOADS:
    requested = datetime.now(timezone.utc).isoformat()
    try:
        response = requests.get(url, headers=UA, timeout=90)
        response.raise_for_status()
        path = HERE / name
        path.write_bytes(response.content)
        record = {
            "file": name,
            "url": url,
            "requestedAtUtc": requested,
            "completedAtUtc": datetime.now(timezone.utc).isoformat(),
            "httpStatus": response.status_code,
            "contentType": response.headers.get("Content-Type"),
            "contentLengthHeader": response.headers.get("Content-Length"),
            "lastModified": response.headers.get("Last-Modified"),
            "etag": response.headers.get("ETag"),
            "bytes": len(response.content),
            "sha256": hashlib.sha256(response.content).hexdigest(),
        }
        records.append(record)
        print(name, response.status_code, len(response.content), record["sha256"])
    except Exception as error:
        errors.append({"file": name, "url": url, "requestedAtUtc": requested, "error": repr(error)})
        print("ERROR", name, repr(error))

if (HERE / "GitHub_Logos.zip").exists():
    with zipfile.ZipFile(HERE / "GitHub_Logos.zip") as archive:
        member = "GitHub Logos/PNG/GitHub_Invertocat_Black.png"
        data = archive.read(member)
        target = HERE / "github-repository.png"
        target.write_bytes(data)
        records.append(
            {
                "file": "github-repository.png",
                "url": "https://brand.github.com/GitHub_Logos.zip",
                "archiveMember": member,
                "completedAtUtc": datetime.now(timezone.utc).isoformat(),
                "bytes": len(data),
                "sha256": hashlib.sha256(data).hexdigest(),
            }
        )
        print("github-repository.png", len(data), records[-1]["sha256"])

# The product mark's historical public raw URL returns 404 (the repository is not
# anonymously readable). Use the author's own repository working tree at the
# recorded commit as the authoritative product source, not sources/brand.
local_icon = Path(r"D:\_Proj\Huandeng\packages\desktop\icon.png")
local_commit = "b43e3e08cb3f676f78202b4df5e1145255ee043c"
if local_icon.exists():
    data = subprocess.check_output(
        [
            "git",
            "-C",
            r"D:\_Proj\Huandeng",
            "show",
            f"{local_commit}:packages/desktop/icon.png",
        ]
    )
    (HERE / "huandeng.png").write_bytes(data)
    records.append(
        {
            "file": "huandeng.png",
            "sourceType": "repository-commit",
            "repository": "D:\\_Proj\\Huandeng",
            "remote": "https://github.com/JaytonKogeru/huandeng",
            "commit": local_commit,
            "path": "packages/desktop/icon.png",
            "method": "git show <commit>:packages/desktop/icon.png from the author's official repository object",
            "completedAtUtc": datetime.now(timezone.utc).isoformat(),
            "bytes": len(data),
            "sha256": hashlib.sha256(data).hexdigest(),
            "note": "The historical GitHub raw URL with commit 00482d... returns 404 anonymously. This is the author's own repository source, not a copy of sources/brand.",
        }
    )
    print("huandeng.png", len(data), records[-1]["sha256"])

(HERE / "download-record.json").write_text(
    json.dumps(
        {
            "note": "Independent fetch of the official identity marks. The historical sources/brand image files were not read or copied; its manifest was used only for the recorded URLs.",
            "records": records,
            "errors": errors,
        },
        indent=2,
        ensure_ascii=False,
    )
    + "\n",
    encoding="utf-8",
)
