// ================= MENU: Public or Private =================
// Public = jump straight into a Battle with whoever's online.
// Private = pick who you play with (bots, or friends in a room you make), then the mode, map and bot level.
if(settings.gm==='battle'){ settings.gm='1v1'; saveSettings(); } // Battle used to be one of the modes; it's the Public button now
if(settings.with!=='friends') settings.with='bots';
function pvNote(){ const el=document.getElementById('pvNote'); if(!el) return; const lv=(DIFF[settings.diff]||DIFF.easy).name;
  const mb=document.querySelector('#private .seg[data-seg="map"] button.on'); const map=mb?mb.textContent:'';
  if(settings.with==='friends') el.textContent=settings.gm==='1v1'?'Make a room and send your friend the code or link. You pick the mode and map, they just join.':settings.gm==='2v2'?'2v2 room for 4 people. Bots can fill any empty seats.':'Free-for-all room for 3 or 4 people. Bots can fill any empty seats.';
  else { const a=/^[AEIOU]/.test(lv)?'an':'a'; el.textContent=settings.gm==='ffa'?`You against ${settings.ffaBots} ${lv} bots, everyone for themselves.`:settings.gm==='2v2'?`You and ${a} ${lv} bot teammate against two ${lv} bots on ${map}.`:`You against ${a} ${lv} bot on ${map}.`; } }
function pvApply(){ const fr=settings.with==='friends'; document.body.classList.toggle('with-friends',fr); document.body.classList.toggle('no-bots',fr&&settings.gm==='1v1'); const p=document.getElementById('private'), ol=document.getElementById('online');
  if(p.classList.contains('open')&&fr){ if(!ol.classList.contains('open')){ ol.classList.add('open'); olView(NET.on&&NET.seated?'wait':'main'); lobbyRender(); getRoomApi().then(a=>{ if(!a) olMsg('Online play is not available in this browser.',true); }); } }
  else if(!NET.on) ol.classList.remove('open');
  pvNote(); }
function menuPrivate(open){ const p=document.getElementById('private'); p.classList.toggle('open',open); document.getElementById('privateBtn').classList.toggle('on',open); pvApply();
  if(open) setTimeout(()=>{ try{ p.scrollIntoView({behavior:'smooth',block:'nearest'}); }catch(e){} },30); }
function menuFriends(){ settings.with='friends'; saveSettings(); syncSettingsUI(); menuPrivate(true); }
(()=>{ const $=id=>document.getElementById(id);
  $('publicBtn').addEventListener('click',()=>{ SFX.unlock(); if(btHook) btHook.play(); });
  $('privateBtn').addEventListener('click',()=>{ SFX.unlock(); SFX.hover(); menuPrivate(!$('private').classList.contains('open')); });
  document.querySelectorAll('#private [data-seg] button').forEach(b=>b.addEventListener('click',()=>pvApply())); // after the setting itself has changed
  $('btName').addEventListener('input',()=>{ if(NET.on&&NET.role==='host'&&NET.seats[0]&&NET.kind!=='battle'){ NET.seats[0].n=myName(); lobbyRender(); } });
  syncSettingsUI(); pvApply(); })();
