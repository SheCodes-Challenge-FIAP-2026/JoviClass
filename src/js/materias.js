/* =========================================================
   JOVICLASS — MATÉRIAS E NOTIFICAÇÕES
   Persistência local: localStorage
   Não depende de backend/API.
========================================================= */

const CHAVE_MATERIAS = "materias";
const CHAVE_EVENTOS = "joviclass_eventos";
const CHAVE_LIDAS = "joviclass_notif_lidas";
const CHAVE_DISPARADAS = "joviclass_notif_disparadas";

const overlay = document.getElementById("overlay");
const fecharModal = document.getElementById("fecharModal");
const btnCancelar = document.getElementById("btnCancelar");
const btnCriar = document.getElementById("btnCriarMateria");
const inputNome = document.getElementById("nomeMateria");
const tituloModal = document.getElementById("tituloModal");
const cards = document.getElementById("cardsMaterias");
const dropdown = document.getElementById("dropdownMenu");
const hamburger = document.getElementById("hamburger");
const menuLinks = document.getElementById("menuLinks");
const seletorCores = document.getElementById("seletorCores");

let materias = [];
let eventos = [];
let editandoId = null;
let dropdownAlvoId = null;
let corSelecionada = "#1466ff";

/* =========================================================
   FUNÇÕES DE ARMAZENAMENTO
========================================================= */

function lerLocalStorage(chave, valorPadrao) {
  try {
    const valor = localStorage.getItem(chave);
    return valor === null ? valorPadrao : JSON.parse(valor);
  } catch (erro) {
    console.error(`Erro ao ler "${chave}" do localStorage:`, erro);
    return valorPadrao;
  }
}

function salvarLocalStorage(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
    return true;
  } catch (erro) {
    console.error(`Erro ao salvar "${chave}" no localStorage:`, erro);
    mostrarToast("❌ Não foi possível salvar os dados no navegador");
    return false;
  }
}

