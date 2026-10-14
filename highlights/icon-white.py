# 白背景・紺色のシンプルなハイライト表紙(既存の「旅の記録」とそろえる)。文字は入れない(名前は丸の下に出るため)
import math, sys
from PIL import Image, ImageDraw
W,H=1080,1920; CX,CY=540,960; NAVY=(27,42,90)
def base():
    im=Image.new('RGB',(W,H),(255,255,255)); return im, ImageDraw.Draw(im)
def teacup(out):
    im,d=base(); w=16; y0=CY-60
    d.ellipse([CX-170,y0-50,CX+130,y0+40],outline=NAVY,width=w)
    d.chord([CX-170,y0-150,CX+130,y0+230],0,180,fill=NAVY)
    d.ellipse([CX-170,y0-50,CX+130,y0+40],fill=NAVY)
    d.arc([CX+80,y0-10,CX+215,y0+120],-90,90,fill=NAVY,width=w)
    d.ellipse([CX-240,y0+190,CX+200,y0+250],fill=NAVY)
    for dx in (-90,-20,50):
        pts=[(CX+dx+20*math.sin(t/6),y0-80-t*4.2) for t in range(0,30)]
        d.line(pts,fill=NAVY,width=12,joint='curve')
    im.save(out,quality=95)
def compass(out):
    im,d=base(); r=210
    d.ellipse([CX-r,CY-r,CX+r,CY+r],outline=NAVY,width=18)
    for k in range(8):
        a=math.radians(k*45); L=190 if k%2==0 else 115; s=34 if k%2==0 else 22
        tip=(CX+L*math.sin(a),CY-L*math.cos(a)); l=(CX+s*math.sin(a-math.pi/2),CY-s*math.cos(a-math.pi/2)); rr=(CX+s*math.sin(a+math.pi/2),CY-s*math.cos(a+math.pi/2))
        d.polygon([tip,l,(CX,CY),rr],fill=NAVY if k%2==0 else (120,135,170))
    d.ellipse([CX-22,CY-22,CX+22,CY+22],fill=(255,255,255),outline=NAVY,width=8)
    im.save(out,quality=95)
teacup(sys.argv[1]+'/hl-ochakai-white.jpg'); compass(sys.argv[1]+'/hl-kippou-white.jpg')
