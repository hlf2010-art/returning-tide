"""Ji Bai's colour texture, cleaned: the generated model's atlas is hundreds of small islands, and the skin
pieces carry dark texels bled in from the black jacket islands around them (dark streaks on his forearms)
and white specks where texels were never baked. Both are found and inpainted from their surroundings.
  python -I tools/blender/jb_texture.py IN.png OUT.png            (opencv-python-headless, numpy)
"""
import sys, cv2, numpy as np
src, out = sys.argv[1], sys.argv[2]
im = cv2.imread(src, cv2.IMREAD_UNCHANGED); bgr = im[..., :3]
hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV); h, s, v = hsv[..., 0].astype(int), hsv[..., 1] / 255.0, hsv[..., 2] / 255.0
skin = ((h <= 18) | (h >= 172)) & (s > 0.12) & (s < 0.65) & (v > 0.38)
# where the skin is: the fraction of skin round each texel
frac = cv2.blur(skin.astype(np.float32), (17, 17))
inSkin = frac > 0.3
# dark texels inside a skin area (bled in from the jacket next door)
dark = inSkin & (v < 0.36) & ~skin
# white specks: small bright grey blobs (unbaked texels), not the T-shirt's broad whites
bright = ((v > 0.86) & (s < 0.16)).astype(np.uint8)
n, lab, stats, _ = cv2.connectedComponentsWithStats(bright, 8)
small = np.isin(lab, np.where(stats[:, cv2.CC_STAT_AREA] < 40)[0]) & (lab > 0)
mask = cv2.dilate((dark | small).astype(np.uint8) * 255, np.ones((3, 3), np.uint8))
fixed = cv2.inpaint(bgr, mask, 5, cv2.INPAINT_TELEA)
# and the black padding round the skin islands: grown over with the skin's own colour a few texels, so the
# texture seen from further off (its smaller mip levels) doesn't pull the jacket's black into the skin
skinNow = skin | (mask > 0)
grow = cv2.dilate(skinNow.astype(np.uint8), np.ones((9, 9), np.uint8)).astype(bool) & ~skinNow & (v < 0.2) & (frac > 0.18)
if grow.any():
    fill = cv2.inpaint(fixed, grow.astype(np.uint8) * 255, 7, cv2.INPAINT_TELEA)
    fixed[grow] = fill[grow]
res = im.copy(); res[..., :3] = fixed
cv2.imwrite(out, res)
print('skin', int(skin.sum()), 'dark fixed', int(dark.sum()), 'specks fixed', int(small.sum()), 'padding grown', int(grow.sum()))
