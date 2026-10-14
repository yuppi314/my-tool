# 白背景・紺色のハイライト表紙に文字を入れた版。絵を上に少し小さく、文字を下に置く(中央の円の中に収める)
import math, sys
from PIL import Image, ImageDraw, ImageFont
W,H=1080,1920; CX,CY=540,960; NAVY=(27,42,90)
F8='/root/.cache/night-reel-fonts/ShipporiMinchoB1-800.ttf'
def base():
    im=Image.new('RGB',(W,H),(255,255,255)); return im, ImageDraw.Draw(im)
def label(d,t):
    f=ImageFont.truetype(F8,76); d.text((CX-d.textlength(t,font=f)/2,CY+130),t,font=f,fill=NAVY)
def teacup(out):
    im,d=base(); w=13; y0=CY-110; s=0.8
    X=lambda v: CX+v*s
    d.chord([X(-170),y0-120*s,X(130),y0+230*s],0,180,fill=NAVY)
    d.ellipse([X(-170),y0-50*s,X(130),y0+40*s],fill=NAVY)
    d.arc([X(80),y0-10*s,X(215),y0+120*s],-90,90,fill=NAVY,width=w)
    d.ellipse([X(-240),y0+190*s,X(200),y0+245*s],fill=NAVY)
    for dx in (-90,-20,50):
        pts=[(X(dx)+16*math.sin(t/6),y0-70-t*3.2) for t in range(0,26)]
        d.line(pts,fill=NAVY,width=10,joint='curve')
    label(d,'お茶会'); im.save(out,quality=95)
def compass(out):
    im,d=base(); cy=CY-80; r=165
    d.ellipse([CX-r,cy-r,CX+r,cy+r],outline=NAVY,width=15)
    for k in range(8):
        a=math.radians(k*45); L=150 if k%2==0 else 92; s=28 if k%2==0 else 18
        tip=(CX+L*math.sin(a),cy-L*math.cos(a)); l=(CX+s*math.sin(a-math.pi/2),cy-s*math.cos(a-math.pi/2)); rr=(CX+s*math.sin(a+math.pi/2),cy-s*math.cos(a+math.pi/2))
        d.polygon([tip,l,(CX,cy),rr],fill=NAVY if k%2==0 else (120,135,170))
    d.ellipse([CX-18,cy-18,CX+18,cy+18],fill=(255,255,255),outline=NAVY,width=7)
    label(d,'吉方位'); im.save(out,quality=95)
teacup(sys.argv[1]+'/hl-ochakai-white.jpg'); compass(sys.argv[1]+'/hl-kippou-white.jpg')
