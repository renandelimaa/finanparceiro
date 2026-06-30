const admin = require('firebase-admin');
const serviceAccount = require('./firebase.json'); // wait, the user's project uses default credentials locally. Let's just initialize.
admin.initializeApp({ projectId: 'finanparceiro' });
const db = admin.firestore();

async function run() {
    const userId = process.env.ADMIN_USER_ID || "admin";
    const doc = await db.collection('users').doc(userId).get();
    const data = doc.data();
    const cartoes = data.corrente.cartoes || [];
    const nubank = cartoes.find(c => c.nome.toLowerCase() === 'nubank');
    if (nubank) {
        console.log("Compras Nubank:", JSON.stringify(nubank.compras, null, 2));
    } else {
        console.log("Nubank nao encontrado");
    }
}
run();
