# Mobilmaschine

A web-based file manager and system utility built with ASP.NET Core and vanilla JavaScript. Designed for Android devices running Termux, it provides a modern, responsive interface for browsing files, viewing SMS messages, and monitoring system information.

## Features

### File Management
- Browse directories, create/rename/delete files and folders
- Copy, cut, and paste operations
- Drag-and-drop file upload with progress tracking
- Built-in viewers for images, videos, audio, PDFs, and text files
- Inline text file editing with save functionality
- Sort files by name, date, or size
- Breadcrumb navigation

### SMS Messages
- View SMS inbox and sent messages
- Expandable message cards
- Date formatting with relative time (today, yesterday, etc.)
- Requires Termux:API

### System Information
- Device info (manufacturer, model)
- Android version and API level
- Battery status with charge level and health
- Storage usage statistics
- WiFi connection details
- Requires Termux:API

### UI
- Dark theme with accent colors
- Bottom navigation bar
- Mobile-first responsive design
- Battery indicator in header

## Requirements

- [.NET 10.0 SDK](https://dotnet.microsoft.com/download)
- [Termux](https://termux.dev/) (for Android deployment)
- [Termux:API](https://wiki.termux.com/wiki/Termux:API) (for SMS and system info features)

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
       "RootPaths": ["/data/data/com.termux/files/home"]
     }
   }
   ```

3. (Android/Termux) Install Termux:API for SMS and system features:
   ```bash
   pkg install termux-api
   ```
   Also install the Termux:API app from F-Droid and grant necessary permissions.

4. Run the application:
   ```bash
   dotnet run
   ```

5. Open your browser and navigate to `http://localhost:8081`

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
│   ├── FilesController.cs       # File management API
│   └── SystemController.cs      # System info, SMS, battery API
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

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/system/battery` | Get battery status |
| GET | `/api/system/sms` | List SMS messages (query: `limit`) |
| GET | `/api/system/info` | Get device, Android, battery, WiFi, and storage info |

### Files

| Method | Endpoint | Description |
|--------|----------|-------------|
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
