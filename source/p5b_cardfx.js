// ================= CARD FX: life worm, thrusters, blink shatter, EMP shards, ice =================
const UPV=V3(0,1,0);
// ---------- life worm: a wriggling tether that pumps HP from one fighter into the other ----------
const WORMS=[]; const wormGeo=new T.SphereGeometry(1,10,8);
function mkWorm(){ const g=new T.Group(); g.visible=false; scene.add(g);
  const mat=new T.MeshBasicMaterial({color:col(0xe0123f),transparent:true,depthWrite:false}), mat2=new T.MeshBasicMaterial({color:col(0xff6f92),transparent:true,depthWrite:false}), mat3=new T.MeshBasicMaterial({color:col(0xffe1ea),transparent:true,depthWrite:false});
  const segs=[]; for(let i=0;i<26;i++){ const m=new T.Mesh(wormGeo,i%2?mat:mat2); m.renderOrder=6; g.add(m); segs.push(m); }
  const drops=[]; for(let i=0;i<5;i++){ const m=new T.Mesh(wormGeo,mat3); m.renderOrder=7; g.add(m); drops.push(m); }
  const gm=new T.SpriteMaterial({map:TX.glow,color:col(0xff2d62),blending:T.AdditiveBlending,transparent:true,depthWrite:false}); const gls=[]; for(let i=0;i<5;i++){ const s=new T.Sprite(gm); g.add(s); gls.push(s); }
  const w={g,segs,drops,gls,mats:[mat,mat2,mat3],gm,active:false,t:0,life:0,ph:0,key:''}; WORMS.push(w); return w; }
function lifeWorm(from,to,key,dur,wid=1){ if(!from||!to||from===to||from.dead||to.dead) return;
  let w=WORMS.find(x=>x.active&&x.key===key); if(!w){ w=WORMS.find(x=>!x.active)||mkWorm(); w.active=true; w.t=0; w.ph=Math.random()*6.3; w.key=key; w.g.visible=true; w.life=0; }
  w.from=from; w.to=to; w.life=Math.max(w.life,dur); w.wid=wid; }
const _wA=V3(),_wB=V3(),_wd=V3(),_wp1=V3(),_wp2=V3(),_wq=V3();
function wormPoint(w,u,out){ const L=_wd.length(); const env=Math.sin(u*Math.PI), t=w.t, amp=Math.min(0.5,0.14+L*0.035)*w.wid;
  return out.copy(_wA).addScaledVector(_wd,u).addScaledVector(_wp1,Math.sin(u*Math.PI*2.6-t*7.5+w.ph)*amp*env).addScaledVector(_wp2,Math.sin(u*Math.PI*1.8-t*5.1+w.ph*1.7)*amp*0.75*env).addScaledVector(UPV,env*Math.min(0.8,L*0.1)); }
function updateWorms(dt){ for(const w of WORMS){ if(!w.active) continue; w.t+=dt; w.life-=dt;
    if(w.from.dead||w.to.dead) w.life=Math.min(w.life,0);
    const a=Math.min(1,w.t*6)*clamp((w.life+0.25)*4,0,1); if(a<=0.001&&w.life<0){ w.active=false; w.g.visible=false; continue; }
    _wA.copy(w.from.center()); _wB.copy(w.to.center()); _wA.y-=0.05; _wd.subVectors(_wB,_wA); const L=Math.max(0.01,_wd.length());
    _wp1.crossVectors(_wd,UPV); if(_wp1.lengthSq()<1e-4) _wp1.set(1,0,0); _wp1.normalize(); _wp2.crossVectors(_wp1,_wd).normalize();
    const n=w.segs.length; for(let i=0;i<n;i++){ const u=i/(n-1), env=Math.sin(u*Math.PI); const m=w.segs[i]; wormPoint(w,u,m.position);
      const bulge=Math.max(0,Math.sin(u*Math.PI*5-w.t*15+w.ph)); m.scale.setScalar((0.05+0.065*bulge)*w.wid*(0.45+0.55*env)+0.025); }
    for(let k=0;k<w.drops.length;k++){ const u=(w.t*1.35+k/w.drops.length)%1; wormPoint(w,u,w.drops[k].position); w.drops[k].scale.setScalar(0.055*w.wid*(0.6+0.6*Math.sin(u*Math.PI))); }
    for(let k=0;k<w.gls.length;k++){ const u=(k+0.5)/w.gls.length; wormPoint(w,u,w.gls[k].position); w.gls[k].scale.setScalar(0.9*w.wid); }
    for(const m of w.mats) m.opacity=a; w.gm.opacity=0.38*a;
    if(Math.random()<dt*14*w.wid){ wormPoint(w,rand(0.15,0.85),_wq); burst(_wq,Math.random()<0.5?0xe0123f:0xff6f92,1,0.5,0.06,0.55,1.4); }
    if(Math.random()<dt*6) burst(_wB,0xff8fae,1,1.2,0.07,0.4,-0.5); } }
