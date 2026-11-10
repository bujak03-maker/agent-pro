// app.js - Główna logika biznesowa Agent 1.0 Pro

// ================= 1. ZMIENNE GLOBALNE =================
let clientsList = [];
let policiesList = [];
let vehiclesList = [];
let propertiesList = [];
let externalPoliciesList = [];
let offersList = [];
let commDictList = [{ id: 1, insurer: "PZU", risk: "OC", pct: 10 }, { id: 2, insurer: "PZU", risk: "AC", pct: 12 }];
let insurersLibrary = ["Allianz", "Balcia", "Benefia", "Compensa", "Ergo Hestia", "Generali", "HDI", "InterRisk", "Link4", "MTU", "Proama", "PZU", "TUZ", "Uniqa", "Warta", "Wiener"];

let currentOpenId = null;
let currentOpenPolicyId = null;
let editingPolicyId = null;
let tempPolicyRisks = [];
let selectedClientIdForPolicy = null;
let editingOfferId = null;
let tempOfferRows = [];
let currentPolicyStep = 1;
let currentCalendarDate = new Date();

// ================= 2. SYNCHRONIZACJA Z CHMURĄ =================
window.loadDataFromFirebase = async function() {
    try {
        if(!currentUserUid) return;
        const doc = await db.collection('agentData').doc(currentUserUid).get();
        if(doc.exists) {
            const d = doc.data();
            if(d.clients) clientsList = d.clients;
            if(d.policies) policiesList = d.policies;
            if(d.vehicles) vehiclesList = d.vehicles;
            if(d.properties) propertiesList = d.properties;
            if(d.externalPolicies) externalPoliciesList = d.externalPolicies;
            if(d.commDict) commDictList = d.commDict;
            if(d.offers) offersList = d.offers;
            if(d.insurers) insurersLibrary = d.insurers;
        }
        syncAndRender(false);
    } catch (e) { console.error("Błąd odczytu z Firebase:", e); }
}

function syncAndRender(uploadToCloud = true) {
    renderClients();
    renderPolicies();
    renderFinances();
    renderDashboard();
    renderCommissionDict();
    renderOffersList();
    renderInsurersLibrary();
    renderCalendar();
    
    if(uploadToCloud && currentUserUid) {
        const dataObj = { 
            clients: clientsList, policies: policiesList, vehicles: vehiclesList, 
            properties: propertiesList, externalPolicies: externalPoliciesList, 
            commDict: commDictList, offers: offersList, insurers: insurersLibrary 
        };
        db.collection('agentData').doc(currentUserUid).set(dataObj).catch(e => console.error("Błąd zapisu:", e));
    }
}

// ================= 3. FUNKCJE POMOCNICZE =================
function formatPLN(num) { 
    if (isNaN(num) || num === null || num === "") return "-"; 
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(num); 
}
function calculateYears(dateString) { 
    if (!dateString) return null; 
    const targetDate = new Date(dateString); const today = new Date(); 
    let years = today.getFullYear() - targetDate.getFullYear(); 
    if (today.getMonth() < targetDate.getMonth() || (today.getMonth() === targetDate.getMonth() && today.getDate() < targetDate.getDate())) years--; 
    return years; 
}
function autoFillEndDate(startStr) { 
    if(!startStr) return; 
    let d = new Date(startStr); d.setFullYear(d.getFullYear() + 1); d.setDate(d.getDate() - 1); 
    document.getElementById('p_dateEnd').value = d.toISOString().split('T')[0]; 
}
function addMonthsToDate(dateStr, monthsToAdd) { 
    if(!dateStr) return ""; 
    let d = new Date(dateStr); d.setMonth(d.getMonth() + monthsToAdd); 
    return d.toISOString().split('T')[0]; 
}
function parsePeselToDateString(val) { 
    if(!val || val.length !== 11) return null; 
    let year = parseInt(val.substring(0, 2), 10); let month = parseInt(val.substring(2, 4), 10); let day = parseInt(val.substring(4, 6), 10); 
    if (month > 20 && month <= 32) { year += 2000; month -= 20; } 
    else if (month > 0 && month <= 12) { year += 1900; } 
    else if (month > 40 && month <= 52) { year += 2100; month -= 40; } 
    if (year && month && day && month <= 12 && day <= 31) return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`; 
    return null; 
}
function parsePeselField(val, targetElementId) { 
    let birth = parsePeselToDateString(val); 
    if(birth) document.getElementById(targetElementId).value = birth; 
}

// ================= 4. KLIENCI, GARAŻ, LOKALE =================
function saveNewClient() {
    let name = document.getElementById('addName').value.trim(); 
    let pesel = document.getElementById('addPesel').value.trim();
    if(!name || (pesel.length !== 11 && pesel.length !== 10)) return alert("Wymagane Imię oraz PESEL (11) lub NIP (10)!");
    let nipVal = pesel.length === 10 ? pesel : ""; let peselVal = pesel.length === 11 ? pesel : "";
    clientsList.push({ 
        id: Date.now(), name: name, pesel: peselVal, nip: nipVal, regon: "", 
        birth: document.getElementById('addBirth').value, licenseDate: document.getElementById('addLicense') ? document.getElementById('addLicense').value : "", 
        phone: "", email: "", address: "", source: "" 
    });
    syncAndRender(); closeClientModal(); 
    ['addName','addPesel','addBirth'].forEach(id => { if(document.getElementById(id)) document.getElementById(id).value = ""; });
}

function renderClients() {
    const query = document.getElementById('searchClient') ? document.getElementById('searchClient').value.toLowerCase() : ""; 
    const tbody = document.getElementById('clientsTableBody'); if(!tbody) return; tbody.innerHTML = '';
    let filtered = clientsList.filter(c => (c.name && c.name.toLowerCase().includes(query)) || (c.pesel && c.pesel.includes(query)) || (c.nip && c.nip.includes(query)));
    if(filtered.length === 0) return tbody.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-textMuted">Brak klientów w bazie.</td></tr>`;
    filtered.forEach(c => {
        let age = c.birth ? calculateYears(c.birth) + " lat" : "-"; 
        let licenseStr = c.licenseDate ? `<span class="text-goldAccent font-semibold">${c.licenseDate}</span>` : `-`;
        let icon = c.nip ? '🏢' : '👤';
        tbody.innerHTML += `<tr class="hover:bg-luxBg/60 transition-all cursor-pointer border-l-4 border-transparent hover:border-goldAccent" onclick="openClientFull(${c.id})"><td class="p-4 font-semibold text-textDark">${icon} ${c.name}</td><td class="p-4 text-textMuted font-mono text-xs">${c.pesel ? 'PESEL: '+c.pesel : 'NIP: '+(c.nip||'-')}</td><td class="p-4 text-textMuted text-xs">P.J.: ${licenseStr}<br>Wiek: ${age}</td><td class="p-4 text-textMuted text-xs">📞 ${c.phone || '-'}<br>✉️ ${c.email || '-'}</td></tr>`;
    });
}

function populateClientFull(id) {
    const c = clientsList.find(x => x.id === id); if(!c) return;
    document.getElementById('cfm_name').innerText = c.name; 
    document.getElementById('cfm_pesel').innerText = c.pesel ? `PESEL: ${c.pesel}` : `NIP: ${c.nip || '-'}`;
    document.getElementById('cv_phone').innerText = c.phone || "-"; 
    document.getElementById('cv_email').innerText = c.email || "-"; 
    document.getElementById('cv_birth').innerText = c.birth || "-"; 
    document.getElementById('cv_license').innerText = c.licenseDate || "-";
    document.getElementById('cv_nip').innerText = c.nip || "-"; 
    document.getElementById('cv_regon').innerText = c.regon || "-"; 
    document.getElementById('cv_address').innerText = c.address || "-";
    document.getElementById('cv_source').innerText = c.source || "-";
    
    document.getElementById('cfm_viewMode').classList.remove('hidden'); 
    document.getElementById('cfm_editMode').classList.add('hidden'); 
    document.getElementById('cfm_btnEdit').innerText = "Edytuj";
    
    renderClientVehicles(id); renderClientProperties(id); renderClientPolicies(id); renderExternalPolicies(id);
}

