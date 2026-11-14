// ================= ONLINE 1v1: create a room, share the code, fight =================
// Each player owns their own fighter's movement (instant feel); the room creator (host) is the referee for HP, knockouts,
// score and round flow. Shots and blocks travel as events so both screens see the same fight. Transport: the page's live room.
const NET_ALPHA='ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const $id=id=>document.getElementById(id);
let roomApi=null, roomTried=false;
// Two transports, one shape (join -> {presence, peers, onPeers, leave}):
//  - on the Claude link: the page's live room
//  - anywhere else (your website, itch.io, a downloaded copy): direct player-to-player WebRTC via PeerJS
// Connection layers: direct first (STUN finds each player's public address), then a relay on ports 80/443 (TURN over TLS
// looks like ordinary https traffic, so strict school/work firewalls let it through). The browser always prefers direct.
const ICE=[ {urls:['stun:stun.l.google.com:19302','stun:stun.relay.metered.ca:80']},
  {urls:['turn:global.relay.metered.ca:80','turn:global.relay.metered.ca:80?transport=tcp','turn:global.relay.metered.ca:443','turns:global.relay.metered.ca:443?transport=tcp'],username:'57b05e3791ff988f8b4ee586',credential:'clngq5n8x0NzjGzm'} ];
function peerOpts(){ const q=new URLSearchParams(location.search), h=q.get('peer'); const o={config:{iceServers:ICE}}; if(h){ const [host,port]=h.split(':'); Object.assign(o,{host,port:+(port||9000),path:'/',secure:false}); } return o; }
function peerRoomApi(){ if(typeof window.Peer!=='function') return null;
  return { join:(name,role)=>new Promise((resolve,reject)=>{ const hostId='domerounds-'+name; let done=false;
    const fail=code=>{ if(done) return; done=true; try{ peer.destroy(); }catch(e){} reject({code}); };
    const peer=role==='host'? new Peer(hostId,peerOpts()) : new Peer(peerOpts());
    const M={ me:null, mine:{}, others:{}, conns:{}, handlers:[], errH:[], sendT:0, left:false };
    const emit=()=>{ const peers=R.peers(); for(const h of M.handlers.slice()) try{ h({peers,joined:[],left:[],updated:[]}); }catch(e){ console.error(e); } };
    const wire=c=>{ c.on('open',()=>{ M.conns[c.peer]=c; if(role==='guest'&&!done){ done=true; resolve(R); } flush(true); });
      c.on('data',d=>{ if(d&&typeof d==='object'&&!Array.isArray(d)){ M.others[c.peer]=d; emit(); } });
      c.on('close',()=>{ delete M.conns[c.peer]; delete M.others[c.peer]; if(!M.left) emit(); });
      c.on('error',()=>{}); };
    const flush=(now)=>{ const t=performance.now(); if(!now&&t-M.sendT<33) return; M.sendT=t; for(const k in M.conns){ const c=M.conns[k]; if(c.open) try{ c.send(M.mine); }catch(e){} } };
    const R={ name, presence:async(p)=>{ for(const k in p){ if(p[k]===null) delete M.mine[k]; else M.mine[k]=p[k]; } flush(false); },
      peers:()=>[{peer:M.me||'me',sameTab:true,isMe:true,kind:'viewer',guest:false,by:null,presence:M.mine,updatedAt:Date.now()}].concat(Object.keys(M.others).map(k=>({peer:k,sameTab:false,isMe:false,kind:'viewer',guest:false,by:null,presence:M.others[k],updatedAt:Date.now()}))),
      onPeers:(fn,onErr)=>{ M.handlers.push(fn); if(onErr) M.errH.push(onErr); return ()=>{ M.handlers=M.handlers.filter(h=>h!==fn); }; },
      leave:async()=>{ M.left=true; try{ peer.destroy(); }catch(e){} }, connected:()=>!peer.disconnected };
    peer.on('open',id=>{ M.me=id; if(role==='host'){ done=true; resolve(R); } else wire(peer.connect(hostId,{reliable:false,serialization:'json'})); });
    peer.on('connection',c=>{ if(role==='host') wire(c); else c.close(); });
    peer.on('error',e=>{ const t=e&&e.type; if(!done){ fail(t==='unavailable-id'?'code_taken':t==='peer-unavailable'?'no_room':'upstream_error'); return; }
      if(t==='network'||t==='server-error'||t==='socket-error'||t==='socket-closed'){ /* signalling hiccup: the direct link keeps the match going */ } });
    peer.on('disconnected',()=>{ if(!M.left) try{ peer.reconnect(); }catch(e){} });
    setTimeout(()=>fail(role==='host'?'upstream_error':'no_room'),12000);
  }) }; }
