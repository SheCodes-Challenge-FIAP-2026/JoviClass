/* =========================================================
   URL BASE DA API
========================================================= */

/*
    IMPORTANTE:

    Usamos o mesmo host que a página está sendo servida
    (localhost ou 127.0.0.1), em vez de fixar "localhost".

    Isso evita que o navegador trate frontend e backend
    como sites diferentes, o que faz o cookie de sessão
    ser recusado (SameSite) mesmo o login dando certo
    no servidor.
*/

const API_BASE =
    `http://${window.location.hostname}:3000`;


/* =========================================================
   MENU HAMBURGER
========================================================= */

const hamburger = document.getElementById("hamburger");
const menuLinks = document.getElementById("menuLinks");

if (hamburger && menuLinks) {
    hamburger.addEventListener("click", () => {
        menuLinks.classList.toggle("active");
    });
}


/* =========================================================
   OVERLAY DE CONFIRMAÇÃO
========================================================= */

const overlay = document.getElementById("overlay");
const cancelBtn = document.getElementById("cancelBtn");
const okBtn = document.getElementById("okBtn");

const toggleOverlay = (show) => {
    if (overlay) {
        overlay.classList.toggle("show", show);
    }
};

document.querySelectorAll("[data-confirm]").forEach((el) => {
    el.addEventListener("click", (e) => {
        e.preventDefault();
        toggleOverlay(true);
    });
});

if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
        toggleOverlay(false);
    });
}

if (okBtn) {
    okBtn.addEventListener("click", () => {
        toggleOverlay(false);
    });
}


/* =========================================================
   NOTIFICAÇÕES — DADOS REAIS
   (eventos do calendário, tarefas/entregas com data e
   eventos do Google Agenda, buscados da API)
========================================================= */

function criarDataLocal(dataTexto) {
    if (!dataTexto) return null;
    const [ano, mes, dia] = dataTexto.split('-').map(Number);
    return new Date(ano, mes - 1, dia);
}

const ICONE_TIPO = {
    evento: "🗓️",
    tarefa: "✅",
    google: "🗓️"
};

const TIPO_LABEL = {
    evento: "Evento",
    tarefa: "Tarefa",
    google: "Google Agenda"
};


/* =========================================================
   LIMIARES DAS NOTIFICAÇÕES
========================================================= */

const LIMIARES_ALERTA = {
    aviso7dias: 7 * 24 * 60 * 60 * 1000,
    aviso1dia: 24 * 60 * 60 * 1000,
    aviso1hora: 60 * 60 * 1000
};


/* =========================================================
   LOCAL STORAGE DAS NOTIFICAÇÕES
========================================================= */

const CHAVE_LIDAS = "joviclass_notif_lidas";
const CHAVE_DISPARADAS = "joviclass_notif_disparadas";

function carregarSet(chave) {
    try {
        return new Set(
            JSON.parse(localStorage.getItem(chave)) || []
        );
    } catch {
        return new Set();
    }
}

function salvarSet(chave, set) {
    localStorage.setItem(
        chave,
        JSON.stringify([...set])
    );
}

let lidas = carregarSet(CHAVE_LIDAS);
let disparadas = carregarSet(CHAVE_DISPARADAS);


/* =========================================================
   CALCULAR STATUS DO EVENTO
========================================================= */

function calcularStatus(evento) {
    const agora = new Date();
    const dataEvento = new Date(evento.data);

    const diffMs = dataEvento - agora;

    if (diffMs <= 0) {
        return null;
    }

    const diffHoras = diffMs / (1000 * 60 * 60);
    const diffDias = diffHoras / 24;

    let urgencia = "normal";

    if (diffHoras <= 24) {
        urgencia = "urgente";
    } else if (diffDias <= 3) {
        urgencia = "breve";
    }

    let prazoTexto;

    if (diffHoras < 1) {
        prazoTexto = "em menos de 1h";
    } else if (diffHoras < 24) {
        prazoTexto = `em ${Math.round(diffHoras)}h`;
    } else {
        const dias = Math.ceil(diffDias);

        prazoTexto =
            `em ${dias} dia${dias > 1 ? "s" : ""}`;
    }

    return {
        diffMs,
        diffHoras,
        diffDias,
        urgencia,
        prazoTexto
    };
}


/* =========================================================
   JUNTAR AS FONTES REAIS DE EVENTOS/TAREFAS
========================================================= */

/*
    window.eventosLocaisCache, window.tarefasCache e
    window.eventosGoogleCache são preenchidos por
    carregarDadosNotificacoes(), depois do login.
    Tarefas já concluídas são descartadas.
*/

function obterTodosEventosNotificaveis() {

    const eventosLocaisFormatados = (window.eventosLocaisCache || [])
        .filter((ev) => ev.data)
        .map((ev) => ({
            id: `evento-${ev.id}`,
            titulo: ev.titulo,
            tipo: "evento",
            materia: ev.categoria || "",
            data: ev.data
        }));

    const tarefasFormatadas = (window.tarefasCache || [])
        .filter((t) => t.data && !t.concluida)
        .map((t) => ({
            id: `tarefa-${t.id}`,
            titulo: t.texto,
            tipo: "tarefa",
            materia: t.materia || "",
            data: criarDataLocal(t.data)
        }));

    const eventosGoogleFormatados = (window.eventosGoogleCache || [])
        .filter((ev) => ev.data)
        .map((ev) => ({
            id: ev.id,
            titulo: ev.titulo,
            tipo: "google",
            materia: "",
            data: ev.data
        }));

    return [
        ...eventosLocaisFormatados,
        ...tarefasFormatadas,
        ...eventosGoogleFormatados
    ];
}


/* =========================================================
   BUSCAR OS DADOS REAIS NA API
========================================================= */

async function carregarDadosNotificacoes() {

    try {

        const [
            respostaEventos,
            respostaTarefas,
            respostaGoogle
        ] = await Promise.all([
            fetch(`${API_BASE}/eventos`, { credentials: "include" }),
            fetch(`${API_BASE}/tarefas`, { credentials: "include" }),
            fetch(`${API_BASE}/api/calendar/eventos`, { credentials: "include" })
        ]);

        const dadosEventos = respostaEventos.ok
            ? await respostaEventos.json()
            : { eventos: [] };

        const dadosTarefas = respostaTarefas.ok
            ? await respostaTarefas.json()
            : { tarefas: [] };

        window.eventosLocaisCache = (dadosEventos.eventos || []).map(
            (evento) => ({
                ...evento,
                data: criarDataLocal(evento.data)
            })
        );

        window.tarefasCache = dadosTarefas.tarefas || [];

        if (respostaGoogle.ok) {

            const dadosGoogle = await respostaGoogle.json();

            window.eventosGoogleCache = dadosGoogle
                .map((ev) => {
                    const inicio = ev.start?.dateTime || ev.start?.date;
                    if (!inicio) return null;

                    return {
                        id: `google-${ev.id}`,
                        titulo: ev.summary || "(Sem título)",
                        data: new Date(inicio)
                    };
                })
                .filter(Boolean);

        } else {
            // 401/403 = conta do Google não conectada; não é um erro.
            window.eventosGoogleCache = [];
        }

    } catch (erro) {
        console.error("Erro ao carregar dados para notificações:", erro);
        window.eventosLocaisCache = window.eventosLocaisCache || [];
        window.tarefasCache = window.tarefasCache || [];
        window.eventosGoogleCache = window.eventosGoogleCache || [];
    }

    renderizarPainel();
    verificarAlertasDoSistema();
}


