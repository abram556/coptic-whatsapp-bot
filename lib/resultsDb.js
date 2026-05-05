/**
 * resultsDb.js â€” ظ†ط¸ط§ظ… "ط§ظ„ط¨ط¨ظˆظ†" ط§ظ„ظ…ط·ظˆط± (ظ…ط·ط§ط¨ظ‚ طھظ…ط§ظ…ط§ظ‹ ظ„ظ…ظ†ط·ظ‚ Apps Script)
 */

const axios = require('axios');

// ط±ظˆط§ط¨ط· ط§ظ„ط´ظٹطھط§طھ ظ„ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط£ظˆظ„ (0 ظپظٹ ط§ظ„ظƒظˆط¯ ط§ظ„ط£طµظ„ظٹ)
const L1_ID = "1V3N16W3523NQUQnLUq-a7_YPr9L-7lkHJq_AUefATcI";
const L1_RESULTS_URL = `https://docs.google.com/spreadsheets/d/${L1_ID}/export?format=csv&gid=1440745041`; // Sheet1
const L1_USER_URL    = `https://docs.google.com/spreadsheets/d/${L1_ID}/export?format=csv&gid=1334863953`; // USER
const L1_FINAL_URL   = `https://docs.google.com/spreadsheets/d/${L1_ID}/export?format=csv&gid=1115858807`; // FINAL

// ط±ظˆط§ط¨ط· ط§ظ„ط´ظٹطھط§طھ ظ„ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط«ط§ظ†ظٹ (1 ظپظٹ ط§ظ„ظƒظˆط¯ ط§ظ„ط£طµظ„ظٹ)
const L2_ID = "1w9bJFNZjyDf6NHl5b20fEN3Gh72vA4ZoF48sdh6FYRk";
const L2_RESULTS_URL = `https://docs.google.com/spreadsheets/d/${L2_ID}/export?format=csv&gid=852753324`; // LEVEL2
const L2_USER_URL    = `https://docs.google.com/spreadsheets/d/${L2_ID}/export?format=csv&gid=1334863953`; // USER
const L2_FINAL_URL   = `https://docs.google.com/spreadsheets/d/${L2_ID}/export?format=csv&gid=1115858807`; // FINAL

// ط´ظٹطھ ط§ظ„ط£ط³ظ…ط§ط، (code13) ظˆط´ظٹطھ ط§ظ„ظ…ط³ط¬ظ„ظٹظ† (natiga)
const CODE13_URL     = `https://docs.google.com/spreadsheets/d/${L2_ID}/export?format=csv&gid=1510467554`;
const NATIGA_URL     = `https://docs.google.com/spreadsheets/d/${L1_ID}/export?format=csv&gid=1055745127`;

let maps = {
    results: [{}, {}], // [Level1, Level2]
    user: [new Set(), new Set()],
    final: [[], []],
    names: {},
    natiga: new Set()
};

function convertToImageUrl(url) {
    if (!url) return null;
    url = url.trim();
    const slidesMatch = url.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
    if (slidesMatch && slidesMatch[1]) return `https://docs.google.com/presentation/d/${slidesMatch[1]}/export/png`;
    const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
    return url;
}

function parseCSV(csvText) {
    if (!csvText) return [];
    const lines = csvText.split(/\r?\n/);
    return lines.map(line => {
        const result = [];
        let cur = '', inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) { result.push(cur); cur = ''; }
            else cur += char;
        }
        result.push(cur);
        return result;
    });
}

