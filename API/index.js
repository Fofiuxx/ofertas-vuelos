/**
 * API de TripExpress.
 *
 * Todas las consultas usan marcadores `?`: el driver manda la sentencia y los
 * datos por separado, así que lo que escriba el usuario nunca se interpreta
 * como SQL. La versión original pegaba los valores dentro de la cadena, y con
 * un email como  " OR "1"="1  se entraba sin contraseña.
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");

const { pool } = require("./connection");
const {
  hashearPassword,
  verificarPassword,
  crearToken,
  requiereSesion,
  requiereAdministrador,
} = require("./seguridad");

const app = express();
const PUERTO = process.env.PORT || 3000;

app.use(cors({ origin: process.env.ORIGEN_PERMITIDO || "*" }));
app.use(express.json());

/* ------------------------------------------------------------------
   Usuarios
   ------------------------------------------------------------------ */

app.post("/usuarios/login", async (pedido, respuesta) => {
  const { email, pass } = pedido.body;

  if (!email || !pass) {
    return respuesta.status(400).json({ error: "Falta el email o la contraseña" });
  }

  try {
    const [filas] = await pool.query(
      "SELECT id, email, pass, administrador FROM usuarios WHERE email = ?",
      [email]
    );

    // Mismo mensaje y mismo camino tanto si el email no existe como si la
    // contraseña está mal: si respondiéramos distinto, se podría averiguar
    // qué correos están registrados probando de a uno.
    const usuario = filas[0];
    const valida = usuario ? await verificarPassword(pass, usuario.pass) : false;

    if (!valida) {
      return respuesta.status(401).json({ error: "Email o contraseña incorrectos" });
    }

    const token = crearToken(usuario.id, usuario.email, usuario.administrador === 1);
    respuesta.json({
      token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        administrador: usuario.administrador === 1,
      },
    });
  } catch (error) {
    console.error("Error en el login:", error);
    respuesta.status(500).json({ error: "Error interno" });
  }
});

app.post("/usuarios/create", async (pedido, respuesta) => {
  const { email, pass } = pedido.body;

  if (!email || !pass) {
    return respuesta.status(400).json({ error: "Falta el email o la contraseña" });
  }

  // La misma regla que aplica el formulario, revalidada acá: el navegador se
  // puede saltar, la API no.
  const reglaPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!reglaPassword.test(pass)) {
    return respuesta.status(400).json({
      error:
        "La contraseña necesita al menos 8 caracteres, una mayúscula, una minúscula y un número",
    });
  }

  const conexion = await pool.getConnection();
  try {
    // El usuario y su permiso se crean juntos o no se crea ninguno: sin la
    // transacción, un fallo en el segundo INSERT dejaba usuarios sin permisos.
    await conexion.beginTransaction();

    const hash = await hashearPassword(pass);
    const [resultado] = await conexion.query(
      "INSERT INTO usuarios (email, pass, administrador) VALUES (?, ?, 0)",
      [email, hash]
    );
    await conexion.query(
      "INSERT INTO permisosxusuario (usuario_id, permiso_id) VALUES (?, ?)",
      [resultado.insertId, 2]
    );

    await conexion.commit();
    respuesta.status(201).json({ id: resultado.insertId, email });
  } catch (error) {
    await conexion.rollback();

    if (error.code === "ER_DUP_ENTRY") {
      return respuesta.status(409).json({ error: "Ese email ya está registrado" });
    }
    console.error("Error al crear el usuario:", error);
    respuesta.status(500).json({ error: "Error interno" });
  } finally {
    conexion.release();
  }
});

/* ------------------------------------------------------------------
   Ofertas
   ------------------------------------------------------------------ */

app.get("/ofertas", async (pedido, respuesta) => {
  try {
    const [ofertas] = await pool.query(
      "SELECT id, origen, destino, salida, llegada, cupos, precio FROM ofertas ORDER BY salida"
    );
    respuesta.json(ofertas);
  } catch (error) {
    console.error("Error al consultar ofertas:", error);
    respuesta.status(500).json({ error: "Error interno" });
  }
});

app.post("/ofertas", requiereSesion, requiereAdministrador, async (pedido, respuesta) => {
  const { origen, destino, salida, llegada, cupos, precio } = pedido.body;

  if (!origen || !destino || !salida || !llegada) {
    return respuesta.status(400).json({ error: "Faltan datos de la oferta" });
  }

  try {
    const [resultado] = await pool.query(
      "INSERT INTO ofertas (origen, destino, salida, llegada, cupos, precio) VALUES (?, ?, ?, ?, ?, ?)",
      [origen, destino, salida, llegada, Number(cupos) || 0, Number(precio) || 0]
    );
    respuesta.status(201).json({ id: resultado.insertId });
  } catch (error) {
    console.error("Error al crear la oferta:", error);
    respuesta.status(500).json({ error: "Error interno" });
  }
});

app.delete("/ofertas/:id", requiereSesion, requiereAdministrador, async (pedido, respuesta) => {
  try {
    const [resultado] = await pool.query("DELETE FROM ofertas WHERE id = ?", [
      pedido.params.id,
    ]);

    if (resultado.affectedRows === 0) {
      return respuesta.status(404).json({ error: "Esa oferta no existe" });
    }
    respuesta.status(204).end();
  } catch (error) {
    console.error("Error al borrar la oferta:", error);
    respuesta.status(500).json({ error: "Error interno" });
  }
});

/**
 * Devuelve quién es el usuario del token. La usa el sitio para decidir si
 * muestra el botón de administración, sin confiar en lo que diga el navegador.
 */
app.get("/sesion", requiereSesion, (pedido, respuesta) => {
  respuesta.json({
    email: pedido.usuario.email,
    administrador: pedido.usuario.administrador,
  });
});

app.listen(PUERTO, () => {
  console.log(`API escuchando en http://localhost:${PUERTO}`);
});
