import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const root=resolve('dist');
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.ttf':'font/ttf','.ico':'image/x-icon','.json':'application/json'};
createServer(async(req,res)=>{try{let path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!path.startsWith(root+'/')&&path!==root){res.writeHead(403).end();return;}try{if((await stat(path)).isDirectory())path=resolve(path,'index.html');}catch{path+='.html';}const data=await readFile(path);res.writeHead(200,{'Content-Type':mime[extname(path)]??'application/octet-stream'});res.end(data);}catch{res.writeHead(404).end('Not found');}}).listen(8081,'127.0.0.1',()=>console.log('Finish Coach: http://127.0.0.1:8081'));