/* =========================================================
   GERAR NOTIFICAÇÕES
========================================================= */

function gerarNotificacoes() {
    return obterTodosEventosNotificaveis()
        .map((evento) => {
            const status = calcularStatus(evento);

            if (
                !status ||
                status.diffMs > LIMIARES_ALERTA.aviso7dias
            ) {
                return null;
            }

            return {
                ...evento,
                ...status
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.diffMs - b.diffMs);
}


/* =========================================================
   RENDERIZAR PAINEL DE NOTIFICAÇÕES
========================================================= */

function renderizarPainel() {
    const lista = document.getElementById("notifLista");
    const dot = document.getElementById("notifDot");

    if (!lista || !dot) {
        return;
    }

    const notificacoes = gerarNotificacoes();

    const naoLidas = notificacoes.filter(
        (n) => !lidas.has(n.id)
    );

    if (naoLidas.length > 0) {
        dot.hidden = false;
        dot.textContent =
            naoLidas.length > 9
                ? "9+"
                : naoLidas.length;
    } else {
        dot.hidden = true;
    }

    if (notificacoes.length === 0) {
        lista.innerHTML = `
            <div class="notif-vazio">
                Nenhuma prova, trabalho ou reunião chegando perto!
            </div>
        `;

        return;
    }

    lista.innerHTML = notificacoes
        .map((n) => `
            <div
                class="notif-item ${lidas.has(n.id) ? "" : "nao-lida"}"
                data-id="${n.id}"
            >
                <span class="notif-icone ${n.urgencia}">
                    ${ICONE_TIPO[n.tipo] || "🔔"}
                </span>

                <div class="notif-corpo">

                    <div class="notif-titulo">
                        ${n.titulo}
                    </div>

                    <div class="notif-sub">
                        ${TIPO_LABEL[n.tipo] || "Evento"}
                        ${n.materia ? " · " + n.materia : ""}
                    </div>

                    <span class="notif-prazo ${n.urgencia}">
                        Vence ${n.prazoTexto}
                    </span>

                </div>
            </div>
        `)
        .join("");

    lista
        .querySelectorAll(".notif-item")
        .forEach((el) => {

            el.addEventListener("click", () => {

                lidas.add(el.dataset.id);

                salvarSet(
                    CHAVE_LIDAS,
                    lidas
                );

                renderizarPainel();
            });

        });
}


/* =========================================================
   NOTIFICAÇÃO DO NAVEGADOR
========================================================= */

function dispararNotificacaoDoNavegador(
    evento,
    status,
    motivo
) {
    if (
        !("Notification" in window) ||
        Notification.permission !== "granted"
    ) {
        return;
    }

    /*
        "motivo" (1hora / 1dia) garante que o aviso de 1 dia
        antes e o de 1 hora antes disparem de forma
        independente, já que os dois caem na mesma
        "urgencia" (urgente) dentro de calcularStatus().
    */

    const chaveDisparo =
        `${evento.id}-${motivo}`;

    if (disparadas.has(chaveDisparo)) {
        return;
    }

    new Notification(
        `${TIPO_LABEL[evento.tipo] || "Evento"}: ${evento.titulo}`,
        {
            body: `Vence ${status.prazoTexto}.`,
            icon: "./src/assets/img/logo.png"
        }
    );

    disparadas.add(chaveDisparo);

    salvarSet(
        CHAVE_DISPARADAS,
        disparadas
    );
}


/* =========================================================
   VERIFICAR ALERTAS DO SISTEMA
========================================================= */

function verificarAlertasDoSistema() {

    obterTodosEventosNotificaveis().forEach((evento) => {

        const status = calcularStatus(evento);

        if (!status) {
            return;
        }

        if (status.diffMs <= LIMIARES_ALERTA.aviso1hora) {
            dispararNotificacaoDoNavegador(evento, status, "1hora");
        } else if (status.diffMs <= LIMIARES_ALERTA.aviso1dia) {
            dispararNotificacaoDoNavegador(evento, status, "1dia");
        }

    });
}


/* =========================================================
   SISTEMA DE NOTIFICAÇÕES
========================================================= */

function iniciarSistemaDeNotificacoes() {

    const notifBtn =
        document.getElementById("notifBtn");

    const notifPanel =
        document.getElementById("notifPanel");

    const notifMarcarLidas =
        document.getElementById("notifMarcarLidas");


    // Sem sessão ainda os caches estão vazios: painel some
    // vazio até carregarDadosNotificacoes() rodar dentro de
    // liberarAplicacao(), depois do login confirmado.
    renderizarPainel();


    /* -----------------------------------------------------
       PERMISSÃO PARA NOTIFICAÇÕES
    ----------------------------------------------------- */

    if (
        "Notification" in window &&
        Notification.permission === "default"
    ) {
        Notification.requestPermission();
    }


    /* -----------------------------------------------------
       ABRIR / FECHAR PAINEL
    ----------------------------------------------------- */

    if (notifBtn && notifPanel) {

        notifBtn.addEventListener("click", (e) => {

            e.stopPropagation();

            const aberto = !notifPanel.hidden;

            notifPanel.hidden = aberto;

            notifBtn.setAttribute(
                "aria-expanded",
                String(!aberto)
            );
        });


        document.addEventListener("click", (e) => {

            if (
                !notifPanel.hidden &&
                !notifPanel.contains(e.target) &&
                e.target !== notifBtn
            ) {

                notifPanel.hidden = true;

                notifBtn.setAttribute(
                    "aria-expanded",
                    "false"
                );
            }

        });
    }


    /* -----------------------------------------------------
       MARCAR TODAS COMO LIDAS
    ----------------------------------------------------- */

    if (notifMarcarLidas) {

        notifMarcarLidas.addEventListener(
            "click",
            () => {

                gerarNotificacoes().forEach(
                    (n) => lidas.add(n.id)
                );

                salvarSet(
                    CHAVE_LIDAS,
                    lidas
                );

                renderizarPainel();
            }
        );
    }


    /* -----------------------------------------------------
       ATUALIZA A CADA 5 MINUTOS
       (busca dados novos, não só re-renderiza o cache velho)
    ----------------------------------------------------- */

    setInterval(() => {
        carregarDadosNotificacoes();
    }, 5 * 60 * 1000);
}


/* =========================================================
   ABAS DE LOGIN / CADASTRO
========================================================= */

function inicializarAbasAuth() {

    const btnLogin =
        document.getElementById("btnLogin");

    const btnCadastro =
        document.getElementById("btnCadastro");

    const loginForm =
        document.getElementById("loginForm");

    const cadastroForm =
        document.getElementById("cadastroForm");

    const authTitulo =
        document.getElementById("authTitulo");

    const authDescricao =
        document.getElementById("authDescricao");

    const authErro =
        document.getElementById("authErro");

    if (
        !btnLogin ||
        !btnCadastro ||
        !loginForm ||
        !cadastroForm
    ) {
        return;
    }

    function mostrarLogin() {

        btnLogin.classList.add("ativo");
        btnCadastro.classList.remove("ativo");

        loginForm.style.display = "flex";
        cadastroForm.style.display = "none";

        if (authTitulo) {
            authTitulo.textContent =
                "Falta pouco para começar";
        }

        if (authDescricao) {
            authDescricao.textContent =
                "Entre na sua conta para continuar seus estudos.";
        }

        if (authErro) {
            authErro.textContent = "";
        }
    }

    function mostrarCadastro() {

        btnCadastro.classList.add("ativo");
        btnLogin.classList.remove("ativo");

        cadastroForm.style.display = "flex";
        loginForm.style.display = "none";

        if (authTitulo) {
            authTitulo.textContent =
                "Crie sua conta";
        }

        if (authDescricao) {
            authDescricao.textContent =
                "Leva menos de um minuto para começar.";
        }

        if (authErro) {
            authErro.textContent = "";
        }
    }

    btnLogin.addEventListener("click", mostrarLogin);
    btnCadastro.addEventListener("click", mostrarCadastro);
}


/* =========================================================
   LOGIN COM E-MAIL E SENHA
========================================================= */

function inicializarLoginEmail() {

    const loginForm =
        document.getElementById("loginForm");

    const authErro =
        document.getElementById("authErro");

    if (!loginForm) {
        return;
    }

    loginForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        if (authErro) {
            authErro.textContent = "";
        }

        const email =
            document.getElementById("loginEmail")?.value.trim();

        const senha =
            document.getElementById("loginSenha")?.value;

        if (!email || !senha) {

            if (authErro) {
                authErro.textContent =
                    "Preencha e-mail e senha.";
            }

            return;
        }

        try {

            const resposta = await fetch(
                `${API_BASE}/auth/login`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    credentials: "include",

                    body: JSON.stringify({
                        email,
                        senha
                    })
                }
            );

            const dados = await resposta.json();

            if (!resposta.ok || !dados.sucesso) {

                throw new Error(
                    dados.erro ||
                    "Não foi possível fazer login."
                );
            }

            console.log(
                "Login realizado:",
                dados.usuario
            );

            loginForm.reset();

            atualizarSaudacao(dados.usuario);

            liberarAplicacao();

        } catch (erro) {

            console.error(
                "Erro no login:",
                erro
            );

            if (authErro) {
                authErro.textContent = erro.message;
            }
        }
    });
}


