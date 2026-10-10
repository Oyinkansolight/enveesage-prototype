# THROWAWAY: bundles prototype.html + hero image into one file you can AirDrop, email or WhatsApp to any device.
import base64, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'prototype.html').read_text()
img = base64.b64encode((root / 'assets/editorial-hero.jpg').read_bytes()).decode()
html = html.replace('src="assets/editorial-hero.jpg"', f'src="data:image/jpeg;base64,{img}"')
(root / 'dist').mkdir(exist_ok=True)
(root / 'dist/index.html').write_text(html)
print('Wrote dist/index.html (self-contained, %d KB)' % (len(html) // 1024))
