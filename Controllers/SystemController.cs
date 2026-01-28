using System.Diagnostics;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace Mobilmaschine.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SystemController : ControllerBase
{
    const string TermuxBin = "/data/data/com.termux/files/usr/bin";

    [HttpGet("battery")]
    public async Task<IActionResult> GetBatteryStatus()
    {
        try
        {
            var (success, output) = await RunTermuxCommand("termux-battery-status");
            if (!success)
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

    [HttpGet("sms")]
    public async Task<IActionResult> GetSms([FromQuery] int limit = 50)
    {
        try
        {
            var (success, output) = await RunTermuxCommand("termux-sms-list", $"-l {limit}");
            if (!success)
                return NotFound(new { error = "SMS not available" });

            var json = JsonDocument.Parse(output);
            return Ok(json.RootElement);
        }
        catch (Exception ex)
        {
            return NotFound(new { error = $"SMS not available: {ex.Message}" });
        }
    }

    [HttpGet("info")]
    public async Task<IActionResult> GetSystemInfo()
    {
        var result = new Dictionary<string, object>();

        // Get device properties via getprop
        var (mfgOk, manufacturer) = await RunCommand("getprop", "ro.product.manufacturer");
        var (modelOk, model) = await RunCommand("getprop", "ro.product.model");
        var (devOk, device) = await RunCommand("getprop", "ro.product.device");
        var (relOk, androidRelease) = await RunCommand("getprop", "ro.build.version.release");
        var (sdkOk, androidSdk) = await RunCommand("getprop", "ro.build.version.sdk");
        var (idOk, buildId) = await RunCommand("getprop", "ro.build.id");

        result["device"] = new
        {
            manufacturer = mfgOk ? manufacturer.Trim() : "",
            model = modelOk ? model.Trim() : "",
            device = devOk ? device.Trim() : "",
        };

        var (abiOk, cpuAbi) = await RunCommand("getprop", "ro.product.cpu.abi");
        var (hardwareOk, hardware) = await RunCommand("getprop", "ro.hardware");
        var (platformOk, platform) = await RunCommand("getprop", "ro.board.platform");
        var (fingerprintOk, fingerprint) = await RunCommand("getprop", "ro.build.fingerprint");

        result["android"] = new
        {
            release = relOk ? androidRelease.Trim() : "",
            sdk = sdkOk ? androidSdk.Trim() : "",
            id = idOk ? buildId.Trim() : "",
            fingerprint = fingerprintOk ? fingerprint.Trim() : "",
        };

        result["hardware"] = new
        {
            cpu = abiOk ? cpuAbi.Trim() : "",
            hardware = hardwareOk ? hardware.Trim() : "",
            platform = platformOk ? platform.Trim() : "",
        };

        // Battery
        var (batteryOk, batteryInfo) = await RunTermuxCommand("termux-battery-status");
        if (batteryOk)
        {
            try
            {
                var json = JsonDocument.Parse(batteryInfo);
                result["battery"] = json.RootElement;
            }
            catch { }
        }

        // WiFi
        var (wifiOk, wifiInfo) = await RunTermuxCommand("termux-wifi-connectioninfo");
        if (wifiOk)
        {
            try
            {
                var json = JsonDocument.Parse(wifiInfo);
                result["wifi"] = json.RootElement;
            }
            catch { }
        }

        // Telephony
        var (telOk, telInfo) = await RunTermuxCommand("termux-telephony-deviceinfo");
        if (telOk)
        {
            try
            {
                var json = JsonDocument.Parse(telInfo);
                result["telephony"] = json.RootElement;
            }
            catch { }
        }

        // Storage
        var (dfOk, dfOutput) = await RunCommand("df", "-B1 /data/data/com.termux/files/home");
        if (dfOk)
        {
            try
            {
                var lines = dfOutput.Split('\n', StringSplitOptions.RemoveEmptyEntries);
                if (lines.Length > 1)
                {
                    var parts = lines[1].Split(' ', StringSplitOptions.RemoveEmptyEntries);
                    if (parts.Length >= 4)
                    {
                        result["storage"] = new
                        {
                            total = long.TryParse(parts[1], out var t) ? t : 0,
                            used = long.TryParse(parts[2], out var u) ? u : 0,
                            free = long.TryParse(parts[3], out var f) ? f : 0,
                        };
                    }
                }
            }
            catch { }
        }

        // Volume
        var (volOk, volInfo) = await RunTermuxCommand("termux-volume");
        if (volOk)
        {
            try
            {
                var json = JsonDocument.Parse(volInfo);
                result["volume"] = json.RootElement;
            }
            catch { }
        }

        return Ok(result);
    }

    private static async Task<(bool success, string output)> RunTermuxCommand(string command, string args = "")
    {
        var fullPath = Path.Combine(TermuxBin, command);
        if (!System.IO.File.Exists(fullPath))
            return (false, "");

        return await RunCommand(fullPath, args);
    }

    private static async Task<(bool success, string output)> RunCommand(string command, string args = "")
    {
        try
        {
            using var process = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = command,
                    Arguments = args,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                }
            };

            process.Start();
            var output = await process.StandardOutput.ReadToEndAsync();
            await process.WaitForExitAsync();

            return process.ExitCode == 0 ? (true, output) : (false, "");
        }
        catch
        {
            return (false, "");
        }
    }
}
