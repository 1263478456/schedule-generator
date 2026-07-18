$body = @{
    name = "schedule-generator"
    description = "智能排班表生成器 - 轻松管理员工排班，一键导出A4打印排班表"
    auto_init = $false
} | ConvertTo-Json

$headers = @{
    "Accept" = "application/vnd.github.v3+json"
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Method Post -Headers $headers -Body $body
    Write-Host "Repository created successfully!"
    Write-Host "URL: $($response.html_url)"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody"
    }
}
