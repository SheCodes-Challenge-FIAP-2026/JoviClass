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
// 🔊 CONTEÚDO NARRADO
// ==========================================================

// Estado da narração
let narracaoParada = false;
let narracaoExecutando = false;

// Elementos criados pelo JavaScript
let btnConteudoNarrado = null;
let statusNarracao = null;


// ── Criar botão de Conteúdo Narrado ────────────────────────
function criarInterfaceNarracao() {

  if (btnConteudoNarrado) return;

  btnConteudoNarrado = document.createElement('button');

  btnConteudoNarrado.id = 'btnConteudoNarrado';
  btnConteudoNarrado.type = 'button';

  btnConteudoNarrado.innerHTML = `
    <span>🔊</span>
    <span>Conteúdo narrado</span>
  `;

  // Estilo básico para não depender de alterações no CSS
  btnConteudoNarrado.style.cssText = `
    display: none;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    max-width: 280px;
    margin: 20px auto;
    padding: 12px 18px;
    border: none;
    border-radius: 10px;
    background: #111;
    color: #fff;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: 0.2s ease;
  `;

  btnConteudoNarrado.addEventListener('mouseenter', () => {
    btnConteudoNarrado.style.opacity = '0.85';
  });

  btnConteudoNarrado.addEventListener('mouseleave', () => {
    btnConteudoNarrado.style.opacity = '1';
  });

  btnConteudoNarrado.addEventListener('click', iniciarConteudoNarrado);

  // Coloca o botão antes da lista de arquivos
  listaArquivos.parentNode.insertBefore(btnConteudoNarrado, listaArquivos);

  // Status da narração
  statusNarracao = document.createElement('div');

  statusNarracao.id = 'statusNarracao';

  statusNarracao.style.cssText = `
    display: none;
    width: 100%;
    max-width: 500px;
    margin: 10px auto 20px;
    padding: 12px 16px;
    border-radius: 10px;
    background: #f5f5f5;
    color: #333;
    text-align: center;
    font-size: 14px;
    line-height: 1.5;
    box-sizing: border-box;
  `;

  listaArquivos.parentNode.insertBefore(statusNarracao, listaArquivos);
}


// ── Atualizar botão conforme quantidade de arquivos ───────
function atualizarBotaoNarracao() {

  if (!btnConteudoNarrado) {
    criarInterfaceNarracao();
  }

  if (itens.length > 0) {

    btnConteudoNarrado.style.display = 'flex';

  } else {

    btnConteudoNarrado.style.display = 'none';

    if (statusNarracao) {
      statusNarracao.style.display = 'none';
    }
  }
}


// ── Atualizar status ───────────────────────────────────────
function atualizarStatusNarracao(texto, mostrar = true) {

  if (!statusNarracao) {
    criarInterfaceNarracao();
  }

  statusNarracao.textContent = texto;
  statusNarracao.style.display = mostrar ? 'block' : 'none';
}


// ==========================================================
// 📚 BIBLIOTECAS EXTERNAS
// ==========================================================

// Carrega uma biblioteca JavaScript somente quando necessária
function carregarScript(url, id) {

  return new Promise((resolve, reject) => {

    if (document.getElementById(id)) {
      resolve();
      return;
    }

    const script = document.createElement('script');

    script.id = id;
    script.src = url;

    script.onload = () => resolve();

    script.onerror = () => {
      reject(new Error(`Não foi possível carregar a biblioteca: ${url}`));
    };

    document.head.appendChild(script);
  });
}


// ── Carregar Tesseract.js ─────────────────────────────────
async function carregarOCR() {

  if (window.Tesseract) {
    return;
  }

  atualizarStatusNarracao('🔎 Preparando reconhecimento de texto...');

  await carregarScript(
    'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
    'tesseractScript'
  );
}


// ── Carregar PDF.js ────────────────────────────────────────
async function carregarPDFJS() {

  if (window.pdfjsLib) {
    return;
  }

  atualizarStatusNarracao('📄 Preparando leitura de PDF...');

  await carregarScript(
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    'pdfjsScript'
  );

  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}


// ==========================================================
// 🖼️ OCR — IMAGEM → TEXTO
// ==========================================================

