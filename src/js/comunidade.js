function abrirFormulario(){

    document.getElementById("formulario").style.display = "block";

}

function fecharAba(){

    document.getElementById("formulario").style.display = "none";

}

function criarComunidade(){

    // PEGAR VALORES
    let nome = document.getElementById("nomeComunidade").value;

    let descricao = document.getElementById("descricao").value;

    let categoria = document.getElementById("categoria").value;

    let privacidade = document.getElementById("privacidade").value;

    // CRIAR CARD
    let card = document.createElement("div");

    card.classList.add("cardComunidade");

    // CONTEÚDO DO CARD
    card.innerHTML = `
        <h3>${nome}</h3>

        <p>${descricao}</p>

        <div class="infoComunidade">

            <span>${categoria}</span>

            <span>${privacidade}</span>

        </div>
    `;

    // ADICIONAR CARD
    document
        .getElementById("listadeComunidades")
        .appendChild(card);

    // LIMPAR CAMPOS
    document.getElementById("nomeComunidade").value = "";

    document.getElementById("descricao").value = "";

    // FECHAR FORMULÁRIO
    fecharAba();

}