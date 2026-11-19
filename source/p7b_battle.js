// ================= BATTLE: drop-in matches for up to 10 =================
// Press Play and you land in an open public match (or start a new one). Bots fill the empty spots and step out as people join.
// No rounds: get knocked out, pick a card while the fight carries on, and drop back in with a short shield.
// First to 10 knockouts wins; then everyone's cards are wiped and the next match starts by itself.
// Online, one player's game is the referee (scores, knockouts, the bots). If they leave, the server hands that job on.
const BT_N=10, BT_WIN=10, BT_TIME=480, BT_PICK=10, BT_OVER=11, BT_BOT_BACK=2.4, BT_SHIELD=1.6, BT_ROOM='bt1-', BT_ROOMS=40, BT_HZ=66;
const BT={ on:false, online:false, no:0, me:0, seats:new Array(BT_N).fill(null), mid:0, ph:'count', t:0, overT:0, w:-1, kf:[], kfSeq:0, kfShown:0,
  picking:false, pickT:0, first:false, deadT:0, refill:{}, joining:false, lastHost:0, hidTimer:null, waitT:0, overShown:false, introDone:false };
const btHost=()=>!BT.online||NET.role==='host';
const btSlotOf=f=>f.slot;
// the Fighter that plays slot k on this screen (you are always `player`)
function btF(k){ if(k===BT.me) return player; return seatFighter(k<BT.me?k+1:k); }
const btSeatedF=k=>BT.seats[k]?btF(k):null;
const btOwns=f=>f===player||(f.ctl==='ai'&&btHost());
const btName=()=>{ const n=(settings.name||'').trim(); return n||('Player'+(100+Math.floor(Math.random()*900))); };
let btMyName='';

// ---------- seats ----------
function btNetReset(f){ f.rs=null; f.nrShot=-1; f.nrBlock=-1; f.nrCards=''; f.nShots=[]; f.nShotId=0; f.nBlock=0; f.leaving=false; f.snaps=[]; f.lastLocalHit=0; }
function btHide(f){ f.dead=true; f.hp=0; f.mesh.visible=false; for(const k of ['dome','dome2','domeRing','sawRing','aura','auraRing','statusRing']) if(f[k]) f[k].visible=false; }
function btSeat(k,seat){ BT.seats[k]=seat; const f=btF(k), me=k===BT.me;
  f.slot=k; f.side=k; f.name=me?btMyName:seat.n; f.lv=seat.b?(DIFF[seat.lv]||DIFF.normal):null; f.peer=(!me&&!seat.b)?seat.p:null; f.ctl=me?'local':(seat.b&&btHost()?'ai':'net');
  f.setTeam(TEAM[SLOT_TEAMS[k]]); if(!fighters.includes(f)) fighters.push(f); f.active=true;
  f.setCards([]); f.score=0; f.deaths=0; f.life=f.life|0; f.respawnT=0; btHide(f); btNetReset(f); aiReset(f); ffaBoardKey=''; return f; }
function btUnseat(k,quiet){ const f=btF(k); BT.seats[k]=null;
  if(!quiet&&!f.dead&&f.mesh.visible){ burst(f.center(),f.team.light,18,6,0.12,0.6,0); shockRing(V3(f.pos.x,f.pos.y+0.06,f.pos.z),f.team.light,2.4,0.4); }
  const i=fighters.indexOf(f); if(i>=0) fighters.splice(i,1); f.setActive(false); f.peer=null; ffaBoardKey=''; }

// Battle bots all play at Normal (a very good player)
const btLv=()=>'normal';
// ---------- spawning ----------
function btSpot(f){ const sp=curMap.spawns||[[0,0]]; const others=fighters.filter(x=>x!==f&&!x.dead&&x.active!==false);
  const sc=sp.map(s=>{ let d=60; for(const o of others) d=Math.min(d,Math.hypot(o.pos.x-s[0],o.pos.z-s[1])); return {s,d:d+Math.random()*5}; }).sort((a,b)=>b.d-a.d);
  return sc[Math.floor(Math.random()*Math.min(3,sc.length))].s; }
function btSpawn(f){ const s=btSpot(f); const g=groundAt(s[0],s[1],20,0.3);
  f.resetRound(); f.pos.set(s[0],g===null?1:g,s[1]); f.vel.set(0,0,0); f.yaw=Math.atan2(s[0],s[1]); f.pitch=0; f.onGround=true; f.spawn.copy(f.pos);
  f.invulnT=BT_SHIELD; f.life=(f.life|0)+1; f.respawnT=0; aiReset(f); f.setMood('normal',0);
  burst(f.center(),f.team.light,16,6,0.12,0.6,0); shockRing(V3(f.pos.x,f.pos.y+0.06,f.pos.z),f.team.light,2.4,0.45); }
// someone else's fighter came back (their own screen spawned them)
function btRevive(f,life){ f.resetRound(); f.life=life; f.invulnT=BT_SHIELD; f.snaps=[]; if(f.rs) f.pos.copy(f.rs.pos); f.vel.set(0,0,0);
  burst(f.center(),f.team.light,16,6,0.12,0.6,0); shockRing(V3(f.pos.x,f.pos.y+0.06,f.pos.z),f.team.light,2.4,0.45); ffaBoardKey=''; }
function btPlaceAll(){ for(const f of fighters) if(btOwns(f)&&!f.dead) btSpawn(f); }

// ---------- match flow ----------
function btHudOn(){ show(UI.hud,true,'block'); UI.hud.classList.remove('sandboxmode'); UI.hud.classList.add('ffamode','battlemode'); show(UI.start,false); show(UI.draft,false); show(UI.matchover,false); show(UI.pause,false); paused=false; document.getElementById('online').classList.remove('open'); }
function btArena(){ if(curMapId!=='skyfort') applyMap('skyfort'); matchKind='battle'; mode='match'; sandbox.open=false; show(UI.sandbox,false); for(const f of ffaPool) f.setActive(false); bot.setActive(false); fighters.length=0; BT.seats=new Array(BT_N).fill(null); BT.refill={}; BT.kf=[]; BT.kfShown=BT.kfSeq; ffaRows.clear(); }
// host or offline: a fresh line-up (you plus bots everywhere else)
function btBegin(){ btArena(); BT.on=true; BT.me=0; const names=BOT_NAMES.slice().sort(()=>Math.random()-0.5);
  btSeat(0,{p:BT.online?myPeerId():'me',n:btMyName,b:false}); let j=0; for(let k=1;k<BT_N;k++) btSeat(k,{p:null,n:names[j++%names.length],b:true,lv:btLv()});
  btNewMatch(1); }