function clearWorms(){ for(const w of WORMS){ w.active=false; w.g.visible=false; } }

// ---------- thrusters: a little rocket sticks where you were shot and fires you along ----------
const thrFx=[]; let thrG=null;
function thrGeos(){ if(thrG) return thrG; const fl=new T.ConeGeometry(0.1,0.6,14,1,true); fl.rotateX(Math.PI); fl.translate(0,-0.3,0); const fi=new T.ConeGeometry(0.055,0.36,10,1,true); fi.rotateX(Math.PI); fi.translate(0,-0.18,0);
  thrG={can:new T.CylinderGeometry(0.085,0.085,0.24,16), cap:new T.SphereGeometry(0.085,14,8,0,Math.PI*2,0,Math.PI/2), band:new T.TorusGeometry(0.089,0.02,6,18), noz:new T.CylinderGeometry(0.06,0.105,0.11,16,1,true), fl, fi,
    mCan:new T.MeshStandardMaterial({color:col(0xd5dbe8),roughness:0.3,metalness:0.7}), mBand:basic({color:0xff8a2a}), mNoz:new T.MeshStandardMaterial({color:col(0x262c40),roughness:0.5,metalness:0.6,side:T.DoubleSide}),
    mFl:new T.MeshBasicMaterial({color:col(0xff6a1a),transparent:true,opacity:0.9,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}), mFi:new T.MeshBasicMaterial({color:col(0xfff1a8),transparent:true,opacity:0.95,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}),
    mGl:new T.SpriteMaterial({map:TX.glow,color:col(0xff8a2a),blending:T.AdditiveBlending,transparent:true,depthWrite:false,opacity:0.8})}; return thrG; }
function addThrusterFx(f,th){ const G=thrGeos(); const g=new T.Group();
  const mk=(geo,mat,y)=>{ const m=new T.Mesh(geo,mat); m.position.y=y; g.add(m); return m; };
  mk(G.can,G.mCan,0).castShadow=true; mk(G.cap,G.mCan,0.12); const b1=mk(G.band,G.mBand,0.06); b1.rotation.x=Math.PI/2; const b2=mk(G.band,G.mBand,-0.05); b2.rotation.x=Math.PI/2; mk(G.noz,G.mNoz,-0.17);
  const fl=mk(G.fl,G.mFl,-0.22), fi=mk(G.fi,G.mFi,-0.22); const gl=new T.Sprite(G.mGl); gl.position.y=-0.4; gl.scale.setScalar(1.1); g.add(gl);
  g.quaternion.setFromUnitVectors(UPV,th.dir); // nozzle points out of the body, so the flame drives them away from where it stuck
  scene.add(g); thrFx.push({f,th,g,fl,fi,gl,t:0}); burst(f.center().add(th.world),0xffc070,6,3,0.08,0.3,0); }
function updateThrusterFx(dt){ for(let i=thrFx.length-1;i>=0;i--){ const x=thrFx[i]; x.t+=dt; const f=x.f;
    if(f.dead||!f.thrusters.includes(x.th)){ burst(x.g.position,0x9aa3b8,6,1.6,0.12,0.6,-0.4); scene.remove(x.g); thrFx.splice(i,1); continue; }
    thrAim(f,x.th); const m=f.mesh.position; x.g.position.set(m.x,m.y+f.bodyY,m.z).add(x.th.world).addScaledVector(x.th.dir,-0.1); x.g.quaternion.setFromUnitVectors(UPV,x.th.dir);
    const pop=Math.min(1,x.t*10), sp=x.th.t<0.15? (Math.random()<0.5?0.3:1) : 1; x.g.scale.setScalar(pop*(1+Math.max(0,0.15-x.t)*3));
    const fk=(0.85+Math.random()*0.45)*sp; x.fl.scale.set(1,fk,1); x.fi.scale.set(1,fk*(0.8+Math.random()*0.3),1); x.gl.scale.setScalar(0.9+fk*0.5);
    if(Math.random()<dt*30){ _wq.set(0,-0.5,0).applyQuaternion(x.g.quaternion).add(x.g.position); burst(_wq,Math.random()<0.6?0xff9a3d:0x8a8f9e,1,1.6,0.1,0.35,-0.2); } } }
