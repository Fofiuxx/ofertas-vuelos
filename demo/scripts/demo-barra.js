/**
 * Barra de navegación de la demo.
 *
 * Solo existe en la versión publicada, no en el sitio real. Cumple dos
 * funciones: recordar que lo que se está viendo es una demo con datos
 * simulados, y dar salida — sin esto, quien entra queda encerrado en el
 * flujo de login sin forma de volver.
 *
 * Se inyecta desde JavaScript para no repetir el mismo bloque en las
 * cuatro páginas.
 */

(function () {
  "use strict";

  // Cada página vive en /demo/pages/, salvo el índice.
  var RAIZ = "../";
  var PORTAFOLIO = "https://fofiuxx.github.io/portfolio/";

  var estilos = document.createElement("style");
  estilos.textContent = [
    ".barra-demo{position:fixed;top:0;left:0;right:0;z-index:100;",
    "display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;",
    "padding:9px 18px;background:#1c2430;color:#e8edf5;",
    "font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;",
    "font-size:13px;box-shadow:0 1px 10px rgba(0,0,0,.18)}",
    ".barra-demo .marca{font-weight:700;letter-spacing:.02em}",
    ".barra-demo .nota{color:#9fb0c4;flex:1;min-width:180px}",
    ".barra-demo a{color:#e8edf5;text-decoration:none;border:1px solid #3a4757;",
    "border-radius:6px;padding:5px 11px;white-space:nowrap;transition:background .15s,border-color .15s}",
    ".barra-demo a:hover{background:#2a3545;border-color:#5b6b80}",
    "body{padding-top:52px !important}",
    "@media(max-width:560px){.barra-demo .nota{display:none}}",
  ].join("");
  document.head.appendChild(estilos);

  function enlace(texto, destino, nuevaPestana) {
    var a = document.createElement("a");
    a.textContent = texto;
    a.href = destino;
    if (nuevaPestana) { a.target = "_blank"; a.rel = "noopener"; }
    return a;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var barra = document.createElement("div");
    barra.className = "barra-demo";

    var marca = document.createElement("span");
    marca.className = "marca";
    marca.textContent = "TripExpress · demo";

    var nota = document.createElement("span");
    nota.className = "nota";
    nota.textContent = "Datos simulados: se reinician al cerrar la pestaña.";

    barra.appendChild(marca);
    barra.appendChild(nota);

    // Solo tiene sentido "volver atrás" si se llegó desde otra página.
    if (document.referrer && history.length > 1) {
      var atras = enlace("← Atrás", "#");
      atras.addEventListener("click", function (e) { e.preventDefault(); history.back(); });
      barra.appendChild(atras);
    }

    barra.appendChild(enlace("Inicio de la demo", RAIZ + "index.html"));
    barra.appendChild(enlace("Portafolio", PORTAFOLIO, true));

    document.body.insertBefore(barra, document.body.firstChild);
  });
})();
