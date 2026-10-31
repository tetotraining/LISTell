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
let scrollFadeFrame=0;
let boundMainScroller=null;

function bindMainScroller(main){
  if(boundMainScroller===main)return;
  if(boundMainScroller)boundMainScroller.removeEventListener('scroll',syncScrollFades);
  boundMainScroller=main||null;
  if(boundMainScroller)boundMainScroller.addEventListener('scroll',syncScrollFades,{passive:true});
}

function clamp01(value){return Math.max(0,Math.min(1,value))}
function smoothstep(value){
  const t=clamp01(value);
  return t*t*(3-2*t);
}

function syncScrollFades(){
  cancelAnimationFrame(scrollFadeFrame);
  scrollFadeFrame=requestAnimationFrame(()=>{
    const main=document.querySelector('#app>main:not(.auth)');
    const header=main?.querySelector(':scope > header');
    if(!main||!header)return;
    bindMainScroller(main);

    const styles=getComputedStyle(main);
    const gap=parseFloat(styles.getPropertyValue('--listell-priority-gap'))||30;
    const priorityFadeStart=parseFloat(styles.getPropertyValue('--listell-priority-fade-start'))||44;
    const priorityFadeEndGap=parseFloat(styles.getPropertyValue('--listell-priority-fade-end-gap'))||16;
    const productFadeDistance=parseFloat(styles.getPropertyValue('--listell-product-fade-distance'))||140;
    const mainTop=main.getBoundingClientRect().top;
    const headerTop=parseFloat(getComputedStyle(header).top)||0;
    const headerBottom=Math.max(0,Math.ceil(header.offsetHeight+headerTop));
    const stickyTop=mainTop+headerBottom+gap;

    // Priority headings can be nested differently after the rows are grouped.
    // Fade them out before their sticky parent would push them into the fixed meta row.
    const headings=[...main.querySelectorAll('.priority-heading')];
    let headingHeight=0;
    headings.forEach(heading=>{
      const group=heading.closest('.priority-group');
      const headingRect=heading.getBoundingClientRect();
      headingHeight=Math.max(headingHeight,headingRect.height||0);
      if(!group){heading.style.opacity='1';return}

      const groupRect=group.getBoundingClientRect();
      let opacity=1;
      if(headingRect.top<=stickyTop+1){
        const remaining=groupRect.bottom-(stickyTop+headingRect.height);
        if(remaining<=priorityFadeEndGap)opacity=0;
        else if(remaining<priorityFadeStart){
          opacity=(remaining-priorityFadeEndGap)/Math.max(1,priorityFadeStart-priorityFadeEndGap);
        }
        // Never allow a fading heading to travel upward into the fixed count/sort area.
        if(headingRect.top<stickyTop-1)opacity=0;
      }
      heading.style.opacity=String(clamp01(opacity));
    });

    // Fade each product gradually over a longer scroll distance.
    const fadeEnd=headings.length
      ?stickyTop+Math.max(headingHeight,22)+6
      :mainTop+headerBottom+6;
    const fadeStart=fadeEnd+productFadeDistance;

    main.querySelectorAll('.row[data-id]').forEach(row=>{
      if(row.classList.contains('purchasing'))return;
      const rowTop=row.getBoundingClientRect().top;
      let opacity=1;
      if(rowTop<=fadeEnd)opacity=0;
      else if(rowTop<fadeStart){
        opacity=smoothstep((rowTop-fadeEnd)/Math.max(1,productFadeDistance));
      }
      row.style.opacity=String(opacity);
    });
  });
}

function syncPriorityHeadingOffset(){
  cancelAnimationFrame(stickyOffsetFrame);
  stickyOffsetFrame=requestAnimationFrame(()=>{
    const main=document.querySelector('#app>main:not(.auth)');
    const header=main?.querySelector(':scope > header');
    if(!main||!header)return;
    bindMainScroller(main);
    const top=parseFloat(getComputedStyle(header).top)||0;
    const stickyBottom=Math.max(0,Math.ceil(header.offsetHeight+top));
    main.style.setProperty('--listell-sticky-header-bottom',`${stickyBottom}px`);
    syncScrollFades();
  });
}

const appRoot=document.querySelector('#app');
if(appRoot)new MutationObserver(()=>{
  syncPriorityHeadingOffset();
  syncScrollFades();
}).observe(appRoot,{childList:true,subtree:true});
window.addEventListener('resize',()=>{
  syncPriorityHeadingOffset();
  syncScrollFades();
},{passive:true});
document.addEventListener('scroll',syncScrollFades,{passive:true,capture:true});
queueMicrotask(()=>{
  syncPriorityHeadingOffset();
  syncScrollFades();
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
    syncScrollFades();
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
