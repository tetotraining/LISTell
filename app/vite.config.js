export default {
  plugins: [
    {
      name: 'listell-fast-history-bridge',
      enforce: 'pre',
      transform(code, id) {
        if (!id.endsWith('/src/main.js')) return null;
        const marker = 'function toast(';
        if (!code.includes(marker) || code.includes('__listellOpenHistoryForList')) return null;
        const bridge = `window.__listellHistoryLists=()=>state.lists;\nwindow.__listellOpenHistoryForList=async(id,prefetched)=>{const selected=state.lists.find(x=>String(x.id)===String(id));if(!selected)throw Error('リストが見つかりません');state.list=selected;state.tab='menu';state.panel='history';let cached=null;try{cached=prefetched?await prefetched:null}catch{}if(cached){state.list={...selected,role:cached.role};app.innerHTML='<main>'+historyView(state.list,cached.history,cached.role)+'</main>'+nav();bind()}else{await openPanel('history')}api(\`lists/\${selected.id}/items\`).then(s=>{if(String(state.list?.id)===String(selected.id)){state.items=s.items;state.list={...state.list,role:s.role}}}).catch(()=>{})};\n`;
        return { code: code.replace(marker, bridge + marker), map: null };
      },
    },
  ],
};
