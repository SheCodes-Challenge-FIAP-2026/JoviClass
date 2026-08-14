const hamburger = document.getElementById("hamburger");
const menuLinks = document.getElementById("menuLinks");

hamburger.addEventListener("click", () => {
    menuLinks.classList.toggle("active");
});

document.addEventListener('DOMContentLoaded', function () {

    // ===========================
    //   CALENDÁRIO
    // ===========================

    const mesAno = document.getElementById('mes-ano');
    const diasContainer = document.getElementById('dias');
    const voltarButton = document.getElementById('voltar');
    const proxButton = document.getElementById('prox');

    const meses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril',
        'Maio', 'Junho', 'Julho', 'Agosto',
        'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    let dataAtual = new Date();
    let today = new Date();
    let diaSelecionado = null;

    // --- Formulário de Evento ---

    function abrirFormularioEvento(diaDiv) {
        diaSelecionado = diaDiv;
        document.getElementById("formularioEvento").style.display = "flex";
    }

    function fecharFormularioEvento() {
        document.getElementById("formularioEvento").style.display = "none";
    }

    function salvarEvento() {
        let titulo = document.getElementById("tituloEvento").value;
        let descricao = document.getElementById("descricaoEvento").value;

        if (titulo) {
            let eventoDiv = document.createElement('div');
            eventoDiv.classList.add('evento');
            eventoDiv.innerHTML = `
                <strong>${titulo}</strong>
                <p>${descricao}</p>
            `;

            diaSelecionado.appendChild(eventoDiv);

            document.getElementById("tituloEvento").value = "";
            document.getElementById("descricaoEvento").value = "";
            fecharFormularioEvento();
        }
    }

    window.fecharFormularioEvento = fecharFormularioEvento;
    window.salvarEvento = salvarEvento;

    // --- Renderização do Calendário ---

    function calendario(data) {
        const ano = data.getFullYear();
        const mes = data.getMonth();
        const primeiroDia = new Date(ano, mes, 1).getDay();
        const ultimoDia = new Date(ano, mes + 1, 0).getDate();

        mesAno.textContent = `${meses[mes]} ${ano}`;
        diasContainer.innerHTML = '';

        // Datas do mês anterior
        const ultimoDiaMesAnterior = new Date(ano, mes, 0).getDate();
        for (let i = primeiroDia; i > 0; i--) {
            const diaDiv = document.createElement('div');
            diaDiv.textContent = ultimoDiaMesAnterior - i + 1;
            diaDiv.classList.add('fade');
            diasContainer.appendChild(diaDiv);
        }

        // Dias do mês atual
        for (let i = 1; i <= ultimoDia; i++) {
            const diaDiv = document.createElement('div');
            diaDiv.classList.add('dia-card');
            diaDiv.innerHTML = `<span class="numero-dia">${i}</span>`;

            diaDiv.onclick = function () {
                abrirFormularioEvento(diaDiv);
            };

            if (i === today.getDate() && mes === today.getMonth() && ano === today.getFullYear()) {
                diaDiv.classList.add('today');
            }

            diasContainer.appendChild(diaDiv);
        }

        // Datas do próximo mês
        const primeiroDiaProximoMes = 7 - new Date(ano, mes + 1, 0).getDay();
        if (primeiroDiaProximoMes < 7) {
            for (let i = 1; i <= primeiroDiaProximoMes; i++) {
                const diaDiv = document.createElement('div');
                diaDiv.textContent = i;
                diaDiv.classList.add('fade');
                diasContainer.appendChild(diaDiv);
            }
        }
    }

    voltarButton.addEventListener('click', function () {
        dataAtual.setMonth(dataAtual.getMonth() - 1);
        calendario(dataAtual);
    });

    proxButton.addEventListener('click', function () {
        dataAtual.setMonth(dataAtual.getMonth() + 1);
        calendario(dataAtual);
    });

    calendario(dataAtual);


    // ===========================
    //   PRÓXIMAS ENTREGAS
    // ===========================

    let entregas = [];

    const btnAddEntrega = document.getElementById('btnAddEntrega');
    const entregasLista = document.getElementById('entregasLista');
    const entregasVazias = document.getElementById('entregasVazias');

    btnAddEntrega.addEventListener('click', function () {
        document.getElementById('formularioEntrega').style.display = 'flex';
    });

    function fecharFormularioEntrega() {
        document.getElementById('formularioEntrega').style.display = 'none';
        document.getElementById('tituloEntrega').value = '';
        document.getElementById('materiaEntrega').value = '';
        document.getElementById('dataEntrega').value = '';
        document.getElementById('prioridadeEntrega').value = 'media';
    }

    function salvarEntrega() {
        const titulo = document.getElementById('tituloEntrega').value.trim();
        const materia = document.getElementById('materiaEntrega').value.trim();
        const data = document.getElementById('dataEntrega').value;
        const prioridade = document.getElementById('prioridadeEntrega').value;

        if (!titulo) return;

        const entregaId = Date.now();
        const entrega = { id: entregaId, titulo, materia, data, prioridade };
        entregas.push(entrega);

        // Ordena por data (mais próxima primeiro)
        entregas.sort((a, b) => {
            if (!a.data) return 1;
            if (!b.data) return -1;
            return new Date(a.data) - new Date(b.data);
        });

        // Adiciona automaticamente ao checklist (com mesmo id para sincronizar remoção)
        const tarefa = { id: entregaId, texto: titulo, materia, concluida: false, fromEntrega: true };
        tarefas.push(tarefa);

        renderizarEntregas();
        renderizarChecklist();
        fecharFormularioEntrega();
    }

    function removerEntrega(id) {
        entregas = entregas.filter(e => e.id !== id);
        // Remove também a tarefa correspondente no checklist
        tarefas = tarefas.filter(t => t.id !== id);
        renderizarEntregas();
        renderizarChecklist();
    }

    function formatarData(dataStr) {
        if (!dataStr) return '';
        // dataStr vem como YYYY-MM-DD
        const [ano, mes, dia] = dataStr.split('-');
        return `${dia}/${mes}/${ano}`;
    }

    function renderizarEntregas() {
        // Remove itens anteriores (mantém o parágrafo vazio)
        const itens = entregasLista.querySelectorAll('.entrega-item');
        itens.forEach(el => el.remove());

        if (entregas.length === 0) {
            entregasVazias.style.display = 'block';
            return;
        }

        entregasVazias.style.display = 'none';

        entregas.forEach(entrega => {
            const item = document.createElement('div');
            item.classList.add('entrega-item', `prioridade-${entrega.prioridade}`);

            const labelPrioridade = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };

            item.innerHTML = `
                <div class="entrega-info">
                    <span class="entrega-titulo-texto">${entrega.titulo}</span>
                    <span class="entrega-meta">
                        ${entrega.materia ? `<span>📚 ${entrega.materia}</span>` : ''}
                        ${entrega.data ? `<span>📅 ${formatarData(entrega.data)}</span>` : ''}
                    </span>
                </div>
                <span class="tag-prioridade tag-${entrega.prioridade}">${labelPrioridade[entrega.prioridade]}</span>
                <button class="btn-remover-entrega" data-id="${entrega.id}" title="Remover">✕</button>
            `;

            item.querySelector('.btn-remover-entrega').addEventListener('click', function () {
                removerEntrega(entrega.id);
            });

            entregasLista.appendChild(item);
        });
    }

    window.fecharFormularioEntrega = fecharFormularioEntrega;
    window.salvarEntrega = salvarEntrega;


    // ===========================
    //   CHECKLIST DE ENTREGAS
    // ===========================

    let tarefas = [];

    const btnAddTarefa = document.getElementById('btnAddTarefa');
    const checklistLista = document.getElementById('checklistLista');
    const checklistVazio = document.getElementById('checklistVazio');

    btnAddTarefa.addEventListener('click', function () {
        document.getElementById('formularioTarefa').style.display = 'flex';
    });

    function fecharFormularioTarefa() {
        document.getElementById('formularioTarefa').style.display = 'none';
        document.getElementById('textoTarefa').value = '';
        document.getElementById('materiaTarefa').value = '';
    }

    function salvarTarefa() {
        const texto = document.getElementById('textoTarefa').value.trim();
        const materia = document.getElementById('materiaTarefa').value.trim();

        if (!texto) return;

        const tarefa = { id: Date.now(), texto, materia, concluida: false };
        tarefas.push(tarefa);

        renderizarChecklist();
        fecharFormularioTarefa();
    }

    function toggleTarefa(id) {
        const tarefa = tarefas.find(t => t.id === id);
        if (tarefa) {
            tarefa.concluida = !tarefa.concluida;
            renderizarChecklist();
        }
    }

    function removerTarefa(id) {
        tarefas = tarefas.filter(t => t.id !== id);
        renderizarChecklist();
    }

    function atualizarProgresso() {
        const total = tarefas.length;
        const concluidas = tarefas.filter(t => t.concluida).length;
        const porcentagem = total === 0 ? 0 : Math.round((concluidas / total) * 100);

        document.getElementById('tarefasConcluidas').textContent = concluidas;
        document.getElementById('tarefasTotal').textContent = total;
        document.getElementById('barraProgresso').style.width = `${porcentagem}%`;
    }

    function renderizarChecklist() {
        // Remove itens anteriores
        const itens = checklistLista.querySelectorAll('.tarefa-item');
        itens.forEach(el => el.remove());

        if (tarefas.length === 0) {
            checklistVazio.style.display = 'block';
            atualizarProgresso();
            return;
        }

        checklistVazio.style.display = 'none';

        // Pendentes primeiro, concluídas por último
        const ordenadas = [...tarefas].sort((a, b) => a.concluida - b.concluida);

        ordenadas.forEach(tarefa => {
            const li = document.createElement('li');
            li.classList.add('tarefa-item');
            if (tarefa.concluida) li.classList.add('concluida');

            li.innerHTML = `
                <input 
                    type="checkbox" 
                    class="tarefa-checkbox" 
                    ${tarefa.concluida ? 'checked' : ''}
                    data-id="${tarefa.id}"
                >
                <div class="tarefa-info">
                    <span class="tarefa-texto">${tarefa.texto}</span>
                    ${tarefa.materia ? `<span class="tarefa-materia">${tarefa.materia}</span>` : ''}
                </div>
                <button class="btn-remover-tarefa" data-id="${tarefa.id}" title="Remover">✕</button>
            `;

            li.querySelector('.tarefa-checkbox').addEventListener('change', function () {
                toggleTarefa(tarefa.id);
            });

            li.querySelector('.btn-remover-tarefa').addEventListener('click', function () {
                removerTarefa(tarefa.id);
            });

            checklistLista.appendChild(li);
        });

        atualizarProgresso();
    }

    window.fecharFormularioTarefa = fecharFormularioTarefa;
    window.salvarTarefa = salvarTarefa;

});


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