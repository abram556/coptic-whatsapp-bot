/**
 * index.js — مركز اللغة القبطية v7
 * QR Code via web browser
 */

require('./settings');
const { Boom }  = require('@hapi/boom');
const fs        = require('fs');
const chalk     = require('chalk');
const QRCode    = require('qrcode');
const {
    handleMessages,
    handleGroupParticipantUpdate,
} = require('./main');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    jidDecode,
    jidNormalizedUser,
    makeCacheableSignalKeyStore,
} = require('@whiskeysockets/baileys');
const NodeCache = require('node-cache');
const pino      = require('pino');
const { rmSync } = require('fs');

const store    = require('./lib/lightweight_store');
const settings = require('./settings');

// ── Web server (must start before bot) ─────────────────────
const http = require('http');
const PORT = process.env.PORT || 7860;

global.botStatus = { connected: false, qrDataUrl: null, qrRaw: null };

const HTML_LOADING = `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta http-equiv="refresh" content="5"><title>Bot Starting...</title>
<style>body{font-family:sans-serif;text-align:center;padding:60px;background:#f9fafb;}
h1{color:#6b7280;font-size:2em;}p{color:#9ca3af;}</style></head>
<body><h1>⏳ البوت بيشتغل...</h1><p>الصفحة بتتحدث تلقائياً كل 5 ثوان</p></body></html>`;