function saveCfmEdits() {
    let c = clientsList.find(x => x.id === currentOpenId);
    c.name = document.getElementById('ce_name').value; c.pesel = document.getElementById('ce_pesel').value; 
    c.nip = document.getElementById('ce_nip').value; c.regon = document.getElementById('ce_regon').value;
    c.phone = document.getElementById('ce_phone').value; c.email = document.getElementById('ce_email').value; 
    c.birth = document.getElementById('ce_birth').value; c.licenseDate = document.getElementById('ce_license').value; 
    c.address = document.getElementById('ce_address').value; c.source = document.getElementById('ce_source').value;
    syncAndRender(); openClientFull(c.id);
}

function deleteCurrentClient() { 
    if(confirm("Usunąć trwale klienta, jego polisy i auta?")) { 
        clientsList = clientsList.filter(c => c.id !== currentOpenId); 
        policiesList = policiesList.filter(p => p.clientId !== currentOpenId); 
        vehiclesList = vehiclesList.filter(v => v.clientId !== currentOpenId); 
        propertiesList = propertiesList.filter(p => p.clientId !== currentOpenId); 
        externalPoliciesList = externalPoliciesList.filter(p => p.clientId !== currentOpenId);
        closeClientFull(); syncAndRender(); 
    } 
}

// Garaż i Nieruchomości
function saveVehicle() { 
    let brand = document.getElementById('v_brand').value; let plate = document.getElementById('v_plate').value; 
    if(!brand || !plate) return alert("Podaj markę i rejestrację!"); 
    vehiclesList.push({ 
        id: Date.now(), clientId: currentOpenId, brand: brand, year: document.getElementById('v_year').value, 
        plate: plate.toUpperCase(), vin: document.getElementById('v_vin').value.toUpperCase(),
        inspection: document.getElementById('v_inspection').value, anglik: document.getElementById('v_anglik').checked 
    }); 
    toggleAddVehicle(); syncAndRender(); openClientFull(currentOpenId); 
}
function deleteVehicle(id) { if(confirm("Usunąć pojazd?")) { vehiclesList = vehiclesList.filter(v => v.id !== id); syncAndRender(); openClientFull(currentOpenId); } }
function renderClientVehicles(clientId) { 
    let container = document.getElementById('cfm_vehiclesList'); container.innerHTML = ''; 
    let vList = vehiclesList.filter(v => v.clientId === clientId); 
    if(vList.length === 0) return container.innerHTML = "<p class='text-xs text-textMuted'>Brak pojazdów.</p>"; 
    vList.forEach(v => { 
        let alerts = "";
        if(v.anglik) alerts += `<span class="text-[10px] bg-red-100 text-red-700 px-1 rounded ml-1 font-bold">🇬🇧 Anglik</span>`;
        if(v.inspection) alerts += `<span class="text-[10px] bg-blue-100 text-blue-700 px-1 rounded ml-1 font-bold">Przegląd: ${v.inspection}</span>`;
        container.innerHTML += `<div class="bg-luxBg p-3 rounded-lg border border-luxBorder relative group"><button onclick="deleteVehicle(${v.id})" class="absolute top-2 right-2 text-red-400 hover:text-red-600 hidden group-hover:block font-bold">&times;</button><p class="font-bold text-textDark">🚗 ${v.brand} <span class="text-xs text-textMuted">${v.year ? v.year+'r.' : ''}</span> ${alerts}</p><p class="text-sm font-mono text-goldAccent font-semibold">${v.plate} ${v.vin ? '<span class="text-textMuted text-xs ml-2">VIN: '+v.vin+'</span>' : ''}</p></div>`; 
    }); 
}

function saveProperty() { 
    let t = document.getElementById('prop_type').value; let a = document.getElementById('prop_address').value; 
    let flammable = document.getElementById('prop_flammable').checked; let flood = document.getElementById('prop_flood').checked;
    propertiesList.push({ id: Date.now(), clientId: currentOpenId, type: t, address: a, flammable: flammable, flood: flood }); 
    toggleAddProperty(); syncAndRender(); openClientFull(currentOpenId); 
}
function deleteProperty(id) { if(confirm("Usunąć?")) { propertiesList = propertiesList.filter(p => p.id !== id); syncAndRender(); openClientFull(currentOpenId); } }
function renderClientProperties(clientId) { 
    let container = document.getElementById('cfm_propertiesList'); container.innerHTML = ''; 
    let pList = propertiesList.filter(p => p.clientId === clientId); 
    if(pList.length === 0) return container.innerHTML = "<p class='text-xs text-textMuted'>Brak nieruchomości.</p>"; 
    pList.forEach(p => { 
        let alerts = "";
        if(p.flammable) alerts += `<span class="text-[10px] bg-red-100 text-red-700 px-1 rounded ml-1 font-bold">🔥 Palne</span>`;
        if(p.flood) alerts += `<span class="text-[10px] bg-blue-100 text-blue-700 px-1 rounded ml-1 font-bold">🌊 Zalewowe</span>`;
        container.innerHTML += `<div class="bg-luxBg p-3 rounded-lg border border-luxBorder relative group"><button onclick="deleteProperty(${p.id})" class="absolute top-2 right-2 text-red-400 hidden group-hover:block font-bold">&times;</button><p class="font-bold text-textDark">🏠 ${p.type} ${alerts}</p><p class="text-sm text-textMuted">${p.address || 'Brak'}</p></div>`; 
    }); 
}

// Obce Polisy
function saveExternalPolicy() {
    let subj = document.getElementById('ext_subject').value; let date = document.getElementById('ext_date').value;
    if(!subj || !date) return alert("Podaj nazwę i datę końca polisy!");
    externalPoliciesList.push({ id: Date.now(), clientId: currentOpenId, subject: subj, dateEnd: date });
    document.getElementById('ext_subject').value = ""; document.getElementById('ext_date').value = "";
    syncAndRender(); openClientFull(currentOpenId);
}
function deleteExternalPolicy(id) { externalPoliciesList = externalPoliciesList.filter(p => p.id !== id); syncAndRender(); openClientFull(currentOpenId); }
function renderExternalPolicies(clientId) {
    let container = document.getElementById('cfm_externalList'); container.innerHTML = '';
    let extList = externalPoliciesList.filter(p => p.clientId === clientId);
    if(extList.length === 0) return container.innerHTML = "<p class='text-xs text-textMuted'>Brak zapisanych obcych polis.</p>";
    extList.forEach(p => {
        container.innerHTML += `<div class="bg-white p-2 rounded border border-gray-200 flex justify-between items-center text-sm"><span class="font-bold text-textDark">🎯 ${p.subject}</span><div><span class="text-red-500 font-bold mr-2">${p.dateEnd}</span><button onclick="deleteExternalPolicy(${p.id})" class="text-red-400 hover:text-red-600 font-bold">&times;</button></div></div>`;
    });
}

