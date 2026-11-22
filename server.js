const http = require('http');
const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');

const app = express();
const PORT = 4545;
const HOST = '127.0.0.1';
const DB_FILE = path.join(__dirname, 'videos.json');
const VIDEOS_DIR = path.join(__dirname, 'videos');
const RES_DIR = path.join(__dirname, 'ресурсы');

if (!fs.existsSync(VIDEOS_DIR)) fs.mkdirSync(VIDEOS_DIR);
if (!fs.existsSync(RES_DIR)) fs.mkdirSync(RES_DIR);
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '[]');

function syncFolderVideos() {
    let videos = [];
    try { videos = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch (e) { videos = []; }
    const filesInDir = fs.readdirSync(VIDEOS_DIR).filter(f => f.endsWith('.mp4') || f.endsWith('.webm'));
    let updated = false;

    filesInDir.forEach(file => {
        if (!videos.some(v => v.filename === file)) {
            videos.unshift({
                id: Date.now() + Math.floor(Math.random() * 1000),
                title: path.parse(file).name,
                author: 'Натурал Альбертович',
                isShort: file.toLowerCase().includes('short'),
                likes: 0,
                dislikes: 0,
                filename: file,
                date: new Date().toLocaleDateString('ru-RU')
            });
            updated = true;
        }
    });
    if (updated) fs.writeFileSync(DB_FILE, JSON.stringify(videos, null, 2));
}
syncFolderVideos();

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'videos/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

app.use(express.json());
app.use(express.static(__dirname));
app.use('/videos', express.static(VIDEOS_DIR));
app.use('/res', express.static(RES_DIR));

// Загрузка нового видео с обязательным ником автора
app.post('/upload', upload.single('videoFile'), (req, res) => {
    if (!req.file) return res.redirect('/');
    let videos = [];
    try { videos = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch (e) { videos = []; }

    const authorName = (req.body.author || '').trim() || 'Натурал Альбертович';

    videos.unshift({
        id: Date.now(),
        title: req.body.title || req.file.originalname,
        author: authorName,
        isShort: req.body.isShort === 'on',
        likes: 0,
        dislikes: 0,
        filename: req.file.filename,
        date: new Date().toLocaleDateString('ru-RU')
    });

    fs.writeFileSync(DB_FILE, JSON.stringify(videos, null, 2));
    res.redirect('/');
});

app.get('/api/videos', (req, res) => {
    try {
        res.json(JSON.parse(fs.readFileSync(DB_FILE, 'utf8')));
    } catch (e) {
        res.json([]);
    }
});

app.post('/api/rate', (req, res) => {
    const { id, type } = req.body;
    const videos = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    const video = videos.find(v => v.id === id);
    if (video) {
        if (type === 'like') video.likes = (video.likes || 0) + 1;
        if (type === 'dislike') video.dislikes = (video.dislikes || 0) + 1;
        fs.writeFileSync(DB_FILE, JSON.stringify(videos, null, 2));
        return res.json(video);
    }
    res.json({ likes: 0, dislikes: 0 });
});

http.createServer(app).listen(PORT, HOST, () => {
    console.log(`=============================================`);
    console.log(`NotTube запущен: http://${HOST}:${PORT}`);
    console.log(`=============================================`);
});
