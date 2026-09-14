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

module.exports = {
    listarMateriasDoUsuario,
    criarMateriaNoFirestore
};