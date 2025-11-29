// Cambia la navbar al hacer scroll
document.addEventListener("scroll", () => {
    const navbar = document.querySelector("nav");
    if(window.scrollY > 50){
        navbar.classList.add("shadow-lg", "bg-dark");
    } else {
        navbar.classList.remove("shadow-lg", "bg-dark");
    }
});