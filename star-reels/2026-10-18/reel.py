# 日曜リール「方角ごとの運気」(1080x1920・夜空)。8方位を1画面ずつ、その方位の運気と、今月・来月その方位が最大吉方になる星
# 星は src/lib/houi.js の getMonthlyHoui の計算どおり
# 使い方: python3 reel.py <リポジトリ> <character/v2> <出力.mp4(フォロー前)> <表紙.jpg> <ffmpeg> <今月の基準日> <来月の基準日>
import json, os, random, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFont
W,H=1080,1920
F8='/root/.cache/night-reel-fonts/ShipporiMinchoB1-800.ttf'; F5='/root/.cache/night-reel-fonts/ShipporiMinchoB1-500.ttf'
GOLD,WHITE,SOFT,CARD=(232,200,114),(245,240,230),(200,204,222),(28,40,100)
REPO,C,OUT,COVER,FF,D1,D2=sys.argv[1:8]
f=lambda s,b=True: ImageFont.truetype(F8 if b else F5,s)
JS="""const k=require('./src/lib/kyusei');const h=require('./src/lib/houi');const out={};
for(const ds of process.argv.slice(1)){const d=new Date(ds+'T12:00:00+09:00');const m=h.getMonthInfo(d);const by={};
for(let i=1;i<=9;i++){const r=h.getMonthlyHoui(i,d);for(const dir of r.bestDirections){(by[dir]=by[dir]||[]).push(k.getStar(i).name)}}
out[ds]={by,label:m.label||null,start:m.start||null,end:m.end||null}}console.log(JSON.stringify(out))"""
R=json.loads(subprocess.check_output(['node','-e',JS,D1,D2],cwd=REPO))
DIRS=[('北','信頼・愛情・子宝'),('北東','変化・貯蓄・相続'),('東','発展・行動力・若さ'),('南東','良縁・信用・人間関係'),
      ('南','名誉・美・ひらめき'),('南西','家庭運・安定・勤勉'),('西','金運・恋愛・楽しみ'),('北西','仕事運・引き立て・出世')]
M1,M2='10月（10/8〜11/6）','11月（11/7〜12/6）'
POSES=['pose-compass','pose-point-up','pose-idea','pose-mug','pose-cheer','pose-point-you','pose-compass','pose-idea']
def bg(seed):
    im=Image.new('RGB',(W,H)); d=ImageDraw.Draw(im)
    for y in range(H):
        t=y/H; d.line([(0,y),(W,y)],fill=tuple(int(a+(b-a)*t) for a,b in zip((22,34,92),(9,14,44))))
    r=random.Random(seed)
    for _ in range(260):
        x,y,s,a=r.randrange(W),r.randrange(H),r.choice([1,1,2,2,3]),r.randint(110,255); d.ellipse([x-s/2,y-s/2,x+s/2,y+s/2],fill=(a,a,int(a*.9)))
    for x,y,s in [(110,260,20),(980,200,14),(1000,1150,16),(90,1300,12)]:
        d.polygon([(x,y-s),(x+s*.25,y),(x,y+s),(x-s*.25,y)],fill=GOLD); d.polygon([(x-s,y),(x,y-s*.25),(x+s,y),(x,y+s*.25)],fill=GOLD)
    return im,d
def ctr(d,y,t,size,col=WHITE,b=True):
    ft=f(size,b)
    for i,line in enumerate(t.split('\n')):
        d.text(((W-d.textlength(line,font=ft))/2,y+i*size*1.35),line,font=ft,fill=col)
def kicker(d,y,t):
    ft=f(40,False); w=d.textlength(t,font=ft)
    d.line([(W/2-w/2-30,y-10),(W/2+w/2+30,y-10)],fill=GOLD,width=2); d.text(((W-w)/2,y),t,font=ft,fill=GOLD); d.line([(W/2-w/2-30,y+60),(W/2+w/2+30,y+60)],fill=GOLD,width=2)
def chara(im,pose,wd):
    c=Image.open(os.path.join(C,pose+'.png')).convert('RGBA'); c=c.resize((wd,round(c.height*wd/c.width)))
    a=c.getchannel('A'); fade=Image.new('L',c.size,255); fd=ImageDraw.Draw(fade)
    for y in range(int(c.height*.8),c.height): fd.line([(0,y),(c.width,y)],fill=int(255*(c.height-y)/(c.height*.2)))
    c.putalpha(Image.composite(a,Image.new('L',c.size,0),fade)); im.paste(c,(W-wd-10,H-c.height-60),c)
def handle(d): d.text((60,H-130),'@secondlife_50s',font=f(34,False),fill=SOFT)
def compass(d,cx,cy,s,hi=None):
    d.ellipse([cx-s,cy-s,cx+s,cy+s],outline=GOLD,width=3)
    q=s*.8; d.polygon([(cx,cy-q),(cx+q*.18,cy),(cx,cy+q),(cx-q*.18,cy)],fill=GOLD); d.polygon([(cx-q,cy),(cx,cy-q*.18),(cx+q,cy),(cx,cy+q*.18)],fill=GOLD)
