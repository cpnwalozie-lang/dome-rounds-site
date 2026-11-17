// ================= CRANE + FOUNDRY maps =================
// Crane: an octagon deck hanging off a tower crane high over a city. The crane slowly swings you round,
// and the deck tips towards whichever side has the most weight on it (everyone slides downhill a bit).
// The deck stays put in game space; the world, crane and sky tip and turn around it instead, so collision stays simple.
// Foundry: a steel floor over lava with a slamming press in the middle, two spiked balls swinging at body height
// and saws running along floor slots. All hazards run off the round clock so online screens agree.
const MAPHZ={ list:[], spheres:[] }; // live hazards for the current map (bullets stop on spheres)
function octBoxes(a,y0,y1,step){ const lim=a*Math.SQRT2; for(let X=a;X>=lim-a-0.01;X-=step){ const Z=Math.min(a,lim-X); collider(-X,X,y0,y1,-Z,Z); collider(-Z,Z,y0,y1,-X,X); } }
function cityTex(seed,base,lit){ return mkTex(128,256,(g,W2,H2)=>{ const r=RNG(seed); g.fillStyle=base; g.fillRect(0,0,W2,H2); for(let y=10;y<H2-8;y+=16) for(let x=8;x<W2-8;x+=16){ g.fillStyle=r()<0.35?lit:'rgba(20,30,50,.55)'; g.fillRect(x,y,9,10); } g.fillStyle='rgba(0,0,0,.15)'; g.fillRect(0,0,W2,6); }); }

