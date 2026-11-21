# 9つの星「年末のあるある」リール(1080x1920)。星ごとに「あるある」を1つずつ表示していく
import os, random, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
W,H=1080,1920
F8='/root/.cache/night-reel-fonts/ShipporiMinchoB1-800.ttf'; F5='/root/.cache/night-reel-fonts/ShipporiMinchoB1-500.ttf'
GOLD,WHITE,SOFT=(232,200,114),(245,240,230),(200,204,222)
C, OUT, COVER, FF = sys.argv[1:5]
f=lambda s,b=True: ImageFont.truetype(F8 if b else F5,s)
STARS=[
 ('一白水星','水','年末は家で\nゆっくり派','忘年会は\n少人数がいい','来年の目標は\nこっそり立てる'),
 ('二黒土星','土','年末年始の\n段取り係','おせちの準備は\n早めに始めがち','家族の予定を\nすべて把握'),
 ('三碧木星','木','年末セールに\nつい飛びつく','大掃除は\n勢いで一気に','新年の目標を\nすぐ口にする'),
 ('四緑木星','木','年賀状やLINEの\nあいさつはまめ','忘年会の\nお誘いが多い','お世話になった人へ\nお礼を欠かさない'),
 ('五黄土星','土','忘年会で\nつい仕切ってしまう','年末のまとめ買いは\n多めになりがち','年末も\nパワー全開'),
 ('六白金星','金','大掃除の計画は\nきっちり立てる','年末の仕事を\n全部片づけたい','お正月は\nきちんと迎えたい'),
 ('七赤金星','金','忘年会が\nとにかく楽しみ','年末のごちそうを\n今から考えている','おしゃべりで\n年越ししがち'),
 ('八白土星','土','家計の\n1年分を見直す','来年の計画を\nしっかり立てる','大掃除で\n断捨離が止まらない'),
 ('九紫火星','火','年末のおしゃれは\n気合いが入る','カウントダウンが\n大好き','新年の運勢を\nつい調べちゃう'),
]
POSES=['pose-mug','pose-cheer','pose-point-up','pose-idea','pose-compass','pose-wave','pose-cheer','pose-compass','pose-point-up']
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
im,d=bg(1); kicker(d,330,'九星気学')
ctr(d,450,'9つの星',120,GOLD); ctr(d,610,'年末のあるある',120)
ctr(d,920,'あなたの星は、\nいくつ当てはまる？',62,WHITE,False)
chara(im,'pose-point-you',420); handle(d); scenes.append((im,2.0)); im.convert('RGB').save(COVER,quality=92)
for i,(nm,el,*items) in enumerate(STARS):
    for n in range(1,4):
        im,d=bg(10+i); kicker(d,250,f'{i+1} / 9　{el}の星')
        ctr(d,360,nm+'さん',110,GOLD); ctr(d,520,'年末のあるある',60,WHITE,False)
        y=650
        for k,t in enumerate(items[:n]):
            d.rounded_rectangle([70,y,W-70,y+210],radius=28,outline=GOLD,width=3,fill=(28,40,100))
            cy=y+105; d.line([(108,cy),(130,cy+24),(172,cy-26)],fill=GOLD,width=10,joint='curve')
            ft=f(54); lines=t.split('\n')
            for j,line in enumerate(lines):
                d.text((210,y+(210-len(lines)*72)/2+j*72),line,font=ft,fill=WHITE)
            y+=235
        chara(im,POSES[i],300); handle(d); scenes.append((im,1.15 if n<3 else 1.5))
im,d=bg(99); kicker(d,330,'いくつ当てはまった？')
ctr(d,480,'コメントで\n教えてね',120,GOLD)
ctr(d,850,'例）「七赤金星 3つ全部！」',54,WHITE,False)
ctr(d,1010,'自分の星がわからない方は\nプロフィールのリンクの\n無料診断でチェックしてね',48,SOFT,False)
chara(im,'pose-cheer',380); handle(d); scenes.append((im,3.0))
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
