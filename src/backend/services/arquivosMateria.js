const crypto = require("crypto");

const {
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand
} = require("@aws-sdk/client-s3");

const {
    FieldValue
} = require("firebase-admin/firestore");

const {
    db
} = require("../config/firebase");

const {
    r2,
    R2_BUCKET_NAME
} = require("../config/r2");

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

function limparNomeArquivo(nome) {
    return String(nome)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function listarArquivosDaMateria(
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
        .collection("arquivos")
        .orderBy("criadoEm", "desc")
        .get();

    return resultado.docs.map(documento => ({
        id: documento.id,
        ...documento.data()
    }));
}

async function salvarArquivoDaMateria(
    usuarioId,
    materiaId,
    arquivo
) {
    const materia = await buscarMateriaDoUsuario(
        usuarioId,
        materiaId
    );

    if (!materia) {
        return null;
    }

    const id = crypto.randomUUID();
    const nomeSeguro = limparNomeArquivo(
        arquivo.originalname
    );

    const caminhoR2 =
        `usuarios/${usuarioId}/materias/${materiaId}/${id}-${nomeSeguro}`;

    await r2.send(
        new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: caminhoR2,
            Body: arquivo.buffer,
            ContentType: arquivo.mimetype
        })
    );

    const dados = {
        usuarioId: String(usuarioId),
        materiaId: String(materiaId),
        nome: arquivo.originalname,
        tipo: arquivo.mimetype,
        tamanho: arquivo.size,
        caminhoR2,
        criadoEm: FieldValue.serverTimestamp()
    };

    await materia
        .collection("arquivos")
        .doc(id)
        .set(dados);

    await materia.update({
        arquivos: FieldValue.increment(1),
        atualizadoEm: FieldValue.serverTimestamp()
    });

    return {
        id,
        nome: dados.nome,
        tipo: dados.tipo,
        tamanho: dados.tamanho
    };
}

async function buscarArquivoDaMateria(
    usuarioId,
    materiaId,
    arquivoId
) {
    const materia = await buscarMateriaDoUsuario(
        usuarioId,
        materiaId
    );

    if (!materia) {
        return null;
    }

    const referencia = materia
        .collection("arquivos")
        .doc(String(arquivoId));

    const documento = await referencia.get();

    if (!documento.exists) {
        return null;
    }

    const dados = documento.data();

    const objeto = await r2.send(
        new GetObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: dados.caminhoR2
        })
    );

    return {
        nome: dados.nome,
        tipo: dados.tipo,
        conteudo: objeto.Body
    };
}

async function excluirArquivoDaMateria(
    usuarioId,
    materiaId,
    arquivoId
) {
    const materia = await buscarMateriaDoUsuario(
        usuarioId,
        materiaId
    );

    if (!materia) {
        return false;
    }

    const referencia = materia
        .collection("arquivos")
        .doc(String(arquivoId));

    const documento = await referencia.get();

    if (!documento.exists) {
        return false;
    }

    await r2.send(
        new DeleteObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: documento.data().caminhoR2
        })
    );

    await referencia.delete();

    await materia.update({
        arquivos: FieldValue.increment(-1),
        atualizadoEm: FieldValue.serverTimestamp()
    });

    return true;
}

module.exports = {
    listarArquivosDaMateria,
    salvarArquivoDaMateria,
    buscarArquivoDaMateria,
    excluirArquivoDaMateria
};