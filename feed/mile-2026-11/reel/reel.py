# 「片道7,500マイルで行ける 11月の吉方位の旅」リール(1080x1920)。昼の空テーマ(マイル・旅シリーズ)
# 使い方: python3 reel.py <character/v2> <backgrounds> <出力フォルダ> <ffmpeg>
import os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont
W,H=1080,1920
F8='/root/.cache/night-reel-fonts/ShipporiMinchoB1-800.ttf'; F5='/root/.cache/night-reel-fonts/ShipporiMinchoB1-500.ttf'
NAVY=(27,42,90); ORG=(232,108,52); SOFT=(70,90,125); LINE=(150,195,230); WHT=(255,255,255)
C,BG,OUT,FF=sys.argv[1:5]
f=lambda s,b=True: ImageFont.truetype(F8 if b else F5,s)
def sky():
    s=Image.open(os.path.join(BG,'day-sky-src.png')).convert('RGB'); s=s.resize((W,round(s.height*W/s.width)),Image.LANCZOS)
    # 下の雲を含む下側 1920 を土台にし、飛行機のある上側をなじませて重ねる
    im=s.crop((0,s.height-H,W,s.height)); top=s.crop((0,0,W,700))
    m=Image.new('L',(W,700),255); md=ImageDraw.Draw(m)
    for y in range(400,700): md.line([(0,y),(W,y)],fill=int(255*(700-y)/300))
    im.paste(top,(0,0),m); return im
SKY=sky()
def bg(y0,y1):
    im=SKY.copy(); m=Image.new('L',(W,H),0); ImageDraw.Draw(m).rounded_rectangle([50,y0,W-50,y1],radius=40,fill=228)
    im.paste(Image.new('RGB',(W,H),WHT),(0,0),m); return im,ImageDraw.Draw(im)
def ctr(d,y,t,size,col=NAVY,b=True,gap=1.38):
    ft=f(size,b)
    for i,line in enumerate(t.split('\n')): d.text(((W-d.textlength(line,font=ft))/2,y+i*size*gap),line,font=ft,fill=col)
def kicker(d,y,t,size=40):
    ft=f(size,False); w=d.textlength(t,font=ft)
    d.rounded_rectangle([W/2-w/2-36,y-10,W/2+w/2+36,y+size+22],radius=34,fill=ORG); d.text(((W-w)/2,y),t,font=ft,fill=WHT)
def chara(im,pose,wd=300,bottom=0):
    c=Image.open(os.path.join(C,pose+'.png')).convert('RGBA'); c=c.resize((wd,round(c.height*wd/c.width)))
    a=c.getchannel('A'); fade=Image.new('L',c.size,255); fd=ImageDraw.Draw(fade)
    for y in range(int(c.height*.8),c.height): fd.line([(0,y),(c.width,y)],fill=int(255*(c.height-y)/(c.height*.2)))
    c.putalpha(Image.composite(a,Image.new('L',c.size,0),fade)); im.paste(c,(W-wd-10,H-c.height-bottom),c)
def foot(d,t=None):
    d.text((60,H-90),'@secondlife_50s',font=f(32,False),fill=SOFT)
    if t:
        for j,line in enumerate(t.split('\n')): d.text((60,H-200+j*46),line,font=f(32,False),fill=SOFT)
def card(d,y,h,title,body,ts=48,bs=44):
    d.rounded_rectangle([90,y,W-90,y+h],radius=26,outline=LINE,width=3,fill=WHT)
    d.text((130,y+28),title,font=f(ts),fill=ORG)
    for j,line in enumerate(body.split('\n')): d.text((130,y+44+ts+j*bs*1.45),line,font=f(bs,False),fill=NAVY)
scenes=[]
def save(im,sec):
    p=f'{OUT}/s{len(scenes)+1:02d}.png'; im.save(p); scenes.append((p,sec))
# 1 表紙(世界一周の絵)。方角は載せない
im=Image.open(os.path.join(BG,'world-cover-src.png')).convert('RGB'); sc=H/im.height
im=im.resize((round(im.width*sc),H),Image.LANCZOS); x=(im.width-W)//2; im=im.crop((x,0,x+W,H)); d=ImageDraw.Draw(im)
def sctr(y,t,size,col,sc_,sw):
    ft=f(size); d.text(((W-d.textlength(t,font=ft))/2,y),t,font=ft,fill=col,stroke_width=sw,stroke_fill=sc_)
kicker(d,150,'2026年11月(11/7〜12/6)')
sctr(280,'片道',70,WHT,NAVY,5); sctr(370,'7,500マイル',140,ORG,WHT,9)
sctr(560,'で行ける',70,WHT,NAVY,5); sctr(670,'11月の吉方位の旅',92,WHT,NAVY,6)
d.rounded_rectangle([190,840,890,930],radius=45,fill=NAVY); ctr(d,853,'あなたの星はどの方角？',48,WHT)
cover=im.copy(); save(im,3.0)
# 2 フック
im,d=bg(380,1300); kicker(d,450,'ちょっと聞いて')
ctr(d,600,'吉方位の旅って\nお金がかかりそう…',74,NAVY)
ctr(d,880,'実は、ためたマイルで\n行けちゃうんです',62,ORG)
ctr(d,1110,'11月の吉方位を、星ごとに見てみよう',38,SOFT,False)
chara(im,'pose-idea',330); foot(d); save(im,3.2)
# 3 星ごとの最大吉方
im,d=bg(300,1300); kicker(d,360,'11月の最大吉方')
y=500
for nm,dr in [('二黒土星','東'),('四緑木星','西'),('五黄土星','東・北西'),('七赤金星','東')]:
    d.rounded_rectangle([110,y-6,W-110,y+110],radius=22,fill=WHT,outline=LINE,width=3)
    d.text((150,y+16),nm,font=f(60),fill=NAVY); w=d.textlength(dr,font=f(68)); d.text((W-150-w,y+10),dr,font=f(68),fill=ORG); y+=150
