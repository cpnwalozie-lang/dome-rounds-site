// ================= BULLETS / FX =================
const bullets=[], bombs=[], explosions=[], fields=[], stickies=[], empShards=[];
const sphGeo=new T.SphereGeometry(1,14,10), dropGeo=new T.IcosahedronGeometry(1,1), tailGeo=new T.ConeGeometry(1,1,10,1,true), orbRingGeo=new T.TorusGeometry(1,0.07,6,20);
const UP=V3(0,1,0);
const FXM={}; const remoteCtl={b:null,yaw:0,pitch:0};
const enemies=f=>fighters.filter(x=>x!==f&&x.side!==f.side&&!x.dead&&x.active!==false); // everyone f can hurt (not teammates)
function fxMats(key,tints){ const k=key+'_'+tints.join('.'); if(FXM[k]) return FXM[k]; const tc=TEAM[key]; const a=tints[0], b=tints[1]||a, c3=tints[2]||b;
  return FXM[k]={ core:basic({color:a?col(a).lerp(col(0xffffff),0.72).getHex():0xffffff}), shell:new T.MeshBasicMaterial({color:col(a||tc.ink),transparent:true,opacity:a?0.8:0.6,depthWrite:false,blending:T.AdditiveBlending}), ring:basic({color:b||tc.light}),
    tail:new T.MeshBasicMaterial({color:col(c3||tc.light),transparent:true,opacity:0.55,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide}), glow:new T.SpriteMaterial({map:TX.glow,color:col(a||tc.ink),blending:T.AdditiveBlending,depthWrite:false,transparent:true,opacity:0.85}) }; }
