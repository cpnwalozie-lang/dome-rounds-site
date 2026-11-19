// ================= WORLD + FIGHTERS =================
const BASE_POS={player:V3(), bot:V3()};
function applyMap(id){ setMap(id); bakeLoad(id); bakeUse(id); detailApply(curMap.group); bakeHook(scene); lookMap(id); const sx=curMap.spawnX*curMap.scale; BASE_POS.player.set(-sx,1,0); BASE_POS.bot.set(sx,1,0); }
applyQuality(settings.quality==='auto'?((TOUCH.on||GPU_WEAK)?'medium':'high'):settings.quality);
function gmMap(){ return settings.gm==='ffa'?'ffa':settings.gm==='battle'?'skyfort':settings.map; } // free-for-all and Battle have their own arenas
applyMap(gmMap());
const player=new Fighter('YOU',true,TEAM.player), bot=new Fighter('BOT',false,TEAM.bot);
const other=f=>f===player?bot:player; // 1v1 only
const fighters=[player,bot]; // everyone in the current match (2 in 1v1, up to 4 in FFA)
let matchKind='1v1'; // '1v1' | '2v2' | 'ffa' | 'battle'
const ffaPool=[]; // extra fighters for FFA seats 3 and 4, made on first use
const BOT_NAMES=['Bolt','Nova','Pixel','Rumble','Zip','Fizz','Comet','Dash','Blaze','Echo','Turbo','Gizmo','Rocket','Sparky','Jinx','Vex'];
function seatFighter(i){ if(i===0) return player; if(i===1) return bot; while(ffaPool.length<i-1){ const f=new Fighter('BOT',false,TEAM[SLOT_TEAMS[ffaPool.length+2]]); f.setActive(false); ffaPool.push(f); } return ffaPool[i-2]; }
function myName(){ return (settings.name||'').trim()||'You'; }
// seats: [{ctl:'local'|'ai'|'net', name}] in seat order; seat 0 is always this screen's own fighter in solo play
function setRoster(seats){ for(const f of ffaPool) f.setActive(false); fighters.length=0;
  seats.forEach((s,i)=>{ const f=s.f||seatFighter(i); f.slot=s.slot!==undefined?s.slot:i; f.side=s.side!==undefined?s.side:f.slot; f.ctl=s.ctl; f.name=s.name; f.peer=s.peer||null; f.setTeam(matchKind==='2v2'?(f.side===0?TEAM.player:TEAM.bot):TEAM[SLOT_TEAMS[f.slot]]); f.setActive(true); f.score=0; fighters.push(f); });
  if(!fighters.includes(bot)){ bot.setActive(false); } }
function roster1v1(){ matchKind='1v1'; player.name='YOU'; setRoster([{f:player,ctl:'local',name:'YOU',slot:0},{f:bot,ctl:'ai',name:'BOT',slot:1}]); }
// 2v2: you + a bot buddy (blue) against two bots (orange)
function roster2v2Solo(){ matchKind='2v2'; const names=BOT_NAMES.slice().sort(()=>Math.random()-0.5);
  setRoster([{f:player,ctl:'local',name:myName(),slot:0,side:0},{f:seatFighter(1),ctl:'ai',name:names[0],slot:1,side:1},{f:seatFighter(2),ctl:'ai',name:names[1]+' (ally)',slot:2,side:0},{f:seatFighter(3),ctl:'ai',name:names[2],slot:3,side:1}]); }
function rosterFFASolo(){ matchKind='ffa'; const n=settings.ffaBots==='2'?2:3; const names=BOT_NAMES.slice().sort(()=>Math.random()-0.5);
  const seats=[{f:player,ctl:'local',name:myName(),slot:0}]; for(let i=1;i<=n;i++) seats.push({f:seatFighter(i),ctl:'ai',name:names[i-1],slot:i}); setRoster(seats); }

// ================= STATE =================
let state='menu'; // menu, countdown, fight, roundover, draft, picked, matchover
let mode='match'; // match | sandbox
const sandbox={cards:[],bot:'dummy',open:false};
let paused=false, roundOverT=0, slowMoT=0, countdownT=0, countdownStep=0, roundNum=1, lastWinner=null, matchOverPending=false;
const score={player:0,bot:0};
let clipHook=null, clipLists=null, clipSave=null, clipSet=null; /* set by the clip recorder (p6d_clip) */
let btHook=null; /* set by Battle mode (p7b_battle) */
let camHold=false, botHold=false, botPuppet=false, killMarkT=0, shakeT=0, hitMarkerT=0, hurtT=0, crossKick=0, gameT=0, dmgDirT=0, tipsT=0; const aimPoint=V3(), dmgFrom=V3();
const botLevel=()=> mode==='sandbox' ? (DIFF[sandbox.bot]||DIFF.easy) : matchKind==='battle' ? DIFF.normal : (DIFF[settings.diff]||DIFF.easy);

// ================= DOM =================
const UI={}; ['btOver','btNext','btOverTitle','btRows','roundClock','draftClock','loading','hud','pipsYou','pipsBot','roundPill','roundSub','hpBot','hpBotT','cardsBot','youFace','botFace','hpYou','hpYouGhost','hpYouT','statusYou','ammo','cardsYou','blockCd','dashCd','crosshair','reloadRing','hitmark','vignette','hurt','toasts','botTag','botTagFill','banner','bannerSplat','bannerText','countdown','cdSplat','cdText','start','startBtn','sandboxBtn','pause','resumeBtn','quitBtn','pauseStats','pauseCards','draft','draftTitle','draftSub','cards','coach','statbar','steer','tips','dmgdir','botPanel','matchover','moTitle','moSub','moStats','moCards','againBtn','menuBtn','logoSplat','howBtn','how','fsBtn','sandbox','sbxCards','sbxGo','sbxClear','sbxQuit','sbxBuild','ffaBoard','tagLayer','specMsg'].forEach(k=>UI[k]=$(k));
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
document.querySelectorAll('[data-k]').forEach(el=>{ el.addEventListener(el.tagName==='SELECT'?'change':'input',()=>{ const k=el.dataset.k; settings[k]= el.type==='checkbox'? el.checked : (el.tagName==='SELECT'? el.value : parseFloat(el.value)); if(k==='vol') SFX.setVol(settings.vol); if(k==='clips'&&clipSet) clipSet(settings.clips); if(k==='music') SFX.setMusicVol(settings.music); if(k==='quality'){ perfLevel=0; applyQuality(settings.quality==='auto'?((TOUCH.on||GPU_WEAK)?'medium':'high'):settings.quality); } saveSettings(); syncSettingsUI(); }); });
document.querySelectorAll('[data-seg] button').forEach(b=>{ b.addEventListener('click',()=>{ const k=b.parentElement.dataset.seg, v=b.dataset.v; SFX.unlock(); SFX.hover();
  if(k==='sbot'){ sandbox.bot=v; } else { settings[k]=v; saveSettings(); if(k==='map'&&(state==='menu'||sandbox.open)&&!(state==='menu'&&settings.gm==='ffa')){ applyMap(v); if(state==='menu'){ placeAtBases(); } else sandbox.remap=true; }
    if((k==='gm'||k==='ffaBots')&&state==='menu'&&!sandbox.open){ const mp=gmMap(); if(curMapId!==mp) applyMap(mp); menuRoster(); for(const f of fighters){ f.resetRound(); f.setCards([]); } placeAtBases(); } if(k==='gm'){ lobbyRender(); if(btHook) btHook.menuUI(); } }
  syncSettingsUI(); }); });
syncSettingsUI();
UI.howBtn.addEventListener('click',()=>{ UI.how.classList.toggle('open'); if(UI.how.classList.contains('open')) setTimeout(()=>{ try{ UI.how.scrollIntoView({behavior:'smooth',block:'nearest'}); }catch(e){} },30); }); // on short laptop screens the panel opens below the fold
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
  if((state==='draft'||(btHook&&btHook.picking))&&['Digit1','Digit2','Digit3'].includes(e.code)){ const c=UI.cards.children[parseInt(e.code.slice(5))-1]; if(c) c.click(); }
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
function requestLock(){ if(locked||pad.used||TOUCH.on) return; try{ const p=canvas.requestPointerLock(); if(p&&p.catch) p.catch(()=>{ mouseFallback=true; }); }catch(err){ mouseFallback=true; } }
document.addEventListener('pointerlockchange',()=>{ locked=document.pointerLockElement===canvas; if(locked) mouseFallback=false; document.body.classList.toggle('nolock',!locked&&mouseFallback); if(!locked&&(state==='fight'||state==='countdown')&&!paused&&!pad.used&&!(btHook&&(btHook.picking||btHook.lockFree()))) pause(); });
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
  else if(state==='menu'){ if(just(0)||just(9)){ SFX.unlock(); if(settings.gm==='battle'&&btHook) btHook.play(); else startMatch(); } if(just(3)) openSandbox(); }
  else if(state==='matchover'){ if(just(0)||just(9)) startMatch(); }
  else if(state==='draft'||(btHook&&btHook.picking)){ const n=UI.cards.children.length; pad.navT-=dt; const dir=(b[15]||lx>0.5?1:0)-(b[14]||lx<-0.5?1:0); if(dir&&pad.navT<=0){ pad.focus=(pad.focus+dir+n)%n; pad.navT=0.25; SFX.hover(); } if(!dir) pad.navT=0; for(let i=0;i<n;i++){ const c=UI.cards.children[i]; c.classList.toggle('focus',i===pad.focus); } if(n&&UI.cards.children[pad.focus]._hover) UI.cards.children[pad.focus]._hover(); if(just(0)&&n) UI.cards.children[pad.focus].click(); }
  else if(state==='fight'||state==='countdown'){ pad.lx=lx; pad.ly=ly; look(rx*3.1*dt*settings.sens, ry*2.1*dt*settings.sens); pad.fire=b[7]; if(just(7)){ firePressed=true; steerLatch=false; } if(just(6)||just(4)) pressBlock(); if(just(0)) jumpBuffer=0.15; if(just(1)||just(2)||just(5)) wantDash=true; if(just(9)) pause(); if(just(8)){ if(mode==='sandbox') openSandbox(); else if(clipSave) clipSave(); } }
  pad.prev=b;
}

