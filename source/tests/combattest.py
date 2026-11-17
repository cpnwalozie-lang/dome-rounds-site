import asyncio, os, json
from playwright.async_api import async_playwright
from PIL import Image
SETUP=open('fxtest.py').read().split('SETUP="""')[1].split('"""')[0]
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'])
        pg=await b.new_page(viewport={'width':640,'height':400}); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
        await pg.add_init_script("HTMLCanvasElement.prototype.requestPointerLock=function(){ return Promise.reject(new Error('t')); };")
        await pg.goto('file://'+os.path.abspath('index.html')); await pg.wait_for_function('!!window.__game&&window.__game.kenReady()',timeout=240000)
        await pg.evaluate(SETUP); ims=[]; L={}; E=pg.evaluate
        async def snap(): await pg.screenshot(path='t.png'); ims.append(Image.open('t.png').copy())
        await E("__game.settings.assist=false; __game.player.setCards([]); __game.bot.setCards([]); H.place([-4,7],[3,7])")
        L['base']=await E("[__game.player.stats.reload,__game.player.stats.blockCd]")
        await E("const P=__game.player; P.pitch=0.6; __game.tryFire(P,true); H.step(60)"); L['ammoAfter1s']=await E("__game.player.ammo")
        await E("H.step(190)"); L['ammoAfter4.2s']=await E("__game.player.ammo")
        # dead dome
        await E("const B=__game.bot; __game.doBlock(B); H.step(3); __game.killFighter(B); H.step(5)"); L['deadDome']=await E("[__game.bot.dome.visible,__game.bot.blockActive]")
        # size
        await E("__game.player.setCards(['tank','tank']); __game.bot.setCards(['glasscannon']); H.place([-4,7],[3,7])")
        L['size']=await E("[__game.player.sz.toFixed(2),__game.player.speedFactor().toFixed(2),__game.bot.sz.toFixed(2),__game.bot.speedFactor().toFixed(2)]")
        await E("const B=__game.bot,P=__game.player; H.shot([-0.5,2.4,1.5],[-0.5,1.2,7])"); await snap()
        # air dash + back dash
        await E("__game.player.setCards([]); H.place([-4,7],[3,-7]); const P=__game.player; P.vel.y=8; P.onGround=false; H.step(5); __game.dash(); H.step(1)")
        L['airDash']=await E("[__game.player.dashT>0, __game.player.airDashed]")
        await E("const P=__game.player; P.dashT=0; P.dashCdT=0; __game.dash(); H.step(1)"); L['secondAirDash']=await E("__game.player.dashT>0")
        await E("H.step(90); const P=__game.player; P.dashCdT=0; __game.keys.KeyS=true; __game.dash(); H.step(2); __game.keys.KeyS=false")
        L['backDashDot']=await E("(()=>{ const P=__game.player; return +P.dashDir.dot(P.forward()).toFixed(2); })()")
        # dazzle anti-spam: barrage + dazzle
        await E("__game.player.setCards(['barrage','dazzle']); __game.bot.setCards([]); H.place([-4,7],[0,7]); __game.tryFire(__game.player,true); H.step(12)")
        L['dazzleN']=await E("__game.bot.dazzleN"); await E("H.step(130)"); L['dazzleDoneImm']=await E("[__game.bot.dazzleN,+(__game.bot.dazzleImm||0).toFixed(2)]")
        # EMP tiles
        await E("__game.player.setCards(['emp']); H.place([-2,7],[3,-7]); __game.doBlock(__game.player); H.step(12)")
        await E("H.shot([-2,8,-3],[-2,0.5,7],70)"); await snap()
        await E("H.step(70)"); L['empLeft']=await E("__game.bullets.length")
        # static field sparks with bot inside
        await E("__game.player.setCards(['staticfield','staticfield']); H.place([-4,7],[-1.5,7]); H.step(30)")
        await E("H.shot([-2.5,3.2,1.5],[-2.7,1.2,7])"); await snap()
        # poison splash/drip
        await E("__game.player.setCards(['poison']); H.place([-4,7],[0,7]); __game.tryFire(__game.player,true); H.step(9)"); await E("H.shot([-1.5,2.2,4.5],[0,1.2,7])"); await snap()
        L['poisons']=await E("__game.bot.poisons.length")
        # arc shot
        await E("__game.player.setCards(['arcshot']); H.place([-14,7],[3,-7]); const P=__game.player; P.yaw=-Math.PI/2; P.pitch=0.25; __game.tryFire(P,true); H.step(2)"); L['arc0']=await E("__game.bullets.map(b=>+b.vel.y.toFixed(1)).slice(0,3)"); await E("H.step(18)")
        L['arc']=await E("__game.bullets.map(b=>+b.vel.y.toFixed(1)).slice(0,3)")
        await E("H.shot([-6,6,-3],[-6,3,7],70)"); await snap()
        # leftover tags: mode switch
        L['errs']=errs[:5]; print(json.dumps(L))
        W=sum(i.width for i in ims); out=Image.new('RGB',(W,ims[0].height)); x=0
        for i in ims: out.paste(i,(x,0)); x+=i.width
        out.save('combat.png'); await b.close()
asyncio.run(main())
