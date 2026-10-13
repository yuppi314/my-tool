import random, sys
from PIL import Image, ImageDraw, ImageFont
W,H=1080,1920
F8='/root/.cache/night-reel-fonts/ShipporiMinchoB1-800.ttf'; F5='/root/.cache/night-reel-fonts/ShipporiMinchoB1-500.ttf'
GOLD,WHITE,SOFT=(232,200,114),(245,240,230),(200,204,222)
f=lambda s,b=True: ImageFont.truetype(F8 if b else F5,s)
im=Image.new('RGB',(W,H)); d=ImageDraw.Draw(im)
for y in range(H):
    t=y/H; d.line([(0,y),(W,y)],fill=tuple(int(a+(b-a)*t) for a,b in zip((22,34,92),(9,14,44))))
r=random.Random(20)
for _ in range(260):
    x,y,s,a=r.randrange(W),r.randrange(H),r.choice([1,1,1,2,2,3]),r.randint(110,255); d.ellipse([x-s/2,y-s/2,x+s/2,y+s/2],fill=(a,a,int(a*.9)))
for x,y,s in [(140,300,22),(940,240,16),(120,1080,14),(960,980,20)]:
    d.polygon([(x,y-s),(x+s*.25,y),(x,y+s),(x-s*.25,y)],fill=GOLD); d.polygon([(x-s,y),(x,y-s*.25),(x+s,y),(x,y+s*.25)],fill=GOLD)
def c(y,t,size,col=WHITE,b=True):
    ft=f(size,b); d.text(((W-d.textlength(t,font=ft))/2,y),t,font=ft,fill=col)
# 見出し
k='オンラインお茶会のご案内'; ft=f(44,False); w=d.textlength(k,font=ft)
d.line([(W/2-w/2-30,198),(W/2+w/2+30,198)],fill=GOLD,width=2); d.text(((W-w)/2,212),k,font=ft,fill=GOLD); d.line([(W/2-w/2-30,282),(W/2+w/2+30,282)],fill=GOLD,width=2)
c(360,'人生の流れを身につける',64)
c(460,'はじめての',72,GOLD)
c(560,'九星気学',120,GOLD)
# 日時ボックス
d.rounded_rectangle([110,760,970,1080],radius=28,outline=GOLD,width=3)
c(800,'10月20日(火) 20:00〜',62)
c(900,'Zoom ・ 参加無料',56,GOLD)
c(990,'お茶を片手に、気軽にどうぞ☕'.replace('☕',''),40,SOFT,False)
# 参加方法
c(1150,'参加方法',48,GOLD)
c(1230,'DMで「参加します」と',52)
c(1300,'送ってね',52)
c(1400,'Zoomのリンクをお送りします',40,SOFT,False)
# キャラ
ch=Image.open(sys.argv[1]).convert('RGBA'); wd=370; ch=ch.resize((wd,round(ch.height*wd/ch.width)))
a=ch.getchannel('A'); fade=Image.new('L',ch.size,255); fd=ImageDraw.Draw(fade)
for y in range(int(ch.height*.8),ch.height): fd.line([(0,y),(ch.width,y)],fill=int(255*(ch.height-y)/(ch.height*.2)))
ch.putalpha(Image.composite(a,Image.new('L',ch.size,0),fade)); im.paste(ch,(W-wd-10,H-ch.height-60),ch)
d.text((70,H-150),'@secondlife_50s',font=f(36,False),fill=SOFT)
im.save(sys.argv[2],quality=92)
