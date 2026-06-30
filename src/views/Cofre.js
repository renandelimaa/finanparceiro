import { store, getTotalCofre, adicionarMeta, editarMeta, excluirMeta, TIPOS_LIQUIDEZ, adicionarAporte, excluirAporte } from '../store.js';
import { formatarMoeda } from '../utils.js';
import { logout } from '../auth.js';

let pendingDeleteMetaId = null;
let currentMetaIdForAporte = null;
let currentMetaIdForDetails = null;

const liquidezSelectHTML = TIPOS_LIQUIDEZ.map(t => `<option value="${t}">${t}</option>`).join('');

const formatarDataInput = (dataString) => {
    const d = new Date(dataString);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

export const Cofre = () => {
    const totalCofre = getTotalCofre();

    let metasHTML = '';
    if (!store.metas || store.metas.length === 0) {
        metasHTML = `
            <div class="flex flex-col items-center justify-center text-center py-12 px-6">
                <div class="w-20 h-20 bg-surface-container rounded-full flex items-center justify-center mb-4">
                    <span class="material-symbols-outlined text-[40px] text-on-surface-variant">savings</span>
                </div>
                <h3 class="font-headline-md text-headline-md text-primary mb-2">Seu cofre está vazio</h3>
                <p class="font-body-sm text-body-sm text-secondary">Adicione sua reserva de emergência ou seu primeiro objetivo para começar a construir o seu futuro.</p>
            </div>
        `;
    } else {
        metasHTML = store.metas.map(meta => {
            const hasTarget = meta.valorTotal && meta.valorTotal > 0;
            const valorAportes = (meta.aportes || []).reduce((sum, a) => sum + parseFloat(a.valor), 0);
            const valorAtual = valorAportes + (meta.rendimentoAcumulado || 0);

            let percent = 0;
            if (hasTarget) {
                percent = Math.min((valorAtual / meta.valorTotal) * 100, 100);
            }

            return `
                <div class="w-full bg-surface/60 backdrop-blur-xl border border-outline-variant/20 rounded-xl shadow-sm overflow-hidden">
                    <div class="flex overflow-x-auto overscroll-x-contain snap-x snap-mandatory no-scrollbar w-full hide-scroll-bar">
                        <div class="snap-center shrink-0 w-full p-5 flex flex-col gap-4 relative group cursor-pointer btn-ver-detalhes" data-id="${meta.id}">
                            <div class="flex justify-between items-start pointer-events-none">
                                <div class="flex flex-col">
                                    <span class="font-label-caps text-label-caps text-on-surface-variant mb-1">${meta.tipoLiquidez}</span>
                                    <span class="font-headline-sm text-headline-sm text-primary leading-tight">${meta.nome}</span>
                                </div>
                                ${meta.tipoRendimento && meta.tipoRendimento !== 'MANUAL' ? `
                                    <div class="px-2 py-1 bg-primary-fixed rounded text-on-primary-fixed-variant font-label-caps text-[10px] flex items-center gap-1">
                                        <span class="material-symbols-outlined text-[12px]">trending_up</span> ${meta.tipoRendimento}
                                    </div>
                                ` : ''}
                            </div>
                            
                            <div class="flex items-end justify-between mt-2 pointer-events-none">
                                <div class="flex flex-col">
                                    <span class="font-label-caps text-label-caps text-secondary mb-1">Saldo Acumulado</span>
                                    <span class="font-body-lg text-primary font-bold">${formatarMoeda(valorAtual)}</span>
                                </div>
                                ${hasTarget ? `
                                    <div class="flex flex-col items-end">
                                        <span class="font-label-caps text-label-caps text-secondary mb-1">Meta</span>
                                        <span class="font-body-sm text-secondary">${formatarMoeda(meta.valorTotal)}</span>
                                    </div>
                                ` : ''}
                            </div>

                            ${hasTarget ? `
                                <div class="w-full h-1 bg-secondary-container rounded-none overflow-hidden mt-2 pointer-events-none">
                                    <div class="h-full bg-tertiary-fixed-dim transition-all duration-1000 ease-out" style="width: ${percent}%"></div>
                                </div>
                                <span class="font-label-caps text-[10px] text-secondary text-right mt-1 pointer-events-none">${percent.toFixed(1)}% concluído</span>
                            ` : ''}
                        </div>
                        <div class="snap-center shrink-0 flex items-center gap-2 pl-4 pr-4 border-l border-outline-variant/20 bg-surface-variant/20">
                            <button class="w-12 h-12 rounded-full bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center transition-all active:scale-90 btn-adicionar-aporte shadow-sm" data-id="${meta.id}">
                                <span class="material-symbols-outlined text-[24px]">add</span>
                            </button>
                            <button class="w-12 h-12 rounded-full bg-surface-container-highest text-secondary hover:bg-outline-variant/30 flex items-center justify-center transition-all active:scale-90 btn-editar-meta shadow-sm" data-id="${meta.id}">
                                <span class="material-symbols-outlined text-[24px]">edit</span>
                            </button>
                            <button class="w-12 h-12 rounded-full bg-error-container text-error flex items-center justify-center transition-transform active:scale-90 btn-excluir-meta shadow-sm" data-id="${meta.id}">
                                <span class="material-symbols-outlined text-[24px]">delete</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    return `
        <main class="pt-stack-md px-container-padding-mobile flex flex-col gap-stack-md relative pb-24">
            
            <section class="flex flex-col items-start gap-stack-sm animate-[fadeIn_0.5s_ease-out]">
                <h1 class="font-display-balance-mobile text-display-balance-mobile text-primary tracking-tight">${formatarMoeda(totalCofre)}</h1>
                <p class="font-body-sm text-body-sm text-on-surface-variant/80">Total Guardado</p>
            </section>

            <section class="flex flex-col gap-gutter w-full">
                <div class="flex items-center justify-between">
                    <h2 class="font-headline-md text-headline-md text-primary">Reservas e Investimentos</h2>
                </div>
                <div class="flex flex-col gap-4 animate-[fadeIn_0.5s_ease-out]">
                    ${metasHTML}
                </div>
            </section>

        </main>

        <!-- Floating Action Button -->
        <button id="open-nova-meta" class="fixed bottom-[100px] right-6 w-14 h-14 bg-primary text-on-primary rounded-2xl shadow-lg flex items-center justify-center hover:shadow-xl active:scale-95 transition-all z-40">
            <span class="material-symbols-outlined text-[24px]">add</span>
        </button>

        <div id="nova-meta-modal" class="hidden fixed inset-0 z-[70] bg-on-background/40 backdrop-blur-sm flex items-end justify-center transition-opacity cursor-pointer">
            <div class="bg-surface/90 backdrop-blur-3xl w-full max-w-md p-6 rounded-t-3xl flex flex-col shadow-2xl translate-y-full transition-transform duration-150 cursor-auto max-h-[90vh] overflow-y-auto" id="nova-meta-sheet">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="font-headline-md text-headline-md text-primary" id="nova-meta-title">Novo Investimento</h2>
                    <button id="close-nova-meta" class="text-on-surface-variant hover:text-primary transition-colors bg-surface-container-highest w-8 h-8 rounded-full flex items-center justify-center"><span class="material-symbols-outlined text-[18px]">close</span></button>
                </div>
                <form id="form-nova-meta" class="flex flex-col gap-5">
                    <input type="hidden" id="meta-id" value="">
                    
                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-caps text-label-caps text-secondary pl-1">Nome / Objetivo</label>
                        <input type="text" id="meta-nome" style="text-transform: capitalize;" required class="w-full h-12 px-4 rounded-xl border border-outline-variant/30 bg-surface focus:border-primary focus:outline-none text-primary font-body-lg placeholder:text-on-surface-variant/40" placeholder="Ex: Reserva Nubank">
                    </div>
                    
                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-caps text-label-caps text-secondary pl-1">Liquidez (Perfil)</label>
                        <div class="relative">
                            <select id="meta-liquidez" required class="w-full h-12 px-4 rounded-xl border border-outline-variant/30 bg-surface focus:border-primary focus:outline-none text-primary font-body-lg appearance-none">
                                ${liquidezSelectHTML}
                            </select>
                            <span class="material-symbols-outlined absolute right-3 top-3 text-secondary pointer-events-none">expand_more</span>
                        </div>
                    </div>

                    <div class="flex gap-4">
                        <div class="flex flex-col gap-1.5 flex-1">
                            <label class="font-label-caps text-label-caps text-secondary pl-1">Regra de Rendimento</label>
                            <div class="relative">
                                <select id="meta-tipo-rendimento" required class="w-full h-12 px-4 rounded-xl border border-outline-variant/30 bg-surface focus:border-primary focus:outline-none text-primary font-body-sm appearance-none">
                                    <option value="MANUAL">Manual (Sem Juros)</option>
                                    <option value="CDI">Atrelado ao CDI</option>
                                    <option value="FIXO">Taxa Fixa Mensal</option>
                                </select>
                                <span class="material-symbols-outlined absolute right-3 top-3 text-secondary pointer-events-none text-[18px]">expand_more</span>
                            </div>
                        </div>

                        <div id="container-taxa" class="hidden flex-col gap-1.5 w-[110px]">
                            <label class="font-label-caps text-label-caps text-secondary pl-1" id="label-taxa">Taxa (%)</label>
                            <input type="text" inputmode="numeric" id="meta-taxa-rendimento" class="w-full h-12 px-4 rounded-xl border border-outline-variant/30 bg-surface focus:border-primary focus:outline-none text-primary font-body-lg" placeholder="Ex: 115">
                        </div>
                    </div>

                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-caps text-label-caps text-secondary pl-1">Meta Final (Opcional)</label>
                        <input type="text" inputmode="numeric" id="meta-valor-total" class="w-full h-14 px-4 rounded-xl border border-outline-variant/30 bg-surface focus:border-primary focus:outline-none text-primary font-headline-sm" placeholder="R$ 0,00">
                    </div>

                    <button type="submit" class="w-full h-14 mt-4 bg-primary text-on-primary rounded-xl font-bold active:scale-95 transition-transform" id="btn-salvar-meta">
                        Salvar Investimento
                    </button>
                </form>
            </div>
        </div>

        <div id="novo-aporte-modal" class="hidden fixed inset-0 z-[70] bg-on-background/40 backdrop-blur-sm flex items-end justify-center transition-opacity cursor-pointer">
            <div class="bg-surface/90 backdrop-blur-3xl w-full max-w-md p-6 rounded-t-3xl flex flex-col shadow-2xl translate-y-full transition-transform duration-150 cursor-auto" id="novo-aporte-sheet">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="font-headline-md text-headline-md text-primary">Adicionar Valor</h2>
                    <button id="close-novo-aporte" class="text-on-surface-variant hover:text-primary transition-colors bg-surface-container-highest w-8 h-8 rounded-full flex items-center justify-center"><span class="material-symbols-outlined text-[18px]">close</span></button>
                </div>
                <form id="form-novo-aporte" class="flex flex-col gap-5">
                    
                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-caps text-label-caps text-secondary pl-1">Nome da Inclusão</label>
                        <input type="text" id="aporte-desc" style="text-transform: capitalize;" required class="w-full h-12 px-4 rounded-xl border border-outline-variant/30 bg-surface focus:border-primary focus:outline-none text-primary font-body-lg placeholder:text-on-surface-variant/40" placeholder="Ex: Parte Renan, Depósito Mensal">
                    </div>
                    
                    <div class="flex gap-4">
                        <div class="flex flex-col gap-1.5 w-1/2">
                            <label class="font-label-caps text-label-caps text-secondary pl-1">Data</label>
                            <input type="date" id="aporte-data" required class="w-full h-14 px-4 rounded-xl border border-outline-variant/30 bg-surface focus:border-primary focus:outline-none text-primary font-body-lg">
                        </div>
                        <div class="flex flex-col gap-1.5 w-1/2">
                            <label class="font-label-caps text-label-caps text-secondary pl-1">Valor (R$)</label>
                            <input type="text" inputmode="numeric" id="aporte-valor" required class="w-full h-14 px-4 rounded-xl border border-outline-variant/30 bg-surface focus:border-primary focus:outline-none text-primary font-headline-sm" placeholder="R$ 0,00">
                        </div>
                    </div>

                    <button type="submit" class="w-full h-14 mt-4 bg-primary-fixed text-on-primary-fixed-variant rounded-xl font-bold active:scale-95 transition-transform" id="btn-salvar-aporte">
                        Adicionar Valor
                    </button>
                </form>
            </div>
        </div>

        <div id="detalhes-meta-modal" class="hidden fixed inset-0 z-[60] bg-on-background/40 backdrop-blur-sm flex items-end justify-center transition-opacity cursor-pointer">
            <div class="bg-surface/90 backdrop-blur-3xl w-full max-w-md h-[85vh] rounded-t-3xl flex flex-col shadow-2xl translate-y-full transition-transform duration-150 cursor-auto" id="detalhes-meta-sheet">
                <div class="flex justify-between items-center p-6 pb-4">
                    <div class="flex flex-col">
                        <span class="font-label-caps text-label-caps text-secondary mb-1">Visão Geral</span>
                        <h2 class="font-headline-md text-headline-md text-primary" id="detalhes-meta-title">Nome</h2>
                    </div>
                    <button id="close-detalhes-meta" class="text-on-surface-variant hover:text-primary transition-colors bg-surface-container-highest w-8 h-8 rounded-full flex items-center justify-center"><span class="material-symbols-outlined text-[18px]">close</span></button>
                </div>
                
                <div class="px-6 py-6 flex flex-col items-center bg-surface-container-lowest border-b border-outline-variant/10 gap-3">
                    <div class="text-center mb-2">
                        <span class="text-[36px] font-bold text-primary tracking-tight leading-none" id="detalhes-meta-total">R$ 0,00</span>
                        <p class="font-label-caps text-label-caps text-secondary mt-2">Saldo Atual</p>
                    </div>
                    
                    <div class="flex gap-3 w-full justify-center">
                        <div class="flex flex-col items-center justify-center p-3 bg-surface border border-outline-variant/20 rounded-xl w-1/2">
                            <span class="font-label-caps text-[10px] text-secondary mb-1">Aportes Feitos</span>
                            <span class="font-body-lg text-primary font-medium" id="detalhes-meta-aportes">R$ 0,00</span>
                        </div>
                        <div class="flex flex-col items-center justify-center p-3 bg-primary-fixed border border-primary-fixed-dim rounded-xl w-1/2">
                            <span class="font-label-caps text-[10px] text-on-primary-fixed-variant mb-1">Rendimento Automático</span>
                            <span class="font-body-lg text-on-primary-fixed-variant font-bold" id="detalhes-meta-rendimento">+ R$ 0,00</span>
                        </div>
                    </div>
                </div>

                <div class="px-6 py-3 bg-surface-container-lowest">
                    <span class="font-label-caps text-label-caps text-secondary">Histórico de Movimentações</span>
                </div>

                <div class="flex-1 overflow-y-auto p-0 flex flex-col divide-y divide-outline-variant/10" id="detalhes-meta-historico">
                    </div>
            </div>
        </div>

        <div id="confirm-delete-meta-modal" class="hidden fixed inset-0 z-[80] bg-on-background/40 backdrop-blur-sm flex items-center justify-center transition-opacity px-4 cursor-pointer">
            <div class="bg-surface/90 backdrop-blur-3xl w-full max-w-sm p-8 rounded-[32px] flex flex-col shadow-2xl scale-95 transition-transform duration-150 cursor-auto" id="confirm-delete-meta-sheet">
                <div class="w-16 h-16 rounded-full bg-error-container text-error flex items-center justify-center mx-auto mb-4">
                    <span class="material-symbols-outlined text-[32px]">delete_forever</span>
                </div>
                <h3 class="font-headline-md text-headline-md text-primary mb-2 text-center">Excluir investimento?</h3>
                <p class="font-body-sm text-body-sm text-secondary text-center mb-8">Essa ação não pode ser desfeita. Todo o histórico será apagado e deixará de somar no seu Cofre.</p>
                
                <div class="flex gap-4">
                    <button id="btn-cancel-delete-meta" class="flex-1 py-4 bg-surface-container-highest text-secondary rounded-xl font-bold active:scale-95 transition-transform">Voltar</button>
                    <button id="btn-confirm-delete-meta" class="flex-1 py-4 bg-error-container text-error rounded-xl font-bold active:scale-95 transition-transform">Excluir</button>
                </div>
            </div>
        </div>
    `;
};

// Listeners
document.addEventListener('click', (e) => {
    // Modal Nova Meta
    const btnNovaMeta = e.target.closest('#open-nova-meta');
    if (btnNovaMeta) {
        openNovaMetaModal();
    }

    const closeNovaMeta = e.target.closest('#close-nova-meta') || (e.target.id === 'nova-meta-modal');
    if (closeNovaMeta) {
        closeModal('nova-meta-modal', 'nova-meta-sheet');
    }

    // Editar Meta (Arrastou pra esquerda e clicou lápis)
    const btnEditarMeta = e.target.closest('.btn-editar-meta');
    if (btnEditarMeta) {
        const id = btnEditarMeta.getAttribute('data-id');
        const meta = store.metas.find(m => m.id === id);
        if (meta) {
            openNovaMetaModal(true, meta);
        }
    }

    // Novo Aporte (Arrastou pra esquerda e clicou +)
    const btnAdicionarAporte = e.target.closest('.btn-adicionar-aporte');
    if (btnAdicionarAporte) {
        currentMetaIdForAporte = btnAdicionarAporte.getAttribute('data-id');
        openNovoAporteModal();
    }

    const closeNovoAporte = e.target.closest('#close-novo-aporte') || (e.target.id === 'novo-aporte-modal');
    if (closeNovoAporte) {
        closeModal('novo-aporte-modal', 'novo-aporte-sheet');
    }

    // Ver Detalhes / Historico
    const btnVerDetalhes = e.target.closest('.btn-ver-detalhes');
    if (btnVerDetalhes) {
        currentMetaIdForDetails = btnVerDetalhes.getAttribute('data-id');
        openDetalhesMetaModal(currentMetaIdForDetails);
    }

    const closeDetalhesMeta = e.target.closest('#close-detalhes-meta') || (e.target.id === 'detalhes-meta-modal');
    if (closeDetalhesMeta) {
        closeModal('detalhes-meta-modal', 'detalhes-meta-sheet');
    }

    // Excluir Aporte
    const btnExcluirAporte = e.target.closest('.btn-excluir-aporte');
    if (btnExcluirAporte) {
        const metaId = btnExcluirAporte.getAttribute('data-meta');
        const aporteId = btnExcluirAporte.getAttribute('data-aporte');
        excluirAporte(metaId, aporteId);
        openDetalhesMetaModal(metaId); // Refresh modal inline
    }

    // Excluir Meta (Arrastou pra esquerda e clicou lixeira)
    const btnExcluirMeta = e.target.closest('.btn-excluir-meta');
    if (btnExcluirMeta) {
        pendingDeleteMetaId = btnExcluirMeta.getAttribute('data-id');
        openConfirmDeleteMetaModal();
    }

    const btnCancelDeleteMeta = e.target.closest('#btn-cancel-delete-meta') || (e.target.id === 'confirm-delete-meta-modal');
    if (btnCancelDeleteMeta) {
        closeConfirmDeleteMetaModal();
    }

    const btnConfirmDeleteMeta = e.target.closest('#btn-confirm-delete-meta');
    if (btnConfirmDeleteMeta) {
        if (pendingDeleteMetaId) {
            excluirMeta(pendingDeleteMetaId);
            closeConfirmDeleteMetaModal();
        }
    }
});

// Listener Dinâmico para o Select de Rendimentos
document.addEventListener('change', (e) => {
    if (e.target.id === 'meta-tipo-rendimento') {
        const tipo = e.target.value;
        const containerTaxa = document.getElementById('container-taxa');
        const labelTaxa = document.getElementById('label-taxa');
        const inputTaxa = document.getElementById('meta-taxa-rendimento');

        if (tipo === 'CDI') {
            containerTaxa.classList.remove('hidden');
            containerTaxa.classList.add('flex');
            labelTaxa.textContent = '% do CDI';
            inputTaxa.placeholder = 'Ex: 115';
        } else if (tipo === 'FIXO') {
            containerTaxa.classList.remove('hidden');
            containerTaxa.classList.add('flex');
            labelTaxa.textContent = 'Taxa Mensal (%)';
            inputTaxa.placeholder = 'Ex: 0.8';
        } else {
            containerTaxa.classList.add('hidden');
            containerTaxa.classList.remove('flex');
            inputTaxa.value = '';
        }
    }
});

document.addEventListener('input', (e) => {
    // Primeira letra maiúscula de cada palavra para Nome/Objetivo da Meta e Descrição do Aporte
    if (e.target.id === 'meta-nome' || e.target.id === 'aporte-desc') {
        const start = e.target.selectionStart;
        const end = e.target.selectionEnd;
        e.target.value = e.target.value.toLowerCase().replace(/(?:^|\s)\S/g, m => m.toUpperCase());
        e.target.setSelectionRange(start, end);
    }

    if (e.target.id === 'meta-valor-total' || e.target.id === 'aporte-valor') {
        let value = e.target.value.replace(/\D/g, "");
        if (value === "") {
            e.target.value = "";
            return;
        }
        const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
        e.target.value = formatter.format(parseInt(value, 10) / 100);
    }

    // Mascara para o campo de porcentagem aceitar numeros e ponto/virgula
    if (e.target.id === 'meta-taxa-rendimento') {
        e.target.value = e.target.value.replace(/[^0-9.,]/g, '');
    }
});

document.addEventListener('submit', (e) => {
    // Salvar Investimento (Nome/Meta + Rendimento)
    if (e.target.id === 'form-nova-meta') {
        e.preventDefault();
        const metaId = document.getElementById('meta-id').value;
        const nome = document.getElementById('meta-nome').value;
        const liquidez = document.getElementById('meta-liquidez').value;
        const rawTotal = document.getElementById('meta-valor-total').value.replace(/\D/g, "");
        const valorTotal = rawTotal ? (parseInt(rawTotal, 10) / 100) : null;

        const tipoRendimento = document.getElementById('meta-tipo-rendimento').value;
        let taxaRendimento = parseFloat(document.getElementById('meta-taxa-rendimento').value.replace(',', '.')) || 0;

        if (metaId) {
            // Presume-se que a função no store.js suporte a atualização (nome, valorTotal, liquidez, tipoRendimento, taxaRendimento)
            editarMeta(metaId, nome, valorTotal, liquidez, tipoRendimento, taxaRendimento);
        } else {
            adicionarMeta(nome, valorTotal, liquidez, tipoRendimento, taxaRendimento);
        }

        e.target.reset();
        document.getElementById('container-taxa').classList.add('hidden'); // reseta visibilidade
        closeModal('nova-meta-modal', 'nova-meta-sheet');
    }

    // Salvar Novo Aporte
    if (e.target.id === 'form-novo-aporte') {
        e.preventDefault();
        const desc = document.getElementById('aporte-desc').value;
        const dataStr = document.getElementById('aporte-data').value;

        const rawValor = document.getElementById('aporte-valor').value.replace(/\D/g, "");
        const valorNum = parseInt(rawValor, 10) / 100;

        if (currentMetaIdForAporte) {
            const isodate = new Date(dataStr + 'T12:00:00').toISOString();
            adicionarAporte(currentMetaIdForAporte, desc, valorNum, isodate);
        }

        e.target.reset();
        closeModal('novo-aporte-modal', 'novo-aporte-sheet');
    }
});

// Funções de Modal
const openNovaMetaModal = (isEdit = false, meta = null) => {
    document.body.classList.add('overflow-hidden');
    const modal = document.getElementById('nova-meta-modal');
    const sheet = document.getElementById('nova-meta-sheet');

    document.getElementById('nova-meta-title').textContent = isEdit ? 'Editar Investimento' : 'Novo Investimento';
    document.getElementById('btn-salvar-meta').textContent = isEdit ? 'Atualizar' : 'Salvar Investimento';

    document.getElementById('meta-id').value = isEdit ? meta.id : '';
    document.getElementById('meta-nome').value = isEdit ? meta.nome : '';
    document.getElementById('meta-liquidez').value = isEdit ? meta.tipoLiquidez : TIPOS_LIQUIDEZ[0];

    const inputTotal = document.getElementById('meta-valor-total');
    const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
    inputTotal.value = (isEdit && meta.valorTotal) ? formatter.format(meta.valorTotal) : '';

    // Popula campos de rendimento na edição
    const selectTipoRendimento = document.getElementById('meta-tipo-rendimento');
    const inputTaxa = document.getElementById('meta-taxa-rendimento');
    const containerTaxa = document.getElementById('container-taxa');
    const labelTaxa = document.getElementById('label-taxa');

    if (isEdit && meta.tipoRendimento) {
        selectTipoRendimento.value = meta.tipoRendimento;
        if (meta.tipoRendimento !== 'MANUAL') {
            containerTaxa.classList.remove('hidden');
            containerTaxa.classList.add('flex');
            labelTaxa.textContent = meta.tipoRendimento === 'CDI' ? '% do CDI' : 'Taxa Mensal (%)';
            inputTaxa.value = meta.taxaRendimento || '';
        } else {
            containerTaxa.classList.add('hidden');
            containerTaxa.classList.remove('flex');
            inputTaxa.value = '';
        }
    } else {
        selectTipoRendimento.value = 'MANUAL';
        containerTaxa.classList.add('hidden');
        containerTaxa.classList.remove('flex');
        inputTaxa.value = '';
    }

    modal.classList.remove('hidden');
    void modal.offsetWidth;
    sheet.classList.remove('translate-y-full');
};

const openNovoAporteModal = () => {
    document.body.classList.add('overflow-hidden');
    const modal = document.getElementById('novo-aporte-modal');
    const sheet = document.getElementById('novo-aporte-sheet');

    const hoje = new Date();
    const dataStr = `${hoje.getFullYear()}-${(hoje.getMonth() + 1).toString().padStart(2, '0')}-${hoje.getDate().toString().padStart(2, '0')}`;
    document.getElementById('aporte-data').value = dataStr;
    document.getElementById('aporte-valor').value = '';
    document.getElementById('aporte-desc').value = '';

    modal.classList.remove('hidden');
    void modal.offsetWidth;
    sheet.classList.remove('translate-y-full');
};

const openDetalhesMetaModal = (metaId) => {
    const meta = store.metas.find(m => m.id === metaId);
    if (!meta) return;

    document.body.classList.add('overflow-hidden');
    const modal = document.getElementById('detalhes-meta-modal');
    const sheet = document.getElementById('detalhes-meta-sheet');

    const sumAportes = (meta.aportes || []).reduce((s, a) => s + parseFloat(a.valor), 0);
    const rendimentos = meta.rendimentoAcumulado || 0;
    const saldoTotal = sumAportes + rendimentos;

    // Calculo do rendimento diario
    let rendimentoDiarioText = '';
    if (meta.tipoRendimento && meta.tipoRendimento !== 'MANUAL' && saldoTotal > 0) {
        if (meta.tipoRendimento === 'CDI') {
            const taxaCDI = store.configuracoes?.taxaCDIAnual || 10.40;
            const fatorCDI = Math.pow(1 + (taxaCDI / 100), 1 / 252) - 1;
            const fatorFinal = fatorCDI * (meta.taxaRendimento / 100);
            const valDiario = saldoTotal * fatorFinal;
            rendimentoDiarioText = `Renderá ~${formatarMoeda(valDiario)} amanhã`;
        } else if (meta.tipoRendimento === 'FIXO') {
            const fatorFixo = Math.pow(1 + (meta.taxaRendimento / 100), 1 / 30) - 1;
            const valDiario = saldoTotal * fatorFixo;
            rendimentoDiarioText = `Renderá ~${formatarMoeda(valDiario)} amanhã`;
        }
    }

    document.getElementById('detalhes-meta-title').textContent = meta.nome;

    // Injeta os valores na nova interface separada
    document.getElementById('detalhes-meta-total').textContent = formatarMoeda(saldoTotal);
    document.getElementById('detalhes-meta-aportes').textContent = formatarMoeda(sumAportes);
    
    // Altera o innerHTML do rendimento para englobar a tag extra de previsao diaria
    document.getElementById('detalhes-meta-rendimento').parentNode.innerHTML = `
        <span class="font-label-caps text-[10px] text-on-primary-fixed-variant mb-1">Rendimento Automático</span>
        <span class="font-body-lg text-on-primary-fixed-variant font-bold" id="detalhes-meta-rendimento">+ ${formatarMoeda(rendimentos)}</span>
        ${rendimentoDiarioText ? `<span class="font-label-caps text-[9px] text-on-primary-fixed-variant/70 mt-1 text-center leading-tight tracking-tight">${rendimentoDiarioText}</span>` : ''}
    `;

    const historicoContainer = document.getElementById('detalhes-meta-historico');
    if (!meta.aportes || meta.aportes.length === 0) {
        historicoContainer.innerHTML = `<p class="text-secondary text-center py-6">Nenhum valor adicionado ainda.</p>`;
    } else {
        const sortedAportes = [...meta.aportes].sort((a, b) => {
            const diff = new Date(b.data) - new Date(a.data);
            if (diff !== 0) return diff;
            const tsA = parseInt((a.id.match(/\d{13}/) || [0])[0]);
            const tsB = parseInt((b.id.match(/\d{13}/) || [0])[0]);
            return tsB - tsA;
        });

        historicoContainer.innerHTML = sortedAportes.map(aporte => `
            <div class="flex items-center justify-between py-4 px-6 bg-surface">
                <div class="flex flex-col">
                    <span class="font-body-lg text-primary">${aporte.descricao}</span>
                    <span class="font-label-caps text-secondary text-[11px]">${formatarDataInput(aporte.data)}</span>
                </div>
                <div class="flex items-center gap-4">
                    <span class="font-body-lg text-primary font-bold">${formatarMoeda(aporte.valor)}</span>
                    <button class="w-8 h-8 rounded-full bg-surface-container-highest text-secondary hover:bg-error-container hover:text-error flex items-center justify-center transition-all btn-excluir-aporte" data-meta="${meta.id}" data-aporte="${aporte.id}">
                        <span class="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                </div>
            </div>
        `).join('');
    }

    modal.classList.remove('hidden');
    void modal.offsetWidth;
    sheet.classList.remove('translate-y-full');
};

const openConfirmDeleteMetaModal = () => {
    const modal = document.getElementById('confirm-delete-meta-modal');
    const sheet = document.getElementById('confirm-delete-meta-sheet');
    modal.classList.remove('hidden');
    void modal.offsetWidth;
    sheet.classList.remove('scale-95');
    sheet.classList.add('scale-100');
};

const closeConfirmDeleteMetaModal = () => {
    const modal = document.getElementById('confirm-delete-meta-modal');
    const sheet = document.getElementById('confirm-delete-meta-sheet');
    sheet.classList.remove('scale-100');
    sheet.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
        pendingDeleteMetaId = null;
    }, 300);
};

const closeModal = (modalId, sheetId) => {
    const modal = document.getElementById(modalId);
    const sheet = document.getElementById(sheetId);
    if (!modal) return;

    sheet.classList.add('translate-y-full');
    setTimeout(() => {
        modal.classList.add('hidden');

        const isOutraModalAberta = !document.getElementById('detalhes-meta-modal').classList.contains('hidden');
        if (!isOutraModalAberta) {
            document.body.classList.remove('overflow-hidden');
        }
    }, 300);
};

window.restoreCofreModal = () => {
    if (currentMetaIdForDetails) {
        const modal = document.getElementById('detalhes-meta-modal');
        const sheet = document.getElementById('detalhes-meta-sheet');
        if (modal && sheet && !modal.classList.contains('hidden')) {
            openDetalhesMetaModal(currentMetaIdForDetails);
        }
    }
}
