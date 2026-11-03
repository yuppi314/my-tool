# ホイアンのシーフード店リール v2(グルメ中心・個人アカウントにも使える)(本人の旅の写真・動画 + 昼の空テーマの文字)。最後に方角の一言(南西)
# 使い方: python3 reel.py <素材フォルダ> <character/v2> <backgrounds> <出力フォルダ> <ffmpeg>
import os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps, ImageEnhance
W,H=1080,1920; FPS=30
F8='/root/.cache/night-reel-fonts/ShipporiMinchoB1-800.ttf'; F5='/root/.cache/night-reel-fonts/ShipporiMinchoB1-500.ttf'
NAVY=(27,42,90); ORG=(232,108,52); WHT=(255,255,255); SOFT=(70,90,125)
SRC,C,BG,OUT,FF=sys.argv[1:6]
f=lambda s,b=True: ImageFont.truetype(F8 if b else F5,s)
os.makedirs(OUT,exist_ok=True)
def run(a): subprocess.run([FF,'-y','-loglevel','error']+a,check=True)
def cover_crop(im,cx=0.5,cy=0.5,scale=1.12):
    # 9:16 に切り抜き、ゆっくり寄るための余白(scale)を残す
    w,h=round(W*scale),round(H*scale); r=max(w/im.width,h/im.height)
    im=im.resize((round(im.width*r),round(im.height*r)),Image.LANCZOS)
    x=min(max(round(im.width*cx-w/2),0),im.width-w); y=min(max(round(im.height*cy-h/2),0),im.height-h)
    return im.crop((x,y,x+w,y+h))
def blur_boxes(im,boxes):
    # 顔のぼかし: 四角ではなく、ふちがなじむ楕円にする(少し広めに取り、まわりの色になじませる)
    W0,H0=im.size
    for x0,y0,x1,y1 in boxes:
        w,h=x1-x0,y1-y0; px,py=int(w*.25),int(h*.25)
        X0,Y0,X1,Y1=max(0,x0-px),max(0,y0-py),min(W0,x1+px),min(H0,y1+py)
        reg=im.crop((X0,Y0,X1,Y1)); r=max(12,int(min(w,h)*.22))
        bl=reg.filter(ImageFilter.GaussianBlur(r))
        m=Image.new('L',reg.size,0); ImageDraw.Draw(m).ellipse([x0-X0,y0-Y0,x1-X0,y1-Y0],fill=255)
        m=m.filter(ImageFilter.GaussianBlur(max(6,int(min(w,h)*.12))))
        reg.paste(bl,(0,0),m); im.paste(reg,(X0,Y0))
    return im
def panel_text(lines,y,align='c',pad=46,alpha=225):
    # lines: [(文字, 大きさ, 色, 太字)] を白い半透明パネルにのせる
    ov=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(ov)
    hs=[int(s*1.45) for _,s,_,_ in lines]; ph=sum(hs)+pad*2-int(lines[-1][1]*0.45)
    d.rounded_rectangle([60,y,W-60,y+ph],radius=36,fill=(255,255,255,alpha))
    yy=y+pad
    for (t,s,col,b),hh in zip(lines,hs):
        ft=f(s,b); d.text(((W-d.textlength(t,font=ft))/2,yy),t,font=ft,fill=col,stroke_width=(4 if alpha<200 else 0),stroke_fill=(255,255,255)); yy+=hh
    return ov
def pill(ov,y,t,size=40):
    d=ImageDraw.Draw(ov); ft=f(size,False); w=d.textlength(t,font=ft)
    d.rounded_rectangle([W/2-w/2-36,y-10,W/2+w/2+36,y+size+22],radius=34,fill=ORG+(255,)); d.text(((W-w)/2,y),t,font=ft,fill=WHT)
def handle(ov):
    d=ImageDraw.Draw(ov); d.text((60,H-90),'@secondlife_50s',font=f(32,False),fill=WHT,stroke_width=3,stroke_fill=NAVY)
def chara(ov,pose,wd=300):
    c=Image.open(os.path.join(C,pose+'.png')).convert('RGBA'); c=c.resize((wd,round(c.height*wd/c.width)))
    ov.alpha_composite(c,(W-wd-10,H-c.height))
