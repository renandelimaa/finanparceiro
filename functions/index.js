const { onCall, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

const { buildContextPayload } = require("./payloadBuilder");
const { 
    gerarResposta, 
    registrarTransacaoNoBanco, 
    registrarMultiplasTransacoesNoBanco,
    criarMetaNoBanco, 
    excluirMetaNoBanco, 
    excluirTransacaoNoBanco,
    excluirMultiplasTransacoesNoBanco
} = require("./gemini");

/**
 * Endpoint principal (onCall) para o Frontend se comunicar com o Agente Financeiro.
 */
exports.processarMensagemIA = onCall({
    cors: true,
    secrets: ["GOOGLE_GENAI_API_KEY"],
}, async (request) => {
    
    // O ID do usuário fixo a ser utilizado
    const userId = process.env.ADMIN_USER_ID || "default_user";
    const { sessionId, mensagemUsuario, historico, acaoConfirmada, toolName, toolArgs, isVisitante, contextoVisitante } = request.data;

    // Validação da Mensagem

    if (!acaoConfirmada && (!mensagemUsuario || typeof mensagemUsuario !== 'string' || mensagemUsuario.trim() === '')) {
        throw new HttpsError("invalid-argument", "A mensagem do usuário é obrigatória.");
    }

    try {
        if (acaoConfirmada) {
            logger.info(`Executando acao confirmada: ${toolName} para usuário: ${userId}`);
            
            let funcResult;
            try {
                if (isVisitante) {
                    // Se for visitante, não alteramos o banco, apenas simulamos sucesso.
                    // O frontend executará a ação no seu próprio store local.
                    funcResult = { status: "sucesso", detalhe: "Operação efetuada com sucesso (Modo Visitante local)." };
                } else {
                    switch (toolName) {
                        case 'registrar_transacao':
                            funcResult = await registrarTransacaoNoBanco(userId, toolArgs);
                            break;
                        case 'registrar_multiplas_transacoes':
                            funcResult = await registrarMultiplasTransacoesNoBanco(userId, toolArgs);
                            break;
                        case 'criar_meta':
                            funcResult = await criarMetaNoBanco(userId, toolArgs);
                            break;
                        case 'excluir_meta':
                            funcResult = await excluirMetaNoBanco(userId, toolArgs);
                            break;
                        case 'excluir_transacao':
                            funcResult = await excluirTransacaoNoBanco(userId, toolArgs);
                            break;
                        case 'excluir_multiplas_transacoes':
                            funcResult = await excluirMultiplasTransacoesNoBanco(userId, toolArgs);
                            break;
                        default:
                            throw new Error("Ferramenta desconhecida.");
                    }
                }
            } catch (e) {
                logger.error(`Erro na execucao da ferramenta ${toolName}:`, e);
                funcResult = { status: "erro", mensagem: e.message };
            }

            // Adiciona a resposta da função ao histórico que já continha a intenção (functionCall)
            historico.push({
                role: "function",
                parts: [{
                    functionResponse: {
                        name: toolName,
                        response: funcResult
                    }
                }]
            });

            // Atualiza o histórico para o modelo

            // Atualiza o histórico para o modelo
            const payloadJSONString = isVisitante ? contextoVisitante : await buildContextPayload(userId);
            const respostaDaIA = await gerarResposta(payloadJSONString, "", historico, userId, true, sessionId, isVisitante);

            return {
                sucesso: true,
                textoGerado: respostaDaIA
            };

        } else {
            logger.info(`Processando IA para usuário: ${userId}`);

            // Fluxo padrão

            if (historico && historico.length > 0) {
                const lastMsg = historico[historico.length - 1];
                if (lastMsg.role === "model" && lastMsg.parts && lastMsg.parts[0].functionCall) {
                    historico.push({
                        role: "function",
                        parts: [{
                            functionResponse: {
                                name: lastMsg.parts[0].functionCall.name,
                                response: { status: "cancelado_por_nova_mensagem_do_usuario" }
                            }
                        }]
                    });
                }
            }

            const payloadJSONString = isVisitante ? contextoVisitante : await buildContextPayload(userId);
            const respostaDaIA = await gerarResposta(payloadJSONString, mensagemUsuario, historico || [], userId, false, sessionId, isVisitante);

            logger.info(`Resposta gerada com sucesso.`);

            // Se for um objeto de pausa para confirmação, retorna direto pro frontend
            if (typeof respostaDaIA === 'object' && respostaDaIA.status === "requer_confirmacao") {
                return respostaDaIA;
            }

            return {
                sucesso: true,
                textoGerado: respostaDaIA
            };
        }

    } catch (error) {
        logger.error("Erro interno no processarMensagemIA:", error);
        throw new HttpsError("internal", error.message || "Erro interno ao processar solicitação.");
    }
});
