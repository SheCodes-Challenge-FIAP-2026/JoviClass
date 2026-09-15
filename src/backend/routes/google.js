const express = require('express');
const { google } = require('googleapis');
const router = express.Router();

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

const SCOPES = [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/calendar.readonly'
];

const EXPORTACOES_GOOGLE = {
    'application/vnd.google-apps.document': { mime: 'application/pdf', ext: 'pdf' },
    'application/vnd.google-apps.spreadsheet': { mime: 'application/pdf', ext: 'pdf' },
    'application/vnd.google-apps.presentation': { mime: 'application/pdf', ext: 'pdf' },
    'application/vnd.google-apps.drawing': { mime: 'image/png', ext: 'png' }
};

// 1) Frontend chama isso para iniciar o login
router.get('/auth/google', (req, res) => {
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: SCOPES
    });
    res.redirect(url);
});

// 2) Google redireciona pra cá depois do login
router.get('/auth/google/callback', async (req, res) => {
    try {
        const { code } = req.query;
        const { tokens } = await oauth2Client.getToken(code);
        req.session.googleTokens = tokens;
        res.redirect(`${process.env.FRONTEND_URL}/src/pages/perfil.html?google=conectado`);
    } catch (erro) {
        console.error('Erro no callback do Google:', erro?.response?.data || erro);
        res.redirect(`${process.env.FRONTEND_URL}/src/pages/perfil.html?google=erro`);
    }
});

function getAuthClient(req) {
    if (!req.session.googleTokens) return null;
    const client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );
    client.setCredentials(req.session.googleTokens);
    return client;
}

// Status de conexão
router.get('/api/google/status', (req, res) => {
    res.json({ conectado: !!req.session.googleTokens });
});

// ── DRIVE: listar arquivos do usuário ──
router.get('/api/drive/arquivos', async (req, res) => {
    const auth = getAuthClient(req);
    if (!auth) return res.status(401).json({ erro: 'Não conectado ao Google' });

    try {
        const drive = google.drive({ version: 'v3', auth });
        const { data } = await drive.files.list({
            pageSize: 30,
            fields: 'files(id, name, mimeType, webViewLink, iconLink)',
            q: "trashed = false"
        });
        res.json(data.files);
    } catch (erro) {
        console.error('Erro ao listar arquivos do Drive:', erro?.response?.data || erro);
        res.status(500).json({
            erro: erro?.response?.data?.error?.message || 'Falha ao listar os arquivos do Drive.'
        });
    }
});

// ── DRIVE: baixar conteúdo de um arquivo pra importar ──
router.get('/api/drive/arquivo/:id', async (req, res) => {
    const auth = getAuthClient(req);
    if (!auth) return res.status(401).json({ erro: 'Não conectado ao Google' });

    try {
        const drive = google.drive({ version: 'v3', auth });

        const meta = await drive.files.get({
            fileId: req.params.id,
            fields: 'name, mimeType'
        });

        const exportacao = EXPORTACOES_GOOGLE[meta.data.mimeType];

        let nome = meta.data.name;
        let mimeType = meta.data.mimeType;
        let resposta;

        if (exportacao) {
            // Docs/Sheets/Slides: precisa exportar, não baixar
            mimeType = exportacao.mime;

            if (!nome.toLowerCase().endsWith(`.${exportacao.ext}`)) {
                nome = `${nome}.${exportacao.ext}`;
            }

            resposta = await drive.files.export(
                { fileId: req.params.id, mimeType },
                { responseType: 'arraybuffer' }
            );
        } else if (meta.data.mimeType.startsWith('application/vnd.google-apps.')) {
            return res.status(415).json({
                erro: 'Esse tipo de arquivo do Google não pode ser importado.'
            });
        } else {
            resposta = await drive.files.get(
                { fileId: req.params.id, alt: 'media' },
                { responseType: 'arraybuffer' }
            );
        }

        const base64 = Buffer.from(resposta.data).toString('base64');

        res.json({
            nome,
            mimeType,
            dataURL: `data:${mimeType};base64,${base64}`
        });
    } catch (erro) {
        console.error('Erro ao importar arquivo do Drive:', erro?.response?.data || erro);
        res.status(500).json({
            erro: erro?.response?.data?.error?.message || 'Falha ao baixar o arquivo do Drive.'
        });
    }
});

// ── CALENDAR: listar próximos eventos ──
router.get('/api/calendar/eventos', async (req, res) => {
    const auth = getAuthClient(req);
    if (!auth) return res.status(401).json({ erro: 'Não conectado ao Google' });

    try {
        const calendar = google.calendar({ version: 'v3', auth });
        const { data } = await calendar.events.list({
            calendarId: 'primary',
            timeMin: new Date().toISOString(),
            maxResults: 20,
            singleEvents: true,
            orderBy: 'startTime'
        });
        res.json(data.items);
    } catch (erro) {
        console.error('Erro ao listar eventos do Calendar:', erro?.response?.data || erro);
        res.status(500).json({
            erro: erro?.response?.data?.error?.message || 'Falha ao listar os eventos.'
        });
    }
});

module.exports = router;