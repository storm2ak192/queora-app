#!/usr/bin/env python3
import base64, json, pathlib, glob
parts = sorted(glob.glob("bootstrap/chunk_*.txt"))
b64 = "".join(pathlib.Path(p).read_text().strip() for p in parts)
files = json.loads(base64.b64decode(b64).decode())
for path, content in files.items():
    p = pathlib.Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content)
    print("wrote", path)
print("done", len(files))
