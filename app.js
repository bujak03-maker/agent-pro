// app.js - Główna logika biznesowa Agent 1.0 Pro (Wersja 3.0 - CZĘŚĆ 1 z 2)

// ================= 1. ZMIENNE GLOBALNE =================
let clientsList = [];
let policiesList = [];
let vehiclesList = [];
let propertiesList = [];
let externalPoliciesList = [];
let offersList = [];
let tasksList = [];
let quickNotesText = "";
let monthlyGoalAmount = 10000;

let commDictList = [
    { id: 1, insurer: "PZU", risk: "OC", pct: 10 }, 
    { id: 2, insurer: "PZU", risk: "AC", pct: 12 }
];
let insurersLibrary = [
    "Allianz", "Balcia", "Benefia", "Compensa", "Ergo Hestia", "Generali", 
    "HDI", "InterRisk", "Link4", "MTU", "Proama", "PZU", "TUZ", "Uniqa", "Warta", "Wiener"
];
let customBrandsList = [
    "Audi", "BMW", "Citroen", "Cupra", "Dacia", "Fiat", "Ford", "Honda", 
    "Hyundai", "Kia", "Lexus", "Mazda", "Mercedes-Benz", "Mini", "Mitsubishi", 
    "Nissan", "Opel", "Peugeot", "Renault", "Seat", "Skoda", "Suzuki", "Tesla", "Toyota", "Volkswagen", "Volvo"
];

let currentOpenId = null;
let currentOpenPolicyId = null;
let editingPolicyId = null;
let editingVehicleId = null;
let editingPropertyId = null;
let tempPolicyRisks = [];
let isManualCommission = false;
let selectedClientIdForPolicy = null;
let editingOfferId = null;
let tempOfferRows = [];
let currentPolicyStep = 1;
let currentCalendarDate = new Date();
let selectedCalendarDay = null;

document.addEventListener('DOMContentLoaded', () => {
    let today = new Date();
    let fMonthFilter = document.getElementById('financeMonthFilter');
    if (fMonthFilter) {
        fMonthFilter.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    }
    renderBrandsDatalist();
});

// ================= 2. SYNCHRONIZACJA Z CHMURĄ FIREBASE =================
window.loadDataFromFirebase = async function() {
    try {
        if(typeof currentUserUid === 'undefined' || !currentUserUid) return;
        const doc = await db.collection('agentData').doc(currentUserUid).get();
        if(doc.exists) {
            const d = doc.data();
            clientsList = Array.isArray(d.clients) ? d.clients : [];
            policiesList = Array.isArray(d.policies) ? d.policies : [];
            vehiclesList = Array.isArray(d.vehicles) ? d.vehicles : [];
            propertiesList = Array.isArray(d.properties) ? d.properties : [];
            externalPoliciesList = Array.isArray(d.externalPolicies) ? d.externalPolicies : [];
            commDictList = Array.isArray(d.commDict) ? d.commDict : commDictList;
            offersList = Array.isArray(d.offers) ? d.offers : [];
            insurersLibrary = Array.isArray(d.insurers) ? d.insurers : insurersLibrary;
            tasksList = Array.isArray(d.tasks) ? d.tasks : [];
            quickNotesText = d.quickNotes !== undefined ? d.quickNotes : (localStorage.getItem('agent_quick_notes') || "");
            monthlyGoalAmount = d.monthlyGoal || parseFloat(localStorage.getItem('agent_monthly_goal')) || 10000;
            if(d.customBrands && Array.isArray(d.customBrands)) {
                customBrandsList = Array.from(new Set([...customBrandsList, ...d.customBrands]));
            }
        }
        let notesEl = document.getElementById('quickNotesArea');
        if(notesEl) notesEl.value = quickNotesText;
        
        renderBrandsDatalist();
        syncAndRender(false);
    } catch (e) { 
        console.error("Błąd odczytu z Firebase:", e); 
    }
};

function syncAndRender(uploadToCloud = true) {
    try { renderClients(); } catch(e) { console.error("Błąd renderClients:", e); }
    try { renderPolicies(); } catch(e) { console.error("Błąd renderPolicies:", e); }
    try { renderFinances(); } catch(e) { console.error("Błąd renderFinances:", e); }
    try { renderDashboard(); } catch(e) { console.error("Błąd renderDashboard:", e); }
    try { if (typeof renderStatistics === 'function') renderStatistics(); } catch(e) { console.error("Błąd renderStatistics:", e); }
    try { renderCommissionDict(); } catch(e) { console.error("Błąd renderCommissionDict:", e); }
    try { renderOffersList(); } catch(e) { console.error("Błąd renderOffersList:", e); }
    try { renderInsurersLibrary(); } catch(e) { console.error("Błąd renderInsurersLibrary:", e); }
    try { renderBrandsDatalist(); } catch(e) { console.error("Błąd renderBrandsDatalist:", e); }
    try { renderCalendar(); } catch(e) { console.error("Błąd renderCalendar:", e); }
    try { renderTasks(); } catch(e) { console.error("Błąd renderTasks:", e); }
    
    if(uploadToCloud && typeof currentUserUid !== 'undefined' && currentUserUid) {
        const rawObj = { 
            clients: clientsList || [], 
            policies: policiesList || [], 
            vehicles: vehiclesList || [], 
            properties: propertiesList || [], 
            externalPolicies: externalPoliciesList || [], 
            commDict: commDictList || [], 
            offers: offersList || [], 
            insurers: insurersLibrary || [],
            tasks: tasksList || [],
            quickNotes: quickNotesText || "",
            monthlyGoal: Number(monthlyGoalAmount) || 10000,
            customBrands: customBrandsList || []
        };
        const cleanDataObj = JSON.parse(JSON.stringify(rawObj));
        db.collection('agentData').doc(currentUserUid).set(cleanDataObj).catch(e => {
            console.error("Błąd zapisu do Firebase:", e);
            alert("Uwaga: Problem z zapisem do chmury Firebase: " + e.message);
        });
    }
}

// ================= 3. FUNKCJE POMOCNICZE I OBLICZENIOWE =================
function showToast(msg) {
    let toast = document.getElementById('copyToast');
    if(toast) {
        toast.innerText = msg;
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 2200);
    }
}

function copyToClipboard(text, label = "Dane") {
    let clean = String(text || "").trim();
    if(!clean || clean === "-" || clean === "PESEL / NIP: -") return;
    navigator.clipboard.writeText(clean).then(() => {
        showToast(`📋 Skopiowano (${label}): ${clean}`);
    }).catch(err => console.error("Błąd kopiowania", err));
}

function formatPLN(num) { 
    let parsed = parseFloat(num);
    if (isNaN(parsed) || num === null || num === "") return "0,00 PLN"; 
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(parsed); 
}

function calculateYears(dateString) { 
    if (!dateString) return null; 
    const targetDate = new Date(dateString); 
    if (isNaN(targetDate.getTime())) return null;
    const today = new Date(); 
    let years = today.getFullYear() - targetDate.getFullYear(); 
    if (today.getMonth() < targetDate.getMonth() || (today.getMonth() === targetDate.getMonth() && today.getDate() < targetDate.getDate())) years--; 
    return years; 
}

function isPolicyArchivedOrExpired(p) {
    if (!p) return false;
    if (p.settlementStatus === 'anulowana') return true;
    if (p.dateEnd) {
        let endD = new Date(p.dateEnd);
        if (!isNaN(endD.getTime())) {
            endD.setHours(23, 59, 59, 999);
            if (endD < new Date()) return true;
        }
    }
    return false;
}

function getPolicyNetPremium(p) {
    if (!p) return 0;
    let raw = parseFloat(p.premium) || 0;
    let odpis = parseFloat(p.odpis) || 0;
    return Math.max(0, raw - odpis);
}

function getFirstInstallmentAmount(p) {
    if (!p) return 0;
    let totalPrem = getPolicyNetPremium(p);
    let instCount = parseInt(p.installments) || 1;
    if(instCount <= 1) return totalPrem;
    if(p.installmentDates) {
        let sumOthers = 0;
        for(let i = 2; i <= instCount; i++) {
            if(p.installmentDates[i]) sumOthers += parseFloat(p.installmentDates[i].amount) || 0;
        }
        let firstAmt = totalPrem - sumOthers;
        if(firstAmt > 0) return firstAmt;
    }
    return totalPrem / instCount;
}

// Obliczenie nierozliczonej gotówki dla danej polisy (niezależnie czy checkbox I raty był kliknięty ręcznie)
function getUnsettledCashAmount(p) {
    if (!p || p.paymentMethod !== 'Gotówka' || p.cashPaidToTu || p.settlementStatus === 'anulowana') return 0;
    let cashSum = getFirstInstallmentAmount(p);
    let instCount = parseInt(p.installments) || 1;
    if (instCount > 1 && p.installmentDates) {
        for (let i = 2; i <= instCount; i++) {
            if (p.installmentDates[i] && p.installmentDates[i].paid) {
                cashSum += parseFloat(p.installmentDates[i].amount) || 0;
            }
        }
    }
    return cashSum;
}

function getPolicyCommissionBreakdown(p) {
    if (!p) return { total: 0, paid: 0, remaining: 0, statusColor: "red" };
    let totalComm = parseFloat(p.commissionAmt) || 0;
    let instCount = parseInt(p.installments) || 1;
    let paidFromTu = 0;

    if (p.firstPaymentPaid) {
        let fpComm = (p.firstPaymentComm !== undefined && p.firstPaymentComm !== "" && p.firstPaymentComm !== null)
            ? parseFloat(p.firstPaymentComm)
            : (totalComm / instCount);
        paidFromTu += (isNaN(fpComm) ? 0 : fpComm);
    }

    if (instCount > 1 && p.installmentDates) {
        for(let i = 2; i <= instCount; i++) {
            let inst = p.installmentDates[i];
            if (inst && inst.paid) {
                let rComm = (inst.commTu !== undefined && inst.commTu !== "" && inst.commTu !== null)
                    ? parseFloat(inst.commTu)
                    : (totalComm / instCount);
                paidFromTu += (isNaN(rComm) ? 0 : rComm);
            }
        }
    }

    let remaining = Math.max(0, totalComm - paidFromTu);
    let statusColor = "red";
    if (paidFromTu >= (totalComm - 0.05) && totalComm > 0) statusColor = "green";
    else if (paidFromTu > 0) statusColor = "yellow";

    return { total: totalComm, paid: paidFromTu, remaining: remaining, statusColor: statusColor };
}

function calculateClientLtv(clientId) {
    let cPolicies = policiesList.filter(p => String(p.clientId) === String(clientId));
    let totalNetPrem = 0;
    let totalEarnedComm = 0;

    cPolicies.forEach(p => {
        if (p.settlementStatus === 'anulowana') {
            if (p.firstPaymentPaid) {
                totalNetPrem += getFirstInstallmentAmount(p);
                let fpComm = (p.firstPaymentComm !== undefined && p.firstPaymentComm !== "") 
                    ? parseFloat(p.firstPaymentComm) 
                    : ((parseFloat(p.commissionAmt) || 0) / (parseInt(p.installments) || 1));
                totalEarnedComm += (isNaN(fpComm) ? 0 : fpComm);
            }
            return;
        }
        totalNetPrem += getPolicyNetPremium(p);
        let cb = getPolicyCommissionBreakdown(p);
        totalEarnedComm += cb.paid;
    });

    return { netPremium: totalNetPrem, earnedComm: totalEarnedComm };
}

function sendPaymentReminderSms(policyId, rataIdx) {
    let p = policiesList.find(x => String(x.id) === String(policyId));
    if(!p) return;
    let c = clientsList.find(x => String(x.id) === String(p.clientId));
    let cName = c && c.name ? c.name.split(' ')[0] : "Kliencie";

    let amt = 0, date = "";
    if (rataIdx === 1) {
        amt = getFirstInstallmentAmount(p);
        date = p.firstPaymentDate || p.dateStart || "";
    } else if (p.installmentDates && p.installmentDates[rataIdx]) {
        amt = p.installmentDates[rataIdx].amount;
        date = p.installmentDates[rataIdx].date;
    }

    let rataTxt = (p.installments > 1) ? `raty (${rataIdx}/${p.installments})` : `składki`;
    let msg = `Dzień dobry ${cName}, przypominam o zbliżającym się terminie płatności ${rataTxt} za polisę ${p.insurer} (${p.subject || ''}) w kwocie ${formatPLN(amt)}, płatnej do dnia ${date}. W razie pytań pozostaję do dyspozycji. Pozdrawiam, Paweł Bujak (Superpolisa)`;

    copyToClipboard(msg, "Szablon SMS / WhatsApp");
}

function autoFillEndDate(startStr) { 
    if(!startStr || startStr.length !== 10) return; 
    let parts = startStr.split('-');
    let y = parseInt(parts[0], 10);
    if(isNaN(y) || y < 1990 || y > 2100) return;

    let d = new Date(startStr); 
    if(isNaN(d.getTime())) return;
    d.setFullYear(d.getFullYear() + 1); 
    d.setDate(d.getDate() - 1); 
    let endEl = document.getElementById('p_dateEnd');
    if(endEl) endEl.value = d.toISOString().split('T')[0]; 
    
    let fpEl = document.getElementById('p_firstPaymentDate');
    if(fpEl && !fpEl.value) {
        fpEl.value = startStr;
    }
}

function addMonthsToDate(dateStr, monthsToAdd) { 
    if(!dateStr || dateStr.length !== 10) return ""; 
    let yearCheck = parseInt(dateStr.split('-')[0], 10);
    if(isNaN(yearCheck) || yearCheck < 1990) return "";
    let d = new Date(dateStr); 
    if(isNaN(d.getTime())) return "";
    d.setMonth(d.getMonth() + monthsToAdd); 
    return d.toISOString().split('T')[0]; 
}