function renderClientPolicies(clientId) { 
    let cPolicies = policiesList.filter(p => p.clientId === clientId); let pContainer = document.getElementById('cfm_policiesList'); pContainer.innerHTML = ''; 
    if(cPolicies.length === 0) return pContainer.innerHTML = "<p class='text-xs text-textMuted'>Brak polis.</p>"; 
    let today = new Date(); let nextWeek = new Date(); nextWeek.setDate(today.getDate() + 7); 
    cPolicies.forEach(p => { 
        let alertHtml = ''; 
        if(p.firstPaymentDate && !p.firstPaymentPaid && new Date(p.firstPaymentDate) <= nextWeek) alertHtml = `<div class="mt-1 text-[10px] text-red-600 font-bold animate-pulse">⚠️ Rata / Wpłata!</div>`; 
        pContainer.innerHTML += `<div onclick="openDrawer('policy', ${p.id})" class="bg-luxBg p-3 rounded-xl border border-luxBorder flex justify-between items-start cursor-pointer hover:border-goldAccent transition-all"><div><span class="text-xs font-bold text-goldAccent uppercase">${p.insurer}</span><p class="text-sm font-semibold text-textDark">${p.type}</p>${alertHtml}</div><div class="text-right"><span class="text-xs text-textMuted block -mb-1">Koniec:</span><span class="text-sm font-bold text-textDark">${p.dateEnd || '-'}</span></div></div>`; 
    }); 
}

// ================= 5. POLISY =================
function renderPolicies() {
    const tbody = document.getElementById('policiesTableBody'); if(!tbody) return; tbody.innerHTML = ''; 
    if(policiesList.length === 0) return tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-textMuted">Brak polis.</td></tr>`;
    policiesList.sort((a,b) => new Date(b.dateStart) - new Date(a.dateStart)).forEach(p => {
        let c = clientsList.find(x => x.id === p.clientId); 
        let instText = p.installments > 1 ? `<span class="text-[10px] uppercase font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded ml-1">${p.installments} raty</span>` : "";
        let newBizBadge = p.salesType === 'renewal' ? `<span class="text-[9px] bg-blue-100 text-blue-700 px-1 rounded ml-1 uppercase">Wznowienie</span>` : `<span class="text-[9px] bg-green-100 text-green-700 px-1 rounded ml-1 uppercase">Nowa</span>`;
        
        tbody.innerHTML += `<tr class="hover:bg-luxBg/60 transition-all cursor-pointer border-l-4 border-transparent hover:border-goldAccent" onclick="openDrawer('policy', ${p.id})"><td class="p-4"><span class="font-bold text-textDark">${p.insurer} ${newBizBadge}</span><br><span class="text-xs font-mono text-textMuted">${p.number || 'Brak nr'}</span></td><td class="p-4 font-semibold text-goldAccent hover:underline" onclick="event.stopPropagation(); openClientFull(${p.clientId})">${c ? c.name : "Nieznany"}</td><td class="p-4 text-textMuted text-xs">Okres: <span class="font-bold text-textDark">${p.dateStart || '-'} <span class="font-normal mx-1">do</span> <span class="text-red-500">${p.dateEnd || '-'}</span></span><br>Przedmiot: ${p.subject}</td><td class="p-4 text-right font-bold text-textDark">${formatPLN(p.premium)} ${instText}</td></tr>`;
    });
}

function populateDrawer(type, id) {
    if (type === 'policy') {
        const p = policiesList.find(x => x.id === id); if(!p) return; currentOpenPolicyId = id; const c = clientsList.find(x => x.id === p.clientId);
        document.getElementById('pd_insurer').innerText = p.insurer + (p.salesType === 'renewal' ? " (Wznowienie)" : " (Nowa)"); 
        document.getElementById('pd_type').innerText = p.type; 
        document.getElementById('pd_number').innerText = "Nr: " + (p.number || "brak");
        
        let clientNameEl = document.getElementById('pd_clientName'); clientNameEl.innerText = c ? c.name : "Nieznany klient"; clientNameEl.onclick = c ? () => openClientFull(c.id) : null;
        document.getElementById('pd_subject').innerText = p.subject; 
        document.getElementById('pd_start').innerText = p.dateStart || "-"; document.getElementById('pd_end').innerText = p.dateEnd || "-";
        document.getElementById('pd_premium').innerText = formatPLN(p.premium) + (p.installments > 1 ? ` (${p.installments} raty)` : ""); 
        document.getElementById('pd_comm').innerText = formatPLN(p.commissionAmt);
        
        let rList = document.getElementById('pd_risksList'); rList.innerHTML = ""; 
        if(p.risks && p.risks.length > 0) { p.risks.forEach(r => { rList.innerHTML += `<div class="flex justify-between border-b border-gray-200 pb-1"><span>${r.name}</span> <span class="font-bold text-goldAccent">${formatPLN(r.premium)} (${r.pct}%)</span></div>`; }); } 
        else { rList.innerHTML = "<p class='text-xs text-textMuted'>Brak szczegółowych ryzyk.</p>"; }
        
        let instBox = document.getElementById('pd_installmentsBox'); let instList = document.getElementById('pd_installmentsList'); instList.innerHTML = '';
        if (p.installments > 1 || p.firstPaymentDate) {
            instBox.classList.remove('hidden'); let firstAmt = p.installments > 1 && p.installmentDates && p.installmentDates[2] ? p.installmentDates[2].amount : p.premium;
            instList.innerHTML += `<div class="flex justify-between items-center border-b border-amber-200/60 pb-1 mt-1"><div class="flex items-center"><input type="checkbox" ${p.firstPaymentPaid ? 'checked' : ''} onchange="toggleInstPaid(${p.id}, 1)" class="w-4 h-4 accent-green-600 cursor-pointer"><span class="text-textDark font-semibold ml-2">${p.installments > 1 ? 'Rata I:' : 'Całość:'}</span></div><div class="text-right"><span class="block font-bold ${p.firstPaymentPaid ? 'text-green-600' : 'text-textDark'}">${p.firstPaymentDate || "-"} <span class="text-xs font-normal text-textMuted">(${formatPLN(firstAmt)})</span></span></div></div>`;
            if(p.installments > 1 && p.installmentDates) { for(let i=2; i<=p.installments; i++) { let dInfo = p.installmentDates[i]; if(dInfo) instList.innerHTML += `<div class="flex justify-between items-center border-b border-amber-200/60 pb-1 mt-2"><div class="flex items-center"><input type="checkbox" ${dInfo.paid ? 'checked' : ''} onchange="toggleInstPaid(${p.id}, ${i})" class="w-4 h-4 accent-green-600 cursor-pointer"><span class="text-textDark font-semibold ml-2">Rata ${i}:</span></div><div class="text-right"><span class="block font-bold ${dInfo.paid ? 'text-green-600' : 'text-textDark'}">${dInfo.date || "-"} <span class="text-xs font-normal text-textMuted">(${formatPLN(dInfo.amount)})</span></span></div></div>`; } }
        } else { instBox.classList.add('hidden'); }

        // Zadania po-polisowe
        let tBox = document.getElementById('pd_tasksBox');
        let acBox = document.getElementById('pd_taskAcContainer');
        let ocBox = document.getElementById('pd_taskOcContainer');
        tBox.classList.add('hidden'); acBox.classList.add('hidden'); ocBox.classList.add('hidden');
        if(p.reqAc || p.reqOc) {
            tBox.classList.remove('hidden');
            if(p.reqAc) { acBox.classList.remove('hidden'); document.getElementById('pd_taskAc').checked = p.acDone || false; }
            if(p.reqOc) { ocBox.classList.remove('hidden'); document.getElementById('pd_taskOc').checked = p.ocDone || false; }
        }
    }
}

function toggleInstPaid(id, idx) { 
    let p = policiesList.find(x => x.id === id); if(!p) return; 
    if(idx === 1) p.firstPaymentPaid = !p.firstPaymentPaid; 
    else if(p.installmentDates && p.installmentDates[idx]) p.installmentDates[idx].paid = !p.installmentDates[idx].paid; 
    syncAndRender(); openDrawer('policy', id); 
}
function togglePolicyTask(taskType) {
    let p = policiesList.find(x => x.id === currentOpenPolicyId); if(!p) return;
    if(taskType === 'ac') p.acDone = document.getElementById('pd_taskAc').checked;
    if(taskType === 'oc') p.ocDone = document.getElementById('pd_taskOc').checked;
    syncAndRender();
}

