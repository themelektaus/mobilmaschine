using Mobilmaschine.Models;

namespace Mobilmaschine.Services;

public interface IFileSystemService
{
    DirectoryListing ListDirectory(string relativePath);
    FileSystemEntry GetInfo(string relativePath);
    Stream OpenFile(string relativePath);
    string GetMimeType(string relativePath);
    string ResolvePath(string relativePath);
    Task SaveFileAsync(string directoryPath, string fileName, Stream content);
    void Delete(string relativePath);
    void CreateDirectory(string parentPath, string name);
    void CreateFile(string parentPath, string name);
    void Rename(string relativePath, string newName);
    void Copy(string sourcePath, string destinationDir);
    void Move(string sourcePath, string destinationDir);
}
