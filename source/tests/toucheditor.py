import asyncio, os, json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'])
        ctx=await b.new_context(viewport={'width':844,'height':390},is_mobile=True,has_touch=True,device_scale_factor=1)
        pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e))); E=pg.evaluate
        cdp=await ctx.new_cdp_session(pg)
        async def touch(typ,pts): await cdp.send('Input.dispatchTouchEvent',{'type':typ,'touchPoints':[{'x':x,'y':y,'id':i} for (i,x,y) in pts]})
        await pg.goto('file://'+os.path.abspath('index.html')); await pg.wait_for_function('!!window.__game&&window.__game.kenReady()',timeout=240000)
        await E("__game.setAuto(false)"); await asyncio.sleep(0.5)
        await pg.tap('#howBtn'); await asyncio.sleep(0.2); await E("document.querySelector('#how .tEditBtn').scrollIntoView()"); await pg.tap('#how .tEditBtn'); await asyncio.sleep(0.3)
        g=lambda id: E(f"(()=>{{ const r=document.getElementById('{id}').getBoundingClientRect(); return [Math.round(r.x+r.width/2),Math.round(r.y+r.height/2),Math.round(r.width)]; }})()")
        L={'fireBefore':await g('tFire')}
        f=L['fireBefore']; await touch('touchStart',[(1,f[0],f[1])])
        for k in range(1,8): await touch('touchMove',[(1,f[0]-20*k,f[1]-15*k)])
        await touch('touchEnd',[])
        await E("const s=document.getElementById('tSize'); s.value=1.3; s.dispatchEvent(new Event('input'))")
        await E("__game.render()"); await pg.screenshot(path='/tmp/tedit.png')
        await pg.tap('#tDone'); L['saved']=await E("localStorage.getItem('dr_touch_layout')")[:0] if False else await E("JSON.parse(localStorage.getItem('dr_touch_layout')).s")
        await E("document.getElementById('how').classList.remove('open')")
        await pg.tap('#startBtn'); await E("for(let i=0;i<230;i++) __game.step(1/60); __game.render()"); await asyncio.sleep(0.2)
        L['fireInGame']=await g('tFire')
        f=L['fireInGame']; await touch('touchStart',[(2,f[0],f[1])]); await E("__game.step(1/60)"); L['bullets']=await E("__game.bullets.length"); await touch('touchEnd',[])
        await E("__game.render()"); await pg.screenshot(path='/tmp/tedit2.png')
        L['errs']=errs[:3]; print(json.dumps(L)); await b.close()
asyncio.run(main())
