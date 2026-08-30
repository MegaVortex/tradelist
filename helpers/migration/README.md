# Migration helper environment

The Google Drive uploader uses a fully resolved Python dependency lock. Create
an isolated environment and require every downloaded artifact to match a
committed SHA-256 hash:

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install --require-hashes -r requirements.txt
```

Run `pictureUploader.py` only after placing the local `credentials.json` beside
the script. That credential file and the resulting OAuth token are ignored by
Git.

To intentionally update dependencies, change the two direct pins in
`requirements.in`, regenerate `requirements.txt` with
`pip-compile --generate-hashes --strip-extras`, review the resolved versions,
and install with `--require-hashes` before committing.
