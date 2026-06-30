const { GoogleGenerativeAI } = require('@google/generative-ai');
const admin = require('firebase-admin');

// Inicializa o app do Firebase Admin se ainda não existir
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();

const { MEGA_PROMPT, GUEST_PROMPT } = require('./agentPrompt');

const registrarTransacaoDecl = {
    name: "registrar_transacao",
    description: "Registra uma nova transação (entrada ou saída) no banco de dados do usuário, debitando ou creditando da conta corrente, ou adicionando à fatura do cartão de crédito.",
    parameters: {
        type: "OBJECT",
        properties: {
            valor: {
                type: "NUMBER",
                description: "O valor exato da transação."
            },
            descricao: {
                type: "STRING",
                description: "O nome ou título da transação (ex: 'Pizza', 'Salário', 'Uber')."
            },
            categoria: {
                type: "STRING",
                description: "Categoria da transação (ex: 'Alimentação', 'Receita', 'Transporte')."
            },
            fonte_pagamento: {
                type: "STRING",
                description: "Onde ocorreu. Valores permitidos: 'corrente', 'Nubank', 'Mercado Pago'."
            },
            tipo: {
                type: "STRING",
                description: "O tipo da transação. Valores permitidos: 'ENTRADA', 'SAIDA'."
            },
            parcelas: {
                type: "NUMBER",
                description: "Número TOTAL de parcelas. Se a descrição diz 'Parcela 4/10', o valor aqui DEVE ser 10."
            },
            dataIso: {
                type: "STRING",
                description: "Data da compra original no formato ISO (ex: '2026-04-15T00:00:00.000Z'). Se é a parcela 4 em Julho/2026, você deve retroagir e enviar a data de Abril/2026."
            }
        },
        required: ["valor", "descricao", "categoria", "fonte_pagamento", "tipo", "parcelas"]
    }
};

const registrarMultiplasTransacoesDecl = {
    name: "registrar_multiplas_transacoes",
    description: "Registra múltiplas transações (entrada ou saída) em lote no banco de dados do usuário.",
    parameters: {
        type: "OBJECT",
        properties: {
            transacoes: {
                type: "ARRAY",
                description: "Lista de transações a serem registradas.",
                items: {
                    type: "OBJECT",
                    properties: {
                        valor: { type: "NUMBER", description: "O valor exato da transação." },
                        descricao: { type: "STRING", description: "O nome ou título da transação." },
                        categoria: { type: "STRING", description: "Categoria da transação." },
                        fonte_pagamento: { type: "STRING", description: "Onde ocorreu. Valores permitidos: 'corrente', 'Nubank', 'Mercado Pago'." },
                        tipo: { type: "STRING", description: "O tipo da transação. Valores permitidos: 'ENTRADA', 'SAIDA'." },
                        parcelas: { type: "NUMBER", description: "Número TOTAL de parcelas." },
                        dataIso: { type: "STRING", description: "Data da compra ORIGINAL no formato ISO. Ex: retroagir os meses se for parcela x/y." }
                    },
                    required: ["valor", "descricao", "categoria", "fonte_pagamento", "tipo", "parcelas"]
                }
            }
        },
        required: ["transacoes"]
    }
};

const criarMetaDecl = {
    name: "criar_meta",
    description: "Cria uma nova meta financeira no cofre do usuário.",
    parameters: {
        type: "OBJECT",
        properties: {
            nome: { type: "STRING", description: "Nome da meta (ex: 'Viagem', 'Carro Novo')." },
            valorTotal: { type: "NUMBER", description: "O valor total alvo da meta." }
        },
        required: ["nome", "valorTotal"]
    }
};

const excluirMetaDecl = {
    name: "excluir_meta",
    description: "Exclui uma meta existente com base no nome.",
    parameters: {
        type: "OBJECT",
        properties: {
            nome: { type: "STRING", description: "O nome ou parte do nome da meta a excluir." }
        },
        required: ["nome"]
    }
};