function btNewMatch(mid){ btChampHide(); BT.mid=mid; BT.streak=0; BT.best=0; BT.ph='count'; BT.t=0; BT.w=-1; BT.overT=0; BT.overShown=false; btClosePick(); show(UI.btOver,false); UI.banner.className='banner'; clearTimeout(UI.banner._t);
  clearProjectiles(); for(const f of fighters){ f.score=0; f.deaths=0; f.setCards([]); f.lastHitBy=null; }
  for(const f of fighters) if(btOwns(f)) btSpawn(f);
  roundInfo.shots=0; roundInfo.hits=0; roundInfo.dmg=0; roundInfo.botBlocked=0; roundInfo.t=0; roundInfo.cause=''; for(const k in matchStats) matchStats[k]=0; roundNum=1;
  state='countdown'; countdownT=3.2; countdownStep=-1; resetInputs(); btHudOn(); hurtT=0; dmgDirT=0; specT=null; updateHUD(); updateCardStrips(); SFX.music('fight'); ffaBoardKey='';
  if(!BT.introDone){ BT.introDone=true; tipsT=0; setTimeout(()=>{ if(BT.on) toast('<b>First to 10 knockouts wins.</b> Get knocked out and you pick a card','status'); },3300); } }
function btEnd(w){ BT.ph='over'; BT.w=w?w.slot:-1; BT.overT=BT_OVER; btEnterOver(); }
function btEnterOver(){ if(state==='bover') return; state='bover'; btClosePick(); exitLock(); slowMoT=0.9; shakeT=Math.max(shakeT,0.3); BT.overShown=false; firePressed=false; fireHeld=false;
  const w=btSeatedF(BT.w), L=btRecordEnd(w===player); if(w===player){ btChampion(L); return; }
  showBanner(w?esc(w.name).toUpperCase()+' WINS':'TIME!','#e0364f','lose'); SFX.lose(); }
function btWinnerByScore(){ let best=null; for(const f of fighters){ if(f.active===false) continue; if(!best||f.score>best.score||(f.score===best.score&&(f.deaths|0)<(best.deaths|0))) best=f; } return best; }

// ---------- knockouts ----------
function btOnKill(f,by){ f.respawnT=0; /*DEBUG-START*/if(window.__aiTap) window.__aiTap('ko',by,f);/*DEBUG-END*/
  if(btHost()){ f.deaths=(f.deaths|0)+1; const cr=(by&&by!==f&&fighters.includes(by)&&gameT-(f.lastHitT||-99)<=8)?by:null;
    if(cr) cr.score=(cr.score|0)+1; BT.kf.push([++BT.kfSeq,cr?cr.slot:-1,f.slot]); if(BT.kf.length>8) BT.kf.shift();
    if(f.ctl==='ai') f.respawnT=BT_BOT_BACK; btFeed(); ffaBoardKey='';
    if(cr&&cr.score>=BT_WIN&&BT.ph!=='over') btEnd(cr); }
  if(f===player){ BT.streak=0; specT=(by&&by!==player&&!by.dead)?by:null; BT.deadT=1.0; BT.first=false; if(state==='fight') showBanner('KNOCKED OUT!','#e0364f','lose'); } }
function btFeed(){ for(const e of BT.kf){ if(e[0]<=BT.kfShown) continue; BT.kfShown=e[0]; const k=btSeatedF(e[1]), v=btSeatedF(e[2]); if(!v) continue;
  const nm=x=>x===player?'You':esc(x.name); const c=x=>`<b style="color:${btTxt(x)}">${nm(x)}</b>`;
  const cls=v===player?'bot':(k===player?'you':'status');
  toast(k?`${c(k)} knocked out ${c(v)}`+(k===player?` · <b>${player.score}/${BT_WIN}</b>`:''):`${c(v)} fell off`,cls);
  if(k===player){ killMarkT=0.45; BT.streak=(BT.streak|0)+1; BT.best=Math.max(BT.best|0,BT.streak); } } }

// name colour that stays readable on the dark toasts
const btTxt=f=>f.team===TEAM.black?'#b4bdd2':f.team===TEAM.player?'#6fe9ff':f.team.css;
// ---------- the card picker (you're out: pick one, then you're back) ----------
function btOpenPick(first){ if(BT.picking) return; BT.picking=true; BT.first=first; BT.pickT=BT_PICK;
  const opts=pick3(); const rec=coachPick(opts,true); pad.focus=Math.max(0,opts.indexOf(rec.id));
  const k=player.lastHitBy; UI.draftTitle.textContent=first?'PICK YOUR FIRST CARD':'PICK A CARD';
  UI.draftSub.textContent=first?'Then you drop into the match.':(k&&k!==player&&fighters.includes(k)?`${k.name} knocked you out. Pick a card and get back in there.`:'You got knocked out. Pick a card and get back in there.');
  UI.coach.innerHTML=`<b>COACH:</b> take <em style="color:${CARDS[rec.id].c}">${CARDS[rec.id].name}</em>. ${rec.why}`;
  UI.cards.innerHTML=''; renderStatbar(null); UI.draftClock.textContent=BT_PICK+'s'; UI.draftClock.classList.remove('warn'); BT.rec=rec.id;
  opts.forEach((id,i)=>{ const c=CARDS[id]; const el=document.createElement('div'); el.className=`card t-${c.type}`+(id===rec.id?' rec':''); el.style.setProperty('--c',c.c); el.style.setProperty('--i',i);
    el.innerHTML=cardHTML(id,i,player.cards.filter(x=>x===id).length,id===rec.id); el._hover=()=>{ if(UI.statbar._id!==id){ UI.statbar._id=id; renderStatbar(id); } };
    el.addEventListener('mouseenter',()=>{ SFX.hover(); el._hover(); }); el.addEventListener('mouseleave',()=>{ UI.statbar._id=null; renderStatbar(null); });
    el.addEventListener('click',()=>{ if(!BT.picking||el.classList.contains('picked')) return; el.classList.add('picked'); for(const o of UI.cards.children) if(o!==el) o.classList.add('gone'); btPicked(id); });
    UI.cards.appendChild(el); setTimeout(()=>SFX.deal(),80+i*110); });
  UI.statbar._id=null; UI.draft.classList.add('bpick'); show(UI.draft,true); UI.banner.className='banner'; exitLock(); }
function btPicked(id){ player.addCard(id); SFX.pick(); BT.picking=false; BT.first=false; setTimeout(()=>{ if(!BT.picking){ show(UI.draft,false); UI.draft.classList.remove('bpick'); } },380);
  if(!paused) requestLock(); if(state==='fight'||state==='countdown') btSpawn(player); else if(state!=='bover'){ btSpawn(player); } updateCardStrips(); ffaBoardKey=''; }
function btClosePick(){ BT.picking=false; UI.draft.classList.remove('bpick'); if(state!=='draft') show(UI.draft,false); }