// ================= FLOW =================
function placeAtBases(){
  for(const f of fighters) if(f.ai) f.ai.fresh=true; // bots get their bearings again
  if(matchKind==='battle'&&btHook){ btHook.placeAll(); return; }
  if(matchKind==='2v2'){ const k={0:0,1:0}; for(const f of fighters.slice().sort((a,b)=>a.slot-b.slot)){ const base=f.side===0?BASE_POS.player:BASE_POS.bot, off=(k[f.side]++===0?-1:1)*2.3; const x=base.x, z=base.z+off; const g=groundAt(x,z,8,0.3); f.pos.set(x,g===null?base.y:g,z); f.vel.set(0,0,0); f.yaw=f.side===0?-Math.PI/2:Math.PI/2; f.pitch=0; f.onGround=true; f.spawn.copy(f.pos); } if(NET.on) for(const f of fighters) f.rs=null; return; }
  if(matchKind==='ffa'){ const sp=(curMap.spawns||[]); for(const f of fighters){ const s=sp[f.slot%sp.length]||[0,0]; const g=groundAt(s[0],s[1],8,0.3); f.pos.set(s[0],g===null?1:g,s[1]); f.vel.set(0,0,0); f.yaw=Math.atan2(s[0],s[1]); f.pitch=0; f.onGround=true; f.spawn.copy(f.pos); } if(NET.on) for(const f of fighters) f.rs=null; return; }
  const sw=NET.on&&NET.role==='guest'; // the guest spawns at the far base so both screens agree on the world
  player.pos.copy(sw?BASE_POS.bot:BASE_POS.player); player.vel.set(0,0,0); player.yaw=sw?Math.PI/2:-Math.PI/2; player.pitch=0; player.onGround=true;
  bot.pos.copy(sw?BASE_POS.player:BASE_POS.bot); bot.vel.set(0,0,0); bot.yaw=sw?-Math.PI/2:Math.PI/2; bot.pitch=0; bot.onGround=true; if(NET.on){ NET.rs=null; bot.rs=null; }
  player.spawn.copy(player.pos); bot.spawn.copy(bot.pos);
}
function clearProjectiles(){ for(let i=bullets.length-1;i>=0;i--) removeBullet(i); for(const b of bombs) scene.remove(b.m); bombs.length=0; for(const e of explosions){ scene.remove(e.m); scene.remove(e.m2); } explosions.length=0; clearFields(); clearCardFx(); remoteCtl.b=null; }
function resetInputs(){ fireHeld=false; firePressed=false; blockBuf=0; wantDash=false; jumpBuffer=0; }
function beginRound(){ bakeHook(scene);
  clearProjectiles(); for(const f of fighters){ f.resetRound(); aiReset(f); } placeAtBases(); resetInputs();
  roundInfo.shots=0; roundInfo.hits=0; roundInfo.dmg=0; roundInfo.botBlocked=0; roundInfo.t=0; roundInfo.cause=''; roundInfo.botHpFrac=1;
  clockTick=-1; state='countdown'; countdownT=3.2; countdownStep=-1; show(UI.hud,true,'block'); UI.hud.classList.remove('sandboxmode'); UI.hud.classList.toggle('ffamode',matchKind!=='1v1'); hurtT=0; dmgDirT=0; if(roundNum===1) tipsT=9; buildPips(); updateHUD(); updateCardStrips(); SFX.music('fight');
}
function startMatch(){
  mode='match'; sandbox.open=false; show(UI.sandbox,false); if(!NET.on){ if(settings.gm==='ffa') rosterFFASolo(); else if(settings.gm==='2v2') roster2v2Solo(); else roster1v1(); }
  { const mp=matchKind==='ffa'?'ffa':((NET.on&&NET.role==='guest'&&NET.hostMap)?NET.hostMap:settings.map); if(curMapId!==mp) applyMap(mp); } document.getElementById('online').classList.remove('open');
  score.player=0; score.bot=0; roundNum=1; for(const f of fighters){ f.setCards([]); f.score=0; } matchOverPending=false; lastWinner=null; ffaBoardKey='';
  for(const k in matchStats) matchStats[k]=0;
  UI.roundSub.textContent= matchKind==='2v2'? (NET.on?'2V2 · FIRST TO 5 · ROOM '+NET.code:'2V2 · FIRST TO 5 · '+botLevel().name.toUpperCase()+' BOTS') : matchKind==='ffa'? (NET.on?'FREE FOR ALL · FIRST TO 5 · ROOM '+NET.code:'FREE FOR ALL · FIRST TO 5') : NET.on? 'ONLINE · FIRST TO 5 · ROOM '+NET.code : 'FIRST TO 5 · '+botLevel().name.toUpperCase()+' BOT';
  show(UI.matchover,false); show(UI.start,false); show(UI.draft,false); paused=false; show(UI.pause,false); beginRound();
}
const menuCam={key:'',a:0};
function toMenu(){ hideTags(); if(btHook) btHook.stop(); if(NET.on) netLeave(); paused=false; sandbox.open=false; mode='match'; show(UI.sandbox,false); show(UI.pause,false); show(UI.hud,false); show(UI.countdown,false); show(UI.draft,false); show(UI.matchover,false); clearProjectiles(); for(const f of fighters) f.setCards([]); roster1v1(); player.resetRound(); bot.resetRound(); { const mp=gmMap(); if(curMapId!==mp) applyMap(mp); } menuRoster(); placeAtBases(); state='menu'; show(UI.start,true,'block'); exitLock(); SFX.music('menu'); }
const ROUND_LIMIT=300, DRAFT_LIMIT=60; let draftT=0, draftTick=-1, clockTick=-1;
function timeUp(){ if(matchKind==='2v2'){ const al=fighters.filter(f=>!f.dead&&f.active!==false); const tot=s=>al.filter(f=>f.side===s).reduce((a,f)=>a+f.hp/f.maxHp(),0); const keep=tot(0)>=tot(1)?0:1; toast(`<b>TIME!</b> The team with more health left takes the round`,'status'); for(const f of al) if(f.side!==keep&&state==='fight'){ if(f===player) roundInfo.cause='time'; killFighter(f,al.find(x=>x.side===keep)); } return; }
  if(matchKind==='ffa'){ const al=fighters.filter(f=>!f.dead&&f.active!==false).sort((a,b)=>b.hp/b.maxHp()-a.hp/a.maxHp()); toast(`<b>TIME!</b> Most health left takes the round`,'status'); const keep=al[0]; for(const f of al.slice(1)){ if(f===player) roundInfo.cause='time'; if(state==='fight') killFighter(f,keep); } return; }
  const pf=player.hp/player.maxHp(), bf=bot.hp/bot.maxHp(); const loser= pf<bf?player:(bf<pf?bot:(Math.random()<0.5?player:bot)); toast(`<b>TIME!</b> Most health left takes the round`,'status'); if(loser===player) roundInfo.cause='time'; killFighter(loser,other(loser)); }
