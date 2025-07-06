param (
    [string]$command
)

try {
    Invoke-Expression -Command $command
} catch {
    Write-Error $_.Exception.Message
    exit 1
}
