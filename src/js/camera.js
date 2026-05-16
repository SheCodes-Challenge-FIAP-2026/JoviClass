// DECLARAÇÕES DO ELEMENTOS USANDO DOM(DOCUMENT OBJECT MODEL)
const videoElemento = document.getElementById("video");
const botaoScanear =document.getElementById("btn-texto");
const resultado= document.getElementById("saida");
const canvas = document.getElementById("canvas");

//FUNÇÃO QUE VAI HABILITAR A CÂMERA

async function configurarCamera(){
    try{
        const midia = await navigator.mediaDevices.getUserMedia({
            video:{facingMode: "environment"}, //habilitando  a camera traseira
            audio: false
        })
        videoElemento.srcObject = midia;
        videoElemento.play(); //garante que o video comece
    }catch(erro){
        resultado.innerText="Erro ao acessar a câmera",erro;
    }
}
//Exercuta a função da camera
configurarCamera();


//função para ler o texto da imagem e mostrar na tela


botaoScanear.onclick = async()=>{
    botaoScanear.disable= true;// habilita o botão para ler o texto
    resultado.innerText="Fazendo a leitura...aguarde";


    // chama a estrutura do canvas
    const context = canvas.getContext("2d");


    //ajusta o tamanho da tela
    canvas.width = videoElemento.videoWidth; // largura
    canvas.height = videoElemento.videoHeight; //altura


    //reset de qualquer transformação para garantir que a foto não
    //fique invertida
    context.setTransform(1, 0, 1 ,0 ,0);


    //APlica o filtro de contraste e escala de cinza no canvas antes de
    //tirar a foto ( ajuda a evitar letras aleatórias)
    context.filter = 'contrast(1.2) grayscale(1)';


    //construindo a tela para tirar a foto
    context.drawImage(videoElemento, 0,0, canvas.width,canvas.height);
    try{
        //captura o texto da imagem e traduz para o portugues
        const {data: { text }} = await Tesseract.recognize(
            canvas,
            'por'
        );
        //remove espaços excessivos e caracters especiais
        const textoFinal= text.trim();
        //condicional ternaria ? if : else - se o texto for maior ok senão mensagem
        resultado.innerText = textoFinal.length > 0 ? textoFinal : "Não foi possivel identificar o texto";


    }catch(erro){
        console.error(erro);
        resultado.innerText="Erro ao processar",erro;
    }finally{
        //Desabilita o botão para começar nova leitura
        botaoScanear.disable=false;
    }
}
