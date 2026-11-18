import asyncio, os, json, sys
from playwright.async_api import async_playwright
JS=r'''(async (gm)=>{ const G=__game; const ids=G.ALL_CARDS; let h=7; const R=()=>{ h=(h*1664525+1013904223)>>>0; return h/4294967296; };
  const issues=[]; const note=s=>{ if(issues.length<20&&!issues.includes(s)) issues.push(s); }; const seen={}; let rounds=0;
  for(const f of G.fighters) if(f.active!==false){ const c=[]; for(let i=0;i<4;i++) c.push(ids[Math.floor(R()*ids.length)]); f.setCards(c); }
  let last=''; let same=0;
  for(let i=0;i<60*60*7;i++){ G.step(1/60); const st=G.state; seen[st]=(seen[st]||0)+1;
    if(st==='draft'||st==='picked'){ const c=[...document.querySelectorAll('#cards > *')].filter(x=>!x.classList.contains('picked')); if(st==='draft'&&c.length&&R()<0.05) c[0].click(); await new Promise(r=>setTimeout(r,20)); }
    if(st!==last){ if(last==='roundover') rounds++; last=st; same=0; } else if(++same>60*90) { note('stuck in '+st); same=0; }
    if(st==='matchover') break;
    if(st==='fight'&&R()<0.02){ G.player.yaw+=R()-0.5; G.setMouse(R()<0.5); }
    for(const f of G.fighters){ if(f.active===false) continue; if(![f.pos.x,f.pos.y,f.pos.z,f.hp].every(Number.isFinite)) note('NaN '+f.name+' '+f.cards.join(',')); if(Math.abs(f.pos.x)>G.hx+40||Math.abs(f.pos.z)>G.hz+40) note('far out '+f.name); }
    if(G.bullets.length>700) note('bullet flood'); }
  return {gm, rounds, seen, issues, score:JSON.stringify(G.fighters.map(f=>f.score))}; })'''
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'])
        for gm,mp in [('ffa',None),('2v2','crane'),('2v2','foundry')]:
            pg=await b.new_page(viewport={'width':480,'height':270}); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)[:300])); pg.on('console',lambda m: errs.append(m.text[:200]) if m.type=='error' and 'ERR_' not in m.text else None); E=pg.evaluate
            await pg.add_init_script("HTMLCanvasElement.prototype.requestPointerLock=function(){ return Promise.reject(new Error('t')); };")
            await pg.goto('http://127.0.0.1:8811/index.html'); await pg.wait_for_function('!!window.__game&&window.__game.kenReady()',timeout=240000)
            await E("__game.setAuto(false); __game.setRender(false)")
            await E(f"document.querySelector('[data-seg=\"gm\"] [data-v=\"{gm}\"]').click()")
            if mp: await E(f"document.querySelector('[data-seg=\"map\"] [data-v=\"{mp}\"]').click()")
            await pg.click('#startBtn')
            r=await E(JS+f"('{gm}')"); print(json.dumps(r), 'map', await E("__game.map"), 'errs', errs[:4], flush=True); await pg.close()
        await b.close()
asyncio.run(main())
