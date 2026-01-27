using Mobilmaschine.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddSingleton<IFileSystemService, FileSystemService>();
builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = 512 * 1024 * 1024);

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();
app.MapControllers();

app.Run();
