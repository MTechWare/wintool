# Get Disk Space Information
# Improved version with better error handling and modern PowerShell cmdlets

try {
    # Set error handling
    $ErrorActionPreference = "Stop"

    # Use Get-CimInstance instead of deprecated Get-WmiObject
    $disk = Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DeviceID='C:'" -ErrorAction Stop

    if ($disk -and $disk.Size -gt 0) {
        $result = @{
            Total = [long]$disk.Size
            Free = [long]$disk.FreeSpace
            Used = [long]($disk.Size - $disk.FreeSpace)
        }

        # Output as clean JSON
        $result | ConvertTo-Json -Compress
    } else {
        # Fallback: Try to get disk info using Get-Volume
        $volume = Get-Volume -DriveLetter C -ErrorAction SilentlyContinue
        if ($volume) {
            $total = $volume.Size
            $free = $volume.SizeRemaining
            $used = $total - $free

            $result = @{
                Total = [long]$total
                Free = [long]$free
                Used = [long]$used
            }
            $result | ConvertTo-Json -Compress
        } else {
            # Final fallback with error
            @{Total = 0; Free = 0; Used = 0; Error = "No C: drive found"} | ConvertTo-Json -Compress
        }
    }
} catch {
    # Return error information in JSON format
    @{
        Total = 0
        Free = 0
        Used = 0
        Error = $_.Exception.Message
    } | ConvertTo-Json -Compress
}
