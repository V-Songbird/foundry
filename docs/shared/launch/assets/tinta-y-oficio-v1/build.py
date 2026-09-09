"""Export the approved raster identity with real alpha. Requires Pillow and NumPy.

Original RGB inputs are retained in source/. No generated source is overwritten.
Light/dark variants share geometry and alpha; only ink colors differ.
"""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent
BRANDS = ['foundry', 'foreman', 'hush', 'razor', 'flint']
PALETTES = {
    'foundry': ('#BE5D27', '#E3A165'),
    'foreman': ('#21553B', '#9EC8AC'),
    'hush': ('#2C75A5', '#79B6DE'),
    'razor': ('#BF4935', '#EB8D79'),
    'flint': ('#C18423', '#E8BD66'),
}
WORD_CROPS = {'foundry': (.45, .94), 'foreman': (.35, .90),
              'hush': (.50, .94), 'razor': (.44, .94), 'flint': (.48, .94)}


def color(value):
    return np.array([int(value[i:i+2], 16) for i in (1, 3, 5)], dtype=float)


def grow(mask, size=5):
    return np.asarray(Image.fromarray((mask * 255).astype('uint8')).filter(ImageFilter.MaxFilter(size))) > 0


def icon_masks(image):
    a = np.asarray(image.convert('RGB'), dtype=float) / 255
    lum, chroma = a.mean(2), a.max(2) - a.min(2)
    ink = np.clip((.34 - lum) / .18, 0, 1)
    pigment = np.clip((chroma - .045) / .16, 0, 1)
    alpha = np.maximum(ink, pigment)
    alpha *= grow(alpha > .55, 7)
    alpha[alpha < .035] = 0
    mix = np.clip((chroma - .06) / .15, 0, 1)
    return alpha, mix


def rgba(alpha, mix, brand, dark=False):
    ink = color('#EEE9DE' if dark else '#181917')
    accent = color(PALETTES[brand][int(dark)])
    if brand == 'foreman':
        mix = np.ones_like(mix)
    rgb = ink[None, None, :] * (1 - mix[:, :, None]) + accent[None, None, :] * mix[:, :, None]
    result = np.dstack([rgb, alpha * 255]).clip(0, 255).astype('uint8')
    result[alpha == 0, :3] = 0
    return Image.fromarray(result, 'RGBA')


def tight(image):
    bbox = image.getchannel('A').getbbox()
    if not bbox:
        raise ValueError('Empty foreground')
    return image.crop(bbox)


