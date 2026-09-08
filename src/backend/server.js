require("dotenv").config();

const express = require("express");
const cors = require("cors");
const session = require("cookie-session");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const { OAuth2Client } = require("google-auth-library");
const { GoogleGenAI } = require("@google/genai");

// ======================================================
// CONFIGURAÇÕES
// ======================================================

const app = express();

const PORT = 3000;

// ------------------------------------------------------
// GOOGLE CLIENT ID
// ------------------------------------------------------

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

if (!GOOGLE_CLIENT_ID) {
    console.error("❌ ERRO: GOOGLE_CLIENT_ID não foi encontrado no .env");
    process.exit(1);
}

// Cliente utilizado para verificar o login do Google
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// ------------------------------------------------------
// CORS
// ------------------------------------------------------

// Frontend normalmente está rodando pelo Live Server
// em localhost:5500.
//
// Também deixei 127.0.0.1:5500 permitido.

const origensPermitidas = [
    "http://localhost:5501",
    "http://127.0.0.1:5501",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
];

app.use(
    cors({
        origin: function (origin, callback) {

            // Permite requisições sem Origin
            // (ex.: Postman)
            if (!origin) {
                return callback(null, true);
            }

            if (origensPermitidas.includes(origin)) {
                return callback(null, true);
            }

            return callback(
                new Error("Origem não permitida pelo CORS.")
            );
        },

        credentials: true
    })
);

// Permite receber JSON
app.use(
    express.json({
        limit: "10mb"
    })
);

// ======================================================
// SESSÃO DE LOGIN
// ======================================================

app.use(
    session({
        name: "jovi_session",

        keys: [
            process.env.SESSION_SECRET ||
            "troque-essa-chave-no-arquivo-env"
        ],

        httpOnly: true,

        // Permite compartilhar a sessão entre
        // frontend localhost:5500 e backend localhost:3000
        sameSite: "lax",

        // Em localhost usamos false.
        // Em produção com HTTPS deverá ser true.
        secure: false,

        // Expira depois de 7 dias
        maxAge: 7 * 24 * 60 * 60 * 1000
    })
);

// ======================================================
// BANCO DE USUÁRIOS SIMPLES
// ======================================================
//
// Por enquanto vamos utilizar um arquivo JSON.
// Depois podemos trocar por MySQL, MongoDB,
// PostgreSQL etc.
//

const caminhoUsuarios = path.join(
    __dirname,
    "usuarios.json"
);

// Cria usuarios.json automaticamente caso não exista
if (!fs.existsSync(caminhoUsuarios)) {
    fs.writeFileSync(
        caminhoUsuarios,
        JSON.stringify([], null, 2)
    );
}

// Lê usuários
function lerUsuarios() {

    try {

        const dados = fs.readFileSync(
            caminhoUsuarios,
            "utf8"
        );

        return JSON.parse(dados);

    } catch (erro) {

        console.error(
            "❌ Erro ao ler usuarios.json:",
            erro
        );

        return [];
    }
}

// Salva usuários
function salvarUsuarios(usuarios) {

    fs.writeFileSync(
        caminhoUsuarios,
        JSON.stringify(usuarios, null, 2)
    );
}

// ======================================================
// FUNÇÕES DE AUTENTICAÇÃO
// ======================================================

// Verifica se o usuário está logado
function exigirLogin(req, res, next) {

    if (
        !req.session ||
        !req.session.usuario
    ) {

        return res.status(401).json({
            autenticado: false,
            erro: "Você precisa estar logado para acessar este recurso."
        });
    }

    next();
}

// ======================================================
// ROTAS DE AUTENTICAÇÃO
// ======================================================

// ------------------------------------------------------
// CADASTRO COM E-MAIL E SENHA
// ------------------------------------------------------

