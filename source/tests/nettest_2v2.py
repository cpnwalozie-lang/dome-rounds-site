import asyncio, os, json, sys
URLQ=sys.argv[1] if len(sys.argv)>1 else ''
from playwright.async_api import async_playwright
MOCK=open('nettest.py').read().split('MOCK=r"""')[1].split('"""')[0]
async def main():
    async with async_playwright() as pw:
        b=await pw.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'])
        pages=[]; errs=[]
        for k in range(3):
            pg=await b.new_page(viewport={'width':640,'height':360}); pg.on('pageerror',lambda e,k=k: errs.append((k,str(e)))); await pg.add_init_script(("" if URLQ else MOCK)+"\nHTMLCanvasElement.prototype.requestPointerLock=function(){ return Promise.reject(new Error('t')); };")
            await pg.goto('file://'+os.path.abspath('index.html')+URLQ); await pg.wait_for_function('!!window.__game&&window.__game.kenReady()',timeout=240000)
            await pg.evaluate("__game.setAuto(false); __game.setRender(false);"); pages.append(pg)
        A,B,C=pages
        async def tick(n=1,dt=1/30,live=None):
            live=live or pages
            for _ in range(n):
                for pg in live: await pg.evaluate(f"__game.step({dt})")
                if URLQ: await asyncio.sleep(0.04); continue
                outs=[json.loads(o) if o else None for o in [await pg.evaluate("window.__mockOut()") for pg in live]]
                for i,pg in enumerate(live):
                    for j,o in enumerate(outs):
                        if i!=j and o and outs[i] and o['room']==outs[i]['room']: await pg.evaluate("([a,b])=>window.__mockIn(a,b)",[o['me'],o['p']])
        log={}
        for pg,nm in [(A,'Chris'),(B,'Stephanie'),(C,'Tunde')]:
            await pg.click('[data-seg="gm"] button[data-v="2v2"]'); await pg.click('#onlineBtn'); await pg.fill('#olName',nm)
        await A.click('#olCreate'); await A.wait_for_function("document.getElementById('olShow').textContent.length===5&&document.getElementById('olShow').textContent!=='-----'",timeout=20000); await tick(3); code=await A.inner_text('#olShow'); log['code']=code
        for pg in [B,C]: await pg.fill('#olCode',code); await pg.click('#olJoin'); await tick(40 if URLQ else 4)
        await tick(4)
        log['lobbyHost']=await A.inner_text('#olSeats'); log['lobbyGuest']=await C.inner_text('#olSeats'); log['startDisabled']=await A.evaluate("document.getElementById('olStart').disabled")
        await A.click('#olAddBot'); await tick(3); log['lobbyAfterBot']=await B.inner_text('#olSeats')
        await A.click('#olStart'); await tick(6)
        log['states']=[await pg.evaluate("__game.state") for pg in pages]
        roster="__game.fighters.slice().sort((a,b)=>a.slot-b.slot).map(f=>f.slot+':'+f.name+':'+f.ctl+':'+f.team.id)"
        log['rosters']=[await pg.evaluate(roster) for pg in pages]
        await tick(110)
        log['fight']=[await pg.evaluate("__game.state") for pg in pages]
        await tick(30)
        pos="__game.fighters.slice().sort((a,b)=>a.slot-b.slot).map(f=>f.pos.x.toFixed(0)+','+f.pos.z.toFixed(0))"
        log['positions']=[await pg.evaluate(pos) for pg in pages]
        # host knocks out Stephanie (seat 1)
        await A.evaluate("(()=>{ const G=__game; const f=G.fighters.find(x=>x.slot===1); G.applyDamage(f,999,G.player); })()"); await tick(8)
        dead="__game.fighters.slice().sort((a,b)=>a.slot-b.slot).map(f=>f.dead?1:0).join('')"
        log['afterKO1']=[await pg.evaluate(dead) for pg in pages]; log['stephSpectating']=await B.evaluate("document.getElementById('specMsg').textContent")
        # then Tunde and the bot -> host wins the round
        await A.evaluate("(()=>{ const G=__game; for(const s of [3]){ const f=G.fighters.find(x=>x.slot===s); G.applyDamage(f,999,G.player); } })()"); await tick(8)
        log['roundover']=[await pg.evaluate("[__game.state,"+dead+",__game.fighters.slice().sort((a,b)=>a.slot-b.slot).map(f=>f.score).join('')]") for pg in pages]
        await tick(110)
        log['draft']=[await pg.evaluate("__game.state") for pg in pages]
        log['botCardsOnGuest']=await C.evaluate("__game.fighters.find(f=>f.slot===3).cards.length")
        for pg in pages: await pg.evaluate("document.querySelector('#cards .card').click()")
        await tick(12)
        log['round2']=[await pg.evaluate("[__game.state,__game.roundNum,__game.player.cards.length]") for pg in pages]
        log['cardsSeen']=[await pg.evaluate("__game.fighters.slice().sort((a,b)=>a.slot-b.slot).map(f=>f.cards.length).join('')") for pg in pages]
        await tick(110); log['r2fight']=[await pg.evaluate("__game.state") for pg in pages]
        # Tunde leaves mid-round
        await C.evaluate("__game.toMenu()"); await tick(4,live=[A,B,C]);
        if not URLQ: await A.evaluate("window.__mockIn(Object.keys(window.__mock.others).find(k=>window.__mock.others[k].nm==='Tunde'),null)"); await B.evaluate("window.__mockIn(Object.keys(window.__mock.others).find(k=>window.__mock.others[k].nm==='Tunde'),null)")
        await tick(60 if URLQ else 8,live=[A,B])
        log['afterLeave']=[await pg.evaluate("[__game.state,__game.fighters.length,"+dead+"]") for pg in [A,B]]
        print(json.dumps(log)); print('errors',errs); await b.close()
asyncio.run(main())
