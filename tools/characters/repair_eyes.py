"""Repair a smeared eye on a Hunyuan avatar's baked texture by mirroring the good eye across the face.

Hunyuan 3D bakes the face from one image, and its texture often gets one eye right and smears the other (doubled
lids, a split iris, a hair strand painted across it). This finds the face in the GLB (the nose tip: the front-most
skin point on the centre line), renders the colour map in a front view, and rewrites the bad eye's texels (and
its brow) with the good side's colours, mirrored about the face's centre line and feathered into the skin. The
normal map is flattened over both eyes, where Hunyuan's baked bumps only add noise.

    python3 tools/characters/repair_eyes.py public/people/gunian.glb OUT.glb --good left [--preview DIR]
        [--center-x -0.1] [--box -5.2,-0.9,1.8,6.6]

--good: which side of the picture (as you look at the face) holds the good eye. --box: the region to copy,
x0,x1,y0,y1 in centimetres from the nose tip (on the good side). --preview: writes before/after front views.
"""
import argparse, io, json, struct, sys
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("glb"); ap.add_argument("out")
ap.add_argument("--good", choices=["left", "right"], default="left")
ap.add_argument("--center-x", type=float, default=None)
ap.add_argument("--box", default="-5.2,-0.9,1.8,6.6")
ap.add_argument("--feather", type=float, default=0.6)
ap.add_argument("--preview", default=None)
A = ap.parse_args()

# ---- read the GLB
raw = open(A.glb, "rb").read()
jlen = struct.unpack("<I", raw[12:16])[0]
J = json.loads(raw[20:20 + jlen])
B = raw[20 + jlen + 8:]

def view(i):
    bv = J["bufferViews"][i]; o = bv.get("byteOffset", 0); return B[o:o + bv["byteLength"]]

def accessor(i):
    a = J["accessors"][i]; bv = J["bufferViews"][a["bufferView"]]
    n = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}[a["type"]]
    dt = {5126: np.float32, 5125: np.uint32, 5123: np.uint16, 5121: np.uint8}[a["componentType"]]
    o = bv.get("byteOffset", 0) + a.get("byteOffset", 0)
    stride = bv.get("byteStride", 0)
    if stride and stride != n * np.dtype(dt).itemsize:
        rows = np.frombuffer(B, np.uint8, a["count"] * stride, o).reshape(a["count"], stride)
        return rows[:, :n * np.dtype(dt).itemsize].copy().view(dt).reshape(a["count"], n)
    return np.frombuffer(B, dt, a["count"] * n, o).reshape(a["count"], n) if n > 1 else np.frombuffer(B, dt, a["count"], o)

