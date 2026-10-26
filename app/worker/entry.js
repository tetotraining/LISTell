import app from './index.js';
import{listIconsApi}from'./list-icons.js';
import{accountProfileApi}from'./account-profile.js';
import{recoveryApi}from'./recovery.js';
const enc=new TextEncoder();
const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
async function sha(v){return b64(await crypto.subtle.digest('SHA-256',enc.encode(v)))}
async function me(req,db){const raw=req.headers.get('authorization')?.replace(/^Bearer /,'');if(!raw)return null;return db.prepare('SELECT u.id,u.login_id,u.nickname FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').bind(await sha(raw),Date.now()).first()}
async function syncIssuedRecoveryCode(response,env){if(!response.ok)return response;try{const data=await response.clone().json();if(data?.recoveryCode&&data?.user?.id)await env.DB.prepare('UPDATE users SET recovery_code_display=? WHERE id=?').bind(data.recoveryCode,data.user.id).run()}catch{}return response}
async function readBody(req){if(req.method==='GET'||req.method==='HEAD')return{};try{return await req.json()}catch{return{}}}
export default{async fetch(req,env){const url=new URL(req.url);const isRecovery=url.pathname==='/api/recover/verify'||url.pathname==='/api/recover';if(isRecovery){const result=await recoveryApi(req,env,url,await readBody(req));if(result)return result}if(req.method==='POST'&&url.pathname==='/api/register')return syncIssuedRecoveryCode(await app.fetch(req,env),env);const isIcon=url.pathname==='/api/list-icons'||/^\/api\/lists\/[^/]+\/icon$/.test(url.pathname);const isAccount=url.pathname==='/api/account'||url.pathname==='/api/account/profile-icon'||url.pathname==='/api/account/recovery/regenerate';if(!isIcon&&!isAccount)return app.fetch(req,env);const u=await me(req,env.DB);if(!u)return new Response(JSON.stringify({error:'未ログインです'}),{status:401,headers:{'content-type':'application/json;charset=UTF-8'}});const body=await readBody(req);const r=isAccount?await accountProfileApi(req,env,u,url,body):await listIconsApi(req,env,u,url,body);return r||app.fetch(req,env)}};
