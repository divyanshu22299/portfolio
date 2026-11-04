/* Cute synthesized sounds + cursor play: games, scenes and reactions for when the cursors are idle. */
(()=>{
const C=window.__fxCore,K=C&&C.kit;if(!C||!K)return;
const {layer,agents,rnd,clamp,wait,NOW,shuffle,pick,startRoam,mouse,mouseP}=C;
const TAU=Math.PI*2,lerp=(a,b,t)=>a+(b-a)*t,T=ms=>ms*(window.__fxSpeed||1);

/* =================== sound: tiny synth, every cursor has its own pitch =================== */
const sfx=(()=>{
  let ctx=null,master=null,enabled=true,lastAny=0;const lastBy=new Map();
  try{if(localStorage.getItem('fxSound')==='off')enabled=false}catch(e){}
  const PENT=[523.25,587.33,659.25,783.99,880,1046.5,1174.66,1318.5];
  const ensure=()=>{if(ctx)return;try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;ctx=new AC();master=ctx.createGain();master.gain.value=.16;
    const comp=ctx.createDynamicsCompressor();master.connect(comp);comp.connect(ctx.destination)}catch(e){ctx=null}};
  const wake=()=>{ensure();if(ctx&&ctx.state==='suspended')ctx.resume().catch(()=>{})};
  ['pointerdown','keydown','touchstart'].forEach(ev=>addEventListener(ev,wake,{passive:true}));
  const ok=()=>enabled&&ctx&&ctx.state==='running';
  function tone(o){if(!ok())return;const f=o.f||660,dur=o.dur||.12,vol=o.vol===undefined?.4:o.vol,t=ctx.currentTime+(o.delay||0);
    const os=ctx.createOscillator(),g=ctx.createGain();os.type=o.type||'sine';os.frequency.setValueAtTime(f,t);
    if(o.f2)os.frequency.exponentialRampToValueAtTime(o.f2,t+dur);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+(o.att||.01));g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    if(o.vib){const lfo=ctx.createOscillator(),lg=ctx.createGain();lfo.frequency.value=o.vib;lg.gain.value=f*.03;lfo.connect(lg);lg.connect(os.frequency);lfo.start(t);lfo.stop(t+dur+.05)}
    os.connect(g);g.connect(master);os.start(t);os.stop(t+dur+.05)}
  const gate=(key,ms)=>{const n=performance.now();if(n-lastAny<40)return false;if(key!==undefined){const l=lastBy.get(key)||0;if(n-l<ms)return false;lastBy.set(key,n)}lastAny=n;return true};
  const pitch=a=>PENT[((a&&a.id)||0)%PENT.length]*(1+(Math.random()-.5)*.03);
  const S={
    get on(){return enabled},set on(v){enabled=!!v;try{localStorage.setItem('fxSound',v?'on':'off')}catch(e){}},wake,
    say(a,txt=''){if(!ok()||!gate(a&&a.id,260))return;const f=pitch(a);
      if(/!/.test(txt))tone({f:f*1.4,f2:f*2.1,dur:.09,type:'triangle',vol:.34});
      else if(/✓/.test(txt)){tone({f:f*1.5,dur:.18,vol:.3});tone({f:f*2,dur:.22,vol:.26,delay:.09})}
      else if(/\?|hmm|…/.test(txt))tone({f:f*.9,f2:f*1.25,dur:.16,type:'triangle',vol:.3});
      else tone({f,f2:f*1.22,dur:.1,vol:.28})},
    pip(a){if(!ok()||!gate('pip',90))return;tone({f:pitch(a)*(Math.random()<.5?1:1.25),dur:.05,vol:.15})},
    note(i,a,dur=.28){if(!ok())return;tone({f:PENT[((i%8)+8)%8],dur,vol:.3,type:'triangle'})},
    play(name,a){if(!ok())return;const f=pitch(a);
      switch(name){
        case'start':tone({f:f*.75,dur:.1,vol:.3});tone({f:f*1.1,dur:.14,vol:.26,delay:.08});break;
        case'end':tone({f:f*1.1,dur:.12,vol:.26});tone({f:f*.75,dur:.18,vol:.24,delay:.09});break;
        case'pop':tone({f:1400,f2:260,dur:.07,vol:.4});break;
        case'boing':tone({f:240,f2:520,dur:.22,vol:.36,type:'triangle',vib:18});break;
        case'ding':tone({f:f*2,dur:.6,vol:.26});tone({f:f*4,dur:.4,vol:.1});break;
        case'tada':[0,2,4,7].forEach((n,i)=>tone({f:PENT[n%8],dur:.22,vol:.28,delay:i*.09,type:'triangle'}));tone({f:PENT[7],dur:.5,vol:.24,delay:.36});break;
        case'snore':tone({f:150,f2:105,dur:.7,vol:.24,type:'triangle',vib:5});break;
        case'yawn':tone({f:520,f2:240,dur:.7,vol:.26,vib:6});break;
        case'dizzy':tone({f:600,f2:380,dur:.5,vol:.26,vib:14});break;
        case'sigh':tone({f:420,f2:250,dur:.45,vol:.22});break;
        case'cheer':[2,3,5].forEach((n,i)=>tone({f:PENT[n],dur:.12,vol:.28,delay:i*.07}));break;
        case'oops':tone({f:380,f2:190,dur:.25,vol:.3,type:'triangle'});break;
        case'boo':tone({f:300,f2:640,dur:.14,vol:.36,type:'triangle'});tone({f:760,dur:.12,vol:.22,delay:.1});break;
        case'tick':tone({f:900,dur:.03,vol:.2,type:'square'});break;
        case'beep':tone({f:880,dur:.12,vol:.26,type:'square'});break;
        case'go':tone({f:1320,dur:.3,vol:.26,type:'square'});break;
        case'zap':tone({f:1800,f2:200,dur:.18,vol:.18,type:'sawtooth'});break;
      }}
  };
  return S})();
