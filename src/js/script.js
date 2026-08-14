// ===== Menu hambúrguer (mobile) =====
const hamburger = document.getElementById("hamburger");
const menuLinks = document.getElementById("menuLinks");

if (hamburger && menuLinks) {
  hamburger.addEventListener("click", () => {
    menuLinks.classList.toggle("active");
  });
}

// ===== Overlay de confirmação =====
const overlay = document.getElementById("overlay");
const cancelBtn = document.getElementById("cancelBtn");
const okBtn = document.getElementById("okBtn");

const toggleOverlay = (show) => {
  if (overlay) overlay.classList.toggle("show", show);
};

// Qualquer elemento com [data-confirm] abre o overlay ao ser clicado
document.querySelectorAll("[data-confirm]").forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    toggleOverlay(true);
  });
});

if (cancelBtn) cancelBtn.addEventListener("click", () => toggleOverlay(false));
if (okBtn) okBtn.addEventListener("click", () => toggleOverlay(false));

// =====================================================
// SISTEMA DE NOTIFICAÇÕES POR PROXIMIDADE
// (provas, trabalhos, reuniões...)
// =====================================================

/**
 * Fonte de dados dos eventos.
 * Troque isso por dados vindos do seu backend/API quando tiver um.
 * Formato da data: "AAAA-MM-DDTHH:MM" (data e hora do evento)
 */
const EVENTOS = [
  { id: "prova-calculo",  titulo: "Prova de Cálculo I",      tipo: "prova",    materia: "Cálculo I", data: "2024-05-25T08:00" },
  { id: "prova-fisica",   titulo: "Prova de Física II",      tipo: "prova",    materia: "Física II",  data: "2024-06-02T08:00" },
  { id: "trabalho-eco",   titulo: "Entrega do trabalho de Economia", tipo: "trabalho", materia: "Economia", data: "2024-06-05T23:59" },
  { id: "reuniao-grupo",  titulo: "Reunião do grupo de estudos", tipo: "reuniao", materia: "Cálculo I", data: "2024-05-20T19:00" },
];

// Ícone por tipo de evento
const ICONE_TIPO = {
  prova: "📝",
  trabalho: "📁",
  reuniao: "🗓️",
};

// Em quantos milissegundos cada limiar de alerta dispara antes do evento
const LIMIARES_ALERTA = {
  aviso7dias: 7 * 24 * 60 * 60 * 1000,
  aviso1dia: 24 * 60 * 60 * 1000,
  aviso1hora: 60 * 60 * 1000,
};

const CHAVE_LIDAS = "joviclass_notif_lidas";
const CHAVE_DISPARADAS = "joviclass_notif_disparadas"; // controla notificações do SO já enviadas

function carregarSet(chave) {
  try {
    return new Set(JSON.parse(localStorage.getItem(chave)) || []);
  } catch {
    return new Set();
  }
}

function salvarSet(chave, set) {
  localStorage.setItem(chave, JSON.stringify([...set]));
}

let lidas = carregarSet(CHAVE_LIDAS);
let disparadas = carregarSet(CHAVE_DISPARADAS);

// Calcula quanto tempo falta e classifica a urgência
function calcularStatus(evento) {
  const agora = new Date();
  const dataEvento = new Date(evento.data);
  const diffMs = dataEvento - agora;

  if (diffMs <= 0) return null; // evento já passou, não notifica mais

  const diffHoras = diffMs / (1000 * 60 * 60);
  const diffDias = diffHoras / 24;

  let urgencia = "normal";
  if (diffHoras <= 24) urgencia = "urgente";
  else if (diffDias <= 3) urgencia = "breve";

  let prazoTexto;
  if (diffHoras < 1) prazoTexto = "em menos de 1h";
  else if (diffHoras < 24) prazoTexto = `em ${Math.round(diffHoras)}h`;
  else prazoTexto = `em ${Math.ceil(diffDias)} dia${Math.ceil(diffDias) > 1 ? "s" : ""}`;

  return { diffMs, diffHoras, diffDias, urgencia, prazoTexto };
}

// Monta a lista de notificações ativas (eventos futuros dentro da janela de aviso)
function gerarNotificacoes() {
  return EVENTOS
    .map((evento) => {
      const status = calcularStatus(evento);
      if (!status || status.diffMs > LIMIARES_ALERTA.aviso7dias) return null;
      return { ...evento, ...status };
    })
    .filter(Boolean)
    .sort((a, b) => a.diffMs - b.diffMs);
}