function deletePolicy(id) { 
    if(confirm("Usunąć polisę?")) { 
        policiesList = policiesList.filter(p => p.id !== id); closeDrawer('policy'); syncAndRender(); 
        if(currentOpenId) openClientFull(currentOpenId); 
    } 
}

function clonePolicyToRenewal() {
    if(!currentOpenPolicyId) return;
    let p = policiesList.find(x => x.id === currentOpenPolicyId); if(!p) return;
    closeDrawer('policy');
    openPolicyModal(); // Otwiera czysty kreator
    setTimeout(() => {
        let c = clientsList.find(x => x.id === p.clientId);
        if(c) {
            document.getElementById('p_peselInput').value = c.pesel || c.nip || "";
            handlePolicyPeselInput(document.getElementById('p_peselInput'));
        }
        document.getElementById('p_insurer').value = p.insurer;
        document.getElementById('p_type').value = p.type;
        document.querySelector('input[name="p_salesType"][value="renewal"]').checked = true;
        if(p.dateStart) document.getElementById('p_dateStart').value = addMonthsToDate(p.dateStart, 12);
        if(p.dateEnd) document.getElementById('p_dateEnd').value = addMonthsToDate(p.dateEnd, 12);
        document.getElementById('p_homeAddress').value = p.subject;
        tempPolicyRisks = JSON.parse(JSON.stringify(p.risks || []));
        renderTempRisks();
    }, 400);
}

// Modal Polisy Logika
function populatePolicyModal(editId = null, prefillClientId = null) {
    selectedClientIdForPolicy = null; tempPolicyRisks = []; currentPolicyStep = 1; editingPolicyId = editId;
    if(editId) {
        let p = policiesList.find(x => x.id === editId); let c = clientsList.find(x => x.id === p.clientId);
        if(p && c) {
            document.getElementById('p_peselInput').value = c.pesel || c.nip; 
            document.getElementById('p_peselInput').disabled = true; handlePolicyPeselInput(document.getElementById('p_peselInput'));
            document.getElementById('p_insurer').value = p.insurer; document.getElementById('p_type').value = p.type; 
            document.getElementById('p_number').value = p.number; document.getElementById('p_dateStart').value = p.dateStart || ""; document.getElementById('p_dateEnd').value = p.dateEnd || "";
            document.querySelector(`input[name="p_salesType"][value="${p.salesType || 'new'}"]`).checked = true;
            document.getElementById('p_homeAddress').value = p.subject;
            document.getElementById('p_reqAc').checked = p.reqAc || false; document.getElementById('p_reqOc').checked = p.reqOc || false;
            document.getElementById('p_installments').value = p.installments; document.getElementById('p_firstPaymentDate').value = p.firstPaymentDate || "";
            if(p.risks) tempPolicyRisks = JSON.parse(JSON.stringify(p.risks)); updateRiskDatalist(); renderTempRisks(); calcInstallmentsOnly(p.installmentDates);
        }
    } else if(prefillClientId) { 
        let c = clientsList.find(x => x.id === prefillClientId); 
        if(c) { document.getElementById('p_peselInput').value = c.pesel || c.nip; document.getElementById('p_peselInput').disabled = true; handlePolicyPeselInput(document.getElementById('p_peselInput')); } 
    }
    updatePolicyUI(); updateRiskDatalist();
}

function handlePolicyPeselInput(inputEl) {
    let val = inputEl.value.replace(/[^0-9]/g, ''); inputEl.value = val; let btnNext = document.getElementById('p_btnNext');
    if(val.length === 11 || val.length === 10) {
        let c = clientsList.find(x => x.pesel === val || x.nip === val);
        if(c) { 
            selectedClientIdForPolicy = c.id; 
            document.getElementById('p_clientFoundName').innerText = c.name; 
            document.getElementById('p_clientFoundBox').classList.remove('hidden'); document.getElementById('p_clientNotFoundBox').classList.add('hidden'); btnNext.disabled = false; 
        } else { 
            selectedClientIdForPolicy = null; 
            document.getElementById('p_clientFoundBox').classList.add('hidden'); document.getElementById('p_clientNotFoundBox').classList.remove('hidden'); btnNext.disabled = true; 
        }
    } else { 
        selectedClientIdForPolicy = null; 
        document.getElementById('p_clientFoundBox').classList.add('hidden'); document.getElementById('p_clientNotFoundBox').classList.add('hidden'); btnNext.disabled = true; 
    }
}

function updateRiskDatalist() {
    let ins = document.getElementById('p_insurer'); if(!ins) return; let dl = document.getElementById('riskDatalist'); if(!dl) return; dl.innerHTML = "";
    let rules = commDictList.filter(r => r.insurer === ins.value); rules.forEach(r => { dl.innerHTML += `<option value="${r.risk}">`; });
}
function checkRiskDictForAutoFill() {
    let ins = document.getElementById('p_insurer').value; let riskName = document.getElementById('p_riskNameInput').value.trim().toUpperCase();
    let rule = commDictList.find(r => r.insurer === ins && r.risk === riskName);
    if(rule) document.getElementById('p_riskPctInput').value = rule.pct;
}

function policyStep(direction) { currentPolicyStep += direction; updatePolicyUI(); if(currentPolicyStep === 2) updateRiskDatalist(); }
function updatePolicyUI() {
    for(let i=1; i<=4; i++) document.getElementById('pStep'+i).classList.add('hidden'); 
    document.getElementById('pStep'+currentPolicyStep).classList.remove('hidden');
    document.getElementById('policyStepIndicator').innerText = `Krok ${currentPolicyStep} z 4`; 
    document.getElementById('p_btnPrev').classList.toggle('hidden', currentPolicyStep === 1);
    if(currentPolicyStep === 4) { document.getElementById('p_btnNext').classList.add('hidden'); document.getElementById('p_btnSave').classList.remove('hidden'); } 
    else { document.getElementById('p_btnNext').classList.remove('hidden'); document.getElementById('p_btnSave').classList.add('hidden'); }
}

function savePolicy() {
    let type = document.getElementById('p_type').value; 
    let subjectStr = document.getElementById('p_homeAddress').value || "Brak opisu";
    let sType = document.querySelector('input[name="p_salesType"]:checked').value;
    let reqAc = document.getElementById('p_reqAc').checked; let reqOc = document.getElementById('p_reqOc').checked;
    let instCount = parseInt(document.getElementById('p_installments').value) || 1; let instDates = {};
    if (instCount > 1) {
        for(let i = 2; i <= instCount; i++) {
            let dInput = document.getElementById(`p_instDate_${i}`); let aInput = document.getElementById(`p_instAmt_${i}`); let existingPaid = false;
            if(editingPolicyId) { let existingP = policiesList.find(x => x.id === editingPolicyId); if(existingP && existingP.installmentDates && existingP.installmentDates[i]) existingPaid = existingP.installmentDates[i].paid || false; }
            if(dInput && aInput) instDates[i] = { date: dInput.value, amount: aInput.value, paid: existingPaid };
        }
    }
    let pData = { 
        id: editingPolicyId || Date.now(), clientId: selectedClientIdForPolicy, insurer: document.getElementById('p_insurer').value, 
        type: type, salesType: sType, number: document.getElementById('p_number').value, dateStart: document.getElementById('p_dateStart').value, 
        dateEnd: document.getElementById('p_dateEnd').value, premium: document.getElementById('p_premium').value, 
        installments: instCount, firstPaymentDate: document.getElementById('p_firstPaymentDate').value, installmentDates: instDates, 
        firstPaymentPaid: editingPolicyId ? (policiesList.find(x => x.id === editingPolicyId).firstPaymentPaid || false) : false, 
        commissionAmt: document.getElementById('p_commValue').value, subject: subjectStr, risks: tempPolicyRisks, 
        reqAc: reqAc, reqOc: reqOc, acDone: editingPolicyId ? (policiesList.find(x=>x.id===editingPolicyId).acDone || false) : false, ocDone: editingPolicyId ? (policiesList.find(x=>x.id===editingPolicyId).ocDone || false) : false,
        renewalStatus: editingPolicyId ? (policiesList.find(x => x.id === editingPolicyId).renewalStatus || "todo") : "todo" 
    };
    if(editingPolicyId) { let idx = policiesList.findIndex(x => x.id === editingPolicyId); policiesList[idx] = pData; } else { policiesList.push(pData); }
    syncAndRender(); closePolicyModal(); if(currentOpenId === selectedClientIdForPolicy) openClientFull(currentOpenId); 
}

