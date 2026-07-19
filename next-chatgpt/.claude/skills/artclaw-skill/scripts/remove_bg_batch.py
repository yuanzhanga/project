#!/usr/bin/env python3
"""
Batch remove-bg helper — reads images as files, calls api_remove_bg in-process.
Usage: python3 remove_bg_batch.py <input_path> <output_path>
"""
import base64
import json
import sys
import os
import time
from pathlib import Path

# Ensure we can import artclaw module
SKILL_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(SKILL_DIR / "scripts"))

import artclaw as ac

def main():
    if len(sys.argv) != 3:
        print("Usage: remove_bg_batch.py <input_path> <output_path>", file=sys.stderr)
        sys.exit(1)

    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])

    print(f"[remove-bg] Reading {input_path.name}...", file=sys.stderr)
    with open(input_path, "rb") as f:
        image_b64 = base64.b64encode(f.read()).decode("utf-8")

    config = ac._get_config()

    # Get image dimensions for output_size
    import struct
    with open(input_path, "rb") as f:
        f.read(8)   # PNG signature
        f.read(4)   # IHDR length
        f.read(4)   # IHDR type
        data = f.read(8)
        width = struct.unpack(">I", data[0:4])[0]
        height = struct.unpack(">I", data[4:8])[0]
    output_size = f"{width}x{height}"
    print(f"[remove-bg] Image size: {output_size}", file=sys.stderr)

    import requests as _requests

    print(f"[remove-bg] Submitting job for {input_path.name}...", file=sys.stderr)
    api_key = config["apiKey"]
    base_url = config.get("baseUrl", "https://artclaw.com/api/v1")
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-API-KEY": api_key,
    }
    body = {"image_base64": image_b64, "output_size": output_size}
    resp = _requests.post(
        f"{base_url}/generate/remove-bg",
        headers=headers,
        json=body,
        timeout=(15, 60),
    )
    if resp.status_code != 200:
        print(f"[remove-bg] API error {resp.status_code}: {resp.text[:500]}", file=sys.stderr)
        sys.exit(1)
    result = resp.json()
    print(f"[remove-bg] Submit result: {json.dumps(result)}", file=sys.stderr)

    job_id = result.get("job_id")
    if not job_id:
        print(json.dumps({"error": "No job_id returned", "result": result}))
        sys.exit(1)

    print(f"[remove-bg] Polling job {job_id}...", file=sys.stderr)
    final = ac._poll_until(config, job_id, "image")
    print(f"[remove-bg] Final result: {json.dumps(final)}", file=sys.stderr)

    # Find image URL in result
    image_url = (
        final.get("result_url")
        or final.get("image_url")
        or final.get("url")
        or (final.get("result", {}) or {}).get("url")
        or (final.get("result", {}) or {}).get("image_url")
        or (final.get("result", {}) or {}).get("result_url")
    )

    if not image_url:
        # Try to find any URL in the result
        result_str = json.dumps(final)
        import re
        urls = re.findall(r'https?://[^\s"\']+\.png[^\s"\']*', result_str)
        if urls:
            image_url = urls[0]

    if not image_url:
        print(json.dumps({"error": "No image URL in result", "final": final}))
        sys.exit(1)

    print(f"[remove-bg] Downloading from {image_url}...", file=sys.stderr)
    import requests
    resp = requests.get(image_url, timeout=60)
    resp.raise_for_status()

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "wb") as f:
        f.write(resp.content)

    print(json.dumps({
        "status": "success",
        "input": str(input_path),
        "output": str(output_path),
        "job_id": job_id,
        "image_url": image_url,
        "bytes": len(resp.content),
    }))

if __name__ == "__main__":
    main()