async function extrairTextoImagem(dataURL) {

  await carregarOCR();

  const resultado = await Tesseract.recognize(
    dataURL,
    'por',
    {
      logger: (info) => {

        if (info.status === 'recognizing text' && info.progress) {

          const porcentagem = Math.round(info.progress * 100);

          atualizarStatusNarracao(
            `🔎 Lendo imagem... ${porcentagem}%`
          );
        }
      }
    }
  );

  return (resultado.data.text || '').trim();
}


// ==========================================================
// 📄 PDF → TEXTO
// ==========================================================

function dataURLParaUint8Array(dataURL) {

  const base64 = dataURL.split(',')[1];

  const binary = atob(base64);

  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}


// ── Extrair texto de PDF digital ───────────────────────────
async function extrairTextoPDF(dataURL) {

  await carregarPDFJS();

  const bytes = dataURLParaUint8Array(dataURL);

  const pdf = await pdfjsLib.getDocument({
    data: bytes
  }).promise;

  let textoCompleto = '';

  for (let numeroPagina = 1; numeroPagina <= pdf.numPages; numeroPagina++) {

    if (narracaoParada) {
      throw new Error('NARRACAO_CANCELADA');
    }

    atualizarStatusNarracao(
      `📄 Lendo PDF... página ${numeroPagina} de ${pdf.numPages}`
    );

    const pagina = await pdf.getPage(numeroPagina);

    const conteudo = await pagina.getTextContent();

    const textoPagina = conteudo.items
      .map(item => item.str)
      .join(' ');

    if (textoPagina.trim()) {

      textoCompleto += textoPagina.trim() + '\n\n';
    }
  }

  return textoCompleto.trim();
}


// ==========================================================
// 📄 PDF ESCANEADO → IMAGEM → OCR
// ==========================================================

async function extrairTextoPDFComOCR(dataURL) {

  await carregarPDFJS();
  await carregarOCR();

  const bytes = dataURLParaUint8Array(dataURL);

  const pdf = await pdfjsLib.getDocument({
    data: bytes
  }).promise;

  let textoCompleto = '';

  for (let numeroPagina = 1; numeroPagina <= pdf.numPages; numeroPagina++) {

    if (narracaoParada) {
      throw new Error('NARRACAO_CANCELADA');
    }

    atualizarStatusNarracao(
      `🔎 Lendo PDF escaneado... página ${numeroPagina} de ${pdf.numPages}`
    );

    const pagina = await pdf.getPage(numeroPagina);

    const viewport = pagina.getViewport({
      scale: 1.5
    });

    const canvas = document.createElement('canvas');

    const contexto = canvas.getContext('2d');

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await pagina.render({
      canvasContext: contexto,
      viewport: viewport
    }).promise;

    const imagemPagina = canvas.toDataURL('image/png');

    const textoPagina = await extrairTextoImagem(imagemPagina);

    if (textoPagina.trim()) {

      textoCompleto += textoPagina.trim() + '\n\n';
    }
  }

  return textoCompleto.trim();
}


// ==========================================================
// 📄 PROCESSAR PDF
// ==========================================================

async function processarPDF(dataURL) {

  // Primeiro tenta extrair texto normalmente
  const texto = await extrairTextoPDF(dataURL);

  // Se encontrou texto, usa o texto encontrado
  if (texto && texto.replace(/\s/g, '').length > 10) {

    return texto;
  }

  // Se praticamente não encontrou texto,
  // significa que provavelmente é um PDF escaneado.
  return await extrairTextoPDFComOCR(dataURL);
}


// ==========================================================
// 📝 PROCESSAR ANOTAÇÃO
// ==========================================================

async function processarAnotacao(item) {

  return (item.conteudo || '').trim();
}


// ==========================================================
// 📦 PROCESSAR UM ITEM
// ==========================================================

