import http from 'node:http';
import {readFile} from 'node:fs/promises';
const root=new URL('./dist/',import.meta.url);
http.createServer(async(req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(path.includes('..'))throw Error();const file=new URL('.'+(path==='/'?'/index.html':path),root);if(!file.href.startsWith(root.href))throw Error();const data=await readFile(file);res.setHeader('Content-Type',({'html':'text/html','css':'text/css','js':'text/javascript'})[file.pathname.split('.').pop()]||'application/octet-stream');res.end(data)}catch{res.writeHead(404);res.end('Not found')}}).listen(4177,'127.0.0.1',()=>console.log('http://127.0.0.1:4177'));
