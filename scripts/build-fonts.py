"""Build the checked-in vector atlas; not used by Node or daily Actions.

Run with fonttools==4.60.1 installed in a development virtual environment.
Sources are pinned and verified; no font binary is installed on the host.
"""
import hashlib
import json
import urllib.request
from pathlib import Path
from tempfile import TemporaryDirectory
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen

ROOT = Path(__file__).resolve().parent.parent
manifest = json.loads((ROOT / "fonts/sources.json").read_text(encoding="utf-8"))
characters = sorted(set(range(32, 127)) | set(range(160, 256)) | {0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2026, 0x2192, 0x258C})
faces = {"display": ("spacegrotesk", 650), "body": ("manrope", 500), "strong": ("manrope", 650), "mono": ("ibmplexmono", 500)}
atlas = {"version": 1, "revision": manifest["revision"], "faces": {}}
with TemporaryDirectory(prefix="profile-fonts-") as directory:
    files = {}
    for source in manifest["fonts"]:
        data = urllib.request.urlopen(source["url"], timeout=30).read()
        if hashlib.sha256(data).hexdigest() != source["sha256"]:
            raise ValueError("Font source checksum mismatch")
        file = Path(directory) / source["file"]
        file.write_bytes(data)
        files[source["family"]] = file
    for key, (family, weight) in faces.items():
        font = TTFont(files[family], recalcTimestamp=False)
        if "fvar" in font:
            font = instantiateVariableFont(font, {"wght": weight}, inplace=False)
        cmap = font.getBestCmap()
        glyph_set = font.getGlyphSet()
        glyphs = {}
        for code in characters:
            if code not in cmap:
                continue
            name = cmap[code]
            pen = SVGPathPen(glyph_set, ntos=lambda n: str(round(n, 2)).removesuffix(".0"))
            glyph_set[name].draw(pen)
            glyphs[chr(code)] = {"advance": round(glyph_set[name].width, 2), "path": pen.getCommands()}
        atlas["faces"][key] = {"family": family, "weight": weight, "units": font["head"].unitsPerEm, "glyphs": glyphs}
(ROOT / "fonts/atlas.json").write_text(json.dumps(atlas, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
print("Generated four vector faces; no runtime font dependency")