const excluirTransacaoDecl = {
    name: "excluir_transacao",
    description: "Exclui uma transação ou compra registrada, estornando automaticamente seu valor ao saldo caso seja da corrente.",
    parameters: {
        type: "OBJECT",
        properties: {
            descricao: { type: "STRING", description: "A descrição exata ou aproximada da transação a ser excluída. Para excluir tudo de uma fonte, envie a palavra 'TUDO'." },
            fonte_pagamento: { type: "STRING", description: "A fonte onde está registrada ('corrente', 'Nubank', 'Mercado Pago')." }
        },
        required: ["descricao", "fonte_pagamento"]
    }
};

const excluirMultiplasTransacoesDecl = {
    name: "excluir_multiplas_transacoes",
    description: "Exclui múltiplas transações ou compras registradas em lote.",
    parameters: {
        type: "OBJECT",
        properties: {
            transacoes: {
                type: "ARRAY",
                description: "Lista de transações a serem excluídas.",
                items: {
                    type: "OBJECT",
                    properties: {
                        descricao: { type: "STRING", description: "A descrição da transação. Para excluir TODAS as compras de um cartão de uma vez, envie a palavra 'TUDO' nesta propriedade." },
                        fonte_pagamento: { type: "STRING", description: "A fonte onde está registrada ('corrente', 'Nubank', 'Mercado Pago')." }
                    },
                    required: ["descricao", "fonte_pagamento"]
                }
            }
        },
        required: ["transacoes"]
    }
};

async function registrarTransacaoNoBanco(userId, args) {
    const { valor, descricao, categoria, fonte_pagamento, tipo, parcelas, dataIso } = args;
    const userRef = db.collection('users').doc(userId);
    
    try {
        const doc = await userRef.get();
        if (!doc.exists) return { status: "erro", detalhe: "Usuário não encontrado." };
        
        const data = doc.data();
        const corrente = data.corrente || {};
        const transacoesGlobais = data.transacoes || [];
        const dataAtualIso = dataIso || new Date().toISOString();

        if (fonte_pagamento === "corrente") {
            const numeroPazAtual = Number(corrente.numeroPaz) || 0;
            const valorAbsoluto = Math.abs(Number(valor));
            let novoNumeroPaz = numeroPazAtual;
            
            const tipoUpper = String(tipo || "").toUpperCase();
            
            if (tipoUpper === "ENTRADA") novoNumeroPaz += valorAbsoluto;
            else novoNumeroPaz -= valorAbsoluto;
            
            const novaTransacaoGlobal = {
                id: Date.now().toString(),
                titulo: descricao,
                valor: tipoUpper === "ENTRADA" ? valorAbsoluto : -valorAbsoluto,
                categoria: categoria || 'Outros',
                data: dataAtualIso,
                fonteId: 'corrente',
                tipo: tipoUpper,
                parcelas: 1
            };
            transacoesGlobais.push(novaTransacaoGlobal);
            
            await userRef.update({
                "corrente.numeroPaz": novoNumeroPaz,
                "transacoes": transacoesGlobais
            });
            return { status: "sucesso", nova_transacao_registrada: true, novo_saldo: novoNumeroPaz };
        } else {
            // Cartões
            const cartoes = corrente.cartoes || [];
            const cartaoIndex = cartoes.findIndex(c => c.nome.toLowerCase() === fonte_pagamento.toLowerCase());
            
            if (cartaoIndex === -1) {
                const disponiveis = cartoes.map(c => c.nome).join(', ');
                return { status: "erro", detalhe: `Cartão '${fonte_pagamento}' não encontrado. Opções: ${disponiveis}` };
            }
            
            const cartao = cartoes[cartaoIndex];
            const compras = cartao.compras || [];
            
            const idNovaCompra = 'c' + Date.now().toString();
            const valorAbsoluto = Math.abs(Number(valor));
            
            const novaCompraCartao = {
                id: idNovaCompra,
                data: dataAtualIso,
                descricao: descricao,
                valorTotal: valorAbsoluto,
                parcelas: Number(parcelas) || 1,
                categoria: categoria || 'Outros'
            };
            compras.push(novaCompraCartao);
            cartoes[cartaoIndex].compras = compras;
            
            const novaTransacaoGlobal = {
                id: idNovaCompra,
                titulo: descricao,
                valor: -valorAbsoluto,
                categoria: categoria || 'Outros',
                data: dataAtualIso,
                fonteId: cartao.id,
                tipo: 'SAIDA', // Compras em cartão são sempre saídas lógicas de caixa (futuras)
                parcelas: Number(parcelas) || 1
            };
            transacoesGlobais.push(novaTransacaoGlobal);
            
            await userRef.update({
                "corrente.cartoes": cartoes,
                "transacoes": transacoesGlobais
            });
            return { status: "sucesso", nova_transacao_registrada: true, cartao: cartao.nome };
        }
    } catch (error) {
        return { status: "erro", detalhe: error.message };
    }
}

