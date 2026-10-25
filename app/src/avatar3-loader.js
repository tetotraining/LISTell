const avatar3Src='/avatar-green-3-fixed.png?v=20261026-4';
export const avatar3Placeholder=avatar3Src;
export function avatar3DataUrl(){return Promise.resolve(avatar3Src)}
export async function setAvatar3(img){if(!img)return;img.src=avatar3Src;img.dataset.source=avatar3Src;img.style.imageRendering='auto';img.style.objectFit='contain';img.style.objectPosition='center'}
export function hydrateAvatar3(root=document){root?.querySelectorAll?.('img[data-avatar3]').forEach(img=>{if(img.dataset.avatar3Ready==='1'&&img.src.includes('avatar-green-3-fixed.png'))return;img.dataset.avatar3Ready='1';setAvatar3(img)})}
new MutationObserver(()=>hydrateAvatar3()).observe(document.documentElement,{childList:true,subtree:true});
hydrateAvatar3();
