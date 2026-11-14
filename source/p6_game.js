// ================= WORLD + FIGHTERS =================
const BASE_POS={player:V3(), bot:V3()};
function applyMap(id){ setMap(id); bakeLoad(id); bakeUse(id); detailApply(curMap.group); bakeHook(scene); const sx=curMap.spawnX*curMap.scale; BASE_POS.player.set(-sx,1,0); BASE_POS.bot.set(sx,1,0); }
applyQuality(settings.quality==='auto'?'high':settings.quality);
applyMap(settings.map);
const player=new Fighter('YOU',true), bot=new Fighter('BOT',false);
const other=f=>f===player?bot:player;

// ================= STATE =================
let state='menu'; // menu, countdown, fight, roundover, draft, picked, matchover
let mode='match'; // match | sandbox
const sandbox={cards:[],bot:'dummy',open:false};
let paused=false, roundOverT=0, slowMoT=0, countdownT=0, countdownStep=0, roundNum=1, lastWinner=null, matchOverPending=false;
const score={player:0,bot:0};
let camHold=false, botHold=false, killMarkT=0, shakeT=0, hitMarkerT=0, hurtT=0, crossKick=0, gameT=0, dmgDirT=0, tipsT=0; const aimPoint=V3(), dmgFrom=V3();
const botLevel=()=> mode==='sandbox' ? (DIFF[sandbox.bot]||DIFF.easy) : (DIFF[settings.diff]||DIFF.easy);

// ================= DOM =================
const UI={}; ['roundClock','draftClock','loading','hud','pipsYou','pipsBot','roundPill','roundSub','hpBot','hpBotT','cardsBot','youFace','botFace','hpYou','hpYouGhost','hpYouT','statusYou','ammo','cardsYou','blockCd','dashCd','crosshair','reloadRing','hitmark','vignette','hurt','toasts','botTag','botTagFill','banner','bannerSplat','bannerText','countdown','cdSplat','cdText','start','startBtn','sandboxBtn','pause','resumeBtn','quitBtn','pauseStats','pauseCards','draft','draftTitle','draftSub','cards','coach','statbar','steer','tips','dmgdir','botPanel','matchover','moTitle','moSub','moStats','moCards','againBtn','menuBtn','logoSplat','howBtn','how','fsBtn','sandbox','sbxCards','sbxGo','sbxClear','sbxQuit','sbxBuild'].forEach(k=>UI[k]=$(k));
function domBurst(seed,color,o={}){ const rng=RNG(seed), N=o.n||13, sx=o.sx||1; let d=''; for(let i=0;i<N*2;i++){ const a=i/(N*2)*Math.PI*2-0.3; const rr=(i%2? 92+rng()*10 : 124+rng()*22); d+=(i?'L':'M')+(Math.cos(a)*rr*sx).toFixed(1)+' '+(Math.sin(a)*rr).toFixed(1)+' '; }
  const w=160*sx; return `<svg viewBox="${-w} -160 ${2*w} 320" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"><path d="${d}Z" fill="${color}" stroke="#0b1026" stroke-width="8" stroke-linejoin="round"/></svg>`; }
UI.logoSplat.innerHTML=domBurst(4,'#2460e6',{sx:1.9,n:17});
UI.youFace.innerHTML=ART.face('C',''); UI.botFace.innerHTML=ART.face('E','angry');
function buildPips(){ for(const [el,team,n] of [[UI.pipsYou,'C',score.player],[UI.pipsBot,'E',score.bot]]){ let h=''; for(let i=0;i<CFG.winsToTakeMatch;i++){ const k=team==='C'? CFG.winsToTakeMatch-1-i : i; h+=`<div class="pip ${k<n?'on':''} ${team==='C'?'you':'bot'}">${k<n?ART.face(team,k===n-1?'happy':''):''}</div>`; } el.innerHTML=h; } }
function showBanner(text,color,cls){ UI.bannerSplat.innerHTML=domBurst(Math.floor(Math.random()*999),color,{sx:Math.max(1.6,text.length*0.21),n:17}); UI.bannerText.textContent=text; UI.banner.className='banner show '+(cls||''); clearTimeout(UI.banner._t); UI.banner._t=setTimeout(()=>{ UI.banner.className='banner'; },1900); }
function toast(html,cls){ const d=document.createElement('div'); d.className='toast '+(cls||''); d.innerHTML=html; UI.toasts.appendChild(d); while(UI.toasts.children.length>4) UI.toasts.firstChild.remove(); setTimeout(()=>{ d.classList.add('out'); setTimeout(()=>d.remove(),400); },3200); }
function show(el,on,disp){ el.style.display=on?(disp||'flex'):'none'; }

// ---- settings UI (shared between start + pause + sandbox) ----
function syncSettingsUI(){ document.querySelectorAll('[data-k]').forEach(el=>{ const k=el.dataset.k; if(el.type==='checkbox') el.checked=!!settings[k]; else el.value=String(settings[k]); });
  document.querySelectorAll('.k-shoot').forEach(e=>e.textContent=settings.swap?'RMB':'LMB'); document.querySelectorAll('.k-block').forEach(e=>e.textContent=settings.swap?'LMB':'RMB');
  document.querySelectorAll('[data-seg]').forEach(seg=>{ const k=seg.dataset.seg; const v=k==='sbot'?sandbox.bot:settings[k]; seg.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.v===v)); }); }
document.querySelectorAll('[data-k]').forEach(el=>{ el.addEventListener(el.tagName==='SELECT'?'change':'input',()=>{ const k=el.dataset.k; settings[k]= el.type==='checkbox'? el.checked : (el.tagName==='SELECT'? el.value : parseFloat(el.value)); if(k==='vol') SFX.setVol(settings.vol); if(k==='music') SFX.setMusicVol(settings.music); if(k==='quality'){ perfLevel=0; applyQuality(settings.quality==='auto'?'high':settings.quality); } saveSettings(); syncSettingsUI(); }); });
document.querySelectorAll('[data-seg] button').forEach(b=>{ b.addEventListener('click',()=>{ const k=b.parentElement.dataset.seg, v=b.dataset.v; SFX.unlock(); SFX.hover();
  if(k==='sbot'){ sandbox.bot=v; } else { settings[k]=v; saveSettings(); if(k==='map'&&(state==='menu'||sandbox.open)){ applyMap(v); if(state==='menu'){ placeAtBases(); } else sandbox.remap=true; } }
  syncSettingsUI(); }); });
syncSettingsUI();
UI.howBtn.addEventListener('click',()=>{ UI.how.classList.toggle('open'); });
UI.fsBtn.addEventListener('click',()=>{ try{ if(document.fullscreenElement) document.exitFullscreen(); else { const p=document.documentElement.requestFullscreen(); if(p&&p.catch) p.catch(()=>{}); } }catch(e){} });
const firstGesture=()=>{ SFX.unlock(); if(state==='menu') SFX.music('menu'); window.removeEventListener('pointerdown',firstGesture); window.removeEventListener('keydown',firstGesture); };
window.addEventListener('pointerdown',firstGesture); window.addEventListener('keydown',firstGesture);

// ================= INPUT =================
const keys={}; let fireHeld=false,firePressed=false,steerLatch=false,blockBuf=0,blockFresh=false,wantDash=false,jumpBuffer=0; let locked=false, mouseFallback=false, mouseX=0.5;
const shootBtn=()=>settings.swap?2:0, blockBtn=()=>settings.swap?0:2;
const pressBlock=()=>{ blockBuf=0.5; blockFresh=true; lastBlockPress=performance.now(); };
function look(dx,dy){ const tgt=remoteCtl.b?remoteCtl:player; tgt.yaw-=dx; tgt.pitch=clamp(tgt.pitch-(settings.invertY?-1:1)*dy,remoteCtl.b?-1.35:-1.15,remoteCtl.b?1.35:1.1); }
window.addEventListener('keydown',e=>{ if(e.code==='Space'||e.code==='Tab'||e.code.startsWith('Arrow')) e.preventDefault(); if(e.repeat) return; keys[e.code]=true;
  if(e.code==='Space') jumpBuffer=0.15; if(e.code==='ShiftLeft'||e.code==='ShiftRight') wantDash=true;
  if(e.code==='KeyE'||e.code==='KeyQ') pressBlock(); if(e.code==='KeyF'){ firePressed=true; steerLatch=false; }
  if(state==='draft'&&['Digit1','Digit2','Digit3'].includes(e.code)){ const c=UI.cards.children[parseInt(e.code.slice(5))-1]; if(c) c.click(); }
  if(e.code==='Tab'&&mode==='sandbox'&&state==='fight'){ if(sandbox.open) closeSandbox(); else openSandbox(); return; }
  if((e.code==='Escape'||e.code==='KeyP')&&(state==='fight'||state==='countdown')&&!sandbox.open){ if(e.code==='KeyP'||mouseFallback||paused) togglePause(); } });
