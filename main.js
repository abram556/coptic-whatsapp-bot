/**
 * main.js â€” ظ…ط±ظƒط² ط§ظ„ظ„ط؛ط© ط§ظ„ظ‚ط¨ط·ظٹط© v8
 * طھظ…طھ ط§ظ„ط¥ط¶ط§ظپط©: ط­ط°ظپ ظ…طھط¹ط¯ط¯طŒ طھط¹ط¯ظٹظ„طŒ طھظ†ط²ظٹظ„ ط§ظ†طھظ‚ط§ط¦ظٹطŒ ط±ظپط¹ ظ…ط´طھط±ظƒظٹظ†طŒ ط¥ط­طµط§ط¦ظٹط§طھ
 */

const settings = require('./settings');
require('./config.js');

const { isBanned } = require('./lib/isBanned');
const { isAdmin, grantAdmin, revokeAdmin, isValidAdminCommand } = require('./lib/adminAuth');
const { sendButtons, sendListMessage } = require('./lib/buttons');
const { registerSubscriber, registerUsage, subscribersCount, exportSubscribersXlsx, importSubscribersFromXlsx, getAllSubscribers, getUserStats } = require('./lib/subscribersDb');

const { 
    coptocSize, 
    addWordFormatted, 
    addMultipleWordsFormatted,
    deleteWordByCopticFull,
    deleteMultipleWordsByCoptic,
    updateWord,
    exportCoptocXlsx, 
    reloadCoptocDb,
    getAllEntries,
    findEntryByCoptic,
    formatCellContent
} = require('./lib/coptocDb');

const { 
    resultsSize, 
    addResult, 
    deleteResult,
    deleteMultipleResults,
    updateResult,
    exportResultsXlsx, 
    reloadResultsDb,
    getAllResults,
    getResultEntry
} = require('./lib/resultsDb');

const { 
    learnDbSize, 
    addLesson, 
    deleteLesson,
    deleteMultipleLessons,
    updateLesson,
    exportLearnXlsx, 
    reloadLearnDb, 
    getLessons,
    getAllLessons
} = require('./lib/learnDb');

const ownerCommand = require('./commands/owner');

const { learnCommand, handleLearnSession, isInLearnSession, clearLearnSession, getLearnBackTarget } = require('./commands/learn');
const { coptocCommand, handleCoptocReply, isWaitingForCoptoc, endCoptocSession } = require('./commands/coptoc');
const { resultsCommand, handleResultsSession, isInResultsSession, clearResultsSession, getResultsBackTarget } = require('./commands/results');
const { broadcastCommand, handleBroadcastSession, isInBroadcastSession } = require('./commands/broadcast');

const { uploadCoptocCommand, handleCoptocUploadReply, isWaitingForCoptocUpload, handleDirectCoptocUpload } = require('./commands/uploadCoptoc');
const { uploadLearnCommand, handleLearnUploadReply, isWaitingForLearnUpload, handleDirectLearnUpload } = require('./commands/uploadLearn');
const { uploadResultsCommand, handleResultsUploadReply, isWaitingForResultsUpload, handleDirectResultsUpload } = require('./commands/uploadResults');
const { uploadSubscribersCommand, handleSubscribersUploadReply, isWaitingForSubscribersUpload, handleDirectSubscribersUpload } = require('./commands/uploadSubscribers');

// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
// ظ…ط¯ظٹط± ط§ظ„ط¬ظ„ط³ط§طھ
// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
const userActiveMode = new Map();

function setActiveMode(chatId, mode) { userActiveMode.set(chatId, mode); }
function getActiveMode(chatId) { return userActiveMode.get(chatId) || null; }

function clearAllSessions(chatId) {
    userActiveMode.delete(chatId);
    clearLearnSession(chatId);
    endCoptocSession(chatId);
    clearResultsSession(chatId);
}

// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
// طھط­ظˆظٹظ„ ط§ظ„ط£ط±ظ‚ط§ظ… ط§ظ„ط¹ط±ط¨ظٹط© ط¥ظ„ظ‰ ط¥ظ†ط¬ظ„ظٹط²ظٹط©
// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
function normalizeArabicNumerals(text) {
    const ar = 'ظ ظ،ظ¢ظ£ظ¤ظ¥ظ¦ظ§ظ¨ظ©';
    return text.replace(/[ظ -ظ©]/g, d => ar.indexOf(d).toString());
}

function parseMenuChoice(text) {
    const t = text.trim().toLowerCase();
    if (t === '1' || t === 'ظˆط§ط­ط¯' || t === 'ظˆط§ط­ط¯ظ‡') return 1;
    if (t === '2' || t === 'ط§ط«ظ†ظٹظ†' || t === 'ط§طھظ†ظٹظ†' || t === 'ط§ط«ظ†ط§ظ†') return 2;
    if (t === '3' || t === 'ط«ظ„ط§ط«ط©' || t === 'ط«ظ„ط§ط«ظ‡' || t === 'طھظ„ط§طھط©' || t === 'طھظ„ط§ط«ط©') return 3;
    return null;
}

function isBackCommand(text) {
    const t = text.trim().toLowerCase();
    return t === 'ط±ط¬ظˆط¹' || t === 'ط±ط¬ط¹' || t === 'back' || t === '0' || t === 'ط®ط±ظˆط¬';
}

function isMainMenuCommand(text) {
    const t = text.trim();
    return t === '00' || t === 'ظ‚ط§ط¦ظ…ط©' || t === 'ط§ظ„ط¨ط¯ط§ظٹط©' || t === 'ط±ط¦ظٹط³ظٹط©';
}

// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
// ط§ظ„ظ‚ط§ط¦ظ…ط© ط§ظ„ط±ط¦ظٹط³ظٹط©
// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
async function showMainMenu(sock, chatId, message) {
    clearAllSessions(chatId);
    const name = message?.pushName ? `ًں‘‹ ط£ظ‡ظ„ط§ظ‹ ${message.pushName}!\n\n` : 'ًں‘‹ ط£ظ‡ظ„ط§ظ‹!\n\n';
    await sock.sendMessage(chatId, {
        text:
            `${name}` +
            `ظ„طھط¹ظ„ظ… ط§ظ„ظ„ط؛ط© ط§ظ„ظ‚ط¨ط·ظٹط© ط§ظƒطھط¨ 1\n` +
            `ظ„ظ‚ط§ظ…ظˆط³ ط§ظ„ظ„ط؛ط© ط§ظ„ظ‚ط¨ط·ظٹط© ط§ظƒطھط¨ 2\n` +
            `ظ„ظ†طھظٹط¬ط© ط§ظ„ظ„ط؛ط© ط§ظ„ظ‚ط¨ط·ظٹط© ط§ظƒطھط¨ 3`
    });
}

async function enterLearnMode(sock, chatId, message, senderId) {
    clearAllSessions(chatId);
    setActiveMode(chatId, 'learn');
    registerUsage(senderId, 'learn');
    await learnCommand(sock, chatId, message);
}

async function enterDictMode(sock, chatId, message, senderId) {
    clearAllSessions(chatId);
    setActiveMode(chatId, 'dict');
    registerUsage(senderId, 'dict');
    await coptocCommand(sock, chatId, message);
}

async function enterResultsMode(sock, chatId, message, senderId) {
    clearAllSessions(chatId);
    setActiveMode(chatId, 'results');
    registerUsage(senderId, 'results');
    await resultsCommand(sock, chatId, message);
}

async function handleBack(sock, chatId, message) {
    const mode = getActiveMode(chatId);
    if (mode === 'learn') {
        const target = getLearnBackTarget(chatId);
        if (target === 'level') {
            clearLearnSession(chatId);
            setActiveMode(chatId, 'learn');
            await learnCommand(sock, chatId, message);
        } else {
            await showMainMenu(sock, chatId, message);
        }
        return;
    }
    if (mode === 'results') {
        const target = getResultsBackTarget(chatId);
        if (target === 'level') {
            clearResultsSession(chatId);
            setActiveMode(chatId, 'results');
            await resultsCommand(sock, chatId, message);
        } else {
            await showMainMenu(sock, chatId, message);
        }
        return;
    }
    if (mode === 'dict') {
        await showMainMenu(sock, chatId, message);
        return;
    }
    await showMainMenu(sock, chatId, message);
}

// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
// ط¬ظ„ط³ط§طھ ط§ظ„ط¥ط¶ط§ظپط© ط§ظ„ظٹط¯ظˆظٹط© ظ„ظ„ط£ط¯ظ…ظ†
// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
const adminSessions = new Map();
const ADMIN_SESSION_TIMEOUT = 10 * 60 * 1000;

function setAdminSession(key, data) {
    adminSessions.set(key, { ...data, timestamp: Date.now() });
}

function getAdminSession(key) {
    const s = adminSessions.get(key);
    if (!s) return null;
    if (Date.now() - s.timestamp > ADMIN_SESSION_TIMEOUT) {
        adminSessions.delete(key);
        return null;
    }
    return s;
}

function clearAdminSession(key) {
    adminSessions.delete(key);
}

// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
// ط¥ط­طµط§ط¦ظٹط§طھ ط§ظ„ط£ط¯ظ…ظ†
// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
async function sendStats(sock, chatId, message) {
    await sock.sendMessage(chatId, { react: { text: 'ًں“ٹ', key: message.key } });
    await sock.sendMessage(chatId, {
        text:
            `ًں“ٹ *ط¥ط­طµط§ط¦ظٹط§طھ ظ…ط±ظƒط² ط§ظ„ظ„ط؛ط© ط§ظ„ظ‚ط¨ط·ظٹط©*\n\n` +
            `ًں“ڑ ط¯ط±ظˆط³ ط§ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط£ظˆظ„: *${learnDbSize(1)}*\n` +
            `ًں“ڑ ط¯ط±ظˆط³ ط§ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط«ط§ظ†ظٹ: *${learnDbSize(2)}*\n\n` +
            `ًں“– ط§ظ„ظ‚ط§ظ…ظˆط³ ط§ظ„ظ‚ط¨ط·ظٹ: *${coptocSize()} ظƒظ„ظ…ط©*\n\n` +
            `ًںڈ† ظ†طھط§ط¦ط¬ ط§ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط£ظˆظ„: *${resultsSize(1)} ط·ط§ظ„ط¨*\n` +
            `ًںڈ† ظ†طھط§ط¦ط¬ ط§ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط«ط§ظ†ظٹ: *${resultsSize(2)} ط·ط§ظ„ط¨*\n\n` +
            `ًں‘¥ ط§ظ„ظ…ط´طھط±ظƒظˆظ†: *${subscribersCount()}*\n\n` +
            `ًں•گ ${new Date().toLocaleString('ar-EG')}`
    }, { quoted: message });
}

// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
// طھظ†ط²ظٹظ„ ط§ظ„ط´ظٹطھط§طھ ط¨ط´ظƒظ„ ط§ظ†طھظ‚ط§ط¦ظٹ
// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
async function sendSelectiveDownloads(sock, chatId, message) {
    await sock.sendMessage(chatId, {
        text:
            `ًں“¥ *طھظ†ط²ظٹظ„ ط§ظ„ط¨ظٹط§ظ†ط§طھ*\n\n` +
            `ط§ط®طھط± ظ…ط§ طھط±ظٹط¯ طھظ†ط²ظٹظ„ظ‡:\n\n` +
            `/downloadlearn - طھظ†ط²ظٹظ„ ظ…ظ„ظپ ط§ظ„طھط¹ظ„ظ…\n` +
            `/downloadcoptic - طھظ†ط²ظٹظ„ ظ…ظ„ظپ ط§ظ„ظ‚ط§ظ…ظˆط³\n` +
            `/downloadresults - طھظ†ط²ظٹظ„ ظ…ظ„ظپ ط§ظ„ظ†طھط§ط¦ط¬\n` +
            `/downloadsubs - طھظ†ط²ظٹظ„ ظ…ظ„ظپ ط§ظ„ظ…ط´طھط±ظƒظٹظ†\n` +
            `/downloadall - طھظ†ط²ظٹظ„ ط¬ظ…ظٹط¹ ط§ظ„ظ…ظ„ظپط§طھ`
    }, { quoted: message });
}

async function sendLearnDownload(sock, chatId, message) {
    const learnBuf = exportLearnXlsx();
    if (learnBuf) {
        await sock.sendMessage(chatId, {
            document: learnBuf,
            fileName: `learn_${Date.now()}.xlsx`,
            mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            caption: `ًں“ڑ ط¯ط±ظˆط³ ط§ظ„طھط¹ظ„ظ… â€” ط§ظ„ظ…ط³طھظˆظ‰1: ${learnDbSize(1)} | ط§ظ„ظ…ط³طھظˆظ‰2: ${learnDbSize(2)}`
        }, { quoted: message });
    } else {
        await sock.sendMessage(chatId, { text: `â‌Œ ظپط´ظ„ طھطµط¯ظٹط± ظ…ظ„ظپ ط§ظ„طھط¹ظ„ظ…` }, { quoted: message });
    }
}

async function sendCopticDownload(sock, chatId, message) {
    const coptocBuf = exportCoptocXlsx();
    if (coptocBuf) {
        await sock.sendMessage(chatId, {
            document: coptocBuf,
            fileName: `coptic_${Date.now()}.xlsx`,
            mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            caption: `ًں“– ط§ظ„ظ‚ط§ظ…ظˆط³ ط§ظ„ظ‚ط¨ط·ظٹ â€” ${coptocSize()} ظƒظ„ظ…ط©`
        }, { quoted: message });
    } else {
        await sock.sendMessage(chatId, { text: `â‌Œ ظپط´ظ„ طھطµط¯ظٹط± ظ…ظ„ظپ ط§ظ„ظ‚ط§ظ…ظˆط³` }, { quoted: message });
    }
}

async function sendResultsDownload(sock, chatId, message) {
    const natigaBuf = exportResultsXlsx();
    if (natigaBuf) {
        await sock.sendMessage(chatId, {
            document: natigaBuf,
            fileName: `natiga_${Date.now()}.xlsx`,
            mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            caption: `ًںڈ† ط§ظ„ظ†طھط§ط¦ط¬ â€” ط§ظ„ط£ظˆظ„: ${resultsSize(1)} | ط§ظ„ط«ط§ظ†ظٹ: ${resultsSize(2)}`
        }, { quoted: message });
    } else {
        await sock.sendMessage(chatId, { text: `â‌Œ ظپط´ظ„ طھطµط¯ظٹط± ظ…ظ„ظپ ط§ظ„ظ†طھط§ط¦ط¬` }, { quoted: message });
    }
}

async function sendSubscribersDownload(sock, chatId, message) {
    const subBuf = exportSubscribersXlsx();
    if (subBuf) {
        await sock.sendMessage(chatId, {
            document: subBuf,
            fileName: `subscribers_${Date.now()}.xlsx`,
            mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            caption: `ًں‘¥ ط§ظ„ظ…ط´طھط±ظƒظˆظ† â€” ${subscribersCount()} ظ…ط´طھط±ظƒ`
        }, { quoted: message });
    } else {
        await sock.sendMessage(chatId, { text: `â‌Œ ظپط´ظ„ طھطµط¯ظٹط± ظ…ظ„ظپ ط§ظ„ظ…ط´طھط±ظƒظٹظ†` }, { quoted: message });
    }
}

async function sendAllDownloads(sock, chatId, message) {
    await sendLearnDownload(sock, chatId, message);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await sendCopticDownload(sock, chatId, message);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await sendResultsDownload(sock, chatId, message);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await sendSubscribersDownload(sock, chatId, message);
}

// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
// ط¯ظˆط§ظ„ ظ…ط¹ط§ظ„ط¬ط© ط¬ظ„ط³ط§طھ ط§ظ„ط£ط¯ظ…ظ† ط§ظ„ط¬ط¯ظٹط¯ط©
// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
async function handleAdminSession(sock, chatId, message, senderId, trimmed) {
    const key = chatId + senderId;
    const session = getAdminSession(key);
    if (!session) return false;

    setAdminSession(key, { ...session, timestamp: Date.now() });

    // â”€â”€ addword_formatted (ط¥ط¶ط§ظپط© ط¨ط§ظ„ط´ظƒظ„ ط§ظ„ظ…ط·ظ„ظˆط¨) â”€â”€
    if (session.type === 'addword_formatted') {
        if (session.step === 'cell') {
            session.cellContent = trimmed;
            session.step = 'audio';
            setAdminSession(key, session);
            await sock.sendMessage(chatId, {
                text: `ط§ظ„ط®ط·ظˆط© 2/2 â€” ط£ط±ط³ظ„ ط±ط§ط¨ط· ط§ظ„طµظˆطھ (Google Drive):\n(ط£ظˆ ط£ط±ط³ظ„ "-" ط¥ط°ط§ ظ„ط§ ظٹظˆط¬ط¯ طµظˆطھ)`
            }, { quoted: message });
            return true;
        }
        if (session.step === 'audio') {
            const audioUrl = (trimmed === '-') ? null : trimmed;
            clearAdminSession(key);
            const ok = addWordFormatted(session.cellContent, audioUrl);
            await sock.sendMessage(chatId, {
                text: ok
                    ? `âœ… *طھظ…طھ ط§ظ„ط¥ط¶ط§ظپط© ظ„ظ„ظ‚ط§ظ…ظˆط³!*\n\n${session.cellContent}\nًں“ٹ ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ‚ط§ظ…ظˆط³: ${coptocSize()} ظƒظ„ظ…ط©`
                    : `â‌Œ ظپط´ظ„ ط­ظپط¸ ط§ظ„ظƒظ„ظ…ط©. طھط£ظƒط¯ ظ…ظ† ط§ظ„طµظٹط؛ط©: (ط§ظ„ظƒظ„ظ…ط§طھ ط§ظ„ط¹ط±ط¨ظٹط©). (ط§ظ„ظƒظ„ظ…ط© ط§ظ„ظ‚ط¨ط·ظٹط©). (ط§ظ„ط£طµظ„). (ط§ظ„ظ†ظˆط¹).mp3`
            }, { quoted: message });
            return true;
        }
    }

    // â”€â”€ deleteword_coptic (ط­ط°ظپ ط¨ط§ظ„ظƒظ„ظ…ط© ط§ظ„ظ‚ط¨ط·ظٹط©) â”€â”€
    if (session.type === 'deleteword_coptic') {
        const ok = deleteWordByCopticFull(trimmed);
        clearAdminSession(key);
        await sock.sendMessage(chatId, {
            text: ok
                ? `âœ… *طھظ… ط­ط°ظپ ط§ظ„ظƒظ„ظ…ط© ط¨ظ†ط¬ط§ط­!*\n\nًں“ٹ ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ‚ط§ظ…ظˆط³ ط¨ط¹ط¯ ط§ظ„ط­ط°ظپ: ${coptocSize()} ظƒظ„ظ…ط©`
                : `â‌Œ ظ„ظ… ظٹطھظ… ط§ظ„ط¹ط«ظˆط± ط¹ظ„ظ‰ ظƒظ„ظ…ط© "${trimmed}" ظپظٹ ط§ظ„ظ‚ط§ظ…ظˆط³.`
        }, { quoted: message });
        return true;
    }

    // â”€â”€ deleteword_multiple (ط­ط°ظپ ظ…طھط¹ط¯ط¯) â”€â”€
    if (session.type === 'deleteword_multiple') {
        const words = trimmed.split(/[طŒ,]+/).map(w => w.trim()).filter(Boolean);
        const result = deleteMultipleWordsByCoptic(words);
        clearAdminSession(key);
        await sock.sendMessage(chatId, {
            text:
                `ًں—‘ï¸ڈ *ط­ط°ظپ ظ…طھط¹ط¯ط¯ ظ…ظ† ط§ظ„ظ‚ط§ظ…ظˆط³*\n\n` +
                `âœ… طھظ… ط§ظ„ط­ط°ظپ: *${result.deleted}*\n` +
                `â‌Œ ظ„ظ… ظٹطھظ… ط§ظ„ط¹ط«ظˆط±: *${result.notFound}*\n` +
                `${result.notFoundWords.length > 0 ? `\nط؛ظٹط± ظ…ظˆط¬ظˆط¯: ${result.notFoundWords.join(', ')}` : ''}\n\n` +
                `ًں“ٹ ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ‚ط§ظ…ظˆط³ ط¨ط¹ط¯ ط§ظ„ط­ط°ظپ: ${coptocSize()} ظƒظ„ظ…ط©`
        }, { quoted: message });
        return true;
    }

    // â”€â”€ updateword (طھط¹ط¯ظٹظ„ ظƒظ„ظ…ط©) â”€â”€
    if (session.type === 'updateword') {
        if (session.step === 'find') {
            const entry = findEntryByCoptic(trimmed);
            if (!entry) {
                clearAdminSession(key);
                await sock.sendMessage(chatId, {
                    text: `â‌Œ ظ„ظ… ظٹطھظ… ط§ظ„ط¹ط«ظˆط± ط¹ظ„ظ‰ ظƒظ„ظ…ط© "${trimmed}" ظپظٹ ط§ظ„ظ‚ط§ظ…ظˆط³.`
                }, { quoted: message });
                return true;
            }
            session.oldCoptic = trimmed;
            session.oldEntry = entry;
            session.step = 'new_cell';
            setAdminSession(key, session);
            await sock.sendMessage(chatId, {
                text:
                    `âœڈï¸ڈ *طھط¹ط¯ظٹظ„ ظƒظ„ظ…ط© ظپظٹ ط§ظ„ظ‚ط§ظ…ظˆط³*\n\n` +
                    `ط§ظ„ظ…ط¯ط®ظ„ ط§ظ„ط­ط§ظ„ظٹ:\n${entry.originalCell}\n\n` +
                    `ط£ط±ط³ظ„ ط§ظ„ظ…ط­طھظˆظ‰ ط§ظ„ط¬ط¯ظٹط¯ ط¨ط§ظ„طµظٹط؛ط©:\n` +
                    `(ط§ظ„ظƒظ„ظ…ط§طھ ط§ظ„ط¹ط±ط¨ظٹط©). (ط§ظ„ظƒظ„ظ…ط© ط§ظ„ظ‚ط¨ط·ظٹط©). (ط§ظ„ط£طµظ„). (ط§ظ„ظ†ظˆط¹).mp3`
            }, { quoted: message });
            return true;
        }
        if (session.step === 'new_cell') {
            session.newCell = trimmed;
            session.step = 'new_audio';
            setAdminSession(key, session);
            await sock.sendMessage(chatId, {
                text: `ط£ط±ط³ظ„ ط±ط§ط¨ط· ط§ظ„طµظˆطھ ط§ظ„ط¬ط¯ظٹط¯ (ط£ظˆ "-" ظ„ظ„ط¥ط¨ظ‚ط§ط، ط¹ظ„ظ‰ ط§ظ„ط±ط§ط¨ط· ط§ظ„ط­ط§ظ„ظٹ):`
            }, { quoted: message });
            return true;
        }
        if (session.step === 'new_audio') {
            const newAudio = (trimmed === '-') ? session.oldEntry.audioUrl : trimmed;
            const ok = updateWord(session.oldCoptic, session.newCell, newAudio);
            clearAdminSession(key);
            await sock.sendMessage(chatId, {
                text: ok
                    ? `âœ… *طھظ… طھط¹ط¯ظٹظ„ ط§ظ„ظƒظ„ظ…ط© ط¨ظ†ط¬ط§ط­!*\n\n${session.newCell}`
                    : `â‌Œ ظپط´ظ„ طھط¹ط¯ظٹظ„ ط§ظ„ظƒظ„ظ…ط©. طھط£ظƒط¯ ظ…ظ† ط§ظ„طµظٹط؛ط© ط§ظ„طµط­ظٹط­ط©.`
            }, { quoted: message });
            return true;
        }
    }

    // â”€â”€ addlesson_formatted â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (session.type === 'addlesson_formatted') {
        if (session.step === 'level') {
            const n = parseInt(normalizeArabicNumerals(trimmed));
            if (n !== 1 && n !== 2) {
                await sock.sendMessage(chatId, { text: `âڑ ï¸ڈ ط£ط±ط³ظ„ 1 ظ„ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط£ظˆظ„ ط£ظˆ 2 ظ„ظ„ط«ط§ظ†ظٹ` }, { quoted: message });
                return true;
            }
            session.level = n;
            session.step = 'name';
            setAdminSession(key, session);
            await sock.sendMessage(chatId, { text: `ط§ظ„ط®ط·ظˆط© 2/3 â€” ط£ط±ط³ظ„ ط§ط³ظ… ط§ظ„ط¯ط±ط³:` }, { quoted: message });
            return true;
        }
        if (session.step === 'name') {
            session.lessonName = trimmed;
            session.step = 'url';
            setAdminSession(key, session);
            await sock.sendMessage(chatId, { text: `ط§ظ„ط®ط·ظˆط© 3/3 â€” ط£ط±ط³ظ„ ط±ط§ط¨ط· ظپظٹط¯ظٹظˆ ط§ظ„ط¯ط±ط³ (Google Drive):` }, { quoted: message });
            return true;
        }
        if (session.step === 'url') {
            if (!/^https?:\/\//.test(trimmed) && trimmed !== '-') {
                await sock.sendMessage(chatId, { text: `â‌Œ ط§ظ„ط±ط§ط¨ط· ط؛ظٹط± طµط­ظٹط­. ط£ط±ط³ظ„ ط±ط§ط¨ط·ط§ظ‹ ظٹط¨ط¯ط£ ط¨ظ€ https://` }, { quoted: message });
                return true;
            }
            const videoUrl = (trimmed === '-') ? null : trimmed;
            clearAdminSession(key);
            const ok = addLesson(session.level, session.lessonName, videoUrl);
            const lName = session.level === 1 ? 'ط§ظ„ط£ظˆظ„' : 'ط§ظ„ط«ط§ظ†ظٹ';
            await sock.sendMessage(chatId, {
                text: ok
                    ? `âœ… *طھظ…طھ ط¥ط¶ط§ظپط© ط§ظ„ط¯ط±ط³!*\n\nط§ظ„ظ…ط³طھظˆظ‰: ${lName}\nط§ظ„ط¯ط±ط³: ${session.lessonName}\nًں“ڑ ط¥ط¬ظ…ط§ظ„ظٹ ط¯ط±ظˆط³ ط§ظ„ظ…ط³طھظˆظ‰: ${learnDbSize(session.level)}`
                    : `â‌Œ ظپط´ظ„ ط­ظپط¸ ط§ظ„ط¯ط±ط³. ط­ط§ظˆظ„ ظ…ط¬ط¯ط¯ط§ظ‹.`
            }, { quoted: message });
            return true;
        }
    }

    // â”€â”€ deletelesson_multiple (ط­ط°ظپ ظ…طھط¹ط¯ط¯ ظ„ظ„ط¯ط±ظˆط³) â”€â”€
    if (session.type === 'deletelesson_multiple') {
        if (session.step === 'level') {
            const n = parseInt(normalizeArabicNumerals(trimmed));
            if (n !== 1 && n !== 2) {
                await sock.sendMessage(chatId, { text: `âڑ ï¸ڈ ط£ط±ط³ظ„ 1 ظ„ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط£ظˆظ„ ط£ظˆ 2 ظ„ظ„ط«ط§ظ†ظٹ` }, { quoted: message });
                return true;
            }
            session.level = n;
            session.step = 'names';
            setAdminSession(key, session);
            
            const lessons = getLessons(n);
            let lessonList = `ًں“ڑ *ط¯ط±ظˆط³ ط§ظ„ظ…ط³طھظˆظ‰ ${n === 1 ? 'ط§ظ„ط£ظˆظ„' : 'ط§ظ„ط«ط§ظ†ظٹ'}*:\n\n`;
            lessons.forEach((l, i) => {
                lessonList += `${i+1}. ${l.name}\n`;
            });
            lessonList += `\nط£ط±ط³ظ„ ط£ط³ظ…ط§ط، ط§ظ„ط¯ط±ظˆط³ ظ„ظ„ط­ط°ظپ ظ…ظپطµظˆظ„ط© ط¨ظپظˆط§طµظ„:`;
            
            await sock.sendMessage(chatId, { text: lessonList }, { quoted: message });
            return true;
        }
        if (session.step === 'names') {
            const names = trimmed.split(/[طŒ,]+/).map(n => n.trim()).filter(Boolean);
            const result = deleteMultipleLessons(session.level, names);
            clearAdminSession(key);
            const lName = session.level === 1 ? 'ط§ظ„ط£ظˆظ„' : 'ط§ظ„ط«ط§ظ†ظٹ';
            await sock.sendMessage(chatId, {
                text:
                    `ًں—‘ï¸ڈ *ط­ط°ظپ ظ…طھط¹ط¯ط¯ ظ…ظ† ط§ظ„ط¯ط±ظˆط³*\n\n` +
                    `âœ… طھظ… ط§ظ„ط­ط°ظپ: *${result.deleted}*\n` +
                    `â‌Œ ظ„ظ… ظٹطھظ… ط§ظ„ط¹ط«ظˆط±: *${result.notFound}*\n` +
                    `${result.notFoundNames.length > 0 ? `\nط؛ظٹط± ظ…ظˆط¬ظˆط¯: ${result.notFoundNames.join(', ')}` : ''}\n\n` +
                    `ًں“ڑ ط¥ط¬ظ…ط§ظ„ظٹ ط¯ط±ظˆط³ ط§ظ„ظ…ط³طھظˆظ‰ ${lName}: ${learnDbSize(session.level)}`
            }, { quoted: message });
            return true;
        }
    }

    // â”€â”€ updatelesson (طھط¹ط¯ظٹظ„ ط¯ط±ط³) â”€â”€
    if (session.type === 'updatelesson') {
        if (session.step === 'level') {
            const n = parseInt(normalizeArabicNumerals(trimmed));
            if (n !== 1 && n !== 2) {
                await sock.sendMessage(chatId, { text: `âڑ ï¸ڈ ط£ط±ط³ظ„ 1 ظ„ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط£ظˆظ„ ط£ظˆ 2 ظ„ظ„ط«ط§ظ†ظٹ` }, { quoted: message });
                return true;
            }
            session.level = n;
            session.step = 'find';
            setAdminSession(key, session);
            
            const lessons = getLessons(n);
            let lessonList = `ًں“ڑ *ط¯ط±ظˆط³ ط§ظ„ظ…ط³طھظˆظ‰ ${n === 1 ? 'ط§ظ„ط£ظˆظ„' : 'ط§ظ„ط«ط§ظ†ظٹ'}*:\n\n`;
            lessons.forEach((l, i) => {
                lessonList += `${i+1}. ${l.name}\n`;
            });
            lessonList += `\nط£ط±ط³ظ„ ط§ط³ظ… ط§ظ„ط¯ط±ط³ ط§ظ„ط°ظٹ طھط±ظٹط¯ طھط¹ط¯ظٹظ„ظ‡:`;
            
            await sock.sendMessage(chatId, { text: lessonList }, { quoted: message });
            return true;
        }
        if (session.step === 'find') {
            const lessons = getLessons(session.level);
            const found = lessons.find(l => l.name === trimmed);
            if (!found) {
                clearAdminSession(key);
                await sock.sendMessage(chatId, { text: `â‌Œ ظ„ظ… ظٹطھظ… ط§ظ„ط¹ط«ظˆط± ط¹ظ„ظ‰ ط¯ط±ط³ "${trimmed}"` }, { quoted: message });
                return true;
            }
            session.oldName = trimmed;
            session.step = 'new_name';
            setAdminSession(key, session);
            await sock.sendMessage(chatId, {
                text: `âœڈï¸ڈ *طھط¹ط¯ظٹظ„ ط¯ط±ط³*\n\nط§ظ„ط¯ط±ط³ ط§ظ„ط­ط§ظ„ظٹ: ${trimmed}\nط£ط±ط³ظ„ ط§ظ„ط§ط³ظ… ط§ظ„ط¬ط¯ظٹط¯ ظ„ظ„ط¯ط±ط³ (ط£ظˆ "-" ظ„ظ„ط¥ط¨ظ‚ط§ط،):`
            }, { quoted: message });
            return true;
        }
        if (session.step === 'new_name') {
            session.newName = (trimmed === '-') ? session.oldName : trimmed;
            session.step = 'new_url';
            setAdminSession(key, session);
            await sock.sendMessage(chatId, {
                text: `ط£ط±ط³ظ„ ط±ط§ط¨ط· ط§ظ„ظپظٹط¯ظٹظˆ ط§ظ„ط¬ط¯ظٹط¯ (ط£ظˆ "-" ظ„ظ„ط¥ط¨ظ‚ط§ط، ط¹ظ„ظ‰ ط§ظ„ط±ط§ط¨ط· ط§ظ„ط­ط§ظ„ظٹ):`
            }, { quoted: message });
            return true;
        }
        if (session.step === 'new_url') {
            const newUrl = (trimmed === '-') ? null : trimmed;
            const ok = updateLesson(session.level, session.oldName, session.newName, newUrl);
            clearAdminSession(key);
            await sock.sendMessage(chatId, {
                text: ok
                    ? `âœ… *طھظ… طھط¹ط¯ظٹظ„ ط§ظ„ط¯ط±ط³ ط¨ظ†ط¬ط§ط­!*\n\n${session.newName}`
                    : `â‌Œ ظپط´ظ„ طھط¹ط¯ظٹظ„ ط§ظ„ط¯ط±ط³.`
            }, { quoted: message });
            return true;
        }
    }

    // â”€â”€ addresult_formatted â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (session.type === 'addresult_formatted') {
        if (session.step === 'level') {
            const n = parseInt(normalizeArabicNumerals(trimmed));
            if (n !== 1 && n !== 2) {
                await sock.sendMessage(chatId, { text: `âڑ ï¸ڈ ط£ط±ط³ظ„ 1 ظ„ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط£ظˆظ„ ط£ظˆ 2 ظ„ظ„ط«ط§ظ†ظٹ` }, { quoted: message });
                return true;
            }
            session.level = n;
            session.step = 'code';
            setAdminSession(key, session);
            await sock.sendMessage(chatId, { text: `ط§ظ„ط®ط·ظˆط© 2/3 â€” ط£ط±ط³ظ„ ط§ظ„ط±ظ‚ظ… ط§ظ„ظƒظˆط¯ظٹ ظ„ظ„ط·ط§ظ„ط¨:` }, { quoted: message });
            return true;
        }
        if (session.step === 'code') {
            session.code = trimmed;
            session.step = 'url';
            setAdminSession(key, session);
            await sock.sendMessage(chatId, { text: `ط§ظ„ط®ط·ظˆط© 3/3 â€” ط£ط±ط³ظ„ ط±ط§ط¨ط· ط§ظ„ط´ظ‡ط§ط¯ط©:` }, { quoted: message });
            return true;
        }
        if (session.step === 'url') {
            if (!/^https?:\/\//.test(trimmed)) {
                await sock.sendMessage(chatId, { text: `â‌Œ ط§ظ„ط±ط§ط¨ط· ط؛ظٹط± طµط­ظٹط­. ط£ط±ط³ظ„ ط±ط§ط¨ط·ط§ظ‹ ظٹط¨ط¯ط£ ط¨ظ€ https://` }, { quoted: message });
                return true;
            }
            clearAdminSession(key);
            const ok = addResult(session.level, session.code, trimmed);
            const lName = session.level === 1 ? 'ط§ظ„ط£ظˆظ„' : 'ط§ظ„ط«ط§ظ†ظٹ';
            await sock.sendMessage(chatId, {
                text: ok
                    ? `âœ… *طھظ…طھ ط§ظ„ط¥ط¶ط§ظپط© ظ„ظ„ظ†طھط§ط¦ط¬!*\n\nط§ظ„ظ…ط³طھظˆظ‰: ${lName}\nط§ظ„ط±ظ‚ظ… ط§ظ„ظƒظˆط¯ظٹ: ${session.code}\nًں“ٹ ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ…ط³طھظˆظ‰: ${resultsSize(session.level)} ط·ط§ظ„ط¨`
                    : `â‌Œ ظپط´ظ„ ط­ظپط¸ ط§ظ„ظ†طھظٹط¬ط©. ط­ط§ظˆظ„ ظ…ط¬ط¯ط¯ط§ظ‹.`
            }, { quoted: message });
            return true;
        }
    }

    // â”€â”€ deleteresult_multiple (ط­ط°ظپ ظ…طھط¹ط¯ط¯ ظ„ظ„ظ†طھط§ط¦ط¬) â”€â”€
    if (session.type === 'deleteresult_multiple') {
        if (session.step === 'level') {
            const n = parseInt(normalizeArabicNumerals(trimmed));
            if (n !== 1 && n !== 2) {
                await sock.sendMessage(chatId, { text: `âڑ ï¸ڈ ط£ط±ط³ظ„ 1 ظ„ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط£ظˆظ„ ط£ظˆ 2 ظ„ظ„ط«ط§ظ†ظٹ` }, { quoted: message });
                return true;
            }
            session.level = n;
            session.step = 'codes';
            setAdminSession(key, session);
            await sock.sendMessage(chatId, {
                text: `ًں—‘ï¸ڈ *ط­ط°ظپ ظ…طھط¹ط¯ط¯ ظ…ظ† ط§ظ„ظ†طھط§ط¦ط¬*\n\nط£ط±ط³ظ„ ط§ظ„ط£ظƒظˆط§ط¯ ط§ظ„ظ…ط±ط§ط¯ ط­ط°ظپظ‡ط§ ظ…ظپطµظˆظ„ط© ط¨ظپظˆط§طµظ„:`
            }, { quoted: message });
            return true;
        }
        if (session.step === 'codes') {
            const codes = trimmed.split(/[طŒ,]+/).map(c => c.trim()).filter(Boolean);
            const result = deleteMultipleResults(session.level, codes);
            clearAdminSession(key);
            const lName = session.level === 1 ? 'ط§ظ„ط£ظˆظ„' : 'ط§ظ„ط«ط§ظ†ظٹ';
            await sock.sendMessage(chatId, {
                text:
                    `ًں—‘ï¸ڈ *ط­ط°ظپ ظ…طھط¹ط¯ط¯ ظ…ظ† ط§ظ„ظ†طھط§ط¦ط¬*\n\n` +
                    `âœ… طھظ… ط§ظ„ط­ط°ظپ: *${result.deleted}*\n` +
                    `â‌Œ ظ„ظ… ظٹطھظ… ط§ظ„ط¹ط«ظˆط±: *${result.notFound}*\n` +
                    `${result.notFoundCodes.length > 0 ? `\nط؛ظٹط± ظ…ظˆط¬ظˆط¯: ${result.notFoundCodes.join(', ')}` : ''}\n\n` +
                    `ًںڈ† ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ…ط³طھظˆظ‰ ${lName}: ${resultsSize(session.level)} ط·ط§ظ„ط¨`
            }, { quoted: message });
            return true;
        }
    }

    // â”€â”€ updateresult (طھط¹ط¯ظٹظ„ ظ†طھظٹط¬ط©) â”€â”€
    if (session.type === 'updateresult') {
        if (session.step === 'level') {
            const n = parseInt(normalizeArabicNumerals(trimmed));
            if (n !== 1 && n !== 2) {
                await sock.sendMessage(chatId, { text: `âڑ ï¸ڈ ط£ط±ط³ظ„ 1 ظ„ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط£ظˆظ„ ط£ظˆ 2 ظ„ظ„ط«ط§ظ†ظٹ` }, { quoted: message });
                return true;
            }
            session.level = n;
            session.step = 'find';
            setAdminSession(key, session);
            await sock.sendMessage(chatId, {
                text: `âœڈï¸ڈ *طھط¹ط¯ظٹظ„ ظ†طھظٹط¬ط©*\n\nط£ط±ط³ظ„ ط§ظ„ط±ظ‚ظ… ط§ظ„ظƒظˆط¯ظٹ ظ„ظ„ط·ط§ظ„ط¨ ط§ظ„ط°ظٹ طھط±ظٹط¯ طھط¹ط¯ظٹظ„ظ‡:`
            }, { quoted: message });
            return true;
        }
        if (session.step === 'find') {
            const entry = getResultEntry(session.level, trimmed);
            if (!entry) {
                clearAdminSession(key);
                await sock.sendMessage(chatId, { text: `â‌Œ ظ„ظ… ظٹطھظ… ط§ظ„ط¹ط«ظˆط± ط¹ظ„ظ‰ ط§ظ„ط±ظ‚ظ… ط§ظ„ظƒظˆط¯ظٹ "${trimmed}"` }, { quoted: message });
                return true;
            }
            session.oldCode = trimmed;
            session.step = 'new_code';
            setAdminSession(key, session);
            await sock.sendMessage(chatId, {
                text: `ط§ظ„ط±ظ‚ظ… ط§ظ„ط­ط§ظ„ظٹ: ${trimmed}\nط£ط±ط³ظ„ ط§ظ„ط±ظ‚ظ… ط§ظ„ظƒظˆط¯ظٹ ط§ظ„ط¬ط¯ظٹط¯ (ط£ظˆ "-" ظ„ظ„ط¥ط¨ظ‚ط§ط،):`
            }, { quoted: message });
            return true;
        }
        if (session.step === 'new_code') {
            session.newCode = (trimmed === '-') ? session.oldCode : trimmed;
            session.step = 'new_url';
            setAdminSession(key, session);
            await sock.sendMessage(chatId, {
                text: `ط£ط±ط³ظ„ ط±ط§ط¨ط· ط§ظ„ط´ظ‡ط§ط¯ط© ط§ظ„ط¬ط¯ظٹط¯:`
            }, { quoted: message });
            return true;
        }
        if (session.step === 'new_url') {
            if (!/^https?:\/\//.test(trimmed)) {
                await sock.sendMessage(chatId, { text: `â‌Œ ط§ظ„ط±ط§ط¨ط· ط؛ظٹط± طµط­ظٹط­. ط£ط±ط³ظ„ ط±ط§ط¨ط·ط§ظ‹ ظٹط¨ط¯ط£ ط¨ظ€ https://` }, { quoted: message });
                return true;
            }
            const ok = updateResult(session.level, session.oldCode, session.newCode, trimmed);
            clearAdminSession(key);
            await sock.sendMessage(chatId, {
                text: ok
                    ? `âœ… *طھظ… طھط¹ط¯ظٹظ„ ط§ظ„ظ†طھظٹط¬ط© ط¨ظ†ط¬ط§ط­!*\n\n${session.newCode}`
                    : `â‌Œ ظپط´ظ„ طھط¹ط¯ظٹظ„ ط§ظ„ظ†طھظٹط¬ط©.`
            }, { quoted: message });
            return true;
        }
    }

    return false;
}

// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
// ظ…ط¹ط§ظ„ط¬ ط§ظ„ط±ط³ط§ط¦ظ„ ط§ظ„ط±ط¦ظٹط³ظٹ
// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
async function handleMessages(sock, messageUpdate) {
    try {
        const { messages, type } = messageUpdate;
        if (type !== 'notify') return;

        const message = messages[0];
        if (!message?.message) return;

        const chatId = message.key.remoteJid;
        const senderId = message.key.participant || message.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');

        if (isBanned(senderId)) return;

        if (!message.key.fromMe && !isGroup) {
            registerSubscriber(senderId, message.pushName || '');
        }

        const rawText = (
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            message.message?.imageMessage?.caption ||
            message.message?.videoMessage?.caption ||
            message.message?.documentMessage?.caption ||
            message.message?.buttonsResponseMessage?.selectedButtonId ||
            message.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
            ''
        );

        const trimmed = normalizeArabicNumerals(rawText.trim());

        // â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
        // ADMIN: /admin <secret>
        // â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
        if (trimmed && isValidAdminCommand(trimmed)) {
            if (!isAdmin(senderId)) grantAdmin(senderId);
            await sock.sendMessage(chatId, { react: { text: 'ًں‘‘', key: message.key } });
            await sock.sendMessage(chatId, {
                text:
                    `ًں‘‘ *ظ„ظˆط­ط© ط§ظ„ط¥ط¯ط§ط±ط© ط§ظ„ظ…طھط·ظˆط±ط© v8*\n\n` +
                    `ًں“‚ *ط±ظپط¹ ط§ظ„ظ…ظ„ظپط§طھ:*\n` +
                    `/uploadlearn â€” ط±ظپط¹ learn.xlsx\n` +
                    `/uploadcoptic â€” ط±ظپط¹ coptic.xlsx\n` +
                    `/uploadnatiga â€” ط±ظپط¹ natiga.xlsx\n` +
                    `/uploadsubs â€” ط±ظپط¹ subscribers.xlsx\n\n` +
                    `â‍• *ط¥ط¶ط§ظپط© ظپط±ط¯ظٹط©:*\n` +
                    `/addword â€” ط¥ط¶ط§ظپط© ظƒظ„ظ…ط© ظ„ظ„ظ‚ط§ظ…ظˆط³ (ط¨ط§ظ„طµظٹط؛ط© ط§ظ„ظ…ط·ظ„ظˆط¨ط©)\n` +
                    `/addresult â€” ط¥ط¶ط§ظپط© ظ†طھظٹط¬ط©\n` +
                    `/addlesson â€” ط¥ط¶ط§ظپط© ط¯ط±ط³\n\n` +
                    `ًں—‘ï¸ڈ *ط­ط°ظپ ظپط±ط¯ظٹ:*\n` +
                    `/deleteword â€” ط­ط°ظپ ظƒظ„ظ…ط© ظ…ظ† ط§ظ„ظ‚ط§ظ…ظˆط³ (ط¨ط§ظ„ظ‚ط¨ط·ظٹط©)\n` +
                    `/deleteresult â€” ط­ط°ظپ ظ†طھظٹط¬ط©\n` +
                    `/deletelesson â€” ط­ط°ظپ ط¯ط±ط³\n\n` +
                    `ًں”¨ *ط­ط°ظپ ظ…طھط¹ط¯ط¯:*\n` +
                    `/deletewordmulti â€” ط­ط°ظپ ظƒظ„ظ…ط§طھ ظ…طھط¹ط¯ط¯ط© (ط¨ط§ظ„ظ‚ط¨ط·ظٹط©)\n` +
                    `/deleteresultmulti â€” ط­ط°ظپ ظ†طھط§ط¦ط¬ ظ…طھط¹ط¯ط¯ط©\n` +
                    `/deletelessonmulti â€” ط­ط°ظپ ط¯ط±ظˆط³ ظ…طھط¹ط¯ط¯ط©\n\n` +
                    `âœڈï¸ڈ *طھط¹ط¯ظٹظ„:*\n` +
                    `/updateword â€” طھط¹ط¯ظٹظ„ ظƒظ„ظ…ط© ظپظٹ ط§ظ„ظ‚ط§ظ…ظˆط³\n` +
                    `/updateresult â€” طھط¹ط¯ظٹظ„ ظ†طھظٹط¬ط©\n` +
                    `/updatelesson â€” طھط¹ط¯ظٹظ„ ط¯ط±ط³\n\n` +
                    `ًں“¦ *ط¥ط¶ط§ظپط© ط¬ظ…ط§ط¹ظٹط©:*\n` +
                    `/batchword â€” ط¥ط¶ط§ظپط© ظƒظ„ظ…ط§طھ ط¬ظ…ط§ط¹ظٹط©\n` +
                    `/batchresult â€” ط¥ط¶ط§ظپط© ظ†طھط§ط¦ط¬ ط¬ظ…ط§ط¹ظٹط©\n` +
                    `/batchlesson â€” ط¥ط¶ط§ظپط© ط¯ط±ظˆط³ ط¬ظ…ط§ط¹ظٹط©\n\n` +
                    `ًں“¥ *طھظ†ط²ظٹظ„:*\n` +
                    `/download â€” ظ‚ط§ط¦ظ…ط© ط§ظ„طھظ†ط²ظٹظ„ط§طھ\n` +
                    `/downloadlearn â€” طھظ†ط²ظٹظ„ ظ…ظ„ظپ ط§ظ„طھط¹ظ„ظ…\n` +
                    `/downloadcoptic â€” طھظ†ط²ظٹظ„ ظ…ظ„ظپ ط§ظ„ظ‚ط§ظ…ظˆط³\n` +
                    `/downloadresults â€” طھظ†ط²ظٹظ„ ظ…ظ„ظپ ط§ظ„ظ†طھط§ط¦ط¬\n` +
                    `/downloadsubs â€” طھظ†ط²ظٹظ„ ظ…ظ„ظپ ط§ظ„ظ…ط´طھط±ظƒظٹظ†\n` +
                    `/downloadall â€” طھظ†ط²ظٹظ„ ط¬ظ…ظٹط¹ ط§ظ„ظ…ظ„ظپط§طھ\n\n` +
                    `ًں“ٹ *ط¥ط­طµط§ط¦ظٹط§طھ:*\n` +
                    `/stats â€” ط¥ط­طµط§ط¦ظٹط§طھ ط§ظ„ظ†ط¸ط§ظ…\n` +
                    `/mystats â€” ط¥ط­طµط§ط¦ظٹط§طھ ط§ط³طھط®ط¯ط§ظ…ظƒ\n\n` +
                    `ًں“¢ *ط¨ط«:*\n` +
                    `/broadcast â€” ط±ط³ط§ظ„ط© ط¬ظ…ط§ط¹ظٹط©\n\n` +
                    `ًں”„ *ط¥ط¹ط§ط¯ط© طھط­ظ…ظٹظ„:*\n` +
                    `/reload â€” ط¥ط¹ط§ط¯ط© طھط­ظ…ظٹظ„ ظ‚ظˆط§ط¹ط¯ ط§ظ„ط¨ظٹط§ظ†ط§طھ\n\n` +
                    `ًںڑھ /logout â€” طھط³ط¬ظٹظ„ ط§ظ„ط®ط±ظˆط¬ ظ…ظ† ط§ظ„ط¥ط¯ط§ط±ط©`
            }, { quoted: message });
            return;
        }

        // â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
        // ADMIN: ط±ظپط¹ ظ…ظ„ظپط§طھ ظ…ط¨ط§ط´ط±ط©
        // â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
        if (isAdmin(senderId)) {
            if (await handleDirectLearnUpload(sock, chatId, message, senderId)) return;
            if (await handleDirectCoptocUpload(sock, chatId, message, senderId)) return;
            if (await handleDirectResultsUpload(sock, chatId, message, senderId)) return;
            if (await handleDirectSubscribersUpload(sock, chatId, message, senderId)) return;
        }

        // â”€â”€ ط§ظ†طھط¸ط§ط± ظ…ظ„ظپط§طھ ط±ظپط¹ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        if (isAdmin(senderId) && isWaitingForLearnUpload(chatId, senderId)) {
            if (await handleLearnUploadReply(sock, chatId, message, senderId)) return;
        }
        if (isAdmin(senderId) && isWaitingForCoptocUpload(chatId, senderId)) {
            if (await handleCoptocUploadReply(sock, chatId, message, senderId)) return;
        }
        if (isAdmin(senderId) && isWaitingForResultsUpload(chatId, senderId)) {
            if (await handleResultsUploadReply(sock, chatId, message, senderId)) return;
        }
        if (isAdmin(senderId) && isWaitingForSubscribersUpload(chatId, senderId)) {
            if (await handleSubscribersUploadReply(sock, chatId, message, senderId)) return;
        }

        if (!trimmed) return;

        const lower = trimmed.toLowerCase();

        // â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
        // "/" ظˆط­ط¯ظ‡ط§ â†’ ظ‚ط§ط¦ظ…ط© ط£ط¯ظ…ظ†
        // â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
        if (trimmed === '/') {
            if (isAdmin(senderId)) {
                await sock.sendMessage(chatId, {
                    text:
                        `ًں‘‘ *ظ„ظˆط­ط© ط§ظ„ط¥ط¯ط§ط±ط©*\n\n` +
                        `/uploadlearn /uploadcoptic /uploadnatiga /uploadsubs\n` +
                        `/addword /addresult /addlesson\n` +
                        `/deleteword /deleteresult /deletelesson\n` +
                        `/deletewordmulti /deleteresultmulti /deletelessonmulti\n` +
                        `/updateword /updateresult /updatelesson\n` +
                        `/batchword /batchresult /batchlesson\n` +
                        `/download /downloadlearn /downloadcoptic /downloadresults /downloadsubs /downloadall\n` +
                        `/stats /mystats /broadcast /reload /logout`
                }, { quoted: message });
            } else {
                await showMainMenu(sock, chatId, message);
            }
            return;
        }

        // â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
        // ط¬ظ„ط³ط§طھ ط§ظ„ط¨ط«
        // â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
        if (isAdmin(senderId) && isInBroadcastSession(chatId, senderId)) {
            if (await handleBroadcastSession(sock, chatId, message, senderId, trimmed)) return;
        }

        // â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
        // ط¬ظ„ط³ط§طھ ط§ظ„ط¥ط¶ط§ظپط© ط§ظ„ظٹط¯ظˆظٹط© ظ„ظ„ط£ط¯ظ…ظ†
        // â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
        if (isAdmin(senderId) && !lower.startsWith('/')) {
            if (await handleAdminSession(sock, chatId, message, senderId, trimmed)) return;
        }

        // â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
        // 00 â†’ ط§ظ„ظ‚ط§ط¦ظ…ط© ط§ظ„ط±ط¦ظٹط³ظٹط©
        // â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
        if (!lower.startsWith('/') && isMainMenuCommand(trimmed)) {
            await showMainMenu(sock, chatId, message);
            return;
        }

        // â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
        // ط±ط¬ظˆط¹ (0)
        // â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
        if (!lower.startsWith('/') && isBackCommand(trimmed)) {
            await handleBack(sock, chatId, message);
            return;
        }

        // â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
        // ط¬ظ„ط³ط§طھ ط§ظ„ظ…ط³طھط®ط¯ظ…
        // â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
        if (!lower.startsWith('/')) {
            const activeMode = getActiveMode(chatId);

            if (activeMode === 'learn') {
                const r = await handleLearnSession(sock, chatId, message, trimmed);
                if (r.handled) return;
                await showMainMenu(sock, chatId, message);
                return;
            }

            if (activeMode === 'dict') {
                await handleCoptocReply(sock, chatId, message, trimmed);
                return;
            }

            if (activeMode === 'results') {
                const r = await handleResultsSession(sock, chatId, message, trimmed);
                if (r.handled) return;
                await showMainMenu(sock, chatId, message);
                return;
            }

            const choice = parseMenuChoice(trimmed);
            if (choice === 1) { await enterLearnMode(sock, chatId, message, senderId); return; }
            if (choice === 2) { await enterDictMode(sock, chatId, message, senderId); return; }
            if (choice === 3) { await enterResultsMode(sock, chatId, message, senderId); return; }

            await showMainMenu(sock, chatId, message);
            return;
        }

        // â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
        // ط§ظ„ط£ظˆط§ظ…ط± (/)
        // â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
        console.log(`ًں“‌ [${isGroup ? 'G' : 'P'}][ADM:${isAdmin(senderId)}] ${lower}`);

        switch (true) {

            case lower === '/start':
            case lower === '/menu':
            case lower === '/help':
                await showMainMenu(sock, chatId, message);
                break;

            case lower === '/owner':
                await ownerCommand(sock, chatId, message);
                break;

            case lower === '/learn' || lower === '/طھط¹ظ„ظ…':
                await enterLearnMode(sock, chatId, message, senderId);
                break;

            case lower === '/coptoc' || lower === '/ظ‚ط§ظ…ظˆط³' || lower === '/ظ…ط¹ط¬ظ…' || lower === '/coptic':
                await enterDictMode(sock, chatId, message, senderId);
                break;

            case lower === '/results' || lower === '/ظ†طھظٹط¬ط©' || lower === '/ط´ظ‡ط§ط¯ط©' || lower === '/natiga':
                await enterResultsMode(sock, chatId, message, senderId);
                break;

            case lower === '/mystats': {
                const stats = getUserStats(senderId);
                if (!stats) {
                    await sock.sendMessage(chatId, { text: `ًں“ٹ ظ„ط§ طھظˆط¬ط¯ ط¥ط­طµط§ط¦ظٹط§طھ ظ…طھط§ط­ط© ظ„ظƒ ط¨ط¹ط¯. ط§ط³طھط®ط¯ظ… ط§ظ„ط¨ظˆطھ ط£ظƒط«ط± ظ„طھط³ط¬ظٹظ„ ط¥ط­طµط§ط¦ظٹط§طھظƒ.` }, { quoted: message });
                } else {
                    await sock.sendMessage(chatId, {
                        text:
                            `ًں“ٹ *ط¥ط­طµط§ط¦ظٹط§طھ ط§ط³طھط®ط¯ط§ظ…ظƒ*\n\n` +
                            `ًں‘¤ ط§ظ„ط§ط³ظ…: ${stats.name || 'ط؛ظٹط± ظ…ط¹ط±ظˆظپ'}\n` +
                            `ًں“± ط§ظ„ط±ظ‚ظ…: ${stats.phone}\n` +
                            `ًں“ڑ ط¹ط¯ط¯ ظ…ط±ط§طھ ط§ط³طھط®ط¯ط§ظ… ط§ظ„طھط¹ظ„ظ…: *${stats.learnCount || 0}*\n` +
                            `ًں“– ط¹ط¯ط¯ ظ…ط±ط§طھ ط§ط³طھط®ط¯ط§ظ… ط§ظ„ظ‚ط§ظ…ظˆط³: *${stats.dictCount || 0}*\n` +
                            `ًںڈ† ط¹ط¯ط¯ ظ…ط±ط§طھ ط§ط³طھط®ط¯ط§ظ… ط§ظ„ظ†طھظٹط¬ط©: *${stats.resultsCount || 0}*\n` +
                            `ًں•گ ط£ظˆظ„ طھظپط§ط¹ظ„: ${new Date(stats.firstSeen).toLocaleString('ar-EG')}\n` +
                            `ًں•گ ط¢ط®ط± طھظپط§ط¹ظ„: ${new Date(stats.lastSeen).toLocaleString('ar-EG')}`
                    }, { quoted: message });
                }
                break;
            }

            case lower === '/logout': {
                if (!isAdmin(senderId)) {
                    await sock.sendMessage(chatId, { text: `â‌Œ ط£ظ†طھ ظ„ط³طھ ط£ط¯ظ…ظ†ط§ظ‹.` }, { quoted: message });
                    break;
                }
                clearAdminSession(chatId + senderId);
                revokeAdmin(senderId);
                await sock.sendMessage(chatId, { text: `âœ… طھظ… طھط³ط¬ظٹظ„ ط§ظ„ط®ط±ظˆط¬ ظ…ظ† ط§ظ„ط¥ط¯ط§ط±ط©.` }, { quoted: message });
                break;
            }

            // â”€â”€ ط±ظپط¹ ط§ظ„ظ…ظ„ظپط§طھ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            case lower === '/uploadlearn': {
                if (!isAdmin(senderId)) { await sock.sendMessage(chatId, { text: `â‌Œ ظ„ظ„ط£ط¯ظ…ظ† ظپظ‚ط·.` }, { quoted: message }); break; }
                await uploadLearnCommand(sock, chatId, message, senderId);
                break;
            }

            case lower === '/uploadcoptic' || lower === '/uploadcoptoc': {
                if (!isAdmin(senderId)) { await sock.sendMessage(chatId, { text: `â‌Œ ظ„ظ„ط£ط¯ظ…ظ† ظپظ‚ط·.` }, { quoted: message }); break; }
                await uploadCoptocCommand(sock, chatId, message, senderId);
                break;
            }

            case lower === '/uploadnatiga' || lower === '/uploadresults': {
                if (!isAdmin(senderId)) { await sock.sendMessage(chatId, { text: `â‌Œ ظ„ظ„ط£ط¯ظ…ظ† ظپظ‚ط·.` }, { quoted: message }); break; }
                await uploadResultsCommand(sock, chatId, message, senderId);
                break;
            }

            case lower === '/uploadsubs' || lower === '/uploadsubscribers': {
                if (!isAdmin(senderId)) { await sock.sendMessage(chatId, { text: `â‌Œ ظ„ظ„ط£ط¯ظ…ظ† ظپظ‚ط·.` }, { quoted: message }); break; }
                await uploadSubscribersCommand(sock, chatId, message, senderId);
                break;
            }

            // â”€â”€ ط¥ط¶ط§ظپط© ظپط±ط¯ظٹط© ط¬ط¯ظٹط¯ط© ط¨ط§ظ„ط´ظƒظ„ ط§ظ„ظ…ط·ظ„ظˆط¨ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            case lower === '/addword': {
                if (!isAdmin(senderId)) { await sock.sendMessage(chatId, { text: `â‌Œ ظ„ظ„ط£ط¯ظ…ظ† ظپظ‚ط·.` }, { quoted: message }); break; }
                setAdminSession(chatId + senderId, { type: 'addword_formatted', step: 'cell' });
                await sock.sendMessage(chatId, {
                    text:
                        `â‍• *ط¥ط¶ط§ظپط© ظƒظ„ظ…ط© ظ„ظ„ظ‚ط§ظ…ظˆط³*\n\n` +
                        `ط£ط±ط³ظ„ ط§ظ„ط¹ط¨ط§ط±ط© ظƒط§ظ…ظ„ط© ط¨ط§ظ„طµظٹط؛ط© ط§ظ„طھط§ظ„ظٹط©:\n\n` +
                        `(ط§ظ„ظƒظ„ظ…ط§طھ ط§ظ„ط¹ط±ط¨ظٹط©). (ط§ظ„ظƒظ„ظ…ط© ط§ظ„ظ‚ط¨ط·ظٹط©). (ط§ظ„ط£طµظ„). (ط§ظ„ظ†ظˆط¹).mp3\n\n` +
                        `ظ…ط«ط§ظ„:\n` +
                        `ظ†ظˆط±طŒ ط¹ظ…ظ„طŒ ط¬ظ…ظٹظ„طŒ ظ„ط¨ظ†. د§â²“â²¥â²“. ظ‚ط¨ط·ظٹط©. ظپط¹ظ„.mp3\n\n` +
                        `ط¨ط¹ط¯ظ‡ط§ ط³ط£ط·ظ„ط¨ ظ…ظ†ظƒ ط±ط§ط¨ط· ط§ظ„طµظˆطھ.`
                }, { quoted: message });
                break;
            }

            case lower === '/addresult': {
                if (!isAdmin(senderId)) { await sock.sendMessage(chatId, { text: `â‌Œ ظ„ظ„ط£ط¯ظ…ظ† ظپظ‚ط·.` }, { quoted: message }); break; }
                setAdminSession(chatId + senderId, { type: 'addresult_formatted', step: 'level' });
                await sock.sendMessage(chatId, {
                    text: `â‍• *ط¥ط¶ط§ظپط© ظ†طھظٹط¬ط©*\n\nط§ظ„ط®ط·ظˆط© 1/3 â€” ط£ط±ط³ظ„ ط±ظ‚ظ… ط§ظ„ظ…ط³طھظˆظ‰:\n1 ظ„ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط£ظˆظ„\n2 ظ„ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط«ط§ظ†ظٹ`
                }, { quoted: message });
                break;
            }

            case lower === '/addlesson': {
                if (!isAdmin(senderId)) { await sock.sendMessage(chatId, { text: `â‌Œ ظ„ظ„ط£ط¯ظ…ظ† ظپظ‚ط·.` }, { quoted: message }); break; }
                setAdminSession(chatId + senderId, { type: 'addlesson_formatted', step: 'level' });
                await sock.sendMessage(chatId, {
                    text: `â‍• *ط¥ط¶ط§ظپط© ط¯ط±ط³*\n\nط§ظ„ط®ط·ظˆط© 1/3 â€” ط£ط±ط³ظ„ ط±ظ‚ظ… ط§ظ„ظ…ط³طھظˆظ‰:\n1 ظ„ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط£ظˆظ„\n2 ظ„ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط«ط§ظ†ظٹ`
                }, { quoted: message });
                break;
            }

            // â”€â”€ ط­ط°ظپ ظپط±ط¯ظٹ (ط¨ط§ظ„ظ‚ط¨ط·ظٹط©) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            case lower === '/deleteword': {
                if (!isAdmin(senderId)) { await sock.sendMessage(chatId, { text: `â‌Œ ظ„ظ„ط£ط¯ظ…ظ† ظپظ‚ط·.` }, { quoted: message }); break; }
                setAdminSession(chatId + senderId, { type: 'deleteword_coptic', step: 'word' });
                await sock.sendMessage(chatId, {
                    text: `ًں—‘ï¸ڈ *ط­ط°ظپ ظƒظ„ظ…ط© ظ…ظ† ط§ظ„ظ‚ط§ظ…ظˆط³*\n\nط£ط±ط³ظ„ ط§ظ„ظƒظ„ظ…ط© ط§ظ„ظ‚ط¨ط·ظٹط© ط§ظ„طھظٹ طھط±ظٹط¯ ط­ط°ظپظ‡ط§:`
                }, { quoted: message });
                break;
            }

            case lower === '/deleteresult': {
                if (!isAdmin(senderId)) { await sock.sendMessage(chatId, { text: `â‌Œ ظ„ظ„ط£ط¯ظ…ظ† ظپظ‚ط·.` }, { quoted: message }); break; }
                setAdminSession(chatId + senderId, { type: 'deleteresult', step: 'level' });
                await sock.sendMessage(chatId, {
                    text: `ًں—‘ï¸ڈ *ط­ط°ظپ ظ†طھظٹط¬ط©*\n\nط§ظ„ط®ط·ظˆط© 1/2 â€” ط£ط±ط³ظ„ ط±ظ‚ظ… ط§ظ„ظ…ط³طھظˆظ‰:\n1 ظ„ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط£ظˆظ„\n2 ظ„ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط«ط§ظ†ظٹ`
                }, { quoted: message });
                break;
            }

            case lower === '/deletelesson': {
                if (!isAdmin(senderId)) { await sock.sendMessage(chatId, { text: `â‌Œ ظ„ظ„ط£ط¯ظ…ظ† ظپظ‚ط·.` }, { quoted: message }); break; }
                setAdminSession(chatId + senderId, { type: 'deletelesson', step: 'level' });
                await sock.sendMessage(chatId, {
                    text: `ًں—‘ï¸ڈ *ط­ط°ظپ ط¯ط±ط³*\n\nط§ظ„ط®ط·ظˆط© 1/2 â€” ط£ط±ط³ظ„ ط±ظ‚ظ… ط§ظ„ظ…ط³طھظˆظ‰:\n1 ظ„ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط£ظˆظ„\n2 ظ„ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط«ط§ظ†ظٹ`
                }, { quoted: message });
                break;
            }

            // â”€â”€ ط­ط°ظپ ظ…طھط¹ط¯ط¯ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            case lower === '/deletewordmulti': {
                if (!isAdmin(senderId)) { await sock.sendMessage(chatId, { text: `â‌Œ ظ„ظ„ط£ط¯ظ…ظ† ظپظ‚ط·.` }, { quoted: message }); break; }
                setAdminSession(chatId + senderId, { type: 'deleteword_multiple', step: 'words' });
                await sock.sendMessage(chatId, {
                    text:
                        `ًں—‘ï¸ڈ *ط­ط°ظپ ظ…طھط¹ط¯ط¯ ظ…ظ† ط§ظ„ظ‚ط§ظ…ظˆط³*\n\n` +
                        `ط£ط±ط³ظ„ ط§ظ„ظƒظ„ظ…ط§طھ ط§ظ„ظ‚ط¨ط·ظٹط© ط§ظ„ظ…ط±ط§ط¯ ط­ط°ظپظ‡ط§ ظ…ظپطµظˆظ„ط© ط¨ظپظˆط§طµظ„:\n\n` +
                        `ظ…ط«ط§ظ„: د§â²“â²¥â²“, â²›â²ںâ²©â²§â²‰, â²£â²±â²™â²“`
                }, { quoted: message });
                break;
            }

            case lower === '/deleteresultmulti': {
                if (!isAdmin(senderId)) { await sock.sendMessage(chatId, { text: `â‌Œ ظ„ظ„ط£ط¯ظ…ظ† ظپظ‚ط·.` }, { quoted: message }); break; }
                setAdminSession(chatId + senderId, { type: 'deleteresult_multiple', step: 'level' });
                await sock.sendMessage(chatId, {
                    text: `ًں—‘ï¸ڈ *ط­ط°ظپ ظ…طھط¹ط¯ط¯ ظ…ظ† ط§ظ„ظ†طھط§ط¦ط¬*\n\nط§ظ„ط®ط·ظˆط© 1/2 â€” ط£ط±ط³ظ„ ط±ظ‚ظ… ط§ظ„ظ…ط³طھظˆظ‰:\n1 ظ„ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط£ظˆظ„\n2 ظ„ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط«ط§ظ†ظٹ`
                }, { quoted: message });
                break;
            }

            case lower === '/deletelessonmulti': {
                if (!isAdmin(senderId)) { await sock.sendMessage(chatId, { text: `â‌Œ ظ„ظ„ط£ط¯ظ…ظ† ظپظ‚ط·.` }, { quoted: message }); break; }
                setAdminSession(chatId + senderId, { type: 'deletelesson_multiple', step: 'level' });
                await sock.sendMessage(chatId, {
                    text: `ًں—‘ï¸ڈ *ط­ط°ظپ ظ…طھط¹ط¯ط¯ ظ…ظ† ط§ظ„ط¯ط±ظˆط³*\n\nط§ظ„ط®ط·ظˆط© 1/2 â€” ط£ط±ط³ظ„ ط±ظ‚ظ… ط§ظ„ظ…ط³طھظˆظ‰:\n1 ظ„ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط£ظˆظ„\n2 ظ„ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط«ط§ظ†ظٹ`
                }, { quoted: message });
                break;
            }

            // â”€â”€ طھط¹ط¯ظٹظ„ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            case lower === '/updateword': {
                if (!isAdmin(senderId)) { await sock.sendMessage(chatId, { text: `â‌Œ ظ„ظ„ط£ط¯ظ…ظ† ظپظ‚ط·.` }, { quoted: message }); break; }
                setAdminSession(chatId + senderId, { type: 'updateword', step: 'find' });
                await sock.sendMessage(chatId, {
                    text: `âœڈï¸ڈ *طھط¹ط¯ظٹظ„ ظƒظ„ظ…ط© ظپظٹ ط§ظ„ظ‚ط§ظ…ظˆط³*\n\nط£ط±ط³ظ„ ط§ظ„ظƒظ„ظ…ط© ط§ظ„ظ‚ط¨ط·ظٹط© ط§ظ„طھظٹ طھط±ظٹط¯ طھط¹ط¯ظٹظ„ظ‡ط§:`
                }, { quoted: message });
                break;
            }

            case lower === '/updateresult': {
                if (!isAdmin(senderId)) { await sock.sendMessage(chatId, { text: `â‌Œ ظ„ظ„ط£ط¯ظ…ظ† ظپظ‚ط·.` }, { quoted: message }); break; }
                setAdminSession(chatId + senderId, { type: 'updateresult', step: 'level' });
                await sock.sendMessage(chatId, {
                    text: `âœڈï¸ڈ *طھط¹ط¯ظٹظ„ ظ†طھظٹط¬ط©*\n\nط§ظ„ط®ط·ظˆط© 1/2 â€” ط£ط±ط³ظ„ ط±ظ‚ظ… ط§ظ„ظ…ط³طھظˆظ‰:\n1 ظ„ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط£ظˆظ„\n2 ظ„ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط«ط§ظ†ظٹ`
                }, { quoted: message });
                break;
            }

            case lower === '/updatelesson': {
                if (!isAdmin(senderId)) { await sock.sendMessage(chatId, { text: `â‌Œ ظ„ظ„ط£ط¯ظ…ظ† ظپظ‚ط·.` }, { quoted: message }); break; }
                setAdminSession(chatId + senderId, { type: 'updatelesson', step: 'level' });
                await sock.sendMessage(chatId, {
                    text: `âœڈï¸ڈ *طھط¹ط¯ظٹظ„ ط¯ط±ط³*\n\nط§ظ„ط®ط·ظˆط© 1/2 â€” ط£ط±ط³ظ„ ط±ظ‚ظ… ط§ظ„ظ…ط³طھظˆظ‰:\n1 ظ„ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط£ظˆظ„\n2 ظ„ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط«ط§ظ†ظٹ`
                }, { quoted: message });
                break;
            }

            // â”€â”€ ط¥ط¶ط§ظپط© ط¬ظ…ط§ط¹ظٹط© â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            case lower === '/batchword': {
                if (!isAdmin(senderId)) { await sock.sendMessage(chatId, { text: `â‌Œ ظ„ظ„ط£ط¯ظ…ظ† ظپظ‚ط·.` }, { quoted: message }); break; }
                await sock.sendMessage(chatId, {
                    text:
                        `ًں“¦ *ط¥ط¶ط§ظپط© ظƒظ„ظ…ط§طھ ط¬ظ…ط§ط¹ظٹط© ظ„ظ„ظ‚ط§ظ…ظˆط³*\n\n` +
                        `طµظٹط؛ط© ظƒظ„ ط³ط·ط±:\n` +
                        `(ط§ظ„ظƒظ„ظ…ط§طھ ط§ظ„ط¹ط±ط¨ظٹط©). (ط§ظ„ظƒظ„ظ…ط© ط§ظ„ظ‚ط¨ط·ظٹط©). (ط§ظ„ط£طµظ„). (ط§ظ„ظ†ظˆط¹).mp3 | ط±ط§ط¨ط·_ط§ظ„طµظˆطھ\n\n` +
                        `ظ…ط«ط§ظ„:\n` +
                        `ظ†ظˆط±طŒ ط¹ظ…ظ„طŒ ط¬ظ…ظٹظ„طŒ ظ„ط¨ظ†. د§â²“â²¥â²“. ظ‚ط¨ط·ظٹط©. ظپط¹ظ„.mp3 | https://drive.google.com/...\n\n` +
                        `ط£ط±ط³ظ„ ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ط¢ظ† ظپظٹ ط±ط³ط§ظ„ط© ظˆط§ط­ط¯ط©:`
                }, { quoted: message });
                setAdminSession(chatId + senderId, { type: 'batchword_wait', step: 'data' });
                break;
            }

            case lower === '/batchresult': {
                if (!isAdmin(senderId)) { await sock.sendMessage(chatId, { text: `â‌Œ ظ„ظ„ط£ط¯ظ…ظ† ظپظ‚ط·.` }, { quoted: message }); break; }
                await sock.sendMessage(chatId, {
                    text:
                        `ًں“¦ *ط¥ط¶ط§ظپط© ظ†طھط§ط¦ط¬ ط¬ظ…ط§ط¹ظٹط©*\n\n` +
                        `طµظٹط؛ط© ظƒظ„ ط³ط·ط±:\n` +
                        `ط§ظ„ظ…ط³طھظˆظ‰ | ط§ظ„ط±ظ‚ظ… ط§ظ„ظƒظˆط¯ظٹ | ط±ط§ط¨ط· ط§ظ„ط´ظ‡ط§ط¯ط©\n\n` +
                        `ظ…ط«ط§ظ„:\n` +
                        `1 | 1001 | https://drive.google.com/...\n` +
                        `2 | 2001 | https://drive.google.com/...\n\n` +
                        `ط£ط±ط³ظ„ ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ط¢ظ† ظپظٹ ط±ط³ط§ظ„ط© ظˆط§ط­ط¯ط©:`
                }, { quoted: message });
                setAdminSession(chatId + senderId, { type: 'batchresult_wait', step: 'data' });
                break;
            }

            case lower === '/batchlesson': {
                if (!isAdmin(senderId)) { await sock.sendMessage(chatId, { text: `â‌Œ ظ„ظ„ط£ط¯ظ…ظ† ظپظ‚ط·.` }, { quoted: message }); break; }
                await sock.sendMessage(chatId, {
                    text:
                        `ًں“¦ *ط¥ط¶ط§ظپط© ط¯ط±ظˆط³ ط¬ظ…ط§ط¹ظٹط©*\n\n` +
                        `طµظٹط؛ط© ظƒظ„ ط³ط·ط±:\n` +
                        `ط§ظ„ظ…ط³طھظˆظ‰ | ط§ط³ظ… ط§ظ„ط¯ط±ط³ | ط±ط§ط¨ط· ط§ظ„ظپظٹط¯ظٹظˆ\n\n` +
                        `ظ…ط«ط§ظ„:\n` +
                        `1 | ط§ظ„ط¯ط±ط³ ط§ظ„ط£ظˆظ„ | https://drive.google.com/...\n` +
                        `2 | ظ…ظ‚ط¯ظ…ط© ط§ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط«ط§ظ†ظٹ | https://drive.google.com/...\n\n` +
                        `ط£ط±ط³ظ„ ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ط¢ظ† ظپظٹ ط±ط³ط§ظ„ط© ظˆط§ط­ط¯ط©:`
                }, { quoted: message });
                setAdminSession(chatId + senderId, { type: 'batchlesson_wait', step: 'data' });
                break;
            }

            // â”€â”€ طھظ†ط²ظٹظ„ ط§ظ†طھظ‚ط§ط¦ظٹ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            case lower === '/download': {
                if (!isAdmin(senderId)) { await sock.sendMessage(chatId, { text: `â‌Œ ظ„ظ„ط£ط¯ظ…ظ† ظپظ‚ط·.` }, { quoted: message }); break; }
                await sendSelectiveDownloads(sock, chatId, message);
                break;
            }

            case lower === '/downloadlearn': {
                if (!isAdmin(senderId)) { await sock.sendMessage(chatId, { text: `â‌Œ ظ„ظ„ط£ط¯ظ…ظ† ظپظ‚ط·.` }, { quoted: message }); break; }
                await sendLearnDownload(sock, chatId, message);
                break;
            }

            case lower === '/downloadcoptic': {
                if (!isAdmin(senderId)) { await sock.sendMessage(chatId, { text: `â‌Œ ظ„ظ„ط£ط¯ظ…ظ† ظپظ‚ط·.` }, { quoted: message }); break; }
                await sendCopticDownload(sock, chatId, message);
                break;
            }

            case lower === '/downloadresults': {
                if (!isAdmin(senderId)) { await sock.sendMessage(chatId, { text: `â‌Œ ظ„ظ„ط£ط¯ظ…ظ† ظپظ‚ط·.` }, { quoted: message }); break; }
                await sendResultsDownload(sock, chatId, message);
                break;
            }

            case lower === '/downloadsubs': {
                if (!isAdmin(senderId)) { await sock.sendMessage(chatId, { text: `â‌Œ ظ„ظ„ط£ط¯ظ…ظ† ظپظ‚ط·.` }, { quoted: message }); break; }
                await sendSubscribersDownload(sock, chatId, message);
                break;
            }

            case lower === '/downloadall': {
                if (!isAdmin(senderId)) { await sock.sendMessage(chatId, { text: `â‌Œ ظ„ظ„ط£ط¯ظ…ظ† ظپظ‚ط·.` }, { quoted: message }); break; }
                await sendAllDownloads(sock, chatId, message);
                break;
            }

            // â”€â”€ ط¥ط­طµط§ط¦ظٹط§طھ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            case lower === '/stats' || lower === '/dbstats': {
                if (!isAdmin(senderId)) { await sock.sendMessage(chatId, { text: `â‌Œ ظ„ظ„ط£ط¯ظ…ظ† ظپظ‚ط·.` }, { quoted: message }); break; }
                await sendStats(sock, chatId, message);
                break;
            }

            // â”€â”€ ط§ظ„ط¨ط« ط§ظ„ط¬ظ…ط§ط¹ظٹ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            case lower.startsWith('/broadcast'): {
                if (!isAdmin(senderId)) { await sock.sendMessage(chatId, { text: `â‌Œ ظ„ظ„ط£ط¯ظ…ظ† ظپظ‚ط·.` }, { quoted: message }); break; }
                const argsText = trimmed.slice('/broadcast'.length).trim();
                await broadcastCommand(sock, chatId, message, senderId, argsText);
                break;
            }

            // â”€â”€ ط¥ط¹ط§ط¯ط© طھط­ظ…ظٹظ„ ظ‚ظˆط§ط¹ط¯ ط§ظ„ط¨ظٹط§ظ†ط§طھ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            case lower === '/reload': {
                if (!isAdmin(senderId)) { await sock.sendMessage(chatId, { text: `â‌Œ ظ„ظ„ط£ط¯ظ…ظ† ظپظ‚ط·.` }, { quoted: message }); break; }
                await sock.sendMessage(chatId, { react: { text: 'ًں”„', key: message.key } });
                reloadLearnDb();
                reloadCoptocDb();
                await reloadResultsDb(); // ظ†ظ†طھط¸ط± طھط­ط¯ظٹط« ط§ظ„ظ†طھط§ط¦ط¬ ظ…ظ† Google Sheets
                await sock.sendMessage(chatId, { text: `âœ… طھظ… ط¥ط¹ط§ط¯ط© طھط­ظ…ظٹظ„ ط¬ظ…ظٹط¹ ظ‚ظˆط§ط¹ط¯ ط§ظ„ط¨ظٹط§ظ†ط§طھ ط¨ظ†ط¬ط§ط­.` }, { quoted: message });
                break;
            }

            default:
                await showMainMenu(sock, chatId, message);
                break;
        }

    } catch (err) {
        console.error('â‌Œ handleMessages:', err);
    }
}

