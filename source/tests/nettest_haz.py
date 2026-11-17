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
        await A.evaluate("__game.settings.map='foundry'; __game.applyMap('foundry')")
        await A.click('#onlineBtn'); await A.click('#olCreate'); await tick(3); code=await A.inner_text('#olShow')
        await B.click('#onlineBtn'); await B.fill('#olCode',code); await B.click('#olJoin'); await tick(8)
        await tick(110); log['states']=[await pg.evaluate("__game.state") for pg in pages]; log['maps']=[await pg.evaluate("__game.map") for pg in pages]
        await B.evaluate("(()=>{ const P=__game.player; P.pos.set(0.3,0,0.3); P.vel.set(0,0,0); })()"); await A.evaluate("(()=>{ const P=__game.player; P.pos.set(-14,0,8); })()")
        hs=[]
        for k in range(60):
            await B.evaluate("(()=>{ const P=__game.player; if(P.onGround&&P.knockT<=0&&Math.hypot(P.pos.x,P.pos.z)>2) { P.pos.set(0.3,0,0.3); P.vel.set(0,0,0); } })()")
            await tick(3); hs.append((await B.evaluate("Math.round(__game.player.hp)"), await A.evaluate("Math.round(__game.bot.hp)")))
        log['guestHp_guestView_hostView']=sorted(set(hs))
        print(json.dumps(log)); print('errors',errs[:5]); await b.close()
asyncio.run(main())
