// ================= TUTORIAL: Coach Kip shows new players the ropes =================
// Runs on top of the training sandbox (Dockside, a dummy bot). Coach Kip talks in chat bubbles you click through,
// then hands you a small task: bounce shots with the dome, shoot, dash, then pick single cards and see how they stack.
const TUT={on:false, i:-1, talk:false, lines:[], li:0, typing:null, card:false, task:null, prog:0, ring:null, warnT:0, shotT:0, hintT:0, lastHp:0,
  wasBlock:false, wasDead:false, wasBlink:false, wasStun:false, wasThr:false, dashAt:-9, flyT:0, botD:10, raf:0, last:0, prev:null, fin:false};
const TUT_KEY='dr_tut', TUT_LESSONS=7;
function tutSeen(){ try{ return !!localStorage.getItem(TUT_KEY); }catch(e){ return true; } }
function tutMark(v){ try{ localStorage.setItem(TUT_KEY,v); }catch(e){} }
const TUT_FACE=`<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="58" r="33" fill="#ffd23d" stroke="#14081f" stroke-width="4"/><path d="M17 50a33 31 0 0 1 66 0Z" fill="#ff2e88" stroke="#14081f" stroke-width="4" stroke-linejoin="round"/><path d="M50 50h40q5 0 3 6H50Z" fill="#ff2e88" stroke="#14081f" stroke-width="4" stroke-linejoin="round"/><circle cx="50" cy="24" r="4.5" fill="#fff1d6" stroke="#14081f" stroke-width="3"/><ellipse cx="38" cy="63" rx="8" ry="9.5" fill="#fff" stroke="#14081f" stroke-width="3"/><ellipse cx="62" cy="63" rx="8" ry="9.5" fill="#fff" stroke="#14081f" stroke-width="3"/><circle class="tp" cx="40" cy="65" r="4.2" fill="#14081f"/><circle class="tp" cx="64" cy="65" r="4.2" fill="#14081f"/><path d="M39 79q11 9 22 0" fill="none" stroke="#14081f" stroke-width="4" stroke-linecap="round"/><path d="M27 86q-4 8 4 11" fill="none" stroke="#35e9ff" stroke-width="3" stroke-linecap="round"/><rect x="27" y="92" width="12" height="7" rx="3" fill="#35e9ff" stroke="#14081f" stroke-width="2.5"/></svg>`;
const TUTK={
  dome:()=>TOUCH.on?'tap the <b>DOME</b> button':'hit <kbd>Q</kbd> or <kbd>right-click</kbd>',
  domeKey:()=>TOUCH.on?'<b>DOME</b>':'<kbd>Q</kbd> / <kbd>RMB</kbd>',
  shoot:()=>TOUCH.on?'hold the <b>fire</b> button':'<kbd>left-click</kbd>',
  shootKey:()=>TOUCH.on?'<b>FIRE</b>':'<kbd>LMB</kbd>',
  aim:()=>TOUCH.on?'Drag on the right side to aim':'Aim with the mouse',
  dash:()=>TOUCH.on?'Tap <b>DASH</b>':'Hit <kbd>Shift</kbd>',
  dashKey:()=>TOUCH.on?'<b>DASH</b>':'<kbd>Shift</kbd>',
  move:()=>TOUCH.on?'left thumb':'<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>',
  take:()=>TOUCH.on?'Tap it':'Click it'
};
const TUT_STEPS=[
  {say:()=>["Hey, I'm <b>Coach Kip</b>! Give me two minutes and you'll be ready to play.",
            "First, the move that wins fights: your <b>dome</b>. It bounces shots straight back at whoever fired them.",
            `That bot's about to shoot at you. When the shot gets close, ${TUTK.dome()} to pop your dome.`]},
  {task:'dome', goal:3, bot:13, text:()=>`Bounce the shots back with ${TUTK.domeKey()}`, yay:'3 FOR 3!'},
  {say:()=>["Great reflexes! Now let's hit back.",
            `${TUTK.aim()} and ${TUTK.shoot()} to shoot your blaster. Knock that bot out!`]},
  {task:'ko', goal:1, bot:11, text:()=>`Knock out the bot with ${TUTK.shootKey()}`, yay:'BOOM!'},
  {say:()=>[`Next up, the <b>dash</b>. ${TUTK.dash()} to zip whichever way you're moving. It's how you dodge.`,
            `Move with ${TUTK.move()} and dash into the 3 glowing rings.`]},
  {task:'rings', goal:3, text:()=>`Dash into the rings with ${TUTK.dashKey()}`, yay:'ZOOM!'},
  {say:()=>["Now the fun part: <b>cards</b>. In a real match you pick <b>1 card out of 3</b> after every round, and it changes how you fight.",
            "This is just practice, so I've chosen for you. Only one card is open each time, and the grey ones are locked."]},
  {card:'buckshot', say:()=>`This is <b>Buckshot</b>. Your blaster fires a spray of 5 bullets instead of 1. ${TUTK.take()} to take it.`},
  {say:()=>["Try it out. Get close and blast the bot!"]},
  {task:'ko', goal:1, bot:9, text:()=>'Knock out the bot with Buckshot', yay:'NICE SPREAD!'},
  {card:'thruster', say:()=>`Here's another. <b>Thruster</b> sticks a little rocket on whatever you hit and shoves them away. ${TUTK.take()} to take it.`},
  {say:()=>["Here's the cool bit: cards <b>stack and combine</b>. Buckshot gives you 5 bullets, Thruster puts a rocket on each one. So now you fire 5 rockets at once!",
            "And if you get the same card twice, it gets even stronger. Go on, send that bot flying."]},
  {task:'fly', goal:1, bot:9, text:()=>'Hit the bot with your rockets', yay:'BYE BYE, BOT!'},
  {card:'teleport', say:()=>`Cards can change your dome too. <b>Teleport</b>: when you pop your dome, you blink forward, right through walls. ${TUTK.take()} to take it.`},
  {say:()=>[`Give it a go. ${TUTK.dome()[0].toUpperCase()+TUTK.dome().slice(1)} to blink.`]},
  {task:'blink', goal:2, bot:12, text:()=>`Blink twice with ${TUTK.domeKey()}`, yay:'SLICK!'},
  {card:'supernova', say:()=>`Last one. <b>Supernova</b> turns your dome into a black hole. It drags enemies in, then blows up and stuns them. ${TUTK.take()} to take it.`},
  {say:()=>["Now stack them: Teleport gets you in close, and the black hole opens right where you land.",
            "Face the bot, blink in and catch it in a black hole!"]},
  {task:'nova', goal:1, bot:12, text:()=>`Catch the bot in a black hole with ${TUTK.domeKey()}`, yay:'SUPERNOVA!'},
  {say:()=>["That's everything: dome, blaster, dash and cards. In real matches you pick from 3 cards, so mix them up and find your own combo.",
            "Now go win some rounds!"]},
  {finish:true}
];
const tutEl=id=>document.getElementById(id);

