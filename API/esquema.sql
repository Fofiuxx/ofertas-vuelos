-- Esquema mínimo para levantar la API.
--   mysql -u root -p < esquema.sql

CREATE DATABASE IF NOT EXISTS viajes
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE viajes;

CREATE TABLE IF NOT EXISTS usuarios (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(255) NOT NULL,
  -- 60 caracteres: es el largo fijo de un hash bcrypt.
  pass          CHAR(60)     NOT NULL,
  administrador TINYINT(1)   NOT NULL DEFAULT 0,
  creado        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Sin esto, dos personas podían registrarse con el mismo correo.
  UNIQUE KEY uk_usuarios_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS permisos (
  id     INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS permisosxusuario (
  usuario_id INT NOT NULL,
  permiso_id INT NOT NULL,
  PRIMARY KEY (usuario_id, permiso_id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (permiso_id) REFERENCES permisos(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ofertas (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  origen  VARCHAR(100)   NOT NULL,
  destino VARCHAR(100)   NOT NULL,
  salida  DATETIME       NOT NULL,
  llegada DATETIME       NOT NULL,
  cupos   INT            NOT NULL DEFAULT 0,
  precio  DECIMAL(10, 2) NOT NULL DEFAULT 0
) ENGINE=InnoDB;

INSERT IGNORE INTO permisos (id, nombre) VALUES
  (1, 'administrar'),
  (2, 'consultar');

INSERT INTO ofertas (origen, destino, salida, llegada, cupos, precio) VALUES
  ('San José',     'Ciudad de Panamá', '2026-09-04 06:30:00', '2026-09-04 07:45:00', 24, 189.00),
  ('San José',     'Bogotá',           '2026-09-05 09:15:00', '2026-09-05 12:05:00', 12, 264.50),
  ('San José',     'Ciudad de México', '2026-09-07 14:00:00', '2026-09-07 17:20:00',  8, 312.00),
  ('Liberia',      'Miami',            '2026-09-09 07:00:00', '2026-09-09 10:40:00', 31, 278.75);
