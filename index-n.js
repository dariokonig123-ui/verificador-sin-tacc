<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Descargar script</title>
<style>
  body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f0fdf4; }
  button { background: #16a34a; color: white; border: none; padding: 16px 32px; border-radius: 10px; font-size: 18px; cursor: pointer; }
  button:hover { background: #15803d; }
</style>
</head>
<body>
<button onclick="descargar()">⬇️ Descargar index.js</button>
<script>
function descargar() {
  const codigo = `const xlsx = require('xlsx');
const { google } = require('googleapis');

// ─── CONFIGURACIÓN ───────────────────────────────────────────
const SHEET_ID = '1Ybf3cnVU6GkGk4pZcCFXut5hWuTVpHVD_gj-MBFmzY8';
const CREDENTIALS_PATH = './credenciales.json';
const EXCEL_PATH = './listado-anmat.xlsx';
const HOJA_NOMBRE = 'Hoja 1';
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

  console.log(\`✅ \${filas.length - 1} productos encontrados\`);
  console.log('📋 Columnas detectadas:', filas[0]);

  console.log('\\n🔐 Autenticando con Google...');
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  // Obtener el ID numérico de la hoja
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const sheetId = meta.data.sheets[0].properties.sheetId;

  console.log('📐 Expandiendo filas en la Sheet...');
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [{
        updateSheetProperties: {
          properties: {
            sheetId: sheetId,
            gridProperties: { rowCount: filas.length + 100, columnCount: 26 }
          },
          fields: 'gridProperties.rowCount,gridProperties.columnCount'
        }
      }]
    }
  });

  console.log('🧹 Limpiando Sheet existente...');
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SHEET_ID,
    range: HOJA_NOMBRE,
  });

  console.log('📤 Subiendo datos...');
  const BATCH = 5000;
  for (let i = 0; i < filas.length; i += BATCH) {
    const bloque = filas.slice(i, i + BATCH);
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: \`\${HOJA_NOMBRE}!A\${i + 1}\`,
      valueInputOption: 'RAW',
      requestBody: { values: bloque },
    });
    console.log(\`   → \${Math.min(i + BATCH, filas.length)} / \${filas.length} filas subidas\`);
  }

  console.log('\\n🎉 ¡Listo! Listado cargado en Google Sheets.');
}

cargarListado().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});`;

  const blob = new Blob([codigo], { type: 'text/javascript' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'index.js';
  a.click();
}
</script>
</body>
</html>