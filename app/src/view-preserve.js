import './sticky-header.css';

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
let topAnimationFrame=0;
let stickyOffsetFrame=0;
let priorityFadeFrame=0;

function syncPriorityHeadingFade(){
  cancelAnimationFrame(priorityFadeFrame);
  priorityFadeFrame=requestAnimationFrame(()=>{
    const main=document.querySelector('#app>main:not(.auth)');
    const header=main?.querySelector(':scope > header');
    if(!main||!header)return;
    const styles=getComputedStyle(main);
    const gap=parseFloat(styles.getPropertyValue('--listell-priority-gap'))||30;
    const fadeEndGap=parseFloat(styles.getPropertyValue('--listell-priority-fade-end-gap'))||12;
    const mainTop=main.getBoundingClientRect().top;
    const headerTop=parseFloat(getComputedStyle(header).top)||0;
    const headerBottom=Math.max(0,Math.ceil(header.offsetHeight+headerTop));
    const stickyTop=mainTop+headerBottom+gap;
    const fadeDistance=Math.max(1,gap-fadeEndGap);
    main.querySelectorAll(':scope > .priority-group .priority-heading').forEach(heading=>{
      const pushed=Math.max(0,stickyTop-heading.getBoundingClientRect().top);
      const opacity=Math.max(0,Math.min(1,1-pushed/fadeDistance));
      heading.style.opacity=String(opacity);
    });
  });
}

function syncPriorityHeadingOffset(){
  cancelAnimationFrame(stickyOffsetFrame);
  stickyOffsetFrame=requestAnimationFrame(()=>{
    const main=document.querySelector('#app>main:not(.auth)');
    const header=main?.querySelector(':scope > header');
    if(!main||!header)return;
    const top=parseFloat(getComputedStyle(header).top)||0;
    const stickyBottom=Math.max(0,Math.ceil(header.offsetHeight+top));
    main.style.setProperty('--listell-sticky-header-bottom',`${stickyBottom}px`);
    syncPriorityHeadingFade();
  });
}

const appRoot=document.querySelector('#app');
if(appRoot)new MutationObserver(()=>{
  syncPriorityHeadingOffset();
  syncPriorityHeadingFade();
}).observe(appRoot,{childList:true,subtree:true});
window.addEventListener('resize',()=>{
  syncPriorityHeadingOffset();
  syncPriorityHeadingFade();
},{passive:true});
document.addEventListener('scroll',syncPriorityHeadingFade,{passive:true,capture:true});
queueMicrotask(()=>{
  syncPriorityHeadingOffset();
  syncPriorityHeadingFade();
});

function currentScroller(){
  const main=document.querySelector('#app>main:not(.auth)');
  if(main&&main.scrollHeight>main.clientHeight+1)return main;
  return document.scrollingElement||document.documentElement;
}

function scrollCurrentViewToTop(){
  cancelAnimationFrame(topAnimationFrame);
  const scroller=currentScroller();
  const start=scroller===document.scrollingElement||scroller===document.documentElement
    ?Math.max(window.scrollY,document.documentElement.scrollTop,document.body.scrollTop)
    :scroller.scrollTop;
  if(start<=1){
    if(scroller===document.scrollingElement||scroller===document.documentElement)window.scrollTo(0,0);
    else scroller.scrollTop=0;
    return;
  }
  const started=performance.now();
  const duration=Math.min(720,Math.max(420,360+start*.08));
  const ease=t=>1-Math.pow(1-t,3);
  const tick=now=>{
    const progress=Math.min(1,(now-started)/duration);
    const y=start*(1-ease(progress));
    if(scroller===document.scrollingElement||scroller===document.documentElement)window.scrollTo(0,y);
    else scroller.scrollTop=y;
    syncPriorityHeadingFade();
    if(progress<1)topAnimationFrame=requestAnimationFrame(tick);
  };
  topAnimationFrame=requestAnimationFrame(tick);
}

// Re-tapping any of the four main bottom tabs smoothly returns that view to the top.
document.addEventListener('click',event=>{
  if(!event.isTrusted)return;
  const tab=event.target?.closest?.('nav [data-tab]')?.dataset.tab;
  if(!MAIN_TABS.includes(tab))return;
  setTimeout(()=>requestAnimationFrame(()=>requestAnimationFrame(scrollCurrentViewToTop)),20);
});
