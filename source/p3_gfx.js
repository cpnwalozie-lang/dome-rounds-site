// ================= RENDERER / SCENE =================
const canvas=$('c');
const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
let pixelRatio=Math.min(window.devicePixelRatio||1,1.5); renderer.setPixelRatio(pixelRatio);
renderer.shadowMap.enabled=true; renderer.shadowMap.type=T.PCFSoftShadowMap;
renderer.outputEncoding=T.sRGBEncoding;
const scene=new T.Scene();
const HORIZON=0xf7b98a;
scene.fog=new T.Fog(col(HORIZON),70,330);
const camera=new T.PerspectiveCamera(68,1,0.1,900);
const hemi=new T.HemisphereLight(0xeaf6ff,0x6b88b8,0.62); scene.add(hemi);
const sun=new T.DirectionalLight(0xfff1d6,0.78); sun.position.set(22,38,14); sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-33; sun.shadow.camera.right=33; sun.shadow.camera.top=28; sun.shadow.camera.bottom=-28; sun.shadow.camera.near=5; sun.shadow.camera.far=95; sun.shadow.bias=-0.0006; sun.shadow.normalBias=0.03;
scene.add(sun); scene.add(sun.target);
let W=scene; // current map group: world builders add into this
let composer=null, bloomPass=null, postOn=false;
let dynRes=1; // live resolution scale (drops a little when the frame rate dips)
function resize(){ const w=window.innerWidth,h=window.innerHeight; renderer.setPixelRatio(pixelRatio*dynRes); renderer.setSize(w,h,false); if(composer){ composer.setPixelRatio(pixelRatio*dynRes); composer.setSize(w,h); } camera.aspect=w/h; camera.updateProjectionMatrix(); }
window.addEventListener('resize',resize); resize();
let animated=[]; // fn(t,dt) for the active map

// ================= TEXTURES =================
const maxAniso=Math.min(8,renderer.capabilities.getMaxAnisotropy());
const FONT='"Lilita One","Arial Black",Impact,sans-serif';
// Textures are drawn as shapes, so on capable machines they're simply drawn at twice the pixels.
const TXS=(()=>{ const q=settings.quality; const mob=/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)||Math.min(screen.width,screen.height)<700; if(q==='low'||q==='medium'||mob) return 1; return 2; })();
function txCtx(c,w,h){ const s=Math.min(TXS,4096/Math.max(w,h)); c.width=Math.round(w*s); c.height=Math.round(h*s); const g=c.getContext('2d'); if(s!==1){ g.scale(s,s); const st=g.setTransform.bind(g); g.setTransform=(a,b,cc,d,e,f)=>st(a*s,b*s,cc*s,d*s,e*s,f*s); } return g; }
function mkTex(w,h,draw,o={}){ const c=document.createElement('canvas'); const g=txCtx(c,w,h); draw(g,w,h); const t=new T.CanvasTexture(c); t.encoding=T.sRGBEncoding; t.anisotropy=maxAniso; if(o.clamp){ t.wrapS=t.wrapT=T.ClampToEdgeWrapping; } else t.wrapS=t.wrapT=T.RepeatWrapping; return t; }
const GRAD=(()=>{ const d=new Uint8Array([105,165,222,255]); const t=new T.DataTexture(d,4,1,T.LuminanceFormat); t.minFilter=t.magFilter=T.NearestFilter; t.needsUpdate=true; return t; })();
const toon=o=>{ const p=Object.assign({roughness:0.78,metalness:0.04},o); if(typeof p.color==='number'||typeof p.color==='string') p.color=col(p.color); if(typeof p.emissive==='number') p.emissive=col(p.emissive); return new T.MeshStandardMaterial(p); };
const basic=o=>{ const p=Object.assign({},o); if(typeof p.color==='number'||typeof p.color==='string') p.color=col(p.color); return new T.MeshBasicMaterial(p); };
function speckle(g,w,h,n,rng,a=0.06){ for(let i=0;i<n;i++){ g.fillStyle=`rgba(${rng()<0.5?0:255},${rng()<0.5?0:255},${rng()<0.5?0:255},${rng()*a})`; g.fillRect(rng()*w,rng()*h,1+rng()*2,1+rng()*2); } }
function drawSplat(g,x,y,r,color,rng,o={}){ // comic starburst (no paint)
  g.fillStyle=color; const N=11+Math.floor(rng()*4); g.beginPath(); for(let i=0;i<N*2;i++){ const a=i/(N*2)*Math.PI*2+0.2; const rr=(i%2? r*(0.62+rng()*0.1) : r*(1.0+rng()*0.25)); g.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr); } g.closePath(); g.fill(); g.lineJoin='round'; g.lineWidth=r*0.07; g.strokeStyle='#0b1026'; g.stroke(); }