// ---------- start, stop ----------
function tutStart(){ SFX.unlock(); if(NET.on) netLeave(); if(TUT.on) tutStop();
  TUT.prev={cards:sandbox.cards.slice(), bot:sandbox.bot}; sandbox.cards=[]; sandbox.bot='dummy';
  const keepMap=settings.map; settings.map='dock'; TUT.on=true; TUT.talk=true; startSandbox(); settings.map=keepMap; exitLock();
  document.body.classList.add('tutOn'); UI.hud.classList.add('tutmode'); tipsT=0; UI.roundPill.textContent='TUTORIAL';
  TUT.i=-1; TUT.task=null; TUT.fin=false; tutBotAt(13); show(tutEl('tut'),true,'block'); show(tutEl('tutPop'),false);
  cancelAnimationFrame(TUT.raf); TUT.last=performance.now(); TUT.raf=requestAnimationFrame(tutLoop); tutNext(); }
function tutStop(){ if(!TUT.on&&!TUT.fin) return; TUT.on=false; TUT.fin=false; TUT.talk=false; TUT.card=false; TUT.task=null; TUT.typing=null; cancelAnimationFrame(TUT.raf);
  tutRingOff(); show(tutEl('tut'),false); show(tutEl('tutEnd'),false); tutEl('tutNow').classList.remove('on'); UI.draft.classList.remove('tutDraft'); show(UI.draft,false);
  document.body.classList.remove('tutOn'); UI.hud.classList.remove('tutmode'); tutTouchPulse(null);
  if(TUT.prev){ sandbox.cards=TUT.prev.cards; sandbox.bot=TUT.prev.bot; TUT.prev=null; } setTimeout(tutMenuSync,0); }
