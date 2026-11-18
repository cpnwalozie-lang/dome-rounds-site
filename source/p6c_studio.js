// ================= DOME STUDIO =================
// Pick how your dome looks (style + colour). Live preview on your own fighter in the menu scene.
(()=>{
  const ov=document.getElementById('studio'), grid=document.getElementById('stSkins'), colsEl=document.getElementById('stCols');
  const nameEl=document.getElementById('stName'), blurbEl=document.getElementById('stBlurb'), picker=document.getElementById('stPick');
  const SW=['#35e9ff','#ff2e88','#ffd21f','#7dff6b','#a46bff','#ff7a1a','#ff3b3b','#2f6fe4','#ffffff','#111118'];
  let lastHit=0;
  function tiles(){ grid.innerHTML=DOME_ORDER.map(i=>[DOME_SKINS[i],i]).map(([d,i])=>`<button type="button" class="st-tile${(settings.domeSkin|0)===i?' on':''}" data-i="${i}" aria-pressed="${(settings.domeSkin|0)===i}"><span class="dthumb dt-${d.id}"><i></i></span><b>${d.name}</b></button>`).join(''); }
  function cols(){ const cur=settings.domeCol||''; const sk=DOME_SKINS[settings.domeSkin|0];
    colsEl.innerHTML=`<button type="button" class="sw def${cur===''?' on':''}" data-c="" title="Style colour" aria-label="Style colour" style="--c:${sk.tint||'#35e9ff'}"></button>`+SW.map(c=>`<button type="button" class="sw${cur.toLowerCase()===c?' on':''}" data-c="${c}" aria-label="Colour ${c}" style="--c:${c}"></button>`).join('')+
      `<label class="sw pick${cur&&!SW.includes(cur.toLowerCase())?' on':''}" title="Pick any colour" style="--c:${cur&&!SW.includes(cur.toLowerCase())?cur:'#ffffff'}"><input type="color" id="stPickIn" value="${cur||'#ff2e88'}" aria-label="Pick any colour"></label>`;
    const pin=document.getElementById('stPickIn'); pin.addEventListener('input',()=>{ settings.domeCol=pin.value; saveSettings(); refresh(false); pop(); }); }
  function refresh(rebuild=true){ const d=DOME_SKINS[settings.domeSkin|0]; nameEl.textContent=d.name; blurbEl.textContent=d.blurb; if(rebuild) tiles(); cols(); }
  function pop(){ if(!player) return; player.domeHitAge=0; const a=Math.random()*6.28; player.domeHitDir.set(Math.cos(a)*0.7,0.6,Math.sin(a)*0.7).normalize(); player.previewFlash=0.4; lastHit=performance.now(); }
  grid.addEventListener('click',e=>{ const b=e.target.closest('.st-tile'); if(!b) return; settings.domeSkin=+b.dataset.i; saveSettings(); SFX.pick(); refresh(); pop(); });
  colsEl.addEventListener('click',e=>{ const b=e.target.closest('button.sw'); if(!b) return; settings.domeCol=b.dataset.c; saveSettings(); SFX.hover(); refresh(false); pop(); });
  function open(){ if(state!=='menu') return; STUDIO.open=true; SFX.unlock(); refresh(); const sm=document.getElementById('start'); ov._startDisp=sm.style.display&&sm.style.display!=='none'?sm.style.display:'block'; sm.style.display='none'; ov.style.display='flex'; requestAnimationFrame(()=>ov.classList.add('in')); if(player){ player.domePreview=true; pop(); } }
  function close(){ STUDIO.open=false; ov.classList.remove('in'); ov.style.display='none'; if(player){ player.domePreview=false; player.previewFlash=0; } if(state==='menu') document.getElementById('start').style.display=ov._startDisp||'block'; SFX.confirm(); }
  document.getElementById('studioBtn').addEventListener('click',open);
  document.getElementById('stDone').addEventListener('click',close);
  document.getElementById('stTest').addEventListener('click',()=>{ pop(); SFX.block(); });
  window.addEventListener('keydown',e=>{ if(STUDIO.open&&e.code==='Escape'){ e.preventDefault(); close(); } });
  // keep the preview alive: a ripple every few seconds, flash fades out
  (function tick(){ requestAnimationFrame(tick); if(!STUDIO.open||!player) return; if(state!=='menu'){ close(); return; } player.domePreview=true; player.previewFlash=Math.max(0,(player.previewFlash||0)-0.03); if(performance.now()-lastHit>2600) pop(); })();
  STUDIO.close=close;
})();
