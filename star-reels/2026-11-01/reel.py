# 日曜リール「11月のおでかけにいい日」(1080x1920・夜空)。節月(11/7〜12/6)の土日・祝日のうち、星ごとに日の吉方位が多い日を3つ
# 日の吉方位は src/lib/nichiban.js の getDailyHoui の計算どおり(日帰り・お散歩の目安)
# 使い方: python3 reel.py <リポジトリ> <character/v2> <出力.mp4(フォロー前)> <表紙.jpg> <ffmpeg> <節月の始まり> <節月の終わり> <祝日 M/D,...>
import json, os, random, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFont
W,H=1080,1920
F8='/root/.cache/night-reel-fonts/ShipporiMinchoB1-800.ttf'; F5='/root/.cache/night-reel-fonts/ShipporiMinchoB1-500.ttf'
GOLD,WHITE,SOFT,CARD=(232,200,114),(245,240,230),(200,204,222),(28,40,100)
REPO,C,OUT,COVER,FF,D0,D1,HOL=sys.argv[1:9]
f=lambda s,b=True: ImageFont.truetype(F8 if b else F5,s)
JS="""const n=require('./src/lib/nichiban');const k=require('./src/lib/kyusei');const [a,b,hol]=process.argv.slice(1);const hs=hol.split(',');
const days=[];for(let t=new Date(a+'T12:00:00+09:00');t<=new Date(b+'T12:00:00+09:00');t=new Date(t.getTime()+864e5)){const md=(t.getMonth()+1)+'/'+t.getDate();if(t.getDay()===0||t.getDay()===6||hs.includes(md))days.push(t)}
const out=[];for(let i=1;i<=9;i++){const sc=days.map(d=>{const r=n.getDailyHoui(i,d);return {t:d.getTime(),d:(d.getMonth()+1)+'/'+d.getDate()+'('+'日月火水木金土'[d.getDay()]+(hs.includes((d.getMonth()+1)+'/'+d.getDate())?'・祝':'')+')',c:r.blocked?-1:r.goodDirections.length,g:r.goodDirections}});
const top=sc.filter(x=>x.c>0).sort((x,y)=>y.c-x.c||x.t-y.t).slice(0,3).sort((x,y)=>x.t-y.t);out.push({name:k.getStar(i).name,top})}console.log(JSON.stringify(out))"""
R=json.loads(subprocess.check_output(['node','-e',JS,D0,D1,HOL],cwd=REPO))
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
ctr(d,430,'お散歩・日帰りの目安',60,WHITE,False); ctr(d,560,'11月の',110,GOLD); ctr(d,720,'おでかけ日和',130,GOLD)
ctr(d,950,'9つの星ごとに\n週末・祝日からお伝えします',58,WHITE,False)
chara(im,'pose-compass',400); handle(d); scenes.append((im,2.2)); im.convert('RGB').save(COVER,quality=92)
# 2 説明
im,d=bg(2); kicker(d,240,'はじめに')
ctr(d,360,'毎日変わる「日の吉方位」',58,WHITE,False); ctr(d,470,'11/7〜12/6の',70,GOLD); ctr(d,580,'土日・祝日から',70,GOLD)
ctr(d,760,'吉方位が多い日を\n星ごとに3つ選びました',52,WHITE,False)
ctr(d,980,'近場のお出かけや\nお散歩の目安にしてね',48,SOFT,False)
handle(d); scenes.append((im,3.6))
# 3〜11 星ごと
for i,s in enumerate(R):
    im,d=bg(10+i); kicker(d,200,f'{i+1} / 9')
    ctr(d,310,s['name'],120,GOLD); ctr(d,500,'のおでかけ日和',50,SOFT,False)
    y=610
    for x in s['top']:
        d.rounded_rectangle([90,y,W-90,y+190],radius=28,outline=GOLD,width=3,fill=CARD)
        ft=f(70); d.text((140,y+22),x['d'],font=ft,fill=WHITE)
        ft2=f(40,False); d.text((140,y+118),'吉方位　'+'・'.join(x['g']),font=ft2,fill=GOLD)
        y+=215
    chara(im,POSES[i],250); handle(d); scenes.append((im,3.0))
# 12 アドバイス
im,d=bg(90); kicker(d,260,'おでかけのコツ')
ctr(d,380,'方角はご自宅から見て\n決まります',58,WHITE)
ctr(d,600,'カフェ、お買い物、神社へのお参り…\n吉方位の方へ\nちょっと足をのばしてみてね',46,SOFT,False)
ctr(d,880,'泊まりの旅は\n「月の最大吉方」を目安に',52,GOLD)
chara(im,'pose-point-up',360); handle(d); scenes.append((im,3.6))
# 13 まとめ
im,d=bg(99); kicker(d,300,'あなたの星は？')
ctr(d,430,'保存して',80,WHITE); ctr(d,560,'おでかけの予定に',80,GOLD)
ctr(d,760,'毎朝のストーリーズでも\n「今日の吉方位」をお届けしています\n\nあなたの家から見た吉方位は\nプロフィールのリンクの無料診断で',44,SOFT,False)
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