tutHook={ on:()=>TUT.on, lockFree:()=>TUT.on&&(TUT.talk||TUT.card||TUT.fin), stop:tutStop, tick:dt=>tutTick(dt) };

// ---------- the script ----------
function tutNext(){ TUT.i++; const st=TUT_STEPS[TUT.i]; if(!st) return tutFinish();
  const n=TUT_STEPS.slice(0,TUT.i+1).filter(s=>s.task).length; UI.roundSub.textContent=`STEP ${Math.min(TUT_LESSONS,Math.max(1,n+(st.task?0:1)))} OF ${TUT_LESSONS}`;
  if(st.say&&!st.card){ TUT.lines=st.say(); TUT.li=0; tutTalk(); }
  else if(st.card) tutCard(st.card,st.say());
  else if(st.task) tutTaskStart(st);
  else if(st.finish) tutFinish(); }
function tutNextIsTask(){ const s=TUT_STEPS[TUT.i+1]; return !!(s&&s.task); }
function tutTalk(){ TUT.talk=true; TUT.task=null; exitLock(); tutEl('tutNow').classList.remove('on'); tutTouchPulse(null);
  const box=tutEl('tutBox'); box.className='talk'; show(tutEl('tutCatch'),true,'block'); show(tutEl('tutTask'),false); show(tutEl('tutSkip'),true,'block'); tutLine(); }
function tutLine(){ const last=TUT.li>=TUT.lines.length-1; tutType(TUT.lines[TUT.li]); SFX.hover();
  const more=tutEl('tutMore'); more.classList.toggle('go',last&&tutNextIsTask());
  more.innerHTML= last&&tutNextIsTask()? (TOUCH.on?"LET'S GO! <i>Tap</i>":"LET'S GO! <i>Click or Space</i>") : (TOUCH.on?'Tap to continue':'Click or Space to continue');
  const f=tutEl('tutBox').querySelector('.tutFace'); f.classList.remove('bob'); void f.offsetWidth; f.classList.add('bob'); }
function tutAdvance(){ if(!TUT.on||!TUT.talk) return; if(TUT.typing){ tutTypeEnd(); return; }
  if(TUT.li<TUT.lines.length-1){ TUT.li++; tutLine(); return; }
  TUT.talk=false; show(tutEl('tutCatch'),false); tutEl('tutBox').className=''; show(tutEl('tutSkip'),false);
  const goTask=tutNextIsTask(); tutNext(); if(goTask){ SFX.go(); requestLock(); } }

// typewriter that keeps the bold words and key caps
function tutType(html){ const el=tutEl('tutText'); el.innerHTML=html; const nodes=[]; const w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT); while(w.nextNode()) nodes.push([w.currentNode,w.currentNode.data]);
  for(const n of nodes) n[0].data=''; TUT.typing={nodes,i:0,n:0,acc:0}; }
function tutTypeTick(dt){ const T2=TUT.typing; if(!T2) return; T2.acc+=dt*70;
  while(T2.acc>=1&&T2.i<T2.nodes.length){ const [node,full]=T2.nodes[T2.i]; T2.n++; node.data=full.slice(0,T2.n); T2.acc--; if(T2.n>=full.length){ T2.i++; T2.n=0; } }
  if(T2.i>=T2.nodes.length) TUT.typing=null; }