window.addEventListener('keyup',e=>{ keys[e.code]=false; });
window.addEventListener('blur',()=>{ for(const k in keys) keys[k]=false; fireHeld=false; });
window.addEventListener('mousedown',e=>{ if(e.target!==canvas){ if(!(state==='fight'||state==='countdown')||paused) return; if(e.target.closest&&e.target.closest('.overlay,button,select,input,a')) return; } e.preventDefault(); if(e.button===shootBtn()){ fireHeld=true; firePressed=true; steerLatch=false; } if(e.button===blockBtn()) pressBlock(); pad.used=false; SFX.unlock(); if(!locked&&!paused&&(state==='fight'||state==='countdown')) requestLock(); });
window.addEventListener('mouseup',e=>{ if(e.button===shootBtn()) fireHeld=false; });
let lastBtns=0, lastBlockPress=0;
window.addEventListener('mousedown',e=>{ lastBtns=e.buttons|0; },true); window.addEventListener('mouseup',e=>{ lastBtns=e.buttons|0; },true);
window.addEventListener('contextmenu',e=>{ e.preventDefault(); if(blockBtn()===2&&performance.now()-lastBlockPress>250&&state==='fight'&&!paused){ pressBlock(); } });
document.addEventListener('mousemove',e=>{ mouseX=e.clientX/window.innerWidth; { const bm=e.buttons|0, bit=blockBtn()===2?2:1; if((bm&bit)&&!(lastBtns&bit)&&performance.now()-lastBlockPress>250&&(locked||mouseFallback)&&state==='fight'&&!paused) pressBlock(); lastBtns=bm; } if(locked||(mouseFallback&&!paused&&(state==='fight'||state==='countdown'))){ const s=0.0022*settings.sens; look(e.movementX*s,e.movementY*s); } });
function requestLock(){ if(locked||pad.used) return; try{ const p=canvas.requestPointerLock(); if(p&&p.catch) p.catch(()=>{ mouseFallback=true; }); }catch(err){ mouseFallback=true; } }
document.addEventListener('pointerlockchange',()=>{ locked=document.pointerLockElement===canvas; if(locked) mouseFallback=false; document.body.classList.toggle('nolock',!locked&&mouseFallback); if(!locked&&(state==='fight'||state==='countdown')&&!paused&&!pad.used) pause(); });
document.addEventListener('pointerlockerror',()=>{ mouseFallback=true; document.body.classList.add('nolock'); });
document.addEventListener('mouseleave',()=>{ mouseX=0.5; }); window.addEventListener('blur',()=>{ mouseX=0.5; });
document.addEventListener('visibilitychange',()=>{ if(document.hidden&&(state==='fight'||state==='countdown')&&!paused) pause(); });
function exitLock(){ try{ if(document.pointerLockElement) document.exitPointerLock(); }catch(e){} }

// ---- controller ----
const pad={prev:[],used:false,lx:0,ly:0,fire:false,navT:0,focus:0};
function pollPad(dt){
  let gp=null; try{ const gps=navigator.getGamepads?navigator.getGamepads():[]; for(const g of gps){ if(g&&g.connected&&g.mapping==='standard'&&g.buttons.length>=10){ gp=g; break; } } }catch(e){}
  if(!gp){ pad.lx=pad.ly=0; pad.fire=false; return; }
  const b=gp.buttons.map(x=>x.pressed||x.value>0.5); const just=i=>b[i]&&!pad.prev[i]; const dz=v=>Math.abs(v)<0.3?0:(v-Math.sign(v)*0.3)/0.7;
  const lx=dz(gp.axes[0]||0), ly=dz(gp.axes[1]||0), rx=dz(gp.axes[2]||0), ry=dz(gp.axes[3]||0);
  if(b.some(x=>x)){ if(!pad.used){ pad.used=true; SFX.unlock(); } }
  pad.lx=0; pad.ly=0; pad.fire=false;
  if(!pad.used){ pad.prev=b; return; }
  if(sandbox.open){ if(just(0)||just(9)) UI.sbxGo.click(); }
  else if(paused){ if(just(0)||just(9)) resume(); }
  else if(state==='menu'){ if(just(0)||just(9)){ SFX.unlock(); startMatch(); } if(just(3)) openSandbox(); }
  else if(state==='matchover'){ if(just(0)||just(9)) startMatch(); }
  else if(state==='draft'){ const n=UI.cards.children.length; pad.navT-=dt; const dir=(b[15]||lx>0.5?1:0)-(b[14]||lx<-0.5?1:0); if(dir&&pad.navT<=0){ pad.focus=(pad.focus+dir+n)%n; pad.navT=0.25; SFX.hover(); } if(!dir) pad.navT=0; for(let i=0;i<n;i++){ const c=UI.cards.children[i]; c.classList.toggle('focus',i===pad.focus); } if(n&&UI.cards.children[pad.focus]._hover) UI.cards.children[pad.focus]._hover(); if(just(0)&&n) UI.cards.children[pad.focus].click(); }
  else if(state==='fight'||state==='countdown'){ pad.lx=lx; pad.ly=ly; look(rx*3.1*dt*settings.sens, ry*2.1*dt*settings.sens); pad.fire=b[7]; if(just(7)){ firePressed=true; steerLatch=false; } if(just(6)||just(4)) pressBlock(); if(just(0)) jumpBuffer=0.15; if(just(1)||just(2)||just(5)) wantDash=true; if(just(9)) pause(); if(just(8)&&mode==='sandbox') openSandbox(); }
  pad.prev=b;
}

// ================= FLOW =================
function placeAtBases(){
  const sw=NET.on&&NET.role==='guest'; // the guest spawns at the far base so both screens agree on the world
  player.pos.copy(sw?BASE_POS.bot:BASE_POS.player); player.vel.set(0,0,0); player.yaw=sw?Math.PI/2:-Math.PI/2; player.pitch=0; player.onGround=true;
  bot.pos.copy(sw?BASE_POS.player:BASE_POS.bot); bot.vel.set(0,0,0); bot.yaw=sw?-Math.PI/2:Math.PI/2; bot.pitch=0; bot.onGround=true; if(NET.on) NET.rs=null;
}
function clearProjectiles(){ for(let i=bullets.length-1;i>=0;i--) removeBullet(i); for(const b of bombs) scene.remove(b.m); bombs.length=0; for(const e of explosions){ scene.remove(e.m); scene.remove(e.m2); } explosions.length=0; clearFields(); clearCardFx(); remoteCtl.b=null; }
function resetInputs(){ fireHeld=false; firePressed=false; blockBuf=0; wantDash=false; jumpBuffer=0; }
function beginRound(){ bakeHook(scene);
  clearProjectiles(); player.resetRound(); bot.resetRound(); placeAtBases(); botState.reset(); resetInputs();
  roundInfo.shots=0; roundInfo.hits=0; roundInfo.dmg=0; roundInfo.botBlocked=0; roundInfo.t=0; roundInfo.cause=''; roundInfo.botHpFrac=1;
  clockTick=-1; state='countdown'; countdownT=3.2; countdownStep=-1; show(UI.hud,true,'block'); UI.hud.classList.remove('sandboxmode'); hurtT=0; dmgDirT=0; if(roundNum===1) tipsT=9; buildPips(); updateHUD(); updateCardStrips(); SFX.music('fight');
}
function startMatch(){
  mode='match'; sandbox.open=false; show(UI.sandbox,false); { const mp=(NET.on&&NET.role==='guest'&&NET.hostMap)?NET.hostMap:settings.map; if(curMapId!==mp) applyMap(mp); } document.getElementById('online').classList.remove('open');
  score.player=0; score.bot=0; roundNum=1; player.setCards([]); bot.setCards([]); matchOverPending=false; lastWinner=null;
  for(const k in matchStats) matchStats[k]=0;
  UI.roundSub.textContent= NET.on? 'ONLINE · FIRST TO 5 · ROOM '+NET.code : 'FIRST TO 5 · '+botLevel().name.toUpperCase()+' BOT';
  show(UI.matchover,false); show(UI.start,false); show(UI.draft,false); paused=false; show(UI.pause,false); beginRound();
}
function toMenu(){ if(NET.on) netLeave(); paused=false; sandbox.open=false; mode='match'; show(UI.sandbox,false); show(UI.pause,false); show(UI.hud,false); show(UI.countdown,false); show(UI.draft,false); show(UI.matchover,false); clearProjectiles(); player.setCards([]); bot.setCards([]); player.resetRound(); bot.resetRound(); if(curMapId!==settings.map) applyMap(settings.map); placeAtBases(); state='menu'; show(UI.start,true,'block'); exitLock(); SFX.music('menu'); }
const ROUND_LIMIT=300, DRAFT_LIMIT=60; let draftT=0, draftTick=-1, clockTick=-1;
function timeUp(){ const pf=player.hp/player.maxHp(), bf=bot.hp/bot.maxHp(); const loser= pf<bf?player:(bf<pf?bot:(Math.random()<0.5?player:bot)); toast(`<b>TIME!</b> Most health left takes the round`,'status'); if(loser===player) roundInfo.cause='time'; killFighter(loser,other(loser)); }
const CAUSE={time:'Time ran out and the bot had more health left.',fall:'You fell off the edge.',shot:'The bot\'s shot finished you.',blast:'You were caught in an explosion.',bomb:'A bomb got you.',aura:'The bot\'s aura drained you.',dome:'The bot\'s dome effect got you.',poison:'Poison finished you.',cloud:'A toxic cloud finished you.',nova:'The supernova got you.'};
function onRoundEnd(winner){
  const youWon=winner.isPlayer;
  if(youWon){ showBanner('ROUND WON!','#27c46b','win'); SFX.win(); } else { showBanner('KNOCKED OUT!','#e0364f','lose'); SFX.lose(); }
  const foe=NET.on?'Rival':'Bot'; toast(youWon? `<b class="you">You</b> knocked out <b class="bot">${foe}</b>` : (CAUSE[roundInfo.cause]||'The bot knocked you out.').replace(/bot/g,NET.on?'rival':'bot'), youWon?'you':'bot');
  if(score.player>=CFG.winsToTakeMatch||score.bot>=CFG.winsToTakeMatch) matchOverPending=true;
  buildPips(); updateHUD();
}
function pause(){ if(paused) return; paused=!NET.on; exitLock(); fillStats(UI.pauseStats,UI.pauseCards); show(UI.pause,true,'block'); }
function resume(){ if(sandbox.open) return; paused=false; show(UI.pause,false); requestLock(); last=performance.now(); }
function togglePause(){ if(paused) resume(); else pause(); }
UI.resumeBtn.addEventListener('click',()=>resume());
UI.quitBtn.addEventListener('click',()=>toMenu());
UI.menuBtn.addEventListener('click',()=>toMenu());
UI.startBtn.addEventListener('click',()=>{ SFX.unlock(); if(NET.on) netLeave(); requestLock(); startMatch(); });
UI.againBtn.addEventListener('click',()=>{ SFX.unlock(); if(NET.on){ if(NET.role==='host'){ requestLock(); netHostStart(); } else toast('Waiting for the room host to start the rematch…','status'); return; } requestLock(); startMatch(); });
function fillStats(statsEl,cardsEl){
  const acc=matchStats.shots? Math.round(matchStats.hits/matchStats.shots*100):0;
  statsEl.innerHTML=[['Score',mode==='sandbox'?'–':score.player+' – '+score.bot],['Damage dealt',Math.round(matchStats.dmg)],['Damage taken',Math.round(matchStats.taken)],['Accuracy',acc+'%'],['Shots blocked',matchStats.blocked],['Cards',player.cards.length]].map(s=>`<div class="stat"><b>${s[1]}</b><span>${s[0]}</span></div>`).join('');
  cardsEl.innerHTML=stripHTML(player)||'<span class="none">No cards yet.</span>';
}