function clearThrusterFx(){ for(const x of thrFx) scene.remove(x.g); thrFx.length=0; }

// ---------- blink: you crack open, shatter, stream across and snap back together ----------
const tpBits=[]; let tpGeo=null;
function blinkFx(f,A,B){ if(!tpGeo) tpGeo=new T.TetrahedronGeometry(0.13,0);
  const cols=[f.team.body,f.team.light,0xffffff,f.team.dark,f.team.body];
  for(let i=0;i<38;i++){ let p=tpBits.find(q=>!q.active); if(!p){ const m=new T.Mesh(tpGeo,new T.MeshBasicMaterial({transparent:true})); scene.add(m); p={m,active:false}; tpBits.push(p); }
    const head=i<20; const d=V3(rand(-1,1),rand(-1,1),rand(-1,1)).normalize().multiplyScalar(Math.cbrt(Math.random()));
    const lp=head? V3(d.x*0.4,1.68+d.y*0.4,d.z*0.4) : V3(d.x*0.34,1.08+d.y*0.4,d.z*0.3);
    p.active=true; p.t=-i*0.0025; p.a=A.clone().add(lp); p.b=B.clone().add(lp); p.out=lp.clone().sub(V3(0,1.3,0)).normalize().multiplyScalar(rand(0.5,1.3)).add(V3(rand(-0.3,0.3),rand(0,0.5),rand(-0.3,0.3)));
    p.spin=V3(rand(-14,14),rand(-14,14),rand(-14,14)); p.s=rand(0.6,1.3); p.m.material.color.copy(col(cols[i%cols.length])); p.m.material.opacity=1; p.m.visible=true; p.m.position.copy(p.a); p.m.scale.setScalar(p.s); p.arc=rand(0.6,1.6); }
  f.tpHide=0.36; f.tpPop=0; f.tpDest=B.clone();
  const ca=A.clone().add(V3(0,1.3,0)); flashAt(ca,0xffffff,3.2,0.12); shockRing(V3(A.x,A.y+0.06,A.z),0xffffff,2.2,0.3); burst(ca,f.team.light,12,6,0.07,0.35,0); }
function updateBlinkFx(dt){ for(const p of tpBits){ if(!p.active) continue; p.t+=dt; const t=p.t; if(t<0){ continue; }
    if(t<0.07){ p.m.position.copy(p.a).add(V3(rand(-0.02,0.02),rand(-0.02,0.02),rand(-0.02,0.02))); }
    else if(t<0.15){ const k=(t-0.07)/0.08, e=1-Math.pow(1-k,2); p.m.position.copy(p.a).addScaledVector(p.out,e); }
    else if(t<0.36){ const k=(t-0.15)/0.21, e=k<0.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2; const s=_wq.copy(p.a).add(p.out); p.m.position.copy(s).lerp(p.b,e); p.m.position.y+=Math.sin(e*Math.PI)*p.arc; p.m.scale.setScalar(p.s*(1-0.4*Math.sin(e*Math.PI))); }
    else { p.active=false; p.m.visible=false; continue; }
    p.m.rotation.x+=p.spin.x*dt; p.m.rotation.y+=p.spin.y*dt; p.m.rotation.z+=p.spin.z*dt; }
  for(const f of fighters){ if(f.tpHide>0){ f.tpHide-=dt; if(f.tpHide<=0){ f.tpPop=0.0001; const c=f.center(); flashAt(c,f.team.light,4.5,0.22); flashAt(c,0xffffff,2.4,0.12); shockRing(V3(f.pos.x,f.pos.y+0.06,f.pos.z),f.team.light,2.6,0.4,0.3); burst(c,0xffffff,10,5,0.07,0.35,0); burst(c,f.team.light,14,4,0.09,0.45,0); } } } }
