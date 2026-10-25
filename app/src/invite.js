import QRCode from 'qrcode';

const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export async function showInviteSheet(link,expiresAt=Date.now()+300000){
  document.querySelector('#inviteShade')?.remove();
  const qr=await QRCode.toDataURL(link,{width:240,margin:1,errorCorrectionLevel:'M'});
  document.body.insertAdjacentHTML('beforeend',`<div class="shade" id="inviteShade"><section class="sheet invite-sheet"><div class="handle"></div><button id="inviteClose" style="color:var(--accent)">キャンセル</button><em>INVITE</em><h1>リストへ招待</h1><p class="invite-expiry">有効期限 <strong id="inviteCountdown">5:00</strong></p><div class="invite-qr"><img src="${qr}" alt="招待QRコード" width="240" height="240"></div><div class="invite-link" id="inviteLink">${esc(link)}</div><button class="primary" id="inviteCopy">URLをコピー</button><p class="invite-note">QRコードまたはURLを共有してください</p></section></div>`);
  const shade=document.querySelector('#inviteShade'),close=document.querySelector('#inviteClose'),copy=document.querySelector('#inviteCopy'),count=document.querySelector('#inviteCountdown');
  let timer;
  const stop=()=>{clearInterval(timer);shade?.remove()};
  close.onclick=stop;
  shade.onclick=e=>{if(e.target===shade)stop()};
  copy.onclick=async()=>{try{await navigator.clipboard.writeText(link);copy.textContent='コピーしました';setTimeout(()=>{if(copy.isConnected)copy.textContent='URLをコピー'},1200)}catch{copy.textContent='コピーできませんでした'}};
  const tick=()=>{const left=Math.max(0,Math.ceil((expiresAt-Date.now())/1000)),m=Math.floor(left/60),s=String(left%60).padStart(2,'0');count.textContent=`${m}:${s}`;if(!left){clearInterval(timer);copy.disabled=true;copy.textContent='有効期限が切れました';count.textContent='0:00'}};
  tick();timer=setInterval(tick,1000);
}
