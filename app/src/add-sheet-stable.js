const authHeaders=()=>({'content-type':'application/json',...(localStorage.getItem('listell_token')?{authorization:'Bearer '+localStorage.getItem('listell_token')}: {})});
const colors={urgent:'#ff5f57',normal:'#65d46e',any:'#ffffff'};
const currentListId=()=>sessionStorage.getItem('listell_selected_list_id');

function paint(sheet){
  const selected=sheet.dataset.itemPriority||'normal';
  sheet.querySelectorAll('[data-choice]').forEach(button=>{
    const on=button.dataset.choice===selected;
    const color=colors[button.dataset.choice]||'#fff';
    button.classList.toggle('sel',on);
    button.style.color=color;
    button.style.borderColor=on?color:'#3a403a';
    button.style.background=on?`${color}22`:'#101310';
    button.style.boxShadow=on?`0 0 0 1px ${color} inset`:'none';
    button.setAttribute('aria-pressed',String(on));
  });
}

function closeSheet(){document.querySelector('#shade')?.remove()}

function bindDragToClose(shade,sheet){
  let startX=0,startY=0,lastX=0,lastY=0,tracking=false,mode=null,edgeStart=false,closing=false;
  const EDGE=34,LOCK=8,CLOSE_Y=110;
  const clearTransition=()=>{sheet.style.transition='none'};
  const reset=()=>{sheet.style.transition='transform .24s cubic-bezier(.22,.72,.24,1)';sheet.style.transform='translate3d(0,0,0)'};
  const finishClose=(axis,distance)=>{
    if(closing)return;
    closing=true;
    sheet.style.transition='transform .22s cubic-bezier(.4,0,1,1)';
    sheet.style.transform=axis==='x'?`translate3d(${distance}px,0,0)`:`translate3d(0,${distance}px,0)`;
    shade.style.transition='opacity .22s ease';
    shade.style.opacity='0';
    const done=()=>closeSheet();
    sheet.addEventListener('transitionend',done,{once:true});
    setTimeout(done,260);
  };
  sheet.addEventListener('touchstart',e=>{
    if(closing||e.touches.length!==1)return;
    const t=e.touches[0];
    startX=lastX=t.clientX;
    startY=lastY=t.clientY;
    edgeStart=startX<=EDGE;
    tracking=true;
    mode=null;
    clearTransition();
  },{passive:true});
  sheet.addEventListener('touchmove',e=>{
    if(!tracking||closing||e.touches.length!==1)return;
    const t=e.touches[0];
    lastX=t.clientX;
    lastY=t.clientY;
    const dx=lastX-startX,dy=lastY-startY,ax=Math.abs(dx),ay=Math.abs(dy);
    if(!mode){
      if(edgeStart&&dx>LOCK&&ax>ay*1.05)mode='x';
      else if(dy>LOCK&&ay>ax*1.05)mode='y';
      else if((dx<-LOCK&&ax>ay)||(dy<-LOCK&&ay>ax))mode='ignore';
    }
    if(mode==='x'){
      e.preventDefault();
      sheet.style.transform=`translate3d(${Math.max(0,dx)}px,0,0)`;
    }else if(mode==='y'){
      e.preventDefault();
      sheet.style.transform=`translate3d(0,${Math.max(0,dy)}px,0)`;
    }
  },{passive:false});
  sheet.addEventListener('touchend',()=>{
    if(!tracking||closing)return;
    tracking=false;
    const dx=Math.max(0,lastX-startX),dy=Math.max(0,lastY-startY);
    const closeX=Math.max(90,Math.min(140,sheet.offsetWidth*.28));
    if(mode==='y'&&dy>=CLOSE_Y)return finishClose('y',sheet.offsetHeight+40);
    if(mode==='x'&&dx>=closeX)return finishClose('x',sheet.offsetWidth+40);
    reset();
  },{passive:true});
  sheet.addEventListener('touchcancel',()=>{if(!closing){tracking=false;reset()}},{passive:true});
}

function openSheet(){
  const listId=currentListId();
  if(!listId)return alert('先にリストを選択してください');
  closeSheet();
  document.body.insertAdjacentHTML('beforeend',`<div class="shade" id="shade"><section class="sheet" data-priority-picker="ready" data-item-priority="normal"><div class="handle"></div><button id="cancel">キャンセル</button><em>NEW ITEM</em><h1>何を買いますか？</h1><input id="name" placeholder="商品名"><label>優先度</label><div class="chips"><button type="button" data-choice="urgent">● 早急</button><button type="button" data-choice="normal">● 通常</button><button type="button" data-choice="any">● いつでも</button></div><button type="button" class="priority-add">リストに追加</button></section></div>`);
  const shade=document.querySelector('#shade'),sheet=shade?.querySelector('.sheet');
  if(!shade||!sheet)return;
  Object.assign(sheet.style,{height:'90%',maxHeight:'calc(100dvh - 18px)'});
  const add=sheet.querySelector('.priority-add');
  Object.assign(add.style,{width:'100%',height:'56px',border:'0',borderRadius:'16px',background:'var(--accent,#b9f486)',color:'var(--accent-ink,#071006)',fontWeight:'800',fontSize:'18px',marginTop:'18px'});
  paint(sheet);
  sheet.querySelectorAll('[data-choice]').forEach(button=>button.onclick=e=>{e.preventDefault();e.stopPropagation();sheet.dataset.itemPriority=button.dataset.choice;paint(sheet)});
  sheet.querySelector('#cancel').onclick=closeSheet;
  shade.onclick=e=>{if(e.target===shade)closeSheet()};
  bindDragToClose(shade,sheet);
  add.onclick=()=>addItem(sheet,add,listId);
  sheet.querySelector('#name')?.focus();
}

function showOptimistic(name,priority){
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const main=document.querySelector('#app main');
    if(!main||!document.querySelector('nav [data-tab="list"].on'))return;
    const key=priority==='urgent'?'urgent':priority==='normal'?'normal':'any';
    const group=[...main.querySelectorAll(':scope > .priority-group')].find(g=>g.querySelector('.priority-heading')?.classList.contains(key));
    if(!group)return;
    const row=document.createElement('div');
    row.className='row optimistic';
    row.innerHTML='<button class="check" disabled></button><div><strong></strong></div>';
    row.querySelector('strong').textContent=name;
    group.querySelector('.rows')?.appendChild(row);
  }));
}

async function addItem(sheet,button,listId){
  const name=sheet.querySelector('#name')?.value.trim();
  const priority=sheet.dataset.itemPriority||'normal';
  if(!name)return alert('商品名を入力してください');
  if(!listId)return alert('先にリストを選択してください');
  button.disabled=true;
  closeSheet();
  document.querySelector('nav [data-tab="list"]')?.click();
  showOptimistic(name,priority);
  try{
    const response=await fetch(`/api/lists/${listId}/items`,{method:'POST',headers:authHeaders(),body:JSON.stringify({name,priority})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw Error(data.error||'通信エラー');
    await window.__listellRefresh?.();
  }catch(error){
    await window.__listellRefresh?.();
    alert(error.message);
  }
}

document.addEventListener('click',event=>{
  const list=event.target.closest?.('[data-list]');
  if(list?.dataset.list)sessionStorage.setItem('listell_selected_list_id',list.dataset.list);
  const addTab=event.target.closest?.('nav [data-tab="add"]');
  if(!addTab)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  openSheet();
},true);
