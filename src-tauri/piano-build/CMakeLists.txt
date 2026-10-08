cmake_minimum_required(VERSION 3.19)
cmake_policy(SET CMP0091 NEW)
project(score_viewer_piano LANGUAGES C CXX)
set(CMAKE_CXX_STANDARD 17 CACHE STRING "" FORCE)
set(CMAKE_BUILD_TYPE Release CACHE STRING "" FORCE)
foreach(option SFIZZ_JACK SFIZZ_RENDER SFIZZ_BENCHMARKS SFIZZ_TESTS SFIZZ_DEMOS SFIZZ_DEVTOOLS SFIZZ_SHARED SFIZZ_USE_SNDFILE SFIZZ_GIT_SUBMODULE_CHECK SFIZZ_RECOMPILE_FAUST ENABLE_LTO BUILD_TESTING SFIZZ_USE_SYSTEM_ABSEIL SFIZZ_USE_SYSTEM_GHC_FS SFIZZ_USE_SYSTEM_SIMDE SFIZZ_USE_SYSTEM_KISS_FFT SFIZZ_USE_SYSTEM_PUGIXML SFIZZ_USE_SYSTEM_CXXOPTS SFIZZ_USE_SYSTEM_CATCH SFIZZ_ASAN SFIZZ_PROFILE_BUILD)
  set(${option} OFF CACHE BOOL "" FORCE)
endforeach()
set(CMAKE_DISABLE_FIND_PACKAGE_OpenMP ON CACHE BOOL "" FORCE)
# Accurate Salamander uses PCM WAV, not WavPack. Keep the unused optional
# decoder portable across MSVC and both Mac slices without assembler tooling.
set(WAVPACK_ENABLE_ASM OFF CACHE BOOL "" FORCE)
# Upstream generates Config.h inside its source directory. Work on an exact
# private build copy so compilation never mutates the verified source closure.
file(REMOVE_RECURSE "${CMAKE_BINARY_DIR}/vendor/sfizz")
file(COPY "${CMAKE_CURRENT_SOURCE_DIR}/../vendor/sfizz" DESTINATION "${CMAKE_BINARY_DIR}/vendor")
add_subdirectory("${CMAKE_BINARY_DIR}/vendor/sfizz" sfizz-build EXCLUDE_FROM_ALL)

# sfizz normally selects /MT. Rust's ordinary Windows target uses /MD; keep
# every C++ archive on that same CRT. A crt-static Rust build explicitly uses /MT.
function(piano_runtime directory)
  get_property(targets DIRECTORY "${directory}" PROPERTY BUILDSYSTEM_TARGETS)
  foreach(target IN LISTS targets)
    get_target_property(type "${target}" TYPE)
    if(type STREQUAL "STATIC_LIBRARY" OR type STREQUAL "OBJECT_LIBRARY")
      set_property(TARGET "${target}" PROPERTY MSVC_RUNTIME_LIBRARY "${PIANO_MSVC_RUNTIME}")
    endif()
  endforeach()
  get_property(children DIRECTORY "${directory}" PROPERTY SUBDIRECTORIES)
  foreach(child IN LISTS children)
    piano_runtime("${child}")
  endforeach()
endfunction()
if(MSVC)
  piano_runtime("${CMAKE_CURRENT_SOURCE_DIR}")
  set(bundle "${CMAKE_BINARY_DIR}/piano/score_viewer_piano.lib")
else()
  set(bundle "${CMAKE_BINARY_DIR}/piano/libscore_viewer_piano.a")
endif()
add_custom_command(OUTPUT "${bundle}"
  COMMAND "${CMAKE_COMMAND}" "-DROOT=${CMAKE_BINARY_DIR}" "-DOUTPUT=${bundle}" "-DAR=${CMAKE_AR}" "-DMSVC_BUILD=${MSVC}" "-DAPPLE_BUILD=${APPLE}" -P "${CMAKE_CURRENT_SOURCE_DIR}/bundle.cmake"
  DEPENDS sfizz_static "${CMAKE_CURRENT_SOURCE_DIR}/bundle.cmake"
  VERBATIM)
add_custom_target(piano_bundle ALL DEPENDS "${bundle}")