const CAUSE={time:'Time ran out and the bot had more health left.',fall:'You fell off the edge.',shot:'The bot\'s shot finished you.',blast:'You were caught in an explosion.',bomb:'A bomb got you.',aura:'The bot\'s aura drained you.',dome:'The bot\'s dome effect got you.',poison:'Poison finished you.',cloud:'A toxic cloud finished you.',nova:'The supernova got you.'};
function onRoundEnd(winner){
  if(matchKind!=='1v1'){ const youWon=matchKind==='2v2'?(winner&&winner.side===player.side):winner===player; if(youWon){ showBanner(matchKind==='2v2'?'YOUR TEAM WINS!':'ROUND WON!','#27c46b','win'); SFX.win(); } else { showBanner(!winner?'NOBODY WINS':matchKind==='2v2'?'THEY TAKE IT':winner.name.toUpperCase()+' WINS IT','#e0364f','lose'); SFX.lose(); }
    if(fighters.some(f=>f.score>=CFG.winsToTakeMatch)) matchOverPending=true; ffaBoardKey=''; updateHUD(); return; }
  const youWon=winner.isPlayer;
  if(youWon){ showBanner('ROUND WON!','#27c46b','win'); SFX.win(); } else { showBanner('KNOCKED OUT!','#e0364f','lose'); SFX.lose(); }
  const foe=NET.on?'Rival':'Bot'; toast(youWon? `<b class="you">You</b> knocked out <b class="bot">${foe}</b>` : (CAUSE[roundInfo.cause]||'The bot knocked you out.').replace(/bot/g,NET.on?'rival':'bot'), youWon?'you':'bot');
  if(score.player>=CFG.winsToTakeMatch||score.bot>=CFG.winsToTakeMatch) matchOverPending=true;
  buildPips(); updateHUD();
}
function pause(){ /*DEBUG-START*/window.__ps=(window.__ps||[]).concat([new Error().stack.split("\n").slice(1,5).join(" | ")]);/*DEBUG-END*/ if(paused) return; paused=!NET.on; exitLock(); fillStats(UI.pauseStats,UI.pauseCards); if(btHook) btHook.pauseUI(); show(UI.pause,true,'block'); }
function resume(){ if(sandbox.open) return; paused=false; show(UI.pause,false); requestLock(); last=performance.now(); }
function togglePause(){ if(paused) resume(); else pause(); }
UI.resumeBtn.addEventListener('click',()=>resume());
UI.quitBtn.addEventListener('click',()=>toMenu());
UI.menuBtn.addEventListener('click',()=>toMenu());
UI.startBtn.addEventListener('click',()=>{ SFX.unlock(); if(settings.gm==='battle'&&btHook){ btHook.play(); return; } if(NET.on) netLeave(); requestLock(); startMatch(); });
UI.againBtn.addEventListener('click',()=>{ SFX.unlock(); if(NET.on){ if(NET.role==='host'){ requestLock(); netHostStart(); } else toast('Waiting for the room host to start the rematch…','status'); return; } requestLock(); startMatch(); });
function fillStats(statsEl,cardsEl){ if(clipLists) clipLists();
  const acc=matchStats.shots? Math.round(matchStats.hits/matchStats.shots*100):0;
  statsEl.innerHTML=[['Score',mode==='sandbox'?'–':matchKind==='2v2'?player.score+' – '+(fighters.find(f=>f.side!==player.side)||{score:0}).score:matchKind==='ffa'?fighters.map(f=>f.score).join(' · '):score.player+' – '+score.bot],['Damage dealt',Math.round(matchStats.dmg)],['Damage taken',Math.round(matchStats.taken)],['Accuracy',acc+'%'],['Shots blocked',matchStats.blocked],['Cards',player.cards.length]].map(s=>`<div class="stat"><b>${s[1]}</b><span>${s[0]}</span></div>`).join('');
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
{ let lp=null, lpDone=false; UI.sbxCards.addEventListener('touchstart',e=>{ const b=e.target.closest('.chip'); if(!b) return; lpDone=false; clearTimeout(lp); lp=setTimeout(()=>{ const i=sandbox.cards.lastIndexOf(b.dataset.id); if(i>=0){ sandbox.cards.splice(i,1); lpDone=true; try{ navigator.vibrate&&navigator.vibrate(15); }catch(_){} SFX.hover(); renderSandbox(); } },450); },{passive:true}); // press and hold removes a copy on touch
  for(const ev of ['touchend','touchmove','touchcancel']) UI.sbxCards.addEventListener(ev,()=>clearTimeout(lp),{passive:true}); UI.sbxCards.addEventListener('click',e=>{ if(lpDone){ lpDone=false; e.stopImmediatePropagation(); } },true); }
UI.sbxClear.addEventListener('click',()=>{ sandbox.cards=[]; renderSandbox(); });
UI.sbxQuit.addEventListener('click',()=>toMenu());
UI.sandboxBtn.addEventListener('click',()=>{ SFX.unlock(); if(NET.on) netLeave(); openSandbox(); });
UI.sbxGo.addEventListener('click',()=>{ SFX.unlock(); if(mode==='sandbox'&&state==='fight'&&!sandbox.remap) closeSandbox(); else startSandbox(); });
function openSandbox(){ sandbox.open=true; if(state==='fight') paused=true; exitLock(); show(UI.pause,false); show(UI.start,false); renderSandbox(); syncSettingsUI(); UI.sbxGo.textContent=(mode==='sandbox'&&state==='fight')?'BACK TO TRAINING':'START TRAINING'; show(UI.sandbox,true,'block'); }
function sandboxBotSpot(){ const sx=BASE_POS.player.x+9; const g=groundAt(sx,0,3,0.3); return V3(sx,g===null?0:g,0); }
function setupSandboxBot(){ bot.setCards([]); bot.resetRound(); aiReset(bot); if(sandbox.bot==='none'){ bot.dead=true; bot.mesh.visible=false; bot.respawnT=0; } else if(sandbox.bot==='dummy'){ bot.pos.copy(sandboxBotSpot()); bot.yaw=Math.PI/2; } else { bot.pos.copy(BASE_POS.bot); bot.yaw=Math.PI/2; } bot.vel.set(0,0,0); show(UI.botPanel,sandbox.bot!=='none'); }
function applySandboxLoadout(){ const hpFrac=1; player.setCards(sandbox.cards); player.hp=player.maxHp()*hpFrac; player.ammo=player.stats.ammo; player.reloading=false; player.blockCdT=0; updateCardStrips(); }
function closeSandbox(){ sandbox.open=false; paused=false; show(UI.sandbox,false); applySandboxLoadout(); if(sandbox.botWas!==sandbox.bot){ sandbox.botWas=sandbox.bot; setupSandboxBot(); } requestLock(); last=performance.now(); toast('Loadout updated. '+(TOUCH.on?'Tap the cards button':'<b>TAB</b>')+' to change it again.','you'); }
function startSandbox(){
  roster1v1(); UI.hud.classList.remove('ffamode'); mode='sandbox'; sandbox.open=false; sandbox.remap=false; paused=false; if(curMapId!==settings.map) applyMap(settings.map);
  show(UI.sandbox,false); show(UI.start,false); show(UI.matchover,false); show(UI.draft,false); show(UI.pause,false); show(UI.countdown,false);
  for(const k in matchStats) matchStats[k]=0; score.player=0; score.bot=0; roundNum=1; clearProjectiles(); resetInputs();
  player.setCards(sandbox.cards); player.resetRound(); placeAtBases(); sandbox.botWas=sandbox.bot; setupSandboxBot();
  state='fight'; show(UI.hud,true,'block'); UI.hud.classList.add('sandboxmode'); UI.roundPill.textContent='SANDBOX'; UI.roundSub.textContent=TOUCH.on?'CARDS BUTTON = CHANGE POWERS':'TAB = CHANGE POWERS'; tipsT=9; updateCardStrips(); updateHUD(); SFX.music('fight'); requestLock(); last=performance.now();
}
function respawn(f){ const keepCd=f.dashCdT; f.resetRound(); if(f.isPlayer){ f.pos.copy(BASE_POS.player); f.yaw=-Math.PI/2; f.pitch=0; } else if(sandbox.bot==='dummy') f.pos.copy(sandboxBotSpot()); else f.pos.copy(BASE_POS.bot); f.vel.set(0,0,0); f.invulnT=1; burst(f.center(),f.team.light,14,5,0.1,0.5,0); shockRing(V3(f.pos.x,f.pos.y+0.06,f.pos.z),f.team.light,2,0.4); }

// ================= DRAFT: cards, coach pick, stat preview =================
const TYPE_ICON={ gun:'<circle cx="13" cy="12" r="6" fill="currentColor"/><path d="M2 12h4M3 7h3M3 17h3" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>', dome:'<path d="M3 18a9 9 0 0 1 18 0Z" fill="currentColor"/>', aura:'<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-dasharray="4 3"/><circle cx="12" cy="12" r="3.5" fill="currentColor"/>', body:'<path d="M12 20C4 13 3 6 8.5 5c2-.3 3.2 1.4 3.5 2.4.3-1 1.5-2.7 3.5-2.4C21 6 20 13 12 20Z" fill="currentColor"/>' };
const typeIcon=t=>`<svg viewBox="0 0 24 24">${TYPE_ICON[t]}</svg>`;
function pick3(){ const pool=ALL_CARDS.slice(), out=[]; for(let k=0;k<3&&pool.length;k++){ out.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]); } return out; } // every card has the same odds
function botPick(f,quiet){ f=f||bot; const opts=pick3(); const w=opts.map(id=>({id,w:(['glasscannon','remote','demonicpact'].includes(id)?0.4:1)+Math.random()})); w.sort((a,b)=>b.w-a.w); const id=w[0].id; f.addCard(id); if(!quiet) toast(matchKind==='ffa'?`<b style="color:${f.team.css}">${esc(f.name)}</b> took <b>${CARDS[id].name}</b>`:`<b class="bot">Bot</b> took <b>${CARDS[id].name}</b>`,'bot'); return id; }
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
  state='draft'; clearProjectiles(); for(const f of fighters) f.resetRound(); placeAtBases(); roundNum++; exitLock(); show(UI.hud,false); UI.banner.className='banner'; SFX.music('draft');
  const ffa=matchKind!=='1v1'; // FFA and 2v2: everyone picks every round
  const playerLost = matchKind==='2v2'? !(lastWinner&&lastWinner.side===player.side) : ffa? lastWinner!==player : lastWinner===bot; for(const f of fighters) f.setMood(f===lastWinner?'happy':'worried',999);
  if(ffa){ for(const f of fighters) if(f.ctl==='ai'&&(!NET.on||NET.role==='host')) botPick(f); }
  else if(!playerLost&&!NET.on) botPick();
  const opts=pick3(); const rec=coachPick(opts,playerLost); pad.focus=Math.max(0,opts.indexOf(rec.id));
  UI.draftTitle.textContent='PICK A CARD'; draftT=DRAFT_LIMIT; draftTick=-1; UI.draftClock.textContent=DRAFT_LIMIT+'s'; UI.draftClock.classList.remove('warn');
  UI.draftSub.textContent= ffa? (!playerLost?'You won that round! Everyone picks a card.':'Everyone picks a card. Make it count.') : NET.on? (playerLost?'You lost that round. Pick a card, your rival is picking too.':'You won that round. Pick a card, your rival is picking too.') : playerLost? 'You lost that round, so you pick first.' : 'You won! The bot picked first. Your turn.';
  UI.coach.innerHTML=`<b>COACH:</b> take <em style="color:${CARDS[rec.id].c}">${CARDS[rec.id].name}</em>. ${rec.why}`;
  UI.cards.innerHTML=''; renderStatbar(null);
  opts.forEach((id,i)=>{ const c=CARDS[id]; const el=document.createElement('div'); el.className=`card t-${c.type}`+(id===rec.id?' rec':''); el.style.setProperty('--c',c.c); el.style.setProperty('--i',i);
    el.innerHTML=cardHTML(id,i,player.cards.filter(x=>x===id).length,id===rec.id);
    el._hover=()=>{ if(UI.statbar._id!==id){ UI.statbar._id=id; renderStatbar(id); } };
    el.addEventListener('mousemove',ev=>{ const r=el.getBoundingClientRect(); const px=(ev.clientX-r.left)/r.width, py=(ev.clientY-r.top)/r.height; el.style.setProperty('--ry',((px-0.5)*14).toFixed(1)+'deg'); el.style.setProperty('--rx',((0.5-py)*12).toFixed(1)+'deg'); el.style.setProperty('--gx',(px*100).toFixed(0)+'%'); el.style.setProperty('--gy',(py*100).toFixed(0)+'%'); });
    el.addEventListener('mouseenter',()=>{ SFX.hover(); el._hover(); });
    el.addEventListener('mouseleave',()=>{ el.style.setProperty('--ry','0deg'); el.style.setProperty('--rx','0deg'); UI.statbar._id=null; renderStatbar(null); });
    el.addEventListener('click',()=>{ if(state!=='draft'||el.classList.contains('picked')) return; el.classList.add('picked'); for(const o of UI.cards.children) if(o!==el) o.classList.add('gone'); player.addCard(id); SFX.pick(); toast(`<b class="you">You</b> took <b>${c.name}</b>`,'you'); if(playerLost&&!NET.on&&!ffa) botPick(); state='picked'; if(NET.on){ netAfterPick(); return; } const go=()=>{ if(state!=='picked') return; show(UI.draft,false); requestLock(); beginRound(); }; if(testMode) go(); else setTimeout(go,650); });
    UI.cards.appendChild(el); setTimeout(()=>SFX.deal(),120+i*130); });
  UI.statbar._id=null; show(UI.draft,true); updateCardStrips();
}
function endMatch(){
  state='matchover'; exitLock(); SFX.music('menu');
  let won=score.player>score.bot; if(matchKind==='2v2'){ const op=fighters.find(f=>f.side!==player.side); won=player.score>(op?op.score:0); UI.moTitle.textContent=won?'YOUR TEAM WINS!':'ORANGE TEAM WINS'; UI.moSub.textContent=`${player.score} – ${op?op.score:0}. `+(won?'Great teamwork.':'Regroup and run it back.'); }
  else if(matchKind==='ffa'){ const top=fighters.slice().sort((a,b)=>b.score-a.score)[0]; won=top===player; UI.moTitle.textContent=won?'YOU WIN!':esc(top.name).toUpperCase()+' WINS'; UI.moSub.textContent=fighters.slice().sort((a,b)=>b.score-a.score).map((f,i)=>`${i+1}. ${f===player?myName():f.name}  ${f.score}`).join('   '); }
  else { UI.moTitle.textContent=won?'YOU WIN!':(NET.on?'RIVAL WINS':'BOT WINS'); UI.moSub.textContent=won?'Champion of the arena. Try a harder bot next?':'So close. Try the Easy bot, or practise your build in the sandbox.'; } UI.moTitle.className='title stroke '+(won?'win':'lose');
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
  if(matchKind==='battle'&&btHook) btHook.hud(); else if(mode!=='sandbox'){ UI.roundPill.textContent='ROUND '+roundNum; const left=Math.max(0,ROUND_LIMIT-roundInfo.t), m=Math.floor(Math.ceil(left)/60), sec=Math.ceil(left)%60; UI.roundClock.textContent=m+':'+String(sec).padStart(2,'0'); UI.roundClock.classList.toggle('warn',left<=30); UI.roundClock.style.display=''; } else UI.roundClock.style.display='none';
  const bk=player.blockCdT>0? (1-player.blockCdT/player.stats.blockCd):1; UI.blockCd.style.setProperty('--p',(bk*100).toFixed(1)+'%'); UI.blockCd.classList.toggle('ready',bk>=1&&player.silenceT<=0); UI.blockCd.classList.toggle('off',player.silenceT>0);
  const cdTxt=player.blockCdT>0.05? player.blockCdT.toFixed(1) : ''; if(UI.blockCd._t!==cdTxt){ UI.blockCd._t=cdTxt; UI.blockCd.dataset.t=cdTxt; }
  const dk=player.dashCdT>0? (1-player.dashCdT/CFG.dashCd):1; UI.dashCd.style.setProperty('--p',(dk*100).toFixed(1)+'%'); UI.dashCd.classList.toggle('ready',dk>=1);
  const st=[]; if(player.slowT>0||player.auraSlow>0) st.push('<i class="s-slow">SLOWED</i>'); if(player.stunT>0) st.push('<i class="s-stun">STUNNED</i>'); if(player.poisons.length) st.push('<i class="s-psn">POISONED</i>'); if(player.silenceT>0) st.push('<i class="s-sil">SILENCED</i>'); if(player.brawlT>0) st.push('<i class="s-buff">BRAWLER</i>'); if(player.tasteT>0||player.chasing) st.push('<i class="s-buff">SPEED</i>'); if(player.invulnT>0) st.push('<i class="s-stun">SAFE</i>');
  const sh=st.join(''); if(UI.statusYou._h!==sh){ UI.statusYou._h=sh; UI.statusYou.innerHTML=sh; }
  UI.vignette.style.opacity=String(clamp((0.35-ph)*2.4,0,0.85)); UI.hurt.style.opacity=String(clamp(hurtT*2.5,0,0.8));
  UI.hitmark.style.opacity=hitMarkerT>0?'1':'0'; UI.hitmark.classList.toggle('kill',killMarkT>0); UI.hitmark.style.transform=`translate(-50%,-50%) rotate(45deg) scale(${(1+hitMarkerT*3).toFixed(2)})`;
  UI.crosshair.style.setProperty('--k',(crossKick*10).toFixed(1)+'px');
  if(matchKind!=='1v1') updateFFAHud(); else { hideTags(); if(UI.specMsg._on){ UI.specMsg._on=false; UI.specMsg.style.display='none'; } }
  const steering=!!remoteCtl.b; if(UI.steer._on!==steering){ UI.steer._on=steering; UI.steer.style.display=steering?'block':'none'; }
  const tips=tipsT>0&&state==='fight'; if(UI.tips._on!==tips){ UI.tips._on=tips; UI.tips.style.display=tips?'block':'none'; }
  if(dmgDirT>0&&!player.dead){ const to=V3().subVectors(dmgFrom,player.pos); const a=Math.atan2(-to.x,-to.z)-player.yaw; UI.dmgdir.style.opacity=String(Math.min(1,dmgDirT*1.6)); UI.dmgdir.style.transform=`translate(-50%,-50%) rotate(${(-a*180/Math.PI).toFixed(1)}deg)`; } else UI.dmgdir.style.opacity='0';
  if(!bot.dead&&bot.mesh.visible&&(state==='fight'||state==='countdown')){ _proj.copy(bot.center()); _proj.y+=1.1; _proj.project(camera); if(_proj.z<1&&Math.abs(_proj.x)<1.1&&Math.abs(_proj.y)<1.1){ UI.botTag.style.display='block'; UI.botTag.style.opacity=hasLOS(camera.position,bot.center())?'1':'0.45'; UI.botTag.style.transform=`translate(-50%,-100%) translate(${((_proj.x+1)/2*window.innerWidth).toFixed(1)}px,${((1-_proj.y)/2*window.innerHeight).toFixed(1)}px)`; } else UI.botTag.style.display='none'; } else UI.botTag.style.display='none';
}

