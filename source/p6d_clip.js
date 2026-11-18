// ================= CLIPS: an always-on replay buffer =================
// While you play, the last ~22s of the game view are kept as compressed video (WebCodecs, hardware encoder when there is one)
// and the game sound as raw samples. Press C (or the clip button) and the last 20 seconds are packed into an .mp4 straight away.
// Pauses, card picks and the menu are cut out, so a clip is always 20s of actual fighting.
const CLIP=(()=>{
  const LEN=20, KEEP=21.5, FPS=30;
  const OK=typeof VideoEncoder==='function'&&typeof VideoFrame==='function'&&typeof EncodedVideoChunk==='function'&&typeof Mp4Muxer!=='undefined';
  let enc=null, kind='', decCfg=null, W=0, H=0, bitrate=0, starting=false, dead=!OK;
  const cv=document.createElement('canvas'); let cx=null;
  let chunks=[], achunks=[], segs=[], live=false, rec=0, lastCapR=-1, lastKeyR=-99, minTs=0, nCap=0, needReset=false;
  let clock=()=>performance.now()/1000, actx=null, tapNode=null, tapTried=false, sr=48000;
  let busy=false, aKind=null, aCodec=null, aenc=null, aDecCfg=null, aNext=null; const clips=[];
  const btn=document.getElementById('clipBtn'), tBtn=document.getElementById('tClip'), flashEl=document.getElementById('clipFlash');

  const wanted=()=>settings.clips&&!paused&&(state==='fight'||state==='countdown'||state==='roundover')&&document.visibilityState==='visible';
  function sizeFor(){ const dpr=Math.min(2,window.devicePixelRatio||1), iw=window.innerWidth*dpr, ih=window.innerHeight*dpr;
    const L=(GPU_WEAK||settings.quality==='low')?960:1280, S=L*0.5625; const k=Math.min(1,L/Math.max(iw,ih),S/Math.min(iw,ih));
    return [Math.max(2,Math.round(iw*k/2)*2), Math.max(2,Math.round(ih*k/2)*2)]; }
  function setUI(){ const on=OK&&settings.clips; if(btn){ btn.style.display=on&&!TOUCH.on?'':'none'; btn.classList.toggle('live',live); btn.classList.toggle('busy',busy); } if(tBtn) tBtn.classList.toggle('off',!on); }

  // ---- encoder ----
  async function start(){ if(starting||enc||dead) return; starting=true;
    try{ [W,H]=sizeFor(); cv.width=W; cv.height=H; cx=cv.getContext('2d',{alpha:false}); bitrate=W*H>700000?6e6:3.5e6;
      const tries=[['avc1.42E01F','avc'],['avc1.4D401F','avc'],['avc1.640028','avc'],['vp09.00.31.08','vp9'],['av01.0.05M.08','av1']];
      let cfg=null;
      for(const [codec,k] of tries){ const c={codec,width:W,height:H,bitrate,framerate:FPS,latencyMode:'realtime'}; if(k==='avc') c.avc={format:'avc'};
        try{ const s=await VideoEncoder.isConfigSupported(c); if(s&&s.supported){ cfg=c; kind=k; break; } }catch(e){} }
      if(!cfg){ dead=true; setUI(); return; }
      enc=new VideoEncoder({ output:(ch,meta)=>{ if(meta&&meta.decoderConfig) decCfg=meta.decoderConfig; if(ch.timestamp<minTs) return; if(!chunks.length&&ch.type!=='key') return; chunks.push(ch); prune(); },
        error:e=>{ console.warn('clip encoder',e); stop(); dead=true; setUI(); } });
      enc.configure(cfg); lastKeyR=-99; await tap();
    }catch(e){ console.warn('clip start',e); dead=true; enc=null; }
    finally{ starting=false; setUI(); } }
  function stop(){ try{ if(enc&&enc.state!=='closed') enc.close(); }catch(e){} enc=null; decCfg=null; chunks=[]; segs=[]; live=false; stopAudio(); setUI(); }
  function reset(){ minTs=Math.round((rec+0.5)*1e6); rec+=0.5; chunks=[]; segs=[]; lastKeyR=-99; stopAudio(); startAudio(); }
  function prune(){ if(!chunks.length) return; const cut=chunks[chunks.length-1].timestamp-KEEP*1e6; let k=0;
    for(let i=1;i<chunks.length&&chunks[i].timestamp<=cut;i++) if(chunks[i].type==='key') k=i;
    if(k>0) chunks.splice(0,k); const a0=chunks[0].timestamp-3e5; let j=0; while(j<achunks.length&&achunks[j].timestamp<a0) j++; if(j) achunks.splice(0,j); }

  // ---- game sound: a tiny AudioWorklet copies the mixed sound effects into a buffer, stamped with the audio clock ----
  async function tap(){ if(tapTried) return; tapTried=true; const t=SFX.tap&&SFX.tap(); if(!t||!t.ctx.audioWorklet||t.ctx.state!=='running'){ tapTried=false; return; }
    try{ const code="registerProcessor('clip-tap',class extends AudioWorkletProcessor{constructor(){super();this.n=0;this.f0=0;this.a=new Float32Array(4096);this.b=new Float32Array(4096);}process(i){const x=i[0];if(x&&x.length){const L=x[0],R=x[1]||x[0];if(!this.n)this.f0=currentFrame;this.a.set(L,this.n);this.b.set(R,this.n);this.n+=L.length;if(this.n>=4096){this.port.postMessage({f:this.f0,l:this.a,r:this.b},[this.a.buffer,this.b.buffer]);this.a=new Float32Array(4096);this.b=new Float32Array(4096);this.n=0;}}return true;}})";
      const url=URL.createObjectURL(new Blob([code],{type:'application/javascript'})); await t.ctx.audioWorklet.addModule(url); URL.revokeObjectURL(url);
      tapNode=new AudioWorkletNode(t.ctx,'clip-tap',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1]}); const z=t.ctx.createGain(); z.gain.value=0;
      t.node.connect(tapNode); tapNode.connect(z); z.connect(t.ctx.destination); tapNode.port.onmessage=e=>onPCM(e.data);
      actx=t.ctx; sr=actx.sampleRate; clock=()=>actx.currentTime; segs=[]; live=false; /* switched clocks: start a fresh stretch */ await startAudio();
    }catch(e){ tapNode=null; actx=null; /* no audio worklet here (e.g. opened as a local file): clips stay silent */ } }
  function untap(){ try{ if(tapNode){ tapNode.port.onmessage=null; tapNode.disconnect(); const t=SFX.tap&&SFX.tap(); if(t) t.node.disconnect(tapNode); } }catch(e){} tapNode=null; actx=null; tapTried=false; stopAudio(); clock=()=>performance.now()/1000; }
  function onPCM(d){ if(!enc) return; const n=d.l.length, t0=d.f/sr, t1=t0+n/sr;
    for(const s of segs){ const c1=s.c1===null?Infinity:s.c1; if(t1<=s.c0||t0>=c1) continue;
      const a=Math.max(0,Math.round((s.c0-t0)*sr)), b=Math.min(n,Math.round((c1-t0)*sr)); if(b<=a) continue;
      feed(s.r0+(t0+a/sr-s.c0), d.l.subarray(a,b), d.r.subarray(a,b)); } }
  // the sound is compressed as it comes in (a few small packets a frame), so saving a clip never has a big job to do
  async function startAudio(){ if(!actx||aenc||typeof AudioEncoder!=='function'||typeof AudioData!=='function') return;
    if(aKind===null){ aKind=''; for(const [codec,k] of [['mp4a.40.2','aac'],['opus','opus']]){ try{ const s=await AudioEncoder.isConfigSupported({codec,sampleRate:sr,numberOfChannels:2,bitrate:128000}); if(s&&s.supported){ aKind=k; aCodec=codec; break; } }catch(e){} } }
    if(!aKind||aenc||!actx) return;
    try{ const a=new AudioEncoder({ output:(c,m)=>{ if(a!==aenc) return; if(m&&m.decoderConfig) aDecCfg=m.decoderConfig; if(c.timestamp<minTs) return; achunks.push(c); },
        error:e=>{ console.warn('clip audio',e); if(a===aenc) stopAudio(); } });
      a.configure({codec:aCodec,sampleRate:sr,numberOfChannels:2,bitrate:128000}); aenc=a; aNext=null; }catch(e){ aenc=null; } }
  function stopAudio(){ const a=aenc; aenc=null; aDecCfg=null; achunks=[]; aNext=null; try{ if(a&&a.state!=='closed') a.close(); }catch(e){} }
  function feed(t,L,R){ if(!aenc||aenc.state!=='configured') return; if(aNext===null) aNext=t;
    let off=Math.round((t-aNext)*sr);
    if(off>sr*2){ aNext=t; off=0; }
    while(off>0){ const n=Math.min(off,4096); enc1(new Float32Array(n),new Float32Array(n)); off-=n; }   /* small gap: fill with silence so the sound never drifts */
    if(off<0){ L=L.subarray(-off); R=R.subarray(-off); }                                               /* small overlap: drop it */
    if(L.length) enc1(L,R); }
  function enc1(L,R){ const n=L.length, buf=new Float32Array(n*2); buf.set(L,0); buf.set(R,n);
    try{ const ad=new AudioData({format:'f32-planar',sampleRate:sr,numberOfFrames:n,numberOfChannels:2,timestamp:Math.round(aNext*1e6),data:buf}); aenc.encode(ad); ad.close(); }catch(e){}
    aNext+=n/sr; }

  // ---- overlay drawn into every clip frame: both health bars, the round, and the site name ----
  function rr(x,y,w,h,r){ cx.beginPath(); cx.moveTo(x+r,y); cx.arcTo(x+w,y,x+w,y+h,r); cx.arcTo(x+w,y+h,x,y+h,r); cx.arcTo(x,y+h,x,y,r); cx.arcTo(x,y,x+w,y,r); cx.closePath(); }
  function bar(x,y,w,h,f,col,name,right){ const k=clamp(f.hp/Math.max(1,f.maxHp()),0,1);
    cx.fillStyle='rgba(20,8,31,.72)'; rr(x,y,w,h,h/2); cx.fill(); cx.fillStyle=col; if(k>0){ const ww=Math.max(h,w*k); rr(right?x+w-ww:x,y,ww,h,h/2); cx.fill(); }
    cx.font=`${Math.round(h*1.15)}px "Bungee","Lilita One",Impact,sans-serif`; cx.textAlign=right?'right':'left'; cx.textBaseline='bottom'; cx.lineWidth=Math.max(2,h*0.28); cx.strokeStyle='#14081f'; cx.fillStyle='#fff';
    const tx=right?x+w-h*0.2:x+h*0.2; cx.strokeText(name,tx,y-h*0.25); cx.fillText(name,tx,y-h*0.25); }
  function overlay(){ const u=H/720, m=18*u, bh=Math.round(14*u), bw=Math.round(Math.min(W*0.3,300*u)); cx.save();
    if(state==='fight'||state==='countdown'||state==='roundover'){
      bar(m,m+22*u,bw,bh,player,'#19c8ff',(player.name||'YOU').toUpperCase(),false);
      if(matchKind==='1v1'||mode==='sandbox'){ if(bot&&bot.mesh&&fighters.includes(bot)) bar(W-m-bw,m+22*u,bw,bh,bot,'#ff7a1a',(bot.name||'BOT').toUpperCase(),true);
        if(mode!=='sandbox'){ const s=`${score.player} – ${score.bot}`; cx.font=`${Math.round(26*u)}px "Bungee","Lilita One",Impact,sans-serif`; cx.textAlign='center'; cx.textBaseline='top'; cx.lineWidth=5*u; cx.strokeStyle='#14081f'; cx.fillStyle='#fff'; cx.strokeText(s,W/2,m); cx.fillText(s,W/2,m);
          cx.font=`${Math.round(13*u)}px "Bungee","Lilita One",Impact,sans-serif`; cx.lineWidth=4*u; const r='ROUND '+roundNum; cx.strokeText(r,W/2,m+30*u); cx.fillStyle='#ffd23d'; cx.fillText(r,W/2,m+30*u); } } }
    cx.textAlign='left'; cx.textBaseline='alphabetic'; cx.globalAlpha=0.92; cx.font=`${Math.round(26*u)}px "Bungee","Lilita One",Impact,sans-serif`; cx.lineWidth=5*u; cx.strokeStyle='#14081f';
    const y=H-m-20*u; cx.strokeText('DOME ROUNDS',m,y); cx.fillStyle='#fff'; cx.fillText('DOME ROUNDS',m,y);
    cx.font=`700 ${Math.round(16*u)}px system-ui,"Segoe UI",sans-serif`; cx.lineWidth=4*u; cx.strokeText('dome-rounds.pages.dev',m+1*u,y+20*u); cx.fillStyle='#35e9ff'; cx.fillText('dome-rounds.pages.dev',m+1*u,y+20*u);
    cx.restore(); }

  // ---- called right after each frame is drawn ----
  let tFrame=0;
  function frame(ph){ if(ph===0){ tFrame=clock(); return; } /* time the frame's game step began: the sounds it starts are stamped with the same clock */
    if(dead) return; if(state==='menu') needReset=true;
    if(!wanted()){ if(live){ live=false; const s=segs[segs.length-1]; if(s&&s.c1===null) s.c1=clock(); setUI(); } return; }
    if(!enc){ start(); return; }
    if(needReset){ needReset=false; reset(); if(!actx) tap(); }
    const t=tFrame||clock();
    if(!live){ live=true; segs.push({c0:t,r0:rec+1/FPS,c1:null}); if(segs.length>6) segs.shift(); setUI(); }
    const s=segs[segs.length-1], r=s.r0+(t-s.c0);
    if(r-lastCapR<1/FPS-0.004||r<=rec) return;
    if(enc.encodeQueueSize>3) return;                                  // the encoder is behind: skip a frame rather than slow the game down
    if((++nCap)%60===0){ const [w,h]=sizeFor(); if(Math.abs(w/h-W/H)>0.02){ stop(); return; } }
    try{ cx.drawImage(renderer.domElement,0,0,W,H); overlay();
      const vf=new VideoFrame(cv,{timestamp:Math.round(r*1e6),duration:Math.round(1e6/FPS)}); const key=r-lastKeyR>=1; enc.encode(vf,{keyFrame:key}); vf.close();
      if(key) lastKeyR=r; lastCapR=r; rec=r;
    }catch(e){ console.warn('clip frame',e); stop(); dead=true; setUI(); } }

  // ---- pack the last 20 seconds into an .mp4 ----
  async function save(){ if(!OK||!settings.clips) return; if(busy) return;
    if(!enc||!decCfg||chunks.length<2||chunks[chunks.length-1].timestamp-chunks[0].timestamp<1e6){ toast('Play a few seconds first, then clip it'); return; }
    busy=true; setUI(); shutter();
    try{ const last=chunks[chunks.length-1].timestamp, from=last-LEN*1e6; let k=0; for(let i=0;i<chunks.length;i++) if(chunks[i].type==='key'&&chunks[i].timestamp<=from+5e4) k=i;
      let t0=chunks[k].timestamp, as=aDecCfg?achunks.filter(c=>c.timestamp>=t0&&c.timestamp<=last+5e4):[];
      if(as.length&&as[0].timestamp-t0>3e4){ /* the sound starts late (it was still warming up): start the clip at the next key frame after it, so picture and sound stay in sync */
        let k2=-1; for(let i=k;i<chunks.length;i++) if(chunks[i].type==='key'&&chunks[i].timestamp>=as[0].timestamp){ k2=i; break; }
        if(k2>=0&&last-chunks[k2].timestamp>=2e6){ k=k2; t0=chunks[k].timestamp; as=as.filter(c=>c.timestamp>=t0); } else as=[]; }
      const vs=chunks.slice(k), dur=(last-t0)/1e6+1/FPS, au=as.length>2;
      const target=new Mp4Muxer.ArrayBufferTarget();
      const mux=new Mp4Muxer.Muxer({target, video:{codec:kind,width:W,height:H}, audio:au?{codec:aKind,numberOfChannels:2,sampleRate:sr}:undefined, fastStart:'in-memory', firstTimestampBehavior:'cross-track-offset'});
      vs.forEach((c,i)=>{ const d=new Uint8Array(c.byteLength); c.copyTo(d); const nx=vs[i+1]; mux.addVideoChunkRaw(d,c.type,c.timestamp-t0,nx?nx.timestamp-c.timestamp:Math.round(1e6/FPS),i===0?{decoderConfig:decCfg}:undefined); });
      if(au) as.forEach((c,i)=>{ const d=new Uint8Array(c.byteLength); c.copyTo(d); const nx=as[i+1]; mux.addAudioChunkRaw(d,c.type,c.timestamp-t0,nx?nx.timestamp-c.timestamp:(c.duration||2e4),i===0?{decoderConfig:aDecCfg}:undefined); });
      mux.finalize(); const blob=new Blob([target.buffer],{type:'video/mp4'});
      const d=new Date(), p=v=>String(v).padStart(2,'0'); const name=`dome-rounds-clip-${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.mp4`;
      clips.unshift({url:URL.createObjectURL(blob),blob,name,dur}); while(clips.length>6) URL.revokeObjectURL(clips.pop().url);
      renderLists();
      if(!TOUCH.on){ download(clips[0]); toast('<b>CLIP SAVED</b> · last '+Math.min(LEN,Math.round(dur))+'s, check your downloads','you'); }
      else toast('<b>CLIP SAVED</b> · pause to share it','you');
      try{ SFX.confirm(); }catch(e){}
    }catch(e){ console.warn('clip save',e); toast('Could not save that clip'); }
    finally{ busy=false; setUI(); } }
  function download(c){ const a=document.createElement('a'); a.href=c.url; a.download=c.name; document.body.appendChild(a); a.click(); a.remove(); }
  async function share(c){ try{ const f=new File([c.blob],c.name,{type:'video/mp4'}); if(navigator.canShare&&navigator.canShare({files:[f]})){ await navigator.share({files:[f],title:'Dome Rounds clip',text:'dome-rounds.pages.dev'}); return; } }catch(e){ if(e&&e.name==='AbortError') return; } download(c); }
  function shutter(){ if(!flashEl) return; flashEl.classList.remove('go'); void flashEl.offsetWidth; flashEl.classList.add('go'); }

  // ---- clip lists (pause menu + match over screen) ----
  function renderLists(){ for(const el of document.querySelectorAll('.clipList')){
      if(!OK){ el.innerHTML='<p class="clipNote">Clips need a newer browser (Chrome, Edge, Safari 17 or Firefox 130 and up).</p>'; continue; }
      if(!settings.clips){ el.innerHTML='<p class="clipNote">The clip recorder is off. Turn it on in settings.</p>'; continue; }
      const how=TOUCH.on?'Tap the clip button':'Press <kbd>C</kbd>';
      el.innerHTML=(clips.length?'':`<p class="clipNote">${how} during a fight to save the last 20 seconds.</p>`)+clips.map((c,i)=>`<div class="clipItem"><video src="${c.url}" muted playsinline preload="metadata" controls></video><div class="cb"><b>${Math.round(c.dur)}s clip</b><button class="btn sec" type="button" data-cs="${i}">SHARE</button><button class="btn sec" type="button" data-cd="${i}">SAVE</button></div></div>`).join('')
        +(state==='fight'||state==='countdown'||state==='roundover'?`<button class="btn sec clipNow" type="button">SAVE LAST 20s</button>`:''); } }
  document.addEventListener('click',e=>{ const t=e.target.closest&&e.target.closest('[data-cs],[data-cd],.clipNow,#clipBtn'); if(!t) return;
    if(t.dataset.cs!==undefined){ const c=clips[+t.dataset.cs]; if(c) share(c); }
    else if(t.dataset.cd!==undefined){ const c=clips[+t.dataset.cd]; if(c) download(c); }
    else save().then(renderLists); });
  window.addEventListener('keydown',e=>{ if(e.code!=='KeyC'||e.repeat||e.ctrlKey||e.metaKey||e.altKey) return; const tg=e.target&&e.target.tagName; if(tg==='INPUT'||tg==='TEXTAREA'||tg==='SELECT') return; if(state==='menu') return; save(); });
  setUI(); renderLists();
  return { frame, save, setUI, renderLists, setOn:v=>{ if(!v){ stop(); untap(); } setUI(); renderLists(); }, get ok(){ return OK&&!dead; }, info:()=>({a0:achunks[0]&&achunks[0].timestamp,aN:achunks.length&&achunks[achunks.length-1].timestamp,busy,OK,dead,kind,aKind,W,H,live,rec,chunks:chunks.length,ach:achunks.length,clips:clips.length,audio:!!actx,first:chunks[0]&&chunks[0].timestamp,last:chunks.length&&chunks[chunks.length-1].timestamp}), last:()=>clips[0] };
})();
clipHook=CLIP.frame; clipLists=CLIP.renderLists; clipSave=CLIP.save; clipSet=CLIP.setOn;
/*DEBUG-START*/window.__clip=CLIP;/*DEBUG-END*/
