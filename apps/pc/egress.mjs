// Downloader traffic passes through this proxy; every DNS result is checked and
// connections use the checked address, not a second DNS lookup.
import http from 'node:http';
import net from 'node:net';
import {lookup} from 'node:dns/promises';
const domains=['youtube.com','youtu.be','googlevideo.com','ytimg.com','instagram.com','cdninstagram.com','fbcdn.net'];
// YouTube's public webpage can redirect through Google's consent page. This is
// an HTTPS webpage redirect, not the Google Data API or Gemini API.
export function allowedHost(host){return ['www.google.com','consent.google.com'].includes(host)||domains.some(d=>host===d||host.endsWith('.'+d));}
export function publicIPv4(ip){const n=ip.split('.').map(Number);return net.isIPv4(ip)&&![0,10,127].includes(n[0])&&n[0]<224&&!(n[0]===169&&n[1]===254)&&!(n[0]===172&&n[1]>=16&&n[1]<=31)&&!(n[0]===192&&(n[1]===168||n[1]===0))&&!(n[0]===100&&n[1]>=64&&n[1]<=127)&&!(n[0]===198&&(n[1]===18||n[1]===19));}
export async function egressProxy(){
 const sockets=new Set(),blocked=new Set();const server=http.createServer((_req,res)=>{res.writeHead(403);res.end();});
 server.on('connection',socket=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket));});
 server.on('connect',async(req,socket,head)=>{
  let target;try{target=new URL('https://'+req.url);if(target.port&&target.port!=='443'||!allowedHost(target.hostname)||target.username||target.password)throw Error();const ips=(await lookup(target.hostname,{family:4,all:true})).map(result=>result.address);if(!ips.length||ips.some(ip=>!publicIPv4(ip)))throw Error();const upstream=net.connect({host:ips[0],port:443});sockets.add(upstream);upstream.setTimeout(120000,()=>upstream.destroy());upstream.on('close',()=>sockets.delete(upstream));upstream.once('connect',()=>{socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');if(head.length)upstream.write(head);socket.pipe(upstream);upstream.pipe(socket);});upstream.on('error',()=>socket.destroy());socket.on('error',()=>upstream.destroy());socket.on('close',()=>upstream.destroy());}catch{blocked.add(target?.hostname||'invalid-host');socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return{blocked,url:'http://127.0.0.1:'+server.address().port,close:()=>{for(const s of sockets)s.destroy();server.close();}};
}
