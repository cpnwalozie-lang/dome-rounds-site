// ================= SURFACE DETAIL =================
// Original seamless bump + shine maps (made for this game) layered on top of every surface's own colours:
// concrete grain and hairline cracks, worn paint with scratches and chips, wood grain, riveted panels.
const DET={ ready:false, sets:{}, pending:[] };
const DET_STYLE={ concrete:{n:0.55,rough:1}, wood:{n:0.6,rough:1}, paint:{n:0.28,rough:1}, panel:{n:0.6,rough:1}, glow:{n:0.3,set:'paint',rough:0} };
(function(){ let left=0; for(const k in DETAIL_SRC){ DET.sets[k]={}; for(const c of ['n','r']){ left++; const img=new Image();
  img.onload=()=>{ const t=new T.Texture(img); t.wrapS=t.wrapT=T.RepeatWrapping; t.anisotropy=4; if(k==='paint') t.repeat.set(4,4); t.needsUpdate=true; DET.sets[k][c]=t; if(--left===0){ DET.ready=true; const p=DET.pending.splice(0); for(const g of p) detailApply(g); } };
  img.src=DETAIL_SRC[k][c]; } } })();
function detailKind(m){ if(!m||!m.isMeshStandardMaterial||m.isShaderMaterial||m.transparent||m.side===T.DoubleSide||m.normalMap||m.userData.noDetail) return null;
  const mp=m.map;
  if(mp){ if(mp===TX.concrete||mp===TX.dock||mp===TX.block) return 'concrete'; if(mp===TX.wood||mp===TX.crate||mp===TX.crateB||mp===TX.crateO) return 'wood'; return m.emissiveMap?'glow':'paint'; }
  if(m.emissive&&m.emissiveIntensity>0.3&&m.emissive.getHex()!==0) return null;
  return m.metalness>0.3?'panel':'paint'; }
function detailApply(group){ if(!group) return; if(!DET.ready){ DET.pending.push(group); return; } const seen=new Set(); const wasOn=detailOn; if(!wasOn) detailOn=true;
  group.traverse(o=>{ if(!o.isMesh) return;
    if(!Array.isArray(o.material)&&!o.material.map&&detailKind(o.material)){ if(!o.geometry.boundingBox) o.geometry.computeBoundingBox(); const sz=o.geometry.boundingBox.getSize(new T.Vector3()).multiply(o.getWorldScale(new T.Vector3())); if(Math.max(sz.x,sz.y,sz.z)>3.2){ const c=o.material.clone(); c.userData.noDetail=true; if(o.material.onBeforeCompile) c.onBeforeCompile=o.material.onBeforeCompile; o.material=c; } }
    for(const m of (Array.isArray(o.material)?o.material:[o.material])){ if(seen.has(m)) continue; seen.add(m); const k=detailKind(m); if(!k) continue; const st=DET_STYLE[k], set=DET.sets[st.set||k];
    m.normalMap=set.n; m.normalScale=new T.Vector2(st.n,st.n); if(st.rough){ m.roughnessMap=set.r; m.roughness=st.rough; } m.userData.detail=k; m.needsUpdate=true; } }); if(!wasOn){ detailOn=true; detailSetOn(false); } }
// Low quality skips the detail maps (slow laptops); higher settings put them back.
let detailOn=true;
function detailSetOn(on){ if(on===detailOn) return; detailOn=on; for(const k in MAPS){ const g=MAPS[k].group; if(!g) continue; g.traverse(o=>{ if(!o.isMesh) return; for(const m of [].concat(o.material)){ const u=m.userData; if(!u.detail) continue;
  if(!on&&m.normalMap){ u._n=m.normalMap; u._r=m.roughnessMap; u._rv=m.roughness; m.normalMap=null; m.roughnessMap=null; m.roughness=0.75; m.needsUpdate=true; }
  else if(on&&u._n){ m.normalMap=u._n; m.roughnessMap=u._r; m.roughness=u._rv; m.needsUpdate=true; } } }); } }