scenes=[]
# 1 表紙(方角は出さない)
im,d=bg(1); kicker(d,300,'九星気学で見る')
ctr(d,430,'金運・仕事運・良縁…',62,WHITE,False); ctr(d,540,'方角ごとの',100,GOLD); ctr(d,680,'運気',150,GOLD)
ctr(d,920,'あなたが行きたい方角は\nどれ？',62,WHITE,False)
chara(im,'pose-compass',400); handle(d); scenes.append((im,2.2)); im.convert('RGB').save(COVER,quality=92)
# 2 説明
im,d=bg(2); kicker(d,240,'はじめに')
ctr(d,360,'方角には、それぞれ\n受けとりやすい運気が\nあると言われています',60,WHITE,False)
compass(d,W/2,860,170)
ctr(d,1110,'8つの方角と、\n今月・来月にその方角が\n「最大吉方」になる星を\n順番に見ていきます',48,SOFT,False)
handle(d); scenes.append((im,4.0))
# 3〜10 方位ごと
def card(d,y,title,stars):
    lines=stars if stars else ['この月はなし']
    h=110+70*len(lines)
    d.rounded_rectangle([90,y,W-90,y+h],radius=28,outline=GOLD,width=3,fill=CARD)
    d.text((130,y+22),title,font=f(40,False),fill=GOLD)
    for j,s in enumerate(lines): d.text((170,y+84+j*70),s,font=f(52 if stars else 44, bool(stars)),fill=WHITE if stars else SOFT)
    return y+h+30
for i,(dn,luck) in enumerate(DIRS):
    im,d=bg(10+i); kicker(d,200,f'{i+1} / 8')
    ctr(d,300,dn,150,GOLD)
    ctr(d,520,luck.replace('・','　'),58,WHITE)
    ctr(d,610,'の方角とされています',40,SOFT,False)
    y=720
    y=card(d,y,M1+'に最大吉方の星',R[D1]['by'].get(dn,[]))
    card(d,y,M2+'に最大吉方の星',R[D2]['by'].get(dn,[]))
    chara(im,POSES[i],250); handle(d); scenes.append((im,3.0))
# 11 アドバイス
im,d=bg(90); kicker(d,260,'旅のコツ')
ctr(d,380,'行きたい方角が\n最大吉方になる月に\n出かけるのがおすすめ',60,WHITE)
ctr(d,700,'ご自宅から100km以上が目安',52,GOLD)
ctr(d,820,'近場のお出かけは\n毎朝ストーリーの\n「今日の吉方位」を目安にしてね',48,SOFT,False)
chara(im,'pose-point-up',360); handle(d); scenes.append((im,3.4))
# 12 まとめ
im,d=bg(99); kicker(d,300,'あなたはどれ？')
ctr(d,430,'行きたい方角を',80,WHITE); ctr(d,560,'コメントで教えてね',84,GOLD)
ctr(d,710,'例）「金運の西！」',54,WHITE,False)
ctr(d,870,'方角はご自宅から見て決まります\nあなたの家から見た吉方位は\nプロフィールのリンクの無料診断で',44,SOFT,False)
chara(im,'pose-cheer',380); handle(d); scenes.append((im,3.4))
work=tempfile.mkdtemp(); files=[]; durs=[]
for k,(im,sec) in enumerate(scenes):
    p=os.path.join(work,f's{k:02d}.png'); im.save(p); files.append(p); durs.append(sec)
x=0.25; args=[FF,'-loglevel','error','-y']
for p,dd in zip(files,durs): args+=['-loop','1','-t',str(dd),'-i',p]
args+=['-f','lavfi','-i','anullsrc=r=44100:cl=stereo']
fc=[f'[{i}:v]scale={W}:{H},setsar=1,fps=30,format=yuv420p[v{i}]' for i in range(len(files))]
prev,off='v0',0.0
for i in range(1,len(files)):
    off+=durs[i-1]-x; fc.append(f'[{prev}][v{i}]xfade=transition=fade:duration={x}:offset={off:.2f}[x{i}]'); prev=f'x{i}'
args+=['-filter_complex',';'.join(fc),'-map',f'[{prev}]','-map',f'{len(files)}:a','-c:v','libx264','-profile:v','high','-pix_fmt','yuv420p','-crf','20','-c:a','aac','-b:a','128k','-shortest','-movflags','+faststart',OUT]
subprocess.run(args,check=True); print(json.dumps(R,ensure_ascii=False)); print(OUT, round(sum(durs)-x*(len(files)-1),1),'秒', len(files),'画面')
