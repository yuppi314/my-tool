# 星別リール(1080x1920・約20秒)を作る。夜空デザイン。答えだけでなく、過ごし方のアドバイス画面も入れる。
# 画面: 問いかけ → 答え → (方角の意味 or 八方塞がりの説明) → アドバイス3つ → 吉方位旅の心得 / 次の最大吉方 → 毎朝の案内 → まとめ(end.png) → フォローしてね
# 使い方: python3 scripts/night-star-reel.py <基準日 YYYY-MM-DD> <星 1〜9> <出力.mp4> <end.png> <sns-images の character/v2> <ffmpeg のパス>
# 吉方位は src/lib/houi.js の計算結果を node で読み出して使う。
import json, os, random, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1920
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_DIR = os.path.expanduser('~/.cache/night-reel-fonts')
F8 = os.path.join(FONT_DIR, 'ShipporiMinchoB1-800.ttf')
F5 = os.path.join(FONT_DIR, 'ShipporiMinchoB1-500.ttf')
GOLD, WHITE, SOFT = (232, 200, 114), (245, 240, 230), (200, 204, 222)

LUCK = {'北': '信頼・愛情・子宝', '北東': '変化・貯蓄・相続', '東': '発展・行動力・若さ', '南東': '良縁・信用・人間関係',
        '南': '名誉・美・ひらめき', '南西': '家庭運・安定・勤勉', '西': '金運・恋愛・楽しみ', '北西': '仕事運・引き立て・出世'}
# 方角ごとの旅のアイデア(すすめ方の例。断定しない)
IDEAS = {
    '北': ['温泉や水辺で\nゆったり過ごす', '大切な人と\n静かな時間を', '夜の星空や\n川沿いのお散歩'],
    '北東': ['山や高台の\n景色を見に行く', '旅先で\nお金の計画を見直す', '実家や\nご先祖のお墓参り'],
    '東': ['朝日を見に\n早起きの旅', '新しい習い事を\n始めるきっかけに', '音楽やライブを\n楽しむ旅'],
    '南東': ['友人と\nおしゃべり旅', '縁結びの神社に\nお参り', '風の気持ちいい\n高原や海辺へ'],
    '南': ['美術館や\n美しい景色へ', 'おしゃれをして\n出かける旅', '光のきれいな\n夜景を見に'],
    '南西': ['家族と\nのんびり旅', 'ふるさとや\n田園の風景へ', '土地のごはんを\nゆっくり味わう'],
    '西': ['ご当地グルメを\n楽しむ旅', '夕日のきれいな\n場所へ', '気の合う人と\nにぎやかに'],
    '北西': ['格式のある\n神社仏閣へ', '少し良いホテルで\n背すじを伸ばす旅', '仕事のごほうびに\n上質な時間を'],
}
REST = ['お部屋の片づけや\n模様替え', '近場の温泉や\nカフェでのんびり', '次の吉方位旅の\n計画を立てる']
TIPS = ['期間内に\n出発する', 'ご自宅から\n100km以上が目安', '温泉に入り\n土地のものを食べる']

JS = """
const houi = require('./src/lib/houi'); const kyusei = require('./src/lib/kyusei');
const [ds, idStr] = process.argv.slice(1); const id = Number(idStr); const d = new Date(ds + 'T00:00:00');
const h = houi.getMonthlyHoui(id, d);
let next = null;
for (let i = 1; i < 24 && !next; i++) { const m = houi.getMonthlyHoui(id, new Date(h.calendarYear, h.setsuMonth - 1 + i, 15));
  if (!(m.yearBlocked || m.monthBlocked) && m.bestDirections.length) next = { label: m.label, period: m.period, best: m.bestDirections }; }
console.log(JSON.stringify({ name: kyusei.getStar(id).name, label: h.label, period: h.period, best: h.bestDirections,
  blocked: !!(h.yearBlocked || h.monthBlocked), next }));
"""


