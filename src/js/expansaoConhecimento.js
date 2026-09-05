const hamburger = document.getElementById("hamburger");
const menuLinks = document.getElementById("menuLinks");

if (hamburger && menuLinks) {
  hamburger.addEventListener("click", () => {
    menuLinks.classList.toggle("active");
  });
}

const overlay = document.getElementById("overlay");
const cancelBtn = document.getElementById("cancelBtn");
const okBtn = document.getElementById("okBtn");

const toggleOverlay = (show) => {
  if (overlay) overlay.classList.toggle("show", show);
};

document.querySelectorAll("[data-confirm]").forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    toggleOverlay(true);
  });
});

if (cancelBtn) cancelBtn.addEventListener("click", () => toggleOverlay(false));
if (okBtn) okBtn.addEventListener("click", () => toggleOverlay(false));

const CATEGORY_META = {
  matematica: { label: "Matemática", icon: "🕮", class: "cat-matematica" },
  ciencias:   { label: "Ciências",   icon: "🕮", class: "cat-ciencias" },
  idiomas:    { label: "Idiomas",    icon: "🕮", class: "cat-idiomas" },
  tecnologia: { label: "Tecnologia", icon: "🕮", class: "cat-tecnologia" },
  historia:   { label: "História & Cultura", icon: "🕮", class: "cat-historia" },
};

const RESOURCES = [
  {
    name: "Khan Academy Brasil",
    url: "https://pt.khanacademy.org/",
    description: "Aulas e exercícios gratuitos de matemática do básico ao avançado.",
    category: "matematica",
  },
  {
    name: "Toda Matéria",
    url: "https://www.todamateria.com.br/",
    description: "Resumos e exercícios de matemática e ciências para o dia a dia escolar.",
    category: "matematica",
  },
  {
    name: "NASA STEM",
    url: "https://www.nasa.gov/stem/",
    description: "Conteúdo oficial da NASA sobre espaço, física e engenharia.",
    category: "ciencias",
  },
  {
    name: "Manual do Mundo",
    url: "https://www.manualdomundo.com.br/",
    description: "Experimentos e explicações de ciência de forma prática e visual.",
    category: "ciencias",
  },
  {
    name: "Duolingo",
    url: "https://www.duolingo.com/",
    description: "Pratique idiomas com lições curtas e gamificadas todos os dias.",
    category: "idiomas",
  },
  {
    name: "BBC Learning English",
    url: "https://www.bbc.co.uk/learningenglish",
    description: "Vídeos, áudios e exercícios para melhorar seu inglês.",
    category: "idiomas",
  },
  {
    name: "freeCodeCamp",
    url: "https://www.freecodecamp.org/",
    description: "Cursos gratuitos de programação com certificado, do zero ao avançado.",
    category: "tecnologia",
  },
  {
    name: "Codecademy",
    url: "https://www.codecademy.com/",
    description: "Aprenda a programar praticando direto no navegador.",
    category: "tecnologia",
  },
  {
    name: "Google Arts & Culture",
    url: "https://artsandculture.google.com/",
    description: "Explore museus, obras de arte e patrimônios históricos do mundo todo.",
    category: "historia",
  },
  {
    name: "TED-Ed",
    url: "https://ed.ted.com/",
    description: "Vídeo-aulas curtas sobre ciência, história, filosofia e mais.",
    category: "historia",
  },
  {
    name: "Wikipédia",
    url: "https://pt.wikipedia.org/",
    description: "Enciclopédia colaborativa para consultas rápidas sobre qualquer tema.",
    category: "historia",
  },
  {
    name: "Coursera",
    url: "https://www.coursera.org/",
    description: "Cursos de universidades reais em diversas áreas do conhecimento.",
    category: "tecnologia",
  },
];

let communityArticles = [];

let activeCategory = "todos";
let searchTerm = "";

const resourceList = document.getElementById("resourceList");
const emptyState = document.getElementById("emptyState");
const chipRow = document.getElementById("chipRow");
const searchInput = document.getElementById("searchInput");
const communitySection = document.getElementById("communitySection");
const communityList = document.getElementById("communityList");

