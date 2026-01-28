# Mobilmaschine

A web-based file manager built with ASP.NET Core and vanilla JavaScript. Provides a modern, responsive interface for browsing, managing, and previewing files through your web browser.

## Features

- **File Management** - Browse directories, create/rename/delete files and folders, copy, cut, and paste operations
- **File Upload** - Drag-and-drop support with progress tracking
- **File Preview** - Built-in viewers for images, videos, audio, PDFs, and text files
- **Inline Editing** - Edit text files directly in the browser with save functionality
- **Dark Theme** - Modern dark interface with accent colors
- **Sorting** - Sort files by name, date, or size
- **Breadcrumb Navigation** - Quick path navigation with clickable breadcrumbs

## Requirements

- [.NET 10.0 SDK](https://dotnet.microsoft.com/download)

## Getting Started

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd Mobilmaschine
   ```

2. Configure the root directory in `appsettings.json`:
   ```json
   {
     "FileSystem": {
       "RootPaths": ["C:\\Users\\YourName\\Documents"]
     }
   }
   ```

3. Run the application:
   ```bash
   dotnet run
   ```

4. Open your browser and navigate to `http://localhost:8081`

## Development

For development with hot reload:

```bash
dotnet watch run
```

Or use the VS Code task: `dotnet watch`

## Project Structure

```
Mobilmaschine/
├── Controllers/
│   └── FilesController.cs       # REST API endpoints
├── Services/
│   ├── IFileSystemService.cs    # Service interface
│   └── FileSystemService.cs     # File system operations
├── Models/
│   └── FileSystemEntry.cs       # Data models
├── wwwroot/
│   ├── index.html               # Main HTML page
│   ├── js/app.js                # Frontend application
│   └── css/style.css            # Styles
├── Program.cs                   # Application entry point
└── appsettings.json             # Configuration
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/system/battery` | Get battery status (Android/Linux) |
| GET | `/api/files` | List directory contents |
| GET | `/api/files/download` | Download a file |
| GET | `/api/files/info` | Get file/folder metadata |
| POST | `/api/files/upload` | Upload files |
| POST | `/api/files/directory` | Create a directory |
| POST | `/api/files/file` | Create an empty file |
| PUT | `/api/files/rename` | Rename a file or folder |
| PUT | `/api/files/content` | Update file content |
| PUT | `/api/files/move` | Move files/folders |
| PUT | `/api/files/copy` | Copy files/folders |
| DELETE | `/api/files` | Delete a file or folder |

## Supported File Types

**Preview:**
- Images: jpg, png, gif, webp, svg, bmp, ico
- Video: mp4, webm, ogg, mov
- Audio: mp3, wav, flac, ogg, aac, m4a, opus
- Documents: pdf
- Text: txt, md, json, xml, html, css, js, and more

## License

MIT
