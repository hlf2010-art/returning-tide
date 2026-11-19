"""Rig an unrigged hand scan (the CC-BY 'hand' by kevinruiz on Sketchfab: fingers along -z, palm toward -x): each
finger's centreline is traced through horizontal slices (2D clusters), its joints put along it in a real finger's
proportions, a Biped-named skeleton built (so the game's code drives it like the other hands), and the skin
weighted by Blender's bone heat. Saves a .blend and test renders of a fist.
  python -I tools/blender/rig_scanned_hand.py hand.glb OUT_DIR
"""
import bpy, sys, os, math
from mathutils import Vector
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
SRC, OUT = args[0], args[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
# the skin and the nails are separate meshes: the skin gets the bone heat, the nails then copy the weights of the skin
# under them (bone heat on loose pieces lets them slide off the fingers)
meshes.sort(key=lambda o: -len(o.data.vertices))
for o in meshes:
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM'); bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
body, extras = meshes[0], meshes[1:]
body.name = 'hand'
P = [v.co.copy() for v in body.data.vertices]

def comps(sl, cell=0.025):
    g = {}
    for p in sl: g.setdefault((int(p.x // cell), int(p.y // cell)), []).append(p)
    seen, out = set(), []
    for k in g:
        if k in seen: continue
        st, cc = [k], []; seen.add(k)
        while st:
            a = st.pop(); cc += g[a]
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    b = (a[0] + dx, a[1] + dy)
                    if b in g and b not in seen: seen.add(b); st.append(b)
        if len(cc) > 12: out.append(cc)
    return out
def slice_centres(z):
    return [sum(c, Vector()) / len(c) for c in comps([p for p in P if abs(p.z - z) < 0.008])]
# ---- trace: from where the fingers have parted, follow each down (nearest cluster in y), until it ends ----
seeds = {'index': -0.37, 'middle': -0.15, 'ring': 0.05, 'pinky': 0.18}
lines = {f: [] for f in seeds}
for k in range(60):
    z = -0.62 - k * 0.008
    cs = [c for c in slice_centres(z) if c.x > 0.25]
    for f, y in seeds.items():
        if lines[f] is not None and lines[f] and lines[f][-1] == 'end': continue
        best = min(cs, key=lambda c: abs(c.y - (lines[f][-1].y if lines[f] else y)), default=None)
        if best is None or abs(best.y - (lines[f][-1].y if lines[f] else y)) > (0.06 if lines[f] else 0.08): lines[f].append('end'); continue
        lines[f].append(best)
for f in lines: lines[f] = [p for p in lines[f] if p != 'end']
print('traced', {f: len(v) for f, v in lines.items()})
# upward from the parting to the knuckles: the same finger's cluster above z -0.6 (it merges into the palm at ~-0.47)
def up_to_knuckle(f):
    pts = []; y = lines[f][0].y
    for k in range(20):
        z = -0.60 + k * 0.008
        cs = [c for c in slice_centres(z) if c.x > 0.25]
        best = min(cs, key=lambda c: abs(c.y - y), default=None)
        if best is None or abs(best.y - y) > 0.07: break
        pts.append(best); y = best.y
    return list(reversed(pts))
lowest = lambda f: min((p for p in P if abs(p.y - lines[f][-1].y) < 0.05 and p.x > 0.25 and p.z < lines[f][-1].z + 0.05), key=lambda p: p.z)
J = {}
for f in seeds:
    path = up_to_knuckle(f) + lines[f] + [lowest(f)]
    # the knuckle (MCP): a little above where the finger leaves the palm
    mcp = path[0] + Vector((0, 0, 0.05))
    tip = path[-1]
    seg = [mcp] + path + [tip]
    L = [0]; [L.append(L[-1] + (seg[i] - seg[i - 1]).length) for i in range(1, len(seg))]
    at = lambda t: next(seg[i - 1].lerp(seg[i], (t * L[-1] - L[i - 1]) / max(1e-6, L[i] - L[i - 1])) for i in range(1, len(seg)) if L[i] >= t * L[-1])
    J[f] = [mcp, at(0.47), at(0.76), tip]                                      # MCP, PIP, DIP, tip (proximal 47%, middle 29%)
# ring and little finger run close and the little finger curls toward the palm (out of the slices' plane): their
# joints from the slice table (a ring at y 0.03-0.06, a little finger at y 0.17-0.19), the little fingertip from the skin
pk_tip = min((p for p in P if 0.12 < p.y < 0.25 and p.x > 0.2 and p.z < -0.55), key=lambda p: p.z)
J['ring'] = [Vector((0.50, 0.075, -0.46)), Vector((0.445, 0.05, -0.70)), Vector((0.40, 0.034, -0.81)), Vector((0.373, 0.028, -0.886))]
J['pinky'] = [Vector((0.45, 0.165, -0.47)), Vector((0.39, 0.186, -0.61)), Vector((0.375, 0.18, -0.672)).lerp(pk_tip, 0.25), pk_tip]
# the thumb: its cluster near x 0, from z -0.2 down to its tip
th = []
for k in range(60):
    z = -0.15 - k * 0.008
    cs = [c for c in slice_centres(z) if c.x < 0.25]
    if not cs: break
    th.append(min(cs, key=lambda c: abs(c.y + 0.48)))
th_tip = min((p for p in P if p.x < 0.25 and p.z < th[-1].z + 0.04), key=lambda p: p.z)
wrist = sum((p for p in P if abs(p.z - 0.05) < 0.01), Vector()) / max(1, len([p for p in P if abs(p.z - 0.05) < 0.01]))
elbow = sum((p for p in P if abs(p.z - 0.95) < 0.01), Vector()) / max(1, len([p for p in P if abs(p.z - 0.95) < 0.01]))
cmc = wrist.lerp(th[0], 0.45)
J['thumb'] = [cmc, th[int(len(th) * 0.25)], th[int(len(th) * 0.7)], th_tip]
for f, j in J.items(): print(f, [tuple(round(c, 3) for c in p) for p in j])

# ---- the skeleton, named as the game's Biped hands are (Bip01_R_Hand, Finger0..4 with 1/2 suffixes) ----
arm_data = bpy.data.armatures.new('Bip01'); arm = bpy.data.objects.new('Bip01', arm_data); bpy.context.collection.objects.link(arm)
bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='EDIT')
def bone(n, h, t, parent=None):
    e = arm_data.edit_bones.new(n); e.head = h; e.tail = t
    if parent: e.parent = arm_data.edit_bones[parent]
    return e
bone('Bip01_R_Forearm', elbow, wrist)
bone('Bip01_R_Hand', wrist, J['middle'][0], 'Bip01_R_Forearm')
NUM = {'thumb': 0, 'index': 1, 'middle': 2, 'ring': 3, 'pinky': 4}
palm_n = Vector((-1, 0, 0))
for f, j in J.items():
    n = NUM[f]; names = [f'Bip01_R_Finger{n}', f'Bip01_R_Finger{n}1', f'Bip01_R_Finger{n}2']
    parent = 'Bip01_R_Hand'
    for i in range(3):
        e = bone(names[i], j[i], j[i + 1], parent); e.align_roll(palm_n); parent = names[i]
bpy.ops.object.mode_set(mode='OBJECT')
# ---- weights by bone heat ----
bpy.ops.object.select_all(action='DESELECT'); body.select_set(True); arm.select_set(True); bpy.context.view_layer.objects.active = arm
bpy.ops.object.parent_set(type='ARMATURE_AUTO')
for ex in extras:
    for g in body.vertex_groups: ex.vertex_groups.new(name=g.name)
    dt = ex.modifiers.new('weights', 'DATA_TRANSFER'); dt.object = body; dt.use_vert_data = True; dt.data_types_verts = {'VGROUP_WEIGHTS'}
    dt.vert_mapping = 'POLYINTERP_NEAREST'; dt.layers_vgroup_select_src = 'ALL'; dt.layers_vgroup_select_dst = 'NAME'
    bpy.ops.object.select_all(action='DESELECT'); ex.select_set(True); bpy.context.view_layer.objects.active = ex
    bpy.ops.object.datalayout_transfer(modifier='weights'); bpy.ops.object.modifier_apply(modifier='weights')
    m = ex.modifiers.new('rig', 'ARMATURE'); m.object = arm; ex.parent = arm
    ex.name = 'nails'
print('groups', len(body.vertex_groups), 'weighted verts', sum(1 for v in body.data.vertices if len(v.groups)))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'scan-rigged.blend'))
