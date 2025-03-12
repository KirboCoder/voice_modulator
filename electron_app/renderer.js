const slider = document.getElementById('pitch-slider');
const ws = new WebSocket('ws://localhost:8765');

ws.onopen = () => console.log('Connected to backend');
ws.onerror = (error) => console.error('WebSocket error:', error);

slider.addEventListener('input', () => {
  const value = parseFloat(slider.value);
  ws.send(JSON.stringify({ pitch_shift: value }));
});