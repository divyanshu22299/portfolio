/* Cursor experiences: a full-viewport light engine (comet trails, ribbons, lightning, bloom) with the cursors as the actors. */
(()=>{
const C=window.__fxCore,K=C&&C.kit;if(!C||!K)return;
const {layer,agents,rnd,clamp,wait,NOW,shuffle,pick,startRoam,mouse,mouseP}=C;
const TAU=Math.PI*2,lerp=(a,b,t)=>a+(b-a)*t,T=ms=>ms*(window.__fxSpeed||1),ease=t=>1-Math.pow(1-t,3);
const V=(x,y)=>({x:scrollX+x,y:scrollY+y}),vp=a=>({x:a.x-scrollX,y:a.y-scrollY});
const PCOL=['255,59,59','255,170,60','255,255,255','110,190,255','190,150,255'];
const PAL=t=>{t=((t%1)+1)%1;if(t<.5){const k=t*2;return`255,${Math.round(59+196*k)},${Math.round(59+196*k)}`}const k=(t-.5)*2;return`${Math.round(255-175*k)},${Math.round(255-85*k)},255`};
async function ramp(ms,fn){const t0=NOW();for(;;){const k=Math.min(1,(NOW()-t0)/Math.max(1,ms));fn(k);if(k>=1)break;await wait(16)}}
async function run(ms,fn){const t0=NOW();let last=t0;for(;;){await wait(30);const n=NOW(),e=n-t0;if(e>=ms)break;if(fn((n-last)/1000,e/1000)===true)break;last=n}}

/* ============================ the light engine ============================ */
function makeArena(){
  const cv=document.createElement('canvas');cv.style.cssText='position:fixed;left:0;top:0;pointer-events:none;z-index:99';document.body.appendChild(cv);
  const ctx=cv.getContext('2d'),dpr=Math.min(2,devicePixelRatio||1);let W=innerWidth,H=innerHeight;
  const size=()=>{W=innerWidth;H=innerHeight;cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);cv.style.width=W+'px';cv.style.height=H+'px';ctx.setTransform(dpr,0,0,dpr,0,0)};size();addEventListener('resize',size);
  const sm=document.createElement('canvas'),smx=sm.getContext('2d');
  const A={cv,ctx,dpr,t:0,ps:[],upd:[],drw:[],trails:new Map(),auto:false,idle:0,raf:0,alive:false,get W(){return W},get H(){return H}};
  A.spawn=o=>A.ps.push(Object.assign({x:0,y:0,vx:0,vy:0,g:0,drag:0,age:0,life:1,size:2,r1:0,type:'dot',col:'255,255,255',a:1,rot:0,vr:0,grow:0,add:true,tr:0,lw:2,txt:'',font:'',fn:null},o));
  A.paint=()=>{const c=document.createElement('canvas');c.width=cv.width;c.height=cv.height;const x=c.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);return{cv:c,cx:x}};
  A.fade=(P,a)=>{P.cx.save();P.cx.globalCompositeOperation='destination-out';P.cx.fillStyle=`rgba(0,0,0,${a})`;P.cx.fillRect(0,0,W,H);P.cx.restore()};
  A.bloom=(src,al=.6)=>{const w=Math.max(8,Math.round(W/5)),h=Math.max(8,Math.round(H/5));if(sm.width!==w||sm.height!==h){sm.width=w;sm.height=h}
    smx.clearRect(0,0,w,h);smx.imageSmoothingEnabled=true;smx.drawImage(src,0,0,w,h);ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=al;ctx.imageSmoothingEnabled=true;ctx.drawImage(sm,0,0,w,h,0,0,W,H);ctx.restore()};
  A.track=(q,o)=>A.trails.set(q,Object.assign({pts:[],len:34,w:6,col:'170,215,255',a:1},o));
  A.ribbon=(pts,w,col,al=1)=>{const n=pts.length;if(n<2)return;const c=ctx;c.save();c.lineCap='round';c.lineJoin='round';c.globalCompositeOperation='lighter';
    for(const [mul,aa] of [[3.4,.1],[1.7,.22],[.7,.95]])for(let i=1;i<n;i++){const t=i/n,cc=typeof col==='function'?col(t):col;c.strokeStyle=`rgba(${cc},${aa*al*t*t})`;c.lineWidth=Math.max(.5,w*mul*t);c.beginPath();c.moveTo(pts[i-1].x,pts[i-1].y);c.lineTo(pts[i].x,pts[i].y);c.stroke()}c.restore()};
  A.drawTrails=()=>{for(const tr of A.trails.values())A.ribbon(tr.pts,tr.w,tr.col,tr.a)};
  A.halo=(x,y,r,col,al)=>{const c=ctx,g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${col},${al})`);g.addColorStop(1,`rgba(${col},0)`);c.save();c.globalCompositeOperation='lighter';c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);c.restore()};
  A.ring=(x,y,r0,r1,life,col,lw)=>A.spawn({type:'ring',x,y,size:r0,r1,life,col,lw});
  A.text=(txt,x,y,col,font,life=1.1)=>A.spawn({type:'text',txt,x,y,vy:-34,life,col,font,add:false});
  A.star=(x,y,s,al)=>{const c=ctx;c.save();c.globalCompositeOperation='lighter';c.globalAlpha=al;const g=c.createRadialGradient(x,y,0,x,y,s);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.35,'rgba(200,225,255,.5)');g.addColorStop(1,'rgba(150,200,255,0)');c.fillStyle=g;c.beginPath();c.arc(x,y,s,0,TAU);c.fill();
    c.fillStyle='#fff';c.beginPath();c.moveTo(x,y-s*1.6);c.quadraticCurveTo(x,y,x+s*1.6,y);c.quadraticCurveTo(x,y,x,y+s*1.6);c.quadraticCurveTo(x,y,x-s*1.6,y);c.quadraticCurveTo(x,y,x,y-s*1.6);c.fill();c.restore()};
  A.bolt=(x0,y0,x1,y1,d)=>{let p=[{x:x0,y:y0},{x:x1,y:y1}];for(let s=d;s>1.4;s*=.55){const n=[];for(let i=0;i<p.length-1;i++){const a=p[i],b=p[i+1];n.push(a);n.push({x:(a.x+b.x)/2+rnd(-s,s),y:(a.y+b.y)/2+rnd(-s,s)})}n.push(p[p.length-1]);p=n}return p};
  A.drawBolt=(p,al,col='150,200,255')=>{const c=ctx;c.save();c.globalCompositeOperation='lighter';c.lineJoin='round';c.lineCap='round';
    for(const [w,a,cc] of [[9,.16,col],[3.4,.5,col],[1.4,1,'255,255,255']]){c.strokeStyle=`rgba(${cc},${a*al})`;c.lineWidth=w;c.beginPath();p.forEach((q,i)=>i?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y));c.stroke()}c.restore()};
  const drawP=(p)=>{const c=ctx,k=clamp(1-p.age/p.life,0,1);c.globalCompositeOperation=p.add?'lighter':'source-over';
    switch(p.type){
      case'dot':c.fillStyle=`rgba(${p.col},${p.a*k})`;c.beginPath();c.arc(p.x,p.y,Math.max(.2,p.size*(.4+.6*k)),0,TAU);c.fill();break;
      case'glow':{const r=p.size*(.5+.5*k),g=c.createRadialGradient(p.x,p.y,0,p.x,p.y,r);g.addColorStop(0,`rgba(${p.col},${p.a*k})`);g.addColorStop(1,`rgba(${p.col},0)`);c.fillStyle=g;c.fillRect(p.x-r,p.y-r,r*2,r*2);break}
      case'smoke':{const r=p.size*(1+p.grow*p.age),g=c.createRadialGradient(p.x,p.y,0,p.x,p.y,r);g.addColorStop(0,`rgba(${p.col},${p.a*k*k})`);g.addColorStop(1,`rgba(${p.col},0)`);c.fillStyle=g;c.fillRect(p.x-r,p.y-r,r*2,r*2);break}
      case'spark':{c.lineCap='round';if(p.hist&&p.hist.length>1){for(let i=1;i<p.hist.length;i++){const t=i/p.hist.length;c.strokeStyle=`rgba(${p.col},${k*t})`;c.lineWidth=Math.max(.4,p.size*t);c.beginPath();c.moveTo(p.hist[i-1].x,p.hist[i-1].y);c.lineTo(p.hist[i].x,p.hist[i].y);c.stroke()}}
        else{c.strokeStyle=`rgba(${p.col},${k})`;c.lineWidth=p.size;c.beginPath();c.moveTo(p.x-p.vx*.035,p.y-p.vy*.035);c.lineTo(p.x,p.y);c.stroke()}break}
      case'ring':{const e=ease(p.age/p.life),r=lerp(p.size,p.r1,e);c.strokeStyle=`rgba(${p.col},${p.a*k})`;c.lineWidth=Math.max(.4,p.lw*k);c.beginPath();c.arc(p.x,p.y,r,0,TAU);c.stroke();break}
      case'star':A.star(p.x,p.y,p.size*(.4+.6*Math.sin(Math.PI*clamp(p.age/p.life,0,1))),p.a);break;
      case'text':{const s=(1+.5*Math.max(0,1-p.age*7))*(1+p.grow*p.age);c.save();c.translate(p.x,p.y);c.scale(s,s);c.font=p.font||'700 22px Inter,sans-serif';c.textAlign='center';c.textBaseline='middle';c.shadowColor=`rgba(${p.col},.9)`;c.shadowBlur=14;c.fillStyle=`rgba(${p.col},${p.a*Math.min(1,k*2.2)})`;c.fillText(p.txt,0,0);c.restore();break}
    }c.globalCompositeOperation='source-over'};
  let last=NOW();
  const loop=now=>{if(!A.alive)return;const dt=Math.min(.05,(now-last)/1000);last=now;A.t+=dt;
    try{
      for(const u of A.upd)u(dt,A.t);
      for(const [q,tr] of A.trails){const p=vp(q);tr.pts.push({x:p.x,y:p.y});while(tr.pts.length>tr.len)tr.pts.shift()}
      for(const p of A.ps){p.age+=dt;const d=Math.exp(-p.drag*dt);p.vx*=d;p.vy*=d;p.vy+=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=p.vr*dt;if(p.tr){(p.hist||(p.hist=[])).push({x:p.x,y:p.y});if(p.hist.length>p.tr)p.hist.shift()}if(p.fn)p.fn(p,dt)}
      for(let i=A.ps.length-1;i>=0;i--)if(A.ps[i].age>A.ps[i].life)A.ps.splice(i,1);
      ctx.clearRect(0,0,W,H);for(const d of A.drw)d(ctx,A.t,dt);for(const p of A.ps)drawP(p);
      if(A.auto){A.idle=(!A.ps.length&&!A.drw.length)?A.idle+dt:0;if(A.idle>.4){A.stop();return}}
    }catch(e){if(!A.err){A.err=1;console.error('arena',e)}}
    A.raf=requestAnimationFrame(loop)};
  A.start=()=>{if(A.alive)return;A.alive=true;last=NOW();A.raf=requestAnimationFrame(loop)};
  A.stop=()=>{A.alive=false;cancelAnimationFrame(A.raf);removeEventListener('resize',size);cv.remove()};
  return A}

/* ============================ helpers ============================ */
const teamOf=(lead,n)=>[lead,...shuffle(agents.filter(q=>q!==lead&&q.mode==='roam'&&!q.busy)).slice(0,n-1)];
const grab=l=>l.forEach(q=>{if(!q.busy){q.busy=true;q.mode='work'}});
const hot=(l,on)=>l.forEach(q=>q.el&&q.el.classList.toggle('hot',on));
const drop=(l,lead)=>l.forEach(q=>{if(q!==lead){q.busy=false;if(q.hideSel)q.hideSel();if(q.el)q.el.style.opacity='';startRoam(q)}});
async function session(n,fn,lead){
  if(C.isBusy())return;C.lock();const A=makeArena();A.start();let team=[];
  try{team=lead?teamOf(lead,n):shuffle(agents.filter(q=>q.mode==='roam'&&!q.busy)).slice(0,n);if(!team.length)return;grab(team);hot(team,true);await fn(A,team[0],team)}
  catch(e){console.error('play',e)}finally{hot(team,false);A.stop();drop(team,lead||null);C.unlock()}}
function exp(id,o){C.act('play_'+id,{cd:o.cd||150000,w:o.w||.3,who:{},
  pick:()=>{if(C.isBusy())return null;if(window.__fxHold&&!window.__fxManual)return null;if(!C.gapOK())return null;return o.pick?o.pick():{}},
  async run(a,x){await session(o.n||6,(A,l,team)=>o.run(A,l,team,x),a)}})}
const BASE='translate(-2px,-2px)';
function hopCursor(q,h=14){const ic=q.el&&q.el.querySelector('.ic');if(ic)ic.animate([{transform:BASE},{transform:`${BASE} translateY(${-h}px) scale(1.2)`,offset:.45},{transform:BASE}],{duration:380,easing:'ease-out'})}
function stretch(q){const ic=q.el&&q.el.querySelector('.ic');if(ic)ic.animate([{transform:BASE},{transform:`${BASE} scale(.8,1.6)`,offset:.5},{transform:BASE}],{duration:700,easing:'ease-in-out'})}
function mkGhost(c){const r=c.getBoundingClientRect(),cs=getComputedStyle(c),g=document.createElement('span');g.textContent=c.textContent;
  Object.assign(g.style,{position:'absolute',left:r.left+scrollX+'px',top:r.top+scrollY+'px',width:r.width+'px',height:r.height+'px',lineHeight:r.height+'px',textAlign:'center',whiteSpace:'pre',fontFamily:cs.fontFamily,fontSize:cs.fontSize,fontWeight:cs.fontWeight,color:cs.color,textTransform:cs.textTransform,pointerEvents:'none',zIndex:2,transformOrigin:'50% 55%'});
  layer.appendChild(g);c.classList.add('gh');return{g,w:r.width,h:r.height,cx:r.left+scrollX+r.width/2,cy:r.top+scrollY+r.height/2,done(){g.remove();c.classList.remove('gh')}}}
function hop(c){const o=mkGhost(c);o.g.animate([{transform:'translateY(0) scale(1,1)'},{transform:'translateY(-26px) scale(.94,1.1)',offset:.45},{transform:'translateY(0) scale(1.1,.9)',offset:.8},{transform:'translateY(0) scale(1,1)'}],{duration:420,easing:'ease-out'}).finished.then(()=>o.done()).catch(()=>o.done())}
function bigChars(n){const out=[];
  for(const el of shuffle([...document.querySelectorAll('[data-type]')].filter(e=>e.classList.contains('built')&&parseFloat(getComputedStyle(e).fontSize)>=36&&C.inView(e))))
    for(const c of el.querySelectorAll('.ch.on')){const r=c.getBoundingClientRect();if(r.width>16&&r.height>34&&r.top>76&&r.bottom<innerHeight-30&&c.textContent.trim()&&!c.classList.contains('gh'))out.push(c)}
  return shuffle(out).slice(0,n)}

/* ============================ 1 · light painting: a mandala drawn by the whole crew ============================ */
const rotp=(x,y,a)=>[x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)];
const SHAPES=[
  {ms:4600,f:(u,i,n,W,H)=>{const R=Math.min(W,H)*.34,th=u*Math.PI,r=Math.cos(5*th),[x,y]=rotp(r*Math.cos(th),r*Math.sin(th),i*TAU/n);return[W/2+x*R,H*.52+y*R]}},
  {ms:5200,f:(u,i,n,W,H)=>{const R=Math.min(W,H)*.3,t=u*TAU*3,k=2,d=5;let x=(k*Math.cos(t)+d*Math.cos(k/3*t))/(k+d),y=(k*Math.sin(t)-d*Math.sin(k/3*t))/(k+d);[x,y]=rotp(x,y,i*TAU/n*.5);return[W/2+x*R,H*.52+y*R]}},
  {ms:4600,f:(u,i,n,W,H)=>{const R=Math.min(W,H)*.0215*(.5+.5*(i+1)/n),t=((u+i/n*.15)%1)*TAU,x=16*Math.pow(Math.sin(t),3),y=-(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t));return[W/2+x*R,H*.5+y*R]}}];
async function paintShapes(A,team,shapes,opts={}){
  const {W,H}=A,n=team.length,P=A.paint(),last=team.map(()=>null);let u=0,drawing=false,al=1,hold=false;
  A.upd.push(()=>{if(!hold)A.fade(P,.0045);if(!drawing)return;
    team.forEach((q,i)=>{const p=vp(q),l=last[i];if(l&&Math.hypot(p.x-l.x,p.y-l.y)<80){const c=opts.hue?opts.hue(u,i,n):PAL(u*.9+i/n*.5);
      for(const [w,a] of [[11,.07],[4.5,.22],[1.8,.95]]){P.cx.globalCompositeOperation='lighter';P.cx.strokeStyle=`rgba(${c},${a})`;P.cx.lineWidth=w;P.cx.lineCap='round';P.cx.beginPath();P.cx.moveTo(l.x,l.y);P.cx.lineTo(p.x,p.y);P.cx.stroke()}}
      last[i]={x:p.x,y:p.y}})});
  A.drw.push(c=>{c.save();c.globalAlpha=al;c.globalCompositeOperation='lighter';c.drawImage(P.cv,0,0,W,H);c.restore();A.bloom(P.cv,.7*al)});
  for(const sh of shapes){
    team.forEach((q,i)=>{q.k=15;q.tgt=()=>{const [x,y]=sh.f(Math.min(u,1),i,n,W,H);return V(x,y)}});
    drawing=false;u=0;last.fill(null);await wait(T(1000));drawing=true;
    await ramp(T(sh.ms),k=>u=k);drawing=false;
    for(let s=0;s<90;s++){const [x,y]=sh.f(s/90,s%n,n,W,H);A.spawn({type:'star',x,y,vx:rnd(-14,14),vy:-rnd(12,40),life:rnd(.9,1.7),size:rnd(5,11),a:.9})}
    A.ring(W/2,H*.52,20,Math.min(W,H)*.45,.9,'255,255,255',2);await wait(T(900))}
  hold=true;await wait(T(700));await ramp(T(1100),k=>al=1-k)}
exp('lightpaint',{n:7,w:.35,async run(A,a,team){await paintShapes(A,team,SHAPES)}});

/* "hello" written in light */
const LET={H:[[[0,0],[0,1]],[[1,0],[1,1]],[[0,.5],[1,.5]]],E:[[[1,0],[0,0],[0,1],[1,1]],[[0,.5],[.78,.5]]],L:[[[0,0],[0,1],[1,1]]],O:[Array.from({length:29},(_,i)=>[.5+.5*Math.cos(-Math.PI/2+i/28*TAU),.5+.5*Math.sin(-Math.PI/2+i/28*TAU)])]};
function pathOf(strokes,x0,y0,w,h){const segs=[];let L=0;for(const st of strokes){const pts=st.map(([a,b])=>[x0+a*w,y0+b*h]);let len=0;for(let i=1;i<pts.length;i++)len+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);segs.push({pts,len,start:L});L+=len+w*.15}return{segs,L}}
function atU(path,u){const d=u*path.L;for(const s of path.segs){if(d<=s.start+s.len){let r=d-s.start;if(r<0)return{x:s.pts[0][0],y:s.pts[0][1],pen:false};
  for(let i=1;i<s.pts.length;i++){const l=Math.hypot(s.pts[i][0]-s.pts[i-1][0],s.pts[i][1]-s.pts[i-1][1]);if(r<=l){const k=l?r/l:0;return{x:lerp(s.pts[i-1][0],s.pts[i][0],k),y:lerp(s.pts[i-1][1],s.pts[i][1],k),pen:true}}r-=l}}}
  const s=path.segs[path.segs.length-1],p=s.pts[s.pts.length-1];return{x:p[0],y:p[1],pen:false}}
exp('hello',{n:5,w:.3,async run(A,a,team){
  const {W,H}=A,P=A.paint(),w=Math.min(W*.13,150),h=w*1.5,gap=w*.42,x0=W/2-(5*w+4*gap)/2,y0=H*.5-h/2;let u=0,al=1,drawing=false;
  const paths=team.map((q,i)=>pathOf(LET['HELLO'[i]],x0+i*(w+gap),y0,w,h)),last=team.map(()=>null);
  A.upd.push(()=>{if(!drawing)return;team.forEach((q,i)=>{const p=vp(q),l=last[i],cur=atU(paths[i],Math.min(u,1));
    if(l&&cur.pen&&Math.hypot(p.x-l.x,p.y-l.y)<60){const c=PAL(.04+(p.x/W)*.9);for(const [lw,aa] of [[13,.08],[5,.25],[2,.95]]){P.cx.globalCompositeOperation='lighter';P.cx.strokeStyle=`rgba(${c},${aa})`;P.cx.lineWidth=lw;P.cx.lineCap='round';P.cx.beginPath();P.cx.moveTo(l.x,l.y);P.cx.lineTo(p.x,p.y);P.cx.stroke()}}
    last[i]=cur.pen?{x:p.x,y:p.y}:null})});
  A.drw.push(c=>{c.save();c.globalAlpha=al;c.globalCompositeOperation='lighter';c.drawImage(P.cv,0,0,W,H);c.restore();A.bloom(P.cv,.75*al)});
  team.forEach((q,i)=>{q.k=15;q.tgt=()=>{const p=atU(paths[i],Math.min(u,1));return V(p.x,p.y)}});
  await wait(T(1000));drawing=true;await ramp(T(5200),k=>u=k);drawing=false;
  for(let s=0;s<120;s++){const i=s%5,p=atU(paths[i],Math.random());if(p.pen)A.spawn({type:'star',x:p.x,y:p.y,vy:-rnd(10,30),life:rnd(.9,1.8),size:rnd(5,10),a:.9})}
  A.ring(W/2,H*.5,20,W*.4,1,'255,255,255',2);await wait(T(2200));await ramp(T(1200),k=>al=1-k)}});

/* ============================ 2 · comet chase: tag with glowing, burning comets ============================ */
exp('comet',{n:6,async run(A,a,team){
  let it=team[0],freeze=0;const m=()=>mouseP();
  team.forEach(q=>{A.track(q,{len:40,w:6,col:'170,215,255'});q.k=8;q.tgt=()=>{if(q===it){if(NOW()<freeze)return{x:q.x,y:q.y};return m()}
    const dx=q.x-it.x,dy=q.y-it.y,d=Math.hypot(dx,dy)||1,tx=q.x+dx/d*240+Math.sin(NOW()/300+q.id)*60,ty=q.y+dy/d*240+Math.cos(NOW()/320+q.id)*60;
    return V(clamp(tx-scrollX,50,A.W-50),clamp(ty-scrollY,90,A.H-50))}});
  const igniteFx=q=>{const t=A.trails.get(q);team.forEach(o=>{const tr=A.trails.get(o);tr.col='170,215,255';tr.w=6});t.col='255,110,50';t.w=10};igniteFx(it);
  A.drw.push(c=>{A.drawTrails();team.forEach(q=>{const p=vp(q),isIt=q===it;A.halo(p.x,p.y,isIt?44:22,isIt?'255,100,40':'120,180,255',isIt?.55+.2*Math.sin(A.t*10):.35);
    if(isIt){c.save();c.globalCompositeOperation='lighter';c.strokeStyle='rgba(255,170,90,.7)';c.lineWidth=2;for(let i=0;i<3;i++){const s=A.t*5+i*TAU/3;c.beginPath();c.arc(p.x,p.y,24,s,s+.9);c.stroke()}c.restore()}})});
  A.upd.push(()=>{const p=vp(it);if(Math.random()<.8)A.spawn({type:'spark',tr:6,x:p.x,y:p.y,vx:rnd(-60,60),vy:rnd(-90,10),g:-60,drag:1.2,life:rnd(.4,.8),size:2,col:Math.random()<.5?'255,150,60':'255,90,40'})});
  await run(T(17000),()=>{const mm=m();if(NOW()>freeze&&Math.hypot(it.x-mm.x,it.y-mm.y)<22){freeze=NOW()+1500;const p=vp(it);
    for(let k=0;k<3;k++)A.ring(p.x,p.y,6,70+k*38,.75+k*.12,k?'255,200,160':'255,255,255',2.6-k*.5);A.spawn({type:'glow',x:p.x,y:p.y,size:110,life:.4,col:'255,170,90',a:.9});
    for(let k=0;k<34;k++){const an=rnd(0,TAU),v=rnd(120,420);A.spawn({type:'spark',tr:9,x:p.x,y:p.y,vx:Math.cos(an)*v,vy:Math.sin(an)*v,g:260,drag:1.5,life:rnd(.6,1.1),size:2,col:pick(PCOL)})}
    A.text('TAGGED',p.x,p.y-42,'255,190,140','700 20px Inter,sans-serif',1);hopCursor(it);
    const nxt=team.filter(q=>q!==it).sort((p2,q2)=>Math.hypot(p2.x-mm.x,p2.y-mm.y)-Math.hypot(q2.x-mm.x,q2.y-mm.y))[0];setTimeout(()=>{it=nxt;igniteFx(it);const pp=vp(it);A.ring(pp.x,pp.y,4,60,.5,'255,140,80',2)},T(1500))}});
  A.ring(A.W/2,A.H/2,10,A.W*.3,1,'255,255,255',2)}});

/* ============================ 3 · silk ribbons: they follow your mouse, then wind into a galaxy ============================ */
exp('silk',{n:8,async run(A,a,team){
  const L=36,chains=team.map((q,i)=>{const p=vp(q);return{pts:Array.from({length:L},()=>({x:p.x,y:p.y})),ph:i*1.1}}),trail=[];let spiral=false,still=0,last=mouseP(),retract=0;
  const dust=Array.from({length:70},()=>({r:rnd(30,200),a:rnd(0,TAU),s:rnd(.2,.9)*(Math.random()<.5?1:-1),sz:rnd(.8,2.2)}));
  team.forEach((q,i)=>{q.k=9;q.tgt=()=>{const m=mouseP();if(spiral){const an=NOW()/700*(1+i*.07)+i*.8,r=34+i*17;return{x:m.x+Math.cos(an)*r,y:m.y+Math.sin(an)*r*.78}}return trail[Math.max(0,trail.length-1-(i+1)*7)]||m}});
  A.upd.push((dt,t)=>{chains.forEach((ch,ci)=>{const h=vp(team[ci]);ch.pts[0].x=h.x;ch.pts[0].y=h.y;const seg=8.5*(1-retract*.9);
    for(let i=1;i<L;i++){const p=ch.pts[i],pr=ch.pts[i-1],dx=pr.x-p.x,dy=pr.y-p.y,d=Math.hypot(dx,dy)||1,ex=dx/d,ey=dy/d,k=Math.min(1,dt*(20-i*.3));
      p.x+=(pr.x-ex*seg-p.x)*k+(-ey)*Math.sin(t*3.2+ch.ph+i*.42)*(i/L)*26*dt;p.y+=(pr.y-ey*seg-p.y)*k+ex*Math.sin(t*3.2+ch.ph+i*.42)*(i/L)*26*dt}})});
  A.drw.push(c=>{const mp=vp(mouseP());
    if(spiral)for(const d of dust){d.a+=d.s*.012;const x=mp.x+Math.cos(d.a)*d.r,y=mp.y+Math.sin(d.a)*d.r*.78;c.save();c.globalCompositeOperation='lighter';c.fillStyle=`rgba(190,215,255,${.35+.3*Math.sin(A.t*3+d.r)})`;c.beginPath();c.arc(x,y,d.sz,0,TAU);c.fill();c.restore()}
    chains.forEach((ch,ci)=>{const pts=ch.pts,n=pts.length,col=PAL(ci/(chains.length-1)*.95),left=[],right=[];
      for(let i=0;i<n;i++){const a2=pts[Math.max(0,i-1)],b=pts[Math.min(n-1,i+1)],dx=b.x-a2.x,dy=b.y-a2.y,d=Math.hypot(dx,dy)||1,w=(4+9*Math.sin(Math.PI*(i/(n-1))*.92+.15))*(1-retract*.8);left.push({x:pts[i].x-dy/d*w,y:pts[i].y+dx/d*w});right.push({x:pts[i].x+dy/d*w,y:pts[i].y-dx/d*w})}
      c.save();c.globalCompositeOperation='lighter';const g=c.createLinearGradient(pts[0].x,pts[0].y,pts[n-1].x,pts[n-1].y);g.addColorStop(0,`rgba(${col},.75)`);g.addColorStop(1,`rgba(${col},0)`);c.fillStyle=g;
      c.beginPath();c.moveTo(left[0].x,left[0].y);for(let i=1;i<n;i++)c.lineTo(left[i].x,left[i].y);for(let i=n-1;i>=0;i--)c.lineTo(right[i].x,right[i].y);c.closePath();c.fill();c.restore();A.ribbon(pts,2.2,col,.9)})});
  await run(T(15500),()=>{const m=mouseP();trail.push({x:m.x,y:m.y});if(trail.length>240)trail.shift();still=Math.hypot(m.x-last.x,m.y-last.y)<2?still+1:0;last=m;const was=spiral;spiral=still>30;if(spiral&&!was){const mp=vp(m);A.ring(mp.x,mp.y,8,120,.9,'190,215,255',2)}});
  await ramp(T(900),k=>retract=k)}});

/* ============================ 4 · plasma orb volley with lightning on every hit ============================ */
exp('volley',{n:4,async run(A,a,team){
  const {W,H}=A,floor=H-70;let bx=W*.5,by=H*.3,vx=rnd(-60,60),vy=0,combo=0;const hist=[],arcs=[];
  team.forEach((q,i)=>{q.k=11;q.tgt=()=>V(clamp(bx+(i-1.5)*58,50,W-50),Math.min(floor,by+46))});
  const hit=(q,power,txt)=>{const p=q?vp(q):{x:bx,y:by+30};arcs.push({pts:A.bolt(p.x,p.y,bx,by,26),t:0});A.ring(bx,by,8,70+power*30,.6,'150,210,255',2.4);A.spawn({type:'glow',x:bx,y:by,size:90,life:.3,col:'170,220,255',a:.9});
    for(let k=0;k<14;k++){const an=rnd(0,TAU),v=rnd(80,300);A.spawn({type:'spark',tr:7,x:bx,y:by,vx:Math.cos(an)*v,vy:Math.sin(an)*v,g:300,drag:1.5,life:rnd(.4,.8),size:1.8,col:'170,215,255'})}
    combo++;if(txt||combo%3===0||combo<2)A.text(txt||('×'+combo),bx,by-34,'190,225,255','700 22px Inter,sans-serif',.9)};
  A.upd.push(dt=>{vy+=1500*dt;bx+=vx*dt;by+=vy*dt;if(bx<24||bx>W-24){vx=-vx;bx=clamp(bx,24,W-24)}hist.push({x:bx,y:by});while(hist.length>26)hist.shift();
    const m=mouseP(),mx=m.x-scrollX,my=m.y-scrollY;if(Math.hypot(bx-mx,by-my)<34&&vy>-300){vy=-rnd(720,920);vx=(bx-mx)*8;hit(null,2,'NICE')}
    for(const q of team){const p=vp(q);if(vy>0&&Math.abs(bx-p.x)<28&&by>p.y-24&&by<p.y+14){const o=pick(team);vy=-rnd(680,860);vx=clamp((vp(o).x-bx)*1.1,-380,380);hit(q,1)}}
    if(by>floor+10){A.ring(bx,floor,6,60,.5,'255,120,120',2);for(let k=0;k<16;k++){const an=-Math.PI*rnd(.1,.9),v=rnd(80,260);A.spawn({type:'spark',tr:6,x:bx,y:floor,vx:Math.cos(an)*v,vy:Math.sin(an)*v,g:600,life:.6,size:1.6,col:'255,140,140'})}combo=0;by=H*.25;bx=vp(pick(team)).x;vy=0;vx=0}
    for(const r of arcs)r.t+=dt;while(arcs.length&&arcs[0].t>.2)arcs.shift()});
  A.drw.push(c=>{const g=c.createLinearGradient(0,floor,0,floor+22);g.addColorStop(0,'rgba(120,190,255,.3)');g.addColorStop(1,'rgba(120,190,255,0)');c.save();c.globalCompositeOperation='lighter';c.fillStyle=g;c.fillRect(0,floor+4,W,20);c.restore();
    A.ribbon(hist,9,'130,200,255',.9);A.halo(bx,by,54,'110,180,255',.55);A.halo(bx,floor+10+(floor-by)*.12,40,'110,180,255',.18*Math.max(0,1-(floor-by)/H));
    const gr=c.createRadialGradient(bx,by,0,bx,by,13);gr.addColorStop(0,'#fff');gr.addColorStop(.6,'rgba(190,225,255,.95)');gr.addColorStop(1,'rgba(120,190,255,0)');c.fillStyle=gr;c.beginPath();c.arc(bx,by,13,0,TAU);c.fill();
    for(const r of arcs)A.drawBolt(r.pts,1-r.t/.2)});
  await run(T(17000),()=>{});A.ring(bx,by,10,160,.9,'190,225,255',2)}});

/* ============================ 5 · hyper race: speed-streak trails and a glowing finish beam ============================ */
exp('race',{n:5,async run(A,a,team){
  const {W,H}=A,x0=80,x1=W-120,cy=H*.55,lane=i=>cy+(i-2)*44,prog=team.map(()=>0),boost=team.map(()=>0);let go=false,winner=-1,count='';
  team.forEach((q,i)=>{A.track(q,{len:70,w:5,col:PAL(.05+i*.2)});q.k=10;q.tgt=()=>V(x0+(x1-x0)*prog[i],lane(i))});
  A.upd.push((dt)=>{if(!go)return;team.forEach((q,i)=>{if(winner<0){boost[i]=Math.max(0,boost[i]-dt);if(Math.random()<.01){boost[i]=.6;const p=vp(q);A.halo(p.x,p.y,60,'255,255,255',.9);A.ring(p.x,p.y,6,50,.4,'255,255,255',2)}
      prog[i]=Math.min(1,prog[i]+dt*(.1+Math.random()*.15)*(boost[i]>0?2.4:1));if(prog[i]>=1)winner=i}
    const p=vp(q);if(Math.random()<.9)A.spawn({type:'spark',x:p.x-6,y:p.y+rnd(-5,5),vx:-rnd(120,320),vy:rnd(-20,20),drag:2,life:.35,size:1.4,col:PAL(.05+i*.2)})})});
  A.drw.push(c=>{const g=c.createLinearGradient(x1+30,0,x1+30,H);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.5,'rgba(255,255,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');c.save();c.globalCompositeOperation='lighter';c.fillStyle=g;c.fillRect(x1+27,cy-170,6,340);
    c.fillStyle=`rgba(255,255,255,${.12+.08*Math.sin(A.t*6)})`;c.fillRect(x1+10,cy-170,40,340);c.restore();A.drawTrails();
    team.forEach((q,i)=>{const p=vp(q);A.halo(p.x,p.y,boost[i]>0?46:24,PAL(.05+i*.2),boost[i]>0?.7:.35)});
    if(count){c.save();c.font='800 110px Inter,sans-serif';c.textAlign='center';c.textBaseline='middle';c.shadowColor='rgba(255,255,255,.9)';c.shadowBlur=30;c.fillStyle=`rgba(255,255,255,${.9*Math.max(0,1-(A.t*3%1)*.6)})`;c.fillText(count,W/2,H*.3);c.restore()}});
  for(const n of ['3','2','1']){count=n;A.ring(W/2,H*.3,20,140,.6,'255,255,255',2);await wait(T(700))}count='GO';A.spawn({type:'glow',x:W/2,y:H*.3,size:260,life:.5,col:'255,255,255',a:.6});go=true;await wait(T(500));count='';
  await run(T(9500),()=>winner>=0);if(winner<0)winner=0;const w=team[winner],p=vp(w);A.text('WINNER',p.x,p.y-48,'255,230,160','800 24px Inter,sans-serif',1.5);
  for(let k=0;k<4;k++)A.ring(p.x,p.y,6,80+k*45,.9+k*.1,k%2?'255,200,120':'255,255,255',2.4-k*.4);
  for(let k=0;k<60;k++){const an=rnd(0,TAU),v=rnd(120,460);A.spawn({type:'spark',tr:9,x:p.x,y:p.y,vx:Math.cos(an)*v,vy:Math.sin(an)*v,g:300,drag:1.4,life:rnd(.7,1.3),size:2,col:pick(PCOL)})}
  const t1=NOW();w.tgt=()=>{const t=(NOW()-t1)/1000,m=V(x1,lane(winner));return{x:m.x+Math.cos(t*9)*28,y:m.y+Math.sin(t*9)*28}};await wait(T(2200))}});

/* ============================ 6 · spotlight hunt: a flashlight beam searches for hidden cursors ============================ */
exp('hunt',{n:5,pick:()=>{const cs=bigChars(5);return cs.length>=3?{cs}:null},async run(A,a,team,x){
  const hiders=team.slice(1);if(hiders.length<3)return;const {W,H}=A;
  const spots=hiders.map((q,i)=>{const r=x.cs[i%x.cs.length].getBoundingClientRect();return{x:r.left+r.width/2+rnd(-8,8),y:r.top+r.height*.68}});
  hiders.forEach((q,i)=>{q.k=11;q.tgt=()=>V(spots[i].x,spots[i].y)});await wait(T(1700));hiders.forEach(q=>{q.el.style.transition='opacity .4s';q.el.style.opacity='.07'});
  const cxs=spots.reduce((s,p)=>s+p.x,0)/spots.length,cys=spots.reduce((s,p)=>s+p.y,0)/spots.length,ex=Math.max(140,Math.max(...spots.map(p=>Math.abs(p.x-cxs)))+120),ey=Math.max(90,Math.max(...spots.map(p=>Math.abs(p.y-cys)))+90);
  const found=hiders.map(()=>false),dwell=hiders.map(()=>0);let ang=0,flash=0;const motes=Array.from({length:46},()=>({r:Math.random(),o:rnd(-1,1),s:rnd(.5,1.5),ph:rnd(0,TAU)}));
  a.k=7;a.tgt=()=>{const t=NOW()/1000;return V(clamp(cxs+Math.sin(t*.8)*ex,60,W-60),clamp(cys-110+Math.sin(t*1.25+1)*ey*.6,90,H-60))};
  try{
    A.upd.push(dt=>{const p=vp(a),tg=Math.atan2(cys+60-p.y,cxs-p.x+Math.sin(A.t*1.3)*ex*.8);let d=tg-ang;while(d>Math.PI)d-=TAU;while(d<-Math.PI)d+=TAU;ang+=d*Math.min(1,dt*5);
      hiders.forEach((q,i)=>{if(found[i])return;const h=vp(q),dx=h.x-p.x,dy=h.y-p.y,dist=Math.hypot(dx,dy);let da=Math.atan2(dy,dx)-ang;while(da>Math.PI)da-=TAU;while(da<-Math.PI)da+=TAU;
        if(dist<360&&Math.abs(da)<.36)dwell[i]+=dt;else dwell[i]=Math.max(0,dwell[i]-dt);
        if(dwell[i]>.4){found[i]=true;q.el.style.opacity='1';hopCursor(q);A.ring(h.x,h.y,6,70,.6,'255,240,180',2.4);A.halo(h.x,h.y,90,'255,235,170',.9);for(let k=0;k<18;k++){const an=rnd(0,TAU),v=rnd(80,260);A.spawn({type:'spark',tr:6,x:h.x,y:h.y,vx:Math.cos(an)*v,vy:Math.sin(an)*v,g:300,drag:1.4,life:.7,size:1.8,col:'255,235,170'})}}});
      flash=Math.max(0,flash-dt)});
    A.drw.push(c=>{const p=vp(a),L=370,half=.36;c.save();c.globalCompositeOperation='lighter';const g=c.createRadialGradient(p.x,p.y,6,p.x,p.y,L);g.addColorStop(0,'rgba(255,248,225,.6)');g.addColorStop(.5,'rgba(255,240,200,.2)');g.addColorStop(1,'rgba(255,240,200,0)');
      c.fillStyle=g;c.beginPath();c.moveTo(p.x,p.y);c.arc(p.x,p.y,L,ang-half,ang+half);c.closePath();c.fill();
      const g2=c.createRadialGradient(p.x,p.y,4,p.x,p.y,L*.8);g2.addColorStop(0,'rgba(255,255,255,.5)');g2.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g2;c.beginPath();c.moveTo(p.x,p.y);c.arc(p.x,p.y,L*.8,ang-half*.35,ang+half*.35);c.closePath();c.fill();
      for(const m of motes){const r=m.r*L*.95,an=ang+m.o*half*.9+Math.sin(A.t*m.s+m.ph)*.03;c.fillStyle=`rgba(255,245,220,${.5*(1-m.r)*(.5+.5*Math.sin(A.t*2+m.ph))})`;c.beginPath();c.arc(p.x+Math.cos(an)*r,p.y+Math.sin(an)*r+Math.sin(A.t*m.s+m.ph)*5,1.4,0,TAU);c.fill()}c.restore();A.halo(p.x,p.y,34,'255,240,200',.55)});
    await run(T(14000),()=>found.every(Boolean));await wait(T(500));const p=vp(a);A.ring(p.x,p.y,10,A.W*.3,1,'255,245,210',2.4);A.spawn({type:'glow',x:p.x,y:p.y,size:260,life:.6,col:'255,240,200',a:.8});await wait(T(900))}
  finally{hiders.forEach(q=>{q.el.style.opacity='';q.el.style.transition=''})}}});

/* ============================ 7 · target lock: HUD brackets snap onto every copy of a letter ============================ */
exp('lock',{n:4,pick:()=>{const cs=bigChars(60);if(cs.length<5)return null;const cnt={};cs.forEach(c=>{const k=c.textContent.toUpperCase();if(/[A-Z0-9]/.test(k))(cnt[k]=cnt[k]||[]).push(c)});
    const best=Object.entries(cnt).sort((p,q)=>q[1].length-p[1].length)[0];return best&&best[1].length>=3?{cs:best[1].slice(0,7),k:best[0]}:null},
  async run(A,a,team,x){
    const bs=[];let link=0,pulse=0;
    A.drw.push(c=>{c.save();c.lineCap='round';
      bs.forEach((b,i)=>{const r=b.c.getBoundingClientRect(),p=clamp((A.t-b.t0)/.55,0,1),e=ease(p),ex=(1-e)*30+7+Math.sin(A.t*5+i)*1.2*pulse,cx=r.left+r.width/2,cy=r.top+r.height/2,len=Math.min(r.width,r.height)*.3,hw=r.width/2+ex,hh=r.height/2+ex;
        c.save();c.translate(cx,cy);c.rotate((1-e)*Math.PI/2);c.globalCompositeOperation='lighter';
        for(const [lw,al] of [[6,.18],[2.2,1]]){c.strokeStyle=`rgba(120,200,255,${al*e})`;c.lineWidth=lw;
          for(const [sx,sy] of [[-1,-1],[1,-1],[1,1],[-1,1]]){c.beginPath();c.moveTo(sx*hw,sy*(hh-len));c.lineTo(sx*hw,sy*hh);c.lineTo(sx*(hw-len),sy*hh);c.stroke()}}
        c.restore();
        c.save();c.globalCompositeOperation='lighter';if(p>=1){const sy=r.top+((A.t*.9+i*.31)%1)*r.height;const g=c.createLinearGradient(r.left,0,r.right,0);g.addColorStop(0,'rgba(120,200,255,0)');g.addColorStop(.5,'rgba(160,220,255,.7)');g.addColorStop(1,'rgba(120,200,255,0)');c.fillStyle=g;c.fillRect(r.left-6,sy,r.width+12,2)}
        const q=b.q?vp(b.q):null;if(q&&p>.1){c.strokeStyle=`rgba(150,215,255,${.55*e})`;c.lineWidth=1;c.setLineDash([5,6]);c.lineDashOffset=-A.t*40;c.beginPath();c.moveTo(q.x,q.y);c.lineTo(cx,cy-hh);c.stroke();c.setLineDash([])}
        c.font='600 11px "JetBrains Mono",monospace';c.fillStyle=`rgba(170,225,255,${e})`;c.textAlign='left';c.fillText(`${x.k} · ${String(i+1).padStart(2,'0')}`,r.left+r.width+ex+6,r.top-ex+4);c.restore()});
      if(link>0&&bs.length>1){c.save();c.globalCompositeOperation='lighter';c.strokeStyle='rgba(150,215,255,.75)';c.lineWidth=1.4;c.beginPath();const ps=bs.map(b=>{const r=b.c.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}});
        const n=Math.min(ps.length-1,link*(ps.length-1));for(let i=0;i<Math.floor(n);i++){c.moveTo(ps[i].x,ps[i].y);c.lineTo(ps[i+1].x,ps[i+1].y)}const f=n-Math.floor(n),i=Math.floor(n);if(i<ps.length-1){c.moveTo(ps[i].x,ps[i].y);c.lineTo(lerp(ps[i].x,ps[i+1].x,f),lerp(ps[i].y,ps[i+1].y,f))}c.stroke();c.restore()}
      c.restore()});
    let i=0;for(const ch of x.cs){const q=team[i++%team.length];q.k=11;q.tgt=()=>{const r=ch.getBoundingClientRect();return V(r.left+r.width/2+r.width*.7,r.top-16)};await wait(T(560));
      bs.push({c:ch,q,t0:A.t});const r=ch.getBoundingClientRect();A.spawn({type:'glow',x:r.left+r.width/2,y:r.top+r.height/2,size:70,life:.35,col:'120,200,255',a:.8})}
    await wait(T(500));await ramp(T(1100),k=>link=k);pulse=1;bs.forEach(b=>{const r=b.c.getBoundingClientRect();A.ring(r.left+r.width/2,r.top+r.height/2,8,64,.7,'150,215,255',2)});x.cs.forEach(hop);await wait(T(1400));await ramp(T(500),k=>{bs.forEach(b=>b.t0=A.t-.55-k*.4)});}});

/* ============================ 8 · tractor beam: lifts a letter, carries it across, sets it down, brings it back ============================ */
exp('tractor',{n:1,pick:()=>K.targets('char'),async run(A,a,team,x){
  const c=x.chars[0],o=mkGhost(c);let beam=0,lift=0,rot=0,carry=false,spin=0;
  const home={x:o.cx,y:o.cy},L={x:o.cx,y:o.cy};let dest=null;
  for(let i=0;i<30&&!dest;i++){const d=V(rnd(90,A.W-90),rnd(160,A.H-110));if(Math.hypot(d.x-home.x,d.y-home.y)>260)dest=d}dest=dest||V(A.W/2,A.H*.72);
  const rest={x:home.x,y:home.y};
  A.upd.push((dt)=>{if(carry){const tx=a.x,ty=a.y+o.h*.62+lift*.3;L.x+=(tx-L.x)*Math.min(1,dt*9);L.y+=(ty-L.y)*Math.min(1,dt*9);rot=lerp(rot,Math.sin(A.t*2.4)*.12+(tx-L.x)*.004,.15)}else{L.x+=(rest.x-L.x)*Math.min(1,dt*14);L.y+=(rest.y-lift-L.y)*Math.min(1,dt*14);rot=lerp(rot,0,.2)}
    o.g.style.transform=`translate(${L.x-o.cx}px,${L.y-o.cy-(carry?0:0)}px) rotate(${rot+spin}rad) scale(${1+lift*.0016})`;o.g.style.filter=lift>2?`drop-shadow(0 0 ${6+lift*.3}px rgba(130,200,255,.9))`:'none';
    if(beam>.3&&Math.random()<.7){const p=vp(a),lp={x:L.x-scrollX,y:L.y-scrollY};const k=Math.random();A.spawn({type:'dot',x:lerp(p.x,lp.x,k)+rnd(-o.w*.3,o.w*.3)*k,y:lerp(p.y,lp.y,k),vy:-40,life:.7,size:1.6,col:'170,220,255'})}});
  A.drw.push(c2=>{const gp={x:(carry?L.x:rest.x)-scrollX,y:(carry||lift>0?(carry?L.y:rest.y):rest.y)+o.h*.42-scrollY};
    if(lift>1||carry){const sh=clamp(1-lift/90,.2,1);c2.save();c2.fillStyle=`rgba(0,0,0,${.35*sh})`;c2.beginPath();c2.ellipse(gp.x,(carry?(home.y+o.h*.48):(rest.y+o.h*.48))-scrollY,o.w*.5*(.6+sh*.4),7,0,0,TAU);c2.fill();c2.restore()}
    if(beam>.02){const p=vp(a),lx=L.x-scrollX,ly=L.y-scrollY-o.h*.3,dx=lx-p.x,dy=ly-p.y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len,w0=5,w1=o.w*.55;c2.save();c2.globalCompositeOperation='lighter';
      const g=c2.createLinearGradient(p.x,p.y,lx,ly);g.addColorStop(0,`rgba(190,230,255,${.55*beam})`);g.addColorStop(1,`rgba(120,190,255,${.22*beam})`);c2.fillStyle=g;c2.beginPath();c2.moveTo(p.x+nx*w0,p.y+ny*w0);c2.lineTo(lx+nx*w1,ly+ny*w1);c2.lineTo(lx-nx*w1,ly-ny*w1);c2.lineTo(p.x-nx*w0,p.y-ny*w0);c2.closePath();c2.fill();
      for(let i=0;i<4;i++){const k=((A.t*.9+i/4)%1),x2=lerp(p.x,lx,k),y2=lerp(p.y,ly,k),w=lerp(w0,w1,k);c2.strokeStyle=`rgba(200,235,255,${.7*beam*(1-k)})`;c2.lineWidth=1.6;c2.beginPath();c2.ellipse(x2,y2,w,w*.28,Math.atan2(dy,dx)+Math.PI/2,0,TAU);c2.stroke()}c2.restore();A.halo(p.x,p.y,36,'170,220,255',.6*beam)}});
  try{a.k=9;await a.go(()=>({x:home.x,y:home.y-o.h*.9-lift*.3}),2600);await ramp(T(450),k=>beam=k);carry=true;await ramp(T(800),k=>{lift=64*ease(k)});
    a.k=5.5;await a.go(()=>dest,3800);const drop=async(at)=>{carry=false;rest.x=at.x;rest.y=at.y;await ramp(T(260),k=>{beam=1-k});await ramp(T(420),k=>{lift=64*(1-k*k)});A.ring(at.x-scrollX,at.y+o.h*.45-scrollY,6,90,.6,'170,215,255',2.4);
      for(let k=0;k<16;k++){const s=Math.random()<.5?-1:1;A.spawn({type:'smoke',x:at.x-scrollX+rnd(-o.w*.4,o.w*.4),y:at.y+o.h*.45-scrollY,vx:s*rnd(30,110),vy:-rnd(8,40),life:.8,size:rnd(9,15),grow:1.4,col:'200,215,230',a:.35,add:false})}hopCursor(a,8)};
    await drop(dest);await wait(T(1500));rest.x=dest.x;rest.y=dest.y;a.k=9;await a.go(()=>({x:dest.x,y:dest.y-o.h*.9}),2000);await ramp(T(450),k=>beam=k);carry=true;await ramp(T(700),k=>{lift=64*ease(k)});
    a.k=5.5;await a.go(()=>({x:home.x,y:home.y-o.h*.9-lift*.3}),3800);await drop(home);await wait(T(700))}
  finally{o.done()}}});

/* ============================ 9 · aurora sleep: they curl into glowing orbs under drifting northern lights ============================ */
async function auroraScene(A,team,cond){
  const {W,H}=A;let wake=0;const stars=Array.from({length:70},()=>({a:rnd(0,TAU),r:rnd(40,250),p:rnd(0,TAU),s:rnd(.6,1.8)}));
  team.forEach((q,i)=>{q.k=1.7;q.tgt=()=>{const m=mouseP(),t=NOW()/1000,an=i*(TAU/team.length)+.4,r=76+(i%3)*30;return{x:m.x+Math.cos(an)*r,y:m.y+Math.sin(an)*r*.6+Math.sin(t*1.2+i)*3}}});
  A.drw.push(c=>{const m=vp(mouseP());c.save();c.globalCompositeOperation='lighter';
    for(let b=0;b<3;b++){const col=['110,255,200','150,130,255','110,190,255'][b],g=c.createLinearGradient(0,m.y-190,0,m.y+30);g.addColorStop(0,`rgba(${col},0)`);g.addColorStop(.5,`rgba(${col},${.11*(1-wake)})`);g.addColorStop(1,`rgba(${col},0)`);c.fillStyle=g;c.beginPath();c.moveTo(m.x-240,m.y+30);
      for(let x=-240;x<=240;x+=12)c.lineTo(m.x+x,m.y-100-b*22+Math.sin(A.t*.7+x*.018+b*2)*34+Math.sin(A.t*.4+x*.01)*20);c.lineTo(m.x+240,m.y+30);c.closePath();c.fill()}
    for(const s of stars){const x=m.x+Math.cos(s.a)*s.r*1.2,y=m.y+Math.sin(s.a)*s.r*.7-40;c.fillStyle=`rgba(220,230,255,${(.15+.45*Math.abs(Math.sin(A.t*s.s+s.p)))*(1-wake)})`;c.beginPath();c.arc(x,y,1.1,0,TAU);c.fill()}c.restore();
    team.forEach((q,i)=>{const p=vp(q),br=.5+.5*Math.sin(A.t*1.1+i);A.halo(p.x,p.y,30+9*br,i%2?'150,130,255':'110,190,255',(.3+.18*br)*(1-wake));A.halo(p.x,p.y,12,'255,255,255',.3*(1-wake))})});
  let lastZ=0;A.upd.push(()=>{if(A.t-lastZ>.7&&wake<.5){lastZ=A.t;const q=pick(team),p=vp(q);A.spawn({type:'text',txt:'Z',font:'italic 700 20px Inter,sans-serif',x:p.x+10,y:p.y-8,vx:14,vy:-26,grow:.35,life:2.4,col:'200,190,255',a:.9,add:false})}});
  while(cond())await wait(T(300));
  team.forEach(q=>{const p=vp(q);A.ring(p.x,p.y,6,64,.8,'200,215,255',2);stretch(q)});await ramp(T(700),k=>wake=k)}
exp('aurora',{n:7,w:.25,async run(A,a,team){const end=NOW()+T(9000);await auroraScene(A,team,()=>NOW()<end)}});

/* ============================ 10 · fireworks finale: rockets, peonies, willows and crackle ============================ */
exp('fireworks',{n:7,w:.25,async run(A,a,team){
  const {W,H}=A;team.forEach((q,i)=>{q.k=9;q.tgt=()=>V(W*(.12+.76*i/Math.max(1,team.length-1)),H-86+Math.sin(NOW()/500+i)*6)});
  const burst=(x,y)=>{const type=pick(['peony','ring','willow','crackle']),col=pick(PCOL.slice(0,2).concat(['255,235,170','150,200,255','255,130,200','170,255,190']));
    A.spawn({type:'glow',x,y,size:230,life:.5,col,a:.7});A.ring(x,y,6,90,.8,col,2);
    const n=type==='crackle'?90:type==='ring'?60:type==='willow'?70:84;
    for(let i=0;i<n;i++){const an=type==='ring'?i/n*TAU:rnd(0,TAU),v=type==='ring'?260:rnd(70,type==='peony'?330:230);
      A.spawn({type:'spark',tr:type==='willow'?16:9,x,y,vx:Math.cos(an)*v,vy:Math.sin(an)*v,g:type==='willow'?150:230,drag:type==='willow'?1.6:1.3,life:type==='crackle'?rnd(.5,.9):rnd(1,type==='willow'?2.1:1.5),size:type==='crackle'?1.4:2,col:type==='willow'?'255,200,110':col,
        fn:type==='crackle'?(p=>{if(p.age>.45&&!p.cr){p.cr=1;p.vx+=rnd(-160,160);p.vy+=rnd(-160,160)}}):null})}};
  A.drw.push(()=>{team.forEach(q=>{const p=vp(q);A.halo(p.x,p.y,26,'255,170,90',.4)})});
  let nextL=0;await run(T(10000),(dt,e)=>{if(e>nextL&&e<8.5){nextL=e+rnd(.35,.9);const q=pick(team),p=vp(q),tx=rnd(A.W*.15,A.W*.85),ty=rnd(A.H*.12,A.H*.5),dur=rnd(.8,1.15);
      A.spawn({type:'spark',tr:22,x:p.x,y:p.y,vx:(tx-p.x)/dur,vy:-(p.y-ty)/dur*1.0,g:0,drag:0,life:dur,size:2.2,col:'255,220,160',fn:pp=>{if(pp.age>=dur-.03&&!pp.done){pp.done=1;burst(pp.x,pp.y);pp.life=0}}});hopCursor(q,10)}})}});

/* ============================ 11 · résumé scanner: drones sweep a laser over the download button ============================ */
exp('scan',{n:3,pick:()=>{const b=document.querySelector('a.btn[download]');if(!b)return null;const r=b.getBoundingClientRect();return r.top>90&&r.bottom<innerHeight-30?{b}:null},async run(A,a,team,x){
  const b=x.b;let prog=0,done=0,sweep=0;
  const rc=()=>b.getBoundingClientRect();
  team.forEach((q,i)=>{q.k=10;q.tgt=()=>{const r=rc();return V(i===0?r.left-34:i===1?r.right+34:r.left+r.width/2,i<2?r.top+r.height*sweep:r.top-38)}});
  A.drw.push(c=>{const r=rc(),sy=r.top+r.height*sweep;c.save();c.globalCompositeOperation='lighter';
    c.fillStyle='rgba(120,200,255,.07)';c.fillRect(r.left-8,r.top-8,r.width+16,r.height+16);c.strokeStyle='rgba(150,215,255,.6)';c.lineWidth=1.4;c.strokeRect(r.left-8,r.top-8,r.width+16,r.height+16);
    for(let i=0;i<10;i++){c.fillStyle='rgba(160,220,255,.25)';c.fillRect(r.left+i*r.width/9,r.top-8,1,r.height+16)}
    const g=c.createLinearGradient(0,sy-14,0,sy+14);g.addColorStop(0,'rgba(120,200,255,0)');g.addColorStop(.5,'rgba(190,235,255,.85)');g.addColorStop(1,'rgba(120,200,255,0)');c.fillStyle=g;c.fillRect(r.left-20,sy-14,r.width+40,28);
    c.strokeStyle='rgba(220,245,255,.95)';c.lineWidth=1.6;c.beginPath();c.moveTo(r.left-34,sy);c.lineTo(r.right+34,sy);c.stroke();
    team.slice(0,2).forEach((q,i)=>{const p=vp(q);c.strokeStyle='rgba(170,225,255,.55)';c.lineWidth=1;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(i?r.right+8:r.left-8,sy);c.stroke()});c.restore();
    c.save();c.font='600 11px "JetBrains Mono",monospace';c.fillStyle='rgba(180,230,255,.95)';c.textAlign='left';
    const lines=[`SCANNING  résumé.docx`,`${Math.round(prog*100)}%  ${'█'.repeat(Math.round(prog*14)).padEnd(14,'░')}`,done?'✓ VERIFIED':''];lines.forEach((t,i)=>c.fillText(t,r.left,r.top-46-i*(-14)));
    if(done){c.globalCompositeOperation='lighter';c.strokeStyle=`rgba(130,255,190,${.8*done})`;c.lineWidth=3;c.lineCap='round';c.beginPath();const cx=r.right+22,cy=r.top+r.height/2;c.moveTo(cx-9,cy);c.lineTo(cx-2,cy+8);c.lineTo(cx+11,cy-8);c.stroke()}c.restore()});
  A.upd.push(()=>{if(Math.random()<.5){const r=rc();A.spawn({type:'dot',x:r.left+Math.random()*r.width,y:r.top+r.height*sweep,vy:-rnd(20,60),life:.6,size:1.4,col:'170,225,255'})}});
  for(let pass=0;pass<3;pass++){await ramp(T(1400),k=>{sweep=pass%2?1-k:k;prog=(pass+k)/3})}prog=1;
  const r=rc();A.ring(r.right+22,r.top+r.height/2,6,70,.7,'130,255,190',2.4);await ramp(T(500),k=>done=k);
  let cheered=false;await run(T(2600),()=>{const m=mouseP(),mx=m.x-scrollX,my=m.y-scrollY,rr=rc();if(mx>rr.left&&mx<rr.right&&my>rr.top&&my<rr.bottom&&!cheered){cheered=true;A.ring(mx,my,8,100,.8,'255,255,255',2.4);for(let k=0;k<26;k++){const an=rnd(0,TAU),v=rnd(100,320);A.spawn({type:'spark',tr:8,x:mx,y:my,vx:Math.cos(an)*v,vy:Math.sin(an)*v,g:260,drag:1.5,life:.9,size:1.8,col:pick(PCOL)})}}})}});

/* ============================ always-on reactions ============================ */
const idleNow=()=>!C.isBusy()&&!agents.some(q=>q.busy);
const amb={A:null,get(){if(!this.A||!this.A.alive){this.A=makeArena();this.A.auto=true;this.A.start()}return this.A}};
function clickBurst(x,y){const A=amb.get();A.ring(x,y,4,74,.7,'170,210,255',2.4);A.ring(x,y,2,40,.5,'255,255,255',1.6);A.spawn({type:'glow',x,y,size:64,life:.35,col:'200,230,255',a:.75});
  for(let i=0;i<22;i++){const an=rnd(0,TAU),v=rnd(80,300);A.spawn({type:'spark',tr:8,x,y,vx:Math.cos(an)*v,vy:Math.sin(an)*v,g:220,drag:1.6,life:rnd(.5,.9),size:1.6,col:pick(PCOL)})}}
window.__clickBurst=clickBurst;
addEventListener('pointerdown',e=>{if(e.target.closest&&e.target.closest('#ui,#animMenu,a,button'))return;clickBurst(e.clientX,e.clientY);
  const x=e.clientX+scrollX,y=e.clientY+scrollY,near=agents.filter(q=>q.mode==='roam'&&!q.busy).sort((p,q)=>Math.hypot(p.x-x,p.y-y)-Math.hypot(q.x-x,q.y-y))[0];if(near)hopCursor(near)},{passive:true});
let sleeping=false;
setInterval(()=>{if(!sleeping&&mouse.seen&&idleNow()&&NOW()-mouse.t>10000){sleeping=true;session(7,(A,l,team)=>auroraScene(A,team,()=>NOW()-mouse.t>800)).finally(()=>{sleeping=false})}},1000);
const KON=['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];let kp=0,typed='';
addEventListener('keydown',e=>{const k=e.key.length===1?e.key.toLowerCase():e.key;
  kp=(k===KON[kp])?kp+1:(k===KON[0]?1:0);if(kp===KON.length){kp=0;if(C.playAct)C.playAct('play_fireworks')}
  if(e.key.length===1){typed=(typed+k).slice(-5);if(typed==='hello'){typed='';if(C.playAct)C.playAct('play_hello')}}});
const hr=new Date().getHours();
if(hr>=20||hr<6)document.documentElement.classList.add('night');
if(hr>=6&&hr<10)setInterval(()=>{if(idleNow()&&Math.random()<.5){const q=pick(agents.filter(q=>q.mode==='roam'&&!q.busy));if(q)stretch(q)}},25000);
C.stretchRandom=()=>{const q=pick(agents.filter(q=>q.mode==='roam'&&!q.busy));if(q)stretch(q)};
})();
