import app from './index.js';
import{listIconsApi}from'./list-icons.js';
import{accountProfileApi}from'./account-profile.js';
const enc=new TextEncoder();
const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
async function sha(v){return b64(await crypto.subtle.digest('SHA-256',enc.encode(v)))}
async function me(req,db){const raw=req.headers.get('authorization')?.replace(/^Bearer /,'');if(!raw)return null;return db.prepare('SELECT u.id,u.login_id,u.nickname,s.token_hash FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').bind(await sha(raw),Date.now()).first()}
export default{async fetch(req,env){const url=new URL(req.url);const isIcon=url.pathname==='/api/list-icons'||/^\/api\/lists\/[^/]+\/icon$/.test(url.pathname);const isAccount=url.pathname==='/api/account'||url.pathname==='/api/account/profile-icon'||url.pathname==='/api/account/recovery/regenerate'||url.pathname==='/api/account/password';if(!isIcon&&!isAccount)return app.fetch(req,env);const u=await me(req,env.DB);if(!u)return new Response(JSON.stringify({error:'未ログインです'}),{status:401,headers:{'content-type':'application/json;charset=UTF-8'}});let body={};if(req.method!=='GET'&&req.method!=='HEAD'){try{body=await req.json()}catch{}}let r=isAccount?await accountProfileApi(req,env,u,url,body):await listIconsApi(req,env,u,url,body);return r||app.fetch(req,env)}};
