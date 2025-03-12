cmake_minimum_required(VERSION 3.10)
project(audio_engine)

# Find dependencies
find_package(PortAudio REQUIRED)
find_package(pybind11 REQUIRED)
# Note: SoundTouch must be installed manually or included as a submodule

add_library(audio_engine MODULE audio_processor.cpp)
target_include_directories(audio_engine PRIVATE ${PORTAUDIO_INCLUDE_DIRS} ${SOUNDTOUCH_INCLUDE_DIRS})
target_link_libraries(audio_engine PRIVATE ${PORTAUDIO_LIBRARIES} SoundTouch pybind11::module)
set_target_properties(audio_engine PROPERTIES PREFIX "" SUFFIX ".pyd") # .pyd for Windows