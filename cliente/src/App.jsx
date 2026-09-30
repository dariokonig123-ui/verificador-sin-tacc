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
  const [despertando, setDespertando] = useState(false)
  const [mostrarAcerca, setMostrarAcerca] = useState(false)

  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const buscar = async (rnpaABuscar) => {
    const rnpaLimpio = (rnpaABuscar || rnpa).trim()
    if (!rnpaLimpio) return
    setCargando(true)
    setResultado(null)
    setError(null)
    const timer = setTimeout(() => setDespertando(true), 2000)
    try {
      const res = await fetch(`${API}/buscar?rnpa=${encodeURIComponent(rnpaLimpio)}`)
      if (!res.ok) throw new Error('Error en el servidor')
      const data = await res.json()
      setResultado(data)
    } catch (e) {
      setError('No se pudo conectar con el servidor. Verificá que esté corriendo.')
    }
    clearTimeout(timer)
    setDespertando(false)
    setCargando(false)
  }

  const abrirCamera = async () => {
    setResultado(null)
    setError(null)
    setRnpaDetectado(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }
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
      const vw = video.videoWidth, vh = video.videoHeight
      const rx = vw * 0.1, ry = vh * 0.4, rw = vw * 0.8, rh = vh * 0.2
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
        setRnpaDetectado(match[1].trim())
        setRnpa(match[1].trim())
        cerrarCamera()
      } else {
        setRnpaDetectado('NO_ENCONTRADO')
      }
    } catch (e) {
      setError('Error al procesar la imagen.')
    }
    setProcesandoOCR(false)
  }

  const confirmarRnpa = () => { cerrarCamera(); buscar(rnpa) }

  const nombreProducto = (p) =>
    p.nombrefantasia && p.nombrefantasia !== 'NO REGISTRA'
      ? p.nombrefantasia
      : p.denominacionventa || '—'

  const mensajeWhatsapp = (p) =>
    `✅ Producto APTO para celíacos según ANMAT\nMarca: ${p.marca || '—'}\nNombre: ${nombreProducto(p)}\nRNPA: ${p.rnpa}\nVerificado en: verificador-sin-tacc.vercel.app`

  return (
    <div style={s.pagina}>
      <div style={s.tarjeta}>

        {/* Header */}
        <div style={s.header}>
          <img
            src="/logo-sin-tacc.png"
            alt="Sin TACC"
            style={s.logoSinTacc}
            onError={e => { e.target.style.display = 'none' }}
          />
          <h1 style={s.titulo}>Verificador Sin TACC</h1>
          <p style={s.subtitulo}>Consultá si un producto está habilitado por ANMAT</p>
          <button onClick={() => setMostrarAcerca(true)} style={s.botonInfo}>ℹ️</button>
        </div>

        {/* Modal Acerca de */}
        {mostrarAcerca && (
          <div style={s.modalOverlay} onClick={() => setMostrarAcerca(false)}>
            <div style={s.modal} onClick={e => e.stopPropagation()}>
              <h2 style={s.modalTitulo}>Acerca de</h2>
              <p style={s.modalTexto}>
                <strong>Verificador Sin TACC</strong> te permite consultar si un alimento está certificado libre de gluten según el listado oficial de ANMAT, escaneando o ingresando el número de RNPA del envase.
              </p>
              <div style={s.modalFila}>
                <span style={s.modalLabel}>Desarrollado por</span>
                <span style={s.modalValor}>3HK división software</span>
              </div>
              <div style={s.modalFila}>
                <span style={s.modalLabel}>Fuente de datos</span>
                <a href="https://listadoalg.anmat.gob.ar/Home" target="_blank" rel="noopener" style={s.modalLink}>ANMAT oficial</a>
              </div>
              <div style={s.modalFila}>
                <span style={s.modalLabel}>Contacto</span>
                <a href="https://www.facebook.com/AlimentosSinGlutenArgentina" target="_blank" rel="noopener" style={s.modalLink}>Facebook</a>
              </div>
              <div style={s.modalFila}>
                <span style={s.modalLabel}>Versión</span>
                <span style={s.modalValor}>v1.0</span>
              </div>
              <button onClick={() => setMostrarAcerca(false)} style={s.modalCerrar}>Cerrar</button>
            </div>
          </div>
        )}

        {/* Modo cámara */}
        {modoCamera ? (
          <div>
            <div style={s.videoWrapper}>
              <video ref={videoRef} autoPlay playsInline style={s.video} />
              <div style={s.guia}>
                <div style={s.guiaRect} />
                <p style={s.guiaTexto}>Alineá el RNPA dentro del recuadro</p>
              </div>
            </div>
            {rnpaDetectado === 'NO_ENCONTRADO' && (
              <div style={s.avisoOCR}>⚠️ No se detectó ningún RNPA. Intentá de nuevo o ingresalo manualmente.</div>
            )}
            {procesandoOCR ? (
              <div style={s.procesando}>🔍 Leyendo texto...</div>
            ) : (
              <div style={s.botonesCamera}>
                <button onClick={capturarYLeer} style={s.botonCapturar}>📷 Capturar</button>
                <button onClick={cerrarCamera} style={s.botonCancelar}>Cancelar</button>
              </div>
            )}
          </div>
        ) : (
          <>
            <input
              style={s.input}
              type="text"
              inputMode="numeric"
              placeholder="Ingresá el RNPA"
              value={rnpa}
              onChange={e => setRnpa(e.target.value)}
              onFocus={() => { setResultado(null); setError(null); setRnpaDetectado(null) }}
              onKeyDown={e => e.key === 'Enter' && buscar()}
            />
            <button onClick={() => buscar()} disabled={cargando} style={{...s.botonVerificar, opacity: cargando ? 0.7 : 1}}>
              {cargando ? 'Buscando...' : '✓ Verificar'}
            </button>
            <button onClick={abrirCamera} style={s.botonCamera}>📷 Escanear con cámara</button>
            {rnpaDetectado && rnpaDetectado !== 'NO_ENCONTRADO' && (
              <div style={s.confirmacion}>
                <p style={s.confirmacionTexto}>¿Es correcto este RNPA?</p>
                <p style={s.confirmacionRnpa}>{rnpaDetectado}</p>
                <div style={s.botonesConfirm}>
                  <button onClick={confirmarRnpa} style={s.botonSi}>✅ Sí, buscar</button>
                  <button onClick={() => setRnpaDetectado(null)} style={s.botonNo}>✏️ Editar</button>
                </div>
              </div>
            )}
          </>
        )}

        {despertando && <div style={s.despertando}>☕ Despertando el servidor, aguantá un momento...</div>}
        {error && <div style={s.errorConexion}>⚠️ {error}</div>}

        {/* Resultado */}
        {resultado && (
          resultado.encontrado ? (
            <div style={s.apto}>
              <div style={s.aptoBadge}>✅ APTO PARA CELÍACOS</div>
              <div style={s.campo}>
                <span style={s.label}>Marca</span>
                <span style={s.valor}>{resultado.producto.marca || '—'}</span>
              </div>
              <div style={s.campo}>
                <span style={s.label}>Nombre de Fantasía</span>
                <span style={s.valor}>{nombreProducto(resultado.producto)}</span>
              </div>
              <div style={s.campo}>
                <span style={s.label}>Estado</span>
                <span style={s.valor}>{resultado.producto.estado || '—'}</span>
              </div>
              <div style={s.rnpaChip}>RNPA: {resultado.producto.rnpa}</div>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(mensajeWhatsapp(resultado.producto))}`}
                target="_blank" rel="noopener" style={s.botonWhatsapp}
              >
                📤 Compartir por WhatsApp
              </a>
            </div>
          ) : (
            <div style={s.noApto}>
              <div style={s.noAptoBadge}>❌ NO ENCONTRADO</div>
              <p style={s.noAptoTexto}>Este RNPA no figura en el listado oficial de productos Sin TACC de ANMAT.</p>
              <p style={s.noAptoSub}>
                El producto puede estar registrado en <strong>ACELA</strong> (Asociación Celíaca Argentina), pero esta app verifica únicamente los productos certificados por <strong>ANMAT</strong>. Consultá directamente con el fabricante.
              </p>
            </div>
          )
        )}

        {/* Cafecito */}
        <div style={{textAlign:'center', margin:'16px 0 8px 0'}}>
          <p style={{fontSize:'13px', color:'#6b7280', marginBottom:'10px'}}>
            Esta app es gratuita y la mantenemos con mucho café ☕ Si te ayudó en el super, convidanos uno 👇
          </p>
          <a href='https://cafecito.app/el_yo_ella' rel='noopener' target='_blank'>
            <img
              srcSet='https://cdn.cafecito.app/imgs/buttons/button_1.png 1x, https://cdn.cafecito.app/imgs/buttons/button_1_2x.png 2x, https://cdn.cafecito.app/imgs/buttons/button_1_3.75x.png 3.75x'
              src='https://cdn.cafecito.app/imgs/buttons/button_1.png'
              alt='Invitame un café en cafecito.app'
            />
          </a>
        </div>

        {/* Footer */}
        <p style={s.footer}>
          Datos oficiales ANMAT · Actualizado 27/09/2026<br />
          <span style={{fontSize:'10px', color:'#9ca3af'}}>3HK división software</span>
        </p>

      </div>
    </div>
  )
}

const s = {
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
  header: { textAlign: 'center', marginBottom: '28px', position: 'relative' },
  logoSinTacc: { height: '64px', marginBottom: '8px' },
  titulo: { fontSize: '26px', fontWeight: '700', color: '#15803d', margin: '0 0 6px 0' },
  subtitulo: { fontSize: '14px', color: '#6b7280', margin: '0 0 4px 0' },
  botonInfo: {
    position: 'absolute', top: '0', right: '0',
    background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', padding: '4px',
  },
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px',
  },
  modal: {
    background: 'white', borderRadius: '16px', padding: '28px',
    width: '100%', maxWidth: '400px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
  },
  modalTitulo: { fontSize: '20px', fontWeight: '700', color: '#15803d', margin: '0 0 16px 0' },
  modalTexto: { fontSize: '14px', color: '#4b5563', marginBottom: '16px', lineHeight: '1.5' },
  modalFila: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 0', borderBottom: '1px solid #f3f4f6',
  },
  modalLabel: { fontSize: '13px', fontWeight: '600', color: '#6b7280' },
  modalValor: { fontSize: '13px', color: '#111827' },
  modalLink: { fontSize: '13px', color: '#2563eb', textDecoration: 'none' },
  modalCerrar: {
    width: '100%', marginTop: '20px', padding: '12px',
    background: '#16a34a', color: 'white', border: 'none',
    borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer',
  },
  input: {
    width: '100%', padding: '16px', fontSize: '24px',
    fontFamily: 'monospace', letterSpacing: '2px',
    border: '2px solid #d1fae5', borderRadius: '12px',
    outline: 'none', boxSizing: 'border-box',
    marginBottom: '10px', textAlign: 'center',
    color: 'white', background: '#1f2937', fontWeight: '700',
  },
  botonVerificar: {
    width: '100%', padding: '16px', fontSize: '18px', fontWeight: '700',
    background: '#16a34a', color: 'white', border: 'none',
    borderRadius: '12px', cursor: 'pointer', marginBottom: '10px',
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
  despertando: {
    background: '#eff6ff', border: '1px solid #bfdbfe',
    borderRadius: '10px', padding: '12px 16px',
    fontSize: '14px', color: '#1e40af', marginBottom: '16px', textAlign: 'center',
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
  botonWhatsapp: {
    display: 'block', marginTop: '14px', padding: '12px',
    background: '#25d366', color: 'white', borderRadius: '10px',
    textAlign: 'center', fontWeight: '600', fontSize: '14px', textDecoration: 'none',
  },
  noApto: {
    background: '#fff1f2', border: '2px solid #fecdd3',
    borderRadius: '14px', padding: '20px', marginBottom: '16px', textAlign: 'center',
  },
  noAptoBadge: { fontSize: '15px', fontWeight: '700', color: '#be123c', marginBottom: '12px', letterSpacing: '0.5px' },
  noAptoTexto: { fontSize: '14px', color: '#374151', margin: '0 0 8px 0' },
  noAptoSub: { fontSize: '12px', color: '#6b7280', margin: 0 },
  footer: { textAlign: 'center', fontSize: '11px', color: '#6b7280', marginTop: '20px', marginBottom: 0 },
}