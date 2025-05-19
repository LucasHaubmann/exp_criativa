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
      return regex.email.test(value) ? "" : "Email inválido.";
    case "senha":
      return regex.senha.test(value) ? "" : "Senha deve ter no mínimo 6 caractéres.";
    case "confirmPassword":
      const original = document.getElementById("senhaCadastro").value.trim();
      if (value.length == 0){
        return " ";
      }
      return value === original ? "" : "As senhas não coincidem.";
    case "loginEmail":
        return regex.email.test(value) ? "" : "Email inválido.";
    case "senhaLogin":
        return value.trim() ? "" : "Campo obrigatório";
    default:
      return "";
  }
}

function showError(field, message, isFocused = false) {
  const el = document.getElementById("error-" + field);
  const input = document.querySelector(`[name="${field}"]`);

  if (input) {
    if (message) {
      input.classList.add("erro-campo"); // Mantém a borda vermelha
    } else {
      input.classList.remove("erro-campo");
    }
  }

  if (el) {
    if (isFocused && message) {
      el.textContent = message; // Mostra a mensagem apenas em foco
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

function showToast(message, isSuccess = false) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.className = isSuccess ? "show success" : "show";

  setTimeout(() => {
    toast.classList.remove("show", "success");
  }, 3000);
}

function setupValidationFormObject(form, fields) {
  fields.forEach((field) => {
    const input = form.querySelector(`[name="${field}"]`);
    if (!input) return;

    input.addEventListener("blur", () => {
      const value = input.value.trim();
      const error = validateField(field, value);
      showError(field, error, false); // Mostra o erro ao perder o foco
    });

    input.addEventListener("input", () => {
      const value = input.value.trim();
      const error = validateField(field, value);
      showError(field, error, true); // Atualiza o erro enquanto digita
    });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const camposInvalidos = [];

    fields.forEach((field) => {
      const inputEl = form.querySelector(`[name="${field}"]`);
      const value = inputEl.value.trim();
      const error = validateField(field, value);
      if (!value || error) {
        showError(field, error, false);
        camposInvalidos.push(field);
      } else {
        showError(field, "", false);
      }
    });

    if (camposInvalidos.length > 0) {
      showToast("Por favor, corrija os campos destacados.");
      return;
    }

    // Envio automático após validação
    const formData = new FormData(form);
    fetch(form.action, {
      method: "POST",
      body: formData,
    })
      .then(async (response) => {
        if (response.redirected) {
          setTimeout(() => {
            window.location.href = response.url;
          }, 1000); // 1 segundo
        } else if (response.status === 303) {
          showError("senhaLogin", "Email ou senha incorretos.", true, true);
          return;
        } else {
          const data = await response.text();
          console.log("Resposta:", data);
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

  const allForms = document.querySelectorAll("form#signup-form");

  if (allForms.length === 2) {
    const formCadastro = allForms[0]; // primeiro formulário da tela
    const formLogin = allForms[1];    // segundo formulário da tela
  
    setupValidationFormObject(formCadastro, ["nome", "cpf", "dataNascimento", "email", "senha", "confirmPassword"]);
    setupValidationFormObject(formLogin, ["loginEmail", "senhaLogin"], true);
  }

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

  const formLogin = document.querySelector("form[action='/login']");
  if (formLogin) {
    const passwordInput = formLogin.querySelector("input[name='senhaLogin']");

    passwordInput.addEventListener("focus", () => {
      const value = passwordInput.value.trim();
      const error = validateField("senhaLogin", value);
      showError("senhaLogin", error, true);
    });

    passwordInput.addEventListener("blur", () => {
      const value = passwordInput.value.trim();
      const error = validateField("senhaLogin", value);
      showError("senhaLogin", error, false);
    });

    passwordInput.addEventListener("input", () => {
      const value = passwordInput.value.trim();
      const error = validateField("senhaLogin", value);
      showError("senhaLogin", error, passwordInput === document.activeElement);
    });

    formLogin.addEventListener("submit", async (e) => {
      e.preventDefault();
      const value = passwordInput.value.trim();
      const error = validateField("senhaLogin", value);
      showError("senhaLogin", error, false);

      if (error) return;

      // Simulação de envio e resposta do servidor
      try {
        const response = await fetch(formLogin.action, {
          method: "POST",
          body: new FormData(formLogin),
        });

        if (response.ok) {
          showToast("Login realizado com sucesso!", true); // Exibe o toast de sucesso
          setTimeout(() => {
            window.location.href = response.url || "/";
          }, 1000); // Reduzido para 1 segundo
        } else {
          showError("senhaLogin", "Email ou senha incorretos.", false);
        }
      } catch (err) {
        console.error("Erro no login:", err);
        showToast("Erro ao realizar login. Tente novamente.", false);
      }
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
