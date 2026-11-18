// ================= NEON CITY MAP =================
function mkPair(w,h,draw,o={}){ const c=document.createElement('canvas'), e=document.createElement('canvas'); const gc=txCtx(c,w,h), ge=txCtx(e,w,h); ge.fillStyle='#000'; ge.fillRect(0,0,w,h); draw(gc,ge,w,h); const mk=cv=>{ const t=new T.CanvasTexture(cv); t.encoding=T.sRGBEncoding; t.anisotropy=maxAniso; t.wrapS=t.wrapT=o.clamp?T.ClampToEdgeWrapping:T.RepeatWrapping; return t; }; return {map:mk(c),emissiveMap:mk(e)}; }
const glowMat=(pair,o={})=>new T.MeshStandardMaterial(Object.assign({map:pair.map,emissiveMap:pair.emissiveMap,emissive:new T.Color(0xffffff),emissiveIntensity:1,roughness:0.6,metalness:0.25},o));
function neonSignTex(text,color,w=512,h=160,sub){ return mkTex(w,h,(g,W2,H2)=>{ g.fillStyle='#0a0c1c'; g.fillRect(0,0,W2,H2); g.strokeStyle=color; g.lineWidth=6; g.shadowColor=color; g.shadowBlur=18; g.strokeRect(10,10,W2-20,H2-20); g.textAlign='center'; g.textBaseline='middle'; g.font=`${Math.floor(H2*(sub?0.46:0.6))}px ${FONT}`; g.fillStyle='#fff'; g.shadowBlur=26; g.fillText(text,W2/2,H2*(sub?0.42:0.54)); g.fillStyle=color; g.globalAlpha=0.55; g.fillText(text,W2/2,H2*(sub?0.42:0.54)); g.globalAlpha=1; if(sub){ g.font=`${Math.floor(H2*0.2)}px ${FONT}`; g.fillStyle=color; g.shadowBlur=10; g.fillText(sub,W2/2,H2*0.8); } },{clamp:true}); }
function buildNeon(layout){ const ffa=layout==='ffa';
  const CY='#22e6ff', MG='#ff3fd0', OR='#ff8a2a', YE='#ffe14d', GR='#4dff9d', PU='#9a6bff';
  const rng=RNG(2026);
  // ---- textures ----
  const floorP=mkPair(2048,1024,(gc,ge,W2,H2)=>{ for(const g of [gc,ge]) g.setTransform(W2/(2*HX),0,0,H2/(2*HZ),W2/2,H2/2);
    gc.fillStyle='#0b0f20'; gc.fillRect(-HX,-HZ,2*HX,2*HZ);
    for(let x=-HX;x<HX;x+=2) for(let z=-HZ;z<HZ;z+=2){ const v=rng(); gc.fillStyle=`hsl(${226+v*10},${28+v*8}%,${13+v*6}%)`; gc.fillRect(x+0.04,z+0.04,1.92,1.92); gc.fillStyle='rgba(255,255,255,.05)'; gc.fillRect(x+0.04,z+0.04,1.92,0.05); }
    const L=(fn)=>{ fn(gc); fn(ge); };
    const line=(g,c,w,a=1)=>{ g.strokeStyle=c; g.lineWidth=w; g.globalAlpha=a; g.shadowColor=c; g.shadowBlur=0; };
    L(g=>{ line(g,CY,0.05,0.5); g.beginPath(); for(let x=-HX;x<=HX;x+=4){ g.moveTo(x,-HZ); g.lineTo(x,HZ); } for(let z=-HZ;z<=HZ;z+=4){ g.moveTo(-HX,z); g.lineTo(HX,z); } g.stroke(); });
    L(g=>{ line(g,MG,0.28); g.strokeRect(-HX+0.3,-HZ+0.3,2*HX-0.6,2*HZ-0.6); line(g,'#fff',0.06,0.8); g.strokeRect(-HX+0.3,-HZ+0.3,2*HX-0.6,2*HZ-0.6); });
    L(g=>{ line(g,MG,0.22); g.beginPath(); g.arc(0,0,10,0,7); g.stroke(); line(g,CY,0.12); g.beginPath(); g.arc(0,0,9.3,0,7); g.stroke(); g.setLineDash([1,0.7]); line(g,CY,0.12,0.9); g.beginPath(); g.moveTo(-13,0); g.lineTo(-10,0); g.moveTo(10,0); g.lineTo(13,0); g.moveTo(0,-HZ+1); g.lineTo(0,-10); g.moveTo(0,10); g.lineTo(0,HZ-1); g.stroke(); g.setLineDash([]); });
    const zone=(sx,c)=>L(g=>{ line(g,c,0.2); g.beginPath(); g.arc(sx*HX,0,11,0,7); g.stroke(); line(g,c,0.08,0.7); g.beginPath(); g.arc(sx*HX,0,10.3,0,7); g.stroke(); g.globalAlpha=0.12; g.fillStyle=c; g.beginPath(); g.arc(sx*HX,0,11,0,7); g.fill(); });
    const zone4=(x,z,c)=>L(g=>{ line(g,c,0.2); g.beginPath(); g.arc(x,z,9.5,0,7); g.stroke(); line(g,c,0.08,0.7); g.beginPath(); g.arc(x,z,8.8,0,7); g.stroke(); g.globalAlpha=0.12; g.fillStyle=c; g.beginPath(); g.arc(x,z,9.5,0,7); g.fill(); });
    if(ffa){ zone4(-HX,-HZ,TEAM.player.css); zone4(HX,HZ,TEAM.bot.css); zone4(HX,-HZ,TEAM.green.css); zone4(-HX,HZ,TEAM.purple.css); } else { zone(-1,'#19c8ff'); zone(1,'#ff7a1a'); }
    const chev=(x,z,rot,c)=>L(g=>{ g.save(); g.translate(x,z); g.rotate(rot); g.globalAlpha=0.9; g.fillStyle=c; for(let i=0;i<3;i++){ g.beginPath(); g.moveTo(-0.7,i*0.9); g.lineTo(0,i*0.9-0.55); g.lineTo(0.7,i*0.9); g.lineTo(0.7,i*0.9+0.25); g.lineTo(0,i*0.9-0.3); g.lineTo(-0.7,i*0.9+0.25); g.closePath(); g.fill(); } g.restore(); });
    if(ffa){ chev(-11,-11,Math.PI*0.75,CY); chev(11,11,-Math.PI*0.25,OR); chev(11,-11,-Math.PI*0.75,GR); chev(-11,11,Math.PI*0.25,PU); chev(0,15,0,YE); chev(0,-15,Math.PI,YE); chev(15,0,-Math.PI/2,YE); chev(-15,0,Math.PI/2,YE); }
    else { chev(-11,0,Math.PI/2,CY); chev(11,0,-Math.PI/2,OR); chev(0,12.5,0,YE); chev(0,-12.5,Math.PI,YE); }
    L(g=>{ g.globalAlpha=0.85; g.textAlign='center'; g.textBaseline='middle'; g.fillStyle=MG; g.font=`1.6px ${FONT}`; if(ffa){ g.fillText('NEON CROSSROADS',0,-18.9); g.save(); g.translate(0,18.9); g.rotate(Math.PI); g.fillText('FREE FOR ALL',0,0); g.restore(); } else { g.fillText('NEON CITY',-12,-12.6); g.save(); g.translate(12,12.6); g.rotate(Math.PI); g.fillText('SECTOR 7',0,0); g.restore(); } });
    gc.globalAlpha=1; for(let i=0;i<3000;i++){ gc.fillStyle=`rgba(255,255,255,${rng()*0.035})`; gc.fillRect(-HX+rng()*2*HX,-HZ+rng()*2*HZ,0.05+rng()*0.2,0.04); }
  },{clamp:true});
  const wallP=(c)=>mkPair(512,512,(gc,ge,W2,H2)=>{ gc.fillStyle='#141a30'; gc.fillRect(0,0,W2,H2); for(let i=0;i<2;i++) for(let j=0;j<2;j++){ gc.fillStyle=`hsl(228,26%,${15+((i+j)%2)*3}%)`; gc.fillRect(i*256+6,j*256+6,244,244); gc.strokeStyle='rgba(255,255,255,.08)'; gc.lineWidth=3; gc.strokeRect(i*256+7.5,j*256+7.5,241,241); gc.fillStyle='#0b0f1e'; for(const [x,y] of [[20,20],[236,20],[20,236],[236,236]]){ gc.beginPath(); gc.arc(i*256+x,j*256+y,5,0,7); gc.fill(); } }
    for(const g of [gc,ge]){ g.fillStyle=c; g.fillRect(0,36,W2,16); g.fillRect(0,292,W2,16); g.fillStyle='#fff'; g.fillRect(0,42,W2,4); g.fillRect(0,298,W2,4); g.fillStyle=c; for(let x=40;x<W2;x+=128){ g.fillRect(x,190,36,8); g.fillRect(x,446,36,8); } } });
  const crateP=(c)=>mkPair(256,256,(gc,ge,W2,H2)=>{ gc.fillStyle='#1b2240'; gc.fillRect(0,0,W2,H2); gc.strokeStyle='#0b0f1e'; gc.lineWidth=14; gc.strokeRect(7,7,W2-14,H2-14); gc.fillStyle='#0f1428'; for(let y=60;y<200;y+=22) gc.fillRect(40,y,W2-80,10); for(const g of [gc,ge]){ g.strokeStyle=c; g.lineWidth=5; g.strokeRect(22,22,W2-44,H2-44); g.fillStyle=c; g.fillRect(40,216,60,10); g.fillStyle='#fff'; g.fillRect(W2-70,216,30,10); } },{clamp:true});
  const bldP=[0,1,2,3].map(k=>mkPair(256,512,(gc,ge,W2,H2)=>{ const r=RNG(50+k); gc.fillStyle=['#0c1024','#10132c','#0e0f22','#131230'][k]; gc.fillRect(0,0,W2,H2); const cols=[['#ffd98a','#ff9d5c'],['#7fe9ff','#3fb0ff'],['#ff8ad8','#c46bff'],['#a8ffcf','#ffe98a']][k]; for(let y=0;y<16;y++) for(let x=0;x<8;x++){ const lit=r()<0.34; const X=x*32+6, Y=y*32+6; gc.fillStyle='#070914'; gc.fillRect(X,Y,20,22); if(lit){ const c=cols[r()<0.7?0:1]; for(const g of [gc,ge]){ g.globalAlpha=0.55+r()*0.45; g.fillStyle=c; g.fillRect(X,Y,20,22); g.globalAlpha=1; } } } if(k%2===0) for(const g of [gc,ge]){ g.fillStyle=k?MG:CY; g.fillRect(0,0,W2,4); } }));
  const streetTex=mkTex(512,512,(g,W2,H2)=>{ g.fillStyle='#07040f'; g.fillRect(0,0,W2,H2); g.shadowBlur=14; for(const [c,o] of [[OR,0],[MG,256]]){ g.shadowColor=c; g.strokeStyle=c; g.lineWidth=5; g.beginPath(); g.moveTo(0,o+60); g.lineTo(W2,o+60); g.moveTo(o+60,0); g.lineTo(o+60,H2); g.stroke(); } g.shadowBlur=6; for(let i=0;i<70;i++){ g.fillStyle=[YE,CY,'#fff',OR][i%4]; g.shadowColor=g.fillStyle; g.fillRect(Math.random()*W2,Math.random()*H2,3,3); } });
  const NM={ floor:glowMat(floorP,{roughness:0.32,metalness:0.55}), wallC:glowMat(wallP(CY)), wallM:glowMat(wallP(MG)), wallP:glowMat(wallP(PU)), wallTeamP:glowMat(wallP('#19c8ff')), wallTeamB:glowMat(wallP('#ff7a1a')),
    crateC:glowMat(crateP(CY)), crateM:glowMat(crateP(MG)), crateY:glowMat(crateP(YE)), metal:new T.MeshStandardMaterial({color:col(0x1a2038),roughness:0.5,metalness:0.6}), dark:new T.MeshStandardMaterial({color:col(0x0d1124),roughness:0.7,metalness:0.4}),
    bld:bldP.map(p=>glowMat(p,{roughness:0.8,metalness:0.1})), glass:new T.MeshStandardMaterial({color:col(0x22e6ff),emissive:col(0x22e6ff),emissiveIntensity:0.35,transparent:true,opacity:0.28,roughness:0.1,metalness:0.2,side:T.DoubleSide,depthWrite:false}) };
  const neon=c=>new T.MeshBasicMaterial({color:col(c)});
  const strip=(x0,x1,y,z0,z1,c,h=0.06)=>{ const m=new T.Mesh(new T.BoxGeometry(Math.max(0.06,x1-x0),h,Math.max(0.06,z1-z0)),neon(c)); m.position.set((x0+x1)/2,y,(z0+z1)/2); W.add(m); return m; };
  const edgeGlow=(x0,x1,y,z0,z1,c)=>{ strip(x0,x1,y,z0-0.03,z0+0.03,c); strip(x0,x1,y,z1-0.03,z1+0.03,c); strip(x0-0.03,x0+0.03,y,z0,z1,c); strip(x1-0.03,x1+0.03,y,z0,z1,c); };
  const block=(x0,x1,y0,y1,z0,z1,mat,c,tile=2)=>{ const m=solid(x0,x1,y0,y1,z0,z1,mat,tile); if(c) edgeGlow(x0,x1,y1+0.02,z0,z1,c); if(mat===NM.crateC||mat===NM.crateM||mat===NM.crateY) { boxEdges(x0,x1,y0,y1,z0,z1,0.09,NM.metal,NM.dark); collider(x0-0.08,x1+0.08,y0,y1+0.08,z0-0.08,z1+0.08); } return m; };
  const rail=(x0,z0,x1,z1,y,c,o={})=>{ const alongX=Math.abs(x1-x0)>Math.abs(z1-z0), len=alongX?Math.abs(x1-x0):Math.abs(z1-z0), t=0.09; collider(Math.min(x0,x1)-(alongX?0:t),Math.max(x0,x1)+(alongX?0:t),y,y+1.05,Math.min(z0,z1)-(alongX?t:0),Math.max(z0,z1)+(alongX?t:0),true); const n=Math.max(1,Math.round(len/2.2)); for(let i=0;i<=n;i++){ if((i===0&&o.noStart)||(i===n&&o.noEnd)) continue; const p=new T.Mesh(new T.BoxGeometry(0.1,1.05,0.1),NM.metal); p.position.set(lerp(x0,x1,i/n),y+0.52,lerp(z0,z1,i/n)); W.add(p); } for(const h of [0.5,1.0]){ const b=new T.Mesh(new T.BoxGeometry(alongX?len:0.05,0.05,alongX?0.05:len),neon(h>0.9?c:'#3a4a7a')); b.position.set((x0+x1)/2,y+h,(z0+z1)/2); W.add(b); } };
  const sign=(text,color,x,y,z,ry,w=5,h=1.6,sub)=>{ const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:neonSignTex(text,color,512,Math.round(512*h/w),sub),side:T.DoubleSide})); m.position.set(x,y,z); m.rotation.y=ry; W.add(m); const gl=sprite(color,w*1.5,0.3); gl.position.set(x,y,z); W.add(gl); animated.push(t=>{ gl.material.opacity=0.24+Math.sin(t*3+x)*0.06+(Math.sin(t*23+z)>0.96?-0.15:0); }); return m; };
  // ---- sky, street far below, tower body ----
  const moon=V3(-0.5,0.42,-0.75).normalize();
  const sky=new T.Mesh(new T.SphereGeometry(700,32,20),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,uniforms:{moonDir:{value:moon}},
    vertexShader:'varying vec3 vDir; void main(){ vDir=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader:`uniform vec3 moonDir; varying vec3 vDir; float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      void main(){ vec3 d=normalize(vDir); float h=d.y; vec3 hor=vec3(0.75,0.18,0.62), mid=vec3(0.16,0.07,0.36), top=vec3(0.02,0.02,0.09);
        vec3 c=mix(hor,mid,smoothstep(-0.05,0.22,h)); c=mix(c,top,smoothstep(0.18,0.75,h)); c=mix(c,vec3(0.05,0.02,0.12),smoothstep(0.0,-0.35,h));
        vec2 uv=vec2(atan(d.z,d.x),asin(clamp(d.y,-1.0,1.0)))*42.0; vec2 id=floor(uv); vec2 f=fract(uv)-0.5; float st=step(0.982,hash(id)); c+=st*smoothstep(0.16,0.0,length(f))*smoothstep(0.12,0.4,h)*(0.6+0.4*hash(id+7.0));
        float md=dot(d,moonDir); c=mix(c,vec3(1.0,0.96,0.9),smoothstep(0.9982,0.9988,md)); c+=vec3(0.55,0.45,1.0)*pow(max(md,0.0),50.0)*0.35; gl_FragColor=vec4(c,1.0); }`}));
  W.add(sky); animated.push(()=>sky.position.copy(camera.position));
  streetTex.repeat.set(14,14); const street=new T.Mesh(new T.PlaneGeometry(1200,1200),new T.MeshBasicMaterial({map:streetTex})); street.rotation.x=-Math.PI/2; street.position.y=-95; W.add(street);
  collider(-HX,HX,-1.4,0,-HZ,HZ);
  const floor=new T.Mesh(new T.PlaneGeometry(2*HX,2*HZ),NM.floor); floor.rotation.x=-Math.PI/2; floor.receiveShadow=true; W.add(floor); lookWetFloor(W,2*HX,2*HZ,0.004,0.62);
  meshBox(-HX,HX,-110,-0.005,-HZ,HZ,NM.bld[1],12,{cast:false}); meshBox(-HX-0.25,HX+0.25,-0.5,-0.02,-HZ-0.25,HZ+0.25,NM.dark,0,{cast:false}); edgeGlow(-HX-0.25,HX+0.25,-0.26,-HZ-0.25,HZ+0.25,MG);
  if(!ffa){
  // ---- bases ----
  const mkBase=(s,team)=>{ const x0=s<0?-HX:HX-6, x1=x0+6, cx=s<0?x0+3:x1-3, tc=team==='p'?TEAM.player:TEAM.bot, wm=team==='p'?NM.wallTeamP:NM.wallTeamB;
    block(x0,x1,0,1,-4.5,4.5,[wm,wm,NM.metal,NM.metal,wm,wm],HEXS(tc.body));
    const pad=new T.Mesh(new T.CircleGeometry(2.2,40),basic({map:TX.pad(HEXS(tc.body),HEXS(tc.dark)),polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2})); pad.rotation.x=-Math.PI/2; pad.rotation.z=s<0?-Math.PI/2:Math.PI/2; pad.position.set(cx,1.01,0); W.add(pad);
    const beam=new T.Mesh(new T.CylinderGeometry(2.15,2.15,5,36,1,true),new T.MeshBasicMaterial({color:col(tc.light),transparent:true,opacity:0.008,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending})); beam.position.set(cx,3.5,0); W.add(beam); animated.push(t=>{ beam.material.opacity=0.06+Math.sin(t*2+s)*0.02; });
    const bx=s<0?-HX+0.1:HX-0.1; rail(bx,-4.5,bx,4.5,1,HEXS(tc.body));
    const pl=new T.PointLight(tc.body,1.1,20,2); pl.position.set(cx,3.4,0); W.add(pl);
    for(const z of [-4.3,4.3]){ const p=new T.Mesh(new T.BoxGeometry(0.22,3.6,0.22),NM.metal); p.position.set(s<0?x1-0.3:x0+0.3,2.8,z); propCol(p.position.x,z,0.16,1.0,4.6); W.add(p); const g=new T.Mesh(new T.BoxGeometry(0.1,3.2,0.26),neon(tc.body)); g.position.copy(p.position); W.add(g); const sp=sprite(tc.light,3,0.4); sp.position.set(p.position.x,4.4,z); W.add(sp); }
 };
  const keepTop=M.rampTop, keepSide=M.rampSide, keepY=M.yellowFlat; M.rampTop=NM.metal; M.rampSide=NM.dark; M.yellowFlat=new T.MeshBasicMaterial({color:col(CY),polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  mkBase(-1,'p'); mkBase(1,'b');
  addRamp(-16,-13,-2.2,2.2,'x',false,0,1); addRamp(13,16,-2.2,2.2,'x',true,0,1);
  // ---- centre: raised deck + holo tower ----
  block(-6,6,0,1,-5,5,[NM.wallM,NM.wallM,NM.metal,NM.metal,NM.wallM,NM.wallM],MG);
  addRamp(-2,2,5,7.5,'z',false,0,1); addRamp(-2,2,-7.5,-5,'z',true,0,1); addRamp(6,8.5,-1.8,1.8,'x',false,0,1); addRamp(-8.5,-6,-1.8,1.8,'x',true,0,1);
  solid(-2.2,2.2,1,6.2,-2.2,2.2,NM.metal,0);
  { const ads=[['DOME','ROUNDS',MG],['NOVA','COLA',CY],['ZAP!','ARCADE',YE],['BYTE','BAR 24H',GR]]; ads.forEach((a,i)=>{ const ry=i*Math.PI/2; const m=new T.Mesh(new T.PlaneGeometry(4,4.4),new T.MeshBasicMaterial({map:neonSignTex(a[0],a[2],512,560,a[1])})); m.position.set(Math.sin(ry)*2.23,3.7,Math.cos(ry)*2.23); m.rotation.y=ry; W.add(m); animated.push(t=>{ m.material.color.setScalar(0.85+Math.sin(t*2+i)*0.1+(Math.sin(t*31+i*5)>0.97?-0.4:0)); }); });
    edgeGlow(-2.25,2.25,6.22,-2.25,2.25,CY); const ring=new T.Mesh(new T.TorusGeometry(2.6,0.07,8,48),neon(MG)); ring.rotation.x=Math.PI/2; ring.position.y=10.4; W.add(ring); const ring2=new T.Mesh(new T.TorusGeometry(1.8,0.05,8,40),neon(CY)); ring2.position.y=10.4; W.add(ring2); const orb=new T.Mesh(new T.IcosahedronGeometry(0.6,1),new T.MeshBasicMaterial({color:col(0xffffff),wireframe:true})); orb.position.y=10.4; W.add(orb); const gl=sprite(MG,7,0.5); gl.position.y=7.2; W.add(gl);
    animated.push((t)=>{ ring.rotation.z=t*0.7; ring2.rotation.y=t*1.3; ring2.rotation.x=t*0.9; orb.rotation.y=-t; orb.position.y=10.4+Math.sin(t*1.5)*0.15; });
    const pl=new T.PointLight(0xff3fd0,1.3,34,2); pl.position.set(0,7,0); W.add(pl); }
  block(4.4,5.8,1,2.3,3.4,4.8,NM.crateC,CY,0); block(-5.8,-4.4,1,2.3,-4.8,-3.4,NM.crateM,MG,0);
  // ---- cover ----
  block(-12,-11.4,0,1.9,4,9,NM.wallC,CY); block(11.4,12,0,1.9,-9,-4,NM.wallC,CY);
  block(-10,-6,0,1.1,-9.6,-9,NM.wallP,PU); block(6,10,0,1.1,9,9.6,NM.wallP,PU);
  block(9,11,0,1.4,3,5,NM.crateY,YE,0); block(-11,-9,0,1.4,-5,-3,NM.crateY,YE,0);
  block(9.3,10.7,1.4,2.6,3.3,4.7,NM.crateC,CY,0); block(-10.7,-9.3,1.4,2.6,-4.7,-3.3,NM.crateM,MG,0);
  const acUnit=(x0,x1,z0,z1,h)=>{ block(x0,x1,0,h,z0,z1,NM.metal,OR,0); const cx=(x0+x1)/2, cz=(z0+z1)/2, w=x1-x0, d=z1-z0, R=Math.min(w,d)*0.4;
    // louvred grilles on all four sides, feet, and a guarded fan on top
    const G=[]; for(let k=0;k<9;k++){ const y=0.35+k*(h-0.7)/8; G.push([new T.BoxGeometry(w*0.8,0.035,0.06),MX(cx,y,z0-0.02,0.5)]); G.push([new T.BoxGeometry(w*0.8,0.035,0.06),MX(cx,y,z1+0.02,-0.5)]); G.push([new T.BoxGeometry(0.06,0.035,d*0.8),MX(x0-0.02,y,cz,0,0,-0.5)]); G.push([new T.BoxGeometry(0.06,0.035,d*0.8),MX(x1+0.02,y,cz,0,0,0.5)]); }
    addMerged(G,new T.MeshStandardMaterial({color:col(0x55618a),roughness:0.4,metalness:0.7}),{cast:false});
    const F=[[new T.CylinderGeometry(R+0.08,R+0.08,0.12,32,1,true),MX(cx,h+0.06,cz)],[new T.TorusGeometry(R+0.06,0.035,6,32),MX(cx,h+0.13,cz,Math.PI/2)],[new T.TorusGeometry(R*0.55,0.02,6,24),MX(cx,h+0.13,cz,Math.PI/2)]];
    for(let k=0;k<4;k++) F.push([new T.BoxGeometry(R*2.1,0.025,0.03),MX(cx,h+0.13,cz,0,k*Math.PI/4,0)]);
    for(const sx of [-1,1]) for(const sz of [-1,1]) F.push([new T.BoxGeometry(0.16,0.12,0.16),MX(cx+sx*(w/2-0.15),0.06,cz+sz*(d/2-0.15))]);
    F.push([new T.CylinderGeometry(0.07,0.07,h*0.8,12),MX(x1+0.12,h*0.42,cz+d*0.25)],[new T.CylinderGeometry(0.07,0.07,h*0.8,12),MX(x1+0.12,h*0.42,cz-d*0.25)],[new T.TorusGeometry(0.12,0.07,8,12,Math.PI/2),MX(x1,h*0.82,cz+d*0.25,0,0,0)],[new T.TorusGeometry(0.12,0.07,8,12,Math.PI/2),MX(x1,h*0.82,cz-d*0.25,0,0,0)]);
    addMerged(F,NM.metal);
    const fan=new T.Group(); fan.position.set(cx,h+0.06,cz); W.add(fan); const B=[[new T.CylinderGeometry(0.12,0.12,0.08,16),MX(0,0,0)]]; for(let k=0;k<5;k++) B.push([new T.BoxGeometry(R*0.9,0.02,0.22),MX(Math.cos(k*Math.PI*0.4)*R*0.5,0,Math.sin(k*Math.PI*0.4)*R*0.5,0.35,-k*Math.PI*0.4,0)]);
    addMerged(B,NM.dark,{parent:fan,cast:false}); animated.push((t,dt)=>{ fan.rotation.y+=dt*9; }); const l=sprite(OR,1.2,0.7); l.position.set(x0+0.2,h*0.7,(z0+z1)/2); W.add(l); };
  acUnit(13.5,15.5,-10,-8,2.2); acUnit(-15.5,-13.5,8,10,2.2);
  { const gA=new T.Mesh(new T.BoxGeometry(0.12,1.5,4),NM.glass); gA.position.set(-3.4,0.75,10.5); W.add(gA); collider(-3.5,-3.3,0,1.5,8.5,12.5); edgeGlow(-3.47,-3.33,1.52,8.5,12.5,CY); const gB=gA.clone(); gB.position.set(3.4,0.75,-10.5); W.add(gB); collider(3.3,3.5,0,1.5,-12.5,-8.5); edgeGlow(3.33,3.47,1.52,-12.5,-8.5,CY); }
  // ---- side decks ----
  block(8,16,0,1.6,11,HZ,[NM.wallC,NM.wallC,NM.metal,NM.metal,NM.wallC,NM.wallC],CY); addRamp(5,8,11,HZ,'x',true,0,1.6); block(12,13,1.6,2.9,12.5,15,NM.crateM,MG,0); rail(8,HZ-0.1,16,HZ-0.1,1.6,CY);
  block(-16,-8,0,1.6,-HZ,-11,[NM.wallC,NM.wallC,NM.metal,NM.metal,NM.wallC,NM.wallC],CY); addRamp(-8,-5,-HZ,-11,'x',false,0,1.6); block(-13,-12,1.6,2.9,-15,-12.5,NM.crateC,CY,0); rail(-16,-HZ+0.1,-8,-HZ+0.1,1.6,CY);
  M.rampTop=keepTop; M.rampSide=keepSide; M.yellowFlat=keepY;
  // ---- edge rails ----
  rail(-HX+0.1,4.62,-HX+0.1,HZ-0.1,0,MG); rail(-HX+0.1,-HZ+0.1,-HX+0.1,-4.62,0,MG); rail(HX-0.1,4.62,HX-0.1,HZ-0.1,0,MG); rail(HX-0.1,-HZ+0.1,HX-0.1,-4.62,0,MG);
  rail(-HX+0.1,HZ-0.1,-12,HZ-0.1,0,MG,{noStart:true}); rail(16.12,HZ-0.1,HX-0.1,HZ-0.1,0,MG,{noEnd:true}); rail(12,-HZ+0.1,HX-0.1,-HZ+0.1,0,MG,{noEnd:true}); rail(-HX+0.1,-HZ+0.1,-16.12,-HZ+0.1,0,MG,{noStart:true});
  // ---- props: sign posts, antennas, light strips ----
  const post=(x,z,h)=>{ propCol(x,z,0.12,0,h); const pp=[[0.001,0],[0.3,0],[0.3,0.06],[0.13,0.1],[0.11,0.4],[0.13,0.45],[0.09,0.5],[0.08,h-0.1],[0.11,h-0.05],[0.11,h],[0.001,h]].map(q=>new T.Vector2(q[0],q[1]));
    const p=new T.Mesh(new T.LatheGeometry(pp,18),NM.metal); p.position.set(x,0,z); p.castShadow=true; W.add(p);
    const bolts=[]; for(let k=0;k<4;k++) bolts.push([new T.CylinderGeometry(0.025,0.025,0.05,8),MX(x+Math.cos(k*Math.PI/2+0.785)*0.22,0.075,z+Math.sin(k*Math.PI/2+0.785)*0.22)]); addMerged(bolts,NM.dark,{cast:false});
    const ring=new T.Mesh(new T.TorusGeometry(0.1,0.025,6,18),neon(MG)); ring.rotation.x=Math.PI/2; ring.position.set(x,h*0.55,z); W.add(ring); };
  const pSign=(text,color,x,y,z,ry,w,h,sub)=>sign(text,color,x+Math.sin(ry)*0.17,y,z+Math.cos(ry)*0.17,ry,w,h,sub); // board sits in front of its post
  post(-18,13,6); pSign('NOODLES',OR,-18,5.4,13,Math.PI*0.75,4.4,1.3,'OPEN LATE'); post(18,-13,6); pSign('HOTEL 88',CY,18,5.4,-13,-Math.PI*0.25,4.4,1.3,'VACANCY');
  post(-18,-13,5); pSign('ARCADE',YE,-18,4.4,-13,Math.PI*0.25,3.8,1.1); post(18,13,5); pSign('BYTE BAR',GR,18,4.4,13,-Math.PI*0.75,3.8,1.1);
  for(const [x,z] of [[-HX+1,HZ-1],[HX-1,-HZ+1]]){ propCol(x,z,0.1,0,9); const a=new T.Mesh(new T.CylinderGeometry(0.04,0.08,9,6),NM.metal); a.position.set(x,4.5,z); W.add(a); const l=sprite(0xff3030,1.6,1); l.position.set(x,9.1,z); W.add(l); animated.push(t=>{ l.material.opacity=Math.sin(t*3+x)>0.3?1:0.1; }); }
  for(const z of [-7,7]){ strip(-9,-6.5,0.03,z-0.06,z+0.06,CY,0.03); strip(6.5,9,0.03,z-0.06,z+0.06,MG,0.03); }
  } else {
  // ======== FREE FOR ALL: four corner bases, a raised cross with the holo tower, cover on every lane ========
  NM.wallTeamG=glowMat(wallP(TEAM.green.css)); NM.wallTeamU=glowMat(wallP(TEAM.purple.css));
  const keepTop=M.rampTop, keepSide=M.rampSide, keepY=M.yellowFlat; M.rampTop=NM.metal; M.rampSide=NM.dark; M.yellowFlat=new T.MeshBasicMaterial({color:col(CY),polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  const corner=(sx,sz,tc,wm)=>{ const x0=sx<0?-HX:HX-7, x1=x0+7, z0=sz<0?-HZ:HZ-7, z1=z0+7, cx=sx*(HX-3.6), cz=sz*(HZ-3.6), c=HEXS(tc.body);
    block(x0,x1,0,1,z0,z1,[wm,wm,NM.metal,NM.metal,wm,wm],c);
    const pad=new T.Mesh(new T.CircleGeometry(2.2,40),basic({map:TX.pad(c,HEXS(tc.dark)),polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2})); pad.rotation.x=-Math.PI/2; pad.rotation.z=Math.atan2(sx,-sz); pad.position.set(cx,1.01,cz); W.add(pad);
    const beam=new T.Mesh(new T.CylinderGeometry(2.15,2.15,5,36,1,true),new T.MeshBasicMaterial({color:col(tc.light),transparent:true,opacity:0.008,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending})); beam.position.set(cx,3.5,cz); W.add(beam); animated.push(t=>{ beam.material.opacity=0.06+Math.sin(t*2+sx+sz*2)*0.02; });
    rail(sx*(HX-0.1),z0+(sz<0?0.1:0),sx*(HX-0.1),z1-(sz>0?0.1:0),1,c); rail(x0+(sx<0?0.1:0),sz*(HZ-0.1),x1-(sx>0?0.1:0),sz*(HZ-0.1),1,c,{noStart:sx>0,noEnd:sx<0});
    const pl=new T.PointLight(tc.body,1.1,20,2); pl.position.set(cx,3.4,cz); W.add(pl);
    // two ramps down toward the middle, and a glowing post on the inner corner
    const ix=sx<0?x1:x0, iz=sz<0?z1:z0;
    addRamp(sx<0?ix:ix-3,sx<0?ix+3:ix,Math.min(cz-1.8,cz+1.8),Math.max(cz-1.8,cz+1.8),'x',sx>0,0,1);
    addRamp(Math.min(cx-1.8,cx+1.8),Math.max(cx-1.8,cx+1.8),sz<0?iz:iz-3,sz<0?iz+3:iz,'z',sz>0,0,1);
    const px=ix-sx*0.3, pz=iz-sz*0.3; const p=new T.Mesh(new T.BoxGeometry(0.22,3.6,0.22),NM.metal); p.position.set(px,2.8,pz); propCol(px,pz,0.16,1.0,4.6); W.add(p); const gg=new T.Mesh(new T.BoxGeometry(0.1,3.2,0.26),neon(tc.body)); gg.position.copy(p.position); W.add(gg); const sp=sprite(tc.light,3,0.4); sp.position.set(px,4.4,pz); W.add(sp); };
  corner(-1,-1,TEAM.player,NM.wallTeamP); corner(1,1,TEAM.bot,NM.wallTeamB); corner(1,-1,TEAM.green,NM.wallTeamG); corner(-1,1,TEAM.purple,NM.wallTeamU);
  // ---- the cross: a raised plus with ramps at every arm, holo tower in the middle ----
  block(-7,7,0,1,-2.5,2.5,[NM.wallM,NM.wallM,NM.metal,NM.metal,NM.wallM,NM.wallM],MG); block(-2.5,2.5,0,1,2.5,7,[NM.wallM,NM.wallM,NM.metal,NM.metal,NM.wallM,NM.wallM],MG); block(-2.5,2.5,0,1,-7,-2.5,[NM.wallM,NM.wallM,NM.metal,NM.metal,NM.wallM,NM.wallM],MG);
  addRamp(7,9.6,-1.8,1.8,'x',false,0,1); addRamp(-9.6,-7,-1.8,1.8,'x',true,0,1); addRamp(-1.8,1.8,7,9.6,'z',false,0,1); addRamp(-1.8,1.8,-9.6,-7,'z',true,0,1);
  solid(-1.8,1.8,1,5.6,-1.8,1.8,NM.metal,0);
  { const ads=[['DOME','ROUNDS',MG],['FREE','FOR ALL',CY],['KO','ZONE',YE],['NOVA','COLA',GR]]; ads.forEach((a,i)=>{ const ry=i*Math.PI/2; const m=new T.Mesh(new T.PlaneGeometry(3.3,3.6),new T.MeshBasicMaterial({map:neonSignTex(a[0],a[2],512,560,a[1])})); m.position.set(Math.sin(ry)*1.83,3.35,Math.cos(ry)*1.83); m.rotation.y=ry; W.add(m); animated.push(t=>{ m.material.color.setScalar(0.85+Math.sin(t*2+i)*0.1); }); });
    edgeGlow(-1.85,1.85,5.62,-1.85,1.85,CY); const ring=new T.Mesh(new T.TorusGeometry(2.4,0.07,8,48),neon(MG)); ring.rotation.x=Math.PI/2; ring.position.y=9.6; W.add(ring); const ring2=new T.Mesh(new T.TorusGeometry(1.6,0.05,8,40),neon(CY)); ring2.position.y=9.6; W.add(ring2);
    const orb=new T.Mesh(new T.IcosahedronGeometry(0.55,1),new T.MeshBasicMaterial({color:col(0xffffff),wireframe:true})); orb.position.y=9.6; W.add(orb);
    animated.push((t)=>{ ring.rotation.z=t*0.7; ring2.rotation.y=t*1.3; ring2.rotation.x=t*0.9; orb.rotation.y=-t; orb.position.y=9.6+Math.sin(t*1.5)*0.15; });
    const pl=new T.PointLight(0xff3fd0,1.3,34,2); pl.position.set(0,7,0); W.add(pl); }
  block(4.2,5.6,1,2.3,-2.2,-0.8,NM.crateC,CY,0); block(-5.6,-4.2,1,2.3,0.8,2.2,NM.crateM,MG,0); block(-2.2,-0.8,1,2.3,4.2,5.6,NM.crateY,YE,0); block(0.8,2.2,1,2.3,-5.6,-4.2,NM.crateY,YE,0);
  // ---- lanes between bases: low walls, crate stacks, glass ----
  for(const [x,z,alongX] of [[0,-16,true],[0,16,true],[-16,0,false],[16,0,false]]){
    if(alongX){ block(-3.2,3.2,0,1.4,z-0.3,z+0.3,NM.wallC,CY); block(-7.4,-5.8,0,1.4,z-0.7,z+0.7,NM.crateC,CY,0); block(5.8,7.4,0,1.4,z-0.7,z+0.7,NM.crateM,MG,0); block(5.95,7.25,1.4,2.6,z-0.55,z+0.55,NM.crateY,YE,0); }
    else { block(x-0.3,x+0.3,0,1.4,-3.2,3.2,NM.wallC,CY); block(x-0.7,x+0.7,0,1.4,-7.4,-5.8,NM.crateM,MG,0); block(x-0.7,x+0.7,0,1.4,5.8,7.4,NM.crateC,CY,0); block(x-0.55,x+0.55,1.4,2.6,-7.25,-5.95,NM.crateY,YE,0); } }
  for(const sx of [-1,1]) for(const sz of [-1,1]){ const x=sx*9.5, z=sz*9.5; block(x-0.8,x+0.8,0,1.6,z-0.8,z+0.8,NM.crateY,YE,0);
    const gA=new T.Mesh(new T.BoxGeometry(0.12,1.5,3),NM.glass); gA.rotation.y=Math.PI/4*(sx*sz>0?1:-1); gA.position.set(sx*12.4,0.75,sz*7.2); W.add(gA); collider(sx*12.4-0.7,sx*12.4+0.7,0,1.5,sz*7.2-0.7,sz*7.2+0.7,true);
    const gB=new T.Mesh(new T.BoxGeometry(0.12,1.5,3),NM.glass); gB.rotation.y=Math.PI/4*(sx*sz>0?-1:1)+Math.PI/2; gB.position.set(sx*7.2,0.75,sz*12.4); W.add(gB); collider(sx*7.2-0.7,sx*7.2+0.7,0,1.5,sz*12.4-0.7,sz*12.4+0.7,true); }
  M.rampTop=keepTop; M.rampSide=keepSide; M.yellowFlat=keepY;
  // ---- edge rails between the bases ----
  rail(-HX+7,-HZ+0.1,HX-7,-HZ+0.1,0,MG,{noStart:true,noEnd:true}); rail(-HX+7,HZ-0.1,HX-7,HZ-0.1,0,MG,{noStart:true,noEnd:true}); rail(-HX+0.1,-HZ+7,-HX+0.1,HZ-7,0,MG,{noStart:true,noEnd:true}); rail(HX-0.1,-HZ+7,HX-0.1,HZ-7,0,MG,{noStart:true,noEnd:true});
  // ---- signs on posts at the middle of each edge ----
  const post=(x,z,h)=>{ propCol(x,z,0.12,0,h); const pp=[[0.001,0],[0.3,0],[0.3,0.06],[0.13,0.1],[0.11,0.4],[0.13,0.45],[0.09,0.5],[0.08,h-0.1],[0.11,h-0.05],[0.11,h],[0.001,h]].map(q=>new T.Vector2(q[0],q[1])); const p=new T.Mesh(new T.LatheGeometry(pp,18),NM.metal); p.position.set(x,0,z); p.castShadow=true; W.add(p); };
  post(0,-HZ+0.7,6); sign('ARCADE',YE,0,5.4,-HZ+0.87,0,4.4,1.3,'OPEN 24H'); post(0,HZ-0.7,6); sign('NOODLES',OR,0,5.4,HZ-0.87,Math.PI,4.4,1.3,'OPEN LATE'); post(-HX+0.7,0,6); sign('HOTEL 88',CY,-HX+0.87,5.4,0,Math.PI/2,4.4,1.3,'VACANCY'); post(HX-0.7,0,6); sign('BYTE BAR',GR,HX-0.87,5.4,0,-Math.PI/2,4.4,1.3,'LIVE DJ');
  for(const z of [-11,11]){ strip(-5,-2.5,0.03,z-0.06,z+0.06,CY,0.03); strip(2.5,5,0.03,z-0.06,z+0.06,MG,0.03); }
  }
  // ---- the city around ----
  const farFog=new T.Color(0x150d33);
  const bGeoCache={};
  for(let i=0;i<86;i++){ const a=rng()*Math.PI*2, r=38+rng()*rng()*230; let x=Math.cos(a)*r, z=Math.sin(a)*r; const w=9+rng()*16, d=9+rng()*16; if(Math.abs(x)<HX+w/2+7&&Math.abs(z)<HZ+d/2+7) continue; const near=r<85; const top=near? -22+rng()*46 : -12+rng()*100; const h=top+115; const mat=NM.bld[Math.floor(rng()*4)];
    const m=new T.Mesh(boxGeo(w,h,d,13),mat); m.position.set(x,top-h/2,z); W.add(m);
    if(rng()<0.55){ const c=[CY,MG,OR,PU,GR][Math.floor(rng()*5)]; const e=new T.Mesh(new T.BoxGeometry(w+0.3,0.35,d+0.3),neon(c)); e.position.set(x,top+0.1,z); W.add(e); }
    if(rng()<0.35){ const an=new T.Mesh(new T.CylinderGeometry(0.15,0.25,8+rng()*10,5),NM.dark); an.position.set(x,top+5,z); W.add(an); const l=sprite(0xff3030,3,1); l.position.set(x,top+10+rng()*4,z); W.add(l); const ph=rng()*6; animated.push(t=>{ l.material.opacity=Math.sin(t*2.5+ph)>0.2?1:0.15; }); }
    if(near&&rng()<0.7&&top>2){ const words=[['RAMEN',OR],['NOVA',CY],['PIXEL',MG],['GLOW',GR],['VOLT',YE],['SYNTH',PU],['ZAP!',MG],['24H',CY]]; const wd=words[Math.floor(rng()*words.length)]; const face=Math.abs(x)>Math.abs(z); const sw=Math.min(face?d:w,10)*0.8; const sg=new T.Mesh(new T.PlaneGeometry(sw,sw*0.32),new T.MeshBasicMaterial({map:neonSignTex(wd[0],wd[1],512,164),side:T.DoubleSide})); if(face){ sg.position.set(x-Math.sign(x)*(w/2+0.2),Math.min(top-3,6+rng()*8),z); sg.rotation.y=x>0?-Math.PI/2:Math.PI/2; } else { sg.position.set(x,Math.min(top-3,6+rng()*8),z-Math.sign(z)*(d/2+0.2)); sg.rotation.y=z>0?Math.PI:0; } W.add(sg); } }
  // flying traffic
  for(let i=0;i<18;i++){ const g=new T.Group(); const c=[CY,MG,OR,YE][i%4]; const b=new T.Mesh(new T.BoxGeometry(2.4,0.5,1.1),NM.dark); g.add(b); const top=new T.Mesh(new T.BoxGeometry(1.2,0.35,0.9),NM.glass); top.position.y=0.4; g.add(top); const hl=sprite(0xffffff,2,0.9); hl.position.x=1.3; g.add(hl); const tl=sprite(c,2.4,0.9); tl.position.x=-1.3; g.add(tl); const st=new T.Mesh(new T.BoxGeometry(2.2,0.06,1.14),neon(c)); st.position.y=-0.2; g.add(st); W.add(g);
    const alongX=i%2===0, lane=(alongX? (i%4===0?-1:1)*(HZ+12+((i*7)%30)) : (i%4===1?-1:1)*(HX+12+((i*11)%34))), y=-26+((i*13)%50), sp=(10+((i*5)%9))*(i%3===0?-1:1), ph=i*37; if(!alongX) g.rotation.y=-Math.PI/2*Math.sign(sp); else if(sp<0) g.rotation.y=Math.PI;
    animated.push(t=>{ const p=((t*sp+ph)%360+360)%360-180; if(alongX) g.position.set(p,y+Math.sin(t+ph)*0.4,lane); else g.position.set(lane,y+Math.sin(t+ph)*0.4,p); }); }
  // drifting haze planes for depth
  for(let i=0;i<5;i++){ const hz=new T.Mesh(new T.PlaneGeometry(500,60),new T.MeshBasicMaterial({color:col(i%2?0x7a2a9a:0x2a4aba),transparent:true,opacity:0.12,depthWrite:false,side:T.DoubleSide,fog:false})); const a=i/5*Math.PI*2; hz.position.set(Math.cos(a)*170,-18,Math.sin(a)*170); hz.rotation.y=-a+Math.PI/2; W.add(hz); }
}

// ================= MAP REGISTRY / ENVIRONMENT / QUALITY =================
const MAPS={
  dock:{ name:'Dockside', native:[18,13], scale:1.22, spawnX:14.6, killY:-2.2, build(){ buildArena(); buildScenery(); },
    env:{ fog:[HORIZON,70,340], hemi:[0xffe0c8,0x4f5c92,0.66], sun:[0xffc38a,1.2,[27,17,-19]], bloom:[0.2,0.4,0.9] } },
  neon:{ name:'Neon City', native:[22,16], scale:1, spawnX:19, killY:-7, build(){ buildNeon('duel'); },
    env:{ fog:[0x150d33,45,300], hemi:[0xa9b8ff,0x3a2260,0.95], sun:[0xc4d0ff,0.6,[-18,36,-14]], bloom:[0.4,0.45,0.8] } },
  ffa:{ name:'Neon Crossroads', native:[20,20], scale:1, spawnX:16.4, killY:-7, ffaOnly:true, spawns:[[-16.4,-16.4],[16.4,16.4],[16.4,-16.4],[-16.4,16.4]], build(){ buildNeon('ffa'); },
    env:{ fog:[0x170c30,45,300], hemi:[0xb0b6ff,0x3c2262,0.95], sun:[0xd0c8ff,0.62,[16,36,-18]], bloom:[0.4,0.45,0.8] } },
};
let curMap=null, curMapId='';
function ensureMap(id){ const m=MAPS[id]; if(m.group) return m; const g=new T.Group(); g.userData.isMap=true; scene.add(g); W=g; /*DEBUG-START*/if(window.__tagAdd){ const a0=g.add; g.add=function(...a){ const st=new Error().stack.split('\n').slice(1).map(x=>x.trim()); const k=st.findIndex(x=>/^at (buildArena|buildScenery|buildNeon|Object\.build)/.test(x)); for(const o of a) o.userData.src=k>0?st[k]:'x'+Math.random(); return a0.apply(this,a); }; }/*DEBUG-END*/ boxes=[]; ramps=[]; animated=[]; HX=m.native[0]; HZ=m.native[1]; m.build(); const S=m.scale;
  if(S!==1){ g.scale.set(S,1,S); for(const b of boxes){ b.min.x*=S; b.max.x*=S; b.min.z*=S; b.max.z*=S; } for(const r of ramps){ r.minX*=S; r.maxX*=S; r.minZ*=S; r.maxZ*=S; } if(g.userData.waterMat) g.userData.waterMat.uniforms.dock.value.set(HX*S,HZ*S); }
  m.sealed=sealGaps(0.5); m.group=g; m.boxes=boxes; m.ramps=ramps; m.animated=animated; m.HX=HX*S; m.HZ=HZ*S; W=scene; return m; }
function setMap(id){ if(!MAPS[id]) id='dock'; const m=ensureMap(id); for(const k in MAPS) if(MAPS[k].group) MAPS[k].group.visible=(k===id); boxes=m.boxes; ramps=m.ramps; animated=m.animated; HX=m.HX; HZ=m.HZ; curMap=m; curMapId=id; CFG.killY=m.killY;
  const e=m.env; scene.fog.color.copy(col(e.fog[0])); scene.fog.near=e.fog[1]; scene.fog.far=e.fog[2]; hemi.color.set(e.hemi[0]); hemi.groundColor.set(e.hemi[1]); hemi.intensity=e.hemi[2]; sun.color.set(e.sun[0]); sun.intensity=e.sun[1]; sun.position.set(e.sun[2][0],e.sun[2][1],e.sun[2][2]); applyBloom(); }
const QUAL={ low:{pr:0.8,sh:0,post:0}, medium:{pr:1.25,sh:1024,post:0}, high:{pr:1.5,sh:2048,post:1}, ultra:{pr:2,sh:3072,post:1} };
function buildComposer(){ if(composer||!window.THREE||!THREE.EffectComposer) return; try{
  const sz=renderer.getDrawingBufferSize(new T.Vector2()); const P={minFilter:T.LinearFilter,magFilter:T.LinearFilter,format:T.RGBAFormat,encoding:T.sRGBEncoding};
  const ms=renderer.capabilities.isWebGL2&&T.WebGLMultisampleRenderTarget; const rt= ms? new T.WebGLMultisampleRenderTarget(sz.x,sz.y,P) : new T.WebGLRenderTarget(sz.x,sz.y,P);
  composer=new THREE.EffectComposer(renderer,rt); composer.addPass(new THREE.RenderPass(scene,camera)); bloomPass=new THREE.UnrealBloomPass(new T.Vector2(sz.x/2,sz.y/2),0.5,0.6,0.8); composer.addPass(bloomPass); applyBloom(); }catch(e){ console.warn('post off',e); composer=null; } }
function applyBloom(){ if(bloomPass&&curMap&&curMap.env.bloom){ const b=curMap.env.bloom; bloomPass.strength=b[0]; bloomPass.radius=b[1]; bloomPass.threshold=b[2]; } }
function drawFrame(){ lookFrame(); if(postOn&&composer) composer.render(); else renderer.render(scene,camera); }
let shadowSize=2048;
function applyQuality(q){ const d=QUAL[q]||QUAL.high; try{ bakeSetOn(q!=='low'); }catch(e){} try{ detailSetOn(q!=='low'); }catch(e){} postOn=!!d.post; if(postOn) buildComposer(); const dpr=window.devicePixelRatio||1; pixelRatio = d.pr<1 ? d.pr*Math.min(dpr,1.25) : (q==='ultra'? Math.max(1.25,Math.min(dpr,2)) : Math.min(dpr,d.pr));
  { const px=window.innerWidth*window.innerHeight, cap=q==='ultra'?6.0e6:4.2e6; if(px*pixelRatio*pixelRatio>cap) pixelRatio=Math.max(0.6,Math.sqrt(cap/px)); } // big screens: don't ask the graphics card for more pixels than it can hold
  renderer.setPixelRatio(pixelRatio*dynRes); resize();
  sun.castShadow=d.sh>0; if(d.sh>0&&d.sh!==shadowSize){ shadowSize=d.sh; sun.shadow.mapSize.set(d.sh,d.sh); if(sun.shadow.map){ sun.shadow.map.dispose(); sun.shadow.map=null; } } try{ lookQuality(q); }catch(e){ console.warn(e); } }
buildTextures(); buildMaterials();
