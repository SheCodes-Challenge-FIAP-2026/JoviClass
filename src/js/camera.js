const videoElemento = document.getElementById("video");
const botaoScanear = document.getElementById("btn-texto");
const resultado = document.getElementById("saida");
const canvas = document.getElementById("canvas");

/* ── Duplicidade de fotos (hash perceptual simples, persistido no localStorage) ── */
const CHAVE_HASHES = "jovi_hashes_fotos";
let hashesSalvos = JSON.parse(localStorage.getItem(CHAVE_HASHES) || "[]");

function salvarHashesNoStorage() {
    localStorage.setItem(CHAVE_HASHES, JSON.stringify(hashesSalvos));
}

function gerarHashSimples(context, width, height) {
    const pequena = document.createElement("canvas");
    pequena.width = 8;
    pequena.height = 8;
    pequena.getContext("2d").drawImage(context.canvas, 0, 0, 8, 8);
    const dados = pequena.getContext("2d").getImageData(0, 0, 8, 8).data;
    let soma = 0, valores = [];
    for (let i = 0; i < dados.length; i += 4) {
        const cinza = (dados[i] + dados[i + 1] + dados[i + 2]) / 3;
        valores.push(cinza);
        soma += cinza;
    }
    const media = soma / valores.length;
    return valores.map(v => v > media ? "1" : "0").join("");
}

function distanciaHamming(a, b) {
    let dif = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) dif++;
    return dif;
}

// Mostra o modal de "foto duplicada" e resolve true/false conforme o botão clicado
function confirmarDuplicidade() {
    return new Promise((resolve) => {
        const overlayDup = document.getElementById("overlayDuplicada");
        overlayDup.classList.add("show");

        function limpar() {
            document.getElementById("cancelarDuplicadaBtn").removeEventListener("click", onCancelar);
            document.getElementById("confirmarDuplicadaBtn").removeEventListener("click", onConfirmar);
        }

        function onCancelar() {
            overlayDup.classList.remove("show");
            limpar();
            resolve(false);
        }

        function onConfirmar() {
            overlayDup.classList.remove("show");
            limpar();
            resolve(true);
        }

        document.getElementById("cancelarDuplicadaBtn").addEventListener("click", onCancelar);
        document.getElementById("confirmarDuplicadaBtn").addEventListener("click", onConfirmar);
    });
}

/* ── IndexedDB (mesma base usada em paginaMateria.js, para os arquivos aparecerem lá) ── */
const DB_NAME = "JoviClassDB";
const DB_VERSION = 1;
const STORE_NAME = "arquivos";
let db = null;

function abrirDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = (e) => {
            const d = e.target.result;
            if (!d.objectStoreNames.contains(STORE_NAME)) {
                d.createObjectStore(STORE_NAME, { keyPath: "chaveId" });
            }
        };

        req.onsuccess = (e) => {
            db = e.target.result;
            resolve(db);
        };

        req.onerror = () => reject(req.error);
    });
}

function dbPut(obj) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const request = tx.objectStore(STORE_NAME).put(obj);
        request.onsuccess = resolve;
        tx.onerror = () => reject(tx.error);
    });
}

abrirDB().catch(erro => console.error("Não foi possível abrir o IndexedDB:", erro));

// Salva a foto capturada dentro dos arquivos da matéria escolhida
async function salvarImagemNaMateria(materiaId, dataURL, nomeArquivo) {
    const chaveItens = `arquivos_${materiaId}`;
    const itens = JSON.parse(localStorage.getItem(chaveItens) || "[]");

    const id = Date.now() + Math.random();
    const chaveId = `${materiaId}_${id}`;

    if (db) {
        await dbPut({ chaveId, dataURL, mimeType: "image/jpeg" });
    }

    itens.push({
        id,
        nome: nomeArquivo,
        tipo: "arquivo",
        ext: "JPG",
        mimeType: "image/jpeg",
        data: new Date().toLocaleDateString("pt-BR")
    });

    localStorage.setItem(chaveItens, JSON.stringify(itens));

    const materias = JSON.parse(localStorage.getItem("materias") || "[]");
    const m = materias.find(x => x.id == materiaId);
    if (m) {
        m.arquivos = itens.length;
        localStorage.setItem("materias", JSON.stringify(materias));
    }
}