function clearBlinkFx(){ for(const p of tpBits){ p.active=false; p.m.visible=false; } for(const f of fighters){ f.tpHide=0; f.tpPop=0; } }
function blinkScale(f,dt){ if(f.tpHide>0) return 0.001; if(f.tpPop>0&&f.tpPop<0.34){ f.tpPop+=dt; const k=Math.min(1,f.tpPop/0.34), c=2.4; return 1+(c+1)*Math.pow(k-1,3)+c*Math.pow(k-1,2); } return 1; }

// ---------- EMP: the dome bursts into energy shards that keep flying outward ----------
const empBolts=[]; let empGeo=null, empMat=null, empGlow=null;
function empBurst(f,c,n){ if(!empGeo){ empGeo=new T.OctahedronGeometry(0.4,0); empGeo.scale(0.5,0.22,1); empMat=new T.MeshBasicMaterial({color:col(0x7ff7ea),transparent:true,blending:T.AdditiveBlending,depthWrite:false}); empGlow=new T.SpriteMaterial({map:TX.glow,color:col(0x46e0d0),blending:T.AdditiveBlending,transparent:true,depthWrite:false}); }
  const cast={hit:new Set(),owner:f,n}; const reach=13+4*(n-1); const rings=[[0.9,14,0],[1.5,9,0.38]];
  for(const [h,cnt,el] of rings){ const a0=rand(0,6.28); for(let i=0;i<cnt;i++){ const a=a0+i/cnt*Math.PI*2; const dir=V3(Math.cos(a)*Math.cos(el),Math.sin(el),Math.sin(a)*Math.cos(el));
      const m=new T.Mesh(empGeo,empMat); m.position.set(c.x,c.y+h,c.z); m.quaternion.setFromUnitVectors(V3(0,0,1),dir); const gl=new T.Sprite(empGlow); gl.scale.setScalar(1.6); m.add(gl); scene.add(m);
      empBolts.push({m,dir,pos:m.position.clone(),d:0,reach,cast,spin:rand(-12,12)}); } }
  shockRing(V3(c.x,c.y+0.9,c.z),0x7ff7ea,reach*0.35,0.35,0.3,V3(0,1,0)); }
function updateEmpBolts(dt){ for(let i=empBolts.length-1;i>=0;i--){ const b=empBolts[i]; const sp=17; b.pos.addScaledVector(b.dir,sp*dt); b.d+=sp*dt; b.m.position.copy(b.pos); b.m.rotateZ(b.spin*dt);
    const k=b.d/b.reach; b.m.scale.setScalar(1+k*0.6); empMat.opacity=1; if(Math.random()<dt*20) burst(b.pos,0x7ff7ea,1,0.6,0.06,0.3,0);
    for(const e of (state==='fight'?enemies(b.cast.owner):[])){ if(b.cast.hit.has(e)||e.distTo(b.pos)>=0.95) continue; b.cast.hit.add(e); const n=b.cast.n; applySlow(e,0.6,2.2+0.6*n); applyDamage(e,8*n,b.cast.owner,{cause:'dome'}); burst(e.center(),0x46e0d0,16,5,0.1,0.5,0); flashAt(e.center(),0x7ff7ea,2.6,0.2); floatText(e.center().add(V3(0,1.2,0)),'EMP!','status'); SFX.zap(); }
    if(b.d>=b.reach){ burst(b.pos,0x7ff7ea,4,2,0.07,0.3,0); scene.remove(b.m); empBolts.splice(i,1); } } }
function clearEmpBolts(){ for(const b of empBolts) scene.remove(b.m); empBolts.length=0; }

// ---------- ice: cold shots encase you in a frosty shell with crystals ----------
let iceRes=null;
function iceResources(){ if(iceRes) return iceRes; const shell=new T.IcosahedronGeometry(1,1); const p=shell.attributes.position; for(let k=0;k<p.count;k++){ const v=V3(p.getX(k),p.getY(k),p.getZ(k)); const n=1+(hash01(v.x*3.1+v.z,v.y*2.7)-0.5)*0.22; p.setXYZ(k,v.x*n,v.y*n,v.z*n); } shell.computeVertexNormals();
  const spike=new T.ConeGeometry(0.07,1,5); spike.translate(0,0.5,0);
  iceRes={shell,spike}; return iceRes; }
