// ===========================
//  materias.js
// ===========================

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
let corSelecionada = '#1466ff'; // padrão

// Gera a cor de fundo do ícone (versão clara da cor principal)
function corFundo(hex) {
  // Converte hex para RGB e clareia misturando com branco (15% opacidade)
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  const mix = (c) => Math.round(c * 0.15 + 255 * 0.85);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

// ── Hamburger ──────────────────────────────────────────────
hamburger.addEventListener('click', () => {
  menuLinks.classList.toggle('active');
});

// ── Seletor de cores ───────────────────────────────────────
seletorCores.addEventListener('click', (e) => {
  const btn = e.target.closest('.btnCor');
  if (!btn) return;

  document.querySelectorAll('.btnCor').forEach(b => b.classList.remove('selecionada'));
  btn.classList.add('selecionada');
  corSelecionada = btn.dataset.cor;
});

// ── Renderizar cards ───────────────────────────────────────
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

// ── Dropdown de opções do card ─────────────────────────────
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

// ── Ações do dropdown ──────────────────────────────────────
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

  // Pré-seleciona a cor atual da matéria
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

// ── Modal Nova / Renomear ──────────────────────────────────
function abrirFormulario() {
  editandoId = null;
  inputNome.value = '';
  tituloModal.textContent = 'Nova Matéria';
  btnCriar.textContent = 'Criar Matéria';

  // Reseta para a cor padrão
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

// ── Persistência ───────────────────────────────────────────
function salvarMaterias() {
  localStorage.setItem('materias', JSON.stringify(materias));
}

// ── Toast ──────────────────────────────────────────────────
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

// ── Init ───────────────────────────────────────────────────
renderizarCards();