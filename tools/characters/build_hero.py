"""Build a close-up capable hero head from a character sheet with MPFB2 (headless Blender).

    BLENDER_USER_EXTENSIONS=<dir with user_default/mpfb> .bvenv/bin/python -I tools/characters/build_hero.py \
        tools/characters/sheets/jibai.json OUT_DIR [--render] [--export] [--blend] [--fast]

What it makes (see tools/characters/README.md):
  * the MPFB base human fitted to the sheet's macros, height and face targets (CC0 data bundled with MPFB2);
  * its own eyeballs (sclera, iris, pupil, a bulged cornea), teeth and tongue from MPFB's helper geometry;
  * brows and lashes as single thin hair ribbons (cheap enough to ship), head hair as alpha cards grown on the
    scalp with a flow field (fringe forward and down, sides down and back), kept outside the skull;
  * face shapes from MPFB's bundled expression units, renamed to their nearest ARKit names;
  * --render: close-up portraits (front, three-quarter, profile, expressions) in Cycles;
  * --export: OUT_DIR/<id>-head.glb (head mesh with its shape keys, eyes, mouth, brows, lashes, hair cards).
"""
import bpy, addon_utils, bmesh, importlib, json, math, os, random, sys
from mathutils import Vector, Matrix
from mathutils import noise as mnoise
from mathutils.bvhtree import BVHTree

ARGS = sys.argv[1:]
SHEET_PATH, OUT = ARGS[0], ARGS[1]
FLAGS = set(a for a in ARGS[2:] if a.startswith("--"))
FAST = "--fast" in FLAGS
os.makedirs(OUT, exist_ok=True)
SHEET = json.load(open(SHEET_PATH))
RNG = random.Random(SHEET.get("seed", 7))

addon_utils.enable("bl_ext.user_default.mpfb", default_set=True)


def mpfb(path, key):
    for m in list(sys.modules):
        if m.endswith(path):
            return getattr(importlib.import_module(m), key)
    raise ImportError(path)


HumanService = mpfb("mpfb.services.humanservice", "HumanService")
TargetService = mpfb("mpfb.services.targetservice", "TargetService")
LocationService = mpfb("mpfb.services.locationservice", "LocationService")
HumanObjectProperties = mpfb("mpfb.entities.objectproperties", "HumanObjectProperties")
TARGETS = LocationService.get_mpfb_data("targets")

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


# ---------------------------------------------------------------------------------------------- body and face
def group_verts(obj, name, thresh=0.5):
    gi = obj.vertex_groups[name].index
    return [v.index for v in obj.data.vertices if any(g.group == gi and g.weight > thresh for g in v.groups)]


def eval_coords(obj):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = obj.evaluated_get(dg)
    me = ev.to_mesh()
    co = [v.co.copy() for v in me.vertices]
    ev.to_mesh_clear()
    return co


m = SHEET["macro"]
macro = TargetService.get_default_macro_info_dict()
for k in ("gender", "age", "muscle", "weight", "proportions"):
    macro[k] = m[k]
macro["race"] = dict(m["race"])
human = HumanService.create_human(macro_detail_dict=macro)
for mod in list(human.modifiers):
    if mod.type == "MASK":
        mod.show_viewport = mod.show_render = False
BODY = group_verts(human, "body")


def stature():
    co = eval_coords(human)
    zs = [co[i].z for i in BODY]
    return max(zs) - min(zs)


# fit the height macro to the sheet's height (stature to the top of the scalp, no hair)
lo, hi = 0.0, 1.0
for _ in range(9):
    mid = (lo + hi) / 2
    HumanObjectProperties.set_value("height", mid, entity_reference=human)
    TargetService.reapply_macro_details(human)
    if stature() < SHEET["height_m"]:
        lo = mid
    else:
        hi = mid
print("height macro %.3f -> %.3f m" % (mid, stature()))

for rel, w in SHEET["targets"].items():
    TargetService.load_target(human, os.path.join(TARGETS, rel + ".target.gz"), weight=w)

# bake the identity into a plain mesh (all helpers kept)
dg = bpy.context.evaluated_depsgraph_get()
baked = bpy.data.meshes.new_from_object(human.evaluated_get(dg))
hero = bpy.data.objects.new(SHEET["id"], baked)
scene.collection.objects.link(hero)
for vg in human.vertex_groups:
    hero.vertex_groups.new(name=vg.name)
for v in human.data.vertices:
    for g in v.groups:
        hero.vertex_groups[g.group].add([v.index], g.weight, "REPLACE")
bpy.data.objects.remove(human)
co = [v.co.copy() for v in hero.data.vertices]


def centroid(name):
    vs = group_verts(hero, name)
    return sum((co[i] for i in vs), Vector()) / len(vs), vs


group_verts_orig = {n: group_verts(hero, n) for n in ("helper-l-eyelashes-1", "helper-l-eyelashes-2",
                    "helper-r-eyelashes-1", "helper-r-eyelashes-2", "scalp")}
EYE_L, eyeL_vs = centroid("helper-l-eye")
EYE_R, eyeR_vs = centroid("helper-r-eye")
EYE_RAD = sum((co[i] - EYE_L).length for i in eyeL_vs) / len(eyeL_vs)
NECK, _ = centroid("joint-neck")
HEAD_J, _ = centroid("joint-head")
print("eye radius %.4f m" % EYE_RAD)

# ----------------------------------------------------------------------------- face shapes (expression units)
UNITS = os.path.join(TARGETS, "expression", "units", "asian")
# nearest ARKit name for each bundled MakeHuman expression unit (the faceunits01 pack, with the real 52, is not
# reachable from this build machine; swap when it is)
ARKIT_FROM_UNIT = {
    "eye-left-closure": "eyeBlinkLeft", "eye-right-closure": "eyeBlinkRight",
    "eye-left-slit": "eyeSquintLeft", "eye-right-slit": "eyeSquintRight",
    "eye-left-opened-up": "eyeWideLeft", "eye-right-opened-up": "eyeWideRight",
    "eyebrows-left-down": "browDownLeft", "eyebrows-right-down": "browDownRight",
    "eyebrows-left-extern-up": "browOuterUpLeft", "eyebrows-right-extern-up": "browOuterUpRight",
    "eyebrows-left-inner-up": "browInnerUpLeft", "eyebrows-right-inner-up": "browInnerUpRight",
    "eyebrows-left-up": "browUpLeft", "eyebrows-right-up": "browUpRight",
    "mouth-open": "jawOpen", "mouth-corner-puller": "mouthSmile", "mouth-depression": "mouthFrown",
    "mouth-pursing": "mouthPucker", "mouth-protusion": "mouthFunnel", "mouth-compression": "mouthPress",
    "mouth-retraction": "mouthStretch", "mouth-upward-retraction": "mouthUpperUp",
    "mouth-depression-retraction": "mouthLowerDown", "mouth-elevation": "mouthShrugLower",
    "mouth-eversion": "mouthRollOut", "mouth-parling": "mouthOpenLips", "mouth-part-later": "mouthLeftRight",
    "nose-left-elevation": "noseSneerLeft", "nose-right-elevation": "noseSneerRight",
    "nose-compression": "noseCompress", "nose-depression": "noseDown",
    "nose-left-dilatation": "nostrilFlareLeft", "nose-right-dilatation": "nostrilFlareRight",
    "neck-platysma": "neckTense",
}
GeneralObjectProperties = mpfb("mpfb.entities.objectproperties", "GeneralObjectProperties")
GeneralObjectProperties.set_value("scale_factor", 0.1, entity_reference=hero)  # targets are in MakeHuman decimetres
hero.shape_key_add(name="Basis", from_mix=False)
for unit, ark in ARKIT_FROM_UNIT.items():
    p = os.path.join(UNITS, unit + ".target.gz")
    if os.path.exists(p):
        TargetService.load_target(hero, p, weight=0.0, name=ark)
# MPFB names keys from the file; make sure ours carry the ARKit names
keys = hero.data.shape_keys.key_blocks
for kb in keys:
    for unit, ark in ARKIT_FROM_UNIT.items():
        if kb.name.endswith(unit) or kb.name == unit:
            kb.name = ark
print("face shapes:", [k.name for k in keys][1:])
# the neutral face: MakeHuman's rest mouth is slightly parted (a slit of teeth) and full; the sheet's rest_face
# mixes face shapes into the basis and every key alike, so the relaxed pose is the new zero
REST = SHEET.get("rest_face", {})
if REST:
    nv = len(hero.data.vertices)
    delta = [Vector((0, 0, 0)) for _ in range(nv)]
    for name, w in REST.items():
        kb = keys.get(name)
        if kb is None: continue
        for i in range(nv): delta[i] += (kb.data[i].co - keys[0].data[i].co) * w
    for kb in keys:
        for i in range(nv): kb.data[i].co = kb.data[i].co + delta[i]
    for i in range(nv): hero.data.vertices[i].co = hero.data.vertices[i].co + delta[i]
    print("rest face:", REST)

# expressions for the review renders, as weights of those shapes (eight from the character sheet)
EXPRESSIONS = {
    "neutral": {},
    "smile": {"mouthSmile": 0.7, "eyeSquintLeft": 0.25, "eyeSquintRight": 0.25, "browOuterUpLeft": 0.1,
              "browOuterUpRight": 0.1},
    "laugh": {"mouthSmile": 1.0, "jawOpen": 0.35, "eyeSquintLeft": 0.55, "eyeSquintRight": 0.55,
              "mouthUpperUp": 0.3},
    "serious": {"browDownLeft": 0.35, "browDownRight": 0.35, "mouthPress": 0.3, "eyeSquintLeft": 0.1,
                "eyeSquintRight": 0.1},
    "surprised": {"eyeWideLeft": 0.8, "eyeWideRight": 0.8, "browUpLeft": 0.8, "browUpRight": 0.8, "jawOpen": 0.3},
    "concerned": {"browInnerUpLeft": 0.75, "browInnerUpRight": 0.75, "mouthFrown": 0.3, "mouthPress": 0.2},
    "sad": {"browInnerUpLeft": 0.6, "browInnerUpRight": 0.6, "mouthFrown": 0.55, "eyeBlinkLeft": 0.25,
            "eyeBlinkRight": 0.25},
    "thinking": {"browDownLeft": 0.35, "browOuterUpRight": 0.4, "mouthPress": 0.25, "mouthLeftRight": 0.3,
                 "eyeSquintLeft": 0.2},
}


def set_expression(name):
    w = EXPRESSIONS[name]
    for kb in hero.data.shape_keys.key_blocks[1:]:
        kb.value = w.get(kb.name, 0.0)


# ------------------------------------------------------------------------------------------- split the parts
def split_group(names, newname):
    """Move the faces whose vertices are all in one of `names` into a new object (keeps shape keys)."""
    idx = set()
    for n in names:
        idx |= set(group_verts(hero, n))
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = hero
    hero.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="DESELECT")
    bpy.ops.object.mode_set(mode="OBJECT")
    for p in hero.data.polygons:
        p.select = all(v in idx for v in p.vertices)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.separate(type="SELECTED")
    bpy.ops.object.mode_set(mode="OBJECT")
    new = [o for o in bpy.context.selected_objects if o != hero][0]
    new.name = newname
    return new


def delete_group(names):
    idx = set()
    for n in names:
        idx |= set(group_verts(hero, n))
    bm = bmesh.new()
    bm.from_mesh(hero.data)
    bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[bm.verts[i] for i in idx], context="VERTS")
    bm.to_mesh(hero.data)
    bm.free()


bpy.context.view_layer.objects.active = hero
teeth = split_group(["helper-upper-teeth", "helper-lower-teeth"], "teeth")
# narrower and a little further back than MakeHuman's, so the side teeth stay behind the closed lips' corners
# (the gap at each corner showed them); every shape key alike, so a smile still shows them
TW, TB = SHEET.get("teeth_width", 1.0), SHEET.get("teeth_back", 0.0)
if TW != 1.0 or TB:
    for kb in (teeth.data.shape_keys.key_blocks if teeth.data.shape_keys else []):
        for d in kb.data: d.co = Vector((d.co.x * TW, d.co.y + TB, d.co.z))
    for v in teeth.data.vertices: v.co = Vector((v.co.x * TW, v.co.y + TB, v.co.z))
tongue = split_group(["helper-tongue"], "tongue")
# remove the rest of the helper geometry (eyes, lashes, tights, skirt, hair helper, joint cubes, genital helper)
helpers = [vg.name for vg in hero.vertex_groups if vg.name.startswith(("helper-", "joint-"))]
body_idx = set(group_verts(hero, "body"))
gone = [n for n in helpers if n not in ("helper-upper-teeth", "helper-lower-teeth", "helper-tongue")]
bm = bmesh.new()
bm.from_mesh(hero.data)
bm.verts.ensure_lookup_table()
deform = bm.verts.layers.deform.active
kill = []
names = {vg.index: vg.name for vg in hero.vertex_groups}
for v in bm.verts:
    groups = {names[g] for g, w in v[deform].items() if w > 0.5} if deform else set()
    if "body" not in groups:
        kill.append(v)
bmesh.ops.delete(bm, geom=kill, context="VERTS")
bm.to_mesh(hero.data)
bm.free()
hero.data.update()
for o in (hero, teeth, tongue):
    for p in o.data.polygons:
        p.use_smooth = True

bvh_head = BVHTree.FromObject(hero, bpy.context.evaluated_depsgraph_get())


# --------------------------------------------------------------------------------------------------- materials
def mat(name):
    mt = bpy.data.materials.new(name)
    mt.use_nodes = True
    return mt, mt.node_tree.nodes, mt.node_tree.links, mt.node_tree.nodes["Principled BSDF"]


def hairline(p):
    """1 where hair grows: above a hairline over the forehead and temples, round the ears, down to the nape."""
    face_front = p.y < HEAD_J.y - 0.045  # the front of the head
    if face_front:
        # a soft hairline (about 8 mm from bare skin to full hair; the shader breaks it up into wisps), low enough
        # that the forehead seen between the fringe's locks meets hair, not a bare band of skin
        hl = SHEET.get("hairline", {})   # lift_m: higher over the forehead; recede: how far the temples go back
        base = (EYE_L.z + 0.063 + hl.get("lift_m", 0.0) + 0.006 * hl.get("temple_rise", 1.0) * (abs(p.x) / 0.04) ** 2
                + 0.10 * hl.get("recede", 1.0) * max(0.0, abs(p.x) - 0.045)
                + 0.0028 * math.sin(p.x * 230.0 + 0.7) + 0.0014 * math.sin(p.x * 590.0 + 2.1))   # uneven, as real ones are
        return min(1.0, max(0.0, (p.z - base) / 0.010 + 0.5))
    side = abs(p.x) > 0.055
    if side and p.y < HEAD_J.y - 0.005:  # temples down to the top of the ear (sideburn to mid-ear)
        return 1.0 if p.z > EYE_L.z - 0.012 else 0.0
    if p.y >= HEAD_J.y - 0.005:  # behind the ears to the nape (short hair is cut down past the ear, not above it):
        # from mid-ear just behind the ear, curving down to the nape, with a soft, uneven edge
        t = min(1.0, max(0.0, (p.y - (HEAD_J.y - 0.005)) / 0.045))
        t = t * t * (3 - 2 * t)
        base = ((EYE_L.z - 0.012) * (1 - t) + (NECK.z + 0.045) * t
                + 0.002 * math.sin(p.x * 260.0 + p.y * 170.0) + 0.001 * math.sin(p.x * 610.0 + 1.3))
        return min(1.0, max(0.0, (p.z - base) / 0.008 + 0.5))
    return 1.0 if p.z > EYE_L.z + 0.03 else 0.0


