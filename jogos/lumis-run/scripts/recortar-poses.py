"""Recorta as imagens oficiais da Lumis (fundo branco) para PNG/WebP com fundo
transparente, usados na arte dos stories. Uso:
    python3 scripts/recortar-poses.py <pasta-com-as-imagens> src/assets/poses
Espera: mochila.png, notebook.png, formatura.png, lapis.png e folha-de-poses.png
(a folha tem 9 poses em 3 x 3, cortadas sem as legendas)."""
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

src, dst = Path(sys.argv[1]), Path(sys.argv[2])
dst.mkdir(parents=True, exist_ok=True)

# recortes da folha (x0, y0, x1, y1), evitando as legendas e os enfeites dos cantos
SHEET = {
    'ola': (60, 185, 420, 470),
    'piscadinha': (440, 185, 800, 470),
    'coracao': (810, 215, 1200, 470),
    'lendo': (50, 540, 430, 818),
    'uhuu': (440, 548, 800, 815),
    'ideia': (810, 548, 1200, 828),
    'joinha': (60, 885, 420, 1150),
    'respira': (440, 885, 800, 1150),
    'vai-dar-certo': (810, 885, 1200, 1150),
}
SINGLE = ['mochila', 'notebook', 'formatura', 'lapis']


def cutout(im: Image.Image, light: int = 196, erode: int = 5) -> Image.Image:
    a = np.asarray(im.convert('RGB')).astype(int)
    h, w, _ = a.shape
    mx, mn = a.max(axis=2), a.min(axis=2)
    # fundo e sombra no chão: claros e quase sem cor
    bg = (mn > light) & (mx - mn < 30)
    seen = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if bg[y, x] and not seen[y, x]:
                seen[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if bg[y, x] and not seen[y, x]:
                seen[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and bg[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))
    fg = ~seen
    # buracos de fundo cercados (ex.: entre o capelo e a borla): branco puro e grande
    hole = (mn > 244) & (mx - mn < 10) & fg
    hl = np.zeros((h, w), bool)
    for sy, sx in zip(*np.nonzero(hole)):
        if hl[sy, sx]:
            continue
        comp = [(sy, sx)]
        hl[sy, sx] = True
        i = 0
        while i < len(comp):
            y, x = comp[i]
            i += 1
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and hole[ny, nx] and not hl[ny, nx]:
                    hl[ny, nx] = True
                    comp.append((ny, nx))
        if len(comp) > 900:
            for y, x in comp:
                fg[y, x] = False
    # descarta pedaços que encostam na borda do recorte (texto e enfeites da folha)
    lab = np.zeros((h, w), int)
    n = 0
    for sy, sx in zip(*np.nonzero(fg)):
        if lab[sy, sx]:
            continue
        n += 1
        comp = [(sy, sx)]
        lab[sy, sx] = n
        border = False
        i = 0
        while i < len(comp):
            y, x = comp[i]
            i += 1
            if y in (0, h - 1) or x in (0, w - 1):
                border = True
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and fg[ny, nx] and not lab[ny, nx]:
                    lab[ny, nx] = n
                    comp.append((ny, nx))
        # texto e enfeites da folha encostam na borda e são pequenos; a Lumis é grande
        if (border and len(comp) < h * w * 0.06) or len(comp) < 40:
            for y, x in comp:
                fg[y, x] = False
    # encolhe a borda 1 a 2 px para tirar o halo branco do fundo antigo
    alpha = Image.fromarray((fg * 255).astype('uint8')).filter(ImageFilter.MinFilter(erode)).filter(ImageFilter.GaussianBlur(0.9))
    out = im.convert('RGBA')
    out.putalpha(alpha)
    box = alpha.point(lambda v: 255 if v > 8 else 0).getbbox()
    return out.crop(box)


def save(name: str, im: Image.Image):
    im.thumbnail((720, 720), Image.LANCZOS)
    im.save(dst / f'{name}.webp', 'WEBP', quality=86, method=6)
    print(name, im.size, (dst / f'{name}.webp').stat().st_size // 1024, 'KB')


for n in SINGLE:
    # a folha de papel do lápis é creme: corte mais conservador para não apagá-la
    save(n, cutout(Image.open(src / f'{n}.png'), 226 if n == 'lapis' else 196))
sheet = Image.open(src / 'folha-de-poses.png')
for n, box in SHEET.items():
    save(n, cutout(sheet.crop(box), erode=3))
