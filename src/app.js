import {P,A,LOGO} from './data/projects.js';
import {clamp,easeIO} from './lib/math.js';
import {fmtT,galCounter} from './lib/format.js';
import {CATS,sortAcervo} from './lib/acervo.js';
import {filmTotal,partOffset,partAt} from './lib/film.js';
import {pathLayout,snapY,nearestIndex,orbitSquash,screenFit,titleFit} from './lib/layout.js';
const $=s=>document.querySelector(s),root=document.documentElement;

/* ===== CENA ===== */
const cv=$('#gl'),R=new THREE.WebGLRenderer({canvas:cv,antialias:true});R.setPixelRatio(Math.min(devicePixelRatio,1.75));
const scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(50,1,.1,200);scene.background=new THREE.Color(0x0a0a0c);scene.fog=new THREE.FogExp2(0x0a0a0c,.045);const keyL=new THREE.PointLight(0xffffff,1.8,40,1);scene.add(keyL,new THREE.AmbientLight(0x3a3d42,.9));
P.forEach(p=>{p.ar=p.ar||(/^Porto/.test(p.t)?.8:16/9)});const PM=P.filter(p=>p.gal||p.v);
const PORT=innerWidth<innerHeight,N=PM.length,{SPY,S0,S1,TY}=pathLayout(PORT,N),RAD=3.9,glow=new THREE.Color(0xffb86b),PR=R.getPixelRatio();
const rt=new THREE.WebGLRenderTarget(256,144,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter}),RES=new THREE.Vector2(),RTS=[];
const sz=()=>{R.setSize(innerWidth,innerHeight,false);RES.set(innerWidth*PR,innerHeight*PR);rt.setSize(Math.ceil(innerWidth/4),Math.ceil(innerHeight/4));RTS.forEach(r=>r.setSize(Math.ceil(innerWidth/4),Math.ceil(innerHeight/4)));cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix()};sz();addEventListener('resize',sz);

/* Nuvem de pontos da logo + halo (reage ao mouse, dispersa com o scroll) */
/* uK: fração de pontos da logo mantida; cai quando a logo encolhe (celular) para a densidade na tela ficar igual à do PC */
const U={uT:{value:0},uD:{value:0},uM:{value:new THREE.Vector2(9,9)},uPr:{value:PR},uC:{value:glow},uK:{value:1}};
/** @type {any} */
let logoPts=null;
const lg=new Image();lg.src=LOGO;const logoReady=new Promise(r=>lg.onload=()=>{
 const S=700,c=document.createElement('canvas');c.width=c.height=S;const x=c.getContext('2d');x.imageSmoothingQuality='high';x.fillStyle='#fff';x.fillRect(0,0,S,S);x.drawImage(lg,0,0,S,S);
 const d=x.getImageData(0,0,S,S).data,pos=[],rr=[],ss=[],bb=[],W=5.6;
 const add=(a,b,z,k)=>{pos.push(a,b,z);rr.push(Math.random()*2-1,Math.random()*2-1,Math.random()*2-1);ss.push(Math.random());bb.push(k)};
 for(let j=0;j<S;j++)for(let i=0;i<S;i++){const k=(255-d[(j*S+i)*4])/255;if(k>.18&&Math.random()<Math.min(1,k*1.15)){const X=(i+Math.random()-.5)/S-.5,Y=.5-(j+Math.random()-.5)/S;add(X*W,Y*W,.45*(1-4*(X*X+Y*Y))+(Math.random()-.5)*.05,k)}}
 for(let q=0;q<2200;q++){const a=Math.random()*6.283,b=Math.acos(2*Math.random()-1),r=2.8+Math.random()*5;add(r*Math.sin(b)*Math.cos(a),r*Math.sin(b)*Math.sin(a)*.8,r*Math.cos(b)*.7,0)}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('aR',new THREE.Float32BufferAttribute(rr,3));g.setAttribute('aS',new THREE.Float32BufferAttribute(ss,1));g.setAttribute('aB',new THREE.Float32BufferAttribute(bb,1));
 logoPts=new THREE.Points(g,new THREE.ShaderMaterial({uniforms:U,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  vertexShader:`uniform float uT,uD,uPr,uK;uniform vec2 uM;attribute vec3 aR;attribute float aS,aB;varying float vA;
  void main(){vec3 p=position+aR*.008*sin(uT*.8+aR.x*20.);vec2 d=p.xy-uM;float rr=length(d)*(.7+.6*fract(aS*37.1))+(fract(aR.x*91.7)-.5)*.4;float f=1.-smoothstep(.2,1.15,rr);vec3 dir=normalize(aR+.4*vec3(sin(uT*.7+aS*31.),cos(uT*.6+aR.z*23.),sin(uT*.5+aR.y*17.))+1e-4);p+=dir*f*(.7+fract(aS*13.7)*.8);p.z+=f*aR.z*.4;
  p+=aR*uD*(3.+aS*9.);p.z+=uD*aS*7.;vec4 mv=modelViewMatrix*vec4(p,1.);float h=step(aB,.001);float tw=1.+.7*step(.9,aS)*sin(uT*2.5+aR.y*40.);
  vA=(1.-uD*.5)*pow(1.-f,1.6)*mix(.35+.65*aB,.5,h)*tw;gl_PointSize=(aS*.7+.55)*mix(1.,2.6,h)*uPr*(14./-mv.z)*max(h,step(fract(aS*53.3),uK));gl_Position=projectionMatrix*mv;}`,
  fragmentShader:`uniform vec3 uC;varying float vA;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(mix(vec3(1.),uC,.3),vA*smoothstep(.5,0.,d)*1.2);}`}));
 scene.add(logoPts);r()});

