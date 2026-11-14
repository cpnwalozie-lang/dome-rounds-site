import asyncio, json, sys, os
from playwright.async_api import async_playwright

HERE = os.path.dirname(os.path.abspath(__file__))

async def main():
    errors = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True,
            args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox','--disable-dev-shm-usage'])
        page = await browser.new_page(viewport={'width':800,'height':450})
        page.on('console', lambda m: errors.append(('console', m.type, m.text)) if m.type in ('error','warning') and 'ERR_FAILED' not in m.text and 'GPU stall' not in m.text else None)
        page.on('pageerror', lambda e: errors.append(('pageerror', str(e))))
        # block google fonts (no network)
        await page.route('**/*', lambda route: route.abort() if route.request.url.startswith('http') else route.continue_())
        await page.goto('file://' + os.path.join(HERE, 'index.html'))
        await page.wait_for_function('!!window.__game', timeout=20000)
        has = await page.evaluate('!!window.__game')
        print('game loaded:', has)
        if not has:
            print(errors); sys.exit(1)
        await page.screenshot(path=os.path.join(HERE,'shot_menu.png'))
        # start match
        await page.click('#startBtn')
        await page.wait_for_timeout(500)
        st = await page.evaluate('__game.state'); print('state after start:', st)
        # stop auto updates, drive manually for determinism
        await page.evaluate('__game.setAuto(false); __game.setRender(false)')
        # run through countdown
        await page.evaluate('for(let i=0;i<210;i++) __game.step(1/60)')
        st = await page.evaluate('__game.state'); print('state after countdown:', st, 'paused:', await page.evaluate('__game.paused'))
        assert st == 'fight', st
        # walk forward, shoot, block, dash, jump for a few seconds
        await page.evaluate('__game.keys.KeyW=true; __game.setMouse(true);')
        await page.evaluate('for(let i=0;i<50;i++){ __game.step(1/60);} __game.setMouse(false); __game.keys.KeyW=false; __game.render()')
        await page.screenshot(path=os.path.join(HERE,'shot_fight_early.png'))
        await page.evaluate('__game.keys.KeyW=true; __game.setMouse(true); for(let i=0;i<190;i++){ if(i%60===0){__game.block();__game.dash();__game.jump();} __game.step(1/60);}')
        info = await page.evaluate('({p:[__game.player.pos.x,__game.player.pos.y,__game.player.pos.z], b:[__game.bot.pos.x,__game.bot.pos.y,__game.bot.pos.z], bullets:__game.bullets.length, hp:[__game.player.hp,__game.bot.hp], state:__game.state})')
        print('after 4s fight:', json.dumps(info))
        await page.evaluate('__game.render()')
        await page.screenshot(path=os.path.join(HERE,'shot_fight.png'))
        await page.evaluate('__game.keys.KeyW=false; __game.setMouse(false);')
        # give every card to both fighters and exercise block + fire with all effects
        cards = await page.evaluate('__game.WAVE1')
        for c in cards:
            await page.evaluate(f'__game.give("player","{c}"); __game.give("bot","{c}")')
        stats = await page.evaluate('__game.player.stats')
        print('stacked stats:', json.dumps({k:(round(v,3) if isinstance(v,float) else v) for k,v in stats.items()}))
        # teleport bot next to player so dome effects trigger
        await page.evaluate('__game.bot.pos.set(__game.player.pos.x+1.5,__game.player.pos.y,__game.player.pos.z); __game.player.hp=__game.player.stats.hp; __game.bot.hp=__game.bot.stats.hp;')
        await page.evaluate('__game.setMouse(true)')
        await page.evaluate('for(let i=0;i<420;i++){ if(i%90===0)__game.block(); if(i%45===0)__game.tryBlock(__game.bot); __game.step(1/60);}')
        info = await page.evaluate('({bullets:__game.bullets.length, bombs:__game.bombs.length, hp:[__game.player.hp,__game.bot.hp], state:__game.state, score:__game.score})')
        print('after effects storm:', json.dumps(info))
        await page.evaluate('__game.render()')
        await page.screenshot(path=os.path.join(HERE,'shot_storm.png'))
        # force a round end if still fighting, run through roundover -> draft
        if info['state'] == 'fight':
            await page.evaluate('__game.killFighter(__game.bot,__game.player)')
        await page.evaluate('for(let i=0;i<200;i++) __game.step(1/60)')
        st = await page.evaluate('__game.state'); print('state after roundover:', st)
        await page.evaluate('__game.render()')
        await page.screenshot(path=os.path.join(HERE,'shot_draft.png'))
        n = await page.evaluate('document.querySelectorAll("#cards .card").length'); print('draft cards shown:', n)
        assert n == 3
        await page.click('#cards .card')
        await page.wait_for_timeout(700)
        st = await page.evaluate('__game.state'); print('state after pick:', st)
        await page.evaluate('for(let i=0;i<220;i++) __game.step(1/60)')
        st = await page.evaluate('__game.state'); print('state after countdown 2:', st)
        assert st == 'fight'
        # play many rounds quickly by killing alternately until match over
        for r in range(12):
            st = await page.evaluate('__game.state')
            if st == 'fight':
                who = 'bot' if r % 3 else 'player'
                await page.evaluate(f'__game.killFighter(__game.{who}, __game.{"player" if who=="bot" else "bot"})')
            await page.evaluate('for(let i=0;i<190;i++) __game.step(1/60)')
            st = await page.evaluate('__game.state')
            if st == 'draft':
                await page.click('#cards .card')
                await page.wait_for_timeout(700)
                await page.evaluate('for(let i=0;i<220;i++) __game.step(1/60)')
            if st == 'matchover': break
        st = await page.evaluate('__game.state'); sc = await page.evaluate('__game.score'); print('final:', st, sc)
        await page.evaluate('__game.render()')
        await page.screenshot(path=os.path.join(HERE,'shot_end.png'))
        # play again
        if st == 'matchover':
            await page.click('#againBtn')
            await page.evaluate('for(let i=0;i<80;i++) __game.step(1/60)')
            print('after play again:', await page.evaluate('__game.state'))
        # fall into water test
        await page.evaluate('__game.forceFight(); __game.player.pos.set(0,0,30); __game.player.hp=50;')
        await page.evaluate('for(let i=0;i<120;i++) __game.step(1/60)')
        print('after fall:', await page.evaluate('__game.state'), await page.evaluate('__game.player.dead'))
        # all card art renders
        bad = await page.evaluate('__game.WAVE1.filter(id=>{const d=document.createElement("div");d.innerHTML=__game.art(id);return !d.querySelector("svg")||d.querySelector("parsererror")})')
        print('bad art:', bad)
        await browser.close()
    print('ERRORS:', len(errors))
    for e in errors[:20]: print(e)
    sys.exit(1 if errors else 0)

asyncio.run(main())