app.post("/auth/cadastro", async (req, res) => {

    try {

        const {
            nome,
            email,
            senha
        } = req.body;

        // Validação básica
        if (
            !nome ||
            !email ||
            !senha
        ) {

            return res.status(400).json({
                sucesso: false,
                erro: "Preencha nome, e-mail e senha."
            });
        }

        const emailNormalizado =
            email.trim().toLowerCase();

        // Senha mínima
        if (senha.length < 6) {

            return res.status(400).json({
                sucesso: false,
                erro: "A senha deve possuir pelo menos 6 caracteres."
            });
        }

        const usuarios = lerUsuarios();

        // Verifica se e-mail já existe
        const usuarioExistente =
            usuarios.find(
                usuario =>
                    usuario.email === emailNormalizado
            );

        if (usuarioExistente) {

            return res.status(409).json({
                sucesso: false,
                erro: "Este e-mail já está cadastrado."
            });
        }

        // Criptografa a senha
        const senhaHash =
            await bcrypt.hash(senha, 10);

        const novoUsuario = {

            id:
                Date.now().toString(),

            nome:
                nome.trim(),

            email:
                emailNormalizado,

            senha:
                senhaHash,

            foto:
                null,

            provedor:
                "email",

            emailVerificado:
                false
        };

        usuarios.push(novoUsuario);

        salvarUsuarios(usuarios);

        // Não colocamos a senha na sessão
        req.session.usuario = {

            id:
                novoUsuario.id,

            nome:
                novoUsuario.nome,

            email:
                novoUsuario.email,

            foto:
                novoUsuario.foto,

            provedor:
                novoUsuario.provedor,

            emailVerificado:
                novoUsuario.emailVerificado
        };

        console.log(
            "✅ Novo usuário cadastrado:",
            novoUsuario.email
        );

        return res.json({

            sucesso: true,

            mensagem:
                "Cadastro realizado com sucesso.",

            usuario:
                req.session.usuario
        });

    } catch (erro) {

        console.error(
            "❌ Erro no cadastro:",
            erro
        );

        return res.status(500).json({

            sucesso: false,

            erro:
                "Erro interno ao realizar cadastro."
        });
    }
});

// ------------------------------------------------------
// LOGIN COM E-MAIL E SENHA
// ------------------------------------------------------

app.post("/auth/login", async (req, res) => {

    try {

        const {
            email,
            senha
        } = req.body;

        if (
            !email ||
            !senha
        ) {

            return res.status(400).json({

                sucesso: false,

                erro:
                    "Informe o e-mail e a senha."
            });
        }

        const emailNormalizado =
            email.trim().toLowerCase();

        const usuarios =
            lerUsuarios();

        const usuario =
            usuarios.find(
                usuario =>
                    usuario.email ===
                    emailNormalizado
            );

        if (!usuario) {

            return res.status(401).json({

                sucesso: false,

                erro:
                    "E-mail ou senha incorretos."
            });
        }

        // Usuários criados pelo Google
        // podem não possuir senha.
        if (!usuario.senha) {

            return res.status(401).json({

                sucesso: false,

                erro:
                    "Esta conta utiliza o login com Google."
            });
        }

        const senhaCorreta =
            await bcrypt.compare(
                senha,
                usuario.senha
            );

        if (!senhaCorreta) {

            return res.status(401).json({

                sucesso: false,

                erro:
                    "E-mail ou senha incorretos."
            });
        }

        // Cria sessão
        req.session.usuario = {

            id:
                usuario.id,

            nome:
                usuario.nome,

            email:
                usuario.email,

            foto:
                usuario.foto || null,

            provedor:
                usuario.provedor,

            emailVerificado:
                usuario.emailVerificado || false
        };

        console.log(
            "✅ Login realizado:",
            usuario.email
        );

        return res.json({

            sucesso: true,

            mensagem:
                "Login realizado com sucesso.",

            usuario:
                req.session.usuario
        });

    } catch (erro) {

        console.error(
            "❌ Erro no login:",
            erro
        );

        return res.status(500).json({

            sucesso: false,

            erro:
                "Erro interno ao realizar login."
        });
    }
});

// ======================================================
// LOGIN COM GOOGLE
// ======================================================

