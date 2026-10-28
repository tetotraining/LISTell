import{buildPushPayload}from'@block65/webcrypto-web-push';

const json=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json;charset=UTF-8'}});

export const notificationKeys=[
  'product_added',
  'product_name_changed',
  'product_priority_changed',
  'product_name_priority_changed',
  'product_purchased',
  'product_restored',
  'product_deleted',
  'list_deleted',
  'list_renamed',
  'member_joined',
  'member_removed',
  'role_changed'
];

const eventTypes=[
  'product_added',
  'product_changed',
  'product_purchased',
  'product_restored',
  'product_deleted',
  'list_deleted',
  'list_renamed',
  'member_joined',
  'member_removed',
  'role_changed'
];

const roleLabels={admin:'管理者',member:'メンバー',viewer:'閲覧者'};
const priorityLabels={urgent:'早急',normal:'通常',any:'いつでも'};

async function member(db,listId,userId){
  return db.prepare('SELECT role FROM list_members WHERE list_id=? AND user_id=?').bind(listId,userId).first();
}

async function ensure(db,u,l){
  await db.prepare('INSERT OR IGNORE INTO list_notification_settings(user_id,list_id) VALUES(?,?)').bind(u,l).run();
  return db.prepare('SELECT * FROM list_notification_settings WHERE user_id=? AND list_id=?').bind(u,l).first();
}

async function diag(db,userId,count,status=null,ok=null,host=null,error=null){
  await db.prepare('INSERT INTO push_delivery_diagnostics(user_id,attempted_at,subscription_count,status,ok,endpoint_host,error) VALUES(?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET attempted_at=excluded.attempted_at,subscription_count=excluded.subscription_count,status=excluded.status,ok=excluded.ok,endpoint_host=excluded.endpoint_host,error=excluded.error')
    .bind(userId,Date.now(),count,status,ok===null?null:(ok?1:0),host,error?.slice?.(0,500)||error||null).run();
}

async function sendPush(env,userId,message){
  let db=env.DB;
  if(!env.VAPID_PUBLIC_KEY||!env.VAPID_PRIVATE_KEY){
    await diag(db,userId,0,null,false,null,'VAPID configuration missing');
    return;
  }
  let subs=await db.prepare('SELECT endpoint,p256dh,auth FROM push_subscriptions WHERE user_id=?').bind(userId).all(),count=subs.results.length;
  if(!count){
    await diag(db,userId,0,null,false,null,'No push subscription');
    return;
  }
  let vapid={subject:'https://listell.teto-training.workers.dev',publicKey:env.VAPID_PUBLIC_KEY,privateKey:env.VAPID_PRIVATE_KEY};
  for(const s of subs.results){
    let host='';
    try{
      host=new URL(s.endpoint).host;
      let payload=await buildPushPayload({data:JSON.stringify(message),options:{ttl:60}},{endpoint:s.endpoint,expirationTime:null,keys:{p256dh:s.p256dh,auth:s.auth}},vapid),
          res=await fetch(s.endpoint,payload),
          responseText=await res.text().catch(()=> '');
      await diag(db,userId,count,res.status,res.ok,host,res.ok?null:responseText||`Push service returned ${res.status}`);
      if(res.status===404||res.status===410)await db.prepare('DELETE FROM push_subscriptions WHERE endpoint=?').bind(s.endpoint).run();
    }catch(e){
      await diag(db,userId,count,null,false,host,e?.message||String(e));
    }
  }
}

function settingKeyFor(type,payload){
  if(type!=='product_changed')return type;
  const nameChanged=payload.nameChanged??payload.oldName!==payload.name;
  const priorityChanged=payload.priorityChanged??(!!payload.oldPriority&&payload.oldPriority!==payload.priority);
  if(nameChanged&&priorityChanged)return'product_name_priority_changed';
  if(priorityChanged)return'product_priority_changed';
  return'product_name_changed';
}