// ================= 6. OFERTY I AI =================
function renderOffersList() {
    const tbody = document.getElementById('offersTableBody'); if(!tbody) return; tbody.innerHTML = '';
    if(offersList.length === 0) return tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-textMuted">Brak zapisanych ofert.</td></tr>`;
    offersList.forEach(o => {
        let c = clientsList.find(x => x.id == o.clientId);
        tbody.innerHTML += `<tr class="hover:bg-luxBg/60 transition-all border-l-4 border-transparent hover:border-indigo-500"><td class="p-4 text-xs font-bold">#${o.id}<br>${o.date}</td><td class="p-4 font-semibold cursor-pointer hover:underline" onclick="if(${o.clientId}) openClientFull(${o.clientId})">${c ? c.name : "Nieznany"}</td><td class="p-4 text-xs"><span class="font-bold text-indigo-700 block">${o.type}</span><span class="text-textMuted">${o.subject}</span></td><td class="p-4 text-right"><button onclick="openOfferModal(${o.id})" class="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded hover:bg-blue-100 mr-1">Edytuj / PDF</button><button onclick="deleteOffer(${o.id})" class="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded hover:bg-red-100">Usuń</button></td></tr>`;
    });
}
function populateOfferModal(offerId = null, prefillClientId = null) {
    let clientSel = document.getElementById('off_clientSelect'); clientSel.innerHTML = '<option value="">-- Wybierz klienta --</option>';
    clientsList.forEach(c => { clientSel.innerHTML += `<option value="${c.id}">${c.name} (${c.pesel || c.nip || '-'})</option>`; });
    let oIns = document.getElementById('off_tu'); oIns.innerHTML = ""; insurersLibrary.sort().forEach(ins => { oIns.innerHTML += `<option value="${ins}">${ins}</option>`; });

    if(offerId) {
        let o = offersList.find(x => x.id == offerId);
        if(o) { 
            clientSel.value = o.clientId || ""; document.getElementById('off_typeSelect').value = o.type; 
            document.getElementById('off_subjectInput').value = o.subject; tempOfferRows = JSON.parse(JSON.stringify(o.rows)); 
            document.getElementById('off_recommendationText').value = o.recommendation || "";
        }
    } else { 
        clientSel.value = prefillClientId ? prefillClientId : ""; document.getElementById('off_typeSelect').value = "Majątek (Dom/Mieszkanie)"; 
        document.getElementById('off_subjectInput').value = ""; tempOfferRows = []; document.getElementById('off_recommendationText').value = "";
    }
    renderOfferTable(); updateOfferClientName();
}
function updateOfferClientName() {
    let cid = document.getElementById('off_clientSelect').value;
    let c = clientsList.find(x => x.id == cid);
    document.getElementById('pdfClientName').innerText = c ? c.name : "Klient";
}

function addOfferRow() {
    let tu = document.getElementById('off_tu').value; let risks = document.getElementById('off_risks').value.trim(); 
    let rata = document.getElementById('off_rata').value.trim(); let prem = parseFloat(document.getElementById('off_prem').value);
    let isRec = document.getElementById('off_isRecommended').checked;
    if(!risks || isNaN(prem)) return alert("Podaj ryzyka i składkę!");
    tempOfferRows.push({ tu: tu, risks: risks, rata: rata, prem: prem, isRecommended: isRec });
    document.getElementById('off_risks').value = ""; document.getElementById('off_rata').value = ""; document.getElementById('off_prem').value = ""; document.getElementById('off_isRecommended').checked = false;
    renderOfferTable();
}
function deleteOfferRow(idx) { tempOfferRows.splice(idx, 1); renderOfferTable(); }

function convertToPolicy(idx) {
    let row = tempOfferRows[idx]; let cid = document.getElementById('off_clientSelect').value; if(!cid) return alert("Wybierz klienta u góry!");
    closeOfferModal(); openPolicyModal(null, parseInt(cid));
    setTimeout(() => { 
        document.getElementById('p_insurer').value = row.tu; document.getElementById('p_premium').value = row.prem; 
        document.getElementById('p_riskNameInput').value = "PAKIET"; document.getElementById('p_riskPremInput').value = row.prem; 
        document.getElementById('p_homeAddress').value = document.getElementById('off_subjectInput').value;
    }, 500);
}

function copyAIPrompt() {
    let subj = document.getElementById('off_subjectInput').value || "nieznany przedmiot";
    let prompt = `Jesteś ekspertem ubezpieczeniowym. Przygotowałem dla klienta zestawienie ofert na: ${subj}. Oto warianty:\n`;
    tempOfferRows.forEach((r, i) => { prompt += `Wariant ${i+1}: TU ${r.tu}, Składka roczna: ${r.prem} PLN. Zakres: ${r.risks}\n`; });
    prompt += `\nNapisz krótką, profesjonalną rekomendację, sugerując optymalny wybór z punktu widzenia stosunku ceny do zakresu. Zwracaj się bezpośrednio do klienta, bez używania imion.`;
    navigator.clipboard.writeText(prompt).then(() => alert("Skopiowano bezpieczny prompt (bez RODO) do schowka! Wklej go do AI."));
}

function renderOfferTable() {
    let b = document.getElementById('offerTableBody'); b.innerHTML = "";
    if(tempOfferRows.length === 0) return b.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-textMuted text-xs">Brak wariantów.</td></tr>`;
    tempOfferRows.forEach((r, idx) => {
        let recStyle = r.isRecommended ? 'bg-green-50 border-l-4 border-green-500' : 'border-t border-gray-200';
        let recBadge = r.isRecommended ? '<span class="block text-[10px] text-green-700 uppercase font-bold mt-1">⭐ Polecany</span>' : '';
        b.innerHTML += `<tr class="${recStyle}"><td class="p-3 font-extrabold text-gray-900">${r.tu} ${recBadge}</td><td class="p-3 text-gray-700">${r.risks}</td><td class="p-3 text-right font-semibold">${r.rata ? r.rata : '-'}</td><td class="p-3 text-right font-extrabold text-indigo-700">${formatPLN(r.prem)}</td><td class="p-3 text-right hide-on-print"><button onclick="convertToPolicy(${idx})" class="text-[10px] bg-goldAccent text-white px-2 py-1 rounded mr-1">🛡️ Wystaw</button><button onclick="deleteOfferRow(${idx})" class="text-red-500 text-xs font-bold hover:underline">X</button></td></tr>`;
    });
}

function saveOffer() {
    let cid = parseInt(document.getElementById('off_clientSelect').value); if(!cid) return alert("Wybierz klienta!");
    let subj = document.getElementById('off_subjectInput').value.trim() || "Przedmiot"; let typeVal = document.getElementById('off_typeSelect').value;
    let rec = document.getElementById('off_recommendationText').value;
    let oData = { id: editingOfferId || Date.now(), clientId: cid, date: new Date().toISOString().split('T')[0], type: typeVal, subject: subj, recommendation: rec, rows: JSON.parse(JSON.stringify(tempOfferRows)) };
    if(editingOfferId) { let idx = offersList.findIndex(x => x.id == editingOfferId); offersList[idx] = oData; } else { offersList.push(oData); }
    syncAndRender(); closeOfferModal();
}
function deleteOffer(id) { if(confirm("Usunąć ofertę?")) { offersList = offersList.filter(o => o.id != id); syncAndRender(); } }

