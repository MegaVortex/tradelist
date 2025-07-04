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

Write-Host "Building Eleventy for development..."

# This command will now succeed because "build:dev" exists in your website's package.json
npm run build:dev
if ($LASTEXITCODE -ne 0) {
    Write-Error "Eleventy build failed"
    exit 1
}

Write-Host "Starting Eleventy dev server in the background..."

$arguments = "/c", "npm run serve:dev"
Start-Process -FilePath "cmd.exe" -ArgumentList $arguments -NoNewWindow

Write-Host "Eleventy should be running. Check the console for the local URL."