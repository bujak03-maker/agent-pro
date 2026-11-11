// ui.js - Logika interfejsu, skrótów klawiszowych (Enter / Escape) i obsługi okien

document.addEventListener('keydown', function(event) {
    // ESCAPE - zamyka aktywne modale, szuflady i podpowiedzi wyszukiwarki
    if (event.key === "Escape") {
        closeClientModal();
        closeClientFull();
        closeOfferModal();
        closePolicyModal();
        closeDrawer('policy');
        
        let searchRes = document.getElementById('globalSearchResults');
        if (searchRes && !searchRes.classList.contains('hidden')) {
            searchRes.classList.add('hidden');
        }
    }

    // ENTER - inteligentne zatwierdzanie formularzy
    if (event.key === "Enter") {
        const activeEl = document.activeElement;
        if (!activeEl || activeEl.tagName === 'TEXTAREA') return;

        // Szybkie dodawanie klienta (modal z pulpitu/zakładki klienci)
        const clientModal = document.getElementById('clientModal');
        if (clientModal && clientModal.style.display === 'flex') {
            event.preventDefault();
            if (typeof saveNewClient === 'function') saveNewClient();
            return;
        }

        // Kreator polisy - Krok 1: Szybkie zapisanie nowego klienta/firmy w locie
        if (['p_quickName', 'p_quickBirth', 'p_quickLicense'].includes(activeEl.id)) {
            event.preventDefault();
            if (typeof saveQuickClientFromPolicy === 'function') saveQuickClientFromPolicy();
            return;
        }

        // Kreator polisy - Krok 4: Dodawanie ryzyka
        if (['p_riskNameInput', 'p_riskPremInput', 'p_riskPctInput'].includes(activeEl.id)) {
            event.preventDefault();
            if (typeof addRiskToTemp === 'function') addRiskToTemp();
            return;
        }

        // Szuflada polisy - Zapis ręcznej prowizji po wciśnięciu Enter
        if (['pd_commInput', 'pd_commNoteInput'].includes(activeEl.id)) {
            event.preventDefault();
            if (typeof saveDrawerCommissionOverride === 'function') saveDrawerCommissionOverride();
            return;
        }

        // Kreator oferty - Dodawanie wariantu
        if (['off_risks', 'off_rata', 'off_prem'].includes(activeEl.id)) {
            event.preventDefault();
            if (typeof addOfferRow === 'function') addOfferRow();
            return;
        }

        // Ustawienia - Dodawanie TU, marki lub reguły prowizyjnej
        if (activeEl.id === 'set_newInsurer') {
            event.preventDefault();
            if (typeof addInsurerToLibrary === 'function') addInsurerToLibrary();
            return;
        }
        if (activeEl.id === 'set_newBrand') {
            event.preventDefault();
            if (typeof addBrandFromSettings === 'function') addBrandFromSettings();
            return;
        }
        if (['set_risk', 'set_pct'].includes(activeEl.id)) {
            event.preventDefault();
            if (typeof addCommissionRule === 'function') addCommissionRule();
            return;
        }
    }
});

// Przełączanie głównych zakładek
function switchTab(t) {
    const tabs = ['dashboard', 'clients', 'policies', 'offers', 'renewals', 'finances', 'calendar', 'settings'];
    
    tabs.forEach(x => {
        let tab = document.getElementById('tab-' + x);
        let btn = document.getElementById('btn-' + x);
        if (tab) tab.classList.add('hidden');
        if (btn) btn.className = "px-3 py-2 rounded-lg text-sm font-medium text-textMuted hover:text-textDark transition-all";
    });
    
    let activeTab = document.getElementById('tab-' + t);
    let activeBtn = document.getElementById('btn-' + t);
    
    if (activeTab) activeTab.classList.remove('hidden');
    if (activeBtn) activeBtn.className = "px-3 py-2 rounded-lg text-sm font-medium bg-goldAccent text-white shadow-sm transition-all";
    
    if (typeof syncAndRender === 'function') syncAndRender(false);
}

// Obsługa modali
function openClientModal() { 
    document.getElementById('addName').value = "";
    document.getElementById('addPesel').value = "";
    document.getElementById('clientModal').style.display = 'flex'; 
    setTimeout(() => document.getElementById('addName').focus(), 50); 
}
function closeClientModal() { 
    document.getElementById('clientModal').style.display = 'none'; 
}

function openClientFull(id) {
    if (typeof currentOpenId !== 'undefined') currentOpenId = id;
    document.getElementById('clientFullModalOverlay').classList.remove('hidden');
    if (typeof populateClientFull === 'function') populateClientFull(id); 
}
function closeClientFull() { 
    document.getElementById('clientFullModalOverlay').classList.add('hidden'); 
}

function openOfferModal(offerId = null, prefillClientId = null) {
    if (typeof editingOfferId !== 'undefined') editingOfferId = offerId;
    document.getElementById('offerModal').classList.remove('hidden');
    if (typeof populateOfferModal === 'function') populateOfferModal(offerId, prefillClientId);
}
function closeOfferModal() { 
    document.getElementById('offerModal').classList.add('hidden'); 
}

function openPolicyModal(editId = null, prefillClientId = null) {
    document.getElementById('policyModal').classList.remove('hidden');
    document.getElementById('policyModal').classList.add('flex');
    if (typeof populatePolicyModal === 'function') populatePolicyModal(editId, prefillClientId); 
}
function closePolicyModal() { 
    document.getElementById('policyModal').classList.add('hidden'); 
    document.getElementById('policyModal').classList.remove('flex'); 
}

