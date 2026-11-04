/* 30 showcase scenes. Each one renders on a canvas stage hugging a hero letter or word. */
(()=>{
const C=window.__fxCore;if(!C)return;
const {layer,rnd,clamp,wait,tween,ease,NOW,glyphInfo,inView,shuffle,pick}=C;
const TAU=Math.PI*2,lerp=(a,b,t)=>a+(b-a)*t,SPD=()=>window.__fxSpeed||1;
const hash=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n)};
const vnoise=(x,y)=>{const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  return lerp(lerp(hash(xi,yi),hash(xi+1,yi),u),lerp(hash(xi,yi+1),hash(xi+1,yi+1),u),v)};
const fbm=(x,y)=>vnoise(x,y)*.5+vnoise(x*2,y*2)*.25+vnoise(x*4,y*4)*.125+vnoise(x*8,y*8)*.0625;
const who=o=>Object.assign({type:0,layout:0,motion:0,polish:0,qa:0,clean:0},o);

/* ---------- pick a big letter or word ---------- */
function targets(kind){
  const els=shuffle([...document.querySelectorAll('[data-type]')].filter(e=>e.classList.contains('built')&&parseFloat(getComputedStyle(e).fontSize)>=36&&inView(e)&&!(e._busy>NOW())));
  const ok=c=>{const r=c.getBoundingClientRect();return r.width>16&&r.height>34&&r.top>76&&r.bottom<innerHeight-30&&c.textContent.trim()};
  for(const el of els){
    const chars=[...el.querySelectorAll('.ch.on')];
    if(kind==='char'){const cs=shuffle(chars.filter(ok));if(cs.length){el._busy=NOW()+32000;return{chars:[cs[0]],el}}}
    else{
      const words=[];let cur=[];
      for(const c of chars){if(!ok(c)){if(cur.length)words.push(cur);cur=[]}else cur.push(c)}
      if(cur.length)words.push(cur);
      const w=shuffle(words.filter(w=>w.length>=3&&w.length<=9&&w.every(c=>Math.abs(c.getBoundingClientRect().top-w[0].getBoundingClientRect().top)<4)));
      if(w.length){el._busy=NOW()+32000;return{chars:w[0],el}}
    }
  }
  return null;
}

/* ---------- the stage ---------- */
function makeStage(a,chars,o){
  const gis=chars.map(c=>glyphInfo(c));
  const gl=Math.min(...gis.map(g=>g.gl)),gr=Math.max(...gis.map(g=>g.gl+g.gw)),gt=Math.min(...gis.map(g=>g.gt)),gb=Math.max(...gis.map(g=>g.gt+g.gh));
  const gw=Math.ceil(gr-gl)+2,gh=Math.ceil(gb-gt)+2,K=clamp(gh/120,.3,1.3);
  const pad=Math.round(Math.max(o.pad||150,gh*1.15,gw*.3)),dpr=Math.min(2,devicePixelRatio||1);
  const ox=gl-pad,oy=gt-pad,W=Math.ceil(gw+pad*2),H=Math.ceil(gh+pad*2);
  const G={x:pad,y:pad,w:gw,h:gh,cx:pad+gw/2,cy:pad+gh/2};
  const mk=()=>{const k=document.createElement('canvas');k.width=W*dpr;k.height=H*dpr;const x=k.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);return[k,x]};
  const [cv,ctx]=mk();cv.className='scene';Object.assign(cv.style,{left:ox+'px',top:oy+'px',width:W+'px',height:H+'px'});layer.appendChild(cv);
  const [maskC,mx]=mk(),[glyphC,gx]=mk(),[tmpC,tx]=mk();
  chars.forEach((c,i)=>{const g=gis[i],col=getComputedStyle(c).color;
    for(const [x,k] of [[mx,'#fff'],[gx,col]]){x.font=g.font;x.textAlign='center';x.fillStyle=k;x.fillText(g.ch,g.cx-ox,g.base-oy)}});
  const col=getComputedStyle(chars[0]).color;
  const md=mx.getImageData(0,0,W*dpr,H*dpr);
  const on=(x,y)=>{const ix=Math.round(x*dpr),iy=Math.round(y*dpr);return ix>=0&&iy>=0&&ix<md.width&&iy<md.height&&md.data[(iy*md.width+ix)*4+3]>110};
  const S={a,ctx,W,H,G,K,dpr,col,pad,ox,oy,mask:maskC,glyph:glyphC,on,mk,fbm,vnoise,lerp,TAU,ease,rnd,clamp,pick,shuffle,
    shake:0,flash:0,ps:[],drw:[],upd:[],chars,hidden:false,t:0};
  S.P=(x,y)=>({x:x+ox,y:y+oy});S.L=(x,y)=>({x:x-ox,y:y-oy});S.cur=()=>({x:a.x-ox+3,y:a.y-oy+3});
  S.go=(fn,max=2200)=>a.go(()=>{const q=fn();return{x:q.x+ox,y:q.y+oy}},max);
  S.follow=(fn,k=10)=>{a.k=k;a.tgt=()=>{const q=fn();return{x:q.x+ox,y:q.y+oy}}};
  S.tw=(ms,f)=>tween(ms*SPD(),f);S.wait=ms=>wait(ms*SPD());
  S.hide=()=>{chars.forEach(c=>c.classList.add('gh'));S.hidden=true};
  S.show=()=>{chars.forEach(c=>c.classList.remove('gh'));S.hidden=false};
  S.masked=(draw,al=1,op='source-over')=>{tx.save();tx.clearRect(0,0,W,H);draw(tx);tx.globalCompositeOperation='destination-in';tx.drawImage(maskC,0,0,W,H);tx.restore();
    ctx.save();ctx.globalAlpha=al;ctx.globalCompositeOperation=op;ctx.drawImage(tmpC,0,0,W,H);ctx.restore()};
  S.blit=(src,al=1,op='source-over')=>{ctx.save();ctx.globalAlpha=al;ctx.globalCompositeOperation=op;ctx.drawImage(src,0,0,W,H);ctx.restore()};
  S.tint=(color,src)=>{const [c,x]=mk();x.drawImage(src||maskC,0,0,W,H);x.globalCompositeOperation='source-in';x.fillStyle=color;x.fillRect(0,0,W,H);return c};
  S.blur=(src,px)=>{const [c,x]=mk();if('filter' in x)x.filter=`blur(${px}px)`;x.drawImage(src,0,0,W,H);return c};
  S.ring=r=>{const [er,ex]=mk();ex.drawImage(maskC,0,0,W,H);ex.globalCompositeOperation='destination-in';
    for(let i=0;i<8;i++){ex.drawImage(maskC,Math.cos(i*TAU/8)*r,Math.sin(i*TAU/8)*r,W,H)}
    const [rg,rx]=mk();rx.drawImage(maskC,0,0,W,H);rx.globalCompositeOperation='destination-out';rx.drawImage(er,0,0,W,H);return rg};
  S.star=(c,x,y,s,al)=>{c.save();c.globalAlpha=al;c.globalCompositeOperation='lighter';
    const g=c.createRadialGradient(x,y,0,x,y,s);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.3,'rgba(255,235,225,.55)');g.addColorStop(1,'rgba(255,200,170,0)');
    c.fillStyle=g;c.beginPath();c.arc(x,y,s,0,TAU);c.fill();c.fillStyle='#fff';c.beginPath();c.moveTo(x,y-s*1.7);c.quadraticCurveTo(x,y,x+s*1.7,y);
    c.quadraticCurveTo(x,y,x,y+s*1.7);c.quadraticCurveTo(x,y,x-s*1.7,y);c.quadraticCurveTo(x,y,x,y-s*1.7);c.fill();c.restore()};
  let pts=null,ed=null,gd=null;
  S.pts=()=>{if(!pts){pts=[];for(let y=Math.floor(G.y);y<G.y+G.h;y++)for(let x=Math.floor(G.x);x<G.x+G.w;x++)if(on(x+.5,y+.5))pts.push({x:x+.5,y:y+.5})}return pts};
  S.rp=()=>{const p=S.pts();return p[Math.floor(Math.random()*p.length)]};
  S.edges=()=>{if(!ed){ed=[];for(const p of S.pts()){const x=p.x,y=p.y;if(!on(x-1,y)||!on(x+1,y)||!on(x,y-1)||!on(x,y+1))
      ed.push({x,y,nx:(on(x-1,y)?0:-1)+(on(x+1,y)?0:1),ny:(on(x,y-1)?0:-1)+(on(x,y+1)?0:1)})}}return ed};
  S.colAt=(x,y)=>{if(!gd)gd=gx.getImageData(0,0,W*dpr,H*dpr);const i=(Math.round(y*dpr)*gd.width+Math.round(x*dpr))*4;return`rgb(${gd.data[i]},${gd.data[i+1]},${gd.data[i+2]})`};
  S.drawGlyph=(c,s={})=>{c.save();c.globalAlpha=s.al===undefined?1:s.al;const px=s.px===undefined?G.cx:s.px,py=s.py===undefined?G.cy:s.py;
    c.translate(px+(s.x||0),py+(s.y||0));c.rotate(s.rot||0);c.scale(s.sx||1,s.sy||1);c.translate(-px,-py);c.drawImage(s.src||glyphC,0,0,W,H);c.restore()};
  S.vor=N=>{const seeds=[];const GW=Math.ceil(G.w),GH=Math.ceil(G.h);
    for(const m of [1.15,.8,.5]){const minD=Math.min(GW,GH)/(Math.sqrt(N)*m);for(let t=0;t<1200&&seeds.length<N;t++){const x=G.x+rnd(0,GW),y=G.y+rnd(0,GH);if(on(x,y)&&seeds.every(s=>Math.hypot(s.x-x,s.y-y)>minD))seeds.push({x,y})}if(seeds.length>=N*.8)break}
    const ids=new Int16Array(GW*GH).fill(-1);
    for(let j=0;j<GH;j++)for(let i=0;i<GW;i++){const px=G.x+i+.5,py=G.y+j+.5;if(!on(px,py))continue;let b=-1,bd=1e9;
      for(let k=0;k<seeds.length;k++){const s=seeds[k],d=Math.hypot(px-s.x,py-s.y)+Math.sin(px*.31+py*.17+k*1.7)*2.4+Math.sin(py*.43-px*.11+k)*1.8;if(d<bd){bd=d;b=k}}ids[j*GW+i]=b}
    const edges=[];
    for(let j=0;j<GH;j++)for(let i=0;i<GW;i++){const id=ids[j*GW+i];if(id<0)continue;const r=i+1<GW?ids[j*GW+i+1]:-1,d=j+1<GH?ids[(j+1)*GW+i]:-1;
      if((r>=0&&r!==id)||(d>=0&&d!==id))edges.push({x:G.x+i+.5,y:G.y+j+.5})}
    const cells=seeds.map((s,k)=>{const [c,x]=mk();const im=x.createImageData(W*dpr,H*dpr);let sx=0,sy=0,n=0;
      for(let j=0;j<GH;j++)for(let i=0;i<GW;i++)if(ids[j*GW+i]===k){sx+=i;sy+=j;n++;
        for(let yy=0;yy<dpr;yy++)for(let xx=0;xx<dpr;xx++){const px=Math.round((G.x+i)*dpr)+xx,py=Math.round((G.y+j)*dpr)+yy;im.data[(py*W*dpr+px)*4+3]=255}}
      const t2=document.createElement('canvas');t2.width=W*dpr;t2.height=H*dpr;t2.getContext('2d').putImageData(im,0,0);x.setTransform(1,0,0,1,0,0);x.drawImage(t2,0,0);x.setTransform(dpr,0,0,dpr,0,0);
      return{cv:c,cx:G.x+sx/Math.max(1,n),cy:G.y+sy/Math.max(1,n)}});
    return{seeds,edges,cells}};
  S.spawn=p=>S.ps.push(Object.assign({x:0,y:0,vx:0,vy:0,g:0,drag:0,age:0,life:1,size:2,type:'dot',col:'255,255,255',a:1,rot:0,vr:0,grow:0,flip:8,add:false,shrink:true},p));
  const drawP=(c,p)=>{const k=clamp(1-p.age/p.life,0,1);
    c.globalCompositeOperation=p.add?'lighter':'source-over';
    switch(p.type){
      case'dot':c.fillStyle=`rgba(${p.col},${p.a*k})`;c.beginPath();c.arc(p.x,p.y,Math.max(.2,p.size*(p.shrink?(.4+.6*k):1)),0,TAU);c.fill();break;
      case'glow':{const r=p.size*(.4+.6*k),g=c.createRadialGradient(p.x,p.y,0,p.x,p.y,r);g.addColorStop(0,`rgba(${p.col},${p.a*k})`);g.addColorStop(1,`rgba(${p.col},0)`);c.fillStyle=g;c.fillRect(p.x-r,p.y-r,r*2,r*2);break}
      case'smoke':{const r=p.size*(1+p.grow*p.age),g=c.createRadialGradient(p.x,p.y,0,p.x,p.y,r);g.addColorStop(0,`rgba(${p.col},${p.a*k*k})`);g.addColorStop(1,`rgba(${p.col},0)`);c.fillStyle=g;c.fillRect(p.x-r,p.y-r,r*2,r*2);break}
      case'spark':c.strokeStyle=`rgba(${p.col},${k})`;c.lineWidth=p.size;c.lineCap='round';c.beginPath();c.moveTo(p.x-p.vx*.035,p.y-p.vy*.035);c.lineTo(p.x,p.y);c.stroke();break;
      case'conf':c.save();c.translate(p.x,p.y);c.rotate(p.rot);c.scale(1,Math.cos(p.age*p.flip));c.fillStyle=p.css;c.globalAlpha=Math.min(1,k*3);c.fillRect(-p.size/2,-p.size*.3,p.size,p.size*.6);c.restore();break;
      case'sq':c.fillStyle=p.css;c.globalAlpha=p.a*k;c.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size);c.globalAlpha=1;break;
      case'ring':c.strokeStyle=`rgba(${p.col},${p.a*k})`;c.lineWidth=p.lw||1.5;c.beginPath();c.arc(p.x,p.y,p.size*(1-k)+2,0,TAU);c.stroke();break;
    }c.globalCompositeOperation='source-over'};
  let raf=0,lt=NOW();
  const step=now=>{const dt=Math.min(.05,(now-lt)/1000);lt=now;S.t=now/1000;
    for(const u of S.upd)u(dt,S.t);
    for(const p of S.ps){p.age+=dt;const d=Math.exp(-p.drag*dt);p.vx*=d;p.vy*=d;p.vy+=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=p.vr*dt;if(p.fn)p.fn(p,dt)}
    for(let i=S.ps.length-1;i>=0;i--)if(S.ps[i].age>S.ps[i].life)S.ps.splice(i,1);
    S.shake*=Math.pow(.02,dt);S.flash*=Math.pow(.015,dt);
    ctx.clearRect(0,0,W,H);ctx.save();ctx.translate((Math.random()-.5)*2*S.shake*3*K,(Math.random()-.5)*2*S.shake*3*K);
    for(const d of S.drw)d(ctx,S.t,dt);
    for(const p of S.ps)drawP(ctx,p);
    ctx.restore();
    if(S.flash>.02){ctx.save();ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(G.cx,G.cy,0,G.cx,G.cy,Math.max(G.w,G.h)*1.2);g.addColorStop(0,`rgba(255,255,255,${S.flash*.8})`);g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.restore()}
  };
  const loop=now=>{try{step(now)}catch(e){if(!S.err){S.err=1;console.error('fx draw',e)}}raf=requestAnimationFrame(loop)};
  S.start=()=>{lt=NOW();raf=requestAnimationFrame(loop)};
  S.stop=()=>{cancelAnimationFrame(raf);cv.remove();if(S.hidden)S.show()};
  S.charCanvases=()=>chars.map((c,i)=>{const g=gis[i],[cc,x]=mk();x.font=g.font;x.textAlign='center';x.fillStyle=getComputedStyle(c).color;x.fillText(g.ch,g.cx-ox,g.base-oy);return{cv:cc,px:g.gl+g.gw-ox,py:g.gt+g.gh-oy}});
  S.ring2=(x,y,size,colr,lw)=>S.spawn({type:'ring',x,y,size,col:colr||'255,255,255',life:.7,lw,add:true});
  return S;
}

