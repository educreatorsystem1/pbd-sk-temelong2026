// GLOBAL STATE & DATA STORAGE
const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT7yFYAEpzgoUqVwGj-V0bC29dJStfqJSh
Ht3jzwa2sp4T-SAJwOYWGzja-nwrHqHuWQHmPXxyqadnR/pub?gid=0&single=true&output=csv";
const PENTAKSIRAN_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT7yFYAEpzgoUqVwGj-V0bC29dJStfqJShH
t3jzwa2sp4T-SAJwOYWGzja-nwrHqHuWQHmPXxyqadnR/pub?gid=894880852&single=true&output=csv";
// GOOGLE APPS SCRIPT ENDPOINT
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw1eiUncu--2ArQz51bZb0DQvbtqU5rNsswCac1oe9ihq
0Nb1_oKROOZ0BO9mYPqXz4/exec";
const DEFAULT_ASSESSMENT_PERIODS = [
"Pentaksiran Pertengahan Sesi Akademik (PPSA)",
"Pentaksiran Akhir Sesi Akademik (PASA)",
"Pentaksiran Berterusan Mac - Mei",
"Pentaksiran Berterusan Jun - Ogos"
];
const DEFAULT_SUBJECTS = [
"BAHASA MELAYU",
"BAHASA INGGERIS",
"MATEMATIK",
"SAINS",
"PENDIDIKAN ISLAM",
"PENDIDIKAN MORAL",
"SEJARAH",
"REKABENTUK & TEKNOLOGI",
"PENDIDIKAN SENI VISUAL",
"PENDIDIKAN MUZIK",
"PENDIDIKAN JASMANI & KESIHATAN",
"BAHASA ARAB"
];
const TP_DESCRIPTIONS = {
"TP1": "Mengingat kembali pengetahuan dan kemahiran asas subjek.",
"TP2": "Memahami dan menjelaskan konsep asas serta fakta subjek.",
"TP3": "Mengaplikasikan pengetahuan dan kemahiran pada situasi biasa.",
"TP4": "Menganalisis dan melaksanakan kemahiran secara sistematik.",
"TP5": "Menilai dan mengaplikasikan pengetahuan pada situasi baharu secara tekal.",
"TP6": "Mencipta dan mengaplikasikan kemahiran secara kreatif, inovatif dan mithali.",
"TD": "Tidak Ditaksir / Belum Ditaksir"
};
let appData = {
students: [],
classes: [],
subjects: DEFAULT_SUBJECTS,
assessmentPeriods: DEFAULT_ASSESSMENT_PERIODS,
marks: {}
};
let classChartInstance = null;
let subjectChartInstance = null;
document.addEventListener('DOMContentLoaded', () => {
const dateElem = document.getElementById('currentDate');
if (dateElem) {
dateElem.innerText = new Date().toLocaleDateString('ms-MY', { weekday: 'short', day: 'numeric', month: 'short',
year: 'numeric' });
}
loadAllCsvData();
});
// TOAST SYSTEM
function showToast(message, type = 'info') {
const toast = document.getElementById('toast');
const icon = document.getElementById('toastIcon');
const msg = document.getElementById('toastMessage');
msg.innerText = message;
if (type === 'success') {
icon.className = 'fas fa-check-circle text-emerald-400 text-base';
} else if (type === 'error') {
icon.className = 'fas fa-exclamation-circle text-rose-400 text-base';
} else {
icon.className = 'fas fa-info-circle text-blue-400 text-base';
}
toast.classList.remove('translate-y-24', 'opacity-0');
setTimeout(() => {
toast.classList.add('translate-y-24', 'opacity-0');
}, 3000);
}
function switchTab(tabId) {
const tabs = ['input', 'analisis-kelas', 'senarai-tp', 'analisis-subjek', 'semakan', 'slip', 'status'];
tabs.forEach(t => {
const navBtn = document.getElementById(`nav-${t}`);
const content = document.getElementById(`tab-content-${t}`);
if (t === tabId) {
if (navBtn) navBtn.className = "py-2.5 px-4 text-xs font-bold rounded-xl focus:outline-none tab-active flex
items-center space-x-2.5 whitespace-nowrap transition-all duration-200";
if (content) content.classList.remove('hidden');
} else {
if (navBtn) navBtn.className = "py-2.5 px-4 text-xs font-bold text-slate-600 hover:text-blue-600
hover:bg-slate-50 rounded-xl focus:outline-none flex items-center space-x-2.5 whitespace-nowrap transition-all
duration-200";
if (content) content.classList.add('hidden');
}
});
if (tabId === 'status') renderStatusPengisian();
if (tabId === 'senarai-tp') renderSenaraiTpTable();
}
async function loadAllCsvData() {
const overlay = document.getElementById('loadingOverlay');
overlay.classList.remove('opacity-0', 'pointer-events-none');
try {
const fetchPentaksiran = new Promise((resolve) => {
Papa.parse(PENTAKSIRAN_CSV_URL, {
download: true,
header: false,
skipEmptyLines: true,
complete: (results) => resolve(results.data),
error: (err) => { console.warn("Gagal muat turun Pentaksiran CSV", err); resolve(null); }
});
});
const fetchStudents = new Promise((resolve) => {
Papa.parse(GOOGLE_SHEET_CSV_URL, {
download: true,
header: true,
skipEmptyLines: true,
complete: (results) => resolve(results.data),
error: (err) => { console.warn("Gagal muat turun Murid CSV", err); resolve(null); }
});
});
const fetchSavedMarks = fetch(GOOGLE_SCRIPT_URL)
.then(res => res.json())
.catch(err => { console.warn("Gagal muat turun Markah dari Google Script", err); return null; });
const [pentaksiranRows, studentRows, savedMarksRes] = await Promise.all([fetchPentaksiran, fetchStudents,
fetchSavedMarks]);
if (pentaksiranRows && pentaksiranRows.length > 0) {
const periodsList = [];
pentaksiranRows.forEach((row, index) => {
const colAVal = Array.isArray(row) ? row[0] : Object.values(row)[0];
if (colAVal && typeof colAVal === 'string' && colAVal.trim() !== '') {
const valClean = colAVal.trim();
if (index === 0 && (valClean.toUpperCase().includes('JENIS PENTAKSIRAN') || valClean.toUpperCase() ===
'PENTAKSIRAN')) {
return;
}
if (!periodsList.includes(valClean)) {
periodsList.push(valClean);
}
}
});
if (periodsList.length > 0) {
appData.assessmentPeriods = periodsList;
}
}
if (studentRows && studentRows.length > 0) {
processStudentCsvData(studentRows);
} else {
generateFallbackStudentData();
}
if (savedMarksRes && savedMarksRes.status === 'success' && Array.isArray(savedMarksRes.data)) {
savedMarksRes.data.forEach(item => {
if (item.kelas && item.pentaksiran && item.subjek && item.idMurid) {
const key = `${item.kelas}_${item.pentaksiran}_${item.subjek}_${item.idMurid}`;
appData.marks[key] = {
tp: item.tp,
ulasan: item.ulasan || ''
};
}
});
}
showToast('Data murid & Pentaksiran berjaya disegerakkan!', 'success');
} catch(error) {
console.error("Ralat memproses CSV:", error);
generateFallbackStudentData();
showToast('Data sampel SK Temelong digunakan (Mod Luar Talian)', 'info');
} finally {
overlay.classList.add('opacity-0', 'pointer-events-none');
}
}
function processStudentCsvData(rows) {
const students = [];
const classesSet = new Set();
rows.forEach((row, idx) => {
const nama = row['NAMA'] || row['Nama'] || row['Nama Murid'] || row['NAMA MURID'] || row['nama'] ||
Object.values(row)[0];
const kelas = row['KELAS'] || row['Kelas'] || row['kelas'] || Object.values(row)[1] || "1 Alfa";
if (nama && nama.trim() !== "") {
const studentClass = kelas ? kelas.trim() : "1 Alfa";
students.push({
id: `M_${idx + 1}`,
nama: nama.trim().toUpperCase(),
kelas: studentClass
});
classesSet.add(studentClass);
}
});
if (students.length === 0) {
generateFallbackStudentData();
return;
}
appData.students = students;
appData.classes = Array.from(classesSet).sort();
populateAllDropdowns();
}
function generateFallbackStudentData() {
const sampleClasses = ["1 ALFA", "2 ALFA", "3 ALFA", "4 ALFA", "5 ALFA", "6 ALFA"];
const sampleNames = [
"Ahmad Afiq bin Zulkifli", "Nur Aisyah binti Mohd Ridzuan", "Muhammad Danial bin Ismail",
"Siti Nurhaliza binti Abdullah", "Ahmad Razak bin Mustaffa", "Nurul Huda binti Osman",
"Muhammad Adam bin Syafiq", "Nur Iman binti Khairul", "Muhammad Farhan bin Amir",
"Nur Farhana binti Zamri", "Muhammad Harith bin Hassan", "Siti Aishah binti Zakaria"
];
const students = [];
let count = 1;
sampleClasses.forEach(cls => {
sampleNames.forEach(name => {
students.push({
id: `M_${count}`,
nama: `${name}`.toUpperCase(),
kelas: cls
});
count++;
});
});
appData.students = students;
appData.classes = sampleClasses;
populateAllDropdowns();
}
function populateAllDropdowns() {
const fillSelect = (elemId, options, placeholder) => {
const elem = document.getElementById(elemId);
if (!elem) return;
elem.innerHTML = `<option value="">-- ${placeholder} --</option>` +
options.map(o => `<option value="${o}">${o}</option>`).join('');
};
fillSelect('inputKelas', appData.classes, 'Sila Pilih Kelas');
fillSelect('inputPentaksiran', appData.assessmentPeriods, 'Sila Pilih Pentaksiran');
fillSelect('inputSubjek', appData.subjects.map(s => typeof s === 'string' ? s.toUpperCase() : s), 'Sila Pilih
Subjek');
fillSelect('filterKelasKelas', appData.classes, 'Pilih Kelas');
fillSelect('filterKelasPentaksiran', appData.assessmentPeriods, 'Pilih Pentaksiran');
fillSelect('filterSenaraiPentaksiran', appData.assessmentPeriods, 'Pilih Pentaksiran');
fillSelect('filterSenaraiSubjek', appData.subjects.map(s => typeof s === 'string' ? s.toUpperCase() : s), 'Pilih
Subjek');
fillSelect('filterSubjekSubjek', appData.subjects.map(s => typeof s === 'string' ? s.toUpperCase() : s), 'Pilih
Subjek');
fillSelect('filterSubjekPentaksiran', appData.assessmentPeriods, 'Pilih Pentaksiran');
fillSelect('filterAliran', ["Tahun 1", "Tahun 2", "Tahun 3", "Tahun 4", "Tahun 5", "Tahun 6"], 'Semua Aliran');
fillSelect('semakanKelas', appData.classes, 'Pilih Kelas');
fillSelect('semakanPentaksiran', appData.assessmentPeriods, 'Pilih Pentaksiran');
fillSelect('slipKelas', appData.classes, 'Pilih Kelas');
fillSelect('slipPentaksiran', appData.assessmentPeriods, 'Pilih Pentaksiran');
fillSelect('statusPentaksiran', appData.assessmentPeriods, 'Pilih Pentaksiran');
fillSelect('statusKelas', appData.classes, 'Semua Kelas');
fillSelect('statusSubjek', appData.subjects.map(s => typeof s === 'string' ? s.toUpperCase() : s), 'Semua
Subjek');
const statusSelect = document.getElementById('statusPentaksiran');
if (statusSelect && appData.assessmentPeriods.length > 0) {
statusSelect.value = appData.assessmentPeriods[0];
}
}
// ================= TAB 1: INPUT MARKAH LOGIC =================
function renderInputTable() {
const kelas = document.getElementById('inputKelas').value;
const pentaksiran = document.getElementById('inputPentaksiran').value;
const subjek = document.getElementById('inputSubjek').value;
const container = document.getElementById('inputTableContainer');
const placeholder = document.getElementById('inputPlaceholder');
const tbody = document.getElementById('inputTableBody');
if (!kelas || !pentaksiran || !subjek) {
container.classList.add('hidden');
placeholder.classList.remove('hidden');
return;
}
placeholder.classList.add('hidden');
container.classList.remove('hidden');
const students = appData.students.filter(s => s.kelas === kelas);
tbody.innerHTML = '';
if (students.length === 0) {
tbody.innerHTML = `<tr><td colspan="3" class="text-center py-8 text-slate-400 font-medium">Tiada murid ditemui
dalam kelas ini.</td></tr>`;
return;
}
students.forEach((st, idx) => {
const key = `${kelas}_${pentaksiran}_${subjek}_${st.id}`;
const existingData = appData.marks[key] || { tp: '', ulasan: '' };
const currentTp = existingData.tp || 'TD';
const currentUlasan = existingData.ulasan || '';
const tr = document.createElement('tr');
tr.className = "hover:bg-blue-50/40 border-b border-slate-100 transition";
tr.innerHTML = `
<td class="px-5 py-4 text-xs font-bold text-slate-500 text-center">${idx + 1}</td>
<td class="px-6 py-4 text-xs font-extrabold text-slate-900">
<div>${st.nama}</div>
<div class="text-[10px] text-slate-400 font-semibold mt-0.5 tracking-wider">ID: ${st.id}</div>
</td>
<td class="px-6 py-4 text-xs">
<div class="flex flex-col lg:flex-row items-center justify-center gap-3">
<div class="flex flex-wrap gap-1.5 items-center justify-center">
${['TP1', 'TP2', 'TP3', 'TP4', 'TP5', 'TP6', 'TD'].map(tpVal => {
const isChecked = currentTp === tpVal ? 'checked' : '';
let activeColorClass = "peer-checked:bg-blue-600 peer-checked:text-white peer-checked:border-blue-600";
if (tpVal === 'TP1' || tpVal === 'TP2') activeColorClass = "peer-checked:bg-rose-600 peer-checked:text-white
peer-checked:border-rose-600";
if (tpVal === 'TP3' || tpVal === 'TP4') activeColorClass = "peer-checked:bg-amber-500 peer-checked:text-white
peer-checked:border-amber-500";
if (tpVal === 'TP5' || tpVal === 'TP6') activeColorClass = "peer-checked:bg-emerald-600 peer-checked:text-white
peer-checked:border-emerald-600";
return `
<label class="cursor-pointer">
<input type="radio" name="tp_${st.id}" value="${tpVal}" ${isChecked} class="peer sr-only">
<span class="px-3 py-1.5 text-xs font-extrabold rounded-xl border border-slate-200 text-slate-600 bg-white
hover:bg-slate-100 ${activeColorClass} shadow-sm transition inline-block">
${tpVal}
</span>
</label>
`;
}).join('')}
</div>
<input type="text" id="ulasan_${st.id}" value="${currentUlasan}" placeholder="Ulasan guru subjek..."
class="w-full lg:w-64 px-3.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2
focus:ring-blue-500 focus:outline-none font-medium">
</div>
</td>
`;
tbody.appendChild(tr);
});
}
async function saveInputData() {
const kelas = document.getElementById('inputKelas').value;
const pentaksiran = document.getElementById('inputPentaksiran').value;
const subjek = document.getElementById('inputSubjek').value;
if (!kelas || !pentaksiran || !subjek) {
showToast('Sila pilih Kelas, Pentaksiran dan Subjek terlebih dahulu.', 'error');
return;
}
const students = appData.students.filter(s => s.kelas === kelas);
const payload = [];
const tarikh = new Date().toISOString().split('T')[0];
students.forEach(st => {
const selectedRadio = document.querySelector(`input[name="tp_${st.id}"]:checked`);
const tpVal = selectedRadio ? selectedRadio.value : 'TD';
const ulasanVal = (document.getElementById(`ulasan_${st.id}`)?.value || '').trim();
const key = `${kelas}_${pentaksiran}_${subjek}_${st.id}`;
appData.marks[key] = { tp: tpVal, ulasan: ulasanVal };
payload.push({
idMurid: st.id,
kelas: kelas,
namaMurid: st.nama,
subjek: subjek,
pentaksiran: pentaksiran,
tp: tpVal,
ulasan: ulasanVal,
tarikh: tarikh
});
});
showToast('Sedang menyimpan markah ke pelayan...', 'info');
try {
await fetch(GOOGLE_SCRIPT_URL, {
method: 'POST',
mode: 'no-cors',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify(payload)
});
showToast('Markah PBD berjaya disimpan & dikemaskini!', 'success');
} catch (err) {
console.error("Ralat menyimpan markah:", err);
showToast('Data disimpan secara tempatan (Gagal ke Google Sheet)', 'info');
}
}
function clearInputData() {
const kelas = document.getElementById('inputKelas').value;
const pentaksiran = document.getElementById('inputPentaksiran').value;
const subjek = document.getElementById('inputSubjek').value;
if (!kelas || !pentaksiran || !subjek) return;
const students = appData.students.filter(s => s.kelas === kelas);
students.forEach(st => {
const key = `${kelas}_${pentaksiran}_${subjek}_${st.id}`;
delete appData.marks[key];
});
renderInputTable();
showToast('Pilihan subjek telah dikosongkan.', 'info');
}
// ================= TAB 2: ANALISIS KELAS LOGIC =================
function updateAnalisisKelas() {
const kelas = document.getElementById('filterKelasKelas').value;
const pentaksiran = document.getElementById('filterKelasPentaksiran').value;
const resultContainer = document.getElementById('analisisKelasResult');
const placeholder = document.getElementById('analisisKelasPlaceholder');
const tbody = document.getElementById('analisisKelasTableBody');
if (!kelas || !pentaksiran) {
resultContainer.classList.add('hidden');
placeholder.classList.remove('hidden');
return;
}
placeholder.classList.add('hidden');
resultContainer.classList.remove('hidden');
const students = appData.students.filter(s => s.kelas === kelas);
tbody.innerHTML = '';
const chartLabels = [];
const chartTPData = { TP1: [], TP2: [], TP3: [], TP4: [], TP5: [], TP6: [] };
appData.subjects.forEach((sub, idx) => {
let counts = { TD: 0, TP1: 0, TP2: 0, TP3: 0, TP4: 0, TP5: 0, TP6: 0 };
students.forEach(st => {
const key = `${kelas}_${pentaksiran}_${sub}_${st.id}`;
const rec = appData.marks[key];
const tp = (rec && rec.tp) ? rec.tp : 'TD';
if (counts[tp] !== undefined) counts[tp]++;
else counts['TD']++;
});
chartLabels.push(sub.length > 15 ? sub.substring(0, 12) + '...' : sub);
chartTPData.TP1.push(counts.TP1);
chartTPData.TP2.push(counts.TP2);
chartTPData.TP3.push(counts.TP3);
chartTPData.TP4.push(counts.TP4);
chartTPData.TP5.push(counts.TP5);
chartTPData.TP6.push(counts.TP6);
const tr = document.createElement('tr');
tr.className = "hover:bg-slate-50 text-center border-b border-slate-100 transition";
tr.innerHTML = `
<td class="px-4 py-3.5 text-slate-500 font-bold">${idx + 1}</td>
<td class="px-5 py-3.5 text-left font-extrabold text-slate-800">${sub}</td>
<td class="px-3 py-3.5 text-slate-400 font-bold">${counts.TD}</td>
<td class="px-3 py-3.5 text-rose-600 font-black bg-rose-50/50">${counts.TP1}</td>
<td class="px-3 py-3.5 text-orange-600 font-black bg-orange-50/50">${counts.TP2}</td>
<td class="px-3 py-3.5 text-amber-600 font-bold">${counts.TP3}</td>
<td class="px-3 py-3.5 text-lime-700 font-bold">${counts.TP4}</td>
<td class="px-3 py-3.5 text-emerald-700 font-bold">${counts.TP5}</td>
<td class="px-3 py-3.5 text-teal-700 font-black bg-teal-50/50">${counts.TP6}</td>
<td class="px-4 py-3.5 font-black text-slate-900 bg-slate-50">${students.length}</td>
`;
tbody.appendChild(tr);
});
renderClassChart(chartLabels, chartTPData);
}
function renderClassChart(labels, tpData) {
const ctx = document.getElementById('classStreamChart').getContext('2d');
if (classChartInstance) classChartInstance.destroy();
classChartInstance = new Chart(ctx, {
type: 'bar',
data: {
labels: labels,
datasets: [
{ label: 'TP 1', data: tpData.TP1, backgroundColor: '#f87171' },
{ label: 'TP 2', data: tpData.TP2, backgroundColor: '#fb923c' },
{ label: 'TP 3', data: tpData.TP3, backgroundColor: '#facc15' },
{ label: 'TP 4', data: tpData.TP4, backgroundColor: '#a3e635' },
{ label: 'TP 5', data: tpData.TP5, backgroundColor: '#34d399' },
{ label: 'TP 6', data: tpData.TP6, backgroundColor: '#0d9488' }
]
},
options: {
responsive: true,
maintainAspectRatio: false,
scales: {
x: { stacked: true },
y: { stacked: true, beginAtZero: true }
},
plugins: {
legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11, weight: 'bold' } } }
}
}
});
}
// ================= TAB 3: SEMAKAN TP (SENARAI NAMA MENGIKUT TP) LOGIC =================
function renderSenaraiTpTable() {
const aliran = document.getElementById('filterSenaraiAliran').value;
const pentaksiran = document.getElementById('filterSenaraiPentaksiran').value;
const subjek = document.getElementById('filterSenaraiSubjek').value;
const filterTp = document.getElementById('filterSenaraiTP').value;
const container = document.getElementById('senaraiTpResult');
const placeholder = document.getElementById('senaraiTpPlaceholder');
const tbody = document.getElementById('senaraiTpTableBody');
const summaryText = document.getElementById('senaraiTpSummaryText');
const totalBadge = document.getElementById('senaraiTpTotalBadge');
if (!pentaksiran || !subjek) {
container.classList.add('hidden');
placeholder.classList.remove('hidden');
return;
}
placeholder.classList.add('hidden');
container.classList.remove('hidden');
let filteredStudents = appData.students;
if (aliran) {
const yearDigit = aliran.replace(/[^0-9]/g, '');
if (yearDigit) {
filteredStudents = filteredStudents.filter(s => s.kelas.includes(yearDigit));
}
}
const matchedList = [];
filteredStudents.forEach(st => {
const key = `${st.kelas}_${pentaksiran}_${subjek}_${st.id}`;
const rec = appData.marks[key] || {};
const studentTp = rec.tp || 'TD';
const ulasan = rec.ulasan || '-';
if (!filterTp || filterTp === studentTp) {
matchedList.push({
id: st.id,
nama: st.nama,
kelas: st.kelas,
subjek: subjek,
pentaksiran: pentaksiran,
tp: studentTp,
ulasan: ulasan
});
}
});
summaryText.innerHTML = `
${aliran ? `<span class="bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-bold">${aliran}</span>` : 'Semua
Aliran'} |
<span class="text-indigo-900 font-extrabold">${pentaksiran}</span> |
<span class="text-blue-900 font-extrabold">${subjek}</span> |
${filterTp ? `<span class="bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-black">${filterTp}</span>` :
'Semua TP (TP1 - TP6)'}
`;
totalBadge.innerText = matchedList.length;
tbody.innerHTML = '';
if (matchedList.length === 0) {
tbody.innerHTML = `
<tr>
<td colspan="7" class="px-4 py-12 text-center text-slate-400 font-medium">
<i class="fas fa-folder-open text-3xl mb-2 block text-slate-300"></i>
Tiada rekod murid ditemui untuk gabungan kriteria tapisan ini.
</td>
</tr>
`;
return;
}
matchedList.forEach((item, idx) => {
let bgClass = "bg-slate-100 text-slate-600 font-semibold";
if (item.tp === 'TP1' || item.tp === 'TP2') bgClass = "bg-rose-100 text-rose-700 font-extrabold border
border-rose-200";
if (item.tp === 'TP3' || item.tp === 'TP4') bgClass = "bg-amber-100 text-amber-800 font-extrabold border
border-amber-200";
if (item.tp === 'TP5' || item.tp === 'TP6') bgClass = "bg-emerald-100 text-emerald-800 font-black border
border-emerald-200";
const tafsiran = TP_DESCRIPTIONS[item.tp] || TP_DESCRIPTIONS['TD'];
const tr = document.createElement('tr');
tr.className = "hover:bg-slate-50 transition border-b border-slate-100";
tr.innerHTML = `
<td class="px-4 py-3.5 text-center font-bold text-slate-500">${idx + 1}</td>
<td class="px-5 py-3.5 font-extrabold text-slate-900">${item.nama}</td>
<td class="px-4 py-3.5 text-center font-bold text-slate-700">${item.kelas}</td>
<td class="px-5 py-3.5 text-slate-700 font-semibold">${item.subjek}</td>
<td class="px-4 py-3.5 text-center">
<span class="inline-block px-3 py-1 rounded-xl text-xs ${bgClass} shadow-sm">${item.tp}</span>
</td>
<td class="px-5 py-3.5 text-slate-600 leading-relaxed text-[11px] font-medium">${tafsiran}</td>
<td class="px-5 py-3.5 text-slate-600 italic text-[11px]">${item.ulasan}</td>
`;
tbody.appendChild(tr);
});
}
// ================= TAB 4: ANALISIS SUBJEK LOGIC =================
function updateAnalisisSubjek() {
const subjek = document.getElementById('filterSubjekSubjek').value;
const pentaksiran = document.getElementById('filterSubjekPentaksiran').value;
const aliranFilter = document.getElementById('filterAliran').value;
const resultContainer = document.getElementById('analisisSubjekResult');
const placeholder = document.getElementById('analisisSubjekPlaceholder');
const tbody = document.getElementById('analisisSubjekTableBody');
if (!subjek || !pentaksiran) {
resultContainer.classList.add('hidden');
placeholder.classList.remove('hidden');
return;
}
placeholder.classList.add('hidden');
resultContainer.classList.remove('hidden');
let targetClasses = appData.classes;
if (aliranFilter) {
const yearDigit = aliranFilter.replace(/[^0-9]/g, '');
if (yearDigit) {
targetClasses = targetClasses.filter(c => c.includes(yearDigit));
}
}
tbody.innerHTML = '';
const chartLabels = [];
const chartTPData = { TP1: [], TP2: [], TP3: [], TP4: [], TP5: [], TP6: [] };
targetClasses.forEach((cls, idx) => {
const students = appData.students.filter(s => s.kelas === cls);
let counts = { TD: 0, TP1: 0, TP2: 0, TP3: 0, TP4: 0, TP5: 0, TP6: 0 };
students.forEach(st => {
const key = `${cls}_${pentaksiran}_${subjek}_${st.id}`;
const rec = appData.marks[key];
const tp = (rec && rec.tp) ? rec.tp : 'TD';
if (counts[tp] !== undefined) counts[tp]++;
else counts['TD']++;
});
chartLabels.push(cls);
chartTPData.TP1.push(counts.TP1);
chartTPData.TP2.push(counts.TP2);
chartTPData.TP3.push(counts.TP3);
chartTPData.TP4.push(counts.TP4);
chartTPData.TP5.push(counts.TP5);
chartTPData.TP6.push(counts.TP6);
const tr = document.createElement('tr');
tr.className = "hover:bg-slate-50 text-center border-b border-slate-100 transition";
tr.innerHTML = `
<td class="px-4 py-3.5 text-slate-500 font-bold">${idx + 1}</td>
<td class="px-5 py-3.5 text-left font-extrabold text-slate-800">${cls}</td>
<td class="px-3 py-3.5 text-slate-400 font-bold">${counts.TD}</td>
<td class="px-3 py-3.5 text-rose-600 font-black bg-rose-50/50">${counts.TP1}</td>
<td class="px-3 py-3.5 text-orange-600 font-black bg-orange-50/50">${counts.TP2}</td>
<td class="px-3 py-3.5 text-amber-600 font-bold">${counts.TP3}</td>
<td class="px-3 py-3.5 text-lime-700 font-bold">${counts.TP4}</td>
<td class="px-3 py-3.5 text-emerald-700 font-bold">${counts.TP5}</td>
<td class="px-3 py-3.5 text-teal-700 font-black bg-teal-50/50">${counts.TP6}</td>
<td class="px-4 py-3.5 font-black text-slate-900 bg-slate-50">${students.length}</td>
`;
tbody.appendChild(tr);
});
renderSubjectChart(chartLabels, chartTPData);
}
function renderSubjectChart(labels, tpData) {
const ctx = document.getElementById('subjectStreamChart').getContext('2d');
if (subjectChartInstance) subjectChartInstance.destroy();
subjectChartInstance = new Chart(ctx, {
type: 'bar',
data: {
labels: labels,
datasets: [
{ label: 'TP 1', data: tpData.TP1, backgroundColor: '#f87171' },
{ label: 'TP 2', data: tpData.TP2, backgroundColor: '#fb923c' },
{ label: 'TP 3', data: tpData.TP3, backgroundColor: '#facc15' },
{ label: 'TP 4', data: tpData.TP4, backgroundColor: '#a3e635' },
{ label: 'TP 5', data: tpData.TP5, backgroundColor: '#34d399' },
{ label: 'TP 6', data: tpData.TP6, backgroundColor: '#0d9488' }
]
},
options: {
responsive: true,
maintainAspectRatio: false,
scales: {
x: { beginAtZero: true },
y: { beginAtZero: true }
},
plugins: {
legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11, weight: 'bold' } } }
}
}
});
}
// ================= TAB 5: SEMAKAN TP MATRIKS =================
function renderSemakanTable() {
const kelas = document.getElementById('semakanKelas').value;
const pentaksiran = document.getElementById('semakanPentaksiran').value;
const container = document.getElementById('semakanTableContainer');
const placeholder = document.getElementById('semakanPlaceholder');
const thead = document.getElementById('semakanTableHead');
const tbody = document.getElementById('semakanTableBody');
if (!kelas || !pentaksiran) {
container.classList.add('hidden');
placeholder.classList.remove('hidden');
return;
}
placeholder.classList.add('hidden');
container.classList.remove('hidden');
const classStudents = appData.students.filter(s => s.kelas === kelas);
thead.innerHTML = `
<tr>
<th class="px-4 py-3.5 text-center w-12">Bil</th>
<th class="px-5 py-3.5 text-left w-56">Nama Murid</th>
${appData.subjects.map(s => `<th class="px-2 py-3.5 text-center whitespace-nowrap">${s.length > 12 ?
s.substring(0,10)+'...' : s}</th>`).join('')}
</tr>
`;
tbody.innerHTML = '';
classStudents.forEach((student, idx) => {
const tr = document.createElement('tr');
tr.className = "hover:bg-slate-50 transition border-b border-slate-100";
let subjectsTdHtml = appData.subjects.map(sub => {
const key = `${kelas}_${pentaksiran}_${sub}_${student.id}`;
const rec = appData.marks[key];
const tp = (rec && rec.tp) ? rec.tp : 'TD';
let bgClass = "bg-slate-100 text-slate-500 font-semibold";
if (tp === 'TP1' || tp === 'TP2') bgClass = "bg-rose-100 text-rose-700 font-extrabold";
if (tp === 'TP3' || tp === 'TP4') bgClass = "bg-amber-100 text-amber-800 font-extrabold";
if (tp === 'TP5' || tp === 'TP6') bgClass = "bg-emerald-100 text-emerald-800 font-black";
return `<td class="px-2 py-3 text-center">
<span class="inline-block px-2.5 py-1 rounded-lg text-[11px] ${bgClass} shadow-sm">${tp}</span>
</td>`;
}).join('');
tr.innerHTML = `
<td class="px-4 py-3 text-center font-bold text-slate-500">${idx + 1}</td>
<td class="px-5 py-3 font-extrabold text-slate-900 text-xs whitespace-nowrap">${student.nama}</td>
${subjectsTdHtml}
`;
tbody.appendChild(tr);
});
}
// ================= TAB 6: JANA SLIP INDIVIDU =================
function populateSlipMuridDropdown() {
const kelas = document.getElementById('slipKelas').value;
const slipMuridSelect = document.getElementById('slipMurid');
slipMuridSelect.innerHTML = '<option value="">-- Pilih Murid --</option>';
if (!kelas) return;
const students = appData.students.filter(s => s.kelas === kelas);
students.forEach(st => {
const opt = document.createElement('option');
opt.value = st.id;
opt.textContent = st.nama;
slipMuridSelect.appendChild(opt);
});
}
function renderSlipIndividu() {
const kelas = document.getElementById('slipKelas').value;
const pentaksiran = document.getElementById('slipPentaksiran').value;
const studentId = document.getElementById('slipMurid').value;
const previewContainer = document.getElementById('slipPreviewContainer');
const placeholder = document.getElementById('slipPlaceholder');
if (!kelas || !pentaksiran || !studentId) {
previewContainer.classList.add('hidden');
placeholder.classList.remove('hidden');
return;
}
placeholder.classList.add('hidden');
previewContainer.classList.remove('hidden');
const student = appData.students.find(s => s.id === studentId);
document.getElementById('slipNamaVal').innerText = student ? student.nama : '';
document.getElementById('slipKelasVal').innerText = kelas;
document.getElementById('slipPentaksiranVal').innerText = pentaksiran;
document.getElementById('slipTarikhVal').innerText = new Date().toLocaleDateString('ms-MY');
const tbody = document.getElementById('slipTableBody');
tbody.innerHTML = '';
let overallUlasanList = [];
appData.subjects.forEach((sub, idx) => {
const key = `${kelas}_${pentaksiran}_${sub}_${studentId}`;
const rec = appData.marks[key] || { tp: 'TD', ulasan: '' };
const currentTp = rec.tp || 'TD';
const tafsiran = TP_DESCRIPTIONS[currentTp] || TP_DESCRIPTIONS['TD'];
if (rec.ulasan) overallUlasanList.push(`${sub}: ${rec.ulasan}`);
let bgClass = "bg-slate-100 text-slate-600";
if (currentTp === 'TP1' || currentTp === 'TP2') bgClass = "bg-rose-100 text-rose-700 font-bold";
if (currentTp === 'TP3' || currentTp === 'TP4') bgClass = "bg-amber-100 text-amber-800 font-bold";
if (currentTp === 'TP5' || currentTp === 'TP6') bgClass = "bg-emerald-100 text-emerald-800 font-extrabold";
const tr = document.createElement('tr');
tr.className = "border-b border-slate-300";
tr.innerHTML = `
<td class="px-3 py-2.5 text-center font-bold text-slate-600 border-r border-slate-300">${idx + 1}</td>
<td class="px-4 py-2.5 font-bold text-slate-900 border-r border-slate-300">${sub}</td>
<td class="px-3 py-2.5 text-center border-r border-slate-300">
<span class="inline-block px-2.5 py-0.5 rounded text-xs ${bgClass}">${currentTp}</span>
</td>
<td class="px-4 py-2.5 text-slate-700 leading-tight border-r border-slate-300 font-medium">${tafsiran}</td>
<td class="px-4 py-2.5 text-slate-700 italic font-medium">${rec.ulasan || '-'}</td>
`;
tbody.appendChild(tr);
});
const ulasanBox = document.getElementById('slipUlasanKelasVal');
if (ulasanBox) {
ulasanBox.innerText = overallUlasanList.length > 0
? overallUlasanList.join(' | ')
: "Murid menunjukkan komitmen, sahsiah, dan usaha yang berterusan dalam sesi pembelajaran.";
}
}
// PRINT UTILITY FUNCTION
function printReport(elementId) {
let targetEl;
if (elementId) {
targetEl = document.getElementById(elementId);
} else {
targetEl = document.querySelector('.print-content:not(.hidden)');
}
if (!targetEl || targetEl.classList.contains('hidden')) {
showToast('Sila lengkapkan tapisan dan paparkan data terlebih dahulu sebelum mencetak.', 'error');
return;
}
let printElement = targetEl.classList.contains('print-content')
? targetEl
: targetEl.querySelector('.print-content');
if (!printElement) {
printElement = targetEl;
}
const printWindow = window.open('', '_blank');
if (!printWindow) {
showToast('Tetingkap popup telah disekat pelayar. Sila benarkan popup untuk mencetak.', 'error');
return;
}
const contentHtml = printElement.innerHTML;
printWindow.document.write(`
<!DOCTYPE html>
<html lang="ms">
<head>
<meta charset="UTF-8">
<title>Cetak Laporan PBD - SK Temelong</title>
<script src="https://cdn.tailwindcss.com"><\/script>
<link
href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"
rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<style>
body {
font-family: 'Plus Jakarta Sans', sans-serif;
background-color: #ffffff;
color: #0f172a;
margin: 0;
padding: 0;
display: flex;
justify-content: center;
}
.a4-page {
width: 210mm;
min-height: 297mm;
padding: 12mm;
margin: 0 auto;
box-sizing: border-box;
background: #ffffff;
display: flex;
flex-direction: column;
justify-content: space-between;
}
@media print {
@page {
size: A4 portrait;
margin: 0;
}
body {
margin: 0;
padding: 0;
background: white;
-webkit-print-color-adjust: exact;
print-color-adjust: exact;
}
.a4-page {
width: 210mm;
min-height: 297mm;
box-shadow: none !important;
border: none !important;
padding: 12mm;
}
.no-print {
display: none !important;
}
}
</style>
</head>
<body>
<div class="a4-page print-content">
${contentHtml}
</div>
</body>
</html>
`);
printWindow.document.close();
printWindow.print();
}
// ================= TAB 7: STATUS PENGISIAN LOGIC =================
function renderStatusPengisian() {
const pentaksiran = document.getElementById('statusPentaksiran').value || appData.assessmentPeriods[0];
const filterKelas = document.getElementById('statusKelas').value;
const filterSubjek = document.getElementById('statusSubjek').value;
const container = document.getElementById('statusGridContainer');
container.innerHTML = '';
const targetClasses = filterKelas ? appData.classes.filter(c => c === filterKelas) : appData.classes;
const targetSubjects = filterSubjek ? appData.subjects.filter(s => s.toUpperCase() ===
filterSubjek.toUpperCase()) : appData.subjects;
if (targetClasses.length === 0) {
container.innerHTML = `<div class="col-span-full text-center py-8 text-slate-500 text-sm font-medium">Tiada
kelas ditemui.</div>`;
return;
}
targetClasses.forEach(cls => {
const classStudents = appData.students.filter(s => s.kelas === cls);
const totalEntriesNeeded = classStudents.length * targetSubjects.length;
let filledCount = 0;
const subjectBreakdown = [];
targetSubjects.forEach(sub => {
let subFilled = 0;
classStudents.forEach(st => {
const key = `${cls}_${pentaksiran}_${sub}_${st.id}`;
if (appData.marks[key] && appData.marks[key].tp && appData.marks[key].tp !== 'TD') {
subFilled++;
}
});
filledCount += subFilled;
const subPct = classStudents.length > 0 ? Math.round((subFilled / classStudents.length) * 100) : 0;
subjectBreakdown.push({
subject: sub,
filled: subFilled,
total: classStudents.length,
pct: subPct
});
});
const percentage = totalEntriesNeeded > 0 ? Math.round((filledCount / totalEntriesNeeded) * 100) : 0;
const card = document.createElement('div');
card.className = "bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col
justify-between hover:shadow-md transition";
let breakdownHtml = '';
if (filterSubjek) {
breakdownHtml = `
<div class="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1">
<p class="font-extrabold text-slate-800 uppercase">${filterSubjek}</p>
<p class="text-slate-600 font-semibold">${filledCount} / ${classStudents.length} Murid Ditaksir
(${percentage}%)</p>
</div>
`;
} else if (filterKelas || targetClasses.length <= 2) {
breakdownHtml = `
<div class="mt-2 pt-3 border-t border-slate-200 space-y-2 max-h-56 overflow-y-auto hide-scrollbar">
<p class="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-2">Pecahan Subjek:</p>
${subjectBreakdown.map(sb => `
<div class="flex items-center justify-between text-xs bg-slate-50/80 p-2 rounded-xl border border-slate-100">
<span class="font-bold text-slate-800 truncate mr-2 w-1/2">${sb.subject}</span>
<div class="flex items-center space-x-2">
<span class="text-slate-500 font-semibold text-[11px]">${sb.filled}/${sb.total}</span>
<span class="px-2 py-0.5 rounded-md text-[10px] font-black ${sb.pct === 100 ? 'bg-emerald-100 text-emerald-800'
: (sb.pct > 50 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800')}">${sb.pct}%</span>
</div>
</div>
`).join('')}
</div>
`;
}
card.innerHTML = `
<div>
<div class="flex items-center justify-between mb-2">
<h3 class="text-base font-black text-slate-900">${cls}</h3>
<span class="px-3 py-1 text-xs font-black rounded-full ${percentage === 100 ? 'bg-emerald-100 text-emerald-800'
: (percentage > 50 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800')}">
${percentage === 100 ? 'Lengkap 100%' : `${percentage}% Selesai`}
</span>
</div>
<div class="w-full bg-slate-100 rounded-full h-3 overflow-hidden mb-2.5 p-0.5 border border-slate-200">
<div class="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-500"
style="width: ${percentage}%"></div>
</div>
<div class="flex justify-between text-xs font-bold text-slate-500 pt-0.5">
<span>Murid: ${classStudents.length}</span>
<span>Status: ${filledCount}/${totalEntriesNeeded}</span>
</div>
</div>
${breakdownHtml}
`;
container.appendChild(card);
});
}
