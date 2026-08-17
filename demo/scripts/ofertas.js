/* Listado de ofertas de vuelos. Depende de sesion.js. */

async function ofertas() {
  const usuario = await exigirSesion();
  if (!usuario) return;

  // El botón de administración solo se le muestra a quien puede usarlo, pero
  // la protección real está en la API: aunque alguien lo haga aparecer a mano
  // desde la consola, POST y DELETE /ofertas responden 403 si el token no es
  // de un administrador.
  const botonAdmin = document.getElementById("btn-administracion");
  if (botonAdmin) botonAdmin.hidden = !usuario.administrador;

  const contenedor = document.getElementById("div-ofertas");

  try {
    const datos = await pedir("/ofertas");

    if (datos.length === 0) {
      contenedor.textContent = "No hay ofertas disponibles por ahora.";
      return;
    }

    contenedor.replaceChildren(...datos.map(construirTarjeta));
  } catch (error) {
    contenedor.textContent = "No se pudieron cargar las ofertas: " + error.message;
  }
}

function formatearFecha(valor) {
  const fecha = new Date(valor);
  return isNaN(fecha)
    ? valor
    : fecha.toLocaleString("es-CR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function construirTarjeta(item) {
  const div = document.createElement("div");
  div.className = "div-item";

  const imagen = document.createElement("img");
  imagen.src = "../img/fly.png";
  imagen.alt = "";

  const ruta = document.createElement("div");
  ruta.className = "item-ruta";
  ruta.append(crearDiv(item.origen), crearDiv(item.destino));

  const info = document.createElement("div");
  info.className = "item-info";
  info.append(
    crearDiv(formatearFecha(item.salida)),
    crearDiv("Cupos: " + item.cupos),
    crearDiv(formatearFecha(item.llegada))
  );

  const precio = crearDiv("$ " + item.precio);
  precio.className = "item-precio";

  div.append(imagen, ruta, info, precio);
  return div;
}

function crearDiv(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div;
}

function redirigir() {
  window.location.href = "administracion.html";
}