// ---- our own game server (Cloudflare): secure WebSocket on port 443, works on strict school/work networks ----
const DR_SERVER=new URLSearchParams(location.search).get('server')||'https://dome-rounds-server.cpnwalozie.workers.dev';
function serverRoomApi(base){ if(!base||typeof WebSocket!=='function') return null;
  return { join:(name,role)=>new Promise((resolve,reject)=>{ const me=Math.random().toString(36).slice(2,12);
    let ws; try{ ws=new WebSocket(base.replace(/^http/,'ws').replace(/\/$/,'')+'/room/'+encodeURIComponent(name)+'?role='+role+'&peer='+me); }catch(e){ reject({code:'upstream_error'}); return; }
    let done=false; const M={mine:{},others:{},handlers:[],sendT:0,left:false};
    const emit=()=>{ const peers=R.peers(); for(const h of M.handlers.slice()) try{ h({peers,joined:[],left:[],updated:[]}); }catch(e){ console.error(e); } };
    const flush=now=>{ const t=performance.now(); if(!now&&t-M.sendT<40) return; M.sendT=t; if(ws.readyState===1) try{ ws.send(JSON.stringify(M.mine)); }catch(e){} };
    const R={ name, via:'server', presence:async p=>{ for(const k in p){ if(p[k]===null) delete M.mine[k]; else M.mine[k]=p[k]; } flush(false); },
      peers:()=>[{peer:me,sameTab:true,isMe:true,kind:'viewer',guest:false,by:null,presence:M.mine,updatedAt:Date.now()}].concat(Object.keys(M.others).map(k=>({peer:k,sameTab:false,isMe:false,kind:'viewer',guest:false,by:null,presence:M.others[k],updatedAt:Date.now()}))),
      onPeers:(fn)=>{ M.handlers.push(fn); return ()=>{ M.handlers=M.handlers.filter(h=>h!==fn); }; },
      leave:async()=>{ M.left=true; try{ ws.close(1000,'bye'); }catch(e){} }, connected:()=>ws.readyState===1 };
    ws.onmessage=ev=>{ if(ev.data==='pong') return; let m; try{ m=JSON.parse(ev.data); }catch(e){ return; }
      if(m.t==='hello'){ if(!done){ done=true; resolve(R); flush(true); } }
      else if(m.t==='err'){ if(!done){ done=true; reject({code:m.code}); } }
      else if(m.t==='p'&&m.d&&typeof m.d==='object'&&!Array.isArray(m.d)){ M.others[m.f]=m.d; emit(); }
      else if(m.t==='joined'){ flush(true); }
      else if(m.t==='left'){ delete M.others[m.f]; if(!M.left) emit(); } };
    ws.onclose=()=>{ if(!done){ done=true; reject({code:'upstream_error'}); } else if(!M.left){ M.others={}; emit(); } };
    ws.onerror=()=>{};
    setTimeout(()=>{ if(!done){ done=true; try{ ws.close(); }catch(e){} reject({code:'upstream_error'}); } },9000);
  }) }; }
// Try each way to connect in turn: our server first, then a direct/relayed browser-to-browser link.
function chainApi(list){ return { join:async(name,role)=>{ let last=null; for(const a of list){ try{ return await a.join(name,role); }catch(e){ last=e; if(e&&(e.code==='code_taken'||e.code==='full')) throw e; } } throw last||{code:'upstream_error'}; } }; }
async function getRoomApi(){ if(roomApi||roomTried) return roomApi; roomTried=true;
  try{ if(window.claude&&typeof window.claude.use==='function') roomApi=await window.claude.use('room'); }catch(e){ roomApi=null; }
  if(roomApi){ const n=$id('olNote'); if(n) n.textContent="Share this game with your rival from its page on Claude. They open it, press Play Online and type your code. The map is the room creator's pick."; }
  if(!roomApi){ const list=[serverRoomApi(DR_SERVER),peerRoomApi()].filter(Boolean); roomApi=list.length?chainApi(list):null; } return roomApi; }
