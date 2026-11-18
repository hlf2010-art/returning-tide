"""The first-person hand (what shooters call the viewmodel's hand): the right hand and wrist of a Rocketbox
man (MIT; its fingers are rigged finger by finger), cut cleanly from the body, its skin tone baked to Ji
Bai's, the whole Biped skeleton kept so the game's bone names drive it. Run with Blender as a module:
  python -I tools/blender/fp_arm.py SRC.glb OUT.glb        (pip install bpy; see tools/blender/README.md)
"""
import bpy, bmesh, sys
src, out = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
mesh = next(o for o in bpy.context.scene.objects if o.type == 'MESH' and o.vertex_groups)
for o in list(bpy.context.scene.objects):
    if o.type == 'MESH' and o is not mesh: bpy.data.objects.remove(o)
# the hand, and 7 cm of wrist up the forearm (his own bare forearm meets it there: the join overlaps)
HAND = lambda n: n == 'Bip01_R_Hand' or n.startswith('Bip01_R_Finger')
hand_ids = {g.index for g in mesh.vertex_groups if HAND(g.name)}
fore_ids = {g.index for g in mesh.vertex_groups if g.name == 'Bip01_R_Forearm'}
arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
wrist = arm.matrix_world @ arm.data.bones['Bip01_R_Hand'].head_local
WRIST = 0.07
bm = bmesh.new(); bm.from_mesh(mesh.data)
dl = bm.verts.layers.deform.active
mw = mesh.matrix_world
def keep(v):
    d = v[dl]; h = sum(w for gi, w in d.items() if gi in hand_ids); f = sum(w for gi, w in d.items() if gi in fore_ids)
    return h > 0.35 or (h + f > 0.5 and (mw @ v.co - wrist).length < WRIST)
drop = [v for v in bm.verts if not keep(v)]
bmesh.ops.delete(bm, geom=drop, context='VERTS')
# fill the open end at the elbow (it sits inside his sleeve, but a cap keeps the inside from showing)
edges = [e for e in bm.edges if e.is_boundary]
if edges: bmesh.ops.holes_fill(bm, edges=edges, sides=0)
bm.to_mesh(mesh.data); bm.free()
print('kept verts', len(mesh.data.vertices))
# the skin: his is lighter and pinker (sampled from renders: tools/lab/hand.html); baked into the texture
TINT = (1.09, 1.13, 1.22)          # sRGB multipliers
for mat in mesh.data.materials:
    if not mat or not mat.use_nodes: continue
    bsdf = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    links = bsdf.inputs['Base Color'].links if bsdf else []
    for n in [l.from_node for l in links]:                       # only the colour texture (not the normal map)
        if n.type == 'TEX_IMAGE' and n.image:
            img = n.image; px = list(img.pixels)
            for i in range(0, len(px), 4):
                px[i] = min(1.0, px[i] * TINT[0]); px[i + 1] = min(1.0, px[i + 1] * TINT[1]); px[i + 2] = min(1.0, px[i + 2] * TINT[2])
            img.pixels = px; img.pack(); print('tinted', img.name, img.size[:])
# one unit everywhere: the Rocketbox file's skeleton and mesh carry different scales (cm under a 0.01 node);
# applied here so the bones and the skin agree (the game sizes the hand from its bones)
for o in bpy.context.scene.objects: o.select_set(True)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
print('scales', [(o.name, tuple(round(v, 4) for v in o.scale)) for o in bpy.context.scene.objects])
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_skins=True, export_animations=False, export_image_format='JPEG', export_jpeg_quality=88, export_yup=True)
print('wrote', out)