function fx(id,o){
  C.act((o.pre||'fx_')+id,{cd:o.cd||90000,w:o.w||.35,who:o.who,
    pick:()=>{if(C.isBusy()||!C.gapOK())return null;return targets(o.kind||'char')},
    async run(a,x){
      if(C.isBusy())return;C.lock();let S=null;
      try{S=makeStage(a,x.chars,o);S.start();if(o.replace)S.hide();await o.run(S,a)}
      catch(e){console.error('fx '+id,e)}
      finally{if(S)S.stop();C.unlock()}
    }});
}
const lead=S=>S.go(()=>({x:S.G.x-S.pad*.55,y:S.G.cy-S.pad*.15}));
const dirPulse=(S,x,y,n,colr,sp)=>{for(let i=0;i<n;i++){const an=rnd(0,TAU),v=rnd(.4,1)*sp*S.K;S.spawn({type:'spark',x,y,vx:Math.cos(an)*v,vy:Math.sin(an)*v,g:600*S.K,life:rnd(.3,.7),size:1.6,col:colr||'255,230,200',add:true})}};

/* 1 · frost creeps over the letter in fractal crystals, then thaws */
fx('frost',{kind:'char',who:who({qa:5,polish:2}),async run(S,a){
  const {G,K,W,H}=S,E=S.edges();let f=0,breath=false,thaw=false;const segs=[];
  const grow=(x,y,ang,len,w,b,d)=>{let cx=x,cy=y,bb=b;const n=Math.max(2,Math.round(len/3));
    for(let i=0;i<n;i++){const na=ang+rnd(-.28,.28),nx=cx+Math.cos(na)*3,ny=cy+Math.sin(na)*3;bb+=.004;segs.push({x0:cx,y0:cy,x1:nx,y1:ny,w,b:bb});cx=nx;cy=ny;
      if(d<4&&i>1&&Math.random()<.2)grow(cx,cy,na+(Math.random()<.5?-1:1)*rnd(.5,1.1),len*rnd(.35,.6),w*.7,bb,d+1)}};
  for(let i=0;i<20;i++){const e=pick(E);grow(e.x,e.y,Math.atan2(G.cy-e.y,G.cx-e.x)+rnd(-1,1),rnd(24,52)*K,1.5*Math.max(.7,K),rnd(0,.18),0)}
  const mb=Math.max(...segs.map(s=>s.b));segs.forEach(s=>s.bn=s.b/mb);
  S.upd.push(()=>{
    if(breath){const q=S.cur();S.spawn({type:'smoke',x:q.x,y:q.y,vx:rnd(50,110)*K,vy:rnd(-14,14),life:rnd(.7,1.1),size:rnd(10,20)*K,grow:1.3,col:'210,235,255',a:.35,drag:.9})}
    if(f>.25&&Math.random()<.3){const s=segs[Math.floor(Math.random()*segs.length)];if(s.bn<f)S.spawn({type:'glow',x:s.x1,y:s.y1,size:rnd(7,14)*K,col:'210,240,255',life:.5,add:true})}
    if(thaw&&Math.random()<.5){const e=pick(E);if(e.ny>0)S.spawn({type:'dot',x:e.x,y:e.y,vy:rnd(10,40),g:900*K,life:.9,size:2.2*K,col:'190,225,255',shrink:false})}});
  S.drw.push(c=>{if(f<=0)return;
    S.masked(t=>{const g=t.createLinearGradient(G.x,G.y,G.x+G.w,G.y+G.h);g.addColorStop(0,'rgba(220,242,255,.6)');g.addColorStop(1,'rgba(140,200,245,.55)');t.globalAlpha=f;t.fillStyle=g;t.fillRect(0,0,W,H)});
    c.save();c.globalCompositeOperation='lighter';c.lineCap='round';
    for(const s of segs){if(s.bn>f)continue;const age=clamp((f-s.bn)*7,0,1);c.strokeStyle=`rgba(150,210,255,${.35*age})`;c.lineWidth=s.w*3.2;c.beginPath();c.moveTo(s.x0,s.y0);c.lineTo(s.x1,s.y1);c.stroke();
      c.strokeStyle=`rgba(235,248,255,${.9*age})`;c.lineWidth=s.w;c.stroke()}c.restore()});
  await lead(S);breath=true;await S.tw(2600,k=>f=ease(k));breath=false;await S.wait(1100);thaw=true;await S.tw(2000,k=>f=1-ease(k));thaw=false;await S.wait(300)}});

/* 2 · fire catches, chars, and burns out to ash */
fx('fire',{kind:'char',who:who({motion:5,polish:2}),async run(S,a){
  const {G,K,W,H}=S;let burn=0,flame=0,ash=false;const glowC=S.blur(S.tint('rgb(255,120,40)'),9*K);
  S.upd.push(()=>{
    for(let i=0;i<Math.round(flame*7);i++){let p=S.rp();const q=S.rp();if(q.y>p.y)p=q;
      S.spawn({type:'glow',add:true,x:p.x,y:p.y,vx:rnd(-14,14)*K,vy:-rnd(70,190)*K,life:rnd(.5,1),size:rnd(14,26)*K,col:'255,150,40',drag:.8,fn:q2=>{const k=q2.age/q2.life;q2.col=k<.25?'255,235,170':k<.6?'255,150,40':'200,50,20'}})}
    if(flame>.3&&Math.random()<.5){const p=S.rp();S.spawn({type:'smoke',x:p.x,y:G.y-6,vx:rnd(-10,10),vy:-rnd(30,70)*K,life:1.6,size:rnd(14,24)*K,grow:1,col:'60,55,52',a:.28,drag:.3})}
    if(flame>.2&&Math.random()<.4){const p=S.rp();S.spawn({type:'dot',add:true,x:p.x,y:p.y,vx:rnd(-30,30)*K,vy:-rnd(60,150)*K,life:rnd(1,1.8),size:1.6*K,col:'255,170,60',drag:.5})}
    if(ash&&Math.random()<.6){const p=S.rp();S.spawn({type:'dot',x:p.x,y:p.y,vx:rnd(10,60)*K,vy:-rnd(20,70)*K,life:1.4,size:1.8*K,col:'120,110,105',drag:.4})}});
  S.drw.push(c=>{if(burn>0){S.masked(t=>{const g=t.createLinearGradient(0,G.y,0,G.y+G.h);g.addColorStop(0,`rgba(12,8,6,${.55*burn})`);g.addColorStop(1,`rgba(8,5,4,${.8*burn})`);t.fillStyle=g;t.fillRect(0,0,W,H)});
      S.blit(glowC,burn*(.55+.35*Math.sin(S.t*14)),'lighter')}});
  await lead(S);for(let i=0;i<10;i++){const p=S.P(0,0);S.spawn({type:'spark',x:G.x-S.pad*.3,y:G.y+G.h*.9,vx:rnd(40,180)*K,vy:-rnd(30,120)*K,g:500*K,life:.5,add:true,col:'255,200,100',size:1.6});await S.wait(60)}
  await S.tw(900,k=>flame=ease(k));await S.tw(1600,k=>burn=ease(k));await S.wait(1200);
  flame=0;ash=true;S.flash=.5;await S.tw(1500,k=>burn=1-ease(k));ash=false;await S.wait(400)}});

/* 3 · lightning strikes the letter, arcs crawl its edges */
fx('lightning',{kind:'char',who:who({polish:5,qa:2}),async run(S,a){
  const {G,K,W,H}=S,E=S.edges();let bolts=[],charge=0;
  const bolt=(x0,y0,x1,y1,d)=>{let p=[{x:x0,y:y0},{x:x1,y:y1}];for(let s=d;s>1.5;s*=.55){const n=[];for(let i=0;i<p.length-1;i++){const A_=p[i],B=p[i+1];n.push(A_);n.push({x:(A_.x+B.x)/2+rnd(-s,s),y:(A_.y+B.y)/2+rnd(-s*.4,s*.4)})}n.push(p[p.length-1]);p=n}return p};
  const strike=()=>{const t=S.rp(),x0=G.cx+rnd(-40,40)*K,main=bolt(x0,-10,t.x,t.y,60*K),br=[];
    for(let i=0;i<4;i++){const s=main[Math.floor(rnd(8,main.length-8))];br.push(bolt(s.x,s.y,s.x+rnd(-90,90)*K,s.y+rnd(40,110)*K,26*K))}
    bolts.push({main,br,t:0});S.flash=1;S.shake=1;charge=1;if(window.__sfx)__sfx.play('zap');dirPulse(S,t.x,t.y,26,'190,220,255',420)};
  const stroke=(c,p,w,col,al)=>{c.strokeStyle=`rgba(${col},${al})`;c.lineWidth=w;c.beginPath();p.forEach((q,i)=>i?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y));c.stroke()};
  S.upd.push((dt)=>{bolts.forEach(b=>b.t+=dt);bolts=bolts.filter(b=>b.t<.28);charge*=Math.pow(.25,dt)});
  S.drw.push(c=>{
    if(charge>.03){S.masked(t=>{t.fillStyle=`rgba(150,200,255,${.55*charge})`;t.fillRect(0,0,W,H)});
      c.save();c.globalCompositeOperation='lighter';c.lineJoin='round';
      for(let i=0;i<7;i++){const e=pick(E),n=[];let x=e.x,y=e.y;const tx_=pick(E);const dx=tx_.x-x,dy=tx_.y-y,d=Math.hypot(dx,dy);if(d>26*K||d<4)continue;
        for(let s=0;s<=6;s++)n.push({x:x+dx*s/6+(s&&s<6?rnd(-3,3)*K:0),y:y+dy*s/6+(s&&s<6?rnd(-3,3)*K:0)});stroke(c,n,2.6,'120,170,255',.4*charge);stroke(c,n,1,'235,245,255',.95*charge)}c.restore()}
    c.save();c.globalCompositeOperation='lighter';c.lineJoin='round';c.lineCap='round';
    for(const b of bolts){const al=(Math.random()<.35?.4:1)*(1-b.t/.28);for(const p of [b.main,...b.br]){stroke(c,p,12*K,'90,140,255',.14*al);stroke(c,p,4.5*K,'160,200,255',.45*al);stroke(c,p,1.8*K,'255,255,255',al)}}c.restore()});
  await lead(S);await S.wait(500);strike();await S.wait(260);strike();await S.wait(700);strike();await S.wait(2200)}});

