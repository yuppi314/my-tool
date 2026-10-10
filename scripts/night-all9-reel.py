# 日曜用「9つの星まとめ」リール(1080x1920・約22秒)を作る。夜空デザイン・カルーセルとは別の縦長の画面。
# 星ごとに「◯◯さんの吉方位は…?」→「答え(方角と運気)」の2画面で見せ、最後にまとめ画面(end.png)を出す。
# 表紙は方角を出さない「あなたの星は?」の画面にする(方角は動画を見てのお楽しみにするため)。
# 使い方: python3 scripts/night-all9-reel.py <基準日 YYYY-MM-DD> <end.png> <出力.mp4> <表紙.jpg> <キャラ画像フォルダ character/v2> <ffmpeg のパス>
# end.png は night-reel.js の動画の最後の画面(「あなたの家から見た本当の吉方位は…」)を ffmpeg で取り出したもの。
# 吉方位は src/lib/houi.js の計算結果を node で読み出して使う。
# 必要: Pillow、~/.cache/night-reel-fonts/ の明朝体(night-reel.js を一度動かすと入る)
import json, os, random, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1920
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_DIR = os.path.expanduser('~/.cache/night-reel-fonts')
F8 = os.path.join(FONT_DIR, 'ShipporiMinchoB1-800.ttf')
F5 = os.path.join(FONT_DIR, 'ShipporiMinchoB1-500.ttf')
GOLD, WHITE, SOFT = (232, 200, 114), (245, 240, 230), (200, 204, 222)
# 方位ごとに得られるとされる運気(night-reel.js の DIRECTION_LUCK と同じ)
LUCK = {'北': '信頼・愛情・子宝', '北東': '変化・貯蓄・相続', '東': '発展・行動力・若さ', '南東': '良縁・信用・人間関係',
        '南': '名誉・美・ひらめき', '南西': '家庭運・安定・勤勉', '西': '金運・恋愛・楽しみ', '北西': '仕事運・引き立て・出世'}

JS = """
const houi = require('./src/lib/houi'); const kyusei = require('./src/lib/kyusei');
const d = new Date(process.argv[1] + 'T00:00:00');
const rows = [1,2,3,4,5,6,7,8,9].map((id) => { const h = houi.getMonthlyHoui(id, d);
  return { id, name: kyusei.getStar(id).name, best: h.bestDirections, blocked: !!(h.yearBlocked || h.monthBlocked), label: h.label, period: h.period }; });
console.log(JSON.stringify(rows));
"""


def font(size, bold=True):
    return ImageFont.truetype(F8 if bold else F5, size)


def background(seed=7):
    im = Image.new('RGB', (W, H))
    d = ImageDraw.Draw(im)
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=tuple(int(a + (b - a) * t) for a, b in zip((22, 34, 92), (9, 14, 44))))
    r = random.Random(seed)
    for _ in range(240):
        x, y, s, a = r.randrange(W), r.randrange(H), r.choice([1, 1, 1, 2, 2, 3]), r.randint(110, 255)
        d.ellipse([x - s / 2, y - s / 2, x + s / 2, y + s / 2], fill=(a, a, int(a * 0.9)))
    # きらめく星(4方向の光)
    for x, y, s in [(140, 330, 22), (930, 260, 16), (110, 1180, 14), (960, 1060, 20)]:
        d.polygon([(x, y - s), (x + s * 0.25, y), (x, y + s), (x - s * 0.25, y)], fill=GOLD)
        d.polygon([(x - s, y), (x, y - s * 0.25), (x + s, y), (x, y + s * 0.25)], fill=GOLD)
    return im


def centered(d, y, text, size, fill=WHITE, bold=True):
    f = font(size, bold)
    d.text(((W - d.textlength(text, font=f)) / 2, y), text, font=f, fill=fill)


def ring(d, cy, r):
    d.ellipse([W / 2 - r, cy - r, W / 2 + r, cy + r], outline=GOLD, width=4)
    d.ellipse([W / 2 - r + 22, cy - r + 22, W / 2 + r - 22, cy + r - 22], outline=(150, 130, 80), width=1)


def kicker(d, y, text):
    f = font(40, False)
    w = d.textlength(text, font=f)
    d.line([(W / 2 - w / 2 - 30, y - 12), (W / 2 + w / 2 + 30, y - 12)], fill=GOLD, width=2)
    d.text(((W - w) / 2, y), text, font=f, fill=GOLD)
    d.line([(W / 2 - w / 2 - 30, y + 62), (W / 2 + w / 2 + 30, y + 62)], fill=GOLD, width=2)


