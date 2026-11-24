# Domes source

Everything needed to rebuild the game. The live site serves `../play/index.html`, which `build.py` writes.

## Change the game
1. Edit the `p*.js` files (and `shell.html` for menus, HUD and styling).
2. `python3 build.py` (Python 3 and Node). It writes `index.html` (debug build with test hooks), `release.html` (minified) and copies the release to `../play/index.html`.
3. Commit and push to `main`. Netlify publishes the site within a minute or two.

## Where things are
| File | What |
|---|---|
| `p1_core.js` | Settings, base stats, all 54 cards, sound effects |
| `p2_art.js` | Card art |
| `p3_gfx.js`, `p3b_maps.js` | Renderer, materials, Dockside and Neon City maps, collisions |
| `p3c`–`p3h` | Baked lighting, surface detail, Kenney background models (CC0) |
| `p4_fighter.js` | The character, animation, domes |
| `p5_fx.js`, `p5b_cardfx.js` | Shooting, damage, card effects |
| `p6_game.js` | Game loop, rounds, card pick, HUD, bot AI |
| `p6d_clip.js` | Clip recorder: keeps the last 20 seconds and saves them as an .mp4 (C key or the clip button) |
| `p7_online.js` | Online play: room codes, the game server, direct and relay fallbacks |
| `vendor/` | three.js r128, post-processing, GLTF loader, PeerJS, mp4-muxer (MIT) |
| `tests/` | Playwright checks (`test.py` full flow, `soak.py` bot-vs-bot, `reltest.py`, `nettest.py`) |

## Online play
The game connects to the room server (`cpnwalozie-lang/dome-rounds-server`, Cloudflare) first, then falls back to a direct WebRTC link (PeerJS) and the Metered relay on port 443. Add `?server=<url>` to the game URL to point it at another server.
