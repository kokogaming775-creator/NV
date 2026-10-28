const U=process.env.UPSTASH_REDIS_REST_URL||process.env.KV_REST_API_URL;
const T=process.env.UPSTASH_REDIS_REST_TOKEN||process.env.KV_REST_API_TOKEN;
const r=async c=>{
  if(!U||!T)throw new Error('Upstash Redis مش متوصل بالمشروع (Storage)');
  const x=await fetch(U,{method:'POST',headers:{Authorization:'Bearer '+T},body:JSON.stringify(c)});
  return (await x.json()).result;
};
module.exports=async(q,s)=>{
  try{
    const lg=q.query.logo;
    if(q.method==='GET'){
      if(lg){
        const d=await r(['GET','sb:logo:'+lg]);
        if(!d)return s.status(404).end();
        s.setHeader('Content-Type','image/png');
        s.setHeader('Cache-Control','public,max-age=31536000,immutable');
        return s.end(Buffer.from(d.split(',')[1],'base64'));
      }
      const v=await r(['GET','sb:state']);
      s.setHeader('Cache-Control','public,max-age=0,s-maxage=1');
      return s.json({state:v?JSON.parse(v):null,now:Date.now(),locked:!!process.env.CONTROL_PASS});
    }
    if(q.method==='POST'){
      const p=process.env.CONTROL_PASS;
      if(p&&q.headers['x-pass']!==p)return s.status(401).json({error:'pass'});
      const b=typeof q.body==='string'?JSON.parse(q.body):q.body;
      if(lg){await r(['SET','sb:logo:'+lg,b.data]);return s.json({ok:1});}
      const st=b.state,now=Date.now();
      if(st.t.at==='NOW')st.t.at=now;
      if(st.ev&&st.ev.id==='NEW')st.ev.id=now;
      await r(['SET','sb:state',JSON.stringify(st)]);
      return s.json({state:st,now});
    }
    s.status(405).end();
  }catch(e){s.status(500).json({error:String(e.message||e)});}
};
