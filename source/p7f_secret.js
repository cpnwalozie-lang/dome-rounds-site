// ================= THE SECRET: shoot the centre piece on Skyfort or the Neon maps =================
// Hit the floating crystal (Skyfort) or the wireframe orb (Neon City, Neon Crossroads) and you get a stack of blaster
// cards (not in Neon City 1v1 or 2v2). It can only be found once per match: after that, shooting it does nothing at all. While you hold it you can't
// pick cards; get knocked out and you lose it, your own cards come back, and picking works as normal again.
// (In the training sandbox you can take it as often as you like.)
// Online, whoever runs the match (the host) decides who gets it, so two people can't both win it.
const SECRET_CARDS=['barrage','bigbullets','buckshot','burst','spray','combine','carefulplanning','windup','fastball','quickshot','steadyshot','quickreload',
  'scavenger','poison','parasite','explosive','timeddetonation','coldbullets','dazzle','grow','thruster','arcshot','demonicpact'];
const SEC={ on:false, saved:null, had:false, claim:0, holder:'', used:new Set(), since:0, gotAt:0, wp:V3(), halo:null, glow:null, hf:null, told:0 };
var SEC_READY=true;
const secKey=()=>NET.on?myPeerId():'me';
function secRef(){ if(!NET.on) return true; if(matchKind==='battle') return btHost(); return NET.role==='host'; }
// Neon City has no secret in 1v1 or 2v2 (it stays in free-for-all, Neon Crossroads, Skyfort and the training sandbox)
function secOff(){ return curMapId==='neon'&&mode!=='sandbox'&&(matchKind==='1v1'||matchKind==='2v2'); }
function secObj(){ if(secOff()) return null; return curMap&&curMap.secret||null; }
function secLive(){ return !!secObj()&&state==='fight'&&!(tutHook&&tutHook.on())&&!(matchKind==='battle'&&BT.ph==='over'); }
function secName(k){ if(k===secKey()) return 'You'; const f=fighters.find(x=>x.peer===k); return f?f.name:'Someone'; }
function secFighter(k){ if(!k) return null; if(k===secKey()) return player; return fighters.find(x=>x.peer===k)||null; }

// your bullet touched the centre piece (checked from your own screen, like every other hit)
// once it's been found this match (or someone has it, or you've just asked for it) your bullets fly straight through
function secAvail(){ return !SEC.on&&!SEC.claim&&!SEC.holder&&(mode==='sandbox'||SEC.used.size===0); }
function secretTouch(pos,r){ if(!SEC_READY) return false; const S=secObj(); if(!S||!secLive()||!secAvail()) return false; return pos.distanceTo(SEC.wp)<S.r+r; }
function secretShot(){ if(!secAvail()) return; flashAt(SEC.wp.clone(),0xffd23d,7,0.3); burst(SEC.wp.clone(),0xffd23d,14,6,0.1,0.5,0.2);
  if(secRef()){ secGrant(secKey()); return; }
  SEC.claim=performance.now(); } // ask the host; it answers in the match state it sends out

// ---- the referee side (offline: you; online: the host) ----
function secGrant(k){ SEC.holder=k; SEC.since=performance.now(); if(!(mode==='sandbox')) SEC.used.add(k); secAnnounce(k); if(k===secKey()) secTake(); }
function secRelease(){ SEC.holder=''; }
function secretSeen(k,sx){ if(!SEC_READY||!secRef()||!secObj()) return; const now=performance.now();
  if(sx===1&&!SEC.holder&&SEC.used.size===0&&secLive()){ const f=secFighter(k); if(f&&!f.dead) secGrant(k); }
  else if(SEC.holder===k&&sx!==2&&now-SEC.since>2500) secRelease(); }
function secretState(){ if(!SEC_READY) return null; return { h:SEC.holder, u:[...SEC.used].slice(0,12) }; }
function secretMine(){ if(!SEC_READY) return 0; return SEC.on?2:SEC.claim?1:0; }

// ---- everyone: follow what the host says ----
function secretApply(sx){ if(!SEC_READY||!sx||typeof sx!=='object') return; const me=secKey(), h=typeof sx.h==='string'?sx.h.slice(0,64):'';
  if(Array.isArray(sx.u)){ SEC.used=new Set(sx.u.filter(x=>typeof x==='string').slice(0,12)); if(SEC.used.size&&!h&&SEC.claim) SEC.claim=0; }
  if(h!==SEC.holder){ const was=SEC.holder; SEC.holder=h; if(h&&h!==me) secAnnounce(h); if(SEC.claim&&h&&h!==me) SEC.claim=0; if(was===me&&SEC.on&&performance.now()-SEC.gotAt>3000) secDrop(); }
  if(h===me&&!SEC.on&&!SEC.had&&!player.dead&&state==='fight') secTake(); }
function secAnnounce(k){ if(k===secKey()) return; toast(`<b>${esc(secName(k))}</b> found the secret!`,'status'); SFX.coin(); }

