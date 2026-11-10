// ui.js - Logika interfejsu, przełączania zakładek i zamykania okien (Escape)

// 1. GLOBALNY NASŁUCH KLAWISZA ESCAPE
document.addEventListener('keydown', function(event) {
    if (event.key === "Escape") {
        closeClientModal();
        closeClientFull();
        closeOfferModal();
        closePolicyModal();
        closeDrawer('policy');
        
        // Zamykanie wyników wyszukiwarki globalnej
        let searchRes = document.getElementById('globalSearchResults');
        if (searchRes && !searchRes.classList.contains('hidden')) {
            searchRes.classList.add('hidden');
        }
    }
});

// 2. ZARZĄDZANIE ZAKŁADKAMI
function switchTab(t) {
    const tabs = ['dashboard', 'clients', 'policies', 'offers', 'renewals', 'finances', 'calendar', 'settings'];
    
    // Resetowanie wyglądu wszystkich zakładek i przycisków
    tabs.forEach(x => {
        let tab = document.getElementById('tab-' + x);
        let btn = document.getElementById('btn-' + x);
        if (tab) tab.classList.add('hidden');
        if (btn) btn.className = "px-3 py-2 rounded-lg text-sm font-medium text-textMuted hover:text-textDark transition-all";
    });
    
    // Aktywacja klikniętej zakładki
    let activeTab = document.getElementById('tab-' + t);
    let activeBtn = document.getElementById('btn-' + t);
    
    if (activeTab) activeTab.classList.remove('hidden');
    if (activeBtn) activeBtn.className = "px-3 py-2 rounded-lg text-sm font-medium bg-goldAccent text-white shadow-sm transition-all";
    
    // Wyzwalanie funkcji renderujących z app.js (jeśli istnieją)
    if (typeof renderAll === 'function' && t !== 'calendar') renderAll();
    if (typeof renderCalendar === 'function' && t === 'calendar') renderCalendar();
}

// 3. OBSŁUGA OKIEN (MODALI)
function openClientModal() { 
    document.getElementById('clientModal').style.display = 'flex'; 
    document.getElementById('addName').focus(); 
}
function closeClientModal() { 
    document.getElementById('clientModal').style.display = 'none'; 
}

function openClientFull(id) {
    if (typeof currentOpenId !== 'undefined') currentOpenId = id;
    document.getElementById('clientFullModalOverlay').classList.remove('hidden');
    // Ładowanie danych klienta (funkcja będzie w app.js)
    if (typeof populateClientFull === 'function') populateClientFull(id); 
}
function closeClientFull() { 
    document.getElementById('clientFullModalOverlay').classList.add('hidden'); 
}

function openOfferModal(offerId = null, prefillClientId = null) {
    if (typeof editingOfferId !== 'undefined') editingOfferId = offerId;
    document.getElementById('offerModal').classList.remove('hidden');
    // Ładowanie danych do formularza oferty (funkcja będzie w app.js)
    if (typeof populateOfferModal === 'function') populateOfferModal(offerId, prefillClientId);
}
function closeOfferModal() { 
    document.getElementById('offerModal').classList.add('hidden'); 
}

function openPolicyModal(editId = null, prefillClientId = null) {
    document.getElementById('policyModal').classList.remove('hidden');
    document.getElementById('policyModal').classList.add('flex');
    // Ładowanie formularza polisy (funkcja będzie w app.js)
    if (typeof populatePolicyModal === 'function') populatePolicyModal(editId, prefillClientId); 
}
function closePolicyModal() { 
    document.getElementById('policyModal').classList.add('hidden'); 
    document.getElementById('policyModal').classList.remove('flex'); 
}

function openDrawer(type, id) {
    closeDrawer('policy'); // Zamknij inne, jeśli otwarte
    let overlay = document.getElementById(type + 'DrawerOverlay');
    let drawer = document.getElementById(type + 'Drawer');
    if(overlay && drawer) {
        overlay.classList.remove('hidden');
        drawer.classList.remove('drawer-closed');
        drawer.classList.add('drawer-open');
    }
    // Wypełnianie Szuflady danymi (funkcja będzie w app.js)
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

// 4. PRZEŁĄCZNIKI (Rozwijanie sekcji wewnątrz modali)
function toggleCfmEdit() {
    let em = document.getElementById('cfm_editMode');
    let vm = document.getElementById('cfm_viewMode');
    let btn = document.getElementById('cfm_btnEdit');
    if(em.classList.contains('hidden')) {
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
    document.getElementById('cfm_addVehicleBox').classList.toggle('hidden'); 
}
function toggleAddProperty() { 
    document.getElementById('cfm_addPropertyBox').classList.toggle('hidden'); 
}