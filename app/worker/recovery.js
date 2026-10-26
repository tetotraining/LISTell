const enc=new TextEncoder();
const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const bytes=n=>crypto.getRandomValues(new Uint8Array(n));
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json;charset=UTF-8'}});

export const normalizeRecoveryCode=value=>String(value??'').normalize('NFKC').toUpperCase().replace(/[^A-Z2-9]/g,'');
export async function hashRecoveryCode(value){return b64(await crypto.subtle.digest('SHA-256',enc.encode(normalizeRecoveryCode(value))))}
const makeCode=()=>Array.from(bytes(12),x=>alphabet[x%alphabet.length]).join('');
async function passwordHash(password,salt){const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);return b64(await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:100000,hash:'SHA-256'},key,256))}
async function createSession(db,userId){const raw=b64(bytes(32)),tokenHash=await hashRaw(raw),now=Date.now();await db.prepare('DELETE FROM sessions WHERE expires_at<=?').bind(now).run();await db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)').bind(tokenHash,userId,now+2592000000,now).run();return raw}
async function hashRaw(value){return b64(await crypto.subtle.digest('SHA-256',enc.encode(value)))}

export async function syncRecoveryRecord(db,userId,recoveryCode){
  const normalized=normalizeRecoveryCode(recoveryCode);
  if(!normalized)return false;
  const codeHash=await hashRecoveryCode(normalized);
  await db.batch([
    db.prepare('DELETE FROM recovery_codes WHERE user_id=? AND code_hash<>?').bind(userId,codeHash),
    db.prepare('INSERT OR IGNORE INTO recovery_codes(code_hash,user_id,used_at,created_at) VALUES(?,?,NULL,?)').bind(codeHash,userId,Date.now()),
    db.prepare('UPDATE recovery_codes SET used_at=NULL WHERE code_hash=? AND user_id=?').bind(codeHash,userId)
  ]);
  return true;
}

export async function issueRecoveryCode(db,userId){
  const recoveryCode=makeCode();
  const codeHash=await hashRecoveryCode(recoveryCode);
  await db.batch([
    db.prepare('DELETE FROM recovery_codes WHERE user_id=?').bind(userId),
    db.prepare('INSERT INTO recovery_codes(code_hash,user_id,used_at,created_at) VALUES(?,?,NULL,?)').bind(codeHash,userId,Date.now()),
    db.prepare('UPDATE users SET recovery_code_display=? WHERE id=?').bind(recoveryCode,userId)
  ]);
  return recoveryCode;
}

export async function findUserByRecoveryCode(db,value){
  const recoveryCode=normalizeRecoveryCode(value);
  if(!recoveryCode)return null;
  return db.prepare('SELECT id,login_id,nickname,recovery_code_display FROM users WHERE recovery_code_display=? LIMIT 1').bind(recoveryCode).first();
}

export async function recoveryApi(req,env,url,body={}){
  if(url.pathname==='/api/recover/verify'&&req.method==='POST'){
    const user=await findUserByRecoveryCode(env.DB,body.code);
    if(!user)return json({error:'復旧コードが違います'},400);
    await syncRecoveryRecord(env.DB,user.id,user.recovery_code_display);
    return json({ok:true,loginId:user.login_id});
  }
  if(url.pathname==='/api/recover'&&req.method==='POST'){
    const normalized=normalizeRecoveryCode(body.code);
    const user=await findUserByRecoveryCode(env.DB,normalized);
    if(!user)return json({error:'復旧コードが違います'},400);
    if(!body.password||body.password.length<4)return json({error:'パスワードは4文字以上で入力してください'},400);
    const claim=await env.DB.prepare('UPDATE users SET recovery_code_display=NULL WHERE id=? AND recovery_code_display=?').bind(user.id,normalized).run();
    if(!claim?.meta?.changes)return json({error:'復旧コードが違います'},400);
    const salt=b64(bytes(16));
    await env.DB.batch([
      env.DB.prepare('UPDATE users SET password_hash=?,password_salt=? WHERE id=?').bind(await passwordHash(body.password,salt),salt,user.id),
      env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(user.id)
    ]);
    const recoveryCode=await issueRecoveryCode(env.DB,user.id);
    const token=await createSession(env.DB,user.id);
    return json({ok:true,recoveryCode,token,user:{id:user.id,loginId:user.login_id,nickname:user.nickname}});
  }
  return null;
}