function generatePDF() {
    if(tempOfferRows.length === 0) return alert("Brak wariantów w tabeli!");
    let cid = document.getElementById('off_clientSelect').value; let c = clientsList.find(x => x.id == cid);
    document.getElementById('pdfClientName').innerText = c ? c.name : "Klient"; 
    document.getElementById('pdfSubject').innerText = document.getElementById('off_subjectInput').value || "-"; 
    document.getElementById('pdfCalcDate').innerText = new Date().toLocaleDateString('pl-PL');
    
    let recText = document.getElementById('off_recommendationText').value.trim();
    if(!recText) document.getElementById('offerRecommendationArea').classList.add('hidden');
    
    document.getElementById('pdfHeader').classList.remove('hidden'); document.getElementById('offerSetupArea').classList.add('hidden'); document.getElementById('offerFormArea').classList.add('hidden'); document.getElementById('off_actionCol').classList.add('hidden');
    let rows = document.querySelectorAll('.hide-on-print'); rows.forEach(r => r.style.display = 'none');
    
    html2pdf().set({ margin: 10, filename: `Oferta.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).from(document.getElementById('offerPrintArea')).save().then(() => {
        document.getElementById('pdfHeader').classList.add('hidden'); document.getElementById('offerSetupArea').classList.remove('hidden'); document.getElementById('offerFormArea').classList.remove('hidden'); document.getElementById('off_actionCol').classList.remove('hidden');
        document.getElementById('offerRecommendationArea').classList.remove('hidden');
        rows.forEach(r => r.style.display = '');
    });
}

// ================= 7. DASHBOARD I FINANSE =================
function renderDashboard() {
    let today = new Date(); today.setHours(0,0,0,0); let next30Days = new Date(today); next30Days.setDate(today.getDate() + 30); let currentMonth = today.getMonth() + 1;
    let overdueHtml = '', upcomingHtml = '', thirtyDaysHtml = '', birthdaysHtml = '', kbTodo = '', kbOffer = '', kbWon = '', kbLost = '';
    let monthPrem = 0, monthComm = 0, countPolicies = 0;
    
    clientsList.forEach(c => { 
        if(c.birth) { 
            let bDate = new Date(c.birth); if((bDate.getMonth() + 1) === currentMonth) { 
                let age = today.getFullYear() - bDate.getFullYear(); 
                birthdaysHtml += `<div class="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 font-semibold cursor-pointer" onclick="openClientFull(${c.id})">🎈 ${c.name} (${age} lat) - ${String(bDate.getDate()).padStart(2, '0')}.${String(currentMonth).padStart(2, '0')}</div>`; 
            } 
        } 
    });
    
    vehiclesList.forEach(v => {
        if(v.inspection) {
            let insp = new Date(v.inspection); let diffDays = Math.ceil((insp - today) / (1000 * 60 * 60 * 24));
            if(diffDays >= 0 && diffDays <= 30) {
                let c = clientsList.find(x => x.id === v.clientId);
                birthdaysHtml += `<div class="w-full flex justify-between items-center bg-gray-50 border border-gray-200 p-2 rounded text-sm"><span class="font-bold text-gray-700">🔧 Przegląd: ${v.plate}</span><span class="text-amber-600 font-bold">${diffDays} dni</span></div>`;
            }
        }
    });

    externalPoliciesList.forEach(ep => {
        if(ep.dateEnd) {
            let eEnd = new Date(ep.dateEnd); let diffDays = Math.ceil((eEnd - today) / (1000 * 60 * 60 * 24));
            if(diffDays >= 0 && diffDays <= 45) {
                let c = clientsList.find(x => x.id === ep.clientId);
                thirtyDaysHtml += `<div class="flex justify-between items-center bg-green-50 p-3 rounded-xl border border-green-200"><div><span class="font-bold cursor-pointer hover:underline text-green-900" onclick="openClientFull(${c.id})">${c.name}</span> <span class="text-xs text-green-700 font-bold">(OBCY: ${ep.subject})</span></div><div class="text-right"><span class="text-xs font-bold text-green-700">Przejęcie za ${diffDays} dni!</span></div></div>`;
            }
        }
    });

    policiesList.forEach(p => {
        let c = clientsList.find(x => x.id === p.clientId); if(!c) return;
        if(p.dateStart && new Date(p.dateStart).getMonth() + 1 === currentMonth && new Date(p.dateStart).getFullYear() === today.getFullYear()) { monthPrem += parseFloat(p.premium) || 0; monthComm += parseFloat(p.commissionAmt) || 0; countPolicies++; }
        
        if(p.reqAc && !p.acDone) { overdueHtml += `<div class="flex justify-between items-center bg-red-50 p-2 rounded-lg border border-red-200"><div><span class="font-bold text-red-800 cursor-pointer hover:underline" onclick="openDrawer('policy', ${p.id})">${c.name}</span><p class="text-xs text-red-600 font-bold">📸 Brak zdjęć do AC!</p></div></div>`; }
        if(p.reqOc && !p.ocDone) { overdueHtml += `<div class="flex justify-between items-center bg-red-50 p-2 rounded-lg border border-red-200"><div><span class="font-bold text-red-800 cursor-pointer hover:underline" onclick="openDrawer('policy', ${p.id})">${c.name}</span><p class="text-xs text-red-600 font-bold">✉️ Nie wysłano wypowiedzenia starego OC!</p></div></div>`; }

        if(p.dateEnd) {
            let dEnd = new Date(p.dateEnd); let diffDays = Math.ceil((dEnd - today) / (1000 * 60 * 60 * 24));
            if(diffDays >= 0 && diffDays <= 30) { thirtyDaysHtml += `<div class="flex justify-between items-center bg-luxBg p-3 rounded-xl border border-luxBorder"><div><span class="font-bold cursor-pointer hover:underline" onclick="openClientFull(${c.id})">${c.name}</span> <span class="text-xs text-textMuted">(${p.insurer})</span></div><div class="text-right"><span class="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded">Za ${diffDays} dni (${p.dateEnd})</span></div></div>`; }
            if(dEnd >= today && dEnd <= 45) { 
                let bColor = diffDays < 10 ? 'text-red-600' : 'text-amber-600'; let actions = '';
                if(p.renewalStatus === 'todo' || !p.renewalStatus) actions = `<button onclick="updateKanbanStatus(${p.id}, 'offer')" class="text-[10px] bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold">Wyślij ofertę ➔</button>`;
                if(p.renewalStatus === 'offer') actions = `<button onclick="updateKanbanStatus(${p.id}, 'won')" class="text-[10px] bg-green-100 text-green-800 px-2 py-1 rounded mr-1 font-bold">✅ Sukces</button> <button onclick="updateKanbanStatus(${p.id}, 'lost')" class="text-[10px] bg-red-100 text-red-800 px-2 py-1 rounded font-bold">❌ Porażka</button>`;
                let card = `<div class="bg-white p-3 rounded-lg shadow-sm border border-luxBorder relative group"><p class="font-bold text-sm text-textDark cursor-pointer hover:text-goldAccent" onclick="openClientFull(${c.id})">${c.name}</p><p class="text-xs text-textMuted">${p.insurer}</p><div class="flex justify-between items-center mt-2"><span class="text-[10px] font-bold ${bColor}">Koniec: ${p.dateEnd}</span></div><div class="mt-3 flex justify-end border-t pt-2">${actions}</div></div>`;
                let s = p.renewalStatus || 'todo'; if(s === 'todo') kbTodo += card; if(s === 'offer') kbOffer += card; if(s === 'won') kbWon += card; if(s === 'lost') kbLost += card; 
            }
        }
        let makeOverdueRow = (rataName, dateStr, amt) => { overdueHtml += `<div class="flex justify-between items-center bg-red-50 p-2 rounded-lg border border-red-200"><div><span class="font-bold text-red-800 cursor-pointer hover:underline" onclick="openDrawer('policy', ${p.id})">${c.name}</span><p class="text-xs text-red-600">${rataName}: <span class="font-bold">${dateStr}</span> (${formatPLN(amt)})</p></div></div>`; };
        let makeUpcomingRow = (rataName, dateStr, amt) => { upcomingHtml += `<div class="flex justify-between items-center bg-amber-50 p-2 rounded-lg border border-amber-200"><div><span class="font-bold text-amber-900">${c.name}</span><p class="text-xs text-amber-700">${rataName}: <span class="font-bold">${dateStr}</span> (${formatPLN(amt)})</p></div></div>`; };
        let next7Days = new Date(today); next7Days.setDate(today.getDate() + 7);
        if(p.firstPaymentDate && !p.firstPaymentPaid) {
            let dFP = new Date(p.firstPaymentDate); let amt = p.installments > 1 && p.installmentDates && p.installmentDates[2] ? p.installmentDates[2].amount : p.premium;
            if(dFP < today) makeOverdueRow(p.installments > 1 ? 'I rata' : 'Całość', p.firstPaymentDate, amt);
            else if(dFP >= today && dFP <= next7Days) makeUpcomingRow(p.installments > 1 ? 'I rata' : 'Całość', p.firstPaymentDate, amt);
        }
        if(p.installments > 1 && p.installmentDates) {
            for(let i in p.installmentDates) { let inst = p.installmentDates[i]; if(inst.date && !inst.paid) { let dInst = new Date(inst.date); if(dInst < today) makeOverdueRow(`Rata ${i}`, inst.date, inst.amount); else if(dInst >= today && dInst <= next7Days) makeUpcomingRow(`Rata ${i}`, inst.date, inst.amount); } }
        }
    });

    document.getElementById('dash_countPolicies').innerText = countPolicies; document.getElementById('dash_monthPrem').innerText = formatPLN(monthPrem); document.getElementById('dash_monthComm').innerText = formatPLN(monthComm);
    document.getElementById('dash_thirtyDays').innerHTML = thirtyDaysHtml || '<p class="text-sm text-textMuted">Brak polis wygasających w 30 dniach.</p>';
    document.getElementById('dash_birthdays').innerHTML = birthdaysHtml || '<p class="text-sm text-textMuted">Brak urodzin/przeglądów.</p>';
    document.getElementById('dash_overdue').innerHTML = overdueHtml || '<p class="text-sm text-textMuted text-green-700 font-semibold">Brak zaległych zadań i płatności.</p>';
    document.getElementById('dash_upcoming').innerHTML = upcomingHtml || '<p class="text-sm text-textMuted">Brak rat w najbliższym tygodniu.</p>';
    if(document.getElementById('k_todo')) { document.getElementById('k_todo').innerHTML = kbTodo || '<p class="text-[10px] text-gray-400">Brak polis.</p>'; document.getElementById('k_offer').innerHTML = kbOffer || '<p class="text-[10px] text-gray-400">Brak ofert.</p>'; document.getElementById('k_won').innerHTML = kbWon || ''; document.getElementById('k_lost').innerHTML = kbLost || ''; }
    
    let g = localStorage.getItem('agent_monthly_goal') || 10000;
    document.getElementById('dash_goalText').innerText = `${formatPLN(monthPrem)} / ${formatPLN(g)}`;
    let pct = Math.min((monthPrem / g) * 100, 100); document.getElementById('dash_goalBar').style.width = pct + '%';
}

function renderFinances() {
    let yearsMap = {}; let paidComm = 0; let pendingComm = 0; let premiumPaid = 0; let premiumPending = 0; let pendingListHtml = "";
    let filterVal = document.getElementById('financeMonthFilter') ? document.getElementById('financeMonthFilter').value : null; 
    let fYear = filterVal ? parseInt(filterVal.split('-')[0]) : null; let fMonth = filterVal ? parseInt(filterVal.split('-')[1]) : null;

    policiesList.forEach(p => {
        let y = p.dateStart ? new Date(p.dateStart).getFullYear() : null; 
        if(y) { 
            if(!yearsMap[y]) yearsMap[y] = { premium: 0, commTotal: 0, commPaid: 0, commPending: 0 }; 
            yearsMap[y].premium += parseFloat(p.premium) || 0; 
            yearsMap[y].commTotal += parseFloat(p.commissionAmt) || 0; 
        }
        let c = clientsList.find(x => x.id === p.clientId); let totalComm = parseFloat(p.commissionAmt) || 0; let numInst = p.installments || 1; let partComm = totalComm / numInst;
        
        let checkRata = (dateStr, amountStr, isPaid, rataName) => {
            if(!dateStr) return; let d = new Date(dateStr); 
            if(y) { if(isPaid) yearsMap[y].commPaid += partComm; else yearsMap[y].commPending += partComm; }
            if(fYear && fMonth && (d.getFullYear() !== fYear || (d.getMonth() + 1) !== fMonth)) return;
            let cAmt = parseFloat(amountStr) || 0; 
            if(isPaid) { premiumPaid += cAmt; paidComm += partComm; } 
            else { premiumPending += cAmt; pendingComm += partComm; pendingListHtml += `<tr class="hover:bg-luxBg/60 transition-all cursor-pointer" onclick="openDrawer('policy', ${p.id})"><td class="p-4 font-bold text-textDark">${p.insurer}</td><td class="p-4 font-semibold text-goldAccent" onclick="event.stopPropagation(); openClientFull(${p.clientId})">${c ? c.name : "Nieznany"}</td><td class="p-4 text-sm font-bold text-textDark">${dateStr}</td><td class="p-4 text-right font-bold text-red-600">${formatPLN(cAmt)}</td><td class="p-4 text-right font-bold text-amber-600">${formatPLN(partComm)}</td></tr>`; }
        };
        if (p.firstPaymentDate) { let firstAmt = (p.installments > 1 && p.installmentDates && p.installmentDates[2]) ? p.installmentDates[2].amount : p.premium; checkRata(p.firstPaymentDate, firstAmt, p.firstPaymentPaid, (p.installments > 1 ? 'Rata I' : 'Całość')); }
        if (p.installments > 1 && p.installmentDates) { for(let i = 2; i <= p.installments; i++) { let inst = p.installmentDates[i]; if(inst && inst.date) checkRata(inst.date, inst.amount, inst.paid, `Rata ${i}`); } }
    });
    
    let tbody = document.getElementById('yearlyStatsBody'); if(tbody) tbody.innerHTML = '';
    Object.keys(yearsMap).sort((a,b) => b - a).forEach(y => { let d = yearsMap[y]; tbody.innerHTML += `<tr class="hover:bg-luxBg/60 transition-all border-l-4 border-transparent hover:border-goldAccent"><td class="p-4 font-bold text-textDark text-lg">${y}</td><td class="p-4 text-right font-bold text-indigo-600">${formatPLN(d.premium)}</td><td class="p-4 text-right font-bold text-blue-600">${formatPLN(d.commTotal)}</td><td class="p-4 text-right font-bold text-green-600">${formatPLN(d.commPaid)}</td><td class="p-4 text-right font-bold text-amber-600">${formatPLN(d.commPending)}</td></tr>`; });

    let fp = document.getElementById('f_paidAmount'); if(fp) fp.innerText = formatPLN(paidComm); let fpe = document.getElementById('f_pendingAmount'); if(fpe) fpe.innerText = formatPLN(pendingComm);
    let fpp = document.getElementById('f_premiumPaid'); if(fpp) fpp.innerText = formatPLN(premiumPaid); let fppen = document.getElementById('f_premiumPending'); if(fppen) fppen.innerText = formatPLN(premiumPending);
    let pb = document.getElementById('financePendingBody'); if(pb) pb.innerHTML = pendingListHtml || `<tr><td colspan="5" class="p-6 text-center text-textMuted">Brak oczekujących rat.</td></tr>`;
}

// ================= 8. KALENDARZ =================
function renderCalendar() {
    const grid = document.getElementById('calendarGrid'); const evList = document.getElementById('calendarEventsList'); const label = document.getElementById('calendarMonthLabel');
    if(!grid || !evList || !label) return;
    
    const year = currentCalendarDate.getFullYear(); const month = currentCalendarDate.getMonth();
    const monthNames = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];
    label.innerText = `${monthNames[month]} ${year}`;
    
    const firstDay = new Date(year, month, 1).getDay(); const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDay = firstDay === 0 ? 6 : firstDay - 1; // Pn=0
    
    grid.innerHTML = ''; evList.innerHTML = ''; let eventsInMonth = [];
    
    // Szukanie wydarzeń
    clientsList.forEach(c => { if(c.birth && new Date(c.birth).getMonth() === month) eventsInMonth.push({ day: new Date(c.birth).getDate(), type: '🎂', text: `${c.name} (Urodziny)` }); });
    vehiclesList.forEach(v => { if(v.inspection && new Date(v.inspection).getMonth() === month && new Date(v.inspection).getFullYear() === year) eventsInMonth.push({ day: new Date(v.inspection).getDate(), type: '🔧', text: `${v.plate} (Koniec Przeglądu)` }); });
    policiesList.forEach(p => { 
        if(p.dateEnd && new Date(p.dateEnd).getMonth() === month && new Date(p.dateEnd).getFullYear() === year) {
            let c = clientsList.find(x => x.id === p.clientId); eventsInMonth.push({ day: new Date(p.dateEnd).getDate(), type: '🛡️', text: `${c ? c.name : 'Polisa'} (Koniec Polisy)` });
        }
    });

    // Rysowanie siatki
    for(let i=0; i<startDay; i++) { grid.innerHTML += `<div class="p-2 border border-gray-100 bg-gray-50 rounded text-transparent">0</div>`; }
    for(let d=1; d<=daysInMonth; d++) {
        let dayEvs = eventsInMonth.filter(e => e.day === d);
        let evMarkers = dayEvs.map(e => e.type).join('');
        let isToday = (d === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear());
        let bgClass = isToday ? 'bg-goldAccent/20 border-goldAccent' : 'bg-white border-luxBorder';
        grid.innerHTML += `<div class="p-2 border ${bgClass} rounded min-h-[60px] text-sm"><span class="font-bold ${isToday ? 'text-goldAccent' : ''}">${d}</span><div class="text-[10px] mt-1">${evMarkers}</div></div>`;
    }
    
    // Lista z boku
    eventsInMonth.sort((a,b) => a.day - b.day).forEach(e => {
        evList.innerHTML += `<div class="p-3 bg-luxBg rounded-xl border border-luxBorder text-sm"><span class="font-bold text-textDark mr-2">${e.day} ${monthNames[month].substring(0,3)}</span> ${e.type} ${e.text}</div>`;
    });
    if(eventsInMonth.length === 0) evList.innerHTML = `<p class="text-xs text-textMuted">Brak zapisanych wydarzeń na ten miesiąc.</p>`;
}

function changeCalendarMonth(offset) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + offset);
    renderCalendar();
}

function addCalendarEvent(type) {
    if(type === 'client' && currentOpenId) {
        let c = clientsList.find(x => x.id === currentOpenId);
        if(c) {
            let text = `Skontaktować się z klientem: ${c.name}, tel: ${c.phone}`;
            let url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('Kontakt: ' + c.name)}&details=${encodeURIComponent(text)}`;
            window.open(url, '_blank');
        }
    }
}

