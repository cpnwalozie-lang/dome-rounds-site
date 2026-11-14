// ================= LOOK: environment light, reflections, colour grade =================
// Each map's own sky + buildings are captured once into a light probe (PMREM), so every surface picks up
// light and reflections from what's actually around it. Water and the Neon rooftop get real mirrored
// reflections on High/Ultra, and a final grade pass adds contrast, colour and a soft vignette.
const LOOK={ q:'high', env:{}, pmrem:null, grade:null, mirrors:[] };
const LOOK_MAP={
  dock:{ exp:1.0, envI:1.0, hemi:0.4, sun:1.3, grade:{sat:1.12,con:0.26,vig:0.32,warm:[1.03,1.0,0.96],cool:[0.94,0.98,1.06]} },
  neon:{ exp:1.10, envI:1.35, hemi:0.55, sun:1.0,  grade:{sat:1.16,con:0.2,vig:0.42,warm:[1.04,0.98,1.03],cool:[0.92,0.96,1.1]} } };
renderer.toneMapping=T.ACESFilmicToneMapping; renderer.toneMappingExposure=1.0;
// Lights, signs and glow sprites keep their full colour: only lit surfaces go through the film curve.
function lookUntone(root){ root.traverse(o=>{ for(const m of [].concat(o.material||[])){ if(m&&(m.isMeshBasicMaterial||m.isSpriteMaterial||m.isPointsMaterial||m.isLineBasicMaterial)) m.toneMapped=false; } }); }

// ---- light probe from the map itself ----
function lookEnv(id,force){ if(LOOK.env[id]&&!force) return LOOK.env[id]; const m=MAPS[id]; if(!m||!m.group) return null;
  try{ if(!LOOK.pmrem){ LOOK.pmrem=new T.PMREMGenerator(renderer); LOOK.pmrem.compileCubemapShader(); }
    const hidden=[]; for(const o of scene.children){ if(o!==m.group&&!o.isLight&&o.visible){ hidden.push(o); o.visible=false; } }
    const gv=m.group.visible; m.group.visible=true; const py=m.group.position.y; m.group.position.y=py-2.6; m.group.updateMatrixWorld(true);
    const skies=[], glass=[]; m.group.traverse(o=>{ if(!o.visible) return; if(o.isMesh&&o.material&&o.material.isShaderMaterial&&o.material.side===T.BackSide){ skies.push([o,o.position.clone()]); o.position.set(0,0,0); }
      else if(o.isSprite&&o.scale.x>12){ glass.push(o); o.visible=false; } });
    if(!LOOK.cube){ const hf=renderer.capabilities.isWebGL2; LOOK.cube=new T.WebGLCubeRenderTarget(256,{type:hf?T.HalfFloatType:T.UnsignedByteType,format:T.RGBAFormat,generateMipmaps:false,minFilter:T.LinearFilter,magFilter:T.LinearFilter}); LOOK.cubeCam=new T.CubeCamera(0.1,1600,LOOK.cube); }
    const tmo=renderer.toneMapping; renderer.toneMapping=T.NoToneMapping; LOOK.cubeCam.position.set(0,0,0); LOOK.cubeCam.updateMatrixWorld(true); LOOK.cubeCam.update(renderer,scene); renderer.toneMapping=tmo;
    const old=LOOK.env[id]; const rt=LOOK.pmrem.fromCubemap(LOOK.cube.texture); if(old&&old!==rt.texture) old.dispose();
    for(const [o,p] of skies) o.position.copy(p); for(const o of glass) o.visible=true; m.group.position.y=py; m.group.visible=gv; m.group.updateMatrixWorld(true); for(const o of hidden) o.visible=true;
    LOOK.env[id]=rt.texture; return rt.texture; }catch(e){ console.warn('env light off',e); return null; } }

