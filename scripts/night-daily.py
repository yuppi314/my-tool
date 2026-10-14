# 毎日の「今日の吉方位」画像(ストーリーズ・リール用 1080x1920 と フィード用 1080x1350)を作る。夜空デザイン。
# 吉方位は src/lib/nichiban.js(日盤)の計算結果を node で読み出して使う。
# 使い方: python3 scripts/night-daily.py <日付 YYYY-MM-DD> <出力フォルダ> <sns-images の character/v2 フォルダ>
# 出力: daily-story.jpg(1080x1920)・daily-post.jpg(1080x1350)・caption.txt
# 必要: Pillow、~/.cache/night-reel-fonts/ の明朝体(night-reel.js を一度動かすと入る)
import datetime, json, os, random, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_DIR = os.path.expanduser('~/.cache/night-reel-fonts')
F8 = os.path.join(FONT_DIR, 'ShipporiMinchoB1-800.ttf')
F5 = os.path.join(FONT_DIR, 'ShipporiMinchoB1-500.ttf')
GOLD, WHITE, SOFT, DIM = (232, 200, 114), (245, 240, 230), (200, 204, 222), (150, 156, 185)
WEEK = '月火水木金土日'

JS = """
const n = require('./src/lib/nichiban'); const k = require('./src/lib/kyusei');
const d = new Date(process.argv[1] + 'T00:00:00');
const info = n.getDayInfo(d);
const rows = [1,2,3,4,5,6,7,8,9].map((id) => { const h = n.getDailyHoui(id, d);
  return { id, name: k.getStar(id).name, blocked: h.blocked, good: h.goodDirections }; });
console.log(JSON.stringify({ kanshi: info.kanshi, center: k.getStar(info.center).name, rows }));
"""


def font(size, bold=True):
    return ImageFont.truetype(F8 if bold else F5, size)


def background(w, h, seed):
    im = Image.new('RGB', (w, h))
    d = ImageDraw.Draw(im)
    for y in range(h):
        t = y / h
        d.line([(0, y), (w, y)], fill=tuple(int(a + (b - a) * t) for a, b in zip((22, 34, 92), (9, 14, 44))))
    r = random.Random(seed)
    for _ in range(int(w * h / 8000)):
        x, y, s, a = r.randrange(w), r.randrange(h), r.choice([1, 1, 1, 2, 2, 3]), r.randint(110, 255)
        d.ellipse([x - s / 2, y - s / 2, x + s / 2, y + s / 2], fill=(a, a, int(a * 0.9)))
    return im


def centered(d, w, y, text, size, fill=WHITE, bold=True):
    f = font(size, bold)
    d.text(((w - d.textlength(text, font=f)) / 2, y), text, font=f, fill=fill)


def chara(im, path, width):
    c = Image.open(path).convert('RGBA')
    c = c.resize((width, round(c.height * width / c.width)))
    a = c.getchannel('A')
    fade = Image.new('L', c.size, 255)
    fd = ImageDraw.Draw(fade)
    for y in range(int(c.height * 0.8), c.height):
        fd.line([(0, y), (c.width, y)], fill=int(255 * (c.height - y) / (c.height * 0.2)))
    c.putalpha(Image.composite(a, Image.new('L', c.size, 0), fade))
    im.paste(c, (im.width - width - 10, im.height - c.height - 40), c)


def render(w, h, data, date, cdir, top, row_h, size):
    im = background(w, h, int(date.strftime('%Y%m%d')))
    d = ImageDraw.Draw(im)
    label = f'{date.month}月{date.day}日({WEEK[date.weekday()]})'
    centered(d, w, top, '今日の吉方位', 44, fill=GOLD, bold=False)
    centered(d, w, top + 64, label, size + 30)
    centered(d, w, top + 64 + size + 74, '日帰り・お散歩の方角の目安です', 32, fill=SOFT, bold=False)
    y = top + 64 + size + 150
    d.line([(80, y - 14), (w - 80, y - 14)], fill=(150, 130, 80), width=1)
    for r in data['rows']:
        d.text((90, y), r['name'], font=font(size - 4), fill=WHITE)
        if r['blocked']:
            text, col, f = '八方塞がり(ゆっくり過ごす日)', DIM, font(size - 12, False)
        elif not r['good']:
            text, col, f = '吉方位なし', DIM, font(size - 12, False)
        else:
            text, col, f = '・'.join(r['good']), GOLD, font(size)
        d.text((380, y + (size - f.size) / 2), text, font=f, fill=col)
        y += row_h
        d.line([(80, y - 14), (w - 80, y - 14)], fill=(70, 74, 120), width=1)
    d.text((80, h - 150), '方位はご自宅から見た方角です', font=font(30, False), fill=SOFT)
    d.text((80, h - 100), '@secondlife_50s', font=font(32, False), fill=SOFT)
    chara(im, os.path.join(cdir, 'pose-compass.png'), 300 if h > 1500 else 230)
    return im


def main():
    ds, out, cdir = sys.argv[1:4]
    date = datetime.date.fromisoformat(ds)
    data = json.loads(subprocess.check_output(['node', '-e', JS, ds], cwd=ROOT))
    os.makedirs(out, exist_ok=True)
    render(1080, 1920, data, date, cdir, 170, 112, 54).save(os.path.join(out, 'daily-story.jpg'), quality=92)
    render(1080, 1350, data, date, cdir, 60, 84, 46).save(os.path.join(out, 'daily-post.jpg'), quality=92)
    label = f'{date.month}月{date.day}日({WEEK[date.weekday()]})'
    lines = []
    for r in data['rows']:
        lines.append(f"{r['name']}… " + ('八方塞がり(ゆっくり過ごす日)' if r['blocked'] else '・'.join(r['good']) or '吉方位なし'))
    cap = f"""今日の吉方位🌙 {label}

{chr(10).join(lines)}

日帰りのお出かけやお散歩の方角の目安にしてね。
方位はご自宅から見て決まります。
あなたの家から見た今月の吉方位と旅先は、プロフィールのリンクの無料診断で🧭

#九星気学 #吉方位 #今日の吉方位 #開運 #50代からの人生
"""
    open(os.path.join(out, 'caption.txt'), 'w').write(cap)
    print(json.dumps(data, ensure_ascii=False))


if __name__ == '__main__':
    main()
