# ハイライト「学び」の表紙(白背景・紺色。お茶会・吉方位と同じ型)。開いた本と小さな星
import math, sys
from PIL import Image, ImageDraw, ImageFont
W,H=1080,1920; CX,CY=540,960; NAVY=(27,42,90); LIGHT=(120,135,170)
F8='/root/.cache/night-reel-fonts/ShipporiMinchoB1-800.ttf'
im=Image.new('RGB',(W,H),(255,255,255)); d=ImageDraw.Draw(im)
cy=CY-60
# 開いた本(左右のページ)
L=[(CX-12,cy-90),(CX-200,cy-120),(CX-200,cy+80),(CX-12,cy+110)]
R=[(CX+12,cy-90),(CX+200,cy-120),(CX+200,cy+80),(CX+12,cy+110)]
d.polygon(L,fill=NAVY); d.polygon(R,fill=NAVY)
for k in range(3):
    y=cy-60+k*50
    d.line([(CX-170,y-22),(CX-45,y-4)],fill=(255,255,255),width=9); d.line([(CX+45,y-4),(CX+170,y-22)],fill=(255,255,255),width=9)
d.line([(CX-215,cy+95),(CX,cy+130),(CX+215,cy+95)],fill=NAVY,width=14,joint='curve')
# 本の上の星
sx,sy,s=CX,cy-200,46
d.polygon([(sx,sy-s),(sx+s*.24,sy),(sx,sy+s),(sx-s*.24,sy)],fill=NAVY); d.polygon([(sx-s,sy),(sx,sy-s*.24),(sx+s,sy),(sx,sy+s*.24)],fill=NAVY)
for x,y,t in [(CX-130,cy-185,18),(CX+135,cy-170,14)]:
    d.polygon([(x,y-t),(x+t*.25,y),(x,y+t),(x-t*.25,y)],fill=LIGHT); d.polygon([(x-t,y),(x,y-t*.25),(x+t,y),(x,y+t*.25)],fill=LIGHT)
f=ImageFont.truetype(F8,76); t='学び'; d.text((CX-d.textlength(t,font=f)/2,CY+130),t,font=f,fill=NAVY)
im.save(sys.argv[1]+'/hl-manabi-white.jpg',quality=95)
