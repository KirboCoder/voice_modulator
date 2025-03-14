import asyncio
import json
import websockets
import sys
import os
import logging
from enhanced_audio_processor import AudioProcessor
from tts_engine import TTSEngine

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("voice_modulator_backend")

# Initialize audio processor and TTS engine
audio_processor = AudioProcessor()
tts_engine = TTSEngine()

# Store connected clients
clients = set()

# Mock audio devices for testing
mock_audio_devices = {
    "inputs": [
        {"id": "default", "name": "Default Microphone"},
        {"id": "mic1", "name": "Built-in Microphone"},
        {"id": "mic2", "name": "External Microphone"}
    ],
    "outputs": [
        {"id": "default", "name": "Default Speaker"},
        {"id": "speaker1", "name": "Built-in Speaker"},
        {"id": "speaker2", "name": "External Speaker"}
    ]
}

async def handle_client(websocket, path):
    """Handle WebSocket connection for a client"""
    client_id = id(websocket)
    logger.info(f"New client connected: {client_id}")
    clients.add(websocket)
    
    try:
        # Send connection confirmation
        await websocket.send(json.dumps({"status": "connected"}))
        
        # Initialize audio processor
        audio_processor.initialize()
        logger.info(f"Audio processor initialized for client: {client_id}")
        
        # Process incoming messages
        async for message in websocket:
            try:
                data = json.loads(message)
                message_type = data.get('type', '')
                logger.info(f"Received message type: {message_type} from client: {client_id}")
                
                if message_type == 'modulator':
                    settings = data.get('settings', {})
                    await handle_modulator_settings(settings, client_id)
                    
                elif message_type == 'tts':
                    action = data.get('action', '')
                    if action == 'play':
                        settings = data.get('settings', {})
                        await handle_tts_request(settings, websocket, client_id)
                        
                elif message_type == 'recording':
                    action = data.get('action', '')
                    if action == 'start':
                        audio_processor.start_processing()
                        await websocket.send(json.dumps({"status": "recording_started"}))
                        logger.info(f"Recording started for client: {client_id}")
                    elif action == 'stop':
                        audio_processor.stop_processing()
                        await websocket.send(json.dumps({"status": "recording_stopped"}))
                        logger.info(f"Recording stopped for client: {client_id}")
                
                elif message_type == 'realtime':
                    action = data.get('action', '')
                    if action == 'start':
                        # Start real-time audio processing for external apps
                        audio_processor.start_realtime_processing()
                        await websocket.send(json.dumps({"status": "realtime_started"}))
                        logger.info(f"Real-time processing started for client: {client_id}")
                    elif action == 'stop':
                        audio_processor.stop_realtime_processing()
                        await websocket.send(json.dumps({"status": "realtime_stopped"}))
                        logger.info(f"Real-time processing stopped for client: {client_id}")
                
                elif message_type == 'system':
                    action = data.get('action', '')
                    if action == 'get_audio_devices':
                        # Send available audio devices
                        await websocket.send(json.dumps({
                            "type": "audio_devices",
                            "inputs": mock_audio_devices["inputs"],
                            "outputs": mock_audio_devices["outputs"]
                        }))
                        logger.info(f"Sent audio devices to client: {client_id}")
                    elif action == 'set_audio_devices':
                        devices = data.get('devices', {})
                        # Set the selected audio devices
                        input_device = devices.get('input', '')
                        output_device = devices.get('output', '')
                        logger.info(f"Set audio devices for client {client_id}: input={input_device}, output={output_device}")
                        
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON from client {client_id}: {e}")
                await websocket.send(json.dumps({"error": "Invalid JSON"}))
            except Exception as e:
                logger.error(f"Error processing message from client {client_id}: {e}")
                await websocket.send(json.dumps({"error": f"Server error: {str(e)}"}))
                
    except websockets.exceptions.ConnectionClosed as e:
        logger.info(f"Client {client_id} disconnected: {e}")
    except Exception as e:
        logger.error(f"Unexpected error with client {client_id}: {e}")
    finally:
        clients.remove(websocket)
        # Cleanup resources
        audio_processor.cleanup()
        logger.info(f"Cleaned up resources for client: {client_id}")

async def handle_modulator_settings(settings, client_id):
    """Update audio processor with new modulation settings"""
    try:
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
        
        logger.info(f"Updated settings for client {client_id}: pitch={pitch}, speed={speed}, reverb={reverb}, echo={echo}, distortion={distortion}")
    except Exception as e:
        logger.error(f"Error updating modulator settings for client {client_id}: {e}")

async def handle_tts_request(settings, websocket, client_id):
    """Process text-to-speech request"""
    try:
        text = settings.get('text', '')
        voice = settings.get('voice', 'default')
        pitch = float(settings.get('pitch', 0))
        speed = float(settings.get('speed', 1.0))
        volume = float(settings.get('volume', 1.0))
        
        if not text:
            await websocket.send(json.dumps({"error": "No text provided"}))
            return
        
        logger.info(f"Generating TTS for client {client_id}: voice={voice}, text='{text[:30]}...'")
        
        # Generate speech
        audio_data = tts_engine.generate_speech(text, voice, pitch, speed, volume)
        
        if audio_data:
            # Send the audio data back to the client
            await websocket.send(json.dumps({
                "type": "tts_audio",
                "audio_data": audio_data
            }))
            logger.info(f"TTS completed for client {client_id}")
        else:
            await websocket.send(json.dumps({"error": "Failed to generate speech"}))
            logger.error(f"TTS generation failed for client {client_id}")
    except Exception as e:
        logger.error(f"Error processing TTS request for client {client_id}: {e}")
        await websocket.send(json.dumps({"error": f"TTS error: {str(e)}"}))

async def main():
    """Run the WebSocket server"""
    host = "localhost"
    port = 8765
    
    logger.info(f"Starting audio processing server on ws://{host}:{port}")
    
    try:
        async with websockets.serve(handle_client, host, port):
            logger.info(f"Server started successfully")
            await asyncio.Future()  # Run forever
    except Exception as e:
        logger.error(f"Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Unhandled exception: {e}")
        sys.exit(1)

