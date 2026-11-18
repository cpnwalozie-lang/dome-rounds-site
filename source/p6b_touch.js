// ================= TOUCH CONTROLS (phones + tablets) =================
// Landscape layout built for thumbs:
//  left thumb  - a floating stick that appears wherever you put your thumb on the left side
//  right thumb - a big FIRE button resting at the bottom-right, with JUMP, DOME and DASH fanned round it in
//                the arc your thumb naturally sweeps. Drag anywhere on the right (or keep dragging on FIRE) to aim.
(()=>{
  const ui=document.getElementById('touchUI'), stick=document.getElementById('tStick'), knob=stick.querySelector('i');
  const B={}; for(const el of ui.querySelectorAll('[data-t]')) B[el.dataset.t]=el;
  const rot=document.getElementById('rotate'), bar=document.getElementById('tEdit'), sizeIn=document.getElementById('tSize');
  // ---- your own layout: positions saved as fractions of the screen, plus one size for all buttons ----
  const LKEY='dr_touch_layout'; let lay={s:1,p:{}}; try{ const j=JSON.parse(localStorage.getItem(LKEY)||'null'); if(j&&typeof j==='object') lay={s:clamp(+j.s||1,0.8,1.5),p:j.p&&typeof j.p==='object'?j.p:{}}; }catch(e){}
  const saveLay=()=>{ try{ localStorage.setItem(LKEY,JSON.stringify(lay)); }catch(e){} };
  function applyLay(){ ui.style.setProperty('--ts',lay.s); const custom=Object.keys(lay.p).length>0; ui.classList.toggle('custom',custom); const W=window.innerWidth, H=window.innerHeight;
    for(const k in B){ const el=B[k], q=lay.p[k]; if(custom&&q&&k!=='pause'&&k!=='powers'&&k!=='clip'){ el.style.left=(q[0]*W)+'px'; el.style.top=(q[1]*H)+'px'; } else if(custom&&q){ el.style.left=(q[0]*W)+'px'; el.style.top=(q[1]*H)+'px'; el.style.transform='translate(-50%,-50%)'; } else { el.style.left=''; el.style.top=''; el.style.transform=''; } }
    const q=lay.p.stick; if(custom&&q){ ui.style.setProperty('--skx',(q[0]*W)+'px'); ui.style.setProperty('--sky',(q[1]*H)+'px'); } else { ui.style.removeProperty('--skx'); ui.style.removeProperty('--sky'); } }
  applyLay(); window.addEventListener('resize',applyLay);
  let editing=false, grab=null;
  function centreOf(el){ const r=el.getBoundingClientRect(); return [(r.left+r.width/2)/window.innerWidth,(r.top+r.height/2)/window.innerHeight]; }
  function openEdit(){ if(!TOUCH.on) return; editing=true; if(state==='fight'||state==='countdown'){ if(!paused) pause(); } show(document.getElementById('pause'),false); const sm=document.getElementById('start'); if(sm.style.display!=='none'){ sm._ed=sm.style.display; sm.style.display='none'; } ui.style.display='block'; st.shown=true; ui.classList.add('editing');
    if(!Object.keys(lay.p).length){ const p={}; for(const k in B) p[k]=centreOf(B[k]); p.stick=centreOf(stick); lay.p=p; applyLay(); }
    sizeIn.value=lay.s; bar.style.display='block'; }
  function closeEdit(){ editing=false; grab=null; ui.classList.remove('editing'); bar.style.display='none'; saveLay(); const sm=document.getElementById('start'); if(sm._ed!==undefined){ sm.style.display=sm._ed; sm._ed=undefined; } if(state==='menu'){ ui.style.display='none'; st.shown=false; } if(paused&&(state==='fight'||state==='countdown')) show(document.getElementById('pause'),true,'block'); }
  for(const b of document.querySelectorAll('.tEditBtn')) b.addEventListener('click',e=>{ e.preventDefault(); openEdit(); });
  document.getElementById('tDone').addEventListener('click',closeEdit);
  document.getElementById('tReset').addEventListener('click',()=>{ lay={s:1,p:{}}; applyLay(); sizeIn.value=1; requestAnimationFrame(()=>{ const p={}; for(const k in B) p[k]=centreOf(B[k]); p.stick=centreOf(stick); lay.p=p; applyLay(); }); });
  sizeIn.addEventListener('input',()=>{ lay.s=clamp(+sizeIn.value||1,0.8,1.5); applyLay(); });
  const editStart=e=>{ if(!editing) return false; e.preventDefault(); const t=e.changedTouches[0]; const el=t.target&&t.target.closest?(t.target.closest('[data-t]')||t.target.closest('#tStick')):null; if(el){ grab={el,id:t.identifier,k:el.dataset.t||'stick'}; el.classList.add('grab'); } return true; };
  const editMove=e=>{ if(!editing) return false; e.preventDefault(); if(!grab) return true; for(const t of e.changedTouches){ if(t.identifier!==grab.id) continue; const r=grab.el.getBoundingClientRect(), W=window.innerWidth, H=window.innerHeight; const hw=r.width/2, hh=r.height/2;
      const x=clamp(t.clientX,hw+4,W-hw-4), y=clamp(t.clientY,hh+4,H-hh-4); lay.p[grab.k]=[x/W,y/H]; applyLay(); } return true; };
  function unOverlap(k,el){ const W=window.innerWidth, H=window.innerHeight; for(let it=0;it<6;it++){ let moved=false; const r=el.getBoundingClientRect(); let cx=r.left+r.width/2, cy=r.top+r.height/2; const ra=r.width/2;
      for(const o of [...Object.values(B),stick]){ if(o===el||getComputedStyle(o).display==='none') continue; const q=o.getBoundingClientRect(); if(!q.width) continue; const ox=q.left+q.width/2, oy=q.top+q.height/2, need=ra+q.width/2+6; let dx=cx-ox, dy=cy-oy, d=Math.hypot(dx,dy);
        if(d<need){ if(d<1){ dx=-1; dy=0; d=1; } cx=clamp(ox+dx/d*need,ra+4,W-ra-4); cy=clamp(oy+dy/d*need,ra+4,H-ra-4); moved=true; } }
      lay.p[k]=[cx/W,cy/H]; applyLay(); if(!moved) break; } }
  const editEnd=e=>{ if(!editing) return false; if(grab){ for(const t of e.changedTouches) if(t.identifier===grab.id){ grab.el.classList.remove('grab'); unOverlap(grab.k,grab.el); grab=null; saveLay(); } } return true; }; // buttons never end up on top of each other
  const st={ stick:null, look:null, fire:null, active:false, shown:false };
  const enable=()=>{ if(TOUCH.on) return; TOUCH.on=true; document.body.classList.add('touch'); onTouchMode(); };
  function onTouchMode(){ document.body.classList.add('touch'); const s=document.getElementById('steer'); if(s) s.textContent='STEERING YOUR SHOT · drag to steer · tap FIRE to let go'; }
  if(TOUCH.on) onTouchMode();
  window.addEventListener('touchstart',enable,{capture:true,passive:true});
  window.addEventListener('pointerdown',e=>{ if(e.pointerType==='mouse'&&TOUCH.on&&!matchMedia('(pointer: coarse)').matches&&!editing){ TOUCH.on=false; TOUCH.mx=TOUCH.my=0; TOUCH.fire=false; document.body.classList.remove('touch'); releaseAll(); } },{capture:true,passive:true});
  const unit=()=>parseFloat(getComputedStyle(ui).getPropertyValue('--u'))||64;
  const R=()=>unit()*0.95;
  function placeStick(x,y){ stick.style.left=x+'px'; stick.style.top=y+'px'; }
  function setKnob(dx,dy){ knob.style.transform=`translate(calc(-50% + ${dx.toFixed(1)}px),calc(-50% + ${dy.toFixed(1)}px))`; }
  function resetStick(){ st.stick=null; TOUCH.mx=0; TOUCH.my=0; stick.classList.remove('live'); stick.style.left=''; stick.style.top=''; setKnob(0,0); }
  const lookK=()=>0.0062*settings.sens, lookKy=()=>0.0048*settings.sens;
  function press(k,t){ const el=B[k]; if(!el) return; el.classList.add('down'); el._id=t.identifier; try{ if(navigator.vibrate) navigator.vibrate(k==='fire'?6:10); }catch(e){}
    if(k==='fire'){ st.fire={id:t.identifier,x:t.clientX,y:t.clientY}; TOUCH.fire=true; firePressed=true; steerLatch=false; }
    else if(k==='jump') jumpBuffer=0.15;
    else if(k==='block'){ if(remoteCtl.b){ remoteCtl.b.remote=false; remoteCtl.b=null; steerLatch=true; } pressBlock(); }
    else if(k==='dash') wantDash=true;
    else if(k==='pause'){ if(state==='fight'||state==='countdown') pause(); }
    else if(k==='powers'){ if(mode==='sandbox'&&state==='fight') openSandbox(); }
    else if(k==='clip'){ if(clipSave) clipSave(); } }
  function release(id){ for(const k in B){ if(B[k]._id===id){ B[k].classList.remove('down'); B[k]._id=null; } } if(st.fire&&st.fire.id===id){ st.fire=null; TOUCH.fire=false; } if(st.stick&&st.stick.id===id) resetStick(); if(st.look&&st.look.id===id) st.look=null; }
  ui.addEventListener('touchstart',e=>{ if(editStart(e)) return; if(!st.active) return; e.preventDefault(); SFX.unlock();
    for(const t of e.changedTouches){ const el=t.target&&t.target.closest?t.target.closest('[data-t]'):null;
      if(el){ press(el.dataset.t,t); continue; }
      const W=window.innerWidth;
      if(t.clientX<W*0.46&&!st.stick&&!player.dead){ st.stick={id:t.identifier,cx:t.clientX,cy:t.clientY}; stick.classList.add('live'); placeStick(t.clientX,t.clientY); setKnob(0,0); }
      else if(!st.look) st.look={id:t.identifier,x:t.clientX,y:t.clientY}; } },{passive:false});
  ui.addEventListener('touchmove',e=>{ if(editMove(e)) return; if(!st.active) return; e.preventDefault();
    for(const t of e.changedTouches){
      if(st.stick&&t.identifier===st.stick.id){ const r=R(); let dx=t.clientX-st.stick.cx, dy=t.clientY-st.stick.cy; let L=Math.hypot(dx,dy);
        if(L>r*1.35){ const k=(L-r*1.35)/L; st.stick.cx+=dx*k; st.stick.cy+=dy*k; placeStick(st.stick.cx,st.stick.cy); dx=t.clientX-st.stick.cx; dy=t.clientY-st.stick.cy; L=Math.hypot(dx,dy); } // the stick follows a thumb that wanders off
        const c=Math.min(L,r); const nx=L>0?dx/L:0, ny=L>0?dy/L:0; setKnob(nx*c,ny*c); const m=c/r; const dz=0.14; const mm=m<dz?0:Math.min(1,(m-dz)/(1-dz)*1.08); TOUCH.mx=nx*mm; TOUCH.my=ny*mm; continue; }
      const L=(st.look&&t.identifier===st.look.id)?st.look:(st.fire&&t.identifier===st.fire.id)?st.fire:null;
      if(L){ const dx=t.clientX-L.x, dy=t.clientY-L.y; L.x=t.clientX; L.y=t.clientY; if(!paused&&(state==='fight'||state==='countdown')) look(dx*lookK(),dy*lookKy()); } } },{passive:false});
  const end=e=>{ if(editEnd(e)) return; for(const t of e.changedTouches) release(t.identifier); };
  ui.addEventListener('touchend',end,{passive:false}); ui.addEventListener('touchcancel',end,{passive:false});
  function releaseAll(){ for(const k in B){ B[k].classList.remove('down'); B[k]._id=null; } st.fire=null; TOUCH.fire=false; st.look=null; resetStick(); }
  // fullscreen + landscape lock when you start playing (Android; iPhone ignores it)
  function goFull(){ if(!TOUCH.on) return; try{ const d=document.documentElement; if(!document.fullscreenElement&&d.requestFullscreen){ const p=d.requestFullscreen({navigationUI:'hide'}); if(p&&p.then) p.then(()=>{ try{ screen.orientation.lock('landscape').catch(()=>{}); }catch(e){} }).catch(()=>{}); } }catch(e){} }
  for(const id of ['startBtn','sandboxBtn','sbxGo','olCreate','olJoin','olStart','againBtn']){ const el=document.getElementById(id); if(el) el.addEventListener('click',goFull,true); }
  const cd=(el,frac,txt)=>{ el.style.setProperty('--cd',(frac*100).toFixed(1)+'%'); const b=el.querySelector('b'); if(b&&b._t!==txt){ b._t=txt; b.textContent=txt; } el.classList.toggle('cooling',frac>0); };
  function frame(){ requestAnimationFrame(frame);
    const portrait=TOUCH.on&&window.innerHeight>window.innerWidth*1.05; if(rot._p!==portrait){ rot._p=portrait; rot.style.display=portrait?'flex':'none'; }
    if(editing){ if(st.active){ st.active=false; releaseAll(); } if(!st.shown){ st.shown=true; ui.style.display='block'; } return; }
    const act=TOUCH.on&&(state==='fight'||state==='countdown')&&!paused&&!sandbox.open&&!portrait;
    if(act!==st.active){ st.active=act; if(!act) releaseAll(); }
    if(act!==st.shown){ st.shown=act; ui.style.display=act?'block':'none'; }
    if(!act) return;
    ui.classList.toggle('dead',!!player.dead); ui.classList.toggle('sbx',mode==='sandbox');
    const s=player.stats;
    cd(B.block,player.blockCdT>0?clamp(player.blockCdT/s.blockCd,0,1):0,player.blockCdT>0.05?player.blockCdT.toFixed(player.blockCdT<1?1:0):'');
    B.block.classList.toggle('silenced',player.silenceT>0);
    cd(B.dash,player.dashCdT>0?clamp(player.dashCdT/CFG.dashCd,0,1):0,'');
    B.dash.classList.toggle('air',!player.onGround);
    cd(B.fire,player.reloading?clamp(player.reloadT/s.reload,0,1):0,player.reloading?'':String(player.ammo));
    B.jump.classList.toggle('air',!player.onGround); }
  requestAnimationFrame(frame);
})();
