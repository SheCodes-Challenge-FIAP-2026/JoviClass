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