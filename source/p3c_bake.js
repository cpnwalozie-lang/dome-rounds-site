// ================= BAKED LIGHTING =================
// Ray-traced ambient occlusion + one-bounce global illumination, path traced ahead of time into a probe
// volume for each map. Every probe fires cosine-weighted rays in 6 directions; hits are shaded with the
// map's sun (plus a shadow ray), its sky light, or the glow of neon surfaces. The result ships inside
// the game as a small PNG, so nothing heavy runs on the player's machine.
const BAKE={ cell:0.6, cellY:0.75, y0:-1.5, y1:9.0, pad:3, maps:{}, on:true,
  u:{ bkTex:{value:null}, bkMin:{value:new T.Vector3()}, bkCell:{value:new T.Vector3(1,1,1)}, bkDim:{value:new T.Vector3(1,1,1)}, bkAmt:{value:0}, bkBounce:{value:1} } };

const BK_HEAD=`uniform sampler2D bkTex; uniform vec3 bkMin; uniform vec3 bkCell; uniform vec3 bkDim; uniform float bkAmt; uniform float bkBounce;
varying vec3 vBkW; varying vec3 vBkN;
vec3 bkS(float tile, vec2 xz, float y){ vec2 uv=vec2((tile*bkDim.x+xz.x+0.5)/(3.0*bkDim.x),(y*bkDim.z+xz.y+0.5)/(bkDim.y*bkDim.z)); return texture2D(bkTex,uv).rgb; }`;
const BK_BODY=`if(bkAmt>0.001){ vec3 nW=normalize(vBkN); vec3 g=(vBkW+nW*0.3-bkMin)/bkCell; vec3 lim=bkDim-1.0;
  float edge=clamp(min(min(g.x,lim.x-g.x),min(g.z,lim.z-g.z))*0.5,0.0,1.0)*(1.0-clamp((g.y-lim.y)*0.5,0.0,1.0));
  vec2 xz=clamp(g.xz,vec2(0.0),lim.xz); float fy=clamp(g.y,0.0,lim.y); float y0=floor(fy); float y1=min(y0+1.0,lim.y); float ty=fy-y0;
  vec3 vp=mix(bkS(0.0,xz,y0),bkS(0.0,xz,y1),ty), vn=mix(bkS(1.0,xz,y0),bkS(1.0,xz,y1),ty), bb=mix(bkS(2.0,xz,y0),bkS(2.0,xz,y1),ty); bb=bb*bb*2.0;
  vec3 n2=nW*nW; float vis=dot(n2,mix(vn,vp,step(vec3(0.0),nW))); float k=bkAmt*edge;
  reflectedLight.indirectDiffuse*=mix(1.0,vis,k); reflectedLight.indirectSpecular*=mix(1.0,vis*vis,k); reflectedLight.directDiffuse*=mix(1.0,0.7+0.3*vis,k*0.6);
  float bl=dot(bb,vec3(0.3,0.55,0.15)); bb=max(mix(vec3(bl),bb,1.7),vec3(0.0)); reflectedLight.indirectDiffuse+=bb*max(diffuseColor.rgb,vec3(0.07))*bkBounce*k; }`;
