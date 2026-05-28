# Test Ingestion API
$uri = "http://localhost:3160/v1/ingest"
$body = @{
    content = "Test memory for search: ABC-123"
}
$body | ConvertTo-Json -Depth 100

try {
    $result = Invoke-RestMethod -Uri $uri -Method Post -Body $body -ContentType "application/json"
    Write-Host "Ingest response: $($result | ConvertTo-Json)"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $responseText = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseText | Out-String
    }
}
