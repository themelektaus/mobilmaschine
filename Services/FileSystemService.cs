using Microsoft.AspNetCore.StaticFiles;
using Mobilmaschine.Models;

namespace Mobilmaschine.Services;

public class FileSystemService : IFileSystemService
{
    readonly string _rootPath;
    readonly FileExtensionContentTypeProvider _contentTypeProvider = new();

    public FileSystemService(IConfiguration configuration)
    {
        var rootPaths = configuration.GetSection("FileSystem:RootPaths").Get<string[]>();
        _rootPath = rootPaths.FirstOrDefault(Directory.Exists);
    }

    public string ResolvePath(string relativePath)
    {
        var normalized = (relativePath ?? "").Replace('\\', '/').Trim('/');

        if (normalized.Split('/').Any(segment => segment == ".."))
            throw new UnauthorizedAccessException("Path traversal is not allowed.");

        var fullPath = Path.GetFullPath(Path.Combine(_rootPath, normalized));

        if (!fullPath.StartsWith(_rootPath, StringComparison.OrdinalIgnoreCase))
            throw new UnauthorizedAccessException("Access denied: path is outside root.");

        return fullPath;
    }

    public DirectoryListing ListDirectory(string relativePath)
    {
        var fullPath = ResolvePath(relativePath);
        var dirInfo = new DirectoryInfo(fullPath);

        if (!dirInfo.Exists)
            throw new DirectoryNotFoundException($"Directory not found: {relativePath}");

        var entries = new List<FileSystemEntry>();

        foreach (var dir in dirInfo.EnumerateDirectories())
        {
            if (dir.Name.StartsWith('.'))
                continue;

            entries.Add(new FileSystemEntry
            {
                Name = dir.Name,
                Path = GetRelativePath(dir.FullName),
                Type = FileSystemEntryType.Directory,
                LastModified = dir.LastWriteTime
            });
        }

        foreach (var file in dirInfo.EnumerateFiles())
        {
            if (file.Name.StartsWith('.'))
                continue;

            entries.Add(new FileSystemEntry
            {
                Name = file.Name,
                Path = GetRelativePath(file.FullName),
                Type = FileSystemEntryType.File,
                Size = file.Length,
                LastModified = file.LastWriteTime,
                Extension = file.Extension.TrimStart('.').ToLowerInvariant()
            });
        }

        string parentPath = null;
        var relNormalized = (relativePath ?? "").Replace('\\', '/').Trim('/');
        if (!string.IsNullOrEmpty(relNormalized))
        {
            var parentIdx = relNormalized.LastIndexOf('/');
            parentPath = parentIdx >= 0 ? relNormalized[..parentIdx] : "";
        }

        return new DirectoryListing
        {
            CurrentPath = relNormalized,
            ParentPath = parentPath,
            Entries = entries
        };
    }

    public FileSystemEntry GetInfo(string relativePath)
    {
        var fullPath = ResolvePath(relativePath);

        if (Directory.Exists(fullPath))
        {
            var dir = new DirectoryInfo(fullPath);
            return new FileSystemEntry
            {
                Name = dir.Name,
                Path = GetRelativePath(dir.FullName),
                Type = FileSystemEntryType.Directory,
                LastModified = dir.LastWriteTime
            };
        }

        if (File.Exists(fullPath))
        {
            var file = new FileInfo(fullPath);
            return new FileSystemEntry
            {
                Name = file.Name,
                Path = GetRelativePath(file.FullName),
                Type = FileSystemEntryType.File,
                Size = file.Length,
                LastModified = file.LastWriteTime,
                Extension = file.Extension.TrimStart('.').ToLowerInvariant()
            };
        }

        throw new FileNotFoundException($"Not found: {relativePath}");
    }

