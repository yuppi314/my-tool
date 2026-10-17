# ミニ講座のストーリー画像(クリーム×金の学びシリーズ)とハイライトの表紙を作る
# 使い方: python3 make.py <lessons.json> <character/v2> <backgrounds/cream-gold-plain.png> <出力フォルダ> [番号...]
import json, os, sys
from PIL import Image, ImageDraw, ImageFont
W, H = 1080, 1920
F8 = '/root/.cache/night-reel-fonts/ShipporiMinchoB1-800.ttf'; F5 = '/root/.cache/night-reel-fonts/ShipporiMinchoB1-500.ttf'
INK, GOLD, PAPER = (48, 46, 58), (168, 128, 58), (250, 246, 236)
f = lambda s, b=True: ImageFont.truetype(F8 if b else F5, s)
src, cdir, bgp, out = sys.argv[1:5]; only = {int(x) for x in sys.argv[5:]}
plain = Image.open(bgp).convert('RGB')

def c(d, y, t, size, col=INK, b=True):
    ft = f(size, b); d.text(((W - d.textlength(t, font=ft)) / 2, y), t, font=ft, fill=col)

def divider(d, y, w=240):
    d.line([(W/2-w, y), (W/2-22, y)], fill=GOLD, width=2); d.line([(W/2+22, y), (W/2+w, y)], fill=GOLD, width=2)
    s = 11; d.polygon([(W/2, y-s), (W/2+s*.3, y), (W/2, y+s), (W/2-s*.3, y)], fill=GOLD); d.polygon([(W/2-s, y), (W/2, y-s*.3), (W/2+s, y), (W/2, y+s*.3)], fill=GOLD)

def chara(im, pose, wd=300):
    ch = Image.open(os.path.join(cdir, pose)).convert('RGBA'); ch = ch.resize((wd, round(ch.height * wd / ch.width)))
    im.paste(ch, (W - wd - 40, 1610 - ch.height), ch)

for L in json.load(open(src)):
    if only and L['no'] not in only: continue
    im = plain.copy(); d = ImageDraw.Draw(im)
    tag = '九星気学ミニ講座'; ft = f(34); tw = d.textlength(tag, font=ft)
    d.rounded_rectangle([W/2-tw/2-30, 410, W/2+tw/2+30, 466], radius=28, fill=GOLD); d.text(((W-tw)/2, 416), tag, font=ft, fill=PAPER)
    c(d, 490, f"No.{L['no']:02d}", 52, GOLD)
    y = 570
    for t in L['title']: c(d, y, t, 80); y += 100
    divider(d, y + 20)
    d.rounded_rectangle([90, y + 70, 990, y + 70 + 76 * len(L['lines']) + 50], radius=30, fill=PAPER, outline=GOLD, width=3)
    yy = y + 100
    for t in L['lines']:
        if t: c(d, yy, t, 46, INK, False)
        yy += 76
    d.text((100, 1420), '保存して、', font=f(42), fill=GOLD); d.text((100, 1480), '少しずつ覚えてね', font=f(42), fill=GOLD)
    d.text((100, 1550), '@secondlife_50s', font=f(32, False), fill=(120, 112, 104))
    chara(im, 'pose-idea.png')
    im.save(os.path.join(out, f"lesson-{L['no']:02d}.jpg"), quality=92)

# ハイライトの表紙(まん中の円が表示される)
im = Image.new('RGB', (W, H), PAPER); d = ImageDraw.Draw(im)
r = 330; d.ellipse([W/2-r, H/2-r, W/2+r, H/2+r], fill=(241, 233, 220), outline=GOLD, width=10)
s = 90; cx, cy = W/2, H/2 - 70
d.polygon([(cx, cy-s), (cx+s*.22, cy), (cx, cy+s), (cx-s*.22, cy)], fill=GOLD); d.polygon([(cx-s, cy), (cx, cy-s*.22), (cx+s, cy), (cx, cy+s*.22)], fill=GOLD)
c(d, H/2 + 60, '学び', 120, INK)
im.save(os.path.join(out, 'highlight-cover.jpg'), quality=92)
