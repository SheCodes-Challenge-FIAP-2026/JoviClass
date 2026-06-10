const hamburger = document.getElementById("hamburger");
const menuLinks = document.getElementById("menuLinks");

hamburger.addEventListener("click", () => {
    menuLinks.classList.toggle("active");
});

document.addEventListener('DOMContentLoaded', function () {

    // ===========================
    //   CALENDÁRIO
    // ===========================

    const mesAno = document.getElementById('mes-ano');
    const diasContainer = document.getElementById('dias');
    const voltarButton = document.getElementById('voltar');
    const proxButton = document.getElementById('prox');

    const meses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril',
        'Maio', 'Junho', 'Julho', 'Agosto',
        'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    let dataAtual = new Date();
    let today = new Date();
    let diaSelecionado = null;

    // --- Formulário de Evento ---

    function abrirFormularioEvento(diaDiv) {
        diaSelecionado = diaDiv;
        document.getElementById("formularioEvento").style.display = "flex";
    }

    function fecharFormularioEvento() {
        document.getElementById("formularioEvento").style.display = "none";
    }

    function salvarEvento() {
        let titulo = document.getElementById("tituloEvento").value;
        let descricao = document.getElementById("descricaoEvento").value;

        if (titulo) {
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

    // --- Renderização do Calendário ---

    function calendario(data) {
        const ano = data.getFullYear();
        const mes = data.getMonth();
        const primeiroDia = new Date(ano, mes, 1).getDay();
        const ultimoDia = new Date(ano, mes + 1, 0).getDate();

        mesAno.textContent = `${meses[mes]} ${ano}`;
        diasContainer.innerHTML = '';

        // Datas do mês anterior
        const ultimoDiaMesAnterior = new Date(ano, mes, 0).getDate();
        for (let i = primeiroDia; i > 0; i--) {
            const diaDiv = document.createElement('div');
            diaDiv.textContent = ultimoDiaMesAnterior - i + 1;
            diaDiv.classList.add('fade');
            diasContainer.appendChild(diaDiv);
        }

        // Dias do mês atual
        for (let i = 1; i <= ultimoDia; i++) {
            const diaDiv = document.createElement('div');
            diaDiv.classList.add('dia-card');
            diaDiv.innerHTML = `<span class="numero-dia">${i}</span>`;

            diaDiv.onclick = function () {
                abrirFormularioEvento(diaDiv);
            };

            if (i === today.getDate() && mes === today.getMonth() && ano === today.getFullYear()) {
                diaDiv.classList.add('today');
            }

            diasContainer.appendChild(diaDiv);
        }

        // Datas do próximo mês
        const primeiroDiaProximoMes = 7 - new Date(ano, mes + 1, 0).getDay();
        if (primeiroDiaProximoMes < 7) {
            for (let i = 1; i <= primeiroDiaProximoMes; i++) {
                const diaDiv = document.createElement('div');
                diaDiv.textContent = i;
                diaDiv.classList.add('fade');
                diasContainer.appendChild(diaDiv);
            }
        }
    }

    voltarButton.addEventListener('click', function () {
        dataAtual.setMonth(dataAtual.getMonth() - 1);
        calendario(dataAtual);
    });

    proxButton.addEventListener('click', function () {
        dataAtual.setMonth(dataAtual.getMonth() + 1);
        calendario(dataAtual);
    });

    calendario(dataAtual);


    // ===========================
    //   PRÓXIMAS ENTREGAS
    // ===========================

    let entregas = [];

    const btnAddEntrega = document.getElementById('btnAddEntrega');
    const entregasLista = document.getElementById('entregasLista');
    const entregasVazias = document.getElementById('entregasVazias');

    btnAddEntrega.addEventListener('click', function () {
        document.getElementById('formularioEntrega').style.display = 'flex';
    });

    function fecharFormularioEntrega() {
        document.getElementById('formularioEntrega').style.display = 'none';
        document.getElementById('tituloEntrega').value = '';
        document.getElementById('materiaEntrega').value = '';
        document.getElementById('dataEntrega').value = '';
        document.getElementById('prioridadeEntrega').value = 'media';
    }

    function salvarEntrega() {
        const titulo = document.getElementById('tituloEntrega').value.trim();
        const materia = document.getElementById('materiaEntrega').value.trim();
        const data = document.getElementById('dataEntrega').value;
        const prioridade = document.getElementById('prioridadeEntrega').value;

        if (!titulo) return;

        const entregaId = Date.now();
        const entrega = { id: entregaId, titulo, materia, data, prioridade };
        entregas.push(entrega);

        // Ordena por data (mais próxima primeiro)
        entregas.sort((a, b) => {
            if (!a.data) return 1;
            if (!b.data) return -1;
            return new Date(a.data) - new Date(b.data);
        });

        // Adiciona automaticamente ao checklist (com mesmo id para sincronizar remoção)
        const tarefa = { id: entregaId, texto: titulo, materia, concluida: false, fromEntrega: true };
        tarefas.push(tarefa);

        renderizarEntregas();
        renderizarChecklist();
        fecharFormularioEntrega();
    }

    function removerEntrega(id) {
        entregas = entregas.filter(e => e.id !== id);
        // Remove também a tarefa correspondente no checklist
        tarefas = tarefas.filter(t => t.id !== id);
        renderizarEntregas();
        renderizarChecklist();
    }

    function formatarData(dataStr) {
        if (!dataStr) return '';
        // dataStr vem como YYYY-MM-DD
        const [ano, mes, dia] = dataStr.split('-');
        return `${dia}/${mes}/${ano}`;
    }

    function renderizarEntregas() {
        // Remove itens anteriores (mantém o parágrafo vazio)
        const itens = entregasLista.querySelectorAll('.entrega-item');
        itens.forEach(el => el.remove());

        if (entregas.length === 0) {
            entregasVazias.style.display = 'block';
            return;
        }

        entregasVazias.style.display = 'none';

        entregas.forEach(entrega => {
            const item = document.createElement('div');
            item.classList.add('entrega-item', `prioridade-${entrega.prioridade}`);

            const labelPrioridade = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };

            item.innerHTML = `
                <div class="entrega-info">
                    <span class="entrega-titulo-texto">${entrega.titulo}</span>
                    <span class="entrega-meta">
                        ${entrega.materia ? `<span>📚 ${entrega.materia}</span>` : ''}
                        ${entrega.data ? `<span>📅 ${formatarData(entrega.data)}</span>` : ''}
                    </span>
                </div>
                <span class="tag-prioridade tag-${entrega.prioridade}">${labelPrioridade[entrega.prioridade]}</span>
                <button class="btn-remover-entrega" data-id="${entrega.id}" title="Remover">✕</button>
            `;

            item.querySelector('.btn-remover-entrega').addEventListener('click', function () {
                removerEntrega(entrega.id);
            });

            entregasLista.appendChild(item);
        });
    }

    window.fecharFormularioEntrega = fecharFormularioEntrega;
    window.salvarEntrega = salvarEntrega;


    // ===========================
    //   CHECKLIST DE ENTREGAS
    // ===========================

    let tarefas = [];

    const btnAddTarefa = document.getElementById('btnAddTarefa');
    const checklistLista = document.getElementById('checklistLista');
    const checklistVazio = document.getElementById('checklistVazio');

    btnAddTarefa.addEventListener('click', function () {
        document.getElementById('formularioTarefa').style.display = 'flex';
    });

    function fecharFormularioTarefa() {
        document.getElementById('formularioTarefa').style.display = 'none';
        document.getElementById('textoTarefa').value = '';
        document.getElementById('materiaTarefa').value = '';
    }

    function salvarTarefa() {
        const texto = document.getElementById('textoTarefa').value.trim();
        const materia = document.getElementById('materiaTarefa').value.trim();

        if (!texto) return;

        const tarefa = { id: Date.now(), texto, materia, concluida: false };
        tarefas.push(tarefa);

        renderizarChecklist();
        fecharFormularioTarefa();
    }

    function toggleTarefa(id) {
        const tarefa = tarefas.find(t => t.id === id);
        if (tarefa) {
            tarefa.concluida = !tarefa.concluida;
            renderizarChecklist();
        }
    }

    function removerTarefa(id) {
        tarefas = tarefas.filter(t => t.id !== id);
        renderizarChecklist();
    }

    function atualizarProgresso() {
        const total = tarefas.length;
        const concluidas = tarefas.filter(t => t.concluida).length;
        const porcentagem = total === 0 ? 0 : Math.round((concluidas / total) * 100);

        document.getElementById('tarefasConcluidas').textContent = concluidas;
        document.getElementById('tarefasTotal').textContent = total;
        document.getElementById('barraProgresso').style.width = `${porcentagem}%`;
    }

    function renderizarChecklist() {
        // Remove itens anteriores
        const itens = checklistLista.querySelectorAll('.tarefa-item');
        itens.forEach(el => el.remove());

        if (tarefas.length === 0) {
            checklistVazio.style.display = 'block';
            atualizarProgresso();
            return;
        }

        checklistVazio.style.display = 'none';

        // Pendentes primeiro, concluídas por último
        const ordenadas = [...tarefas].sort((a, b) => a.concluida - b.concluida);

        ordenadas.forEach(tarefa => {
            const li = document.createElement('li');
            li.classList.add('tarefa-item');
            if (tarefa.concluida) li.classList.add('concluida');

            li.innerHTML = `
                <input 
                    type="checkbox" 
                    class="tarefa-checkbox" 
                    ${tarefa.concluida ? 'checked' : ''}
                    data-id="${tarefa.id}"
                >
                <div class="tarefa-info">
                    <span class="tarefa-texto">${tarefa.texto}</span>
                    ${tarefa.materia ? `<span class="tarefa-materia">${tarefa.materia}</span>` : ''}
                </div>
                <button class="btn-remover-tarefa" data-id="${tarefa.id}" title="Remover">✕</button>
            `;

            li.querySelector('.tarefa-checkbox').addEventListener('change', function () {
                toggleTarefa(tarefa.id);
            });

            li.querySelector('.btn-remover-tarefa').addEventListener('click', function () {
                removerTarefa(tarefa.id);
            });

            checklistLista.appendChild(li);
        });

        atualizarProgresso();
    }

    window.fecharFormularioTarefa = fecharFormularioTarefa;
    window.salvarTarefa = salvarTarefa;

});