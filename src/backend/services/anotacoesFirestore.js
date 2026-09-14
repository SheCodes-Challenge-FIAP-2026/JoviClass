const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../config/firebase");

async function buscarMateriaDoUsuario(
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
        return null;
    }

    return referencia;
}

async function listarAnotacoesDaMateria(
    usuarioId,
    materiaId
) {
    const materia = await buscarMateriaDoUsuario(
        usuarioId,
        materiaId
    );

    if (!materia) {
        return null;
    }

    const resultado = await materia
        .collection("anotacoes")
        .orderBy("criadoEm", "desc")
        .get();

    return resultado.docs.map(documento => ({
        id: documento.id,
        ...documento.data()
    }));
}

async function criarAnotacaoNoFirestore(
    usuarioId,
    materiaId,
    dados
) {
    const materia = await buscarMateriaDoUsuario(
        usuarioId,
        materiaId
    );

    if (!materia) {
        return null;
    }

    const referencia = materia
        .collection("anotacoes")
        .doc();

    const anotacao = {
        titulo: dados.titulo,
        texto: dados.texto,
        criadoEm: FieldValue.serverTimestamp(),
        atualizadoEm: FieldValue.serverTimestamp()
    };

    await referencia.set(anotacao);

    return {
        id: referencia.id,
        titulo: anotacao.titulo,
        texto: anotacao.texto
    };
}

async function atualizarAnotacaoNoFirestore(
    usuarioId,
    materiaId,
    anotacaoId,
    dados
) {
    const materia = await buscarMateriaDoUsuario(
        usuarioId,
        materiaId
    );

    if (!materia) {
        return null;
    }

    const referencia = materia
        .collection("anotacoes")
        .doc(String(anotacaoId));

    const documento = await referencia.get();

    if (!documento.exists) {
        return null;
    }

    const alteracoes = {
        titulo: dados.titulo,
        texto: dados.texto,
        atualizadoEm: FieldValue.serverTimestamp()
    };

    await referencia.update(alteracoes);

    return {
        id: documento.id,
        ...documento.data(),
        ...alteracoes
    };
}

async function excluirAnotacaoNoFirestore(
    usuarioId,
    materiaId,
    anotacaoId
) {
    const materia = await buscarMateriaDoUsuario(
        usuarioId,
        materiaId
    );

    if (!materia) {
        return false;
    }

    const referencia = materia
        .collection("anotacoes")
        .doc(String(anotacaoId));

    const documento = await referencia.get();

    if (!documento.exists) {
        return false;
    }

    await referencia.delete();

    return true;
}

module.exports = {
    listarAnotacoesDaMateria,
    criarAnotacaoNoFirestore,
    atualizarAnotacaoNoFirestore,
    excluirAnotacaoNoFirestore
};