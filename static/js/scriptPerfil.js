// ✅ Pré-visualização da foto
const fotoInput = document.getElementById('foto');
const fotoPerfil = document.getElementById('foto-perfil');

fotoInput.addEventListener('change', function () {
  const file = this.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      fotoPerfil.src = e.target.result;
    }
    reader.readAsDataURL(file);
  }
});

// ✅ Toast
function showToast(message, isSuccess = false) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.className = "toast show";
  if (isSuccess) toast.classList.add("success");

  setTimeout(() => {
    toast.classList.remove("show", "success");
  }, 3000);
}

// ✅ Regex e validação
const regex = {
  nome: /^(?!\s*$)[a-zA-ZÀ-ÿ\s]{3,}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
};

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
  if (mes > 12) return "Mês inválido.";
  if (dia > 31) return "Dia inválido.";
  return "";
}

function validateField(name, value) {
  switch (name) {
    case "nome":
      return regex.nome.test(value) ? "" : "Nome inválido.";
    case "email":
      return regex.email.test(value) ? "" : "Email inválido.";
    case "dataNascimento":
      return validarDataNascimento(value);
    default:
      return "";
  }
}

function showError(field, message) {
  const el = document.getElementById("error-" + field);
  const input = document.querySelector(`[name="${field}"]`);

  if (input) {
    input.classList.toggle("erro-campo", !!message);
  }

  if (el) {
    el.textContent = message;
    el.style.display = message ? "block" : "none";
  }
}

function setupValidationPerfil(form, fields) {
  fields.forEach((field) => {
    const input = form.querySelector(`[name="${field}"]`);
    if (!input) return;

    input.addEventListener("blur", () => {
      const msg = validateField(field, input.value.trim());
      showError(field, msg);
    });

    input.addEventListener("input", () => {
      const msg = validateField(field, input.value.trim());
      showError(field, msg);
    });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const invalid = fields.filter(field => {
      const input = form.querySelector(`[name="${field}"]`);
      const msg = validateField(field, input.value.trim());
      showError(field, msg);
      return msg;
    });

    if (invalid.length) {
      showToast("Por favor, corrija os campos destacados.");
      return;
    }

    const formData = new FormData(form);
    fetch(form.action, { method: "POST", body: formData })
      .then(res => {
        if (res.ok) {
          showToast("Atualizado com sucesso!", true);
          setTimeout(() => window.location.href = '/perfil', 1000);
        } else {
          showToast("Erro ao enviar. Tente novamente.");
        }
      })
      .catch(() => showToast("Erro de rede."));
  });
}

// ✅ Máscara de data
function aplicarMascaraData(input) {
  input.addEventListener("input", function () {
    let value = input.value.replace(/\D/g, "").slice(0, 8);
    if (value.length >= 3) value = value.replace(/(\d{2})(\d{1,2})/, "$1/$2");
    if (value.length >= 6) value = value.replace(/(\d{2}\/\d{2})(\d{1,4})/, "$1/$2");
    input.value = value;
  });
}

// ✅ Inicialização
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("perfil-form");
  const dataInput = form.querySelector("input[name='dataNascimento']");
  if (dataInput) aplicarMascaraData(dataInput);

  setupValidationPerfil(form, ["nome", "dataNascimento", "email"]);
});