/* Eixo de Luz: feixes volumétricos + partículas em espiral + orbe solar */
const hc=document.createElement('canvas');hc.width=hc.height=128;{const x=hc.getContext('2d');for(let i=0;i<16;i++){const a=30+Math.random()*68,b=30+Math.random()*68,g=x.createRadialGradient(a,b,0,a,b,42);g.addColorStop(0,'rgba(255,255,255,.2)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,128,128)}
 x.globalCompositeOperation='destination-in';const m=x.createRadialGradient(64,64,0,64,64,64);m.addColorStop(0,'#fff');m.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=m;x.fillRect(0,0,128,128)}
const hazeM=new THREE.SpriteMaterial({map:new THREE.CanvasTexture(hc),color:glow,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:0}),HZ=[];
for(let i=0;i<90;i++){const h=new THREE.Sprite(hazeM),a=Math.random()*6.283,r=Math.random()*1.8;h.userData={x:Math.cos(a)*r,z:Math.sin(a)*r-1,ph:Math.random()*9};h.position.y=8-Math.random()*(TY+22);h.scale.setScalar(3+Math.random()*5);h.material.rotation=0;scene.add(h);HZ.push(h)}
const ap=[],ar=[];for(let i=0;i<1800;i++){ap.push(0,8-Math.random()*(TY+24),0);ar.push(Math.random()*6.283,.25+Math.pow(Math.random(),1.6)*3,.3+Math.random()*.9)}
const ag=new THREE.BufferGeometry();ag.setAttribute('position',new THREE.Float32BufferAttribute(ap,3));ag.setAttribute('aR',new THREE.Float32BufferAttribute(ar,3));
const axis=new THREE.Points(ag,new THREE.ShaderMaterial({uniforms:{uT:U.uT,uC:{value:glow},uPr:U.uPr,uA:{value:0}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
 vertexShader:'uniform float uT,uPr;attribute vec3 aR;varying float vF;void main(){float a=aR.x+uT*aR.z*.35;vec3 p=vec3(cos(a)*aR.y,position.y+sin(uT*.3+aR.x*9.)*.3,sin(a)*aR.y);vec4 mv=modelViewMatrix*vec4(p,1.);vF=1.-aR.y/3.5;gl_PointSize=(1.4+aR.z*2.)*uPr*(22./-mv.z);gl_Position=projectionMatrix*mv;}',
 fragmentShader:'uniform vec3 uC;uniform float uA;varying float vF;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(uC,smoothstep(.5,0.,d)*vF*uA*.8);}'}));scene.add(axis);
const oc=document.createElement('canvas');oc.width=oc.height=128;{const x=oc.getContext('2d'),g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'#fff');g.addColorStop(.12,'rgba(255,255,255,.9)');g.addColorStop(.4,'rgba(255,255,255,.16)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,128,128)}
const sc=document.createElement('canvas');sc.width=256;sc.height=32;{const x=sc.getContext('2d');x.translate(128,16);x.scale(1,.12);const g=x.createRadialGradient(0,0,0,0,0,128);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.3,'rgba(255,255,255,.3)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(-128,-130,256,260)}
const spr=(tx,dt)=>{const o=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(tx),color:glow.clone(),transparent:true,depthWrite:false,depthTest:dt,blending:THREE.AdditiveBlending,fog:false}));scene.add(o);return o};
const sCore=spr(oc,true),sBloom=spr(oc,true),sStreak=spr(sc,false);

/* Nebulosa / galáxia: nuvens em espiral orbitando o eixo, ao longo de toda a descida */
const beam=new THREE.Mesh(new THREE.PlaneGeometry(1.5,TY+30),new THREE.ShaderMaterial({uniforms:{uC:{value:glow},uA:{value:0}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:'uniform vec3 uC;uniform float uA;varying vec2 vUv;void main(){float x=abs(vUv.x-.5)*2.;gl_FragColor=vec4(uC,pow(1.-x,3.)*uA*.16);}'}));beam.position.set(0,-TY/2+8,-1.2);scene.add(beam);
/* Telas puras: apenas a textura (imagem/vídeo), sem moldura; margens esfumadas na escuridão */
const PN=[];
const SV='varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const SF='uniform sampler2D tM;uniform float uOp,uAR,uH;varying vec2 vUv;void main(){vec4 c=texture2D(tM,vUv);vec2 e=min(vUv,1.-vUv);float a=smoothstep(0.,.11,min(e.x*uAR,e.y));a=pow(a,1.3);gl_FragColor=vec4(c.rgb*(1.+uH*.12),a*uOp);}';
PM.forEach((p,i)=>{
 const ar=p.ar,h=ar>1?3.9:5.4,w=h*ar;
 const cvn=document.createElement('canvas');cvn.width=p.vfs?1920:(ar>1?1280:960);cvn.height=Math.round(cvn.width/ar);const tx=new THREE.CanvasTexture(cvn);tx.minFilter=THREE.LinearFilter;tx.anisotropy=R.capabilities.getMaxAnisotropy();
 const mat=new THREE.ShaderMaterial({uniforms:{tM:{value:tx},uOp:{value:0},uAR:{value:ar},uH:{value:0}},transparent:true,depthWrite:false,vertexShader:SV,fragmentShader:SF}),mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);
 const tc=document.createElement('canvas');tc.width=1400;tc.height=260;const tt=new THREE.CanvasTexture(tc),tmat=new THREE.MeshBasicMaterial({map:tt,transparent:true,depthWrite:false,fog:false,toneMapped:false,opacity:0}),tm=new THREE.Mesh(new THREE.PlaneGeometry(6.8,1.26),tmat);
 tm.position.set(0,-h/2-.8,.5);tm.scale.setScalar(1.0);
 const grp=new THREE.Group();grp.add(mesh,tm);grp.visible=false;scene.add(grp);
 const n={p,i,w,cv:cvn,tx,mat,mesh,tc,tt,tm,tmat,grp,op:0,h:0,ld:0,rd:0,has:0};n.h=0;mesh.userData.n=n;PN.push(n);drawTag(n)});
function drawTag(n){const c=n.tc,x=c.getContext('2d'),W=c.width,p=n.p,M=PORT,k=M?1.55:1;x.clearRect(0,0,W,c.height);x.textAlign='center';x.fillStyle='#fff';
 x.letterSpacing=(M?5:7)+'px';x.font=`400 ${Math.round(20*k)}px Inter,sans-serif`;x.globalAlpha=M?.85:.7;x.fillText(String(n.i+1).padStart(2,'0')+'  —  '+p.c.toUpperCase(),W/2,Math.round(46*(M?1.15:1)));
 x.globalAlpha=1;let fs=M?104:84;x.letterSpacing='3px';x.font=`300 ${fs}px "Cormorant Garamond",Georgia,serif`;while(x.measureText(p.t).width>W-60&&fs>40){fs-=4;x.font=`300 ${fs}px "Cormorant Garamond",Georgia,serif`}
 const ty=(M?62:58)+fs;x.fillText(p.t,W/2,ty);x.letterSpacing=(M?5:6)+'px';x.font=`300 ${Math.round(18*k)}px Inter,sans-serif`;x.globalAlpha=M?.75:.55;x.fillText(p.m.toUpperCase(),W/2,Math.min(c.height-8,ty+(M?44:44)));n.tt.needsUpdate=true}
document.fonts.ready.then(()=>PN.forEach(drawTag));
function paint(n){const c=n.cv,x=c.getContext('2d'),W=c.width,H=c.height,p=n.p;x.fillStyle='#000';x.fillRect(0,0,W,H);
 const rdy=im=>im&&im.complete&&im.naturalWidth,cvr=(im,ix)=>{const iw=im.naturalWidth||im.videoWidth,ih=im.naturalHeight||im.videoHeight,k=Math.max(W/iw,H/ih),sw=W/k,sh=H/k,fy=p.fy?p.fy[ix]:.5;x.drawImage(im,(iw-sw)/2,(ih-sh)*fy,sw,sh,0,0,W,H);n.has=1};
 if(n.gal){const a=n.gal[n.k],b=n.gal[n.pk];if(rdy(b))cvr(b,n.pk);if(rdy(a)){x.globalAlpha=n.f;cvr(a,n.k);x.globalAlpha=1}}else if(n.vd&&n.vd.readyState>=2)cvr(n.vd,0);else if(n.pst&&n.pst.complete&&n.pst.naturalWidth)cvr(n.pst,0);
 n.tx.needsUpdate=true}
function gimg(n,i){i=(i+n.gal.length)%n.gal.length;if(!n.gal[i]){const im=new Image();im.decoding='async';n.gal[i]=im;im.src=n.p.gal[i];(im.decode?im.decode():Promise.resolve()).then(()=>paint(n)).catch(()=>paint(n))}return n.gal[i]}
/* ===== vídeo robusto no celular (iPhone): se não começar, baixa e toca localmente ===== */
const COARSE=matchMedia('(pointer:coarse)').matches,VBL=new Map();
function vblob(u){let p=VBL.get(u);if(!p){p=fetch(u).then(r=>{if(!r.ok)throw 0;return r.blob()}).then(b=>URL.createObjectURL(b));VBL.set(u,p);p.catch(()=>VBL.delete(u))}return p}
function setVid(v,u,play){v.playsInline=true;v.setAttribute('playsinline','');v.setAttribute('webkit-playsinline','');v._want=u;let ok=false;
 const ready=()=>{ok=true};v.addEventListener('loadeddata',ready,{once:true});
 const fb=()=>{if(ok||v._want!==u||v._fb===u)return;v._fb=u;v.classList&&v.parentNode&&v.parentNode.classList.add('ld');
  vblob(u).then(o=>{if(v._want!==u)return;v.src=o;v.load();v.parentNode&&v.parentNode.classList.remove('ld');if(play)v.play().catch(()=>{})}).catch(()=>{})};
 if(COARSE&&VBL.has(u)){vblob(u).then(o=>{if(v._want!==u)return;v.src=o;if(play)v.play().catch(()=>{})});return}
 v.src=u;if(play)v.play().catch(()=>{});
 if(COARSE){v.addEventListener('error',fb,{once:true});setTimeout(()=>{if(!ok&&v.readyState<2)fb()},3500)}}
function load(n){n.ld=1;if(n.p.gal){n.k=0;n.pk=0;n.f=1;n.gal=n.p.gal.map(()=>null);gimg(n,0);gimg(n,1)}if(n.p.v&&!n.p.gal){const v=document.createElement('video');v.muted=v.loop=v.playsInline=true;v.setAttribute('playsinline','');v.preload='auto';setVid(v,(n.p.vm&&COARSE)?n.p.vm:n.p.v,false);n.vd=v;v.addEventListener('loadeddata',()=>paint(n));if(n.p.poster){const im=new Image();im.onload=()=>paint(n);im.src=n.p.poster;n.pst=im}}}

/* Fundo grafite fixo e sol prateado (o antigo ciclo solar foi desligado) */
function cyc(p){scene.background.set(0x0a0a0c);glow.set(0xd4dae2)}
const LBL=['Alvorada','Meio-dia','Crepúsculo','Noite'];

/* ===== LOOP ===== */
const acvS=$('#acervo'),sp=$('#sp'),ray=new THREE.Raycaster(),m2=new THREE.Vector2(),hud=$('#hud'),cue=$('#cue'),ecp=$('#endcap');
ecp.querySelector('h2').innerHTML='<span>Acervo</span>';$('#acervo h2').innerHTML='<span>Acervo</span>';
let ptr=false,cur=0,prev=0,mx=0,my=0,sx=0,sy=0,t=0,tw=0,hv=null,onCv=true,open=false,cx=-99,cy=-99,rx=0,ry=0;
(function frame(){requestAnimationFrame(frame);const _n=performance.now(),dt=Math.min(.05,(_n-(window._lt||_n))/1000);window._lt=_n;t+=dt;
 cur+=(scrollY-cur)*(1-Math.exp(-dt*4.5));const vel=cur-prev;prev=cur;const p=clamp(cur/(sp.offsetHeight-innerHeight));
 sx+=(mx-sx)*(1-Math.exp(-dt*3));sy+=(my-sy)*(1-Math.exp(-dt*3));U.uT.value=t;U.uD.value=clamp(p/.05);
 cyc(p);root.style.setProperty('--glow','#'+glow.getHexString());
 const pL=(N-1-S0)/(S1-S0)+.008,end=clamp((p-pL)/(1-pL)),s=S0+p*(S1-S0),camY=-(s-S0)*SPY;
 cam.position.set(sx*.12,camY-sy*.08+.2,8.8);cam.lookAt(sx*.05,camY,0);cam.fov=48;cam.updateProjectionMatrix();
 tw+=(clamp(vel*.02,-.5,.5)-tw)*.08;scene.fog.color.copy(scene.background);
 const ax=clamp((p-.01)/.04),I=ax*(.35+.65*Math.pow(Math.sin(Math.PI*clamp(p*1.05)),.6));const calm=1-.65*clamp((p-.015)/.05);axis.material.uniforms.uA.value=ax*.8*calm;beam.material.uniforms.uA.value=ax*calm;
 [sCore,sBloom,sStreak].forEach(o=>{o.position.set(0,camY,-1.2);o.material.color.set(0xd4dae2)});
 sCore.scale.setScalar(.5+I*.9);sCore.material.opacity=ax*(.4+.6*calm);sBloom.scale.setScalar(4+I*8);sBloom.material.opacity=.4*ax*(.4+I*.6)*calm;sStreak.scale.set(14+I*12,.5+I*.7,1);sStreak.material.opacity=0;sStreak.visible=false;
 hazeM.color.set(0xd4dae2);hazeM.opacity=.05*ax*(.5+I*.5)*calm;HZ.forEach(h=>{h.position.x=h.userData.x+Math.sin(t*.12+h.userData.ph)*.4;h.position.z=h.userData.z});
 keyL.color.copy(glow);keyL.intensity=1.2+I*2;keyL.position.set(2.6,camY+2.6,8);
 ray.setFromCamera(m2.set(mx,-my),cam);const o=ray.ray.origin,d=ray.ray.direction,k=-o.z/d.z;const ls=Math.min(1,.86*7.84*cam.aspect/5.6);if(logoPts)logoPts.scale.setScalar(ls);U.uK.value=Math.min(1,ls*ls*1.15);if(ptr)U.uM.value.set((o.x+d.x*k)/ls,(o.y+d.y*k)/ls);else U.uM.value.set(99,99);
 hv=null;if(onCv&&!open&&p<.995){const hit=ray.intersectObjects(PN.filter(n=>n.op>.5).map(n=>n.mesh))[0];if(hit)hv=hit.object.userData.n}
 let best=0,bd=1e9;
 const rev=clamp((p-.015)/.05);
 PN.forEach(n=>{const u=n.i-s,au=Math.abs(u),th=u*.8,fc=Math.cos(th);
  if(au<3&&!n.ld)load(n);
  const act=au<1.6&&fc>.2;
  if(n.vd){if(act){if(n.vd.paused)n.vd.play().catch(()=>{});if(_n-(n.lp||0)>15){n.lp=_n;paint(n)}}else n.vd.pause()}
  if(n.gal&&act){n.tk=(n.tk||0)+dt;if(n.tk>3.3&&n.pl!==n.k){n.pl=n.k;gimg(n,n.k+1)}if(n.tk>5){n.tk=0;n.pk=n.k;n.k=(n.k+1)%n.gal.length;n.f=0;gimg(n,n.k)}if(n.f<1){n.f=Math.min(1,n.f+dt*1.4);paint(n)}}
  if(n.has)n.rd=Math.min(1,n.rd+dt*1.8);
  n.hh=(n.hh||0)+((n===hv?1:0)-(n.hh||0))*(1-Math.exp(-dt*9));
  const foc=Math.exp(-u*u*1.6),R=RAD-foc*.4+n.hh*.4-end*2.4,g=n.grp;
  n.op=clamp((fc+.25)/.75)*clamp(1-(au-2.6)/1.2)*rev*(1-clamp(end/.12))*n.rd;
  g.position.set(Math.sin(th)*R*orbitSquash(cam.aspect),-(n.i-S0)*SPY,Math.cos(th)*R);
  g.rotation.set(-u*.02-sy*.03*n.hh,clamp(th*.6,-.55,.55)+sx*.05*n.hh,Math.sin(th)*.02);
  const wh=n.w/n.p.ar,mf=screenFit(cam.aspect,n.w,n.p.ar,SPY),gs=.44*(1+foc*.1)*(1-end*.3)*mf;g.scale.setScalar(gs);const tf=titleFit(cam.aspect,gs);n.tm.scale.setScalar(tf);n.tm.position.y=-wh/2-.12/gs-.63*tf;g.visible=n.op>.01;
  n.mat.uniforms.uOp.value=n.op;n.mat.uniforms.uH.value=n.hh;n.mesh.scale.setScalar(1+.035*n.hh);
  n.tmat.opacity=n.op*(PORT?1:.7+.3*n.hh);n.tm.position.z=.5+.25*n.hh;
  if(au<bd){bd=au;best=n.i}});
 R.render(scene,cam);
 cue.style.opacity=clamp(1-p*30);hud.style.opacity=p>.05&&p<.9?1:0;const acT=acvS.getBoundingClientRect().top,past=clamp((innerHeight*1.02-acT)/(innerHeight*.3));ecp.style.opacity=(clamp((end-.14)/.16)*(1-past)).toFixed(3);ecp.style.setProperty('--e',clamp((end-.14)/.26).toFixed(3));cv.style.opacity=(1-.85*end).toFixed(3);
 if(PN[best]){$('#hn').textContent='0'+(best+1);$('#ht').textContent=PN[best].p.t}$('#hs').textContent=LBL[Math.min(3,p*4|0)];$('#hp').textContent=Math.round(p*100)+'%';
 rx+=(cx-rx)*.5;ry+=(cy-ry)*.5;$('#cd').style.transform=`translate(${cx}px,${cy}px)`;$('#cr').style.transform=`translate(${rx}px,${ry}px)`})();

/* ===== SNAP: cada gesto = uma janela; da última: título e depois o Acervo ===== */
let SA=null,lockT=0;
function slideTo(t,ms,done){if(SA)SA.stop=1;const y0=scrollY,dy=t-y0;if(Math.abs(dy)<2){done&&done();return}const a={stop:0},t0=performance.now();SA=a;
 (function st(n){if(a.stop)return;const k=Math.min(1,(n-t0)/ms);scrollTo(0,y0+dy*easeIO(k));if(k<1)requestAnimationFrame(st);else{SA=null;lockT=performance.now()+500;done&&done()}})(t0)}
const SN=(()=>{let hold=0;
 const H=()=>sp.offsetHeight-innerHeight,yAt=sv=>snapY(sv,S0,S1,H()),Ys=()=>PN.map(n=>yAt(n.i)),
  tYf=()=>{const a=acvS.offsetTop,pL=(N-1-S0)/(S1-S0)+.008;return Math.min(a-innerHeight*1.06,(pL+.42*(1-pL))*H())},
  idx=nearestIndex;
 const toAcervo=()=>{const a=acvS.offsetTop,tY=tYf();clearTimeout(hold);if(scrollY<tY-4)slideTo(tY,1100,()=>{hold=setTimeout(()=>slideTo(a,1300),1500)});else slideTo(a,1300)};
 const step=dir=>{clearTimeout(hold);const Y=Ys(),n=Y.length-1,y=scrollY,a=acvS.offsetTop;
  if(y<Y[0]-2){if(dir>0&&y>Y[0]*.5){slideTo(Y[0],800);return true}return false}
  if(y>Y[n]+2){if(y>a+2)return false;if(dir>0){if(y>=a-2)return false;toAcervo();return true}slideTo(Y[n],1100);return true}
  const k=idx(Y,y),t=k+dir;
  if(t<0)return false;
  if(t>n){toAcervo();return true}
  slideTo(Y[t],800);return true};
 return {step,Ys,idx,toAcervo,clr:()=>clearTimeout(hold)};
})();
addEventListener('wheel',e=>{if(open)return;const now=performance.now();
 if(SA||now<lockT){const Y=SN.Ys();if(scrollY>=Y[0]*.5&&scrollY<=acvS.offsetTop+2){e.preventDefault();lockT=Math.max(lockT,now+160)}return}
 if(Math.abs(e.deltaY)<3)return;
 const Y=SN.Ys(),y=scrollY;if(y<Y[0]*.5||y>acvS.offsetTop+2)return;
 if(SN.step(e.deltaY>0?1:-1)){e.preventDefault();lockT=now+160}},{passive:false});
addEventListener('keydown',e=>{if(open)return;const d={ArrowDown:1,PageDown:1,' ':1,ArrowUp:-1,PageUp:-1}[e.key];if(!d||SA)return;if(SN.step(d))e.preventDefault()});
addEventListener('touchstart',()=>{if(SA){SA.stop=1;SA=null}SN.clr();lockT=0},{passive:true});
/* celular: encaixe nativo do navegador (scroll-snap) */
const TOUCH=matchMedia('(pointer:coarse)').matches;
if(TOUCH){const box=document.createElement('div');box.id='snaps';document.body.append(box);
 const build=()=>{const Y=SN.Ys(),a=acvS.offsetTop,pL=(N-1-S0)/(S1-S0)+.008,H=sp.offsetHeight-innerHeight,tY=Math.min(a-innerHeight*1.06,(pL+.42*(1-pL))*H);
  box.innerHTML=[0,...Y,tY,a].map(y=>`<i class="snapm" style="top:${Math.round(y)}px"></i>`).join('')};
 const tog=()=>{const on=scrollY<acvS.offsetTop-innerHeight*.6;root.classList.toggle('snapy',on)};
 build();tog();addEventListener('resize',()=>{build();tog()});addEventListener('scroll',tog,{passive:true});setTimeout(build,1500)}
/* barra de rolagem/teclado no computador: encaixa quando a rolagem para */
(()=>{if(TOUCH)return;let tmr=0,py=scrollY;addEventListener('scroll',()=>{if(SA)return;clearTimeout(tmr);tmr=setTimeout(()=>{
  if(open||SA)return;const Y=SN.Ys(),n=Y.length-1,y=scrollY,a=acvS.offsetTop,dir=y>py+2?1:y<py-2?-1:0;py=y;
  if(y<Y[0]-2){if(!matchMedia('(pointer:coarse)').matches)return;if(y>40&&dir>0)slideTo(Y[0],1000,()=>py=scrollY);else if(y>2&&dir<0)slideTo(0,900,()=>py=scrollY);return}
  if(y>=a-2)return;
  if(y>Y[n]+2){if(dir>0)SN.toAcervo();else slideTo(Y[n],1000,()=>py=scrollY);return}
  const k=SN.idx(Y,y);slideTo(Y[k],600,()=>py=scrollY);
 },160)},{passive:true})})();
/* ===== INTERAÇÃO ===== */
addEventListener('pointerdown',e=>{ptr=true;mx=e.clientX/innerWidth*2-1;my=e.clientY/innerHeight*2-1});
['pointerup','pointercancel'].forEach(ev=>addEventListener(ev,(/** @type {PointerEvent} */ e)=>{if(e.pointerType!=='mouse'){ptr=false;mx=my=0}}));
document.addEventListener('pointerleave',()=>ptr=false);
addEventListener('pointermove',e=>{ptr=true;mx=e.clientX/innerWidth*2-1;my=e.clientY/innerHeight*2-1;cx=e.clientX;cy=e.clientY;onCv=e.target===cv;
 const tg=/** @type {Element} */(e.target),big=!!(hv||tg.closest('a,button,.t,#lb'));$('#cr').classList.toggle('big',big);$('#cl').textContent=tg.closest('#lb')?'Fechar':(hv||tg.closest('.t'))?'Abrir':''});
let lbT=0;const pick=(x,y,h)=>{if(!h){m2.set(x/innerWidth*2-1,-(y/innerHeight*2-1));ray.setFromCamera(m2,cam);const hit=ray.intersectObjects(PN.filter(n=>n.op>.5).map(n=>n.mesh))[0];if(hit)h=hit.object.userData.n}if(h)openLB(h.p)};
addEventListener('click',e=>{if(e.target!==cv||open)return;pick(e.clientX,e.clientY,hv)});
/* toque: o Safari do iPhone não gera "click" no canvas (não é elemento clicável), então o toque curto e parado abre a janela direto */
(()=>{let tp=null;cv.addEventListener('pointerdown',e=>{tp=e.pointerType==='mouse'?null:{x:e.clientX,y:e.clientY,t:performance.now()}});cv.addEventListener('pointercancel',()=>tp=null);
 cv.addEventListener('pointerup',e=>{const s=tp;tp=null;if(!s||open)return;if(Math.hypot(e.clientX-s.x,e.clientY-s.y)>12||performance.now()-s.t>500)return;lbT=performance.now();pick(e.clientX,e.clientY,null)})})();
(()=>{let x0=null,y0=0;const lb=$('#lb');lb.addEventListener('touchstart',e=>{const t=e.touches[0];x0=t.clientX;y0=t.clientY},{passive:true});lb.addEventListener('touchend',e=>{if(x0===null)return;const t=e.changedTouches[0],dx=t.clientX-x0,dy=t.clientY-y0;x0=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.3){const d=dx<0?1:-1;if(gp)showG(gi+d)}},{passive:true})})();
let gi=0,gp=null,fi=0,fp=null;const LBC=new Map();function lbImg(u){let im=LBC.get(u);if(!im){im=new Image();im.decoding='async';im.src=u;im._r=(im.decode?im.decode():new Promise(r=>{im.onload=r})).catch(()=>{});LBC.set(u,im)}return im}
function lbWarm(p,i){const g=p.gal,n=g.length;[1,2,-1,3].forEach(d=>lbImg(g[(i+d+n)%n]));if(!p._wq){p._wq=1;let k=0;const nx=()=>{if(k>=n||gp!==p)return;lbImg(g[k++])._r.then(()=>setTimeout(nx,30))};setTimeout(nx,400)}}
function showG(i){const p=gp;gi=(i+p.gal.length)%p.gal.length;const j=gi,im=lbImg(p.gal[j]),box=$('#lbm .media');
 $('#gc').textContent=galCounter(gi,p.gal.length);
 const put=()=>{if(gp!==p||gi!==j||!box)return;im.alt=p.t;const cur=box.querySelector('img');if(cur!==im){cur?cur.replaceWith(im):box.append(im);im.animate([{opacity:.35},{opacity:1}],{duration:260,easing:'ease-out'})}box.classList.remove('ld')};
 if(im.complete&&im.naturalWidth)put();else{box&&box.classList.add('ld');im._r.then(put)}lbWarm(p,j)}
/* ===== player de filme: uma barra só para o filme inteiro ===== */
const IC={play:'<svg viewBox="0 0 24 24" width="18" height="18"><path d="M7 5l12 7-12 7z" fill="currentColor"/></svg>',pause:'<svg viewBox="0 0 24 24" width="18" height="18"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg>',
 vol:'<svg viewBox="0 0 24 24" width="18" height="18"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>',
 mute:'<svg viewBox="0 0 24 24" width="18" height="18"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5" stroke="currentColor" stroke-width="1.5"/></svg>',
 fs:'<svg viewBox="0 0 24 24" width="18" height="18"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>'};
/* Filme em partes tocando como um arquivo só.
   1) Media Source (Chrome, Android, Safari do Mac, iPhone com iOS 17.1+): as partes (MP4 fragmentado, imagem e som separados) entram numa
      única linha do tempo do mesmo <video> — emenda sem nenhuma pausa e a barra é nativa do filme inteiro.
   2) Sem Media Source: dois <video> empilhados; o de espera já tem a próxima parte e assume no último quadro. */
const MSC=window.ManagedMediaSource||window.MediaSource;
function filmMSE(v,p,D,T,off){const [cv,ca]=(p.vc||'').split(','),tV=`video/mp4; codecs="${cv}"`,tA=`audio/mp4; codecs="${ca}"`;
 if(!MSC||!p.vsv||!p.vsa||!ca||!MSC.isTypeSupported(tV)||!MSC.isTypeSupported(tA))return null;
 /* imagem e som em buffers separados: o vídeo volta vsh (atraso dos quadros B sem edit list) e encaixa quadro a quadro;
    o som de cada parte é aparado no fim (janela), para não sobrepor a parte seguinte */
 const ms=new MSC(),pend=new Set(),last=D.length-1,sh=p.vsh||0;let sv=null,sa=null,q=Promise.resolve();
 v._want='mse';v.disableRemotePlayback=true;v.src=URL.createObjectURL(ms);v.play().catch(()=>{});
 const has=t=>{const b=v.buffered;for(let k=0;k<b.length;k++)if(t>=b.start(k)&&t<=b.end(k))return true;return false};
 const done=sb=>new Promise(ok=>sb.addEventListener('updateend',ok,{once:true}));
 const get=u=>fetch(u).then(r=>{if(!r.ok)throw 0;return r.arrayBuffer()});
 const put=async(sb,b,o,ws,we)=>{sb.timestampOffset=o;sb.appendWindowStart=0;sb.appendWindowEnd=we;sb.appendWindowStart=ws;
  try{sb.appendBuffer(b)}catch(e){if(e.name!=='QuotaExceededError')throw e;sb.remove(0,Math.max(0,v.currentTime-4));await done(sb);sb.appendBuffer(b)}await done(sb)};
 const need=i=>{if(!sv||i<0||i>last||pend.has(i)||(has(off(i)+.1)&&has(off(i)+D[i]-.1)))return;pend.add(i);
  const bv=get(p.vsv[i]),ba=get(p.vsa[i]);
  q=q.then(()=>Promise.all([bv,ba])).then(async([b1,b2])=>{if(ms.readyState==='closed')return;
   await Promise.all([put(sv,b1,off(i)-sh+.001,Math.max(0,off(i)-.02),off(i)+D[i]+1),put(sa,b2,off(i),off(i),off(i)+D[i]+.03)]);
   if(i===last&&ms.readyState==='open')try{ms.endOfStream()}catch(e){}}).catch(()=>{}).then(()=>{pend.delete(i)})};
 ms.addEventListener('sourceopen',()=>{sv=ms.addSourceBuffer(tV);sa=ms.addSourceBuffer(tA);ms.duration=T;need(0);need(1)},{once:true});
 const look=()=>{const {i,lt}=partAt(D,v.currentTime);fi=i;need(i);if(lt>D[i]*.35)need(i+1)};
 v.addEventListener('timeupdate',look);v.addEventListener('seeking',look);
 return {act:()=>v,now:()=>v.currentTime||0,seek:t=>{v.currentTime=t},mute:m=>{v.muted=m}}}
function filmDual(v,p,D,off){const box=v.parentNode,last=D.length-1;let A=v,B=document.createElement('video'),sw=0;
 B.className='alt';B.playsInline=true;B.setAttribute('playsinline','');B.preload='auto';box.insertBefore(B,v.nextSibling);
 /* iPhone: um vídeo só toca com som se já foi iniciado num toque; "benze" B agora, com a mesma parte de A (o som coincide) */
 B._i=-1;if(p.vfs[1]){B.src=p.vfs[0];B.play().then(()=>{B.pause();prep(1)},()=>prep(1))}
 function prep(i){B._i=-1;if(fp!==p||!p.vfs[i])return;const u=p.vfs[i],pr=VBL.get(u),go=s=>{if(fp!==p||fi+1!==i||sw)return;B._i=i;B.src=s;B.load()};pr?pr.then(go,()=>go(u)):go(u);if(p.vfs[i+1])vblob(p.vfs[i+1]).catch(()=>{})}
 const swap=()=>{const o=A;A=B;B=o;A.classList.remove('alt');B.classList.add('alt');B.pause();fi=A._i;sw=0;prep(fi+1)};
 const handoff=()=>{if(sw||fi>=last||B._i!==fi+1||B.readyState<2)return false;sw=1;B.muted=A.muted;B.currentTime=0;
  B.play().then(()=>{B.requestVideoFrameCallback?B.requestVideoFrameCallback(swap):swap()},()=>{sw=0;B._i=-1;srcNext()});return true};
 /* último recurso (próxima parte não carregou ou não pôde tocar): troca o src de A */
 const srcNext=()=>{if(fi>=last)return;fi++;const u=p.vfs[fi],pr=VBL.get(u),go=s=>{if(fp!==p)return;A._want=u;A.src=s;A.play().catch(()=>{})};
  pr?pr.then(go,()=>setVid(A,u,true)):setVid(A,u,true);prep(fi+1)};
 [A,B].forEach(x=>x.addEventListener('ended',()=>{if(x===A&&!handoff()&&!sw)srcNext()}));
 const tick=()=>{if(!box.isConnected)return;if(!A.paused&&A.duration&&A.duration-A.currentTime<.05)handoff();requestAnimationFrame(tick)};tick();
 return {act:()=>A,now:()=>off(fi)+(A.currentTime||0),mute:m=>{A.muted=B.muted=m},
  seek:t=>{const {i,lt}=partAt(D,t),wasP=!A.paused;if(i===fi){A.currentTime=lt;return}
   fi=i;sw=0;B.pause();const u=p.vfs[i],pr=VBL.get(u),go=src=>{if(fp!==p)return;A._want=u;A.src=src;A.addEventListener('loadedmetadata',()=>{A.currentTime=lt;if(wasP)A.play().catch(()=>{})},{once:true})};
   if(pr)pr.then(go,()=>go(u));else go(u);prep(i+1)}}}
function filmUI(v,p){const box=v.parentNode,D=p.durs||p.vfs.map(()=>0),T=filmTotal(D),off=i=>partOffset(D,i);
 box.classList.add('film');v.controls=false;
 const E=filmMSE(v,p,D,T,off)||filmDual(v,p,D,off);
 box.addEventListener('click',e=>{if(/** @type {Element} */(e.target).tagName==='VIDEO'){e.stopPropagation();tog()}});
 box.insertAdjacentHTML('beforeend',`<div class="fc"><button class="fc-pp" aria-label="Play ou pausa">${IC.pause}</button><span class="fc-t">00:00 / ${fmtT(T)}</span><div class="fc-bar"><i></i></div><button class="fc-mu" aria-label="Som">${IC.vol}</button><button class="fc-fs" aria-label="Tela cheia">${IC.fs}</button></div>`);
 const fc=box.querySelector('.fc'),pp=fc.querySelector('.fc-pp'),tt=fc.querySelector('.fc-t'),bar=fc.querySelector('.fc-bar'),fill=bar.querySelector('i'),mu=fc.querySelector('.fc-mu');let idle=0;
 const sync=()=>{if(!box.isConnected)return;const A=E.act(),t=Math.min(T,E.now());fill.style.width=(T?t/T*100:0)+'%';tt.textContent=fmtT(t)+' / '+fmtT(T);pp.innerHTML=A.paused?IC.play:IC.pause;mu.innerHTML=A.muted?IC.mute:IC.vol;requestAnimationFrame(sync)};sync();
 const wake=()=>{box.classList.remove('idle');clearTimeout(idle);idle=setTimeout(()=>{if(!E.act().paused)box.classList.add('idle')},2500)};wake();
 box.addEventListener('pointermove',wake);box.addEventListener('pointerdown',wake);
 const tog=()=>{const A=E.act();A.paused?A.play().catch(()=>{}):A.pause();wake()};
 pp.onclick=e=>{e.stopPropagation();tog()};
 mu.onclick=e=>{e.stopPropagation();E.mute(!E.act().muted);wake()};
 fc.querySelector('.fc-fs').onclick=e=>{e.stopPropagation();const A=E.act();if(document.fullscreenElement)document.exitFullscreen();else if(box.requestFullscreen)box.requestFullscreen().catch(()=>{});else if(A.webkitEnterFullscreen)A.webkitEnterFullscreen()};
 const seek=x=>{const r=bar.getBoundingClientRect();E.seek(Math.max(0,Math.min(T-.05,(x-r.left)/r.width*T)))};
 let drag=false;bar.addEventListener('pointerdown',e=>{e.stopPropagation();drag=true;bar.setPointerCapture(e.pointerId);seek(e.clientX)});
 bar.addEventListener('pointermove',e=>{if(drag){const r=bar.getBoundingClientRect(),t=Math.max(0,Math.min(T,(e.clientX-r.left)/r.width*T));fill.style.width=t/T*100+'%'}});
 bar.addEventListener('pointerup',e=>{if(drag){drag=false;seek(e.clientX)}});
 fc.addEventListener('click',e=>e.stopPropagation())}
function openLB(p){gp=p.gal?p:null;fp=p.vfs?p:null;fi=0;const m=document.createElement('div');m.className='media';m.style.setProperty('--g',`linear-gradient(180deg,${p.g[0]},${p.g[1]} 58%,${p.g[2]})`);
 if(p.v){const lv=document.createElement('video');lv.controls=!p.vfs;lv.loop=!p.vfs;if(p.poster)lv.poster=p.poster;m.append(lv);setVid(lv,p.vfs?p.vfs[0]:p.v,true)}else if(p.i&&!p.gal)m.innerHTML=`<img src="${p.i}" alt="${p.t}">`;
 $('#lbm').replaceChildren(m);$('#lbt').innerHTML=`<h3>${p.t}</h3><span>${p.m}</span>`;$('#lb').classList.add('open');open=true;root.classList.add('lbo');if(gp){['#gp','#gn','#gc'].forEach(q=>$(q).style.display='block');showG(0)}if(fp){['#gp','#gn','#gc'].forEach(q=>$(q).style.display='none');const fv=$('#lbm video');filmUI(fv,fp);if(fp.vfs[1])vblob(fp.vfs[1]).catch(()=>{})}
 $('#lbm').animate([{transform:'scale(.86)',opacity:0},{transform:'none',opacity:1}],{duration:700,easing:'cubic-bezier(.2,.8,.2,1)'})}
const closeLB=()=>{root.classList.remove('lbo');if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});gp=null;fp=null;document.querySelectorAll('#lbm video').forEach((/** @type {HTMLVideoElement} */ lv)=>{lv.pause();lv.removeAttribute('src');lv.load()});['#gp','#gn','#gc'].forEach(q=>$(q).style.display='none');$('#lb').classList.remove('open');$('#lbm').replaceChildren();open=false};
$('#lb').onclick=e=>{if(performance.now()-lbT<500)return;if(e.target.closest('.gb,#lbm video,.fc'))return;if(gp&&e.target.closest('#lbm')){showG(gi+1);return}closeLB()};$('#gp').onclick=()=>gp&&showG(gi-1);$('#gn').onclick=()=>gp&&showG(gi+1);addEventListener('keydown',e=>{if(!gp&&!fp)return;const d=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0;if(d&&gp)showG(gi+d)});addEventListener('keydown',e=>e.key==='Escape'&&closeLB());
sortAcervo(A);
const cats=CATS,grid=$('#grid'),flt=$('#filters');
A.forEach(a=>{const t=document.createElement('div');t.className='t';t.dataset.c=a.c;t.style.setProperty('--ar',String(a.ar||16/9));const m=document.createElement('div');m.className='media';m.style.setProperty('--g',`linear-gradient(180deg,${a.g[0]},${a.g[1]} 58%,${a.g[2]})`);
 if(a.gal){m.style.background=`center/cover url(${a.gal[0]})`;m.classList.add('ph')}if(a.v&&!a.gal){const tv=document.createElement('video');tv.muted=tv.loop=tv.autoplay=true;tv.setAttribute('muted','');if(a.poster){tv.poster=a.poster;m.style.background=`center/cover url(${a.poster})`}m.append(tv);setVid(tv,(a.vm&&COARSE)?a.vm:a.v,true);m.classList.add('ph')}t.append(m);t.insertAdjacentHTML('beforeend',`<div class="tc"><h4>${a.t}</h4><span>${a.m}</span></div>`);t.onclick=()=>openLB(a);if(a.gal)t.addEventListener('pointerenter',()=>{lbImg(a.gal[0]);lbImg(a.gal[1%a.gal.length])},{once:true});grid.append(t)});