function bulletTints(s){ const l=[]; if(s.poison) l.push(0x3fe06a); if(s.toxic) l.push(0xa6e22e); if(s.cold) l.push(0x6fc8ff); if(s.explosive) l.push(0xff6a2c); if(s.timed) l.push(0xffb347); if(s.parasite) l.push(0xd070e0); if(s.dazzle) l.push(0xffe45c); if(s.thruster) l.push(0xff9a76); if(s.magnet) l.push(0xff4d6d); return l; }
function bulletTint(s){ return bulletTints(s)[0]||0; }
function spawnBullet(owner,origin,dir,o={}){
  const s=owner.stats, r=s.size, key=owner.team.id, tints=bulletTints(s), tint=tints[0]||0, fm=fxMats(key,tints);
  const g=new T.Group(); g.position.copy(origin);
  const shell=new T.Mesh(sphGeo,fm.shell); shell.scale.setScalar(r*1.25); g.add(shell);
  const core=new T.Mesh(sphGeo,fm.core); core.scale.setScalar(r*0.62); g.add(core);
  const ring=new T.Mesh(orbRingGeo,fm.ring); ring.scale.setScalar(r*1.45); ring.rotation.set(rand(0,3),rand(0,3),0); g.add(ring);
  const glow=new T.Sprite(fm.glow); glow.scale.setScalar(r*8); g.add(glow);
  const tail=new T.Mesh(tailGeo,fm.tail); scene.add(tail); scene.add(g);
  const b={pos:origin.clone(),vel:dir.clone().multiplyScalar(s.speed),r,dmg:s.dmg,owner,s,bounces:s.bounces,life:o.remote?5:3.5,mesh:g,ring,tail,bounced:false,dist:0,age:0,remote:!!o.remote,tint:tint||owner.team.light,k:1};
  bullets.push(b); return b;
}
function placeBulletMesh(b,dt){ b.mesh.position.copy(b.pos); b.mesh.scale.setScalar(b.k*(1+Math.sin(b.age*40)*0.06)); b.ring.rotation.x+=dt*9; b.ring.rotation.y+=dt*6; const sp=b.vel.length(); const d=b.vel.clone().multiplyScalar(1/Math.max(0.01,sp)); const len=Math.min(b.dist,clamp(sp*0.05,0.6,3.4)); b.tail.visible=len>0.15; b.tail.scale.set(b.r*0.8*b.k,len,b.r*0.8*b.k); b.tail.quaternion.setFromUnitVectors(UP,d.clone().negate()); b.tail.position.copy(b.pos).addScaledVector(d,-len/2); }
function removeBullet(i){ const b=bullets[i]; b.gone=true; scene.remove(b.mesh); scene.remove(b.tail); if(remoteCtl.b===b) remoteCtl.b=null; bullets.splice(i,1); }
// sparks
const partPool=[];
for(let i=0;i<280;i++){ const m=new T.Mesh(dropGeo,new T.MeshBasicMaterial({color:0xffffff,transparent:true,blending:T.AdditiveBlending,depthWrite:false})); m.visible=false; scene.add(m); partPool.push({m,vel:V3(),life:0,max:1,size:0.12,grav:1,active:false}); }
function burst(pos,color,n,speed,size=0.12,life=0.6,grav=1){
  let spawned=0; const c=col(color); for(const p of partPool){ if(p.active) continue; p.active=true; p.m.visible=true; p.m.position.copy(pos); p.m.material.color.copy(c); p.m.material.opacity=1; p.vel.set(rand(-1,1),rand(-0.3,1.1),rand(-1,1)).normalize().multiplyScalar(speed*rand(0.35,1)); p.life=p.max=life*rand(0.6,1.2); p.size=size*rand(0.5,1.2); p.grav=grav; p.m.scale.setScalar(p.size); if(++spawned>=n) break; }
}
function updateParticles(dt){ for(const p of partPool){ if(!p.active) continue; p.life-=dt; if(p.life<=0){ p.active=false; p.m.visible=false; continue; } p.vel.y-=CFG.gravity*0.4*dt*p.grav; p.m.position.addScaledVector(p.vel,dt); const k=p.life/p.max; p.m.material.opacity=Math.min(1,k*2.5); const s=p.size*(0.3+k*0.7); p.m.scale.setScalar(s); } }
// flat shock rings
const ringPool=[]; for(let i=0;i<22;i++){ const m=new T.Mesh(ringGeo,new T.MeshBasicMaterial({color:0xffffff,transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending})); m.rotation.x=-Math.PI/2; m.visible=false; m.renderOrder=5; scene.add(m); ringPool.push({m,t:0,dur:0.4,r0:0.2,r1:3,active:false}); }
function shockRing(pos,color,r1,dur=0.45,r0=0.2,normal=null){ const r=ringPool.find(p=>!p.active)||ringPool[0]; r.active=true; r.t=0; r.dur=dur; r.r0=r0; r.r1=r1; r.m.visible=true; r.m.position.copy(pos); if(normal&&Math.abs(normal.y)<0.99){ r.m.quaternion.setFromUnitVectors(V3(0,0,1),normal); r.m.position.addScaledVector(normal,0.03); } else r.m.rotation.set(-Math.PI/2,0,0); r.m.material.color.copy(col(color)); }
function updateRings(dt){ for(const r of ringPool){ if(!r.active) continue; r.t+=dt; const k=r.t/r.dur; if(k>=1){ r.active=false; r.m.visible=false; continue; } const e=1-Math.pow(1-k,3); r.m.scale.setScalar(lerp(r.r0,r.r1,e)); r.m.material.opacity=(1-k)*0.95; } }
const flashPool=[]; for(let i=0;i<12;i++){ const s=new T.Sprite(new T.SpriteMaterial({map:TX.glow,color:0xffffff,blending:T.AdditiveBlending,depthWrite:false,transparent:true,opacity:0})); s.visible=false; scene.add(s); flashPool.push({s,t:0,dur:0.2,size:3,active:false}); }
function flashAt(pos,color,size,dur=0.22){ const f=flashPool.find(p=>!p.active)||flashPool[0]; f.active=true; f.t=0; f.dur=dur; f.size=size; f.s.visible=true; f.s.position.copy(pos); f.s.material.color.copy(col(color)); }
function updateFlashes(dt){ for(const f of flashPool){ if(!f.active) continue; f.t+=dt; const k=f.t/f.dur; if(k>=1){ f.active=false; f.s.visible=false; continue; } f.s.scale.setScalar(f.size*(0.5+k*0.8)); f.s.material.opacity=1-k; } }
const ghostPool=[]; for(let i=0;i<14;i++){ const m=new T.Mesh(sphGeo,new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,depthWrite:false})); m.visible=false; scene.add(m); ghostPool.push({m,t:0,active:false}); }
function ghostAt(pos,color){ const gh=ghostPool.find(p=>!p.active)||ghostPool[0]; gh.active=true; gh.t=0; gh.m.visible=true; gh.m.position.copy(pos); gh.m.material.color.copy(col(color)); }
function updateGhosts(dt){ for(const gh of ghostPool){ if(!gh.active) continue; gh.t+=dt; const k=gh.t/0.3; if(k>=1){ gh.active=false; gh.m.visible=false; continue; } gh.m.scale.setScalar(0.66*(1-k*0.5)); gh.m.material.opacity=0.5*(1-k); } }
// glass shards (dome shatter, EMP, knock-outs)
const shardGeo=(()=>{ const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute([0,0.5,0, 0.36,-0.3,0, -0.3,-0.4,0],3)); g.computeVertexNormals(); return g; })();
const shardPool=[]; for(let i=0;i<90;i++){ const m=new T.Mesh(shardGeo,new T.MeshBasicMaterial({color:0xffffff,transparent:true,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending})); m.visible=false; scene.add(m); shardPool.push({m,vel:V3(),spin:V3(),t:0,dur:0.6,size:0.3,active:false,grav:0}); }
function spawnShard(pos,vel,color,size,dur,grav=0){ const s=shardPool.find(p=>!p.active)||shardPool[Math.floor(Math.random()*shardPool.length)]; s.active=true; s.t=0; s.dur=dur; s.size=size; s.grav=grav; s.m.visible=true; s.m.position.copy(pos); s.vel.copy(vel); s.spin.set(rand(-9,9),rand(-9,9),rand(-9,9)); s.m.rotation.set(rand(0,6),rand(0,6),rand(0,6)); s.m.material.color.copy(col(color)); return s; }
function shatterDome(c,R,color,n=30,speed=5){ for(let i=0;i<n;i++){ const a=rand(0,Math.PI*2), el=Math.acos(rand(0,1)); const d=V3(Math.cos(a)*Math.sin(el),Math.cos(el),Math.sin(a)*Math.sin(el)); spawnShard(c.clone().addScaledVector(d,R),d.clone().multiplyScalar(speed*rand(0.5,1.2)),i%3?color:0xffffff,rand(0.25,0.6),rand(0.4,0.75),0.5); } }
function updateShards(dt){ for(const s of shardPool){ if(!s.active) continue; s.t+=dt; const k=s.t/s.dur; if(k>=1){ s.active=false; s.m.visible=false; continue; } s.vel.y-=CFG.gravity*0.5*s.grav*dt; s.m.position.addScaledVector(s.vel,dt); s.m.rotation.x+=s.spin.x*dt; s.m.rotation.y+=s.spin.y*dt; s.m.rotation.z+=s.spin.z*dt; s.m.scale.setScalar(s.size*(1-k*0.4)); s.m.material.opacity=(1-k)*0.95; } }
function spawnExplosionFx(pos,r,color){ const m=new T.Mesh(sphGeo,new T.MeshBasicMaterial({color:col(color),transparent:true,opacity:0.7,depthWrite:false,blending:T.AdditiveBlending})); m.position.copy(pos); scene.add(m); const m2=new T.Mesh(sphGeo,new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.9,depthWrite:false})); m2.position.copy(pos); scene.add(m2); explosions.push({m,m2,t:0,r}); burst(pos,color,16,10,0.16,0.7); burst(pos,0xffffff,8,7,0.1,0.4); flashAt(pos,color,r*4.5,0.28); const g=groundAt(pos.x,pos.z,pos.y+2,0.2); if(g!==null&&pos.y-g<r) shockRing(V3(pos.x,g+0.06,pos.z),color,r*1.5,0.5); }
function updateExplosions(dt){ for(let i=explosions.length-1;i>=0;i--){ const e=explosions[i]; e.t+=dt; const k=e.t/0.38; if(k>=1){ scene.remove(e.m); scene.remove(e.m2); explosions.splice(i,1); continue; } const s=Math.sin(k*Math.PI/2); e.m.scale.setScalar(0.2+e.r*s); e.m.material.opacity=0.7*(1-k); e.m2.scale.setScalar(Math.max(0.01,e.r*0.6*s*(1-k))); e.m2.material.opacity=0.9*(1-k); } }
// floating text
const floatPool=[]; const floatLayer=$('floats');
for(let i=0;i<26;i++){ const d=document.createElement('div'); d.className='float'; floatLayer.appendChild(d); floatPool.push({el:d,active:false,t:0,pos:V3(),dx:0}); }
function floatText(pos,text,cls){ const f=floatPool.find(p=>!p.active)||floatPool[0]; f.active=true; f.t=0; f.pos.copy(pos); f.dx=rand(-20,20); f.el.textContent=text; f.el.className='float '+(cls||''); f.el.style.display='block'; }
const _proj=V3();
function updateFloats(dt){ for(const f of floatPool){ if(!f.active) continue; f.t+=dt; if(f.t>0.95){ f.active=false; f.el.style.display='none'; continue; } _proj.copy(f.pos); _proj.y+=f.t*1.3; _proj.project(camera); if(_proj.z>1){ f.el.style.display='none'; continue; } f.el.style.display='block'; const pop=f.t<0.12? 0.6+f.t/0.12*0.7 : 1.3-Math.min(0.3,(f.t-0.12)*2); f.el.style.transform=`translate(-50%,-50%) translate(${((_proj.x+1)/2*window.innerWidth+f.dx*f.t).toFixed(1)}px,${((1-_proj.y)/2*window.innerHeight).toFixed(1)}px) scale(${pop.toFixed(2)}) rotate(${(f.dx*0.3).toFixed(1)}deg)`; f.el.style.opacity=String(1-Math.max(0,(f.t-0.6)/0.35)); } }

