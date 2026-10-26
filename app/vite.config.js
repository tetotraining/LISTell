export default {
  plugins: [
    {
      name: 'listell-fast-history-bridge',
      enforce: 'pre',
      transform(code, id) {
        if (!id.endsWith('/src/main.js')) return null;
        const marker = 'function toast(';
        if (!code.includes(marker) || code.includes('__listellOpenHistoryForList')) return null;
        const bridge = `window.__listellOpenHistoryForList=async id=>{const selected=state.lists.find(x=>String(x.id)===String(id));if(!selected)throw Error('リストが見つかりません');state.list=selected;state.tab='menu';state.panel='history';api(\`lists/\${selected.id}/items\`).then(s=>{if(String(state.list?.id)===String(selected.id)){state.items=s.items;state.list={...state.list,role:s.role}}}).catch(()=>{});await openPanel('history')};\n`;
        return { code: code.replace(marker, bridge + marker), map: null };
      },
    },
  ],
};
