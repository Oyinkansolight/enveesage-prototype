# THROWAWAY: bundle the prototype and all referenced local images into a portable HTML file.
import base64
import mimetypes
import pathlib
import re

root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'prototype.html').read_text()

def inline_image(match):
    relative = match.group(0)
    asset = root / relative
    mime = mimetypes.guess_type(asset.name)[0] or 'application/octet-stream'
    encoded = base64.b64encode(asset.read_bytes()).decode()
    return f'data:{mime};base64,{encoded}'

# Includes HTML src attributes and literal asset paths in JavaScript catalog data.
html = re.sub(r'assets/[a-zA-Z0-9_/-]+\.(?:jpg|jpeg|png|webp)', inline_image, html)
(root / 'dist').mkdir(exist_ok=True)
(root / 'dist/index.html').write_text(html)
print('Wrote dist/index.html (self-contained, %d KB)' % (len(html) // 1024))