// ---- FFA scoreboard + name tags over every rival ----
let ffaBoardKey=''; const ffaRows=new Map(), tagEls=new Map();
function updateFFAHud(){
  const key=fighters.map(f=>f.id+':'+f.score+':'+(f.dead?1:0)+':'+f.name).join('|');
  if(matchKind==='battle'){ if(btHook) btHook.board(); }
  else if(key!==ffaBoardKey){ ffaBoardKey=key; UI.ffaBoard.innerHTML=fighters.slice().sort((a,b)=>matchKind==='2v2'?(a.side-b.side)||(a.slot-b.slot):b.score-a.score).map(f=>`<div class="fb-row${f===player?' me':''}${f.dead?' out':''}" style="--c:${f.team.css}" data-id="${f.id}"><i class="fb-sw"></i><span class="fb-nm">${esc(f===player?myName():f.name)}${f===player&&myName()!=='You'?' <small>(you)</small>':''}</span><span class="fb-pp">${Array.from({length:CFG.winsToTakeMatch},(_,k)=>`<i class="${k<f.score?'on':''}"></i>`).join('')}</span><span class="fb-hp"><b></b></span></div>`).join('');
    ffaRows.clear(); for(const el of UI.ffaBoard.children) ffaRows.set(+el.dataset.id,el.querySelector('.fb-hp b')); }
  for(const f of fighters){ const b=ffaRows.get(f.id); if(b) b.style.width=(f.dead?0:clamp(f.hp/f.maxHp(),0,1)*100).toFixed(1)+'%'; }
  const live=new Set(), on=state==='fight'||state==='countdown';
  for(const f of fighters){ if(f===player||f.dead||f.active===false||!f.mesh.visible||!on) continue; _proj.copy(f.center()); _proj.y+=1.1; _proj.project(camera); if(!(_proj.z<1&&Math.abs(_proj.x)<1.1&&Math.abs(_proj.y)<1.1)) continue;
    let el=tagEls.get(f); if(!el){ el=document.createElement('div'); el.className='ntag'; el.innerHTML='<b></b><div class="tb"><i></i></div>'; UI.tagLayer.appendChild(el); tagEls.set(f,el); }
    const nb=el.firstChild; if(nb._t!==f.name){ nb._t=f.name; nb.textContent=f.name; } el.style.setProperty('--c',f.team.css); el.lastChild.firstChild.style.width=(clamp(f.hp/f.maxHp(),0,1)*100).toFixed(1)+'%';
    el.style.display='block'; el.style.opacity=hasLOS(camera.position,f.center())?'1':'0.45'; el.style.transform=`translate(-50%,-100%) translate(${((_proj.x+1)/2*window.innerWidth).toFixed(1)}px,${((1-_proj.y)/2*window.innerHeight).toFixed(1)}px)`; live.add(f); }
  for(const [f,el] of tagEls) if(!live.has(f)) el.style.display='none';
  const spec=player.dead&&state==='fight'&&matchKind!=='battle'; if(UI.specMsg._on!==spec){ UI.specMsg._on=spec; UI.specMsg.style.display=spec?'block':'none'; }
  if(spec){ const w=camFighter(); const t=w&&w!==player?'Watching '+w.name+' · you\'re back next round':'You\'re back next round'; if(UI.specMsg._t!==t){ UI.specMsg._t=t; UI.specMsg.textContent=t; } } }
function hideTags(){ for(const el of tagEls.values()) el.style.display='none'; }
function ffaKnockout(f,by,left){ const nm=x=>x===player?'You':esc(x.name);
  toast(by?`<b style="color:${by.team.css}">${nm(by)}</b> knocked out <b style="color:${f.team.css}">${nm(f)}</b>`:`<b style="color:${f.team.css}">${nm(f)}</b> ${f===player?'are':'is'} out`, f===player?'bot':(by===player?'you':'status'));
  if(f===player&&left>1){ showBanner('KNOCKED OUT!','#e0364f','lose'); SFX.lose(); specT=null; }
  if(by===player){ hitMarkerT=0.45; killMarkT=0.45; } ffaBoardKey=''; }
// the menu shows the line-up for the mode you've picked
function menuRoster(){ if(NET.on) return; if(settings.gm==='ffa'||settings.gm==='battle') rosterFFASolo(); else if(settings.gm==='2v2') roster2v2Solo(); else roster1v1(); document.body.classList.toggle('gm-ffa',settings.gm==='ffa'); document.body.classList.toggle('gm-battle',settings.gm==='battle'); }

// ================= BOT AI =================
// Bots play like people: they only know what a player in their spot could know.
// - They see what's in front of them (about a screen's width), never through walls or behind them.
//   They hear gunfire nearby and feel it when they're hit, which tells them roughly where to look.
// - Anything new they see takes a human reaction time before they act on it.
// - They aim like a hand on a mouse: a fast flick that slows as it lands, a little wobble, and they lead a
//   moving target from how it has been moving, so a sudden change of direction throws them off.
// - They can only dome a shot they saw coming, and they time it like a person (sometimes early, sometimes late).
// Levels: easy = a beginner, normal = a very good player, hard = a competitive player. Same health, speed and damage as you.
const AI_LV={
  easy:{ react:[0.42,0.66], tau:0.2, turn:3.2, wob:0.07, predict:0.15, lead:0.3, lag:0.4, fov:0.85, cone:2.2, dwell:0, range:24,
    block:0.18, bTime:[0.05,0.75], dodge:0.04, strafe:0.35, strafeT:[1.2,2.8], still:0.55, jumpT:[3.5,8], cover:0, dome:0, push:0, mem:2.5, hear:14,
    burst:[0.25,0.7], pause:[0.35,0.9], scan:[2.5,4.5], arc:0.6, flinch:0.12, moveErr:0.6, panic:0.06, walls:true },
  normal:{ react:[0.24,0.34], tau:0.11, turn:7, wob:0.03, predict:0.6, lead:0.75, lag:0.22, fov:1.0, cone:0.85, dwell:0.1, range:32,
    block:0.6, bTime:[0.08,0.42], dodge:0.28, strafe:0.9, strafeT:[0.45,1.3], still:0.1, jumpT:[1.6,3.6], cover:0.45, dome:0.7, push:0.3, mem:4, hear:22,
    burst:null, scan:[1.6,3], arc:0.95, flinch:0.06, moveErr:0.35, panic:0 },
  hard:{ react:[0.17,0.24], tau:0.065, turn:12, wob:0.015, predict:0.9, lead:0.95, lag:0.12, fov:1.08, cone:0.6, dwell:0.06, range:40,
    block:0.85, bTime:[0.1,0.3], dodge:0.5, strafe:1, strafeT:[0.22,0.75], still:0, jumpT:[0.9,2.2], cover:0.85, dome:0.95, push:0.75, mem:6, hear:28,
    burst:null, scan:[1,2], arc:1, flinch:0.03, moveErr:0.2, panic:0 } };
for(const k in AI_LV){ DIFF[k].ai=AI_LV[k]; DIFF[k].dmg=1; DIFF[k].speed=1; }
const aiProf=b=>((b.lv||botLevel()).ai)||AI_LV.normal;
const wrapA=a=>{ while(a>Math.PI) a-=2*Math.PI; while(a<-Math.PI) a+=2*Math.PI; return a; };
const gauss=()=>(Math.random()+Math.random()+Math.random()-1.5)*2;
const aiRand=r=>rand(r[0],r[1]);
function aiReset(f){ f.ai={ know:new Map(), vEst:new Map(), bseen:new Map(), tgt:null, tgtT:0, visT:Math.random()*0.1, yaw:null, pitch:0, ox:0, oy:0, tox:0, toy:0, noiseT:0, hitT:f.lastHitT||-99,
  strafe:Math.random()<0.5?-1:1, strafeT:rand(0.5,1.5), jumpT:rand(1.5,3), stuckT:0, lastPos:f.pos.clone(), trig:true, trigT:0, still:false, stillT:0,
  blockBul:null, blockWin:0, decidedT:-9, wander:null, wanderT:0, scanT:0, scanOff:0, cover:null, coverT:0, holdT:0, coverRoll:false, rollT:0, pushRoll:false, domeWas:false, domeHold:false, fresh:true }; }
// can b see point p right now? (in front of them and not behind a wall)
function aiSees(b,A,P,p,eye){ const dx=p.x-eye.x, dz=p.z-eye.z; const d=Math.hypot(dx,dz); if(d>3.2&&Math.abs(wrapA(Math.atan2(-dx,-dz)-A.yaw))>P.fov) return false; return hasLOS(eye,p); }
function aiKnow(A,e){ let k=A.know.get(e); if(!k){ k={pos:e.pos.clone(),t:-99,at:0,vis:false,seenT:-99}; A.know.set(e,k); } return k; }
// heard or felt something: they know roughly where, and turn that way once they've reacted
function aiAlert(A,P,e,noise){ const k=aiKnow(A,e); if(k.vis) return; const quiet=gameT-Math.max(k.t,k.seenT)>1.5; k.pos.set(e.pos.x+rand(-noise,noise),e.pos.y,e.pos.z+rand(-noise,noise)); k.t=gameT; if(quiet) k.at=gameT+aiRand(P.react); }
// a player's camera sits up behind their character, so they see over low cover: bots look from about the same height
const aiEye=b=>{ const e=b.center(); e.y+=1.1; return e; };
function aiSense(b,P,A){ const eye=aiEye(b);
  for(const e of enemies(b)){ const c=e.center(), hd=V3(c.x,c.y+0.6,c.z); const vis=e.mesh.visible&&(aiSees(b,A,P,c,eye)||aiSees(b,A,P,hd,eye)); const k=A.know.get(e);
    if(vis){ const n=k||aiKnow(A,e); if(!n.vis){ const recent=gameT-Math.max(n.seenT,n.t)<1.2; const at=gameT+aiRand(P.react)*(recent?0.4:1); n.at=n.at>gameT?Math.min(n.at,at):at; } /* a face you just lost behind a pillar is quicker to pick up again */ n.vis=true; n.seenT=gameT; n.t=gameT; n.pos.copy(e.pos); n.up=!hasLOS(b.center(),c); } /* only their head's showing over cover? aim there */
    else if(k) k.vis=false; }
  for(const bl of bullets){ if(bl.age>0.14) continue; const o=bl.owner; if(!o||o===b||o.side===b.side||o.dead||o.active===false) continue; const d=o.pos.distanceTo(b.pos); if(d<P.hear) aiAlert(A,P,o,1+d*0.08); }
  if((b.lastHitT||-99)>A.hitT){ A.hitT=b.lastHitT; const o=b.lastHitBy; if(o&&o!==b&&o.side!==b.side&&!o.dead) aiAlert(A,P,o,0.8); A.ox+=rand(-1,1)*P.flinch; A.oy+=rand(-1,1)*P.flinch*0.6; }
  for(const [bl] of A.bseen) if(!bullets.includes(bl)) A.bseen.delete(bl); }
function aiPick(b,P,A,dt){ A.tgtT-=dt; let best=null, bs=1e9;
  for(const e of enemies(b)){ const k=A.know.get(e); if(!k||gameT-k.t>P.mem||k.at>gameT) continue;
    let sc=b.pos.distanceTo(k.pos); if(!k.vis) sc+=10; if(e===A.tgt) sc-=A.tgtT>0?8:3; if(e===b.lastHitBy&&gameT-(b.lastHitT||-99)<3) sc-=6; if(e.hp<e.maxHp()*0.35) sc-=3; if(sc<bs){ bs=sc; best=e; } }
  if(best!==A.tgt){ A.tgt=best; A.tgtT=rand(1.2,2.8); } return best; }
function aiSpot(b,ok){ for(let i=0;i<8;i++){ const x=rand(-HX*0.7,HX*0.7), z=rand(-HZ*0.7,HZ*0.7); const g=groundAt(x,z,b.pos.y+6,0.4); if(g!==null&&(!ok||ok(x,g,z))) return V3(x,g,z); } return V3(0,b.pos.y,0); }
// somewhere close the enemy can't see: used to reload or patch up
function aiCover(b,c){ let best=null, bd=1e9; for(let i=0;i<10;i++){ const a=i/10*Math.PI*2+Math.random()*0.5, r=rand(3,7); const x=b.pos.x+Math.cos(a)*r, z=b.pos.z+Math.sin(a)*r;
    if(Math.abs(x)>HX-1.5||Math.abs(z)>HZ-1.5) continue; const g=groundAt(x,z,b.pos.y+2.5,0.35); if(g===null||Math.abs(g-b.pos.y)>2.2) continue;
    const p=V3(x,g+1,z); if(hasLOS(p,c)||!hasLOS(b.center(),p)) continue; const d=r-0.3*Math.hypot(x-c.x,z-c.z); if(d<bd){ bd=d; best=V3(x,g,z); } } return best; }
