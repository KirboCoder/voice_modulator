import pyttsx3
import threading

class TTSEngine:
    """Text-to-Speech engine with voice customization"""
    
    def __init__(self):
        self.engine = pyttsx3.init()
        self.playing = False
    
    def generate_speech(self, text, voice="default", pitch=0, speed=1.0, volume=1.0):
        """Generate and play speech from text with customized voice settings"""
        try:
            # Set properties
            self.engine.setProperty('rate', int(200 * speed))
            self.engine.setProperty('volume', volume)
            # Map voice settings to available voices (platform-dependent)
            voices = self.engine.getProperty('voices')
            voice_map = {
                "default": voices[0].id,
                "male": voices[0].id,  # Adjust based on available voices
                "female": voices[1].id if len(voices) > 1 else voices[0].id,
                "robotic": voices[0].id,  # No direct robotic voice; modulation can handle this
                "whisper": voices[0].id   # No direct whisper; adjust volume instead
            }
            self.engine.setProperty('voice', voice_map.get(voice, voices[0].id))
            
            # Note: pyttsx3 doesn't support pitch directly; modulation must be done separately
            self.playing = True
            self.engine.say(text)
            self.engine.runAndWait()
            self.playing = False
            print(f"Speech generated: '{text}' with voice={voice}, speed={speed}, volume={volume}")
            return True
        except Exception as e:
            print(f"Error generating speech: {e}")
            self.playing = False
            return False