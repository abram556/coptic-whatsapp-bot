/**
 * resultsDb.js â€” طھط­ط¯ظٹط« ط§ظ„ط±ط¨ط· ط§ظ„ظ…ط¨ط§ط´ط± ظ…ط¹ Google Sheets
 */

const axios = require('axios');

// ط±ظˆط§ط¨ط· ط§ظ„ط´ظٹطھط§طھ ط§ظ„طھظٹ ط²ظˆط¯طھظ†ظٹ ط¨ظ‡ط§ (ط¨طµظٹط؛ط© طھطµط¯ظٹط± CSV)
const LEVEL1_CSV_URL = "https://docs.google.com/spreadsheets/d/1V3N16W3523NQUQnLUq-a7_YPr9L-7lkHJq_AUefATcI/export?format=csv&gid=1440745041";
const LEVEL2_CSV_URL = "https://docs.google.com/spreadsheets/d/1w9bJFNZjyDf6NHl5b20fEN3Gh72vA4ZoF48sdh6FYRk/export?format=csv&gid=852753324";

let level1Map = {};
let level2Map = {};
let level1Entries = [];
let level2Entries = [];

// ط¯ط§ظ„ط© طھط­ظˆظٹظ„ ط±ط§ط¨ط· ط§ظ„ط¨ط±ظٹط³ظ†طھظٹط´ظ† ط£ظˆ ط§ظ„ط¯ط±ط§ظٹظپ ط¥ظ„ظ‰ طµظˆط±ط© ظ…ط¨ط§ط´ط±ط©
function convertToImageUrl(url) {
    if (!url) return null;
    url = url.trim();
    // ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ط±ظˆط§ط¨ط· ط§ظ„ط¹ط±ظˆط¶ ط§ظ„طھظ‚ط¯ظٹظ…ظٹط© (Slides)
    const slidesMatch = url.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
    if (slidesMatch && slidesMatch[1]) {
        return `https://docs.google.com/presentation/d/${slidesMatch[1]}/export/png`;
    }
    // ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ط±ظˆط§ط¨ط· ط§ظ„ظ…ظ„ظپط§طھ ط§ظ„ط¹ط§ط¯ظٹط© (Files)
    const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
        return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
    }
    return url;
}

// ط¯ط§ظ„ط© ط¨ط³ظٹط·ط© ظ„طھظ‚ط³ظٹظ… ط£ط³ط·ط± CSV ظ…ط¹ ظ…ط±ط§ط¹ط§ط© ط§ظ„ظپظˆط§طµظ„ ط¯ط§ط®ظ„ ط§ظ„ظ†طµظˆطµ
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

// ط§ظ„ظˆط¸ظٹظپط© ط§ظ„ط±ط¦ظٹط³ظٹط© ظ„ط¬ظ„ط¨ ط§ظ„ط¨ظٹط§ظ†ط§طھ ظ…ظ† Google Sheets
async function reloadResultsDb() {
    try {
        console.log('ًںŒگ ط¬ط§ط±ظٹ طھط­ط¯ظٹط« ط§ظ„ظ†طھط§ط¦ط¬ ظ…ظ† Google Sheets...');
        
        // ط¬ظ„ط¨ ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط£ظˆظ„
        const res1 = await axios.get(LEVEL1_CSV_URL, { timeout: 15000 });
        const rows1 = parseCSV(res1.data);
        const newLevel1Map = {};
        const newLevel1Entries = [];

        for (let i = 1; i < rows1.length; i++) { // ظ†ط¨ط¯ط£ ظ…ظ† 1 ظ„طھط®ط·ظٹ ط§ظ„ط¹ظ†ظˆط§ظ†
            const row = rows1[i];
            if (!row || row.length < 2) continue;
            
            const code = String(row[24] || '').trim(); // ط§ظ„ط¹ظ…ظˆط¯ Y (24)
            const url = String(row[2] || '').trim();  // ط§ظ„ط¹ظ…ظˆط¯ C (2)
            
            if (code && url && url.startsWith('http')) {
                const entry = { code, url: convertToImageUrl(url), originalUrl: url };
                newLevel1Map[code] = entry;
                newLevel1Entries.push(entry);
            }
        }

        // ط¬ظ„ط¨ ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ط³طھظˆظ‰ ط§ظ„ط«ط§ظ†ظٹ
        const res2 = await axios.get(LEVEL2_CSV_URL, { timeout: 15000 });
        const rows2 = parseCSV(res2.data);
        const newLevel2Map = {};
        const newLevel2Entries = [];

        for (let i = 1; i < rows2.length; i++) {
            const row = rows2[i];
            if (!row || row.length < 3) continue;
            
            const code = String(row[2] || '').trim();   // ط§ظ„ط¹ظ…ظˆط¯ C (2)
            const url = String(row[71] || '').trim();  // ط§ظ„ط¹ظ…ظˆط¯ BT (71)
            
            if (code && url && url.startsWith('http')) {
                const entry = { code, url: convertToImageUrl(url), originalUrl: url };
                newLevel2Map[code] = entry;
                newLevel2Entries.push(entry);
            }
        }

        level1Map = newLevel1Map;
        level2Map = newLevel2Map;
        level1Entries = newLevel1Entries;
        level2Entries = newLevel2Entries;

        console.log(`âœ… طھظ… طھط­ط¯ظٹط« ط§ظ„ظ†طھط§ط¦ط¬ ط¨ظ†ط¬ط§ط­! (ط§ظ„ط£ظˆظ„: ${level1Entries.length} | ط§ظ„ط«ط§ظ†ظٹ: ${level2Entries.length})`);
        return true;
    } catch (err) {
        console.error('â‌Œ ظپط´ظ„ طھط­ط¯ظٹط« ط§ظ„ظ†طھط§ط¦ط¬ ظ…ظ† Google Sheets:', err.message);
        return false;
    }
}

