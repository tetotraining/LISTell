function closeSheet(shade,value,resolve){shade?._keyboardCleanup?.();shade.remove();resolve(value)}
function bindKeyboardAvoidance(shade,panel){
  const viewport=window.visualViewport;
  const action=panel.querySelector('.dialog-delete')||panel.querySelector('.dialog-ok');
  if(!viewport||!action)return;
  const baselineHeight=viewport.height;
  let frame=0;
  const update=()=>{
    cancelAnimationFrame(frame);
    frame=requestAnimationFrame(()=>{
      if(!panel.isConnected)return;
      const keyboardOpen=viewport.height<baselineHeight-80;
      if(!keyboardOpen){
        panel.style.bottom='0px';
        return;
      }
      const currentLift=parseFloat(panel.style.bottom)||0;
      const panelRect=panel.getBoundingClientRect();
      const actionRect=action.getBoundingClientRect();
      const visibleTop=viewport.offsetTop+8;
      const visibleBottom=viewport.offsetTop+viewport.height-14;
      const baseTop=panelRect.top+currentLift;
      const baseActionBottom=actionRect.bottom+currentLift;
      const neededLift=Math.max(0,baseActionBottom-visibleBottom);
      const maxLift=Math.max(0,baseTop-visibleTop);
      panel.style.bottom=`${Math.min(neededLift,maxLift)}px`;
    });
  };
  viewport.addEventListener('resize',update);
  viewport.addEventListener('scroll',update);
  shade._keyboardCleanup=()=>{
    cancelAnimationFrame(frame);
    viewport.removeEventListener('resize',update);
    viewport.removeEventListener('scroll',update);
  };
  update();
}
export function sheetPrompt({title,label='',value='',placeholder='',choices=null,allowEmpty=false,eyebrow='LISTELL',secondaryChoices=null,secondaryValue='',deleteLabel=''}){return new Promise(resolve=>{const shade=document.createElement('div');shade.className='shade';shade.innerHTML=`<section class="sheet app-dialog"><div class="handle"></div><button class="dialog-cancel">キャンセル</button><em>${eyebrow}</em><h1>${title}</h1>${label?`<label>${label}</label>`:''}${choices?`<div class="dialog-choices chips">${choices.map(x=>`<button data-dialog-value="${x.value}" class="${x.value===value?'sel':''}">● ${x.label}</button>`).join('')}</div>`:`<input class="dialog-input" value="${String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;')}" placeholder="${placeholder}">`}${secondaryChoices?`<label>優先度</label><div class="dialog-priority chips">${secondaryChoices.map(x=>`<button type="button" data-secondary-value="${x.value}" class="${x.value===secondaryValue?'sel':''}">● ${x.label}</button>`).join('')}</div>`:''}<button class="primary dialog-ok">決定</button>${deleteLabel?`<button class="danger dialog-delete" type="button">${deleteLabel}</button>`:''}</section>`;document.body.appendChild(shade);const panel=shade.querySelector('.sheet'),input=shade.querySelector('.dialog-input');let selected=value,secondarySelected=secondaryValue,startY=0,lastY=0;const isProductEdit=!!(secondaryChoices&&deleteLabel);if(isProductEdit){Object.assign(panel.style,{height:'76%',maxHeight:'calc(100dvh - 18px)',bottom:'0px'});bindKeyboardAvoidance(shade,panel)}shade.querySelector('.dialog-cancel').onclick=()=>closeSheet(shade,null,resolve);shade.onclick=e=>{if(e.target===shade)closeSheet(shade,null,resolve)};shade.querySelectorAll('[data-dialog-value]').forEach(b=>b.onclick=()=>{selected=b.dataset.dialogValue;shade.querySelectorAll('[data-dialog-value]').forEach(x=>x.classList.toggle('sel',x===b))});shade.querySelectorAll('[data-secondary-value]').forEach(b=>b.onclick=()=>{secondarySelected=b.dataset.secondaryValue;shade.querySelectorAll('[data-secondary-value]').forEach(x=>x.classList.toggle('sel',x===b))});shade.querySelector('.dialog-ok').onclick=()=>{const result=input?input.value.trim():selected;if(!allowEmpty&&!result){input?.focus();return}closeSheet(shade,secondaryChoices?{value:result,secondaryValue:secondarySelected}:result,resolve)};shade.querySelector('.dialog-delete')?.addEventListener('click',()=>closeSheet(shade,{delete:true},resolve));input?.focus();input?.addEventListener('keydown',e=>{if(e.key==='Enter')shade.querySelector('.dialog-ok').click()});panel.addEventListener('touchstart',e=>{startY=lastY=e.touches[0].clientY},{passive:true});panel.addEventListener('touchmove',e=>{lastY=e.touches[0].clientY;panel.style.transform=`translateY(${Math.max(0,lastY-startY)}px)`},{passive:true});panel.addEventListener('touchend',()=>{if(lastY-startY>90)closeSheet(shade,null,resolve);else{panel.style.transform='';panel.style.transition='transform .18s ease'}},{passive:true})})}
window.listellPrompt=sheetPrompt;