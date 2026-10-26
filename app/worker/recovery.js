const enc=new TextEncoder();
const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const bytes=n=>crypto.getRandomValues(new Uint8Array(n));
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const normalizeRecoveryCode=value=>String(value??'').normalize('NFKC').toUpperCase().replace(/[^A-Z2-9]/g,'');
export async function hashRecoveryCode(value){return b64(await crypto.subtle.digest('SHA-256',enc.encode(normalizeRecoveryCode(value))))}
const makeCode=()=>Array.from(bytes(12),x=>alphabet[x%alphabet.length]).join('');

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
