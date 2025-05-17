document.addEventListener("DOMContentLoaded", function () {
    const menuBtn = document.getElementById("menu-btn");
    const closeBtn = document.getElementById("close-btn");
    const sidebar = document.getElementById("sidebar");

    menuBtn.addEventListener("click", function () {
        sidebar.classList.add("active");
    });

    closeBtn.addEventListener("click", function () {
        sidebar.classList.remove("active");
    });
});

/* carrossel para passar pelos vendedores (NAO FUNCIONANDO AINDA) */

document.getElementById('next-btn').addEventListener('click', function() {
    const carouselContent = document.querySelector('.carousel-content');
    carouselContent.scrollBy({
        left: 110, 
        behavior: 'smooth'
    });
});

document.getElementById('prev-btn').addEventListener('click', function() {
    const carouselContent = document.querySelector('.carousel-content');
    carouselContent.scrollBy({
        left: -110,
        behavior: 'smooth'
    });
});

/* abrir drop menu icon */

document.addEventListener("DOMContentLoaded", () => {
    const userIcon = document.querySelector(".user-icon"); 
    const userMenu = document.getElementById("user-menu");

    userIcon.addEventListener("click", (event) => {
        event.stopPropagation();
        

        userMenu.style.display = (userMenu.style.display === "block") ? "none" : "block";
    });


    document.addEventListener("click", (event) => {
        if (!userIcon.contains(event.target) && !userMenu.contains(event.target)) {
            userMenu.style.display = "none";
        }
    });

});



function redirectTo(url) {
    window.location.href = url;
}