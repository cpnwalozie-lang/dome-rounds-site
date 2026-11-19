// ================= MENU: Public or Private =================
// Public = jump straight into a Battle with whoever's online.
// Private = pick who you play with (bots, or friends in a room you make), then the mode, map and bot level.
if(settings.gm==='battle'){ settings.gm='1v1'; saveSettings(); } // Battle used to be one of the modes; it's the Public button now
if(settings.with!=='friends') settings.with='bots';
function pvNote(){ const el=document.getElementById('pvNote'); if(!el) return; const lv=(DIFF[settings.diff]||DIFF.easy).name;
  const mb=document.querySelector('#private .seg[data-seg="map"] button.on'); const map=mb?mb.textContent:'';
  if(settings.with==='friends') el.textContent=settings.gm==='1v1'?'Make a room and send your friend the code or link. You pick the mode and map, they just join.':settings.gm==='2v2'?'2v2 room for 4. Fill empty seats with bots, and use Change Teammate to team up with a friend against bots.':'Free-for-all room for 3 or 4. Mix friends and bots any way you like: add bots to fill the empty seats.';
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

// ================= Who's online =================
// Every open copy of the game keeps one tiny connection to the server's Hub and says where it is
// (menu, public match, private room, playing bots, or tucked away in a background tab).
// Only the owner gets the numbers back: open the game once with ?owner=<key> and this copy shows them on the menu
// (?owner=off forgets it). Everyone else's game just reports; nothing comes back. Idle connections cost nothing.
const ONL={ws:null,w:'',retry:0,last:null,key:''};
(()=>{ try{ const q=new URLSearchParams(location.search), k=q.get('owner'); if(k!==null){ if(k==='off') localStorage.removeItem('domeRoundsOwner'); else if(/^[A-Za-z0-9]{8,64}$/.test(k)) localStorage.setItem('domeRoundsOwner',k);
    const u=new URL(location.href); u.searchParams.delete('owner'); history.replaceState(null,'',u.pathname+u.search+u.hash); } ONL.key=localStorage.getItem('domeRoundsOwner')||''; }catch(e){} })();
function onlWhere(){ if(document.hidden) return 'away'; if(BT.on) return BT.online?'battle':'bots'; if(NET.on) return 'private'; return state==='menu'&&!sandbox.open?'menu':'bots'; }
function onlDev(){ let d=''; try{ d=localStorage.getItem('domeRoundsDev')||''; if(!/^[a-z0-9]{8,24}$/.test(d)){ d=(Math.random().toString(36).slice(2,12)+Math.random().toString(36).slice(2,10)).replace(/[^a-z0-9]/g,'').slice(0,18); localStorage.setItem('domeRoundsDev',d); } }catch(e){} return d; }
function onlConnect(){ if(!DR_SERVER||typeof WebSocket!=='function') return; let ws; const w=onlWhere();
  try{ ws=new WebSocket(DR_SERVER.replace(/^http/,'ws').replace(/\/$/,'')+'/hub?d='+onlDev()+'&w='+w+(ONL.key?'&k='+encodeURIComponent(ONL.key):'')); }catch(e){ return; }
  ONL.ws=ws; ONL.w=w;
  ws.onopen=()=>{ ONL.retry=0; const now=onlWhere(); if(now!==ONL.w){ ONL.w=now; try{ ws.send(JSON.stringify({w:now})); }catch(e){} } };
  ws.onmessage=ev=>{ if(ev.data==='pong') return; let m=null; try{ m=JSON.parse(ev.data); }catch(e){ return; } if(m&&m.t==='n') onlShow(m); };
  ws.onclose=()=>{ if(ONL.ws===ws) ONL.ws=null; onlShow(null); setTimeout(onlConnect,Math.min(60000,3000*Math.pow(2,ONL.retry++))); };
  ws.onerror=()=>{}; }
function onlTell(){ const ws=ONL.ws; if(!ws||ws.readyState!==1) return; const w=onlWhere(); if(w===ONL.w) return; ONL.w=w; try{ ws.send(JSON.stringify({w})); }catch(e){} }
// owner only: the live count on the menu (tap it for the full stats page)
function onlShow(m){ ONL.last=m; const el=document.getElementById('onlineNow'); if(!el) return;
  if(!m||!ONL.key){ el.classList.remove('on'); return; } const f=v=>(v|0).toLocaleString('en-GB');
  el.querySelector('span').innerHTML=`<b>${f(m.online)}</b> online · <b>${f(m.battle)}</b> public · <b>${f(m.private)}</b> private · <b>${f(m.bots)}</b> vs bots · <b>${f(m.menu)}</b> on menu <em>(only you see this)</em>`; el.classList.add('on'); }
(()=>{ const el=document.getElementById('onlineNow'); if(el) el.addEventListener('click',()=>{ if(!ONL.key) return; try{ window.open(DR_SERVER.replace(/\/$/,'')+'/stats?key='+encodeURIComponent(ONL.key),'_blank','noopener'); }catch(e){} }); })();
setInterval(onlTell,1000);
setInterval(()=>{ const ws=ONL.ws; if(ws&&ws.readyState===1) try{ ws.send('ping'); }catch(e){} },45000);
document.addEventListener('visibilitychange',onlTell);
setTimeout(onlConnect,600);
