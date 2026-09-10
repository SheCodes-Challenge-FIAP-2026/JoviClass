/* =========================================================
   URL BASE DA API
========================================================= */

const API_BASE =
  `http://${window.location.hostname}:3000`;


/* =========================================================
   MENU HAMBURGUER
========================================================= */

const hamburger = document.getElementById("hamburger");
const menuLinks = document.getElementById("menuLinks");

if (hamburger && menuLinks) {
  hamburger.addEventListener("click", () => {
    menuLinks.classList.toggle("active");
  });
}


/* =========================================================
   OVERLAY DE CONFIRMAÇÃO (genérico)
========================================================= */

const overlay = document.getElementById("overlay");
const cancelBtn = document.getElementById("cancelBtn");
const okBtn = document.getElementById("okBtn");

let acaoConfirmacaoPendente = null;

const toggleOverlay = (show) => {
  if (overlay) overlay.classList.toggle("show", show);
};

document.querySelectorAll("[data-confirm]").forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();

    // Se o botão que abriu a confirmação for o de sair da
    // conta, guardamos a ação de logout pra rodar ao confirmar.
    acaoConfirmacaoPendente =
      el.id === "btnSair" ? sairDaConta : null;

    toggleOverlay(true);
  });
});

if (cancelBtn) {
  cancelBtn.addEventListener("click", () => {
    acaoConfirmacaoPendente = null;
    toggleOverlay(false);
  });
}

if (okBtn) {
  okBtn.addEventListener("click", () => {
    toggleOverlay(false);

    if (acaoConfirmacaoPendente) {
      acaoConfirmacaoPendente();
      acaoConfirmacaoPendente = null;
    }
  });
}


/* =========================================================
   EVENTOS (usados só pelas notificações e resumo semanal)
========================================================= */

const EVENTOS = [
  { id: "prova-calculo",  titulo: "Prova de Cálculo I",      tipo: "prova",    materia: "Cálculo I", data: "2026-08-14T08:00" },
  { id: "reuniao-grupo",  titulo: "Reunião do grupo de estudos", tipo: "reuniao", materia: "Cálculo I", data: "2026-08-13T19:00" },
  { id: "trabalho-eco",   titulo: "Entrega do trabalho de Economia", tipo: "trabalho", materia: "Economia", data: "2026-08-16T23:59" },
  { id: "prova-fisica",   titulo: "Prova de Física II",      tipo: "prova",    materia: "Física II",  data: "2026-08-20T08:00" },
];

const ICONE_TIPO = {
  prova: "📝",
  trabalho: "📁",
  reuniao: "🗓️",
};

const TIPO_LABEL = { prova: "Prova", trabalho: "Trabalho", reuniao: "Reunião" };

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


/* =========================================================
   PREFERÊNCIAS (continuam locais, não fazem parte do login)
========================================================= */

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

  if (!Object.values(toggles).some(Boolean)) return;

  const prefs = carregarPreferencias();

  Object.entries(toggles).forEach(([chave, input]) => {
    if (!input) return;
    if (chave in prefs) input.checked = prefs[chave];

    input.addEventListener("change", () => {
      const atuais = carregarPreferencias();
      atuais[chave] = input.checked;
      salvarPreferencias(atuais);

      if (chave === "prefNotificacoes") {
        const dot = document.getElementById("notifDot");
        if (!input.checked && dot) dot.hidden = true;
        if (input.checked) renderizarPainel();
      }
    });
  });
}


/* =========================================================
   PERFIL — ESTADO ATUAL (vem do backend)
========================================================= */

// Preenchido depois de buscarmos /auth/me. Guardamos aqui
// pra outras funções (edição, senha, resumo semanal) lerem
// sem precisar buscar de novo toda hora.
let perfilAtual = null;


