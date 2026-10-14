# ハイライト表紙(1080x1920)。Instagram は中央を丸く切り抜くので、絵は中央 600px の円に収める
import math, random, sys
from PIL import Image, ImageDraw, ImageFont
W,H=1080,1920; CX,CY=540,960
GOLD=(232,200,114)
F5='/root/.cache/night-reel-fonts/ShipporiMinchoB1-800.ttf'
def base():
    im=Image.new('RGB',(W,H)); d=ImageDraw.Draw(im)
    for y in range(H):
        t=abs(y-CY)/CY; d.line([(0,y),(W,y)],fill=tuple(int(a+(b-a)*t) for a,b in zip((28,42,105),(10,15,46))))
    r=random.Random(3)
    for _ in range(160):
        x,y,s,a=r.randrange(W),r.randrange(H),r.choice([1,1,2,2,3]),r.randint(110,230); d.ellipse([x-s/2,y-s/2,x+s/2,y+s/2],fill=(a,a,int(a*.9)))
    d.ellipse([CX-330,CY-330,CX+330,CY+330],outline=GOLD,width=8)
    return im,d
def label(d,t):
    f=ImageFont.truetype(F5,66); d.text((CX-d.textlength(t,font=f)/2,CY+170),t,font=f,fill=GOLD)
def teacup(out):
    im,d=base(); w=10; y0=CY-90
    d.arc([CX-150,y0-60,CX+110,y0+40],0,360,fill=GOLD,width=w)                      # 口
    d.arc([CX-150,y0-120,CX+110,y0+200],0,180,fill=GOLD,width=w)                    # 胴
    d.line([(CX-150,y0-10),(CX-150,y0+40)],fill=GOLD,width=w); d.line([(CX+110,y0-10),(CX+110,y0+40)],fill=GOLD,width=w)
    d.arc([CX+70,y0-10,CX+190,y0+100],-90,90,fill=GOLD,width=w)                     # 持ち手
    d.arc([CX-210,y0+150,CX+170,y0+230],0,180,fill=GOLD,width=w)                    # 受け皿
    for dx in (-80,-20,40):                                                         # 湯気
        pts=[(CX+dx+18*math.sin(t/6),y0-80-t*3.4) for t in range(0,26)]
        d.line(pts,fill=GOLD,width=7,joint='curve')
    label(d,'お茶会'); im.save(out,quality=95)
def compass(out):
    im,d=base(); cy=CY-70
    d.ellipse([CX-150,cy-150,CX+150,cy+150],outline=GOLD,width=10)
    for k in range(8):
        a=math.radians(k*45); L=135 if k%2==0 else 80; s=22 if k%2==0 else 14
        tip=(CX+L*math.sin(a),cy-L*math.cos(a)); l=(CX+s*math.sin(a-math.pi/2),cy-s*math.cos(a-math.pi/2)); r=(CX+s*math.sin(a+math.pi/2),cy-s*math.cos(a+math.pi/2))
        d.polygon([tip,l,(CX,cy),r],fill=GOLD if k%2==0 else (180,150,85))
    d.ellipse([CX-16,cy-16,CX+16,cy+16],fill=(20,30,80),outline=GOLD,width=5)
    label(d,'今日の吉方位'); im.save(out,quality=95)
teacup(sys.argv[1]+'/hl-ochakai.jpg'); compass(sys.argv[1]+'/hl-kippou.jpg')
