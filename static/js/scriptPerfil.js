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

    userMenu.style.display =
      userMenu.style.display === "block" ? "none" : "block";
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

const regex = {
  nome: /^(?!\s*$)[a-zA-ZÀ-ÿ\s]{3,}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  senha: /^.{6,}$/,
};

function validarCPF(cpf) {
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11 || /^(\d)\1+$/.test(cleaned)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cleaned.charAt(i)) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cleaned.charAt(9))) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cleaned.charAt(i)) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  return resto === parseInt(cleaned.charAt(10));
}

function validarDataNascimento(dataStr) {
  const [dia, mes, ano] = dataStr.split("/").map(Number);
  if (!dia || !mes || !ano || String(ano).length !== 4) return "Data inválida.";
  const data = new Date(ano, mes - 1, dia);
  const hoje = new Date();
  if (data > hoje) return "Data não pode ser futura.";
  if (ano > 2025) return "Ano inválido.";
  const idade = hoje.getFullYear() - ano;
  if (idade < 18) return "É necessário ter pelo menos 18 anos.";
  if (idade > 100) return "Idade máxima permitida: 100 anos.";
  return "";
}

function validateField(name, value) {
  switch (name) {
    case "nome":
      return regex.nome.test(value) ? "" : "Nome inválido.";
    case "cpf":
      return validarCPF(value) ? "" : "CPF inválido.";
    case "dataNascimento":
      return validarDataNascimento(value);
    case "email":
      return regex.email.test(value) ? "" : "Email inválido.";
    case "senha":
      return regex.senha.test(value) ? "" : "Senha muito curta.";
    default:
      return "";
  }
}

function showError(field, message) {
  const el = document.getElementById("error-" + field);
  const input = document.querySelector(`[name="${field}"]`);

  if (input) {
    if (message) {
      input.classList.add("erro-campo");
    } else {
      input.classList.remove("erro-campo");
    }
  }

  if (el) {
    el.textContent = message;
    el.style.display = message ? "block" : "none";
  }
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function aplicarMascaraCPF(input) {
  input.addEventListener("input", function () {
    let value = input.value.replace(/\D/g, "").slice(0, 11);
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    input.value = value;
  });
}

function aplicarMascaraData(input) {
  input.addEventListener("input", function () {
    let value = input.value.replace(/\D/g, "").slice(0, 8);
    if (value.length >= 3) value = value.replace(/(\d{2})(\d{1,2})/, "$1/$2");
    if (value.length >= 6)
      value = value.replace(/(\d{2}\/\d{2})(\d{1,4})/, "$1/$2");
    input.value = value;
  });
}

function setupValidation(formId, fields) {
  console.log(formId, fields);

  const form = document.getElementById(formId);
  if (!form) return;

  fields.forEach((field) => {
    const input = form.querySelector(`[name="${field}"]`);
    if (!input) return;

    input.addEventListener("input", () => {
      const value = input.value.trim();
      const error = validateField(field, value);
      showError(field, error);
    });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const camposInvalidos = [];

    fields.forEach((field) => {
      const input = form.querySelector(`[name="${field}"]`);
      const value = input.value.trim();
      const error = validateField(field, value);
      if (!value || error) {
        camposInvalidos.push(field);
        showError(field, error);
      }
    });

    if (camposInvalidos.length > 0) {
      showToast("Corrija os campos em destaque.");
      return;
    }

    fetch("/editar_usuario", {
      method: "POST",
      body: new FormData(form),
    })
      .then((response) => {
        if (response.ok) {
          window.location.href = "/perfil";
        } else {
          showToast("Erro ao enviar. Tente novamente.");
        }
      })
      .catch((error) => {
        console.error("Erro:", error);
        showToast("Erro no servidor.");
      });
  });
}