async function processarItemNarracao(item, indice, total) {

  if (narracaoParada) {
    throw new Error('NARRACAO_CANCELADA');
  }

  atualizarStatusNarracao(
    `📚 Processando ${indice + 1} de ${total}: ${item.nome}`
  );

  // ─────────────────────────────────────────────
  // ANOTAÇÃO
  // ─────────────────────────────────────────────
  if (item.tipo === 'anotacao') {

    return await processarAnotacao(item);
  }


  // ─────────────────────────────────────────────
  // ARQUIVO
  // ─────────────────────────────────────────────
  if (item.tipo === 'arquivo') {

    const registro = await dbGet(
      `${materiaId}_${item.id}`
    );

    if (!registro) {

      console.warn(
        `Arquivo não encontrado: ${item.nome}`
      );

      return '';
    }

    const { dataURL, mimeType } = registro;


    // ───────────────────────────────────────────
    // IMAGEM
    // ───────────────────────────────────────────
    if (
      mimeType &&
      mimeType.startsWith('image/')
    ) {

      return await extrairTextoImagem(dataURL);
    }


    // ───────────────────────────────────────────
    // PDF
    // ───────────────────────────────────────────
    if (
      mimeType === 'application/pdf' ||
      item.ext?.toUpperCase() === 'PDF'
    ) {

      return await processarPDF(dataURL);
    }


    // ───────────────────────────────────────────
    // ARQUIVO DE TEXTO
    // ───────────────────────────────────────────
    if (
      mimeType === 'text/plain' ||
      item.ext?.toUpperCase() === 'TXT'
    ) {

      try {

        const base64 = dataURL.split(',')[1];

        const decoded = decodeURIComponent(
          escape(atob(base64))
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

  narracaoParada = false;

  const textos = [];

  for (let i = 0; i < itens.length; i++) {

    if (narracaoParada) {
      throw new Error('NARRACAO_CANCELADA');
    }

    const item = itens[i];

    const texto = await processarItemNarracao(
      item,
      i,
      itens.length
    );

    if (texto && texto.trim()) {

      textos.push({
        nome: item.nome,
        texto: texto.trim()
      });
    }
  }

  return textos;
}


// ==========================================================
// 🧹 LIMPAR TEXTO
// ==========================================================

function limparTextoParaNarracao(texto) {

  return texto

    // Remove espaços repetidos
    .replace(/[ \t]+/g, ' ')

    // Remove muitas quebras de linha
    .replace(/\n{3,}/g, '\n\n')

    // Corrige espaços antes de pontuação
    .replace(/\s+([,.!?;:])/g, '$1')

    .trim();
}


// ==========================================================
// 🔊 FALAR TEXTO
// ==========================================================

function obterVozes() {

  return new Promise((resolve) => {

    // Tenta pegar as vozes imediatamente
    let vozes = window.speechSynthesis.getVoices();

    // Se já existem vozes, retorna imediatamente
    if (vozes.length > 0) {
      resolve(vozes);
      return;
    }

    // Se ainda não existem, espera o Chrome carregá-las
    const verificarVozes = () => {

      vozes = window.speechSynthesis.getVoices();

      if (vozes.length > 0) {

        window.speechSynthesis.removeEventListener(
          'voiceschanged',
          verificarVozes
        );

        resolve(vozes);
      }
    };

    window.speechSynthesis.addEventListener(
      'voiceschanged',
      verificarVozes
    );

    // Segurança: tenta novamente depois de 1 segundo
    setTimeout(() => {

      vozes = window.speechSynthesis.getVoices();

      window.speechSynthesis.removeEventListener(
        'voiceschanged',
        verificarVozes
      );

      resolve(vozes);

    }, 1000);
  });
}

async function falarTexto(texto) {

  if (!texto || !texto.trim()) {

    console.warn(
      'Nenhum texto para narrar.'
    );

    return;
  }

  console.log(
    '🔊 Texto que será narrado:',
    texto
  );


  // ======================================================
  // ESPERA O CHROME CARREGAR AS VOZES
  // ======================================================

  const vozes = await obterVozes();


  console.log(
    '🎙️ Vozes disponíveis:',
    vozes.map(
      voz => `${voz.name} - ${voz.lang}`
    )
  );


  // ======================================================
  // PROCURA GOOGLE PORTUGUÊS DO BRASIL
  // ======================================================

  let vozGoogle = vozes.find(
    voz =>
      voz.lang === 'pt-BR' &&
      voz.name
        .toLowerCase()
        .includes(
          'google português do brasil'
        )
  );


  // Se não encontrou a Google específica,
  // procura qualquer voz Google pt-BR
  if (!vozGoogle) {

    vozGoogle = vozes.find(
      voz =>
        voz.lang === 'pt-BR' &&
        voz.name
          .toLowerCase()
          .includes('google')
    );
  }


  // Último fallback:
  // qualquer voz em português brasileiro
  if (!vozGoogle) {

    vozGoogle = vozes.find(
      voz =>
        voz.lang === 'pt-BR'
    );
  }


  if (!vozGoogle) {

    console.error(
      '❌ Nenhuma voz pt-BR foi encontrada.'
    );

    throw new Error(
      'Nenhuma voz pt-BR encontrada.'
    );
  }


  console.log(
    '🎙️ Voz selecionada:',
    vozGoogle.name,
    '|',
    vozGoogle.lang
  );


  // ======================================================
  // CRIA A FALA
  // ======================================================

  const fala =
    new SpeechSynthesisUtterance(texto);


  fala.voice =
    vozGoogle;

  fala.lang =
    'pt-BR';

  fala.rate =
    0.9;

  fala.pitch =
    1;

  fala.volume =
    1;


  // ======================================================
  // EVENTOS
  // ======================================================

  fala.onstart = () => {

    console.log(
      '🔊 Narração começou!'
    );

    atualizarStatusNarracao(
      '🔊 Reproduzindo conteúdo narrado...'
    );
  };


  fala.onend = () => {

    console.log(
      '✅ Narração terminou!'
    );
  };


  fala.onerror = (erro) => {

    console.error(
      '❌ Erro na narração:',
      erro
    );
  };


// ======================================================
// INICIA A NARRAÇÃO
// ======================================================

window.speechSynthesis.resume();

setTimeout(() => {
  window.speechSynthesis.speak(fala);
}, 100);
}
// ==========================================================
// 🔊 INICIAR CONTEÚDO NARRADO
// ==========================================================

async function iniciarConteudoNarrado() {

  if (narracaoExecutando) {

    pararConteudoNarrado();

    return;
  }


  if (!itens.length) {

    mostrarToast(
      '⚠️ Não há arquivos para narrar.'
    );

    return;
  }


  if (!('speechSynthesis' in window)) {

    mostrarToast(
      '⚠️ Seu navegador não suporta narração de texto.'
    );

    return;
  }


  narracaoExecutando = true;
  narracaoParada = false;


  // Muda o botão para "Parar"
  btnConteudoNarrado.innerHTML = `
    <span>⏹️</span>
    <span>Parar narração</span>
  `;


  try {

    atualizarStatusNarracao(
      '🔎 Analisando os arquivos da pasta...'
    );


    // Processa anotações, imagens e PDFs
    const resultados =
      await prepararConteudoNarrado();


    if (narracaoParada) {
      throw new Error('NARRACAO_CANCELADA');
    }


    // Junta todos os textos
    let textoCompleto = '';


    resultados.forEach((resultado) => {

      textoCompleto +=
        resultado.texto + '\n\n';
    });


    textoCompleto =
      limparTextoParaNarracao(
        textoCompleto
      );


    if (!textoCompleto) {

      mostrarToast(
        '⚠️ Não encontramos texto nos arquivos.'
      );

      return;
    }


    atualizarStatusNarracao(
      '✅ Conteúdo identificado. Preparando narração...'
    );


    // Pequeno intervalo para permitir que a interface atualize
    await new Promise(resolve =>
      setTimeout(resolve, 300)
    );


    if (narracaoParada) {
      throw new Error('NARRACAO_CANCELADA');
    }


    // Divide textos muito grandes em partes.
    // Isso evita problemas com limites do navegador.
    const partes =
      dividirTextoEmPartes(textoCompleto);


    for (let i = 0; i < partes.length; i++) {

      if (narracaoParada) {
        throw new Error('NARRACAO_CANCELADA');
      }


      atualizarStatusNarracao(
        `🔊 Narrando parte ${i + 1} de ${partes.length}...`
      );


      await falarTexto(partes[i]);
    }


    if (!narracaoParada) {

      atualizarStatusNarracao(
        '✅ Narração concluída!'
      );

      mostrarToast(
        '🔊 Conteúdo narrado concluído!'
      );
    }


  } catch (erro) {

    if (erro.message === 'NARRACAO_CANCELADA') {

      atualizarStatusNarracao(
        '⏹️ Narração interrompida.'
      );

    } else {

      console.error(
        'Erro no Conteúdo Narrado:',
        erro
      );

      atualizarStatusNarracao(
        '⚠️ Ocorreu um erro ao preparar a narração.'
      );

      mostrarToast(
        '⚠️ Não foi possível gerar a narração.'
      );
    }

  } finally {

    narracaoExecutando = false;


    // Volta o botão ao estado normal
    btnConteudoNarrado.innerHTML = `
      <span>🔊</span>
      <span>Conteúdo narrado</span>
    `;

    narracaoParada = false;
  }
}


// ==========================================================
// ⏹️ PARAR NARRAÇÃO
// ==========================================================

function pararConteudoNarrado() {

  narracaoParada = true;

  speechSynthesis.cancel();

  narracaoExecutando = false;

  if (btnConteudoNarrado) {

    btnConteudoNarrado.innerHTML = `
      <span>🔊</span>
      <span>Conteúdo narrado</span>
    `;
  }

  atualizarStatusNarracao(
    '⏹️ Narração interrompida.'
  );
}


// ==========================================================
// ✂️ DIVIDIR TEXTO GRANDE
// ==========================================================

function dividirTextoEmPartes(texto, limite = 3000) {

  const partes = [];

  let restante = texto.trim();


  while (restante.length > limite) {

    let corte =
      restante.lastIndexOf(
        '.',
        limite
      );


    // Se não encontrou um ponto,
    // procura espaço
    if (corte < limite * 0.5) {

      corte =
        restante.lastIndexOf(
          ' ',
          limite
        );
    }


    // Segurança
    if (corte <= 0) {

      corte = limite;
    }


    partes.push(
      restante.substring(0, corte + 1).trim()
    );


    restante =
      restante.substring(corte + 1).trim();
  }


  if (restante) {

    partes.push(restante);
  }


  return partes;
}


// ── Renderizar lista ───────────────────────────────────────
function renderizar() {

  listaArquivos.innerHTML = '';

  if (itens.length === 0) {

    semArquivos.style.display = 'flex';

    atualizarBotaoNarracao();

    return;
  }

  semArquivos.style.display = 'none';

  itens.forEach((item, idx) => {

    const div = document.createElement('div');

    div.className = 'itemArquivo';
    div.dataset.index = idx;

    const icone =
      item.tipo === 'anotacao'
        ? iconeLapis()
        : iconeArquivoPorExt(item.ext);

    div.innerHTML = `
      <div class="arquivoInfo">
        <div class="arquivoIcone">${icone}</div>

        <div class="arquivoTexto">

          <div class="arquivoNome">
            ${item.nome}
          </div>

          <div class="arquivoMeta">

            <span class="badgeTipo ${
              item.tipo === 'anotacao'
                ? 'anotacao'
                : extParaClasse(item.ext)
            }">

              ${
                item.tipo === 'anotacao'
                  ? 'Anotação'
                  : item.ext || 'Arquivo'
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

    listaArquivos.appendChild(div);
  });


  // Eventos — abrir
  document.querySelectorAll('.btnAbrirArquivo')
    .forEach(btn => {

      btn.addEventListener('click', (e) => {

        e.stopPropagation();

        abrirViewer(
          parseInt(btn.dataset.index)
        );
      });
    });


  // Clique no card também abre
  document.querySelectorAll('.itemArquivo')
    .forEach(div => {

      div.addEventListener('click', (e) => {

        if (
          e.target.closest('.btnOpcoesArquivo') ||
          e.target.closest('.btnAbrirArquivo')
        ) {
          return;
        }

        abrirViewer(
          parseInt(div.dataset.index)
        );
      });
    });


  // Eventos — dropdown opções
  document.querySelectorAll('.btnOpcoesArquivo')
    .forEach(btn => {

      btn.addEventListener('click', (e) => {

        e.stopPropagation();

        dropdownAlvoIndex =
          parseInt(btn.dataset.index);

        const rect =
          btn.getBoundingClientRect();

        dropdownArquivo.style.top =
          `${rect.bottom + 6 + window.scrollY}px`;

        dropdownArquivo.style.left =
          `${rect.right - dropdownArquivo.offsetWidth}px`;

        dropdownArquivo.classList.add('visivel');

        requestAnimationFrame(() => {

          dropdownArquivo.style.left =
            `${rect.right - dropdownArquivo.offsetWidth}px`;

        });
      });
    });


  // Atualiza botão de narração
  atualizarBotaoNarracao();
}


// ── Viewer ─────────────────────────────────────────────────
async function abrirViewer(idx) {

  const item = itens[idx];

  if (!item) return;

  viewerEditandoIndex = null;

  viewerTitulo.textContent = item.nome;

  viewerCorpo.innerHTML = '';

  btnEditarViewer.style.display = 'none';


  if (item.tipo === 'anotacao') {

    // Renderiza anotação como texto
    btnEditarViewer.style.display =
      'inline-flex';

    viewerEditandoIndex = idx;

    const pre =
      document.createElement('div');

    pre.className = 'viewerTexto';

    pre.textContent =
      item.conteudo || '';

    viewerCorpo.appendChild(pre);


  } else {

    // Busca binário no IndexedDB
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

            <polyline points="14 2 14 8 20 8"/>

          </svg>

          <p>
            Arquivo não disponível para visualização.
            <br>
            Possivelmente foi adicionado em outra sessão.
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
        mimeType.startsWith('image/')
      ) {

        const img =
          document.createElement('img');

        img.src = dataURL;

        img.className =
          'viewerImagem';

        viewerCorpo.appendChild(img);


      } else if (
        mimeType === 'application/pdf'
      ) {

        const iframe =
          document.createElement('iframe');

        iframe.src = dataURL;

        iframe.className =
          'viewerPDF';

        iframe.title =
          item.nome;

        viewerCorpo.appendChild(iframe);


      } else {

        // Texto plano ou desconhecido
        // — tenta decodificar
        try {

          const base64 =
            dataURL.split(',')[1];

          const decoded =
            atob(base64);

          const pre =
            document.createElement('pre');

          pre.className =
            'viewerTexto';

          pre.textContent =
            decoded;

          viewerCorpo.appendChild(pre);

        } catch {

          const link =
            document.createElement('a');

          link.href = dataURL;

          link.download =
            item.nome;

          link.className =
            'btnPrimario viewerDownload';

          link.textContent =
            '⬇ Baixar arquivo';

          viewerCorpo.appendChild(link);
        }
      }
    }
  }


  viewerOverlay.classList.add('aberto');

  document.body.style.overflow =
    'hidden';
}


function fecharViewer() {

  viewerOverlay.classList.remove(
    'aberto'
  );

  document.body.style.overflow = '';

  viewerEditandoIndex = null;
}


btnFecharViewer.addEventListener(
  'click',
  fecharViewer
);


viewerOverlay.addEventListener(
  'click',
  (e) => {

    if (e.target === viewerOverlay) {

      fecharViewer();
    }
  }
);


document.addEventListener(
  'keydown',
  (e) => {

    if (e.key === 'Escape') {

      fecharViewer();
    }
  }
);


// ── Botão editar ───────────────────────────────────────────
btnEditarViewer.addEventListener(
  'click',
  () => {

    if (
      viewerEditandoIndex === null
    ) {
      return;
    }

    const item =
      itens[viewerEditandoIndex];

    fecharViewer();

    areaAnotacao.style.display =
      'block';

    tituloAnotacao.value =
      item.nome;

    textoAnotacao.value =
      item.conteudo || '';

    areaAnotacao.dataset.editandoIndex =
      viewerEditandoIndex;

    tituloAnotacao.focus();

    areaAnotacao.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }
);


// ── Ícones SVG ─────────────────────────────────────────────
function iconeArquivoPorExt(ext) {

  const e =
    (ext || '').toUpperCase();


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


  if (e === 'PDF') {

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

        <polyline points="14 2 14 8 20 8"/>

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

      <polyline points="14 2 14 8 20 8"/>

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

      <path d="M12 20h9"/>

      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>

    </svg>
  `;
}


function extParaClasse(ext) {

  const e =
    (ext || '').toUpperCase();


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


  if (e === 'PDF') {
    return 'pdf';
  }


  return 'arquivo';
}


// ── Adicionar arquivo ──────────────────────────────────────
btnAddArquivo.addEventListener(
  'click',
  () => inputArquivo.click()
);


inputArquivo.addEventListener(
  'change',
  async () => {

    const files =
      Array.from(
        inputArquivo.files
      );

    if (!files.length) return;


    for (const file of files) {

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


      // Salva binário no IndexedDB
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

    inputArquivo.value = '';
  }
);


function lerArquivoComoDataURL(file) {

  return new Promise(
    (resolve, reject) => {

      const reader =
        new FileReader();

      reader.onload =
        () => resolve(
          reader.result
        );

      reader.onerror =
        () => reject(
          reader.error
        );

      reader.readAsDataURL(file);
    }
  );
}


// ── Dropdown de arquivo – salvar / excluir ─────────────────
dropdownArquivo
  .querySelectorAll('.dropItem')
  .forEach(btn => {

    btn.addEventListener(
      'click',
      async () => {

        const formato =
          btn.dataset.format;

        const acao =
          btn.dataset.acao;

        const item =
          itens[dropdownAlvoIndex];

        dropdownArquivo.classList.remove(
          'visivel'
        );

        if (!item) return;


        if (acao === 'excluir') {

          if (
            !confirm(
              `Excluir "${item.nome}"? Essa ação não pode ser desfeita.`
            )
          ) {
            return;
          }


          // Remove do IndexedDB
          if (
            item.tipo === 'arquivo'
          ) {

            await dbDelete(
              `${materiaId}_${item.id}`
            );
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

          dropdownAlvoIndex = null;

          return;
        }


        if (acao === 'abrir') {

          const idx =
            dropdownAlvoIndex;

          dropdownAlvoIndex = null;

          abrirViewer(idx);

          return;
        }


        // Download
        if (
          item.tipo === 'anotacao'
        ) {

          const blob =
            new Blob(
              [
                item.conteudo || ''
              ],
              {
                type:
                  'text/plain'
              }
            );

          baixar(
            URL.createObjectURL(blob),
            item.nome + '.txt'
          );

        } else {

          const registro =
            await dbGet(
              `${materiaId}_${item.id}`
            );


          if (registro) {

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

        dropdownAlvoIndex = null;
      }
    );
  });


function baixar(url, nome) {

  const a =
    document.createElement('a');

  a.href = url;

  a.download = nome;

  a.click();
}


// ── Fechar dropdown ao clicar fora ─────────────────────────
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

      dropdownAlvoIndex = null;
    }
  }
);


// ── Criar / editar anotação ────────────────────────────────
btnCriarAnotacao.addEventListener(
  'click',
  () => {

    delete areaAnotacao.dataset
      .editandoIndex;

    areaAnotacao.style.display =
      'block';

    tituloAnotacao.value = '';

    textoAnotacao.value = '';

    tituloAnotacao.focus();

    areaAnotacao.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }
);


function fecharAnotacao() {

  areaAnotacao.style.display =
    'none';

  delete areaAnotacao.dataset
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
      areaAnotacao.dataset
        .editandoIndex;


    if (
      editIdx !== undefined
    ) {

      // Editando existente
      itens[
        parseInt(editIdx)
      ].nome = titulo;

      itens[
        parseInt(editIdx)
      ].conteudo = texto;

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


// ── Persistência ───────────────────────────────────────────
function salvar() {

  localStorage.setItem(
    chave,
    JSON.stringify(itens)
  );


  const materias =
    JSON.parse(
      localStorage.getItem(
        'materias'
      ) || '[]'
    );


  const m =
    materias.find(
      x => x.id == materiaId
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


// ── Toast ──────────────────────────────────────────────────
function mostrarToast(msg) {

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


  toast.textContent = msg;

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


// ── Init ───────────────────────────────────────────────────
abrirDB().then(() => {

  // Cria a interface da narração
  criarInterfaceNarracao();

  // Renderiza arquivos normalmente
  renderizar();

});

window.testarVozJoviClass = function () {

  const teste =
    new SpeechSynthesisUtterance(
      'Olá! Este é um teste de voz do JoviClass.'
    );

  teste.lang = 'pt-BR';
  teste.rate = 0.9;
  teste.pitch = 1;
  teste.volume = 1;

  window.speechSynthesis.cancel();
  window.speechSynthesis.resume();
  window.speechSynthesis.speak(teste);

  console.log(
    'Teste de voz executado.'
  );
};