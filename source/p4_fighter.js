// ================= DOME SHADER (glassy guardian shield) =================
const DOME_VS='varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vP=position; vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }';
const DOME_FS=`uniform vec3 color; uniform vec3 cols[4]; uniform float ncol; uniform float split; uniform float opacity; uniform float time; uniform float fill; uniform float flash; uniform float hitAge; uniform vec3 hitDir; varying vec3 vN; varying vec3 vV; varying vec3 vP;
  float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float hexD(vec2 p){ p=abs(p); return max(dot(p,vec2(0.5,0.8660254)),p.x); }
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
    if(split>0.001){ float lim=0.46-0.2*split; float keep=1.0-smoothstep(lim-0.03,lim,d); float edge=smoothstep(lim-0.13,lim-0.03,d)*keep; al=opacity*keep*(0.42+edge*0.55+fr*0.2); c=mix(cc,vec3(1.0),edge*0.55); }
    gl_FragColor=vec4(c,clamp(al,0.0,1.0)); }`;
const domeGeo=new T.SphereGeometry(1,48,20,0,Math.PI*2,0,Math.PI/2);
function domeMat(color,fill){ return new T.ShaderMaterial({uniforms:{color:{value:new T.Color(color)},cols:{value:[new T.Color(color),new T.Color(color),new T.Color(color),new T.Color(color)]},ncol:{value:1},split:{value:0},opacity:{value:1},time:{value:0},fill:{value:fill},flash:{value:0},hitAge:{value:9},hitDir:{value:V3(0,1,0)}},vertexShader:DOME_VS,fragmentShader:DOME_FS,transparent:true,side:T.DoubleSide,depthWrite:false}); }
function setPal(mat,list){ const u=mat.uniforms, n=Math.min(4,list.length); for(let i=0;i<4;i++) u.cols.value[i].copy(list[i%n]); u.ncol.value=n; }
const SAW_PAL=[new T.Color(0xff6b6b)], AURA_PAL={chill:new T.Color(0x9fd8ff),staticf:new T.Color(0xffe066),drain:new T.Color(0xff6b9d)};
const ringGeo=new T.RingGeometry(0.9,1,56);
const discGeo=new T.CircleGeometry(1,48);
const AURA_COL={chill:0x9fd8ff,staticf:0xffe066,drain:0xff6b9d};

