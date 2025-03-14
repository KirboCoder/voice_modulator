import asyncio
import json
import websockets
from enhanced_audio_processor import AudioProcessor
from tts_engine import TTSEngine

audio_processor = AudioProcessor()
tts_engine = TTSEngine()

clients = set()

async def handle_client(websocket, path):
    """Handle WebSocket connection for a client"""
    clients.add(websocket)
    try:
        await websocket.send(json.dumps({"status": "connected"}))
        
        # Initialize audio processor
        audio_processor.initialize()
        
        async for message in websocket:
            try:
                data = json.loads(message)
                message_type = data.get('type', '')
                print(f"Received message: {data}")  # Debugging
                
                if message_type == 'modulator':
                    settings = data.get('settings', {})
                    await handle_modulator_settings(settings)
                    
                elif message_type == 'tts':
                    action = data.get('action', '')
                    if action == 'play':
                        settings = data.get('settings', {})
                        await handle_tts_request(settings, websocket)
                        
                elif message_type == 'recording':
                    action = data.get('action', '')
                    if action == 'start':
                        audio_processor.start_processing()
                        await websocket.send(json.dumps({"status": "recording_started"}))
                    elif action == 'stop':
                        audio_processor.stop_processing()
                        await websocket.send(json.dumps({"status": "recording_stopped"}))
            
            except json.JSONDecodeError:
                print("Error: Invalid JSON")
                await websocket.send(json.dumps({"error": "Invalid JSON"}))
                
    except websockets.exceptions.ConnectionClosed:
        print("Client disconnected")
    finally:
        clients.remove(websocket)
        audio_processor.cleanup()

async def handle_modulator_settings(settings):
    """Update audio processor with new modulation settings"""
    pitch = float(settings.get('pitch', 0))
    speed = float(settings.get('speed', 1.0))
    reverb = float(settings.get('reverb', 0))
    echo = float(settings.get('echo', 0))
    distortion = float(settings.get('distortion', 0))
    
    audio_processor.set_pitch_shift(pitch)
    audio_processor.set_speed(speed)
    audio_processor.set_reverb(reverb)
    audio_processor.set_echo(echo)
    audio_processor.set_distortion(distortion)
    
    print(f"Updated settings: pitch={pitch}, speed={speed}, reverb={reverb}, echo={echo}, distortion={distortion}")

async def handle_tts_request(settings, websocket):
    """Process text-to-speech request"""
    text = settings.get('text', '')
    voice = settings.get('voice', 'default')
    pitch = float(settings.get('pitch', 0))
    speed = float(settings.get('speed', 1.0))
    volume = float(settings.get('volume', 1.0))
    
    if not text:
        await websocket.send(json.dumps({"error": "No text provided"}))
        return
    
    success = tts_engine.generate_speech(text, voice, pitch, speed, volume)
    
    if success:
        await websocket.send(json.dumps({"status": "tts_completed"}))
    else:
        await websocket.send(json.dumps({"error": "Failed to generate speech"}))

async def main():
    """Run the WebSocket server"""
    print("Starting audio processing server on ws://localhost:8765")
    async with websockets.serve(handle_client, "localhost", 8765):
        await asyncio.Future()  # Run forever

if __name__ == "__main__":
    asyncio.run(main())