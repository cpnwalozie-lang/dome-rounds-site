import asyncio, os, sys
from playwright.async_api import async_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
JS = r'''
(async (seed)=>{ const G=__game, P=G.player, B=G.bot; let h=seed; const R=()=>{ h=(h*1664525+1013904223)>>>0; return h/4294967296; };
  const issues=[]; const note=(s)=>{ if(issues.length<25&&!issues.includes(s)) issues.push(s); };
  const ids=G.ALL_CARDS; let rounds=0, stuck=0, lastState='', stateT=0, used={};
  for(let r=0;r<14;r++){
    G.clearCards(); const n=3+Math.floor(R()*9); const pc=[],bc=[];
    for(let i=0;i<n;i++){ const a=ids[Math.floor(R()*ids.length)], b=ids[Math.floor(R()*ids.length)]; G.give('player',a); G.give('bot',b); pc.push(a); bc.push(b); used[a]=1; used[b]=1; }
    G.beginRound(); let t=0; const dts=[1/60,1/30,1/20,1/144]; const dt=dts[r%4];
    while(t<45){ G.step(dt); t+=dt;
      const st=G.state; if(st!=='fight'&&st!=='countdown') break;
      if(st==='fight'){ const dx=B.pos.x-P.pos.x, dz=B.pos.z-P.pos.z; P.yaw=Math.atan2(-dx,-dz)+(R()-0.5)*0.3; P.pitch=(R()-0.5)*0.2;
        G.setMouse(R()<0.8); if(R()<0.03) G.block(); if(R()<0.02) G.dash(); if(R()<0.03) G.jump();
        G.keys.KeyW=R()<0.7; G.keys.KeyA=R()<0.3; G.keys.KeyD=R()<0.3; G.keys.KeyS=R()<0.1; }
      for(const f of [P,B]){ const nm=f===P?'player':'bot'; const cs=(f===P?pc:bc).join(',');
        if(![f.pos.x,f.pos.y,f.pos.z,f.vel.x,f.vel.y,f.vel.z,f.hp,f.yaw].every(Number.isFinite)) note('NaN on '+nm+' cards '+cs);
        if(!f.dead&&f.pos.y<-0.3&&G.groundAt(f.pos.x,f.pos.z,60,0.2)!==null&&G.groundAt(f.pos.x,f.pos.z,60,0.2)>=0) note('below floor '+nm+' y='+f.pos.y.toFixed(2)+' at '+f.pos.x.toFixed(1)+','+f.pos.z.toFixed(1)+' map '+G.map);
        if(f.hp>f.maxHp()+0.5) note('hp over max '+nm+' '+cs);
        if(!f.dead&&f.hp<=0&&st==='fight') note('alive at 0 hp '+nm+' '+cs);
        if(Math.abs(f.pos.x)>G.hx+30||Math.abs(f.pos.z)>G.hz+30||f.pos.y>60) note('far out of bounds '+nm+' '+cs); }
      if(G.bullets.length>600) note('bullet flood '+G.bullets.length+' '+pc.join(','));
    }
    if(t>=45) stuck++; rounds++;
    G.keys.KeyW=G.keys.KeyA=G.keys.KeyD=G.keys.KeyS=false; G.setMouse(false);
    for(let i=0;i<400&&G.state!=='draft'&&G.state!=='matchover';i++) G.step(1/60);
    if(G.state!=='draft'&&G.state!=='matchover') note('round did not end cleanly: state '+G.state);
    if(G.state==='matchover'){ G.startMatch(); }
  }
  return {rounds, timeouts:stuck, cardsUsed:Object.keys(used).length, issues}; })
'''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox'])
        for m in sys.argv[1].split(','):
          for seed in [int(x) for x in sys.argv[2].split(',')]:
            page = await b.new_page(viewport={'width':480,'height':270})
            errs=[]
            page.on('pageerror', lambda e: errs.append(str(e)[:300]))
            page.on('console', lambda mm: errs.append(mm.text[:300]) if mm.type=='error' and 'ERR_FAILED' not in mm.text else None)
            await page.route('**/*', lambda r: r.abort() if r.request.url.startswith('http') else r.continue_())
            await page.goto('file://' + os.path.join(HERE, 'index.html')); await page.wait_for_function('!!window.__game')
            ev=page.evaluate
            await ev(f'__game.setAuto(false); __game.setRender(false); __game.settings.map="{m}"; __game.settings.diff="hard"; __game.applyMap("{m}")')
            await page.click('#startBtn')
            res=await ev(JS+f'({seed})')
            print(m, seed, res, 'errs', list(dict.fromkeys(errs))[:6])
            await page.close()
        await b.close()
asyncio.run(main())