async function configurarCamera() {
    try {
        const midia = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: false
        });
        videoElemento.srcObject = midia;

        let zoomAtual = 1;
        let ajustandoZoom = false;

        function calcularAreaDeConteudo(video) {
            const pequeno = document.createElement("canvas");
            pequeno.width = 160;
            pequeno.height = 120;
            const ctx = pequeno.getContext("2d");
            ctx.drawImage(video, 0, 0, 160, 120);
            const dados = ctx.getImageData(0, 0, 160, 120).data;

            let minX = 160, maxX = 0, minY = 120, maxY = 0;
            const limiarContraste = 40;

            for (let y = 1; y < 119; y++) {
                for (let x = 1; x < 159; x++) {
                    const i = (y * 160 + x) * 4;
                    const iDir = (y * 160 + (x + 1)) * 4;
                    const iBaixo = ((y + 1) * 160 + x) * 4;
                    const atual = dados[i];
                    const diffX = Math.abs(atual - dados[iDir]);
                    const diffY = Math.abs(atual - dados[iBaixo]);
                    if (diffX + diffY > limiarContraste) {
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
            }

            const areaConteudo = Math.max(0, (maxX - minX)) * Math.max(0, (maxY - minY));
            return areaConteudo / (160 * 120);
        }

        async function ajustarZoomAutomatico() {
            if (ajustandoZoom) return;
            ajustandoZoom = true;

            const proporcao = calcularAreaDeConteudo(videoElemento);
            const alvoMin = 0.55;
            const alvoMax = 0.85;

            const track = videoElemento.srcObject.getVideoTracks()[0];
            const capacidades = track.getCapabilities();

            if (capacidades.zoom) {
                if (proporcao < alvoMin && zoomAtual < capacidades.zoom.max) {
                    zoomAtual = Math.min(capacidades.zoom.max, zoomAtual + capacidades.zoom.step);
                    await track.applyConstraints({ advanced: [{ zoom: zoomAtual }] });
                } else if (proporcao > alvoMax && zoomAtual > capacidades.zoom.min) {
                    zoomAtual = Math.max(capacidades.zoom.min, zoomAtual - capacidades.zoom.step);
                    await track.applyConstraints({ advanced: [{ zoom: zoomAtual }] });
                }
            }

            ajustandoZoom = false;
        }

        videoElemento.onloadedmetadata = () => {
            videoElemento.play();
            setInterval(ajustarZoomAutomatico, 800);
        };
    } catch (erro) {
        resultado.classList.remove("hidden");
        resultado.innerText = `Erro ao acessar a câmera: ${erro.message}`;
    }
}

configurarCamera();

/* ── Correção de iluminação ── */
function corrigirIluminacao(context, width, height) {
    const imgData = context.getImageData(0, 0, width, height);
    const dados = imgData.data;
    let min = 255, max = 0;

    for (let i = 0; i < dados.length; i += 4) {
        const brilho = (dados[i] + dados[i + 1] + dados[i + 2]) / 3;
        if (brilho < min) min = brilho;
        if (brilho > max) max = brilho;
    }

    const alcance = max - min || 1;
    for (let i = 0; i < dados.length; i += 4) {
        for (let c = 0; c < 3; c++) {
            dados[i + c] = ((dados[i + c] - min) / alcance) * 255;
        }
    }

    context.putImageData(imgData, 0, 0);
}

botaoScanear.onclick = async () => {
    botaoScanear.disabled = true;
    resultado.classList.remove("hidden");
    resultado.innerText = "Fazendo a leitura... aguarde";

    const context = canvas.getContext("2d");

    canvas.width = videoElemento.videoWidth || 640;
    canvas.height = videoElemento.videoHeight || 480;

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.filter = "contrast(1.3) grayscale(1)";
    context.drawImage(videoElemento, 0, 0, canvas.width, canvas.height);
    corrigirIluminacao(context, canvas.width, canvas.height);

    try {
        const { data: { text } } = await Tesseract.recognize(canvas, "por");
        const textoFinal = text.trim();
        resultado.innerText = textoFinal.length > 0
            ? textoFinal
            : "Não foi possível identificar o texto";

        try {
            const imagemBase64 = canvas.toDataURL("image/jpeg", 0.8).split(",")[1];

            const respIA = await fetch("http://localhost:3000/identificar-imagem", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ imagemBase64 })
            });

            if (respIA.ok) {
                const { tipo } = await respIA.json();
                resultado.innerText += `\n\n📌 Identificado como: ${tipo}`;
            }
        } catch (erroConexao) {
            console.warn("Não foi possível identificar o tipo de imagem (sem conexão?):", erroConexao);
        }
    } catch (erro) {
        console.error(erro);
        resultado.innerText = `Erro ao processar: ${erro.message}`;
    } finally {
        botaoScanear.disabled = false;
    }
};

