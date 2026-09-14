const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../config/firebase");

async function listarMateriasDoUsuario(usuarioId) {
    const resultado = await db
        .collection("materias")
        .where("usuarioId", "==", String(usuarioId))
        .get();

    return resultado.docs.map(documento => ({
        id: documento.id,
        ...documento.data()
    }));
}

async function criarMateriaNoFirestore(usuarioId, dados) {
    const referencia = db.collection("materias").doc();

    const materia = {
        usuarioId: String(usuarioId),
        nome: dados.nome,
        cor: dados.cor || "#1466ff",
        arquivos: 0,
        compartilhada: false,
        criadoEm: FieldValue.serverTimestamp(),
        atualizadoEm: FieldValue.serverTimestamp()
    };

    await referencia.set(materia);

    return {
        id: referencia.id,
        usuarioId: String(usuarioId),
        nome: materia.nome,
        cor: materia.cor,
        arquivos: 0,
        compartilhada: false
    };
}

async function atualizarMateriaNoFirestore(
    usuarioId,
    materiaId,
    dados
) {
    const referencia = db
        .collection("materias")
        .doc(String(materiaId));

    const documento = await referencia.get();

    if (
        !documento.exists ||
        documento.data().usuarioId !== String(usuarioId)
    ) {
        return null;
    }

    const alteracoes = {
        nome: dados.nome,
        cor: dados.cor || "#1466ff",
        atualizadoEm: FieldValue.serverTimestamp()
    };

    await referencia.update(alteracoes);

    return {
        id: documento.id,
        ...documento.data(),
        nome: alteracoes.nome,
        cor: alteracoes.cor
    };
}

async function excluirMateriaNoFirestore(
    usuarioId,
    materiaId
) {
    const referencia = db
        .collection("materias")
        .doc(String(materiaId));

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

async function atualizarCompartilhamentoNoFirestore(
    usuarioId,
    materiaId,
    compartilhada
) {
    const referencia = db
        .collection("materias")
        .doc(String(materiaId));

    const documento = await referencia.get();

    if (
        !documento.exists ||
        documento.data().usuarioId !== String(usuarioId)
    ) {
        return null;
    }

    await referencia.update({
        compartilhada: compartilhada === true,
        atualizadoEm: FieldValue.serverTimestamp()
    });

    return compartilhada === true;
}

module.exports = {
    listarMateriasDoUsuario,
    criarMateriaNoFirestore,
    atualizarMateriaNoFirestore,
    excluirMateriaNoFirestore,
    atualizarCompartilhamentoNoFirestore
};