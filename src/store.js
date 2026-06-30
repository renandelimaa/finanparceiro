import { db, doc, setDoc, getDoc } from './firebase.js';

const getStorageKey = () => localStorage.getItem('tc_auth_token') === 'visitante' ? 'torre_controle_visitante_state' : 'torre_controle_state';

export const CATEGORIAS_GLOBAIS = ['Receita', 'Mercado', 'Transporte', 'Lazer', 'Casa', 'Saúde', 'Educação', 'Assinaturas', 'Autocuidado', 'Outros'];
export const TIPOS_LIQUIDEZ = ['Imediata (Reserva)', 'Médio Prazo (Projetos)', 'Longo Prazo (Aposentadoria)'];

export const MAPA_ICONES = {
    'Receita': 'trending_up',
    'Mercado': 'shopping_cart',
    'Transporte': 'directions_car',
    'Lazer': 'celebration',
    'Casa': 'home',
    'Saúde': 'favorite',
    'Educação': 'school',
    'Assinaturas': 'subscriptions',
    'Autocuidado': 'spa',
    'Outros': 'category'
};

const defaultState = {
    patrimonioLiquido: 125400.00, // Legacy, will be calculated dynamically now
    faturasPagas: [], // formato: cartaoId_ano_mes
    corrente: {
        numeroPaz: 4250.00,
        cartoes: [
            { 
                id: '1', nome: 'Nubank', final: '1234', limiteTotal: 4000.00, tipo: 'CREDIT', corIcone: 'text-nubank-pastel', bgBarra: 'bg-nubank-pastel',
                diaFechamento: 3, diaVencimento: 8, avancoFechamento: 1, avancoVencimento: 1,
                compras: []
            },
            { 
                id: '2', nome: 'Mercado Pago', final: '5678', limiteTotal: 2800.00, tipo: 'CREDIT', corIcone: 'text-mercadopago-pastel', bgBarra: 'bg-mercadopago-pastel',
                diaFechamento: 29, diaVencimento: 6, avancoFechamento: 0, avancoVencimento: 1,
                compras: []
            }
        ]
    },
    metas: [],
    transacoes: [],
    analises: {
        mensagem: 'Você gastou 15% a menos em lazer esta semana. Excelente trabalho.',
        categorias: [],
        vazamentos: []
    }
};

const getInitialState = () => {
    const stored = localStorage.getItem(getStorageKey());
    const parsed = stored ? JSON.parse(stored) : defaultState;
    if(!parsed.faturasPagas) parsed.faturasPagas = [];
    
    // Migração: refugio -> corrente
    if (parsed.refugio) {
        parsed.corrente = parsed.refugio;
        delete parsed.refugio;
    }


    // Migração para cartões sem diaFechamento e diaVencimento (presos no localStorage)
    if (parsed.corrente && parsed.corrente.cartoes) {
        parsed.corrente.cartoes = parsed.corrente.cartoes.map(c => {
            if (c.diaFechamento === undefined) {
                if (c.nome.toLowerCase().includes('nubank')) {
                    c.diaFechamento = 3; c.diaVencimento = 8; c.avancoFechamento = 1; c.avancoVencimento = 1;
                } else if (c.nome.toLowerCase().includes('mercado')) {
                    c.diaFechamento = 29; c.diaVencimento = 6; c.avancoFechamento = 0; c.avancoVencimento = 1;
                } else {
                    c.diaFechamento = 10; c.diaVencimento = 15; c.avancoFechamento = 0; c.avancoVencimento = 1;
                }
            }
            // Migração de cores para pastéis suaves
            if (c.nome.toLowerCase().includes('nubank')) {
                c.corIcone = 'text-nubank-pastel';
                c.bgBarra = 'bg-nubank-pastel';
            } else if (c.nome.toLowerCase().includes('mercado')) {
                c.corIcone = 'text-mercadopago-pastel';
                c.bgBarra = 'bg-mercadopago-pastel';
            }
            return c;
        });
    }

    // Migração de transações para array unificado
    if (parsed.transacoes && !Array.isArray(parsed.transacoes)) {
        parsed.transacoes = [];
    }


    // Migração de metas para suportar aportes e rendimentos automáticos
    if (!parsed.configuracoes) {
        parsed.configuracoes = { taxaCDIAnual: 10.40 };
    }

    if (parsed.metas) {
        parsed.metas = parsed.metas.map(m => {
            if (!m.aportes) {
                m.aportes = [];
                if (m.valorAtual && m.valorAtual > 0) {
                    m.aportes.push({
                        id: 'ap' + Date.now() + Math.random(),
                        descricao: 'Depósito Inicial',
                        valor: m.valorAtual,
                        data: new Date().toISOString()
                    });
                }
            }
            if (!m.tipoRendimento) {
                m.tipoRendimento = 'MANUAL'; // MANUAL | CDI | FIXO
                m.taxaRendimento = 0;
                m.rendimentoAcumulado = 0.00;
                m.ultimaSincronizacao = new Date().toISOString();
            }
            return m;
        });
    }

    // Roda a sincronização silenciosa no boot
    if (parsed.metas && parsed.metas.length > 0) {
        sincronizarRendimentosLocal(parsed);
    }

    return parsed;
};

