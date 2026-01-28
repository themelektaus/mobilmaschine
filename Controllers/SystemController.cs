using System.Diagnostics;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace Mobilmaschine.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SystemController : ControllerBase
{
    const string TermuxBatteryCommand = "/data/data/com.termux/files/usr/bin/termux-battery-status";

    [HttpGet("battery")]
    public async Task<IActionResult> GetBatteryStatus()
    {
        try
        {
            using var process = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = TermuxBatteryCommand,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                }
            };

            process.Start();
            var output = await process.StandardOutput.ReadToEndAsync();
            await process.WaitForExitAsync();

            if (process.ExitCode != 0)
                return NotFound(new { error = "Battery information not available" });

            var json = JsonDocument.Parse(output);
            var root = json.RootElement;

            var percentage = root.GetProperty("percentage").GetInt32();
            var status = root.GetProperty("status").GetString() ?? "Unknown";
            var charging = status.Equals("CHARGING", StringComparison.OrdinalIgnoreCase);

            return Ok(new
            {
                percentage,
                status,
                charging,
            });
        }
        catch
        {
            return NotFound(new { error = "Battery information not available" });
        }
    }
}
