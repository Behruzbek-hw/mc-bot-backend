const express = require('express');
const mineflayer = require('mineflayer');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8000;

const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: 'https://frontend.yourdomain.com', // Replace with your actual frontend domain
        methods: ['GET', 'POST'],
        credentials: true
    }
});

let currentBot = null;
let afkInterval = null;

app.use(cors({
    origin: 'https://frontend.yourdomain.com', // Replace with your actual frontend domain
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

function createBot(name, ip, ports, version, antiAFK) {
    if (currentBot) {
        currentBot.quit();
        clearInterval(afkInterval);
        afkInterval = null;
    }

    const bot = mineflayer.createBot({
        username: name,
        host: ip,
        port: parseInt(ports),
        version: version
    });

    currentBot = bot;

    bot.on('spawn', () => {
        if (antiAFK === 'jump') {
            afkInterval = setInterval(() => {
                bot.setControlState('jump', true);
                setTimeout(() => bot.setControlState('jump', false), 500);
            }, 30000);
        } else if (antiAFK === 'sneak') {
            afkInterval = setInterval(() => {
                bot.setControlState('sneak', true);
                setTimeout(() => bot.setControlState('sneak', false), 500);
            }, 30000);
        } else if (antiAFK === 'sneak-jump') {
            afkInterval = setInterval(() => {
                bot.setControlState('sneak', true);
                bot.setControlState('jump', true);
                setTimeout(() => {
                    bot.setControlState('sneak', false);
                    bot.setControlState('jump', false);
                }, 500);
            }, 30000);
        }
        io.emit('log', `🟢 Bot ulandi: ${bot.username}`);
    });

    bot.on('end', () => {
        io.emit('log', `🔴 Bot uzildi`);
    });

    bot.on('error', err => {
        io.emit('log', `❌ Bot xatolikka uchradi: ${err.message}`);
    });
}

app.post('/startBot', (req, res) => {
    const { name, ip, ports, version, antiAFK } = req.body;
    createBot(name, ip, ports, version, antiAFK);
    res.json({ status: 'success', message: 'Bot started' });
});

app.post('/sendCommand', (req, res) => {
    const { command } = req.body;
    if (currentBot) {
        currentBot.chat(command);
        res.json({ status: 'success', message: 'Command sent' });
    } else {
        res.status(400).json({ status: 'error', message: 'Bot is not running' });
    }
});

app.post('/stopBot', (req, res) => {
    console.log("❗ stopBot route ishga tushdi");
    if (currentBot) {
        currentBot.quit();
        currentBot = null;
        clearInterval(afkInterval);
        afkInterval = null;
        res.json({ status: 'success', message: 'Bot stopped' });
    } else {
        res.status(400).json({ status: 'error', message: 'Bot is not running' });
    }
});

server.listen(PORT, () => {
    console.log(`🚀 Server ishga tushdi: http://localhost:${PORT}`);
});