// --- MOTOR DE MATEMÁTICA FINANCEIRA ---
const getDiasUteis = (startDate, endDate) => {
    let count = 0;
    const curDate = new Date(startDate.getTime());
    while (curDate < endDate) {
        const dayOfWeek = curDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
        curDate.setDate(curDate.getDate() + 1);
    }
    return count;
};

const getDiasCorridos = (startDate, endDate) => {
    const diffTime = Math.abs(endDate - startDate);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

const calcularAliquotaIR = (diasCorridosTotais) => {
    if (diasCorridosTotais <= 180) return 0.225; // 22.5%
    if (diasCorridosTotais <= 360) return 0.200; // 20.0%
    if (diasCorridosTotais <= 720) return 0.175; // 17.5%
    return 0.150; // 15.0%
};

const sincronizarRendimentosLocal = (stateObj) => {
    const hoje = new Date();
    // Normaliza para meia-noite para evitar contar horas quebradas como dia
    hoje.setHours(0, 0, 0, 0); 

    const taxaCDIAnual = stateObj.configuracoes?.taxaCDIAnual || 10.40;
    const fatorDiarioCDI = Math.pow(1 + (taxaCDIAnual / 100), 1 / 252) - 1;

    stateObj.metas.forEach(meta => {
        if (!meta.tipoRendimento || meta.tipoRendimento === 'MANUAL') return;

        const ultimaSync = new Date(meta.ultimaSincronizacao);
        ultimaSync.setHours(0, 0, 0, 0);

        if (hoje <= ultimaSync) return; // Já sincronizado hoje ou no futuro

        // O Saldo base sobre o qual os juros vão incidir
        const valorAportes = (meta.aportes || []).reduce((sum, a) => sum + parseFloat(a.valor), 0);
        const saldoAtual = valorAportes + (meta.rendimentoAcumulado || 0);

        if (saldoAtual <= 0) {
            meta.ultimaSincronizacao = hoje.toISOString();
            return;
        }

        let novoSaldo = saldoAtual;

        if (meta.tipoRendimento === 'CDI') {
            const diasUteis = getDiasUteis(ultimaSync, hoje);
            if (diasUteis >= 1) {
                const fatorFinalDiario = fatorDiarioCDI * (meta.taxaRendimento / 100);
                novoSaldo = saldoAtual * Math.pow(1 + fatorFinalDiario, diasUteis);
            }
        } else if (meta.tipoRendimento === 'FIXO') {
            const diasCorridos = getDiasCorridos(ultimaSync, hoje);
            if (diasCorridos >= 1) {
                const fatorDiarioFixo = Math.pow(1 + (meta.taxaRendimento / 100), 1 / 30) - 1;
                novoSaldo = saldoAtual * Math.pow(1 + fatorDiarioFixo, diasCorridos);
            }
        }

        const rendimentoGeradoBruto = novoSaldo - saldoAtual;
        
        if (rendimentoGeradoBruto > 0) {
            let diasCorridosTotais = 0;
            if (meta.aportes && meta.aportes.length > 0) {
                const datasAportes = meta.aportes.map(a => new Date(a.data));
                const dataMaisAntiga = new Date(Math.min(...datasAportes));
                dataMaisAntiga.setHours(0, 0, 0, 0);
                diasCorridosTotais = getDiasCorridos(dataMaisAntiga, hoje);
            }
            
            const aliquotaIR = meta.aportes && meta.aportes.length > 0 ? calcularAliquotaIR(diasCorridosTotais) : 0.225;
            const imposto = rendimentoGeradoBruto * aliquotaIR;
            const rendimentoLiquido = rendimentoGeradoBruto - imposto;

            meta.rendimentoAcumulado = parseFloat((meta.rendimentoAcumulado + rendimentoLiquido).toFixed(2));
        }
        
        meta.ultimaSincronizacao = hoje.toISOString();
    });
};

export const rodarSincronizacaoManual = () => {
    sincronizarRendimentosLocal(store);
};

// --- Funções de Patrimônio e Cofre ---
export const getTotalCofre = () => {
    if (!store.metas) return 0;
    return store.metas.reduce((acc, meta) => {
        const sumAportes = (meta.aportes || []).reduce((s, a) => s + parseFloat(a.valor), 0);
        const rendimento = meta.rendimentoAcumulado || 0;
        return acc + sumAportes + rendimento;
    }, 0);
};

export const getPatrimonioLiquido = () => {
    return (store.corrente.numeroPaz || 0) + getTotalCofre();
};

export const adicionarMeta = (nome, valorTotal, tipoLiquidez, tipoRendimento = 'MANUAL', taxaRendimento = 0) => {
    if (!store.metas) store.metas = [];
    store.metas.push({
        id: 'm' + Date.now(),
        nome,
        valorTotal: valorTotal ? parseFloat(valorTotal) : null,
        tipoLiquidez: tipoLiquidez || TIPOS_LIQUIDEZ[0],
        aportes: [],
        tipoRendimento,
        taxaRendimento: parseFloat(taxaRendimento) || 0,
        rendimentoAcumulado: 0.00,
        ultimaSincronizacao: new Date().toISOString()
    });
};

export const editarMeta = (metaId, nome, valorTotal, tipoLiquidez) => {
    if (!store.metas) return;
    const meta = store.metas.find(m => m.id === metaId);
    if (meta) {
        meta.nome = nome;
        meta.valorTotal = valorTotal ? parseFloat(valorTotal) : null;
        meta.tipoLiquidez = tipoLiquidez || TIPOS_LIQUIDEZ[0];
    }
};

export const excluirMeta = (metaId) => {
    if (!store.metas) return;
    const index = store.metas.findIndex(m => m.id === metaId);
    if (index > -1) {
        const meta = store.metas[index];
        // Estornar todos os aportes e remover transações do fluxo
        if (meta.aportes && meta.aportes.length > 0) {
            meta.aportes.forEach(a => {
                const isExterno = a.descricao && a.descricao.toLowerCase().includes('sarah');
                if (!isExterno) {
                    store.corrente.numeroPaz += parseFloat(a.valor);
                }
                const txIndex = store.transacoes.findIndex(t => t && t.id === a.id);
                if (txIndex > -1) store.transacoes.splice(txIndex, 1);
            });
        }
        store.metas.splice(index, 1);
    }
};

export const adicionarAporte = (metaId, descricao, valor, dataString) => {
    const meta = store.metas.find(m => m.id === metaId);
    if (meta) {
        if (!meta.aportes) meta.aportes = [];
        const id = 'ap' + Date.now();
        const dataFinal = dataString || new Date().toISOString();
        
        meta.aportes.push({
            id,
            descricao,
            valor: parseFloat(valor),
            data: dataFinal
        });

        const isExterno = descricao && descricao.toLowerCase().includes('sarah');
        
        if (isExterno) {
            // Valor externo (Sarah): não deduz da corrente e entra como GANHO no fluxo
            store.transacoes.push({
                id,
                titulo: descricao,
                valor: parseFloat(valor), // valor positivo
                categoria: 'Transferência',
                data: dataFinal,
                fonteId: metaId,
                tipo: 'ENTRADA',
                parcelas: 1
            });
        } else {
            // Sincroniza com Fluxo Global e Deduz da Corrente
            store.corrente.numeroPaz -= parseFloat(valor);
            store.transacoes.push({
                id,
                titulo: descricao,
                valor: -parseFloat(valor), // valor negativo
                categoria: 'Transferência',
                data: dataFinal,
                fonteId: metaId,
                tipo: 'SAIDA',
                parcelas: 1
            });
        }
    }
};

export const excluirAporte = (metaId, aporteId) => {
    const meta = store.metas.find(m => m.id === metaId);
    if (meta && meta.aportes) {
        const idx = meta.aportes.findIndex(a => a.id === aporteId);
        if (idx > -1) {
            const aporte = meta.aportes[idx];
            
            const isExterno = aporte.descricao && aporte.descricao.toLowerCase().includes('sarah');
            if (!isExterno) {
                // Estorna saldo se não for aporte externo
                store.corrente.numeroPaz += parseFloat(aporte.valor);
            }
            meta.aportes.splice(idx, 1);
            
            // Sincroniza com Fluxo Global
            const txIndex = store.transacoes.findIndex(t => t && t.id === aporteId);
            if (txIndex > -1) {
                store.transacoes.splice(txIndex, 1);
            }
        }
    }
};


// --- Funções Auxiliares de Fatura ---
export const getFaturaMes = (cartao, ano, mes) => {
    const itensFatura = [];
    let total = 0;

    cartao.compras.forEach(compra => {
        const dataCompra = new Date(compra.data);
        // Usa getUTCFullYear e getUTCMonth para evitar que compras registradas em 00:00:00Z 
        // voltem 1 dia no fuso horário local do Brasil (UTC-3), caindo no mês anterior.
        let anoCompra = dataCompra.getUTCFullYear();
        let mesCompra = dataCompra.getUTCMonth();

        if (cartao.diaFechamento && dataCompra.getUTCDate() >= cartao.diaFechamento) {
            mesCompra++;
            if (mesCompra > 11) {
                mesCompra = 0;
                anoCompra++;
            }
        }

        const mesesPassados = (ano - anoCompra) * 12 + (mes - mesCompra);

        if (mesesPassados >= 0 && mesesPassados < compra.parcelas) {
            const valorParcela = compra.valorTotal / compra.parcelas;
            itensFatura.push({
                id: compra.id,
                descricao: compra.descricao,
                categoria: compra.categoria || 'Outros',
                parcelaAtual: mesesPassados + 1,
                totalParcelas: compra.parcelas,
                valorParcela: valorParcela,
                valorTotalOriginal: compra.valorTotal,
                dataRaw: compra.data
            });
            total += valorParcela;
        }
    });

    return { itens: itensFatura, total };
};

export const getLimiteUsado = (cartao) => {
    let usado = 0;
    const hoje = new Date();
    const diaAtual = hoje.getDate();
    let mesAberto = hoje.getMonth();
    let anoAberto = hoje.getFullYear();
    
    // Avança para a próxima fatura se já passou do dia de fechamento
    if (cartao.diaFechamento && diaAtual >= cartao.diaFechamento) {
        mesAberto++;
        if (mesAberto > 11) {
            mesAberto = 0;
            anoAberto++;
        }
    }
    
    const limiteAbertoScore = anoAberto * 12 + mesAberto;

    cartao.compras.forEach(compra => {
        const dataCompra = new Date(compra.data);
        const valorParcela = compra.valorTotal / compra.parcelas;
        
        let anoBaseCompra = dataCompra.getUTCFullYear();
        let mesBaseCompra = dataCompra.getUTCMonth();

        if (cartao.diaFechamento && dataCompra.getUTCDate() >= cartao.diaFechamento) {
            mesBaseCompra++;
            if (mesBaseCompra > 11) {
                mesBaseCompra = 0;
                anoBaseCompra++;
            }
        }

        for (let i = 0; i < compra.parcelas; i++) {
            const mesParcela = (mesBaseCompra + i) % 12;
            const anoParcela = anoBaseCompra + Math.floor((mesBaseCompra + i) / 12);
            const parcelaScore = anoParcela * 12 + mesParcela;
            
            // Só ocupa limite as faturas presentes e futuras
            if (parcelaScore >= limiteAbertoScore) {
                // Se a fatura ainda não foi paga no app, conta no limite
                if (!store.faturasPagas.includes(`${cartao.id}_${anoParcela}_${mesParcela}`)) {
                    usado += valorParcela;
                }
            }
        }
    });
    return usado;
};

export const isFaturaPaga = (cartaoId, ano, mes) => {
    return store.faturasPagas.includes(`${cartaoId}_${ano}_${mes}`);
}

export const pagarFatura = (cartaoId, ano, mes, valorTotal) => {
    const key = `${cartaoId}_${ano}_${mes}`;
    if (!store.faturasPagas.includes(key)) {
        store.faturasPagas.push(key);
        // Diminui do Saldo do Corrente
        store.corrente.numeroPaz -= parseFloat(valorTotal);
        
        // Adiciona registro no fluxo global
        const cartao = store.corrente.cartoes.find(c => c.id === cartaoId);
        const nomeCartao = cartao ? cartao.nome : 'Cartão';
        
        store.transacoes.push({
            id: `fat_${key}`,
            titulo: `Pagamento Fatura ${nomeCartao}`,
            valor: -Math.abs(parseFloat(valorTotal)),
            categoria: 'Transferência',
            data: new Date().toISOString(),
            fonteId: 'corrente',
            tipo: 'SAIDA',
            parcelas: 1
        });
    }
}

export const desfazerPagamentoFatura = (cartaoId, ano, mes, valorTotal) => {
    const key = `${cartaoId}_${ano}_${mes}`;
    const index = store.faturasPagas.indexOf(key);
    if (index > -1) {
        store.faturasPagas.splice(index, 1);
        // Devolve o saldo ao Corrente
        store.corrente.numeroPaz += parseFloat(valorTotal);
        
        // Remove do Fluxo Global
        const txIndex = store.transacoes.findIndex(t => t && t.id === `fat_${key}`);
        if (txIndex > -1) store.transacoes.splice(txIndex, 1);
    }
}

// Adiciona uma nova compra e engatilha a reatividade
export const adicionarCompra = (cartaoId, descricao, valorTotal, parcelas, categoria, dataString) => {
    const cartao = store.corrente.cartoes.find(c => c.id === cartaoId);
    if (cartao) {
        const id = 'c' + Date.now() + Math.random().toString(36).substr(2, 5);
        const compra = {
            id,
            descricao,
            categoria: categoria || 'Outros',
            valorTotal: parseFloat(valorTotal),
            parcelas: parseInt(parcelas),
            data: dataString || new Date().toISOString()
        };
        cartao.compras.push(compra);
        
        // Sincroniza com Fluxo Global
        store.transacoes.push({
            id,
            titulo: descricao,
            valor: -parseFloat(valorTotal),
            categoria: categoria || 'Outros',
            data: compra.data,
            fonteId: cartaoId,
            tipo: 'SAIDA',
            parcelas: parseInt(parcelas)
        });
    }
};

export const editarCompra = (cartaoId, compraId, descricao, valorTotal, parcelas, categoria, dataString) => {
    const cartao = store.corrente.cartoes.find(c => c.id === cartaoId);
    if (cartao) {
        const compra = cartao.compras.find(c => c.id === compraId);
        if (compra) {
            compra.descricao = descricao;
            compra.categoria = categoria || 'Outros';
            compra.valorTotal = parseFloat(valorTotal);
            compra.parcelas = parseInt(parcelas);
            if(dataString) compra.data = dataString;
            
            // Sincroniza com Fluxo Global
            const tx = store.transacoes.find(t => t && t.id === compraId);
            if (tx) {
                tx.titulo = descricao;
                tx.valor = -parseFloat(valorTotal);
                tx.categoria = categoria || 'Outros';
                tx.parcelas = parseInt(parcelas);
                if(dataString) tx.data = dataString;
            }
        }
    }
};

export const excluirCompra = (cartaoId, compraId) => {
    const cartao = store.corrente.cartoes.find(c => c.id === cartaoId);
    if (cartao) {
        const index = cartao.compras.findIndex(c => c.id === compraId);
        if (index > -1) {
            cartao.compras.splice(index, 1);
        }
        
        // Sincroniza com Fluxo Global (remove itens orfãos também)
        const txIndex = store.transacoes.findIndex(t => t && t.id === compraId);
        if (txIndex > -1) {
            store.transacoes.splice(txIndex, 1);
        }
    }
};

// --- Funções de Transação Geral (Fluxo) ---
export const adicionarTransacaoFluxo = (titulo, valor, tipo, categoria, dataString, fonteId, parcelas) => {
    if (fonteId !== 'corrente') {
        adicionarCompra(fonteId, titulo, valor, parcelas, categoria, dataString);
        return;
    }

    const id = 't' + Date.now() + Math.random().toString(36).substr(2, 5);
    const valorFloat = parseFloat(valor);
    const valorFinal = tipo === 'SAIDA' ? -valorFloat : valorFloat;

    store.transacoes.push({
        id,
        titulo,
        valor: valorFinal,
        categoria: categoria || 'Outros',
        data: dataString || new Date().toISOString(),
        fonteId: 'corrente',
        tipo,
        parcelas: 1
    });

    store.corrente.numeroPaz += valorFinal;
};

export const editarTransacaoFluxo = (id, titulo, valor, tipo, categoria, dataString, fonteId, parcelas) => {
    const txIndex = store.transacoes.findIndex(t => t && t.id === id);
    if (txIndex === -1) return;
    const tx = store.transacoes[txIndex];
    
    // Se envolve cartão ou mudou de fonte, a rota mais segura e limpa é recriar
    if (tx.fonteId !== 'corrente' || fonteId !== 'corrente') {
        excluirTransacaoFluxo(id);
        adicionarTransacaoFluxo(titulo, valor, tipo, categoria, dataString, fonteId, parcelas);
        return;
    }

    const valorFloat = parseFloat(valor);
    const valorFinal = tipo === 'SAIDA' ? -valorFloat : valorFloat;
    
    // Desfaz o saldo antigo
    store.corrente.numeroPaz -= tx.valor;
    
    // Atualiza a transacao
    tx.titulo = titulo;
    tx.valor = valorFinal;
    tx.tipo = tipo;
    tx.categoria = categoria || 'Outros';
    if(dataString) tx.data = dataString;
    
    // Aplica o novo saldo
    store.corrente.numeroPaz += valorFinal;
};

export const excluirTransacaoFluxo = (id) => {
    console.log('[Excluir] Tentando excluir transação com ID:', id);
    const txIndex = store.transacoes.findIndex(t => t && t.id === id);
    console.log('[Excluir] Índice no fluxo global:', txIndex);
    
    if (txIndex > -1) {
        const tx = store.transacoes[txIndex];
        console.log('[Excluir] Dados da transação encontrada:', tx);
        
        if (tx.fonteId !== 'corrente') {
            console.log('[Excluir] Fonte não é corrente (é cartão ou meta):', tx.fonteId);
            // Tenta ver se é um Cartão
            const cartao = store.corrente.cartoes.find(c => c.id === tx.fonteId);
            if (cartao) {
                console.log('[Excluir] Fonte identificada como Cartão. Chamando excluirCompra...');
                excluirCompra(tx.fonteId, id);
                return;
            }
            
            // Tenta ver se é uma Meta (Aporte do Cofre)
            const meta = store.metas ? store.metas.find(m => m.id === tx.fonteId) : null;
            if (meta) {
                console.log('[Excluir] Fonte identificada como Meta do Cofre. Chamando excluirAporte...');
                excluirAporte(tx.fonteId, id);
                console.log('[Excluir] Removido do fluxo global (via excluirAporte).');
                return;
            }
            
            // Fallback se não achar a fonte (para não bugar a interface)
            console.log('[Excluir] Fonte não localizada. Rodando fallback para deletar apenas do fluxo.');
            store.transacoes.splice(txIndex, 1);
            return;
        }

        // Se for um pagamento de fatura, desfazer
        if (id.startsWith('fat_')) {
            console.log('[Excluir] Pagamento de Fatura identificado. Desfazendo...');
            const parts = id.split('_');
            const cartaoId = parts[1];
            const ano = parseInt(parts[2]);
            const mes = parseInt(parts[3]);
            desfazerPagamentoFatura(cartaoId, ano, mes, Math.abs(tx.valor));
            return;
        }

        console.log('[Excluir] Fonte é corrente. Deduzindo do saldo e removendo do fluxo...');
        store.corrente.numeroPaz -= tx.valor;
        store.transacoes.splice(txIndex, 1);
        console.log('[Excluir] Removido com sucesso. Novo saldo:', store.corrente.numeroPaz);
    } else {
        console.warn('[Excluir] Transação não encontrada no store.transacoes para o ID:', id);
    }
};

// --- Sistema de Proxy e Reatividade ---
const listeners = [];
let isInitializing = false;
let syncTimeout = null;
let hasSyncedWithCloud = false;

const syncToCloud = () => {
    if (isInitializing || !hasSyncedWithCloud) return;
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
        const token = localStorage.getItem('tc_auth_token');
        if (token === 'true') {
            const rawData = JSON.parse(JSON.stringify(store));
            setDoc(doc(db, "users", import.meta.env.VITE_FIRESTORE_DOC_ID || import.meta.env.VITE_ADMIN_USER || "default_user"), rawData).catch(console.error);
        }
    }, 2000);
};

