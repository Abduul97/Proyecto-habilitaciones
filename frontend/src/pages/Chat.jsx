import { useState, useRef, useEffect } from 'react'
import { api } from '../services/api'

export default function Chat() {
  const [messages, setMessages] = useState([
    {
      type: 'bot',
      text: '¡Hola! Soy el asistente de Habilitaciones Municipales. Puedo ayudarte con:\n\n• Requisitos para habilitar tu comercio\n• Buscar rubros y códigos de actividad\n• Consultar eventos autorizados\n\n¿En qué puedo ayudarte?',
      suggestions: ['¿Qué necesito para abrir un kiosco?', 'Buscar rubro farmacia', 'Ver requisitos generales']
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEnd = useRef(null)

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(message = input) {
    if (!message.trim() || loading) return

    const userMessage = { type: 'user', text: message }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await api.sendMessage(message)
      setMessages(prev => [...prev, {
        type: 'bot',
        text: response.text,
        suggestions: response.suggestions,
        data: response.data
      }])
    } catch (error) {
      setMessages(prev => [...prev, {
        type: 'bot',
        text: 'Lo siento, hubo un error. Por favor intenta de nuevo.'
      }])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Asistente Virtual</h1>
        <p className="page-subtitle">Consulta requisitos y trámites</p>
      </header>

      <div className="chat-container">
        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`message message-${msg.type}`}>
              <div className="message-text">{msg.text}</div>
              {msg.suggestions && (
                <div className="chat-suggestions">
                  {msg.suggestions.map((sug, j) => (
                    <button
                      key={j}
                      className="suggestion-btn"
                      onClick={() => handleSend(sug)}
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="message message-bot">
              <div className="message-text">Escribiendo...</div>
            </div>
          )}
          <div ref={messagesEnd} />
        </div>

        <div className="chat-input-container">
          <textarea
            className="chat-input"
            placeholder="Escribe tu consulta..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button 
            className="btn btn-primary" 
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  )
}
