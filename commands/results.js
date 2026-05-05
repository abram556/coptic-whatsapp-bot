/**
 * results.js â€” ظ†طھظٹط¬ط© ط§ظ„ظ„ط؛ط© ط§ظ„ظ‚ط¨ط·ظٹط©
 * ط§ظ„ظ…ظ„ظپ: natiga.xlsx
 */

const axios = require('axios');
const { lookupResult, resultsSize, getStudentName, checkExamStatus } = require('../lib/resultsDb');

const resultsSessions = new Map();
const SESSION_TIMEOUT = 5 * 60 * 1000;

const LEVEL_NAMES = { 1: 'ط§ظ„ط£ظˆظ„', 2: 'ط§ظ„ط«ط§ظ†ظٹ' };

function backHint() {
    return `\nâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پ\nًں“Œ *ظ„ظ„ط±ط¬ظˆط¹ ظ„ظ„ظ‚ط§ط¦ظ…ط© ط§ظ„ط³ط§ط¨ظ‚ط©:* ط§ظƒطھط¨ 0\nًںڈ  *ظ„ظ„ط±ط¬ظˆط¹ ظ„ظ„ظ‚ط§ط¦ظ…ط© ط§ظ„ط±ط¦ظٹط³ظٹط©:* ط§ظƒطھط¨ 00`;
}

