const overlay = document.getElementById('overlay');
const fecharModal = document.getElementById('fecharModal');
const cancelar = document.getElementById('cancelar');
const criarMateria = document.getElementById('criarMateria');
const nomeMateria = document.getElementById('nomeMateria');
const cardsMaterias = document.getElementById('cardsMaterias');


function abrirFormulario(){
    overlay.style.display = 'flex';
}


function fecharFormulario(){
    overlay.style.display = 'none';
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


