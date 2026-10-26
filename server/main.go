package main

import (
	"embed"
	"flag"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

//go:embed words.json
var data embed.FS

func newHandler(dist string) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.Write([]byte(`{"status":"ok"}`))
	})
	mux.HandleFunc("/api/words", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet { w.WriteHeader(http.StatusMethodNotAllowed); return }
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.Header().Set("Cache-Control", "no-cache")
		body, err := data.ReadFile("words.json")
		if err != nil { http.Error(w, "База недоступна", 500); return }
		w.Write(body)
	})
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") { http.NotFound(w, r); return }
		clean := filepath.Clean("/" + r.URL.Path)
		path := filepath.Join(dist, clean)
		if info, err := os.Stat(path); err != nil || info.IsDir() { path = filepath.Join(dist, "index.html") }
		http.ServeFile(w, r, path)
	})
	return mux
}

func main() {
	addr := flag.String("addr", "127.0.0.1:8080", "адрес сервера")
	dist := flag.String("dist", "dist", "папка сборки Vite")
	flag.Parse()
	server := &http.Server{Addr: *addr, Handler: newHandler(*dist), ReadHeaderTimeout: 5 * time.Second, IdleTimeout: 60 * time.Second}
	log.Printf("Точка: http://%s", *addr)
	log.Fatal(server.ListenAndServe())
}