function tutTypeEnd(){ const T2=TUT.typing; if(!T2) return; for(const [node,full] of T2.nodes) node.data=full; TUT.typing=null; }

// ---------- a card screen with just one card ----------
function tutCard(id,html){ TUT.card=true; TUT.task=null; exitLock(); state='draft'; draftT=1e9; clearProjectiles(); show(UI.hud,false); tutRingOff(); tutEl('tutNow').classList.remove('on');
  UI.draftTitle.textContent='PICK A CARD'; UI.draftSub.textContent='Practice: only the bright card is open'; UI.draft.classList.add('tutDraft'); UI.cards.innerHTML='';
  // a real pick shows 3 cards; in practice the other two are greyed out and locked
  const lesson=['buckshot','thruster','teleport','supernova'], pool=ALL_CARDS.filter(k=>!lesson.includes(k)), grey=[];
  while(grey.length<2&&pool.length) grey.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);
  const off=(gid,i)=>{ const g=CARDS[gid], w=document.createElement('div'), d=document.createElement('div'); w.className='tutOffWrap'; w.setAttribute('aria-disabled','true'); w.style.setProperty('--i',i);
    d.className=`card t-${g.type} tutOff`; d.style.setProperty('--c',g.c); d.style.setProperty('--i',i); d.innerHTML=cardHTML(gid,i,0,false);
    w.appendChild(d); w.insertAdjacentHTML('beforeend','<div class="tutLock"><span>LOCKED</span></div>'); return w; };
  const c=CARDS[id], el=document.createElement('div'); el.className=`card t-${c.type} rec`; el.style.setProperty('--c',c.c); el.style.setProperty('--i',1);
  el.innerHTML=cardHTML(id,1,player.cards.filter(x=>x===id).length,false);
  el.addEventListener('mousemove',ev=>{ const r=el.getBoundingClientRect(); const px=(ev.clientX-r.left)/r.width, py=(ev.clientY-r.top)/r.height; el.style.setProperty('--ry',((px-0.5)*14).toFixed(1)+'deg'); el.style.setProperty('--rx',((0.5-py)*12).toFixed(1)+'deg'); el.style.setProperty('--gx',(px*100).toFixed(0)+'%'); el.style.setProperty('--gy',(py*100).toFixed(0)+'%'); });
  el.addEventListener('mouseenter',()=>SFX.hover());
  el.addEventListener('click',()=>{ if(!TUT.on||!TUT.card||el.classList.contains('picked')) return; el.classList.add('picked'); player.addCard(id); SFX.pick(); toast(`<b class="you">You</b> took <b>${c.name}</b>`,'you');
    setTimeout(()=>{ if(!TUT.on) return; show(UI.draft,false); UI.draft.classList.remove('tutDraft'); TUT.card=false; state='fight';
      show(UI.hud,true,'block'); player.hp=player.maxHp(); player.ammo=player.stats.ammo; player.reloading=false; player.blockCdT=0; updateCardStrips(); tutNext(); },750); });
  UI.cards.appendChild(off(grey[0],0)); UI.cards.appendChild(el); UI.cards.appendChild(off(grey[1],2)); setTimeout(()=>SFX.deal(),140); show(UI.draft,true);
  const box=tutEl('tutBox'); box.className='info'; show(tutEl('tutCatch'),false); show(tutEl('tutTask'),false); show(tutEl('tutSkip'),true,'block'); tutType(html);
  tutEl('tutMore').classList.remove('go'); tutEl('tutMore').innerHTML=TOUCH.on?'Tap the bright card':'Click the bright card or press <kbd>2</kbd>'; }

