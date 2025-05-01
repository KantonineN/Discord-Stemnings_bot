const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get, child } = require('firebase/database');

const firebaseConfig = {
    apiKey: "AIzaSyC_gdV1rwCVWpXQfVBSR0k2oMEg2ikeSgI",
    authDomain: "spooky-bot-ucl.firebaseapp.com",
    databaseURL: "https://spooky-bot-ucl-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "spooky-bot-ucl",
    storageBucket: "spooky-bot-ucl.firebasestorage.app",
    messagingSenderId: "707657545351",
    appId: "1:707657545351:web:45a41274e8e112d57e2a22"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

module.exports = { db, ref, get, child };