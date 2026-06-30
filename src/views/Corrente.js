import { store, getLimiteUsado, getFaturaMes, adicionarCompra, editarCompra, excluirCompra, CATEGORIAS_GLOBAIS, isFaturaPaga, pagarFatura, desfazerPagamentoFatura, MAPA_ICONES } from '../store.js';
import { formatarMoeda } from '../utils.js';
import { logout } from '../auth.js';

let currentFaturaCartaoId = null;
let currentFaturaAno = 2026;
let currentFaturaMes = 5; // 5 = Junho
let pendingDeleteId = null;
let pendingDeleteCartao = null;
let pendingPagarVal = null;
let pendingReverterVal = null;

const monthNames = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];

const generateMonthsTimeline = (anoAtivo, mesAtivo, cartaoId) => {
    let html = '';
    const hoje = new Date();
    let startMes = hoje.getMonth();
    let startAno = hoje.getFullYear();

    const cartao = store.corrente.cartoes.find(c => c.id === cartaoId);
    if (cartao && cartao.diaFechamento && hoje.getDate() >= cartao.diaFechamento) {
        startMes += 1;
        if (startMes > 11) {
            startMes = 0;
            startAno++;
        }
    }

    for (let i = 0; i <= 12; i++) {
        const ano = startAno + Math.floor((startMes + i) / 12);
        const mes = (startMes + i) % 12;
        const label = `${monthNames[mes].substring(0, 3)} ${ano}`;
        const isAtivo = (ano === parseInt(anoAtivo) && mes === parseInt(mesAtivo));
        const bg = isAtivo ? 'bg-primary text-on-primary shadow-md font-bold' : 'bg-surface text-on-surface-variant border border-outline-variant/10 shadow-sm hover:bg-surface-container-low';
        html += `<button class="btn-fatura-mes shrink-0 px-5 py-2 rounded-xl text-[11px] font-label-caps tracking-widest transition-all ${bg}" data-ano="${ano}" data-mes="${mes}">${label}</button>`;
    }
    return html;
};

const categoriasSelectHTML = CATEGORIAS_GLOBAIS.map(c => `<option value="${c}">${c}</option>`).join('');

