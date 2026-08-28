$repositoryRoot = $PSScriptRoot

Push-Location -LiteralPath $repositoryRoot
try {
    Write-Host "Building Eleventy for development..."
    npm run build:dev
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Eleventy build failed"
        exit 1
    }

    Write-Host "Starting Eleventy dev server in the background..."
    $arguments = "/c", "npm run serve:dev"
    Start-Process `
        -FilePath "cmd.exe" `
        -ArgumentList $arguments `
        -WorkingDirectory $repositoryRoot `
        -NoNewWindow

    Write-Host "Eleventy should be running. Check the console for the local URL."
} finally {
    Pop-Location
}