function parsePeselToDateString(val) { 
    if(!val || val.length !== 11) return null; 
    let year = parseInt(val.substring(0, 2), 10); 
    let month = parseInt(val.substring(2, 4), 10); 
    let day = parseInt(val.substring(4, 6), 10); 
    if (month > 20 && month <= 32) { year += 2000; month -= 20; } 
    else if (month > 0 && month <= 12) { year += 1900; } 
    else if (month > 40 && month <= 52) { year += 2100; month -= 40; } 
    else { return null; }
    if (year && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return null; 
}

function renderBrandsDatalist() {
    let dl = document.getElementById('popularBrandsList');
    let tbody = document.getElementById('brandsLibraryBody');
    if(dl) dl.innerHTML = "";
    if(tbody) tbody.innerHTML = "";
    
    customBrandsList.sort((a,b) => a.localeCompare(b)).forEach((b, idx) => {
        if(dl) dl.innerHTML += `<option value="${b}">`;
        if(tbody) {
            tbody.innerHTML += `
                <tr class="hover:bg-luxBg">
                    <td class="p-2.5 font-bold">${b}</td>
                    <td class="p-2.5 text-right"><button onclick="deleteBrandFromSettings(${idx})" class="text-red-500 text-xs font-bold hover:underline">Usuń</button></td>
                </tr>`;
        }
    });
}

function rememberBrand(brandStr) {
    if(!brandStr) return;
    let formatted = brandStr.trim();
    if(formatted.length < 2) return;
    let exists = customBrandsList.some(b => b.toLowerCase() === formatted.toLowerCase());
    if(!exists) {
        customBrandsList.push(formatted);
        renderBrandsDatalist();
    }
}

function addBrandFromSettings() {
    let inp = document.getElementById('set_newBrand');
    if(!inp) return;
    let val = inp.value.trim();
    if(val) {
        rememberBrand(val);
        inp.value = "";
        syncAndRender();
    }
}

function deleteBrandFromSettings(idx) {
    if(confirm("Usunąć markę z listy podpowiedzi?")) {
        customBrandsList.splice(idx, 1);
        syncAndRender();
    }
}

function handleGlobalSearch(query) {
    query = query.toLowerCase().trim(); 
    let resBox = document.getElementById('globalSearchResults'); 
    if(!resBox) return;
    if(query.length < 2) { resBox.classList.add('hidden'); return; } 
    let html = '';
    
    let foundClients = clientsList.filter(c => (c.name && c.name.toLowerCase().includes(query)) || (c.pesel && c.pesel.includes(query)) || (c.nip && c.nip.includes(query)));
    if(foundClients.length > 0) {
        html += `<div class="p-2 bg-luxBg text-xs font-bold text-textMuted uppercase sticky top-0">Klienci</div>`;
        foundClients.forEach(c => { 
            html += `<div onclick="openClientFull('${c.id}'); document.getElementById('globalSearchResults').classList.add('hidden'); document.getElementById('globalSearch').value='';" class="p-3 hover:bg-amber-50 cursor-pointer border-b border-luxBorder"><span class="font-bold text-textDark">${c.name}</span> <span class="text-xs text-textMuted font-mono ml-2">(${c.pesel || c.nip || 'brak'})</span></div>`; 
        });
    }

    let foundVehicles = vehiclesList.filter(v => (v.plate && v.plate.toLowerCase().includes(query)) || (v.vin && v.vin.toLowerCase().includes(query)) || (v.brand && v.brand.toLowerCase().includes(query)));
    if(foundVehicles.length > 0) {
        html += `<div class="p-2 bg-luxBg text-xs font-bold text-textMuted uppercase sticky top-0">Pojazdy w garażu</div>`;
        foundVehicles.forEach(v => {
            let c = clientsList.find(x => String(x.id) === String(v.clientId));
            html += `<div onclick="openClientFull('${v.clientId}'); document.getElementById('globalSearchResults').classList.add('hidden'); document.getElementById('globalSearch').value='';" class="p-3 hover:bg-amber-50 cursor-pointer border-b border-luxBorder"><span class="font-bold text-blue-700">🚗 ${v.brand} ${v.model || ''} (${v.plate})</span> <span class="text-xs text-textMuted ml-1">${c ? '- ' + c.name : ''}</span></div>`;
        });
    }

    let foundProps = propertiesList.filter(pr => (pr.address && pr.address.toLowerCase().includes(query)) || (pr.type && pr.type.toLowerCase().includes(query)));
    if(foundProps.length > 0) {
        html += `<div class="p-2 bg-luxBg text-xs font-bold text-textMuted uppercase sticky top-0">Lokale i Nieruchomości</div>`;
        foundProps.forEach(pr => {
            let c = clientsList.find(x => String(x.id) === String(pr.clientId));
            html += `<div onclick="openClientFull('${pr.clientId}'); document.getElementById('globalSearchResults').classList.add('hidden'); document.getElementById('globalSearch').value='';" class="p-3 hover:bg-amber-50 cursor-pointer border-b border-luxBorder"><span class="font-bold text-green-700">🏠 ${pr.type}: ${pr.address}</span> <span class="text-xs text-textMuted ml-1">${c ? '- ' + c.name : ''}</span></div>`;
        });
    }
    
    let foundPolicies = policiesList.filter(p => (p.number && p.number.toLowerCase().includes(query)) || (p.subject && p.subject.toLowerCase().includes(query)));
    if(foundPolicies.length > 0) {
        html += `<div class="p-2 bg-luxBg text-xs font-bold text-textMuted uppercase sticky top-0">Polisy</div>`;
        foundPolicies.forEach(p => { 
            html += `<div onclick="openDrawer('policy', '${p.id}'); document.getElementById('globalSearchResults').classList.add('hidden'); document.getElementById('globalSearch').value='';" class="p-3 hover:bg-amber-50 cursor-pointer border-b border-luxBorder"><span class="font-bold text-goldAccent">${p.subject || 'Polisa'}</span> <span class="text-xs text-textDark ml-1">${p.number ? '['+p.number+']' : ''}</span></div>`; 
        });
    }
    
    if(html === '') html = `<div class="p-4 text-sm text-textMuted text-center">Brak wyników.</div>`;
    resBox.innerHTML = html; 
    resBox.classList.remove('hidden');
}

// ================= 4. NOTATNIK, TASKI, CEL =================
function saveQuickNotes() {
    let el = document.getElementById('quickNotesArea');
    if(!el) return;
    quickNotesText = el.value;
    localStorage.setItem('agent_quick_notes', quickNotesText);
    if(typeof currentUserUid !== 'undefined' && currentUserUid) {
        db.collection('agentData').doc(currentUserUid).set({ quickNotes: quickNotesText }, { merge: true });
    }
}

function addTask() {
    let inp = document.getElementById('newTaskInput');
    if(!inp) return;
    let txt = inp.value.trim();
    if(!txt) return;
    tasksList.unshift({ id: Date.now(), text: txt, done: false });
    inp.value = "";
    syncAndRender();
}

function toggleTask(id) {
    let t = tasksList.find(x => String(x.id) === String(id));
    if(t) {
        t.done = !t.done;
        syncAndRender();
    }
}

function deleteTask(id) {
    tasksList = tasksList.filter(x => String(x.id) !== String(id));
    syncAndRender();
}

function renderTasks() {
    let box = document.getElementById('tasksListContainer');
    let countEl = document.getElementById('dash_tasksCount');
    if(!box) return;
    
    let activeCount = tasksList.filter(t => !t.done).length;
    if(countEl) countEl.innerText = `${activeCount} aktywne`;
    
    if(tasksList.length === 0) {
        box.innerHTML = `<p class="text-xs text-amber-800/60 italic py-1">Brak zadań na liście.</p>`;
        return;
    }
    
    box.innerHTML = "";
    tasksList.forEach(t => {
        let textStyle = t.done ? "line-through text-gray-400" : "text-textDark font-medium";
        box.innerHTML += `
            <div class="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-amber-200/80 text-xs">
                <label class="flex items-center gap-2 cursor-pointer flex-grow pr-2">
                    <input type="checkbox" ${t.done ? 'checked' : ''} onchange="toggleTask('${t.id}')" class="accent-amber-700 w-3.5 h-3.5 cursor-pointer">
                    <span class="${textStyle}">${t.text}</span>
                </label>
                <button onclick="deleteTask('${t.id}')" class="text-red-400 hover:text-red-600 font-bold px-1">&times;</button>
            </div>`;
    });
}

function editMonthlyGoal() {
    let currentGoal = monthlyGoalAmount || 10000;
    let g = prompt("Podaj nowy cel przypisu netto miesięcznego (PLN):", currentGoal);
    if(g !== null) {
        let parsed = parseFloat(g.replace(/\s+/g, '').replace(',', '.'));
        if(!isNaN(parsed) && parsed > 0) {
            monthlyGoalAmount = parsed;
            localStorage.setItem('agent_monthly_goal', parsed);
            syncAndRender();
        } else {
            alert("Podaj poprawną kwotę liczbową!");
        }
    }
}

// ================= 5. ROZLICZENIE Z TU, PORTFEL GOTÓWKOWY I ZDEJMOWANIE SPRAW =================
function markRenewalAsHandled(policyId) {
    let p = policiesList.find(x => String(x.id) === String(policyId));
    if(p) {
        p.renewalHandled = true;
        p.renewalStatus = "won";
        syncAndRender();
        showToast(`✅ Wznowienie oznaczone jako załatwione!`);
    }
}

function toggleTuAction(type, policyId = null) {
    let targetId = policyId || currentOpenPolicyId;
    let p = policiesList.find(x => String(x.id) === String(targetId));
    if(!p) return;

    if (type === 'scans') {
        p.scansSent = !p.scansSent;
    } else if (type === 'cash') {
        p.cashPaidToTu = !p.cashPaidToTu;
    }

    syncAndRender();
    if(currentOpenPolicyId && String(currentOpenPolicyId) === String(targetId)) {
        populateDrawer('policy', p.id);
    }
}

function archiveKanbanCard(policyId) {
    let p = policiesList.find(x => String(x.id) === String(policyId));
    if(p) {
        p.renewalArchived = true;
        syncAndRender();
    }
}

function unarchiveKanbanCard(policyId) {
    let p = policiesList.find(x => String(x.id) === String(policyId));
    if(p) {
        p.renewalArchived = false;
        syncAndRender();
    }
}

// ================= 6. WYDRUK PLANU DNIA =================
function printTodayPlan() {
    let today = new Date();
    today.setHours(0,0,0,0);
    let next7Days = new Date(today); next7Days.setDate(today.getDate() + 7);
    let currentMonth = today.getMonth() + 1;

    let tdEl = document.getElementById('print_todayDate');
    if(tdEl) tdEl.innerText = today.toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    let tasksHtml = '', instHtml = '', renewalsHtml = '', inspHtml = '', birthHtml = '';

    policiesList.forEach(p => {
        if(p.settlementStatus === 'anulowana') return;
        let c = clientsList.find(x => String(x.id) === String(p.clientId));
        let cName = c ? c.name : "Klient";
        let cPhone = (c && c.phone) ? ` | tel. ${c.phone}` : "";

        if(!p.scansSent) tasksHtml += `<div class="py-1 border-b border-gray-100">☐ <b>[SKANY DO TU]</b> ${p.insurer} (${p.subject || ''}) – Klient: ${cName}${cPhone}</div>`;
        let unsettledCash = getUnsettledCashAmount(p);
        if(unsettledCash > 0) {
            tasksHtml += `<div class="py-1 border-b border-gray-100 text-emerald-800">☐ <b>[WPŁATA GOTÓWKI DO TU]</b> ${p.insurer} (${formatPLN(unsettledCash)}) – Klient: ${cName}</div>`;
        }
        if(p.reqAc && !p.acDone) tasksHtml += `<div class="py-1 border-b border-gray-100">☐ <b>[ZDJĘCIA AC / INSPEKCJA]</b> ${cName}${cPhone} – ${p.insurer} (${p.subject || ''})</div>`;
        if(p.reqOc && !p.ocDone) tasksHtml += `<div class="py-1 border-b border-gray-100">☐ <b>[WYPOWIEDZENIE]</b> ${cName}${cPhone} – ${p.insurer} (${p.subject || ''})</div>`;

        if(p.firstPaymentDate && !p.firstPaymentPaid) {
            let dFP = new Date(p.firstPaymentDate);
            let amt = getFirstInstallmentAmount(p);
            if(dFP <= next7Days) {
                let status = dFP < today ? "ZALEGŁA" : "Nadchodząca";
                instHtml += `<div class="py-1 border-b border-gray-100">☐ <b>[${status} - ${p.firstPaymentDate}]</b> ${cName}${cPhone} – ${p.insurer} (${formatPLN(amt)})</div>`;
            }
        }
        if(p.installments > 1 && p.installmentDates) {
            for(let i in p.installmentDates) {
                let inst = p.installmentDates[i];
                if(inst && inst.date && !inst.paid) {
                    let dInst = new Date(inst.date);
                    if(dInst <= next7Days) {
                        let status = dInst < today ? "ZALEGŁA" : "Nadchodząca";
                        instHtml += `<div class="py-1 border-b border-gray-100">☐ <b>[${status} - ${inst.date}]</b> ${cName}${cPhone} – ${p.insurer} (Rata ${i}: ${formatPLN(inst.amount)})</div>`;
                    }
                }
            }
        }

        if(p.dateEnd && !p.renewalHandled) {
            let dEnd = new Date(p.dateEnd);
            let diffDays = Math.ceil((dEnd - today) / (1000 * 60 * 60 * 24));
            if(diffDays >= 0 && diffDays <= 30) {
                renewalsHtml += `<div class="py-1 border-b border-gray-100">☐ <b>[Koniec za ${diffDays} dni]</b> ${cName}${cPhone} – ${p.insurer} | ${p.subject || ''}</div>`;
            }
        }
    });

    externalPoliciesList.forEach(ep => {
        if(ep.dateEnd) {
            let eEnd = new Date(ep.dateEnd);
            let diffDays = Math.ceil((eEnd - today) / (1000 * 60 * 60 * 24));
            if(diffDays >= 0 && diffDays <= 45) {
                let c = clientsList.find(x => String(x.id) === String(ep.clientId));
                let cName = c ? c.name : "Klient";
                let cPhone = (c && c.phone) ? ` | tel. ${c.phone}` : "";
                renewalsHtml += `<div class="py-1 border-b border-gray-100">☐ <b>[PRZEJĘCIE OBCEJ: ${ep.dateEnd}]</b> ${cName}${cPhone} – ${ep.subject}</div>`;
            }
        }
    });

    vehiclesList.forEach(v => {
        if(v.inspection) {
            let insp = new Date(v.inspection);
            let diffDays = Math.ceil((insp - today) / (1000 * 60 * 60 * 24));
            if(diffDays >= 0 && diffDays <= 30) {
                let c = clientsList.find(x => String(x.id) === String(v.clientId));
                let cName = c ? c.name : "";
                let cPhone = (c && c.phone) ? ` (${c.phone})` : "";
                inspHtml += `<div class="py-1 border-b border-gray-100">☐ <b>${v.plate}</b> (${v.brand} ${v.model || ''}) – ${v.inspection} | ${cName}${cPhone}</div>`;
            }
        }
    });

    clientsList.forEach(c => {
        if(c.birth) {
            let bDate = new Date(c.birth);
            if((bDate.getMonth() + 1) === currentMonth) {
                let age = today.getFullYear() - bDate.getFullYear();
                let cPhone = c.phone ? ` | tel. ${c.phone}` : "";
                birthHtml += `<div class="py-1 border-b border-gray-100">☐ <b>${String(bDate.getDate()).padStart(2, '0')}.${String(currentMonth).padStart(2, '0')}</b> – ${c.name} (${age} l.)${cPhone}</div>`;
            }
        }
    });

    let notesAndTasksHtml = '';
    let activeTasks = tasksList.filter(t => !t.done);
    if(activeTasks.length > 0) {
        notesAndTasksHtml += `<div class="font-bold mb-1">Lista zadań (To-Do):</div>`;
        activeTasks.forEach(t => { notesAndTasksHtml += `<div>☐ ${t.text}</div>`; });
    }
    if(quickNotesText && quickNotesText.trim() !== "") {
        notesAndTasksHtml += `<div class="font-bold mt-2 mb-1">Notatki podręczne:</div><div>${quickNotesText}</div>`;
    }

    if(document.getElementById('print_tasksList')) document.getElementById('print_tasksList').innerHTML = tasksHtml || '<p class="text-gray-400 italic">Brak zaległych zadań i rozliczeń.</p>';
    if(document.getElementById('print_installmentsList')) document.getElementById('print_installmentsList').innerHTML = instHtml || '<p class="text-gray-400 italic">Brak rat.</p>';
    if(document.getElementById('print_renewalsList')) document.getElementById('print_renewalsList').innerHTML = renewalsHtml || '<p class="text-gray-400 italic">Brak wznowień.</p>';
    if(document.getElementById('print_inspectionsList')) document.getElementById('print_inspectionsList').innerHTML = inspHtml || '<p class="text-gray-400 italic">Brak przeglądów.</p>';
    if(document.getElementById('print_birthdaysList')) document.getElementById('print_birthdaysList').innerHTML = birthHtml || '<p class="text-gray-400 italic">Brak urodzin.</p>';
    if(document.getElementById('print_notesTasks')) document.getElementById('print_notesTasks').innerHTML = notesAndTasksHtml || '<p class="text-gray-400 italic">Brak notatek.</p>';

    window.print();
}

// ================= 7. KLIENCI, GARAŻ, LOKALE =================
function saveNewClient() {
    let name = document.getElementById('addName').value.trim(); 
    let pesel = document.getElementById('addPesel').value.trim();
    if(!name || (pesel.length !== 11 && pesel.length !== 10)) {
        return alert("Wymagane Imię/Nazwa oraz poprawny PESEL (11 cyfr) lub NIP (10 cyfr)!");
    }
    let nipVal = pesel.length === 10 ? pesel : ""; 
    let peselVal = pesel.length === 11 ? pesel : "";
    let birthVal = peselVal ? (parsePeselToDateString(peselVal) || "") : "";

    clientsList.push({ 
        id: Date.now(), 
        name: name, 
        pesel: peselVal, 
        nip: nipVal, 
        regon: "", 
        birth: birthVal, 
        licenseDate: "", 
        phone: "", 
        email: "", 
        address: "", 
        source: "" 
    });
    syncAndRender(); 
    closeClientModal(); 
    showToast(`✅ Dodano klienta: ${name}`);
}

function renderClients() {
    const searchEl = document.getElementById('searchClient');
    const query = searchEl ? searchEl.value.toLowerCase() : ""; 
    const tbody = document.getElementById('clientsTableBody'); 
    if(!tbody) return; 
    tbody.innerHTML = '';
    
    let filtered = clientsList.filter(c => (c.name && c.name.toLowerCase().includes(query)) || (c.pesel && c.pesel.includes(query)) || (c.nip && c.nip.includes(query)));
    if(filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-textMuted">Brak klientów w bazie.</td></tr>`;
        return;
    }
    filtered.forEach(c => {
        let ltv = calculateClientLtv(c.id);
        let icon = c.nip ? '🏢' : '👤';
        let idStr = c.pesel ? `PESEL: ${c.pesel}` : `NIP: ${c.nip || '-'}`;
        let rawIdToCopy = c.pesel || c.nip || '';
        
        tbody.innerHTML += `
            <tr class="hover:bg-luxBg/60 transition-all cursor-pointer border-l-4 border-transparent hover:border-goldAccent" onclick="openClientFull('${c.id}')">
                <td class="p-4 font-semibold text-textDark">${icon} ${c.name}</td>
                <td class="p-4 text-textMuted font-mono text-xs">
                    ${idStr}
                    ${rawIdToCopy ? `<button onclick="event.stopPropagation(); copyToClipboard('${rawIdToCopy}', 'PESEL/NIP')" class="ml-1.5 text-[10px] bg-gray-100 hover:bg-gray-200 px-1.5 py-0.5 rounded font-sans font-bold" title="Kopiuj">📋</button>` : ''}
                </td>
                <td class="p-4 text-xs">
                    <span class="font-extrabold text-indigo-700 block">${formatPLN(ltv.netPremium)}</span>
                    <span class="text-green-700 font-bold text-[11px]">Prowizja: ${formatPLN(ltv.earnedComm)}</span>
                </td>
                <td class="p-4 text-textMuted text-xs">📞 ${c.phone || '-'}<br>✉️ ${c.email || '-'}</td>
            </tr>`;
    });
}

function populateClientFull(id) {
    const c = clientsList.find(x => String(x.id) === String(id)); 
    if(!c) return;
    currentOpenId = c.id;
    document.getElementById('cfm_name').innerText = c.name || "-"; 
    document.getElementById('cfm_pesel').innerText = c.pesel ? `PESEL: ${c.pesel}` : `NIP: ${c.nip || '-'}`;
    document.getElementById('cv_phone').innerText = c.phone || "-"; 
    document.getElementById('cv_email').innerText = c.email || "-"; 
    document.getElementById('cv_birth').innerText = c.birth || "-"; 
    document.getElementById('cv_license').innerText = c.licenseDate || "-";
    document.getElementById('cv_nip').innerText = c.nip || "-"; 
    document.getElementById('cv_regon').innerText = c.regon || "-"; 
    document.getElementById('cv_address').innerText = c.address || "-";
    document.getElementById('cv_source').innerText = c.source || "-";
    
    let ltv = calculateClientLtv(c.id);
    let ltvPremEl = document.getElementById('cfm_ltvPremium');
    let ltvCommEl = document.getElementById('cfm_ltvCommission');
    if(ltvPremEl) ltvPremEl.innerText = formatPLN(ltv.netPremium);
    if(ltvCommEl) ltvCommEl.innerText = formatPLN(ltv.earnedComm);

    document.getElementById('cfm_viewMode').classList.remove('hidden'); 
    document.getElementById('cfm_editMode').classList.add('hidden'); 
    document.getElementById('cfm_btnEdit').innerText = "Edytuj";
    
    renderClientVehicles(c.id); 
    renderClientProperties(c.id); 
    renderClientPolicies(c.id); 
    renderExternalPolicies(c.id);
}

function saveCfmEdits() {
    let idx = clientsList.findIndex(x => String(x.id) === String(currentOpenId));
    if(idx === -1) return alert("Błąd identyfikacji klienta!");
    
    let c = clientsList[idx];
    let newName = document.getElementById('ce_name').value.trim();
    if(!newName) return alert("Pole Imię i nazwisko / Nazwa firmy nie może być puste!");

    c.name = newName; 
    c.pesel = document.getElementById('ce_pesel').value.trim(); 
    c.nip = document.getElementById('ce_nip').value.trim(); 
    c.regon = document.getElementById('ce_regon').value.trim();
    c.phone = document.getElementById('ce_phone').value.trim(); 
    c.email = document.getElementById('ce_email').value.trim(); 
    c.birth = document.getElementById('ce_birth').value; 
    c.licenseDate = document.getElementById('ce_license').value; 
    c.address = document.getElementById('ce_address').value.trim(); 
    c.source = document.getElementById('ce_source').value.trim();
    
    if(c.pesel.length === 11 && !c.birth) {
        c.birth = parsePeselToDateString(c.pesel) || "";
    }
    
    syncAndRender(); 
    populateClientFull(c.id);
    showToast(`✅ Zapisano zmiany w karcie klienta!`);
}

function deleteCurrentClient() { 
    if(confirm("Usunąć trwale klienta, jego polisy, lokale i auta?")) { 
        clientsList = clientsList.filter(c => String(c.id) !== String(currentOpenId)); 
        policiesList = policiesList.filter(p => String(p.clientId) !== String(currentOpenId)); 
        vehiclesList = vehiclesList.filter(v => String(v.clientId) !== String(currentOpenId)); 
        propertiesList = propertiesList.filter(p => String(p.clientId) !== String(currentOpenId)); 
        externalPoliciesList = externalPoliciesList.filter(p => String(p.clientId) !== String(currentOpenId));
        closeClientFull(); 
        syncAndRender(); 
    } 
}

// GARAŻ
function saveVehicle() { 
    let brand = document.getElementById('v_brand').value.trim(); 
    let model = document.getElementById('v_model').value.trim();
    let plate = document.getElementById('v_plate').value.trim().toUpperCase(); 
    if(!brand || !plate) return alert("Podaj markę i numer rejestracyjny pojazdu!"); 
    
    rememberBrand(brand);

    let vData = { 
        id: editingVehicleId || Date.now(), 
        clientId: currentOpenId, 
        brand: brand, 
        model: model,
        year: document.getElementById('v_year').value || "",
        cap: document.getElementById('v_cap').value || "",
        kw: document.getElementById('v_kw').value || "",
        km: document.getElementById('v_km').value || "",
        mileage: document.getElementById('v_mileage').value || "",
        plate: plate, 
        vin: document.getElementById('v_vin').value.trim().toUpperCase(),
        firstReg: document.getElementById('v_firstReg').value || "",
        inspection: document.getElementById('v_inspection').value || "", 
        anglik: document.getElementById('v_anglik').checked || false
    };

    if(editingVehicleId) {
        let idx = vehiclesList.findIndex(v => String(v.id) === String(editingVehicleId));
        if(idx >= 0) vehiclesList[idx] = vData;
        editingVehicleId = null;
    } else {
        vehiclesList.push(vData); 
    }

    document.getElementById('cfm_addVehicleBox').classList.add('hidden');
    syncAndRender(); 
    populateClientFull(currentOpenId); 
    showToast(`🚗 Zapisano pojazd: ${brand} (${plate})`);
}

function editVehicle(id) {
    let v = vehiclesList.find(x => String(x.id) === String(id));
    if(!v) return;
    editingVehicleId = v.id;
    let box = document.getElementById('cfm_addVehicleBox');
    box.classList.remove('hidden');
    
    let titleEl = document.getElementById('v_formTitle');
    if(titleEl) titleEl.innerText = `Edycja pojazdu: ${v.brand} (${v.plate})`;

    document.getElementById('v_brand').value = v.brand || "";
    document.getElementById('v_model').value = v.model || "";
    document.getElementById('v_year').value = v.year || "";
    document.getElementById('v_cap').value = v.cap || "";
    document.getElementById('v_kw').value = v.kw || "";
    document.getElementById('v_km').value = v.km || "";
    document.getElementById('v_mileage').value = v.mileage || "";
    document.getElementById('v_plate').value = v.plate || "";
    document.getElementById('v_vin').value = v.vin || "";
    document.getElementById('v_firstReg').value = v.firstReg || "";
    document.getElementById('v_inspection').value = v.inspection || "";
    document.getElementById('v_anglik').checked = v.anglik || false;
    document.getElementById('v_brand').focus();
}

function deleteVehicle(id) { 
    if(confirm("Usunąć pojazd z garażu?")) { 
        vehiclesList = vehiclesList.filter(v => String(v.id) !== String(id)); 
        syncAndRender(); 
        populateClientFull(currentOpenId); 
    } 
}

function renderClientVehicles(clientId) { 
    let container = document.getElementById('cfm_vehiclesList'); 
    if(!container) return;
    container.innerHTML = ''; 
    let vList = vehiclesList.filter(v => String(v.clientId) === String(clientId)); 
    if(vList.length === 0) {
        container.innerHTML = "<p class='text-xs text-textMuted'>Brak pojazdów w garażu.</p>"; 
        return;
    }
    vList.forEach(v => { 
        let alerts = "";
        if(v.anglik) alerts += `<span class="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">🇬🇧 Anglik</span> `;
        if(v.inspection) alerts += `<span class="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">🔧 Przegląd: ${v.inspection}</span>`;
        
        let fullCarName = `${v.brand} ${v.model || ''}`.trim();
        
        container.innerHTML += `
            <div class="bg-luxBg p-3.5 rounded-xl border border-luxBorder space-y-2">
                <div class="flex items-start justify-between border-b border-gray-200 pb-2">
                    <div>
                        <p class="font-bold text-textDark text-sm">🚗 ${fullCarName} ${v.year ? `<span class="text-xs font-semibold text-goldAccent">(${v.year} r.)</span>` : ''}</p>
                        <div class="mt-1">${alerts}</div>
                    </div>
                    <div class="flex gap-1.5">
                        <button onclick="editVehicle('${v.id}')" class="text-[11px] bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 px-2 py-0.5 rounded font-bold">✏️ Edytuj</button>
                        <button onclick="deleteVehicle('${v.id}')" class="text-[11px] bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 px-2 py-0.5 rounded font-bold">&times;</button>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-1.5 text-xs">
                    <div class="bg-white p-1.5 rounded border border-gray-200 flex justify-between items-center">
                        <div><span class="text-[9px] text-textMuted uppercase block">Nr Rejestracyjny</span><span class="font-mono font-bold text-textDark">${v.plate || '-'}</span></div>
                        ${v.plate ? `<button onclick="copyToClipboard('${v.plate}', 'Nr rej.')" class="text-xs bg-gray-100 hover:bg-gray-200 px-1.5 py-1 rounded">📋</button>` : ''}
                    </div>
                    <div class="bg-white p-1.5 rounded border border-gray-200 flex justify-between items-center">
                        <div class="overflow-hidden"><span class="text-[9px] text-textMuted uppercase block">VIN</span><span class="font-mono font-bold text-textDark text-[11px] truncate block">${v.vin || '-'}</span></div>
                        ${v.vin ? `<button onclick="copyToClipboard('${v.vin}', 'VIN')" class="text-xs bg-gray-100 hover:bg-gray-200 px-1.5 py-1 rounded ml-1">📋</button>` : ''}
                    </div>
                    <div class="bg-white p-1.5 rounded border border-gray-200 flex justify-between items-center">
                        <div><span class="text-[9px] text-textMuted uppercase block">Moc (kW / KM)</span><span class="font-bold text-textDark">${v.kw || '-'} kW / ${v.km || '-'} KM</span></div>
                        ${v.kw ? `<button onclick="copyToClipboard('${v.kw}', 'Moc kW')" class="text-[10px] bg-gray-100 hover:bg-gray-200 px-1.5 py-0.5 rounded" title="Kopiuj kW">📋kW</button>` : ''}
                    </div>
                    <div class="bg-white p-1.5 rounded border border-gray-200 flex justify-between items-center">
                        <div><span class="text-[9px] text-textMuted uppercase block">Przebieg / Poj.</span><span class="font-bold text-textDark">${v.mileage ? v.mileage+' km' : '-'} ${v.cap ? `(${v.cap} cm³)` : ''}</span></div>
                        ${v.mileage ? `<button onclick="copyToClipboard('${v.mileage}', 'Przebieg')" class="text-xs bg-gray-100 hover:bg-gray-200 px-1.5 py-1 rounded">📋</button>` : ''}
                    </div>
                </div>
                ${v.firstReg ? `<div class="text-[11px] text-textMuted flex justify-between items-center pt-1"><span>📅 I rejestracja: <b class="text-textDark">${v.firstReg}</b></span> <button onclick="copyToClipboard('${v.firstReg}', 'Data I rej.')" class="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">📋 Kopiuj datę</button></div>` : ''}
            </div>`; 
    }); 
}

// LOKALE
function saveProperty() { 
    let t = document.getElementById('prop_type').value; 
    let a = document.getElementById('prop_address').value.trim(); 
    if(!a) return alert("Podaj dokładny adres nieruchomości / lokalu!");

    let propData = { 
        id: editingPropertyId || Date.now(), 
        clientId: currentOpenId, 
        type: t, 
        ownership: document.getElementById('prop_ownership') ? document.getElementById('prop_ownership').value : "Własność",
        address: a, 
        area: document.getElementById('prop_area') ? document.getElementById('prop_area').value : "",
        year: document.getElementById('prop_year') ? document.getElementById('prop_year').value : "",
        floor: document.getElementById('prop_floor') ? document.getElementById('prop_floor').value.trim() : "",
        suWalls: document.getElementById('prop_suWalls') ? document.getElementById('prop_suWalls').value : "",
        suMovables: document.getElementById('prop_suMovables') ? document.getElementById('prop_suMovables').value : "",
        suOc: document.getElementById('prop_suOc') ? document.getElementById('prop_suOc').value : "",
        cession: document.getElementById('prop_cession') ? document.getElementById('prop_cession').value.trim() : "",
        secDoors: document.getElementById('prop_secDoors') ? document.getElementById('prop_secDoors').checked : false,
        secAlarm: document.getElementById('prop_secAlarm') ? document.getElementById('prop_secAlarm').checked : false,
        flammable: document.getElementById('prop_flammable').checked || false, 
        flood: document.getElementById('prop_flood').checked || false
    };

    if(editingPropertyId) {
        let idx = propertiesList.findIndex(p => String(p.id) === String(editingPropertyId));
        if(idx >= 0) propertiesList[idx] = propData;
        editingPropertyId = null;
    } else {
        propertiesList.push(propData); 
    }

    document.getElementById('cfm_addPropertyBox').classList.add('hidden');
    syncAndRender(); 
    populateClientFull(currentOpenId); 
    showToast(`🏠 Zapisano lokal: ${a}`);
}

function editProperty(id) {
    let p = propertiesList.find(x => String(x.id) === String(id));
    if(!p) return;
    editingPropertyId = p.id;
    let box = document.getElementById('cfm_addPropertyBox');
    box.classList.remove('hidden');

    let titleEl = document.getElementById('prop_formTitle');
    if(titleEl) titleEl.innerText = `Edycja lokalu: ${p.type}`;

    document.getElementById('prop_type').value = p.type || "Mieszkanie";
    if(document.getElementById('prop_ownership')) document.getElementById('prop_ownership').value = p.ownership || "Własność";
    document.getElementById('prop_address').value = p.address || "";
    if(document.getElementById('prop_area')) document.getElementById('prop_area').value = p.area || "";
    if(document.getElementById('prop_year')) document.getElementById('prop_year').value = p.year || "";
    if(document.getElementById('prop_floor')) document.getElementById('prop_floor').value = p.floor || "";
    if(document.getElementById('prop_suWalls')) document.getElementById('prop_suWalls').value = p.suWalls || "";
    if(document.getElementById('prop_suMovables')) document.getElementById('prop_suMovables').value = p.suMovables || "";
    if(document.getElementById('prop_suOc')) document.getElementById('prop_suOc').value = p.suOc || "";
    if(document.getElementById('prop_cession')) document.getElementById('prop_cession').value = p.cession || "";
    if(document.getElementById('prop_secDoors')) document.getElementById('prop_secDoors').checked = p.secDoors || false;
    if(document.getElementById('prop_secAlarm')) document.getElementById('prop_secAlarm').checked = p.secAlarm || false;
    document.getElementById('prop_flammable').checked = p.flammable || false;
    document.getElementById('prop_flood').checked = p.flood || false;
    document.getElementById('prop_address').focus();
}

function deleteProperty(id) { 
    if(confirm("Usunąć nieruchomość / lokal z karty klienta?")) { 
        propertiesList = propertiesList.filter(p => String(p.id) !== String(id)); 
        syncAndRender(); 
        populateClientFull(currentOpenId); 
    } 
}

function renderClientProperties(clientId) { 
    let container = document.getElementById('cfm_propertiesList'); 
    if(!container) return;
    container.innerHTML = ''; 
    let pList = propertiesList.filter(p => String(p.clientId) === String(clientId)); 
    if(pList.length === 0) {
        container.innerHTML = "<p class='text-xs text-textMuted'>Brak zapisanych nieruchomości / lokali.</p>"; 
        return;
    }
    pList.forEach(p => { 
        let badges = "";
        if(p.secDoors) badges += `<span class="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold mr-1">🚪 Drzwi antywł.</span>`;
        if(p.secAlarm) badges += `<span class="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold mr-1">🚨 Alarm</span>`;
        if(p.flammable) badges += `<span class="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold mr-1">🔥 Palna konstr.</span>`;
        if(p.flood) badges += `<span class="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold mr-1">🌊 Zalewowy</span>`;
        
        let suSummary = [];
        if(p.suWalls) suSummary.push(`Mury: ${formatPLN(p.suWalls)}`);
        if(p.suMovables) suSummary.push(`Ruchomości: ${formatPLN(p.suMovables)}`);
        if(p.suOc) suSummary.push(`OC: ${formatPLN(p.suOc)}`);

        container.innerHTML += `
            <div class="bg-luxBg p-3.5 rounded-xl border border-luxBorder space-y-2">
                <div class="flex justify-between items-start border-b border-gray-200 pb-2">
                    <div>
                        <p class="font-bold text-textDark text-sm">🏠 ${p.type} <span class="text-xs font-normal text-textMuted">(${p.ownership || 'Własność'})</span></p>
                        <div class="flex items-center gap-1.5 mt-0.5">
                            <p class="text-xs font-semibold text-goldAccent">${p.address || 'Brak adresu'}</p>
                            ${p.address ? `<button onclick="copyToClipboard('${p.address}', 'Adres lokalu')" class="text-[10px] bg-gray-200 hover:bg-gray-300 px-1.5 py-0.5 rounded font-bold">📋</button>` : ''}
                        </div>
                    </div>
                    <div class="flex gap-1.5">
                        <button onclick="editProperty('${p.id}')" class="text-[11px] bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 px-2 py-0.5 rounded font-bold">✏️ Edytuj</button>
                        <button onclick="deleteProperty('${p.id}')" class="text-[11px] bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 px-2 py-0.5 rounded font-bold">&times;</button>
                    </div>
                </div>

                <div class="grid grid-cols-3 gap-1.5 text-xs">
                    <div class="bg-white p-1.5 rounded border border-gray-200 flex justify-between items-center">
                        <div><span class="text-[9px] text-textMuted uppercase block">Metraż</span><span class="font-bold text-textDark">${p.area ? p.area + ' m²' : '-'}</span></div>
                        ${p.area ? `<button onclick="copyToClipboard('${p.area}', 'Metraż')" class="text-[10px] bg-gray-100 hover:bg-gray-200 px-1 py-0.5 rounded">📋</button>` : ''}
                    </div>
                    <div class="bg-white p-1.5 rounded border border-gray-200 flex justify-between items-center">
                        <div><span class="text-[9px] text-textMuted uppercase block">Rok budowy</span><span class="font-bold text-textDark">${p.year || '-'}</span></div>
                        ${p.year ? `<button onclick="copyToClipboard('${p.year}', 'Rok budowy')" class="text-[10px] bg-gray-100 hover:bg-gray-200 px-1 py-0.5 rounded">📋</button>` : ''}
                    </div>
                    <div class="bg-white p-1.5 rounded border border-gray-200">
                        <span class="text-[9px] text-textMuted uppercase block">Kondygnacja</span>
                        <span class="font-bold text-textDark truncate block">${p.floor || '-'}</span>
                    </div>
                </div>

                ${suSummary.length > 0 ? `<div class="bg-white px-2 py-1.5 rounded border border-gray-200 text-[11px] font-semibold text-indigo-900">💰 SU: ${suSummary.join(' | ')}</div>` : ''}
                ${p.cession ? `<div class="bg-amber-50 px-2 py-1 rounded border border-amber-200 text-[11px] flex justify-between items-center"><span class="text-amber-900">🏦 Cesja: <b>${p.cession}</b></span> <button onclick="copyToClipboard('${p.cession}', 'Cesja bankowa')" class="text-[10px] bg-white border border-amber-300 px-1.5 py-0.5 rounded font-bold">📋</button></div>` : ''}
                ${badges ? `<div class="pt-0.5">${badges}</div>` : ''}
            </div>`; 
    }); 
}

function saveExternalPolicy() {
    let subj = document.getElementById('ext_subject').value.trim(); 
    let date = document.getElementById('ext_date').value;
    if(!subj || !date) return alert("Podaj nazwę i datę końca obcej polisy!");
    externalPoliciesList.push({ id: Date.now(), clientId: currentOpenId, subject: subj, dateEnd: date });
    document.getElementById('ext_subject').value = ""; 
    document.getElementById('ext_date').value = "";
    syncAndRender(); 
    populateClientFull(currentOpenId);
}

function deleteExternalPolicy(id) { 
    externalPoliciesList = externalPoliciesList.filter(p => String(p.id) !== String(id)); 
    syncAndRender(); 
    populateClientFull(currentOpenId); 
}

function renderExternalPolicies(clientId) {
    let container = document.getElementById('cfm_externalList'); 
    if(!container) return;
    container.innerHTML = '';
    let extList = externalPoliciesList.filter(p => String(p.clientId) === String(clientId));
    if(extList.length === 0) {
        container.innerHTML = "<p class='text-xs text-textMuted'>Brak zapisanych obcych polis.</p>";
        return;
    }
    extList.forEach(p => {
        container.innerHTML += `
            <div class="bg-white p-2 rounded border border-gray-200 flex justify-between items-center text-sm">
                <span class="font-bold text-textDark">🎯 ${p.subject}</span>
                <div>
                    <span class="text-red-500 font-bold mr-2">${p.dateEnd}</span>
                    <button onclick="deleteExternalPolicy('${p.id}')" class="text-red-400 hover:text-red-600 font-bold">&times;</button>
                </div>
            </div>`;
    });
}

// POLISY W KARCIE KLIENTA
function renderClientPolicies(clientId) { 
    let cPolicies = policiesList.filter(p => String(p.clientId) === String(clientId)); 
    let pContainer = document.getElementById('cfm_policiesList'); 
    if(!pContainer) return;
    pContainer.innerHTML = ''; 
    if(cPolicies.length === 0) {
        pContainer.innerHTML = "<p class='text-xs text-textMuted'>Brak polis.</p>"; 
        return;
    }

    cPolicies.sort((a,b) => new Date(b.dateStart || 0) - new Date(a.dateStart || 0));

    let today = new Date(); 
    let nextWeek = new Date(); 
    nextWeek.setDate(today.getDate() + 7); 

    cPolicies.forEach(p => { 
        let isArchived = isPolicyArchivedOrExpired(p);
        let alertHtml = ''; 
        if(!isArchived && p.firstPaymentDate && !p.firstPaymentPaid && new Date(p.firstPaymentDate) <= nextWeek) {
            alertHtml = `<div class="mt-1 text-[10px] text-red-600 font-bold animate-pulse">⚠️ Rata / Wpłata!</div>`; 
        }

        let cb = getPolicyCommissionBreakdown(p);
        let statusBadge = "";
        if(p.settlementStatus === 'anulowana') statusBadge = `<span class="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded ml-1 font-bold">❌ Wypowiedziana</span>`;
        else if(isArchived) statusBadge = `<span class="text-[9px] bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded ml-1 font-bold">Archiwalna</span>`;
        else statusBadge = `<span class="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded ml-1 font-bold">⭐ Aktywna</span>`;

        let cardClass = isArchived 
            ? "policy-archived p-3 rounded-xl border border-gray-300 flex justify-between items-start cursor-pointer transition-all"
            : "bg-luxBg p-3 rounded-xl border-l-4 border-goldAccent shadow-sm flex justify-between items-start cursor-pointer hover:border-goldHover transition-all";

        pContainer.innerHTML += `
            <div onclick="openDrawer('policy', '${p.id}')" class="${cardClass}">
                <div>
                    <span class="text-xs font-bold ${isArchived ? 'text-gray-600' : 'text-goldAccent'} uppercase">${p.insurer} ${statusBadge}</span>
                    <p class="text-sm font-semibold text-textDark">${p.type} <span class="text-xs text-textMuted font-normal">(${p.subject || '-'})</span></p>
                    <p class="text-xs text-green-700 font-bold mt-0.5">Prowizja odebrana: ${formatPLN(cb.paid)} / ${formatPLN(cb.total)}</p>
                    ${alertHtml}
                </div>
                <div class="text-right">
                    <span class="text-xs text-textMuted block -mb-1">Koniec:</span>
                    <span class="text-sm font-bold ${isArchived ? 'text-gray-500' : 'text-textDark'}">${p.dateEnd || '-'}</span>
                </div>
            </div>`; 
    }); 
}

// ================= 8. TABELA POLIS, KREATOR I RĘCZNA PROWIZJA =================
function renderPolicies() {
    const tbody = document.getElementById('policiesTableBody'); 
    if(!tbody) return; 
    tbody.innerHTML = ''; 
    if(policiesList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-textMuted">Brak polis.</td></tr>`;
        return;
    }

    policiesList.slice().sort((a,b) => new Date(b.dateStart || 0) - new Date(a.dateStart || 0)).forEach(p => {
        let c = clientsList.find(x => String(x.id) === String(p.clientId)); 
        let isArchived = isPolicyArchivedOrExpired(p);
        let cb = getPolicyCommissionBreakdown(p);
        let netPrem = getPolicyNetPremium(p);

        let commIndicator = "";
        if(cb.statusColor === 'green') commIndicator = `<span class="inline-block w-2.5 h-2.5 rounded-full bg-green-500 mr-1" title="Prowizja 100% odebrana"></span>`;
        else if(cb.statusColor === 'yellow') commIndicator = `<span class="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 mr-1" title="Część prowizji odebrana"></span>`;
        else commIndicator = `<span class="inline-block w-2.5 h-2.5 rounded-full bg-red-500 mr-1" title="Prowizja jeszcze nieodebrana"></span>`;

        let instText = p.installments > 1 ? `<span class="text-[10px] uppercase font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded ml-1">${p.installments} rat</span>` : "";
        let newBizBadge = p.salesType === 'renewal' ? `<span class="text-[9px] bg-blue-100 text-blue-700 px-1 rounded ml-1 uppercase">Wznowienie</span>` : `<span class="text-[9px] bg-green-100 text-green-700 px-1 rounded ml-1 uppercase">Nowa</span>`;
        
        let rowClass = isArchived ? "policy-archived cursor-pointer" : "hover:bg-luxBg/60 transition-all cursor-pointer border-l-4 border-transparent hover:border-goldAccent";

        tbody.innerHTML += `
            <tr class="${rowClass}" onclick="openDrawer('policy', '${p.id}')">
                <td class="p-4">
                    <span class="font-bold text-textDark">${commIndicator}${p.insurer} ${newBizBadge}</span><br>
                    <span class="text-xs font-mono text-textMuted">${p.number || 'Brak nr'}</span>
                    ${p.number ? `<button onclick="event.stopPropagation(); copyToClipboard('${p.number}', 'Nr polisy')" class="ml-1 text-[10px] bg-gray-100 px-1 rounded">📋</button>` : ''}
                </td>
                <td class="p-4 font-semibold text-goldAccent hover:underline" onclick="event.stopPropagation(); if('${p.clientId}') openClientFull('${p.clientId}')">${c ? c.name : "Nieznany"}</td>
                <td class="p-4 text-textMuted text-xs">
                    Okres: <span class="font-bold text-textDark">${p.dateStart || '-'} <span class="font-normal mx-1">do</span> <span class="${isArchived ? 'text-gray-500' : 'text-red-500'}">${p.dateEnd || '-'}</span></span><br>
                    Przedmiot: ${p.subject || '-'}
                </td>
                <td class="p-4 text-right">
                    <span class="font-bold text-textDark block">${formatPLN(netPrem)} ${instText}</span>
                    ${p.odpis > 0 ? `<span class="text-[10px] text-red-600 block">Odpis: -${formatPLN(p.odpis)}</span>` : ''}
                    <span class="text-xs font-bold text-green-700">Wypłacono: ${formatPLN(cb.paid)} / ${formatPLN(cb.total)}</span>
                </td>
            </tr>`;
    });
}

function populatePolicyModal(editId = null, prefillClientId = null) {
    selectedClientIdForPolicy = null; 
    tempPolicyRisks = []; 
    isManualCommission = false;
    currentPolicyStep = 1; 
    editingPolicyId = editId;

    document.getElementById('policyModalTitle').innerText = editId ? "Edytuj polisę" : "Dodaj nową polisę";
    let manBadge = document.getElementById('p_commManualBadge');
    if(manBadge) manBadge.classList.add('hidden');
    
    let peselInp = document.getElementById('p_peselInput');
    if(peselInp) {
        peselInp.value = "";
        peselInp.disabled = false;
    }
    
    document.getElementById('p_clientFoundBox').classList.add('hidden');
    document.getElementById('p_clientNotFoundBox').classList.add('hidden');
    document.getElementById('p_btnNext').disabled = true;

    ['p_quickName', 'p_quickBirth', 'p_quickLicense', 'p_number', 'p_dateStart', 'p_dateEnd', 'p_carBrand', 'p_carModel', 'p_carPlate', 'p_carVin', 'p_propArea', 'p_propYear', 'p_propCession', 'p_homeAddress', 'p_riskNameInput', 'p_riskPremInput', 'p_riskPctInput', 'p_premium', 'p_odpis', 'p_commValue', 'p_commNote', 'p_firstPaymentDate'].forEach(id => {
        let el = document.getElementById(id);
        if(el) el.value = "";
    });
    if(document.getElementById('p_propType')) document.getElementById('p_propType').value = "Mieszkanie";
    if(document.getElementById('p_odpisReasonSelect')) document.getElementById('p_odpisReasonSelect').value = "";
    if(document.getElementById('p_paymentMethod')) document.getElementById('p_paymentMethod').value = "Przelew";
    
    document.getElementById('p_reqAc').checked = false;
    document.getElementById('p_reqOc').checked = false;
    document.getElementById('p_installments').value = "1";
    document.getElementById('p_tempRisksList').innerHTML = "";
    document.getElementById('p_installmentsList').innerHTML = "";
    document.getElementById('p_installmentsContainer').classList.add('hidden');
    document.getElementById('p_type').value = "Komunikacja";
    
    let radioNew = document.querySelector('input[name="p_salesType"][value="new"]');
    if(radioNew) radioNew.checked = true;

    handlePolicyTypeChange();
    renderInsurersLibrary();

    if(editId) {
        let p = policiesList.find(x => String(x.id) === String(editId)); 
        if(p) {
            let c = clientsList.find(x => String(x.id) === String(p.clientId));
            selectedClientIdForPolicy = c ? c.id : (p.clientId || "unknown");
            if(peselInp) peselInp.value = c ? (c.pesel || c.nip || "") : "";
            document.getElementById('p_clientFoundName').innerText = c ? c.name : "Przypisany klient";
            document.getElementById('p_clientFoundBox').classList.remove('hidden');
            document.getElementById('p_btnNext').disabled = false;

            document.getElementById('p_insurer').value = p.insurer || "PZU"; 
            document.getElementById('p_type').value = p.type || "Komunikacja"; 
            handlePolicyTypeChange();

            document.getElementById('p_number').value = p.number || ""; 
            if(document.getElementById('p_paymentMethod')) document.getElementById('p_paymentMethod').value = p.paymentMethod || "Przelew";
            document.getElementById('p_dateStart').value = p.dateStart || ""; 
            document.getElementById('p_dateEnd').value = p.dateEnd || "";
            
            let sRadio = document.querySelector(`input[name="p_salesType"][value="${p.salesType || 'new'}"]`);
            if(sRadio) sRadio.checked = true;

            document.getElementById('p_carBrand').value = p.carBrand || "";
            document.getElementById('p_carModel').value = p.carModel || "";
            document.getElementById('p_carPlate').value = p.carPlate || "";
            document.getElementById('p_homeAddress').value = p.subject || "";

            document.getElementById('p_reqAc').checked = p.reqAc || false; 
            document.getElementById('p_reqOc').checked = p.reqOc || false;
            document.getElementById('p_installments').value = p.installments || 1; 
            document.getElementById('p_firstPaymentDate').value = p.firstPaymentDate || "";
            document.getElementById('p_commNote').value = p.commNote || "";
            document.getElementById('p_odpis').value = p.odpis || "";
            if(document.getElementById('p_odpisReasonSelect')) document.getElementById('p_odpisReasonSelect').value = p.odpisReason || "";
            
            if(p.risks && Array.isArray(p.risks)) {
                tempPolicyRisks = JSON.parse(JSON.stringify(p.risks));
            }
            renderTempRisks();
            
            document.getElementById('p_premium').value = p.premium || 0;
            document.getElementById('p_commValue').value = p.commissionAmt || 0;
            if(p.isManualComm) {
                isManualCommission = true;
                if(manBadge) manBadge.classList.remove('hidden');
            }
            recalcNetPremiumModal();
            calcInstallmentsOnly(p.installmentDates);
        }
    } else if(prefillClientId) { 
        let c = clientsList.find(x => String(x.id) === String(prefillClientId)); 
        if(c) { 
            selectedClientIdForPolicy = c.id;
            if(peselInp) peselInp.value = c.pesel || c.nip || ""; 
            document.getElementById('p_clientFoundName').innerText = c.name;
            document.getElementById('p_clientFoundBox').classList.remove('hidden');
            document.getElementById('p_btnNext').disabled = false;
        } 
    } else {
        setTimeout(() => { if(peselInp) peselInp.focus(); }, 50);
    }

    updatePolicyUI(); 
    updateRiskDatalist();
}

function populateGarageSelectForPolicy() {
    let sel = document.getElementById('p_garageSelect');
    if(!sel) return;
    sel.innerHTML = `<option value="">-- Wybierz z garażu klienta --</option>`;
    if(!selectedClientIdForPolicy) return;
    let cVehicles = vehiclesList.filter(v => String(v.clientId) === String(selectedClientIdForPolicy));
    cVehicles.forEach(v => {
        sel.innerHTML += `<option value="${v.id}">🚗 ${v.brand} ${v.model || ''} (${v.plate})</option>`;
    });
}

function fillVehicleFromGarage(vehId) {
    if(!vehId) return;
    let v = vehiclesList.find(x => String(x.id) === String(vehId));
    if(!v) return;
    document.getElementById('p_carBrand').value = v.brand || "";
    document.getElementById('p_carModel').value = v.model || "";
    document.getElementById('p_carPlate').value = v.plate || "";
    document.getElementById('p_carVin').value = v.vin || "";
    assembleSubjectString();
}

function populatePropertySelectForPolicy() {
    let sel = document.getElementById('p_propertySelect');
    if(!sel) return;
    sel.innerHTML = `<option value="">-- Wybierz zapisany lokal klienta --</option>`;
    if(!selectedClientIdForPolicy) return;
    let cProps = propertiesList.filter(pr => String(pr.clientId) === String(selectedClientIdForPolicy));
    cProps.forEach(pr => {
        sel.innerHTML += `<option value="${pr.id}">🏠 ${pr.type}: ${pr.address} ${pr.area ? '('+pr.area+' m²)' : ''}</option>`;
    });
}

function fillPropertyFromList(propId) {
    if(!propId) return;
    let pr = propertiesList.find(x => String(x.id) === String(propId));
    if(!pr) return;
    if(document.getElementById('p_propType')) document.getElementById('p_propType').value = pr.type || "Mieszkanie";
    if(document.getElementById('p_propArea')) document.getElementById('p_propArea').value = pr.area || "";
    if(document.getElementById('p_propYear')) document.getElementById('p_propYear').value = pr.year || "";
    if(document.getElementById('p_propCession')) document.getElementById('p_propCession').value = pr.cession || "";
    document.getElementById('p_homeAddress').value = pr.address || "";
}

function resetPolicyClientChoice() {
    selectedClientIdForPolicy = null;
    let inp = document.getElementById('p_peselInput');
    if(inp) {
        inp.disabled = false;
        inp.value = "";
        inp.focus();
    }
    document.getElementById('p_clientFoundBox').classList.add('hidden');
    document.getElementById('p_clientNotFoundBox').classList.add('hidden');
    document.getElementById('p_btnNext').disabled = true;
}

function handlePolicyPeselInput(inputEl) {
    let val = inputEl.value.replace(/[^0-9]/g, ''); 
    inputEl.value = val; 
    let btnNext = document.getElementById('p_btnNext');
    let datesBox = document.getElementById('p_quickDatesBox');
    let nameLabel = document.getElementById('p_quickNameLabel');
    let headerLabel = document.getElementById('p_quickBoxHeader');
    
    if(val.length === 11 || val.length === 10) {
        let isCompany = (val.length === 10);
        if(datesBox) datesBox.classList.toggle('hidden', isCompany);
        if(nameLabel) nameLabel.innerText = isCompany ? "Pełna nazwa firmy (dla NIP: " + val + ")" : "Imię i nazwisko klienta";
        if(headerLabel) headerLabel.innerText = isCompany ? "🏢 Nowa Firma (NIP 10 cyfr) – wpisz nazwę firmy:" : "👤 Nowy Klient – uzupełnij dane:";

        let c = clientsList.find(x => (x.pesel && x.pesel === val) || (x.nip && x.nip === val));
        if(c) { 
            selectedClientIdForPolicy = c.id; 
            document.getElementById('p_clientFoundName').innerText = c.name; 
            document.getElementById('p_clientFoundBox').classList.remove('hidden'); 
            document.getElementById('p_clientNotFoundBox').classList.add('hidden'); 
            btnNext.disabled = false; 
        } else { 
            selectedClientIdForPolicy = null; 
            document.getElementById('p_clientFoundBox').classList.add('hidden'); 
            document.getElementById('p_clientNotFoundBox').classList.remove('hidden'); 
            btnNext.disabled = true; 
            if(val.length === 11) {
                let bDate = parsePeselToDateString(val);
                if(bDate) document.getElementById('p_quickBirth').value = bDate;
            }
        }
    } else { 
        selectedClientIdForPolicy = null; 
        document.getElementById('p_clientFoundBox').classList.add('hidden'); 
        document.getElementById('p_clientNotFoundBox').classList.add('hidden'); 
        btnNext.disabled = true; 
    }
}

function saveQuickClientFromPolicy() {
    let name = document.getElementById('p_quickName').value.trim();
    let peselOrNip = document.getElementById('p_peselInput').value.trim();
    if(!name) return alert("Wpisz Imię i Nazwisko lub nazwę firmy!");
    
    let isNip = (peselOrNip.length === 10);
    let newClient = {
        id: Date.now(),
        name: name,
        pesel: isNip ? "" : peselOrNip,
        nip: isNip ? peselOrNip : "",
        regon: "",
        birth: isNip ? "" : (document.getElementById('p_quickBirth').value || ""),
        licenseDate: isNip ? "" : (document.getElementById('p_quickLicense').value || ""),
        phone: "",
        email: "",
        address: "",
        source: ""
    };
    clientsList.push(newClient);
    selectedClientIdForPolicy = newClient.id;
    
    document.getElementById('p_clientNotFoundBox').classList.add('hidden');
    document.getElementById('p_clientFoundName').innerText = newClient.name;
    document.getElementById('p_clientFoundBox').classList.remove('hidden');
    document.getElementById('p_btnNext').disabled = false;
    syncAndRender();
}

function assembleSubjectString() {
    let type = document.getElementById('p_type').value;
    if(type === 'Komunikacja') {
        let brand = document.getElementById('p_carBrand').value.trim();
        let model = document.getElementById('p_carModel').value.trim();
        let plate = document.getElementById('p_carPlate').value.trim().toUpperCase();
        let combined = `${brand} ${model}`.trim();
        if(plate) combined += ` (${plate})`;
        document.getElementById('p_homeAddress').value = combined;
    }
}

function updateRiskDatalist() {
    let ins = document.getElementById('p_insurer'); 
    let dl = document.getElementById('riskDatalist'); 
    if(!ins || !dl) return; 
    dl.innerHTML = "";
    let rules = commDictList.filter(r => r.insurer === ins.value); 
    let defaultRisks = ["OC", "AC", "NNW", "ASSISTANCE", "SZYBY", "OC W ŻYCIU PRYWATNYM", "MURY I STAŁE ELEMENTY", "RUCHOMOŚCI DOMOWE"];
    let allNames = Array.from(new Set([...rules.map(r => r.risk), ...defaultRisks]));
    allNames.forEach(rName => { dl.innerHTML += `<option value="${rName}">`; });
}

function checkRiskDictForAutoFill() {
    let ins = document.getElementById('p_insurer').value; 
    let riskName = document.getElementById('p_riskNameInput').value.trim().toUpperCase();
    let rule = commDictList.find(r => r.insurer === ins && r.risk === riskName);
    if(rule) {
        document.getElementById('p_riskPctInput').value = rule.pct;
    }
}

function markCommissionAsManual() {
    isManualCommission = true;
    let badge = document.getElementById('p_commManualBadge');
    if(badge) badge.classList.remove('hidden');
}

function addRiskToTemp() {
    let nameEl = document.getElementById('p_riskNameInput');
    let premEl = document.getElementById('p_riskPremInput');
    let pctEl = document.getElementById('p_riskPctInput');

    let name = nameEl.value.trim().toUpperCase();
    let prem = parseFloat(String(premEl.value).replace(',', '.'));
    let pct = parseFloat(String(pctEl.value).replace(',', '.'));

    if(!name) return alert("Wpisz nazwę ryzyka!");
    if(isNaN(prem) || prem < 0) return alert("Wpisz poprawną składkę!");
    
    let ins = document.getElementById('p_insurer').value;
    let existingRuleIdx = commDictList.findIndex(r => r.insurer === ins && r.risk === name);

    if(!isNaN(pct)) {
        if(existingRuleIdx >= 0) {
            commDictList[existingRuleIdx].pct = pct;
        } else {
            commDictList.push({ id: Date.now(), insurer: ins, risk: name, pct: pct });
        }
        renderCommissionDict();
    } else {
        pct = existingRuleIdx >= 0 ? parseFloat(commDictList[existingRuleIdx].pct) : 10;
    }

    let comm = prem * (pct / 100);
    tempPolicyRisks.push({ 
        id: Date.now() + Math.random(), 
        name: name, 
        premium: prem, 
        pct: pct, 
        comm: comm 
    });

    nameEl.value = "";
    premEl.value = "";
    pctEl.value = "";
    nameEl.focus();
    renderTempRisks();
}

function deleteTempRisk(id) {
    tempPolicyRisks = tempPolicyRisks.filter(r => String(r.id) !== String(id));
    renderTempRisks();
}

function renderTempRisks() {
    let box = document.getElementById('p_tempRisksList');
    if(!box) return;
    box.innerHTML = "";
    let totalPrem = 0, totalComm = 0;

    tempPolicyRisks.forEach(r => {
        totalPrem += Number(r.premium) || 0;
        totalComm += Number(r.comm) || 0;
        box.innerHTML += `
            <div class="flex justify-between items-center bg-white p-2 rounded border border-gray-200 text-xs">
                <div class="flex gap-3 items-center">
                    <span class="font-bold text-textDark w-24 truncate">${r.name}</span>
                    <span class="text-textMuted font-semibold">${formatPLN(r.premium)}</span>
                    <span class="text-goldAccent font-bold bg-amber-50 px-1.5 py-0.5 rounded">${r.pct}% (${formatPLN(r.comm)})</span>
                </div>
                <button type="button" onclick="deleteTempRisk('${r.id}')" class="text-red-500 font-bold hover:text-red-700 px-1 text-sm">&times;</button>
            </div>`;
    });

    if(tempPolicyRisks.length > 0) {
        document.getElementById('p_premium').value = totalPrem.toFixed(2);
        if(!isManualCommission) {
            document.getElementById('p_commValue').value = totalComm.toFixed(2);
        }
    }
    recalcNetPremiumModal();
    calcInstallmentsOnly();
}

function calcInstallmentsOnly(existingDates = null) {
    let rawPrem = parseFloat(String(document.getElementById('p_premium').value).replace(',', '.')) || 0;
    let odpis = parseFloat(String(document.getElementById('p_odpis').value).replace(',', '.')) || 0;
    let premium = Math.max(0, rawPrem - odpis);

    let installments = parseInt(document.getElementById('p_installments').value) || 1;
    let firstDate = document.getElementById('p_firstPaymentDate').value;
    let container = document.getElementById('p_installmentsContainer');
    let list = document.getElementById('p_installmentsList');
    if(!container || !list) return;

    if(installments > 1) {
        container.classList.remove('hidden');
        let suggestedInstAmt = (premium / installments).toFixed(2);
        list.innerHTML = "";
        for(let i = 2; i <= installments; i++) {
            let dateVal = "";
            let amtVal = suggestedInstAmt;
            if (existingDates && existingDates[i]) {
                dateVal = existingDates[i].date || "";
                amtVal = existingDates[i].amount || suggestedInstAmt;
            } else if (firstDate && firstDate.length === 10) {
                if(installments === 2 && i === 2) dateVal = addMonthsToDate(firstDate, 6);
                else if (installments === 4) dateVal = addMonthsToDate(firstDate, (i-1)*3);
                else if (installments === 6) dateVal = addMonthsToDate(firstDate, (i-1)*2);
                else if (installments === 12) dateVal = addMonthsToDate(firstDate, i-1);
            }
            list.innerHTML += `
                <div class="flex items-center gap-2">
                    <span class="text-xs font-semibold text-textMuted w-16">Rata ${i}:</span>
                    <input type="date" id="p_instDate_${i}" min="1900-01-01" max="2100-12-31" value="${dateVal}" class="flex-grow border border-amber-300 p-1.5 rounded-lg text-xs bg-white">
                    <input type="number" id="p_instAmt_${i}" value="${amtVal}" step="0.01" class="w-28 border border-amber-300 p-1.5 rounded-lg text-xs font-bold text-right bg-white">
                </div>`;
        }
    } else {
        container.classList.add('hidden');
        list.innerHTML = "";
    }
}

function policyStep(direction) { 
    if(currentPolicyStep === 1 && direction > 0 && !selectedClientIdForPolicy) {
        return alert("Najpierw wybierz klienta z bazy lub kliknij 'Zapisz klienta i przejdź dalej'!");
    }
    currentPolicyStep += direction; 
    if(currentPolicyStep < 1) currentPolicyStep = 1;
    if(currentPolicyStep > 4) currentPolicyStep = 4;
    updatePolicyUI(); 
    if(currentPolicyStep === 2) updateRiskDatalist(); 
    if(currentPolicyStep === 3) {
        handlePolicyTypeChange();
        populateGarageSelectForPolicy();
        populatePropertySelectForPolicy();
    }
}

function updatePolicyUI() {
    for(let i=1; i<=4; i++) {
        let stepEl = document.getElementById('pStep'+i);
        if(stepEl) stepEl.classList.add('hidden'); 
    }
    let activeStepEl = document.getElementById('pStep'+currentPolicyStep);
    if(activeStepEl) activeStepEl.classList.remove('hidden');

    document.getElementById('policyStepIndicator').innerText = `Krok ${currentPolicyStep} z 4`; 
    document.getElementById('p_btnPrev').classList.toggle('hidden', currentPolicyStep === 1);
    
    if(currentPolicyStep === 4) { 
        document.getElementById('p_btnNext').classList.add('hidden'); 
        document.getElementById('p_btnSave').classList.remove('hidden'); 
    } else { 
        document.getElementById('p_btnNext').classList.remove('hidden'); 
        document.getElementById('p_btnNext').disabled = (currentPolicyStep === 1 && !selectedClientIdForPolicy);
        document.getElementById('p_btnSave').classList.add('hidden'); 
    }
}

function savePolicy() {
    try {
        let pendingRiskName = document.getElementById('p_riskNameInput').value.trim();
        let pendingRiskPrem = parseFloat(String(document.getElementById('p_riskPremInput').value).replace(',', '.'));
        if(pendingRiskName && !isNaN(pendingRiskPrem)) {
            addRiskToTemp();
        }

        let type = document.getElementById('p_type').value; 
        let carBrand = document.getElementById('p_carBrand').value.trim();
        let carModel = document.getElementById('p_carModel').value.trim();
        let carPlate = document.getElementById('p_carPlate').value.trim().toUpperCase();
        let carVin = document.getElementById('p_carVin') ? document.getElementById('p_carVin').value.trim().toUpperCase() : "";
        let subjectStr = "";

        if(type === 'Komunikacja') {
            assembleSubjectString();
            subjectStr = document.getElementById('p_homeAddress').value.trim() || "Pojazd";
            if(carBrand) rememberBrand(carBrand);
            if(selectedClientIdForPolicy && carBrand && carPlate) {
                let existingCar = vehiclesList.find(v => String(v.clientId) === String(selectedClientIdForPolicy) && v.plate === carPlate);
                if(!existingCar) {
                    vehiclesList.push({
                        id: Date.now() + 1,
                        clientId: selectedClientIdForPolicy,
                        brand: carBrand,
                        model: carModel,
                        year: "",
                        cap: "",
                        kw: "",
                        km: "",
                        mileage: "",
                        plate: carPlate,
                        vin: carVin,
                        firstReg: "",
                        inspection: "",
                        anglik: false
                    });
                } else if(carVin && !existingCar.vin) {
                    existingCar.vin = carVin;
                }
            }
        } else {
            let addr = document.getElementById('p_homeAddress').value.trim();
            let propType = document.getElementById('p_propType') ? document.getElementById('p_propType').value : "Mieszkanie";
            let propArea = document.getElementById('p_propArea') ? document.getElementById('p_propArea').value : "";
            let propYear = document.getElementById('p_propYear') ? document.getElementById('p_propYear').value : "";
            let propCession = document.getElementById('p_propCession') ? document.getElementById('p_propCession').value.trim() : "";

            if(addr && (type === 'Majątek' || type === 'Firmowe')) {
                subjectStr = addr.includes(propType) ? addr : `${propType}${propArea ? ' ('+propArea+'m²)' : ''} - ${addr}`;
                if(selectedClientIdForPolicy) {
                    let existingProp = propertiesList.find(pr => String(pr.clientId) === String(selectedClientIdForPolicy) && pr.address && pr.address.toLowerCase() === addr.toLowerCase());
                    if(!existingProp) {
                        propertiesList.push({
                            id: Date.now() + 2,
                            clientId: selectedClientIdForPolicy,
                            type: propType,
                            ownership: "Własność",
                            address: addr,
                            area: propArea,
                            year: propYear,
                            floor: "",
                            suWalls: "",
                            suMovables: "",
                            suOc: "",
                            cession: propCession,
                            secDoors: false,
                            secAlarm: false,
                            flammable: false,
                            flood: false
                        });
                    } else {
                        if(propArea && !existingProp.area) existingProp.area = propArea;
                        if(propYear && !existingProp.year) existingProp.year = propYear;
                        if(propCession && !existingProp.cession) existingProp.cession = propCession;
                    }
                }
            } else {
                subjectStr = addr || "Brak opisu";
            }
        }

        let salesTypeRadio = document.querySelector('input[name="p_salesType"]:checked');
        let sType = salesTypeRadio ? salesTypeRadio.value : "new";
        let reqAc = document.getElementById('p_reqAc').checked || false; 
        let reqOc = document.getElementById('p_reqOc').checked || false;
        let instCount = parseInt(document.getElementById('p_installments').value) || 1; 
        let instDates = {};
        
        let existingPolicy = editingPolicyId ? policiesList.find(x => String(x.id) === String(editingPolicyId)) : null;

        if (instCount > 1) {
            for(let i = 2; i <= instCount; i++) {
                let dInput = document.getElementById(`p_instDate_${i}`); 
                let aInput = document.getElementById(`p_instAmt_${i}`); 
                let existingPaid = false;
                let existingCommTu = "";
                if(existingPolicy && existingPolicy.installmentDates && existingPolicy.installmentDates[i]) {
                    existingPaid = existingPolicy.installmentDates[i].paid || false; 
                    existingCommTu = existingPolicy.installmentDates[i].commTu !== undefined ? existingPolicy.installmentDates[i].commTu : "";
                }
                if(dInput && aInput) {
                    instDates[i] = { 
                        date: dInput.value || "", 
                        amount: aInput.value || "0", 
                        paid: existingPaid, 
                        commTu: existingCommTu 
                    };
                }
            }
        }

        let rawPremium = parseFloat(String(document.getElementById('p_premium').value).replace(',', '.')) || 0;
        let odpisVal = parseFloat(String(document.getElementById('p_odpis').value).replace(',', '.')) || 0;
        let odpisReasonVal = document.getElementById('p_odpisReasonSelect') ? document.getElementById('p_odpisReasonSelect').value : "";
        let finalComm = parseFloat(String(document.getElementById('p_commValue').value).replace(',', '.')) || 0;
        let commNote = document.getElementById('p_commNote') ? document.getElementById('p_commNote').value.trim() : "";
        let paymentMethod = document.getElementById('p_paymentMethod') ? document.getElementById('p_paymentMethod').value : "Przelew";

        // Automat dla gotówki: Jeśli polisa jest gotówkowa, pierwsza wpłata z automatu jest pobrana od klienta!
        let autoFirstPaid = (paymentMethod === 'Gotówka') ? true : (existingPolicy ? (existingPolicy.firstPaymentPaid || false) : false);

        let pData = { 
            id: editingPolicyId || Date.now(), 
            clientId: selectedClientIdForPolicy, 
            insurer: document.getElementById('p_insurer').value || "PZU", 
            type: type || "Komunikacja", 
            salesType: sType, 
            paymentMethod: paymentMethod,
            number: document.getElementById('p_number').value.trim(), 
            dateStart: document.getElementById('p_dateStart').value || "", 
            dateEnd: document.getElementById('p_dateEnd').value || "", 
            premium: rawPremium, 
            odpis: odpisVal,
            odpisReason: odpisReasonVal,
            installments: instCount, 
            firstPaymentDate: document.getElementById('p_firstPaymentDate').value || "", 
            installmentDates: instDates, 
            firstPaymentPaid: autoFirstPaid, 
            firstPaymentComm: (existingPolicy && existingPolicy.firstPaymentComm !== undefined) ? existingPolicy.firstPaymentComm : "",
            settlementStatus: existingPolicy ? (existingPolicy.settlementStatus || "nierozliczona") : "nierozliczona",
            scansSent: existingPolicy ? (existingPolicy.scansSent || false) : false,
            cashPaidToTu: existingPolicy ? (existingPolicy.cashPaidToTu || false) : false,
            commissionAmt: finalComm, 
            isManualComm: isManualCommission || false,
            commNote: commNote,
            subject: subjectStr, 
            carBrand: carBrand,
            carModel: carModel,
            carPlate: carPlate,
            risks: tempPolicyRisks || [], 
            reqAc: reqAc, 
            reqOc: reqOc, 
            acDone: existingPolicy ? (existingPolicy.acDone || false) : false, 
            ocDone: existingPolicy ? (existingPolicy.ocDone || false) : false,
            renewalStatus: existingPolicy ? (existingPolicy.renewalStatus || "todo") : "todo",
            renewalHandled: existingPolicy ? (existingPolicy.renewalHandled || false) : false,
            renewalArchived: existingPolicy ? (existingPolicy.renewalArchived || false) : false
        };

        if(editingPolicyId) { 
            let idx = policiesList.findIndex(x => String(x.id) === String(editingPolicyId)); 
            if(idx >= 0) policiesList[idx] = pData; 
        } else { 
            policiesList.push(pData); 
        }
        
        syncAndRender(); 
        closePolicyModal(); 
        showToast(`✅ Polisa zapisana pomyślnie!`);

        if(currentOpenId && String(currentOpenId) === String(selectedClientIdForPolicy) && !document.getElementById('clientFullModalOverlay').classList.contains('hidden')) {
            populateClientFull(currentOpenId); 
        }
        if(currentOpenPolicyId && String(currentOpenPolicyId) === String(pData.id)) {
            populateDrawer('policy', pData.id);
        }
    } catch (err) {
        console.error("Błąd podczas zapisu polisy:", err);
        alert("Wystąpił błąd podczas zapisu polisy: " + err.message);
    }
}
// app.js - Główna logika biznesowa Agent 1.0 Pro (Wersja 3.0 - CZĘŚĆ 2 z 2)

function saveDrawerCommissionOverride() {
    if(!currentOpenPolicyId) return;
    let p = policiesList.find(x => String(x.id) === String(currentOpenPolicyId));
    if(!p) return;

    let commInp = document.getElementById('pd_commInput');
    let noteInp = document.getElementById('pd_commNoteInput');

    if(commInp) {
        let newComm = parseFloat(String(commInp.value).replace(',', '.'));
        if(!isNaN(newComm) && newComm >= 0) {
            p.commissionAmt = newComm;
            p.isManualComm = true;
        }
    }
    if(noteInp) {
        p.commNote = noteInp.value.trim();
    }

    syncAndRender();
    populateDrawer('policy', p.id);
    showToast(`💰 Zaktualizowano prowizję łączną: ${formatPLN(p.commissionAmt)}`);
}

function saveOdpisFromDrawer() {
    if(!currentOpenPolicyId) return;
    let p = policiesList.find(x => String(x.id) === String(currentOpenPolicyId));
    if(!p) return;

    let odpisInp = document.getElementById('pd_odpisInput');
    let reasonInp = document.getElementById('pd_odpisReason');

    let odpisVal = odpisInp ? (parseFloat(String(odpisInp.value).replace(',', '.')) || 0) : 0;
    let odpisReason = reasonInp ? reasonInp.value : "";

    p.odpis = odpisVal;
    p.odpisReason = odpisReason;
    syncAndRender();
    populateDrawer('policy', p.id);
    showToast(`📉 Zapisano odpis / storno: ${formatPLN(odpisVal)}`);
}

function updatePolicySettlement(statusVal) {
    if(!currentOpenPolicyId) return;
    let p = policiesList.find(x => String(x.id) === String(currentOpenPolicyId));
    if(p) {
        p.settlementStatus = statusVal;
        syncAndRender();
        populateDrawer('policy', p.id);
    }
}

function updateRataCommTu(policyId, rataIdx, commVal) {
    let p = policiesList.find(x => String(x.id) === String(policyId));
    if(!p) return;
    let cleanStr = String(commVal || "").replace(',', '.').trim();
    let parsed = cleanStr === "" ? "" : (parseFloat(cleanStr) || 0);

    if (rataIdx === 1) {
        p.firstPaymentComm = parsed;
    } else if (p.installmentDates && p.installmentDates[rataIdx]) {
        p.installmentDates[rataIdx].commTu = parsed;
    }

    syncAndRender();
    if(currentOpenPolicyId && String(currentOpenPolicyId) === String(policyId)) {
        populateDrawer('policy', p.id);
    }
    showToast(`💰 Zapisano prowizję z wyciągu TU dla Raty ${rataIdx}`);
}

function populateDrawer(type, id) {
    if (type === 'policy') {
        const p = policiesList.find(x => String(x.id) === String(id)); 
        if(!p) return; 
        currentOpenPolicyId = p.id; 
        const c = clientsList.find(x => String(x.id) === String(p.clientId));
        
        document.getElementById('pd_insurer').innerText = p.insurer + (p.salesType === 'renewal' ? " (Wznowienie)" : " (Nowa)") + (p.paymentMethod === 'Gotówka' ? " 💵 [Gotówka]" : ""); 
        document.getElementById('pd_type').innerText = p.type || "-"; 
        document.getElementById('pd_number').innerText = "Nr: " + (p.number || "brak");
        
        let clientNameEl = document.getElementById('pd_clientName'); 
        if(clientNameEl) {
            clientNameEl.innerText = c ? c.name : "Nieznany klient"; 
            clientNameEl.onclick = c ? () => { closeDrawer('policy'); openClientFull(c.id); } : null;
        }
        
        document.getElementById('pd_subject').innerText = p.subject || "-"; 
        document.getElementById('pd_start').innerText = p.dateStart || "-"; 
        document.getElementById('pd_end').innerText = p.dateEnd || "-";
        
        let rList = document.getElementById('pd_risksList'); 
        if(rList) {
            rList.innerHTML = ""; 
            if(p.risks && p.risks.length > 0) { 
                p.risks.forEach(r => { 
                    rList.innerHTML += `<div class="flex justify-between border-b border-gray-200 pb-1"><span>${r.name}</span> <span class="font-bold text-goldAccent">${formatPLN(r.premium)} (${r.pct}%)</span></div>`; 
                }); 
            } else { 
                rList.innerHTML = "<p class='text-xs text-textMuted'>Brak rozbicia na ryzyka (wpisano kwotę łączną).</p>"; 
            }
        }

        let netPrem = getPolicyNetPremium(p);
        let rawEl = document.getElementById('pd_premiumRaw');
        if(rawEl) rawEl.innerText = formatPLN(p.premium) + (p.installments > 1 ? ` (${p.installments} rat)` : "");
        
        let odpisInp = document.getElementById('pd_odpisInput');
        if(odpisInp) odpisInp.value = p.odpis ? Number(p.odpis).toFixed(2) : "";
        
        let odpisReas = document.getElementById('pd_odpisReason');
        if(odpisReas) odpisReas.value = p.odpisReason || "";
        
        let netEl = document.getElementById('pd_premiumNet');
        if(netEl) netEl.innerText = formatPLN(netPrem);

        let commInp = document.getElementById('pd_commInput');
        if(commInp) commInp.value = Number(p.commissionAmt || 0).toFixed(2);
        
        let noteInp = document.getElementById('pd_commNoteInput');
        if(noteInp) noteInp.value = p.commNote || "";

        let commStatusEl = document.getElementById('pd_commManualStatus');
        if(commStatusEl) commStatusEl.innerText = p.isManualComm ? "(Wpisana ręcznie)" : "(Wyliczona z ryzyk)";

        let scansCheck = document.getElementById('pd_scansSent');
        let cashCheck = document.getElementById('pd_cashPaidToTu');
        if(scansCheck) scansCheck.checked = p.scansSent || false;
        if(cashCheck) {
            cashCheck.checked = p.cashPaidToTu || false;
            cashCheck.parentElement.classList.toggle('hidden', p.paymentMethod !== 'Gotówka');
        }

        let setSelect = document.getElementById('pd_settlementStatus');
        if(setSelect) setSelect.value = p.settlementStatus || "nierozliczona";

        let instBox = document.getElementById('pd_installmentsBox'); 
        let instList = document.getElementById('pd_installmentsList'); 
        if(instBox && instList) {
            instList.innerHTML = '';
            let instCount = parseInt(p.installments) || 1;
            let cb = getPolicyCommissionBreakdown(p);
            let balanceBadge = document.getElementById('pd_commBalanceBadge');
            if(balanceBadge) {
                balanceBadge.innerText = `Odebrano: ${formatPLN(cb.paid)} / ${formatPLN(cb.total)}`;
            }

            instBox.classList.remove('hidden'); 
            let firstAmt = getFirstInstallmentAmount(p);
            let isCanceled = (p.settlementStatus === 'anulowana');
            let firstStatusLabel = (!p.firstPaymentPaid && isCanceled) ? `<span class="text-[10px] text-red-600 font-bold ml-1">(Storno)</span>` : '';
            let fpCommVal = (p.firstPaymentComm !== undefined && p.firstPaymentComm !== null) ? p.firstPaymentComm : '';

            instList.innerHTML += `
                <div class="bg-white p-2.5 rounded-lg border border-amber-200/80 space-y-1.5">
                    <div class="flex justify-between items-center">
                        <label class="flex items-center cursor-pointer">
                            <input type="checkbox" ${p.firstPaymentPaid ? 'checked' : ''} onchange="toggleInstPaid('${p.id}', 1)" class="w-4 h-4 accent-green-600">
                            <span class="text-xs font-bold text-textDark ml-2">${instCount > 1 ? 'Rata I:' : 'Płatność:'} ${firstStatusLabel}</span>
                        </label>
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-extrabold ${p.firstPaymentPaid ? 'text-green-600' : 'text-textDark'}">${formatPLN(firstAmt)}</span>
                            <button onclick="sendPaymentReminderSms('${p.id}', 1)" class="text-[11px] bg-blue-50 text-blue-700 hover:bg-blue-100 px-1.5 py-0.5 rounded font-bold" title="Kopiuj SMS z przypomnieniem">💬 SMS</button>
                        </div>
                    </div>
                    <div class="flex justify-between items-center text-[11px] pt-1 border-t border-gray-100">
                        <span class="text-textMuted">Termin: <b>${p.firstPaymentDate || p.dateStart || '-'}</b></span>
                        <div class="flex items-center gap-1">
                            <span class="text-[10px] text-green-800 font-semibold">Prowizja TU:</span>
                            <input type="number" step="0.01" value="${fpCommVal}" placeholder="${(cb.total / instCount).toFixed(2)}" onchange="updateRataCommTu('${p.id}', 1, this.value)" class="w-20 border rounded p-1 text-right text-xs font-bold text-green-700">
                        </div>
                    </div>
                </div>`;
            
            if(instCount > 1 && p.installmentDates) { 
                for(let i=2; i<=instCount; i++) { 
                    let dInfo = p.installmentDates[i]; 
                    if(dInfo) {
                        let statusLbl = (!dInfo.paid && isCanceled) ? `<span class="text-[10px] text-red-600 font-bold ml-1">(Wygasła)</span>` : '';
                        let rCommVal = (dInfo.commTu !== undefined && dInfo.commTu !== null) ? dInfo.commTu : '';
                        instList.innerHTML += `
                            <div class="bg-white p-2.5 rounded-lg border border-amber-200/80 space-y-1.5">
                                <div class="flex justify-between items-center">
                                    <label class="flex items-center cursor-pointer">
                                        <input type="checkbox" ${dInfo.paid ? 'checked' : ''} onchange="toggleInstPaid('${p.id}', ${i})" class="w-4 h-4 accent-green-600">
                                        <span class="text-xs font-bold text-textDark ml-2">Rata ${i}: ${statusLbl}</span>
                                    </label>
                                    <div class="flex items-center gap-2">
                                        <span class="text-xs font-extrabold ${dInfo.paid ? 'text-green-600' : 'text-textDark'}">${formatPLN(dInfo.amount)}</span>
                                        <button onclick="sendPaymentReminderSms('${p.id}', ${i})" class="text-[11px] bg-blue-50 text-blue-700 hover:bg-blue-100 px-1.5 py-0.5 rounded font-bold" title="Kopiuj SMS z przypomnieniem">💬 SMS</button>
                                    </div>
                                </div>
                                <div class="flex justify-between items-center text-[11px] pt-1 border-t border-gray-100">
                                    <span class="text-textMuted">Termin: <b>${dInfo.date || '-'}</b></span>
                                    <div class="flex items-center gap-1">
                                        <span class="text-[10px] text-green-800 font-semibold">Prowizja TU:</span>
                                        <input type="number" step="0.01" value="${rCommVal}" placeholder="${(cb.total / instCount).toFixed(2)}" onchange="updateRataCommTu('${p.id}', ${i}, this.value)" class="w-20 border rounded p-1 text-right text-xs font-bold text-green-700">
                                    </div>
                                </div>
                            </div>`; 
                    }
                } 
            }
        }

        let tBox = document.getElementById('pd_tasksBox');
        let acBox = document.getElementById('pd_taskAcContainer');
        let ocBox = document.getElementById('pd_taskOcContainer');
        if(tBox && acBox && ocBox) {
            tBox.classList.add('hidden'); acBox.classList.add('hidden'); ocBox.classList.add('hidden');
            if(p.reqAc || p.reqOc) {
                tBox.classList.remove('hidden');
                if(p.reqAc) { acBox.classList.remove('hidden'); document.getElementById('pd_taskAc').checked = p.acDone || false; }
                if(p.reqOc) { ocBox.classList.remove('hidden'); document.getElementById('pd_taskOc').checked = p.ocDone || false; }
            }
        }
    }
}

function toggleInstPaid(id, idx) { 
    let p = policiesList.find(x => String(x.id) === String(id)); 
    if(!p) return; 
    if(idx === 1) p.firstPaymentPaid = !p.firstPaymentPaid; 
    else if(p.installmentDates && p.installmentDates[idx]) p.installmentDates[idx].paid = !p.installmentDates[idx].paid; 
    syncAndRender(); 
    populateDrawer('policy', p.id); 
}

function togglePolicyTask(taskType) {
    let p = policiesList.find(x => String(x.id) === String(currentOpenPolicyId)); 
    if(!p) return;
    if(taskType === 'ac') p.acDone = document.getElementById('pd_taskAc').checked;
    if(taskType === 'oc') p.ocDone = document.getElementById('pd_taskOc').checked;
    syncAndRender();
}

function deletePolicy(id) { 
    if(confirm("Usunąć polisę na stałe?")) { 
        policiesList = policiesList.filter(p => String(p.id) !== String(id)); 
        closeDrawer('policy'); 
        syncAndRender(); 
        if(currentOpenId && !document.getElementById('clientFullModalOverlay').classList.contains('hidden')) {
            populateClientFull(currentOpenId); 
        }
    } 
}

function clonePolicyToRenewal() {
    if(!currentOpenPolicyId) return;
    let p = policiesList.find(x => String(x.id) === String(currentOpenPolicyId)); 
    if(!p) return;
    closeDrawer('policy');
    openPolicyModal(null, p.clientId);
    
    document.getElementById('p_insurer').value = p.insurer;
    document.getElementById('p_type').value = p.type || "Komunikacja";
    handlePolicyTypeChange();
    let renRadio = document.querySelector('input[name="p_salesType"][value="renewal"]');
    if(renRadio) renRadio.checked = true;
    
    if(p.dateStart) document.getElementById('p_dateStart').value = addMonthsToDate(p.dateStart, 12);
    if(p.dateEnd) document.getElementById('p_dateEnd').value = addMonthsToDate(p.dateEnd, 12);
    
    document.getElementById('p_carBrand').value = p.carBrand || "";
    document.getElementById('p_carModel').value = p.carModel || "";
    document.getElementById('p_carPlate').value = p.carPlate || "";
    document.getElementById('p_homeAddress').value = p.subject || "";
    
    tempPolicyRisks = JSON.parse(JSON.stringify(p.risks || []));
    renderTempRisks();
}

// ================= 9. OFERTY I AI =================
function renderOffersList() {
    const tbody = document.getElementById('offersTableBody'); 
    if(!tbody) return; 
    tbody.innerHTML = '';
    if(offersList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-textMuted">Brak zapisanych ofert.</td></tr>`;
        return;
    }
    offersList.forEach(o => {
        let c = clientsList.find(x => String(x.id) === String(o.clientId));
        tbody.innerHTML += `
            <tr class="hover:bg-luxBg/60 transition-all border-l-4 border-transparent hover:border-indigo-500">
                <td class="p-4 text-xs font-bold">${o.date}</td>
                <td class="p-4 font-semibold cursor-pointer hover:underline" onclick="if('${o.clientId}') openClientFull('${o.clientId}')">${c ? c.name : "Nieznany"}</td>
                <td class="p-4 text-xs"><span class="font-bold text-indigo-700 block">${o.type}</span><span class="text-textMuted">${o.subject}</span></td>
                <td class="p-4 text-right">
                    <button onclick="openOfferModal('${o.id}')" class="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded hover:bg-blue-100 mr-1">Edytuj / PDF</button>
                    <button onclick="deleteOffer('${o.id}')" class="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded hover:bg-red-100">Usuń</button>
                </td>
            </tr>`;
    });
}

function populateOfferModal(offerId = null, prefillClientId = null) {
    let clientSel = document.getElementById('off_clientSelect'); 
    clientSel.innerHTML = '<option value="">-- Wybierz klienta --</option>';
    clientsList.forEach(c => { 
        clientSel.innerHTML += `<option value="${c.id}">${c.name} (${c.pesel || c.nip || '-'})</option>`; 
    });
    
    let oIns = document.getElementById('off_tu'); 
    oIns.innerHTML = ""; 
    insurersLibrary.sort().forEach(ins => { 
        oIns.innerHTML += `<option value="${ins}">${ins}</option>`; 
    });

    if(offerId) {
        let o = offersList.find(x => String(x.id) === String(offerId));
        if(o) { 
            clientSel.value = o.clientId || ""; 
            document.getElementById('off_typeSelect').value = o.type; 
            document.getElementById('off_subjectInput').value = o.subject; 
            tempOfferRows = JSON.parse(JSON.stringify(o.rows || [])); 
            document.getElementById('off_recommendationText').value = o.recommendation || "";
        }
    } else { 
        clientSel.value = prefillClientId ? prefillClientId : ""; 
        document.getElementById('off_typeSelect').value = "Majątek (Dom/Mieszkanie)"; 
        document.getElementById('off_subjectInput').value = ""; 
        tempOfferRows = []; 
        document.getElementById('off_recommendationText').value = "";
    }
    renderOfferTable(); 
    updateOfferClientName();
}

function updateOfferClientName() {
    let cid = document.getElementById('off_clientSelect').value;
    let c = clientsList.find(x => String(x.id) === String(cid));
    document.getElementById('pdfClientName').innerText = c ? c.name : "Klient";
}

function addOfferRow() {
    let tu = document.getElementById('off_tu').value; 
    let risks = document.getElementById('off_risks').value.trim(); 
    let rata = document.getElementById('off_rata').value.trim(); 
    let prem = parseFloat(String(document.getElementById('off_prem').value).replace(',', '.'));
    let isRec = document.getElementById('off_isRecommended').checked;
    if(!risks || isNaN(prem)) return alert("Podaj zakres ryzyk i składkę!");
    
    tempOfferRows.push({ tu: tu, risks: risks, rata: rata, prem: prem, isRecommended: isRec });
    document.getElementById('off_risks').value = ""; 
    document.getElementById('off_rata').value = ""; 
    document.getElementById('off_prem').value = ""; 
    document.getElementById('off_isRecommended').checked = false;
    renderOfferTable();
}

function deleteOfferRow(idx) { 
    tempOfferRows.splice(idx, 1); 
    renderOfferTable(); 
}

function convertToPolicy(idx) {
    let row = tempOfferRows[idx]; 
    let cid = document.getElementById('off_clientSelect').value; 
    if(!cid) return alert("Najpierw wybierz klienta u góry oferty!");
    let subj = document.getElementById('off_subjectInput').value;
    closeOfferModal(); 
    openPolicyModal(null, cid);
    
    document.getElementById('p_insurer').value = row.tu; 
    document.getElementById('p_homeAddress').value = subj;
    tempPolicyRisks = [{
        id: Date.now(),
        name: "PAKIET (" + row.risks.substring(0, 20) + ")",
        premium: parseFloat(row.prem) || 0,
        pct: 10,
        comm: (parseFloat(row.prem) || 0) * 0.10
    }];
    renderTempRisks();
}

function copyAIPrompt() {
    if(tempOfferRows.length === 0) return alert("Dodaj najpierw przynajmniej jeden wariant do tabeli!");
    let subj = document.getElementById('off_subjectInput').value || "ubezpieczenie";
    let prompt = `Jesteś ekspertem ubezpieczeniowym. Przygotowałem dla klienta zestawienie ofert na: ${subj}. Oto warianty:\n`;
    tempOfferRows.forEach((r, i) => { 
        prompt += `Wariant ${i+1}: TU ${r.tu}, Składka roczna: ${r.prem} PLN. Zakres: ${r.risks}\n`; 
    });
    prompt += `\nNapisz krótką, profesjonalną rekomendację (3-4 zdania), sugerując optymalny wybór z punktu widzenia stosunku ceny do zakresu. Zwracaj się bezpośrednio do klienta, bez używania imion.`;
    copyToClipboard(prompt, "Prompt AI");
}

function renderOfferTable() {
    let b = document.getElementById('offerTableBody'); 
    if(!b) return;
    b.innerHTML = "";
    if(tempOfferRows.length === 0) {
        b.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-textMuted text-xs">Brak wariantów.</td></tr>`;
        return;
    }
    tempOfferRows.forEach((r, idx) => {
        let recStyle = r.isRecommended ? 'bg-green-50 border-l-4 border-green-500' : 'border-t border-gray-200';
        let recBadge = r.isRecommended ? '<span class="block text-[10px] text-green-700 uppercase font-bold mt-1">⭐ Polecany</span>' : '';
        b.innerHTML += `
            <tr class="${recStyle}">
                <td class="p-3 font-extrabold text-gray-900">${r.tu} ${recBadge}</td>
                <td class="p-3 text-gray-700">${r.risks}</td>
                <td class="p-3 text-right font-semibold">${r.rata ? r.rata : '-'}</td>
                <td class="p-3 text-right font-extrabold text-indigo-700">${formatPLN(r.prem)}</td>
                <td class="p-3 text-right hide-on-print">
                    <button onclick="convertToPolicy(${idx})" class="text-[10px] bg-goldAccent text-white px-2 py-1 rounded mr-1 font-bold">🛡️ Wystaw</button>
                    <button onclick="deleteOfferRow(${idx})" class="text-red-500 text-xs font-bold hover:underline">X</button>
                </td>
            </tr>`;
    });
}

function saveOffer() {
    let cid = document.getElementById('off_clientSelect').value; 
    if(!cid) return alert("Wybierz klienta!");
    let subj = document.getElementById('off_subjectInput').value.trim() || "Przedmiot"; 
    let typeVal = document.getElementById('off_typeSelect').value;
    let rec = document.getElementById('off_recommendationText').value;
    let oData = { 
        id: editingOfferId || Date.now(), 
        clientId: cid, 
        date: new Date().toISOString().split('T')[0], 
        type: typeVal, 
        subject: subj, 
        recommendation: rec, 
        rows: JSON.parse(JSON.stringify(tempOfferRows)) 
    };
    if(editingOfferId) { 
        let idx = offersList.findIndex(x => String(x.id) === String(editingOfferId)); 
        if(idx >= 0) offersList[idx] = oData; 
    } else { 
        offersList.push(oData); 
    }
    syncAndRender(); 
    closeOfferModal();
    showToast(`📋 Zapisano ofertę w CRM!`);
}

function deleteOffer(id) { 
    if(confirm("Usunąć ofertę?")) { 
        offersList = offersList.filter(o => String(o.id) !== String(id)); 
        syncAndRender(); 
    } 
}

function generatePDF() {
    if(tempOfferRows.length === 0) return alert("Brak wariantów w tabeli!");
    let cid = document.getElementById('off_clientSelect').value; 
    let c = clientsList.find(x => String(x.id) === String(cid));
    document.getElementById('pdfClientName').innerText = c ? c.name : "Klient"; 
    document.getElementById('pdfSubject').innerText = document.getElementById('off_subjectInput').value || "-"; 
    document.getElementById('pdfCalcDate').innerText = new Date().toLocaleDateString('pl-PL');
    
    let recText = document.getElementById('off_recommendationText').value.trim();
    if(!recText) document.getElementById('offerRecommendationArea').classList.add('hidden');
    
    document.getElementById('pdfHeader').classList.remove('hidden'); 
    document.getElementById('offerSetupArea').classList.add('hidden'); 
    document.getElementById('offerFormArea').classList.add('hidden'); 
    document.getElementById('off_actionCol').classList.add('hidden');
    let rows = document.querySelectorAll('.hide-on-print'); 
    rows.forEach(r => r.style.display = 'none');
    
    html2pdf().set({ 
        margin: 10, 
        filename: `Oferta_${c ? c.name.replace(/\s+/g,'_') : 'Ubezpieczenia'}.pdf`, 
        image: { type: 'jpeg', quality: 0.98 }, 
        html2canvas: { scale: 2 }, 
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } 
    }).from(document.getElementById('offerPrintArea')).save().then(() => {
        document.getElementById('pdfHeader').classList.add('hidden'); 
        document.getElementById('offerSetupArea').classList.remove('hidden'); 
        document.getElementById('offerFormArea').classList.remove('hidden'); 
        document.getElementById('off_actionCol').classList.remove('hidden');
        document.getElementById('offerRecommendationArea').classList.remove('hidden');
        rows.forEach(r => r.style.display = '');
    });
}