async function criarMetaNoBanco(userId, args) {
    const { nome, valorTotal } = args;
    const userRef = db.collection('users').doc(userId);
    try {
        const doc = await userRef.get();
        if (!doc.exists) return { status: "erro", detalhe: "Usuário não encontrado." };
        
        const data = doc.data();
        const metas = data.metas || [];
        
        const novaMeta = {
            id: 'm' + Date.now().toString(),
            nome: nome,
            valorTotal: Number(valorTotal),
            tipoLiquidez: 'Médio Prazo (Projetos)',
            aportes: [],
            tipoRendimento: 'MANUAL',
            taxaRendimento: 0,
            rendimentoAcumulado: 0,
            ultimaSincronizacao: new Date().toISOString()
        };
        metas.push(novaMeta);
        
        await userRef.update({ metas: metas });
        return { status: "sucesso", meta_criada: true };
    } catch (error) {
        return { status: "erro", detalhe: error.message };
    }
}

async function excluirMetaNoBanco(userId, args) {
    const { nome } = args;
    const userRef = db.collection('users').doc(userId);
    try {
        const doc = await userRef.get();
        if (!doc.exists) return { status: "erro", detalhe: "Usuário não encontrado." };
        
        const data = doc.data();
        const metas = data.metas || [];
        
        const targetName = nome.toLowerCase();
        const metaIndex = metas.findIndex(m => m.nome.toLowerCase().includes(targetName));
        
        if (metaIndex === -1) return { status: "erro", detalhe: "Nenhuma meta encontrada com esse nome." };
        
        const metaExcluida = metas[metaIndex];
        metas.splice(metaIndex, 1);
        
        await userRef.update({ metas: metas });
        return { status: "sucesso", meta_excluida: true, nome: metaExcluida.nome };
    } catch (error) {
        return { status: "erro", detalhe: error.message };
    }
}