/* 4 · the letter becomes a neon tube that buzzes on */
fx('neon',{kind:'char',who:who({polish:4,qa:3}),replace:true,async run(S,a){
  const {G,K,W,H}=S,hue=pick(['#ff2d9b','#3df0ff','#7dff6a','#ffb020']);
  const ring=S.ring(2.4*K),core=S.ring(1*K),tube=S.tint(hue,ring),glow1=S.blur(tube,6*K),glow2=S.blur(tube,16*K),coreW=S.tint('#ffffff',core);
  let lum=0,rv=0;
  S.upd.push(()=>{if(rv>=1)lum=Math.random()<.04?.35:1;else lum=Math.random()<.5?.2:.9;if(rv>0&&rv<1&&Math.random()<.4)S.spawn({type:'spark',x:G.x+G.w*rv,y:G.y+rnd(0,G.h),vx:rnd(-100,100),vy:rnd(-140,40),g:500,life:.4,col:'255,230,255',size:1.4,add:true})});
  S.drw.push(c=>{
    c.save();c.beginPath();c.rect(0,0,G.x+G.w*rv+2,H);c.clip();
    S.blit(S.tint('rgba(60,60,70,.5)',ring),1);
    c.globalCompositeOperation='lighter';S.blit(glow2,.6*lum,'lighter');S.blit(glow1,.85*lum,'lighter');S.blit(tube,lum,'lighter');S.blit(coreW,.9*lum,'lighter');c.restore();
    const g=c.createRadialGradient(G.cx,G.cy,0,G.cx,G.cy,Math.max(G.w,G.h));g.addColorStop(0,hue+'44');g.addColorStop(1,hue+'00');c.save();c.globalCompositeOperation='lighter';c.globalAlpha=lum*rv;c.fillStyle=g;c.fillRect(0,0,W,H);c.restore()});
  await lead(S);S.follow(()=>({x:G.x+G.w*rv,y:G.cy+Math.sin(S.t*8)*G.h*.3}),9);await S.tw(2200,k=>rv=k);S.shake=.4;await S.wait(3200);
  for(let i=0;i<5;i++){rv=1;await S.wait(70);rv=0;await S.wait(60)}}});

/* 5 · RGB glitch with sliced bands and scanlines */
fx('glitch',{kind:'word',who:who({qa:4,layout:3,polish:1}),replace:true,async run(S,a){
  const {G,K,W,H}=S;let amt=0;
  const chan=rgb=>{const [c,x]=S.mk();x.drawImage(S.glyph,0,0,W,H);x.globalCompositeOperation='multiply';x.fillStyle=rgb;x.fillRect(0,0,W,H);x.globalCompositeOperation='destination-in';x.drawImage(S.mask,0,0,W,H);return c};
  const R=chan('rgb(255,0,0)'),Gc=chan('rgb(0,255,0)'),B=chan('rgb(0,0,255)');
  S.drw.push(c=>{
    c.save();c.globalCompositeOperation='lighter';
    const bands=Math.round(7+amt*8);let y=G.y-6;
    for(let i=0;i<bands;i++){const h=Math.max(3,(G.h+12)/bands*rnd(.5,1.5)),dx=(Math.random()<.5+amt*.4?rnd(-1,1)*amt*28*K:0);
      for(const [im,s] of [[R,-1],[Gc,0],[B,1]]){c.save();c.beginPath();c.rect(0,y,W,h);c.clip();c.drawImage(im,dx+s*amt*9*K,0,W,H);c.restore()}y+=h}
    c.restore();
    S.masked(t=>{t.fillStyle='rgba(0,0,0,.28)';for(let yy=G.y;yy<G.y+G.h;yy+=3)t.fillRect(0,yy,W,1)});
    if(amt>.3)for(let i=0;i<8;i++){const x=rnd(G.x,G.x+G.w),y=rnd(G.y,G.y+G.h),w=rnd(6,28)*K,h=rnd(2,5)*K;c.save();c.beginPath();c.rect(x,y,w,h);c.clip();c.drawImage(S.glyph,rnd(-20,20)*amt,0,W,H);c.restore()}});
  await lead(S);S.follow(()=>({x:G.x-S.pad*.5+Math.sin(S.t*20)*3,y:G.cy}),12);
  for(const p of [.8,.2,1,.15,.9,0]){await S.tw(260,k=>amt=lerp(amt,p,.25+k*.5));S.shake=p*.8;await S.wait(rnd(180,520))}amt=0;await S.wait(300)}});

/* 6 · hologram projected from a base, scanning in and out */
fx('hologram',{kind:'word',who:who({qa:5,layout:2}),replace:true,async run(S,a){
  const {G,K,W,H}=S,cy=pick(['#46e6ff','#7dffb0']);
  const tint=S.tint(cy);const [lines,lx]=S.mk();lx.drawImage(tint,0,0,W,H);lx.globalCompositeOperation='destination-out';lx.fillStyle='rgba(0,0,0,.6)';for(let y=0;y<H;y+=3)lx.fillRect(0,y,W,1);
  const edge=S.blur(S.tint(cy,S.ring(1.6*K)),3*K);let rv=0,al=0,jit=0;
  S.upd.push(()=>{jit=Math.random()<.06?rnd(-4,4)*K:0;if(rv>0.02&&Math.random()<.5)S.spawn({type:'sq',x:rnd(G.x,G.x+G.w),y:G.y+G.h*(1-rv)+rnd(-6,6),vy:-rnd(30,90),life:1,size:rnd(1.5,3.5)*K,css:cy,a:.9})});
  S.drw.push(c=>{
    const by=G.y+G.h+S.pad*.38;c.save();c.globalCompositeOperation='lighter';
    const g=c.createLinearGradient(0,G.y,0,by);g.addColorStop(0,cy+'00');g.addColorStop(1,cy+'38');c.fillStyle=g;c.globalAlpha=al;c.beginPath();c.moveTo(G.x,G.y+G.h);c.lineTo(G.x+G.w,G.y+G.h);c.lineTo(G.cx+G.w*.45,by);c.lineTo(G.cx-G.w*.45,by);c.fill();
    c.strokeStyle=cy;c.globalAlpha=al*.8;c.lineWidth=2;for(const r of [1,.7]){c.beginPath();c.ellipse(G.cx,by,G.w*.5*r+10,8*K*r+3,0,0,TAU);c.stroke()}c.restore();
    c.save();c.beginPath();c.rect(0,G.y+G.h*(1-rv)-3,W,H);c.clip();const fl=.55+.35*Math.random();
    c.globalAlpha=al*fl;c.drawImage(lines,jit,0,W,H);S.blit(edge,al*.9,'lighter');
    const bd=(S.t*.9)%1,yy=G.y+bd*G.h;c.globalCompositeOperation='lighter';const bg=c.createLinearGradient(0,yy-8,0,yy+8);bg.addColorStop(0,cy+'00');bg.addColorStop(.5,cy+'cc');bg.addColorStop(1,cy+'00');c.globalAlpha=al;c.fillStyle=bg;c.fillRect(G.x-10,yy-8,G.w+20,16);c.restore()});
  await lead(S);S.follow(()=>({x:G.cx+G.w*.6,y:G.y+G.h+S.pad*.38}),9);await S.tw(500,k=>al=k);await S.tw(1500,k=>rv=ease(k));await S.wait(3000);
  for(let i=0;i<4;i++){al=.2;await S.wait(60);al=1;await S.wait(90)}await S.tw(700,k=>rv=1-ease(k));al=0}});

/* 7 · liquid is poured in, sloshes, and drains */
fx('liquid',{kind:'char',who:who({motion:4,clean:3}),async run(S,a){
  const {G,K,W,H}=S,colr=pick([[255,59,59],[59,156,255],[52,211,153],[255,176,32]]),rgb=colr.join(',');let lev=0,pour=0,amp=0;
  S.upd.push(()=>{if(lev>.04&&lev<.97&&Math.random()<.5){const p=S.rp();if(p.y>G.y+G.h*(1-lev))S.spawn({type:'ring',x:p.x,y:p.y,vy:-rnd(14,40)*K,size:rnd(2.5,5)*K,life:1.1,col:'255,255,255',a:.7,lw:1})}
    if(pour>.2&&Math.random()<.6)S.spawn({type:'dot',x:G.cx+rnd(-8,8)*K,y:G.y+G.h*(1-lev),vx:rnd(-90,90)*K,vy:-rnd(50,180)*K,g:900*K,life:.5,size:1.8*K,col:rgb})});
  S.drw.push(c=>{if(lev<=0)return;const top=G.y+G.h*(1-lev);
    S.masked(t=>{for(const [off,al,k2] of [[0,.8,.5],[1.7,1,1]]){const g=t.createLinearGradient(0,top,0,G.y+G.h);g.addColorStop(0,`rgba(${colr.map(v=>Math.min(255,v+40)).join(',')},${al})`);g.addColorStop(1,`rgba(${colr.map(v=>v*.45|0).join(',')},${al})`);t.fillStyle=g;t.beginPath();t.moveTo(0,H);
      for(let x=0;x<=W;x+=3)t.lineTo(x,top+Math.sin(x*.09+S.t*5+off)*amp*K*k2);t.lineTo(W,H);t.fill()}
      t.strokeStyle='rgba(255,255,255,.7)';t.lineWidth=1.4;t.beginPath();for(let x=0;x<=W;x+=3)t[x?'lineTo':'moveTo'](x,top+Math.sin(x*.09+S.t*5+1.7)*amp*K);t.stroke()});
    if(pour>0){c.save();const g=c.createLinearGradient(0,0,0,top);g.addColorStop(0,`rgba(${rgb},0)`);g.addColorStop(1,`rgba(${rgb},${pour})`);c.fillStyle=g;c.fillRect(G.cx-4*K,G.y-S.pad*.7,8*K,top-(G.y-S.pad*.7));c.restore()}});
  await lead(S);S.follow(()=>({x:G.cx-14*K,y:G.y-S.pad*.65}),9);pour=1;amp=5;await S.tw(2600,k=>lev=ease(k));pour=0;await S.tw(500,k=>amp=5*(1-k)+1.2);await S.wait(900);
  amp=3;for(const e of S.edges())if(e.ny>0&&Math.random()<.02)S.spawn({type:'dot',x:e.x,y:e.y,vy:20,g:900*K,life:.9,size:2.2*K,col:rgb,shrink:false});
  await S.tw(1800,k=>lev=1-ease(k));await S.wait(200)}});

