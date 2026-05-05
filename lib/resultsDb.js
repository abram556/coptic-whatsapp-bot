/**
 * resultsDb.js â€” ظ†ط¸ط§ظ… "ط§ظ„ط¨ط¨ظˆظ†" ط§ظ„ظ…ط·ظˆط± ظ„ط±ط¨ط· ط§ظ„ظ†طھط§ط¦ط¬ ط¨ط§ظ„ط§ظ…طھط­ط§ظ†ط§طھ
 */

const axios = require('axios');

// ط±ظˆط§ط¨ط· ط§ظ„ط´ظٹطھط§طھ ط§ظ„ط£ط³ط§ط³ظٹط© (ط§ظ„ظ†طھط§ط¦ط¬ ظˆط§ظ„ط´ظ‡ط§ط¯ط§طھ)
const LEVEL1_CSV_URL = "https://docs.google.com/spreadsheets/d/1V3N16W3523NQUQnLUq-a7_YPr9L-7lkHJq_AUefATcI/export?format=csv&gid=1440745041";
const LEVEL2_CSV_URL = "https://docs.google.com/spreadsheets/d/1w9bJFNZjyDf6NHl5b20fEN3Gh72vA4ZoF48sdh6FYRk/export?format=csv&gid=852753324";

// ط±ظˆط§ط¨ط· ط´ظٹطھط§طھ ط§ظ„طھط­ظ‚ظ‚ (FINAL) ظ„ظ…ط¹ط±ظپط© ط§ظ„ط§ظ…طھط­ط§ظ†ط§طھ ط§ظ„ظ…ظƒطھظ…ظ„ط©
const FINAL1_CSV_URL = "https://docs.google.com/spreadsheets/d/1V3N16W3523NQUQnLUq-a7_YPr9L-7lkHJq_AUefATcI/export?format=csv&gid=1115858807";
const FINAL2_CSV_URL = "https://docs.google.com/spreadsheets/d/1w9bJFNZjyDf6NHl5b20fEN3Gh72vA4ZoF48sdh6FYRk/export?format=csv&gid=1115858807";

// ط±ظˆط§ط¨ط· ط´ظٹطھط§طھ ط§ظ„ط£ط³ظ…ط§ط، ظˆط§ظ„ظ…ط³ط¬ظ„ظٹظ† (natiga & code13)
const NATIGA_CSV_URL = "https://docs.google.com/spreadsheets/d/1V3N16W3523NQUQnLUq-a7_YPr9L-7lkHJq_AUefATcI/export?format=csv&gid=1055745127";
const CODE13_CSV_URL = "https://docs.google.com/spreadsheets/d/1w9bJFNZjyDf6NHl5b20fEN3Gh72vA4ZoF48sdh6FYRk/export?format=csv&gid=1510467554";

let level1Map = {};
let level2Map = {};
let final1Data = [];
let final2Data = [];
let code13Map = {};
let natigaIds = new Set();

// ط¯ط§ظ„ط© طھط­ظˆظٹظ„ ط±ط§ط¨ط· ط§ظ„ط¨ط±ظٹط³ظ†طھظٹط´ظ† ط£ظˆ ط§ظ„ط¯ط±ط§ظٹظپ ط¥ظ„ظ‰ طµظˆط±ط© ظ…ط¨ط§ط´ط±ط©
function convertToImageUrl(url) {
    if (!url) return null;
    url = url.trim();
    const slidesMatch = url.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
    if (slidesMatch && slidesMatch[1]) {
        return `https://docs.google.com/presentation/d/${slidesMatch[1]}/export/png`;
    }
    const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
        return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
    }
    return url;
}

function parseCSV(csvText) {
    if (!csvText) return [];
    const lines = csvText.split(/\r?\n/);
    return lines.map(line => {
        const result = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) {
                result.push(cur);
                cur = '';
            } else cur += char;
        }
        result.push(cur);
        return result;
    });
}

