import { useState } from 'react'

const API = 'http://localhost:3001'

export default function App() {
  const [rnpa, setRnpa] = useState('')
  const [resultado, setResultado] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)

  const buscar = async () => {
    const rnpaLimpio = rnpa.trim()
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

  return (
    <div style={styles.pagina}>
      <div style={styles.tarjeta}>

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.icono}>🌾</div>
          <h1 style={styles.titulo}>Verificador Sin TACC</h1>
          <p style={styles.subtitulo}>Consultá si un producto está habilitado por ANMAT</p>
        </div>

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
            onClick={buscar}
            disabled={cargando}
          >
            {cargando ? 'Buscando...' : 'Verificar'}
          </button>
        </div>

        {/* Error de conexión */}
        {error && (
          <div style={styles.errorConexion}>
            ⚠️ {error}
          </div>
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
  header: {
    textAlign: 'center',
    marginBottom: '28px',
  },
  icono: {
    fontSize: '48px',
    marginBottom: '8px',
  },
  titulo: {
    fontSize: '26px',
    fontWeight: '700',
    color: '#15803d',
    margin: '0 0 6px 0',
  },
  subtitulo: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  buscador: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '20px',
  },
  input: {
    padding: '14px 16px',
    fontSize: '16px',
    border: '2px solid #d1fae5',
    borderRadius: '10px',
    outline: 'none',
    transition: 'border 0.2s',
  },
  boton: {
    padding: '14px',
    fontSize: '16px',
    fontWeight: '600',
    background: '#16a34a',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  errorConexion: {
    background: '#fef3c7',
    border: '1px solid #fde68a',
    borderRadius: '10px',
    padding: '12px 16px',
    fontSize: '14px',
    color: '#92400e',
    marginBottom: '16px',
  },
  apto: {
    background: '#f0fdf4',
    border: '2px solid #86efac',
    borderRadius: '14px',
    padding: '20px',
    marginBottom: '16px',
  },
  aptoBadge: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#15803d',
    marginBottom: '16px',
    textAlign: 'center',
    letterSpacing: '0.5px',
  },
  campo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '8px 0',
    borderBottom: '1px solid #dcfce7',
    gap: '12px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#6b7280',
    minWidth: '60px',
  },
  valor: {
    fontSize: '14px',
    color: '#111827',
    textAlign: 'right',
  },
  rnpaChip: {
    marginTop: '14px',
    fontSize: '12px',
    color: '#6b7280',
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  noApto: {
    background: '#fff1f2',
    border: '2px solid #fecdd3',
    borderRadius: '14px',
    padding: '20px',
    marginBottom: '16px',
    textAlign: 'center',
  },
  noAptoBadge: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#be123c',
    marginBottom: '12px',
    letterSpacing: '0.5px',
  },
  noAptoTexto: {
    fontSize: '14px',
    color: '#374151',
    margin: '0 0 8px 0',
  },
  noAptoSub: {
    fontSize: '12px',
    color: '#9ca3af',
    margin: 0,
  },
  footer: {
    textAlign: 'center',
    fontSize: '11px',
    color: '#d1d5db',
    marginTop: '20px',
    marginBottom: 0,
  },
}