window.__sfx=sfx;

/* =================== helpers =================== */
const V=(x,y)=>({x:scrollX+x,y:scrollY+y});
const clampV=(x,y,m=40)=>({x:clamp(x,scrollX+m,scrollX+innerWidth-m),y:clamp(y,scrollY+80,scrollY+innerHeight-m)});
const teamOf=(lead,n)=>[lead,...shuffle(agents.filter(q=>q!==lead&&q.mode==='roam'&&!q.busy)).slice(0,n-1)];
const grab=l=>l.forEach(q=>{if(!q.busy){q.busy=true;q.mode='work'}});
const drop=(l,lead)=>l.forEach(q=>{if(q!==lead){q.busy=false;q.hideSel&&q.hideSel();if(q.el)q.el.style.opacity='';startRoam(q)}});
async function run(ms,fn){const t0=NOW();let last=t0;for(;;){await wait(40);const n=NOW(),e=n-t0;if(e>=ms)break;if(fn((n-last)/1000,e/1000)===true)break;last=n}}
function puff(x,y,n=16,cols=['#ff3b6b','#ffe14a','#46e6ff','#7dff6a','#ffffff']){
  for(let i=0;i<n;i++){const d=document.createElement('i'),c=pick(cols);d.className='spk';d.style.left=x+'px';d.style.top=y+'px';d.style.background=c;d.style.boxShadow='0 0 6px '+c;layer.appendChild(d);
    const an=rnd(0,TAU),dist=rnd(30,90);
    d.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${Math.cos(an)*dist}px,${Math.sin(an)*dist+20}px) scale(0)`,opacity:0}],{duration:rnd(600,1000),easing:'cubic-bezier(.2,.7,.3,1)',fill:'forwards'}).finished.then(()=>d.remove()).catch(()=>d.remove())}}
const BASE='translate(-2px,-2px)';
function hopCursor(q,h=14){const ic=q.el&&q.el.querySelector('.ic');if(ic)ic.animate([{transform:BASE},{transform:`${BASE} translateY(${-h}px) scale(1.2)`,offset:.45},{transform:BASE}],{duration:380,easing:'ease-out'})}
function stretch(q){const ic=q.el&&q.el.querySelector('.ic');if(ic)ic.animate([{transform:BASE},{transform:`${BASE} scale(.8,1.6)`,offset:.5},{transform:BASE}],{duration:700,easing:'ease-in-out'})}
function mkGhost(c){const r=c.getBoundingClientRect(),cs=getComputedStyle(c),g=document.createElement('span');g.textContent=c.textContent;
  Object.assign(g.style,{position:'absolute',left:r.left+scrollX+'px',top:r.top+scrollY+'px',width:r.width+'px',height:r.height+'px',lineHeight:r.height+'px',textAlign:'center',whiteSpace:'pre',fontFamily:cs.fontFamily,fontSize:cs.fontSize,fontWeight:cs.fontWeight,color:cs.color,textTransform:cs.textTransform,pointerEvents:'none',zIndex:2});
  layer.appendChild(g);c.classList.add('gh');return{g,w:r.width,h:r.height,done(){g.remove();c.classList.remove('gh')}}}
function hop(c){const o=mkGhost(c);o.g.animate([{transform:'translateY(0) scale(1,1)'},{transform:'translateY(-26px) scale(.94,1.1)',offset:.45},{transform:'translateY(0) scale(1.1,.9)',offset:.8},{transform:'translateY(0) scale(1,1)'}],{duration:420,easing:'ease-out'}).finished.then(()=>o.done()).catch(()=>o.done())}
function bigChars(n){const out=[];
  for(const el of shuffle([...document.querySelectorAll('[data-type]')].filter(e=>e.classList.contains('built')&&parseFloat(getComputedStyle(e).fontSize)>=36&&C.inView(e))))
    for(const c of el.querySelectorAll('.ch.on')){const r=c.getBoundingClientRect();if(r.width>16&&r.height>34&&r.top>76&&r.bottom<innerHeight-30&&c.textContent.trim()&&!c.classList.contains('gh'))out.push(c)}
  return shuffle(out).slice(0,n)}
function bubble(q,txt){const d=document.createElement('div');d.className='pin bubble';d.textContent=txt;d.style.left=q.x+'px';d.style.top=q.y-14+'px';d.style.fontSize='18px';layer.appendChild(d);return d}
function playAct(id,o){C.act('play_'+id,{cd:o.cd||120000,w:o.w||.35,who:{},
  pick:()=>{if(C.isBusy())return null;if(window.__fxHold&&!window.__fxManual)return null;if(!C.gapOK())return null;return o.pick?o.pick():{}},
  async run(a,x){if(C.isBusy())return;C.lock();try{await o.run(a,x)}catch(e){console.error('play '+id,e)}finally{C.unlock()}}})}

/* =================== games with your real mouse =================== */
playAct('tag',{async run(a){
  const team=teamOf(a,6);grab(team);let it=team[0],freeze=0;const m=()=>mouseP();
  team.forEach(q=>{q.k=8;q.tgt=()=>{if(q===it){if(NOW()<freeze)return{x:q.x,y:q.y};return m()}
    const dx=q.x-it.x,dy=q.y-it.y,d=Math.hypot(dx,dy)||1;return clampV(q.x+dx/d*240+Math.sin(NOW()/300+q.id)*60,q.y+dy/d*240+Math.cos(NOW()/320+q.id)*60)}});
  await run(T(16000),()=>{const mm=m();if(NOW()>freeze&&Math.hypot(it.x-mm.x,it.y-mm.y)<20){freeze=NOW()+1500;sfx.play('boing',it);puff(it.x,it.y,10);
    const nxt=team.filter(q=>q!==it).sort((p,q)=>Math.hypot(p.x-mm.x,p.y-mm.y)-Math.hypot(q.x-mm.x,q.y-mm.y))[0];setTimeout(()=>{it=nxt},1500)}});
  sfx.play('tada');puff(a.x,a.y,24);drop(team,a)}});

playAct('snake',{async run(a){
  const team=teamOf(a,8);grab(team);const trail=[];let still=0,last=mouseP(),spiral=false;
  team.forEach((q,i)=>{q.k=9;q.tgt=()=>{const m=mouseP();if(spiral){const an=NOW()/600+i*.85,r=22+i*13;return{x:m.x+Math.cos(an)*r,y:m.y+Math.sin(an)*r*.8}}return trail[Math.max(0,trail.length-1-(i+1)*7)]||m}});
  await run(T(15000),()=>{const m=mouseP();trail.push({x:m.x,y:m.y});if(trail.length>200)trail.shift();still=Math.hypot(m.x-last.x,m.y-last.y)<2?still+1:0;last=m;const was=spiral;spiral=still>30;if(spiral&&!was)sfx.play('cheer')});
  sfx.play('ding',a);drop(team,a)}});

playAct('catchme',{async run(a){
  let hits=0;a.k=9;const respawn=()=>{const p=V(rnd(120,innerWidth-120),rnd(130,innerHeight-90));a.x=p.x;a.y=p.y};
  a.tgt=()=>{const m=mouseP(),dx=a.x-m.x,dy=a.y-m.y,d=Math.hypot(dx,dy)||1,tx=a.x+dx/d*260,ty=a.y+dy/d*260,c=clampV(tx,ty,50);
    if(Math.hypot(c.x-tx,c.y-ty)>80){c.x+=-dy/d*180;c.y+=dx/d*180}return clampV(c.x,c.y,50)};
  await run(T(18000),()=>{const m=mouseP();if(Math.hypot(a.x-m.x,a.y-m.y)<22){hits++;puff(a.x,a.y,18);sfx.play('pop');sfx.say(a,'eep!');respawn();if(hits>=3)return true}});
  sfx.play('tada');puff(a.x,a.y,24)}});

playAct('keepy',{async run(a){
  const team=teamOf(a,4);grab(team);const ball=document.createElement('div');
  Object.assign(ball.style,{position:'absolute',left:'0',top:'0',width:'20px',height:'20px',marginLeft:'-10px',marginTop:'-10px',borderRadius:'50%',background:'radial-gradient(circle at 35% 30%,#fff,#ff5a5a 55%,#b01020)',boxShadow:'0 4px 10px rgba(0,0,0,.5)',zIndex:4,pointerEvents:'none'});layer.appendChild(ball);
  let bx=innerWidth*.5,by=innerHeight*.3,vx=rnd(-60,60),vy=0,touches=0;const floor=innerHeight-60;
  team.forEach((q,i)=>{q.k=11;q.tgt=()=>V(clamp(bx+(i-1.5)*52,50,innerWidth-50),Math.min(floor,by+44))});
  try{await run(T(17000),dt=>{vy+=1500*dt;bx+=vx*dt;by+=vy*dt;if(bx<24||bx>innerWidth-24){vx=-vx;bx=clamp(bx,24,innerWidth-24)}
    const m=mouseP(),mx=m.x-scrollX,my=m.y-scrollY;if(Math.hypot(bx-mx,by-my)<30&&vy>-300){vy=-rnd(700,900);vx=(bx-mx)*8;sfx.play('boing')}
    for(const q of team){const qx=q.x-scrollX,qy=q.y-scrollY;if(vy>0&&Math.abs(bx-qx)<28&&by>qy-24&&by<qy+14){const o=pick(team);vy=-rnd(680,860);vx=clamp((o.x-scrollX-bx)*1.1,-380,380);touches++;sfx.note(touches,q,.2);puff(scrollX+bx,scrollY+by,4,['#ffffff'])}}
    if(by>floor+10){sfx.play('oops');by=innerHeight*.25;bx=pick(team).x-scrollX;vy=0;vx=0}
    ball.style.transform=`translate3d(${scrollX+bx}px,${scrollY+by}px,0)`})}finally{ball.remove()}
  sfx.play('cheer');drop(team,a)}});

/* =================== scenes between cursors =================== */
playAct('dance',{async run(a){
  const team=teamOf(a,8);grab(team);const cx=innerWidth/2,cy=innerHeight*.55,t0=NOW();let step=0;
  const slot=i=>({x:cx+((i%4)-1.5)*74,y:cy+(Math.floor(i/4)-.5)*70});
  team.forEach((q,i)=>{q.k=10;q.tgt=()=>{const t=(NOW()-t0)/1000,s=slot(i);
    switch(step){case 0:return V(s.x,s.y+Math.sin(t*6+i*.7)*18);
      case 1:{const an=t*5+i*.8;return V(s.x+Math.cos(an)*24,s.y+Math.sin(an)*24)}
      case 2:return V(s.x+(i%2?1:-1)*Math.sin(t*5)*34,s.y+(Math.floor(t*2.5)%2?-10:10));
      case 3:return V(s.x,s.y-Math.abs(Math.sin(t*5+i*.4))*34);
      default:{const u=(t*.4+i*.09)%1;return V(60+u*(innerWidth-120),cy+Math.sin(u*12)*24)}}}});
  let nb=0;await run(T(14000),(dt,e)=>{step=Math.min(4,Math.floor(e/2.8));if(e*1000>nb*500){nb++;sfx.note(nb%6+step,team[nb%team.length],.14)}});
  sfx.play('tada');puff(a.x,a.y,24);drop(team,a)}});

playAct('race',{async run(a){
  const team=teamOf(a,5);grab(team);const x0=70,x1=innerWidth-90,cy=innerHeight*.55,flag=document.createElement('div');
  Object.assign(flag.style,{position:'absolute',left:'0',top:'0',width:'14px',height:'200px',background:'repeating-conic-gradient(#fff 0 25%,#111 0 50%) 0 0/14px 14px',zIndex:2,pointerEvents:'none',opacity:.9});layer.appendChild(flag);
  flag.style.transform=`translate3d(${scrollX+x1+20}px,${scrollY+cy-100}px,0)`;
  const prog=team.map(()=>0);let go=false,winner=-1;
  team.forEach((q,i)=>{q.k=10;q.tgt=()=>V(go?x0+(x1-x0)*prog[i]:x0,cy+(i-2)*38)});
  try{for(let n=0;n<3;n++){sfx.play('beep');await wait(T(650))}sfx.play('go');go=true;
    await run(T(9000),dt=>{team.forEach((q,i)=>{if(winner<0){prog[i]=Math.min(1,prog[i]+dt*(.1+Math.random()*.16)*(Math.random()<.04?3:1));if(prog[i]>=1)winner=i}});return winner>=0});
    if(winner<0)winner=0;const w=team[winner],t1=NOW();sfx.play('tada',w);puff(w.x,w.y,28);
    w.tgt=()=>{const t=(NOW()-t1)/1000,m=V(x1,cy+(winner-2)*38);return{x:m.x+Math.cos(t*9)*26,y:m.y+Math.sin(t*9)*26}};await wait(T(1800))}
  finally{flag.remove()}drop(team,a)}});

playAct('band',{pick:()=>{const cs=bigChars(5);return cs.length>=3?{cs}:null},async run(a,x){
  const cs=x.cs,team=teamOf(a,3);grab(team);const mel=[0,2,4,2,0,2,4,7,5,4,2,0,2,4,2,0];let i=0;
  for(const n of mel){const c=cs[n%cs.length],q=team[i++%team.length];q.k=14;q.tgt=()=>{const r=c.getBoundingClientRect();return V(r.left+r.width/2,r.top+r.height*.3)};
    sfx.note(n,q,.3);hop(c);await wait(T(430))}
  sfx.play('tada');drop(team,a)}});

playAct('rps',{async run(a){
  const team=teamOf(a,4);if(team.length<4)return;grab(team);const GL=['✊','✋','✌'],cx=innerWidth/2,cy=innerHeight*.58;
  async function match(p,q,pos){for(let tries=0;tries<3;tries++){const t0=NOW();p.k=q.k=10;
    p.tgt=()=>V(pos.x-46,pos.y-Math.abs(Math.sin((NOW()-t0)/1000*7))*18);q.tgt=()=>V(pos.x+46,pos.y-Math.abs(Math.sin((NOW()-t0)/1000*7))*18);
    for(let k=0;k<3;k++){sfx.play('tick');await wait(T(420))}
    const g1=Math.floor(rnd(0,3)),g2=Math.floor(rnd(0,3)),b1=bubble(p,GL[g1]),b2=bubble(q,GL[g2]);await wait(T(1100));b1.remove();b2.remove();
    if(g1===g2){sfx.play('oops');continue}
    const w=(g1-g2+3)%3===1?p:q,l=w===p?q:p;sfx.play('cheer',w);puff(w.x,w.y,12);hopCursor(w);sfx.play('sigh',l);await wait(T(600));return w}
    return Math.random()<.5?p:q}
  const [w1,w2]=await Promise.all([match(team[0],team[1],{x:cx-130,y:cy}),match(team[2],team[3],{x:cx+130,y:cy})]);
  const champ=await match(w1,w2,{x:cx,y:cy}),t1=NOW();sfx.play('tada',champ);puff(champ.x,champ.y,30);
  champ.tgt=()=>{const t=(NOW()-t1)/1000,m=V(cx,cy);return{x:m.x+Math.cos(t*9)*28,y:m.y+Math.sin(t*9)*28}};await wait(T(1800));drop(team,a)}});

playAct('hide',{pick:()=>{const cs=bigChars(5);return cs.length>=3?{cs}:null},async run(a,x){
  const hiders=teamOf(a,5).slice(1);if(hiders.length<3)return;grab(hiders);
  const spots=hiders.map((q,i)=>{const r=x.cs[i%x.cs.length].getBoundingClientRect();return{x:r.left+r.width*.5+rnd(-8,8),y:r.top+r.height*.7}});
  try{hiders.forEach((q,i)=>{q.k=11;q.tgt=()=>V(spots[i].x,spots[i].y)});await wait(T(1700));
    hiders.forEach(q=>{q.el.style.transition='opacity .4s';q.el.style.opacity='.08'});sfx.play('tick');await wait(T(2500));
    a.k=8;for(let i=0;i<hiders.length;i++){await a.go(()=>V(spots[i].x+22,spots[i].y-12),2500);await wait(T(600));
      hiders[i].el.style.opacity='1';hopCursor(hiders[i]);sfx.play('boo',hiders[i]);puff(hiders[i].x,hiders[i].y,10)}
    await wait(T(700));sfx.play('cheer')}
  finally{hiders.forEach(q=>{q.el.style.opacity='';q.el.style.transition=''})}drop(hiders,a)}});

/* =================== playing with the page's text =================== */
playAct('hunt',{pick:()=>{const cs=bigChars(60);if(cs.length<5)return null;const cnt={};
    cs.forEach(c=>{const k=c.textContent.toUpperCase();if(/[A-Z0-9]/.test(k))(cnt[k]=cnt[k]||[]).push(c)});
    const best=Object.entries(cnt).sort((p,q)=>q[1].length-p[1].length)[0];return best&&best[1].length>=3?{cs:best[1].slice(0,7)}:null},
  async run(a,x){const team=teamOf(a,3);grab(team);const rings=[];let i=0;
    try{for(const c of x.cs){const q=team[i++%team.length];q.k=11;q.tgt=()=>{const r=c.getBoundingClientRect();return V(r.left+r.width/2,r.top+r.height/2)};await wait(T(600));
      const r=c.getBoundingClientRect(),ring=document.createElement('div');
      Object.assign(ring.style,{position:'absolute',left:r.left+scrollX-6+'px',top:r.top+scrollY-4+'px',width:r.width+12+'px',height:r.height+8+'px',border:'2px solid #3b9cff',borderRadius:'10px',boxShadow:'0 0 12px rgba(59,156,255,.7)',pointerEvents:'none',zIndex:3});
      layer.appendChild(ring);rings.push(ring);sfx.note(i,q,.22)}
      await wait(T(600));x.cs.forEach(hop);sfx.play('tada');await wait(T(900))}
    finally{rings.forEach(r=>r.remove())}drop(team,a)}});

K.fx('tug',{pre:'play_',kind:'char',replace:true,w:.35,who:{},async run(S,a){
  const {G,K:k,W,H}=S,helpers=teamOf(a,4).slice(1);grab(helpers);let d=0;
  S.drw.push(c=>{const dd=d*k;
    for(const side of [-1,1]){c.save();c.translate(side*dd,0);c.beginPath();c.rect(side<0?0:G.cx,0,side<0?G.cx:W-G.cx,H);c.clip();c.drawImage(S.glyph,0,0,W,H);c.restore()}
    if(d>2){c.save();c.lineCap='round';for(let i=0;i<9;i++){const y=G.y+(i+.5)/9*G.h;if(!S.on(G.cx,y))continue;c.strokeStyle=S.col;c.globalAlpha=.8;c.lineWidth=Math.max(.8,2.2*k*(1-d/90));
      c.beginPath();c.moveTo(G.cx-dd,y);c.quadraticCurveTo(G.cx,y+Math.sin(S.t*14+i)*3,G.cx+dd,y);c.stroke()}c.restore()}});
  try{await K.lead(S);S.follow(()=>({x:G.cx-G.w*.5-d*k-14,y:G.cy}),11);
    helpers.forEach((q,i)=>{q.k=11;q.tgt=()=>S.P(i===0?G.cx-G.w*.5-d*k-14:G.cx+G.w*.5+d*k+14,G.cy+(i?0:-26))});
    for(const peak of [20,44,30,60]){await S.tw(650,t=>d=lerp(d,peak,.2+t*.6));sfx.play('tick')}
    sfx.play('boing');await S.tw(380,t=>{d=60*(1-t*t)*Math.cos(t*10)});d=0;S.shake=.8;await S.wait(500)}
  finally{drop(helpers,a)}}});

K.fx('domino',{pre:'play_',kind:'word',replace:true,w:.35,who:{},async run(S,a){
  const {G,K:k}=S,cc=S.charCanvases(),n=cc.length,ang=new Array(n).fill(0);let front=0;
  S.drw.push(c=>{cc.forEach((o,i)=>{c.save();c.translate(o.px,o.py);c.rotate(ang[i]);c.translate(-o.px,-o.py);c.drawImage(o.cv,0,0,S.W,S.H);c.restore()})});
  await K.lead(S);S.follow(()=>({x:G.x+front*G.w,y:G.y-S.pad*.3}),9);await S.wait(500);
  await Promise.all(cc.map((o,i)=>(async()=>{await S.wait(i*190);sfx.play('tick');front=(i+1)/n;await S.tw(520,t=>ang[i]=1.4*t*t);
    for(let j=0;j<3;j++)S.spawn({type:'smoke',x:o.px+rnd(-6,10),y:o.py,vx:rnd(10,60),vy:-rnd(5,30),life:.6,size:rnd(8,13)*k,grow:1.3,col:'200,200,200',a:.3})})()));
  await S.wait(800);front=1;S.follow(()=>({x:G.x+front*G.w,y:G.y-S.pad*.3}),9);
  await Promise.all(cc.map((o,i)=>(async()=>{const j=n-1-i;await S.wait(j*150);sfx.note(i,a,.18);const from=ang[i];await S.tw(420,t=>{const e=1-Math.pow(1-t,3);ang[i]=from*(1-e)-Math.sin(t*Math.PI)*.12*(1-t)})
    ;ang[i]=0})()));
  front=0;sfx.play('ding',a);await S.wait(400)}});

playAct('moving',{pick:()=>{const t=K.targets('char');return t},async run(a,x){
  const c=x.chars[0],r0=c.getBoundingClientRect(),o=mkGhost(c);let carry=false;
  const home=V(r0.left+r0.width/2,r0.top+r0.height/2);let dest=null;
  for(let i=0;i<30&&!dest;i++){const d=V(rnd(80,innerWidth-80),rnd(130,innerHeight-90));if(Math.hypot(d.x-home.x,d.y-home.y)>240)dest=d}dest=dest||V(innerWidth/2,innerHeight*.7);
  const iv=setInterval(()=>{if(carry){o.g.style.left=a.x-o.w/2+'px';o.g.style.top=a.y-o.h*.25+'px'}},16);
  try{a.k=9;await a.go(()=>({x:home.x,y:home.y-o.h*.25}),2500);sfx.play('boo',a);carry=true;a.k=6;
    await a.go(()=>dest,3500);carry=false;o.g.style.left=dest.x-o.w/2+'px';o.g.style.top=dest.y-o.h*.25+'px';sfx.play('boing',a);
    o.g.animate([{transform:'translateY(-24px) scale(.96,1.08)'},{transform:'translateY(0) scale(1.12,.88)',offset:.55},{transform:'translateY(0) scale(1,1)'}],{duration:480,easing:'ease-in'});
    await wait(T(1600));a.k=9;await a.go(()=>({x:dest.x,y:dest.y-o.h*.25}),2000);carry=true;sfx.play('boo',a);a.k=6;await a.go(()=>home,3500);carry=false;
    o.g.style.left=home.x-o.w/2+'px';o.g.style.top=home.y-o.h/2+'px';sfx.play('ding',a);await wait(T(300))}
  finally{clearInterval(iv);o.done()}}});

/* =================== reacting to you =================== */
playAct('resume',{pick:()=>{const b=document.querySelector('a.btn[download]');if(!b)return null;const r=b.getBoundingClientRect();return r.top>80&&r.bottom<innerHeight-20?{b}:null},async run(a,x){
  const team=teamOf(a,5),b=x.b;grab(team);
  team.forEach((q,i)=>{q.k=9;q.tgt=()=>{const r=b.getBoundingClientRect(),t=NOW()/1000;return V(r.left+(i+.5)*(r.width/team.length),r.top-26+Math.sin(t*5+i)*Math.abs(Math.sin(t*1.3+i))*8)}});
  let cheered=false;await run(T(8000),()=>{const r=b.getBoundingClientRect(),m=mouseP(),mx=m.x-scrollX,my=m.y-scrollY;
    if(mx>r.left&&mx<r.right&&my>r.top&&my<r.bottom&&!cheered){cheered=true;sfx.play('tada');puff(m.x,m.y,20)}if(Math.random()<.02)sfx.say(pick(team),'hmm')});
  drop(team,a)}});

let sleeping=false;
async function sleepAll(cond){
  if(sleeping)return;sleeping=true;const sl=agents.filter(q=>q.mode==='roam'&&!q.busy);if(!sl.length){sleeping=false;return}
  sl.forEach((q,i)=>{q.busy=true;q.mode='work';q.k=1.6;q.tgt=()=>{const m=mouseP(),t=NOW()/1000,an=i*(TAU/sl.length)+.4,r=70+(i%3)*30;return{x:m.x+Math.cos(an)*r,y:m.y+Math.sin(an)*r*.6+Math.sin(t*1.2+i)*3}}});
  let lastSnore=0;
  try{while(cond()){await wait(T(600));const q=pick(sl),d=document.createElement('div');d.textContent='z';
      Object.assign(d.style,{position:'absolute',left:q.x+10+'px',top:q.y-6+'px',font:'700 15px Inter,sans-serif',color:'rgba(255,255,255,.85)',pointerEvents:'none',zIndex:5});layer.appendChild(d);
      d.animate([{transform:'translate(0,0) scale(.7)',opacity:0},{opacity:1,offset:.2},{transform:'translate(18px,-34px) scale(1.2)',opacity:0}],{duration:1700,easing:'ease-out'}).finished.then(()=>d.remove()).catch(()=>d.remove());
      if(NOW()-lastSnore>3500){lastSnore=NOW();sfx.play('snore',q)}}}
  finally{sfx.play('yawn',sl[0]);sl.forEach(q=>{stretch(q);q.busy=false;startRoam(q)});sleeping=false}}
playAct('sleepy',{async run(a){const end=NOW()+T(8000);await sleepAll(()=>NOW()<end)}});

async function dizzy(){
  const ag=agents.filter(q=>q.mode==='roam'&&!q.busy);if(!ag.length)return;
  ag.forEach((q,i)=>{q.busy=true;q.mode='work';const cx0=q.x,cy0=q.y,t0=NOW();q.k=12;q.tgt=()=>{const t=(NOW()-t0)/1000;return{x:cx0+Math.cos(t*9+i)*16,y:cy0+Math.sin(t*9+i)*16}}});
  sfx.play('dizzy',ag[0]);await wait(T(2200));sfx.play('sigh',ag[0]);ag.forEach(q=>{q.busy=false;startRoam(q)})}
playAct('dizzy',{async run(){await dizzy()}});

playAct('parade',{w:.3,async run(a){
  const team=agents.filter(q=>q===a||(q.mode==='roam'&&!q.busy));grab(team);const y=innerHeight*.4,t0=NOW();
  team.forEach((q,i)=>{q.k=9;q.tgt=()=>{const t=(NOW()-t0)/1000,u=((t*.14+(team.length-i)*.045)%1.3)-.1;return V(u*innerWidth,y+Math.sin(t*5+i)*10)}});
  sfx.play('tada');await run(T(8000),()=>{if(Math.random()<.2){const q=pick(team);puff(q.x,q.y,6)}});drop(team,a)}});

playAct('hello',{async run(a){
  const team=agents.filter(q=>q===a||(q.mode==='roam'&&!q.busy));grab(team);const y=innerHeight*.28,t0=NOW();
  team.forEach((q,i)=>{q.k=10;q.tgt=()=>{const t=(NOW()-t0)/1000;return V(innerWidth*(.18+.64*i/Math.max(1,team.length-1)),y+Math.sin(t*7-i*.7)*18)}});
  for(let i=0;i<team.length;i++){sfx.note(i,team[i],.18);await wait(T(110))}await wait(T(2500));sfx.play('cheer');drop(team,a)}});

/* =================== always-on reactions =================== */
const idleNow=()=>!C.isBusy()&&!agents.some(q=>q.busy);
// click party: a little firework where you click, and the nearest cursor cheers
addEventListener('pointerdown',e=>{
  if(e.target.closest&&e.target.closest('#ui,#animMenu,a,button'))return;
  const x=e.clientX+scrollX,y=e.clientY+scrollY;puff(x,y,16);sfx.play('pop');
  const near=agents.filter(q=>q.mode==='roam'&&!q.busy).sort((p,q)=>Math.hypot(p.x-x,p.y-y)-Math.hypot(q.x-x,q.y-y))[0];if(near){hopCursor(near);sfx.say(near,'!')}},{passive:true});
// sleepy: when your mouse has been still for a while they curl up and snooze
setInterval(()=>{if(!sleeping&&mouse.seen&&idleNow()&&NOW()-mouse.t>10000)sleepAll(()=>NOW()-mouse.t>800)},1000);
// dizzy: scrolling very fast makes them wobble
let sy=scrollY,st=NOW(),acc=0,lastDizzy=0;
addEventListener('scroll',()=>{const n=NOW(),d=Math.abs(scrollY-sy);sy=scrollY;if(n-st>700){acc=0;st=n}acc+=d;
  if(acc>2600&&n-lastDizzy>12000&&idleNow()){lastDizzy=n;acc=0;dizzy()}},{passive:true});
// secret codes: Konami starts a parade, typing "hello" makes everyone wave
const KON=['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];let kp=0,typed='';
addEventListener('keydown',e=>{const k=e.key.length===1?e.key.toLowerCase():e.key;
  kp=(k===KON[kp])?kp+1:(k===KON[0]?1:0);if(kp===KON.length){kp=0;if(C.playAct)C.playAct('play_parade')}
  if(e.key.length===1){typed=(typed+k).slice(-5);if(typed==='hello'){typed='';if(C.playAct)C.playAct('play_hello')}}});
// night lanterns and morning stretches
const hr=new Date().getHours();
if(hr>=20||hr<6)document.documentElement.classList.add('night');
if(hr>=6&&hr<10)setInterval(()=>{if(idleNow()&&Math.random()<.5){const q=pick(agents.filter(q=>q.mode==='roam'&&!q.busy));if(q){stretch(q);sfx.play('yawn',q)}}},25000);

C.stretchRandom=()=>{const q=pick(agents.filter(q=>q.mode==='roam'&&!q.busy));if(q){stretch(q);sfx.play('yawn',q)}};
/* sound toggle */
(()=>{const ui=document.getElementById('ui');if(!ui)return;const b=document.createElement('button');b.type='button';b.id='sound';
  const paint=()=>{b.textContent='Sound: '+(sfx.on?'on':'off')};paint();
  b.addEventListener('click',()=>{sfx.wake();sfx.on=!sfx.on;paint();if(sfx.on)setTimeout(()=>sfx.play('ding',agents[0]),60)});ui.appendChild(b)})();
})();
