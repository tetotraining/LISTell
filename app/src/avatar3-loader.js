const placeholder='/avatar-green-3.svg?v=20261026-12';
const parts=[
  '/avatar-green-3-v11-part00.txt?v=20261026-12',
  '/avatar-green-3-v11-part01.txt?v=20261026-12',
  '/avatar-green-3-v11-part02.txt?v=20261026-12',
  '/avatar-green-3-v11-part03.txt?v=20261026-12',
  '/avatar-green-3-v11-part04.txt?v=20261026-12',
  '/avatar-green-3-v11-part05a.txt?v=20261026-12',
  '/avatar-green-3-v11-part05b.txt?v=20261026-12',
  '/avatar-green-3-v11-part06.txt?v=20261026-12',
  '/avatar-green-3-v11-part07.txt?v=20261026-12',
  '/avatar-green-3-v11-part08a.txt?v=20261026-12',
  '/avatar-green-3-v11-part08b.txt?v=20261026-12',
  '/avatar-green-3-v11-part09.txt?v=20261026-12',
  '/avatar-green-3-v11-part10.txt?v=20261026-12',
  '/avatar-green-3-v11-part11-0.txt?v=20261026-12',
  '/avatar-green-3-v11-part11-1.txt?v=20261026-12',
  '/avatar-green-3-v11-part11-2.txt?v=20261026-12',
  '/avatar-green-3-v11-part11-3.txt?v=20261026-12',
  '/avatar-green-3-v11-part12.txt?v=20261026-12'
];
let objectUrlPromise=null;
export const avatar3Placeholder=placeholder;
async function avatar3ObjectUrl(){
  if(!objectUrlPromise)objectUrlPromise=Promise.all(parts.map(async u=>{
    const r=await fetch(u,{cache:'no-store'});
    if(!r.ok)throw Error(`avatar3 ${r.status}`);
    return (await r.text()).trim();
  })).then(chunks=>{
    const binary=atob(chunks.join(''));
    const bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes],{type:'image/jpeg'}));
  });
  return objectUrlPromise;
}
export function avatar3DataUrl(){return avatar3ObjectUrl()}
export async function setAvatar3(img){
  if(!img)return;
  img.src=placeholder;
  img.style.imageRendering='auto';
  img.style.objectFit='contain';
  img.style.objectPosition='center';
  try{
    const src=await avatar3ObjectUrl();
    if(!img.isConnected)return;
    const probe=new Image();
    probe.src=src;
    await probe.decode();
    img.src=src;
    img.dataset.source=src;
  }catch(e){
    console.error('avatar 3 load failed',e);
    img.src=placeholder;
  }
}
export function hydrateAvatar3(root=document){
  root?.querySelectorAll?.('img[data-avatar3]').forEach(img=>{
    if(img.dataset.avatar3Ready==='1')return;
    img.dataset.avatar3Ready='1';
    setAvatar3(img);
  });
}
new MutationObserver(()=>hydrateAvatar3()).observe(document.documentElement,{childList:true,subtree:true});
hydrateAvatar3();