function strokeText(g,txt,x,y,fill,stroke,lw){ g.lineJoin='round'; g.lineWidth=lw; g.strokeStyle=stroke; g.strokeText(txt,x,y); g.fillStyle=fill; g.fillText(txt,x,y); }
function drawBlobFace(g,x,y,r,bodyCol,mood){
  g.lineWidth=r*0.12; g.strokeStyle='#0b1026'; g.fillStyle=bodyCol; g.beginPath(); g.arc(x,y,r,0,7); g.fill(); g.stroke();
  g.fillStyle='rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(x-r*0.4,y-r*0.55,r*0.25,r*0.12,-0.5,0,7); g.fill();
  for(const sx of [-1,1]){ g.fillStyle='#fff'; g.beginPath(); g.ellipse(x+sx*r*0.32,y-r*0.05,r*0.2,r*0.27,0,0,7); g.fill(); g.lineWidth=r*0.06; g.stroke(); g.fillStyle='#0b1026'; g.beginPath(); g.arc(x+sx*r*0.32,y,r*0.11,0,7); g.fill();
    if(mood==='angry'){ g.lineWidth=r*0.12; g.lineCap='round'; g.beginPath(); g.moveTo(x+sx*r*0.58,y-r*0.5); g.lineTo(x+sx*r*0.12,y-r*0.28); g.stroke(); } }
  g.lineWidth=r*0.1; g.lineCap='round'; g.beginPath(); if(mood==='angry'){ g.moveTo(x-r*0.22,y+r*0.5); g.quadraticCurveTo(x,y+r*0.34,x+r*0.22,y+r*0.5); } else { g.moveTo(x-r*0.22,y+r*0.4); g.quadraticCurveTo(x,y+r*0.62,x+r*0.22,y+r*0.4); } g.stroke();
}
const TX={};
let HX=18, HZ=13;
function buildTextures(){
  // --- floor: one unique painted map, drawn in metres ---
  TX.floor=mkTex(2048,1024,(g,W,H)=>{
    const rng=RNG(7); g.setTransform(W/(2*HX),0,0,H/(2*HZ),W/2,H/2);
    g.fillStyle='#8f9aa8'; g.fillRect(-HX,-HZ,2*HX,2*HZ);
    for(let x=-HX;x<HX;x+=1.5) for(let z=-HZ;z<HZ;z+=1.5){ const v=rng(); g.fillStyle=`hsl(${208+v*8},${13+v*5}%,${77+v*9}%)`; g.fillRect(x+0.035,z+0.035,1.43,1.43); g.fillStyle='rgba(255,255,255,.35)'; g.fillRect(x+0.035,z+0.035,1.43,0.04); g.fillStyle='rgba(0,0,0,.08)'; g.fillRect(x+0.035,z+1.42,1.43,0.045); }
    // team zones
    const zone=(sx,c,c2)=>{ g.save(); g.globalAlpha=0.5; g.fillStyle=c; g.beginPath(); g.arc(sx*HX,0,10.5,0,7); g.fill(); g.globalAlpha=0.9; g.strokeStyle='#fff'; g.lineWidth=0.22; g.beginPath(); g.arc(sx*HX,0,10.5,0,7); g.stroke(); g.strokeStyle=c2; g.lineWidth=0.12; g.beginPath(); g.arc(sx*HX,0,9.9,0,7); g.stroke(); g.restore(); };
    zone(-1,'#19c8ff','#0b6c99'); zone(1,'#ff7a1a','#9a3d05');
    // centre ring + lanes
    g.strokeStyle='rgba(255,255,255,.92)'; g.lineWidth=0.26; g.beginPath(); g.arc(0,0,7.2,0,7); g.stroke();
    g.strokeStyle='rgba(255,225,77,.95)'; g.lineWidth=0.14; g.beginPath(); g.arc(0,0,6.6,0,7); g.stroke();
    g.setLineDash([0.9,0.6]); g.strokeStyle='rgba(255,255,255,.85)'; g.lineWidth=0.16; g.beginPath(); g.moveTo(-10,0); g.lineTo(-7.2,0); g.moveTo(7.2,0); g.lineTo(10,0); g.moveTo(0,-HZ+1); g.lineTo(0,-7.2); g.moveTo(0,7.2); g.lineTo(0,HZ-1); g.stroke(); g.setLineDash([]);
    // hazard bands on the open edges
    const haz=(x0,x1,z0,z1)=>{ g.save(); g.beginPath(); g.rect(x0,z0,x1-x0,z1-z0); g.clip(); g.fillStyle='#ffd21f'; g.fillRect(x0,z0,x1-x0,z1-z0); g.fillStyle='#1a1d29'; for(let x=x0-2;x<x1+2;x+=0.9){ g.beginPath(); g.moveTo(x,z0); g.lineTo(x+0.45,z0); g.lineTo(x+0.45+(z1-z0),z1); g.lineTo(x+(z1-z0),z1); g.closePath(); g.fill(); } g.restore(); };
    haz(-13,5,HZ-0.75,HZ-0.2); haz(-5,13,-HZ+0.2,-HZ+0.75);
    // stencils
    g.textAlign='center'; g.textBaseline='middle';
    const sten=(t,x,z,size,rot,c)=>{ g.save(); g.translate(x,z); g.rotate(rot); g.font=`${size}px ${FONT}`; g.fillStyle=c; g.globalAlpha=0.85; g.fillText(t,0,0); g.restore(); };
    sten('01',-10.2,7.2,2.6,0,'#fff'); sten('02',10.2,-7.2,2.6,0,'#fff');
    sten('MIND THE EDGE',-4,HZ-1.35,0.55,0,'#1a1d29'); sten('MIND THE EDGE',4,-HZ+1.35,0.55,Math.PI,'#1a1d29');
    // arrows toward centre
    const arrow=(x,z,rot,c)=>{ g.save(); g.translate(x,z); g.rotate(rot); g.fillStyle=c; g.globalAlpha=0.85; for(let i=0;i<3;i++){ g.beginPath(); g.moveTo(-0.6,i*0.8); g.lineTo(0,i*0.8-0.5); g.lineTo(0.6,i*0.8); g.lineTo(0.6,i*0.8+0.28); g.lineTo(0,i*0.8-0.22); g.lineTo(-0.6,i*0.8+0.28); g.closePath(); g.fill(); } g.restore(); };
    arrow(-6.4,0,Math.PI/2,'#fff'); arrow(6.4,0,-Math.PI/2,'#fff'); arrow(0,10.4,0,'#ffe14d'); arrow(0,-10.4,Math.PI,'#ffe14d');
    // crossings at ramps
    g.fillStyle='rgba(255,255,255,.85)'; for(let i=0;i<5;i++){ g.fillRect(-8.8,-1.9+i*0.85,1.3,0.42); g.fillRect(7.5,-1.9+i*0.85,1.3,0.42); }
    // drains
    for(const [x,z] of [[-4.5,6.6],[4.5,-6.6],[13,9],[-13,-9]]){ g.fillStyle='#3b4252'; g.fillRect(x-0.5,z-0.3,1,0.6); g.fillStyle='#1b1f2b'; for(let i=0;i<5;i++) g.fillRect(x-0.42+i*0.18,z-0.24,0.09,0.48); }
    // wear
    for(let i=0;i<5200;i++){ const x=-HX+rng()*2*HX, z=-HZ+rng()*2*HZ; g.fillStyle=`rgba(${205+rng()*20|0},${212+rng()*20|0},${222+rng()*16|0},${0.2+rng()*0.4})`; g.fillRect(x,z,0.04+rng()*0.16,0.04+rng()*0.1); }
    for(let i=0;i<34;i++){ const x=-HX+rng()*2*HX, z=-HZ+rng()*2*HZ, r=0.8+rng()*2.6; const gr=g.createRadialGradient(x,z,0,x,z,r); gr.addColorStop(0,'rgba(40,50,70,.13)'); gr.addColorStop(1,'rgba(40,50,70,0)'); g.fillStyle=gr; g.fillRect(x-r,z-r,2*r,2*r); }
    g.strokeStyle='rgba(50,58,75,.5)'; g.lineWidth=0.03; for(let i=0;i<12;i++){ let x=-HX+rng()*2*HX, z=-HZ+rng()*2*HZ; g.beginPath(); g.moveTo(x,z); for(let k=0;k<6;k++){ x+=(rng()-0.5)*1.4; z+=(rng()-0.5)*1.4; g.lineTo(x,z); } g.stroke(); }
    // sea-damp edges: salt-darkened concrete creeping in from the water
    for(const [x0,z0,x1,z1] of [[-HX,-HZ,-HX,-HZ+1.6],[-HX,HZ,-HX,HZ-1.6],[-HX,-HZ,-HX+1.6,-HZ],[HX,-HZ,HX-1.6,-HZ]]){ const lg=g.createLinearGradient(x0,z0,x1,z1); lg.addColorStop(0,'rgba(38,52,72,.2)'); lg.addColorStop(1,'rgba(38,52,72,0)'); g.fillStyle=lg; if(z0===z1) g.fillRect(Math.min(x0,x1),-HZ,Math.abs(x1-x0),2*HZ); else g.fillRect(-HX,Math.min(z0,z1),2*HX,Math.abs(z1-z0)); }
    for(let i=0;i<70;i++){ const side=rng()<0.5?-1:1, x=-HX+rng()*2*HX, z=side*(HZ-rng()*1.1), r=0.25+rng()*0.9; const gr=g.createRadialGradient(x,z,0,x,z,r); gr.addColorStop(0,'rgba(240,244,248,.16)'); gr.addColorStop(0.7,'rgba(240,244,248,.05)'); gr.addColorStop(1,'rgba(240,244,248,0)'); g.fillStyle=gr; g.fillRect(x-r,z-r,2*r,2*r); }
    // oil stains: soft dark pool with a darker rim
    for(let i=0;i<14;i++){ const x=-HX+2+rng()*(2*HX-4), z=-HZ+2+rng()*(2*HZ-4); g.save(); g.translate(x,z); g.rotate(rng()*6); g.scale(1,0.55+rng()*0.4); const r=0.35+rng()*0.75;
      const gr=g.createRadialGradient(0,0,r*0.1,0,0,r); gr.addColorStop(0,'rgba(30,34,46,.16)'); gr.addColorStop(0.82,'rgba(30,34,46,.1)'); gr.addColorStop(0.92,'rgba(22,24,34,.2)'); gr.addColorStop(1,'rgba(22,24,34,0)'); g.fillStyle=gr; g.beginPath(); g.arc(0,0,r,0,7); g.fill(); g.restore(); }
    // tyre scuffs from forklifts
    g.lineCap='round'; for(let i=0;i<9;i++){ const x=-HX+3+rng()*(2*HX-6), z=-HZ+3+rng()*(2*HZ-6), a=rng()*6, rr=2+rng()*5, sw=0.6+rng()*1.2; for(const off of [-0.42,0.42]){ g.strokeStyle=`rgba(28,30,40,${0.05+rng()*0.05})`; g.lineWidth=0.2; g.beginPath(); g.arc(x,z,rr+off,a,a+sw); g.stroke(); } }
    // fine aggregate grain (only visible up close, where it matters)
    for(let i=0;i<26000;i++){ const x=-HX+rng()*2*HX, z=-HZ+rng()*2*HZ, d=rng()<0.5; g.fillStyle=d?`rgba(60,66,80,${0.06+rng()*0.12})`:`rgba(255,255,255,${0.08+rng()*0.14})`; const sz=0.012+rng()*0.03; g.fillRect(x,z,sz,sz); }
  },{clamp:true});
  // --- block wall (tile = 2m) ---
  TX.block=mkTex(512,512,(g,W,H)=>{ const rng=RNG(11); g.fillStyle='#737d8c'; g.fillRect(0,0,W,H); const bh=H/4,bw=W/2; for(let r=0;r<4;r++) for(let c=-1;c<2;c++){ const x=c*bw+(r%2?bw/2:0), y=r*bh, v=rng(); g.fillStyle=`hsl(${212+v*8},${10+v*4}%,${74+v*9}%)`; g.fillRect(x+4,y+4,bw-8,bh-8); g.fillStyle='rgba(255,255,255,.5)'; g.fillRect(x+4,y+4,bw-8,5); g.fillStyle='rgba(20,30,50,.16)'; g.fillRect(x+4,y+bh-12,bw-8,8); } speckle(g,W,H,2400,rng,0.07); });
  TX.concrete=mkTex(256,256,(g,W,H)=>{ const rng=RNG(5); g.fillStyle='#c5ccd6'; g.fillRect(0,0,W,H); speckle(g,W,H,1600,rng,0.08); g.strokeStyle='rgba(60,70,90,.35)'; g.lineWidth=3; g.strokeRect(1.5,1.5,W-3,H-3); g.strokeStyle='rgba(255,255,255,.5)'; g.lineWidth=2; g.strokeRect(5,5,W-10,H-10); });
  TX.dock=mkTex(256,256,(g,W,H)=>{ const rng=RNG(9); const gr=g.createLinearGradient(0,0,0,H); gr.addColorStop(0,'#a9b3c1'); gr.addColorStop(0.55,'#7f8a9b'); gr.addColorStop(0.6,'#3f6b63'); gr.addColorStop(1,'#27433f'); g.fillStyle=gr; g.fillRect(0,0,W,H); speckle(g,W,H,1500,rng,0.1); g.fillStyle='rgba(0,0,0,.25)'; for(let x=0;x<W;x+=64) g.fillRect(x,0,3,H); },{});
  const crate=(base,frame,stencil)=>mkTex(256,256,(g,W,H)=>{ const rng=RNG(base.length*7+3); g.fillStyle=base; g.fillRect(0,0,W,H); for(let i=0;i<6;i++){ g.fillStyle=`rgba(0,0,0,${0.04+rng()*0.08})`; g.fillRect(0,i*43,W,43); g.fillStyle='rgba(0,0,0,.25)'; g.fillRect(0,i*43,W,3); } g.strokeStyle=frame; g.lineWidth=30; g.strokeRect(15,15,W-30,H-30); g.lineWidth=24; g.beginPath(); g.moveTo(24,24); g.lineTo(W-24,H-24); g.stroke(); g.strokeStyle='rgba(0,0,0,.3)'; g.lineWidth=3; g.strokeRect(30,30,W-60,H-60); g.strokeRect(1.5,1.5,W-3,H-3); g.fillStyle='#2a2f3d'; for(const [x,y] of [[15,15],[W-15,15],[15,H-15],[W-15,H-15]]){ g.beginPath(); g.arc(x,y,5,0,7); g.fill(); } if(stencil){ g.font=`44px ${FONT}`; g.textAlign='center'; g.textBaseline='middle'; g.fillStyle='rgba(20,24,40,.75)'; g.save(); g.translate(W/2,H/2); g.rotate(-0.12); g.fillText(stencil,0,0); g.restore(); } speckle(g,W,H,900,rng,0.08); });
  TX.crate=crate('#c9924f','#9a6530','FRAGILE'); TX.crateB=crate('#3d7fe8','#2458b8','DOME'); TX.crateO=crate('#f29a3a','#c96d14','THIS UP');
  TX.wood=mkTex(256,256,(g,W,H)=>{ const rng=RNG(21); for(let i=0;i<4;i++){ g.fillStyle=`hsl(28,${45+rng()*10}%,${52+rng()*8}%)`; g.fillRect(0,i*64,W,64); g.fillStyle='rgba(0,0,0,.3)'; g.fillRect(0,i*64,W,3); for(let k=0;k<5;k++){ g.strokeStyle='rgba(90,50,20,.25)'; g.lineWidth=1.5; g.beginPath(); const y=i*64+8+rng()*50; g.moveTo(0,y); g.bezierCurveTo(80,y+rng()*8-4,170,y+rng()*8-4,W,y); g.stroke(); } } });
  const container=(base,dark,logo,sub)=>({
    side:mkTex(1024,512,(g,W,H)=>{ const rng=RNG(logo.length*13); g.fillStyle=base; g.fillRect(0,0,W,H); for(let x=0;x<W;x+=40){ const gr=g.createLinearGradient(x,0,x+40,0); gr.addColorStop(0,'rgba(255,255,255,.16)'); gr.addColorStop(0.35,'rgba(255,255,255,0)'); gr.addColorStop(0.6,'rgba(0,0,0,.2)'); gr.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=gr; g.fillRect(x,36,40,H-72); } g.fillStyle=dark; g.fillRect(0,0,W,36); g.fillRect(0,H-36,W,36); g.fillRect(0,0,22,H); g.fillRect(W-22,0,22,H); g.font=`190px ${FONT}`; g.textAlign='center'; g.textBaseline='middle'; g.fillStyle='rgba(255,255,255,.93)'; g.fillText(logo,W/2,H/2-10); g.font=`44px ${FONT}`; g.fillStyle='rgba(255,255,255,.8)'; g.fillText(sub,W/2,H/2+118); g.fillStyle='#ffe14d'; g.fillRect(60,70,120,70); g.fillStyle='#1a1d29'; g.font=`30px ${FONT}`; g.fillText('22G1',120,106); for(let i=0;i<26;i++){ const x=rng()*W, y=40+rng()*120, l=40+rng()*220; const gr=g.createLinearGradient(0,y,0,y+l); gr.addColorStop(0,'rgba(90,45,20,.28)'); gr.addColorStop(1,'rgba(90,45,20,0)'); g.fillStyle=gr; g.fillRect(x,y,3+rng()*6,l); } for(let i=0;i<500;i++){ g.fillStyle=base; g.globalAlpha=0.5; g.fillRect(W*0.2+rng()*W*0.6,H*0.25+rng()*H*0.5,2+rng()*6,2+rng()*3); } g.globalAlpha=1; },{clamp:true}),
    end:mkTex(512,512,(g,W,H)=>{ g.fillStyle=base; g.fillRect(0,0,W,H); g.fillStyle=dark; g.fillRect(0,0,W,30); g.fillRect(0,H-30,W,30); g.fillRect(0,0,24,H); g.fillRect(W-24,0,24,H); g.fillRect(W/2-6,30,12,H-60); g.strokeStyle='rgba(0,0,0,.28)'; g.lineWidth=4; for(let y=70;y<H-40;y+=56){ g.beginPath(); g.moveTo(30,y); g.lineTo(W-30,y); g.stroke(); } g.strokeStyle='#d9dee8'; g.lineWidth=9; for(const x of [130,200,312,382]){ g.beginPath(); g.moveTo(x,44); g.lineTo(x,H-44); g.stroke(); } g.fillStyle='#d9dee8'; for(const x of [130,200,312,382]) g.fillRect(x-22,H/2-10,44,20); },{clamp:true}),
    top:mkTex(128,128,(g,W,H)=>{ g.fillStyle=dark; g.fillRect(0,0,W,H); for(let x=0;x<W;x+=16){ g.fillStyle='rgba(255,255,255,.1)'; g.fillRect(x,0,7,H); } }),
  });
  TX.contTeal=container('#17a79c','#0e7269','DOMECO','SHIPPING CO.');
  TX.contBlue=container('#2f6fe4','#1f4fb0','TIDELINE','FREIGHT');
  TX.contOrange=container('#f2892e','#c4630f','BLOBWORKS','EST. 2026');
  const wallBase=(g,W,H,rng)=>{ g.fillStyle='#737d8c'; g.fillRect(0,0,W,H); const rows=3, bh=H/rows, bw=W/3.5; for(let r=0;r<rows;r++) for(let c=-1;c<5;c++){ const x=c*bw+(r%2?bw/2:0), y=r*bh, v=rng(); g.fillStyle=`hsl(${212+v*8},${10+v*4}%,${75+v*8}%)`; g.fillRect(x+5,y+5,bw-10,bh-10); g.fillStyle='rgba(255,255,255,.5)'; g.fillRect(x+5,y+5,bw-10,6); g.fillStyle='rgba(20,30,50,.15)'; g.fillRect(x+5,y+bh-14,bw-10,9); } };
  TX.graffA=mkTex(1024,512,(g,W,H)=>{ const rng=RNG(31); wallBase(g,W,H,rng); drawSplat(g,170,300,120,'#ff4fa3',rng,{drips:4}); drawSplat(g,880,190,105,'#19c8ff',rng,{drips:3}); drawSplat(g,560,420,60,'#ffe14d',rng); g.save(); g.translate(W/2,H/2+10); g.rotate(-0.07); g.font=`290px ${FONT}`; g.textAlign='center'; g.textBaseline='middle'; g.lineJoin='round'; g.lineWidth=46; g.strokeStyle='#0b1026'; g.strokeText('DOME!',0,0); g.lineWidth=20; g.strokeStyle='#fff'; g.strokeText('DOME!',0,0); const gr=g.createLinearGradient(0,-120,0,120); gr.addColorStop(0,'#3fe0ff'); gr.addColorStop(0.55,'#2f7bff'); gr.addColorStop(1,'#a44dff'); g.fillStyle=gr; g.fillText('DOME!',0,0); g.fillStyle='rgba(255,255,255,.7)'; for(const [x,y] of [[-330,-70],[-150,-80],[40,-76],[220,-74]]){ g.beginPath(); g.ellipse(x,y,26,10,-0.4,0,7); g.fill(); } g.restore(); speckle(g,W,H,3000,rng,0.06); },{clamp:true});
  TX.graffB=mkTex(1024,512,(g,W,H)=>{ const rng=RNG(47); wallBase(g,W,H,rng); drawSplat(g,250,250,170,'#ff7a1a',rng,{drips:5}); drawBlobFace(g,250,240,110,'#ffa24d','angry'); drawSplat(g,930,400,70,'#5dff9b',rng); g.save(); g.translate(690,250); g.rotate(0.06); g.font=`230px ${FONT}`; g.textAlign='center'; g.textBaseline='middle'; g.lineJoin='round'; g.lineWidth=44; g.strokeStyle='#0b1026'; g.strokeText('POP!',0,0); g.lineWidth=18; g.strokeStyle='#fff'; g.strokeText('POP!',0,0); const gr=g.createLinearGradient(0,-100,0,100); gr.addColorStop(0,'#ffe14d'); gr.addColorStop(1,'#ff4fa3'); g.fillStyle=gr; g.fillText('POP!',0,0); g.restore(); g.fillStyle='#fff'; for(const [x,y,s] of [[470,90,26],[930,110,34],[520,440,20]]){ g.beginPath(); for(let i=0;i<10;i++){ const a=i*Math.PI/5-Math.PI/2, r=i%2?s*0.42:s; g.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r); } g.closePath(); g.fill(); g.lineWidth=6; g.strokeStyle='#0b1026'; g.stroke(); } speckle(g,W,H,3000,rng,0.06); },{clamp:true});
  TX.chevron=mkTex(512,128,(g,W,H)=>{ g.fillStyle='#16a39c'; g.fillRect(0,0,W,H); g.fillStyle='#fff'; for(let x=-40;x<W+40;x+=128){ g.beginPath(); g.moveTo(x,10); g.lineTo(x+44,10); g.lineTo(x+96,H/2); g.lineTo(x+44,H-10); g.lineTo(x,H-10); g.lineTo(x+52,H/2); g.closePath(); g.fill(); } g.fillStyle='#0c6e69'; g.fillRect(0,0,W,8); g.fillRect(0,H-12,W,12); });
  TX.hazard=mkTex(256,64,(g,W,H)=>{ g.fillStyle='#ffd21f'; g.fillRect(0,0,W,H); g.fillStyle='#1a1d29'; for(let i=-H;i<W+H;i+=64){ g.beginPath(); g.moveTo(i,0); g.lineTo(i+32,0); g.lineTo(i+32+H,H); g.lineTo(i+H,H); g.closePath(); g.fill(); } });
  const vend=(body,name,glow)=>mkTex(256,512,(g,W,H)=>{ const rng=RNG(name.length*5); g.fillStyle=body; g.fillRect(0,0,W,H); g.fillStyle='rgba(255,255,255,.14)'; g.fillRect(0,0,W,12); g.fillStyle='#0d1326'; g.fillRect(18,84,W-36,270); g.fillStyle=glow; g.globalAlpha=0.18; g.fillRect(18,84,W-36,270); g.globalAlpha=1; const cols=['#ff4fa3','#19c8ff','#ffe14d','#5dff9b','#ff7a1a','#b9a2ff']; for(let r=0;r<4;r++){ g.fillStyle='#c9d2e3'; g.fillRect(18,84+r*67+58,W-36,7); for(let c=0;c<5;c++){ g.fillStyle=cols[(r*2+c)%6]; const x=36+c*40, y=84+r*67+12; g.fillRect(x,y,24,44); g.fillStyle='rgba(255,255,255,.6)'; g.fillRect(x+3,y+4,5,36); g.fillStyle='#fff'; g.fillRect(x,y+16,24,9); } } g.font=`52px ${FONT}`; g.textAlign='center'; g.textBaseline='middle'; g.lineJoin='round'; strokeText(g,name,W/2,46,'#fff','#0b1026',10); g.fillStyle='#0d1326'; g.fillRect(30,380,W-60,70); g.fillStyle='#1c2542'; g.fillRect(38,388,W-76,54); g.fillStyle=glow; g.fillRect(W-70,462,40,20); g.fillStyle='#c9d2e3'; g.fillRect(32,462,60,20); g.strokeStyle='rgba(0,0,0,.35)'; g.lineWidth=6; g.strokeRect(3,3,W-6,H-6); },{clamp:true});
  TX.vendA=vend('#e23d6d','FIZZO','#ff9ec4'); TX.vendB=vend('#2a9df4','GLUG','#9be7ff');
  const stripes=(a,b)=>mkTex(256,64,(g,W,H)=>{ for(let i=0;i<8;i++){ g.fillStyle=i%2?a:b; g.fillRect(i*32,0,32,H); } g.fillStyle='rgba(0,0,0,.12)'; g.fillRect(0,H-10,W,10); });
  TX.awnRed=stripes('#f2484b','#ffffff'); TX.awnTeal=stripes('#16a39c','#fff3c4');
  const banner=(c,dark,label,team)=>mkTex(256,512,(g,W,H)=>{ g.fillStyle=c; g.fillRect(0,0,W,H); g.fillStyle=dark; g.fillRect(0,0,W,26); g.fillRect(0,H-26,W,26); g.fillStyle='rgba(255,255,255,.2)'; for(let i=0;i<5;i++){ g.beginPath(); g.moveTo(0,330+i*36); g.lineTo(W/2,300+i*36); g.lineTo(W,330+i*36); g.lineTo(W,344+i*36); g.lineTo(W/2,314+i*36); g.lineTo(0,344+i*36); g.fill(); } drawBlobFace(g,W/2,150,74,team==='p'?'#8fe9ff':'#ffc27a',team==='p'?'':'angry'); g.font=`56px ${FONT}`; g.textAlign='center'; g.textBaseline='middle'; g.lineJoin='round'; strokeText(g,label,W/2,268,'#fff','#0b1026',12); },{clamp:true});
  TX.bannerP=banner('#19b4f0','#0b6c99','YOU','p'); TX.bannerB=banner('#ff7a1a','#9a3d05','BOT','b');
  TX.billboard=mkTex(1024,512,(g,W,H)=>{ const rng=RNG(77); const gr=g.createLinearGradient(0,0,W,H); gr.addColorStop(0,'#1b2a6b'); gr.addColorStop(1,'#5b2a8f'); g.fillStyle=gr; g.fillRect(0,0,W,H); g.fillStyle='rgba(255,255,255,.06)'; for(let y=0;y<H;y+=22) for(let x=(y/22%2)*11;x<W;x+=22){ g.beginPath(); g.arc(x,y,4,0,7); g.fill(); } drawSplat(g,200,270,170,'#19c8ff',rng,{drips:3}); drawSplat(g,850,230,160,'#ff7a1a',rng,{drips:3}); drawBlobFace(g,170,280,92,'#5bdcff',''); drawBlobFace(g,870,250,86,'#ffa24d','angry'); g.textAlign='center'; g.textBaseline='middle'; g.lineJoin='round'; g.save(); g.translate(W/2,262); g.rotate(-0.04); let fs=220; g.font=`${fs}px ${FONT}`; const tw=g.measureText('DOMES').width; if(tw>500){ fs=Math.floor(fs*500/tw); g.font=`${fs}px ${FONT}`; } strokeText(g,'DOMES',0,0,'#ffe14d','#0b1026',38); g.restore(); g.font=`40px ${FONT}`; strokeText(g,'STACK THE CHAOS',W/2,452,'#5dff9b','#0b1026',12); g.strokeStyle='#0b1026'; g.lineWidth=16; g.strokeRect(8,8,W-16,H-16); },{clamp:true});
  TX.sign=(t,c)=>mkTex(512,128,(g,W,H)=>{ g.fillStyle='#0b1026'; g.fillRect(0,0,W,H); g.fillStyle=c; g.fillRect(8,8,W-16,H-16); g.font=`84px ${FONT}`; g.textAlign='center'; g.textBaseline='middle'; g.lineJoin='round'; strokeText(g,t,W/2,H/2+4,'#fff','#0b1026',16); },{clamp:true});
  // --- fx textures ---
  TX.glow=mkTex(128,128,(g,W,H)=>{ const gr=g.createRadialGradient(64,64,0,64,64,64); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.25,'rgba(255,255,255,.55)'); gr.addColorStop(0.6,'rgba(255,255,255,.12)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,W,H); },{clamp:true});
  TX.flash=mkTex(128,128,(g,W,H)=>{ g.translate(64,64); g.fillStyle='#fff'; g.beginPath(); for(let i=0;i<16;i++){ const a=i*Math.PI/8, r=i%2?16:(i%4?40:62); g.lineTo(Math.cos(a)*r,Math.sin(a)*r); } g.closePath(); g.fill(); },{clamp:true});
  TX.contact=mkTex(128,128,(g,W,H)=>{ for(let i=0;i<22;i++){ g.fillStyle='rgba(10,16,34,0.055)'; const k=i*2.4; g.beginPath(); const r=18; const x=k,y=k,w=W-2*k,h=H-2*k; g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.fill(); } },{clamp:true});
  TX.ring=mkTex(512,512,(g,W,H)=>{ g.translate(256,256); g.strokeStyle='#fff'; g.lineWidth=10; g.setLineDash([40,24]); g.beginPath(); g.arc(0,0,244,0,7); g.stroke(); g.setLineDash([]); g.lineWidth=3; g.globalAlpha=0.6; g.beginPath(); g.arc(0,0,226,0,7); g.stroke(); const gr=g.createRadialGradient(0,0,120,0,0,250); gr.addColorStop(0,'rgba(255,255,255,0)'); gr.addColorStop(1,'rgba(255,255,255,.28)'); g.globalAlpha=1; g.fillStyle=gr; g.beginPath(); g.arc(0,0,244,0,7); g.fill(); },{clamp:true});
  TX.pad=(c,c2)=>mkTex(512,512,(g,W,H)=>{ g.translate(256,256); g.fillStyle=c; g.beginPath(); g.arc(0,0,250,0,7); g.fill(); g.strokeStyle='#fff'; g.lineWidth=18; g.beginPath(); g.arc(0,0,236,0,7); g.stroke(); g.strokeStyle=c2; g.lineWidth=10; g.beginPath(); g.arc(0,0,200,0,7); g.stroke(); g.fillStyle='#fff'; g.beginPath(); g.arc(0,30,120,Math.PI,0); g.closePath(); g.fill(); g.fillStyle=c2; g.beginPath(); g.arc(0,30,84,Math.PI,0); g.closePath(); g.fill(); g.fillStyle='#fff'; g.fillRect(-150,44,300,22); },{clamp:true});
  TX.hill=mkTex(8,128,(g,W,H)=>{ const gr=g.createLinearGradient(0,0,0,H); gr.addColorStop(0,'#7fd08a'); gr.addColorStop(0.5,'#5db98a'); gr.addColorStop(1,'#a8dcea'); g.fillStyle=gr; g.fillRect(0,0,W,H); },{clamp:true});
  TX.hillFar=mkTex(8,128,(g,W,H)=>{ const gr=g.createLinearGradient(0,0,0,H); gr.addColorStop(0,'#8fb8e8'); gr.addColorStop(1,'#c4e6fb'); g.fillStyle=gr; g.fillRect(0,0,W,H); },{clamp:true});
}

// ================= WORLD =================
let boxes=[]; // {min,max}
let ramps=[]; // {minX,maxX,minZ,maxZ,axis,lowAtMin,hLow,hHigh}
const M={};
// Boxes get softly rounded edges (they catch the light like real cast concrete / painted steel); thin trims stay sharp.
const BEVEL={ on:true };
function bevelR(w,h,d){ const m=Math.min(w,h,d); if(!BEVEL.on||m<0.3) return 0; return Math.min(0.075,m*0.09); }
function boxGeo(w,h,d,tile){ const r=bevelR(w,h,d); const g=r>0? new T.BoxGeometry(w,h,d,3,3,3) : new T.BoxGeometry(w,h,d); const dims=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];
  if(r>0){ const pos=g.attributes.position, nor=g.attributes.normal, uv=g.attributes.uv, hs=[w/2,h/2,d/2], v=new T.Vector3(), inn=new T.Vector3(), fn=new T.Vector3();
    const rm=(x,hh)=>{ const f=x/hh; return Math.abs(Math.abs(f)-1/3)<1e-4? Math.sign(f)*(hh-r) : x; };
    for(let i=0;i<pos.count;i++){ v.set(rm(pos.getX(i),hs[0]),rm(pos.getY(i),hs[1]),rm(pos.getZ(i),hs[2])); fn.set(nor.getX(i),nor.getY(i),nor.getZ(i));
      inn.set(Math.max(-hs[0]+r,Math.min(hs[0]-r,v.x)),Math.max(-hs[1]+r,Math.min(hs[1]-r,v.y)),Math.max(-hs[2]+r,Math.min(hs[2]-r,v.z)));
      const dv=v.clone().sub(inn); const L=dv.length(); if(L>1e-5){ dv.multiplyScalar(1/L); const dd=inn.clone().add(dv.clone().multiplyScalar(r)); const t=Math.min(1,L/(r*Math.SQRT2)); pos.setXYZ(i,dd.x,dd.y,dd.z); fn.lerp(dv,0.5+0.5*t).normalize(); } nor.setXYZ(i,fn.x,fn.y,fn.z); }
    const per=16; for(let f=0;f<6;f++){ const du=dims[f][0], dvv=dims[f][1]; for(let i=0;i<per;i++){ const k=f*per+i; let a=uv.getX(k), b=uv.getY(k); const mp=(x,dm)=>Math.abs(x-1/3)<1e-4? r/dm : Math.abs(x-2/3)<1e-4? 1-r/dm : x; uv.setXY(k,mp(a,du),mp(b,dvv)); } } }
  if(tile){ const uv=g.attributes.uv; const per=uv.count/6; for(let f=0;f<6;f++) for(let i=0;i<per;i++){ const k=f*per+i; uv.setXY(k,uv.getX(k)*dims[f][0]/tile,uv.getY(k)*dims[f][1]/tile); } } return g; }
