using Microsoft.AspNetCore.Mvc;

namespace Mobilmaschine.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SystemController : ControllerBase
{
    static readonly string[] BatteryPaths =
    [
        "/sys/class/power_supply/battery",
        "/sys/class/power_supply/BAT0",
        "/sys/class/power_supply/BAT1",
    ];

    [HttpGet("battery")]
    public IActionResult GetBatteryStatus()
    {
        foreach (var basePath in BatteryPaths)
        {
            if (!Directory.Exists(basePath))
                continue;

            try
            {
                var capacityPath = Path.Combine(basePath, "capacity");
                var statusPath = Path.Combine(basePath, "status");

                if (!System.IO.File.Exists(capacityPath))
                    continue;

                var capacityText = System.IO.File.ReadAllText(capacityPath).Trim();
                if (!int.TryParse(capacityText, out var percentage))
                    continue;

                var status = "Unknown";
                if (System.IO.File.Exists(statusPath))
                    status = System.IO.File.ReadAllText(statusPath).Trim();

                return Ok(new
                {
                    percentage,
                    status,
                    charging = status.Equals("Charging", StringComparison.OrdinalIgnoreCase),
                });
            }
            catch
            {
                continue;
            }
        }

        return NotFound(new { error = "Battery information not available" });
    }
}
