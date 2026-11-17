// ================= TOUCH CONTROLS (phones + tablets) =================
// Landscape layout built for thumbs:
//  left thumb  - a floating stick that appears wherever you put your thumb on the left side
//  right thumb - a big FIRE button resting at the bottom-right, with JUMP, DOME and DASH fanned round it in
//                the arc your thumb naturally sweeps. Drag anywhere on the right (or keep dragging on FIRE) to aim.
(()=>{
  const ui=document.getElementById('touchUI'), stick=document.getElementById('tStick'), knob=stick.querySelector('i');
  const B={}; for(const el of ui.querySelectorAll('[data-t]')) B[el.dataset.t]=el;
  const rot=document.getElementById('rotate');
  const st={ stick:null, look:null, fire:null, active:false, shown:false };
  const enable=()=>{ if(TOUCH.on) return; TOUCH.on=true; document.body.classList.add('touch'); onTouchMode(); };
  function onTouchMode(){ document.body.classList.add('touch'); const s=document.getElementById('steer'); if(s) s.textContent='STEERING YOUR SHOT · drag to steer · tap FIRE to let go'; }
  if(TOUCH.on) onTouchMode();
  window.addEventListener('touchstart',enable,{capture:true,passive:true});
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
    else if(k==='powers'){ if(mode==='sandbox'&&state==='fight') openSandbox(); } }
  function release(id){ for(const k in B){ if(B[k]._id===id){ B[k].classList.remove('down'); B[k]._id=null; } } if(st.fire&&st.fire.id===id){ st.fire=null; TOUCH.fire=false; } if(st.stick&&st.stick.id===id) resetStick(); if(st.look&&st.look.id===id) st.look=null; }
  ui.addEventListener('touchstart',e=>{ if(!st.active) return; e.preventDefault(); SFX.unlock();
    for(const t of e.changedTouches){ const el=t.target&&t.target.closest?t.target.closest('[data-t]'):null;
      if(el){ press(el.dataset.t,t); continue; }
      const W=window.innerWidth;
      if(t.clientX<W*0.46&&!st.stick&&!player.dead){ st.stick={id:t.identifier,cx:t.clientX,cy:t.clientY}; stick.classList.add('live'); placeStick(t.clientX,t.clientY); setKnob(0,0); }
      else if(!st.look) st.look={id:t.identifier,x:t.clientX,y:t.clientY}; } },{passive:false});
  ui.addEventListener('touchmove',e=>{ if(!st.active) return; e.preventDefault();
    for(const t of e.changedTouches){
      if(st.stick&&t.identifier===st.stick.id){ const r=R(); let dx=t.clientX-st.stick.cx, dy=t.clientY-st.stick.cy; let L=Math.hypot(dx,dy);
        if(L>r*1.35){ const k=(L-r*1.35)/L; st.stick.cx+=dx*k; st.stick.cy+=dy*k; placeStick(st.stick.cx,st.stick.cy); dx=t.clientX-st.stick.cx; dy=t.clientY-st.stick.cy; L=Math.hypot(dx,dy); } // the stick follows a thumb that wanders off
        const c=Math.min(L,r); const nx=L>0?dx/L:0, ny=L>0?dy/L:0; setKnob(nx*c,ny*c); const m=c/r; const dz=0.14; const mm=m<dz?0:Math.min(1,(m-dz)/(1-dz)*1.08); TOUCH.mx=nx*mm; TOUCH.my=ny*mm; continue; }
      const L=(st.look&&t.identifier===st.look.id)?st.look:(st.fire&&t.identifier===st.fire.id)?st.fire:null;
      if(L){ const dx=t.clientX-L.x, dy=t.clientY-L.y; L.x=t.clientX; L.y=t.clientY; if(!paused&&(state==='fight'||state==='countdown')) look(dx*lookK(),dy*lookKy()); } } },{passive:false});
  const end=e=>{ for(const t of e.changedTouches) release(t.identifier); };
  ui.addEventListener('touchend',end,{passive:false}); ui.addEventListener('touchcancel',end,{passive:false});
  function releaseAll(){ for(const k in B){ B[k].classList.remove('down'); B[k]._id=null; } st.fire=null; TOUCH.fire=false; st.look=null; resetStick(); }
  // fullscreen + landscape lock when you start playing (Android; iPhone ignores it)
  function goFull(){ if(!TOUCH.on) return; try{ const d=document.documentElement; if(!document.fullscreenElement&&d.requestFullscreen){ const p=d.requestFullscreen({navigationUI:'hide'}); if(p&&p.then) p.then(()=>{ try{ screen.orientation.lock('landscape').catch(()=>{}); }catch(e){} }).catch(()=>{}); } }catch(e){} }
  for(const id of ['startBtn','sandboxBtn','sbxGo','olCreate','olJoin','olStart','againBtn']){ const el=document.getElementById(id); if(el) el.addEventListener('click',goFull,true); }
  const cd=(el,frac,txt)=>{ el.style.setProperty('--cd',(frac*100).toFixed(1)+'%'); const b=el.querySelector('b'); if(b&&b._t!==txt){ b._t=txt; b.textContent=txt; } el.classList.toggle('cooling',frac>0); };
  function frame(){ requestAnimationFrame(frame);
    const portrait=TOUCH.on&&window.innerHeight>window.innerWidth*1.05; if(rot._p!==portrait){ rot._p=portrait; rot.style.display=portrait?'flex':'none'; }
    const act=TOUCH.on&&(state==='fight'||state==='countdown')&&!paused&&!sandbox.open&&!portrait;
    if(act!==st.active){ st.active=act; if(!act) releaseAll(); }
    if(act!==st.shown){ st.shown=act; ui.style.display=act?'block':'none'; }
    if(!act) return;
    ui.classList.toggle('dead',!!player.dead); ui.classList.toggle('sbx',mode==='sandbox');
    const s=player.stats;
    cd(B.block,player.blockCdT>0?clamp(player.blockCdT/s.blockCd,0,1):0,player.blockCdT>0.05?player.blockCdT.toFixed(player.blockCdT<1?1:0):'');
    B.block.classList.toggle('silenced',player.silenceT>0);
    cd(B.dash,player.dashCdT>0?clamp(player.dashCdT/CFG.dashCd,0,1):0,'');
    B.dash.classList.toggle('air',!player.onGround&&!!player.airDashed);
    cd(B.fire,player.reloading?clamp(player.reloadT/s.reload,0,1):0,player.reloading?'':String(player.ammo));
    B.jump.classList.toggle('air',!player.onGround); }
  requestAnimationFrame(frame);
})();
