const express = require('express');
const { Client } = require('@notionhq/client');
const router = express.Router();

// 1) Frontend chama isso pra iniciar o login
router.get('/auth/notion', (req, res) => {
    const url = `https://api.notion.com/v1/oauth/authorize` +
        `?client_id=${process.env.NOTION_CLIENT_ID}` +
        `&response_type=code` +
        `&owner=user` +
        `&redirect_uri=${encodeURIComponent(process.env.NOTION_REDIRECT_URI)}`;
    res.redirect(url);
});

// 2) Notion redireciona pra cá depois do login
router.get('/auth/notion/callback', async (req, res) => {
    const { code } = req.query;

    try {
        const basicAuth = Buffer.from(
            `${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`
        ).toString('base64');

        const resposta = await fetch('https://api.notion.com/v1/oauth/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${basicAuth}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                grant_type: 'authorization_code',
                code,
                redirect_uri: process.env.NOTION_REDIRECT_URI
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            console.error('Erro ao trocar código por token:', dados);
            return res.redirect(`${process.env.FRONTEND_URL}/src/pages/perfil.html?notion=erro`);
        }

        // guarda o token e infos do workspace na sessão do usuário
        req.session.notionTokens = {
            access_token: dados.access_token,
            workspace_name: dados.workspace_name,
            workspace_icon: dados.workspace_icon,
            bot_id: dados.bot_id
        };

        res.redirect(`${process.env.FRONTEND_URL}/src/pages/perfil.html?notion=conectado`);
    } catch (erro) {
        console.error('Erro no callback do Notion:', erro);
        res.redirect(`${process.env.FRONTEND_URL}/src/pages/perfil.html?notion=erro`);
    }
});

function getNotionClient(req) {
    if (!req.session.notionTokens) return null;
    return new Client({ auth: req.session.notionTokens.access_token });
}

// Status de conexão
router.get('/api/notion/status', (req, res) => {
    res.json({
        conectado: !!req.session.notionTokens,
        workspace: req.session.notionTokens?.workspace_name || null
    });
});

// Desconectar
router.post('/api/notion/desconectar', (req, res) => {
    req.session.notionTokens = null;
    res.json({ ok: true });
});

// Lista as páginas do workspace conectado
router.get('/api/notion/paginas', async (req, res) => {
    const notion = getNotionClient(req);
    if (!notion) return res.status(401).json({ erro: 'Não conectado ao Notion' });

    try {
        const resposta = await notion.search({ filter: { property: 'object', value: 'page' } });
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
router.get('/api/notion/pagina/:id/texto', async (req, res) => {
    const notion = getNotionClient(req);
    if (!notion) return res.status(401).json({ erro: 'Não conectado ao Notion' });

    try {
        const blocos = await notion.blocks.children.list({ block_id: req.params.id, page_size: 100 });
        const texto = blocos.results.map(extrairTextoDoBloco).filter(Boolean).join('\n\n');
        res.json({ texto });
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});

function extrairTextoDoBloco(bloco) {
    const conteudo = bloco[bloco.type];
    if (!conteudo?.rich_text) return '';
    return conteudo.rich_text.map(rt => rt.plain_text).join('');
}

module.exports = router;