/* =========================================================
   CADASTRO COM E-MAIL E SENHA
   (agora em 2 passos: dados -> código de confirmação)
========================================================= */

/*
    Guardamos aqui os dados que o usuário preencheu no
    passo 1 do cadastro (nome, e-mail, senha), pra não
    precisar pedir de novo depois que ele confirmar o
    código recebido por e-mail. A conta só é criada de
    verdade no passo 2, quando o código é confirmado.
*/

const cadastroPendente = {
    nome: "",
    email: "",
    senha: ""
};

function inicializarCadastroEmail() {

    const cadastroForm =
        document.getElementById("cadastroForm");

    const authErro =
        document.getElementById("authErro");

    if (!cadastroForm) {
        return;
    }

    cadastroForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        limparErroAuth();

        const nome =
            document.getElementById("cadastroNome")?.value.trim();

        const email =
            document.getElementById("cadastroEmail")?.value.trim();

        const senha =
            document.getElementById("cadastroSenha")?.value;

        const aceitouTermos =
            document.getElementById("aceitarTermos")?.checked;

        if (!nome || !email || !senha) {

            if (authErro) {
                authErro.textContent =
                    "Preencha nome, e-mail e senha.";
            }

            return;
        }

        if (!aceitouTermos) {

            if (authErro) {
                authErro.textContent =
                    "Você precisa aceitar os termos de uso.";
            }

            return;
        }

        try {

            /*
                Passo 1: NÃO cria a conta ainda.
                Só pede pro backend gerar o código e
                mandar pro e-mail informado.
            */

            const resposta = await fetch(
                `${API_BASE}/auth/cadastro/enviar-codigo`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    credentials: "include",

                    body: JSON.stringify({
                        nome,
                        email,
                        senha
                    })
                }
            );

            const dados = await resposta.json();

            if (!resposta.ok || !dados.sucesso) {

                throw new Error(
                    dados.erro ||
                    "Não foi possível enviar o código de confirmação."
                );
            }

            // Guarda os dados pra usar na confirmação do código
            cadastroPendente.nome = nome;
            cadastroPendente.email = email;
            cadastroPendente.senha = senha;

            mostrarCodigoCadastro(email);

        } catch (erro) {

            console.error(
                "Erro ao solicitar código de cadastro:",
                erro
            );

            if (authErro) {
                authErro.textContent = erro.message;
            }
        }
    });
}


/* =========================================================
   MOSTRAR / OCULTAR SENHA ("olhinho")
========================================================= */

// O ícone troca de verdade: olho fechado enquanto a senha
// está criptografada na tela (type="password") e olho aberto
// quando ela fica visível (type="text"). Funciona pra
// qualquer input de senha que tenha um botão com a classe
// "toggle-senha" e o atributo data-target apontando pro id
// do input. Usado nos campos loginSenha e cadastroSenha.

const ICONE_OLHO_ABERTO = `
    <svg class="icone-olho" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
        <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.7"/>
    </svg>
`;

const ICONE_OLHO_FECHADO = `
    <svg class="icone-olho" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
        <path d="M3 3l18 18" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        <path d="M10.6 5.2A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a13.2 13.2 0 0 1-3.1 3.9M6.4 6.4C4 8 2 12 2 12s3.5 7 10 7c1.4 0 2.7-.3 3.9-.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
`;

function atualizarIconeToggleSenha(btn, senhaVisivel) {

    btn.innerHTML =
        senhaVisivel ? ICONE_OLHO_ABERTO : ICONE_OLHO_FECHADO;

    btn.classList.toggle(
        "mostrando",
        senhaVisivel
    );

    btn.setAttribute(
        "aria-label",
        senhaVisivel ? "Ocultar senha" : "Mostrar senha"
    );
}

function inicializarToggleSenha() {

    document
        .querySelectorAll(".toggle-senha")
        .forEach((btn) => {

            const alvo =
                document.getElementById(btn.dataset.target);

            if (!alvo) {
                return;
            }

            // Estado inicial: o campo começa como password
            // (oculto), então o ícone começa fechado.
            atualizarIconeToggleSenha(
                btn,
                alvo.type !== "password"
            );

            btn.addEventListener("click", () => {

                const senhaVaiFicarVisivel =
                    alvo.type === "password";

                alvo.type =
                    senhaVaiFicarVisivel ? "text" : "password";

                atualizarIconeToggleSenha(
                    btn,
                    senhaVaiFicarVisivel
                );
            });
        });
}


/* =========================================================
   RECUPERAÇÃO DE SENHA ("ESQUECEU A SENHA?")
========================================================= */

/*
    Fluxo em 3 passos dentro do mesmo modal de login:

    1) formRecuperarSenha         -> pede o e-mail
    2) formCodigoRecuperacao      -> pede o código de 6 dígitos
    3) formNovaSenhaRecuperacao   -> pede a nova senha + confirmação

    Guardamos o e-mail e o código confirmados aqui, pra não
    precisar pedir de novo na hora de salvar a nova senha.
*/

