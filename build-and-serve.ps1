# build-and-serve.ps1

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
npx eleventy --output public/tradelist
if ($LASTEXITCODE -ne 0) {
    Write-Error "Eleventy build failed"
    exit 1
}

Write-Host "Starting Eleventy server..."
npx eleventy --serve