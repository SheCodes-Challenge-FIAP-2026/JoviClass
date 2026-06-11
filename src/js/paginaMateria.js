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
    req.onsuccess = (e) => { db = e.target.result; resolve(db); };
    req.onerror   = () => reject(req.error);
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
    const tx  = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(chaveId);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
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

// ── Renderizar lista ───────────────────────────────────────
function renderizar() {
  listaArquivos.innerHTML = '';

  if (itens.length === 0) {
    semArquivos.style.display = 'flex';
    return;
  }
  semArquivos.style.display = 'none';

  itens.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'itemArquivo';
    div.dataset.index = idx;

    const icone = item.tipo === 'anotacao' ? iconeLapis() : iconeArquivoPorExt(item.ext);

    div.innerHTML = `
      <div class="arquivoInfo">
        <div class="arquivoIcone">${icone}</div>
        <div class="arquivoTexto">
          <div class="arquivoNome">${item.nome}</div>
          <div class="arquivoMeta">
            <span class="badgeTipo ${item.tipo === 'anotacao' ? 'anotacao' : extParaClasse(item.ext)}">${item.tipo === 'anotacao' ? 'Anotação' : item.ext || 'Arquivo'}</span>
            &nbsp;${item.data}
          </div>
        </div>
      </div>
      <div class="itemAcoes">
        <button class="btnAbrirArquivo" data-index="${idx}" title="Abrir">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          Abrir
        </button>
        <button class="btnOpcoesArquivo" data-index="${idx}" title="Opções">&#8942;</button>
      </div>
    `;

    listaArquivos.appendChild(div);
  });

  // Eventos — abrir
  document.querySelectorAll('.btnAbrirArquivo').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      abrirViewer(parseInt(btn.dataset.index));
    });
  });

  // Clique no card também abre
  document.querySelectorAll('.itemArquivo').forEach(div => {
    div.addEventListener('click', (e) => {
      if (e.target.closest('.btnOpcoesArquivo') || e.target.closest('.btnAbrirArquivo')) return;
      abrirViewer(parseInt(div.dataset.index));
    });
  });

  // Eventos — dropdown opções
  document.querySelectorAll('.btnOpcoesArquivo').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownAlvoIndex = parseInt(btn.dataset.index);
      const rect = btn.getBoundingClientRect();
      dropdownArquivo.style.top  = `${rect.bottom + 6 + window.scrollY}px`;
      dropdownArquivo.style.left = `${rect.right - dropdownArquivo.offsetWidth}px`;
      dropdownArquivo.classList.add('visivel');
      requestAnimationFrame(() => {
        dropdownArquivo.style.left = `${rect.right - dropdownArquivo.offsetWidth}px`;
      });
    });
  });
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
    btnEditarViewer.style.display = 'inline-flex';
    viewerEditandoIndex = idx;

    const pre = document.createElement('div');
    pre.className = 'viewerTexto';
    pre.textContent = item.conteudo || '';
    viewerCorpo.appendChild(pre);

  } else {
    // Busca binário no IndexedDB
    const registro = await dbGet(`${materiaId}_${item.id}`);

    if (!registro) {
      viewerCorpo.innerHTML = `
        <div class="viewerSemDados">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <p>Arquivo não disponível para visualização.<br>Possivelmente foi adicionado em outra sessão.</p>
        </div>`;
    } else {
      const { dataURL, mimeType } = registro;

      if (mimeType && mimeType.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = dataURL;
        img.className = 'viewerImagem';
        viewerCorpo.appendChild(img);

      } else if (mimeType === 'application/pdf') {
        const iframe = document.createElement('iframe');
        iframe.src = dataURL;
        iframe.className = 'viewerPDF';
        iframe.title = item.nome;
        viewerCorpo.appendChild(iframe);

      } else {
        // Texto plano ou desconhecido — tenta decodificar
        try {
          const base64 = dataURL.split(',')[1];
          const decoded = atob(base64);
          const pre = document.createElement('pre');
          pre.className = 'viewerTexto';
          pre.textContent = decoded;
          viewerCorpo.appendChild(pre);
        } catch {
          const link = document.createElement('a');
          link.href = dataURL;
          link.download = item.nome;
          link.className = 'btnPrimario viewerDownload';
          link.textContent = '⬇ Baixar arquivo';
          viewerCorpo.appendChild(link);
        }
      }
    }
  }

  viewerOverlay.classList.add('aberto');
  document.body.style.overflow = 'hidden';
}

function fecharViewer() {
  viewerOverlay.classList.remove('aberto');
  document.body.style.overflow = '';
  viewerEditandoIndex = null;
}

btnFecharViewer.addEventListener('click', fecharViewer);

viewerOverlay.addEventListener('click', (e) => {
  if (e.target === viewerOverlay) fecharViewer();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') fecharViewer();
});

