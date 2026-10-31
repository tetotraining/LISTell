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

let listTopAnimationFrame=0;

function scrollListToTop(){
  cancelAnimationFrame(listTopAnimationFrame);
  const start=Math.max(window.scrollY,document.documentElement.scrollTop,document.body.scrollTop);
  if(start<=1){window.scrollTo(0,0);return}
  const started=performance.now();
  const duration=Math.min(720,Math.max(420,360+start*.08));
  const ease=t=>1-Math.pow(1-t,3);
  const tick=now=>{
    const progress=Math.min(1,(now-started)/duration);
    window.scrollTo(0,start*(1-ease(progress)));
    if(progress<1)listTopAnimationFrame=requestAnimationFrame(tick);
  };
  listTopAnimationFrame=requestAnimationFrame(tick);
}

document.addEventListener('click',event=>{
  if(!event.target?.closest?.('nav [data-tab="list"]'))return;
  setTimeout(()=>requestAnimationFrame(()=>requestAnimationFrame(scrollListToTop)),20);
});