const TIPO_LABEL = { prova: "Prova", trabalho: "Trabalho", reuniao: "Reunião" };

function renderizarPainel() {
  const lista = document.getElementById("notifLista");
  const dot = document.getElementById("notifDot");
  if (!lista || !dot) return;

  const notificacoes = gerarNotificacoes();
  const naoLidas = notificacoes.filter((n) => !lidas.has(n.id));

  // badge no sino
  if (naoLidas.length > 0) {
    dot.hidden = false;
    dot.textContent = naoLidas.length > 9 ? "9+" : naoLidas.length;
  } else {
    dot.hidden = true;
  }

  if (notificacoes.length === 0) {
    lista.innerHTML = `<div class="notif-vazio">Nenhuma prova, trabalho ou reunião chegando perto!</div>`;
    return;
  }

  lista.innerHTML = notificacoes
    .map((n) => `
      <div class="notif-item ${lidas.has(n.id) ? "" : "nao-lida"}" data-id="${n.id}">
        <span class="notif-icone ${n.urgencia}">${ICONE_TIPO[n.tipo] || "🔔"}</span>
        <div class="notif-corpo">
          <div class="notif-titulo">${n.titulo}</div>
          <div class="notif-sub">${TIPO_LABEL[n.tipo] || "Evento"}${n.materia ? " · " + n.materia : ""}</div>
          <span class="notif-prazo ${n.urgencia}">Vence ${n.prazoTexto}</span>
        </div>
      </div>
    `)
    .join("");

  // marcar como lida ao clicar em um item
  lista.querySelectorAll(".notif-item").forEach((el) => {
    el.addEventListener("click", () => {
      lidas.add(el.dataset.id);
      salvarSet(CHAVE_LIDAS, lidas);
      renderizarPainel();
    });
  });
}

// Dispara notificação real do sistema operacional (se o usuário permitiu)
function dispararNotificacaoDoNavegador(evento, status) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const chaveDisparo = `${evento.id}-${status.urgencia}`;
  if (disparadas.has(chaveDisparo)) return; // evita repetir o mesmo alerta

  new Notification(`${TIPO_LABEL[evento.tipo]}: ${evento.titulo}`, {
    body: `Vence ${status.prazoTexto}.`,
    icon: "./src/assets/img/logo.png",
  });

  disparadas.add(chaveDisparo);
  salvarSet(CHAVE_DISPARADAS, disparadas);
}

// Varre os eventos e dispara alertas do navegador nos limiares certos (24h e 1h antes)
function verificarAlertasDoSistema() {
  EVENTOS.forEach((evento) => {
    const status = calcularStatus(evento);
    if (!status) return;
    if (status.diffMs <= LIMIARES_ALERTA.aviso1hora || status.diffMs <= LIMIARES_ALERTA.aviso1dia) {
      dispararNotificacaoDoNavegador(evento, status);
    }
  });
}

// Pede permissão para notificações do sistema e liga o painel/sino
function iniciarSistemaDeNotificacoes() {
  const notifBtn = document.getElementById("notifBtn");
  const notifPanel = document.getElementById("notifPanel");
  const notifMarcarLidas = document.getElementById("notifMarcarLidas");

  renderizarPainel();
  verificarAlertasDoSistema();

  // pede permissão (não bloqueia o app se o usuário recusar)
  if ("Notification" in window && Notification.permission === "default") {
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
      if (!notifPanel.hidden && !notifPanel.contains(e.target) && e.target !== notifBtn) {
        notifPanel.hidden = true;
        notifBtn.setAttribute("aria-expanded", "false");
      }
    });
  }

  if (notifMarcarLidas) {
    notifMarcarLidas.addEventListener("click", () => {
      gerarNotificacoes().forEach((n) => lidas.add(n.id));
      salvarSet(CHAVE_LIDAS, lidas);
      renderizarPainel();
    });
  }

  // reavalia periodicamente enquanto o app estiver aberto (a cada 5 minutos)
  setInterval(() => {
    renderizarPainel();
    verificarAlertasDoSistema();
  }, 5 * 60 * 1000);
}

iniciarSistemaDeNotificacoes();