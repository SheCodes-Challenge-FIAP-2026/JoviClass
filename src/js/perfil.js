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
 * Datas ajustadas para caírem próximas de "hoje" e servirem de demonstração
 * para as notificações e para o resumo semanal por e-mail.
 */
const EVENTOS = [
  { id: "prova-calculo",  titulo: "Prova de Cálculo I",      tipo: "prova",    materia: "Cálculo I", data: "2026-08-14T08:00" },
  { id: "reuniao-grupo",  titulo: "Reunião do grupo de estudos", tipo: "reuniao", materia: "Cálculo I", data: "2026-08-13T19:00" },
  { id: "trabalho-eco",   titulo: "Entrega do trabalho de Economia", tipo: "trabalho", materia: "Economia", data: "2026-08-16T23:59" },
  { id: "prova-fisica",   titulo: "Prova de Física II",      tipo: "prova",    materia: "Física II",  data: "2026-08-20T08:00" },
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
    lista.innerHTML = `<div class="notif-vazio">Nenhuma prova, trabalho ou reunião chegando perto 🎉</div>`;
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

// =====================================================
// PREFERÊNCIAS DA PÁGINA DE PERFIL (toggles)
// =====================================================
const CHAVE_PREFERENCIAS = "joviclass_preferencias";

function carregarPreferencias() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_PREFERENCIAS)) || {};
  } catch {
    return {};
  }
}

function salvarPreferencias(prefs) {
  localStorage.setItem(CHAVE_PREFERENCIAS, JSON.stringify(prefs));
}

function iniciarPreferenciasDoPerfil() {
  const toggles = {
    prefNotificacoes: document.getElementById("prefNotificacoes"),
    prefResumoEmail: document.getElementById("prefResumoEmail"),
  };

  // se nenhum toggle existe nessa página, não faz nada
  if (!Object.values(toggles).some(Boolean)) return;

  const prefs = carregarPreferencias();

  Object.entries(toggles).forEach(([chave, input]) => {
    if (!input) return;
    if (chave in prefs) input.checked = prefs[chave];

    input.addEventListener("change", () => {
      const atuais = carregarPreferencias();
      atuais[chave] = input.checked;
      salvarPreferencias(atuais);

      // liga/desliga as notificações de prazos em tempo real
      if (chave === "prefNotificacoes") {
        const dot = document.getElementById("notifDot");
        if (!input.checked && dot) dot.hidden = true;
        if (input.checked) renderizarPainel();
      }
    });
  });
}

iniciarPreferenciasDoPerfil();

// =====================================================
// EDIÇÃO DE PERFIL (nome, curso, e-mail e foto)
// =====================================================
const CHAVE_PERFIL = "joviclass_perfil";

const PERFIL_PADRAO = {
  nome: "Helena Martins",
  curso: "Engenharia de Produção · 4º período",
  email: "helena.martins@email.com",
  foto: "../assets/img/avatar.png",
};

function carregarPerfil() {
  try {
    return { ...PERFIL_PADRAO, ...(JSON.parse(localStorage.getItem(CHAVE_PERFIL)) || {}) };
  } catch {
    return { ...PERFIL_PADRAO };
  }
}

function salvarPerfil(perfil) {
  localStorage.setItem(CHAVE_PERFIL, JSON.stringify(perfil));
}

function aplicarPerfilNaTela(perfil) {
  const nomeEl = document.getElementById("perfilNome");
  const cursoEl = document.getElementById("perfilCurso");
  const emailEl = document.getElementById("perfilEmail");
  const fotoEl = document.getElementById("perfilFotoImg");

  if (nomeEl) nomeEl.textContent = perfil.nome;
  if (cursoEl) cursoEl.textContent = perfil.curso;
  if (emailEl) emailEl.textContent = perfil.email;
  if (fotoEl) fotoEl.src = perfil.foto;
}