function mapUsuarioParaPerfil(usuario) {
  return {
    id: usuario.id,
    nome: usuario.nome || "",
    curso: usuario.curso || "",
    email: usuario.email || "",
    foto: usuario.foto || "../assets/img/avatar.png",
    possuiSenha: !!usuario.possuiSenha,
  };
}

function aplicarPerfilNaTela(perfil) {
  const nomeEl = document.getElementById("perfilNome");
  const cursoEl = document.getElementById("perfilCurso");
  const emailEl = document.getElementById("perfilEmail");
  const fotoEl = document.getElementById("perfilFotoImg");

  if (nomeEl) nomeEl.textContent = perfil.nome;
  if (cursoEl) cursoEl.textContent = perfil.curso || "Curso não informado";
  if (emailEl) emailEl.textContent = perfil.email;
  if (fotoEl) fotoEl.src = perfil.foto;
}


/* =========================================================
   BUSCAR USUÁRIO LOGADO
========================================================= */

async function carregarUsuarioAtual() {
  try {
    const resposta = await fetch(`${API_BASE}/auth/me`, {
      method: "GET",
      credentials: "include",
    });

    if (!resposta.ok) return null;

    const dados = await resposta.json();
    return dados.autenticado ? dados.usuario : null;

  } catch (erro) {
    console.error("Erro ao verificar autenticação:", erro);
    return null;
  }
}


/* =========================================================
   SAIR DA CONTA
========================================================= */

async function sairDaConta() {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch (erro) {
    console.error("Erro ao sair da conta:", erro);
  } finally {
    window.location.href = "../../index.html";
  }
}


/* =========================================================
   EDITAR PERFIL (nome, curso, e-mail, foto)
========================================================= */

function iniciarEdicaoDePerfil() {
  const modal = document.getElementById("editPerfilOverlay");
  if (!modal) return;

  const btnEditar = document.getElementById("btnEditarPerfil");
  const form = document.getElementById("formEditarPerfil");
  const erro = document.getElementById("erroFormPerfil");

  const campoNome = document.getElementById("campoNome");
  const campoCurso = document.getElementById("campoCurso");
  const campoEmail = document.getElementById("campoEmail");

  const trocarFotoBtn = document.getElementById("trocarFotoBtn");
  const inputFoto = document.getElementById("inputFoto");

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
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      erro.hidden = true;

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

      try {
        const resposta = await fetch(`${API_BASE}/perfil`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ nome, curso, email }),
        });

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
          throw new Error(dados.erro || "Não foi possível salvar as alterações.");
        }

        // Guarda a foto atual (não veio nesse form) e atualiza o resto.
        perfilAtual = mapUsuarioParaPerfil(dados.usuario);
        aplicarPerfilNaTela(perfilAtual);
        fecharModal();

      } catch (erroReq) {
        erro.textContent = erroReq.message;
        erro.hidden = false;
      }
    });
  }

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

      leitor.onload = async () => {
        try {
          const resposta = await fetch(`${API_BASE}/perfil/foto`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ foto: leitor.result }),
          });

          const dados = await resposta.json();

          if (!resposta.ok || !dados.sucesso) {
            throw new Error(dados.erro || "Não foi possível atualizar a foto.");
          }

          perfilAtual = mapUsuarioParaPerfil(dados.usuario);
          aplicarPerfilNaTela(perfilAtual);

        } catch (erroFoto) {
          alert(erroFoto.message);
        }
      };

      leitor.readAsDataURL(arquivo);
    });
  }
}