// ================= 10. DASHBOARD, ROZLICZENIA Z TU, PORTFEL GOTÓWKOWY =================
function updateKanbanStatus(policyId, status) { 
    let p = policiesList.find(x => String(x.id) === String(policyId)); 
    if(p) { 
        p.renewalStatus = status; 
        syncAndRender(); 
    } 
}

function renderDashboard() {
    let today = new Date(); 
    today.setHours(0,0,0,0); 
    let currentMonth = today.getMonth() + 1;
    let overdueHtml = '', upcomingHtml = '', thirtyDaysHtml = '', birthdaysHtml = '', tuSettleHtml = '';
    let kbTodo = '', kbOffer = '', kbWon = '', kbLost = '';
    let monthPremNet = 0, monthComm = 0, countPolicies = 0, cashInHand = 0, thirtyDaysCount = 0, tuSettleCount = 0;
    
    let showArchivedKb = document.getElementById('kb_showArchived') ? document.getElementById('kb_showArchived').checked : false;

    clientsList.forEach(c => { 
        if(c.birth) { 
            let bDate = new Date(c.birth); 
            if((bDate.getMonth() + 1) === currentMonth) { 
                let age = today.getFullYear() - bDate.getFullYear(); 
                birthdaysHtml += `<div class="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 font-semibold cursor-pointer" onclick="openClientFull('${c.id}')">🎈 ${c.name} (${age} l.) - ${String(bDate.getDate()).padStart(2, '0')}.${String(currentMonth).padStart(2, '0')}</div>`; 
            } 
        } 
    });
    
    vehiclesList.forEach(v => {
        if(v.inspection) {
            let insp = new Date(v.inspection); 
            let diffDays = Math.ceil((insp - today) / (1000 * 60 * 60 * 24));
            if(diffDays >= 0 && diffDays <= 30) {
                birthdaysHtml += `<div class="w-full flex justify-between items-center bg-gray-50 border border-gray-200 p-2 rounded text-xs cursor-pointer" onclick="openClientFull('${v.clientId}')"><span class="font-bold text-gray-700">🔧 Przegląd: ${v.plate}</span><span class="text-amber-600 font-bold">za ${diffDays} dni</span></div>`;
            }
        }
    });

    externalPoliciesList.forEach(ep => {
        if(ep.dateEnd) {
            let eEnd = new Date(ep.dateEnd); 
            let diffDays = Math.ceil((eEnd - today) / (1000 * 60 * 60 * 24));
            if(diffDays >= 0 && diffDays <= 45) {
                let c = clientsList.find(x => String(x.id) === String(ep.clientId));
                if(c) {
                    thirtyDaysHtml += `<div class="flex justify-between items-center bg-green-50 p-2.5 rounded-xl border border-green-200"><div><span class="font-bold cursor-pointer hover:underline text-green-900" onclick="openClientFull('${c.id}')">${c.name}</span> <span class="text-xs text-green-700 font-bold">(OBCA: ${ep.subject})</span></div><div class="text-right"><span class="text-xs font-bold text-green-700">Przejęcie za ${diffDays} dni!</span></div></div>`;
                }
            }
        }
    });

    policiesList.forEach(p => {
        let c = clientsList.find(x => String(x.id) === String(p.clientId)); 
        let cName = c ? c.name : "Nieznany klient";
        let isCanceled = (p.settlementStatus === 'anulowana');
        let netPrem = getPolicyNetPremium(p);

        // Naprawione zliczanie gotówki w ręku: każda polisa gotówkowa bez odhaczonego "Wpłacone do TU" wlicza się od razu!
        let unsettledCash = getUnsettledCashAmount(p);
        cashInHand += unsettledCash;

        let needsTuAction = false;
        let tuReasons = [];
        if (!p.scansSent) { needsTuAction = true; tuReasons.push("📄 Skany do wysłania"); }
        if (unsettledCash > 0) {
            needsTuAction = true;
            tuReasons.push(`💵 Gotówka: ${formatPLN(unsettledCash)}`);
        }
        if (needsTuAction && !isCanceled) {
            tuSettleCount++;
            tuSettleHtml += `
                <div class="p-2.5 bg-white rounded-xl border border-purple-200 flex justify-between items-center text-xs">
                    <div>
                        <span class="font-bold text-purple-900 cursor-pointer hover:underline" onclick="openDrawer('policy', '${p.id}')">${p.insurer} (${p.subject || 'Polisa'})</span>
                        <p class="text-[11px] text-textMuted">${cName} | <span class="font-bold text-purple-700">${tuReasons.join(' | ')}</span></p>
                    </div>
                    <div class="flex gap-1">
                        ${!p.scansSent ? `<button onclick="toggleTuAction('scans', '${p.id}')" class="text-[10px] bg-purple-50 text-purple-700 border border-purple-300 hover:bg-purple-100 px-2 py-1 rounded font-bold">Skany ✓</button>` : ''}
                        ${(unsettledCash > 0) ? `<button onclick="toggleTuAction('cash', '${p.id}')" class="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 px-2 py-1 rounded font-bold">Wpłacone ✓</button>` : ''}
                    </div>
                </div>`;
        }

        if(p.dateStart && new Date(p.dateStart).getMonth() + 1 === currentMonth && new Date(p.dateStart).getFullYear() === today.getFullYear()) { 
            if(!isCanceled) {
                monthPremNet += netPrem; 
                monthComm += parseFloat(p.commissionAmt) || 0; 
                countPolicies++; 
            } else if(p.firstPaymentPaid) {
                let numInst = parseInt(p.installments) || 1;
                monthPremNet += getFirstInstallmentAmount(p);
                monthComm += (parseFloat(p.commissionAmt) || 0) / numInst;
                countPolicies++;
            }
        }
        
        if(p.reqAc && !p.acDone && !isCanceled) { 
            overdueHtml += `<div class="flex justify-between items-center bg-red-50 p-2 rounded-lg border border-red-200"><div><span class="font-bold text-red-800 cursor-pointer hover:underline" onclick="openDrawer('policy', '${p.id}')">${cName}</span><p class="text-xs text-red-600 font-bold">📸 Brak zdjęć do AC (${p.subject || ''})!</p></div></div>`; 
        }
        if(p.reqOc && !p.ocDone && !isCanceled) { 
            overdueHtml += `<div class="flex justify-between items-center bg-red-50 p-2 rounded-lg border border-red-200"><div><span class="font-bold text-red-800 cursor-pointer hover:underline" onclick="openDrawer('policy', '${p.id}')">${cName}</span><p class="text-xs text-red-600 font-bold">✉️ Nie wysłano wypowiedzenia OC!</p></div></div>`; 
        }

        if(p.dateEnd && !isCanceled && !p.renewalHandled) {
            let dEnd = new Date(p.dateEnd); 
            let diffDays = Math.ceil((dEnd - today) / (1000 * 60 * 60 * 24));
            if(diffDays >= 0 && diffDays <= 30) { 
                thirtyDaysCount++;
                thirtyDaysHtml += `
                    <div class="flex justify-between items-center bg-luxBg p-2.5 rounded-xl border border-luxBorder">
                        <div>
                            <span class="font-bold cursor-pointer hover:underline text-textDark" onclick="if('${p.clientId}') openClientFull('${p.clientId}')">${cName}</span> 
                            <span class="text-xs text-textMuted">(${p.insurer} - ${p.subject || ''})</span>
                            <span class="block text-[11px] text-amber-700 font-bold">Koniec za ${diffDays} dni (${p.dateEnd})</span>
                        </div>
                        <div class="flex gap-1.5">
                            <button onclick="sendPaymentReminderSms('${p.id}', 1)" class="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-2 py-1 rounded font-bold" title="Kopiuj SMS ze wznowieniem">💬 SMS</button>
                            <button onclick="markRenewalAsHandled('${p.id}')" class="text-xs bg-green-600 hover:bg-green-700 text-white px-2.5 py-1 rounded font-bold shadow-sm">Załatwione ✓</button>
                        </div>
                    </div>`; 
            }
        }

        if(p.dateEnd && !isCanceled) {
            let dEnd = new Date(p.dateEnd); 
            let diffDays = Math.ceil((dEnd - today) / (1000 * 60 * 60 * 24));
            if(diffDays >= 0 && diffDays <= 45) {
                if(!p.renewalArchived || showArchivedKb) {
                    let bColor = diffDays < 10 ? 'text-red-600' : 'text-amber-600'; 
                    let actions = '';
                    if(p.renewalStatus === 'todo' || !p.renewalStatus) {
                        actions = `<button onclick="updateKanbanStatus('${p.id}', 'offer')" class="text-[10px] bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold">Oferta ➔</button>`;
                    } else if(p.renewalStatus === 'offer') {
                        actions = `<button onclick="updateKanbanStatus('${p.id}', 'won')" class="text-[10px] bg-green-100 text-green-800 px-2 py-1 rounded mr-1 font-bold">✅ Sukces</button><button onclick="updateKanbanStatus('${p.id}', 'lost')" class="text-[10px] bg-red-100 text-red-800 px-2 py-1 rounded font-bold">❌ Utracone</button>`;
                    } else if(p.renewalStatus === 'won' || p.renewalStatus === 'lost') {
                        actions = p.renewalArchived 
                            ? `<button onclick="unarchiveKanbanCard('${p.id}')" class="text-[10px] bg-gray-200 text-gray-700 px-2 py-0.5 rounded font-bold">Przywróć</button>` 
                            : `<button onclick="archiveKanbanCard('${p.id}')" class="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-0.5 rounded font-bold">Ukryj / Zamknij</button>`;
                    }

                    let card = `
                        <div class="bg-white p-3 rounded-lg shadow-sm border border-luxBorder relative ${p.renewalArchived ? 'opacity-50' : ''}">
                            <p class="font-bold text-sm text-textDark cursor-pointer hover:text-goldAccent" onclick="if('${p.clientId}') openClientFull('${p.clientId}')">${cName}</p>
                            <p class="text-xs text-textMuted">${p.insurer} | ${p.subject || ''}</p>
                            <div class="flex justify-between items-center mt-2">
                                <span class="text-[10px] font-bold ${bColor}">Koniec: ${p.dateEnd}</span>
                            </div>
                            <div class="mt-2.5 flex justify-end border-t pt-2 gap-1">${actions}</div>
                        </div>`;

                    let s = p.renewalStatus || 'todo'; 
                    if(s === 'todo') kbTodo += card; 
                    if(s === 'offer') kbOffer += card; 
                    if(s === 'won') kbWon += card; 
                    if(s === 'lost') kbLost += card; 
                }
            }
        }

        if(!isCanceled) {
            let makeOverdueRow = (rataName, dateStr, amt) => { overdueHtml += `<div class="flex justify-between items-center bg-red-50 p-2 rounded-lg border border-red-200"><div><span class="font-bold text-red-800 cursor-pointer hover:underline" onclick="openDrawer('policy', '${p.id}')">${cName}</span><p class="text-xs text-red-600">${rataName}: <span class="font-bold">${dateStr}</span> (${formatPLN(amt)})</p></div></div>`; };
            let makeUpcomingRow = (rataName, dateStr, amt) => { upcomingHtml += `<div class="flex justify-between items-center bg-amber-50 p-2 rounded-lg border border-amber-200"><div><span class="font-bold text-amber-900 cursor-pointer hover:underline" onclick="openDrawer('policy', '${p.id}')">${cName}</span><p class="text-xs text-amber-700">${rataName}: <span class="font-bold">${dateStr}</span> (${formatPLN(amt)})</p></div></div>`; };
            
            let next7Days = new Date(today); 
            next7Days.setDate(today.getDate() + 7);
            if(p.firstPaymentDate && !p.firstPaymentPaid) {
                let dFP = new Date(p.firstPaymentDate); 
                let amt = getFirstInstallmentAmount(p);
                if(dFP < today) makeOverdueRow(p.installments > 1 ? 'I rata' : 'Całość', p.firstPaymentDate, amt);
                else if(dFP >= today && dFP <= next7Days) makeUpcomingRow(p.installments > 1 ? 'I rata' : 'Całość', p.firstPaymentDate, amt);
            }
            if(p.installments > 1 && p.installmentDates) {
                for(let i in p.installmentDates) { 
                    let inst = p.installmentDates[i]; 
                    if(inst && inst.date && !inst.paid) { 
                        let dInst = new Date(inst.date); 
                        if(dInst < today) makeOverdueRow(`Rata ${i}`, inst.date, inst.amount); 
                        else if(dInst >= today && dInst <= next7Days) makeUpcomingRow(`Rata ${i}`, inst.date, inst.amount); 
                    } 
                } 
            }
        }
    });

    if(document.getElementById('dash_countPolicies')) document.getElementById('dash_countPolicies').innerText = countPolicies; 
    if(document.getElementById('dash_monthPrem')) document.getElementById('dash_monthPrem').innerText = formatPLN(monthPremNet); 
    if(document.getElementById('dash_monthComm')) document.getElementById('dash_monthComm').innerText = formatPLN(monthComm);
    if(document.getElementById('dash_cashInHand')) document.getElementById('dash_cashInHand').innerText = formatPLN(cashInHand);

    if(document.getElementById('dash_tuSettleCount')) document.getElementById('dash_tuSettleCount').innerText = `${tuSettleCount} do zrobienia`;
    if(document.getElementById('dash_tuSettlementList')) document.getElementById('dash_tuSettlementList').innerHTML = tuSettleHtml || '<p class="text-xs text-purple-700/60 italic py-2">Wszystkie skany i gotówka rozliczone z TU!</p>';

    if(document.getElementById('dash_thirtyDaysCount')) document.getElementById('dash_thirtyDaysCount').innerText = `${thirtyDaysCount} spraw`;
    if(document.getElementById('dash_thirtyDays')) document.getElementById('dash_thirtyDays').innerHTML = thirtyDaysHtml || '<p class="text-sm text-textMuted py-2">Brak spraw wymagających kontaktu.</p>';

    if(document.getElementById('dash_birthdays')) document.getElementById('dash_birthdays').innerHTML = birthdaysHtml || '<p class="text-xs text-textMuted">Brak urodzin/przeglądów.</p>';
    if(document.getElementById('dash_overdue')) document.getElementById('dash_overdue').innerHTML = overdueHtml || '<p class="text-sm text-green-700 font-semibold">Brak zaległych zadań i płatności.</p>';
    if(document.getElementById('dash_upcoming')) document.getElementById('dash_upcoming').innerHTML = upcomingHtml || '<p class="text-sm text-textMuted">Brak rat w najbliższym tygodniu.</p>';
    
    if(document.getElementById('k_todo')) { 
        document.getElementById('k_todo').innerHTML = kbTodo || '<p class="text-[10px] text-gray-400">Brak polis.</p>'; 
        document.getElementById('k_offer').innerHTML = kbOffer || '<p class="text-[10px] text-gray-400">Brak ofert.</p>'; 
        document.getElementById('k_won').innerHTML = kbWon || ''; 
        document.getElementById('k_lost').innerHTML = kbLost || ''; 
    }
    
    let g = monthlyGoalAmount || 10000;
    if(document.getElementById('dash_goalText')) document.getElementById('dash_goalText').innerText = `${formatPLN(monthPremNet)} / ${formatPLN(g)}`;
    let pct = Math.min((monthPremNet / g) * 100, 100); 
    if(document.getElementById('dash_goalBar')) document.getElementById('dash_goalBar').style.width = pct + '%';
}

