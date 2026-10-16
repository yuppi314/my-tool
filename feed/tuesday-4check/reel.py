# 火曜「旅の前に確認したい4つのこと」リール(クリーム×金の学びシリーズ)
# 使い方: python3 reel.py <元リールのフレームのフォルダ> <character/v2> <出力フォルダ> <ffmpeg> <make_bgm.py>
import os, sys, subprocess
from PIL import Image, ImageDraw, ImageFont
src, cdir, out, ff, bgm = sys.argv[1:6]
W, H = 1080, 1920
F8 = '/root/.cache/night-reel-fonts/ShipporiMinchoB1-800.ttf'; F5 = '/root/.cache/night-reel-fonts/ShipporiMinchoB1-500.ttf'
INK, GOLD, SOFT = (48, 46, 58), (168, 128, 58), (110, 104, 100)
f = lambda s, b=True: ImageFont.truetype(F8 if b else F5, s)
plain = Image.open(os.path.join(src, 'plain.png')).convert('RGB')

def c(d, y, t, size, col=INK, b=True):
    ft = f(size, b); d.text(((W - d.textlength(t, font=ft)) / 2, y), t, font=ft, fill=col)

def divider(d, y, w=260):
    d.line([(W/2-w, y), (W/2-24, y)], fill=GOLD, width=2); d.line([(W/2+24, y), (W/2+w, y)], fill=GOLD, width=2)
    s = 12; d.polygon([(W/2, y-s), (W/2+s*.3, y), (W/2, y+s), (W/2-s*.3, y)], fill=GOLD); d.polygon([(W/2-s, y), (W/2, y-s*.3), (W/2+s, y), (W/2, y+s*.3)], fill=GOLD)

def chara(im, pose, wd, x, y):
    ch = Image.open(os.path.join(cdir, pose)).convert('RGBA'); ch = ch.resize((wd, round(ch.height * wd / ch.width)))
    im.paste(ch, (x, y - ch.height), ch)

EXPL = [
    ('01', '出発する日', ['同じ方角でも、', '月によって吉にも凶にも', '変わると言われています'],
     ['月の区切りは「節入り」', '毎月1日ではありません']),
    ('02', '旅行の目的', ['方角ごとに、', '受けとりやすい運気が', 'ちがうとされています'],
     ['仕事運なら北西、金運なら西', '良いご縁なら南東 など']),
    ('03', '移動距離', ['ご自宅から', '100km以上はなれると、', '方角の力が大きいとされます'],
     ['近場のお出かけは', '「今日の吉方位」を目安に']),
    ('04', '滞在時間', ['日帰りより、', '泊まりの旅のほうが', '良いとされています'],
     ['温泉に入って、', 'その土地のものを食べてね']),
]
screens = []
for no, title, body, point in EXPL:
    im = plain.copy(); d = ImageDraw.Draw(im)
    d.ellipse([W/2-70, 440, W/2+70, 580], fill=GOLD); ft = f(70); d.text(((W-d.textlength(no, font=ft))/2, 462), no, font=ft, fill=(250, 246, 236))
    c(d, 620, title, 96)
    divider(d, 770)
    for i, t in enumerate(body): c(d, 830 + i*84, t, 54, INK, False)
    d.rounded_rectangle([130, 1140, 950, 1380], radius=30, fill=(250, 246, 236), outline=GOLD, width=3)
    ft = f(34); t = 'ポイント'; tw = d.textlength(t, font=ft)
    d.rounded_rectangle([W/2-tw/2-26, 1116, W/2+tw/2+26, 1168], radius=26, fill=GOLD); d.text(((W-tw)/2, 1120), t, font=ft, fill=(250, 246, 236))
    for i, t in enumerate(point): c(d, 1200 + i*76, t, 46, GOLD)
    p = os.path.join(out, f'e{no}.png'); im.save(p); screens.append(p)

# 無料診断の案内
im = plain.copy(); d = ImageDraw.Draw(im)
c(d, 470, 'この4つ、', 72); c(d, 570, '無料診断で', 100, GOLD); c(d, 700, 'まとめてチェック', 100, GOLD)
divider(d, 860)
c(d, 910, '出かける日と行き先を入れると', 46, INK, False)
c(d, 980, '方角の良し悪しと', 46, INK, False)
c(d, 1050, '旅先でやるとよいことがわかります', 46, INK, False)
d.rounded_rectangle([170, 1170, 910, 1290], radius=60, fill=GOLD)
c(d, 1196, 'プロフィールのリンクから', 52, (250, 246, 236))
chara(im, 'pose-point-up.png', 330, W-360, 1700)
cta = os.path.join(out, 'cta.png'); im.save(cta)

# フォロー画面(クリーム版)
im = plain.copy(); d = ImageDraw.Draw(im)
c(d, 520, 'フォローしてね', 104, GOLD)
divider(d, 690)
c(d, 750, '毎週あなたの星の', 54, INK, False); c(d, 830, '吉方位をお届けします', 54, INK, False)
d.rounded_rectangle([150, 960, 930, 1080], radius=60, fill=GOLD)
c(d, 988, '@secondlife_50s をフォロー', 50, (250, 246, 236))
chara(im, 'pose-wave.png', 360, (W-360)//2, 1640)
fol = os.path.join(out, 'follow.png'); im.save(fol)

seq = [(os.path.join(src, 'src-1.5.png'), 3.4), (os.path.join(src, 'src-5.png'), 2.4), (os.path.join(src, 'src-9.png'), 2.6)]
seq += [(p, 3.0) for p in screens]
seq += [(os.path.join(src, 'src-14.5.png'), 2.6), (cta, 3.4), (os.path.join(src, 'src-17.png'), 2.4), (fol, 2.6)]
X = 0.35
args = [ff, '-y', '-loglevel', 'error']
for p, dur in seq: args += ['-loop', '1', '-t', f'{dur + X:.2f}', '-i', p]
fl = []; prev = '[0:v]'; off = 0
for i in range(len(seq)): fl.append(f'[{i}:v]scale={W}:{H},setsar=1,fps=30,format=yuv420p[v{i}]')
prev = '[v0]'
for i in range(1, len(seq)):
    off += seq[i-1][1]
    fl.append(f'{prev}[v{i}]xfade=transition=fade:duration={X}:offset={off:.2f}[x{i}]'); prev = f'[x{i}]'
total = sum(dd for _, dd in seq) + X
wav = os.path.join(out, 'bgm.wav')
subprocess.run(['python3', bgm, 'night', f'{total:.1f}', wav], check=True)
args += ['-i', wav, '-filter_complex', ';'.join(fl), '-map', prev, '-map', f'{len(seq)}:a', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-c:a', 'aac', '-b:a', '160k', '-shortest', os.path.join(out, 'tuesday-reel-v2.mp4')]
subprocess.run(args, check=True)
# 表紙(つかみの画面をそのまま)
Image.open(os.path.join(src, 'src-1.5.png')).convert('RGB').save(os.path.join(out, 'tuesday-cover.jpg'), quality=92)
print('total', round(total, 1))
