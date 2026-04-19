param(
    [string]$BackendBaseUrl = "http://localhost:8000",
    [string]$Token = "",
    [string]$Metric = "temperature",
    [string]$Unit = "C",
    [double]$StartValue = 26.0,
    [double]$Step = 0.3,
    [int]$IntervalSeconds = 5,
    [int]$Count = 20
)

if ([string]::IsNullOrWhiteSpace($Token)) {
    Write-Host "ERROR: Missing -Token."
    Write-Host "Example: ./stream_sensor_to_app.ps1 -Token YOUR_TOKEN -Metric temperature -Unit C"
    exit 1
}

$headers = @{ Authorization = "Token $Token" }
$value = $StartValue

Write-Host "Streaming sensor data to $BackendBaseUrl/api/iot/push/"
Write-Host "metric=$Metric unit=$Unit interval=${IntervalSeconds}s count=$Count"

for ($i = 1; $i -le $Count; $i++) {
    $body = @{ value = [Math]::Round($value, 2); unit = $Unit; metric = $Metric } | ConvertTo-Json
    try {
        $resp = Invoke-RestMethod -Method Post -Uri "$BackendBaseUrl/api/iot/push/" -Headers $headers -ContentType "application/json" -Body $body
        Write-Host ("[{0}/{1}] OK data_id={2} metric={3} value={4}{5}" -f $i, $Count, $resp.data_id, $resp.metric, $resp.value, $resp.unit)
    }
    catch {
        Write-Host ("[{0}/{1}] FAIL: {2}" -f $i, $Count, $_.Exception.Message)
    }

    $value += $Step
    Start-Sleep -Seconds $IntervalSeconds
}

Write-Host "Done. Open FE dashboard/alerts to verify realtime updates."
