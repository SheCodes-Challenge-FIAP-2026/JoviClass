require("dotenv").config();

const express = require("express");
const cors = require("cors");
const session = require("cookie-session");
const { GoogleGenAI } = require("@google/genai");

// ======================================================
// CONFIGURAÇÕES
// ======================================================

const app = express();
const PORT = 3000;

app.use(cors({ origin: process.env.FRONTEND_URL || "http://127.0.0.1:5500", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(session({ name: "jovi_session", keys: [process.env.SESSION_SECRET || "troque-essa-chave"] }));

// ======================================================
// GEMINI
// ======================================================

if (!process.env.GEMINI_API_KEY) {
    console.error("❌ ERRO: GEMINI_API_KEY não foi encontrada no arquivo .env");
    process.exit(1);
}

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

// ======================================================
// ROTAS DE GOOGLE (Drive + Calendar) E NOTION
// ======================================================

app.use("/", require("./routes/google"));
app.use("/api/notion", require("./routes/notion"));

// ======================================================
// ROTA PRINCIPAL / TESTE
// ======================================================

app.get("/", (req, res) => {
    res.json({ status: "online", mensagem: "Backend JoviClass funcionando!" });
});

app.get("/teste", (req, res) => {
    res.json({ status: "ok", mensagem: "Rota de teste funcionando!" });
});

// ======================================================
// PROMPTS DA IA
// ======================================================

function criarPrompt(acao, texto) {
    switch (acao) {
        case "resumo":
            return `
Você é o assistente de estudos do JoviClass.

Analise o conteúdo acadêmico abaixo e crie um resumo
claro, organizado e fácil de estudar.

Estruture sua resposta assim:

📚 RESUMO GERAL

Explique o assunto de forma simples e objetiva.

📌 PRINCIPAIS CONCEITOS

Liste os conceitos mais importantes.

🧠 PONTOS IMPORTANTES

Liste as informações que o estudante deve memorizar.

📝 PERGUNTAS PARA REVISÃO

Crie de 5 a 10 perguntas para ajudar o estudante
a revisar o conteúdo.

REGRAS:

- Não invente informações.
- Utilize somente o conteúdo fornecido.
- Não altere o significado das informações.
- Responda em português do Brasil.
- Seja claro e organizado.

CONTEÚDO DA AULA:

${texto}
`;

        case "questoes":
            return `
Você é um professor ajudando um estudante do JoviClass.

Crie 10 questões de múltipla escolha com base
EXCLUSIVAMENTE no conteúdo fornecido.

Para cada questão utilize este formato:

1. Pergunta

A) alternativa
B) alternativa
C) alternativa
D) alternativa

Resposta correta:
Explique por que essa é a resposta correta.

As questões devem possuir níveis variados:

- fáceis
- médias
- difíceis

REGRAS:

- Não invente informações.
- Utilize somente o conteúdo fornecido.
- Responda em português do Brasil.

CONTEÚDO:

${texto}
`;

        case "flashcards":
            return `
Você é o assistente de estudos do JoviClass.

Crie entre 8 e 15 flashcards para ajudar o estudante
a memorizar o conteúdo fornecido.

Utilize exatamente este formato:

🧠 CARD 1

Pergunta:
...

Resposta:
...


🧠 CARD 2

Pergunta:
...

Resposta:
...

Continue até criar entre 8 e 15 cards.

REGRAS:

- As perguntas devem abordar os conceitos mais importantes.
- As respostas devem ser objetivas.
- Não invente informações.
- Utilize somente o conteúdo fornecido.
- Responda em português do Brasil.

CONTEÚDO:

${texto}
`;

        case "simulado":
            return `
Você é um professor preparando um estudante do JoviClass
para uma prova.

Crie um simulado com 15 questões baseado exclusivamente
no conteúdo fornecido.

Misture:

- questões fáceis
- questões médias
- questões difíceis

Cada questão deve possuir:

1. Pergunta

A) alternativa
B) alternativa
C) alternativa
D) alternativa

IMPORTANTE:

Não revele a resposta logo depois de cada questão.

No final coloque:

━━━━━━━━━━━━━━━━━━━━

📋 GABARITO

1 - X
2 - X
3 - X
4 - X
5 - X
6 - X
7 - X
8 - X
9 - X
10 - X
11 - X
12 - X
13 - X
14 - X
15 - X

REGRAS:

- Não invente informações.
- Utilize somente o conteúdo fornecido.
- Responda em português do Brasil.

CONTEÚDO:

${texto}
`;

        case "explicar":
            return `
Você é um professor particular do JoviClass.

Explique o conteúdo abaixo de maneira simples,
como se estivesse ensinando um estudante que está
tendo contato com o assunto pela primeira vez.

Organize a explicação assim:

📚 EXPLICAÇÃO SIMPLES

Explique o conteúdo de forma fácil de entender.

💡 EXEMPLO

Dê um exemplo relacionado ao conteúdo,
somente se houver informações suficientes
para fazer isso sem inventar fatos.

🧠 O QUE MEMORIZAR

Liste os pontos principais que o estudante
deve memorizar.

❓ TESTE SEU CONHECIMENTO

Crie uma pergunta para o estudante responder.

REGRAS:

- Não invente informações.
- Utilize somente o conteúdo fornecido.
- Responda em português do Brasil.
- Evite linguagem excessivamente técnica.

CONTEÚDO:

${texto}
`;

        default:
            return null;
    }
}

// ======================================================
// ROTA DA INTELIGÊNCIA ARTIFICIAL
// ======================================================

app.post("/ia", async (req, res) => {
    console.log("\n======================================");
    console.log("📥 NOVA REQUISIÇÃO PARA A IA");
    console.log("======================================");

    try {
        const { acao, texto } = req.body;

        console.log("Ação recebida:", acao);
        console.log("Quantidade de caracteres:", texto ? texto.length : 0);

        if (!texto || texto.trim() === "") {
            console.log("❌ Nenhum texto foi enviado.");
            return res.status(400).json({ erro: "Nenhum conteúdo foi enviado." });
        }

        const prompt = criarPrompt(acao, texto);

        if (!prompt) {
            console.log("❌ Ação inválida:", acao);
            return res.status(400).json({ erro: "Ação de IA inválida." });
        }

        console.log("✅ Prompt criado.");
        console.log("🤖 Enviando conteúdo para o Gemini...");

        const resposta = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt
        });

        console.log("✅ Gemini respondeu!");

        const resultado = resposta.text;

        if (!resultado) {
            console.log("❌ Gemini não retornou texto.");
            return res.status(500).json({ erro: "O Gemini não retornou nenhum texto." });
        }

        console.log("📚 Resultado recebido.");
        console.log("======================================\n");

        res.json({ resultado: resultado });

    } catch (erro) {
        console.error("\n======================================");
        console.error("❌ ERRO NO GEMINI");
        console.error("======================================");
        console.error(erro);
        console.error("======================================\n");

        res.status(500).json({
            erro: erro.message || "Erro desconhecido ao processar conteúdo com IA."
        });
    }
});

// ======================================================
// INICIAR SERVIDOR (UMA ÚNICA VEZ!)
// ======================================================

app.listen(PORT, () => {
    console.log("\n======================================");
    console.log("🚀 JoviClass Backend");
    console.log("======================================");
    console.log(`🌐 Servidor: http://localhost:${PORT}`);
    console.log(`🧪 Teste:    http://localhost:${PORT}/teste`);
    console.log("🤖 Gemini:   conectado");
    console.log("======================================\n");
});