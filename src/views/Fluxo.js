import { store, CATEGORIAS_GLOBAIS, MAPA_ICONES, adicionarTransacaoFluxo, editarTransacaoFluxo, excluirTransacaoFluxo } from '../store.js';
import { formatarMoeda } from '../utils.js';

const monthNames = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

export const Fluxo = () => {
    // Ordenar transacoes descrescente (mais novas primeiro) limitando aos últimos 10 itens
    const sortedTx = [...(store.transacoes || [])]
        .filter(tx => tx && tx.fonteId === 'corrente')
        .sort((a, b) => {
            const diff = new Date(b.data) - new Date(a.data);
            if (diff !== 0) return diff;
            const tsA = parseInt((a.id.match(/\d{13}/) || [0])[0]);
            const tsB = parseInt((b.id.match(/\d{13}/) || [0])[0]);
            return tsB - tsA;
        })
        .slice(0, 10);

    const groupTransactionsByDate = (transactions) => {
        const groups = {};
        const hojeStr = new Date().toDateString();

        const ontem = new Date();
        ontem.setDate(ontem.getDate() - 1);
        const ontemStr = ontem.toDateString();

        transactions.forEach(tx => {
            const d = new Date(tx.data);
            const dStr = d.toDateString();

            let label = '';
            if (dStr === hojeStr) label = 'HOJE';
            else if (dStr === ontemStr) label = 'ONTEM';
            else {
                const day = String(d.getDate()).padStart(2, '0');
                label = `${day} ${monthNames[d.getMonth()]}`;
            }

            if (!groups[label]) groups[label] = [];
            groups[label].push(tx);
        });

        return groups;
    };

    const grouped = groupTransactionsByDate(sortedTx);

    const renderTransactions = (transactions) => {
        if (!transactions || transactions.length === 0) return `<p class="text-secondary font-body-sm px-2">Nenhuma transação.</p>`;
        return transactions.map(tx => {
            const valorFormatado = formatarMoeda(Math.abs(tx.valor));
            const isSaida = tx.tipo === 'SAIDA';
            const signal = isSaida ? '- ' : '+ ';

            const icone = MAPA_ICONES[tx.categoria] || 'category';

            let fonteLabel = tx.fonteId === 'corrente' ? 'Corrente' : 'Cartão';

            const dataObj = new Date(tx.data);
            const dataFormatada = `${String(dataObj.getDate()).padStart(2, '0')}/${String(dataObj.getMonth() + 1).padStart(2, '0')}/${dataObj.getFullYear()}`;
            const searchData = `${tx.titulo} ${tx.categoria} ${valorFormatado}`.toLowerCase();
            const txMonthYear = `${dataObj.getFullYear()}-${String(dataObj.getMonth() + 1).padStart(2, '0')}`;
            return `
            <div class="fluxo-tx-item flex overflow-x-auto overscroll-x-contain snap-x snap-mandatory no-scrollbar w-full hide-scroll-bar rounded-xl mb-2 shadow-sm border border-outline-variant/30 relative bg-surface/60 backdrop-blur-xl overflow-hidden" data-search="${searchData}" data-month="${txMonthYear}">
                <div class="snap-center shrink-0 w-full flex justify-between items-center p-6">
                    <div class="flex items-center gap-4 flex-1 min-w-0 pointer-events-none">
                        <div class="w-10 h-10 shrink-0 rounded-full bg-surface-container flex items-center justify-center">
                            <span class="material-symbols-outlined text-on-surface-variant text-[20px]">${icone}</span>
                        </div>
                        <div class="flex flex-col min-w-0">
                            <h3 class="font-body-lg text-body-lg text-primary truncate">${tx.titulo}</h3>
                            <p class="font-label-caps text-label-caps text-on-surface-variant mt-1 truncate">${tx.categoria} • ${fonteLabel} ${tx.parcelas > 1 ? ` • ${tx.parcelas}x` : ''}</p>
                            <p class="font-label-caps text-label-caps text-outline truncate">${dataFormatada}</p>
                        </div>
                    </div>
                    <div class="text-right flex flex-col items-end gap-1 shrink-0 pointer-events-none">
                        <p class="font-body-lg text-body-lg text-primary shrink-0 font-medium">${signal}${valorFormatado}</p>
                    </div>
                </div>
                <!-- Botoes que aparecem ao deslizar -->
                <div class="snap-center shrink-0 flex items-center gap-2 pr-6 pl-4 border-l border-outline-variant/20 bg-surface-variant/20">
                    <button class="btn-editar-tx w-10 h-10 rounded-full bg-surface-container-highest text-secondary hover:bg-outline-variant/30 flex items-center justify-center transition-all active:scale-90" data-id="${tx.id}" data-desc="${tx.titulo}" data-val="${Math.abs(tx.valor)}" data-tipo="${tx.tipo}" data-cat="${tx.categoria}" data-dt="${tx.data}" data-fonte="${tx.fonteId}" data-parc="${tx.parcelas || 1}">
                        <span class="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                    <button class="btn-excluir-tx w-10 h-10 rounded-full bg-error-container text-error flex items-center justify-center transition-transform active:scale-90" data-id="${tx.id}">
                        <span class="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                </div>
            </div>`;
        }).join('');
    };

    const groupedHTML = Object.keys(grouped).map(label => `
        <section class="fluxo-section">
            <h2 class="font-label-caps text-label-caps text-secondary mb-stack-sm pl-2">${label}</h2>
            <div class="flex flex-col gap-2">
                ${renderTransactions(grouped[label])}
            </div>
        </section>
    `).join('');

    const cartoesOptions = store.corrente.cartoes.map(c => `<option value="${c.id}">Cartão ${c.nome}</option>`).join('');
    const catsOptions = CATEGORIAS_GLOBAIS.map(c => `<option value="${c}">${c}</option>`).join('');

    return `
        <!-- TopAppBar -->
        <header class="fixed top-0 w-full max-w-md mx-auto z-40 bg-surface/70 backdrop-blur-2xl border-b border-outline-variant/5 flex justify-between items-center px-container-padding-mobile h-[72px] gap-3 transition-all duration-150">
            <div class="w-[75%] transition-all duration-150 flex items-center bg-surface-container-low rounded-xl px-3 h-12 border border-outline-variant/30 focus-within:border-primary focus-within:shadow-sm">
                <span class="material-symbols-outlined text-secondary mr-2 text-[20px]">search</span>
                <input type="text" id="fluxo-search" class="w-full bg-transparent border-none outline-none focus:outline-none text-primary font-body-md placeholder:text-on-surface-variant/50 truncate" style="outline: none;" placeholder="Buscar...">
                <button id="clear-search" class="hidden text-secondary hover:text-primary transition-colors flex items-center">
                    <span class="material-symbols-outlined text-[18px]">close</span>
                </button>
            </div>
            
            <div id="btn-month-filter" class="w-[25%] relative h-12 flex items-center justify-center bg-surface-container-low rounded-xl border border-outline-variant/30 text-primary overflow-hidden shadow-sm active:scale-95 transition-transform cursor-pointer">
                <input type="month" id="fluxo-month-filter" class="absolute w-[1px] h-[1px] opacity-0 pointer-events-none" title="Filtrar por Mês e Ano">
                <span class="material-symbols-outlined text-[20px] pointer-events-none">calendar_month</span>
                <button id="clear-month-filter" class="hidden absolute right-1 z-20 text-error hover:opacity-70 bg-surface-container-low rounded-full w-6 h-6 flex items-center justify-center shadow-sm border border-outline-variant/20">
                    <span class="material-symbols-outlined text-[14px] pointer-events-none">close</span>
                </button>
            </div>
        </header>

        <main class="pt-24 px-container-padding-mobile max-w-4xl mx-auto pb-32">
            <!-- Timeline Section -->
            <div class="space-y-stack-lg">
                ${groupedHTML || '<p class="text-secondary text-center py-10">Seu fluxo está vazio.</p>'}
            </div>
        </main>

        <!-- Floating Action Button -->
        <button id="open-nova-tx" class="fixed bottom-[100px] right-6 w-14 h-14 bg-primary text-on-primary rounded-2xl shadow-lg flex items-center justify-center hover:shadow-xl active:scale-95 transition-all z-40">
            <span class="material-symbols-outlined text-[24px]">add</span>
        </button>

        <!-- Nova Transacao Modal -->
        <div id="nova-tx-modal" class="hidden fixed inset-0 z-[70] bg-on-background/40 backdrop-blur-sm flex items-end justify-center transition-opacity cursor-pointer">
            <div class="bg-surface/90 backdrop-blur-3xl w-full max-w-md p-6 rounded-t-3xl flex flex-col shadow-2xl translate-y-full transition-transform duration-150 cursor-auto max-h-[90vh] overflow-y-auto" id="nova-tx-sheet">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="font-headline-md text-headline-md text-primary">Novo Lançamento</h2>
                    <button id="close-nova-tx" class="text-on-surface-variant hover:text-primary transition-colors bg-surface-container-highest w-8 h-8 rounded-full flex items-center justify-center"><span class="material-symbols-outlined text-[18px]">close</span></button>
                </div>
                <form id="form-nova-tx" class="flex flex-col gap-5">
                    
                    <!-- Tipo (Entrada/Saída) -->
                    <input type="hidden" id="tx-id-edit" value="">
                    <div class="flex gap-2 p-1 bg-surface-container-highest rounded-xl">
                        <button type="button" class="flex-1 py-2 rounded-lg font-label-caps text-label-caps font-bold transition-colors btn-tx-tipo active-tipo bg-surface text-primary shadow-sm" data-tipo="SAIDA">SAÍDA</button>
                        <button type="button" class="flex-1 py-2 rounded-lg font-label-caps text-label-caps font-bold transition-colors btn-tx-tipo text-on-surface-variant" data-tipo="ENTRADA">ENTRADA</button>
                    </div>
                    <input type="hidden" id="tx-tipo" value="SAIDA">

                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-caps text-label-caps text-secondary pl-1">Descrição</label>
                        <input type="text" id="tx-desc" style="text-transform: capitalize;" required class="w-full h-12 px-4 rounded-xl border border-outline-variant/30 bg-surface focus:border-primary focus:outline-none text-primary font-body-lg placeholder:text-on-surface-variant/40" placeholder="Ex: Supermercado Extra">
                    </div>
                    
                    <div class="flex gap-4">
                        <div class="flex flex-col gap-1.5 w-full">
                            <label class="font-label-caps text-label-caps text-secondary pl-1">Categoria</label>
                            <div class="relative">
                                <select id="tx-categoria" required class="w-full h-12 px-4 rounded-xl border border-outline-variant/30 bg-surface focus:border-primary focus:outline-none text-primary font-body-lg appearance-none">
                                    ${catsOptions}
                                </select>
                                <span class="material-symbols-outlined absolute right-3 top-3 text-secondary pointer-events-none">expand_more</span>
                            </div>
                        </div>
                    </div>

                    <!-- Fonte da Conta -->
                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-caps text-label-caps text-secondary pl-1">Conta / Cartão</label>
                        <div class="relative">
                            <select id="tx-fonte" required class="w-full h-12 px-4 rounded-xl border border-outline-variant/30 bg-surface focus:border-primary focus:outline-none text-primary font-body-lg appearance-none">
                                <option value="corrente">Saldo do Corrente</option>
                                ${cartoesOptions}
                            </select>
                            <span class="material-symbols-outlined absolute right-3 top-3 text-secondary pointer-events-none">expand_more</span>
                        </div>
                    </div>

                    <!-- Parcelas (Apenas para cartões) -->
                    <div class="flex flex-col gap-1.5 hidden" id="box-parcelas">
                        <label class="font-label-caps text-label-caps text-secondary pl-1">Parcelas (Max 18)</label>
                        <input type="number" min="1" max="18" value="1" id="tx-parcelas" class="w-full h-12 px-4 rounded-xl border border-outline-variant/30 bg-surface focus:border-primary focus:outline-none text-primary font-body-lg text-center">
                    </div>

                    <!-- Valor -->
                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-caps text-label-caps text-secondary pl-1">Valor Total</label>
                        <input type="text" inputmode="numeric" id="tx-valor" required class="w-full h-14 px-4 rounded-xl border border-outline-variant/30 bg-surface focus:border-primary focus:outline-none text-primary font-headline-sm" placeholder="R$ 0,00">
                    </div>

                    <!-- Data (Opcional) -->
                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-caps text-label-caps text-secondary pl-1">Data</label>
                        <input type="date" id="tx-data" required class="w-full h-12 px-4 rounded-xl border border-outline-variant/30 bg-surface focus:border-primary focus:outline-none text-primary font-body-lg">
                    </div>

                    <button type="submit" class="w-full h-14 mt-4 bg-primary text-on-primary rounded-xl font-bold active:scale-95 transition-transform" id="btn-salvar-tx">
                        Salvar Lançamento
                    </button>
                </form>
            </div>
        </div>

        <!-- Modal Confirmação de Exclusão -->
        <div id="fluxo-confirm-delete-modal" class="hidden fixed inset-0 z-[80] bg-on-background/40 backdrop-blur-sm flex items-center justify-center transition-opacity px-4 cursor-pointer">
            <div class="bg-surface/90 backdrop-blur-3xl w-full max-w-sm p-8 rounded-[32px] flex flex-col shadow-2xl scale-95 transition-transform duration-150 cursor-auto" id="fluxo-confirm-delete-sheet">
                <div class="w-16 h-16 rounded-full bg-error-container text-error flex items-center justify-center mx-auto mb-4">
                    <span class="material-symbols-outlined text-[32px]">delete_forever</span>
                </div>
                <h3 class="font-headline-md text-headline-md text-primary mb-2 text-center">Tem certeza?</h3>
                <p class="font-body-sm text-body-sm text-secondary text-center mb-8">Deseja realmente excluir este lançamento? A alteração afetará seu saldo imediatamente.</p>
                
                <div class="flex gap-4">
                    <button id="fluxo-btn-cancel-delete" class="flex-1 py-4 bg-surface-container-highest text-secondary rounded-xl font-bold active:scale-95 transition-transform">Voltar</button>
                    <button id="fluxo-btn-confirm-delete" class="flex-1 py-4 bg-error-container text-error rounded-xl font-bold active:scale-95 transition-transform">Excluir</button>
                </div>
            </div>
        </div>
    `;
};

