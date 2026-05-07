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

global.botStatus = { connected: false, qrDataUrl: null, pairingCode: null };

function buildQrPage(qrDataUrl, pairingCode) {
    const pairingHtml = pairingCode 
        ? `<div class="pairing-container">
             <p class="pairing-label">أو استخدم كود الاقتران:</p>
             <div class="pairing-code">${pairingCode}</div>
           </div>`
        : '';

    return `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta http-equiv="refresh" content="30"><title>ربط البوت</title>
<style>
  body{font-family:sans-serif;text-align:center;padding:30px;background:#fefce8;direction:rtl;}
  h1{color:#854d0e;font-size:2em;margin-bottom:5px;}
  .sub{color:#92400e;margin-bottom:25px;font-size:1.1em;}
  img{border:6px solid #1d4ed8;border-radius:16px;max-width:280px;box-shadow:0 4px 20px rgba(0,0,0,.15);}
  .pairing-container{margin-top:20px;padding:15px;background:#fff;border-radius:12px;border:2px dashed #1d4ed8;display:inline-block;}
  .pairing-label{color:#1e40af;font-weight:bold;margin-bottom:10px;font-size:1.1em;}
  .pairing-code{font-family:monospace;font-size:2.2em;letter-spacing:5px;color:#1d4ed8;background:#eff6ff;padding:10px 20px;border-radius:8px;}
  .steps{text-align:right;max-width:320px;margin:20px auto;background:#fff;
         padding:20px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.08);}
  .steps p{margin:8px 0;font-size:1.05em;color:#374151;}
  .note{color:#6b7280;font-size:.9em;margin-top:20px;}
</style></head>
<body>
  <h1>🔗 ربط البوت بالواتساب</h1>
  <p class="sub">امسح الكود ده أو استخدم كود الاقتران</p>
  
  ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR Code"/>` : '<p>⏳ جاري توليد الكود...</p>'}
  
  ${pairingHtml}

  <div class="steps">
    <p>📱 <strong>الخطوات بالكود:</strong></p>
    <p>1️⃣ افتح <strong>الأجهزة المرتبطة</strong> في واتساب</p>
    <p>2️⃣ اضغط <strong>ربط جهاز</strong></p>
    <p>3️⃣ اضغط <strong>الربط برقم الهاتف بدلاً من ذلك</strong></p>
    <p>4️⃣ أدخل الكود الموضح أعلاه</p>
  </div>
  <p class="note">⏱ الأكواد تتجدد تلقائياً لضمان الأمان</p>
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
    } else {
        res.end(buildQrPage(global.botStatus.qrDataUrl, global.botStatus.pairingCode));
    }
}).listen(PORT, () => {
    console.log(chalk.cyan(`🌐 Web server على port ${PORT}`));
});

// ── Memory guard ────────────────────────────────────────────
setInterval(() => { if (global.gc) global.gc(); }, 60_000);
setInterval(() => {
    const used = process.memoryUsage().rss / 1024 / 1024;
    if (used > 800) { // زيادة الحد لـ 800 ميجا لتجنب التهنيج
        console.log(chalk.red('⚠️ RAM مرتفع جداً — إعادة تشغيل آمنة...'));
        process.exit(1);
    }
}, 30_000);

// منع معالجة نفس الرسالة مرتين (حل جذري للخريف والتهنيج)
const processedMessages = new Set();
setInterval(() => processedMessages.clear(), 10 * 60 * 1000); // تنظيف كل 10 دقائق

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
        printQRInTerminal: true, // تفعيل طباعة الكود في التيرمنال للمسح بالهاتف
        browser: ["Ubuntu", "Chrome", "20.0.04"], // تغيير الهوية لتحسين توافق Pairing Code
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

    // ── Pairing Code Logic (مفعل للربط السريع) ──────────────────
    if (!sock.authState.creds.registered) {
        const phoneNumber = settings.ownerNumber.replace(/[^0-9]/g, '');
        
        const requestPairing = async () => {
            if (sock.authState.creds.registered) return;
            console.log(chalk.cyan(`\n⏳ جاري طلب كود الاقتران للرقم: ${phoneNumber}...`));
            try {
                let code = await sock.requestPairingCode(phoneNumber);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                global.botStatus.pairingCode = code;
                console.log(chalk.black(chalk.bgGreen(`\n✅ كود الاقتران الخاص بك هو: ${code}\n`)));
            } catch (e) {
                console.error(chalk.red('❌ فشل طلب كود الاقتران:'), e.message);
            }
        };
        setTimeout(requestPairing, 5000);
    }

    store.bind(sock.ev);

    // ── QR code handler ──────────────────────────────────────
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            try {
                const dataUrl = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
                global.botStatus.qrDataUrl = dataUrl;
                global.botStatus.connected = false;
                console.log(chalk.yellow(`📱 QR Code جاهز — متاح على لوحة التحكم`));
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
            
            // التحقق من تكرار الرسالة
            const msgId = mek.key.id;
            if (processedMessages.has(msgId)) return;
            processedMessages.add(msgId);

            mek.message = Object.keys(mek.message)[0] === 'ephemeralMessage'
                ? mek.message.ephemeralMessage.message
                : mek.message;
            if (mek.key?.remoteJid === 'status@broadcast') return;
            if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return;
            
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
