namespace Mobilmaschine.Models;

public class FileSystemEntry
{
    public required string Name { get; init; }
    public required string Path { get; init; }
    public required FileSystemEntryType Type { get; init; }
    public long? Size { get; init; }
    public DateTime LastModified { get; init; }
    public string Extension { get; init; }
}

public enum FileSystemEntryType
{
    Directory,
    File
}

public class DirectoryListing
{
    public required string CurrentPath { get; init; }
    public string ParentPath { get; init; }
    public required IReadOnlyList<FileSystemEntry> Entries { get; init; }
}
