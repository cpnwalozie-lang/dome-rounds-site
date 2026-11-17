import asyncio, os, json, sys
from playwright.async_api import async_playwright
MOCK=open('nettest.py').read().split('MOCK=r"""')[1].split('"""')[0]
async def main():
    async with async_playwright() as pw:
        b=await pw.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'])
        pages=[]; errs=[]
        for k in range(2):
            pg=await b.new_page(viewport={'width':640,'height':360}); pg.on('pageerror',lambda e,k=k: errs.append((k,str(e)))); await pg.add_init_script(MOCK+"\nHTMLCanvasElement.prototype.requestPointerLock=function(){ return Promise.reject(new Error('t')); };")
            await pg.goto('file://'+os.path.abspath('index.html')); await pg.wait_for_function('!!window.__game&&window.__game.kenReady()',timeout=240000)
            await pg.evaluate("__game.setAuto(false); __game.setRender(false); __game.settings.assist=false;"); pages.append(pg)
        A,B=pages
        async def tick(n=1,dt=1/30):
            for _ in range(n):
                for pg in pages: await pg.evaluate(f"__game.step({dt})")
                outs=[json.loads(o) if o else None for o in [await pg.evaluate("window.__mockOut()") for pg in pages]]
                for i,pg in enumerate(pages):
                    for j,o in enumerate(outs):
                        if i!=j and o and outs[i] and o['room']==outs[i]['room']: await pg.evaluate("([a,b])=>window.__mockIn(a,b)",[o['me'],o['p']])
                await asyncio.sleep(0.034)   # real time passes, so the 0.1 s view delay is real
        log={}
        await A.click('#onlineBtn'); await A.click('#olCreate'); await tick(3); code=await A.inner_text('#olShow')
        await B.click('#onlineBtn'); await B.fill('#olCode',code); await B.click('#olJoin'); await tick(8)
        await tick(110); log['states']=[await pg.evaluate("__game.state") for pg in pages]
        await A.evaluate("(()=>{ const P=__game.player; P.pos.set(-1,__game.groundAt(-1,7,5,0.3),7); P.hp=5000; })()"); await B.evaluate("(()=>{ const P=__game.player; P.pos.set(-12,__game.groundAt(-12,7,5,0.3),7); })()"); await tick(10)
        hits=0; shots=0
        for k in range(14):
            # host strafes fast (true position moves 0.33 m per tick)
            await A.evaluate(f"(()=>{{ const P=__game.player; const x=-1+Math.sin({k}*0.9)*3; P.pos.x=x; P.vel.set(Math.cos({k}*0.9)*8,0,0); }})()")
            # guest aims dead-centre at what IT sees and fires
            r=await B.evaluate("(()=>{ const G=__game,P=G.player,R=G.bot; P.fireCd=0; P.ammo=3; P.reloading=false; G.holdCam(true); const o=P.muzzlePos(); const d=R.center().sub(o).normalize(); P.yaw=Math.atan2(-d.x,-d.z); P.pitch=Math.asin(d.y); G.camera.position.copy(o).addScaledVector(d,-1); G.camera.lookAt(R.center()); G.camera.updateMatrixWorld(); G.step(1/120); G.tryFire(P,true); return 0; })()")
            await tick(6)
        log['guestHitsRecorded']=await B.evaluate("__game.NET.hitSeq"); log['hostSeenFromGuest']=await A.evaluate("JSON.stringify(__game.NET.hitSeen)")
        log['hostHpOnHost']=await A.evaluate("Math.round(__game.player.hp)+'/'+__game.player.maxHp()"); log['hostHpOnGuest']=await B.evaluate("Math.round(__game.bot.hp)")
        # shield: host blocks, guest should see it and its shots should not count
        await A.evaluate("(()=>{ const P=__game.player; P.blockCdT=0; P.hp=5000; __game.tryBlock(P); })()"); await tick(3)
        log['guestSeesHostDome']=await B.evaluate("__game.bot.blockActive")
        await B.evaluate("(()=>{ const G=__game,P=G.player,R=G.bot; P.fireCd=0; P.ammo=3; const o=P.muzzlePos(); const d=R.center().sub(o).normalize(); P.yaw=Math.atan2(-d.x,-d.z); P.pitch=Math.asin(d.y); G.camera.position.copy(o).addScaledVector(d,-1); G.camera.lookAt(R.center()); G.camera.updateMatrixWorld(); G.tryFire(P,true); })()")
        await tick(12); log['hostHpAfterBlockedShot']=await A.evaluate("Math.round(__game.player.hp)"); log['guestHits2']=await B.evaluate("__game.NET.hitSeq")
        print(json.dumps(log)); print('errors',errs[:5]); await b.close()
asyncio.run(main())