async function excluirTransacaoNoBanco(userId, args) {
    const { descricao, fonte_pagamento } = args;
    const userRef = db.collection('users').doc(userId);
    try {
        const doc = await userRef.get();
        if (!doc.exists) return { status: "erro", detalhe: "Usuário não encontrado." };
        
        let data = doc.data();
        let corrente = data.corrente || {};
        let transacoesGlobais = data.transacoes || [];
        
        const targetDesc = String(descricao).toLowerCase().trim();

        if (fonte_pagamento === "corrente") {
            if (targetDesc === "tudo") {
                // Remove todas as transações da corrente
                const removidas = transacoesGlobais.filter(t => t.fonteId === 'corrente');
                transacoesGlobais = transacoesGlobais.filter(t => t.fonteId !== 'corrente');
                let novoNumeroPaz = Number(corrente.numeroPaz) || 0;
                // Estorno em massa
                for (const tx of removidas) {
                    if (tx.tipo === "SAIDA") novoNumeroPaz += Math.abs(tx.valor);
                    else if (tx.tipo === "ENTRADA") novoNumeroPaz -= Math.abs(tx.valor);
                }
                await userRef.update({
                    "corrente.numeroPaz": novoNumeroPaz,
                    "transacoes": transacoesGlobais
                });
                return { status: "sucesso", transacao_excluida: true, estornado: true, detalhe: "Tudo limpo na corrente." };
            }

            const index = transacoesGlobais.findIndex(t => t.fonteId === 'corrente' && t.titulo.toLowerCase().includes(targetDesc));
            if (index === -1) return { status: "erro", detalhe: "Transação não encontrada na conta corrente." };
            
            const tx = transacoesGlobais[index];
            transacoesGlobais.splice(index, 1);
            
            let novoNumeroPaz = Number(corrente.numeroPaz) || 0;
            if (tx.tipo === "SAIDA") {
                novoNumeroPaz += Math.abs(tx.valor);
            } else if (tx.tipo === "ENTRADA") {
                novoNumeroPaz -= Math.abs(tx.valor);
            }
            
            await userRef.update({
                "corrente.numeroPaz": novoNumeroPaz,
                "transacoes": transacoesGlobais
            });
            return { status: "sucesso", transacao_excluida: true, estornado: true };
            
        } else {
            // Cartões
            const cartoes = corrente.cartoes || [];
            const cartaoIndex = cartoes.findIndex(c => c.nome.toLowerCase() === fonte_pagamento.toLowerCase());
            if (cartaoIndex === -1) return { status: "erro", detalhe: `Cartão '${fonte_pagamento}' não encontrado.` };
            
            const cartao = cartoes[cartaoIndex];
            const compras = cartao.compras || [];
            
            if (targetDesc === "tudo") {
                const idsRemovidos = compras.map(c => c.id);
                cartoes[cartaoIndex].compras = [];
                transacoesGlobais = transacoesGlobais.filter(t => !idsRemovidos.includes(t.id));
                
                await userRef.update({
                    "corrente.cartoes": cartoes,
                    "transacoes": transacoesGlobais
                });
                return { status: "sucesso", compra_excluida: true, detalhe: "Todas as compras do cartão limpas." };
            }

            const compraIndex = compras.findIndex(c => c.descricao.toLowerCase().includes(targetDesc));
            if (compraIndex === -1) return { status: "erro", detalhe: "Compra não encontrada no cartão." };
            
            const compra = compras[compraIndex];
            compras.splice(compraIndex, 1);
            cartoes[cartaoIndex].compras = compras;
            
            const txIndex = transacoesGlobais.findIndex(t => t.id === compra.id);
            if (txIndex !== -1) transacoesGlobais.splice(txIndex, 1);
            
            await userRef.update({
                "corrente.cartoes": cartoes,
                "transacoes": transacoesGlobais
            });
            return { status: "sucesso", compra_excluida: true };
        }
    } catch (error) {
        return { status: "erro", detalhe: error.message };
    }
}

