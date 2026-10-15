#!/usr/bin/env python3
"""Проверить перенос целых пакетов после установки Core по commit или tag."""
from pathlib import Path
import re
import shlex
import shutil
import subprocess
import tempfile
import textwrap
import unittest

ROOT = Path(__file__).resolve().parents[1]
PACKAGES = ('course-core', 'course-presentation', 'course-navigation')
INSTALL = (ROOT / 'Taskfile.yml').read_text().split('  fetch:', 1)[0]
COMMANDS = [textwrap.dedent(block).strip() for block in
            re.findall(r'^    - cmd: \|\n((?:        .+\n)+)', INSTALL, re.M)]


class InstallLayout(unittest.TestCase):
    def run_layout(self, shape):
        self.assertEqual(len(COMMANDS), 2, 'Expected both install normalization commands')
        exercised = 0
        for command in COMMANDS:
            windows = command.startswith('powershell ')
            runner = (shutil.which('pwsh') or shutil.which('powershell')) if windows else shutil.which('sh')
            if not runner:
                continue
            exercised += 1
            with self.subTest(shell='PowerShell' if windows else 'sh', shape=shape):
                with tempfile.TemporaryDirectory(prefix='template-install-layout-') as temp:
                    root = Path(temp)
                    for package in PACKAGES:
                        target = root / '_extensions/Afonenko-Course-Tools' / package
                        if shape != 'missing':
                            target.mkdir(parents=True)
                            (target / '_extension.yml').write_text('version: 7.0.0\n')
                            (target / 'payload.txt').write_text('installed' if shape == 'tag' else 'obsolete')
                        if shape == 'commit':
                            source = root / '_extensions' / package
                            source.mkdir(parents=True)
                            (source / '_extension.yml').write_text('version: 7.0.0\n')
                            (source / 'payload.txt').write_text('installed')
                    argv = shlex.split(command) if windows else [runner, '-c', command]
                    if windows:
                        argv[0] = runner
                    result = subprocess.run(argv, cwd=root, text=True, capture_output=True)
                    if shape == 'missing':
                        self.assertNotEqual(result.returncode, 0)
                    else:
                        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
                        for package in PACKAGES:
                            target = root / '_extensions/Afonenko-Course-Tools' / package
                            self.assertEqual((target / 'payload.txt').read_text(), 'installed')
                            self.assertEqual((target / '_extension.yml').read_text(), 'version: 7.0.0\n')
                            self.assertFalse((root / '_extensions' / package).exists())

        if not exercised:
            self.skipTest('Neither sh nor PowerShell is available')

    def test_taskfile_parses_with_task(self):
        task = shutil.which('task')
        if not task:
            self.skipTest('Task is not available')
        result = subprocess.run([task, '--list'], cwd=ROOT, text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_preserves_namespaced_tag_installation(self):
        self.run_layout('tag')

    def test_replaces_old_package_with_complete_flat_installation(self):
        self.run_layout('commit')

    def test_rejects_missing_package(self):
        self.run_layout('missing')


if __name__ == '__main__':
    unittest.main()
