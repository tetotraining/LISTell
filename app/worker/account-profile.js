import{issueRecoveryCode,syncRecoveryRecord}from'./recovery.js';
const J={headers:{'content-type':'application/json;charset=UTF-8'}};
const out=(v,s=200)=>new Response(JSON.stringify(v),{...J,status:s});
export async function accountProfileApi(req,env,u,url,body={}){
  const db=env.DB;
  if(url.pathname==='/api/account'&&req.method==='GET'){
    const x=await db.prepare('SELECT nickname,login_id,profile_icon,recovery_code_display FROM users WHERE id=?').bind(u.id).first();
    if(!x)return out({error:'アカウントが見つかりません'},404);
    let recoveryCode=x.recovery_code_display;
    if(!recoveryCode)recoveryCode=await issueRecoveryCode(db,u.id);
    else await syncRecoveryRecord(db,u.id,recoveryCode);
    return out({user:{id:u.id,nickname:x.nickname,loginId:x.login_id,profileIcon:Number(x.profile_icon)||1,recoveryCode}});
  }
  if(url.pathname==='/api/account/profile-icon'&&req.method==='POST'){
    const icon=Number(body.profileIcon);
    if(!Number.isInteger(icon)||icon<1||icon>6)return out({error:'アイコンが不正です'},400);
    await db.prepare('UPDATE users SET profile_icon=? WHERE id=?').bind(icon,u.id).run();
    return out({ok:true,profileIcon:icon});
  }
  if(url.pathname==='/api/account/recovery/regenerate'&&req.method==='POST')return out({recoveryCode:await issueRecoveryCode(db,u.id)});
  return null;
}