// ---------- tasks ----------
function tutBotAt(d){ TUT.botD=d; if(bot.dead) return; const p=tutBotSpot(d); bot.pos.copy(p); bot.vel.set(0,0,0); bot.spawn&&bot.spawn.copy(p); }
function tutBotSpot(d){ const x=BASE_POS.player.x+d, g=groundAt(x,0,4,0.3); return V3(x,g===null?BASE_POS.player.y:g,0); }
function tutTaskStart(st){ TUT.task=st; TUT.prog=0; TUT.hintT=0; TUT.flyT=0; TUT.shotT=1.4; TUT.warnT=0; TUT.lastHp=player.hp;
  TUT.wasBlock=player.blockActive; TUT.wasDead=bot.dead; TUT.wasBlink=false; TUT.wasStun=bot.stunT>0; TUT.wasThr=false;
  if(st.bot) tutBotAt(st.bot); bot.hp=bot.maxHp(); bot.thrusters&&(bot.thrusters.length=0); player.hp=player.maxHp(); player.ammo=player.stats.ammo; player.reloading=false; player.blockCdT=0; player.dashCdT=0;
  show(tutEl('tutTask'),true,'flex'); tutEl('tutBox').className=''; tutTaskText(); if(st.task==='rings') tutRingNext();
  if(st.task==='dome') tutTouchPulse('tBlock'); else if(st.task==='rings') tutTouchPulse('tDash'); else if(st.task==='blink'||st.task==='nova') tutTouchPulse('tBlock'); else tutTouchPulse(null); }
function tutTaskText(hint){ const st=TUT.task; if(!st) return; tutEl('tutTaskText').innerHTML=hint?`<em>${hint}</em>`:st.text(); tutEl('tutProg').textContent=`${TUT.prog}/${st.goal}`; }
function tutHint(h){ TUT.hintT=2.4; tutTaskText(h); }
function tutGain(){ const st=TUT.task; if(!st) return; TUT.prog++; SFX.coin(); const p=tutEl('tutProg'); p.classList.remove('pop'); void p.offsetWidth; p.classList.add('pop'); tutTaskText();
  if(TUT.prog>=st.goal){ TUT.task=null; tutRingOff(); tutEl('tutNow').classList.remove('on'); tutTouchPulse(null); SFX.levelup(); showBanner(st.yay,'#ffd23d');
    burst(player.center().add(V3(0,1,0)),0xffd23d,26,7,0.12,0.8,0.5); setTimeout(()=>{ if(TUT.on&&!TUT.talk&&!TUT.card) tutNext(); },1500); } }
