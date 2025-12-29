const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os'); // 用于获取本机 IP
const qrcode = require('qrcode-terminal'); // 用于生成二维码
const app = express();
const PORT = 3001;

// --- 1. 配置超大文件支持 (50GB) ---
app.use(express.json({ limit: '50gb' }));
app.use(express.urlencoded({ limit: '50gb', extended: true }));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = './uploads';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        // 解决中文名乱码
        file.originalname = Buffer.from(file.originalname, "latin1").toString("utf8");
        cb(null, file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 * 1024 } // 限制 50GB
});

app.use(express.static('public'));
app.use('/files', express.static('uploads'));

// --- 2. 核心接口 ---
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).send('没有选择文件');
    console.log(`[接收成功] ${req.file.originalname} (${(req.file.size/1024/1024).toFixed(2)} MB)`);
    res.json({ message: '上传成功', filename: req.file.originalname });
});

app.get('/api/files', (req, res) => {
    const uploadDir = path.join(__dirname, 'uploads');
    fs.readdir(uploadDir, (err, files) => {
        if (err) return res.json([]);
        const fileList = files.map(file => {
            try {
                const stats = fs.statSync(path.join(uploadDir, file));
                return {
                    name: file,
                    size: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
                    time: new Date(stats.mtime).toLocaleString()
                };
            } catch (e) { return null; }
        }).filter(item => item !== null);
        res.json(fileList);
    });
});

// ... 之前的代码 ...

// 新增接口：获取本机局域网地址
app.get('/api/address', (req, res) => {
    const ip = getLocalIP(); // 复用到底部定义的那个函数
    const url = `http://${ip}:${PORT}`;
    res.json({ url: url, ip: ip });
});



// --- 3. 辅助函数：获取本机局域网 IP ---
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // 跳过 internal (即 127.0.0.1) 和 非 IPv4 地址
            if ('IPv4' === iface.family && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

// --- 4. 启动服务并生成二维码 ---
const server = app.listen(PORT, '0.0.0.0', () => {
    const ip = getLocalIP();
    const url = `http://${ip}:${PORT}`;
    
    console.log('---------------------------------------------------');
    console.log(`🚀 服务已启动！`);
    console.log(`📂 本机访问: http://localhost:${PORT}`);
    console.log(`📡 局域网访问: ${url}`);
    console.log('---------------------------------------------------');
    
    
    
    
});

// 设置永不超时，防止大文件传输中断
server.setTimeout(0);