def fit(image, size, margin=0):
    image = ImageOps.contain(tight(image), (size[0]-margin*2, size[1]-margin*2), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', size)
    canvas.alpha_composite(image, ((size[0]-image.width)//2, (size[1]-image.height)//2))
    return canvas


def word_alpha(banner, brand):
    w, h = banner.size
    left, right = WORD_CROPS[brand]
    crop = banner.crop((int(w*left), int(h*.06), int(w*right), int(h*.97)))
    pixels = np.asarray(crop.convert('RGB'), dtype=float) / 255
    lum, chroma = pixels.mean(2), pixels.max(2)-pixels.min(2)
    alpha = np.clip((.86-lum)/.78, 0, 1)
    alpha *= grow((lum < .48) & (chroma < .12), 5)
    alpha[chroma > .22] = 0
    alpha[alpha < .04] = 0
    if brand == 'foreman':
        # The lower-right ornament is separate from the lettering; the f
        # descender is on the opposite side and is retained.
        yy, xx = np.indices(alpha.shape)
        alpha[((xx+int(w*left)) > w*.82) & ((yy+int(h*.06)) > h*.76)] = 0
    # Reject fragments of the large left symbol or right edge ornament that
    # touch the crop boundary. The wordmark itself has whitespace around it.
    support = Image.fromarray((alpha > 0).astype('uint8')*255)
    for y in range(support.height):
        for x in (0, support.width-1):
            if support.getpixel((x, y)):
                ImageDraw.floodfill(support, (x, y), 0)
    for x in range(support.width):
        for y in (0, support.height-1):
            if support.getpixel((x, y)):
                ImageDraw.floodfill(support, (x, y), 0)
    alpha *= np.asarray(support) > 0
    if brand == 'foreman':
        # Retain lettering components, excluding detached ornament specks.
        components = alpha > .25
        kept = np.zeros(alpha.shape, dtype=bool)
        for y, x in zip(*np.where(components)):
            if not components[y, x]:
                continue
            stack = [(int(y), int(x))]
            component = []
            components[y, x] = False
            while stack:
                cy, cx = stack.pop()
                component.append((cy, cx))
                for ny, nx in ((cy-1,cx),(cy+1,cx),(cy,cx-1),(cy,cx+1)):
                    if 0 <= ny < components.shape[0] and 0 <= nx < components.shape[1] and components[ny,nx]:
                        components[ny,nx] = False
                        stack.append((ny,nx))
            if len(component) >= 200:
                yy, xx = zip(*component)
                kept[yy,xx] = True
        alpha *= grow(kept, 5)
    return alpha


def word_image(alpha, dark=False):
    ink = color('#EEE9DE' if dark else '#181917')
    pixels = np.empty((*alpha.shape, 4), dtype='uint8')
    pixels[:, :, :3] = ink
    pixels[:, :, 3] = (alpha*255).astype('uint8')
    pixels[alpha == 0, :3] = 0
    return tight(Image.fromarray(pixels, 'RGBA'))


def logo(icon, word):
    canvas = Image.new('RGBA', (1400, 420))
    mark = ImageOps.contain(tight(icon), (340, 310), Image.Resampling.LANCZOS)
    text = ImageOps.contain(word, (920, 255), Image.Resampling.LANCZOS)
    canvas.alpha_composite(mark, (40+(340-mark.width)//2, (420-mark.height)//2))
    canvas.alpha_composite(text, (420+(920-text.width)//2, (420-text.height)//2))
    return canvas


def dark_banner(image, brand):
    p = np.asarray(image.convert('RGB'), dtype=float)/255
    lum = p.mean(2)
    sat = (p.max(2)-p.min(2))/np.maximum(p.max(2), .01)
    ink_a = np.clip((.89-lum)/.70, 0, 1)
    pigment = np.clip((sat-.18)/.28, 0, 1)
    if brand == 'razor':
        pigment[:, int(image.width*.48):int(image.width*.89)] = 0
    alpha = np.maximum(ink_a, pigment)
    paper = color('#191C1B')[None,None,:] + np.clip((lum-.94)*30, -4, 4)[:,:,None]
    ink = color('#EEE9DE')[None,None,:]
    accent = color(PALETTES[brand][1])[None,None,:]
    foreground = ink*(1-pigment[:,:,None])+accent*pigment[:,:,None]
    output = paper*(1-alpha[:,:,None])+foreground*alpha[:,:,None]
    return Image.fromarray(output.clip(0,255).astype('uint8'), 'RGB')


def record(file, kind):
    image = Image.open(file)
    row = {'file': file.relative_to(ROOT).as_posix(), 'kind': kind, 'width': image.width,
           'height': image.height, 'mode': image.mode, 'sha256': hashlib.sha256(file.read_bytes()).hexdigest()}
    if kind != 'banner':
        assert image.mode == 'RGBA'
        alpha = np.asarray(image.getchannel('A'))
        assert alpha.min() == 0 and alpha.max() == 255
        assert not any(image.getpixel(p)[3] for p in [(0,0),(image.width-1,0),(0,image.height-1),(image.width-1,image.height-1)])
        row['transparentPixels'] = int((alpha == 0).sum())
        row['partialAlphaPixels'] = int(((alpha > 0) & (alpha < 255)).sum())
    return row


def preview():
    page = Image.new('RGB', (1800, 1560), '#EEECE6')
    draw = ImageDraw.Draw(page)
    font = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 24)
    title = ImageFont.truetype('C:/Windows/Fonts/seguisb.ttf', 38)
    draw.text((36,24), 'Tinta y oficio — archivos con alfa real', fill='#222621', font=title)
    for i, brand in enumerate(BRANDS):
        y = 105+i*285
        draw.text((36,y), brand.upper(), fill='#30372F', font=font)
        for theme, x, bg in [('light',220,'#F4F0E8'),('dark',990,'#191C1B')]:
            draw.rectangle((x,y,x+735,y+255), fill=bg)
            mark = Image.open(ROOT/brand/f'icon-on-{theme}.png').resize((165,165),Image.Resampling.LANCZOS)
            page.paste(mark,(x+10,y+12),mark)
            logo_image = Image.open(ROOT/brand/f'logo-on-{theme}.png').resize((540,162),Image.Resampling.LANCZOS)
            page.paste(logo_image,(x+183,y+12),logo_image)
            tiny = Image.open(ROOT/brand/f'icon-on-{theme}.png').resize((32,32),Image.Resampling.LANCZOS)
            page.paste(tiny,(x+26,y+196),tiny)
            draw.text((x+85,y+196),'32 px',fill='#72776E' if theme=='light' else '#BBC4B9',font=font)
    page.save(ROOT/'preview-alpha.png')


def main():
    rows=[]
    for brand in BRANDS:
        out=ROOT/brand;out.mkdir(exist_ok=True)
        source_icon=Image.open(ROOT/'source'/f'{brand}-icon-on-light.png')
        source_banner=Image.open(ROOT/'source'/f'{brand}-banner-light.png').convert('RGB')
        alpha,mix=icon_masks(source_icon)
        letters=word_alpha(source_banner,brand)
        themes={}
        for dark in (False,True):
            theme='dark' if dark else 'light'
            icon=fit(rgba(alpha,mix,brand,dark),(1024,1024),70)
            word=word_image(letters,dark)
            combination=logo(icon,word)
            icon.save(out/f'icon-on-{theme}.png')
            combination.save(out/f'logo-on-{theme}.png')
            banner=dark_banner(source_banner,brand) if dark else source_banner
            banner.save(out/f'banner-{theme}.png')
            themes[theme]=(icon,combination)
            for kind in ['icon','logo']:
                rows.append(record(out/f'{kind}-on-{theme}.png',kind))
            rows.append(record(out/f'banner-{theme}.png','banner'))
        for i in (0,1):
            assert np.array_equal(np.asarray(themes['light'][i].getchannel('A')),np.asarray(themes['dark'][i].getchannel('A'))),brand
        print(brand, 'exported with identical light/dark alpha')
    (ROOT/'manifest.json').write_text(json.dumps({'style':'Tinta y oficio','files':rows},indent=2)+'\n',encoding='utf-8')
    preview()


if __name__=='__main__':main()
