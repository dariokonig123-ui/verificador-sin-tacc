const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();
app.use(cors());
app.use(express.json());

// ─── CONFIGURACIÓN ───────────────────────────────────────────
const SHEET_ID = '1Ybf3cnVU6GkGk4pZcCFXut5hWuTVpHVD_gj-MBFmzY8';
const HOJA_NOMBRE = 'Hoja 1';
const PORT = process.env.PORT || 3001;
// ─────────────────────────────────────────────────────────────

let cache = [];      // productos en memoria
let headers = [];    // nombres de columnas

const normalizar = (str) => (str || '').replace(/[-\/\s]/g, '').toLowerCase();

async function cargarCache() {
  console.log('📥 Cargando listado desde Google Sheets...');
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: HOJA_NOMBRE,
  });

  const filas = res.data.values;
  if (!filas || filas.length === 0) {
    console.error('❌ La Sheet está vacía');
    return;
  }

  headers = filas[0].map(h => h.trim().toLowerCase());
  cache = filas.slice(1).map(fila => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = fila[i] || ''; });
    return obj;
  });

  console.log(`✅ ${cache.length} productos cargados en memoria`);
}

// ─── ENDPOINTS ───────────────────────────────────────────────

// GET /buscar?rnpa=01234567
app.get('/buscar', (req, res) => {
  const rnpa = (req.query.rnpa || '').trim();
  const q    = (req.query.q || '').trim().toLowerCase();

  if (!rnpa && !q) {
    return res.status(400).json({ error: 'Enviá ?rnpa=XXXX o ?q=nombre' });
  }

  if (rnpa) {
    const rnpaNorm = normalizar(rnpa);
    const producto = cache.find(p => normalizar(p.rnpa) === rnpaNorm);
    if (producto) {
      return res.json({ encontrado: true, producto });
    } else {
      return res.json({ encontrado: false });
    }
  }

  if (q) {
    const resultados = cache.filter(p =>
      (p.marca || '').toLowerCase().includes(q) ||
      (p.nombrefantasia || '').toLowerCase().includes(q) ||
      (p.denominacionventa || '').toLowerCase().includes(q)
    ).slice(0, 20);

    return res.json({ encontrado: resultados.length > 0, resultados });
  }
});

// GET /estado — para saber si el server está vivo
app.get('/estado', (req, res) => {
  res.json({ ok: true, productos: cache.length });
});

// ─── INICIO ──────────────────────────────────────────────────
cargarCache().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('❌ Error al iniciar:', err.message);
  process.exit(1);
});