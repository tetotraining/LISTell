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

function syncScrollFades(){
  cancelAnimationFrame(scrollFadeFrame);
  scrollFadeFrame=requestAnimationFrame(()=>{
    const main=document.querySelector('#app>main:not(.auth)');
    const header=main?.querySelector(':scope > header');
    if(!main||!header)return;

    const styles=getComputedStyle(main);
    const gap=parseFloat(styles.getPropertyValue('--listell-priority-gap'))||30;
    const priorityFadeStart=parseFloat(styles.getPropertyValue('--listell-priority-fade-start'))||36;
    const priorityFadeEndGap=parseFloat(styles.getPropertyValue('--listell-priority-fade-end-gap'))||12;
    const productFadeDistance=parseFloat(styles.getPropertyValue('--listell-product-fade-distance'))||42;
    const mainTop=main.getBoundingClientRect().top;
    const headerTop=parseFloat(getComputedStyle(header).top)||0;
    const headerBottom=Math.max(0,Math.ceil(header.offsetHeight+headerTop));
    const stickyTop=mainTop+headerBottom+gap;

    const groups=[...main.querySelectorAll(':scope > .priority-group')];
    groups.forEach(group=>{
      const heading=group.querySelector(':scope > .priority-heading');
      if(!heading)return;

      const headingRect=heading.getBoundingClientRect();
      const groupRect=group.getBoundingClientRect();
      const headingHeight=headingRect.height;
      const stickyActive=headingRect.top<=stickyTop+1;

      // Fade the priority label BEFORE its parent starts pushing it upward.
      // This prevents it from ever overlapping the fixed count/sort row.
      let headingOpacity=1;
      if(stickyActive){
        const remaining=groupRect.bottom-(stickyTop+headingHeight);
        if(remaining<=priorityFadeEndGap)headingOpacity=0;
        else if(remaining<priorityFadeStart){
          headingOpacity=(remaining-priorityFadeEndGap)/Math.max(1,priorityFadeStart-priorityFadeEndGap);
        }
      }
      heading.style.opacity=String(Math.max(0,Math.min(1,headingOpacity)));

      // Fade each product row itself as it approaches the fixed priority label.
      const fadeTop=stickyTop+headingHeight+4;
      const fadeBottom=fadeTop+productFadeDistance;
      group.querySelectorAll(':scope > .rows > .row').forEach(row=>{
        if(row.classList.contains('purchasing'))return;
        if(!stickyActive){row.style.opacity='1';return}
        const rowTop=row.getBoundingClientRect().top;
        let opacity=1;
        if(rowTop<=fadeTop)opacity=0;
        else if(rowTop<fadeBottom)opacity=(rowTop-fadeTop)/Math.max(1,fadeBottom-fadeTop);
        row.style.opacity=String(Math.max(0,Math.min(1,opacity)));
      });
    });

    // Reset rows when this view is not using priority groups.
    if(!groups.length){
      main.querySelectorAll(':scope > .rows > .row').forEach(row=>{
        if(!row.classList.contains('purchasing'))row.style.opacity='1';
      });
    }
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