function lookupResult(level, code) {
    const map = level === 1 ? level1Map : level2Map;
    const searchCode = String(code).trim();
    
    // ط§ظ„ط¨ط­ط« ط§ظ„ظ…ط¨ط§ط´ط±
    let result = map[searchCode];
    
    // ظ…ط­ط§ظˆظ„ط© ط§ظ„ط¨ط­ط« ظƒط±ظ‚ظ… ط¥ط°ط§ ظپط´ظ„ ط§ظ„ط¨ط­ط« ظƒظ†طµ (ظ…ط«ظ„ط§ظ‹ 0123 طھطµط¨ط­ 123)
    if (!result && !isNaN(searchCode)) {
        const asNumber = parseInt(searchCode, 10).toString();
        if (asNumber !== searchCode) {
            result = map[asNumber];
        }
    }
    
    return result ? result.url : null;
}

function resultsSize(level) {
    return level === 1 ? level1Entries.length : level2Entries.length;
}

function getResultEntry(level, code) {
    const map = level === 1 ? level1Map : level2Map;
    const searchCode = String(code).trim();
    return map[searchCode] || null;
}

function getAllResults(level) {
    return level === 1 ? [...level1Entries] : [...level2Entries];
}

// طھط­ط¯ظٹط« طھظ„ظ‚ط§ط¦ظٹ ظƒظ„ ط³ط§ط¹ط© ظ„ط¶ظ…ط§ظ† طھط²ط§ظ…ظ† ط§ظ„ط¨ظٹط§ظ†ط§طھ
setInterval(reloadResultsDb, 60 * 60 * 1000);

// طھط´ط؛ظٹظ„ ط§ظ„طھط­ظ…ظٹظ„ ظ„ط£ظˆظ„ ظ…ط±ط© ط¹ظ†ط¯ ط¨ط¯ط، ط§ظ„ط¨ظˆطھ
reloadResultsDb();

module.exports = { 
    reloadResultsDb, 
    lookupResult, 
    getResultEntry,
    resultsSize, 
    getAllResults,
    // ط§ظ„ط¯ظˆط§ظ„ ط§ظ„طھط§ظ„ظٹط© ط£طµط¨ط­طھ ط؛ظٹط± ط¶ط±ظˆط±ظٹط© ظ„ظ„ط¥ط¶ط§ظپط© ط§ظ„ظٹط¯ظˆظٹط© ظ„ظƒظ†ظ†ط§ ط³ظ†ط¨ظ‚ظٹ ط¹ظ„ظٹظ‡ط§ ظپط§ط±ط؛ط© ظ„ظ…ظ†ط¹ ط§ظ„ط£ط®ط·ط§ط، ظپظٹ main.js
    addResult: () => false, 
    deleteResult: () => false,
    deleteMultipleResults: () => ({ deleted: 0, notFound: 0, notFoundCodes: [] }),
    updateResult: () => false,
    saveResultsDb: () => true, 
    exportResultsXlsx: () => null 
};