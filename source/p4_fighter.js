// ================= DOME SHADER (glassy guardian shield) =================
const DOME_VS='varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vP=position; vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }';
const DOME_FS=`uniform float skin; uniform vec3 tint; uniform vec3 color; uniform vec3 cols[4]; uniform float ncol; uniform float split; uniform float opacity; uniform float time; uniform float fill; uniform float flash; uniform float hitAge; uniform vec3 hitDir; varying vec3 vN; varying vec3 vV; varying vec3 vP;
  float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float hexD(vec2 p){ p=abs(p); return max(dot(p,vec2(0.5,0.8660254)),p.x); }
  float dot2(vec2 v){ return dot(v,v); }
  float h1(float n){ return fract(sin(n)*43758.5453); }
  float n3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); float k=dot(i,vec3(1.0,57.0,113.0));
    return mix(mix(mix(h1(k),h1(k+1.0),f.x),mix(h1(k+57.0),h1(k+58.0),f.x),f.y),mix(mix(h1(k+113.0),h1(k+114.0),f.x),mix(h1(k+170.0),h1(k+171.0),f.x),f.y),f.z); }
  float fbm3(vec3 p){ return n3(p)*0.55+n3(p*2.03+7.1)*0.28+n3(p*4.1+3.3)*0.17; }
  mat2 rot2(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
  float hexLine(vec2 uv){ vec2 r=vec2(1.0,1.7320508); vec2 h=r*0.5; vec2 a=mod(uv,r)-h; vec2 b=mod(uv-h,r)-h; vec2 gv=dot(a,a)<dot(b,b)?a:b; return smoothstep(0.41,0.49,hexD(gv)); }
  vec3 fireRamp(float x){ x=clamp(x,0.0,1.0); return mix(mix(vec3(0.25,0.02,0.0),vec3(1.0,0.32,0.02),smoothstep(0.0,0.45,x)),mix(vec3(1.0,0.75,0.15),vec3(1.0,1.0,0.85),smoothstep(0.8,1.0,x)),smoothstep(0.45,0.8,x)); }
  float heartD(vec2 p){ p.x=abs(p.x); if(p.y+p.x>1.0) return sqrt(dot2(p-vec2(0.25,0.75)))-0.35355; return sqrt(min(dot2(p-vec2(0.0,1.0)),dot2(p-0.5*max(p.x+p.y,0.0))))*sign(p.x-p.y); }
  void main(){ vec3 n=normalize(vP); float fr=pow(1.0-abs(dot(normalize(vN),normalize(vV))),2.2);
    vec2 uv=vec2(atan(n.z,n.x)*2.864789, asin(clamp(n.y,-1.0,1.0))*5.0);
    vec2 r=vec2(1.0,1.7320508); vec2 h=r*0.5; vec2 a=mod(uv,r)-h; vec2 b=mod(uv-h,r)-h; vec2 gv=dot(a,a)<dot(b,b)?a:b; vec2 id=uv-gv;
    float d=hexD(gv); float line=smoothstep(0.41,0.49,d);
    vec2 qid=floor(id*2.0+0.5); float fi=floor(hash(qid*1.31+7.7)*ncol*0.999); vec3 cc=cols[0]; if(fi>0.5) cc=cols[1]; if(fi>1.5) cc=cols[2]; if(fi>2.5) cc=cols[3]; float mixF=ncol>1.5?0.3*(1.0-line):0.0;
    float cell=smoothstep(0.84,1.0,hash(id+floor(time*5.0)))*(1.0-line);
    float sweep=pow(max(0.0,sin((n.x*0.7+n.y*1.6+n.z*0.4)*3.0-time*3.2)),24.0);
    float glint=pow(max(dot(n,normalize(vec3(-0.45,0.75,-0.35))),0.0),40.0);
    float base=smoothstep(0.14,0.0,n.y);
    float ang=acos(clamp(dot(n,hitDir),-1.0,1.0)); float rip=(1.0-smoothstep(0.0,0.16,abs(ang-hitAge*3.4)))*max(0.0,1.0-hitAge*2.0);
    float al=opacity*(fill+mixF+fr*0.85+line*0.42+cell*0.35+sweep*0.3+glint*0.7+base*0.6+rip*0.95)+flash*0.38*opacity;
    vec3 c=mix(cc,vec3(1.0),clamp(fr*0.5+line*0.3+cell*0.5+sweep*0.5+glint+base*0.4+rip+flash*0.7,0.0,1.0)*(ncol>1.5?0.6:1.0));
    // ---- dome styles (cosmetic) ----

#if SKIN>0
    { vec3 Rv=reflect(-normalize(vV),normalize(vN)); float cellH=hash(id*3.17+1.3);

#if SKIN==1
      { // CRYSTAL: prismatic facets, rainbow edges, sparkles
        vec3 irid=0.55+0.45*cos(6.2831*(fr*1.2+cellH*0.45+n.y*0.3+time*0.06+vec3(0.0,0.33,0.67)));
        float spark=pow(hash(id+floor(time*4.0+cellH*7.0)),24.0)*(1.0-line);
        float facet=0.25+0.75*pow(abs(dot(normalize(vN),normalize(vec3(cellH-0.5,0.6,0.4)))),6.0);
        c=mix(mix(irid,tint,0.25)*(0.55+facet*0.6),vec3(1.0),clamp(line*0.75+glint+spark*2.0+sweep*0.5+rip,0.0,1.0));
        al=opacity*(0.06+facet*0.16+fr*0.95+line*0.55+spark*1.6+glint+sweep*0.35+base*0.5+rip)+flash*0.4*opacity; }

#elif SKIN==2
      { // NEO: synthwave grid that scrolls up the dome
        vec2 q=vec2(atan(n.z,n.x)*3.8197,n.y*7.0-time*0.8); vec2 gq=abs(fract(q)-0.5); float gl=1.0-smoothstep(0.0,0.07,0.5-max(gq.x,gq.y));
        vec3 hot=vec3(1.0,0.16,0.62); vec3 cc2=mix(tint,hot,smoothstep(0.0,1.0,n.y)); float scan=0.5+0.5*sin(n.y*60.0-time*6.0);
        c=mix(cc2*0.35,cc2,gl)+vec3(1.0)*(gl*0.35+rip+sweep*0.3);
        al=opacity*(0.05+scan*0.04+gl*0.9+fr*0.75+base*0.9+rip+sweep*0.3)+flash*0.4*opacity; }

#elif SKIN==3
      { // CHROME: liquid mirror metal
        float y=Rv.y; vec3 sky=mix(vec3(0.93,0.96,1.0),vec3(0.38,0.55,0.86),clamp(y*1.4,0.0,1.0)); vec3 grd=mix(vec3(0.32,0.28,0.25),vec3(0.06,0.06,0.07),clamp(-y*2.5,0.0,1.0));
        vec3 env=y>0.0?sky:grd; env=mix(env,vec3(1.0,0.97,0.9),(1.0-smoothstep(0.0,0.07,abs(y)))*0.9);
        float wob=sin(n.x*9.0+time*1.3)*sin(n.z*7.0-time*1.1)*0.5+0.5;
        c=env*mix(vec3(1.0),tint,0.35)*(0.85+wob*0.25)+vec3(1.0)*(glint*1.6+sweep*0.7+rip); c=mix(c,vec3(1.0),line*0.12);
        al=opacity*(0.34+fr*0.55+line*0.08+glint+rip)+flash*0.3*opacity; }

#elif SKIN==4
      { // HEART: little beating hearts in every cell
        float beat=1.0+0.14*pow(max(0.0,sin(time*5.0+cellH*6.28)),6.0); vec2 hp=vec2(gv.x,gv.y)*1.75/beat+vec2(0.0,0.52);
        float hd=heartD(hp); float fillH=1.0-smoothstep(-0.02,0.02,hd); float rim=1.0-smoothstep(0.0,0.06,abs(hd));
        vec3 pink=tint, deep=tint*vec3(0.55,0.35,0.6);
        c=mix(mix(deep,pink,0.4),mix(pink,vec3(1.0),0.35),fillH); c=mix(c,vec3(1.0),rim*0.8+glint+rip+sweep*0.3);
        al=opacity*(0.05+fillH*0.42+rim*0.6+fr*0.7+base*0.6+glint+rip+sweep*0.25)+flash*0.4*opacity; }

#elif SKIN==5
      { // NOIR: black smoked glass with a fine accent edge
        c=mix(vec3(0.015,0.015,0.025),tint,clamp(line*0.85+fr*0.25+base*0.5,0.0,1.0)); c+=vec3(1.0)*(glint*0.9+sweep*0.18+rip);
        float smoke=hash(floor(uv*3.0)+floor(time*0.5))*0.05;
        al=opacity*(0.4+smoke+fr*0.5+line*0.45+base*0.6+glint+rip)+flash*0.3*opacity; }

#elif SKIN==6
      { // BLOODLEAF: overlapping dark leaves with glowing veins on black
        vec2 lu=vec2(uv.x,uv.y*1.15); float leaf=0.0, vein=0.0, edgeL=0.0, shade=0.0; vec2 cid=floor(lu/1.5);
        for(int i=-1;i<=1;i++) for(int j=-1;j<=1;j++){ vec2 cc0=cid+vec2(float(i),float(j)); vec2 hw=vec2(mod(cc0.x,12.0),cc0.y); vec2 hc=vec2(hash(hw),hash(hw+4.7));
          vec2 ctr=(cc0+0.25+hc*0.5)*1.5; vec2 p=(lu-ctr)*rot2(hc.x*6.28+sin(time*0.6+hc.y*6.0)*0.08); p/=1.05+hc.y*0.35;
          float L=0.95, xx=p.x/L; float w=0.36*max(0.0,1.0-xx*xx)*(1.0-0.25*xx); float inl=step(abs(xx),1.0)*(1.0-smoothstep(w-0.03,w,abs(p.y)));
          if(inl>leaf){ leaf=inl; float mid=1.0-smoothstep(0.0,0.025,abs(p.y)); float side=1.0-smoothstep(0.0,0.06,abs(fract((p.x-abs(p.y)*1.3)*4.2)-0.5)*2.0*0.5);
            vein=max(mid,side*smoothstep(0.02,0.06,abs(p.y)))*inl; edgeL=(1.0-smoothstep(0.0,0.035,abs(abs(p.y)-w)))*step(abs(xx),1.0); shade=0.5+0.5*p.y/(w+0.001); } }
        float pulse=0.55+0.45*sin(time*2.4-uv.y*1.2+uv.x*0.4);
        vec3 dark=vec3(0.03,0.0,0.01), body=mix(tint*0.32,tint*0.62,shade);
        c=mix(dark,body,leaf); c=mix(c,tint*1.6+vec3(0.25,0.0,0.0),vein*pulse); c=mix(c,vec3(0.0),edgeL*0.7); c+=vec3(1.0)*(glint*0.8+rip+sweep*0.2);
        al=opacity*(0.22+leaf*0.34+vein*0.4*pulse+fr*0.6+base*0.7+glint+rip)+flash*0.35*opacity; }

#elif SKIN==7
      { // ABYSS: deep sea, rising bokeh and glowing jellyfish
        vec3 deep=mix(vec3(0.0,0.02,0.06),vec3(0.0,0.08,0.16),n.y); float glow=0.0;
        vec2 bu=vec2(uv.x,uv.y-time*0.22); vec2 bid=floor(bu/0.9); vec2 bf=fract(bu/0.9)-0.5; bid.x=mod(bid.x,20.0); float bh=hash(bid+2.3); vec2 bo=vec2(hash(bid+5.1),hash(bid+8.9))-0.5;
        float br=0.06+0.16*bh*bh; float bok=(1.0-smoothstep(br*0.6,br,length(bf-bo*0.6)))*(0.35+0.65*(0.5+0.5*sin(time*2.0+bh*30.0)));
        vec2 ju=vec2(uv.x,uv.y-time*0.3); vec2 jid=floor(ju/3.0); vec2 jf=(fract(ju/3.0)-0.5)*3.0; jid.x=mod(jid.x,6.0); float jh=hash(jid+11.1); float jel=0.0;
        if(jh>0.35){ vec2 p=jf-vec2((hash(jid+3.3)-0.5)*1.2,0.2); float sq=1.0+0.12*sin(time*3.0+jh*20.0); p.x*=sq; p/=0.62+jh*0.3;
          float bell=(1.0-smoothstep(0.0,0.07,abs(length(p*vec2(1.0,1.25))-0.5)))*step(-0.02,p.y); float inner=(1.0-smoothstep(0.42,0.5,length(p*vec2(1.0,1.25))))*step(0.0,p.y)*0.35;
          float ten=0.0; for(int k=0;k<4;k++){ float tx=-0.3+float(k)*0.2+sin(p.y*9.0+time*3.0+float(k))*0.05*(-p.y); ten=max(ten,(1.0-smoothstep(0.0,0.03,abs(p.x-tx)))*step(p.y,0.0)*step(-1.1,p.y)*(1.0+p.y/1.1)); }
          jel=max(max(bell,inner),ten); }
        vec3 cyan=mix(vec3(0.45,0.95,1.0),tint,0.5);
        c=deep+cyan*(bok*0.9+jel*1.2)+vec3(1.0)*(glint*0.7+rip+sweep*0.25); c=mix(c,cyan,line*0.12);
        al=opacity*(0.42+bok*0.5+jel*0.6+fr*0.55+line*0.06+base*0.6+glint+rip)+flash*0.35*opacity; }

#elif SKIN==8
      { // TOPO: flowing contour map
        float h=fbm3(n*2.3+vec3(0.0,time*0.06,time*0.03)); float f=fract(h*16.0); float ln=1.0-smoothstep(0.0,0.09,min(f,1.0-f));
        float f5=fract(h*16.0/5.0); float idx=1.0-smoothstep(0.0,0.035,min(f5,1.0-f5));
        vec3 warm=mix(tint*vec3(1.05,0.78,0.45),tint,smoothstep(0.3,0.75,h)); vec3 ink=tint*vec3(0.28,0.16,0.06);
        c=mix(warm,ink,max(ln*0.85,idx)); c+=vec3(1.0)*(glint*0.8+rip+sweep*0.3);
        al=opacity*(0.3+ln*0.45+idx*0.5+fr*0.6+base*0.6+glint+rip)+flash*0.35*opacity; }

#elif SKIN==9
      { // CARBON: woven carbon fibre under a glossy clear coat, accent rim
        vec2 q=uv*2.0; vec2 ci=floor(q), cf=fract(q); float ck=mod(ci.x+ci.y,2.0);
        float fib=ck>0.5? 0.5+0.5*cos((cf.y-0.5)*3.1416)*(0.75+0.25*sin(cf.x*40.0)) : 0.5+0.5*cos((cf.x-0.5)*3.1416)*(0.75+0.25*sin(cf.y*40.0));
        vec3 cb=vec3(0.035)+vec3(0.13)*fib*fib; float y=Rv.y; float coat=pow(max(0.0,1.0-abs(y-0.25)*2.2),6.0)*0.55+pow(max(0.0,y),3.0)*0.25;
        c=cb+vec3(coat)+tint*(fr*0.6+base*0.9+line*0.04)+vec3(1.0)*(glint*1.3+sweep*0.35+rip);
        al=opacity*(0.5+fr*0.4+base*0.6+coat*0.4+glint+rip)+flash*0.3*opacity; }

#elif SKIN==10
      { // GLITCH: RGB-split grid that tears and corrupts
        float tq=floor(time*9.0); float band=floor(uv.y*3.2+hash(vec2(tq,3.0))*2.0); float burst=step(0.82,hash(vec2(band,tq)));
        float sh=0.06+burst*(0.25+0.35*hash(vec2(band+1.0,tq))); vec2 gu=uv+vec2(burst*(hash(vec2(band,tq+7.0))-0.5)*1.4,0.0);
        vec3 rgb=vec3(hexLine(gu+vec2(sh,0.0)),hexLine(gu),hexLine(gu-vec2(sh,0.0)));
        float blk=step(0.93,hash(floor(uv*vec2(1.5,3.0))+tq))*step(0.5,hash(vec2(tq,9.0)));
        float scan=0.75+0.25*sin(uv.y*90.0+time*30.0);
        c=(rgb*vec3(1.0,0.25,0.75)+rgb.g*tint*0.9)*scan+mix(tint,vec3(1.0,0.0,0.55),hash(floor(uv*2.0)+tq))*blk+vec3(1.0)*(glint*0.6+rip);
        al=opacity*(0.12+max(max(rgb.r,rgb.g),rgb.b)*0.75+blk*0.55+fr*0.6+base*0.7+glint+rip)+flash*0.35*opacity; }

#elif SKIN==11
      { // INFERNO: flames licking up the dome, embers rising
        float fl=fbm3(vec3(n.x*2.6,n.y*1.6-time*1.15,n.z*2.6))*1.25+fbm3(vec3(n.x*5.0,n.y*3.0-time*2.1,n.z*5.0))*0.35; float heat=clamp(fl-n.y*1.05+0.15,0.0,1.0);
        vec2 eu=vec2(uv.x,uv.y-time*0.9); vec2 eid=floor(eu/0.5); eid.x=mod(eid.x,36.0); float eh=hash(eid); vec2 ef=fract(eu/0.5)-0.5-(vec2(hash(eid+1.7),hash(eid+2.9))-0.5)*0.6;
        float emb=step(0.82,eh)*(1.0-smoothstep(0.02,0.07,length(ef)))*(0.5+0.5*sin(time*9.0+eh*40.0));
        vec3 fc=fireRamp(heat*1.15)*mix(vec3(1.0),tint*1.3,0.25);
        c=mix(vec3(0.05,0.01,0.0),fc,smoothstep(0.08,0.35,heat))+vec3(1.0,0.75,0.3)*emb+vec3(1.0)*(glint*0.6+rip);
        al=opacity*(0.08+smoothstep(0.1,0.6,heat)*0.68+emb+fr*0.45+base*0.8+glint+rip)+flash*0.35*opacity; }

#elif SKIN==12
      { // GALAXY: deep space, swirling nebula and stars
        float sw=time*0.05+n.y*1.6; vec3 sp=vec3(n.x*cos(sw)-n.z*sin(sw),n.y,n.x*sin(sw)+n.z*cos(sw));
        float neb=fbm3(sp*2.4+vec3(0.0,0.0,time*0.02)); float neb2=fbm3(sp*4.5+3.0);
        vec3 nc=mix(tint,vec3(0.15,0.6,1.0),smoothstep(0.35,0.7,neb2)); nc=mix(nc,vec3(1.0,0.25,0.65),smoothstep(0.6,0.85,neb)*0.6);
        vec2 su=uv/0.3; vec2 sid=floor(su); sid.x=mod(sid.x,60.0); vec2 sf=fract(su)-0.5-(vec2(hash(sid+0.3),hash(sid+0.9))-0.5)*0.7; float sh2=hash(sid+5.5);
        float star=step(0.86,sh2)*(1.0-smoothstep(0.0,0.06+0.05*sh2,length(sf)))*(0.6+0.4*sin(time*4.0+sh2*60.0));
        float cloud=smoothstep(0.42,0.8,neb);
        c=vec3(0.01,0.0,0.035)+nc*cloud*1.2+vec3(1.0)*(star*1.4+glint*0.8+rip); c+=tint*fr*0.5;
        al=opacity*(0.4+cloud*0.45+star+fr*0.6+base*0.6+glint+rip)+flash*0.35*opacity; }

#elif SKIN==13
      { // CIRCUIT: connected board traces, pads, data pulses racing along them
        vec2 q=uv*1.5; vec2 ci=floor(q), f=fract(q);
        float eB=step(0.45,hash(vec2(mod(ci.x,27.0),ci.y)+0.17)), eT=step(0.45,hash(vec2(mod(ci.x,27.0),ci.y+1.0)+0.17));
        float eL=step(0.55,hash(vec2(mod(ci.x,27.0),ci.y)+0.71)), eR=step(0.55,hash(vec2(mod(ci.x+1.0,27.0),ci.y)+0.71));
        float tw=0.045; float tH=max(eB*(1.0-smoothstep(tw,tw+0.03,f.y)),eT*(1.0-smoothstep(tw,tw+0.03,1.0-f.y))); float tV=max(eL*(1.0-smoothstep(tw,tw+0.03,f.x)),eR*(1.0-smoothstep(tw,tw+0.03,1.0-f.x)));
        float tr=max(tH,tV); vec2 cn=floor(f+0.5); vec2 cid2=vec2(mod(ci.x+cn.x,27.0),ci.y+cn.y); float dc=length(f-cn);
        float pad=step(0.68,hash(cid2+9.1))*(1.0-smoothstep(0.0,0.035,abs(dc-0.13))); float via=step(0.68,hash(cid2+9.1))*(1.0-smoothstep(0.05,0.08,dc));
        float rowH=hash(vec2(ci.y+(f.y>0.5?1.0:0.0),4.4)), colH=hash(vec2(mod(ci.x+(f.x>0.5?1.0:0.0),27.0),8.8));
        float fpH=fract(q.x*0.22-time*(0.5+rowH*0.6)+rowH); float pH=tH*smoothstep(0.0,0.015,fpH)*(1.0-smoothstep(0.03,0.11,fpH));
        float fpV=fract(q.y*0.22-time*(0.4+colH*0.5)+colH); float pV=tV*smoothstep(0.0,0.015,fpV)*(1.0-smoothstep(0.03,0.11,fpV));
        float pulse=max(pH,pV); float chip=step(0.93,hash(floor(uv*0.75)+2.2))*(1.0-smoothstep(0.32,0.36,max(abs(fract(uv.x*0.75)-0.5),abs(fract(uv.y*0.75)-0.5))));
        c=vec3(0.0,0.035,0.03)+tint*(tr*0.55+pad*0.9+via*0.7)+vec3(0.06,0.07,0.08)*chip+mix(tint,vec3(1.0),0.55)*pulse*1.5+vec3(1.0)*(glint*0.7+rip);
        al=opacity*(0.26+tr*0.42+pad*0.6+via*0.5+chip*0.3+pulse+fr*0.6+base*0.7+glint+rip)+flash*0.35*opacity; }

#elif SKIN==15
      { // KINTSUGI: dark glazed ceramic, cracks mended with real gold
        vec2 wu=uv/1.8+vec2(n3(n*2.2+1.3),n3(n*2.2+7.9))*0.55; vec2 vi=floor(wu), vf=fract(wu); float F1=8.0, F2=8.0;
        for(int i=-1;i<=1;i++) for(int j=-1;j<=1;j++){ vec2 g=vec2(float(i),float(j)); vec2 hw=vec2(mod(vi.x+g.x,10.0),vi.y+g.y); vec2 o=vec2(hash(hw+0.4),hash(hw+2.8)); float d=length(g+o-vf); if(d<F1){ F2=F1; F1=d; } else if(d<F2) F2=d; }
        float e=F2-F1; float wob=n3(n*9.0+4.4); float seam=1.0-smoothstep(0.0,0.03+0.035*wob,e);
        vec2 hu=uv/0.9+vec2(n3(n*4.0+2.0),n3(n*4.0+6.0))*0.7; vec2 hi=floor(hu), hf=fract(hu); float G1=8.0, G2=8.0;
        for(int i=-1;i<=1;i++) for(int j=-1;j<=1;j++){ vec2 g=vec2(float(i),float(j)); vec2 hw=vec2(mod(hi.x+g.x,20.0),hi.y+g.y); vec2 o=vec2(hash(hw+5.4),hash(hw+1.8)); float d=length(g+o-hf); if(d<G1){ G2=G1; G1=d; } else if(d<G2) G2=d; }
        float hair=(1.0-smoothstep(0.0,0.025,G2-G1))*smoothstep(0.55,0.68,n3(n*3.0+5.5));
        float gold=max(seam,hair*0.85);
        float y=Rv.y; float glaze=pow(max(0.0,1.0-abs(y-0.35)*2.4),10.0)*0.6+pow(max(0.0,1.0-abs(y+0.05)*5.0),6.0)*0.12;
        vec3 clay=mix(vec3(0.035,0.04,0.055),vec3(0.07,0.06,0.08),n3(n*5.0+3.0));
        float shimmer=0.75+0.25*sin(time*2.0+uv.x*2.5+uv.y*1.7); vec3 au=tint*(0.75+0.5*pow(max(0.0,y),1.5))*shimmer+vec3(1.0,0.95,0.8)*pow(max(0.0,y),12.0)*0.8;
        c=mix(clay+vec3(glaze),au,gold)+vec3(1.0)*(glint*1.1+rip+sweep*0.15*gold);
        al=opacity*(0.5+glaze*0.35+gold*0.5+fr*0.4+base*0.6+glint+rip)+flash*0.3*opacity; }

#elif SKIN==14
      { // OBSIDIAN: black volcanic glass, molten cracks breathing underneath
        vec2 vu=uv/1.2; vec2 vi=floor(vu), vf=fract(vu); float F1=8.0, F2=8.0;
        for(int i=-1;i<=1;i++) for(int j=-1;j<=1;j++){ vec2 g=vec2(float(i),float(j)); vec2 hw=vec2(mod(vi.x+g.x,15.0),vi.y+g.y); vec2 o=vec2(hash(hw),hash(hw+6.3)); o=0.5+0.4*sin(time*0.25+6.28*o); float d=length(g+o-vf); if(d<F1){ F2=F1; F1=d; } else if(d<F2) F2=d; }
        float crack=1.0-smoothstep(0.0,0.07,F2-F1); float glow=1.0-smoothstep(0.0,0.22,F2-F1); float breathe=0.65+0.35*sin(time*1.6+F1*4.0);
        float y=Rv.y; float gloss=pow(max(0.0,1.0-abs(y-0.3)*2.5),8.0)*0.45;
        c=vec3(0.02,0.015,0.02)+vec3(gloss)+tint*(glow*0.35*breathe)+mix(tint,vec3(1.0,0.85,0.4),0.45)*crack*breathe*1.3+vec3(1.0)*(glint*1.1+rip);
        al=opacity*(0.42+gloss*0.4+glow*0.2+crack*0.6+fr*0.45+base*0.7+glint+rip)+flash*0.3*opacity; }
#endif
    }
#endif
    if(split>0.001){ float lim=0.46-0.2*split; float keep=1.0-smoothstep(lim-0.03,lim,d); float edge=smoothstep(lim-0.13,lim-0.03,d)*keep; al=opacity*keep*(0.42+edge*0.55+fr*0.2); c=mix(cc,vec3(1.0),edge*0.55); }
    gl_FragColor=vec4(c,clamp(al,0.0,1.0)); }`;
