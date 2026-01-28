using System.Collections.Concurrent;

namespace Mobilmaschine.Services;

public class DirectorySizeCache
{
    private readonly ConcurrentDictionary<string, CacheEntry> _cache = new();
    private readonly TimeSpan _ttl = TimeSpan.FromMinutes(5);

    public record CacheEntry(long Size, int Files, int Directories, DateTime CachedAt);

    public CacheEntry Get(string path)
    {
        var key = NormalizePath(path);
        if (_cache.TryGetValue(key, out var entry))
        {
            if (DateTime.UtcNow - entry.CachedAt < _ttl)
                return entry;

            _cache.TryRemove(key, out _);
        }
        return null;
    }

    public void Set(string path, long size, int files, int directories)
    {
        var key = NormalizePath(path);
        var entry = new CacheEntry(size, files, directories, DateTime.UtcNow);
        _cache[key] = entry;
    }

    public void Invalidate(string path)
    {
        var key = NormalizePath(path);

        // Invalidate the path itself
        _cache.TryRemove(key, out _);

        // Invalidate all parent paths
        var parts = key.Split('/');
        for (var i = parts.Length - 1; i >= 0; i--)
        {
            var parentKey = string.Join('/', parts.Take(i));
            _cache.TryRemove(parentKey, out _);
        }
    }

    public void InvalidateAll()
    {
        _cache.Clear();
    }

    private static string NormalizePath(string path)
    {
        return (path ?? "").Replace('\\', '/').Trim('/').ToLowerInvariant();
    }
}
