# あるあるリールの表紙(1080x1920)。プロフィールの一覧では中央の 1080x1440 が見えるので、文字はその中に収める
import os, random, sys, math
from PIL import Image, ImageDraw, ImageFont
W,H=1080,1920
F8='/root/.cache/night-reel-fonts/ShipporiMinchoB1-800.ttf'; F5='/root/.cache/night-reel-fonts/ShipporiMinchoB1-500.ttf'
GOLD,WHITE,SOFT=(232,200,114),(245,240,230),(200,204,222)
C,OUT=sys.argv[1:3]
f=lambda s,b=True: ImageFont.truetype(F8 if b else F5,s)
im=Image.new('RGB',(W,H)); d=ImageDraw.Draw(im)
for y in range(H):
    t=y/H; d.line([(0,y),(W,y)],fill=tuple(int(a+(b-a)*t) for a,b in zip((26,40,104),(9,14,44))))
r=random.Random(5)
for _ in range(300):
    x,y,s,a=r.randrange(W),r.randrange(H),r.choice([1,1,2,2,3]),r.randint(110,255); d.ellipse([x-s/2,y-s/2,x+s/2,y+s/2],fill=(a,a,int(a*.9)))
def ctr(y,t,size,col=WHITE,b=True):
    ft=f(size,b); d.text(((W-d.textlength(t,font=ft))/2,y),t,font=ft,fill=col)
# 9つの星の名前を円形に並べる
names=['一白','二黒','三碧','四緑','五黄','六白','七赤','八白','九紫']
cx,cy,R=540,760,400
d.ellipse([cx-R-60,cy-R-60,cx+R+60,cy+R+60],outline=(150,130,80),width=2)
for k,n in enumerate(names):
    a=math.radians(-90+k*40); x=cx+R*math.cos(a); y=cy+R*math.sin(a)
    d.ellipse([x-62,y-62,x+62,y+62],fill=(28,40,100),outline=GOLD,width=3)
    ft=f(40); d.text((x-d.textlength(n,font=ft)/2,y-26),n,font=ft,fill=GOLD)
ctr(570,'あなたの星の',58,WHITE,False)
ctr(650,'あるある',150,GOLD)
ctr(850,'いくつ当てはまる？',58,WHITE,False)
# 下の帯
d.rounded_rectangle([140,1290,940,1420],radius=65,fill=GOLD)
ctr(1318,'9つの星 あるある',66,(27,42,90))
c=Image.open(os.path.join(C,'pose-point-you.png')).convert('RGBA'); wd=380; c=c.resize((wd,round(c.height*wd/c.width)))
a=c.getchannel('A'); fade=Image.new('L',c.size,255); fd=ImageDraw.Draw(fade)
for y in range(int(c.height*.8),c.height): fd.line([(0,y),(c.width,y)],fill=int(255*(c.height-y)/(c.height*.2)))
c.putalpha(Image.composite(a,Image.new('L',c.size,0),fade)); im.paste(c,(W-wd-20,H-c.height-60),c)
d.text((60,H-130),'@secondlife_50s',font=f(34,False),fill=SOFT)
im.save(OUT,quality=92)
