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

    // ✅ Adiciona a verificação de pagamento
    const btnPontos = document.getElementById("btn-pontos");
    const btnDinheiro = document.getElementById("btn-dinheiro");

    if (btnPontos && btnDinheiro) {
        const pontos = parseInt(document.querySelector('input[name="pontos_gastos"]').value);
        const dinheiro = parseFloat(document.querySelector('input[name="total_dinheiro"]').value);

        btnPontos.addEventListener("click", function(event) {
            if (pontos <= 0) {
                event.preventDefault();
                showToast("O carrinho está vazio.");
            }
        });

        btnDinheiro.addEventListener("click", function(event) {
            if (dinheiro <= 0) {
                event.preventDefault();
                showToast("O carrinho está vazio.");
            }
        });
    }
});

function redirectTo(url) {
    window.location.href = url;
}

function showToast(message, success = false) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.className = "toast"; // Reset classes
    if (success) {
        toast.classList.add("success");
    } else {
        toast.classList.add("error");
    }
    toast.style.display = "block";

    setTimeout(() => {
        toast.style.display = "none";
    }, 3000);
}