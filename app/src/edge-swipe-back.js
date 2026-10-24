const TARGET_TITLES=new Set(['リスト管理','共有設定','デザイン設定','通知設定']);
let startX=0,startY=0,lastX=0,lastY=0,tracking=false;
const isTargetPanel=()=>TARGET_TITLES.has(document.querySelector('main header h1')?.textContent?.trim());
const interactiveTarget=el=>!!el?.closest?.('input,textarea,select,button,[contenteditable="true"],.sheet,.shade');
document.addEventListener('touchstart',e=>{
  if(e.touches.length!==1||!isTargetPanel()||interactiveTarget(e.target))return;
  const t=e.touches[0];
  if(t.clientX>32)return;
  startX=lastX=t.clientX;startY=lastY=t.clientY;tracking=true;
},{passive:true});
document.addEventListener('touchmove',e=>{
  if(!tracking||e.touches.length!==1)return;
  const t=e.touches[0];lastX=t.clientX;lastY=t.clientY;
  if(Math.abs(lastY-startY)>Math.abs(lastX-startX)*1.2)tracking=false;
},{passive:true});
document.addEventListener('touchend',()=>{
  if(!tracking)return;
  tracking=false;
  const dx=lastX-startX,dy=Math.abs(lastY-startY);
  if(dx<70||dy>60||dx<dy*1.3)return;
  document.querySelector('[data-tab="menu"]')?.click();
},{passive:true});
document.addEventListener('touchcancel',()=>{tracking=false},{passive:true});
