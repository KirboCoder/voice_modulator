// WebSocket connection handler

export function createWebSocketConnection() {
  let ws: WebSocket | null = null

  const connect = (onOpen: () => void = () => {}, onClose: () => void = () => {}) => {
    try {
      ws = new WebSocket("ws://localhost:8765")

      ws.onopen = () => {
        console.log("Connected to audio processing server")
        onOpen()
      }

      ws.onclose = () => {
        console.log("Disconnected from audio processing server")
        onClose()
      }

      ws.onerror = (error) => {
        console.error("WebSocket error:", error)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log("Received message:", data)
        } catch (error) {
          console.error("Error parsing message:", error)
        }
      }
    } catch (error) {
      console.error("Error creating WebSocket connection:", error)
    }
  }

  const disconnect = () => {
    if (ws) {
      ws.close()
      ws = null
    }
  }

  return { ws, connect, disconnect }
}