function gerarId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `materia-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escaparHTML(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (caractere) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[caractere]);
}

/* =========================================================
   MATÉRIAS
========================================================= */

function carregarMaterias() {
  const dados = lerLocalStorage(CHAVE_MATERIAS, []);

  materias = Array.isArray(dados) ? dados : [];

  // Garante que matérias antigas tenham os campos necessários.
  materias = materias.map((materia) => ({
    id: materia.id ?? gerarId(),
    nome: materia.nome ?? "Matéria sem nome",
    cor: materia.cor || "#1466ff",
    compartilhada: Boolean(materia.compartilhada),
    arquivos: contarArquivos(materia.id, materia.arquivos)
  }));

  salvarMaterias();
  renderizarCards();
}

function salvarMaterias() {
  return salvarLocalStorage(CHAVE_MATERIAS, materias);
}

function obterArquivosDaMateria(materiaId) {
  const dados = lerLocalStorage(`arquivos_${materiaId}`, []);
  return Array.isArray(dados) ? dados : [];
}

function contarArquivos(materiaId, quantidadeAnterior = 0) {
  if (materiaId === undefined || materiaId === null) {
    return Number(quantidadeAnterior) || 0;
  }

  const chaveArquivos = `arquivos_${materiaId}`;
  const chaveItens = `materia:${materiaId}:itens`;

  // Compatibilidade com as duas estruturas usadas no projeto.
  if (localStorage.getItem(chaveArquivos) !== null) {
    return obterArquivosDaMateria(materiaId).length;
  }

  if (localStorage.getItem(chaveItens) !== null) {
    const itens = lerLocalStorage(chaveItens, []);
    return Array.isArray(itens)
      ? itens.length
      : Number(quantidadeAnterior) || 0;
  }

  // Compatibilidade com matérias antigas que só tinham a contagem salva.
  return Number(quantidadeAnterior) || 0;
}

function atualizarQuantidadeArquivos() {
  materias = materias.map((materia) => ({
    ...materia,
    arquivos: contarArquivos(materia.id, materia.arquivos)
  }));

  salvarMaterias();
  renderizarCards();
}

function corFundo(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const mix = (c) => Math.round(c * 0.15 + 255 * 0.85);

  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

/* =========================================================
   MENU E SELETOR DE CORES
========================================================= */

if (hamburger && menuLinks) {
  hamburger.addEventListener("click", () => {
    menuLinks.classList.toggle("active");
  });
}

if (seletorCores) {
  seletorCores.addEventListener("click", (e) => {
    const btn = e.target.closest(".btnCor");
    if (!btn) return;

    document.querySelectorAll(".btnCor").forEach((b) => {
      b.classList.remove("selecionada");
    });

    btn.classList.add("selecionada");
    corSelecionada = btn.dataset.cor;
  });
}

/* =========================================================
   RENDERIZAÇÃO DOS CARDS
========================================================= */

function renderizarCards() {
  if (!cards) return;

  cards.innerHTML = "";

  if (materias.length === 0) {
    cards.innerHTML = `
      <p style="color:#888;margin-top:20px">
        Nenhuma matéria cadastrada ainda.
      </p>
    `;
    return;
  }

  materias.forEach((materia) => {
    const cor = materia.cor || "#1466ff";
    const bg = corFundo(cor);
    const quantidadeArquivos = contarArquivos(materia.id, materia.arquivos);

    const card = document.createElement("div");
    card.className = "cardMateria";
    card.dataset.id = materia.id;

    card.innerHTML = `
      <div class="cardTopoRow">
        <svg class="iconeMateria" width="42" height="42"
          viewBox="0 0 48 48" fill="none"
          xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="12" fill="${bg}"/>
          <path d="M14 34V16a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v18l-6-3-4 3-4-3-6 3z"
            fill="${escaparHTML(cor)}"/>
        </svg>
        <button class="btnOpcoes" data-id="${escaparHTML(materia.id)}"
          title="Opções" type="button">&#8942;</button>
      </div>
      <h3>${escaparHTML(materia.nome)}</h3>
      <p>${quantidadeArquivos} arquivo(s)</p>
    `;

    card.addEventListener("click", (e) => {
      if (e.target.closest(".btnOpcoes")) return;

      const nome = encodeURIComponent(materia.nome);
      window.location.href =
        `./paginaMateria.html?id=${encodeURIComponent(materia.id)}&nome=${nome}`;
    });

    cards.appendChild(card);
  });

  cards.querySelectorAll(".btnOpcoes").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      abrirDropdown(btn.dataset.id, btn);
    });
  });
}

/* =========================================================
   DROPDOWN DE OPÇÕES
========================================================= */

function abrirDropdown(id, btnRef) {
  if (!dropdown) return;

  dropdownAlvoId = id;

  const rect = btnRef.getBoundingClientRect();

  dropdown.style.top = `${rect.bottom + 6 + window.scrollY}px`;
  dropdown.style.left =
    `${rect.left - dropdown.offsetWidth + btnRef.offsetWidth}px`;

  dropdown.classList.add("visivel");

  requestAnimationFrame(() => {
    dropdown.style.left =
      `${rect.left - dropdown.offsetWidth + btnRef.offsetWidth}px`;
  });
}

document.addEventListener("click", (e) => {
  if (
    dropdown &&
    !dropdown.contains(e.target) &&
    !e.target.closest(".btnOpcoes")
  ) {
    dropdown.classList.remove("visivel");
    dropdownAlvoId = null;
  }
});

/* =========================================================
   COMPARTILHAR MATÉRIA
   O estado é salvo localmente. Isso não publica a matéria
   nem a compartilha com outros usuários/dispositivos.
========================================================= */

const dropCompartilhar = document.getElementById("dropCompartilhar");

if (dropCompartilhar) {
  dropCompartilhar.addEventListener("click", () => {
    if (dropdown) dropdown.classList.remove("visivel");

    const materia = materias.find(
      (item) => String(item.id) === String(dropdownAlvoId)
    );

    if (!materia) return;

    materia.compartilhada = !materia.compartilhada;
    salvarMaterias();

    mostrarToast(
      materia.compartilhada
        ? "📤 Matéria marcada como compartilhada"
        : "🔒 Compartilhamento desativado"
    );

    dropdownAlvoId = null;
  });
}

/* =========================================================
   RENOMEAR MATÉRIA
========================================================= */

const dropRenomear = document.getElementById("dropRenomear");

if (dropRenomear) {
  dropRenomear.addEventListener("click", () => {
    if (dropdown) dropdown.classList.remove("visivel");

    const materia = materias.find(
      (item) => String(item.id) === String(dropdownAlvoId)
    );

    if (!materia) return;

    editandoId = materia.id;
    inputNome.value = materia.nome;
    tituloModal.textContent = "Renomear Matéria";
    btnCriar.textContent = "Salvar";

    corSelecionada = materia.cor || "#1466ff";

    document.querySelectorAll(".btnCor").forEach((btn) => {
      btn.classList.toggle(
        "selecionada",
        btn.dataset.cor === corSelecionada
      );
    });

    overlay.classList.add("aberto");
    inputNome.focus();
    dropdownAlvoId = null;
  });
}

/* =========================================================
   EXCLUIR MATÉRIA
========================================================= */

const dropExcluir = document.getElementById("dropExcluir");

if (dropExcluir) {
  dropExcluir.addEventListener("click", () => {
    if (dropdown) dropdown.classList.remove("visivel");

    const materia = materias.find(
      (item) => String(item.id) === String(dropdownAlvoId)
    );

    if (!materia) return;

    const confirmou = confirm(
      `Excluir a matéria "${materia.nome}"? Essa ação não pode ser desfeita.`
    );

    if (!confirmou) {
      dropdownAlvoId = null;
      return;
    }

    const materiaId = materia.id;

    materias = materias.filter(
      (item) => String(item.id) !== String(materiaId)
    );

    salvarMaterias();

    // Remove também os arquivos e textos associados a essa matéria,
    // caso essas chaves sejam utilizadas no restante do projeto.
    localStorage.removeItem(`arquivos_${materiaId}`);
    localStorage.removeItem(`materia:${materiaId}:itens`);

    renderizarCards();
    mostrarToast("🗑️ Matéria excluída");
    dropdownAlvoId = null;
  });
}

/* =========================================================
   MODAL DE CRIAÇÃO/EDIÇÃO
========================================================= */

function abrirFormulario() {
  editandoId = null;
  inputNome.value = "";
  tituloModal.textContent = "Nova Matéria";
  btnCriar.textContent = "Criar Matéria";

  corSelecionada = "#1466ff";

  document.querySelectorAll(".btnCor").forEach((btn) => {
    btn.classList.toggle(
      "selecionada",
      btn.dataset.cor === corSelecionada
    );
  });

  overlay.classList.add("aberto");
  inputNome.focus();
}

function fechar() {
  if (overlay) overlay.classList.remove("aberto");

  if (inputNome) inputNome.value = "";

  editandoId = null;
}

if (fecharModal) fecharModal.addEventListener("click", fechar);
if (btnCancelar) btnCancelar.addEventListener("click", fechar);

if (overlay) {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) fechar();
  });
}

// Mantém compatibilidade com botão de abrir formulário no HTML.
window.abrirFormulario = abrirFormulario;

/* =========================================================
   SALVAR MATÉRIA NOVA OU EDITADA
========================================================= */

if (btnCriar) {
  btnCriar.addEventListener("click", () => {
    const nome = inputNome.value.trim();

    if (!nome) {
      inputNome.focus();
      return;
    }

    if (editandoId !== null) {
      const indice = materias.findIndex(
        (materia) => String(materia.id) === String(editandoId)
      );

      if (indice === -1) {
        mostrarToast("❌ Matéria não encontrada");
        return;
      }

      materias[indice] = {
        ...materias[indice],
        nome,
        cor: corSelecionada
      };

      if (!salvarMaterias()) return;

      mostrarToast("✏️ Matéria atualizada!");
    } else {
      const novaMateria = {
        id: gerarId(),
        nome,
        cor: corSelecionada,
        compartilhada: false,
        arquivos: 0
      };

      materias.push(novaMateria);

      if (!salvarMaterias()) {
        materias = materias.filter(
          (materia) => materia.id !== novaMateria.id
        );
        return;
      }

      mostrarToast("✅ Matéria criada!");
    }

    renderizarCards();
    fechar();
  });
}

if (inputNome) {
  inputNome.addEventListener("keydown", (e) => {
    if (e.key === "Enter") btnCriar.click();
  });
}

/* =========================================================
   TOAST
========================================================= */

function mostrarToast(msg) {
  let toast = document.getElementById("toastGlobal");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toastGlobal";
    toast.className = "toast";
    document.body.appendChild(toast);

    const style = document.createElement("style");
    style.textContent = `
      .toast {
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: #222;
        color: #fff;
        padding: 12px 20px;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 600;
        opacity: 0;
        transform: translateY(10px);
        transition: all .3s;
        z-index: 500;
        pointer-events: none;
        font-family: "Manrope", sans-serif;
      }
      .toast.show {
        opacity: 1;
        transform: translateY(0);
      }
    `;

    document.head.appendChild(style);
  }

  toast.textContent = msg;
  toast.classList.add("show");

  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

/* =========================================================
   EVENTOS E NOTIFICAÇÕES
========================================================= */

// Eventos iniciais de demonstração. Depois da primeira execução,
// a lista passa a ser carregada do localStorage.
const EVENTOS_INICIAIS = [
  {
    id: "prova-calculo",
    titulo: "Prova de Cálculo I",
    tipo: "prova",
    materia: "Cálculo I",
    data: "2026-09-22T08:00"
  },
  {
    id: "prova-fisica",
    titulo: "Prova de Física II",
    tipo: "prova",
    materia: "Física II",
    data: "2026-09-30T08:00"
  },
  {
    id: "trabalho-eco",
    titulo: "Entrega do trabalho de Economia",
    tipo: "trabalho",
    materia: "Economia",
    data: "2026-10-03T23:59"
  },
  {
    id: "reuniao-grupo",
    titulo: "Reunião do grupo de estudos",
    tipo: "reuniao",
    materia: "Cálculo I",
    data: "2026-09-16T19:00"
  }
];

eventos = lerLocalStorage(CHAVE_EVENTOS, null);

if (!Array.isArray(eventos)) {
  eventos = EVENTOS_INICIAIS;
  salvarLocalStorage(CHAVE_EVENTOS, eventos);
}

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

const LIMIARES_ALERTA = {
  aviso7dias: 7 * 24 * 60 * 60 * 1000,
  aviso1dia: 24 * 60 * 60 * 1000,
  aviso1hora: 60 * 60 * 1000
};

function carregarSet(chave) {
  const dados = lerLocalStorage(chave, []);
  return new Set(Array.isArray(dados) ? dados : []);
}

function salvarSet(chave, conjunto) {
  return salvarLocalStorage(chave, [...conjunto]);
}

let lidas = carregarSet(CHAVE_LIDAS);
let disparadas = carregarSet(CHAVE_DISPARADAS);

function calcularStatus(evento) {
  const agora = new Date();
  const dataEvento = new Date(evento.data);
  const diffMs = dataEvento - agora;

  if (Number.isNaN(dataEvento.getTime()) || diffMs <= 0) {
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
    prazoTexto = `em ${dias} dia${dias > 1 ? "s" : ""}`;
  }

  return {
    diffMs,
    diffHoras,
    diffDias,
    urgencia,
    prazoTexto
  };
}

function gerarNotificacoes() {
  return eventos
    .map((evento) => {
      const status = calcularStatus(evento);

      if (!status || status.diffMs > LIMIARES_ALERTA.aviso7dias) {
        return null;
      }

      return { ...evento, ...status };
    })
    .filter(Boolean)
    .sort((a, b) => a.diffMs - b.diffMs);
}

/* =========================================================
   RENDERIZAÇÃO DO PAINEL DE NOTIFICAÇÕES
========================================================= */

function renderizarPainel() {
  const lista = document.getElementById("notifLista");
  const dot = document.getElementById("notifDot");

  if (!lista || !dot) return;

  const notificacoes = gerarNotificacoes();
  const naoLidas = notificacoes.filter((n) => !lidas.has(n.id));

  if (naoLidas.length > 0) {
    dot.hidden = false;
    dot.textContent = naoLidas.length > 9 ? "9+" : naoLidas.length;
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

  lista.innerHTML = notificacoes.map((n) => `
    <div class="notif-item ${lidas.has(n.id) ? "" : "nao-lida"}"
      data-id="${escaparHTML(n.id)}">
      <span class="notif-icone ${escaparHTML(n.urgencia)}">
        ${ICONE_TIPO[n.tipo] || "🔔"}
      </span>
      <div class="notif-corpo">
        <div class="notif-titulo">${escaparHTML(n.titulo)}</div>
        <div class="notif-sub">
          ${TIPO_LABEL[n.tipo] || "Evento"}${n.materia ? " · " + escaparHTML(n.materia) : ""}
        </div>
        <span class="notif-prazo ${escaparHTML(n.urgencia)}">
          Vence ${escaparHTML(n.prazoTexto)}
        </span>
      </div>
    </div>
  `).join("");

  lista.querySelectorAll(".notif-item").forEach((elemento) => {
    elemento.addEventListener("click", () => {
      lidas.add(elemento.dataset.id);
      salvarSet(CHAVE_LIDAS, lidas);
      renderizarPainel();
    });
  });
}

/* =========================================================
   NOTIFICAÇÕES DO NAVEGADOR
========================================================= */

function dispararNotificacaoDoNavegador(evento, status, marco) {
  if (
    !("Notification" in window) ||
    Notification.permission !== "granted"
  ) {
    return;
  }

  const chaveDisparo = `${evento.id}-${marco}`;

  if (disparadas.has(chaveDisparo)) return;

  new Notification(
    `${TIPO_LABEL[evento.tipo] || "Evento"}: ${evento.titulo}`,
    {
      body: `Vence ${status.prazoTexto}.`,
      icon: "./src/assets/img/logo.png"
    }
  );

  disparadas.add(chaveDisparo);
  salvarSet(CHAVE_DISPARADAS, disparadas);
}

function verificarAlertasDoSistema() {
  eventos.forEach((evento) => {
    const status = calcularStatus(evento);
    if (!status) return;

    if (status.diffMs <= LIMIARES_ALERTA.aviso1hora) {
      dispararNotificacaoDoNavegador(evento, status, "1hora");
    } else if (status.diffMs <= LIMIARES_ALERTA.aviso1dia) {
      dispararNotificacaoDoNavegador(evento, status, "1dia");
    }
  });
}

/* =========================================================
   INICIALIZAÇÃO DO SISTEMA DE NOTIFICAÇÕES
========================================================= */

function iniciarSistemaDeNotificacoes() {
  const notifBtn = document.getElementById("notifBtn");
  const notifPanel = document.getElementById("notifPanel");
  const notifMarcarLidas = document.getElementById("notifMarcarLidas");

  renderizarPainel();
  verificarAlertasDoSistema();

  if (
    "Notification" in window &&
    Notification.permission === "default"
  ) {
    Notification.requestPermission();
  }

  if (notifBtn && notifPanel) {
    notifBtn.addEventListener("click", (e) => {
      e.stopPropagation();

      const aberto = !notifPanel.hidden;
      notifPanel.hidden = aberto;
      notifBtn.setAttribute("aria-expanded", String(!aberto));
    });

    document.addEventListener("click", (e) => {
      if (
        !notifPanel.hidden &&
        !notifPanel.contains(e.target) &&
        e.target !== notifBtn
      ) {
        notifPanel.hidden = true;
        notifBtn.setAttribute("aria-expanded", "false");
      }
    });
  }

  if (notifMarcarLidas) {
    notifMarcarLidas.addEventListener("click", () => {
      gerarNotificacoes().forEach((notificacao) => {
        lidas.add(notificacao.id);
      });

      salvarSet(CHAVE_LIDAS, lidas);
      renderizarPainel();
    });
  }

  setInterval(() => {
    renderizarPainel();
    verificarAlertasDoSistema();
  }, 5 * 60 * 1000);
}

/* =========================================================
   ATUALIZAÇÃO ENTRE ABAS/PÁGINAS
========================================================= */

window.addEventListener("storage", (e) => {
  if (e.key === CHAVE_MATERIAS) {
    carregarMaterias();
  }

  if (e.key === CHAVE_EVENTOS) {
    eventos = lerLocalStorage(CHAVE_EVENTOS, []);
    renderizarPainel();
  }

  if (e.key === CHAVE_LIDAS) {
    lidas = carregarSet(CHAVE_LIDAS);
    renderizarPainel();
  }

  if (e.key && e.key.startsWith("arquivos_")) {
    atualizarQuantidadeArquivos();
  }
});

/* =========================================================
   INICIALIZAÇÃO
========================================================= */

carregarMaterias();
iniciarSistemaDeNotificacoes();