function collider(x0,x1,y0,y1,z0,z1,noCam){ boxes.push({min:V3(x0,y0,z0),max:V3(x1,y1,z1),noCam:!!noCam}); }
const MX=(x,y,z,rx=0,ry=0,rz=0,sx=1,sy=1,sz=1)=>new T.Matrix4().compose(V3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(rx,ry,rz)),V3(sx,sy,sz));
function mergeGeos(list){ let n=0; const parts=list.map(([g,m])=>{ const q=g.index?g.toNonIndexed():g.clone(); g.dispose(); if(m) q.applyMatrix4(m); if(!q.attributes.normal) q.computeVertexNormals(); n+=q.attributes.position.count; return q; });
  const pos=new Float32Array(n*3), nor=new Float32Array(n*3), uv=new Float32Array(n*2); let o=0;
  for(const q of parts){ const c=q.attributes.position.count; pos.set(q.attributes.position.array,o*3); nor.set(q.attributes.normal.array,o*3); if(q.attributes.uv) uv.set(q.attributes.uv.array,o*2); o+=c; q.dispose(); }
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(pos,3)); g.setAttribute('normal',new T.BufferAttribute(nor,3)); g.setAttribute('uv',new T.BufferAttribute(uv,2)); return g; }
function addMerged(list,mat,o={}){ const m=new T.Mesh(mergeGeos(list),mat); m.castShadow=o.cast!==false; m.receiveShadow=true; (o.parent||W).add(m); return m; }
const hash01=(a,b=0)=>{ const s=Math.sin(a*127.1+b*311.7)*43758.5453; return s-Math.floor(s); };
// raised edge battens + corner brackets for any crate-like box
function boxEdges(x0,x1,y0,y1,z0,z1,t,mat,cornerMat){ const w=x1-x0,h=y1-y0,d=z1-z0,cx=(x0+x1)/2,cy=(y0+y1)/2,cz=(z0+z1)/2,L=[];
  for(const y of [y0,y1]) for(const z of [z0,z1]) L.push([new T.BoxGeometry(w+t*0.5,t,t),MX(cx,y,z)]);
  for(const x of [x0,x1]) for(const z of [z0,z1]) L.push([new T.BoxGeometry(t,h,t),MX(x,cy,z)]);
  for(const x of [x0,x1]) for(const y of [y0,y1]) L.push([new T.BoxGeometry(t,t,d+t*0.5),MX(x,y,cz)]);
  addMerged(L,mat); if(cornerMat){ const C=[]; for(const x of [x0,x1]) for(const y of [y0,y1]) for(const z of [z0,z1]) C.push([new T.BoxGeometry(t*1.7,t*1.7,t*1.7),MX(x,y,z)]); addMerged(C,cornerMat,{cast:false}); } }
