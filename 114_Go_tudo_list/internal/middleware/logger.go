package middleware

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"time"

	"github.com/gin-gonic/gin"
)

// RequestLogger middleware to log all incoming requests
func RequestLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		// Log request start
		fmt.Printf("\n🌐 === HTTP REQUEST START ===\n")
		fmt.Printf("📍 %s %s\n", c.Request.Method, c.Request.URL.String())
		fmt.Printf("🕐 %s\n", start.Format("2006-01-02 15:04:05"))
		fmt.Printf("📨 Headers:\n")

		// Log important headers
		importantHeaders := []string{
			"Content-Type",
			"User-Agent",
			"Authorization",
			"Accept",
			"X-Requested-With",
		}

		for _, header := range importantHeaders {
			if value := c.GetHeader(header); value != "" {
				fmt.Printf("   %s: %s\n", header, value)
			}
		}

		// Log query parameters
		if len(c.Request.URL.Query()) > 0 {
			fmt.Printf("🔍 Query Parameters:\n")
			for key, values := range c.Request.URL.Query() {
				fmt.Printf("   %s: %v\n", key, values)
			}
		}

		// Log request body for POST/PUT/PATCH
		if c.Request.Method == "POST" || c.Request.Method == "PUT" || c.Request.Method == "PATCH" {
			if c.Request.Body != nil {
				bodyBytes, err := io.ReadAll(c.Request.Body)
				if err == nil && len(bodyBytes) > 0 {
					fmt.Printf("📋 Request Body:\n")
					fmt.Printf("   Raw: %s\n", string(bodyBytes))

					// Try to pretty print JSON
					var prettyJSON bytes.Buffer
					if json.Indent(&prettyJSON, bodyBytes, "   ", "  ") == nil {
						fmt.Printf("   Pretty JSON:\n%s\n", prettyJSON.String())
					}

					// Restore body for handlers
					c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
				}
			}
		}

		fmt.Printf("===============================\n")

		// Process request
		c.Next()

		// Log response
		elapsed := time.Since(start)
		status := c.Writer.Status()

		statusIcon := "✅"
		if status >= 500 {
			statusIcon = "💥"
		} else if status >= 400 {
			statusIcon = "❌"
		} else if status >= 300 {
			statusIcon = "⚠️"
		}

		fmt.Printf("\n%s === HTTP RESPONSE ===\n", statusIcon)
		fmt.Printf("📍 %s %s\n", c.Request.Method, c.Request.URL.Path)
		fmt.Printf("📊 Status: %d\n", status)
		fmt.Printf("⏱️  Duration: %v\n", elapsed)

		// Warn about slow requests
		if elapsed > 1*time.Second {
			fmt.Printf("🐌 SLOW REQUEST WARNING: %v\n", elapsed)
		}

		fmt.Printf("============================\n")
	}
}

// SimpleRequestLogger - Lighter version for less verbose logging
func SimpleRequestLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		// Simple request log
		fmt.Printf("🔄 %s %s", c.Request.Method, c.Request.URL.Path)
		if len(c.Request.URL.Query()) > 0 {
			fmt.Printf(" ?%s", c.Request.URL.RawQuery)
		}
		fmt.Printf("\n")

		// Process request
		c.Next()

		// Simple response log
		elapsed := time.Since(start)
		status := c.Writer.Status()

		statusIcon := "✅"
		if status >= 400 {
			statusIcon = "❌"
		}

		fmt.Printf("%s %d - %v\n", statusIcon, status, elapsed)
	}
}

// JSONRequestLogger - Specialized for JSON API requests
func JSONRequestLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Only log JSON requests
		if c.GetHeader("Content-Type") == "application/json" {
			fmt.Printf("\n📡 JSON API REQUEST\n")
			fmt.Printf("🔗 %s %s\n", c.Request.Method, c.Request.URL.String())

			if c.Request.Body != nil {
				bodyBytes, err := io.ReadAll(c.Request.Body)
				if err == nil && len(bodyBytes) > 0 {
					// Pretty print JSON
					var prettyJSON bytes.Buffer
					if json.Indent(&prettyJSON, bodyBytes, "", "  ") == nil {
						fmt.Printf("📋 JSON Data:\n%s\n", prettyJSON.String())
					} else {
						fmt.Printf("📋 Raw Data: %s\n", string(bodyBytes))
					}

					// Restore body
					c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
				}
			}
			fmt.Printf("==================\n")
		}

		c.Next()
	}
}