// ---------- every fight frame ----------
function btTick(dt){ if(!BT.on) return; BT.t+=dt; const host=btHost();
  // your own way back in
  if(player.dead&&!BT.picking){ BT.deadT-=dt; if(BT.deadT<=0) btOpenPick(BT.first); }
  if(BT.picking){ BT.pickT-=dt; const sl=Math.max(0,Math.ceil(BT.pickT)); if(UI.draftClock._s!==sl){ UI.draftClock._s=sl; UI.draftClock.textContent=sl+'s'; UI.draftClock.classList.toggle('warn',sl<=3); if(sl<=3&&sl>0) SFX.tick(); }
    if(BT.pickT<=0){ const el=[...UI.cards.children].find(c=>c.classList.contains('rec'))||UI.cards.children[0]; if(el) el.click(); } }
  if(!host) return;
  // bots come back after a moment, with a new card
  for(const f of fighters){ if(f.ctl!=='ai'||f.active===false||!f.dead) continue; if(f.respawnT<=0) f.respawnT=BT_BOT_BACK; f.respawnT-=dt; if(f.respawnT<=0){ botPick(f,true); btSpawn(f); } }
  // a bot takes over a spot someone left
  for(const k in BT.refill){ if(gameT<BT.refill[k]) continue; delete BT.refill[k]; if(BT.seats[k]) continue; const used=new Set(BT.seats.filter(Boolean).map(s=>s.n)); const n=BOT_NAMES.find(x=>!used.has(x))||'Bot'; const f=btSeat(+k,{p:null,n,b:true,lv:btLv()}); f.respawnT=0.5; }
  if(BT.t>=BT_TIME&&BT.ph!=='over') btEnd(btWinnerByScore());
  if(BT.ph==='count') BT.ph='fight'; }
// the scoreboard between matches
function btOver(dt){ BT.overT-=dt; let sdt=dt; if(slowMoT>0){ slowMoT-=dt; sdt=dt*0.3; }
  updateBullets(sdt); updateBombs(sdt); updateFields(sdt,gameT); fxUpdate(sdt);
  for(const f of fighters){ if(f.active===false) continue; if(f.ctl==='net') netApplyRemote(f,sdt); else if(!f.dead) moveFighter(f,sdt,V3(),f===player&&BW.hop); if(!f.dead) f.updateVisual(sdt,gameT); }
  BW.hop=false; updateCamera(dt); if(!BW.on) updateHUD();
  if(BW.on){ btChampTick(dt,sdt); if(btHost()&&BT.overT<=0) btNewMatch(BT.mid+1); return; }
  if(!BT.overShown&&BT.overT<BT_OVER-1.3){ BT.overShown=true; btScoreboard(); show(UI.btOver,true,'block'); UI.banner.className='banner'; }
  if(BT.overShown){ const s=Math.max(0,Math.ceil(BT.overT)); if(UI.btNext._s!==s){ UI.btNext._s=s; UI.btNext.textContent=`Next match in ${s}s. Everyone's cards reset.`; } }
  if(btHost()&&BT.overT<=0) btNewMatch(BT.mid+1); }
function btScoreboard(){ const w=btSeatedF(BT.w); const L=fighters.filter(f=>f.active!==false).sort((a,b)=>(b.score-a.score)||((a.deaths|0)-(b.deaths|0)));
  UI.btOverTitle.textContent=w===player?'YOU WIN!':w?esc(w.name).toUpperCase()+' WINS':'MATCH OVER'; UI.btOverTitle.className='title stroke '+(w===player?'win':'lose');
  UI.btRows.innerHTML='<div class="bo-h"><span></span><span>Player</span><span>KOs</span><span>Outs</span></div>'+L.map((f,i)=>`<div class="bo-r${f===player?' me':''}" style="--c:${f.team.css}"><span class="bo-n">${i+1}</span><span class="bo-nm"><i></i>${esc(f===player?btMyName:f.name)}${f===player?' <small>(you)</small>':''}${f.ctl!=='local'&&!f.peer?' <em>bot</em>':''}</span><b>${f.score|0}</b><span>${f.deaths|0}</span></div>`).join(''); }

// ---------- the champion moment: you won a Battle ----------
// Slow-mo, the camera swings round to you, gold fireworks, a CHAMPION stamp with confetti and a fanfare,
// your stats count up, your lifetime wins tick over (+1), and the podium slides in. One button saves the winning clip.
const BW={on:false,t:0,fwT:0,hopT:0,hop:false,ang:0,gen:0,conf:null,shown:false,L:null,camInit:false};
function btLife(){ const L={wins:0,streak:0,best:0,kos:0}; try{ Object.assign(L,JSON.parse(localStorage.getItem('domeRoundsBattle1')||'{}')); }catch(e){} return L; }
function btRecordEnd(won){ const L=btLife(); L.kos+=player.score|0; if(won){ L.wins++; L.streak++; L.best=Math.max(L.best,L.streak); } else L.streak=0; try{ localStorage.setItem('domeRoundsBattle1',JSON.stringify(L)); }catch(e){} return L; }
function btChampion(L){ BW.on=true; BW.t=0; BW.fwT=0.15; BW.hopT=0.9; BW.shown=false; BW.L=L; BW.camInit=false; BW.gen++; BW.ang=player.yaw+Math.PI;
  if(player.dead) btSpawn(player); player.invulnT=99; player.setMood('happy',14); show(UI.hud,false); UI.banner.className='banner';
  slowMoT=1.3; shakeT=Math.max(shakeT,0.4); SFX.champion();
  shockRing(V3(player.pos.x,player.pos.y+0.06,player.pos.z),0xffd23d,7,0.9); burst(player.center(),0xffd23d,50,11,0.11,1.2,0.4); }
function btChampHide(){ if(!BW.on&&!document.getElementById('btWin').classList.contains('show')) return; BW.on=false; BW.gen++; document.getElementById('btWin').classList.remove('show'); if(BW.conf) BW.conf.stop(); BW.conf=null; }
function btChampTick(dt,sdt){ BW.t+=dt; const p=player;
  // fireworks around you
  BW.fwT-=dt; if(BW.fwT<=0&&BW.t<9.5){ BW.fwT=rand(0.28,0.6); const away=Math.atan2(p.pos.z-camera.position.z,p.pos.x-camera.position.x), a=away+rand(-1.1,1.1), r=rand(4,10); const at=V3(p.pos.x+Math.cos(a)*r,p.pos.y+rand(2.2,5.5),p.pos.z+Math.sin(a)*r); /* behind you, in shot */
    const c=[0xffd23d,0xff2e88,0x35e9ff,0xffffff,0xa6e22e,0xffd23d][Math.floor(Math.random()*6)]; burst(at,c,48,rand(7,10),0.17,1.25,0.55); burst(at,0xffffff,14,3,0.1,0.5,0); if(Math.random()<0.6) SFX.firework(); }
  // happy little hops
  BW.hopT-=dt; if(BW.hopT<=0&&p.onGround){ BW.hop=true; BW.hopT=rand(0.75,1.15); }
  if(!BW.shown&&BW.t>0.85) btChampShow();
  const s=Math.max(0,Math.ceil(BT.overT)), nx=document.getElementById('bwNext'); if(nx._s!==s){ nx._s=s; nx.textContent=`Next match in ${s}s. Everyone's cards reset.`; } }