def local(node):
    if "matrix" in node: return np.array(node["matrix"], float).reshape(4, 4).T
    t = node.get("translation", [0, 0, 0]); r = node.get("rotation", [0, 0, 0, 1]); s = node.get("scale", [1, 1, 1])
    x, y, z, w = r
    R = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                  [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                  [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
    M = np.eye(4); M[:3, :3] = R * np.array(s); M[:3, 3] = t; return M

parent = {}
for i, n in enumerate(J["nodes"]):
    for c in n.get("children", []): parent[c] = i
def world(i):
    M = local(J["nodes"][i])
    while i in parent: i = parent[i]; M = local(J["nodes"][i]) @ M
    return M

# the body: the mesh node with the most vertices (skinned meshes draw in their own node's space in three.js)
best = None
for i, n in enumerate(J["nodes"]):
    if "mesh" not in n: continue
    prim = J["meshes"][n["mesh"]]["primitives"][0]
    cnt = J["accessors"][prim["attributes"]["POSITION"]]["count"]
    if not best or cnt > best[0]: best = (cnt, i, prim)
_, node_i, prim = best
P = accessor(prim["attributes"]["POSITION"]).astype(float)
P = (np.c_[P, np.ones(len(P))] @ world(node_i).T)[:, :3]
UV = accessor(prim["attributes"]["TEXCOORD_0"]).astype(float)
IX = accessor(prim["indices"]).astype(np.int64).reshape(-1, 3)
mat = J["materials"][prim.get("material", 0)]
def image_of(texinfo):
    t = J["textures"][texinfo["index"]]
    return t.get("source", t.get("extensions", {}).get("EXT_texture_webp", {}).get("source"))
img_col = image_of(mat["pbrMetallicRoughness"]["baseColorTexture"])
img_nrm = image_of(mat["normalTexture"]) if "normalTexture" in mat else None
def load(i): return np.asarray(Image.open(io.BytesIO(view(J["images"][i]["bufferView"]))).convert("RGB")).astype(np.float32)
COL = load(img_col); NRM = load(img_nrm) if img_nrm is not None else None
TH, TW = COL.shape[:2]

def texel(img, u, v):
    return img[np.clip((v * TH).astype(int), 0, TH - 1), np.clip((u * TW).astype(int), 0, TW - 1)]

# ---- the nose tip: front-most skin-coloured point near the centre line, below the top of the head
lum = lambda c: (0.3 * c[..., 0] + 0.55 * c[..., 1] + 0.15 * c[..., 2]) / 255
vc = texel(COL, UV[:, 0], UV[:, 1])
top = P[:, 1].max()
cand = (np.abs(P[:, 0]) < 2) & (lum(vc) > 0.5) & (P[:, 1] > top - 40)
nose = P[cand][np.argmax(P[cand][:, 2])]
print("nose", nose.round(2))
Q = P - nose                                  # centimetres from the nose tip

# ---- the front view
S = 40; X0, X1, Y0, Y1 = -9, 9, -9, 12
W, H = (X1 - X0) * S, (Y1 - Y0) * S
cen = Q[IX].mean(1)
face = (np.abs(cen[:, 0]) < 9.5) & (cen[:, 1] > -9.5) & (cen[:, 1] < 12.5) & (cen[:, 2] > -7)
# hair triangles (dark at their centre): strands hanging over the face are left as they are, and the skin
# behind them is still repaired
uvc = UV[IX].mean(1)
hair = lum(texel(COL, uvc[:, 0], uvc[:, 1])) < 0.33
_b = list(map(float, A.box.split(",")))   # the eyes themselves are dark too: inside the eye openings nothing is hair
_eye = (cen[:, 1] > _b[2]) & (cen[:, 1] < _b[2] + 0.45 * (_b[3] - _b[2])) & (np.abs(cen[:, 0]) > 0.8) & (np.abs(cen[:, 0]) < max(abs(_b[0]), abs(_b[1])) - 0.4)
hair &= ~_eye

def raster(xs, ys, x0, x1, y0, y1):
    gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
    d = (ys[1] - ys[2]) * (xs[0] - xs[2]) + (xs[2] - xs[1]) * (ys[0] - ys[2])
    if abs(d) < 1e-12: return None
    l0 = ((ys[1] - ys[2]) * (gx - xs[2]) + (xs[2] - xs[1]) * (gy - ys[2])) / d
    l1 = ((ys[2] - ys[0]) * (gx - xs[2]) + (xs[0] - xs[2]) * (gy - ys[2])) / d
    return l0, l1, 1 - l0 - l1

def front(img, sel=None):
    out = np.zeros((H, W, 3), np.float32); zb = np.full((H, W), -1e9)
    for t in IX[face if sel is None else sel]:
        q = Q[t]; uv = UV[t]
        xs = (q[:, 0] - X0) * S; ys = (Y1 - q[:, 1]) * S
        x0, x1 = int(max(0, np.floor(xs.min()))), int(min(W - 1, np.ceil(xs.max())))
        y0, y1 = int(max(0, np.floor(ys.min()))), int(min(H - 1, np.ceil(ys.max())))
        if x1 < x0 or y1 < y0: continue
        r = raster(xs, ys, x0, x1, y0, y1)
        if r is None: continue
        l0, l1, l2 = r; m = (l0 >= 0) & (l1 >= 0) & (l2 >= 0)
        z = l0 * q[0, 2] + l1 * q[1, 2] + l2 * q[2, 2]
        sub = zb[y0:y1 + 1, x0:x1 + 1]; m &= z > sub
        u = l0 * uv[0, 0] + l1 * uv[1, 0] + l2 * uv[2, 0]; v = l0 * uv[0, 1] + l1 * uv[1, 1] + l2 * uv[2, 1]
        out[y0:y1 + 1, x0:x1 + 1][m] = texel(img, u, v)[m]; sub[m] = z[m]
    return out, zb

before, _ = front(COL)
skin_view, ZB = front(COL, face & ~hair)   # the face without the strands over it: the source and the depth test
_hole = ZB < -1e8; skin_view[_hole] = before[_hole]   # where only hair-coloured triangles cover the face (lash lines)
cx = A.center_x
if cx is None:   # the face's centre line: the middle of its outline at mouth height
    row = ZB[int((Y1 - (-3)) * S)] > -1e8; xs = np.nonzero(row)[0]
    cx = ((xs.min() + xs.max()) / 2) / S + X0
print("centre line x", round(cx, 2))

# ---- rewrite the bad side's texels
bx0, bx1, by0, by1 = map(float, A.box.split(","))
if A.good == "right": bx0, bx1 = -bx1 + 2 * cx, -bx0 + 2 * cx   # the box was given for the left; mirror it
def bilinear(img, x, y):
    fx = (x - X0) * S - 0.5; fy = (Y1 - y) * S - 0.5
    x0 = np.clip(np.floor(fx).astype(int), 0, W - 2); y0 = np.clip(np.floor(fy).astype(int), 0, H - 2)
    ax = np.clip(fx - x0, 0, 1)[..., None]; ay = np.clip(fy - y0, 0, 1)[..., None]
    return (img[y0, x0] * (1 - ax) * (1 - ay) + img[y0, x0 + 1] * ax * (1 - ay) + img[y0 + 1, x0] * (1 - ax) * ay + img[y0 + 1, x0 + 1] * ax * ay)
def box_weight(x, y, x0, x1, y0, y1, f):
    wx = np.clip(np.minimum(x - x0, x1 - x) / f, 0, 1); wy = np.clip(np.minimum(y - y0, y1 - y) / f, 0, 1)
    w = wx * wy; return w * w * (3 - 2 * w)
# the target box (the bad side): the good box mirrored about the centre line
tx0, tx1 = 2 * cx - bx1, 2 * cx - bx0
NEWC = COL.copy(); NEWN = NRM.copy() if NRM is not None else None
flat = np.array([128, 128, 255], np.float32)
ex0, ex1 = min(bx0, tx0), max(bx1, tx1)       # both eyes, for the normal map
written = 0
for t in IX[face & ~hair]:
    q = Q[t]; uv = UV[t]
    if q[:, 2].min() < -4: continue                          # not the front of the face
    if q[:, 1].max() < by0 - A.feather or q[:, 1].min() > by1 + A.feather: continue
    if q[:, 0].max() < ex0 - A.feather or q[:, 0].min() > ex1 + A.feather: continue
    us = uv[:, 0] * TW; vs = uv[:, 1] * TH
    x0, x1 = int(max(0, np.floor(us.min()))), int(min(TW - 1, np.ceil(us.max())))
    y0, y1 = int(max(0, np.floor(vs.min()))), int(min(TH - 1, np.ceil(vs.max())))
    r = raster(us, vs, x0, x1, y0, y1)
    if r is None: continue
    l0, l1, l2 = r; m = (l0 >= -0.02) & (l1 >= -0.02) & (l2 >= -0.02)
    X = l0 * q[0, 0] + l1 * q[1, 0] + l2 * q[2, 0]; Y = l0 * q[0, 1] + l1 * q[1, 1] + l2 * q[2, 1]; Z = l0 * q[0, 2] + l1 * q[1, 2] + l2 * q[2, 2]
    # only texels that are the visible surface in the front view
    fx = np.clip(((X - X0) * S).astype(int), 0, W - 1); fy = np.clip(((Y1 - Y) * S).astype(int), 0, H - 1)
    m &= Z > ZB[fy, fx] - 0.4
    if not m.any(): continue
    wc = box_weight(X, Y, tx0, tx1, by0, by1, A.feather) * m
    src = bilinear(skin_view, 2 * cx - X, Y)
    regC = NEWC[y0:y1 + 1, x0:x1 + 1]
    regC[:] = regC * (1 - wc[..., None]) + src * wc[..., None]
    if NEWN is not None:
        wn = np.maximum(box_weight(X, Y, tx0, tx1, by0, by0 + (by1 - by0) * 0.62, A.feather),
                        box_weight(X, Y, bx0, bx1, by0, by0 + (by1 - by0) * 0.62, A.feather)) * m
        regN = NEWN[y0:y1 + 1, x0:x1 + 1]
        regN[:] = regN * (1 - wn[..., None]) + flat * wn[..., None]
    written += int((wc > 0).sum())
print("texels rewritten", written)

if A.preview:
    COL_SAVE = COL; COL = NEWC
    after, _ = front(NEWC)
    Image.fromarray(np.concatenate([before, after], 1).clip(0, 255).astype(np.uint8)).save(A.preview + "/repair-eyes.png")
    COL = COL_SAVE

# ---- write the GLB back, with the new images
def encode(arr, mime):
    b = io.BytesIO(); im = Image.fromarray(arr.clip(0, 255).astype(np.uint8))
    if mime == "image/webp": im.save(b, "WEBP", quality=92, method=6)
    elif mime == "image/png": im.save(b, "PNG")
    else: im.save(b, "JPEG", quality=92)
    return b.getvalue()
newdata = {J["images"][img_col]["bufferView"]: encode(NEWC, J["images"][img_col]["mimeType"])}
if NEWN is not None: newdata[J["images"][img_nrm]["bufferView"]] = encode(NEWN, J["images"][img_nrm]["mimeType"])
chunks, off = [], 0
for i, bv in enumerate(J["bufferViews"]):
    d = newdata.get(i, view(i))
    pad = (-off) % 4; chunks.append(b"\0" * pad); off += pad
    bv["byteOffset"] = off; bv["byteLength"] = len(d); chunks.append(d); off += len(d)
binb = b"".join(chunks); binb += b"\0" * ((-len(binb)) % 4)
J["buffers"][0]["byteLength"] = len(binb)
js = json.dumps(J, separators=(",", ":")).encode(); js += b" " * ((-len(js)) % 4)
out = struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(binb)) + struct.pack("<II", len(js), 0x4E4F534A) + js + struct.pack("<II", len(binb), 0x004E4942) + binb
open(A.out, "wb").write(out)
print("wrote", A.out, len(out), "bytes")
