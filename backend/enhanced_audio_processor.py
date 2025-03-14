from pyo import *
import threading
import time
import logging

logger = logging.getLogger("audio_processor")

class AudioProcessor:
    """Enhanced audio processor with additional effects"""
    
    def __init__(self):
        self.server = None
        self.is_initialized = False
        self.is_processing = False
        self.is_realtime_processing = False
        self.processing_thread = None
        self.realtime_thread = None
    
    def initialize(self):
        """Initialize the PyO audio server"""
        if self.is_initialized:
            return
            
        try:
            # Create audio server
            self.server = Server(duplex=1).boot()
            
            # Audio input from microphone
            self.mic = Input()
            
            # Phase vocoder for pitch shifting
            self.pv = PVAnal(self.mic)
            self.transp = PVTranspose(self.pv, transpo=1.0)
            
            # Speed control
            #self.speed_control = Control(time=0.1, init=1.0).play()
            
            # Distortion effect
            self.dist = Disto(self.transp, drive=0, slope=0.5)
            
            # Create delay line for echo
            self.delay = Delay(self.dist, delay=0.25, feedback=0)
            
            # Create reverb
            self.reverb = Freeverb(self.delay, size=0.8, damp=0.5, bal=0)
            
            # Final output
            self.output = self.reverb
            
            # Mixer to control when audio is processed
            self.mixer = Mixer(outs=2, chnls=1)
            self.mixer.addInput(0, self.output)
            self.mixer.setAmp(0, 0, 0)  # Start with volume at 0
            self.mixer.setAmp(0, 1, 0)
            self.mixer.out()
            
            self.is_initialized = True
            logger.info("Audio processor initialized")
            
        except Exception as e:
            logger.error(f"Error initializing audio processor: {e}")
    
    def start_processing(self):
        """Start audio processing"""
        if not self.is_initialized:
            self.initialize()
            
        if self.is_processing:
            return
            
        def process_thread():
            try:
                self.server.start()
                # Fade in the volume
                self.mixer.setAmp(0, 0, 1)
                self.mixer.setAmp(0, 1, 1)
                
                # Keep processing until stopped
                while self.is_processing:
                    time.sleep(0.1)
                    
                # Fade out when stopped
                self.mixer.setAmp(0, 0, 0)
                self.mixer.setAmp(0, 1, 0)
                self.server.stop()
                
            except Exception as e:
                logger.error(f"Error in audio processing thread: {e}")
        
        self.is_processing = True
        self.processing_thread = threading.Thread(target=process_thread)
        self.processing_thread.daemon = True
        self.processing_thread.start()
        logger.info("Audio processing started")
    
    def stop_processing(self):
        """Stop audio processing"""
        if self.is_processing:
            self.is_processing = False
            if self.processing_thread:
                self.processing_thread.join(1.0)  # Wait for thread to finish
            logger.info("Audio processing stopped")
    
    def start_realtime_processing(self):
        """Start real-time audio processing for external applications"""
        if not self.is_initialized:
            self.initialize()
            
        if self.is_realtime_processing:
            return
            
        def realtime_thread():
            try:
                # Create virtual audio devices for routing
                logger.info("Setting up virtual audio devices for real-time processing")
                
                # In a real implementation, this would create virtual audio devices
                # and route audio between applications
                
                self.server.start()
                # Set up audio routing
                self.mixer.setAmp(0, 0, 1)
                self.mixer.setAmp(0, 1, 1)
                
                # Keep processing until stopped
                while self.is_realtime_processing:
                    time.sleep(0.1)
                    
                # Clean up when stopped
                self.mixer.setAmp(0, 0, 0)
                self.mixer.setAmp(0, 1, 0)
                self.server.stop()
                
            except Exception as e:
                logger.error(f"Error in real-time processing thread: {e}")
        
        self.is_realtime_processing = True
        self.realtime_thread = threading.Thread(target=realtime_thread)
        self.realtime_thread.daemon = True
        self.realtime_thread.start()
        logger.info("Real-time audio processing started")
    
    def stop_realtime_processing(self):
        """Stop real-time audio processing"""
        if self.is_realtime_processing:
            self.is_realtime_processing = False
            if self.realtime_thread:
                self.realtime_thread.join(1.0)  # Wait for thread to finish
            logger.info("Real-time audio processing stopped")
    
    def cleanup(self):
        """Clean up resources"""
        self.stop_processing()
        self.stop_realtime_processing()
        
        if self.server and self.server.getIsStarted():
            try:
                self.server.stop()
                self.server = None
            except Exception as e:
                logger.error(f"Error stopping server: {e}")
                
        self.is_initialized = False
        logger.info("Audio processor cleaned up")
    
    def set_pitch_shift(self, semitones):
        """Set pitch shift in semitones"""
        if not self.is_initialized:
            return
            
        try:
            # Convert semitones to transposition factor
            factor = 2 ** (semitones / 12.0)
            self.transp.transpo.setValue(factor)
            logger.info(f"Pitch shift set to {semitones} semitones (factor: {factor:.2f})")
        except Exception as e:
            logger.error(f"Error setting pitch shift: {e}")
    
    def set_speed(self, speed):
        """Set playback speed (1.0 = normal)"""
        if not self.is_initialized:
            return
            
        try:
            self.speed_control.setValue(speed)
            logger.info(f"Speed set to {speed}")
        except Exception as e:
            logger.error(f"Error setting speed: {e}")
    
    def set_reverb(self, amount):
        """Set reverb amount (0-1)"""
        if not self.is_initialized:
            return
            
        try:
            # Ensure amount is between 0-1
            amount = max(0, min(1, amount))
            self.reverb.bal.setValue(amount)
            logger.info(f"Reverb set to {amount}")
        except Exception as e:
            logger.error(f"Error setting reverb: {e}")
    
    def set_echo(self, amount):
        """Set echo amount (0-1)"""
        if not self.is_initialized:
            return
            
        try:
            # Ensure amount is between 0-1
            amount = max(0, min(1, amount))
            self.delay.feedback.setValue(amount * 0.8)  # Scale to avoid feedback loops
            logger.info(f"Echo set to {amount}")
        except Exception as e:
            logger.error(f"Error setting echo: {e}")
    
    def set_distortion(self, amount):
        """Set distortion amount (0-1)"""
        if not self.is_initialized:
            return
            
        try:
            # Ensure amount is between 0-1
            amount = max(0, min(1, amount))
            self.dist.drive.setValue(amount * 0.9)  # Scale to avoid extreme distortion
            logger.info(f"Distortion set to {amount}")
        except Exception as e:
            logger.error(f"Error setting distortion: {e}")

