import { spawn } from 'node:child_process';
import { createConnection } from 'node:net';
import { join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import sharp from 'sharp';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const home = process.env.USERPROFILE || process.env.HOME || '';

// Configurações e caminhos (Customizáveis via variáveis de ambiente)
const vmx = process.env.VMX_PATH || join(home, 'Documents', 'Virtual Machines', 'Linux Diario', 'Linux Diario.vmx');
const vmrun = process.env.VMRUN_PATH || 'C:\\Program Files (x86)\\VMware\\VMware Workstation\\vmrun.exe';
const vncPort = parseInt(process.env.VNC_PORT || '5957', 10);
const viewerPort = parseInt(process.env.VIEWER_PORT || '5994', 10);
const viewerBridge = process.env.VIEWER_BRIDGE_PATH || join(__dirname, '..', 'viewer', 'bridge-linux.mjs');
const viewerUrl = `http://127.0.0.1:${viewerPort}/vnc.html?autoconnect=1&resize=scale&path=websockify`;

function result(message, isError = false) {
  return { content: [{ type: 'text', text: message }], isError };
}

function run(command, args, timeout = 90000) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const output = [];
    const timer = setTimeout(() => child.kill(), timeout);
    child.stdout.on('data', chunk => output.push(chunk));
    child.on('error', reject);
    child.on('close', code => {
      clearTimeout(timer);
      if (code === 0) resolve(Buffer.concat(output).toString('utf8'));
      else reject(new Error(`VMware retornou código ${code}.`));
    });
  });
}

async function running() {
  try {
    const list = await run(vmrun, ['-T', 'ws', 'list']);
    return list.toLowerCase().includes(vmx.toLowerCase());
  } catch {
    return false;
  }
}

async function guestIp() {
  const ip = (await run(vmrun, ['-T', 'ws', 'getGuestIPAddress', vmx, '-wait'], 30000)).trim();
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(ip)) throw new Error('VMware não informou um IPv4 válido para a VM.');
  return ip;
}

async function guestCommand(command, timeout = 30000) {
  if (!await running()) throw new Error('A VM Linux está desligada. Inicie-a primeiro.');
  if (typeof command !== 'string' || !command.trim() || command.length > 4000) throw new Error('Comando inválido.');
  const ip = await guestIp();
  const script = `export DISPLAY=:0; export XAUTHORITY=/home/kethy/.Xauthority; ${command}`;
  const encoded = Buffer.from(script, 'utf8').toString('base64');
  return run('ssh', ['-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', '-o', 'ConnectTimeout=5', `kethy@${ip}`, `echo ${encoded} | base64 -d | bash`], timeout);
}

function portOpen(port) {
  return new Promise(resolve => {
    const socket = createConnection({ host: '127.0.0.1', port });
    const finish = value => { socket.destroy(); resolve(value); };
    socket.setTimeout(1500);
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.once('timeout', () => finish(false));
  });
}

// Conecta ao VNC via cliente local para screenshots e controle
async function withVncClient(callback) {
  // Procura o index do mcp-vnc nas dependências locais ou na pasta compartilhada
  let vncServerScript = join(__dirname, 'node_modules', '@hrrrsn', 'mcp-vnc', 'dist', 'index.js');
  const fallback = join(home, '.gemini', 'antigravity', 'mcp_servers', 'tiny10_vnc', 'node_modules', '@hrrrsn', 'mcp-vnc', 'dist', 'index.js');
  try {
    const client = new Client({ name: 'linux-vm-manager', version: '1.0.0' });
    await client.connect(new StdioClientTransport({
      command: process.execPath,
      args: [fallback],
      env: { ...process.env, VNC_HOST: '127.0.0.1', VNC_PORT: String(vncPort) }
    }));
    try {
      return await callback(client);
    } finally {
      await client.close();
    }
  } catch (error) {
    throw new Error(`Falha na conexão VNC: ${error.message}`);
  }
}

async function screenshot() {
  return withVncClient(async (client) => {
    const capture = await client.callTool({ name: 'vnc_screenshot', arguments: {} });
    if (capture.isError) throw new Error('Captura VNC falhou.');
    return {
      content: [
        { type: 'text', text: 'Tela atual da VM Linux. Confira a imagem antes de agir.' },
        ...capture.content.filter(item => item.type === 'image')
      ]
    };
  });
}

const tools = [
  { name: 'linux_status', description: 'Informa se a VM Linux está ligada e se as portas de VNC e Visualizador respondem.', inputSchema: { type: 'object', properties: {} } },
  { name: 'linux_prepare_if_off', description: 'Liga a VM Linux via VMware somente se estiver desligada.', inputSchema: { type: 'object', properties: {} } },
  { name: 'linux_observe', description: 'Captura a tela real da VM Linux para verificar desktop, aplicativos e janelas.', inputSchema: { type: 'object', properties: {} } },
  { name: 'linux_command', description: 'Executa comando no shell da VM Linux com DISPLAY=:0 definido para comandos gráficos ou scripts.', inputSchema: { type: 'object', properties: { command: { type: 'string' } }, required: ['command'] } },
  { name: 'linux_viewer_open', description: 'Inicia o visualizador Web no navegador para você acompanhar a VM ao vivo.', inputSchema: { type: 'object', properties: {} } },
  { name: 'linux_windows', description: 'Lista janelas abertas na VM com wmctrl.', inputSchema: { type: 'object', properties: {} } }
];

async function handle(name, args = {}) {
  switch (name) {
    case 'linux_status':
      return result(JSON.stringify({
        running: await running(),
        vnc: await portOpen(vncPort),
        viewer: await portOpen(viewerPort)
      }));

    case 'linux_prepare_if_off': {
      if (await running()) return result('already_running: A VM já está ligada; sessão preservada.');
      await run(vmrun, ['-T', 'ws', 'start', vmx, 'nogui']);
      let connected = false;
      for (let i = 0; i < 60; i++) {
        if (await portOpen(vncPort)) { connected = true; break; }
        await new Promise(r => setTimeout(r, 1000));
      }
      if (!connected) throw new Error('VM iniciou, mas a porta VNC não respondeu em 60s.');
      return result('started_ready: VM Linux ligada e tela gráfica disponível.');
    }

    case 'linux_observe':
      return screenshot();

    case 'linux_command':
      return result((await guestCommand(args.command)).slice(0, 20000));

    case 'linux_windows':
      return result(await guestCommand('wmctrl -lp', 10000));

    case 'linux_viewer_open': {
      if (!await portOpen(viewerPort)) {
        spawn(process.execPath, [viewerBridge], { detached: true, windowsHide: true, stdio: 'ignore' }).unref();
        for (let i = 0; i < 15; i++) {
          if (await portOpen(viewerPort)) break;
          await new Promise(r => setTimeout(r, 1000));
        }
      }
      spawn('explorer.exe', [viewerUrl], { detached: true, windowsHide: true, stdio: 'ignore' }).unref();
      return result(`Aba de visualização aberta: ${viewerUrl}`);
    }

    default:
      throw new Error(`Ferramenta desconhecida: ${name}`);
  }
}

const server = new Server({ name: 'linux-vm-manager', version: '1.0.0' }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
server.setRequestHandler(CallToolRequestSchema, async request => {
  try { return await handle(request.params.name, request.params.arguments ?? {}); }
  catch (error) { return result(error instanceof Error ? error.message : 'Erro interno.', true); }
});

await server.connect(new StdioServerTransport());
