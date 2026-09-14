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
        'Janeiro', 'Fevereiro', 'Março', 'Abril',
        'Maio', 'Junho', 'Julho', 'Agosto',
        'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    let dataAtual = new Date();
    let today = new Date();

    let diaSelecionado = null;


    const API_BASE = `http://${window.location.hostname}:3000`;
    let eventosGoogle = [];     
    let googleConectado = false;


    let eventosLocais = [];
    let eventosDasTarefas = [];

    const ordemPrioridade = { alta: 0, media: 1, baixa: 2 };

    function criarDataLocal(dataTexto) {
        if (!dataTexto) return null;
        const [ano, mes, dia] = dataTexto.split('-').map(Number);
        return new Date(ano, mes - 1, dia);
    }

    function formatarDataISO(ano, mes, dia) {
        return `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    }

    async function buscarEventosGoogle() {
        try {
            const resp = await fetch(`${API_BASE}/api/calendar/eventos`, { credentials: 'include' });
            if (resp.status === 401 || resp.status === 403) {
                googleConectado = false;
                eventosGoogle = [];
                return;
            }

            if (!resp.ok) throw new Error('Falha ao buscar eventos do Google Agenda');

            const dados = await resp.json();

            eventosGoogle = dados
                .map(ev => {
                    const inicio = ev.start?.dateTime || ev.start?.date;
                    if (!inicio) return null;
                    return {
                        id: `google-${ev.id}`,
                        titulo: ev.summary || '(Sem título)',
                        descricao: ev.description || '',
                        data: new Date(inicio),
                        diaTodo: !ev.start?.dateTime
                    };
                })
                .filter(Boolean);

            googleConectado = true;
        } catch (erro) {
            console.error('Não foi possível carregar os eventos do Google Agenda:', erro);
            googleConectado = false;
            eventosGoogle = [];
        }

        window.eventosGoogleCache = eventosGoogle;

        atualizarStatusGoogle();
    }

    async function buscarEventosLocais() {
        try {
            const resposta = await fetch(`${API_BASE}/eventos`, {
                credentials: 'include'
            });

            const dados = await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                    dados.erro || 'Não foi possível carregar os eventos.'
                );
            }

            eventosLocais = (dados.eventos || []).map(evento => ({
                ...evento,
                data: criarDataLocal(evento.data)
            }));
        } catch (erro) {
            console.error('Erro ao carregar eventos:', erro);
            eventosLocais = [];
        }
    }

    function atualizarStatusGoogle() {
        const status = document.getElementById('googleStatus');
        if (!status) return;

        if (googleConectado) {
            status.hidden = true;
        } else {
            status.hidden = false;
            status.innerHTML = 'Conecte sua conta Google no <a href="../pages/perfil.html">perfil</a> para ver seus eventos do Google Agenda aqui.';
        }
    }

    function eventosGoogleDoDia(ano, mes, dia) {
        return eventosGoogle.filter(ev =>
            ev.data.getFullYear() === ano &&
            ev.data.getMonth() === mes &&
            ev.data.getDate() === dia
        );
    }

    function eventosLocaisDoDia(ano, mes, dia) {
        return [...eventosLocais, ...eventosDasTarefas].filter(ev =>
            ev.data.getFullYear() === ano &&
            ev.data.getMonth() === mes &&
            ev.data.getDate() === dia
        );
    }

    function escapeHTML(texto) {
        const aux = document.createElement('div');
        aux.textContent = texto ?? '';
        return aux.innerHTML;
    }

    function renderizarProximosEventos() {
        const lista = document.getElementById('eventosProximosLista');
        if (!lista) return;

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const limite = new Date(hoje);
        limite.setDate(limite.getDate() + 10);

        const eventos = [
            ...eventosLocais.map(evento => ({ ...evento, origem: 'JoviClass' })),
            ...eventosGoogle.map(evento => ({
                ...evento,
                categoria: 'Google Agenda',
                origem: 'Google Agenda'
            }))
        ]
            .map(evento => ({
                ...evento,
                dataNormalizada: evento.data instanceof Date
                    ? evento.data
                    : criarDataLocal(evento.data)
            }))
            .filter(evento =>
                evento.dataNormalizada &&
                evento.dataNormalizada >= hoje &&
                evento.dataNormalizada <= limite
            )
            .sort((a, b) => a.dataNormalizada - b.dataNormalizada);

        if (eventos.length === 0) {
            lista.innerHTML = `
                <p class="lista-vazia">
                    Nenhum evento previsto para os próximos 10 dias.
                </p>
            `;
            return;
        }

        lista.innerHTML = eventos.map(evento => {
            const botaoExcluir = evento.origem === 'JoviClass'
                ? `
                    <button
                        class="btn-remover-entrega btn-remover-evento"
                        data-id="${evento.id}"
                        title="Excluir evento"
                    >✕</button>
                `
                : '';

            return `
                <div class="entrega-item">
                    <div class="entrega-info">
                        <span class="entrega-titulo-texto">
                            ${escapeHTML(evento.titulo)}
                        </span>
                        <span class="entrega-meta">
                            <span>📅 ${evento.dataNormalizada.toLocaleDateString('pt-BR')}</span>
                            <span>${escapeHTML(evento.categoria || 'Evento')}</span>
                            <span>${escapeHTML(evento.origem)}</span>
                        </span>
                        ${evento.descricao
                            ? `<span class="entrega-meta">${escapeHTML(evento.descricao)}</span>`
                            : ''}
                    </div>
                    ${botaoExcluir}
                </div>
            `;
        }).join('');

        lista.querySelectorAll('.btn-remover-evento').forEach(botao => {
            botao.addEventListener('click', function () {
                removerEvento(this.dataset.id);
            });
        });
    }

    async function removerEvento(id) {
        const confirmou = window.confirm(
            'Tem certeza que deseja excluir este evento?'
        );

        if (!confirmou) return;

        try {
            const resposta = await fetch(`${API_BASE}/eventos/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            const dados = await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                    dados.erro || 'Não foi possível excluir o evento.'
                );
            }

            eventosLocais = eventosLocais.filter(
                evento => String(evento.id) !== String(id)
            );

            calendario(dataAtual);
            renderizarProximosEventos();

            if (diaSelecionado) {
                renderizarEventosDoFormulario(
                    diaSelecionado.ano,
                    diaSelecionado.mes,
                    diaSelecionado.dia
                );
            }
        } catch (erro) {
            console.error('Erro ao excluir evento:', erro);
            alert(erro.message || 'Não foi possível excluir o evento.');
        }
    }

    function renderizarEventosDoFormulario(ano, mes, dia) {
        const container = document.getElementById('eventosDoFormulario');
        if (!container) return;

        const doDia = [
            ...eventosGoogleDoDia(ano, mes, dia).map(ev => ({ ...ev, origem: 'google' })),
            ...eventosLocaisDoDia(ano, mes, dia).map(ev => ({ ...ev, origem: 'local' }))
        ].sort((a, b) => a.data - b.data);

        if (doDia.length === 0) {
            container.hidden = true;
            container.innerHTML = '';
            return;
        }

        container.hidden = false;
        container.innerHTML = `
            <span class="eventos-dia-titulo">Eventos do dia</span>
            ${doDia.map(ev => {
                const subtitulo = ev.origem === 'google'
                    ? (ev.diaTodo
                        ? 'Dia todo · Google Agenda'
                        : `${ev.data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · Google Agenda`)
                    : (ev.categoria || 'Evento');

                const botaoExcluir = ev.origem === 'local'
                    ? `
                        <button
                            type="button"
                            class="btn-remover-entrega btn-remover-evento-dia"
                            data-id="${ev.id}"
                            title="Excluir evento"
                        >✕</button>
                    `
                    : '';

                return `
                    <div class="evento-dia-card">
                        <div class="evento-dia-card-topo">
                            <span class="evento-dia-bolinha"></span>
                            <strong>${escapeHTML(ev.titulo)}</strong>
                            ${botaoExcluir}
                        </div>
                        <span class="evento-dia-hora">${subtitulo}</span>
                        ${ev.descricao ? `<p class="evento-dia-descricao">${escapeHTML(ev.descricao)}</p>` : ''}
                    </div>
                `;
            }).join('')}
        `;

        container.querySelectorAll('.btn-remover-evento-dia').forEach(botao => {
            botao.addEventListener('click', function () {
                removerEvento(this.dataset.id);
            });
        });
    }

    function abrirFormularioEvento(diaDiv, ano, mes, dia) {
    diaSelecionado = { ano, mes, dia };

    document.getElementById("dataEvento").value =
        formatarDataISO(ano, mes, dia);

    renderizarEventosDoFormulario(ano, mes, dia);

    document.getElementById(
        "formularioEvento"
    ).style.display = "flex";
}

    function fecharFormularioEvento() {
        document.getElementById("formularioEvento").style.display = "none";
    }

    const btnAddEvento =
    document.getElementById("btnAddEvento");

btnAddEvento.addEventListener("click", function () {
    diaSelecionado = null;

    document.getElementById("dataEvento").value = "";

    const eventosDoFormulario =
        document.getElementById("eventosDoFormulario");

    eventosDoFormulario.hidden = true;
    eventosDoFormulario.innerHTML = "";

    document.getElementById(
        "formularioEvento"
    ).style.display = "flex";
});

    async function salvarEvento() {
    const titulo = document
        .getElementById("tituloEvento")
        .value
        .trim();

    const categoria = document
        .getElementById("categoria")
        .value;

    const descricao = document
        .getElementById("descricaoEvento")
        .value
        .trim();

    const data = document
        .getElementById("dataEvento")
        .value;

    if (!titulo) {
        alert("Informe o título do evento.");
        return;
    }

    if (!data) {
        alert("Informe a data do evento.");
        return;
    }

    try {
        const resposta = await fetch(
            `${API_BASE}/eventos`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                credentials: "include",

                body: JSON.stringify({
                    titulo,
                    categoria,
                    descricao,
                    data
                })
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                dados.erro ||
                "Não foi possível salvar o evento."
            );
        }

        const evento = dados.evento;

        eventosLocais.push({
            id: evento.id,
            titulo: evento.titulo,
            categoria: evento.categoria,
            descricao: evento.descricao,
            data: criarDataLocal(evento.data)
        });

        document.getElementById("tituloEvento").value = "";
        document.getElementById("descricaoEvento").value = "";
        document.getElementById("dataEvento").value = "";
        document.getElementById("categoria").value = "Projeto";

        calendario(dataAtual);
        renderizarProximosEventos();
        fecharFormularioEvento();
    } catch (erro) {
        console.error("Erro ao salvar evento:", erro);

        alert(
            erro.message ||
            "Não foi possível salvar o evento."
        );
    }
}

    window.fecharFormularioEvento = fecharFormularioEvento;
    window.salvarEvento = salvarEvento;


    function calendario(data) {
        const ano = data.getFullYear();
        const mes = data.getMonth();
        const primeiroDia = new Date(ano, mes, 1).getDay();
        const ultimoDia = new Date(ano, mes + 1, 0).getDate();

        mesAno.textContent = `${meses[mes]} ${ano}`;
        diasContainer.innerHTML = '';

        const ultimoDiaMesAnterior = new Date(ano, mes, 0).getDate();
        for (let i = primeiroDia; i > 0; i--) {
            const diaDiv = document.createElement('div');
            diaDiv.textContent = ultimoDiaMesAnterior - i + 1;
            diaDiv.classList.add('fade');
            diasContainer.appendChild(diaDiv);
        }

        for (let i = 1; i <= ultimoDia; i++) {
            const diaDiv = document.createElement('div');
            diaDiv.classList.add('dia-card');
            diaDiv.innerHTML = `<span class="numero-dia">${i}</span>`;

            diaDiv.onclick = function () {
                abrirFormularioEvento(diaDiv, ano, mes, i);
            };

            if (i === today.getDate() && mes === today.getMonth() && ano === today.getFullYear()) {
                diaDiv.classList.add('today');
            }

            const eventosGoogleDia = eventosGoogleDoDia(ano, mes, i);
            const eventosLocaisDia = eventosLocaisDoDia(ano, mes, i);
            diaDiv._eventosGoogle = eventosGoogleDia;
            diaDiv._eventosLocais = eventosLocaisDia;

            const totalEventosDia = eventosGoogleDia.length + eventosLocaisDia.length;

            if (totalEventosDia > 0) {
                const bolinha = document.createElement('span');
                bolinha.classList.add('bolinha-evento');
                bolinha.title = totalEventosDia === 1
                    ? (eventosGoogleDia[0]?.titulo || eventosLocaisDia[0]?.titulo)
                    : `${totalEventosDia} eventos nesse dia`;
                diaDiv.appendChild(bolinha);
            }

            diasContainer.appendChild(diaDiv);
        }

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

    async function atualizarCalendario() {
        await Promise.all([
            buscarEventosGoogle(),
            buscarEventosLocais()
        ]);
        calendario(dataAtual);
        renderizarProximosEventos();
        if (typeof renderizarPainel === 'function') renderizarPainel();
    }

    atualizarCalendario();

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

    async function salvarEntrega() {
    const titulo = document
        .getElementById('tituloEntrega')
        .value
        .trim();

    const materia = document
        .getElementById('materiaEntrega')
        .value
        .trim();

    const data = document
        .getElementById('dataEntrega')
        .value;

    const prioridade = document
        .getElementById('prioridadeEntrega')
        .value;

    if (!titulo) return;

    try {
        const resposta = await fetch(
            `${API_BASE}/tarefas`,
            {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json'
                },

                credentials: 'include',

                body: JSON.stringify({
                    texto: titulo,
                    materia,
                    data,
                    prioridade
                })
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                dados.erro ||
                'Não foi possível salvar a entrega.'
            );
        }

        const tarefa = dados.tarefa;

        tarefas.push(tarefa);

        if (tarefa.data) {
            entregas.push({
                id: tarefa.id,
                titulo: tarefa.texto,
                materia: tarefa.materia,
                data: tarefa.data,
                prioridade: tarefa.prioridade
            });

            eventosDasTarefas.push({
                id: tarefa.id,
                titulo: tarefa.texto,
                categoria: tarefa.materia || 'Entrega',
                descricao: '',
                data: criarDataLocal(tarefa.data),
                tarefaId: tarefa.id
            });
        }

        entregas.sort((a, b) =>
            ordemPrioridade[a.prioridade || 'media'] -
                ordemPrioridade[b.prioridade || 'media'] ||
            (a.data || '9999-12-31')
                .localeCompare(b.data || '9999-12-31')
        );

        renderizarEntregas();
        renderizarChecklist();
        calendario(dataAtual);
        fecharFormularioEntrega();
    } catch (erro) {
        console.error('Erro ao salvar entrega:', erro);

        alert(
            erro.message ||
            'Não foi possível salvar a entrega.'
        );
    }
}

    function removerEntrega(id) {
    removerTarefa(id);
}

    function formatarData(dataStr) {
        if (!dataStr) return '';
        const [ano, mes, dia] = dataStr.split('-');
        return `${dia}/${mes}/${ano}`;
    }

    function renderizarEntregas() {
        const itens = entregasLista.querySelectorAll('.entrega-item');
        itens.forEach(el => el.remove());

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const limite = new Date(hoje);
        limite.setDate(limite.getDate() + 10);

        const proximasEntregas = entregas
            .filter(entrega => {
                const dataEntrega = criarDataLocal(entrega.data);

                const tarefaCorrespondente = tarefas.find(
                    tarefa =>
                        String(tarefa.id) === String(entrega.id)
                );

                const estaConcluida =
                    tarefaCorrespondente?.concluida === true;

                return (
                    dataEntrega &&
                    dataEntrega >= hoje &&
                    dataEntrega <= limite &&
                    !estaConcluida
                );
            })
            .sort((a, b) =>
                ordemPrioridade[a.prioridade] - ordemPrioridade[b.prioridade] ||
                a.data.localeCompare(b.data)
            );

        if (proximasEntregas.length === 0) {
            entregasVazias.style.display = 'block';
            entregasVazias.textContent = 'Nenhuma entrega prevista para os próximos 10 dias.';
            return;
        }
        entregasVazias.style.display = 'none';
        proximasEntregas.forEach(entrega => {
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

    let tarefas = [];

    const btnAddTarefa = document.getElementById('btnAddTarefa');
    const checklistLista = document.getElementById('checklistLista');
    const checklistVazio = document.getElementById('checklistVazio');
    const ordenacaoChecklist = document.getElementById('ordenacaoChecklist');

    ordenacaoChecklist.addEventListener('change', renderizarChecklist);

    btnAddTarefa.addEventListener('click', function () {
        document.getElementById('formularioTarefa').style.display = 'flex';
    });

    function fecharFormularioTarefa() {
        document.getElementById('formularioTarefa').style.display = 'none';
        document.getElementById('textoTarefa').value = '';
        document.getElementById('materiaTarefa').value = '';
        document.getElementById('dataTarefa').value = '';
        document.getElementById('prioridadeTarefa').value = 'media';
    }

async function salvarTarefa() {
    const texto = document
        .getElementById('textoTarefa')
        .value
        .trim();

    const materia = document
        .getElementById('materiaTarefa')
        .value
        .trim();

    const data = document
        .getElementById('dataTarefa')
        .value;

    const prioridade = document
        .getElementById('prioridadeTarefa')
        .value;

    if (!texto) return;

    try {
        const resposta = await fetch(
            `${API_BASE}/tarefas`,
            {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json'
                },

                credentials: 'include',

                body: JSON.stringify({
                    texto,
                    materia,
                    data,
                    prioridade
                })
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                dados.erro || 'Não foi possível salvar a tarefa.'
            );
        }

        const tarefa = dados.tarefa;

        tarefas.push(tarefa);

        if (tarefa.data) {
            entregas.push({
                id: tarefa.id,
                titulo: tarefa.texto,
                materia: tarefa.materia,
                data: tarefa.data,
                prioridade: tarefa.prioridade
            });

            entregas.sort((a, b) =>
                ordemPrioridade[a.prioridade] -
                    ordemPrioridade[b.prioridade] ||
                a.data.localeCompare(b.data)
            );

            eventosDasTarefas.push({
                id: tarefa.id,
                titulo: tarefa.texto,
                categoria: tarefa.materia || 'Tarefa',
                descricao: '',
                data: criarDataLocal(tarefa.data),
                tarefaId: tarefa.id
            });
        }

        renderizarChecklist();
        renderizarEntregas();
        calendario(dataAtual);
        fecharFormularioTarefa();
    } catch (erro) {
        console.error('Erro ao salvar tarefa:', erro);

        alert(
            erro.message ||
            'Não foi possível salvar a tarefa.'
        );
    }
}

    async function toggleTarefa(id) {
    const tarefa = tarefas.find(
        tarefaAtual => String(tarefaAtual.id) === String(id)
    );

    if (!tarefa) return;

    const novoEstado = !tarefa.concluida;

    try {
        const resposta = await fetch(
            `${API_BASE}/tarefas/${id}`,
            {
                method: 'PUT',

                headers: {
                    'Content-Type': 'application/json'
                },

                credentials: 'include',

                body: JSON.stringify({
                    concluida: novoEstado
                })
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                dados.erro ||
                'Não foi possível atualizar a tarefa.'
            );
        }

        tarefa.concluida = novoEstado;

        renderizarChecklist();
        renderizarEntregas();
    } catch (erro) {
        console.error(
            'Erro ao atualizar tarefa:',
            erro
        );

        alert(
            erro.message ||
            'Não foi possível atualizar a tarefa.'
        );

        renderizarChecklist();
    }
}

    async function removerTarefa(id) {
        const confirmou = window.confirm(
            'Tem certeza que deseja excluir esta tarefa?'
        );

        if (!confirmou) return;
        
        try {
            const resposta = await fetch(
                `${API_BASE}/tarefas/${id}`,
                {
                    method: 'DELETE',
                    credentials: 'include'
                }
            );

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                dados.erro ||
                'Não foi possível excluir a tarefa.'
            );
        }

        tarefas = tarefas.filter(
            tarefa => String(tarefa.id) !== String(id)
        );

        entregas = entregas.filter(
            entrega => String(entrega.id) !== String(id)
        );

        eventosDasTarefas = eventosDasTarefas.filter(
            evento => String(evento.tarefaId) !== String(id)
        );

        renderizarChecklist();
        renderizarEntregas();
        calendario(dataAtual);
    } catch (erro) {
        console.error('Erro ao excluir tarefa:', erro);

        alert(
            erro.message ||
            'Não foi possível excluir a tarefa.'
        );
    }
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
        const itens = checklistLista.querySelectorAll('.tarefa-item');
        itens.forEach(el => el.remove());

        if (tarefas.length === 0) {
            checklistVazio.style.display = 'block';
            atualizarProgresso();
            return;
        }

        checklistVazio.style.display = 'none';
        const ordenadas = [...tarefas].sort((a, b) => {
            if (ordenacaoChecklist.value === 'prioridade') {
                return ordemPrioridade[a.prioridade || 'media'] - ordemPrioridade[b.prioridade || 'media'] ||
                    (a.data || '9999-12-31').localeCompare(b.data || '9999-12-31');
            }

            return (a.data || '9999-12-31').localeCompare(b.data || '9999-12-31') ||
                ordemPrioridade[a.prioridade || 'media'] - ordemPrioridade[b.prioridade || 'media'];
        });
        ordenadas.forEach(tarefa => {
            const li = document.createElement('li');
            li.classList.add('tarefa-item');
            if (tarefa.concluida) li.classList.add('concluida');

            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            const dataDaTarefa = criarDataLocal(tarefa.data);
            const vencida = dataDaTarefa && dataDaTarefa < hoje && !tarefa.concluida;

            if (vencida) li.classList.add('vencida');

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
                    ${tarefa.data ? `<span class="tarefa-data">📅 ${formatarData(tarefa.data)}</span>` : '<span class="tarefa-data">Sem data</span>'}
                </div>
                ${vencida ? '<span class="tag-vencida">Vencida</span>' : ''}
                <span class="tag-prioridade tag-${tarefa.prioridade || 'media'}">
                    ${{ alta: 'Alta', media: 'Média', baixa: 'Baixa' }[tarefa.prioridade || 'media']}
                </span>
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

    async function carregarTarefas() {
    try {
        const resposta = await fetch(
            `${API_BASE}/tarefas`,
            {
                credentials: 'include'
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                dados.erro || 'Não foi possível carregar as tarefas.'
            );
        }

        tarefas = dados.tarefas || [];

        entregas = tarefas
            .filter(tarefa => tarefa.data)
            .map(tarefa => ({
                id: tarefa.id,
                titulo: tarefa.texto,
                materia: tarefa.materia,
                data: tarefa.data,
                prioridade: tarefa.prioridade
            }));

        eventosDasTarefas = tarefas
            .filter(tarefa => tarefa.data)
            .map(tarefa => ({
                id: tarefa.id,
                titulo: tarefa.texto,
                categoria: tarefa.materia || 'Tarefa',
                descricao: '',
                data: criarDataLocal(tarefa.data),
                tarefaId: tarefa.id
            }));

        entregas.sort((a, b) =>
            ordemPrioridade[a.prioridade || 'media'] -
                ordemPrioridade[b.prioridade || 'media'] ||
            (a.data || '9999-12-31')
                .localeCompare(b.data || '9999-12-31')
        );

        renderizarChecklist();
        renderizarEntregas();
        calendario(dataAtual);
    } catch (erro) {
        console.error('Erro ao carregar tarefas:', erro);
    }
}

    window.fecharFormularioTarefa = fecharFormularioTarefa;
    window.salvarTarefa = salvarTarefa;

    carregarTarefas();

});

const EVENTOS = [
  { id: "prova-calculo",  titulo: "Prova de Cálculo I",      tipo: "prova",    materia: "Cálculo I", data: "2024-05-25T08:00" },
  { id: "prova-fisica",   titulo: "Prova de Física II",      tipo: "prova",    materia: "Física II",  data: "2024-06-02T08:00" },
  { id: "trabalho-eco",   titulo: "Entrega do trabalho de Economia", tipo: "trabalho", materia: "Economia", data: "2024-06-05T23:59" },
  { id: "reuniao-grupo",  titulo: "Reunião do grupo de estudos", tipo: "reuniao", materia: "Cálculo I", data: "2024-05-20T19:00" },
];

const ICONE_TIPO = {
  prova: "📝",
  trabalho: "📁",
  reuniao: "🗓️",
  google: "🗓️",
};

const LIMIARES_ALERTA = {
  aviso7dias: 7 * 24 * 60 * 60 * 1000,
  aviso1dia: 24 * 60 * 60 * 1000,
  aviso1hora: 60 * 60 * 1000,
};

const CHAVE_LIDAS = "joviclass_notif_lidas";
const CHAVE_DISPARADAS = "joviclass_notif_disparadas";

function carregarSet(chave) {
  try {
    return new Set(JSON.parse(localStorage.getItem(chave)) || []);
  } catch {
    return new Set();
  }
}

function salvarSet(chave, set) {
  localStorage.setItem(chave, JSON.stringify([...set]));
}

let lidas = carregarSet(CHAVE_LIDAS);
let disparadas = carregarSet(CHAVE_DISPARADAS);

function calcularStatus(evento) {
  const agora = new Date();
  const dataEvento = new Date(evento.data);
  const diffMs = dataEvento - agora;

  if (diffMs <= 0) return null;

  const diffHoras = diffMs / (1000 * 60 * 60);
  const diffDias = diffHoras / 24;

  let urgencia = "normal";
  if (diffHoras <= 24) urgencia = "urgente";
  else if (diffDias <= 3) urgencia = "breve";

  let prazoTexto;
  if (diffHoras < 1) prazoTexto = "em menos de 1h";
  else if (diffHoras < 24) prazoTexto = `em ${Math.round(diffHoras)}h`;
  else prazoTexto = `em ${Math.ceil(diffDias)} dia${Math.ceil(diffDias) > 1 ? "s" : ""}`;

  return { diffMs, diffHoras, diffDias, urgencia, prazoTexto };
}

function gerarNotificacoes() {
  const eventosGoogleFormatados = (window.eventosGoogleCache || []).map((ev) => ({
    id: ev.id,
    titulo: ev.titulo,
    tipo: "google",
    materia: "",
    data: ev.data,
  }));

  const todosEventos = [...EVENTOS, ...eventosGoogleFormatados];

  return todosEventos
    .map((evento) => {
      const status = calcularStatus(evento);
      if (!status || status.diffMs > LIMIARES_ALERTA.aviso7dias) return null;
      return { ...evento, ...status };
    })
    .filter(Boolean)
    .sort((a, b) => a.diffMs - b.diffMs);
}

const TIPO_LABEL = { prova: "Prova", trabalho: "Trabalho", reuniao: "Reunião", google: "Google Agenda" };

function renderizarPainel() {
  const lista = document.getElementById("notifLista");
  const dot = document.getElementById("notifDot");
  if (!lista || !dot) return;

  const notificacoes = gerarNotificacoes();
  const naoLidas = notificacoes.filter((n) => !lidas.has(n.id));

  if (naoLidas.length > 0) {
    dot.hidden = false;
    dot.textContent = naoLidas.length > 9 ? "9+" : naoLidas.length;
  } else {
    dot.hidden = true;
  }

  if (notificacoes.length === 0) {
    lista.innerHTML = `<div class="notif-vazio">Nenhuma prova, trabalho ou reunião chegando perto!</div>`;
    return;
  }

  lista.innerHTML = notificacoes
    .map((n) => `
      <div class="notif-item ${lidas.has(n.id) ? "" : "nao-lida"}" data-id="${n.id}">
        <span class="notif-icone ${n.urgencia}">${ICONE_TIPO[n.tipo] || "🔔"}</span>
        <div class="notif-corpo">
          <div class="notif-titulo">${n.titulo}</div>
          <div class="notif-sub">${TIPO_LABEL[n.tipo] || "Evento"}${n.materia ? " · " + n.materia : ""}</div>
          <span class="notif-prazo ${n.urgencia}">Vence ${n.prazoTexto}</span>
        </div>
      </div>
    `)
    .join("");

    lista.querySelectorAll(".notif-item").forEach((el) => {
    el.addEventListener("click", () => {
      lidas.add(el.dataset.id);
      salvarSet(CHAVE_LIDAS, lidas);
      renderizarPainel();
    });
  });
}

function dispararNotificacaoDoNavegador(evento, status) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const chaveDisparo = `${evento.id}-${status.urgencia}`;
  if (disparadas.has(chaveDisparo)) return;  

  new Notification(`${TIPO_LABEL[evento.tipo]}: ${evento.titulo}`, {
    body: `Vence ${status.prazoTexto}.`,
    icon: "./src/assets/img/logo.png",
  });

  disparadas.add(chaveDisparo);
  salvarSet(CHAVE_DISPARADAS, disparadas);
}

