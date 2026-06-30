const AUTH_TOKEN_KEY = 'tc_auth_token';
// Hash SHA-256 e Usuário via Variáveis de Ambiente
const EXPECTED_HASH = import.meta.env.VITE_ADMIN_HASH || '';
const EXPECTED_USER = import.meta.env.VITE_ADMIN_USER || '';

// Converte string para ArrayBuffer (necessário para Web Crypto API)
const str2ab = (str) => {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
};

// Converte ArrayBuffer para string Hex
const ab2hex = (ab) => {
    return Array.prototype.map.call(new Uint8Array(ab), x => ('00' + x.toString(16)).slice(-2)).join('');
};

export const isAuthenticated = () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    return token === 'true' || token === 'visitante';
};

export const login = async (username, password) => {
    if (username !== EXPECTED_USER) return false;
    
    try {
        // Hash da senha inserida utilizando a Web Crypto API nativa (sem libs externas)
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', str2ab(password));
        const hashHex = ab2hex(hashBuffer);
        
        if (hashHex === EXPECTED_HASH) {
            localStorage.setItem(AUTH_TOKEN_KEY, 'true'); // Persistência permanente
            return true;
        }
        return false;
    } catch (e) {
        console.error('Erro na criptografia:', e);
        return false;
    }
};

export const loginVisitante = () => {
    localStorage.setItem(AUTH_TOKEN_KEY, 'visitante');
    return true;
};

export const logout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    window.location.hash = '#login';
};
