const xlsx = require('xlsx');
const { google } = require('googleapis');
const path = require('path');

// ─── CONFIGURACIÓN ───────────────────────────────────────────
const SHEET_ID = '1Ybf3cnVU6GkGk4pZcCFXut5hWuTVpHVD_gj-MBFmzY8';
const CREDENTIALS_PATH = './credenciales.json'; // tu archivo JSON descargado
const EXCEL_PATH = './listado-anmat.xlsx';       // renombrá tu Excel así
const HOJA_NOMBRE = 'Hoja 1';                    // nombre de la pestaña en la Sheet
// ─────────────────────────────────────────────────────────────

async function cargarListado() {
  console.log('📂 Leyendo Excel...');
  const workbook = xlsx.readFile(EXCEL_PATH);
  const hoja = workbook.Sheets[workbook.SheetNames[0]];
  const filas = xlsx.utils.sheet_to_json(hoja, { header: 1, defval: '' });

  if (filas.length === 0) {
    console.error('❌ El Excel está vacío');
    process.exit(1);
  }

  console.log(`✅ ${filas.length - 1} productos encontrados`);
  console.log('📋 Columnas detectadas:', filas[0]);

  console.log('\n🔐 Autenticando con Google...');
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  console.log('🧹 Limpiando Sheet existente...');
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SHEET_ID,
    range: HOJA_NOMBRE,
  });

  console.log('📤 Subiendo datos...');
  const BATCH = 5000; // subimos de a 5000 filas para no saturar la API
  for (let i = 0; i < filas.length; i += BATCH) {
    const bloque = filas.slice(i, i + BATCH);
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${HOJA_NOMBRE}!A${i + 1}`,
      valueInputOption: 'RAW',
      requestBody: { values: bloque },
    });
    console.log(`   → ${Math.min(i + BATCH, filas.length)} / ${filas.length} filas subidas`);
  }

  console.log('\n🎉 ¡Listo! Listado cargado en Google Sheets.');
}

cargarListado().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});