def font(size, bold=True):
    return ImageFont.truetype(F8 if bold else F5, size)


def background(seed):
    im = Image.new('RGB', (W, H))
    d = ImageDraw.Draw(im)
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=tuple(int(a + (b - a) * t) for a, b in zip((22, 34, 92), (9, 14, 44))))
    r = random.Random(seed)
    for _ in range(240):
        x, y, s, a = r.randrange(W), r.randrange(H), r.choice([1, 1, 1, 2, 2, 3]), r.randint(110, 255)
        d.ellipse([x - s / 2, y - s / 2, x + s / 2, y + s / 2], fill=(a, a, int(a * 0.9)))
    for x, y, s in [(140, 330, 22), (930, 260, 16), (110, 1180, 14), (960, 1060, 20)]:
        d.polygon([(x, y - s), (x + s * 0.25, y), (x, y + s), (x - s * 0.25, y)], fill=GOLD)
        d.polygon([(x - s, y), (x, y - s * 0.25), (x + s, y), (x, y + s * 0.25)], fill=GOLD)
    return im


def lines(d, y, text, size, fill=WHITE, bold=True, gap=1.35):
    f = font(size, bold)
    for i, t in enumerate(text.split('\n')):
        d.text(((W - d.textlength(t, font=f)) / 2, y + i * size * gap), t, font=f, fill=fill)


def chara(im, path, width=440):
    c = Image.open(path).convert('RGBA')
    c = c.resize((width, round(c.height * width / c.width)))
    a = c.getchannel('A')
    fade = Image.new('L', c.size, 255)
    fd = ImageDraw.Draw(fade)
    for y in range(int(c.height * 0.8), c.height):
        fd.line([(0, y), (c.width, y)], fill=int(255 * (c.height - y) / (c.height * 0.2)))
    c.putalpha(Image.composite(a, Image.new('L', c.size, 0), fade))
    im.paste(c, (W - width - 10, H - c.height - 70), c)


def screen(kick, draw, pose, seed, cdir):
    im = background(seed)
    d = ImageDraw.Draw(im)
    f = font(40, False)
    w = d.textlength(kick, font=f)
    d.line([(W / 2 - w / 2 - 30, 138), (W / 2 + w / 2 + 30, 138)], fill=GOLD, width=2)
    d.text(((W - w) / 2, 150), kick, font=f, fill=GOLD)
    d.line([(W / 2 - w / 2 - 30, 212), (W / 2 + w / 2 + 30, 212)], fill=GOLD, width=2)
    d.ellipse([W / 2 - 420, 400, W / 2 + 420, 1240], outline=GOLD, width=4)
    d.ellipse([W / 2 - 398, 422, W / 2 + 398, 1218], outline=(150, 130, 80), width=1)
    draw(d)
    chara(im, os.path.join(cdir, f'pose-{pose}.png'))
    d.text((70, H - 150), '@secondlife_50s', font=font(36, False), fill=SOFT)
    return im


def follow_frame(work, cdir):
    # 最後に付ける「フォローしてね」の画面(scripts/follow_end.py)。sns-images の backgrounds/ があれば水彩の夜空にする
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import follow_end
    sky = os.path.join(cdir, '..', '..', 'backgrounds', 'night-sky-src.png')
    return follow_end.make('night', os.path.join(work, 'follow.png'), cdir, sky if os.path.exists(sky) else None)