getRoomApi();
const R2=v=>Math.round(v*100)/100, R3=v=>Math.round(v*1000)/1000;
function olMsg(t,bad){ const m=$id('olMsg'); m.textContent=t||''; m.classList.toggle('bad',!!bad); }
function olView(v){ $id('olMain').style.display=v==='main'?'':'none'; $id('olWait').style.display=v==='wait'?'':'none'; }
function netReset(){ NET.on=false; NET.role=null; NET.code=''; NET.room=null; NET.remote=null; NET.rs=null; NET.shots=[]; NET.shotId=0; NET.blockN=0; NET.rShot=-1; NET.rBlock=-1; NET.rCards=''; NET.rMid=0; NET.mid=0; NET.lastRx=0; NET.started=false; NET.hostMap=null; NET.joinT=0; NET.leaving=false; setRivalNames(false); }
function setRivalNames(on){ const n=on?'RIVAL':'BOT'; const a=$id('botName'), b=$id('botTagName'); if(a) a.textContent=n; if(b) b.textContent=n; }
async function netLeave(){ const r=NET.room; netReset(); if(r){ try{ await r.leave(); }catch(e){} } }
async function netOpen(code,role){
  const api=await getRoomApi(); if(!api){ olMsg('Online play is not available in this browser.',true); return; }
  olMsg(role==='host'?'Opening your room…':'Looking for room '+code+'…');
  try{ const r=await api.join('dr-'+code.toLowerCase(),role); netReset(); NET.room=r; NET.code=code; NET.role=role; NET.on=true; NET.joinT=performance.now();
    r.onPeers(ch=>netPeers(ch),e=>{ if(NET.on){ olMsg('Connection lost ('+e.code+').',true); netDrop('Connection lost.'); } });
    if(role==='host'){ olView('wait'); $id('olShow').textContent=code; $id('olStatus').textContent='Waiting for your rival to join…'; olMsg(''); }
    netSend();
  }catch(e){ const c=e&&e.code; if(c==='code_taken'&&role==='host'){ netReset(); return netOpen(newCode(),'host'); } olMsg(c==='no_room'?'No room found with code '+code+'. Check the code and try again.':c==='not_permitted'?'Online rooms are not available for your account here.':'Could not connect. Check your internet and try again.',true); netReset(); }
}
function myPeer(){ const r=NET.room; if(!r) return null; return r.peers().find(p=>p.sameTab)||null; }
function netPeers(ch){ if(!NET.on) return; const me=myPeer(); const others=ch.peers.filter(p=>!p.sameTab&&p.kind==='viewer'&&p.presence&&p.presence.v===1);
  if(NET.remote&&!ch.peers.some(p=>p.peer===NET.remote)){ netDrop('Your rival left the room.'); return; }
  if(!NET.remote){
    if(NET.role==='host'){ const g=others.find(p=>p.presence.r==='guest'&&(!p.presence.want||p.presence.want===NET.code)); if(g){ NET.remote=g.peer; NET.lastRx=performance.now(); $id('olStatus').textContent='Rival joined! Starting…'; setTimeout(()=>{ if(NET.on&&NET.remote&&state==='menu') netHostStart(); },700); } }
    else { const h=others.find(p=>p.presence.r==='host'); if(h){ const taken=h.presence.pg&&me&&h.presence.pg!==me.peer; if(taken){ olMsg('That room already has two players.',true); netLeave(); return; } NET.remote=h.peer; NET.lastRx=performance.now(); olMsg('Joined room '+NET.code+'. Get ready…'); } } }
  const rp=ch.peers.find(p=>p.peer===NET.remote); if(rp&&rp.presence) netRx(rp.presence);
}
function netDrop(why){ const inGame=state!=='menu'; netLeave(); if(inGame){ toast(`<b>${why}</b>`,'status'); setTimeout(()=>{ toMenu(); },1200); } else { olView('main'); olMsg(why,true); } }
// ---------- outgoing ----------
function netRecordShot(o,d){ if(!NET.on) return; NET.shots.push([++NET.shotId,R2(o.x),R2(o.y),R2(o.z),R3(d.x),R3(d.y),R3(d.z)]); if(NET.shots.length>8) NET.shots.shift(); }
function netRecordBlock(){ if(NET.on) NET.blockN++; }
function netSend(){ const r=NET.room; if(!r||!NET.on) return; const p=player;
  const o={ v:1, r:NET.role, f:[R2(p.pos.x),R2(p.pos.y),R2(p.pos.z),R2(p.vel.x),R2(p.vel.y),R2(p.vel.z),R3(p.yaw),R3(p.pitch),(p.dashT>0?1:0)|(p.onGround?2:0)], sh:NET.shots, bk:NET.blockN, c:p.cards };
  if(NET.role==='guest') o.want=NET.code;
  if(NET.role==='host'){ o.map=curMapId; o.pg=NET.remote||null; o.h={ m:NET.mid, ph:state, rn:roundNum, sc:[score.player,score.bot], hp:[Math.max(0,Math.round(player.hp)),Math.max(0,Math.round(bot.hp))], w:lastWinner?(lastWinner===player?'host':'guest'):null, t:Math.round(roundInfo.t*10)/10, mo:matchOverPending?1:0 }; }
  r.presence(o).catch(()=>{}); }
