// ===========================
//  paginaMateria.js
// ===========================

// ── Parâmetros de URL ──────────────────────────────────────
const params  = new URLSearchParams(window.location.search);
const materiaId   = params.get('id');
const materiaNome = params.get('nome') || 'Matéria';

document.getElementById('tituloPagina').textContent = materiaNome;

// ── Elementos ──────────────────────────────────────────────
const listaArquivos    = document.getElementById('listaArquivos');
const semArquivos      = document.getElementById('semArquivos');
const inputArquivo     = document.getElementById('inputArquivo');
const btnAddArquivo    = document.getElementById('btnAddArquivo');
const btnCriarAnotacao = document.getElementById('btnCriarAnotacao');
const areaAnotacao     = document.getElementById('areaAnotacao');
const btnFecharAnotacao = document.getElementById('btnFecharAnotacao');
const btnCancelarAnotacao = document.getElementById('btnCancelarAnotacao');
const btnSalvarAnotacao = document.getElementById('btnSalvarAnotacao');
const tituloAnotacao   = document.getElementById('tituloAnotacao');
const textoAnotacao    = document.getElementById('textoAnotacao');
const dropdownArquivo  = document.getElementById('dropdownArquivo');
const hamburger        = document.getElementById('hamburger');
const menuLinks        = document.getElementById('menuLinks');

// ── Hamburger ──────────────────────────────────────────────
hamburger.addEventListener('click', () => menuLinks.classList.toggle('active'));

// ── Estado ─────────────────────────────────────────────────
const chave = `arquivos_${materiaId}`;
let itens = JSON.parse(localStorage.getItem(chave) || '[]');
let dropdownAlvoIndex = null;

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

    const icone = item.tipo === 'anotacao' ? iconeLapis() : iconeArquivo(item.ext);

    div.innerHTML = `
      <div class="arquivoInfo">
        <div class="arquivoIcone">${icone}</div>
        <div class="arquivoTexto">
          <div class="arquivoNome">${item.nome}</div>
          <div class="arquivoMeta">
            <span class="badgeTipo ${item.tipo === 'anotacao' ? 'anotacao' : 'arquivo'}">${item.tipo === 'anotacao' ? 'Anotação' : item.ext || 'Arquivo'}</span>
            &nbsp;${item.data}
          </div>
        </div>
      </div>
      <button class="btnOpcoesArquivo" data-index="${idx}" title="Opções">&#8942;</button>
    `;

    listaArquivos.appendChild(div);
  });

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

// ── Ícones SVG ─────────────────────────────────────────────
function iconeArquivo(ext) {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
}

function iconeLapis() {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`;
}

// ── Adicionar arquivo ──────────────────────────────────────
btnAddArquivo.addEventListener('click', () => inputArquivo.click());

inputArquivo.addEventListener('change', () => {
  const files = Array.from(inputArquivo.files);
  if (!files.length) return;

  files.forEach(file => {
    const ext = file.name.split('.').pop().toUpperCase();
    itens.push({
      nome: file.name,
      tipo: 'arquivo',
      ext,
      data: new Date().toLocaleDateString('pt-BR'),
      dataFile: null   // não armazenamos binário no localStorage
    });
  });

  salvar();
  renderizar();
  mostrarToast(`📎 ${files.length} arquivo(s) adicionado(s)`);
  inputArquivo.value = '';
});

// ── Dropdown de arquivo – salvar ───────────────────────────
dropdownArquivo.querySelectorAll('.dropItem').forEach(btn => {
  btn.addEventListener('click', () => {
    const formato = btn.dataset.format;
    const item = itens[dropdownAlvoIndex];
    dropdownArquivo.classList.remove('visivel');

    if (!item) return;

    // Simula download (em produção real geraria o arquivo)
    const fakeBlob = new Blob([`Conteúdo simulado de "${item.nome}"`], { type: 'text/plain' });
    const url = URL.createObjectURL(fakeBlob);
    const a   = document.createElement('a');
    a.href    = url;
    a.download = item.nome.replace(/\.[^.]+$/, '') + (formato === 'original' ? '' : `.${formato}`);
    a.click();
    URL.revokeObjectURL(url);

    mostrarToast(`💾 Salvo como ${formato.toUpperCase()}`);
    dropdownAlvoIndex = null;
  });
});

// ── Fechar dropdown ao clicar fora ─────────────────────────
document.addEventListener('click', (e) => {
  if (!dropdownArquivo.contains(e.target) && !e.target.classList.contains('btnOpcoesArquivo')) {
    dropdownArquivo.classList.remove('visivel');
    dropdownAlvoIndex = null;
  }
});

// ── Criar anotação ─────────────────────────────────────────
btnCriarAnotacao.addEventListener('click', () => {
  areaAnotacao.style.display = 'block';
  tituloAnotacao.value = '';
  textoAnotacao.value  = '';
  tituloAnotacao.focus();
  areaAnotacao.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

function fecharAnotacao() {
  areaAnotacao.style.display = 'none';
}

btnFecharAnotacao.addEventListener('click', fecharAnotacao);
btnCancelarAnotacao.addEventListener('click', fecharAnotacao);

btnSalvarAnotacao.addEventListener('click', () => {
  const titulo = tituloAnotacao.value.trim() || 'Anotação';
  const texto  = textoAnotacao.value.trim();

  if (!texto) {
    textoAnotacao.focus();
    return;
  }

  itens.push({
    nome: titulo,
    tipo: 'anotacao',
    ext: null,
    conteudo: texto,
    data: new Date().toLocaleDateString('pt-BR')
  });

  salvar();
  renderizar();
  fecharAnotacao();
  mostrarToast('📝 Anotação salva!');
});

// ── Persistência ───────────────────────────────────────────
function salvar() {
  localStorage.setItem(chave, JSON.stringify(itens));

  // Atualiza contador na lista de matérias
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
renderizar();