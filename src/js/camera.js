const videoElemento = document.getElementById("video");
const botaoScanear = document.getElementById("btn-texto");
const resultado = document.getElementById("saida");
const canvas = document.getElementById("canvas");


/* ── Duplicidade de fotos: comparação por CONTEÚDO (texto reconhecido), persistida no localStorage ── */
const CHAVE_TEXTOS = "jovi_textos_salvos";
let textosSalvos = JSON.parse(localStorage.getItem(CHAVE_TEXTOS) || "[]");
let ultimoTextoReconhecido = "";


function salvarTextosNoStorage() {
    localStorage.setItem(CHAVE_TEXTOS, JSON.stringify(textosSalvos));
}


// Remove acentos, pontuação e espaços extras para comparar só o conteúdo de fato
function normalizarTexto(txt) {
    return txt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}


// Similaridade por sobreposição de palavras (Jaccard): 0 = nada em comum, 1 = idêntico
function similaridadeTexto(a, b) {
    const palavrasA = new Set(normalizarTexto(a).split(" ").filter(Boolean));
    const palavrasB = new Set(normalizarTexto(b).split(" ").filter(Boolean));
    if (palavrasA.size === 0 || palavrasB.size === 0) return 0;
    const intersecao = [...palavrasA].filter(p => palavrasB.has(p)).length;
    const uniao = new Set([...palavrasA, ...palavrasB]).size;
    return intersecao / uniao;
}


/* ── Duplicidade — critério complementar por IMAGEM (hash perceptual) ──
   Serve para pegar os casos em que o OCR leu "lixo" e o texto não bateu,
   mas a foto é visualmente quase idêntica (mesma página, mesmo ângulo). */
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
            if (!d.objectStoreNames.contains(STORE_NAME)) d.createObjectStore(STORE_NAME, { keyPath: "chaveId" });
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


    if (db) await dbPut({ chaveId, dataURL, mimeType: "image/jpeg" });


    itens.push({ id, nome: nomeArquivo, tipo: "arquivo", ext: "JPG", mimeType: "image/jpeg", data: new Date().toLocaleDateString("pt-BR") });
    localStorage.setItem(chaveItens, JSON.stringify(itens));


    const materias = JSON.parse(localStorage.getItem("materias") || "[]");
    const m = materias.find(x => x.id == materiaId);
    if (m) {
        m.arquivos = itens.length;
        localStorage.setItem("materias", JSON.stringify(materias));
    }
}


/* ── Zoom suave ── */
let trackCamera = null;
let capacidadesCamera = null;
let zoomAtual = 1;
let zoomAlvo = 1;
let animacaoZoom = null;
let ultimoZoomAplicado = 0;


function aplicarZoomSuave(timestamp = 0) {
    if (!trackCamera || !capacidadesCamera?.zoom) {
        animacaoZoom = null;
        return;
    }


    const diferenca = zoomAlvo - zoomAtual;


    if (Math.abs(diferenca) < 0.01) {
        zoomAtual = zoomAlvo;
        trackCamera.applyConstraints({ advanced: [{ zoom: zoomAtual }] }).catch(() => { });
        animacaoZoom = null;
        return;
    }


    zoomAtual += diferenca * 0.12;


    if (timestamp - ultimoZoomAplicado >= 30) {
        ultimoZoomAplicado = timestamp;
        trackCamera.applyConstraints({ advanced: [{ zoom: zoomAtual }] }).catch(() => { });
    }


    animacaoZoom = requestAnimationFrame(aplicarZoomSuave);
}


function definirZoomSuave(valor) {
    if (!capacidadesCamera?.zoom) return;
    const min = capacidadesCamera.zoom.min ?? 1;
    const max = capacidadesCamera.zoom.max ?? 1;
    zoomAlvo = Math.max(min, Math.min(max, valor));
    if (!animacaoZoom) animacaoZoom = requestAnimationFrame(aplicarZoomSuave);
}


