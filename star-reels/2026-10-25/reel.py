# 日曜リール「来月(11月)の吉方位 先取り」(1080x1920・夜空)。9つの星ごとに、11月の最大吉方(なければ月の吉方位)
# 星と方角は src/lib/houi.js の getMonthlyHoui の計算どおり
# 使い方: python3 reel.py <リポジトリ> <character/v2> <出力.mp4(フォロー前)> <表紙.jpg> <ffmpeg> <来月の基準日>
import json, os, random, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFont
W,H=1080,1920
F8='/root/.cache/night-reel-fonts/ShipporiMinchoB1-800.ttf'; F5='/root/.cache/night-reel-fonts/ShipporiMinchoB1-500.ttf'
GOLD,WHITE,SOFT,CARD=(232,200,114),(245,240,230),(200,204,222),(28,40,100)
REPO,C,OUT,COVER,FF,D=sys.argv[1:7]
f=lambda s,b=True: ImageFont.truetype(F8 if b else F5,s)
JS="""const k=require('./src/lib/kyusei');const h=require('./src/lib/houi');const d=new Date(process.argv[1]+'T12:00:00+09:00');const out=[];
for(let i=1;i<=9;i++){const r=h.getMonthlyHoui(i,d);const blocked=r.yearBlocked||r.monthBlocked;
out.push({name:k.getStar(i).name,period:r.period,label:r.label,best:r.bestDirections,yearBlocked:r.yearBlocked,monthBlocked:r.monthBlocked,
good:blocked?[]:r.directions.filter(x=>x.monthGood&&!x.best&&x.reasons.length===0).map(x=>x.direction)})}console.log(JSON.stringify(out))"""
R=json.loads(subprocess.check_output(['node','-e',JS,D],cwd=REPO))
LUCK={'北':'信頼・愛情・子宝','北東':'変化・貯蓄・相続','東':'発展・行動力・若さ','南東':'良縁・信用・人間関係',
      '南':'名誉・美・ひらめき','南西':'家庭運・安定・勤勉','西':'金運・恋愛・楽しみ','北西':'仕事運・引き立て・出世'}
MON=R[0]['label'].split('年')[1]; PER=R[0]['period']
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
ctr(d,430,'来月の旅、どこへ行く？',60,WHITE,False); ctr(d,560,MON+'の',110,GOLD); ctr(d,720,'吉方位',150,GOLD)
ctr(d,950,'9つの星ごとに\n先取りでお伝えします',58,WHITE,False)
chara(im,'pose-compass',400); handle(d); scenes.append((im,2.2)); im.convert('RGB').save(COVER,quality=92)
# 2 説明
im,d=bg(2); kicker(d,240,'はじめに')
ctr(d,360,f'九星気学の{MON}は',60,WHITE,False); ctr(d,460,PER,96,GOLD)
ctr(d,640,'月の切りかわりは1日ではなく\n「節入り」の日と言われています',48,SOFT,False)
ctr(d,860,'自分の星のところで\n止めて見てね',64,WHITE)
handle(d); scenes.append((im,3.6))
# 3〜11 星ごと
for i,s in enumerate(R):
    im,d=bg(10+i); kicker(d,200,f'{i+1} / 9')
    ctr(d,310,s['name'],120,GOLD)
    if s['best']:
        ctr(d,500,MON+'の最大吉方',46,SOFT,False)
        y=590
        for dn in s['best']:
            ctr(d,y,dn,120,WHITE); ctr(d,y+165,LUCK[dn].replace('・','　'),46,GOLD,False); y+=270
    elif s['yearBlocked'] or s['monthBlocked']:
        ctr(d,520,'今年は' if s['yearBlocked'] else MON+'は',50,SOFT,False); ctr(d,600,'八方塞がり',110,WHITE)
        ctr(d,790,'動くより「整える」時期\nお部屋の片づけや\n次の旅の計画に',50,GOLD,False)
    else:
        ctr(d,500,'最大吉方は',46,SOFT,False); ctr(d,570,'お休みの月',90,WHITE)
        if s['good']:
            ctr(d,740,'月の吉方位',46,SOFT,False); y=820
            for dn in s['good']:
                ctr(d,y,dn,96,GOLD); ctr(d,y+135,LUCK[dn].replace('・','　'),42,WHITE,False); y+=220
        else:
            ctr(d,760,'近場でのんびり\n次の旅の計画を立てる月に',50,GOLD,False)
    chara(im,POSES[i],250); handle(d); scenes.append((im,2.8))
# 12 旅のコツ
im,d=bg(90); kicker(d,260,'旅のコツ')
ctr(d,380,'最大吉方の方角へ\nご自宅から100km以上が\n目安とされています',58,WHITE)
ctr(d,720,'近場のお出かけは\n毎朝ストーリーの\n「今日の吉方位」を目安にしてね',48,SOFT,False)
chara(im,'pose-point-up',360); handle(d); scenes.append((im,3.4))
# 13 まとめ
im,d=bg(99); kicker(d,300,'あなたの星は？')
ctr(d,430,'保存して',80,WHITE); ctr(d,560,'旅の計画に使ってね',80,GOLD)
ctr(d,760,'方角はご自宅から見て決まります\nあなたの家から見た吉方位と旅先は\nプロフィールのリンクの無料診断で',44,SOFT,False)
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
for k,p in enumerate(files): Image.open(p).convert('RGB').resize((270,480)).save(os.path.join(os.path.dirname(OUT),f'thumb{k:02d}.jpg'))
