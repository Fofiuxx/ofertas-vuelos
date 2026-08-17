/**
 * Backend simulado para la demo publicada.
 *
 * El sitio real habla con la API de Express en localhost:3000. En una página
 * de GitHub Pages no hay servidor, así que este archivo intercepta `fetch` y
 * responde él mismo, imitando lo que devuelve la API de verdad: los mismos
 * códigos de estado, los mismos mensajes de error y la misma forma del JSON.
 *
 * Importante: sesion.js, usuarios.js y ofertas.js corren sin ninguna
 * modificación. Lo que se está ejecutando es el frontend real; lo único
 * simulado es lo que hay del otro lado del cable.
 *
 * Lo que NO se simula, porque no tendría sentido: el hash bcrypt y la firma
 * del JWT. Eso ocurre en el servidor y es justamente lo que no se puede
 * llevar al navegador — si la clave de firma viviera aquí, cualquiera podría
 * emitir sus propios tokens.
 */

(function () {
  "use strict";

  var API = "http://localhost:3000";
  var CLAVE_DATOS = "tripexpress-demo-datos";

  var SEMILLA = {
    usuarios: [
      { id: 1, email: "demo@tripexpress.cr", pass: "Demo1234", administrador: false },
      { id: 2, email: "admin@tripexpress.cr", pass: "Admin1234", administrador: true },
    ],
    ofertas: [
      { id: 1, origen: "San José", destino: "Ciudad de Panamá", salida: "2026-09-04T06:30", llegada: "2026-09-04T07:45", cupos: 24, precio: 189.0 },
      { id: 2, origen: "San José", destino: "Bogotá", salida: "2026-09-05T09:15", llegada: "2026-09-05T12:05", cupos: 12, precio: 264.5 },
      { id: 3, origen: "San José", destino: "Ciudad de México", salida: "2026-09-07T14:00", llegada: "2026-09-07T17:20", cupos: 8, precio: 312.0 },
      { id: 4, origen: "Liberia", destino: "Miami", salida: "2026-09-09T07:00", llegada: "2026-09-09T10:40", cupos: 31, precio: 278.75 },
    ],
  };

  function cargar() {
    try {
      var guardado = sessionStorage.getItem(CLAVE_DATOS);
      if (guardado) return JSON.parse(guardado);
    } catch (e) { /* sessionStorage bloqueado */ }
    return JSON.parse(JSON.stringify(SEMILLA));
  }

  function guardar(datos) {
    try { sessionStorage.setItem(CLAVE_DATOS, JSON.stringify(datos)); } catch (e) { /* da igual */ }
  }

  var datos = cargar();

  /* ---------- tokens de mentira, con la misma forma ---------- */

  function crearToken(usuario) {
    var carga = { usuarioId: usuario.id, email: usuario.email, administrador: usuario.administrador };
    return "demo." + btoa(unescape(encodeURIComponent(JSON.stringify(carga)))) + ".sinfirma";
  }

  function leerToken(cabecera) {
    if (!cabecera || cabecera.indexOf("Bearer ") !== 0) return null;
    var partes = cabecera.slice(7).split(".");
    if (partes.length !== 3 || partes[0] !== "demo") return null;
    try { return JSON.parse(decodeURIComponent(escape(atob(partes[1])))); } catch (e) { return null; }
  }

  /* ---------- respuestas ---------- */

  function responder(estado, cuerpo) {
    var texto = cuerpo === undefined ? "" : JSON.stringify(cuerpo);
    return new Response(texto, {
      status: estado,
      headers: { "Content-Type": "application/json" },
    });
  }

  var REGLA_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  function manejar(ruta, metodo, cuerpo, usuario) {
    // ── Usuarios ──────────────────────────────────────────────
    if (ruta === "/usuarios/login" && metodo === "POST") {
      if (!cuerpo.email || !cuerpo.pass) return responder(400, { error: "Falta el email o la contraseña" });
      var hallado = datos.usuarios.filter(function (u) { return u.email === cuerpo.email; })[0];
      // Mismo error exista o no el correo, igual que la API real.
      if (!hallado || hallado.pass !== cuerpo.pass) {
        return responder(401, { error: "Email o contraseña incorrectos" });
      }
      return responder(200, {
        token: crearToken(hallado),
        usuario: { id: hallado.id, email: hallado.email, administrador: hallado.administrador },
      });
    }

    if (ruta === "/usuarios/create" && metodo === "POST") {
      if (!cuerpo.email || !cuerpo.pass) return responder(400, { error: "Falta el email o la contraseña" });
      if (!REGLA_PASSWORD.test(cuerpo.pass)) {
        return responder(400, {
          error: "La contraseña necesita al menos 8 caracteres, una mayúscula, una minúscula y un número",
        });
      }
      if (datos.usuarios.some(function (u) { return u.email === cuerpo.email; })) {
        return responder(409, { error: "Ese email ya está registrado" });
      }
      var nuevo = {
        id: Math.max.apply(null, datos.usuarios.map(function (u) { return u.id; })) + 1,
        email: cuerpo.email, pass: cuerpo.pass, administrador: false,
      };
      datos.usuarios.push(nuevo);
      guardar(datos);
      return responder(201, { id: nuevo.id, email: nuevo.email });
    }

    // ── A partir de aquí hace falta sesión ────────────────────
    if (ruta === "/sesion" && metodo === "GET") {
      if (!usuario) return responder(401, { error: "Falta el token de sesión" });
      return responder(200, { email: usuario.email, administrador: usuario.administrador });
    }

    // ── Ofertas ───────────────────────────────────────────────
    if (ruta === "/ofertas" && metodo === "GET") {
      var lista = datos.ofertas.slice().sort(function (a, b) {
        return String(a.salida).localeCompare(String(b.salida));
      });
      return responder(200, lista);
    }

    if (ruta === "/ofertas" && metodo === "POST") {
      if (!usuario) return responder(401, { error: "Falta el token de sesión" });
      if (!usuario.administrador) return responder(403, { error: "No tienes permiso para esto" });
      if (!cuerpo.origen || !cuerpo.destino) return responder(400, { error: "Faltan datos de la oferta" });
      var oferta = {
        id: Math.max.apply(null, datos.ofertas.map(function (o) { return o.id; }).concat([0])) + 1,
        origen: cuerpo.origen, destino: cuerpo.destino,
        salida: cuerpo.salida, llegada: cuerpo.llegada,
        cupos: Number(cuerpo.cupos) || 0, precio: Number(cuerpo.precio) || 0,
      };
      datos.ofertas.push(oferta);
      guardar(datos);
      return responder(201, { id: oferta.id });
    }

    var borrado = ruta.match(/^\/ofertas\/(\d+)$/);
    if (borrado && metodo === "DELETE") {
      if (!usuario) return responder(401, { error: "Falta el token de sesión" });
      if (!usuario.administrador) return responder(403, { error: "No tienes permiso para esto" });
      var antes = datos.ofertas.length;
      datos.ofertas = datos.ofertas.filter(function (o) { return o.id !== Number(borrado[1]); });
      if (datos.ofertas.length === antes) return responder(404, { error: "Esa oferta no existe" });
      guardar(datos);
      return responder(204);
    }

    return responder(404, { error: "Ruta no encontrada en la demo" });
  }

  /* ---------- intercepción ---------- */

  var fetchOriginal = window.fetch.bind(window);

  window.fetch = function (recurso, opciones) {
    var url = typeof recurso === "string" ? recurso : (recurso && recurso.url) || "";

    if (url.indexOf(API) !== 0) {
      return fetchOriginal(recurso, opciones);
    }

    opciones = opciones || {};
    var ruta = url.slice(API.length);
    var metodo = (opciones.method || "GET").toUpperCase();
    var cuerpo = {};
    if (opciones.body) { try { cuerpo = JSON.parse(opciones.body); } catch (e) { cuerpo = {}; } }

    var cabeceras = opciones.headers || {};
    var usuario = leerToken(cabeceras.Authorization || cabeceras.authorization);

    // Un retardo corto para que se note que hay una llamada de por medio
    // y no parezca que los datos estaban ya en la página.
    return new Promise(function (resolver) {
      setTimeout(function () { resolver(manejar(ruta, metodo, cuerpo, usuario)); }, 180);
    });
  };

  console.info(
    "TripExpress · demo con backend simulado.\n" +
    "El frontend es el real; las respuestas las genera demo-backend.js.\n" +
    "Usuario: demo@tripexpress.cr / Demo1234 — Admin: admin@tripexpress.cr / Admin1234"
  );
})();
