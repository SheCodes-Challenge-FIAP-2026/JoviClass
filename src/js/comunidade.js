/* MENU MOBILE */

const hamburger = document.getElementById("hamburger");

const menuLinks = document.getElementById("menuLinks");

hamburger.addEventListener("click", function () {

    menuLinks.classList.toggle("active");

});


/* FORMULÁRIO */

function abrirFormulario() {

    document.getElementById("formulario").style.display = "block";

}

function fecharAba() {

    document.getElementById("formulario").style.display = "none";

}


/* CRIAR COMUNIDADE */

function criarComunidade() {

    let nome = document.getElementById("nomeComunidade").value;

    let descricao = document.getElementById("descricao").value;

    let categoria = document.getElementById("categoria").value;

    let privacidade = document.getElementById("privacidade").value;


    if (nome == "" || descricao == "") {

        alert("Preencha todos os campos!");

        return;
    }


    let card = document.createElement("div");

    card.classList.add("cardComunidade");


    card.innerHTML = `

        <div class="topoCard">
            📚
        </div>

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

        document.getElementById("listadeComunidades").style.display = "none";

        document.getElementById("paginaComunidade").style.display = "block";

        document.getElementById("tituloComunidade").innerText = nome;

        document.getElementById("descricaoComunidade").innerText = descricao;

        document.getElementById("NomeDiferenciado").innerText = nome;

        document.getElementById("subtituloComunidade").style.display = "none";

        document.getElementById("btnNovaComunidade").style.display = "none";

    };


    document.getElementById("listadeComunidades").appendChild(card);


    document.getElementById("nomeComunidade").value = "";

    document.getElementById("descricao").value = "";


    fecharAba();
}


/* VOLTAR */

function voltarComunidades() {

    document.getElementById("paginaComunidade").style.display = "none";

    document.getElementById("listadeComunidades").style.display = "flex";

    document.getElementById("subtituloComunidade").style.display = "block";

    document.getElementById("btnNovaComunidade").style.display = "block";

}


/* UPLOAD DE ARQUIVO */

const uploadArquivo = document.getElementById("uploadArquivo");


uploadArquivo.addEventListener("change", function () {

    let arquivo = uploadArquivo.files[0];

    if (arquivo) {

        alert("Arquivo enviado com sucesso!");

        let item = document.createElement("div");

        item.classList.add("arquivoItem");

        item.innerHTML = `
            📄 ${arquivo.name}
        `;

        document.getElementById("listaArquivos").appendChild(item);

    }

});


/* CHAT DE MENSAGEM */

function enviarMensagem() {

    let input = document.getElementById("inputMensagem");

    let texto = input.value;


    if (texto == "") {

        return;

    }


    let mensagem = document.createElement("div");

    mensagem.classList.add("mensagem");

    mensagem.innerText = texto;


    document.getElementById("mensagensChat").appendChild(mensagem);


    input.value = "";

}