/* Registro e inicio de sesión. Depende de sesion.js. */

function mostrarError(mensaje) {
  const caja = document.getElementById("mensaje");
  if (caja) {
    caja.textContent = mensaje;
    caja.hidden = false;
  } else {
    alert(mensaje);
  }
}

async function login() {
  const email = document.getElementById("txtEmail").value.trim();
  const pass = document.getElementById("txtPass").value;

  if (!email || !pass) {
    mostrarError("Escribe tu email y tu contraseña");
    return;
  }

  try {
    // Antes había un /^[a-zA-Z0-9]+$/ acá que rechazaba en silencio cualquier
    // contraseña con un símbolo: el botón no hacía nada y no se sabía por qué.
    // Al iniciar sesión no se valida el formato, solo se comprueba si es válida.
    const datos = await pedir("/usuarios/login", {
      method: "POST",
      body: JSON.stringify({ email, pass }),
    });

    guardarToken(datos.token);
    window.location.href = "home.html";
  } catch (error) {
    mostrarError(error.message);
  }
}

async function crear() {
  const email = document.getElementById("txtEmail").value.trim();
  const pass = document.getElementById("txtPass").value;

  const reglaPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!reglaPassword.test(pass)) {
    mostrarError(
      "La contraseña necesita al menos 8 caracteres, una mayúscula, una minúscula y un número"
    );
    return;
  }

  try {
    // El original mostraba «Usuario creado» dentro del .then() sin esperar a
    // nada — avisaba de éxito aunque la API hubiera fallado.
    await pedir("/usuarios/create", {
      method: "POST",
      body: JSON.stringify({ email, pass }),
    });

    window.location.href = "login.html";
  } catch (error) {
    mostrarError(error.message);
  }
}