/* ── Zoom manual  */
async function aplicarZoom(valor) {
    const track = videoElemento.srcObject.getVideoTracks()[0];
    const capacidades = track.getCapabilities();
    if (capacidades.zoom) {
        await track.applyConstraints({ advanced: [{ zoom: valor }] });
    }
}

document.querySelectorAll(".zoom-opt").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelector(".zoom-opt.active")?.classList.remove("active");
        btn.classList.add("active");
        aplicarZoom(parseFloat(btn.textContent));
    });
});

/* ── Dropdown de matérias (montado dinamicamente a partir do localStorage) ── */
const logoBtn = document.getElementById("logoBtn");
const dropdownMenu = document.getElementById("dropdownMenu");
const confirmBtn = document.getElementById("confirmBtn");

let materiaSelecionada = false;
let materiaSelecionadaId = null;

function renderizarMateriasNoDropdown() {
    const materiasContainer = document.getElementById("materiasContainer");
    if (!materiasContainer) return;

    const materias = JSON.parse(localStorage.getItem("materias") || "[]");
    materiasContainer.innerHTML = "";

    if (materias.length === 0) {
        materiasContainer.innerHTML = `<p style="color:#aaa; font-size:13px; padding:8px 5px;">Nenhuma matéria criada ainda</p>`;
        return;
    }

    materias.forEach(m => {
        const item = document.createElement("a");
        item.href = "#";
        item.className = "dropdown-item";
        item.style.background = m.cor || "#6c4fcf";
        item.dataset.materiaId = m.id;
        item.innerHTML = `<span class="dropdown-item-icon">📖</span>${m.nome}`;
        materiasContainer.appendChild(item);
    });
}

if (logoBtn && dropdownMenu) {
    logoBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        renderizarMateriasNoDropdown();
        dropdownMenu.classList.toggle("show");
        materiaSelecionada = false;
        materiaSelecionadaId = null;
        confirmBtn.style.display = "none";
    });

    dropdownMenu.addEventListener("click", function (e) {
        const item = e.target.closest(".dropdown-item");
        if (!item) return;

        // O item "Abrir App" não é uma matéria (não tem data-materia-id) — deixa navegar normalmente
        if (!item.dataset.materiaId) return;

        e.preventDefault();
        e.stopPropagation();
        materiaSelecionada = true;
        materiaSelecionadaId = item.dataset.materiaId;
        dropdownMenu.classList.remove("show");
        confirmBtn.style.display = "flex";
    });

    document.addEventListener("click", function () {
        dropdownMenu.classList.remove("show");
    });
}

confirmBtn.addEventListener("click", () => {
    document.getElementById("overlay").classList.add("show");
});

document.getElementById("cancelBtn").addEventListener("click", () => {
    document.getElementById("overlay").classList.remove("show");
});

document.getElementById("salvarBtn").addEventListener("click", async function () {
    const hashAtual = gerarHashSimples(canvas.getContext("2d"), canvas.width, canvas.height);
    const duplicada = hashesSalvos.some(h => distanciaHamming(h, hashAtual) < 5);

    if (duplicada) {
        const continuarMesmoAssim = await confirmarDuplicidade();
        if (!continuarMesmoAssim) return;
    }
    hashesSalvos.push(hashAtual);
    salvarHashesNoStorage();

    const nome = document.getElementById("nomeArquivo").value.trim() || "AulaX_DataX";
    const salvarNoApp = document.getElementById("salvarApp").checked;

    if (salvarNoApp && materiaSelecionadaId) {
        const dataURL = canvas.toDataURL("image/jpeg", 0.9);
        await salvarImagemNaMateria(materiaSelecionadaId, dataURL, nome);
    }

    this.textContent = "✔ Salvo!";
    this.style.background = "#16a34a";
    this.disabled = true;

    setTimeout(() => {
        document.getElementById("overlay").classList.remove("show");
        this.textContent = "Salvar PDF";
        this.style.background = "";
        this.disabled = false;
    }, 2000);
});