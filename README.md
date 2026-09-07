# 💌 Para Rebeca & Leneker | Nuestro Rincón Secreto

Una plataforma web privada, romántica y estética pensada exclusivamente para dos personas: **Rebeca** y **Leneker**.
Permite guardar cartas selladas en sobres virtuales, ver fotos en un carrusel dinámico de recuerdos y recibir correos de notificación automáticos cada vez que se publica una carta nueva.

---

## 🌟 Características Principales

1. **Acceso Privado con Contraseña**:
   - Cada uno tiene su perfil de acceso con clave secreta (modificable en `js/app.js`).
   - Bloqueo de miradas curiosas.
2. **Carrusel Dinámico de Fotografías**:
   - Las fotos cambian suavemente cada 5 segundos con efectos de transición cinematográficos.
   - Fácil de personalizar agregando fotos a `assets/fotos/`.
3. **Buzón de Cartas Selladas**:
   - Cartas interactivas estilo sobre sellado con lacre de cera.
   - Al abrirlas, se despliega una carta en pergamino con tipografía editorial.
4. **Editor de Cartas**:
   - Botón visual para redactar cartas desde la propia web y descargar el `cartas.json` listo.
5. **Notificación Automática por Correo (GitHub Actions)**:
   - Usa tu cuenta de **Gmail** con **Contraseña de Aplicaciones** (100% seguro mediante GitHub Secrets).
   - Cuando haces `git push` con una carta nueva, GitHub envía automáticamente un correo personalizado a Rebeca o a ti.
6. **Música de Fondo Íntima**:
   - Reproductor flotante con melodía romántica de piano.

---

## 📸 Cómo colocar tus propias fotos

1. Coloca tus imágenes dentro de la carpeta `assets/fotos/` (por ejemplo: `foto1.jpg`, `foto2.jpg`, `foto3.jpg`, etc.).
2. Abre `data/fotos.json` y personaliza el título, fecha y descripción de cada foto:
   ```json
   {
     "id": "foto-1",
     "url": "assets/fotos/tu_foto.jpg",
     "titulo": "Nuestro viaje a la playa",
     "fecha": "14 de Febrero",
     "descripcion": "Un atardecer que jamás olvidaré"
   }
   ```

---

## 🔑 Cómo cambiar las contraseñas de acceso

Abre el archivo `js/app.js`. En la parte superior encontrarás:
```javascript
const APP_CONFIG = {
  passwords: {
    Rebeca: ['rebeca2026', '2026'], // Contraseñas válidas para Rebeca
    Leneker: ['leneker2026', '2026']  // Contraseñas válidas para Leneker
  },
  slideshowInterval: 5000 // Tiempo entre cada foto en milisegundos
};
```
Puedes poner cualquier palabra, fecha o clave secreta que compartan.

---

## 🚀 Despliegue en GitHub Pages (Paso a Paso)

1. **Sube este proyecto a tu repositorio de GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Creación de nuestro rincón secreto"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
   git push -u origin main
   ```

2. **Activa GitHub Pages**:
   - En tu repositorio de GitHub, ve a **Settings** -> **Pages**.
   - En **Source**, selecciona **Deploy from a branch**.
   - Elige la rama **`main`** y la carpeta **`/(root)`**.
   - Haz clic en **Save**. En un par de minutos, GitHub te dará el enlace público de tu página web (ejemplo: `https://tu_usuario.github.io/tu_repositorio/`).

---

## 📬 Configuración del Envío de Correos (GitHub Secrets)

Para que GitHub Actions envíe el correo a Rebeca usando tu Gmail y tu contraseña de aplicaciones sin que nadie pueda verla:

1. En tu repositorio de GitHub, ve a **Settings** -> **Secrets and variables** -> **Actions**.
2. Haz clic en **New repository secret** y añade estos 5 secretos:

| Nombre del Secreto | Valor |
| :--- | :--- |
| `GMAIL_USER` | Tu dirección de Gmail (ej. `tu_correo@gmail.com`) |
| `GMAIL_APP_PASS` | Tu contraseña de aplicaciones de Google (16 letras generadas en tu cuenta de Google) |
| `REBECA_EMAIL` | El correo de Rebeca donde recibirá el aviso |
| `LENEKER_EMAIL` | Tu correo donde recibirás el aviso si Rebeca escribe |
| `WEB_URL` | El enlace de tu GitHub Pages (ej. `https://tu_usuario.github.io/tu_repositorio/`) |

---

## ✍️ Cómo escribir una nueva carta

1. Entra a la web, haz clic en **"✍️ Escribir Carta"**.
2. Escribe el título y el mensaje con todo tu cariño.
3. Haz clic en **"✨ Guardar Carta"** (se descargará el archivo `cartas.json` actualizado).
4. Reemplaza el archivo `data/cartas.json` en tu carpeta del proyecto.
5. Haz commit y push:
   ```bash
   git add data/cartas.json
   git commit -m "Nueva carta para Rebeca"
   git push
   ```
6. **¡Y listo!** GitHub Actions detectará la nueva carta y enviará el correo a Rebeca inmediatamente con el enlace para leerla.