    public Stream OpenFile(string relativePath)
    {
        var fullPath = ResolvePath(relativePath);

        if (!File.Exists(fullPath))
            throw new FileNotFoundException($"File not found: {relativePath}");

        return new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read);
    }

    public string GetMimeType(string relativePath)
    {
        var fullPath = ResolvePath(relativePath);
        if (_contentTypeProvider.TryGetContentType(fullPath, out var contentType))
            return contentType;
        return "application/octet-stream";
    }

    public async Task SaveFileAsync(string directoryPath, string fileName, Stream content)
    {
        var dirFull = ResolvePath(directoryPath);

        if (!Directory.Exists(dirFull))
            throw new DirectoryNotFoundException($"Directory not found: {directoryPath}");

        var sanitized = Path.GetFileName(fileName);
        if (string.IsNullOrWhiteSpace(sanitized))
            throw new ArgumentException("Invalid file name.");

        var targetPath = Path.Combine(dirFull, sanitized);

        if (!targetPath.StartsWith(_rootPath, StringComparison.OrdinalIgnoreCase))
            throw new UnauthorizedAccessException("Access denied: path is outside root.");

        await using var fs = new FileStream(targetPath, FileMode.Create, FileAccess.Write, FileShare.None);
        await content.CopyToAsync(fs);
    }

    public async Task WriteTextAsync(string relativePath, string content)
    {
        var fullPath = ResolvePath(relativePath);

        if (!File.Exists(fullPath))
            throw new FileNotFoundException($"File not found: {relativePath}");

        await File.WriteAllTextAsync(fullPath, content);
    }

    public void Delete(string relativePath)
    {
        var fullPath = ResolvePath(relativePath);

        if (fullPath == _rootPath)
            throw new UnauthorizedAccessException("Cannot delete root directory.");

        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
            return;
        }

        if (Directory.Exists(fullPath))
        {
            Directory.Delete(fullPath, recursive: true);
            return;
        }

        throw new FileNotFoundException($"Not found: {relativePath}");
    }

    public void CreateDirectory(string parentPath, string name)
    {
        var parentFull = ResolvePath(parentPath);
        if (!Directory.Exists(parentFull))
            throw new DirectoryNotFoundException($"Directory not found: {parentPath}");

        var sanitized = Path.GetFileName(name);
        if (string.IsNullOrWhiteSpace(sanitized))
            throw new ArgumentException("Invalid directory name.");

        var targetPath = Path.Combine(parentFull, sanitized);
        if (!targetPath.StartsWith(_rootPath, StringComparison.OrdinalIgnoreCase))
            throw new UnauthorizedAccessException("Access denied: path is outside root.");

        if (Directory.Exists(targetPath))
            throw new IOException($"Directory already exists: {sanitized}");

        Directory.CreateDirectory(targetPath);
    }

    public void CreateFile(string parentPath, string name)
    {
        var parentFull = ResolvePath(parentPath);
        if (!Directory.Exists(parentFull))
            throw new DirectoryNotFoundException($"Directory not found: {parentPath}");

        var sanitized = Path.GetFileName(name);
        if (string.IsNullOrWhiteSpace(sanitized))
            throw new ArgumentException("Invalid file name.");

        var targetPath = Path.Combine(parentFull, sanitized);
        if (!targetPath.StartsWith(_rootPath, StringComparison.OrdinalIgnoreCase))
            throw new UnauthorizedAccessException("Access denied: path is outside root.");

        if (File.Exists(targetPath))
            throw new IOException($"File already exists: {sanitized}");

        File.Create(targetPath).Dispose();
    }

    public void Rename(string relativePath, string newName)
    {
        var fullPath = ResolvePath(relativePath);

        if (fullPath == _rootPath)
            throw new UnauthorizedAccessException("Cannot rename root directory.");

        var sanitized = Path.GetFileName(newName);
        if (string.IsNullOrWhiteSpace(sanitized))
            throw new ArgumentException("Invalid name.");

        var parentDir = Path.GetDirectoryName(fullPath)!;
        var targetPath = Path.Combine(parentDir, sanitized);

        if (!targetPath.StartsWith(_rootPath, StringComparison.OrdinalIgnoreCase))
            throw new UnauthorizedAccessException("Access denied: path is outside root.");

        if (File.Exists(targetPath) || Directory.Exists(targetPath))
            throw new IOException($"Already exists: {sanitized}");

        if (File.Exists(fullPath))
            File.Move(fullPath, targetPath);
        else if (Directory.Exists(fullPath))
            Directory.Move(fullPath, targetPath);
        else
            throw new FileNotFoundException($"Not found: {relativePath}");
    }

    public void Copy(string sourcePath, string destinationDir)
    {
        var srcFull = ResolvePath(sourcePath);
        var dstDirFull = ResolvePath(destinationDir);

        if (!Directory.Exists(dstDirFull))
            throw new DirectoryNotFoundException($"Directory not found: {destinationDir}");

        var name = Path.GetFileName(srcFull);
        var targetPath = Path.Combine(dstDirFull, name);

        if (!targetPath.StartsWith(_rootPath, StringComparison.OrdinalIgnoreCase))
            throw new UnauthorizedAccessException("Access denied: path is outside root.");

        targetPath = GetUniquePath(targetPath);

        if (File.Exists(srcFull))
        {
            File.Copy(srcFull, targetPath);
        }
        else if (Directory.Exists(srcFull))
        {
            CopyDirectoryRecursive(new DirectoryInfo(srcFull), new DirectoryInfo(targetPath));
        }
        else
        {
            throw new FileNotFoundException($"Not found: {sourcePath}");
        }
    }

    static void CopyDirectoryRecursive(DirectoryInfo source, DirectoryInfo target)
    {
        target.Create();

        foreach (var file in source.EnumerateFiles())
            file.CopyTo(Path.Combine(target.FullName, file.Name));

        foreach (var dir in source.EnumerateDirectories())
            CopyDirectoryRecursive(dir, new DirectoryInfo(Path.Combine(target.FullName, dir.Name)));
    }

    public void Move(string sourcePath, string destinationDir)
    {
        var srcFull = ResolvePath(sourcePath);
        var dstDirFull = ResolvePath(destinationDir);

        if (srcFull == _rootPath)
            throw new UnauthorizedAccessException("Cannot move root directory.");

        if (!Directory.Exists(dstDirFull))
            throw new DirectoryNotFoundException($"Directory not found: {destinationDir}");

        var name = Path.GetFileName(srcFull);
        var targetPath = Path.Combine(dstDirFull, name);

        if (!targetPath.StartsWith(_rootPath, StringComparison.OrdinalIgnoreCase))
            throw new UnauthorizedAccessException("Access denied: path is outside root.");

        if (File.Exists(targetPath) || Directory.Exists(targetPath))
            throw new IOException($"Already exists: {name}");

        if (Directory.Exists(srcFull) && dstDirFull.StartsWith(srcFull, StringComparison.OrdinalIgnoreCase))
            throw new IOException("Cannot move a directory into itself.");

        if (File.Exists(srcFull))
            File.Move(srcFull, targetPath);
        else if (Directory.Exists(srcFull))
            Directory.Move(srcFull, targetPath);
        else
            throw new FileNotFoundException($"Not found: {sourcePath}");
    }

    static string GetUniquePath(string path)
    {
        if (!File.Exists(path) && !Directory.Exists(path))
            return path;

        var dir = Path.GetDirectoryName(path)!;
        var nameWithoutExt = Path.GetFileNameWithoutExtension(path);
        var ext = Path.GetExtension(path);

        for (var i = 1; ; i++)
        {
            var candidate = Path.Combine(dir, $"{nameWithoutExt} ({i}){ext}");
            if (!File.Exists(candidate) && !Directory.Exists(candidate))
                return candidate;
        }
    }

    string GetRelativePath(string fullPath)
    {
        return Path.GetRelativePath(_rootPath, fullPath).Replace('\\', '/');
    }

    public (long size, int files, int directories) GetDirectorySize(string relativePath)
    {
        var fullPath = ResolvePath(relativePath);

        if (!Directory.Exists(fullPath))
            throw new DirectoryNotFoundException($"Directory not found: {relativePath}");

        return CalculateDirectorySize(new DirectoryInfo(fullPath));
    }

    static (long size, int files, int directories) CalculateDirectorySize(DirectoryInfo dir)
    {
        long totalSize = 0;
        int totalFiles = 0;
        int totalDirs = 0;

        try
        {
            foreach (var file in dir.EnumerateFiles())
            {
                try
                {
                    totalSize += file.Length;
                    totalFiles++;
                }
                catch { }
            }

            foreach (var subDir in dir.EnumerateDirectories())
            {
                totalDirs++;
                var (subSize, subFiles, subDirs) = CalculateDirectorySize(subDir);
                totalSize += subSize;
                totalFiles += subFiles;
                totalDirs += subDirs;
            }
        }
        catch { }

        return (totalSize, totalFiles, totalDirs);
    }
}