// â”€â”€ ظ…ط¹ط§ظ„ط¬ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ط¬ظ…ط§ط¹ظٹط© ط§ظ„ظ…ظ†طھط¸ظژط±ط© ط¨ط¹ط¯ ط£ظ…ط± /batch* â”€â”€â”€â”€â”€
const _origHandleMessages = handleMessages;

async function handleMessagesWithBatch(sock, messageUpdate) {
    try {
        const { messages, type } = messageUpdate;
        if (type !== 'notify') { await _origHandleMessages(sock, messageUpdate); return; }

        const message = messages[0];
        if (!message?.message) { await _origHandleMessages(sock, messageUpdate); return; }

        const chatId = message.key.remoteJid;
        const senderId = message.key.participant || message.key.remoteJid;

        if (isAdmin(senderId)) {
            const rawText = (
                message.message?.conversation ||
                message.message?.extendedTextMessage?.text || ''
            );
            const trimmed = normalizeArabicNumerals(rawText.trim());

            if (trimmed && !trimmed.startsWith('/')) {
                const key = chatId + senderId;
                const session = getAdminSession(key);
                if (session) {
                    if (session.type === 'batchword_wait') {
                        clearAdminSession(key);
                        await handleBatchWord(sock, chatId, message, trimmed);
                        return;
                    }
                    if (session.type === 'batchresult_wait') {
                        clearAdminSession(key);
                        await handleBatchResult(sock, chatId, message, trimmed);
                        return;
                    }
                    if (session.type === 'batchlesson_wait') {
                        clearAdminSession(key);
                        await handleBatchLesson(sock, chatId, message, trimmed);
                        return;
                    }
                }
            }
        }

        await _origHandleMessages(sock, messageUpdate);
    } catch (err) {
        console.error('â‌Œ handleMessagesWithBatch:', err);
        await _origHandleMessages(sock, messageUpdate);
    }
}