// ================= FIELDS (healing, toxic cloud, supernova) =================
function addField(kind,pos,r,dur,owner,n){
  const g=new T.Group(); g.position.copy(pos); const fd={kind,pos:pos.clone(),r,dur,t:0,owner,n,g,acc:0,done:false};
  if(kind==='heal'){ const d=new T.Mesh(domeGeo,new T.MeshBasicMaterial({color:col(0x5de08a),transparent:true,opacity:0.16,depthWrite:false,side:T.DoubleSide})); d.scale.setScalar(r); g.add(d); const ring=new T.Mesh(discGeo,new T.MeshBasicMaterial({map:TX.ring,color:col(0x5de08a),transparent:true,opacity:0.9,depthWrite:false,blending:T.AdditiveBlending})); ring.rotation.x=-Math.PI/2; ring.position.y=0.04; ring.scale.setScalar(r); g.add(ring); fd.ring=ring; fd.d=d; }
  else if(kind==='toxic'){ fd.puffs=[]; const mat=new T.MeshBasicMaterial({color:col(0x9be043),transparent:true,opacity:0.3,depthWrite:false}); fd.mat=mat; for(let i=0;i<6;i++){ const p=new T.Mesh(sphGeo,mat); const a=i/6*6.28; p.position.set(Math.cos(a)*r*0.45,r*0.35+rand(-0.2,0.3),Math.sin(a)*r*0.45); p.scale.setScalar(r*rand(0.42,0.6)); g.add(p); fd.puffs.push(p); } const c=new T.Mesh(sphGeo,mat); c.position.y=r*0.45; c.scale.setScalar(r*0.6); g.add(c); fd.puffs.push(c); }
  else if(kind==='nova'){ const H=1.3; fd.H=H; const AB=T.AdditiveBlending;
    if(!TX.accretion) TX.accretion=mkTex(512,512,(g2,W2,H2)=>{ g2.translate(256,256); const gr=g2.createRadialGradient(0,0,80,0,0,256); gr.addColorStop(0,'rgba(255,255,255,0)'); gr.addColorStop(0.08,'rgba(255,255,255,1)'); gr.addColorStop(0.2,'rgba(255,200,240,.95)'); gr.addColorStop(0.5,'rgba(255,90,200,.55)'); gr.addColorStop(1,'rgba(120,20,160,0)'); g2.fillStyle=gr; g2.fillRect(-256,-256,512,512);
      g2.globalCompositeOperation='destination-out'; for(let k=0;k<7;k++){ g2.beginPath(); for(let q=0;q<=60;q++){ const u=q/60, a=k/7*Math.PI*2+u*3.2, rr=95+u*160; q?g2.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):g2.moveTo(Math.cos(a)*rr,Math.sin(a)*rr); } g2.lineWidth=14; g2.strokeStyle='rgba(0,0,0,.55)'; g2.stroke(); } },{clamp:true});
    const core=new T.Mesh(sphGeo,new T.MeshBasicMaterial({color:0x000000})); core.position.y=H; core.renderOrder=9; g.add(core); fd.core=core;
    const lens=new T.Sprite(new T.SpriteMaterial({map:TX.glow,color:col(0x0a0012),transparent:true,opacity:0.9,depthWrite:false})); lens.position.y=H; lens.renderOrder=3; g.add(lens); fd.lens=lens;
    if(!TX.photon) TX.photon=mkTex(256,256,(g2)=>{ g2.translate(128,128); const gr=g2.createRadialGradient(0,0,0,0,0,128); gr.addColorStop(0,'rgba(0,0,0,0)'); gr.addColorStop(0.33,'rgba(0,0,0,0)'); gr.addColorStop(0.37,'rgba(255,255,255,1)'); gr.addColorStop(0.45,'rgba(255,170,235,.75)'); gr.addColorStop(0.7,'rgba(200,80,255,.22)'); gr.addColorStop(1,'rgba(120,20,200,0)'); g2.fillStyle=gr; g2.fillRect(-128,-128,256,256); },{clamp:true});
    const ph=new T.Sprite(new T.SpriteMaterial({map:TX.photon,color:col(0xffffff),blending:AB,transparent:true,depthWrite:false})); ph.position.y=H; ph.renderOrder=11; g.add(ph); fd.ph=ph;
    const dg=new T.RingGeometry(0.3,1,72,1); const dm=(c,o)=>new T.MeshBasicMaterial({map:TX.accretion,color:col(c),transparent:true,opacity:o,blending:AB,depthWrite:false,side:T.DoubleSide});
    const d1=new T.Mesh(dg,dm(0xffffff,1)), d2=new T.Mesh(dg,dm(0xffa040,0.7)); for(const d of [d1,d2]){ d.position.y=H; d.renderOrder=10; g.add(d); } fd.d1=d1; fd.d2=d2;
    fd.flow=[]; const fm=new T.MeshBasicMaterial({color:col(0xffc8f4),transparent:true,blending:AB,depthWrite:false}); for(let k=0;k<44;k++){ const m=new T.Mesh(sphGeo,fm); g.add(m); fd.flow.push({m,a:rand(0,6.28),rr:rand(0.25,1)*r*1.9,y:rand(-0.5,1.0)}); }
    const ring=new T.Mesh(discGeo,new T.MeshBasicMaterial({map:TX.ring,color:col(0x9a3cff),transparent:true,opacity:0.9,depthWrite:false,blending:AB})); ring.rotation.x=-Math.PI/2; ring.position.y=0.05; ring.scale.setScalar(r); g.add(ring); fd.ring=ring; SFX.blackhole(); }
  scene.add(g); fields.push(fd);
  const mine=fields.filter(f=>f.kind===kind&&f.owner===owner); if(mine.length>6){ const old=mine[0]; old.t=old.dur; }
  return fd;
}
function updateFields(dt,t){
  for(let i=fields.length-1;i>=0;i--){ const fd=fields[i]; if(!fd) continue; fd.t+=dt; const k=fd.t/fd.dur;
    if(fd.kind==='heal'){ fd.ring.rotation.z=t*0.8; fd.d.material.opacity=0.16*Math.min(1,(1-k)*4); fd.ring.material.opacity=0.9*Math.min(1,(1-k)*4); if(state==='fight'){ fd.accs=fd.accs||new Map(); let any=false; const rate=fd.owner.stats.hp*0.09*fd.n; // heals anyone standing in it, friend or foe
        for(const o of fighters){ if(o.dead||o.center().distanceTo(fd.pos)>=fd.r+0.6) continue; any=true; let a=(fd.accs.get(o)||0)+rate*dt; if(a>=3){ const h=Math.floor(a); a-=h; if(o.hp<o.maxHp()){ o.hp=Math.min(o.maxHp(),o.hp+h); floatText(o.center().add(V3(rand(-0.4,0.4),1,0)),'+'+h,'heal'); } } fd.accs.set(o,a); if(Math.random()<dt*6) burst(o.center(),0x5de08a,1,1.2,0.07,0.6,-0.6); }
        if(any&&Math.random()<dt*10) burst(V3(fd.pos.x+rand(-fd.r,fd.r)*0.6,fd.pos.y+0.2,fd.pos.z+rand(-fd.r,fd.r)*0.6),0x5de08a,1,1.5,0.08,0.8,-0.5); } }
    else if(fd.kind==='toxic'){ fd.mat.opacity=0.3*Math.min(1,fd.t*4,(1-k)*4); fd.puffs.forEach((p,j)=>{ p.position.y+=Math.sin(t*2+j)*dt*0.12; }); fd.g.rotation.y+=dt*0.3; if(state==='fight'){ fd.accs=fd.accs||new Map(); for(const e of enemies(fd.owner)){ if(e.center().distanceTo(V3(fd.pos.x,fd.pos.y+0.8,fd.pos.z))>=fd.r+0.5) continue; applySlow(e,0.3,0.3); let a=(fd.accs.get(e)||0)+7*fd.n*dt; if(a>=3){ const d=Math.floor(a); a-=d; applyDamage(e,d,fd.owner,{tick:true,cause:'cloud'}); } fd.accs.set(e,a); } } }
    else if(fd.kind==='nova'){ const pull=fd.t<fd.dur-0.25; const g01=Math.min(1,fd.t/(fd.dur-0.25)), col01=pull?0:(fd.t-(fd.dur-0.25))/0.25;
      const cs=pull? 0.2+0.8*(1-Math.pow(1-g01,2)) : Math.max(0.03,1-col01*1.1);
      fd.core.scale.setScalar(0.9*cs); fd.lens.scale.setScalar(5.2*cs); fd.ph.scale.setScalar((5.3+Math.sin(t*34)*0.15)*cs*(pull?1:1+col01*2.2)); fd.ph.material.opacity=pull?0.85:1; if(!pull) fd.ph.material.color.setRGB(1,0.85+col01*0.15,1);
      { const qt=new T.Quaternion().setFromEuler(new T.Euler(-1.05,0,0.25)); for(const [d,sc,sp] of [[fd.d1,3.6,-5],[fd.d2,2.5,-8]]){ d.quaternion.copy(camera.quaternion).multiply(qt).multiply(new T.Quaternion().setFromAxisAngle(V3(0,0,1),t*sp)); d.scale.setScalar(sc*cs); } }
      fd.ring.rotation.z=-t*3; fd.ring.scale.setScalar(fd.r*(1-0.6*k));
      const R1=fd.r*1.9; for(const p of fd.flow){ p.rr-=dt*(3+7/(p.rr+0.3)); p.a+=dt*(2.5+9/(p.rr+0.5)); if(p.rr<0.9*cs*0.7){ p.rr=rand(0.75,1)*R1; p.a=rand(0,6.28); p.y=rand(-0.5,1.0); } const yk=p.rr/R1; p.m.position.set(Math.cos(p.a)*p.rr,fd.H+p.y*yk,Math.sin(p.a)*p.rr); p.m.scale.set(0.05+0.05*(1-yk),0.05,0.05+0.05*(1-yk)); p.m.visible=pull; }
      if(pull&&Math.random()<dt*8){ const a=rand(0,6.28), rr=rand(0.6,1)*R1; burst(V3(fd.pos.x+Math.cos(a)*rr,fd.pos.y+0.1,fd.pos.z+Math.sin(a)*rr),0xb07aff,1,0.6,0.08,0.5,-0.2); }
      for(const e of (state==='fight'?enemies(fd.owner):[])){ const c=V3(fd.pos.x,fd.pos.y+0.4,fd.pos.z); const d=V3().subVectors(c,e.pos); const dist=d.length(); if(dist<fd.r*(3+0.6*(fd.n-1))&&pull){ tickDamage(fd.owner,'novaAcc'+e.id,5*fd.n,dt,e,'nova',0xb07aff); d.y=0; const hl=d.length(); if(hl>0.25){ d.multiplyScalar(1/hl); const pw=Math.min(15+5*fd.n,hl*9); e.vel.x=lerp(e.vel.x,d.x*pw,Math.min(1,dt*14)); e.vel.z=lerp(e.vel.z,d.z*pw,Math.min(1,dt*14)); } else { e.vel.x*=0.5; e.vel.z*=0.5; } e.dashT=0; if(Math.random()<dt*14) burst(e.center(),0xff4fd8,1,2,0.08,0.4,0); } }
      if(fd.t>=fd.dur&&!fd.done){ fd.done=true; const R=fd.r, c=V3(fd.pos.x,fd.pos.y+fd.H,fd.pos.z), gp=V3(fd.pos.x,fd.pos.y+0.08,fd.pos.z);
        spawnExplosionFx(c,R*1.7,0xff4fd8); spawnExplosionFx(c,R*0.95,0xffffff); flashAt(c,0xffffff,R*5,0.35); flashAt(c,0xff4fd8,R*8,0.6);
        shockRing(gp,0xff4fd8,R*3.4,0.75,0.6); shockRing(gp,0xffffff,R*2.4,0.5,0.4); shockRing(V3(gp.x,gp.y+0.05,gp.z),0xffa040,R*4.2,1.0,0.8); shockRing(c,0xffc8f4,R*2.8,0.6,0.4,V3().subVectors(camera.position,c).normalize());
        burst(c,0xff4fd8,46,15,0.16,0.9,0.4); burst(c,0xffffff,26,11,0.1,0.6,0); burst(c,0xffa040,22,9,0.14,0.8,0.6);
        for(let q=0;q<18;q++){ const d=V3(rand(-1,1),rand(-0.2,1),rand(-1,1)).normalize(); spawnShard(c.clone(),d.multiplyScalar(rand(7,14)),[0xff4fd8,0xffffff,0xb07aff,0xffa040][q%4],rand(0.18,0.34),0.9,1); }
        SFX.supernova(); shakeT=Math.max(shakeT,0.75);
        for(const e of (state==='fight'?enemies(fd.owner):[])){ if(e.center().distanceTo(c)>=R*1.35+0.8) continue; e.stunT=Math.max(e.stunT,1.2+0.5*(fd.n-1)); floatText(e.center().add(V3(0,1.2,0)),'SUPERNOVA!','status'); applyDamage(e,15*fd.n,fd.owner,{cause:'nova'}); const pd=V3().subVectors(e.pos,fd.pos); pd.y=0; if(pd.lengthSq()<0.01) pd.set(1,0,0); pd.normalize(); e.vel.x=pd.x*9; e.vel.z=pd.z*9; e.vel.y=Math.max(e.vel.y,6); e.onGround=false; e.knockT=0.35; } } }
    if(fd.t>=fd.dur){ scene.remove(fd.g); fields.splice(i,1); } }
}
function clearFields(){ for(const fd of fields) scene.remove(fd.g); fields.length=0; for(const s of stickies) scene.remove(s.m); stickies.length=0; for(const w of empShards){ scene.remove(w.mesh); w.m.dispose(); } empShards.length=0; }