function openDrawer(type, id) {
    closeDrawer('policy');
    let overlay = document.getElementById(type + 'DrawerOverlay');
    let drawer = document.getElementById(type + 'Drawer');
    if(overlay && drawer) {
        overlay.classList.remove('hidden');
        drawer.classList.remove('drawer-closed');
        drawer.classList.add('drawer-open');
    }
    if (typeof populateDrawer === 'function') populateDrawer(type, id); 
}
function closeDrawer(type) {
    let overlay = document.getElementById(type + 'DrawerOverlay');
    let drawer = document.getElementById(type + 'Drawer');
    if(overlay && drawer) {
        overlay.classList.add('hidden');
        drawer.classList.remove('drawer-open');
        drawer.classList.add('drawer-closed');
    }
}

// Przełączanie edycji danych klienta w karcie pełnej
function toggleCfmEdit() {
    let em = document.getElementById('cfm_editMode');
    let vm = document.getElementById('cfm_viewMode');
    let btn = document.getElementById('cfm_btnEdit');
    if(em.classList.contains('hidden')) {
        if (typeof clientsList !== 'undefined' && typeof currentOpenId !== 'undefined') {
            let c = clientsList.find(x => String(x.id) === String(currentOpenId));
            if (c) {
                document.getElementById('ce_name').value = c.name || "";
                document.getElementById('ce_pesel').value = c.pesel || "";
                document.getElementById('ce_nip').value = c.nip || "";
                document.getElementById('ce_regon').value = c.regon || "";
                document.getElementById('ce_phone').value = c.phone || "";
                document.getElementById('ce_email').value = c.email || "";
                document.getElementById('ce_birth').value = c.birth || "";
                document.getElementById('ce_license').value = c.licenseDate || "";
                document.getElementById('ce_address').value = c.address || "";
                document.getElementById('ce_source').value = c.source || "";
            }
        }
        vm.classList.add('hidden'); 
        em.classList.remove('hidden'); 
        btn.innerText = "Anuluj";
    } else { 
        vm.classList.remove('hidden'); 
        em.classList.add('hidden'); 
        btn.innerText = "Edytuj"; 
    }
}

// Otwieranie / zamykanie formularza nowego pojazdu w garażu
function toggleAddVehicle() { 
    let box = document.getElementById('cfm_addVehicleBox');
    if (typeof editingVehicleId !== 'undefined') editingVehicleId = null;
    
    box.classList.toggle('hidden');
    if (!box.classList.contains('hidden')) {
        let titleEl = document.getElementById('v_formTitle');
        if(titleEl) titleEl.innerText = "Nowy Pojazd";
        ['v_brand', 'v_model', 'v_year', 'v_cap', 'v_kw', 'v_km', 'v_plate', 'v_mileage', 'v_vin', 'v_firstReg', 'v_inspection'].forEach(id => {
            if(document.getElementById(id)) document.getElementById(id).value = "";
        });
        if(document.getElementById('v_anglik')) document.getElementById('v_anglik').checked = false;
        document.getElementById('v_brand').focus();
    }
}

// Automatyczny przelicznik kW <-> KM (1 kW = 1.35962 KM)
function calcKmFromKw(kwVal) {
    let kw = parseFloat(kwVal);
    let kmEl = document.getElementById('v_km');
    if (!kmEl) return;
    if (!isNaN(kw) && kw > 0) {
        kmEl.value = Math.round(kw * 1.35962);
    } else {
        kmEl.value = "";
    }
}

function calcKwFromKm(kmVal) {
    let km = parseFloat(kmVal);
    let kwEl = document.getElementById('v_kw');
    if (!kwEl) return;
    if (!isNaN(km) && km > 0) {
        kwEl.value = Math.round(km / 1.35962);
    } else {
        kwEl.value = "";
    }
}

// Otwieranie / zamykanie rozbudowanego formularza lokalu / nieruchomości
function toggleAddProperty() { 
    let box = document.getElementById('cfm_addPropertyBox');
    if (typeof editingPropertyId !== 'undefined') editingPropertyId = null;

    box.classList.toggle('hidden'); 
    if (!box.classList.contains('hidden')) {
        let titleEl = document.getElementById('prop_formTitle');
        if(titleEl) titleEl.innerText = "Nowy Lokal / Nieruchomość";
        if(document.getElementById('prop_type')) document.getElementById('prop_type').value = "Mieszkanie";
        if(document.getElementById('prop_ownership')) document.getElementById('prop_ownership').value = "Własność";
        ['prop_address', 'prop_area', 'prop_year', 'prop_floor', 'prop_suWalls', 'prop_suMovables', 'prop_suOc', 'prop_cession'].forEach(id => {
            if(document.getElementById(id)) document.getElementById(id).value = "";
        });
        ['prop_secDoors', 'prop_secAlarm', 'prop_flammable', 'prop_flood'].forEach(id => {
            if(document.getElementById(id)) document.getElementById(id).checked = false;
        });
        document.getElementById('prop_address').focus();
    }
}

// Przełączanie Krok 3 w kreatorze polisy (Komunikacja vs Majątek/Firmowe)
function handlePolicyTypeChange() {
    let typeEl = document.getElementById('p_type');
    if (!typeEl) return;
    let isCar = (typeEl.value === 'Komunikacja');
    let vehSec = document.getElementById('p_vehicleSection');
    let genSec = document.getElementById('p_generalSection');
    if (vehSec && genSec) {
        vehSec.classList.toggle('hidden', !isCar);
        genSec.classList.toggle('hidden', isCar);
    }
    if (isCar && typeof populateGarageSelectForPolicy === 'function') {
        populateGarageSelectForPolicy();
    } else if (!isCar && typeof populatePropertySelectForPolicy === 'function') {
        populatePropertySelectForPolicy();
    }
}