function iniciarEdicaoDePerfil() {
  const modal = document.getElementById("editPerfilOverlay");
  if (!modal) return; // só existe na página de perfil

  const btnEditar = document.getElementById("btnEditarPerfil");
  const form = document.getElementById("formEditarPerfil");
  const erro = document.getElementById("erroFormPerfil");

  const campoNome = document.getElementById("campoNome");
  const campoCurso = document.getElementById("campoCurso");
  const campoEmail = document.getElementById("campoEmail");

  const trocarFotoBtn = document.getElementById("trocarFotoBtn");
  const inputFoto = document.getElementById("inputFoto");

  let perfilAtual = carregarPerfil();
  aplicarPerfilNaTela(perfilAtual);

  function abrirModal() {
    campoNome.value = perfilAtual.nome;
    campoCurso.value = perfilAtual.curso;
    campoEmail.value = perfilAtual.email;
    erro.hidden = true;
    modal.classList.add("show");
    campoNome.focus();
  }

  function fecharModal() {
    modal.classList.remove("show");
  }

  if (btnEditar) btnEditar.addEventListener("click", abrirModal);

  const btnCancelarPerfil = document.getElementById("cancelarEdicaoPerfil");
  if (btnCancelarPerfil) btnCancelarPerfil.addEventListener("click", fecharModal);

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const nome = campoNome.value.trim();
      const curso = campoCurso.value.trim();
      const email = campoEmail.value.trim();
      const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

      if (!nome || !emailValido) {
        erro.textContent = !nome
          ? "Informe seu nome completo."
          : "Informe um e-mail válido.";
        erro.hidden = false;
        return;
      }

      perfilAtual = { ...perfilAtual, nome, curso, email };
      salvarPerfil(perfilAtual);
      aplicarPerfilNaTela(perfilAtual);
      fecharModal();
    });
  }

  // troca de foto real (lê o arquivo escolhido e salva como base64)
  if (trocarFotoBtn && inputFoto) {
    trocarFotoBtn.addEventListener("click", () => inputFoto.click());

    inputFoto.addEventListener("change", () => {
      const arquivo = inputFoto.files && inputFoto.files[0];
      if (!arquivo) return;

      if (!arquivo.type.startsWith("image/")) {
        alert("Escolha um arquivo de imagem.");
        return;
      }

      const leitor = new FileReader();
      leitor.onload = () => {
        perfilAtual = { ...perfilAtual, foto: leitor.result };
        salvarPerfil(perfilAtual);
        aplicarPerfilNaTela(perfilAtual);
      };
      leitor.readAsDataURL(arquivo);
    });
  }
}

iniciarEdicaoDePerfil();

// =====================================================
// SENHA E SEGURANÇA
// =====================================================
const CHAVE_SENHA = "joviclass_senha_hash";

// Hash simples só para não guardar a senha em texto puro no localStorage.
// Isso é um app front-end de demonstração: numa aplicação real, a troca de
// senha precisa ser validada e persistida no servidor (com hash + salt,
// ex. bcrypt/argon2), nunca só no navegador do usuário.
function hashSimples(texto) {
  let hash = 0;
  for (let i = 0; i < texto.length; i++) {
    hash = (hash << 5) - hash + texto.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

function iniciarSenhaSeguranca() {
  const modal = document.getElementById("modalSenha");
  const btnAbrir = document.getElementById("btnSenha");
  if (!modal || !btnAbrir) return;

  const form = document.getElementById("formSenha");
  const btnCancelar = document.getElementById("cancelarSenha");
  const erro = document.getElementById("erroFormSenha");
  const sucesso = document.getElementById("sucessoFormSenha");

  const campoAtual = document.getElementById("campoSenhaAtual");
  const campoNova = document.getElementById("campoSenhaNova");
  const campoConfirma = document.getElementById("campoSenhaConfirma");
  const blocoSenhaAtual = document.getElementById("blocoSenhaAtual");

  function temSenhaCadastrada() {
    return !!localStorage.getItem(CHAVE_SENHA);
  }

  function abrirModal() {
    form.reset();
    erro.hidden = true;
    sucesso.hidden = true;

    const jaTemSenha = temSenhaCadastrada();
    blocoSenhaAtual.hidden = !jaTemSenha;
    campoAtual.required = jaTemSenha;

    modal.classList.add("show");
    (jaTemSenha ? campoAtual : campoNova).focus();
  }

  function fecharModal() {
    modal.classList.remove("show");
  }

  btnAbrir.addEventListener("click", (e) => {
    e.preventDefault();
    abrirModal();
  });

  if (btnCancelar) btnCancelar.addEventListener("click", fecharModal);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    erro.hidden = true;
    sucesso.hidden = true;

    const senhaAtual = campoAtual.value;
    const senhaNova = campoNova.value;
    const senhaConfirma = campoConfirma.value;

    if (temSenhaCadastrada()) {
      const hashSalvo = localStorage.getItem(CHAVE_SENHA);
      if (hashSimples(senhaAtual) !== hashSalvo) {
        erro.textContent = "Senha atual incorreta.";
        erro.hidden = false;
        return;
      }
    }

    if (senhaNova.length < 6) {
      erro.textContent = "A nova senha deve ter pelo menos 6 caracteres.";
      erro.hidden = false;
      return;
    }

    if (senhaNova !== senhaConfirma) {
      erro.textContent = "A confirmação não corresponde à nova senha.";
      erro.hidden = false;
      return;
    }

    localStorage.setItem(CHAVE_SENHA, hashSimples(senhaNova));

    sucesso.textContent = "Senha atualizada com sucesso!";
    sucesso.hidden = false;
    form.reset();

    setTimeout(fecharModal, 1200);
  });
}

