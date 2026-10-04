import https from 'node:https';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import { persistenceservice } from '../serverlocal/services/system/persistence.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png'
};
const options = {
    key: fs.readFileSync(path.resolve(import.meta.dirname, process.env.ssl_key)),
    cert: fs.readFileSync(path.resolve(import.meta.dirname, process.env.ssl_cert)),
    minVersion: 'TLSv1.2',
    maxVersion: 'TLSv1.3'
};

const host = process.env.HOST;
const port = process.env.PORT;

const httpsServer = https.createServer(options, handleRequests);

const allowedOrigins = [
    'http://localhost:1025', // Your live production frontend domain  
    'https://0.0.0.0:1030',  // Alternative local development port
    'https://13.235.102.236:1026',
    'https://d326ndd7qg08xl.cloudfront.net'
];

export function startserver() {
    httpsServer.listen(port, host, () => {
        console.log(`Server running at https://${host}:${port}/`);
    });
}

export function stopserver() {
    httpsServer.close(() => {
        console.log('Server closed');
    });
}

function handleRequests(req, res) {
    const origin = req.headers.origin;

    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);

        // CRITICAL: Set to true if you plan to transmit HTTP-Only session cookies or authorization tokens
        res.setHeader('Access-Control-Allow-Credentials', 'true');

        // Explicitly allow methods and headers required by your hybrid crypto mechanism
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

        // Cache the preflight response details in the browser for 10 minutes to save overhead
        res.setHeader('Access-Control-Max-Age', '600');
    }

    // Prevent directory traversal attacks
    const parsedUrl = new URL(req.url, `https://${req.headers.host}`);
    let pathname = parsedUrl.pathname;

    if (req.method === 'OPTIONS')
        handleOptionsRequest(req, res);
    else if (pathname.startsWith('/api'))
        handleAPIReq(req, res);
    else
        handleStaticReq(parsedUrl, res);
}

function handleOptionsRequest(req, res) {
    res.writeHead(204); // 204 No Content confirms parameters are accepted
    res.end();
}

function handleStaticReq(parsedUrl, res) {
    let filePath = path.join(__dirname, '../web/', parsedUrl.pathname);
    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404 Not Found');
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end(`Server Error: ${error.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
}

async function handleAPIReq(req, res) {
    res.setHeader('Content-Type', 'application/json');

    let path = req.url.split('?')[0];
    let query = new URLSearchParams(req.url.split('?')[1]);

    if (path === '/api/get' && req.method === 'GET') {
        const key = query.get('key');
        const wrapper = persistenceservice.getId(key);
        res.writeHead(200);
        res.end(JSON.stringify(wrapper));
    }
    else if (path === '/api/set' && req.method === 'POST') {
        const key = query.get('key');
        const value = await getRequestBody(req);
        const result = await persistenceservice.set(key, value);
        res.writeHead(200);
        res.end(JSON.stringify(result));
    }
    else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Invalid request ' + req.url);
    }
}

function getRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (err) {
                reject(err);
            }
        });
    });
};