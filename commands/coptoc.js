/**
 * coptoc.js — القاموس القبطي-العربي الناطق v10.0
 * ─────────────────────────────────────────────────────────────
 * تم التحديث ليتطابق بالملي مع منطق Apps Script المقدم
 * ─────────────────────────────────────────────────────────────
 */

const axios = require('axios');
const { getFileInfo, suggestWords } = require('../lib/coptocDb');
const { sendButtons } = require('../lib/buttons');

const dictSessions    = new Map();
const SESSION_TIMEOUT = 10 * 60 * 1000;

function backHint() {
    return `\nللرجوع للقائمة الرئيسية اكتب 00`;
}

// ── إرسال الملف (صوت، صورة، فيديو، إلخ) ──────────────────────
async function sendFile(sock, chatId, message, fileUrl, mimeType, caption, fileName) {
    await sock.sendPresenceUpdate('composing', chatId);
    if (!fileUrl) return;
    try {
        let downloadUrl = fileUrl;
        // تحويل روابط درايف إلى روابط تحميل مباشرة إذا لزم الأمر
        if (fileUrl.includes('drive.google.com')) {
            const fileId = fileUrl.match(/[-\w]{25,}/)?.[0];
            if (fileId) downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        }

        const response = await axios.get(downloadUrl, {
            responseType : 'arraybuffer',
            timeout      : 60000,
            headers      : { 'User-Agent': 'Mozilla/5.0' }
        });
        const buf = Buffer.from(response.data, 'binary');

        const type = mimeType.split('/')[0];
        const payload = { caption: caption };

        if (type === 'audio') {
            payload.audio = buf;
            payload.mimetype = 'audio/mpeg';
            payload.ptt = false;
            delete payload.caption; // الصوت لا يدعم caption في العادة
        } else if (type === 'image') {
            payload.image = buf;
        } else if (type === 'video') {
            payload.video = buf;
        } else {
            payload.document = buf;
            payload.fileName = fileName || 'file';
            payload.mimetype = mimeType;
        }

        await sock.sendMessage(chatId, payload, { quoted: message });

    } catch (err) {
        console.error('❌ خطأ في إرسال الملف:', err.message);
        await sock.sendMessage(chatId, { text: `🔇 *تعذّر تحميل الملف*\nالرابط: ${fileUrl}` }, { quoted: message });
    }
}

// ── عرض الاقتراحات (قائمة نصية مضمونة) ──────────────────────
async function sendSuggestions(sock, chatId, message, suggestions) {
    await sock.sendPresenceUpdate('composing', chatId);
    
    // نأخذ أول 20 اقتراحاً
    const limited = suggestions.slice(0, 20);
    const list = limited.map((s, i) => `*${i + 1}* - ${s}`).join('\n');
    
    const text = `💡 *اقتراحات مشابهة لطلبك:*\n\n` +
                 `${list}\n\n` +
                 `تفضل بكتابة الكلمة الصحيحة من القائمة أعلاه 🔍` + 
                 backHint();

    await sock.sendMessage(chatId, { text }, { quoted: message });
}

// ── تنفيذ البحث الفعلي ────────────────────────────────────────
async function performCoptocLookup(sock, chatId, message, word, index = 0) {
    await sock.sendPresenceUpdate('composing', chatId);
    const matchingFiles = getFileInfo(word);

    // إذا كانت النتيجة "قيد التطوير"
    if (matchingFiles.length > 0 && matchingFiles[0].messages[0] === "القاموس قيد التطوير حاليا وسيتم اضافة معنى هذه الكلمة لاحقا") {
        const suggestions = suggestWords(word);
        if (suggestions.length > 0) {
            await sendSuggestions(sock, chatId, message, suggestions);
            dictSessions.set(chatId, { waiting: true, searchTerm: word, timestamp: Date.now() });
        } else {
            await sock.sendMessage(chatId, { text: matchingFiles[0].messages[0] + backHint() }, { quoted: message });
        }
        return;
    }

    if (matchingFiles.length === 0) {
        await sock.sendMessage(chatId, { text: "القاموس قيد التطوير حاليا وسيتم اضافة معنى هذه الكلمة لاحقا" + backHint() }, { quoted: message });
        return;
    }

    // عرض النتيجة بناءً على الفهرس
    const fileInfo = matchingFiles[index];
    const caption = fileInfo.messages.join('\n');

    await sock.sendMessage(chatId, { react: { text: '🔍', key: message.key } });
    
    // إرسال النص أولاً في رسالة منفصلة لأن الصوت لا يدعم Caption
    await sock.sendMessage(chatId, { text: caption }, { quoted: message });

    await sendFile(sock, chatId, message, fileInfo.fileUrl, fileInfo.mimeType, "", fileInfo.fileName);

    // إذا كان هناك المزيد من المعاني
    if (matchingFiles.length > index + 1) {
        dictSessions.set(chatId, { 
            waiting: true, 
            searchTerm: word, 
            currentIndex: index, 
            results: matchingFiles,
            timestamp: Date.now() 
        });

        await sendButtons(sock, chatId, message, '📖 معاني أخرى', 'هناك معنى اخر للكلمة التي بحثت بها', '', [
            { id: 'next_meaning', text: 'اضغط هنا لعرضه' }
        ]);
    } else {
        await sock.sendMessage(chatId, { text: `✨ تفضل بكتابة كلمة أخرى للبحث في القاموس 🔍` + backHint() });
        dictSessions.set(chatId, { waiting: true, timestamp: Date.now() });
    }

    await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
}

// ── الأمر الرئيسي للقاموس ────────────────────────────────────
async function coptocCommand(sock, chatId, message) {
    try {
        await sock.sendPresenceUpdate('composing', chatId);
        dictSessions.set(chatId, { waiting: true, timestamp: Date.now() });
        await sock.sendMessage(chatId, {
            text:
                `📖 *القاموس القبطي*\n\n` +
                `تفضل بكتابة الكلمة القبطية أو العربية التي تريد البحث عنها 🔍\n` +
                backHint()
        });
    } catch (err) {
        console.error('❌ coptocCommand:', err);
    }
}

// ── معالجة رد المستخدم ───────────────────────────────────────
async function handleCoptocReply(sock, chatId, message, userMessage) {
    const session = dictSessions.get(chatId);
    if (!session?.waiting) return false;

    if (Date.now() - session.timestamp > SESSION_TIMEOUT) {
        dictSessions.delete(chatId);
        return false;
    }

    const trimmed = userMessage.trim();
    if (!trimmed) return false;

    // معالجة "Next Meaning"
    if (trimmed === 'next_meaning' && session.searchTerm && session.results) {
        const nextIndex = (session.currentIndex || 0) + 1;
        await performCoptocLookup(sock, chatId, message, session.searchTerm, nextIndex);
        return true;
    }

    // معالجة البحث العادي أو اختيار من الاقتراحات
    await performCoptocLookup(sock, chatId, message, trimmed);
    return true;
}

function isWaitingForCoptoc(chatId) {
    const s = dictSessions.get(chatId);
    if (!s) return false;
    if (Date.now() - s.timestamp > SESSION_TIMEOUT) {
        dictSessions.delete(chatId);
        return false;
    }
    return s.waiting === true;
}

function endCoptocSession(chatId) {
    dictSessions.delete(chatId);
}

module.exports = {
    coptocCommand,
    handleCoptocReply,
    isWaitingForCoptoc,
    endCoptocSession
};
