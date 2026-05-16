const hamburger = document.getElementById("hamburger");
const menuLinks = document.getElementById("menuLinks");

hamburger.addEventListener("click", () => {
  menuLinks.classList.toggle("active");
});

const confirmBtn = document.getElementById("confirmBtn");
const overlay = document.getElementById("overlay");
const cancelBtn = document.getElementById("cancelBtn");
const okBtn = document.getElementById("okBtn");

confirmBtn.addEventListener("click", () => {
    overlay.classList.add("show");
});

cancelBtn.addEventListener("click", () => {
    overlay.classList.remove("show");
});