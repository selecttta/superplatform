$ProgressPreference = 'SilentlyContinue'
$out = 'C:\Users\RASH\Desktop\superplatform\superplatform\public\videos\health.mp4'
$url = 'https://videos.pexels.com/video-files/7580480/7580480-hd_1366_720_25fps.mp4'
$headers = @{
    'User-Agent' = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
    'Referer'    = 'https://www.pexels.com/'
}
Write-Host "Downloading Pexels health video (ID: 7580480, 720p)..."
Invoke-WebRequest -Uri $url -OutFile $out -Headers $headers -TimeoutSec 120 -ErrorAction Stop
$sz = (Get-Item $out).Length
Write-Host "Done: $([math]::Round($sz/1MB,2)) MB" -ForegroundColor Green
