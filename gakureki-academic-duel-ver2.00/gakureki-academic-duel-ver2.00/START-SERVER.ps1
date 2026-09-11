$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath((Split-Path -Parent $MyInvocation.MyCommand.Path))
$port = 8765
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
try {
  $listener.Start()
} catch {
  Write-Host "Port $port is already in use. Opening the existing local game server." -ForegroundColor Yellow
  Start-Process "http://127.0.0.1:$port/index.html"
  Read-Host 'Press Enter to close this window'
  exit 0
}
Start-Process "http://127.0.0.1:$port/index.html"
Write-Host "ACADEMIA DUEL local server: http://127.0.0.1:$port/" -ForegroundColor Green
Write-Host 'Keep this window open while playing. Press Ctrl+C to stop.'

function Send-Response($stream, [int]$status, [string]$statusText, [byte[]]$body, [string]$contentType) {
  $header = "HTTP/1.1 $status $statusText`r`nContent-Type: $contentType`r`nContent-Length: $($body.Length)`r`nCache-Control: no-store`r`nX-Content-Type-Options: nosniff`r`nConnection: close`r`n`r`n"
  $headBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
  $stream.Write($headBytes, 0, $headBytes.Length)
  if ($body.Length -gt 0) { $stream.Write($body, 0, $body.Length) }
}

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $stream = $client.GetStream()
    $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 8192, $true)
    $requestLine = $reader.ReadLine()
    if ([string]::IsNullOrWhiteSpace($requestLine)) { continue }
    while ($true) { $line = $reader.ReadLine(); if ($null -eq $line -or $line -eq '') { break } }
    $parts = $requestLine.Split(' ')
    if ($parts.Length -lt 2 -or ($parts[0] -ne 'GET' -and $parts[0] -ne 'HEAD')) {
      Send-Response $stream 405 'Method Not Allowed' ([byte[]]::new(0)) 'text/plain; charset=utf-8'; continue
    }
    $urlPath = $parts[1].Split('?')[0]
    $relative = [System.Uri]::UnescapeDataString($urlPath).TrimStart('/')
    if ([string]::IsNullOrWhiteSpace($relative)) { $relative = 'index.html' }
    $relative = $relative.Replace('/', [System.IO.Path]::DirectorySeparatorChar)
    $full = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($root, $relative))
    if (-not $full.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase) -or -not [System.IO.File]::Exists($full)) {
      $body = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found')
      Send-Response $stream 404 'Not Found' $body 'text/plain; charset=utf-8'; continue
    }
    $ext = [System.IO.Path]::GetExtension($full).ToLowerInvariant()
    $mime = switch ($ext) {
      '.html' { 'text/html; charset=utf-8' }
      '.js'   { 'text/javascript; charset=utf-8' }
      '.css'  { 'text/css; charset=utf-8' }
      '.json' { 'application/json; charset=utf-8' }
      '.svg'  { 'image/svg+xml' }
      '.webp' { 'image/webp' }
      '.png'  { 'image/png' }
      '.jpg'  { 'image/jpeg' }
      '.jpeg' { 'image/jpeg' }
      '.txt'  { 'text/plain; charset=utf-8' }
      default { 'application/octet-stream' }
    }
    $body = if ($parts[0] -eq 'HEAD') { [byte[]]::new(0) } else { [System.IO.File]::ReadAllBytes($full) }
    Send-Response $stream 200 'OK' $body $mime
  } catch {
    try {
      $body = [System.Text.Encoding]::UTF8.GetBytes('500 Local Server Error')
      Send-Response $stream 500 'Internal Server Error' $body 'text/plain; charset=utf-8'
    } catch {}
  } finally {
    $client.Close()
  }
}
