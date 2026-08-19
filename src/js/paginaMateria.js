// ===========================
//  paginaMateria.js
// ===========================

// ── Parâmetros de URL ──────────────────────────────────────
const params      = new URLSearchParams(window.location.search);
const materiaId   = params.get('id');
const materiaNome = params.get('nome') || 'Matéria';

document.getElementById('tituloPagina').textContent = materiaNome;

// ── Elementos ──────────────────────────────────────────────
const listaArquivos       = document.getElementById('listaArquivos');
const semArquivos         = document.getElementById('semArquivos');
const inputArquivo        = document.getElementById('inputArquivo');
const btnAddArquivo       = document.getElementById('btnAddArquivo');
const btnCriarAnotacao    = document.getElementById('btnCriarAnotacao');
const areaAnotacao        = document.getElementById('areaAnotacao');
const btnFecharAnotacao   = document.getElementById('btnFecharAnotacao');
const btnCancelarAnotacao = document.getElementById('btnCancelarAnotacao');
const btnSalvarAnotacao   = document.getElementById('btnSalvarAnotacao');
const tituloAnotacao      = document.getElementById('tituloAnotacao');
const textoAnotacao       = document.getElementById('textoAnotacao');
const dropdownArquivo     = document.getElementById('dropdownArquivo');
const hamburger           = document.getElementById('hamburger');
const menuLinks           = document.getElementById('menuLinks');

// ── Viewer ─────────────────────────────────────────────────
const viewerOverlay    = document.getElementById('viewerOverlay');
const viewerTitulo     = document.getElementById('viewerTitulo');
const viewerCorpo      = document.getElementById('viewerCorpo');
const btnFecharViewer  = document.getElementById('btnFecharViewer');
const btnEditarViewer  = document.getElementById('btnEditarViewer');

// ── Narração / Player ────────────────────────────────────────
const btnConteudoNarrado   = document.getElementById('btnConteudoNarrado');
const playerNarracao       = document.getElementById('playerNarracao');
const playerTitulo         = document.getElementById('playerTitulo');
const playerStatus         = document.getElementById('playerStatus');
const playerBarraWrapper   = document.getElementById('playerBarraWrapper');
const playerBarraProgresso = document.getElementById('playerBarraProgresso');
const playerParteEl        = document.getElementById('playerParte');
const playerPlayPauseBtn   = document.getElementById('playerPlayPause');
const playerVoltarBtn      = document.getElementById('playerVoltar');
const playerAvancarBtn     = document.getElementById('playerAvancar');
const playerFecharBtn      = document.getElementById('playerFechar');

// ── Hamburger ──────────────────────────────────────────────
hamburger.addEventListener('click', () => menuLinks.classList.toggle('active'));

// ── IndexedDB ──────────────────────────────────────────────
const DB_NAME    = 'JoviClassDB';
const DB_VERSION = 1;
const STORE_NAME = 'arquivos';
let db = null;

function abrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const d = e.target.result;

      if (!d.objectStoreNames.contains(STORE_NAME)) {
        d.createObjectStore(STORE_NAME, { keyPath: 'chaveId' });
      }
    };

    req.onsuccess = (e) => {
      db = e.target.result;
      resolve(db);
    };

    req.onerror = () => reject(req.error);
  });
}

function dbPut(obj) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');

    tx.objectStore(STORE_NAME).put(obj).onsuccess = resolve;

    tx.onerror = () => reject(tx.error);
  });
}

function dbGet(chaveId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(chaveId);

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbDelete(chaveId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');

    tx.objectStore(STORE_NAME).delete(chaveId).onsuccess = resolve;

    tx.onerror = () => reject(tx.error);
  });
}

// ── Estado (metadados em localStorage) ────────────────────
const chave = `arquivos_${materiaId}`;

let itens = JSON.parse(localStorage.getItem(chave) || '[]');
let dropdownAlvoIndex = null;
let viewerEditandoIndex = null;

// ==========================================================
// 🔊 PLAYER DE NARRAÇÃO
// ==========================================================

