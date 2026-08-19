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

// 1) Frontend chama isso para iniciar o login
router.get('/auth/google', (req, res) => {
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline', // pra receber refresh_token
        prompt: 'consent',
        scope: SCOPES
    });
    res.redirect(url);
});

// 2) Google redireciona pra cá depois do login
router.get('/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    const { tokens } = await oauth2Client.getToken(code);
    req.session.googleTokens = tokens; // guarda na sessão (simples pra começar)
    res.redirect(`${process.env.FRONTEND_URL}/pages/materias.html?google=conectado`);
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

    const drive = google.drive({ version: 'v3', auth });
    const { data } = await drive.files.list({
        pageSize: 30,
        fields: 'files(id, name, mimeType, webViewLink, iconLink)',
        q: "trashed = false"
    });
    res.json(data.files);
});

// ── DRIVE: baixar conteúdo de um arquivo pra importar ──
router.get('/api/drive/arquivo/:id', async (req, res) => {
    const auth = getAuthClient(req);
    if (!auth) return res.status(401).json({ erro: 'Não conectado ao Google' });

    const drive = google.drive({ version: 'v3', auth });
    const meta = await drive.files.get({ fileId: req.params.id, fields: 'name, mimeType' });

    const resposta = await drive.files.get(
        { fileId: req.params.id, alt: 'media' },
        { responseType: 'arraybuffer' }
    );

    const base64 = Buffer.from(resposta.data).toString('base64');
    res.json({
        nome: meta.data.name,
        mimeType: meta.data.mimeType,
        dataURL: `data:${meta.data.mimeType};base64,${base64}`
    });
});

// ── CALENDAR: listar próximos eventos ──
router.get('/api/calendar/eventos', async (req, res) => {
    const auth = getAuthClient(req);
    if (!auth) return res.status(401).json({ erro: 'Não conectado ao Google' });

    const calendar = google.calendar({ version: 'v3', auth });
    const { data } = await calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults: 20,
        singleEvents: true,
        orderBy: 'startTime'
    });
    res.json(data.items);
});

module.exports = router;