// ================= 11. FINANSE, YOY I EKSPORT CSV =================
function renderFinances() {
    let yearsMap = {}; 
    let paidComm = 0, pendingComm = 0, premiumPaid = 0, premiumPending = 0; 
    let listHtml = "";
    
    let filterVal = document.getElementById('financeMonthFilter') ? document.getElementById('financeMonthFilter').value : null; 
    let fYear = filterVal ? parseInt(filterVal.split('-')[0]) : null; 
    let fMonth = filterVal ? parseInt(filterVal.split('-')[1]) : null;
    let statusFilter = document.getElementById('financeStatusFilter') ? document.getElementById('financeStatusFilter').value : 'all';

    policiesList.forEach(p => {
        let isCanceled = (p.settlementStatus === 'anulowana');
        let pStatus = p.settlementStatus || 'nierozliczona';

        let y = p.dateStart ? new Date(p.dateStart).getFullYear() : null; 
        if(y && !isNaN(y)) { 
            if(!yearsMap[y]) yearsMap[y] = { premiumNet: 0, odpis: 0, commTotal: 0, commPaid: 0, commPending: 0 }; 
            yearsMap[y].odpis += parseFloat(p.odpis) || 0;
        }

        let c = clientsList.find(x => String(x.id) === String(p.clientId)); 
        let totalComm = parseFloat(p.commissionAmt) || 0; 
        let numInst = parseInt(p.installments) || 1; 
        
        let processInstallment = (rataLabel, dateStr, amountStr, isPaid, rataCommVal) => {
            if(isCanceled && !isPaid) return;

            let cAmt = parseFloat(amountStr) || 0;
            let thisComm = (rataCommVal !== undefined && rataCommVal !== null && rataCommVal !== "") 
                ? (parseFloat(rataCommVal) || 0)
                : (totalComm / numInst);

            if(y && yearsMap[y]) {
                yearsMap[y].premiumNet += cAmt;
                yearsMap[y].commTotal += thisComm;
                if(isPaid) yearsMap[y].commPaid += thisComm; 
                else yearsMap[y].commPending += thisComm; 
            }

            if(statusFilter !== 'all' && pStatus !== statusFilter) return;

            let d = dateStr ? new Date(dateStr) : (p.dateStart ? new Date(p.dateStart) : null);
            if(fYear && fMonth && d && !isNaN(d.getTime())) {
                if(d.getFullYear() !== fYear || (d.getMonth() + 1) !== fMonth) return;
            }

            if(isPaid) { 
                premiumPaid += cAmt; 
                paidComm += thisComm; 
            } else { 
                premiumPending += cAmt; 
                pendingComm += thisComm; 
            }

            let statusBadge = pStatus === 'rozliczona' 
                ? `<span class="text-[10px] bg-green-100 text-green-800 px-2 py-0.5 rounded font-bold">✅ Rozliczona z TU</span>` 
                : (pStatus === 'anulowana' ? `<span class="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded font-bold">❌ Storno</span>` : `<span class="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold">⏳ Nierozliczona</span>`);
            
            let paidBadge = isPaid 
                ? `<span class="text-[10px] text-green-700 font-bold block">Opłacona przez klienta</span>` 
                : `<span class="text-[10px] text-red-600 font-bold block">Oczekuje na wpłatę</span>`;

            listHtml += `
                <tr class="hover:bg-luxBg/60 transition-all cursor-pointer" onclick="openDrawer('policy', '${p.id}')">
                    <td class="p-4"><span class="font-bold text-textDark">${p.insurer}</span><br><span class="text-xs font-mono text-textMuted">${p.number || '-'}</span></td>
                    <td class="p-4 font-semibold text-goldAccent hover:underline" onclick="event.stopPropagation(); if('${p.clientId}') openClientFull('${p.clientId}')">${c ? c.name : "Nieznany"}</td>
                    <td class="p-4 text-xs font-bold text-textDark">${rataLabel}: ${dateStr || p.dateStart || '-'} ${paidBadge}</td>
                    <td class="p-4">${statusBadge} ${p.paymentMethod === 'Gotówka' ? '<span class="text-[10px] bg-emerald-100 text-emerald-800 px-1 rounded ml-1 font-bold">Gotówka</span>' : ''}</td>
                    <td class="p-4 text-right font-bold ${isPaid ? 'text-blue-600' : 'text-red-600'}">${formatPLN(cAmt)}</td>
                    <td class="p-4 text-right font-extrabold ${isPaid ? 'text-green-600' : 'text-amber-600'}">${formatPLN(thisComm)}</td>
                </tr>`;
        };

        let firstAmt = getFirstInstallmentAmount(p);
        processInstallment(numInst > 1 ? "I rata" : "Jednorazowo", p.firstPaymentDate || p.dateStart, firstAmt, p.firstPaymentPaid, p.firstPaymentComm);

        if (numInst > 1 && p.installmentDates) { 
            for(let i = 2; i <= numInst; i++) { 
                let inst = p.installmentDates[i]; 
                if(inst) processInstallment(`Rata ${i}`, inst.date, inst.amount, inst.paid, inst.commTu); 
            } 
        }
    });
    
    let tbody = document.getElementById('yearlyStatsBody'); 
    if(tbody) {
        tbody.innerHTML = '';
        Object.keys(yearsMap).sort((a,b) => b - a).forEach(y => { 
            let d = yearsMap[y]; 
            tbody.innerHTML += `
                <tr class="hover:bg-luxBg/60 transition-all border-l-4 border-transparent hover:border-goldAccent">
                    <td class="p-4 font-bold text-textDark text-lg">${y}</td>
                    <td class="p-4 text-right font-bold text-indigo-600">${formatPLN(d.premiumNet)}</td>
                    <td class="p-4 text-right font-bold text-red-600">-${formatPLN(d.odpis)}</td>
                    <td class="p-4 text-right font-bold text-blue-600">${formatPLN(d.commTotal)}</td>
                    <td class="p-4 text-right font-bold text-green-600">${formatPLN(d.commPaid)}</td>
                    <td class="p-4 text-right font-bold text-amber-600">${formatPLN(d.commPending)}</td>
                </tr>`; 
        });
    }

    let fp = document.getElementById('f_paidAmount'); if(fp) fp.innerText = formatPLN(paidComm); 
    let fpe = document.getElementById('f_pendingAmount'); if(fpe) fpe.innerText = formatPLN(pendingComm);
    let fpp = document.getElementById('f_premiumPaid'); if(fpp) fpp.innerText = formatPLN(premiumPaid); 
    let fppen = document.getElementById('f_premiumPending'); if(fppen) fppen.innerText = formatPLN(premiumPending);
    let pb = document.getElementById('financePendingBody'); if(pb) pb.innerHTML = listHtml || `<tr><td colspan="6" class="p-6 text-center text-textMuted">Brak pozycji spełniających kryteria filtra.</td></tr>`;
}