/* ── Câmera ── */
async function configurarCamera() {
    try {
        const midia = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
            audio: false
        });


        videoElemento.srcObject = midia;
        trackCamera = midia.getVideoTracks()[0];
        capacidadesCamera = trackCamera.getCapabilities();


        function calcularAreaDeConteudo(video) {
            const pequeno = document.createElement("canvas");
            pequeno.width = 160;
            pequeno.height = 120;
            const ctx = pequeno.getContext("2d");
            ctx.drawImage(video, 0, 0, 160, 120);
            const dados = ctx.getImageData(0, 0, 160, 120).data;


            let minX = 160, maxX = 0, minY = 120, maxY = 0;
            const limiarContraste = 40;
            const margemX = 24;
            const margemY = 18;


            for (let y = margemY; y < 120 - margemY; y++) {
                for (let x = margemX; x < 160 - margemX; x++) {
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


            const areaConteudo = Math.max(0, maxX - minX) * Math.max(0, maxY - minY);
            const areaRegiaoAnalisada = (160 - margemX * 2) * (120 - margemY * 2);
            return areaConteudo / areaRegiaoAnalisada;
        }


        let avisoZoomJaExibido = false;
        let ultimaProporcao = null;


        async function ajustarZoomAutomatico() {
            if (!capacidadesCamera?.zoom) {
                if (!avisoZoomJaExibido) {
                    console.warn("⚠️ Este dispositivo/navegador não expõe controle de zoom.");
                    avisoZoomJaExibido = true;
                }
                return;
            }


            const proporcao = calcularAreaDeConteudo(videoElemento);
            const alvoMin = 0.55;
            const alvoMax = 0.85;


            // Evita que pequenas variações da câmera façam o zoom ficar mudando sem necessidade
            if (proporcao >= 0.60 && proporcao <= 0.80) return;


            const passo = capacidadesCamera.zoom.step || 0.1;
            let novoZoom = zoomAlvo;


            if (proporcao < alvoMin) novoZoom += passo;
            else if (proporcao > alvoMax) novoZoom -= passo;
            else return;


            const min = capacidadesCamera.zoom.min ?? 1;
            const max = capacidadesCamera.zoom.max ?? 1;
            novoZoom = Math.max(min, Math.min(max, novoZoom));


            if (Math.abs(novoZoom - zoomAlvo) >= passo * 0.5) {
                definirZoomSuave(novoZoom);
            }


            if (ultimaProporcao === null || Math.abs(proporcao - ultimaProporcao) > 0.05) {
                console.log(`🔎 Zoom auto — proporção: ${proporcao.toFixed(2)} | zoom alvo: ${zoomAlvo.toFixed(2)}`);
                ultimaProporcao = proporcao;
            }
        }


        videoElemento.onloadedmetadata = () => {
            videoElemento.play();
            if (capacidadesCamera?.zoom) {
                zoomAtual = capacidadesCamera.zoom.min ?? 1;
                zoomAlvo = zoomAtual;
            }
            setInterval(ajustarZoomAutomatico, 150);
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
        for (let c = 0; c < 3; c++) dados[i + c] = ((dados[i + c] - min) / alcance) * 255;
    }


    context.putImageData(imgData, 0, 0);
}


botaoScanear.onclick = async () => {
    // Efeito de flash, imitando o obturador da câmera nativa
    const flash = document.getElementById("flashCaptura");


    if (flash) {
        flash.classList.remove("ativo");
        void flash.offsetWidth;
        flash.classList.add("ativo");
    } else {
        console.warn("⚠️ Elemento #flashCaptura não encontrado no HTML.");
    }


    botaoScanear.disabled = true;


    const context = canvas.getContext("2d");
    canvas.width = videoElemento.videoWidth || 640;
    canvas.height = videoElemento.videoHeight || 480;




    try {
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.filter = "none";
        context.drawImage(videoElemento, 0, 0, canvas.width, canvas.height);


        const canvasOCR = document.createElement("canvas");
        const escalaOCR = 1.5;
        canvasOCR.width = canvas.width * escalaOCR;
        canvasOCR.height = canvas.height * escalaOCR;


        const ctxOCR = canvasOCR.getContext("2d");
        ctxOCR.imageSmoothingEnabled = true;
        ctxOCR.imageSmoothingQuality = "high";
        ctxOCR.filter = "grayscale(100%) contrast(140%) brightness(105%)";
        ctxOCR.drawImage(canvas, 0, 0, canvasOCR.width, canvasOCR.height);


        const { data: { text } } = await Tesseract.recognize(canvasOCR, "por", { tessedit_pageseg_mode: "6", preserve_interword_spaces: "1" });
        const textoFinal = text.trim();
        ultimoTextoReconhecido = textoFinal;


        abrirModalTexto(textoFinal);


        try {
            const imagemBase64 = canvas.toDataURL("image/jpeg", 0.8).split(",")[1];


            const respIA = await fetch("http://localhost:3000/identificar-imagem", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ imagemBase64 })
            });


            if (respIA.ok) {
                const { tipo } = await respIA.json();
                const tag = document.createElement("span");
                tag.className = "saida-tag";
                tag.textContent = `📌 Identificado como: ${tipo}`;
                resultado.appendChild(document.createElement("br"));
                resultado.appendChild(tag);
            }
        } catch (erroConexao) {
            console.warn("Não foi possível identificar o tipo de imagem (sem conexão?):", erroConexao);
        }
    } catch (erro) {
        console.error("Erro ao processar:", erro);
        abrirModalTexto(`Erro ao processar: ${erro.message}`);
    } finally {
        botaoScanear.disabled = false;
    }
};