def lip_core():
    """The lips group shrunk by one ring of vertices: MPFB's group runs past the vermilion into the skin."""
    lips = set(group_verts(hero, "lips", 0.3))
    nb = {i: set() for i in lips}
    for e in hero.data.edges:
        a, b = e.vertices
        if a in nb: nb[a].add(b)
        if b in nb: nb[b].add(a)
    return {i for i in lips if nb[i] <= lips}


LIP_CORE = lip_core()


def mouth_frame():
    """Where the lips part (z), the corners (x) and the lips' top and bottom on the centre line."""
    vs = [hero.data.vertices[i].co for i in LIP_CORE]
    mid = [v for v in vs if abs(v.x) < 0.004]
    lo, hi = min(v.z for v in mid), max(v.z for v in mid)
    # the lips part where the centre line reaches deepest into the mouth, in the middle of the lips' height
    inner = [v for v in mid if lo + 0.3 * (hi - lo) < v.z < hi - 0.3 * (hi - lo)]
    z = max(inner, key=lambda v: v.y).z
    return {"z": z, "x": max(abs(v.x) for v in vs), "top": hi, "bottom": lo, "front": min(v.y for v in vs)}


MOUTH = mouth_frame()


def smooth_region(sel, passes, k):
    """Laplacian passes over the vertices in sel; the same shift goes into every face shape."""
    co = [v.co.copy() for v in hero.data.vertices]
    nb = {i: [] for i in sel}
    for e in hero.data.edges:
        a, b = e.vertices
        if a in nb: nb[a].append(b)
        if b in nb: nb[b].append(a)
    new = list(co)
    for _ in range(passes):
        cur = list(new)
        for i in sel:
            if nb[i]:
                avg = sum((cur[j] for j in nb[i]), Vector()) / len(nb[i])
                new[i] = cur[i] + (avg - cur[i]) * k
    for i in sel:
        d = new[i] - co[i]
        hero.data.vertices[i].co = new[i]
        for kb in hero.data.shape_keys.key_blocks:
            kb.data[i].co = kb.data[i].co + d


def smooth_lower_corners(passes=8, k=0.5):
    """The relaxed pose (rest_face) bunches the skin just below and outside each end of the lower lip into a
    little crease; the baked occlusion turned it into a brown bracket round the lip's ends. Ironed out."""
    m = MOUTH
    lips = set(group_verts(hero, "lips", 0.3))
    sel = [v.index for v in hero.data.vertices if v.index not in lips
           and m["x"] * 0.8 < abs(v.co.x) < m["x"] * 1.5 and m["bottom"] - 0.005 < v.co.z < m["z"] + 0.001
           and v.co.y < m["front"] + 0.02 and v.normal.y < 0]
    smooth_region(sel, passes, k)
    print("smoothed below the lip corners:", len(sel), "vertices")


def smooth_corners(passes=3, k=0.5):
    """MakeHuman's lips roll in at each corner in a tiny ledge that faces the light and shows as a pale fleck in
    the gap between the lips; a few Laplacian passes over the corners (the same shift in every face shape)
    iron it out."""
    m = MOUTH
    co = [v.co.copy() for v in hero.data.vertices]
    sel = [i for i, c in enumerate(co) if m["x"] * 0.55 < abs(c.x) < m["x"] * 1.08
           and -0.004 < c.z - m["z"] < 0.008 and c.y < m["front"] + 0.0095 and hero.data.vertices[i].normal.y < -0.2]
    nb = {i: [] for i in sel}
    for e in hero.data.edges:
        a, b = e.vertices
        if a in nb: nb[a].append(b)
        if b in nb: nb[b].append(a)
    new = list(co)
    for _ in range(passes):
        cur = list(new)
        for i in sel:
            if nb[i]:
                avg = sum((cur[j] for j in nb[i]), Vector()) / len(nb[i])
                new[i] = cur[i] + (avg - cur[i]) * k
    for i in sel:
        d = new[i] - co[i]
        hero.data.vertices[i].co = new[i]
        for kb in hero.data.shape_keys.key_blocks:
            kb.data[i].co = kb.data[i].co + d
    print("smoothed mouth corners:", len(sel), "vertices")


smooth_corners()
smooth_lower_corners()


def mouth_detail(c, on_lip, n=None):
    """(darken 0..1, upper lip 0/1) for one vertex: the line where the lips meet, the shadowed corners, the
    shadow under the lower lip and the philtrum's groove."""
    m = MOUTH
    g = lambda d, r: math.exp(-(d / r) ** 2)
    ax = abs(c.x)
    inside = 1.0 if ax < m["x"] * 0.96 else g(ax - m["x"] * 0.96, 0.002)
    line = g(c.z - m["z"], 0.001) * (0.75 * inside if on_lip else 0.3)   # faint off the lips
    # a small shadowed dimple right at each corner (wider, it read as a brown smear down from the corner)
    corner = 0.3 * g(math.hypot(ax - m["x"] * 0.97, c.z - m["z"]), 0.0016)
    under = 0.45 * g(c.z - (m["bottom"] - 0.0028), 0.0022) * g(c.x, 0.011) * (0.0 if on_lip else 1.0)
    philtrum = 0.3 * g(c.x, 0.0028) * (1.0 if m["top"] + 0.001 < c.z < m["top"] + 0.012 else 0.0) * (0.0 if on_lip else 1.0)
    # the inside of the lips and the mouth: dark, so the folds at the corners don't show as light flecks
    mouth_in = 0.0
    if n is not None and ax < m["x"] * 1.3 and abs(c.z - m["z"]) < 0.01 and c.y < m["front"] + 0.04:
        if n.y > 0.05:                                               # faces back, into the mouth
            mouth_in = min(1.0, (n.y - 0.05) / 0.25)
        if ax < m["x"] * 1.02 and n.y > -0.35:                       # deep in between the lips: the mouth's walls
            # (not the skin outside the corners, which faces forward: the face curves back there as deep as the
            # walls, and darkened it showed as a brown bracket round each end of the lower lip)
            mouth_in = max(mouth_in, min(1.0, max(0.0, (c.y - m["front"] - 0.011) / 0.003)))
    return min(1.0, line + corner + under + philtrum + mouth_in), (1.0 if c.z > m["z"] else 0.0)


def photo_image(spec, key):
    """One of the sheet's reference photos, its alpha 1 where it shows the face's own skin: everything inside the
    face's inner oval (eyes, brows, nose, mouth, chin), and outside it only skin-coloured pixels (not the hair
    falling across the cheeks and temples, not the grey backdrop). Returns the image and its median skin colour."""
    import numpy as np
    img = bpy.data.images.load(os.path.abspath(spec["file"]), check_existing=False)
    img.name = "photo-" + key
    W, H = img.size
    px = np.array(img.pixels[:], np.float32).reshape(H, W, 4)   # (rows from the bottom; linear colour)
    rows = lambda y: H - 1 - int(y)
    samp = np.concatenate([px[rows(y1):rows(y0), x0:x1, :3].reshape(-1, 3) for x0, y0, x1, y1 in spec["skin_boxes"]])
    med = np.median(samp, axis=0)
    lum = px[..., :3] @ np.array([0.3, 0.55, 0.15], np.float32)
    lm = float(med @ np.array([0.3, 0.55, 0.15]))
    chroma = (px[..., 0] - px[..., 2]) / np.maximum(px[..., 0], 1e-3)
    cm = float((med[0] - med[2]) / max(med[0], 1e-3))
    sstep = lambda a, b, x: np.clip((x - a) / (b - a), 0, 1) ** 2 * (3 - 2 * np.clip((x - a) / (b - a), 0, 1))
    skin = sstep(0.5, 0.75, lum / lm) * sstep(0.45 * cm, 0.75 * cm, chroma) * (1 - sstep(1.5, 1.9, lum / lm))
    cx, cy, rx, ry = spec["inner"]
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.sqrt(((xx - cx) / rx) ** 2 + (((H - 1 - yy) - cy) / ry) ** 2)
    inner = 1 - sstep(0.7, 1.1, d)
    # (outside the oval, the photos are mostly hair across the skin, its highlights as warm as skin: the oval only,
    # unless the sheet says its sides are clear)
    px[..., 3] = np.maximum(inner, skin) if spec.get("sides_clear") else inner
    img.pixels[:] = px.ravel()
    img.pack()
    print("photo %s: median skin (sRGB) %s" % (key, np.round(med, 3)))
    return img, med


def photo_skin(N, L, under):
    """The face from the sheet's reference photos (Mars's own character sheet): the front view projected straight
    on, the side view on the cheeks and jaw from both sides, each where the surface faces its camera. Feature by
    feature, not one scale: the photo's eyes, mouth and chin land on the mesh's eyes, mouth and chin (a warp in
    x from the eyes' spacing to the mouth's width, and in height through those three). Outside the photo's reach
    (hairline, ears, the back of the jaw, below the chin) the painted skin, toned to the photo's, carries on."""
    ph = SHEET["photo"]
    fr, sd = ph["front"], ph["side"]
    cols = {}
    imgF, medF = photo_image(fr, "front")
    imgS, medS = photo_image(sd, "side") if sd else (None, None)
    vs = hero.data.vertices
    # the mesh's landmarks: eye centres (their front for the profile), the mouth, the chin, the nose's tip
    side_sign = 1.0 if EYE_L.x > EYE_R.x else -1.0
    eye_z = (EYE_L.z + EYE_R.z) / 2
    eye_front = (EYE_L.y + EYE_R.y) / 2 - EYE_RAD * 0.9
    centre = [v.co for v in vs if abs(v.co.x) < 0.006]
    chin_z = min(c.z for c in centre if c.y < MOUTH["front"] + 0.03 and c.z > NECK.z)
    nose_y = min(c.y for c in centre if eye_z - 0.065 < c.z < eye_z - 0.015)
    print("photo landmarks: eye z %.4f mouth z %.4f chin z %.4f mouth half %.4f eye half %.4f" %
          (eye_z, MOUTH["z"], chin_z, MOUTH["x"], abs(EYE_L.x - EYE_R.x) / 2))
    def vmap(z, eye_px, mouth_px, chin_px):
        k = (mouth_px - eye_px) / (eye_z - MOUTH["z"])
        if z >= MOUTH["z"]:
            return eye_px + (eye_z - z) * k
        k2 = (chin_px - mouth_px) / max(MOUTH["z"] - chin_z, 1e-4)
        return mouth_px + (MOUTH["z"] - z) * k2
    sxE = (fr["eye_l"][0] - fr["eye_r"][0]) / abs(EYE_L.x - EYE_R.x)
    sxM = fr["mouth_half"] / MOUTH["x"]
    cxF = (fr["eye_l"][0] + fr["eye_r"][0]) / 2
    WF, HF = imgF.size
    if sd:
        WS, HS = imgS.size
        sy = (sd["eye"][0] - sd["nose"][0]) / (eye_front - nose_y)
    ca = hero.data.color_attributes.new("photo", "FLOAT_COLOR", "POINT")
    cw = hero.data.color_attributes.new("photow", "FLOAT_COLOR", "POINT")
    ears = set(group_verts(hero, "ears", 0.3))
    for i, v in enumerate(vs):
        c, n = v.co, v.normal
        t = min(1.0, max(0.0, (eye_z - c.z) / (eye_z - MOUTH["z"])))
        uF = cxF + side_sign * c.x * (sxE + (sxM - sxE) * t)
        vF = vmap(c.z, fr["eye_l"][1], fr["mouth"][1], fr["chin_y"])
        uS = vS = 0.0
        if sd:
            uS = sd["eye"][0] + (c.y - eye_front) * sy
            vS = vmap(c.z, sd["eye"][1], sd["mouth"][1], sd["chin_y"])
        f = max(0.0, -n.y) ** 2
        sw = max(0.0, abs(n.x)) ** 2 if sd else 0.0
        wf = f / max(f + sw, 1e-6) * min(1.0, (f + sw) * 3)
        ws = sw / max(f + sw, 1e-6) * min(1.0, (f + sw) * 3)
        # where the photo reaches: the face, not the scalp, the ears, behind the jaw or under the chin
        reach = 1.0 - hairline(c) if c.z > NECK.z + 0.04 else 0.0
        reach *= min(1.0, max(0.0, (c.z - (chin_z - 0.004)) / 0.016))   # (under the jaw the photos show the neck in shadow, or the background beside it)
        reach *= min(1.0, max(0.0, ((HEAD_J.y - 0.01) - c.y) / 0.025))
        if i in ears:
            reach = 0.0
        ca.data[i].color = (uF / WF, 1 - vF / HF, uS / WS if sd else 0, 1 - vS / HS if sd else 0)
        cw.data[i].color = (wf, ws, reach, 0)
    pa = N.new("ShaderNodeAttribute"); pa.attribute_name = "photo"
    pw = N.new("ShaderNodeAttribute"); pw.attribute_name = "photow"
    psep = N.new("ShaderNodeSeparateColor"); L.new(pa.outputs["Color"], psep.inputs[0])
    wsep = N.new("ShaderNodeSeparateColor"); L.new(pw.outputs["Color"], wsep.inputs[0])
    chan = [psep.outputs[0], psep.outputs[1], psep.outputs[2], pa.outputs["Alpha"]]
    def sample(img, ui, vi):
        cmb = N.new("ShaderNodeCombineXYZ")
        L.new(chan[ui], cmb.inputs[0]); L.new(chan[vi], cmb.inputs[1])
        tx = N.new("ShaderNodeTexImage"); tx.image = img; tx.interpolation = "Cubic"; tx.extension = "CLIP"
        L.new(cmb.outputs[0], tx.inputs["Vector"])
        return tx
    # the painted skin underneath, toned to the photo's median skin, so where the photo stops nothing changes
    base = Vector(SHEET["skin"]["base"])
    tone = N.new("ShaderNodeMix"); tone.data_type = "RGBA"; tone.blend_type = "MULTIPLY"; tone.inputs["Factor"].default_value = 1.0
    tone.inputs["B"].default_value = (*[float(medF[k]) ** 2.2 / max(base[k], 1e-3) for k in range(3)], 1)   # (pixels: sRGB)
    L.new(under.outputs["Result"], tone.inputs["A"])
    last = tone
    for img, ui, vi, wi in ((imgS, 2, 3, 1), (imgF, 0, 1, 0)):
        if img is None: continue
        tx = sample(img, ui, vi)
        fac = N.new("ShaderNodeMath"); fac.operation = "MULTIPLY"
        L.new(tx.outputs["Alpha"], fac.inputs[0]); L.new(wsep.outputs[wi], fac.inputs[1])
        fac2 = N.new("ShaderNodeMath"); fac2.operation = "MULTIPLY"
        L.new(fac.outputs[0], fac2.inputs[0]); L.new(wsep.outputs[2], fac2.inputs[1])
        mx = N.new("ShaderNodeMix"); mx.data_type = "RGBA"
        L.new(fac2.outputs[0], mx.inputs["Factor"]); L.new(last.outputs["Result"], mx.inputs["A"]); L.new(tx.outputs["Color"], mx.inputs["B"])
        last = mx
    return last