// ================= TRAINING SANDBOX =================
function renderSandbox(){
  const counts={}; for(const id of sandbox.cards) counts[id]=(counts[id]||0)+1;
  let h=''; for(const type of ['gun','dome','aura','body']){ h+=`<div class="sbxg"><h4>${TYPE_LABEL[type]}</h4><div class="chips">`; for(const id of ALL_CARDS){ const c=CARDS[id]; if(c.type!==type) continue; h+=`<button class="chip ${counts[id]?'on':''}" data-id="${id}" style="--c:${c.c}" title="${c.tag}">${c.name}${counts[id]?`<b>×${counts[id]}</b>`:''}</button>`; } h+='</div></div>'; }
  UI.sbxCards.innerHTML=h;
  const s=computeStats(sandbox.cards); UI.sbxBuild.innerHTML=`<b>${sandbox.cards.length}</b> card${sandbox.cards.length===1?'':'s'} · HP ${s.hp} · DMG ${Math.round(s.dmg)} · ${s.pellets*(1+s.burst)} bullet${s.pellets*(1+s.burst)===1?'':'s'} · reload ${s.reload.toFixed(1)}s · block every ${s.blockCd.toFixed(1)}s · dome ${s.dome.toFixed(1)}m`;
}
UI.sbxCards.addEventListener('click',e=>{ const b=e.target.closest('.chip'); if(!b) return; if(e.shiftKey){ const i=sandbox.cards.lastIndexOf(b.dataset.id); if(i>=0) sandbox.cards.splice(i,1); } else if(sandbox.cards.filter(c=>c===b.dataset.id).length<5) sandbox.cards.push(b.dataset.id); SFX.hover(); renderSandbox(); });
UI.sbxCards.addEventListener('contextmenu',e=>{ const b=e.target.closest('.chip'); if(!b) return; e.preventDefault(); const i=sandbox.cards.lastIndexOf(b.dataset.id); if(i>=0) sandbox.cards.splice(i,1); renderSandbox(); });
UI.sbxClear.addEventListener('click',()=>{ sandbox.cards=[]; renderSandbox(); });
UI.sbxQuit.addEventListener('click',()=>toMenu());
UI.sandboxBtn.addEventListener('click',()=>{ SFX.unlock(); if(NET.on) netLeave(); openSandbox(); });
UI.sbxGo.addEventListener('click',()=>{ SFX.unlock(); if(mode==='sandbox'&&state==='fight'&&!sandbox.remap) closeSandbox(); else startSandbox(); });
function openSandbox(){ sandbox.open=true; if(state==='fight') paused=true; exitLock(); show(UI.pause,false); show(UI.start,false); renderSandbox(); syncSettingsUI(); UI.sbxGo.textContent=(mode==='sandbox'&&state==='fight')?'BACK TO TRAINING':'START TRAINING'; show(UI.sandbox,true,'block'); }
function sandboxBotSpot(){ const sx=BASE_POS.player.x+9; const g=groundAt(sx,0,3,0.3); return V3(sx,g===null?0:g,0); }
function setupSandboxBot(){ bot.setCards([]); bot.resetRound(); botState.reset(); if(sandbox.bot==='none'){ bot.dead=true; bot.mesh.visible=false; bot.respawnT=0; } else if(sandbox.bot==='dummy'){ bot.pos.copy(sandboxBotSpot()); bot.yaw=Math.PI/2; } else { bot.pos.copy(BASE_POS.bot); bot.yaw=Math.PI/2; } bot.vel.set(0,0,0); show(UI.botPanel,sandbox.bot!=='none'); }
function applySandboxLoadout(){ const hpFrac=1; player.setCards(sandbox.cards); player.hp=player.maxHp()*hpFrac; player.ammo=player.stats.ammo; player.reloading=false; player.blockCdT=0; updateCardStrips(); }
function closeSandbox(){ sandbox.open=false; paused=false; show(UI.sandbox,false); applySandboxLoadout(); if(sandbox.botWas!==sandbox.bot){ sandbox.botWas=sandbox.bot; setupSandboxBot(); } requestLock(); last=performance.now(); toast('Loadout updated. <b>TAB</b> to change it again.','you'); }
function startSandbox(){
  mode='sandbox'; sandbox.open=false; sandbox.remap=false; paused=false; if(curMapId!==settings.map) applyMap(settings.map);
  show(UI.sandbox,false); show(UI.start,false); show(UI.matchover,false); show(UI.draft,false); show(UI.pause,false); show(UI.countdown,false);
  for(const k in matchStats) matchStats[k]=0; score.player=0; score.bot=0; roundNum=1; clearProjectiles(); resetInputs();
  player.setCards(sandbox.cards); player.resetRound(); placeAtBases(); sandbox.botWas=sandbox.bot; setupSandboxBot();
  state='fight'; show(UI.hud,true,'block'); UI.hud.classList.add('sandboxmode'); UI.roundPill.textContent='SANDBOX'; UI.roundSub.textContent='TAB = CHANGE POWERS'; tipsT=9; updateCardStrips(); updateHUD(); SFX.music('fight'); requestLock(); last=performance.now();
}
function respawn(f){ const keepCd=f.dashCdT; f.resetRound(); if(f.isPlayer){ f.pos.copy(BASE_POS.player); f.yaw=-Math.PI/2; f.pitch=0; } else if(sandbox.bot==='dummy') f.pos.copy(sandboxBotSpot()); else f.pos.copy(BASE_POS.bot); f.vel.set(0,0,0); f.invulnT=1; burst(f.center(),f.team.light,14,5,0.1,0.5,0); shockRing(V3(f.pos.x,f.pos.y+0.06,f.pos.z),f.team.light,2,0.4); }

