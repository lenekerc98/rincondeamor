/**
 * PARA REBECA & LENEKER - LÓGICA DE APLICACIÓN
 * Manejo de acceso por contraseña, carrusel de recuerdos, buzón interactivo y redactor.
 */

// ==========================================
// CONFIGURACIÓN DE SEGURIDAD & PERFILES
// Puedes cambiar estas contraseñas por tu fecha especial o clave favorita
// ==========================================
const APP_CONFIG = {
  // Contraseñas válidas (pueden ser iguales o diferentes)
  passwords: {
    Rebeca: ['961021'],
    Leneker: ['212210']
  },
  // Intervalo de cambio de fotos (en milisegundos)
  slideshowInterval: 5000,
  // Música predeterminada (Best Part - Daniel Caesar & H.E.R.)
};

// ==========================================
// CONFIGURACIÓN DE FIREBASE FIRESTORE (Nube en tiempo real)
// ==========================================
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAjaG3fWvOd4Uv-zOQcRh6-_OFURgNG3Cw",
  authDomain: "rinconcitodeamor-e5ab5.firebaseapp.com",
  projectId: "rinconcitodeamor-e5ab5",
  storageBucket: "rinconcitodeamor-e5ab5.firebasestorage.app",
  messagingSenderId: "684499737840",
  appId: "1:684499737840:web:bba03288bdabba6e95f635",
  measurementId: "G-8083N88NXZ"
};

let firestoreDb = null;
try {
  if (typeof firebase !== 'undefined') {
    firebase.initializeApp(FIREBASE_CONFIG);
    firestoreDb = firebase.firestore();
    console.log("✨ Firebase Firestore conectado con éxito.");
  }
} catch (err) {
  console.warn("Firebase no se pudo inicializar:", err);
}

// ==========================================
// CONFIGURACIÓN DE NOTIFICACIONES (GITHUB ACTIONS API)
// ==========================================
const GITHUB_CONFIG = {
  owner: 'lenekerc98',
  repo: 'rincondeamor',
  workflowFile: 'notificar.yml'
};

async function getGitHubToken() {
  if (window._gh_token) return window._gh_token;
  try {
    if (firestoreDb) {
      const doc = await firestoreDb.collection('config').doc('github').get();
      if (doc.exists && doc.data().token) {
        window._gh_token = doc.data().token;
        return window._gh_token;
      }
    }
  } catch (e) {
    console.warn("No se pudo cargar token de config:", e);
  }
  return null;
}