app.post("/auth/google", async (req, res) => {

    try {

        const {
            credential
        } = req.body;

        console.log(
            "📥 Login com Google recebido."
        );

        // O Google Identity Services
        // envia o ID Token neste campo.
        if (!credential) {

            return res.status(400).json({

                sucesso: false,

                erro:
                    "Token do Google não foi enviado."
            });
        }

        // ------------------------------------------------
        // VERIFICA O TOKEN NO GOOGLE
        // ------------------------------------------------

        const ticket =
            await googleClient.verifyIdToken({

                idToken:
                    credential,

                audience:
                    GOOGLE_CLIENT_ID
            });

        const payload =
            ticket.getPayload();

        if (!payload) {

            return res.status(401).json({

                sucesso: false,

                erro:
                    "Token do Google inválido."
            });
        }

        // ------------------------------------------------
        // DADOS RECEBIDOS DO GOOGLE
        // ------------------------------------------------

        const googleId =
            payload.sub;

        const nome =
            payload.name || "Usuário";

        const email =
            payload.email?.toLowerCase();

        const foto =
            payload.picture || null;

        const emailVerificado =
            payload.email_verified === true;

        if (!email) {

            return res.status(400).json({

                sucesso: false,

                erro:
                    "O Google não forneceu um e-mail válido."
            });
        }

        // ------------------------------------------------
        // PROCURA O USUÁRIO
        // ------------------------------------------------

        const usuarios =
            lerUsuarios();

        let usuario =
            usuarios.find(
                usuario =>
                    usuario.googleId === googleId
            );

        // ------------------------------------------------
        // SE NÃO ENCONTROU PELO GOOGLE ID,
        // PROCURA PELO E-MAIL
        // ------------------------------------------------

        if (!usuario) {

            usuario =
                usuarios.find(
                    usuario =>
                        usuario.email === email
                );
        }

        // ------------------------------------------------
        // USUÁRIO NOVO
        // ------------------------------------------------

        if (!usuario) {

            usuario = {

                id:
                    Date.now().toString(),

                googleId:
                    googleId,

                nome:
                    nome,

                email:
                    email,

                senha:
                    null,

                foto:
                    foto,

                provedor:
                    "google",

                emailVerificado:
                    emailVerificado
            };

            usuarios.push(usuario);

            salvarUsuarios(usuarios);

            console.log(
                "🆕 Novo usuário criado pelo Google:",
                email
            );

        }

        // ------------------------------------------------
        // USUÁRIO EXISTENTE
        // ------------------------------------------------

        else {

            // Atualiza dados do Google
            usuario.googleId =
                googleId;

            usuario.nome =
                nome;

            usuario.foto =
                foto;

            usuario.emailVerificado =
                emailVerificado;

            // Se ele já possuía conta por e-mail,
            // agora também poderá entrar com Google.
            usuario.provedor =
                usuario.provedor === "email"
                    ? "email_google"
                    : "google";

            salvarUsuarios(usuarios);

            console.log(
                "🔑 Usuário existente entrou pelo Google:",
                email
            );
        }

        // ------------------------------------------------
        // CRIA A SESSÃO
        // ------------------------------------------------

        req.session.usuario = {

            id:
                usuario.id,

            nome:
                usuario.nome,

            email:
                usuario.email,

            foto:
                usuario.foto || null,

            provedor:
                usuario.provedor,

            emailVerificado:
                usuario.emailVerificado
        };

        console.log(
            "✅ Sessão criada para:",
            email
        );

        return res.json({

            sucesso: true,

            mensagem:
                "Login com Google realizado com sucesso.",

            usuario:
                req.session.usuario
        });

    } catch (erro) {

        console.error(
            "❌ ERRO NO LOGIN COM GOOGLE"
        );

        console.error(
            erro
        );

        return res.status(401).json({

            sucesso: false,

            erro:
                "Não foi possível validar o login com Google."
        });
    }
});

// ======================================================
// VERIFICAR SE USUÁRIO ESTÁ LOGADO
// ======================================================