def sky():
    s=Image.open(os.path.join(BG,'day-sky-src.png')).convert('RGB'); s=s.resize((W,round(s.height*W/s.width)),Image.LANCZOS)
    im=s.crop((0,s.height-H,W,s.height)); top=s.crop((0,0,W,700)); m=Image.new('L',(W,700),255); md=ImageDraw.Draw(m)
    for y in range(400,700): md.line([(0,y),(W,y)],fill=int(255*(700-y)/300))
    im.paste(top,(0,0),m); return im
segs=[]
def photo_seg(img,ov,sec,zoom_in=True):
    n=len(segs)+1; base=f'{OUT}/b{n:02d}.png'; ovp=f'{OUT}/o{n:02d}.png'; img.convert('RGB').save(base); ov.save(ovp)
    fr=int(sec*FPS); bw,bh=img.size
    # 余白の範囲でゆっくり寄る(または引く)
    z=f"'1+0.10*on/{fr}'" if zoom_in else f"'1.10-0.10*on/{fr}'"
    run(['-loop','1','-i',base,'-i',ovp,'-filter_complex',
         f"[0:v]scale={bw*2}:{bh*2},zoompan=z={z}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={fr}:s={W}x{H}:fps={FPS}[bg];[bg][1:v]overlay=0:0,format=yuv420p[v]",
         '-map','[v]','-frames:v',str(fr),'-c:v','libx264','-preset','veryfast','-crf','20',f'{OUT}/seg{n:02d}.mp4'])
    segs.append((f'{OUT}/seg{n:02d}.mp4',sec))
def video_seg(path,ss,ov,sec):
    n=len(segs)+1; ovp=f'{OUT}/o{n:02d}.png'; ov.save(ovp)
    tm="zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p,eq=saturation=1.45:contrast=1.08:brightness=0.03"
    run(['-ss',str(ss),'-t',str(sec),'-i',path,'-i',ovp,'-filter_complex',
         f"[0:v]{tm},scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={FPS},tpad=stop_mode=clone:stop_duration=2[bg];[bg][1:v]overlay=0:0,format=yuv420p[v]",
         '-map','[v]','-an','-frames:v',str(int(sec*FPS)),'-c:v','libx264','-preset','veryfast','-crf','20',f'{OUT}/seg{n:02d}.mp4'])
    segs.append((f'{OUT}/seg{n:02d}.mp4',sec))
def pop(im):
    # 夜の提灯や街並みが映えるよう、くすみを取って少し鮮やかに
    im=ImageOps.autocontrast(im,cutoff=1)
    im=ImageEnhance.Color(im).enhance(1.25); im=ImageEnhance.Brightness(im).enhance(1.06); im=ImageEnhance.Contrast(im).enhance(1.06)
    r,g,b=im.split(); r=r.point(lambda v:min(255,int(v*1.03))); return Image.merge('RGB',(r,g,b))
P=lambda k: pop(Image.open(os.path.join(SRC,k)).convert('RGB'))
E=lambda: Image.new('RGBA',(W,H),(0,0,0,0))
def big(ov,y,t,size,col=WHT,sc=NAVY,sw=6):
    d=ImageDraw.Draw(ov)
    for i,line in enumerate(t.split('\n')):
        ft=f(size); d.text(((W-d.textlength(line,font=ft))/2,y+i*size*1.3),line,font=ft,fill=col,stroke_width=sw,stroke_fill=sc)

MV=[(90,1110,230,1280),(250,1160,380,1310),(540,1190,680,1300),(820,1150,1000,1300)]
LAN=[(1260,1220,1390,1370)]
DAI=[(90,1570,250,1730),(420,1440,520,1540),(1170,1480,1270,1580)]
WEL=[(1330,1570,1450,1760),(0,1900,140,2100)]
TWO=[(385,775,475,885),(515,750,605,860),(895,745,950,810)]
BOAT=[(990,1040,1100,1170),(1255,1060,1380,1190),(1570,1045,1670,1170)]
SANDY=[(445,795,535,895)]
def num(ov,y,n,t,size=72):
    pill(ov,y,f'その{n}',42); big(ov,y+92,t,size)
def lab(ov,y,t,size=66): big(ov,y,t,size)


