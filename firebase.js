const admin = require("firebase-admin");
const serviceAccount = require('./serviceAccountKey.json'); // Din downloadede nøgle

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://stemningsbot-default-rtdb.europe-west1.firebasedatabase.app"
});

const db = admin.database();

module.exports = { db };