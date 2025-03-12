#ifndef AUDIO_PROCESSOR_H
#define AUDIO_PROCESSOR_H

#include <portaudio.h>
#include <soundtouch/SoundTouch.h>

class AudioProcessor {
public:
  AudioProcessor();
  ~AudioProcessor();
  void start();
  void stop();
  void setPitchShift(float semitones);

private:
  PaStream* stream;
  soundtouch::SoundTouch soundTouch;
  float pitchShift;
  static int paCallback(const void* inputBuffer, void* outputBuffer, unsigned long framesPerBuffer,
                        const PaStreamCallbackTimeInfo* timeInfo, PaStreamCallbackFlags statusFlags, void* userData);
  int processAudio(const float* input, float* output, unsigned long frames);
};

#endif // AUDIO_PROCESSOR_H