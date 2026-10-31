let animationFrame=0;

function scrollListToTop(){
  cancelAnimationFrame(animationFrame);
  const start=Math.max(window.scrollY,document.documentElement.scrollTop,document.body.scrollTop);
  if(start<=1){window.scrollTo(0,0);return}
  const started=performance.now();
  const duration=Math.min(720,Math.max(420,360+start*.08));
  const ease=t=>1-Math.pow(1-t,3);
  const tick=now=>{
    const progress=Math.min(1,(now-started)/duration);
    window.scrollTo(0,start*(1-ease(progress)));
    if(progress<1)animationFrame=requestAnimationFrame(tick);
  };
  animationFrame=requestAnimationFrame(tick);
}

document.addEventListener('click',event=>{
  const listTab=event.target?.closest?.('nav [data-tab="list"]');
  if(!listTab)return;
  setTimeout(()=>requestAnimationFrame(()=>requestAnimationFrame(scrollListToTop)),20);
});