async function reloadResultsDb() {
    try {
        console.log('ًںŒگ ط¬ط§ط±ظٹ طھط­ط¯ظٹط« ط¨ظٹط§ظ†ط§طھ ظ†ط¸ط§ظ… ط§ظ„ط¨ط¨ظˆظ† ظ…ظ† Google Sheets...');
        
        const [res1, res2, final1, final2, code13, natiga] = await Promise.all([
            axios.get(LEVEL1_CSV_URL, { timeout: 15000 }),
            axios.get(LEVEL2_CSV_URL, { timeout: 15000 }),
            axios.get(FINAL1_CSV_URL, { timeout: 15000 }),
            axios.get(FINAL2_CSV_URL, { timeout: 15000 }),
            axios.get(CODE13_CSV_URL, { timeout: 15000 }),
            axios.get(NATIGA_CSV_URL, { timeout: 15000 })
        ]);

        // 1. ظ…ط¹ط§ظ„ط¬ط© ظ†طھط§ط¦ط¬ ط§ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط£ظˆظ„
        const rows1 = parseCSV(res1.data);
        const newL1Map = {};
        for (let i = 1; i < rows1.length; i++) {
            const code = String(rows1[i][24] || '').trim();
            const url = String(rows1[i][2] || '').trim();
            if (code && url.startsWith('http')) newL1Map[code] = { url: convertToImageUrl(url) };
        }
        level1Map = newL1Map;

        // 2. ظ…ط¹ط§ظ„ط¬ط© ظ†طھط§ط¦ط¬ ط§ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط«ط§ظ†ظٹ
        const rows2 = parseCSV(res2.data);
        const newL2Map = {};
        for (let i = 1; i < rows2.length; i++) {
            const code = String(rows2[i][2] || '').trim();
            const url = String(rows2[i][71] || '').trim();
            if (code && url.startsWith('http')) newL2Map[code] = { url: convertToImageUrl(url) };
        }
        level2Map = newL2Map;

        // 3. ظ…ط¹ط§ظ„ط¬ط© ط¨ظٹط§ظ†ط§طھ ط§ظ„ط§ظ…طھط­ط§ظ†ط§طھ (FINAL)
        final1Data = parseCSV(final1.data);
        final2Data = parseCSV(final2.data);

        // 4. ظ…ط¹ط§ظ„ط¬ط© ط§ظ„ط£ط³ظ…ط§ط، (code13)
        const codeRows = parseCSV(code13.data);
        const newCodeMap = {};
        for (let i = 0; i < codeRows.length; i++) {
            const code = String(codeRows[i][0] || '').trim();
            const name = String(codeRows[i][1] || '').trim();
            if (code) newCodeMap[code] = name || "ط¯ط§ط±ط³ظ†ط§ ط§ظ„ط¹ط²ظٹط²";
        }
        code13Map = newCodeMap;

        // 5. ظ…ط¹ط§ظ„ط¬ط© ط§ظ„ظ…ط³ط¬ظ„ظٹظ† (natiga)
        const natigaRows = parseCSV(natiga.data);
        const newNatigaSet = new Set();
        for (let i = 0; i < natigaRows.length; i++) {
            const id = String(natigaRows[i][0] || '').trim();
            if (id) newNatigaSet.add(id);
        }
        natigaIds = newNatigaSet;

        console.log(`âœ… طھظ… طھط­ط¯ظٹط« ظ†ط¸ط§ظ… ط§ظ„ط¨ط¨ظˆظ†! (L1: ${Object.keys(level1Map).length} | L2: ${Object.keys(level2Map).length} | Names: ${Object.keys(code13Map).length})`);
        return true;
    } catch (err) {
        console.error('â‌Œ ظپط´ظ„ طھط­ط¯ظٹط« ظ†ط¸ط§ظ… ط§ظ„ط¨ط¨ظˆظ†:', err.message);
        return false;
    }
}

function lookupResult(level, code) {
    const map = level === 1 ? level1Map : level2Map;
    const res = map[String(code).trim()];
    return res ? res.url : null;
}

function getStudentName(code) {
    return code13Map[String(code).trim()] || null;
}