def skin_material():
    s = SHEET["skin"]
    mt, N, L, bs = mat("skin")
    out = N["Material Output"]
    # lips and ear/nose redness from MPFB's vertex groups, as a colour attribute
    ca = hero.data.color_attributes.new("tint", "FLOAT_COLOR", "POINT")
    lips = LIP_CORE
    ears = set(group_verts(hero, "ears", 0.3))
    for i, v in enumerate(hero.data.vertices):
        r = 1.0 if i in lips else 0.0
        g = 1.0 if i in ears else 0.0
        # stubble shadow: lower face below the nose and above the neck, front half
        c = v.co
        stub = 0.0
        if NECK.z + 0.035 < c.z < EYE_L.z - 0.045 and c.y < EYE_L.y + 0.035:
            stub = 1.0
        # (not on the ear itself: it sticks out above the hairline, and hair painted on it read as a black cap)
        scalp_t = hairline(c) if c.z > NECK.z + 0.04 and i not in ears else 0.0
        ca.data[i].color = (r, g, max(stub, 0.0), scalp_t)
    # regional colour: warmth on the cheeks, nose tip and ears; shadow under the eyes and in the eye sockets
    ca2 = hero.data.color_attributes.new("region", "FLOAT_COLOR", "POINT")
    def blob(c, centre, rad):
        return math.exp(-((c - centre).length / rad) ** 2)
    eyes_c = (EYE_L, EYE_R)
    nose_tip = Vector((0.0, min(v.co.y for v in hero.data.vertices if abs(v.co.x) < 0.01 and EYE_L.z - 0.06 < v.co.z < EYE_L.z - 0.02), EYE_L.z - 0.045))
    for i, v in enumerate(hero.data.vertices):
        c = v.co
        warm = 0.0; shade = 0.0
        for e in eyes_c:
            cheek = Vector((e.x * 1.25, e.y - 0.004, e.z - 0.032))
            warm = max(warm, 0.8 * blob(c, cheek, 0.022))
            under = Vector((e.x, e.y - 0.006, e.z - 0.014))
            shade = max(shade, blob(c, under, 0.011))
        warm = max(warm, 0.9 * blob(c, nose_tip, 0.012))
        dark, upper = mouth_detail(c, i in lips, v.normal)
        ca2.data[i].color = (warm, shade, dark, upper)
    reg = N.new("ShaderNodeAttribute"); reg.attribute_name = "region"
    regs = N.new("ShaderNodeSeparateColor"); L.new(reg.outputs["Color"], regs.inputs[0])
    attr = N.new("ShaderNodeAttribute"); attr.attribute_name = "tint"
    sep = N.new("ShaderNodeSeparateColor"); L.new(attr.outputs["Color"], sep.inputs[0])
    base = N.new("ShaderNodeRGB"); base.outputs[0].default_value = (*s["base"], 1)
    lipc = N.new("ShaderNodeRGB"); lipc.outputs[0].default_value = (*s["lips"], 1)
    # mottling: low-frequency colour variation
    tex = N.new("ShaderNodeTexCoord")
    noise = N.new("ShaderNodeTexNoise"); noise.inputs["Scale"].default_value = 60.0
    noise.inputs["Detail"].default_value = 4.0
    L.new(tex.outputs["Object"], noise.inputs["Vector"])
    mot = N.new("ShaderNodeMix"); mot.data_type = "RGBA"; mot.blend_type = "MULTIPLY"
    mot.inputs["Factor"].default_value = 0.10
    L.new(base.outputs[0], mot.inputs["A"]); L.new(noise.outputs["Color"], mot.inputs["B"])
    redc = N.new("ShaderNodeRGB"); redc.outputs[0].default_value = (0.78, 0.47, 0.40, 1)
    red = N.new("ShaderNodeMix"); red.data_type = "RGBA"
    mg = N.new("ShaderNodeMath"); mg.operation = "MULTIPLY"; mg.inputs[1].default_value = 0.35
    L.new(sep.outputs["Green"], mg.inputs[0]); L.new(mg.outputs[0], red.inputs["Factor"])
    wm = N.new("ShaderNodeMix"); wm.data_type = "RGBA"
    wm.inputs["B"].default_value = (0.62, 0.30, 0.25, 1)
    wf = N.new("ShaderNodeMath"); wf.operation = "MULTIPLY"; wf.inputs[1].default_value = SHEET["skin"].get("blush", 0.35)
    L.new(regs.outputs["Red"], wf.inputs[0]); L.new(wf.outputs[0], wm.inputs["Factor"])
    L.new(mot.outputs["Result"], wm.inputs["A"])
    sh = N.new("ShaderNodeMix"); sh.data_type = "RGBA"
    sh.inputs["B"].default_value = (0.30, 0.19, 0.16, 1)
    sf = N.new("ShaderNodeMath"); sf.operation = "MULTIPLY"; sf.inputs[1].default_value = SHEET["skin"].get("under_eye", 0.35)
    L.new(regs.outputs["Green"], sf.inputs[0]); L.new(sf.outputs[0], sh.inputs["Factor"])
    L.new(wm.outputs["Result"], sh.inputs["A"])
    L.new(sh.outputs["Result"], red.inputs["A"]); L.new(redc.outputs[0], red.inputs["B"])
    # the lips: a crisp vermilion border (the vertex mask, thresholded), the upper lip darker than the lower
    lipm = N.new("ShaderNodeMapRange"); lipm.inputs["From Min"].default_value = 0.3; lipm.inputs["From Max"].default_value = 0.7
    L.new(sep.outputs["Red"], lipm.inputs["Value"])
    lipu = N.new("ShaderNodeRGB"); lipu.outputs[0].default_value = (*s.get("lips_upper", s["lips"]), 1)
    lipcol = N.new("ShaderNodeMix"); lipcol.data_type = "RGBA"
    L.new(reg.outputs["Alpha"], lipcol.inputs["Factor"])
    L.new(lipc.outputs[0], lipcol.inputs["A"]); L.new(lipu.outputs[0], lipcol.inputs["B"])
    lip0 = N.new("ShaderNodeMix"); lip0.data_type = "RGBA"
    L.new(lipm.outputs[0], lip0.inputs["Factor"])
    L.new(red.outputs["Result"], lip0.inputs["A"]); L.new(lipcol.outputs["Result"], lip0.inputs["B"])
    # the lip line, the corners, under the lower lip, the philtrum
    lip = N.new("ShaderNodeMix"); lip.data_type = "RGBA"; lip.blend_type = "MULTIPLY"
    lip.inputs["B"].default_value = (0.32, 0.17, 0.15, 1)
    L.new(regs.outputs["Blue"], lip.inputs["Factor"]); L.new(lip0.outputs["Result"], lip.inputs["A"])
    # stubble: fine dark speckle where the beard grows (he is clean-shaven: a shadow, not a beard)
    vor = N.new("ShaderNodeTexVoronoi"); vor.inputs["Scale"].default_value = 1400.0
    L.new(tex.outputs["Object"], vor.inputs["Vector"])
    st = N.new("ShaderNodeMath"); st.operation = "LESS_THAN"; st.inputs[1].default_value = 0.22
    L.new(vor.outputs["Distance"], st.inputs[0])
    st2 = N.new("ShaderNodeMath"); st2.operation = "MULTIPLY"
    L.new(st.outputs[0], st2.inputs[0]); L.new(sep.outputs["Blue"], st2.inputs[1])
    st3 = N.new("ShaderNodeMath"); st3.operation = "MULTIPLY"; st3.inputs[1].default_value = s.get("stubble", 0.1) * 3
    L.new(st2.outputs[0], st3.inputs[0])
    stc = N.new("ShaderNodeMix"); stc.data_type = "RGBA"
    stc.inputs["B"].default_value = (0.25, 0.19, 0.16, 1)
    L.new(st3.outputs[0], stc.inputs["Factor"]); L.new(lip.outputs["Result"], stc.inputs["A"])
    scalpc = N.new("ShaderNodeMix"); scalpc.data_type = "RGBA"
    scalpc.inputs["B"].default_value = (0.018, 0.013, 0.010, 1)   # the hair's own near-black (roots, not a tan)
    if SHEET["hair"].get("style") == "shell":   # (a generated cut in a lighter colour: its own roots, darker)
        scalpc.inputs["B"].default_value = (*[c * 0.55 for c in SHEET["hair"]["color"]], 1)
    # the hairline as hair: fine noise stretched along the hair's fall breaks the soft edge into wisps and roots
    hn = N.new("ShaderNodeTexNoise"); hn.inputs["Scale"].default_value = 1.0; hn.inputs["Detail"].default_value = 4.0
    hmap = N.new("ShaderNodeMapping"); hmap.inputs["Scale"].default_value = (900.0, 900.0, 140.0)
    htc = N.new("ShaderNodeTexCoord"); L.new(htc.outputs["Object"], hmap.inputs["Vector"]); L.new(hmap.outputs[0], hn.inputs["Vector"])
    hsum = N.new("ShaderNodeMath"); hsum.operation = "ADD"
    L.new(attr.outputs["Alpha"], hsum.inputs[0])
    hoff = N.new("ShaderNodeMath"); hoff.operation = "MULTIPLY_ADD"; hoff.inputs[1].default_value = 0.7; hoff.inputs[2].default_value = -0.35
    L.new(hn.outputs["Fac"], hoff.inputs[0]); L.new(hoff.outputs[0], hsum.inputs[1])
    hcl = N.new("ShaderNodeMapRange"); hcl.inputs["From Min"].default_value = 0.25; hcl.inputs["From Max"].default_value = 0.75
    L.new(hsum.outputs[0], hcl.inputs["Value"])
    sm = N.new("ShaderNodeMath"); sm.operation = "MULTIPLY"; sm.inputs[1].default_value = 1.0
    L.new(hcl.outputs["Result"], sm.inputs[0]); L.new(sm.outputs[0], scalpc.inputs["Factor"])
    # moles (sheet skin "moles": [dx, dz] from her left eye, in metres), small and soft-edged, on the skin's surface
    last = stc
    for mx, mz in s.get("moles", []):
        hit = bvh_head.ray_cast(Vector((EYE_L.x + mx, EYE_L.y - 0.2, EYE_L.z + mz)), Vector((0, 1, 0)))
        if hit[0] is None:
            continue
        dv = N.new("ShaderNodeVectorMath"); dv.operation = "DISTANCE"; dv.inputs[1].default_value = hit[0]
        L.new(tex.outputs["Object"], dv.inputs[0])
        mr = N.new("ShaderNodeMapRange"); mr.inputs["From Min"].default_value = 0.0008; mr.inputs["From Max"].default_value = 0.0016
        mr.inputs["To Min"].default_value = 0.85; mr.inputs["To Max"].default_value = 0.0
        L.new(dv.outputs["Value"], mr.inputs["Value"])
        mm = N.new("ShaderNodeMix"); mm.data_type = "RGBA"; mm.inputs["B"].default_value = (0.12, 0.07, 0.05, 1)
        L.new(mr.outputs["Result"], mm.inputs["Factor"]); L.new(last.outputs["Result"], mm.inputs["A"])
        last = mm
    if SHEET.get("photo"):
        last = photo_skin(N, L, last)
    L.new(last.outputs["Result"], scalpc.inputs["A"])
    L.new(scalpc.outputs["Result"], bs.inputs["Base Color"])
    bs.inputs["Subsurface Weight"].default_value = 0.35
    bs.inputs["Subsurface Radius"].default_value = s["subsurface_radius"]
    bs.inputs["Subsurface Scale"].default_value = 0.006
    # roughness: a little shinier on the T-zone and lips is left to the texture pass; pores break it up here
    pores = N.new("ShaderNodeTexVoronoi"); pores.inputs["Scale"].default_value = 2600.0
    pores.feature = "F1"
    L.new(tex.outputs["Object"], pores.inputs["Vector"])
    rr = N.new("ShaderNodeMapRange")
    rr.inputs["To Min"].default_value = s["roughness"] - 0.06
    rr.inputs["To Max"].default_value = s["roughness"] + 0.08
    L.new(pores.outputs["Distance"], rr.inputs["Value"])
    # the scalp under the hair is matte (shiny, the dark hairline caught the light as a pale band)
    rsc = N.new("ShaderNodeMix"); rsc.data_type = "FLOAT"; rsc.inputs["B"].default_value = 0.95
    L.new(rr.outputs[0], rsc.inputs["A"]); L.new(sm.outputs[0], rsc.inputs["Factor"])
    L.new(rsc.outputs["Result"], bs.inputs["Roughness"])
    bs.inputs["Specular IOR Level"].default_value = 0.45
    bump = N.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.18
    bump.inputs["Distance"].default_value = 0.0004
    fine = N.new("ShaderNodeTexNoise"); fine.inputs["Scale"].default_value = 900.0
    L.new(tex.outputs["Object"], fine.inputs["Vector"])
    hm = N.new("ShaderNodeMath"); hm.operation = "ADD"
    L.new(pores.outputs["Distance"], hm.inputs[0]); L.new(fine.outputs["Fac"], hm.inputs[1])
    L.new(hm.outputs[0], bump.inputs["Height"]); L.new(bump.outputs[0], bs.inputs["Normal"])
    return mt


hero.data.materials.append(skin_material())
mt, N, L, bs = mat("teeth"); bs.inputs["Base Color"].default_value = (0.55, 0.50, 0.44, 1)   # in the mouth's shadow
bs.inputs["Roughness"].default_value = 0.25; teeth.data.materials.append(mt)
mt, N, L, bs = mat("tongue"); bs.inputs["Base Color"].default_value = (0.55, 0.22, 0.22, 1)
bs.inputs["Roughness"].default_value = 0.35; bs.inputs["Subsurface Weight"].default_value = 0.4
tongue.data.materials.append(mt)


