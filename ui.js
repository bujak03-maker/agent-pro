// ui.js - Logika interfejsu, skrótów klawiszowych (Enter / Escape) i obsługi okien

// 1. GLOBALNY NASŁUCH KLAWISZY (ESCAPE oraz ENTER)
document.addEventListener('keydown', function(event) {
    // ESCAPE - zamyka wszystkie aktywne modale, szuflady i podpowiedzi
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

    // ENTER - kontekstowe zatwierdzanie formularzy
    if (event.key === "Enter") {
        const activeEl = document.activeElement;
        if (!activeEl || activeEl.tagName === 'TEXTAREA') return; // W polach wielolinijkowych Enter robi nową linię

        // Szybkie dodawanie klienta
        const clientModal = document.getElementById('clientModal');
        if (clientModal && clientModal.style.display === 'flex') {
            event.preventDefault();
            if (typeof saveNewClient === 'function') saveNewClient();
            return;
        }

        // Kreator polisy - Krok 4: Dodawanie ryzyka po wciśnięciu Enter w polach ryzyka
        if (['p_riskNameInput', 'p_riskPremInput', 'p_riskPctInput'].includes(activeEl.id)) {
            event.preventDefault();
            if (typeof addRiskToTemp === 'function') addRiskToTemp();
            return;
        }

        // Kreator oferty - Dodawanie wariantu po wciśnięciu Enter
        if (['off_risks', 'off_rata', 'off_prem'].includes(activeEl.id)) {
            event.preventDefault();
            if (typeof addOfferRow === 'function') addOfferRow();
            return;
        }

        // Ustawienia - Dodawanie TU lub reguły prowizji
        if (activeEl.id === 'set_newInsurer') {
            event.preventDefault();
            if (typeof addInsurerToLibrary === 'function') addInsurerToLibrary();
            return;
        }
        if (['set_risk', 'set_pct'].includes(activeEl.id)) {
            event.preventDefault();
            if (typeof addCommissionRule === 'function') addCommissionRule();
            return;
        }
    }
});

// 2. ZARZĄDZANIE ZAKŁADKAMI
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

// 3. OBSŁUGA OKIEN (MODALI)
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

// 4. PRZEŁĄCZNIKI WEWNĄTRZ KART I KREATORÓW
function toggleCfmEdit() {
    let em = document.getElementById('cfm_editMode');
    let vm = document.getElementById('cfm_viewMode');
    let btn = document.getElementById('cfm_btnEdit');
    if(em.classList.contains('hidden')) {
        if (typeof clientsList !== 'undefined' && typeof currentOpenId !== 'undefined') {
            let c = clientsList.find(x => x.id === currentOpenId);
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

function toggleAddVehicle() { 
    let box = document.getElementById('cfm_addVehicleBox');
    box.classList.toggle('hidden');
    if (!box.classList.contains('hidden')) {
        ['v_brand', 'v_model', 'v_year', 'v_plate', 'v_vin', 'v_inspection'].forEach(id => {
            if(document.getElementById(id)) document.getElementById(id).value = "";
        });
        if(document.getElementById('v_anglik')) document.getElementById('v_anglik').checked = false;
        document.getElementById('v_brand').focus();
    }
}

function toggleAddProperty() { 
    let box = document.getElementById('cfm_addPropertyBox');
    box.classList.toggle('hidden'); 
    if (!box.classList.contains('hidden')) {
        document.getElementById('prop_address').value = "";
        document.getElementById('prop_flammable').checked = false;
        document.getElementById('prop_flood').checked = false;
        document.getElementById('prop_address').focus();
    }
}

// Przełączanie widoku Krok 3 w kreatorze polisy (Pojazd vs Majątek/Inne)
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
}