function botThink(b,dt){
  const P=aiProf(b); if(!b.ai||!b.ai.know) aiReset(b); const A=b.ai; if(b.dead) return {wish:V3(),jump:false};
  if(A.fresh||A.yaw===null){ A.fresh=false; A.yaw=b.yaw; A.pitch=0; A.know.clear(); A.vEst.clear(); A.tgt=null; A.blockBul=null;
    if(matchKind!=='ffa'&&matchKind!=='battle') for(const e of enemies(b)){ const k=aiKnow(A,e); k.t=gameT; k.at=gameT+aiRand(P.react); } } // in 1v1 and 2v2 everyone knows where the other side starts
  A.visT-=dt; if(A.visT<=0){ A.visT=0.09+Math.random()*0.04; aiSense(b,P,A); }
  const e=aiPick(b,P,A,dt), k=e?A.know.get(e):null; const eye=b.center();
  const acted=!!(k&&gameT>=k.at), eng=acted&&k.vis;
  if(k&&k.vis) k.pos.copy(e.pos);
  // ---- where to look
  let look=null, dist=99;
  if(e){ let ve=A.vEst.get(e); if(!ve){ ve=e.vel.clone(); A.vEst.set(e,ve); } if(k.vis) ve.lerp(e.vel,1-Math.exp(-dt/P.lag));
    if(eng){ const c=e.center(); if(k.up) c.y+=0.55; dist=c.distanceTo(eye); const tFly=clamp(dist/b.stats.speed,0,1.2); look=c.addScaledVector(ve,tFly*P.lead+P.tau*P.predict); look.y-=ve.y*(tFly*P.lead+P.tau*P.predict)*0.5;
      if(b.stats.arc>0){ const tf=look.distanceTo(eye)/b.stats.speed; look.y+=0.5*CFG.gravity*(0.85+0.4*(b.stats.arc-1))*tf*tf*P.arc; } } // lob Arc Shots
    else if(acted) look=V3(k.pos.x,k.pos.y+1,k.pos.z); } // pre-aim where they were seen or heard
  if(!look&&!(k&&!acted)){ // nobody to fight: look where you're going, and glance around
    const moving=Math.hypot(b.vel.x,b.vel.z)>1;
    A.scanT-=dt; if(A.scanT<=0){ A.scanT=aiRand(P.scan); A.scanOff=Math.random()<0.2?Math.PI:rand(-1.1,1.1); A.scanBase=A.yaw; }
    const y=(moving?Math.atan2(-b.vel.x,-b.vel.z):(A.scanBase??A.yaw))+A.scanOff*(moving?0.6:1); look=V3(eye.x-Math.sin(y)*10,eye.y,eye.z-Math.cos(y)*10); }
  // ---- aim like a hand: wobble, then a flick that eases in
  A.noiseT-=dt; if(A.noiseT<=0){ A.noiseT=rand(0.18,0.45); const m=P.wob*(1+P.moveErr*Math.hypot(b.vel.x,b.vel.z)/CFG.moveSpeed+(b.dazzleN>0?3:0)); A.tox=gauss()*m; A.toy=gauss()*m*0.6; }
  const kk=Math.min(1,dt*5); A.ox+=(A.tox-A.ox)*kk; A.oy+=(A.toy-A.oy)*kk;
  let wantYaw=A.yaw, wantPitch=A.pitch;
  if(look){ const d=V3().subVectors(look,eye); wantYaw=Math.atan2(-d.x,-d.z); wantPitch=Math.atan2(d.y,Math.hypot(d.x,d.z));
    const step=(delta)=>{ const v=clamp(delta/P.tau,-P.turn,P.turn)*dt; return Math.abs(v)>Math.abs(delta)?delta:v; };
    A.yaw=wrapA(A.yaw+step(wrapA(wantYaw+A.ox-A.yaw))); A.pitch=clamp(A.pitch+step(wantPitch+A.oy-A.pitch),-1,1); }
  b.yaw=A.yaw; b.pitch=A.pitch; const cp=Math.cos(A.pitch); b.botAim=V3(-Math.sin(A.yaw)*cp,Math.sin(A.pitch),-Math.cos(A.yaw)*cp);
  // ---- shoot when the crosshair is on them (beginners are looser about it, and fire in nervous bursts)
  let fire=false;
  if(eng){ const err=Math.hypot(wrapA(wantYaw-A.yaw)*Math.cos(wantPitch),wantPitch-A.pitch); const cone=Math.max(0.03,Math.atan2(e.radius||0.6,dist))*P.cone;
    const onT=err<cone&&dist<P.range; A.onT=onT?(A.onT||0)+dt:0; fire=onT&&A.onT>=P.dwell; // squeeze once the crosshair has settled on them
    if(fire&&!P.walls&&!hasLOS(b.muzzlePos(),look)){ fire=false; A.blockedT=gameT; } // the gun's line is blocked (they can see over it, the blaster can't): find an angle first
    if(e.blockActive&&!A.domeWas) A.domeHold=Math.random()<P.dome; A.domeWas=e.blockActive; if(e.blockActive&&A.domeHold) fire=false; // wait out their dome
    if(P.burst){ A.trigT-=dt; if(A.trigT<=0){ A.trig=!A.trig; A.trigT=A.trig?aiRand(P.burst):aiRand(P.pause); } if(!A.trig) fire=false; }
    if(b.stats.pact>0&&b.hp<b.maxHp()*0.4) fire=false; }
  /*DEBUG-START*/if(window.__aiTap) window.__aiTap('think',b,{eng,acted,known:!!e,vis:!!(k&&k.vis),fire,err:eng?Math.hypot(wrapA(wantYaw-A.yaw)*Math.cos(wantPitch),wantPitch-A.pitch)/Math.max(0.03,Math.atan2(e.radius||0.6,dist)):0,dist,hold:!!(A.holdT&&(b.reloading||gameT<A.holdT)),rel:!!b.reloading,ammo:b.ammo});/*DEBUG-END*/
  if(fire) tryFire(b,false);
  // ---- the dome: only for shots they actually saw coming
  if(A.blockBul){ const bl=A.blockBul; if(!bullets.includes(bl)||b.blockActive||b.blockCdT>0) A.blockBul=null;
    else { const sp=Math.max(1,bl.vel.length()); const t=V3().subVectors(b.center(),bl.pos).dot(bl.vel)/sp/sp; if(t<=A.blockWin){ tryBlock(b,true); A.blockBul=null; } else if(t<-0.05) A.blockBul=null; } }
  else if(gameT>A.decidedT&&!b.blockActive){ let thr=null, tImp=9, seen=0; const dr=b.domeR()*0.9+0.4;
    for(const bl of bullets){ const o=bl.owner; if(o===b||(o&&o.side===b.side)) continue; const sp=bl.vel.length(); if(sp<1) continue; const rel=V3().subVectors(eye,bl.pos); const along=rel.dot(bl.vel)/sp; if(along<0||along>sp*1.1) continue;
      if(rel.addScaledVector(bl.vel,-along/sp).length()>dr) continue;
      let s=A.bseen.get(bl); if(s===undefined){ const ok=o&&bl.age<0.15&&A.know.get(o)&&A.know.get(o).vis; if(ok) s=gameT-bl.age; else if(aiSees(b,A,P,bl.pos,aiEye(b))) s=gameT; else continue; A.bseen.set(bl,s); }
      const t=along/sp; if(t<tImp){ tImp=t; thr=bl; seen=s; } }
    if(thr&&gameT-seen>=P.react[0]*0.9){ A.decidedT=gameT+0.45;
      if(b.blockCdT<=0&&b.silenceT<=0&&Math.random()<P.block){ A.blockBul=thr; A.blockWin=aiRand(P.bTime); }
      else if(b.dashCdT<=0&&b.onGround&&Math.random()<P.dodge){ const d=V3().subVectors(eye,thr.pos); const r=V3(-thr.vel.z,0,thr.vel.x).normalize(); if(r.dot(d)<0) r.negate(); b.dashDir.copy(r); b.dashT=CFG.dashTime; b.dashCdT=CFG.dashCd; SFX.dash(); } } }
  if(eng&&b.blockCdT<=0&&!b.blockActive){ if(b.stats.domeFx>0&&dist<b.domeR()+0.3&&Math.random()<dt*3*P.block) tryBlock(b,true); else if(P.panic&&dist<7&&Math.random()<dt*P.panic) tryBlock(b,true); } // beginners sometimes panic-dome
  // ---- moving
  const wish=V3(); let jump=false;
  A.rollT-=dt; if(A.rollT<=0){ A.rollT=rand(0.8,1.4); A.coverRoll=Math.random()<P.cover; A.pushRoll=Math.random()<P.push; A.still=Math.random()<P.still; }
  if(e&&acted){ const to=V3().subVectors(k.pos,b.pos); to.y=0; const d=to.length(); const dir=d>0.01?to.multiplyScalar(1/d):V3(1,0,0); const right=V3(-dir.z,0,dir.x);
    const hurt=b.hp<b.maxHp()*0.3; const wantCover=A.coverRoll&&(b.reloading||hurt);
    if(wantCover&&!A.holdT) A.holdT=gameT+(hurt?rand(2,4):0); if(!wantCover&&!b.reloading&&gameT>A.holdT) A.holdT=0;
    A.strafeT-=dt; if(A.strafeT<=0){ if(Math.random()<0.75) A.strafe*=-1; A.strafeT=aiRand(P.strafeT); }
    if(A.holdT&&(b.reloading||gameT<A.holdT)){ // duck out of sight until the blaster's ready, then peek
      k.t=Math.max(k.t,gameT-0.5);
      A.coverT-=dt; if(k.vis&&(A.coverT<=0||!A.cover)){ A.coverT=0.6; A.cover=aiCover(b,e.center()); }
      if(A.cover&&k.vis){ const c=V3().subVectors(A.cover,b.pos); c.y=0; if(c.lengthSq()>0.25) wish.add(c.normalize()); } else if(k.vis){ wish.sub(dir); wish.addScaledVector(right,A.strafe); } }
    else if(k.vis){ A.cover=null; const closeBuild=b.stats.hasAura||b.stats.domeFx>0; let want=closeBuild?4.5:10;
      if(A.pushRoll&&(e.reloading||e.blockCdT>1.2||e.hp<e.maxHp()*0.3)&&!hurt) want=Math.min(want,5.5); // they're open: go for it
      if(gameT-(A.blockedT||-9)<0.4){ wish.addScaledVector(dir,0.35); wish.addScaledVector(right,A.strafe); } else { if(d>want+3) wish.add(dir); else if(d<want-3) wish.sub(dir); wish.addScaledVector(right,A.strafe*P.strafe); }
      if(fire&&A.still) wish.set(0,0,0); // beginners stop to shoot
      A.jumpT-=dt; if(A.jumpT<=0){ jump=Math.random()<0.6; A.jumpT=aiRand(P.jumpT); } }
    else if(gameT-k.seenT<3&&d<P.range){ wish.addScaledVector(dir,0.4); wish.addScaledVector(right,A.strafe); } // just lost them behind something: step sideways to find an angle
    else { if(d>1.8) wish.add(dir); else k.t=-99; wish.addScaledVector(right,A.strafe*0.2); } } // go and check where they were; nothing there? forget it
  else if(!e){ A.wanderT-=dt; if(!A.wander||A.wanderT<=0||Math.hypot(A.wander.x-b.pos.x,A.wander.z-b.pos.z)<2){ A.wander=aiSpot(b); A.wanderT=rand(4,8); }
    const d=V3().subVectors(A.wander,b.pos); d.y=0; if(d.lengthSq()>0.01) wish.add(d.normalize().multiplyScalar(0.75)); }
  const nx=b.pos.x+wish.x*2.2, nz=b.pos.z+wish.z*2.2; if(Math.abs(nx)>HX-1.2) wish.x=-Math.sign(b.pos.x)*0.8; if(Math.abs(nz)>HZ-1.2) wish.z=-Math.sign(b.pos.z)*0.8;
  if(wish.lengthSq()>0.01&&groundAt(b.pos.x+wish.x*1.6,b.pos.z+wish.z*1.6,b.pos.y+3,0.3)===null){ wish.multiplyScalar(-1); A.strafe*=-1; A.wander=null; }
  if(wish.lengthSq()>1) wish.normalize();
  if(b.pos.distanceTo(A.lastPos)<CFG.moveSpeed*dt*0.3&&wish.lengthSq()>0.1) A.stuckT+=dt; else A.stuckT=0; A.lastPos.copy(b.pos);
  if(A.stuckT>0.3){ jump=true; A.stuckT=0; if(Math.random()<0.6) A.strafe*=-1; A.wander=null; }
  return {wish,jump};
}

