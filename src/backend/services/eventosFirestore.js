const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../config/firebase");

async function listarEventosDoUsuario(usuarioId) {
    const resultado = await db
        .collection("eventos")
        .where("usuarioId", "==", String(usuarioId))
        .get();

    return resultado.docs.map(documento => ({
        id: documento.id,
        ...documento.data()
    }));
}

async function criarEventoNoFirestore(usuarioId, dados) {
    const referencia = db.collection("eventos").doc();

    const evento = {
        usuarioId: String(usuarioId),
        titulo: dados.titulo,
        categoria: dados.categoria || "Outros",
        descricao: dados.descricao || "",
        data: dados.data,
        criadoEm: FieldValue.serverTimestamp(),
        atualizadoEm: FieldValue.serverTimestamp()
    };

    await referencia.set(evento);

    return {
        id: referencia.id,
        usuarioId: evento.usuarioId,
        titulo: evento.titulo,
        categoria: evento.categoria,
        descricao: evento.descricao,
        data: evento.data
    };
}

async function atualizarEventoNoFirestore(
    usuarioId,
    eventoId,
    dados
) {
    const referencia = db
        .collection("eventos")
        .doc(String(eventoId));

    const documento = await referencia.get();

    if (
        !documento.exists ||
        documento.data().usuarioId !== String(usuarioId)
    ) {
        return null;
    }

    const alteracoes = {
        atualizadoEm: FieldValue.serverTimestamp()
    };

    if (dados.titulo !== undefined) {
        alteracoes.titulo = dados.titulo;
    }

    if (dados.categoria !== undefined) {
        alteracoes.categoria = dados.categoria;
    }

    if (dados.descricao !== undefined) {
        alteracoes.descricao = dados.descricao;
    }

    if (dados.data !== undefined) {
        alteracoes.data = dados.data;
    }

    await referencia.update(alteracoes);

    return {
        id: documento.id,
        ...documento.data(),
        ...alteracoes
    };
}

async function excluirEventoNoFirestore(
    usuarioId,
    eventoId
) {
    const referencia = db
        .collection("eventos")
        .doc(String(eventoId));

    const documento = await referencia.get();

    if (
        !documento.exists ||
        documento.data().usuarioId !== String(usuarioId)
    ) {
        return false;
    }

    await referencia.delete();

    return true;
}

module.exports = {
    listarEventosDoUsuario,
    criarEventoNoFirestore,
    atualizarEventoNoFirestore,
    excluirEventoNoFirestore
};