async function excluirMultiplasTransacoesNoBanco(userId, args) {
    const transacoes = args.transacoes || [];
    const userRef = db.collection('users').doc(userId);
    
    try {
        const doc = await userRef.get();
        if (!doc.exists) return { status: "erro", detalhe: "Usuário não encontrado." };
        
        let data = doc.data();
        let corrente = data.corrente || {};
        let transacoesGlobais = data.transacoes || [];
        let resultados = [];
        let alterou = false;

        for (const t of transacoes) {
            const { descricao, fonte_pagamento } = t;
            const targetDesc = String(descricao).toLowerCase().trim();

            if (fonte_pagamento === "corrente") {
                if (targetDesc === "tudo") {
                    const removidas = transacoesGlobais.filter(tx => tx.fonteId === 'corrente');
                    transacoesGlobais = transacoesGlobais.filter(tx => tx.fonteId !== 'corrente');
                    let novoNumeroPaz = Number(corrente.numeroPaz) || 0;
                    for (const tx of removidas) {
                        if (tx.tipo === "SAIDA") novoNumeroPaz += Math.abs(tx.valor);
                        else if (tx.tipo === "ENTRADA") novoNumeroPaz -= Math.abs(tx.valor);
                    }
                    corrente.numeroPaz = novoNumeroPaz;
                    resultados.push({ status: "sucesso", detalhe: "Limpeza na corrente executada" });
                    alterou = true;
                } else {
                    const index = transacoesGlobais.findIndex(tx => tx.fonteId === 'corrente' && tx.titulo.toLowerCase().includes(targetDesc));
                    if (index !== -1) {
                        const tx = transacoesGlobais[index];
                        transacoesGlobais.splice(index, 1);
                        let novoNumeroPaz = Number(corrente.numeroPaz) || 0;
                        if (tx.tipo === "SAIDA") novoNumeroPaz += Math.abs(tx.valor);
                        else if (tx.tipo === "ENTRADA") novoNumeroPaz -= Math.abs(tx.valor);
                        corrente.numeroPaz = novoNumeroPaz;
                        resultados.push({ status: "sucesso" });
                        alterou = true;
                    } else {
                        resultados.push({ status: "erro", detalhe: "Não encontrada" });
                    }
                }
            } else {
                const cartoes = corrente.cartoes || [];
                const cartaoIndex = cartoes.findIndex(c => c.nome.toLowerCase() === (fonte_pagamento || "").toLowerCase());
                
                if (cartaoIndex !== -1) {
                    const cartao = cartoes[cartaoIndex];
                    const compras = cartao.compras || [];
                    
                    if (targetDesc === "tudo") {
                        const idsRemovidos = compras.map(c => c.id);
                        cartoes[cartaoIndex].compras = [];
                        transacoesGlobais = transacoesGlobais.filter(tx => !idsRemovidos.includes(tx.id));
                        resultados.push({ status: "sucesso", detalhe: "Cartão limpo" });
                        alterou = true;
                    } else {
                        const compraIndex = compras.findIndex(c => c.descricao.toLowerCase().includes(targetDesc));
                        if (compraIndex !== -1) {
                            const compra = compras[compraIndex];
                            compras.splice(compraIndex, 1);
                            cartoes[cartaoIndex].compras = compras;
                            
                            const txIndex = transacoesGlobais.findIndex(tx => tx.id === compra.id);
                            if (txIndex !== -1) transacoesGlobais.splice(txIndex, 1);
                            
                            resultados.push({ status: "sucesso" });
                            alterou = true;
                        } else {
                            resultados.push({ status: "erro", detalhe: "Compra não encontrada" });
                        }
                    }
                } else {
                    resultados.push({ status: "erro", detalhe: "Cartão não encontrado" });
                }
            }
        }

        if (alterou) {
            await userRef.update({
                "corrente": corrente,
                "transacoes": transacoesGlobais
            });
        }
        return { status: "sucesso", detalhes: resultados, total_processado: transacoes.length };
    } catch (error) {
        return { status: "erro", detalhe: error.message };
    }
}

async function registrarMultiplasTransacoesNoBanco(userId, args) {
    const transacoes = args.transacoes || [];
    let resultados = [];
    for (const t of transacoes) {
        const res = await registrarTransacaoNoBanco(userId, t);
        resultados.push(res);
    }
    return { status: "sucesso", detalhes: resultados, total_processado: transacoes.length };
}

