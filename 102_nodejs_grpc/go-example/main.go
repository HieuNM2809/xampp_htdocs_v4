package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

type Message struct {
	Text      string    `json:"text"`
	Timestamp time.Time `json:"timestamp"`
}

func main() {
	// Định nghĩa route
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// Tạo response message
		msg := Message{
			Text:      "Hello from Cursor AI!",
			Timestamp: time.Now(),
		}

		// Set header
		w.Header().Set("Content-Type", "application/json")

		// Encode và gửi response
		if err := json.NewEncoder(w).Encode(msg); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	})

	// Log khi server bắt đầu
	fmt.Println("Server starting on port 9999...")

	// Khởi động server
	if err := http.ListenAndServe(":9999", nil); err != nil {
		log.Fatal(err)
	}
}