export const Corrente = () => {
    const hoje = new Date();
    const currentMonthLabel = `${monthNames[hoje.getMonth()]} ${hoje.getFullYear()}`;

    // Generate Cards
    const cardsHTML = store.corrente.cartoes.map(card => {
        const limiteUsado = getLimiteUsado(card);
        const percent = Math.min((limiteUsado / card.limiteTotal) * 100, 100);
        const tipoLabel = card.tipo === 'CREDIT' ? 'CRÉDITO' : 'DÉBITO';

        return `
            <div class="snap-center shrink-0 w-[280px] h-[160px] border border-outline-variant/20 rounded-xl p-[24px] flex flex-col justify-between shadow-sm cursor-pointer hover:shadow-md transition-shadow cartao-btn overflow-hidden bg-surface-container-low" data-id="${card.id}">
                <div class="flex justify-between items-start pointer-events-none w-full">
                    <div class="flex flex-col">
                        <span class="font-label-caps text-label-caps text-on-surface-variant">${tipoLabel} • ${currentMonthLabel}</span>
                        <span class="font-body-lg text-body-lg text-primary mt-1">${card.nome}</span>
                    </div>
                    <span class="material-symbols-outlined ${card.corIcone}">credit_card</span>
                </div>
                
                <div class="flex flex-col gap-2 pointer-events-none w-full">
                    <div class="flex justify-between items-end">
                        <span class="font-body-sm text-body-sm text-on-surface-variant">Limite Usado</span>
                        <span class="font-body-lg text-body-lg text-primary">${formatarMoeda(limiteUsado)}</span>
                    </div>
                    <!-- Progress Gauge -->
                    <div class="w-full h-1 bg-secondary-container rounded-none overflow-hidden">
                        <div class="h-full ${card.bgBarra}" style="width: ${percent}%"></div>
                    </div>
                    <div class="flex justify-between items-center mt-1">
                        <span class="font-label-caps text-label-caps text-outline text-[10px]">TOTAL: ${formatarMoeda(card.limiteTotal)}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Generate Goals
    const metasValidas = (store.metas || []).filter(m => m !== null && typeof m === 'object');
    let goalsHTML = '';
    if (metasValidas.length === 0) {
        goalsHTML = `
            <div class="flex items-center gap-4 py-2 opacity-80">
                <div class="w-10 h-10 shrink-0 bg-surface-container-high rounded-full flex items-center justify-center">
                    <span class="material-symbols-outlined text-[20px] text-on-surface-variant">savings</span>
                </div>
                <div class="flex flex-col">
                    <span class="font-body-lg text-[15px] font-medium text-primary leading-tight">Nenhum objetivo</span>
                    <span class="font-body-sm text-[13px] text-secondary">Vá até o cofre para criar.</span>
                </div>
            </div>
        `;
    } else {
        const listHTML = metasValidas.map((meta, index) => {
            const valorAportes = (meta.aportes || []).reduce((sum, a) => sum + parseFloat(a.valor), 0);
            const valorAtual = valorAportes + (meta.rendimentoAcumulado || 0);
            const percent = meta.valorTotal ? Math.round((valorAtual / meta.valorTotal) * 100) : 0;
            const isFirst = index === 0;
            const nodeColor = isFirst ? 'bg-primary' : 'bg-surface-container-highest';
            const opacity = isFirst ? '' : 'opacity-60';
            return `
                <div class="relative flex items-start gap-4">
                    <div class="absolute -left-[21px] top-1 w-[10px] h-[10px] rounded-full ${nodeColor} ring-4 ring-surface/60"></div>
                    <div class="flex flex-col w-full ${opacity}">
                        <div class="flex justify-between items-start">
                            <span class="font-body-lg text-body-lg text-primary">${meta.nome}</span>
                            ${meta.valorTotal ? `<span class="font-body-sm text-body-sm text-on-surface-variant">${percent}%</span>` : ''}
                        </div>
                        <span class="font-label-caps text-label-caps text-outline mt-1">${formatarMoeda(valorAtual)} ${meta.valorTotal ? '/ ' + formatarMoeda(meta.valorTotal) : ''}</span>
                    </div>
                </div>
            `;
        }).join('');
        
        goalsHTML = `
            <div class="relative flex flex-col gap-stack-md pl-4 border-l border-outline-variant/30">
                ${listHTML}
            </div>
        `;
    }

    // Generate Recent Flow
    const recentTx = [...(store.transacoes || [])]
        .filter(tx => tx && tx.fonteId === 'corrente')
        .sort((a, b) => {
            const diff = new Date(b.data) - new Date(a.data);
            if (diff !== 0) return diff;
            const tsA = parseInt((a.id.match(/\d{13}/) || [0])[0]);
            const tsB = parseInt((b.id.match(/\d{13}/) || [0])[0]);
            return tsB - tsA;
        })
        .slice(0, 10);

    const transactionsHTML = recentTx.length > 0 ? recentTx.map(tx => {
        const icone = MAPA_ICONES[tx.categoria] || 'category';
        const isSaida = tx.tipo === 'SAIDA';
        const valorFormatado = formatarMoeda(Math.abs(tx.valor));
        const signal = isSaida ? '- ' : '+ ';
        return `
        <div class="flex items-center justify-between py-[20px] gap-4">
            <div class="flex items-center gap-4 flex-1 min-w-0">
                <div class="w-10 h-10 shrink-0 rounded-full bg-surface-container flex items-center justify-center">
                    <span class="material-symbols-outlined text-on-surface-variant text-[20px]">${icone}</span>
                </div>
                <div class="flex flex-col min-w-0">
                    <span class="font-body-lg text-body-lg text-primary truncate">${tx.titulo}</span>
                    <span class="font-label-caps text-label-caps text-on-surface-variant truncate">${tx.categoria}</span>
                </div>
            </div>
            <span class="font-body-lg text-body-lg text-primary shrink-0">${signal}${valorFormatado}</span>
        </div>
        `;
    }).join('') : '<p class="text-secondary font-body-sm py-4">Nenhuma movimentação recente.</p>';

    return `
        <main class="pt-stack-md px-container-padding-mobile flex flex-col gap-stack-md relative pb-8">
            <section class="flex flex-col items-start gap-stack-sm animate-[fadeIn_0.5s_ease-out]">
                <h1 class="font-display-balance-mobile text-display-balance-mobile text-primary tracking-tight" id="main-refuge-balance">${formatarMoeda(store.corrente.numeroPaz)}</h1>
                <p class="font-body-sm text-body-sm text-on-surface-variant/80">Saldo do Corrente</p>
            </section>

            <section class="flex flex-col gap-gutter w-full">
                <div class="flex items-center justify-between">
                    <h2 class="font-headline-md text-headline-md text-primary">Cartões Ativos</h2>
                </div>
                <!-- Scroll Horizontal limpo -->
                <div class="flex gap-4 overflow-x-auto overscroll-x-contain no-scrollbar pb-4 snap-x snap-mandatory w-full">
                    ${cardsHTML}
                </div>
            </section>

            <section class="flex flex-col gap-stack-md bg-surface/60 backdrop-blur-xl border border-outline-variant/20 rounded-xl p-[24px]">
                <h2 class="font-headline-md text-headline-md text-primary mb-2">Metas do Cofre</h2>
                ${goalsHTML}
            </section>

            <section class="flex flex-col gap-gutter pb-8">
                <h2 class="font-headline-md text-headline-md text-primary">Fluxo Recente</h2>
                <div class="flex flex-col divide-y divide-outline-variant/20">
                    ${transactionsHTML}
                </div>
            </section>
        </main>

        <!-- Fatura Modal -->
        <div id="fatura-modal" class="hidden fixed inset-0 z-[60] bg-on-background/40 backdrop-blur-sm flex items-end justify-center transition-opacity cursor-pointer">
            <div class="bg-surface-container-lowest backdrop-blur-3xl w-full max-w-md h-[85vh] rounded-t-[32px] flex flex-col shadow-2xl translate-y-full transition-transform duration-150 cursor-auto overflow-hidden" id="fatura-sheet">
                
                <div class="flex justify-between items-center px-6 pt-6 pb-3">
                    <h2 class="font-headline-md text-[22px] font-medium text-primary tracking-tight" id="fatura-title">Nome do Banco</h2>
                    <button id="close-fatura" class="text-on-surface-variant hover:text-primary hover:bg-surface-variant/50 transition-all bg-surface w-8 h-8 rounded-full flex items-center justify-center active:scale-90"><span class="material-symbols-outlined text-[18px]">close</span></button>
                </div>
                
                <!-- Month Timeline Scroller -->
                <div class="flex gap-2 overflow-x-auto overscroll-x-contain no-scrollbar px-6 pb-5 snap-x" id="fatura-timeline">
                    <!-- Timeline will be injected here -->
                </div>

                <div class="px-6 py-6 flex flex-col items-center border-b border-outline-variant/10 transition-colors" id="fatura-header-bg">
                    <span class="font-label-caps text-[11px] uppercase tracking-widest text-secondary mb-2" id="fatura-month-label">Total do Mês</span>
                    <span class="text-[44px] font-display-balance text-primary tracking-tighter leading-none mb-5" id="fatura-total">R$ 0,00</span>
                    <div class="flex items-center gap-2">
                        <div class="flex items-center gap-1.5 font-label-caps text-[10px] text-on-surface-variant/80 bg-surface px-3 py-1.5 rounded-lg shadow-sm">
                            <span class="material-symbols-outlined text-[14px]">calendar_today</span>
                            <span id="fatura-fecha">Fecha: 03 Jul</span>
                        </div>
                        <div class="flex items-center gap-1.5 font-label-caps text-[10px] text-on-surface-variant/80 bg-surface px-3 py-1.5 rounded-lg shadow-sm">
                            <span class="material-symbols-outlined text-[14px]">event_available</span>
                            <span id="fatura-vence">Vence: 08 Jul</span>
                        </div>
                    </div>
                </div>

                <div class="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-3 bg-surface shadow-inner" id="fatura-items">
                    <!-- Items go here -->
                </div>

                <div class="p-6 border-t border-outline-variant/20 bg-surface flex flex-col gap-3" id="fatura-footer">
                    <!-- Botoes injetados via JS -->
                </div>
            </div>
        </div>

        <!-- Nova Compra Modal (Também usado para Edição) -->
        <div id="nova-compra-modal" class="hidden fixed inset-0 z-[70] bg-on-background/40 backdrop-blur-sm flex items-end justify-center transition-opacity cursor-pointer">
            <div class="bg-surface/90 backdrop-blur-3xl w-full max-w-md p-6 rounded-t-3xl flex flex-col shadow-2xl translate-y-full transition-transform duration-150 cursor-auto" id="nova-compra-sheet">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="font-headline-md text-headline-md text-primary" id="nova-compra-title">Nova Compra</h2>
                    <button id="close-nova-compra" class="text-on-surface-variant hover:text-primary transition-colors bg-surface-container-highest w-8 h-8 rounded-full flex items-center justify-center"><span class="material-symbols-outlined text-[18px]">close</span></button>
                </div>
                <form id="form-nova-compra" class="flex flex-col gap-5">
                    <input type="hidden" id="nova-compra-cartao-id" value="">
                    <input type="hidden" id="nova-compra-id" value="">
                    <input type="hidden" id="compra-dt" value="">
                    
                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-caps text-label-caps text-secondary pl-1">Descrição da Compra</label>
                        <input type="text" id="compra-desc" style="text-transform: capitalize;" required class="w-full h-12 px-4 rounded-xl border border-outline-variant/30 bg-surface focus:border-primary focus:outline-none text-primary font-body-lg placeholder:text-on-surface-variant/40" placeholder="Ex: Supermercado Extra">
                    </div>
                    
                    <div class="flex gap-4">
                        <div class="flex flex-col gap-1.5 w-7/12">
                            <label class="font-label-caps text-label-caps text-secondary pl-1">Categoria</label>
                            <div class="relative">
                                <select id="compra-categoria" required class="w-full h-12 px-4 rounded-xl border border-outline-variant/30 bg-surface focus:border-primary focus:outline-none text-primary font-body-lg appearance-none">
                                    ${categoriasSelectHTML}
                                </select>
                                <span class="material-symbols-outlined absolute right-3 top-3 text-secondary pointer-events-none">expand_more</span>
                            </div>
                        </div>
                        <div class="flex flex-col gap-1.5 w-5/12">
                            <label class="font-label-caps text-label-caps text-secondary pl-1">Parcelas (Max 18)</label>
                            <input type="number" min="1" max="18" value="1" id="compra-parcelas" required class="w-full h-12 px-4 rounded-xl border border-outline-variant/30 bg-surface focus:border-primary focus:outline-none text-primary font-body-lg text-center">
                        </div>
                    </div>

                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-caps text-label-caps text-secondary pl-1">Valor Total</label>
                        <input type="text" inputmode="numeric" id="compra-valor" required class="w-full h-14 px-4 rounded-xl border border-outline-variant/30 bg-surface focus:border-primary focus:outline-none text-primary font-headline-sm" placeholder="R$ 0,00">
                    </div>

                    <button type="submit" class="w-full h-14 mt-4 bg-primary text-on-primary rounded-xl font-bold active:scale-95 transition-transform" id="btn-salvar-compra">
                        Salvar Compra
                    </button>
                </form>
            </div>
        </div>

        <!-- Confirmação Exclusão Modal -->
        <div id="confirm-delete-modal" class="hidden fixed inset-0 z-[80] bg-on-background/40 backdrop-blur-sm flex items-center justify-center transition-opacity px-4 cursor-pointer">
            <div class="bg-surface/90 backdrop-blur-3xl w-full max-w-sm p-8 rounded-[32px] flex flex-col shadow-2xl scale-95 transition-transform duration-150 cursor-auto" id="confirm-delete-sheet">
                <div class="w-16 h-16 rounded-full bg-error-container text-error flex items-center justify-center mx-auto mb-4">
                    <span class="material-symbols-outlined text-[32px]">delete_forever</span>
                </div>
                <h3 class="font-headline-md text-headline-md text-primary mb-2 text-center">Tem certeza?</h3>
                <p class="font-body-sm text-body-sm text-secondary text-center mb-8">Deseja realmente excluir esta compra? A alteração afetará as faturas em todos os meses referentes a ela.</p>
                
                <div class="flex gap-4">
                    <button id="btn-cancel-delete" class="flex-1 py-4 bg-surface-container-highest text-secondary rounded-xl font-bold active:scale-95 transition-transform">Voltar</button>
                    <button id="btn-confirm-delete" class="flex-1 py-4 bg-error-container text-error rounded-xl font-bold active:scale-95 transition-transform">Excluir</button>
                </div>
            </div>
        </div>

        <!-- Confirmação Pagamento Modal -->
        <div id="confirm-pagar-modal" class="hidden fixed inset-0 z-[80] bg-on-background/40 backdrop-blur-sm flex items-center justify-center transition-opacity px-4 cursor-pointer">
            <div class="bg-surface w-full max-w-sm p-8 rounded-[32px] flex flex-col shadow-2xl scale-95 transition-transform duration-150 cursor-auto" id="confirm-pagar-sheet">
                <div class="w-16 h-16 rounded-full bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center mx-auto mb-4">
                    <span class="material-symbols-outlined text-[32px]">task_alt</span>
                </div>
                <h3 class="font-headline-md text-headline-md text-primary mb-2 text-center">A fatura realmente foi paga?</h3>
                <p class="font-body-sm text-body-sm text-secondary text-center mb-8">O valor será subtraído imediatamente do Saldo do Corrente e o limite do cartão será recalculado.</p>
                
                <div class="flex gap-4">
                    <button id="btn-cancel-pagar" class="flex-1 py-4 bg-surface-container-highest text-secondary rounded-xl font-bold active:scale-95 transition-transform">Voltar</button>
                    <button id="btn-confirm-pagar" class="flex-1 py-4 bg-primary-fixed text-on-primary-fixed-variant rounded-xl font-bold active:scale-95 transition-transform">Sim, pagar</button>
                </div>
            </div>
        </div>

        <!-- Confirmação Reverter Modal -->
        <div id="confirm-reverter-modal" class="hidden fixed inset-0 z-[80] bg-on-background/40 backdrop-blur-sm flex items-center justify-center transition-opacity px-4 cursor-pointer">
            <div class="bg-surface w-full max-w-sm p-8 rounded-[32px] flex flex-col shadow-2xl scale-95 transition-transform duration-150 cursor-auto" id="confirm-reverter-sheet">
                <div class="w-16 h-16 rounded-full bg-surface-container-highest text-secondary flex items-center justify-center mx-auto mb-4">
                    <span class="material-symbols-outlined text-[32px]">undo</span>
                </div>
                <h3 class="font-headline-md text-headline-md text-primary mb-2 text-center">Deseja reverter?</h3>
                <p class="font-body-sm text-body-sm text-secondary text-center mb-8">Isso devolverá o valor ao Saldo do Corrente e a fatura constará como pendente novamente.</p>
                
                <div class="flex gap-4">
                    <button id="btn-cancel-reverter" class="flex-1 py-4 bg-surface-container-highest text-secondary rounded-xl font-bold active:scale-95 transition-transform">Voltar</button>
                    <button id="btn-confirm-reverter" class="flex-1 py-4 bg-surface-container-highest text-on-surface-variant rounded-xl font-bold active:scale-95 transition-transform">Sim, reverter</button>
                </div>
            </div>
        </div>
    `;
};

// Event Delegation
document.addEventListener('click', (e) => {
    // Card Click -> Fatura
    const cartaoBtn = e.target.closest('.cartao-btn');
    if (cartaoBtn) {
        currentFaturaCartaoId = cartaoBtn.getAttribute('data-id');
        const hoje = new Date();
        currentFaturaAno = hoje.getFullYear();
        currentFaturaMes = hoje.getMonth();
        
        const cartao = store.corrente.cartoes.find(c => c.id === currentFaturaCartaoId);
        if (cartao && cartao.diaFechamento && hoje.getDate() >= cartao.diaFechamento) {
            currentFaturaMes += 1;
            if (currentFaturaMes > 11) {
                currentFaturaMes = 0;
                currentFaturaAno++;
            }
        }
        
        openFaturaModal();
    }

    // Month Timeline Click
    const btnMes = e.target.closest('.btn-fatura-mes');
    if (btnMes) {
        currentFaturaAno = parseInt(btnMes.getAttribute('data-ano'));
        currentFaturaMes = parseInt(btnMes.getAttribute('data-mes'));
        refreshFaturaItems();
        refreshFaturaTimeline();
    }

    // Close Fatura
    const closeFatura = e.target.closest('#close-fatura') || (e.target.id === 'fatura-modal');
    if (closeFatura) {
        closeModal('fatura-modal', 'fatura-sheet');
    }

    // Open Nova Compra (Adição)
    const btnNovaCompra = e.target.closest('#open-nova-compra');
    if (btnNovaCompra) {
        openNovaCompraModal();
    }

    // Pagar Fatura (Abre Modal de Confirmação)
    const btnPagarFatura = e.target.closest('#btn-pagar-fatura');
    if (btnPagarFatura) {
        pendingPagarVal = parseFloat(btnPagarFatura.getAttribute('data-val'));
        openConfirmPagarModal();
    }

    // Cancelar Pagamento Modal
    const btnCancelPagar = e.target.closest('#btn-cancel-pagar') || (e.target.id === 'confirm-pagar-modal');
    if (btnCancelPagar) {
        closeConfirmPagarModal();
    }

    // Confirmar Pagamento
    const btnConfirmPagar = e.target.closest('#btn-confirm-pagar');
    if (btnConfirmPagar) {
        if (pendingPagarVal !== null && currentFaturaCartaoId) {
            pagarFatura(currentFaturaCartaoId, currentFaturaAno, currentFaturaMes, pendingPagarVal);
            refreshFaturaItems();
            closeConfirmPagarModal();
        }
    }

    // Reverter Fatura (Abre Modal de Confirmação)
    const btnReverterFatura = e.target.closest('#btn-reverter-fatura');
    if (btnReverterFatura) {
        pendingReverterVal = parseFloat(btnReverterFatura.getAttribute('data-val'));
        openConfirmReverterModal();
    }

    // Cancelar Reverter Modal
    const btnCancelReverter = e.target.closest('#btn-cancel-reverter') || (e.target.id === 'confirm-reverter-modal');
    if (btnCancelReverter) {
        closeConfirmReverterModal();
    }

    // Confirmar Reverter
    const btnConfirmReverter = e.target.closest('#btn-confirm-reverter');
    if (btnConfirmReverter) {
        if (pendingReverterVal !== null && currentFaturaCartaoId) {
            desfazerPagamentoFatura(currentFaturaCartaoId, currentFaturaAno, currentFaturaMes, pendingReverterVal);
            refreshFaturaItems();
            closeConfirmReverterModal();
        }
    }

    // Open Editar Compra (Edição)
    const btnEditarCompra = e.target.closest('.btn-editar-compra');
    if (btnEditarCompra) {
        const cId = btnEditarCompra.getAttribute('data-id');
        const cartaoId = btnEditarCompra.getAttribute('data-cartao');
        const desc = btnEditarCompra.getAttribute('data-desc');
        const val = btnEditarCompra.getAttribute('data-val');
        const parc = btnEditarCompra.getAttribute('data-parc');
        const cat = btnEditarCompra.getAttribute('data-cat');
        const dt = btnEditarCompra.getAttribute('data-dt');
        openNovaCompraModal(true, cartaoId, cId, desc, val, parc, cat, dt);
    }

    // Excluir Compra (Abre a Modal de Confirmação)
    const btnExcluirCompra = e.target.closest('.btn-excluir-compra');
    if (btnExcluirCompra) {
        pendingDeleteId = btnExcluirCompra.getAttribute('data-id');
        pendingDeleteCartao = btnExcluirCompra.getAttribute('data-cartao');
        openConfirmDeleteModal();
    }

    // Cancelar Exclusão Modal
    const btnCancelDelete = e.target.closest('#btn-cancel-delete') || (e.target.id === 'confirm-delete-modal');
    if (btnCancelDelete) {
        closeConfirmDeleteModal();
    }

    // Confirmar Exclusão
    const btnConfirmDelete = e.target.closest('#btn-confirm-delete');
    if (btnConfirmDelete) {
        if (pendingDeleteId && pendingDeleteCartao) {
            excluirCompra(pendingDeleteCartao, pendingDeleteId);
            refreshFaturaItems();
            closeConfirmDeleteModal();
        }
    }

    // Close Nova Compra
    const closeNovaCompra = e.target.closest('#close-nova-compra') || (e.target.id === 'nova-compra-modal');
    if (closeNovaCompra) {
        closeModal('nova-compra-modal', 'nova-compra-sheet');
    }
});

// Input Handlers
document.addEventListener('input', (e) => {
    // Primeira letra maiúscula de cada palavra para descrição da compra
    if (e.target.id === 'compra-desc') {
        const start = e.target.selectionStart;
        const end = e.target.selectionEnd;
        e.target.value = e.target.value.toLowerCase().replace(/(?:^|\s)\S/g, m => m.toUpperCase());
        e.target.setSelectionRange(start, end);
    }
    // Máscara para Valor
    if (e.target.id === 'compra-valor') {
        let value = e.target.value.replace(/\D/g, "");
        if (value === "") {
            e.target.value = "";
            return;
        }
        const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
        e.target.value = formatter.format(parseInt(value, 10) / 100);
    }
    // Trava para Máximo de Parcelas (18x)
    if (e.target.id === 'compra-parcelas') {
        let max = parseInt(e.target.getAttribute('max')) || 18;
        if (parseInt(e.target.value) > max) {
            e.target.value = max;
        }
    }
});

// Submit Formulario
document.addEventListener('submit', (e) => {
    if (e.target.id === 'form-nova-compra') {
        e.preventDefault();
        const cartaoId = document.getElementById('nova-compra-cartao-id').value;
        const compraId = document.getElementById('nova-compra-id').value;
        const desc = document.getElementById('compra-desc').value;
        const cat = document.getElementById('compra-categoria').value;

        const rawValor = document.getElementById('compra-valor').value.replace(/\D/g, "");
        const valorNum = parseInt(rawValor, 10) / 100;

        const parcelas = document.getElementById('compra-parcelas').value;

        let dt = document.getElementById('compra-dt').value;

        if (!dt) {
            const cartao = store.corrente.cartoes.find(c => c.id === cartaoId);
            const hoje = new Date();
            let vigenteMes = hoje.getMonth();
            let vigenteAno = hoje.getFullYear();

            if (cartao && cartao.diaFechamento && hoje.getDate() >= cartao.diaFechamento) {
                vigenteMes++;
                if (vigenteMes > 11) {
                    vigenteMes = 0;
                    vigenteAno++;
                }
            }

            if (currentFaturaAno === vigenteAno && currentFaturaMes === vigenteMes) {
                // Compra na fatura que representa o dia atual, usa data e hora precisos.
                dt = hoje.toISOString();
            } else {
                // Compra manual inserida em fatura navegada pelo histórico/futuro.
                // Força o dia para antes do fechamento, evitando avanço automático na regra da store.
                let diaAlvo = cartao.diaFechamento ? cartao.diaFechamento - 1 : 10;
                if (diaAlvo < 1) diaAlvo = 1;
                dt = new Date(Date.UTC(currentFaturaAno, currentFaturaMes, diaAlvo, 12, 0, 0)).toISOString();
            }
        }

        if (compraId) {
            editarCompra(cartaoId, compraId, desc, valorNum, parcelas, cat, dt);
        } else {
            adicionarCompra(cartaoId, desc, valorNum, parcelas, cat, dt);
        }

        e.target.reset();
        closeModal('nova-compra-modal', 'nova-compra-sheet');

        refreshFaturaItems();
    }
});

const openFaturaModal = () => {
    document.body.classList.add('overflow-hidden');
    const modal = document.getElementById('fatura-modal');
    const sheet = document.getElementById('fatura-sheet');

    refreshFaturaTimeline();
    refreshFaturaItems();

    modal.classList.remove('hidden');
    void modal.offsetWidth;
    sheet.classList.remove('translate-y-full');
};

const refreshFaturaTimeline = () => {
    const timeline = document.getElementById('fatura-timeline');
    if (timeline) {
        timeline.innerHTML = generateMonthsTimeline(currentFaturaAno, currentFaturaMes, currentFaturaCartaoId);
        const activeBtn = timeline.querySelector('.bg-primary');
        if (activeBtn) {
            activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }
};

const refreshFaturaItems = () => {
    if (!currentFaturaCartaoId) return;
    const cartao = store.corrente.cartoes.find(c => c.id === currentFaturaCartaoId);
    if (!cartao) return;

    const { itens, total } = getFaturaMes(cartao, currentFaturaAno, currentFaturaMes);
    const pago = isFaturaPaga(cartao.id, currentFaturaAno, currentFaturaMes);

    document.getElementById('fatura-title').textContent = cartao.nome;
    document.getElementById('fatura-month-label').textContent = `Total de ${monthNames[currentFaturaMes]} ${currentFaturaAno}`;
    document.getElementById('fatura-total').textContent = formatarMoeda(total);
    document.getElementById('nova-compra-cartao-id').value = currentFaturaCartaoId;

    // Datas Fechamento/Vencimento baseadas na regra do Cartão
    const mesFechamento = (currentFaturaMes + cartao.avancoFechamento) % 12;
    const txtFechamento = `Fecha: ${cartao.diaFechamento.toString().padStart(2, '0')} ${monthNames[mesFechamento].substring(0, 3)}`;

    const mesVencimento = (currentFaturaMes + cartao.avancoVencimento) % 12;
    const txtVencimento = `Vence: ${cartao.diaVencimento.toString().padStart(2, '0')} ${monthNames[mesVencimento].substring(0, 3)}`;

    document.getElementById('fatura-fecha').textContent = txtFechamento;
    document.getElementById('fatura-vence').textContent = txtVencimento;

    // Se estiver pago, pintar Header de verde relaxante
    const headerBg = document.getElementById('fatura-header-bg');
    if (pago) {
        headerBg.classList.replace('bg-surface-container-lowest', 'bg-primary-fixed');
        document.getElementById('fatura-total').classList.replace('text-primary', 'text-on-primary-fixed-variant');
    } else {
        headerBg.classList.replace('bg-primary-fixed', 'bg-surface-container-lowest');
        document.getElementById('fatura-total').classList.replace('text-on-primary-fixed-variant', 'text-primary');
    }

    const itemsContainer = document.getElementById('fatura-items');
    if (itens.length === 0) {
        itemsContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16 px-6 opacity-60">
                <span class="material-symbols-outlined text-[48px] text-outline-variant mb-4 font-light">receipt_long</span>
                <p class="text-secondary font-body-lg text-center font-medium">Nenhuma compra neste mês.</p>
                <p class="text-on-surface-variant/60 font-body-sm text-center mt-1">O seu cartão está livre para usar.</p>
            </div>
        `;
    } else {
        itemsContainer.innerHTML = itens.map(item => `
            <div class="flex shrink-0 overflow-x-auto overscroll-x-contain snap-x snap-mandatory no-scrollbar w-full hide-scroll-bar rounded-2xl shadow-sm border border-outline-variant/5 bg-surface-container-lowest ${pago ? 'opacity-60 grayscale pointer-events-none' : ''}">
                <div class="snap-center shrink-0 w-full flex justify-between items-center py-4 px-5">
                    <div class="flex flex-col pointer-events-none">
                        <span class="font-body-lg text-primary font-medium tracking-tight">${item.descricao}</span>
                        <div class="flex items-center gap-2 mt-1">
                            <span class="font-label-caps text-on-surface-variant bg-surface px-2 py-0.5 rounded-md border border-outline-variant/10 text-[10px]">${item.categoria}</span>
                            <span class="font-label-caps text-secondary text-[10px] bg-surface-container-low px-2 py-0.5 rounded-md">${item.parcelaAtual} de ${item.totalParcelas}</span>
                        </div>
                    </div>
                    <span class="font-body-lg text-primary font-medium mr-4 pointer-events-none">${formatarMoeda(item.valorParcela)}</span>
                </div>
                <!-- Botoes que aparecem ao deslizar -->
                <div class="snap-center shrink-0 flex items-center gap-2 pr-5 pl-2">
                    <button class="btn-editar-compra w-10 h-10 rounded-full bg-surface text-secondary hover:bg-outline-variant/30 flex items-center justify-center transition-all active:scale-90" data-id="${item.id}" data-cartao="${currentFaturaCartaoId}" data-desc="${item.descricao}" data-val="${item.valorTotalOriginal}" data-parc="${item.totalParcelas}" data-cat="${item.categoria}" data-dt="${item.dataRaw}">
                        <span class="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                    <button class="btn-excluir-compra w-10 h-10 rounded-full bg-error-container text-error flex items-center justify-center transition-transform active:scale-90" data-id="${item.id}" data-cartao="${currentFaturaCartaoId}">
                        <span class="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Botoes do Footer
    let footerButtons = '';

    if (!pago) {
        footerButtons += `<button id="open-nova-compra" class="w-full py-4 bg-primary text-on-primary rounded-xl font-bold active:scale-95 transition-transform flex items-center justify-center gap-2 mb-2">
                            <span class="material-symbols-outlined">add</span> Adicionar Compra
                        </button>`;
    }

    if (total > 0) {
        if (pago) {
            footerButtons += `<button id="btn-reverter-fatura" data-val="${total}" class="w-full py-4 bg-surface-container-highest text-on-surface-variant rounded-xl font-bold active:scale-95 transition-transform flex items-center justify-center gap-2">
                                <span class="material-symbols-outlined">undo</span> Fatura Paga
                              </button>`;
        } else {
            footerButtons += `<button id="btn-pagar-fatura" data-val="${total}" class="w-full py-4 bg-primary-fixed text-on-primary-fixed-variant rounded-xl font-bold active:scale-95 transition-transform flex items-center justify-center gap-2">
                                <span class="material-symbols-outlined">payments</span> Pagar Fatura
                              </button>`;
        }
    }

    document.getElementById('fatura-footer').innerHTML = footerButtons;
};

const openNovaCompraModal = (isEdit = false, cartaoId = null, compraId = null, desc = '', val = 0, parc = 1, cat = '', dt = '') => {
    document.body.classList.add('overflow-hidden');
    const modal = document.getElementById('nova-compra-modal');
    const sheet = document.getElementById('nova-compra-sheet');

    document.getElementById('nova-compra-title').textContent = isEdit ? 'Editar Compra' : 'Nova Compra';
    document.getElementById('btn-salvar-compra').textContent = isEdit ? 'Atualizar' : 'Salvar Compra';

    document.getElementById('nova-compra-id').value = isEdit ? compraId : '';
    document.getElementById('compra-dt').value = isEdit ? dt : '';
    document.getElementById('compra-desc').value = isEdit ? desc : '';

    const inputValor = document.getElementById('compra-valor');
    if (isEdit) {
        const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
        inputValor.value = formatter.format(parseFloat(val));
    } else {
        inputValor.value = '';
    }

    document.getElementById('compra-parcelas').value = isEdit ? parc : 1;

    if (isEdit && cat) {
        document.getElementById('compra-categoria').value = cat;
    } else {
        document.getElementById('compra-categoria').value = CATEGORIAS_GLOBAIS[0];
    }

    modal.classList.remove('hidden');
    void modal.offsetWidth;
    sheet.classList.remove('translate-y-full');
};

const openConfirmDeleteModal = () => {
    const modal = document.getElementById('confirm-delete-modal');
    const sheet = document.getElementById('confirm-delete-sheet');
    modal.classList.remove('hidden');
    void modal.offsetWidth;
    sheet.classList.remove('scale-95');
    sheet.classList.add('scale-100');
};

const closeConfirmDeleteModal = () => {
    const modal = document.getElementById('confirm-delete-modal');
    const sheet = document.getElementById('confirm-delete-sheet');
    sheet.classList.remove('scale-100');
    sheet.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
        pendingDeleteId = null;
        pendingDeleteCartao = null;
    }, 300);
};

const openConfirmPagarModal = () => {
    const modal = document.getElementById('confirm-pagar-modal');
    const sheet = document.getElementById('confirm-pagar-sheet');
    modal.classList.remove('hidden');
    void modal.offsetWidth;
    sheet.classList.remove('scale-95');
    sheet.classList.add('scale-100');
};

const closeConfirmPagarModal = () => {
    const modal = document.getElementById('confirm-pagar-modal');
    const sheet = document.getElementById('confirm-pagar-sheet');
    sheet.classList.remove('scale-100');
    sheet.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
        pendingPagarVal = null;
    }, 300);
};

const openConfirmReverterModal = () => {
    const modal = document.getElementById('confirm-reverter-modal');
    const sheet = document.getElementById('confirm-reverter-sheet');
    modal.classList.remove('hidden');
    void modal.offsetWidth;
    sheet.classList.remove('scale-95');
    sheet.classList.add('scale-100');
};

const closeConfirmReverterModal = () => {
    const modal = document.getElementById('confirm-reverter-modal');
    const sheet = document.getElementById('confirm-reverter-sheet');
    sheet.classList.remove('scale-100');
    sheet.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
        pendingReverterVal = null;
    }, 300);
};

const closeModal = (modalId, sheetId) => {
    const modal = document.getElementById(modalId);
    const sheet = document.getElementById(sheetId);
    if (!modal) return;

    sheet.classList.add('translate-y-full');
    setTimeout(() => {
        modal.classList.add('hidden');
        if (modalId === 'fatura-modal' || document.getElementById('fatura-modal').classList.contains('hidden')) {
            document.body.classList.remove('overflow-hidden');
        }
    }, 300);
};

window.restoreFaturaModal = () => {
    if (currentFaturaCartaoId) {
        const modal = document.getElementById('fatura-modal');
        const sheet = document.getElementById('fatura-sheet');
        if (modal && sheet) {
            refreshFaturaTimeline();
            refreshFaturaItems();
            modal.classList.remove('hidden', 'transition-opacity');
            sheet.classList.remove('translate-y-full', 'transition-transform');
            document.body.classList.add('overflow-hidden');
        }
    }
}
