export default {
  plugins: [
    {
      name: 'listell-fast-history-bridge',
      enforce: 'pre',
      transform(code, id) {
        if (!id.endsWith('/src/main.js')) return null;
        let next=code;
        if (!next.includes("import './recovery-flow.js';")) {
          next="import './recovery-flow.js';"+next;
        }
        const marker = 'function toast(';
        if (next.includes(marker) && !next.includes('__listellOpenHistoryForList')) {
          const bridge = `window.__listellHistoryLists=()=>state.lists;\nwindow.__listellOpenHistoryForList=async(id,prefetched)=>{const selected=state.lists.find(x=>String(x.id)===String(id));if(!selected)throw Error('リストが見つかりません');localStorage.setItem('listell_selected_list_id',String(selected.id));state.list=selected;state.tab='menu';state.panel='history';let cached=null;try{cached=prefetched?await prefetched:null}catch{}if(cached){state.list={...selected,role:cached.role};app.innerHTML='<main>'+historyView(state.list,cached.history,cached.role)+'</main>'+nav();bind()}else{await openPanel('history')}api(\`lists/\${selected.id}/items\`).then(s=>{if(String(state.list?.id)===String(selected.id)){state.items=s.items;state.list={...state.list,role:s.role}}}).catch(()=>{})};\nwindow.__listellCompleteRecovery=async data=>{if(!data?.token||!data?.user)throw Error('ログイン情報を取得できませんでした');token=data.token;localStorage.setItem('listell_token',token);user=data.user;state.tab='list';state.panel=null;await load();startPolling()};\n`;
          next=next.replace(marker, bridge + marker);
        }
        next=next.replace(
          "if(!state.list||!state.lists.some(x=>x.id===state.list.id))state.list=state.lists[0]||null;",
          "if(!state.list||!state.lists.some(x=>x.id===state.list.id)){const saved=localStorage.getItem('listell_selected_list_id');state.list=state.lists.find(x=>String(x.id)===String(saved))||state.lists[0]||null}if(state.list)localStorage.setItem('listell_selected_list_id',String(state.list.id));"
        );
        next=next.replace(
          "window.__listellSelectNewList=async list=>{if(!list?.id)return;state.list=list;",
          "window.__listellSelectNewList=async list=>{if(!list?.id)return;state.list=list;localStorage.setItem('listell_selected_list_id',String(list.id));"
        );
        next=next.replace(
          "state.list=state.lists.find(x=>x.id===b.dataset.list);await load(false);",
          "state.list=state.lists.find(x=>x.id===b.dataset.list);if(state.list)localStorage.setItem('listell_selected_list_id',String(state.list.id));await load(false);"
        );
        return next===code?null:{code:next,map:null};
      },
    },
  ],
};