// ================= 9. USTAWIENIA, SŁOWNIKI, IMPORT/EXPORT =================
function renderInsurersLibrary() {
    let listBody = document.getElementById('insurersLibraryBody'); if(listBody) listBody.innerHTML = "";
    let pIns = document.getElementById('p_insurer'); let sIns = document.getElementById('set_insurer'); let oIns = document.getElementById('off_tu');
    if(pIns) pIns.innerHTML = ""; if(sIns) sIns.innerHTML = ""; if(oIns) oIns.innerHTML = "";
    insurersLibrary.sort().forEach((ins, idx) => {
        if(listBody) listBody.innerHTML += `<tr class="hover:bg-luxBg"><td class="p-2.5 font-bold">${ins}</td><td class="p-2.5 text-right"><button onclick="deleteInsurer(${idx})" class="text-red-500 text-xs font-bold">Usuń</button></td></tr>`;
        if(pIns) pIns.innerHTML += `<option value="${ins}">${ins}</option>`; 
        if(sIns) sIns.innerHTML += `<option value="${ins}">${ins}</option>`; 
        if(oIns) oIns.innerHTML += `<option value="${ins}">${ins}</option>`;
    });
}
function addInsurerToLibrary() { let val = document.getElementById('set_newInsurer').value.trim(); if(val && !insurersLibrary.includes(val)) { insurersLibrary.push(val); syncAndRender(); document.getElementById('set_newInsurer').value = ""; } }
function deleteInsurer(idx) { if(confirm("Usunąć to TU?")) { insurersLibrary.splice(idx, 1); syncAndRender(); } }

