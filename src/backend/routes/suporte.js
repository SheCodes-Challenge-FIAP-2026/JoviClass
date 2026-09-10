const express = require("express");
const path = require("path");
const fs = require("fs");

const router = express.Router();

const caminhoSuporte = path.join(
    __dirname,
    "../data/suporte.json"
);


function lerSuporte() {

    const dados = fs.readFileSync(
        caminhoSuporte,
        "utf8"
    );

    return JSON.parse(dados);
}


router.get("/api/suporte", (req, res) => {

    try {

        const suporte = lerSuporte();

        const categorias = Object.entries(suporte).map(
            ([id, categoria]) => ({
                id: id,
                titulo: categoria.titulo
            })
        );

        return res.json({
            sucesso: true,
            categorias: categorias
        });

    } catch (erro) {

        console.error(
            "Erro ao carregar suporte:",
            erro
        );

        return res.status(500).json({
            sucesso: false,
            erro: "Não foi possível carregar o suporte."
        });
    }
});

router.get(
    "/api/suporte/:categoria",
    (req, res) => {

        try {

            const suporte = lerSuporte();

            const idCategoria =
                req.params.categoria;

            const categoria =
                suporte[idCategoria];


            if (!categoria) {

                return res.status(404).json({
                    sucesso: false,
                    erro: "Categoria não encontrada."
                });
            }


            return res.json({
                sucesso: true,
                categoria: categoria
            });

        } catch (erro) {

            console.error(
                "Erro ao carregar categoria:",
                erro
            );

            return res.status(500).json({
                sucesso: false,
                erro: "Não foi possível carregar a categoria."
            });
        }
    }
);


module.exports = router;