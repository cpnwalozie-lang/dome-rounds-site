// ================= BACKGROUND MODELS =================
// Kenney's CC0 game kits (buildings, trees, fountain, truck) dress the far shore and the cargo pier.
// They load once from the embedded files and are cloned wherever they're placed.
const KEN={ ready:false, proto:{}, queue:[] };
(async function(){ try{
  const parse=(b64,pal)=>new Promise((res,rej)=>{ const mgr=new T.LoadingManager(); mgr.setURLModifier(u=>/\.png$/i.test(u)?KENNEY.pal[pal]:u); const L=new THREE.GLTFLoader(mgr);
    const bin=atob(b64), buf=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) buf[i]=bin.charCodeAt(i); L.parse(buf.buffer,'',g=>res(g.scene),rej); });
  for(const k in KENNEY.models){ const m=KENNEY.models[k]; const s=await parse(m.glb,m.pal);
    s.traverse(o=>{ if(o.isMesh){ o.castShadow=false; o.receiveShadow=false; for(const mt of [].concat(o.material)){ mt.userData.noDetail=true; if(mt.map) mt.map.anisotropy=4; } } }); KEN.proto[k]=s; }
  KEN.ready=true; for(const q of KEN.queue.splice(0)) kenPlace(q);
}catch(e){ console.warn('background models unavailable',e); } })();
function kenPlace(p){ if(!KEN.ready){ KEN.queue.push(p); return; } const src=KEN.proto[p.name]; if(!src) return; const o=src.clone(); o.position.set(p.x,p.y,p.z); o.rotation.y=p.ry||0; o.scale.setScalar(p.s||1); if(p.shadow) o.traverse(c=>{ if(c.isMesh) c.castShadow=true; }); p.group.add(o); }