// the camera swings round to face you and slowly circles
function btChampCam(dt){ if(!BW.on) return false; const p=player.pos; BW.ang+=dt*0.42; const R=6.6-2*Math.min(1,BW.t/2.5);
  const head=V3(p.x,p.y+1.25,p.z); const want=V3(p.x+Math.sin(BW.ang)*R,p.y+2.6+Math.sin(BW.t*0.7)*0.35,p.z+Math.cos(BW.ang)*R);
  const hit=segmentHitsBoxes(head,want,0.25,true); if(hit!==null) want.lerpVectors(head,want,Math.max(0.3,hit-0.05));
  if(!BW.camInit){ BW.camInit=true; camera.position.lerp(want,0.35); } else camera.position.lerp(want,Math.min(1,dt*3.5));
  if(Math.abs(camera.fov-52)>0.05){ camera.fov+=(52-camera.fov)*Math.min(1,dt*3); camera.updateProjectionMatrix(); } camera.lookAt(head.x,head.y+0.15,head.z);
  const d=V3().subVectors(camera.position,p); player.yaw=Math.atan2(-d.x,-d.z); player.pitch=0; return true; }
function btChampShow(){ BW.shown=true; const g=BW.gen, L=BW.L, $=id=>document.getElementById(id), later=(ms,fn)=>setTimeout(()=>{ if(BW.gen===g) fn(); },ms);
  const all=fighters.filter(f=>f.active!==false).sort((a,b)=>(b.score-a.score)||((a.deaths|0)-(b.deaths|0)));
  const people=BT.seats.filter(x=>x&&!x.b).length, beat=all.length-1, m=Math.floor(BT.t/60), sec=Math.floor(BT.t%60);
  $('bwSub').innerHTML=BT.online?`Match <b>#${BT.no}</b> · you beat <b>${beat}</b> players${people>1?` (${people-1} real ${people-1===1?'person':'people'})`:''}`:`You beat <b>${beat}</b> bots`;
  const st=[[player.score|0,'KNOCKOUTS','#ffd23d'],[BT.best|0,'BEST STREAK','#ff2e88'],[player.deaths|0,'TIMES OUT','#35e9ff'],[m+':'+String(sec).padStart(2,'0'),'MATCH TIME','#a6e22e']];
  $('bwStats').innerHTML=st.map((x,i)=>`<div class="bw-st" style="--i:${i};--c:${x[2]}"><b data-to="${typeof x[0]==='number'?x[0]:''}">${typeof x[0]==='number'?0:x[0]}</b><span>${x[1]}</span></div>`).join('');
  const md=['g','s','b'];
  $('bwPod').innerHTML=all.slice(0,3).map((f,i)=>`<div class="bw-row${f===player?' me':''}" style="--i:${i};--c:${f.team.css}"><span class="md ${md[i]}">${i+1}</span><span class="nm">${esc(f===player?btMyName:f.name)}${f===player?' <small>(you)</small>':''}</span><span class="ko">${f.score|0}</span></div>`).join('');
  const wb=$('bwWins'); wb.textContent=Math.max(0,L.wins-1); wb.classList.remove('bump'); $('bwPlus').classList.remove('go'); const bd=$('bwBadge'); bd.className='bw-badge'; bd.textContent='';
  const cb=$('bwClip'); cb.style.display=(typeof CLIP!=='undefined'&&CLIP.ok&&settings.clips)?'':'none'; cb.disabled=false; cb.textContent='SAVE THE WINNING CLIP'; $('bwClipBtns').innerHTML='';
  const el=$('btWin'); el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  BW.conf=btConfetti($('bwConfetti'));
  later(420,()=>{ SFX.stamp(); shakeT=Math.max(shakeT,0.25); BW.conf&&BW.conf.burst(0.5,0.3,160,1); });
  // count the stats up, tick tick tick
  later(1400,()=>{ document.querySelectorAll('#bwStats b[data-to]').forEach((b,i)=>{ const to=+b.dataset.to; if(!to) return; let n=0; const step=Math.max(40,Math.min(110,700/to)); const go=()=>{ if(BW.gen!==g) return; n++; b.textContent=n; SFX.coin(); if(n<to) setTimeout(go,step); }; setTimeout(go,i*120); }); });
  later(2100,()=>{ BW.conf&&(BW.conf.burst(0.02,0.95,90,-1),BW.conf.burst(0.98,0.95,90,1)); });
  later(2600,()=>{ wb.textContent=L.wins; wb.classList.add('bump'); $('bwPlus').classList.add('go'); SFX.levelup();
    const t=L.wins===1?'FIRST WIN EVER!':L.streak>=2?(L.streak>=L.best?`${L.streak} IN A ROW · NEW BEST!`:`${L.streak} IN A ROW!`):L.wins%10===0?`${L.wins} WINS!`:''; if(t) later(450,()=>{ bd.textContent=t; bd.classList.add('on'); SFX.coin(); }); });
  later(4200,()=>{ BW.conf&&BW.conf.rain(140); }); }
(()=>{ const cb=document.getElementById('bwClip'); if(!cb) return; cb.addEventListener('click',async()=>{ if(cb.disabled) return; cb.disabled=true; cb.textContent='SAVING…';
  try{ await clipSave(); }catch(e){} cb.style.display='none'; document.getElementById('bwClipBtns').innerHTML='<button class="btn sec" type="button" data-cs="0">SHARE CLIP</button><button class="btn sec" type="button" data-cd="0">DOWNLOAD CLIP</button>'; }); })();
