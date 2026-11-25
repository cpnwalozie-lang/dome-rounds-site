# Builds the game: index.html (debug, with test hooks) and release.html (minified), and copies release to ../play/index.html.
# Run from this folder: python3 build.py   (needs Python 3 and Node for npx terser)

shell = open('shell.html').read()
three = open('vendor/three.min.js').read() + '\n' + open('vendor/post.js').read() + '\n' + open('vendor/GLTFLoader.js').read() + '\n' + open('vendor/mp4-muxer.min.js').read()
parts = ['p1_core.js','p2_art.js','p3_gfx.js','p3b_maps.js','p3c_bake.js','p3d_baked.js','p3e_detail_data.js','p3f_detail.js','p3g_kenney_data.js','p3h_kenney.js','p3i_look.js','p3j_maps2.js','p3k_skyfort.js','p4_fighter.js','p5_fx.js','p5b_cardfx.js','p6_game.js','p6b_touch.js','p6c_studio.js','p6d_clip.js','p7_online.js','p7b_battle.js','p7c_menu.js','p7d_version.js','p7e_tutor.js','p7f_secret.js']
game = "(function(){\n'use strict';\nfunction __boot(){\n" + "\n".join(open(p).read() for p in parts) + "\n}\nlet __started=false; function __go(){ if(__started) return; __started=true; try{ __boot(); }catch(e){ console.error(e); const l=document.getElementById('loading'); if(l) l.textContent='Something broke while loading: '+e.message; } }\ntry{ Promise.race([document.fonts.load('40px \"Lilita One\"'), new Promise(r=>setTimeout(r,1500))]).then(__go,__go); }catch(e){ __go(); }\nsetTimeout(__go,2000);\n})();"
open('game.js','w').write(game)
PEER = '<script>\n' + open('vendor/peerjs.min.js').read() + '\n</script>\n'
out = shell.replace('<!--THREE-->', PEER + '<script>\n' + three + '\n</script>').replace('<!--GAME-->', '<script>\n' + game + '\n</script>')
open('index.html', 'w').write(out)  # debug build (test hooks), for tests/
print('index.html', len(out), 'bytes')

# ---- release build: no debug hooks, no comments, minified ----
import re, subprocess, tempfile, os
TERSER='npx'
rel_game = re.sub(r'/\*DEBUG-START\*/.*?/\*DEBUG-END\*/', '', game, flags=re.S)
def mini(js, extra=()):
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False) as f: f.write(js); p=f.name
    out=subprocess.run([TERSER, '-y', 'terser', p, '-c', 'passes=2', '-m', '--comments', 'false', *extra], capture_output=True, text=True)
    os.unlink(p)
    if out.returncode: raise SystemExit('terser failed: '+out.stderr[:800])
    return out.stdout
rel_game = mini(rel_game)
rel_post = mini(open('vendor/post.js').read() + '\n' + open('vendor/GLTFLoader.js').read())
rel_shell = re.sub(r'/\*.*?\*/', '', shell, flags=re.S)
rel_shell = re.sub(r'<!--(?!THREE|GAME).*?-->', '', rel_shell, flags=re.S)
rel_shell = re.sub(r'\n\s+', '\n', rel_shell)
rel = rel_shell.replace('<!--THREE-->', PEER + '<script>\n' + open('vendor/three.min.js').read() + '\n' + rel_post + '\n' + open('vendor/mp4-muxer.min.js').read() + '\n</script>').replace('<!--GAME-->', '<script>' + rel_game + '</script>')
open('release.html', 'w').write(rel)
open('../play/index.html', 'w').write(rel)  # the live game page
print('release.html', len(rel), 'bytes')

# the live version number, so open copies of the game can tell a newer one is out
import json as _j
_v=re.search(r'Version\s+([\d.]+)',shell)
open('../play/version.json','w').write(_j.dumps({'v':_v.group(1) if _v else '0'}))
print('version', _v.group(1) if _v else '?')