function propCol(x,z,r,y0,y1){ collider(x-r,x+r,y0,y1,z-r,z+r,true); if(r<0.3) boxes[boxes.length-1].noStand=true; }
// close any gap between solid objects that is narrower than a body, so nobody gets wedged half inside two things
function sealGaps(rad){ const out=[], L=boxes.filter(b=>!b.filler&&!b.noSeal&&(b.max.x-b.min.x)<40&&(b.max.y-b.min.y)>=0.3);
  for(let i=0;i<L.length;i++) for(let j=i+1;j<L.length;j++){ const a=L[i], b=L[j]; const yLo=Math.max(a.min.y,b.min.y), yHi=Math.min(a.max.y,b.max.y); if(yHi-yLo<0.3) continue;
    const gx=Math.max(0,b.min.x-a.max.x,a.min.x-b.max.x), gz=Math.max(0,b.min.z-a.max.z,a.min.z-b.max.z); if(gx===0&&gz===0) continue; if(Math.hypot(gx,gz)>=2*rad*0.98) continue;
    const rx=gx>0?(a.max.x<=b.min.x?[a.max.x,b.min.x]:[b.max.x,a.min.x]):[Math.max(a.min.x,b.min.x),Math.min(a.max.x,b.max.x)];
    const rz=gz>0?(a.max.z<=b.min.z?[a.max.z,b.min.z]:[b.max.z,a.min.z]):[Math.max(a.min.z,b.min.z),Math.min(a.max.z,b.max.z)];
    const floor=groundAt((rx[0]+rx[1])/2,(rz[0]+rz[1])/2,yLo+0.05,0); if(floor!==null&&floor+CFG.step>=yHi) continue;
    out.push({min:V3(rx[0],Math.min(a.min.y,b.min.y),rz[0]),max:V3(rx[1],yHi,rz[1]),noCam:true,filler:true}); }
  for(const f of out) boxes.push(f); return out.length; }
function meshBox(x0,x1,y0,y1,z0,z1,mats,tile,o={}){ const m=new T.Mesh(boxGeo(x1-x0,y1-y0,z1-z0,tile),mats); m.position.set((x0+x1)/2,(y0+y1)/2,(z0+z1)/2); m.castShadow=o.cast!==false; m.receiveShadow=true; W.add(m); return m; }
function contact(x0,x1,z0,z1,y,pad=0.55,op=0.9){ const m=new T.Mesh(new T.PlaneGeometry(x1-x0+pad*2,z1-z0+pad*2),M.contact); m.material=M.contact; m.rotation.x=-Math.PI/2; m.position.set((x0+x1)/2,y+0.012,(z0+z1)/2); m.renderOrder=1; W.add(m); return m; }
function solid(x0,x1,y0,y1,z0,z1,mats,tile,o={}){ collider(x0,x1,y0,y1,z0,z1); if(o.shadow!==false) contact(x0,x1,z0,z1,y0); return meshBox(x0,x1,y0,y1,z0,z1,mats,tile,o); }
function rampHeight(r,x,z){ let t = r.axis==='x' ? (x-r.minX)/(r.maxX-r.minX) : (z-r.minZ)/(r.maxZ-r.minZ); t=clamp(t,0,1); if(!r.lowAtMin) t=1-t; return lerp(r.hLow,r.hHigh,t); }
function rampNormal(r){ const dh=r.hHigh-r.hLow; const len=r.axis==='x'?(r.maxX-r.minX):(r.maxZ-r.minZ); const slope=dh/len*(r.lowAtMin?1:-1); return (r.axis==='x'? V3(-slope,1,0) : V3(0,1,-slope)).normalize(); }
function addRamp(minX,maxX,minZ,maxZ,axis,lowAtMin,hLow,hHigh){
  const r={minX,maxX,minZ,maxZ,axis,lowAtMin,hLow,hHigh}; ramps.push(r);
  const yAt=(x,z)=>rampHeight(r,x,z); const c=[[minX,minZ],[maxX,minZ],[maxX,maxZ],[minX,maxZ]];
  const top=c.map(p=>[p[0],yAt(p[0],p[1]),p[1]]), bot=c.map(p=>[p[0],Math.min(hLow,hHigh)-0.001,p[1]]);
  const mk=(quads,mat)=>{ const verts=[],uvs=[]; for(const q of quads){ const [a,b,cc,d,su,sv]=q; verts.push(...a,...b,...cc,...a,...cc,...d); uvs.push(0,0,su,0,su,sv,0,0,su,sv,0,sv); } const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(verts,3)); g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2)); g.computeVertexNormals(); const m=new T.Mesh(g,mat); m.castShadow=true; m.receiveShadow=true; W.add(m); return m; };
  const lx=(maxX-minX)/2, lz=(maxZ-minZ)/2;
  mk([[top[0],top[3],top[2],top[1],lz,lx]],M.rampTop);
  mk([[top[0],top[1],bot[1],bot[0],1,1],[top[1],top[2],bot[2],bot[1],1,1],[top[2],top[3],bot[3],bot[2],1,1],[top[3],top[0],bot[0],bot[3],1,1]],M.rampSide);
  contact(minX,maxX,minZ,maxZ,Math.min(hLow,hHigh),0.3);
  // side stripes
  const n=rampNormal(r);
  for(const s of [-1,1]){ const st=new T.Mesh(new T.PlaneGeometry(axis==='x'?Math.hypot(maxX-minX,hHigh-hLow):0.22, axis==='x'?0.22:Math.hypot(maxZ-minZ,hHigh-hLow)),M.yellowFlat); st.position.set(axis==='x'?(minX+maxX)/2:(s<0?minX+0.16:maxX-0.16),(hLow+hHigh)/2+0.012,axis==='x'?(s<0?minZ+0.16:maxZ-0.16):(minZ+maxZ)/2); st.quaternion.setFromUnitVectors(V3(0,0,1),n); W.add(st); }
}
function sprite(color,scale,op=1){ const s=new T.Sprite(new T.SpriteMaterial({map:TX.glow,color:col(color),blending:T.AdditiveBlending,depthWrite:false,transparent:true,opacity:op})); s.scale.setScalar(scale); return s; }
function outl(){ return {scale:{set(){},setScalar(){}},position:{set(){}}}; } // outlines removed for the less cartoony look

