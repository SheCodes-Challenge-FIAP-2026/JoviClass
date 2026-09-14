const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../config/firebase");

async function listarComunidadesDoUsuario(usuarioId) {
    const resultado = await db
        .collection("comunidades")
        .where(
            "membros",
            "array-contains",
            String(usuarioId)
        )
        .get();

    return resultado.docs.map(documento => ({
        id: documento.id,
        ...documento.data()
    }));
}

async function criarComunidadeNoFirestore(usuarioId, dados) {
    const referencia = db
        .collection("comunidades")
        .doc();

    const comunidade = {
        criadorId: String(usuarioId),
        membros: [String(usuarioId)],
        nome: dados.nome,
        descricao: dados.descricao,
        categoria: dados.categoria || "Estudo",
        privacidade: dados.privacidade || "Pública",
        foto: dados.foto || null,
        convidados: [],
        regras: dados.regras || [],
        criadoEm: FieldValue.serverTimestamp(),
        atualizadoEm: FieldValue.serverTimestamp()
    };

    await referencia.set(comunidade);

    return {
        id: referencia.id,
        ...comunidade
    };
}

async function atualizarComunidadeNoFirestore(
    usuarioId,
    comunidadeId,
    dados
) {
    const referencia = db
        .collection("comunidades")
        .doc(String(comunidadeId));

    const documento = await referencia.get();

    if (
        !documento.exists ||
        documento.data().criadorId !== String(usuarioId)
    ) {
        return null;
    }

    const alteracoes = {
        atualizadoEm: FieldValue.serverTimestamp()
    };

    if (dados.nome !== undefined) {
        alteracoes.nome = dados.nome;
    }

    if (dados.descricao !== undefined) {
        alteracoes.descricao = dados.descricao;
    }

    if (dados.categoria !== undefined) {
        alteracoes.categoria = dados.categoria;
    }

    if (dados.privacidade !== undefined) {
        alteracoes.privacidade = dados.privacidade;
    }

    if (dados.foto !== undefined) {
        alteracoes.foto = dados.foto;
    }

    await referencia.update(alteracoes);

    return {
        id: documento.id,
        ...documento.data(),
        ...alteracoes
    };
}

async function excluirComunidadeNoFirestore(
    usuarioId,
    comunidadeId
) {
    const referencia = db
        .collection("comunidades")
        .doc(String(comunidadeId));

    const documento = await referencia.get();

    if (
        !documento.exists ||
        documento.data().criadorId !== String(usuarioId)
    ) {
        return false;
    }

    await referencia.delete();

    return true;
}

async function criarConviteNaComunidade(
    criadorId,
    comunidadeId,
    emailConvidado
) {
    const referencia = db
        .collection("comunidades")
        .doc(String(comunidadeId));

    const documento = await referencia.get();

    if (
        !documento.exists ||
        documento.data().criadorId !== String(criadorId)
    ) {
        return null;
    }

    const comunidade = documento.data();
    const email = String(emailConvidado).toLowerCase();

    const jaConvidado = (
        comunidade.emailsConvidados || []
    ).includes(email);

    if (jaConvidado) {
        return {
            duplicado: true
        };
    }

    await referencia.update({
        emailsConvidados: FieldValue.arrayUnion(email),

        convidados: FieldValue.arrayUnion({
            email,
            status: "pendente"
        }),

        atualizadoEm: FieldValue.serverTimestamp()
    });

    return {
        email,
        status: "pendente"
    };
}


module.exports = {
    listarComunidadesDoUsuario,
    criarComunidadeNoFirestore,
    atualizarComunidadeNoFirestore,
    excluirComunidadeNoFirestore,
    criarConviteNaComunidade
};