/* =====================
   MENU MOBILE
===================== */
const hamburger = document.getElementById("hamburger");
const menuLinks = document.getElementById("menuLinks");

hamburger.addEventListener("click", function () {
    menuLinks.classList.toggle("active");
});


/* =====================
   FOTO DA COMUNIDADE
===================== */
let fotoDataURL = null;

document.getElementById("inputFoto").addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        fotoDataURL = e.target.result;

        const preview = document.getElementById("fotoPreview");
        const placeholder = document.getElementById("fotoPlaceholder");

        preview.src = fotoDataURL;
        preview.style.display = "block";
        placeholder.style.display = "none";
    };
    reader.readAsDataURL(file);
});


/* =====================
   FORMULÁRIO
===================== */
function abrirFormulario() {
    document.getElementById("formulario").style.display = "block";
    document.getElementById("overlay").style.display = "block";
}

function fecharAba() {
    document.getElementById("formulario").style.display = "none";
    document.getElementById("overlay").style.display = "none";
}


/* =====================
   SALAS PADRÃO
===================== */
const salasPadrao = [
    { icone: "💬", nome: "Geral", desc: "Conversa livre entre os membros", tipo: "chat" },
    { icone: "📚", nome: "Estudos", desc: "Dúvidas e discussões sobre conteúdo", tipo: "chat" },
    { icone: "📁", nome: "Arquivos", desc: "Compartilhe materiais e documentos", tipo: "arquivos" },
    { icone: "📢", nome: "Avisos", desc: "Comunicados importantes da comunidade", tipo: "chat" },
];

// Guarda mensagens e arquivos por sala e por comunidade
const dadosSalas = {};

// Guarda dados completos de cada comunidade
const dadosComunidades = {};

// Comunidade ativa no momento
let comunidadeAtiva = null;


/* =====================
   CRIAR COMUNIDADE
===================== */
function criarComunidade() {
    const nome = document.getElementById("nomeComunidade").value.trim();
    const descricao = document.getElementById("descricao").value.trim();
    const categoria = document.getElementById("categoria").value;
    const privacidade = document.getElementById("privacidade").value;
    const foto = fotoDataURL;

    if (!nome || !descricao) {
        alert("Preencha todos os campos!");
        return;
    }

    // ID único para a comunidade
    const id = "com_" + Date.now();
    dadosSalas[id] = {};
    salasPadrao.forEach(s => {
        dadosSalas[id][s.nome] = { mensagens: [], arquivos: [] };
    });

    // Guardar dados da comunidade
    dadosComunidades[id] = { id, nome, descricao, categoria, privacidade, foto, convidados: [] };

    const card = document.createElement("div");
    card.classList.add("cardComunidade");
    card.dataset.id = id;

    const topoHTML = foto
        ? `<img src="${foto}" alt="foto">`
        : `<span class="semFoto"></span>`;

    card.innerHTML = `
        <div class="topoCard">${topoHTML}</div>
        <div class="conteudoCard">
            <div class="cabecalhoCard">
                <h3>${nome}</h3>
                <button class="btnTresPontosCard" onclick="abrirMenuOpcoesCard(event, '${id}')" title="Opções">
                    <span></span><span></span><span></span>
                </button>
            </div>
            <p>${descricao}</p>
            <div class="infoComunidade">
                <span>📁 ${categoria}</span>
                <span>🌐 ${privacidade}</span>
            </div>
        </div>
    `;

    // Clicar no card (exceto no botão de opções) abre a comunidade
    card.addEventListener("click", function (e) {
        if (e.target.closest(".btnTresPontosCard")) return;
        abrirComunidade(id, nome, descricao, foto);
    });

    document.getElementById("listadeComunidades").appendChild(card);

    // Limpar form
    document.getElementById("nomeComunidade").value = "";
    document.getElementById("descricao").value = "";
    document.getElementById("fotoPreview").style.display = "none";
    document.getElementById("fotoPlaceholder").style.display = "flex";
    fotoDataURL = null;

    fecharAba();
}


/* =====================
   MENU TRÊS PONTINHOS — CARD (lista de comunidades)
===================== */
function abrirMenuOpcoesCard(event, id) {
    event.stopPropagation();
    comunidadeAtiva = id;

    const menu = document.getElementById("menuOpcoes");
    const overlay = document.getElementById("overlayMenu");

    // Posicionar próximo ao botão clicado
    const btn = event.currentTarget;
    const rect = btn.getBoundingClientRect();

    menu.style.top = (rect.bottom + window.scrollY + 6) + "px";
    menu.style.left = (rect.left + window.scrollX - 120) + "px";
    menu.style.display = "block";
    overlay.style.display = "block";
}

