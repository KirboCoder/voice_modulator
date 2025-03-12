import asyncio
import websockets
import json
from audio_engine import AudioProcessor

processor = AudioProcessor()

async def handle_client(websocket, path):
  processor.start()
  try:
    async for message in websocket:
      data = json.loads(message)
      semitones = float(data.get('pitch_shift', 0.0))
      processor.set_pitch_shift(semitones)
  except Exception as e:
    print(f"Error: {e}")
  finally:
    processor.stop()

async def main():
  async with websockets.serve(handle_client, "localhost", 8765):
    await asyncio.Future()  # Run forever

if __name__ == "__main__":
  asyncio.run(main())