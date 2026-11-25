# The shop-sign faces (world/shopSigns.js): four SIL OFL fonts from Google Fonts, subset to the characters
# the signs use (every CJK character in src/world/njShops.js, nanjingRoad.js, streetLife.js and tram.js, plus Latin), written as public/fonts/sign-*.woff2.
#   python3 tools/fonts/signs.py <download dir>        (needs: pip install fonttools brotli)
import sys, os, re, urllib.request
from fontTools import subset

FONTS = {   # file -> (Google Fonts family for the CSS API, output)
  'kai': ('Ma+Shan+Zheng', 'sign-kai.woff2'),
  'wei': ('ZCOOL+XiaoWei', 'sign-wei.woff2'),
  'song': ('Noto+Serif+SC:wght@900', 'sign-song.woff2'),
  'hei': ('Noto+Sans+SC:wght@900', 'sign-hei.woff2'),
}
root = os.path.join(os.path.dirname(__file__), '..', '..')
src = sys.argv[1]; os.makedirs(src, exist_ok=True)
text = ''.join(open(os.path.join(root, 'src', 'world', f), encoding='utf-8').read() for f in ('njShops.js', 'nanjingRoad.js', 'streetLife.js', 'tram.js'))
chars = sorted(set(re.findall(r'[　-〿㐀-鿿＀-￯]', text)))
latin = ''.join(chr(c) for c in range(0x20, 0x7f)) + '·—–’&'
print(len(chars), 'CJK characters')
UA = {'User-Agent': 'Wget/1.12'}       # (the CSS API then names a single TTF)
for key, (fam, out) in FONTS.items():
  ttf = os.path.join(src, key + '.ttf')
  if not os.path.exists(ttf):
    css = urllib.request.urlopen(urllib.request.Request(f'https://fonts.googleapis.com/css2?family={fam}', headers=UA)).read().decode()
    url = re.search(r'url\((https://[^)]+\.ttf)\)', css).group(1)
    open(ttf, 'wb').write(urllib.request.urlopen(urllib.request.Request(url, headers=UA)).read())
  opts = subset.Options(); opts.flavor = 'woff2'; opts.layout_features = ['*']; opts.name_IDs = ['*']; opts.notdef_outline = True
  font = subset.load_font(ttf, opts); s = subset.Subsetter(opts); s.populate(text=''.join(chars) + latin); s.subset(font)
  dst = os.path.join(root, 'public', 'fonts', out); subset.save_font(font, dst, opts)
  print(out, os.path.getsize(dst) // 1024, 'KB')