// confetti: paper bits that flutter, spin and fall
function btConfetti(cv){ const ctx=cv.getContext('2d'); const D=Math.min(1.5,window.devicePixelRatio||1); let W=0,H=0, P=[], raf=0, live=true, last=performance.now();
  const fit=()=>{ W=cv.clientWidth; H=cv.clientHeight; cv.width=W*D; cv.height=H*D; ctx.setTransform(D,0,0,D,0,0); }; fit();
  const cols=['#ffd23d','#ff2e88','#35e9ff','#ffffff','#a6e22e','#b18cff','#ff8a2e'];
  const add=(x,y,vx,vy)=>{ if(P.length>520) return; P.push({x,y,vx,vy,r:Math.random()*6.3,vr:(Math.random()-0.5)*14,w:6+Math.random()*7,h:4+Math.random()*5,c:cols[Math.floor(Math.random()*cols.length)],wob:Math.random()*6.3,ws:4+Math.random()*6,round:Math.random()<0.2}); };
  const api={ burst(fx,fy,n,dir){ const x=fx*W, y=fy*H; for(let i=0;i<n;i++){ const a=dir===1&&fx>0.9?-2.2+Math.random()*0.9:dir===-1?-0.95-Math.random()*0.9:-Math.PI/2+(Math.random()-0.5)*2.6; const sp=(dir?700:520)+Math.random()*520; add(x,y,Math.cos(a)*sp*(dir===1&&fx>0.9?1:1),Math.sin(a)*sp); } },
    rain(n){ for(let i=0;i<n;i++) add(Math.random()*W,-20-Math.random()*H*0.6,(Math.random()-0.5)*60,60+Math.random()*120); },
    stop(){ live=false; cancelAnimationFrame(raf); ctx.clearRect(0,0,W,H); } };
  const tick=now=>{ if(!live) return; const dt=Math.min(0.05,(now-last)/1000); last=now; if(cv.clientWidth!==W||cv.clientHeight!==H) fit(); ctx.clearRect(0,0,W,H);
    for(let i=P.length-1;i>=0;i--){ const q=P[i]; q.vy+=900*dt; q.vx*=Math.pow(0.18,dt); q.vy*=Math.pow(0.35,dt); q.vy=Math.min(q.vy,260); q.wob+=q.ws*dt; q.x+=(q.vx+Math.sin(q.wob)*40)*dt; q.y+=q.vy*dt; q.r+=q.vr*dt;
      if(q.y>H+30){ P.splice(i,1); continue; } ctx.save(); ctx.translate(q.x,q.y); ctx.rotate(q.r); ctx.scale(Math.cos(q.wob),1); ctx.fillStyle=q.c; if(q.round){ ctx.beginPath(); ctx.arc(0,0,q.h*0.6,0,6.3); ctx.fill(); } else ctx.fillRect(-q.w/2,-q.h/2,q.w,q.h); ctx.restore(); }
    raf=requestAnimationFrame(tick); };
  raf=requestAnimationFrame(tick); return api; }

// ---------- HUD ----------
let btBoardKey='';
function btHud(){ UI.roundPill.textContent='FIRST TO '+BT_WIN; const left=Math.max(0,BT_TIME-BT.t), m=Math.floor(Math.ceil(left)/60), s=Math.ceil(left)%60; UI.roundClock.textContent=m+':'+String(s).padStart(2,'0'); UI.roundClock.classList.toggle('warn',left<=30); UI.roundClock.style.display='';
  const people=BT.seats.filter(x=>x&&!x.b).length; const sub=BT.online?`BATTLE · MATCH #${BT.no} · ${people} ${people===1?'PERSON':'PEOPLE'}`:'BATTLE · OFFLINE WITH BOTS'; if(UI.roundSub._t!==sub){ UI.roundSub._t=sub; UI.roundSub.textContent=sub; } }
function btBoard(){ const L=fighters.filter(f=>f.active!==false).sort((a,b)=>(b.score-a.score)||((a.deaths|0)-(b.deaths|0))||(a.slot-b.slot)); let rows=L.slice(0,5); if(!rows.includes(player)&&L.includes(player)) rows=rows.slice(0,4).concat([player]);
  const key=rows.map(f=>f.id+':'+f.score+':'+(f.dead?1:0)+':'+f.name).join('|')+'|'+(player.score|0);
  if(key===btBoardKey&&UI.ffaBoard.dataset.k==='bt') return; btBoardKey=key; UI.ffaBoard.dataset.k='bt';
  UI.ffaBoard.innerHTML=rows.map(f=>{ const rk=L.indexOf(f)+1; return `<div class="fb-row bt${f===player?' me':''}${f.dead?' out':''}" style="--c:${f.team.css}"><span class="fb-rk">${rk}</span><i class="fb-sw"></i><span class="fb-nm">${esc(f===player?btMyName:f.name)}${f===player?' <small>(you)</small>':''}</span><span class="fb-k">${f.score|0}<small>/${BT_WIN}</small></span></div>`; }).join(''); }

// ---------- online: our own server, drop-in rooms with a hand-over when the host leaves ----------
function btConnect(name){ return new Promise((resolve,reject)=>{ const base=DR_SERVER; if(!base||typeof WebSocket!=='function'){ reject({code:'upstream_error'}); return; }
  const me=Math.random().toString(36).slice(2,12); let ws; try{ ws=new WebSocket(base.replace(/^http/,'ws').replace(/\/$/,'')+'/room/'+encodeURIComponent(name)+'?role=any&peer='+me); }catch(e){ reject({code:'upstream_error'}); return; }
  let done=false; const M={mine:{},others:{},handlers:[],hostH:[],closeH:[],sendT:0,pingT:performance.now(),left:false,role:'guest',host:null};
  const alone=()=>{ for(const k in M.others) return false; return true; };
  const emit=()=>{ const peers=R.peers(); for(const h of M.handlers.slice()) try{ h({peers,joined:[],left:[],updated:[]}); }catch(e){ console.error(e); } };
  // nobody else here: just a keep-alive now and then (the server answers it without waking the room)
  const flush=now=>{ if(ws.readyState!==1) return; const t=performance.now(); if(alone()){ if(t-M.pingT>25000){ M.pingT=t; try{ ws.send('ping'); }catch(e){} } return; } if(!now&&t-M.sendT<BT_HZ) return; M.sendT=t; M.pingT=t; try{ ws.send(JSON.stringify(M.mine)); }catch(e){} };
  const R={ name, via:'server', me, role:()=>M.role, host:()=>M.host, alone, presence:async p=>{ for(const k in p){ if(p[k]===null) delete M.mine[k]; else M.mine[k]=p[k]; } flush(false); },
    peers:()=>[{peer:me,sameTab:true,isMe:true,kind:'viewer',presence:M.mine}].concat(Object.keys(M.others).map(k=>({peer:k,sameTab:false,isMe:false,kind:'viewer',presence:M.others[k]}))),
    onPeers:fn=>{ M.handlers.push(fn); return ()=>{ M.handlers=M.handlers.filter(h=>h!==fn); }; }, onHost:fn=>{ M.hostH.push(fn); }, onClose:fn=>{ M.closeH.push(fn); },
    leave:async()=>{ M.left=true; try{ ws.close(1000,'bye'); }catch(e){} }, connected:()=>ws.readyState===1 };
  ws.onmessage=ev=>{ if(ev.data==='pong') return; let m; try{ m=JSON.parse(ev.data); }catch(e){ return; }
    if(m.t==='hello'){ M.role=m.role==='host'?'host':'guest'; M.host=m.host; if(Array.isArray(m.peers)) for(const p of m.peers) if(typeof p==='string') M.others[p]=M.others[p]||{}; if(!done){ done=true; resolve(R); } }
    else if(m.t==='err'){ if(!done){ done=true; reject({code:m.code}); } }
    else if(m.t==='p'&&m.d&&typeof m.d==='object'&&!Array.isArray(m.d)){ M.others[m.f]=m.d; emit(); }
    else if(m.t==='joined'){ if(typeof m.f==='string') M.others[m.f]=M.others[m.f]||{}; flush(true); }
    else if(m.t==='left'){ delete M.others[m.f]; if(!M.left) emit(); }
    else if(m.t==='host'){ M.host=m.f; if(m.f===me) M.role='host'; for(const h of M.hostH) try{ h(m.f); }catch(e){ console.error(e); } } };
  ws.onclose=()=>{ if(!done){ done=true; reject({code:'upstream_error'}); return; } if(!M.left){ M.others={}; for(const h of M.closeH) try{ h(); }catch(e){} } };
  ws.onerror=()=>{};
  setTimeout(()=>{ if(!done){ done=true; try{ ws.close(); }catch(e){} reject({code:'upstream_error'}); } },7000); }); }