MV=[(90,1110,230,1280),(250,1160,380,1310),(540,1190,680,1300),(820,1150,1000,1300)]
LAN=[(1260,1220,1390,1370)]
DAI=[(90,1570,250,1730),(420,1440,520,1540),(1170,1480,1270,1580)]
WEL=[(1330,1570,1450,1760),(0,1900,140,2100)]
TWO=[(385,775,475,885),(515,750,605,860),(895,745,950,810)]
BOAT=[(990,1040,1100,1170),(1255,1060,1380,1190),(1570,1045,1670,1170)]
SANDY=[(445,795,535,895)]

# 1 つかみ: 焼きがき(動画)
ov=E(); pill(ov,700,'ベトナム・ホイアン'); big(ov,790,'ホイアンで\nこれは食べて',104); big(ov,1090,'シーフードのお店',64,ORG,WHT,8); handle(ov)
video_seg(os.path.join(SRC,'IMG_4093.mov'),0.3,ov,2.2)
# 表紙
ov=E(); pill(ov,560,'ベトナム・ホイアン'); big(ov,650,'ホイアンで\nこれは食べて',108); big(ov,960,'シーフードのお店',70,ORG,WHT,8); handle(ov)
cv=cover_crop(P('shrimp.jpg'),0.5,0.45,1.0).convert('RGBA'); cv.alpha_composite(ov); cv.convert('RGB').save(f'{OUT}/seafood-reel-cover.jpg',quality=92)
# 2 お店
ov=E(); big(ov,260,'スパのあとに行った\nDAI AN(ダイアン)',66); handle(ov)
photo_seg(cover_crop(blur_boxes(P('daian.jpg'),DAI),0.5,0.4),ov,2.2,False)
# 3 焼きがき
ov=E(); pill(ov,1180,'その1'); big(ov,1270,'ネギ油とピーナッツの\n焼きがき',70); handle(ov)
video_seg(os.path.join(SRC,'IMG_4093.mov'),2.5,ov,2.6)
# 4 えび
ov=E(); pill(ov,1180,'その2'); big(ov,1270,'金色の衣の\n大きなえび',78); handle(ov)
photo_seg(cover_crop(P('shrimp.jpg'),0.5,0.45),ov,2.6)
# 5 空芯菜
ov=E(); pill(ov,1180,'その3'); big(ov,1270,'にんにく香る\n空芯菜の炒めもの',72); handle(ov)
photo_seg(cover_crop(P('morning-glory.jpg'),0.5,0.5),ov,2.4)
ov=E(); big(ov,1300,'野菜もしっかり',72); handle(ov)
video_seg(os.path.join(SRC,'IMG_4096.mov'),2.8,ov,1.8)
# 6 コメント
im=sky().convert('RGBA'); ov=panel_text([('あなたなら',54,NAVY,True),('どれを食べたい？',72,ORG,True),('',16,NAVY,False),('1 焼きがき',48,NAVY,False),('2 金色のえび',48,NAVY,False),('3 空芯菜の炒めもの',48,NAVY,False),('',16,NAVY,False),('番号でコメントしてね',44,ORG,True)],360)
chara(ov,'pose-point-you',290); handle(ov); im.alpha_composite(ov)
photo_seg(im.resize((round(W*1.12),round(H*1.12))),E(),3.4)
# つなぐ(フェード 0.35 秒)+ 無音の音声
T=0.35; args=[]
for p,s in segs: args+=['-i',p]
total=sum(s for _,s in segs)-T*(len(segs)-1)
args+=['-f','lavfi','-t',f'{total:.2f}','-i','anullsrc=r=44100:cl=stereo']
fc=[]; prev='[0:v]'; off=0
for i in range(1,len(segs)):
    off+=segs[i-1][1]-T; fc.append(f'{prev}[{i}:v]xfade=transition=fade:duration={T}:offset={off:.2f}[v{i}]'); prev=f'[v{i}]'
fc.append(f'{prev}format=yuv420p[vout]')
run(args+['-filter_complex',';'.join(fc),'-map','[vout]','-map',f'{len(segs)}:a','-c:v','libx264','-r',str(FPS),'-pix_fmt','yuv420p','-c:a','aac','-shortest','-movflags','+faststart',f'{OUT}/seafood-raw.mp4'])
print(f'{total:.1f}s',len(segs))