app.get("/auth/me", (req, res) => {

    if (
        !req.session ||
        !req.session.usuario
    ) {

        return res.status(401).json({

            autenticado: false
        });
    }

    return res.json({

        autenticado: true,

        usuario:
            req.session.usuario
    });
});

// ======================================================
// LOGOUT
// ======================================================

app.post("/auth/logout", (req, res) => {

    req.session = null;

    console.log(
        "👋 Usuário saiu da conta."
    );

    return res.json({

        sucesso: true,

        mensagem:
            "Logout realizado com sucesso."
    });
});

// ======================================================
// GEMINI
// ======================================================

if (!process.env.GEMINI_API_KEY) {

    console.error(
        "❌ ERRO: GEMINI_API_KEY não foi encontrada no arquivo .env"
    );

    process.exit(1);
}

const ai = new GoogleGenAI({

    apiKey:
        process.env.GEMINI_API_KEY
});

// ======================================================
// RETRY DO GEMINI
// ======================================================

async function chamarGeminiComRetry(
    config,
    tentativas = 3
) {

    for (
        let i = 0;
        i < tentativas;
        i++
    ) {

        try {

            return await ai.models.generateContent(
                config
            );

        } catch (erro) {

            const eSobrecarga =
                erro.message?.includes("UNAVAILABLE") ||
                erro.message?.includes("503");

            if (
                eSobrecarga &&
                i < tentativas - 1
            ) {

                console.log(
                    `⏳ Modelo sobrecarregado, tentando de novo (${i + 1}/${tentativas})...`
                );

                await new Promise(
                    resolve =>
                        setTimeout(
                            resolve,
                            1500 * (i + 1)
                        )
                );

                continue;
            }

            throw erro;
        }
    }
}

// ======================================================
// ROTAS DE GOOGLE DRIVE / CALENDAR E NOTION
// ======================================================

app.use(
    "/",
    require("./routes/google")
);

app.use(
    "/",
    require("./routes/notion")
);

// ======================================================
// ROTA PRINCIPAL
// ======================================================

app.get("/", (req, res) => {

    res.json({

        status:
            "online",

        mensagem:
            "Backend JoviClass funcionando!"
    });
});

// ======================================================
// ROTA DE TESTE
// ======================================================

app.get("/teste", (req, res) => {

    res.json({

        status:
            "ok",

        mensagem:
            "Rota de teste funcionando!"
    });
});

// ======================================================
// PROMPTS DA IA
// ======================================================

