var admin = require("firebase-admin");

//var serviceAccount = require("./serviceAccountKey.json");
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
