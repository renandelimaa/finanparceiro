const admin = require('firebase-admin');
admin.initializeApp();
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