iniciarSenhaSeguranca();

// =====================================================
// INSTITUIÇÃO DE ENSINO
// =====================================================
const CHAVE_INSTITUICAO = "joviclass_instituicao";

function carregarInstituicao() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_INSTITUICAO)) || null;
  } catch {
    return null;
  }
}

function salvarInstituicao(dados) {
  localStorage.setItem(CHAVE_INSTITUICAO, JSON.stringify(dados));
}

function atualizarDetalheInstituicao() {
  const detalhe = document.getElementById("detalheInstituicao");
  if (!detalhe) return;

  const inst = carregarInstituicao();
  detalhe.textContent = inst
    ? `Vinculada: ${inst.nome}${inst.cidade ? " · " + inst.cidade : ""}`
    : "Vincular ou trocar instituição";
}

function iniciarInstituicao() {
  const modal = document.getElementById("modalInstituicao");
  const btnAbrir = document.getElementById("btnInstituicao");
  if (!modal || !btnAbrir) return;

  const form = document.getElementById("formInstituicao");
  const btnCancelar = document.getElementById("cancelarInstituicao");
  const btnDesvincular = document.getElementById("desvincularInstituicao");
  const erro = document.getElementById("erroFormInstituicao");

  const campoNome = document.getElementById("campoInstituicaoNome");
  const campoCidade = document.getElementById("campoInstituicaoCidade");

  atualizarDetalheInstituicao();

  function abrirModal() {
    const atual = carregarInstituicao();
    campoNome.value = atual ? atual.nome : "";
    campoCidade.value = atual ? atual.cidade || "" : "";
    erro.hidden = true;
    modal.classList.add("show");
    campoNome.focus();
  }

  function fecharModal() {
    modal.classList.remove("show");
  }

  btnAbrir.addEventListener("click", (e) => {
    e.preventDefault();
    abrirModal();
  });

  if (btnCancelar) btnCancelar.addEventListener("click", fecharModal);

  if (btnDesvincular) {
    btnDesvincular.addEventListener("click", () => {
      localStorage.removeItem(CHAVE_INSTITUICAO);
      atualizarDetalheInstituicao();
      fecharModal();
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    erro.hidden = true;

    const nome = campoNome.value.trim();
    const cidade = campoCidade.value.trim();

    if (!nome) {
      erro.textContent = "Informe o nome da instituição.";
      erro.hidden = false;
      return;
    }

    salvarInstituicao({ nome, cidade });
    atualizarDetalheInstituicao();
    fecharModal();
  });
}

iniciarInstituicao();

// =====================================================
// RESUMO SEMANAL POR E-MAIL
// Conta acessos por matéria + lista provas/trabalhos/reuniões da semana
// =====================================================
const CHAVE_ACESSOS = "joviclass_acessos_materias";
const CHAVE_ULTIMO_ENVIO_RESUMO = "joviclass_ultimo_envio_resumo";

function carregarAcessos() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_ACESSOS)) || {};
  } catch {
    return {};
  }
}

function salvarAcessos(acessos) {
  localStorage.setItem(CHAVE_ACESSOS, JSON.stringify(acessos));
}

/**
 * API pública para registrar o acesso a uma matéria.
 * Chame isso na página de matérias/aulas sempre que o usuário abrir uma
 * matéria específica, por exemplo:
 *
 *   window.JoviClassAcessos.registrar("Cálculo I");
 *
 * Sem essa chamada em materias.html (ou onde as aulas são abertas), os
 * acessos ficam zerados no resumo — os números do resumo semanal são reais,
 * refletindo só o que for de fato registrado.
 */
window.JoviClassAcessos = {
  registrar(nomeMateria) {
    if (!nomeMateria) return;
    const acessos = carregarAcessos();
    acessos[nomeMateria] = (acessos[nomeMateria] || 0) + 1;
    salvarAcessos(acessos);
  },
  obter: carregarAcessos,
};

// Seed inicial de demonstração (só roda se não houver nenhum acesso salvo ainda,
// para o preview do resumo não ficar vazio na primeira vez que a página é aberta).
function seedAcessosDemoSeNecessario() {
  const acessos = carregarAcessos();
  if (Object.keys(acessos).length > 0) return;

  const materias = [...new Set(EVENTOS.map((e) => e.materia))];
  const valoresDemo = [7, 4, 2, 1];
  const demo = {};
  materias.forEach((materia, i) => {
    demo[materia] = valoresDemo[i] ?? 1;
  });

  salvarAcessos(demo);
}