function renderCommissionDict() {
    let b = document.getElementById('commissionDictBody'); if(!b) return; b.innerHTML = "";
    if(commDictList.length === 0) return b.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-textMuted text-xs">Brak reguł prowizyjnych.</td></tr>`;
    commDictList.forEach(r => { b.innerHTML += `<tr class="hover:bg-luxBg"><td class="p-2 font-bold">${r.insurer}</td><td class="p-2 text-blue-800 font-semibold">${r.risk}</td><td class="p-2 font-bold text-goldAccent text-right">${r.pct}%</td><td class="p-2 text-right"><button onclick="deleteCommRule(${r.id})" class="text-red-500 font-bold text-xs">Usuń</button></td></tr>`; });
}
function addCommissionRule() {
    let insurer = document.getElementById('set_insurer').value; let risk = document.getElementById('set_risk').value.trim().toUpperCase(); let pct = parseFloat(document.getElementById('set_pct').value);
    if(!risk || isNaN(pct)) return alert("Podaj nazwę i %");
    let existing = commDictList.findIndex(r => r.insurer === insurer && r.risk === risk);
    if(existing >= 0) commDictList[existing].pct = pct; else commDictList.push({ id: Date.now(), insurer: insurer, risk: risk, pct: pct });
    syncAndRender(); document.getElementById('set_risk').value = ""; document.getElementById('set_pct').value = ""; updateRiskDatalist();
}
function deleteCommRule(id) { commDictList = commDictList.filter(r => r.id !== id); syncAndRender(); updateRiskDatalist(); }

// EKSPORT
function exportData() {
    const dataStr = JSON.stringify({ clients: clientsList, policies: policiesList, vehicles: vehiclesList, properties: propertiesList, externalPolicies: externalPoliciesList, commDict: commDictList, offers: offersList, insurers: insurersLibrary }, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" }); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `Agent1_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}
function clearDatabase() { 
    if(confirm("UWAGA! Usuniesz bezpowrotnie wszystkie dane z bazy. Jesteś pewny?")) { 
        clientsList = []; policiesList = []; vehiclesList = []; propertiesList = []; externalPoliciesList = []; offersList = []; 
        syncAndRender(); 
    } 
}