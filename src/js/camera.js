const videoElemento = document.getElementById("video");
const botaoScanear = document.getElementById("btn-texto");
const resultado = document.getElementById("saida");
const canvas = document.getElementById("canvas");

async function configurarCamera() {
    try {
        const midia = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: false
        });
        videoElemento.srcObject = midia;
        videoElemento.onloadedmetadata = () => {
            videoElemento.play();
        };
    } catch (erro) {
        resultado.innerText = `Erro ao acessar a câmera: ${erro.message}`;
    }
}

configurarCamera();

botaoScanear.onclick = async () => {
    botaoScanear.disabled = true;
    resultado.innerText = "Fazendo a leitura...aguarde";

    const context = canvas.getContext("2d");

    canvas.width = videoElemento.videoWidth || 640;
    canvas.height = videoElemento.videoHeight || 480;

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.filter = 'contrast(1.3) grayscale(1)';

    context.drawImage(videoElemento, 0, 0, canvas.width, canvas.height);
    
    try {
        const { data: { text } } = await Tesseract.recognize(canvas, 'por');
        const textoFinal = text.trim();
        resultado.innerText = textoFinal.length > 0 ? textoFinal : "Não foi possivel identificar o texto";
    } catch (erro) {
        console.error(erro);
        resultado.innerText = `Erro ao processar: ${erro.message}`;
    } finally {
        botaoScanear.disabled = false;
    }
}