const domeGeo=new T.SphereGeometry(1,48,20,0,Math.PI*2,0,Math.PI/2);
function domeMat(color,fill){ return new T.ShaderMaterial({defines:{SKIN:0},uniforms:{skin:{value:0},tint:{value:new T.Color(0xffffff)},color:{value:new T.Color(color)},cols:{value:[new T.Color(color),new T.Color(color),new T.Color(color),new T.Color(color)]},ncol:{value:1},split:{value:0},opacity:{value:1},time:{value:0},fill:{value:fill},flash:{value:0},hitAge:{value:9},hitDir:{value:V3(0,1,0)}},vertexShader:DOME_VS,fragmentShader:DOME_FS,transparent:true,side:T.DoubleSide,depthWrite:false}); }
function setPal(mat,list){ const u=mat.uniforms, n=Math.min(4,list.length); for(let i=0;i<4;i++) u.cols.value[i].copy(list[i%n]); u.ncol.value=n; }
// dome styles you can pick in the Dome Studio (purely cosmetic: hit boxes and ability colours on the floor ring stay the same)
const DOME_SKINS=[{id:'default',name:'Default',tint:null,blurb:'Your team colour, plus your dome cards'},{id:'crystal',name:'Crystal',tint:'#bfe9ff',blurb:'Prism facets that throw rainbows'},{id:'neo',name:'Neo',tint:'#35e9ff',blurb:'Synthwave grid, always moving'},{id:'chrome',name:'Chrome',tint:'#ffffff',blurb:'Liquid mirror metal'},{id:'heart',name:'Heart',tint:'#ff4f9a',blurb:'A dome full of beating hearts'},{id:'noir',name:'Noir',tint:'#ffd27a',blurb:'Black smoked glass, gold edge'},{id:'bloodleaf',name:'Bloodleaf',tint:'#ff1f3d',blurb:'Dark leaves with veins that pulse red'},{id:'abyss',name:'Abyss',tint:'#4ff0ff',blurb:'Deep sea. Jellyfish drift past'},{id:'topo',name:'Topo',tint:'#ffb43a',blurb:'A living contour map that flows'},
  {id:'carbon',name:'Carbon',tint:'#ff2a2a',blurb:'Woven carbon fibre, glossy clear coat'},{id:'glitch',name:'Glitch',tint:'#00ffd0',blurb:'Corrupted signal. Tears and RGB split'},{id:'inferno',name:'Inferno',tint:'#ff6a1a',blurb:'Flames climb the dome, embers fly'},
  {id:'galaxy',name:'Galaxy',tint:'#9a6bff',blurb:'A slowly turning nebula full of stars'},{id:'circuit',name:'Circuit',tint:'#35ff9a',blurb:'Live circuit board, data racing through'},{id:'obsidian',name:'Obsidian',tint:'#ff4a10',blurb:'Black volcanic glass, molten cracks'},{id:'kintsugi',name:'Kintsugi',tint:'#e8b85a',blurb:'Broken, mended with gold. Stronger for it'}];
