/**
 * SCRIPT DE NOTIFICACIÓN AUTOMÁTICA POR CORREO
 * Ejecutado por GitHub Actions al detectar una nueva carta en data/cartas.json
 * O probado en local con 'node scripts/notificar.js' o 'node scripts/notificar.js --test'
 */

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// Si existe un archivo .env local, cargarlo en process.env
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
  const isTestArg = process.argv.includes('--test');
  const targetArg = process.argv.find(arg => arg.startsWith('--to='));

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASS;
  const rebecaEmail = process.env.REBECA_EMAIL;
  const lenekerEmail = process.env.LENEKER_EMAIL || gmailUser;
  const webUrl = process.env.WEB_URL || 'https://lenekerc98.github.io/rincondeamor/';

  if (!gmailUser || !gmailPass) {
    console.error('❌ Faltan las variables de entorno GMAIL_USER o GMAIL_APP_PASS (en .env o GitHub Secrets).');
    process.exit(1);
  }

  // Leer cartas.json
  const cartasPath = path.join(__dirname, '..', 'data', 'cartas.json');
  let cartas = [];
  if (fs.existsSync(cartasPath)) {
    try {
      cartas = JSON.parse(fs.readFileSync(cartasPath, 'utf8'));
    } catch (e) {
      console.error('⚠️ Error al leer data/cartas.json:', e.message);
    }
  }

  // Si no hay cartas y es test, creamos una carta de prueba
  let carta = null;
  if (cartas && cartas.length > 0) {
    carta = cartas[0];
  } else {
    carta = {
      titulo: 'Prueba de Conexión',
      de: 'Leneker',
      para: 'Rebeca',
      extracto: 'Este es un correo de prueba para verificar que las notificaciones funcionan.',
      contenido: 'Este es un correo de prueba para verificar que las notificaciones funcionan perfectamente.'
    };
  }

  const remitente = carta.de || 'Leneker';
  const destinatario = carta.para || 'Rebeca';

  // Determinar destinatario
  let emailDestino = null;
  if (targetArg) {
    emailDestino = targetArg.replace('--to=', '').trim();
  } else if (isTestArg) {
    emailDestino = lenekerEmail;
  } else if (destinatario.toLowerCase().includes('rebeca')) {
    emailDestino = rebecaEmail;
  } else {
    emailDestino = lenekerEmail;
  }

  if (!emailDestino) {
    console.error(`❌ No se encontró dirección de correo para ${destinatario}. Revisa .env (REBECA_EMAIL / LENEKER_EMAIL).`);
    process.exit(1);
  }

  console.log(`💌 Enviando notificación de carta de "${remitente}" para "${destinatario}" a <${emailDestino}>...`);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPass
    }
  });

  const mailOptions = {
    from: `"Nuestro Rincón Secreto 💌" <${gmailUser}>`,
    to: emailDestino,
    subject: `💌 Tienes una nueva carta de ${remitente}: "${carta.titulo}"`,
    html: `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0c0910; color: #f8f4fa; margin: 0; padding: 30px 15px; }
          .card { max-width: 560px; margin: 0 auto; background: #17101f; border-radius: 18px; border: 1px solid #e28d99; padding: 35px 25px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
          .icon { font-size: 50px; margin-bottom: 12px; }
          h1 { color: #f8f4fa; font-size: 24px; margin-bottom: 8px; }
          p { color: #d6c6e0; font-size: 15px; line-height: 1.6; margin-bottom: 20px; }
          .quote { background: rgba(226, 141, 153, 0.12); border-left: 3px solid #e28d99; padding: 15px 20px; text-align: left; font-style: italic; color: #f8f4fa; border-radius: 6px; margin: 20px 0 25px 0; }
          .btn { display: inline-block; background: linear-gradient(135deg, #c4385a, #8e253c); color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 50px; font-weight: bold; font-size: 15px; box-shadow: 0 4px 15px rgba(226, 141, 153, 0.4); }
          .footer { margin-top: 28px; font-size: 12px; color: #8a7b97; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">💌</div>
          <h1>¡Tienes una nueva carta!</h1>
          <p><strong>${remitente}</strong> te ha dejado una carta especial en nuestro rincón secreto:</p>
          <div class="quote">
            <strong style="color: #f1b3bc; font-size: 16px;">"${carta.titulo}"</strong><br><br>
            <span>"${carta.extracto || carta.contenido.slice(0, 120) + '...'}"</span>
          </div>
          <br>
          <a href="${webUrl}" class="btn" target="_blank">Abrir Carta en Nuestro Rincón ✨</a>
          <div class="footer">
            <p>Este es un espacio íntimo y privado para nosotros dos 💞</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`✅ ¡Correo enviado con éxito a ${emailDestino}! ID:`, info.messageId);
}

main().catch(err => {
  console.error('❌ Error enviando el correo:', err);
  process.exit(1);
});
