"""Close the rigged hand scan (rig_scanned_hand.py's .blend) round the Manner cup: the cup's axis along the knuckle
line, just off the palm under the first finger segments (where a power grasp holds it); each finger joint closes from
the knuckle out until its skin meets the cup's wall; the thumb closes from the other side. Renders three views
(from the eye, from the side, down the cup) and saves the posed .blend.
  python -I tools/blender/scan_grip.py IN.blend OUT_DIR [--ahead=0.035] [--off=0.006]
"""
import bpy, bmesh, sys, os, math
from mathutils import Vector, Matrix, Quaternion
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
bpy.ops.wm.open_mainfile(filepath=args[0]); OUT = args[1]
opt = lambda k, d: float(next((a.split('=')[1] for a in args if a.startswith(f'--{k}=')), d))
arm, body = bpy.data.objects['Bip01'], bpy.data.objects['hand']; pb = arm.pose.bones
B = lambda n: arm.data.bones[n]
# the model's units: wrist to middle fingertip is about 19 cm on a man's hand
U = (B('Bip01_R_Hand').head_local - B('Bip01_R_Finger22').tail_local).length / 0.19
CUP_R, SKIN = 0.041 * U, 0.0025 * U
palm_n = Vector((-1, 0, 0))
def flex(name, a):
    bone = B(name); d = (bone.tail_local - bone.head_local).normalized()
    wa = d.cross(palm_n).normalized(); la = bone.matrix_local.to_3x3().inverted() @ wa
    pb[name].rotation_mode = 'QUATERNION'; pb[name].rotation_quaternion = Quaternion(la, a)
def skin_points(bones):
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get(); ev = body.evaluated_get(dg); m = ev.to_mesh()
    ids = {body.vertex_groups[b].index for b in bones if b in body.vertex_groups}
    pts = [m.vertices[v.index].co.copy() for v in body.data.vertices if any(g.group in ids and g.weight > 0.4 for g in v.groups)]
    ev.to_mesh_clear(); return pts
FING = {n: [f'Bip01_R_Finger{n}', f'Bip01_R_Finger{n}1', f'Bip01_R_Finger{n}2'] for n in range(5)}
# ---- the cup ----
k_index, k_pinky = B('Bip01_R_Finger1').head_local, B('Bip01_R_Finger4').head_local
axis = (k_pinky - k_index).normalized()
f_dir = (B('Bip01_R_Finger2').head_local - B('Bip01_R_Hand').head_local); f_dir = (f_dir - axis * f_dir.dot(axis)).normalized()
n = (palm_n - axis * palm_n.dot(axis) - f_dir * palm_n.dot(f_dir)).normalized()
klm = (k_index + k_pinky) / 2
centre = klm + n * (CUP_R + opt('off', 0.006) * U) + f_dir * opt('ahead', 0.035) * U
def dist_axis(p): v = p - centre; return (v - axis * v.dot(axis)).length
def touches(bones, skip=frozenset()):
    return min((dist_axis(p) for k, p in enumerate(skin_points(bones)) if k not in skip), default=9) < CUP_R + SKIN
def near_now(bones): return frozenset(k for k, p in enumerate(skin_points(bones)) if dist_axis(p) < CUP_R + SKIN + 0.003 * U)
# a joint has closed when its own segment's outer half meets the wall (then the next joint curls on round the cup)
def seg_touch(b):
    bpy.context.view_layer.update()
    h = arm.matrix_world @ pb[b].head; t = arm.matrix_world @ pb[b].tail; d = t - h; L2 = d.length_squared or 1e-9
    return min((dist_axis(p) for p in skin_points([b]) if (p - h).dot(d) / L2 > 0.5), default=9) < CUP_R + SKIN
print('units', round(U, 2), 'rest: nearest finger skin to the cup axis (cm)', round(min(dist_axis(p) for i in (1, 2, 3, 4) for p in skin_points(FING[i])) / U * 100, 2))
# open the hand first (the scan's fingers rest half curled, right where the cup goes), then close onto the cup
OPEN = (-0.35, -0.45, -0.3)
for i in (1, 2, 3, 4):
    for j, b in enumerate(FING[i]): flex(b, OPEN[j])
