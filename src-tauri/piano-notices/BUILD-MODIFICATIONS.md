# Score Viewer Windows filesystem compatibility modification

Compatibility transform version 1, 2026-10-08.

Score Viewer embeds Dusk-Fizz/sfizz revision
`f3ac7c0ae830104ae3bc8979dc2ed9fff939a926`, with ghc::filesystem revision
`8a2edd6d92ed820521d42c94d179462bf06b5ed3`. The original vendored files and
their source provenance remain byte-exact. The original filesystem copyright
and MIT license are included at `external/filesystem/LICENSE` in this notice
directory and remain in every transformed header.

For Windows builds only, `piano-build/windows-utf8.cmake` modifies three
filesystem-selection headers in a private build copy. It adds
`!defined(_WIN32)` to the standard-filesystem selector, consistently selecting
the existing pinned ghc UTF-8 backend for definitions, forward declarations,
and implementation. This corrects the mismatch between sfizz's UTF-8 C API and
Windows standard-filesystem narrow paths, which use the system code page.
The pinned fallback retains UTF-8 narrow strings and opens native wide paths
throughout SFZ parsing, sample lookup, and built-in decoding. Mac and Linux
selection remains unchanged. No sample file or synthesis algorithm is changed.

The transform verifies each original SHA256 and exactly one matching selector
before writing. Transform source SHA256:
`12efaa994d9bc54108475957409c8fc016117421d674fb8bf4d5db60f2c53a43`.
Paths below are relative to `external/filesystem/include/ghc/`.

| Header | Original SHA256 | Windows build-copy SHA256 |
| --- | --- | --- |
| fs_std.hpp | c244c06cd55fccfe1c9757747bf3a8cdb394111936f417ca0d3a3627d22aa0a9 | a55c379f65718ad0a47875ebce859e89b7e67ac896924df0d79afaf7e50bd898 |
| fs_std_fwd.hpp | da630b2124b8d9992cbcd75f5d70cacf1280b71ab37e30296940659682f61228 | efe912c0ab93c9192a14203f859e8dc88f2b85e9b59e654e6859ffa1a35039cc |
| fs_std_impl.hpp | 08e90cbbb334f357fa42d79d6c35995ddb92926625d267e16b5e16e934b06293 | 2a2cb53eb1608d890974850b42f60e64ccb928a1cd76a20daf00146525904273 |
