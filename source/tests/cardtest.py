import asyncio, os, json
from playwright.async_api import async_playwright
exec(open('fxtest.py').read().split('async def main')[0])
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'])
        pg=await b.new_page(viewport={'width':640,'height':400}); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
        await pg.goto('file://'+os.path.abspath('index.html')); await pg.wait_for_function('!!window.__game&&window.__game.kenReady()',timeout=180000)
        await pg.evaluate(SETUP); log={}
        # 1 dome colour
        log['dome']=await pg.evaluate("(()=>{ const G=__game,P=G.player; P.setCards(['frostslam']); const a=P.domePal.map(c=>c.getHexString()); P.setCards(['frostslam','shockwave']); const b2=P.domePal.length; P.setCards([]); return {one:a, fsColour:G.CARDS.frostslam.c, two:b2}; })()")
        # 2 remote + barrage formation
        log['remote']=await pg.evaluate("""(()=>{ const G=__game,P=G.player; P.setCards(['remote','barrage']); H.place([-4,7],[6,7]); P.fireCd=0; G.tryFire(P,true); const bl=G.bullets.filter(b=>b.owner===P); const lead=G.remoteCtl.b; const n=bl.length, fol=bl.filter(b=>b.follow===lead).length;
            const before=bl.filter(b=>b.follow).map(b=>b.vel.clone().normalize()); G.remoteCtl.yaw+=0.6; for(let i=0;i<6;i++) G.step(1/60); const after=bl.filter(b=>b.follow&&!b.gone).map(b=>b.vel.clone().normalize());
            const turned=after.length? after.reduce((a,v,i)=>a+v.angleTo(before[i]),0)/after.length : 0; const leadTurn=lead? 0:0; for(let i=0;i<120;i++) G.step(1/60); P.setCards([]); return {pellets:n,followers:fol,avgTurn:+turned.toFixed(2)}; })()""")
        # 3 thruster: shoot the dummy in the back -> it moves in its facing direction
        log['thr']=await pg.evaluate("""(()=>{ const G=__game,P=G.player,B=G.bot; P.setCards(['thruster']); H.place([-4,7],[2,7]); B.yaw=Math.PI/2; /* faces -x (toward player) */ const b=G.firePellets?null:null;
            G.holdBot(false); G.tryFire(P,true); let hit=false; for(let i=0;i<40;i++){ G.step(1/60); if(B.thrusters.length){ hit=true; break; } } const th=B.thrusters[0]; const loc=th?th.local.toArray().map(v=>+v.toFixed(2)):null; const d0=th?th.dir.toArray().map(v=>+v.toFixed(2)):null;
            const x0=B.pos.x; for(let i=0;i<20;i++) G.step(1/60); const pushX=B.pos.x-x0;
            B.yaw+=Math.PI/2; G.step(1/60); const d1=th?th.dir.toArray().map(v=>+v.toFixed(2)):null; P.setCards([]); G.holdBot(false); return {hit,local:loc,dirBefore:d0,dirAfterTurn:d1,pushX:+pushX.toFixed(2)}; })()""")
        # 4 healing field heals anyone (the dummy owns it, the player stands in it)
        log['heal']=await pg.evaluate("""(()=>{ const G=__game,P=G.player,B=G.bot; B.setCards(['healingfield']); H.place([1,7],[2,7]); P.hp=20; B.hp=B.maxHp()*0.3; G.doBlock(B); const p0=P.hp,b0=B.hp; for(let i=0;i<90;i++) G.step(1/60); const r={playerGain:P.hp-p0, botGain:Math.round(B.hp-b0)}; B.setCards([]); return r; })()""")
        # 5 reflect: poison shot into an active dome comes back and poisons the shooter
        log['reflect']=await pg.evaluate("""(()=>{ const G=__game,P=G.player,B=G.bot; P.setCards(['poison']); B.setCards([]); H.place([-4,7],[3,7]); G.holdBot(true); P.hp=P.maxHp(); G.doBlock(B); G.tryFire(P,true);
            let refl=false; const hp0=P.hp; for(let i=0;i<70;i++){ G.step(1/60); if(G.bullets.some(b=>b.reflected)) refl=true; } const r={reflected:refl, shooterHpLoss:Math.round(hp0-P.hp), shooterPoisoned:P.poisons.length>0, dummyHp:Math.round(B.hp)+'/'+B.maxHp()}; P.setCards([]); G.holdBot(false); return r; })()""")
        print(json.dumps(log,indent=1)); print('errors',errs); await b.close()
asyncio.run(main())
