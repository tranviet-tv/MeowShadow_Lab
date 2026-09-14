// Package websocket provides realtime event broadcasting to Web and Mobile clients
// using Fiber WebSocket connections and connection pooling.
package websocket

import (
	"log"
	"time"

	"github.com/gofiber/websocket/v2"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer.
	maxMessageSize = 512
)

// Client represents an active WebSocket connection attached to the Hub.
type Client struct {
	Hub      *Hub
	Conn     *websocket.Conn
	Send     chan []byte
	JobID    string
	LessonID string
}

// NewClient creates an initialized Client instance.
func NewClient(hub *Hub, conn *websocket.Conn, jobID, lessonID string) *Client {
	return &Client{
		Hub:      hub,
		Conn:     conn,
		Send:     make(chan []byte, 256),
		JobID:    jobID,
		LessonID: lessonID,
	}
}

// ReadPump pumps messages from the websocket connection to the hub.
func (c *Client) ReadPump() {
	defer func() {
		c.Hub.Unregister(c)
		if c.Conn != nil {
			_ = c.Conn.Close()
		}
	}()

	if c.Conn == nil {
		return
	}

	c.Conn.SetReadLimit(maxMessageSize)
	_ = c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error {
		_ = c.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, _, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket read error: %v", err)
			}
			break
		}
	}
}

// WritePump pumps messages from the hub to the websocket connection.
func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		if c.Conn != nil {
			_ = c.Conn.Close()
		}
	}()

	for {
		select {
		case message, ok := <-c.Send:
			if c.Conn == nil {
				return
			}
			_ = c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed the channel.
				_ = c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}

			// Send any additional queued messages as distinct text frames
			n := len(c.Send)
			for i := 0; i < n; i++ {
				extraMsg := <-c.Send
				if err := c.Conn.WriteMessage(websocket.TextMessage, extraMsg); err != nil {
					return
				}
			}

		case <-ticker.C:
			if c.Conn == nil {
				return
			}
			_ = c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
