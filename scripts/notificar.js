/**
 * SCRIPT DE NOTIFICACIÓN AUTOMÁTICA POR CORREO
 * Ejecutado por GitHub Actions al detectar una nueva carta en data/cartas.json
 * O probado en local con 'npm run test-email'
 */

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// Si existe un archivo .env local, cargarlo en process.env (para pruebas en local)
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.substring(0, idx).trim();
      const val = trimmed.substring(idx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

async function main() {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASS;
  const rebecaEmail = process.env.REBECA_EMAIL;
  const lenekerEmail = process.env.LENEKER_EMAIL || gmailUser;
  const webUrl = process.env.WEB_URL || 'https://lenekerc98.github.io/espaciointimo/';

  if (!gmailUser || !gmailPass) {
    console.error('❌ Faltan las variables de entorno GMAIL_USER o GMAIL_APP_PASS (en .env o GitHub Secrets).');
    process.exit(1);
  }

  // Leer cartas.json
  const cartasPath = path.join(__dirname, '..', 'data', 'cartas.json');
  if (!fs.existsSync(cartasPath)) {
    console.error('❌ No se encontró data/cartas.json');
    process.exit(1);
  }

  const cartas = JSON.parse(fs.readFileSync(cartasPath, 'utf8'));
  if (!cartas || cartas.length === 0) {
    console.log('ℹ️ No hay cartas para notificar.');
    return;
  }

  // Tomar la carta más reciente (primera de la lista)
  const ultimaCarta = cartas[0];
  const remitente = ultimaCarta.de;
  const destinatario = ultimaCarta.para;

  // Determinar a qué correo enviar
  let emailDestino = null;
  if (destinatario && destinatario.toLowerCase().includes('rebeca')) {
    emailDestino = rebecaEmail;
  } else {
    emailDestino = lenekerEmail;
  }

  if (!emailDestino) {
    console.error(❌ No se ha configurado el correo de destino para . Revisa la variable REBECA_EMAIL o LENEKER_EMAIL.);
    process.exit(1);
  }

  console.log(💌 Enviando notificación de carta de  para  ()...);

  // Configurar transporte SMTP con Gmail
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPass
    }
  });

  const mailOptions = {
    from: "Nuestro Rincón Secreto 💌" <>,
    to: emailDestino,
    subject: 💌 Tienes una nueva carta de ,
    html: 
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0c0910; color: #f8f4fa; margin: 0; padding: 30px 15px; }
          .card { max-width: 540px; margin: 0 auto; background: #17101f; border-radius: 18px; border: 1px solid #e28d99; padding: 35px 25px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
          .icon { font-size: 48px; margin-bottom: 12px; }
          h1 { color: #f8f4fa; font-size: 24px; margin-bottom: 10px; }
          p { color: #b9a8c4; font-size: 15px; line-height: 1.6; margin-bottom: 22px; }
          .quote { background: rgba(226, 141, 153, 0.1); border-left: 3px solid #e28d99; padding: 12px 18px; text-align: left; font-style: italic; color: #f8f4fa; border-radius: 4px; margin-bottom: 25px; }
          .btn { display: inline-block; background: #8e253c; color: #ffffff !important; text-decoration: none; padding: 13px 30px; border-radius: 50px; font-weight: bold; font-size: 15px; box-shadow: 0 4px 15px rgba(226, 141, 153, 0.4); }
          .footer { margin-top: 25px; font-size: 12px; color: #7f6e8c; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">💌</div>
          <h1>¡Tienes una nueva carta!</h1>
          <p><strong></strong> te ha dejado una carta especial en nuestro rincón secreto:</p>
          <div class="quote">
            <strong>""</strong><br>
            <span>"..."</span>
          </div>
          <a href="" class="btn" target="_blank">Abrir Carta en Nuestro Rincón ✨</a>
          <div class="footer">
            <p>Este es un espacio íntimo y privado para nosotros dos 💞</p>
          </div>
        </div>
      </body>
      </html>
    
  };

  const info = await transporter.sendMail(mailOptions);
  console.log('✅ Correo enviado con éxito! ID:', info.messageId);
}

main().catch(err => {
  console.error('❌ Error enviando el correo:', err);
  process.exit(1);
});