function clearFinanceFilter() { 
    document.getElementById('financeMonthFilter').value = ""; 
    if(document.getElementById('financeStatusFilter')) document.getElementById('financeStatusFilter').value = "all";
    renderFinances(); 
}

function exportFinancesCSV() {
    let filterVal = document.getElementById('financeMonthFilter') ? document.getElementById('financeMonthFilter').value : "";
    let statusFilter = document.getElementById('financeStatusFilter') ? document.getElementById('financeStatusFilter').value : 'all';
    let fYear = filterVal ? parseInt(filterVal.split('-')[0]) : null; 
    let fMonth = filterVal ? parseInt(filterVal.split('-')[1]) : null;

    let csvRows = ["TU;Numer Polisy;Klient;PESEL/NIP;Przedmiot;Forma Platnosci;Data Poczatku;Rata;Termin Platnosci;Oplacona przez klienta;Status Rozliczenia TU;Skladka Netto (PLN);Odpis (PLN);Wyplacona Prowizja TU (PLN);Notatka"];

    policiesList.forEach(p => {
        let isCanceled = (p.settlementStatus === 'anulowana');
        let pStatus = p.settlementStatus || 'nierozliczona';
        if(statusFilter !== 'all' && pStatus !== statusFilter) return;

        let c = clientsList.find(x => String(x.id) === String(p.clientId));
        let cName = c ? c.name.replace(/;/g, ',') : "Nieznany";
        let cId = c ? (c.pesel || c.nip || "") : "";
        let subj = (p.subject || "").replace(/;/g, ',');
        let note = (p.commNote || "").replace(/;/g, ',');
        let totalComm = parseFloat(p.commissionAmt) || 0;
        let numInst = parseInt(p.installments) || 1;

        let addCsvLine = (rataName, dateStr, amt, isPaid, commVal) => {
            if(isCanceled && !isPaid) return;
            let d = dateStr ? new Date(dateStr) : (p.dateStart ? new Date(p.dateStart) : null);
            if(fYear && fMonth && d && !isNaN(d.getTime())) {
                if(d.getFullYear() !== fYear || (d.getMonth() + 1) !== fMonth) return;
            }
            let cleanAmt = Number(amt || 0).toFixed(2).replace('.', ',');
            let cleanOdpis = Number(p.odpis || 0).toFixed(2).replace('.', ',');
            let cleanComm = Number((commVal !== undefined && commVal !== "") ? commVal : (totalComm / numInst)).toFixed(2).replace('.', ',');

            csvRows.push(`${p.insurer};"${p.number || ''}";"${cName}";"${cId}";"${subj}";${p.paymentMethod || 'Przelew'};${p.dateStart || ''};${rataName};${dateStr || ''};${isPaid ? 'TAK' : 'NIE'};${pStatus};${cleanAmt};${cleanOdpis};${cleanComm};"${note}"`);
        };

        addCsvLine(numInst > 1 ? "Rata 1" : "Calosc", p.firstPaymentDate || p.dateStart, getFirstInstallmentAmount(p), p.firstPaymentPaid, p.firstPaymentComm);
        if(numInst > 1 && p.installmentDates) {
            for(let i = 2; i <= numInst; i++) {
                let inst = p.installmentDates[i];
                if(inst) addCsvLine(`Rata ${i}`, inst.date, inst.amount, inst.paid, inst.commTu);
            }
        }
    });

    let csvContent = "\uFEFF" + csvRows.join("\r\n");
    let blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    let url = URL.createObjectURL(blob);
    let a = document.createElement("a");
    a.href = url;
    a.download = `Raport_Finansowy_${filterVal || 'Wszystkie'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ================= 12. KOMBAJN ANALITYCZNY (📈 STATYSTYKI) =================
function renderStatistics() {
    let yearSelect = document.getElementById('statsYearFilter');
    if (!yearSelect) return;

    // 1. Zbierz wszystkie unikalne roczniki polis + bieżący rok
    let currentYear = new Date().getFullYear();
    let yearsSet = new Set([currentYear, currentYear - 1]);
    let clientFirstYearMap = {}; // Mapa: clientId -> najwcześniejszy rok polisy

    policiesList.forEach(p => {
        if (p.dateStart) {
            let y = new Date(p.dateStart).getFullYear();
            if (!isNaN(y) && y > 1990 && y < 2100) {
                yearsSet.add(y);
                let cid = String(p.clientId);
                if (!clientFirstYearMap[cid] || y < clientFirstYearMap[cid]) {
                    clientFirstYearMap[cid] = y;
                }
            }
        }
    });

    let sortedYears = Array.from(yearsSet).sort((a, b) => b - a);
    let currentSelectedVal = yearSelect.value || String(currentYear);
    
    yearSelect.innerHTML = `<option value="all">Cała historia (Wszystkie lata)</option>`;
    sortedYears.forEach(y => {
        yearSelect.innerHTML += `<option value="${y}">Rok ${y}</option>`;
    });

    if (currentSelectedVal === 'all' || sortedYears.includes(parseInt(currentSelectedVal))) {
        yearSelect.value = currentSelectedVal;
    } else {
        yearSelect.value = String(currentYear);
    }

    let selectedYear = yearSelect.value === 'all' ? null : parseInt(yearSelect.value);

    // 2. Filtrowanie polis dla wybranego okresu (bez całkowicie anulowanych bez wpłat)
    let validPoliciesAllTime = policiesList.filter(p => p.settlementStatus !== 'anulowana' || p.firstPaymentPaid);
    let filteredPolicies = validPoliciesAllTime.filter(p => {
        if (!selectedYear) return true;
        if (!p.dateStart) return false;
        return new Date(p.dateStart).getFullYear() === selectedYear;
    });

    // 3. Obliczenia głównych KPI (Polisy w roku vs ogółem, Klienci w roku vs ogółem)
    let totalPoliciesAll = validPoliciesAllTime.length;
    let periodPoliciesCount = filteredPolicies.length;
    let newBizCount = filteredPolicies.filter(p => p.salesType !== 'renewal').length;
    let renBizCount = filteredPolicies.filter(p => p.salesType === 'renewal').length;

    let activeClientsInPeriod = new Set(filteredPolicies.map(p => String(p.clientId)));
    let totalClientsAll = clientsList.length;

    let newClientsInPeriodCount = 0;
    activeClientsInPeriod.forEach(cid => {
        if (!selectedYear || clientFirstYearMap[cid] === selectedYear) {
            newClientsInPeriodCount++;
        }
    });

    let periodNetPrem = 0;
    let periodComm = 0;
    filteredPolicies.forEach(p => {
        periodNetPrem += getPolicyNetPremium(p);
        periodComm += parseFloat(p.commissionAmt) || 0;
    });

    let avgPrem = periodPoliciesCount > 0 ? (periodNetPrem / periodPoliciesCount) : 0;
    let avgComm = periodPoliciesCount > 0 ? (periodComm / periodPoliciesCount) : 0;

    document.getElementById('st_policiesYear').innerText = periodPoliciesCount;
    document.getElementById('st_policiesTotal').innerText = totalPoliciesAll;
    document.getElementById('st_policiesSub').innerText = `Nowy biznes: ${newBizCount} | Wznowienia: ${renBizCount}`;

    document.getElementById('st_clientsYear').innerText = activeClientsInPeriod.size;
    document.getElementById('st_clientsTotal').innerText = totalClientsAll;
    document.getElementById('st_clientsSub').innerText = selectedYear 
        ? `W tym nowi w ${selectedYear} r.: ${newClientsInPeriodCount} os.` 
        : `Wszyscy klienci z polisami: ${activeClientsInPeriod.size} os.`;

    document.getElementById('st_netPremium').innerText = formatPLN(periodNetPrem);
    document.getElementById('st_avgPremium').innerText = `Średnia składka: ${formatPLN(avgPrem)}`;
    document.getElementById('st_totalComm').innerText = formatPLN(periodComm);
    document.getElementById('st_avgComm').innerText = `Średnia prowizja: ${formatPLN(avgComm)}`;

    // 4. Ranking Towarzystw Ubezpieczeniowych (TU)
    let tuStats = {};
    filteredPolicies.forEach(p => {
        let ins = p.insurer || "Inne";
        if (!tuStats[ins]) tuStats[ins] = { count: 0, netPrem: 0, comm: 0 };
        tuStats[ins].count++;
        tuStats[ins].netPrem += getPolicyNetPremium(p);
        tuStats[ins].comm += parseFloat(p.commissionAmt) || 0;
    });

    let tuBody = document.getElementById('st_tuTableBody');
    tuBody.innerHTML = "";
    let sortedTu = Object.keys(tuStats).sort((a, b) => tuStats[b].netPrem - tuStats[a].netPrem);

    if (sortedTu.length === 0) {
        tuBody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-textMuted">Brak sprzedanych polis w wybranym okresie.</td></tr>`;
    } else {
        sortedTu.forEach((ins, idx) => {
            let d = tuStats[ins];
            let sharePct = periodPoliciesCount > 0 ? Math.round((d.count / periodPoliciesCount) * 100) : 0;
            let avgTuComm = d.count > 0 ? (d.comm / d.count) : 0;
            let medal = idx === 0 ? "🥇 " : (idx === 1 ? "🥈 " : (idx === 2 ? "🥉 " : ""));

            tuBody.innerHTML += `
                <tr class="hover:bg-luxBg/60">
                    <td class="p-3 font-bold text-textDark">${medal}${ins}</td>
                    <td class="p-3">
                        <div class="flex items-center justify-between text-xs mb-1">
                            <span class="font-bold">${d.count} szt.</span>
                            <span class="text-textMuted">${sharePct}%</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-1.5"><div class="bg-goldAccent h-1.5 rounded-full" style="width: ${sharePct}%"></div></div>
                    </td>
                    <td class="p-3 text-right font-bold text-indigo-700">${formatPLN(d.netPrem)}</td>
                    <td class="p-3 text-right font-extrabold text-green-600">${formatPLN(d.comm)}</td>
                    <td class="p-3 text-right text-xs font-semibold text-textMuted">${formatPLN(avgTuComm)}</td>
                </tr>`;
        });
    }

    // 5. Struktura Portfela (Komunikacja vs Majątek vs Firmowe vs Travel)
    let typeStats = {};
    filteredPolicies.forEach(p => {
        let t = p.type || "Inne";
        if (!typeStats[t]) typeStats[t] = { count: 0, netPrem: 0, comm: 0 };
        typeStats[t].count++;
        typeStats[t].netPrem += getPolicyNetPremium(p);
        typeStats[t].comm += parseFloat(p.commissionAmt) || 0;
    });

    let typeBox = document.getElementById('st_typeBreakdown');
    typeBox.innerHTML = "";
    Object.keys(typeStats).sort((a,b) => typeStats[b].netPrem - typeStats[a].netPrem).forEach(t => {
        let d = typeStats[t];
        let pct = periodPoliciesCount > 0 ? Math.round((d.count / periodPoliciesCount) * 100) : 0;
        typeBox.innerHTML += `
            <div class="bg-luxBg p-2.5 rounded-xl border border-luxBorder">
                <div class="flex justify-between font-bold text-textDark mb-1">
                    <span>${t} (${d.count} szt. - ${pct}%)</span>
                    <span class="text-indigo-700">${formatPLN(d.netPrem)}</span>
                </div>
                <div class="flex justify-between text-[11px] text-textMuted">
                    <span>Wygenerowana prowizja:</span>
                    <span class="font-bold text-green-700">${formatPLN(d.comm)}</span>
                </div>
            </div>`;
    });
    if (Object.keys(typeStats).length === 0) typeBox.innerHTML = `<p class="text-textMuted italic">Brak danych.</p>`;

    // 6. Skuteczność źródeł poleceń (w całej bazie klientów)
    let sourceStats = {};
    clientsList.forEach(c => {
        let src = (c.source && c.source.trim() !== "") ? c.source.trim() : "Brak wpisanego źródła";
        if (!sourceStats[src]) sourceStats[src] = { clients: 0, comm: 0, prem: 0 };
        sourceStats[src].clients++;
        let ltv = calculateClientLtv(c.id);
        sourceStats[src].comm += ltv.earnedComm;
        sourceStats[src].prem += ltv.netPremium;
    });

    let srcBox = document.getElementById('st_sourcesBreakdown');
    srcBox.innerHTML = "";
    Object.keys(sourceStats).sort((a,b) => sourceStats[b].comm - sourceStats[a].comm).forEach(src => {
        let d = sourceStats[src];
        srcBox.innerHTML += `
            <div class="flex justify-between items-center bg-luxBg p-2 rounded-lg border border-luxBorder">
                <div>
                    <span class="font-bold text-textDark block">${src}</span>
                    <span class="text-[10px] text-textMuted">Klientów: ${d.clients} | Przypis: ${formatPLN(d.prem)}</span>
                </div>
                <span class="font-extrabold text-green-700">${formatPLN(d.comm)}</span>
            </div>`;
    });

    // 7. Retencja Rok do Roku (YoY) i lista utraconych klientów
    let targetRetYear = selectedYear || currentYear;
    let prevRetYear = targetRetYear - 1;

    let clientsInPrevYear = new Set();
    let clientsInTargetYear = new Set();

    validPoliciesAllTime.forEach(p => {
        if (!p.dateStart) return;
        let y = new Date(p.dateStart).getFullYear();
        if (y === prevRetYear) clientsInPrevYear.add(String(p.clientId));
        if (y === targetRetYear) clientsInTargetYear.add(String(p.clientId));
    });

    let retNewCount = 0;
    let retKeptCount = 0;
    let lostClientIds = [];

    clientsInTargetYear.forEach(cid => {
        if (clientsInPrevYear.has(cid)) retKeptCount++;
        else if (clientFirstYearMap[cid] === targetRetYear) retNewCount++;
    });

    clientsInPrevYear.forEach(cid => {
        if (!clientsInTargetYear.has(cid)) {
            lostClientIds.push(cid);
        }
    });

    let retRate = clientsInPrevYear.size > 0 ? Math.round((retKeptCount / clientsInPrevYear.size) * 100) : 100;
    document.getElementById('st_retentionRateBadge').innerText = `Porównanie ${prevRetYear} ➔ ${targetRetYear} | Retencja: ${retRate}%`;
    document.getElementById('st_retNew').innerText = retNewCount;
    document.getElementById('st_retKept').innerText = retKeptCount;
    document.getElementById('st_retLost').innerText = lostClientIds.length;

    let lostListEl = document.getElementById('st_lostClientsList');
    lostListEl.innerHTML = "";
    if (lostClientIds.length === 0) {
        lostListEl.innerHTML = `<p class="text-xs text-green-700 font-bold col-span-3 py-2">🎉 Brawo! Wszyscy klienci z roku ${prevRetYear} zawarli polisy również w roku ${targetRetYear} (lub brak polis z ${prevRetYear} r.).</p>`;
    } else {
        lostClientIds.forEach(cid => {
            let c = clientsList.find(x => String(x.id) === String(cid));
            if (c) {
                lostListEl.innerHTML += `
                    <div onclick="openClientFull('${c.id}')" class="bg-white p-2.5 rounded-xl border border-red-200 hover:border-red-500 cursor-pointer flex justify-between items-center shadow-sm transition-all">
                        <div>
                            <span class="font-bold text-textDark text-xs block">${c.name}</span>
                            <span class="text-[10px] text-textMuted">📞 ${c.phone || 'Brak telefonu'}</span>
                        </div>
                        <span class="text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded font-bold">Otwórz ➔</span>
                    </div>`;
            }
        });
    }

    // 8. Radar Cross-sellingu (Mają auto vs Mają majątek)
    let noHomeHtml = "", noCarHtml = "";
    let noHomeCount = 0, noCarCount = 0;

    clientsList.forEach(c => {
        let cPols = validPoliciesAllTime.filter(p => String(p.clientId) === String(c.id));
        if (cPols.length === 0) return;

        let hasCar = cPols.some(p => p.type === 'Komunikacja') || vehiclesList.some(v => String(v.clientId) === String(c.id));
        let hasHome = cPols.some(p => p.type === 'Majątek') || propertiesList.some(pr => String(pr.clientId) === String(c.id));

        if (hasCar && !hasHome) {
            noHomeCount++;
            noHomeHtml += `
                <div onclick="openClientFull('${c.id}')" class="bg-white p-2 rounded border border-blue-200 hover:border-blue-500 cursor-pointer flex justify-between items-center">
                    <span class="font-bold text-textDark truncate">${c.name}</span>
                    <span class="text-[10px] text-blue-700 font-mono ml-1">${c.phone || 'Karta ➔'}</span>
                </div>`;
        } else if (hasHome && !hasCar) {
            noCarCount++;
            noCarHtml += `
                <div onclick="openClientFull('${c.id}')" class="bg-white p-2 rounded border border-green-200 hover:border-green-500 cursor-pointer flex justify-between items-center">
                    <span class="font-bold text-textDark truncate">${c.name}</span>
                    <span class="text-[10px] text-green-700 font-mono ml-1">${c.phone || 'Karta ➔'}</span>
                </div>`;
        }
    });

    document.getElementById('st_crossNoHomeCount').innerText = noHomeCount;
    document.getElementById('st_crossNoCarCount').innerText = noCarCount;
    document.getElementById('st_crossNoHomeList').innerHTML = noHomeHtml || `<p class="text-textMuted italic">Brak klientów w tej grupie.</p>`;
    document.getElementById('st_crossNoCarList').innerHTML = noCarHtml || `<p class="text-textMuted italic">Brak klientów w tej grupie.</p>`;

    // 9. Ranking VIP (Top 10 Klientów wg prowizji LTV)
    let vipList = clientsList.map(c => {
        let ltv = calculateClientLtv(c.id);
        let pCount = validPoliciesAllTime.filter(p => String(p.clientId) === String(c.id)).length;
        return { id: c.id, name: c.name, count: pCount, prem: ltv.netPremium, comm: ltv.earnedComm };
    }).sort((a, b) => b.comm - a.comm).slice(0, 10);

    let vipBody = document.getElementById('st_vipTableBody');
    vipBody.innerHTML = "";
    vipList.forEach((v, idx) => {
        if (v.count === 0 && v.comm === 0) return;
        vipBody.innerHTML += `
            <tr onclick="openClientFull('${v.id}')" class="hover:bg-amber-50/60 cursor-pointer">
                <td class="p-2.5 font-bold text-textDark"><span class="text-goldAccent mr-1">#${idx + 1}</span> ${v.name}</td>
                <td class="p-2.5 text-center font-semibold">${v.count} szt.</td>
                <td class="p-2.5 text-right font-bold text-indigo-700">${formatPLN(v.prem)}</td>
                <td class="p-2.5 text-right font-extrabold text-green-600">${formatPLN(v.comm)}</td>
            </tr>`;
    });
    if (vipBody.innerHTML === "") vipBody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-textMuted">Brak danych.</td></tr>`;

    // 10. Mapa Sezonowości Miesięcy (Styczeń - Grudzień)
    const mNames = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];
    let monthsData = Array.from({ length: 12 }, () => ({ count: 0, prem: 0, comm: 0 }));

    filteredPolicies.forEach(p => {
        if (!p.dateStart) return;
        let m = new Date(p.dateStart).getMonth();
        if (!isNaN(m) && m >= 0 && m < 12) {
            monthsData[m].count++;
            monthsData[m].prem += getPolicyNetPremium(p);
            monthsData[m].comm += parseFloat(p.commissionAmt) || 0;
        }
    });

    let seasBody = document.getElementById('st_seasonalityBody');
    seasBody.innerHTML = "";
    monthsData.forEach((d, idx) => {
        let highlight = d.count > 0 ? "font-bold text-textDark" : "text-gray-400";
        seasBody.innerHTML += `
            <tr class="hover:bg-luxBg/50 ${highlight}">
                <td class="p-2.5">${idx + 1}. ${mNames[idx]}</td>
                <td class="p-2.5 text-center">${d.count} szt.</td>
                <td class="p-2.5 text-right text-indigo-700">${formatPLN(d.prem)}</td>
                <td class="p-2.5 text-right text-green-600">${formatPLN(d.comm)}</td>
            </tr>`;
    });

    // 11. Bilans Odpisów i Storna
    let odpisStats = {};
    let totalOdpisSum = 0;
    policiesList.forEach(p => {
        if (selectedYear && p.dateStart && new Date(p.dateStart).getFullYear() !== selectedYear) return;
        let odp = parseFloat(p.odpis) || 0;
        if (odp > 0) {
            let reas = p.odpisReason || "Nieokreślony powód";
            if (!odpisStats[reas]) odpisStats[reas] = { count: 0, sum: 0 };
            odpisStats[reas].count++;
            odpisStats[reas].sum += odp;
            totalOdpisSum += odp;
        }
    });

    let odpisBox = document.getElementById('st_odpisBreakdown');
    odpisBox.innerHTML = `<div class="p-3 bg-red-50 border border-red-200 rounded-xl flex justify-between items-center mb-2"><span class="font-bold text-red-900">Łączne odpisy w okresie:</span><span class="text-base font-extrabold text-red-600">-${formatPLN(totalOdpisSum)}</span></div>`;
    Object.keys(odpisStats).forEach(reas => {
        let d = odpisStats[reas];
        odpisBox.innerHTML += `
            <div class="flex justify-between items-center bg-luxBg p-2 rounded border border-luxBorder">
                <span><b>${reas}</b> (${d.count} szt.)</span>
                <span class="font-bold text-red-600">-${formatPLN(d.sum)}</span>
            </div>`;
    });
    if (totalOdpisSum === 0) {
        odpisBox.innerHTML += `<p class="text-green-700 font-semibold py-2">Brak zarejestrowanych odpisów i zwrotów w tym okresie.</p>`;
    }
}

