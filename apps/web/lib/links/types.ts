export type LinkFrame={url:string;x:number;y:number;width:number;height:number};
export type LinkInfo={url:string;title:string;description:string;author:string;durationSeconds?:number;basis:'video'|'storyboard'|'preview'|'unavailable';frames:LinkFrame[];mediaUrl?:string;previewUrl?:string;message:string};
export const proxyMedia=(url:string)=>'/api/links/media?url='+encodeURIComponent(url);
export function linkTitle(value:string){try{const u=new URL(value);const part=decodeURIComponent(u.pathname.split('/').filter(Boolean).pop()||'');return (part&&part.length<80?part:u.hostname+' 레퍼런스').slice(0,120);}catch{return '새 레퍼런스';}}