// ================= PHYSICS / UPDATE =================
function moveFighter(f,dt,wish,wantJump){ if(dt>0.02){ moveFighter(f,dt*0.5,wish,wantJump); moveFighter(f,dt*0.5,wish,false); return; }
  f.chasing=false; if(f.stats.chase>0&&wish.lengthSq()>0.1){ for(const e of enemies(f)){ const d=V3().subVectors(e.pos,f.pos); d.y=0; if(d.lengthSq()>0.01&&wish.dot(d.normalize())>0.45&&hasLOS(f.center(),e.center())){ f.chasing=true; break; } } }
  const sp=CFG.moveSpeed*f.speedFactor();
  if(f.dashT>0){ f.vel.x=f.dashDir.x*CFG.dashSpeed; f.vel.z=f.dashDir.z*CFG.dashSpeed; if(!f.onGround&&f.vel.y<0) f.vel.y*=0.6; f.dashT-=dt; if(Math.random()<0.3) ghostAt(f.center(),f.team.light); if(Math.random()<0.7) burst(f.center(),f.team.light,1,1.5,0.1,0.3,0); }
  else { if(f.knockT>0) f.knockT-=dt; const acc=(f.onGround?44:22)*(f.thrusters.length?0.5:1)*(f.knockT>0?0.22:1); f.vel.x=approach(f.vel.x,wish.x*sp,acc*dt); f.vel.z=approach(f.vel.z,wish.z*sp,acc*dt); }
  if(f.tetherV&&f.dashT<=0){ f.vel.x=f.tetherV.x+wish.x*sp*0.3; f.vel.z=f.tetherV.z+wish.z*sp*0.3; if(f.tetherV.y>0&&f.vel.y<f.tetherV.y){ f.vel.y=f.tetherV.y; f.onGround=false; } } // a Magnet Shot rope reels them in (they can fight it a little)
  for(let i=f.thrusters.length-1;i>=0;i--){ const th=f.thrusters[i]; if(!th) continue; th.t-=dt; if(th.local) thrAim(f,th); f.vel.addScaledVector(th.dir,th.f*dt*2.4); if(th.dir.y>0.1&&f.vel.y>1) f.onGround=false; if(th.t<=0) f.thrusters.splice(i,1); }
  f.coyote=f.onGround?0.12:Math.max(0,(f.coyote||0)-dt); if(wantJump&&(f.onGround||f.coyote>0)&&f.vel.y<=0.5&&f.stunT<=0){ f.coyote=0; f.vel.y=CFG.jumpVel*Math.sqrt(f.stats.jump); f.onGround=false; if(f.isPlayer){ jumpBuffer=0; SFX.jump(); } shockRing(V3(f.pos.x,f.pos.y+0.06,f.pos.z),0xffffff,1.1,0.3); burst(V3(f.pos.x,f.pos.y+0.1,f.pos.z),0xffffff,5,2.2,0.08,0.3,0.2); }
  f.vel.y-=CFG.gravity*dt;
  f.pos.x+=f.vel.x*dt; f.pos.z+=f.vel.z*dt; resolveWalls(f);
  const py=f.pos.y; f.pos.y+=f.vel.y*dt;
  const g=groundAt(f.pos.x,f.pos.z,Math.max(py,f.pos.y),f.radius*0.6);
  f.wasGround=f.onGround;
  if(g!==null&&f.vel.y<=0&&(f.pos.y<=g+0.01||(f.wasGround&&f.pos.y-g<0.35))){ if(!f.wasGround&&f.vel.y<-7){ f.squash=Math.min(1,-f.vel.y/18); burst(V3(f.pos.x,g+0.1,f.pos.z),0xe9edf3,7,2.8,0.09,0.35,0.3); shockRing(V3(f.pos.x,g+0.06,f.pos.z),0xffffff,1.3,0.3); if(f.isPlayer) SFX.land(); } f.pos.y=g; f.vel.y=0; f.onGround=true; } else f.onGround=false;
  if(f.pos.y+f.height>18){ f.pos.y=18-f.height; f.vel.y=Math.min(f.vel.y,0); }
  if((f.pos.y<CFG.killY||Math.abs(f.pos.x)>HX+28||Math.abs(f.pos.z)>HZ+28)&&!f.dead&&state==='fight'){ const wet=curMapId==='dock', lava=!!curMap.lava; if(wet){ burst(V3(f.pos.x,-1,f.pos.z),0xbfe6ff,24,7,0.16,0.9); burst(V3(f.pos.x,-1,f.pos.z),0xffffff,12,5,0.12,0.7); } if(lava){ burst(V3(f.pos.x,-1.3,f.pos.z),0xff6a1a,30,8,0.18,1.0,-0.4); burst(V3(f.pos.x,-1.3,f.pos.z),0xffd060,14,5,0.12,0.8,-0.6); flashAt(V3(f.pos.x,-0.8,f.pos.z),0xff6a1a,6,0.4); } floatText(V3(f.pos.x,0.6,f.pos.z),wet?'SPLASH!':(lava?'MELTED!':'FELL!'),'status'); f.invulnT=0; fatal(f,f.lastHitBy,'fall'); }
}
function separateFighters(){ const L0=fighters.filter(f=>!f.dead&&f.active!==false); for(let i=0;i<L0.length;i++) for(let j=i+1;j<L0.length;j++){ const a=L0[i], b=L0[j]; if(Math.abs(a.pos.y-b.pos.y)>1.8) continue; const d=V3().subVectors(b.pos,a.pos); d.y=0; const L=d.length(); const min=a.radius+b.radius+0.1; if(L<min&&L>0.001){ d.multiplyScalar((min-L)/L*0.5); if(b.ctl!=='net') b.pos.add(d); if(a.ctl!=='net') a.pos.sub(d); } } }
function tickDamage(f,key,dps,dt,target,cause,colr){ f[key]=(f[key]||0)+dps*dt; if(f[key]>=3){ const n=Math.floor(f[key]); f[key]-=n; applyDamage(target,n,f,{tick:true,cause}); if(colr) burst(target.center(),colr,2,1.5,0.08,0.5,-0.3); return n; } return 0; }
function updateFighterTimers(f,dt){
  const s=f.stats;
  if(f.fireCd>0) f.fireCd-=dt; if(f.blockCdT>0) f.blockCdT-=dt; if(f.dashCdT>0) f.dashCdT-=dt; if(f.slowT>0) f.slowT-=dt; if(f.stunT>0) f.stunT-=dt; if(f.coldT>0) f.coldT-=dt; if(f.blinkPending>0){ f.blinkPending-=dt; if(f.blinkPending<=0&&!f.dead&&state==='fight') doBlock(f,false,true); }
  if(f.tasteT>0) f.tasteT-=dt; if(f.refreshCd>0) f.refreshCd-=dt; if(f.silenceT>0) f.silenceT-=dt; if(f.invulnT>0) f.invulnT-=dt;
  if(f.brawlT>0){ f.brawlT-=dt; if(f.brawlT<=0) f.hp=Math.min(f.hp,s.hp); }
  if(f.reloading){ f.reloadT-=dt; if(f.reloadT<=0){ f.reloading=false; f.ammo=s.ammo; if(f.isPlayer) SFX.tick(); } }
  else if(f.ammo<s.ammo){ f.sinceShot=(f.sinceShot||0)+dt; if(f.sinceShot>=s.reload){ f.ammo=s.ammo; f.sinceShot=0; if(f.isPlayer) SFX.tick(); } } else f.sinceShot=0;
  if(f.dazzleImm>0) f.dazzleImm-=dt;
  if(f.blockActive){ f.blockT-=dt; if(f.blockT<=0){ f.blockActive=false; if(f.sawT<=0&&!(s.emp>0)){ shatterDome(f.domeC(),f.domeR(),f.team.light,26,4.5); SFX.shatter(); } } }
  if(f.blockActive&&!(s.saw>0)&&!f.dead){ const c=f.domeC(), R=f.domeR(); for(const e of enemies(f)){ if(e.ctl==='net'||e.pos.y>c.y+R*0.9) continue; const d=V3(e.pos.x-c.x,0,e.pos.z-c.z); const L=d.length(), lim=R+e.radius*0.9; if(L>=lim) continue; if(L<0.05) d.set(Math.cos(f.yaw),0,-Math.sin(f.yaw)); else d.multiplyScalar(1/L); const k=Math.min(1,dt*18); e.pos.x+=d.x*(lim-L)*k; e.pos.z+=d.z*(lim-L)*k; const vn=e.vel.x*d.x+e.vel.z*d.z; if(vn<0){ e.vel.x-=d.x*vn; e.vel.z-=d.z*vn; } } }
  if(f.sawT>0){ f.sawT-=dt; for(const e of enemies(f)) if(e.center().distanceTo(f.domeC())<f.domeR()+0.5){ tickDamage(f,'sawAcc'+e.id,24*s.saw,dt,e,'dome',0xff5252); } if(f.sawT<=0&&!f.blockActive){ shatterDome(f.domeC(),f.domeR(),0xff6b6b,22,5); SFX.shatter(); } }
  if(f.echoT>0){ f.echoT-=dt; if(f.echoT<=0&&!f.dead&&state==='fight'&&f.silenceT<=0){ doBlock(f,true); f.echoCount--; if(f.echoCount>0) f.echoT=0.65; } }
  if(f.burstQueue>0){ f.burstT-=dt; if(f.burstT<=0){ if(!f.dead&&state==='fight') firePellets(f); f.burstQueue--; f.burstT=0.07; } }
  if(f.dazzleN>0){ f.dazzleT-=dt; if(f.dazzleT<=0){ f.dazzleN--; f.dazzleT=0.6; f.stunT=Math.max(f.stunT,0.16); applySlow(f,0.3,0.5); if(f.dazzleN<=0) f.dazzleImm=1.2; burst(f.center().add(V3(0,0.9,0)),0xffe45c,6,3,0.09,0.4,0); } }
  if(f.decayPool>0){ const d=Math.min(f.decayPool,Math.max(2,f.decayRate||0)*dt); f.decayPool-=d; f.decayAcc+=d; if(f.decayAcc>=2||f.decayPool<=0.001){ const n=Math.round(f.decayAcc); f.decayAcc-=n; if(n>0) applyDamage(f,n,f.decaySrc||null,{tick:true,fromDecay:true}); } if(f.decayPool<=0.001){ f.decayPool=0; f.decayRate=0; } }
  if(f.poisons.length&&!f.dead&&Math.random()<dt*22){ const z=f.sz||1; burst(V3(f.pos.x+rand(-0.35,0.35)*z,f.pos.y+rand(0.5,1.7)*z,f.pos.z+rand(-0.35,0.35)*z),f.poisons[0].col||0x49d86b,1,0.5,0.13,0.9,2.2); } // green drip while poisoned
  for(let i=f.poisons.length-1;i>=0;i--){ const p=f.poisons[i]; if(!p) continue; p.t-=dt; p.acc=(p.acc||0)+p.dps*dt; if(p.acc>=4){ const n=Math.floor(p.acc); p.acc-=n; applyDamage(f,n,p.src,{tick:true,cause:'poison'}); burst(f.center(),p.col||0x5dff9b,2,1.5,0.08,0.5,-0.3); } if(p.t<=0&&f.poisons[i]===p) f.poisons.splice(i,1); }
  f.auraSlow=0; f.chillIn=false; for(const e of enemies(f)){ const aR=e.auraR(); if(!(aR>0&&!f.dead&&f.center().distanceTo(e.domeC())<aR+0.3)) continue; const es=e.stats;
    if(es.chill){ f.auraSlow=Math.max(f.auraSlow,Math.min(0.78,0.45+0.12*(es.chill-1))); f.chillIn=true; } if(es.staticf){ f.auraSlow=Math.max(f.auraSlow,0.15+0.05*es.staticf); if(tickDamage(e,'staticAcc'+f.id,7.5*es.staticf,dt,f,'aura',0xffe066)){ SFX.zap(); staticZap(e,f); } }
    if(es.drain){ lifeWorm(f,e,'aura'+e.id+'_'+f.id,0.12,1.15); const n=tickDamage(e,'drainAcc'+f.id,11*es.drain,dt,f,'aura',0xff6b9d); if(n&&e.hp<e.maxHp()){ e.hp=Math.min(e.maxHp(),e.hp+n); floatText(e.center().add(V3(0,1,0)),'+'+n,'heal'); } }
    if(Math.random()<dt*7) burst(f.center().add(V3(rand(-0.5,0.5),rand(-0.3,0.6),rand(-0.5,0.5))),e.auraColor(gameT).getHex(),1,0.6,0.07,0.7,-0.2); }
}
function homeTarget(b){ let best=null, ba=9; const d=b.vel.clone().normalize(); for(const e of enemies(b.owner)){ const a=d.angleTo(V3().subVectors(e.center(),b.pos)); if(a<ba){ ba=a; best=e; } } return best; }
function updateBullets(dt){
  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i]; b.life-=dt; b.age+=dt; if(b.life<=0){ burst(b.pos,b.tint,4,2,0.07,0.3,0); magnetLand(b,b.pos.clone()); removeBullet(i); continue; }
    const speed=b.vel.length();
    if(b.remote){ if(b.owner.isPlayer&&remoteCtl.b===b){ const cp=Math.cos(remoteCtl.pitch); b.vel.set(-Math.sin(remoteCtl.yaw)*cp,Math.sin(remoteCtl.pitch),-Math.cos(remoteCtl.yaw)*cp).multiplyScalar(speed); }
      else if(!b.owner.isPlayer){ const e=homeTarget(b); if(e){ const want=V3().subVectors(e.center(),b.pos).normalize(); const cur=b.vel.clone().normalize(); const ang=cur.angleTo(want); const k=ang<1e-4?1:Math.min(1,1.3*b.s.remote*dt/ang); b.vel.copy(cur.lerp(want,k).normalize().multiplyScalar(speed)); } } }
    if(b.follow){ const L=b.follow; if(L.gone||L.owner!==b.owner) b.follow=null; else b.vel.copy(L.vel).normalize().applyQuaternion(b.fq).multiplyScalar(speed); }
    if(b.s.grow>0) b.k=Math.min(4.2,1+b.dist*0.075*b.s.grow);
    if(b.s.arc>0&&!b.remote&&!b.follow&&remoteCtl.b!==b) b.vel.y-=CFG.gravity*(0.85+0.4*(b.s.arc-1))*dt; // Arc Shot: falls like water
    const steps=Math.max(1,Math.ceil(speed*dt/0.35)); const sdt=dt/steps; let done=false; const br=b.r*b.k;
    for(let s=0;s<steps&&!done;s++){
      b.pos.addScaledVector(b.vel,sdt); b.dist+=speed*sdt;
      let refl=false;
      for(const e of fighters){ if(e.side===b.owner.side||e.dead||e.active===false) continue;
        if(e.blockActive&&b.pos.distanceTo(e.domeC())<e.domeR()+br&&b.pos.y>e.pos.y-0.3){ for(let k=0;k<5;k++) spawnShard(b.pos.clone(),V3(rand(-1,1),rand(0,1),rand(-1,1)).multiplyScalar(4),e.team.light,0.2,0.35,0.6); reflectBullet(b,e); refl=true; break; }
        if(e.distTo(b.pos)<e.hitR+br){ if(netRemoteBullet(b)){ if(!b.passed) b.passed=new Set(); if(!b.passed.has(e)){ b.passed.add(e); burst(b.pos,b.tint,3,2,0.06,0.2,0); } continue; } if(NET.on&&e.ctl!=='local') e.lastLocalHit=performance.now(); netRecordHit(b,e); hitFighter(b,e); removeBullet(i); done=true; break; } }
      if(done||refl) break;
      if(b.bounced&&b.age>0.25&&!b.owner.dead&&b.owner.distTo(b.pos)<b.owner.hitR+br&&!netRemoteBullet(b)){ netRecordHit(b,b.owner); hitFighter(b,b.owner); removeBullet(i); done=true; break; }
      const hit=pointVsWorld(b.pos,Math.min(br,0.32))||(curMap.hitSphere?curMap.hitSphere(b.pos,Math.min(br,0.32)):null);
      if(hit){ if(b.bounces>0){ b.bounces--; b.bounced=true; b.pos.addScaledVector(hit.n,hit.depth+0.01); const vn=b.vel.dot(hit.n); b.vel.addScaledVector(hit.n,-2*vn); if(b.s.ricochet>0) b.vel.multiplyScalar(0.5); burst(b.pos,b.tint,4,3,0.07,0.3,0); shockRing(b.pos.clone(),b.tint,0.7,0.25,0.08,hit.n); if(b.remote&&remoteCtl.b===b){ const d=b.vel.clone().normalize(); remoteCtl.yaw=Math.atan2(-d.x,-d.z); remoteCtl.pitch=Math.asin(clamp(d.y,-1,1)); } } else { bulletImpact(b,hit); removeBullet(i); done=true; break; } }
      if(b.pos.y<CFG.killY-1||Math.abs(b.pos.x)>HX+70||Math.abs(b.pos.z)>HZ+70){ removeBullet(i); done=true; break; }
      if(curMap.lava&&b.pos.y<-1.5){ burst(b.pos,0xff8a2a,6,3,0.1,0.5,-0.3); removeBullet(i); done=true; break; }
      if(curMapId==='dock'&&b.pos.y<-0.9){ burst(b.pos,0xbfe6ff,5,3,0.1,0.5); removeBullet(i); done=true; break; }
    }
    if(!done) placeBulletMesh(b,dt);
  }
}
function computeAimPoint(){
  const dir=player.aimDir(); const cam=camera.position; const pivot=V3(player.pos.x,player.pos.y+1.9,player.pos.z);
  const startOff=Math.max(0,V3().subVectors(pivot,cam).dot(dir)); const from=cam.clone().addScaledVector(dir,startOff); const far=cam.clone().addScaledVector(dir,95);
  const t=segmentHitsBoxes(from,far); let dist=startOff+(t===null?1:t)*(95-startOff); let onTarget=false;
  for(const e of enemies(player)){ if(!e.mesh.visible) continue; for(const [c,r] of [[e.center(),0.8],[V3(e.pos.x,e.pos.y+1.85,e.pos.z),0.4],[V3(e.pos.x,e.pos.y+0.55,e.pos.z),0.5]]){ const oc=V3().subVectors(cam,c); const bq=2*oc.dot(dir), cc=oc.dot(oc)-r*r; const disc=bq*bq-4*cc; if(disc>0){ const tE=(-bq-Math.sqrt(disc))/2; if(tE>startOff&&tE<dist){ dist=tE; onTarget=true; } } } }
  aimPoint.copy(cam).addScaledVector(dir,dist);
  UI.crosshair.classList.toggle('onTarget',onTarget);
}
let camDist=1, specT=null;
// knocked out in FFA: watch whoever knocked you out (or anyone still standing)
function camFighter(){ if(!(matchKind!=='1v1'&&player.dead&&(state==='fight'||state==='roundover'))) return player; if(specT&&!specT.dead&&specT.active!==false) return specT; specT=fighters.find(f=>f!==player&&f.side===player.side&&!f.dead&&f.active!==false)||((player.lastHitBy&&!player.lastHitBy.dead)?player.lastHitBy:null)||fighters.find(f=>!f.dead&&f.active!==false)||player; return specT; }
function updateCamera(dt){ if(camHold) return;
  const t=gameT;
  if(state==='menu'&&STUDIO.open){ const p=player.pos, s=p.x>0.5?-1:1, R=player.domeR(); const a=Math.sin(t*0.18)*0.22; camera.fov=50; camera.updateProjectionMatrix();
    const off=V3(s*R*2.15,R*0.95,-s*R*1.25).applyAxisAngle(UP,a); const ctr=V3(p.x,p.y+R*0.42,p.z); const cp=ctr.clone().add(off); camera.position.copy(cp);
    const fw=V3().subVectors(ctr,cp).normalize(), rt=V3().crossVectors(fw,UP).normalize(); const asp=camera.aspect||1.6; camera.lookAt(ctr.clone().addScaledVector(rt,R*(asp>1.3?0.62:0.15))); return; }
  if(state==='menu'){ const p=player.pos, s=p.x>0.5?-1:1; camera.fov=50; camera.updateProjectionMatrix(); // always film from the arena side (an online guest stands at the far base)
    const head=V3(p.x,p.y+1.6,p.z); const key=curMapId+'|'+p.x.toFixed(1)+'|'+p.z.toFixed(1);
    if(menuCam.key!==key){ menuCam.key=key; let best=0, bestF=-1; for(const a of [0,0.6,-0.6,1.2,-1.2,1.9,-1.9,2.6,-2.6]){ const o=V3(4.3*s,0,-1.9*s).applyAxisAngle(UP,a); const w=head.clone().add(o); const h=segmentHitsBoxes(head,w,0.3,true); const f=h===null?1:h; if(f>bestF+0.02){ bestF=f; best=a; } if(f>=1) break; } menuCam.a=best; } // pick the first angle with a clear view of you
    const off=V3(4.3*s+Math.sin(t*0.3)*0.15,0,-1.9*s+Math.cos(t*0.25)*0.12).applyAxisAngle(UP,menuCam.a); const want=head.clone().add(off); const hit=segmentHitsBoxes(head,want,0.25,true); if(hit!==null) want.lerpVectors(head,want,Math.max(0.35,hit-0.05)); camera.position.copy(want);
    const la=V3(0,0,1.3*s).applyAxisAngle(UP,menuCam.a); camera.lookAt(p.x+la.x,p.y+1.2,p.z+la.z); return; }
  if(state==='draft'||state==='picked'||state==='matchover'){ const a=t*0.12+0.7; camera.fov=55; camera.updateProjectionMatrix(); camera.position.set(Math.cos(a)*(HX+10),17,Math.sin(a)*(HZ+12)); camera.lookAt(0,0.5,0); return; }
  if(remoteCtl.b&&state==='fight'){ const b=remoteCtl.b; const d=b.vel.clone().normalize(); if(Math.abs(camera.fov-80)>0.1){ camera.fov=lerp(camera.fov,80,Math.min(1,dt*10)); camera.updateProjectionMatrix(); } camera.position.copy(b.pos).addScaledVector(d,-1.7).add(V3(0,0.3,0)); camera.lookAt(b.pos.clone().addScaledVector(d,5)); return; }
  const cf=camFighter();
  const fovT=68+(cf.dashT>0?7:0); if(Math.abs(camera.fov-fovT)>0.05){ camera.fov=lerp(camera.fov,fovT,Math.min(1,dt*12)); camera.updateProjectionMatrix(); }
  const ph=1.95*Math.pow(cf.sz||1,0.85); const pivot=cf.pos.clone().add(V3(0,ph,0)); if(cf.visY!==undefined&&cf.onGround) pivot.y=cf.visY+ph; const dir=cf.aimDir(); const right=V3(Math.cos(cf.yaw),0,-Math.sin(cf.yaw));
  const desired=pivot.clone().addScaledVector(right,1.0).addScaledVector(dir,-5.2).add(V3(0,0.4,0));
  let th=segmentHitsBoxes(pivot,desired,0.28,true); if(th!==null&&th<=0.001) th=segmentHitsBoxes(pivot,desired,0,true); camDist=th===null? Math.min(1,camDist+dt*3) : Math.min(camDist,Math.max(0.08,th-0.02)); const pos=pivot.clone().lerp(desired,camDist); pos.y+=(1-camDist)*0.7;
  if(pos.y<0.3&&Math.abs(pos.x)<HX&&Math.abs(pos.z)<HZ) pos.y=0.3; if(pos.y<-0.8) pos.y=-0.8;
  camera.position.copy(pos); camera.quaternion.setFromEuler(new T.Euler(cf.pitch,cf.yaw,0,'YXZ'));
  if(shakeT>0){ shakeT-=dt; const k=Math.min(0.3,shakeT)*0.13; camera.position.x+=rand(-k,k); camera.position.y+=rand(-k,k); }
}
function fxUpdate(dt){ updateCardFx(dt); updateParticles(dt); updateExplosions(dt); updateRings(dt); updateFlashes(dt); updateGhosts(dt); updateShards(dt); updateFloats(dt); }
function update(dt){
  netTick(dt);
  if(paused) return;
  gameT+=dt; const t=gameT;
  for(const fn of animated) fn(t,dt);
  const vis=()=>{ for(const f of fighters) if(f.active!==false) f.updateVisual(dt,t); };
  if(state==='menu'){ const ms=player.pos.x>0.5?-1:1; player.yaw=(ms>0?-Math.PI/2:Math.PI/2)-0.05*ms+(menuCam.a||0)+Math.sin(t*0.7)*0.22; player.pitch=0.1+Math.sin(t*0.9)*0.1; const cyc=Math.floor(t/2.6)%4; player.mood=['normal','happy','angry','normal'][cyc]; player.moodT=1; vis(); updateCamera(dt); fxUpdate(dt); return; }
  if(crossKick>0) crossKick=Math.max(0,crossKick-dt*6); if(hurtT>0) hurtT-=dt; if(hitMarkerT>0) hitMarkerT-=dt; if(killMarkT>0) killMarkT-=dt; if(dmgDirT>0) dmgDirT-=dt;
  const lk=(keys.ArrowLeft?1:0)-(keys.ArrowRight?1:0), lv=(keys.ArrowUp?1:0)-(keys.ArrowDown?1:0);
  if(state==='fight'||state==='countdown'){ if(lk||lv) look(-lk*2.6*dt,-(settings.invertY?-1:1)*lv*1.6*dt);  }
  if(state==='countdown'){
    countdownT-=dt; const step=Math.ceil(countdownT-0.2); if(step!==countdownStep){ countdownStep=step; show(UI.countdown,true,'block'); UI.cdSplat.innerHTML=domBurst(step+11,step>0?'#ffc71f':'#27c46b',{sx:step>0?1.1:1.6}); UI.cdText.textContent= step>0? String(step):'GO!'; UI.countdown.classList.remove('pop'); void UI.countdown.offsetWidth; UI.countdown.classList.add('pop'); if(step>0) SFX.tick(); else SFX.go(); }
    if(countdownT<=0){ state='fight'; show(UI.countdown,false); firePressed=false; blockBuf=0; wantDash=false; }
    vis(); updateCamera(dt); computeAimPoint(); fxUpdate(dt); updateHUD(); return;
  }
  if(state==='roundover'){
    roundOverT-=dt; let sdt=dt; if(slowMoT>0){ slowMoT-=dt; sdt=dt*0.28; }
    updateBullets(sdt); updateBombs(sdt); updateFields(sdt,t); fxUpdate(sdt);
    for(const f of fighters){ if(f.active===false) continue; if(f.ctl==='net') netApplyRemote(f,sdt); else if(!f.dead) moveFighter(f,sdt,V3(),false); if(!f.dead) f.updateVisual(sdt,t); }
    updateCamera(dt); updateHUD();
    if(roundOverT<=0){ if(matchOverPending) endMatch(); else startDraft(); }
    return;
  }
  if(state==='draft'&&!testMode){ draftT-=dt; const sl=Math.max(0,Math.ceil(draftT)); UI.draftClock.textContent=sl+'s'; UI.draftClock.classList.toggle('warn',sl<=10); if(sl<=10&&sl!==draftTick&&sl>0){ draftTick=sl; SFX.tick(); } if(draftT<=0){ const left=[...UI.cards.children].filter(c=>!c.classList.contains('picked')); if(left.length){ toast('Time up! A random card was picked for you','status'); left[Math.floor(Math.random()*left.length)].click(); } } }
  if(state==='bover'){ if(btHook) btHook.over(dt); return; } // Battle: the scoreboard between matches
  if(state==='draft'||state==='picked'||state==='matchover'){ fxUpdate(dt); updateCamera(dt); vis(); return; }
  // ---- fight ----
  roundInfo.t+=dt; if(matchKind==='battle'&&btHook) btHook.tick(dt); else if(mode!=='sandbox'){ const left=ROUND_LIMIT-roundInfo.t; if(left<=10&&Math.ceil(left)!==clockTick&&left>0){ clockTick=Math.ceil(left); SFX.tick(); } if(left<=0&&!(NET.on&&NET.role==='guest')){ timeUp(); return; } } if(jumpBuffer>0) jumpBuffer-=dt; if(tipsT>0) tipsT-=dt;
  const sbx=mode==='sandbox';
  if(sbx){ for(const f of [player,bot]) if(f.dead&&f.respawnT>0){ f.respawnT-=dt; if(f.respawnT<=0) respawn(f); } if(sandbox.bot==='dummy'&&!bot.dead&&bot.hp<bot.maxHp()) bot.hp=Math.min(bot.maxHp(),bot.hp+dt*12); }
  const steering=!!remoteCtl.b;
  const fwd=player.forward(); const right=V3(Math.cos(player.yaw),0,-Math.sin(player.yaw));
  const wish=V3(); if(!steering&&!player.dead){ if(keys.KeyW) wish.add(fwd); if(keys.KeyS) wish.sub(fwd); if(keys.KeyD) wish.add(right); if(keys.KeyA) wish.sub(right); if(pad.lx||pad.ly){ wish.addScaledVector(fwd,-pad.ly).addScaledVector(right,pad.lx); } if(TOUCH.mx||TOUCH.my){ wish.addScaledVector(fwd,-TOUCH.my).addScaledVector(right,TOUCH.mx); } if(wish.lengthSq()>1) wish.normalize(); }
  if(player.onGround) player.airDashed=false;
  if(wantDash){ wantDash=false; const air=!player.onGround; if(!steering&&!air&&player.dashCdT<=0&&!player.dead&&player.stunT<=0){ const dd=wish.lengthSq()>0.04?V3(wish.x,0,wish.z).normalize():fwd; player.dashDir.copy(dd); player.dashT=CFG.dashTime; player.dashCdT=CFG.dashCd; if(air){ player.airDashed=true; player.vel.y=Math.max(player.vel.y,1.5); } SFX.dash(); } }
  if(blockBuf>0){ if(steering){ remoteCtl.b.remote=false; remoteCtl.b=null; steerLatch=true; } if(tryBlock(player,!blockFresh)) blockBuf=0; else { if(blockFresh&&player.blockCdT>0.5&&!player.blockActive){ UI.blockCd.classList.remove('deny'); void UI.blockCd.offsetWidth; UI.blockCd.classList.add('deny'); SFX.hover(); } blockBuf-=dt; } blockFresh=false; }
  if((fireHeld||keys.KeyF||pad.fire||TOUCH.fire||firePressed)&&!steerLatch&&!player.dead) tryFire(player,firePressed); firePressed=false;
  if(!player.dead){ updateFighterTimers(player,dt); moveFighter(player,dt,wish,jumpBuffer>0&&!steering); }
  for(const f of fighters){ if(f===player||f.active===false) continue;
    if(f.ctl==='net'){ if(!f.dead) updateFighterTimers(f,dt); netApplyRemote(f,dt); continue; }
    if(f.dead) continue; updateFighterTimers(f,dt); if(botHold) continue; if(botPuppet){ moveFighter(f,dt,V3(),false); continue; } // scripted (trailer) bots: physics only
    const ai=!sbx||(sandbox.bot!=='dummy'&&sandbox.bot!=='none');
    if(ai&&enemies(f).length){ const bt=botThink(f,dt); moveFighter(f,dt,bt.wish,bt.jump); } else { if(!player.dead&&f===bot){ const fd=V3().subVectors(player.pos,bot.pos); bot.yaw=Math.atan2(-fd.x,-fd.z); } moveFighter(f,dt,V3(),false); } }
  separateFighters();
  updateBullets(dt); if(steering&&!remoteCtl.b) steerLatch=true;
  updateBombs(dt); updateFields(dt,t); fxUpdate(dt);
  vis(); updateCamera(dt); if(!remoteCtl.b) computeAimPoint(); updateHUD();
}

