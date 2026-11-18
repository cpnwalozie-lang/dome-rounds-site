import asyncio, os, json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'])
        pg=await b.new_page(viewport={'width':800,'height':450}); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text[:200]) if m.type=='error' and 'ERR_' not in m.text else None); E=pg.evaluate
        await pg.add_init_script("HTMLCanvasElement.prototype.requestPointerLock=function(){ return Promise.reject(new Error('t')); };")
        await pg.goto('http://127.0.0.1:8811/index.html'); await pg.wait_for_function('!!window.__game&&window.__game.kenReady()',timeout=240000)
        await E("__game.setAuto(false); __game.setRender(false)")
        L={}
        # 1 dazzle then quit
        await pg.click('#startBtn'); await E("(()=>{ const G=__game; G.forceFight(); const P=G.player; P.dazzleN=3; P.dazzleT=0.6; P.poisons.push({dps:5,t:3,src:G.bot,col:0x49d86b}); G.player.setCards(['staticfield']); for(let i=0;i<40;i++) G.step(1/60); })()")
        L['dzDuring']=await E("!!__game.look().renderer.domElement.style.filter")
        await E("(()=>{ const G=__game; G.toMenu(); for(let i=0;i<60;i++) G.step(1/60); })()")
        L['afterMenu']=await E("({filter:__game.look().renderer.domElement.style.filter, state:__game.state, sparksOn:__game.sparks().filter(s=>s.on).length, dz:__game.player.dazzleN, poisons:__game.player.poisons.length, bullets:__game.bullets.length, hud:getComputedStyle(document.getElementById('hud')).display, start:getComputedStyle(document.getElementById('start')).display})")
        # 2 FFA then 1v1: fighters + tags
        await E("(()=>{ const G=__game; document.querySelector('[data-seg=\"gm\"] [data-v=\"ffa\"]').click(); })()"); await pg.click('#startBtn'); await E("(()=>{ const G=__game; G.forceFight(); for(let i=0;i<120;i++) G.step(1/60); G.toMenu(); document.querySelector('[data-seg=\"gm\"] [data-v=\"1v1\"]').click(); for(let i=0;i<20;i++) G.step(1/60); })()")
        await pg.click('#startBtn'); await E("(()=>{ const G=__game; G.forceFight(); for(let i=0;i<60;i++) G.step(1/60); })()")
        L['after1v1']=await E("({fighters:__game.fighters.filter(f=>f.active!==false).length, visibleMeshes:__game.fighters.filter(f=>f.mesh.visible).length, tags:[...document.querySelectorAll('#tagLayer > *')].filter(e=>e.style.display!=='none'&&getComputedStyle(e).display!=='none').length, board:getComputedStyle(document.getElementById('ffaBoard')).display, map:__game.map})")
        # 3 sandbox -> quit -> match: cards cleared?
        await E("(()=>{ const G=__game; G.toMenu(); G.sandbox.cards=['barrage','barrage']; G.sandbox.bot='dummy'; G.startSandbox(); G.forceFight(); for(let i=0;i<30;i++) G.step(1/60); G.toMenu(); })()")
        await pg.click('#startBtn'); await E("(()=>{ const G=__game; G.forceFight(); for(let i=0;i<10;i++) G.step(1/60); })()")
        L['matchAfterSandbox']=await E("({cards:__game.player.cards.length, botCards:__game.bot.cards.length, mode:__game.mode||'?'})")
        # 4 dead mid-dome -> next round: dome hidden
        await E("(()=>{ const G=__game; const P=G.player; P.blockCdT=0; G.tryBlock(P); G.step(1/60); G.killFighter(P); for(let i=0;i<10;i++) G.step(1/60); })()")
        L['deadDome']=await E("[__game.player.dome.visible,__game.player.dome2.visible,__game.player.domeRing.visible]")
        # 5 pause + studio not reachable in match
        L['errs']=errs[:6]; print(json.dumps(L,indent=0)); await b.close()
asyncio.run(main())