const recuperacaoSenha = {
    email: "",
    codigo: ""
};

function ocultarTodosOsPassosAuth() {

    const loginForm =
        document.getElementById("loginForm");

    const cadastroForm =
        document.getElementById("cadastroForm");

    const formVerificarEmail =
        document.getElementById("formVerificarEmail");

    const formRecuperarSenha =
        document.getElementById("formRecuperarSenha");

    const formCodigoRecuperacao =
        document.getElementById("formCodigoRecuperacao");

    const formNovaSenhaRecuperacao =
        document.getElementById("formNovaSenhaRecuperacao");

    const formCodigoCadastro =
        document.getElementById("formCodigoCadastro");

    const authTabs =
        document.querySelector(".auth-tabs");

    const authOu =
        document.querySelector(".auth-ou");

    const googleLogin =
        document.querySelector(".google-login");

    [
        loginForm,
        cadastroForm,
        formVerificarEmail,
        formRecuperarSenha,
        formCodigoRecuperacao,
        formNovaSenhaRecuperacao,
        formCodigoCadastro
    ].forEach((el) => {
        if (el) {
            el.style.display = "none";
        }
    });

    if (authTabs) authTabs.style.display = "none";
    if (authOu) authOu.style.display = "none";
    if (googleLogin) googleLogin.style.display = "none";
}

function limparErroAuth() {

    const authErro =
        document.getElementById("authErro");

    if (authErro) {
        authErro.style.color = "";
        authErro.textContent = "";
    }
}

function mostrarRecuperarSenha() {

    ocultarTodosOsPassosAuth();
    limparErroAuth();

    const formRecuperarSenha =
        document.getElementById("formRecuperarSenha");

    const authTitulo =
        document.getElementById("authTitulo");

    const authDescricao =
        document.getElementById("authDescricao");

    if (formRecuperarSenha) formRecuperarSenha.style.display = "flex";

    if (authTitulo) {
        authTitulo.textContent = "Recuperar senha";
    }

    if (authDescricao) {
        authDescricao.textContent =
            "Informe seu e-mail para receber um código de verificação.";
    }
}

function mostrarCodigoRecuperacao(email) {

    ocultarTodosOsPassosAuth();
    limparErroAuth();

    const formCodigoRecuperacao =
        document.getElementById("formCodigoRecuperacao");

    const authTitulo =
        document.getElementById("authTitulo");

    const authDescricao =
        document.getElementById("authDescricao");

    const emailAlvo =
        document.getElementById("recuperarEmailAlvo");

    if (formCodigoRecuperacao) formCodigoRecuperacao.style.display = "flex";

    if (authTitulo) {
        authTitulo.textContent = "Digite o código";
    }

    if (authDescricao) {
        authDescricao.textContent =
            "Enviamos um código de 6 dígitos para o seu e-mail.";
    }

    if (emailAlvo) {
        emailAlvo.textContent = email;
    }
}

function mostrarNovaSenhaRecuperacao() {

    ocultarTodosOsPassosAuth();
    limparErroAuth();

    const formNovaSenhaRecuperacao =
        document.getElementById("formNovaSenhaRecuperacao");

    const authTitulo =
        document.getElementById("authTitulo");

    const authDescricao =
        document.getElementById("authDescricao");

    if (formNovaSenhaRecuperacao) formNovaSenhaRecuperacao.style.display = "flex";

    if (authTitulo) {
        authTitulo.textContent = "Criar nova senha";
    }

    if (authDescricao) {
        authDescricao.textContent =
            "Escolha uma nova senha para acessar sua conta.";
    }
}

function voltarParaLogin() {

    ocultarTodosOsPassosAuth();
    limparErroAuth();

    const loginForm =
        document.getElementById("loginForm");

    const authTabs =
        document.querySelector(".auth-tabs");

    const authOu =
        document.querySelector(".auth-ou");

    const googleLogin =
        document.querySelector(".google-login");

    const btnLogin =
        document.getElementById("btnLogin");

    const btnCadastro =
        document.getElementById("btnCadastro");

    const authTitulo =
        document.getElementById("authTitulo");

    const authDescricao =
        document.getElementById("authDescricao");

    if (loginForm) loginForm.style.display = "flex";
    if (authTabs) authTabs.style.display = "flex";
    if (authOu) authOu.style.display = "flex";
    if (googleLogin) googleLogin.style.display = "flex";

    if (btnLogin) btnLogin.classList.add("ativo");
    if (btnCadastro) btnCadastro.classList.remove("ativo");

    if (authTitulo) {
        authTitulo.textContent = "Falta pouco para começar";
    }

    if (authDescricao) {
        authDescricao.textContent =
            "Entre na sua conta para continuar seus estudos.";
    }
}