function ensureIce(f){ if(f.ice) return f.ice; const R=iceResources();
  const mShell=new T.MeshStandardMaterial({color:col(0xd9f4ff),emissive:col(0x5fbfff),emissiveIntensity:0.55,roughness:0.06,metalness:0.2,transparent:true,opacity:0,depthWrite:false,flatShading:true});
  const mSpike=new T.MeshStandardMaterial({color:col(0xf2fcff),emissive:col(0x8fdcff),emissiveIntensity:0.55,roughness:0.05,metalness:0.1,transparent:true,opacity:0,flatShading:true});
  const g=new T.Group(); f.mesh.add(g); const shell=new T.Mesh(R.shell,mShell); shell.position.y=1.13; shell.scale.set(0.64,1.0,0.6); shell.renderOrder=5; g.add(shell);
  const spikes=[]; const rr=RNG(f.id*7); for(let i=0;i<22;i++){ const a=i/22*Math.PI*2*3+rr()*0.5, y=0.3+rr()*1.7; const yy=(y-1.13)/1.0; const rad=Math.sqrt(Math.max(0.05,1-yy*yy));
    const s=new T.Mesh(R.spike,mSpike); s.position.set(Math.cos(a)*0.6*rad,y,Math.sin(a)*0.56*rad); const out=V3(Math.cos(a),yy*0.9+(rr()-0.5)*0.4,Math.sin(a)).normalize(); s.quaternion.setFromUnitVectors(UPV,out); s.userData.h=0.26+rr()*0.4; s.userData.w=1.0+rr()*0.9; g.add(s); spikes.push(s); }
  g.visible=false; f.ice={g,shell,spikes,mShell,mSpike,amt:0,prevCold:0}; return f.ice; }
function updateIce(f,dt){ const I=ensureIce(f); const tgt=f.dead?0:(f.coldT>0?1:(f.chillIn?0.62:0));
  I.amt=approach(I.amt,tgt,dt*(tgt>I.amt?9:2.5));
  if(I.prevCold>0&&f.coldT<=0&&!f.dead){ const c=f.center(); for(let i=0;i<14;i++) spawnShard(c.clone().add(V3(rand(-0.4,0.4),rand(-0.6,0.6),rand(-0.4,0.4))),V3(rand(-4,4),rand(1,5),rand(-4,4)),Math.random()<0.5?0xd9f4ff:0x9fdcff,rand(0.1,0.2),0.6,1); burst(c,0xeaf8ff,10,3,0.08,0.4,0.5); }
  I.prevCold=f.coldT;
  const a=I.amt; I.g.visible=a>0.01; if(!I.g.visible) return;
  I.mShell.opacity=0.6*a; I.mSpike.opacity=Math.min(1,0.95*a*1.4); const sc=0.85+0.15*a; I.shell.scale.set(0.64*sc,1.0*sc,0.6*sc);
  for(const s of I.spikes){ const k=clamp(a*1.6-0.3,0,1); s.scale.set(s.userData.w*k,s.userData.h*k,s.userData.w*k); s.visible=k>0.02; }
  if(Math.random()<dt*14*a){ const c=f.center(); burst(c.add(V3(rand(-0.6,0.6),rand(-0.3,1.0),rand(-0.6,0.6))),Math.random()<0.6?0xffffff:0xbfe9ff,1,0.5,0.06,1.1,0.12); } }
function iceHit(target,pos){ const c=target.center(); burst(pos,0xd9f4ff,14,5,0.09,0.55,0.6); burst(c,0xffffff,8,3,0.07,0.6,0.3); flashAt(pos,0x9fdcff,2.4,0.18); shockRing(V3(target.pos.x,target.pos.y+0.06,target.pos.z),0xbfe9ff,1.9,0.45,0.3);
  for(let i=0;i<6;i++) spawnShard(pos.clone(),V3(rand(-3,3),rand(1,4),rand(-3,3)),0xd9f4ff,rand(0.08,0.15),0.5,1);
  if((target.coldT||0)<0.4){ SFX.freeze(); floatText(c.add(V3(0,1.3,0)),'FROZEN','status'); } }