// ---------- incoming ----------
const isNum=v=>typeof v==='number'&&isFinite(v);
function netRx(pr){ NET.lastRx=performance.now();
  if(Array.isArray(pr.f)&&pr.f.length>=9&&pr.f.every(isNum)){ const f=pr.f; NET.rs={pos:V3(f[0],f[1],f[2]),vel:V3(f[3],f[4],f[5]),yaw:f[6],pitch:f[7],fl:f[8],at:performance.now()}; }
  if(Array.isArray(pr.c)){ const ids=pr.c.filter(id=>typeof id==='string'&&CARDS[id]).slice(0,80); const key=ids.join(','); if(key!==NET.rCards){ NET.rCards=key; const hp=bot.hp; bot.setCards(ids); if(state==='fight'||state==='roundover') bot.hp=hp; updateCardStrips(); } }
  if(Array.isArray(pr.sh)){ let mx=NET.rShot; for(const s of pr.sh){ if(!Array.isArray(s)||s.length<7||!s.every(isNum)) continue; if(NET.rShot>=0&&s[0]>NET.rShot) netRemoteFire(s); mx=Math.max(mx,s[0]); } NET.rShot=Math.max(mx,0); }
  if(isNum(pr.bk)){ if(NET.rBlock>=0&&pr.bk>NET.rBlock&&state==='fight'&&!bot.dead){ doBlock(bot,false); } NET.rBlock=pr.bk; }
  if(NET.role==='guest'&&pr.h&&typeof pr.h==='object') netGuestFollow(pr.h,pr.map);
}
function netRemoteFire(s){ if(state!=='fight'||bot.dead) return; bot.botAim=V3(s[4],s[5],s[6]).normalize(); NET.fireOrigin=V3(s[1],s[2],s[3]); try{ firePellets(bot); } finally { NET.fireOrigin=null; } bot.burstQueue=0; }
function netGuestFollow(h,map){
  if(typeof map==='string'&&MAPS[map]) NET.hostMap=map;
  const ph=h.ph, rn=h.rn|0;
  if(isNum(h.m)&&h.m!==NET.rMid&&(ph==='countdown'||ph==='fight')&&rn===1){ NET.rMid=h.m; netStartLocal(); return; }
  if(!NET.started) return;
  if(ph==='countdown'&&rn===roundNum&&(state==='picked'||state==='draft')&&player.cards.length===(rn-1)){ show(UI.draft,false); beginRound(); }
  if((state==='fight'||state==='roundover')&&Array.isArray(h.hp)){ if(isNum(h.hp[1])&&!player.dead) player.hp=h.hp[1]; if(isNum(h.hp[0])&&!bot.dead) bot.hp=h.hp[0]; }
  if(state==='fight'&&isNum(h.t)) roundInfo.t=Math.max(roundInfo.t,h.t);
  if(ph==='roundover'&&state==='fight'&&(h.w==='host'||h.w==='guest')){ const winner=h.w==='guest'?player:bot; NET.allowKill=true; try{ killFighter(other(winner),winner); } finally { NET.allowKill=false; } }
  if(Array.isArray(h.sc)&&isNum(h.sc[0])&&isNum(h.sc[1])&&(score.player!==h.sc[1]||score.bot!==h.sc[0])&&state!=='fight'){ score.player=h.sc[1]; score.bot=h.sc[0]; matchOverPending=score.player>=CFG.winsToTakeMatch||score.bot>=CFG.winsToTakeMatch; buildPips(); }
}
// ---------- match flow ----------
function netHostStart(){ NET.mid++; NET.started=true; setRivalNames(true); startMatch(); }
function netStartLocal(){ NET.started=true; setRivalNames(true); startMatch(); }
function netAfterPick(){ UI.draftSub.textContent='Locked in. Waiting for your rival to pick…'; }
function netTick(dt){ if(!NET.on) return;
  netSend();
  if(NET.remote&&performance.now()-NET.lastRx>15000){ netDrop('Your rival lost connection.'); return; }
  if(!NET.remote&&NET.role==='guest'&&performance.now()-NET.joinT>7000){ olMsg('No room found with code '+NET.code+'. Check the code and try again.',true); netLeave(); return; }
  if(NET.role==='host'&&NET.started&&state==='picked'&&NET.rCards.split(',').filter(Boolean).length===player.cards.length){ show(UI.draft,false); beginRound(); }
}
function netApplyRemote(dt){ const s=NET.rs; if(!s) return; const age=Math.min(0.15,(performance.now()-s.at)/1000);
  const tgt=s.pos.clone().addScaledVector(s.vel,age); if(bot.pos.distanceTo(tgt)>4) bot.pos.copy(tgt); else bot.pos.lerp(tgt,Math.min(1,dt*16));
  bot.vel.copy(s.vel); let dy=s.yaw-bot.yaw; dy=Math.atan2(Math.sin(dy),Math.cos(dy)); bot.yaw+=dy*Math.min(1,dt*18); bot.pitch=lerp(bot.pitch,s.pitch,Math.min(1,dt*18));
  bot.onGround=!!(s.fl&2); if(s.fl&1){ bot.dashT=0.05; bot.dashDir.set(-Math.sin(bot.yaw),0,-Math.cos(bot.yaw)); if(Math.random()<0.3) ghostAt(bot.center(),bot.team.light); } else bot.dashT=0;
  if(NET.role==='host'&&state==='fight'&&!bot.dead&&(bot.pos.y<CFG.killY||Math.abs(bot.pos.x)>HX+28||Math.abs(bot.pos.z)>HZ+28)){ bot.invulnT=0; fatal(bot,player,'fall'); } }
