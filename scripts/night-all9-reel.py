# 日曜用「9つの星まとめ」リール(1080x1920・約17秒)を作る。夜空デザイン。
# night-month.js が作った cover.jpg と night-post-1〜9.jpg を1枚ずつ見せ、最後にまとめ画面(end.png)を出す。
# 使い方: python3 scripts/night-all9-reel.py <night-month の出力フォルダ> <end.png> <出力.mp4> <表紙.jpg> <年月の見出し 例: 2026年10月> <ffmpeg のパス>
# end.png は night-reel.js の動画の最後の画面(「あなたの家から見た本当の吉方位は…」)を ffmpeg で取り出したもの。
# 必要: Pillow、~/.cache/night-reel-fonts/ の明朝体(night-reel.js を一度動かすと入る)
import os, random, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1920
FONT_DIR = os.path.expanduser('~/.cache/night-reel-fonts')
F = os.path.join(FONT_DIR, 'ShipporiMinchoB1-800.ttf')
F5 = os.path.join(FONT_DIR, 'ShipporiMinchoB1-500.ttf')
GOLD, WHITE = (232, 200, 114), (245, 240, 230)
NAMES = ['一白水星', '二黒土星', '三碧木星', '四緑木星', '五黄土星', '六白金星', '七赤金星', '八白土星', '九紫火星']


def background():
    im = Image.new('RGB', (W, H))
    d = ImageDraw.Draw(im)
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=tuple(int(a + (b - a) * t) for a, b in zip((20, 32, 90), (10, 16, 48))))
    r = random.Random(7)
    for _ in range(260):
        x, y, s, a = r.randrange(W), r.randrange(H), r.choice([1, 1, 1, 2, 2, 3]), r.randint(120, 255)
        d.ellipse([x - s / 2, y - s / 2, x + s / 2, y + s / 2], fill=(a, a, int(a * 0.9)))
    return im


def centered(d, y, s, size, font=F, fill=WHITE):
    f = ImageFont.truetype(font, size)
    d.text(((W - d.textlength(s, font=f)) / 2, y), s, font=f, fill=fill)


def card(img, title, sub, counter=None):
    im = background()
    d = ImageDraw.Draw(im)
    centered(d, 110, title, 56, fill=GOLD)
    centered(d, 194, sub, 96)
    top = 420
    im.paste(Image.new('RGB', (1008, 1258), GOLD), ((W - 1008) // 2, top - 4))
    im.paste(Image.open(img).convert('RGB').resize((1000, 1250)), ((W - 1000) // 2, top))
    if counter:
        centered(d, top + 1290, counter, 40, font=F5, fill=GOLD)
    return im


def main():
    src, end, out, cover, label, ffmpeg = sys.argv[1:7]
    work = tempfile.mkdtemp(prefix='all9-')
    files = [os.path.join(work, 's00.png')]
    first = card(os.path.join(src, 'cover.jpg'), f'{label}の吉方位', 'あなたの星は？')
    first.save(files[0])
    first.save(cover, quality=92)
    for i in range(1, 10):
        f = os.path.join(work, f's{i:02d}.png')
        card(os.path.join(src, f'night-post-{i}.jpg'), f'{label}の吉方位', NAMES[i - 1] + 'さん', f'{i} / 9　自分の星で止めて保存してね').save(f)
        files.append(f)
    files.append(end)
    durs, x = [2.2] + [1.7] * 9 + [2.6], 0.3
    args = [ffmpeg, '-loglevel', 'error', '-y']
    for f, dur in zip(files, durs):
        args += ['-loop', '1', '-t', str(dur), '-i', f]
    args += ['-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo']
    fc = [f'[{i}:v]scale={W}:{H},setsar=1,fps=30,format=yuv420p[v{i}]' for i in range(len(files))]
    prev, off = 'v0', 0.0
    for i in range(1, len(files)):
        off += durs[i - 1] - x
        fc.append(f'[{prev}][v{i}]xfade=transition=fade:duration={x}:offset={off:.2f}[x{i}]')
        prev = f'x{i}'
    # iPhone で再生できるよう yuv420p + 無音の音声トラックにする
    args += ['-filter_complex', ';'.join(fc), '-map', f'[{prev}]', '-map', f'{len(files)}:a',
             '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '20',
             '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', out]
    subprocess.run(args, check=True)
    print(out)


if __name__ == '__main__':
    main()