def main():
    ds, star, out, end, cdir, ffmpeg = sys.argv[1:7]
    r = json.loads(subprocess.check_output(['node', '-e', JS, ds, star], cwd=ROOT))
    nm, label = r['name'], r['label']
    kick = f'{label}の吉方位'
    scenes = []
    add = lambda draw, pose, sec, k=kick: scenes.append((screen(k, draw, pose, len(scenes) + int(star) * 10, cdir), sec))

    add(lambda d: (lines(d, 620, nm + 'さん', 104), lines(d, 790, 'の吉方位は…？', 72, fill=GOLD),
                   lines(d, 940, r['period'], 44, fill=SOFT, bold=False)), 'point-you', 2.0)
    if r['blocked'] or not r['best']:
        word = '八方塞がり' if r['blocked'] else '最大吉方なし'
        add(lambda d: (lines(d, 560, nm + 'さん', 64), lines(d, 690, word, 120, fill=GOLD),
                       lines(d, 900, '今月はお休みの月です', 50, bold=False)), 'mug', 2.2)
        if r['blocked']:
            add(lambda d: (lines(d, 560, '八方塞がりって？', 72, fill=GOLD),
                           lines(d, 720, 'あなたの星が\n盤のまん中に入る月。\n動くより「整える」\n時期とされています', 50, bold=False)), 'idea', 3.0)
        else:
            add(lambda d: (lines(d, 560, '最大吉方なしって？', 72, fill=GOLD),
                           lines(d, 720, '年と月の両方で\n良い方角が重ならない月。\n遠出より、近場で\n過ごすのがおすすめです', 50, bold=False)), 'idea', 3.0)
        for i, t in enumerate(REST):
            add(lambda d, i=i, t=t: (lines(d, 600, f'今月のおすすめ {i + 1}', 60, fill=GOLD),
                                     lines(d, 740, t, 78)), 'mug' if i != 2 else 'compass', 2.2, f'{nm}さんの過ごし方')
        if r['next']:
            nx = r['next']
            add(lambda d: (lines(d, 560, '次の最大吉方は', 60, fill=GOLD), lines(d, 680, nx['label'], 80),
                           lines(d, 800, '・'.join(nx['best']), 130, fill=GOLD),
                           lines(d, 980, f"({nx['period']})", 44, fill=SOFT, bold=False)), 'cheer', 2.6)
    else:
        dirs = r['best']
        add(lambda d: (lines(d, 540, nm + 'さん', 64), lines(d, 650, '・'.join(dirs), 170 if len(dirs) == 1 else 130, fill=GOLD),
                       lines(d, 880, '年と月の両方で吉の\n「最大吉方」です', 48, bold=False)), 'point-up', 2.4)
        for dn in dirs:
            add(lambda d, dn=dn: (lines(d, 560, f'{dn}の方角は', 64, fill=GOLD), lines(d, 700, LUCK[dn].replace('・', '\n'), 84),
                                  lines(d, 1050, 'の運気とされています', 44, bold=False)), 'idea', 2.4)
        ideas = IDEAS[dirs[0]]
        for i, t in enumerate(ideas):
            add(lambda d, i=i, t=t: (lines(d, 600, f'こんな旅がおすすめ {i + 1}', 56, fill=GOLD),
                                     lines(d, 740, t, 78)), 'cheer' if i == 0 else 'point-up', 2.2, f'{dirs[0]}への旅')
        add(lambda d: (lines(d, 540, '吉方位旅のコツ', 64, fill=GOLD),
                       lines(d, 680, '\n'.join('・' + t.replace('\n', '') for t in TIPS), 50, bold=False, gap=1.7)), 'compass', 3.0)
    add(lambda d: (lines(d, 580, '毎朝ストーリーズで', 56, fill=GOLD), lines(d, 700, '今日の吉方位を\nお届けしています', 72),
                   lines(d, 960, 'お散歩の方角の目安に', 44, fill=SOFT, bold=False)), 'wave', 2.4)

    work = tempfile.mkdtemp(prefix='star-')
    files, durs = [], []
    for i, (im, sec) in enumerate(scenes):
        f = os.path.join(work, f's{i:02d}.png')
        im.save(f)
        files.append(f)
        durs.append(sec)
    files.append(end)
    durs.append(2.6)
    files.append(follow_frame(work, cdir))
    durs.append(2.4)
    x = 0.3
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
    print(out, f'{sum(durs) - x * (len(files) - 1):.1f}秒', len(files), '画面')


if __name__ == '__main__':
    main()
