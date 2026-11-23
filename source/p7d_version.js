// ================= Staying up to date =================
// Online play only works properly when everyone runs the same version (an old copy can still have old bugs, like
// hits that never count). So: (1) on the live site, check now and then whether a newer version is out and offer a
// one-tap update; (2) in any online match, every game says which version it is, and if someone's out of date,
// everyone is told who should refresh. Games older than this check say nothing, so they count as out of date.
const GAME_VER=((document.querySelector('.stamp')||{}).textContent||'').match(/Version\s+([\d.]+)/)?.[1]||'0';
const verCmp=(a,b)=>{ const x=String(a||'0').split('.').map(Number), y=String(b||'0').split('.').map(Number); for(let i=0;i<Math.max(x.length,y.length);i++){ const d=(x[i]||0)-(y[i]||0); if(d) return d>0?1:-1; } return 0; };
const UPD={shown:'',told:{},checking:false};
function updBar(html,btn){ let el=document.getElementById('updBar'); if(!el){ el=document.createElement('div'); el.id='updBar'; document.body.appendChild(el); }
  el.innerHTML=`<span>${html}</span>`+(btn?`<button class="btn" type="button">${btn}</button><i title="Hide">✕</i>`:'<i title="Hide">✕</i>');
  const b=el.querySelector('button'); if(b) b.onclick=()=>{ try{ location.reload(); }catch(e){} };
  el.querySelector('i').onclick=()=>el.classList.remove('on'); el.classList.add('on'); }
// (1) a newer version on the site? (only works where version.json sits next to the game, i.e. the live site)
async function updCheck(){ if(UPD.checking||!/^https?:/.test(location.protocol)) return; UPD.checking=true;
  try{ const r=await fetch('version.json?t='+Date.now(),{cache:'no-store'}); if(r.ok){ const j=await r.json(); const v=j&&j.v;
      if(v&&verCmp(v,GAME_VER)>0&&UPD.shown!==v){ UPD.shown=v; updBar(state==='menu'?`<b>Version ${esc(v)} is out</b> (you have ${esc(GAME_VER)}). Update so online matches work properly.`:`<b>Version ${esc(v)} is out.</b> Update after this match so online play works properly.`,'UPDATE NOW'); } } }catch(e){}
  UPD.checking=false; }
setTimeout(updCheck,4000); setInterval(()=>{ if(!document.hidden) updCheck(); },180000);
document.addEventListener('visibilitychange',()=>{ if(!document.hidden) setTimeout(updCheck,800); });
// (2) someone in this match on a different version?
function verSeen(peer,pr){ if(!pr||!peer||UPD.told[peer]) return; const theirs=typeof pr.vr==='string'?pr.vr:'', nm=esc(cleanName(pr.nm)||'Someone');
  const c=theirs?verCmp(theirs,GAME_VER):-1; if(c===0) return; UPD.told[peer]=1;
  if(c>0) updBar(`<b>Your game is out of date.</b> ${nm} has version ${esc(theirs)}, you have ${esc(GAME_VER)}. Some hits won't count until you update.`,'UPDATE NOW');
  else toast(`<b>${nm}</b> is on an older version${theirs?` (${esc(theirs)})`:''}. Ask them to refresh the page, or some of their hits won't count.`,'status'); }
