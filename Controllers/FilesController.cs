using Microsoft.AspNetCore.Mvc;
using Mobilmaschine.Services;

namespace Mobilmaschine.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FilesController(IFileSystemService fileSystem) : ControllerBase
{
    readonly IFileSystemService _fileSystem = fileSystem;

    [HttpGet]
    public IActionResult List([FromQuery] string path = "")
    {
        try
        {
            var listing = _fileSystem.ListDirectory(path);
            return Ok(listing);
        }
        catch (DirectoryNotFoundException)
        {
            return NotFound(new { error = "Directory not found." });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
    }

    [HttpGet("download")]
    public IActionResult Download([FromQuery] string path)
    {
        try
        {
            var stream = _fileSystem.OpenFile(path);
            var mime = _fileSystem.GetMimeType(path);
            var fileName = Path.GetFileName(_fileSystem.ResolvePath(path));
            return File(stream, mime, fileName);
        }
        catch (FileNotFoundException)
        {
            return NotFound(new { error = "File not found." });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
    }

    [HttpPost("upload")]
    [RequestSizeLimit(512 * 1024 * 1024)]
    public async Task<IActionResult> Upload([FromQuery] string path = "")
    {
        try
        {
            var files = Request.Form.Files;
            if (files.Count == 0)
                return BadRequest(new { error = "No files provided." });

            var results = new List<object>();
            foreach (var file in files)
            {
                await using var stream = file.OpenReadStream();
                await _fileSystem.SaveFileAsync(path, file.FileName, stream);
                results.Add(new { name = file.FileName, size = file.Length });
            }

            return Ok(new { uploaded = results });
        }
        catch (DirectoryNotFoundException)
        {
            return NotFound(new { error = "Directory not found." });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
    }

    [HttpDelete]
    public IActionResult Delete([FromQuery] string path)
    {
        try
        {
            _fileSystem.Delete(path);
            return Ok(new { deleted = path });
        }
        catch (FileNotFoundException)
        {
            return NotFound(new { error = "Not found." });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
    }

    [HttpPost("mkdir")]
    public IActionResult CreateDirectory([FromQuery] string path, [FromQuery] string name)
    {
        try
        {
            _fileSystem.CreateDirectory(path, name);
            return Ok(new { created = name });
        }
        catch (DirectoryNotFoundException)
        {
            return NotFound(new { error = "Directory not found." });
        }
        catch (IOException ex)
        {
            return Conflict(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("touch")]
    public IActionResult CreateFile([FromQuery] string path, [FromQuery] string name)
    {
        try
        {
            _fileSystem.CreateFile(path, name);
            return Ok(new { created = name });
        }
        catch (DirectoryNotFoundException)
        {
            return NotFound(new { error = "Directory not found." });
        }
        catch (IOException ex)
        {
            return Conflict(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("rename")]
    public IActionResult Rename([FromQuery] string path, [FromQuery] string name)
    {
        try
        {
            _fileSystem.Rename(path, name);
            return Ok(new { renamed = name });
        }
        catch (FileNotFoundException)
        {
            return NotFound(new { error = "Not found." });
        }
        catch (IOException ex)
        {
            return Conflict(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("copy")]
    public IActionResult Copy([FromQuery] string source, [FromQuery] string destination)
    {
        try
        {
            _fileSystem.Copy(source, destination);
            return Ok(new { copied = source });
        }
        catch (FileNotFoundException)
        {
            return NotFound(new { error = "Not found." });
        }
        catch (DirectoryNotFoundException)
        {
            return NotFound(new { error = "Directory not found." });
        }
        catch (IOException ex)
        {
            return Conflict(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
    }

    [HttpPost("move")]
    public IActionResult Move([FromQuery] string source, [FromQuery] string destination)
    {
        try
        {
            _fileSystem.Move(source, destination);
            return Ok(new { moved = source });
        }
        catch (FileNotFoundException)
        {
            return NotFound(new { error = "Not found." });
        }
        catch (DirectoryNotFoundException)
        {
            return NotFound(new { error = "Directory not found." });
        }
        catch (IOException ex)
        {
            return Conflict(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
    }

    [HttpGet("info")]
    public IActionResult Info([FromQuery] string path)
    {
        try
        {
            var info = _fileSystem.GetInfo(path);
            return Ok(info);
        }
        catch (FileNotFoundException)
        {
            return NotFound(new { error = "Not found." });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
    }
}