function buildQrPage(qrDataUrl) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta http-equiv="refresh" content="30"><title>امسح QR Code</title>
<style>
  body{font-family:sans-serif;text-align:center;padding:30px;background:#fefce8;direction:rtl;}
  h1{color:#854d0e;font-size:2em;margin-bottom:5px;}
  .sub{color:#92400e;margin-bottom:25px;font-size:1.1em;}
  img{border:6px solid #1d4ed8;border-radius:16px;max-width:280px;box-shadow:0 4px 20px rgba(0,0,0,.15);}
  .steps{text-align:right;max-width:320px;margin:20px auto;background:#fff;
         padding:20px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.08);}
  .steps p{margin:8px 0;font-size:1.05em;color:#374151;}
  .note{color:#6b7280;font-size:.9em;margin-top:20px;}
  .timer{color:#ef4444;font-weight:bold;}
</style></head>
<body>
  <h1>🔗 ربط البوت بالواتساب</h1>
  <p class="sub">امسح الكود ده بكاميرا واتساب</p>
  <img src="${qrDataUrl}" alt="QR Code"/>
  <div class="steps">
    <p>📱 <strong>الخطوات:</strong></p>
    <p>1️⃣ افتح <strong>واتساب</strong> على موبايلك</p>
    <p>2️⃣ اضغط <strong>الإعدادات</strong> (النقاط الثلاث)</p>
    <p>3️⃣ اختار <strong>الأجهزة المرتبطة</strong></p>
    <p>4️⃣ اضغط <strong>ربط جهاز</strong></p>
    <p>5️⃣ <strong>امسح الصورة أعلاه</strong></p>
  </div>
  <p class="note">⏱ الكود بيتجدد تلقائياً كل 30 ثانية</p>
</body></html>`;
}

const HTML_CONNECTED = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>متصل!</title>
<style>body{font-family:sans-serif;text-align:center;padding:60px;background:#f0fff4;}
h1{color:#16a34a;font-size:3em;}p{font-size:1.4em;color:#166534;}</style></head>
<body><h1>✅ البوت متصل!</h1>
<p>🤖 بوت مركز اللغة القبطية يعمل بنجاح 24/7</p></body></html>`;

http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    if (global.botStatus.connected) {
        res.end(HTML_CONNECTED);
    } else if (global.botStatus.qrDataUrl) {
        res.end(buildQrPage(global.botStatus.qrDataUrl));
    } else {
        res.end(HTML_LOADING);
    }
}).listen(PORT, () => {
    console.log(chalk.cyan(`🌐 Web server على port ${PORT}`));
});

// ── Memory guard ────────────────────────────────────────────
setInterval(() => { if (global.gc) global.gc(); }, 60_000);
setInterval(() => {
    const used = process.memoryUsage().rss / 1024 / 1024;
    if (used > 400) {
        console.log(chalk.red('⚠️ RAM مرتفع — إعادة تشغيل...'));
        process.exit(1);
    }
}, 30_000);

store.readFromFile();
setInterval(() => store.writeToFile(), settings.storeWriteInterval || 10000);

global.botname = settings.botName;

// ── Bot ─────────────────────────────────────────────────────
async function startBot() {
    const { version }          = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    const msgRetryCounterCache = new NodeCache();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(
                state.keys,
                pino({ level: 'fatal' }).child({ level: 'fatal' })
            )
        },
        markOnlineOnConnect:            true,
        generateHighQualityLinkPreview: true,
        syncFullHistory:                false,
        getMessage: async (key) => {
            const jid = jidNormalizedUser(key.remoteJid);
            const msg = await store.loadMessage(jid, key.id);
            return msg?.message || '';
        },
        msgRetryCounterCache,
        defaultQueryTimeoutMs: undefined
    });

    store.bind(sock.ev);

    // ── QR code handler ──────────────────────────────────────
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            try {
                const dataUrl = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
                global.botStatus.qrDataUrl = dataUrl;
                global.botStatus.connected = false;
                console.log(chalk.yellow(`📱 QR Code جاهز — افتح: https://abram55-coptic-whatsapp-bot.hf.space`));
            } catch (e) {
                console.error('QR error:', e.message);
            }
        }

        if (connection === 'open') {
            global.botStatus.connected = true;
            global.botStatus.qrDataUrl = null;
            console.log(chalk.green('\n✅ بوت مركز اللغة القبطية متصل!'));
            console.log(chalk.magenta(`🤖 البوت: ${settings.botName} | 👑 المالك: ${settings.ownerNumber}`));

            const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            await sock.sendMessage(botJid, {
                text: `✅ *${settings.botName}*\n\nالبوت متصل بنجاح!\n⏰ ${new Date().toLocaleString('ar-EG')}\n📋 اكتب /menu للبدء`
            }).catch(() => {});
        }

        if (connection === 'close') {
            global.botStatus.connected = false;
            const code = lastDisconnect?.error?.output?.statusCode;
            if (code === DisconnectReason.loggedOut || code === 401) {
                try { rmSync('./session', { recursive: true, force: true }); } catch {}
                console.log(chalk.red('🔴 انتهت الجلسة — إعادة المصادقة...'));
            } else {
                console.log(chalk.yellow('🔄 إعادة الاتصال...'));
            }
            setTimeout(startBot, 3000);
        }
    });

    sock.ev.on('messages.upsert', async chatUpdate => {
        try {
            const mek = chatUpdate.messages[0];
            if (!mek.message) return;
            mek.message = Object.keys(mek.message)[0] === 'ephemeralMessage'
                ? mek.message.ephemeralMessage.message
                : mek.message;
            if (mek.key?.remoteJid === 'status@broadcast') return;
            if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return;
            if (sock?.msgRetryCounterCache) sock.msgRetryCounterCache.clear();
            await handleMessages(sock, chatUpdate);
        } catch (err) {
            console.error('❌ messages.upsert:', err);
        }
    });

    sock.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            const d = jidDecode(jid) || {};
            return d.user && d.server ? `${d.user}@${d.server}` : jid;
        }
        return jid;
    };
    sock.ev.on('contacts.update', update => {
        for (const c of update) {
            const id = sock.decodeJid(c.id);
            if (store?.contacts) store.contacts[id] = { id, name: c.notify };
        }
    });

    sock.public = true;
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('group-participants.update', async (update) => {
        await handleGroupParticipantUpdate(sock, update);
    });

    return sock;
}

startBot().catch(err => {
    console.error('❌ خطأ فادح:', err);
    process.exit(1);
});

process.on('uncaughtException',  err => console.error('❌ Uncaught:', err));
process.on('unhandledRejection', err => console.error('❌ Unhandled:', err));