// ================= DRAFT: cards, coach pick, stat preview =================
const TYPE_ICON={ gun:'<circle cx="13" cy="12" r="6" fill="currentColor"/><path d="M2 12h4M3 7h3M3 17h3" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>', dome:'<path d="M3 18a9 9 0 0 1 18 0Z" fill="currentColor"/>', aura:'<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-dasharray="4 3"/><circle cx="12" cy="12" r="3.5" fill="currentColor"/>', body:'<path d="M12 20C4 13 3 6 8.5 5c2-.3 3.2 1.4 3.5 2.4.3-1 1.5-2.7 3.5-2.4C21 6 20 13 12 20Z" fill="currentColor"/>' };
const typeIcon=t=>`<svg viewBox="0 0 24 24">${TYPE_ICON[t]}</svg>`;
function pick3(){ const pool=ALL_CARDS.slice(), out=[]; for(let k=0;k<3&&pool.length;k++){ out.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]); } return out; } // every card has the same odds
function botPick(){ const opts=pick3(); const w=opts.map(id=>({id,w:(['glasscannon','remote','demonicpact'].includes(id)?0.4:1)+Math.random()})); w.sort((a,b)=>b.w-a.w); const id=w[0].id; bot.addCard(id); toast(`<b class="bot">Bot</b> took <b>${CARDS[id].name}</b>`,'bot'); return id; }
function coachPick(opts,playerLost){
  const s=player.stats, bs=bot.stats, ri=roundInfo; const acc=ri.shots>=3? ri.hits/ri.shots : null; const domeCount=player.cards.filter(c=>CARDS[c].type==='dome').length;
  const G={ dmg:['combine','windup','carefulplanning','glasscannon','poison','parasite','explosive','grow','timeddetonation'], easy:['bigbullets','buckshot','barrage','spray','explosive','toxiccloud','timeddetonation','quickshot','fastball','steadyshot','remote'],
    hp:['tank','huge','defender','decay','phoenix','leech','brawler','healingfield','steadyshot'], reload:['quickreload','scavenger','tacticalreload'], onhit:['scavenger','leech','tasteofblood','refresh','brawler','dazzle','coldbullets','thruster','poison'],
    domeUp:['bigdome','defender','echo','refresh','tacticalreload'], domeFx:['frostslam','shockwave','bombsaway','emp','overpower','implode','saw','silence','supernova','healingfield','teleport'], pullIn:['bigdome','chase','implode','tank','frostslam','supernova'],
    range:['fastball','quickshot','grow','windup','remote','steadyshot'], dot:['poison','parasite','toxiccloud','overpower','lifestealer','staticfield'], flood:['spray','burst','barrage','toxiccloud','timeddetonation','bombsaway','staticfield','silence','explosive'], recover:['highjump','teleport','tank','huge'] };
  const rules=[];
  if(playerLost&&ri.cause==='fall') rules.push([G.recover,3.2,'You went off the edge last round. This helps you stay on the map.']);
  if(playerLost&&ri.botHpFrac>0.55) rules.push([G.dmg,3,'You barely dented the bot last round. This hits harder.']);
  if(acc!==null&&acc<0.34) rules.push([G.easy,3,'Most of your shots missed last round. This makes hits easier.']);
  if(playerLost&&ri.t<14) rules.push([G.hp,3,'You went down fast last round. This keeps you alive longer.']);
  if(s.reload>2.3) rules.push([G.reload,3.2,'Your reload is slow now ('+s.reload.toFixed(1)+'s). This fixes it.']);
  if(s.ammo<=2) rules.push([['burst','spray','barrage','buckshot','quickreload','scavenger'],2.2,'You are low on ammo per reload. This gives you more shots.']);
  if(s.pellets*(1+s.burst)>=4||s.fireInt<0.12) rules.push([G.onhit,2.6,'You land lots of small hits. This rewards every one of them.']);
  if(domeCount>=1) rules.push([G.domeUp,2.4+0.4*domeCount,'It powers up the dome build you already started.'],[G.domeFx,1.4,'It adds another effect to every block.']);
  if(s.hasAura) rules.push([G.pullIn,2.5,'It keeps the bot inside your aura for longer.']);
  if(bs.hasAura||bs.domeFx>0) rules.push([G.range,2.2,'The bot is dangerous up close now. This lets you fight from range.']);
  if(bs.hp>=220) rules.push([G.dot,2.2,'The bot has a lot of HP. Damage over time cuts through it.']);
  if(ri.botBlocked>=3) rules.push([G.flood,2.3,'The bot blocked a lot of your shots. This floods or gets around its dome.']);
  if(s.hp<=70) rules.push([G.hp,2.6,'Your HP is low. One good hit ends you without this.']);
  if(s.dmg>=70&&s.pellets===1) rules.push([['bigbullets','fastball','quickshot','explosive','coldbullets','dazzle'],1.8,'Your shots hit hard, so make sure they land.']);
  let best=null;
  for(const id of opts){ let sc=0.4+Math.random()*0.2, why='A solid all-round pick for your build.';
    let top=0; for(const [list,pts,txt] of rules){ if(list.includes(id)){ sc+=pts; if(pts>top){ top=pts; why=txt; } } }
    const owned=player.cards.filter(c=>c===id).length; if(owned){ sc+=1.1; if(top<1.2) why='You already have it, and a second copy stacks the effect.'; }
    if(id==='glasscannon'&&(s.hp<=100||(playerLost&&ri.t<14))) sc-=3; if(id==='phoenix'&&s.hp<=70) sc-=1; if(id==='demonicpact'&&s.hp<=100) sc-=1.5;
    if(!best||sc>best.sc) best={id,sc,why}; }
  return best;
}
function statRows(s){ return [['HP',s.hp,String(s.hp),1],['DMG',s.dmg,String(Math.round(s.dmg)),1],['Bullets',s.pellets*(1+s.burst),String(s.pellets*(1+s.burst)),1],['Ammo',s.ammo,String(s.ammo),1],['Reload',s.reload,s.reload.toFixed(2)+'s',-1],['Fire rate',1/s.fireInt,(1/s.fireInt).toFixed(1)+'/s',1],['Shot speed',s.speed,String(Math.round(s.speed)),1],['Block CD',s.blockCd,s.blockCd.toFixed(2)+'s',-1],['Dome',s.dome,s.dome.toFixed(1)+'m',1]]; }
function renderStatbar(previewId){ const cur=statRows(player.stats); const nxt=previewId? statRows(computeStats(player.cards.concat([previewId]))) : null;
  UI.statbar.innerHTML='<span class="sb-t">YOUR BUILD</span>'+cur.map((r,i)=>{ let v=r[2], cls=''; if(nxt&&Math.abs(nxt[i][1]-r[1])>1e-6){ const better=(nxt[i][1]-r[1])*r[3]>0; cls=better?'up':'down'; v=`<s>${r[2]}</s> ${nxt[i][2]}`; } return `<span class="sb ${cls}"><i>${r[0]}</i><b>${v}</b></span>`; }).join(''); }
function cardHTML(id,i,owned,coach){ const c=CARDS[id];
  return `${coach?'<div class="coachtag">★ COACH PICK</div>':''}<div class="card-in"><div class="face back"><div class="backlogo">DOME<br>ROUNDS</div></div><div class="face front"><i class="br tl"></i><i class="br tr"></i><i class="br bl"></i><i class="br brr"></i><div class="ctitle">${c.name}</div><div class="cmeta"><span class="ctype">${typeIcon(c.type)}${TYPE_LABEL[c.type]}</span></div><div class="art">${ART.svg(id)}<div class="glare"></div></div><div class="cdesc">${c.tag}</div><div class="lines">${c.lines.map(l=>`<div><b class="${l[2]?'good':'bad'}">${l[0]}</b> ${l[1]}</div>`).join('')}</div><div class="cfoot"><span class="ckey">${i+1}</span>${owned?`<span class="owned">STACK ×${owned+1}</span>`:'<span class="new">NEW</span>'}</div></div></div>`; }
function startDraft(){
  state='draft'; clearProjectiles(); player.resetRound(); bot.resetRound(); placeAtBases(); roundNum++; exitLock(); show(UI.hud,false); UI.banner.className='banner'; SFX.music('draft');
  const playerLost = lastWinner===bot; player.setMood(playerLost?'worried':'happy',999); bot.setMood(playerLost?'happy':'worried',999);
  if(!playerLost&&!NET.on) botPick();
  const opts=pick3(); const rec=coachPick(opts,playerLost); pad.focus=Math.max(0,opts.indexOf(rec.id));
  UI.draftTitle.textContent='PICK A CARD'; draftT=DRAFT_LIMIT; draftTick=-1; UI.draftClock.textContent=DRAFT_LIMIT+'s'; UI.draftClock.classList.remove('warn');
  UI.draftSub.textContent= NET.on? (playerLost?'You lost that round. Pick a card, your rival is picking too.':'You won that round. Pick a card, your rival is picking too.') : playerLost? 'You lost that round, so you pick first.' : 'You won! The bot picked first. Your turn.';
  UI.coach.innerHTML=`<b>COACH:</b> take <em style="color:${CARDS[rec.id].c}">${CARDS[rec.id].name}</em>. ${rec.why}`;
  UI.cards.innerHTML=''; renderStatbar(null);
  opts.forEach((id,i)=>{ const c=CARDS[id]; const el=document.createElement('div'); el.className=`card t-${c.type}`+(id===rec.id?' rec':''); el.style.setProperty('--c',c.c); el.style.setProperty('--i',i);
    el.innerHTML=cardHTML(id,i,player.cards.filter(x=>x===id).length,id===rec.id);
    el._hover=()=>{ if(UI.statbar._id!==id){ UI.statbar._id=id; renderStatbar(id); } };
    el.addEventListener('mousemove',ev=>{ const r=el.getBoundingClientRect(); const px=(ev.clientX-r.left)/r.width, py=(ev.clientY-r.top)/r.height; el.style.setProperty('--ry',((px-0.5)*14).toFixed(1)+'deg'); el.style.setProperty('--rx',((0.5-py)*12).toFixed(1)+'deg'); el.style.setProperty('--gx',(px*100).toFixed(0)+'%'); el.style.setProperty('--gy',(py*100).toFixed(0)+'%'); });
    el.addEventListener('mouseenter',()=>{ SFX.hover(); el._hover(); });
    el.addEventListener('mouseleave',()=>{ el.style.setProperty('--ry','0deg'); el.style.setProperty('--rx','0deg'); UI.statbar._id=null; renderStatbar(null); });
    el.addEventListener('click',()=>{ if(state!=='draft'||el.classList.contains('picked')) return; el.classList.add('picked'); for(const o of UI.cards.children) if(o!==el) o.classList.add('gone'); player.addCard(id); SFX.pick(); toast(`<b class="you">You</b> took <b>${c.name}</b>`,'you'); if(playerLost&&!NET.on) botPick(); state='picked'; if(NET.on){ netAfterPick(); return; } const go=()=>{ if(state!=='picked') return; show(UI.draft,false); requestLock(); beginRound(); }; if(testMode) go(); else setTimeout(go,650); });
    UI.cards.appendChild(el); setTimeout(()=>SFX.deal(),120+i*130); });
  UI.statbar._id=null; show(UI.draft,true); updateCardStrips();
}
function endMatch(){
  state='matchover'; exitLock(); SFX.music('menu');
  const won=score.player>score.bot; UI.moTitle.textContent=won?'YOU WIN!':'BOT WINS'; UI.moTitle.className='title stroke '+(won?'win':'lose');
  UI.moSub.textContent=won?'Champion of the arena. Try a harder bot next?':'So close. Try the Easy bot, or practise your build in the sandbox.';
  fillStats(UI.moStats,UI.moCards); player.setMood(won?'happy':'worried',999); show(UI.matchover,true,'block'); show(UI.hud,false);
}

