#include "audio_processor.h"
#include <cstring>
#include <stdexcept>

AudioProcessor::AudioProcessor() : stream(nullptr), pitchShift(0.0f) {
  if (Pa_Initialize() != paNoError) {
    throw std::runtime_error("Failed to initialize PortAudio");
  }
  soundTouch.setChannels(1); // Mono for simplicity
  soundTouch.setSampleRate(44100);
  soundTouch.setTempo(1.0);
}

AudioProcessor::~AudioProcessor() {
  stop();
  Pa_Terminate();
}

void AudioProcessor::start() {
  PaError err = Pa_OpenDefaultStream(&stream, 1, 1, paFloat32, 44100, 256, paCallback, this);
  if (err != paNoError) throw std::runtime_error("Failed to open stream");
  err = Pa_StartStream(stream);
  if (err != paNoError) throw std::runtime_error("Failed to start stream");
}

void AudioProcessor::stop() {
  if (stream) {
    Pa_StopStream(stream);
    Pa_CloseStream(stream);
    stream = nullptr;
  }
}

void AudioProcessor::setPitchShift(float semitones) {
  pitchShift = semitones;
}

int AudioProcessor::paCallback(const void* inputBuffer, void* outputBuffer, unsigned long framesPerBuffer,
                               const PaStreamCallbackTimeInfo* timeInfo, PaStreamCallbackFlags statusFlags, void* userData) {
  AudioProcessor* self = static_cast<AudioProcessor*>(userData);
  const float* in = static_cast<const float*>(inputBuffer);
  float* out = static_cast<float*>(outputBuffer);
  return self->processAudio(in, out, framesPerBuffer);
}

int AudioProcessor::processAudio(const float* input, float* output, unsigned long frames) {
  soundTouch.setPitchSemiTones(pitchShift);
  soundTouch.putSamples(input, frames);
  int numSamples = soundTouch.receiveSamples(output, frames);
  if (numSamples < frames) {
    memset(output + numSamples, 0, (frames - numSamples) * sizeof(float));
  }
  return paContinue;
}

// pybind11 binding
#include <pybind11/pybind11.h>
namespace py = pybind11;

PYBIND11_MODULE(audio_engine, m) {
  py::class_<AudioProcessor>(m, "AudioProcessor")
    .def(py::init<>())
    .def("start", &AudioProcessor::start)
    .def("stop", &AudioProcessor::stop)
    .def("set_pitch_shift", &AudioProcessor::setPitchShift);
}