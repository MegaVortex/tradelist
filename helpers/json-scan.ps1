Get-ChildItem -Recurse -Filter *.json .\src | ForEach-Object {
  try {
    $null = ConvertFrom-Json (Get-Content $_.FullName -Raw)
  } catch {
    Write-Host "❌ Bad JSON:" $_.FullName
    Write-Host "   " $_.Exception.Message
  }
}