// ================= HUD =================
const artCache={}; const artOf=id=>artCache[id]||(artCache[id]=ART.svg(id));
function stripHTML(f){ const counts={}; for(const id of f.cards) counts[id]=(counts[id]||0)+1; return Object.keys(counts).map(id=>`<div class="mini" style="--c:${CARDS[id].c}" title="${CARDS[id].name}">${artOf(id)}${counts[id]>1?`<b>×${counts[id]}</b>`:''}</div>`).join(''); }
function updateCardStrips(){ UI.cardsYou.innerHTML=stripHTML(player); UI.cardsBot.innerHTML=stripHTML(bot); }
let lastAmmoKey='';
function updateHUD(){
  const pm=player.maxHp(), bm=bot.maxHp(); const ph=clamp(player.hp/pm,0,1), bh=clamp(bot.hp/bm,0,1);
  UI.hpYou.style.width=(ph*100)+'%'; UI.hpYouGhost.style.width=(ph*100)+'%'; UI.hpYou.className='fill '+(ph>0.5?'ok':(ph>0.25?'mid':'low'));
  UI.hpYouT.textContent=Math.ceil(player.hp)+' / '+pm;
  UI.hpBot.style.width=(bh*100)+'%'; UI.hpBotT.textContent=Math.ceil(bot.hp)+' / '+bm; UI.botTagFill.style.width=(bh*100)+'%';
  const max=player.stats.ammo, key=max+'_'+player.ammo;
  if(key!==lastAmmoKey){ lastAmmoKey=key; let html=''; if(max<=14){ for(let i=0;i<max;i++) html+=`<span class="shot ${i<player.ammo?'on':''}"></span>`; } else html=`<span class="ammoNum">${player.ammo}<small>/${max}</small></span>`; UI.ammo.innerHTML=html; }
  UI.ammo.classList.toggle('reloading',player.reloading);
  const rp=player.reloading? (1-player.reloadT/player.stats.reload) : 0; UI.reloadRing.style.setProperty('--p',(rp*100).toFixed(1)+'%'); UI.reloadRing.style.opacity=player.reloading?'1':'0';
  if(mode!=='sandbox'){ UI.roundPill.textContent='ROUND '+roundNum; const left=Math.max(0,ROUND_LIMIT-roundInfo.t), m=Math.floor(Math.ceil(left)/60), sec=Math.ceil(left)%60; UI.roundClock.textContent=m+':'+String(sec).padStart(2,'0'); UI.roundClock.classList.toggle('warn',left<=30); UI.roundClock.style.display=''; } else UI.roundClock.style.display='none';
  const bk=player.blockCdT>0? (1-player.blockCdT/player.stats.blockCd):1; UI.blockCd.style.setProperty('--p',(bk*100).toFixed(1)+'%'); UI.blockCd.classList.toggle('ready',bk>=1&&player.silenceT<=0); UI.blockCd.classList.toggle('off',player.silenceT>0);
  const cdTxt=player.blockCdT>0.05? player.blockCdT.toFixed(1) : ''; if(UI.blockCd._t!==cdTxt){ UI.blockCd._t=cdTxt; UI.blockCd.dataset.t=cdTxt; }
  const dk=player.dashCdT>0? (1-player.dashCdT/CFG.dashCd):1; UI.dashCd.style.setProperty('--p',(dk*100).toFixed(1)+'%'); UI.dashCd.classList.toggle('ready',dk>=1);
  const st=[]; if(player.slowT>0||player.auraSlow>0) st.push('<i class="s-slow">SLOWED</i>'); if(player.stunT>0) st.push('<i class="s-stun">STUNNED</i>'); if(player.poisons.length) st.push('<i class="s-psn">POISONED</i>'); if(player.silenceT>0) st.push('<i class="s-sil">SILENCED</i>'); if(player.brawlT>0) st.push('<i class="s-buff">BRAWLER</i>'); if(player.tasteT>0||player.chasing) st.push('<i class="s-buff">SPEED</i>'); if(player.invulnT>0) st.push('<i class="s-stun">SAFE</i>');
  const sh=st.join(''); if(UI.statusYou._h!==sh){ UI.statusYou._h=sh; UI.statusYou.innerHTML=sh; }
  UI.vignette.style.opacity=String(clamp((0.35-ph)*2.4,0,0.85)); UI.hurt.style.opacity=String(clamp(hurtT*2.5,0,0.8));
  UI.hitmark.style.opacity=hitMarkerT>0?'1':'0'; UI.hitmark.classList.toggle('kill',killMarkT>0); UI.hitmark.style.transform=`translate(-50%,-50%) rotate(45deg) scale(${(1+hitMarkerT*3).toFixed(2)})`;
  UI.crosshair.style.setProperty('--k',(crossKick*10).toFixed(1)+'px');
  const steering=!!remoteCtl.b; if(UI.steer._on!==steering){ UI.steer._on=steering; UI.steer.style.display=steering?'block':'none'; }
  const tips=tipsT>0&&state==='fight'; if(UI.tips._on!==tips){ UI.tips._on=tips; UI.tips.style.display=tips?'block':'none'; }
  if(dmgDirT>0&&!player.dead){ const to=V3().subVectors(dmgFrom,player.pos); const a=Math.atan2(-to.x,-to.z)-player.yaw; UI.dmgdir.style.opacity=String(Math.min(1,dmgDirT*1.6)); UI.dmgdir.style.transform=`translate(-50%,-50%) rotate(${(-a*180/Math.PI).toFixed(1)}deg)`; } else UI.dmgdir.style.opacity='0';
  if(!bot.dead&&bot.mesh.visible&&(state==='fight'||state==='countdown')){ _proj.copy(bot.center()); _proj.y+=1.1; _proj.project(camera); if(_proj.z<1&&Math.abs(_proj.x)<1.1&&Math.abs(_proj.y)<1.1){ UI.botTag.style.display='block'; UI.botTag.style.opacity=hasLOS(camera.position,bot.center())?'1':'0.45'; UI.botTag.style.transform=`translate(-50%,-100%) translate(${((_proj.x+1)/2*window.innerWidth).toFixed(1)}px,${((1-_proj.y)/2*window.innerHeight).toFixed(1)}px)`; } else UI.botTag.style.display='none'; } else UI.botTag.style.display='none';
}

// ================= BOT AI =================
const botState={ strafe:1, strafeT:0, shootT:0, shooting:false, jumpT:2, reactT:0, stuckT:0, lastPos:V3(),
  reset(){ this.strafe=Math.random()<0.5?-1:1; this.strafeT=rand(1,2); this.shootT=rand(1.2,2.0); this.shooting=false; this.jumpT=rand(1.5,3); this.reactT=0; this.stuckT=0; this.lastPos.set(0,0,0); } };
function botThink(dt){
  const b=bot, p=player, D=botLevel(); if(b.dead||p.dead) return {wish:V3(),jump:false};
  const toP=V3().subVectors(p.pos,b.pos); toP.y=0; const dist=toP.length(); const dir=dist>0.01?toP.clone().normalize():V3(1,0,0);
  const los=hasLOS(b.center(),p.center());
  const aimTarget=p.center(); const tFly=clamp(dist/b.stats.speed,0,1.2); aimTarget.addScaledVector(p.vel,tFly*(D===DIFF.easy?0.35:0.8));
  const err=D.err+(bot.dazzleN>0?0.3:0); aimTarget.x+=rand(-err,err)*dist; aimTarget.y+=rand(-err,err)*dist*0.6; aimTarget.z+=rand(-err,err)*dist;
  const faceDir=V3().subVectors(p.center(),b.center()); b.yaw=Math.atan2(-faceDir.x,-faceDir.z);
  const aimDir=V3().subVectors(aimTarget,b.center()); if(aimDir.lengthSq()<0.01) aimDir.set(1,0,0); aimDir.normalize(); b.botAim=aimDir; b.pitch=clamp(Math.asin(clamp(aimDir.y,-1,1)),-1,1);
  botState.strafeT-=dt; if(botState.strafeT<=0){ botState.strafe*=-1; botState.strafeT=rand(0.8,2.2); }
  const right=V3(-dir.z,0,dir.x); const wish=V3();
  const closeBuild=b.stats.hasAura||b.stats.domeFx>0; const want=closeBuild?4.5:10; if(dist>want+3) wish.add(dir); else if(dist<want-3) wish.sub(dir); if(!los) wish.addScaledVector(dir,0.7);
  wish.addScaledVector(right,botState.strafe*(los?0.9:1.2));
  let threat=null, tdist=99;
  for(const bl of bullets){ if(bl.owner!==p) continue; const rel=V3().subVectors(b.center(),bl.pos); const sp=Math.max(0.01,bl.vel.length()); const along=rel.dot(bl.vel)/sp; if(along<0||along>10) continue; const perp=rel.clone().addScaledVector(bl.vel,-along/sp).length(); if(perp<2.2&&along<tdist){ tdist=along; threat=bl; } }
  if(threat){ botState.reactT+=dt; if(botState.reactT>D.react&&!botState.decided){ botState.decided=true; if(b.blockCdT<=0&&!b.blockActive&&b.silenceT<=0&&Math.random()<D.block) tryBlock(b,true); else if(b.dashCdT<=0&&b.onGround&&Math.random()<D.dodge){ b.dashDir.copy(right).multiplyScalar(botState.strafe); b.dashT=CFG.dashTime; b.dashCdT=CFG.dashCd; SFX.dash(); } } } else { botState.reactT=0; botState.decided=false; }
  if(dist<b.domeR()+0.3&&b.blockCdT<=0&&b.stats.domeFx>0&&Math.random()<dt*3*D.block) tryBlock(b,true);
  const nx=b.pos.x+wish.x*2.2, nz=b.pos.z+wish.z*2.2; if(Math.abs(nx)>HX-1.2) wish.x=-Math.sign(b.pos.x)*0.8; if(Math.abs(nz)>HZ-1.2) wish.z=-Math.sign(b.pos.z)*0.8;
  if(groundAt(b.pos.x+wish.x*1.6,b.pos.z+wish.z*1.6,b.pos.y+3,0.3)===null){ wish.multiplyScalar(-1); botState.strafe*=-1; }
  if(wish.lengthSq()>1) wish.normalize(); wish.multiplyScalar(D.speed);
  let jump=false; botState.jumpT-=dt; if(b.pos.distanceTo(botState.lastPos)<CFG.moveSpeed*dt*0.3&&wish.lengthSq()>0.1) botState.stuckT+=dt; else botState.stuckT=0; botState.lastPos.copy(b.pos);
  if(botState.stuckT>0.3){ jump=true; botState.stuckT=0; if(Math.random()<0.6) botState.strafe*=-1; }
  if(botState.jumpT<=0){ jump=Math.random()<0.5; botState.jumpT=rand(1.5,3.5); }
  botState.shootT-=dt; if(botState.shootT<=0){ botState.shooting=!botState.shooting; botState.shootT=botState.shooting?rand(D.fire[0],D.fire[1]):rand(D.rest[0],D.rest[1]); }
  if(botState.shooting&&los&&dist<36&&!(b.stats.pact>0&&b.hp<b.maxHp()*0.4)) tryFire(b,false);
  return {wish,jump};
}

