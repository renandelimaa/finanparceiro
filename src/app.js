import { store, subscribe, initStore } from './store.js';
import { Corrente } from './views/Corrente.js';
import { Cofre } from './views/Cofre.js';
import { Fluxo } from './views/Fluxo.js';
import { Analises } from './views/Analises.js';
import { Login } from './views/Login.js';
import { isAuthenticated, login, loginVisitante } from './auth.js';

const routes = {
    '': 'Corrente',
    '#corrente': 'Corrente',
    '#cofre': 'Cofre',
    '#fluxo': 'Fluxo',
    '#analises': 'Analises',
    '#login': 'Login'
};

const views = {
    'Corrente': Corrente,
    'Cofre': Cofre,
    'Fluxo': Fluxo,
    'Analises': Analises,
    'Login': Login
};

const renderApp = () => {
    const hash = window.location.hash;
    const isAuth = isAuthenticated();

    // Redireciona se não estiver autenticado
    if (!isAuth && hash !== '#login') {
        window.location.hash = '#login';
        return;
    }

    // Previne acesso ao login se já autenticado
    if (isAuth && hash === '#login') {
        window.location.hash = '#corrente';
        return;
    }

    const viewName = routes[hash] || (isAuth ? 'Corrente' : 'Login');
    const appContainer = document.getElementById('app-view');
    
    if (!appContainer) return;

    // Mantém estado de modais abertos durante re-render

    const isFaturaOpen = document.getElementById('fatura-modal') && !document.getElementById('fatura-modal').classList.contains('hidden');
    const isDetalhesCofreOpen = document.getElementById('detalhes-meta-modal') && !document.getElementById('detalhes-meta-modal').classList.contains('hidden');

    try {
        appContainer.innerHTML = views[viewName]();
    } catch (err) {
        appContainer.innerHTML = `<div style="padding: 20px; color: red;"><h1>Erro</h1><pre>${err.stack}</pre></div>`;
        console.error(err);
    }
    if (viewName === 'Corrente' && isFaturaOpen && typeof window.restoreFaturaModal === 'function') {
        window.restoreFaturaModal();
    }

    if (viewName === 'Cofre' && isDetalhesCofreOpen && typeof window.restoreCofreModal === 'function') {
        window.restoreCofreModal();
    }

    // Controle de navegação

    const navBar = document.getElementById('bottom-nav');
    if (navBar) {
        if (isAuth && viewName !== 'Login') {
            navBar.classList.remove('hidden');
            navBar.classList.add('flex');
            updateNav(hash || '#corrente');
        } else {
            navBar.classList.add('hidden');
            navBar.classList.remove('flex');
        }
    }

    // Injeta eventos caso seja login
    if (viewName === 'Login') {
        bindLoginEvents();
    }
};

const bindLoginEvents = () => {
    const form = document.getElementById('login-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = document.getElementById('username').value;
            const pass = document.getElementById('password').value;
            const errorMsg = document.getElementById('login-error');
            const submitBtn = form.querySelector('button[type="submit"]');
            
            if (submitBtn) submitBtn.disabled = true;

            const success = await login(user, pass);
            if (success) {
                errorMsg.classList.add('hidden');
                document.getElementById('app-view').innerHTML = `
                    <div class="h-screen flex items-center justify-center bg-background">
                        <div class="flex flex-col items-center gap-4">
                            <div class="w-12 h-12 rounded-full border-[4px] border-primary/20 border-t-primary animate-spin"></div>
                            <p class="text-secondary font-body-lg">Baixando perfil seguro...</p>
                        </div>
                    </div>
                `;
                await initStore();
                window.location.hash = '#corrente';
                window.location.reload();
            } else {
                errorMsg.classList.remove('hidden');
                if (submitBtn) submitBtn.disabled = false;
            }
        });

        const btnVisitante = document.getElementById('btn-visitante');
        if (btnVisitante) {
            btnVisitante.addEventListener('click', async () => {
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) submitBtn.disabled = true;
                btnVisitante.disabled = true;
                
                loginVisitante();
                
                document.getElementById('app-view').innerHTML = `
                    <div class="h-screen flex items-center justify-center bg-background">
                        <div class="flex flex-col items-center gap-4">
                            <div class="w-12 h-12 rounded-full border-[4px] border-primary/20 border-t-primary animate-spin"></div>
                            <p class="text-secondary font-body-lg">Iniciando perfil de demonstração...</p>
                        </div>
                    </div>
                `;
                await initStore();
                window.location.hash = '#corrente';
                window.location.reload();
            });
        }
    }
};

const updateNav = (activeHash) => {
    let normalizedActive = activeHash || '';
    if (normalizedActive === '' || normalizedActive === '#') {
        normalizedActive = '#corrente';
    }

    const navItems = document.querySelectorAll('#bottom-nav a');
    navItems.forEach(item => {
        const href = item.getAttribute('href') || '';
        
        // Remove active state
        item.classList.remove('text-primary', 'dark:text-primary-fixed-dim', 'font-bold');
        item.classList.add('text-on-surface-variant/60', 'dark:text-on-surface-variant/60');
        
        const icon = item.querySelector('.material-symbols-outlined');
        if(icon) {
            icon.classList.remove('fill');
        }

        // Add active state if matched
        if (href === normalizedActive) {
            item.classList.remove('text-on-surface-variant/60', 'dark:text-on-surface-variant/60');
            item.classList.add('text-primary', 'dark:text-primary-fixed-dim', 'font-bold');
            if(icon) {
                icon.classList.add('fill');
            }
        }
    });
};

const initApp = async () => {
    if (isAuthenticated()) {
        const appDiv = document.getElementById('app-view');
        appDiv.innerHTML = `
            <div class="h-screen flex items-center justify-center bg-background">
                <div class="flex flex-col items-center gap-4">
                    <div class="w-12 h-12 rounded-full border-[4px] border-primary/20 border-t-primary animate-spin"></div>
                    <p class="text-secondary font-body-lg">Sincronizando nuvem...</p>
                </div>
            </div>
        `;
        await initStore();
    }

    window.addEventListener('hashchange', () => {
        window.scrollTo(0, 0);
        renderApp();
    });
    
    subscribe(() => {
        renderApp();
    });

    renderApp();
};

document.addEventListener('DOMContentLoaded', initApp);

// Para testes no console do navegador
window.appStore = store;
