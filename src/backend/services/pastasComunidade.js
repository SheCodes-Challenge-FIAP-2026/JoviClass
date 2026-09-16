const { FieldValue } = require("firebase-admin/firestore");
const crypto = require("crypto");
const { GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const { db } = require("../config/firebase");
const { r2, R2_BUCKET_NAME } = require("../config/r2");

async function obterComunidadeParaMembro(usuarioId, comunidadeId) {
    const referencia = db.collection("comunidades").doc(String(comunidadeId));
    const documento = await referencia.get();

    if (!documento.exists) return null;

    const comunidade = documento.data();
    const membros = (comunidade.membros || []).map(String);

    if (!membros.includes(String(usuarioId))) return null;

    return { referencia, comunidade };
}

function usuarioEhAdministrador(comunidade, usuarioId) {
    return [
        String(comunidade.criadorId),
        ...(comunidade.administradores || []).map(String)
    ].includes(String(usuarioId));
}

function limparNomeArquivo(nome) {
    return String(nome)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function listarPastasDaComunidade(usuarioId, comunidadeId) {
    const acesso = await obterComunidadeParaMembro(usuarioId, comunidadeId);
    if (!acesso) return null;

    const compartilhamentos = await acesso.referencia
        .collection("pastas")
        .orderBy("compartilhadoEm", "desc")
        .get();

    if (compartilhamentos.empty) return [];

    const materias = await db.getAll(
        ...compartilhamentos.docs.map(doc =>
            db.collection("materias").doc(String(doc.data().materiaId || doc.id))
        )
    );

    return materias
        .filter(doc => doc.exists && doc.data().compartilhada === true)
        .map(doc => ({
            id: doc.id,
            nome: doc.data().nome,
            cor: doc.data().cor || "#1466ff",
            arquivos: Number(doc.data().arquivos || 0),
            donoId: String(doc.data().usuarioId),
            podeRemover:
                String(doc.data().usuarioId) === String(usuarioId) ||
                usuarioEhAdministrador(acesso.comunidade, usuarioId),
            podeAdicionar: usuarioEhAdministrador(acesso.comunidade, usuarioId)
        }));
}

async function adicionarPastaNaComunidade(usuarioId, comunidadeId, materiaId) {
    const acesso = await obterComunidadeParaMembro(usuarioId, comunidadeId);
    if (!acesso) return { semPermissao: true };

    const materiaRef = db.collection("materias").doc(String(materiaId));
    const materiaDoc = await materiaRef.get();

    if (!materiaDoc.exists || String(materiaDoc.data().usuarioId) !== String(usuarioId)) {
        return { materiaNaoEncontrada: true };
    }

    if (materiaDoc.data().compartilhada !== true) {
        return { naoCompartilhada: true };
    }

    await acesso.referencia.collection("pastas").doc(String(materiaId)).set({
        materiaId: String(materiaId),
        donoId: String(usuarioId),
        compartilhadoEm: FieldValue.serverTimestamp()
    });

    return {
        id: materiaDoc.id,
        nome: materiaDoc.data().nome,
        cor: materiaDoc.data().cor || "#1466ff",
        arquivos: Number(materiaDoc.data().arquivos || 0),
        donoId: String(usuarioId),
        podeRemover: true
    };
}

async function removerPastaDaComunidade(usuarioId, comunidadeId, materiaId) {
    const acesso = await obterComunidadeParaMembro(usuarioId, comunidadeId);
    if (!acesso) return false;

    const pastaRef = acesso.referencia.collection("pastas").doc(String(materiaId));
    const pastaDoc = await pastaRef.get();
    if (!pastaDoc.exists) return false;

    const administradores = [
        String(acesso.comunidade.criadorId),
        ...(acesso.comunidade.administradores || []).map(String)
    ];
    const podeRemover =
        String(pastaDoc.data().donoId) === String(usuarioId) ||
        administradores.includes(String(usuarioId));

    if (!podeRemover) return false;

    await pastaRef.delete();
    return true;
}

async function obterMateriaCompartilhada(usuarioId, comunidadeId, materiaId) {
    const acesso = await obterComunidadeParaMembro(usuarioId, comunidadeId);
    if (!acesso) return null;

    const pastaDoc = await acesso.referencia
        .collection("pastas")
        .doc(String(materiaId))
        .get();
    if (!pastaDoc.exists) return null;

    const materiaRef = db.collection("materias").doc(String(materiaId));
    const materiaDoc = await materiaRef.get();
    if (!materiaDoc.exists || materiaDoc.data().compartilhada !== true) return null;

    return materiaRef;
}

async function listarArquivosDaPastaCompartilhada(usuarioId, comunidadeId, materiaId) {
    const materia = await obterMateriaCompartilhada(usuarioId, comunidadeId, materiaId);
    if (!materia) return null;

    const resultado = await materia.collection("arquivos").orderBy("criadoEm", "desc").get();
    return resultado.docs.map(doc => ({
        id: doc.id,
        nome: doc.data().nome,
        tipo: doc.data().tipo,
        tamanho: doc.data().tamanho
    }));
}

async function buscarArquivoDaPastaCompartilhada(usuarioId, comunidadeId, materiaId, arquivoId) {
    const materia = await obterMateriaCompartilhada(usuarioId, comunidadeId, materiaId);
    if (!materia) return null;

    const arquivoDoc = await materia.collection("arquivos").doc(String(arquivoId)).get();
    if (!arquivoDoc.exists) return null;

    const dados = arquivoDoc.data();
    const objeto = await r2.send(new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: dados.caminhoR2
    }));

    return { nome: dados.nome, tipo: dados.tipo, conteudo: objeto.Body };
}

async function salvarArquivoNaPastaCompartilhada(usuarioId, comunidadeId, materiaId, arquivo) {
    const acesso = await obterComunidadeParaMembro(usuarioId, comunidadeId);
    if (!acesso || !usuarioEhAdministrador(acesso.comunidade, usuarioId)) {
        return { semPermissao: true };
    }

    const materia = await obterMateriaCompartilhada(usuarioId, comunidadeId, materiaId);
    if (!materia) return { pastaNaoEncontrada: true };

    const materiaDoc = await materia.get();
    const donoId = String(materiaDoc.data().usuarioId);
    const id = crypto.randomUUID();
    const nomeSeguro = limparNomeArquivo(arquivo.originalname);
    const caminhoR2 = `usuarios/${donoId}/materias/${materiaId}/${id}-${nomeSeguro}`;

    await r2.send(new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: caminhoR2,
        Body: arquivo.buffer,
        ContentType: arquivo.mimetype
    }));

    const dados = {
        usuarioId: donoId,
        materiaId: String(materiaId),
        nome: arquivo.originalname,
        tipo: arquivo.mimetype,
        tamanho: arquivo.size,
        caminhoR2,
        enviadoPor: String(usuarioId),
        enviadoPelaComunidade: String(comunidadeId),
        criadoEm: FieldValue.serverTimestamp()
    };

    await materia.collection("arquivos").doc(id).set(dados);
    await materia.update({
        arquivos: FieldValue.increment(1),
        atualizadoEm: FieldValue.serverTimestamp()
    });

    return { id, nome: dados.nome, tipo: dados.tipo, tamanho: dados.tamanho };
}

module.exports = {
    listarPastasDaComunidade,
    adicionarPastaNaComunidade,
    removerPastaDaComunidade,
    listarArquivosDaPastaCompartilhada,
    buscarArquivoDaPastaCompartilhada,
    salvarArquivoNaPastaCompartilhada
};
