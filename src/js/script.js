const hamburger = document.getElementById("hamburger");
const menuLinks = document.getElementById("menuLinks");
const overlay = document.getElementById("overlay");

const openOverlayBtn = document.getElementById("confirmBtn");
const closeOverlayBtns = [document.getElementById("cancelBtn"), document.getElementById("okBtn")];

hamburger.addEventListener("click", () => menuLinks.classList.toggle("active"));

const toggleOverlay = (show) => overlay.classList.toggle("show", show);

openOverlayBtn.addEventListener("click", () => toggleOverlay(true));

closeOverlayBtns.forEach(btn => {
  if (btn) btn.addEventListener("click", () => toggleOverlay(false));
});


