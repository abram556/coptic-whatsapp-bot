/**
 * resultsDb.js — نظام "الببون" (تطابق حرفي مع منطق Apps Script)
 * ─────────────────────────────────────────────────────────────
 * المنطق بالضبط:
 *   1. شيت الإعدادات (gid=36067296) → أعمدة البحث + أعمدة الرد
 *   2. processSearch: مطابقة حرفية فقط في أعمدة البحث المحددة
 *   3. checkCompletionStatus: code13 → USER → FINAL
 *   4. الرابط: عمود C للمستوى الأول، عمود BT للمستوى الثاني
 * ─────────────────────────────────────────────────────────────
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ==========================================
// معرّفات الشيتات (بالضبط كما في الكود الأصلي)
// ==========================================
const L1_ID = "1V3N16W3523NQUQnLUq-a7_YPr9L-7lkHJq_AUefATcI";
const L2_ID = "1w9bJFNZjyDf6NHl5b20fEN3Gh72vA4ZoF48sdh6FYRk";

// Sheet1 (المستوى الأول) — داخل L1
const L1_RESULTS_URL = `https://docs.google.com/spreadsheets/d/${L1_ID}/export?format=csv&gid=1440745041`;
// LEVEL2 (المستوى الثاني) — داخل L1
const L2_RESULTS_URL = `https://docs.google.com/spreadsheets/d/${L1_ID}/export?format=csv&gid=2058890972`;

// USER (المستوى الأول) — داخل L1
const L1_USER_URL = `https://docs.google.com/spreadsheets/d/${L1_ID}/export?format=csv&gid=1862078090`;
// USER (المستوى الثاني) — داخل L2
const L2_USER_URL = `https://docs.google.com/spreadsheets/d/${L2_ID}/export?format=csv&gid=2099999858`;

// FINAL (المستوى الأول) — داخل L1
const L1_FINAL_URL = `https://docs.google.com/spreadsheets/d/${L1_ID}/export?format=csv&gid=1865245414`;
// FINAL (المستوى الثاني) — داخل L2
const L2_FINAL_URL = `https://docs.google.com/spreadsheets/d/${L2_ID}/export?format=csv&gid=712456037`;

// الإعدادات — داخل L1 (الصفوف 2:3 فيها إعدادات المستويين)
const SETTINGS_URL = `https://docs.google.com/spreadsheets/d/${L1_ID}/export?format=csv&gid=36067296`;

// code13 (الأسماء) — داخل L2
const CODE13_URL = `https://docs.google.com/spreadsheets/d/${L2_ID}/export?format=csv&gid=270628575`;

// natiga — يعتمد على الحفظ المحلي فقط (بدون شيت خارجي)

// ==========================================
// التخزين المؤقت (بالضبط كما في cache الأصلي)
// ==========================================
let cache = {
    settings: null,       // بيانات شيت الإعدادات (صفين)
    sheetsData: [null, null], // [Sheet1 data, LEVEL2 data] — كل البيانات الخام
    user: [null, null],   // [L1 USER rows, L2 USER rows]
    final: [null, null],  // [L1 FINAL rows, L2 FINAL rows]
    names: {},            // code13 → {code: name}
    natiga: new Set()     // المسجلين
};

// ==========================================
// 1. دوال مساعدة (بالضبط كما في الأصلي)
// ==========================================

function letterToIndex(letter) {
    let column = 0;
    const upperLetter = String(letter || '').trim().toUpperCase();
    if (!upperLetter) return -1;
    for (let i = 0; i < upperLetter.length; i++) {
        column = column * 26 + (upperLetter.charCodeAt(i) - 64);
    }
    return column - 1;
}

function convertToImageUrl(url) {
    if (!url) return null;
    url = url.trim();

    // روابط العروض التقديمية
    const slidesMatch = url.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
    if (slidesMatch && slidesMatch[1]) {
        return `https://docs.google.com/presentation/d/${slidesMatch[1]}/export/png`;
    }

    // روابط المستندات (نحاول تصديرها كصورة)
    const docsMatch = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
    if (docsMatch && docsMatch[1]) {
        return `https://docs.google.com/presentation/d/${docsMatch[1]}/export/png`;
    }

    // روابط الملفات من درايف
    const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
        return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
    }

    return url;
}

// ==========================================
// 2. محلل CSV (يدعم النصوص متعددة الأسطر داخل علامات الاقتباس)
// ==========================================

function parseCSV(csvText) {
    if (!csvText) return [];
    const result = [];
    let row = [];
    let cur = '', inQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];
        const next = csvText[i + 1];

        if (char === '"') {
            if (inQuotes && next === '"') {
                cur += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            row.push(cur);
            cur = '';
        } else if ((char === '\n' || (char === '\r' && next === '\n')) && !inQuotes) {
            row.push(cur);
            result.push(row);
            row = [];
            cur = '';
            if (char === '\r') i++;
        } else {
            cur += char;
        }
    }

    if (row.length > 0 || cur !== '') {
        row.push(cur);
        result.push(row);
    }

    return result;
}

// ==========================================
// 3. natiga — حفظ محلي
// ==========================================

const NATIGA_JSON = path.join(__dirname, '../data/natiga_users.json');

function loadLocalNatiga() {
    try {
        if (fs.existsSync(NATIGA_JSON)) {
            const data = JSON.parse(fs.readFileSync(NATIGA_JSON, 'utf8'));
            data.forEach(id => cache.natiga.add(id));
        }
    } catch (e) {
        console.warn('⚠️ فشل تحميل natiga_users.json:', e.message);
    }
}

function saveLocalNatiga() {
    try {
        const dir = path.dirname(NATIGA_JSON);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(NATIGA_JSON, JSON.stringify([...cache.natiga], null, 2));
    } catch (e) {
        console.warn('⚠️ فشل حفظ natiga_users.json:', e.message);
    }
}

// ==========================================
// 4. تحميل البيانات من جوجل شيتس
// ==========================================

async function fetchSheet(url, name, retries = 2) {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const res = await axios.get(url, {
                timeout: 120000,
                headers: { 'User-Agent': 'Mozilla/5.0' },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });
            if (res.data) {
                console.log(`  ✅ ${name} (${Math.round(String(res.data).length / 1024)} KB)`);
                return res.data;
            }
        } catch (e) {
            if (attempt < retries - 1) {
                console.warn(`  ⚠️ ${name} — محاولة ${attempt + 1} فشلت، جاري الإعادة...`);
                await new Promise(r => setTimeout(r, 2000));
            } else {
                console.error(`  ❌ ${name} — فشل بعد ${retries} محاولات: ${e.message}`);
            }
        }
    }
    return null;
}

async function reloadResultsDb() {
    try {
        console.log('🌐 جاري تحديث نظام الببون...');
        loadLocalNatiga();

        // تحميل جميع الشيتات بالتوازي
        const [settingsRaw, r1Raw, r2Raw, u1Raw, u2Raw, f1Raw, f2Raw, c13Raw] = await Promise.all([
            fetchSheet(SETTINGS_URL, 'SETTINGS'),
            fetchSheet(L1_RESULTS_URL, 'Sheet1 (L1)'),
            fetchSheet(L2_RESULTS_URL, 'LEVEL2 (L2)'),
            fetchSheet(L1_USER_URL, 'USER (L1)'),
            fetchSheet(L2_USER_URL, 'USER (L2)'),
            fetchSheet(L1_FINAL_URL, 'FINAL (L1)'),
            fetchSheet(L2_FINAL_URL, 'FINAL (L2)'),
            fetchSheet(CODE13_URL, 'code13')
        ]);

        // الإعدادات إلزامية
        if (!settingsRaw) {
            console.error('❌ تعذر تحميل شيت الإعدادات — لا يمكن المتابعة.');
            return false;
        }

        // فلتر أساسي للأشياء البسيطة (الأسماء، الإعدادات)
        const filterBasic = (rows) => rows.filter((r, idx) => {
            if (idx === 0) return true;
            return r.some(cell => cell && String(cell).trim().length > 0);
        });

        // فلتر صارم جداً للنتائج (يجب أن يحتوي الصف على 3 بيانات على الأقل ليكون طالب حقيقي)
        const filterStrict = (rows) => rows.filter((r, idx) => {
            if (idx === 0) return true;
            let filledCells = 0;
            for (let i = 0; i < r.length; i++) {
                if (r[i] && String(r[i]).trim().length > 0) filledCells++;
            }
            return filledCells >= 3;
        });

        // ── الإعدادات ────────────────────────────────────────
        cache.settings = filterBasic(parseCSV(settingsRaw));

        // ── بيانات النتائج الخام (استخدام الفلتر الصارم) ──────
        if (r1Raw) cache.sheetsData[0] = filterStrict(parseCSV(r1Raw));
        if (r2Raw) cache.sheetsData[1] = filterStrict(parseCSV(r2Raw));

        // ── USER ─────────────────────────────────────────────
        if (u1Raw) cache.user[0] = filterBasic(parseCSV(u1Raw));
        if (u2Raw) cache.user[1] = filterBasic(parseCSV(u2Raw));

        // ── FINAL (استخدام الفلتر الصارم) ────────────────────
        if (f1Raw) cache.final[0] = filterStrict(parseCSV(f1Raw));
        if (f2Raw) cache.final[1] = filterStrict(parseCSV(f2Raw));

        // ── code13 (الأسماء) ─────────────────────────────────
        if (c13Raw) {
            cache.names = {};
            const rows = filterBasic(parseCSV(c13Raw));
            for (const r of rows) {
                const code = String(r[0] || '').trim();
                const name = String(r[1] || '').trim();
                if (code) cache.names[code] = name;
            }
        }

        const l1Count = cache.sheetsData[0] ? cache.sheetsData[0].length : 0;
        const l2Count = cache.sheetsData[1] ? cache.sheetsData[1].length : 0;
        console.log(`✅ نظام الببون جاهز (Sheet1: ${l1Count} صف حقيقي | LEVEL2: ${l2Count} صف حقيقي)`);
        return true;

    } catch (err) {
        console.error('❌ خطأ في تحديث نظام الببون:', err.message);
        return false;
    }
}

// ==========================================
// 5. processSearch — بالضبط كما في الكود الأصلي
// ==========================================
// المنطق الأصلي:
//   settingsRow = cache.settings[level]   (level 0 → صف 1, level 1 → صف 2)
//   lookupColsIndices = settingsRow[1..5].map(letterToIndex)
//   responseColsIndices = settingsRow[6].split(",").map(letterToIndex)
//   للكل صف في الشيت: if (row[lookupCol] === text) → match
//   الرسالة = responseColsIndices.map(col => row[col]).join("\n")
//   الرابط = row[C] للمستوى الأول أو row[BT] للمستوى الثاني

function lookupResult(level, code) {
    // level 1 → index 0 في sheetsData, level 2 → index 1
    const levelIdx = level - 1;
    const text = String(code).trim();

    if (!cache.settings || !cache.sheetsData[levelIdx]) return null;

    // إعدادات هذا المستوى: الصف [levelIdx + 1] من شيت الإعدادات
    // (الصف 0 هو header، الصف 1 هو المستوى الأول، الصف 2 هو المستوى الثاني)
    const settingsRow = cache.settings[levelIdx + 1];
    if (!settingsRow) return null;

    // أعمدة البحث (5 أعمدة): settingsRow[1], settingsRow[2], ..., settingsRow[5]
    const lookupColsIndices = settingsRow.slice(1, 6).map(letter => letterToIndex(letter));

    // أعمدة الرد (مفصولة بفاصلة في settingsRow[6])
    const responseColsIndices = String(settingsRow[6] || '').split(',').map(letter => letterToIndex(letter));

    // عمود الرابط: C للمستوى الأول (level 0), BT للمستوى الثاني (level 1)
    const linkColumnIndex = levelIdx === 0 ? letterToIndex('C') : letterToIndex('BT');

    const allData = cache.sheetsData[levelIdx];

    // البحث الحرفي بالضبط كما في الكود الأصلي
    for (let i = 1; i < allData.length; i++) {
        const row = allData[i];
        if (!row) continue;

        // isMatch = lookupColsIndices.some(colIdx => row[colIdx] === text)
        const isMatch = lookupColsIndices.some(colIdx => {
            if (colIdx < 0 || colIdx >= row.length) return false;
            return String(row[colIdx] || '').trim() === text;
        });

        if (isMatch) {
            // بناء الرسالة من أعمدة الرد
            let message = responseColsIndices
                .map(colIdx => {
                    if (colIdx < 0 || colIdx >= row.length) return '';
                    return String(row[colIdx] || '').trim();
                })
                .filter(val => val !== '')
                .join('\n');

            // الرابط
            const fileLink = (linkColumnIndex >= 0 && linkColumnIndex < row.length)
                ? String(row[linkColumnIndex] || '').trim()
                : '';

            const url = (fileLink && fileLink.startsWith('http'))
                ? convertToImageUrl(fileLink)
                : null;

            return { message: message || null, url };
        }
    }

    return null;
}

// ==========================================
// 6. checkCompletionStatus — بالضبط كما في الكود الأصلي
// ==========================================

function getStudentName(code) {
    return cache.names[String(code).trim()] || null;
}

function checkUserHasCompleted(level, code) {
    const levelIdx = level - 1;
    const text = String(code).trim();
    const userData = cache.user[levelIdx];
    if (!userData) return false;

    for (let i = 0; i < userData.length; i++) {
        if (String(userData[i][0] || '').trim() === text) {
            return true;
        }
    }
    return false;
}

function checkExamStatus(level, code) {
    const levelIdx = level - 1;
    const text = String(code).trim();
    const finalData = cache.final[levelIdx];

    let examNames, examCols;

    if (level === 1) {
        // المستوى الأول: 10 امتحانات في الأعمدة 0, 2, 4, 6, 8, 10, 12, 14, 16, 18
        examNames = [
            "الامتحان الأول", "الامتحان الثاني", "الامتحان الثالث",
            "الامتحان الرابع", "الامتحان الخامس", "الامتحان السادس",
            "الامتحان السابع", "الامتحان الثامن", "الامتحان التاسع",
            "الامتحان النهائي"
        ];
        examCols = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18];
    } else {
        // المستوى الثاني: 4 امتحانات في الأعمدة 0, 2, 4, 6
        examNames = [
            "الامتحان الأول", "الامتحان الثاني",
            "الامتحان الثالث", "الامتحان النهائي"
        ];
        examCols = [0, 2, 4, 6];
    }

    const examsStatus = new Array(examCols.length).fill(false);

    if (finalData) {
        for (let i = 0; i < finalData.length; i++) {
            for (let j = 0; j < examCols.length; j++) {
                if (finalData[i].length > examCols[j] &&
                    String(finalData[i][examCols[j]] || '').trim() === text) {
                    examsStatus[j] = true;
                }
            }
        }
    }

    const hasAnyExam = examsStatus.some(s => s === true);

    return { hasAnyExam, examsStatus, examNames };
}

// ==========================================
// 7. تسجيل المستخدم في natiga
// ==========================================

function registerUserInNatiga(chatId) {
    const userId = String(chatId).split('@')[0];
    if (cache.natiga.has(userId)) return;
    cache.natiga.add(userId);
    saveLocalNatiga();
}

// ==========================================
// 8. دوال مساعدة للتصدير
// ==========================================

function resultsSize(level) {
    const levelIdx = level - 1;
    if (!cache.sheetsData[levelIdx]) return 0;
    return Math.max(0, cache.sheetsData[levelIdx].length - 1);
}

// ==========================================
// تحديث تلقائي فوري (كل دقيقتين)
// ==========================================
setInterval(reloadResultsDb, 2 * 60 * 1000);
reloadResultsDb();

module.exports = {
    reloadResultsDb,
    lookupResult,
    getStudentName,
    checkExamStatus,
    checkUserHasCompleted,
    registerUserInNatiga,
    resultsSize
};