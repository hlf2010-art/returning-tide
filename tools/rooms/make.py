# Shop interiors for the shop windows (world/shopfronts.js): Poly Haven's 360-degree photographs taken
# inside real shops (CC0, https://polyhaven.com), turned into cube maps: six square faces, packed
# 3 x 2 in one JPEG per room (+X -X +Y / -Y +Z -Z, the order WebGL's cube faces take), laid out for
# WebGL's own cube-map lookup so the game can sample them with a plain direction.
#   python3 tools/rooms/make.py <download dir> [face size]      (writes public/rooms/*.jpg)
# Needs numpy and Pillow.
import sys, os, json, urllib.request
import numpy as np
from PIL import Image

ROOMS = ['phone_shop', 'decor_shop', 'witsand_woolshop', 'museum_of_ethnography', 'comfy_cafe', 'warm_restaurant', 'royal_esplanade']
src = sys.argv[1]; N = int(sys.argv[2]) if len(sys.argv) > 2 else 512
out = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'rooms')
os.makedirs(src, exist_ok=True); os.makedirs(out, exist_ok=True)

UA = {'User-Agent': 'game-asset-tools/1.0'}
def get(url): return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=300).read()
def fetch(rid):
  p = os.path.join(src, rid + '.jpg')
  if not os.path.exists(p):
    meta = json.loads(get(f'https://api.polyhaven.com/files/{rid}'))
    open(p, 'wb').write(get(meta['tonemapped']['url']))
  return p

# WebGL cube face for (face, s, t): the direction (x, y, z) that samples it (the spec's table inverted)
def face_dirs(f, n):
  t, s = np.meshgrid((np.arange(n) + 0.5) / n * 2 - 1, (np.arange(n) + 0.5) / n * 2 - 1, indexing='ij')   # t: rows, s: columns
  one = np.ones_like(s)
  return {0: (one, -t, -s), 1: (-one, -t, s), 2: (s, one, t), 3: (s, -one, -t), 4: (s, -t, one), 5: (-s, -t, -one)}[f]

def equirect(img, x, y, z):
  # u: 0.5 straight ahead (-z), increasing to the right (+x); v: 0 at the zenith
  h, w, _ = img.shape
  r = np.sqrt(x * x + y * y + z * z); x, y, z = x / r, y / r, z / r
  u = (0.5 + np.arctan2(x, -z) / (2 * np.pi)) * w - 0.5
  v = (0.5 - np.arcsin(np.clip(y, -1, 1)) / np.pi) * h - 0.5
  u0 = np.floor(u).astype(int); v0 = np.floor(v).astype(int); fu = (u - u0)[..., None]; fv = (v - v0)[..., None]
  u1 = (u0 + 1) % w; u0 %= w; v1 = np.clip(v0 + 1, 0, h - 1); v0 = np.clip(v0, 0, h - 1)
  a = img[v0, u0] * (1 - fu) + img[v0, u1] * fu; b = img[v1, u0] * (1 - fu) + img[v1, u1] * fu
  return a * (1 - fv) + b * fv

for rid in ROOMS:
  im = Image.open(fetch(rid)).convert('RGB')
  im = np.asarray(im.resize((N * 4, N * 2), Image.LANCZOS)).astype(np.float32)
  sheet = np.zeros((N * 2, N * 3, 3), np.float32)
  for f in range(6):
    sheet[(f // 3) * N:(f // 3 + 1) * N, (f % 3) * N:(f % 3 + 1) * N] = equirect(im, *face_dirs(f, N))
  Image.fromarray(np.clip(sheet, 0, 255).astype(np.uint8)).save(os.path.join(out, rid + '.jpg'), quality=86, optimize=True, progressive=True)
  print(rid, os.path.getsize(os.path.join(out, rid + '.jpg')) // 1024, 'KB')