// Play: the first public match with space (or the one a friend sent you)
async function btPlay(friendNo){ if(BT.joining) return; SFX.unlock(); if(NET.on) await netLeave(); btStop(); BT.joining=true; btMyName=btName(); requestLock();
  btMsg(friendNo?`Joining match #${friendNo}…`:'Finding a match…');
  try{ const list=friendNo?[friendNo]:Array.from({length:BT_ROOMS},(_,i)=>i+1);
    for(const n of list){ let r; try{ r=await btConnect(BT_ROOM+n); }catch(e){ if(e&&e.code==='full'){ if(friendNo){ btMsg(`Match #${n} is full (10 people). Press Play to find another one.`,true); exitLock(); return; } continue; } throw e; }
      btGoOnline(r,n); return; }
    btMsg('Every match is full right now, so here\'s one with bots.',true); btStartOffline(); }
  catch(e){ btStartOffline('<b>Couldn\'t reach the game server</b>, so this is an offline match with bots.'); }
  finally{ BT.joining=false; } }
function btGoOnline(r,n){ netReset(); NET.room=r; NET.on=true; NET.kind='battle'; NET.role=r.role(); NET.code=String(n); NET.joinT=performance.now(); NET.hostPeer=NET.role==='host'?null:r.host(); NET.hits=[]; NET.hitSeq=0; NET.hitSeen={}; NET.clk={}; NET.shots=[]; NET.shotId=0; NET.blockN=0;
  BT.online=true; BT.no=n; BT.lastHost=performance.now(); BT.waitT=0;
  r.onPeers(ch=>netPeers(ch)); r.onHost(h=>btHostChanged(h)); r.onClose(()=>{ if(BT.online) btDrop('Lost the connection to the match.'); });
  if(NET.role==='host'){ btBegin(); btMsg(''); } else { BT.on=false; btMsg(`Joining match #${n}…`); }
  try{ const u=new URL(location.href); if(u.searchParams.get('battle')){ u.searchParams.delete('battle'); history.replaceState(null,'',u.pathname+u.search+u.hash); } }catch(e){} }
function btStartOffline(note){ if(NET.on) netLeave(); BT.online=false; BT.no=0; btMyName=btMyName||btName(); btBegin(); btMsg(''); if(note) setTimeout(()=>toast(note,'status'),400); }
function btDrop(why){ const was=BT.on; netLeave(); BT.online=false; if(was&&state!=='menu'){ toast(`<b>${why}</b>`,'status'); setTimeout(()=>{ toMenu(); btMsg(why,true); },1400); } else btMsg(why,true); }
function btStop(){ btChampHide(); for(const f of [bot,...ffaPool]) f.lv=null; BT.on=false; BT.online=false; btClosePick(); if(UI.btOver) show(UI.btOver,false); UI.hud.classList.remove('battlemode'); if(UI.ffaBoard) delete UI.ffaBoard.dataset.k; btBoardKey=''; }
// the referee job moved (the old host left)
function btHostChanged(h){ if(!BT.online) return; const me=myPeerId(), old=NET.hostPeer;
  if(h===me){ NET.role='host'; NET.hostPeer=null; if(!BT.on){ btBegin(); btMsg(''); return; } toast('<b>You\'re now running this match</b> (the last host left)','status');
    for(let k=0;k<BT_N;k++){ const s=BT.seats[k]; if(!s) continue; const f=btF(k); if(s.b){ f.ctl='ai'; aiReset(f); f.rs=null; if(f.dead) f.respawnT=BT_BOT_BACK; } else if(old&&s.p===old) btLeft(k); } }
  else { NET.hostPeer=h; BT.lastHost=performance.now(); } }
function btLeft(k){ const s=BT.seats[k]; if(!s) return; toast(`<b>${esc(s.n)}</b> left the match`,'status'); btUnseat(k); BT.refill[k]=gameT+3; }

// ---------- what we send ----------
function btSend(){ const r=NET.room; if(!r) return; const p=player, ts=Math.round(performance.now());
  const o={ v:3, r:NET.role, nm:btMyName, ds:[settings.domeSkin|0,settings.domeCol||''], f:fstate(p), sh:NET.shots, bk:NET.blockN, c:p.cards, ht:NET.hits, ts, lf:p.life|0, dd:p.dead?1:0 };
  if(btHost()&&BT.on){ o.B=btState(); o.bots=fighters.filter(f=>f.ctl==='ai'&&f.active!==false).map(f=>({s:f.slot,f:fstate(f),sh:f.nShots||[],bk:f.nBlock||0,c:f.cards,ts,lf:f.life|0})); }
  else { o.B=null; o.bots=null; }
  r.presence(o).catch(()=>{}); }
function btState(){ const A=fn=>BT.seats.map((s,k)=>s?fn(btF(k)):0);
  return { m:BT.mid, ph:BT.ph, t:Math.round(BT.t*10)/10, w:BT.w, ot:Math.round(BT.overT*10)/10, st:BT.seats.map(s=>s?[s.b?'':s.p,s.n,s.b?1:0,s.lv||'']:0),
    k:A(f=>f.score|0), d:A(f=>f.deaths|0), l:A(f=>f.life|0), x:A(f=>f.dead?1:0), hp:A(f=>Math.max(0,Math.round(f.hp))), kf:BT.kf.slice(-6) }; }

// ---------- what we receive ----------
function btPeers(ch){ const others=ch.peers.filter(p=>!p.sameTab&&p.presence&&p.presence.v===3); const now=performance.now(); for(const p of others) NET.rx[p.peer]=now;
  if(btHost()){ if(BT.on) btHostSeats(others); } else btFollow(others);
  if(!BT.on) return; for(const p of others) btRx(p.peer,p.presence); }