async function gerarResposta(payloadJSONString, mensagemUsuario, historico, userId, skipUserMessage = false, sessionId = null, isVisitante = false) {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) throw new Error("API Key do Gemini não encontrada nas variáveis de ambiente.");
    const genAI = new GoogleGenerativeAI(apiKey);

    const contents = [...historico];
    if (!skipUserMessage) {
        contents.push({
            role: "user",
            parts: [{
                text: mensagemUsuario + "\n\n[DADOS DE SISTEMA (Invisível ao usuário): " + payloadJSONString + "]"
            }]
        });
    }

    async function callGeminiWithFallback(contentsArray) {
        const modelsToTry = ['gemini-flash-lite-latest', 'gemini-2.5-flash-lite', 'gemini-2.0-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash'];
        let lastError = null;
        for (const modelName of modelsToTry) {
            try {
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    systemInstruction: isVisitante ? GUEST_PROMPT : MEGA_PROMPT,
                    tools: [{
                        functionDeclarations: [registrarTransacaoDecl, registrarMultiplasTransacoesDecl, criarMetaDecl, excluirMetaDecl, excluirTransacaoDecl, excluirMultiplasTransacoesDecl]
                    }],
                    generationConfig: { temperature: 0.4 }
                });
                return await model.generateContent({ contents: contentsArray });
            } catch (error) {
                if ([429, 404, 400, 503].includes(error.status) || (error.message && error.message.match(/429|404|400|503/))) {
                    console.warn(`[Gemini] Falha no modelo ${modelName}. Tentando o próximo...`);
                    lastError = error;
                    continue;
                }
                throw error;
            }
        }
        throw new Error("A IA esgotou o limite de cotas gratuitas e de contingência. Tente novamente mais tarde.");
    }

    try {
        let result = await callGeminiWithFallback(contents);
        let response = result.response;
        const calls = response.functionCalls();

        const novoHistorico = [...historico];
        if (!skipUserMessage && mensagemUsuario) {
            novoHistorico.push({ role: "user", parts: [{ text: mensagemUsuario }] });
        }
        
        let retornoFinal;

        if (calls && calls.length > 0) {
            const call = calls[0];
            let msgConfirmacao = '';
            
            if (call.name === "registrar_transacao") {
                const tipoUpper = String(call.args.tipo || "").toUpperCase();
                const acao = tipoUpper === "ENTRADA" ? "creditar" : "debitar";
                msgConfirmacao = `Estou pronto para ${acao} R$ ${call.args.valor} no ${call.args.fonte_pagamento}. Posso confirmar?`;
            } else if (call.name === "registrar_multiplas_transacoes") {
                const qtd = call.args.transacoes ? call.args.transacoes.length : 0;
                msgConfirmacao = `Estou pronto para registrar um lote com ${qtd} transações. Posso confirmar?`;
            } else if (call.name === "criar_meta") {
                msgConfirmacao = `Pronto para criar a meta '${call.args.nome}' no valor de R$ ${call.args.valorTotal}. Posso confirmar?`;
            } else if (call.name === "excluir_meta") {
                msgConfirmacao = `Estou prestes a excluir a meta '${call.args.nome}'. Tem certeza?`;
            } else if (call.name === "excluir_transacao") {
                msgConfirmacao = `Vou estornar/excluir a transação referente a '${call.args.descricao}' em '${call.args.fonte_pagamento}'. Posso confirmar a exclusão?`;
            } else if (call.name === "excluir_multiplas_transacoes") {
                const qtd = call.args.transacoes ? call.args.transacoes.length : 0;
                msgConfirmacao = `Vou estornar/excluir um lote com ${qtd} transações. Posso confirmar a exclusão em lote?`;
            }

            retornoFinal = {
                status: "requer_confirmacao",
                toolName: call.name,
                toolArgs: call.args,
                textoGerado: msgConfirmacao,
                functionCallRequest: response.candidates[0].content
            };
            novoHistorico.push(response.candidates[0].content);
        } else {
            retornoFinal = result.response.text();
            novoHistorico.push({ role: "model", parts: [{ text: retornoFinal }] });
        }

        if (sessionId && userId && !isVisitante) {
            const isFirstMessage = (!historico || historico.length === 0);
            const objetoChat = {
                dataAtualizacao: admin.firestore.FieldValue.serverTimestamp(),
                mensagens: JSON.parse(JSON.stringify(novoHistorico))
            };
            if (isFirstMessage) {
                objetoChat.fixado = false;
                if (mensagemUsuario) {
                    const tituloBase = mensagemUsuario.substring(0, 25);
                    objetoChat.titulo = mensagemUsuario.length > 25 ? tituloBase + "..." : tituloBase;
                }
            }
            await db.collection("users").doc(userId).collection("sessoes_chat").doc(sessionId).set(objetoChat, { merge: true });
        }
        return retornoFinal;
    } catch (error) {
        throw new Error(error.message || "Falha ao analisar a solicitação via IA.");
    }
}

module.exports = {
    gerarResposta,
    registrarTransacaoNoBanco,
    registrarMultiplasTransacoesNoBanco,
    criarMetaNoBanco,
    excluirMetaNoBanco,
    excluirTransacaoNoBanco,
    excluirMultiplasTransacoesNoBanco
};
