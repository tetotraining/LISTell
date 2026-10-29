let gesture=null;
const findSheet=target=>target?.closest?.('.shade .sheet');
const reset=sheet=>{if(!sheet)return;sheet.style.transition='transform .22s cubic-bezier(.22,.8,.25,1)';sheet.style.transform='translate3d(0,0,0)';setTimeout(()=>{if(sheet?.isConnected)sheet.style.transition=''},240)};
const closeSheet=(shade,sheet)=>{if(!shade||!sheet)return;const distance=Math.max(window.innerHeight,sheet.getBoundingClientRect().height+80);sheet.style.transition='transform .24s cubic-bezier(.32,.72,0,1)';sheet.style.transform=`translate3d(0,${distance}px,0)`;shade.style.transition='opacity .24s ease';shade.style.opacity='0';setTimeout(()=>{if(shade?.isConnected)shade.remove()},245)};

document.addEventListener('touchstart',e=>{
  if(e.touches.length!==1)return;
  const sheet=findSheet(e.target);
  if(!sheet)return;
  const shade=sheet.closest('.shade');
  if(!shade||shade.id==='shade')return;
  const t=e.touches[0];
  gesture={sheet,shade,startX:t.clientX,startY:t.clientY,lastX:t.clientX,lastY:t.clientY,mode:null,moved:false};
  sheet.style.transition='none';
},{capture:true,passive:true});

document.addEventListener('touchmove',e=>{
  const g=gesture;
  if(!g||e.touches.length!==1||!g.sheet.isConnected){gesture=null;return}
  const t=e.touches[0],dx=t.clientX-g.startX,dy=t.clientY-g.startY;
  g.lastX=t.clientX;g.lastY=t.clientY;
  if(!g.mode){
    if(Math.max(Math.abs(dx),Math.abs(dy))<7)return;
    if(dy>0&&Math.abs(dy)>Math.abs(dx)*1.05)g.mode='down';
    else{g.mode='cancel';reset(g.sheet);return}
  }
  if(g.mode!=='down')return;
  const distance=Math.max(0,dy);
  g.moved=distance>3;
  g.sheet.style.transform=`translate3d(0,${distance}px,0)`;
  const progress=Math.min(1,distance/260);
  g.shade.style.opacity=String(1-progress*.38);
  if(e.cancelable)e.preventDefault();
  e.stopImmediatePropagation();
},{capture:true,passive:false});

document.addEventListener('touchend',e=>{
  const g=gesture;gesture=null;
  if(!g||g.mode!=='down'||!g.sheet.isConnected)return;
  const dy=Math.max(0,g.lastY-g.startY);
  g.shade.style.transition='';g.shade.style.opacity='';
  if(dy>=100){closeSheet(g.shade,g.sheet)}else reset(g.sheet);
  if(g.moved){e.preventDefault();e.stopImmediatePropagation()}
},{capture:true,passive:false});

document.addEventListener('touchcancel',()=>{const g=gesture;gesture=null;if(g?.sheet?.isConnected){g.shade.style.opacity='';reset(g.sheet)}},{capture:true,passive:true});
