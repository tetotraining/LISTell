const style=document.createElement('style');
style.textContent=`.row.purchasing{height:0!important;min-height:0!important;max-height:0!important;padding:0!important;margin:0!important;border:0!important;overflow:hidden!important;gap:0!important;transition:opacity .07s ease-out,transform .07s ease-out!important;opacity:0!important;transform:translateX(5px)!important}`;
document.head.appendChild(style);

const meta={urgent:{label:'早急',order:0},normal:{label:'通常',order:1},any:{label:'いつでも',order:2}};
const rowKey=row=>{const t=row.querySelector('div small')?.textContent?.trim();return t==='早急'?'urgent':t==='通常'?'normal':t==='いつでも'?'any':null};
function ensureGroup(main,key){
  let group=[...main.querySelectorAll(':scope > .priority-group')].find(g=>g.querySelector('.priority-heading')?.classList.contains(key));
  if(group)return group;
  group=document.createElement('section');
  group.className='priority-group';
  group.innerHTML=`<h2 class="priority-heading ${key}">${meta[key].label}</h2><div class="rows all-group-rows"></div>`;
  const before=[...main.querySelectorAll(':scope > .priority-group')].find(g=>{const h=g.querySelector('.priority-heading');const k=h?.classList.contains('urgent')?'urgent':h?.classList.contains('normal')?'normal':'any';return meta[key].order<meta[k].order});
  if(before)before.before(group);else main.appendChild(group);
  return group;
}
function normalizeMixedPriorityRows(){
  const main=document.querySelector('#app main');
  if(!main)return;
  const direct=main.querySelector(':scope > .rows');
  if(!direct||!main.querySelector(':scope > .priority-group'))return;
  [...direct.querySelectorAll(':scope > .row')].forEach(row=>{
    const key=rowKey(row);if(!key)return;
    const box=ensureGroup(main,key).querySelector('.rows');
    if(!box)return;
    const optimistic=box.querySelector(':scope > .row.optimistic');
    if(optimistic)box.insertBefore(row,optimistic);else box.appendChild(row);
  });
  if(!direct.querySelector(':scope > .row'))direct.remove();
}
const app=document.querySelector('#app');
if(app)new MutationObserver(()=>queueMicrotask(normalizeMixedPriorityRows)).observe(app,{childList:true,subtree:true});
normalizeMixedPriorityRows();