// â”€â”€ ط¯ظˆط§ظ„ ظ…ط¹ط§ظ„ط¬ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ط¬ظ…ط§ط¹ظٹط© â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function handleBatchWord(sock, chatId, message, text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    let added = 0, failed = 0;
    const errors = [];

    for (const line of lines) {
        const parts = line.split('|').map(p => p.trim());
        const cellContent = parts[0];
        const audioUrl = parts[1] || null;
        
        if (!cellContent) {
            failed++;
            errors.push('ط³ط·ط± ظپط§ط±ط؛');
            continue;
        }
        
        const ok = addWordFormatted(cellContent, audioUrl);
        if (ok) {
            added++;
        } else {
            failed++;
            errors.push(cellContent.substring(0, 50) + '...');
        }
    }

    await sock.sendMessage(chatId, {
        text:
            `âœ… *طھظ…طھ ط§ظ„ظ…ط¹ط§ظ„ط¬ط© ط§ظ„ط¬ظ…ط§ط¹ظٹط© ظ„ظ„ظ‚ط§ظ…ظˆط³!*\n\n` +
            `â‍• ظ…ط¶ط§ظپ: *${added}*\n` +
            `â‌Œ ظپط´ظ„: *${failed}*\n` +
            `${errors.length > 0 && errors.length <= 5 ? `\nâڑ ï¸ڈ ط§ظ„ط£ط®ط·ط§ط،:\n${errors.join('\n')}` : ''}\n\n` +
            `ًں“ٹ ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ‚ط§ظ…ظˆط³: *${coptocSize()} ظƒظ„ظ…ط©*`
    }, { quoted: message });
}