def chara(im, path, width=440):
    c = Image.open(path).convert('RGBA')
    c = c.resize((width, round(c.height * width / c.width)))
    # 下のはしを夜空になじませる
    a = c.getchannel('A')
    fade = Image.new('L', c.size, 255)
    fd = ImageDraw.Draw(fade)
    h = c.height
    for y in range(int(h * 0.8), h):
        fd.line([(0, y), (c.width, y)], fill=int(255 * (h - y) / (h * 0.2)))
    c.putalpha(Image.composite(a, Image.new('L', c.size, 0), fade))
    im.paste(c, (W - width - 10, H - c.height - 70), c)


def screen(chara_path, counter, draw_center, seed):
    im = background(seed)
    d = ImageDraw.Draw(im)
    kicker(d, 150, LABEL + 'の吉方位')
    ring(d, 820, 420)
    draw_center(d)
    chara(im, chara_path)
    if counter:
        d.text((70, H - 230), counter, font=font(44, False), fill=GOLD)
    d.text((70, H - 150), '@secondlife_50s', font=font(36, False), fill=SOFT)
    return im


def main():
    global LABEL
    date, end, out, cover, cdir, ffmpeg = sys.argv[1:7]
    rows = json.loads(subprocess.check_output(['node', '-e', JS, date], cwd=ROOT))
    LABEL = rows[0]['label']
    period = rows[0]['period']
    pose = lambda n: os.path.join(cdir, f'pose-{n}.png')
    work = tempfile.mkdtemp(prefix='all9-')
    frames, durs = [], []

    def add(im, sec):
        f = os.path.join(work, f'f{len(frames):02d}.png')
        im.save(f)
        frames.append(f)
        durs.append(sec)
        return im

    def hook(d):
        centered(d, 600, 'あなたの星は', 110)
        centered(d, 740, 'どの方角？', 110, fill=GOLD)
        centered(d, 920, '9つの星をまとめて', 50, bold=False)
        centered(d, 990, 'お伝えします', 50, bold=False)
        centered(d, 1090, period, 44, fill=SOFT, bold=False)
    first = add(screen(pose('point-you'), None, hook, 1), 2.2)
    first.convert('RGB').save(cover, quality=92)

    for i, r in enumerate(rows):
        cnt = f'{i + 1} / 9'
        def q(d, r=r):
            centered(d, 660, r['name'] + 'さん', 104)
            centered(d, 830, 'の吉方位は…？', 72, fill=GOLD)
        add(screen(pose('compass'), cnt, q, 10 + i), 1.0)
        if r['blocked']:
            def a(d, r=r):
                centered(d, 560, r['name'] + 'さん', 64)
                centered(d, 690, '八方塞がり', 130, fill=GOLD)
                centered(d, 900, '整える月。', 50, bold=False)
                centered(d, 970, '次の旅を計画しましょう', 50, bold=False)
            p = 'mug'
        elif not r['best']:
            def a(d, r=r):
                centered(d, 560, r['name'] + 'さん', 64)
                centered(d, 690, '最大吉方なし', 112, fill=GOLD)
                centered(d, 900, '近場でゆったり', 50, bold=False)
                centered(d, 970, '過ごす月です', 50, bold=False)
            p = 'mug'
        else:
            def a(d, r=r):
                centered(d, 540, r['name'] + 'さん', 64)
                dirs = '・'.join(r['best'])
                centered(d, 650, dirs, 170 if len(r['best']) == 1 else 130, fill=GOLD)
                y = 880
                for dname in r['best']:
                    centered(d, y, f'{dname}…{LUCK[dname]}', 44, bold=False)
                    y += 66
            p = 'point-up' if len(r['best']) == 1 else 'cheer'
        add(screen(pose(p), cnt, a, 30 + i), 1.6)
    frames.append(end)
    durs.append(2.6)

    x = 0.25
    args = [ffmpeg, '-loglevel', 'error', '-y']
    for f, dur in zip(frames, durs):
        args += ['-loop', '1', '-t', str(dur), '-i', f]
    args += ['-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo']
    fc = [f'[{i}:v]scale={W}:{H},setsar=1,fps=30,format=yuv420p[v{i}]' for i in range(len(frames))]
    prev, off = 'v0', 0.0
    for i in range(1, len(frames)):
        off += durs[i - 1] - x
        fc.append(f'[{prev}][v{i}]xfade=transition=fade:duration={x}:offset={off:.2f}[x{i}]')
        prev = f'x{i}'
    # iPhone で再生できるよう yuv420p + 無音の音声トラックにする
    args += ['-filter_complex', ';'.join(fc), '-map', f'[{prev}]', '-map', f'{len(frames)}:a',
             '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '20',
             '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', out]
    subprocess.run(args, check=True)
    print(out, f'{sum(durs) - x * (len(frames) - 1):.1f}秒')


if __name__ == '__main__':
    main()
