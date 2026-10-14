# 「片道7,500マイルで行ける 11月の吉方位の旅」カルーセル(1080x1350)
import os, random, sys
from PIL import Image, ImageDraw, ImageFont
W,H=1080,1350
F8='/root/.cache/night-reel-fonts/ShipporiMinchoB1-800.ttf'; F5='/root/.cache/night-reel-fonts/ShipporiMinchoB1-500.ttf'
# マイル・旅のシリーズは「昼の空」テーマ(星のシリーズの夜空と区別する)
NAVY=(27,42,90); GOLD=(232,108,52); WHITE=NAVY; SOFT=(70,90,125); CARD=(255,255,255); LINE=(150,195,230)
C,OUT=sys.argv[1:3]
f=lambda s,b=True: ImageFont.truetype(F8 if b else F5,s)
def cloud(d,x,y,w):
    for dx,dy,r in [(0,0,.30),(.28,-.12,.36),(.62,0,.28),(.36,.08,.32)]:
        d.ellipse([x+dx*w-r*w,y+dy*w-r*w*.7,x+dx*w+r*w,y+dy*w+r*w*.7],fill=(255,255,255))
def plane(d,x,y,s):
    # 小さな飛行機と点線の航路
    for k in range(6): d.ellipse([x-170+k*26,y+30-k*5-3,x-170+k*26+8,y+30-k*5+5],fill=(255,255,255))
    d.polygon([(x,y),(x+s,y-s*.18),(x+s*1.1,y),(x+s,y+s*.18)],fill=(255,255,255))
    d.polygon([(x+s*.45,y),(x+s*.25,y-s*.55),(x+s*.4,y-s*.55),(x+s*.7,y)],fill=(255,255,255))
    d.polygon([(x+s*.45,y),(x+s*.25,y+s*.55),(x+s*.4,y+s*.55),(x+s*.7,y)],fill=(255,255,255))
def bg(seed):
    im=Image.new('RGB',(W,H)); d=ImageDraw.Draw(im)
    for y in range(H):
        t=y/H; d.line([(0,y),(W,y)],fill=tuple(int(a+(b-a)*t) for a,b in zip((120,190,240),(235,246,255))))
    # 雲は文字の少ない左右のはしに置く
    for x,y,w in [(-120,300,230),(960,760,220),(-110,1150,200)]: cloud(d,x,y,w)
    plane(d,900,70,95)
    return im,d
def ctr(d,y,t,size,col=WHITE,b=True):
    ft=f(size,b)
    for i,line in enumerate(t.split('\n')):
        d.text(((W-d.textlength(line,font=ft))/2,y+i*size*1.38),line,font=ft,fill=col)
def kicker(d,y,t):
    ft=f(36,False); w=d.textlength(t,font=ft)
    d.rounded_rectangle([W/2-w/2-34,y-8,W/2+w/2+34,y+56],radius=32,fill=GOLD); d.text(((W-w)/2,y),t,font=ft,fill=(255,255,255))
def chara(im,pose,wd=250):
    c=Image.open(os.path.join(C,pose+'.png')).convert('RGBA'); c=c.resize((wd,round(c.height*wd/c.width)))
    a=c.getchannel('A'); fade=Image.new('L',c.size,255); fd=ImageDraw.Draw(fade)
    for y in range(int(c.height*.8),c.height): fd.line([(0,y),(c.width,y)],fill=int(255*(c.height-y)/(c.height*.2)))
    c.putalpha(Image.composite(a,Image.new('L',c.size,0),fade)); im.paste(c,(W-wd-10,H-c.height),c)
def foot(d,t=None):
    d.text((60,H-70),'@secondlife_50s',font=f(30,False),fill=SOFT)
    if t:
        for j,line in enumerate(t.split('\n')): d.text((60,H-170+j*44),line,font=f(30,False),fill=SOFT)
def card(d,y,h,title,body,tsize=50,bsize=38):
    d.rounded_rectangle([70,y,W-70,y+h],radius=24,outline=LINE,width=3,fill=CARD)
    d.text((110,y+28),title,font=f(tsize),fill=GOLD)
    for j,line in enumerate(body.split('\n')): d.text((110,y+40+tsize+j*bsize*1.45),line,font=f(bsize,False),fill=NAVY)