// ---- surface tuning: what each material is made of ----
function lookTune(root,id){ const L=LOOK_MAP[id]||LOOK_MAP.dock; const seen=new Set();
  const isTx=(mp,...k)=>k.some(n=>TX[n]&&(TX[n]===mp||(TX[n].side===mp||TX[n].end===mp||TX[n].top===mp)));
  root.traverse(o=>{ if(!o.isMesh) return; for(const m of [].concat(o.material)){ if(!m||seen.has(m)||!m.isMeshStandardMaterial) continue; seen.add(m); const u=m.userData; if(u.look) continue; u.look=1;
    let k=1; const mp=m.map;
    if(mp&&isTx(mp,'container')){ m.metalness=Math.max(m.metalness,0.45); m.roughness=Math.min(m.roughness,0.52); k=1.15; }
    else if(mp&&(mp===TX.wood||mp===TX.crate||mp===TX.crateB||mp===TX.crateO)){ m.roughness=Math.max(m.roughness,0.82); k=0.8; }
    else if(mp&&(mp===TX.concrete||mp===TX.dock||mp===TX.block||mp===TX.floor)){ k=0.95; }
    else if(!mp&&m.metalness>=0.3){ m.roughness=Math.min(m.roughness,0.45); k=1.2; }
    else if(!mp&&m.color&&m.roughness>0.7&&!u.noDetail){ m.roughness=0.62; }
    if(m.transparent&&m.opacity<0.5){ m.roughness=Math.min(m.roughness,0.15); k=1.6; }
    m.envMapIntensity=L.envI*k; m.needsUpdate=true; } }); }

// ---- planar mirror (water + wet floor) ----
function lookMirror(mesh,res){ const rt=new T.WebGLRenderTarget(16,16,{minFilter:T.LinearFilter,magFilter:T.LinearFilter,format:T.RGBFormat}); rt.texture.generateMipmaps=false;
  const vc=new T.PerspectiveCamera(), tm=new T.Matrix4(), N=new T.Vector3(), P=new T.Vector3(), C=new T.Vector3(), view=new T.Vector3(), look=new T.Vector3(), tgt=new T.Vector3(), rot=new T.Matrix4(), plane=new T.Plane(), clip=new T.Vector4(), q=new T.Vector4();
  const mr={ mesh, rt, tm, on:false, res, busy:false };
  mesh.onBeforeRender=(r,sc,cam)=>{ if(!mr.on||mr.busy||cam!==camera) return; const ds=r.getDrawingBufferSize(new T.Vector2()); const w=Math.max(64,Math.round(ds.x*mr.res)), h=Math.max(64,Math.round(ds.y*mr.res)); if(rt.width!==w||rt.height!==h) rt.setSize(w,h); if(mr.uni&&mr.uni.px) mr.uni.px.value.set(1/w,1/h);
    P.setFromMatrixPosition(mesh.matrixWorld); C.setFromMatrixPosition(cam.matrixWorld); rot.extractRotation(mesh.matrixWorld); N.set(0,0,1).applyMatrix4(rot);
    view.subVectors(P,C); if(view.dot(N)>0) return; view.reflect(N).negate().add(P);
    rot.extractRotation(cam.matrixWorld); look.set(0,0,-1).applyMatrix4(rot).add(C); tgt.subVectors(P,look).reflect(N).negate().add(P);
    vc.layers.set(3); vc.position.copy(view); vc.up.set(0,1,0).applyMatrix4(rot).reflect(N); vc.lookAt(tgt); vc.far=cam.far; vc.updateMatrixWorld(); vc.projectionMatrix.copy(cam.projectionMatrix);
    tm.set(0.5,0,0,0.5, 0,0.5,0,0.5, 0,0,0.5,0.5, 0,0,0,1); tm.multiply(vc.projectionMatrix); tm.multiply(vc.matrixWorldInverse); tm.multiply(mesh.matrixWorld);
    plane.setFromNormalAndCoplanarPoint(N,P); plane.applyMatrix4(vc.matrixWorldInverse); clip.set(plane.normal.x,plane.normal.y,plane.normal.z,plane.constant);
    const pm=vc.projectionMatrix.elements; q.x=(Math.sign(clip.x)+pm[8])/pm[0]; q.y=(Math.sign(clip.y)+pm[9])/pm[5]; q.z=-1; q.w=(1+pm[10])/pm[14]; clip.multiplyScalar(2/clip.dot(q)); pm[2]=clip.x; pm[6]=clip.y; pm[10]=clip.z+1-0.003; pm[14]=clip.w;
    rt.texture.encoding=r.outputEncoding; mr.busy=true; mesh.visible=false; const cur=r.getRenderTarget(), sau=r.shadowMap.autoUpdate; r.shadowMap.autoUpdate=false;
    const hid=[]; for(const o of LOOK.mirrorHide){ if(o.visible){ o.visible=false; hid.push(o); } }
    r.setRenderTarget(rt); r.state.buffers.depth.setMask(true); if(r.autoClear===false) r.clear(); r.render(sc,vc);
    for(const o of hid) o.visible=true; r.shadowMap.autoUpdate=sau; r.setRenderTarget(cur); mesh.visible=true; mr.busy=false; };
  LOOK.mirrors.push(mr); return mr; }
