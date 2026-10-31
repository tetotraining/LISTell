// Keep the active tab when item data is refreshed after an edit.
queueMicrotask(()=>{
  const refresh=window.__listellRefresh;
  if(typeof refresh!=='function')return;
  window.__listellRefresh=async()=>{
    const tab=document.querySelector('nav [data-tab].on')?.dataset.tab||'list';
    await refresh();
    if(tab!=='list')document.querySelector(`nav [data-tab="${tab}"]`)?.click();
  };
});

const MAIN_TABS=['all','list','priority','menu'];
const MAIN_EYEBROWS=new Set(['ALL LISTS','SHOPPING LIST','FOCUS VIEW','MORE']);
const TAB_LABELS={all:['ALL LISTS','全リスト'],list:['SHOPPING LIST','リスト'],priority:['FOCUS VIEW','優先度'],menu:['MORE','メニュー']};
const tabSnapshots=new Map();
let topAnimationFrame=0;
let swipeGesture=null;
let swipeLayer=null;

function scrollCurrentViewToTop(){
  cancelAnimationFrame(topAnimationFrame);
  const start=Math.max(window.scrollY,document.documentElement.scrollTop,document.body.scrollTop);
  if(start<=1){window.scrollTo(0,0);return}
  const started=performance.now();
  const duration=Math.min(720,Math.max(420,360+start*.08));
  const ease=t=>1-Math.pow(1-t,3);
  const tick=now=>{
    const progress=Math.min(1,(now-started)/duration);
    window.scrollTo(0,start*(1-ease(progress)));
    if(progress<1)topAnimationFrame=requestAnimationFrame(tick);
  };
  topAnimationFrame=requestAnimationFrame(tick);
}

function currentMainTab(){
  const tab=document.querySelector('nav [data-tab].on')?.dataset.tab;
  const eyebrow=document.querySelector('#app > main header em')?.textContent?.trim();
  return MAIN_TABS.includes(tab)&&MAIN_EYEBROWS.has(eyebrow)?tab:null;
}

function hasBlockingLayer(){
  return !!document.querySelector('.shade,.sheet');
}

function cloneMainForViewport(main,scrollY){
  const clone=main.cloneNode(true);
  clone.setAttribute('aria-hidden','true');
  clone.style.margin='0';
  clone.style.transform=`translate3d(0,${-scrollY}px,0)`;
  clone.style.pointerEvents='none';
  return clone;
}

function captureCurrentSnapshot(){
  if(swipeLayer)return;
  const tab=currentMainTab();
  const main=document.querySelector('#app > main');
  if(!tab||!main)return;
  tabSnapshots.set(tab,main.cloneNode(true));
}

function fallbackTargetMain(tab){
  const [eyebrow,title]=TAB_LABELS[tab]||['LISTELL',''];
  const main=document.createElement('main');
  main.innerHTML=`<header><em>${eyebrow}</em><h1>${title}</h1></header>`;
  return main;
}

function removeSwipeLayer(){
  swipeLayer?.root?.remove();
  swipeLayer=null;
}

function prepareSwipeLayer(targetTab,direction){
  const app=document.querySelector('#app');
  const currentMain=document.querySelector('#app > main');
  const currentTab=currentMainTab();
  if(!app||!currentMain||!currentTab)return false;

  const scrollY=Math.max(window.scrollY,document.documentElement.scrollTop,document.body.scrollTop);
  tabSnapshots.set(currentTab,currentMain.cloneNode(true));
  const currentClone=cloneMainForViewport(currentMain,scrollY);
  const storedTarget=tabSnapshots.get(targetTab)?.cloneNode(true)||fallbackTargetMain(targetTab);
  const targetClone=cloneMainForViewport(storedTarget,scrollY);

  const rect=app.getBoundingClientRect();
  const width=Math.max(1,rect.width||window.innerWidth);
  const root=document.createElement('div');
  root.className='listell-main-swipe-layer';
  Object.assign(root.style,{
    position:'fixed',
    zIndex:'9',
    top:'0',
    left:`${Math.max(0,rect.left)}px`,
    width:`${width}px`,
    bottom:'calc(92px + env(safe-area-inset-bottom))',
    overflow:'hidden',
    background:'var(--base,#050605)',
    pointerEvents:'none',
    contain:'layout paint size'
  });

  const track=document.createElement('div');
  Object.assign(track.style,{
    position:'absolute',
    inset:'0',
    willChange:'transform',
    transform:'translate3d(0,0,0)'
  });

  const currentPage=document.createElement('div');
  Object.assign(currentPage.style,{
    position:'absolute',top:'0',left:'0',width:'100%',minHeight:'100%',background:'var(--base,#050605)',overflow:'hidden'
  });
  currentPage.appendChild(currentClone);

  const targetPage=document.createElement('div');
  Object.assign(targetPage.style,{
    position:'absolute',top:'0',left:`${direction*width}px`,width:'100%',minHeight:'100%',background:'var(--base,#050605)',overflow:'hidden',opacity:'.16'
  });
  targetPage.appendChild(targetClone);

  track.append(currentPage,targetPage);
  root.appendChild(track);
  document.body.appendChild(root);
  swipeLayer={root,track,currentPage,targetPage,width,direction,targetTab,currentTab};
  return true;
}

