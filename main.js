/* ---------- CONSTANTES MUSICALES ---------- */
const NOTE_NAMES_DIATONIC = ['C','D','E','F','G','A','B'];
const MIDI_NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const NOTE_LABELS = ['Do','Do#','Re','Re#','Mi','Fa','Fa#','Sol','Sol#','La','La#','Si'];

const CHORD_FORMULAS = {
  major: [0,4,7], minor: [0,3,7], dim: [0,3,6], aug: [0,4,8],
  maj7: [0,4,7,11], '7': [0,4,7,10], m7: [0,3,7,10], dim7: [0,3,6,9]
};

/* ---------- CONFIGURACIÓN GRÁFICA ---------- */
const canvas = document.getElementById('staff');
const ctx = canvas.getContext('2d');
const CFG = { 
  lineSpacing: 16, // Espacio entre líneas
  lines: 5, 
  noteRadius: 8,
  clefFontSize: 80
};

/* ---------- LÓGICA DE DIBUJO (Mejorada para centrado dinámico) ---------- */
function getNoteInfo(midi) {
  const semitoneIndex = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const nameWithAccidental = MIDI_NOTES[semitoneIndex];
  const letter = nameWithAccidental.charAt(0);
  const accidental = nameWithAccidental.includes('#') ? '#' : null;
  return { letter, accidental, octave };
}

function getDiatonicStep(midi) {
  const info = getNoteInfo(midi);
  const letterIndex = NOTE_NAMES_DIATONIC.indexOf(info.letter);
  return (info.octave * 7) + letterIndex;
}

// Nota de referencia central (Mi 4 - primera línea inferior)
const E4_MIDI = 64; 
const E4_STEP = getDiatonicStep(E4_MIDI);

function drawStaff(centerY, width) {
  // Dibujar las 5 líneas centradas verticalmente
  const totalStaffHeight = (CFG.lines - 1) * CFG.lineSpacing;
  const startY = centerY - (totalStaffHeight / 2);

  ctx.strokeStyle = '#94a3b8'; 
  ctx.lineWidth = 1;
  
  for (let i = 0; i < CFG.lines; i++) {
    const y = startY + i * CFG.lineSpacing;
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(width - 40, y);
    ctx.stroke();
  }
  
  // Dibujar Clave de Sol
  ctx.fillStyle = '#1e293b'; 
  ctx.font = `${CFG.clefFontSize}px serif`;
  // Ajuste fino para posicionar la clave
  ctx.fillText('𝄞', 40, startY + CFG.lineSpacing * 3.8);

  return startY; // Retornamos la Y de la línea superior para referencia
}

function getYForStep(step, staffTopY) {
  // Calculamos la Y basada en la línea superior del pentagrama (Fa 5 = E4_STEP + 8 pasos)
  // E4 (Mi 4) es la línea inferior.
  const bottomLineY = staffTopY + (CFG.lines - 1) * CFG.lineSpacing;
  const stepDiff = step - E4_STEP;
  const halfSpace = CFG.lineSpacing / 2;
  return bottomLineY - (stepDiff * halfSpace);
}

function drawLedgerLines(step, x, y) {
  const topStaffStep = E4_STEP + (CFG.lines - 1) * 2; // Línea superior
  const bottomStaffStep = E4_STEP; // Línea inferior

  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1.5;

  if (step > topStaffStep) { // Notas agudas fuera
    for (let s = topStaffStep + 2; s <= step; s += 2) {
      const ly = y + (step - s) * (CFG.lineSpacing / 2);
      ctx.beginPath(); ctx.moveTo(x - 16, ly); ctx.lineTo(x + 16, ly); ctx.stroke();
    }
  } else if (step < bottomStaffStep) { // Notas graves fuera
    for (let s = bottomStaffStep - 2; s >= step; s -= 2) {
      const ly = y - (step - s) * (CFG.lineSpacing / 2);
      ctx.beginPath(); ctx.moveTo(x - 16, ly); ctx.lineTo(x + 16, ly); ctx.stroke();
    }
  }
}

function drawNote(midi, x, staffTopY) {
  const info = getNoteInfo(midi);
  const step = getDiatonicStep(midi);
  const y = getYForStep(step, staffTopY);

  drawLedgerLines(step, x, y);

  // Cabeza de nota
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  // Elipse ligeramente rotada para efecto caligráfico
  ctx.ellipse(x, y, CFG.noteRadius + 2, CFG.noteRadius - 1, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Accidental
  if (info.accidental) { 
    ctx.font = '22px serif'; 
    ctx.fillText('♯', x - 24, y + 8); 
  }
}

function renderScene() {
  if (!currentChord) {
    // Dibujar pentagrama vacío si no hay acorde
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    ctx.clearRect(0,0,w,h);
    drawStaff(h/2, w);
    return;
  }

  const w = canvas.width / (window.devicePixelRatio || 1);
  const h = canvas.height / (window.devicePixelRatio || 1);
  
  ctx.clearRect(0, 0, w, h);
  const staffTopY = drawStaff(h / 2, w);
  
  // Calcular centro horizontal
  const chordWidth = (currentChord.midis.length - 1) * 30; // 30px entre notas
  let startX = (w / 2) - (chordWidth / 2) + 20; // +20 offset para compensar clave

  const sorted = currentChord.midis.slice().sort((a,b) => a - b);
  sorted.forEach((m, i) => {
    drawNote(m, startX + (i * 30), staffTopY);
  });
}

/* ---------- REDIMENSIONADO RESPONSIVO ---------- */
function resizeCanvas() {
  const container = document.getElementById('canvasContainer');
  const dpr = window.devicePixelRatio || 1;
  const rect = container.getBoundingClientRect();

  // Establecer dimensiones internas (resolución)
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  // Establecer estilo CSS (tamaño visual)
  // Importante para evitar estiramiento
  // canvas.style.width y height se manejan por CSS width:100% height:100%, 
  // pero el drawing context necesita saber la escala.
  
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  
  // Redibujar
  renderScene();
}

/* ---------- LÓGICA DE JUEGO & AUDIO (Optimizada) ---------- */
let audioCtx;
let currentChord = null;
let score = { correct:0, attempts:0 };
let difficulty = 'medium';

function initAudio() { 
    if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); 
    if(audioCtx.state === 'suspended') audioCtx.resume();
}

