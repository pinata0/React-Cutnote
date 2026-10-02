export type WorkspaceContext={kind:'pc'|'online';keyManagement:'pc'|'here'};
export function workspaceContext(req:Request):WorkspaceContext{
 const hostname=new URL(req.url).hostname;
 const local=['127.0.0.1','localhost','[::1]'].includes(hostname);
 return {kind:local?'pc':'online',keyManagement:local&&req.headers.get('x-cutnote-client')==='lan'?'pc':'here'};
}
