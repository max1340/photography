import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getDatabase, ref, set, get, child, remove } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js";

// Настройки Firebase
const firebaseConfig = {
    apiKey: "AIzaSyC5aYba4eGsnSRDvmK5pIApjIrbJOrUXNQ",
    authDomain: "pc-building-b3d74.firebaseapp.com",
    databaseURL: "https://pc-building-b3d74-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "pc-building-b3d74",
    storageBucket: "pc-building-b3d74.firebasestorage.app",
    messagingSenderId: "1000168163599",
    appId: "1:1000168163599:web:6c64d4b7782100a27a167a",
    measurementId: "G-SM5V2K63JX"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

// Функции для работы с базой (в папке kadr_website)
export async function dbPut(st, id, data) {
    await set(ref(db, `kadr_website/${st}/${id}`), data);
}

export async function dbAll(st) {
    const snapshot = await get(child(ref(db), `kadr_website/${st}`));
    if (snapshot.exists()) {
        const val = snapshot.val();
        return Object.keys(val).map(k => val[k]);
    }
    return [];
}

export async function dbDel(st, id) {
    await remove(ref(db, `kadr_website/${st}/${id}`));
}

export async function dbGetObj(st) {
    const snapshot = await get(child(ref(db), `kadr_website/${st}`));
    return snapshot.exists() ? snapshot.val() : null;
}

export async function dbSetObj(st, data) {
    await set(ref(db, `kadr_website/${st}`), data);
}




