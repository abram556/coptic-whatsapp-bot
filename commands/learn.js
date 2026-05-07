/**
 * learn.js — تعلم اللغة القبطية
 * نسخة فائقة السرعة باستخدام Streams و Caching
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { getLessons, learnDbSize } = require('../lib/learnDb');

const VIDEO_CACHE_DIR = path.join(__dirname, '../data/video_cache');
if (!fs.existsSync(VIDEO_CACHE_DIR)) fs.mkdirSync(VIDEO_CACHE_DIR, { recursive: true });

const learnSessions  = new Map();
const SESSION_TIMEOUT = 10 * 60 * 1000;
const LEVEL_NAMES = { 1: 'الأول', 2: 'الثاني' };

function backHint() {
    return `\nللرجوع للقائمة السابقة اكتب 0\nللرجوع للقائمة الرئيسية اكتب 00`;
}

// دالة لجلب مسار الملف أو تحميله (بدون تحميله في الذاكرة كـ Buffer)
async function getVideoSource(url, name) {
    const fileName = Buffer.from(name).toString('hex').substring(0, 20) + '.mp4';
    const filePath = path.join(VIDEO_CACHE_DIR, fileName);

    if (fs.existsSync(filePath)) {
        console.log(`🚀 استخدام فيديو من الكاش: ${name}`);
        return filePath; // إرجاع المسار لاستخدامه كـ Stream
    }

    console.log(`⏳ تحميل وحفظ فيديو جديد: ${name}`);
    const response = await axios({
        method: 'get',
        url: url,
        responseType: 'stream',
        timeout: 120000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(filePath));
        writer.on('error', reject);
    });
}

async function learnCommand(sock, chatId, message) {
    try {
        learnSessions.set(chatId, { step: 'level', timestamp: Date.now() });
        const l1 = learnDbSize(1);
        const l2 = learnDbSize(2);
        await sock.sendMessage(chatId, {
            text: `📚 *تعلم اللغة القبطية*\n\nللمستوى الأول (${l1} درس) اكتب 1\nللمستوى الثاني (${l2} درس) اكتب 2\n` + backHint()
        }, { quoted: message });
    } catch (err) { console.error('❌ learnCommand:', err); }
}

async function showLessons(sock, chatId, message, level) {
    const lessons  = getLessons(level);
    const levelTxt = LEVEL_NAMES[level];
    learnSessions.set(chatId, { step: `lessons_${level}`, level, timestamp: Date.now() });

    if (lessons.length === 0) {
        await sock.sendMessage(chatId, { text: `⚠️ لا توجد دروس في المستوى ${levelTxt} بعد.\n` + backHint() }, { quoted: message });
        return;
    }

    let text = `📚 *المستوى ${levelTxt}*\n\n`;
    for (let i = 0; i < lessons.length; i++) text += `${i + 1}. ${lessons[i].name}\n`;
    text += backHint();
    await sock.sendMessage(chatId, { text }, { quoted: message });
}

async function sendLesson(sock, chatId, message, level, lessonNum) {
    const lessons  = getLessons(level);
    const levelTxt = LEVEL_NAMES[level];
    if (lessonNum < 1 || lessonNum > lessons.length) return false;

    const lesson = lessons[lessonNum - 1];
    await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });

    // 1. إرسال الفيديو (Stream من الملف مباشرة - أسرع بكتير وأخف على الذاكرة)
    if (lesson.videoUrl) {
        try {
            const videoPath = await getVideoSource(lesson.videoUrl, lesson.name);
            await sock.sendMessage(chatId, {
                video: fs.readFileSync(videoPath), // Baileys يفضل Buffer للسرعة في بعض البيئات لكننا سنستخدم readFileSync هنا لضمان وجود البيانات
                // ملاحظة: إذا كان الملف كبيراً جداً، Stream أفضل، لكن Buffer في Baileys أحياناً يكون أسرع في الرفع
                mimetype: 'video/mp4',
                caption: `🎬 *${lesson.name}*\nالمستوى ${levelTxt} — اللغة القبطية 📖`
            }, { quoted: message });
            
            await new Promise(r => setTimeout(r, 1000));
        } catch (e) {
            console.error('❌ فيديو:', e.message);
            await sock.sendMessage(chatId, { text: `❌ فشل تحميل الفيديو لدرس: ${lesson.name}` });
        }
    }

    // 2. إرسال الشفوي / التدريب
    if (lesson.extra) {
        if (level === 1 && lesson.extra.startsWith('http')) {
            try {
                const res = await axios.get(lesson.extra, { responseType: 'arraybuffer' });
                await sock.sendMessage(chatId, {
                    image: Buffer.from(res.data),
                    caption: `📢 *الواجب الشفوي: ${lesson.name}*`
                });
                await new Promise(r => setTimeout(r, 1000));
            } catch (e) { console.error('❌ شفوي:', e.message); }
        } else if (level === 2) {
            await sock.sendMessage(chatId, { text: `📝 *التدريب المطلوب لدرس ${lesson.name}:*\n\n${lesson.extra}` });
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    // 3. إرسال الملخص (L2)
    if (level === 2 && lesson.summaryUrl) {
        try {
            const res = await axios.get(lesson.summaryUrl, { responseType: 'arraybuffer' });
            await sock.sendMessage(chatId, {
                image: Buffer.from(res.data),
                caption: `🖼️ *ملخص الدرس: ${lesson.name}*`
            });
            await new Promise(r => setTimeout(r, 1000));
        } catch (e) { console.error('❌ ملخص:', e.message); }
    }

    // 4. رابط الامتحان
    if (lesson.examUrl) {
        await sock.sendMessage(chatId, { text: `📝 *امتحان درس ${lesson.name}:*\n${lesson.examUrl}` });
    }

    await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
    await sock.sendMessage(chatId, { text: `انتهى عرض الدرس.` + backHint() });

    return true;
}

async function handleLearnSession(sock, chatId, message, text) {
    const session = learnSessions.get(chatId);
    if (!session) return { handled: false };
    if (Date.now() - session.timestamp > SESSION_TIMEOUT) {
        learnSessions.delete(chatId);
        return { handled: false };
    }
    session.timestamp = Date.now();
    const num = parseInt(text.trim());

    if (session.step === 'level') {
        if (num === 1 || num === 2) {
            await showLessons(sock, chatId, message, num);
            return { handled: true };
        }
        await sock.sendMessage(chatId, { text: `⚠️ اكتب *1* أو *2*.\n` + backHint() });
        return { handled: true };
    }

    if (session.step === 'lessons_1' || session.step === 'lessons_2') {
        const level = session.step === 'lessons_1' ? 1 : 2;
        const count = learnDbSize(level);
        if (num >= 1 && num <= count) {
            await sendLesson(sock, chatId, message, level, num);
            return { handled: true };
        }
        await sock.sendMessage(chatId, { text: `⚠️ اكتب رقماً من 1 إلى ${count}.\n` + backHint() });
        return { handled: true };
    }
    return { handled: false };
}

function getLearnBackTarget(chatId) {
    const s = learnSessions.get(chatId);
    if (!s) return 'main';
    if (s.step === 'lessons_1' || s.step === 'lessons_2') return 'level';
    return 'main';
}

function isInLearnSession(chatId) {
    const s = learnSessions.get(chatId);
    if (!s) return false;
    return (Date.now() - s.timestamp <= SESSION_TIMEOUT);
}

function clearLearnSession(chatId) { learnSessions.delete(chatId); }

module.exports = { learnCommand, handleLearnSession, isInLearnSession, clearLearnSession, getLearnBackTarget };
