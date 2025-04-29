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
  if (ano > 2025 || (ano === 2025 && mes > hoje.getMonth() + 1))
    return "Ano/mês não pode ultrapassar 2025.";

  const idade = hoje.getFullYear() - ano;
  const aniversarioJaPassou =
    mes < hoje.getMonth() + 1 ||
    (mes === hoje.getMonth() + 1 && dia <= hoje.getDate());
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
    default:
      return "";
  }
}

function showError(field, message, isFocused = false) {
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
    if (isFocused && message) {
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
    if (value.length >= 6)
      value = value.replace(/(\d{2}\/\d{2})(\d{1,4})/, "$1/$2");
    input.value = value;
  });
}

const editModal = document.getElementById("editModal");
const deleteModal = document.getElementById("deleteModal");
const closeEditModalBtn = document.getElementById("closeEditModal");
const closeDeleteModalBtn = document.getElementById("closeDeleteModal");
let selectedUserId = null;

document.querySelectorAll(".edit-btn").forEach((button) => {
  button.addEventListener("click", () => {
    selectedUserId = button.getAttribute("data-userid");
    const row = button.closest("tr").children;

    document.getElementById("editUserId").value = selectedUserId;
    document.getElementById("editUserNome").value = row[1].innerText;
    document.getElementById("editUserCpf").value = row[2].innerText;
    document.getElementById("editUserDtNasc").value = row[3].innerText;
    document.getElementById("editUserEmail").value = row[4].innerText;
    document.getElementById("editUserPontos").value = row[5].innerText;
    document.getElementById("editUserTipo").value = row[6].innerText;

    editModal.style.display = "flex";
  });
});

document.querySelectorAll(".delete-btn").forEach((button) => {
  button.addEventListener("click", () => {
    const userId = button.getAttribute("data-userid");

    document
      .getElementById("confirmDelete")
      .setAttribute("data-userid", userId);

    deleteModal.style.display = "flex";
  });
});

function limparErrosFormulario(formId) {
  const form = document.getElementById(formId);
  if (!form) return;

  form.querySelectorAll("input, select").forEach((input) => {
    input.classList.remove("erro-campo");
  });

  form.querySelectorAll(".form-error-message").forEach((small) => {
    small.textContent = "";
    small.style.display = "none";
  });
}

closeEditModalBtn.addEventListener("click", () => {
  limparErrosFormulario("editUserForm");
  editModal.style.display = "none";
});
closeDeleteModalBtn.addEventListener("click", () => {
  deleteModal.style.display = "none";
});

document.addEventListener("DOMContentLoaded", () => {
  const cpfInput = document.getElementById("editUserCpf");
  const dataInput = document.getElementById("editUserDtNasc");
  if (cpfInput) aplicarMascaraCPF(cpfInput);
  if (dataInput) aplicarMascaraData(dataInput);

  const form = document.getElementById("editUserForm");
  if (!form) return;

  const fields = ["nome", "cpf", "dataNascimento", "email"];
  let focusedField = null;

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
      const error = validateField(field, value);
      if (!value || error) {
        showError(field, error, false);
        camposInvalidos.push(field);
      } else {
        showError(field, "", false);
      }
    });

    if (camposInvalidos.length > 0) {
      alert("Por favor, corrija os campos destacados.");
      return;
    }

    const userData = {
      id: document.getElementById("editUserId").value,
      nome: document.getElementById("editUserNome").value,
      cpf: document.getElementById("editUserCpf").value,
      dt_nasc: document.getElementById("editUserDtNasc").value,
      email: document.getElementById("editUserEmail").value,
      pontos: parseInt(document.getElementById("editUserPontos").value),
      tipo: document.getElementById("editUserTipo").value,
    };

    console.log("Salvar usuário:", userData);

    editModal.style.display = "none";
  });
});

document
  .getElementById("editUserForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const camposInvalidos = [];
    const fields = ["nome", "cpf", "dataNascimento", "email"];

    fields.forEach((field) => {
      const inputEl = document.querySelector(`[name="${field}"]`);
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
      alert("Por favor, corrija os campos destacados.");
      return;
    }

    const formData = new FormData(document.getElementById("editUserForm"));

    try {
      const response = await fetch("/adm/editar_usuario", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        alert("Usuário atualizado com sucesso!");
        window.location.reload();
      } else {
        alert("Erro ao atualizar usuário.");
      }
    } catch (error) {
      console.error("Erro ao enviar requisição:", error);
      alert("Erro ao conectar com o servidor.");
    }

    limparErrosFormulario("editUserForm");
    editModal.style.display = "none";
  });

document
  .getElementById("confirmDelete")
  .addEventListener("click", async (e) => {
    const userId = e.target.getAttribute("data-userid");

    if (!userId) {
      console.error("ID do usuário não encontrado para exclusão.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("id", userId);

      const response = await fetch("/adm/excluir_usuario", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        alert("Usuário excluído com sucesso!");
        window.location.reload();
      } else {
        alert("Erro ao excluir usuário.");
      }
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      alert("Erro ao conectar com o servidor.");
    }

    deleteModal.style.display = "none";
  });