const ICONE_PLAY = `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
const ICONE_PAUSE = `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>`;

// Estado central do player (única fonte de verdade)
const estadoPlayer = {
  ativo: false,
  gerando: false,
  pausado: false,
  concluido: false,
  partes: [],
  indiceParte: 0,
  titulo: '',
  origemId: null
};

// Usado para cancelar uma extração de texto em andamento
let cancelarPreparoAtual = false;

function setStatus(texto) {
  playerStatus.textContent = texto;
}

function setBarraIndeterminada(ativa) {
  playerBarraProgresso.classList.toggle('indeterminada', ativa);

  if (ativa) {
    playerBarraProgresso.style.width = '100%';
  }
}

function setControlesHabilitados(habilitado) {
  playerPlayPauseBtn.disabled = !habilitado;
  playerVoltarBtn.disabled = !habilitado;
  playerAvancarBtn.disabled = !habilitado;
}

function abrirPlayer(titulo) {
  playerTitulo.textContent = titulo;
  playerNarracao.classList.add('ativo');
  playerNarracao.setAttribute('aria-hidden', 'false');
}

function fecharPlayer() {

  if (estadoPlayer.gerando) {
    cancelarPreparoAtual = true;
  }

  window.speechSynthesis.cancel();

  estadoPlayer.ativo = false;
  estadoPlayer.gerando = false;
  estadoPlayer.pausado = false;
  estadoPlayer.concluido = false;
  estadoPlayer.partes = [];
  estadoPlayer.indiceParte = 0;
  estadoPlayer.origemId = null;

  playerNarracao.classList.remove('ativo');
  playerNarracao.setAttribute('aria-hidden', 'true');
  playerBarraProgresso.style.width = '0%';
  playerBarraProgresso.classList.remove('indeterminada');
  playerParteEl.textContent = '';

  atualizarEstadoBotaoFolder();
}

function atualizarEstadoBotaoFolder() {

  const ativoNaPasta =
    estadoPlayer.ativo &&
    estadoPlayer.origemId === 'pasta';

  const tocandoPasta =
    ativoNaPasta &&
    !estadoPlayer.pausado &&
    !estadoPlayer.gerando &&
    !estadoPlayer.concluido;

  btnConteudoNarrado.classList.toggle(
    'narrando',
    ativoNaPasta
  );

  if (tocandoPasta) {

    btnConteudoNarrado.innerHTML =
      `<span class="btnConteudoIcone">⏸</span><span>Pausar narração</span>`;

  } else if (ativoNaPasta) {

    btnConteudoNarrado.innerHTML =
      `<span class="btnConteudoIcone">▶</span><span>Retomar narração</span>`;

  } else {

    btnConteudoNarrado.innerHTML =
      `<span class="btnConteudoIcone">▶</span><span>Conteúdo narrado</span>`;
  }
}

function atualizarBarraProgresso(
  fracaoParteAtual = 0
) {

  const total =
    estadoPlayer.partes.length || 1;

  const progresso =
    ((estadoPlayer.indiceParte + fracaoParteAtual) / total) * 100;

  playerBarraProgresso.style.width =
    `${Math.min(progresso, 100)}%`;
}

function atualizarUIParte() {

  playerParteEl.textContent =
    `${estadoPlayer.indiceParte + 1}/${estadoPlayer.partes.length}`;

  atualizarBarraProgresso(0);
}

function renderizarIconePlayPause() {

  const mostrarPause =
    estadoPlayer.ativo &&
    !estadoPlayer.pausado &&
    !estadoPlayer.gerando &&
    !estadoPlayer.concluido;

  playerPlayPauseBtn.innerHTML =
    mostrarPause
      ? ICONE_PAUSE
      : ICONE_PLAY;
}

function textoDeStatusTocando() {

  return estadoPlayer.origemId === 'pasta'
    ? '▶ Narrando conteúdo da matéria...'
    : `▶ Narrando "${estadoPlayer.titulo}"...`;
}

// ── Vozes ─────────────────────────────────────────────────
let vozesCacheadas = null;

function obterVozes() {

  if (
    vozesCacheadas &&
    vozesCacheadas.length
  ) {
    return Promise.resolve(
      vozesCacheadas
    );
  }

  return new Promise((resolve) => {

    let vozes =
      window.speechSynthesis.getVoices();

    if (vozes.length > 0) {

      vozesCacheadas = vozes;
      resolve(vozes);

      return;
    }

    const verificarVozes = () => {

      vozes =
        window.speechSynthesis.getVoices();

      if (vozes.length > 0) {

        window.speechSynthesis
          .removeEventListener(
            'voiceschanged',
            verificarVozes
          );

        vozesCacheadas = vozes;

        resolve(vozes);
      }
    };

    window.speechSynthesis
      .addEventListener(
        'voiceschanged',
        verificarVozes
      );

    setTimeout(() => {

      vozes =
        window.speechSynthesis.getVoices();

      window.speechSynthesis
        .removeEventListener(
          'voiceschanged',
          verificarVozes
        );

      vozesCacheadas = vozes;

      resolve(vozes);

    }, 1000);
  });
}

function escolherVoz(vozes) {

  let voz =
    vozes.find(
      v =>
        v.lang === 'pt-BR' &&
        v.name
          .toLowerCase()
          .includes(
            'google português do brasil'
          )
    );

  if (!voz) {

    voz =
      vozes.find(
        v =>
          v.lang === 'pt-BR' &&
          v.name
            .toLowerCase()
            .includes('google')
      );
  }

  if (!voz) {

    voz =
      vozes.find(
        v => v.lang === 'pt-BR'
      );
  }

  return voz || null;
}

// ── Fala da parte atual ─────────────────────────────────────
async function falarParteAtual() {

  if (!estadoPlayer.partes.length) {
    return;
  }

  const texto =
    estadoPlayer.partes[
      estadoPlayer.indiceParte
    ];

  const vozes =
    await obterVozes();

  const voz =
    escolherVoz(vozes);

  if (!voz) {

    mostrarToast(
      '⚠️ Nenhuma voz em português foi encontrada neste navegador.'
    );

    fecharPlayer();

    return;
  }

  const fala =
    new SpeechSynthesisUtterance(
      texto
    );

  fala.voice = voz;
  fala.lang = 'pt-BR';
  fala.rate = 0.95;
  fala.pitch = 1;
  fala.volume = 1;

  fala.onboundary =
    (evento) => {

      if (!texto.length) {
        return;
      }

      const fracao =
        Math.min(
          evento.charIndex / texto.length,
          1
        );

      atualizarBarraProgresso(
        fracao
      );
    };

  fala.onstart =
    () => {

      estadoPlayer.pausado = false;
      estadoPlayer.concluido = false;

      renderizarIconePlayPause();
      atualizarEstadoBotaoFolder();

      setStatus(
        textoDeStatusTocando()
      );
    };

  fala.onend =
    () => {
      avancarAutomaticamente();
    };

  fala.onerror =
    (erro) => {

      if (
        erro.error === 'interrupted' ||
        erro.error === 'canceled'
      ) {
        return;
      }

      console.error(
        'Erro na narração:',
        erro
      );
    };

  window.speechSynthesis.cancel();
  window.speechSynthesis.resume();

  setTimeout(
    () =>
      window.speechSynthesis.speak(
        fala
      ),
    60
  );
}

function avancarAutomaticamente() {

  if (
    estadoPlayer.indiceParte <
    estadoPlayer.partes.length - 1
  ) {

    estadoPlayer.indiceParte++;

    atualizarUIParte();

    falarParteAtual();

  } else {

    finalizarNarracao();
  }
}

function finalizarNarracao() {

  estadoPlayer.concluido = true;
  estadoPlayer.pausado = true;

  renderizarIconePlayPause();
  atualizarEstadoBotaoFolder();

  setStatus(
    '✅ Narração concluída'
  );

  playerBarraProgresso.style.width =
    '100%';

  mostrarToast(
    '▶ Narração concluída!'
  );
}

function iniciarNarracaoDePartes(
  partes,
  titulo,
  origemId
) {

  estadoPlayer.partes = partes;
  estadoPlayer.indiceParte = 0;
  estadoPlayer.titulo = titulo;
  estadoPlayer.origemId = origemId;

  estadoPlayer.ativo = true;
  estadoPlayer.gerando = false;
  estadoPlayer.pausado = false;
  estadoPlayer.concluido = false;

  playerBarraProgresso
    .classList
    .remove('indeterminada');

  setControlesHabilitados(
    true
  );

  atualizarUIParte();
  atualizarEstadoBotaoFolder();

  falarParteAtual();
}

async function narrarConteudo({
  titulo,
  origemId,
  obterPartes
}) {

  if (
    !(
      'speechSynthesis' in window
    )
  ) {

    mostrarToast(
      '⚠️ Seu navegador não suporta narração de texto.'
    );

    return;
  }

  window.speechSynthesis.cancel();

  cancelarPreparoAtual = false;

  estadoPlayer.ativo = true;
  estadoPlayer.gerando = true;
  estadoPlayer.pausado = false;
  estadoPlayer.concluido = false;
  estadoPlayer.origemId = origemId;
  estadoPlayer.titulo = titulo;

  abrirPlayer(titulo);

  setStatus(
    '🔎 Preparando conteúdo...'
  );

  setBarraIndeterminada(true);

  setControlesHabilitados(false);

  atualizarEstadoBotaoFolder();

  playerParteEl.textContent = '';

  try {

    const partes =
      await obterPartes();

    if (
      !partes ||
      !partes.length
    ) {

      mostrarToast(
        '⚠️ Não encontramos texto para narrar.'
      );

      fecharPlayer();

      return;
    }

    iniciarNarracaoDePartes(
      partes,
      titulo,
      origemId
    );

  } catch (erro) {

    if (
      erro.message ===
      'NARRACAO_CANCELADA'
    ) {
      return;
    }

    console.error(
      'Erro ao preparar narração:',
      erro
    );

    mostrarToast(
      '⚠️ Não foi possível preparar a narração.'
    );

    fecharPlayer();
  }
}

// ── Controles do player ─────────────────────────────────────
playerPlayPauseBtn.addEventListener(
  'click',
  () => {

    if (
      estadoPlayer.gerando ||
      !estadoPlayer.ativo
    ) {
      return;
    }

    if (
      estadoPlayer.concluido
    ) {

      estadoPlayer.indiceParte = 0;
      estadoPlayer.concluido = false;

      atualizarUIParte();

      falarParteAtual();

      return;
    }

    if (
      estadoPlayer.pausado
    ) {

      window.speechSynthesis.resume();
      estadoPlayer.pausado = false;

    } else {

      window.speechSynthesis.pause();
      estadoPlayer.pausado = true;
    }

    renderizarIconePlayPause();

    atualizarEstadoBotaoFolder();

    setStatus(
      estadoPlayer.pausado
        ? '⏸️ Narração pausada'
        : textoDeStatusTocando()
    );
  }
);

playerVoltarBtn.addEventListener(
  'click',
  () => {

    if (
      estadoPlayer.gerando ||
      !estadoPlayer.ativo
    ) {
      return;
    }

    window.speechSynthesis.cancel();

    estadoPlayer.indiceParte =
      Math.max(
        0,
        estadoPlayer.indiceParte - 1
      );

    estadoPlayer.concluido = false;

    atualizarUIParte();

    falarParteAtual();
  }
);

playerAvancarBtn.addEventListener(
  'click',
  () => {

    if (
      estadoPlayer.gerando ||
      !estadoPlayer.ativo
    ) {
      return;
    }

    window.speechSynthesis.cancel();

    if (
      estadoPlayer.indiceParte <
      estadoPlayer.partes.length - 1
    ) {

      estadoPlayer.indiceParte++;

      estadoPlayer.concluido = false;

      atualizarUIParte();

      falarParteAtual();

    } else {

      finalizarNarracao();
    }
  }
);

playerFecharBtn.addEventListener(
  'click',
  fecharPlayer
);

// Clicar/arrastar na barra
playerBarraWrapper.addEventListener(
  'click',
  (e) => {

    if (
      estadoPlayer.gerando ||
      !estadoPlayer.ativo ||
      !estadoPlayer.partes.length
    ) {
      return;
    }

    const rect =
      playerBarraWrapper
        .getBoundingClientRect();

    const fracao =
      Math.min(
        Math.max(
          (
            e.clientX -
            rect.left
          ) /
          rect.width,
          0
        ),
        1
      );

    const novoIndice =
      Math.min(
        Math.floor(
          fracao *
          estadoPlayer.partes.length
        ),
        estadoPlayer.partes.length - 1
      );

    window.speechSynthesis.cancel();

    estadoPlayer.indiceParte =
      novoIndice;

    estadoPlayer.concluido =
      false;

    atualizarUIParte();

    falarParteAtual();
  }
);

// ── Botão "Conteúdo narrado" ─────────────────────────────
btnConteudoNarrado.addEventListener(
  'click',
  () => {

    if (!itens.length) {

      mostrarToast(
        '⚠️ Não há arquivos para narrar.'
      );

      return;
    }

    const tocandoPasta =
      estadoPlayer.ativo &&
      estadoPlayer.origemId ===
        'pasta';

    if (tocandoPasta) {

      playerPlayPauseBtn.click();

      return;
    }

    narrarConteudo({

      titulo:
        'Conteúdo da matéria',

      origemId:
        'pasta',

      obterPartes:
        async () => {

          const resultados =
            await prepararConteudoNarrado();

          let textoCompleto =
            '';

          resultados.forEach(
            (resultado) => {

              textoCompleto +=
                resultado.texto +
                '\n\n';
            }
          );

          textoCompleto =
            limparTextoParaNarracao(
              textoCompleto
            );

          return dividirTextoEmPartes(
            textoCompleto
          );
        }
    });
  }
);

function atualizarVisibilidadeBotaoNarracao() {

  if (
    itens.length > 0
  ) {

    btnConteudoNarrado.style.display =
      'flex';

  } else {

    btnConteudoNarrado.style.display =
      'none';

    if (
      estadoPlayer.ativo &&
      estadoPlayer.origemId ===
        'pasta'
    ) {

      fecharPlayer();
    }
  }
}

// ==========================================================
// 📚 BIBLIOTECAS EXTERNAS
// ==========================================================

function carregarScript(
  url,
  id
) {

  return new Promise(
    (resolve, reject) => {

      if (
        document.getElementById(
          id
        )
      ) {

        resolve();

        return;
      }

      const script =
        document.createElement(
          'script'
        );

      script.id = id;
      script.src = url;

      script.onload =
        () => resolve();

      script.onerror =
        () => {

          reject(
            new Error(
              `Não foi possível carregar a biblioteca: ${url}`
            )
          );
        };

      document.head.appendChild(
        script
      );
    }
  );
}

// ── Tesseract ─────────────────────────────────────────────
async function carregarOCR() {

  if (
    window.Tesseract
  ) {
    return;
  }

  setStatus(
    '🔎 Preparando reconhecimento de texto...'
  );

  await carregarScript(
    'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
    'tesseractScript'
  );
}

// ── PDF.js ─────────────────────────────────────────────────
async function carregarPDFJS() {

  if (
    window.pdfjsLib &&
    window.pdfjsLib.__workerConfigurado
  ) {
    return;
  }

  setStatus(
    '📄 Preparando leitura de PDF...'
  );

  await carregarScript(
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    'pdfjsScript'
  );

  if (
    !window.pdfjsLib
  ) {

    throw new Error(
      'Não foi possível carregar a biblioteca de PDF.'
    );
  }

  if (
    !window.pdfjsLib
      .__workerConfigurado
  ) {

    try {

      const respostaWorker =
        await fetch(
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
        );

      if (
        !respostaWorker.ok
      ) {

        throw new Error(
          'Falha ao baixar o worker do PDF.js'
        );
      }

      const codigoWorker =
        await respostaWorker.text();

      const blobWorker =
        new Blob(
          [codigoWorker],
          {
            type:
              'application/javascript'
          }
        );

      window.pdfjsLib
        .GlobalWorkerOptions
        .workerSrc =
          URL.createObjectURL(
            blobWorker
          );

    } catch (erro) {

      console.warn(
        'Não foi possível carregar o worker do PDF.js como Blob, usando URL direta como último recurso.',
        erro
      );

      window.pdfjsLib
        .GlobalWorkerOptions
        .workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    window.pdfjsLib
      .__workerConfigurado = true;
  }
}

// ==========================================================
// 🖼️ OCR — IMAGEM → TEXTO
// ==========================================================

async function extrairTextoImagem(
  dataURL
) {

  await carregarOCR();

  const resultado =
    await Tesseract.recognize(
      dataURL,
      'por',
      {
        logger:
          (info) => {

            if (
              cancelarPreparoAtual
            ) {
              return;
            }

            if (
              info.status ===
                'recognizing text' &&
              info.progress
            ) {

              const porcentagem =
                Math.round(
                  info.progress *
                  100
                );

              setStatus(
                `🔎 Lendo imagem... ${porcentagem}%`
              );
            }
          }
      }
    );

  if (
    cancelarPreparoAtual
  ) {

    throw new Error(
      'NARRACAO_CANCELADA'
    );
  }

  return (
    resultado.data.text ||
    ''
  ).trim();
}

// ==========================================================
// 📄 PDF → TEXTO
// ==========================================================

function dataURLParaUint8Array(
  dataURL
) {

  const base64 =
    dataURL.split(',')[1];

  const binary =
    atob(base64);

  const bytes =
    new Uint8Array(
      binary.length
    );

  for (
    let i = 0;
    i < binary.length;
    i++
  ) {

    bytes[i] =
      binary.charCodeAt(i);
  }

  return bytes;
}

async function extrairTextoPDF(
  dataURL
) {

  await carregarPDFJS();

  const bytes =
    dataURLParaUint8Array(
      dataURL
    );

  const pdf =
    await pdfjsLib
      .getDocument({
        data: bytes
      })
      .promise;

  let textoCompleto =
    '';

  for (
    let numeroPagina = 1;
    numeroPagina <=
      pdf.numPages;
    numeroPagina++
  ) {

    if (
      cancelarPreparoAtual
    ) {

      throw new Error(
        'NARRACAO_CANCELADA'
      );
    }

    setStatus(
      `📄 Lendo PDF... página ${numeroPagina} de ${pdf.numPages}`
    );

    const pagina =
      await pdf.getPage(
        numeroPagina
      );

    const conteudo =
      await pagina.getTextContent();

    const textoPagina =
      conteudo.items
        .map(
          item => item.str
        )
        .join(' ');

    if (
      textoPagina.trim()
    ) {

      textoCompleto +=
        textoPagina.trim() +
        '\n\n';
    }
  }

  return textoCompleto.trim();
}

// ==========================================================
// 📄 PDF ESCANEADO → IMAGEM → OCR
// ==========================================================

async function extrairTextoPDFComOCR(
  dataURL
) {

  await carregarPDFJS();
  await carregarOCR();

  const bytes =
    dataURLParaUint8Array(
      dataURL
    );

  const pdf =
    await pdfjsLib
      .getDocument({
        data: bytes
      })
      .promise;

  let textoCompleto =
    '';

  for (
    let numeroPagina = 1;
    numeroPagina <=
      pdf.numPages;
    numeroPagina++
  ) {

    if (
      cancelarPreparoAtual
    ) {

      throw new Error(
        'NARRACAO_CANCELADA'
      );
    }

    setStatus(
      `🔎 Lendo PDF escaneado... página ${numeroPagina} de ${pdf.numPages}`
    );

    const pagina =
      await pdf.getPage(
        numeroPagina
      );

    const viewport =
      pagina.getViewport({
        scale: 1.5
      });

    const canvas =
      document.createElement(
        'canvas'
      );

    const contexto =
      canvas.getContext(
        '2d'
      );

    canvas.width =
      viewport.width;

    canvas.height =
      viewport.height;

    await pagina.render({
      canvasContext:
        contexto,
      viewport:
        viewport
    }).promise;

    const imagemPagina =
      canvas.toDataURL(
        'image/png'
      );

    const textoPagina =
      await extrairTextoImagem(
        imagemPagina
      );

    if (
      textoPagina.trim()
    ) {

      textoCompleto +=
        textoPagina.trim() +
        '\n\n';
    }
  }

  return textoCompleto.trim();
}

// ==========================================================
// 📄 PROCESSAR PDF
// ==========================================================

async function processarPDF(
  dataURL
) {

  let texto =
    '';

  try {

    texto =
      await extrairTextoPDF(
        dataURL
      );

  } catch (erro) {

    if (
      erro.message ===
      'NARRACAO_CANCELADA'
    ) {

      throw erro;
    }

    console.warn(
      'Falha ao extrair texto diretamente do PDF, tentando OCR como alternativa...',
      erro
    );

    setStatus(
      '⚠️ Leitura direta falhou, tentando reconhecimento visual...'
    );
  }

  if (
    texto &&
    texto.replace(
      /\s/g,
      ''
    ).length > 10
  ) {

    return texto;
  }

  return await extrairTextoPDFComOCR(
    dataURL
  );
}

// ==========================================================
// 📝 PROCESSAR ANOTAÇÃO
// ==========================================================

async function processarAnotacao(
  item
) {

  return (
    item.conteudo ||
    ''
  ).trim();
}

// ==========================================================
// 📦 PROCESSAR UM ITEM
// ==========================================================

async function processarItemNarracao(
  item,
  indice,
  total
) {

  if (
    cancelarPreparoAtual
  ) {

    throw new Error(
      'NARRACAO_CANCELADA'
    );
  }

  setStatus(
    `📚 Processando ${indice + 1} de ${total}: ${item.nome}`
  );

  if (
    item.tipo ===
    'anotacao'
  ) {

    return await processarAnotacao(
      item
    );
  }

  if (
    item.tipo ===
    'arquivo'
  ) {

    const registro =
      await dbGet(
        `${materiaId}_${item.id}`
      );

    if (!registro) {

      console.warn(
        `Arquivo não encontrado: ${item.nome}`
      );

      return '';
    }

    const {
      dataURL,
      mimeType
    } = registro;

    if (
      mimeType &&
      mimeType.startsWith(
        'image/'
      )
    ) {

      return await extrairTextoImagem(
        dataURL
      );
    }

    if (
      mimeType ===
        'application/pdf' ||
      item.ext?.toUpperCase() ===
        'PDF'
    ) {

      return await processarPDF(
        dataURL
      );
    }

    if (
      mimeType ===
        'text/plain' ||
      item.ext?.toUpperCase() ===
        'TXT'
    ) {

      try {

        const base64 =
          dataURL.split(',')[1];

        const decoded =
          decodeURIComponent(
            escape(
              atob(base64)
            )
          );

        return decoded.trim();

      } catch (erro) {

        console.warn(
          'Não foi possível ler o arquivo de texto:',
          erro
        );

        return '';
      }
    }
  }

  return '';
}

// ==========================================================
// 🔊 PREPARAR CONTEÚDO COMPLETO
// ==========================================================

async function prepararConteudoNarrado() {

  const textos = [];

  for (
    let i = 0;
    i < itens.length;
    i++
  ) {

    if (
      cancelarPreparoAtual
    ) {

      throw new Error(
        'NARRACAO_CANCELADA'
      );
    }

    const item =
      itens[i];

    const texto =
      await processarItemNarracao(
        item,
        i,
        itens.length
      );

    if (
      texto &&
      texto.trim()
    ) {

      textos.push({

        nome:
          item.nome,

        texto:
          texto.trim()

      });
    }
  }

  return textos;
}

// ==========================================================
// 🧹 LIMPAR TEXTO
// ==========================================================

function limparTextoParaNarracao(
  texto
) {

  return texto

    .replace(
      /[ \t]+/g,
      ' '
    )

    .replace(
      /\n{3,}/g,
      '\n\n'
    )

    .replace(
      /\s+([,.!?;:])/g,
      '$1'
    )

    .trim();
}

// ==========================================================
// ✂️ DIVIDIR TEXTO GRANDE
// ==========================================================

function dividirTextoEmPartes(
  texto,
  limite = 900
) {

  const partes = [];

  let restante =
    texto.trim();

  while (
    restante.length >
    limite
  ) {

    let corte =
      restante.lastIndexOf(
        '.',
        limite
      );

    if (
      corte <
      limite * 0.5
    ) {

      corte =
        restante.lastIndexOf(
          ' ',
          limite
        );
    }

    if (
      corte <= 0
    ) {

      corte =
        limite;
    }

    partes.push(
      restante
        .substring(
          0,
          corte + 1
        )
        .trim()
    );

    restante =
      restante
        .substring(
          corte + 1
        )
        .trim();
  }

  if (
    restante
  ) {

    partes.push(
      restante
    );
  }

  return partes;
}

// ── Renderizar lista ───────────────────────────────────────
function renderizar() {

  listaArquivos.innerHTML =
    '';

  if (
    itens.length === 0
  ) {

    semArquivos.style.display =
      'flex';

    atualizarVisibilidadeBotaoNarracao();

    return;
  }

  semArquivos.style.display =
    'none';

  itens.forEach(
    (
      item,
      idx
    ) => {

      const div =
        document.createElement(
          'div'
        );

      div.className =
        'itemArquivo';

      div.dataset.index =
        idx;

      const icone =
        item.tipo ===
        'anotacao'
          ? iconeLapis()
          : iconeArquivoPorExt(
              item.ext
            );

      div.innerHTML = `
        <div class="arquivoInfo">

          <div class="arquivoIcone">
            ${icone}
          </div>

          <div class="arquivoTexto">

            <div class="arquivoNome">
              ${item.nome}
            </div>

            <div class="arquivoMeta">

              <span class="badgeTipo ${
                item.tipo ===
                'anotacao'
                  ? 'anotacao'
                  : extParaClasse(
                      item.ext
                    )
              }">

                ${
                  item.tipo ===
                  'anotacao'
                    ? 'Anotação'
                    : item.ext ||
                      'Arquivo'
                }

              </span>

              &nbsp;${item.data}

            </div>

          </div>
        </div>

        <div class="itemAcoes">

          <button
            class="btnAbrirArquivo"
            data-index="${idx}"
            title="Abrir"
          >

            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>

            Abrir

          </button>

          <button
            class="btnOpcoesArquivo"
            data-index="${idx}"
            title="Opções"
          >
            &#8942;
          </button>

        </div>
      `;

      listaArquivos.appendChild(
        div
      );
    }
  );

  // Eventos — abrir
  document
    .querySelectorAll(
      '.btnAbrirArquivo'
    )
    .forEach(
      btn => {

        btn.addEventListener(
          'click',
          (e) => {

            e.stopPropagation();

            abrirViewer(
              parseInt(
                btn.dataset.index
              )
            );
          }
        );
      }
    );

  // Clique no card também abre
  document
    .querySelectorAll(
      '.itemArquivo'
    )
    .forEach(
      div => {

        div.addEventListener(
          'click',
          (e) => {

            if (
              e.target.closest(
                '.btnOpcoesArquivo'
              ) ||
              e.target.closest(
                '.btnAbrirArquivo'
              )
            ) {
              return;
            }

            abrirViewer(
              parseInt(
                div.dataset.index
              )
            );
          }
        );
      }
    );

  // Eventos — dropdown
  document
    .querySelectorAll(
      '.btnOpcoesArquivo'
    )
    .forEach(
      btn => {

        btn.addEventListener(
          'click',
          (e) => {

            e.stopPropagation();

            dropdownAlvoIndex =
              parseInt(
                btn.dataset.index
              );

            const rect =
              btn.getBoundingClientRect();

            dropdownArquivo.style.top =
              `${rect.bottom + 6 + window.scrollY}px`;

            dropdownArquivo.style.left =
              `${rect.right - dropdownArquivo.offsetWidth}px`;

            const item =
              itens[
                dropdownAlvoIndex
              ];

            const btnNarrar =
              dropdownArquivo.querySelector(
                '[data-acao="narrar"]'
              );

            if (btnNarrar) {

              const tocandoEsteItem =
                estadoPlayer.ativo &&
                estadoPlayer.origemId ===
                  item?.id;

              btnNarrar.classList.toggle(
                'dropAtivo',
                !!tocandoEsteItem
              );

              btnNarrar.lastChild.textContent =
                tocandoEsteItem
                  ? ' Pausar/Retomar'
                  : ' Narrar';
            }

            dropdownArquivo.classList.add(
              'visivel'
            );

            requestAnimationFrame(
              () => {

                dropdownArquivo.style.left =
                  `${rect.right - dropdownArquivo.offsetWidth}px`;
              }
            );
          }
        );
      }
    );

  atualizarVisibilidadeBotaoNarracao();
}

// ==========================================================
// VIEWER
// ==========================================================

async function abrirViewer(
  idx
) {

  const item =
    itens[idx];

  if (!item) {
    return;
  }

  viewerEditandoIndex =
    null;

  viewerTitulo.textContent =
    item.nome;

  viewerCorpo.innerHTML =
    '';

  btnEditarViewer.style.display =
    'none';

  // IA só aparece para anotação
  const viewerIA =
    document.getElementById(
      'viewerIA'
    );

  const resultadoIAViewer =
    document.getElementById(
      'resultadoIAViewer'
    );

  if (viewerIA) {

    viewerIA.style.display =
      'none';
  }

  if (
    resultadoIAViewer
  ) {

    resultadoIAViewer.innerHTML =
      '';
  }

  ultimoResultadoIAViewer =
    '';

  if (
    item.tipo ===
    'anotacao'
  ) {

    // Renderiza anotação
    btnEditarViewer.style.display =
      'inline-flex';

    viewerEditandoIndex =
      idx;

    const pre =
      document.createElement(
        'div'
      );

    pre.className =
      'viewerTexto';

    pre.textContent =
      item.conteudo ||
      '';

    viewerCorpo.appendChild(
      pre
    );

    // Mostra a IA
    if (viewerIA) {

      viewerIA.style.display =
        'block';

      viewerIA
        .querySelectorAll(
          '.viewerIAButton'
        )
        .forEach(
          (botao) => {

            botao.onclick =
              () => {

                usarIAViewer(
                  botao.dataset.ia,
                  item,
                  idx
                );
              };
          }
        );
    }

  } else {

    // Busca binário
    const registro =
      await dbGet(
        `${materiaId}_${item.id}`
      );

    if (!registro) {

      viewerCorpo.innerHTML = `
        <div class="viewerSemDados">

          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ccc"
            stroke-width="1.5"
          >

            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>

            <polyline
              points="14 2 14 8 20 8"
            />

          </svg>

          <p>

            Arquivo não disponível
            para visualização.

            <br>

            Possivelmente foi
            adicionado em outra sessão.

          </p>

        </div>
      `;

    } else {

      const {
        dataURL,
        mimeType
      } = registro;

      if (
        mimeType &&
        mimeType.startsWith(
          'image/'
        )
      ) {

        const img =
          document.createElement(
            'img'
          );

        img.src =
          dataURL;

        img.className =
          'viewerImagem';

        viewerCorpo.appendChild(
          img
        );

      } else if (
        mimeType ===
        'application/pdf'
      ) {

        const iframe =
          document.createElement(
            'iframe'
          );

        iframe.src =
          dataURL;

        iframe.className =
          'viewerPDF';

        iframe.title =
          item.nome;

        viewerCorpo.appendChild(
          iframe
        );

      } else {

        try {

          const base64 =
            dataURL.split(',')[1];

          const decoded =
            atob(base64);

          const pre =
            document.createElement(
              'pre'
            );

          pre.className =
            'viewerTexto';

          pre.textContent =
            decoded;

          viewerCorpo.appendChild(
            pre
          );

        } catch {

          const link =
            document.createElement(
              'a'
            );

          link.href =
            dataURL;

          link.download =
            item.nome;

          link.className =
            'btnPrimario viewerDownload';

          link.textContent =
            '⬇ Baixar arquivo';

          viewerCorpo.appendChild(
            link
          );
        }
      }
    }
  }

  viewerOverlay.classList.add(
    'aberto'
  );

  document.body.style.overflow =
    'hidden';
}

function fecharViewer() {

  viewerOverlay.classList.remove(
    'aberto'
  );

  document.body.style.overflow =
    '';

  viewerEditandoIndex =
    null;
}

btnFecharViewer.addEventListener(
  'click',
  fecharViewer
);

viewerOverlay.addEventListener(
  'click',
  (e) => {

    if (
      e.target ===
      viewerOverlay
    ) {

      fecharViewer();
    }
  }
);

document.addEventListener(
  'keydown',
  (e) => {

    if (
      e.key ===
      'Escape'
    ) {

      fecharViewer();
    }
  }
);

// ── Editar anotação ───────────────────────────────────────
btnEditarViewer.addEventListener(
  'click',
  () => {

    if (
      viewerEditandoIndex ===
      null
    ) {
      return;
    }

    const item =
      itens[
        viewerEditandoIndex
      ];

    fecharViewer();

    areaAnotacao.style.display =
      'block';

    tituloAnotacao.value =
      item.nome;

    textoAnotacao.value =
      item.conteudo ||
      '';

    areaAnotacao.dataset
      .editandoIndex =
        viewerEditandoIndex;

    tituloAnotacao.focus();

    areaAnotacao.scrollIntoView({
      behavior:
        'smooth',
      block:
        'start'
    });
  }
);

// ==========================================================
// ÍCONES SVG
// ==========================================================

function iconeArquivoPorExt(
  ext
) {

  const e =
    (ext || '')
      .toUpperCase();

  if (
    [
      'JPG',
      'JPEG',
      'PNG',
      'GIF',
      'WEBP',
      'SVG'
    ].includes(e)
  ) {

    return `
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >

        <rect
          x="3"
          y="3"
          width="18"
          height="18"
          rx="2"
        />

        <circle
          cx="8.5"
          cy="8.5"
          r="1.5"
        />

        <polyline
          points="21 15 16 10 5 21"
        />

      </svg>
    `;
  }

  if (
    e ===
    'PDF'
  ) {

    return `
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >

        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>

        <polyline
          points="14 2 14 8 20 8"
        />

        <line
          x1="9"
          y1="13"
          x2="15"
          y2="13"
        />

      </svg>
    `;
  }

  return `
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >

      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>

      <polyline
        points="14 2 14 8 20 8"
      />

    </svg>
  `;
}

function iconeLapis() {

  return `
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >

      <path
        d="M12 20h9"
      />

      <path
        d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
      />

    </svg>
  `;
}

function extParaClasse(
  ext
) {

  const e =
    (ext || '')
      .toUpperCase();

  if (
    [
      'JPG',
      'JPEG',
      'PNG',
      'GIF',
      'WEBP',
      'SVG'
    ].includes(e)
  ) {

    return 'imagem';
  }

  if (
    e ===
    'PDF'
  ) {

    return 'pdf';
  }

  return 'arquivo';
}

// ==========================================================
// ADICIONAR ARQUIVO
// ==========================================================

btnAddArquivo.addEventListener(
  'click',
  () =>
    inputArquivo.click()
);

inputArquivo.addEventListener(
  'change',
  async () => {

    const files =
      Array.from(
        inputArquivo.files
      );

    if (
      !files.length
    ) {
      return;
    }

    for (
      const file of files
    ) {

      const ext =
        file.name
          .split('.')
          .pop()
          .toUpperCase();

      const id =
        Date.now() +
        Math.random();

      const dataURL =
        await lerArquivoComoDataURL(
          file
        );

      await dbPut({

        chaveId:
          `${materiaId}_${id}`,

        dataURL,

        mimeType:
          file.type
      });

      itens.push({

        id,

        nome:
          file.name,

        tipo:
          'arquivo',

        ext,

        mimeType:
          file.type,

        data:
          new Date()
            .toLocaleDateString(
              'pt-BR'
            )
      });
    }

    salvar();

    renderizar();

    mostrarToast(
      `📎 ${files.length} arquivo(s) adicionado(s)`
    );

    inputArquivo.value =
      '';
  }
);

function lerArquivoComoDataURL(
  file
) {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      const reader =
        new FileReader();

      reader.onload =
        () =>
          resolve(
            reader.result
          );

      reader.onerror =
        () =>
          reject(
            reader.error
          );

      reader.readAsDataURL(
        file
      );
    }
  );
}

// ==========================================================
// DROPDOWN
// ==========================================================

dropdownArquivo
  .querySelectorAll(
    '.dropItem'
  )
  .forEach(
    btn => {

      btn.addEventListener(
        'click',
        async () => {

          const acao =
            btn.dataset.acao;

          const item =
            itens[
              dropdownAlvoIndex
            ];

          dropdownArquivo.classList.remove(
            'visivel'
          );

          if (!item) {
            return;
          }

          // Excluir
          if (
            acao ===
            'excluir'
          ) {

            if (
              !confirm(
                `Excluir "${item.nome}"? Essa ação não pode ser desfeita.`
              )
            ) {
              return;
            }

            if (
              item.tipo ===
              'arquivo'
            ) {

              await dbDelete(
                `${materiaId}_${item.id}`
              );
            }

            if (
              estadoPlayer.ativo &&
              estadoPlayer.origemId ===
                item.id
            ) {

              fecharPlayer();
            }

            itens.splice(
              dropdownAlvoIndex,
              1
            );

            salvar();

            renderizar();

            mostrarToast(
              '🗑️ Item excluído'
            );

            dropdownAlvoIndex =
              null;

            return;
          }

          // Abrir
          if (
            acao ===
            'abrir'
          ) {

            const idx =
              dropdownAlvoIndex;

            dropdownAlvoIndex =
              null;

            abrirViewer(
              idx
            );

            return;
          }

          // Narrar
          if (
            acao ===
            'narrar'
          ) {

            dropdownAlvoIndex =
              null;

            const tocandoEsteItem =
              estadoPlayer.ativo &&
              estadoPlayer.origemId ===
                item.id;

            if (
              tocandoEsteItem
            ) {

              playerPlayPauseBtn.click();

              return;
            }

            narrarConteudo({

              titulo:
                item.nome,

              origemId:
                item.id,

              obterPartes:
                async () => {

                  const texto =
                    await processarItemNarracao(
                      item,
                      0,
                      1
                    );

                  const limpo =
                    limparTextoParaNarracao(
                      texto ||
                        ''
                    );

                  return dividirTextoEmPartes(
                    limpo
                  );
                }
            });

            return;
          }

          // Download
          if (
            item.tipo ===
            'anotacao'
          ) {

            const blob =
              new Blob(
                [
                  item.conteudo ||
                    ''
                ],
                {
                  type:
                    'text/plain'
                }
              );

            baixar(
              URL.createObjectURL(
                blob
              ),
              item.nome +
                '.txt'
            );

          } else {

            const registro =
              await dbGet(
                `${materiaId}_${item.id}`
              );

            if (
              registro
            ) {

              baixar(
                registro.dataURL,
                item.nome
              );

            } else {

              mostrarToast(
                '⚠️ Arquivo não encontrado no armazenamento'
              );
            }
          }

          mostrarToast(
            '💾 Download iniciado'
          );

          dropdownAlvoIndex =
            null;
        }
      );
    }
  );

function baixar(
  url,
  nome
) {

  const a =
    document.createElement(
      'a'
    );

  a.href =
    url;

  a.download =
    nome;

  a.click();
}

// ==========================================================
// FECHAR DROPDOWN
// ==========================================================

document.addEventListener(
  'click',
  (e) => {

    if (
      !dropdownArquivo.contains(
        e.target
      ) &&
      !e.target.classList.contains(
        'btnOpcoesArquivo'
      )
    ) {

      dropdownArquivo.classList.remove(
        'visivel'
      );

      dropdownAlvoIndex =
        null;
    }
  }
);

// ==========================================================
// CRIAR / EDITAR ANOTAÇÃO
// ==========================================================

btnCriarAnotacao.addEventListener(
  'click',
  () => {

    delete areaAnotacao
      .dataset
      .editandoIndex;

    areaAnotacao.style.display =
      'block';

    tituloAnotacao.value =
      '';

    textoAnotacao.value =
      '';

    tituloAnotacao.focus();

    areaAnotacao.scrollIntoView({
      behavior:
        'smooth',
      block:
        'start'
    });
  }
);

function fecharAnotacao() {

  areaAnotacao.style.display =
    'none';

  delete areaAnotacao
    .dataset
    .editandoIndex;
}

btnFecharAnotacao.addEventListener(
  'click',
  fecharAnotacao
);

btnCancelarAnotacao.addEventListener(
  'click',
  fecharAnotacao
);

btnSalvarAnotacao.addEventListener(
  'click',
  () => {

    const titulo =
      tituloAnotacao.value.trim() ||
      'Anotação';

    const texto =
      textoAnotacao.value.trim();

    if (!texto) {

      textoAnotacao.focus();

      return;
    }

    const editIdx =
      areaAnotacao
        .dataset
        .editandoIndex;

    if (
      editIdx !==
      undefined
    ) {

      itens[
        parseInt(
          editIdx
        )
      ].nome =
        titulo;

      itens[
        parseInt(
          editIdx
        )
      ].conteudo =
        texto;

      mostrarToast(
        '✏️ Anotação atualizada!'
      );

    } else {

      itens.push({

        id:
          Date.now(),

        nome:
          titulo,

        tipo:
          'anotacao',

        ext:
          null,

        conteudo:
          texto,

        data:
          new Date()
            .toLocaleDateString(
              'pt-BR'
            )
      });

      mostrarToast(
        '📝 Anotação salva!'
      );
    }

    salvar();

    renderizar();

    fecharAnotacao();
  }
);

// ==========================================================
// PERSISTÊNCIA
// ==========================================================

function salvar() {

  localStorage.setItem(
    chave,
    JSON.stringify(
      itens
    )
  );

  const materias =
    JSON.parse(
      localStorage.getItem(
        'materias'
      ) || '[]'
    );

  const m =
    materias.find(
      x =>
        x.id ==
        materiaId
    );

  if (m) {

    m.arquivos =
      itens.length;

    localStorage.setItem(
      'materias',
      JSON.stringify(
        materias
      )
    );
  }
}

// ==========================================================
// TOAST
// ==========================================================

function mostrarToast(
  msg
) {

  let toast =
    document.getElementById(
      'toastGlobal'
    );

  if (!toast) {

    toast =
      document.createElement(
        'div'
      );

    toast.id =
      'toastGlobal';

    toast.className =
      'toast';

    document.body.appendChild(
      toast
    );
  }

  toast.textContent =
    msg;

  toast.classList.add(
    'show'
  );

  clearTimeout(
    toast._t
  );

  toast._t =
    setTimeout(
      () =>
        toast.classList.remove(
          'show'
        ),
      2500
    );
}

// ==========================================================
// INIT
// ==========================================================

abrirDB().then(
  () => {

    renderizarIconePlayPause();

    renderizar();
  }
);

window.testarVozJoviClass =
  function () {

    const teste =
      new SpeechSynthesisUtterance(
        'Olá! Este é um teste de voz do JoviClass.'
      );

    teste.lang =
      'pt-BR';

    teste.rate =
      0.9;

    teste.pitch =
      1;

    teste.volume =
      1;

    window.speechSynthesis.cancel();

    window.speechSynthesis.resume();

    window.speechSynthesis.speak(
      teste
    );

    console.log(
      'Teste de voz executado.'
    );
  };

// =====================================================
// SISTEMA DE NOTIFICAÇÕES POR PROXIMIDADE
// =====================================================

const EVENTOS = [

  {
    id:
      "prova-calculo",

    titulo:
      "Prova de Cálculo I",

    tipo:
      "prova",

    materia:
      "Cálculo I",

    data:
      "2024-05-25T08:00"
  },

  {
    id:
      "prova-fisica",

    titulo:
      "Prova de Física II",

    tipo:
      "prova",

    materia:
      "Física II",

    data:
      "2024-06-02T08:00"
  },

  {
    id:
      "trabalho-eco",

    titulo:
      "Entrega do trabalho de Economia",

    tipo:
      "trabalho",

    materia:
      "Economia",

    data:
      "2024-06-05T23:59"
  },

  {
    id:
      "reuniao-grupo",

    titulo:
      "Reunião do grupo de estudos",

    tipo:
      "reuniao",

    materia:
      "Cálculo I",

    data:
      "2024-05-20T19:00"
  }

];

const ICONE_TIPO = {

  prova:
    "📝",

  trabalho:
    "📁",

  reuniao:
    "🗓️"

};

const LIMIARES_ALERTA = {

  aviso7dias:
    7 *
    24 *
    60 *
    60 *
    1000,

  aviso1dia:
    24 *
    60 *
    60 *
    1000,

  aviso1hora:
    60 *
    60 *
    1000

};

const CHAVE_LIDAS =
  "joviclass_notif_lidas";

const CHAVE_DISPARADAS =
  "joviclass_notif_disparadas";

function carregarSet(
  chave
) {

  try {

    return new Set(
      JSON.parse(
        localStorage.getItem(
          chave
        )
      ) || []
    );

  } catch {

    return new Set();
  }
}

function salvarSet(
  chave,
  set
) {

  localStorage.setItem(
    chave,
    JSON.stringify(
      [...set]
    )
  );
}

let lidas =
  carregarSet(
    CHAVE_LIDAS
  );

let disparadas =
  carregarSet(
    CHAVE_DISPARADAS
  );

function calcularStatus(
  evento
) {

  const agora =
    new Date();

  const dataEvento =
    new Date(
      evento.data
    );

  const diffMs =
    dataEvento -
    agora;

  if (
    diffMs <= 0
  ) {
    return null;
  }

  const diffHoras =
    diffMs /
    (
      1000 *
      60 *
      60
    );

  const diffDias =
    diffHoras /
    24;

  let urgencia =
    "normal";

  if (
    diffHoras <= 24
  ) {

    urgencia =
      "urgente";

  } else if (
    diffDias <= 3
  ) {

    urgencia =
      "breve";
  }

  let prazoTexto;

  if (
    diffHoras < 1
  ) {

    prazoTexto =
      "em menos de 1h";

  } else if (
    diffHoras < 24
  ) {

    prazoTexto =
      `em ${Math.round(diffHoras)}h`;

  } else {

    prazoTexto =
      `em ${Math.ceil(diffDias)} dia${Math.ceil(diffDias) > 1 ? "s" : ""}`;
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

  return EVENTOS

    .map(
      (evento) => {

        const status =
          calcularStatus(
            evento
          );

        if (
          !status ||
          status.diffMs >
            LIMIARES_ALERTA
              .aviso7dias
        ) {

          return null;
        }

        return {
          ...evento,
          ...status
        };
      }
    )

    .filter(
      Boolean
    )

    .sort(
      (a, b) =>
        a.diffMs -
        b.diffMs
    );
}

const TIPO_LABEL = {

  prova:
    "Prova",

  trabalho:
    "Trabalho",

  reuniao:
    "Reunião"
};

function renderizarPainel() {

  const lista =
    document.getElementById(
      "notifLista"
    );

  const dot =
    document.getElementById(
      "notifDot"
    );

  if (
    !lista ||
    !dot
  ) {
    return;
  }

  const notificacoes =
    gerarNotificacoes();

  const naoLidas =
    notificacoes.filter(
      n =>
        !lidas.has(
          n.id
        )
    );

  if (
    naoLidas.length >
    0
  ) {

    dot.hidden =
      false;

    dot.textContent =
      naoLidas.length >
      9
        ? "9+"
        : naoLidas.length;

  } else {

    dot.hidden =
      true;
  }

  if (
    notificacoes.length ===
    0
  ) {

    lista.innerHTML =
      `<div class="notif-vazio">Nenhuma prova, trabalho ou reunião chegando perto!</div>`;

    return;
  }

  lista.innerHTML =
    notificacoes
      .map(
        (n) => `

          <div
            class="notif-item ${lidas.has(n.id) ? "" : "nao-lida"}"
            data-id="${n.id}"
          >

            <span
              class="notif-icone ${n.urgencia}"
            >
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

              <span
                class="notif-prazo ${n.urgencia}"
              >
                Vence ${n.prazoTexto}
              </span>

            </div>

          </div>
        `
      )
      .join("");

  lista
    .querySelectorAll(
      ".notif-item"
    )
    .forEach(
      (el) => {

        el.addEventListener(
          "click",
          () => {

            lidas.add(
              el.dataset.id
            );

            salvarSet(
              CHAVE_LIDAS,
              lidas
            );

            renderizarPainel();
          }
        );
      }
    );
}

function dispararNotificacaoDoNavegador(
  evento,
  status
) {

  if (
    !(
      "Notification" in
      window
    ) ||
    Notification.permission !==
      "granted"
  ) {

    return;
  }

  const chaveDisparo =
    `${evento.id}-${status.urgencia}`;

  if (
    disparadas.has(
      chaveDisparo
    )
  ) {

    return;
  }

  new Notification(
    `${TIPO_LABEL[evento.tipo]}: ${evento.titulo}`,
    {
      body:
        `Vence ${status.prazoTexto}.`,

      icon:
        "./src/assets/img/logo.png"
    }
  );

  disparadas.add(
    chaveDisparo
  );

  salvarSet(
    CHAVE_DISPARADAS,
    disparadas
  );
}

function verificarAlertasDoSistema() {

  EVENTOS.forEach(
    (evento) => {

      const status =
        calcularStatus(
          evento
        );

      if (
        !status
      ) {
        return;
      }

      if (
        status.diffMs <=
          LIMIARES_ALERTA.aviso1hora ||
        status.diffMs <=
          LIMIARES_ALERTA.aviso1dia
      ) {

        dispararNotificacaoDoNavegador(
          evento,
          status
        );
      }
    }
  );
}

function iniciarSistemaDeNotificacoes() {

  const notifBtn =
    document.getElementById(
      "notifBtn"
    );

  const notifPanel =
    document.getElementById(
      "notifPanel"
    );

  const notifMarcarLidas =
    document.getElementById(
      "notifMarcarLidas"
    );

  renderizarPainel();

  verificarAlertasDoSistema();

  if (
    "Notification" in
      window &&
    Notification.permission ===
      "default"
  ) {

    Notification.requestPermission();
  }

  if (
    notifBtn &&
    notifPanel
  ) {

    notifBtn.addEventListener(
      "click",
      (e) => {

        e.stopPropagation();

        const aberto =
          !notifPanel.hidden;

        notifPanel.hidden =
          aberto;

        notifBtn.setAttribute(
          "aria-expanded",
          String(
            !aberto
          )
        );
      }
    );

    document.addEventListener(
      "click",
      (e) => {

        if (
          !notifPanel.hidden &&
          !notifPanel.contains(
            e.target
          ) &&
          e.target !==
            notifBtn
        ) {

          notifPanel.hidden =
            true;

          notifBtn.setAttribute(
            "aria-expanded",
            "false"
          );
        }
      }
    );
  }

  if (
    notifMarcarLidas
  ) {

    notifMarcarLidas.addEventListener(
      "click",
      () => {

        gerarNotificacoes()
          .forEach(
            (n) =>
              lidas.add(
                n.id
              )
          );

        salvarSet(
          CHAVE_LIDAS,
          lidas
        );

        renderizarPainel();
      }
    );
  }

  setInterval(
    () => {

      renderizarPainel();

      verificarAlertasDoSistema();

    },
    5 *
    60 *
    1000
  );
}

iniciarSistemaDeNotificacoes();

// =====================================================
// 🤖 IA DENTRO DA ANOTAÇÃO ABERTA
// =====================================================

let ultimoResultadoIAViewer =
  '';

let iaViewerProcessando =
  false;

function escaparHTML(
  texto
) {

  return String(
    texto ||
      ''
  )

    .replace(
      /&/g,
      '&amp;'
    )

    .replace(
      /</g,
      '&lt;'
    )

    .replace(
      />/g,
      '&gt;'
    )

    .replace(
      /"/g,
      '&quot;'
    )

    .replace(
      /'/g,
      '&#039;'
    );
}

function formatarResultadoIAViewer(
  texto
) {

  return escaparHTML(
    texto
  ).replace(
    /\r?\n/g,
    '<br>'
  );
}

function nomeAcaoIAViewer(
  acao
) {

  const nomes = {

    resumo:
      'Resumo',

    questoes:
      'Questões',

    flashcards:
      'Flashcards',

    simulado:
      'Simulado',

    explicar:
      'Explicação'
  };

  return (
    nomes[acao] ||
    'Resultado'
  );
}

function definirBotoesIAViewer(
  desabilitado
) {

  document
    .querySelectorAll(
      '.viewerIAButton'
    )
    .forEach(
      (botao) => {

        botao.disabled =
          desabilitado;
      }
    );
}

async function usarIAViewer(
  acao,
  item,
  index
) {

  const resultado =
    document.getElementById(
      'resultadoIAViewer'
    );

  if (
    !resultado
  ) {
    return;
  }

  if (
    !item ||
    item.tipo !==
      'anotacao'
  ) {

    resultado.innerHTML = `
      <div class="erroViewerIA">
        ⚠️ A IA está disponível para anotações abertas.
      </div>
    `;

    return;
  }

  const texto =
    String(
      item.conteudo ||
        ''
    ).trim();

  if (
    !texto
  ) {

    resultado.innerHTML = `
      <div class="erroViewerIA">
        ⚠️ Esta anotação não possui conteúdo para analisar.
      </div>
    `;

    return;
  }

  if (
    iaViewerProcessando
  ) {

    return;
  }

  iaViewerProcessando =
    true;

  definirBotoesIAViewer(
    true
  );

  resultado.innerHTML = `

    <div class="viewerIALoading">

      <span class="viewerIALoadingIcon">
        🤖
      </span>

      <span>
        A Jovi está analisando sua anotação...
      </span>

    </div>

  `;

  try {

    const resposta =
      await fetch(
        'http://localhost:3000/ia',
        {
          method:
            'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body:
            JSON.stringify({
              acao,
              texto
            })
        }
      );

    let dados;

    try {

      dados =
        await resposta.json();

    } catch {

      throw new Error(
        'O servidor retornou uma resposta que não é JSON. Verifique se o backend está rodando.'
      );
    }

    if (
      !resposta.ok
    ) {

      throw new Error(
        dados.erro ||
          'Erro no servidor.'
      );
    }

    if (
      !dados.resultado
    ) {

      throw new Error(
        'A IA não retornou nenhum resultado.'
      );
    }

    ultimoResultadoIAViewer =
      String(
        dados.resultado
      );

    resultado.innerHTML = `

      <div class="resultadoIABox">

        <div class="resultadoIAHeader">

          <div class="resultadoIATitulo">
            ✨ ${escaparHTML(nomeAcaoIAViewer(acao))} gerado pela Jovi
          </div>

          <button
            type="button"
            class="resultadoIAFechar"
            onclick="fecharResultadoIAViewer()"
            title="Fechar resultado"
          >
            ×
          </button>

        </div>


        <div class="resultadoIATexto">

          ${formatarResultadoIAViewer(
            ultimoResultadoIAViewer
          )}

        </div>


        <div class="resultadoIAAcoes">

          <button
            type="button"
            class="btnResultadoIA btnAdicionarResultado"
            onclick="adicionarIAAnotacaoViewer(${index})"
          >
            ✏️ Adicionar à anotação
          </button>


          <button
            type="button"
            class="btnResultadoIA btnCopiarResultado"
            onclick="copiarIAViewer()"
          >
            📋 Copiar
          </button>

        </div>

      </div>

    `;

  } catch (
    erro
  ) {

    console.error(
      '❌ Erro na IA:',
      erro
    );

    ultimoResultadoIAViewer =
      '';

    resultado.innerHTML = `

      <div class="erroViewerIA">

        <strong>
          ❌ Não foi possível utilizar a IA.
        </strong>

        <br>

        ${escaparHTML(
          erro.message
        )}

        <br><br>

        <small>
          Verifique se o backend está rodando em http://localhost:3000.
        </small>

      </div>

    `;

  } finally {

    iaViewerProcessando =
      false;

    definirBotoesIAViewer(
      false
    );
  }
}

function fecharResultadoIAViewer() {

  const resultado =
    document.getElementById(
      'resultadoIAViewer'
    );

  ultimoResultadoIAViewer =
    '';

  if (
    resultado
  ) {

    resultado.innerHTML =
      '';
  }
}

async function copiarIAViewer() {

  if (
    !ultimoResultadoIAViewer
  ) {

    mostrarToast(
      '⚠️ Não há resultado da IA para copiar.'
    );

    return;
  }

  try {

    await navigator
      .clipboard
      .writeText(
        ultimoResultadoIAViewer
      );

    mostrarToast(
      '📋 Resultado copiado!'
    );

  } catch (
    erro
  ) {

    console.error(
      'Erro ao copiar resultado da IA:',
      erro
    );

    mostrarToast(
      '⚠️ Não foi possível copiar o resultado.'
    );
  }
}

function adicionarIAAnotacaoViewer(
  index
) {

  if (
    !ultimoResultadoIAViewer
  ) {

    mostrarToast(
      '⚠️ Não há resultado da IA para adicionar.'
    );

    return;
  }

  const item =
    itens[index];

  if (
    !item ||
    item.tipo !==
      'anotacao'
  ) {

    mostrarToast(
      '⚠️ A anotação não foi encontrada.'
    );

    return;
  }

  const atual =
    String(
      item.conteudo ||
        ''
    ).trim();

  const separador =
    atual
      ? '\n\n--- Conteúdo gerado pela Jovi ---\n\n'
      : '';

  item.conteudo =
    atual +
    separador +
    ultimoResultadoIAViewer;

  salvar();

  renderizar();

  mostrarToast(
    '✨ Resultado da IA adicionado à anotação!'
  );

  abrirViewer(
    index
  );
}

// Compatibilidade com qualquer trecho antigo
function usarIA(
  acao
) {

  const item =
    itens[
      viewerEditandoIndex
    ];

  if (
    item &&
    item.tipo ===
      'anotacao'
  ) {

    return usarIAViewer(
      acao,
      item,
      viewerEditandoIndex
    );
  }

  mostrarToast(
    'ℹ️ Abra uma anotação para usar a IA.'
  );
}