# -------------------------------------------------------------------------------------------------------- eyes
def uv_sphere(name, r, center):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bm.loops.layers.uv.new("UVMap")
    bmesh.ops.create_uvsphere(bm, u_segments=28, v_segments=18, radius=r, calc_uvs=True)
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(90), 3, "X"))
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    ob.location = center
    return ob


def make_eye(center, name, side, aim=None):
    r = SHEET["eyes"].get("radius_m", 0.0120)  # MPFB's helper sphere is a fitting volume, larger than an eye
    ball = uv_sphere(name, r, center)  # poles on the Y axis: the front pole looks down -Y
    for p in ball.data.polygons:
        p.use_smooth = True
    e = SHEET["eyes"]
    mt, N, L, bs = mat(name + "-ball")
    tc = N.new("ShaderNodeTexCoord")
    sepx = N.new("ShaderNodeSeparateXYZ"); L.new(tc.outputs["Object"], sepx.inputs[0])
    # angle from the front axis, from the object-space coordinates
    dist = N.new("ShaderNodeVectorMath"); dist.operation = "LENGTH"
    comb = N.new("ShaderNodeCombineXYZ")
    L.new(sepx.outputs["X"], comb.inputs["X"]); L.new(sepx.outputs["Z"], comb.inputs["Y"])
    L.new(comb.outputs[0], dist.inputs[0])
    rad = N.new("ShaderNodeMath"); rad.operation = "DIVIDE"; rad.inputs[1].default_value = r
    L.new(dist.outputs["Value"], rad.inputs[0])
    front = N.new("ShaderNodeMath"); front.operation = "LESS_THAN"; front.inputs[1].default_value = 0.0
    L.new(sepx.outputs["Y"], front.inputs[0])
    ramp = N.new("ShaderNodeValToRGB")
    els = ramp.color_ramp.elements
    els[0].position = 0.0; els[0].color = (0.004, 0.004, 0.004, 1)       # pupil
    els[1].position = 0.17; els[1].color = (0.004, 0.004, 0.004, 1)
    for pos, col in ((0.19, (*e["iris"], 1)), (0.40, (*e["iris"], 1)), (0.49, (*e["iris_outer"], 1)),
                     (0.53, (0.66, 0.62, 0.59, 1)), (1.0, (0.50, 0.45, 0.43, 1))):
        el = ramp.color_ramp.elements.new(pos); el.color = col
    L.new(rad.outputs[0], ramp.inputs["Fac"])
    back = N.new("ShaderNodeMix"); back.data_type = "RGBA"
    back.inputs["A"].default_value = (0.7, 0.6, 0.6, 1)
    L.new(front.outputs[0], back.inputs["Factor"]); L.new(ramp.outputs["Color"], back.inputs["B"])
    # iris fibres
    fib = N.new("ShaderNodeTexNoise"); fib.inputs["Scale"].default_value = 900.0
    fib.inputs["Detail"].default_value = 6.0
    L.new(tc.outputs["Object"], fib.inputs["Vector"])
    fm = N.new("ShaderNodeMix"); fm.data_type = "RGBA"; fm.blend_type = "OVERLAY"
    fm.inputs["Factor"].default_value = 0.35
    L.new(back.outputs["Result"], fm.inputs["A"]); L.new(fib.outputs["Color"], fm.inputs["B"])
    # the upper lid and lashes shade the top of the eyeball (an evenly white sclera reads as a stare)
    lid = N.new("ShaderNodeMapRange")
    lid.inputs["From Min"].default_value = -0.25 * r; lid.inputs["From Max"].default_value = 0.45 * r
    lid.inputs["To Min"].default_value = 1.0; lid.inputs["To Max"].default_value = 0.5
    L.new(sepx.outputs["Z"], lid.inputs["Value"])
    shade = N.new("ShaderNodeMix"); shade.data_type = "RGBA"; shade.blend_type = "MULTIPLY"
    shade.inputs["Factor"].default_value = 1.0
    L.new(fm.outputs["Result"], shade.inputs["A"])
    lidc = N.new("ShaderNodeCombineColor")
    for ch in ("Red", "Green", "Blue"):
        L.new(lid.outputs["Result"], lidc.inputs[ch])
    L.new(lidc.outputs["Color"], shade.inputs["B"])
    L.new(shade.outputs["Result"], bs.inputs["Base Color"])
    bs.inputs["Roughness"].default_value = 0.3
    bs.inputs["Subsurface Weight"].default_value = 0.2
    ball.data.materials.append(mt)
    # cornea: a clear shell, bulged in front of the iris
    cor = uv_sphere(name + "-cornea", r * 1.015, center)
    for v in cor.data.vertices:
        d = (v.co).normalized()
        a = max(0.0, -d.y - 0.80) / 0.20  # within ~37 degrees of the front pole
        v.co += d * (r * 0.09 * a * a)
    for p in cor.data.polygons:
        p.use_smooth = True
    mt, N, L, bs = mat(name + "-cornea")
    bs.inputs["Transmission Weight"].default_value = 1.0
    bs.inputs["Roughness"].default_value = 0.0
    bs.inputs["IOR"].default_value = 1.376
    bs.inputs["Base Color"].default_value = (1, 1, 1, 1)
    mt.blend_method = "HASHED" if hasattr(mt, "blend_method") else None
    cor.data.materials.append(mt)
    if aim is not None:
        q = Vector((0, -1, 0)).rotation_difference((aim - center).normalized())
        for o in (ball, cor):
            o.rotation_mode = "QUATERNION"; o.rotation_quaternion = q
    return ball, cor


def eye_centre(vs, c):
    r = SHEET["eyes"].get("radius_m", 0.0120)
    front = min(co[i].y for i in vs)
    return Vector((c.x, front + r * 1.02, c.z))


def lid_centre(side):
    vs = group_verts_orig["helper-%s-eyelashes-1" % side] + group_verts_orig["helper-%s-eyelashes-2" % side]
    return sum((co[i] for i in vs), Vector()) / len(vs)


_cl, _cr = eye_centre(eyeL_vs, EYE_L), eye_centre(eyeR_vs, EYE_R)
eyes = list(make_eye(_cl, "eye-l", 1, lid_centre("l"))) + list(make_eye(_cr, "eye-r", -1, lid_centre("r")))


# ------------------------------------------------------------------------------- hair strands as thin ribbons
def surface_sample(vids, count, weight_fn=None, tries=40):
    """Random points on the hero faces whose vertices are all in vids, area weighted, kept with weight_fn."""
    import bisect
    me = hero.data
    vs = set(vids)
    me.calc_loop_triangles()
    tris, cum, total = [], [], 0.0
    for t in me.loop_triangles:
        if all(v in vs for v in t.vertices):
            a, b, c = (me.vertices[i].co.copy() for i in t.vertices)
            total += t.area
            tris.append((a, b, c, t.normal.copy())); cum.append(total)
    out = []
    for _ in range(count * tries):
        a, b, c, n = tris[min(bisect.bisect(cum, RNG.random() * total), len(tris) - 1)]
        u, v = RNG.random(), RNG.random()
        if u + v > 1:
            u, v = 1 - u, 1 - v
        p = a + (b - a) * u + (c - a) * v
        if weight_fn is None or RNG.random() < weight_fn(p):
            out.append((p, n))
            if len(out) >= count:
                break
    return out


def near_verts(center, radius):
    return [v.index for v in hero.data.vertices if (v.co - center).length < radius]


def ribbon(points, widths, normal, verts, faces, uvs, u0=0.0, u1=1.0):
    """A strip through points, facing `normal` (per point list or one vector)."""
    n = len(points)
    base = len(verts)
    for i, p in enumerate(points):
        t = (points[min(i + 1, n - 1)] - points[max(i - 1, 0)]).normalized()
        nn = normal[i] if isinstance(normal, list) else normal
        side = t.cross(nn).normalized() * widths[i] * 0.5
        verts += [p - side, p + side]
        v = i / (n - 1)
        uvs += [(u0, v), (u1, v)]
    for i in range(n - 1):
        a = base + 2 * i
        faces.append((a, a + 1, a + 3, a + 2))


def push_out(p, margin):
    loc, nrm, _, _ = bvh_head.find_nearest(p)
    if loc is None:
        return p
    d = p - loc
    if d.dot(nrm) < margin:
        return loc + nrm * margin
    return p


def make_mesh(name, verts, faces, uvs, material):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    uvl = me.uv_layers.new(name="UVMap")
    for poly in me.polygons:
        for li in poly.loop_indices:
            uvl.data[li].uv = uvs[me.loops[li].vertex_index]
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    ob.data.materials.append(material)
    return ob


def hair_material(name, color, alpha_img=None, strand=False):
    mt, N, L, bs = mat(name)
    bs.inputs["Base Color"].default_value = (*color, 1)
    bs.inputs["Roughness"].default_value = 0.62
    bs.inputs["Specular IOR Level"].default_value = 0.22
    if alpha_img is not None:
        tx = N.new("ShaderNodeTexImage"); tx.image = alpha_img
        L.new(tx.outputs["Alpha"], bs.inputs["Alpha"])
        L.new(tx.outputs["Color"], bs.inputs["Base Color"])  # the texture carries the colour (glTF-friendly)
    if hasattr(mt, "surface_render_method"):
        mt.surface_render_method = "DITHERED"
    return mt


# brows: grown from the skin above each eye, inner hairs up and outer hairs flat and lateral. Many fine hairs
# of uneven length and angle, thinning out at the edges (a soft border, no hard upper and lower lines), dense in
# the body of the brow and sparse at the head and tail
def brows():
    b = SHEET["brows"]
    verts, faces, uvs = [], [], []
    for eye, sgn in ((EYE_L, 1), (EYE_R, -1)):
        head_vs = near_verts(eye + Vector((0, 0, 0.018)), 0.045)

        def frame(p, eye=eye, sgn=sgn):
            lx = (p.x - eye.x) * sgn  # lateral, positive outward
            t = (lx + 0.022) / 0.048  # 0 at the inner end, 1 at the tail
            # arch: the rise to the peak (about two thirds along); tail_drop: how far the tail falls
            centre = (eye.z + 0.0160 + b.get("raise_m", 0.0) + b.get("arch_m", 0.003) * math.sin(min(1.0, t / 0.66) * math.pi * 0.5)
                      - b.get("tail_drop_m", 0.001) * max(0.0, t - 0.66) / 0.34 - 0.001 * t)
            half = (0.0052 - 0.0030 * t) * b.get("thickness", 1.0)
            return t, centre, half

        def in_brow(p, eye=eye):
            if p.y > eye.y + 0.01:
                return 0.0
            t, centre, half = frame(p)
            if not (-0.04 <= t <= 1.04):
                return 0.0
            ends = min(1.0, (t + 0.04) / 0.16) * min(1.0, (1.04 - t) / 0.2)   # sparse at the head and tail
            edge = max(0.0, 1.0 - (abs(p.z - centre) / (half * 1.35)) ** 3)  # thinning out above and below
            return ends * edge

        pts = surface_sample(head_vs, int(900 * b.get("density", 1.0)), in_brow)
        for p, n in pts:
            t, centre, half = frame(p)
            t = max(0.0, min(1.0, t))
            # direction: the head of the brow points up, the rest lateral and a little down at the tail;
            # the hairs below the centre line point slightly up, those above slightly down, so they knit
            up = Vector((0, 0, 1)); lat = Vector((sgn, 0, 0))
            knit = max(-1.0, min(1.0, (centre - p.z) / max(1e-4, half)))
            d = (up * ((1.0 - t) * 1.3 + 0.25 * knit) + lat * (0.45 + t)).normalized()
            d = (d + Vector(((RNG.random() - 0.5) * 0.5, 0, (RNG.random() - 0.5) * 0.5))).normalized()
            d = (d - n * d.dot(n)).normalized()
            L_ = (0.0045 + 0.0035 * RNG.random()) * (0.75 + 0.25 * math.sin(math.pi * min(1.0, t + 0.15)))
            seg = [p - n * 0.0001]
            for k in range(1, 4):
                seg.append(seg[-1] + d * (L_ / 3) + n * (0.00035 if k == 1 else 0.0001))
            w = 0.00013 + 0.00006 * RNG.random()
            ribbon(seg, [w, w * 0.85, w * 0.55, w * 0.15], n, verts, faces, uvs)
    return make_mesh("brows", verts, faces, uvs, hair_material("brow-hair", b["color"]))


def lid_margins():
    """Each eye's upper lid margin, inner to outer: where, seen from the front, the skin starts to cover the
    eyeball. (MakeHuman's lash helper sits a few millimetres up on the lid, which is where the old lashes grew.)"""
    me = hero.data
    tree = BVHTree.FromPolygons([v.co.copy() for v in me.vertices], [tuple(p.vertices) for p in me.polygons])
    r = SHEET["eyes"].get("radius_m", 0.0120)
    fwd = Vector((0, 1, 0))

    def ball(o, c):
        oc = o - c; b_ = oc.dot(fwd); q = oc.dot(oc) - r * r; disc = b_ * b_ - q
        return None if disc < 0 else -b_ - math.sqrt(disc)

    def eye_shows(x, z, c):
        o = Vector((x, c.y - 0.06, z))
        tb = ball(o, c)
        loc, _, _, d = tree.ray_cast(o, fwd, 0.12)
        return tb is not None and (loc is None or tb < d), (loc, d)

    out = {}
    for name, c, sgn in (("l", _cl, 1), ("r", _cr, -1)):
        rim = []
        for k in range(81):
            x = c.x + (k / 80 - 0.5) * 0.04
            z = c.z - 0.002
            ok, _ = eye_shows(x, z, c)
            if not ok:
                continue
            while z < c.z + 0.012:
                z += 0.00015
                shows, (loc, _) = eye_shows(x, z, c)
                if not shows:
                    if loc is not None:
                        rim.append(loc.copy())
                    break
        rim.sort(key=lambda v: (v.x - c.x) * sgn)
        out[name] = (rim, [])
        print("lid rim", name, len(rim), "points")
    return out


LIDS = lid_margins()


