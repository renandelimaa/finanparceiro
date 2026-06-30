const admin = require('firebase-admin');

// Inicializa o app do Firebase Admin se ainda não existir
if (admin.apps.length === 0) {
    admin.initializeApp();
}

const db = admin.firestore();

/**
 * Lê o documento principal do usuário no Firestore
 * e constrói um resumo enxuto (Payload JSON em string) para a IA.
 */
async function buildContextPayload(userId) {
    const userRef = db.collection('users').doc(userId);
    const doc = await userRef.get();

    if (!doc.exists) {
        throw new Error("Documento do usuário não encontrado no banco de dados.");
    }

    const data = doc.data();

    // 1. Saldo e Taxa CDI
    const saldoAtual = (data.corrente && data.corrente.numeroPaz) ? data.corrente.numeroPaz : 0;
    const taxaCDI = (data.configuracoes && data.configuracoes.taxaCDIAnual) ? data.configuracoes.taxaCDIAnual : 10.4;

    // 2. Resumo de Cartões (economia de tokens com poda inteligente)
    const cartoesResumo = [];
    if (data.corrente && Array.isArray(data.corrente.cartoes)) {
        data.corrente.cartoes.forEach(cartao => {
            // Filtra as compras apenas dos últimos 45 dias para dar contexto cirúrgico sem pesar
            let comprasRecentes = [];
            let totalCompras = 0;
            if (Array.isArray(cartao.compras)) {
                totalCompras = cartao.compras.reduce((acc, compra) => acc + (Number(compra.valor) || 0), 0);
                
                const dataLimite = new Date();
                dataLimite.setDate(dataLimite.getDate() - 45); // 45 dias atrás
                
                comprasRecentes = cartao.compras
                    .filter(c => new Date(c.data) >= dataLimite)
                    .map(c => ({ titulo: c.titulo, valor: c.valor, data: c.data, parcelas: c.parcelas }));
            }
            
            cartoesResumo.push({
                nome: cartao.nome,
                diaFechamento: cartao.diaFechamento,
                diaVencimento: cartao.diaVencimento,
                limiteTotal: cartao.limiteTotal,
                faturaAtualEstimada: totalCompras,
                comprasRecentes: comprasRecentes // Contexto enxuto das últimas compras no cartão
            });
        });
    }

    // 3. Resumo de Metas
    const metasResumo = [];
    if (Array.isArray(data.metas)) {
        data.metas.forEach(meta => {
            let totalAportes = 0;
            if (Array.isArray(meta.aportes)) {
                totalAportes = meta.aportes.reduce((acc, ap) => acc + (Number(ap.valor) || 0), 0);
            }
            const rendimento = Number(meta.rendimentoAcumulado) || 0;
            const saldoAcumulado = totalAportes + rendimento;

            metasResumo.push({
                nome: meta.nome,
                valorTotalObjetivo: meta.valorTotal || 0,
                saldoAcumuladoAtual: saldoAcumulado
            });
        });
    }

    // 4. Fluxo de Caixa Recente (Últimas 30 transações da conta corrente)
    let transacoesRecentes = [];
    if (data.corrente && Array.isArray(data.corrente.transacoes)) {
        // Ordena por data mais recente e pega só as últimas 30
        const ordenadas = [...data.corrente.transacoes].sort((a, b) => new Date(b.data) - new Date(a.data));
        transacoesRecentes = ordenadas.slice(0, 30).map(t => ({
            titulo: t.titulo,
            valor: t.valor,
            tipo: t.tipo, // GANHO ou SAIDA
            data: t.data,
            categoria: t.categoria
        }));
    }

    // Montando o Payload final enxuto
    const payload = {
        dataServidor: new Date().toISOString(),
        financas: {
            saldoContaCorrente: saldoAtual,
            taxaCDIAnualBase: taxaCDI,
            cartoesDeCredito: cartoesResumo,
            transacoesRecentes: transacoesRecentes,
            metasEInvestimentos: metasResumo
        }
    };

    // Retorna a string JSON formatada e compacta
    return JSON.stringify(payload);
}

module.exports = {
    buildContextPayload
};