function pushText(type,listName,actorName,payload,targetName){
  let l=listName||payload.name||'リスト',a=actorName||'メンバー',n=payload.name||'商品';
  switch(type){
    case'product_added':
      return{title:'リストに追加されました',body:`${l}：${n} ｜ ${a}`};
    case'product_changed':{
      let nameChanged=payload.nameChanged??payload.oldName!==payload.name,
          priorityChanged=payload.priorityChanged??(!!payload.oldPriority&&payload.oldPriority!==payload.priority),
          oldPriority=priorityLabels[payload.oldPriority]||payload.oldPriority||'優先度',
          newPriority=priorityLabels[payload.priority]||payload.priority||'優先度';
      if(nameChanged&&priorityChanged)return{title:'商品名と優先度が変更されました',body:`${l}：${payload.oldName||'商品'} ${oldPriority} → ${n} ${newPriority} ｜ ${a}`};
      if(priorityChanged)return{title:'商品の優先度が変更されました',body:`${l}：${n}　${oldPriority} → ${newPriority} ｜ ${a}`};
      return{title:'商品名が変更されました',body:`${l}：${payload.oldName||'商品'} → ${n} ｜ ${a}`};
    }
    case'product_purchased':return{title:'購入されました',body:`${l}：${n} ｜ ${a}`};
    case'product_restored':return{title:'購入履歴からリストへ戻されました',body:`${l}：${n} ｜ ${a}`};
    case'product_deleted':return{title:'リストから商品が削除されました',body:`${l}：${n} ｜ ${a}`};
    case'list_deleted':return{title:'リストが削除されました',body:`${payload.name||l} ｜ ${a}`};
    case'list_renamed':return{title:'リスト名が変更されました',body:`${payload.oldName||'リスト'} → ${payload.name||l} ｜ ${a}`};
    case'member_joined':return{title:'メンバーが参加しました',body:`${l}：${payload.nickname||targetName||a}`};
    case'member_removed':return{title:'メンバーが削除されました',body:`${l}：${payload.nickname||targetName||'メンバー'} ｜ ${a}`};
    case'role_changed':return{title:'権限が変更されました',body:`${l}：${targetName||payload.nickname||'メンバー'} → ${roleLabels[payload.role]||payload.role||'権限'} ｜ ${a}`};
    default:return{title:'LISTell',body:`${l} ｜ ${a}`};
  }
}