function inicializarRecuperacaoSenha() {

    const linkEsqueci =
        document.getElementById("linkEsqueciSenha");

    const formRecuperarSenha =
        document.getElementById("formRecuperarSenha");

    const formCodigoRecuperacao =
        document.getElementById("formCodigoRecuperacao");

    const formNovaSenhaRecuperacao =
        document.getElementById("formNovaSenhaRecuperacao");

    const voltarParaLoginBtn =
        document.getElementById("voltarParaLoginDeRecuperar");

    const reenviarCodigoBtn =
        document.getElementById("reenviarCodigoRecuperacao");

    const authErro =
        document.getElementById("authErro");

    if (!linkEsqueci) {
        return;
    }


    /* -----------------------------------------------------
       ABRIR O PASSO 1 (E-MAIL)
    ----------------------------------------------------- */

    linkEsqueci.addEventListener("click", (e) => {
        e.preventDefault();
        mostrarRecuperarSenha();
    });

    if (voltarParaLoginBtn) {
        voltarParaLoginBtn.addEventListener("click", voltarParaLogin);
    }


    /* -----------------------------------------------------
       PASSO 1 -> ENVIA O CÓDIGO
    ----------------------------------------------------- */

    if (formRecuperarSenha) {

        formRecuperarSenha.addEventListener("submit", async (e) => {

            e.preventDefault();
            console.log("submit capturado!"); // linha temporária
            limparErroAuth();

            const email =
                document.getElementById("recuperarEmail")?.value.trim();

            if (!email) {

                if (authErro) {
                    authErro.textContent = "Informe seu e-mail.";
                }

                return;
            }

            try {

                const resposta = await fetch(
                    `${API_BASE}/auth/recuperar-senha`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        credentials: "include",

                        body: JSON.stringify({ email })
                    }
                );

                const dados = await resposta.json();

                if (!resposta.ok || !dados.sucesso) {

                    throw new Error(
                        dados.erro ||
                        "Não foi possível enviar o código."
                    );
                }

                recuperacaoSenha.email = email;
                recuperacaoSenha.codigo = "";

                mostrarCodigoRecuperacao(email);

            } catch (erro) {

                if (authErro) {
                    authErro.textContent = erro.message;
                }
            }
        });
    }


    /* -----------------------------------------------------
       PASSO 2 -> CONFERE O CÓDIGO
    ----------------------------------------------------- */

    if (formCodigoRecuperacao) {

        formCodigoRecuperacao.addEventListener("submit", async (e) => {

            e.preventDefault();
            limparErroAuth();

            const codigo =
                document
                    .getElementById("campoCodigoRecuperacao")
                    ?.value.trim();

            if (!codigo) {

                if (authErro) {
                    authErro.textContent =
                        "Informe o código recebido por e-mail.";
                }

                return;
            }

            try {

                const resposta = await fetch(
                    `${API_BASE}/auth/verificar-codigo-recuperacao`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        credentials: "include",

                        body: JSON.stringify({
                            email: recuperacaoSenha.email,
                            codigo
                        })
                    }
                );

                const dados = await resposta.json();

                if (!resposta.ok || !dados.sucesso) {

                    throw new Error(
                        dados.erro ||
                        "Código incorreto."
                    );
                }

                recuperacaoSenha.codigo = codigo;

                mostrarNovaSenhaRecuperacao();

            } catch (erro) {

                if (authErro) {
                    authErro.textContent = erro.message;
                }
            }
        });
    }


    /* -----------------------------------------------------
       REENVIAR CÓDIGO (PASSO 2)
    ----------------------------------------------------- */

    if (reenviarCodigoBtn) {

        reenviarCodigoBtn.addEventListener("click", async (e) => {

            e.preventDefault();
            limparErroAuth();

            try {

                const resposta = await fetch(
                    `${API_BASE}/auth/recuperar-senha`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        credentials: "include",

                        body: JSON.stringify({
                            email: recuperacaoSenha.email
                        })
                    }
                );

                const dados = await resposta.json();

                if (!resposta.ok || !dados.sucesso) {

                    throw new Error(
                        dados.erro ||
                        "Não foi possível reenviar o código."
                    );
                }

                if (authErro) {
                    authErro.style.color = "#1a9c5c";
                    authErro.textContent =
                        "Novo código enviado! Confira seu e-mail.";
                }

            } catch (erro) {

                if (authErro) {
                    authErro.style.color = "";
                    authErro.textContent = erro.message;
                }
            }
        });
    }


    /* -----------------------------------------------------
       PASSO 3 -> SALVA A NOVA SENHA E VOLTA PRO LOGIN
    ----------------------------------------------------- */

    if (formNovaSenhaRecuperacao) {

        formNovaSenhaRecuperacao.addEventListener("submit", async (e) => {

            e.preventDefault();
            limparErroAuth();

            const senhaNova =
                document.getElementById("campoNovaSenhaRecuperacao")?.value;

            const senhaConfirma =
                document.getElementById("campoConfirmaSenhaRecuperacao")?.value;

            if (!senhaNova || senhaNova.length < 6) {

                if (authErro) {
                    authErro.textContent =
                        "A nova senha deve ter pelo menos 6 caracteres.";
                }

                return;
            }

            if (senhaNova !== senhaConfirma) {

                if (authErro) {
                    authErro.textContent =
                        "A confirmação não corresponde à nova senha.";
                }

                return;
            }

            try {

                const resposta = await fetch(
                    `${API_BASE}/auth/redefinir-senha`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        credentials: "include",

                        body: JSON.stringify({
                            email: recuperacaoSenha.email,
                            codigo: recuperacaoSenha.codigo,
                            senhaNova
                        })
                    }
                );

                const dados = await resposta.json();

                if (!resposta.ok || !dados.sucesso) {

                    throw new Error(
                        dados.erro ||
                        "Não foi possível redefinir a senha."
                    );
                }

                recuperacaoSenha.email = "";
                recuperacaoSenha.codigo = "";

                formNovaSenhaRecuperacao.reset();

                voltarParaLogin();

                if (authErro) {
                    authErro.style.color = "#1a9c5c";
                    authErro.textContent =
                        "Senha redefinida com sucesso! Faça login com a nova senha.";
                }

            } catch (erro) {

                if (authErro) {
                    authErro.textContent = erro.message;
                }
            }
        });
    }
}


/* =========================================================
   CONFIRMAÇÃO DE CADASTRO POR CÓDIGO
========================================================= */

/*
    Passo 2 do cadastro: usuário já preencheu nome, e-mail
    e senha (guardados em cadastroPendente) e o backend já
    mandou o código pro e-mail dele. Aqui ele digita o
    código e, se estiver certo, a conta é criada de fato
    e a sessão é aberta — igual acontecia antes direto no
    passo 1.
*/

function mostrarCodigoCadastro(email) {

    ocultarTodosOsPassosAuth();
    limparErroAuth();

    const formCodigoCadastro =
        document.getElementById("formCodigoCadastro");

    const authTitulo =
        document.getElementById("authTitulo");

    const authDescricao =
        document.getElementById("authDescricao");

    const emailAlvo =
        document.getElementById("cadastroEmailAlvo");

    if (formCodigoCadastro) formCodigoCadastro.style.display = "flex";

    if (authTitulo) {
        authTitulo.textContent = "Confirme seu e-mail";
    }

    if (authDescricao) {
        authDescricao.textContent =
            "Digite o código de 6 dígitos que enviamos para você.";
    }

    if (emailAlvo) {
        emailAlvo.textContent = email;
    }
}

function voltarParaCadastroDoCodigo() {

    ocultarTodosOsPassosAuth();
    limparErroAuth();

    const cadastroForm =
        document.getElementById("cadastroForm");

    const authTabs =
        document.querySelector(".auth-tabs");

    const authOu =
        document.querySelector(".auth-ou");

    const googleLogin =
        document.querySelector(".google-login");

    const btnLogin =
        document.getElementById("btnLogin");

    const btnCadastro =
        document.getElementById("btnCadastro");

    const authTitulo =
        document.getElementById("authTitulo");

    const authDescricao =
        document.getElementById("authDescricao");

    if (cadastroForm) cadastroForm.style.display = "flex";
    if (authTabs) authTabs.style.display = "flex";
    if (authOu) authOu.style.display = "flex";
    if (googleLogin) googleLogin.style.display = "flex";

    if (btnCadastro) btnCadastro.classList.add("ativo");
    if (btnLogin) btnLogin.classList.remove("ativo");

    if (authTitulo) {
        authTitulo.textContent = "Crie sua conta";
    }

    if (authDescricao) {
        authDescricao.textContent =
            "Leva menos de um minuto para começar.";
    }
}