def lashes():
    """Upper lashes rooted on the lid margin itself (not on the lid above it): they leave the edge forward,
    curl up, fan outward towards the outer corner and are longest in the outer third."""
    verts, faces, uvs = [], [], []
    for name, c, sgn in (("l", _cl, 1), ("r", _cr, -1)):
        rim = LIDS[name][0]
        if len(rim) < 3:
            continue
        # arc length along the rim, so the lashes are spread evenly
        acc = [0.0]
        for i in range(1, len(rim)):
            acc.append(acc[-1] + (rim[i] - rim[i - 1]).length)
        total = acc[-1]
        la = SHEET.get("lashes", {})   # count, length (x), width (x): fuller on a woman's lids
        count = int(la.get("count", 70))
        for k in range(count):
            t = min(0.999, (k + RNG.random()) / count)
            if t < 0.06:                           # none in the tear duct's corner
                continue
            d_ = t * total
            i = max(1, next(j for j in range(1, len(acc)) if acc[j] >= d_))
            f = (d_ - acc[i - 1]) / max(1e-9, acc[i] - acc[i - 1])
            p = rim[i - 1].lerp(rim[i], f) + Vector((0, -0.0002, -0.0001))
            lat = Vector((sgn * (0.15 + 0.55 * max(0.0, t - 0.45)), 0, 0))
            L_ = 0.0056 * la.get("length", 1.0) * (0.45 + 0.55 * math.sin(math.pi * min(1.0, 0.25 + t * 0.85))) * (0.8 + 0.4 * RNG.random())
            d = (Vector((0, -1, -0.15)) + lat + Vector(((RNG.random() - 0.5) * 0.2, 0, 0))).normalized()
            seg = [p]
            for _ in range(4):
                seg.append(seg[-1] + d * L_ / 4)
                d = (d + Vector((0, 0.02, 0.32))).normalized()    # the curl
            fwd = Vector((0, -1, 0.25)).normalized()
            ribbon(seg, [w * la.get("width", 1.0) for w in (0.00014, 0.00012, 0.00009, 0.00005, 0.00002)], fwd, verts, faces, uvs)
    return make_mesh("lashes", verts, faces, uvs, hair_material("lash-hair", (0.012, 0.010, 0.009)))


# --------------------------------------------------------------------------------------------- hair (cards)
def to_srgb(c):
    return 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055


def strand_texture(name, color, w=256, h=1024, strands=150, fine=False, root=None, bands=0):
    """An alpha texture of strands for the hair cards (tapered, some longer than others). fine: thin single hairs
    of uneven tone (lighter and darker hairs side by side), a few stray ones, all reaching the card's root."""
    img = bpy.data.images.new(name, w, h, alpha=True)
    import array
    px = array.array("f", [0.0] * (w * h * 4))
    r = random.Random(3)
    for s in range(strands):
        x0 = r.random() * w
        length = 0.65 + 0.35 * r.random()
        width = 1.6 + 2.2 * r.random()
        shade = 0.7 + 0.6 * r.random()
        if fine:
            x0 = w * (0.06 + 0.88 * r.random())   # (clear of the card's sides)
            if bands:   # bands across: each a card's width, the first (deepest) darkest
                b = int(r.random() * bands)
                x0 = w * (b + 0.08 + 0.84 * r.random()) / bands
            length = 0.8 + 0.2 * r.random() ** 0.5
            width = 0.7 + 1.0 * r.random()
            shade = 0.55 + 0.6 * r.random() ** 1.5   # (mostly darker hairs, a few light ones catching the light)
            if bands:
                shade *= 0.55 + 0.45 * (b / (bands - 1)) ** 0.7
        wob = r.random() * 6.28
        for y in range(int(h * length)):
            v = y / h
            x = x0 + math.sin(v * 9 + wob) * 3.0
            ww = width * (1 - v / length) ** 0.5 + 0.4
            for xi in range(int(x - ww - 1), int(x + ww + 2)):
                if 0 <= xi < w:
                    a = min(1.0, 1.6 * max(0.0, 1 - abs(xi - x) / ww))
                    i = ((h - 1 - y) * w + xi) * 4
                    if a > px[i + 3]:
                        rt = 0.0 if root is None else max(0.0, 1.0 - v / 0.22) ** 1.5   # (darker roots, grown out)
                        for ch in range(3):
                            c = color[ch] if root is None else color[ch] + (root[ch] - color[ch]) * rt
                            px[i + ch] = to_srgb(min(1.0, c * shade))
                        px[i + 3] = a
    img.pixels = px
    img.pack()
    return img


def surf(p):
    loc, nrm, _, _ = bvh_head.find_nearest(p)
    return loc, nrm


def hair_cards():
    """Cards marched over the head surface along a flow field, at a few heights above it (layers)."""
    hs = SHEET["hair"]
    verts, faces, uvs = [], [], []
    top = max(co[i].z for i in group_verts_orig["scalp"])
    crown = Vector((0.0, HEAD_J.y + 0.035, top))
    whorl_front = Vector((0.0, HEAD_J.y - 0.03, top))
    head_vs = [v.index for v in hero.data.vertices if v.co.z > EYE_L.z - 0.04 and abs(v.co.x) < 0.11]
    passes = [  # (cards, width, lift scale, length scale): a flat base layer that hides the scalp, then clumps
        (200 if FAST else 320, (0.030, 0.045), 0.25, 0.9),
        (200 if FAST else 340, (0.016, 0.028), 0.7, 1.0),
    ]
    length, fringe, wave = hs["length_cm"] / 100.0, hs["fringe_cm"] / 100.0, hs.get("wave", 0.5)
    for n_cards, (w0, w1), lift_k, len_k in passes:
      roots = surface_sample(head_vs, n_cards, hairline)
      for p, n in roots:
        front = p.y < HEAD_J.y - 0.01
        src = whorl_front if front else crown
        flow = p - src
        flow.z = min(flow.z, 0.0) - 0.02
        if front:
            part = hs.get("part_x", 0.012)  # the parting, on his left of centre: the fringe falls away from it
            side = 1.0 if p.x > part else -1.0
            flow += Vector((side * 0.03 * hs.get("curtain", 0.6), -0.04, -0.012))
        L_ = (fringe if front else length) * (0.6 + 0.6 * RNG.random()) * len_k
        layer = RNG.random()
        top_t = max(0.0, min(1.0, (p.z - (EYE_L.z + 0.05)) / 0.06))
        h0 = 0.002 + 0.014 * layer * hs.get("volume", 1.0) * (0.5 + top_t) * lift_k
        segs = 8
        pts, nrms = [], []
        q = p.copy()
        phase = RNG.random() * 6.28
        d = flow.normalized()
        for k in range(segs + 1):
            t = k / segs
            loc, nrm = surf(q)
            d = (d - nrm * d.dot(nrm))
            d = (d.normalized() + Vector((0, 0, -0.25 * t))).normalized()
            side = d.cross(nrm).normalized()
            off = h0 * (0.6 + 0.8 * math.sin(math.pi * min(1.0, t * 1.4))) + 0.0015
            pts.append(loc + nrm * off + side * math.sin(t * 4.5 + phase) * 0.005 * wave)
            nrms.append(nrm)
            q = loc + d * (L_ / segs)
        w = w0 + (w1 - w0) * RNG.random()
        widths = [w * (1 - 0.8 * (i / segs) ** 1.3) for i in range(segs + 1)]
        ribbon(pts, widths, nrms, verts, faces, uvs)
    img = strand_texture("hair-strands", hs["color"])
    img.filepath_raw = os.path.join(OUT, "hair-strands.png"); img.file_format = "PNG"; img.save()
    return make_mesh("hair", verts, faces, uvs, hair_material("hair", hs["color"], img))


def hair_shell():
    """A sculpted hair volume (sheet hair style "shell"): the scalp pushed out by the hair's thickness, then for
    a bob a skirt that falls past the ears to the cut and tucks under, open over the face. Shaded as strands in
    the game (people.js), its lower edge broken into tips there; better than flat cards for a short cut."""
    hs = SHEET["hair"]
    c0 = Vector((0.0, HEAD_J.y + 0.005, EYE_L.z + 0.035))
    top = max(co[i].z for i in group_verts_orig["scalp"])
    NL, rows = 144, 44
    vol = hs.get("volume", 1.0)
    part = hs.get("part_x", 0.012)
    grid, keep = [], []
    for r in range(rows + 1):
        lat = math.radians(88 - (88 + 14) * r / rows)
        row, krow = [], []
        for k in range(NL):
            lon = 2 * math.pi * k / NL
            d = Vector((math.sin(lon) * math.cos(lat), -math.cos(lon) * math.cos(lat), math.sin(lat)))
            hit = bvh_head.ray_cast(c0 + d * 0.35, -d)
            p = hit[0] if hit[0] is not None else c0 + d * 0.09
            row.append([p, d, lon, lat])
            krow.append(hairline(p))
        grid.append(row); keep.append(krow)
    face_half = math.radians(hs.get("face_open_deg", 50))
    fr_ = hs.get("fringe_sweep")   # a swept fringe over the forehead: from low on the parting's far side, rising to it
    def in_fringe(p):
        if not fr_ or p.y > c0.y or math.atan2(abs(p.x - c0.x), c0.y - p.y) > face_half:
            return False
        u = max(-1.0, min(1.0, (p.x - part) / 0.06 * (1 if fr_ > 0 else -1)))
        return p.z > EYE_L.z + hs.get("fringe_low_m", 0.010) + hs.get("fringe_rise_m", 0.048) * ((u + 1) / 2) ** 1.3
    scalp = [[g[0].copy() for g in row] for row in grid]   # (the scalp points, before the hair's thickness)
    # the radius round each row, smoothed round the head (the ears stick out of the skull)
    for r in range(rows + 1):
        rad = [(grid[r][k][0] - c0).length for k in range(NL)]
        for _ in range(4):
            rad = [max(rad[k], 0.5 * rad[k] + 0.25 * (rad[k - 1] + rad[(k + 1) % NL])) if False else
                   (0.5 * rad[k] + 0.25 * (rad[k - 1] + rad[(k + 1) % NL])) for k in range(NL)]
        for k in range(NL):
            p, d, lon, lat = grid[r][k]
            th_full = vol * (0.008 + 0.012 * max(0.0, math.sin(lat)))
            th = th_full * min(1.0, keep[r][k] * 1.25) ** 1.5   # thinning to the hairline
            if in_fringe(p):   # (but the fringe is one layer with the hair above it, with no crease at the hairline)
                th = max(th, 0.75 * th_full)
            if lat > 0.5 and d.y < 0:   # a soft groove along the parting
                th *= 1 - 0.45 * math.exp(-((p.x - part) / 0.01) ** 2)
            grid[r][k][0] = c0 + d * (max(rad[k], (p - c0).length) + th)
    # below the head's widest ring the hair hangs down rather than following the skull inward, and the rows are
    # evened out top to bottom (a ridge between two rows reads as a crease across the strands)
    r0 = min(range(rows + 1), key=lambda r: abs(grid[r][0][3]))
    for r in range(r0 + 1, rows + 1):
        for k in range(NL):
            q, w = grid[r][k][0], grid[r0][k][0]
            hq, hw = Vector((q.x - c0.x, q.y - c0.y, 0)), Vector((w.x - c0.x, w.y - c0.y, 0))
            if hq.length < hw.length and hq.length > 1e-6:
                hq *= hw.length / hq.length
                grid[r][k][0] = Vector((c0.x + hq.x, c0.y + hq.y, q.z))
    for _ in range(3):
        dist = [[(grid[r][k][0] - c0).length for k in range(NL)] for r in range(rows + 1)]
        for r in range(1, rows):
            for k in range(NL):
                want = 0.5 * dist[r][k] + 0.25 * (dist[r - 1][k] + dist[r + 1][k])
                grid[r][k][0] = c0 + (grid[r][k][0] - c0) * (want / max(1e-6, dist[r][k]))
    for r in range(rows + 1):   # (and never into the head: the ears stick out through a smoothed shell)
        for k in range(NL):
            v = grid[r][k][0] - c0
            v.length = max(v.length, (scalp[r][k] - c0).length + 0.005)
            grid[r][k][0] = c0 + v
    # the skirt: from the last ring straight down to the cut, a little belly, tucked under at the ends
    length = hs["length_cm"] / 100.0
    lay = hs.get("layers", 0.0)
    S = 10
    ring = [grid[rows][k][0] for k in range(NL)]
    skirt = []
    for j in range(1, S + 1):
        t = j / S
        srow = []
        for k in range(NL):
            q = ring[k]; lon = grid[rows][k][2]
            zb = top - length * (1.0 + 0.10 * math.cos(lon)) - 0.025 * max(0.0, -math.cos(lon))   # (over the nape at the back)
            if hs.get("groom"):   # (under groomed hair: a little shorter, so its locks' ends hang past it)
                zb += 0.03
            if lay:   # layered: the ends uneven, in pieces of a few centimetres
                zb -= length * 0.16 * lay * mnoise.noise(Vector((math.cos(lon) * 3.1, math.sin(lon) * 3.1, 7.3)))
            rel = Vector((q.x - c0.x, q.y - c0.y, 0.0))
            sc = (1 + 0.08 * math.sin(math.pi * min(1.0, t * 1.1)) ** 2) * (1 - 0.07 * (1 - 1.8 * (0.0 if hs.get("groom") else lay)) * max(0.0, (t - 0.75) / 0.25) ** 2)   # (no kink where it leaves the ring; layered ends flick out)
            if lay:   # and tousled: the fall waves a little in and out round the head
                sc *= 1 + 0.035 * lay * t * mnoise.noise(Vector((math.cos(lon) * 5.0, math.sin(lon) * 5.0, t * 2.0)))
            pt = Vector((c0.x + rel.x * sc, c0.y + rel.y * sc, q.z + (zb - q.z) * t))
            # (outside the head: an ear lobe poked through the skirt)
            hd = Vector((pt.x - c0.x, pt.y - c0.y, 0.0))
            if hd.length > 1e-6:
                hd.normalize()
                ax = Vector((c0.x, c0.y, pt.z))
                hit = bvh_head.ray_cast(ax + hd * 0.35, -hd)
                if hit[0] is not None:
                    need = (hit[0] - ax).length + 0.006
                    if (pt - ax).length < need:
                        pt = ax + hd * need
            srow.append(pt)
        skirt.append(srow)
    allrows = [[g[0] for g in row] for row in grid] + skirt
    force = set()
    kth = 0.35   # (under groomed hair the shell stops behind the hairline: the locks' roots make the edge)
    def kept(r, k):
        lon = grid[0][k][2]; fr = min(lon, 2 * math.pi - lon)   # angle from the front
        if (r, k) in force:
            return True
        if r <= rows:
            return keep[r][k] > kth or in_fringe(allrows[r][k]) or (r > rows * 0.45 and fr > face_half)
        return fr > face_half
    # the edge round the face and the fringe's lower edge follow the hairline and the fringe's line, not the
    # grid's steps: in each column the first row left out moves up to where the hair ends, and stays
    for k in range(NL):
        for r in range(1, rows + 1):
            if kept(r, k):
                continue
            if not kept(r - 1, k):
                break
            a, b = scalp[r - 1][k], scalp[r][k]
            lo, hi = 0.0, 1.0
            for _ in range(12):
                m = (lo + hi) / 2
                q = a.lerp(b, m)
                if hairline(q) > kth or in_fringe(q):
                    lo = m
                else:
                    hi = m
            if lo > 0.05:
                allrows[r][k] = allrows[r - 1][k].lerp(allrows[r][k], lo); force.add((r, k))
            break
    verts, faces, uvs = [], [], []
    idx = {}
    R = len(allrows)
    for r in range(R):
        for k in range(NL):
            idx[(r, k)] = len(verts); verts.append(allrows[r][k]); uvs.append((k / NL, r / (R - 1)))
    for r in range(R - 1):
        for k in range(NL):
            k2 = (k + 1) % NL
            if all(kept(rr, kk) for rr, kk in ((r, k), (r, k2), (r + 1, k), (r + 1, k2))):
                faces.append((idx[(r, k)], idx[(r, k2)], idx[(r + 1, k2)], idx[(r + 1, k)]))
    # where the fringe's edge climbs steeply, two neighbouring columns end rows apart: the step between them is
    # filled with a fan to the shorter column's end, so the edge is a slope, not a staircase
    def run(k):
        r = 0
        while r + 1 <= rows and kept(r + 1, k):
            r += 1
        return r if kept(0, k) else -1
    front = [min(grid[0][k][2], 2 * math.pi - grid[0][k][2]) < face_half for k in range(NL)]
    ends = [run(k) for k in range(NL)]
    for k in range(NL):
        k2 = (k + 1) % NL
        if not (front[k] and front[k2]) or min(ends[k], ends[k2]) < 0 or ends[k] >= rows or ends[k2] >= rows:
            continue
        lo, hi, kl, kh = (ends[k2], ends[k], k2, k) if ends[k] > ends[k2] else (ends[k], ends[k2], k, k2)
        for r in range(lo, hi):
            t = (idx[(r, kh)], idx[(r + 1, kh)], idx[(lo, kl)])
            faces.append(t if kh == k else (t[1], t[0], t[2]))
    # the crown's little hole at the pole, closed
    pole = len(verts)
    verts.append(sum((allrows[0][k] for k in range(NL)), Vector()) / NL + Vector((0, 0, 0.001))); uvs.append((0.0, 0.0))
    for k in range(NL):
        faces.append((pole, idx[(0, (k + 1) % NL)], idx[(0, k)]))
    # u: 1 on the open edges (round the face, the hairline), 0 inside: the game breaks those edges into strands
    use = [0] * len(verts)
    for f in faces:
        for v in f:
            use[v] += 1
    uvs = [(1.0 if 0 < use[i] < 4 and uvs[i][1] < 0.97 else 0.0, uvs[i][1]) for i in range(len(verts))]
    hair_locks(hs, allrows, kept, R, NL, c0, verts, faces, uvs)
    if hs.get("cards"):
        HAIR_EXTRA.append(shell_cards(hs, allrows, kept, R, NL, c0, rows))
    if hs.get("groom"):
        HAIR_EXTRA.append(groom_cards(hs, c0, face_half, BVHTree.FromPolygons([tuple(v) for v in verts], faces)))
    col = hs["color"] if not (hs.get("cards") or hs.get("groom")) else [0.75 * (a + 0.45 * (b - a)) for a, b in zip(hs.get("root_color", hs["color"]), hs["color"])]   # (under cards: the dark depth of the hair)
    return make_mesh("hair-shell", verts, faces, uvs, hair_material("hair-shell", col))