/* MENU TRÊS PONTINHOS — PÁGINA DA COMUNIDADE */
function abrirMenuOpcoesPagina(event) {
    event.stopPropagation();

    const menu = document.getElementById("menuOpcoes");
    const overlay = document.getElementById("overlayMenu");

    const btn = event.currentTarget;
    const rect = btn.getBoundingClientRect();

    menu.style.top = (rect.bottom + window.scrollY + 6) + "px";
    menu.style.left = (rect.left + window.scrollX - 140) + "px";
    menu.style.display = "block";
    overlay.style.display = "block";
}

function fecharMenuOpcoes() {
    document.getElementById("menuOpcoes").style.display = "none";
    document.getElementById("overlayMenu").style.display = "none";
}

function acaoMenuOpcoes(acao) {
    fecharMenuOpcoes();

    if (!comunidadeAtiva) return;
    const com = dadosComunidades[comunidadeAtiva];
    if (!com) return;

    if (acao === "convidar") {
        abrirModalConvidar(comunidadeAtiva);
    } else if (acao === "editar") {
        alert("Funcionalidade de edição em breve!");
    } else if (acao === "excluir") {
        if (confirm(`Tem certeza que deseja excluir a comunidade "${com.nome}"?`)) {
            excluirComunidade(comunidadeAtiva);
        }
    }
}

function excluirComunidade(id) {
    // Remover da lista visual
    const card = document.querySelector(`.cardComunidade[data-id="${id}"]`);
    if (card) card.remove();

    // Remover dos dados
    delete dadosComunidades[id];
    delete dadosSalas[id];

    // Se estava na página da comunidade, voltar
    if (document.getElementById("paginaComunidade").style.display !== "none") {
        voltarComunidades();
    }

    comunidadeAtiva = null;
}


/* =====================
   MODAL CONVIDAR
===================== */
function abrirModalConvidar(id) {
    comunidadeAtiva = id;
    const com = dadosComunidades[id];

    // Gerar link de convite simulado
    const link = `https://joviclass.app/convite/${id}`;
    document.getElementById("inputLinkConvite").value = link;
    document.getElementById("statusCopiar").textContent = "";
    document.getElementById("emailConvite").value = "";

    // Mostrar convidados já enviados
    renderizarConvidados(id);

    document.getElementById("modalConvidar").style.display = "flex";
    document.getElementById("overlay").style.display = "block";
}

function fecharModalConvidar() {
    document.getElementById("modalConvidar").style.display = "none";
    document.getElementById("overlay").style.display = "none";
}

// Fechar modal ao clicar no overlay (sobrescreve fecharAba para lidar com os dois modais)
document.getElementById("overlay").addEventListener("click", function () {
    fecharAba();
    fecharModalConvidar();
});

function copiarLink() {
    const input = document.getElementById("inputLinkConvite");
    input.select();
    input.setSelectionRange(0, 99999);

    try {
        navigator.clipboard.writeText(input.value).then(() => {
            mostrarStatusCopiar("✅ Link copiado!");
        }).catch(() => {
            document.execCommand("copy");
            mostrarStatusCopiar("✅ Link copiado!");
        });
    } catch (e) {
        document.execCommand("copy");
        mostrarStatusCopiar("✅ Link copiado!");
    }
}

function mostrarStatusCopiar(msg) {
    const status = document.getElementById("statusCopiar");
    status.textContent = msg;
    setTimeout(() => { status.textContent = ""; }, 3000);
}

function enviarConviteEmail() {
    const emailInput = document.getElementById("emailConvite");
    const email = emailInput.value.trim();

    if (!email || !email.includes("@")) {
        alert("Digite um e-mail válido.");
        return;
    }

    if (!comunidadeAtiva) return;
    const com = dadosComunidades[comunidadeAtiva];
    if (!com) return;

    // Verificar duplicata
    if (com.convidados.find(c => c.email === email)) {
        alert("Este e-mail já recebeu um convite.");
        return;
    }

    com.convidados.push({ email, status: "pendente" });
    emailInput.value = "";
    renderizarConvidados(comunidadeAtiva);
}

function renderizarConvidados(id) {
    const com = dadosComunidades[id];
    const container = document.getElementById("convidadosItens");
    container.innerHTML = "";

    if (!com || com.convidados.length === 0) {
        document.getElementById("listaConvidados").style.display = "none";
        return;
    }

    document.getElementById("listaConvidados").style.display = "block";

    com.convidados.forEach((c, idx) => {
        const item = document.createElement("div");
        item.classList.add("convidadoItem");
        item.innerHTML = `
            <div class="convidadoEmail">
                <span class="iconEmail">✉️</span>
                <span>${c.email}</span>
            </div>
            <div class="convidadoAcoes">
                <span class="badgePendente">Pendente</span>
                <button class="btnRemoverConvite" onclick="removerConvite('${id}', ${idx})" title="Remover convite">✕</button>
            </div>
        `;
        container.appendChild(item);
    });
}

function removerConvite(id, idx) {
    dadosComunidades[id].convidados.splice(idx, 1);
    renderizarConvidados(id);
}


