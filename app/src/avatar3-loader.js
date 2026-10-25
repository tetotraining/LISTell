const placeholder='/avatar-green-3.svg?v=20261026-10';
const parts=['/avatar-green-3-hq-part00.txt?v=20261026-10','/avatar-green-3-hq-part01.txt?v=20261026-10','/avatar-green-3-hq-part02.txt?v=20261026-10'];
let dataPromise=null;
export const avatar3Placeholder=placeholder;
export function avatar3DataUrl(){
  if(!dataPromise)dataPromise=Promise.all(parts.map(async u=>{const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw Error(`avatar3 ${r.status}`);return(await r.text()).trim()})).then(p=>'data:image/jpeg;base64,'+p.join(''));
  return dataPromise;
}
export async function setAvatar3(img){
  if(!img)return;
  try{
    const src=await avatar3DataUrl();
    if(!img.isConnected)return;
    img.src=src;
    img.dataset.source=src;
    img.style.imageRendering='auto';
    img.style.objectFit='contain';
    img.style.objectPosition='center';
  }catch(e){
    console.error('avatar 3 load failed',e);
    img.src=placeholder;
  }
}
export function hydrateAvatar3(root=document){root?.querySelectorAll?.('img[data-avatar3]').forEach(img=>{if(img.dataset.avatar3Ready==='1')return;img.dataset.avatar3Ready='1';setAvatar3(img)})}
new MutationObserver(()=>hydrateAvatar3()).observe(document.documentElement,{childList:true,subtree:true});
hydrateAvatar3();