// ================= PHYSICS / UPDATE =================
function moveFighter(f,dt,wish,wantJump){ if(dt>0.02){ moveFighter(f,dt*0.5,wish,wantJump); moveFighter(f,dt*0.5,wish,false); return; }
  const e=other(f);
  f.chasing=false; if(f.stats.chase>0&&!e.dead&&wish.lengthSq()>0.1){ const d=V3().subVectors(e.pos,f.pos); d.y=0; if(d.lengthSq()>0.01&&wish.dot(d.normalize())>0.45&&hasLOS(f.center(),e.center())) f.chasing=true; }
  const sp=CFG.moveSpeed*f.speedFactor();
  if(f.dashT>0){ f.vel.x=f.dashDir.x*CFG.dashSpeed; f.vel.z=f.dashDir.z*CFG.dashSpeed; f.dashT-=dt; if(Math.random()<0.3) ghostAt(f.center(),f.team.light); if(Math.random()<0.7) burst(f.center(),f.team.light,1,1.5,0.1,0.3,0); }
  else { if(f.knockT>0) f.knockT-=dt; const acc=(f.onGround?44:22)*(f.thrusters.length?0.5:1)*(f.knockT>0?0.22:1); f.vel.x=approach(f.vel.x,wish.x*sp,acc*dt); f.vel.z=approach(f.vel.z,wish.z*sp,acc*dt); }
  for(let i=f.thrusters.length-1;i>=0;i--){ const th=f.thrusters[i]; if(!th) continue; th.t-=dt; f.vel.addScaledVector(th.dir,th.f*dt*2.4); if(th.dir.y>0.1&&f.vel.y>1) f.onGround=false; if(th.t<=0) f.thrusters.splice(i,1); }
  f.coyote=f.onGround?0.12:Math.max(0,(f.coyote||0)-dt); if(wantJump&&(f.onGround||f.coyote>0)&&f.vel.y<=0.5&&f.stunT<=0){ f.coyote=0; f.vel.y=CFG.jumpVel*Math.sqrt(f.stats.jump); f.onGround=false; if(f.isPlayer){ jumpBuffer=0; SFX.jump(); } shockRing(V3(f.pos.x,f.pos.y+0.06,f.pos.z),0xffffff,1.1,0.3); burst(V3(f.pos.x,f.pos.y+0.1,f.pos.z),0xffffff,5,2.2,0.08,0.3,0.2); }
  f.vel.y-=CFG.gravity*dt;
  f.pos.x+=f.vel.x*dt; f.pos.z+=f.vel.z*dt; resolveWalls(f);
  const py=f.pos.y; f.pos.y+=f.vel.y*dt;
  const g=groundAt(f.pos.x,f.pos.z,Math.max(py,f.pos.y),f.radius*0.6);
  f.wasGround=f.onGround;
  if(g!==null&&f.vel.y<=0&&(f.pos.y<=g+0.01||(f.wasGround&&f.pos.y-g<0.35))){ if(!f.wasGround&&f.vel.y<-7){ f.squash=Math.min(1,-f.vel.y/18); burst(V3(f.pos.x,g+0.1,f.pos.z),0xe9edf3,7,2.8,0.09,0.35,0.3); shockRing(V3(f.pos.x,g+0.06,f.pos.z),0xffffff,1.3,0.3); if(f.isPlayer) SFX.land(); } f.pos.y=g; f.vel.y=0; f.onGround=true; } else f.onGround=false;
  if(f.pos.y+f.height>18){ f.pos.y=18-f.height; f.vel.y=Math.min(f.vel.y,0); }
  if((f.pos.y<CFG.killY||Math.abs(f.pos.x)>HX+28||Math.abs(f.pos.z)>HZ+28)&&!f.dead&&state==='fight'){ const wet=curMapId==='dock'; if(wet){ burst(V3(f.pos.x,-1,f.pos.z),0xbfe6ff,24,7,0.16,0.9); burst(V3(f.pos.x,-1,f.pos.z),0xffffff,12,5,0.12,0.7); } floatText(V3(f.pos.x,0.6,f.pos.z),wet?'SPLASH!':'FELL!','status'); f.invulnT=0; fatal(f,other(f),'fall'); }
}
function separateFighters(){ if(player.dead||bot.dead) return; if(Math.abs(player.pos.y-bot.pos.y)>1.8) return; const d=V3().subVectors(bot.pos,player.pos); d.y=0; const L=d.length(); const min=player.radius+bot.radius+0.1; if(L<min&&L>0.001){ d.multiplyScalar((min-L)/L*0.5); bot.pos.add(d); player.pos.sub(d); } }
function tickDamage(f,key,dps,dt,target,cause,colr){ f[key]=(f[key]||0)+dps*dt; if(f[key]>=3){ const n=Math.floor(f[key]); f[key]-=n; applyDamage(target,n,f,{tick:true,cause}); if(colr) burst(target.center(),colr,2,1.5,0.08,0.5,-0.3); return n; } return 0; }
function updateFighterTimers(f,dt){
  const s=f.stats, e=other(f);
  if(f.fireCd>0) f.fireCd-=dt; if(f.blockCdT>0) f.blockCdT-=dt; if(f.dashCdT>0) f.dashCdT-=dt; if(f.slowT>0) f.slowT-=dt; if(f.stunT>0) f.stunT-=dt; if(f.coldT>0) f.coldT-=dt; if(f.blinkPending>0){ f.blinkPending-=dt; if(f.blinkPending<=0&&!f.dead&&state==='fight') doBlock(f,false,true); }
  if(f.tasteT>0) f.tasteT-=dt; if(f.refreshCd>0) f.refreshCd-=dt; if(f.silenceT>0) f.silenceT-=dt; if(f.invulnT>0) f.invulnT-=dt;
  if(f.brawlT>0){ f.brawlT-=dt; if(f.brawlT<=0) f.hp=Math.min(f.hp,s.hp); }
  if(f.reloading){ f.reloadT-=dt; if(f.reloadT<=0){ f.reloading=false; f.ammo=s.ammo; if(f.isPlayer) SFX.tick(); } }
  if(f.blockActive){ f.blockT-=dt; if(f.blockT<=0){ f.blockActive=false; if(f.sawT<=0){ shatterDome(f.domeC(),f.domeR(),f.team.light,26,4.5); SFX.shatter(); } } }
  if(f.sawT>0){ f.sawT-=dt; if(!e.dead&&e.center().distanceTo(f.domeC())<f.domeR()+0.5){ tickDamage(f,'sawAcc',24*s.saw,dt,e,'dome',0xff5252); } if(f.sawT<=0&&!f.blockActive){ shatterDome(f.domeC(),f.domeR(),0xff6b6b,22,5); SFX.shatter(); } }
  if(f.echoT>0){ f.echoT-=dt; if(f.echoT<=0&&!f.dead&&state==='fight'&&f.silenceT<=0){ doBlock(f,true); f.echoCount--; if(f.echoCount>0) f.echoT=0.65; } }
  if(f.burstQueue>0){ f.burstT-=dt; if(f.burstT<=0){ if(!f.dead&&state==='fight') firePellets(f); f.burstQueue--; f.burstT=0.07; } }
  if(f.dazzleN>0){ f.dazzleT-=dt; if(f.dazzleT<=0){ f.dazzleN--; f.dazzleT=0.6; f.stunT=Math.max(f.stunT,0.25); burst(f.center().add(V3(0,0.9,0)),0xffe45c,6,3,0.09,0.4,0); } }
  if(f.decayPool>0){ const d=Math.min(f.decayPool,Math.max(2,f.decayRate||0)*dt); f.decayPool-=d; f.decayAcc+=d; if(f.decayAcc>=2||f.decayPool<=0.001){ const n=Math.round(f.decayAcc); f.decayAcc-=n; if(n>0) applyDamage(f,n,f.decaySrc||e,{tick:true,fromDecay:true}); } if(f.decayPool<=0.001){ f.decayPool=0; f.decayRate=0; } }
  for(let i=f.poisons.length-1;i>=0;i--){ const p=f.poisons[i]; if(!p) continue; p.t-=dt; p.acc=(p.acc||0)+p.dps*dt; if(p.acc>=4){ const n=Math.floor(p.acc); p.acc-=n; applyDamage(f,n,p.src,{tick:true,cause:'poison'}); burst(f.center(),p.col||0x5dff9b,2,1.5,0.08,0.5,-0.3); } if(p.t<=0&&f.poisons[i]===p) f.poisons.splice(i,1); }
  f.auraSlow=0; f.chillIn=false; const aR=e.auraR(); if(!e.dead&&aR>0&&!f.dead&&f.center().distanceTo(e.domeC())<aR+0.3){ const es=e.stats;
    if(es.chill){ f.auraSlow=Math.max(f.auraSlow,Math.min(0.78,0.45+0.12*(es.chill-1))); f.chillIn=true; } if(es.staticf){ f.auraSlow=Math.max(f.auraSlow,0.15+0.05*es.staticf); if(tickDamage(e,'staticAcc',6*es.staticf,dt,f,'aura',0xffe066)) SFX.zap(); }
    if(es.drain){ lifeWorm(f,e,'aura'+(e.isPlayer?'p':'b'),0.12,1.15); const n=tickDamage(e,'drainAcc',9*es.drain,dt,f,'aura',0xff6b9d); if(n&&e.hp<e.maxHp()){ e.hp=Math.min(e.maxHp(),e.hp+n); floatText(e.center().add(V3(0,1,0)),'+'+n,'heal'); } }
    if(Math.random()<dt*7) burst(f.center().add(V3(rand(-0.5,0.5),rand(-0.3,0.6),rand(-0.5,0.5))),e.auraColor(gameT).getHex(),1,0.6,0.07,0.7,-0.2); }
}
function updateBullets(dt){
  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i]; b.life-=dt; b.age+=dt; if(b.life<=0){ burst(b.pos,b.tint,4,2,0.07,0.3,0); removeBullet(i); continue; }
    const speed=b.vel.length();
    if(b.remote){ if(b.owner.isPlayer&&remoteCtl.b===b){ const cp=Math.cos(remoteCtl.pitch); b.vel.set(-Math.sin(remoteCtl.yaw)*cp,Math.sin(remoteCtl.pitch),-Math.cos(remoteCtl.yaw)*cp).multiplyScalar(speed); }
      else if(!b.owner.isPlayer){ const e=other(b.owner); if(!e.dead){ const want=V3().subVectors(e.center(),b.pos).normalize(); const cur=b.vel.clone().normalize(); const ang=cur.angleTo(want); const k=ang<1e-4?1:Math.min(1,1.3*b.s.remote*dt/ang); b.vel.copy(cur.lerp(want,k).normalize().multiplyScalar(speed)); } } }
    if(b.s.grow>0) b.k=Math.min(4.2,1+b.dist*0.075*b.s.grow);
    const steps=Math.max(1,Math.ceil(speed*dt/0.35)); const sdt=dt/steps; let done=false; const br=b.r*b.k;
    for(let s=0;s<steps&&!done;s++){
      b.pos.addScaledVector(b.vel,sdt); b.dist+=speed*sdt;
      const e=other(b.owner);
      if(!e.dead){
        if(e.blockActive&&b.pos.distanceTo(e.domeC())<e.domeR()+br&&b.pos.y>e.pos.y-0.3){ e.domeHitDir.copy(b.pos).sub(e.domeC()).normalize(); e.domeHitAge=0; burst(b.pos,0xffffff,8,5,0.08,0.35,0); for(let k=0;k<5;k++) spawnShard(b.pos.clone(),V3(rand(-1,1),rand(0,1),rand(-1,1)).multiplyScalar(4),e.team.light,0.2,0.35,0.6); flashAt(b.pos,e.team.light,2.4,0.2); SFX.blocked(); if(e.isPlayer){ floatText(b.pos.clone(),'BLOCKED','status'); matchStats.blocked++; } else roundInfo.botBlocked++; removeBullet(i); done=true; break; }
        if(e.distTo(b.pos)<e.hitR+br){ hitFighter(b,e); removeBullet(i); done=true; break; } }
      if(b.bounced&&b.age>0.25&&!b.owner.dead&&b.owner.distTo(b.pos)<b.owner.hitR+br){ hitFighter(b,b.owner); removeBullet(i); done=true; break; }
      const hit=pointVsWorld(b.pos,br);
      if(hit){ if(b.bounces>0){ b.bounces--; b.bounced=true; b.pos.addScaledVector(hit.n,hit.depth+0.01); const vn=b.vel.dot(hit.n); b.vel.addScaledVector(hit.n,-2*vn); if(b.s.ricochet>0) b.vel.multiplyScalar(0.5); burst(b.pos,b.tint,4,3,0.07,0.3,0); shockRing(b.pos.clone(),b.tint,0.7,0.25,0.08,hit.n); if(b.remote&&remoteCtl.b===b){ const d=b.vel.clone().normalize(); remoteCtl.yaw=Math.atan2(-d.x,-d.z); remoteCtl.pitch=Math.asin(clamp(d.y,-1,1)); } } else { bulletImpact(b,hit); removeBullet(i); done=true; break; } }
      if(b.pos.y<CFG.killY-1||Math.abs(b.pos.x)>HX+70||Math.abs(b.pos.z)>HZ+70){ removeBullet(i); done=true; break; }
      if(curMapId==='dock'&&b.pos.y<-0.9){ burst(b.pos,0xbfe6ff,5,3,0.1,0.5); removeBullet(i); done=true; break; }
    }
    if(!done) placeBulletMesh(b,dt);
  }
}
function computeAimPoint(){
  const dir=player.aimDir(); const cam=camera.position; const pivot=V3(player.pos.x,player.pos.y+1.9,player.pos.z);
  const startOff=Math.max(0,V3().subVectors(pivot,cam).dot(dir)); const from=cam.clone().addScaledVector(dir,startOff); const far=cam.clone().addScaledVector(dir,95);
  const t=segmentHitsBoxes(from,far); let dist=startOff+(t===null?1:t)*(95-startOff); let onTarget=false;
  if(!bot.dead&&bot.mesh.visible){ for(const [c,r] of [[bot.center(),0.8],[V3(bot.pos.x,bot.pos.y+1.85,bot.pos.z),0.4],[V3(bot.pos.x,bot.pos.y+0.55,bot.pos.z),0.5]]){ const oc=V3().subVectors(cam,c); const bq=2*oc.dot(dir), cc=oc.dot(oc)-r*r; const disc=bq*bq-4*cc; if(disc>0){ const tE=(-bq-Math.sqrt(disc))/2; if(tE>startOff&&tE<dist){ dist=tE; onTarget=true; } } } }
  aimPoint.copy(cam).addScaledVector(dir,dist);
  UI.crosshair.classList.toggle('onTarget',onTarget);
}
let camDist=1;
function updateCamera(dt){ if(camHold) return;
  const t=gameT;
  if(state==='menu'){ const p=player.pos; camera.fov=50; camera.updateProjectionMatrix(); camera.position.set(p.x+4.3+Math.sin(t*0.3)*0.15,p.y+1.6,p.z-1.9+Math.cos(t*0.25)*0.12); camera.lookAt(p.x,p.y+1.2,p.z+1.3); return; }
  if(state==='draft'||state==='picked'||state==='matchover'){ const a=t*0.12+0.7; camera.fov=55; camera.updateProjectionMatrix(); camera.position.set(Math.cos(a)*(HX+10),17,Math.sin(a)*(HZ+12)); camera.lookAt(0,0.5,0); return; }
  if(remoteCtl.b&&state==='fight'){ const b=remoteCtl.b; const d=b.vel.clone().normalize(); if(Math.abs(camera.fov-80)>0.1){ camera.fov=lerp(camera.fov,80,Math.min(1,dt*10)); camera.updateProjectionMatrix(); } camera.position.copy(b.pos).addScaledVector(d,-1.7).add(V3(0,0.3,0)); camera.lookAt(b.pos.clone().addScaledVector(d,5)); return; }
  const fovT=68+(player.dashT>0?7:0); if(Math.abs(camera.fov-fovT)>0.05){ camera.fov=lerp(camera.fov,fovT,Math.min(1,dt*12)); camera.updateProjectionMatrix(); }
  const pivot=player.pos.clone().add(V3(0,1.95,0)); if(player.visY!==undefined&&player.onGround) pivot.y=player.visY+1.95; const dir=player.aimDir(); const right=V3(Math.cos(player.yaw),0,-Math.sin(player.yaw));
  const desired=pivot.clone().addScaledVector(right,1.0).addScaledVector(dir,-5.2).add(V3(0,0.4,0));
  let th=segmentHitsBoxes(pivot,desired,0.28,true); if(th!==null&&th<=0.001) th=segmentHitsBoxes(pivot,desired,0,true); camDist=th===null? Math.min(1,camDist+dt*3) : Math.min(camDist,Math.max(0.08,th-0.02)); const pos=pivot.clone().lerp(desired,camDist); pos.y+=(1-camDist)*0.7;
  if(pos.y<0.3&&Math.abs(pos.x)<HX&&Math.abs(pos.z)<HZ) pos.y=0.3; if(pos.y<-0.8) pos.y=-0.8;
  camera.position.copy(pos); camera.quaternion.setFromEuler(new T.Euler(player.pitch,player.yaw,0,'YXZ'));
  if(shakeT>0){ shakeT-=dt; const k=Math.min(0.3,shakeT)*0.13; camera.position.x+=rand(-k,k); camera.position.y+=rand(-k,k); }
}
function fxUpdate(dt){ updateCardFx(dt); updateParticles(dt); updateExplosions(dt); updateRings(dt); updateFlashes(dt); updateGhosts(dt); updateShards(dt); updateFloats(dt); }
function update(dt){
  netTick(dt);
  if(paused) return;
  gameT+=dt; const t=gameT;
  for(const fn of animated) fn(t,dt);
  if(state==='menu'){ player.yaw=-Math.PI/2-0.05+Math.sin(t*0.7)*0.22; player.pitch=0.1+Math.sin(t*0.9)*0.1; const cyc=Math.floor(t/2.6)%4; player.mood=['normal','happy','angry','normal'][cyc]; player.moodT=1; player.updateVisual(dt,t); bot.updateVisual(dt,t); updateCamera(dt); fxUpdate(dt); return; }
  if(crossKick>0) crossKick=Math.max(0,crossKick-dt*6); if(hurtT>0) hurtT-=dt; if(hitMarkerT>0) hitMarkerT-=dt; if(killMarkT>0) killMarkT-=dt; if(dmgDirT>0) dmgDirT-=dt;
  const lk=(keys.ArrowLeft?1:0)-(keys.ArrowRight?1:0), lv=(keys.ArrowUp?1:0)-(keys.ArrowDown?1:0);
  if(state==='fight'||state==='countdown'){ if(lk||lv) look(-lk*2.6*dt,-(settings.invertY?-1:1)*lv*1.6*dt);  }
  if(state==='countdown'){
    countdownT-=dt; const step=Math.ceil(countdownT-0.2); if(step!==countdownStep){ countdownStep=step; show(UI.countdown,true,'block'); UI.cdSplat.innerHTML=domBurst(step+11,step>0?'#ffc71f':'#27c46b',{sx:step>0?1.1:1.6}); UI.cdText.textContent= step>0? String(step):'GO!'; UI.countdown.classList.remove('pop'); void UI.countdown.offsetWidth; UI.countdown.classList.add('pop'); if(step>0) SFX.tick(); else SFX.go(); }
    if(countdownT<=0){ state='fight'; show(UI.countdown,false); firePressed=false; blockBuf=0; wantDash=false; }
    player.updateVisual(dt,t); bot.updateVisual(dt,t); updateCamera(dt); computeAimPoint(); fxUpdate(dt); updateHUD(); return;
  }
  if(state==='roundover'){
    roundOverT-=dt; let sdt=dt; if(slowMoT>0){ slowMoT-=dt; sdt=dt*0.28; }
    updateBullets(sdt); updateBombs(sdt); updateFields(sdt,t); fxUpdate(sdt);
    if(NET.on) netApplyRemote(sdt); for(const f of [player,bot]) if(!f.dead){ if(!(NET.on&&f===bot)) moveFighter(f,sdt,V3(),false); f.updateVisual(sdt,t); }
    updateCamera(dt); updateHUD();
    if(roundOverT<=0){ if(matchOverPending) endMatch(); else startDraft(); }
    return;
  }
  if(state==='draft'&&!testMode){ draftT-=dt; const sl=Math.max(0,Math.ceil(draftT)); UI.draftClock.textContent=sl+'s'; UI.draftClock.classList.toggle('warn',sl<=10); if(sl<=10&&sl!==draftTick&&sl>0){ draftTick=sl; SFX.tick(); } if(draftT<=0){ const left=[...UI.cards.children].filter(c=>!c.classList.contains('picked')); if(left.length){ toast('Time up! A random card was picked for you','status'); left[Math.floor(Math.random()*left.length)].click(); } } }
  if(state==='draft'||state==='picked'||state==='matchover'){ fxUpdate(dt); updateCamera(dt); player.updateVisual(dt,t); bot.updateVisual(dt,t); return; }
  // ---- fight ----
  roundInfo.t+=dt; if(mode!=='sandbox'){ const left=ROUND_LIMIT-roundInfo.t; if(left<=10&&Math.ceil(left)!==clockTick&&left>0){ clockTick=Math.ceil(left); SFX.tick(); } if(left<=0&&!(NET.on&&NET.role==='guest')){ timeUp(); return; } } if(jumpBuffer>0) jumpBuffer-=dt; if(tipsT>0) tipsT-=dt;
  const sbx=mode==='sandbox';
  if(sbx){ for(const f of [player,bot]) if(f.dead&&f.respawnT>0){ f.respawnT-=dt; if(f.respawnT<=0) respawn(f); } if(sandbox.bot==='dummy'&&!bot.dead&&bot.hp<bot.maxHp()) bot.hp=Math.min(bot.maxHp(),bot.hp+dt*12); }
  const steering=!!remoteCtl.b;
  const fwd=player.forward(); const right=V3(Math.cos(player.yaw),0,-Math.sin(player.yaw));
  const wish=V3(); if(!steering&&!player.dead){ if(keys.KeyW) wish.add(fwd); if(keys.KeyS) wish.sub(fwd); if(keys.KeyD) wish.add(right); if(keys.KeyA) wish.sub(right); if(pad.lx||pad.ly){ wish.addScaledVector(fwd,-pad.ly).addScaledVector(right,pad.lx); } if(wish.lengthSq()>1) wish.normalize(); }
  if(wantDash){ wantDash=false; if(!steering&&player.onGround&&player.dashCdT<=0&&!player.dead&&player.stunT<=0){ player.dashDir.copy(fwd); player.dashT=CFG.dashTime; player.dashCdT=CFG.dashCd; SFX.dash(); } }
  if(blockBuf>0){ if(steering){ remoteCtl.b.remote=false; remoteCtl.b=null; steerLatch=true; } if(tryBlock(player,!blockFresh)) blockBuf=0; else { if(blockFresh&&player.blockCdT>0.5&&!player.blockActive){ UI.blockCd.classList.remove('deny'); void UI.blockCd.offsetWidth; UI.blockCd.classList.add('deny'); SFX.hover(); } blockBuf-=dt; } blockFresh=false; }
  if((fireHeld||keys.KeyF||pad.fire||firePressed)&&!steerLatch&&!player.dead) tryFire(player,firePressed); firePressed=false;
  if(!player.dead){ updateFighterTimers(player,dt); moveFighter(player,dt,wish,jumpBuffer>0&&!steering); }
  if(NET.on){ if(!bot.dead) updateFighterTimers(bot,dt); netApplyRemote(dt); } else if(!bot.dead&&botHold){ updateFighterTimers(bot,dt); } else if(!bot.dead){ updateFighterTimers(bot,dt); const ai=!sbx||(sandbox.bot!=='dummy'&&sandbox.bot!=='none'); if(ai&&!player.dead){ const bt=botThink(dt); moveFighter(bot,dt,bt.wish,bt.jump); } else { if(!player.dead){ const fd=V3().subVectors(player.pos,bot.pos); bot.yaw=Math.atan2(-fd.x,-fd.z); } moveFighter(bot,dt,V3(),false); } }
  separateFighters();
  updateBullets(dt); if(steering&&!remoteCtl.b) steerLatch=true;
  updateBombs(dt); updateFields(dt,t); fxUpdate(dt);
  player.updateVisual(dt,t); bot.updateVisual(dt,t); updateCamera(dt); if(!remoteCtl.b) computeAimPoint(); updateHUD();
}

