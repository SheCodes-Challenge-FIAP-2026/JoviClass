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
        chatbot.classList.remove(
            "chatbot-fechado"
        );

        carregarCategorias();
    }
);



fecharChatbot.addEventListener(
    "click",
    () => {
        chatbot.classList.add(
            "chatbot-fechado"
        );
    }
);



async function carregarCategorias() {

    conteudoChatbot.innerHTML = `
        <p>Como podemos ajudar?</p>
    `;


    try {

        const resposta =
            await fetch(API_SUPORTE);


        const dados =
            await resposta.json();


        conteudoChatbot.innerHTML = `
            <p>
                Selecione uma opção:
            </p>

            <div id="listaOpcoes"></div>
        `;


        const lista =
            document.getElementById(
                "listaOpcoes"
            );


        dados.categorias.forEach(
            categoria => {

                const botao =
                    document.createElement(
                        "button"
                    );


                botao.classList.add(
                    "botao-opcao-suporte"
                );


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


                lista.appendChild(botao);

            }
        );


    } catch (erro) {

        console.error(
            "Erro ao carregar suporte:",
            erro
        );


        conteudoChatbot.innerHTML = `
            <p>
                Não foi possível carregar o suporte.
                Tente novamente.
            </p>
        `;

    }
}



async function carregarCategoria(
    idCategoria
) {

    try {

        const resposta =
            await fetch(
                `${API_SUPORTE}/${idCategoria}`
            );


        const dados =
            await resposta.json();


        const categoria =
            dados.categoria;


        conteudoChatbot.innerHTML = `
            <button
                class="botao-voltar-suporte"
                id="voltarCategorias"
            >
                ← Voltar
            </button>

            <h4>
                ${categoria.titulo}
            </h4>

            <div id="listaOpcoes"></div>
        `;


        document
            .getElementById(
                "voltarCategorias"
            )
            .addEventListener(
                "click",
                carregarCategorias
            );


        const lista =
            document.getElementById(
                "listaOpcoes"
            );


        Object.entries(
            categoria.acoes
        ).forEach(
            ([id, acao]) => {

                const botao =
                    document.createElement(
                        "button"
                    );


                botao.classList.add(
                    "botao-opcao-suporte"
                );


                botao.textContent =
                    acao.titulo;


                botao.addEventListener(
                    "click",
                    () => {

                        mostrarResposta(
                            idCategoria,
                            categoria,
                            acao
                        );

                    }
                );


                lista.appendChild(botao);

            }
        );


    } catch (erro) {

        console.error(
            "Erro ao carregar categoria:",
            erro
        );


        conteudoChatbot.innerHTML = `
            <p>
                Não foi possível carregar
                essa categoria.
            </p>
        `;

    }
}



function mostrarResposta(
    idCategoria,
    categoria,
    acao
) {

    let link = "";


    if (acao.rota) {

        link = `
            <a
                href="${acao.rota}"
                class="link-suporte"
            >
                Ir para essa página
            </a>
        `;

    }


    conteudoChatbot.innerHTML = `
        <button
            class="botao-voltar-suporte"
            id="voltarOpcoes"
        >
            ← Voltar
        </button>


        <h4>
            ${acao.titulo}
        </h4>


        <p>
            ${acao.mensagem || ""}
        </p>


        ${link}


        <div class="resolvido-suporte">

            <p>
                Isso ajudou a resolver sua dúvida?
            </p>


            <button
                id="resolvidoSim"
                type="button"
            >
                Sim
            </button>


            <button
                id="resolvidoNao"
                type="button"
            >
                Não
            </button>

        </div>
    `;


    document
        .getElementById(
            "voltarOpcoes"
        )
        .addEventListener(
            "click",
            () => {

                carregarCategoria(
                    idCategoria
                );

            }
        );


    document
        .getElementById(
            "resolvidoSim"
        )
        .addEventListener(
            "click",
            () => {

                mostrarMensagemResolvido();

            }
        );


    document
        .getElementById(
            "resolvidoNao"
        )
        .addEventListener(
            "click",
            mostrarMensagemNaoResolvido
        );
}



function mostrarMensagemResolvido() {

    conteudoChatbot.innerHTML = `
        <div class="mensagem-suporte-final">

            <p>
                Ficamos felizes que sua dúvida
                tenha sido resolvida! 😊
            </p>

        </div>


        <button
            class="botao-opcao-suporte"
            id="inicioSuporte"
        >
            Voltar ao início
        </button>
    `;


    document
        .getElementById(
            "inicioSuporte"
        )
        .addEventListener(
            "click",
            carregarCategorias
        );
}



function mostrarMensagemNaoResolvido() {

    conteudoChatbot.innerHTML = `
        <div class="mensagem-suporte-final">

            <p>
                Sentimos que essa orientação
                não resolveu sua dúvida.
                Consulte outras opções de suporte
                para encontrar a ajuda que precisa.
            </p>

        </div>


        <button
            class="botao-opcao-suporte"
            id="outrasOpcoes"
        >
            Ver outras opções
        </button>
    `;


    document
        .getElementById(
            "outrasOpcoes"
        )
        .addEventListener(
            "click",
            carregarCategorias
        );
}