print('opened: nearest finger skin to the cup axis (cm)', round(min(dist_axis(p) for i in (1, 2, 3, 4) for p in skin_points(FING[i])) / U * 100, 2))
angles = {}
for i in (1, 2, 3, 4, 0):
    for j, b in enumerate(FING[i]):
        a = 0.0 if i == 0 else OPEN[j]; flex(b, a); LIM = ((0.9, 0.9, 0.8) if i == 0 else (1.4, 1.65, 1.2))[j]
        if seg_touch(b): angles[b] = round(a, 2); continue
        while a < LIM:
            a += 0.03; flex(b, a)
            if seg_touch(b): a -= 0.03; flex(b, a); break
        angles[b] = round(a, 2)
# an animator's pose instead (--pose=p,m,d for the four fingers, --thumb=a,b,c): set by eye against the renders
if any(a_.startswith('--pose=') for a_ in args):
    pv = [float(v) for v in next(a_ for a_ in args if a_.startswith('--pose=')).split('=')[1].split(',')]
    tv = [float(v) for v in next((a_ for a_ in args if a_.startswith('--thumb=')), '--thumb=0.4,0.5,0.5').split('=')[1].split(',')]
    spread = {1: 1.0, 2: 1.0, 3: 1.06, 4: 1.15}
    for i in (1, 2, 3, 4):
        for j, b in enumerate(FING[i]): flex(b, pv[j] * spread[i]); angles[b] = round(pv[j] * spread[i], 2)
    for j, b in enumerate(FING[0]): flex(b, tv[j]); angles[b] = tv[j]
# ---- the arc grasp: each finger laid along a circle of the cup's radius plus half a finger, tangent to the palm at
# its knuckle: the joint angles are the arc each half-segment pair spans (s / R); the cup's axis is the circle's centre
if '--arc' in args:
    R = CUP_R + 0.0085 * U
    seglen = lambda b: B(b).length
    for i in (1, 2, 3, 4):
        L = [seglen(b) for b in FING[i]]
        for j, b in enumerate(FING[i]):
            a_ = (L[j] / 2 + (L[j - 1] / 2 if j else 0.0)) / R
            flex(b, a_); angles[b] = round(a_, 2)
    tv = [float(v) for v in next((a_ for a_ in args if a_.startswith('--thumb=')), '--thumb=0.5,0.6,0.5').split('=')[1].split(',')]
    for j, b in enumerate(FING[0]): flex(b, tv[j]); angles[b] = tv[j]
    kn = B('Bip01_R_Finger2').head_local
    centre = kn + n * R + axis * axis.dot((k_index + k_pinky) / 2 - kn)
    print('arc grasp: R (cm)', round(R / U * 100, 2))
