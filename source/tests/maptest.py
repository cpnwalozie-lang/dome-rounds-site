import asyncio, os, json, sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'])
        pg=await b.new_page(viewport={'width':960,'height':540}); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None); E=pg.evaluate
        await pg.add_init_script("HTMLCanvasElement.prototype.requestPointerLock=function(){ return Promise.reject(new Error('t')); };")
        await pg.goto('file://'+os.path.abspath('index.html')); await pg.wait_for_function('!!window.__game&&window.__game.kenReady()',timeout=240000)
        await E("__game.setAuto(false); __game.setRender(false); __game.applyQuality('high'); __game.settings.assist=false;")
        L={}
        for mp in ['crane','foundry']:
            await E(f"(()=>{{ const G=__game; G.applyMap('{mp}'); document.querySelector('#start').style.display='none'; G.sandbox.bot='dummy'; G.settings.map='{mp}'; G.startSandbox(); G.forceFight(); }})()")
            for k in range(30): await E("__game.step(1/60)")
            await E("__game.holdCam(true)")
            await E("const c=__game.camera; c.fov=60; c.updateProjectionMatrix(); c.position.set(-24,12,16); c.lookAt(0,0,0); __game.render()"); await pg.screenshot(path=f'/tmp/{mp}_a.png')
            await E("const c=__game.camera; const P=__game.player; c.position.set(P.pos.x-4,P.pos.y+3,P.pos.z+1.5); c.lookAt(P.pos.x+12,P.pos.y+1,P.pos.z); __game.render()"); await pg.screenshot(path=f'/tmp/{mp}_b.png')
            await E("__game.holdCam(false)")
            L[mp+'_boxes']=await E("__game.boxCount()")
            L[mp+'_ground']=await E("[__game.groundAt(0,0,3,0.3),__game.groundAt(14,14,3,0.3),__game.groundAt(16.5,0,3,0.3),__game.groundAt(0,10,3,0.3)]")
        # crane tilt drift: put both on +x side
        await E("(()=>{ const G=__game; G.applyMap('crane'); G.settings.map='crane'; G.startSandbox(); G.forceFight(); const P=G.player,B=G.bot; P.pos.set(9,0,0); B.pos.set(10,0,4); for(let i=0;i<240;i++) G.step(1/60); })()")
        L['craneDrift']=await E("[__game.player.pos.x.toFixed(2),__game.player.pos.z.toFixed(2)]")
        await E("__game.holdCam(true); const c=__game.camera; c.position.set(-20,8,10); c.lookAt(4,0,0); __game.render()"); await pg.screenshot(path='/tmp/crane_tilt.png'); await E("__game.holdCam(false)")
        # foundry press: stand player in the middle and wait a cycle
        await E("(()=>{ const G=__game; G.applyMap('foundry'); G.settings.map='foundry'; G.startSandbox(); G.forceFight(); G.bot.pos.set(14,0,8); })()")
        hp=[]
        for k in range(7*12):
            await E("(()=>{ const P=__game.player; if(Math.abs(P.pos.x)>0.5||Math.abs(P.pos.z)>0.5){ if(P.knockT<=0&&P.onGround){} } for(let i=0;i<5;i++) __game.step(1/60); })()")
            hp.append(await E("Math.round(__game.player.hp)"))
            if k==0: await E("(()=>{ const P=__game.player; P.pos.set(0.3,0,0.2); P.vel.set(0,0,0); })()")
        L['pressHp']=sorted(set(hp)); L['afterPressPos']=await E("[__game.player.pos.x.toFixed(1),__game.player.pos.z.toFixed(1)]")
        # ball: stand under left pendulum path
        await E("(()=>{ const P=__game.player; P.hp=P.maxHp(); P.pos.set(-7,0,3); P.vel.set(0,0,0); })()"); hp=[]
        for k in range(40):
            await E("(()=>{ const P=__game.player; if(P.onGround&&P.knockT<=0){ P.pos.x=-7; P.pos.z=3; } for(let i=0;i<5;i++) __game.step(1/60); })()"); hp.append(await E("Math.round(__game.player.hp)"))
        L['ballHp']=sorted(set(hp))
        await E("__game.holdCam(true); const c=__game.camera; c.position.set(-16,5,9); c.lookAt(-4,2,0); __game.render()"); await pg.screenshot(path='/tmp/foundry_c.png')
        L['errs']=errs[:6]; print(json.dumps(L)); await b.close()
asyncio.run(main())