/* =====================
   ABRIR COMUNIDADE
===================== */
function abrirComunidade(id, nome, descricao, foto) {
    comunidadeAtiva = id;

    document.getElementById("listadeComunidades").style.display = "none";
    document.getElementById("paginaComunidade").style.display = "block";
    document.getElementById("salaInterna").style.display = "none";
    document.getElementById("salasArea").style.display = "block";
    document.getElementById("tituloComunidade").innerText = nome;
    document.getElementById("descricaoComunidade").innerText = descricao;
    document.getElementById("NomeDiferenciado").innerText = nome;
    document.getElementById("subtituloComunidade").style.display = "none";
    document.getElementById("btnNovaComunidade").style.display = "none";

    // Banner
    const banner = document.getElementById("bannerComunidade");
    if (foto) {
        banner.innerHTML = `<img src="${foto}" alt="banner">`;
    } else {
        banner.innerHTML = `<span class="semFotoBanner"></span>`;
    }

    // Montar lista de salas
    const listaSalas = document.getElementById("listaSalas");
    listaSalas.innerHTML = "";

    salasPadrao.forEach(sala => {
        const item = document.createElement("div");
        item.classList.add("salaItem");
        item.innerHTML = `
            <div class="salaInfo">
                <div class="salaIcone">${sala.icone}</div>
                <div>
                    <div class="salaNome">${sala.nome}</div>
                    <div class="salaDesc">${sala.desc}</div>
                </div>
            </div>
            <div class="salaEntrar">Entrar →</div>
        `;
        item.onclick = function () {
            abrirSala(id, sala);
        };
        listaSalas.appendChild(item);
    });
}


/* =====================
   ABRIR SALA
===================== */
function abrirSala(comId, sala) {
    document.getElementById("salasArea").style.display = "none";
    document.getElementById("salaInterna").style.display = "block";
    document.getElementById("nomeSalaAtual").innerText = sala.icone + " " + sala.nome;

    // Limpar áreas
    document.getElementById("arquivoArea").innerHTML = "";
    document.getElementById("mensagensChat").innerHTML = "";

    const dados = dadosSalas[comId][sala.nome];

    if (sala.tipo === "arquivos") {
        const arquivoArea = document.getElementById("arquivoArea");
        arquivoArea.innerHTML = `
            <h2 class="tituloArquivos">📁 Arquivos</h2>
            <div class="uploadBox">
                <label style="font-size:14px;font-weight:600;color:#333;">Enviar arquivo:</label>
                <input type="file" id="uploadArquivo" style="margin-top:8px;">
            </div>
            <div id="listaArquivos"></div>
        `;

        const listaArquivos = document.getElementById("listaArquivos");
        dados.arquivos.forEach(nome => {
            const item = document.createElement("div");
            item.classList.add("arquivoItem");
            item.innerText = "📄 " + nome;
            listaArquivos.appendChild(item);
        });

        document.getElementById("uploadArquivo").addEventListener("change", function () {
            const arquivo = this.files[0];
            if (!arquivo) return;

            dados.arquivos.push(arquivo.name);

            const item = document.createElement("div");
            item.classList.add("arquivoItem");
            item.innerText = "📄 " + arquivo.name;
            document.getElementById("listaArquivos").appendChild(item);

            alert("Arquivo enviado com sucesso!");
            this.value = "";
        });
    }

    dados.mensagens.forEach(texto => {
        adicionarMensagem(texto, false);
    });

    window._salaAtiva = { comId, salaNome: sala.nome };
}


/* =====================
   ENVIAR MENSAGEM
===================== */
function enviarMensagem() {
    const input = document.getElementById("inputMensagem");
    const texto = input.value.trim();
    if (!texto) return;

    const { comId, salaNome } = window._salaAtiva;
    dadosSalas[comId][salaNome].mensagens.push(texto);

    adicionarMensagem(texto, true);
    input.value = "";
}

function adicionarMensagem(texto, rolar) {
    const chat = document.getElementById("mensagensChat");
    const msg = document.createElement("div");
    msg.classList.add("mensagem");
    msg.innerText = texto;
    chat.appendChild(msg);
    if (rolar) chat.scrollTop = chat.scrollHeight;
}

document.getElementById("inputMensagem").addEventListener("keydown", function (e) {
    if (e.key === "Enter") enviarMensagem();
});


/* =====================
   VOLTAR
===================== */
function voltarSalas() {
    document.getElementById("salaInterna").style.display = "none";
    document.getElementById("salasArea").style.display = "block";
}

function voltarComunidades() {
    comunidadeAtiva = null;
    document.getElementById("paginaComunidade").style.display = "none";
    document.getElementById("listadeComunidades").style.display = "flex";
    document.getElementById("subtituloComunidade").style.display = "block";
    document.getElementById("btnNovaComunidade").style.display = "block";
}