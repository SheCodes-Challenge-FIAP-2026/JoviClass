const overlay = document.getElementById('overlay');
const fecharModal = document.getElementById('fecharModal');
const cancelar = document.getElementById('btnCancelar');
const criarMateria = document.getElementById('btnCriarMateria');
const nomeMateria = document.getElementById('nomeMateria');
const cardsMaterias = document.getElementById('cardsMaterias');

hamburger.addEventListener("click", () => {
    menuLinks.classList.toggle("active");
});

function abrirFormulario(){
    overlay.classList.add("aberto");
}


function fecharFormulario(){
    overlay.classList.remove("aberto");
}


fecharModal.addEventListener('click', fecharFormulario);
cancelar.addEventListener('click', fecharFormulario);




criarMateria.addEventListener('click', () => {
    const nome = nomeMateria.value.trim();

    if(nome === ''){
        alert('Digite um nome para a matéria');
        return;
    }

    const card = document.createElement('a');
    card.classList.add('cardMateria');
    card.href = `./paginaMateria.html?materia=${encodeURIComponent(nome)}`;

    card.innerHTML = `
        <img src="../assets/img/imgPasta.png" alt="Pasta">
        <h3>${nome}</h3>
        <p>Criada agora</p>
        <button class="btnExcluir">Excluir</button>
    `;


    const btnExcluir = card.querySelector('.btnExcluir');
    btnExcluir.addEventListener('click', () => {
        const resposta = prompt('Deseja excluir a matéria? Digite sim ou não:');


        if (resposta === null) {
            return;
        } else if (resposta.trim().toLowerCase() === 'sim') {
            card.remove();
        } else {
            alert('A matéria não foi excluída.');
        }
    });


    cardsMaterias.appendChild(card);
    fecharFormulario();
    alert(`Matéria "${nome}" criada com sucesso!`);




});