// ================= FIGHTER (round buddy) =================
class Fighter{
  constructor(name,isPlayer){
    this.name=name; this.isPlayer=isPlayer; this.team=isPlayer?TEAM.player:TEAM.bot; this.color=this.team.ink;
    this.pos=V3(); this.vel=V3(); this.yaw=0; this.pitch=0; this.onGround=false; this.wasGround=false;
    this.radius=0.5; this.height=2.05; this.bodyY=1.3; this.hitR=0.58;
    this.cards=[]; this.stats=computeStats([]);
    this.dashDir=V3(); this.auraSlow=0; this.walkT=0; this.squash=0; this.blinkT=rand(1,4); this.recoil=0; this.idleT=rand(0,5);
    this.domeHitDir=V3(0,1,0); this.domeHitAge=9; this.domePal=[new T.Color(this.team.light)];
    this.buildMesh(); this.resetRound();
  }
  buildMesh(){
    const tc=this.team;
    const root=new T.Group(); this.mesh=root; scene.add(root);
    const std=(c,r=0.45,m=0.3)=>new T.MeshStandardMaterial({color:col(c),roughness:r,metalness:m});
    const armour=std(tc.body,0.38,0.35), armour2=std(tc.dark,0.45,0.4), suit=std(0x151a2e,0.85,0.1), trim=basic({color:tc.light}), visorMat=std(0x070a16,0.12,0.85), white=std(0xe9eef8,0.5,0.2);
    this.armour=armour; this.armour2=armour2; this.body={material:armour};
    const add=(parent,geo,mat,x=0,y=0,z=0)=>{ const m=new T.Mesh(geo,mat); m.position.set(x,y,z); m.castShadow=true; parent.add(m); return m; };
    // ---- simple round buddy: big ball head with a headband, bean body, stubby limbs ----
    const HIP=0.78; this.hipY=HIP; this.L1=0.34; this.L2=0.34; this.gait=0;
    const soft=(c,r=0.6)=>new T.MeshStandardMaterial({color:c,roughness:r,metalness:0.02});
    armour.roughness=0.55; armour.metalness=0.04; armour2.roughness=0.6; armour2.metalness=0.04;
    const headMat=soft(col(tc.body).lerp(col(0xffffff),0.15),0.55), band=soft(col(tc.band),0.7), dark=basic({color:0x0b1026});
    this.headMat=headMat;
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
    const cuff=soft(col(tc.light),0.6), sole=soft(col(0xf2f5fb),0.7);
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
    const cMat=soft(col(tc.cannon),0.45);
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
  resetRound(){
    this.hp=this.stats.hp; this.ammo=this.stats.ammo; this.reloading=false; this.reloadT=0; this.fireCd=0;
    this.blockCdT=0; this.blockActive=false; this.blockT=0; this.dashCdT=0; this.dashT=0;
    this.slowT=0; this.slowAmt=0; this.stunT=0; this.poisons=[]; this.dead=false; this.vel.set(0,0,0);
    this.burstQueue=0; this.burstT=0; this.echoT=-1; this.echoCount=0; this.mood='normal'; this.moodT=0; this.hitFlash=0; this.auraSlow=0; this.squash=0;
    this.brawlT=0; this.tasteT=0; this.refreshCd=0; this.silenceT=0; this.invulnT=0; this.sawT=0; this.decayPool=0; this.decayAcc=0; this.dazzleN=0; this.dazzleT=0; this.thrusters=[]; this.phoenixUsed=0; this.chasing=false; this.domeHitAge=9; this.respawnT=0; this.coldT=0; this.blinkPending=0; this.chillIn=false; this.knockT=0; this.tpHide=0; this.tpPop=0;
    this.mesh.visible=true; this.dome.visible=false; this.dome2.visible=false; this.domeRing.visible=false; this.sawRing.visible=false;
  }
  center(){ return V3(this.pos.x,this.pos.y+this.bodyY,this.pos.z); }
  distTo(p){ const y=clamp(p.y,this.pos.y+0.4,this.pos.y+1.8); const dx=p.x-this.pos.x, dy=p.y-y, dz=p.z-this.pos.z; return Math.sqrt(dx*dx+dy*dy+dz*dz); }
  domeC(){ return V3(this.pos.x,this.pos.y+0.05,this.pos.z); }
  domeR(){ return this.stats.dome; }
  auraR(){ return this.silenceT>0?0:this.stats.auraR; }
  addCard(id){ this.cards.push(id); this.stats=computeStats(this.cards); this.hp=this.stats.hp; this.ammo=this.stats.ammo;
    const seen={}, pc=[]; for(const id of this.cards){ const c=CARDS[id]; if(c&&c.type==='dome'&&!seen[id]){ seen[id]=1; pc.push(new T.Color(c.c)); } } const team=new T.Color(this.team.light); this.domePal= pc.length===0?[team]: pc.length===1?[team,pc[0]]: pc.slice(0,4); }
  auraPal(){ const s=this.stats,l=[]; if(s.chill) l.push(AURA_PAL.chill); if(s.staticf) l.push(AURA_PAL.staticf); if(s.drain) l.push(AURA_PAL.drain); return l; }
  setCards(ids){ this.cards=[]; this.stats=computeStats([]); if(ids.length){ for(const id of ids.slice(0,-1)) this.cards.push(id); this.addCard(ids[ids.length-1]); } else { this.hp=this.stats.hp; this.ammo=this.stats.ammo; this.domePal=[new T.Color(this.team.light)]; } }
  maxHp(){ return Math.round(this.stats.hp*(1+(this.brawlT>0?2*this.stats.brawler:0))); }
  forward(){ return V3(-Math.sin(this.yaw),0,-Math.cos(this.yaw)); }
  aimDir(){ const cp=Math.cos(this.pitch); return V3(-Math.sin(this.yaw)*cp,Math.sin(this.pitch),-Math.cos(this.yaw)*cp); }
  muzzlePos(){ this.mesh.position.copy(this.pos); this.mesh.rotation.y=this.yaw; this.cannon.rotation.x=this.pitch; this.mesh.updateMatrixWorld(true); return this.muzzle.getWorldPosition(V3()); }
  speedFactor(){ const slow=Math.max(this.slowT>0?this.slowAmt:0,this.auraSlow); let k=(1-clamp(slow,0,0.8))*(this.stunT>0?0:1); if(this.tasteT>0) k*=1+0.5*this.stats.taste; if(this.chasing) k*=1+0.6*this.stats.chase; return k; }
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
    const big=this.brawlT>0?1.14:1; g.scale.setScalar(big*blinkScale(this,dt));
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
    const sawing=this.sawT>0&&!this.dead;
    if(this.blockActive||sawing){
      let sc=R, fade=1, flash=0;
      if(this.blockActive){ const el=CFG.blockDuration-this.blockT; const k=Math.min(1,el/0.09); const e=1-Math.pow(1-k,3); const settle=clamp((el-0.09)/0.16,0,1); sc=Math.max(0.01,R*(0.35+0.65*e)*(1.12-0.12*settle)); fade=sawing?1:Math.min(1,this.blockT/0.12); flash=Math.max(0,1-el/0.2); }
      const u=this.domeMat.uniforms; this.dome.visible=true; this.dome.position.copy(dc); this.dome.scale.setScalar(sc); this.dome.rotation.y=sawing? t*9 : t*0.25; u.opacity.value=fade; u.time.value=t; u.flash.value=flash; u.hitAge.value=this.domeHitAge; u.hitDir.value.copy(this.domeHitDir).applyAxisAngle(UP,-this.dome.rotation.y); setPal(this.domeMat,sawing?SAW_PAL:this.domePal);
      const u2=this.domeMat2.uniforms; this.dome2.visible=true; this.dome2.position.copy(dc); this.dome2.scale.setScalar(sc*0.93); this.dome2.rotation.y=-t*0.6; u2.opacity.value=fade*0.55; u2.time.value=t*0.7+3; u2.flash.value=flash*0.5; u2.hitAge.value=9;
      this.domeRing.visible=true; this.domeRing.position.set(dc.x,dc.y+0.03,dc.z); this.domeRing.scale.setScalar(sc*1.02); this.domeRing.material.opacity=0.9*fade;
      this.sawRing.visible=sawing; if(sawing){ this.sawRing.position.set(dc.x,dc.y+0.05,dc.z); this.sawRing.scale.set(R,1+R*0.4,R); this.sawRing.rotation.y=-t*10; }
    } else { this.dome.visible=false; this.dome2.visible=false; this.domeRing.visible=false; this.sawRing.visible=false; }
    const aR=this.auraR(), ac=aR>0? this.auraColor(t):null;
    if(ac && !this.dead){ const pulse=1+Math.sin(t*2.2)*0.018; this.aura.visible=true; this.aura.position.copy(dc); this.aura.scale.setScalar(aR*pulse); this.auraMat.uniforms.time.value=t*0.35; this.auraMat.uniforms.opacity.value=0.42; setPal(this.auraMat,this.auraPal()); this.auraRing.visible=true; this.auraRing.position.set(dc.x,dc.y+0.02,dc.z); this.auraRing.scale.setScalar(aR*pulse); this.auraRing.rotation.z=t*0.35; this.auraRing.material.color.copy(ac).convertSRGBToLinear(); }
    else { this.aura.visible=false; this.auraRing.visible=false; }
    const gY=groundAt(this.pos.x,this.pos.z,this.pos.y+50,0.3); const vis=gY!==null && !this.dead;
    this.shadow.visible=vis; this.marker.visible=vis&&this.mesh.visible;
    if(vis){ this.shadow.position.set(this.pos.x,gY+0.015,this.pos.z); const h=clamp(this.pos.y-gY,0,6); this.shadow.scale.setScalar(1.05-h*0.1); this.shadow.material.opacity=0.38-h*0.045; this.marker.position.set(this.pos.x,gY+0.02,this.pos.z); this.marker.rotation.z=t*1.5; }
    const slowed=(this.slowT>0||this.auraSlow>0)&&!this.dead; const sil=this.silenceT>0; this.statusRing.visible=(slowed||this.stunT>0||sil)&&!this.dead; this.statusRing.position.set(this.pos.x,this.pos.y+0.08,this.pos.z); this.statusRing.material.color.copy(col(this.stunT>0?0xffe14d:(sil?0x9aa7c7:0x9be7ff))); this.statusRing.rotation.z+=dt*3; this.statusRing.scale.setScalar(1+Math.sin(t*8)*0.05);
  }
}
