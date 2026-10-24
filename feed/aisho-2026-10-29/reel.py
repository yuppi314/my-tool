# 星の相性リール(1080x1920・夜空)。テーマ: 親子(娘・息子・お母さん)。相性は src/lib/kyusei.js の五行(相生・比和)の計算どおり
# 使い方: python3 reel.py <リポジトリ> <character/v2> <出力.mp4> <表紙.jpg> <ffmpeg>
import json, math, os, random, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFont
W,H=1080,1920
F8='/root/.cache/night-reel-fonts/ShipporiMinchoB1-800.ttf'; F5='/root/.cache/night-reel-fonts/ShipporiMinchoB1-500.ttf'
GOLD,WHITE,SOFT,CARD=(232,200,114),(245,240,230),(200,204,222),(28,40,100)
REPO,C,OUT,COVER,FF=sys.argv[1:6]
f=lambda s,b=True: ImageFont.truetype(F8 if b else F5,s)
JS="""const k=require('./src/lib/kyusei');const out=[];
for(let i=1;i<=9;i++){const me=k.getStar(i);const g={generatedBy:[],generates:[],same:[]};
for(let j=1;j<=9;j++){if(j===i)continue;const o=k.getStar(j);const r=k.elementRelation(me.element,o.element);if(g[r])g[r].push(o.name)}
out.push({name:me.name,el:me.element,...g})}console.log(JSON.stringify(out))"""
STARS=json.loads(subprocess.check_output(['node','-e',JS],cwd=REPO))
POSES=['pose-compass','pose-mug','pose-point-up','pose-idea','pose-cheer','pose-wave','pose-point-you','pose-compass','pose-cheer']
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
def heart(d,cx,cy,s,col):
    d.ellipse([cx-s,cy-s*.6,cx,cy+s*.4],fill=col); d.ellipse([cx,cy-s*.6,cx+s,cy+s*.4],fill=col)
    d.polygon([(cx-s*.97,cy),(cx+s*.97,cy),(cx,cy+s*1.1)],fill=col)
scenes=[]
# 1 表紙(方角は出さない)
im,d=bg(1); kicker(d,300,'九星気学で見る')
ctr(d,420,'娘・息子・お母さん',70,WHITE); ctr(d,540,'親子の相性',124,GOLD)
heart(d,W/2,770,46,GOLD)
ctr(d,880,'あなたと相性のいい星は\nどれ？',62,WHITE,False)
chara(im,'pose-point-you',400); handle(d); scenes.append((im,2.2)); im.convert('RGB').save(COVER,quality=92)
# 2 五行のかんたんな説明(相生の輪)
im,d=bg(2); kicker(d,220,'相性の見かた')
ctr(d,320,'9つの星は\n5つの「気」に分かれます',54,WHITE,False)
cx,cy,R=W/2,860,250; ELS=['木','火','土','金','水']
pts=[(cx+R*math.sin(2*math.pi*k/5),cy-R*math.cos(2*math.pi*k/5)) for k in range(5)]
for k in range(5):
    (x1,y1),(x2,y2)=pts[k],pts[(k+1)%5]; dx,dy=x2-x1,y2-y1; L=math.hypot(dx,dy); ux,uy=dx/L,dy/L
    sx,sy,ex,ey=x1+ux*82,y1+uy*82,x2-ux*82,y2-uy*82; d.line([(sx,sy),(ex,ey)],fill=GOLD,width=5)
    d.polygon([(ex,ey),(ex-ux*26-uy*14,ey-uy*26+ux*14),(ex-ux*26+uy*14,ey-uy*26-ux*14)],fill=GOLD)
for (x,y),e in zip(pts,ELS):
    d.ellipse([x-70,y-70,x+70,y+70],fill=CARD,outline=GOLD,width=4); ft=f(70); d.text((x-d.textlength(e,font=ft)/2,y-48),e,font=ft,fill=GOLD)
ctr(d,1180,'矢印の向きに「生み出す」関係は\n一緒にいると心地よい相性とされます',44,WHITE,False)
ctr(d,1330,'同じ気どうしは、分かり合える似たもの同士',40,SOFT,False)
handle(d); scenes.append((im,4.2))
# 3〜 星ごと: 名前 → 相性の星
def card(d,y,title,stars):
    h=118+74*len(stars)
    d.rounded_rectangle([70,y,W-70,y+h],radius=28,outline=GOLD,width=3,fill=CARD)
    d.text((110,y+22),title,font=f(40,False),fill=GOLD)
    for j,s in enumerate(stars): d.text((150,y+86+j*74),s,font=f(56),fill=WHITE)
    return y+h+28
for i,s in enumerate(STARS):
    for step in (0,1):
        im,d=bg(10+i); kicker(d,210,f'{i+1} / 9　{s["el"]}の星')
        ctr(d,320,s['name']+'さん',110,GOLD)
        if step==0:
            ctr(d,520,'と心地よい親子は…？',60,WHITE,False); chara(im,'pose-idea',340); handle(d); scenes.append((im,1.0)); continue
        y=500
        y=card(d,y,'あなたを支えてくれる星',s['generatedBy'])
        y=card(d,y,'あなたが見守ってあげられる星',s['generates'])
        if s['same']: card(d,y,'気が合う似たもの同士',s['same'])
        chara(im,POSES[i],270); handle(d); scenes.append((im,2.6))
# まとめ
im,d=bg(99); kicker(d,300,'あなたの家族は？')
ctr(d,430,'あなたと\nご家族の星を',80,WHITE); ctr(d,650,'コメントで教えてね',84,GOLD)
ctr(d,800,'例）「私は二黒、娘は九紫！」',52,WHITE,False)
ctr(d,960,'自分の星がわからない方は\nプロフィールのリンクの\n無料診断でチェックしてね',46,SOFT,False)
chara(im,'pose-cheer',380); handle(d); scenes.append((im,3.2))
work=tempfile.mkdtemp(); files=[]; durs=[]
for k,(im,sec) in enumerate(scenes):
    p=os.path.join(work,f's{k:02d}.png'); im.save(p); files.append(p); durs.append(sec)
x=0.2; args=[FF,'-loglevel','error','-y']
for p,dd in zip(files,durs): args+=['-loop','1','-t',str(dd),'-i',p]
args+=['-f','lavfi','-i','anullsrc=r=44100:cl=stereo']
fc=[f'[{i}:v]scale={W}:{H},setsar=1,fps=30,format=yuv420p[v{i}]' for i in range(len(files))]
prev,off='v0',0.0
for i in range(1,len(files)):
    off+=durs[i-1]-x; fc.append(f'[{prev}][v{i}]xfade=transition=fade:duration={x}:offset={off:.2f}[x{i}]'); prev=f'x{i}'
args+=['-filter_complex',';'.join(fc),'-map',f'[{prev}]','-map',f'{len(files)}:a','-c:v','libx264','-profile:v','high','-pix_fmt','yuv420p','-crf','20','-c:a','aac','-b:a','128k','-shortest','-movflags','+faststart',OUT]
subprocess.run(args,check=True); print(OUT, round(sum(durs)-x*(len(files)-1),1),'秒', len(files),'画面')