function externalLinkIcon() {
  return `<svg class="resource-arrow" viewBox="0 0 24 24" fill="none">
    <path d="M7 17 17 7M9 7h8v8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function renderResources() {
  const filtered = RESOURCES.filter((r) => {
    const matchesCategory = activeCategory === "todos" || r.category === activeCategory;
    const matchesSearch =
      searchTerm.trim() === "" ||
      r.name.toLowerCase().includes(searchTerm) ||
      r.description.toLowerCase().includes(searchTerm);
    return matchesCategory && matchesSearch;
  });

  resourceList.innerHTML = filtered
    .map((r) => {
      const meta = CATEGORY_META[r.category];
      return `
        <a class="resource-card" href="${r.url}" target="_blank" rel="noopener noreferrer">
          <div class="resource-icon ${meta.class}">${meta.icon}</div>
          <div class="resource-body">
            <h3>${r.name}</h3>
            <p>${r.description}</p>
            <span class="resource-tag">${meta.label}</span>
          </div>
          ${externalLinkIcon()}
        </a>
      `;
    })
    .join("");

  emptyState.hidden = filtered.length !== 0;
}

function renderCommunityArticles() {
  if (communityArticles.length === 0) {
    communitySection.hidden = true;
    return;
  }
  communitySection.hidden = false;
  communityList.innerHTML = communityArticles
    .map((a) => {
      const meta = CATEGORY_META[a.category];
      return `
        <div class="community-item">
          <div class="meta">
            <div class="author-dot">${a.author.slice(0, 1).toUpperCase()}</div>
            <span>${a.author} · ${meta.label}</span>
          </div>
          <h4>${escapeHtml(a.title)}</h4>
          <p>${escapeHtml(a.content)}</p>
        </div>
      `;
    })
    .join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

chipRow.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  chipRow.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
  chip.classList.add("active");
  activeCategory = chip.dataset.category;
  renderResources();
});

searchInput.addEventListener("input", (e) => {
  searchTerm = e.target.value.toLowerCase();
  renderResources();
});

const modalOverlay = document.getElementById("modalOverlay");
const openPublishModal = document.getElementById("openPublishModal");
const closeModal = document.getElementById("closeModal");
const articleForm = document.getElementById("articleForm");
const toast = document.getElementById("toast");

function openModal() {
  modalOverlay.hidden = false;
  document.body.style.overflow = "hidden";
}
function hideModal() {
  modalOverlay.hidden = true;
  document.body.style.overflow = "";
  articleForm.reset();
}

openPublishModal.addEventListener("click", openModal);
closeModal.addEventListener("click", hideModal);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) hideModal();
});

articleForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const title = document.getElementById("articleTitle").value.trim();
  const category = document.getElementById("articleCategory").value;
  const content = document.getElementById("articleContent").value.trim();

  if (!title || !content) return;

  communityArticles.unshift({
    title,
    category,
    content,
    author: "Você", 
  });

  renderCommunityArticles();
  hideModal();
  showToast("Artigo publicado!");
});

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2400);
}

renderResources();
renderCommunityArticles();

const EVENTOS = [
  { id: "prova-calculo",  titulo: "Prova de Cálculo I",      tipo: "prova",    materia: "Cálculo I", data: "2024-05-25T08:00" },
  { id: "prova-fisica",   titulo: "Prova de Física II",      tipo: "prova",    materia: "Física II",  data: "2024-06-02T08:00" },
  { id: "trabalho-eco",   titulo: "Entrega do trabalho de Economia", tipo: "trabalho", materia: "Economia", data: "2024-06-05T23:59" },
  { id: "reuniao-grupo",  titulo: "Reunião do grupo de estudos", tipo: "reuniao", materia: "Cálculo I", data: "2024-05-20T19:00" },
];

const ICONE_TIPO = {
  prova: "📝",
  trabalho: "📁",
  reuniao: "🗓️",
};

const LIMIARES_ALERTA = {
  aviso7dias: 7 * 24 * 60 * 60 * 1000,
  aviso1dia: 24 * 60 * 60 * 1000,
  aviso1hora: 60 * 60 * 1000,
};

const CHAVE_LIDAS = "joviclass_notif_lidas";
const CHAVE_DISPARADAS = "joviclass_notif_disparadas"; 
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

function calcularStatus(evento) {
  const agora = new Date();
  const dataEvento = new Date(evento.data);
  const diffMs = dataEvento - agora;

  if (diffMs <= 0) return null; 

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

  lista.querySelectorAll(".notif-item").forEach((el) => {
    el.addEventListener("click", () => {
      lidas.add(el.dataset.id);
      salvarSet(CHAVE_LIDAS, lidas);
      renderizarPainel();
    });
  });
}

function dispararNotificacaoDoNavegador(evento, status) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const chaveDisparo = `${evento.id}-${status.urgencia}`;
  if (disparadas.has(chaveDisparo)) return; 

  new Notification(`${TIPO_LABEL[evento.tipo]}: ${evento.titulo}`, {
    body: `Vence ${status.prazoTexto}.`,
    icon: "./src/assets/img/logo.png",
  });

  disparadas.add(chaveDisparo);
  salvarSet(CHAVE_DISPARADAS, disparadas);
}

function verificarAlertasDoSistema() {
  EVENTOS.forEach((evento) => {
    const status = calcularStatus(evento);
    if (!status) return;
    if (status.diffMs <= LIMIARES_ALERTA.aviso1hora || status.diffMs <= LIMIARES_ALERTA.aviso1dia) {
      dispararNotificacaoDoNavegador(evento, status);
    }
  });
}
function iniciarSistemaDeNotificacoes() {
  const notifBtn = document.getElementById("notifBtn");
  const notifPanel = document.getElementById("notifPanel");
  const notifMarcarLidas = document.getElementById("notifMarcarLidas");

  renderizarPainel();
  verificarAlertasDoSistema();

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

  setInterval(() => {
    renderizarPainel();
    verificarAlertasDoSistema();
  }, 5 * 60 * 1000);
}

iniciarSistemaDeNotificacoes();