# どのリールにも最後に付ける「フォローしてね」の画面(1080x1920)を作る。
# 使い方: python3 scripts/follow_end.py <night|day> <出力.png> <sns-images の character/v2> [背景画像]
# 背景画像は sns-images の backgrounds/night-sky-src.png(night)・day-sky-src.png(day)。省略すると描いた空になる
# night: 星のシリーズ(夜空 × 金)。day: マイル・旅のシリーズ(昼の空 × オレンジ)
# できあがったリールの最後に付ける: python3 scripts/follow_end.py append <night|day> <元.mp4> <出力.mp4> <character/v2> <背景画像> <ffmpeg>
# ほかのスクリプトからは make(theme, out, cdir, sky=None) を呼ぶ。
import os, random, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1920
FONT_DIR = os.path.expanduser('~/.cache/night-reel-fonts')
F8 = os.path.join(FONT_DIR, 'ShipporiMinchoB1-800.ttf')
F5 = os.path.join(FONT_DIR, 'ShipporiMinchoB1-500.ttf')
HANDLE = '@secondlife_50s'


def font(size, bold=True):
    return ImageFont.truetype(F8 if bold else F5, size)


def night_bg(sky=None):
    if sky:
        # 水彩の夜空。文字が読めるよう紺を薄く重ねる
        return Image.blend(day_bg(sky), Image.new('RGB', (W, H), (10, 16, 52)), 0.35)
    im = Image.new('RGB', (W, H))
    d = ImageDraw.Draw(im)
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=tuple(int(a + (b - a) * t) for a, b in zip((22, 34, 92), (9, 14, 44))))
    r = random.Random(50)
    for _ in range(240):
        x, y, s, a = r.randrange(W), r.randrange(H), r.choice([1, 1, 1, 2, 2, 3]), r.randint(110, 255)
        d.ellipse([x - s / 2, y - s / 2, x + s / 2, y + s / 2], fill=(a, a, int(a * 0.9)))
    return im


def day_bg(sky):
    if not sky:
        im = Image.new('RGB', (W, H))
        d = ImageDraw.Draw(im)
        for y in range(H):
            t = y / H
            d.line([(0, y), (W, y)], fill=tuple(int(a + (b - a) * t) for a, b in zip((120, 190, 240), (235, 246, 255))))
        return im
    s = Image.open(sky).convert('RGB')
    s = s.resize((W, round(s.height * W / s.width)), Image.LANCZOS)
    if s.height < H:
        s = s.resize((round(s.width * H / s.height), H), Image.LANCZOS)
    return s.crop(((s.width - W) // 2, s.height - H, (s.width - W) // 2 + W, s.height))


def make(theme, out, cdir, sky=None):
    night = theme == 'night'
    im = night_bg(sky) if night else day_bg(sky)
    # 文字の後ろのパネル(夜は紺、昼は白の半透明)
    m = Image.new('L', (W, H), 0)
    ImageDraw.Draw(m).rounded_rectangle([60, 300, W - 60, 1180], radius=40, fill=150 if night else 228)
    im.paste(Image.new('RGB', (W, H), (8, 12, 40) if night else (255, 255, 255)), (0, 0), m)
    d = ImageDraw.Draw(im)
    main, accent, text, soft = ((245, 240, 230), (232, 200, 114), (245, 240, 230), (200, 204, 222)) if night \
        else ((27, 42, 90), (232, 108, 52), (27, 42, 90), (70, 90, 125))

    def ctr(y, t, size, col, bold=True):
        f = font(size, bold)
        for i, line in enumerate(t.split('\n')):
            d.text(((W - d.textlength(line, font=f)) / 2, y + i * size * 1.4), line, font=f, fill=col)

    ctr(370, '最後まで見てくれて\nありがとう', 46, soft, False)
    ctr(540, 'フォローしてね', 104, accent)
    ctr(720, 'あなたの星の吉方位と\nマイルで行く開運旅を\n毎週お届けします', 46, text, False)
    # フォローボタン風
    f = font(46)
    label = f'{HANDLE} をフォロー'
    w = d.textlength(label, font=f)
    d.rounded_rectangle([W / 2 - w / 2 - 50, 1010, W / 2 + w / 2 + 50, 1110], radius=50, fill=accent)
    d.text(((W - w) / 2, 1030), label, font=f, fill=(20, 26, 60) if night else (255, 255, 255))
    c = Image.open(os.path.join(cdir, 'pose-wave.png')).convert('RGBA')
    cw = 480
    c = c.resize((cw, round(c.height * cw / c.width)))
    im.paste(c, ((W - cw) // 2, H - c.height), c)
    im.save(out)
    return out


def append(theme, src, out, cdir, sky, ffmpeg, sec=2.4, fade=0.35):
    # 元の動画の最後にフォロー画面をフェードでつなぐ(iPhone 用に yuv420p + 音声トラック)
    png = make(theme, os.path.join(tempfile.mkdtemp(prefix='follow-'), 'follow.png'), cdir, sky)
    info = subprocess.run([ffmpeg, '-i', src], capture_output=True, text=True).stderr
    dur = [l for l in info.splitlines() if 'Duration' in l][0].split('Duration:')[1].split(',')[0].strip()
    h, m, x = dur.split(':')
    total = int(h) * 3600 + int(m) * 60 + float(x)
    fc = (f'[0:v]fps=30,scale={W}:{H},setsar=1,format=yuv420p[a];[1:v]fps=30,scale={W}:{H},setsar=1,format=yuv420p[b];'
          f'[a][b]xfade=transition=fade:duration={fade}:offset={total - fade:.2f}[v]')
    subprocess.run([ffmpeg, '-y', '-loglevel', 'error', '-i', src, '-loop', '1', '-t', str(sec), '-i', png,
                    '-f', 'lavfi', '-t', f'{total + sec - fade:.2f}', '-i', 'anullsrc=r=44100:cl=stereo',
                    '-filter_complex', fc, '-map', '[v]', '-map', '2:a', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20',
                    '-c:a', 'aac', '-shortest', '-movflags', '+faststart', out], check=True)
    return out


if __name__ == '__main__':
    if sys.argv[1] == 'append':
        append(*sys.argv[2:8])
    else:
        make(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4] if len(sys.argv) > 4 else None)
