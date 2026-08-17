/**
 * Sesión del lado del navegador.
 *
 * Acá solo se guarda el token y se lo adjunta a cada pedido. Quién puede hacer
 * qué lo decide la API: esconder un botón no protege nada, porque cualquiera
 * puede abrir la consola y volver a mostrarlo.
 */

const API = "http://localhost:3000";
const CLAVE_TOKEN = "tripexpress-token";

function guardarToken(token) {
  sessionStorage.setItem(CLAVE_TOKEN, token);
}

function obtenerToken() {
  return sessionStorage.getItem(CLAVE_TOKEN);
}

function cerrarSesion() {
  sessionStorage.removeItem(CLAVE_TOKEN);
  window.location.href = "login.html";
}

/** fetch con el token puesto y el manejo de 401 ya resuelto. */
async function pedir(ruta, opciones = {}) {
  const token = obtenerToken();

  const respuesta = await fetch(API + ruta, {
    ...opciones,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...opciones.headers,
    },
  });

  // Token vencido o inválido: de vuelta al login.
  if (respuesta.status === 401 && obtenerToken()) {
    cerrarSesion();
    throw new Error("La sesión venció");
  }

  if (!respuesta.ok) {
    const detalle = await respuesta.json().catch(() => ({}));
    throw new Error(detalle.error || "Error " + respuesta.status);
  }

  return respuesta.status === 204 ? null : respuesta.json();
}

/**
 * Se llama al cargar una página protegida. Le pregunta a la API quién sos —
 * no lee el token por su cuenta, porque el contenido de un token se puede
 * leer y editar en el navegador; solo el servidor puede verificar la firma.
 */
async function exigirSesion({ soloAdministradores = false } = {}) {
  if (!obtenerToken()) {
    window.location.href = "login.html";
    return null;
  }

  try {
    const usuario = await pedir("/sesion");
    if (soloAdministradores && !usuario.administrador) {
      window.location.href = "home.html";
      return null;
    }
    return usuario;
  } catch (error) {
    cerrarSesion();
    return null;
  }
}