HAIR_EXTRA = []


def shell_cards(hs, rows_, kept, R, NL, c0, scalp_rows):
    """Hair cards over a hair shell (sheet hair "cards": how many): see-through strips carrying a texture of fine
    strands, laid in layers over the shell from its top down each column to where the hair under them ends (the
    fringe's cut line, or the cut at the ends, give or take a little), each lifted off the shell by a few
    millimetres more per layer and swaying a little sideways. Real-time hair reads as hair only like this: the
    shell under them is the dark depth between the strands."""
    n = int(hs["cards"])
    rnd = random.Random(hs.get("seed", 11))
    face_half = math.radians(hs.get("face_open_deg", 50))
    def surf(rf, kf):
        r0 = max(0, min(R - 2, int(rf))); fr = min(1.0, max(0.0, rf - r0))
        k0 = int(math.floor(kf)) % NL; k1 = (k0 + 1) % NL; fk = kf - math.floor(kf)
        a = rows_[r0][k0].lerp(rows_[r0][k1], fk); b = rows_[r0 + 1][k0].lerp(rows_[r0 + 1][k1], fk)
        return a.lerp(b, fr)
    def run_end(k):   # the last kept row down column k from the top
        r = 0
        while r + 1 < R and kept(r + 1, k):
            r += 1
        return r
    ends = [run_end(k) if kept(0, k) else -1 for k in range(NL)]
    verts, faces, uvs = [], [], []
    layers = 3
    for i in range(n):
        layer = i % layers
        k = rnd.uniform(0, NL)
        kk = int(k) % NL
        if ends[kk] < 2:
            continue
        lon = 2 * math.pi * k / NL
        front = min(lon, 2 * math.pi - lon) < face_half * 1.05
        r_end = ends[kk] + (0.0 if front else rnd.uniform(-1.5, 0.6) * (R - scalp_rows) / 10.0)
        r_end = max(1.0, min(R - 1.001, r_end))
        r0 = rnd.uniform(0, min(scalp_rows * 0.35, r_end * 0.4)) if layer else rnd.uniform(0, 2)
        width = rnd.uniform(0.012, 0.024) * (1.0 if front else 1.25)
        lift = 0.0015 + 0.0035 * layer + rnd.uniform(0, 0.002) * (1 + hs.get("messy", 0.0))
        sway = rnd.uniform(-1.0, 1.0) * NL / 144.0 * (1.5 if not front else 0.6) * (1 + 1.5 * hs.get("messy", 0.0))
        steps = 12
        pts = []
        for j in range(steps + 1):
            t = j / steps
            rf = r0 + (r_end - r0) * t
            kf = k + sway * math.sin(t * math.pi * 0.9)
            q = surf(rf, kf)
            out = Vector((q.x - c0.x, q.y - c0.y, (q.z - c0.z) if q.z > c0.z else 0.0))
            out = out.normalized() if out.length > 1e-6 else Vector((0, 0, 1))
            side = surf(rf, kf + 0.5) - surf(rf, kf - 0.5)
            side = side.normalized() if side.length > 1e-7 else out.cross(Vector((0, 0, 1))).normalized()
            pts.append((q + out * lift * (0.6 + 0.4 * t), side, t))
        base = len(verts)
        u0 = rnd.choice((0.0, 0.5))   # (two halves of the strand texture, so neighbours differ)
        for q, side, t in pts:
            w = width * (1 - 0.35 * t)
            verts += [q - side * w / 2, q + side * w / 2]
            uvs += [(u0, 1 - t), (u0 + 0.5, 1 - t)]
        for j in range(steps):
            a = base + 2 * j
            faces.append((a, a + 1, a + 3, a + 2))
    # curtain: locks from the parting swept off the forehead to the sides of the face and down past the cheeks,
    # the heavy side (away from the parting) dipping across the forehead before it turns; a few stray hairs
    nc = int(hs.get("curtain_cards", 0))
    heavy = -1 if hs.get("sweep", 1) > 0 else 1
    kp = NL / (2 * math.pi) * math.atan(hs.get("part_x", 0.012) / 0.09)
    kface = face_half * NL / (2 * math.pi)
    for i in range(nc):
        side = heavy if rnd.random() < 0.6 else -heavy
        hv = side == heavy
        ks = kp + side * rnd.uniform(0.0, 5.0)
        ke = side * kface * rnd.uniform(1.0, 1.35)
        kk = int(round(ks)) % NL
        r0 = max(0.0, ends[kk] - rnd.uniform(2, 7)) if ends[kk] >= 0 else scalp_rows * 0.55
        r_end = rnd.uniform(scalp_rows + 1, R - 1.001) if hv else rnd.uniform(scalp_rows - 2, R - 1.001)
        rh = ends[kk] if ends[kk] >= 0 else r0 + 4
        dip = rnd.uniform(3, 10) if hv else rnd.uniform(0, 3)   # rows (about 4 mm each) it dips over the forehead
        width = rnd.uniform(0.010, 0.02)
        lift = 0.004 + rnd.uniform(0, 0.004) + 0.003 * (i % 3)
        steps = 18
        pts = []
        sw = rnd.uniform(0.35, 0.5)   # the share of its length spent sweeping sideways
        for j in range(steps + 1):
            t = j / steps
            if t <= sw:   # across: from the parting to the side of the face, dipping over the forehead
                e = t / sw
                kf = ks + (ke - ks) * (e * e * (3 - 2 * e) if hv else e ** 0.7)
                rf = r0 + (rh + dip - r0) * math.sin(e * math.pi / 2)
            else:         # then down the side of the face to the ends
                e = (t - sw) / (1 - sw)
                kf = ke + side * 0.6 * e
                rf = rh + dip + (r_end - rh - dip) * e
            q = surf(rf, kf)
            out = Vector((q.x - c0.x, q.y - c0.y, (q.z - c0.z) if q.z > c0.z else 0.0))
            out = out.normalized() if out.length > 1e-6 else Vector((0, 0, 1))
            pts.append([q + out * lift * (0.7 + 0.6 * math.sin(math.pi * t)), out, t])
        for j, pt in enumerate(pts):   # (across the lock: square to its run)
            dq = pts[min(j + 1, steps)][0] - pts[max(j - 1, 0)][0]
            pt[1] = pt[1].cross(dq).normalized() if dq.length > 1e-7 else pt[1].cross(Vector((0, 0, 1))).normalized()
        base = len(verts)
        u0 = rnd.choice((0.0, 0.5))
        for q, sv, t in pts:
            w = width * (1 - 0.5 * t)
            verts += [q - sv * w / 2, q + sv * w / 2]
            uvs += [(u0, 1 - t), (u0 + 0.5, 1 - t)]
        for j in range(steps):
            a = base + 2 * j
            faces.append((a, a + 1, a + 3, a + 2))
    img = strand_texture("hair-strands", hs["color"], w=512, h=1024, strands=hs.get("card_strands", 200), fine=True,
                         root=hs.get("root_color"))
    img.filepath_raw = os.path.join(OUT, "hair-strands.png"); img.file_format = "PNG"; img.save()
    return make_mesh("hair-cards", verts, faces, uvs, hair_material("hair-cards", hs["color"], img))


def game_body(path, hair_lum):
    """The character's own body from the game (sheet "body_glb"), as a BVH in this head's space: placed the way
    the game's swapHead places this head on it (nose on nose, scaled by nose-to-chin), without its old head and
    without its old sculpted hair (dark texels, which the game drops as well), so long hair lies on the jacket it
    will really lie on, not on the bare MPFB body's different back and shoulders. (hair "over_old_hair": keep the
    old hair below the head in it, for a game body that keeps it as a layer under the new hair.)"""
    import numpy as np
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.abspath(path))
    new = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in new if o.type == "MESH"]
    if not meshes:
        return None
    ob = max(meshes, key=lambda o: len(o.data.vertices))
    dg = bpy.context.evaluated_depsgraph_get()
    me = ob.evaluated_get(dg).to_mesh()
    mw = ob.matrix_world
    P = [mw @ v.co for v in me.vertices]
    if max(p.z for p in P) - min(p.z for p in P) > 10:   # (in centimetres)
        P = [p * 0.01 for p in P]
    hg = ob.vertex_groups.get("Bip01_Head")
    headw = [0.0] * len(P)
    if hg:
        for i, v in enumerate(ob.data.vertices):
            for g in v.groups:
                if g.group == hg.index:
                    headw[i] = g.weight
    hv = [P[i] for i in range(len(P)) if headw[i] > 0.6]
    zs = sorted(p.z for p in hv)
    zmid = (zs[0] + zs[-1]) / 2
    cx = sum(p.x for p in hv) / len(hv)
    nose = min((p for p in hv if abs(p.x - cx) < 0.02 and p.z < zmid), key=lambda p: p.y)
    chin = min((p for p in hv if abs(p.x - cx) < 0.02 and p.y < nose.y + 0.05), key=lambda p: p.z)
    centre = [v.co for v in hero.data.vertices if abs(v.co.x) < 0.006]
    nn = min((c for c in centre if EYE_L.z - 0.065 < c.z < EYE_L.z - 0.015), key=lambda c: c.y)
    nc = min((c.z for c in centre if c.y < nn.y + 0.05 and c.z > NECK.z))
    sc = min(1.15, max(0.8, (nose.z - chin.z) / max(1e-4, nn.z - nc)))   # (clamped as the game clamps it)
    print("game body: height %.3f, nose-chin %.4f vs %.4f, scale %.3f" % (max(p.z for p in P) - min(p.z for p in P), nose.z - chin.z, nn.z - nc, sc))
    # its texture, for the old hair's dark texels
    img = None
    mt = ob.data.materials[0] if ob.data.materials else None
    if mt and mt.use_nodes:
        for nd in mt.node_tree.nodes:
            if nd.type == "TEX_IMAGE" and nd.image:
                img = nd.image; break
    px = None
    if img:
        W, H = img.size
        px = np.array(img.pixels[:], np.float32).reshape(H, W, 4)
    uvl = me.uv_layers.active.data if me.uv_layers.active else None
    verts, faces = [], []
    fit = SHEET.get("game_fit")
    if fit:
        # exactly as the game placed this head on that body (people.js swapHead logs it: nose, newNose in
        # centimetres / glTF metres, y up, and its scales), inverted: body (Blender, metres) to head
        on, nN, S = fit["nose"], fit["newNose"], 100 * fit["s"]
        sx_, sz_ = fit["sx"], fit["sz"]
        def to_head(b):
            X, Y, Z = 100 * b.x, 100 * b.z, -100 * b.y
            return Vector((nN[0] + (X - on[0]) / (S * sx_), -(nN[2] + (Z - on[2]) / (S * sz_)), nN[1] + (Y - on[1]) / S))
        verts = [to_head(p) for p in P]
    else:
        for i, p in enumerate(P):
            verts.append(nn + (p - nose) / sc)
    me.calc_loop_triangles()
    for lt in me.loop_triangles:
        a, b, c = lt.vertices
        if headw[a] > 0.5 and headw[b] > 0.5 and headw[c] > 0.5:
            continue
        if px is not None and uvl is not None and not SHEET["hair"].get("over_old_hair", False):
            u = sum(uvl[l].uv[0] for l in lt.loops) / 3; v = sum(uvl[l].uv[1] for l in lt.loops) / 3
            col = px[min(H - 1, max(0, int(v * H))), min(W - 1, max(0, int((u % 1) * W)))]
            lum = 0.3 * col[0] + 0.55 * col[1] + 0.15 * col[2]
            if lum < hair_lum and not (col[0] > col[1] * 1.25 and col[0] > 0.3):
                continue
        faces.append((a, b, c))
    ob.evaluated_get(dg).to_mesh_clear()
    for o in new:
        bpy.data.objects.remove(o, do_unlink=True)
    print("game body: %d triangles kept" % len(faces))
    return BVHTree.FromPolygons([tuple(v) for v in verts], faces)