// ---------- UI ----------
$id('onlineBtn').addEventListener('click',()=>{ SFX.unlock(); const p=$id('online'); p.classList.toggle('open'); if(p.classList.contains('open')){ olView(NET.on&&NET.role==='host'?'wait':'main'); getRoomApi().then(a=>{ if(!a) olMsg('Online play is not available in this browser.',true); }); } });
function newCode(){ let c=''; for(let i=0;i<5;i++) c+=NET_ALPHA[Math.floor(Math.random()*NET_ALPHA.length)]; return c; }
$id('olCreate').addEventListener('click',()=>{ SFX.unlock(); if(NET.on) return; netOpen(newCode(),'host'); });
const codeIn=$id('olCode'); codeIn.addEventListener('input',()=>{ codeIn.value=codeIn.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,5); });
const doJoin=()=>{ SFX.unlock(); if(NET.on) return; const c=codeIn.value.trim().toUpperCase(); if(!/^[A-Z0-9]{5}$/.test(c)){ olMsg('Type the 5-character room code.',true); return; } netOpen(c,'guest'); };
$id('olJoin').addEventListener('click',doJoin); codeIn.addEventListener('keydown',e=>{ e.stopPropagation(); if(e.key==='Enter') doJoin(); });
$id('olCopy').addEventListener('click',()=>{ try{ navigator.clipboard.writeText(NET.code).then(()=>olMsg('Code copied.'),()=>olMsg('Copy failed. Read it out instead: '+NET.code)); }catch(e){ olMsg('Copy failed. Read it out instead: '+NET.code); } });
$id('olCancel').addEventListener('click',()=>{ netLeave(); olView('main'); olMsg(''); });
