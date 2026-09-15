const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../config/firebase");

function obterAdministradores(comunidade) {
    return [
        ...new Set([
            String(comunidade.criadorId),
            ...(comunidade.administradores || [])
                .map(String)
        ])
    ];
}

function usuarioEhAdministrador(
    comunidade,
    usuarioId
) {
    return obterAdministradores(comunidade)
        .includes(String(usuarioId));
}

async function listarComunidadesDoUsuario(usuarioId) {
    const resultado = await db
        .collection("comunidades")
        .where(
            "membros",
            "array-contains",
            String(usuarioId)
        )
        .get();

    return resultado.docs.map(documento => {
        const {
            convidados,
            emailsConvidados,
            ...comunidade
        } = documento.data();

        return {
            id: documento.id,
            ...comunidade,
            administradores:
                obterAdministradores(comunidade)
        };
    });
}

async function criarComunidadeNoFirestore(
    usuarioId,
    dados
) {
    const referencia = db
        .collection("comunidades")
        .doc();

    const usuario = String(usuarioId);

    const comunidade = {
        criadorId: usuario,
        membros: [usuario],
        administradores: [usuario],
        nome: dados.nome,
        descricao: dados.descricao,
        categoria: dados.categoria || "Estudo",
        privacidade: dados.privacidade || "Pública",
        foto: dados.foto || null,
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

    if (!documento.exists) {
        return null;
    }

    const comunidade = documento.data();

    if (
        !usuarioEhAdministrador(
            comunidade,
            usuarioId
        )
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
        ...comunidade,
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
        String(documento.data().criadorId) !==
            String(usuarioId)
    ) {
        return false;
    }

    await referencia.delete();

    return true;
}

async function adicionarMembroPorEmail(
    usuarioId,
    comunidadeId,
    emailInformado
) {
    const referencia = db
        .collection("comunidades")
        .doc(String(comunidadeId));

    const documento = await referencia.get();

    if (!documento.exists) {
        return null;
    }

    const comunidade = documento.data();

    if (
        !usuarioEhAdministrador(
            comunidade,
            usuarioId
        )
    ) {
        return null;
    }

    const email = String(emailInformado)
        .trim()
        .toLowerCase();

    const usuariosEncontrados = await db
        .collection("usuarios")
        .where("email", "==", email)
        .limit(1)
        .get();

    if (usuariosEncontrados.empty) {
        return {
            usuarioNaoEncontrado: true
        };
    }

    const usuario = usuariosEncontrados.docs[0];
    const membroId = String(usuario.id);

    if (
        (comunidade.membros || [])
            .map(String)
            .includes(membroId)
    ) {
        return {
            duplicado: true
        };
    }

    await referencia.update({
        membros: FieldValue.arrayUnion(membroId),
        convidados: FieldValue.delete(),
        emailsConvidados: FieldValue.delete(),
        atualizadoEm: FieldValue.serverTimestamp()
    });

    const perfil = usuario.data();

    return {
        id: membroId,
        nome: perfil.nome || "Usuário",
        email: perfil.email || email,
        foto: perfil.foto || null,
        criador: false,
        administrador: false
    };
}

async function entrarNaComunidadePorLink(
    usuarioId,
    comunidadeId
) {
    const referencia = db
        .collection("comunidades")
        .doc(String(comunidadeId));

    const documento = await referencia.get();

    if (!documento.exists) {
        return null;
    }

    const comunidade = documento.data();

    if (
        String(comunidade.privacidade)
            .trim()
            .toLowerCase() !== "pública"
    ) {
        return {
            privada: true
        };
    }

    await referencia.update({
        membros: FieldValue.arrayUnion(
            String(usuarioId)
        ),
        convidados: FieldValue.delete(),
        emailsConvidados: FieldValue.delete(),
        atualizadoEm: FieldValue.serverTimestamp()
    });

    return {
        id: documento.id
    };
}

async function listarMembrosDaComunidade(
    usuarioId,
    comunidadeId
) {
    const referencia = db
        .collection("comunidades")
        .doc(String(comunidadeId));

    const documento = await referencia.get();

    if (!documento.exists) {
        return null;
    }

    const comunidade = documento.data();
    const membrosIds = (
        comunidade.membros || []
    ).map(String);

    if (!membrosIds.includes(String(usuarioId))) {
        return null;
    }

    if (membrosIds.length === 0) {
        return [];
    }

    const administradores =
        obterAdministradores(comunidade);

    const referenciasUsuarios = membrosIds.map(id =>
        db.collection("usuarios").doc(id)
    );

    const documentosUsuarios = await db.getAll(
        ...referenciasUsuarios
    );

    return documentosUsuarios.map(usuario => {
        const perfil = usuario.exists
            ? usuario.data()
            : {};

        return {
            id: usuario.id,
            nome: perfil.nome || "Usuário",
            email: perfil.email || "",
            foto: perfil.foto || null,
            criador:
                String(usuario.id) ===
                String(comunidade.criadorId),
            administrador:
                administradores.includes(
                    String(usuario.id)
                )
        };
    });
}

async function removerMembroDaComunidade(
    usuarioId,
    comunidadeId,
    membroId
) {
    const referencia = db
        .collection("comunidades")
        .doc(String(comunidadeId));

    const documento = await referencia.get();

    if (!documento.exists) {
        return false;
    }

    const comunidade = documento.data();
    const solicitante = String(usuarioId);
    const membro = String(membroId);
    const criador = String(comunidade.criadorId);
    const membros = (
        comunidade.membros || []
    ).map(String);
    const administradores =
        obterAdministradores(comunidade);

    if (
        !usuarioEhAdministrador(
            comunidade,
            solicitante
        )
    ) {
        return false;
    }

    if (membro === criador) {
        return false;
    }

    if (!membros.includes(membro)) {
        return false;
    }

    if (
        administradores.includes(membro) &&
        solicitante !== criador
    ) {
        return false;
    }

    await referencia.update({
        membros: FieldValue.arrayRemove(membro),
        administradores:
            FieldValue.arrayRemove(membro),
        atualizadoEm: FieldValue.serverTimestamp()
    });

    return true;
}

async function sairDaComunidade(
    usuarioId,
    comunidadeId
) {
    const referencia = db
        .collection("comunidades")
        .doc(String(comunidadeId));

    const documento = await referencia.get();

    if (!documento.exists) {
        return false;
    }

    const comunidade = documento.data();
    const usuario = String(usuarioId);
    const membros = (
        comunidade.membros || []
    ).map(String);

    if (
        String(comunidade.criadorId) === usuario
    ) {
        return false;
    }

    if (!membros.includes(usuario)) {
        return false;
    }

    await referencia.update({
        membros: FieldValue.arrayRemove(usuario),
        administradores:
            FieldValue.arrayRemove(usuario),
        atualizadoEm: FieldValue.serverTimestamp()
    });

    return true;
}

async function nomearAdministrador(
    criadorId,
    comunidadeId,
    membroId
) {
    const referencia = db
        .collection("comunidades")
        .doc(String(comunidadeId));

    const documento = await referencia.get();

    if (!documento.exists) {
        return false;
    }

    const comunidade = documento.data();
    const criador = String(criadorId);
    const membro = String(membroId);
    const membros = (
        comunidade.membros || []
    ).map(String);

    if (
        String(comunidade.criadorId) !== criador
    ) {
        return false;
    }

    if (!membros.includes(membro)) {
        return false;
    }

    await referencia.update({
        administradores:
            FieldValue.arrayUnion(membro),
        atualizadoEm: FieldValue.serverTimestamp()
    });

    return true;
}

async function removerAdministrador(
    criadorId,
    comunidadeId,
    administradorId
) {
    const referencia = db
        .collection("comunidades")
        .doc(String(comunidadeId));

    const documento = await referencia.get();

    if (!documento.exists) {
        return false;
    }

    const comunidade = documento.data();
    const criador = String(criadorId);
    const administrador = String(
        administradorId
    );

    if (
        String(comunidade.criadorId) !== criador
    ) {
        return false;
    }

    if (administrador === criador) {
        return false;
    }

    await referencia.update({
        administradores:
            FieldValue.arrayRemove(administrador),
        atualizadoEm: FieldValue.serverTimestamp()
    });

    return true;
}

module.exports = {
    listarComunidadesDoUsuario,
    criarComunidadeNoFirestore,
    atualizarComunidadeNoFirestore,
    excluirComunidadeNoFirestore,
    adicionarMembroPorEmail,
    entrarNaComunidadePorLink,
    listarMembrosDaComunidade,
    removerMembroDaComunidade,
    sairDaComunidade,
    nomearAdministrador,
    removerAdministrador
};