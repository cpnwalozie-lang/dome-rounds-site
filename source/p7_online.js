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
      c.on('data',d=>{ if(!d||typeof d!=='object'||Array.isArray(d)) return;
        if(role==='guest'&&typeof d.__f==='string'){ if(d.d&&typeof d.d==='object') M.others[d.__f]=d.d; emit(); return; } // another guest, passed on by the host
        if(role==='guest'&&typeof d.__l==='string'){ delete M.others[d.__l]; emit(); return; }
        M.others[c.peer]=d; emit();
        if(role==='host') for(const k in M.conns){ if(k===c.peer) continue; const o=M.conns[k]; if(o.open) try{ o.send({__f:c.peer,d}); }catch(e){} } }); // guests only talk to the host, so it relays
      c.on('close',()=>{ delete M.conns[c.peer]; delete M.others[c.peer]; if(role==='host') for(const k in M.conns){ const o=M.conns[k]; if(o.open) try{ o.send({__l:c.peer}); }catch(e){} } if(!M.left) emit(); });
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
// ---------- rooms: numbered seats (0 = the host). 1v1 has 2 seats, free-for-all 3-4 (the host can fill seats with bots) ----------
const cleanName=n=>(typeof n==='string'?n.replace(/[<>&"'`]/g,'').trim().slice(0,14):'')||'Player';
const seatCap=()=>NET.kind==='1v1'?2:4; const seatsNeeded=()=>NET.kind==='2v2'?4:NET.kind==='ffa'?3:2;
const seatTeam=i=>NET.kind==='2v2'?(i%2===0?TEAM.player:TEAM.bot):TEAM[SLOT_TEAMS[i]];
function olMsg(t,bad){ const m=$id('olMsg'); m.textContent=t||''; m.classList.toggle('bad',!!bad); }
function olView(v){ $id('olMain').style.display=v==='main'?'':'none'; $id('olWait').style.display=v==='wait'?'':'none'; }
function netReset(){ Object.assign(NET,{on:false,role:null,code:'',room:null,kind:'1v1',seats:[],seated:false,hostPeer:null,rx:{},shots:[],shotId:0,blockN:0,mid:0,rMid:0,lastRx:0,started:false,hostMap:null,joinT:0,leaving:false,rs:null}); setRivalNames(false); lobbyRender(); }
function setRivalNames(on){ const r=on&&fighters.find(f=>f!==player&&f.peer); const n=on?(r?r.name.toUpperCase():'RIVAL'):'BOT'; const a=$id('botName'), b=$id('botTagName'); if(a) a.textContent=n; if(b) b.textContent=n; }
async function netLeave(){ const r=NET.room; netReset(); if(r){ try{ await r.leave(); }catch(e){} } }
async function netOpen(code,role){
  const api=await getRoomApi(); if(!api){ olMsg('Online play is not available in this browser.',true); return; }
  olMsg(role==='host'?'Opening your room…':'Looking for room '+code+'…');
  try{ const r=await api.join('dr-'+code.toLowerCase(),role); netReset(); NET.room=r; NET.code=code; NET.role=role; NET.on=true; NET.joinT=performance.now(); NET.kind=['ffa','2v2'].includes(settings.gm)?settings.gm:'1v1';
    r.onPeers(ch=>netPeers(ch),e=>{ if(NET.on){ olMsg('Connection lost ('+e.code+').',true); netDrop('Connection lost.'); } });
    if(role==='host'){ NET.seats=[{p:myPeerId(),n:myName(),b:false}]; NET.seated=true; olView('wait'); $id('olShow').textContent=code; olMsg(''); }
    lobbyRender(); netSend();
  }catch(e){ const c=e&&e.code; if(c==='code_taken'&&role==='host'){ netReset(); return netOpen(newCode(),'host'); } olMsg(c==='no_room'?'No room found with code '+code+'. Check the code and try again.':c==='full'?'That room is full.':c==='not_permitted'?'Online rooms are not available for your account here.':'Could not connect. Check your internet and try again.',true); netReset(); }
}
function myPeer(){ const r=NET.room; if(!r) return null; return r.peers().find(p=>p.sameTab)||null; }
function myPeerId(){ const m=myPeer(); return m?m.peer:'me'; }
function netPeers(ch){ if(!NET.on) return; const others=ch.peers.filter(p=>!p.sameTab&&p.kind==='viewer'&&p.presence&&p.presence.v===2); const now=performance.now();
  for(const p of others) NET.rx[p.peer]=now;
  if(NET.role==='host') hostLobby(others); else if(!guestLobby(others)) return;
  for(const p of others) netRx(p.peer,p.presence);
  lobbyRender(); }
// host: seat whoever asks for this room's code, until it's full or the match has started
function hostLobby(others){ const ids=new Set(others.map(p=>p.peer));
  for(const st of NET.seats.slice()) if(st.p&&st.p!==myPeerId()&&!st.b&&!ids.has(st.p)) seatLeft(st);
  for(const p of others){ const pr=p.presence; if(pr.r!=='guest'||(pr.want&&pr.want!==NET.code)) continue; const st=NET.seats.find(x=>x.p===p.peer);
    if(st){ const n=cleanName(pr.nm); if(st.n!==n){ st.n=n; const f=fighters.find(x=>x.peer===p.peer); if(f) f.name=n; } continue; }
    if(NET.started||NET.seats.length>=seatCap()) continue;
    NET.seats.push({p:p.peer,n:cleanName(pr.nm),b:false}); SFX.hover();
    if(NET.kind==='1v1'&&NET.seats.length===2){ $id('olStatus').textContent='Rival joined! Starting…'; setTimeout(()=>{ if(NET.on&&!NET.started&&state==='menu') netHostStart(); },700); } } }
function seatLeft(st){ const name=st.n; if(!NET.started){ NET.seats=NET.seats.filter(x=>x!==st); return; }
  if(NET.kind==='1v1'){ netDrop('Your rival left the room.'); return; }
  st.gone=true; const f=fighters.find(x=>x.peer===st.p); toast(`<b>${esc(name)}</b> left the room`,'status');
  if(f){ if(!f.dead&&state==='fight'){ NET.allowKill=true; try{ killFighter(f,null); } finally{ NET.allowKill=false; } } const i=fighters.indexOf(f); if(i>=0&&!(state==='fight'||state==='roundover')){ fighters.splice(i,1); f.setActive(false); } else f.leaving=true; }
  NET.seats=NET.seats.filter(x=>x!==st);
  if(fighters.filter(x=>!x.leaving).length<2){ netDrop('Everyone else left the room.'); } }
// guest: follow the host's seat list; returns false if we had to leave
function guestLobby(others){ const h=others.find(p=>p.presence.r==='host');
  if(!h){ if(NET.hostPeer){ netDrop('The host closed the room.'); return false; } return true; }
  NET.hostPeer=h.peer; NET.lastRx=performance.now(); const pr=h.presence; NET.kind=['ffa','2v2'].includes(pr.k)?pr.k:'1v1'; if(typeof pr.map==='string'&&MAPS[pr.map]) NET.hostMap=pr.map;
  if(pr.lob&&Array.isArray(pr.lob.seats)){ const seats=pr.lob.seats.filter(a=>Array.isArray(a)).slice(0,4).map(a=>({p:typeof a[0]==='string'?a[0]:null,n:cleanName(a[1]),b:!!a[2]})); const me=myPeerId(); const mine=seats.findIndex(x=>x.p===me);
    if(mine<0){ if(NET.seated){ netDrop('You were removed from the room.'); return false; } if(pr.lob.st||seats.length>=seatCap()){ olMsg(pr.lob.st?'That room is in the middle of a match. Try again when it ends.':'That room is full.',true); netLeave(); return false; } }
    else if(!NET.seated){ NET.seated=true; olView('wait'); $id('olShow').textContent=NET.code; olMsg(NET.kind!=='1v1'?'You\'re in! Waiting for the host to start…':'Joined room '+NET.code+'. Get ready…'); SFX.hover(); }
    NET.seats=seats; }
  return true; }
function netDrop(why){ const inGame=state!=='menu'; netLeave(); if(inGame){ toast(`<b>${why}</b>`,'status'); setTimeout(()=>{ toMenu(); },1200); } else { olView('main'); olMsg(why,true); } }
// seats -> fighters on this screen (you're always 'player'; the others fill the remaining fighters)
function netBuildRoster(){ const me=myPeerId(); let k=1; const list=NET.seats.map((st,i)=>{ const mine=st.p===me; const f=mine?player:seatFighter(k++); return {f,slot:i,side:NET.kind==='2v2'?i%2:i,ctl:mine?'local':(st.b&&NET.role==='host'?'ai':'net'),name:mine?myName():st.n,peer:st.b?null:st.p}; });
  matchKind=NET.kind; setRoster(list); for(const f of fighters){ f.rs=null; f.nrShot=-1; f.nrBlock=-1; f.nrCards=''; f.nShots=[]; f.nShotId=0; f.nBlock=0; f.leaving=false; f.snaps=[]; f.lastLocalHit=0; } NET.hits=[]; NET.hitSeq=0; NET.hitSeen={}; NET.clk={};
  if(NET.kind==='1v1'){ player.setTeam(TEAM.player); for(const f of fighters) if(f!==player) f.setTeam(TEAM.bot); } setRivalNames(true); }
// ---------- hits: the shooter's screen decides ----------
// A bullet belongs to whichever screen runs its owner. Only that screen decides if it hit someone; everyone else waits for the call.
function netRemoteBullet(b){ return NET.on&&NET.started&&b.owner&&b.owner.ctl==='net'; }
function netRecordHit(b,e){ if(!NET.on||!NET.started||b.owner.ctl==='net') return; NET.hits.push([++NET.hitSeq,b.owner.slot,b.sid|0,b.pi|0,e.slot,R2(b.pos.x),R2(b.pos.y),R2(b.pos.z),b.reflected?1:0]); if(NET.hits.length>14) NET.hits.shift(); }
function netApplyHits(peer,list){ if(!Array.isArray(list)||!(state==='fight')) { if(Array.isArray(list)) NET.hitSeen[peer]=Math.max(NET.hitSeen[peer]||0,...list.map(h=>Array.isArray(h)?h[0]|0:0)); return; }
  const last=NET.hitSeen[peer]||0; let mx=last;
  for(const h of list){ if(!Array.isArray(h)||h.length<9||!h.every(isNum)||h[0]<=last) continue; mx=Math.max(mx,h[0]);
    const owner=fighters.find(f=>f.slot===h[1]), tgt=fighters.find(f=>f.slot===h[4]); if(!owner||!tgt||tgt.dead) continue;
    const pos=V3(h[5],h[6],h[7]);
    if(tgt.blockActive){ let bi=bullets.findIndex(b=>b.owner===owner&&b.sid===h[2]&&b.pi===h[3]); if(bi>=0) removeBullet(bi); burst(pos,0xffffff,5,3,0.08,0.3,0); continue; } // their dome was up on the referee's screen: blocked
    let i=bullets.findIndex(b=>b.sid===h[2]&&b.pi===h[3]&&(b.owner===owner||b.ownerSlot0===h[1]));
    let b; if(i>=0) b=bullets[i]; else { b=spawnBullet(owner,pos,V3().subVectors(tgt.center(),pos).normalize().lengthSq()?V3().subVectors(tgt.center(),pos).normalize():V3(0,0,1),{}); i=bullets.indexOf(b); }
    b.pos.copy(pos); b.mesh.position.copy(pos); hitFighter(b,tgt); if(i>=0&&bullets[i]===b) removeBullet(i); }
  NET.hitSeen[peer]=mx; }
// ---------- outgoing ----------
function netRecordShot(o,d,f){ if(!NET.on) return; const sh=[R2(o.x),R2(o.y),R2(o.z),R3(d.x),R3(d.y),R3(d.z)]; if(!f||f===player){ NET.shots.push([++NET.shotId,...sh]); player.lastSid=NET.shotId; if(NET.shots.length>8) NET.shots.shift(); } else { f.nShots=f.nShots||[]; f.nShotId=(f.nShotId||0)+1; f.nShots.push([f.nShotId,...sh]); f.lastSid=f.nShotId; if(f.nShots.length>8) f.nShots.shift(); } }
function netRecordBlock(f){ if(!NET.on) return; if(!f||f===player) NET.blockN++; else f.nBlock=(f.nBlock||0)+1; }
const fstate=f=>[R2(f.pos.x),R2(f.pos.y),R2(f.pos.z),R2(f.vel.x),R2(f.vel.y),R2(f.vel.z),R3(f.yaw),R3(f.pitch),(f.dashT>0?1:0)|(f.onGround?2:0)];
function netSend(){ const r=NET.room; if(!r||!NET.on) return; const p=player;
  const o={ v:2, r:NET.role, nm:myName(), f:fstate(p), sh:NET.shots, bk:NET.blockN, c:p.cards, ht:NET.hits, ts:Math.round(performance.now()) };
  if(NET.role==='guest') o.want=NET.code;
  if(NET.role==='host'){ o.k=NET.kind; o.map=NET.kind==='ffa'?'ffa':curMapId; o.lob={seats:NET.seats.map(st=>[st.b?null:st.p,st.n,st.b?1:0]),st:NET.started?1:0};
    if(NET.started){ const S=fighters.slice().sort((a,b)=>a.slot-b.slot), n=Math.max(...S.map(f=>f.slot))+1, by=k=>S.find(f=>f.slot===k);
      const col=fn=>Array.from({length:n},(_,k)=>{ const f=by(k); return f?fn(f):0; });
      o.h={ m:NET.mid, ph:state, rn:roundNum, sc:col(f=>f.score), hp:col(f=>Math.max(0,Math.round(f.hp))), dd:col(f=>f.dead?1:0), w:lastWinner?lastWinner.slot:-1, t:Math.round(roundInfo.t*10)/10, mo:matchOverPending?1:0 };
      o.bots=fighters.filter(f=>f.ctl==='ai').map(f=>({s:f.slot,f:fstate(f),sh:f.nShots||[],bk:f.nBlock||0,c:f.cards,ts:o.ts})); } }
  r.presence(o).catch(()=>{}); }
// ---------- incoming ----------
const isNum=v=>typeof v==='number'&&isFinite(v);
function netRx(peer,pr){
  const f=fighters.find(x=>x.peer===peer&&x.ctl==='net'); if(f) netRxFighter(f,pr);
  netApplyHits(peer,pr.ht);
  if(NET.role==='guest'&&peer===NET.hostPeer){ if(Array.isArray(pr.bots)) for(const b of pr.bots){ if(!b||!isNum(b.s)) continue; const bf=fighters.find(x=>x.slot===b.s&&x.ctl==='net'&&!x.peer); if(bf) netRxFighter(bf,b); }
    if(pr.h&&typeof pr.h==='object') netGuestFollow(pr.h); } }
function netRxFighter(f,d){
  if(Array.isArray(d.f)&&d.f.length>=9&&d.f.every(isNum)){ const a=d.f, now=performance.now(); const ts=isNum(d.ts)?d.ts:now; const key=f.peer||('b'+f.slot); const off=now-ts; NET.clk[key]=NET.clk[key]===undefined?off:Math.min(NET.clk[key]+0.3,off); // smallest delay seen = best clock match (drifts up slowly)
    f.rs={pos:V3(a[0],a[1],a[2]),vel:V3(a[3],a[4],a[5]),yaw:a[6],pitch:a[7],fl:a[8],at:now};
    f.snaps=f.snaps||[]; const L=f.snaps[f.snaps.length-1]; if(!L||ts>L.ts){ f.snaps.push({ts,pos:f.rs.pos,vel:f.rs.vel,yaw:a[6],pitch:a[7],fl:a[8]}); if(f.snaps.length>12) f.snaps.shift(); } f.clkKey=key; }
  if(Array.isArray(d.c)){ const ids=d.c.filter(id=>typeof id==='string'&&CARDS[id]).slice(0,80); const key=ids.join(','); if(key!==f.nrCards){ f.nrCards=key; const hp=f.hp; f.setCards(ids); if(state==='fight'||state==='roundover') f.hp=hp; updateCardStrips(); } }
  if(Array.isArray(d.sh)){ let mx=f.nrShot; for(const s of d.sh){ if(!Array.isArray(s)||s.length<7||!s.every(isNum)) continue; if(f.nrShot>=0&&s[0]>f.nrShot) netRemoteFire(f,s); mx=Math.max(mx,s[0]); } f.nrShot=Math.max(mx,0); }
  if(isNum(d.bk)){ if(f.nrBlock>=0&&d.bk>f.nrBlock&&state==='fight'&&!f.dead) doBlock(f,false); f.nrBlock=d.bk; } }
function netRemoteFire(f,s){ if(state!=='fight'||f.dead) return; f.botAim=V3(s[4],s[5],s[6]).normalize(); NET.fireOrigin=V3(s[1],s[2],s[3]); NET.curSid=s[0]; try{ firePellets(f); } finally { NET.fireOrigin=null; NET.curSid=0; } f.burstQueue=0; }
function netGuestFollow(h){
  const ph=h.ph, rn=h.rn|0;
  if(isNum(h.m)&&h.m!==NET.rMid&&(ph==='countdown'||ph==='fight')&&rn===1){ NET.rMid=h.m; netStartLocal(); return; }
  if(!NET.started) return;
  if(ph==='countdown'&&rn===roundNum&&(state==='picked'||state==='draft')&&player.cards.length===(rn-1)){ show(UI.draft,false); beginRound(); }
  const by=k=>fighters.find(f=>f.slot===k);
  if((state==='fight'||state==='roundover')&&Array.isArray(h.hp)){ const now=performance.now(); h.hp.forEach((v,k)=>{ const f=by(k); if(f&&isNum(v)&&!f.dead&&now-(f.lastLocalHit||0)>400) f.hp=v; }); }
  if(state==='fight'&&isNum(h.t)) roundInfo.t=Math.max(roundInfo.t,h.t);
  if(state==='fight'&&NET.kind!=='1v1'&&Array.isArray(h.dd)){ NET.allowKill=true; try{ h.dd.forEach((v,k)=>{ const f=by(k); if(v===1&&f&&!f.dead&&state==='fight') killFighter(f,f.lastHitBy); }); } finally { NET.allowKill=false; } }
  if(ph==='roundover'&&state==='fight'&&isNum(h.w)&&h.w>=0){ const w=by(h.w); if(w){ NET.allowKill=true; try{ if(NET.kind==='1v1') killFighter(other(w),w); else for(const f of fighters) if(f.side!==w.side&&!f.dead&&state==='fight') killFighter(f,null); } finally { NET.allowKill=false; } } }
  if(Array.isArray(h.sc)&&state!=='fight'){ let ch=false; h.sc.forEach((v,k)=>{ const f=by(k); if(f&&isNum(v)&&f.score!==v){ f.score=v; ch=true; } }); if(ch){ score.player=player.score; score.bot=bot.score; matchOverPending=fighters.some(f=>f.score>=CFG.winsToTakeMatch); buildPips(); ffaBoardKey=''; } }
}
// ---------- match flow ----------
function netHostStart(){ if(NET.seats.length<seatsNeeded()) return; NET.mid++; NET.started=true; netBuildRoster(); lobbyRender(); startMatch(); }
function netStartLocal(){ NET.started=true; netBuildRoster(); startMatch(); }
function netAfterPick(){ UI.draftSub.textContent=NET.kind!=='1v1'?'Locked in. Waiting for everyone to pick…':'Locked in. Waiting for your rival to pick…'; }
function netTick(dt){ if(!NET.on) return;
  netSend(); const now=performance.now();
  if(NET.role==='guest'){ if(NET.hostPeer&&now-NET.lastRx>15000){ netDrop('Lost connection to the host.'); return; } if(!NET.hostPeer&&now-NET.joinT>7000){ olMsg('No room found with code '+NET.code+'. Check the code and try again.',true); netLeave(); return; } }
  if(NET.role==='host'&&NET.started){ for(const st of NET.seats.slice()) if(st.p&&!st.b&&st.p!==myPeerId()&&now-(NET.rx[st.p]||now)>15000) seatLeft(st); if(!NET.on) return; }
  if(NET.role==='host'&&NET.started){ for(const f of fighters.slice()) if(f.leaving&&state!=='fight'&&state!=='roundover'){ fighters.splice(fighters.indexOf(f),1); f.setActive(false); ffaBoardKey=''; } }
  if(NET.role==='host'&&NET.started&&state==='picked'&&fighters.every(f=>f.ctl!=='net'||f.leaving||f.cards.length===player.cards.length)){ show(UI.draft,false); beginRound(); }
}
const NET_DELAY=100; // show other players 0.1 s in the past, between two real updates: smooth, no guessing
function netApplyRemote(f,dt){ const s=f.rs; if(!s) return; const S=f.snaps||[];
  let tgt, yaw=s.yaw, pitch=s.pitch;
  if(S.length>=2){ const rt=performance.now()-(NET.clk[f.clkKey]||0)-NET_DELAY; let k=S.length-1; while(k>0&&S[k-1].ts>rt) k--;
    if(k>0&&S[k].ts>=rt){ const a=S[k-1], b=S[k], u=clamp((rt-a.ts)/Math.max(1,b.ts-a.ts),0,1); tgt=a.pos.clone().lerp(b.pos,u); let dy=b.yaw-a.yaw; dy=Math.atan2(Math.sin(dy),Math.cos(dy)); yaw=a.yaw+dy*u; pitch=lerp(a.pitch,b.pitch,u); }
    else if(rt<S[0].ts){ tgt=S[0].pos.clone(); yaw=S[0].yaw; pitch=S[0].pitch; }
    else { const L=S[S.length-1]; tgt=L.pos.clone().addScaledVector(L.vel,Math.min(0.12,(rt-L.ts)/1000)); yaw=L.yaw; pitch=L.pitch; } }
  else { const age=Math.min(0.15,(performance.now()-s.at)/1000); tgt=s.pos.clone().addScaledVector(s.vel,age); }
  if(f.pos.distanceTo(tgt)>4) f.pos.copy(tgt); else f.pos.lerp(tgt,Math.min(1,dt*24));
  f.vel.copy(s.vel); let dy=yaw-f.yaw; dy=Math.atan2(Math.sin(dy),Math.cos(dy)); f.yaw+=dy*Math.min(1,dt*22); f.pitch=lerp(f.pitch,pitch,Math.min(1,dt*22));
  f.onGround=!!(s.fl&2); if(s.fl&1){ f.dashT=0.05; f.dashDir.set(-Math.sin(f.yaw),0,-Math.cos(f.yaw)); if(Math.random()<0.3) ghostAt(f.center(),f.team.light); } else f.dashT=0;
  if(NET.role==='host'&&state==='fight'&&!f.dead&&(f.pos.y<CFG.killY||Math.abs(f.pos.x)>HX+28||Math.abs(f.pos.z)>HZ+28)){ f.invulnT=0; fatal(f,f.lastHitBy,'fall'); } }
// ---------- UI ----------
function lobbyRender(){ const el=$id('olSeats'); if(!el) return; const kind=NET.on?NET.kind:(['ffa','2v2'].includes(settings.gm)?settings.gm:'1v1'); const multi=kind!=='1v1', two=kind==='2v2';
  $id('olHead').textContent=kind==='ffa'?'Play online · free for all (3-4)':two?'Play online · 2v2':'Play online · 1v1';
  const host=NET.on&&NET.role==='host', me=NET.on?myPeerId():null; const K=NET.kind; NET.kind=kind;
  const seat=(st,i)=>`<div class="ol-seat" style="--c:${seatTeam(i).css}"><i></i><span>${esc(st.n)}${st.p===me?' (you)':''}${st.b?' <em>bot</em>':''}${i===0?' <em>host</em>':''}${two?` <em>${i%2?'orange':'blue'}</em>`:''}</span></div>`;
  const empty=i=>`<div class="ol-seat empty"${two?` style="--c:${seatTeam(i).css}"`:''}><i></i><span>${two?(i%2?'Orange':'Blue')+' seat':'Empty seat'}</span></div>`;
  el.innerHTML=NET.on? NET.seats.map(seat).join('')+(multi&&!NET.started?Array.from({length:Math.max(0,4-NET.seats.length)},(_,k)=>empty(NET.seats.length+k)).join(''):'') : '';
  NET.kind=K;
  const hb=$id('olHostBtns'); hb.style.display=host&&multi&&!NET.started?'':'none'; const need=two?4:3;
  $id('olAddBot').disabled=NET.seats.length>=4; $id('olDelBot').disabled=!NET.seats.some(st=>st.b); $id('olStart').disabled=NET.seats.length<need;
  $id('olCancel').textContent=host?'CLOSE ROOM':'LEAVE ROOM';
  const n=NET.seats.length; $id('olStatus').textContent=!NET.on?'':NET.started?'Match in progress':host? (multi? (n<need?`Waiting for players… (${n}/4). ${two?'2v2 needs 4':'You need 3'} to start, so add a bot or wait.`:`${n} players ready. Press START when everyone's in.`) : (n<2?'Waiting for your rival to join…':'Rival joined! Starting…')) : (multi?`${n} in the room. Waiting for the host to start…`:'Get ready…');
  const nm=$id('olName'); if(nm&&document.activeElement!==nm) nm.value=settings.name||''; }
$id('onlineBtn').addEventListener('click',()=>{ SFX.unlock(); const p=$id('online'); p.classList.toggle('open'); if(p.classList.contains('open')){ olView(NET.on&&NET.seated?'wait':'main'); lobbyRender(); getRoomApi().then(a=>{ if(!a) olMsg('Online play is not available in this browser.',true); }); } });
function newCode(){ let c=''; for(let i=0;i<5;i++) c+=NET_ALPHA[Math.floor(Math.random()*NET_ALPHA.length)]; return c; }
$id('olCreate').addEventListener('click',()=>{ SFX.unlock(); if(NET.on) return; netOpen(newCode(),'host'); });
const codeIn=$id('olCode'); codeIn.addEventListener('input',()=>{ codeIn.value=codeIn.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,5); });
const doJoin=()=>{ SFX.unlock(); if(NET.on) return; const c=codeIn.value.trim().toUpperCase(); if(!/^[A-Z0-9]{5}$/.test(c)){ olMsg('Type the 5-character room code.',true); return; } netOpen(c,'guest'); };
$id('olJoin').addEventListener('click',doJoin); codeIn.addEventListener('keydown',e=>{ e.stopPropagation(); if(e.key==='Enter') doJoin(); });
const nameIn=$id('olName'); nameIn.addEventListener('keydown',e=>e.stopPropagation()); nameIn.addEventListener('input',()=>{ settings.name=cleanName(nameIn.value)==='Player'&&!nameIn.value.trim()?'':nameIn.value.replace(/[<>&"'`]/g,'').slice(0,14); saveSettings(); if(NET.on&&NET.role==='host'&&NET.seats[0]) NET.seats[0].n=myName(); if(state==='menu'&&settings.gm!=='1v1') player.name=myName(); });
$id('olAddBot').addEventListener('click',()=>{ if(!NET.on||NET.role!=='host'||NET.started||NET.seats.length>=4) return; const used=new Set(NET.seats.map(s=>s.n)); const n=BOT_NAMES.find(x=>!used.has(x))||'Bot'; NET.seats.push({p:'bot'+Math.random().toString(36).slice(2,7),n,b:true}); lobbyRender(); SFX.hover(); });
$id('olDelBot').addEventListener('click',()=>{ if(!NET.on||NET.role!=='host'||NET.started) return; for(let i=NET.seats.length-1;i>0;i--) if(NET.seats[i].b){ NET.seats.splice(i,1); break; } lobbyRender(); });
$id('olStart').addEventListener('click',()=>{ SFX.unlock(); if(!NET.on||NET.role!=='host'||NET.started||NET.seats.length<seatsNeeded()) return; requestLock(); netHostStart(); });
$id('olCopy').addEventListener('click',()=>{ try{ navigator.clipboard.writeText(NET.code).then(()=>olMsg('Code copied.'),()=>olMsg('Copy failed. Read it out instead: '+NET.code)); }catch(e){ olMsg('Copy failed. Read it out instead: '+NET.code); } });
// invite links: ?room=CODE opens the game straight into that room
const canLink=(()=>{ try{ return window.top===window&&/^https?:$/.test(location.protocol); }catch(e){ return false; } })();
if(!canLink) $id('olLink').style.display='none';
function inviteLink(){ const u=new URL(location.href); u.hash=''; u.search=''; const q=new URLSearchParams(location.search); for(const k of ['server','peer']) if(q.get(k)) u.searchParams.set(k,q.get(k)); u.searchParams.set('room',NET.code); return u.toString(); }
$id('olLink').addEventListener('click',()=>{ if(!NET.on) return; const L=inviteLink(); try{ navigator.clipboard.writeText(L).then(()=>olMsg('Invite link copied. Send it to your mates and they land right in your room.'),()=>olMsg('Copy failed. Share this: '+L)); }catch(e){ olMsg('Copy failed. Share this: '+L); } });
(()=>{ let c=null; try{ c=new URLSearchParams(location.search).get('room'); }catch(e){} if(!c||!/^[A-Za-z0-9]{5}$/.test(c)) return; c=c.toUpperCase();
  try{ const u=new URL(location.href); u.searchParams.delete('room'); history.replaceState(null,'',u.pathname+u.search+u.hash); }catch(e){}
  setTimeout(()=>{ const p=$id('online'); if(!p.classList.contains('open')) p.classList.add('open'); olView('main'); codeIn.value=c; olMsg('Joining room '+c+'…'); doJoin(); },400); })();
$id('olCancel').addEventListener('click',()=>{ netLeave(); olView('main'); olMsg(''); });
netReset();