async function dispatchEmailNotification(carta) {
  const token = await getGitHubToken();
  if (!token || !carta) {
    console.warn("Token no disponible para enviar correo.");
    return false;
  }
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/actions/workflows/${GITHUB_CONFIG.workflowFile}/dispatches`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          carta_id: carta.id || '',
          destinatario: carta.para || ''
        }
      })
    });
    return (res.status === 204 || res.ok);
  } catch (err) {
    console.error("Error al despachar workflow de correo:", err);
    return false;
  }
}

// Datos por defecto (en caso de abrir sin servidor local o error de red)
const DEFAULT_PHOTOS = [
  {
    id: "foto-1",
    url: "assets/fotos/20250915_193351.jpg",
    titulo: "Nuestra complicidad",
    fecha: "15 de Septiembre, 2025",
    descripcion: "Esa sonrisa que ilumina cualquier día."
  },
  {
    id: "foto-2",
    url: "assets/fotos/20251105_214108.jpg",
    titulo: "Juntos siempre",
    fecha: "5 de Noviembre, 2025",
    descripcion: "Haciendo de cada día una aventura especial."
  },
  {
    id: "foto-3",
    url: "assets/fotos/20260102_202327.jpg",
    titulo: "Instantes mágicos",
    fecha: "2 de Enero, 2026",
    descripcion: "El mundo se detiene cuando estamos juntos."
  }
];

const DEFAULT_LETTERS = [];

// Estado global de la aplicación
const state = {
  currentUser: 'Rebeca',
  isAuthenticated: false,
  photos: [],
  currentSlideIndex: 0,
  slideTimer: null,
  letters: [],
  currentFilter: 'all',
  isPlayingMusic: false
};

// Evitar que el navegador recuerde la posición de scroll intermedia al recargar
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

// ==========================================
// INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  window.scrollTo(0, 0);
  initParticlesCanvas();
  initAuth();
  initMusicPlayer();
  loadData();
  setupEventListeners();
});

window.addEventListener('load', () => {
  window.scrollTo(0, 0);
});

// ==========================================
// AUTENTICACIÓN Y GATEKEEPER
// ==========================================
function initAuth() {
  const savedUser = sessionStorage.getItem('rl_authenticated_user');
  if (savedUser) {
    state.currentUser = savedUser;
    state.isAuthenticated = true;
    unlockApp(false);
  }

  const gatekeeperForm = document.getElementById('gatekeeper-form');
  const passInput = document.getElementById('gatekeeper-pass');
  const errorMsg = document.getElementById('pass-error-msg');
  const togglePassBtn = document.getElementById('toggle-pass-visibility');
  const secretSwitch = document.getElementById('secret-author-switch');
  const titleEl = document.getElementById('gatekeeper-title');
  const subtitleEl = document.getElementById('gatekeeper-subtitle');
  const labelEl = document.getElementById('gatekeeper-label');
  const btnText = document.getElementById('gatekeeper-btn-text');

  let isAuthorMode = window.location.search.includes('autor') || window.location.search.includes('admin');

  function updateGatekeeperDisplay() {
    if (isAuthorMode) {
      if (titleEl) titleEl.textContent = 'Acceso de Autor';
      if (subtitleEl) subtitleEl.textContent = 'Ingresa tu clave de autor para escribir y gestionar cartas.';
      if (labelEl) labelEl.textContent = 'Clave de autor';
      if (passInput) passInput.placeholder = 'Ingresa tu clave...';
      if (btnText) btnText.textContent = 'Entrar como Autor ✍️';
    } else {
      if (titleEl) titleEl.textContent = 'Para Rebeca';
      if (subtitleEl) subtitleEl.textContent = 'Un rincón exclusivo para nosotros dos. Ingresa con tu código para entrar.';
      if (labelEl) labelEl.textContent = 'Código de acceso';
      if (passInput) passInput.placeholder = 'Ingresa con tu código...';
      if (btnText) btnText.textContent = 'Abrir Nuestro Rincón';
    }
  }

  updateGatekeeperDisplay();

  // Cambio discreto de modo tocando el candado inferior
  secretSwitch?.addEventListener('click', (e) => {
    e.preventDefault();
    isAuthorMode = !isAuthorMode;
    errorMsg.classList.remove('visible');
    passInput.value = '';
    updateGatekeeperDisplay();
    passInput.focus();
  });

  togglePassBtn?.addEventListener('click', () => {
    const isPass = passInput.type === 'password';
    passInput.type = isPass ? 'text' : 'password';
    togglePassBtn.textContent = isPass ? '🔒' : '👁️';
  });

  gatekeeperForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const enteredPass = passInput.value.trim().toLowerCase();

    const validRebeca = (APP_CONFIG.passwords.Rebeca || []).map(p => p.toLowerCase());
    const validLeneker = (APP_CONFIG.passwords.Leneker || []).map(p => p.toLowerCase());

    // Reconocimiento inteligente de clave sin importar la pantalla activa
    if (validRebeca.includes(enteredPass)) {
      state.currentUser = 'Rebeca';
      errorMsg.classList.remove('visible');
      state.isAuthenticated = true;
      sessionStorage.setItem('rl_authenticated_user', 'Rebeca');
      unlockApp(true);
    } else if (validLeneker.includes(enteredPass)) {
      state.currentUser = 'Leneker';
      errorMsg.classList.remove('visible');
      state.isAuthenticated = true;
      sessionStorage.setItem('rl_authenticated_user', 'Leneker');
      unlockApp(true);
    } else {
      errorMsg.textContent = 'Código incorrecto. Inténtalo de nuevo con cariño ❤️';
      errorMsg.classList.add('visible');
      passInput.focus();
      passInput.select();
    }
  });

  document.getElementById('logout-btn').addEventListener('click', () => {
    sessionStorage.removeItem('rl_authenticated_user');
    location.reload();
  });
}

function unlockApp(animate = true) {
  window.scrollTo(0, 0);
  const overlay = document.getElementById('gatekeeper-overlay');
  const mainApp = document.getElementById('main-app');
  const userBadge = document.getElementById('current-user-badge');
  const senderInput = document.getElementById('letter-sender');
  const recipientInput = document.getElementById('letter-recipient');

  if (userBadge) userBadge.textContent = state.currentUser;

  // Ajustar remitente y destinatario bloqueados según quién haya iniciado sesión
  if (senderInput && recipientInput) {
    senderInput.value = state.currentUser;
    recipientInput.value = (state.currentUser === 'Leneker') ? 'Rebeca' : 'Leneker';
  }

  mainApp.style.display = 'block';
  window.scrollTo(0, 0);

  if (animate) {
    overlay.classList.add('unlocking');
    setTimeout(() => {
      overlay.style.display = 'none';
      startSlideshowAutoPlay();
      window.scrollTo(0, 0);
    }, 700);
  } else {
    overlay.style.display = 'none';
    startSlideshowAutoPlay();
    window.scrollTo(0, 0);
  }
}

// Función para mezclar aleatoriamente un arreglo (Fisher-Yates)
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ==========================================
// CARGA DE DATOS (FOTOS Y CARTAS)
// ==========================================
async function loadData() {
  // Cargar fotos y aplicar orden aleatorio
  try {
    const res = await fetch('data/fotos.json');
    if (res.ok) {
      const fetchedPhotos = await res.json();
      state.photos = shuffleArray(fetchedPhotos);
    } else {
      state.photos = shuffleArray(DEFAULT_PHOTOS);
    }
  } catch (err) {
    state.photos = shuffleArray(DEFAULT_PHOTOS);
  }
  renderSlideshow();

  // 1. Mostrar de inmediato lo que haya en memoria local mientras conecta la nube
  const localSaved = localStorage.getItem('rl_saved_letters');
  if (localSaved) {
    try {
      state.letters = JSON.parse(localSaved);
      renderLetters();
    } catch (e) {
      state.letters = [];
    }
  }

  // 2. Conectar sincronización en tiempo real con Firebase Firestore
  if (firestoreDb) {
    initFirestoreSync();
  } else {
    // Fallback: cargar desde data/cartas.json si Firebase no estuviera activo
    try {
      const res = await fetch('data/cartas.json?t=' + Date.now());
      if (res.ok) {
        const serverLetters = await res.json();
        if (Array.isArray(serverLetters) && serverLetters.length > 0) {
          state.letters = serverLetters;
          renderLetters();
        }
      }
    } catch (err) {
      console.warn("Error cargando cartas locales:", err);
    }
  }
}

// Sincronización en tiempo real con la nube (Firestore)
function initFirestoreSync() {
  if (!firestoreDb) return;
  firestoreDb.collection('cartas').onSnapshot(snapshot => {
    if (!snapshot.empty) {
      const letters = [];
      snapshot.forEach(doc => {
        letters.push(doc.data());
      });
      // Ordenar cartas: las más recientes siempre arriba
      letters.sort((a, b) => {
        const tA = a.timestamp || parseInt(a.id?.replace('carta-', '')) || 0;
        const tB = b.timestamp || parseInt(b.id?.replace('carta-', '')) || 0;
        return tB - tA;
      });
      state.letters = letters;
      localStorage.setItem('rl_saved_letters', JSON.stringify(letters));
      renderLetters();
    } else {
      // Si Firestore aún no tiene cartas, migramos la carta existente si existe
      migrateInitialCartas();
    }
  }, err => {
    console.warn("Firestore sync aviso:", err);
  });
}

// Migrar cartas iniciales a Firestore para que nunca se pierdan
async function migrateInitialCartas() {
  if (!firestoreDb) return;
  try {
    const res = await fetch('data/cartas.json?t=' + Date.now());
    if (res.ok) {
      const initial = await res.json();
      if (Array.isArray(initial) && initial.length > 0) {
        for (const c of initial) {
          const item = {
            ...c,
            timestamp: c.timestamp || parseInt(c.id?.replace('carta-', '')) || Date.now()
          };
          await firestoreDb.collection('cartas').doc(item.id).set(item);
        }
      }
    }
  } catch (e) {
    console.warn("No se pudo migrar cartas iniciales:", e);
  }
}

// ==========================================
// CARRUSEL DE FOTOS DINÁMICAS (ORDEN ALEATORIO)
// ==========================================
function renderSlideshow() {
  const container = document.getElementById('slideshow-container');
  const indicators = document.getElementById('slide-indicators');
  if (!container || !indicators) return;

  container.innerHTML = '';
  indicators.innerHTML = '';

  state.photos.forEach((photo, index) => {
    // Diapositiva con fondo desenfocado + foto nítida centrada
    const slide = document.createElement('div');
    slide.className = `slide-item ${index === 0 ? 'active' : ''}`;
    slide.dataset.index = index;

    slide.innerHTML = `
      <div class="slide-bg-blur" style="background-image: url('${photo.url}');"></div>
      <img src="${photo.url}" alt="${photo.titulo}" class="slide-img-main" loading="lazy">
      <div class="slide-overlay">
        <div class="slide-caption">
          <span class="slide-date-tag">✨ ${photo.fecha || 'Recuerdo especial'}</span>
          <h4 class="slide-title">${photo.titulo}</h4>
          <p class="slide-desc">${photo.descripcion || ''}</p>
        </div>
      </div>
    `;
    container.appendChild(slide);
  });

  // Mostramos solo un grupo elegante de puntos o barra de progreso para no saturar con 40 fotos
  updateIndicators();
}

function updateIndicators() {
  const indicators = document.getElementById('slide-indicators');
  if (!indicators) return;

  const total = state.photos.length;
  const current = state.currentSlideIndex + 1;
  indicators.innerHTML = `<span style="font-size: 0.8rem; color: var(--accent-rose); background: rgba(0,0,0,0.5); padding: 4px 12px; border-radius: 20px; border: 1px solid rgba(226,141,153,0.3);">Foto ${current} de ${total} 🔀</span>`;
}

function goToSlide(index) {
  const slides = document.querySelectorAll('.slide-item');
  if (!slides.length) return;

  slides.forEach(s => s.classList.remove('active'));

  // Si llegamos al final del ciclo aleatorio, remezclamos para variedad infinita
  if (index >= slides.length) {
    state.currentSlideIndex = 0;
  } else if (index < 0) {
    state.currentSlideIndex = slides.length - 1;
  } else {
    state.currentSlideIndex = index;
  }

  slides[state.currentSlideIndex].classList.add('active');
  updateIndicators();
}

function nextSlide() {
  goToSlide(state.currentSlideIndex + 1);
}

function prevSlide() {
  goToSlide(state.currentSlideIndex - 1);
}

// Salto aleatorio directo
function randomSlide() {
  if (state.photos.length <= 1) return;
  let nextIdx;
  do {
    nextIdx = Math.floor(Math.random() * state.photos.length);
  } while (nextIdx === state.currentSlideIndex);
  goToSlide(nextIdx);
}

function startSlideshowAutoPlay() {
  if (state.slideTimer) clearInterval(state.slideTimer);
  state.slideTimer = setInterval(nextSlide, APP_CONFIG.slideshowInterval);

  const wrapper = document.querySelector('.slideshow-wrapper');
  if (wrapper) {
    wrapper.addEventListener('mouseenter', () => clearInterval(state.slideTimer));
    wrapper.addEventListener('mouseleave', () => {
      clearInterval(state.slideTimer);
      state.slideTimer = setInterval(nextSlide, APP_CONFIG.slideshowInterval);
    });
  }
}

// ==========================================
// BUZÓN DE CARTAS SELLADAS
// ==========================================
function renderLetters() {
  const grid = document.getElementById('letters-grid');
  const countText = document.getElementById('letters-count-text');
  if (!grid) return;

  grid.innerHTML = '';

  const filtered = state.letters.filter(letter => {
    if (state.currentFilter === 'all') return true;
    return letter.de.toLowerCase() === state.currentFilter.toLowerCase();
  });

  if (countText) {
    countText.textContent = `${filtered.length} ${filtered.length === 1 ? 'carta guardada' : 'cartas guardadas'}`;
  }

  // Estado vacío cuando no hay cartas
  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-mailbox" style="grid-column: 1 / -1; text-align: center; padding: 50px 20px; background: rgba(26, 18, 33, 0.4); border: 1px dashed rgba(226, 141, 153, 0.3); border-radius: var(--radius-md);">
        <span style="font-size: 2.8rem; display: block; margin-bottom: 12px;">💌</span>
        <h4 style="font-family: var(--font-serif); font-size: 1.35rem; color: #fff; margin-bottom: 8px;">El buzón está esperando su primera carta</h4>
        <p style="font-size: 0.92rem; color: var(--text-muted); max-width: 460px; margin: 0 auto 20px;">
          ${state.currentUser === 'Leneker' 
            ? 'Aún no hay cartas guardadas. Haz clic en "Escribir Carta" para redactar tu primera dedicatoria para Rebeca.' 
            : 'Tu buzón está esperando su primera carta... Llegará muy pronto con todo el cariño del mundo ❤️'}
        </p>
        ${state.currentUser === 'Leneker' ? '<button type="button" class="primary-btn" id="empty-compose-btn" style="width: auto; margin: 0 auto; display: inline-flex;">✍️ Escribir primera carta</button>' : ''}
      </div>
    `;

    document.getElementById('empty-compose-btn')?.addEventListener('click', () => {
      resetComposerForm();
      document.getElementById('composer-modal-overlay').classList.add('active');
    });
    return;
  }

  filtered.forEach(letter => {
    const card = document.createElement('article');
    card.className = 'envelope-card';

    // Click en la tarjeta abre la carta
    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-btn')) return;
      openLetterModal(letter);
    });

    const isAuthor = state.currentUser === 'Leneker';

    card.innerHTML = `
      <div class="envelope-header">
        <span class="envelope-stamp">📮 ${letter.fecha || 'Carta'}</span>
        <span class="envelope-badge">Para: ${letter.para}</span>
      </div>
      <div class="envelope-body">
        <h4 class="envelope-title">${letter.titulo}</h4>
        <p class="envelope-snippet">${letter.extracto || letter.contenido.slice(0, 110) + '...'}</p>
      </div>
      <div class="envelope-footer">
        <span class="envelope-author">De: <strong>${letter.de}</strong></span>
        <div class="envelope-actions-wrap" style="display: flex; align-items: center; gap: 8px;">
          ${isAuthor ? `
            <button type="button" class="card-btn card-edit-btn" data-id="${letter.id}" title="Editar carta" style="background: rgba(226,141,153,0.15); border: 1px solid var(--accent-rose); color: #fff; padding: 4px 10px; border-radius: 4px; font-size: 0.78rem; cursor: pointer;">✏️ Editar</button>
          ` : ''}
          <div class="wax-seal-button" title="Abrir carta">
            ${letter.sello || '💌'}
          </div>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });

  // Evento de botón editar en tarjeta
  grid.querySelectorAll('.card-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const letter = state.letters.find(l => l.id === btn.dataset.id);
      if (letter) startEditLetter(letter);
    });
  });
}

function openLetterModal(letter) {
  state.currentOpenLetter = letter;
  const modal = document.getElementById('read-modal-overlay');
  document.getElementById('modal-letter-date').textContent = letter.fecha || 'Hoy';
  document.getElementById('modal-letter-sender').textContent = letter.de;
  document.getElementById('modal-letter-receiver').textContent = letter.para;
  document.getElementById('modal-letter-title').textContent = letter.titulo;
  document.getElementById('modal-letter-body').textContent = letter.contenido;
  document.getElementById('modal-letter-signature').textContent = `Con todo mi amor, ${letter.de}`;
  document.getElementById('modal-letter-seal').textContent = letter.sello || 'L & R';

  // Mostrar acciones de autor si quien navega es Leneker
  const authorActions = document.getElementById('parchment-author-actions');
  if (authorActions) {
    authorActions.style.display = (state.currentUser === 'Leneker') ? 'flex' : 'none';
  }

  modal.classList.add('active');
}

function startEditLetter(letter) {
  document.getElementById('read-modal-overlay')?.classList.remove('active');
  const composerModal = document.getElementById('composer-modal-overlay');

  document.getElementById('editing-letter-id').value = letter.id;
  document.getElementById('composer-badge').textContent = 'Editar Carta';
  document.getElementById('composer-title').textContent = 'Modificar Carta';
  document.getElementById('letter-sender').value = letter.de;
  document.getElementById('letter-recipient').value = letter.para;
  document.getElementById('letter-title').value = letter.titulo;
  document.getElementById('letter-content').value = letter.contenido;
  document.getElementById('save-letter-btn').innerHTML = '<span>💾 Guardar Cambios</span>';

  composerModal.classList.add('active');
}

function resetComposerForm() {
  document.getElementById('editing-letter-id').value = '';
  document.getElementById('composer-badge').textContent = 'Nueva Carta';
  document.getElementById('composer-title').textContent = 'Escribe desde el corazón';
  document.getElementById('letter-title').value = '';
  document.getElementById('letter-content').value = '';
  document.getElementById('save-letter-btn').innerHTML = '<span>✨ Guardar Carta</span>';

  // Remitente y destinatario fijados y bloqueados automáticamente
  const sender = state.currentUser || 'Leneker';
  const recipient = (sender === 'Leneker') ? 'Rebeca' : 'Leneker';
  const senderEl = document.getElementById('letter-sender');
  const recipientEl = document.getElementById('letter-recipient');
  if (senderEl) senderEl.value = sender;
  if (recipientEl) recipientEl.value = recipient;
}

// ==========================================
// REDACTOR DE CARTAS (COMPOSER)
// ==========================================
function setupEventListeners() {
  // Slideshow buttons
  document.getElementById('slide-prev-btn')?.addEventListener('click', prevSlide);
  document.getElementById('slide-next-btn')?.addEventListener('click', nextSlide);
  document.getElementById('slide-random-btn')?.addEventListener('click', randomSlide);

  // Filtros de cartas
  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      e.target.classList.add('active');
      state.currentFilter = e.target.dataset.filter;
      renderLetters();
    });
  });

  // Modal de lectura
  document.getElementById('close-read-modal-btn')?.addEventListener('click', () => {
    document.getElementById('read-modal-overlay').classList.remove('active');
  });

  // Botón de editar dentro del modal de lectura
  document.getElementById('modal-edit-letter-btn')?.addEventListener('click', () => {
    if (state.currentOpenLetter) startEditLetter(state.currentOpenLetter);
  });

  // Botón de enviar aviso por correo desde el modal de lectura (pergamino)
  const sendEmailBtn = document.getElementById('modal-send-email-btn');
  sendEmailBtn?.addEventListener('click', async () => {
    if (!state.currentOpenLetter) return;
    const dest = state.currentOpenLetter.para || 'Rebeca';
    const origHtml = sendEmailBtn.innerHTML;
    sendEmailBtn.innerHTML = '<span>Enviando aviso... ⏳</span>';
    sendEmailBtn.disabled = true;

    const ok = await dispatchEmailNotification(state.currentOpenLetter);
    if (ok) {
      sendEmailBtn.innerHTML = `<span>¡Aviso enviado a ${dest}! 📬✨</span>`;
      setTimeout(() => {
        sendEmailBtn.innerHTML = origHtml;
        sendEmailBtn.disabled = false;
      }, 3500);
    } else {
      sendEmailBtn.innerHTML = '<span>⚠️ No se pudo enviar</span>';
      setTimeout(() => {
        sendEmailBtn.innerHTML = origHtml;
        sendEmailBtn.disabled = false;
      }, 3000);
    }
  });

  // Modal de redacción
  const composerModal = document.getElementById('composer-modal-overlay');
  const openComposer = () => {
    resetComposerForm();
    composerModal.classList.add('active');
  };

  document.getElementById('write-letter-btn')?.addEventListener('click', openComposer);
  document.getElementById('hero-write-letter-btn')?.addEventListener('click', openComposer);

  document.getElementById('close-composer-modal-btn')?.addEventListener('click', () => {
    composerModal.classList.remove('active');
  });

  document.getElementById('cancel-compose-btn')?.addEventListener('click', () => {
    composerModal.classList.remove('active');
  });

  // Función unificada para guardar carta (con o sin correo)
  async function performSaveLetter(shouldSendEmail, triggerBtn) {
    const editingId = document.getElementById('editing-letter-id').value;
    const sender = document.getElementById('letter-sender').value;
    const recipient = document.getElementById('letter-recipient').value;
    const title = document.getElementById('letter-title').value.trim();
    const content = document.getElementById('letter-content').value.trim();

    if (!title || !content) {
      alert("Por favor completa el título y el mensaje con cariño ❤️");
      return;
    }

    const originalBtnHtml = triggerBtn ? triggerBtn.innerHTML : '';
    if (triggerBtn) {
      triggerBtn.innerHTML = shouldSendEmail 
        ? '<span>Guardando y avisando por correo... 💌</span>'
        : '<span>Guardando en las estrellas... ✨</span>';
      triggerBtn.disabled = true;
    }

    const now = new Date();
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const fecha = `${now.getDate()} de ${months[now.getMonth()]}, ${now.getFullYear()}`;

    let letterToSave = null;

    if (editingId) {
      // Editar carta existente
      const index = state.letters.findIndex(l => l.id === editingId);
      letterToSave = {
        ...(state.letters[index] || {}),
        id: editingId,
        de: sender,
        para: recipient,
        titulo: title,
        extracto: content.slice(0, 100) + '...',
        contenido: content,
        sello: sender.charAt(0) + ' & ' + recipient.charAt(0),
        updatedAt: Date.now()
      };
      if (index !== -1) {
        state.letters[index] = letterToSave;
      }
      document.getElementById('editing-letter-id').value = '';
    } else {
      // Crear nueva carta
      letterToSave = {
        id: `carta-${Date.now()}`,
        de: sender,
        para: recipient,
        fecha: fecha,
        titulo: title,
        extracto: content.slice(0, 100) + '...',
        contenido: content,
        leida: false,
        sello: sender.charAt(0) + ' & ' + recipient.charAt(0),
        timestamp: Date.now()
      };
      state.letters.unshift(letterToSave);
    }

    // Guardar en la nube (Firestore) para que ambos la vean al instante
    if (firestoreDb) {
      try {
        await firestoreDb.collection('cartas').doc(letterToSave.id).set(letterToSave);
        console.log("✅ Carta sincronizada en la nube (Firestore) con éxito");
      } catch (err) {
        console.error("Error al guardar en Firestore:", err);
      }
    }

    // Respaldo en memoria local
    localStorage.setItem('rl_saved_letters', JSON.stringify(state.letters));
    renderLetters();

    // Disparar envío automático de correo si se seleccionó
    if (shouldSendEmail) {
      dispatchEmailNotification(letterToSave);
    }

    if (triggerBtn) {
      triggerBtn.innerHTML = shouldSendEmail 
        ? '<span>¡Guardada y correo enviado! 💌</span>'
        : '<span>¡Carta guardada! ❤️</span>';
    }

    // Cerrar suavemente el modal y limpiar formulario tras 1.2 segundos
    setTimeout(() => {
      composerModal.classList.remove('active');
      resetComposerForm();
      if (triggerBtn) {
        triggerBtn.innerHTML = originalBtnHtml;
        triggerBtn.disabled = false;
      }
    }, 1200);
  }

  // Formulario: botón principal (Guardar y Avisar por Correo)
  const composerForm = document.getElementById('composer-form');
  composerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('save-letter-btn');
    await performSaveLetter(true, saveBtn);
  });

  // Formulario: botón secundario (Solo Guardar)
  document.getElementById('save-only-btn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const saveOnlyBtn = document.getElementById('save-only-btn');
    await performSaveLetter(false, saveOnlyBtn);
  });
}

// ==========================================
// REPRODUCTOR DE MÚSICA AMBIENTAL
// ==========================================
function initMusicPlayer() {
  const toggleBtn = document.getElementById('music-toggle-btn');
  const audio = document.getElementById('ambient-audio');
  const icon = document.getElementById('music-icon');

  if (!toggleBtn || !audio) return;

  toggleBtn.addEventListener('click', () => {
    if (state.isPlayingMusic) {
      audio.pause();
      state.isPlayingMusic = false;
      toggleBtn.classList.remove('playing');
      icon.textContent = '🎵';
    } else {
      audio.play().then(() => {
        state.isPlayingMusic = true;
        toggleBtn.classList.add('playing');
        icon.textContent = '🎶';
      }).catch(() => {
        console.log('Reproducción iniciada tras interacción');
      });
    }
  });
}

// ==========================================
// CANVAS AMBIENTAL: PARTÍCULAS DE LUZ
// ==========================================
function initParticlesCanvas() {
  const canvas = document.getElementById('ambient-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = [];
  const particleCount = 28;

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2 + 0.8,
      speedX: (Math.random() - 0.5) * 0.3,
      speedY: -Math.random() * 0.4 - 0.1,
      alpha: Math.random() * 0.5 + 0.2,
      pulse: Math.random() * 0.02 + 0.01
    });
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);

    particles.forEach(p => {
      p.x += p.speedX;
      p.y += p.speedY;
      p.alpha += Math.sin(Date.now() * 0.002 + p.x) * 0.005;

      if (p.y < 0) p.y = height;
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(226, 141, 153, ${Math.max(0.1, Math.min(0.6, p.alpha))})`;
      ctx.shadowBlur = 12;
      ctx.shadowColor = 'rgba(226, 141, 153, 0.5)';
      ctx.fill();
    });

    requestAnimationFrame(animate);
  }

  animate();
}
