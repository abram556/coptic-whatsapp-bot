/**
 * results.js — نتيجة اللغة القبطية
 * الملف: natiga.xlsx
 */

const axios = require('axios');
const { lookupResult, resultsSize, getStudentName, checkExamStatus, checkUserHasCompleted } = require('../lib/resultsDb');

const resultsSessions = new Map();
const SESSION_TIMEOUT = 5 * 60 * 1000;

const LEVEL_NAMES = { 1: 'الأول', 2: 'الثاني' };

function backHint() {
    return `\n━━━━━━━━━━━━━━━━━━\n📌 *للرجوع للقائمة السابقة:* اكتب 0\n🏠 *للرجوع للقائمة الرئيسية:* اكتب 00`;
}

async function resultsCommand(sock, chatId, message) {
    try {
        resultsSessions.set(chatId, { step: 'level', timestamp: Date.now() });
        await sock.sendMessage(chatId, {
            text:
                `🏆 *نتيجة اللغة القبطية*\n\n` +
                `✏️ *اختر المستوى:*\n` +
                `1️⃣ المستوى الأول\n` +
                `2️⃣ المستوى الثاني\n\n` +
                backHint()
        }, { quoted: message });
    } catch (err) {
        console.error('❌ resultsCommand:', err);
    }
}