ctr(d,y+40,'あなたの星はあった？',46,SOFT,False)
chara(im,'pose-point-up',280); foot(d); save(im,3.6)
# 4 お休みの星
im,d=bg(420,1250); kicker(d,490,'今月お休みの星')
ctr(d,620,'一白水星・八白土星',60,NAVY); ctr(d,710,'…八方塞がり',44,SOFT,False)
ctr(d,820,'三碧木星・六白金星・九紫火星',52,NAVY); ctr(d,905,'…最大吉方なし',44,SOFT,False)
ctr(d,1040,'遠出より、近場の温泉や\nお家時間で整える月に',48,ORG)
chara(im,'pose-mug',300); foot(d); save(im,3.6)
# 5〜7 方角ごとの旅
TRIPS=[('西の旅','四緑木星さん','金運・恋愛・楽しみの運気とされる方角',[('東京からなら','名古屋・伊勢、大阪・京都'),('名古屋からなら','岡山・倉敷、米子・大山'),('大阪からなら','岡山・倉敷、広島・宮島')],'pose-point-up'),
 ('北西の旅','五黄土星さん','仕事運・引き立ての運気とされる方角',[('東京からなら','富山、金沢・加賀'),('大阪からなら','米子・大山、出雲')],'pose-compass'),
 ('東の旅','二黒・五黄・七赤さん','発展・行動力の運気とされる方角',[('福岡からなら','松山・道後、高知、徳島'),('札幌からなら','釧路・阿寒'),('名古屋からなら','東京')],'pose-cheer')]
for title,who,luck,ex,pose in TRIPS:
    y1=780+200*len(ex)
    im,d=bg(260,y1); kicker(d,320,'11月の吉方位')
    ctr(d,420,title,116,ORG); ctr(d,590,who,48); ctr(d,670,luck,38,SOFT,False)
    y=770
    for a,b in ex: card(d,y,180,a,b,42,48); y+=200
    foot(d,'※どれも片道 約5,000〜7,500マイルが目安'); chara(im,pose,260,60); save(im,4.0)
# 8 旅のコツ(アドバイス)
im,d=bg(300,1400); kicker(d,360,'吉方位旅のコツ')
ctr(d,470,'せっかく行くなら',64,NAVY)
y=620
for t,b in [('土地のものを食べる','その土地の気をいただくイメージで'),('温泉や水辺でゆっくり','急がず、のんびり過ごすのがおすすめ'),('写真やメモを残す','あとで見返すと、旅の思い出がふくらみます')]:
    card(d,y,220,t,b,48,38); y+=245
chara(im,'pose-cheer',260,40); foot(d); save(im,4.2)
# 9 マイルの基本
im,d=bg(300,1400); kicker(d,360,'はじめてのマイル旅')
ctr(d,470,'マイル予約の\n3つのポイント',66,ORG)
y=700
for t,b in [('国内線は片道 約5,000マイル〜','近い区間ほど少ないマイルで行けます'),('平日がねらい目','連休や年末年始は必要マイルが多め'),('予約は早めに','特典航空券は席数に限りがあります')]:
    card(d,y,200,t,b,46,38); y+=225
foot(d,'※必要マイルは航空会社・時期で変わります。\n　予約前に各社サイトでご確認ください'); save(im,4.2)
# 10 まとめ
im,d=bg(330,1250); kicker(d,400,'あなたの家から見ると？')
ctr(d,520,'方角は\nご自宅から見て\n決まります',76,ORG)
ctr(d,880,'プロフィールのリンクの無料診断で\n「行きたい場所」を入れると、\nいつ行くといいかがわかります',44,NAVY,False)
ctr(d,1120,'保存して、旅の計画に使ってね',46,ORG,False)
chara(im,'pose-wave',340); foot(d); save(im,3.8)
cover.convert('RGB').save(f'{OUT}/mile-reel-cover.jpg',quality=92)
# 動画: xfade でつなぎ、iPhone で再生できる yuv420p + 無音の音声にする
T=0.4; args=[FF,'-y','-loglevel','error']
for p,s in scenes: args+=['-loop','1','-t',str(s),'-i',p]
total=sum(s for _,s in scenes)-T*(len(scenes)-1)
args+=['-f','lavfi','-t',f'{total:.2f}','-i','anullsrc=r=44100:cl=stereo']
fc=[]; prev='[0:v]'; off=0
for i in range(1,len(scenes)):
    off+=scenes[i-1][1]-T; fc.append(f'{prev}[{i}:v]xfade=transition=fade:duration={T}:offset={off:.2f}[v{i}]'); prev=f'[v{i}]'
fc.append(f'{prev}format=yuv420p[vout]')
args+=['-filter_complex',';'.join(fc),'-map','[vout]','-map',f'{len(scenes)}:a','-c:v','libx264','-r','30','-pix_fmt','yuv420p','-c:a','aac','-shortest','-movflags','+faststart',f'{OUT}/mile-reel.mp4']
subprocess.run(args,check=True); print(f'{total:.1f}s', len(scenes),'scenes')
