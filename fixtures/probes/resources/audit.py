"""Native archive audit; no extraction and no bespoke archive parser."""
import hashlib, io, json, pathlib, re, stat, subprocess, sys, tarfile, zipfile
root = pathlib.Path(sys.argv[1])
result = []
ARCHIVE_MIME = {'application/gzip', 'application/x-gzip', 'application/x-bzip2', 'application/x-xz', 'application/x-lzip', 'application/x-lzma', 'application/x-7z-compressed', 'application/x-rar', 'application/vnd.rar', 'application/x-tar', 'application/zstd', 'application/x-lz4'}
def archive_mime(path=None, data=None):
    # libmagic is an established format detector; it also recognizes renamed carriers.
    args = ['file', '--mime-type', '--brief', '--', str(path)] if path else ['file', '--mime-type', '--brief', '-']
    return subprocess.run(args, input=data, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True).stdout.decode().strip() in ARCHIVE_MIME
for path in sorted(root.rglob('*')):
    if not path.is_file():
        continue
    if not zipfile.is_zipfile(path):
        if tarfile.is_tarfile(path) or archive_mime(path=path) or path.suffix.lower() in {'.zip', '.gz', '.tgz', '.bz2', '.xz', '.7z', '.rar', '.tar'}:
            raise ValueError(f'UNSUPPORTED_ARCHIVE {path}')
        continue
    entries, seen, total = [], set(), 0
    with zipfile.ZipFile(path) as archive:
        if len(archive.infolist()) > 10000:
            raise ValueError('ZIP_ENTRY_LIMIT')
        for info in archive.infolist():
            name = info.orig_filename
            parts = name.rstrip('/').split('/')
            if '\x00' in name or '\\' in name or name.startswith('/') or re.match(r'^[a-zA-Z]:', name) or any(p in {'', '.', '..'} for p in parts):
                raise ValueError(f'UNSAFE_ZIP_NAME {name!r}')
            normalized = '/'.join(parts)
            if normalized in seen:
                raise ValueError(f'DUPLICATE_ZIP_NAME {normalized}')
            seen.add(normalized)
            mode = info.external_attr >> 16
            if stat.S_ISLNK(mode) or (stat.S_IFMT(mode) and not (stat.S_ISREG(mode) or stat.S_ISDIR(mode))):
                raise ValueError(f'UNSUPPORTED_ZIP_ENTRY {name}')
            total += info.file_size
            if info.file_size > 128 * 1024 * 1024 or total > 512 * 1024 * 1024:
                raise ValueError('ZIP_SIZE_LIMIT')
            if info.is_dir():
                continue
            data = archive.read(info)
            if len(data) != info.file_size:
                raise ValueError('ZIP_SIZE_MISMATCH')
            if zipfile.is_zipfile(io.BytesIO(data)) or tarfile.is_tarfile(io.BytesIO(data)) or archive_mime(data=data) or pathlib.PurePosixPath(name).suffix.lower() in {'.zip', '.gz', '.tgz', '.bz2', '.xz', '.7z', '.rar', '.tar'}:
                raise ValueError(f'UNSUPPORTED_NESTED_ARCHIVE {name}')
            entries.append({'path': normalized, 'sha256': hashlib.sha256(data).hexdigest(), 'size': len(data)})
    result.append({'path': path.relative_to(root).as_posix(), 'entries': entries})
print(json.dumps(result))
