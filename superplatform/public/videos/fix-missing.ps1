$ProgressPreference = 'SilentlyContinue'
$headers = @{ "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
$dir = "C:\Users\RASH\Desktop\superplatform\superplatform\public\videos"

function TryDownload($name, $urls) {
    $out = "$dir\$name.mp4"
    foreach ($url in $urls) {
        Write-Host "Trying $name : $($url.Split('/')[-1])"
        try {
            Invoke-WebRequest -Uri $url -OutFile $out -Headers $headers -TimeoutSec 60 -ErrorAction Stop
            $sz = (Get-Item $out).Length
            if ($sz -gt 50000) {
                Write-Host "OK $name.mp4 ($([math]::Round($sz/1MB,2)) MB)" -ForegroundColor Green
                return
            }
            Remove-Item $out -Force -ErrorAction SilentlyContinue
        } catch {
            Remove-Item $out -Force -ErrorAction SilentlyContinue
        }
    }
    Write-Host "FAIL $name.mp4" -ForegroundColor Red
}

# Welcome video
TryDownload "welcome" @(
    "https://assets.mixkit.co/videos/preview/mixkit-busy-day-in-the-city-4178-large.mp4",
    "https://assets.mixkit.co/videos/preview/mixkit-shopping-at-a-clothing-store-4065-large.mp4",
    "https://assets.mixkit.co/videos/preview/mixkit-a-woman-shopping-at-a-market-stall-10-large.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4"
)

# Replace oversized health video (161MB -> smaller clip)
Remove-Item "$dir\health.mp4" -Force -ErrorAction SilentlyContinue
TryDownload "health" @(
    "https://assets.mixkit.co/videos/preview/mixkit-doctor-consulting-a-patient-4292-large.mp4",
    "https://assets.mixkit.co/videos/preview/mixkit-female-doctor-talking-with-the-patient-4386-large.mp4",
    "https://assets.mixkit.co/videos/preview/mixkit-cropped-shot-of-a-doctor-taking-notes-4389-large.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4"
)

Write-Host "`nFinal videos in public/videos/:"
Get-ChildItem "$dir\*.mp4" | ForEach-Object {
    Write-Host "  $($_.Name): $([math]::Round($_.Length/1MB,2)) MB"
}
