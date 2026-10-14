"""Create a fresh portable ZIP; preserve executable modes and reject symlinks."""
from pathlib import Path
import sys, zipfile
source, output = map(Path, sys.argv[1:])
if output.exists():
    raise RuntimeError('Recipient archive already exists')
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED, compresslevel=6, strict_timestamps=False) as archive:
    for path in sorted(source.rglob('*')):
        if path.is_symlink():
            raise RuntimeError(f'Symlink in recipient package: {path}')
        if path.is_file():
            archive.write(path, path.relative_to(source).as_posix())
with zipfile.ZipFile(output) as archive:
    if archive.testzip() is not None:
        raise RuntimeError('Recipient ZIP CRC check failed')