function buildMaterials(){
  M.outline=new T.MeshBasicMaterial({color:col(INK),side:T.BackSide});
  M.contact=new T.MeshBasicMaterial({map:TX.contact,transparent:true,depthWrite:false,opacity:0.95,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  M.block=toon({map:TX.block}); M.blockP=toon({map:TX.block,color:0x7fd6ff}); M.blockB=toon({map:TX.block,color:0xffb072}); M.blockDark=toon({map:TX.block,color:0x8a94a8});
  M.concrete=toon({map:TX.concrete}); M.dock=toon({map:TX.dock}); M.rampTop=toon({map:TX.concrete,color:0xe9edf3}); M.rampSide=toon({color:0x8d98a9});
  M.crate=toon({map:TX.crate}); M.crateB=toon({map:TX.crateB}); M.crateO=toon({map:TX.crateO}); M.wood=toon({map:TX.wood});
  M.dark=toon({color:0x2a3147}); M.navy=toon({color:0x1b2340}); M.white=toon({color:0xf4f6fb}); M.yellow=toon({color:0xffd21f}); M.metal=toon({color:0xaab4c8}); M.red=toon({color:0xe2483d}); M.teal=toon({color:0x16a39c});
  M.yellowFlat=basic({color:0xffd21f,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  M.hazard=toon({map:TX.hazard}); M.chevron=toon({map:TX.chevron});
  M.leaf=toon({color:0x2fae55,side:T.DoubleSide}); M.leaf2=toon({color:0x4ccf6a,side:T.DoubleSide}); M.trunk=toon({color:0x9a6a3a});
  M.cloud=toon({color:0xffffff,emissive:0xb9d4f2,emissiveIntensity:0.55});
}
const contMats=(tx,axis)=>{ const s=toon({map:tx.side}), e=toon({map:tx.end}), t=toon({map:tx.top}); return axis==='x'? [e,e,t,t,s,s] : [s,s,t,t,e,e]; };

// ---------- props ----------
function containerBox(x0,x1,y0,y1,z0,z1,tx){ const axis=(x1-x0)>=(z1-z0)?'x':'z'; const m=solid(x0,x1,y0,y1,z0,z1,contMats(tx,axis)); const fr=new T.Mesh(new T.BoxGeometry(x1-x0+0.1,0.14,z1-z0+0.1),M.navy); collider(x0-0.05,x1+0.05,y1,y1+0.1,z0-0.05,z1+0.05); fr.position.set((x0+x1)/2,y1+0.03,(z0+z1)/2); fr.castShadow=true; W.add(fr); const fr2=fr.clone(); fr2.position.y=y0+0.05; W.add(fr2);
  { const P=[], C=[], B=[], cx=(x0+x1)/2, cz=(z0+z1)/2, h=y1-y0;
    for(const x of [x0,x1]) for(const z of [z0,z1]){ P.push([new T.BoxGeometry(0.13,h,0.13),MX(x,(y0+y1)/2,z)]); for(const y of [y0+0.09,y1-0.04]) C.push([new T.BoxGeometry(0.2,0.17,0.2),MX(x,y,z)]); }
    addMerged(P,M.navy); addMerged(C,M.metal,{cast:false});
    // doors on the +end: four locking bars with handles and keepers
    const along=axis==='x', ex=along?x1+0.035:cx, ez=along?cz:z1+0.035, span=along?(z1-z0):(x1-x0);
    for(let i=0;i<4;i++){ const o=(-0.36+i*0.24)*span; const bx=along?ex:cx+o, bz=along?cz+o:ez;
      B.push([new T.CylinderGeometry(0.028,0.028,h-0.3,10),MX(bx,(y0+y1)/2,bz)]);
      for(const y of [y0+0.25,y1-0.25]) B.push([new T.BoxGeometry(along?0.05:0.1,0.07,along?0.1:0.05),MX(bx,y,bz)]);
      B.push([new T.BoxGeometry(along?0.04:0.24,0.05,along?0.24:0.04),MX(along?bx+0.03:bx,y0+h*0.45,along?bz:bz+0.03)]); }
    addMerged(B,M.metal); }
  return m; }
function crateBox(x0,x1,y0,y1,z0,z1,mat){ mat=mat||M.crate; const m=solid(x0,x1,y0,y1,z0,z1,mat); collider(x0-0.08,x1+0.08,y0,y1+0.08,z0-0.08,z1+0.08); const fc=mat===M.crateB?0x1d4a9e:mat===M.crateO?0xb05e10:0x84552a; boxEdges(x0,x1,y0,y1,z0,z1,0.1,toon({color:fc}),M.metal); return m; }
function blockWall(x0,x1,y0,y1,z0,z1,graff){ let mats=M.block, tile=2; if(graff){ const gm=toon({map:graff}); const long=(x1-x0)>=(z1-z0); const pl=toon({map:TX.block}); mats= long? [pl,pl,M.concrete,M.concrete,gm,gm] : [gm,gm,M.concrete,M.concrete,pl,pl]; tile=0; }
  const m=solid(x0,x1,y0,y1,z0,z1,mats,tile); const cap=new T.Mesh(new T.BoxGeometry(x1-x0+0.16,0.14,z1-z0+0.16),M.rampSide); collider(x0-0.08,x1+0.08,y1,y1+0.14,z0-0.08,z1+0.08); cap.position.set((x0+x1)/2,y1+0.07,(z0+z1)/2); cap.castShadow=true; cap.receiveShadow=true; W.add(cap); return m; }
function chevronBarrier(x0,x1,z0,z1){ const long=(x1-x0)>=(z1-z0); const L=long?(x1-x0):(z1-z0), w=long?(z1-z0):(x1-x0), cx=(x0+x1)/2, cz=(z0+z1)/2;
  collider(x0,x1,0,1.0,z0,z1); contact(x0,x1,z0,z1,0);
  const hw=w/2, sh=new T.Shape(); sh.moveTo(-hw,0); sh.lineTo(hw,0); sh.lineTo(hw,0.16); sh.lineTo(hw*0.66,0.34); sh.lineTo(hw*0.5,0.93); sh.quadraticCurveTo(hw*0.5,1.0,hw*0.38,1.0); sh.lineTo(-hw*0.38,1.0); sh.quadraticCurveTo(-hw*0.5,1.0,-hw*0.5,0.93); sh.lineTo(-hw*0.66,0.34); sh.lineTo(-hw,0.16); sh.lineTo(-hw,0);
  const bg=new T.ExtrudeGeometry(sh,{depth:L,bevelEnabled:false,curveSegments:3}); bg.translate(0,0,-L/2); if(long) bg.rotateY(Math.PI/2);
  const body=new T.Mesh(bg,M.teal); body.position.set(cx,0,cz); body.castShadow=body.receiveShadow=true; W.add(body);
  const ch=TX.chevron.clone(); ch.wrapS=T.RepeatWrapping; ch.repeat.set(L/1.6,1); ch.needsUpdate=true; const cm=toon({map:ch});
  const tilt=Math.atan2(hw*0.16,0.59);
  for(const s of [-1,1]){ const p=new T.Mesh(new T.PlaneGeometry(L*0.97,0.5),cm); const off=hw*0.58+0.004;
    if(long){ p.position.set(cx,0.63,cz+s*off); p.rotation.set(-s*tilt,s<0?Math.PI:0,0,'YXZ'); } else { p.position.set(cx+s*off,0.63,cz); p.rotation.set(-s*tilt*0,0,0); p.rotation.order='YXZ'; p.rotation.y=s*Math.PI/2; p.rotation.x=-tilt; }
    W.add(p); }
  const base=new T.Mesh(new T.BoxGeometry(long?L+0.1:w+0.12,0.06,long?w+0.12:L+0.1),M.navy); base.position.set(cx,0.03,cz); base.receiveShadow=true; W.add(base);
  const lugs=[]; for(const k of [-0.42,0,0.42]) for(const s of [-1,1]) lugs.push([new T.BoxGeometry(0.16,0.12,0.05),long?MX(cx+k*L,0.95,cz+s*hw*0.42):MX(cx+s*hw*0.42,0.95,cz+k*L,0,Math.PI/2,0)]); addMerged(lugs,M.metal,{cast:false}); }
function barrel(x,z,c){ const g=new T.Group(); const pr=[[0.001,-0.53],[0.36,-0.53],[0.395,-0.55],[0.425,-0.535],[0.43,-0.5],[0.418,-0.46],[0.418,-0.25],[0.438,-0.225],[0.438,-0.175],[0.418,-0.15],[0.418,0.15],[0.438,0.175],[0.438,0.225],[0.418,0.25],[0.418,0.46],[0.43,0.5],[0.425,0.535],[0.395,0.55],[0.36,0.53],[0.001,0.53]].map(p=>new T.Vector2(p[0],p[1]));
  const b=new T.Mesh(new T.LatheGeometry(pr,36),toon({color:c,roughness:0.45,metalness:0.25})); b.castShadow=b.receiveShadow=true; g.add(b);
  const band=new T.Mesh(new T.CylinderGeometry(0.4205,0.4205,0.12,36,1,true),M.white); band.position.y=-0.02; g.add(band);
  for(const [bx,bz,r] of [[0.2,0.1,0.055],[-0.17,-0.13,0.038]]){ const cap=new T.Mesh(new T.CylinderGeometry(r,r,0.035,14),M.navy); cap.position.set(bx,0.545,bz); g.add(cap); }
  g.position.set(x,0.55,z); W.add(g); }
function cone(x,z){ propCol(x,z,0.24,0,0.66); const g=new T.Group();
  const pr=[[0.215,0.06],[0.205,0.085],[0.07,0.6],[0.045,0.635],[0.02,0.65],[0.001,0.652]].map(p=>new T.Vector2(p[0],p[1]));
  const c=new T.Mesh(new T.LatheGeometry(pr,28),toon({color:0xff6a1a,roughness:0.5})); c.castShadow=true; g.add(c);
  for(const [y,r0,r1,hh] of [[0.33,0.142,0.125,0.11],[0.47,0.097,0.084,0.07]]){ const w=new T.Mesh(new T.CylinderGeometry(r1+0.004,r0+0.004,hh,28,1,true),M.white); w.position.y=y; g.add(w); }
  const sh=new T.Shape(); const R=0.23, q=0.06; sh.moveTo(-R+q,-R); sh.lineTo(R-q,-R); sh.quadraticCurveTo(R,-R,R,-R+q); sh.lineTo(R,R-q); sh.quadraticCurveTo(R,R,R-q,R); sh.lineTo(-R+q,R); sh.quadraticCurveTo(-R,R,-R,R-q); sh.lineTo(-R,-R+q); sh.quadraticCurveTo(-R,-R,-R+q,-R);
  const bg=new T.ExtrudeGeometry(sh,{depth:0.04,bevelEnabled:true,bevelThickness:0.012,bevelSize:0.012,bevelSegments:2,curveSegments:4}); bg.rotateX(-Math.PI/2);
  const b=new T.Mesh(bg,M.navy); b.position.y=0.012; b.castShadow=true; g.add(b);
  g.position.set(x,0,z); g.rotation.y=hash01(x,z)*3; W.add(g); }
function vending(x0,x1,z0,z1,face){ collider(x0,x1,0,2.1,z0,z1); contact(x0,x1,z0,z1,0); const w=(x1-x0)/2; [TX.vendA,TX.vendB].forEach((tx,i)=>{ const body=toon({color:i?0x2a9df4:0xe23d6d}); const front=basic({map:tx}); const mats= face<0? [body,body,M.navy,M.navy,body,front] : [body,body,M.navy,M.navy,front,body]; const m=new T.Mesh(new T.BoxGeometry(w-0.06,2.1,z1-z0),mats); m.position.set(x0+w/2+i*w,1.05,(z0+z1)/2); m.castShadow=true; W.add(m);
    { const mx=m.position.x, mw=w-0.06, d=z1-z0, fz=(z0+z1)/2+face*(d/2), D=[], V=[];
      const hdr=new T.Mesh(new T.BoxGeometry(mw*0.94,0.26,0.1),basic({color:i?0xbfe6ff:0xffd0e2})); hdr.position.set(mx,1.93,fz+face*0.05); W.add(hdr);
      D.push([new T.BoxGeometry(mw+0.04,0.06,d+0.04),MX(mx,2.12,(z0+z1)/2)]); D.push([new T.BoxGeometry(mw+0.02,0.08,d+0.02),MX(mx,0.04,(z0+z1)/2)]);
      D.push([new T.BoxGeometry(mw*0.6,0.2,0.08),MX(mx,0.36,fz+face*0.03)]);
      D.push([new T.BoxGeometry(0.14,0.3,0.06),MX(mx+mw*0.36,0.95,fz+face*0.025)]);
      for(let k=0;k<5;k++) for(const sx of [-1,1]) V.push([new T.BoxGeometry(0.02,0.04,d*0.6),MX(mx+sx*(mw/2+0.01),1.6+k*0.07,(z0+z1)/2)]);
      addMerged(D,M.navy); addMerged(V,M.dark,{cast:false});
      const slot=new T.Mesh(new T.BoxGeometry(0.06,0.1,0.02),basic({color:0x8ef0ff})); slot.position.set(mx+mw*0.36,1.0,fz+face*0.06); W.add(slot); }
    const gl=sprite(i?0x6ecbff:0xff7fb0,2.4,0.35); gl.position.set(m.position.x,1.2,(z0+z1)/2+face*0.7); W.add(gl); }); }
function stall(x0,x1,z0,z1,awn,signTxt,signCol,face){ solid(x0,x1,0,1.1,z0,z1,M.wood,1.2); const top=new T.Mesh(new T.BoxGeometry(x1-x0+0.2,0.08,z1-z0+0.2),M.white); top.position.set((x0+x1)/2,1.14,(z0+z1)/2); top.castShadow=true; W.add(top);
  const zb=face<0? z1+0.9 : z0-0.9; // back posts further from arena centre
  for(const x of [x0+0.1,x1-0.1]) for(const z of [face<0?z0-0.2:z1+0.2, zb]){ propCol(x,z,0.09,0,2.9); if(z===zb){ const edge=zb<0?-HZ:HZ; collider(x-0.09,x+0.09,0,2.9,Math.min(zb,edge),Math.max(zb,edge),true); } const p=new T.Mesh(new T.CylinderGeometry(0.05,0.05,2.9,8),M.white); p.position.set(x,1.45,z); p.castShadow=true; W.add(p); }
  const depth=Math.abs(zb-(face<0?z0-0.5:z1+0.5)); const a=new T.Mesh(boxGeo(x1-x0+0.6,0.07,depth+0.3,0),toon({map:awn,side:T.DoubleSide})); const uv=a.geometry.attributes.uv; for(const f of [2,3]) for(let i=0;i<4;i++){ const k=f*4+i; uv.setX(k,uv.getX(k)*2); } a.position.set((x0+x1)/2,2.85,((face<0?z0-0.5:z1+0.5)+zb)/2); a.rotation.x=face*0.2; a.castShadow=true; W.add(a); { const za=face<0?z0-0.5:z1+0.5; collider(x0-0.3,x1+0.3,2.7,2.98,Math.min(za,zb)-0.15,Math.max(za,zb)+0.15,true); }
  const s=new T.Mesh(new T.PlaneGeometry(2.4,0.6),basic({map:TX.sign(signTxt,signCol),side:T.DoubleSide})); s.position.set((x0+x1)/2,2.35,face<0?z0-0.52:z1+0.52); if(face>0) s.rotation.y=0; else s.rotation.y=Math.PI; W.add(s);
  // goods on the counter
  const cols=[0xff4fa3,0xffe14d,0x5dff9b,0x19c8ff,0xff7a1a]; for(let i=0;i<7;i++){ const gx=x0+0.45+i*((x1-x0-0.9)/6), gz=(z0+z1)/2+(hash01(i,x0)-0.5)*0.5, c=cols[i%5], kind=i%3; let f;
    if(kind===0){ f=new T.Mesh(new T.SphereGeometry(0.14,18,14),toon({color:c,roughness:0.35})); f.scale.y=0.9; f.position.set(gx,1.31,gz); const stem=new T.Mesh(new T.CylinderGeometry(0.012,0.015,0.07,6),toon({color:0x6b4423})); stem.position.set(gx,1.45,gz); W.add(stem); const lf=new T.Mesh(new T.SphereGeometry(0.04,8,6),M.leaf); lf.scale.set(1.4,0.35,0.8); lf.position.set(gx+0.04,1.46,gz); W.add(lf); }
    else if(kind===1){ f=new T.Mesh(new T.BoxGeometry(0.15,0.24,0.15),toon({color:c})); f.position.set(gx,1.3,gz); f.rotation.y=hash01(gz,i)*1.5; const cap=new T.Mesh(new T.CylinderGeometry(0.03,0.03,0.04,10),M.white); cap.position.set(gx,1.44,gz); W.add(cap); }
    else { f=new T.Mesh(new T.CylinderGeometry(0.07,0.07,0.22,18),toon({color:c,metalness:0.4,roughness:0.35})); f.position.set(gx,1.29,gz); const top=new T.Mesh(new T.CylinderGeometry(0.062,0.07,0.02,18),M.metal); top.position.set(gx,1.41,gz); W.add(top); }
    f.castShadow=true; W.add(f); } }
function railing(x0,z0,x1,z1,y=0,o={}){ const alongX=Math.abs(x1-x0)>Math.abs(z1-z0); const len=alongX?Math.abs(x1-x0):Math.abs(z1-z0); const t=0.09;
  collider(Math.min(x0,x1)-(alongX?0:t),Math.max(x0,x1)+(alongX?0:t),y,y+1.1,Math.min(z0,z1)-(alongX?t:0),Math.max(z0,z1)+(alongX?t:0),true);
  const n=Math.max(1,Math.round(len/1.6)); for(let i=0;i<=n;i++){ if((i===0&&o.noStart)||(i===n&&o.noEnd)) continue; const p=new T.Mesh(new T.CylinderGeometry(0.06,0.06,1.1,8),M.white); p.position.set(lerp(x0,x1,i/n),y+0.55,lerp(z0,z1,i/n)); p.castShadow=true; W.add(p); const cap=new T.Mesh(new T.SphereGeometry(0.085,8,6),o.cap||M.yellow); cap.position.set(p.position.x,y+1.12,p.position.z); W.add(cap); }
  for(const h of [0.55,1.0]){ const b=new T.Mesh(new T.BoxGeometry(alongX?len:0.05,0.06,alongX?0.05:len),h>0.9?M.white:M.metal); b.position.set((x0+x1)/2,y+h,(z0+z1)/2); b.castShadow=true; W.add(b); } }
function lampPost(x,z,dirX,dirZ){ propCol(x,z,0.17,0,5.4); const g=new T.Group();
  const pp=[[0.001,0],[0.26,0],[0.26,0.1],[0.2,0.16],[0.16,0.24],[0.15,0.5],[0.18,0.55],[0.18,0.62],[0.12,0.7],[0.1,1.1],[0.09,2.4],[0.12,2.45],[0.12,2.55],[0.085,2.6],[0.07,5.0],[0.1,5.05],[0.1,5.15],[0.06,5.22],[0.001,5.22]].map(q=>new T.Vector2(q[0],q[1]));
  const p=new T.Mesh(new T.LatheGeometry(pp,20),M.navy); p.castShadow=true; g.add(p); const arm=new T.Mesh(new T.TorusGeometry(0.8,0.05,8,14,Math.PI/2),M.navy); arm.position.set(0.8,5.2,0); arm.rotation.y=Math.PI; arm.rotation.z=0; g.add(arm); const hp=[[0.001,0.16],[0.06,0.16],[0.09,0.12],[0.3,0.0],[0.32,-0.04],[0.27,-0.05],[0.001,-0.05]].map(q=>new T.Vector2(q[0],q[1])); const head=new T.Mesh(new T.LatheGeometry(hp,24),M.navy); head.position.set(0.8,5.98,0); head.castShadow=true; g.add(head); const bulb=new T.Mesh(new T.SphereGeometry(0.2,12,8),basic({color:0xfff3b8})); bulb.position.set(0.8,5.8,0); g.add(bulb); const gl=sprite(0xffe9a0,2.6,0.5); gl.position.set(0.8,5.8,0); g.add(gl); g.position.set(x,0,z); g.rotation.y=Math.atan2(-dirZ,dirX); W.add(g); return g; }
function stringLights(a,b,sag=1.1){ const mid=V3().addVectors(a,b).multiplyScalar(0.5); mid.y-=sag*2; const curve=new T.QuadraticBezierCurve3(a,mid,b); const tube=new T.Mesh(new T.TubeGeometry(curve,24,0.02,5),M.navy); W.add(tube); const cols=[0xffe14d,0xff4fa3,0x3fe0ff,0x5dff9b,0xff7a1a]; const n=Math.max(6,Math.round(a.distanceTo(b)/1.1)); const geo=new T.SphereGeometry(0.1,8,6); for(let i=1;i<n;i++){ const p=curve.getPoint(i/n); const m=new T.Mesh(geo,basic({color:cols[i%5]})); m.position.copy(p); m.position.y-=0.1; W.add(m); } }
function pole(x,z,h,mat){ propCol(x,z,0.12,0,h); const p=new T.Mesh(new T.CylinderGeometry(0.06,0.08,h,8),mat||M.navy); p.position.set(x,h/2,z); p.castShadow=true; W.add(p); return p; }
function bannerFlag(x,y,z,tx,rotY){ propCol(x,z,0.12,y,y+4.7); const g=new T.Group(); const p=new T.Mesh(new T.CylinderGeometry(0.06,0.08,4.6,8),M.navy); p.position.y=2.3; p.castShadow=true; g.add(p); const top=new T.Mesh(new T.SphereGeometry(0.13,10,8),M.yellow); top.position.y=4.65; g.add(top); const arm=new T.Mesh(new T.BoxGeometry(1.0,0.06,0.06),M.navy); arm.position.set(0.5,4.3,0); g.add(arm); const fm=toon({map:tx}); const fg=new T.Group(); fg.position.set(0.04,4.28,0); for(const r of [0,Math.PI]){ const fl=new T.Mesh(new T.PlaneGeometry(0.95,1.9),fm); fl.position.set(0.48,-0.96,r?-0.006:0.006); fl.rotation.y=r; fl.castShadow=true; fg.add(fl); } g.add(fg); g.position.set(x,y,z); g.rotation.y=rotY; W.add(g);
  const ph=rand(0,6); animated.push(t=>{ fg.rotation.y=Math.sin(t*1.7+ph)*0.16; fg.rotation.x=Math.sin(t*2.3+ph)*0.05; }); }
function palm(x,z,h=6.5,lean=0.5,dir=0){ const g=new T.Group(); let px=0,py=0; const seg=7; for(let i=0;i<seg;i++){ const k=i/seg; { const bx=lean*k*k*2.2; propCol(x+bx*Math.cos(dir),z-bx*Math.sin(dir),0.27-k*0.07,i*h/seg,(i+1)*h/seg+0.05); } const r0=0.24-k*0.07, r1=0.2-k*0.07, hs=h/seg+0.06; const tp=[[0.001,-hs/2],[r0*1.12,-hs/2],[r0*1.16,-hs/2+hs*0.1],[r0*1.02,-hs/2+hs*0.24],[ (r0+r1)/2*0.97,0],[r1*0.98,hs/2-hs*0.08],[r1*1.06,hs/2],[0.001,hs/2]].map(q=>new T.Vector2(q[0],q[1])); const s=new T.Mesh(new T.LatheGeometry(tp,14),M.trunk); const bend=lean*k*k*2.2; s.position.set(bend,py+h/seg/2,0); s.rotation.z=-lean*k*0.55; s.castShadow=true; g.add(s); py+=h/seg; px=bend; }
  const crown=new T.Group(); crown.position.set(lean*2.2,h,0); g.add(crown);
  for(let i=0;i<9;i++){ const L=3.4+rand(-0.4,0.5); const geo=new T.PlaneGeometry(1.0,L,2,7); const p=geo.attributes.position; for(let k=0;k<p.count;k++){ const yy=p.getY(k)+L/2, tt=yy/L; p.setX(k,p.getX(k)*(1-tt*0.85)*(0.55+Math.sin(tt*Math.PI)*0.7)); p.setZ(k,tt*tt*1.6+Math.abs(p.getX(k))*0.35); p.setY(k,yy); } geo.computeVertexNormals(); const lf=new T.Mesh(geo,i%2?M.leaf:M.leaf2); lf.castShadow=true; const pivot=new T.Group(); pivot.rotation.y=i/9*Math.PI*2+rand(-0.2,0.2); lf.rotation.x=Math.PI/2-0.45-rand(0,0.35); pivot.add(lf); crown.add(pivot); }
  for(let i=0;i<3;i++){ const c=new T.Mesh(new T.SphereGeometry(0.2,8,6),toon({color:0x6b4423})); c.position.set(Math.cos(i*2.1)*0.25,-0.25,Math.sin(i*2.1)*0.25); crown.add(c); }
  g.position.set(x,0,z); g.rotation.y=dir; W.add(g); const ph=rand(0,6); animated.push(t=>{ crown.rotation.z=Math.sin(t*0.9+ph)*0.05; crown.rotation.x=Math.cos(t*0.7+ph)*0.04; }); return g; }
function planter(x,z,s=1.3){ propCol(x,z,s*0.6,0,0.72);
  const pr=[[0.001,0],[s*0.42,0],[s*0.45,0.04],[s*0.47,0.45],[s*0.5,0.5],[s*0.58,0.56],[s*0.58,0.68],[s*0.55,0.72],[s*0.5,0.72],[s*0.5,0.64],[0.001,0.64]].map(q=>new T.Vector2(q[0],q[1]));
  const b=new T.Mesh(new T.LatheGeometry(pr,32),M.white); b.position.set(x,0,z); b.castShadow=b.receiveShadow=true; W.add(b);
  const soil=new T.Mesh(new T.CylinderGeometry(s*0.5,s*0.5,0.04,32),toon({color:0x5a3d28,roughness:0.95})); soil.position.set(x,0.66,z); W.add(soil);
  const st=new T.Mesh(new T.TorusGeometry(s*0.465,0.035,8,40),M.teal); st.rotation.x=Math.PI/2; st.position.set(x,0.3,z); W.add(st); }

// ---------- arena ----------
function buildArena(){
  // sky
  const sky=new T.Mesh(new T.SphereGeometry(700,32,20),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,
    uniforms:{top:{value:new T.Color(0x35488f)},mid:{value:new T.Color(0xe08f86)},hor:{value:new T.Color(HORIZON)},sunDir:{value:V3(27,9,-19).normalize()}},
    vertexShader:'varying vec3 vDir; void main(){ vDir=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader:'uniform vec3 top; uniform vec3 mid; uniform vec3 hor; uniform vec3 sunDir; varying vec3 vDir; void main(){ vec3 d=normalize(vDir); float h=d.y; vec3 c=mix(hor,mid,smoothstep(0.0,0.22,h)); c=mix(c,top,smoothstep(0.18,0.8,h)); float s=max(dot(d,sunDir),0.0); c+=vec3(1.0,0.86,0.6)*(smoothstep(0.994,0.9965,s)+pow(s,10.0)*0.38+pow(s,3.0)*0.12); gl_FragColor=vec4(c,1.0); }'}));
  W.add(sky); animated.push(()=>sky.position.copy(camera.position));
  // water
  const waterMat=new T.ShaderMaterial({fog:false,uniforms:{time:{value:0},hor:{value:new T.Color(HORIZON)},dock:{value:new T.Vector2(HX,HZ)},sunDir:{value:V3(27,9,-19).normalize()},
      skyTop:{value:new T.Color(0x35488f)},skyMid:{value:new T.Color(0xe08f86)},tR:{value:null},tm:{value:new T.Matrix4()},reflOn:{value:0}},
    vertexShader:'uniform mat4 tm; varying vec3 vW; varying vec4 vR; void main(){ vR=tm*vec4(position,1.0); vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader:`uniform float time; uniform vec3 hor; uniform vec2 dock; uniform vec3 sunDir; uniform vec3 skyTop; uniform vec3 skyMid; uniform sampler2D tR; uniform float reflOn; varying vec3 vW; varying vec4 vR;
      float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),f.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),f.x),f.y); }
      float wav(vec2 p){ return noise(p*0.16+vec2(time*0.22,time*0.1))*0.55+noise(p*0.42-vec2(time*0.18,-time*0.26))*0.3+noise(p*1.3+vec2(-time*0.5,time*0.35))*0.15; }
      vec3 skyCol(vec3 d){ float h=max(d.y,0.0); vec3 c=mix(hor,skyMid,smoothstep(0.0,0.22,h)); c=mix(c,skyTop,smoothstep(0.18,0.8,h)); return c; }
      void main(){ float dist=length(vW.xz-cameraPosition.xz); vec2 p=vW.xz; float n=wav(p);
        float e=0.35, amp=mix(1.6,0.25,smoothstep(20.0,160.0,dist)); vec3 N=normalize(vec3(-(wav(p+vec2(e,0.0))-wav(p-vec2(e,0.0)))/(2.0*e)*amp,1.0,-(wav(p+vec2(0.0,e))-wav(p-vec2(0.0,e)))/(2.0*e)*amp));
        vec3 V=normalize(cameraPosition-vW); float fr=0.03+0.97*pow(1.0-max(dot(N,V),0.0),5.0);
        vec3 R=reflect(-V,N); R.y=abs(R.y); vec3 refl=skyCol(R);
        if(reflOn>0.5){ vec2 uv=vR.xy/vR.w+N.xz*0.06; vec3 rc=texture2D(tR,uv).rgb; refl=mix(refl,rc,smoothstep(220.0,60.0,dist)); }
        vec3 deep=vec3(0.04,0.15,0.38), mid=vec3(0.1,0.32,0.55), shal=vec3(0.18,0.55,0.62);
        vec3 body=mix(deep,mid,smoothstep(0.3,0.68,n));
        vec2 q=abs(vW.xz)-dock; float dd=length(max(q,0.0))+min(max(q.x,q.y),0.0);
        body=mix(shal,body,smoothstep(0.0,7.0,dd));
        float sss=pow(max(dot(-V,sunDir),0.0)*0.5+0.5,4.0)*smoothstep(0.55,0.75,n); body+=vec3(0.12,0.4,0.36)*sss*0.5;
        vec3 c=mix(body,refl,clamp(fr*1.25,0.0,0.92));
        float l1=1.0-smoothstep(0.0,0.02,abs(n-0.6)); c=mix(c,vec3(1.0,0.86,0.72),l1*0.32*smoothstep(160.0,40.0,dist));
        float sp=max(dot(R,sunDir),0.0); c+=vec3(1.0,0.82,0.55)*(pow(sp,420.0)*3.5+pow(sp,60.0)*0.35);
        float glint=step(0.993,noise(vW.xz*2.1+vec2(time*0.8,-time*0.5)))*smoothstep(60.0,10.0,dist); c+=glint*vec3(1.0,0.9,0.75)*0.55;
        float fo=1.0-smoothstep(0.0,1.4,dd+sin(time*1.6+vW.x*0.9+vW.z*0.7)*0.35+n*0.9-0.45); float fo2=(1.0-smoothstep(0.0,3.2,dd))*smoothstep(0.62,0.8,noise(vW.xz*2.2+vec2(time*0.3,0.0)));
        c=mix(c,vec3(0.97,0.99,1.0),clamp(fo*0.85+fo2*0.5,0.0,1.0));
        c=mix(c,hor,smoothstep(80.0,340.0,dist)); gl_FragColor=vec4(c,1.0); }`});
  W.userData.waterMat=waterMat; const water=new T.Mesh(new T.PlaneGeometry(1400,1400),waterMat); water.rotation.x=-Math.PI/2; water.position.y=-1.15; W.add(water); animated.push(t=>{ waterMat.uniforms.time.value=t; });
  { const mr=lookMirror(water,0.42); waterMat.uniforms.tR.value=mr.rt.texture; waterMat.uniforms.tm.value=mr.tm; mr.uni=waterMat.uniforms; }
  // dock slab
  collider(-HX,HX,-1.4,0,-HZ,HZ);
  const floor=new T.Mesh(new T.PlaneGeometry(2*HX,2*HZ),toon({map:TX.floor})); floor.rotation.x=-Math.PI/2; floor.receiveShadow=true; W.add(floor);
  meshBox(-HX,HX,-1.5,-0.005,-HZ,HZ,M.dock,2,{cast:false});
  const lip=meshBox(-HX-0.18,HX+0.18,-0.32,-0.02,-HZ-0.18,HZ+0.18,M.navy,0,{cast:false});
  for(let x=-HX+2;x<HX;x+=4) for(const z of [-HZ+0.6,HZ-0.6]){ const p=new T.Mesh(new T.CylinderGeometry(0.4,0.4,2.6,10),toon({color:0x5a6577})); p.position.set(x,-1.6,z*1.02); W.add(p); }
  for(let x=-HX+3;x<HX;x+=6) for(const s of [-1,1]){ const t=new T.Mesh(new T.TorusGeometry(0.42,0.17,8,14),M.dark); t.position.set(x,-0.6,s*(HZ+0.2)); W.add(t); }
  for(let z=-HZ+3;z<HZ;z+=5) for(const s of [-1,1]){ const t=new T.Mesh(new T.TorusGeometry(0.42,0.17,8,14),M.dark); t.rotation.y=Math.PI/2; t.position.set(s*(HX+0.2),-0.6,z); W.add(t); }

  // ---- bases ----
  const mkBase=(s,team)=>{ const x0=s<0?-HX:HX-6, x1=x0+6, cx=s<0?x0+3.4:x1-3.4; const wallMat=team==='p'?M.blockP:M.blockB; const tc=team==='p'?TEAM.player:TEAM.bot;
    solid(x0,x1,0,1,-4,4,[wallMat,wallMat,M.concrete,M.concrete,wallMat,wallMat],2);
    const pad=new T.Mesh(new T.CircleGeometry(2.2,40),basic({map:TX.pad(HEXS(tc.body),HEXS(tc.dark)),polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2})); pad.rotation.x=-Math.PI/2; pad.rotation.z=s<0?-Math.PI/2:Math.PI/2; pad.position.set(cx,1.01,0); W.add(pad);
    const beam=new T.Mesh(new T.CylinderGeometry(2.15,2.15,3.2,36,1,true),new T.MeshBasicMaterial({color:col(tc.light),transparent:true,opacity:0.006,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending})); beam.position.set(cx,2.6,0); W.add(beam); animated.push(t=>{ beam.material.opacity=0.04+Math.sin(t*2+s)*0.015; });
    // edge trim
    const ex=s<0?x1:x0; const tr=new T.Mesh(boxGeo(0.24,0.1,8,1.2),M.hazard); tr.position.set(ex+s*0.12,1.03,0); W.add(tr);
    // open back: railing + banners (nothing solid for the camera to hit)
    const bx=s<0?-HX+0.1:HX-0.1; railing(bx,-4,bx,4,1,{cap:toon({color:tc.body})});
    for(const z of [-3.4,3.4]) bannerFlag(bx,1,z,team==='p'?TX.bannerP:TX.bannerB,s<0?0:Math.PI);
    for(const z of [-4,4]){ propCol(ex+s*0.3,z*0.93,0.22,1,2.6); const gl=new T.Mesh(new T.CylinderGeometry(0.14,0.14,1.6,10),basic({color:tc.light})); gl.position.set(ex+s*0.3,1.8,z*0.93); W.add(gl); const b=new T.Mesh(new T.CylinderGeometry(0.2,0.24,0.3,10),M.navy); b.position.set(ex+s*0.3,1.15,z*0.93); W.add(b); const c2=b.clone(); c2.position.y=2.65; W.add(c2); const sp=sprite(tc.light,2.2,0.45); sp.position.copy(gl.position); W.add(sp); }
  };
  mkBase(-1,'p'); mkBase(1,'b');
  addRamp(-12,-9,-2,2,'x',false,0,1); addRamp(9,12,-2,2,'x',true,0,1);

  // ---- centre plaza ----
  solid(-4,4,0,1,-3,3,[M.blockDark,M.blockDark,M.concrete,M.concrete,M.blockDark,M.blockDark],2);
  for(const z of [-3,3]){ const h=new T.Mesh(boxGeo(8,0.1,0.26,1.2),M.hazard); h.position.set(0,1.03,z*0.955); W.add(h); }
  addRamp(-1.5,1.5,3,5.5,'z',false,0,1); addRamp(-1.5,1.5,-5.5,-3,'z',true,0,1);
  containerBox(-2.5,2.5,1,3.4,-1.1,1.1,TX.contTeal);
  crateBox(2.6,4,1,2.2,1.6,3,M.crateO); crateBox(-4,-2.6,1,2.2,-3,-1.6,M.crateB);

  // ---- side platforms ----
  solid(5,12,0,1.4,8.5,HZ,[M.block,M.block,M.concrete,M.concrete,M.block,M.block],2); addRamp(2,5,8.5,HZ,'x',true,0,1.4);
  containerBox(8,12,1.4,3.8,10.6,HZ,TX.contOrange);
  solid(-12,-5,0,1.4,-HZ,-8.5,[M.block,M.block,M.concrete,M.concrete,M.block,M.block],2); addRamp(-5,-2,-HZ,-8.5,'x',false,0,1.4);
  containerBox(-12,-8,1.4,3.8,-HZ,-10.6,TX.contBlue);
  railing(5,HZ-0.1,7.82,HZ-0.1,1.4); railing(-7.82,-HZ+0.1,-5,-HZ+0.1,1.4);
  { const h=new T.Mesh(boxGeo(0.26,0.1,4.5,1.2),M.hazard); h.position.set(5.14,1.43,10.75); W.add(h); const h2=h.clone(); h2.position.set(-5.14,1.43,-10.75); W.add(h2); }

  // ---- stalls + vending ----
  stall(-10,-6,10.2,11.4,TX.awnRed,'SNACKS','#e23d6d',-1); vending(-12.4,-10.6,11.5,12.5,-1);
  stall(6,10,-11.4,-10.2,TX.awnTeal,'JUICE','#16a39c',1); vending(10.6,12.4,-12.5,-11.5,1);

  // ---- cover ----
  blockWall(-9,-5.5,0,1.7,3.5,4.1,TX.graffA); blockWall(5.5,9,0,1.7,-4.1,-3.5,TX.graffB);
  blockWall(-9.6,-9,0,1.7,-7.5,-5); blockWall(9,9.6,0,1.7,5,7.5);
  chevronBarrier(5,8,1.2,1.7); chevronBarrier(-8,-5,-1.7,-1.2);
  crateBox(11,13,0,1.3,4.6,6.6,M.crate); crateBox(11.35,12.65,1.3,2.4,4.95,6.25,M.crateO);
  crateBox(-13,-11,0,1.3,-6.6,-4.6,M.crate); crateBox(-12.65,-11.35,1.3,2.4,-6.25,-4.95,M.crateB);
  collider(-0.75,0.75,0,1.1,8.55,9.95); contact(-0.75,0.75,8.55,9.95,0); barrel(-0.33,8.92,0x2a9df4); barrel(0.33,9.58,0xffd21f);
  collider(-0.75,0.75,0,1.1,-9.95,-8.55); contact(-0.75,0.75,-9.95,-8.55,0); barrel(0.3,-8.95,0xff7a1a); barrel(-0.3,-9.55,0xe23d6d);
  for(const [x,z] of [[-6.2,6.4],[-5.4,6.9],[6.2,-6.4],[5.4,-6.9],[3.2,6.6],[-3.2,-6.6],[14.6,-5.6],[-14.6,5.6]]) cone(x,z);

  // ---- railings on the closed edges ----
  railing(-HX+0.1,4.16,-HX+0.1,HZ-0.1); railing(-HX+0.1,-HZ+0.1,-HX+0.1,-4.16);
  railing(HX-0.1,4.16,HX-0.1,HZ-0.1); railing(HX-0.1,-HZ+0.1,HX-0.1,-4.16);
  railing(-HX+0.1,HZ-0.1,-13,HZ-0.1,0,{noStart:true}); railing(12.16,HZ-0.1,HX-0.1,HZ-0.1,0,{noEnd:true});
  railing(13,-HZ+0.1,HX-0.1,-HZ+0.1,0,{noEnd:true}); railing(-HX+0.1,-HZ+0.1,-12.16,-HZ+0.1,0,{noStart:true});

  // ---- lights, flags, greenery ----
  const L1=lampPost(-HX+0.7,HZ-0.7,1,-1), L2=lampPost(HX-0.7,-HZ+0.7,-1,1), L3=lampPost(-HX+0.7,-HZ+0.7,1,1), L4=lampPost(HX-0.7,HZ-0.7,-1,-1);
  const tA=V3(-13.5,4.9,HZ-0.6), tB=V3(-2,4.9,HZ-0.6), tC=V3(2,4.9,-HZ+0.6), tD=V3(13.5,4.9,-HZ+0.6);
  for(const p of [tA,tB,tC,tD]) pole(p.x,p.z,5,M.white);
  stringLights(tA,tB,0.5); stringLights(tC,tD,0.5); stringLights(tB,V3(0,3.9,0),0.8); stringLights(tC,V3(0,3.9,0),0.8);
  { propCol(0,0,0.24,3.35,4.2); const mast=new T.Mesh(new T.CylinderGeometry(0.05,0.05,0.5,8),M.navy); mast.position.set(0,3.65,0); W.add(mast); const orb=new T.Mesh(new T.SphereGeometry(0.22,12,10),basic({color:0xffe14d})); orb.position.set(0,3.95,0); W.add(orb); const gl=sprite(0xffe14d,2.4,0.6); gl.position.copy(orb.position); W.add(gl); }
  planter(-13.6,9.0,1.5); palm(-13.6,9.0,6.2,0.45,0.6); planter(13.6,-9.0,1.5); palm(13.6,-9.0,6.2,0.45,3.7);
  planter(15.6,9.6,1.1); planter(-15.6,-9.6,1.1);
  for(const [x,z] of [[15.6,9.6],[-15.6,-9.6]]){ propCol(x+0.15,z+0.08,0.95,0.7,1.9);
    for(const [ox,oy,oz,r,mi] of [[0,1.1,0,0.62,1],[0.42,1.25,0.25,0.46,0],[-0.38,1.05,0.2,0.48,0],[0.15,1.0,-0.42,0.5,1],[-0.1,1.55,0.05,0.42,0],[0.35,0.95,-0.1,0.4,1]]){
      const geo=new T.IcosahedronGeometry(r,2); const p=geo.attributes.position; for(let k=0;k<p.count;k++){ const vx=p.getX(k),vy=p.getY(k),vz=p.getZ(k); const n=1+(hash01(vx*7.1+x,vy*5.3+vz*3.7)-0.5)*0.22; p.setXYZ(k,vx*n,vy*n*0.85,vz*n); } geo.computeVertexNormals();
      const b=new T.Mesh(geo,mi?M.leaf2:M.leaf); b.position.set(x+ox,oy,z+oz); b.castShadow=true; W.add(b); } }
}

// ---------- scenery ----------
function buildScenery(){
  // (background islands, bridge, town, crane pier, cargo ship and sailboats removed: open sea all round)
  // billboard
  { const g=new T.Group(); for(const x of [-5,5]){ const p=new T.Mesh(new T.CylinderGeometry(0.3,0.3,9,8),M.navy); p.position.set(x,3.5,0); g.add(p); } const bd=new T.Mesh(new T.BoxGeometry(15,7.5,0.5),[M.navy,M.navy,M.navy,M.navy,basic({map:TX.billboard}),M.navy]); bd.position.y=10; g.add(bd); const pm=toon({color:0x8f9aa8}); for(const x of [-5,5]){ const pl=new T.Mesh(new T.CylinderGeometry(0.75,0.9,3.2,12),pm); pl.position.set(x,-1.4,0); g.add(pl); } g.position.set(-4,0,-34); W.add(g); }
  // buoys
  for(const [x,z] of [[26,20],[-27,-19],[-24,22],[25,-21],[0,30],[9,-25]]){ const g=new T.Group(); const b=new T.Mesh(new T.CylinderGeometry(0.5,0.7,1.2,10),M.red); g.add(b); const w=new T.Mesh(new T.CylinderGeometry(0.52,0.52,0.3,10),M.white); w.position.y=0.2; g.add(w); const t=new T.Mesh(new T.ConeGeometry(0.4,0.9,10),M.red); t.position.y=1.05; g.add(t); const l=new T.Mesh(new T.SphereGeometry(0.16,8,6),basic({color:0xffe14d})); l.position.y=1.6; g.add(l); g.position.set(x,-0.9,z); W.add(g); const ph=rand(0,6); animated.push(t2=>{ g.position.y=-0.9+Math.sin(t2*1.4+ph)*0.14; g.rotation.x=Math.sin(t2*1.2+ph)*0.12; g.rotation.z=Math.cos(t2+ph)*0.1; }); }
  // clouds
  { const geo=new T.SphereGeometry(1,12,9); for(let i=0;i<20;i++){ const g=new T.Group(); const n=4+Math.floor(Math.random()*4); for(let j=0;j<n;j++){ const s=new T.Mesh(geo,M.cloud); const r=5+Math.random()*6; s.scale.set(r,r*0.62,r*0.8); s.position.set(j*6-n*3+Math.random()*3,Math.random()*2.5,Math.random()*4); g.add(s); } const base=new T.Mesh(geo,M.cloud); base.scale.set(n*4,2.6,7); base.position.y=-2; g.add(base); const a=Math.random()*Math.PI*2, r=120+Math.random()*190; g.position.set(Math.cos(a)*r,48+Math.random()*40,Math.sin(a)*r); W.add(g); animated.push((t,dt)=>{ g.position.x+=dt*1.2; if(g.position.x>340) g.position.x=-340; }); } }
  // gulls
  for(let i=0;i<5;i++){ const g=new T.Group(); const wg=new T.PlaneGeometry(1.5,0.4); wg.translate(0.75,0,0); const wm=basic({color:0xffffff,side:T.DoubleSide}); const l=new T.Mesh(wg,wm), r=new T.Mesh(wg,wm); l.rotation.x=r.rotation.x=-Math.PI/2; r.scale.x=-1; const lp=new T.Group(), rp=new T.Group(); lp.add(l); rp.add(r); g.add(lp); g.add(rp); const body=new T.Mesh(new T.SphereGeometry(0.22,6,5),wm); body.scale.z=2; g.add(body); W.add(g); const R=22+i*7, sp=0.25+i*0.04, ph=i*1.7, h=13+i*2.5; animated.push(t=>{ const a=t*sp+ph; g.position.set(Math.cos(a)*R,h+Math.sin(t*0.6+ph)*1.5,Math.sin(a)*R); g.rotation.y=-a; const f=Math.sin(t*7+ph)*0.6; lp.rotation.z=f; rp.rotation.z=-f; }); }
}

// ================= COLLISION HELPERS =================
function groundAt(x,z,feetY,r){
  let best=null; const lim=feetY+CFG.step;
  for(const b of boxes){ if(b.noStand) continue; if(x>=b.min.x-r&&x<=b.max.x+r&&z>=b.min.z-r&&z<=b.max.z+r){ const top=b.max.y; if(top<=lim&&(best===null||top>best)) best=top; } }
  for(const rp of ramps){ if(x>=rp.minX&&x<=rp.maxX&&z>=rp.minZ&&z<=rp.maxZ){ const h=rampHeight(rp,x,z); if(h<=lim&&(best===null||h>best)) best=h; } }
  return best;
}
function resolveWalls(f){
  const r=f.radius, feet=f.pos.y, head=f.pos.y+f.height;
  for(let it=0;it<2;it++){
    for(const b of boxes){
      if(!(b.min.y<head && b.max.y>feet+CFG.step)) continue;
      const cx=clamp(f.pos.x,b.min.x,b.max.x), cz=clamp(f.pos.z,b.min.z,b.max.z);
      const dx=f.pos.x-cx, dz=f.pos.z-cz; const d2=dx*dx+dz*dz;
      if(d2>=r*r) continue;
      if(d2<1e-8){
        const ex=[f.pos.x-b.min.x, b.max.x-f.pos.x, f.pos.z-b.min.z, b.max.z-f.pos.z]; const i=ex.indexOf(Math.min(...ex));
        if(i===0) f.pos.x=b.min.x-r; else if(i===1) f.pos.x=b.max.x+r; else if(i===2) f.pos.z=b.min.z-r; else f.pos.z=b.max.z+r;
        if(i<2) f.vel.x=0; else f.vel.z=0; continue;
      }
      const d=Math.sqrt(d2); const nx=dx/d, nz=dz/d; const push=r-d;
      f.pos.x+=nx*push; f.pos.z+=nz*push;
      const vn=f.vel.x*nx+f.vel.z*nz; if(vn<0){ f.vel.x-=vn*nx; f.vel.z-=vn*nz; }
    }
    // ramps are solid wedges: you can walk up them, but not into their sides
    for(const rp of ramps){ const p=r; if(f.pos.x<rp.minX-p||f.pos.x>rp.maxX+p||f.pos.z<rp.minZ-p||f.pos.z>rp.maxZ+p) continue;
      const h=rampHeight(rp,clamp(f.pos.x,rp.minX,rp.maxX),clamp(f.pos.z,rp.minZ,rp.maxZ)); if(h<=feet+CFG.step||Math.min(rp.hLow,rp.hHigh)>=head) continue;
      const ax=rp.axis==='x', len=ax?rp.maxX-rp.minX:rp.maxZ-rp.minZ, slope=Math.max(0.05,(rp.hHigh-rp.hLow)/len), lowS=rp.lowAtMin?-1:1;
      const a0=ax?f.pos.x:f.pos.z, q0=ax?f.pos.z:f.pos.x, aMin=ax?rp.minX:rp.minZ, aMax=ax?rp.maxX:rp.maxZ, qMin=ax?rp.minZ:rp.minX, qMax=ax?rp.maxZ:rp.maxX;
      const dLow=(h-(feet+CFG.step))/slope+0.02, dHigh=(lowS<0?(aMax+p)-a0:a0-(aMin-p)), dQ1=q0-(qMin-p), dQ2=(qMax+p)-q0; const m=Math.min(dLow,dHigh,dQ1,dQ2);
      let da=0,dq=0; if(m===dQ1) dq=-dQ1; else if(m===dQ2) dq=dQ2; else if(m===dLow) da=lowS*dLow; else da=-lowS*dHigh;
      if(ax){ f.pos.x+=da; f.pos.z+=dq; if(da&&f.vel.x*da<0) f.vel.x=0; if(dq&&f.vel.z*dq<0) f.vel.z=0; } else { f.pos.z+=da; f.pos.x+=dq; if(da&&f.vel.z*da<0) f.vel.z=0; if(dq&&f.vel.x*dq<0) f.vel.x=0; } }
  }
}
function pointVsWorld(p,r){
  let best=null;
  for(const b of boxes){ if(b.filler) continue;
    if(p.x<b.min.x-r||p.x>b.max.x+r||p.y<b.min.y-r||p.y>b.max.y+r||p.z<b.min.z-r||p.z>b.max.z+r) continue;
    const pen=[ {d:p.x-(b.min.x-r),n:[-1,0,0]}, {d:(b.max.x+r)-p.x,n:[1,0,0]}, {d:p.y-(b.min.y-r),n:[0,-1,0]}, {d:(b.max.y+r)-p.y,n:[0,1,0]}, {d:p.z-(b.min.z-r),n:[0,0,-1]}, {d:(b.max.z+r)-p.z,n:[0,0,1]} ];
    let m=pen[0]; for(const q of pen) if(q.d<m.d) m=q;
    if(!best||m.d<best.depth) best={n:V3(...m.n),depth:m.d};
  }
  for(const rp of ramps){
    if(p.x<rp.minX||p.x>rp.maxX||p.z<rp.minZ||p.z>rp.maxZ) continue;
    const h=rampHeight(rp,p.x,p.z); if(p.y-r<h && p.y>Math.min(rp.hLow,rp.hHigh)-0.5){ const n=rampNormal(rp); const depth=h-(p.y-r); if(!best||depth<best.depth) best={n,depth}; }
  }
  return best;
}
function segmentHitsBoxes(a,b,pad=0,cam=false){
  let tBest=null; const d=V3().subVectors(b,a);
  for(const bx of boxes){
    if(bx.filler||(cam&&bx.noCam)) continue;
    let t0=0,t1=1, ok=true;
    for(const ax of ['x','y','z']){
      const inv=1/(d[ax]||1e-9); let tn=(bx.min[ax]-pad-a[ax])*inv, tf=(bx.max[ax]+pad-a[ax])*inv; if(tn>tf){const tmp=tn;tn=tf;tf=tmp;}
      t0=Math.max(t0,tn); t1=Math.min(t1,tf); if(t0>t1){ok=false;break;}
    }
    if(ok && (tBest===null||t0<tBest)) tBest=t0;
  }
  return tBest;
}
function hasLOS(a,b){ return segmentHitsBoxes(a,b)===null; }

