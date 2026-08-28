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
        -WindowStyle Hidden

    Write-Host "Starting the local JSON save server..."
    $saveServerArguments = "/c", "npm run save-server"
    Start-Process `
        -FilePath "cmd.exe" `
        -ArgumentList $saveServerArguments `
        -WorkingDirectory $repositoryRoot `
        -WindowStyle Hidden

    Write-Host "Eleventy and the JSON save server should now be running."
} finally {
    Pop-Location
}
