import { logout } from '../auth.js';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, collection, query, orderBy, limit, getDocs, doc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { app } from '../firebase.js';
import { initStore, store, adicionarTransacaoFluxo, adicionarMeta, excluirMeta, excluirTransacaoFluxo, excluirCompra } from '../store.js';

let historicoSessao = [];
const gerarIdSessao = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
let sessionId = gerarIdSessao();

let isSidebarOpen = false;
let sessoesSalvas = [];
let startX = 0;
let currentX = 0;

export const abrirSidebar = async () => {
    const isVisitante = localStorage.getItem('tc_auth_token') === 'visitante';
    if (isVisitante) {
        sessoesSalvas = [];
        isSidebarOpen = true;
        const appView = document.getElementById('app-view');
        if (appView) {
            appView.innerHTML = Analises();
            const scripts = appView.getElementsByTagName('script');
            for (let i = 0; i < scripts.length; i++) eval(scripts[i].innerText);
        }
        return;
    }

    const userId = import.meta.env.VITE_FIRESTORE_DOC_ID || import.meta.env.VITE_ADMIN_USER || "default_user";
    const db = getFirestore(app);

    try {
        const q = query(
            collection(db, "users", userId, "sessoes_chat"),
            orderBy("fixado", "desc"),
            orderBy("dataAtualizacao", "desc"),
            limit(10)
        );
        const snapshot = await getDocs(q);
        sessoesSalvas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        isSidebarOpen = true;

        const appView = document.getElementById('app-view');
        if (appView) {
            appView.innerHTML = Analises();
            const scripts = appView.getElementsByTagName('script');
            for (let i = 0; i < scripts.length; i++) eval(scripts[i].innerText);
        }
    } catch (e) {
        console.error("Erro ao abrir sidebar:", e);
    }
};

window.fecharSidebar = () => {
    isSidebarOpen = false;
    const appView = document.getElementById('app-view');
    if (appView) {
        appView.innerHTML = Analises();
        const scripts = appView.getElementsByTagName('script');
        for (let i = 0; i < scripts.length; i++) eval(scripts[i].innerText);
    }
};