function playChord(midis) {
  initAudio();
  const now = audioCtx.currentTime;
  const master = audioCtx.createGain();
  master.connect(audioCtx.destination);
  master.gain.setValueAtTime(0, now);
  master.gain.linearRampToValueAtTime(0.3, now + 0.05); // Fade in suave
  
  midis.forEach(m => {
    const osc = audioCtx.createOscillator();
    osc.type = 'triangle'; // Sonido más suave
    osc.frequency.value = 440 * Math.pow(2,(m-69)/12);
    osc.connect(master);
    osc.start(now);
    osc.stop(now + 1.5);
  });
  
  master.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
}

function randomInt(min,max){return Math.floor(Math.random()*(max-min+1))+min}

function generateRandomChord(diff) {
  let root, qualities, quality, midis;
  
  if (diff === 'easy') {
    // Solo notas naturales, C3 a C4, Mayor/Menor
    const naturals = [0,2,4,5,7,9,11];
    root = (3 + 1) * 12 + naturals[randomInt(0,6)];
    qualities = ['major','minor'];
  } else if (diff === 'medium') {
    root = randomInt(48, 64);
    qualities = ['major','minor','dim','aug'];
  } else {
    root = randomInt(45, 68);
    qualities = Object.keys(CHORD_FORMULAS);
  }

  quality = qualities[randomInt(0, qualities.length-1)];
  const formula = CHORD_FORMULAS[quality];
  midis = formula.map(i => root + i);

  // Inversiones simples para hard
  if(diff === 'hard' && Math.random() > 0.6) {
    midis[0] += 12; // Primera inversión simple
  }
  
  return { root, quality, midis };
}

function newGame() {
  currentChord = generateRandomChord(difficulty);
  renderScene();
  playChord(currentChord.midis);
  
  document.getElementById('rootSelect').value = "";
  document.getElementById('qualitySelect').value = "";
  document.getElementById('rootSelect').focus();
}

function setDifficulty(level){
  difficulty = level;
  document.querySelectorAll('.segmented-control button').forEach(b => b.classList.remove('active'));
  const btnId = level === 'easy' ? 'btnEasy' : (level === 'medium' ? 'btnMedium' : 'btnHard');
  document.getElementById(btnId).classList.add('active');
  
  showFeedback(`Dificultad cambiada a ${level.toUpperCase()}`, '');
  newGame();
}

function showFeedback(msg, type) {
  const el = document.getElementById('feedbackMsg');
  el.textContent = msg;
  el.className = type === 'success' ? 'msg-success' : (type === 'error' ? 'msg-error' : '');
}

/* ---------- EVENT LISTENERS ---------- */
// Rellenar select de notas
const rootSelect = document.getElementById('rootSelect');
for (let i = 0; i < 12; i++) {
   let opt = document.createElement('option');
   opt.value = i; opt.textContent = NOTE_LABELS[i];
   rootSelect.appendChild(opt);
}

document.getElementById('playBtn').addEventListener('click', () => currentChord && playChord(currentChord.midis));
document.getElementById('nextBtn').addEventListener('click', () => { showFeedback('Nuevo acorde.', ''); newGame(); });

document.getElementById('revealBtn').addEventListener('click', () => {
  if(!currentChord) return;
  const rootName = NOTE_LABELS[currentChord.root % 12];
  showFeedback(`Solución: ${rootName} - ${currentChord.quality}`, '');
});

document.getElementById('submitBtn').addEventListener('click', () => {
  if(!currentChord) return;
  const rVal = document.getElementById('rootSelect').value;
  const qVal = document.getElementById('qualitySelect').value;
  
  if(rVal === "" || qVal === "") {
    showFeedback("Selecciona nota y cualidad.", "error");
    return;
  }
  
  score.attempts++;
  const actualRoot = currentChord.root % 12;
  
  if(parseInt(rVal) === actualRoot && qVal === currentChord.quality) {
    score.correct++;
    showFeedback("¡Correcto! Bien hecho.", "success");
    playChord([72,76,79]); // Feedback auditivo
    setTimeout(newGame, 1200);
  } else {
    showFeedback("Incorrecto, intenta de nuevo.", "error");
    playChord([50,49]); // Feedback error
  }
  
  document.getElementById('correct').textContent = score.correct;
  document.getElementById('attempts').textContent = score.attempts;
});

// Resize Observer es más moderno y eficiente que window.onresize
new ResizeObserver(() => resizeCanvas()).observe(document.getElementById('canvasContainer'));

window.addEventListener('load', () => {
  setTimeout(newGame, 100);
});