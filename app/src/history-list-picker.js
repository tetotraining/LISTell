const token=()=>localStorage.getItem('listell_token');
const request=async path=>{const r=await fetch('/api/'+path,{headers:{'content-type':'application/json',...(token()?{authorization:'Bearer '+token()}:{})}});const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||'通信エラー');return j};
const iconKey=id=>`listell_list_icon_${id}`;
const icons=[
`<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><rect x="10" y="7" width="44" height="50" rx="7"/><circle cx="21" cy="22" r="2.8" fill="currentColor" stroke="none"/><path d="M29 22h15"/><circle cx="21" cy="32" r="2.8" fill="currentColor" stroke="none"/><path d="M29 32h15"/><circle cx="21" cy="42" r="2.8" fill="currentColor" stroke="none"/><path d="M29 42h15"/></svg>`,
`<svg viewBox="0 0 1536 1024"><path fill="currentColor" d="M1232 211L1072 203L1019 314L394 326L379 369L471 641L930 655L911 681L526 684L480 751L494 813L544 839L600 822L627 778L615 721L827 721L811 758L826 812L876 838L924 824L953 770L932 716L971 669L1087 250L1215 249Z"/></svg>`,
`<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 30 32 8l26 22"/><path d="M11 27v27c0 2 2 4 4 4h34c2 0 4-2 4-4V27"/><path d="M26 58V39h12v19"/><path d="M43 17V9h8v15"/></svg>`,
`<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15h40v36H12z"/><circle cx="32" cy="33" r="10"/></svg>`,
`<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 39h44l-5 13H15z"/><path d="M17 39 13 22h38l-4 17"/></svg>`,
`<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 33c0-5 5-8 10-8l12 1 13-14c3-3 7-3 8-1 1 1 0 3-1 5l-8 13 13 3 5-6c2-2 5-2 6 0l-3 8 3 8c-1 2-4 2-6 0l-5-6-13 3 8 13c1 2 2 4 1 5-1 2-5 2-8-1L29 40l-12 1c-5 0-10-3-10-8Z"/></svg>`,
`<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 11h36c3 0 5 2 5 5v27H9V16c0-3 2-5 5-5Z"/><path d="M9 43 4 50c-2 3 0 6 4 6h48c4 0 6-3 4-6l-5-7H9Z"/></svg>`,
`<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="5"><path d="M8 25h48v14H8z"/><path d="M15 18v28M49 18v28"/></svg>`,
`<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4.5"><path d="M12 38c4-13 10-17 20-17s16 4 20 17l4 10c1 4-3 7-7 4l-9-7H24l-9 7c-4 3-8 0-7-4z"/><circle cx="23" cy="34" r="2" fill="currentColor"/><circle cx="42" cy="32" r="2" fill="currentColor"/></svg>`
];
const iconSvg=n=>icons[Math.max(0,Math.min(icons.length-1,Number(n||1)-1))];
const close=()=>document.querySelector('#historyListShade')?.remove();
const waitFor=(fn,timeout=3000)=>new Promise((resolve,reject)=>{const found=fn();if(found)return resolve(found);const obs=new MutationObserver(()=>{const value=fn();if(value){clearTimeout(timer);obs.disconnect();resolve(value)}});obs.observe(document.documentElement,{childList:true,subtree:true});const timer=setTimeout(()=>{obs.disconnect();reject(Error('画面の切り替えに失敗しました'))},timeout)});
let bypass=false;
async function openHistoryForList(id){
  sessionStorage.setItem('listell_selected_list_id',String(id));
  const menu=document.querySelector('nav [data-tab="menu"]');
  if(!menu)throw Error('メニューを開けませんでした');
  menu.click();
  const listRow=await waitFor(()=>document.querySelector(`[data-list="${CSS.escape(String(id))}"]`));
  listRow.click();
  await waitFor(()=>{const row=document.querySelector(`[data-list="${CSS.escape(String(id))}"]`);return row?.querySelector(':scope > b')?.textContent?.includes('✓')?row:null});
  const manage=await waitFor(()=>document.querySelector('[data-panel="manage"]'));
  manage.click();
  const history=await waitFor(()=>document.querySelector('#listManagementCard [data-panel="history"]'));
  bypass=true;
  history.click();
  await waitFor(()=>document.querySelector('#app main h1')?.textContent?.trim()==='購入履歴');
  close();
}
async function openPicker(){
  close();
  try{
    const {lists=[]}=await request('lists');
    document.body.insertAdjacentHTML('beforeend',`<div class="shade" id="historyListShade"><section class="sheet list-icon-sheet"><div class="handle"></div><button type="button" class="dialog-cancel" id="historyListCancel">キャンセル</button><em>PURCHASE HISTORY</em><h1>購入履歴を見るリストを選択</h1><div class="icon-list-choice">${lists.map(x=>`<button type="button" data-history-list="${x.id}"><span class="custom-list-icon">${iconSvg(localStorage.getItem(iconKey(x.id))||1)}</span><strong>${x.name}</strong><b>›</b></button>`).join('')}</div></section></div>`);
    const shade=document.querySelector('#historyListShade'),sheet=shade.querySelector('.sheet');
    shade.querySelector('#historyListCancel').onclick=close;
    shade.onclick=e=>{if(e.target===shade)close()};
    let startY=0,lastY=0,tracking=false;
    sheet.addEventListener('touchstart',e=>{if(e.touches.length!==1)return;startY=lastY=e.touches[0].clientY;tracking=true},{passive:true});
    sheet.addEventListener('touchmove',e=>{if(!tracking||e.touches.length!==1)return;lastY=e.touches[0].clientY},{passive:true});
    sheet.addEventListener('touchend',()=>{if(!tracking)return;tracking=false;if(lastY-startY>=70)close()},{passive:true});
    sheet.addEventListener('touchcancel',()=>{tracking=false},{passive:true});
    shade.querySelectorAll('[data-history-list]').forEach(button=>button.onclick=async()=>{button.disabled=true;try{await openHistoryForList(button.dataset.historyList)}catch(error){button.disabled=false;alert(error.message)}});
  }catch(error){alert(error.message)}
}
document.addEventListener('click',event=>{
  const history=event.target.closest('#listManagementCard [data-panel="history"]');
  if(!history)return;
  if(bypass){bypass=false;return}
  event.preventDefault();
  event.stopImmediatePropagation();
  openPicker();
},{capture:true});