// host: give each new person a spot (a free one, or the bot with the fewest knockouts), and free up the spots of anyone who left
function btHostSeats(others){ const ids=new Set(others.map(p=>p.peer)), me=myPeerId();
  for(let k=0;k<BT_N;k++){ const s=BT.seats[k]; if(s&&!s.b&&s.p!==me&&!ids.has(s.p)) btLeft(k); }
  for(const p of others){ const s=BT.seats.find(x=>x&&x.p===p.peer); const nm=cleanName(p.presence.nm);
    if(s){ if(s.n!==nm){ s.n=nm; const f=fighters.find(x=>x.peer===p.peer); if(f){ f.name=nm; ffaBoardKey=''; } } continue; }
    const k=btFreeSlot(); if(k<0) continue; if(BT.seats[k]) btUnseat(k); delete BT.refill[k];
    btSeat(k,{p:p.peer,n:nm,b:false}); toast(`<b>${esc(nm)}</b> joined the match`,'status'); SFX.hover(); } }
function btFreeSlot(){ for(let k=0;k<BT_N;k++) if(!BT.seats[k]&&!(k in BT.refill)) return k;
  let best=-1, bs=1e9; for(let k=0;k<BT_N;k++){ const s=BT.seats[k]; if(!s||!s.b) continue; const f=btF(k); const sc=(f.score|0)*10+(f.dead?0:3); if(sc<bs){ bs=sc; best=k; } }
  if(best>=0) return best; for(const k in BT.refill) return +k; return -1; }
// guest: follow the host's line-up and scoreboard
function btFollow(others){ const h=others.find(p=>p.peer===NET.hostPeer&&p.presence.B)||others.find(p=>p.presence.r==='host'&&p.presence.B); if(!h) return;
  NET.hostPeer=h.peer; NET.lastRx=BT.lastHost=performance.now(); const B=h.presence.B; if(!B||!Array.isArray(B.st)) return; const me=myPeerId();
  const mine=B.st.findIndex(s=>Array.isArray(s)&&s[0]===me);
  if(!BT.on){ if(mine<0) return; btJoin(mine,B); return; }
  if(mine<0){ btDrop('You were removed from the match.'); return; }
  btApplySeats(B); btApplyState(B); }
function btJoin(k,B){ btArena(); BT.on=true; BT.me=k; BT.first=true; BT.mid=B.m|0; BT.t=+B.t||0; BT.ph=B.ph==='over'?'fight':B.ph||'fight';
  btApplySeats(B,true); player.life=(Array.isArray(B.l)&&B.l[k])|0; BT.joinLife=player.life; btHide(player);
  for(let j=0;j<BT_N;j++){ if(j===k||!BT.seats[j]) continue; const f=btF(j); f.life=(B.l&&B.l[j])|0; if(B.x&&B.x[j]===0) btRevive(f,f.life); }
  state='fight'; resetInputs(); btHudOn(); updateHUD(); SFX.music('fight'); btMsg(''); BT.kfShown=Math.max(0,...(B.kf||[]).map(e=>Array.isArray(e)?e[0]|0:0)); BT.deadT=0.2; BT.first=true;
  toast(`<b>You're in match #${BT.no}.</b> First to ${BT_WIN} knockouts wins`,'status'); }
function btApplySeats(B,first){ for(let k=0;k<BT_N;k++){ const a=B.st[k]; const cur=BT.seats[k];
    if(!Array.isArray(a)){ if(cur&&k!==BT.me) btUnseat(k); continue; }
    const want={p:a[0]||null,n:cleanName(a[1]),b:!!a[2],lv:DIFF[a[3]]?a[3]:'normal'};
    if(k===BT.me){ if(!cur){ BT.seats[k]={p:myPeerId(),n:btMyName,b:false}; btSeat(k,BT.seats[k]); } continue; }
    if(!cur||cur.b!==want.b||(!want.b&&cur.p!==want.p)){ if(cur) btUnseat(k,first); btSeat(k,want); }
    else { if(cur.n!==want.n){ cur.n=want.n; btF(k).name=want.n; ffaBoardKey=''; } if(cur.b&&cur.lv!==want.lv){ cur.lv=want.lv; btF(k).lv=DIFF[want.lv]; } } } }
function btApplyState(B){ if(isNum(B.m)&&B.m!==BT.mid){ btNewMatch(B.m); return; }
  if(isNum(B.t)) BT.t=B.t; if(isNum(B.w)) BT.w=B.w;
  if(B.ph==='over'){ BT.overT=isNum(B.ot)?B.ot:BT.overT; if(BT.ph!=='over'){ BT.ph='over'; btEnterOver(); } } else if(B.ph==='fight'&&BT.ph==='count') BT.ph='fight';
  const now=performance.now();
  for(let k=0;k<BT_N;k++){ if(!BT.seats[k]) continue; const f=btF(k); if(isNum(B.k&&B.k[k])) f.score=B.k[k]; if(isNum(B.d&&B.d[k])) f.deaths=B.d[k];
    const L=B.l?B.l[k]|0:0, X=B.x?B.x[k]|0:0;
    if(f===player){ if(X===1&&L===(player.life|0)&&!player.dead&&state==='fight'){ NET.allowKill=true; try{ killFighter(player,player.lastHitBy); } finally{ NET.allowKill=false; } } }
    else if(X===1){ if(!f.dead&&L>=(f.life|0)&&state==='fight'){ f.life=L; NET.allowKill=true; try{ killFighter(f,f.lastHitBy); } finally{ NET.allowKill=false; } } else f.life=Math.max(f.life|0,L); }
    else if(L>(f.life|0)) btRevive(f,L);
    if(!f.dead&&f!==player&&isNum(B.hp&&B.hp[k])&&now-(f.lastLocalHit||0)>400) f.hp=B.hp[k];
    else if(f===player&&!player.dead&&isNum(B.hp&&B.hp[k])&&L===(player.life|0)&&X===0) player.hp=B.hp[k]; }
  if(Array.isArray(B.kf)){ const seen=new Set(BT.kf.map(e=>e[0])); for(const e of B.kf) if(Array.isArray(e)&&!seen.has(e[0])){ BT.kf.push(e); BT.kfSeq=Math.max(BT.kfSeq,e[0]|0); } if(BT.kf.length>12) BT.kf.splice(0,BT.kf.length-12); btFeed(); } }
function btRx(peer,pr){ const f=fighters.find(x=>x.peer===peer&&x.ctl==='net');
  if(f){ netRxFighter(f,pr); if(isNum(pr.lf)&&pr.lf>(f.life|0)&&!pr.dd) btRevive(f,pr.lf); }
  netApplyHits(peer,pr.ht);
  if(!btHost()&&peer===NET.hostPeer&&Array.isArray(pr.bots)) for(const b of pr.bots){ if(!b||!isNum(b.s)) continue; const s=BT.seats[b.s]; if(!s||!s.b) continue; const bf=btF(b.s); if(bf.ctl==='net') netRxFighter(bf,b); } }