n=1
def save(im,name):
    global n; im.save(f'{OUT}/{n}_{name}.jpg',quality=92); n+=1
# 1 表紙
im,d=bg(1); kicker(d,140,'2026年11月(11/7〜12/6)')
ctr(d,270,'片道',64,WHITE,False); ctr(d,360,'7,500マイル',130,GOLD); ctr(d,540,'で行ける',64,WHITE,False)
ctr(d,660,'11月の吉方位の旅',86)
d.rounded_rectangle([200,880,880,980],radius=50,fill=GOLD); ctr(d,903,'あなたの星はどの方角？',46,(255,255,255))
ctr(d,1040,'→ 横にめくってね',38,SOFT,False)
chara(im,'pose-point-you',300); foot(d); save(im,'表紙')
# 2 星ごとの最大吉方
im,d=bg(2); kicker(d,110,'11月の最大吉方')
rows=[('二黒土星','東'),('四緑木星','西'),('五黄土星','東・北西'),('七赤金星','東')]
y=230
for nm,dr in rows:
    d.rounded_rectangle([90,y-6,W-90,y+96],radius=20,fill=CARD,outline=LINE,width=2)
    d.text((130,y+10),nm,font=f(56),fill=WHITE); w=d.textlength(dr,font=f(64)); d.text((W-130-w,y+4),dr,font=f(64),fill=GOLD); y+=118
ctr(d,y+40,'お休みの星（遠出より整える月）',40,GOLD,False)
ctr(d,y+110,'一白水星・八白土星…八方塞がり\n三碧木星・六白金星・九紫火星…最大吉方なし',36,SOFT,False)
chara(im,'pose-idea',230); foot(d); save(im,'星ごとの方角')
# 3〜5 方角ごとの旅
TRIPS=[
 ('西の旅','四緑木星さん','金運・恋愛・楽しみの運気とされる方角',[('たとえば東京からなら','名古屋・伊勢、大阪・京都'),('たとえば名古屋からなら','岡山・倉敷、米子・大山'),('たとえば大阪からなら','岡山・倉敷、広島・宮島')],'pose-point-up'),
 ('北西の旅','五黄土星さん','仕事運・引き立て・出世の運気とされる方角',[('たとえば東京からなら','富山、金沢・加賀'),('たとえば大阪からなら','米子・大山、出雲')],'pose-compass'),
 ('東の旅','二黒土星・五黄土星・七赤金星さん','発展・行動力・若さの運気とされる方角',[('たとえば福岡からなら','松山・道後、高知、徳島'),('たとえば札幌からなら','釧路・阿寒'),('たとえば名古屋からなら','東京')],'pose-cheer'),
]
for title,who,luck,ex,pose in TRIPS:
    im,d=bg(len(title)); kicker(d,110,'11月の吉方位')
    ctr(d,210,title,104,GOLD); ctr(d,370,who,44); ctr(d,440,luck,36,SOFT,False)
    y=540
    for a,b in ex:
        card(d,y,170,a,b,42,46); y+=190
    foot(d,'※ここに挙げた旅先は、どれも\n　片道 約5,000〜7,500マイルが目安'); chara(im,pose,210); save(im,title)
# 6 マイルの基本
im,d=bg(6); kicker(d,110,'はじめてのマイル旅')
ctr(d,200,'マイルで行くと\nこんなにおトク',78,GOLD)
y=470
for t,b in [('国内線は片道 約5,000マイル〜','近い区間ほど少ないマイルで行けます'),('時期で必要マイルが変わる','連休や年末年始は多め。平日がねらい目'),('予約は早めがコツ','特典航空券は席数に限りがあります')]:
    card(d,y,180,t,b,46,36); y+=205
foot(d,'※必要マイルは航空会社・時期で変わります。\n　予約前に各社サイトでご確認ください'); save(im,'マイルの基本')
# 7 まとめ
im,d=bg(7); kicker(d,140,'あなたの家から見ると？')
ctr(d,270,'方角は\nご自宅から見て\n決まります',74,GOLD)
ctr(d,640,'プロフィールのリンクの無料診断で\n「行きたい場所」を入れると、\nいつ行くといいかがわかります',44,WHITE,False)
ctr(d,900,'保存して、旅の計画に使ってね',46,GOLD,False)
chara(im,'pose-wave',300); foot(d); save(im,'まとめ')