function tutTouchPulse(id){ for(const x of ['tBlock','tDash','tFire']){ const e=tutEl(x); if(e) e.classList.toggle('tutPulse',x===id); } }
function tutTick(dt){ if(!TUT.on) return;
  if(player.hp<player.maxHp()&&!player.dead) player.hp=Math.min(player.maxHp(),player.hp+dt*25); // you can't really lose in here
  if(TUT.wasDead&&!bot.dead){ tutBotAt(TUT.botD); } // the dummy came back: put it where this lesson wants it
  const st=TUT.task; if(TUT.hintT>0){ TUT.hintT-=dt; if(TUT.hintT<=0) tutTaskText(); }
  if(!st||TUT.talk||TUT.card){ TUT.wasDead=bot.dead; return; }
  const k=st.task;
  if(k==='dome'){ player.blockCdT=Math.min(player.blockCdT,0.8);
    let near=1e9, live=false; for(const b of bullets){ if(b.owner===bot&&b.tut){ live=true; near=Math.min(near,b.pos.distanceTo(player.center())); }
      if(b.tut&&b.owner===player&&!b.tutC){ b.tutC=true; b.dmg=34; tutGain(); if(!TUT.task) break; } }
    tutEl('tutNow').classList.toggle('on',near<10&&!player.blockActive);
    if(player.blockActive&&!TUT.wasBlock&&live&&near>12.5) tutHint('Too early! Wait till the shot is close');
    if(player.hp<TUT.lastHp-1) tutHint('Ouch! Pop it a little sooner');
    if(TUT.task&&!live&&!bot.dead){ TUT.shotT-=dt; if(TUT.shotT<0.75&&TUT.warnT<=0){ TUT.warnT=1; bot.setMood('angry',1); floatText(bot.center().add(V3(0,1.3,0)),'HERE IT COMES','status'); }
      if(TUT.shotT<=0){ TUT.shotT=1.9; TUT.warnT=0; const o=bot.muzzlePos?bot.muzzlePos():bot.center(); bot.botAim=V3().subVectors(player.center(),o).normalize(); bot.ammo=Math.max(1,bot.ammo); bot.reloading=false; bot.fireCd=0;
        const n0=bullets.length; if(tryFire(bot,true)) for(let i=n0;i<bullets.length;i++){ const b=bullets[i]; if(b.owner!==bot) continue; b.tut=true; b.vel.multiplyScalar(15/Math.max(1,b.vel.length())); b.dmg=8; b.life=2.6; } } } }
  else if(k==='ko'){ if(bot.dead&&!TUT.wasDead) tutGain(); }
  else if(k==='rings'){ player.dashCdT=Math.min(player.dashCdT,0.5); if(player.dashT>0) TUT.dashAt=gameT; const R=TUT.ring;
    if(R){ R.g.rotation.y+=dt*1.6; R.t+=dt; const s=1+Math.sin(R.t*5)*0.06; R.g.scale.set(s,1,s); const dx=player.pos.x-R.p.x, dz=player.pos.z-R.p.z, inside=Math.hypot(dx,dz)<1.9&&Math.abs(player.pos.y-R.p.y)<2.2;
      if(inside&&gameT-TUT.dashAt<0.35){ burst(R.p.clone().add(V3(0,1,0)),0xffd23d,22,6,0.12,0.6,0.4); shockRing(R.p.clone().add(V3(0,0.1,0)),0xffd23d,3,0.4); tutRingOff(); tutGain(); if(TUT.task) tutRingNext(); }
      else if(inside&&!R.told){ R.told=true; tutHint(`Dash into it! ${TUTK.dashKey()}`); } else if(!inside) R.told=false; } }
  else if(k==='fly'){ const thr=!!(bot.thrusters&&bot.thrusters.length); if(thr&&!TUT.wasThr&&TUT.flyT<=0) TUT.flyT=0.01; TUT.wasThr=thr; if(TUT.flyT>0){ TUT.flyT+=dt; if(TUT.flyT>1.2||bot.dead){ TUT.flyT=0; tutGain(); } } }
  else if(k==='blink'){ player.blockCdT=Math.min(player.blockCdT,0.7); const bl=(player.blinkPending||0)>0; if(bl&&!TUT.wasBlink) tutGain(); TUT.wasBlink=bl; }
  else if(k==='nova'){ player.blockCdT=Math.min(player.blockCdT,0.9); const sn=bot.stunT>0; if(sn&&!TUT.wasStun) tutGain(); TUT.wasStun=sn;
    if(player.blockActive&&!TUT.wasBlock&&!bot.dead&&player.pos.distanceTo(bot.pos)>17) tutHint('Too far! Face the bot and get closer first'); }
  TUT.wasBlock=player.blockActive; TUT.lastHp=player.hp; TUT.wasDead=bot.dead; }

// glowing rings for the dash lesson
function tutRingNext(){ tutRingOff(); const base=player.yaw;
  for(const a of [0.7,-0.7,1.3,-1.3,0.2,-0.2,2.2,-2.2,Math.PI]){ for(const d of [7,6,8,5]){ const dir=V3(-Math.sin(base+a),0,-Math.cos(base+a)), x=player.pos.x+dir.x*d, z=player.pos.z+dir.z*d;
    const g=groundAt(x,z,player.pos.y+3,0.5); if(g===null||Math.abs(g-player.pos.y)>1.2) continue; const p=V3(x,g,z); if(!hasLOS(player.center(),V3(x,g+0.9,z))) continue;
    const grp=new T.Group(); grp.position.copy(p);
    const ring=new T.Mesh(new T.TorusGeometry(1.35,0.13,10,40),new T.MeshBasicMaterial({color:col(0xffd23d)})); ring.rotation.x=Math.PI/2; ring.position.y=0.08; grp.add(ring);
    const beam=new T.Mesh(new T.CylinderGeometry(1.25,1.25,3.2,28,1,true),new T.MeshBasicMaterial({color:col(0xffd23d),transparent:true,opacity:0.22,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending})); beam.position.y=1.6; grp.add(beam);
    scene.add(grp); TUT.ring={g:grp,p,t:0,told:false}; shockRing(p.clone().add(V3(0,0.1,0)),0xffd23d,2.2,0.35); return; } } }