// Início (segunda) e fim (domingo) da semana atual
function limitesDaSemanaAtual() {
  const agora = new Date();
  const diaSemana = agora.getDay(); // 0 = domingo
  const offsetSegunda = diaSemana === 0 ? -6 : 1 - diaSemana;

  const inicio = new Date(agora);
  inicio.setHours(0, 0, 0, 0);
  inicio.setDate(agora.getDate() + offsetSegunda);

  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 6);
  fim.setHours(23, 59, 59, 999);

  return { inicio, fim };
}

function eventosDaSemanaAtual() {
  const { inicio, fim } = limitesDaSemanaAtual();
  return EVENTOS
    .map((ev) => ({ ...ev, dataObj: new Date(ev.data) }))
    .filter((ev) => ev.dataObj >= inicio && ev.dataObj <= fim)
    .sort((a, b) => a.dataObj - b.dataObj);
}

function formatarDataCurta(data) {
  const dataTexto = data.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
  const horaTexto = data.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dataTexto} às ${horaTexto}`;
}

// Monta o conteúdo (assunto + corpo) do resumo semanal com dados reais do app
function gerarResumoSemanal() {
  const acessos = carregarAcessos();
  const materiasUnicas = [...new Set([...EVENTOS.map((e) => e.materia), ...Object.keys(acessos)])].sort();
  const eventosSemana = eventosDaSemanaAtual();
  const perfil = carregarPerfil();
  const { inicio, fim } = limitesDaSemanaAtual();

  const linhasAcesso = materiasUnicas.map((materia) => {
    const qtd = acessos[materia] || 0;
    return `• ${materia}: ${qtd} acesso${qtd === 1 ? "" : "s"}`;
  });

  const linhasEventos = eventosSemana.length
    ? eventosSemana.map(
        (ev) => `• [${TIPO_LABEL[ev.tipo] || "Evento"}] ${ev.titulo} — ${formatarDataCurta(ev.dataObj)}`
      )
    : ["Nenhuma prova, trabalho ou reunião marcada para esta semana. 🎉"];

  const periodo = `${inicio.toLocaleDateString("pt-BR")} a ${fim.toLocaleDateString("pt-BR")}`;
  const primeiroNome = (perfil.nome || "").split(" ")[0] || "estudante";

  const assunto = `JoviClass · Seu resumo semanal (${periodo})`;

  const corpoTexto =
`Olá, ${primeiroNome}!

Aqui está o seu resumo da semana de ${periodo}:

ACESSOS POR MATÉRIA
${linhasAcesso.join("\n")}

PROVAS, TRABALHOS E REUNIÕES DESTA SEMANA
${linhasEventos.join("\n")}

Bons estudos!
Equipe JoviClass`;

  return { assunto, corpoTexto, perfil };
}

function iniciarResumoSemanal() {
  const btnPrevia = document.getElementById("btnPreviaResumo");
  const modal = document.getElementById("modalResumoPreview");
  if (!btnPrevia || !modal) return;

  seedAcessosDemoSeNecessario();

  const assuntoEl = document.getElementById("resumoPreviaAssunto");
  const corpoEl = document.getElementById("resumoPreviaCorpo");
  const btnFechar = document.getElementById("fecharResumoPrevia");
  const btnEnviar = document.getElementById("enviarResumoEmail");

  btnPrevia.addEventListener("click", (e) => {
    e.preventDefault();
    const { assunto, corpoTexto, perfil } = gerarResumoSemanal();

    assuntoEl.textContent = assunto;
    corpoEl.textContent = corpoTexto;

    // "Enviar" abre o cliente de e-mail do usuário (Gmail/Outlook/app padrão)
    // já com o assunto e o corpo preenchidos, endereçado ao e-mail do perfil.
    // Isso realmente dispara um e-mail de verdade — sem precisar de um
    // servidor de e-mail próprio. Para envio 100% automático (sem o
    // usuário clicar em nada, ex. toda segunda de manhã), é necessário um
    // backend com um serviço de SMTP/API de e-mail (ex. um cron job que
    // chame o Resend, SendGrid ou similar).
    if (btnEnviar) {
      btnEnviar.href =
        `mailto:${encodeURIComponent(perfil.email)}` +
        `?subject=${encodeURIComponent(assunto)}` +
        `&body=${encodeURIComponent(corpoTexto)}`;
    }

    modal.classList.add("show");
  });

  if (btnFechar) {
    btnFechar.addEventListener("click", () => modal.classList.remove("show"));
  }

  if (btnEnviar) {
    btnEnviar.addEventListener("click", () => {
      localStorage.setItem(CHAVE_ULTIMO_ENVIO_RESUMO, new Date().toISOString());
    });
  }
}

iniciarResumoSemanal();