// ================= 13. KALENDARZ =================
function renderCalendar() {
    const grid = document.getElementById('calendarGrid'); 
    const evList = document.getElementById('calendarEventsList'); 
    const label = document.getElementById('calendarMonthLabel');
    const sideTitle = document.getElementById('calendarSideTitle');
    if(!grid || !evList || !label) return;
    
    const year = currentCalendarDate.getFullYear(); 
    const month = currentCalendarDate.getMonth();
    const monthNames = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];
    label.innerText = `${monthNames[month]} ${year}`;
    
    const firstDay = new Date(year, month, 1).getDay(); 
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDay = firstDay === 0 ? 6 : firstDay - 1;
    
    grid.innerHTML = ''; 
    let eventsInMonth = [];
    
    clientsList.forEach(c => { 
        if(c.birth) {
            let bD = new Date(c.birth);
            if(bD.getMonth() === month) {
                eventsInMonth.push({ day: bD.getDate(), type: '🎂', text: `${c.name} (Urodziny)`, action: () => openClientFull(c.id) });
            }
        }
    });
    vehiclesList.forEach(v => { 
        if(v.inspection) {
            let iD = new Date(v.inspection);
            if(iD.getMonth() === month && iD.getFullYear() === year) {
                eventsInMonth.push({ day: iD.getDate(), type: '🔧', text: `${v.plate} - Koniec przeglądu (${v.brand})`, action: () => openClientFull(v.clientId) });
            }
        }
    });
    policiesList.forEach(p => { 
        if(p.settlementStatus === 'anulowana') return;
        let c = clientsList.find(x => String(x.id) === String(p.clientId));
        let cName = c ? c.name : 'Polisa';

        if(p.dateEnd && !p.renewalHandled) {
            let eD = new Date(p.dateEnd);
            if(eD.getMonth() === month && eD.getFullYear() === year) {
                eventsInMonth.push({ day: eD.getDate(), type: '🛡️', text: `${cName} - Koniec polisy ${p.insurer} (${p.subject || ''})`, action: () => openDrawer('policy', p.id) });
            }
        }
        if(p.firstPaymentDate && !p.firstPaymentPaid) {
            let fpD = new Date(p.firstPaymentDate);
            if(fpD.getMonth() === month && fpD.getFullYear() === year) {
                eventsInMonth.push({ day: fpD.getDate(), type: '💸', text: `${cName} - I Rata (${p.insurer})`, action: () => openDrawer('policy', p.id) });
            }
        }
        if(p.installments > 1 && p.installmentDates) {
            for(let i in p.installmentDates) {
                let inst = p.installmentDates[i];
                if(inst && inst.date && !inst.paid) {
                    let inD = new Date(inst.date);
                    if(inD.getMonth() === month && inD.getFullYear() === year) {
                        eventsInMonth.push({ day: inD.getDate(), type: '💸', text: `${cName} - Rata ${i} (${formatPLN(inst.amount)})`, action: () => openDrawer('policy', p.id) });
                    }
                }
            }
        }
    });

    for(let i=0; i<startDay; i++) { 
        grid.innerHTML += `<div class="p-2 border border-gray-100 bg-gray-50 rounded text-transparent">0</div>`; 
    }
    for(let d=1; d<=daysInMonth; d++) {
        let dayEvs = eventsInMonth.filter(e => e.day === d);
        let evMarkers = dayEvs.map(e => e.type).join(' ');
        let isToday = (d === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear());
        let isSelected = (selectedCalendarDay === d);
        
        let bgClass = 'bg-white border-luxBorder';
        if(isToday) bgClass = 'bg-goldAccent/20 border-goldAccent';
        if(isSelected) bgClass = 'bg-indigo-100 border-indigo-500 ring-2 ring-indigo-400';

        grid.innerHTML += `
            <div onclick="selectCalendarDay(${d})" class="p-2 border ${bgClass} rounded min-h-[60px] text-sm cursor-pointer hover:bg-gray-50 transition-all">
                <div class="flex justify-between items-center">
                    <span class="font-bold ${isToday ? 'text-goldAccent' : ''}">${d}</span>
                    ${dayEvs.length > 0 ? `<span class="text-[10px] bg-gray-200 px-1.5 rounded-full font-bold">${dayEvs.length}</span>` : ''}
                </div>
                <div class="text-xs mt-1 truncate">${evMarkers}</div>
            </div>`;
    }

    if(selectedCalendarDay) {
        if(sideTitle) sideTitle.innerText = `📅 Dzień: ${selectedCalendarDay} ${monthNames[month]} ${year}`;
        let dayEvents = eventsInMonth.filter(e => e.day === selectedCalendarDay);
        
        evList.innerHTML = `<button onclick="selectedCalendarDay=null; renderCalendar();" class="w-full text-xs bg-gray-200 hover:bg-gray-300 px-3 py-1.5 rounded-lg font-bold mb-2">⬅ Pokaż cały miesiąc</button>`;
        if(dayEvents.length > 0) {
            dayEvents.forEach((e) => {
                let div = document.createElement('div');
                div.className = "p-3 bg-luxBg rounded-xl border border-luxBorder text-sm cursor-pointer hover:border-goldAccent transition-all";
                div.innerHTML = `<b>${e.type}</b> ${e.text}`;
                if(e.action) div.onclick = e.action;
                evList.appendChild(div);
            });
        } else {
            evList.innerHTML += `<p class="text-xs text-textMuted mt-2 text-center py-4">Brak przypisanych wydarzeń w tym dniu.</p>`;
        }
    } else {
        if(sideTitle) sideTitle.innerText = `Wydarzenia w tym miesiącu`;
        evList.innerHTML = `<p class="text-xs text-textMuted mb-2 italic">Kliknij dowolny dzień na siatce, aby wyfiltrować jego zadania.</p>`;
        eventsInMonth.sort((a,b) => a.day - b.day).forEach(e => {
            let div = document.createElement('div');
            div.className = "p-3 bg-luxBg rounded-xl border border-luxBorder text-sm cursor-pointer hover:border-goldAccent transition-all";
            div.innerHTML = `<span class="font-bold text-textDark mr-2">${e.day} ${monthNames[month].substring(0,3)}</span> ${e.type} ${e.text}`;
            div.onclick = () => { selectCalendarDay(e.day); if(e.action) e.action(); };
            evList.appendChild(div);
        });
        if(eventsInMonth.length === 0) evList.innerHTML += `<p class="text-xs text-textMuted">Brak zapisanych wydarzeń na ten miesiąc.</p>`;
    }
}

