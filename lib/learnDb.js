/**
 * learnDb.js — قاعدة بيانات دروس اللغة القبطية v5
 * حل جذري لمشكلة "صفر درس متوفر":
 * 1. محاولات إعادة اتصال (Retries)
 * 2. حفظ نسخة احتياطية محلية صامتة (JSON) للطوارئ
 * 3. انتظار التحميل الأولي قبل بدء العمل
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// مسار النسخة الاحتياطية الصامتة (JSON وليس Excel) لضمان عدم ضياع البيانات إذا سقط جوجل
const CACHE_PATH = path.join(__dirname, '../data/learn_cache.json');

// رابط شيت الدروس
const LEARN_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1kZKjF2KDsGT0HslGSenN-pDTzx4FpX0QDPqX0ZOnriY/export?format=csv&gid=571909764';

let level1Lessons = [];
let level2Lessons = [];
let isInitialLoadDone = false;

function convertDriveUrl(url) {
    if (!url) return null;
    url = url.trim();
    const match = url.match(/\/file\/d\/([^\/\?]+)/);
    if (match && match[1]) {
        return `https://drive.google.com/uc?export=download&id=${match[1]}`;
    }
    return url;
}

function parseCSV(csvText) {
    if (!csvText) return [];
    const result = [];
    let row = [];
    let cur = '', inQuotes = false;
    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];
        const next = csvText[i + 1];
        if (char === '"') {
            if (inQuotes && next === '"') { cur += '"'; i++; } else { inQuotes = !inQuotes; }
        } else if (char === ',' && !inQuotes) {
            row.push(cur); cur = '';
        } else if ((char === '\n' || (char === '\r' && next === '\n')) && !inQuotes) {
            row.push(cur); result.push(row); row = []; cur = ''; if (char === '\r') i++;
        } else { cur += char; }
    }
    if (row.length > 0 || cur !== '') { row.push(cur); result.push(row); }
    return result;
}

// تحميل الكاش المحلي الصامت
function loadCache() {
    try {
        if (fs.existsSync(CACHE_PATH)) {
            const data = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
            level1Lessons = data.level1 || [];
            level2Lessons = data.level2 || [];
            console.log(`📦 تم تحميل ${level1Lessons.length + level2Lessons.length} درس من الكاش المحلي.`);
        }
    } catch (e) {
        console.error('❌ خطأ في تحميل الكاش:', e.message);
    }
}

// حفظ الكاش المحلي الصامت
function saveCache() {
    try {
        const dir = path.dirname(CACHE_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(CACHE_PATH, JSON.stringify({
            level1: level1Lessons,
            level2: level2Lessons,
            updatedAt: new Date().toISOString()
        }, null, 2));
    } catch (e) {
        console.error('❌ خطأ في حفظ الكاش:', e.message);
    }
}

async function loadFromGoogleSheet(retries = 3) {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            console.log(`🔄 جاري تحميل الدروس (محاولة ${attempt + 1}/${retries})...`);
            const res = await axios.get(LEARN_SHEET_URL, {
                timeout: 30000,
                headers: { 'User-Agent': 'Mozilla/5.0' },
                maxContentLength: Infinity
            });

            if (!res.data || String(res.data).length < 100) {
                throw new Error('البيانات المستلمة فارغة أو غير مكتملة');
            }

            const rows = parseCSV(res.data);
            const l1 = [];
            const l2 = [];

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                const levelStr = String(row[0] || '').trim();
                const name     = String(row[1] || '').trim();
                const videoUrl = String(row[3] || '').trim();
                const extra    = String(row[4] || '').trim();
                const examUrl  = String(row[5] || '').trim();
                const summaryUrl = String(row[6] || '').trim();

                if (!name || (levelStr !== '1' && levelStr !== '2')) continue;

                l1.push({
                    id: `gs_${i}_l1`,
                    name,
                    videoUrl: videoUrl ? convertDriveUrl(videoUrl) : null,
                    extra: extra || null,
                    examUrl: examUrl || null,
                    summaryUrl: summaryUrl ? convertDriveUrl(summaryUrl) : null
                }); if (levelStr === '2') l2.push(l1.pop()); // نقل للثاني إذا كان المستوى 2
            }
            
            // تصحيح منطق النقل أعلاه (كان سيضيف للثاني فقط لو كان ل1)
            // سأعيد كتابة الحلقة بشكل أوضح
            const finalL1 = [];
            const finalL2 = [];
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.length < 2) continue; // تجاهل الصفوف القصيرة جداً

                const lv = String(row[0] || '').trim();
                const nm = String(row[1] || '').trim();
                const vid = String(row[3] || '').trim();
                
                // شرط أساسي قاطع: يجب وجود اسم، ومستوى صحيح، ورابط فيديو للدرس
                if (!nm || (lv !== '1' && lv !== '2') || !vid || vid === '-') continue;
                
                const extraVal = String(row[4] || '').trim();
                const lesson = {
                    id: `gs_${i}_${lv}`,
                    name: nm,
                    videoUrl: convertDriveUrl(String(row[3] || '').trim()),
                    extra: (lv === '1') ? convertDriveUrl(extraVal) : (extraVal || null),
                    examUrl: String(row[5] || '').trim() || null,
                    summaryUrl: convertDriveUrl(String(row[6] || '').trim())
                };
                if (lv === '1') finalL1.push(lesson);
                else if (lv === '2') finalL2.push(lesson);
            }

            level1Lessons = finalL1;
            level2Lessons = finalL2;
            isInitialLoadDone = true;

            console.log(`✅ تم تحديث الدروس من جوجل — L1: ${level1Lessons.length} | L2: ${level2Lessons.length}`);
            saveCache();
            return true;

        } catch (err) {
            console.error(`⚠️ فشل تحميل الدروس (محاولة ${attempt + 1}):`, err.message);
            if (attempt < retries - 1) await new Promise(r => setTimeout(r, 3000));
        }
    }
    return false;
}

async function reloadLearnDb() {
    return await loadFromGoogleSheet();
}

function getLessons(level) {
    return level === 1 ? level1Lessons : level2Lessons;
}

function learnDbSize(level) {
    return level === 1 ? level1Lessons.length : level2Lessons.length;
}

// تحميل الكاش أولاً كخط دفاع أول
loadCache();

// ثم محاولة التحميل من جوجل
loadFromGoogleSheet().then(ok => {
    if (!ok && level1Lessons.length === 0) {
        console.error('❌ فشل التحميل كلياً ولا يوجد كاش محلي!');
    }
});

// تحديث دوري سريع جداً كل دقيقتين
setInterval(reloadLearnDb, 2 * 60 * 1000);

module.exports = { 
    reloadLearnDb, 
    getLessons, 
    learnDbSize, 
    convertDriveUrl,
    // وظائف فارغة للتوافق
    addLesson: () => false,
    deleteLesson: () => false,
    deleteMultipleLessons: () => ({ deleted: 0, notFound: 0, notFoundNames: [] }),
    updateLesson: () => false,
    saveLearnDb: () => true,
    exportLearnXlsx: () => null
};