async function reloadResultsDb() {
    try {
        console.log('ًںŒگ ط¬ط§ط±ظٹ طھط­ط¯ظٹط« ظ†ط¸ط§ظ… ط§ظ„ط¨ط¨ظˆظ† (طھط·ط§ط¨ظ‚ ظƒط§ظ…ظ„)...');
        
        const [r1, r2, u1, u2, f1, f2, c13, nt] = await Promise.all([
            axios.get(L1_RESULTS_URL), axios.get(L2_RESULTS_URL),
            axios.get(L1_USER_URL),    axios.get(L2_USER_URL),
            axios.get(L1_FINAL_URL),   axios.get(L2_FINAL_URL),
            axios.get(CODE13_URL),     axios.get(NATIGA_URL)
        ]);

        // 1. ظ…ط¹ط§ظ„ط¬ط© ط§ظ„ظ†طھط§ط¦ط¬ (Results)
        const rowsR1 = parseCSV(r1.data);
        maps.results[0] = {};
        for (let i = 1; i < rowsR1.length; i++) {
            const code = String(rowsR1[i][24] || '').trim(); // ط§ظ„ط¹ظ…ظˆط¯ Y
            const url = String(rowsR1[i][2] || '').trim();   // ط§ظ„ط¹ظ…ظˆط¯ C
            if (code && url.startsWith('http')) maps.results[0][code] = convertToImageUrl(url);
        }

        const rowsR2 = parseCSV(r2.data);
        maps.results[1] = {};
        for (let i = 1; i < rowsR2.length; i++) {
            const code = String(rowsR2[i][2] || '').trim();   // ط§ظ„ط¹ظ…ظˆط¯ C
            const url = String(rowsR2[i][71] || '').trim();  // ط§ظ„ط¹ظ…ظˆط¯ BT
            if (code && url.startsWith('http')) maps.results[1][code] = convertToImageUrl(url);
        }

        // 2. ظ…ط¹ط§ظ„ط¬ط© ط´ظٹطھ USER
        maps.user[0] = new Set(parseCSV(u1.data).map(r => String(r[0]).trim()));
        maps.user[1] = new Set(parseCSV(u2.data).map(r => String(r[0]).trim()));

        // 3. ظ…ط¹ط§ظ„ط¬ط© ط´ظٹطھ FINAL
        maps.final[0] = parseCSV(f1.data);
        maps.final[1] = parseCSV(f2.data);

        // 4. ظ…ط¹ط§ظ„ط¬ط© ط§ظ„ط£ط³ظ…ط§ط، (code13)
        const rowsC13 = parseCSV(c13.data);
        maps.names = {};
        for (let r of rowsC13) maps.names[String(r[0]).trim()] = String(r[1] || '').trim();

        // 5. ظ…ط¹ط§ظ„ط¬ط© natiga
        maps.natiga = new Set(parseCSV(nt.data).map(r => String(r[0]).trim()));

        console.log('âœ… طھظ… طھط­ط¯ظٹط« ظ†ط¸ط§ظ… ط§ظ„ط¨ط¨ظˆظ† ط¨ظ†ط¬ط§ط­ ظ…ط·ط§ط¨ظ‚ طھظ…ط§ظ…ط§ظ‹ ظ„ظ„ط£طµظ„ظٹ.');
        return true;
    } catch (err) {
        console.error('â‌Œ ظپط´ظ„ طھط­ط¯ظٹط« ظ†ط¸ط§ظ… ط§ظ„ط¨ط¨ظˆظ†:', err.message);
        return false;
    }
}

function lookupResult(level, code) {
    return maps.results[level - 1][String(code).trim()] || null;
}

function getStudentName(code) {
    return maps.names[String(code).trim()] || null;
}

function checkUserHasCompleted(level, code) {
    return maps.user[level - 1].has(String(code).trim());
}

function checkExamStatus(level, code) {
    const finalData = maps.final[level - 1];
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

function registerUserInNatiga(chatId) {
    const userId = String(chatId).split('@')[0];
    if (maps.natiga.has(userId)) return;
    maps.natiga.add(userId);
    // ط§ظ„طھط³ط¬ظٹظ„ ط§ظ„ظپط¹ظ„ظٹ ظپظٹ ط¬ظˆط¬ظ„ ط´ظٹطھ ظٹطھظ… ط¹ط¨ط± ط§ظ„ط¨ط« ط£ظˆ ط£ظˆط§ظ…ط± ط§ظ„ط£ط¯ظ…ظ†
}

setInterval(reloadResultsDb, 30 * 60 * 1000);
reloadResultsDb();

module.exports = { 
    reloadResultsDb, lookupResult, getStudentName, 
    checkExamStatus, registerUserInNatiga, checkUserHasCompleted,
    resultsSize: (l) => Object.keys(maps.results[l-1]).length
};