async function handleBatchResult(sock, chatId, message, text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    let l1 = 0, l2 = 0, failed = 0;

    for (const line of lines) {
        const parts = line.split('|').map(p => p.trim());
        if (parts.length < 3) { failed++; continue; }
        const level = parseInt(normalizeArabicNumerals(parts[0]));
        const code = parts[1];
        const url = parts[2];
        if ((level !== 1 && level !== 2) || !code || !url) { failed++; continue; }
        const ok = addResult(level, code, url);
        ok ? (level === 1 ? l1++ : l2++) : failed++;
    }

    await sock.sendMessage(chatId, {
        text:
            `âœ… *طھظ…طھ ط§ظ„ظ…ط¹ط§ظ„ط¬ط© ط§ظ„ط¬ظ…ط§ط¹ظٹط© ظ„ظ„ظ†طھط§ط¦ط¬!*\n\n` +
            `ًںڈ† ط§ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط£ظˆظ„: *${l1} ظ…ط¶ط§ظپ*\n` +
            `ًںڈ† ط§ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط«ط§ظ†ظٹ: *${l2} ظ…ط¶ط§ظپ*\n` +
            `â‌Œ ظپط´ظ„: *${failed}*\n` +
            `ًں“ٹ ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹ: ط§ظ„ط£ظˆظ„ ${resultsSize(1)} | ط§ظ„ط«ط§ظ†ظٹ ${resultsSize(2)}`
    }, { quoted: message });
}

