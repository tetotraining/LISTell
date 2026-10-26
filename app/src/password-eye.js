const token=()=>localStorage.getItem('listell_token');
const request=async(path,body,withAuth=true)=>{const r=await fetch('/api/'+path,{method:'POST',headers:{'content-type':'application/json',...(withAuth&&token()?{authorization:'Bearer '+token()}: {})},body:JSON.stringify(body)});const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||'通信エラー');return j};
const close=()=>document.querySelector('#passwordChangeShade')?.remove();
const style=document.createElement('style');
style.textContent=`.account-credentials{display:block!important}.account-credentials .account-field{display:block;padding:14px 16px;border-bottom:1px solid var(--line)}.account-credentials .account-field:last-child{border-bottom:0}.account-field small{display:block;margin-bottom:6px;opacity:.62}.account-field strong{display:block}.password-line{display:flex;align-items:center;justify-content:space-between;gap:10px}.password-line strong{letter-spacing:.08em}.password-line button{border:0;background:transparent;color:var(--accent,#fff);padding:4px 0;font:inherit;font-weight:700;white-space:nowrap}.password-change-sheet{min-height:430px}.password-change-sheet h1{margin-bottom:18px}.password-fields{display:grid;gap:12px}.password-field{display:grid;gap:7px}.password-field span{font-size:13px;color:var(--muted,#999)}.password-field input{width:100%;box-sizing:border-box;min-height:52px;border-radius:14px;border:1px solid var(--line,#333);background:var(--card,#171717);color:var(--text,#fff);padding:0 14px;font:inherit;outline:none}.password-field input:focus{border-color:var(--accent,#fff)}.password-change-error{min-height:20px;margin:10px 0 0;color:#e5484d;font-size:13px}.password-change-error.success{color:var(--accent,#fff)}.password-change-actions{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:18px}.password-change-actions button{min-height:52px;border:0;border-radius:14px;font:inherit;font-weight:800}.password-change-actions #passwordChangeYes{background:var(--accent,#fff);color:#000}.password-change-actions #passwordChangeNo{background:var(--card,#222);color:var(--text,#fff)}`;
document.head.appendChild(style);

function openPasswordChange(){
  close();
  document.body.insertAdjacentHTML('beforeend',`<div class="shade" id="passwordChangeShade"><section class="sheet list-icon-sheet password-change-sheet"><div class="handle"></div><em>CHANGE PASSWORD</em><h1>パスワードを変更</h1><div class="password-fields"><label class="password-field"><span>復旧コード</span><input id="recoveryCode" autocomplete="one-time-code"></label><label class="password-field"><span>新しいパスワード</span><input id="newPassword" type="password" autocomplete="new-password"></label><label class="password-field"><span>新しいパスワードを再入力</span><input id="confirmPassword" type="password" autocomplete="new-password"></label></div><p class="password-change-error" id="passwordChangeError"></p><div class="password-change-actions"><button type="button" id="passwordChangeYes">変更する</button><button type="button" id="passwordChangeNo">キャンセル</button></div></section></div>`);
  const shade=document.querySelector('#passwordChangeShade'),sheet=shade.querySelector('.sheet'),error=shade.querySelector('#passwordChangeError');
  shade.querySelector('#passwordChangeNo').onclick=close;
  shade.onclick=e=>{if(e.target===shade)close()};
  let startY=0,startX=0,lastY=0,lastX=0,tracking=false;
  sheet.addEventListener('touchstart',e=>{if(e.touches.length!==1)return;const t=e.touches[0];startY=lastY=t.clientY;startX=lastX=t.clientX;tracking=true},{passive:true});
  sheet.addEventListener('touchmove',e=>{if(!tracking||e.touches.length!==1)return;const t=e.touches[0];lastY=t.clientY;lastX=t.clientX;if(Math.abs(lastX-startX)>Math.abs(lastY-startY)*1.2)tracking=false},{passive:true});
  sheet.addEventListener('touchend',()=>{if(!tracking)return;tracking=false;const dy=lastY-startY,dx=Math.abs(lastX-startX);if(dy>=70&&dy>dx*1.2)close()},{passive:true});
  shade.querySelector('#passwordChangeYes').onclick=async()=>{
    const yes=shade.querySelector('#passwordChangeYes'),code=shade.querySelector('#recoveryCode').value.trim(),next=shade.querySelector('#newPassword').value,confirm=shade.querySelector('#confirmPassword').value;
    error.classList.remove('success');error.textContent='';
    if(!code){error.textContent='復旧コードを入力してください';return}
    if(next.length<4){error.textContent='パスワードは4文字以上で入力してください';return}
    if(next!==confirm){error.textContent='パスワードが一致しません';return}
    yes.disabled=true;
    try{await request('recover',{code,password:next},false);localStorage.removeItem('listell_token');error.classList.add('success');error.textContent='パスワードを変更しました';setTimeout(()=>location.reload(),700)}catch(e){yes.disabled=false;error.textContent=e.message}
  };
  shade.querySelector('#recoveryCode').focus();
}

document.addEventListener('click',e=>{const trigger=e.target?.closest?.('#passwordEye');if(!trigger)return;e.preventDefault();e.stopImmediatePropagation();openPasswordChange()},{capture:true});
