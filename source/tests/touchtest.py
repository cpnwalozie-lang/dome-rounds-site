import asyncio, os, sys, json
from playwright.async_api import async_playwright
W,H=int(sys.argv[1]),int(sys.argv[2]); tag=sys.argv[3]
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'])
        ctx=await b.new_context(viewport={'width':W,'height':H},is_mobile=True,has_touch=True,device_scale_factor=1)
        pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e))); E=pg.evaluate
        cdp=await ctx.new_cdp_session(pg)
        async def touch(typ,pts): await cdp.send('Input.dispatchTouchEvent',{'type':typ,'touchPoints':[{'x':x,'y':y,'id':i} for (i,x,y) in pts]})
        await pg.goto('file://'+os.path.abspath('index.html')); await pg.wait_for_function('!!window.__game&&window.__game.kenReady()',timeout=240000)
        await E("__game.setAuto(false)"); await asyncio.sleep(1)
        L={'touchOn':await E("document.body.classList.contains('touch')")}
        await E("for(let i=0;i<10;i++) __game.step(1/60); __game.render()"); await pg.screenshot(path=f'/tmp/t_{tag}_menu.png')
        await pg.tap('#startBtn'); await E("for(let i=0;i<230;i++) __game.step(1/60); __game.render()"); await asyncio.sleep(0.3)
        L['state']=await E("__game.state"); L['paused']=await E("__game.paused"); L['uiShown']=await E("getComputedStyle(document.getElementById('touchUI')).display")
        await pg.screenshot(path=f'/tmp/t_{tag}_fight.png')
        p0=await E("[__game.player.pos.x,__game.player.pos.z,__game.player.yaw]")
        # left stick: push up (forward)
        sx,sy=120,H-110
        await touch('touchStart',[(1,sx,sy)]); 
        for k in range(1,6): await touch('touchMove',[(1,sx,sy-12*k)])
        await E("for(let i=0;i<40;i++) __game.step(1/60)"); await asyncio.sleep(0.05)
        L['stick']=await E("[+__game.player.pos.x.toFixed(2),+__game.player.pos.z.toFixed(2)]"); L['p0']=[round(v,2) for v in p0]
        await E("__game.render()"); await pg.screenshot(path=f'/tmp/t_{tag}_stick.png')
        # second finger: look drag on the right while the stick is held
        await touch('touchStart',[(1,sx,sy-60),(2,W*0.62,H*0.4)]); 
        for k in range(1,6): await touch('touchMove',[(1,sx,sy-60),(2,W*0.62+15*k,H*0.4)])
        L['yawChange']=round(await E("__game.player.yaw")-p0[2],3)
        await touch('touchEnd',[])
        # buttons
        r=await E("(()=>{ const g=id=>{ const b=document.getElementById(id).getBoundingClientRect(); return [b.x+b.width/2,b.y+b.height/2,b.width]; }; return {fire:g('tFire'),jump:g('tJump'),block:g('tBlock'),dash:g('tDash'),pause:g('tPause')}; })()")
        L['btns']={k:[round(v) for v in x] for k,x in r.items()}
        f=r['fire']; await touch('touchStart',[(3,f[0],f[1])]); await E("__game.step(1/60)"); L['bulletsAfterFire']=await E("__game.bullets.length"); await touch('touchEnd',[])
        bl=r['block']; await touch('touchStart',[(4,bl[0],bl[1])]); await E("__game.step(1/60)"); L['dome']=await E("__game.player.blockActive"); await touch('touchEnd',[])
        await E("for(let i=0;i<5;i++) __game.step(1/60); __game.render()"); await pg.screenshot(path=f'/tmp/t_{tag}_btn.png')
        pz=r['pause']; await touch('touchStart',[(5,pz[0],pz[1])]); await touch('touchEnd',[]); L['pausedAfterTap']=await E("__game.paused")
        await E("__game.render()"); await pg.screenshot(path=f'/tmp/t_{tag}_pause.png')
        L['errs']=errs[:3]; print(json.dumps(L)); await b.close()
asyncio.run(main())
