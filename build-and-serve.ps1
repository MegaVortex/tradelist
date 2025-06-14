Write-Host "Removing old output..."

if (Test-Path .\public\) {
    try {
        Remove-Item -Recurse -Force .\public\
        Write-Host "Removed 'public' directory."
    } catch {
        Write-Error "Failed to remove 'public' directory: $_"
        exit 1
    }
} else {
    Write-Host "No 'public' directory to remove."
}

Write-Host "Building Eleventy output..."
npx eleventy
if ($LASTEXITCODE -ne 0) {
    Write-Error "Eleventy build failed"
    exit 1
}

Write-Host "Starting Eleventy dev server and backend..."

# Start Eleventy in background
Start-Process -NoNewWindow -FilePath "cmd.exe" -ArgumentList "/c", "npx eleventy --serve"

# Wait briefly to make sure Eleventy starts first
Start-Sleep -Seconds 2

Write-Host "Eleventy started."