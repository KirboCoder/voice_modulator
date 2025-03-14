from pyo import *
import threading
import time

class AudioProcessor:
    """Enhanced audio processor with additional effects"""
    
    def __init__(self):
        self.server = None
        self.is_initialized = False
        self.is_processing = False
        self.processing_thread = None
    
    def initialize(self):
        """Initialize the PyO audio server"""
        if self.is_initialized:
            return
            
        try:
            self.server = Server(duplex=1).boot()
            # List available devices for debugging
            print("Available audio devices:")
            for i in range(Pa_GetDeviceCount()):
                dev = Pa_GetDeviceInfo(i)
                print(f"{i}: {dev['name']}")
            # Set output to VB-CABLE Input (adjust index based on your system)
            virtual_cable_index = 1  # Example: replace with your VB-CABLE Input index
            self.server.setOutputDevice(virtual_cable_index)
            
            self.mic = Input()
            self.pv = PVAnal(self.mic)
            self.transp = PVTransp(self.pv, transpo=1.0)
            self.speed_control = PVTimeStretch(self.transp, stretch=1.0)
            self.dist = Disto(self.speed_control, drive=0, slope=0.5)
            self.delay = Delay(self.dist, delay=0.25, feedback=0)
            self.reverb = Freeverb(self.delay, size=0.8, damp=0.5, bal=0)
            self.output = self.reverb
            
            self.mixer = Mixer(outs=2, chnls=1)
            self.mixer.addInput(0, self.output)
            self.mixer.setAmp(0, 0, 0)
            self.mixer.setAmp(0, 1, 0)
            self.mixer.out()
            
            self.is_initialized = True
            print("Audio processor initialized")
            
        except Exception as e:
            print(f"Error initializing audio processor: {e}")
    
    def start_processing(self):
        """Start audio processing"""
        if not self.is_initialized:
            self.initialize()
            
        if self.is_processing:
            return
            
        def process_thread():
            try:
                self.server.start()
                self.mixer.setAmp(0, 0, 1)
                self.mixer.setAmp(0, 1, 1)
                print("Audio server started, processing audio")
                while self.is_processing:
                    time.sleep(0.1)
                self.mixer.setAmp(0, 0, 0)
                self.mixer.setAmp(0, 1, 0)
                self.server.stop()
                print("Audio server stopped")
                
            except Exception as e:
                print(f"Error in audio processing thread: {e}")
        
        self.is_processing = True
        self.processing_thread = threading.Thread(target=process_thread)
        self.processing_thread.daemon = True
        self.processing_thread.start()
        print("Audio processing started")
    
    def stop_processing(self):
        """Stop audio processing"""
        if self.is_processing:
            self.is_processing = False
            if self.processing_thread:
                self.processing_thread.join(1.0)
            print("Audio processing stopped")
    
    def cleanup(self):
        """Clean up resources"""
        self.stop_processing()
        if self.server and self.server.getIsStarted():
            self.server.stop()
            self.server = None
        self.is_initialized = False
        print("Audio processor cleaned up")
    
    def set_pitch_shift(self, semitones):
        """Set pitch shift in semitones"""
        if not self.is_initialized:
            return
        factor = 2 ** (semitones / 12.0)
        self.transp.transpo.setValue(factor)
        print(f"Pitch shift set to {semitones} semitones (factor: {factor:.2f})")
    
    def set_speed(self, speed):
        """Set playback speed (1.0 = normal)"""
        if not self.is_initialized:
            return
        stretch = 1 / speed if speed > 0 else 1.0
        self.speed_control.stretch.setValue(stretch)
        print(f"Speed set to {speed} (stretch: {stretch})")
    
    def set_reverb(self, amount):
        """Set reverb amount (0-1)"""
        if not self.is_initialized:
            return
        amount = max(0, min(1, amount))
        self.reverb.bal.setValue(amount)
        print(f"Reverb set to {amount}")
    
    def set_echo(self, amount):
        """Set echo amount (0-1)"""
        if not self.is_initialized:
            return
        amount = max(0, min(1, amount))
        self.delay.feedback.setValue(amount * 0.8)
        print(f"Echo set to {amount}")
    
    def set_distortion(self, amount):
        """Set distortion amount (0-1)"""
        if not self.is_initialized:
            return
        amount = max(0, min(1, amount))
        self.dist.drive.setValue(amount * 0.9)
        print(f"Distortion set to {amount}")