function criarPrompt(
    acao,
    texto
) {

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
//
// IMPORTANTE:
// Agora somente usuários logados podem utilizar a IA.
//

app.post(
    "/ia",
    exigirLogin,
    async (req, res) => {

        console.log(
            "\n======================================"
        );

        console.log(
            "📥 NOVA REQUISIÇÃO PARA A IA"
        );

        console.log(
            "======================================"
        );

        try {

            const {
                acao,
                texto
            } = req.body;

            console.log(
                "Usuário:",
                req.session.usuario.email
            );

            console.log(
                "Ação recebida:",
                acao
            );

            console.log(
                "Quantidade de caracteres:",
                texto
                    ? texto.length
                    : 0
            );

            if (
                !texto ||
                texto.trim() === ""
            ) {

                return res.status(400).json({

                    erro:
                        "Nenhum conteúdo foi enviado."
                });
            }

            const prompt =
                criarPrompt(
                    acao,
                    texto
                );

            if (!prompt) {

                return res.status(400).json({

                    erro:
                        "Ação de IA inválida."
                });
            }

            console.log(
                "✅ Prompt criado."
            );

            console.log(
                "🤖 Enviando conteúdo para o Gemini..."
            );

            const resposta =
                await chamarGeminiComRetry({

                    model:
                        "gemini-3.5-flash",

                    contents:
                        prompt
                });

            console.log(
                "✅ Gemini respondeu!"
            );

            const resultado =
                resposta.text;

            if (!resultado) {

                return res.status(500).json({

                    erro:
                        "O Gemini não retornou nenhum texto."
                });
            }

            console.log(
                "📚 Resultado recebido."
            );

            console.log(
                "======================================\n"
            );

            res.json({

                resultado:
                    resultado
            });

        } catch (erro) {

            console.error(
                "\n======================================"
            );

            console.error(
                "❌ ERRO NO GEMINI"
            );

            console.error(
                "======================================"
            );

            console.error(
                erro
            );

            console.error(
                "======================================\n"
            );

            res.status(500).json({

                erro:
                    erro.message ||
                    "Erro desconhecido ao processar conteúdo com IA."
            });
        }
    }
);

// ======================================================
// ROTA DE VISÃO
// ======================================================
//
// Também exige login.
//

app.post(
    "/identificar-imagem",
    exigirLogin,
    async (req, res) => {

        console.log(
            "\n======================================"
        );

        console.log(
            "📥 NOVA REQUISIÇÃO DE IDENTIFICAÇÃO DE IMAGEM"
        );

        console.log(
            "======================================"
        );

        try {

            const {
                imagemBase64
            } = req.body;

            if (!imagemBase64) {

                return res.status(400).json({

                    erro:
                        "Nenhuma imagem foi enviada."
                });
            }

            console.log(
                "🤖 Enviando imagem para o Gemini..."
            );

            const resposta =
                await chamarGeminiComRetry({

                    model:
                        "gemini-3.5-flash",

                    contents: [

                        {

                            role:
                                "user",

                            parts: [

                                {

                                    text:
                                        "Classifique esta imagem em uma única palavra: 'lousa', 'caderno' ou 'outro'. Responda só a palavra, sem pontuação."
                                },

                                {

                                    inlineData: {

                                        mimeType:
                                            "image/jpeg",

                                        data:
                                            imagemBase64
                                    }
                                }
                            ]
                        }
                    ]
                });

            const tipo =
                resposta.text
                    ?.trim()
                    .toLowerCase() ||
                "outro";

            console.log(
                "✅ Classificação:",
                tipo
            );

            console.log(
                "======================================\n"
            );

            res.json({

                tipo:
                    tipo
            });

        } catch (erro) {

            console.error(
                "❌ ERRO NA IDENTIFICAÇÃO DE IMAGEM"
            );

            console.error(
                erro
            );

            res.status(500).json({

                erro:
                    erro.message ||
                    "Erro ao identificar a imagem."
            });
        }
    }
);

// ======================================================
// TESTE DO GEMINI
// ======================================================
//
// Também exige login.
//

app.get(
    "/teste-gemini",
    exigirLogin,
    async (req, res) => {

        try {

            console.log(
                "🤖 Testando Gemini..."
            );

            const resposta =
                await chamarGeminiComRetry({

                    model:
                        "gemini-3.5-flash",

                    contents:
                        "Responda apenas: Gemini funcionando!"
                });

            console.log(
                "✅ Resposta do Gemini:",
                resposta.text
            );

            res.json({

                sucesso:
                    true,

                resposta:
                    resposta.text
            });

        } catch (erro) {

            console.error(
                "❌ ERRO NO GEMINI:"
            );

            console.error(
                erro
            );

            res.status(500).json({

                sucesso:
                    false,

                erro:
                    erro.message
            });
        }
    }
);

// ======================================================
// INICIAR SERVIDOR
// ======================================================

app.listen(
    PORT,
    () => {

        console.log(
            "\n======================================"
        );

        console.log(
            "🚀 JoviClass Backend"
        );

        console.log(
            "======================================"
        );

        console.log(
            `🌐 Servidor: http://localhost:${PORT}`
        );

        console.log(
            `🧪 Teste:    http://localhost:${PORT}/teste`
        );

        console.log(
            "🔐 Autenticação: ativa"
        );

        console.log(
            "🔵 Google Login: configurado"
        );

        console.log(
            "🤖 Gemini: conectado"
        );

        console.log(
            "======================================\n"
        );
    }
);