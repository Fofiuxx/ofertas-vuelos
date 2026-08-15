/**
 * Conexión a MySQL.
 *
 * Las credenciales vienen de variables de entorno, nunca escritas en el código:
 * este archivo se sube a GitHub, el archivo .env no.
 *
 * Se usa un pool en vez de una conexión suelta porque una conexión única se
 * cae al primer corte de red y ya no se recupera; el pool reconecta solo.
 */

require("dotenv").config();
const mysql = require("mysql2/promise");

const requeridas = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME", "JWT_SECRET"];
const faltantes = requeridas.filter((clave) => !process.env[clave]);

if (faltantes.length > 0) {
  console.error(
    "Faltan variables de entorno: " + faltantes.join(", ") +
    "\nCopia .env.example a .env y rellénalo."
  );
  process.exit(1);
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = { pool };
