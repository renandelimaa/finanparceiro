# 💰 FinanParceiro - Seu Agente Financeiro Pessoal Inteligente

[![Tecnologias](https://img.shields.io/badge/Stack-JavaScript%20%7C%20Tailwind%20%7C%20Firebase-blue)](#)
[![IA](https://img.shields.io/badge/Powered%20by-Google%20Gemini-orange)](#)

*Esqueça planilhas complexas e aplicativos confusos. O FinanParceiro é mais do que um gestor de despesas: é um conselheiro financeiro de bolso guiado por Inteligência Artificial.*

O **FinanParceiro** acompanha o seu dia a dia, organiza seus cartões, simula o futuro dos seus investimentos e, o mais importante, **conversa com você** para responder perguntas complexas sobre a sua própria realidade financeira.

> 📸 *Dica: Substitua este aviso por uma captura de tela (Screenshot) ou GIF animado do Dashboard do seu aplicativo para causar mais impacto visual.*

---

## ✨ Por que o FinanParceiro é diferente?

Diferente de sistemas tradicionais onde você apenas "joga dados", aqui a IA lê o seu contexto e ajuda a tomar decisões. 

- **🧠 A IA que te Conhece:** Pergunte ao chat integrado: *"Consigo trocar de carro mês que vem?"* ou *"Quanto preciso guardar para viajar em dezembro?"*. O Gemini analisa seus gastos e receitas na hora e te dá a resposta.
- **💳 Domínio sobre os Cartões:** Chega de surpresas no fim do mês. Lance compras parceladas, adiante faturas e acompanhe seus limites em tempo real.
- **🏦 O "Cofre" Inteligente:** Defina metas (ex: Reserva de Emergência) e veja o app simular o crescimento do seu dinheiro com juros compostos em aplicações CDI ou Fixas.
- **📊 Visão de Raio-X:** Dashboard limpo e intuitivo para entender seu patrimônio líquido, fluxo de caixa e pendências em questão de segundos.

---

## 🛠️ Por Trás dos Panos (Tecnologia & Arquitetura)

- **Frontend:** HTML, JavaScript Vanilla e Tailwind CSS (através do Vite) focando em alta performance e reatividade via Proxies locais (`src/store.js`). PWA configurado (aplicativo instalável).
- **Backend (Serverless):** Firebase Cloud Functions (Node.js) para processamento seguro da Inteligência Artificial.
- **Banco de Dados:** Firestore (Firebase) para persistência em nuvem.
- **IA:** Integração nativa com a API do Google Gemini via `@google/genai`.

## 🔒 Segurança em Primeiro Lugar

O projeto utiliza **Variáveis de Ambiente** no Frontend e no Backend. Nenhuma chave secreta está embutida diretamente no código fonte. 

A arquitetura usa o `tc_auth_token` e faz hash de senha via Web Crypto API de forma nativa no navegador (sem dependências externas) antes de comparar com o hash no ambiente (`import.meta.env.VITE_ADMIN_HASH`).

---

## 💻 Como Rodar Localmente

### 1. Pré-requisitos
- Node.js (v18+)
- Conta no Firebase com Firestore e Cloud Functions ativados
- Chave de API do Google Gemini

### 2. Configurando o Frontend
Renomeie o arquivo `.env.example` para `.env` e preencha com as suas chaves do Firebase e configurações de administrador:
```env
VITE_FIREBASE_API_KEY="SUA_CHAVE"
VITE_FIREBASE_AUTH_DOMAIN="seu-app.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="seu-app"
VITE_FIREBASE_STORAGE_BUCKET="seu-app.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="ID"
VITE_FIREBASE_APP_ID="APP_ID"
VITE_FIREBASE_MEASUREMENT_ID="G-MEASUREMENT"

# Credenciais de acesso
VITE_ADMIN_USER="seu_usuario"
VITE_ADMIN_HASH="seu_password_hash_sha256"
```
Instale as dependências e inicie o servidor:
```bash
npm install
npm run dev
```

### 3. Configurando o Backend (Cloud Functions)
Entre na pasta `functions`, renomeie `.env.example` para `.env` e insira sua chave do Gemini:
```env
GOOGLE_GENAI_API_KEY="SUA_CHAVE_AQUI"
```
Crie seu próprio prompt de sistema copiando o modelo:
```bash
cp agentPrompt.example.js agentPrompt.js
```
Edite o arquivo para conter suas próprias diretrizes comportamentais para a IA.

Instale as dependências da function:
```bash
cd functions
npm install
```

### 4. Deploy para o Firebase
```bash
npm run build
firebase deploy --only functions,hosting
```

## ⚠️ Considerações Finais e Disclaimer
Este software é um modelo de arquitetura. É **fortemente recomendado** que você garanta a correta configuração das Regras de Segurança do seu Firestore (`firestore.rules`) para evitar que dados sejam lidos publicamente. O arquivo `auth.js` provê uma camada de proteção UI, mas as regras de banco precisam restringir acessos não autorizados via API.