export const Analises = () => {
    const isVisitante = localStorage.getItem('tc_auth_token') === 'visitante';
    
    let bolhasHTML = '';
    historicoSessao.forEach(msg => {
        if (!msg.parts || !msg.parts[0]) return;
        const part = msg.parts[0];

        if (msg.role === 'user') {
            if (part.text) {
                const escapedText = part.text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                bolhasHTML += `
                    <div class="flex items-end gap-3 self-end max-w-[85%] sm:max-w-[75%] animate-[fadeIn_0.3s_ease-out]">
                        <div class="bg-primary text-on-primary rounded-[24px] rounded-br-sm px-5 py-3.5 shadow-md hover:shadow-lg transition-shadow">
                            <p class="font-body-lg whitespace-pre-wrap leading-relaxed">${escapedText}</p>
                        </div>
                    </div>
                `;
            }
        } else if (msg.role === 'model') {
            if (part.text) {
                let formatado = part.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                bolhasHTML += `
                    <div class="flex items-end gap-3 self-start max-w-[90%] sm:max-w-[85%] animate-[fadeIn_0.3s_ease-out]">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary-container to-tertiary-container flex-shrink-0 flex items-center justify-center shadow-sm border border-outline-variant/30">
                            <span class="material-symbols-outlined text-on-primary-container text-[20px]">smart_toy</span>
                        </div>
                        <div class="bg-surface-container-lowest border border-outline-variant/30 rounded-[24px] rounded-bl-sm px-5 py-4 shadow-sm hover:shadow-md transition-shadow">
                            <p class="font-body-lg text-on-surface leading-relaxed whitespace-pre-wrap">${formatado}</p>
                        </div>
                    </div>
                `;
            } else if (part.functionCall && msg._uiText) {
                let formatado = msg._uiText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                const isLast = (msg === historicoSessao[historicoSessao.length - 1]);
                let buttonsHTML = '';

                // Se for a última mensagem, a confirmação ainda está pendente, então desenha os botões
                if (isLast) {
                    const argsStr = JSON.stringify(part.functionCall.args).replace(/'/g, "&apos;");
                    buttonsHTML = `
                        <div class="flex flex-wrap gap-3 mt-5 pt-4 border-t border-outline-variant/30">
                            <button class="btn-confirmar-acao flex-1 bg-primary text-on-primary px-5 py-2.5 rounded-full font-label-large shadow-sm hover:opacity-90 hover:shadow-md active:scale-[0.98] transition-all" data-tool="${part.functionCall.name}" data-args='${argsStr}'>Sim, confirmar</button>
                            <button class="btn-cancelar-acao flex-1 bg-error-container text-error px-5 py-2.5 rounded-full font-label-large shadow-sm hover:bg-error/20 hover:shadow-md active:scale-[0.98] transition-all" data-tool="${part.functionCall.name}">Não, cancelar</button>
                        </div>
                    `;
                }

                bolhasHTML += `
                    <div class="flex flex-col gap-2 self-start max-w-[90%] sm:max-w-[85%] animate-[fadeIn_0.3s_ease-out]">
                        <div class="flex items-end gap-3">
                            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary-container to-tertiary-container flex-shrink-0 flex items-center justify-center shadow-sm border border-outline-variant/30">
                                <span class="material-symbols-outlined text-on-primary-container text-[20px]">smart_toy</span>
                            </div>
                            <div class="bg-surface-container-lowest border border-outline-variant/30 rounded-[24px] rounded-bl-sm px-5 py-4 shadow-sm hover:shadow-md transition-shadow">
                                <p class="font-body-lg text-on-surface leading-relaxed whitespace-pre-wrap">${formatado}</p>
                                ${buttonsHTML}
                            </div>
                        </div>
                    </div>
                `;
            }
        }
    });

    return `
        <div class="fixed inset-0 w-full flex flex-col bg-surface-container-lowest overflow-hidden overscroll-none" style="height: var(--vv-height, 100dvh);">
            <!-- TopAppBar -->
            <nav class="absolute top-0 left-0 w-full z-50 bg-surface/70 backdrop-blur-2xl border-b border-outline-variant/5 flex items-center justify-between px-4 sm:px-8 h-[72px] transition-all">
                <div class="flex items-center gap-4">
                    <button id="btn-menu-sidebar" class="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-variant/60 hover:text-on-surface transition-all active:scale-95 bg-transparent">
                        <span class="material-symbols-outlined text-[24px]">menu</span>
                    </button>
                    <h1 class="font-display-sm text-on-surface tracking-tight font-medium"></h1>
                </div>
                
                <button id="btn-novo-chat-sidebar" class="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-variant/60 hover:text-on-surface transition-all active:scale-95 bg-transparent" title="Nova Conversa">
                    <span class="material-symbols-outlined text-[24px]">add</span>
                </button>
            </nav>

            <main class="flex-1 flex flex-col max-w-3xl mx-auto relative w-full h-full overflow-hidden">
                
                <div id="chat-history" class="flex-1 overflow-y-auto overscroll-y-contain flex flex-col gap-6 px-4 md:px-8 pt-[88px] pb-[180px] no-scrollbar scroll-smooth">
                
                ${historicoSessao.length === 0 ? `
                <!-- Initial Welcome Message -->
                <div class="flex items-end gap-3 self-start max-w-[90%] sm:max-w-[85%] animate-[fadeIn_0.5s_ease-out]">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary-container to-tertiary-container flex-shrink-0 flex items-center justify-center shadow-sm border border-outline-variant/30">
                        <span class="material-symbols-outlined text-on-primary-container text-[20px]">smart_toy</span>
                    </div>
                    <div class="bg-surface-container-lowest border border-outline-variant/30 rounded-[24px] rounded-bl-sm px-5 py-4 shadow-sm hover:shadow-md transition-shadow">
                        <p class="font-body-lg text-on-surface leading-relaxed">${isVisitante ? 'Olá, Visitante. O seu painel de demonstração está pronto. Como posso ajudar a organizar suas finanças?' : 'Olá, Renan. O seu painel financeiro está sincronizado. Qual cenário vamos analisar hoje?'}</p>
                    </div>
                </div>
                ` : ''}

                ${bolhasHTML}

                <!-- Typing Indicator (Hidden by default) -->
                <div id="typing-indicator" class="hidden flex-col gap-2 self-start max-w-[90%] sm:max-w-[85%] shrink-0">
                    <div class="flex items-end gap-3">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary-container to-tertiary-container flex-shrink-0 flex items-center justify-center shadow-sm border border-outline-variant/30">
                            <span class="material-symbols-outlined text-on-primary-container text-[20px]">smart_toy</span>
                        </div>
                        <div class="bg-surface-container-lowest border border-outline-variant/30 rounded-[24px] rounded-bl-sm px-5 py-4 shadow-sm flex items-center gap-2 h-[56px]">
                            <div class="w-2.5 h-2.5 rounded-full bg-primary/60 animate-[bounce_1.4s_infinite_ease-in-out_both]"></div>
                            <div class="w-2.5 h-2.5 rounded-full bg-primary/60 animate-[bounce_1.4s_infinite_ease-in-out_both]" style="animation-delay: 0.2s"></div>
                            <div class="w-2.5 h-2.5 rounded-full bg-primary/60 animate-[bounce_1.4s_infinite_ease-in-out_both]" style="animation-delay: 0.4s"></div>
                        </div>
                    </div>
                </div>

            </div>

            <!-- Footer Input -->
            <footer class="fixed bottom-[90px] sm:bottom-[32px] left-0 w-full z-40 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/90 to-transparent pb-4 pt-16 pointer-events-none">
                <div class="max-w-3xl mx-auto px-4 sm:px-6 w-full pointer-events-auto">
                    <div class="bg-surface/85 backdrop-blur-2xl border border-outline-variant/20 rounded-[28px] p-1.5 flex items-end gap-2 shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-150 focus-within:shadow-[0_8px_32px_rgba(var(--color-primary-rgb),0.12)] focus-within:border-primary/30 focus-within:bg-surface/95">
                        <!-- Botão de Anexo -->
                        <label class="w-[44px] h-[44px] mb-0.5 ml-0.5 flex-shrink-0 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all duration-200 active:scale-95 cursor-pointer rounded-full">
                            <span class="material-symbols-outlined text-[22px]">attach_file</span>
                            <input type="file" id="chat-attachment" class="hidden" accept=".csv" />
                        </label>
                        
                        <!-- Input Area -->
                        <div class="flex-1 flex flex-col justify-center min-h-[44px] my-0.5">
                            <textarea id="chat-input" rows="1" class="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-transparent resize-none px-1 py-0 my-2.5 font-body-lg text-on-surface placeholder:text-on-surface-variant/50 max-h-[120px] no-scrollbar leading-[26px] transform-gpu" placeholder="Pergunte ao Parceiro..."></textarea>
                        </div>
                        
                        <!-- Botão Enviar -->
                        <button id="btn-send-message" disabled class="w-[44px] h-[44px] mb-0.5 mr-0.5 flex-shrink-0 rounded-full bg-primary text-on-primary flex items-center justify-center transition-all duration-150 active:scale-95 disabled:bg-surface-variant/40 disabled:text-on-surface-variant/40 disabled:shadow-none shadow-md hover:shadow-lg hover:bg-primary/90">
                            <span class="material-symbols-outlined text-[20px] ml-0.5">send</span>
                        </button>
                    </div>
                </div>
            </footer>
        </main>
        </div>
        
        ${isSidebarOpen ? `
        <div id="sidebar-backdrop" class="fixed inset-0 bg-scrim/40 backdrop-blur-sm z-[60] animate-[fadeIn_0.2s_ease-out]"></div>
        <aside id="sidebar-panel" class="fixed top-0 left-0 h-full w-[85%] max-w-sm bg-surface-container-lowest z-[70] shadow-2xl flex flex-col animate-[slideInLeft_0.3s_ease-out] overflow-hidden rounded-r-[24px]">
            <div class="p-6 border-b border-outline-variant/20 flex justify-between items-center bg-surface/50 backdrop-blur-md">
                <h2 class="font-display-sm text-on-surface font-medium">Histórico</h2>
                <button id="btn-close-sidebar" class="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-variant transition-colors bg-surface border border-outline-variant/30 shadow-sm">
                    <span class="material-symbols-outlined text-[20px]">close</span>
                </button>
            </div>
            <div id="lista-sessoes" class="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-surface-container-lowest no-scrollbar">
                ${sessoesSalvas.map(sessao => `
                    <div class="relative shrink-0 overflow-hidden rounded-[20px] bg-surface-container group shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-outline-variant/10 transition-all duration-150" data-id="${sessao.id}">
                        <!-- Camada de Fundo (Ações) -->
                        <div class="absolute inset-0 flex justify-end items-center px-4 gap-2 bg-surface-variant/50">
                            <button class="btn-sidebar-acao btn-fixar ${sessao.fixado ? 'text-primary' : 'text-on-surface-variant'} hover:bg-primary/10 w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-sm bg-surface" data-id="${sessao.id}">
                                <span class="material-symbols-outlined text-[20px]">${sessao.fixado ? 'keep' : 'push_pin'}</span>
                            </button>
                            <button class="btn-sidebar-acao btn-renomear text-on-surface-variant hover:bg-on-surface-variant/10 w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-sm bg-surface" data-id="${sessao.id}">
                                <span class="material-symbols-outlined text-[20px]">edit</span>
                            </button>
                            <button class="btn-sidebar-acao btn-excluir text-error hover:bg-error-container w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-sm bg-surface" data-id="${sessao.id}">
                                <span class="material-symbols-outlined text-[20px]">delete</span>
                            </button>
                        </div>
                        
                        <!-- Camada Frontal (Conteúdo) -->
                        <div class="chat-item-content relative bg-surface-container p-4 w-full h-full cursor-pointer transition-transform duration-150 ease-out flex flex-col gap-1.5 rounded-[20px]" data-id="${sessao.id}">
                            <div class="flex items-start justify-between gap-2">
                                <span class="font-body-lg text-on-surface font-medium line-clamp-2 flex-1 leading-snug">${sessao.titulo || 'Nova Conversa'}</span>
                                ${sessao.fixado ? '<span class="material-symbols-outlined text-[18px] text-primary shrink-0 mt-0.5">push_pin</span>' : ''}
                            </div>
                            <span class="font-body-sm text-on-surface-variant/60 text-[12px] font-medium tracking-wide">${sessao.dataAtualizacao ? new Date(sessao.dataAtualizacao.seconds * 1000).toLocaleString() : ''}</span>
                        </div>
                    </div>
                `).join('')}
                ${sessoesSalvas.length === 0 ? '<div class="flex flex-col items-center justify-center h-full opacity-60 mt-10"><span class="material-symbols-outlined text-[48px] mb-4">history</span><p class="text-center font-body-lg text-on-surface-variant">Nenhum histórico encontrado.</p></div>' : ''}
            </div>
            
            <div class="p-6 border-t border-outline-variant/20 bg-surface/50 backdrop-blur-md flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center shadow-sm border border-outline-variant/30 text-on-surface-variant">
                        <span class="material-symbols-outlined text-[24px]">person</span>
                    </div>
                    <span class="font-label-large text-on-surface font-medium">${isVisitante ? 'Visitante' : 'Renan Ramos'}</span>
                </div>
                <button id="btn-logoff-analises" class="text-error hover:bg-error-container w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-sm bg-surface border border-error/10" title="Sair">
                    <span class="material-symbols-outlined text-[20px]">logout</span>
                </button>
            </div>
        </aside>
        ` : ''}

        <style>
            @keyframes slideInLeft {
                from { transform: translateX(-100%); }
                to { transform: translateX(0); }
            }
        </style>

        <!-- Hack para descer o scroll e fix Visual Viewport iOS -->
        <script>
            (function() {
                const updateVV = () => {
                    if (window.visualViewport) {
                        document.documentElement.style.setProperty('--vv-height', window.visualViewport.height + 'px');
                        window.scrollTo(0, 0);
                    }
                };
                if (window.visualViewport) {
                    window.visualViewport.addEventListener('resize', updateVV);
                    window.visualViewport.addEventListener('scroll', updateVV);
                    updateVV();
                }
            })();
            setTimeout(() => {
                const h = document.getElementById('chat-history');
                if(h) h.scrollTop = h.scrollHeight;
            }, 50);
        </script>
    `;
};

// Functions to generate bubble HTML outside render scope to DRY code up inside event listeners
const executarToolLocalmenteVisitante = (toolName, args) => {
    try {
        if (toolName === "registrar_transacao") {
            adicionarTransacaoFluxo(args.descricao, args.valor, args.tipo, args.categoria, args.dataIso, args.fonte_pagamento, args.parcelas);
        } else if (toolName === "registrar_multiplas_transacoes") {
            for (const t of (args.transacoes || [])) {
                adicionarTransacaoFluxo(t.descricao, t.valor, t.tipo, t.categoria, t.dataIso, t.fonte_pagamento, t.parcelas);
            }
        } else if (toolName === "criar_meta") {
            adicionarMeta(args.nome, args.valorTotal, null);
        } else if (toolName === "excluir_meta") {
            const targetName = String(args.nome).toLowerCase().trim();
            const meta = store.metas ? store.metas.find(m => m.nome.toLowerCase().includes(targetName)) : null;
            if (meta) excluirMeta(meta.id);
        } else if (toolName === "excluir_transacao") {
            const desc = String(args.descricao).toLowerCase().trim();
            if (args.fonte_pagamento === "corrente") {
                if (desc === "tudo") {
                    const toRemove = store.transacoes.filter(t => t.fonteId === 'corrente');
                    toRemove.forEach(t => excluirTransacaoFluxo(t.id));
                } else {
                    const tx = store.transacoes.find(t => t.fonteId === 'corrente' && t.titulo.toLowerCase().includes(desc));
                    if (tx) excluirTransacaoFluxo(tx.id);
                }
            } else {
                const cartao = store.corrente.cartoes.find(c => c.nome.toLowerCase() === (args.fonte_pagamento||'').toLowerCase());
                if (cartao) {
                    if (desc === "tudo") {
                        const toRemove = [...cartao.compras];
                        toRemove.forEach(c => excluirCompra(cartao.id, c.id));
                    } else {
                        const compra = cartao.compras.find(c => c.descricao.toLowerCase().includes(desc));
                        if (compra) excluirCompra(cartao.id, compra.id);
                    }
                }
            }
        } else if (toolName === "excluir_multiplas_transacoes") {
            for (const t of (args.transacoes || [])) {
                executarToolLocalmenteVisitante("excluir_transacao", t);
            }
        }
    } catch (e) {
        console.error("Erro simulando localmente:", e);
    }
};

const getUserBubbleHTML = (text) => `
    <div class="flex items-end gap-3 self-end max-w-[85%] sm:max-w-[75%] animate-[fadeIn_0.3s_ease-out]">
        <div class="bg-primary text-on-primary rounded-[24px] rounded-br-sm px-5 py-3.5 shadow-md hover:shadow-lg transition-shadow">
            <p class="font-body-lg whitespace-pre-wrap leading-relaxed">${text}</p>
        </div>
    </div>
`;

const getAIBubbleHTML = (text, buttonsHTML = '', id = null) => `
    <div class="flex flex-col gap-2 self-start max-w-[90%] sm:max-w-[85%] animate-[fadeIn_0.3s_ease-out]">
        <div class="flex items-end gap-3">
            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary-container to-tertiary-container flex-shrink-0 flex items-center justify-center shadow-sm border border-outline-variant/30">
                <span class="material-symbols-outlined text-on-primary-container text-[20px]">smart_toy</span>
            </div>
            <div class="bg-surface-container-lowest border border-outline-variant/30 rounded-[24px] rounded-bl-sm px-5 py-4 shadow-sm hover:shadow-md transition-shadow">
                <p ${id ? `id="${id}"` : ''} class="font-body-lg text-on-surface leading-relaxed whitespace-pre-wrap">${text}</p>
                ${buttonsHTML}
            </div>
        </div>
    </div>
`;

const getErrorBubbleHTML = (message) => `
    <div class="flex items-end gap-3 self-start max-w-[90%] sm:max-w-[85%] animate-[fadeIn_0.3s_ease-out]">
        <div class="w-10 h-10 rounded-full bg-error-container text-error flex-shrink-0 flex items-center justify-center shadow-sm border border-error/20">
            <span class="material-symbols-outlined text-[20px]">error</span>
        </div>
        <div class="bg-error-container border border-error/20 rounded-[24px] rounded-bl-sm px-5 py-4 shadow-sm hover:shadow-md transition-shadow">
            <p class="font-body-lg text-error leading-relaxed whitespace-pre-wrap">${message}</p>
        </div>
    </div>
`;

const typeWriteHTML = async (elementId, htmlString, speed = 2) => {
    const el = document.getElementById(elementId);
    if (!el) return;
    let currentHTML = '';
    let i = 0;
    while (i < htmlString.length) {
        if (htmlString[i] === '<') {
            let tag = '';
            while (htmlString[i] !== '>' && i < htmlString.length) {
                tag += htmlString[i];
                i++;
            }
            tag += '>';
            currentHTML += tag;
            i++;
        } else {
            currentHTML += htmlString[i];
            el.innerHTML = currentHTML + '<span class="inline-block w-1 h-4 bg-primary/40 animate-pulse align-middle ml-1"></span>'; // Cursor opcional charmoso
            i++;
            
            // Pausa a cada 3 caracteres para ir 3x mais rápido
            if (i % 3 === 0) {
                scrollToBottom();
                await new Promise(r => setTimeout(r, speed));
            }
        }
    }
    el.innerHTML = htmlString; // Garante o HTML final exato sem o cursor
    scrollToBottom();
};

// Listeners Globais
document.addEventListener('click', async (e) => {
    // Menu Sidebar
    const btnMenu = e.target.closest('#btn-menu-sidebar');
    if (btnMenu) {
        abrirSidebar();
        return;
    }

    // Fechar Sidebar
    const btnClose = e.target.closest('#btn-close-sidebar');
    const backdrop = e.target.closest('#sidebar-backdrop');
    if (btnClose || backdrop) {
        window.fecharSidebar();
        return;
    }

    // Ações Sidebar
    const btnExcluir = e.target.closest('.btn-excluir');
    if (btnExcluir) {
        e.stopPropagation();
        const isVisitante = localStorage.getItem('tc_auth_token') === 'visitante';
        if (isVisitante) return;
        const id = btnExcluir.getAttribute('data-id');
        if (confirm("Excluir esta conversa?")) {
            try {
                const userId = import.meta.env.VITE_FIRESTORE_DOC_ID || import.meta.env.VITE_ADMIN_USER || "default_user";
                const db = getFirestore(app);
                await deleteDoc(doc(db, "users", userId, "sessoes_chat", id));
                if (sessionId === id) {
                    historicoSessao = [];
                    sessionId = gerarIdSessao();
                }
                abrirSidebar();
            } catch (err) { console.error(err); }
        }
        return;
    }

    const btnRenomear = e.target.closest('.btn-renomear');
    if (btnRenomear) {
        e.stopPropagation();
        const isVisitante = localStorage.getItem('tc_auth_token') === 'visitante';
        if (isVisitante) return;
        const id = btnRenomear.getAttribute('data-id');
        const novoNome = prompt("Novo título:");
        if (novoNome && novoNome.trim()) {
            try {
                const userId = import.meta.env.VITE_FIRESTORE_DOC_ID || import.meta.env.VITE_ADMIN_USER || "default_user";
                const db = getFirestore(app);
                await updateDoc(doc(db, "users", userId, "sessoes_chat", id), {
                    titulo: novoNome.trim()
                });
                abrirSidebar();
            } catch (err) { console.error(err); }
        }
        return;
    }

    const btnFixar = e.target.closest('.btn-fixar');
    if (btnFixar) {
        e.stopPropagation();
        const isVisitante = localStorage.getItem('tc_auth_token') === 'visitante';
        if (isVisitante) return;
        const id = btnFixar.getAttribute('data-id');
        const sessao = sessoesSalvas.find(s => s.id === id);
        if (sessao) {
            try {
                const userId = import.meta.env.VITE_FIRESTORE_DOC_ID || import.meta.env.VITE_ADMIN_USER || "default_user";
                const db = getFirestore(app);
                await updateDoc(doc(db, "users", userId, "sessoes_chat", id), {
                    fixado: !sessao.fixado
                });
                abrirSidebar();
            } catch (err) { console.error(err); }
        }
        return;
    }

    const btnNovoChatSidebar = e.target.closest('#btn-novo-chat-sidebar');
    if (btnNovoChatSidebar) {
        historicoSessao = [];
        sessionId = gerarIdSessao();
        window.fecharSidebar();
        return;
    }

    // Carregar Sessão
    const chatContent = e.target.closest('.chat-item-content');
    if (chatContent) {
        if (chatContent.style.transform && chatContent.style.transform !== 'translateX(0px)') {
            chatContent.style.transform = 'translateX(0px)';
            return;
        }

        const isVisitante = localStorage.getItem('tc_auth_token') === 'visitante';
        if (isVisitante) return;

        const id = chatContent.getAttribute('data-id');
        try {
            const userId = import.meta.env.VITE_FIRESTORE_DOC_ID || import.meta.env.VITE_ADMIN_USER || "default_user";
            const db = getFirestore(app);
            const docRef = doc(db, "users", userId, "sessoes_chat", id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                historicoSessao = docSnap.data().mensagens || [];
                sessionId = id;
                window.fecharSidebar();
            }
        } catch (err) { console.error(err); }
        return;
    }

    // Logoff Popover Analises
    const btnAvatar = e.target.closest('#btn-avatar-analises');
    const logoffPopover = document.getElementById('logoff-popover-analises');
    if (btnAvatar && logoffPopover) {
        logoffPopover.classList.toggle('hidden');
    } else if (logoffPopover && !e.target.closest('#logoff-popover-analises')) {
        logoffPopover.classList.add('hidden');
    }

    const btnLogoff = e.target.closest('#btn-logoff-analises');
    if (btnLogoff) {
        logout();
    }



    // Botões de Confirmação da IA
    const btnConfirmar = e.target.closest('.btn-confirmar-acao');
    if (btnConfirmar) {
        const parentDiv = btnConfirmar.closest('.flex-wrap');
        if (parentDiv) {
            parentDiv.querySelectorAll('button').forEach(b => {
                b.disabled = true;
                b.classList.add('opacity-50', 'pointer-events-none');
            });
        }

        const toolName = btnConfirmar.getAttribute('data-tool');
        const toolArgs = JSON.parse(btnConfirmar.getAttribute('data-args'));
        enviarConfirmacao(toolName, toolArgs);
    }

    const btnCancelar = e.target.closest('.btn-cancelar-acao');
    if (btnCancelar) {
        const parentDiv = btnCancelar.closest('.flex-wrap');
        if (parentDiv) {
            parentDiv.querySelectorAll('button').forEach(b => {
                b.disabled = true;
                b.classList.add('opacity-50', 'pointer-events-none');
            });
        }
        const toolName = btnCancelar.getAttribute('data-tool');
        cancelarConfirmacao(toolName);
    }

    // Botão Enviar
    const btnSend = e.target.closest('#btn-send-message');
    if (btnSend) {
        enviarMensagem();
    }
});

document.addEventListener('input', (e) => {
    if (e.target.id === 'chat-input') {
        const textarea = e.target;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';

        const btnSend = document.getElementById('btn-send-message');
        if (textarea.value.trim() !== '') {
            btnSend.removeAttribute('disabled');
        } else {
            btnSend.setAttribute('disabled', 'true');
        }
    }
});

document.addEventListener('change', (e) => {
    if (e.target.id === 'chat-attachment') {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const rawText = event.target.result;
            const formattedText = `\n\n[DADOS DO ARQUIVO ANEXADO: ${file.name}]\n\`\`\`csv\n${rawText}\n\`\`\`\n`;

            const textarea = document.getElementById('chat-input');
            if (textarea) {
                textarea.value += formattedText;
                
                // Reajuste de altura da textarea
                textarea.style.height = 'auto';
                textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
                
                // Habilita o botão de enviar
                const btnSend = document.getElementById('btn-send-message');
                if (btnSend) btnSend.removeAttribute('disabled');
            }
        };
        reader.readAsText(file);

        // Limpa o valor para permitir novo upload do mesmo arquivo se desejado
        e.target.value = '';
    }
});

