// WebSocket connection handler with improved error handling and fallback
export function createWebSocketConnection() {
  let ws: WebSocket | null = null
  let reconnectAttempts = 0
  let reconnectInterval: NodeJS.Timeout | null = null
  const MAX_RECONNECT_ATTEMPTS = 5
  const RECONNECT_DELAY = 2000 // 2 seconds
  let isReconnecting = false

  const connect = (
    onOpen: () => void = () => {},
    onClose: () => void = () => {},
    onMessage: (data: any) => void = () => {},
  ) => {
    try {
      // Clear any existing reconnect interval
      if (reconnectInterval) {
        clearInterval(reconnectInterval)
        reconnectInterval = null
      }

      // If we're already reconnecting, don't try to connect again
      if (isReconnecting) return

      // Create new WebSocket connection
      console.log("Attempting to connect to WebSocket server...")

      // Check if WebSocket is supported
      if (typeof WebSocket === "undefined") {
        console.error("WebSocket is not supported in this environment")
        onClose()
        return
      }

      ws = new WebSocket("ws://localhost:8765")

      ws.onopen = () => {
        console.log("Connected to audio processing server")
        reconnectAttempts = 0 // Reset reconnect attempts on successful connection
        isReconnecting = false
        onOpen()
      }

      ws.onclose = (event) => {
        console.log("WebSocket connection closed", event.code, event.reason)

        // Only try to reconnect if we haven't reached max attempts
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS && !isReconnecting) {
          console.log(`Attempting to reconnect (${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})...`)
          isReconnecting = true

          // Set up reconnection attempt
          reconnectInterval = setInterval(() => {
            reconnectAttempts++
            connect(onOpen, onClose, onMessage)

            // Clear interval after connection attempt
            if (reconnectInterval) {
              clearInterval(reconnectInterval)
              reconnectInterval = null
            }

            // If we've reached max attempts, stop trying
            if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
              console.log("Max reconnection attempts reached. Giving up.")
              isReconnecting = false
            }
          }, RECONNECT_DELAY)
        } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          console.log("Max reconnection attempts reached. Giving up.")
          isReconnecting = false
        }

        onClose()
      }

      ws.onerror = (error) => {
        // Log more detailed error information
        console.error("WebSocket error:", error)

        // Check if the error is due to the server not being available
        if (error && error.target && (error.target as any).readyState === WebSocket.CLOSED) {
          console.error("WebSocket server appears to be unavailable")
        }

        // Don't close the connection here, let the onclose handler deal with reconnection
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log("Received message:", data)
          onMessage(data)
        } catch (error) {
          console.error("Error parsing message:", error)
        }
      }
    } catch (error) {
      console.error("Error creating WebSocket connection:", error)
      isReconnecting = false
      onClose()
    }
  }

  const disconnect = () => {
    isReconnecting = false

    if (reconnectInterval) {
      clearInterval(reconnectInterval)
      reconnectInterval = null
    }

    if (ws) {
      // Only close if the connection is open or connecting
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        try {
          ws.close()
        } catch (error) {
          console.error("Error closing WebSocket:", error)
        }
      }
      ws = null
    }
  }

  const send = (data: any) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(data))
        return true
      } catch (error) {
        console.error("Error sending message:", error)
        return false
      }
    }
    return false
  }

  return {
    ws,
    connect,
    disconnect,
    send,
    isConnected: () => ws && ws.readyState === WebSocket.OPEN,
  }
}

