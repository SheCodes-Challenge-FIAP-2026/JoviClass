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
   EVENTOS
========================================================= */

const EVENTOS = [
    {
        id: "prova-calculo",
        titulo: "Prova de Cálculo I",
        tipo: "prova",
        materia: "Cálculo I",
        data: "2024-05-25T08:00"
    },
    {
        id: "prova-fisica",
        titulo: "Prova de Física II",
        tipo: "prova",
        materia: "Física II",
        data: "2024-06-02T08:00"
    },
    {
        id: "trabalho-eco",
        titulo: "Entrega do trabalho de Economia",
        tipo: "trabalho",
        materia: "Economia",
        data: "2024-06-05T23:59"
    },
    {
        id: "reuniao-grupo",
        titulo: "Reunião do grupo de estudos",
        tipo: "reuniao",
        materia: "Cálculo I",
        data: "2024-05-20T19:00"
    }
];

const ICONE_TIPO = {
    prova: "📝",
    trabalho: "📁",
    reuniao: "🗓️"
};

const TIPO_LABEL = {
    prova: "Prova",
    trabalho: "Trabalho",
    reuniao: "Reunião"
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
   GERAR NOTIFICAÇÕES
========================================================= */

function gerarNotificacoes() {
    return EVENTOS
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
    status
) {
    if (
        !("Notification" in window) ||
        Notification.permission !== "granted"
    ) {
        return;
    }

    const chaveDisparo =
        `${evento.id}-${status.urgencia}`;

    if (disparadas.has(chaveDisparo)) {
        return;
    }

    new Notification(
        `${TIPO_LABEL[evento.tipo]}: ${evento.titulo}`,
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

    EVENTOS.forEach((evento) => {

        const status = calcularStatus(evento);

        if (!status) {
            return;
        }

        if (
            status.diffMs <= LIMIARES_ALERTA.aviso1hora ||
            status.diffMs <= LIMIARES_ALERTA.aviso1dia
        ) {
            dispararNotificacaoDoNavegador(
                evento,
                status
            );
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


    renderizarPainel();

    verificarAlertasDoSistema();


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
    ----------------------------------------------------- */

    setInterval(() => {

        renderizarPainel();

        verificarAlertasDoSistema();

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
========================================================= */

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

        if (authErro) {
            authErro.textContent = "";
        }

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

            const resposta = await fetch(
                `${API_BASE}/auth/cadastro`,
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
                    "Não foi possível criar a conta."
                );
            }

            console.log(
                "Cadastro realizado:",
                dados.usuario
            );

            cadastroForm.reset();

            atualizarSaudacao(dados.usuario);

            liberarAplicacao();

        } catch (erro) {

            console.error(
                "Erro no cadastro:",
                erro
            );

            if (authErro) {
                authErro.textContent = erro.message;
            }
        }
    });
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

function liberarAplicacao() {

    const authOverlay =
        document.getElementById("authOverlay");


    if (!authOverlay) {
        return;
    }


    authOverlay.style.display = "none";


    document.body.classList.remove(
        "auth-aberto"
    );
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