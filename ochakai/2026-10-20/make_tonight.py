# お茶会の告知ストーリー(先着5名・インスタのDMで申し込み)と満席のお知らせを作る。
# 使い方: python3 make2.py <character/v2> <出力フォルダ>
import random, sys, os
from PIL import Image, ImageDraw, ImageFont
W,H=1080,1920
F8='/root/.cache/night-reel-fonts/ShipporiMinchoB1-800.ttf'; F5='/root/.cache/night-reel-fonts/ShipporiMinchoB1-500.ttf'
GOLD,WHITE,SOFT,ROSE=(232,200,114),(245,240,230),(200,204,222),(240,170,170)
f=lambda s,b=True: ImageFont.truetype(F8 if b else F5,s)
cdir,out=sys.argv[1],sys.argv[2]

def base():
    im=Image.new('RGB',(W,H)); d=ImageDraw.Draw(im)
    for y in range(H):
        t=y/H; d.line([(0,y),(W,y)],fill=tuple(int(a+(b-a)*t) for a,b in zip((22,34,92),(9,14,44))))
    r=random.Random(20)
    for _ in range(260):
        x,y,s,a=r.randrange(W),r.randrange(H),r.choice([1,1,1,2,2,3]),r.randint(110,255); d.ellipse([x-s/2,y-s/2,x+s/2,y+s/2],fill=(a,a,int(a*.9)))
    for x,y,s in [(140,300,22),(940,240,16),(120,1080,14),(960,980,20)]:
        d.polygon([(x,y-s),(x+s*.25,y),(x,y+s),(x-s*.25,y)],fill=GOLD); d.polygon([(x-s,y),(x,y-s*.25),(x+s,y),(x,y+s*.25)],fill=GOLD)
    return im,d

def chara(im,pose,wd=340):
    ch=Image.open(os.path.join(cdir,pose)).convert('RGBA'); ch=ch.resize((wd,round(ch.height*wd/ch.width)))
    a=ch.getchannel('A'); fade=Image.new('L',ch.size,255); fd=ImageDraw.Draw(fade)
    for y in range(int(ch.height*.8),ch.height): fd.line([(0,y),(ch.width,y)],fill=int(255*(ch.height-y)/(ch.height*.2)))
    ch.putalpha(Image.composite(a,Image.new('L',ch.size,0),fade)); im.paste(ch,(W-wd-20,H-ch.height-40),ch)

def c(d,y,t,size,col=WHITE,b=True):
    ft=f(size,b); d.text(((W-d.textlength(t,font=ft))/2,y),t,font=ft,fill=col)

def header(d,k):
    ft=f(44,False); w=d.textlength(k,font=ft)
    d.line([(W/2-w/2-30,198),(W/2+w/2+30,198)],fill=GOLD,width=2); d.text(((W-w)/2,212),k,font=ft,fill=GOLD); d.line([(W/2-w/2-30,282),(W/2+w/2+30,282)],fill=GOLD,width=2)

# 1) 告知
im,d=base(); header(d,'今夜20時からです')
c(d,350,'人生の流れを身につける',60)
c(d,445,'はじめての',68,GOLD)
c(d,535,'九星気学',116,GOLD)
# 申し込みはインスタのDM(YUKOさんの希望 10/16)
# 先着5名のリボン
d.rounded_rectangle([300,725,780,815],radius=45,fill=ROSE)
ft=f(54); t='先着5名さま'; d.text(((W-d.textlength(t,font=ft))/2,737),t,font=ft,fill=(60,30,50))
d.rounded_rectangle([110,860,970,1150],radius=28,outline=GOLD,width=3)
c(d,895,'10月20日(火) 20:00〜',60)
c(d,990,'Zoom ・ 参加無料',54,GOLD)
c(d,1075,'あなたの星と吉方位を一緒に見ます',38,SOFT,False)
c(d,1215,'申し込み方法',48,GOLD)
c(d,1295,'インスタのDMに',52)
c(d,1365,'「お茶会」と送ってね',52)
c(d,1460,'ZoomのURLをDMでお送りします',38,SOFT,False)
chara(im,'pose-mug.png')
d.text((70,H-130),'@secondlife_50s',font=f(36,False),fill=SOFT)
im.save(os.path.join(out,'story-tonight.jpg'),quality=92)

