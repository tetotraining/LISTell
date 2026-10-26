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

function openSheet(){
  const listId=currentListId();
  if(!listId)return alert('先にリストを選択してください');
  closeSheet();
  document.body.insertAdjacentHTML('beforeend',`<div class="shade" id="shade"><section class="sheet" data-priority-picker="ready" data-item-priority="normal"><div class="handle"></div><button id="cancel">キャンセル</button><em>NEW ITEM</em><h1>何を買いますか？</h1><input id="name" placeholder="商品名"><label>優先度</label><div class="chips"><button type="button" data-choice="urgent">● 早急</button><button type="button" data-choice="normal">● 通常</button><button type="button" data-choice="any">● いつでも</button></div><button type="button" class="priority-add">リストに追加</button></section></div>`);
  const shade=document.querySelector('#shade'),sheet=shade?.querySelector('.sheet');
  if(!shade||!sheet)return;
  const add=sheet.querySelector('.priority-add');
  Object.assign(add.style,{width:'100%',height:'56px',border:'0',borderRadius:'16px',background:'var(--accent,#b9f486)',color:'var(--accent-ink,#071006)',fontWeight:'800',fontSize:'18px',marginTop:'18px'});
  paint(sheet);
  sheet.querySelectorAll('[data-choice]').forEach(button=>button.onclick=e=>{e.preventDefault();e.stopPropagation();sheet.dataset.itemPriority=button.dataset.choice;paint(sheet)});
  sheet.querySelector('#cancel').onclick=closeSheet;
  shade.onclick=e=>{if(e.target===shade)closeSheet()};
  let startY=0,lastY=0;
  sheet.addEventListener('touchstart',e=>{if(e.touches.length!==1)return;startY=lastY=e.touches[0].clientY},{passive:true});
  sheet.addEventListener('touchmove',e=>{if(e.touches.length!==1)return;lastY=e.touches[0].clientY;const d=Math.max(0,lastY-startY);sheet.style.transform=`translateY(${d}px)`},{passive:true});
  sheet.addEventListener('touchend',()=>{const d=lastY-startY;if(d>90)closeSheet();else{sheet.style.transform='';sheet.style.transition='transform .18s ease'}},{passive:true});
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
