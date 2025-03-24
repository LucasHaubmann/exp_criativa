const regex = {
  nome: /^(?!\s*$)[a-zA-ZÀ-ÿ\s]{3,}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  senha: /^.{6,}$/,
};

function validarCPF(cpf) {
  const cleaned = cpf.replace(/[^\d]+/g, '');
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

  if (!dia || !mes || !ano || String(ano).length !== 4) {
    return "Data inválida.";
  }

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
      return regex.nome.test(value) ? "" : "Nome deve ter pelo menos 3 letras e não pode conter apenas espaços.";
    case "cpf":
      return validarCPF(value) ? "" : "CPF inválido.";
    case "dataNascimento":
      return validarDataNascimento(value);
    case "email":
    case "loginEmail":
      return regex.email.test(value) ? "" : "Email inválido.";
    case "senha":
      return regex.senha.test(value) ? "" : "Senha deve ter pelo menos 6 caracteres.";
    default:
      return "";
  }
}

function showError(field, message) {
  const el = document.getElementById("error-" + field);
  if (el) {
    el.textContent = message;
    el.style.display = message ? "block" : "none";
  }
}

function setupValidation(formId, fields) {
  const form = document.getElementById(formId);
  if (!form) return;

  let focusedField = null;

  fields.forEach((field) => {
    const input = form.querySelector(`[name="${field}"]`);
    if (!input) return;

    input.addEventListener("focus", () => {
      focusedField = field;
    });

    input.addEventListener("blur", () => {
      focusedField = null;
      showError(field, "");
    });

    input.addEventListener("input", () => {
      const value = input.value.trim();

      if (!value) {
        showError(field, "");
        return;
      }

      if (focusedField === field) {
        const error = validateField(field, value);
        showError(field, error);
      } else {
        showError(field, "");
      }
    });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    fields.forEach((field) => {
      const inputEl = form.querySelector(`[name="${field}"]`);
      const value = inputEl.value.trim();
      if (!value) {
        showError(field, "");
        return;
      }
      const error = validateField(field, value);
      showError(field, error);
    });
  });
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

document.addEventListener("DOMContentLoaded", () => {
  if (window.particlesJS) {
    window.particlesJS("particles-js", {
      particles: {
        number: { value: 100 },
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

  setupValidation("signup-form", ["nome", "cpf", "dataNascimento", "email", "senha"]);
  setupValidation("login-form", ["loginEmail"]);

  const cpfInput = document.querySelector("input[name='cpf']");
  const dataInput = document.querySelector("input[name='dataNascimento']");
  if (cpfInput) aplicarMascaraCPF(cpfInput);
  if (dataInput) aplicarMascaraData(dataInput);
});