function bakeOBC(sh){ const u=BAKE.u; for(const k in u) sh.uniforms[k]=u[k];
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vBkW; varying vec3 vBkN;').replace('#include <project_vertex>','#include <project_vertex>\nvBkW=(modelMatrix*vec4(transformed,1.0)).xyz; vBkN=normalize(mat3(modelMatrix)*objectNormal);');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\n'+BK_HEAD).replace('#include <aomap_fragment>','#include <aomap_fragment>\n'+BK_BODY); }
function bakeHook(root){ root.traverse(o=>{ if(!o.isMesh) return; const ms=Array.isArray(o.material)?o.material:[o.material];
  for(const m of ms){ if(!m||!m.isMeshStandardMaterial||m.userData.bk) continue; m.userData.bk=true; m.onBeforeCompile=bakeOBC; m.needsUpdate=true; } }); }
function bakeUse(id){ const st=BAKE.maps[id], u=BAKE.u; if(!st||!st.tex){ u.bkAmt.value=0; return; } const m=st.meta;
  u.bkTex.value=st.tex; u.bkMin.value.set(m.min[0],m.min[1],m.min[2]); u.bkCell.value.set(m.cell[0],m.cell[1],m.cell[2]); u.bkDim.value.set(m.dim[0],m.dim[1],m.dim[2]); u.bkBounce.value=m.bounce||1; u.bkAmt.value=BAKE.on?1:0; }
function bakeSetOn(on){ BAKE.on=on; BAKE.u.bkAmt.value=(on&&BAKE.u.bkTex.value)?1:0; }
function bakeLoad(id){ if(BAKE.maps[id]) return; const src=(typeof BAKED!=='undefined')&&BAKED[id], meta=(typeof BAKED_META!=='undefined')&&BAKED_META[id]; if(!src||!meta) return;
  const st=BAKE.maps[id]={tex:null,meta}; const img=new Image();
  img.onload=()=>{ const t=new T.Texture(img); t.flipY=false; t.minFilter=T.LinearFilter; t.magFilter=T.LinearFilter; t.generateMipmaps=false; t.wrapS=t.wrapT=T.ClampToEdgeWrapping; t.needsUpdate=true; st.tex=t; if(curMapId===id) bakeUse(id); };
  img.src=src; }

// ---- the tracer (run ahead of time; kept in the build so the bake can be redone) ----
function bakeCompute(id){
  const m=curMap, g=m.group; g.updateMatrixWorld(true); const env=m.env;
  const bb=new T.Box3(), sz=new T.Vector3(), list=[];
  const avgCache=new Map(); const avg=tex=>{ if(!tex||!tex.image) return [1,1,1]; if(avgCache.has(tex)) return avgCache.get(tex); let r=[1,1,1]; try{ const cv=document.createElement('canvas'); cv.width=cv.height=16; const cc=cv.getContext('2d'); cc.drawImage(tex.image,0,0,16,16); const d=cc.getImageData(0,0,16,16).data; let a=0,b=0,c=0; for(let i=0;i<d.length;i+=4){ a+=d[i]; b+=d[i+1]; c+=d[i+2]; } const n=d.length/4*255; r=[Math.pow(a/n,2.2),Math.pow(b/n,2.2),Math.pow(c/n,2.2)]; }catch(e){} avgCache.set(tex,r); return r; };
  g.traverse(o=>{ if(!o.isMesh||!o.visible) return; const mt=Array.isArray(o.material)?o.material[0]:o.material; if(!mt||mt.isShaderMaterial) return;
    let e=[0,0,0]; if(mt.isMeshBasicMaterial){ const a=mt.map?avg(mt.map):[1,1,1]; e=[mt.color.r*a[0],mt.color.g*a[1],mt.color.b*a[2]]; } else if(mt.emissive){ const a=mt.emissiveMap?avg(mt.emissiveMap):[1,1,1], k=mt.emissiveIntensity||0; e=[mt.emissive.r*a[0]*k,mt.emissive.g*a[1]*k,mt.emissive.b*a[2]*k]; }
    const lum=e[0]*0.3+e[1]*0.55+e[2]*0.15; let flag=0;
    if(mt.transparent){ const add=mt.blending===T.AdditiveBlending; if(!(mt.isMeshBasicMaterial&&add&&lum>0.05)) return; flag=1; e=e.map(v=>v*(mt.opacity||1)*1.5); }
    bb.setFromObject(o); bb.getSize(sz); if(Math.max(sz.x,sz.z)>120||sz.y>150) return; if(!flag&&Math.min(sz.x,sz.y,sz.z)<0.02&&Math.max(sz.x,sz.y,sz.z)<0.3) return;
    if(o.parent&&o.parent.userData&&o.parent.userData.cloud) return;
    const c=mt.isMeshBasicMaterial?{r:0,g:0,b:0}:(mt.color||{r:1,g:1,b:1}); list.push([bb.min.x,bb.min.y,bb.min.z,bb.max.x,bb.max.y,bb.max.z,c.r,c.g,c.b,e[0],e[1],e[2],flag]); });
  const N=list.length, BX=new Float32Array(N*6), CL=new Float32Array(N*3), EM=new Float32Array(N*3), FL=new Uint8Array(N);
  list.forEach((a,i)=>{ for(let k=0;k<6;k++) BX[i*6+k]=a[k]; for(let k=0;k<3;k++){ CL[i*3+k]=a[6+k]; EM[i*3+k]=a[9+k]; } FL[i]=a[12]; });
  const cx=BAKE.cell, cy=BAKE.cellY, x0=-HX-BAKE.pad, z0=-HZ-BAKE.pad, y0=BAKE.y0;
  const NX=Math.ceil((2*(HX+BAKE.pad))/cx)+1, NZ=Math.ceil((2*(HZ+BAKE.pad))/cx)+1, NY=Math.ceil((BAKE.y1-y0)/cy)+1;
  const sunDir=new T.Vector3(env.sun[2][0],env.sun[2][1],env.sun[2][2]).normalize(), sunC=new T.Color(env.sun[0]), sunI=env.sun[1];
  const skyC=new T.Color(env.hemi[0]), gndC=new T.Color(env.hemi[1]), hemiI=env.hemi[2];
  const R=4.5, RB=9.0, RS=24.0, EMIT=2.2, ALB=0.8, RAYS=16;
  // ray directions: cosine-weighted around +Z, rotated onto each axis
  const base=[]; for(let i=0;i<RAYS;i++){ const u=(i+0.5)/RAYS, r=Math.sqrt(u), ph=i*2.399963; base.push([r*Math.cos(ph),r*Math.sin(ph),Math.sqrt(1-u)]); }
  const AX=[[1,0,0],[0,1,0],[0,0,1],[-1,0,0],[0,-1,0],[0,0,-1]];
  function frame(a){ const w=a; const t=Math.abs(w[0])<0.9?[1,0,0]:[0,1,0]; let u=[t[1]*w[2]-t[2]*w[1],t[2]*w[0]-t[0]*w[2],t[0]*w[1]-t[1]*w[0]]; const ul=Math.hypot(u[0],u[1],u[2]); u=u.map(v=>v/ul); const v=[w[1]*u[2]-w[2]*u[1],w[2]*u[0]-w[0]*u[2],w[0]*u[1]-w[1]*u[0]]; return [u,v,w]; }
  const FR=AX.map(frame);
  // per-column candidate lists
  const colIdx=new Array(NX*NZ);
  for(let ix=0;ix<NX;ix++) for(let iz=0;iz<NZ;iz++){ const px=x0+ix*cx, pz=z0+iz*cx, out=[]; for(let i=0;i<N;i++){ const j=i*6; if(BX[j]<=px+RS*0.5&&BX[j+3]>=px-RS*0.5&&BX[j+2]<=pz+RS*0.5&&BX[j+5]>=pz-RS*0.5) out.push(i); } colIdx[ix*NZ+iz]=Int32Array.from(out); }
  let hitI=-1, hitA=0;
  function trace(ox,oy,oz,dx,dy,dz,idx,cnt,tmax,any){ const ix=1/dx, iy=1/dy, iz=1/dz; let best=tmax; hitI=-1;
    for(let k=0;k<cnt;k++){ const b=idx[k], j=b*6; if(any&&FL[b]) continue; let t1=(BX[j]-ox)*ix, t2=(BX[j+3]-ox)*ix; let tn=t1<t2?t1:t2, tf=t1<t2?t2:t1, a=0;
      t1=(BX[j+1]-oy)*iy; t2=(BX[j+4]-oy)*iy; let n2=t1<t2?t1:t2, f2=t1<t2?t2:t1; if(n2>tn){ tn=n2; a=1; } if(f2<tf) tf=f2;
      t1=(BX[j+2]-oz)*iz; t2=(BX[j+5]-oz)*iz; n2=t1<t2?t1:t2; f2=t1<t2?t2:t1; if(n2>tn){ tn=n2; a=2; } if(f2<tf) tf=f2;
      if(tf<0||tn>tf) continue; const t=tn<0?0:tn; if(t<best){ best=t; hitI=b; hitA=a; if(any) return best; } }
    return best; }
  const total=NX*NY*NZ, V=new Float32Array(total*9), inside=new Uint8Array(total), loc=new Int32Array(N);
  const P=(ix,iy,iz)=>(iy*NZ+iz)*NX+ix;
  let h=12345; const rnd=()=>{ h=(h*1664525+1013904223)>>>0; return h/4294967296; };
  for(let ix=0;ix<NX;ix++) for(let iz=0;iz<NZ;iz++){ const col=colIdx[ix*NZ+iz];
    for(let iy=0;iy<NY;iy++){ const px=x0+ix*cx, py=y0+iy*cy, pz=z0+iz*cx, p=P(ix,iy,iz);
      let cnt=0; for(let k=0;k<col.length;k++){ const j=col[k]*6; if(BX[j+1]<=py+RB&&BX[j+4]>=py-RB) loc[cnt++]=col[k]; }
      let ins=false; for(let k=0;k<cnt&&!ins;k++){ if(FL[loc[k]]) continue; const j=loc[k]*6; if(px>BX[j]+0.02&&px<BX[j+3]-0.02&&py>BX[j+1]+0.02&&py<BX[j+4]-0.02&&pz>BX[j+2]+0.02&&pz<BX[j+5]-0.02) ins=true; }
      if(ins){ inside[p]=1; continue; }
      const cr=1, sr=0; let br=0,bg=0,bbl=0;
      for(let a=0;a<6;a++){ const [U,Vv,Wd]=FR[a]; let occ=0, wsum=0;
        for(let r=0;r<RAYS;r++){ const q=base[r]; const lx=q[0]*cr-q[1]*sr, ly=q[0]*sr+q[1]*cr, lz=q[2];
          let dx=U[0]*lx+Vv[0]*ly+Wd[0]*lz+1e-6, dy=U[1]*lx+Vv[1]*ly+Wd[1]*lz+1e-6, dz=U[2]*lx+Vv[2]*ly+Wd[2]*lz+1e-6;
          const wt=a===4?0.6:clamp((dy+0.35)/0.5,0.08,1); wsum+=wt;
          const t=trace(px,py,pz,dx,dy,dz,loc,cnt,RB,false); if(hitI<0) continue;
          if(t<R&&!FL[hitI]) occ+=(1-t/R*0.85)*wt;
          const b=hitI, ax=hitA, d=[dx,dy,dz], nrm=[0,0,0]; nrm[ax]=d[ax]>0?-1:1; let Lr,Lg,Lb;
          Lr=EM[b*3]*EMIT; Lg=EM[b*3+1]*EMIT; Lb=EM[b*3+2]*EMIT;
          if(!FL[b]){ const hx=px+dx*t+nrm[0]*0.03, hy=py+dy*t+nrm[1]*0.03, hz=pz+dz*t+nrm[2]*0.03; const nd=nrm[0]*sunDir.x+nrm[1]*sunDir.y+nrm[2]*sunDir.z; let sun=0;
            if(nd>0){ trace(hx,hy,hz,sunDir.x+1e-6,sunDir.y+1e-6,sunDir.z+1e-6,loc,cnt,RS,true); sun=hitI<0?nd*sunI:0; }
            const hk=0.5+0.5*nrm[1]; const sr2=gndC.r+(skyC.r-gndC.r)*hk, sg2=gndC.g+(skyC.g-gndC.g)*hk, sb2=gndC.b+(skyC.b-gndC.b)*hk;
            Lr+=CL[b*3]*ALB*(sunC.r*sun+sr2*hemiI*0.6); Lg+=CL[b*3+1]*ALB*(sunC.g*sun+sg2*hemiI*0.6); Lb+=CL[b*3+2]*ALB*(sunC.b*sun+sb2*hemiI*0.6); }
          const fall=1-t/RB; br+=Lr*fall; bg+=Lg*fall; bbl+=Lb*fall; }
        V[p*9+a]=1-occ/Math.max(1e-3,wsum); }
      const nr=6*RAYS; V[p*9+6]=br/nr; V[p*9+7]=bg/nr; V[p*9+8]=bbl/nr; } }
  // fill probes buried inside walls from their open neighbours, so surfaces don't sample darkness
  const ok=new Uint8Array(total); for(let i=0;i<total;i++) ok[i]=inside[i]?0:1;
  for(let pass=0;pass<6;pass++){ const add=[];
    for(let iy=0;iy<NY;iy++) for(let iz=0;iz<NZ;iz++) for(let ix=0;ix<NX;ix++){ const p=P(ix,iy,iz); if(ok[p]) continue; const acc=new Float32Array(9); let n=0;
      for(const [dx,dy,dz] of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){ const jx=ix+dx, jy=iy+dy, jz=iz+dz; if(jx<0||jy<0||jz<0||jx>=NX||jy>=NY||jz>=NZ) continue; const q=P(jx,jy,jz); if(!ok[q]) continue; for(let k=0;k<9;k++) acc[k]+=V[q*9+k]; n++; }
      if(n){ for(let k=0;k<9;k++) V[p*9+k]=acc[k]/n; add.push(p); } }
    for(const p of add) ok[p]=1; }
  for(let i=0;i<total;i++) if(!ok[i]){ for(let k=0;k<6;k++) V[i*9+k]=1; }
  { const tmp=new Float32Array(V.length); const st=[1,NX,NX*NZ], dims=[NX,NZ,NY];
    for(let ax=0;ax<3;ax++){ tmp.set(V); for(let iy=0;iy<NY;iy++) for(let iz=0;iz<NZ;iz++) for(let ix=0;ix<NX;ix++){ const p=P(ix,iy,iz), cc=[ix,iz,iy][ax]; const pa=cc>0?p-st[ax]:p, pb=cc<dims[ax]-1?p+st[ax]:p; for(let k=0;k<9;k++) V[p*9+k]=(tmp[pa*9+k]+2*tmp[p*9+k]+tmp[pb*9+k])*0.25; } } }
  // pack: 3 tiles side by side (vis +xyz, vis -xyz, bounce), slices of y stacked vertically
  const cv=document.createElement('canvas'); cv.width=3*NX; cv.height=NZ*NY; const c2=cv.getContext('2d'), im=c2.createImageData(cv.width,cv.height), D=im.data;
  for(let iy=0;iy<NY;iy++) for(let iz=0;iz<NZ;iz++) for(let ix=0;ix<NX;ix++){ const p=P(ix,iy,iz), row=iy*NZ+iz;
    for(let tile=0;tile<3;tile++){ const o=(row*cv.width+tile*NX+ix)*4;
      for(let c=0;c<3;c++){ let v=V[p*9+tile*3+c]; if(tile===2) v=Math.sqrt(Math.max(0,v)/2); D[o+c]=Math.round(clamp(v,0,1)*255); } D[o+3]=255; } }
  c2.putImageData(im,0,0);
  return { png:cv.toDataURL('image/png'), meta:{ min:[x0,y0,z0], cell:[cx,cy,cx], dim:[NX,NY,NZ], bounce:(id==='neon'?1.5:1.0) }, boxes:N };
}
