const overlay     = document.getElementById('overlay');
const fecharModal = document.getElementById('fecharModal');
const btnCancelar = document.getElementById('btnCancelar');
const btnCriar    = document.getElementById('btnCriarMateria');
const inputNome   = document.getElementById('nomeMateria');
const tituloModal = document.getElementById('tituloModal');
const cards       = document.getElementById('cardsMaterias');
const dropdown    = document.getElementById('dropdownMenu');
const hamburger   = document.getElementById('hamburger');
const menuLinks   = document.getElementById('menuLinks');
const seletorCores = document.getElementById('seletorCores');

let materias = JSON.parse(localStorage.getItem('materias') || '[]');
let editandoId = null;
let dropdownAlvoId = null;
let corSelecionada = '#1466ff'; 

function corFundo(hex) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  const mix = (c) => Math.round(c * 0.15 + 255 * 0.85);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}


hamburger.addEventListener('click', () => {
  menuLinks.classList.toggle('active');
});

seletorCores.addEventListener('click', (e) => {
  const btn = e.target.closest('.btnCor');
  if (!btn) return;

  document.querySelectorAll('.btnCor').forEach(b => b.classList.remove('selecionada'));
  btn.classList.add('selecionada');
  corSelecionada = btn.dataset.cor;
});

function renderizarCards() {
  cards.innerHTML = '';
  if (materias.length === 0) {
    cards.innerHTML = '<p style="color:#888;margin-top:20px">Nenhuma matéria cadastrada ainda.</p>';
    return;
  }

  materias.forEach(m => {
    const cor = m.cor || '#1466ff';
    const bg  = corFundo(cor);

    const card = document.createElement('div');
    card.className = 'cardMateria';
    card.dataset.id = m.id;

    card.innerHTML = `
      <div class="cardTopoRow">
        <svg class="iconeMateria" width="42" height="42" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="12" fill="${bg}"/>
          <path d="M14 34V16a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v18l-6-3-4 3-4-3-6 3z" fill="${cor}"/>
        </svg>
        <button class="btnOpcoes" data-id="${m.id}" title="Opções">&#8942;</button>
      </div>
      <h3>${m.nome}</h3>
      <p>${m.arquivos || 0} arquivo(s)</p>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.closest('.btnOpcoes')) return;
      window.location.href = `./paginaMateria.html?id=${m.id}&nome=${encodeURIComponent(m.nome)}`;
    });

    cards.appendChild(card);
  });

  document.querySelectorAll('.btnOpcoes').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      abrirDropdown(btn.dataset.id, btn);
    });
  });
}

function abrirDropdown(id, btnRef) {
  dropdownAlvoId = id;

  const rect = btnRef.getBoundingClientRect();
  dropdown.style.top  = `${rect.bottom + 6 + window.scrollY}px`;
  dropdown.style.left = `${rect.left - dropdown.offsetWidth + btnRef.offsetWidth}px`;

  dropdown.classList.add('visivel');

  requestAnimationFrame(() => {
    dropdown.style.left = `${rect.left - dropdown.offsetWidth + btnRef.offsetWidth}px`;
  });
}

document.addEventListener('click', (e) => {
  if (!dropdown.contains(e.target) && !e.target.classList.contains('btnOpcoes')) {
    dropdown.classList.remove('visivel');
    dropdownAlvoId = null;
  }
});

document.getElementById('dropCompartilhar').addEventListener('click', () => {
  dropdown.classList.remove('visivel');
  const m = materias.find(x => x.id == dropdownAlvoId);
  if (!m) return;
  m.compartilhada = !m.compartilhada;
  salvarMaterias();
  mostrarToast(m.compartilhada ? '📤 Pasta compartilhada!' : '🔒 Compartilhamento removido');
  dropdownAlvoId = null;
});

document.getElementById('dropRenomear').addEventListener('click', () => {
  dropdown.classList.remove('visivel');
  const m = materias.find(x => x.id == dropdownAlvoId);
  if (!m) return;
  editandoId = m.id;
  inputNome.value = m.nome;
  tituloModal.textContent = 'Renomear Matéria';
  btnCriar.textContent = 'Salvar';

  corSelecionada = m.cor || '#1466ff';
  document.querySelectorAll('.btnCor').forEach(b => {
    b.classList.toggle('selecionada', b.dataset.cor === corSelecionada);
  });

  overlay.classList.add('aberto');
  inputNome.focus();
});

document.getElementById('dropExcluir').addEventListener('click', () => {
  dropdown.classList.remove('visivel');
  const m = materias.find(x => x.id == dropdownAlvoId);
  if (!m) return;
  if (!confirm(`Excluir a matéria "${m.nome}"? Essa ação não pode ser desfeita.`)) return;
  materias = materias.filter(x => x.id != dropdownAlvoId);
  salvarMaterias();
  renderizarCards();
  mostrarToast('🗑️ Matéria excluída');
  dropdownAlvoId = null;
});

function abrirFormulario() {
  editandoId = null;
  inputNome.value = '';
  tituloModal.textContent = 'Nova Matéria';
  btnCriar.textContent = 'Criar Matéria';

  corSelecionada = '#1466ff';
  document.querySelectorAll('.btnCor').forEach(b => {
    b.classList.toggle('selecionada', b.dataset.cor === corSelecionada);
  });

  overlay.classList.add('aberto');
  inputNome.focus();
}

function fechar() {
  overlay.classList.remove('aberto');
  inputNome.value = '';
  editandoId = null;
}

fecharModal.addEventListener('click', fechar);
btnCancelar.addEventListener('click', fechar);

overlay.addEventListener('click', (e) => {
  if (e.target === overlay) fechar();
});

btnCriar.addEventListener('click', () => {
  const nome = inputNome.value.trim();
  if (!nome) {
    inputNome.focus();
    return;
  }

  if (editandoId !== null) {
    const m = materias.find(x => x.id == editandoId);
    if (m) {
      m.nome = nome;
      m.cor  = corSelecionada;
    }
    mostrarToast('✏️ Matéria renomeada!');
  } else {
    materias.push({
      id: Date.now(),
      nome,
      arquivos: 0,
      compartilhada: false,
      cor: corSelecionada
    });
    mostrarToast('✅ Matéria criada!');
  }

  salvarMaterias();
  renderizarCards();
  fechar();
});

inputNome.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') btnCriar.click();
});

function salvarMaterias() {
  localStorage.setItem('materias', JSON.stringify(materias));
}

function mostrarToast(msg) {
  let toast = document.getElementById('toastGlobal');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toastGlobal';
    toast.className = 'toast';
    document.body.appendChild(toast);

    const style = document.createElement('style');
    style.textContent = `.toast{position:fixed;bottom:24px;right:24px;background:#222;color:#fff;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:600;opacity:0;transform:translateY(10px);transition:all .3s;z-index:500;pointer-events:none;font-family:"Manrope",sans-serif}.toast.show{opacity:1;transform:translateY(0)}`;
    document.head.appendChild(style);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('show'), 2500);
}

renderizarCards();


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