// ================= LOOP =================
let last=performance.now(); let autoRun=true, doRender=true, frames=0, testMode=false;
let perfAcc=0, perfN=0, perfLevel=0;
const DYN={acc:0,n:0,good:0,cool:0}; const fpsEl=document.getElementById('fpsMeter'); let fpsT=0, fpsF=0;
function dynFrame(raw){ // keep frames smooth: render a few % fewer pixels when the frame rate drops, creep back up when it's comfortable
  if(raw>0.25||document.hidden) return; fpsT+=raw; fpsF++;
  if(fpsEl){ const on=!!settings.fps; if(fpsEl._on!==on){ fpsEl._on=on; fpsEl.style.display=on?'block':'none'; } if(on&&fpsT>=0.5){ fpsEl.textContent=Math.round(fpsF/fpsT)+' FPS · '+Math.round(dynRes*100)+'% res'; fpsT=0; fpsF=0; } } else if(fpsT>=0.5){ fpsT=0; fpsF=0; }
  if(!(state==='fight'||state==='countdown')||paused) { DYN.acc=0; DYN.n=0; return; }
  DYN.acc+=raw; DYN.n++; DYN.cool-=raw; if(DYN.acc<0.75) return; const avg=DYN.acc/DYN.n; DYN.acc=0; DYN.n=0; if(DYN.cool>0) return;
  DYN.t=(DYN.t||0)+0.75; if(DYN.ceilT>0){ DYN.ceilT-=0.75; if(DYN.ceilT<=0) DYN.ceil=1; } const ceil=DYN.ceil||1;
  if(DYN.freeze>0){ DYN.freeze-=0.75; return; }
  let nr=dynRes; if(avg>0.024){ nr=Math.max(0.82,dynRes-(avg>0.03?0.1:0.06)); DYN.good=0; if(DYN.t-(DYN.upAt||-99)<6){ DYN.ceil=nr; DYN.ceilT=40; } } // stepping up made it worse: stay here a while
  else if(avg<0.0175){ DYN.good++; if(DYN.good>=4&&dynRes<ceil){ nr=Math.min(ceil,dynRes+0.08); DYN.good=0; DYN.upAt=DYN.t; } } else DYN.good=0;
  if(Math.abs(nr-dynRes)>0.001){ DYN.pend=nr; DYN.cool=3.0; DYN.hist=(DYN.hist||[]).filter(x=>DYN.t-x<30); DYN.hist.push(DYN.t); if(DYN.hist.length>=4){ DYN.freeze=60; DYN.hist=[]; } } } // never more than a few changes in a row