function btNetTick(dt){ btSend(); const now=performance.now();
  if(!btHost()){ if(!BT.on){ BT.waitT+=dt; if(BT.waitT>9){ btStartOffline('<b>That match didn\'t answer</b>, so this is an offline match with bots.'); } return; }
    if(now-BT.lastHost>12000) btDrop('Lost the connection to the match.'); } }

// ---------- menu, pause and invites ----------
function btMsg(t,bad){ const m=document.getElementById('btMsg'); if(!m) return; m.textContent=t||''; m.classList.toggle('bad',!!bad); }
function btMenuUI(){ const on=settings.gm==='battle'; document.body.classList.toggle('gm-battle',on); const n=document.getElementById('btName'); if(n&&document.activeElement!==n) n.value=settings.name||''; if(!on) btMsg(''); }
function btInviteLink(){ const u=new URL(location.href); u.hash=''; u.search=''; const q=new URLSearchParams(location.search); for(const k of ['server']) if(q.get(k)) u.searchParams.set(k,q.get(k)); u.searchParams.set('battle',String(BT.no)); return u.toString(); }
function btPauseUI(){ const el=document.getElementById('btPause'); if(!el) return; const on=matchKind==='battle'&&BT.on; el.style.display=on?'':'none'; if(!on) return;
  const people=BT.seats.filter(x=>x&&!x.b).length; document.getElementById('btPauseLbl').innerHTML=BT.online?`<b>Match #${BT.no}</b> · ${people} ${people===1?'person':'people'} · the fight keeps going while you're in this menu`:'<b>Offline match</b> with bots (the game server couldn\'t be reached)';
  document.getElementById('btInvite').style.display=BT.online?'':'none'; document.getElementById('btInvMsg').textContent=''; }
(()=>{ const $=id=>document.getElementById(id);
  const nameIn=$('btName'); if(nameIn){ nameIn.addEventListener('keydown',e=>e.stopPropagation()); nameIn.addEventListener('input',()=>{ settings.name=nameIn.value.replace(/[<>&"'`]/g,'').slice(0,14); saveSettings(); }); }
  const code=$('btCode'); if(code){ code.addEventListener('input',()=>{ code.value=code.value.replace(/[^0-9]/g,'').slice(0,2); }); code.addEventListener('keydown',e=>{ e.stopPropagation(); if(e.key==='Enter') $('btJoin').click(); }); }
  const lv=$('btLeave'); if(lv) lv.addEventListener('click',()=>toMenu());
  const join=$('btJoin'); if(join) join.addEventListener('click',()=>{ const n=parseInt(code.value,10); if(!(n>=1&&n<=99)){ btMsg('Type the match number your friend sent you.',true); return; } btPlay(n); });
  const inv=$('btInvite'); if(inv) inv.addEventListener('click',()=>{ const L=btInviteLink(), m=$('btInvMsg'); try{ navigator.clipboard.writeText(L).then(()=>{ m.textContent='Invite link copied. Send it to a friend and they land in this match.'; },()=>{ m.textContent='Copy failed. Send this: '+L; }); }catch(e){ m.textContent='Copy failed. Send this: '+L; } });
  // invite links: ?battle=N drops you straight into that match
  let q=null; try{ q=new URLSearchParams(location.search).get('battle'); }catch(e){}
  const n=parseInt(q||'',10); if(n>=1&&n<=99){ setTimeout(()=>{ if(state==='menu'){ btMsg(`Joining match #${n}…`); btPlay(n); } },500); }
  // a match in a hidden tab can't keep up: leave after 20 s in the background (8 s if you're running the bots, so someone else takes over sooner)
  document.addEventListener('visibilitychange',()=>{ clearTimeout(BT.hidTimer); if(document.hidden&&BT.online&&BT.on) BT.hidTimer=setTimeout(()=>{ if(document.hidden&&BT.online&&BT.on){ netLeave(); BT.online=false; BT.hidden=true; } },NET.role==='host'?8000:20000);
    if(!document.hidden&&BT.hidden){ BT.hidden=false; toMenu(); btMsg('You left the match because the game was in the background. Press Play to jump back in.',true); } });
  btMenuUI(); })();

btHook={ cam:btChampCam, get picking(){ return BT.picking; }, lockFree:()=>BT.on&&player.dead, onKill:btOnKill, tick:btTick, over:btOver, hud:btHud, board:btBoard, placeAll:btPlaceAll, play:()=>btPlay(), stop:btStop,
  peers:btPeers, send:btSend, netTick:btNetTick, pauseUI:btPauseUI, menuUI:btMenuUI };
/*DEBUG-START*/window.__DIFF=DIFF; window.__los=(a,b)=>hasLOS(a,b); window.__blocker=(a,b)=>{ const d=V3().subVectors(b,a); const out=[]; for(const bx of boxes){ if(bx.filler) continue; let t0=0,t1=1,ok=true; for(const ax of ["x","y","z"]){ const inv=1/(d[ax]||1e-9); let tn=(bx.min[ax]-a[ax])*inv, tf=(bx.max[ax]-a[ax])*inv; if(tn>tf){const q=tn;tn=tf;tf=q;} t0=Math.max(t0,tn); t1=Math.min(t1,tf); if(t0>t1){ok=false;break;} } if(ok) out.push({t:+t0.toFixed(2),min:bx.min.toArray().map(v=>+v.toFixed(1)),max:bx.max.toArray().map(v=>+v.toFixed(1)),k:Object.keys(bx).filter(k=>!["min","max"].includes(k)).join(",")}); } return out; }; window.__sees=(b,p)=>aiSees(b,b.ai,aiProf(b),p,b.center()); window.__bt={BT,btState,msgSize:()=>JSON.stringify({B:btState(),bots:fighters.filter(f=>f.ctl==="ai").map(f=>({s:f.slot,f:fstate(f),sh:f.nShots||[],bk:f.nBlock||0,c:f.cards,ts:0,lf:f.life|0}))}).length,btPlay,btStartOffline,btF,btEnd,btOpenPick,btSeat,btLeft,state:()=>({on:BT.on,online:BT.online,me:BT.me,no:BT.no,ph:BT.ph,mid:BT.mid,t:Math.round(BT.t),role:NET.role,picking:BT.picking,st:state,seats:BT.seats.map(s=>s?(s.b?'bot:':'')+s.n:null),k:fighters.map(f=>f.slot+':'+(f.score|0)+'/'+(f.deaths|0)+(f.dead?'x':'')+(f.ctl[0])),cards:player.cards.length,life:player.life})};/*DEBUG-END*/
