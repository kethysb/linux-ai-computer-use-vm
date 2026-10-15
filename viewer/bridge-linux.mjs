import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import WebSocket, { WebSocketServer } from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Procura o noVNC localmente ou na pasta compartilhada configurada
let root = process.env.NOVNC_PATH || path.join(__dirname, 'noVNC');
if (!existsSync(root)) {
  const fallback = 'C:\\Users\\Kethely\\Documents\\Virtual Machines\\Tiny10\\viewer\\noVNC-master';
  if (existsSync(fallback)) root = fallback;
}

const vncPort = parseInt(process.env.VNC_PORT || '5957', 10);
const viewerPort = parseInt(process.env.VIEWER_PORT || '5994', 10);

const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
    const file = path.resolve(root, `.${pathname === '/' ? '/vnc.html' : pathname}`);
    if (!file.startsWith(root + path.sep)) {
      response.writeHead(403).end();
      return;
    }
    const data = await readFile(file);
    response.writeHead(200, {
      'Content-Type': mime[path.extname(file)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store'
    }).end(data);
  } catch (error) {
    if (error instanceof URIError || (error instanceof Error && 'code' in error && error.code === 'ENOENT')) {
      response.writeHead(404).end('Arquivo noVNC nao encontrado. Execute setup_novnc.ps1');
      return;
    }
    console.error(error);
    response.writeHead(500).end();
  }
});

const sockets = new WebSocketServer({ noServer: true });
server.on('upgrade', (request, socket, head) => {
  if (request.url !== '/websockify') {
    socket.destroy();
    return;
  }
  sockets.handleUpgrade(request, socket, head, webSocket => sockets.emit('connection', webSocket));
});

sockets.on('connection', webSocket => {
  const tcp = net.connect({ host: '127.0.0.1', port: vncPort });
  tcp.on('data', data => { if (webSocket.readyState === WebSocket.OPEN) webSocket.send(data); });
  webSocket.on('message', data => tcp.write(data));
  tcp.on('error', error => { console.error('Erro TCP VNC:', error.message); webSocket.close(); });
  webSocket.on('error', error => { console.error('Erro WebSocket:', error.message); tcp.destroy(); });
  tcp.on('close', () => webSocket.close());
  webSocket.on('close', () => tcp.destroy());
});

server.listen(viewerPort, '127.0.0.1', () => {
  console.log(`🌐 Visualizador da VM Linux pronto em: http://127.0.0.1:${viewerPort}/vnc.html?autoconnect=1&resize=scale&path=websockify`);
});