function inicializarConfirmacaoCadastro() {

    const formCodigoCadastro =
        document.getElementById("formCodigoCadastro");

    const reenviarCodigoBtn =
        document.getElementById("reenviarCodigoCadastro");

    const voltarBtn =
        document.getElementById("voltarParaCadastroDoCodigo");

    const authErro =
        document.getElementById("authErro");

    if (!formCodigoCadastro) {
        return;
    }


    /* -----------------------------------------------------
       CONFIRMAR CÓDIGO -> CRIA A CONTA DE VERDADE
    ----------------------------------------------------- */

    formCodigoCadastro.addEventListener("submit", async (e) => {

        e.preventDefault();
        limparErroAuth();

        const codigo =
            document
                .getElementById("campoCodigoCadastro")
                ?.value.trim();

        if (!codigo) {

            if (authErro) {
                authErro.textContent =
                    "Informe o código recebido por e-mail.";
            }

            return;
        }

        try {

            const resposta = await fetch(
                `${API_BASE}/auth/cadastro/confirmar`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    credentials: "include",

                    body: JSON.stringify({
                        nome: cadastroPendente.nome,
                        email: cadastroPendente.email,
                        senha: cadastroPendente.senha,
                        codigo
                    })
                }
            );

            const dados = await resposta.json();

            if (!resposta.ok || !dados.sucesso) {

                throw new Error(
                    dados.erro ||
                    "Código incorreto ou expirado."
                );
            }

            console.log(
                "Cadastro confirmado:",
                dados.usuario
            );

            const cadastroForm =
                document.getElementById("cadastroForm");

            if (cadastroForm) {
                cadastroForm.reset();
            }

            formCodigoCadastro.reset();

            cadastroPendente.nome = "";
            cadastroPendente.email = "";
            cadastroPendente.senha = "";

            atualizarSaudacao(dados.usuario);

            liberarAplicacao();

        } catch (erro) {

            console.error(
                "Erro ao confirmar cadastro:",
                erro
            );

            if (authErro) {
                authErro.textContent = erro.message;
            }
        }
    });


    /* -----------------------------------------------------
       REENVIAR CÓDIGO DE CADASTRO
    ----------------------------------------------------- */

    if (reenviarCodigoBtn) {

        reenviarCodigoBtn.addEventListener("click", async (e) => {

            e.preventDefault();
            limparErroAuth();

            try {

                const resposta = await fetch(
                    `${API_BASE}/auth/cadastro/enviar-codigo`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        credentials: "include",

                        body: JSON.stringify({
                            nome: cadastroPendente.nome,
                            email: cadastroPendente.email,
                            senha: cadastroPendente.senha
                        })
                    }
                );

                const dados = await resposta.json();

                if (!resposta.ok || !dados.sucesso) {

                    throw new Error(
                        dados.erro ||
                        "Não foi possível reenviar o código."
                    );
                }

                if (authErro) {
                    authErro.style.color = "#1a9c5c";
                    authErro.textContent =
                        "Novo código enviado! Confira seu e-mail.";
                }

            } catch (erro) {

                if (authErro) {
                    authErro.style.color = "";
                    authErro.textContent = erro.message;
                }
            }
        });
    }


    /* -----------------------------------------------------
       VOLTAR PARA O PASSO 1 DO CADASTRO
    ----------------------------------------------------- */

    if (voltarBtn) {

        voltarBtn.addEventListener("click", (e) => {
            e.preventDefault();
            voltarParaCadastroDoCodigo();
        });
    }
}


/* =========================================================
   AUTENTICAÇÃO GOOGLE
========================================================= */

/*
    IMPORTANTE:

    Este Client ID é público e pode aparecer no frontend.

    A segurança NÃO depende de esconder o Client ID.

    O backend deve validar o ID token recebido
    usando google-auth-library.
*/

const GOOGLE_CLIENT_ID="361150214707-dbmjk3nhpf86pt21r1p3qkuj3ipv23tf.apps.googleusercontent.com";


/* =========================================================
   LOGIN COM GOOGLE
========================================================= */

function inicializarGoogleLogin() {

    const googleBtn =
        document.getElementById("googleBtn");

    if (!googleBtn) {
        console.warn(
            "Elemento #googleBtn não encontrado."
        );

        return;
    }


    /*
        Verifica se o Google Identity Services
        foi carregado.
    */

    if (
        typeof google === "undefined" ||
        !google.accounts ||
        !google.accounts.id
    ) {

        console.error(
            "Google Identity Services não foi carregado."
        );

        const authErro =
            document.getElementById("authErro");

        if (authErro) {
            authErro.textContent =
                "Não foi possível carregar o login do Google.";
        }

        return;
    }


    /* -----------------------------------------------------
       INICIALIZA GOOGLE
    ----------------------------------------------------- */

    google.accounts.id.initialize({

        client_id: GOOGLE_CLIENT_ID,

        callback: handleGoogleLogin,

        auto_select: false
    });


    /* -----------------------------------------------------
       RENDERIZA BOTÃO NA LARGURA REAL DO CONTAINER
    ----------------------------------------------------- */

    /*
        Em vez de fixar 350px (que fica pequeno demais
        ou grande demais dependendo da tela, forçando o
        CSS a esticar o iframe do Google e deixando o
        ícone/texto tortos), medimos a largura real do
        elemento e pedimos pro Google já renderizar
        certinho nesse tamanho.
    */

    function renderizarBotaoGoogle() {

        googleBtn.innerHTML = "";

        const larguraContainer =
            Math.round(
                googleBtn.getBoundingClientRect().width
            );

        google.accounts.id.renderButton(
            googleBtn,
            {
                theme: "outline",
                size: "large",
                width: larguraContainer || 300,
                text: "continue_with"
            }
        );
    }

    renderizarBotaoGoogle();


    /*
        Se a tela for redimensionada (ex: virar o celular,
        ou redimensionar a janela), renderiza de novo na
        largura nova.
    */

    let debounceResize;

    window.addEventListener("resize", () => {
        clearTimeout(debounceResize);
        debounceResize = setTimeout(renderizarBotaoGoogle, 200);
    });
}


/* =========================================================
   CALLBACK DO GOOGLE
========================================================= */

async function handleGoogleLogin(response) {

    const authErro =
        document.getElementById("authErro");


    try {

        console.log("Google respondeu!");
        console.log(response);


        if (
            !response ||
            !response.credential
        ) {
            throw new Error(
                "Credencial do Google não recebida."
            );
        }


        /* -------------------------------------------------
           ENVIA O ID TOKEN PARA O BACKEND
        ------------------------------------------------- */

        const resposta = await fetch(
            `${API_BASE}/auth/google`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                credentials: "include",

                body: JSON.stringify({
                    credential: response.credential
                })
            }
        );


        /* -------------------------------------------------
           TENTA LER RESPOSTA DO BACKEND
        ------------------------------------------------- */

        const dados = await resposta.json();


        if (!resposta.ok) {

            throw new Error(
                dados.erro ||
                "Erro no login com Google."
            );
        }


        /* -------------------------------------------------
           LOGIN REALIZADO
        ------------------------------------------------- */

        console.log(
            "Usuário autenticado:",
            dados.usuario
        );


        if (authErro) {
            authErro.textContent = "";
        }


        atualizarSaudacao(dados.usuario);

        liberarAplicacao();


    } catch (erro) {

        console.error(
            "Erro no login com Google:",
            erro
        );


        if (authErro) {

            authErro.textContent =
                "Não foi possível fazer login com Google.";
        }
    }
}


/* =========================================================
   VERIFICAR AUTENTICAÇÃO
========================================================= */

