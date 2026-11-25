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
        return 1.0 if p.z > EYE_L.z + 0.058 + 0.10 * max(0.0, abs(p.x) - 0.045) else 0.0
    side = abs(p.x) > 0.055
    if side and p.y < HEAD_J.y + 0.005:  # temples down to the top of the ear (sideburn to mid-ear)
        return 1.0 if p.z > EYE_L.z - 0.012 else 0.0
    if p.y >= HEAD_J.y + 0.005:  # behind the ears to the nape
        return 1.0 if p.z > NECK.z + 0.045 else 0.0
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
        scalp_t = 1.0 if hairline(c) and c.z > EYE_L.z - 0.02 else 0.0
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
    sf = N.new("ShaderNodeMath"); sf.operation = "MULTIPLY"; sf.inputs[1].default_value = 0.35
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
    scalpc.inputs["B"].default_value = (0.045, 0.035, 0.03, 1)
    sm = N.new("ShaderNodeMath"); sm.operation = "MULTIPLY"; sm.inputs[1].default_value = 0.85
    L.new(attr.outputs["Alpha"], sm.inputs[0]); L.new(sm.outputs[0], scalpc.inputs["Factor"])
    L.new(stc.outputs["Result"], scalpc.inputs["A"])
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
    L.new(pores.outputs["Distance"], rr.inputs["Value"]); L.new(rr.outputs[0], bs.inputs["Roughness"])
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
            centre = eye.z + 0.0160 + 0.003 * math.sin(t * math.pi * 0.9) - 0.001 * t
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
        count = 70
        for k in range(count):
            t = min(0.999, (k + RNG.random()) / count)
            if t < 0.06:                           # none in the tear duct's corner
                continue
            d_ = t * total
            i = max(1, next(j for j in range(1, len(acc)) if acc[j] >= d_))
            f = (d_ - acc[i - 1]) / max(1e-9, acc[i] - acc[i - 1])
            p = rim[i - 1].lerp(rim[i], f) + Vector((0, -0.0002, -0.0001))
            lat = Vector((sgn * (0.15 + 0.55 * max(0.0, t - 0.45)), 0, 0))
            L_ = 0.0056 * (0.45 + 0.55 * math.sin(math.pi * min(1.0, 0.25 + t * 0.85))) * (0.8 + 0.4 * RNG.random())
            d = (Vector((0, -1, -0.15)) + lat + Vector(((RNG.random() - 0.5) * 0.2, 0, 0))).normalized()
            seg = [p]
            for _ in range(4):
                seg.append(seg[-1] + d * L_ / 4)
                d = (d + Vector((0, 0.02, 0.32))).normalized()    # the curl
            fwd = Vector((0, -1, 0.25)).normalized()
            ribbon(seg, [0.00014, 0.00012, 0.00009, 0.00005, 0.00002], fwd, verts, faces, uvs)
    return make_mesh("lashes", verts, faces, uvs, hair_material("lash-hair", (0.012, 0.010, 0.009)))


# --------------------------------------------------------------------------------------------- hair (cards)
def to_srgb(c):
    return 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055


def strand_texture(name, color, w=256, h=1024, strands=150):
    """An alpha texture of strands for the hair cards (tapered, some longer than others)."""
    img = bpy.data.images.new(name, w, h, alpha=True)
    import array
    px = array.array("f", [0.0] * (w * h * 4))
    r = random.Random(3)
    for s in range(strands):
        x0 = r.random() * w
        length = 0.65 + 0.35 * r.random()
        width = 1.6 + 2.2 * r.random()
        shade = 0.7 + 0.6 * r.random()
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
                        for ch in range(3):
                            px[i + ch] = to_srgb(min(1.0, color[ch] * shade))
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


brow_ob = brows()
lash_ob = lashes()
hair_ob = hair_cards()
parts = [hero, teeth, tongue, *eyes, brow_ob, lash_ob, hair_ob]


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
        c[:, :3] *= (1 - 0.6 * occ) * (np.array([1.0, 0.9, 0.85]) ** occ)   # darker, and a little warmer, in the creases
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
    for nm_ in ("tint", "region"):
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
