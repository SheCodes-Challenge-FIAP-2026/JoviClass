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

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// ------------------------------------------------------
// CORS
// ------------------------------------------------------

const origensPermitidas = [
    "http://localhost:5501",
    "http://127.0.0.1:5501",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5500",
    "http://127.0.0.1:5500"
];

app.use(
    cors({
        origin: function (origin, callback) {

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
        sameSite: "lax",
        secure: false,
        maxAge: 7 * 24 * 60 * 60 * 1000
    })
);

// ======================================================
// BANCO DE USUÁRIOS SIMPLES
// ======================================================

const caminhoUsuarios = path.join(
    __dirname,
    "usuarios.json"
);

if (!fs.existsSync(caminhoUsuarios)) {
    fs.writeFileSync(
        caminhoUsuarios,
        JSON.stringify([], null, 2)
    );
}

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

function salvarUsuarios(usuarios) {

    fs.writeFileSync(
        caminhoUsuarios,
        JSON.stringify(usuarios, null, 2)
    );
}

// ------------------------------------------------------
// MONTA O OBJETO DE SESSÃO A PARTIR DE UM USUÁRIO
// ------------------------------------------------------
//
// Centralizado aqui pra garantir que toda rota que cria
// ou atualiza a sessão devolva sempre o mesmo formato
// (nome, curso, foto, possuiSenha etc.)
//

function montarSessao(usuario) {

    return {

        id: usuario.id,

        nome: usuario.nome,

        curso: usuario.curso || "",

        email: usuario.email,

        foto: usuario.foto || null,

        provedor: usuario.provedor,

        emailVerificado: usuario.emailVerificado || false,

        // Nunca colocamos o hash da senha na sessão,
        // só um booleano dizendo se existe uma senha
        // própria cadastrada (usuários só-Google não têm).
        possuiSenha: !!usuario.senha
    };
}

// ======================================================
// VERIFICAÇÃO DE E-MAIL POR CÓDIGO
// ======================================================

const nodemailer = require("nodemailer");

const transportadorEmail = nodemailer.createTransport({
    service: "gmail",

    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

function gerarCodigoVerificacao() {

    return String(
        Math.floor(100000 + Math.random() * 900000)
    );
}

async function enviarCodigoVerificacao(destinatario, codigo) {

    // Se as credenciais de e-mail não estiverem configuradas
    // no .env, caímos num "modo dev": o código só aparece
    // no console, sem precisar de um provedor de e-mail real.
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {

        console.log(
            `✉️  [MODO DEV] Código de verificação para ${destinatario}: ${codigo}`
        );

        return;
    }

    await transportadorEmail.sendMail({

        from: `"JoviClass" <${process.env.EMAIL_USER}>`,

        to: destinatario,

        subject: "Confirme seu e-mail — JoviClass",

        html: `
            <div style="font-family: Arial, sans-serif; max-width: 420px; margin: 0 auto;">
                <h2 style="color:#000fb0; margin-bottom: 8px;">Confirme seu e-mail</h2>
                <p style="color:#333; font-size: 14px;">
                    Use o código abaixo para confirmar sua conta no JoviClass:
                </p>
                <p style="font-size: 30px; font-weight: 800; letter-spacing: 8px; color:#000fb0; margin: 18px 0;">
                    ${codigo}
                </p>
                <p style="color:#888; font-size: 12.5px;">
                    Esse código expira em 10 minutos. Se você não pediu isso, pode ignorar este e-mail.
                </p>
            </div>
        `
    });
}

// ------------------------------------------------------
// E-MAIL DE CONFIRMAÇÃO DE CADASTRO (PASSO 2 DO CADASTRO)
// ------------------------------------------------------
//
// Mesmo formato do código de verificação de e-mail, mas usado
// especificamente no fluxo de "criar conta com código", antes
// de a conta existir de fato.
//

async function enviarCodigoConfirmacaoCadastro(destinatario, codigo) {

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {

        console.log(
            `✉️  [MODO DEV] Código de confirmação de cadastro para ${destinatario}: ${codigo}`
        );

        return;
    }

    await transportadorEmail.sendMail({

        from: `"JoviClass" <${process.env.EMAIL_USER}>`,

        to: destinatario,

        subject: "Confirme seu cadastro — JoviClass",

        html: `
            <div style="font-family: Arial, sans-serif; max-width: 420px; margin: 0 auto;">
                <h2 style="color:#000fb0; margin-bottom: 8px;">Confirme sua conta</h2>
                <p style="color:#333; font-size: 14px;">
                    Use o código abaixo para concluir a criação da sua conta no JoviClass:
                </p>
                <p style="font-size: 30px; font-weight: 800; letter-spacing: 8px; color:#000fb0; margin: 18px 0;">
                    ${codigo}
                </p>
                <p style="color:#888; font-size: 12.5px;">
                    Esse código expira em 10 minutos. Se você não pediu isso, pode ignorar este e-mail.
                </p>
            </div>
        `
    });
}

// ------------------------------------------------------
// E-MAIL DE RECUPERAÇÃO DE SENHA
// ------------------------------------------------------
//
// Mesmo formato do código de confirmação de e-mail, mas com
// assunto e texto diferentes pra deixar claro que é sobre
// redefinir a senha, não sobre confirmar a conta.
//

async function enviarCodigoRecuperacaoSenha(destinatario, codigo) {

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {

        console.log(
            `✉️  [MODO DEV] Código de recuperação de senha para ${destinatario}: ${codigo}`
        );

        return;
    }

    await transportadorEmail.sendMail({

        from: `"JoviClass" <${process.env.EMAIL_USER}>`,

        to: destinatario,

        subject: "Recupere sua senha — JoviClass",

        html: `
            <div style="font-family: Arial, sans-serif; max-width: 420px; margin: 0 auto;">
                <h2 style="color:#000fb0; margin-bottom: 8px;">Redefinir senha</h2>
                <p style="color:#333; font-size: 14px;">
                    Use o código abaixo para criar uma nova senha no JoviClass:
                </p>
                <p style="font-size: 30px; font-weight: 800; letter-spacing: 8px; color:#000fb0; margin: 18px 0;">
                    ${codigo}
                </p>
                <p style="color:#888; font-size: 12.5px;">
                    Esse código expira em 10 minutos. Se você não pediu isso, pode ignorar este e-mail — sua senha atual continua a mesma.
                </p>
            </div>
        `
    });
}

// ======================================================
// FUNÇÕES DE AUTENTICAÇÃO
// ======================================================

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
//
// OBS: esta rota antiga cria a conta direto, sem confirmar
// o e-mail antes. O fluxo atual do frontend usa as duas
// rotas novas logo abaixo (/auth/cadastro/enviar-codigo e
// /auth/cadastro/confirmar). Deixamos esta aqui por
// compatibilidade, mas ela não é mais chamada pela tela
// de cadastro.
//

app.post("/auth/cadastro", async (req, res) => {

    try {

        const {
            nome,
            email,
            senha
        } = req.body;

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

        if (senha.length < 6) {

            return res.status(400).json({
                sucesso: false,
                erro: "A senha deve possuir pelo menos 6 caracteres."
            });
        }

        const usuarios = lerUsuarios();

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

        const senhaHash =
            await bcrypt.hash(senha, 10);

        const codigo = gerarCodigoVerificacao();
        const codigoHash = await bcrypt.hash(codigo, 10);

        const novoUsuario = {

            id: Date.now().toString(),

            nome: nome.trim(),

            curso: "",

            email: emailNormalizado,

            senha: senhaHash,

            foto: null,

            provedor: "email",

            emailVerificado: false,

            codigoVerificacao: codigoHash,

            codigoVerificacaoExpira: Date.now() + 10 * 60 * 1000,

            codigoRecuperacaoSenha: null,

            codigoRecuperacaoSenhaExpira: null
        };

        usuarios.push(novoUsuario);

        salvarUsuarios(usuarios);

        req.session.usuario = montarSessao(novoUsuario);

        await enviarCodigoVerificacao(novoUsuario.email, codigo);

        console.log(
            "✅ Novo usuário cadastrado:",
            novoUsuario.email
        );

        return res.json({

            sucesso: true,

            mensagem: "Cadastro realizado com sucesso.",

            usuario: req.session.usuario
        });

    } catch (erro) {

        console.error(
            "❌ Erro no cadastro:",
            erro
        );

        return res.status(500).json({

            sucesso: false,

            erro: "Erro interno ao realizar cadastro."
        });
    }
});

// ======================================================
// CADASTRO EM 2 PASSOS COM CÓDIGO POR E-MAIL
// ======================================================
//
// Fluxo (o mesmo espírito da recuperação de senha, mas
// pra criar conta):
//
// 1) POST /auth/cadastro/enviar-codigo  -> valida os dados,
//    NÃO cria a conta ainda, guarda tudo temporariamente
//    em memória e manda o código de 6 dígitos por e-mail.
//
// 2) POST /auth/cadastro/confirmar      -> confere o código;
//    se estiver certo, cria a conta de verdade (já com
//    e-mail marcado como verificado) e abre a sessão.
//
// Os dados pendentes ficam num Map em memória, com
// expiração de 10 minutos — se o servidor reiniciar antes
// da confirmação, o usuário só precisa pedir o código de
// novo (o formulário já tem "Reenviar código").
//

const cadastrosPendentes = new Map();

function limparCadastrosPendentesExpirados() {

    const agora = Date.now();

    for (const [email, pendente] of cadastrosPendentes) {

        if (agora > pendente.expira) {
            cadastrosPendentes.delete(email);
        }
    }
}

// ------------------------------------------------------
// PASSO 1 — VALIDAR DADOS E ENVIAR CÓDIGO
// ------------------------------------------------------

app.post("/auth/cadastro/enviar-codigo", async (req, res) => {

    try {

        limparCadastrosPendentesExpirados();

        const {
            nome,
            email,
            senha
        } = req.body;

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

        if (senha.length < 6) {

            return res.status(400).json({

                sucesso: false,

                erro: "A senha deve possuir pelo menos 6 caracteres."
            });
        }

        const emailNormalizado =
            email.trim().toLowerCase();

        const usuarios = lerUsuarios();

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

        const senhaHash =
            await bcrypt.hash(senha, 10);

        const codigo = gerarCodigoVerificacao();
        const codigoHash = await bcrypt.hash(codigo, 10);

        cadastrosPendentes.set(emailNormalizado, {

            nome: nome.trim(),

            email: emailNormalizado,

            senhaHash,

            codigoHash,

            expira: Date.now() + 10 * 60 * 1000
        });

        await enviarCodigoConfirmacaoCadastro(
            emailNormalizado,
            codigo
        );

        console.log(
            "📨 Código de confirmação de cadastro enviado para:",
            emailNormalizado
        );

        return res.json({

            sucesso: true,

            mensagem: "Código enviado para o seu e-mail."
        });

    } catch (erro) {

        console.error(
            "❌ Erro ao enviar código de cadastro:",
            erro
        );

        return res.status(500).json({

            sucesso: false,

            erro: "Erro interno ao enviar o código de confirmação."
        });
    }
});

// ------------------------------------------------------
// PASSO 2 — CONFERIR O CÓDIGO E CRIAR A CONTA DE VERDADE
// ------------------------------------------------------

app.post("/auth/cadastro/confirmar", async (req, res) => {

    try {

        limparCadastrosPendentesExpirados();

        const {
            email,
            codigo
        } = req.body;

        if (
            !email ||
            !codigo
        ) {

            return res.status(400).json({

                sucesso: false,

                erro: "Informe o e-mail e o código."
            });
        }

        const emailNormalizado =
            email.trim().toLowerCase();

        const pendente =
            cadastrosPendentes.get(emailNormalizado);

        if (!pendente) {

            return res.status(400).json({

                sucesso: false,

                erro: "Nenhum cadastro pendente para este e-mail. Preencha o formulário novamente."
            });
        }

        if (Date.now() > pendente.expira) {

            cadastrosPendentes.delete(emailNormalizado);

            return res.status(400).json({

                sucesso: false,

                erro: "Código expirado. Solicite um novo."
            });
        }

        const codigoCorreto =
            await bcrypt.compare(
                String(codigo).trim(),
                pendente.codigoHash
            );

        if (!codigoCorreto) {

            return res.status(401).json({

                sucesso: false,

                erro: "Código incorreto."
            });
        }

        // Confere de novo se o e-mail não foi cadastrado
        // por outro caminho enquanto o código estava pendente
        // (ex: login com Google no meio do processo).
        const usuarios = lerUsuarios();

        const usuarioExistente =
            usuarios.find(
                usuario =>
                    usuario.email === emailNormalizado
            );

        if (usuarioExistente) {

            cadastrosPendentes.delete(emailNormalizado);

            return res.status(409).json({

                sucesso: false,

                erro: "Este e-mail já está cadastrado."
            });
        }

        const novoUsuario = {

            id: Date.now().toString(),

            nome: pendente.nome,

            curso: "",

            email: emailNormalizado,

            senha: pendente.senhaHash,

            foto: null,

            provedor: "email",

            // Já veio confirmado pelo código, então
            // marcamos como verificado direto.
            emailVerificado: true,

            codigoVerificacao: null,

            codigoVerificacaoExpira: null,

            codigoRecuperacaoSenha: null,

            codigoRecuperacaoSenhaExpira: null
        };

        usuarios.push(novoUsuario);

        salvarUsuarios(usuarios);

        cadastrosPendentes.delete(emailNormalizado);

        req.session.usuario = montarSessao(novoUsuario);

        console.log(
            "✅ Cadastro confirmado e conta criada:",
            novoUsuario.email
        );

        return res.json({

            sucesso: true,

            mensagem: "Conta criada com sucesso.",

            usuario: req.session.usuario
        });

    } catch (erro) {

        console.error(
            "❌ Erro ao confirmar cadastro:",
            erro
        );

        return res.status(500).json({

            sucesso: false,

            erro: "Erro interno ao confirmar o cadastro."
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

                erro: "Informe o e-mail e a senha."
            });
        }

        const emailNormalizado =
            email.trim().toLowerCase();

        const usuarios = lerUsuarios();

        const usuario =
            usuarios.find(
                usuario =>
                    usuario.email === emailNormalizado
            );

        if (!usuario) {

            return res.status(401).json({

                sucesso: false,

                erro: "E-mail ou senha incorretos."
            });
        }

        if (!usuario.senha) {

            return res.status(401).json({

                sucesso: false,

                erro: "Esta conta utiliza o login com Google."
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

                erro: "E-mail ou senha incorretos."
            });
        }

        req.session.usuario = montarSessao(usuario);

        console.log(
            "✅ Login realizado:",
            usuario.email
        );

        return res.json({

            sucesso: true,

            mensagem: "Login realizado com sucesso.",

            usuario: req.session.usuario
        });

    } catch (erro) {

        console.error(
            "❌ Erro no login:",
            erro
        );

        return res.status(500).json({

            sucesso: false,

            erro: "Erro interno ao realizar login."
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

        if (!credential) {

            return res.status(400).json({

                sucesso: false,

                erro: "Token do Google não foi enviado."
            });
        }

        const ticket =
            await googleClient.verifyIdToken({

                idToken: credential,

                audience: GOOGLE_CLIENT_ID
            });

        const payload =
            ticket.getPayload();

        if (!payload) {

            return res.status(401).json({

                sucesso: false,

                erro: "Token do Google inválido."
            });
        }

        const googleId = payload.sub;
        const nome = payload.name || "Usuário";
        const email = payload.email?.toLowerCase();
        const foto = payload.picture || null;
        const emailVerificado = payload.email_verified === true;

        if (!email) {

            return res.status(400).json({

                sucesso: false,

                erro: "O Google não forneceu um e-mail válido."
            });
        }

        const usuarios = lerUsuarios();

        let usuario =
            usuarios.find(
                usuario =>
                    usuario.googleId === googleId
            );

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

                id: Date.now().toString(),

                googleId: googleId,

                nome: nome,

                curso: "",

                email: email,

                senha: null,

                foto: foto,

                provedor: "google",

                emailVerificado: emailVerificado
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

            usuario.googleId = googleId;
            usuario.nome = nome;
            usuario.foto = foto;
            usuario.emailVerificado = emailVerificado;

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

        req.session.usuario = montarSessao(usuario);

        console.log(
            "✅ Sessão criada para:",
            email
        );

        return res.json({

            sucesso: true,

            mensagem: "Login com Google realizado com sucesso.",

            usuario: req.session.usuario
        });

    } catch (erro) {

        console.error(
            "❌ ERRO NO LOGIN COM GOOGLE"
        );

        console.error(erro);

        return res.status(401).json({

            sucesso: false,

            erro: "Não foi possível validar o login com Google."
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

        usuario: req.session.usuario
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

        mensagem: "Logout realizado com sucesso."
    });
});

// ======================================================
// VERIFICAR CÓDIGO DE E-MAIL
// ======================================================

app.post("/auth/verificar-email", exigirLogin, async (req, res) => {

    try {

        const { codigo } = req.body;

        if (!codigo) {

            return res.status(400).json({

                sucesso: false,

                erro: "Informe o código recebido por e-mail."
            });
        }

        const usuarios = lerUsuarios();

        const indice =
            usuarios.findIndex(
                usuario =>
                    usuario.id === req.session.usuario.id
            );

        if (indice === -1) {

            return res.status(404).json({

                sucesso: false,

                erro: "Usuário não encontrado."
            });
        }

        const usuario = usuarios[indice];

        if (usuario.emailVerificado) {

            return res.json({

                sucesso: true,

                usuario: montarSessao(usuario)
            });
        }

        if (
            !usuario.codigoVerificacao ||
            !usuario.codigoVerificacaoExpira
        ) {

            return res.status(400).json({

                sucesso: false,

                erro: "Nenhum código pendente. Solicite um novo."
            });
        }

        if (Date.now() > usuario.codigoVerificacaoExpira) {

            return res.status(400).json({

                sucesso: false,

                erro: "Código expirado. Solicite um novo."
            });
        }

        const codigoCorreto =
            await bcrypt.compare(
                String(codigo).trim(),
                usuario.codigoVerificacao
            );

        if (!codigoCorreto) {

            return res.status(401).json({

                sucesso: false,

                erro: "Código incorreto."
            });
        }

        usuario.emailVerificado = true;
        usuario.codigoVerificacao = null;
        usuario.codigoVerificacaoExpira = null;

        salvarUsuarios(usuarios);

        req.session.usuario = montarSessao(usuario);

        console.log(
            "✅ E-mail verificado:",
            usuario.email
        );

        return res.json({

            sucesso: true,

            usuario: req.session.usuario
        });

    } catch (erro) {

        console.error(
            "❌ Erro ao verificar e-mail:",
            erro
        );

        return res.status(500).json({

            sucesso: false,

            erro: "Erro interno ao verificar e-mail."
        });
    }
});

// ======================================================
// REENVIAR CÓDIGO DE VERIFICAÇÃO
// ======================================================

app.post("/auth/reenviar-codigo", exigirLogin, async (req, res) => {

    try {

        const usuarios = lerUsuarios();

        const indice =
            usuarios.findIndex(
                usuario =>
                    usuario.id === req.session.usuario.id
            );

        if (indice === -1) {

            return res.status(404).json({

                sucesso: false,

                erro: "Usuário não encontrado."
            });
        }

        const usuario = usuarios[indice];

        if (usuario.emailVerificado) {

            return res.json({

                sucesso: true,

                mensagem: "Este e-mail já está verificado."
            });
        }

        const codigo = gerarCodigoVerificacao();

        usuario.codigoVerificacao =
            await bcrypt.hash(codigo, 10);

        usuario.codigoVerificacaoExpira =
            Date.now() + 10 * 60 * 1000;

        salvarUsuarios(usuarios);

        await enviarCodigoVerificacao(usuario.email, codigo);

        console.log(
            "🔁 Código reenviado para:",
            usuario.email
        );

        return res.json({

            sucesso: true,

            mensagem: "Novo código enviado."
        });

    } catch (erro) {

        console.error(
            "❌ Erro ao reenviar código:",
            erro
        );

        return res.status(500).json({

            sucesso: false,

            erro: "Erro interno ao reenviar o código."
        });
    }
});

// ======================================================
// RECUPERAÇÃO DE SENHA (ESQUECI MINHA SENHA)
// ======================================================
//
// Fluxo em 3 passos, todos SEM exigir login (a pessoa está
// de fora porque esqueceu a senha):
//
// 1) POST /auth/recuperar-senha        -> gera e envia o código
// 2) POST /auth/verificar-codigo-recuperacao -> confere o código
// 3) POST /auth/redefinir-senha        -> troca a senha de fato
//
// O código usa o mesmo padrão do código de verificação de
// e-mail: 6 dígitos, guardado com hash (bcrypt) e expira em
// 10 minutos.
//

// ------------------------------------------------------
// PASSO 1 — ENVIAR CÓDIGO PARA O E-MAIL
// ------------------------------------------------------

app.post("/auth/recuperar-senha", async (req, res) => {

    try {

        const { email } = req.body;

        if (!email) {

            return res.status(400).json({

                sucesso: false,

                erro: "Informe seu e-mail."
            });
        }

        const emailNormalizado =
            email.trim().toLowerCase();

        const usuarios = lerUsuarios();

        const indice =
            usuarios.findIndex(
                usuario =>
                    usuario.email === emailNormalizado
            );

        if (indice === -1) {

            return res.status(404).json({

                sucesso: false,

                erro: "Não encontramos uma conta com este e-mail."
            });
        }

        const codigo = gerarCodigoVerificacao();
        const codigoHash = await bcrypt.hash(codigo, 10);

        usuarios[indice].codigoRecuperacaoSenha = codigoHash;

        usuarios[indice].codigoRecuperacaoSenhaExpira =
            Date.now() + 10 * 60 * 1000;

        salvarUsuarios(usuarios);

        await enviarCodigoRecuperacaoSenha(
            emailNormalizado,
            codigo
        );

        console.log(
            "🔐 Código de recuperação enviado para:",
            emailNormalizado
        );

        return res.json({

            sucesso: true,

            mensagem: "Código enviado para o seu e-mail."
        });

    } catch (erro) {

        console.error(
            "❌ Erro ao solicitar recuperação de senha:",
            erro
        );

        return res.status(500).json({

            sucesso: false,

            erro: "Erro interno ao solicitar recuperação de senha."
        });
    }
});

// ------------------------------------------------------
// PASSO 2 — CONFERIR O CÓDIGO RECEBIDO
// ------------------------------------------------------

app.post("/auth/verificar-codigo-recuperacao", async (req, res) => {

    try {

        const { email, codigo } = req.body;

        if (!email || !codigo) {

            return res.status(400).json({

                sucesso: false,

                erro: "Informe o e-mail e o código."
            });
        }

        const emailNormalizado =
            email.trim().toLowerCase();

        const usuarios = lerUsuarios();

        const indice =
            usuarios.findIndex(
                usuario =>
                    usuario.email === emailNormalizado
            );

        if (indice === -1) {

            return res.status(404).json({

                sucesso: false,

                erro: "Não encontramos uma conta com este e-mail."
            });
        }

        const usuario = usuarios[indice];

        if (
            !usuario.codigoRecuperacaoSenha ||
            !usuario.codigoRecuperacaoSenhaExpira
        ) {

            return res.status(400).json({

                sucesso: false,

                erro: "Nenhum código pendente. Solicite a recuperação novamente."
            });
        }

        if (Date.now() > usuario.codigoRecuperacaoSenhaExpira) {

            return res.status(400).json({

                sucesso: false,

                erro: "Código expirado. Solicite um novo."
            });
        }

        const codigoCorreto =
            await bcrypt.compare(
                String(codigo).trim(),
                usuario.codigoRecuperacaoSenha
            );

        if (!codigoCorreto) {

            return res.status(401).json({

                sucesso: false,

                erro: "Código incorreto."
            });
        }

        return res.json({

            sucesso: true
        });

    } catch (erro) {

        console.error(
            "❌ Erro ao verificar código de recuperação:",
            erro
        );

        return res.status(500).json({

            sucesso: false,

            erro: "Erro interno ao verificar o código."
        });
    }
});

// ------------------------------------------------------
// PASSO 3 — DEFINIR A NOVA SENHA
// ------------------------------------------------------
//
// Confere o código de novo (garante que ninguém pule direto
// pra essa rota sem ter passado pelo passo 2) e só então
// troca a senha.
//

app.post("/auth/redefinir-senha", async (req, res) => {

    try {

        const { email, codigo, senhaNova } = req.body;

        if (!email || !codigo || !senhaNova) {

            return res.status(400).json({

                sucesso: false,

                erro: "Preencha todos os campos."
            });
        }

        if (senhaNova.length < 6) {

            return res.status(400).json({

                sucesso: false,

                erro: "A nova senha deve possuir pelo menos 6 caracteres."
            });
        }

        const emailNormalizado =
            email.trim().toLowerCase();

        const usuarios = lerUsuarios();

        const indice =
            usuarios.findIndex(
                usuario =>
                    usuario.email === emailNormalizado
            );

        if (indice === -1) {

            return res.status(404).json({

                sucesso: false,

                erro: "Não encontramos uma conta com este e-mail."
            });
        }

        const usuario = usuarios[indice];

        if (
            !usuario.codigoRecuperacaoSenha ||
            !usuario.codigoRecuperacaoSenhaExpira
        ) {

            return res.status(400).json({

                sucesso: false,

                erro: "Solicite a recuperação de senha novamente."
            });
        }

        if (Date.now() > usuario.codigoRecuperacaoSenhaExpira) {

            return res.status(400).json({

                sucesso: false,

                erro: "Código expirado. Solicite um novo."
            });
        }

        const codigoCorreto =
            await bcrypt.compare(
                String(codigo).trim(),
                usuario.codigoRecuperacaoSenha
            );

        if (!codigoCorreto) {

            return res.status(401).json({

                sucesso: false,

                erro: "Código incorreto."
            });
        }

        usuario.senha =
            await bcrypt.hash(senhaNova, 10);

        // Se a conta era só do Google, agora também pode
        // entrar com e-mail e senha (mesma regra usada na
        // troca de senha pelo perfil).
        if (usuario.provedor === "google") {
            usuario.provedor = "email_google";
        }

        usuario.codigoRecuperacaoSenha = null;
        usuario.codigoRecuperacaoSenhaExpira = null;

        salvarUsuarios(usuarios);

        console.log(
            "🔐 Senha redefinida via recuperação para:",
            usuario.email
        );

        return res.json({

            sucesso: true,

            mensagem: "Senha redefinida com sucesso."
        });

    } catch (erro) {

        console.error(
            "❌ Erro ao redefinir senha:",
            erro
        );

        return res.status(500).json({

            sucesso: false,

            erro: "Erro interno ao redefinir a senha."
        });
    }
});

// ======================================================
// PERFIL — EDITAR NOME / CURSO / E-MAIL
// ======================================================

app.put("/perfil", exigirLogin, async (req, res) => {

    try {

        const {
            nome,
            curso,
            email
        } = req.body;

        if (!nome || !email) {

            return res.status(400).json({

                sucesso: false,

                erro: "Informe nome e e-mail."
            });
        }

        const emailValido =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

        if (!emailValido) {

            return res.status(400).json({

                sucesso: false,

                erro: "Informe um e-mail válido."
            });
        }

        const emailNormalizado =
            email.trim().toLowerCase();

        const usuarios = lerUsuarios();

        const indice =
            usuarios.findIndex(
                usuario =>
                    usuario.id === req.session.usuario.id
            );

        if (indice === -1) {

            return res.status(404).json({

                sucesso: false,

                erro: "Usuário não encontrado."
            });
        }

        // Se o e-mail mudou, garante que não pertence
        // a outra conta.
        if (emailNormalizado !== usuarios[indice].email) {

            const emailEmUso =
                usuarios.some(
                    (usuario, i) =>
                        i !== indice &&
                        usuario.email === emailNormalizado
                );

            if (emailEmUso) {

                return res.status(409).json({

                    sucesso: false,

                    erro: "Este e-mail já está sendo usado por outra conta."
                });
            }
        }

        usuarios[indice].nome = nome.trim();
        usuarios[indice].curso = (curso || "").trim();
        usuarios[indice].email = emailNormalizado;

        salvarUsuarios(usuarios);

        req.session.usuario = montarSessao(usuarios[indice]);

        console.log(
            "✏️ Perfil atualizado:",
            usuarios[indice].email
        );

        return res.json({

            sucesso: true,

            usuario: req.session.usuario
        });

    } catch (erro) {

        console.error(
            "❌ Erro ao atualizar perfil:",
            erro
        );

        return res.status(500).json({

            sucesso: false,

            erro: "Erro interno ao atualizar perfil."
        });
    }
});

// ======================================================
// PERFIL — TROCAR SENHA
// ======================================================

app.post("/perfil/senha", exigirLogin, async (req, res) => {

    try {

        const {
            senhaAtual,
            senhaNova
        } = req.body;

        if (
            !senhaNova ||
            senhaNova.length < 6
        ) {

            return res.status(400).json({

                sucesso: false,

                erro: "A nova senha deve possuir pelo menos 6 caracteres."
            });
        }

        const usuarios = lerUsuarios();

        const indice =
            usuarios.findIndex(
                usuario =>
                    usuario.id === req.session.usuario.id
            );

        if (indice === -1) {

            return res.status(404).json({

                sucesso: false,

                erro: "Usuário não encontrado."
            });
        }

        const usuario = usuarios[indice];

        // Se o usuário já tinha senha própria,
        // exige a senha atual pra trocar.
        if (usuario.senha) {

            if (!senhaAtual) {

                return res.status(400).json({

                    sucesso: false,

                    erro: "Informe sua senha atual."
                });
            }

            const senhaCorreta =
                await bcrypt.compare(
                    senhaAtual,
                    usuario.senha
                );

            if (!senhaCorreta) {

                return res.status(401).json({

                    sucesso: false,

                    erro: "Senha atual incorreta."
                });
            }
        }

        usuario.senha =
            await bcrypt.hash(senhaNova, 10);

        // Se a conta era só do Google, agora também
        // pode entrar com e-mail e senha.
        if (usuario.provedor === "google") {
            usuario.provedor = "email_google";
        }

        salvarUsuarios(usuarios);

        req.session.usuario = montarSessao(usuario);

        console.log(
            "🔐 Senha atualizada para:",
            usuario.email
        );

        return res.json({

            sucesso: true,

            mensagem: "Senha atualizada com sucesso.",

            usuario: req.session.usuario
        });

    } catch (erro) {

        console.error(
            "❌ Erro ao trocar senha:",
            erro
        );

        return res.status(500).json({

            sucesso: false,

            erro: "Erro interno ao trocar a senha."
        });
    }
});

// ======================================================
// PERFIL — ATUALIZAR FOTO
// ======================================================

app.post("/perfil/foto", exigirLogin, (req, res) => {

    try {

        const {
            foto
        } = req.body;

        if (!foto) {

            return res.status(400).json({

                sucesso: false,

                erro: "Nenhuma imagem foi enviada."
            });
        }

        const usuarios = lerUsuarios();

        const indice =
            usuarios.findIndex(
                usuario =>
                    usuario.id === req.session.usuario.id
            );

        if (indice === -1) {

            return res.status(404).json({

                sucesso: false,

                erro: "Usuário não encontrado."
            });
        }

        usuarios[indice].foto = foto;

        salvarUsuarios(usuarios);

        req.session.usuario = montarSessao(usuarios[indice]);

        return res.json({

            sucesso: true,

            usuario: req.session.usuario
        });

    } catch (erro) {

        console.error(
            "❌ Erro ao atualizar foto:",
            erro
        );

        return res.status(500).json({

            sucesso: false,

            erro: "Erro interno ao atualizar a foto."
        });
    }
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

    apiKey: process.env.GEMINI_API_KEY
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

        status: "online",

        mensagem: "Backend JoviClass funcionando!"
    });
});

// ======================================================
// ROTA DE TESTE
// ======================================================

app.get("/teste", (req, res) => {

    res.json({

        status: "ok",

        mensagem: "Rota de teste funcionando!"
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

                    erro: "Nenhum conteúdo foi enviado."
                });
            }

            const prompt =
                criarPrompt(
                    acao,
                    texto
                );

            if (!prompt) {

                return res.status(400).json({

                    erro: "Ação de IA inválida."
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

                    model: "gemini-3.5-flash",

                    contents: prompt
                });

            console.log(
                "✅ Gemini respondeu!"
            );

            const resultado =
                resposta.text;

            if (!resultado) {

                return res.status(500).json({

                    erro: "O Gemini não retornou nenhum texto."
                });
            }

            console.log(
                "📚 Resultado recebido."
            );

            console.log(
                "======================================\n"
            );

            res.json({

                resultado: resultado
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

            console.error(erro);

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

                    erro: "Nenhuma imagem foi enviada."
                });
            }

            console.log(
                "🤖 Enviando imagem para o Gemini..."
            );

            const resposta =
                await chamarGeminiComRetry({

                    model: "gemini-3.5-flash",

                    contents: [

                        {

                            role: "user",

                            parts: [

                                {

                                    text:
                                        "Classifique esta imagem em uma única palavra: 'lousa', 'caderno' ou 'outro'. Responda só a palavra, sem pontuação."
                                },

                                {

                                    inlineData: {

                                        mimeType: "image/jpeg",

                                        data: imagemBase64
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

                tipo: tipo
            });

        } catch (erro) {

            console.error(
                "❌ ERRO NA IDENTIFICAÇÃO DE IMAGEM"
            );

            console.error(erro);

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

                    model: "gemini-3.5-flash",

                    contents: "Responda apenas: Gemini funcionando!"
                });

            console.log(
                "✅ Resposta do Gemini:",
                resposta.text
            );

            res.json({

                sucesso: true,

                resposta: resposta.text
            });

        } catch (erro) {

            console.error(
                "❌ ERRO NO GEMINI:"
            );

            console.error(erro);

            res.status(500).json({

                sucesso: false,

                erro: erro.message
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