/* =========================================================
   URL BASE DA API
========================================================= */

/*
    Sem backend: todos os dados ficam no localStorage,
    através do objeto DB (src/js/db.js).
*/


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
    carregarDadosNotificacoes().
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

    return [
        ...eventosLocaisFormatados,
        ...tarefasFormatadas
    ];
}


/* =========================================================
   BUSCAR OS DADOS REAIS NA API
========================================================= */

function carregarDadosNotificacoes() {

    window.eventosLocaisCache = DB.eventos.listar().map(
        (evento) => ({
            ...evento,
            data: criarDataLocal(evento.data)
        })
    );

    window.tarefasCache = DB.tarefas.listar();

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
        notifMarcarLidas.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();

            const notificacoes = gerarNotificacoes();

            notificacoes.forEach((n) => {
                lidas.add(n.id);
            });

            salvarSet(CHAVE_LIDAS, lidas);

            renderizarPainel();
        });
    }

    /* -----------------------------------------------------
       ATUALIZA A CADA 5 MINUTOS
    ----------------------------------------------------- */

    setInterval(() => {
        carregarDadosNotificacoes();
    }, 5 * 60 * 1000);
}


/* =========================================================
   RESUMO DA PÁGINA INICIAL
========================================================= */

async function carregarResumoReal() {
    try {
        const materias = DB.materias.listar();
        const tarefas = DB.tarefas.listar();

        const tarefasConcluidas =
            tarefas.filter(
                tarefa => tarefa.concluida === true
            ).length;

        const totalArquivos =
            materias.reduce(
                (total, materia) =>
                    total + DB.arquivos(materia.id).listar().length,
                0
            );

        const totalAnotacoes = materias.reduce(
            (total, materia) =>
                total + DB.anotacoes(materia.id).listar().length,
            0
        );

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
        const eventos = DB.eventos.listar();
        const materias = DB.materias.listar();

        renderizarProximasProvas(eventos);
        renderizarUltimosArquivos(materias);
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

function renderizarUltimosArquivos(materias) {
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

    const respostas = materias.map(materia =>
        DB.arquivos(materia.id).listar().map(arquivo => ({
            ...arquivo,
            materiaId: materia.id,
            materiaNome: materia.nome
        }))
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


/* =========================================================
   CONVITE PENDENTE (COMUNIDADES)
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


/* =========================================================
   INICIAR APLICAÇÃO (SEM LOGIN)
========================================================= */

function iniciarAplicacao() {

    const botaoSuporte =
        document.getElementById("botaoSuporte");

    if (botaoSuporte) {
        botaoSuporte.hidden = false;
    }

    iniciarBalaoSuporte();

    verificarConvitePendente();

    carregarResumoReal();

    carregarListasInicio();

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
        Evita registrar os mesmos listeners e timers
        repetidamente se a função for chamada mais de uma vez.
    */

    if (balaoSuporte.dataset.iniciado === "true") {
        return;
    }

    balaoSuporte.dataset.iniciado = "true";

    let temporizadorEsconder = null;


    function mostrarBalao() {

        posicionarBalaoSuporte();

        balaoSuporte.hidden = false;

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


    setTimeout(mostrarBalao, 1500);


    balaoSuporte.addEventListener("click", () => {
        esconderBalao();
        botaoSuporte.click();
    });


    botaoSuporte.addEventListener("click", esconderBalao);


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

        iniciarSistemaDeNotificacoes();

        iniciarAplicacao();

    }
);