const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../config/firebase");

async function listarTarefasDoUsuario(usuarioId) {
    const resultado = await db
        .collection("tarefas")
        .where("usuarioId", "==", String(usuarioId))
        .get();

    return resultado.docs.map(documento => ({
        id: documento.id,
        ...documento.data()
    }));
}

async function criarTarefaNoFirestore(usuarioId, dados) {
    const referencia = db.collection("tarefas").doc();

    const tarefa = {
        usuarioId: String(usuarioId),
        texto: dados.texto,
        materia: dados.materia || "",
        data: dados.data || "",
        prioridade: dados.prioridade || "media",
        concluida: false,
        criadoEm: FieldValue.serverTimestamp(),
        atualizadoEm: FieldValue.serverTimestamp()
    };

    await referencia.set(tarefa);

    return {
        id: referencia.id,
        usuarioId: tarefa.usuarioId,
        texto: tarefa.texto,
        materia: tarefa.materia,
        data: tarefa.data,
        prioridade: tarefa.prioridade,
        concluida: tarefa.concluida
    };
}

async function atualizarTarefaNoFirestore(
    usuarioId,
    tarefaId,
    dados
) {
    const referencia = db
        .collection("tarefas")
        .doc(String(tarefaId));

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

    if (dados.texto !== undefined) {
        alteracoes.texto = dados.texto;
    }

    if (dados.materia !== undefined) {
        alteracoes.materia = dados.materia;
    }

    if (dados.data !== undefined) {
        alteracoes.data = dados.data;
    }

    if (dados.prioridade !== undefined) {
        alteracoes.prioridade = dados.prioridade;
    }

    if (dados.concluida !== undefined) {
        alteracoes.concluida = dados.concluida === true;
    }

    await referencia.update(alteracoes);

    return {
        id: documento.id,
        ...documento.data(),
        ...alteracoes
    };
}

async function excluirTarefaNoFirestore(
    usuarioId,
    tarefaId
) {
    const referencia = db
        .collection("tarefas")
        .doc(String(tarefaId));

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
    listarTarefasDoUsuario,
    criarTarefaNoFirestore,
    atualizarTarefaNoFirestore,
    excluirTarefaNoFirestore
};