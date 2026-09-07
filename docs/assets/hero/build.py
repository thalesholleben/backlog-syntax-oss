"""Local, deterministic web derivatives of the capa-hero masters (Pillow)."""
from pathlib import Path

from PIL import Image

assets = Path(__file__).resolve().parent
public = assets.parents[2] / "apps/web/public/img"
public.mkdir(parents=True, exist_ok=True)

with Image.open(assets / "mobile-source.png") as source:
    mobile = source.convert("RGB")
    mobile = mobile.resize((800, round(800 * mobile.height / mobile.width)), Image.Resampling.LANCZOS)
    mobile.save(assets / "mobile-master.png")

for name, widths in (("desktop", (1280, 1536, 1920)), ("mobile", (480, 800))):
    with Image.open(assets / f"{name}-master.png") as source:
        for width in widths:
            assert width <= source.width, "Do not upscale the approved master"
            size = (width, round(width * source.height / source.width))
            resized = source.convert("RGB").resize(size, Image.Resampling.LANCZOS)
            for extension, options in (("webp", {"quality": 80, "method": 6}),
                                       ("jpg", {"quality": 82, "optimize": True, "progressive": True})):
                output = public / f"hero-cover-{name}-{width}.{extension}"
                resized.save(output, **options)
                print(f"{output.name}: {size[0]}x{size[1]}, {output.stat().st_size} bytes")