const DOME_ORDER=[0,3,5,9,14,15,1,2,10,13,11,12,7,6,8,4]; // how they're laid out in the studio (ids stay fixed for saves + online)
const skinTint=(k,c)=>{ const d=DOME_SKINS[k]; return new T.Color(c&&/^#[0-9a-f]{6}$/i.test(c)?c:(d&&d.tint)||'#ffffff'); };
const SAW_PAL=[new T.Color(0xff6b6b)], AURA_PAL={chill:new T.Color(0x9fd8ff),staticf:new T.Color(0xffe066),drain:new T.Color(0xff6b9d)};
const ringGeo=new T.RingGeometry(0.9,1,56);
const discGeo=new T.CircleGeometry(1,48);
const AURA_COL={chill:0x9fd8ff,staticf:0xffe066,drain:0xff6b9d};

// ================= FIGHTER (round buddy) =================
class Fighter{
  constructor(name,isPlayer,team){
    this.name=name; this.isPlayer=isPlayer; this.team=team||(isPlayer?TEAM.player:TEAM.bot); this.color=this.team.ink; this.id=Fighter.N=(Fighter.N||0)+1; this.ctl=isPlayer?'local':'ai'; this.score=0; this.slot=isPlayer?0:1; this.side=this.id; this.spawn=V3(); this.lastHitBy=null;
    this.pos=V3(); this.vel=V3(); this.yaw=0; this.pitch=0; this.onGround=false; this.wasGround=false;
    this.radius=0.5; this.height=2.05; this.bodyY=1.3; this.hitR=0.58;
    this.cards=[]; this.stats=computeStats([]);
    this.dashDir=V3(); this.auraSlow=0; this.walkT=0; this.squash=0; this.blinkT=rand(1,4); this.recoil=0; this.idleT=rand(0,5);
    this.domeHitDir=V3(0,1,0); this.domeHitAge=9; this.domePal=[new T.Color(this.team.light)]; this.cardPal=[]; this.skin=0; this.skinCol=''; this.skinTint=new T.Color(0xffffff); this.domePreview=false;
    this.buildMesh(); this.resetRound();
  }
  buildMesh(){
    const tc=this.team;
    const root=new T.Group(); this.mesh=root; scene.add(root);
    const std=(c,r=0.45,m=0.3)=>new T.MeshStandardMaterial({color:col(c),roughness:r,metalness:m});
    const armour=std(tc.body,0.38,0.35), armour2=std(tc.dark,0.45,0.4), suit=std(0x151a2e,0.85,0.1), trim=basic({color:tc.light}), visorMat=std(0x070a16,0.12,0.85), white=std(0xe9eef8,0.5,0.2);
    this.armour=armour; this.armour2=armour2; this.body={material:armour}; this.mTrim=trim;
    const add=(parent,geo,mat,x=0,y=0,z=0)=>{ const m=new T.Mesh(geo,mat); m.position.set(x,y,z); m.castShadow=true; parent.add(m); return m; };
    // ---- simple round buddy: big ball head with a headband, bean body, stubby limbs ----
    const HIP=0.78; this.hipY=HIP; this.L1=0.34; this.L2=0.34; this.gait=0;
    const soft=(c,r=0.6)=>new T.MeshStandardMaterial({color:c,roughness:r,metalness:0.02});
    armour.roughness=0.55; armour.metalness=0.04; armour2.roughness=0.6; armour2.metalness=0.04;
    const headMat=soft(col(tc.body).lerp(col(0xffffff),0.15),0.55), band=soft(col(tc.band),0.7), dark=basic({color:0x0b1026});
    this.headMat=headMat; this.mBand=band;
    const rig=new T.Group(); rig.position.y=HIP; root.add(rig); this.rig=rig;
    const torso=add(rig,new T.SphereGeometry(0.36,32,24),armour,0,0.36,0); torso.scale.set(1,1.12,0.88);
    const shorts=add(rig,new T.SphereGeometry(0.366,32,12,0,Math.PI*2,Math.PI*0.64,Math.PI*0.36),suit,0,0.36,0); shorts.scale.set(1.02,1.12,0.9);
    const belt=add(rig,new T.TorusGeometry(0.335,0.024,8,36),trim,0,0.185,0); belt.rotation.x=Math.PI/2; belt.scale.set(1,0.88,1); belt.castShadow=false;
    const chest=add(rig,new T.TorusGeometry(0.095,0.03,10,28),trim,0,0.52,-0.298); chest.castShadow=false; this.chest=chest;
    // jetpack: two tanks with nozzles; the flames fire on a dash or a jump
    const jp=new T.Group(); jp.position.set(0,0.44,0.3); rig.add(jp); const metal=new T.MeshStandardMaterial({color:col(0xcfd6e6),roughness:0.35,metalness:0.6});
    add(jp,new T.BoxGeometry(0.2,0.24,0.1),suit,0,0.02,-0.03); add(jp,new T.BoxGeometry(0.06,0.16,0.03),trim,0,0.03,0.075).castShadow=false;
    const flGeo=new T.ConeGeometry(0.07,0.5,14,1,true); flGeo.rotateX(Math.PI); flGeo.translate(0,-0.25,0); const flGeo2=new T.ConeGeometry(0.038,0.34,10,1,true); flGeo2.rotateX(Math.PI); flGeo2.translate(0,-0.17,0);
    this.jetOuter=new T.MeshBasicMaterial({color:col(0xff8a2c),transparent:true,opacity:0.85,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide}); this.jetInner=new T.MeshBasicMaterial({color:col(0xfff4c2),transparent:true,opacity:0.95,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide});
    this.jets=[]; this.jetK=0;
    for(const sx of [-1,1]){ add(jp,new T.CylinderGeometry(0.095,0.095,0.26,16),armour2,sx*0.115,0.02,0.02); add(jp,new T.SphereGeometry(0.095,16,10),armour,sx*0.115,0.15,0.02); add(jp,new T.CylinderGeometry(0.06,0.085,0.09,14),metal,sx*0.115,-0.15,0.02);
      const fg=new T.Group(); fg.position.set(sx*0.115,-0.19,0.02); jp.add(fg); const f1=new T.Mesh(flGeo,this.jetOuter), f2=new T.Mesh(flGeo2,this.jetInner); fg.add(f1); fg.add(f2); const gl=sprite(0xff9a3d,0.5,0); gl.position.y=-0.08; fg.add(gl); fg.visible=false; this.jets.push({g:fg,gl}); }
    // head: the round face
    const head=new T.Group(); head.position.set(0,0.96,0); rig.add(head); this.head=head;
    add(head,new T.SphereGeometry(0.4,36,28),headMat).scale.set(1,0.96,1);
    const hb=add(head,new T.TorusGeometry(0.378,0.05,10,44),band,0,0.13,0); hb.rotation.x=Math.PI/2;
    add(head,new T.SphereGeometry(0.075,12,10),band,0,0.13,0.41);
    this.eyes=[]; this.eyeMat=basic({color:0xffffff});
    for(const sx of [-1,1]){ const e=new T.Mesh(new T.SphereGeometry(0.1,18,14),this.eyeMat); e.scale.set(1,1.25,0.35); e.position.set(sx*0.155,-0.03,-0.362); e.rotation.y=-sx*0.39; head.add(e);
      const pu=new T.Mesh(new T.SphereGeometry(0.052,14,10),dark); pu.position.set(-sx*0.012,-0.008,-0.07); e.add(pu); const hl=new T.Mesh(new T.SphereGeometry(0.018,8,6),basic({color:0xffffff})); hl.position.set(0.02,0.03,-0.115); e.add(hl); this.eyes.push(e); }
    const mouth=add(head,new T.TorusGeometry(0.06,0.013,6,16,Math.PI),dark,0,-0.17,-0.362); mouth.rotation.z=Math.PI; mouth.rotation.x=0.42; mouth.castShadow=false;
    this.tails=[]; for(const sx of [-1,1]){ const piv=new T.Group(); piv.position.set(sx*0.04,0.13,0.43); const tl=add(piv,new T.BoxGeometry(0.1,0.02,0.4),band,0,0,0.2); piv.rotation.y=sx*0.3; head.add(piv); this.tails.push(piv); }
    // arms: left has a mitten, right carries the blaster
    const cuff=soft(col(tc.light),0.6), sole=soft(col(0xf2f5fb),0.7); this.mCuff=cuff;
    for(const sx of [-1,1]) add(rig,new T.SphereGeometry(0.115,18,14),armour,sx*0.37,0.6,0);
    const lsh=new T.Group(); lsh.position.set(-0.38,0.6,0); rig.add(lsh); this.lArm=lsh;
    add(lsh,new T.CylinderGeometry(0.1,0.085,0.26,16),armour,0,-0.13,0);
    const lc=add(lsh,new T.TorusGeometry(0.086,0.02,8,20),cuff,0,-0.235,0); lc.rotation.x=Math.PI/2;
    const lel=new T.Group(); lel.position.y=-0.26; lsh.add(lel); this.lElbow=lel; add(lel,new T.SphereGeometry(0.082,14,10),headMat);
    add(lel,new T.CylinderGeometry(0.08,0.068,0.22,16),headMat,0,-0.11,0);
    const hand=new T.Group(); hand.position.y=-0.25; lel.add(hand); this.lHand=hand;
    add(hand,new T.CylinderGeometry(0.078,0.082,0.05,16),cuff,0,0.03,0); add(hand,new T.SphereGeometry(0.115,20,16),armour2,0,-0.07,0).scale.set(0.9,1.1,1.05); add(hand,new T.SphereGeometry(0.05,12,10),armour2,0.06,-0.04,-0.08).scale.set(1,1.3,1);
    const rUp=add(rig,new T.CylinderGeometry(0.09,0.085,0.2,14),armour,0.4,0.55,-0.02); rUp.rotation.z=0.5;
    const cg=new T.Group(); cg.position.set(0.44,0.5,-0.02); rig.add(cg); this.cannon=cg; add(cg,new T.SphereGeometry(0.12,14,10),armour2);
    const bg=new T.Group(); bg.rotation.x=-Math.PI/2; bg.scale.setScalar(0.62); cg.add(bg); this.barrel=bg;
    const cMat=soft(col(tc.cannon),0.45); this.mCannon=cMat;
    const prof=[[0.001,-0.14],[0.15,-0.11],[0.22,0.02],[0.27,0.22],[0.28,0.45],[0.26,0.66],[0.22,0.8],[0.24,0.86],[0.24,0.95],[0.16,0.95],[0.14,0.8]].map(p=>new T.Vector2(p[0],p[1]));
    add(bg,new T.LatheGeometry(prof,28),cMat);
    add(bg,new T.CylinderGeometry(0.288,0.284,0.1,28,1,true),soft(col(0xffd23f),0.5),0,0.45,0);
    const rim=add(bg,new T.TorusGeometry(0.235,0.04,10,28),soft(col(0xe6ecf7),0.4),0,0.95,0); rim.rotation.x=Math.PI/2;
    const core=add(bg,new T.CylinderGeometry(0.16,0.16,0.03,22),basic({color:tc.light}),0,0.88,0); core.castShadow=false; this.core=core;
    const mg2=sprite(tc.light,1.1,0); mg2.position.y=1.02; bg.add(mg2); this.muzzleGlow=mg2;
    const fl=new T.Sprite(new T.SpriteMaterial({map:TX.flash,color:col(tc.light),blending:T.AdditiveBlending,depthWrite:false,transparent:true,opacity:0})); fl.position.y=1.1; fl.scale.setScalar(1.6); bg.add(fl); this.flash=fl;
    const muzzle=new T.Object3D(); muzzle.position.y=1.02; bg.add(muzzle); this.muzzle=muzzle;
    // legs: hip → knee → shoe
    this.legs=[];
    for(const sx of [-1,1]){ const hip=new T.Group(); hip.position.set(sx*0.15,HIP,0); root.add(hip);
      add(hip,new T.SphereGeometry(0.125,16,12),suit); add(hip,new T.CylinderGeometry(0.125,0.105,0.26,16),suit,0,-0.13,0);
      const hc=add(hip,new T.TorusGeometry(0.106,0.018,8,20),trim,0,-0.255,0); hc.rotation.x=Math.PI/2; hc.castShadow=false;
      const knee=new T.Group(); knee.position.y=-0.34; hip.add(knee); add(knee,new T.SphereGeometry(0.095,14,12),headMat); add(hip,new T.CylinderGeometry(0.098,0.092,0.1,14),headMat,0,-0.3,0);
      add(knee,new T.CylinderGeometry(0.092,0.075,0.22,16),headMat,0,-0.11,0); add(knee,new T.CylinderGeometry(0.085,0.09,0.1,16),sole,0,-0.25,0);
      const boot=new T.Group(); boot.position.y=-0.34; knee.add(boot);
      add(boot,new T.SphereGeometry(0.15,20,16),armour2,0,0.02,-0.08).scale.set(0.92,0.66,1.5); add(boot,new T.SphereGeometry(0.11,16,12),armour2,0,0.03,0.04).scale.set(1,0.9,1);
      const so=add(boot,new T.CylinderGeometry(0.135,0.14,0.035,20),sole,0,-0.075,-0.08); so.scale.set(0.95,1,1.55); const tc2=add(boot,new T.SphereGeometry(0.09,14,10,0,Math.PI*2,0,Math.PI/2),cuff,0,0.03,-0.2); tc2.scale.set(1.1,0.6,0.9); tc2.castShadow=false;
      this.legs.push({hip,knee,boot,t:V3(0,-(HIP-0.1),0),pitch:0}); }
    // block dome: outer glass shell, inner shell, ground ring, saw teeth
    this.domeMat=domeMat(tc.light,0.1); const dome=new T.Mesh(domeGeo,this.domeMat); dome.visible=false; dome.renderOrder=6; scene.add(dome); this.dome=dome;
    this.domeMat2=domeMat(0xffffff,0.02); const dome2=new T.Mesh(domeGeo,this.domeMat2); dome2.visible=false; dome2.renderOrder=5; scene.add(dome2); this.dome2=dome2;
    const dr=new T.Mesh(ringGeo,new T.MeshBasicMaterial({color:col(tc.light),transparent:true,opacity:0.9,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending})); dr.rotation.x=-Math.PI/2; dr.visible=false; dr.renderOrder=5; scene.add(dr); this.domeRing=dr;
    const saw=new T.Group(); const toothGeo=new T.ConeGeometry(0.09,0.22,4); const toothMat=basic({color:0xff5252}); for(let i=0;i<22;i++){ const a=i/22*Math.PI*2; const tt=new T.Mesh(toothGeo,toothMat); tt.position.set(Math.cos(a),0.06,Math.sin(a)); tt.rotation.z=-Math.PI/2; tt.rotation.y=-a; saw.add(tt); } saw.visible=false; scene.add(saw); this.sawRing=saw;
    this.auraMat=domeMat(0xb9a2ff,0.05); const aura=new T.Mesh(domeGeo,this.auraMat); aura.visible=false; aura.renderOrder=4; scene.add(aura); this.aura=aura;
    const ar=new T.Mesh(discGeo,new T.MeshBasicMaterial({map:TX.ring,color:col(0xc9b8ff),transparent:true,opacity:0.85,depthWrite:false,blending:T.AdditiveBlending,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3})); ar.rotation.x=-Math.PI/2; ar.visible=false; ar.renderOrder=3; scene.add(ar); this.auraRing=ar;
    const shd=new T.Mesh(new T.CircleGeometry(0.55,24),new T.MeshBasicMaterial({color:0x05070f,transparent:true,opacity:0.35,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2})); shd.rotation.x=-Math.PI/2; shd.renderOrder=2; scene.add(shd); this.shadow=shd;
    const st=new T.Mesh(new T.TorusGeometry(0.8,0.05,8,28),new T.MeshBasicMaterial({color:col(0x9be7ff),transparent:true,opacity:0.9})); st.rotation.x=Math.PI/2; st.visible=false; scene.add(st); this.statusRing=st;
    // a soft team-coloured marker so each fighter is easy to find
    const mk=new T.Mesh(ringGeo,new T.MeshBasicMaterial({color:col(tc.body),transparent:true,opacity:0.55,depthWrite:false,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2})); mk.rotation.x=-Math.PI/2; mk.scale.setScalar(0.75); scene.add(mk); this.marker=mk;
  }
  // repaint in another seat colour (FFA seats keep the same colour on every screen)
  setTeam(tc){ if(this.team===tc) return; this.team=tc; this.color=tc.ink; this.armour.color.copy(col(tc.body)); this.armour2.color.copy(col(tc.dark)); this.headMat.color.copy(col(tc.body).lerp(col(0xffffff),0.15)); this.mBand.color.copy(col(tc.band));
    this.mTrim.color.copy(col(tc.light)); this.mCuff.color.copy(col(tc.light)); this.mCannon.color.copy(col(tc.cannon)); this.muzzleGlow.material.color.copy(col(tc.light)); this.flash.material.color.copy(col(tc.light));
    this.domeRing.material.color.copy(col(tc.light)); this.marker.material.color.copy(col(tc.body)); this.setCards(this.cards.slice()); }
  setActive(on){ this.active=on; if(!on){ this.dead=true; this.mesh.visible=false; for(const k of ['dome','dome2','domeRing','sawRing','aura','auraRing','shadow','statusRing','marker']) if(this[k]) this[k].visible=false; if(this.ice) this.ice.g.visible=false; if(this.stars) this.stars.g.visible=false; } }
  resetRound(){
    this.hp=this.stats.hp; this.ammo=this.stats.ammo; this.reloading=false; this.reloadT=0; this.fireCd=0;
    this.blockCdT=0; this.blockActive=false; this.blockT=0; this.dashCdT=0; this.dashT=0;
    this.slowT=0; this.slowAmt=0; this.stunT=0; this.poisons=[]; this.dead=false; this.vel.set(0,0,0);
    this.burstQueue=0; this.burstT=0; this.echoT=-1; this.echoCount=0; this.mood='normal'; this.moodT=0; this.hitFlash=0; this.auraSlow=0; this.squash=0;
    this.brawlT=0; this.tasteT=0; this.refreshCd=0; this.silenceT=0; this.invulnT=0; this.sawT=0; this.decayPool=0; this.decayAcc=0; this.dazzleN=0; this.dazzleT=0; this.thrusters=[]; this.phoenixUsed=0; this.chasing=false; this.domeHitAge=9; this.respawnT=0; this.lastHitBy=null; this.tetherV=null; this.coldT=0; this.blinkPending=0; this.chillIn=false; this.knockT=0; this.tpHide=0; this.tpPop=0;
    this.mesh.visible=true; this.dome.visible=false; this.dome2.visible=false; this.domeRing.visible=false; this.sawRing.visible=false;
  }
  center(){ return V3(this.pos.x,this.pos.y+this.bodyY,this.pos.z); }
  distTo(p){ const z=this.sz||1; const y=clamp(p.y,this.pos.y+0.4*z,this.pos.y+1.8*z); const dx=p.x-this.pos.x, dy=p.y-y, dz=p.z-this.pos.z; return Math.sqrt(dx*dx+dy*dy+dz*dz); }
  domeC(){ return V3(this.pos.x,this.pos.y+0.05,this.pos.z); }
  domeR(){ return this.stats.dome*(matchKind==='ffa'||matchKind==='battle'?1.2:1); }
  auraR(){ return this.silenceT>0?0:this.stats.auraR*(matchKind==='ffa'||matchKind==='battle'?1.25:1); }
  addCard(id){ this.cards.push(id); this.stats=computeStats(this.cards); this.hp=this.stats.hp; this.ammo=this.stats.ammo; this.applySize();
    const seen={}, pc=[]; for(const id of this.cards){ const c=CARDS[id]; if(c&&c.type==='dome'&&!seen[id]){ seen[id]=1; pc.push(new T.Color(c.c)); } } const team=new T.Color(this.team.light); this.cardPal=pc; this.domePal= pc.length===0?[team]: pc.slice(0,4); }
  auraPal(){ const s=this.stats,l=[]; if(s.chill) l.push(AURA_PAL.chill); if(s.staticf) l.push(AURA_PAL.staticf); if(s.drain) l.push(AURA_PAL.drain); return l; }
  useSkin(){ const k=this.skin|0; if(this.domeMat.defines.SKIN!==k){ this.domeMat.defines.SKIN=k; this.domeMat.needsUpdate=true; this.warmT=2; } }
  applySize(){ const sz=clamp(Math.pow(this.stats.hp/BASE.hp,0.3),0.75,1.6); this.sz=sz; this.radius=0.5*sz; this.height=2.05*sz; this.bodyY=1.3*sz; this.hitR=0.58*sz; } // more max HP = bigger and a bit slower; less = smaller and quicker
  setCards(ids){ this.cards=[]; this.stats=computeStats([]); this.applySize(); if(ids.length){ for(const id of ids.slice(0,-1)) this.cards.push(id); this.addCard(ids[ids.length-1]); } else { this.hp=this.stats.hp; this.ammo=this.stats.ammo; this.domePal=[new T.Color(this.team.light)]; } }
  maxHp(){ return Math.round(this.stats.hp*(1+(this.brawlT>0?2*this.stats.brawler:0))); }
  forward(){ return V3(-Math.sin(this.yaw),0,-Math.cos(this.yaw)); }
  aimDir(){ const cp=Math.cos(this.pitch); return V3(-Math.sin(this.yaw)*cp,Math.sin(this.pitch),-Math.cos(this.yaw)*cp); }
  muzzlePos(){ this.mesh.position.copy(this.pos); this.mesh.rotation.y=this.yaw; this.cannon.rotation.x=this.pitch; this.mesh.updateMatrixWorld(true); return this.muzzle.getWorldPosition(V3()); }
  speedFactor(){ const slow=Math.max(this.slowT>0?this.slowAmt:0,this.auraSlow); let k=(1-clamp(slow,0,0.8))*(this.stunT>0?0:1); if(this.tasteT>0) k*=1+0.5*this.stats.taste; if(this.chasing) k*=1+0.6*this.stats.chase; k*=1+0.25*this.stats.move; return k/Math.pow(this.sz||1,0.55); }
  setMood(m,t){ this.mood=m; this.moodT=t; }
  auraColor(t){ const s=this.stats, list=[]; if(s.chill) list.push(AURA_COL.chill); if(s.staticf) list.push(AURA_COL.staticf); if(s.drain) list.push(AURA_COL.drain); if(!list.length) return null; const i=Math.floor(t*0.6)%list.length, j=(i+1)%list.length, k=(t*0.6)%1; return new T.Color(list[i]).lerp(new T.Color(list[j]),list.length>1?k*k*(3-2*k):0); }
  updateVisual(dt,t){
    const g=this.mesh; if(this.visY===undefined||!this.onGround||Math.abs(this.pos.y-this.visY)>0.8) this.visY=this.pos.y; else this.visY=lerp(this.visY,this.pos.y,Math.min(1,dt*15)); g.position.set(this.pos.x,this.visY,this.pos.z); g.rotation.y=this.yaw; this.idleT+=dt; const L=Math.min(1,dt*13);
    const fwd=this.forward(); const vf=this.vel.x*fwd.x+this.vel.z*fwd.z; const vr=this.vel.x*Math.cos(this.yaw)-this.vel.z*Math.sin(this.yaw);
    const sp=Math.hypot(this.vel.x,this.vel.z); this.walkT+=dt*sp*1.25; const mv=Math.min(1,sp/4);
    this.squash=approach(this.squash,0,dt*3.5);
    const dashing=this.dashT>0, air=!this.onGround, w=clamp(sp/1.6,0,1), run=clamp((sp-3)/5,0,1);
    // gait: each leg plants, rolls back under the body, then lifts and swings through
    const freq=(1.15+0.165*Math.min(sp,10))*w; this.gait=(this.gait+dt*freq)%1; const gph=this.gait*Math.PI*2;
    const amp=Math.min(0.31,0.07+0.034*sp)*w, st=lerp(0.62,0.4,run), liftH=(0.07+0.2*run)*w;
    let mx=0, mz=-1; if(sp>0.2){ mx=vr/sp; mz=-vf/sp; }
    const big=(this.brawlT>0?1.14:1)*(this.sz||1); g.scale.setScalar(big*blinkScale(this,dt));
    const breath=Math.sin(this.idleT*2.2)*0.012, sway=Math.sin(this.idleT*0.9)*(1-w);
    const bounce=(air||dashing)?0:Math.cos(gph*2+0.6)*0.028*w;
    const hipY=this.hipY-0.035-0.05*run*w-this.squash*0.22+bounce+(air?0.03:0);
    this.rig.position.y=hipY+breath*0.5; this.rig.position.x=lerp(this.rig.position.x,(air?0:Math.sin(gph)*0.025*w+sway*0.012),L);
    const leanX=dashing?-0.55:clamp(-vf*0.03,-0.34,0.3)+(air?clamp(this.vel.y*0.012,-0.12,0.16):0);
    this.rig.rotation.x=lerp(this.rig.rotation.x,leanX,Math.min(1,dt*8));
    this.rig.rotation.z=lerp(this.rig.rotation.z,clamp(-vr*0.028,-0.28,0.28)+(air?0:Math.sin(gph)*0.05*w+sway*0.015),Math.min(1,dt*8));
    this.rig.rotation.y=lerp(this.rig.rotation.y,(air||dashing)?0:Math.sin(gph)*0.2*w*(vf<-0.5?-1:1),L);
    this.head.rotation.x=lerp(this.head.rotation.x,clamp(-this.pitch*0.6,-0.5,0.5)-this.rig.rotation.x*0.6,L); this.head.rotation.y=-this.rig.rotation.y*0.85; this.head.rotation.z=-this.rig.rotation.z*0.6;
    const L1=this.L1, L2=this.L2, reach=L1+L2-0.004; let s0=0;
    for(let i=0;i<2;i++){ const lg=this.legs[i], sx=i?1:-1; lg.hip.position.y=hipY; lg.hip.position.x=sx*0.15+this.rig.position.x*0.6;
      let tx,ty,tz,pitch=0;
      if(dashing){ tx=-sx*0.02; ty=-0.5+i*0.08; tz=0.34-i*0.2; pitch=-0.7; }
      else if(air){ const up=clamp(this.vel.y/9,-1,1); if(i===0){ tx=0; ty=lerp(-0.5,-0.4,Math.max(0,up)); tz=lerp(-0.2,-0.24,Math.max(0,up)); pitch=0.15; } else { tx=0; ty=lerp(-0.52,-0.6,Math.max(0,up)); tz=lerp(0.2,0.16,Math.max(0,up)); pitch=-0.5; } tx+=mx*0.06*w; }
      else { const ph=(this.gait+i*0.5)%1; let s, lift=0;
        if(ph<st){ const v=ph/st; s=amp*(1-2*v); pitch=lerp(0.3,-0.55,v*v)*w; if(lg.sw){ lg.sw=false; if(this.isPlayer&&sp>2.2&&!this.dead) SFX.step(); } }
        else { lg.sw=true; const u=(ph-st)/(1-st), e=u*u*(3-2*u); s=amp*(-1+2*e); lift=Math.sin(Math.PI*u)*liftH+Math.sin(Math.PI*Math.min(1,u*1.6))*0.1*run*w; pitch=lerp(-0.75,0.35,e)*w; }
        if(i===0) s0=amp>0.001?s/amp:0;
        tx=mx*s-sx*0.03*w+sx*0.02*(1-w)+sway*0.01; tz=mz*s+(1-w)*(i?0.03:-0.03); ty=-(hipY-0.1-lift)-this.squash*0.0; }
      const tk=Math.min(1,dt*(air||dashing?12:26)); lg.t.x=lerp(lg.t.x,tx,tk); lg.t.y=lerp(lg.t.y,ty,tk); lg.t.z=lerp(lg.t.z,tz,tk); lg.pitch=lerp(lg.pitch,pitch,tk);
      let d=Math.hypot(lg.t.x,lg.t.y,lg.t.z); const dc=clamp(d,0.12,reach); const ux=lg.t.x/d, uy=lg.t.y/d, uz=lg.t.z/d;
      const K=Math.acos(clamp((L1*L1+L2*L2-dc*dc)/(2*L1*L2),-1,1)), A=Math.acos(clamp((L1*L1+dc*dc-L2*L2)/(2*L1*dc),-1,1));
      const hx=Math.atan2(-uz,-uy)+A, kx=-(Math.PI-K);
      lg.hip.rotation.x=hx; lg.hip.rotation.z=Math.asin(clamp(ux,-0.9,0.9)); lg.knee.rotation.x=kx; lg.boot.rotation.x=-(hx+kx)+lg.pitch; lg.boot.rotation.z=-lg.hip.rotation.z; }
    // left arm swings against the left leg, elbow loose; flung up and out in the air
    let ax,az,ex,hz=0;
    if(dashing){ ax=-1.1; az=-0.35; ex=0.3; }
    else if(air){ ax=-0.5+clamp(this.vel.y*0.05,-0.5,0.4); az=-0.95; ex=0.7; }
    else { ax=-s0*(0.45+0.5*run)*w+Math.sin(this.idleT*1.7)*0.04*(1-w)+0.05; az=-0.13-0.06*run*w-Math.abs(sway)*0.02; ex=0.22+(0.5+0.75*run)*w+Math.max(0,-s0)*0.35*w; hz=0.1; }
    this.lArm.rotation.x=lerp(this.lArm.rotation.x,ax,L); this.lArm.rotation.z=lerp(this.lArm.rotation.z,az,L); this.lElbow.rotation.x=lerp(this.lElbow.rotation.x,ex,L); this.lHand.rotation.z=hz;
    for(let i=0;i<2;i++){ const p=this.tails[i]; p.rotation.x=0.9-Math.min(1.0,sp*0.12)+Math.sin(t*7+i*1.3)*0.14*(0.3+mv)+(this.onGround?0:clamp(this.vel.y*0.06,-0.6,0.6)); p.rotation.y=(i?1:-1)*0.3+Math.sin(t*4.3+i)*0.15; }
    { const want=dashing?1:(air&&this.vel.y>1.5?0.75:0); this.jetK=lerp(this.jetK,want,Math.min(1,dt*(want>this.jetK?30:9)));
      for(let i=0;i<2;i++){ const j=this.jets[i], k=this.jetK; j.g.visible=k>0.03; if(j.g.visible){ const fl=0.8+Math.random()*0.4; j.g.scale.set(1.1+k*0.7,k*fl*(dashing?2.4:1.6),1.1+k*0.7); j.gl.material.opacity=0.75*k; j.gl.scale.setScalar(0.35+0.3*k*fl); } }
      if(this.jetK>0.4&&Math.random()<dt*40){ const wp=this.jets[Math.random()<0.5?0:1].g.getWorldPosition(V3()); burst(wp,Math.random()<0.5?0xffb347:0xd9dde8,1,1.2,0.07,0.35,0.5); } }
    this.recoil=approach(this.recoil,0,dt*5);
    this.cannon.rotation.x=this.pitch+this.recoil*0.3-this.rig.rotation.x; this.cannon.position.z=-0.02+this.recoil*0.14;
    this.core.material.color.copy(col(this.team.light)).multiplyScalar(this.reloading?0.25+0.2*Math.sin(t*20):1); this.chest.material=this.core.material;
    this.muzzleGlow.material.opacity=Math.max((this.reloading?0:0.3+Math.sin(t*9)*0.08),this.muzzleGlow.material.opacity-dt*7);
    this.flash.material.opacity=Math.max(0,this.flash.material.opacity-dt*14); this.flash.material.rotation+=dt*20;
    // visor eyes show the mood
    if(this.moodT>0){ this.moodT-=dt; if(this.moodT<=0) this.mood='normal'; }
    let mood=this.mood; if(mood==='normal' && this.hp<this.maxHp()*0.3) mood='worried';
    this.blinkT-=dt; const blink=this.blinkT<0.1; if(this.blinkT<0) this.blinkT=rand(2,5);
    for(let i=0;i<2;i++){ const sx=i?1:-1, e=this.eyes[i]; let syc=1, rz=0, sxc=1; if(mood==='angry'){ rz=sx*0.5; syc=0.7; } else if(mood==='hurt'){ syc=0.22; sxc=1.15; } else if(mood==='happy'){ syc=0.45; rz=-sx*0.35; } else if(mood==='worried'||mood==='sad'){ rz=-sx*0.4; syc=0.8; } if(blink) syc=0.1; e.scale.x=sxc; e.scale.y=lerp(e.scale.y,syc,Math.min(1,dt*30)); e.rotation.z=rz; }
    this.eyeMat.color.copy(col(mood==='angry'&&!this.isPlayer?0xffe9a0:0xffffff));
    // armour tint: hit flash, phoenix, brawler, frozen
    const em=this.armour;
    if(this.hitFlash>0){ this.hitFlash-=dt; em.emissive.setRGB(1,1,1); em.emissiveIntensity=clamp(this.hitFlash*5,0,0.9); }
    else if(this.invulnT>0){ em.emissive.copy(col(0xff9a3d)); em.emissiveIntensity=0.5+Math.sin(t*30)*0.3; }
    else if(this.brawlT>0){ em.emissive.copy(col(0xff5a3c)); em.emissiveIntensity=0.3; }
    else if(this.coldT>0){ em.emissive.copy(col(0x8fdcff)); em.emissiveIntensity=0.7; } else if(this.slowT>0||this.auraSlow>0){ em.emissive.copy(col(0x9be7ff)); em.emissiveIntensity=this.chillIn?0.4:0.25; } else { em.emissive.copy(col(this.team.body)); em.emissiveIntensity=0.12; }
    { const ic=this.coldT>0?0.55:(this.chillIn?0.3:0); this.headMat.emissive.setHex(ic>0?0x7fd0ff:0x000000); this.headMat.emissiveIntensity=ic; }
    // block dome
    const dc=this.domeC(), R=this.domeR(); this.domeHitAge+=dt;
    if(typeof player!=='undefined'&&this===player){ this.skin=clamp(settings.domeSkin|0,0,DOME_SKINS.length-1); this.skinCol=settings.domeCol||''; }
    this.useSkin();
    const sawing=this.sawT>0&&!this.dead;
    if((this.blockActive&&!this.dead)||sawing||this.domePreview){
      let sc=R, fade=1, flash=this.previewFlash||0;
      if(this.blockActive){ const el=CFG.blockDuration-this.blockT; const k=Math.min(1,el/0.09); const e=1-Math.pow(1-k,3); const settle=clamp((el-0.09)/0.16,0,1); sc=Math.max(this.height+0.3,R*(0.35+0.65*e)*(1.12-0.12*settle)); if(sc>R*1.12) sc=Math.max(R*(0.35+0.65*e)*(1.12-0.12*settle),Math.min(sc,this.height+0.3)); fade=sawing?1:Math.min(1,this.blockT/0.12); flash=Math.max(0,1-el/0.2); }
      const u=this.domeMat.uniforms; this.dome.visible=true; this.dome.position.copy(dc); this.dome.scale.setScalar(sc); this.dome.rotation.y=sawing? t*9 : t*0.25; u.opacity.value=fade; u.time.value=t; u.flash.value=flash; u.hitAge.value=this.domeHitAge; u.hitDir.value.copy(this.domeHitDir).applyAxisAngle(UP,-this.dome.rotation.y); const myPal=(this.skin===0&&this.skinCol)?[new T.Color(this.skinCol),...this.cardPal].slice(0,4):this.domePal; setPal(this.domeMat,(sawing&&this.skin===0&&!this.skinCol)?SAW_PAL:myPal);
      this.skinTint.copy(skinTint(this.skin,this.skinCol)); u.skin.value=this.skin; u.tint.value.copy(this.skinTint); this.useSkin();
      const u2=this.domeMat2.uniforms; this.dome2.visible=true; this.dome2.position.copy(dc); this.dome2.scale.setScalar(sc*0.93); this.dome2.rotation.y=-t*0.6; if(this.skin){ this.dome2.visible=false; } u2.opacity.value=fade*0.55; u2.time.value=t*0.7+3; u2.flash.value=flash*0.5; u2.hitAge.value=9; u2.skin.value=this.skin; u2.tint.value.copy(this.skinTint);
      this.domeRing.visible=true; this.domeRing.position.set(dc.x,dc.y+0.03,dc.z); this.domeRing.scale.setScalar(sc*1.02); this.domeRing.material.opacity=0.9*fade;
      this.sawRing.visible=sawing; if(sawing){ this.sawRing.position.set(dc.x,dc.y+0.05,dc.z); this.sawRing.scale.set(R,1+R*0.4,R); this.sawRing.rotation.y=-t*10; }
    } else { this.dome.visible=false; this.dome2.visible=false; this.domeRing.visible=false; this.sawRing.visible=false;
      if(this.warmT>0&&!this.dead){ this.warmT--; this.dome.visible=true; this.domeMat.uniforms.opacity.value=0; this.dome.position.copy(this.center()); this.dome.scale.setScalar(0.05); } } // draw it once, invisibly, so the style's shader is ready before your first block
    const aR=this.auraR(), ac=aR>0? this.auraColor(t):null;
    if(ac && !this.dead){ const pulse=1+Math.sin(t*2.2)*0.018; this.aura.visible=true; this.aura.position.copy(dc); this.aura.scale.setScalar(aR*pulse); this.auraMat.uniforms.time.value=t*0.35; this.auraMat.uniforms.opacity.value=0.42; setPal(this.auraMat,this.auraPal()); this.auraRing.visible=true; this.auraRing.position.set(dc.x,dc.y+0.02,dc.z); this.auraRing.scale.setScalar(aR*pulse); this.auraRing.rotation.z=t*0.35; this.auraRing.material.color.copy(ac).convertSRGBToLinear(); }
    else { this.aura.visible=false; this.auraRing.visible=false; }
    const gY=groundAt(this.pos.x,this.pos.z,this.pos.y+50,0.3); const vis=gY!==null && !this.dead && this.active!==false;
    this.shadow.visible=vis; this.marker.visible=vis&&this.mesh.visible;
    if(vis){ this.shadow.position.set(this.pos.x,gY+0.015,this.pos.z); const h=clamp(this.pos.y-gY,0,6); this.shadow.scale.setScalar((1.05-h*0.1)*(this.sz||1)); this.shadow.material.opacity=0.38-h*0.045; this.marker.position.set(this.pos.x,gY+0.02,this.pos.z); this.marker.rotation.z=t*1.5; }
    const slowed=(this.slowT>0||this.auraSlow>0)&&!this.dead; const sil=this.silenceT>0; this.statusRing.visible=(slowed||this.stunT>0||sil)&&!this.dead; this.statusRing.position.set(this.pos.x,this.pos.y+0.08,this.pos.z); this.statusRing.material.color.copy(col(this.stunT>0?0xffe14d:(sil?0x9aa7c7:0x9be7ff))); this.statusRing.rotation.z+=dt*3; this.statusRing.scale.setScalar(1+Math.sin(t*8)*0.05);
  }
}
