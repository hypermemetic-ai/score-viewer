# Score Viewer compatibility transform version 1. Applied only to the private
# build copy; the pinned vendor inventory and all original license bytes remain
# unchanged. Windows std::filesystem narrow paths use the system code page,
# while sfizz's C API and sample paths are UTF-8. The pinned ghc backend handles
# that contract throughout parsing, sample lookup, and wide-path decoding.
function(piano_windows_utf8_header name expected_sha256)
  set(header "${CMAKE_BINARY_DIR}/vendor/sfizz/external/filesystem/include/ghc/${name}")
  file(SHA256 "${header}" actual_sha256)
  if(NOT actual_sha256 STREQUAL expected_sha256)
    message(FATAL_ERROR "Pinned Windows UTF-8 header drift: ${name}")
  endif()
  file(READ "${header}" original)
  set(selector "#if __has_include(<filesystem>) && (!defined(__MAC_OS_X_VERSION_MIN_REQUIRED) || __MAC_OS_X_VERSION_MIN_REQUIRED >= 101500)")
  string(FIND "${original}" "${selector}" first)
  if(first EQUAL -1)
    message(FATAL_ERROR "Missing Windows UTF-8 selector: ${name}")
  endif()
  string(LENGTH "${selector}" selector_length)
  math(EXPR after "${first} + ${selector_length}")
  string(SUBSTRING "${original}" ${after} -1 remainder)
  string(FIND "${remainder}" "${selector}" second)
  if(NOT second EQUAL -1)
    message(FATAL_ERROR "Ambiguous Windows UTF-8 selector: ${name}")
  endif()
  string(REPLACE "${selector}"
    "#if !defined(_WIN32) && __has_include(<filesystem>) && (!defined(__MAC_OS_X_VERSION_MIN_REQUIRED) || __MAC_OS_X_VERSION_MIN_REQUIRED >= 101500)"
    transformed "${original}")
  file(WRITE "${header}" "${transformed}")
endfunction()

# Definitions, forward declarations, and implementation must select the same
# filesystem types. Mac/Linux retain the unmodified upstream selection.
if(WIN32)
  piano_windows_utf8_header(fs_std.hpp c244c06cd55fccfe1c9757747bf3a8cdb394111936f417ca0d3a3627d22aa0a9)
  piano_windows_utf8_header(fs_std_fwd.hpp da630b2124b8d9992cbcd75f5d70cacf1280b71ab37e30296940659682f61228)
  piano_windows_utf8_header(fs_std_impl.hpp 08e90cbbb334f357fa42d79d6c35995ddb92926625d267e16b5e16e934b06293)
endif()
