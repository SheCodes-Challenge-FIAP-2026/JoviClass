const botaoSuporte =
    document.getElementById("botaoSuporte");

const chatbot =
    document.getElementById("chatbot");

const fecharChatbot =
    document.getElementById("fecharChatbot");

const conteudoChatbot =
    document.getElementById("conteudoChatbot");

const API_SUPORTE =
    "http://localhost:3000/api/suporte";

botaoSuporte.addEventListener(
    "click",
    () => {
        chatbot.classList.add("chatbot-aberto");
        carregarCategorias();
    }
);

fecharChatbot.addEventListener(
    "click",
    () => {
        chatbot.classList.remove(
            "chatbot-aberto"
        );
    }
);

async function carregarCategorias() {
    conteudoChatbot.innerHTML = `
        <p class="mensagem-bot">
            Olá! 👋 Como posso ajudar?
        </p>

        <p class="texto-suporte">
            Selecione uma opção:
        </p>

        <div id="opcoesSuporte">
            Carregando...
        </div>
    `;

    try {
        const resposta =
            await fetch(API_SUPORTE);

        const dados =
            await resposta.json();

        if (!dados.sucesso) {
            throw new Error(
                "Erro ao carregar suporte."
            );
        }

        const opcoes =
            document.getElementById(
                "opcoesSuporte"
            );

        opcoes.innerHTML = "";

        dados.categorias.forEach(
            categoria => {
                const botao =
                    document.createElement(
                        "button"
                    );

                botao.className =
                    "opcao-suporte";

                botao.textContent =
                    categoria.titulo;

                botao.addEventListener(
                    "click",
                    () => {
                        carregarCategoria(
                            categoria.id
                        );
                    }
                );

                opcoes.appendChild(botao);
            }
        );

    } catch (erro) {
        console.error(erro);

        conteudoChatbot.innerHTML = `
            <p class="mensagem-bot">
                Não foi possível carregar o suporte.
            </p>

            <button
                class="opcao-suporte"
                onclick="carregarCategorias()"
            >
                Tentar novamente
            </button>
        `;
    }
}

async function carregarCategoria(idCategoria) {
    try {
        const resposta = await fetch(
            `${API_SUPORTE}/${idCategoria}`
        );

        const dados =
            await resposta.json();

        if (!dados.sucesso) {
            throw new Error(
                "Categoria não encontrada."
            );
        }

        const categoria =
            dados.categoria;

        conteudoChatbot.innerHTML = `
            <button
                class="voltar-suporte"
                id="voltarCategorias"
            >
                ← Voltar
            </button>

            <h3 class="titulo-categoria">
                ${categoria.titulo}
            </h3>

            <div id="acoesSuporte"></div>
        `;

        document
            .getElementById("voltarCategorias")
            .addEventListener(
                "click",
                carregarCategorias
            );

        const acoes =
            document.getElementById(
                "acoesSuporte"
            );

        Object.values(
            categoria.acoes
        ).forEach(acao => {
            const botao =
                document.createElement(
                    "button"
                );

            botao.className =
                "opcao-suporte";

            botao.textContent =
                acao.titulo;

            botao.addEventListener(
                "click",
                () => {
                    mostrarResposta(acao);
                }
            );

            acoes.appendChild(botao);
        });

    } catch (erro) {
        console.error(erro);

        conteudoChatbot.innerHTML = `
            <p class="mensagem-bot">
                Não foi possível carregar essa opção.
            </p>

            <button
                class="opcao-suporte"
                onclick="carregarCategorias()"
            >
                Voltar ao início
            </button>
        `;
    }
}

function mostrarResposta(acao) {
    let link = "";

    if (acao.rota) {
        link = `
            <a
                href="${acao.rota}"
                class="link-suporte"
            >
                Ir para a página
            </a>
        `;
    }

    conteudoChatbot.innerHTML = `
        <button
            class="voltar-suporte"
            id="voltarInicio"
        >
            ← Voltar
        </button>

        <div class="mensagem-bot">
            ${acao.mensagem}
        </div>

        ${link}

        <div class="pergunta-resolvido">
            <p>
                Isso resolveu seu problema?
            </p>

            <div class="botoes-resolvido">
                <button id="problemaResolvido">
                    Sim
                </button>

                <button id="problemaNaoResolvido">
                    Não
                </button>
            </div>
        </div>
    `;

    document
        .getElementById("voltarInicio")
        .addEventListener(
            "click",
            carregarCategorias
        );

    document
        .getElementById("problemaResolvido")
        .addEventListener(
            "click",
            mostrarMensagemResolvido
        );

    document
        .getElementById("problemaNaoResolvido")
        .addEventListener(
            "click",
            mostrarMensagemNaoResolvido
        );
}

function mostrarMensagemResolvido() {
    conteudoChatbot.innerHTML = `
        <div class="mensagem-bot">
            <strong>Que bom! 🎉</strong>

            <p>
                Fico feliz que conseguimos
                resolver sua dúvida.
            </p>
        </div>

        <button
            class="opcao-suporte"
            id="novoAtendimento"
        >
            Fazer outra pergunta
        </button>
    `;

    document
        .getElementById("novoAtendimento")
        .addEventListener(
            "click",
            carregarCategorias
        );
}

function mostrarMensagemNaoResolvido() {
    conteudoChatbot.innerHTML = `
        <div class="mensagem-bot">
            <strong>Tudo bem.</strong>

            <p>
                Consulte outras opções
                disponíveis no suporte.
            </p>
        </div>

        <button
            class="opcao-suporte"
            id="outrasOpcoes"
        >
            Ver outras opções
        </button>
    `;

    document
        .getElementById("outrasOpcoes")
        .addEventListener(
            "click",
            carregarCategorias
        );
}