function updateCardFx(dt){ updateWorms(dt); updateThrusterFx(dt); updateBlinkFx(dt); updateEmpBolts(dt); for(const f of fighters){ if(f.active===false) continue; updateIce(f,dt); updateStars(f,dt,gameT); } updateDazzleView(dt,gameT); }
function clearCardFx(){ clearWorms(); clearThrusterFx(); clearBlinkFx(); clearEmpBolts(); }

// ---------- dazzle: stars spin round your head, and your view narrows and goes hazy ----------
let starGeo=null, starMat=null, starOl=null;
function ensureStars(f){ if(f.stars) return f.stars; if(!starGeo){ const sh=new T.Shape(); for(let i=0;i<10;i++){ const a=i/10*Math.PI*2+Math.PI/2, r=i%2?0.075:0.18; const x=Math.cos(a)*r, y=Math.sin(a)*r; i?sh.lineTo(x,y):sh.moveTo(x,y); } sh.closePath();
    starGeo=new T.ExtrudeGeometry(sh,{depth:0.035,bevelEnabled:true,bevelThickness:0.012,bevelSize:0.012,bevelSegments:1}); starGeo.center(); starMat=new T.MeshBasicMaterial({color:col(0xffe14d)}); starOl=new T.MeshBasicMaterial({color:col(0xc25400),side:T.BackSide}); }
  const g=new T.Group(); g.position.y=2.32; f.mesh.add(g); const list=[]; const gm=new T.SpriteMaterial({map:TX.glow,color:col(0xfff1a0),blending:T.AdditiveBlending,transparent:true,depthWrite:false,opacity:0.7});
  for(let i=0;i<5;i++){ const s=new T.Mesh(starGeo,starMat); const ol=new T.Mesh(starGeo,starOl); ol.scale.set(1.28,1.28,0.6); s.add(ol); const gl=new T.Sprite(gm); gl.scale.setScalar(0.75); s.add(gl); g.add(s); list.push(s); }
  g.visible=false; f.stars={g,list,amt:0,lastN:0,pulse:0}; return f.stars; }
function updateStars(f,dt,t){ const S=ensureStars(f); const on=f.dazzleN>0&&!f.dead; S.amt=approach(S.amt,on?1:0,dt*(on?8:3));
  if(f.dazzleN!==S.lastN){ if(f.dazzleN>0) S.pulse=1; S.lastN=f.dazzleN; } S.pulse=Math.max(0,S.pulse-dt*3);
  S.g.visible=S.amt>0.01; if(!S.g.visible) return; S.g.rotation.y=t*4.2; S.g.scale.setScalar(S.amt*(1+S.pulse*0.25));
  S.list.forEach((s,i)=>{ const a=i/S.list.length*Math.PI*2; s.position.set(Math.cos(a)*0.5,Math.sin(t*6+i*1.3)*0.06,Math.sin(a)*0.42); s.rotation.set(0,-a+t*2,Math.sin(t*5+i)*0.4); }); }
let dzEl=null, dzStars=[], dzAmt=0, dzPulse=0, dzLastN=0;
function updateDazzleView(dt,t){ if(!dzEl){ dzEl=document.getElementById('dazzle'); if(!dzEl) return; dzStars=[...dzEl.querySelectorAll('b')]; }
  const on=player.dazzleN>0&&!player.dead&&state==='fight'; dzAmt=approach(dzAmt,on?1:0,dt*(on?5:2));
  if(player.dazzleN!==dzLastN){ if(player.dazzleN>0) dzPulse=1; dzLastN=player.dazzleN; } dzPulse=Math.max(0,dzPulse-dt*2.5);
  dzEl.style.opacity=dzAmt.toFixed(3); if(dzAmt<0.005) return;
  const r=66-32*dzAmt-dzPulse*10+Math.sin(t*6)*2.5*dzAmt; dzEl.style.setProperty('--r',r.toFixed(1)+'%'); dzEl.style.setProperty('--b',(3+6*dzAmt+dzPulse*4).toFixed(1)+'px');
  dzStars.forEach((s,i)=>{ const a=i/dzStars.length*Math.PI*2+t*0.9; s.style.transform=`translate(-50%,-50%) translate(${(Math.cos(a)*40).toFixed(1)}vw,${(Math.sin(a)*38).toFixed(1)}vh) rotate(${(t*120+i*40)%360}deg) scale(${(0.8+0.3*Math.sin(t*5+i)).toFixed(2)})`; }); }
