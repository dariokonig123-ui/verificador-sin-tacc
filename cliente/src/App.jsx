import { useState, useRef } from 'react'
import { createWorker } from 'tesseract.js'

const API = 'https://verificador-sin-tacc.onrender.com'

export default function App() {
  const [rnpa, setRnpa] = useState('')
  const [resultado, setResultado] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const [modoCamera, setModoCamera] = useState(false)
  const [procesandoOCR, setProcesandoOCR] = useState(false)
  const [rnpaDetectado, setRnpaDetectado] = useState(null)
  const [textoOCR, setTextoOCR] = useState('')

  const videoRef = useRef(null)
  const streamRef = useRef(null)

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

  const handleKey = (e) => {
    if (e.key === 'Enter') buscar()
  }

  // ── CÁMARA ──────────────────────────────────────────────────
  const abrirCamera = async () => {
    try {
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          focusMode: { ideal: 'continuous' }
        }
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      setModoCamera(true)
      setRnpaDetectado(null)
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
        streamRef.current = stream
      }, 300)
    } catch (e) {
      console.error('Error cámara:', e)
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

      // Zona guía: franja horizontal centrada (60% ancho, 20% alto)
      const rx = vw * 0.1
      const ry = vh * 0.4
      const rw = vw * 0.8
      const rh = vh * 0.2

      // Recortar solo esa zona y escalar x2 para mejor OCR
      const scale = 2
      const canvas = document.createElement('canvas')
      canvas.width = rw * scale
      canvas.height = rh * scale
      const ctx = canvas.getContext('2d')

      // Escalar y aumentar contraste
      ctx.filter = 'contrast(1.8) brightness(1.1) grayscale(1)'
      ctx.drawImage(video, rx, ry, rw, rh, 0, 0, rw * scale, rh * scale)

      // OCR con Tesseract
      const worker = await createWorker('spa')
      await worker.setParameters({ tessedit_char_whitelist: 'RNPA0123456789.:-/ ' })
      const { data: { text } } = await worker.recognize(canvas)
      await worker.terminate()

      console.log('OCR detectó:', text)
      setTextoOCR(text) // mostrar en pantalla para debug

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
      console.error(e)
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
              <video
                ref={videoRef}
                autoPlay
                playsInline
                style={styles.video}
              />
              {/* Guía visual */}
              <div style={styles.guia}>
                <div style={styles.guiaRect} />
                <p style={styles.guiaTexto}>Alineá el RNPA dentro del recuadro</p>
              </div>
            </div>

            {textoOCR ? (
              <div style={styles.avisoOCR}>
                <strong>Texto detectado:</strong><br />{textoOCR}
              </div>
            ) : null}

            {rnpaDetectado === 'NO_ENCONTRADO' && (
              <div style={styles.avisoOCR}>
                ⚠️ No se detectó ningún RNPA. Intentá de nuevo o ingresalo manualmente.
              </div>
            )}

            {procesandoOCR ? (
              <div style={styles.procesando}>🔍 Leyendo texto...</div>
            ) : (
              <div style={styles.botonesCamera}>
                <button onClick={capturarYLeer} style={styles.botonCapturar}>
                  📷 Capturar
                </button>
                <button onClick={cerrarCamera} style={styles.botonCancelar}>
                  Cancelar
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Buscador */}
            <div style={styles.buscador}>
              <input
                style={styles.input}
                type="text"
                placeholder="Ingresá el número de RNPA"
                value={rnpa}
                onChange={e => setRnpa(e.target.value)}
                onKeyDown={handleKey}
              />
              <button
                style={{ ...styles.boton, opacity: cargando ? 0.7 : 1 }}
                onClick={() => buscar()}
                disabled={cargando}
              >
                {cargando ? 'Buscando...' : 'Verificar'}
              </button>
              <button onClick={abrirCamera} style={styles.botonCamera}>
                📷 Escanear con cámara
              </button>
            </div>

            {/* Si hay RNPA detectado por OCR, mostrar confirmación */}
            {rnpaDetectado && rnpaDetectado !== 'NO_ENCONTRADO' && (
              <div style={styles.confirmacion}>
                <p style={styles.confirmacionTexto}>
                  ¿Es correcto este RNPA?
                </p>
                <p style={styles.confirmacionRnpa}>{rnpaDetectado}</p>
                <div style={styles.botonesConfirm}>
                  <button onClick={confirmarRnpa} style={styles.botonSi}>
                    ✅ Sí, buscar
                  </button>
                  <button onClick={() => setRnpaDetectado(null)} style={styles.botonNo}>
                    ✏️ Editar
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Error de conexión */}
        {error && (
          <div style={styles.errorConexion}>⚠️ {error}</div>
        )}

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
                Verificá que el código sea correcto o consultá directamente con el fabricante.
              </p>
            </div>
          )
        )}

        {/* Footer */}
        <p style={styles.footer}>
          Datos oficiales ANMAT · Actualizado 22/09/2026
        </p>
      </div>
    </div>
  )
}

const styles = {
  pagina: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: "'Segoe UI', sans-serif",
  },
  tarjeta: {
    background: 'white',
    borderRadius: '20px',
    padding: '36px 32px',
    width: '100%',
    maxWidth: '460px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
  },
  header: { textAlign: 'center', marginBottom: '28px' },
  icono: { fontSize: '48px', marginBottom: '8px' },
  titulo: { fontSize: '26px', fontWeight: '700', color: '#15803d', margin: '0 0 6px 0' },
  subtitulo: { fontSize: '14px', color: '#6b7280', margin: 0 },
  buscador: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' },
  input: {
    padding: '14px 16px', fontSize: '16px',
    border: '2px solid #d1fae5', borderRadius: '10px', outline: 'none',
  },
  boton: {
    padding: '14px', fontSize: '16px', fontWeight: '600',
    background: '#16a34a', color: 'white', border: 'none',
    borderRadius: '10px', cursor: 'pointer',
  },
  botonCamera: {
    padding: '14px', fontSize: '15px', fontWeight: '600',
    background: '#2563eb', color: 'white', border: 'none',
    borderRadius: '10px', cursor: 'pointer',
  },
  videoWrapper: { position: 'relative', marginBottom: '12px' },
  video: { width: '100%', borderRadius: '12px', display: 'block' },
  guia: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    pointerEvents: 'none',
  },
  guiaRect: {
    width: '80%', height: '20%',
    border: '3px solid #facc15',
    borderRadius: '8px',
    boxShadow: '0 0 0 2000px rgba(0,0,0,0.45)',
  },
  guiaTexto: {
    color: '#facc15', fontSize: '13px', fontWeight: '600',
    marginTop: '10px', textAlign: 'center',
    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
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
  footer: { textAlign: 'center', fontSize: '11px', color: '#d1d5db', marginTop: '20px', marginBottom: 0 },
}