function selectCalendarDay(day) {
    selectedCalendarDay = day;
    renderCalendar();
}

function changeCalendarMonth(offset) {
    selectedCalendarDay = null;
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + offset);
    renderCalendar();
}

function addCalendarEvent(type) {
    if(type === 'client' && currentOpenId) {
        let c = clientsList.find(x => String(x.id) === String(currentOpenId));
        if(c) {
            let text = `Kontakt: ${c.name}, tel: ${c.phone || '-'}`;
            let url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('Kontakt: ' + c.name)}&details=${encodeURIComponent(text)}`;
            window.open(url, '_blank');
        }
    }
}

// ================= 14. SŁOWNIKI I ADMINISTRACJA =================
function renderInsurersLibrary() {
    let listBody = document.getElementById('insurersLibraryBody'); 
    if(listBody) listBody.innerHTML = "";
    let pIns = document.getElementById('p_insurer'); 
    let sIns = document.getElementById('set_insurer'); 
    let oIns = document.getElementById('off_tu');
    let currentPVal = pIns ? pIns.value : "";
    if(pIns) pIns.innerHTML = ""; 
    if(sIns) sIns.innerHTML = ""; 
    if(oIns) oIns.innerHTML = "";
    
    insurersLibrary.sort().forEach((ins, idx) => {
        if(listBody) listBody.innerHTML += `<tr class="hover:bg-luxBg"><td class="p-2.5 font-bold">${ins}</td><td class="p-2.5 text-right"><button onclick="deleteInsurer(${idx})" class="text-red-500 text-xs font-bold">Usuń</button></td></tr>`;
        if(pIns) pIns.innerHTML += `<option value="${ins}">${ins}</option>`; 
        if(sIns) sIns.innerHTML += `<option value="${ins}">${ins}</option>`; 
        if(oIns) oIns.innerHTML += `<option value="${ins}">${ins}</option>`;
    });
    if(pIns && currentPVal && insurersLibrary.includes(currentPVal)) {
        pIns.value = currentPVal;
    }
}

function addInsurerToLibrary() { 
    let val = document.getElementById('set_newInsurer').value.trim(); 
    if(val && !insurersLibrary.includes(val)) { 
        insurersLibrary.push(val); 
        syncAndRender(); 
        document.getElementById('set_newInsurer').value = ""; 
    } 
}

function deleteInsurer(idx) { 
    if(confirm("Usunąć to TU ze słownika?")) { 
        insurersLibrary.splice(idx, 1); 
        syncAndRender(); 
    } 
}

function renderCommissionDict() {
    let b = document.getElementById('commissionDictBody'); 
    if(!b) return; 
    b.innerHTML = "";
    if(commDictList.length === 0) {
        b.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-textMuted text-xs">Brak reguł prowizyjnych.</td></tr>`;
        return;
    }
    commDictList.forEach(r => { 
        b.innerHTML += `<tr class="hover:bg-luxBg"><td class="p-2 font-bold">${r.insurer}</td><td class="p-2 text-blue-800 font-semibold">${r.risk}</td><td class="p-2 font-bold text-goldAccent text-right">${r.pct}%</td><td class="p-2 text-right"><button onclick="deleteCommRule('${r.id}')" class="text-red-500 font-bold text-xs">Usuń</button></td></tr>`; 
    });
}