async function carregarResumoReal() {
    try {
        const [
            respostaMaterias,
            respostaTarefas
        ] = await Promise.all([
            fetch(`${API_BASE}/materias`, {
                credentials: "include"
            }),

            fetch(`${API_BASE}/tarefas`, {
                credentials: "include"
            })
        ]);

        if (
            !respostaMaterias.ok ||
            !respostaTarefas.ok
        ) {
            throw new Error(
                "Não foi possível carregar o resumo."
            );
        }

        const dadosMaterias =
            await respostaMaterias.json();

        const dadosTarefas =
            await respostaTarefas.json();

        const materias =
            dadosMaterias.materias || [];

        const tarefas =
            dadosTarefas.tarefas || [];

        const tarefasConcluidas =
            tarefas.filter(
                tarefa => tarefa.concluida === true
            ).length;

        const totalArquivos =
            materias.reduce(
                (total, materia) =>
                    total + Number(materia.arquivos || 0),
                0
            );

        const respostasAnotacoes =
            await Promise.all(
                materias.map(materia =>
                    fetch(
                        `${API_BASE}/materias/${materia.id}/anotacoes`,
                        {
                            credentials: "include"
                        }
                    )
                )
            );

        let totalAnotacoes = 0;

        for (const resposta of respostasAnotacoes) {
            if (!resposta.ok) {
                continue;
            }

            const dados = await resposta.json();

            totalAnotacoes +=
                (dados.anotacoes || []).length;
        }

        const porcentagem = tarefas.length
            ? Math.round(
                tarefasConcluidas /
                tarefas.length *
                100
            )
            : 0;

        document.getElementById(
            "statTarefas"
        ).textContent = tarefasConcluidas;

        document.getElementById(
            "statMaterias"
        ).textContent = materias.length;

        document.getElementById(
            "statAnotacoes"
        ).textContent = totalAnotacoes;

        document.getElementById(
            "resumoMaterias"
        ).textContent = materias.length;

        document.getElementById(
            "resumoArquivos"
        ).textContent = totalArquivos;

        document.getElementById(
            "resumoAnotacoes"
        ).textContent = totalAnotacoes;

        document.getElementById(
            "resumoTarefas"
        ).textContent = tarefas.length;

        document.getElementById(
            "progressoPorcentagem"
        ).textContent = `${porcentagem}%`;

        document.getElementById(
            "progressoAnel"
        ).style.setProperty(
            "--valor",
            porcentagem
        );

        const barras = document.querySelectorAll(
            ".progresso-barrinhas span"
        );

        const quantidadeAtiva = Math.round(
            porcentagem / 100 * barras.length
        );

        barras.forEach((barra, indice) => {
            barra.classList.toggle(
                "ativa",
                indice < quantidadeAtiva
            );

            barra.classList.remove("meio");
        });
    } catch (erro) {
        console.error(
            "Erro ao carregar resumo:",
            erro
        );
    }
}

