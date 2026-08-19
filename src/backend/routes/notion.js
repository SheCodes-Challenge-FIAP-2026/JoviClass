const express = require('express');
const { Client } = require('@notionhq/client');
const router = express.Router();

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// Lista as páginas compartilhadas com a integração
router.get('/paginas', async (req, res) => {
    try {
        const resposta = await notion.search({
            filter: { property: 'object', value: 'page' }
        });

        const paginas = resposta.results.map(p => ({
            id: p.id,
            titulo:
                p.properties?.title?.title?.[0]?.plain_text ||
                p.properties?.Name?.title?.[0]?.plain_text ||
                '(Sem título)',
            url: p.url
        }));

        res.json(paginas);
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});

// Converte os blocos de uma página em texto simples
router.get('/pagina/:id/texto', async (req, res) => {
    try {
        const blocos = await notion.blocks.children.list({ block_id: req.params.id, page_size: 100 });

        const texto = blocos.results
            .map(bloco => extrairTextoDoBloco(bloco))
            .filter(Boolean)
            .join('\n\n');

        res.json({ texto });
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});

function extrairTextoDoBloco(bloco) {
    const tipo = bloco.type;
    const conteudo = bloco[tipo];
    if (!conteudo?.rich_text) return '';
    return conteudo.rich_text.map(rt => rt.plain_text).join('');
}

module.exports = router;
