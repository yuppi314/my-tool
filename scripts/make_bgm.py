# 著作権の心配がないオリジナルBGMを合成する(night: 星のリール用の静かで神秘的な音 / island: 旅のリール用の明るくのんびりした音)
# 使い方: python3 scripts/make_bgm.py <night|island> <秒数> <出力.wav>  → ffmpeg で動画の無音トラックと差し替える
import sys, numpy as np, wave
SR=44100
def note(n): return 440*2**((n-69)/12)
def env(t,a,r,d):
    e=np.minimum(1,t/a); e*=np.clip((d-t)/r,0,1); return e
def pad(freqs,d,vol=.08):
    t=np.arange(int(SR*d))/SR; s=np.zeros_like(t)
    for f in freqs:
        for det in (-0.6,0,0.6):
            s+=np.sin(2*np.pi*(f+det)*t)+0.3*np.sin(2*np.pi*2*(f+det)*t)
    return vol*s/len(freqs)/3*env(t,1.2,1.5,d)
def bell(f,d=2.5,vol=.10):
    t=np.arange(int(SR*d))/SR
    s=np.sin(2*np.pi*f*t)+.4*np.sin(2*np.pi*2.76*f*t)*np.exp(-t*3)+.2*np.sin(2*np.pi*5.4*f*t)*np.exp(-t*6)
    return vol*s*np.exp(-t*1.6)*np.minimum(1,t/.005)
def pluck(f,d=1.2,vol=.18):
    # カープラス・ストロングでウクレレ風
    n=int(SR/f); buf=np.random.uniform(-1,1,n); out=np.zeros(int(SR*d))
    for i in range(len(out)):
        out[i]=buf[i%n]; buf[i%n]=0.5*(buf[i%n]+buf[(i+1)%n])*0.996
    return vol*out
def add(dst,src,at):
    i=int(at*SR)
    if i>=len(dst): return
    j=min(len(dst),i+len(src)); dst[i:j]+=src[:j-i]
def echo(x,delay=.33,fb=.35,n=4):
    y=x.copy()
    for k in range(1,n+1):
        d=int(SR*delay*k); y[d:]+=x[:-d]*(fb**k)
    return y
def build(kind,dur):
    out=np.zeros(int(SR*dur)); rng=np.random.default_rng(7)
    if kind=='night':
        prog=[[57,60,64],[53,57,60],[48,52,55],[55,59,62]]  # Am F C G
        scale=[69,72,74,76,79,81,84]
        bar=4.0
        for b in range(int(dur/bar)+1):
            ch=prog[b%4]; add(out,pad([note(m) for m in ch]+[note(ch[0]-12)],bar+1.5,.10),b*bar)
            for k in range(3):
                if rng.random()<.8: add(out,bell(note(rng.choice(scale)),3,.06),b*bar+k*1.33+rng.random()*.3)
        out=echo(out,.42,.4,5)
    else:
        prog=[[60,64,67],[57,60,64],[53,57,60],[55,59,62]]  # C Am F G
        bpm=92; beat=60/bpm; bar=4*beat
        mel=[72,74,76,79,81,84]
        for b in range(int(dur/bar)+1):
            ch=prog[b%4]; add(out,pad([note(m) for m in ch],bar+1,.06),b*bar)
            pat=[0,1,2,1,0,2,1,2]
            for k,p in enumerate(pat): add(out,pluck(note(ch[p]+12),1.0,.14),b*bar+k*beat/2)
            for k in range(2):
                if rng.random()<.7: add(out,bell(note(rng.choice(mel)),1.8,.05),b*bar+k*2*beat+beat)
        out=echo(out,beat*.75,.25,3)
    # 最初と最後をなめらかに
    f=int(SR*1.5); out[:f]*=np.linspace(0,1,f); out[-f*2:]*=np.linspace(1,0,f*2)
    out=out/np.max(np.abs(out))*0.6
    return out
kind,dur,path=sys.argv[1],float(sys.argv[2]),sys.argv[3]
y=build(kind,dur); st=np.stack([y,np.roll(y,int(SR*.012))],1)
with wave.open(path,'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st*32767).astype(np.int16).tobytes())