// ================= COMBAT =================
const matchStats={shots:0,hits:0,dmg:0,taken:0,blocks:0,blocked:0};
const roundInfo={shots:0,hits:0,dmg:0,botBlocked:0,t:0,cause:'',botHpFrac:1};
function onDeal(source,target,amount){
  const s=source.stats; if(source.dead) return;
  if(s.lifesteal>0){ const h=Math.round(amount*s.lifesteal); if(h>0&&source.hp<source.maxHp()){ lifeWorm(target,source,'ls'+source.id,0.75,0.85); source.hp=Math.min(source.maxHp(),source.hp+h); floatText(source.center().add(V3(0,1.0,0)),'+'+h,'heal'); } }
  if(s.brawler>0){ if(source.brawlT<=0){ source.hp+=source.stats.hp*2*s.brawler; floatText(source.center().add(V3(0,1.3,0)),'BRAWLER!','status'); burst(source.center(),0xff5a3c,10,5,0.12,0.5,0); } source.brawlT=3; }
  if(s.taste>0) source.tasteT=3;
  if(s.refresh>0&&source.refreshCd<=0&&source.blockCdT>0){ source.blockCdT=0; source.refreshCd=Math.max(0.8,2.4/s.refresh); if(source.isPlayer) floatText(source.center().add(V3(0,1.4,0)),'BLOCK READY','heal'); }
  if(s.scavenger>0&&(source.ammo<s.ammo||source.reloading)){ source.ammo=s.ammo; source.reloading=false; if(source.isPlayer) SFX.tick(); }
}
function fatal(target,source,cause){
  if(NET.on&&NET.role==='guest'&&!NET.allowKill){ if(target.hp<1) target.hp=1; return; } // the host decides knockouts
  if(target.stats.phoenix>target.phoenixUsed){ target.phoenixUsed++; target.hp=Math.round(target.maxHp()*0.5); target.invulnT=1.6; target.poisons.length=0; target.decayPool=0; target.thrusters.length=0; target.stunT=0; target.slowT=0;
    if(cause==='fall'){ target.pos.copy(target.spawn); target.vel.set(0,0,0); }
    const c=target.center(); burst(c,0xff9a3d,30,9,0.18,0.9,-0.4); burst(c,0xffe14d,14,6,0.12,0.7,-0.6); flashAt(c,0xff9a3d,8,0.4); shockRing(V3(target.pos.x,target.pos.y+0.08,target.pos.z),0xff9a3d,4,0.5); floatText(c.add(V3(0,1.4,0)),'PHOENIX!','status'); SFX.revive(); return; }
  if(target.isPlayer) roundInfo.cause=cause||'shot';
  killFighter(target,source);
}
function applyDamage(target,amount,source,o={}){
  if(target.dead||state!=='fight'||amount<=0||target.invulnT>0) return 0;
  if(source&&source.ctl==='ai'&&target.ctl!=='ai'&&!o.fromDecay) amount*=botLevel().dmg;
  if(source&&source!==target){ target.lastHitBy=source; target.lastHitT=gameT; } /*DEBUG-START*/if(window.__aiTap&&!o.tick&&!o.fromDecay) window.__aiTap('hit',source,target);/*DEBUG-END*/
  if(target===player&&source&&source!==player&&!o.tick){ dmgFrom.copy(source.pos); dmgDirT=1; }
  if(target.stats.decay>0&&!o.tick&&!o.fromDecay){ target.decayPool+=amount; target.decaySrc=source; target.decayRate=Math.max(target.decayRate||0,target.decayPool/4); target.hitFlash=0.12; if(source&&source!==target) onDeal(source,target,amount); if(source===player&&target!==player) matchStats.dmg+=amount, roundInfo.dmg+=amount; return amount; }
  amount=Math.max(1,Math.round(amount));
  target.hp-=amount; target.hitFlash=o.tick?0.08:0.2; if(target.mood!=='happy') target.setMood('hurt',o.tick?0.25:0.5); if(!o.tick) target.squash=Math.max(target.squash,0.5);
  floatText(target.center().add(V3(rand(-0.3,0.3),0.8,0)),String(amount),(source===player?'dmg-you':'dmg-bot')+(o.tick?' small':''));
  if(!o.fromDecay){ if(source===player&&target!==player){ matchStats.dmg+=amount; roundInfo.dmg+=amount; } if(source&&source!==target) onDeal(source,target,amount); }
  if(target===player) matchStats.taken+=amount;
  if(target.isPlayer&&!o.tick){ shakeT=Math.max(shakeT,0.2); hurtT=0.35; }
  if(target.hp<=0){ target.hp=0; fatal(target,(source&&source!==target)?source:target.lastHitBy,o.cause||'shot'); }
  return amount;
}
function applySlow(t,amt,dur){ if(t.slowT>0){ t.slowAmt=Math.max(t.slowAmt,amt); t.slowT=Math.max(t.slowT,dur);} else { t.slowAmt=amt; t.slowT=dur; } }
function explode(pos,r,dmg,owner,hurtOwner,cause='blast'){
  spawnExplosionFx(pos,r,owner.color); SFX.explode();
  for(const f of fighters){ if(f.dead||f.active===false) continue; if(f===owner&&!hurtOwner) continue; if(f!==owner&&f.side===owner.side) continue; const d=f.distTo(pos); if(d<r+0.52){ const k=1-clamp((d-0.52)/r,0,1)*0.6; applyDamage(f,dmg*k,owner,{cause}); const push=V3().subVectors(f.center(),pos); if(push.lengthSq()<0.01) push.set(0,1,0); push.normalize(); f.vel.addScaledVector(push,6*k); f.vel.y+=4*k; f.onGround=false; } }
  shakeT=Math.max(shakeT,0.28);
}
// bigger shots = bigger effects: A scales areas (clouds, blasts), P scales strength (poison, slows, shoves)
function bulletAmp(b){ const A=clamp(Math.sqrt((b.r*(b.k||1))/BASE.size),1,2.6); return {A,P:1+(A-1)*0.5}; }
function bulletDamage(b){ return b.dmg*(1+0.045*b.s.grow*b.dist); }
function impactExtras(b,pos,target){
  const s=b.s, dmg=bulletDamage(b), {A,P}=bulletAmp(b);
  if(s.explosive>0) explode(pos.clone(),(2.4+0.5*(s.explosive-1))*A,dmg*(1+0.25*(s.explosive-1)),b.owner,false);
  else if(s.splash>0){ const r=(1.3+0.1*s.splash)*A; spawnExplosionFx(pos,r,b.owner.color); for(const f of fighters){ if(f.dead||f.active===false||f.side===b.owner.side||f===target) continue; if(f.distTo(pos)<r+0.52) applyDamage(f,(s.splash+dmg*0.3)*P,b.owner,{cause:'blast'}); } }
  if(s.toxic>0){ const g=groundAt(pos.x,pos.z,pos.y+0.6,0.1); if(g!==null) addField('toxic',V3(pos.x,g,pos.z),(2.3+0.3*(s.toxic-1))*A,4*P,b.owner,s.toxic*P); }
  if(s.timed>0){ const m=new T.Mesh(sphGeo,basic({color:0xffb347})); m.scale.setScalar((0.2+b.r*0.6)*A); const gl=sprite(0xffb347,1.6,0.9); m.add(gl); gl.scale.setScalar(6); scene.add(m); stickies.push({target:target||null,off:target? pos.clone().sub(target.pos):null,pos:pos.clone(),t:0,dmg:dmg*(target?0.6:1)*(1+0.3*(s.timed-1)),owner:b.owner,m,r:2.1*A,ms:A}); }
}
// where a stuck rocket points now: it rides on the body, so it turns when they turn
function thrAim(f,th){ th.world.copy(th.local).applyAxisAngle(UP,f.yaw); const d=th.dir.set(-th.world.x,0,-th.world.z); if(d.lengthSq()<1e-4) d.set(0,0,1); d.normalize(); d.y=0.16+(th.world.y<-0.3?0.3:0)-(th.world.y>0.4?0.08:0); return d.normalize(); }
function hitFighter(b,target){
  const s=b.s, dmg=bulletDamage(b), {A,P}=bulletAmp(b); const dir=b.vel.clone().normalize(), er=b.r*(b.k||1);
  SFX.hit(); burst(b.pos,b.tint,Math.round(10*A),6*A,0.1*Math.sqrt(A),0.45,0.2); burst(b.pos,0xffffff,5,4,0.07,0.3,0); flashAt(b.pos,b.tint,1.8+er*3,0.16); shockRing(b.pos,b.tint,0.9+er*2,0.25,0.1,dir.clone().negate()); if(A>1.4) shakeT=Math.max(shakeT,0.08*A);
  if(b.owner.isPlayer&&target!==player){ hitMarkerT=0.24; SFX.confirm(); matchStats.hits++; roundInfo.hits++; }
  applyDamage(target,dmg,b.owner,{cause:'shot'}); if(b.owner.isPlayer&&target!==player&&target.dead){ hitMarkerT=0.45; killMarkT=0.45; }
  if(target.dead||state!=='fight') { if(s.explosive>0) spawnExplosionFx(b.pos.clone(),2.2,b.owner.color); return; }
  if(s.poison>0){ target.poisons.push({dps:5.5*s.poison*clamp(dmg/BASE.dmg,0.6,2)*P,t:3,src:b.owner,col:0x49d86b}); poisonSplash(b.pos.clone(),A); }
  if(false) target.poisons.push({dps:7*s.poison*clamp(dmg/BASE.dmg,0.6,2)*P,t:3,src:b.owner,col:0x49d86b});
  if(s.parasite>0) target.poisons.push({dps:5*s.parasite*clamp(dmg/BASE.dmg,0.6,2)*P,t:5,src:b.owner,col:0xd070e0});
  if(s.cold>0){ iceHit(target,b.pos.clone()); applySlow(target,Math.min(0.85,0.7*(1+(P-1)*0.4)),(1.0+0.6*s.cold)*P); target.coldT=Math.max(target.coldT||0,(1.0+0.6*s.cold)*P); }
  if(s.dazzle>0&&target.dazzleN<=0&&!(target.dazzleImm>0)&&target.dzVol!==b.vol){ target.dzVol=b.vol; target.stunT=Math.max(target.stunT,0.18*P); applySlow(target,0.3,0.6); target.dazzleN=1+s.dazzle+Math.floor(P-1+0.5); target.dazzleT=0.6; floatText(target.center().add(V3(0,1.3,0)),'DAZZLED','status'); }
  if(s.thruster>0){ // a mini rocket sticks where the shot landed and drives them away from that side, turning with their body
    const off=V3().subVectors(b.pos,target.center()); off.y=clamp(off.y,-0.75,0.6); let h=Math.hypot(off.x,off.z); if(h<0.05){ off.x=-dir.x; off.z=-dir.z; h=Math.hypot(off.x,off.z)||1; }
    const surf=V3(off.x/h*0.47,off.y,off.z/h*0.47); const th={local:surf.applyAxisAngle(UP,-target.yaw),world:V3(),dir:V3(),t:1.0,f:(5.6+dmg*0.12)*(1+0.6*(s.thruster-1))*P}; thrAim(target,th);
    if(target.thrusters.length>=9) target.thrusters.shift(); target.thrusters.push(th); addThrusterFx(target,th); }
  impactExtras(b,b.pos.clone(),target);
}
function bulletImpact(b,hit){
  const er=b.r*(b.k||1); burst(b.pos,b.tint,7,5,0.09,0.4,0.2); burst(b.pos,0xffffff,3,3,0.06,0.25,0); shockRing(b.pos.clone().addScaledVector(hit.n,-er+0.02),b.tint,0.7+er*2.2,0.3,0.08,hit.n); flashAt(b.pos,b.tint,1.2+er*3,0.14);
  impactExtras(b,b.pos.clone(),null); magnetLand(b,b.pos.clone());
}
function tryFire(f,pressed){
  if(f.dead||state!=='fight') return false;
  if(f.isPlayer&&remoteCtl.b){ if(pressed){ remoteCtl.b.remote=false; remoteCtl.b=null; steerLatch=true; } return false; }
  if(f.stunT>0||f.reloading||f.fireCd>0||f.ammo<=0) return false;
  if(f.stats.pact>0){ const cost=10*f.stats.pact; if(f.hp<=cost){ if(f.isPlayer&&pressed) floatText(f.center().add(V3(0,1.3,0)),'NOT ENOUGH HP','status'); return false; } f.hp-=cost; f.hitFlash=0.08; }
  f.fireCd=f.stats.fireInt; f.ammo--; f.sinceShot=0; f.lastFireT=gameT; /*DEBUG-START*/if(window.__aiTap) window.__aiTap('fire',f);/*DEBUG-END*/
  firePellets(f);
  if(f.stats.burst>0){ f.burstQueue=f.stats.burst; f.burstT=0.07; }
  if(f.ammo<=0){ f.reloading=true; f.reloadT=f.stats.reload; }
  return true;
}
function assistTarget(o,dir){ let best=null, ba=0.35; for(const e of enemies(player)){ if(!e.mesh.visible) continue; const a=dir.angleTo(V3().subVectors(e.center(),o)); if(a<ba){ ba=a; best=e; } } return best; }
function firePellets(f){
  const origin=(NET.fireOrigin&&!f.isPlayer)?NET.fireOrigin.clone():f.muzzlePos(); let dir;
  if(f.isPlayer){ dir=V3().subVectors(aimPoint,origin); if(dir.lengthSq()<0.25||dir.dot(f.aimDir())<0) dir=f.aimDir(); dir.normalize(); matchStats.shots++; roundInfo.shots++; }
  else dir=f.botAim? f.botAim.clone():f.aimDir();
  const at=(f.isPlayer&&settings.assist&&f.stats.remote===0)? assistTarget(origin,dir) : null;
  if(at){ const tgt=at.center(); const tf=tgt.distanceTo(origin)/f.stats.speed; tgt.addScaledVector(at.vel,Math.min(tf,0.7)*0.9); const want=V3().subVectors(tgt,origin).normalize(); const lim=(pad.used||TOUCH.on)?0.28:0.2, ang=dir.angleTo(want); if(ang<lim&&hasLOS(origin,at.center())) dir.lerp(want,ang<lim*0.5?1:0.85).normalize(); }
  if(NET.on&&!NET.fireOrigin&&(f.isPlayer||(f.ctl==='ai'&&NET.role==='host'))) netRecordShot(origin,dir,f);
  const n=f.stats.pellets, spread=f.stats.spread; let lead=null; f.volN=(f.volN||0)+1; const vol=f.id*100000+f.volN;
  for(let i=0;i<n;i++){
    const d=dir.clone();
    if(n>1||spread>0){ const sp=(n>1?Math.max(spread,0.05):spread); const a=rand(0,Math.PI*2), m=Math.sqrt(Math.random())*sp; const up=Math.abs(d.y)>0.9?V3(1,0,0):V3(0,1,0); const r=V3().crossVectors(d,up).normalize(); const u=V3().crossVectors(r,d).normalize(); d.addScaledVector(r,Math.cos(a)*m).addScaledVector(u,Math.sin(a)*m).normalize(); }
    const rem=f.stats.remote>0&&!NET.fireOrigin; const steer=rem&&i===0&&!(f.isPlayer&&remoteCtl.b);
    const fr=f.stats.size*1.25; const o2=fr>0.32&&!NET.fireOrigin?origin.clone().addScaledVector(d,Math.min(fr-0.2,1.2)):origin; const b=spawnBullet(f,o2,d,{remote:steer}); b.sid=NET.fireOrigin?(NET.curSid|0):(f.lastSid|0); b.pi=i; b.vol=vol;
    if(steer){ lead=b; if(f.isPlayer){ remoteCtl.b=b; const dd=dir; remoteCtl.yaw=Math.atan2(-dd.x,-dd.z); remoteCtl.pitch=Math.asin(clamp(dd.y,-1,1)); } }
    else if(rem){ const L=lead||(f.isPlayer?remoteCtl.b:null); if(L){ b.follow=L; b.fq=new T.Quaternion().setFromUnitVectors(L.vel.clone().normalize(),d); b.life=L.life; } }
  }
  f.muzzleGlow.material.opacity=1; f.flash.material.opacity=1; f.recoil=1; f.setMood('angry',0.4); if(f.isPlayer){ SFX.shoot(); crossKick=1; } else SFX.shootBot();
  burst(origin,f.team.light,4,3.5,0.06,0.22,0);
}
// A shot that meets a dome bounces straight back at whoever fired it, carrying everything it had (poison, ice, rockets, blasts...)
function reflectBullet(b,e){ const src=b.owner; b.owner=e; b.reflected=(b.reflected||0)+1; b.follow=null; if(b.remote){ b.remote=false; if(remoteCtl.b===b) remoteCtl.b=null; }
  const c=e.domeC(); const n=V3().subVectors(b.pos,c); if(n.lengthSq()<1e-4) n.set(0,1,0); n.normalize(); const sp=Math.max(b.vel.length(),20);
  let d; if(src&&!src.dead&&src!==e) d=V3().subVectors(src.center(),b.pos).normalize(); else d=b.vel.clone().reflect(n).normalize(); if(d.dot(n)<-0.2) d.addScaledVector(n,0.6).normalize();
  b.vel.copy(d).multiplyScalar(sp); b.pos.copy(c).addScaledVector(n,e.domeR()+b.r*(b.k||1)+0.08); b.life=Math.max(b.life,2.6); b.bounced=false; b.age=0;
  e.domeHitDir.copy(n); e.domeHitAge=0; burst(b.pos,0xffffff,8,5,0.08,0.35,0); flashAt(b.pos,e.team.light,2.6,0.2); shockRing(b.pos.clone(),0xffffff,1.1,0.25,0.1,n); SFX.blocked();
  if(e.isPlayer){ floatText(b.pos.clone(),'REFLECTED!','status'); matchStats.blocked++; } else roundInfo.botBlocked++; }
