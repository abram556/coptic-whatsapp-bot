/**
 * coptocDb.js — القاموس القبطي-العربي الناطق v10.0
 * ─────────────────────────────────────────────────────────────
 * تم التحديث ليتطابق بالملي مع منطق Apps Script المقدم
 * ─────────────────────────────────────────────────────────────
 */

const axios = require('axios');

// Configuration
const SPREADSHEET_ID = "17n8MgiCIe4xVRXqM7W74zCSeqwo6pX8L-Pj2wSsl0ek";
const DICT_SHEET_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=0`;

let cachedData = [];
let indexMap = new Map(); // الفهرس السريع

// Function to normalize Arabic text (e.g., convert أ to ا, ة to ه)
function normalizeArabicText(text) {
  if (!text) return "";
  return text.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه');
}

// Function to remove Arabic diacritics
function removeArabicDiacritics(text) {
  if (!text) return "";
  return text.replace(/[\u064B-\u065F\u0670]/g, '');
}

// Function to remove Coptic diacritics (marks)
function removeCopticDiacritics(text) {
  if (!text) return "";
  return text.replace(/[\u0300-\u036f\u2018\u2019\u201C\u201D\u0483-\u0489]/g, '');
}

// بناء الفهرس لتسريع البحث
function buildIndex() {
  const newIndex = new Map();
  cachedData.forEach((row, rowIndex) => {
    const fileName = row[0];
    if (!fileName) return;

    const mainParts = fileName.split(".");
    if (mainParts.length < 4) return;

    const columnE = row[4] || "";
    const columnH = row[7] || "";
    const columnI = row[8] || "";

    // استخراج الكلمات العربية والقبطية والكلمات الإضافية
    const wordsToIndex = [
      ...mainParts[0].split("،").map(w => ({ word: w, source: 'arabic' })),
      ...mainParts[1].split(/[،,]/).map(w => ({ word: w, source: 'coptic' })),
      ...columnE.split(/[،,]/).map(w => ({ word: w, source: 'extra' })),
      ...columnH.split(/[،,]/).map(w => ({ word: w, source: 'extra' })),
      ...columnI.split(/[،,]/).map(w => ({ word: w, source: 'extra' }))
    ];

    wordsToIndex.forEach(({ word, source }) => {
      const clean = removeCopticDiacritics(normalizeArabicText(removeArabicDiacritics(word.trim().toLowerCase())));
      if (!clean) return;

      if (!newIndex.has(clean)) newIndex.set(clean, []);
      newIndex.get(clean).push({
        rowIndex,
        matchedWord: word.trim(),
        source
      });
    });
  });
  indexMap = newIndex;
  console.log(`🚀 تم بناء الفهرس: ${indexMap.size} مفتاح بحث سريع`);
}

// Helper to determine MIME type based on file extension
function determineMimeType(fileName) {
  const extension = fileName.split('.').pop().toLowerCase();
  const mimeTypes = {
    'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'gif': 'image/gif',
    'pdf': 'application/pdf', 'doc': 'application/msword', 'mp3': 'audio/mpeg', 
    'mp4': 'video/mp4', 'wav': 'audio/wav', 'txt': 'text/plain'
  };
  return mimeTypes[extension] || 'application/octet-stream';
}

// Helper to parse CSV
function parseCSV(csvText) {
  if (!csvText) return [];
  const result = [];
  let row = [];
  let cur = '', inQuotes = false;
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const next = csvText[i + 1];
    if (char === '"') {
      if (inQuotes && next === '"') { cur += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (char === ',' && !inQuotes) {
      row.push(cur); cur = '';
    } else if ((char === '\n' || (char === '\r' && next === '\n')) && !inQuotes) {
      row.push(cur); result.push(row); row = []; cur = '';
      if (char === '\r') i++;
    } else { cur += char; }
  }
  if (row.length > 0 || cur !== '') { row.push(cur); result.push(row); }
  return result;
}

// Load database from Google Sheets
async function reloadCoptocDb() {
  try {
    const res = await axios.get(DICT_SHEET_URL, { timeout: 30000 });
    if (res.data) {
      cachedData = parseCSV(res.data);
      console.log(`✅ تم تحميل القاموس بنجاح — ${cachedData.length} صف`);
      return true;
    }
  } catch (err) {
    console.error('❌ خطأ في تحميل القاموس من جوجل شيتس:', err.message);
  }
  return false;
}

// Core Logic: getFileInfo(searchTerm) (متطابق مع كود Apps Script)
function getFileInfo(searchTerm) {
  const data = cachedData;
  const matchingFiles = [];

  const normalizedSearchTerm = normalizeArabicText(removeArabicDiacritics(searchTerm.trim().toLowerCase()));
  const cleanedSearchTerm = removeCopticDiacritics(normalizedSearchTerm);

  for (let i = 0; i < data.length; i++) {
    const fileName = data[i][0]; // الصف الأول يحتوي على اسم الملف
    const fileUrl = data[i][1];  // الصف الثاني يحتوي على رابط الملف
    const columnE = data[i][4];  // العمود E
    const columnH = data[i][7];  // العمود H
    const columnI = data[i][8];  // العمود I

    if (!fileName || !fileUrl) continue; // تخطي الصفوف الفارغة

    const mainParts = fileName.split(".");
    if (mainParts.length < 4) continue; // تخطي الملفات التي ليس لها تنسيق صحيح

    const firstPartWords = mainParts[0].split("،").map(word => normalizeArabicText(removeArabicDiacritics(word.trim().toLowerCase())));
    const secondPartWords = mainParts[1].split(/[،,]/).map(word => removeCopticDiacritics(word.trim().toLowerCase()));
    
    const columnEWords = columnE ? columnE.split(/[،,]/).map(word => normalizeArabicText(removeArabicDiacritics(word.trim().toLowerCase()))) : [];
    const columnHWords = columnH ? columnH.split(/[،,]/).map(word => normalizeArabicText(removeArabicDiacritics(word.trim().toLowerCase()))) : [];
    const columnIWords = columnI ? columnI.split(/[،,]/).map(word => normalizeArabicText(removeArabicDiacritics(word.trim().toLowerCase()))) : [];

    let isMatch = false;
    let isFirstPartMatch = false;
    let matchedWord = "";
    let isColumnMatch = false;

    for (let j = 0; j < firstPartWords.length; j++) {
      if (firstPartWords[j] === cleanedSearchTerm) {
        isMatch = true;
        isFirstPartMatch = true;
        matchedWord = mainParts[0].split("،")[j].trim();
        break;
      }
    }

    if (!isMatch) {
      for (let j = 0; j < secondPartWords.length; j++) {
        if (secondPartWords[j] === cleanedSearchTerm) {
          isMatch = true;
          matchedWord = mainParts[1].split(/[،,]/)[j].trim();
          break;
        }
      }
    }

    if (!isMatch) {
      for (let j = 0; j < columnEWords.length; j++) {
        if (columnEWords[j] === cleanedSearchTerm) {
          isMatch = true; isColumnMatch = true;
          matchedWord = columnE.split(/[،,]/)[j].trim();
          break;
        }
      }
      if (!isMatch) {
        for (let j = 0; j < columnHWords.length; j++) {
          if (columnHWords[j] === cleanedSearchTerm) {
            isMatch = true; isColumnMatch = true;
            matchedWord = columnH.split(/[،,]/)[j].trim();
            break;
          }
        }
      }
      if (!isMatch) {
        for (let j = 0; j < columnIWords.length; j++) {
          if (columnIWords[j] === cleanedSearchTerm) {
            isMatch = true; isColumnMatch = true;
            matchedWord = columnI.split(/[،,]/)[j].trim();
            break;
          }
        }
      }
    }

    if (isMatch) {
      let meaning = "";
      if (isFirstPartMatch) {
        meaning = mainParts[1];
      } else {
        meaning = mainParts[0];
      }

      const original = mainParts[2] || "غير متوفر";
      const type = mainParts[3] || "غير متوفر";

      if (isColumnMatch) {
        meaning = mainParts[1];
      }

      const customFileName = `${matchedWord} - ${meaning} - ${original} - ${type}`;
      const messages = [];

      if (isColumnMatch) {
        const copticWords = mainParts[1].split(/[،,]/).map(word => word.trim()).join("، ");
        messages.push(`المعنى: ${copticWords}`);
      } else {
        messages.push(`المعنى: ${meaning}`);
      }

      messages.push(`النوع: ${type}`);
      messages.push(`الأصل: ${original}`);

      let fileId = "";
      if (fileUrl.includes("drive.google.com")) {
        const match = fileUrl.match(/[-\w]{25,}/);
        if (match) fileId = match[0];
      } else {
        fileId = fileUrl;
      }

      const mimeType = determineMimeType(fileName);

      matchingFiles.push({
        fileId: fileId,
        fileUrl: fileUrl,
        mimeType: mimeType,
        messages: messages,
        fileName: customFileName,
        originalFileName: fileName
      });
    }
  }

  if (matchingFiles.length === 0) {
    matchingFiles.push({
      messages: ["القاموس قيد التطوير حاليا وسيتم اضافة معنى هذه الكلمة لاحقا"]
    });
  }
  return matchingFiles;
}

// suggestWords (متطابق مع كود Apps Script)
function suggestWords(partialWord) {
  const data = cachedData;
  let suggestions = [];
  const normalizedPartialWord = normalizeArabicText(removeArabicDiacritics(partialWord.trim().toLowerCase()));

  for (let i = 0; i < data.length; i++) {
    const fileName = data[i][0];
    const columnE = data[i][4];
    const columnH = data[i][7];
    const columnI = data[i][8];

    if (!fileName) continue; // تخطي الصفوف الفارغة

    const mainParts = fileName.split(".");
    if (mainParts.length < 4) continue;

    const firstPartWords = mainParts[0].split("،").map(word => normalizeArabicText(removeArabicDiacritics(word.trim().toLowerCase())));
    const secondPartWords = mainParts[1].split(/[،,]/).map(word => word.trim().toLowerCase());
    const columnEWords = columnE ? columnE.split(/[،,]/).map(word => normalizeArabicText(removeArabicDiacritics(word.trim().toLowerCase()))) : [];
    const columnHWords = columnH ? columnH.split(/[،,]/).map(word => normalizeArabicText(removeArabicDiacritics(word.trim().toLowerCase()))) : [];
    const columnIWords = columnI ? columnI.split(/[،,]/).map(word => normalizeArabicText(removeArabicDiacritics(word.trim().toLowerCase()))) : [];

    for (let j = 0; j < firstPartWords.length; j++) {
      if (firstPartWords[j].startsWith(normalizedPartialWord)) {
        suggestions.push(mainParts[0].split("،")[j].trim());
      }
      if (suggestions.length >= 20) break;
    }

    if (suggestions.length >= 20) break;

    for (let j = 0; j < secondPartWords.length; j++) {
      if (secondPartWords[j].startsWith(normalizedPartialWord)) {
        suggestions.push(mainParts[1].split(/[،,]/)[j].trim());
      }
      if (suggestions.length >= 20) break;
    }

    if (suggestions.length >= 20) break;

    for (let j = 0; j < columnEWords.length; j++) {
      if (columnEWords[j].startsWith(normalizedPartialWord)) {
        suggestions.push(columnE.split(/[،,]/)[j].trim());
      }
      if (suggestions.length >= 20) break;
    }

    if (suggestions.length >= 20) break;

    for (let j = 0; j < columnHWords.length; j++) {
      if (columnHWords[j].startsWith(normalizedPartialWord)) {
        suggestions.push(columnH.split(/[،,]/)[j].trim());
      }
      if (suggestions.length >= 20) break;
    }

    if (suggestions.length >= 20) break;

    for (let j = 0; j < columnIWords.length; j++) {
      if (columnIWords[j].startsWith(normalizedPartialWord)) {
        suggestions.push(columnI.split(/[،,]/)[j].trim());
      }
      if (suggestions.length >= 20) break;
    }

    if (suggestions.length >= 20) break;
  }

  // إزالة الكلمات المكررة
  suggestions = suggestions.filter((item, index) => suggestions.indexOf(item) === index);
  return suggestions;
}

// Initial load
reloadCoptocDb();
setInterval(reloadCoptocDb, 2 * 60 * 1000); // تحديث فوري تقريباً كل دقيقتين

module.exports = {
  reloadCoptocDb,
  getFileInfo,
  suggestWords,
  normalizeArabicText,
  removeArabicDiacritics,
  removeCopticDiacritics
};