/* =========================================================
   SENHA E SEGURANÇA
========================================================= */

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

  function abrirModal() {
    form.reset();
    erro.hidden = true;
    sucesso.hidden = true;

    // Contas só-Google não têm senha própria ainda,
    // então não pedimos a "senha atual" nesse caso.
    const jaTemSenha = !!perfilAtual.possuiSenha;
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

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    erro.hidden = true;
    sucesso.hidden = true;

    const senhaAtual = campoAtual.value;
    const senhaNova = campoNova.value;
    const senhaConfirma = campoConfirma.value;

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

    try {
      const resposta = await fetch(`${API_BASE}/perfil/senha`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ senhaAtual, senhaNova }),
      });

      const dados = await resposta.json();

      if (!resposta.ok || !dados.sucesso) {
        throw new Error(dados.erro || "Não foi possível atualizar a senha.");
      }

      perfilAtual.possuiSenha = true;

      sucesso.textContent = "Senha atualizada com sucesso!";
      sucesso.hidden = false;
      form.reset();

      setTimeout(fecharModal, 1200);

    } catch (erroSenha) {
      erro.textContent = erroSenha.message;
      erro.hidden = false;
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
// do input. Usado nos campos do modal "Senha e Segurança"
// (campoSenhaAtual, campoSenhaNova, campoSenhaConfirma).

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
  btn.innerHTML = senhaVisivel ? ICONE_OLHO_ABERTO : ICONE_OLHO_FECHADO;

  btn.classList.toggle("mostrando", senhaVisivel);

  btn.setAttribute(
    "aria-label",
    senhaVisivel ? "Ocultar senha" : "Mostrar senha"
  );
}

function iniciarToggleSenha() {
  document.querySelectorAll(".toggle-senha").forEach((btn) => {
    const alvo = document.getElementById(btn.dataset.target);
    if (!alvo) return;

    // Estado inicial: o campo começa como password (oculto),
    // então o ícone começa fechado.
    atualizarIconeToggleSenha(btn, alvo.type !== "password");

    btn.addEventListener("click", () => {
      const senhaVaiFicarVisivel = alvo.type === "password";
      alvo.type = senhaVaiFicarVisivel ? "text" : "password";

      atualizarIconeToggleSenha(btn, senhaVaiFicarVisivel);
    });
  });
}


/* =========================================================
   INSTITUIÇÃO DE ENSINO (continua local por enquanto)
========================================================= */

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


/* =========================================================
   ACESSOS E RESUMO SEMANAL
========================================================= */

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

window.JoviClassAcessos = {
  registrar(nomeMateria) {
    if (!nomeMateria) return;
    const acessos = carregarAcessos();
    acessos[nomeMateria] = (acessos[nomeMateria] || 0) + 1;
    salvarAcessos(acessos);
  },
  obter: carregarAcessos,
};

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

function limitesDaSemanaAtual() {
  const agora = new Date();
  const diaSemana = agora.getDay();
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

function gerarResumoSemanal() {
  const acessos = carregarAcessos();
  const materiasUnicas = [...new Set([...EVENTOS.map((e) => e.materia), ...Object.keys(acessos)])].sort();
  const eventosSemana = eventosDaSemanaAtual();
  const perfil = perfilAtual;
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


/* =========================================================
   CONEXÕES EXTERNAS (Google Drive / Notion)
========================================================= */

const btnConectarGoogle = document.getElementById("btnConectarGoogle");
const btnConectarNotion = document.getElementById("btnConectarNotion");

if (btnConectarGoogle) {
  btnConectarGoogle.addEventListener("click", () => {
    window.location.href = `${API_BASE}/auth/google`;
  });
}

if (btnConectarNotion) {
  btnConectarNotion.addEventListener("click", () => {
    window.location.href = `${API_BASE}/auth/notion`;
  });
}


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

  const usuario = await carregarUsuarioAtual();

  // Sem sessão válida: manda pra tela de login da página inicial.
  if (!usuario) {
    window.location.href = "../../index.html";
    return;
  }

  perfilAtual = mapUsuarioParaPerfil(usuario);
  aplicarPerfilNaTela(perfilAtual);

  iniciarEdicaoDePerfil();
  iniciarSenhaSeguranca();
  iniciarToggleSenha();

  iniciarPreferenciasDoPerfil();
  iniciarInstituicao();
  iniciarResumoSemanal();
});