export async function emitNotification(env,listId,type,actorUserId,payload={},recipientIds=null){
  if(!eventTypes.includes(type))return;
  let db=env.DB,rows;
  if(recipientIds){
    rows={results:recipientIds.filter(x=>x&&x!==actorUserId).map(user_id=>({user_id}))};
  }else{
    rows=await db.prepare('SELECT user_id FROM list_members WHERE list_id=? AND user_id<>?').bind(listId,actorUserId).all();
  }
  let now=Date.now(),text=JSON.stringify(payload),
      actor=await db.prepare('SELECT nickname FROM users WHERE id=?').bind(actorUserId).first(),
      list=await db.prepare('SELECT name FROM lists WHERE id=?').bind(listId).first(),
      target=payload.userId?await db.prepare('SELECT nickname FROM users WHERE id=?').bind(payload.userId).first():null,
      settingKey=settingKeyFor(type,payload);
  for(let r of rows.results){
    let m=await member(db,listId,r.user_id);
    if(!m&&!recipientIds)continue;
    let s=await ensure(db,r.user_id,listId);
    if(!s[settingKey])continue;
    await db.batch([
      db.prepare('INSERT INTO events(id,list_id,type,actor_user_id,payload,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),listId,type,actorUserId,text,now),
      db.prepare('INSERT INTO notification_deliveries(id,user_id,list_id,type,actor_user_id,payload,created_at,read_at) VALUES(?,?,?,?,?,?,?,NULL)').bind(crypto.randomUUID(),r.user_id,listId,type,actorUserId,text,now)
    ]);
    let msg=pushText(type,list?.name,actor?.nickname,payload,target?.nickname);
    await sendPush(env,r.user_id,{...msg,tag:`listell-${listId}`,url:'/'});
  }
}

export async function settingsApi(req,env,u,url,body){
  let db=env.DB,p=url.pathname.split('/').filter(Boolean);
  if(url.pathname==='/api/push/public-key'&&req.method==='GET')return json({publicKey:env.VAPID_PUBLIC_KEY||null});
  if(url.pathname==='/api/push/diagnostics'&&req.method==='GET'){
    let c=await db.prepare('SELECT COUNT(*) count FROM push_subscriptions WHERE user_id=?').bind(u.id).first(),
        d=await db.prepare('SELECT attempted_at,subscription_count,status,ok,endpoint_host,error FROM push_delivery_diagnostics WHERE user_id=?').bind(u.id).first();
    return json({publicKeyConfigured:!!env.VAPID_PUBLIC_KEY,privateKeyConfigured:!!env.VAPID_PRIVATE_KEY,subscriptionCount:Number(c?.count||0),subject:'https://listell.teto-training.workers.dev',lastAttempt:d?{attemptedAt:d.attempted_at,subscriptionCount:d.subscription_count,status:d.status,ok:d.ok===null?null:!!d.ok,endpointHost:d.endpoint_host,error:d.error}:null});
  }
  if(url.pathname==='/api/account/nickname'&&req.method==='POST'){
    let n=body.nickname?.trim();
    if(!n||n.includes('\n'))return json({error:'ニックネームを入力してください'},400);
    await db.prepare('UPDATE users SET nickname=? WHERE id=?').bind(n,u.id).run();
    return json({ok:true,nickname:n});
  }
  if(url.pathname==='/api/account/delete'&&req.method==='DELETE'){
    let sole=await db.prepare("SELECT 1 FROM list_members m WHERE m.user_id=? AND m.role='admin' AND (SELECT COUNT(*) FROM list_members x WHERE x.list_id=m.list_id AND x.role='admin')=1 LIMIT 1").bind(u.id).first();
    if(sole)return json({error:'あなたが唯一の管理者になっているリストがあります'},409);
    await db.batch([
      db.prepare('DELETE FROM invites WHERE created_by=? OR used_by=?').bind(u.id,u.id),
      db.prepare('DELETE FROM local_nicknames WHERE owner_user_id=? OR target_user_id=?').bind(u.id,u.id),
      db.prepare('UPDATE lists SET created_by=NULL WHERE created_by=?').bind(u.id),
      db.prepare('UPDATE items SET created_by=NULL WHERE created_by=?').bind(u.id),
      db.prepare('UPDATE items SET purchased_by=NULL WHERE purchased_by=?').bind(u.id),
      db.prepare('UPDATE purchase_history SET purchased_by=NULL WHERE purchased_by=?').bind(u.id),
      db.prepare('UPDATE events SET actor_user_id=NULL WHERE actor_user_id=?').bind(u.id),
      db.prepare('DELETE FROM list_members WHERE user_id=?').bind(u.id),
      db.prepare('DELETE FROM users WHERE id=?').bind(u.id)
    ]);
    return json({ok:true});
  }
  if(p[1]==='lists'&&p[2]&&p[3]==='notifications'){
    let m=await member(db,p[2],u.id);
    if(!m)return json({error:'権限がありません'},403);
    if(req.method==='GET')return json({settings:await ensure(db,u.id,p[2])});
    if(req.method==='POST'){
      const allowed=[...notificationKeys,'product_changed'];
      if(!allowed.includes(body.key)||typeof body.enabled!=='boolean')return json({error:'設定が不正です'},400);
      await ensure(db,u.id,p[2]);
      const value=body.enabled?1:0;
      if(body.key==='product_changed'){
        await db.prepare('UPDATE list_notification_settings SET product_changed=?,product_name_changed=?,product_priority_changed=?,product_name_priority_changed=? WHERE user_id=? AND list_id=?')
          .bind(value,value,value,value,u.id,p[2]).run();
      }else{
        await db.prepare(`UPDATE list_notification_settings SET ${body.key}=? WHERE user_id=? AND list_id=?`).bind(value,u.id,p[2]).run();
      }
      return json({ok:true});
    }
  }
  if(url.pathname==='/api/notifications/deliveries'&&req.method==='GET'){
    let since=Math.max(0,Number(url.searchParams.get('since'))||0),
        r=await db.prepare("SELECT d.id,d.list_id,d.type,d.payload,d.created_at,d.read_at,l.name list_name,COALESCE(a.nickname,'退会済みユーザー') actor FROM notification_deliveries d LEFT JOIN lists l ON l.id=d.list_id LEFT JOIN users a ON a.id=d.actor_user_id WHERE d.user_id=? AND d.created_at>=? AND d.read_at IS NULL ORDER BY d.created_at ASC,d.id ASC LIMIT 100").bind(u.id,since).all();
    return json({notifications:r.results.map(x=>({...x,payload:JSON.parse(x.payload||'{}')}))});
  }
  if(p[1]==='notifications'&&p[2]==='deliveries'&&p[3]&&p[4]==='read'&&req.method==='POST'){
    await db.prepare('UPDATE notification_deliveries SET read_at=? WHERE id=? AND user_id=?').bind(Date.now(),p[3],u.id).run();
    return json({ok:true});
  }
  if(url.pathname==='/api/push/subscriptions'&&req.method==='POST'){
    let s=body.subscription;
    if(!s?.endpoint||!s.keys?.p256dh||!s.keys?.auth)return json({error:'購読情報が不正です'},400);
    await db.prepare('INSERT INTO push_subscriptions(id,user_id,endpoint,p256dh,auth,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET user_id=excluded.user_id,p256dh=excluded.p256dh,auth=excluded.auth').bind(crypto.randomUUID(),u.id,s.endpoint,s.keys.p256dh,s.keys.auth,Date.now()).run();
    return json({ok:true});
  }
  if(url.pathname==='/api/push/subscriptions'&&req.method==='DELETE'){
    if(!body.endpoint)return json({error:'endpointが必要です'},400);
    await db.prepare('DELETE FROM push_subscriptions WHERE user_id=? AND endpoint=?').bind(u.id,body.endpoint).run();
    return json({ok:true});
  }
  return null;
}
