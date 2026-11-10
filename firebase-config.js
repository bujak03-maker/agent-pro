// firebase-config.js

// 1. Twoje klucze autoryzacyjne
const firebaseConfig = {
    apiKey: "AIzaSyDpPbBcEaHJex9E2r5DMpdUhmQ9YKZjzpc",
    authDomain: "agent-776f7.firebaseapp.com",
    projectId: "agent-776f7",
    storageBucket: "agent-776f7.firebasestorage.app",
    messagingSenderId: "994330703995",
    appId: "1:994330703995:web:ce01e194eb802eb49a4ade"
};

// 2. Inicjalizacja Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
let currentUserUid = null;

// 3. Nasłuchiwanie stanu logowania (Zarządzanie widocznością)
auth.onAuthStateChanged(async user => {
    if (user) {
        // Zalogowano
        currentUserUid = user.uid;
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('mainHeader').classList.remove('hidden');
        document.getElementById('mainAppContent').classList.remove('hidden');
        
        // Wywołanie funkcji z app.js ładującej dane z chmury (jeśli istnieje)
        if (typeof loadDataFromFirebase === 'function') {
            await loadDataFromFirebase();
        }
    } else {
        // Wylogowano
        currentUserUid = null;
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('mainHeader').classList.add('hidden');
        document.getElementById('mainAppContent').classList.add('hidden');
    }
});

// 4. Funkcje Logowania i Wylogowania
function doLogin() {
    const e = document.getElementById('loginEmail').value; 
    const p = document.getElementById('loginPass').value; 
    const err = document.getElementById('loginError');
    
    if(!e || !p) { 
        err.innerText = "Wpisz e-mail i hasło"; 
        err.classList.remove('hidden'); 
        return; 
    }
    
    auth.signInWithEmailAndPassword(e, p).catch(error => { 
        err.innerText = "Błąd: Nieprawidłowe dane logowania."; 
        err.classList.remove('hidden'); 
    });
}

function doLogout() { 
    auth.signOut(); 
}

// 5. Obsługa klawisza ENTER przy logowaniu
document.addEventListener('DOMContentLoaded', () => {
    const emailInput = document.getElementById('loginEmail');
    const passInput = document.getElementById('loginPass');
    
    if(emailInput) {
        emailInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                passInput.focus(); // Enter w e-mailu przechodzi do hasła
            }
        });
    }
    
    if(passInput) {
        passInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                doLogin(); // Enter w haśle loguje
            }
        });
    }
});