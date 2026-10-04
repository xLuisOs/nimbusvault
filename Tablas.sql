CREATE TABLE usuarios (
                          id INT AUTO_INCREMENT PRIMARY KEY,
                          nombre_usuario VARCHAR(50) NOT NULL UNIQUE,
                          email VARCHAR(100) NOT NULL UNIQUE,
                          password_hash VARCHAR(255) NOT NULL, -- Nunca guardes contraseñas en texto plano
                          rol VARCHAR(50) NOT NULL DEFAULT 'usuario',
                          fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
#historial
CREATE TABLE historial_accesos (
                                   id INT AUTO_INCREMENT PRIMARY KEY,
                                   usuario_id INT NOT NULL,
                                   fecha_hora_acceso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                   direccion_ip VARCHAR(45), -- Soporta IPv4 e IPv6
                                   dispositivo_navegador VARCHAR(255), -- User-Agent del navegador o app
                                   exitoso BOOLEAN DEFAULT TRUE, -- Útil para registrar intentos fallidos
                                   FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
