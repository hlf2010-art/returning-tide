"""Close the MakeHuman hand (mh_hand.py's .blend) round the Manner cup by contact: the cup is put against the palm,
then each finger, joint by joint from the knuckle out, closes until its skin meets the cup's wall; the thumb
closes from the other side. Renders close-ups; saves the posed .blend.
  python -I tools/blender/mh_grip.py IN.blend OUT_DIR
"""
import bpy, bmesh, math, sys, os
from mathutils import Vector, Matrix, Quaternion
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
bpy.ops.wm.open_mainfile(filepath=args[0]); OUT = args[1]
arm, body = bpy.data.objects['rig'], bpy.data.objects['fp_hand']
sub = body.modifiers['smooth']; sub.show_viewport = False          # (the contact test on the base mesh: faster)
pb = arm.pose.bones
CUP_R, CUP_H, LID_R, SKIN = 0.041, 0.084, 0.048, 0.0025
dg = lambda: bpy.context.evaluated_depsgraph_get()
def skin_points(bones):
    # the deformed positions of the vertices those bones own (weight > 0.4), world space
    bpy.context.view_layer.update()
    ev = body.evaluated_get(dg()); m = ev.to_mesh(); mw = body.matrix_world
    ids = {body.vertex_groups[b].index for b in bones if b in body.vertex_groups}
    pts = [mw @ m.vertices[v.index].co for v in body.data.vertices if any(g.group in ids and g.weight > 0.4 for g in v.groups)]
    ev.to_mesh_clear(); return pts
def bone_head(n): bpy.context.view_layer.update(); return arm.matrix_world @ pb[n].head
FING = {f: [f'{f}_{k:02d}_r' for k in (1, 2, 3)] for f in ('index', 'middle', 'ring', 'pinky', 'thumb')}

# ---- the palm's normal: the thin axis of the palm's vertices (PCA), on the side the thumb's root is ----
hand = bone_head('hand_r'); knuck = bone_head('middle_01_r')
f_dir = (knuck - hand).normalized()
palm_pts = skin_points(['hand_r'])
pc = sum(palm_pts, Vector()) / len(palm_pts)
C = Matrix(((0, 0, 0), (0, 0, 0), (0, 0, 0)))
for p in palm_pts:
    d = p - pc
    for a in range(3):
        for b in range(3): C[a][b] += d[a] * d[b]
# power iteration for the smallest eigenvector: invert by shifting
import numpy as np
M = np.array([[C[a][b] for b in range(3)] for a in range(3)]); w, V = np.linalg.eigh(M)
palm_n = Vector(V[:, 0]).normalized()
# the palm's side: the way the finger pads face. A finger closing about (its direction x n) toward n must move its tip
# toward the palm; test the middle finger both ways and keep the side where its tip ends nearer the wrist's front
if (bone_head('thumb_01_r') - pc).dot(palm_n) < 0: palm_n = -palm_n
if '--flip' in args: palm_n = -palm_n
palm_n = (palm_n - f_dir * palm_n.dot(f_dir)).normalized()
axis = f_dir.cross(palm_n).normalized()
print('palm normal', tuple(round(v, 3) for v in palm_n))

# ---- each joint closes about its own flexion axis: bone direction x palm normal (in the bone's rest frame) ----
def flex(b, a):
    bone = arm.data.bones[b]
    d = (bone.tail_local - bone.head_local).normalized()
    wa = d.cross(palm_n).normalized()                      # rotating d about wa by +a moves it toward palm_n
    la = bone.matrix_local.to_3x3().inverted() @ wa
    pb[b].rotation_mode = 'QUATERNION'; pb[b].rotation_quaternion = Quaternion(la, a)

# ---- the cup: its axis along the bend axis, its wall on the palm's face ----
# ---- where the cup goes, as an animator puts it: its axis along the knuckle line (index to little finger), its
# wall just off the palm's side of the knuckles; the fingers then close onto it ----
k_index, k_pinky = bone_head('index_01_r'), bone_head('pinky_01_r')
axis = (k_pinky - k_index).normalized()
f_dir = (f_dir - axis * f_dir.dot(axis)).normalized()
palm_n = axis.cross(f_dir).normalized()
# the palm's side: where the resting fingertips already lean
lean = tip('middle_03_r') - bone_head('middle_01_r') if 'tip' in globals() else None
bpy.context.view_layer.update(); t_mid = arm.matrix_world @ pb['middle_03_r'].tail
if (t_mid - knuck).dot(palm_n) < 0: palm_n = -palm_n
klm = (k_index + k_pinky) / 2
centre = klm + palm_n * (CUP_R + float(next((a.split('=')[1] for a in args if a.startswith('--off=')), '0.02'))) + f_dir * float(next((a.split('=')[1] for a in args if a.startswith('--ahead=')), '0.0'))
print('cup centre from knuckles: n', round((centre - klm).dot(palm_n), 3), 'f', round((centre - klm).dot(f_dir), 3))
def dist_axis(p): v = p - centre; return (v - axis * v.dot(axis)).length
def touches(bones, skip=frozenset()):
    return min((dist_axis(p) for k, p in enumerate(skin_points(bones)) if k not in skip), default=1) < CUP_R + SKIN
