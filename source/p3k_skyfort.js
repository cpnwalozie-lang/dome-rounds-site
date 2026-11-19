// ================= SKYFORT: the Battle arena (up to 10 fighters) =================
// A stone fort on a floating island, high above a sea of clouds at golden hour.
// Middle: a raised keep with four ramps and a crystal beacon. Corners: four towers with ramps up.
// In between: pillars, broken walls and crates for cover. Low walls run along the edges with gaps
// where you can get knocked off into the clouds.
function buildSkyfort(){
  const rng=RNG(2026); const A=30; // half-size of the plaza
  // ---- textures ----
  const tileTex=mkTex(512,512,(g,W2,H2)=>{ const r=RNG(5); const n=4, s=W2/n;
    g.fillStyle='#9c8763'; g.fillRect(0,0,W2,H2);
    for(let i=0;i<n;i++) for(let j=0;j<n;j++){ const v=r(); const c=[226-v*22,207-v*20,166-v*22].map(Math.round); g.fillStyle=`rgb(${c})`; g.fillRect(i*s+3,j*s+3,s-6,s-6);
      for(let k=0;k<70;k++){ g.fillStyle=`rgba(${r()<0.5?60:255},${r()<0.5?45:240},${r()<0.5?30:210},${0.05+r()*0.06})`; g.fillRect(i*s+3+r()*(s-8),j*s+3+r()*(s-8),2+r()*3,2+r()*3); }
      const gr=g.createLinearGradient(i*s,j*s,i*s+s,j*s+s); gr.addColorStop(0,'rgba(255,255,255,.07)'); gr.addColorStop(1,'rgba(0,0,0,.08)'); g.fillStyle=gr; g.fillRect(i*s+3,j*s+3,s-6,s-6);
      if(r()<0.22){ g.strokeStyle='rgba(90,72,48,.45)'; g.lineWidth=1.5; g.beginPath(); let x=i*s+10+r()*(s-20), y=j*s+10+r()*(s-20); g.moveTo(x,y); for(let q=0;q<4;q++){ x+=(r()-0.5)*40; y+=(r()-0.5)*40; g.lineTo(x,y); } g.stroke(); } } });
  const stoneTex=mkTex(512,512,(g,W2,H2)=>{ const r=RNG(9); g.fillStyle='#8f7d5c'; g.fillRect(0,0,W2,H2); const rows=8, h=H2/rows;
    for(let y=0;y<rows;y++){ const off=(y%2)*0.5; for(let x=-1;x<4;x++){ const v=r(); g.fillStyle=`rgb(${Math.round(212-v*26)},${Math.round(192-v*24)},${Math.round(152-v*24)})`; const bx=(x+off)*W2/4+3, by=y*h+3; g.fillRect(bx,by,W2/4-6,h-6);
      g.fillStyle='rgba(255,255,255,.08)'; g.fillRect(bx,by,W2/4-6,4); g.fillStyle='rgba(0,0,0,.1)'; g.fillRect(bx,by+h-10,W2/4-6,4); } } });
  const rockTex=mkTex(256,256,(g,W2,H2)=>{ const r=RNG(11); g.fillStyle='#7a5f43'; g.fillRect(0,0,W2,H2); for(let y=0;y<H2;y+=6){ g.fillStyle=`rgba(${r()<0.5?40:150},${r()<0.5?28:115},${r()<0.5?18:80},${0.12+r()*0.18})`; g.fillRect(0,y,W2,2+r()*4); }
    for(let i=0;i<300;i++){ g.fillStyle=`rgba(30,20,12,${0.08+r()*0.12})`; g.fillRect(r()*W2,r()*H2,2+r()*6,1+r()*3); } });
  const bannerTex=mkTex(128,256,(g,W2,H2)=>{ g.fillStyle='#ffffff'; g.fillRect(0,0,W2,H2); g.fillStyle='rgba(0,0,0,.18)'; g.fillRect(0,0,W2,18); g.fillRect(0,H2-62,W2,8);
    g.fillStyle='rgba(255,255,255,.95)'; g.beginPath(); g.arc(W2/2,H2*0.48,34,Math.PI,0); g.closePath(); g.fill(); g.strokeStyle='rgba(0,0,0,.35)'; g.lineWidth=5; g.stroke();
    g.fillStyle='rgba(0,0,0,.28)'; g.fillRect(W2/2-40,H2*0.48+4,80,8); });
  const MS={ tile:toon({map:tileTex}), stone:toon({map:stoneTex}), trim:toon({color:0x6f7d97}), cap:toon({color:0xe9dcbc}), rock:toon({map:rockTex,flatShading:true}), grass:toon({color:0x7cbf4a,flatShading:true}),
    dark:toon({color:0x4a3f33}), gold:toon({color:0xffcf4a,metalness:0.6,roughness:0.35}), crystal:toon({color:0x9ff7ff,emissive:0x35e9ff,emissiveIntensity:1.4,transparent:true,opacity:0.92}) };
  const tileW=4, stoneW=2;
  // ---- the plaza ----
  { const m=new T.Mesh(boxGeo(A*2,2.4,A*2,tileW),[MS.stone,MS.stone,MS.tile,MS.rock,MS.stone,MS.stone]); m.position.set(0,-1.2,0); m.receiveShadow=true; m.castShadow=true; W.add(m); collider(-A,A,-2.4,0,-A,A); }
  // edge band and a lip of darker stone all round
  addMerged([[new T.BoxGeometry(A*2+0.5,0.5,A*2+0.5),MX(0,-2.55,0)]],MS.trim,{cast:false});
  // ---- the island underneath ----
  { const g=new T.CylinderGeometry(30.5,3,30,8,5); g.rotateY(Math.PI/8); const p=g.attributes.position; const r=RNG(21);
    for(let i=0;i<p.count;i++){ const y=p.getY(i); if(y>14.9) continue; const k=1+(r()-0.5)*0.28*(1-(y+15)/40); p.setX(i,p.getX(i)*k); p.setZ(i,p.getZ(i)*k); p.setY(i,y+(r()-0.5)*1.6); }
    g.computeVertexNormals(); const m=new T.Mesh(g,MS.rock); m.position.y=-17.4; W.add(m);
    // hanging rocks and roots
    const L=[]; for(let i=0;i<14;i++){ const a=r()*Math.PI*2, d=8+r()*16; const s=1+r()*2.6; L.push([new T.ConeGeometry(s,s*3,5),MX(Math.cos(a)*d,-31-r()*6-s,Math.sin(a)*d,Math.PI,r()*3,0)]); } addMerged(L,MS.rock,{cast:false});
    // a waterfall pouring off the south edge
    const wt=mkTex(64,256,(g2,W2,H2)=>{ g2.fillStyle='#bfe9ff'; g2.fillRect(0,0,W2,H2); const r2=RNG(4); for(let i=0;i<70;i++){ g2.fillStyle=`rgba(255,255,255,${0.3+r2()*0.6})`; g2.fillRect(r2()*W2,r2()*H2,2+r2()*3,20+r2()*40); } });
    const wm=new T.MeshBasicMaterial({map:wt,transparent:true,opacity:0.82,side:T.DoubleSide,depthWrite:false}); const wf=new T.Mesh(new T.PlaneGeometry(5,46),wm); wf.position.set(0,-25,A+0.35); W.add(wf); wt.repeat.set(1,3);
    const mist=sprite(0xffffff,14,0.55); mist.position.set(0,-46,A+1); W.add(mist);
    animated.push(t=>{ wt.offset.y=(t*1.4)%1; }); }
  // ---- stone ramp: walkable wedge (pushed into the shared ramp list) with stone faces ----
  function sRamp(minX,maxX,minZ,maxZ,axis,lowAtMin,h){ const r={minX,maxX,minZ,maxZ,axis,lowAtMin,hLow:0,hHigh:h}; ramps.push(r);
    const yAt=(x,z)=>rampHeight(r,x,z); const c=[[minX,minZ],[maxX,minZ],[maxX,maxZ],[minX,maxZ]]; const top=c.map(p=>[p[0],yAt(p[0],p[1]),p[1]]), bot=c.map(p=>[p[0],-0.001,p[1]]);
    const mk=(quads,mat)=>{ const v=[],uv=[]; for(const [a,b,cc,d,su,sv] of quads){ v.push(...a,...b,...cc,...a,...cc,...d); uv.push(0,0,su,0,su,sv,0,0,su,sv,0,sv); } const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(v,3)); g.setAttribute('uv',new T.Float32BufferAttribute(uv,2)); g.computeVertexNormals(); const m=new T.Mesh(g,mat); m.castShadow=true; m.receiveShadow=true; W.add(m); };
    const lx=(maxX-minX)/tileW, lz=(maxZ-minZ)/tileW; mk([[top[0],top[3],top[2],top[1],lz,lx]],MS.tile);
    mk([[top[0],top[1],bot[1],bot[0],(maxX-minX)/stoneW,h/stoneW],[top[1],top[2],bot[2],bot[1],(maxZ-minZ)/stoneW,h/stoneW],[top[2],top[3],bot[3],bot[2],(maxX-minX)/stoneW,h/stoneW],[top[3],top[0],bot[0],bot[3],(maxZ-minZ)/stoneW,h/stoneW]],MS.stone);
    contact(minX,maxX,minZ,maxZ,0,0.3); }
  // a block of stone (walls, keep, towers): solid + merged faces
  const STONE=[], CAPS=[], TRIM=[];
  function block(x0,x1,y0,y1,z0,z1,o={}){ collider(x0,x1,y0,y1,z0,z1); if(o.shadow!==false) contact(x0,x1,z0,z1,y0,0.4,0.8);
    STONE.push([boxGeo(x1-x0,y1-y0,z1-z0,stoneW),MX((x0+x1)/2,(y0+y1)/2,(z0+z1)/2)]);
    if(o.cap) CAPS.push([new T.BoxGeometry(x1-x0+0.16,0.16,z1-z0+0.16),MX((x0+x1)/2,y1+0.02,(z0+z1)/2)]); }
  // ---- the keep in the middle ----
  const KH=2.6, KS=7;
  { const m=new T.Mesh(boxGeo(KS*2,KH,KS*2,stoneW),[MS.stone,MS.stone,MS.tile,MS.stone,MS.stone,MS.stone]); m.position.set(0,KH/2,0); m.castShadow=true; m.receiveShadow=true; W.add(m); collider(-KS,KS,0,KH,-KS,KS); contact(-KS,KS,-KS,KS,0,0.5);
    TRIM.push([new T.BoxGeometry(KS*2+0.12,0.26,KS*2+0.12),MX(0,KH-0.14,0)]); }
  sRamp(-2.25,2.25,KS,KS+6.5,'z',false,KH); sRamp(-2.25,2.25,-KS-6.5,-KS,'z',true,KH); sRamp(KS,KS+6.5,-2.25,2.25,'x',false,KH); sRamp(-KS-6.5,-KS,-2.25,2.25,'x',true,KH);
  // low walls on top with gaps for the ramps
  for(const s of [-1,1]){ for(const [a,b] of [[-KS,-2.25],[2.25,KS]]){ block(a,b,KH,KH+0.95,s>0?KS-0.5:-KS,s>0?KS:-KS+0.5,{cap:true,shadow:false}); block(s>0?KS-0.5:-KS,s>0?KS:-KS+0.5,KH,KH+0.95,a,b,{cap:true,shadow:false}); } }
  // the beacon: stepped base, a tall shaft, and a floating crystal
  block(-1.3,1.3,KH,KH+1.0,-1.3,1.3,{cap:true}); block(-0.75,0.75,KH+1.0,KH+6.2,-0.75,0.75,{cap:true,shadow:false});
  const crystal=new T.Mesh(new T.OctahedronGeometry(1.05,0),MS.crystal); crystal.scale.set(1,1.5,1); crystal.position.set(0,KH+8.1,0); W.add(crystal);
  const cg=sprite(0x35e9ff,9,0.75); cg.position.copy(crystal.position); W.add(cg);
  const ring=new T.Mesh(new T.TorusGeometry(1.8,0.08,6,32),MS.gold); ring.position.copy(crystal.position); ring.rotation.x=Math.PI/2; W.add(ring);
  animated.push(t=>{ crystal.rotation.y=t*0.8; crystal.position.y=KH+8.1+Math.sin(t*1.3)*0.25; ring.rotation.z=t*0.5; ring.position.y=crystal.position.y; cg.position.y=crystal.position.y; cg.material.opacity=0.6+Math.sin(t*2.1)*0.15; });
  // ---- corner towers with ramps ----
  const TH=3.6, TS=3.5, TC=23;
  const bannerCols=SLOT_TEAMS.map(k=>TEAM[k].body); const banners=[];
  for(const sx of [-1,1]) for(const sz of [-1,1]){ const cx=sx*TC, cz=sz*TC;
    block(cx-TS,cx+TS,0,TH,cz-TS,cz+TS); { const m=new T.Mesh(new T.PlaneGeometry(TS*2,TS*2),MS.tile); m.rotation.x=-Math.PI/2; m.position.set(cx,TH+0.004,cz); m.receiveShadow=true; W.add(m); }
    TRIM.push([new T.BoxGeometry(TS*2+0.12,0.26,TS*2+0.12),MX(cx,TH-0.14,cz)]);
    // battlements on the two outer sides
    const ox=cx+sx*(TS-0.25), oz=cz+sz*(TS-0.25);
    block(ox-0.25,ox+0.25,TH,TH+0.7,cz-TS,cz+TS,{shadow:false}); block(cx-TS,cx+TS,TH,TH+0.7,oz-0.25,oz+0.25,{shadow:false});
    for(let i=0;i<4;i++){ const u=-TS+0.6+i*(TS*2-1.2)/3; CAPS.push([boxGeo(0.62,0.6,0.62,stoneW),MX(ox,TH+1.0,cz+u)]); CAPS.push([boxGeo(0.62,0.6,0.62,stoneW),MX(cx+u,TH+1.0,oz)]); }
    // ramp up from the inside
    if(sx>0) sRamp(TC-TS-8,TC-TS,sz>0?cz-2.5:cz-1,sz>0?cz+1:cz+2.5,'x',true,TH); else sRamp(-TC+TS,-TC+TS+8,sz>0?cz-2.5:cz-1,sz>0?cz+1:cz+2.5,'x',false,TH);
    // banner poles on the outer corner
    for(const k of [0,1]){ const px=k?cx+sx*(TS+0.15):cx+sx*(TS-1.6), pz=k?cz+sz*(TS-1.6):cz+sz*(TS+0.15);
      const pole=new T.Mesh(new T.CylinderGeometry(0.07,0.07,4.2,6),MS.dark); pole.position.set(px,TH+2.1,pz); W.add(pole);
      const ci=banners.length%bannerCols.length; const bm=toon({map:bannerTex,color:bannerCols[ci],side:T.DoubleSide,emissive:bannerCols[ci],emissiveIntensity:0.12});
      const g=new T.PlaneGeometry(1.1,2.1); g.translate(0.58,-1.05,0); const b=new T.Mesh(g,bm); b.position.set(px,TH+4.1,pz); b.rotation.y=(k? (sx>0?-Math.PI/2:Math.PI/2) : (sz>0?0:Math.PI)); b.castShadow=true; W.add(b); banners.push({b,ph:rng()*6,base:b.rotation.y}); } }
  animated.push(t=>{ for(const o of banners){ o.b.rotation.y=o.base+Math.sin(t*1.7+o.ph)*0.18; o.b.rotation.x=Math.sin(t*2.3+o.ph)*0.06; } });
  // ---- cover in the four side bays: a broken wall and crates ----
  for(const [ax,s] of [['z',1],['z',-1],['x',1],['x',-1]]){ const P=(u,v)=>ax==='z'?[u,v]:[v,u];
    const w0=P(-3.5,s*19.6), w1=P(3.5,s*20.4); block(Math.min(w0[0],w1[0]),Math.max(w0[0],w1[0]),0,1.7,Math.min(w0[1],w1[1]),Math.max(w0[1],w1[1]),{cap:true});
    for(const [u,v,h] of [[-5.2,22.6,1.4],[5.2,22.6,2.8]]){ const c=P(u,s*v); solid(c[0]-0.7,c[0]+0.7,0,h,c[1]-0.7,c[1]+0.7,M.crate,1.4); if(h>1.5){ boxEdges(c[0]-0.7,c[0]+0.7,0,1.4,c[1]-0.7,c[1]+0.7,0.08,M.wood); boxEdges(c[0]-0.7,c[0]+0.7,1.4,h,c[1]-0.7,c[1]+0.7,0.08,M.wood); } else boxEdges(c[0]-0.7,c[0]+0.7,0,h,c[1]-0.7,c[1]+0.7,0.08,M.wood); } }
  // ---- a ring of pillars ----
  for(let i=0;i<8;i++){ const a=Math.PI/8+i*Math.PI/4, x=Math.cos(a)*13.5, z=Math.sin(a)*13.5;
    block(x-0.65,x+0.65,0,3.8,z-0.65,z+0.65); CAPS.push([boxGeo(1.6,0.35,1.6,stoneW),MX(x,3.95,z)]); CAPS.push([boxGeo(1.6,0.3,1.6,stoneW),MX(x,0.15,z)]);
    const fl=sprite(0xffb347,1.6,0.9); fl.position.set(x,4.55,z); W.add(fl); const bowl=new T.Mesh(new T.CylinderGeometry(0.4,0.25,0.3,8),MS.dark); bowl.position.set(x,4.25,z); W.add(bowl);
    animated.push(t=>{ fl.scale.setScalar(1.5+Math.sin(t*9+i)*0.12); }); }
  // ---- low walls along the edges, with gaps ----
  for(const s of [-1,1]) for(const [a,b] of [[-17,-6],[6,17]]){ block(a,b,0,1.0,s*A-(s>0?0.6:0),s*A+(s<0?0.6:0),{cap:true,shadow:false}); block(s*A-(s>0?0.6:0),s*A+(s<0?0.6:0),0,1.0,a,b,{cap:true,shadow:false}); }
  // merge all the stone, caps and trims into a few meshes
  addMerged(STONE,MS.stone); addMerged(CAPS,MS.cap); addMerged(TRIM,MS.trim,{cast:false});
  // ---- sky: golden hour ----
  const sunDir=V3(-34,40,22).normalize();
  const sky=new T.Mesh(new T.SphereGeometry(700,32,20),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,uniforms:{sunDir:{value:sunDir}},
    vertexShader:'varying vec3 vDir; void main(){ vDir=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader:'uniform vec3 sunDir; varying vec3 vDir; void main(){ vec3 d=normalize(vDir); float h=d.y; vec3 low=vec3(0.96,0.86,0.80), hor=vec3(1.0,0.80,0.60), mid=vec3(0.66,0.76,0.93), top=vec3(0.30,0.48,0.85); vec3 c=mix(low,hor,smoothstep(-0.35,0.0,h)); c=mix(c,mid,smoothstep(0.02,0.3,h)); c=mix(c,top,smoothstep(0.28,0.9,h)); float s=max(dot(d,sunDir),0.0); c+=vec3(1.0,0.85,0.6)*(smoothstep(0.996,0.998,s)*0.9+pow(s,10.0)*0.35); gl_FragColor=vec4(c,1.0); }'}));
  W.add(sky); animated.push(()=>{ sky.position.copy(camera.position); });
  // ---- a sea of clouds below, and a few far islands ----
  { const cm=toon({color:0xffffff,emissive:0xffe6cf,emissiveIntensity:0.45,flatShading:false}); const L=[]; const r=RNG(31);
    for(let i=0;i<70;i++){ const a=r()*Math.PI*2, d=26+Math.pow(r(),0.7)*330, y=-30-r()*26; const n=3+Math.floor(r()*4); const sc=4+r()*9+d*0.02;
      for(let j=0;j<n;j++){ const g=new T.SphereGeometry(1,8,6); L.push([g,MX(Math.cos(a)*d+(j-n/2)*sc*1.2,y+r()*2,Math.sin(a)*d+(r()-0.5)*sc,0,r()*3,0,sc*1.6,sc*0.62,sc)]); } }
    addMerged(L,cm,{cast:false});
    const floor=new T.Mesh(new T.CircleGeometry(900,24),new T.MeshBasicMaterial({color:0xf7e6d6,fog:true})); floor.rotation.x=-Math.PI/2; floor.position.y=-58; W.add(floor);
    const R=[], G=[]; for(let i=0;i<7;i++){ const a=i/7*Math.PI*2+r()*0.4, d=110+r()*170, s=6+r()*12, y=-6+r()*30; const x=Math.cos(a)*d, z=Math.sin(a)*d;
      R.push([new T.ConeGeometry(s,s*2.4,7),MX(x,y-s*1.2,z,Math.PI,r()*3,0)]); G.push([new T.CylinderGeometry(s*1.02,s*0.95,s*0.3,7),MX(x,y+s*0.15,z,0,r()*3,0)]);
      for(let k=0;k<3;k++) kenPlace({name:'trees',x:x+(r()-0.5)*s,y:y+s*0.3,z:z+(r()-0.5)*s,ry:r()*6,s:s*0.25,group:W}); }
    addMerged(R,MS.rock,{cast:false}); addMerged(G,MS.grass,{cast:false});
    // little rocks drifting round the island
    const orbit=new T.Group(); W.add(orbit); const oL=[]; for(let i=0;i<12;i++){ const a=i/12*Math.PI*2, d=40+r()*14, s=0.6+r()*1.4; oL.push([new T.DodecahedronGeometry(s,0),MX(Math.cos(a)*d,-6-r()*16,Math.sin(a)*d,r()*3,r()*3,0)]); }
    const om=new T.Mesh(mergeGeos(oL),MS.rock); orbit.add(om); animated.push(t=>{ orbit.rotation.y=t*0.02; orbit.position.y=Math.sin(t*0.4)*0.6; }); }
}
MAPS.skyfort={ name:'Skyfort', native:[30,30], scale:1, spawnX:24, killY:-14, battleOnly:true, shadow:37, build(){ buildSkyfort(); },
  // where people drop in: away from walls, spread over the whole fort (the keep top too)
  spawns:[[9,25],[-9,25],[9,-25],[-9,-25],[25,9],[25,-9],[-25,9],[-25,-9],[14,14],[-14,14],[14,-14],[-14,-14],[4.6,4.6],[-4.6,4.6],[4.6,-4.6],[-4.6,-4.6]],
  env:{ fog:[0xf1d8c2,90,460], hemi:[0xfff0dc,0x8a7a9a,0.72], sun:[0xffd6a3,1.3,[-34,40,22]], bloom:[0.2,0.45,0.9] } };
LOOK_MAP.skyfort={ exp:1.02, envI:1.05, hemi:0.5, sun:1.25, grade:{sat:1.12,con:0.2,vig:0.3,warm:[1.05,1.0,0.95],cool:[0.95,0.98,1.04]} };
