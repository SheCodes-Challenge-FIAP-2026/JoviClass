const hamburger = document.getElementById("hamburger");
const menuLinks = document.getElementById("menuLinks");
const overlay = document.getElementById("overlay");

const openOverlayBtn = document.getElementById("confirmBtn");
const closeOverlayBtns = [document.getElementById("cancelBtn"), document.getElementById("okBtn")];

hamburger.addEventListener("click", () => menuLinks.classList.toggle("active"));

const toggleOverlay = (show) => overlay.classList.toggle("show", show);

openOverlayBtn.addEventListener("click", () => toggleOverlay(true));

closeOverlayBtns.forEach(btn => {
  if (btn) btn.addEventListener("click", () => toggleOverlay(false));
});


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

    cardsMaterias.appendChild(card);
    fecharFormulario();
    alert(Matéria "${nome}" criada com sucesso!);
});