print('angles', angles)
# ---- the cup goes where the posed fingers' ring is: a circle (across the cup's axis) through the inner faces of the
# middle finger's three segments and the palm under its knuckle; its centre is the cup's axis ----
if '--fit' in args:
    import numpy as np
    def inner(b, side_pts=None):
        pts = skin_points([b]); bpy.context.view_layer.update()
        h = arm.matrix_world @ pb[b].head; t = arm.matrix_world @ pb[b].tail; mid = (h + t) / 2
        # the half of the segment's skin nearest the ring's middle (toward where the cup should be)
        return pts, mid
    e1 = f_dir; e2 = n
    def fit_ring():
        rows = []
        for i in (1, 2, 3, 4):
            for b in FING[i]: rows.append(inner(b)[1])
        xs = np.array([[(p - klm).dot(e1), (p - klm).dot(e2)] for p in rows])
        A = np.c_[xs, np.ones(len(xs))]; bb = (xs ** 2).sum(1)
        sol, *_ = np.linalg.lstsq(A, bb, rcond=None); cx, cy = sol[0] / 2, sol[1] / 2
        return cx, cy, math.sqrt(max(0, sol[2] + cx * cx + cy * cy)), rows
    # scale the authored curl until the ring through the bone centres is the cup plus a finger's half thickness
    want = CUP_R + 0.009 * U; best = None
    for k in range(10, 61):
        t = k / 40
        for i in (1, 2, 3, 4):
            for j, b in enumerate(FING[i]): flex(b, pv[j] * spread[i] * t)
        cx, cy, r, rows = fit_ring()
        if best is None or abs(r - want) < abs(best[3] - want): best = (t, cx, cy, r, rows)
    t, cx, cy, r, rows = best
    for i in (1, 2, 3, 4):
        for j, b in enumerate(FING[i]): flex(b, pv[j] * spread[i] * t); angles[b] = round(pv[j] * spread[i] * t, 2)
    print('curl scale', t)
    centre = klm + e1 * cx + e2 * cy + axis * ((sum(rows, Vector()) / len(rows) - klm).dot(axis))
    print('ring through the bone centres: radius (cm)', round(r / U * 100, 2), 'centre ahead', round(cx / U * 100, 2), 'off', round(cy / U * 100, 2))
    # the bone centres sit inside the finger (about 0.9 cm in): the cup's wall then lies that far inside the ring
    k_fit = (r - 0.009 * U) / CUP_R
    print('cup scale to fit the ring', round(k_fit, 2))
# ---- the cup itself, for the renders and the socket ----
bm = bmesh.new(); seg = 48; s = U
prof = [(0.0, 0.0), (0.030, 0.0), (0.040, 0.004), (0.0425, 0.078), (0.0448, 0.0838), (0.048, 0.0838), (0.048, 0.090), (0.0, 0.092)]
rings = [[bm.verts.new((r * s * math.cos(2 * math.pi * k / seg), r * s * math.sin(2 * math.pi * k / seg), y * s)) for r, y in prof] for k in range(seg)]
for k in range(seg):
    A, Bk = rings[k], rings[(k + 1) % seg]
    for q in range(len(prof) - 1): bm.faces.new((A[q], Bk[q], Bk[q + 1], A[q + 1]))
cm = bpy.data.meshes.new('cup'); bm.to_mesh(cm); bm.free()
for p in cm.polygons: p.use_smooth = True
cup = bpy.data.objects.new('cup', cm); bpy.context.collection.objects.link(cup)
cmat = bpy.data.materials.new('paper'); cmat.use_nodes = True; cmat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.93, 0.93, 0.91, 1); cm.materials.append(cmat)
up = axis
cup.matrix_world = Matrix.Translation(centre - up * 0.036 * U) @ Vector((0, 0, 1)).rotation_difference(up).to_matrix().to_4x4()
bpy.context.view_layer.update()
hb = arm.matrix_world @ pb['Bip01_R_Hand'].matrix
open(os.path.join(OUT, 'socket.txt'), 'w').write(repr({'socket': [list(r) for r in hb.inverted() @ cup.matrix_world], 'units': U, 'angles': angles}))
# ---- renders ----
sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 48; sc.render.resolution_x, sc.render.resolution_y = 800, 600
if not sc.world:
    w = bpy.data.worlds.new('w'); w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (0.55, 0.6, 0.68, 1); sc.world = w
if 'sun' not in sc.objects:
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = 3; sun.rotation_euler = (math.radians(45), 0, math.radians(30)); sc.collection.objects.link(sun)
cam = sc.camera or bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
if cam.name not in sc.objects: sc.collection.objects.link(cam)
sc.camera = cam; cam.data.lens = 45
def shot(name, loc):
    cam.location = loc; cam.rotation_euler = (centre - loc).to_track_quat('-Z', 'Y').to_euler(); sc.render.filepath = os.path.join(OUT, name); bpy.ops.render.render(write_still=True)
back = -f_dir
shot('scan-grip-eye.png', centre + back * 0.30 * U + up * 0.18 * U + n * 0.10 * U)
shot('scan-grip-side.png', centre - n * 0.32 * U + up * 0.05 * U)
shot('scan-grip-top.png', centre + up * 0.34 * U + back * 0.04 * U)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'scan-grip.blend'))
