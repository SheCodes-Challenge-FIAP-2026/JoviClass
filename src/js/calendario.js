const hamburger = document.getElementById("hamburger");
const menuLinks = document.getElementById("menuLinks");

hamburger.addEventListener("click", () => {
    menuLinks.classList.toggle("active");
});

document.addEventListener('DOMContentLoaded', function () {

    const mesAno = document.getElementById('mes-ano');
    const diasContainer = document.getElementById('dias');
    const voltarButton = document.getElementById('voltar');
    const proxButton = document.getElementById('prox');

    const meses = [
        'Janeiro',
        'Fevereiro',
        'Março',
        'Abril',
        'Maio',
        'Junho',
        'Julho',
        'Agosto',
        'Setembro',
        'Outubro',
        'Novembro',
        'Dezembro'
    ];

    let dataAtual = new Date();
    let today = new Date();

    let diaSelecionado = null;

    //criar evento

    function abrirFormularioEvento(diaDiv){

        diaSelecionado = diaDiv;

        document.getElementById("formularioEvento").style.display = "flex";
    }

    function fecharFormularioEvento(){

        document.getElementById("formularioEvento").style.display = "none";
    }

    function salvarEvento(){

        let titulo = document.getElementById("tituloEvento").value;

        let descricao = document.getElementById("descricaoEvento").value;

        if(titulo){

            let eventoDiv = document.createElement('div');

            eventoDiv.classList.add('evento');

            eventoDiv.innerHTML = `
                <strong>${titulo}</strong>
                <p>${descricao}</p>
            `;

            diaSelecionado.appendChild(eventoDiv);

            document.getElementById("tituloEvento").value = "";

            document.getElementById("descricaoEvento").value = "";

            fecharFormularioEvento();
        }
    }

    window.fecharFormularioEvento = fecharFormularioEvento;
    window.salvarEvento = salvarEvento;

    function calendario(data){

        const ano = data.getFullYear();
        const mes = data.getMonth();
        const primeiroDia = new Date(ano, mes, 1).getDay();
        const ultimoDia = new Date(ano, mes + 1, 0).getDate();

        mesAno.textContent = `${meses[mes]} ${ano}`;

        diasContainer.innerHTML = '';

        //datas mês anterior
        
        const ultimoDiaMesAnterior = new Date(ano, mes, 0).getDate();

        for(let i = primeiroDia; i > 0; i--){

            const diaDiv = document.createElement('div');
            diaDiv.textContent = ultimoDiaMesAnterior - i + 1;
            diaDiv.classList.add('fade');
            diasContainer.appendChild(diaDiv);
        }

        for (let i = 1; i <= ultimoDia; i++){

            const diaDiv = document.createElement('div');

            diaDiv.classList.add('dia-card');

            diaDiv.innerHTML = `
                <span class="numero-dia">${i}</span>
            `;

            //click criar evento

            diaDiv.onclick = function(){

                abrirFormularioEvento(diaDiv);

            };

            if( i === today.getDate() && mes === today.getMonth() && ano === today.getFullYear()){
                diaDiv.classList.add('today');
            }

            diasContainer.appendChild(diaDiv);
        }

        //datas próximo mês
        
        const primeiroDiaProximoMes = 7 - new Date(ano, mes + 1, 0).getDay();

        if(primeiroDiaProximoMes < 7){

            for(let i = 1; i <= primeiroDiaProximoMes; i++){

                const diaDiv = document.createElement('div');
                diaDiv.textContent = i;
                diaDiv.classList.add('fade');
                diasContainer.appendChild(diaDiv);

            }
        }
    }

    voltarButton.addEventListener('click', function(){
        dataAtual.setMonth(dataAtual.getMonth() - 1);
        calendario(dataAtual);
    });

    proxButton.addEventListener('click', function(){
        dataAtual.setMonth(dataAtual.getMonth() + 1);
        calendario(dataAtual);
    })

    calendario(dataAtual);

});