function addCommissionRule() {
    let insurer = document.getElementById('set_insurer').value; 
    let risk = document.getElementById('set_risk').value.trim().toUpperCase(); 
    let pct = parseFloat(String(document.getElementById('set_pct').value).replace(',', '.'));
    if(!risk || isNaN(pct)) return alert("Podaj nazwę ryzyka i % prowizji!");
    let existing = commDictList.findIndex(r => r.insurer === insurer && r.risk === risk);
    if(existing >= 0) commDictList[existing].pct = pct; 
    else commDictList.push({ id: Date.now(), insurer: insurer, risk: risk, pct: pct });
    syncAndRender(); 
    document.getElementById('set_risk').value = ""; 
    document.getElementById('set_pct').value = ""; 
    updateRiskDatalist();
}

function deleteCommRule(id) { 
    commDictList = commDictList.filter(r => String(r.id) !== String(id)); 
    syncAndRender(); 
    updateRiskDatalist(); 
}

function exportData() {
    const dataStr = JSON.stringify({ 
        clients: clientsList, 
        policies: policiesList, 
        vehicles: vehiclesList, 
        properties: propertiesList, 
        externalPolicies: externalPoliciesList, 
        commDict: commDictList, 
        offers: offersList, 
        insurers: insurersLibrary,
        tasks: tasksList,
        quickNotes: quickNotesText,
        monthlyGoal: monthlyGoalAmount,
        customBrands: customBrandsList
    }, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" }); 
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); 
    a.href = url; 
    a.download = `Agent1_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a); 
    a.click(); 
    document.body.removeChild(a); 
    URL.revokeObjectURL(url);
}

function clearDatabase() { 
    if(confirm("UWAGA! Usuniesz bezpowrotnie wszystkie dane z bazy. Jesteś pewny?")) { 
        clientsList = []; 
        policiesList = []; 
        vehiclesList = []; 
        propertiesList = []; 
        externalPoliciesList = []; 
        offersList = []; 
        tasksList = [];
        syncAndRender(); 
    } 
}