function buildCrane(){
  const rng=RNG(77); const A=23, SPX=16.8; // deck apothem, base distance
  const PH=27; // hook pivot height
  // ---- deck ----
  const deckTex=mkTex(1024,1024,(g,W2,H2)=>{ g.fillStyle='#8a929e'; g.fillRect(0,0,W2,H2); const r=RNG(3); for(let i=0;i<5000;i++){ g.fillStyle=`rgba(${r()<0.5?0:255},${r()<0.5?0:255},${r()<0.5?0:255},0.035)`; g.fillRect(r()*W2,r()*H2,2,2); }
    g.strokeStyle='rgba(40,46,58,.55)'; g.lineWidth=3; for(let i=0;i<=8;i++){ g.beginPath(); g.moveTo(i*W2/8,0); g.lineTo(i*W2/8,H2); g.stroke(); g.beginPath(); g.moveTo(0,i*H2/8); g.lineTo(W2,i*H2/8); g.stroke(); }
    g.fillStyle='rgba(255,255,255,.08)'; for(let y=8;y<H2;y+=22) for(let x=(y/22%2)*11;x<W2;x+=22){ g.save(); g.translate(x,y); g.rotate(0.6); g.fillRect(-5,-1.5,10,3); g.restore(); }
    g.save(); g.translate(W2/2,H2/2); g.strokeStyle='#ffd21f'; g.lineWidth=10; g.beginPath(); g.arc(0,0,150,0,7); g.stroke(); g.lineWidth=5; g.beginPath(); g.arc(0,0,128,0,7); g.stroke(); g.fillStyle='#ffd21f'; g.font='bold 54px "Lilita One",sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText('MAX 4 FIGHTERS',0,-210); g.rotate(Math.PI); g.fillText('KEEP IT LEVEL',0,-210); g.restore();
    for(const [sx,c] of [[-1,'#19c8ff'],[1,'#ff7a1a']]){ g.strokeStyle=c; g.lineWidth=8; g.beginPath(); g.arc(W2/2+sx*W2*SPX/(2*A*1.09),H2/2,64,0,7); g.stroke(); g.globalAlpha=0.16; g.fillStyle=c; g.beginPath(); g.arc(W2/2+sx*W2*SPX/(2*A*1.09),H2/2,64,0,7); g.fill(); g.globalAlpha=1; }
    const r2=RNG(31); for(let i=0;i<14;i++){ const x=r2()*W2, y=r2()*H2, rr=14+r2()*46; const gr=g.createRadialGradient(x,y,1,x,y,rr); gr.addColorStop(0,'rgba(30,26,22,.32)'); gr.addColorStop(1,'rgba(30,26,22,0)'); g.fillStyle=gr; g.beginPath(); g.ellipse(x,y,rr,rr*(0.5+r2()*0.5),r2()*3,0,7); g.fill(); } // oil + wear
    g.fillStyle='rgba(20,24,32,.5)'; for(let i=1;i<8;i++) for(let j=0;j<=8;j++){ for(let k=0;k<8;k++){ g.beginPath(); g.arc(i*W2/8+(k-3.5)*13,j*H2/8+5,1.8,0,7); g.fill(); } } // bolt rows on the seams
    g.strokeStyle='rgba(255,210,31,.55)'; g.lineWidth=4; g.setLineDash([26,18]); for(const y of [H2*0.5-36,H2*0.5+36]){ g.beginPath(); g.moveTo(W2*0.2,y); g.lineTo(W2*0.42,y); g.moveTo(W2*0.58,y); g.lineTo(W2*0.8,y); g.stroke(); } g.setLineDash([]);
    g.fillStyle='rgba(255,255,255,.55)'; g.font='bold 30px "Lilita One",sans-serif'; g.textAlign='center'; for(const [x,y,t] of [[0.2,0.16,'BAY C-01'],[0.8,0.84,'BAY C-02']]) g.fillText(t,W2*x,H2*y);
    g.fillStyle='rgba(255,210,31,.85)'; for(const [x,y,a] of [[0.5,0.06,Math.PI],[0.5,0.94,0],[0.06,0.5,Math.PI/2],[0.94,0.5,-Math.PI/2]]){ g.save(); g.translate(W2*x,H2*y); g.rotate(a); for(let k=0;k<3;k++){ g.beginPath(); g.moveTo(-26,k*16); g.lineTo(0,k*16-14); g.lineTo(26,k*16); g.lineTo(26,k*16+6); g.lineTo(0,k*16-8); g.lineTo(-26,k*16+6); g.closePath(); g.fill(); } g.restore(); } },{});
  const oct=new T.CylinderGeometry(A/Math.cos(Math.PI/8),A/Math.cos(Math.PI/8),1.4,8,1); oct.rotateY(Math.PI/8);
  { const uv=oct.attributes.uv, p=oct.attributes.position; for(let i=0;i<p.count;i++){ if(Math.abs(p.getY(i)-0.7)<0.01) uv.setXY(i,0.5+p.getX(i)/(2*A*1.09),0.5-p.getZ(i)/(2*A*1.09)); } }
  const deckM=[toon({color:0x3d4554}),toon({map:deckTex}),toon({color:0x2b313d})];
  const deck=new T.Mesh(oct,deckM); deck.position.y=-0.7; deck.receiveShadow=true; deck.castShadow=true; W.add(deck);
  octBoxes(A,-1.4,0,1.2);
  // hazard rim + under-beams
  { const rim=[]; const R=A/Math.cos(Math.PI/8); for(let i=0;i<8;i++){ const a0=i/8*Math.PI*2+Math.PI/8, a1=a0+Math.PI/4; const x0=Math.cos(a0)*R, z0=Math.sin(a0)*R, x1=Math.cos(a1)*R, z1=Math.sin(a1)*R; const L=Math.hypot(x1-x0,z1-z0); rim.push([new T.BoxGeometry(L,0.16,0.5),MX((x0+x1)/2,0.04,(z0+z1)/2,0,-Math.atan2(z1-z0,x1-x0))]); }
    addMerged(rim,toon({map:TX.hazard}),{cast:false});
    const bm=[]; for(const s of [-1,1]){ bm.push([new T.BoxGeometry(2*A,1.2,0.8),MX(0,-1.9,s*8)]); bm.push([new T.BoxGeometry(0.8,1.2,2*A),MX(s*8,-1.9,0)]); } addMerged(bm,toon({color:0xffc21a})); }
  // ---- cover: containers, crates, barrels (mirror symmetric) ----
  containerBox(-4.6,4.6,0,2.6,9.6,12.0,TX.contBlue); containerBox(-4.6,4.6,0,2.6,-12.0,-9.6,TX.contOrange);
  containerBox(-1.2,1.2,0,2.6,16.4,21.2,TX.contTeal); containerBox(-1.2,1.2,0,2.6,-21.2,-16.4,TX.contTeal);
  for(const sx of [-1,1]){ crateBox(sx*17.6-0.8,sx*17.6+0.8,0,1.5,6.6,8.2,M.crateO); crateBox(sx*17.6-0.8,sx*17.6+0.8,0,1.5,-8.2,-6.6,M.crateB); crateBox(sx*6.4-0.7,sx*6.4+0.7,0,1.4,-0.7,0.7,M.crate); }
  crateBox(-1.1,1.1,0,2.2,-1.1,1.1,M.crateO); crateBox(-0.6,0.6,2.2,3.4,-0.6,0.6,M.crate);
  for(const sx of [-1,1]){ crateBox(sx*11.4-0.8,sx*11.4+0.8,0,1.3,3.4,5.0,M.crateB); crateBox(sx*11.4-0.8,sx*11.4+0.8,0,1.3,-5.0,-3.4,M.crate); barrel(sx*5.6,6.2,0x2a9df4); barrel(sx*5.6,-6.2,0xe2483d);  }
  { const R=A/Math.cos(Math.PI/8); const lip=[], posts=[], dark=toon({color:0x2a3147});
    for(let i=0;i<8;i++){ const a0=i/8*Math.PI*2+Math.PI/8, a1=a0+Math.PI/4; const x0=Math.cos(a0)*R, z0=Math.sin(a0)*R, x1=Math.cos(a1)*R, z1=Math.sin(a1)*R; const L=Math.hypot(x1-x0,z1-z0), ang=-Math.atan2(z1-z0,x1-x0);
      const n=V3((x0+x1)/2,0,(z0+z1)/2); n.multiplyScalar(-0.22/n.length()); lip.push([new T.BoxGeometry(L,0.22,0.3),MX((x0+x1)/2+n.x,0.11,(z0+z1)/2+n.z,0,ang)]);
      // a floodlight post on every corner of the octagon
      const cx=Math.cos(a0)*(R-0.6), cz=Math.sin(a0)*(R-0.6); posts.push([new T.CylinderGeometry(0.09,0.12,3.6,8),MX(cx,1.8,cz)]); posts.push([new T.BoxGeometry(0.5,0.32,0.34),MX(cx-Math.cos(a0)*0.2,3.6,cz-Math.sin(a0)*0.2,0,-a0)]); propCol(cx,cz,0.14,0,3.6);
      const lamp=new T.Mesh(new T.BoxGeometry(0.06,0.24,0.28),basic({color:0xfff4d6})); lamp.position.set(cx-Math.cos(a0)*0.46,3.6,cz-Math.sin(a0)*0.46); lamp.rotation.y=-a0; W.add(lamp); const gl=sprite(0xfff0c8,1.6,0.55); gl.position.copy(lamp.position); W.add(gl); }
    addMerged(lip,toon({map:TX.hazard})); addMerged(posts,dark);
    for(const sx of [-1,1]) railing(sx*(A-0.35),-4.2,sx*(A-0.35),4.2,0,{cap:M.yellow}); // a rail behind each base: the other edges stay open
    // steel beam bundles: three I-beams on chocks
    const ib=[], ch=[]; const bundle=(x,z)=>{ for(let k=0;k<3;k++){ const zz=z+(k-1)*0.42; ib.push([new T.BoxGeometry(3.6,0.07,0.36),MX(x,0.28,zz)]); ib.push([new T.BoxGeometry(3.6,0.36,0.07),MX(x,0.46,zz)]); ib.push([new T.BoxGeometry(3.6,0.07,0.36),MX(x,0.64,zz)]); } for(let k=0;k<2;k++){ const zz=z+(k-0.5)*0.42; ib.push([new T.BoxGeometry(3.4,0.07,0.36),MX(x,0.72,zz)]); ib.push([new T.BoxGeometry(3.4,0.36,0.07),MX(x,0.9,zz)]); ib.push([new T.BoxGeometry(3.4,0.07,0.36),MX(x,1.08,zz)]); }
      for(const dx of [-1.2,1.2]) ch.push([new T.BoxGeometry(0.3,0.24,1.5),MX(x+dx,0.12,z)]); collider(x-1.8,x+1.8,0,1.12,z-0.7,z+0.7); contact(x-1.8,x+1.8,z-0.7,z+0.7,0); };
    for(const sx of [-1,1]) for(const sz of [-1,1]) bundle(sx*14.4,sz*15.0); addMerged(ib,toon({color:0x5e8fc4,metalness:0.3,roughness:0.5})); addMerged(ch,M.wood);
    // cement bag pallets near the middle
    const bags=[], pal=[]; for(const sz of [-1,1]){ const x=0, z=sz*6.6; pal.push([new T.BoxGeometry(1.6,0.16,1.2),MX(x,0.08,z)]); for(let k=0;k<6;k++){ const lx=x+((k%3)-1)*0.5, lz=z+(k<3?-0.28:0.28); bags.push([new T.BoxGeometry(0.46,0.22,0.52),MX(lx,0.27,lz,0,0,(k%2?0.05:-0.04))]); bags.push([new T.BoxGeometry(0.46,0.22,0.52),MX(lx,0.5,lz,0,(k%2?0.1:-0.06))]); } collider(x-0.8,x+0.8,0,0.62,z-0.6,z+0.6); contact(x-0.8,x+0.8,z-0.6,z+0.6,0); }
    addMerged(bags,toon({color:0xe9e1cc})); addMerged(pal,M.wood); }
  // ---- cables and hook block (they hang with the deck) ----
  { const cab=[]; const hook=V3(0,PH-2.2,0); for(const [x,z] of [[-15,-15],[15,-15],[-15,15],[15,15]]){ const a=V3(x,0.2,z), d=V3().subVectors(hook,a), L=d.length(); const g=new T.CylinderGeometry(0.09,0.09,L,7); const q=new T.Quaternion().setFromUnitVectors(V3(0,1,0),d.clone().normalize()); cab.push([g,new T.Matrix4().compose(a.clone().addScaledVector(d,0.5),q,V3(1,1,1))]); cab.push([new T.BoxGeometry(0.8,0.3,0.8),MX(x,0.15,z)]); cab.push([new T.TorusGeometry(0.22,0.06,6,14),new T.Matrix4().compose(V3(x,0.48,z),new T.Quaternion().setFromUnitVectors(V3(0,0,1),V3(-z,0,x).normalize()),V3(1,1,1))]); }
    addMerged(cab,toon({color:0x2a3147}),{cast:false});
    const hb=[], hk=[]; hb.push([new T.BoxGeometry(2.0,2.2,0.9),MX(0,PH-0.9,0)]); for(const z of [-0.5,0.5]) hb.push([new T.CylinderGeometry(0.85,0.85,0.16,20),MX(0,PH-0.3,z,Math.PI/2)]); for(const x of [-0.45,0.45]) hk.push([new T.CylinderGeometry(0.06,0.06,9.6,6),MX(x,PH+4.4,0)]);
    hk.push([new T.CylinderGeometry(0.16,0.2,0.9,10),MX(0,PH-2.4,0)]); hk.push([new T.TorusGeometry(0.42,0.13,8,18,Math.PI*1.45),MX(0.05,PH-3.2,0,0,0,Math.PI*0.2)]); hk.push([new T.ConeGeometry(0.12,0.3,8),MX(0.43,PH-2.9,0)]);
    addMerged(hb,toon({color:0xffc21a})); addMerged(hk,toon({color:0x2a3147,metalness:0.4,roughness:0.4}));
    const hl=new T.Mesh(new T.BoxGeometry(1.2,0.5,0.02),toon({map:TX.hazard})); hl.position.set(0,PH-0.4,0.46); W.add(hl); const hl2=hl.clone(); hl2.position.z=-0.46; W.add(hl2); }
  // ---- the moving world: crane tower (tips with the world) and everything else (tips + turns) ----
  const PV=PH+8.5; const tilt=new T.Group(); tilt.position.set(0,PV,0); W.add(tilt); const off=new T.Group(); off.position.set(0,-PV,0); tilt.add(off); // the deck swings from the trolley
  const TZ=-52; // tower position (the jib reaches over to us along +z)
  { const Y=new T.Group(); off.add(Y); const yel=toon({color:0xffc21a}), dark=toon({color:0x2a3147}); const lat=[], dk=[];
    const H0=-118, H1=PH+9, s=2.2; for(const [x,z] of [[-s,-s],[s,-s],[-s,s],[s,s]]) lat.push([new T.BoxGeometry(0.35,H1-H0,0.35),MX(x,(H0+H1)/2,TZ+z)]);
    for(let y=H0;y<H1;y+=4.4){ for(const [x0,z0,x1,z1] of [[-s,-s,s,-s],[s,-s,s,s],[s,s,-s,s],[-s,s,-s,-s]]){ const a=V3(x0,y,TZ+z0), b=V3(x1,y+4.4,TZ+z1), d=V3().subVectors(b,a); lat.push([new T.BoxGeometry(0.16,d.length(),0.16),new T.Matrix4().compose(a.clone().addScaledVector(d,0.5),new T.Quaternion().setFromUnitVectors(V3(0,1,0),d.clone().normalize()),V3(1,1,1))]); lat.push([new T.BoxGeometry(Math.abs(x1-x0)+0.3,0.16,Math.abs(z1-z0)+0.3),MX((x0+x1)/2,y,TZ+(z0+z1)/2)]); } }
    // jib (to the hook) + counter-jib
    const JY=PH+9; for(const z of [-1,1]) for(const y of [0,2.4]) lat.push([new T.BoxGeometry(0.25,0.25,TZ*-1+8+22),MX(z*1.1*(y?0.4:1),JY+y,TZ/2+4-11+0.0)]);
    for(let z=TZ-22;z<6;z+=2.6){ lat.push([new T.BoxGeometry(2.4,0.14,0.14),MX(0,JY,z)]); const a=V3(-1.1,JY,z), b=V3(0,JY+2.4,z+1.3), d=V3().subVectors(b,a); lat.push([new T.BoxGeometry(0.12,d.length(),0.12),new T.Matrix4().compose(a.clone().addScaledVector(d,0.5),new T.Quaternion().setFromUnitVectors(V3(0,1,0),d.clone().normalize()),V3(1,1,1))]); }
    lat.push([new T.BoxGeometry(1.2,6,1.2),MX(0,JY+5,TZ)]); // tower peak
    for(const zt of [8,-30]){ const a=V3(0,JY+8,TZ), b=V3(0,JY+2.4,TZ+zt), d=V3().subVectors(b,a); dk.push([new T.CylinderGeometry(0.06,0.06,d.length(),5),new T.Matrix4().compose(a.clone().addScaledVector(d,0.5),new T.Quaternion().setFromUnitVectors(V3(0,1,0),d.clone().normalize()),V3(1,1,1))]); }
    dk.push([new T.BoxGeometry(3.4,3.6,4.6),MX(0,JY-0.6,TZ-20)]); // counterweight
    dk.push([new T.BoxGeometry(2.6,2.4,2.8),MX(2.6,JY-1.4,TZ+1.6)]); // cab
    dk.push([new T.BoxGeometry(1.4,0.8,1.6),MX(0,JY-0.1,0)]); // trolley over the hook
    addMerged(lat,yel); addMerged(dk,dark);
    const glass=new T.Mesh(new T.BoxGeometry(2.62,1.1,2.82),toon({color:0x9fd8ff,emissive:0x2a5a7a,emissiveIntensity:0.4})); glass.position.set(2.6,JY-0.9,TZ+1.6); Y.add(glass);
    const bl=sprite(0xff3030,3.2,1); bl.position.set(0,JY+8.4,TZ); Y.add(bl); const bl2=sprite(0xff3030,2.6,1); bl2.position.set(0,JY+2.6,TZ-22); Y.add(bl2); animated.push(t=>{ const on=Math.sin(t*3)>0.3; bl.material.opacity=on?1:0.12; bl2.material.opacity=on?0.15:1; }); }
  const spin=new T.Group(); spin.position.set(0,0,TZ); off.add(spin); const world=new T.Group(); world.position.set(0,0,-TZ); spin.add(world);
  { const prevW=W; W=world; const GY=-120;
    const gTex=mkTex(1024,1024,(g,W2,H2)=>{ g.fillStyle='#7d9a6a'; g.fillRect(0,0,W2,H2); const r=RNG(8); for(let i=0;i<60;i++){ g.fillStyle=['#8fae78','#6f8c5d','#a3a59a','#94a184'][Math.floor(r()*4)]; g.fillRect(r()*W2,r()*H2,20+r()*120,20+r()*120); } g.strokeStyle='#5d6470'; g.lineWidth=14; for(let i=0;i<=8;i++){ g.beginPath(); g.moveTo(i*W2/8,0); g.lineTo(i*W2/8,H2); g.stroke(); g.beginPath(); g.moveTo(0,i*H2/8); g.lineTo(W2,i*H2/8); g.stroke(); } g.strokeStyle='#e8e8e0'; g.setLineDash([10,14]); g.lineWidth=2; for(let i=0;i<=8;i++){ g.beginPath(); g.moveTo(i*W2/8,0); g.lineTo(i*W2/8,H2); g.stroke(); g.beginPath(); g.moveTo(0,i*H2/8); g.lineTo(W2,i*H2/8); g.stroke(); } });
    gTex.wrapS=gTex.wrapT=T.RepeatWrapping; gTex.repeat.set(3,3);
    const ground=new T.Mesh(new T.CircleGeometry(900,48),toon({map:gTex})); ground.rotation.x=-Math.PI/2; ground.position.y=GY; world.add(ground);
    const mats=[cityTex(1,'#c9ced8','#ffe9b0'),cityTex(2,'#e7d7c2','#fff2c8'),cityTex(3,'#9fb4cc','#e9f6ff'),cityTex(4,'#d8c0c0','#ffe0b0')].map(t=>toon({map:t}));
    const lists=[[],[],[],[]]; const roof=[], tanks=[], ac=[];
    for(let i=0;i<170;i++){ const a=rng()*Math.PI*2, r=34+rng()*rng()*380; const x=Math.cos(a)*r, z=Math.sin(a)*r+TZ; const w=10+rng()*18, d=10+rng()*18; const h=r<70? 14+rng()*40 : 18+rng()*rng()*95; const k=Math.floor(rng()*4);
      const g=new T.BoxGeometry(w,h,d); const uv=g.attributes.uv; for(let j=0;j<uv.count;j++) uv.setXY(j,uv.getX(j)*Math.max(1,Math.round(w/8)),uv.getY(j)*Math.max(1,Math.round(h/16)));
      lists[k].push([g,MX(x,GY+h/2,z)]); let top=GY+h;
      if(h>40&&rng()<0.45){ const w2=w*0.62, d2=d*0.62, h2=8+rng()*22; const g2=new T.BoxGeometry(w2,h2,d2); const u2=g2.attributes.uv; for(let j=0;j<u2.count;j++) u2.setXY(j,u2.getX(j)*Math.max(1,Math.round(w2/8)),u2.getY(j)*Math.max(1,Math.round(h2/16))); lists[k].push([g2,MX(x,top+h2/2,z)]); roof.push([new T.BoxGeometry(w+0.6,0.6,d+0.6),MX(x,top+0.3,z)]); top+=h2; }
      roof.push([new T.BoxGeometry(w*0.4,1.6,d*0.4),MX(x+w*0.15,top+0.8,z-d*0.1)]);
      if(rng()<0.5) tanks.push([new T.CylinderGeometry(1.4,1.4,2.6,10),MX(x-w*0.25,top+1.9,z+d*0.2)],[new T.ConeGeometry(1.5,0.9,10),MX(x-w*0.25,top+3.6,z+d*0.2)]);
      for(let q=0;q<2+Math.floor(rng()*3);q++) ac.push([new T.BoxGeometry(1.6,1,1.2),MX(x+(rng()-0.5)*w*0.7,top+0.5,z+(rng()-0.5)*d*0.7)]); }
    addMerged(tanks,toon({color:0x8a6a4a}),{cast:false}); addMerged(ac,toon({color:0xc8ced8}),{cast:false});
    // parks: tree clumps
    const trees=[]; for(let i=0;i<14;i++){ const a=rng()*6.28, r=50+rng()*260, px=Math.cos(a)*r, pz=Math.sin(a)*r+TZ; const pk=new T.Mesh(new T.CircleGeometry(16+rng()*14,20),toon({color:0x6fae5a})); pk.rotation.x=-Math.PI/2; pk.position.set(px,GY+0.15,pz); world.add(pk); for(let t2=0;t2<12;t2++){ const s2=2+rng()*2.4; trees.push([new T.IcosahedronGeometry(s2,0),MX(px+(rng()-0.5)*26,GY+s2*1.1,pz+(rng()-0.5)*26)]); } }
    addMerged(trees,toon({color:0x3f8f4a}),{cast:false});
    // traffic on the main roads
    const carG=new T.BoxGeometry(4.2,1.6,2); const carCols=[0xe2483d,0xf4f6fb,0x2f6fe4,0xffd21f,0x2a3147]; const cars=[];
    for(let i=0;i<40;i++){ const m=new T.Mesh(carG,toon({color:carCols[i%5]})); world.add(m); cars.push({m,lane:(i%4)-1.5,ax:i%2,sp:(14+rng()*10)*(i%3?1:-1),ph:rng()*900}); }
    animated.push(t=>{ for(const c of cars){ const p=((t*c.sp+c.ph)%900+900)%900-450; const l=Math.round(c.lane)*75; if(c.ax){ c.m.position.set(p,GY+0.9,l+(c.sp>0?2.2:-2.2)); c.m.rotation.y=0; } else { c.m.position.set(l+(c.sp>0?2.2:-2.2),GY+0.9,p); c.m.rotation.y=Math.PI/2; } } });
    lists.forEach((l,k)=>{ const m=new T.Mesh(mergeGeos(l),mats[k]); for(const mm of [mats[k]]) mm.map.wrapS=mm.map.wrapT=T.RepeatWrapping; world.add(m); }); addMerged(roof,toon({color:0x707a88}),{cast:false});
    // a park and a river so it reads as a city from up here
    const river=new T.Mesh(new T.PlaneGeometry(40,1800),toon({color:0x4f8fc0})); river.rotation.x=-Math.PI/2; river.rotation.z=0.5; river.position.set(-120,GY+0.2,40); world.add(river);
    W=prevW; }
  // sky rides with the tilt but not the turn (so the sun stays where the light comes from)
  const sky=new T.Mesh(new T.SphereGeometry(700,32,20),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,uniforms:{sunDir:{value:V3(30,40,-20).normalize()}},
    vertexShader:'varying vec3 vDir; void main(){ vDir=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader:'uniform vec3 sunDir; varying vec3 vDir; void main(){ vec3 d=normalize(vDir); float h=d.y; vec3 hor=vec3(0.80,0.88,0.96), mid=vec3(0.55,0.74,0.95), top=vec3(0.25,0.47,0.86); vec3 c=mix(hor,mid,smoothstep(-0.05,0.25,h)); c=mix(c,top,smoothstep(0.2,0.85,h)); float s=max(dot(d,sunDir),0.0); c+=vec3(1.0,0.95,0.8)*(smoothstep(0.995,0.997,s)+pow(s,12.0)*0.3); gl_FragColor=vec4(c,1.0); }'}));
  tilt.add(sky);
  // clouds drift below and around
  { const cg=new T.SphereGeometry(1,10,8), cm=toon({color:0xffffff,emissive:0xcfe2f5,emissiveIntensity:0.5}); for(let i=0;i<16;i++){ const g=new T.Group(); const n=4+Math.floor(rng()*4); for(let j=0;j<n;j++){ const s=new T.Mesh(cg,cm); const r=5+rng()*7; s.scale.set(r*1.6,r*0.7,r); s.position.set(j*r*1.3-n*r*0.6,rng()*2,rng()*4); g.add(s); } const a=rng()*6.28, rr=90+rng()*260; g.position.set(Math.cos(a)*rr,-30-rng()*50,Math.sin(a)*rr+TZ); world.add(g); } }
  // ---- motion: slow turn + weight tilt (spring + damping so it rocks a little) ----
  const st={ q:new T.Quaternion(), rx:0, rz:0, vx:0, vz:0, down:V3(0,-1,0) };
  const qInv=new T.Quaternion(), e=new T.Euler();
  animated.push((t,dt)=>{ dt=Math.min(dt||0.016,0.05); spin.rotation.y=-t*0.05;
    let sx=0, sz=0, sw=0; let live=[]; try{ live=fighters.filter(f=>!f.dead&&f.active!==false&&f.pos.y>-1.5); }catch(e){}
    if(state==='fight'||state==='countdown') for(const f of live){ const w=f.maxHp(); sx+=f.pos.x*w; sz+=f.pos.z*w; sw+=w; }
    const cx=sw?sx/sw:0, cz=sw?sz/sw:0; const K=0.0075, MAX=0.12; const tz=clamp(-cx*K,-MAX,MAX), tx=clamp(cz*K,-MAX,MAX);
    st.vx+=((tx-st.rx)*2.2-st.vx*1.1)*dt; st.vz+=((tz-st.rz)*2.2-st.vz*1.1)*dt; st.rx+=st.vx*dt; st.rz+=st.vz*dt;
    st.rx+=Math.sin(t*0.37)*0.00004; st.rz+=Math.cos(t*0.29)*0.00004; // a little wind sway
    st.q.setFromEuler(e.set(st.rx,0,st.rz)); qInv.copy(st.q).invert(); tilt.quaternion.copy(qInv);
    st.down.set(0,-1,0).applyQuaternion(qInv); // which way "down" points from the deck's point of view
    sky.position.copy(tilt.worldToLocal(camera.position.clone()));
    // everyone standing on the deck drifts downhill
    if(state==='fight') for(const f of live){ if(f.ctl==='net'||!f.onGround||f.dashT>0) continue; f.pos.x+=st.down.x*16*dt; f.pos.z+=st.down.z*16*dt; } });
}

// ---------------- FOUNDRY ----------------
function buildFoundry(){
  const rng=RNG(404); const ORG=0xff6a1a; const NX=3, NZ=9.5, SWX=14, BX=9.5; // notch half-width/start, saw slot x, ball x
  // floor: riveted steel plates with hazard edging, over lava
  const fTex=mkTex(2048,1024,(g,W2,H2)=>{ g.setTransform(W2/(2*HX),0,0,H2/(2*HZ),W2/2,H2/2); const r=RNG(5);
    for(let x=-HX;x<HX;x+=3) for(let z=-HZ;z<HZ;z+=3){ const v=r(); g.fillStyle=`hsl(${210+v*12},${8+v*6}%,${30+v*8}%)`; g.fillRect(x+0.04,z+0.04,2.92,2.92); g.fillStyle='rgba(255,255,255,.07)'; g.fillRect(x+0.04,z+0.04,2.92,0.06); g.fillStyle='rgba(0,0,0,.25)'; for(const [a,b] of [[0.25,0.25],[2.75,0.25],[0.25,2.75],[2.75,2.75]]){ g.beginPath(); g.arc(x+a,z+b,0.09,0,7); g.fill(); } }
    for(let i=0;i<4000;i++){ g.fillStyle=`rgba(${r()<0.5?0:255},${r()<0.6?60:200},0,${r()*0.05})`; g.fillRect(-HX+r()*2*HX,-HZ+r()*2*HZ,0.05+r()*0.3,0.04); }
    g.fillStyle='#ffb21f'; for(let x=-HX;x<HX;x+=1.2){ g.save(); g.translate(x,0); g.fillRect(0,-HZ,0.6,0.5); g.fillRect(0,HZ-0.5,0.6,0.5); g.restore(); }
    for(const [sx,c] of [[-1,'#19c8ff'],[1,'#ff7a1a']]){ g.strokeStyle=c; g.lineWidth=0.18; g.beginPath(); g.arc(sx*(HX-4),0,3,0,7); g.stroke(); }
    // stomper warning ring + saw slots
    g.strokeStyle='#ffd21f'; g.lineWidth=0.3; g.setLineDash([0.8,0.5]); g.strokeRect(-3.4,-3.4,6.8,6.8); g.setLineDash([]);
    g.fillStyle='#120b08'; for(const x of [-SWX,SWX]) g.fillRect(x-0.25,-13,0.5,26); },{});
    collider(-HX,-NX,-1.5,0,-HZ,HZ); collider(NX,HX,-1.5,0,-HZ,HZ); collider(-NX,NX,-1.5,0,-NZ,NZ);
  { const sh=new T.Shape(); const pts=[[-HX,-HZ],[-NX,-HZ],[-NX,-NZ],[NX,-NZ],[NX,-HZ],[HX,-HZ],[HX,HZ],[NX,HZ],[NX,NZ],[-NX,NZ],[-NX,HZ],[-HX,HZ]]; pts.forEach(([x,z],i)=>i?sh.lineTo(x,-z):sh.moveTo(x,-z)); sh.closePath();
    const g=new T.ShapeGeometry(sh); const p=g.attributes.position, uv=g.attributes.uv; for(let i=0;i<p.count;i++) uv.setXY(i,0.5+p.getX(i)/(2*HX),0.5+p.getY(i)/(2*HZ)); g.rotateX(-Math.PI/2);
    const top=new T.Mesh(g,toon({map:fTex})); top.position.y=0.004; top.receiveShadow=true; W.add(top);
    const sm=toon({color:0x2a2e36}); for(const [x0,x1,z0,z1] of [[-HX,-NX,-HZ,HZ],[NX,HX,-HZ,HZ],[-NX,NX,-NZ,NZ]]) meshBox(x0,x1,-1.5,0,z0,z1,sm,1,{cast:false}); }
  const lavaTex=mkTex(512,512,(g,W2,H2)=>{ const r=RNG(9); const gr=g.createLinearGradient(0,0,W2,H2); gr.addColorStop(0,'#ff4a00'); gr.addColorStop(1,'#ffb000'); g.fillStyle=gr; g.fillRect(0,0,W2,H2); for(let i=0;i<120;i++){ g.fillStyle=`rgba(${80+r()*60},${10+r()*20},0,${0.5+r()*0.4})`; g.beginPath(); g.ellipse(r()*W2,r()*H2,10+r()*50,6+r()*30,r()*3,0,7); g.fill(); } for(let i=0;i<60;i++){ g.fillStyle=`rgba(255,${200+r()*55},120,${0.4+r()*0.5})`; g.beginPath(); g.arc(r()*W2,r()*H2,1+r()*4,0,7); g.fill(); } });
  lavaTex.wrapS=lavaTex.wrapT=T.RepeatWrapping; lavaTex.repeat.set(22,22);
  const lavaM=new T.ShaderMaterial({fog:false,uniforms:{time:{value:0},fogC:{value:new T.Color(0x2a120c)}},
    vertexShader:'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader:`uniform float time; uniform vec3 fogC; varying vec3 vW;
      float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      float fbm(vec2 p){ float a=0.5, s=0.0; for(int k=0;k<5;k++){ s+=a*n(p); p=p*2.03+vec2(1.7,9.2); a*=0.5; } return s; }
      void main(){ vec2 p=vW.xz*0.09; vec2 q=vec2(fbm(p+vec2(time*0.03,0.0)),fbm(p+vec2(5.2,1.3)-vec2(0.0,time*0.025)));
        float f=fbm(p*1.6+q*2.2+vec2(time*0.02,-time*0.015));
        float vein=1.0-smoothstep(0.0,0.09,abs(f-0.5)); float crust=smoothstep(0.52,0.7,f);
        vec3 hot=vec3(1.0,0.82,0.35), mid=vec3(1.0,0.38,0.05), dark=vec3(0.22,0.05,0.02);
        vec3 c=mix(mid,hot,smoothstep(0.35,0.5,f)*0.6); c=mix(c,dark,crust); c+=hot*vein*0.9*(0.7+0.3*sin(time*2.0+f*20.0)); c*=1.0+0.08*sin(time*1.3+vW.x*0.2);
        float d=length(vW.xz-cameraPosition.xz); c=mix(c,fogC*1.6,smoothstep(40.0,190.0,d)); gl_FragColor=vec4(c,1.0); }`});
  lavaM.toneMapped=false; const lava=new T.Mesh(new T.PlaneGeometry(600,600),lavaM); lava.rotation.x=-Math.PI/2; lava.position.y=-1.6; W.add(lava);
  animated.push(t=>{ lavaM.uniforms.time.value=t; });
  for(const z of [-NZ,NZ]){ const gl=new T.Mesh(new T.BoxGeometry(2*NX+0.1,0.06,0.1),new T.MeshBasicMaterial({color:0xffa040})); gl.position.set(0,0.02,z); W.add(gl); for(const x of [-NX,NX]){ const g2=new T.Mesh(new T.BoxGeometry(0.1,0.06,HZ-NZ),new T.MeshBasicMaterial({color:0xffa040})); g2.position.set(x,0.02,Math.sign(z)*(HZ+NZ)/2); W.add(g2); } const s2=sprite(0xff6a1a,9,0.4); s2.position.set(0,-0.6,Math.sign(z)*(HZ+NZ)/2); W.add(s2); }
  // ---- cover: furnace blocks and steel crates ----
  const furnTex=mkTex(256,256,(g,W2,H2)=>{ g.fillStyle='#4a3a34'; g.fillRect(0,0,W2,H2); g.fillStyle='#5a463e'; for(let y=0;y<H2;y+=32) for(let x=(y/32%2)*32;x<W2;x+=64) g.fillRect(x+2,y+2,60,28); const gr=g.createLinearGradient(0,H2*0.55,0,H2); gr.addColorStop(0,'rgba(255,90,0,0)'); gr.addColorStop(1,'rgba(255,120,20,.55)'); g.fillStyle=gr; g.fillRect(0,H2*0.55,W2,H2*0.45); g.fillStyle='#ffb040'; g.fillRect(W2*0.3,H2*0.62,W2*0.4,H2*0.2); g.fillStyle='#1a1210'; g.fillRect(W2*0.3,H2*0.62,W2*0.4,8); });
  const furn=toon({map:furnTex,emissive:0x5a1a00,emissiveIntensity:0.35}), steel=toon({color:0x4c5562}), dark=toon({color:0x2a2e36});
  for(const sx of [-1,1]){ solid(sx*17.2-1.4,sx*17.2+1.4,0,3.0,-1.4,1.4,furn); crateBox(sx*19.4-0.7,sx*19.4+0.7,0,1.4,5.0,6.4,M.crateB); crateBox(sx*19.4-0.7,sx*19.4+0.7,0,1.4,-6.4,-5.0,M.crate);
    solid(sx*6.2-0.9,sx*6.2+0.9,0,1.5,-9.4,-7.6,steel); solid(sx*6.2-0.9,sx*6.2+0.9,0,1.5,7.6,9.4,steel); solid(sx*11-0.9,sx*11+0.9,0,1.2,-13.6,-11.8,steel); solid(sx*11-0.9,sx*11+0.9,0,1.2,11.8,13.6,steel);
    crateBox(sx*17.6-0.7,sx*17.6+0.7,0,1.4,12.2,13.6,M.crateO); crateBox(sx*17.6-0.7,sx*17.6+0.7,0,1.4,-13.6,-12.2,M.crate); barrel(sx*22.2,13,0xff7a1a); barrel(sx*22.2,-13,0xff7a1a); }
  // ---- gantries for the swinging balls: posts at x=±(7±2.2), beam along x at the pivot ----
  const PIV=9.2, LEN=8.1, BR=0.85;
  const balls=[];
  const spikeG=new T.ConeGeometry(0.2,0.75,6); spikeG.translate(0,BR+0.28,0);
  for(const sx of [-1,1]){ const cx=sx*BX;
    for(const px of [cx-2.2,cx+2.2]){ solid(px-0.3,px+0.3,0,PIV+0.6,-0.3,0.3,dark); }
    meshBox(cx-2.6,cx+2.6,PIV,PIV+0.7,-0.45,0.45,toon({color:0x9a7414}));
    const g=new T.Group(); g.position.set(cx,PIV,0); W.add(g);
    { const lk=[], N=Math.floor((LEN-BR)/0.3); for(let k=0;k<N;k++) lk.push([new T.TorusGeometry(0.11,0.035,5,10),MX(0,-0.15-k*0.3,0,0,k%2?Math.PI/2:0,0,1,1.45,1)]); const ch=new T.Mesh(mergeGeos(lk),toon({color:0x55606e,metalness:0.5,roughness:0.4})); g.add(ch); }
    const ball=new T.Mesh(new T.IcosahedronGeometry(BR,1),toon({color:0x3a3f4a,metalness:0.4,roughness:0.4})); ball.position.y=-LEN; ball.castShadow=true; g.add(ball);
    const spk=[]; const ico=new T.IcosahedronGeometry(1,0); const pp=ico.attributes.position; const seen=new Set(); for(let i=0;i<pp.count;i++){ const v=V3(pp.getX(i),pp.getY(i),pp.getZ(i)).normalize(); const k=v.toArray().map(n=>n.toFixed(2)).join(); if(seen.has(k)) continue; seen.add(k); spk.push([spikeG.clone(),new T.Matrix4().compose(V3(),new T.Quaternion().setFromUnitVectors(V3(0,1,0),v),V3(1,1,1))]); }
    const sm=new T.Mesh(mergeGeos(spk),toon({color:0xd8dde6,metalness:0.5,roughness:0.35})); sm.castShadow=true; ball.add(sm);
    const glow=sprite(ORG,3.4,0.0); ball.add(glow);
    balls.push({g,ball,glow,ph:sx>0?Math.PI:0,pos:V3(),prev:V3(),vel:V3(),cd:new Map()}); }
  // ---- the press in the middle ----
  const P={ y:7.6, box:{min:V3(-2.4,7.6,-2.4),max:V3(2.4,10,2.4),noCam:true,noStand:true,noSeal:true}, cd:new Map(), warn:0 };
  boxes.push(P.box);
  const pressG=new T.Group(); W.add(pressG);
  const head=new T.Mesh(boxGeo(4.8,2.4,4.8,1),[steel,steel,toon({color:0x2a2e36}),toon({map:TX.hazard}),steel,steel]); head.position.y=1.2; head.castShadow=true; pressG.add(head);
  const plate=new T.Mesh(new T.BoxGeometry(5.2,0.3,5.2),toon({map:TX.hazard})); plate.position.y=0.15; pressG.add(plate);
  const rod=new T.Mesh(new T.CylinderGeometry(0.6,0.6,14,12),toon({color:0x8a94a8,metalness:0.6,roughness:0.3})); rod.position.y=2.4+7; pressG.add(rod);
  const warnM=new T.MeshBasicMaterial({color:0xff2a00,transparent:true,opacity:0,depthWrite:false}); const warnPlate=new T.Mesh(new T.PlaneGeometry(4.8,4.8),warnM); warnPlate.rotation.x=-Math.PI/2; warnPlate.position.y=0.03; W.add(warnPlate);
  const beacons=[]; { const sl=[]; for(const x of [-1.7,1.7]){ sl.push([new T.CylinderGeometry(0.42,0.42,4.4,14),MX(x,13.7,0)]); sl.push([new T.CylinderGeometry(0.5,0.5,0.3,14),MX(x,11.5,0)]); const r2=new T.Mesh(new T.CylinderGeometry(0.22,0.22,9,10),toon({color:0xd8dde6,metalness:0.7,roughness:0.25})); r2.position.set(x,2.4+4.5,0); pressG.add(r2); } addMerged(sl,toon({color:0x2a2e36,metalness:0.3}));
    for(const [x,z] of [[-3.1,-3.1],[3.1,3.1]]){ const b=new T.Mesh(new T.CylinderGeometry(0.22,0.26,0.4,10),new T.MeshBasicMaterial({color:0xff8a1a})); b.position.set(x,17.3,z); W.add(b); const gl=sprite(0xff8a1a,3,0); gl.position.set(x,17.4,z); W.add(gl); beacons.push({b,gl}); } }
  { const frame=[]; for(const [x,z] of [[-3.1,-3.1],[3.1,-3.1],[-3.1,3.1],[3.1,3.1]]) frame.push([new T.BoxGeometry(0.5,16,0.5),MX(x,8,z)]); frame.push([new T.BoxGeometry(7,1.2,7),MX(0,16.5,0)]); addMerged(frame,toon({color:0x9a7414})); for(const [x,z] of [[-3.1,-3.1],[3.1,-3.1],[-3.1,3.1],[3.1,3.1]]) propCol(x,z,0.3,0,16); }
  // ---- saws running along floor slots ----
  const saws=[]; const sawTex=mkTex(256,256,(g,W2,H2)=>{ g.translate(W2/2,H2/2); g.fillStyle='#d8dde6'; g.beginPath(); for(let i=0;i<48;i++){ const a=i/48*Math.PI*2, r=i%2?110:126; g[i?'lineTo':'moveTo'](Math.cos(a)*r,Math.sin(a)*r); } g.closePath(); g.fill(); g.fillStyle='#9aa4b4'; g.beginPath(); g.arc(0,0,86,0,7); g.fill(); g.fillStyle='#2a2e36'; g.beginPath(); g.arc(0,0,22,0,7); g.fill(); g.strokeStyle='#ffd21f'; g.lineWidth=8; g.beginPath(); g.arc(0,0,60,0,7); g.stroke(); });
  for(const [z,ph] of [[-SWX,0],[SWX,Math.PI]]){ const m=new T.Mesh(new T.CylinderGeometry(1.0,1.0,0.12,32),[toon({color:0x9aa4b4}),toon({map:sawTex,metalness:0.5,roughness:0.3}),toon({map:sawTex,metalness:0.5,roughness:0.3})]); m.rotation.z=Math.PI/2; m.position.set(z,0.35,0); m.castShadow=true; W.add(m); const sp=sprite(0xffb040,1.2,0.6); W.add(sp); saws.push({m,sp,z,ph,cd:new Map()}); }
  // ---- the hall: dark walls, pipes, glowing vents, hanging lamps ----
  { const wallT=mkTex(512,256,(g,W2,H2)=>{ g.fillStyle='#2b2624'; g.fillRect(0,0,W2,H2); const r=RNG(12); for(let y=0;y<H2;y+=16) for(let x=(y/16%2)*16;x<W2;x+=32){ g.fillStyle=`hsl(15,${10+r()*8}%,${13+r()*6}%)`; g.fillRect(x+1,y+1,30,14); } g.fillStyle='rgba(255,110,30,.25)'; g.fillRect(0,H2*0.82,W2,H2*0.18); }); wallT.wrapS=wallT.wrapT=T.RepeatWrapping; wallT.repeat.set(8,2);
    const wm=toon({map:wallT}); const hall=[[0,-46,120,40,2],[0,46,120,40,2],[-60,0,2,40,92],[60,0,2,40,92]]; for(const [x,z,w,h,d] of hall){ const m=new T.Mesh(new T.BoxGeometry(w,h,d),wm); m.position.set(x,h/2-6,z); W.add(m); }
    const pipe=toon({color:0x6a5a50,metalness:0.4,roughness:0.5}), pl=[]; for(const z of [-44,44]) for(const y of [10,14,22]) pl.push([new T.CylinderGeometry(0.8,0.8,120,10),MX(0,y,z+Math.sign(z)*-1.5,0,0,Math.PI/2)]); for(const x of [-58,58]) for(const y of [8,18]) pl.push([new T.CylinderGeometry(1,1,92,10),MX(x+Math.sign(x)*-1.6,y,0,Math.PI/2)]); addMerged(pl,pipe,{cast:false});
    for(let i=0;i<10;i++){ const x=-50+i*11; for(const z of [-44.6,44.6]){ const v=new T.Mesh(new T.PlaneGeometry(5,2.4),new T.MeshBasicMaterial({color:0xff7a2a})); v.position.set(x,4,z); v.rotation.y=z<0?0:Math.PI; W.add(v); const s=sprite(0xff7a2a,9,0.5); s.position.set(x,4,z*0.97); W.add(s); } }
    for(const [x,z] of [[-10,-6],[10,6],[-10,6],[10,-6],[0,-12],[0,12]]){ const c=new T.Mesh(new T.CylinderGeometry(0.04,0.04,10,4),dark); c.position.set(x,21,z); W.add(c); const sh=new T.Mesh(new T.ConeGeometry(1.1,0.9,14,1,true),toon({color:0x2a2e36,side:T.DoubleSide})); sh.position.set(x,16,z); W.add(sh); const s=sprite(0xffd9a0,4,0.85); s.position.set(x,15.5,z); W.add(s); }
    const sky=new T.Mesh(new T.SphereGeometry(700,24,14),new T.MeshBasicMaterial({color:0x140a08,side:T.BackSide,fog:false,depthWrite:false})); W.add(sky); animated.push(()=>sky.position.copy(camera.position)); }
  { const fm=toon({color:0x3a2c26}), band=new T.MeshBasicMaterial({color:0xff7a2a}); band.toneMapped=false; const fl=[], ch=[];
    for(const [x,z,f] of [[-30,-36,1],[0,-38,1],[30,-36,1],[-22,37,-1],[22,37,-1]]){ fl.push([new T.CylinderGeometry(6,7.2,16,20),MX(x,6,z)]); fl.push([new T.ConeGeometry(6.2,5,20),MX(x,16.5,z)]); ch.push([new T.CylinderGeometry(1.6,1.9,26,12),MX(x,30,z)]);
      for(const y of [3,9]){ const b=new T.Mesh(new T.TorusGeometry(6.6-y*0.05,0.16,6,40),band); b.rotation.x=Math.PI/2; b.position.set(x,y,z); W.add(b); }
      const door=new T.Mesh(new T.PlaneGeometry(4,3.4),band); door.position.set(x,3.2,z+f*7.05); door.rotation.y=f>0?0:Math.PI; W.add(door); const gl=sprite(0xff7a2a,16,0.45); gl.position.set(x,3.5,z+f*8); W.add(gl); }
    addMerged(fl,fm,{cast:false}); addMerged(ch,toon({color:0x2a2220}),{cast:false});
    // roof trusses
    const tr=[]; for(let z=-40;z<=40;z+=10){ tr.push([new T.BoxGeometry(120,0.8,0.6),MX(0,30,z)]); tr.push([new T.BoxGeometry(120,0.6,0.5),MX(0,26,z)]); for(let x=-56;x<56;x+=8){ const a=V3(x,26,z), b=V3(x+8,30,z), d=V3().subVectors(b,a); tr.push([new T.BoxGeometry(0.35,d.length(),0.35),new T.Matrix4().compose(a.clone().addScaledVector(d,0.5),new T.Quaternion().setFromUnitVectors(V3(0,1,0),d.clone().normalize()),V3(1,1,1))]); } }
    for(const x of [-30,30]) tr.push([new T.BoxGeometry(0.9,0.9,90),MX(x,24,0)]); addMerged(tr,toon({color:0x2e2826}),{cast:false});
    // overhead ladle that tips molten metal into the lava every so often
    const lg=new T.Group(); lg.position.set(30,17,-25); W.add(lg); const lp=[[0.001,-2.2],[1.6,-2.2],[2.2,-1.4],[2.4,1.4],[2.6,1.6],[2.2,1.6],[2.0,1.4],[1.8,-1.2],[0.001,-1.4]].map(q=>new T.Vector2(q[0],q[1]));
    const ladle=new T.Mesh(new T.LatheGeometry(lp,22),toon({color:0x4a3a34,metalness:0.3,side:T.DoubleSide})); lg.add(ladle); const melt=new T.Mesh(new T.CircleGeometry(2.0,22),band); melt.rotation.x=-Math.PI/2; melt.position.y=1.2; lg.add(melt);
    const hang=[]; for(const s of [-1,1]) hang.push([new T.BoxGeometry(0.2,6,0.2),MX(s*2.5,3.6,0)]); hang.push([new T.BoxGeometry(5.4,0.4,0.4),MX(0,6.6,0)]); const hm=new T.Mesh(mergeGeos(hang),toon({color:0x9a7414})); lg.add(hm);
    const rails=[]; for(const z of [-26.5,-23.5]) rails.push([new T.BoxGeometry(70,1,0.6),MX(0,24.2,z)]); addMerged(rails,toon({color:0x9a7414}),{cast:false});
    const stream=new T.Mesh(new T.CylinderGeometry(0.35,0.5,1,10,1,true),band); W.add(stream); stream.visible=false; const sg=sprite(0xffa040,7,0); W.add(sg);
    animated.push((t,dt)=>{ const c=t%14; const tip=c<8?0:(c<9.5?(c-8)/1.5:(c<12?1:Math.max(0,1-(c-12)/1.2))); ladle.rotation.z=-tip*1.15; melt.visible=tip<0.7; ladle.parent.rotation.z=0;
      const pour=tip>0.85; stream.visible=pour; sg.material.opacity=pour?0.6:0; if(pour){ const lip=V3(30+2.3,17+1.2,-25); const len=lip.y+1.6; stream.scale.set(1+Math.sin(t*30)*0.08,len,1); stream.position.set(lip.x+0.4,lip.y-len/2,lip.z); sg.position.set(lip.x+0.4,-1.2,lip.z); if(Math.random()<(dt||0.016)*30) burst(V3(lip.x+0.4,-1.4,lip.z),0xffb040,2,6,0.14,0.7,1.2); } }); }
  // rising embers
  { const em=[]; for(let i=0;i<70;i++){ const s=sprite(i%3?0xff8a2a:0xffd060,0.28+rng()*0.3,0.9); s.userData={x:-30+rng()*60,z:-26+rng()*52,sp:0.6+rng()*1.6,ph:rng()*30}; W.add(s); em.push(s); }
    animated.push(t=>{ for(const s of em){ const u=s.userData; const y=((t*u.sp+u.ph)%14); s.position.set(u.x+Math.sin(t*0.7+u.ph)*0.6,-1.4+y,u.z); s.material.opacity=0.9*(1-y/14); } }); }
  // ---- hazard driving (round clock, so screens agree) ----
  const hit=(f,amt,push,up,stun,cd,cdMap,label,colr,pos)=>{ const now=gameT; if((cdMap.get(f)||-9)>now) return; cdMap.set(f,now+cd);
    if(f.invulnT>0) return; const owner=f.ctl!=='net'; if(owner){ f.vel.x=push.x; f.vel.z=push.z; f.vel.y=Math.max(f.vel.y,up); f.onGround=false; f.knockT=0.45; f.stunT=Math.max(f.stunT,stun); f.dashT=0; }
    if(!NET.on||NET.role==='host') applyDamage(f,amt,null,{cause:'hazard'}); f.hitFlash=0.12; burst(pos||f.center(),colr,14,7,0.1,0.5,0.4); flashAt(pos||f.center(),colr,3,0.18); floatText(f.center().add(V3(0,1.3,0)),label,'status'); SFX.hit(); shakeT=Math.max(shakeT,f===player?0.25:0.08); };
  const T0=()=> (state==='fight'||state==='roundover')?roundInfo.t:gameT;
  MAPHZ.spheres=balls.map(b=>({pos:b.pos,r:BR+0.15}));
  animated.push((t,dt)=>{ const rt=T0();
    // balls: pendulum along z
    for(const b of balls){ const th=1.05*Math.sin(rt*1.85+b.ph); b.g.rotation.x=th; b.prev.copy(b.pos); b.pos.set(b.g.position.x,PIV-LEN*Math.cos(th),LEN*Math.sin(th)); if(dt>0) b.vel.subVectors(b.pos,b.prev).multiplyScalar(1/Math.max(dt,1e-3));
      b.glow.material.opacity=Math.min(0.6,b.vel.length()*0.05);
      if(state==='fight') for(const f of fighters){ if(f.dead||f.active===false) continue; if(f.distTo(b.pos)>BR+0.35+f.hitR) continue; const d=b.vel.clone(); d.y=0; if(d.lengthSq()<1) d.set(0,0,Math.sign(f.pos.z-b.pos.z)||1); d.normalize(); hit(f,24,d.multiplyScalar(19),8,0.35,0.9,b.cd,'SMASHED!',0xffd0a0,b.pos.clone()); } }
    // press: up (rest) -> warning -> slam -> hold -> rise.  6 s cycle
    const c=((rt+1.5)%6+6)%6; let y, warn=0; if(c<3.2){ y=7.6; warn=c>2.2?(c-2.2):0; } else if(c<3.4){ const k=(c-3.2)/0.2; y=7.6*(1-k*k); warn=1; } else if(c<4.1){ y=0; } else { const k=(c-4.1)/1.9; y=7.6*(1-Math.pow(1-k,2)); }
    const was=P.y; P.y=y; pressG.position.y=y; for(const bc of beacons){ const on=warn>0&&Math.sin(rt*18)>0; bc.gl.material.opacity=on?0.9:0; bc.b.material.color.setHex(on?0xffd060:0x8a4a10); } P.box.min.y=y; P.box.max.y=y+2.4; warnM.opacity=warn>0?(0.25+0.45*warn)*(Math.sin(rt*26)>0?1:0.4):(y<0.5?0.15:0);
    if(was>0.6&&y<=0.6){ shockRing(V3(0,0.06,0),0xffd0a0,7,0.45,2.4); burst(V3(0,0.2,0),0xb0b8c8,26,9,0.14,0.6,0.6); if(state==='fight'||state==='menu') SFX.explode&&SFX.explode(); shakeT=Math.max(shakeT,0.18); }
    if(state==='fight'&&y<2.6&&was>y) for(const f of fighters){ if(f.dead||f.active===false) continue; if(Math.abs(f.pos.x)>2.4+f.radius||Math.abs(f.pos.z)>2.4+f.radius) continue; if(f.pos.y+f.height<y) continue; const d=V3(f.pos.x,0,f.pos.z); if(d.lengthSq()<0.04) d.set(rand(-1,1),0,rand(-1,1)); d.normalize(); hit(f,40,d.clone().multiplyScalar(16),9,0.6,1.2,P.cd,'STOMPED!',0xffffff,null); if(f.ctl!=='net'){ f.pos.x=d.x*(2.5+f.radius); f.pos.z=d.z*(2.5+f.radius); } }
    // saws: run along their slots
    for(const s of saws){ const z=Math.sin(rt*0.9+s.ph)*12.4, x=s.z; s.m.position.z=z; s.m.rotation.y+=dt*22; s.sp.position.set(x,0.25,z); s.sp.material.opacity=0.4+Math.random()*0.4;
      if(state==='fight'){ if(Math.random()<dt*20) burst(V3(x,0.1,z+rand(-0.8,0.8)),0xffc060,1,4,0.05,0.3,1.5);
        for(const f of fighters){ if(f.dead||f.active===false||f.pos.y>1.2) continue; if(Math.abs(f.pos.z-z)>1.0+f.radius*0.6||Math.abs(f.pos.x-x)>0.35+f.radius) continue; const d=V3(Math.sign(f.pos.x-x)||1,0,0); hit(f,16,d.multiplyScalar(9),9,0.2,0.8,s.cd,'SAWED!',0xffc060,null); } } }
  });
}
// a bullet that meets a swinging ball stops there
function mapHitSphere(p,r){ for(const s of MAPHZ.spheres){ const d=p.distanceTo(s.pos); if(d<s.r+r){ const n=V3().subVectors(p,s.pos); if(n.lengthSq()<1e-6) n.set(0,1,0); return {n:n.normalize(),depth:s.r+r-d}; } } return null; }

MAPS.crane={ name:'The Crane', native:[23,23], scale:1, spawnX:16.8, killY:-12, build(){ buildCrane(); },
  env:{ fog:[0xcfe0f2,120,520], hemi:[0xdfeaff,0x6a7a5a,0.7], sun:[0xfff1d8,1.25,[30,40,-20]], bloom:[0.18,0.4,0.92] } };
MAPS.foundry={ name:'Foundry', native:[24,17], scale:1, spawnX:20.5, killY:-1.4, lava:true, hitSphere:mapHitSphere, build(){ buildFoundry(); },
  env:{ fog:[0x2a120c,45,170], hemi:[0xffc9a0,0xff6a1a,0.85], sun:[0xffd2a8,1.0,[-14,30,12]], bloom:[0.35,0.5,0.85] } };
LOOK_MAP.crane={ exp:1.0, envI:1.0, hemi:0.45, sun:1.3, grade:{sat:1.1,con:0.22,vig:0.28,warm:[1.02,1.0,0.98],cool:[0.95,0.98,1.05]} };
LOOK_MAP.foundry={ exp:1.05, envI:1.2, hemi:0.6, sun:1.0, grade:{sat:1.18,con:0.26,vig:0.45,warm:[1.07,0.98,0.92],cool:[0.94,0.95,1.02]} };