def near_now(bones):
    # skin already at the wall before this joint moves (by its knuckle): not what tells it has closed
    return frozenset(k for k, p in enumerate(skin_points(bones)) if dist_axis(p) < CUP_R + SKIN + 0.003)
print('at rest, nearest finger skin to the cup axis:', round(min(dist_axis(p) for f in ('index', 'middle', 'ring', 'pinky') for p in skin_points(FING[f])), 4))

if '--probe' in args:
    for a_ in (0.0, 0.4, 0.8):
        flex('middle_01_r', a_); bpy.context.view_layer.update()
        t_ = arm.matrix_world @ pb['middle_03_r'].tail
        print('probe', a_, 'tip-axis', round(dist_axis(t_), 4), 'tip.n', round((t_ - pc).dot(palm_n), 4), 'min skin', round(min(dist_axis(p) for p in skin_points(FING['middle'])), 4))
    flex('middle_01_r', 0.0)
    print('arm mw identity', arm.matrix_world == Matrix.Identity(4), 'centre-pc.n', round((centre - pc).dot(palm_n), 4), 'centre-pc.f', round((centre - pc).dot(f_dir), 4), 'centre-pc.axis', round((centre - pc).dot(axis), 4))
    raise SystemExit
# ---- close each finger joint by joint until it touches the wall ----
angles = {}
for f in ('index', 'middle', 'ring', 'pinky'):
    chain = FING[f]
    for j, b in enumerate(chain):
        a = 0.0; skip = near_now(chain[j:]); LIM = (1.35, 1.6, 1.15)[j]          # how far each joint of a real finger bends
        while a < LIM:
            a += 0.04; flex(b, a)
            if touches(chain[j:], skip): a -= 0.04; flex(b, a); break
        angles[b] = round(a, 3)
# ---- the thumb: closes toward the cup (about its flexion axis), joint by joint, until it touches ----
for j, b in enumerate(FING['thumb']):
    a = 0.0; skip = near_now(FING['thumb'][j:])
    while a < 1.2:
        a += 0.04; flex(b, a)
        if touches(FING['thumb'][j:], skip): a -= 0.04; flex(b, a); break
    angles[b] = round(a, 3)
print('angles', angles)

# ---- the cup itself (for the renders and for the socket): a lathe of the Manner cup's outline ----
bm = bmesh.new(); seg = 40
prof = [(0.0, 0.0), (0.030, 0.0), (0.040, 0.004), (0.0425, 0.078), (0.0448, 0.0838), (0.048, 0.0838), (0.048, 0.090), (0.0, 0.092)]
rings = [[bm.verts.new((r * math.cos(2 * math.pi * k / seg), r * math.sin(2 * math.pi * k / seg), y)) for r, y in prof] for k in range(seg)]
for k in range(seg):
    A, B = rings[k], rings[(k + 1) % seg]
    for i in range(len(prof) - 1): bm.faces.new((A[i], B[i], B[i + 1], A[i + 1]))
cm = bpy.data.meshes.new('cup'); bm.to_mesh(cm); bm.free()
cup = bpy.data.objects.new('cup', cm); bpy.context.collection.objects.link(cup)
cmat = bpy.data.materials.new('paper'); cmat.use_nodes = True; cmat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.92, 0.92, 0.9, 1); cm.materials.append(cmat)
for p in cm.polygons: p.use_smooth = True
# stand it on its axis, the grip (3.6 cm up) at the palm's middle
up = axis if axis.z >= 0 else -axis
rot = Vector((0, 0, 1)).rotation_difference(up).to_matrix().to_4x4()
cup.matrix_world = Matrix.Translation(centre - up * 0.036) @ rot
# the socket: the cup's base frame in the hand bone's frame (the game puts the cup there)
bpy.context.view_layer.update()
hb = arm.matrix_world @ pb['hand_r'].matrix
sock = hb.inverted() @ cup.matrix_world
open(os.path.join(OUT, 'socket.txt'), 'w').write(repr([list(r) for r in sock]))

sub.show_viewport = True
# ---- renders: from where the eye would be (behind, above, a little left), and from the side ----
sc = bpy.context.scene
cam = sc.camera
def shot(name, loc):
    cam.location = loc; d = centre - loc; cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler(); cam.data.lens = 45
    sc.cycles.samples = 48; sc.render.filepath = os.path.join(OUT, name); bpy.ops.render.render(write_still=True)
back = -f_dir; side = axis.cross(f_dir).normalized()
shot('mh-grip-a.png', centre + back * 0.32 + up * 0.16 - palm_n * 0.08)
shot('mh-grip-b.png', centre + palm_n * 0.30 + up * 0.06)
shot('mh-grip-c.png', centre - palm_n * 0.30 + up * 0.10 + back * 0.05)
shot('mh-grip-d.png', centre + up * 0.36 + back * 0.02)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'mh-grip.blend'))