async function handleResultsSession(sock, chatId, message, text) {
    const session = resultsSessions.get(chatId);
    if (!session) return { handled: false };

    if (Date.now() - session.timestamp > SESSION_TIMEOUT) {
        resultsSessions.delete(chatId);
        return { handled: false };
    }

    session.timestamp = Date.now();
    const trimmed = text.trim();
    const num = parseInt(trimmed);

    // معالجة الرجوع
    if (trimmed === '00') {
        resultsSessions.delete(chatId);
        return { handled: true, backToMain: true };
    }
    
    if (trimmed === '0') {
        if (session.step === 'code') {
            session.step = 'level';
            session.level = null;
            await sock.sendMessage(chatId, {
                text:
                    `🏆 *نتيجة اللغة القبطية*\n\n` +
                    `✏️ *اختر المستوى:*\n` +
                    `1️⃣ المستوى الأول\n` +
                    `2️⃣ المستوى الثاني\n\n` +
                    backHint()
            }, { quoted: message });
            return { handled: true };
        }
        resultsSessions.delete(chatId);
        return { handled: true, backToMain: true };
    }

    if (session.step === 'level') {
        if (num === 1 || num === 2) {
            session.step = 'code';
            session.level = num;
            await sock.sendMessage(chatId, {
                text:
                    `🏆 *نتيجة المستوى ${LEVEL_NAMES[num]}*\n` +
                    `📝 أدخل الرقم الكودي الخاص بك:\n` +
                    `(مثال: 12345)\n` +
                    backHint()
            }, { quoted: message });
            return { handled: true };
        }
        await sock.sendMessage(chatId, {
            text: `⚠️ *خطأ في الإدخال*\n\nيرجى إدخال:\n• 1 للمستوى الأول\n• 2 للمستوى الثاني\n\n` + backHint()
        }, { quoted: message });
        return { handled: true };
    }

    if (session.step === 'code') {
        const level = session.level;
        const result = lookupResult(level, trimmed);

        // 1. البحث الأساسي عن الشهادة والبيانات
        if (result) {
            const { message: resultMsg, url: certUrl } = result;
            await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });

            if (certUrl) {
                try {
                    const response = await axios.get(certUrl, { responseType: 'arraybuffer', timeout: 20000 });
                    const imgBuffer = Buffer.from(response.data, 'binary');
                    await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
                    
                    let caption = resultMsg || `🎓 *شهادة اللغة القبطية*\n📋 المستوى: ${LEVEL_NAMES[level]}\n🔢 الرقم الكودي: ${trimmed}\n🎉 ألف مبروك النجاح!`;
                    caption += `\n📝 أدخل رقم كودي آخر أو اضغط 0 للرجوع`;
                    
                    await sock.sendMessage(chatId, {
                        image: imgBuffer,
                        caption: caption
                    }, { quoted: message });
                    
                    return { handled: true };
                } catch (err) {
                    console.error('❌ Failed to fetch image:', err.message);
                    await sock.sendMessage(chatId, { react: { text: '⚠️', key: message.key } });
                    let finalMsg = resultMsg ? `${resultMsg}\n🔗 رابط الشهادة:\n${certUrl}` : `❌ تعذّر تحميل الصورة، إليك الرابط المباشر:\n${certUrl}`;
                    finalMsg += `\n📝 أدخل رقم كودي آخر أو اضغط 0 للرجوع`;
                    await sock.sendMessage(chatId, { text: finalMsg }, { quoted: message });
                    return { handled: true };
                }
            } else if (resultMsg) {
                await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
                await sock.sendMessage(chatId, { text: resultMsg + `\n📝 أدخل رقم كودي آخر أو اضغط 0 للرجوع` }, { quoted: message });
                return { handled: true };
            }
        }

        // 2. التحقق الإضافي الذكي (Babon Logic)
        const studentName = getStudentName(trimmed);
        
        if (studentName) {
            const hasCompleted = checkUserHasCompleted(level, trimmed);
            
            if (!hasCompleted) {
                const { hasAnyExam, examsStatus, examNames } = checkExamStatus(level, trimmed);
                
                if (!hasAnyExam) {
                    // حالة الطالب الذي لم يبدأ أي امتحان
                    await sock.sendMessage(chatId, {
                        image: { url: "https://cdn-icons-png.flaticon.com/512/4201/4201973.png" },
                        caption: `عفواً يا *${studentName}*،\n⚠️ يجب بدء حل الامتحانات الإلكترونية وإنهائها للحصول على الشهادة. 📚✍️\n📝 أدخل رقم كودي آخر أو اضغط 0 للرجوع`
                    }, { quoted: message });
                    return { handled: true };
                } else {
                    // حالة الطالب الذي حل بعض الامتحانات ولم يكملها
                    let missingExams = [];
                    for (let j = 0; j < examsStatus.length; j++) {
                        if (!examsStatus[j]) missingExams.push(examNames[j]);
                    }

                    if (missingExams.length > 0) {
                        let formattedMissing = missingExams.map((exam, index) => index === 0 ? exam : exam.replace("الامتحان ", ""));
                        await sock.sendMessage(chatId, {
                            image: { url: "https://cdn-icons-png.flaticon.com/512/4201/4201973.png" },
                            caption: `عفواً يا *${studentName}*،\n⚠️ يجب حل *${formattedMissing.join(" و ")}* للحصول على الشهادة. 📚✍️\n📝 أدخل رقم كودي آخر أو اضغط 0 للرجوع`
                        }, { quoted: message });
                        return { handled: true };
                    }
                }
            }
        }

        // 3. إذا لم ينجح أي من محاولات البحث (أو الطالب في USER ولكن لا توجد شهادة)
        await sock.sendMessage(chatId, {
            text: `⚠️ *الرقم الكودي غير سليم*\nتأكد من كتابة الرقم بشكل صحيح أو تواصل مع الإدارة 👑\n📝 أدخل رقم كودي آخر أو اضغط 0 للرجوع`
        }, { quoted: message });
        
        return { handled: true };
    }

    return { handled: false };
}

function getResultsBackTarget(chatId) {
    const s = resultsSessions.get(chatId);
    if (!s) return 'main';
    if (s.step === 'code') return 'level';
    return 'main';
}

function isInResultsSession(chatId) {
    const s = resultsSessions.get(chatId);
    if (!s) return false;
    if (Date.now() - s.timestamp > SESSION_TIMEOUT) {
        resultsSessions.delete(chatId);
        return false;
    }
    return true;
}

function clearResultsSession(chatId) {
    resultsSessions.delete(chatId);
}

module.exports = {
    resultsCommand, 
    handleResultsSession,
    isInResultsSession, 
    clearResultsSession, 
    getResultsBackTarget
};