function tutRingOff(){ const R=TUT.ring; if(!R) return; scene.remove(R.g); R.g.traverse(o=>{ if(o.geometry) o.geometry.dispose(); if(o.material) o.material.dispose(); }); TUT.ring=null; }

// ---------- the end ----------
function tutFinish(){ TUT.task=null; TUT.talk=false; TUT.fin=true; tutMark('done'); exitLock(); tutRingOff(); show(tutEl('tut'),false); state='picked'; show(UI.hud,false);
  const e=tutEl('tutEnd'); e.querySelectorAll('.cf').forEach(c=>c.remove()); const cols=['#ffd23d','#ff2e88','#35e9ff','#5dff9b','#fff1d6'];
  for(let i=0;i<44;i++){ const c=document.createElement('i'); c.className='cf'; c.style.left=(Math.random()*100)+'vw'; c.style.background=cols[i%cols.length]; c.style.animationDuration=(2.4+Math.random()*2.6)+'s'; c.style.animationDelay=(Math.random()*1.4)+'s'; e.appendChild(c); }
  show(e,true); SFX.champion&&SFX.champion();
  let k=0; const fw=()=>{ if(!TUT.fin||k++>5) return; SFX.firework&&SFX.firework(); setTimeout(fw,420); }; setTimeout(fw,500); }
function tutLoop(now){ if(!TUT.on) return; TUT.raf=requestAnimationFrame(tutLoop); const dt=Math.min(0.05,(now-TUT.last)/1000); TUT.last=now; tutTypeTick(dt); }

// ---------- menu bits ----------
function tutMenuSync(){ const seen=tutSeen(); const pop=tutEl('tutPop'); if(pop) show(pop,!seen&&state==='menu','flex'); const b=tutEl('tutBtn'); if(b) b.classList.toggle('hot',!seen); }
document.querySelectorAll('.tutFace').forEach(e=>e.innerHTML=TUT_FACE);
tutEl('tutBtn').addEventListener('click',tutStart);
tutEl('tutPopGo').addEventListener('click',tutStart);
tutEl('tutPopX').addEventListener('click',e=>{ e.stopPropagation(); tutMark('skip'); SFX.hover(); tutMenuSync(); });
tutEl('tutCatch').addEventListener('pointerdown',e=>{ e.preventDefault(); tutAdvance(); });
tutEl('tutSkip').addEventListener('click',e=>{ e.stopPropagation(); tutMark('skip'); toMenu(); });
tutEl('tutEndPlay').addEventListener('click',()=>{ toMenu(); setTimeout(()=>tutEl('publicBtn').click(),60); });
tutEl('tutEndMenu').addEventListener('click',()=>toMenu());
window.addEventListener('keydown',e=>{ if(!TUT.on||!TUT.talk||paused) return; if(e.code==='Space'||e.code==='Enter'){ e.preventDefault(); e.stopPropagation(); if(!e.repeat) tutAdvance(); } },true);
setInterval(tutMenuSync,1000); tutMenuSync();
/*DEBUG-START*/window.__tut={TUT,TUT_STEPS,tutStart,tutStop,tutAdvance,tutNext,tutGain,ring:()=>TUT.ring,botSpot:d=>tutBotSpot(d)};/*DEBUG-END*/
