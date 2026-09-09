"""White-background revision of the approved v1 artwork; no model generation."""
from pathlib import Path
import hashlib
import json
import shutil
import zipfile
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
V1 = ROOT.with_name('tinta-y-oficio-v1')
BRANDS = ['foundry', 'foreman', 'hush', 'razor', 'flint']


def main():
    rows = []
    preview = Image.new('RGB', (1500, 1480), 'white')
    draw = ImageDraw.Draw(preview)
    font = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 22)
    for i, brand in enumerate(BRANDS):
        out = ROOT / brand
        out.mkdir(exist_ok=True)
        for source in (V1 / brand).glob('*.png'):
            shutil.copy2(source, out / source.name)
        p = np.asarray(Image.open(out / 'banner-light.png').convert('RGB'), dtype=float)
        # Remove ivory paper tint while retaining the source ink and pigment.
        paper = np.percentile(p.reshape(-1, 3), 85, axis=0)
        clean = np.clip(p * 255 / paper, 0, 255)
        background = (p.min(2) > 200) & ((p.max(2)-p.min(2)) < 30)
        clean[background] = 255
        banner = Image.fromarray(clean.astype('uint8'))
        banner.save(out / 'banner-light.png')
        social = Image.new('RGB', (1280, 640), 'white')
        social.paste(banner.resize((1280, 427), Image.Resampling.LANCZOS), (0, 106))
        social.save(out / 'social-preview.png')
        draw.text((24, 20+i*290), brand.upper(), fill='#202420', font=font)
        for theme, x in [('light',24), ('dark',774)]:
            image = Image.open(out / f'banner-{theme}.png')
            preview.paste(image.resize((702,234), Image.Resampling.LANCZOS), (x,55+i*290))
        for file in sorted(out.glob('*.png')):
            image = Image.open(file)
            rows.append(dict(file=file.relative_to(ROOT).as_posix(), width=image.width,
                             height=image.height, mode=image.mode,
                             sha256=hashlib.sha256(file.read_bytes()).hexdigest()))
    preview.save(ROOT / 'preview-banners.png')
    (ROOT / 'manifest.json').write_text(json.dumps({'source':'../tinta-y-oficio-v1', 'files':rows},indent=2)+'\n')
    with zipfile.ZipFile(ROOT.with_suffix('.zip'), 'w', zipfile.ZIP_DEFLATED) as archive:
        for file in [ROOT/r['file'] for r in rows] + [ROOT/'manifest.json',ROOT/'README.md',ROOT/'preview-banners.png']:
            archive.write(file, file.relative_to(ROOT))
    print('35 PNG exported; v1 and dark artwork preserved.')


if __name__ == '__main__':
    main()
