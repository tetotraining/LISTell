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

function ensureSheet(){
  const sheet=document.querySelector('#shade .sheet');
  if(!sheet)return;
  const choices=[...sheet.querySelectorAll('[data-choice]')];
  if(!choices.length)return;
  if(!sheet.dataset.itemPriority)sheet.dataset.itemPriority='normal';
  let add=sheet.querySelector('.priority-add');
  if(!add){
    add=document.createElement('button');
    add.type='button';
    add.className='priority-add';
    add.textContent='リストに追加';
    Object.assign(add.style,{width:'100%',height:'56px',border:'0',borderRadius:'16px',background:'var(--accent,#b9f486)',color:'var(--accent-ink,#071006)',fontWeight:'800',fontSize:'18px',marginTop:'18px'});
    choices[0].parentElement.insertAdjacentElement('afterend',add);
  }
  paint(sheet);
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

async function addItem(sheet,button){
  const name=sheet.querySelector('#name')?.value.trim();
  const priority=sheet.dataset.itemPriority||'normal';
  const listId=currentListId();
  if(!name)return alert('商品名を入力してください');
  if(!listId)return alert('先にリストを選択してください');
  button.disabled=true;
  document.querySelector('#shade')?.remove();
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
  const list=event.target.closest('[data-list]');
  if(list?.dataset.list)sessionStorage.setItem('listell_selected_list_id',list.dataset.list);

  const addTab=event.target.closest('nav [data-tab="add"]');
  if(addTab)queueMicrotask(ensureSheet);

  const choice=event.target.closest('#shade [data-choice]');
  if(choice){
    event.preventDefault();
    event.stopImmediatePropagation();
    const sheet=choice.closest('.sheet');
    if(!sheet)return;
    sheet.dataset.itemPriority=choice.dataset.choice;
    ensureSheet();
    return;
  }

  const add=event.target.closest('#shade .priority-add');
  if(add){
    event.preventDefault();
    event.stopImmediatePropagation();
    const sheet=add.closest('.sheet');
    if(sheet)addItem(sheet,add);
  }
},true);

const observer=new MutationObserver(()=>ensureSheet());
if(document.body)observer.observe(document.body,{childList:true,subtree:true});
else document.addEventListener('DOMContentLoaded',()=>observer.observe(document.body,{childList:true,subtree:true}),{once:true});
