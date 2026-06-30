export const Login = () => {
    return `
        <main class="fixed inset-0 z-50 w-full h-[100dvh] bg-surface flex flex-col items-center justify-center px-container-padding-mobile overflow-hidden animate-[fadeIn_0.5s_ease-out]">
            <div class="w-full max-w-sm flex flex-col items-center gap-6 sm:gap-stack-lg">
                
                <div class="flex flex-col items-center gap-1 mb-2 sm:mb-4">
                    <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 border-surface-container-lowest shadow-[0_8px_24px_rgba(0,0,0,0.08)] bg-surface flex items-center justify-center mb-2 sm:mb-3">
                        <img src="./icon.png" alt="Finanparceiro Logo" class="w-full h-full object-cover">
                    </div>
                    <h1 class="font-headline-md text-[22px] sm:text-headline-md text-primary font-bold">Finanparceiro</h1>
                    <p class="font-body-sm text-body-sm text-secondary text-center">Gestão financeira consolidada.</p>
                </div>

                <form id="login-form" class="w-full flex flex-col gap-4 sm:gap-stack-md bg-surface-container-lowest p-5 sm:p-6 rounded-2xl border border-surface-variant shadow-[0_12px_32px_rgba(0,0,0,0.02)]">
                    <div id="login-error" class="hidden text-error text-center font-body-sm bg-error-container p-3 rounded-xl transition-all">Credenciais incorretas.</div>
                    
                    <div class="flex flex-col gap-1.5 sm:gap-2">
                        <label class="font-label-caps text-label-caps text-on-surface-variant ml-1" for="username">USUÁRIO</label>
                        <input type="text" id="username" class="w-full h-11 sm:h-12 px-4 rounded-xl border border-outline-variant/30 bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-primary font-body-sm" placeholder="Digite seu usuário" required>
                    </div>

                    <div class="flex flex-col gap-1.5 sm:gap-2">
                        <label class="font-label-caps text-label-caps text-on-surface-variant ml-1" for="password">SENHA</label>
                        <input type="password" id="password" class="w-full h-11 sm:h-12 px-4 rounded-xl border border-outline-variant/30 bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-primary font-body-sm tracking-widest" placeholder="••••••••" required>
                    </div>

                    <button type="submit" class="w-full h-11 sm:h-12 mt-1 sm:mt-2 bg-primary text-on-primary rounded-xl font-bold hover:bg-on-surface transition-colors active:scale-95 duration-200">
                        Entrar no Finanparceiro
                    </button>
                    
                    <button type="button" id="btn-visitante" class="w-full h-11 sm:h-12 mt-0 sm:mt-1 bg-surface-variant text-on-surface-variant rounded-xl font-medium hover:bg-surface-variant/80 transition-colors active:scale-95 duration-200">
                        Acessar como Visitante
                    </button>
                </form>
            </div>
        </main>
    `;
};
