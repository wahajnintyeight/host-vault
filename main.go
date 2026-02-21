package main

import (
	"embed"
	"log"
	"os"

	"github.com/joho/godotenv"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Load .env file if it exists (optional - won't fail if file doesn't exist)
	if _, err := os.Stat(".env"); err == nil {
		// File exists, try to load it
		if loadErr := godotenv.Load(); loadErr != nil {
			log.Printf("Warning: Error loading .env file: %v", loadErr)
			log.Printf("Make sure your .env file is UTF-8 encoded without BOM (Byte Order Mark)")
		}
	}

	
	// If .env doesn't exist, silently continue (it's optional)
	// Create an instance of the app structure
	app := NewApp()
	// Create application with options
	err := wails.Run(&options.App{
		Title:  "Host Vault",
		Width:  1200,
		Height: 800,
		MinWidth:  800,
		MinHeight: 600,
		Frameless: true,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.startup,
		CSSDragProperty:  "--wails-draggable",
		CSSDragValue:     "drag", 
		Windows: &windows.Options{
			DisableWindowIcon: false,
			Theme: windows.Dark,
		},
		Bind: []interface{}{
			app,
		},
	})

	
	if err != nil {
		println("Error:", err.Error())
	}
}
