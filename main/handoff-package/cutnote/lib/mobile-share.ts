export function sharedUrl(text:string){const matches=text.match(/https?:\/\/[^\s<>"“”]+/gi)||[];const candidates=matches.map(s=>s.replace(/[)\]},.!?]+$/,''));for(const value of candidates){try{const url=new URL(value);if(['http:','https:'].includes(url.protocol)&&!url.username&&!url.password&&url.href.length<=2000)return url.href;}catch{}}return '';}

export const shareIdPattern=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function shareLaunch(search:string){const params=new URLSearchParams(search),url=sharedUrl(params.get('url')||''),id=params.get('shareId')||'';return params.get('start')==='analyze'&&!params.has('saved')&&url&&shareIdPattern.test(id)?{url,id:id.toLowerCase()}:null;}
