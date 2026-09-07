/**
 * SCRIPT DE NOTIFICACIÓN AUTOMÁTICA POR CORREO CON LOGS EN FIREBASE
 * Lee cartas desde Firebase Firestore (o data/cartas.json) y envía el correo por Gmail.
 * Registra cada intento (exitoso o fallido) en la colección 'email_logs' de Firestore.
 */

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// Cargar .env si existe (pruebas locales)
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

const FIRESTORE_PROJECT = 'rinconcitodeamor-e5ab5';

async function logToFirestore(logData) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents/email_logs`;
    const fields = {};
    for (const key in logData) {
      const val = logData[key];
      if (typeof val === 'number') {
        fields[key] = { integerValue: val.toString() };
      } else if (typeof val === 'boolean') {
        fields[key] = { booleanValue: val };
      } else {
        fields[key] = { stringValue: String(val || '') };
      }
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
    if (res.ok) {
      console.log('📝 Log registrado en Firebase Firestore (email_logs).');
    } else {
      const errTxt = await res.text();
      console.warn('⚠️ No se pudo guardar log en Firestore:', errTxt);
    }
  } catch (e) {
    console.warn('⚠️ Error al registrar log en Firestore:', e.message);
  }
}

async function main() {
  const isTestArg = process.argv.includes('--test');
  const targetArg = process.argv.find(arg => arg.startsWith('--to='));
  const idArg = process.argv.find(arg => arg.startsWith('--id='));
  const targetId = idArg ? idArg.replace('--id=', '').trim() : (process.env.INPUT_CARTA_ID || '').trim();

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASS;
  const rebecaEmail = process.env.REBECA_EMAIL;
  const lenekerEmail = process.env.LENEKER_EMAIL || gmailUser;
  const webUrl = process.env.WEB_URL || 'https://lenekerc98.github.io/rincondeamor/';

  if (!gmailUser || !gmailPass) {
    const err = 'Faltan las variables de entorno GMAIL_USER o GMAIL_APP_PASS.';
    await logToFirestore({
      estado: 'FALLIDO',
      error: err,
      fecha: new Date().toISOString(),
      timestamp: Date.now()
    });
    console.error('❌ ' + err);
    process.exit(1);
  }

  // 1. Obtener cartas desde Firestore
  let cartas = [];
  try {
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents/cartas`;
    const res = await fetch(firestoreUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.documents && data.documents.length > 0) {
        cartas = data.documents.map(doc => {
          const fields = doc.fields || {};
          const obj = {};
          for (const k in fields) {
            obj[k] = fields[k].stringValue ?? fields[k].integerValue ?? fields[k].booleanValue;
          }
          return obj;
        });
        cartas.sort((a, b) => {
          const tA = Number(a.timestamp) || parseInt(String(a.id).replace('carta-', '')) || 0;
          const tB = Number(b.timestamp) || parseInt(String(b.id).replace('carta-', '')) || 0;
          return tB - tA;
        });
      }
    }
  } catch (e) {
    console.warn('⚠️ No se pudo consultar Firestore REST, intentando data/cartas.json local:', e.message);
  }

  // Fallback a cartas.json local si no hubo cartas en Firestore
  if (cartas.length === 0) {
    const cartasPath = path.join(__dirname, '..', 'data', 'cartas.json');
    if (fs.existsSync(cartasPath)) {
      try {
        cartas = JSON.parse(fs.readFileSync(cartasPath, 'utf8'));
      } catch (e) {}
    }
  }

  // Seleccionar la carta objetivo
  let carta = null;
  if (targetId) {
    carta = cartas.find(c => c.id === targetId);
  }
  if (!carta && cartas.length > 0) {
    carta = cartas[0];
  }
  if (!carta) {
    carta = {
      id: 'test-' + Date.now(),
      titulo: 'Prueba de Conexión',
      de: 'Leneker',
      para: 'Rebeca',
      extracto: 'Este es un correo de prueba para verificar las notificaciones y los logs.',
      contenido: 'Este es un correo de prueba para verificar que las notificaciones y los logs en Firebase funcionan perfectamente.'
    };
  }

  const remitente = carta.de || 'Leneker';
  const destinatario = carta.para || 'Rebeca';

  // Determinar destinatario de correo
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
    const err = `No se encontró dirección de correo para ${destinatario}.`;
    await logToFirestore({
      carta_id: carta.id || 'desconocido',
      titulo: carta.titulo || '',
      estado: 'FALLIDO',
      error: err,
      fecha: new Date().toLocaleString('es-EC'),
      timestamp: Date.now()
    });
    console.error('❌ ' + err);
    process.exit(1);
  }

  console.log(`💌 Enviando notificación de carta de "${remitente}" para "${destinatario}" a <${emailDestino}>...`);

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: gmailUser,
      pass: gmailPass
    },
    family: 4 // Forzar IPv4 para evitar timeouts de resolución DNS en Windows
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
            <span>"${carta.extracto || (carta.contenido ? carta.contenido.slice(0, 120) + '...' : '')}"</span>
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

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ ¡Correo enviado con éxito a ${emailDestino}! ID:`, info.messageId);

    // Registrar log exitoso en Firebase Firestore
    await logToFirestore({
      carta_id: carta.id || 'desconocido',
      titulo: carta.titulo || '',
      de: remitente,
      para: destinatario,
      email_destino: emailDestino,
      estado: 'EXITOSO',
      mensaje_id: info.messageId,
      fecha: new Date().toLocaleString('es-EC', { timeZone: 'America/Guayaquil' }),
      timestamp: Date.now(),
      origen: process.env.GITHUB_ACTIONS ? 'GitHub Actions' : 'Local'
    });
  } catch (sendErr) {
    console.error('❌ Error al enviar el correo:', sendErr.message);

    // Registrar log fallido en Firebase Firestore
    await logToFirestore({
      carta_id: carta.id || 'desconocido',
      titulo: carta.titulo || '',
      de: remitente,
      para: destinatario,
      email_destino: emailDestino,
      estado: 'FALLIDO',
      error: sendErr.message,
      fecha: new Date().toLocaleString('es-EC', { timeZone: 'America/Guayaquil' }),
      timestamp: Date.now(),
      origen: process.env.GITHUB_ACTIONS ? 'GitHub Actions' : 'Local'
    });

    process.exit(1);
  }
}

main().catch(async (err) => {
  console.error('❌ Error general:', err);
  await logToFirestore({
    estado: 'FALLIDO',
    error: err.message,
    fecha: new Date().toISOString(),
    timestamp: Date.now()
  });
  process.exit(1);
});