function tryBlock(f,quiet){ if(f.dead||state!=='fight'||f.blockActive||f.stunT>0) return false; if(f.silenceT>0){ if(f.isPlayer&&!quiet) floatText(f.center().add(V3(0,1.3,0)),'SILENCED','status'); return false; } if(f.blockCdT>0) return false; doBlock(f,false); if(f.isPlayer||(NET.on&&f.ctl==='ai'&&NET.role==='host')) netRecordBlock(f); return true; }
function findBlinkSpot(f,dist){ const base=f.forward(); for(const ang of [0,0.3,-0.3,0.6,-0.6,1.0,-1.0]){ const dir=V3(base.x*Math.cos(ang)-base.z*Math.sin(ang),0,base.x*Math.sin(ang)+base.z*Math.cos(ang)); for(let d=dist; d>=1.5; d-=0.5){ const x=f.pos.x+dir.x*d, z=f.pos.z+dir.z*d; const g=groundAt(x,z,f.pos.y+4,0.25); if(g===null) continue; const test={pos:V3(x,g,z),vel:V3(),radius:f.radius,height:f.height}; resolveWalls(test); if(Math.hypot(test.pos.x-x,test.pos.z-z)>1.4) continue; const g2=groundAt(test.pos.x,test.pos.z,g+0.3,0.2); if(g2===null) continue; test.pos.y=g2; return test.pos; } } return null; }
function doBlock(f,isEcho,afterBlink){
  const s=f.stats;
  if(s.teleport>0&&!isEcho&&!afterBlink){ const dest=findBlinkSpot(f,7+3*s.teleport); if(!dest&&f.isPlayer) floatText(f.center().add(V3(0,1.2,0)),'NO ROOM TO BLINK','status'); if(dest){ floatText(f.center().add(V3(0,1.2,0)),'BLINK!','status'); blinkFx(f,f.pos.clone(),dest.clone()); SFX.shatter(); f.blinkPending=0.36; f.invulnT=Math.max(f.invulnT,0.4); f.pos.copy(dest); f.visY=dest.y; f.onGround=true; f.dashT=0; f.vel.x=0; f.vel.z=0; f.vel.y=0; SFX.teleport(); if(!isEcho) f.blockCdT=s.blockCd; return; } }
  /*DEBUG-START*/if(window.__aiTap&&!isEcho) window.__aiTap('block',f);/*DEBUG-END*/ f.blockActive=true; f.blockT=CFG.blockDuration; if(!isEcho&&!afterBlink) f.blockCdT=s.blockCd;
  SFX.block(); const c=f.domeC(), R=f.domeR(); if(f.isPlayer&&!isEcho) matchStats.blocks++;
  shockRing(V3(c.x,c.y+0.05,c.z),f.team.light,R*1.3,0.5,R*0.2); shockRing(V3(c.x,c.y+0.07,c.z),0xffffff,R*1.05,0.3,R*0.1); flashAt(V3(c.x,c.y+R*0.5,c.z),f.team.light,R*2.4,0.25); burst(f.center(),f.team.light,12,R*2.4,0.08,0.35,0);
  for(let i=bullets.length-1;i>=0;i--){ const b=bullets[i]; if(b.owner!==f && b.pos.distanceTo(c)<R+b.r) reflectBullet(b,f); }
  for(const e of enemies(f)){ const ed=e.center().distanceTo(c);
  if(ed<R+0.6){
    if(s.silence>0){ e.silenceT=Math.max(e.silenceT,2.5+1.5*s.silence); floatText(e.center().add(V3(0,1.5,0)),'SILENCED','status'); }
    if(s.frost>0){ applySlow(e,Math.min(0.8,0.5+0.1*s.frost),2.0+1.0*s.frost); floatText(e.center().add(V3(0,1.2,0)),'FROZEN!','status'); burst(e.center(),0xa8ecff,14,4,0.1,0.7,0.3); shockRing(V3(e.pos.x,e.pos.y+0.06,e.pos.z),0xa8ecff,1.6,0.5); }
    if(s.overpower>0){ applyDamage(e,0.15*f.maxHp()*s.overpower,f,{cause:'dome'}); burst(e.center(),0xff6f91,12,6,0.12,0.5,0); }
    if(s.shock>0&&!e.dead){ const dir=V3().subVectors(e.pos,f.pos); dir.y=0; if(dir.lengthSq()<0.01) dir.set(rand(-1,1),0,rand(-1,1)); dir.normalize(); const force=20+6*(s.shock-1); e.vel.x=dir.x*force; e.vel.z=dir.z*force; e.vel.y=Math.max(e.vel.y,8.2); e.onGround=false; e.knockT=0.55; e.stunT=Math.max(e.stunT,0.3); burst(e.center(),0xffffff,14,8,0.1,0.4,0); flashAt(e.center(),0x5b9dff,3,0.2); floatText(e.center().add(V3(0,1.2,0)),'LAUNCHED!','status'); if(e.isPlayer) shakeT=0.35; shockRing(V3(c.x,c.y+0.08,c.z),0xffffff,R*2.6,0.45,R*0.6); shockRing(V3(c.x,c.y+0.1,c.z),0x5b9dff,R*3.4,0.6,R*0.8); }
  }
  if(s.implode>0&&ed<R*2+1&&!(s.shock>0&&ed<R+0.6)){ const dir=V3().subVectors(f.pos,e.pos); dir.y=0; if(dir.lengthSq()>0.3){ dir.normalize(); const force=13+4*(s.implode-1); e.vel.x=dir.x*force; e.vel.z=dir.z*force; e.vel.y=Math.max(e.vel.y,3.5); e.onGround=false; floatText(e.center().add(V3(0,1.2,0)),'PULLED!','status'); for(let i=0;i<4;i++) ghostAt(e.center().lerp(f.center(),i/5),0x8f7bff); } shockRing(V3(c.x,c.y+0.08,c.z),0x8f7bff,R*0.3,0.45,R*2); }
  }
  if(s.bombs>0){ const n=6+3*(s.bombs-1); const a0=rand(0,6.28); for(let i=0;i<n;i++){ const a=a0+i/n*Math.PI*2; spawnBomb(f,f.center(),V3(Math.cos(a),0,Math.sin(a)),R); } }
  if(s.emp>0){ const m=domeMat(0x46e0d0,0.1); setPal(m,[new T.Color(0x46e0d0),new T.Color(0xa8f7ee),new T.Color(f.team.light)]); const mesh=new T.Mesh(domeGeo,m); mesh.position.copy(c); mesh.renderOrder=7; mesh.scale.setScalar(R); scene.add(mesh); empShards.push({mesh,m,c:c.clone(),r0:R,r1:R*2.3,t:0,dur:0.45,owner:f,n:s.emp,hit:new Set(fighters)}); empBurst(f,c,s.emp); SFX.zap(); }
  if(s.heal>0) addField('heal',c.clone(),R,4,f,s.heal);
  if(s.nova>0){ const fw=f.forward(); const p=V3(c.x+fw.x*R*0.9,c.y,c.z+fw.z*R*0.9); const g=groundAt(p.x,p.z,c.y+1,0.1); addField('nova',g===null?c.clone():V3(p.x,g,p.z),R*1.2*(1+0.2*(s.nova-1)),1.5,f,s.nova); }
  if(s.saw>0) f.sawT=1.6+0.8*s.saw;
  if(s.tacreload>0){ f.ammo=s.ammo; f.reloading=false; if(f.isPlayer) SFX.tick(); }
  if(s.echo>0&&!isEcho){ f.echoT=0.65; f.echoCount=s.echo; }
}
let bombMat=null, fuseMat=null; const bombGeo=new T.SphereGeometry(0.24,14,10);
function spawnBomb(owner,pos,dir,R){ if(!bombMat){ bombMat=toon({color:0x232a42}); fuseMat=basic({color:0xffe14d}); } const m=new T.Mesh(bombGeo,bombMat); m.castShadow=true; outl(m,1.15); const band=new T.Mesh(new T.TorusGeometry(0.245,0.03,6,16),basic({color:owner.color})); band.rotation.x=Math.PI/2; m.add(band); const fuse=new T.Mesh(new T.SphereGeometry(0.07,8,6),fuseMat); fuse.position.y=0.29; m.add(fuse); scene.add(m); bombs.push({owner,pos:pos.clone(),vel:dir.clone().multiplyScalar(R*2.2+2).add(V3(0,5.5,0)),t:0,m,fuse}); }
function updateBombs(dt){
  for(let i=bombs.length-1;i>=0;i--){ const b=bombs[i]; if(!b) continue; b.t+=dt; b.vel.y-=CFG.gravity*dt; b.pos.addScaledVector(b.vel,dt);
    const hit=pointVsWorld(b.pos,0.24); if(hit){ b.pos.addScaledVector(hit.n,hit.depth); const vn=b.vel.dot(hit.n); if(vn<0) b.vel.addScaledVector(hit.n,-vn*1.4); b.vel.multiplyScalar(0.75); }
    b.m.position.copy(b.pos); b.m.rotation.x+=dt*5; b.m.rotation.z+=dt*3; const fl=Math.sin(b.t*b.t*38)>0.55; b.m.scale.setScalar(1+(fl?0.16:0)*Math.min(1,b.t*1.5)); b.fuse.scale.setScalar(fl?2.2:1);
    if(b.pos.y<-1||b.t>=1.15){ if(b.pos.y>=-1) explode(b.pos.clone(),2.6,30,b.owner,true,'bomb'); else burst(b.pos,0xbfe6ff,6,3,0.1,0.5); scene.remove(b.m); bombs.splice(i,1); } }
  for(let i=stickies.length-1;i>=0;i--){ const s=stickies[i]; if(!s) continue; s.t+=dt; if(s.target&&!s.target.dead) s.pos.copy(s.target.pos).add(s.off); s.m.position.copy(s.pos); s.m.scale.setScalar(0.22*(s.ms||1)*(1+Math.sin(s.t*50)*0.25)); if(s.t>=0.5){ explode(s.pos.clone(),s.r||2.1,s.dmg,s.owner,false,'blast'); scene.remove(s.m); stickies.splice(i,1); } }
  for(let i=empShards.length-1;i>=0;i--){ const w=empShards[i]; w.t+=dt; const k=Math.min(1,w.t/w.dur), r=lerp(w.r0,w.r1,1-Math.pow(1-k,2)); w.mesh.scale.setScalar(r); w.mesh.rotation.y+=dt*0.5; const u=w.m.uniforms; u.split.value=0.12+0.88*k; u.opacity.value=1-k*k; u.time.value=w.t;
    for(const e of (state==='fight'?enemies(w.owner):[])){ if(w.hit.has(e)||e.center().distanceTo(w.c)>r+0.4) continue; w.hit.add(e); applySlow(e,0.6,2.2+0.6*w.n); applyDamage(e,8*w.n,w.owner,{cause:'dome'}); burst(e.center(),0x46e0d0,14,5,0.1,0.5,0); SFX.zap(); }
    if(k>=1){ scene.remove(w.mesh); w.m.dispose(); empShards.splice(i,1); } }
}
function killFighter(f,source){
  if(f.dead||state!=='fight') return; if(NET.on&&NET.role==='guest'&&!NET.allowKill) return; f.dead=true; f.hp=0; f.blockActive=false; f.blockT=0; f.sawT=0; f.echoT=-1; f.echoCount=0; f.blinkPending=0; f.dazzleN=0; f.tetherV=null; f.burstQueue=0; f.mesh.visible=false; f.dome.visible=false; f.dome2.visible=false; f.domeRing.visible=false; f.sawRing.visible=false;
  const c=f.center(), tc=f.team;
  burst(c,tc.body,34,12,0.16,1.0,0.5); burst(c,0xffffff,16,8,0.1,0.6,0.2); flashAt(c,tc.light,11,0.4); SFX.ko();
  for(let i=0;i<26;i++){ const d=V3(rand(-1,1),rand(-0.2,1),rand(-1,1)).normalize(); spawnShard(c.clone(),d.multiplyScalar(rand(4,11)),i%2?tc.body:tc.light,rand(0.25,0.55),rand(0.6,1.1),0.7); }
  if(f.pos.y>-0.5){ shockRing(V3(f.pos.x,f.pos.y+0.08,f.pos.z),tc.light,5,0.6); shockRing(V3(f.pos.x,f.pos.y+0.1,f.pos.z),0xffffff,3,0.4); }
  if(remoteCtl.b&&(f===player||remoteCtl.b.owner===f)){ remoteCtl.b.remote=false; remoteCtl.b=null; }
  if(mode==='sandbox'){ f.respawnT=1.4; if(!f.isPlayer) toast('<b class="you">You</b> knocked out the <b class="bot">bot</b>','you'); return; }
  const by=(source&&source!==f)?source:null; if(by&&!by.dead) by.setMood('happy',3);
  if(matchKind==='battle'){ if(btHook) btHook.onKill(f,by); return; } // Battle: no rounds, you pick a card and come back
  if(matchKind!=='1v1'){ const alive=fighters.filter(x=>x.active!==false&&!x.dead); const sides=new Set(alive.map(x=>x.side)); ffaKnockout(f,by,sides.size); if(sides.size>1) return; endRoundWith(alive[0]||by); return; }
  endRoundWith(other(f));
}
function endRoundWith(winner){
  if(winner){ if(matchKind==='2v2'){ for(const f of fighters) if(f.side===winner.side){ f.score++; f.setMood('happy',5); } } else winner.score++; if(matchKind==='1v1') score[winner.isPlayer?'player':'bot']++; winner.setMood('happy',5); } lastWinner=winner;
  roundInfo.botHpFrac=bot.dead?0:clamp(bot.hp/bot.maxHp(),0,1);
  state='roundover'; roundOverT=CFG.roundOverTime; slowMoT=0.9; shakeT=Math.max(shakeT,0.4);
  onRoundEnd(winner);
}
