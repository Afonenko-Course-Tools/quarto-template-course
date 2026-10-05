"""Точное machine-owned доказательство native HTML dependency; без libdir догадок."""
import hashlib
import json
import pathlib
import re
import sys
from html.parser import HTMLParser
from urllib.parse import unquote, urlsplit

stage = pathlib.Path(sys.argv[1]).resolve(strict=True)
records = json.loads(pathlib.Path(sys.argv[2]).read_text())
witnesses = []

def fail(code, value):
    raise ValueError(f'{code}: {value}')

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def contained(root, path, code):
    if not path.is_relative_to(root):
        fail(code, path)
    cursor = root
    for part in path.relative_to(root).parts:
        cursor = cursor / part
        if cursor.is_symlink():
            fail('RUNTIME_SYMLINK_UNSUPPORTED', cursor)
    return path

for record in records:
    source_root = pathlib.Path(record['root']).resolve(strict=True)
    descriptor = contained(source_root, pathlib.Path(record['declarationPath']), 'RUNTIME_SOURCE_OUTSIDE')
    registration = contained(source_root, pathlib.Path(record['entrypoint']), 'RUNTIME_SOURCE_OUTSIDE')
    if digest(descriptor) != record['declarationSha256'] or digest(registration) != record['entrypointSha256']:
        fail('RUNTIME_PRODUCER_CHANGED', record['namespace'])
    declaration = json.loads(descriptor.read_text())
    if declaration['name'] != record['provider']:
        fail('RUNTIME_PROVIDER_CHANGED', record['namespace'])
    assets = {}
    for field, kind in [('scripts','script'),('stylesheets','stylesheet')]:
        for asset in declaration.get(field, []):
            if not isinstance(asset, dict) or not isinstance(asset.get('path'), str):
                fail('RUNTIME_DECLARATION_UNSUPPORTED', asset)
            name = asset['path']
            markers = asset.get('attribs', {})
            if name in assets or markers.get('data-course-runtime-provider') != record['provider'] or markers.get('data-course-runtime-asset') != name:
                fail('RUNTIME_DECLARATION_UNSUPPORTED', name)
            identity = next((item for item in record['assets'] if item['path'] == name and item['kind'] == kind), None)
            if identity is None:
                fail('RUNTIME_DECLARATION_UNPROVEN', name)
            path = contained(source_root, pathlib.Path(identity['source']), 'RUNTIME_SOURCE_OUTSIDE')
            if digest(path) != identity['sha256']:
                fail('RUNTIME_SOURCE_CHANGED', path)
            assets[name] = {**identity, 'kind':kind}
    if len(assets) != len(record['assets']):
        fail('RUNTIME_DECLARATION_UNPROVEN', record['namespace'])
    member_stage = contained(stage, (stage / record['mount']).resolve(), 'RUNTIME_OUTSIDE_MEMBER')

    class RuntimeParser(HTMLParser):
        def __init__(self, document):
            super().__init__(convert_charrefs=True)
            self.document = document
            self.seen = set()
            self.has_base = False
        def handle_starttag(self, tag, attrs):
            attributes = dict(attrs)
            if tag == 'base' and 'href' in attributes:
                self.has_base = True
            provider, name = attributes.get('data-course-runtime-provider'), attributes.get('data-course-runtime-asset')
            if provider is None and name is None:
                return
            if len(attributes) != len(attrs):
                fail('RUNTIME_AMBIGUOUS_ATTRIBUTES', self.document)
            if provider != record['provider'] or name not in assets:
                fail('RUNTIME_UNKNOWN_ASSET', name)
            if name in self.seen:
                fail('RUNTIME_DUPLICATE_ASSET', name)
            self.seen.add(name)
            asset = assets[name]
            expected_tag, attribute = ('script','src') if asset['kind'] == 'script' else ('link','href')
            if tag != expected_tag or (tag == 'link' and 'stylesheet' not in attributes.get('rel', '').lower().split()):
                fail('RUNTIME_TAG_KIND', name)
            href = attributes.get(attribute)
            if not isinstance(href, str) or not href:
                fail('RUNTIME_HREF_MISSING', name)
            url = urlsplit(href)
            if url.scheme or url.netloc:
                fail('RUNTIME_EXTERNAL_UNSUPPORTED', href)
            decoded = unquote(url.path, errors='strict')
            if '\x00' in decoded or '\\' in decoded or decoded.startswith('/') or re.match(r'^[a-zA-Z]:', decoded):
                fail('RUNTIME_PATH_UNSUPPORTED', href)
            destination = (self.document.parent / decoded).resolve()
            # Check the lexical path for symlinks before resolve can hide them.
            lexical = pathlib.Path(self.document.parent / decoded)
            cursor = pathlib.Path(lexical.anchor)
            for part in lexical.parts[1:]:
                cursor = cursor / part
                if cursor.is_symlink():
                    fail('RUNTIME_SYMLINK_UNSUPPORTED', cursor)
            contained(member_stage, destination, 'RUNTIME_OUTSIDE_MEMBER')
            if not destination.is_file() or digest(destination) != asset['sha256']:
                fail('RUNTIME_OUTPUT_CHANGED', destination)
            witnesses.append({'member':record['namespace'], 'document':self.document.relative_to(stage).as_posix(), 'documentSha256':digest(self.document), 'tag':tag, 'attribute':attribute, 'href':href, 'destination':destination.relative_to(stage).as_posix(), 'source':asset['source'], 'sha256':asset['sha256'], 'provider':provider, 'asset':name, 'kind':asset['kind'], 'declarationHash':record['declarationSha256']})
        def handle_startendtag(self, tag, attrs):
            self.handle_starttag(tag, attrs)

    for document in sorted(member_stage.rglob('*.html')):
        contained(member_stage, document, 'RUNTIME_OUTSIDE_MEMBER')
        parser = RuntimeParser(document)
        parser.feed(document.read_text())
        parser.close()
        if parser.has_base and parser.seen:
            fail('RUNTIME_BASE_UNSUPPORTED', document)
print(json.dumps(witnesses))