function dynApply(){ if(DYN.pendQ){ const q=DYN.pendQ; DYN.pendQ=null; applyQuality(q); } if(DYN.pend===undefined) return; dynRes=DYN.pend; DYN.pend=undefined; resize(); } // resize right before drawing, so the frame you see is never a blank (black) canvas
function frame(now){ requestAnimationFrame(frame); if(clipHook) clipHook(0); const raw=Math.max(0,(now-last)/1000); const dt=Math.min(0.05,raw); last=now; frames++; if(autoRun){ pollPad(dt); update(dt); } dynApply(); if(doRender){ drawFrame(); if(clipHook) clipHook(1); } dynFrame(raw);
  // auto quality: drop detail when the frame rate stays low
  if(settings.quality==='auto'&&autoRun&&!paused&&!document.hidden&&raw<0.5){ perfAcc+=raw; perfN++; if(perfN>=90){ const avg=perfAcc/perfN; perfAcc=0; perfN=0; if(avg>0.028&&perfLevel<2){ perfLevel++; DYN.pendQ=perfLevel===1?'medium':'low'; toast('Graphics lowered to keep the game smooth. Change it in settings.','you'); } } } }
menuRoster(); placeAtBases(); buildPips(); updateCardStrips(); updateHUD(); update(0.016);
show(UI.start,true,'block'); { const el=UI.loading; let gone=false; const go=()=>{ if(gone) return; gone=true; el.classList.add('out'); setTimeout(()=>show(el,false),650); }; const left=Math.max(1400,2700-(performance.now()-(window.__t0||0))); if(testMode||!autoRun) go(); else { setTimeout(go,left); addEventListener('keydown',go,{once:true}); el.addEventListener('pointerdown',go,{once:true}); } }
requestAnimationFrame(frame);

// debug / test hooks
/*DEBUG-START*/window.__game={ dynFrame:(r)=>dynFrame(r), dynApply:()=>dynApply(), dynRes:()=>dynRes, sparks:()=>sparkPool, NET, tethers:()=>tethers, cardHTML:(id)=>cardHTML(id,0,0,false), magnetLand:(b,p)=>magnetLand(b,p), look:()=>({LOOK,scene,renderer,hemi,sun,curMap,lookEnv,lookMap,mergeInfo:curMap&&curMap.mergeInfo}), setDraftT:v=>{ draftT=v; }, setTestMode:v=>{ testMode=v; }, kenReady:()=>KEN.ready, kenProto:()=>KEN.proto, mapInfo:()=>({sealed:curMap.sealed}), resolveWalls:f=>resolveWalls(f), holdCam:v=>{ camHold=v; }, get bulletsArr(){ return bullets; }, doBlock:f=>doBlock(f), tryBlock:(f)=>tryBlock(f), holdBot:v=>{ botHold=v; }, puppet:v=>{ botPuppet=v; }, camera, bakeMap:id=>{ applyMap(id); return bakeCompute(id); }, bakeOn:v=>bakeSetOn(v), mapGroup:()=>curMap.group, boxCount:()=>boxes.length, SFX, art:id=>ART.svg(id), groundAt, get ramps(){return ramps;}, get hx(){return HX;}, get hz(){return HZ;}, get state(){return state;}, set state(v){state=v;}, get mode(){return mode;}, player, bot, fighters, get roundNum(){return roundNum;}, bullets, bombs, fields, get boxes(){return boxes;}, CARDS, WAVE1:ALL_CARDS, ALL_CARDS, computeStats, score, settings, sandbox, roundInfo, remoteCtl,
  step(dt){ update(dt); }, setAuto(v){ autoRun=v; testMode=!v; }, setRender(v){ doRender=v; }, startMatch, beginRound, startDraft, startSandbox, openSandbox, tryFire, tryBlock, firePellets, doBlock, give(f,id){ (f==='bot'?bot:player).addCard(id); updateCardStrips(); }, clearCards(){ player.setCards([]); bot.setCards([]); },
  forceFight(){ state='fight'; show(UI.countdown,false); }, keys, setMouse(v){ fireHeld=v; if(v){ firePressed=true; steerLatch=false; } }, block(){ pressBlock(); }, dash(){ wantDash=true; }, jump(){ jumpBuffer=0.15; }, get frames(){return frames;}, art:ART.svg, killFighter, hasLOS, render(){ drawFrame(); }, get paused(){return paused;}, pause, camera, explode, endMatch, coachPick, applyDamage, applyMap, applyQuality, toMenu, get map(){return curMapId;} };
/*DEBUG-END*/
