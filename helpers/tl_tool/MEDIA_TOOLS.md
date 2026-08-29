# Media toolchain

The Electron helper downloads a matched FFmpeg/FFprobe Windows x64 build during
`npm install`. No system FFmpeg installation or environment-variable setup is
required.

The source is Gyan's essentials build, which is one of the Windows binary
providers linked from <https://ffmpeg.org/download.html>. The exact archive URL,
version, maximum size, and SHA-256 digest are pinned in `media-tools.json`.
Downloaded executables are kept in the ignored `vendor/media-tools` directory;
the archive's GPLv3 license is copied alongside them.

Runtime media parsing uses exact executable paths and argument arrays. It does
not invoke a shell, inherit `PATH` or application credentials, or permit media
inputs to use network protocols. Probe/decode time, subprocess output, input
analysis, individual allocations, and decoder threads are bounded.

To update the toolchain:

1. Select a stable essentials ZIP from Gyan's build page.
2. Update every pinned field in `media-tools.json` from its `.sha256` sidecar.
3. Run `npm run install:media-tools` and `npm run check:media-tools`.
4. Run `npm run test:security` and the Electron smoke test with a real MKV.

