const T = THREE;
const V3 = (x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const rand=(a,b)=>a+Math.random()*(b-a);
const approach=(v,target,maxDelta)=> v<target ? Math.min(target,v+maxDelta) : Math.max(target,v-maxDelta);
function RNG(seed){ let a=seed|0; return ()=>{ a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
const col = hex => new T.Color(hex).convertSRGBToLinear();
const HEXS = c => '#'+c.toString(16).padStart(6,'0');
const $ = id => document.getElementById(id);

// ================= CONFIG =================
const CFG = {
  gravity:26, moveSpeed:7.8, jumpVel:11.8, dashSpeed:26, dashTime:0.17, dashCd:2.0,
  blockDuration:0.55, step:0.55, winsToTakeMatch:5, roundOverTime:2.8,
  killY:-2.2,
};
const NET={on:false,role:null,fireOrigin:null,allowKill:false,started:false,rCards:'',rShot:-1,rBlock:-1,shots:[],shotId:0,blockN:0,mid:0,rMid:0,hits:[],hitSeq:0,hitSeen:{},clk:{}};
const BASE = { hp:100, dmg:40, ammo:3, reload:4.0, fireInt:0.38, speed:42, size:0.24, blockCd:4.0, dome:4.0, aura:4.5 };
const TEAM = {
  player:{ body:0x19c8ff, light:0x8fe9ff, dark:0x0b5c88, band:0xffffff, cannon:0x2460e6, ink:0x19b4ff, css:'#19c8ff' },
  bot:   { body:0xff7a1a, light:0xffc27a, dark:0x8a3604, band:0x1b2340, cannon:0xc2301c, ink:0xff7a1a, css:'#ff7a1a' },
  green: { body:0x35d977, light:0xa8ffc9, dark:0x0d6b33, band:0xffffff, cannon:0x15964a, ink:0x35d977, css:'#35d977' },
  purple:{ body:0xa46bff, light:0xd9c4ff, dark:0x45208e, band:0x1b2340, cannon:0x6a35d6, ink:0xa46bff, css:'#a46bff' },
};
for(const k in TEAM) TEAM[k].id=k;
const SLOT_TEAMS=['player','bot','green','purple']; // FFA seat colours, same on every screen
const INK = 0x0b1026;

// ================= SETTINGS =================
const TOUCH={ on:(()=>{ try{ return matchMedia('(pointer: coarse)').matches&&navigator.maxTouchPoints>0; }catch(e){ return false; } })(), mx:0, my:0, fire:false }; // phone/tablet controls (filled in by the touch module)
const settings = { sens:1, vol:0.8, music:0.5, invertY:false, swap:false, quality:'auto', diff:'easy', map:'dock', assist:true, gm:'1v1', ffaBots:'3', name:'' };
const DIFF={ easy:{name:'Easy',err:0.2,fire:[0.2,0.45],rest:[1.3,2.4],block:0.25,dodge:0.1,react:0.3,dmg:0.6,speed:0.8}, normal:{name:'Normal',err:0.085,fire:[0.3,0.7],rest:[0.8,1.6],block:0.6,dodge:0.3,react:0.15,dmg:0.85,speed:0.95}, hard:{name:'Hard',err:0.04,fire:[0.5,1.0],rest:[0.4,0.9],block:0.9,dodge:0.5,react:0.08,dmg:1,speed:1} };
try{ const s=JSON.parse(localStorage.getItem('domeRoundsSettings4')||'null'); if(s&&typeof s==='object'){ for(const k in settings) if(typeof s[k]===typeof settings[k]) settings[k]=s[k]; } }catch(e){}
function saveSettings(){ try{ localStorage.setItem('domeRoundsSettings4',JSON.stringify(settings)); }catch(e){} }

// ================= CARDS =================
// type: gun | dome | aura | body     lines: [value, label, good(1)/bad(0)]
const R25=['+0.25s','Reload time',0], R50=['+0.5s','Reload time',0], B25=['+0.25s','Block cooldown',0];
const CARDS = {
  // ---- blaster ----
  barrage:    {name:'Barrage',type:'gun',rar:'uncommon',c:'#ff9d2e',tag:'Fire many energy balls at the same time',lines:[['+4','Bullets',1],['+5','Ammo',1],['-70%','DMG',0],R25],apply:s=>{s.pellets+=4;s.ammo+=5;s.dmg*=0.3;s.reloadAdd+=0.25;s.spread=Math.max(s.spread,0.075);}},
  bigbullets: {name:'Big Bullets',type:'gun',rar:'common',c:'#ffc93c',tag:'Way bigger energy balls. Easier hits, and every effect on your shots gets bigger too',lines:[['+120%','Bullet size',1],R25],apply:s=>{s.size*=2.2;s.reloadAdd+=0.25;}},
  buckshot:   {name:'Buckshot',type:'gun',rar:'uncommon',c:'#f2743a',tag:'Adds a shotgun vibe to your blaster',lines:[['+4','Bullets',1],['+5','Ammo',1],['-60%','DMG',0],R25],apply:s=>{s.pellets+=4;s.ammo+=5;s.dmg*=0.4;s.reloadAdd+=0.25;s.spread=Math.max(s.spread,0.16);}},
  burst:      {name:'Burst',type:'gun',rar:'common',c:'#f5b82e',tag:'Shots are fired in a quick sequence',lines:[['+2','Bullets',1],['+3','Ammo',1],['-60%','DMG',0],R25],apply:s=>{s.burst+=2;s.ammo+=3;s.dmg*=0.4;s.reloadAdd+=0.25;}},
  spray:      {name:'Spray',type:'gun',rar:'uncommon',c:'#ff6b6b',tag:'Hold the trigger and hose them down',lines:[['+1000%','ATKSPD',1],['+12','Ammo',1],['-75%','DMG',0],R25],apply:s=>{s.fireInt/=11;s.ammo+=12;s.dmg*=0.25;s.reloadAdd+=0.25;s.spread=Math.max(s.spread,0.03);}},
  combine:    {name:'Combine',type:'gun',rar:'common',c:'#e8843c',tag:'Fewer, much meaner shots',lines:[['+100%','DMG',1],['-2','Ammo',0],R50],apply:s=>{s.dmg*=2;s.ammo-=2;s.reloadAdd+=0.5;}},
  carefulplanning:{name:'Careful Planning',type:'gun',rar:'uncommon',c:'#d9a441',tag:'Slow, deliberate, devastating',lines:[['+100%','DMG',1],['-150%','ATKSPD',0],R50],apply:s=>{s.dmg*=2;s.fireInt*=2.5;s.reloadAdd+=0.5;}},
  windup:     {name:'Wind Up',type:'gun',rar:'common',c:'#ffb347',tag:'Charged shots that hit fast and hard',lines:[['+100%','Bullet speed',1],['+60%','DMG',1],['-100%','ATKSPD',0],R50],apply:s=>{s.speed*=2;s.dmg*=1.6;s.fireInt*=2;s.reloadAdd+=0.5;}},
  fastball:   {name:'Fastball',type:'gun',rar:'common',c:'#ff8552',tag:'Shots arrive almost instantly',lines:[['+250%','Bullet speed',1],['-50%','ATKSPD',0],R25],apply:s=>{s.speed*=3.5;s.fireInt*=1.5;s.reloadAdd+=0.25;}},
  quickshot:  {name:'Quick Shot',type:'gun',rar:'common',c:'#ffd166',tag:'Faster energy balls',lines:[['+150%','Bullet speed',1],R25],apply:s=>{s.speed*=2.5;s.reloadAdd+=0.25;}},
  steadyshot: {name:'Steady Shot',type:'gun',rar:'common',c:'#e9c46a',tag:'A sturdier stance and a faster shot',lines:[['+40%','HP',1],['+100%','Bullet speed',1],R25],apply:s=>{s.hp*=1.4;s.speed*=2;s.reloadAdd+=0.25;}},
  quickreload:{name:'Quick Reload',type:'gun',rar:'uncommon',c:'#7ee081',tag:'Reload in a blink',lines:[['-70%','Reload time',1]],apply:s=>{s.reloadMul*=0.3;}},
  scavenger:  {name:'Scavenger',type:'gun',rar:'uncommon',c:'#b06cff',tag:'Dealing damage reloads your blaster',lines:[R50],apply:s=>{s.scavenger+=1;s.reloadAdd+=0.5;}},
  poison:     {name:'Poison',type:'gun',rar:'common',c:'#49d86b',tag:'Shots deal damage over 3 seconds',lines:[['+70%','DMG',1],['+30%','Reload speed',1],['-1','Bullet',0]],apply:s=>{s.poison+=1;s.dmg*=1.7;s.reloadMul/=1.3;s.pellets-=1;}},
  parasite:   {name:'Parasite',type:'gun',rar:'uncommon',c:'#c95fd1',tag:'Shots deal damage over 5 seconds',lines:[['+70%','Life steal',1],['+25%','HP',1],['+25%','DMG',1],R25],apply:s=>{s.parasite+=1;s.lifesteal+=0.7;s.hp*=1.25;s.dmg*=1.25;s.reloadAdd+=0.25;}},
  explosive:  {name:'Explosive Bullet',type:'gun',rar:'uncommon',c:'#ff5a3c',tag:'Shots explode on impact',lines:[['-100%','ATKSPD',0],R25],apply:s=>{s.explosive+=1;s.fireInt*=2;s.reloadAdd+=0.25;}},
  timeddetonation:{name:'Timed Detonation',type:'gun',rar:'common',c:'#ff7b54',tag:'Shots stick like a bomb, then explode half a second later',lines:[['-15%','DMG',0],R25],apply:s=>{s.timed+=1;s.dmg*=0.85;s.reloadAdd+=0.25;}},
  toxiccloud: {name:'Toxic Cloud',type:'gun',rar:'rare',c:'#9be043',tag:'Wherever your shot lands, a toxic cloud spawns. It damages and slows.',lines:[['-20%','ATKSPD',0],R50],apply:s=>{s.toxic+=1;s.fireInt*=1.2;s.reloadAdd+=0.5;}},
  coldbullets:{name:'Cold Bullets',type:'gun',rar:'common',c:'#6fd3ff',tag:'Shots slow whoever they hit',lines:[['+70%','Bullet slow',1],R25],apply:s=>{s.cold+=1;s.reloadAdd+=0.25;}},
  dazzle:     {name:'Dazzle',type:'gun',rar:'common',c:'#ffe45c',tag:'Shots stun the opponent several times. Stars spin round their head and their view goes narrow and hazy',lines:[R25],apply:s=>{s.dazzle+=1;s.reloadAdd+=0.25;}},
  grow:       {name:'Grow',type:'gun',rar:'uncommon',c:'#58d6a8',tag:'Shots swell up the further they travel. Bigger shots hit harder and blow up bigger clouds, blasts and effects',lines:[R25],apply:s=>{s.grow+=1;s.reloadAdd+=0.25;}},
  thruster:   {name:'Thruster',type:'gun',rar:'uncommon',c:'#ff9a76',tag:'A rocket sticks to whoever you hit and blasts them away. Every pellet sticks one',lines:[R25],apply:s=>{s.thruster+=1;s.reloadAdd+=0.25;}},
  arcshot:    {name:'Arc Shot',type:'gun',rar:'uncommon',c:'#4fc3ff',tag:'Shots spray out and fall like water. Lob them over cover. More stacks, steeper drop',lines:[['+2','Bullets',1],['+2','Ammo',1],['-30%','DMG',0],['-25%','Bullet speed',0],R25],apply:s=>{s.arc+=1;s.pellets+=2;s.ammo+=2;s.dmg*=0.7;s.speed*=0.75;s.spread=Math.max(s.spread,0.07);s.reloadAdd+=0.25;}},
  ricochet:   {name:'Ricochet',type:'gun',rar:'uncommon',c:'#5ad1c9',tag:'Shots bounce, losing half their speed each time',lines:[['+2','Bullet bounces',1],['+25%','ATKSPD',1],R25],apply:s=>{s.bounces+=2;s.ricochet+=1;s.fireInt/=1.25;s.reloadAdd+=0.25;}},
  remote:     {name:'Remote',type:'gun',rar:'rare',c:'#7c8cff',tag:'See through your shot and steer it into the target. Slower shots are easier to steer',lines:[['-55%','Bullet speed',0],R25],apply:s=>{s.remote+=1;s.speed*=0.45;s.reloadAdd+=0.25;}},
  demonicpact:{name:'Demonic Pact',type:'gun',rar:'rare',c:'#e0364f',tag:'Shooting costs 10 HP but there is no shooting cooldown',lines:[['+9','Ammo',1],['+2','Splash DMG',1],R25],apply:s=>{s.pact+=1;s.ammo+=9;s.splash+=2;s.reloadAdd+=0.25;}},
  // ---- body ----
  swift:      {name:'Swift',type:'body',rar:'common',c:'#7fe3c6',tag:'Lighter on your feet. Run rings round them',lines:[['+25%','Move speed',1],['-10%','HP',0]],apply:s=>{s.move+=1;s.hp*=0.9;}},
  tank:       {name:'Tank',type:'body',rar:'common',c:'#5fbf7a',tag:'Built like a wall',lines:[['+100%','HP',1],['-25%','ATKSPD',0],R50],apply:s=>{s.hp*=2;s.fireInt*=1.25;s.reloadAdd+=0.5;}},
  huge:       {name:'Huge',type:'body',rar:'common',c:'#4fd08c',tag:'Just bigger and healthier',lines:[['+80%','HP',1]],apply:s=>{s.hp*=1.8;}},
  glasscannon:{name:'Glass Cannon',type:'body',rar:'uncommon',c:'#ff5d8f',tag:'Hit hard, break easy',lines:[['+100%','DMG',1],['-100%','HP',0],R25],apply:s=>{s.dmg*=2;s.hp*=0.5;s.reloadAdd+=0.25;}},
  leech:      {name:'Leech',type:'body',rar:'common',c:'#ef5da8',tag:'Your hits heal you',lines:[['+100%','Life steal',1],['+30%','HP',1]],apply:s=>{s.lifesteal+=1.0;s.hp*=1.3;}},
  highjump:   {name:'High Jump',type:'body',rar:'common',c:'#63e6be',tag:'Reach the high ground',lines:[['+50%','Jump height',1]],apply:s=>{s.jump*=1.5;}},
  brawler:    {name:'Brawler',type:'body',rar:'uncommon',c:'#ff8c42',tag:'+200% HP for 3 seconds after you deal damage',lines:[],apply:s=>{s.brawler+=1;}},
  chase:      {name:'Chase',type:'body',rar:'uncommon',c:'#3ddc97',tag:'+60% speed while moving toward an opponent you can see',lines:[['+30%','HP',1]],apply:s=>{s.chase+=1;s.hp*=1.3;}},
  decay:      {name:'Decay',type:'body',rar:'uncommon',c:'#a0c15a',tag:'Damage done to you is dealt over 4 seconds',lines:[['+50%','HP',1]],apply:s=>{s.decay+=1;s.hp*=1.5;}},
  phoenix:    {name:'Phoenix',type:'body',rar:'rare',c:'#ff7e3d',tag:'Respawn once when you would die',lines:[['-35%','HP',0]],apply:s=>{s.phoenix+=1;s.hp*=0.65;}},
  tasteofblood:{name:'Taste of Blood',type:'body',rar:'uncommon',c:'#e84a5f',tag:'+50% speed for 3 seconds after you deal damage',lines:[['+45%','Life steal',1]],apply:s=>{s.taste+=1;s.lifesteal+=0.45;}},
  // ---- dome (block) ----
  defender:   {name:'Defender',type:'dome',rar:'uncommon',c:'#4aa8ff',tag:'Your dome comes back sooner',lines:[['-30%','Block cooldown',1],['+30%','HP',1]],apply:s=>{s.blockCdMul*=0.7;s.hp*=1.3;}},
  bigdome:    {name:'Big Dome',type:'dome',rar:'common',c:'#3fe0ff',tag:'Both of your domes grow',lines:[['+40%','Dome size',1]],apply:s=>{s.dome*=1.4;}},
  frostslam:  {name:'Frost Slam',type:'dome',rar:'common',c:'#8fd8ff',tag:'Blocking slows enemies caught inside your dome',lines:[['+30%','HP',1],B25],apply:s=>{s.frost+=1;s.hp*=1.3;s.blockCdAdd+=0.25;}},
  shockwave:  {name:'Shockwave',type:'dome',rar:'uncommon',c:'#5b9dff',tag:'Blocking blasts enemies in your dome clean across the map',lines:[['+50%','HP',1],B25],apply:s=>{s.shock+=1;s.hp*=1.5;s.blockCdAdd+=0.25;}},
  echo:       {name:'Echo',type:'dome',rar:'uncommon',c:'#5f7bff',tag:'Blocking triggers another, delayed block',lines:[['+30%','HP',1],B25],apply:s=>{s.echo+=1;s.hp*=1.3;s.blockCdAdd+=0.25;}},
  bombsaway:  {name:'Bombs Away',type:'dome',rar:'uncommon',c:'#ff8a5c',tag:'Bombs fly out as your dome expands. They can hurt you too.',lines:[['+30%','HP',1],B25],apply:s=>{s.bombs+=1;s.hp*=1.3;s.blockCdAdd+=0.25;}},
  emp:        {name:'EMP',type:'dome',rar:'uncommon',c:'#46e0d0',tag:'Your dome bursts into energy shards that fly out in every direction and slow whoever they hit',lines:[['+30%','HP',1],B25],apply:s=>{s.emp+=1;s.hp*=1.3;s.blockCdAdd+=0.25;}},
  healingfield:{name:'Healing Field',type:'dome',rar:'common',c:'#5de08a',tag:'Blocking leaves a field that heals you',lines:[['+30%','HP',1],B25],apply:s=>{s.heal+=1;s.hp*=1.3;s.blockCdAdd+=0.25;}},
  implode:    {name:'Implode',type:'dome',rar:'uncommon',c:'#8f7bff',tag:'Blocking pulls enemies toward you',lines:[['+50%','HP',1],B25],apply:s=>{s.implode+=1;s.hp*=1.5;s.blockCdAdd+=0.25;}},
  overpower:  {name:'Overpower',type:'dome',rar:'uncommon',c:'#ff6f91',tag:'Blocking deals 15% of your max HP to enemies in your dome',lines:[['+30%','HP',1],B25],apply:s=>{s.overpower+=1;s.hp*=1.3;s.blockCdAdd+=0.25;}},
  saw:        {name:'Saw',type:'dome',rar:'rare',c:'#ff5252',tag:'Your dome keeps spinning for a while and shreds anyone inside',lines:[['+30%','HP',1],B25],apply:s=>{s.saw+=1;s.hp*=1.3;s.blockCdAdd+=0.25;}},
  silence:    {name:'Silence',type:'dome',rar:'uncommon',c:'#9aa7c7',tag:'Blocking silences enemies in your dome: no dome, no aura',lines:[['+25%','HP',1],B25],apply:s=>{s.silence+=1;s.hp*=1.25;s.blockCdAdd+=0.25;}},
  supernova:  {name:'Supernova',type:'dome',rar:'rare',c:'#ff4fd8',tag:'Opens a black hole that drags enemies in hard, then it collapses into a huge explosion that stuns them',lines:[['+50%','HP',1],['+0.5s','Block cooldown',0]],apply:s=>{s.nova+=1;s.hp*=1.5;s.blockCdAdd+=0.5;}},
  tacticalreload:{name:'Tactical Reload',type:'dome',rar:'rare',c:'#62d2a2',tag:'Blocking reloads your blaster',lines:[B25],apply:s=>{s.tacreload+=1;s.blockCdAdd+=0.25;}},
  teleport:   {name:'Teleport',type:'dome',rar:'rare',c:'#a77bff',tag:'Blocking shatters you and snaps you back together further ahead, through anything. Your dome and its effects go off where you land',lines:[['-30%','Block cooldown',1]],apply:s=>{s.teleport+=1;s.blockCdMul*=0.7;}},
  refresh:    {name:'Refresh',type:'dome',rar:'rare',c:'#4de3b3',tag:'Dealing damage gives your block back',lines:[],apply:s=>{s.refresh+=1;}},
  // ---- aura (always-on dome) ----
  chilling:   {name:'Chilling Presence',type:'aura',rar:'rare',c:'#9fd8ff',tag:'An always-on freezing aura. Anyone inside slows right down and frosts over',lines:[['+25%','HP',1]],apply:s=>{s.chill+=1;s.hp*=1.25;}},
  staticfield:{name:'Static Field',type:'aura',rar:'uncommon',c:'#ffe066',tag:'An always-on aura dome that zaps and slows anyone inside',lines:[B25],apply:s=>{s.staticf+=1;s.blockCdAdd+=0.25;}},
  lifestealer:{name:'Lifestealer',type:'aura',rar:'rare',c:'#ff6b9d',tag:'An always-on aura dome. A blood worm sucks HP out of enemies inside and pumps it into you',lines:[['+25%','HP',1]],apply:s=>{s.drain+=1;s.hp*=1.25;}},
};
const ALL_CARDS = Object.keys(CARDS);
const TYPE_LABEL = {gun:'BLASTER', dome:'DOME', aura:'AURA', body:'BODY'};

function computeStats(ids){
  const s={hp:BASE.hp,dmg:BASE.dmg,ammo:BASE.ammo,reloadAdd:0,reloadMul:1,fireInt:BASE.fireInt,speed:BASE.speed,size:BASE.size,
    pellets:1,spread:0,burst:0,bounces:0,ricochet:0,blockCdAdd:0,blockCdMul:1,dome:BASE.dome,jump:1,lifesteal:0,
    poison:0,parasite:0,explosive:0,splash:0,timed:0,toxic:0,cold:0,dazzle:0,grow:0,thruster:0,magnet:0,remote:0,pact:0,scavenger:0,
    frost:0,shock:0,echo:0,bombs:0,emp:0,heal:0,implode:0,overpower:0,saw:0,silence:0,nova:0,tacreload:0,teleport:0,refresh:0,
    chill:0,staticf:0,drain:0,brawler:0,chase:0,decay:0,phoenix:0,taste:0,move:0,arc:0};
  for(const id of ids){ if(CARDS[id]) CARDS[id].apply(s); }
  s.reload=Math.max(0.3,(BASE.reload+s.reloadAdd)*s.reloadMul);
  s.fireInt= s.pact>0 ? 0.1 : Math.max(0.035,s.fireInt);
  s.ammo=Math.max(1,Math.round(s.ammo));
  s.pellets=Math.max(1,s.pellets);
  s.blockCd=Math.max(0.8,(BASE.blockCd+s.blockCdAdd)*s.blockCdMul);
  s.hp=Math.max(10,Math.round(s.hp));
  s.dmg=Math.max(1,s.dmg);
  s.speed=Math.min(240,s.speed);
  s.hasAura = (s.chill+s.staticf+s.drain)>0;
  s.auraR = s.hasAura ? BASE.aura*(0.5+0.5*s.dome/BASE.dome) : 0;
  s.domeFx = s.frost+s.shock+s.bombs+s.emp+s.heal+s.implode+s.overpower+s.saw+s.silence+s.nova;
  return s;
}

// ================= AUDIO: sfx + synth music =================
const SFX=(()=>{
  let ctx=null, master=null, musicGain=null;
  function ensure(){ if(ctx) return ctx; try{ ctx=new (window.AudioContext||window.webkitAudioContext)(); master=ctx.createGain(); master.gain.value=settings.vol; master.connect(ctx.destination); musicGain=ctx.createGain(); musicGain.gain.value=settings.music*0.9; musicGain.connect(ctx.destination); }catch(e){ ctx=null; } return ctx; }
  // ---- the theme song (music.mp3 next to the game): loud on the menu, quiet under the fight. The synth tracks are the fallback ----
  const SONG={el:null,g:null,failed:false,want:'off'}; const SONG_LV={menu:1.6,draft:1.0,fight:0.6,off:0};
  function songOn(m){ if(SONG.failed||!ctx) return false; SONG.want=m;
    if(!SONG.el){ try{ const a=new Audio(); a.loop=true; a.preload='auto'; a.src='music.mp3?v=2'; a.addEventListener('error',()=>{ SONG.failed=true; const w=SONG.want; mode=null; if(SONG.g) SONG.g.disconnect(); SFX.music(w); }); SONG.el=a; const src=ctx.createMediaElementSource(a); SONG.g=ctx.createGain(); SONG.g.gain.value=0; src.connect(SONG.g); SONG.g.connect(musicGain); }catch(e){ SONG.failed=true; return false; } }
    const lv=SONG_LV[m]===undefined?1:SONG_LV[m], g=SONG.g.gain, t=ctx.currentTime; g.cancelScheduledValues(t); g.setValueAtTime(g.value,t); g.linearRampToValueAtTime(lv,t+(lv>g.value?0.8:1.4));
    if(lv>0){ if(SONG.el.paused) SONG.el.play().catch(()=>{}); } else setTimeout(()=>{ if(SONG.want==='off'&&SONG.el) SONG.el.pause(); },1500);
    return true; }
  function tone(f0,f1,dur,type='square',vol=0.08,when=0,dest=null){
    const c=ensure(); if(!c) return; try{
      if(c.state==='suspended') c.resume();
      const t0=(when||c.currentTime); const o=c.createOscillator(), g=c.createGain(); o.type=type;
      o.frequency.setValueAtTime(f0,t0); if(f1!==f0) o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t0+dur);
      g.gain.setValueAtTime(vol,t0); g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
      o.connect(g).connect(dest||master); o.start(t0); o.stop(t0+dur+0.02);
    }catch(e){}
  }
  let noiseBuf=null;
  function noise(dur,vol=0.1,freq=900,when=0,dest=null,type='lowpass'){
    const c=ensure(); if(!c) return; try{
      if(!noiseBuf){ const n=c.sampleRate; noiseBuf=c.createBuffer(1,n,c.sampleRate); const d=noiseBuf.getChannelData(0); for(let i=0;i<n;i++) d[i]=Math.random()*2-1; }
      const t0=(when||c.currentTime); const s=c.createBufferSource(); s.buffer=noiseBuf; const g=c.createGain(); g.gain.setValueAtTime(vol,t0); g.gain.exponentialRampToValueAtTime(0.0001,t0+dur); const f=c.createBiquadFilter(); f.type=type; f.frequency.value=freq;
      s.connect(f).connect(g).connect(dest||master); s.start(t0,Math.random()*0.5,dur+0.02);
    }catch(e){}
  }
  // ---- sfx toolkit: a compressed bus with a short reverb send, enveloped oscillators (optional FM + filter sweep) and swept noise ----
  let sfxBus=null, revSend=null, sfxOff=0;
  function buses(){ if(sfxBus||!ctx) return; try{ const c=ctx, comp=c.createDynamicsCompressor(); comp.threshold.value=-16; comp.knee.value=12; comp.ratio.value=5; comp.attack.value=0.003; comp.release.value=0.18; comp.connect(master);
    sfxBus=c.createGain(); sfxBus.gain.value=1.8; sfxBus.connect(comp);
    const len=Math.floor(c.sampleRate*1.4), ir=c.createBuffer(2,len,c.sampleRate); for(let ch=0;ch<2;ch++){ const d=ir.getChannelData(ch); for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.8); }
    const rev=c.createConvolver(); rev.buffer=ir; revSend=c.createGain(); revSend.gain.value=1; const wet=c.createGain(); wet.gain.value=0.32; revSend.connect(rev); rev.connect(wet); wet.connect(comp); }catch(e){ sfxBus=null; revSend=null; } }
  function out(node,rv){ node.connect(sfxBus||master); if(rv&&revSend){ const g=ctx.createGain(); g.gain.value=rv; node.connect(g); g.connect(revSend); } }
  function osc(type,f0,f1,dur,vol,o={}){ const c=ensure(); if(!c) return; try{ if(c.state==='suspended') c.resume(); buses();
    const t=c.currentTime+(o.at||0)+sfxOff, a=o.a||0.004, k=o.rand?1+(Math.random()*2-1)*o.rand:1; const os=c.createOscillator(), g=c.createGain(); os.type=type;
    os.frequency.setValueAtTime(f0*k,t); if(f1!==f0) os.frequency.exponentialRampToValueAtTime(Math.max(20,f1*k),t+dur);
    if(o.fm){ const m=c.createOscillator(), mg=c.createGain(); m.frequency.value=f0*k*o.fm[0]; mg.gain.setValueAtTime(f0*o.fm[1],t); mg.gain.exponentialRampToValueAtTime(Math.max(1,f0*o.fm[1]*0.04),t+dur); m.connect(mg); mg.connect(os.frequency); m.start(t); m.stop(t+dur+0.05); }
    g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(vol,t+a); g.gain.exponentialRampToValueAtTime(0.0001,t+Math.max(dur,a+0.01));
    let last=os; if(o.lp){ const f=c.createBiquadFilter(); f.type='lowpass'; f.Q.value=o.q||1; f.frequency.setValueAtTime(o.lp[0],t); f.frequency.exponentialRampToValueAtTime(Math.max(40,o.lp[1]),t+dur); os.connect(f); last=f; }
    last.connect(g); out(g,o.rv); os.start(t); os.stop(t+dur+0.06); }catch(e){} }
  function nz(dur,vol,f0,f1,o={}){ const c=ensure(); if(!c) return; try{ if(c.state==='suspended') c.resume(); buses();
    if(!noiseBuf){ const n=c.sampleRate; noiseBuf=c.createBuffer(1,n,c.sampleRate); const d=noiseBuf.getChannelData(0); for(let i=0;i<n;i++) d[i]=Math.random()*2-1; }
    const t=c.currentTime+(o.at||0)+sfxOff, a=o.a||0.003, k=o.rand?1+(Math.random()*2-1)*o.rand:1; const src=c.createBufferSource(); src.buffer=noiseBuf; const f=c.createBiquadFilter(), g=c.createGain(); f.type=o.ft||'bandpass'; f.Q.value=o.q||1;
    f.frequency.setValueAtTime(f0*k,t); if(f1!==f0) f.frequency.exponentialRampToValueAtTime(Math.max(40,f1*k),t+dur);
    g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(vol,t+a); g.gain.exponentialRampToValueAtTime(0.0001,t+Math.max(dur,a+0.01));
    src.connect(f); f.connect(g); out(g,o.rv); src.start(t,Math.random()*0.5,dur+0.05); }catch(e){} }
  // ---- music: upbeat synthwave step sequencer (128 BPM, 8-bar loop) ----
  const BPM=128, STEP=60/BPM/4; let mode='off', nextT=0, step=0, timer=null, delay=null, duck=null;
  const mf=m=>440*Math.pow(2,(m-69)/12);
  const CH=[[45,[57,60,64,69]],[45,[57,60,64,69]],[41,[57,60,65,69]],[41,[57,60,65,69]],[48,[55,60,64,67]],[48,[55,60,64,67]],[43,[55,59,62,67]],[40,[55,59,64,67]]];
  const LEAD=[[76,0,0,76,0,74,0,72,0,0,74,0,76,0,0,0],[79,0,0,76,0,0,74,0,72,0,74,0,69,0,0,0],[77,0,0,77,0,76,0,72,0,0,76,0,77,0,0,0],[81,0,79,0,76,0,0,74,0,72,0,74,0,0,0,0],[79,0,0,79,0,76,0,72,0,0,76,0,79,0,0,0],[84,0,0,79,0,0,76,0,79,0,76,0,72,0,0,0],[74,0,0,74,0,79,0,83,0,0,79,0,74,0,0,0],[76,0,79,0,83,0,0,79,0,76,0,71,0,74,76,0]];
  const ARP=[0,2,1,2,3,2,1,2,0,2,1,3,2,1,3,2];
  function chain(){ if(delay||!ctx) return; try{ duck=ctx.createGain(); duck.connect(musicGain); delay=ctx.createDelay(1); delay.delayTime.value=STEP*3; const fb=ctx.createGain(); fb.gain.value=0.34; const wet=ctx.createGain(); wet.gain.value=0.5; delay.connect(fb).connect(delay); delay.connect(wet).connect(musicGain); }catch(e){ delay=null; } }
  function voice(type,f,t,dur,vol,cut,dest,slideFrom){ try{ const o=ctx.createOscillator(), g=ctx.createGain(), fl=ctx.createBiquadFilter(); o.type=type; if(slideFrom){ o.frequency.setValueAtTime(slideFrom,t); o.frequency.exponentialRampToValueAtTime(f,t+0.05); } else o.frequency.value=f; fl.type='lowpass'; fl.frequency.setValueAtTime(cut,t); fl.frequency.exponentialRampToValueAtTime(Math.max(120,cut*0.25),t+dur); fl.Q.value=4; g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(vol,t+0.008); g.gain.exponentialRampToValueAtTime(0.0001,t+dur); o.connect(fl).connect(g); g.connect(dest); if(dest!==musicGain&&dest!==duck&&delay){} o.start(t); o.stop(t+dur+0.05); return g; }catch(e){ return null; } }
  function sched(){ const c=ctx; if(!c||mode==='off') return; chain(); if(nextT<c.currentTime) nextT=c.currentTime+0.05;
    while(nextT<c.currentTime+0.2){ const bar=Math.floor(step/16)%8, s=step%16, t=nextT, ch=CH[bar], fight=mode==='fight', draft=mode==='draft', menu=mode==='menu';
      // sidechain pump on every beat
      if(duck&&s%4===0&&!menu){ duck.gain.cancelScheduledValues(t); duck.gain.setValueAtTime(0.35,t); duck.gain.linearRampToValueAtTime(1,t+STEP*3.2); }
      // pad stab at bar start
      if(s===0){ for(const m of ch[1]) for(const d of [-6,6]){ try{ const o=c.createOscillator(), g=c.createGain(), fl=c.createBiquadFilter(); o.type='sawtooth'; o.frequency.value=mf(m); o.detune.value=d; fl.type='lowpass'; fl.frequency.value=fight?1500:900; g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.016,t+0.12); g.gain.setValueAtTime(0.016,t+STEP*13); g.gain.linearRampToValueAtTime(0.0001,t+STEP*16); o.connect(fl).connect(g).connect(duck||musicGain); o.start(t); o.stop(t+STEP*16+0.05); }catch(e){} } }
      // bass: driving offbeat eighths with an octave hop
      if(s%2===0&&(s%4===2||fight||(draft&&s%8===0)||(menu&&s%8===0))){ const oct=(s===6||s===14)?12:0; voice('sawtooth',mf(ch[0]+oct),t,STEP*1.7,fight?0.15:0.11,fight?900:600,duck||musicGain); voice('square',mf(ch[0]-12+oct),t,STEP*1.5,0.05,400,duck||musicGain); }
      // plucky arp through the delay
      if(!draft||s%2===0){ const m=ch[1][ARP[s]]+(s%8>=4?12:0); const g=voice('square',mf(m),t,STEP*1.1,menu?0.03:0.026,2600,musicGain); if(g&&delay) g.connect(delay); }
      // lead hook
      if(fight){ const n=LEAD[bar][s]; if(n){ const g=voice('sawtooth',mf(n),t,STEP*2.6,0.05,3200,musicGain,mf(n-2)); if(g&&delay) g.connect(delay); voice('triangle',mf(n-12),t,STEP*2.2,0.03,2000,musicGain); } }
      // drums
      if(s%4===0&&!menu&&(fight||s%8===0)){ tone(170,40,0.2,'sine',fight?0.38:0.2,t,musicGain); noise(0.02,0.06,3000,t,musicGain,'highpass'); }
      if(fight&&(s===4||s===12)){ noise(0.16,0.16,1700,t,musicGain,'bandpass'); noise(0.1,0.06,5000,t+0.012,musicGain,'highpass'); }
      if(fight&&bar===7&&s>=12) noise(0.06,0.09,2400,t,musicGain,'bandpass');
      if(!menu&&s%4===2) noise(0.09,fight?0.07:0.04,8000,t,musicGain,'highpass');
      if(fight&&s%2===1) noise(0.03,0.03,9000,t,musicGain,'highpass');
      if(menu&&s%4===2) noise(0.03,0.02,7000,t,musicGain,'highpass');
      step++; nextT+=STEP; }
  }
  return { _o:(...a)=>osc(...a), _n:(...a)=>nz(...a), _off:v=>{ sfxOff=v; }, unlock:ensure, songState:()=>SONG.el?{paused:SONG.el.paused,t:+SONG.el.currentTime.toFixed(1),ready:SONG.el.readyState,failed:SONG.failed,g:+SONG.g.gain.value.toFixed(2)}:{failed:SONG.failed,none:1}, setVol(v){ if(master) master.gain.value=v; }, setMusicVol(v){ if(musicGain) musicGain.gain.value=v*0.9; },
    music(m){ ensure(); if(songOn(m)){ mode=m; if(timer){ clearInterval(timer); timer=null; } return; } if(mode===m&&(timer||m==='off')) return; mode=m; if(m!=='off'&&!timer&&ctx){ nextT=ctx.currentTime+0.08; timer=setInterval(sched,50); } if(m==='off'&&timer){ clearInterval(timer); timer=null; } },
    // ---- layered sound effects (see osc / nz below): a body, a transient and some air on each ----
    shoot:()=>{ osc('sine',190,55,0.11,0.375,{a:0.002}); osc('sawtooth',1500,240,0.15,0.138,{lp:[5200,700],q:3,rand:0.05,rv:0.25}); osc('square',2600,900,0.05,0.062,{rand:0.05}); nz(0.03,0.15,6000,3000,{ft:'highpass'}); },
    shootBot:()=>{ osc('sine',150,50,0.11,0.2,{a:0.002}); osc('sawtooth',900,170,0.16,0.09,{lp:[2800,500],q:3,rand:0.05,rv:0.3}); nz(0.03,0.07,4000,2000,{ft:'highpass'}); },
    hit:()=>{ osc('sine',210,70,0.1,0.45,{a:0.002}); osc('square',420,130,0.06,0.12,{lp:[2400,500]}); nz(0.07,0.3,1900,700,{q:1.2}); osc('sine',2300,1900,0.05,0.075,{at:0.005}); },
    zap:()=>{ osc('sawtooth',1700,260,0.14,0.198,{fm:[7.3,2.2],lp:[6000,1500],rv:0.3}); osc('square',3200,700,0.07,0.088,{rand:0.1}); nz(0.08,0.22,7000,3500,{ft:'highpass'}); },
    block:()=>{ osc('sine',95,48,0.22,0.3,{a:0.004}); nz(0.3,0.16,350,3600,{q:2.5,a:0.03,rv:0.5}); for(const [f,d] of [[330,0],[495,0.02],[660,0.04]]) osc('triangle',f,f*1.5,0.38,0.075,{at:d,a:0.03,rv:0.6}); osc('sine',1320,1980,0.3,0.03,{a:0.05,rv:0.7}); },
    shatter:()=>{ nz(0.25,0.16,7000,3000,{ft:'highpass',rv:0.4}); for(let i=0;i<6;i++) osc('sine',2400+Math.random()*3200,1800+Math.random()*1500,0.12+Math.random()*0.12,0.045,{at:i*0.028+Math.random()*0.02,fm:[2.76,0.6],rv:0.6}); osc('triangle',900,300,0.14,0.07); },
    blocked:()=>{ osc('sine',1480,1460,0.3,0.192,{fm:[2.4,1.1],rv:0.6}); osc('sine',2960,2900,0.16,0.064,{rv:0.5}); nz(0.03,0.112,5000,2500,{ft:'highpass'}); },
    explode:()=>{ osc('sine',120,28,0.55,0.5,{a:0.003}); nz(0.6,0.45,2600,140,{ft:'lowpass',q:0.8,rv:0.7}); nz(0.1,0.22,3200,900,{q:0.9}); nz(0.22,0.12,900,300,{at:0.08,q:1.5,rv:0.5}); osc('sawtooth',90,40,0.3,0.12,{lp:[700,120]}); },
    dash:()=>{ nz(0.34,0.34,500,2800,{q:1.8,a:0.02,rv:0.3}); nz(0.3,0.17,2200,600,{at:0.1,q:1.2}); osc('sawtooth',80,150,0.3,0.204,{lp:[500,1400],a:0.02}); osc('sine',240,700,0.16,0.102,{a:0.01}); },
    jump:()=>{ nz(0.2,0.242,800,2200,{q:2,a:0.015}); osc('sawtooth',90,130,0.16,0.154,{lp:[500,1100],a:0.01}); osc('sine',240,470,0.12,0.132,{a:0.006}); },
    land:()=>{ osc('sine',130,48,0.12,0.364,{a:0.002}); nz(0.08,0.182,700,250,{ft:'lowpass'}); },
    step:()=>{ osc('sine',150,75,0.05,0.126,{a:0.002,rand:0.12}); nz(0.035,0.081,1400,600,{q:1,rand:0.2}); },
    pick:()=>{ [[660,0],[880,0.07],[1320,0.14]].forEach(([f,d])=>osc('sine',f,f,0.34,0.077,{at:d,fm:[2,0.7],rv:0.6})); nz(0.25,0.035,6000,9000,{ft:'highpass',at:0.14,a:0.03,rv:0.5}); osc('sine',110,70,0.14,0.112); },
    hover:()=>{ osc('triangle',1250,1150,0.035,0.066); nz(0.015,0.044,5000,4000,{ft:'highpass'}); },
    deal:()=>{ nz(0.08,0.36,1800,6500,{q:1.6,a:0.004}); osc('triangle',500,260,0.05,0.12); },
    blackhole:()=>{ osc('sine',72,30,1.5,0.32,{a:0.25,rv:0.3}); nz(1.4,0.1,420,70,{q:1.2,rv:0.5,a:0.5}); osc('sawtooth',48,26,1.4,0.05,{a:0.4}); osc('sine',900,140,1.3,0.04,{a:0.6,rv:0.8}); },
    supernova:()=>{ SFX.explode(); osc('sine',95,18,1.6,0.6,{a:0.002}); nz(1.2,0.3,5000,120,{q:0.7,rv:0.7}); osc('triangle',1400,300,0.6,0.08,{rv:0.9}); },
    freeze:()=>{ nz(0.28,0.13,8000,1800,{q:1.2,rv:0.5}); osc('sine',2600,3400,0.16,0.05,{at:0.02,rv:0.8}); osc('triangle',1900,1250,0.32,0.045,{at:0.05,rv:0.9}); osc('sine',3900,3800,0.25,0.03,{at:0.1,rv:1}); },
    teleport:()=>{ nz(0.16,0.14,4500,400,{q:2.5,rv:0.4}); osc('sine',380,2100,0.16,0.1,{at:0.05,a:0.02,rv:0.5}); osc('sine',1760,1740,0.34,0.07,{at:0.16,fm:[3.01,0.8],rv:0.8}); },
    revive:()=>{ [[392,0],[523,0.09],[659,0.18],[1046,0.27]].forEach(([f,d])=>{ osc('triangle',f,f*1.01,0.4,0.1,{at:d,a:0.02,rv:0.7}); osc('sine',f*2,f*2,0.3,0.03,{at:d,rv:0.7}); }); nz(0.5,0.07,2000,8000,{ft:'highpass',a:0.2,rv:0.6}); },
    win:()=>{ [[523,0],[659,0.11],[784,0.22],[1046,0.36]].forEach(([f,d],i)=>{ osc('sawtooth',f,f,i===3?0.7:0.22,0.09,{at:d,lp:[4200,1200],a:0.01,rv:0.6}); osc('triangle',f/2,f/2,i===3?0.7:0.22,0.1,{at:d,a:0.01}); }); for(const f of [659,784]) osc('sawtooth',f,f,0.7,0.05,{at:0.36,lp:[3600,900],rv:0.7}); nz(0.5,0.06,5000,9000,{ft:'highpass',at:0.36,a:0.05,rv:0.6}); },
    lose:()=>{ [[392,0],[330,0.2],[262,0.4]].forEach(([f,d],i)=>{ osc('sawtooth',f,f*0.96,i===2?0.7:0.26,0.064,{at:d,lp:[1800,400],a:0.02,rv:0.6}); osc('sawtooth',f*1.007,f*0.955,i===2?0.7:0.26,0.048,{at:d,lp:[1500,350],a:0.02}); }); osc('sine',98,55,0.8,0.112,{at:0.4,a:0.03}); },
    ko:()=>{ osc('sine',150,30,0.6,0.5,{a:0.002}); nz(0.5,0.4,3000,160,{ft:'lowpass',rv:0.8}); osc('sawtooth',880,60,0.45,0.12,{lp:[4000,300],rv:0.5}); osc('sine',1175,1170,0.6,0.08,{fm:[2.4,1.4],rv:0.9}); nz(0.08,0.2,4000,1500,{q:0.8}); },
    confirm:()=>{ osc('sine',1900,1850,0.07,0.09,{fm:[2.01,0.5]}); osc('sine',2850,2800,0.05,0.04,{at:0.012}); },
    tick:()=>{ osc('sine',880,860,0.09,0.28,{fm:[1.5,0.5],rv:0.3}); nz(0.012,0.16,3000,2500,{}); },
    go:()=>{ for(const f of [523,659,784,1046]) osc('sawtooth',f,f,0.45,0.06,{lp:[5000,1200],a:0.006,rv:0.7}); osc('sine',130,65,0.3,0.25); nz(0.3,0.08,3000,9000,{ft:'highpass',a:0.02,rv:0.6}); },
  };
})();