async function handleBatchLesson(sock, chatId, message, text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    let l1 = 0, l2 = 0, failed = 0;

    for (const line of lines) {
        const parts = line.split('|').map(p => p.trim());
        if (parts.length < 3) { failed++; continue; }
        const level = parseInt(normalizeArabicNumerals(parts[0]));
        const name = parts[1];
        const url = parts[2];
        if ((level !== 1 && level !== 2) || !name || !url) { failed++; continue; }
        const ok = addLesson(level, name, url);
        ok ? (level === 1 ? l1++ : l2++) : failed++;
    }

    await sock.sendMessage(chatId, {
        text:
            `âœ… *طھظ…طھ ط§ظ„ظ…ط¹ط§ظ„ط¬ط© ط§ظ„ط¬ظ…ط§ط¹ظٹط© ظ„ظ„ط¯ط±ظˆط³!*\n\n` +
            `ًں“ڑ ط§ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط£ظˆظ„: *${l1} ط¯ط±ط³ ظ…ط¶ط§ظپ*\n` +
            `ًں“ڑ ط§ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط«ط§ظ†ظٹ: *${l2} ط¯ط±ط³ ظ…ط¶ط§ظپ*\n` +
            `â‌Œ ظپط´ظ„: *${failed}*\n` +
            `ًں“ٹ ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹ: ط§ظ„ط£ظˆظ„ ${learnDbSize(1)} | ط§ظ„ط«ط§ظ†ظٹ ${learnDbSize(2)}`
    }, { quoted: message });
}

module.exports = {
    handleMessages: handleMessagesWithBatch,
    handleGroupParticipantUpdate: async () => {},
    handleStatus: async () => {}
};