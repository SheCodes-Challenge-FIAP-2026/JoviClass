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

    const card = document.createElement("div");
    card.classList.add("cardComunidade");

    const topoHTML = foto
        ? `<img src="${foto}" alt="foto">`
        : `<span class="semFoto">📚</span>`;

    card.innerHTML = `
        <div class="topoCard">${topoHTML}</div>
        <div class="conteudoCard">
            <h3>${nome}</h3>
            <p>${descricao}</p>
            <div class="infoComunidade">
                <span>📁 ${categoria}</span>
                <span>🌐 ${privacidade}</span>
            </div>
        </div>
    `;

    card.onclick = function () {
        abrirComunidade(id, nome, descricao, foto);
    };

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
   ABRIR COMUNIDADE
===================== */
function abrirComunidade(id, nome, descricao, foto) {
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
        banner.innerHTML = `<span class="semFotoBanner">📚</span>`;
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
        // Montar área de arquivos
        const arquivoArea = document.getElementById("arquivoArea");
        arquivoArea.innerHTML = `
            <h2 class="tituloArquivos">📁 Arquivos</h2>
            <div class="uploadBox">
                <label style="font-size:14px;font-weight:600;color:#333;">Enviar arquivo:</label>
                <input type="file" id="uploadArquivo" style="margin-top:8px;">
            </div>
            <div id="listaArquivos"></div>
        `;

        // Restaurar arquivos salvos
        const listaArquivos = document.getElementById("listaArquivos");
        dados.arquivos.forEach(nome => {
            const item = document.createElement("div");
            item.classList.add("arquivoItem");
            item.innerText = "📄 " + nome;
            listaArquivos.appendChild(item);
        });

        // Listener de upload
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

    // Restaurar mensagens do chat
    dados.mensagens.forEach(texto => {
        adicionarMensagem(texto, false);
    });

    // Guardar referência ativa para envio de mensagens
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

// Enviar com Enter
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
    document.getElementById("paginaComunidade").style.display = "none";
    document.getElementById("listadeComunidades").style.display = "flex";
    document.getElementById("subtituloComunidade").style.display = "block";
    document.getElementById("btnNovaComunidade").style.display = "block";
}