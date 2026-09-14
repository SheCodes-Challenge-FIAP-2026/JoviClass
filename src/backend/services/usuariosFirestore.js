const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../config/firebase");

async function salvarPerfilNoFirestore(usuario) {
  const perfil = {
    nome: usuario.nome || "",
    curso: usuario.curso || "",
    email: usuario.email || "",
    foto: usuario.foto || null,
    instituicao: usuario.instituicao || null,
    provedor: usuario.provedor || "email",
    emailVerificado: usuario.emailVerificado === true,
    atualizadoEm: FieldValue.serverTimestamp()
  };

  await db
    .collection("usuarios")
    .doc(String(usuario.id))
    .set(perfil, { merge: true });
}

async function buscarPerfilNoFirestore(usuarioId) {
    const documento = await db
        .collection("usuarios")
        .doc(String(usuarioId))
        .get();

    if (!documento.exists) {
        return null;
    }

    return {
        id: documento.id,
        ...documento.data()
    };
}

module.exports = {
    salvarPerfilNoFirestore,
    buscarPerfilNoFirestore
};