function checkExamStatus(level, code) {
    const finalData = level === 1 ? final1Data : final2Data;
    const examCols = level === 1 ? [0, 2, 4, 6, 8, 10, 12, 14, 16, 18] : [0, 2, 4, 6];
    const examNames = level === 1 
        ? ["ط§ظ„ط§ظ…طھط­ط§ظ† ط§ظ„ط£ظˆظ„", "ط§ظ„ط§ظ…طھط­ط§ظ† ط§ظ„ط«ط§ظ†ظٹ", "ط§ظ„ط§ظ…طھط­ط§ظ† ط§ظ„ط«ط§ظ„ط«", "ط§ظ„ط§ظ…طھط­ط§ظ† ط§ظ„ط±ط§ط¨ط¹", "ط§ظ„ط§ظ…طھط­ط§ظ† ط§ظ„ط®ط§ظ…ط³", "ط§ظ„ط§ظ…طھط­ط§ظ† ط§ظ„ط³ط§ط¯ط³", "ط§ظ„ط§ظ…طھط­ط§ظ† ط§ظ„ط³ط§ط¨ط¹", "ط§ظ„ط§ظ…طھط­ط§ظ† ط§ظ„ط«ط§ظ…ظ†", "ط§ظ„ط§ظ…طھط­ط§ظ† ط§ظ„طھط§ط³ط¹", "ط§ظ„ط§ظ…طھط­ط§ظ† ط§ظ„ظ†ظ‡ط§ط¦ظٹ"]
        : ["ط§ظ„ط§ظ…طھط­ط§ظ† ط§ظ„ط£ظˆظ„", "ط§ظ„ط§ظ…طھط­ط§ظ† ط§ظ„ط«ط§ظ†ظٹ", "ط§ظ„ط§ظ…طھط­ط§ظ† ط§ظ„ط«ط§ظ„ط«", "ط§ظ„ط§ظ…طھط­ط§ظ† ط§ظ„ظ†ظ‡ط§ط¦ظٹ"];

    const status = new Array(examCols.length).fill(false);
    let foundAny = false;

    for (let i = 0; i < finalData.length; i++) {
        for (let j = 0; j < examCols.length; j++) {
            if (finalData[i][examCols[j]] && String(finalData[i][examCols[j]]).trim() === String(code).trim()) {
                status[j] = true;
                foundAny = true;
            }
        }
    }

    return { foundAny, status, examNames };
}

async function registerUserInNatiga(chatId) {
    const userId = String(chatId).split('@')[0];
    if (natigaIds.has(userId)) return;

    try {
        // ط¨ط¯ظ„ط§ظ‹ ظ…ظ† ط§ط³طھط®ط¯ط§ظ… API ط§ظ„ط´ظٹطھط§طھ ط§ظ„ظ…ط¹ظ‚ط¯طŒ ط³ظ†ط³طھط®ط¯ظ… ط§ظ„ظ€ Apps Script ط§ظ„ط®ط§طµ ط¨ظƒ ظƒظ€ Proxy ط¥ط°ط§ ظƒط§ظ† ظٹط¯ط¹ظ… ط§ظ„طھط³ط¬ظٹظ„
        // ط£ظˆ ظ†ظƒطھظپظٹ ط­ط§ظ„ظٹط§ظ‹ ط¨ط§ظ„طھط³ط¬ظٹظ„ ظپظٹ ظ‚ط§ط¹ط¯ط© ط¨ظٹط§ظ†ط§طھ ط§ظ„ط¨ظˆطھ ط§ظ„ظ…ط­ظ„ظٹط©
        natigaIds.add(userId);
    } catch (e) {}
}

setInterval(reloadResultsDb, 30 * 60 * 1000); // طھط­ط¯ظٹط« ظƒظ„ 30 ط¯ظ‚ظٹظ‚ط©
reloadResultsDb();

module.exports = { 
    reloadResultsDb, 
    lookupResult, 
    getStudentName,
    checkExamStatus,
    registerUserInNatiga,
    resultsSize: (l) => l === 1 ? Object.keys(level1Map).length : Object.keys(level2Map).length
};