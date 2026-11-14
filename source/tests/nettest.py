import asyncio, os, json
from playwright.async_api import async_playwright
from PIL import Image
MOCK=r"""
window.__mock={me:'p'+Math.random().toString(36).slice(2,8), mine:{}, others:{}, handlers:[], room:null};
window.claude={use:async(n)=>n!=='room'?null:{ join:async(name)=>{ const M=window.__mock; M.room=name; M.mine={}; const R={name, presence:async(p)=>{ for(const k in p){ if(p[k]===null) delete M.mine[k]; else M.mine[k]=p[k]; } }, peers:()=>[{peer:M.me,sameTab:true,isMe:true,kind:'viewer',guest:false,by:null,presence:M.mine,updatedAt:Date.now()}].concat(Object.entries(M.others).map(([k,v])=>({peer:k,sameTab:false,isMe:false,kind:'viewer',guest:false,by:null,presence:v,updatedAt:Date.now()}))), onPeers:(fn)=>{ M.handlers.push(fn); return ()=>{}; }, leave:async()=>{ M.room=null; M.handlers=[]; }, connected:()=>true, onConnection:()=>()=>{} }; M.R=R; return R; } }};
window.__mockOut=()=>{ const M=window.__mock; return M.room?JSON.stringify({room:M.room,me:M.me,p:M.mine}):null; };
window.__mockIn=(peer,p)=>{ const M=window.__mock; if(!M.R||!M.room) return; const was=!!M.others[peer]; if(p===null) delete M.others[peer]; else M.others[peer]=p; const peers=M.R.peers(); for(const h of M.handlers.slice()) h({peers,joined:[],left:[],updated:[]}); };
"""
async def main():
    async with async_playwright() as pw:
        b=await pw.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'])
        pages=[]; errs=[]
        for k in range(2):
            pg=await b.new_page(viewport={'width':640,'height':360}); pg.on('pageerror',lambda e,k=k: errs.append((k,str(e)))); await pg.add_init_script(MOCK)
            await pg.goto('file://'+os.path.abspath('index.html')); await pg.wait_for_function('!!window.__game')
            await pg.evaluate("__game.setAuto(false); __game.setRender(false);"); pages.append(pg)
        A,B=pages
        async def tick(n=1,dt=1/30):
            for _ in range(n):
                for pg in pages: await pg.evaluate(f"__game.step({dt})")
                outs=[json.loads(o) if o else None for o in [await pg.evaluate("window.__mockOut()") for pg in pages]]
                for i,pg in enumerate(pages):
                    o=outs[1-i]
                    if o and outs[i] and o['room']==outs[i]['room']: await pg.evaluate("([a,b])=>window.__mockIn(a,b)",[o['me'],o['p']])
        log={}
        await A.click('#onlineBtn'); await A.click('#olCreate'); await tick(3)
        code=await A.inner_text('#olShow'); log['code']=code
        await B.click('#onlineBtn'); await B.fill('#olCode',code); await B.click('#olJoin'); await tick(3)
        await A.wait_for_timeout(900); await tick(4)
        log['states']=[await pg.evaluate("__game.state") for pg in pages]
        await tick(110)  # through the countdown
        log['fight']=[await pg.evaluate("__game.state") for pg in pages]
        log['pos']=[await pg.evaluate("[__game.player.pos.x.toFixed(1),__game.bot.pos.x.toFixed(1)]") for pg in pages]
        await A.evaluate("(()=>{ const P=__game.player; P.pos.set(-4,__game.groundAt(-4,7,5,0.3),7); })()"); await B.evaluate("(()=>{ const P=__game.player; P.pos.set(2,__game.groundAt(2,7,5,0.3),7); })()"); await tick(20)
        log['pos2']=[await pg.evaluate("[__game.player.pos.x.toFixed(1),__game.bot.pos.x.toFixed(1),__game.bot.pos.z.toFixed(1)]") for pg in pages]
        # host shoots at the guest
        for _ in range(4):
            await A.evaluate("(()=>{ const P=__game.player,B=__game.bot; const d=new THREE.Vector3().subVectors(B.pos,P.pos); P.yaw=Math.atan2(-d.x,-d.z); P.pitch=0; __game.step(1/60); __game.tryFire(P,true); })()")
            await tick(4)
        log['guestSawBullets']=await B.evaluate("__game.bullets.length")
        await tick(30)
        log['hp']=[await pg.evaluate("[Math.round(__game.player.hp),Math.round(__game.bot.hp)]") for pg in pages]
        # guest shoots at host and blocks
        await B.evaluate("(()=>{ const P=__game.player,B=__game.bot; const d=new THREE.Vector3().subVectors(B.pos,P.pos); P.yaw=Math.atan2(-d.x,-d.z); P.pitch=0; __game.step(1/60); __game.tryFire(P,true); __game.tryBlock(P); })()")
        await tick(3); log['hostSawGuestDome']=await A.evaluate("__game.bot.blockActive")
        await tick(30)
        log['hp2']=[await pg.evaluate("[Math.round(__game.player.hp),Math.round(__game.bot.hp)]") for pg in pages]
        # host finishes the guest
        await A.evaluate("__game.bot.hp=1"); 
        for _ in range(6):
            await A.evaluate("(()=>{ const P=__game.player,B=__game.bot; const d=new THREE.Vector3().subVectors(B.pos,P.pos); P.yaw=Math.atan2(-d.x,-d.z); P.pitch=0; P.fireCd=0; P.ammo=3; P.reloading=false; __game.step(1/60); __game.tryFire(P,true); })()")
            await tick(5)
            if await A.evaluate("__game.state")=='roundover': break
        await tick(6)
        log['ko']=[await pg.evaluate("[__game.state,__game.score.player,__game.score.bot]") for pg in pages]
        await tick(120)
        log['draft']=[await pg.evaluate("__game.state") for pg in pages]
        print(json.dumps(log)); print('errors',errs)
        log['cardsEl']=[await pg.evaluate("document.querySelectorAll('#cards .card').length+' '+document.getElementById('cards')?.children.length") for pg in pages]; print(log['cardsEl'])
        await A.evaluate("document.querySelector('#cards .card').click()"); await tick(5)
        log['hostPicked']=[await pg.evaluate("__game.state") for pg in pages]
        await B.evaluate("document.querySelector('#cards .card').click()"); await tick(8)
        log['round2']=[await pg.evaluate("[__game.state,__game.roundInfo?0:0]") for pg in pages]
        log['cards']=[await pg.evaluate("[__game.player.cards.join(),__game.bot.cards.join()]") for pg in pages]
        await tick(110)
        log['r2fight']=[await pg.evaluate("__game.state") for pg in pages]
        await A.evaluate("__game.render()"); await B.evaluate("__game.render()")
        ims=[]
        for pg in pages: await pg.screenshot(path='t.png'); ims.append(Image.open('t.png').copy())
        s=Image.new('RGB',(1280,360)); [s.paste(im,(k*640,0)) for k,im in enumerate(ims)]; s.save('nettest.png')
        # guest leaves
        await B.evaluate("__game.toMenu()"); 
        o=await A.evaluate("window.__mockOut()"); await A.evaluate("([a])=>window.__mockIn(a,null)",[json.loads(await B.evaluate("JSON.stringify(window.__mock.me)"))])
        await tick(2); await A.wait_for_timeout(1500); await tick(2)
        log['afterLeave']=[await pg.evaluate("__game.state") for pg in pages]
        print(json.dumps(log,indent=0)); print('errors',errs)
        await b.close()
asyncio.run(main())
