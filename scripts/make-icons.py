"""Genera los iconos (PNG) con Pillow. Uso: python3 scripts/make-icons.py"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "public"
OUT.mkdir(exist_ok=True)
A, B, WHITE = (234, 88, 12), (154, 52, 18), (255, 255, 255)
S = 1024


def draw_icon(k: float = 1.0) -> Image.Image:
    img = Image.new("RGB", (S, S), A)
    d = ImageDraw.Draw(img)
    for y in range(S):
        t = y / (S - 1)
        d.line([(0, y), (S, y)], fill=tuple(int(A[i] * (1 - t) + B[i] * t) for i in range(3)))
    cx, cy = S / 2, S / 2

    def rr(x0, y0, x1, y1, r):
        d.rounded_rectangle([cx + x0 * k, cy + y0 * k, cx + x1 * k, cy + y1 * k], radius=r * k, fill=WHITE)

    rr(-250, -26, 250, 26, 20)        # barra
    rr(-330, -150, -250, 150, 28)     # disco interior izq
    rr(-410, -105, -330, 105, 26)     # disco exterior izq
    rr(250, -150, 330, 150, 28)
    rr(330, -105, 410, 105, 26)
    return img


def save(img, name, size):
    img.resize((size, size), Image.LANCZOS).save(OUT / name, optimize=True)


base = draw_icon(1.0)
save(base, "icon-512.png", 512)
save(base, "icon-192.png", 192)
save(base, "apple-touch-icon.png", 180)
save(draw_icon(0.78), "icon-maskable-512.png", 512)
(OUT / "favicon.svg").write_text(
    """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#ea580c"/>
<rect x="14" y="30" width="36" height="4" rx="2" fill="#fff"/><rect x="9" y="19" width="6" height="26" rx="2" fill="#fff"/>
<rect x="49" y="19" width="6" height="26" rx="2" fill="#fff"/><rect x="3" y="24" width="6" height="16" rx="2" fill="#fff"/><rect x="55" y="24" width="6" height="16" rx="2" fill="#fff"/></svg>
""",
    encoding="utf-8",
)
