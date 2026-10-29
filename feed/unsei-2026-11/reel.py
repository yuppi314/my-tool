# 「11月、あなたの星はどんな月?」運勢リール(1080x1920・夜空)。吉方位ではなく、月盤で本命星が入る場所(宮)から、その月のテーマを伝える
# 星の場所は src/lib/houi.js の月盤(buildBoard)の計算どおり。ラッキーカラーは、その宮にもともといる星(後天定位盤)の色
# 使い方: python3 reel.py <リポジトリ> <character/v2> <出力.mp4(フォロー前)> <表紙.jpg> <ffmpeg> <月の基準日>
import json, os, random, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFont
W,H=1080,1920
F8='/root/.cache/night-reel-fonts/ShipporiMinchoB1-800.ttf'; F5='/root/.cache/night-reel-fonts/ShipporiMinchoB1-500.ttf'
GOLD,WHITE,SOFT,CARD=(232,200,114),(245,240,230),(200,204,222),(28,40,100)
REPO,C,OUT,COVER,FF,D=sys.argv[1:7]
f=lambda s,b=True: ImageFont.truetype(F8 if b else F5,s)
JS="""const h=require('./src/lib/houi');const k=require('./src/lib/kyusei');const d=new Date(process.argv[1]+'T12:00:00+09:00');const m=h.getMonthInfo(d);const b=h.buildBoard(m.monthCenter);
const out=[];for(let i=1;i<=9;i++){let pos='中宮';for(const [dir,st] of Object.entries(b)){if(st===i)pos=dir}out.push({name:k.getStar(i).name,pos})}console.log(JSON.stringify({label:m.label,period:m.period,stars:out}))"""
R=json.loads(subprocess.check_output(['node','-e',JS,D],cwd=REPO))
MON=R['label'].split('年')[1]; PER=R['period']
# 宮ごとの月のテーマ(九星気学で一般に言われる意味)。色はその宮の定位星の色
PAL={'北':('静かに力をためる月','無理せず、心と体を休めると\n次の流れにつながると言われます','白','温かいお風呂でゆっくり'),
 '南西':('コツコツが実を結ぶ月','目立たなくても、地道な\nひと手間が力になる時期とされます','茶色','家のことを丁寧に'),
 '東':('新しいことを始めたくなる月','気になっていたことに\n一歩ふみ出すのにいい時期とされます','青','朝のお散歩や新しい習いごと'),
 '南東':('人とのご縁が広がる月','人の紹介やおしゃべりから\nいいご縁が届くと言われます','緑','久しぶりの人に連絡'),
 '中宮':('立ち止まって整える月','いろいろな出来事が集まりやすい月\n動くより、整えるのがおすすめです','黄色','お部屋の片づけ'),
 '北西':('忙しくても充実する月','がんばりが認められやすく\n目上の人の助けもあるとされます','金色','神社やお寺へのお参り'),
 '西':('楽しみやごほうびの月','おいしいものや楽しい時間に\nめぐまれやすいと言われます','ピンク','友だちとおいしいごはん'),
 '北東':('流れが切りかわる月','変化が起きやすい時期\n思い切った見直しにいいとされます','白','いらないものを手ばなす'),
 '南':('注目されて、ひらめく月','アイデアがわきやすく\n人前に出る機会も増えるとされます','紫','美容やおしゃれを楽しむ')}
POSES=['pose-compass','pose-point-up','pose-idea','pose-point-you','pose-compass','pose-idea','pose-point-up','pose-mug','pose-point-you']
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
scenes=[]
# 1 表紙(方角は出さない)
im,d=bg(1); kicker(d,300,'九星気学で見る')
ctr(d,430,'あなたの星は、どんな月？',60,WHITE,False); ctr(d,560,MON+'の',110,GOLD); ctr(d,720,'運勢',160,GOLD)
ctr(d,960,'9つの星ごとに\nラッキーカラーもお伝えします',56,WHITE,False)
chara(im,'pose-point-you',400); handle(d); scenes.append((im,2.2)); im.convert('RGB').save(COVER,quality=92)
# 2 説明
im,d=bg(2); kicker(d,240,'はじめに')
ctr(d,360,f'九星気学の{MON}は',60,WHITE,False); ctr(d,460,PER,96,GOLD)
ctr(d,640,'その月、あなたの星が\n盤のどこに入るかで\n月のテーマが変わると言われています',50,WHITE,False)
ctr(d,980,'自分の星のところで\n止めて見てね',62,GOLD)
handle(d); scenes.append((im,3.8))
for i,s in enumerate(R['stars']):
    th,msg,col,act=PAL[s['pos']]
    im,d=bg(10+i); kicker(d,200,f'{i+1} / 9')
    ctr(d,300,s['name']+'さん',110,GOLD); ctr(d,470,MON+'は',48,SOFT,False)
    ctr(d,550,th,74,WHITE)
    ctr(d,700,msg,44,SOFT,False)
    d.rounded_rectangle([100,880,W-100,1290],radius=28,outline=GOLD,width=3,fill=CARD)
    d.text((150,910),'ラッキーカラー',font=f(40,False),fill=GOLD); d.text((150,965),col,font=f(64),fill=WHITE)
    d.text((150,1080),'開運アクション',font=f(40,False),fill=GOLD); d.text((150,1135),act,font=f(54),fill=WHITE)
    chara(im,POSES[i],250); handle(d); scenes.append((im,3.0))
im,d=bg(99); kicker(d,300,'当たってる？')
ctr(d,430,'あなたの星は',80,WHITE); ctr(d,560,'どんな月だった？',80,GOLD)
ctr(d,730,'コメントで教えてね\n例）「二黒土星、まさに切りかえの月！」',46,WHITE,False)
ctr(d,920,'自分の星がわからない方は\nプロフィールのリンクの\n無料診断でチェックしてね',44,SOFT,False)
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
