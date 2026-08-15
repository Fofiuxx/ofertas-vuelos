/**
 * Hash de contraseñas y tokens de sesión.
 *
 * Este archivo antes estaba en SitioWeb/scripts/, del lado del navegador, donde
 * no podía funcionar: usa `require`, y sobre todo, cualquier secreto que viva en
 * el cliente es un secreto público. La seguridad se decide en el servidor.
 */

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// 12 rondas: unos 250 ms por hash en hardware normal. Suficientemente lento
// para que probar contraseñas por fuerza bruta no sea práctico, y lo bastante
// rápido para no molestar en el login. Antes esto estaba en 0, que equivale a
// no proteger nada.
const RONDAS = 12;

const CLAVE_SECRETA = process.env.JWT_SECRET;
const DURACION_TOKEN = "1h";

async function hashearPassword(password) {
  return bcrypt.hash(password, RONDAS);
}

/**
 * Compara en tiempo constante — bcrypt.compare no cortocircuita al primer
 * carácter distinto, así que no filtra información por el tiempo de respuesta.
 */
async function verificarPassword(password, hashGuardado) {
  return bcrypt.compare(password, hashGuardado);
}

function crearToken(usuarioId, email, esAdministrador) {
  return jwt.sign(
    { usuarioId, email, administrador: esAdministrador },
    CLAVE_SECRETA,
    { expiresIn: DURACION_TOKEN }
  );
}

/** Middleware: exige un token válido para seguir. */
function requiereSesion(pedido, respuesta, siguiente) {
  const cabecera = pedido.headers.authorization || "";
  const token = cabecera.startsWith("Bearer ") ? cabecera.slice(7) : null;

  if (!token) {
    return respuesta.status(401).json({ error: "Falta el token de sesión" });
  }

  try {
    pedido.usuario = jwt.verify(token, CLAVE_SECRETA);
    siguiente();
  } catch (error) {
    return respuesta.status(401).json({ error: "Token inválido o vencido" });
  }
}

/** Middleware: además de sesión válida, exige ser administrador. */
function requiereAdministrador(pedido, respuesta, siguiente) {
  if (!pedido.usuario || !pedido.usuario.administrador) {
    return respuesta.status(403).json({ error: "No tienes permiso para esto" });
  }
  siguiente();
}

module.exports = {
  hashearPassword,
  verificarPassword,
  crearToken,
  requiereSesion,
  requiereAdministrador,
};
