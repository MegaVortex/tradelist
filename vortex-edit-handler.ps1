# Extract the full URI from argument list
if ($args.Length -ge 1) {
    $inputUri = $args[0]
} else {
    Write-Host "No argument provided"
    pause
    exit
}

# Remove the custom URI scheme
$fileSlug = $inputUri -replace "^vortex-edit://", ""

Write-Host "Received slug: $fileSlug"

# Build the full path
$basePath = "C:\Users\ovech\Documents\new_trade_list\tl_web\src\data"
$jsonPath = Join-Path $basePath "$fileSlug.json"

# Open or warn
if (Test-Path $jsonPath) {
    Write-Host "Opening file: $jsonPath"
    Start-Process "notepad++" $jsonPath
} else {
    Write-Host "File does not exist: $jsonPath"
}

pause