/* 8 · ink blooms through the letter, then is wiped away */
fx('ink',{kind:'char',who:who({polish:3,clean:4}),async run(S,a){
  const {G,K,W,H}=S,[inkC,ix]=S.mk(),[eraseC,ex]=S.mk();const blots=Array.from({length:3},()=>({...S.rp(),r:2}));let spread=false,wipe=0,al=1;
  S.upd.push((dt)=>{if(spread)for(const b of blots){b.r+=dt*58*K;for(let i=0;i<14;i++){const an=rnd(0,TAU),rr=b.r*(.7+.4*fbm(an*2+b.x*.05,S.t*.5));
      const g=ix.createRadialGradient(b.x+Math.cos(an)*rr*.7,b.y+Math.sin(an)*rr*.7,0,b.x+Math.cos(an)*rr*.7,b.y+Math.sin(an)*rr*.7,b.r*.4+4);g.addColorStop(0,'rgba(14,10,38,.95)');g.addColorStop(1,'rgba(14,10,38,0)');ix.fillStyle=g;ix.fillRect(b.x+Math.cos(an)*rr*.7-b.r,b.y+Math.sin(an)*rr*.7-b.r,b.r*2,b.r*2)}}
    if(wipe>0){const q=S.cur();ix.save();ix.globalCompositeOperation='destination-out';ix.fillStyle='rgba(0,0,0,.55)';ix.beginPath();ix.arc(q.x,q.y,22*K,0,TAU);ix.fill();ix.restore()}});
  S.drw.push(c=>{S.masked(t=>{t.drawImage(inkC,0,0,W,H);t.globalCompositeOperation='source-atop';const g=t.createLinearGradient(G.x,G.y,G.x+G.w,G.y+G.h);g.addColorStop(0,'rgba(120,110,220,.22)');g.addColorStop(.5,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(90,80,200,.15)');t.fillStyle=g;t.fillRect(0,0,W,H)},al)});
  await lead(S);S.follow(()=>({x:blots[0].x-6,y:blots[0].y-S.pad*.5}),9);for(const b of blots){for(let i=0;i<14;i++)S.spawn({type:'dot',x:b.x,y:b.y,vx:rnd(-160,160)*K,vy:-rnd(60,220)*K,g:700*K,life:.8,size:rnd(1.5,3)*K,col:'20,14,50',shrink:false})}
  spread=true;await S.wait(2400);spread=false;await S.wait(800);
  S.follow(()=>({x:G.x+G.w*(.5+.5*Math.sin(S.t*3.2)),y:G.y+((S.t*.4)%1)*G.h}),11);wipe=1;await S.wait(2600);wipe=0;await S.tw(500,k=>al=1-k)}});

/* 9 · gold leaf is brushed on, then sweeps with a sheen */
fx('gold',{kind:'char',who:who({polish:6,qa:1}),async run(S,a){
  const {G,K,W,H}=S,[paintC,px]=S.mk(),[goldC,gx2]=S.mk();let prog=0,al=1,sheen=-1,painting=false;
  const g=gx2.createLinearGradient(G.x,G.y,G.x+G.w*.5,G.y+G.h);[[0,'#fff3b0'],[.25,'#e0b030'],[.5,'#fff0a0'],[.75,'#b07810'],[1,'#f6d050']].forEach(([o,cc])=>g.addColorStop(o,cc));gx2.fillStyle=g;gx2.fillRect(0,0,W,H);
  for(let i=0;i<260;i++){gx2.fillStyle=Math.random()<.5?'rgba(255,245,190,.18)':'rgba(120,70,0,.16)';gx2.fillRect(G.x+rnd(-4,G.w),G.y+rnd(0,G.h),rnd(8,40)*K,1)}
  const rim=(()=>{const [r,x]=S.mk();x.drawImage(S.mask,0,0,W,H);x.globalCompositeOperation='destination-out';x.drawImage(S.mask,1.8*K,1.8*K,W,H);return S.tint('#fffbe0',r)})();
  const rows=Math.max(4,Math.round(G.h/(20*K)));
  S.upd.push(()=>{if(painting){const q=S.cur();px.fillStyle='#fff';px.beginPath();px.arc(q.x,q.y,16*K,0,TAU);px.fill()}});
  S.drw.push(c=>{S.masked(t=>{t.drawImage(goldC,0,0,W,H);t.globalCompositeOperation='destination-in';t.drawImage(paintC,0,0,W,H)},al);
    if(prog>.95)S.blit(rim,.85*al,'lighter');
    if(sheen>=0&&sheen<=1)S.masked(t=>{t.save();t.translate(G.cx,G.cy);t.rotate(-.35);const bx=(sheen*1.5-.25)*G.w*1.7-G.w*.85,gg=t.createLinearGradient(bx-60*K,0,bx+60*K,0);gg.addColorStop(0,'rgba(255,255,255,0)');gg.addColorStop(.5,'rgba(255,255,255,.95)');gg.addColorStop(1,'rgba(255,255,255,0)');t.fillStyle=gg;t.fillRect(-W,-H,W*2,H*2);t.restore()},al,'lighter')});
  await lead(S);painting=true;S.follow(()=>{const k=clamp(prog*rows,0,rows-.001),row=Math.floor(k),f=k-row;return{x:G.x+(row%2?1-f:f)*G.w,y:G.y+(row+.5)/rows*G.h}},11);
  await S.tw(3000,k=>prog=k);painting=false;S.follow(()=>({x:G.x+G.w+S.pad*.4,y:G.cy}),8);
  for(let i=0;i<2;i++){for(let j=0;j<5;j++){const p=S.rp();S.spawn({type:'glow',add:true,x:p.x,y:p.y,size:rnd(8,16)*K,col:'255,240,170',life:.7})}await S.tw(900,k=>sheen=k)}sheen=-1;await S.wait(1200);await S.tw(1000,k=>al=1-k)}});

/* 10 · the letter becomes a window onto a galaxy */
fx('galaxy',{kind:'char',who:who({polish:3,qa:3}),async run(S,a){
  const {G,K,W,H}=S;let al=0,shoot=null;const stars=Array.from({length:260},()=>({x:rnd(G.x-G.w,G.x+G.w*2),y:rnd(G.y-G.h,G.y+G.h*2),s:rnd(.5,1.8)*K,p:rnd(0,TAU)}));
  const rim=S.blur(S.tint('rgb(120,160,255)',S.ring(2*K)),5*K);
  S.upd.push(dt=>{if(!shoot&&al>.9&&Math.random()<.01)shoot={x:G.x+G.w*rnd(.2,.7),y:G.y,vx:rnd(220,360)*K,vy:rnd(140,240)*K,t:0};if(shoot){shoot.t+=dt;shoot.x+=shoot.vx*dt;shoot.y+=shoot.vy*dt;if(shoot.t>.6)shoot=null}});
  S.drw.push(c=>{if(al<=0)return;S.masked(t=>{t.fillStyle='rgba(5,7,28,.96)';t.fillRect(0,0,W,H);t.globalCompositeOperation='lighter';
      [['120,60,210',.5,0],['40,150,230',.42,2],['235,70,170',.38,4]].forEach(([cc,a2,ph],i)=>{const x=G.cx+Math.cos(S.t*.4+ph)*G.w*.45,y=G.cy+Math.sin(S.t*.33+ph*1.3)*G.h*.4,r=Math.max(G.w,G.h)*.8,g=t.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${cc},${a2})`);g.addColorStop(1,`rgba(${cc},0)`);t.fillStyle=g;t.fillRect(0,0,W,H)});
      const rot=S.t*.12,cs=Math.cos(rot),sn=Math.sin(rot);for(const s of stars){const dx=s.x-G.cx,dy=s.y-G.cy,x=G.cx+dx*cs-dy*sn,y=G.cy+dx*sn+dy*cs;t.fillStyle=`rgba(255,255,255,${.35+.65*Math.abs(Math.sin(S.t*2+s.p))})`;t.fillRect(x,y,s.s,s.s)}
      if(shoot){t.strokeStyle='rgba(255,255,255,.9)';t.lineWidth=1.6*K;t.beginPath();t.moveTo(shoot.x-shoot.vx*.12,shoot.y-shoot.vy*.12);t.lineTo(shoot.x,shoot.y);t.stroke()}},al);S.blit(rim,al*.8,'lighter')});
  await lead(S);S.follow(()=>({x:G.cx+Math.cos(S.t*.9)*G.w*.9,y:G.cy+Math.sin(S.t*.9)*G.h*.75}),5);await S.tw(1100,k=>al=k);await S.wait(4200);await S.tw(1100,k=>al=1-k)}});

/* 11 · digital rain falls through the letter */
fx('matrix',{kind:'char',who:who({qa:6}),async run(S,a){
  const {G,K,W,H}=S,cell=Math.max(8,Math.round(10*K)),cols=Math.ceil(G.w/cell)+2,[trail,tr]=S.mk();let al=0,rate=1;const ch='ｱｲｳｴｵｶｷｸｹｺ0123456789ABCDEF';
  const col=Array.from({length:cols},(_,i)=>({x:G.x-cell+i*cell,y:G.y-rnd(0,G.h),v:rnd(80,190)*K}));
  S.upd.push(dt=>{tr.save();tr.globalCompositeOperation='destination-out';tr.fillStyle=`rgba(0,0,0,${.12*(.5+rate)})`;tr.fillRect(0,0,W,H);tr.restore();tr.font=`${cell}px monospace`;
    for(const c of col){const ny=c.y+c.v*dt*rate;if(Math.floor(ny/cell)!==Math.floor(c.y/cell)){tr.fillStyle='rgba(60,255,110,.55)';tr.fillText(pick(ch),c.x,c.y);tr.fillStyle='#d8ffe4';tr.fillText(pick(ch),c.x,ny)}c.y=ny;if(c.y>G.y+G.h+cell*3)c.y=G.y-rnd(0,cell*6)}});
  S.drw.push(c=>{if(al<=0)return;S.masked(t=>{t.fillStyle='rgba(0,10,2,.85)';t.fillRect(0,0,W,H);t.drawImage(trail,0,0,W,H)},al);S.blit(S.blur(S.tint('rgb(60,255,110)',S.ring(1.5*K)),3*K),.5*al,'lighter')});
  await lead(S);await S.tw(900,k=>al=k);await S.wait(4200);await S.tw(1000,k=>{rate=1-k*.8;al=1-k})}});

/* 12 · slime pours over the letter and drips off it */
fx('slime',{kind:'char',who:who({clean:3,motion:3}),async run(S,a){
  const {G,K,W,H}=S;let p=0,spawned=new Set();const dr=[];for(let x=0;x<W;x+=2)dr[x/2]=fbm(x*.07,3)*60*K;
  const bot=[];for(let x=0;x<W;x+=2){let h=false;for(let y=G.y+G.h*.7;y<G.y+G.h;y+=3)if(S.on(x,y)){h=true;break}bot[x/2]=h}
  S.drw.push(c=>{if(p<=0)return;const front=x=>G.y-12+p*(G.h+30+dr[x/2]);
    S.masked(t=>{const g=t.createLinearGradient(0,G.y,0,G.y+G.h);g.addColorStop(0,'rgba(150,255,90,.95)');g.addColorStop(1,'rgba(40,175,50,.95)');t.fillStyle=g;for(let x=0;x<W;x+=2)t.fillRect(x,G.y-12,2.2,Math.max(0,front(x)-(G.y-12)));
      t.fillStyle='rgba(255,255,255,.35)';for(let x=0;x<W;x+=14)t.fillRect(x+3,G.y-12,3,Math.max(0,front(x)-(G.y-12))*.7)});
    c.save();c.fillStyle='rgba(70,200,60,.97)';for(let x=0;x<W;x+=2){if(!bot[x/2])continue;const f=front(x),b=G.y+G.h;if(f>b+1){c.fillRect(x,b-1,2.2,f-b);if(dr[x/2]>35*K&&f>b+30)c.beginPath(),c.arc(x+1,f,3.2*K,0,TAU),c.fill()}}c.restore();
    for(let x=0;x<W;x+=2){const f=front(x);if(bot[x/2]&&dr[x/2]>48*K&&f>G.y+G.h+dr[x/2]*.9&&!spawned.has(x)){spawned.add(x);S.spawn({type:'dot',x:x+1,y:f,vy:30,g:900*K,life:1,size:3.6*K,col:'80,215,70',shrink:false})}}});
  await lead(S);S.follow(()=>({x:G.cx,y:G.y-S.pad*.4}),9);await S.tw(3000,k=>p=ease(k));await S.wait(1300);await S.tw(1500,k=>p=1-ease(k)*.97);p=0}});

/* 13 · lava cracks glow through cooling rock */
fx('magma',{kind:'char',who:who({motion:4,polish:2}),async run(S,a){
  const {G,K,W,H}=S,V=S.vor(13),imp=V.seeds.reduce((b,s)=>Math.hypot(s.x-G.cx,s.y-G.cy)<Math.hypot(b.x-G.cx,b.y-G.cy)?s:b,V.seeds[0]);
  let R=0,heat=0,rock=0;V.edges.forEach(e=>e.d=Math.hypot(e.x-imp.x,e.y-imp.y));const maxD=Math.max(...V.edges.map(e=>e.d));const glow=S.blur(S.tint('rgb(255,110,30)'),8*K);
  S.upd.push(()=>{if(heat>.3&&Math.random()<.5){const e=pick(V.edges);if(e.d<R)S.spawn({type:'glow',add:true,x:e.x,y:e.y,vx:rnd(-12,12),vy:-rnd(30,90)*K,life:rnd(.8,1.5),size:rnd(7,14)*K,col:'255,150,50'})}});
  S.drw.push(c=>{if(rock>0)S.masked(t=>{t.fillStyle=`rgba(26,18,16,${.82*rock})`;t.fillRect(0,0,W,H);for(let i=0;i<5;i++){t.fillStyle=`rgba(50,36,30,${.35*rock})`;t.beginPath();t.arc(G.x+fbm(i,1)*G.w,G.y+fbm(1,i)*G.h,22*K,0,TAU);t.fill()}});
    c.save();c.globalCompositeOperation='lighter';
    for(const e of V.edges){if(e.d>R)continue;const h=heat*(.7+.3*fbm(e.x*.08,S.t*2));c.fillStyle=`rgba(255,${Math.round(90+120*h)},${Math.round(20+90*h*h)},${Math.min(1,h)})`;c.fillRect(e.x-1.5,e.y-1.5,3,3);c.fillStyle=`rgba(255,120,30,${h*.2})`;c.fillRect(e.x-4,e.y-4,8,8)}
    c.restore();S.blit(glow,heat*.55*(.8+.2*Math.sin(S.t*5)),'lighter')});
  await lead(S);S.follow(()=>({x:imp.x-18*K,y:imp.y-S.pad*.35}),9);await S.tw(500,k=>rock=k);S.flash=.8;S.shake=1;dirPulse(S,imp.x,imp.y,30,'255,170,70',420);heat=1;await S.tw(1400,k=>R=maxD*ease(k));await S.wait(2400);await S.tw(1800,k=>{heat=1-k});await S.tw(600,k=>rock=1-k)}});

/* 14 · the letter turns into a faceted gem that flashes */
fx('crystal',{kind:'char',who:who({polish:5,qa:2}),async run(S,a){
  const {G,K,W,H}=S,V=S.vor(14),hue0=rnd(190,300);let al=0,ang=-3;
  const facets=V.cells.map((c,i)=>{const [f,x]=S.mk();x.drawImage(c.cv,0,0,W,H);x.globalCompositeOperation='source-in';const g=x.createLinearGradient(c.cx-20,c.cy-20,c.cx+20,c.cy+20);const h=hue0+rnd(-40,40);g.addColorStop(0,`hsl(${h},85%,${rnd(72,88)}%)`);g.addColorStop(1,`hsl(${h+20},80%,${rnd(34,52)}%)`);x.fillStyle=g;x.fillRect(0,0,W,H);return f});
  const whites=V.cells.map(c=>S.tint('#ffffff',c.cv));
  S.drw.push(c=>{if(al<=0)return;facets.forEach(f=>S.blit(f,al));
    V.cells.forEach((cl,i)=>{const b=Math.max(0,Math.cos(ang-Math.atan2(cl.cy-G.cy,cl.cx-G.cx))-.55)*2.2;if(b>.05){S.blit(whites[i],b*.75*al,'lighter');if(b>.6)S.star(c,cl.cx,cl.cy,10*K*b,b*al)}});
    c.save();c.globalCompositeOperation='lighter';c.fillStyle=`rgba(255,255,255,${.85*al})`;for(const e of V.edges)c.fillRect(e.x-.7,e.y-.7,1.4,1.4);c.restore()});
  await lead(S);await S.tw(900,k=>al=k);S.follow(()=>({x:G.cx+Math.cos(ang)*G.w*.9,y:G.cy+Math.sin(ang)*G.h*.8}),7);await S.tw(4200,k=>ang=-3+k*TAU*2);await S.tw(900,k=>al=1-k)}});

/* 15 · a laser raster-engraves the letter */
fx('laser',{kind:'char',who:who({qa:4,layout:3,polish:1}),async run(S,a){
  const {G,K,W,H}=S,[etch,ex]=S.mk(),[hot,hx]=S.mk(),rows=Math.max(10,Math.round(G.h/(2.6*K)));let t01=0,beam=null,al=1,prev=null;
  S.upd.push(dt=>{hx.save();hx.globalCompositeOperation='destination-out';hx.fillStyle=`rgba(0,0,0,${Math.min(1,dt*2.2)})`;hx.fillRect(0,0,W,H);hx.restore();
    if(beam){const rf=t01*rows,row=Math.min(rows-1,Math.floor(rf)),f=rf-row,x=G.x+(row%2?1-f:f)*G.w,y=G.y+(row+.5)/rows*G.h;const q={x,y};
      if(prev&&S.on(x,y)){for(const [cx2,st,w] of [[ex,'rgba(60,8,8,.6)',1.8],[hx,'rgba(255,90,40,.95)',2.4]]){cx2.strokeStyle=st;cx2.lineWidth=w*K;cx2.beginPath();cx2.moveTo(prev.x,prev.y);cx2.lineTo(x,y);cx2.stroke()}
        for(let i=0;i<2;i++)S.spawn({type:'spark',x,y,vx:rnd(-220,220)*K,vy:-rnd(30,260)*K,g:700*K,life:rnd(.2,.5),size:1.4,col:'255,200,120',add:true})}
      prev=q;beam=q}});
  S.drw.push(c=>{S.masked(t=>{t.drawImage(etch,0,0,W,H)},al);S.masked(t=>{t.drawImage(hot,0,0,W,H)},1,'lighter');
    if(beam){const q=S.cur();c.save();c.globalCompositeOperation='lighter';c.lineCap='round';
      for(const [w2,al2] of [[7,.18],[3,.5],[1.2,1]]){c.strokeStyle=`rgba(255,${w2>2?60:210},${w2>2?40:190},${al2})`;c.lineWidth=w2*K;c.beginPath();c.moveTo(q.x,q.y);c.lineTo(beam.x,beam.y);c.stroke()}c.restore();S.star(c,beam.x,beam.y,14*K,1)}});
  await lead(S);S.follow(()=>({x:G.x-S.pad*.45,y:G.y-S.pad*.4}),6);beam={x:G.x,y:G.y};await S.tw(3600,k=>t01=k*.999);beam=null;await S.wait(1200);await S.tw(1200,k=>al=1-k)}});

/* 16 · thread is stitched across the letter */
fx('embroidery',{kind:'char',who:who({polish:4,motion:2,layout:2}),async run(S,a){
  const {G,K,W,H}=S,[thread,tx2]=S.mk(),colr=pick(['#e8b422','#d8323c','#3aa0e0','#e6e6e6']),sp=3.4*K,ang=.62,cs=Math.cos(ang),sn=Math.sin(ang);let u=0,al=1,stitched=0;
  const diag=Math.hypot(G.w,G.h)+20,n=Math.ceil(diag/sp);const lines=[];
  for(let i=0;i<n;i++){const o=(i-n/2)*sp,cx=G.cx-sn*o,cy=G.cy+cs*o,h=diag/2;lines.push({x0:cx-cs*h,y0:cy-sn*h,x1:cx+cs*h,y1:cy+sn*h,flip:i%2})}
  const segDraw=(l,f)=>{const [xa,ya,xb,yb]=l.flip?[l.x1,l.y1,l.x0,l.y0]:[l.x0,l.y0,l.x1,l.y1],x=lerp(xa,xb,f),y=lerp(ya,yb,f);tx2.lineCap='round';
    tx2.strokeStyle='rgba(0,0,0,.35)';tx2.lineWidth=2.2*K;tx2.beginPath();tx2.moveTo(xa+1,ya+1.4);tx2.lineTo(x+1,y+1.4);tx2.stroke();
    tx2.strokeStyle=colr;tx2.lineWidth=2.1*K;tx2.beginPath();tx2.moveTo(xa,ya);tx2.lineTo(x,y);tx2.stroke();
    tx2.strokeStyle='rgba(255,255,255,.4)';tx2.lineWidth=.7*K;tx2.beginPath();tx2.moveTo(xa-.5,ya-.7);tx2.lineTo(x-.5,y-.7);tx2.stroke()};
  let drawn=0;
  S.upd.push(()=>{const t=u*n;while(drawn<Math.floor(t)){segDraw(lines[drawn],1);drawn++}});
  S.drw.push(c=>{S.masked(t=>{t.drawImage(thread,0,0,W,H)},al);const i=Math.min(n-1,Math.floor(u*n));if(u>0&&u<1){const l=lines[i],f=u*n-i,[xa,ya,xb,yb]=l.flip?[l.x1,l.y1,l.x0,l.y0]:[l.x0,l.y0,l.x1,l.y1];c.save();c.strokeStyle=colr;c.lineWidth=2.1*K;c.lineCap='round';c.beginPath();c.moveTo(xa,ya);c.lineTo(lerp(xa,xb,f),lerp(ya,yb,f));c.stroke();c.restore()}});
  await lead(S);S.follow(()=>{const t=u*n,i=Math.min(n-1,Math.floor(t)),l=lines[i],f=t-i,[xa,ya,xb,yb]=l.flip?[l.x1,l.y1,l.x0,l.y0]:[l.x0,l.y0,l.x1,l.y1];return{x:lerp(xa,xb,f),y:lerp(ya,yb,f)}},12);
  await S.tw(4200,k=>u=k*.999);for(let i=drawn;i<n;i++)segDraw(lines[i],1);u=1;S.follow(()=>({x:G.x+G.w+S.pad*.4,y:G.cy}),7);await S.wait(900);
  for(let i=0;i<8;i++){const p=S.rp();S.spawn({type:'glow',add:true,x:p.x,y:p.y,size:rnd(8,14)*K,col:'255,245,200',life:.6})}await S.wait(900);await S.tw(1000,k=>al=1-k)}});

/* 17 · disco ball lights wash over the letter */
fx('disco',{kind:'word',who:who({polish:4,motion:3}),async run(S,a){
  const {G,K,W,H}=S;let al=0;const tiles=[];const ts=Math.max(5,6*K);for(let y=G.y;y<G.y+G.h;y+=ts)for(let x=G.x;x<G.x+G.w;x+=ts)tiles.push({x,y,p:Math.random()*TAU});
  S.drw.push(c=>{if(al<=0)return;S.masked(t=>{t.fillStyle='rgba(8,6,22,.5)';t.fillRect(0,0,W,H);t.globalCompositeOperation='lighter';
    for(let i=0;i<5;i++){const x=G.cx+Math.cos(S.t*.9+i*1.7)*G.w*.5,y=G.cy+Math.sin(S.t*1.2+i*2.3)*G.h*.5,r=Math.max(40*K,G.h*.7),g=t.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`hsla(${(S.t*70+i*72)%360},95%,60%,.8)`);g.addColorStop(1,'hsla(0,0%,0%,0)');t.fillStyle=g;t.fillRect(0,0,W,H)}
    for(const k of tiles){const b=Math.pow(Math.max(0,Math.sin(S.t*3+k.p)),6);if(b>.15){t.fillStyle=`hsla(${(k.x*2+S.t*120)%360},100%,70%,${b*.9})`;t.fillRect(k.x,k.y,ts-1,ts-1)}}},al);
    if(Math.random()<.5){const p=S.rp();S.star(c,p.x,p.y,rnd(5,11)*K,al*.9)}});
  await lead(S);S.follow(()=>({x:G.cx+Math.sin(S.t*1.4)*G.w*.3,y:G.y-S.pad*.45}),6);await S.tw(800,k=>al=k);await S.wait(4600);await S.tw(900,k=>al=1-k)}});

/* 18 · an iridescent soap bubble forms around the letter and pops */
fx('bubble',{kind:'word',who:who({motion:3,clean:4,polish:2}),async run(S,a){
  const {G,K,W,H}=S,R0=Math.hypot(G.w,G.h)/2+22*K;let r=0,pop=false,wob=0;
  S.upd.push(()=>{if(!r&&!pop)return;if(r>R0*.3&&!pop&&Math.random()<.5){const q=S.cur();S.spawn({type:'smoke',x:q.x,y:q.y,vx:(G.cx-q.x)*.6,vy:(G.cy-q.y)*.6,life:.6,size:8*K,grow:1,col:'230,240,255',a:.25})}});
  S.drw.push(c=>{if(pop||r<=1)return;const sx=1+Math.sin(S.t*5)*.035*wob,sy=1-Math.sin(S.t*5)*.035*wob;c.save();c.translate(G.cx,G.cy);c.scale(sx,sy);
    const g=c.createRadialGradient(0,0,r*.55,0,0,r);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.75,`hsla(${(S.t*60)%360},90%,75%,.1)`);g.addColorStop(1,`hsla(${(S.t*60+120)%360},90%,75%,.35)`);c.fillStyle=g;c.beginPath();c.arc(0,0,r,0,TAU);c.fill();
    const cg=c.createConicGradient?c.createConicGradient(S.t*.8,0,0):null;
    if(cg){for(let i=0;i<=6;i++)cg.addColorStop(i/6,`hsla(${i*60+S.t*40},95%,72%,.55)`);c.strokeStyle=cg}else c.strokeStyle='rgba(200,230,255,.5)';c.lineWidth=5*K;c.beginPath();c.arc(0,0,r-2,0,TAU);c.stroke();
    c.strokeStyle='rgba(255,255,255,.85)';c.lineWidth=3*K;c.lineCap='round';c.beginPath();c.arc(0,0,r*.84,Math.PI*1.12,Math.PI*1.38);c.stroke();c.lineWidth=1.6*K;c.beginPath();c.arc(0,0,r*.84,Math.PI*.08,Math.PI*.2);c.stroke();c.restore()});
  await lead(S);S.follow(()=>({x:G.x-S.pad*.45,y:G.cy}),9);await S.tw(1500,k=>{r=R0*ease(k)*(1+Math.sin(k*9)*.06*(1-k));wob=k});await S.wait(2400);
  S.follow(()=>({x:G.cx+R0*Math.cos(-2.2),y:G.cy+R0*Math.sin(-2.2)}),11);await S.wait(900);pop=true;S.flash=.35;if(window.__sfx)__sfx.play('pop');const px=G.cx+R0*Math.cos(-2.2),py=G.cy+R0*Math.sin(-2.2);
  for(let i=0;i<70;i++){const an=rnd(0,TAU);S.spawn({type:'dot',add:true,x:G.cx+Math.cos(an)*R0,y:G.cy+Math.sin(an)*R0,vx:Math.cos(an)*rnd(60,260)*K,vy:Math.sin(an)*rnd(60,260)*K,g:500*K,life:rnd(.5,1),size:rnd(1,2.4)*K,col:'210,235,255',drag:.8})}
  S.spawn({type:'ring',x:G.cx,y:G.cy,size:R0*1.2,col:'255,255,255',life:.5,lw:2,add:true});await S.wait(1500)}});

/* 19 · the letter inflates into a glossy balloon, floats, and bursts */
fx('balloon',{kind:'char',who:who({motion:4,polish:3}),replace:true,async run(S,a){
  const {G,K,W,H}=S,bc=pick(['#ff3b4a','#3b9cff','#ffb020','#34d399','#c084fc']);let sc=0,bob=0,popped=false,back=0;
  const [bal,bx]=S.mk();const grad=bx.createRadialGradient(G.x+G.w*.3,G.y+G.h*.28,2,G.cx,G.cy,Math.max(G.w,G.h)*.8);grad.addColorStop(0,'rgba(255,255,255,.95)');grad.addColorStop(.2,bc);grad.addColorStop(1,'rgba(20,0,10,.95)');
  bx.fillStyle=bc;bx.fillRect(0,0,W,H);bx.fillStyle=grad;bx.fillRect(0,0,W,H);bx.globalCompositeOperation='destination-in';bx.drawImage(S.mask,0,0,W,H);
  const rim=(()=>{const [r,x]=S.mk();x.drawImage(S.mask,0,0,W,H);x.globalCompositeOperation='destination-out';x.drawImage(S.mask,2.2*K,2.2*K,W,H);return S.tint('rgba(255,255,255,.85)',r)})();bx.globalCompositeOperation='source-over';bx.drawImage(rim,0,0,W,H);
  S.drw.push(c=>{if(back>0){S.drawGlyph(c,{sx:back,sy:back,al:1});return}if(popped)return;const y=Math.sin(S.t*2.4)*5*K*bob-bob*S.pad*.12;
    const wob=1+Math.sin(S.t*7)*.02*bob;S.drawGlyph(c,{src:bal,sx:sc*wob,sy:sc/wob,y,px:G.cx,py:G.y+G.h*.9});
    const q=S.cur();c.save();c.strokeStyle='rgba(235,235,235,.8)';c.lineWidth=1.2;c.beginPath();c.moveTo(G.cx,G.y+G.h*.9+y+(sc-1)*G.h*.1);c.quadraticCurveTo(G.cx+Math.sin(S.t*2)*14*K,(G.y+G.h+q.y)/2,q.x,q.y);c.stroke();c.fillStyle=bc;c.beginPath();c.moveTo(G.cx-3,G.y+G.h*.9+y+sc*4);c.lineTo(G.cx+3,G.y+G.h*.9+y+sc*4);c.lineTo(G.cx,G.y+G.h*.9+y+sc*9);c.fill();c.restore()});
  await lead(S);S.follow(()=>({x:G.cx+G.w*.3,y:G.y+G.h+S.pad*.55}),7);await S.tw(1500,k=>{sc=ease(k)*1.12+Math.sin(k*10)*.05*(1-k);bob=k});await S.wait(2400);
  S.follow(()=>({x:G.cx,y:G.cy-G.h*.2}),13);await S.wait(700);popped=true;S.flash=.7;S.shake=1;if(window.__sfx)__sfx.play('pop');const cols=[bc,'#ffffff'];
  for(let i=0;i<130;i++){const p=S.rp();S.spawn({type:'conf',x:p.x,y:p.y,vx:(p.x-G.cx)*rnd(2,6)+rnd(-60,60),vy:(p.y-G.cy)*rnd(2,6)-rnd(0,120),g:520*K,drag:.6,life:rnd(.8,1.5),size:rnd(4,9)*K,css:pick(cols),rot:rnd(0,TAU),vr:rnd(-14,14)})}
  S.spawn({type:'ring',x:G.cx,y:G.cy,size:90*K,col:'255,255,255',life:.5,lw:3,add:true});await S.wait(700);await S.tw(420,k=>back=1.35-.35*ease(k));back=0;await S.wait(100)}});

/* 20 · a pixelation wave sweeps across the word and back */
fx('pixelate',{kind:'word',who:who({qa:4,layout:3}),replace:true,async run(S,a){
  const {G,K,W,H}=S;let wave=-.1,px=14*K;const [small,sx]=S.mk();
  const pix=(clip,size)=>{const w=Math.max(1,Math.round(W/size)),h=Math.max(1,Math.round(H/size));small.width=w;small.height=h;sx.setTransform(1,0,0,1,0,0);sx.clearRect(0,0,w,h);sx.drawImage(S.glyph,0,0,W,H,0,0,w,h);
    const c=S.ctx;c.save();c.beginPath();c.rect(clip[0],0,clip[1]-clip[0],H);c.clip();c.imageSmoothingEnabled=false;c.drawImage(small,0,0,w,h,0,0,W,H);c.restore()};
  let dir=1;
  S.drw.push(c=>{const wx=G.x+wave*G.w;if(dir===1){pix([0,wx],px);c.save();c.beginPath();c.rect(wx,0,W,H);c.clip();c.drawImage(S.glyph,0,0,W,H);c.restore()}else{pix([wx,W],px);c.save();c.beginPath();c.rect(0,0,wx,H);c.clip();c.drawImage(S.glyph,0,0,W,H);c.restore()}
    c.save();c.globalCompositeOperation='lighter';const g=c.createLinearGradient(wx-6,0,wx+6,0);g.addColorStop(0,'rgba(120,220,255,0)');g.addColorStop(.5,'rgba(160,240,255,.9)');g.addColorStop(1,'rgba(120,220,255,0)');c.fillStyle=g;c.fillRect(wx-6,G.y-8,12,G.h+16);c.restore();
    if(Math.random()<.6)S.spawn({type:'sq',x:wx+rnd(-5,5),y:rnd(G.y,G.y+G.h),vx:rnd(-40,80)*dir,vy:rnd(-60,60),life:.6,size:rnd(3,8)*K,css:pick(['#46e6ff','#ff3b6b','#ffe14a','#ffffff'])})});
  await lead(S);S.follow(()=>({x:G.x+G.w*wave,y:G.y-S.pad*.35}),12);await S.tw(2200,k=>wave=-.1+1.2*ease(k));await S.wait(900);dir=-1;wave=1.1;px=14*K;S.follow(()=>({x:G.x+G.w*wave,y:G.y-S.pad*.35}),12);await S.tw(2000,k=>wave=1.1-1.2*ease(k));wave=-.2;dir=1;px=1}});

/* 21 · the letter turns to dust and blows away, then reforms */
fx('snap',{kind:'char',who:who({motion:4,polish:3}),replace:true,async run(S,a){
  const {G,K,W,H}=S,pts=S.pts(),N=Math.min(1300,Math.round(pts.length/5)),gr=[];let wave=-.2,mode='out';
  for(let i=0;i<N;i++){const p=pts[Math.floor(rnd(0,pts.length))];gr.push({hx:p.x,hy:p.y,x:p.x,y:p.y,vx:0,vy:0,rot:0,vr:rnd(-5,5),s:rnd(1.4,3.2)*Math.max(.8,K),col:S.colAt(p.x,p.y),st:0,al:1,d:(p.x-G.x)/G.w+rnd(-.12,.12),u:0,sx:0,sy:0,cv:rnd(-.8,.8)})}
  S.upd.push(dt=>{for(const g of gr){
    if(mode==='out'){if(g.st===0&&g.d<=wave){g.st=1;g.vx=rnd(30,150)*K;g.vy=rnd(-110,-20)*K}
      if(g.st===1){g.vx+=(fbm(g.x*.03,g.y*.03+S.t)-.5)*500*dt+160*dt;g.vy+=(fbm(g.y*.03,g.x*.03)-.5)*300*dt-70*dt;g.x+=g.vx*dt;g.y+=g.vy*dt;g.rot+=g.vr*dt;g.al=Math.max(0,g.al-dt*.5)}}
    else{if(g.st!==2&&g.d<=wave){g.st=2;g.u=0;g.sx=g.hx+rnd(120,320)*K;g.sy=g.hy+rnd(-120,40)*K}
      if(g.st===2&&g.u<1){g.u=Math.min(1,g.u+dt*1.5);const e=ease(g.u);g.x=lerp(g.sx,g.hx,e)+Math.sin(g.u*Math.PI)*g.cv*40*K;g.y=lerp(g.sy,g.hy,e)-Math.sin(g.u*Math.PI)*24*K;g.al=Math.min(1,g.u*2.5);g.rot+=g.vr*dt}}}});
  S.drw.push(c=>{c.save();c.beginPath();if(mode==='out')c.rect(G.x+wave*G.w,0,W,H);else c.rect(0,0,G.x+wave*G.w,H);c.clip();c.drawImage(S.glyph,0,0,W,H);c.restore();
    for(const g of gr){if(g.st===0||g.al<=0||(g.st===2&&g.u>=1))continue;c.globalAlpha=g.al;c.fillStyle=g.col;c.save();c.translate(g.x,g.y);c.rotate(g.rot);c.fillRect(-g.s/2,-g.s/2,g.s,g.s);c.restore()}c.globalAlpha=1});
  await lead(S);S.follow(()=>({x:G.x+G.w*Math.max(wave,0)-8,y:G.cy}),10);S.flash=.4;await S.tw(2300,k=>wave=-.2+1.4*k);await S.wait(900);
  mode='in';wave=-.2;S.follow(()=>({x:G.x+G.w*Math.max(wave,0)-8,y:G.cy}),10);await S.tw(2000,k=>wave=-.2+1.5*k);await S.wait(500);S.flash=.5;for(let i=0;i<8;i++){const p=S.rp();S.star(S.ctx,p.x,p.y,8*K,1);S.spawn({type:'glow',add:true,x:p.x,y:p.y,size:12*K,col:'255,255,255',life:.6})}await S.wait(500)}});

/* 22 · iron filings answer a magnet and swirl around it */
fx('magnet',{kind:'char',who:who({motion:4,qa:3,layout:2}),replace:true,async run(S,a){
  const {G,K,W,H}=S,pts=S.pts(),N=Math.min(900,Math.round(pts.length/6)),f=[];let mag=0;
  for(let i=0;i<N;i++){const p=pts[Math.floor(rnd(0,pts.length))];f.push({hx:p.x,hy:p.y,x:p.x,y:p.y,vx:0,vy:0,ang:0,len:rnd(3,6)*K,col:S.colAt(p.x,p.y),ph:rnd(0,TAU)})}
  S.upd.push(dt=>{const q=S.cur();for(const g of f){
    if(mag>.02){const dx=q.x-g.x,dy=q.y-g.y,d=Math.hypot(dx,dy)||1,acc=mag*3200/(1+d/(70*K)),sw=mag*(450+120*Math.sin(g.ph));
      g.vx+=(dx/d*acc-dy/d*sw)*dt;g.vy+=(dy/d*acc+dx/d*sw)*dt;g.ang=Math.atan2(dy,dx)}
    else{g.vx+=(g.hx-g.x)*34*dt;g.vy+=(g.hy-g.y)*34*dt}
    const dm=Math.exp(-(mag>.02?3.2:7)*dt);g.vx*=dm;g.vy*=dm;const sp=Math.hypot(g.vx,g.vy);if(sp>900){g.vx*=900/sp;g.vy*=900/sp}g.x+=g.vx*dt;g.y+=g.vy*dt}});
  S.drw.push(c=>{for(const g of f){const m=Math.hypot(g.x-g.hx,g.y-g.hy);if(m<2&&mag<.02){c.fillStyle=g.col;c.fillRect(g.x-1.2,g.y-1.2,2.4,2.4)}
    else{c.strokeStyle=m<2?g.col:'rgba(205,215,230,.95)';c.lineWidth=1.3;c.beginPath();c.moveTo(g.x,g.y);c.lineTo(g.x+Math.cos(g.ang)*g.len,g.y+Math.sin(g.ang)*g.len);c.stroke()}}});
  await lead(S);S.follow(()=>({x:G.cx+G.w*.4+Math.cos(S.t*.5)*10,y:G.y-S.pad*.3}),8);await S.wait(400);await S.tw(1100,k=>mag=ease(k));
  S.follow(()=>({x:G.cx+Math.cos(S.t*1.5)*G.w*.9,y:G.cy+Math.sin(S.t*1.5)*G.h*.7}),5);await S.wait(3600);
  mag=0;S.flash=.3;await S.wait(1800);for(let i=0;i<6;i++){const p=S.rp();S.spawn({type:'glow',add:true,x:p.x,y:p.y,size:10*K,col:'255,255,255',life:.5})}}});

/* 23 · the letter erodes into sand that piles up, then flows back */
fx('sand',{kind:'char',who:who({motion:3,clean:3,polish:2}),replace:true,async run(S,a){
  const {G,K,W,H}=S,pts=S.pts(),N=Math.min(1100,Math.round(pts.length/5)),gr=[],floor=G.y+G.h+S.pad*.42,cw=2,heights=new Float32Array(Math.ceil(W/cw));let front=1.05,phase='fall',ret=0;
  for(let i=0;i<N;i++){const p=pts[Math.floor(rnd(0,pts.length))];gr.push({hx:p.x,hy:p.y,x:p.x,y:p.y,vx:0,vy:0,s:rnd(1.4,2.6)*Math.max(.8,K),col:S.colAt(p.x,p.y),st:0,d:1-(p.y-G.y)/G.h+rnd(-.08,.08),lx:0,ly:0,u:0,sx:0,sy:0})}
  S.upd.push(dt=>{for(const g of gr){
    if(phase==='fall'){if(g.st===0&&g.d<=1-front){g.st=1;g.vx=rnd(-16,16)*K;g.vy=rnd(0,30)}
      if(g.st===1){g.vy+=900*K*dt;g.x+=g.vx*dt;g.y+=g.vy*dt;const ci=Math.floor(g.x/cw);if(g.y>=floor-(heights[ci]||0)){g.st=2;g.lx=g.x;g.ly=g.y;heights[ci]+=1.5;if(heights[ci-1]!==undefined)heights[ci-1]+=.6;if(heights[ci+1]!==undefined)heights[ci+1]+=.6}}}
    else{if(g.st===2&&Math.random()<dt*ret*5){g.st=3;g.u=0;g.sx=g.lx;g.sy=g.ly;const ci=Math.floor(g.lx/cw);heights[ci]=Math.max(0,heights[ci]-1.5)}
      if(g.st===3){g.u=Math.min(1,g.u+dt*1.4);const e=ease(g.u);g.x=lerp(g.sx,g.hx,e)+Math.sin(g.u*Math.PI)*30*K;g.y=lerp(g.sy,g.hy,e)-Math.sin(g.u*Math.PI)*60*K}}}});
  S.drw.push(c=>{const yy=G.y+G.h*(1-front);c.save();c.beginPath();c.rect(0,phase==='fall'?0:0,W,H);c.clip();
    if(phase==='fall'){c.beginPath();c.rect(0,0,W,yy);c.clip();c.drawImage(S.glyph,0,0,W,H)}else{const reb=gr.filter(g=>g.st===3&&g.u>=1).length/gr.length;c.globalAlpha=Math.min(1,reb*1.4);c.drawImage(S.glyph,0,0,W,H)}c.restore();
    const g2=c.createLinearGradient(0,floor-30*K,0,floor+10);g2.addColorStop(0,'#e6c68a');g2.addColorStop(1,'#a8844a');c.fillStyle=g2;c.beginPath();c.moveTo(0,floor+6);for(let i=0;i<heights.length;i++)c.lineTo(i*cw,floor-heights[i]);c.lineTo(W,floor+6);c.fill();
    for(const g of gr){if(g.st===1||g.st===3&&g.u<1){c.fillStyle=g.col;c.fillRect(g.x-g.s/2,g.y-g.s/2,g.s,g.s)}}});
  await lead(S);S.follow(()=>({x:G.x+G.w*.5,y:G.y-S.pad*.3}),7);await S.tw(3000,k=>front=1.05-k*1.15);await S.wait(1400);phase='back';S.follow(()=>({x:G.cx,y:floor-S.pad*.4}),8);await S.tw(2800,k=>ret=k*1.5);await S.wait(900);S.flash=.4}});

/* 24 · a party popper fires confetti and the letter jumps for joy */
fx('confetti',{kind:'char',who:who({polish:4,motion:3}),replace:true,async run(S,a){
  const {G,K}=S;let y=0,vy=0,sq=0,hop=false,rib=[];const pal=['#ff3b6b','#ffe14a','#46e6ff','#7dff6a','#ffffff','#ff9b2e','#c084fc'];
  S.upd.push(dt=>{if(hop){vy+=2600*K*dt;y+=vy*dt;if(y>=0){y=0;if(vy>200){sq=.28;vy=-vy*.35}else{vy=0;hop=false}}}sq*=Math.pow(.01,dt);
    for(const r of rib){r.t+=dt;r.x+=r.vx*dt;r.y+=r.vy*dt;r.vy+=260*K*dt;r.vx*=Math.exp(-1.1*dt);r.h.push({x:r.x,y:r.y});if(r.h.length>26)r.h.shift()}rib=rib.filter(r=>r.t<2.6)});
  S.drw.push(c=>{S.drawGlyph(c,{y,sx:1+sq,sy:1-sq,py:G.y+G.h});S.ctx.save();for(const r of rib){c.strokeStyle=r.c;c.lineWidth=2.2*K;c.globalAlpha=clamp(1.6-r.t/2,0,1);c.beginPath();r.h.forEach((q,i)=>i?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y));c.stroke()}S.ctx.restore()});
  await lead(S);S.follow(()=>({x:G.x-S.pad*.5,y:G.y+G.h+S.pad*.3}),9);await S.wait(600);
  S.flash=.4;S.shake=.8;if(window.__sfx)__sfx.play('tada');const ox2=G.x-S.pad*.5,oy2=G.y+G.h+S.pad*.3;
  for(let i=0;i<190;i++){const an=-Math.PI/4+rnd(-.55,.55),v=rnd(260,760)*K;S.spawn({type:'conf',x:ox2,y:oy2,vx:Math.cos(an)*v,vy:Math.sin(an)*v,g:420*K,drag:1.25,life:rnd(2,3.4),size:rnd(5,10)*K,css:pick(pal),rot:rnd(0,TAU),vr:rnd(-9,9),flip:rnd(6,12)})}
  for(let i=0;i<8;i++){const an=-Math.PI/4+rnd(-.4,.4),v=rnd(300,640)*K;rib.push({x:ox2,y:oy2,vx:Math.cos(an)*v,vy:Math.sin(an)*v,c:pick(pal),h:[],t:0})}
  S.spawn({type:'smoke',x:ox2,y:oy2,size:30*K,grow:1.5,life:.8,col:'255,255,255',a:.4});await S.wait(250);hop=true;vy=-900*K;await S.wait(1800);hop=true;vy=-600*K;await S.wait(3000)}});

/* 25 · the letter drops, squashes and bounces like a rubber ball */
fx('bounce',{kind:'char',who:who({motion:6,layout:2}),replace:true,async run(S,a){
  const {G,K,H}=S;let y=-(S.pad+G.h)*.9,vy=0,sq=0,state='hold',dustN=0;
  S.upd.push(dt=>{if(state==='fall'){vy+=2500*K*dt;y+=vy*dt;if(y>=0){y=0;const im=Math.min(1,vy/1100);if(vy>90){sq=.42*im;vy=-vy*.5;if(window.__sfx)__sfx.play('boing');for(let i=0;i<8;i++)S.spawn({type:'smoke',x:G.cx+rnd(-G.w*.4,G.w*.4),y:G.y+G.h,vx:rnd(-90,90)*K,vy:-rnd(8,40),life:.6,size:rnd(8,14)*K,grow:1.4,col:'200,200,200',a:.3})}else{vy=0;state='done'}}}sq*=Math.pow(.004,dt)});
  S.drw.push(c=>{const h=clamp(-y/(S.pad+G.h),0,1);c.save();c.fillStyle=`rgba(0,0,0,${.4*(1-h)})`;c.beginPath();c.ellipse(G.cx,G.y+G.h+3,G.w*.5*(1-h*.5)+8,5*K,0,0,TAU);c.fill();c.restore();
    if(y<-30)for(const gh of [.5,.25])S.drawGlyph(c,{y:y-vy*.018*(gh*3),sx:1-sq,sy:1+sq,py:G.y+G.h,al:gh*.5});S.drawGlyph(c,{y,sx:1+sq,sy:1-sq,py:G.y+G.h})});
  await lead(S);S.follow(()=>({x:G.cx+G.w*.55,y:G.y+y-12*K}),14);await S.wait(700);state='fall';a.tgt=null;a.go(()=>S.P(G.x+G.w+S.pad*.4,G.y-S.pad*.2),1500);await S.wait(3600)}});

/* 26 · the word sits under rippling water */
fx('ripple',{kind:'word',who:who({clean:4,qa:3,motion:2}),replace:true,async run(S,a){
  const {G,K,W,H}=S;const src=[];let tint=0;
  S.upd.push(()=>{});
  S.drw.push(c=>{const now=S.t;
    for(let y=G.y-6;y<G.y+G.h+6;y+=2){let dx=0,dy=0;for(const r of src){const age=now-r.t;if(age<0||age>3)continue;const d=Math.hypot(G.cx-r.x,y-r.y),ph=d*.09-age*7,env=Math.exp(-age*1.1)*Math.exp(-d*.003);dx+=Math.sin(ph)*9*K*env;dy+=Math.cos(ph)*1.8*K*env}
      c.save();c.beginPath();c.rect(0,y,W,2);c.clip();c.drawImage(S.glyph,dx,dy,W,H);c.restore()}
    S.masked(t=>{t.fillStyle=`rgba(90,170,255,${.25*tint})`;t.fillRect(0,0,W,H);t.globalCompositeOperation='lighter';t.strokeStyle=`rgba(200,240,255,${.35*tint})`;t.lineWidth=1.2;for(let i=0;i<9;i++){t.beginPath();for(let x=0;x<=W;x+=5)t[x?'lineTo':'moveTo'](x,G.y+i*G.h/8+Math.sin(x*.07+S.t*3+i*1.7)*5)}t.stroke()});
    c.save();c.globalCompositeOperation='lighter';for(const r of src){const age=now-r.t;if(age<0||age>2.4)continue;for(let k=0;k<3;k++){c.strokeStyle=`rgba(200,235,255,${.55*Math.exp(-age*1.2)/(1+k)})`;c.lineWidth=1.6;c.beginPath();c.arc(r.x,r.y,Math.max(.1,age*190*K-k*10*K),0,TAU);c.stroke()}}c.restore()});
  await lead(S);await S.tw(500,k=>tint=k);
  for(const [fx_,fy_] of [[.25,.4],[.75,.6],[.5,.2],[.35,.8]]){S.follow(()=>({x:G.x+G.w*fx_,y:G.y+G.h*fy_-S.pad*.25}),11);await S.wait(550);S.follow(()=>({x:G.x+G.w*fx_,y:G.y+G.h*fy_}),20);await S.wait(260);
    src.push({x:G.x+G.w*fx_,y:G.y+G.h*fy_,t:S.t});for(let i=0;i<14;i++)S.spawn({type:'dot',add:true,x:G.x+G.w*fx_,y:G.y+G.h*fy_,vx:rnd(-90,90)*K,vy:-rnd(80,230)*K,g:800*K,life:.6,size:1.8*K,col:'210,235,255'});await S.wait(700)}
  await S.wait(1200);await S.tw(800,k=>tint=1-k)}});

/* 27 · the word waves like a flag in the wind */
fx('flag',{kind:'word',who:who({motion:4,polish:3,layout:2}),replace:true,async run(S,a){
  const {G,K,W,H}=S;let amp=0,wind=0;
  S.upd.push(()=>{if(wind>.2&&Math.random()<.7)S.spawn({type:'spark',x:G.x-S.pad*.6,y:rnd(G.y-20,G.y+G.h+20),vx:rnd(380,700)*wind,vy:rnd(-30,30),life:.5,size:1.2,col:'220,235,255',add:true})});
  S.drw.push(c=>{const sl=[];for(let x=G.x-4;x<G.x+G.w+4;x+=2){const t=(x-G.x)/G.w,A=amp*K*(.15+t*.95),dy=Math.sin(x*.045-S.t*7)*A*8+Math.sin(x*.02-S.t*3.5)*A*5,slope=Math.cos(x*.045-S.t*7)*A*8*.045;sl.push([x,dy,slope]);
      c.save();c.beginPath();c.rect(x,0,2,H);c.clip();c.drawImage(S.glyph,0,dy,W,H);c.restore()}
    S.masked(t=>{for(const [x,dy,sp] of sl){t.fillStyle=sp>0?`rgba(255,255,255,${Math.min(.4,sp*6)*amp})`:`rgba(0,0,0,${Math.min(.45,-sp*6)*amp})`;t.fillRect(x,G.y-30+dy,2,G.h+60)}})});
  await lead(S);S.follow(()=>({x:G.x-S.pad*.6,y:G.cy+Math.sin(S.t*2)*14}),8);wind=1;await S.tw(1200,k=>amp=ease(k));await S.wait(3400);await S.tw(1400,k=>{amp=1-ease(k);wind=1-k});amp=0}});

/* 28 · vines grow through the letter and blossom */
fx('vines',{kind:'char',who:who({clean:3,polish:4}),async run(S,a){
  const {G,K,W,H}=S,E=S.edges().filter(e=>e.ny>0),gs=Array.from({length:7},()=>{const e=pick(E);return{x:e.x,y:e.y,ang:-Math.PI/2+rnd(-.4,.4),path:[{x:e.x,y:e.y}],life:rnd(1.4,2.4),age:0,done:false,seed:rnd(0,99)}});
  const leaves=[],flowers=[];let fade=1,fall=false;
  S.upd.push(dt=>{for(const g of gs){if(g.done)continue;g.age+=dt;const steps=Math.round(dt*90);for(let i=0;i<steps;i++){g.ang+=(fbm(g.seed,g.age*2)-.5)*.32-(Math.sin(g.ang+Math.PI/2))*.01;const nx=g.x+Math.cos(g.ang)*1.7*K,ny=g.y+Math.sin(g.ang)*1.7*K;
        if(!S.on(nx,ny)&&Math.random()<.7){g.ang=Math.atan2(G.cy-g.y,G.cx-g.x)+rnd(-.5,.5);continue}g.x=nx;g.y=ny;g.path.push({x:nx,y:ny});if(g.path.length%11===0)leaves.push({x:nx,y:ny,a:g.ang+(g.path.length%22?1.2:-1.2),s:rnd(5,9)*K,b:S.t})}
      if(g.age>g.life){g.done=true;flowers.push({x:g.x,y:g.y,b:S.t,h:pick([335,45,285,15])})}}
    if(fall&&flowers.length&&Math.random()<.5){const f=pick(flowers);S.spawn({type:'conf',x:f.x,y:f.y,vx:rnd(-40,40),vy:rnd(-30,10),g:90*K,drag:.8,life:2.4,size:rnd(5,8)*K,css:`hsl(${f.h},85%,72%)`,rot:rnd(0,TAU),vr:rnd(-4,4),flip:rnd(3,6)})}});
  S.drw.push(c=>{c.save();c.globalAlpha=fade;c.lineCap='round';c.lineJoin='round';
    for(const g of gs){c.strokeStyle='#245a2a';c.lineWidth=3.2*K;c.beginPath();g.path.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();c.strokeStyle='#6fcf5a';c.lineWidth=1.5*K;c.stroke()}
    for(const l of leaves){const s=l.s*Math.min(1,(S.t-l.b)*3);c.save();c.translate(l.x,l.y);c.rotate(l.a);c.fillStyle='#4eb445';c.beginPath();c.ellipse(s*.7,0,s,s*.45,0,0,TAU);c.fill();c.strokeStyle='#a4f090';c.lineWidth=.8;c.beginPath();c.moveTo(0,0);c.lineTo(s*1.6,0);c.stroke();c.restore()}
    for(const f of flowers){const s=Math.min(1,(S.t-f.b)*1.6),r=8*K*ease(s);c.save();c.translate(f.x,f.y);for(let i=0;i<6;i++){c.rotate(TAU/6);c.fillStyle=`hsl(${f.h},85%,${68+i*2}%)`;c.beginPath();c.ellipse(r*.7,0,r*.8,r*.38,0,0,TAU);c.fill()}c.fillStyle='#ffd23a';c.beginPath();c.arc(0,0,r*.34,0,TAU);c.fill();c.restore()}c.restore()});
  await lead(S);S.follow(()=>({x:G.cx+Math.sin(S.t*.8)*G.w*.5,y:G.y+G.h+S.pad*.25}),5);await S.wait(4200);fall=true;await S.wait(1800);await S.tw(1400,k=>fade=1-k);fall=false}});

/* 29 · the word materializes out of drifting smoke */
fx('smoke',{kind:'word',who:who({polish:4,motion:3,qa:2}),replace:true,async run(S,a){
  const {G,K,W,H}=S,b=Math.max(3,Math.round(4*K));let p=0,puff=1;
  S.upd.push(()=>{for(let i=0;i<Math.round(puff*5);i++){const q=S.rp();S.spawn({type:'smoke',x:q.x,y:q.y,vx:rnd(-20,20)*K,vy:-rnd(20,60)*K,life:rnd(1,1.7),size:rnd(14,26)*K,grow:1.2,col:'190,190,205',a:.22,drag:.5})}});
  S.drw.push(c=>{for(let y=G.y;y<G.y+G.h;y+=b)for(let x=G.x;x<G.x+G.w;x+=b){if(!S.on(x+b/2,y+b/2))continue;const n=fbm(x*.04,y*.04),al=clamp((p*1.7-n*.95)*3,0,1);if(al>0){c.globalAlpha=al;c.drawImage(S.glyph,Math.round(x*S.dpr),Math.round(y*S.dpr),b*S.dpr,b*S.dpr,x,y,b,b)}}c.globalAlpha=1});
  await lead(S);S.follow(()=>({x:G.x+G.w*(.5+.5*Math.sin(S.t*1.2)),y:G.cy-S.pad*.1}),6);await S.tw(3200,k=>p=ease(k));S.flash=.35;await S.tw(1400,k=>puff=1-k);await S.wait(500)}});

/* 30 · a radar sweep pings the outline of the word */
fx('radar',{kind:'word',who:who({qa:6}),async run(S,a){
  const {G,K,W,H}=S,E=S.edges(),R=Math.hypot(G.w,G.h)/2+30*K;let ang=0,al=0;const seen=new Float32Array(E.length);
  E.forEach(e=>e.a=Math.atan2(e.y-G.cy,e.x-G.cx));
  S.upd.push(dt=>{const prev=ang;for(let i=0;i<E.length;i++){let d=((ang-E[i].a)%TAU+TAU)%TAU;if(d<dt*5.5)seen[i]=1;seen[i]=Math.max(0,seen[i]-dt*.5)}});
  S.drw.push(c=>{if(al<=0)return;c.save();c.globalAlpha=al;c.translate(G.cx,G.cy);c.strokeStyle='rgba(80,255,150,.3)';c.lineWidth=1;for(let i=1;i<=3;i++){c.beginPath();c.arc(0,0,R*i/3,0,TAU);c.stroke()}c.beginPath();c.moveTo(-R,0);c.lineTo(R,0);c.moveTo(0,-R);c.lineTo(0,R);c.stroke();
    c.globalCompositeOperation='lighter';for(let i=0;i<46;i++){c.fillStyle=`rgba(80,255,150,${.22*(1-i/46)})`;c.beginPath();c.moveTo(0,0);c.arc(0,0,R,ang-i*.026-.026,ang-i*.026);c.fill()}
    c.strokeStyle='rgba(180,255,210,.95)';c.lineWidth=2;c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(ang)*R,Math.sin(ang)*R);c.stroke();c.restore();
    c.save();c.globalAlpha=al;c.globalCompositeOperation='lighter';for(let i=0;i<E.length;i++){const s=seen[i];if(s>.02){c.fillStyle=`rgba(120,255,170,${s})`;c.fillRect(E[i].x-1.3,E[i].y-1.3,2.6,2.6);if(s>.9&&Math.random()<.03)S.star(c,E[i].x,E[i].y,7*K,1)}}c.restore()});
  await lead(S);S.follow(()=>({x:G.cx+Math.cos(ang)*R*.8,y:G.cy+Math.sin(ang)*R*.8}),8);await S.tw(700,k=>al=k);await S.tw(5200,k=>ang=k*TAU*2.3);await S.tw(900,k=>al=1-k)}});

C.kit={makeStage,targets,fx,lead};
/* the two older showcase scenes use the same big-letter targets as the new ones */
for(const id of ['cleanU','shatterFix']){const act=C.A.find(x=>x.id===id);
  if(act)act.pick=()=>{if(C.isBusy()||(window.__fxHold&&!window.__fxManual)||!C.gapOK())return null;const t=targets('char');return t&&{c:t.chars[0],el:t.el}}}
/* ---------- Animations menu: play any scene, game or effect on demand ---------- */
(()=>{
  const {agents,A,wait}=C;
  const st=document.createElement('style');
  st.textContent=`#animMenu{position:fixed;right:16px;bottom:64px;z-index:130;width:min(300px,calc(100vw - 32px));max-height:min(64vh,540px);overflow:auto;background:rgba(14,14,14,.97);border:1px solid #333;border-radius:14px;padding:8px;backdrop-filter:blur(10px);display:none;box-shadow:0 20px 60px rgba(0,0,0,.6)}
#animMenu.open{display:block}
#animMenu h5{font:500 11px 'JetBrains Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:#ff2d2d;margin:10px 8px 6px}
#animMenu h5:first-child{margin-top:4px}
#animMenu button{display:block;width:100%;text-align:left;background:none;border:0;color:#e8e8e8;font:500 13px Inter,sans-serif;padding:8px 10px;border-radius:8px;cursor:pointer}
#animMenu button:hover,#animMenu button:focus-visible{background:#1f1f1f;outline:none}
#fxToast{position:fixed;left:50%;bottom:76px;transform:translateX(-50%);z-index:140;background:rgba(14,14,14,.95);border:1px solid #333;color:#fff;font:500 13px Inter,sans-serif;padding:9px 16px;border-radius:999px;opacity:0;pointer-events:none;transition:opacity .25s;max-width:calc(100vw - 32px);text-align:center}
#fxToast.show{opacity:1}`;
  document.head.appendChild(st);
  const BIG={cleanU:'Cleaning: spray, foam, polish',shatterFix:'Shatter, repair & weld',fx_frost:'Frost & thaw',fx_fire:'Fire & ash',fx_lightning:'Lightning strike',fx_neon:'Neon tube',fx_glitch:'RGB glitch',fx_hologram:'Hologram',fx_liquid:'Liquid fill',fx_ink:'Ink bloom',fx_gold:'Gold leaf',fx_galaxy:'Galaxy window',fx_matrix:'Digital rain',fx_slime:'Slime pour',fx_magma:'Magma cracks',fx_crystal:'Crystal gem',fx_laser:'Laser engraving',fx_embroidery:'Embroidery',fx_disco:'Disco lights',fx_bubble:'Soap bubble',fx_balloon:'Balloon & pop',fx_pixelate:'Pixel wave',fx_snap:'Dust & reform',fx_magnet:'Iron filings',fx_sand:'Sand erosion',fx_confetti:'Confetti popper',fx_bounce:'Rubber bounce',fx_ripple:'Water ripples',fx_flag:'Flag wave',fx_vines:'Vines & flowers',fx_smoke:'Smoke reveal',fx_radar:'Radar sweep'};
  const PLAY={play_tag:'Tag with your mouse',play_snake:'Follow the leader',play_catchme:'Catch me',play_keepy:'Keepy-uppy ball',play_dance:'Dance floor',play_race:'Cursor race',play_band:'Letter band',play_rps:'Rock-paper-scissors',play_hide:'Hide and seek',play_hunt:'Letter hunt',play_tug:'Tug of war',play_domino:'Domino letters',play_moving:'Moving day',play_resume:'Peek at the résumé',play_sleepy:'Sleepy time (also: keep your mouse still)',play_dizzy:'Dizzy cursors (also: scroll very fast)',play_parade:'Parade (also: Konami code)',play_hello:'Say hello (also: type hello)'};
  const pretty=id=>id.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase());
  const label=id=>BIG[id]||PLAY[id]||pretty(id);
  const ui=document.getElementById('ui'),btn=document.createElement('button');
  btn.type='button';btn.id='anim';btn.setAttribute('aria-haspopup','true');btn.setAttribute('aria-expanded','false');btn.textContent='✦ All animations ▾';
  ui.insertBefore(btn,ui.firstChild);
  const menu=document.createElement('div');menu.id='animMenu';menu.setAttribute('role','menu');document.body.appendChild(menu);
  const toastEl=document.createElement('div');toastEl.id='fxToast';document.body.appendChild(toastEl);
  let tt=0;const toast=m=>{toastEl.textContent=m;toastEl.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>toastEl.classList.remove('show'),2800)};
  const close=()=>{menu.classList.remove('open');btn.setAttribute('aria-expanded','false')};
  const add=(h,ids)=>{if(!ids.length)return;const e=document.createElement('h5');e.textContent=`${h} (${ids.length})`;menu.appendChild(e);
    for(const id of ids){const b=document.createElement('button');b.type='button';b.setAttribute('role','menuitem');b.textContent=label(id);b.addEventListener('click',()=>{close();play(id)});menu.appendChild(b)}};
  const addBtn=(txt,fn,hot)=>{const b=document.createElement('button');b.type='button';b.setAttribute('role','menuitem');b.textContent=txt;if(hot)b.style.color='#ff7a7a';b.addEventListener('click',()=>{close();fn()});menu.appendChild(b)};
  const head=txt=>{const e=document.createElement('h5');e.textContent=txt;menu.appendChild(e)};
  let touring=false,stopFlag=false;
  const allIds=()=>{const ids=A.map(x=>x.id).filter(id=>id!=='fix');return[...Object.keys(BIG).filter(i=>ids.includes(i)),...Object.keys(PLAY).filter(i=>ids.includes(i)),...ids.filter(i=>!BIG[i]&&!PLAY[i])]};
  async function tour(){if(touring)return;touring=true;stopFlag=false;const ids=allIds();
    for(let i=0;i<ids.length&&!stopFlag;i++){toast(`Tour ${i+1}/${ids.length}: ${label(ids[i])}`);await play(ids[i],true);await wait(1500)}
    touring=false;toast(stopFlag?'Tour stopped':'Tour finished')}
  const stopTour=()=>{stopFlag=true;toast('Stopping after this one…')};
  const build=()=>{menu.textContent='';const ids=A.map(x=>x.id).filter(id=>id!=='fix');
    head('Everything');addBtn(touring?'■ Stop the tour':`▶ Play everything, one by one (${allIds().length})`,()=>touring?stopTour():tour(),true);
    add('Showcase scenes',Object.keys(BIG).filter(id=>ids.includes(id)));
    add('Cursor play',Object.keys(PLAY).filter(id=>ids.includes(id)));
    head('Reactions & extras');
    addBtn('Click fireworks (or just click anywhere)',()=>document.body.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:innerWidth/2,clientY:innerHeight/2})));
    addBtn('Night lanterns: '+(document.documentElement.classList.contains('night')?'on':'off'),()=>document.documentElement.classList.toggle('night'));
    addBtn('Morning stretch',()=>C.stretchRandom&&C.stretchRandom());
    addBtn('Sound: '+((window.__sfx&&window.__sfx.on)?'on':'off'),()=>{const s=document.getElementById('sound');if(s)s.click()});
    add('Small effects',ids.filter(id=>!BIG[id]&&!PLAY[id]))};  btn.addEventListener('click',e=>{e.stopPropagation();if(!menu.classList.contains('open'))build();const open=menu.classList.toggle('open');btn.setAttribute('aria-expanded',String(open));if(window.__sfx)window.__sfx.wake()});
  document.addEventListener('click',e=>{if(!menu.contains(e.target)&&e.target!==btn)close()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  async function play(id,quiet){
    const act=A.find(x=>x.id===id);if(!act)return false;
    const busy=()=>C.isBusy()||agents.some(q=>q.busy);
    if(!quiet)toast(busy()?`Queued: ${label(id)}`:`Playing: ${label(id)}`);
    for(let i=0;i<300&&busy();i++)await wait(250);
    document.querySelectorAll('[data-type]').forEach(e=>e._busy=0);
    window.__fxManual=true;let ctx=null;try{ctx=act.pick()}finally{window.__fxManual=false}
    if(!ctx){if(!quiet)toast('Nothing suitable on screen. Scroll to a big headline and try again.');return false}
    const pool=agents.filter(q=>q.mode==='roam'&&!q.busy);if(!pool.length){if(!quiet)toast('Cursors are busy, try again in a moment.');return false}
    const ws=pool.map(q=>{const w=act.who&&act.who[q.T.id];return w===undefined?(act.who&&Object.keys(act.who).length?.2:1):w});
    const tot=ws.reduce((s,v)=>s+v,0);let r=Math.random()*(tot||1),a=pool[pool.length-1];
    if(tot>0)for(let i=0;i<pool.length;i++){r-=ws[i];if(r<=0){a=pool[i];break}}
    if(!quiet)toast(`Playing: ${label(id)}`);await C.runTask(a,{run:q=>act.run(q,ctx)},0);return true;
  }  C.playAct=play;
})();
})();