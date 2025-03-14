"use client"

import { useEffect, useRef } from "react"

type VoiceVisualizerProps = {
  isActive: boolean
}

export default function VoiceVisualizer({ isActive }: VoiceVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    const setDimensions = () => {
      canvas.width = canvas.clientWidth
      canvas.height = canvas.clientHeight
    }

    setDimensions()
    window.addEventListener("resize", setDimensions)

    // Animation function
    const lines = 100
    const animate = () => {
      if (!ctx || !canvas) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (isActive) {
        // Active visualization
        ctx.strokeStyle = "#3b82f6" // Blue color
        ctx.lineWidth = 2

        const lineWidth = canvas.width / lines

        for (let i = 0; i < lines; i++) {
          const x = i * lineWidth

          // Generate a height value based on sine wave and random factor
          const height = isActive ? Math.sin(i * 0.1 + Date.now() * 0.005) * 20 + Math.random() * 15 : 2

          const centerY = canvas.height / 2

          ctx.beginPath()
          ctx.moveTo(x, centerY - height)
          ctx.lineTo(x, centerY + height)
          ctx.stroke()
        }
      } else {
        // Inactive state - flat line
        ctx.strokeStyle = "#9ca3af" // Gray color
        ctx.lineWidth = 2

        ctx.beginPath()
        ctx.moveTo(0, canvas.height / 2)
        ctx.lineTo(canvas.width, canvas.height / 2)
        ctx.stroke()
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    // Start animation
    animate()

    // Cleanup
    return () => {
      window.removeEventListener("resize", setDimensions)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isActive])

  return (
    <div className="relative w-full h-16 bg-background border rounded-md overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  )
}