/* ── Modal do texto reconhecido ── */
function abrirModalTexto(texto) {
    const modal = document.getElementById("modalTexto");
    const campoTexto = document.getElementById("textoReconhecido");
    if (!modal || !campoTexto) return;
    campoTexto.textContent = texto?.trim() || "Não foi possível identificar o texto.";
    modal.classList.add("ativo");
}


function fecharModalTexto() {
    const modal = document.getElementById("modalTexto");
    if (!modal) return;
    modal.classList.remove("ativo");
}


function configurarModalTexto() {
    const modal = document.getElementById("modalTexto");
    const btnFechar = document.getElementById("btnFecharTexto");
    const btnFechar2 = document.getElementById("btnFecharTexto2");


    if (!modal) return;


    if (btnFechar) btnFechar.addEventListener("click", fecharModalTexto);
    if (btnFechar2) btnFechar2.addEventListener("click", fecharModalTexto);


    modal.addEventListener("click", (event) => {
        if (event.target === modal) fecharModalTexto();
    });
}


configurarModalTexto();


/* ── Zoom manual (barra 0.6x / 1x / 2x) ── */
function aplicarZoom(valor) {
    definirZoomSuave(valor);
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


/* Overlay */
confirmBtn.addEventListener("click", () => {
    document.getElementById("overlay").classList.add("show");
});


document.getElementById("cancelBtn").addEventListener("click", () => {
    document.getElementById("overlay").classList.remove("show");
});


document.getElementById("salvarBtn").addEventListener("click", async function () {
    const similaridades = textosSalvos.map(t => similaridadeTexto(t, ultimoTextoReconhecido));
    const LIMIAR_SIMILARIDADE = 0.7;
    const duplicadaPorTexto = ultimoTextoReconhecido.trim().length > 0 && similaridades.some(s => s >= LIMIAR_SIMILARIDADE);


    const hashAtual = gerarHashSimples(canvas.getContext("2d"), canvas.width, canvas.height);
    const distancias = hashesSalvos.map(h => distanciaHamming(h, hashAtual));
    const LIMIAR_DISTANCIA_HASH = 10;
    const duplicadaPorImagem = distancias.some(d => d < LIMIAR_DISTANCIA_HASH);


    console.log("🔍 Debug duplicidade — texto:", ultimoTextoReconhecido);
    console.log("🔍 Debug duplicidade — similaridades de texto:", similaridades, "| duplicada por texto:", duplicadaPorTexto);
    console.log("🔍 Debug duplicidade — distâncias de hash:", distancias, "| duplicada por imagem:", duplicadaPorImagem);


    const duplicada = duplicadaPorTexto || duplicadaPorImagem;


    if (duplicada) {
        const continuarMesmoAssim = await confirmarDuplicidade();
        if (!continuarMesmoAssim) return;
    }


    textosSalvos.push(ultimoTextoReconhecido);
    salvarTextosNoStorage();
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
