const placeholder='data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
const cacheKey='listell_avatar3_v3';
const parts=Array.from({length:11},(_,i)=>`/avatar-green-3-part${String(i).padStart(2,'0')}.txt?v=20261026-3`);
let cached='';
try{cached=localStorage.getItem(cacheKey)||''}catch{}
let dataPromise=cached?Promise.resolve(cached):null;
export const avatar3Placeholder=placeholder;
export function avatar3DataUrl(){if(!dataPromise)dataPromise=Promise.all(parts.map(async u=>{const r=await fetch(u);if(!r.ok)throw Error(`avatar3 ${r.status}`);return(await r.text()).trim()})).then(p=>{const src='data:image/jpeg;base64,'+p.join('');try{localStorage.setItem(cacheKey,src)}catch{}return src});return dataPromise}
export async function setAvatar3(img){if(!img)return;try{const src=await avatar3DataUrl();if(!img.isConnected)return;img.src=src;img.dataset.source=src}catch(e){console.error('avatar 3 load failed',e);img.src='/avatar-green-3.svg?v=20261025-1'}}
export function hydrateAvatar3(root=document){root?.querySelectorAll?.('img[data-avatar3]').forEach(img=>{if(img.dataset.avatar3Ready==='1')return;img.dataset.avatar3Ready='1';setAvatar3(img)})}
new MutationObserver(()=>hydrateAvatar3()).observe(document.documentElement,{childList:true,subtree:true});
hydrateAvatar3();