document.addEventListener('keydown', (e) => {
    if (e.target.id === 'chat-input' && e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        enviarMensagem();
    }
});

const enviarMensagem = async () => {
    const input = document.getElementById('chat-input');
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    // Reseta o input
    input.value = '';
    input.style.height = 'auto';
    document.getElementById('btn-send-message').setAttribute('disabled', 'true');

    const chatHistory = document.getElementById('chat-history');
    const typingIndicator = document.getElementById('typing-indicator');

    // Escapa o HTML para segurança
    const escapedText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // Cria a bolha da mensagem do usuário
    const userMsgHTML = getUserBubbleHTML(escapedText);

    // Insere a mensagem do usuário antes do indicador de digitação
    typingIndicator.insertAdjacentHTML('beforebegin', userMsgHTML);

    // Mostra o indicador de digitação
    typingIndicator.classList.remove('hidden');
    typingIndicator.classList.add('flex');

    scrollToBottom();

    try {
        const functions = getFunctions(app);
        const processarMensagem = httpsCallable(functions, 'processarMensagemIA');

        // Copia o histórico ANTES de adicionar a mensagem atual, removendo marcações de UI
        const historicoParaEnviar = historicoSessao.map(msg => {
            const cleanMsg = { ...msg };
            delete cleanMsg._uiText;
            return cleanMsg;
        });

        // Adiciona a mensagem do usuário ao histórico global
        historicoSessao.push({ role: "user", parts: [{ text: text }] });

        const isVisitante = localStorage.getItem('tc_auth_token') === 'visitante';

        // Chamada real para o Backend
        const result = await processarMensagem({
            sessionId: sessionId,
            mensagemUsuario: text,
            historico: historicoParaEnviar,
            isVisitante: isVisitante,
            contextoVisitante: isVisitante ? JSON.stringify(store) : null
        });

        // Esconde o indicador de digitação
        typingIndicator.classList.add('hidden');
        typingIndicator.classList.remove('flex');

        let respostaFormatada = result.data.textoGerado || '';

        // Se a IA pedir confirmação para invocar uma Tool
        if (result.data.status === "requer_confirmacao") {
            // Injeta a intenção no histórico global com o texto para UI renderizar depois se mudar de aba
            const callReq = result.data.functionCallRequest;
            callReq._uiText = result.data.textoGerado;
            historicoSessao.push(callReq);

            let formatado = result.data.textoGerado.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

            // Cria a bolha com botões dinâmicos
            const argsStr = JSON.stringify(result.data.toolArgs).replace(/'/g, "&apos;");
            const buttonsHTML = `
                <div class="flex flex-wrap gap-3 mt-5 pt-4 border-t border-outline-variant/30">
                    <button class="btn-confirmar-acao flex-1 bg-primary text-on-primary px-5 py-2.5 rounded-full font-label-large shadow-sm hover:opacity-90 hover:shadow-md active:scale-[0.98] transition-all" data-tool="${result.data.toolName}" data-args='${argsStr}'>Sim, confirmar</button>
                    <button class="btn-cancelar-acao flex-1 bg-error-container text-error px-5 py-2.5 rounded-full font-label-large shadow-sm hover:bg-error/20 hover:shadow-md active:scale-[0.98] transition-all" data-tool="${result.data.toolName}">Não, cancelar</button>
                </div>
             `;
            const msgId = 'ai-msg-' + Date.now();
            const aiMsgHTML = getAIBubbleHTML('', buttonsHTML, msgId);
            typingIndicator.insertAdjacentHTML('beforebegin', aiMsgHTML);
            scrollToBottom();
            await typeWriteHTML(msgId, formatado, 5);
            return; // Aborta fluxo de texto puro
        }

        // Tratamento simples de Markdown para Negrito (Fluxo Normal)
        respostaFormatada = respostaFormatada.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Adiciona a resposta da IA ao histórico global
        historicoSessao.push({ role: "model", parts: [{ text: result.data.textoGerado }] });

        // Cria a bolha de resposta da IA
        const msgId = 'ai-msg-' + Date.now();
        const aiMsgHTML = getAIBubbleHTML('', '', msgId);

        // Insere a mensagem da IA antes do indicador de digitação
        typingIndicator.insertAdjacentHTML('beforebegin', aiMsgHTML);
        scrollToBottom();
        
        await typeWriteHTML(msgId, respostaFormatada, 5);

    } catch (error) {
        console.error("Erro na comunicação com a IA:", error);

        // Remove a última mensagem do usuário do histórico para não corromper tentativas futuras
        historicoSessao.pop();

        // Esconde o indicador de digitação
        typingIndicator.classList.add('hidden');
        typingIndicator.classList.remove('flex');

        // Cria a bolha de erro
        const errorMsgHTML = getErrorBubbleHTML(error.message || 'Desculpe, tive um problema de conexão. Pode tentar novamente?');

        typingIndicator.insertAdjacentHTML('beforebegin', errorMsgHTML);
        scrollToBottom();
    }
};

const cancelarConfirmacao = async (toolName) => {
    const typingIndicator = document.getElementById('typing-indicator');

    // Injeta a recusa da Tool no histórico global para a IA saber que não foi executada
    historicoSessao.push({
        role: "function",
        parts: [{
            functionResponse: {
                name: toolName || "unknown_tool",
                response: { status: "cancelado_pelo_usuario" }
            }
        }]
    });

    const textMsg = "Não, cancele a operação.";

    const userMsgHTML = getUserBubbleHTML(textMsg);
    typingIndicator.insertAdjacentHTML('beforebegin', userMsgHTML);
    scrollToBottom();

    // Mostra indicador de digitação
    typingIndicator.classList.remove('hidden');
    typingIndicator.classList.add('flex');

    try {
        const functions = getFunctions(app);
        const processarMensagem = httpsCallable(functions, 'processarMensagemIA');

        // Copia do histórico (limpando _uiText para a API)
        const historicoParaEnviar = historicoSessao.map(msg => {
            const cleanMsg = { ...msg };
            delete cleanMsg._uiText;
            return cleanMsg;
        });

        // Adiciona a fala do usuário ao histórico global (para ser renderizado em aba etc)
        historicoSessao.push({ role: "user", parts: [{ text: textMsg }] });

        const isVisitante = localStorage.getItem('tc_auth_token') === 'visitante';

        const result = await processarMensagem({
            sessionId: sessionId,
            mensagemUsuario: textMsg,
            historico: historicoParaEnviar,
            isVisitante: isVisitante,
            contextoVisitante: isVisitante ? JSON.stringify(store) : null
        });

        typingIndicator.classList.add('hidden');
        typingIndicator.classList.remove('flex');

        let respostaFormatada = result.data.textoGerado || '';
        respostaFormatada = respostaFormatada.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Adiciona a resposta da IA ao histórico
        historicoSessao.push({ role: "model", parts: [{ text: result.data.textoGerado }] });

        const msgId = 'ai-msg-' + Date.now();
        const aiMsgHTML = getAIBubbleHTML('', '', msgId);
        typingIndicator.insertAdjacentHTML('beforebegin', aiMsgHTML);
        scrollToBottom();
        
        await typeWriteHTML(msgId, respostaFormatada, 5);

    } catch (error) {
        console.error("Erro ao cancelar:", error);
        typingIndicator.classList.add('hidden');
        typingIndicator.classList.remove('flex');

        const errorMsgHTML = getErrorBubbleHTML(error.message || 'Erro de comunicação.');
        typingIndicator.insertAdjacentHTML('beforebegin', errorMsgHTML);
        scrollToBottom();
    }
};

const enviarConfirmacao = async (toolName, toolArgs) => {
    const typingIndicator = document.getElementById('typing-indicator');

    // Mostra indicador de digitação
    typingIndicator.classList.remove('hidden');
    typingIndicator.classList.add('flex');
    scrollToBottom();

    try {
        const functions = getFunctions(app);
        const processarMensagem = httpsCallable(functions, 'processarMensagemIA');

        // Cópia do histórico (limpando _uiText para a API)
        const historicoParaEnviar = historicoSessao.map(msg => {
            const cleanMsg = { ...msg };
            delete cleanMsg._uiText;
            return cleanMsg;
        });

        const isVisitante = localStorage.getItem('tc_auth_token') === 'visitante';

        const result = await processarMensagem({
            sessionId: sessionId,
            acaoConfirmada: true,
            toolName: toolName,
            toolArgs: toolArgs,
            historico: historicoParaEnviar,
            isVisitante: isVisitante,
            contextoVisitante: isVisitante ? JSON.stringify(store) : null
        });

        if (isVisitante) {
            executarToolLocalmenteVisitante(toolName, toolArgs);
        } else {
            // Atualiza a interface e a Store global para refletir as mudanças do banco
            await initStore();
        }

        typingIndicator.classList.add('hidden');
        typingIndicator.classList.remove('flex');

        let respostaFormatada = result.data.textoGerado || '';
        respostaFormatada = respostaFormatada.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Injeta a execução da Tool no histórico global (simulado, já que o backend que gravou)
        historicoSessao.push({
            role: "function",
            parts: [{
                functionResponse: {
                    name: toolName,
                    response: { status: "executado_pelo_backend" }
                }
            }]
        });

        // Adiciona a resposta da IA ao histórico
        historicoSessao.push({ role: "model", parts: [{ text: result.data.textoGerado }] });

        const msgId = 'ai-msg-' + Date.now();
        const aiMsgHTML = getAIBubbleHTML('', '', msgId);
        typingIndicator.insertAdjacentHTML('beforebegin', aiMsgHTML);
        scrollToBottom();
        
        await typeWriteHTML(msgId, respostaFormatada, 5);

    } catch (error) {
        console.error("Erro ao confirmar:", error);
        historicoSessao.pop();
        typingIndicator.classList.add('hidden');
        typingIndicator.classList.remove('flex');

        const errorMsgHTML = getErrorBubbleHTML(error.message || 'Erro ao processar confirmação.');
        typingIndicator.insertAdjacentHTML('beforebegin', errorMsgHTML);
        scrollToBottom();
    }
};

const scrollToBottom = () => {
    const chatHistory = document.getElementById('chat-history');
    if (chatHistory) {
        requestAnimationFrame(() => {
            chatHistory.scrollTop = chatHistory.scrollHeight;
        });
    }
}

// Swipe Sidebar Listeners
document.addEventListener('touchstart', (e) => {
    const chatContent = e.target.closest('.chat-item-content');
    if (chatContent) {
        startX = e.touches[0].clientX;
        currentX = startX;
        chatContent.style.transition = 'none';
    }
}, { passive: true });

document.addEventListener('touchmove', (e) => {
    const chatContent = e.target.closest('.chat-item-content');
    if (chatContent) {
        currentX = e.touches[0].clientX;
        const diffX = currentX - startX;
        if (diffX < 0) {
            chatContent.style.transform = `translateX(${Math.max(diffX, -160)}px)`;
        }
    }
}, { passive: true });

document.addEventListener('touchend', (e) => {
    const chatContent = e.target.closest('.chat-item-content');
    if (chatContent) {
        const diffX = currentX - startX;
        chatContent.style.transition = 'transform 0.2s ease-out';

        if (diffX < -40) {
            chatContent.style.transform = `translateX(-160px)`;
        } else {
            chatContent.style.transform = `translateX(0px)`;
        }
    }
});

// Ocultar teclado ao rolar o histórico
document.addEventListener('touchmove', (e) => {
    if (e.target.closest('#chat-history')) {
        const chatInput = document.getElementById('chat-input');
        if (chatInput && document.activeElement === chatInput) {
            chatInput.blur();
        }
    }
}, { passive: true });

// Correção para teclado em dispositivos móveis
document.addEventListener('focusin', (e) => {
    if (e.target.id === 'chat-input') {
        const bottomNav = document.getElementById('bottom-nav');
        if (bottomNav) bottomNav.style.display = 'none';

        const footer = e.target.closest('footer');
        if (footer) {
            footer.classList.remove('bottom-[90px]', 'sm:bottom-[32px]', 'pt-16');
            footer.classList.add('bottom-0', 'pt-2');
            footer.classList.remove('bg-gradient-to-t', 'from-surface-container-lowest', 'via-surface-container-lowest/90', 'to-transparent');
            footer.classList.add('bg-surface-container-lowest');
        }

        const chatHistory = document.getElementById('chat-history');
        if (chatHistory) {
            chatHistory.classList.remove('pb-[180px]');
            chatHistory.classList.add('pb-[80px]');
        }
        
        // Múltiplos timeouts para sincronizar com a animação de abertura do teclado no iOS
        setTimeout(() => { window.scrollTo(0, 0); scrollToBottom(); }, 50);
        setTimeout(scrollToBottom, 250);
        setTimeout(scrollToBottom, 500);
    }
});

const restoreChatLayout = () => {
    const bottomNav = document.getElementById('bottom-nav');
    if (bottomNav) bottomNav.style.display = '';

    const footer = document.querySelector('footer');
    if (footer && footer.classList.contains('bottom-0')) {
        footer.classList.add('bottom-[90px]', 'sm:bottom-[32px]', 'pt-16');
        footer.classList.remove('bottom-0', 'pt-2');
        footer.classList.add('bg-gradient-to-t', 'from-surface-container-lowest', 'via-surface-container-lowest/90', 'to-transparent');
        footer.classList.remove('bg-surface-container-lowest');
    }

    const chatHistory = document.getElementById('chat-history');
    if (chatHistory && chatHistory.classList.contains('pb-[80px]')) {
        chatHistory.classList.add('pb-[180px]');
        chatHistory.classList.remove('pb-[80px]');
    }
};

document.addEventListener('focusout', (e) => {
    if (e.target.id === 'chat-input') {
        restoreChatLayout();
    }
});

document.addEventListener('click', (e) => {
    const attachLabel = e.target.closest('label');
    if (attachLabel && attachLabel.querySelector('#chat-attachment')) {
        const chatInput = document.getElementById('chat-input');
        if (chatInput) chatInput.blur();
        restoreChatLayout();
    }
});