def hair_sheets(hs, bvh_body, clear):
    """Under long hair, the dark mass of it lying on the body (named as a hair shell, so the game shades it as one
    and breaks its lower edge and sides into strands): one sheet down the back from the shoulders to the ends,
    wider below, and one down each side of the chest where the front locks fall, each a grid of points on the game
    body's jacket (ray cast onto it) a little off it, under the locks. The game drops the old sculpted hair, and
    these cover the holes it leaves."""
    fall = hs["fall_cm"] / 100.0
    top = max(co[i].z for i in group_verts_orig["scalp"])
    z_bot = top - fall + 0.05
    verts, faces, uvs = [], [], []
    def sheet(xs_at, z0, z1, from_back, rows=26, cols=18):
        base = len(verts); idx = {}
        for r in range(rows):
            t = r / (rows - 1)
            z = z0 + (z1 - z0) * t
            x0, x1 = xs_at(t)
            for k in range(cols):
                x = x0 + (x1 - x0) * k / (cols - 1)
                o = Vector((x, 0.6 if from_back else -0.6, z))
                hit = bvh_body.ray_cast(o, Vector((0, -1 if from_back else 1, 0)))
                if hit[0] is None:
                    continue
                n = hit[1] if hit[1].y * (1 if from_back else -1) > 0 else -hit[1]
                idx[(r, k)] = len(verts)
                verts.append(hit[0] + n * clear * 0.7)
                uvs.append((1.0 if k in (0, cols - 1) else 0.0, t))
        for r in range(rows - 1):
            for k in range(cols - 1):
                q = [(r, k), (r, k + 1), (r + 1, k + 1), (r + 1, k)]
                if all(c in idx for c in q):
                    f = tuple(idx[c] for c in q)
                    faces.append(f if from_back else f[::-1])
    sheet(lambda t: (-0.06 - 0.07 * t, 0.06 + 0.07 * t), NECK.z - 0.015, z_bot, True)
    for s_ in (1, -1):
        sheet(lambda t, s_=s_: tuple(sorted((s_ * 0.045, s_ * (0.10 + 0.01 * t)))), NECK.z - 0.035, z_bot + 0.10, False, rows=20, cols=8)
    col = [0.75 * (a + 0.45 * (b - a)) for a, b in zip(hs.get("root_color", hs["color"]), hs["color"])]
    print("hair sheets: %d faces" % len(faces))
    return make_mesh("hair-shell-fall", verts, faces, uvs, hair_material("hair-shell-fall", col))


def groom_cards(hs, c0, face_half, bvh_shell):
    """Groomed hair (sheet hair "groom": how many locks): narrow see-through cards of fine strands, each grown from
    a root on the scalp and walked along a flow field: away from the parting, the front locks on the far side swept
    off the forehead to the side of the face, the rest falling to the cut, each lying on the hair under it (a few
    millimetres more off the scalp for every layer), kept off the face, wandering a little with the noise (one
    noise field, so neighbouring locks move together as clumps). The shell under them is the depth of the hair."""
    n = int(hs["groom"])
    rnd = random.Random(hs.get("seed", 13))
    part = hs.get("part_x", 0.012)
    heavy = -1 if hs.get("sweep", 1) > 0 else 1
    vol = hs.get("volume", 1.0)
    messy = hs.get("messy", 0.0)
    lay = hs.get("layers", 0.0)
    length = hs["length_cm"] / 100.0
    top = max(co[i].z for i in group_verts_orig["scalp"])
    # roots: points on the scalp, area-weighted, where the hair grows
    me = hero.data
    me.calc_loop_triangles()
    tris, acc, tot = [], [], 0.0
    for lt in me.loop_triangles:
        a, b, c = (me.vertices[v].co for v in lt.vertices)
        m = (a + b + c) / 3
        if m.z < EYE_L.z - 0.05 or hairline(m) < 0.3:
            continue
        tot += lt.area; tris.append((a.copy(), b.copy(), c.copy())); acc.append(tot)
    import bisect
    def root():
        while True:
            a, b, c = tris[min(len(tris) - 1, bisect.bisect(acc, rnd.random() * tot))]
            u, v = rnd.random(), rnd.random()
            if u + v > 1:
                u, v = 1 - u, 1 - v
            p = a + (b - a) * u + (c - a) * v
            if rnd.random() < hairline(p) ** 2:
                return p
    def zcut(p):   # where the cut is, round the head: longer at the front, over the nape at the back
        lon = math.atan2(p.x - c0.x, c0.y - p.y)
        z = top - length * (1.0 + 0.10 * math.cos(lon)) - 0.025 * max(0.0, -math.cos(lon))
        return z - length * 0.16 * lay * mnoise.noise(Vector((math.cos(lon) * 3.1, math.sin(lon) * 3.1, 7.3)))
    def face_guard(p):   # (off the face: in front of the head between the brows and the jaw, out to the sides)
        if p.y > c0.y or not (EYE_L.z - 0.012 < p.z < EYE_L.z + 0.075):   # (below the eyes it may lie on the cheek)
            return p
        ang = math.atan2(p.x - c0.x, c0.y - p.y)
        k = min(1.0, max(0.0, (EYE_L.z + 0.075 - p.z) / 0.05))   # (the far side's fringe sweeps down across the forehead)
        k = k * k * (3 - 2 * k)
        lim = face_half * ((0.25 + 0.67 * k) if (p.x - part) * heavy > 0 else (0.62 + 0.3 * k))
        if abs(ang) >= lim:
            return p
        r = Vector((p.x - c0.x, p.y - c0.y)).length
        a2 = math.copysign(lim, ang if abs(ang) > 1e-4 else 1.0)
        return Vector((c0.x + r * math.sin(a2), c0.y - r * math.cos(a2), p.z))
    verts, faces, uvs = [], [], []
    ds = 0.006
    # long hair (sheet hair "fall_cm": crown to ends): it falls past the jaw over the shoulders and down the back,
    # off the body (the whole MPFB body is in bvh_head) by a jacket's thickness, the back's locks fanning out
    # across the shoulder blades; "half_up": the top section gathered back to a tie at the back of the head and
    # falling from there; "wave_cm": soft S-waves along the lengths, neighbouring locks in step
    fall = hs.get("fall_cm", 0) / 100.0
    max_x = hs.get("max_x_m", 1.0)
    half = hs.get("half_up")
    T = None
    if half:
        zt = EYE_L.z + half.get("z_m", 0.03)
        hit = bvh_head.ray_cast(Vector((0.0, c0.y + 0.35, zt)), Vector((0, -1, 0)))
        T = (hit[0] if hit[0] is not None else Vector((0.0, c0.y + 0.09, zt))) + Vector((0, 0.014, 0))
    clear = hs.get("body_clear_m", 0.014)
    bvh_body = game_body(SHEET["body_glb"], SHEET.get("hair_lum", 0.5)) if fall and SHEET.get("body_glb") else None
    if bvh_body:
        clear = hs.get("jacket_clear_m", 0.006)
        if not hs.get("over_old_hair", False):   # (over the old hair, the game draws its own dark sheet there)
            HAIR_EXTRA.append(hair_sheets(hs, bvh_body, clear))
    for i in range(n):
        p = root()
        if i % 6 == 0:   # (more along the parting, so it reads as a parting and not a bald stripe)
            for _ in range(20):
                if abs(p.x - part) < 0.02 and p.z > top - 0.05:
                    break
                p = root()
        u = rnd.random()   # how far up the stack of hair this lock lies
        off = 0.002 + (0.004 + 0.010 * u) * vol
        s = 1.0 if p.x > part else -1.0
        front = p.y < c0.y - 0.035
        near_part = math.exp(-((p.x - part) / 0.035) ** 2)
        wisp = front and hairline(p) < 0.97 and rnd.random() < 0.7   # (short fine hairs at the hairline, lying forward)
        if wisp:
            d = Vector((heavy * 0.5 + s * 0.2, -0.35, -1.0))
            off = 0.0008
        elif front and s == heavy:      # swept off the forehead to the side
            d = Vector((s * 1.0, 0.15, -0.45))
        elif front:                    # back from the parting
            d = Vector((s * 0.8, 0.7, -0.3))
        else:                          # falling from the crown, away from the parting near it
            d = Vector((s * 0.9 * near_part + (p.x - c0.x) * 4.0, 0.25, -1.0))
        # half up: the top section (not the loose locks framing the face) goes back to the tie
        up = bool(T) and not wisp and p.z > EYE_L.z + half.get("above_m", 0.045) and not (front and abs(p.x - part) > 0.02 and rnd.random() < half.get("loose", 0.35))
        reached = False
        if fall and not up and not wisp:
            if p.y < HEAD_J.y - 0.01 and abs(p.x) > 0.03:   # (the sides fall in front of the shoulders)
                d = Vector((s * 0.08, -0.6, -1.0))
            elif not front:                                 # (the back down the back, fanning out)
                d = Vector(((p.x - c0.x) * 3.0, 0.35, -1.0))
        d.normalize()
        maxL = length * (1.5 if front else 1.35) * (1 + 0.12 * (rnd.random() - 0.5)) + (top - p.z) * 0.3
        if fall:
            maxL = fall * 1.7
        if wisp:
            maxL = rnd.uniform(0.012, 0.03)
        pts, L = [p.copy()], 0.0
        q = p.copy()
        fan = (p.x - c0.x) * 1.0 if fall and not front else 0.0
        while L < maxL and len(pts) < (130 if fall else 70):
            loc, nrm, _, _ = bvh_head.find_nearest(q)
            if loc is not None:
                h = (q - loc).dot(nrm)
                want = off * min(1.0, 0.25 + L / 0.02)   # (rising off the scalp over its first two centimetres)
                if fall and q.z < NECK.z + 0.02 and not bvh_body:   # (over the jacket, not the bare MPFB body)
                    want += clear * min(1.0, (NECK.z + 0.02 - q.z) / 0.04)
                if h < want:
                    q = q + nrm * (want - h)
                d = d - nrm * min(0.0, d.dot(nrm)) * 0.9   # (no diving into the head)
            if bvh_body and q.z < NECK.z + 0.03:   # (on the game body's jacket and shoulders)
                loc, nrm, _, dist = bvh_body.find_nearest(q)
                if loc is not None and dist < 0.08:
                    if nrm.dot(q - loc) < 0 and dist > 0.02:
                        nrm = -nrm
                    h = (q - loc).dot(nrm)
                    want = clear + 0.006 * u * vol
                    if h < want:
                        q = q + nrm * (want - h)
                        d = d - nrm * min(0.0, d.dot(nrm)) * 0.9
            loc, nrm, _, dist = bvh_shell.find_nearest(q)   # (and lying on the hair shell, once off the scalp)
            if loc is not None and dist < 0.03 and L > 0.004:
                if nrm.dot(loc - c0) < 0:
                    nrm = -nrm
                h = (q - loc).dot(nrm)
                want = (0.0008 + 0.007 * u * vol) * min(1.0, L / 0.02)
                if h < want:
                    q = q + nrm * (want - h)
                    d = d - nrm * min(0.0, d.dot(nrm)) * 0.9
            nz = mnoise.noise_vector(q * 14.0 + Vector((3.1, 1.7, 0.0)))
            if up and not reached:
                # (gathered: along the scalp to the tie, then falling from it)
                d = (d * 0.35 + (T - q).normalized() * 0.65 + nz * 0.04).normalized()
                if (q - T).length < 0.016:
                    reached = True
                    d = Vector(((q.x - T.x) * 3.0, 0.3, -1.0)).normalized()
            else:
                g = -0.16 - 0.4 * min(1.0, L / 0.05) - 0.8 * max(0.0, L / maxL - 0.6)
                if fall:
                    g = -0.5 - 0.5 * min(1.0, L / 0.1)
                    d = d + Vector((fan * 0.03, 0, 0))
                d = (d + Vector((0, 0, g)) + nz * (0.05 + 0.12 * messy)).normalized()   # (the ends hang)
                if fall and q.z < NECK.z + 0.04 and abs(q.x - c0.x) > max_x:   # (hanging in, not out past the shoulders)
                    d = (d - Vector((math.copysign(min(1.5, (abs(q.x - c0.x) - max_x) * 40.0), q.x - c0.x), 0, 0))).normalized()
            step = ds if not fall or L < 0.08 else ds * 2
            q = face_guard(q + d * step)
            L += step
            pts.append(q.copy())
            if fall:
                if q.z < top - fall + 0.05 * mnoise.noise(Vector((p.x * 30, p.y * 30, 1.7))) and L > 0.1:
                    break
            elif q.z < zcut(q) and L > 0.03:
                break
        if len(pts) < 4:
            continue
        if hs.get("wave_cm") and fall:
            A, lam = hs["wave_cm"] / 100.0, hs.get("wave_len_cm", 6.0) / 100.0
            ph = 2 * math.pi * mnoise.noise(p * 18.0 + Vector((0.3, 5.1, 2.2)))   # (in step with its neighbours)
            Ls, acc_ = [0.0], 0.0
            for j in range(1, len(pts)):
                acc_ += (pts[j] - pts[j - 1]).length; Ls.append(acc_)
            src = [q.copy() for q in pts]
            for j in range(1, len(pts)):
                if Ls[j] < 0.07:
                    continue
                ramp = min(1.0, (Ls[j] - 0.07) / 0.08)
                tg = (src[min(j + 1, len(src) - 1)] - src[j - 1]).normalized()
                loc, nrm, _, _ = bvh_head.find_nearest(src[j])
                out = (src[j] - loc).normalized() if loc is not None and (src[j] - loc).length > 1e-6 else Vector((0, 1, 0))
                sd = out.cross(tg)
                if sd.length < 1e-6:
                    continue
                sd.normalize()
                a = 2 * math.pi * Ls[j] / lam + ph
                pts[j] = src[j] + sd * (A * ramp * math.sin(a)) + out * (0.35 * A * ramp * (1 + math.cos(a)) / 2)
        if fall:   # (a vertex every 12 mm near the root; the lengths are already 12 mm a step, kept for the waves)
            k8 = next((j for j, q in enumerate(pts) if (q - pts[0]).length > 0.08), len(pts))
            pts = pts[:k8:2] + pts[k8::2] + ([pts[-1]] if (len(pts) - k8) % 2 == 0 else [])
        else:
            pts = pts[:-1:2] + [pts[-1]]   # (a vertex every 12 mm is plenty for the mesh)
        # into a card: across it square to its run, lying on the hair (its normal out of the head)
        width = rnd.uniform(0.004, 0.009) * (1.0 + 0.5 * u) * (0.5 if wisp else 1.0) * (hs.get("fall_width", 1.6) if fall and not wisp else 1.0)
        base = len(verts)
        band = min(3, int(u * 4 * (0.7 + 0.6 * rnd.random())))   # (the texture's four bands, darkest deepest)
        u0 = band * 0.25
        m = len(pts)
        for j, q in enumerate(pts):
            t = j / (m - 1)
            tg = pts[min(j + 1, m - 1)] - pts[max(j - 1, 0)]
            loc, nrm, _, _ = bvh_head.find_nearest(q)
            out = (q - loc).normalized() if loc is not None and (q - loc).length > 1e-6 else Vector((0, 0, 1))
            sd = out.cross(tg)
            sd = sd.normalized() if sd.length > 1e-9 else Vector((1, 0, 0))
            w = width * (1 - 0.35 * t ** 2)
            verts += [q - sd * w / 2, q + sd * w / 2]
            uvs += [(u0, 1 - t), (u0 + 0.25, 1 - t)]
        for j in range(m - 1):
            a = base + 2 * j
            faces.append((a, a + 1, a + 3, a + 2))
    img = strand_texture("hair-strands", hs["color"], w=512, h=1024, strands=hs.get("card_strands", 330), fine=True,
                         root=hs.get("root_color"), bands=4)
    img.filepath_raw = os.path.join(OUT, "hair-strands.png"); img.file_format = "PNG"; img.save()
    return make_mesh("hair-cards", verts, faces, uvs, hair_material("hair-cards", hs["color"], img))


