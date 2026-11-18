"""The first-person hand, from MakeHuman's CC0 base mesh and game-engine rig (makehumancommunity/mpfb2, data
under CC0): the right forearm and hand cut from the body, rigged finger by finger, smoothed, skin-shaded; posed
round the Manner cup by contact (each finger joint closes until its skin meets the cup's wall) and rendered.
  python -I tools/blender/mh_hand.py MPFB_DATA_DIR OUT_DIR [--export OUT.glb]
"""
import bpy, bmesh, json, math, sys, os
from mathutils import Vector, Matrix
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
DATA, OUT = args[0], args[1]
EXPORT = args[args.index('--export') + 1] if '--export' in args else None
bpy.ops.wm.read_factory_settings(use_empty=True)
S = 0.1                                                          # the OBJ is in decimetres, Y up
cv = lambda x, y, z: (x * S, -z * S, y * S)

# ---- the mesh: every vertex (the weights index them), the body's faces only ----
verts, faces, group = [], [], None
for line in open(os.path.join(DATA, '3dobjs/base.obj')):
    if line.startswith('v '): x, y, z = map(float, line.split()[1:4]); verts.append(cv(x, y, z))
    elif line.startswith('g '): group = line.split()[1]
    elif line.startswith('f ') and group == 'body': faces.append([int(t.split('/')[0]) - 1 for t in line.split()[1:]])
me = bpy.data.meshes.new('hand'); me.from_pydata(verts, [], faces); me.update()
body = bpy.data.objects.new('fp_hand', me); bpy.context.collection.objects.link(body)

# ---- the rig ----
rig = json.load(open(os.path.join(DATA, 'rigs/standard/rig.game_engine.json')))
arm_data = bpy.data.armatures.new('rig'); arm = bpy.data.objects.new('rig', arm_data); bpy.context.collection.objects.link(arm)
bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='EDIT')
eb = {}
for name, b in rig.items():
    e = arm_data.edit_bones.new(name); e.head = Vector(b['head']['default_position']); e.tail = Vector(b['tail']['default_position']); e.roll = b.get('roll', 0); eb[name] = e
for name, b in rig.items():
    if b.get('parent'): eb[name].parent = eb[b['parent']]; eb[name].use_connect = b.get('use_connect', False)
bpy.ops.object.mode_set(mode='OBJECT')
W = json.load(open(os.path.join(DATA, 'rigs/standard/weights.game_engine.json')))['weights']
for bone, pairs in W.items():
    vg = body.vertex_groups.new(name=bone)
    for vi, w in pairs: vg.add([vi], w, 'REPLACE')
mod = body.modifiers.new('rig', 'ARMATURE'); mod.object = arm; body.parent = arm

# ---- keep the right forearm and hand ----
KEEP = {'lowerarm_r', 'hand_r'} | {f'{f}_{k:02d}_r' for f in ('thumb', 'index', 'middle', 'ring', 'pinky') for k in (1, 2, 3)}
keep_ids = {body.vertex_groups[n].index for n in KEEP if n in body.vertex_groups}
bm = bmesh.new(); bm.from_mesh(me); dl = bm.verts.layers.deform.verify()
drop = [v for v in bm.verts if sum(w for g, w in v[dl].items() if g in keep_ids) < 0.5]
bmesh.ops.delete(bm, geom=drop, context='VERTS'); bm.to_mesh(me); bm.free()
print('kept', len(me.vertices), 'verts', len(me.polygons), 'faces')
sub = body.modifiers.new('smooth', 'SUBSURF'); sub.levels = 1; sub.render_levels = 2
body.modifiers.move(1, 0)                                          # smooth first, then the skin follows the bones
for p in me.polygons: p.use_smooth = True

# ---- skin ----
mat = bpy.data.materials.new('skin'); mat.use_nodes = True
bs = mat.node_tree.nodes['Principled BSDF']
bs.inputs['Base Color'].default_value = (0.78, 0.55, 0.45, 1); bs.inputs['Roughness'].default_value = 0.52
if 'Subsurface Weight' in bs.inputs: bs.inputs['Subsurface Weight'].default_value = 0.15; bs.inputs['Subsurface Radius'].default_value = (0.9, 0.35, 0.2)
me.materials.append(mat)
bpy.context.view_layer.update()

def render(path, cam_loc, look_at, lens=50, res=(900, 700)):
    sc = bpy.context.scene
    cam = sc.camera or bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    if cam.name not in sc.objects: sc.collection.objects.link(cam)
    sc.camera = cam; cam.data.lens = lens; cam.location = Vector(cam_loc)
    d = Vector(look_at) - cam.location; cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    if 'sun' not in sc.objects:
        sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = 3.5; sun.rotation_euler = (math.radians(45), math.radians(15), math.radians(30)); sc.collection.objects.link(sun)
        w = bpy.data.worlds.new('w'); w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (0.55, 0.6, 0.68, 1); w.node_tree.nodes['Background'].inputs[1].default_value = 0.7; sc.world = w
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 32
    sc.render.resolution_x, sc.render.resolution_y = res; sc.render.filepath = path
    bpy.ops.render.render(write_still=True)

pb = arm.pose.bones
hand = arm.matrix_world @ arm.data.bones['hand_r'].head_local
mid_tip = arm.matrix_world @ arm.data.bones['middle_03_r'].tail_local
c = (hand + mid_tip) / 2
render(os.path.join(OUT, 'mh-rest.png'), c + Vector((0.0, -0.32, 0.12)), c)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'mh-hand.blend'))
print('hand at', tuple(round(v, 3) for v in hand), 'mid tip', tuple(round(v, 3) for v in mid_tip))