async function resultsCommand(sock, chatId, message) {
    try {
        resultsSessions.set(chatId, { step: 'level', timestamp: Date.now() });
        const s1 = resultsSize(1);
        const s2 = resultsSize(2);
        await sock.sendMessage(chatId, {
            text:
                `ًںڈ† *ظ†طھظٹط¬ط© ط§ظ„ظ„ط؛ط© ط§ظ„ظ‚ط¨ط·ظٹط©*\n\n` +
                `ًں“ٹ ط¹ط¯ط¯ ط§ظ„ط·ظ„ط§ط¨ ط§ظ„ظ…ط³ط¬ظ„ظٹظ†:\n` +
                `â€¢ ط§ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط£ظˆظ„: ${s1} ط·ط§ظ„ط¨\n` +
                `â€¢ ط§ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط«ط§ظ†ظٹ: ${s2} ط·ط§ظ„ط¨\n\n` +
                `âœڈï¸ڈ *ط§ط®طھط± ط§ظ„ظ…ط³طھظˆظ‰:*\n` +
                `1ï¸ڈâƒ£ ط§ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط£ظˆظ„\n` +
                `2ï¸ڈâƒ£ ط§ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط«ط§ظ†ظٹ\n\n` +
                backHint()
        }, { quoted: message });
    } catch (err) {
        console.error('â‌Œ resultsCommand:', err);
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

    // ظ…ط¹ط§ظ„ط¬ط© ط§ظ„ط±ط¬ظˆط¹
    if (trimmed === '00') {
        resultsSessions.delete(chatId);
        return { handled: true, backToMain: true };
    }
    
    if (trimmed === '0') {
        if (session.step === 'code') {
            session.step = 'level';
            session.level = null;
            const s1 = resultsSize(1);
            const s2 = resultsSize(2);
            await sock.sendMessage(chatId, {
                text:
                    `ًںڈ† *ظ†طھظٹط¬ط© ط§ظ„ظ„ط؛ط© ط§ظ„ظ‚ط¨ط·ظٹط©*\n\n` +
                    `ًں“ٹ ط¹ط¯ط¯ ط§ظ„ط·ظ„ط§ط¨ ط§ظ„ظ…ط³ط¬ظ„ظٹظ†:\n` +
                    `â€¢ ط§ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط£ظˆظ„: ${s1} ط·ط§ظ„ط¨\n` +
                    `â€¢ ط§ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط«ط§ظ†ظٹ: ${s2} ط·ط§ظ„ط¨\n\n` +
                    `âœڈï¸ڈ *ط§ط®طھط± ط§ظ„ظ…ط³طھظˆظ‰:*\n` +
                    `1ï¸ڈâƒ£ ط§ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط£ظˆظ„\n` +
                    `2ï¸ڈâƒ£ ط§ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط«ط§ظ†ظٹ\n\n` +
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
                    `ًںڈ† *ظ†طھظٹط¬ط© ط§ظ„ظ…ط³طھظˆظ‰ ${LEVEL_NAMES[num]}*\n\n` +
                    `ًں“‌ ط£ط¯ط®ظ„ ط§ظ„ط±ظ‚ظ… ط§ظ„ظƒظˆط¯ظٹ ط§ظ„ط®ط§طµ ط¨ظƒ:\n` +
                    `(ظ…ط«ط§ظ„: 12345)\n\n` +
                    backHint()
            }, { quoted: message });
            return { handled: true };
        }
        await sock.sendMessage(chatId, {
            text: `âڑ ï¸ڈ *ط®ط·ط£ ظپظٹ ط§ظ„ط¥ط¯ط®ط§ظ„*\n\nظٹط±ط¬ظ‰ ط¥ط¯ط®ط§ظ„:\nâ€¢ 1 ظ„ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط£ظˆظ„\nâ€¢ 2 ظ„ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط«ط§ظ†ظٹ\n\n` + backHint()
        }, { quoted: message });
        return { handled: true };
    }

    if (session.step === 'code') {
        const level = session.level;
        const certUrl = lookupResult(level, trimmed);

        // 1. ط¥ط°ط§ ظˆط¬ط¯طھ ط§ظ„ط´ظ‡ط§ط¯ط©طŒ ط£ط±ط³ظ„ظ‡ط§ ظپظˆط±ط§ظ‹
        if (certUrl) {
            await sock.sendMessage(chatId, { react: { text: 'âڈ³', key: message.key } });
            try {
                const response = await axios.get(certUrl, { responseType: 'arraybuffer', timeout: 20000 });
                const imgBuffer = Buffer.from(response.data, 'binary');
                await sock.sendMessage(chatId, { react: { text: 'âœ…', key: message.key } });
                await sock.sendMessage(chatId, {
                    image: imgBuffer,
                    caption: `ًںژ“ *ط´ظ‡ط§ط¯ط© ط§ظ„ظ„ط؛ط© ط§ظ„ظ‚ط¨ط·ظٹط©*\n\nًں“‹ ط§ظ„ظ…ط³طھظˆظ‰: ${LEVEL_NAMES[level]}\nًں”¢ ط§ظ„ط±ظ‚ظ… ط§ظ„ظƒظˆط¯ظٹ: ${trimmed}\n\nًںژ‰ ط£ظ„ظپ ظ…ط¨ط±ظˆظƒ ط§ظ„ظ†ط¬ط§ط­!`
                }, { quoted: message });
                resultsSessions.delete(chatId);
                return { handled: true };
            } catch (err) {
                await sock.sendMessage(chatId, { text: `â‌Œ طھط¹ط°ظ‘ط± طھط­ظ…ظٹظ„ ط§ظ„طµظˆط±ط©طŒ ط¥ظ„ظٹظƒ ط§ظ„ط±ط§ط¨ط· ط§ظ„ظ…ط¨ط§ط´ط±:\n${certUrl}` }, { quoted: message });
                resultsSessions.delete(chatId);
                return { handled: true };
            }
        }

        // 2. ط¥ط°ط§ ظ„ظ… طھظˆط¬ط¯ ط§ظ„ط´ظ‡ط§ط¯ط©طŒ ظ†ظپط° ظ…ظ†ط·ظ‚ "ط§ظ„ط¨ط¨ظˆظ†" ط§ظ„ط°ظƒظٹ
        const studentName = getStudentName(trimmed);
        
        if (studentName) {
            const { foundAny, status, examNames } = checkExamStatus(level, trimmed);
            
            if (!foundAny) {
                // ط­ط§ظ„ط© ط§ظ„ط·ط§ظ„ط¨ ط§ظ„ط°ظٹ ظ„ظ… ظٹط­ظ„ ط£ظٹ ط§ظ…طھط­ط§ظ†
                await sock.sendMessage(chatId, {
                    image: { url: "https://cdn-icons-png.flaticon.com/512/4201/4201973.png" },
                    caption: `ط¹ظپظˆط§ظ‹ ظٹط§ *${studentName}*طŒ\nâڑ ï¸ڈ ظٹط¬ط¨ ط¨ط¯ط، ط­ظ„ ط§ظ„ط§ظ…طھط­ط§ظ†ط§طھ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹط© ظˆط¥ظ†ظ‡ط§ط¦ظ‡ط§ ظ„ظ„ط­طµظˆظ„ ط¹ظ„ظ‰ ط§ظ„ط´ظ‡ط§ط¯ط©. ًں“ڑâœچï¸ڈ`
                }, { quoted: message });
            } else {
                // ط­ط§ظ„ط© ط§ظ„ط·ط§ظ„ط¨ ط§ظ„ط°ظٹ ط­ظ„ ط¨ط¹ط¶ ط§ظ„ط§ظ…طھط­ط§ظ†ط§طھ ظˆظ„ظ… ظٹظƒظ…ظ„ظ‡ط§
                let missingExams = [];
                for (let j = 0; j < status.length; j++) {
                    if (!status[j]) missingExams.push(examNames[j]);
                }

                if (missingExams.length > 0) {
                    let formattedMissing = missingExams.map((exam, index) => index === 0 ? exam : exam.replace("ط§ظ„ط§ظ…طھط­ط§ظ† ", ""));
                    await sock.sendMessage(chatId, {
                        image: { url: "https://cdn-icons-png.flaticon.com/512/4201/4201973.png" },
                        caption: `ط¹ظپظˆط§ظ‹ ظٹط§ *${studentName}*طŒ\nâڑ ï¸ڈ ظٹط¬ط¨ ط­ظ„ *${formattedMissing.join(" ظˆ ")}* ظ„ظ„ط­طµظˆظ„ ط¹ظ„ظ‰ ط§ظ„ط´ظ‡ط§ط¯ط©. ًں“ڑâœچï¸ڈ`
                    }, { quoted: message });
                } else {
                    // ط­ط§ظ„ط© ط§ط³طھط«ظ†ط§ط¦ظٹط©: ط­ظ„ ظƒظ„ ط§ظ„ط§ظ…طھط­ط§ظ†ط§طھ ظ„ظƒظ† ط§ظ„ط´ظ‡ط§ط¯ط© ظ„ظ… طھط±ظپط¹ ط¨ط¹ط¯
                    await sock.sendMessage(chatId, {
                        text: `ط£ظ‡ظ„ط§ظ‹ ظٹط§ *${studentName}*طŒ\nâœ… ظ„ظ‚ط¯ ط£طھظ…ظ…طھ ط¬ظ…ظٹط¹ ط§ظ„ط§ظ…طھط­ط§ظ†ط§طھ ط¨ظ†ط¬ط§ط­طŒ ط¬ط§ط±ظٹ ظ…ط±ط§ط¬ط¹ط© ظˆط±طµط¯ ط´ظ‡ط§ط¯طھظƒ ط­ط§ظ„ظٹط§ظ‹. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰ ظ„ط§ط­ظ‚ط§ظ‹.`
                    }, { quoted: message });
                }
            }
            resultsSessions.delete(chatId);
            return { handled: true };
        }

        // 3. ط¥ط°ط§ ظ„ظ… ظٹظˆط¬ط¯ ط§ظ„ط§ط³ظ… ظˆظ„ط§ ط§ظ„ط´ظ‡ط§ط¯ط©
        await sock.sendMessage(chatId, {
            text: `âڑ ï¸ڈ *ط§ظ„ط±ظ‚ظ… ط§ظ„ظƒظˆط¯ظٹ ط؛ظٹط± ط³ظ„ظٹظ…*\n\nطھط£ظƒط¯ ظ…ظ† ظƒطھط§ط¨ط© ط§ظ„ط±ظ‚ظ… ط¨ط´ظƒظ„ طµط­ظٹط­ ط£ظˆ طھظˆط§طµظ„ ظ…ط¹ ط§ظ„ط¥ط¯ط§ط±ط© ًں‘‘`
        }, { quoted: message });
        
        resultsSessions.delete(chatId);
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