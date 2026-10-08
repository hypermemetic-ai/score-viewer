# dusk-fizz

Dusk Audio's SFZ and SoundFont sampler engine: a maintained hard fork of
[sfizz](https://github.com/sfztools/sfizz), which was archived by its owners
on 2026-06-21. This repository is the engine's home going forward. It powers
the multisample instrument in [Dusk Studio](https://github.com/dusk-audio/dusk-studio),
which consumes it as the `external/sfizz` submodule, built library-only.

The code keeps its upstream names and namespaces (`sfz::`, `libsfizz`), and
the original BSD-2-Clause license and copyright are preserved in full. Credit
for the engine's design and the overwhelming majority of its code belongs to
the sfizz authors and contributors.

## Branches

- `dusk-studio` (default): the maintained line. Everything Dusk Studio ships
  is on this branch, including the portability patches and fixes made since
  the fork.
- `master`, `develop`: the upstream lines exactly as they stood when upstream
  was archived. Frozen, kept for reference.

The pre-fork history also survives unmodified in the archived
[dusk-audio/sfizz](https://github.com/dusk-audio/sfizz) mirror, which older
Dusk Studio commits still reference as their submodule URL.

## Scope

This fork is maintained for Dusk Studio's needs: the static library, the SFZ
and SF2 paths it exercises, and correctness fixes with regression tests. The
upstream JACK client, render tool, and plugin targets are still present and
still build, but they are not exercised or maintained here.

## Building

Same as upstream:

```sh
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j
```

Tests build with `-DSFIZZ_TESTS=ON` and run through ctest from an in-tree
build directory (the harness locates `tests/TestFiles` by walking up from
its working directory):

```sh
ctest --test-dir build --output-on-failure
```

## License

BSD-2-Clause, unchanged from upstream. See [LICENSE](LICENSE) and
[AUTHORS.md](AUTHORS.md).
