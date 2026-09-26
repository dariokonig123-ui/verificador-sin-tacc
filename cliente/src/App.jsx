import { useState, useRef } from 'react'
import { createWorker } from 'tesseract.js'

const API = 'https://verificador-sin-tacc.onrender.com'

const teclado = [
  ['1','2','3'],
  ['4','5','6'],
  ['7','8','9'],
  ['-','0','/'],
]

export default function App() {
  const [rnpa, setRnpa] = useState('')
  const [resultado, setResultado] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const [modoCamera, setModoCamera] = useState(false)
  const [procesandoOCR, setProcesandoOCR] = useState(false)
  const [rnpaDetectado, setRnpaDetectado] = useState(null)

  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const limpiar = () => {
    setRnpa('')
    setResultado(null)
    setError(null)
    setRnpaDetectado(null)
  }

  const teclear = (val) => setRnpa(prev => prev + val)
  const borrar = () => setRnpa(prev => prev.slice(0, -1))

  const buscar = async (rnpaABuscar) => {
    const rnpaLimpio = (rnpaABuscar || rnpa).trim()
    if (!rnpaLimpio) return

    setCargando(true)
    setResultado(null)
    setError(null)

    try {
      const res = await fetch(`${API}/buscar?rnpa=${encodeURIComponent(rnpaLimpio)}`)
      if (!res.ok) throw new Error('Error en el servidor')
      const data = await res.json()
      setResultado(data)
    } catch (e) {
      setError('No se pudo conectar con el servidor. Verificá que esté corriendo.')
    }
    setCargando(false)
  }

  // ── CÁMARA ──────────────────────────────────────────────────
  const abrirCamera = async () => {
    setResultado(null)
    setError(null)
    setRnpaDetectado(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          focusMode: { ideal: 'continuous' }
        }
      })
      setModoCamera(true)
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
        streamRef.current = stream
      }, 300)
    } catch (e) {
      setError(`No se pudo acceder a la cámara: ${e.message}`)
    }
  }

  const cerrarCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    setModoCamera(false)
    setRnpaDetectado(null)
  }

  const capturarYLeer = async () => {
    setProcesandoOCR(true)
    setRnpaDetectado(null)
    try {
      const video = videoRef.current
      const vw = video.videoWidth
      const vh = video.videoHeight
      const rx = vw * 0.1
      const ry = vh * 0.4
      const rw = vw * 0.8
      const rh = vh * 0.2
      const scale = 2
      const canvas = document.createElement('canvas')
      canvas.width = rw * scale
      canvas.height = rh * scale
      const ctx = canvas.getContext('2d')
      ctx.filter = 'contrast(1.8) brightness(1.1) grayscale(1)'
      ctx.drawImage(video, rx, ry, rw, rh, 0, 0, rw * scale, rh * scale)

      const worker = await createWorker('spa')
      await worker.setParameters({ tessedit_char_whitelist: 'RNPA0123456789.:-/ ' })
      const { data: { text } } = await worker.recognize(canvas)
      await worker.terminate()

      const match = text.match(/R\.?\s*N\.?\s*P\.?\s*A\.?\s*N?[º°]?\s*[:\s]*([0-9/\-]+)/i)
      if (match) {
        const rnpaEncontrado = match[1].trim()
        setRnpaDetectado(rnpaEncontrado)
        setRnpa(rnpaEncontrado)
        cerrarCamera()
      } else {
        setRnpaDetectado('NO_ENCONTRADO')
      }
    } catch (e) {
      setError('Error al procesar la imagen.')
    }
    setProcesandoOCR(false)
  }

  const confirmarRnpa = () => {
    cerrarCamera()
    buscar(rnpa)
  }

  // ── RENDER ──────────────────────────────────────────────────
  return (
    <div style={styles.pagina}>
      <div style={styles.tarjeta}>

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.icono}>🌾</div>
          <h1 style={styles.titulo}>Verificador Sin TACC</h1>
          <p style={styles.subtitulo}>Consultá si un producto está habilitado por ANMAT</p>
        </div>

        {/* Modo cámara */}
        {modoCamera ? (
          <div>
            <div style={styles.videoWrapper}>
              <video ref={videoRef} autoPlay playsInline style={styles.video} />
              <div style={styles.guia}>
                <div style={styles.guiaRect} />
                <p style={styles.guiaTexto}>Alineá el RNPA dentro del recuadro</p>
              </div>
            </div>

            {rnpaDetectado === 'NO_ENCONTRADO' && (
              <div style={styles.avisoOCR}>
                ⚠️ No se detectó ningún RNPA. Intentá de nuevo o ingresalo manualmente.
              </div>
            )}

            {procesandoOCR ? (
              <div style={styles.procesando}>🔍 Leyendo texto...</div>
            ) : (
              <div style={styles.botonesCamera}>
                <button onClick={capturarYLeer} style={styles.botonCapturar}>📷 Capturar</button>
                <button onClick={cerrarCamera} style={styles.botonCancelar}>Cancelar</button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Display RNPA */}
            <div style={styles.display}>
              <span style={styles.displayTexto}>
                {rnpa || <span style={{color:'#d1d5db'}}>Ingresá el RNPA</span>}
              </span>
              {rnpa && <button onClick={limpiar} style={styles.displayLimpiar}>✕</button>}
            </div>

            {/* Teclado numérico */}
            <div style={styles.teclado}>
              {teclado.map((fila, i) => (
                <div key={i} style={styles.fila}>
                  {fila.map(key => (
                    <button key={key} onClick={() => teclear(key)} style={styles.tecla}>{key}</button>
                  ))}
                </div>
              ))}
              <div style={styles.fila}>
                <button onClick={() => teclear('.')} style={styles.tecla}>.</button>
                <button onClick={() => buscar()} disabled={cargando} style={{...styles.teclaVerificar, opacity: cargando ? 0.7 : 1}}>
                  {cargando ? '...' : '✓'}
                </button>
                <button onClick={borrar} style={styles.teclaBorrar}>⌫</button>
              </div>
            </div>

            {/* Botón cámara */}
            <button onClick={abrirCamera} style={styles.botonCamera}>
              📷 Escanear con cámara
            </button>

            {/* Confirmación RNPA detectado */}
            {rnpaDetectado && rnpaDetectado !== 'NO_ENCONTRADO' && (
              <div style={styles.confirmacion}>
                <p style={styles.confirmacionTexto}>¿Es correcto este RNPA?</p>
                <p style={styles.confirmacionRnpa}>{rnpaDetectado}</p>
                <div style={styles.botonesConfirm}>
                  <button onClick={confirmarRnpa} style={styles.botonSi}>✅ Sí, buscar</button>
                  <button onClick={() => setRnpaDetectado(null)} style={styles.botonNo}>✏️ Editar</button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Error */}
        {error && <div style={styles.errorConexion}>⚠️ {error}</div>}

        {/* Resultado */}
        {resultado && (
          resultado.encontrado ? (
            <div style={styles.apto}>
              <div style={styles.aptoBadge}>✅ APTO PARA CELÍACOS</div>
              <div style={styles.campo}>
                <span style={styles.label}>Marca</span>
                <span style={styles.valor}>{resultado.producto.marca || '—'}</span>
              </div>
              <div style={styles.campo}>
                <span style={styles.label}>Nombre de Fantasía</span>
                <span style={styles.valor}>
                  {resultado.producto.nombrefantasia && resultado.producto.nombrefantasia !== 'NO REGISTRA'
                    ? resultado.producto.nombrefantasia
                    : resultado.producto.denominacionventa || '—'}
                </span>
              </div>
              <div style={styles.campo}>
                <span style={styles.label}>Estado</span>
                <span style={styles.valor}>{resultado.producto.estado || '—'}</span>
              </div>
              <div style={styles.rnpaChip}>RNPA: {resultado.producto.rnpa}</div>
            </div>
          ) : (
            <div style={styles.noApto}>
              <div style={styles.noAptoBadge}>❌ NO ENCONTRADO</div>
              <p style={styles.noAptoTexto}>
                Este RNPA no figura en el listado oficial de productos Sin TACC de ANMAT.
              </p>
              <p style={styles.noAptoSub}>
                Verificá que el código sea correcto o consultá con el fabricante.
              </p>
            </div>
          )
        )}

        {/* Cafecito */}
        <div style={{textAlign:'center', margin:'16px 0 8px 0'}}>
          <a href='https://cafecito.app/el_yo_ella' rel='noopener' target='_blank'>
            <img
              srcSet='https://cdn.cafecito.app/imgs/buttons/button_1.png 1x, https://cdn.cafecito.app/imgs/buttons/button_1_2x.png 2x, https://cdn.cafecito.app/imgs/buttons/button_1_3.75x.png 3.75x'
              src='https://cdn.cafecito.app/imgs/buttons/button_1.png'
              alt='Invitame un café en cafecito.app'
            />
          </a>
        </div>

        {/* Footer */}
        <p style={styles.footer}>
          Datos oficiales ANMAT · Actualizado 26/09/2026<br />
          <span style={{fontSize:'10px', color:'#9ca3af'}}>3HK división software</span>
        </p>
      </div>
    </div>
  )
}

const styles = {
  pagina: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '20px', fontFamily: "'Segoe UI', sans-serif",
  },
  tarjeta: {
    background: 'white', borderRadius: '20px', padding: '36px 32px',
    width: '100%', maxWidth: '460px', boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
  },
  header: { textAlign: 'center', marginBottom: '28px' },
  icono: { fontSize: '48px', marginBottom: '8px' },
  titulo: { fontSize: '26px', fontWeight: '700', color: '#15803d', margin: '0 0 6px 0' },
  subtitulo: { fontSize: '14px', color: '#6b7280', margin: 0 },
  display: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: '#f9fafb', border: '2px solid #d1fae5',
    borderRadius: '12px', padding: '14px 16px', marginBottom: '12px', minHeight: '52px',
  },
  displayTexto: { fontSize: '22px', fontFamily: 'monospace', color: '#111827', letterSpacing: '2px' },
  displayLimpiar: {
    background: 'none', border: 'none', color: '#9ca3af',
    fontSize: '18px', cursor: 'pointer', padding: '0 4px',
  },
  teclado: { marginBottom: '12px' },
  fila: { display: 'flex', gap: '8px', marginBottom: '8px' },
  tecla: {
    flex: 1, padding: '16px', fontSize: '22px', fontWeight: '600',
    background: '#f3f4f6', border: '1px solid #e5e7eb',
    borderRadius: '10px', cursor: 'pointer', color: '#111827',
  },
  teclaVerificar: {
    flex: 1, padding: '16px', fontSize: '24px', fontWeight: '700',
    background: '#16a34a', border: 'none',
    borderRadius: '10px', cursor: 'pointer', color: 'white',
  },
  teclaBorrar: {
    flex: 1, padding: '16px', fontSize: '20px', fontWeight: '600',
    background: '#fee2e2', border: '1px solid #fecaca',
    borderRadius: '10px', cursor: 'pointer', color: '#dc2626',
  },
  botonCamera: {
    width: '100%', padding: '14px', fontSize: '15px', fontWeight: '600',
    background: '#2563eb', color: 'white', border: 'none',
    borderRadius: '10px', cursor: 'pointer', marginBottom: '16px',
  },
  videoWrapper: { position: 'relative', marginBottom: '12px' },
  video: { width: '100%', borderRadius: '12px', display: 'block' },
  guia: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    pointerEvents: 'none',
  },
  guiaRect: {
    width: '80%', height: '20%', border: '3px solid #facc15',
    borderRadius: '8px', boxShadow: '0 0 0 2000px rgba(0,0,0,0.45)',
  },
  guiaTexto: {
    color: '#facc15', fontSize: '13px', fontWeight: '600',
    marginTop: '10px', textAlign: 'center', textShadow: '0 1px 3px rgba(0,0,0,0.8)',
  },
  procesando: { textAlign: 'center', padding: '12px', color: '#6b7280', fontSize: '15px' },
  avisoOCR: {
    background: '#fef3c7', border: '1px solid #fde68a',
    borderRadius: '10px', padding: '10px 14px',
    fontSize: '13px', color: '#92400e', marginBottom: '10px',
  },
  botonesCamera: { display: 'flex', gap: '10px' },
  botonCapturar: {
    flex: 1, padding: '14px', fontSize: '15px', fontWeight: '600',
    background: '#16a34a', color: 'white', border: 'none',
    borderRadius: '10px', cursor: 'pointer',
  },
  botonCancelar: {
    flex: 1, padding: '14px', fontSize: '15px', fontWeight: '600',
    background: '#6b7280', color: 'white', border: 'none',
    borderRadius: '10px', cursor: 'pointer',
  },
  confirmacion: {
    background: '#eff6ff', border: '2px solid #bfdbfe',
    borderRadius: '14px', padding: '16px', marginBottom: '16px', textAlign: 'center',
  },
  confirmacionTexto: { fontSize: '14px', color: '#6b7280', margin: '0 0 6px 0' },
  confirmacionRnpa: { fontSize: '22px', fontWeight: '700', color: '#1e40af', margin: '0 0 12px 0', fontFamily: 'monospace' },
  botonesConfirm: { display: 'flex', gap: '10px' },
  botonSi: {
    flex: 1, padding: '12px', fontSize: '14px', fontWeight: '600',
    background: '#16a34a', color: 'white', border: 'none',
    borderRadius: '10px', cursor: 'pointer',
  },
  botonNo: {
    flex: 1, padding: '12px', fontSize: '14px', fontWeight: '600',
    background: '#e5e7eb', color: '#374151', border: 'none',
    borderRadius: '10px', cursor: 'pointer',
  },
  errorConexion: {
    background: '#fef3c7', border: '1px solid #fde68a',
    borderRadius: '10px', padding: '12px 16px',
    fontSize: '14px', color: '#92400e', marginBottom: '16px',
  },
  apto: {
    background: '#f0fdf4', border: '2px solid #86efac',
    borderRadius: '14px', padding: '20px', marginBottom: '16px',
  },
  aptoBadge: {
    fontSize: '15px', fontWeight: '700', color: '#15803d',
    marginBottom: '16px', textAlign: 'center', letterSpacing: '0.5px',
  },
  campo: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '8px 0', borderBottom: '1px solid #dcfce7', gap: '12px',
  },
  label: { fontSize: '13px', fontWeight: '600', color: '#6b7280', minWidth: '60px' },
  valor: { fontSize: '14px', color: '#111827', textAlign: 'right' },
  rnpaChip: { marginTop: '14px', fontSize: '12px', color: '#6b7280', textAlign: 'center', fontFamily: 'monospace' },
  noApto: {
    background: '#fff1f2', border: '2px solid #fecdd3',
    borderRadius: '14px', padding: '20px', marginBottom: '16px', textAlign: 'center',
  },
  noAptoBadge: { fontSize: '15px', fontWeight: '700', color: '#be123c', marginBottom: '12px', letterSpacing: '0.5px' },
  noAptoTexto: { fontSize: '14px', color: '#374151', margin: '0 0 8px 0' },
  noAptoSub: { fontSize: '12px', color: '#9ca3af', margin: 0 },
  footer: { textAlign: 'center', fontSize: '11px', color: '#6b7280', marginTop: '20px', marginBottom: 0 },
}