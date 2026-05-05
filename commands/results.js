/**
 * results.js â€” ظ†طھظٹط¬ط© ط§ظ„ظ„ط؛ط© ط§ظ„ظ‚ط¨ط·ظٹط©
 * ط§ظ„ظ…ظ„ظپ: natiga.xlsx
 */

const axios = require('axios');
const { lookupResult, resultsSize } = require('../lib/resultsDb');

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

        resultsSessions.delete(chatId);

        if (!certUrl) {
            await sock.sendMessage(chatId, {
                text:
                    `âڑ ï¸ڈ *ط§ظ„ط±ظ‚ظ… ط§ظ„ظƒظˆط¯ظٹ ط؛ظٹط± ط³ظ„ظٹظ…*\n\n` +
                    `ظ„ظ… ظٹطھظ… ط§ظ„ط¹ط«ظˆط± ط¹ظ„ظ‰ ط§ظ„ط±ظ‚ظ…: *${trimmed}* ظپظٹ ظ†طھط§ط¦ط¬ ط§ظ„ظ…ط³طھظˆظ‰ ${LEVEL_NAMES[level]}.\n\n` +
                    `طھط£ظƒط¯ ظ…ظ† ظƒطھط§ط¨ط© ط§ظ„ط±ظ‚ظ… ط¨ط´ظƒظ„ طµط­ظٹط­ ط£ظˆ طھظˆط§طµظ„ ظ…ط¹ ط§ظ„ط¥ط¯ط§ط±ط© ًں‘‘`
            }, { quoted: message });
            return { handled: true };
        }

        // ط¥ط¸ظ‡ط§ط± طھظپط§ط¹ظ„ ط§ظ„طھط­ظ…ظٹظ„
        await sock.sendMessage(chatId, { react: { text: 'âڈ³', key: message.key } });

        try {
            const response = await axios.get(certUrl, {
                responseType: 'arraybuffer',
                timeout: 30000,
                maxRedirects: 10,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const imgBuffer = Buffer.from(response.data, 'binary');
            
            // ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† طµط­ط© ط§ظ„طµظˆط±ط©
            if (imgBuffer.length < 500) {
                throw new Error('ط§ظ„ظ…ظ„ظپ ظپط§ط±ط؛ ط£ظˆ ط؛ظٹط± طµط§ظ„ط­');
            }

            // ط¥ط¸ظ‡ط§ط± طھظپط§ط¹ظ„ ط§ظ„ظ†ط¬ط§ط­
            await sock.sendMessage(chatId, { react: { text: 'âœ…', key: message.key } });
            
            // ط¥ط±ط³ط§ظ„ ط§ظ„ط´ظ‡ط§ط¯ط©
            await sock.sendMessage(chatId, {
                image: imgBuffer,
                caption:
                    `ًںژ“ *ط´ظ‡ط§ط¯ط© ط§ظ„ظ„ط؛ط© ط§ظ„ظ‚ط¨ط·ظٹط©*\n\n` +
                    `ًں“‹ ط§ظ„ظ…ط³طھظˆظ‰: ${LEVEL_NAMES[level]}\n` +
                    `ًں”¢ ط§ظ„ط±ظ‚ظ… ط§ظ„ظƒظˆط¯ظٹ: ${trimmed}\n\n` +
                    `ًں‘¨â€چًںڈ« ظ…ط³ط¤ظˆظ„ ط§ظ„ط¯ظˆط±ط©: ط¥ط¨ط±ط§ظ… ظ…ط±ط²ظ‚\n` +
                    `ًںژ‰ ط£ظ„ظپ ظ…ط¨ط±ظˆظƒ ط§ظ„ظ†ط¬ط§ط­!`
            }, { quoted: message });

        } catch (err) {
            console.error('â‌Œ ط®ط·ط£ ظپظٹ ط¥ط±ط³ط§ظ„ ط§ظ„ط´ظ‡ط§ط¯ط©:', err.message);
            await sock.sendMessage(chatId, { react: { text: 'â‌Œ', key: message.key } });
            await sock.sendMessage(chatId, {
                text: 
                    `â‌Œ *طھط¹ط°ظ‘ط± طھط­ظ…ظٹظ„ ط§ظ„ط´ظ‡ط§ط¯ط©*\n\n` +
                    `âڑ ï¸ڈ ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، طھط­ظ…ظٹظ„ ط§ظ„ط´ظ‡ط§ط¯ط©\n\n` +
                    `ًں”§ ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ„ط§ط­ظ‚ط§ظ‹\n` +
                    `ًں“‍ ط£ظˆ ط§ظ„طھظˆط§طµظ„ ظ…ط¹ ظ…ط³ط¤ظˆظ„ ط§ظ„ط¯ظˆط±ط© ًں‘‘\n\n` +
                    `ًں”— ط±ط§ط¨ط· ط§ظ„ط´ظ‡ط§ط¯ط© (ط¥ط°ط§ ظƒظ†طھ ط¨ط­ط§ط¬ط©):\n${certUrl}`
            }, { quoted: message });
        }

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