// ================= LOOP =================
let last=performance.now(); let autoRun=true, doRender=true, frames=0, testMode=false;
let perfAcc=0, perfN=0, perfLevel=0;
function frame(now){ requestAnimationFrame(frame); const raw=Math.max(0,(now-last)/1000); const dt=Math.min(0.05,raw); last=now; frames++; if(autoRun){ pollPad(dt); update(dt); } if(doRender) drawFrame();
  // auto quality: drop detail when the frame rate stays low
  if(settings.quality==='auto'&&autoRun&&!paused&&!document.hidden&&raw<0.5){ perfAcc+=raw; perfN++; if(perfN>=90){ const avg=perfAcc/perfN; perfAcc=0; perfN=0; if(avg>0.028&&perfLevel<2){ perfLevel++; applyQuality(perfLevel===1?'medium':'low'); toast('Graphics lowered to keep the game smooth. Change it in settings.','you'); } } } }
placeAtBases(); buildPips(); updateCardStrips(); updateHUD(); update(0.016);
show(UI.start,true,'block'); { const el=UI.loading; let gone=false; const go=()=>{ if(gone) return; gone=true; el.classList.add('out'); setTimeout(()=>show(el,false),650); }; const left=Math.max(1400,2700-(performance.now()-(window.__t0||0))); if(testMode||!autoRun) go(); else { setTimeout(go,left); addEventListener('keydown',go,{once:true}); el.addEventListener('pointerdown',go,{once:true}); } }
requestAnimationFrame(frame);