const emp=document.createElement('p');emp.className='empty';emp.textContent='Novos projetos em breve';grid.after(emp);
cats.forEach((c,i)=>{const b=document.createElement('button');b.textContent=c;if(!i)b.className='on';b.onclick=()=>{flt.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));let k=0;grid.querySelectorAll('.t').forEach(t=>{const h=!!i&&t.dataset.c!==c;t.classList.toggle('hide',h);if(!h)k++});emp.classList.toggle('show',!k)};flt.append(b)});

const rio=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');rio.unobserve(e.target)}}),{threshold:.12});
['#acervo h2','.filters','.about h2','.pf','.about p','#contato p','.cta','.contacts','footer'].forEach(q=>document.querySelectorAll(q).forEach(e=>{e.classList.add('rv');rio.observe(e)}));
document.querySelectorAll('.t').forEach((/** @type {HTMLElement} */ e,k)=>{e.classList.add('rv');e.style.setProperty('--d',(k%4)*.09+'s');rio.observe(e)});

/* ===== PRELOADER ===== */
const t0=performance.now();let ok=0;logoReady.then(()=>ok=1);
(function L(){const n=Math.min(100,(performance.now()-t0)/7);$('#ln').textContent=String(n|0).padStart(3,'0');
 if(n<100||!ok)requestAnimationFrame(L);else{$('#ld').classList.add('done');root.classList.remove('lock')}})();
setTimeout(()=>{$('#ld').classList.add('done');root.classList.remove('lock')},4000);