LOOK.mirrorHide=[];

// Wet rooftop: a thin glossy layer over the Neon floor that mirrors the signs, blocks and fighters.
function lookWetFloor(group,w,d,y,strength){ const g=new T.PlaneGeometry(w,d); const mat=new T.ShaderMaterial({transparent:true,depthWrite:false,fog:false,
    uniforms:{tR:{value:null},tm:{value:new T.Matrix4()},k:{value:strength},time:{value:0},px:{value:new T.Vector2(1/512,1/512)}},
    vertexShader:'uniform mat4 tm; varying vec4 vR; varying vec3 vW; void main(){ vR=tm*vec4(position,1.0); vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader:`uniform sampler2D tR; uniform float k; uniform vec2 px; varying vec4 vR; varying vec3 vW;
      float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),f.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),f.x),f.y); }
      void main(){ vec3 V=normalize(cameraPosition-vW); float fr=0.08+0.92*pow(1.0-max(V.y,0.0),4.0);
        float pud=smoothstep(0.42,0.7,noise(vW.xz*0.23)+noise(vW.xz*0.9)*0.25); vec2 dn=vec2(noise(vW.xz*5.0),noise(vW.xz*5.0+9.0))-0.5;
        vec2 uv=vR.xy/vR.w+dn*mix(0.012,0.002,pud); float s=mix(5.0,1.2,pud);
        vec3 c=texture2D(tR,uv).rgb*0.36+(texture2D(tR,uv+vec2(px.x,px.y)*s).rgb+texture2D(tR,uv-vec2(px.x,px.y)*s).rgb+texture2D(tR,uv+vec2(px.x,-px.y)*s).rgb+texture2D(tR,uv-vec2(px.x,-px.y)*s).rgb)*0.16;
        float a=k*fr*mix(0.55,1.0,pud); gl_FragColor=vec4(c,clamp(a,0.0,0.85)); }`});
  const m=new T.Mesh(g,mat); m.rotation.x=-Math.PI/2; m.position.y=y; m.renderOrder=0; group.add(m);
  const mr=lookMirror(m,0.5); mat.uniforms.tR.value=mr.rt.texture; mat.uniforms.tm.value=mr.tm; mr.uni=mat.uniforms; m.visible=false; mr.toggle=on=>{ m.visible=on; }; return mr; }

// Only what can actually be seen in a reflection is drawn into it (keeps the extra pass cheap).
function lookLayers(root,id){ const bb=new T.Box3(), sz=new T.Vector3(); root.updateMatrixWorld(true); const hx=(curMap&&curMap.HX)||HX, hz=(curMap&&curMap.HZ)||HZ;
  root.traverse(o=>{ if(!(o.isMesh||o.isSprite||o.isLine||o.isPoints)) return; if(o.userData.lyr) return; o.userData.lyr=1;
    if(o.isMesh&&o.material&&o.material.isShaderMaterial&&o.material.side===T.BackSide){ o.layers.enable(3); return; }
    bb.setFromObject(o); bb.getSize(sz); const r=sz.length()/2; if(!isFinite(r)) return;
    if(id==='dock'){ if(bb.max.y<-1.1||r<0.3) return; const inside=bb.min.x>-hx+1.2&&bb.max.x<hx-1.2&&bb.min.z>-hz+1.2&&bb.max.z<hz-1.2; if(inside&&bb.max.y<2.6) return; }
    else { if(bb.max.y<-0.05||r<0.22) return; }
    o.layers.enable(3); }); }

// ---- final colour grade (High/Ultra) ----
function lookGradePass(){ if(LOOK.grade||!composer||!THREE.ShaderPass) return; try{
  const p=new THREE.ShaderPass({ uniforms:{tDiffuse:{value:null},sat:{value:1.1},con:{value:0.2},vig:{value:0.3},warm:{value:new T.Vector3(1,1,1)},cool:{value:new T.Vector3(1,1,1)},asp:{value:1}},
    vertexShader:'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader:`uniform sampler2D tDiffuse; uniform float sat; uniform float con; uniform float vig; uniform vec3 warm; uniform vec3 cool; uniform float asp; varying vec2 vUv;
      void main(){ vec4 t=texture2D(tDiffuse,vUv); vec3 x=t.rgb; float l=dot(x,vec3(0.2126,0.7152,0.0722));
        x=mix(x,x*x*(3.0-2.0*x),con); x=mix(vec3(dot(x,vec3(0.2126,0.7152,0.0722))),x,sat);
        x*=mix(cool,warm,smoothstep(0.15,0.75,l));
        vec2 d=(vUv-0.5)*vec2(asp,1.0); x*=1.0-vig*smoothstep(0.35,1.15,length(d)*1.25);
        gl_FragColor=vec4(clamp(x,0.0,1.0),t.a); }` });
  composer.addPass(p); LOOK.grade=p; lookGradeSet(); }catch(e){ console.warn('grade off',e); } }
function lookGradeSet(){ const p=LOOK.grade; if(!p) return; const g=(LOOK_MAP[curMapId]||LOOK_MAP.dock).grade; const u=p.uniforms; u.sat.value=g.sat; u.con.value=g.con; u.vig.value=g.vig; u.warm.value.fromArray(g.warm); u.cool.value.fromArray(g.cool); u.asp.value=camera.aspect||1; }

// ---- hooks: map change, quality change, models arriving ----
function lookMap(id){ const m=MAPS[id]; if(!m||!m.group) return; const L=LOOK_MAP[id]||LOOK_MAP.dock, e=m.env;
  if(!m.lookDone){ m.lookDone=true; lookUntone(m.group); lookTune(m.group,id); lookLayers(m.group,id); }
  lookTryMerge(m);
  hemi.intensity=e.hemi[2]*L.hemi; sun.intensity=e.sun[1]*L.sun; renderer.toneMappingExposure=L.exp;
  const low=LOOK.q==='low'; renderer.toneMapping=low?T.NoToneMapping:T.ACESFilmicToneMapping; scene.environment=low?null:lookEnv(id); if(low){ hemi.intensity=e.hemi[2]; sun.intensity=e.sun[1]; }
  for(const mr of LOOK.mirrors) lookMirrorOn(mr); lookGradeSet(); }
function lookMirrorOn(mr){ const inMap=curMap&&curMap.group&&(()=>{ let p=mr.mesh; while(p){ if(p===curMap.group) return true; p=p.parent; } return false; })();
  mr.on=inMap&&(LOOK.q==='high'||LOOK.q==='ultra'); mr.res=LOOK.q==='ultra'?0.6:0.42; if(mr.toggle) mr.toggle(mr.on); if(mr.uni&&mr.uni.reflOn) mr.uni.reflOn.value=mr.on?1:0; if(mr.uni&&mr.uni.px) mr.uni.px.value.set(1/Math.max(64,mr.rt.width),1/Math.max(64,mr.rt.height)); }
function lookQuality(q){ LOOK.q=q; if(postOn) lookGradePass(); if(curMap&&curMap.group) lookMap(curMapId); }
function lookModelsArrived(){ for(const k in MAPS){ const m=MAPS[k]; if(!m.group) continue; m.lookDone=false; lookUntone(m.group); m.group.traverse(o=>{ if(o.isMesh) for(const mt of [].concat(o.material)) if(mt) mt.userData.look=0; }); lookTune(m.group,k); lookLayers(m.group,k); m.lookDone=true; if(LOOK.env[k]) lookEnv(k,true); } if(curMap) lookMap(curMapId); }
// Effects and fighters are made on the fly: glows/bullets stay full colour, like the map's lights.
let lookN=0; function lookFrame(){ if((lookN++&7)!==0) return; if(curMap&&!curMap.merged&&(lookN&63)===1) lookTryMerge(curMap); for(const o of scene.children){ if(o.userData.isMap||o.isLight) continue; o.traverse(c=>{ c.layers.enable(3); const ms=c.material; if(!ms) return; for(const m of (Array.isArray(ms)?ms:[ms])){ if(m.userData.lt) continue; m.userData.lt=1; if(m.isMeshBasicMaterial||m.isSpriteMaterial||m.isPointsMaterial||m.isLineBasicMaterial){ m.toneMapped=false; m.needsUpdate=true; } } }); } }

// ---- batching: everything that never moves is merged into a few big meshes ----
// A map is a few hundred separate boxes, rails and props. Each one costs the CPU a draw call every frame
// (twice with reflections, once more for shadows). Static pieces that share a surface type are welded
// together, with each piece's own colour carried per vertex, so the picture is identical but much cheaper.
const LOOK_FNID=new WeakMap(); let lookFnN=1; const fnid=f=>{ if(!f) return 0; if(!LOOK_FNID.has(f)) LOOK_FNID.set(f,lookFnN++); return LOOK_FNID.get(f); };
const tid=t=>t?t.uuid:'';
function lookMatKey(m){ return [m.type,tid(m.map),tid(m.emissiveMap),tid(m.normalMap),tid(m.roughnessMap),tid(m.metalnessMap),tid(m.alphaMap),tid(m.envMap),
  m.emissive?m.emissive.getHex():'',m.emissiveIntensity,m.roughness,m.metalness,m.envMapIntensity,m.normalScale?m.normalScale.x.toFixed(3):'',m.side,m.opacity,m.alphaTest,
  m.polygonOffset?[m.polygonOffsetFactor,m.polygonOffsetUnits].join('/'):0,m.depthWrite,m.depthTest,m.fog,m.flatShading,m.toneMapped,fnid(m.onBeforeCompile),m.userData.detail||'',m.userData.noDetail?1:0].join('|'); }
function lookMergeable(m){ return m&&!m.transparent&&!m.isShaderMaterial&&!m.wireframe&&!m.aoMap&&!m.lightMap&&!m.displacementMap&&!m.vertexColors&&(m.isMeshStandardMaterial||m.isMeshBasicMaterial||m.isMeshLambertMaterial||m.isMeshPhongMaterial); }
function lookFindStatic(m){ const g=m.group; g.updateMatrixWorld(true); const list=[]; g.traverse(o=>{ if(o.isMesh) list.push(o); });
  const mats=new Set(); for(const o of list) for(const x of [].concat(o.material)) mats.add(x);
  const sig=x=>[x.opacity,x.color&&x.color.getHex(),x.emissive&&x.emissive.getHex(),x.emissiveIntensity,x.visible,x.map&&x.map.offset.x,x.map&&x.map.offset.y,x.map&&x.map.uuid,x.roughness,x.metalness].join(',');
  const msig=new Map(); for(const x of mats) msig.set(x,sig(x));
  const before=list.map(o=>[o.matrixWorld.clone(),o.visible,o.geometry,o.geometry.attributes.position&&o.geometry.attributes.position.version,o.material]);
  const anim=new Set(); const sk=[]; g.traverse(o=>{ if(o.isMesh&&o.material&&o.material.side===T.BackSide&&o.material.isShaderMaterial) sk.push(o); });
  for(const t of [0.37,1.9,3.3,5.75,8.2,13.1,21.7,34.2]){ camera.position.x+=0.37; for(const f of m.animated){ try{ f(t,0.016); }catch(e){} } g.updateMatrixWorld(true);
    list.forEach((o,i)=>{ const b=before[i]; if(!o.matrixWorld.equals(b[0])||o.visible!==b[1]||o.geometry!==b[2]||(o.geometry.attributes.position&&o.geometry.attributes.position.version!==b[3])||o.material!==b[4]) anim.add(o); });
    for(const x of mats) if(sig(x)!==msig.get(x)) anim.add(x); }
  camera.position.x-=0.37*8;
  return list.filter(o=>{ if(anim.has(o)||!o.visible||o.children.length||o.isSkinnedMesh||o.isInstancedMesh||o.morphTargetInfluences||o.renderOrder!==0||o.userData.noMerge) return false;
    let p=o.parent; while(p&&p!==g){ if(!p.visible) return false; p=p.parent; }
    const ms=[].concat(o.material); if(ms.some(x=>anim.has(x)||!lookMergeable(x))) return false;
    const ga=o.geometry.attributes; if(!ga.position||!o.geometry.isBufferGeometry) return false; return true; }); }
function lookMerge(m){ if(m.merged||!m.group) return; m.merged=true; const g=m.group; let stat; try{ stat=lookFindStatic(m); }catch(e){ console.warn('batching off',e); return; }
  const inv=new T.Matrix4().copy(g.matrixWorld).invert(), mw=new T.Matrix4(), nm=new T.Matrix3(), v=new T.Vector3(), n=new T.Vector3();
  const buckets=new Map();
  for(const o of stat){ const geo=o.geometry, ms=Array.isArray(o.material)?o.material:null; mw.multiplyMatrices(inv,o.matrixWorld); nm.getNormalMatrix(mw); const flip=mw.determinant()<0;
    const groups= ms? (geo.groups.length?geo.groups:[{start:0,count:Infinity,materialIndex:0}]) : [{start:0,count:Infinity,materialIndex:-1}];
    for(const gr of groups){ const mat= ms? ms[gr.materialIndex] : o.material; if(!mat) continue;
      const key=lookMatKey(mat)+'#'+(o.castShadow?1:0)+(o.receiveShadow?1:0)+'#'+o.layers.mask+'#'+(geo.attributes.uv?1:0);
      let b=buckets.get(key); if(!b){ b={mat,cast:o.castShadow,recv:o.receiveShadow,layers:o.layers.mask,parts:[],nv:0}; buckets.set(key,b); }
      b.parts.push({o,geo,start:gr.start,count:gr.count,mw:mw.clone(),nm:nm.clone(),flip,color:(mat.color||new T.Color(1,1,1)).clone()}); } }
  // a piece is only taken out if every one of its faces lands in a real batch
  for(let pass=0;pass<6;pass++){ const blocked=new Set(); for(const b of buckets.values()) if(b.parts.length<2) for(const pt of b.parts) blocked.add(pt.o);
    if(!blocked.size) break; for(const [k,b] of buckets){ b.parts=b.parts.filter(pt=>!blocked.has(pt.o)); if(!b.parts.length) buckets.delete(k); } }
  let made=0; const removed=new Set();
  for(const [key,b] of buckets){ if(b.parts.length<2) continue;
    // gather vertices referenced by each part (re-indexed)
    const P=[],N=[],U=[],C=[],I=[]; let base=0; const hasUv=!!b.parts[0].geo.attributes.uv;
    for(const pt of b.parts){ const ga=pt.geo.attributes, idx=pt.geo.index, pos=ga.position, nor=ga.normal, uv=ga.uv;
      const total= idx? idx.count : pos.count; const s=Math.max(0,pt.start), e=Math.min(total, pt.start+(isFinite(pt.count)?pt.count:total)); if(e<=s) continue;
      const map=new Map(); const c=pt.color; const lin=c; 
      const vtx=k=>{ let j=map.get(k); if(j!==undefined) return j; j=base++; map.set(k,j); v.fromBufferAttribute(pos,k).applyMatrix4(pt.mw); P.push(v.x,v.y,v.z);
        if(nor){ n.fromBufferAttribute(nor,k).applyMatrix3(pt.nm).normalize(); } else n.set(0,1,0); N.push(n.x,n.y,n.z);
        if(hasUv){ if(uv) U.push(uv.getX(k),uv.getY(k)); else U.push(0,0); } C.push(lin.r,lin.g,lin.b); return j; };
      for(let t=s;t+2<e;t+=3){ const a=idx?idx.getX(t):t, bb=idx?idx.getX(t+1):t+1, cc=idx?idx.getX(t+2):t+2; const ia=vtx(a), ib=vtx(bb), ic=vtx(cc); if(pt.flip) I.push(ia,ic,ib); else I.push(ia,ib,ic); }
      removed.add(pt.o); }
    if(!I.length) continue;
    const geo=new T.BufferGeometry(); geo.setAttribute('position',new T.Float32BufferAttribute(P,3)); geo.setAttribute('normal',new T.Float32BufferAttribute(N,3)); if(hasUv) geo.setAttribute('uv',new T.Float32BufferAttribute(U,2)); geo.setAttribute('color',new T.Float32BufferAttribute(C,3));
    geo.setIndex(base>65535? new T.Uint32BufferAttribute(I,1) : new T.Uint16BufferAttribute(I,1)); geo.computeBoundingSphere(); geo.computeBoundingBox();
    const mat=b.mat.clone(); mat.vertexColors=true; if(mat.color) mat.color.setRGB(1,1,1); mat.onBeforeCompile=b.mat.onBeforeCompile; mat.userData=Object.assign({},b.mat.userData); mat.userData.merged=1;
    const mesh=new T.Mesh(geo,mat); mesh.castShadow=b.cast; mesh.receiveShadow=b.recv; mesh.layers.mask=b.layers; mesh.matrixAutoUpdate=false; mesh.renderOrder=-1; mesh.userData.merged=true; mesh.userData.lyr=1; g.add(mesh); made++; }
  for(const o of removed){ if(o.parent) o.parent.remove(o); }
  m.mergeInfo={static:stat.length,removed:removed.size,batches:made}; }
function lookTryMerge(m){ if(/[?&]nomerge/.test(location.search)) return; if(m.merged||!m.group||!m.lookDone) return; const kenOk=KEN.ready||KEN.failed; if(!kenOk||!DET.ready) return; lookMerge(m); }