function setSwipeProgress(dx){
  const layer=swipeLayer;
  if(!layer)return;
  const max=layer.width;
  const x=layer.direction>0?Math.max(-max,Math.min(0,dx)):Math.min(max,Math.max(0,dx));
  const progress=Math.min(1,Math.abs(x)/Math.max(1,max*.72));
  layer.track.style.transform=`translate3d(${x}px,0,0)`;
  layer.targetPage.style.opacity=String(.16+.84*progress);
}

function finishSwipe(commit){
  const layer=swipeLayer;
  if(!layer){swipeGesture=null;return}
  const finalX=commit?-layer.direction*layer.width:0;
  layer.track.style.transition='transform 260ms cubic-bezier(.22,.72,.24,1)';
  layer.targetPage.style.transition='opacity 260ms cubic-bezier(.22,.72,.24,1)';
  layer.track.style.transform=`translate3d(${finalX}px,0,0)`;
  layer.targetPage.style.opacity=commit?'1':'.16';
  const targetTab=layer.targetTab;
  setTimeout(()=>{
    if(commit)document.querySelector(`nav [data-tab="${targetTab}"]`)?.click();
    removeSwipeLayer();
    requestAnimationFrame(captureCurrentSnapshot);
  },270);
  swipeGesture=null;
}

// Re-tapping any of the four main bottom tabs smoothly returns that view to the top.
document.addEventListener('click',event=>{
  const tab=event.target?.closest?.('nav [data-tab]')?.dataset.tab;
  if(!MAIN_TABS.includes(tab))return;
  if(event.isTrusted)setTimeout(()=>requestAnimationFrame(()=>requestAnimationFrame(scrollCurrentViewToTop)),20);
  setTimeout(()=>requestAnimationFrame(captureCurrentSnapshot),30);
});

// Cache snapshots after normal renders without switching tabs during a touch gesture.
const snapshotObserver=new MutationObserver(()=>{
  if(swipeLayer||swipeGesture?.engaged)return;
  requestAnimationFrame(captureCurrentSnapshot);
});
const observedApp=document.querySelector('#app');
if(observedApp)snapshotObserver.observe(observedApp,{childList:true,subtree:false});
requestAnimationFrame(captureCurrentSnapshot);

// Paymo-style horizontal paging across: All Lists -> List -> Priority -> Menu.
document.addEventListener('touchstart',event=>{
  if(event.touches.length!==1||hasBlockingLayer()||swipeLayer){swipeGesture=null;return}
  const tab=currentMainTab();
  if(!tab){swipeGesture=null;return}
  const target=event.target;
  if(target?.closest?.('nav,input,textarea,select,[contenteditable="true"],[data-no-page-swipe]')){swipeGesture=null;return}
  const touch=event.touches[0];
  swipeGesture={
    tab,
    index:MAIN_TABS.indexOf(tab),
    startX:touch.clientX,
    startY:touch.clientY,
    lastX:touch.clientX,
    lastAt:performance.now(),
    velocityX:0,
    dx:0,
    direction:0,
    engaged:false
  };
},{passive:true});

document.addEventListener('touchmove',event=>{
  const g=swipeGesture;
  if(!g||event.touches.length!==1||hasBlockingLayer())return;
  const touch=event.touches[0];
  const dx=touch.clientX-g.startX;
  const dy=touch.clientY-g.startY;
  const ax=Math.abs(dx),ay=Math.abs(dy);
  const now=performance.now();
  const dt=Math.max(1,now-g.lastAt);
  g.velocityX=(touch.clientX-g.lastX)/dt;
  g.lastX=touch.clientX;
  g.lastAt=now;

  if(!g.engaged){
    if(ax<9||ax<ay*1.15)return;
    const direction=dx<0?1:-1;
    const candidate=g.index+direction;
    if(candidate<0||candidate>=MAIN_TABS.length){swipeGesture=null;return}
    g.direction=direction;
    g.engaged=prepareSwipeLayer(MAIN_TABS[candidate],direction);
    if(!g.engaged){swipeGesture=null;return}
  }

  g.dx=dx;
  setSwipeProgress(dx);
  if(event.cancelable)event.preventDefault();
},{passive:false});

document.addEventListener('touchend',event=>{
  const g=swipeGesture;
  if(!g?.engaged||!swipeLayer||event.changedTouches.length!==1){swipeGesture=null;return}
  const distance=Math.abs(g.dx);
  const fastEnough=g.direction===1?g.velocityX<-.42:g.velocityX>.42;
  const commit=distance>=Math.min(118,swipeLayer.width*.26)||(distance>=42&&fastEnough);
  finishSwipe(commit);
},{passive:true});

document.addEventListener('touchcancel',()=>{
  if(swipeGesture?.engaged&&swipeLayer)finishSwipe(false);
  else swipeGesture=null;
},{passive:true});