function escaparHTMLInicio(valor) {
    return String(valor || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function converterDataFirestore(valor) {
    if (!valor) {
        return 0;
    }

    if (typeof valor === "string") {
        return new Date(valor).getTime();
    }

    const segundos =
        valor._seconds ?? valor.seconds;

    return segundos
        ? Number(segundos) * 1000
        : 0;
}

async function carregarListasInicio() {
    try {
        const [
            respostaEventos,
            respostaMaterias
        ] = await Promise.all([
            fetch(`${API_BASE}/eventos`, {
                credentials: "include"
            }),

            fetch(`${API_BASE}/materias`, {
                credentials: "include"
            })
        ]);

        if (
            !respostaEventos.ok ||
            !respostaMaterias.ok
        ) {
            throw new Error(
                "Não foi possível carregar os dados."
            );
        }

        const dadosEventos =
            await respostaEventos.json();

        const dadosMaterias =
            await respostaMaterias.json();

        const eventos = dadosEventos.eventos || [];
        const materias = dadosMaterias.materias || [];

        renderizarProximasProvas(eventos);
        await renderizarUltimosArquivos(materias);
    } catch (erro) {
        console.error(
            "Erro ao carregar listas da página inicial:",
            erro
        );
    }
}

function renderizarProximasProvas(eventos) {
    const secao = document.getElementById(
        "secaoProximasProvas"
    );

    if (!secao) {
        return;
    }

    secao.querySelectorAll(".item").forEach(
        item => item.remove()
    );

    const link = secao.querySelector(".ver-todos");

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const provas = eventos
        .filter(evento => {
            const categoria =
                String(evento.categoria || "")
                    .toLowerCase();

            const data = new Date(
                `${evento.data}T00:00:00`
            );

            return (
                categoria.includes("prova") &&
                data >= hoje
            );
        })
        .sort(
            (a, b) =>
                new Date(`${a.data}T00:00:00`) -
                new Date(`${b.data}T00:00:00`)
        )
        .slice(0, 3);

    if (!provas.length) {
        link.insertAdjacentHTML(
            "beforebegin",
            `
                <div class="item">
                    <div class="detalhe">
                        Nenhuma prova agendada.
                    </div>
                </div>
            `
        );

        return;
    }

    provas.forEach(prova => {
        const data = new Date(
            `${prova.data}T00:00:00`
        );

        const diferenca = Math.ceil(
            (data - hoje) / 86400000
        );

        const textoDias =
            diferenca === 0
                ? "Hoje"
                : diferenca === 1
                    ? "1 dia"
                    : `${diferenca} dias`;

        const html = `
            <div class="item">
                <div class="item-esq">
                    <span class="item-icone roxo">
                        📝
                    </span>

                    <div>
                        <div class="nome">
                            ${escaparHTMLInicio(prova.titulo)}
                        </div>

                        <div class="detalhe">
                            ${data.toLocaleDateString("pt-BR")}
                        </div>
                    </div>
                </div>

                <span class="badge">
                    ${textoDias}
                </span>
            </div>
        `;

        link.insertAdjacentHTML(
            "beforebegin",
            html
        );
    });
}

async function renderizarUltimosArquivos(materias) {
    const secao = document.getElementById(
        "secaoUltimosArquivos"
    );

    if (!secao) {
        return;
    }

    secao.querySelectorAll(".item").forEach(
        item => item.remove()
    );

    const link = secao.querySelector(".ver-todos");

    const respostas = await Promise.all(
        materias.map(async materia => {
            const resposta = await fetch(
                `${API_BASE}/materias/${materia.id}/arquivos`,
                {
                    credentials: "include"
                }
            );

            if (!resposta.ok) {
                return [];
            }

            const dados = await resposta.json();

            return (dados.arquivos || []).map(
                arquivo => ({
                    ...arquivo,
                    materiaId: materia.id,
                    materiaNome: materia.nome
                })
            );
        })
    );

    const arquivos = respostas
        .flat()
        .sort(
            (a, b) =>
                converterDataFirestore(b.criadoEm) -
                converterDataFirestore(a.criadoEm)
        )
        .slice(0, 3);

    if (!arquivos.length) {
        link.insertAdjacentHTML(
            "beforebegin",
            `
                <div class="item">
                    <div class="detalhe">
                        Nenhum arquivo adicionado.
                    </div>
                </div>
            `
        );

        return;
    }

    arquivos.forEach(arquivo => {
        const dataEmMilissegundos =
            converterDataFirestore(arquivo.criadoEm);

        const data = dataEmMilissegundos
            ? new Date(dataEmMilissegundos)
                .toLocaleDateString(
                    "pt-BR",
                    {
                        day: "2-digit",
                        month: "2-digit"
                    }
                )
            : "";

        const paginaMateria =
            `./src/pages/paginaMateria.html?id=${encodeURIComponent(arquivo.materiaId)}&nome=${encodeURIComponent(arquivo.materiaNome)}`;

        const html = `
            <a class="item" href="${paginaMateria}">
                <div class="item-esq">
                    <span class="item-icone laranja">
                        📄
                    </span>

                    <div>
                        <div class="nome">
                            ${escaparHTMLInicio(arquivo.nome)}
                        </div>

                        <div class="detalhe">
                            ${escaparHTMLInicio(arquivo.materiaNome)}
                            ${data ? ` · ${data}` : ""}
                        </div>
                    </div>
                </div>

                <span class="chevron">
                    ›
                </span>
            </a>
        `;

        link.insertAdjacentHTML(
            "beforebegin",
            html
        );
    });
}

async function verificarAutenticacao() {

    try {

        const resposta = await fetch(
            `${API_BASE}/auth/me`,
            {
                method: "GET",
                credentials: "include"
            }
        );


        /* -------------------------------------------------
           SEM SESSÃO
        ------------------------------------------------- */

        if (!resposta.ok) {

            bloquearAplicacao();

            return;
        }


        const dados = await resposta.json();


        /* -------------------------------------------------
           COM SESSÃO
        ------------------------------------------------- */

        if (dados.autenticado) {

            console.log(
                "Sessão encontrada:",
                dados.usuario
            );

            atualizarSaudacao(dados.usuario);

            liberarAplicacao();

        } else {

            bloquearAplicacao();
        }


    } catch (erro) {

        console.error(
            "Erro verificando autenticação:",
            erro
        );


        /*
            Se o backend estiver desligado ou inacessível,
            o usuário NÃO deve entrar no aplicativo.

            Isso mantém o login obrigatório.
        */

        bloquearAplicacao();
    }
}


/* =========================================================
   SAUDAÇÃO COM O NOME DO USUÁRIO
========================================================= */

function atualizarSaudacao(usuario) {

    const elementoNome =
        document.getElementById("nomeUsuario");

    if (
        !elementoNome ||
        !usuario ||
        !usuario.nome
    ) {
        return;
    }

    // Usa só o primeiro nome, fica mais natural na saudação
    const primeiroNome =
        usuario.nome.trim().split(" ")[0];

    elementoNome.textContent = primeiroNome;
}


/* =========================================================
   BLOQUEAR APLICAÇÃO
========================================================= */

function bloquearAplicacao() {

    const authOverlay =
        document.getElementById("authOverlay");


    if (!authOverlay) {

        console.error(
            "Elemento #authOverlay não encontrado."
        );

        return;
    }


    authOverlay.style.display = "flex";


    document.body.classList.add(
        "auth-aberto"
    );
}


/* =========================================================
   LIBERAR APLICAÇÃO
========================================================= */

function verificarConvitePendente() {
    const comunidadeId = sessionStorage.getItem(
        "joviclass_convite_pendente"
    );

    if (!comunidadeId) {
        return;
    }

    window.location.href =
        `./src/pages/comunidade.html?convite=${encodeURIComponent(comunidadeId)}`;
}

function liberarAplicacao() {

    const authOverlay =
        document.getElementById("authOverlay");

    const botaoSuporte =
        document.getElementById("botaoSuporte");


    if (!authOverlay) {
        return;
    }

    botaoSuporte.hidden = false;


    authOverlay.style.display = "none";


    document.body.classList.remove(
        "auth-aberto"
    );


    /*
        Assim que a aplicação libera o botão de suporte,
        iniciamos o balãozinho "Precisa de ajuda?".
    */

    iniciarBalaoSuporte();

    verificarConvitePendente();

    carregarResumoReal();

    carregarListasInicio();

    /*
        Só busca os dados de notificação (eventos, tarefas
        e Google Agenda) DEPOIS de confirmar que existe
        sessão — antes disso essas rotas responderiam 401.
    */
    carregarDadosNotificacoes();

}


/* =========================================================
   BALÃO "PRECISA DE AJUDA?" — CHATBOT
========================================================= */

function posicionarBalaoSuporte() {

    const botaoSuporte =
        document.getElementById("botaoSuporte");

    const balaoSuporte =
        document.getElementById("balaoSuporte");

    if (!botaoSuporte || !balaoSuporte) {
        return;
    }

    const retanguloBotao =
        botaoSuporte.getBoundingClientRect();

    /*
        Posicionamos o balão logo acima do botão,
        alinhado pela borda direita, usando "fixed"
        para acompanhar o botão em qualquer resolução.
    */

    balaoSuporte.style.bottom =
        `${window.innerHeight - retanguloBotao.top + 14}px`;

    balaoSuporte.style.right =
        `${window.innerWidth - retanguloBotao.right}px`;
}


function iniciarBalaoSuporte() {

    const botaoSuporte =
        document.getElementById("botaoSuporte");

    const balaoSuporte =
        document.getElementById("balaoSuporte");

    if (!botaoSuporte || !balaoSuporte) {
        return;
    }

    /*
        liberarAplicacao() pode ser chamada mais de uma vez
        (diferentes fluxos de login). Evita registrar os
        mesmos listeners e timers repetidamente.
    */

    if (balaoSuporte.dataset.iniciado === "true") {
        return;
    }

    balaoSuporte.dataset.iniciado = "true";

    let temporizadorEsconder = null;


    function mostrarBalao() {

        posicionarBalaoSuporte();

        balaoSuporte.hidden = false;

        /*
            Pequeno atraso pra garantir que a transição
            de opacidade/transform seja animada.
        */

        requestAnimationFrame(() => {
            balaoSuporte.classList.add("mostrar");
        });

        clearTimeout(temporizadorEsconder);

        temporizadorEsconder = setTimeout(
            esconderBalao,
            8000
        );
    }


    function esconderBalao() {

        balaoSuporte.classList.remove("mostrar");

        setTimeout(() => {
            balaoSuporte.hidden = true;
        }, 350);
    }


    /*
        Mostra o balão logo depois que o botão aparece.
    */

    setTimeout(mostrarBalao, 1500);


    /*
        Clicar no balão abre o suporte, como se tivesse
        clicado direto no botão.
    */

    balaoSuporte.addEventListener("click", () => {
        esconderBalao();
        botaoSuporte.click();
    });


    /*
        Clicar no próprio botão de suporte também
        esconde o balão.
    */

    botaoSuporte.addEventListener("click", esconderBalao);


    /*
        Reposiciona o balão se a tela for redimensionada
        ou o dispositivo for rotacionado.
    */

    window.addEventListener("resize", () => {
        if (balaoSuporte.classList.contains("mostrar")) {
            posicionarBalaoSuporte();
        }
    });
}


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        /*
            1. Primeiro verifica se existe sessão.
            2. Se não existir, mantém o login aberto.
        */

        verificarAutenticacao();


        /*
            Liga as abas e os formulários de e-mail/senha.
        */

        inicializarAbasAuth();
        inicializarLoginEmail();
        inicializarCadastroEmail();
        inicializarConfirmacaoCadastro();
        inicializarToggleSenha();
        inicializarRecuperacaoSenha();


        /*
            Inicia o sistema de notificações.
        */

        iniciarSistemaDeNotificacoes();

    }
);


/*
    O Google Identity Services possui async/defer.

    Por isso esperamos o carregamento da janela
    para inicializar o botão do Google.
*/

window.addEventListener(
    "load",
    () => {

        inicializarGoogleLogin();

    }
);