// --- Listeners para Interatividade ---
document.addEventListener('click', (e) => {
    // Limpar busca
    if (e.target.closest('#clear-search')) {
        const searchInput = document.getElementById('fluxo-search');
        if (searchInput) {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    // Limpar filtro de mes
    if (e.target.closest('#clear-month-filter')) {
        const monthInput = document.getElementById('fluxo-month-filter');
        if (monthInput) {
            monthInput.value = '';
            monthInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        return; // Retornar para não abrir o calendário novamente
    }

    // Abrir o seletor nativo de mês/ano
    const btnMonthFilter = e.target.closest('#btn-month-filter');
    if (btnMonthFilter) {
        const monthInput = document.getElementById('fluxo-month-filter');
        if (monthInput && typeof monthInput.showPicker === 'function') {
            try {
                monthInput.showPicker();
            } catch (err) {
                // Em alguns browsers antigos, o showPicker não existe ou falha. O foco é a alternativa.
                monthInput.focus();
            }
        } else if (monthInput) {
            monthInput.focus();
        }
    }

    // Excluir TX
    const btnExcluir = e.target.closest('.btn-excluir-tx');
    if (btnExcluir) {
        window.pendingDeleteTxId = btnExcluir.getAttribute('data-id');
        const modal = document.getElementById('fluxo-confirm-delete-modal');
        const sheet = document.getElementById('fluxo-confirm-delete-sheet');
        if (modal && sheet) {
            modal.classList.remove('hidden');
            void modal.offsetWidth;
            sheet.classList.remove('scale-95');
            sheet.classList.add('scale-100');
        }
    }

    const btnCancelDelete = e.target.closest('#fluxo-btn-cancel-delete') || (e.target.id === 'fluxo-confirm-delete-modal');
    if (btnCancelDelete) {
        const modal = document.getElementById('fluxo-confirm-delete-modal');
        const sheet = document.getElementById('fluxo-confirm-delete-sheet');
        if (modal && sheet) {
            sheet.classList.remove('scale-100');
            sheet.classList.add('scale-95');
            setTimeout(() => {
                modal.classList.add('hidden');
                window.pendingDeleteTxId = null;
            }, 300);
        }
    }

    const btnConfirmDelete = e.target.closest('#fluxo-btn-confirm-delete');
    if (btnConfirmDelete) {
        if (window.pendingDeleteTxId) {
            excluirTransacaoFluxo(window.pendingDeleteTxId);
            const modal = document.getElementById('fluxo-confirm-delete-modal');
            const sheet = document.getElementById('fluxo-confirm-delete-sheet');
            if (modal && sheet) {
                sheet.classList.remove('scale-100');
                sheet.classList.add('scale-95');
                setTimeout(() => {
                    modal.classList.add('hidden');
                    window.pendingDeleteTxId = null;
                }, 300);
            }
        }
    }

    // Editar TX
    const btnEditar = e.target.closest('.btn-editar-tx');
    if (btnEditar) {
        document.body.classList.add('overflow-hidden');
        const modal = document.getElementById('nova-tx-modal');
        const sheet = document.getElementById('nova-tx-sheet');

        const id = btnEditar.getAttribute('data-id');
        const desc = btnEditar.getAttribute('data-desc');
        const val = btnEditar.getAttribute('data-val');
        const tipo = btnEditar.getAttribute('data-tipo');
        const cat = btnEditar.getAttribute('data-cat');
        const dt = btnEditar.getAttribute('data-dt');
        const fonte = btnEditar.getAttribute('data-fonte');
        const parc = btnEditar.getAttribute('data-parc');

        document.getElementById('form-nova-tx').reset();
        document.getElementById('tx-id-edit').value = id;
        document.getElementById('tx-tipo').value = tipo;
        document.getElementById('tx-desc').value = desc;
        document.getElementById('tx-categoria').value = cat;
        document.getElementById('tx-fonte').value = fonte;

        const inputValor = document.getElementById('tx-valor');
        const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
        inputValor.value = formatter.format(parseFloat(val));

        document.getElementById('tx-parcelas').value = parc;

        if (dt) {
            document.getElementById('tx-data').value = new Date(dt).toISOString().split('T')[0];
        }

        document.querySelectorAll('.btn-tx-tipo').forEach(b => {
            if (b.getAttribute('data-tipo') === tipo) {
                b.classList.replace('text-on-surface-variant', 'bg-surface');
                b.classList.add('text-primary', 'shadow-sm', 'active-tipo');
            } else {
                b.classList.replace('bg-surface', 'text-on-surface-variant');
                b.classList.remove('text-primary', 'shadow-sm', 'active-tipo');
            }
        });

        if (fonte === 'corrente') {
            document.getElementById('box-parcelas').classList.add('hidden');
        } else {
            document.getElementById('box-parcelas').classList.remove('hidden');
        }

        document.querySelector('#nova-tx-sheet h2').textContent = 'Editar Lançamento';
        document.getElementById('btn-salvar-tx').textContent = 'Atualizar';

        modal.classList.remove('hidden');
        void modal.offsetWidth;
        sheet.classList.remove('translate-y-full');
    }

    // Modal Nova TX
    const btnNova = e.target.closest('#open-nova-tx');
    if (btnNova) {
        document.body.classList.add('overflow-hidden');
        const modal = document.getElementById('nova-tx-modal');
        const sheet = document.getElementById('nova-tx-sheet');

        // Reset form
        document.getElementById('form-nova-tx').reset();
        document.getElementById('tx-id-edit').value = '';
        document.querySelector('#nova-tx-sheet h2').textContent = 'Novo Lançamento';
        document.getElementById('btn-salvar-tx').textContent = 'Salvar Lançamento';

        document.getElementById('tx-tipo').value = 'SAIDA';
        document.querySelectorAll('.btn-tx-tipo').forEach(b => {
            if (b.getAttribute('data-tipo') === 'SAIDA') {
                b.classList.replace('text-on-surface-variant', 'bg-surface');
                b.classList.add('text-primary', 'shadow-sm', 'active-tipo');
            } else {
                b.classList.replace('bg-surface', 'text-on-surface-variant');
                b.classList.remove('text-primary', 'shadow-sm', 'active-tipo');
            }
        });
        document.getElementById('tx-fonte').disabled = false;
        document.getElementById('box-parcelas').classList.add('hidden');

        // Set default data to today
        document.getElementById('tx-data').value = new Date().toISOString().split('T')[0];

        modal.classList.remove('hidden');
        void modal.offsetWidth;
        sheet.classList.remove('translate-y-full');
    }

    const closeNova = e.target.closest('#close-nova-tx') || (e.target.id === 'nova-tx-modal');
    if (closeNova) {
        const modal = document.getElementById('nova-tx-modal');
        const sheet = document.getElementById('nova-tx-sheet');
        sheet.classList.add('translate-y-full');
        setTimeout(() => {
            modal.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
        }, 300);
    }

    // Tipo toggle
    const btnTipo = e.target.closest('.btn-tx-tipo');
    if (btnTipo) {
        document.querySelectorAll('.btn-tx-tipo').forEach(b => {
            b.classList.replace('bg-surface', 'text-on-surface-variant');
            b.classList.remove('text-primary', 'shadow-sm', 'active-tipo');
        });
        btnTipo.classList.replace('text-on-surface-variant', 'bg-surface');
        btnTipo.classList.add('text-primary', 'shadow-sm', 'active-tipo');
        document.getElementById('tx-tipo').value = btnTipo.getAttribute('data-tipo');

        if (btnTipo.getAttribute('data-tipo') === 'ENTRADA') {
            document.getElementById('tx-fonte').value = 'corrente';
            document.getElementById('tx-fonte').disabled = true;
            document.getElementById('box-parcelas').classList.add('hidden');
        } else {
            document.getElementById('tx-fonte').disabled = false;
        }
    }
});

document.addEventListener('change', (e) => {
    // Mostrar/Esconder Parcelas dependendo da fonte
    if (e.target.id === 'tx-fonte') {
        const val = e.target.value;
        if (val === 'corrente') {
            document.getElementById('box-parcelas').classList.add('hidden');
            document.getElementById('tx-parcelas').value = 1;
        } else {
            document.getElementById('box-parcelas').classList.remove('hidden');
        }
    }
});

document.addEventListener('input', (e) => {
    // Busca de lançamentos no Fluxo e Filtro de Mês
    if (e.target.id === 'fluxo-search' || e.target.id === 'fluxo-month-filter') {
        const searchInput = document.getElementById('fluxo-search');
        const monthInput = document.getElementById('fluxo-month-filter');
        const query = (searchInput ? searchInput.value : '').toLowerCase();
        const monthQuery = monthInput ? monthInput.value : ''; // "YYYY-MM"

        const items = document.querySelectorAll('.fluxo-tx-item');

        items.forEach(item => {
            const searchData = item.getAttribute('data-search') || '';
            const itemMonth = item.getAttribute('data-month') || '';

            const matchesSearch = searchData.includes(query);
            const matchesMonth = monthQuery ? itemMonth === monthQuery : true;

            if (matchesSearch && matchesMonth) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });

        // Esconder seções vazias
        document.querySelectorAll('.fluxo-section').forEach(section => {
            const hasVisibleItems = Array.from(section.querySelectorAll('.fluxo-tx-item')).some(i => i.style.display !== 'none');
            section.style.display = hasVisibleItems ? '' : 'none';
        });

        const clearSearchBtn = document.getElementById('clear-search');
        if (clearSearchBtn) {
            if (query.length > 0) clearSearchBtn.classList.remove('hidden');
            else clearSearchBtn.classList.add('hidden');
        }

        const clearMonthBtn = document.getElementById('clear-month-filter');
        if (clearMonthBtn) {
            if (monthQuery !== '') clearMonthBtn.classList.remove('hidden');
            else clearMonthBtn.classList.add('hidden');
        }
    }

    // Primeira letra maiúscula de cada palavra para descrição do fluxo
    if (e.target.id === 'tx-desc') {
        const start = e.target.selectionStart;
        const end = e.target.selectionEnd;
        e.target.value = e.target.value.toLowerCase().replace(/(?:^|\s)\S/g, m => m.toUpperCase());
        e.target.setSelectionRange(start, end);
    }

    if (e.target.id === 'tx-valor') {
        let value = e.target.value.replace(/\D/g, "");
        if (value === "") {
            e.target.value = "";
            return;
        }
        const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
        e.target.value = formatter.format(parseInt(value, 10) / 100);
    }
    if (e.target.id === 'tx-parcelas') {
        let max = parseInt(e.target.getAttribute('max')) || 18;
        if (parseInt(e.target.value) > max) e.target.value = max;
    }
});

document.addEventListener('submit', (e) => {
    if (e.target.id === 'form-nova-tx') {
        e.preventDefault();
        const tipo = document.getElementById('tx-tipo').value;
        const desc = document.getElementById('tx-desc').value;
        const cat = document.getElementById('tx-categoria').value;
        const fonte = document.getElementById('tx-fonte').value;

        const rawValor = document.getElementById('tx-valor').value.replace(/\D/g, "");
        const valorNum = parseInt(rawValor, 10) / 100;

        const parcelas = document.getElementById('tx-parcelas').value || 1;

        const dataStr = document.getElementById('tx-data').value;
        const dataFinal = dataStr ? new Date(dataStr + 'T12:00:00').toISOString() : new Date().toISOString();

        const idEdit = document.getElementById('tx-id-edit').value;
        if (idEdit) {
            editarTransacaoFluxo(idEdit, desc, valorNum, tipo, cat, dataFinal, fonte, parcelas);
        } else {
            adicionarTransacaoFluxo(desc, valorNum, tipo, cat, dataFinal, fonte, parcelas);
        }

        e.target.reset();
        const modal = document.getElementById('nova-tx-modal');
        const sheet = document.getElementById('nova-tx-sheet');
        sheet.classList.add('translate-y-full');
        setTimeout(() => {
            modal.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
        }, 300);
    }
});