// debug / test hooks
/*DEBUG-START*/window.__game={ setDraftT:v=>{ draftT=v; }, setTestMode:v=>{ testMode=v; }, kenReady:()=>KEN.ready, kenProto:()=>KEN.proto, mapInfo:()=>({sealed:curMap.sealed}), resolveWalls:f=>resolveWalls(f), holdCam:v=>{ camHold=v; }, get bulletsArr(){ return bullets; }, doBlock:f=>doBlock(f), tryBlock:(f)=>tryBlock(f), holdBot:v=>{ botHold=v; }, camera, bakeMap:id=>{ applyMap(id); return bakeCompute(id); }, bakeOn:v=>bakeSetOn(v), mapGroup:()=>curMap.group, boxCount:()=>boxes.length, SFX, art:id=>ART.svg(id), groundAt, get ramps(){return ramps;}, get hx(){return HX;}, get hz(){return HZ;}, get state(){return state;}, set state(v){state=v;}, get mode(){return mode;}, player, bot, bullets, bombs, fields, get boxes(){return boxes;}, CARDS, WAVE1:ALL_CARDS, ALL_CARDS, computeStats, score, settings, sandbox, roundInfo, remoteCtl,
  step(dt){ update(dt); }, setAuto(v){ autoRun=v; testMode=!v; }, setRender(v){ doRender=v; }, startMatch, beginRound, startDraft, startSandbox, openSandbox, tryFire, tryBlock, firePellets, doBlock, give(f,id){ (f==='bot'?bot:player).addCard(id); updateCardStrips(); }, clearCards(){ player.setCards([]); bot.setCards([]); },
  forceFight(){ state='fight'; show(UI.countdown,false); }, keys, setMouse(v){ fireHeld=v; if(v){ firePressed=true; steerLatch=false; } }, block(){ pressBlock(); }, dash(){ wantDash=true; }, jump(){ jumpBuffer=0.15; }, get frames(){return frames;}, art:ART.svg, killFighter, hasLOS, render(){ drawFrame(); }, get paused(){return paused;}, pause, camera, explode, endMatch, coachPick, applyDamage, applyMap, applyQuality, toMenu, get map(){return curMapId;} };
/*DEBUG-END*/
