export function videoProvider(value:string):{kind:'youtube'|'instagram';id:string;url:string;embed:string}|null{
 try{const u=new URL(value);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)return null;const host=u.hostname.replace(/^www\.|^m\./,'');
 const id=host==='youtu.be'?u.pathname.split('/')[1]:host==='youtube.com'?(u.searchParams.get('v')||(/^\/(shorts|embed|live)\//.test(u.pathname)?u.pathname.split('/')[2]:'')):'';
 if(id&&/^[\w-]{11}$/.test(id))return{kind:'youtube',id,url:'https://www.youtube.com/watch?v='+id,embed:'https://www.youtube.com/embed/'+id+'?rel=0&playsinline=1'};
 const instagram=host==='instagram.com'?/^\/(?:p|reel|reels|tv)\/([\w-]+)\/?/.exec(u.pathname):null;
 if(instagram)return{kind:'instagram',id:instagram[1],url:'https://www.instagram.com/reel/'+instagram[1]+'/',embed:'https://www.instagram.com/p/'+instagram[1]+'/embed/'};
 return null;
 }catch{return null;}
}
