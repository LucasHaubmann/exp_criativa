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
  const [dia, mes, ano] = dataStr.split('/').map(Number);
  if (!dia || !mes || !ano || String(ano).length !== 4) return "Data inválida.";

  const data = new Date(ano, mes - 1, dia);
  const hoje = new Date();

  if (data > hoje) return "Data não pode ser futura.";
  if (ano > 2025 || (ano === 2025 && mes > hoje.getMonth() + 1)) return "Ano/mês não pode ultrapassar 2025.";

  const idade = hoje.getFullYear() - ano;
  const aniversarioJaPassou = (mes < hoje.getMonth() + 1) || (mes === hoje.getMonth() + 1 && dia <= hoje.getDate());
  const idadeExata = aniversarioJaPassou ? idade : idade - 1;

  if (idadeExata < 18) return "É necessário ter pelo menos 18 anos.";
  if (idadeExata > 100) return "Idade máxima permitida: 100 anos.";

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
    case "loginEmail":
      return regex.email.test(value) ? "" : "Email inválido.";
    case "senha":
    case "senhaLogin":
      return regex.senha.test(value) ? "" : "Senha deve ter no mínimo 6 caractéres.";
    case "confirmPassword":
      const original = document.getElementById("senhaCadastro").value.trim();
      if (value.length == 0){
        return " ";
      }
      return value === original ? "" : "As senhas não coincidem.";
    default:
      return "";
  }
}

function showError(field, message, isFocused = false, forceShow = false) {
  const el = document.getElementById("error-" + field);
  const input = document.querySelector(`[name="${field}"]`);
  const hasValue = input && input.value.trim().length > 0;

  const deveMostrarErro = forceShow || hasValue;

  if (input) {
    if (message && deveMostrarErro) {
      input.classList.add("erro-campo");
    } else {
      input.classList.remove("erro-campo");
    }
  }

  if (el) {
    if (isFocused && message && deveMostrarErro) {
      el.textContent = message;
      el.style.display = "block";
    } else {
      el.textContent = "";
      el.style.display = "none";
    }
  }
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
    if (value.length >= 6) value = value.replace(/(\d{2}\/\d{2})(\d{1,4})/, "$1/$2");
    input.value = value;
  });
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

function setupValidation(formId, fields) {
  const form = document.getElementById(formId);
  if (!form) return;

  let focusedField = null;
  const camposJaFocados = new Set();

  fields.forEach((field) => {
    const input = form.querySelector(`[name="${field}"]`);
    if (!input) return;

    input.addEventListener("focus", () => {
      focusedField = field;
      const value = input.value.trim();
      const error = validateField(field, value);

      showError(field, error, true);

    });

    input.addEventListener("blur", () => {
      focusedField = null;
      const value = input.value.trim();
      const error = validateField(field, value);
    
      // Mantém a borda vermelha se ainda estiver inválido
      showError(field, error, false);
    });

    input.addEventListener("input", () => {
      const value = input.value.trim();
      const error = validateField(field, value);
      showError(field, error, focusedField === field);
    });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const camposInvalidos = [];

    fields.forEach((field) => {
      const inputEl = form.querySelector(`[name="${field}"]`);
      const value = inputEl.value.trim();
      const error = validateField(field, value, true); // <- força exigir preenchimento
      if (!value || error) {
        showError(field, error, false, true); 
        camposInvalidos.push(field);
      } else {
        showError(field, "", false);
      }
    });

    if (camposInvalidos.length > 0) {
      showToast("Por favor, corrija os campos destacados.");
      return;
    }

    const formData = new FormData(form);
    fetch("/cadastro", {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        if (response.redirected) {
          window.location.href = response.url;
        } else {
          return response.text();
        }
      })
      .then((data) => {
        console.log("Resposta:", data);
        form.reset();
        fields.forEach((field) => showError(field, "", false));
      })
      .catch((error) => {
        console.error("Erro ao enviar:", error);
        showToast("Erro ao enviar o formulário.");
      });

  });
}

document.addEventListener("DOMContentLoaded", () => {
  const cpfInput = document.querySelector("input[name='cpf']");
  const dataInput = document.querySelector("input[name='dataNascimento']");

  if (cpfInput) aplicarMascaraCPF(cpfInput);
  if (dataInput) aplicarMascaraData(dataInput);

  setupValidation("signup-form", ["nome", "cpf", "dataNascimento", "email", "senha", "confirmPassword"]);
  setupValidation("login-form", ["loginEmail", "senhaLogin"]);

  // Mostrar/Ocultar senha
  document.querySelectorAll(".toggle-password").forEach((icon) => {
    icon.addEventListener("click", () => {
      const input = document.getElementById(icon.getAttribute("data-target"));
      if (!input) return;
      const isPassword = input.getAttribute("type") === "password";
      input.setAttribute("type", isPassword ? "text" : "password");
      icon.classList.toggle("bi-eye-fill");
      icon.classList.toggle("bi-eye-slash-fill");
    });
  });

    // === validação de Confirmar Senha ===
    const confirmInput = document.getElementById("confirmPassword");
    if (confirmInput) {
      confirmInput.addEventListener("input", (e) => {
        const msg = validateField("confirmPassword", e.target.value.trim());
        showError("confirmPassword", msg, confirmInput === document.activeElement);
      });
    }
});

window.addEventListener("load", () => {
  if (window.particlesJS) {
    window.particlesJS("particles-js", {
      particles: {
        number: { value: 80 },
        shape: { type: "circle" },
        opacity: { value: 0.5 },
        size: { value: 3 },
        move: { speed: 2 },
        line_linked: {
          enable: true,
          distance: 150,
          color: "#ffffff",
          opacity: 0.4,
          width: 1,
        },
      },
      interactivity: {
        detect_on: "canvas",
        events: {
          onhover: { enable: true, mode: "repulse" },
          onclick: { enable: true, mode: "push" },
        },
        modes: {
          repulse: { distance: 100, duration: 0.4 },
          push: { particles_nb: 4 },
        },
      },
    });
  }
});
