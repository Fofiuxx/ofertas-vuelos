# TripExpress — Ofertas de vuelos

Sitio de ofertas de vuelos con API propia: catálogo público, cuentas de usuario
y un panel de administración restringido.

- **API** — Node.js, Express, MySQL, autenticación por JWT
- **Sitio** — HTML, CSS y JavaScript sin frameworks

Nació como el proyecto final de un curso de JavaScript. La versión original
tenía varios fallos de seguridad; abajo está lo que eran y cómo se corrigieron,
porque esa parte es la que de verdad enseñó algo.

---

## Levantarlo

**1. Base de datos.** Con MySQL corriendo:

```bash
mysql -u root -p < API/esquema.sql
```

**2. Configuración.** Copia el ejemplo y rellénalo:

```bash
cp API/.env.example API/.env
```

La clave para firmar los tokens se genera así:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**3. API.**

```bash
cd API && npm install && npm start
```

**4. Sitio.** Sírvelo con cualquier servidor estático — abrir el HTML con doble
clic no funciona, porque el navegador bloquea las llamadas a la API desde
`file://`:

```bash
npx serve SitioWeb
```

Para crear un administrador, registra un usuario normal desde el sitio y luego
súbelo de rango:

```bash
mysql -u root -p viajes -e "UPDATE usuarios SET administrador = 1 WHERE email = 'tu@correo.com';"
```

---

## Lo que estaba mal y cómo se arregló

### 1. Inyección SQL en el login

Las consultas se armaban pegando lo que escribía el usuario dentro del texto SQL:

```js
// antes
'SELECT id FROM usuarios WHERE email = "' + pedido.body.email + '" AND pass = "' + pedido.body.pass + '"'
```

Con un email como `" OR "1"="1` la condición se volvía siempre verdadera y se
entraba a cualquier cuenta sin saber la contraseña.

Ahora la sentencia y los datos viajan por separado. El driver nunca interpreta
como SQL lo que va en los parámetros:

```js
// ahora
await pool.query("SELECT id, email, pass, administrador FROM usuarios WHERE email = ?", [email]);
```

### 2. Contraseñas guardadas en texto plano

El registro insertaba la contraseña tal cual y el login la comparaba dentro del
`WHERE`. Quien viera la base de datos veía todas las contraseñas.

Ahora se guarda un hash bcrypt de 12 rondas y la comparación la hace
`bcrypt.compare`, que además no cortocircuita al primer carácter distinto, así
que el tiempo de respuesta no filtra información.

Había un `bcrypt.genSaltSync(0)` en el código original: cero rondas equivale a
no proteger nada.

### 3. El código de seguridad estaba en el navegador

`seguridad.js` vivía en `SitioWeb/scripts/`, con `require` y `module.exports` —
sintaxis de Node que un navegador no ejecuta, así que nunca llegó a correr. Y
aunque hubiera corrido, la clave de firma habría quedado a la vista de cualquiera.

Ese archivo ahora está en `API/`, que es donde se puede confiar en él.

### 4. No había sesión de verdad

El login respondía `true` y el sitio redirigía. Nada impedía escribir
`home.html` o `administracion.html` en la barra de direcciones y entrar.

Ahora el login devuelve un JWT que caduca en una hora. Las páginas protegidas le
preguntan a la API quién eres (`GET /sesion`), y las operaciones de escritura
pasan por dos middlewares: `requiereSesion` y `requiereAdministrador`.

El botón de administración se oculta a los no administradores, pero eso es solo
cosmética — la protección está en la API, que responde 403 aunque alguien haga
aparecer el botón desde la consola.

### 5. Credenciales escritas en el código

`connection.js` traía usuario y contraseña de MySQL. Ahora salen de variables de
entorno, con `.env` en el `.gitignore` y un `.env.example` que documenta cuáles
hacen falta.

### 6. Fugas y detalles

- El login respondía distinto según si el email existía o no, lo que permitía
  averiguar qué correos estaban registrados. Ahora ambos casos dan el mismo error.
- El registro creaba el usuario y su permiso en dos consultas sueltas; si la
  segunda fallaba quedaba un usuario sin permisos. Ahora van en una transacción.
- Faltaba un índice único en `email`: dos personas podían registrarse con el
  mismo correo.
- La validación de la contraseña solo estaba en el navegador, donde se puede
  saltar. Ahora también está en la API.
- El registro avisaba «Usuario creado» sin esperar la respuesta, así que decía
  que había funcionado aunque hubiera fallado.
- El login aplicaba `/^[a-zA-Z0-9]+$/` a la contraseña y descartaba en silencio
  cualquiera que tuviera un símbolo: el botón no hacía nada y no se sabía por qué.

---

## Endpoints

| Método | Ruta | Acceso |
|---|---|---|
| `POST` | `/usuarios/create` | Público |
| `POST` | `/usuarios/login` | Público |
| `GET` | `/sesion` | Con sesión |
| `GET` | `/ofertas` | Público |
| `POST` | `/ofertas` | Solo administradores |
| `DELETE` | `/ofertas/:id` | Solo administradores |