export const subscribe = (listener) => {
    listeners.push(listener);
    return () => {
        const index = listeners.indexOf(listener);
        if (index > -1) listeners.splice(index, 1);
    };
};

const notify = () => {
    if (isInitializing) return;
    localStorage.setItem(getStorageKey(), JSON.stringify(store));
    listeners.forEach(listener => listener(store));
    syncToCloud();
};

const isObject = (obj) => typeof obj === 'object' && obj !== null;

const createProxy = (target) => {
    return new Proxy(target, {
        get(target, property) {
            return target[property];
        },
        set(target, property, value) {
            target[property] = isObject(value) ? makeDeepProxy(value) : value;
            notify();
            return true;
        },
        deleteProperty(target, property) {
            delete target[property];
            notify();
            return true;
        }
    });
};

const makeDeepProxy = (obj) => {
    for (let key in obj) {
        if (isObject(obj[key])) {
            obj[key] = makeDeepProxy(obj[key]);
        }
    }
    return createProxy(obj);
};

const state = getInitialState();
export const store = makeDeepProxy(state);

export const initStore = async () => {
    const token = localStorage.getItem('tc_auth_token');
    if (token === 'true') {
        isInitializing = true;
        try {
            const docRef = doc(db, "users", import.meta.env.VITE_FIRESTORE_DOC_ID || import.meta.env.VITE_ADMIN_USER || "default_user");
            
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const cloudData = docSnap.data();
                Object.keys(store).forEach(k => delete store[k]); 
                Object.assign(store, cloudData);
                hasSyncedWithCloud = true;
            } else {
                console.error("ERRO CRÍTICO: Documento de usuário não existe na nuvem. A sincronização foi abortada para evitar perdas de dados.");
            }
        } catch (e) {
            console.error("Erro sincronizando com nuvem:", e);
        } finally {
            isInitializing = false;
            localStorage.setItem(getStorageKey(), JSON.stringify(store));
        }
    } else if (token === 'visitante') {
        // Para visitantes, não tentamos buscar na nuvem, usamos o store local do getInitialState()
        hasSyncedWithCloud = false; 
        isInitializing = false;
        localStorage.setItem(getStorageKey(), JSON.stringify(store));
    }
};