// Botão editar (só para anotações)
btnEditarViewer.addEventListener('click', () => {
  if (viewerEditandoIndex === null) return;
  const item = itens[viewerEditandoIndex];
  fecharViewer();
  // Abre área de anotação já preenchida
  areaAnotacao.style.display = 'block';
  tituloAnotacao.value = item.nome;
  textoAnotacao.value  = item.conteudo || '';
  areaAnotacao.dataset.editandoIndex = viewerEditandoIndex;
  tituloAnotacao.focus();
  areaAnotacao.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// ── Ícones SVG ─────────────────────────────────────────────
function iconeArquivoPorExt(ext) {
  const e = (ext || '').toUpperCase();
  if (['JPG','JPEG','PNG','GIF','WEBP','SVG'].includes(e)) {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
  }
  if (e === 'PDF') {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/></svg>`;
  }
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
}

function iconeLapis() {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`;
}

function extParaClasse(ext) {
  const e = (ext || '').toUpperCase();
  if (['JPG','JPEG','PNG','GIF','WEBP','SVG'].includes(e)) return 'imagem';
  if (e === 'PDF') return 'pdf';
  return 'arquivo';
}

// ── Adicionar arquivo ──────────────────────────────────────
btnAddArquivo.addEventListener('click', () => inputArquivo.click());

inputArquivo.addEventListener('change', async () => {
  const files = Array.from(inputArquivo.files);
  if (!files.length) return;

  for (const file of files) {
    const ext      = file.name.split('.').pop().toUpperCase();
    const id       = Date.now() + Math.random();
    const dataURL  = await lerArquivoComoDataURL(file);

    // Salva binário no IndexedDB
    await dbPut({
      chaveId: `${materiaId}_${id}`,
      dataURL,
      mimeType: file.type
    });

    itens.push({
      id,
      nome: file.name,
      tipo: 'arquivo',
      ext,
      mimeType: file.type,
      data: new Date().toLocaleDateString('pt-BR')
    });
  }

  salvar();
  renderizar();
  mostrarToast(`📎 ${files.length} arquivo(s) adicionado(s)`);
  inputArquivo.value = '';
});

function lerArquivoComoDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// ── Dropdown de arquivo – salvar / excluir ─────────────────
dropdownArquivo.querySelectorAll('.dropItem').forEach(btn => {
  btn.addEventListener('click', async () => {
    const formato = btn.dataset.format;
    const acao    = btn.dataset.acao;
    const item    = itens[dropdownAlvoIndex];
    dropdownArquivo.classList.remove('visivel');
    if (!item) return;

    if (acao === 'excluir') {
      if (!confirm(`Excluir "${item.nome}"? Essa ação não pode ser desfeita.`)) return;
      // Remove do IndexedDB se for arquivo
      if (item.tipo === 'arquivo') {
        await dbDelete(`${materiaId}_${item.id}`);
      }
      itens.splice(dropdownAlvoIndex, 1);
      salvar();
      renderizar();
      mostrarToast('🗑️ Item excluído');
      dropdownAlvoIndex = null;
      return;
    }

    if (acao === 'abrir') {
      const idx = dropdownAlvoIndex;
      dropdownAlvoIndex = null;
      abrirViewer(idx);
      return;
    }

    // Download
    if (item.tipo === 'anotacao') {
      const blob = new Blob([item.conteudo || ''], { type: 'text/plain' });
      baixar(URL.createObjectURL(blob), item.nome + '.txt');
    } else {
      const registro = await dbGet(`${materiaId}_${item.id}`);
      if (registro) {
        baixar(registro.dataURL, item.nome);
      } else {
        mostrarToast('⚠️ Arquivo não encontrado no armazenamento');
      }
    }

    mostrarToast('💾 Download iniciado');
    dropdownAlvoIndex = null;
  });
});

function baixar(url, nome) {
  const a   = document.createElement('a');
  a.href    = url;
  a.download = nome;
  a.click();
}

// ── Fechar dropdown ao clicar fora ─────────────────────────
document.addEventListener('click', (e) => {
  if (!dropdownArquivo.contains(e.target) && !e.target.classList.contains('btnOpcoesArquivo')) {
    dropdownArquivo.classList.remove('visivel');
    dropdownAlvoIndex = null;
  }
});

// ── Criar / editar anotação ────────────────────────────────
btnCriarAnotacao.addEventListener('click', () => {
  delete areaAnotacao.dataset.editandoIndex;
  areaAnotacao.style.display = 'block';
  tituloAnotacao.value = '';
  textoAnotacao.value  = '';
  tituloAnotacao.focus();
  areaAnotacao.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

function fecharAnotacao() {
  areaAnotacao.style.display = 'none';
  delete areaAnotacao.dataset.editandoIndex;
}

btnFecharAnotacao.addEventListener('click', fecharAnotacao);
btnCancelarAnotacao.addEventListener('click', fecharAnotacao);

btnSalvarAnotacao.addEventListener('click', () => {
  const titulo = tituloAnotacao.value.trim() || 'Anotação';
  const texto  = textoAnotacao.value.trim();

  if (!texto) { textoAnotacao.focus(); return; }

  const editIdx = areaAnotacao.dataset.editandoIndex;

  if (editIdx !== undefined) {
    // Editando existente
    itens[parseInt(editIdx)].nome     = titulo;
    itens[parseInt(editIdx)].conteudo = texto;
    mostrarToast('✏️ Anotação atualizada!');
  } else {
    itens.push({
      id: Date.now(),
      nome: titulo,
      tipo: 'anotacao',
      ext: null,
      conteudo: texto,
      data: new Date().toLocaleDateString('pt-BR')
    });
    mostrarToast('📝 Anotação salva!');
  }

  salvar();
  renderizar();
  fecharAnotacao();
});

// ── Persistência ───────────────────────────────────────────
function salvar() {
  localStorage.setItem(chave, JSON.stringify(itens));
  const materias = JSON.parse(localStorage.getItem('materias') || '[]');
  const m = materias.find(x => x.id == materiaId);
  if (m) {
    m.arquivos = itens.length;
    localStorage.setItem('materias', JSON.stringify(materias));
  }
}

// ── Toast ──────────────────────────────────────────────────
function mostrarToast(msg) {
  let toast = document.getElementById('toastGlobal');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toastGlobal';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ── Init ───────────────────────────────────────────────────
abrirDB().then(renderizar);