def hair_locks(hs, rows_, kept, R, NL, c0, verts, faces, uvs):
    """Loose locks over a hair shell (sheet hair "locks": how many): ribbons that start somewhere on the shell and
    run down it, lifted off it a little more towards their tips, swaying sideways, a little longer or shorter than
    the hair under them, so the surface breaks into pieces of hair instead of one smooth helmet. Across a ribbon u
    runs 1, 0, 1 (the game thins its edges into strands); along it v ends at 1 at the tip (broken into tips)."""
    n_locks = int(hs.get("locks", 0))
    if not n_locks:
        return
    rnd = random.Random(hs.get("seed", 7))
    def surf(rf, kf):
        r0 = max(0, min(R - 2, int(rf))); fr = min(1.0, max(0.0, rf - r0))
        k0 = int(math.floor(kf)) % NL; k1 = (k0 + 1) % NL; fk = kf - math.floor(kf)
        a = rows_[r0][k0].lerp(rows_[r0][k1], fk); b = rows_[r0 + 1][k0].lerp(rows_[r0 + 1][k1], fk)
        return a.lerp(b, fr)
    made = 0
    for _ in range(n_locks * 4):
        if made >= n_locks:
            break
        k = rnd.uniform(0, NL); r = rnd.uniform(R * 0.05, R * 0.55)
        lon = 2 * math.pi * k / NL
        if not kept(int(r), int(k) % NL) or min(lon, 2 * math.pi - lon) < math.radians(hs.get("face_open_deg", 50)) * 1.2:
            continue   # (not on the fringe: its edge is already cut along its line, and a lock there ends in a step)
        width = rnd.uniform(0.006, 0.014)
        lift = rnd.uniform(0.0015, 0.004)
        sway = rnd.uniform(-1.0, 1.0) * NL / 96.0 * 2.5
        extra = rnd.uniform(-0.15, 0.08)   # its end, as a share of the hair's length under it
        steps = 14
        r_end = min(R - 1.0, (R - 1) * (1 + extra))
        path = []
        for j in range(steps + 1):
            t = j / steps
            rf = r + (r_end - r) * t
            kf = k + sway * math.sin(t * math.pi * 0.8)
            if not kept(min(R - 2, int(rf)), int(kf) % NL) and t > 0:
                break
            path.append((surf(min(rf, R - 1.001), kf), t, rf, kf))
        if len(path) < 4:
            continue
        base = len(verts)
        for i, (q, t, rf, kf) in enumerate(path):
            qn = path[min(i + 1, len(path) - 1)][0] - path[max(i - 1, 0)][0]
            side = surf(min(rf, R - 1.001), kf + 0.5) - surf(min(rf, R - 1.001), kf - 0.5)
            out = Vector((q.x - c0.x, q.y - c0.y, (q.z - c0.z) if q.z > c0.z else 0.0))
            out = out.normalized() if out.length > 1e-6 else Vector((0, 0, 1))
            if side.length < 1e-6:
                side = qn.cross(out)
            side.normalize()
            w = width * (1 - 0.6 * t)   # tapering to the tip
            c = q + out * (lift + 0.004 * t)
            v = rf / (R - 1) if i < len(path) - 1 else 1.0
            v = min(1.0, v + (1.0 - v) * (i / (len(path) - 1)) ** 4)
            for sgn, u in ((-1, 1.0), (0, 0.0), (1, 1.0)):
                verts.append(c + side * (sgn * w / 2)); uvs.append((u, v))
        for i in range(len(path) - 1):
            a = base + 3 * i; b = a + 3
            faces.append((a, a + 1, b + 1, b)); faces.append((a + 1, a + 2, b + 2, b + 1))
        made += 1


brow_ob = brows()
lash_ob = lashes()
hair_ob = hair_shell() if SHEET["hair"].get("style") == "shell" else hair_cards()


def earrings():
    """Stud earrings (sheet "earrings": {"radius_m", "color", "pearl"}): a small sphere on each ear lobe, its lowest
    fleshy point, a little forward of it and out from the head."""
    e = SHEET.get("earrings")
    if not e:
        return []
    ears = group_verts(hero, "ears", 0.3)
    out = []
    for side in (1, -1):
        vs = [co[i] for i in ears if co[i].x * side > 0]
        if not vs:
            continue
        lobe = min(vs, key=lambda c: c.z)
        near = [c for c in vs if c.z < lobe.z + 0.008]
        cen = sum(near, Vector()) / len(near)
        r = e.get("radius_m", 0.0045)
        pos = Vector((cen.x + side * r * 0.6, cen.y - 0.001, cen.z + 0.003))
        ob = uv_sphere("earring-" + ("l" if side > 0 else "r"), r, pos)
        bpy.context.view_layer.objects.active = ob
        ob.select_set(True); bpy.ops.object.transform_apply(location=True); ob.select_set(False)
        mt, N, L, bs = mat("pearl")
        bs.inputs["Base Color"].default_value = (*e.get("color", [0.86, 0.83, 0.78]), 1)
        bs.inputs["Roughness"].default_value = 0.18
        bs.inputs["Coat Weight"].default_value = 0.6 if e.get("pearl", True) else 0.0
        ob.data.materials.append(mt)
        for poly in ob.data.polygons: poly.use_smooth = True
        out.append(ob)
    return out


parts = [hero, teeth, tongue, *eyes, brow_ob, lash_ob, hair_ob, *HAIR_EXTRA, *earrings()]


# ------------------------------------------------------------------------------------------------ statistics
def tris(ob):
    ob.data.calc_loop_triangles()
    return len(ob.data.loop_triangles)


head_cut = NECK.z - 0.02
stats = {o.name: tris(o) for o in parts}
hero.data.calc_loop_triangles()
head_tris = sum(1 for t in hero.data.loop_triangles
                if min(hero.data.vertices[i].co.z for i in t.vertices) > head_cut)
stats["head part of body (above neck)"] = head_tris
stats["shape keys"] = len(hero.data.shape_keys.key_blocks) - 1
print("STATS", json.dumps(stats))
json.dump(stats, open(os.path.join(OUT, "stats.json"), "w"), indent=1)


# ------------------------------------------------------------------------------------------------- rendering
def setup_render():
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 48 if FAST else 96
    scene.cycles.use_denoising = True
    scene.render.resolution_x = scene.render.resolution_y = 640 if FAST else 800
    scene.render.film_transparent = False
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    world = bpy.data.worlds.new("w"); scene.world = world; world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (0.20, 0.21, 0.24, 1); bg.inputs["Strength"].default_value = 0.35
    face = EYE_L.lerp(EYE_R, 0.5)

    def area(name, loc, energy, size, color=(1, 1, 1)):
        ld = bpy.data.lights.new(name, "AREA"); ld.energy = energy; ld.size = size; ld.color = color
        ob = bpy.data.objects.new(name, ld); scene.collection.objects.link(ob)
        ob.location = face + Vector(loc)
        d = (face - ob.location).normalized()
        ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    area("key", (0.9, -1.2, 0.55), 70, 0.9, (1.0, 0.95, 0.88))
    area("fill", (-1.1, -0.9, 0.1), 7, 1.4, (0.85, 0.9, 1.0))
    area("rim", (-0.5, 1.2, 0.6), 45, 0.6, (0.9, 0.95, 1.0))
    area("rim2", (0.7, 1.0, 0.3), 25, 0.6)
    cam_d = bpy.data.cameras.new("cam"); cam_d.lens = 85
    cam = bpy.data.objects.new("cam", cam_d); scene.collection.objects.link(cam); scene.camera = cam
    return face, cam


def shoot(cam, face, yaw_deg, dist, name, pitch=0.0, lift=0.0):
    a = math.radians(yaw_deg)
    target = face + Vector((0, 0, -0.025 + lift))
    cam.location = target + Vector((math.sin(a) * dist, -math.cos(a) * dist, math.sin(math.radians(pitch)) * dist))
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = os.path.join(OUT, name + ".png")
    bpy.ops.render.render(write_still=True)
    print("rendered", name)


if "--render" in FLAGS:
    face, cam = setup_render()
    set_expression("neutral")
    shoot(cam, face, 0, 0.62, "front")
    shoot(cam, face, 32, 0.62, "three-quarter")
    if not FAST:
        shoot(cam, face, 90, 0.62, "profile")
        shoot(cam, face, 20, 1.6, "medium", lift=-0.12)
        for ex in EXPRESSIONS:
            if ex != "neutral":
                set_expression(ex)
                shoot(cam, face, 12, 0.66, "expr-" + ex)
        set_expression("neutral")



# ---------------------------------------------------------------------------------------------------- export
def bake_maps(ob, size, name, extra=True):
    """Bake the procedural colour (and, for skin, normal and roughness) into textures and rebuild the material
    from them in a form the glTF exporter understands."""
    if not ob.data.uv_layers:
        return None
    mt = ob.data.materials[0]
    nodes, links = mt.node_tree.nodes, mt.node_tree.links
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True); bpy.context.view_layer.objects.active = ob
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 4
    scene.render.bake.use_pass_direct = False
    scene.render.bake.use_pass_indirect = False
    scene.render.bake.margin = 12
    imgs = {}
    passes = [("color", "DIFFUSE", False)] + ([("normal", "NORMAL", True), ("rough", "ROUGHNESS", True)] if extra else [])
    for key, kind, data in passes:
        img = bpy.data.images.new("%s-%s" % (name, key), size, size, alpha=False, is_data=data)
        tx = nodes.new("ShaderNodeTexImage"); tx.image = img
        if data:
            img.colorspace_settings.name = "Non-Color"
        nodes.active = tx
        if kind == "DIFFUSE":
            bpy.ops.object.bake(type=kind, pass_filter={"COLOR"})
        else:
            bpy.ops.object.bake(type=kind)
        img.filepath_raw = os.path.join(OUT, "%s-%s.png" % (name, key)); img.file_format = "PNG"; img.save()
        imgs[key] = tx
    if extra:
        # ambient occlusion, multiplied into the colour: the depth a real face has in its eye sockets, nostrils,
        # mouth corners and under the jaw, which three.js won't compute (the hair, brows and lashes are left out,
        # or the fringe would paint a shadow on the forehead)
        hidden = [o for o in scene.objects if o.type == "MESH" and o != ob and any(k in o.name for k in ("hair", "brow", "lash"))]
        for o in hidden: o.hide_render = True
        scene.cycles.samples = 32
        ao = bpy.data.images.new("%s-ao" % name, size, size, alpha=False, is_data=True)
        ao.colorspace_settings.name = "Non-Color"
        tx = nodes.new("ShaderNodeTexImage"); tx.image = ao; nodes.active = tx
        bpy.ops.object.bake(type="AO")
        scene.cycles.samples = 4
        for o in hidden: o.hide_render = False
        import numpy as np
        a = np.array(ao.pixels[:], np.float32).reshape(-1, 4)[:, 0]
        c = np.array(imgs["color"].image.pixels[:], np.float32).reshape(-1, 4)
        occ = np.clip(1 - a, 0, 1)[:, None]
        ao_k = 0.3 if SHEET.get("photo") else 0.6   # (a photo has its own soft shading in it already)
        c[:, :3] *= (1 - ao_k * occ) * (np.array([1.0, 0.9, 0.85]) ** occ)   # darker, and a little warmer, in the creases
        imgs["color"].image.pixels[:] = c.ravel()
        imgs["color"].image.save()
        nodes.remove(tx)
    bs = nodes["Principled BSDF"]
    for inp in ("Base Color", "Roughness", "Normal"):
        for link in list(bs.inputs[inp].links):
            links.remove(link)
    links.new(imgs["color"].outputs["Color"], bs.inputs["Base Color"])
    if extra:
        nm = nodes.new("ShaderNodeNormalMap")
        links.new(imgs["normal"].outputs["Color"], nm.inputs["Color"]); links.new(nm.outputs[0], bs.inputs["Normal"])
        sep = nodes.new("ShaderNodeSeparateColor")
        links.new(imgs["rough"].outputs["Color"], sep.inputs[0]); links.new(sep.outputs["Green"], bs.inputs["Roughness"])
    return imgs


if "--export" in FLAGS:
    set_expression("neutral")
    # the head: everything of the body above the base of the neck (the body is a separate, later mesh)
    bm = bmesh.new(); bm.from_mesh(hero.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < NECK.z - 0.03], context="VERTS")
    bm.to_mesh(hero.data); bm.free()
    hero.data.update()
    # the head gets the whole texture: repack MPFB's body UV islands that are left after the cut
    bpy.ops.object.select_all(action="DESELECT")
    hero.select_set(True); bpy.context.view_layer.objects.active = hero
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.select_all(action="SELECT")
    bpy.ops.uv.pack_islands(rotate=False, margin=0.004)
    bpy.ops.object.mode_set(mode="OBJECT")
    bake_maps(hero, 1024 if FAST else 2048, SHEET["id"] + "-skin")
    for e in eyes:
        if not e.name.endswith("cornea"):
            bake_maps(e, 512, e.name, extra=False)
    for nm_ in ("tint", "region", "photo", "photow"):
        if nm_ in hero.data.color_attributes:
            hero.data.color_attributes.remove(hero.data.color_attributes[nm_])
    for o in [o for o in scene.objects if o.type == "MESH" and o not in parts]:
        bpy.data.objects.remove(o)
    bpy.ops.object.select_all(action="DESELECT")
    for o in parts:
        o.select_set(True)
    glb = os.path.abspath(os.path.join(OUT, SHEET["id"] + "-head.glb"))
    bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_morph=True,
                              export_morph_normal=False, export_apply=False, export_yup=True,
                              export_image_format="WEBP" if not FAST else "AUTO")
    stats["head mesh triangles"] = tris(hero)
    stats["glb bytes"] = os.path.getsize(glb)
    print("STATS", json.dumps(stats))
    json.dump(stats, open(os.path.join(OUT, "stats.json"), "w"), indent=1)

if "--blend" in FLAGS:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(os.path.join(OUT, SHEET["id"] + ".blend")))
