"""The Bund's classical kit, modelled in Blender: the pieces world/bund.js puts where its columns, cornices and
parapets go (it decides where; these are what), each at a unit size the code scales:
  colBase   a column's Attic base (plinth, two tori, a scotia), for a shaft of radius 1; height in radius units
  colShaft  a shaft of radius 1 and height 1: 24 flutes, tapering to 0.86 (entasis)
  colCap    a Roman Doric capital (necking, echinus, abacus) for a shaft of radius 0.86 at its top
  cornice   one metre of a cornice, 1 high and projecting 1: fascia, cyma reversa, dentils, corona, cyma recta
  baluster  a vase baluster 1 high
  python -I tools/blender/bund_kit.py OUT.glb
"""
import bpy, bmesh, math, sys
from mathutils import Vector, Matrix
out = sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)

def lathe(name, prof, seg=32):
    # prof: [(r, y)] bottom to top; revolved about y (Blender z is up: built in x,z then exported y-up)
    bm = bmesh.new(); rings = []
    for k in range(seg):
        a = 2 * math.pi * k / seg; ca, sa = math.cos(a), math.sin(a)
        rings.append([bm.verts.new((r * ca, r * sa, y)) for r, y in prof])
    for k in range(seg):
        A, Bk = rings[k], rings[(k + 1) % seg]
        for i in range(len(prof) - 1): bm.faces.new((A[i], Bk[i], Bk[i + 1], A[i + 1]))
    # caps
    bot = bm.verts.new((0, 0, prof[0][1])); top = bm.verts.new((0, 0, prof[-1][1]))
    for k in range(seg):
        A, Bk = rings[k], rings[(k + 1) % seg]
        bm.faces.new((bot, Bk[0], A[0])); bm.faces.new((top, A[-1], Bk[-1]))
    return finish(name, bm)

def finish(name, bm):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    ob = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(ob)
    return ob

def arc(r0, y0, r1, y1, bulge, n=6):
    # points along a quarter-ish curve from (r0,y0) to (r1,y1), pushed out by bulge (a torus or a cavetto)
    pts = []
    for i in range(n + 1):
        t = i / n; r = r0 + (r1 - r0) * t + bulge * math.sin(math.pi * t); y = y0 + (y1 - y0) * t
        pts.append((r, y))
    return pts

# ---- the base: plinth 0.5 high and 1.5 wide (radius units), lower torus, scotia, upper torus, fillet ----
p = [(0, 0), (1.5, 0), (1.5, 0.5)]
p += arc(1.42, 0.5, 1.42, 0.78, 0.12)[1:]          # lower torus
p += [(1.24, 0.8)] + arc(1.2, 0.82, 1.14, 1.0, -0.1)[1:]   # scotia
p += arc(1.16, 1.0, 1.16, 1.18, 0.08)[1:]          # upper torus
p += [(1.04, 1.2), (1.0, 1.26)]
lathe('colBase', p)

# ---- the shaft: 24 flutes, radius 1 at the foot, 0.86 at the top ----
seg, FL, depth = 24, 8, 0.07
bm = bmesh.new(); rows = []
for j, (z, s) in enumerate([(0, 1.0), (0.33, 0.985), (0.66, 0.94), (1.0, 0.86)]):
    row = []
    for k in range(seg):
        for f in range(FL):
            u = (k + f / FL) / seg; a = 2 * math.pi * u
            r = s * (1 - depth * math.sin(math.pi * f / FL) ** 2 * (1 if f > 0 else 0))
            row.append(bm.verts.new((r * math.cos(a), r * math.sin(a), z)))
    rows.append(row)
N = seg * FL
for j in range(len(rows) - 1):
    A, Bj = rows[j], rows[j + 1]
    for i in range(N): bm.faces.new((A[i], A[(i + 1) % N], Bj[(i + 1) % N], Bj[i]))
finish('colShaft', bm)

# ---- the capital: astragal, necking, echinus, abacus (for a top radius of 0.86) ----
c = [(0, 0), (0.92, 0)] + arc(0.92, 0, 0.92, 0.12, 0.05)[1:] + [(0.88, 0.14), (0.88, 0.42)]
c += arc(0.9, 0.42, 1.25, 0.7, 0.06)[1:]            # echinus, swelling out
c += [(1.3, 0.72), (1.3, 0.98), (0, 0.98)]
cap = lathe('colCap', c, seg=32)
# the abacus is square: replace the top with a square slab
bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
for v in bm.verts: v.co = Vector((v.co.x * 2.7, v.co.y * 2.7, 0.72 + (v.co.z + 0.5) * 0.26))
ab = finish('abacus', bm)
bpy.ops.object.select_all(action='DESELECT'); cap.select_set(True); ab.select_set(True); bpy.context.view_layer.objects.active = cap; bpy.ops.object.join()

# ---- the cornice: a profile (z out from the wall, y up) extruded one metre along x ----
prof = [(0, 0), (0.12, 0), (0.12, 0.18)]                                    # fascia
prof += [(0.12 + 0.1 * math.sin(math.pi * t / 2), 0.18 + 0.12 * t) for t in [0.25, 0.5, 0.75, 1.0]]   # cyma reversa
prof += [(0.24, 0.32), (0.24, 0.36), (0.38, 0.36), (0.38, 0.5)]             # bed for the dentils
prof += [(0.5, 0.5), (0.5, 0.52), (0.82, 0.52), (0.82, 0.74)]               # soffit and the corona's face
prof += [(0.82 + 0.18 * (1 - math.cos(math.pi * t / 2)), 0.74 + 0.22 * math.sin(math.pi * t / 2)) for t in [0.25, 0.5, 0.75, 1.0]]   # cyma recta
prof += [(1.0, 1.0), (0, 1.0)]
bm = bmesh.new()
L = [bm.verts.new((-0.5, z, y)) for z, y in prof]; R = [bm.verts.new((0.5, z, y)) for z, y in prof]
for i in range(len(prof)): bm.faces.new((L[i], L[(i + 1) % len(prof)], R[(i + 1) % len(prof)], R[i]))
bm.faces.new(list(reversed(L))); bm.faces.new(R)
# dentils: small blocks under the corona every 1/8 m
for k in range(8):
    x = -0.5 + (k + 0.5) / 8
    d = bmesh.ops.create_cube(bm, size=1.0)['verts']
    for v in d: v.co = Vector((x + v.co.x * 0.07, 0.38 + (v.co.y + 0.5) * 0.12, 0.38 + (v.co.z + 0.5) * 0.12))
cor = finish('cornice', bm)
for p_ in cor.data.polygons: p_.use_smooth = False

# ---- a vase baluster, 1 high ----
b = [(0, 0), (0.16, 0), (0.16, 0.08), (0.11, 0.1)]
b += [(0.11 + 0.08 * math.sin(math.pi * t), 0.1 + 0.42 * t) for t in [0.15, 0.35, 0.5, 0.65, 0.85]]
b += [(0.06, 0.6), (0.06, 0.66)] + [(0.06 + 0.04 * math.sin(math.pi * t), 0.66 + 0.18 * t) for t in [0.3, 0.7]]
b += [(0.07, 0.86), (0.15, 0.9), (0.15, 1.0), (0, 1.0)]
lathe('baluster', b, seg=16)

# y-up on export: Blender's z becomes glTF's y; x stays x; Blender y becomes glTF -z
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_yup=True, export_apply=True, export_materials='NONE')
print('wrote', out, [o.name for o in bpy.context.scene.objects])
