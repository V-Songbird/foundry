"""Package retained benchmark outputs without changing their bytes.

Run from any directory. Each archive restores paths relative to Foundry root.
Existing archives must match exactly; this command does not overwrite evidence.
"""
import argparse
import gzip
import hashlib
import io
import json
from pathlib import Path
import tarfile

ROOT = Path(__file__).resolve().parents[1]
SOURCES = {"foreman": ["results", "picks/results"], "hush": ["results"]}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def package(plugin, source, verify=False):
    base = ROOT / "benchmarks" / plugin / source
    if not base.exists():
        return []
    groups = sorted(base.iterdir())
    output = ROOT / "benchmarks" / plugin / "datasets"
    if not verify:
        output.mkdir(exist_ok=True)
    bundles = []
    for group in groups:
        if group.is_symlink():
            raise ValueError(f"Symlink cannot be packaged: {group}")
        files = sorted(p for p in group.rglob("*") if p.is_file()) if group.is_dir() else [group]
        if not files:
            continue
        name = source.replace("/", "-") + "--" + group.name + ".tar.gz"
        target = output / name
        buffer = io.BytesIO()
        members = []
        with gzip.GzipFile(fileobj=buffer, mode="wb", filename="", mtime=0) as gz:
            with tarfile.open(fileobj=gz, mode="w") as tar:
                for file in files:
                    if file.is_symlink():
                        raise ValueError(f"Symlink cannot be packaged: {file}")
                    data = file.read_bytes()
                    relative = file.relative_to(ROOT).as_posix()
                    item = tarfile.TarInfo(relative)
                    item.size, item.mode = len(data), 0o644
                    tar.addfile(item, io.BytesIO(data))
                    members.append({"path": relative, "bytes": len(data), "sha256": digest(data)})
        archive = buffer.getvalue()
        if len(archive) >= 90_000_000:
            raise ValueError(f"Split this source group before publishing: {group}")
        if target.exists():
            if target.read_bytes() != archive:
                raise ValueError(f"Evidence changed; use an explicitly named successor: {target}")
        elif verify:
            raise ValueError(f"Missing archive: {target}")
        else:
            target.write_bytes(archive)
        with tarfile.open(fileobj=io.BytesIO(archive), mode="r:gz") as tar:
            assert len(tar.getmembers()) == len(members)
            for item, expected in zip(tar.getmembers(), members):
                assert item.name == expected["path"] and item.isfile()
                assert digest(tar.extractfile(item).read()) == expected["sha256"]
        bundles.append({"archive": target.relative_to(ROOT).as_posix(), "bytes": len(archive),
                        "sha256": digest(archive), "files": members})
    return bundles


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify", action="store_true")
    args = parser.parse_args()
    for plugin, sources in SOURCES.items():
        bundles = [bundle for source in sources for bundle in package(plugin, source, args.verify)]
        index = ROOT / "benchmarks" / plugin / "datasets" / "inventory.json"
        content = json.dumps({"format": 1, "plugin": plugin, "archives": bundles}, indent=2) + "\n"
        if args.verify:
            assert index.read_text(encoding="utf-8") == content, f"Inventory drift: {index}"
        else:
            index.write_text(content, encoding="utf-8")
        print(json.dumps({"plugin": plugin, "archives": len(bundles),
                          "files": sum(len(b["files"]) for b in bundles),
                          "compressedBytes": sum(b["bytes"] for b in bundles)}))


if __name__ == "__main__":
    main()