function verificarAlertasDoSistema() {
  EVENTOS.forEach((evento) => {
    const status = calcularStatus(evento);
    if (!status) return;
    if (status.diffMs <= LIMIARES_ALERTA.aviso1hora || status.diffMs <= LIMIARES_ALERTA.aviso1dia) {
      dispararNotificacaoDoNavegador(evento, status);
    }
  });
}

function iniciarSistemaDeNotificacoes() {
  const notifBtn = document.getElementById("notifBtn");
  const notifPanel = document.getElementById("notifPanel");
  const notifMarcarLidas = document.getElementById("notifMarcarLidas");

  renderizarPainel();
  verificarAlertasDoSistema();

  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }

  if (notifBtn && notifPanel) {
    notifBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const aberto = !notifPanel.hidden;
      notifPanel.hidden = aberto;
      notifBtn.setAttribute("aria-expanded", String(!aberto));
    });

    document.addEventListener("click", (e) => {
      if (!notifPanel.hidden && !notifPanel.contains(e.target) && e.target !== notifBtn) {
        notifPanel.hidden = true;
        notifBtn.setAttribute("aria-expanded", "false");
      }
    });
  }

  if (notifMarcarLidas) {
    notifMarcarLidas.addEventListener("click", () => {
      gerarNotificacoes().forEach((n) => lidas.add(n.id));
      salvarSet(CHAVE_LIDAS, lidas);
      renderizarPainel();
    });
  }

  setInterval(() => {
    renderizarPainel();
    verificarAlertasDoSistema();
  }, 5 * 60 * 1000);
}

iniciarSistemaDeNotificacoes();