// ---- you got it / you lost it ----
function secTake(){ if(SEC.on) return; SEC.on=true; SEC.had=true; SEC.claim=0; SEC.gotAt=performance.now(); SEC.saved=player.cards.slice();
  const frac=player.hp/Math.max(1,player.maxHp()); player.setCards(SECRET_CARDS); player.hp=Math.max(1,Math.round(player.maxHp()*frac)); player.ammo=player.stats.ammo; player.reloading=false;
  updateCardStrips(); updateHUD(); showBanner('SECRET FOUND!','#ffd23d'); SFX.levelup(); setTimeout(()=>SFX.coin(),180);
  burst(player.center().add(V3(0,1,0)),0xffd23d,40,9,0.14,0.9,0.6); shockRing(V3(player.pos.x,player.pos.y+0.1,player.pos.z),0xffd23d,6,0.5);
  player.blockActive=false; player.blockT=0;
  toast(`<b class="you">You</b> got ${SECRET_CARDS.length} blaster cards! No dome and no picks until you're knocked out`,'you'); }
function secDrop(){ if(!SEC.on) return; SEC.on=false; const dead=player.dead; player.setCards(SEC.saved||[]); SEC.saved=null; if(dead) player.hp=0; else player.hp=Math.min(player.hp,player.maxHp());
  if(secRef()&&SEC.holder===secKey()) secRelease(); updateCardStrips(); }
function secretDied(){ if(!SEC_READY) return; if(SEC.on){ secDrop(); toast('<b class="you">You</b> lost the secret','you'); } }
function secretReset(){ if(!SEC_READY) return; UI.draft.classList.remove('secDraft'); if(SEC.on) secDrop(); SEC.had=false; SEC.claim=0; SEC.holder=''; SEC.used=new Set(); SEC.since=0; }

// ---- no picks while you hold it ----
function secretDraft(){ if(!SEC_READY||!SEC.on||state!=='draft') return; // no cards to look at, just a short wait
  UI.draft.classList.add('secDraft'); UI.cards.innerHTML=''; UI.draftTitle.textContent='YOU HOLD THE SECRET';
  state='picked'; draftT=1e9; if(NET.on){ netAfterPick(); UI.draftSub.textContent='No pick for you this round. Waiting for the others to pick…'; return; }
  UI.draftSub.textContent='No pick for you this round. Next round coming up…';
  setTimeout(()=>{ if(state!=='picked') return; show(UI.draft,false); requestLock(); beginRound(); },1800); }
// no dome while you hold the secret
function secretNoDome(quiet){ if(!SEC_READY||!SEC.on) return false; const now=performance.now(); if(!quiet&&now-SEC.told>1500){ SEC.told=now; floatText(player.center().add(V3(0,1.3,0)),'NO DOME','status'); } return true; }
function secretBlocksCards(){ if(!SEC_READY||!SEC.on) return false; toast("You can't change cards while you hold the secret",'status'); return true; }

// ---- every frame ----
function secretTick(dt){ if(!SEC_READY) return; const S=secObj(), now=performance.now();
  if(S) S.obj.getWorldPosition(SEC.wp);
  if(SEC.on&&player.dead) secDrop();
  if(SEC.claim&&now-SEC.claim>3000) SEC.claim=0;
  if(secRef()&&SEC.holder&&SEC.holder!==secKey()){ const f=secFighter(SEC.holder); if(!f||(f.dead&&now-SEC.since>1200)) secRelease(); }
  if(!S&&SEC.on) secDrop();
  // a gold halo over whoever has it, so everyone knows who to chase
  const hf=secFighter(SEC.holder), show2=!!(hf&&!hf.dead&&hf.mesh.visible&&state!=='menu');
  if(!SEC.halo){ SEC.halo=new T.Mesh(new T.TorusGeometry(0.5,0.07,8,28),new T.MeshBasicMaterial({color:col(0xffd23d)})); SEC.halo.rotation.x=Math.PI/2; SEC.glow=sprite(0xffd23d,2.2,0.45); scene.add(SEC.halo); scene.add(SEC.glow); }
  SEC.halo.visible=SEC.glow.visible=show2;
  if(show2){ const top=hf.center().y+1.0*(hf.mesh.scale.y||1); SEC.halo.position.set(hf.pos.x,top+Math.sin(gameT*3)*0.05,hf.pos.z); SEC.halo.rotation.z+=dt*2; SEC.glow.position.copy(SEC.halo.position); SEC.glow.material.opacity=0.4+Math.sin(gameT*4)*0.15; } }
/*DEBUG-START*/window.__sec={SEC,SECRET_CARDS,where:()=>[curMapId,matchKind,mode],secretShot,secTake,secDrop,secretReset,secObj,secKey,wp:()=>SEC.wp.toArray(), shoot:()=>{ const o=player.center(); spawnBullet(player,o,V3().subVectors(SEC.wp,o).normalize()); }, kill:f=>{ NET.allowKill=true; try{ killFighter(f||player,null); } finally{ NET.allowKill=false; } }, draft:()=>startDraft(), openSbx:()=>openSandbox(), fire:()=>{ player.fireCd=0; player.ammo=Math.max(1,player.ammo); player.reloading=false; const n0=bullets.length; tryFire(player,true); return bullets.length-n0; }, nb:()=>bullets.length};/*DEBUG-END*/
