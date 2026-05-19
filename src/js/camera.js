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

////////////////////////////////////////////////////////////////////////////////////////////////

const logoBtn = document.getElementById("logoBtn");
const dropdownMenu = document.getElementById("dropdownMenu");
const confirmBtn = document.getElementById("confirmBtn");

let materiasSelecionada = false;

if (logoBtn && dropdownMenu) {
    logoBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        dropdownMenu.classList.toggle("show");
        materiasSelecionada = false;
        confirmBtn.style.display = "none";
    });

    dropdownMenu.querySelectorAll(".dropdown-item").forEach(function (item) {
        item.addEventListener("click", function (e) {
            e.stopPropagation();
            materiasSelecionada = true;
            dropdownMenu.classList.remove("show");
            confirmBtn.style.display = "block"; 
        });
    });

    document.addEventListener("click", function () {
        dropdownMenu.classList.remove("show");
    });
}

document.getElementById('confirmBtn').addEventListener('click', () => {
  document.getElementById('overlay').classList.add('show');
});

document.getElementById('cancelBtn').addEventListener('click', () => {
  document.getElementById('overlay').classList.remove('show');
});

document.getElementById('salvarBtn').addEventListener('click', function () {
  const nome = document.getElementById('nomeArquivo').value.trim() || 'AulaX_DataX';
  const salvarNoApp = document.getElementById('salvarApp').checked;


  this.textContent = '✔ Salvo!';
  this.style.background = '#16a34a';
  this.disabled = true;

  setTimeout(() => {
    this.textContent = 'Salvar PDF';
    this.style.background = '';
    this.disabled = false;
    document.getElementById('overlay').classList.remove('show');
  }, 2000);
});