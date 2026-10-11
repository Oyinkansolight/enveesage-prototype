# THROWAWAY: bundle the prototype and its local images into a portable HTML file.
import base64
import mimetypes
import pathlib
import re

root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'prototype.html').read_text()

def inline_image(match):
    relative = match.group(1)
    asset = root / relative
    mime = mimetypes.guess_type(asset.name)[0] or 'application/octet-stream'
    encoded = base64.b64encode(asset.read_bytes()).decode()
    return f'src="data:{mime};base64,{encoded}"'

html = re.sub(r'src="(assets/[^\"]+)"', inline_image, html)
(root / 'dist').mkdir(exist_ok=True)
(root / 'dist/index.html').write_text(html)
print('Wrote dist/index.html (self-contained, %d KB)' % (len(html) // 1024))
