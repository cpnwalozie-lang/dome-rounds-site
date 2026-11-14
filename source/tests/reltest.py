import asyncio, os
from playwright.async_api import async_playwright
from PIL import Image
HERE=os.path.dirname(os.path.abspath(__file__))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'])
        pg=await b.new_page(viewport={'width':1280,'height':720}); errs=[]
        pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text[:200]) if m.type in('error','warning') and 'ERR_FAILED' not in m.text and 'GPU stall' not in m.text else None)
        await pg.route('**/*',lambda r: r.abort() if r.request.url.startswith('http') else r.continue_())
        await pg.goto('file://'+os.path.join(HERE,'release.html'))
        shots=[]
        for t in [150,1050]:
            await pg.wait_for_timeout(t if not shots else t-150); pth=os.path.join(HERE,f'r{len(shots)}.png'); await pg.screenshot(path=pth); shots.append(pth)
        await pg.wait_for_timeout(2200); pth=os.path.join(HERE,'r2.png'); await pg.screenshot(path=pth); shots.append(pth)
        print('hook present:', await pg.evaluate('typeof window.__game'))
        await pg.click('#startBtn'); await pg.wait_for_timeout(4500)
        await pg.keyboard.down('KeyW'); await pg.mouse.down(); await pg.wait_for_timeout(1500); await pg.mouse.up(); await pg.keyboard.up('KeyW')
        pth=os.path.join(HERE,'r3.png'); await pg.screenshot(path=pth); shots.append(pth)
        ims=[Image.open(s).resize((640,360)) for s in shots]; sh=Image.new('RGB',(1280,720)); [sh.paste(im,((k%2)*640,(k//2)*360)) for k,im in enumerate(ims)]; sh.save(os.path.join(HERE,'release_flow.png'))
        print('errors', errs[:6]); await b.close()
asyncio.run(main())
