// Package websocket provides realtime event broadcasting to Web and Mobile clients.
package websocket

import (
	"encoding/json"
	"sync"

	"meowshadow/gateway-core/internal/orchestrator"
)

// Hub maintains the set of active clients and broadcasts messages to targeted clients.
type Hub struct {
	mu                  sync.RWMutex
	clients             map[*Client]bool
	jobSubscriptions    map[string]map[*Client]bool
	lessonSubscriptions map[string]map[*Client]bool

	register   chan *Client
	unregister chan *Client
	broadcast  chan []byte
	stop       chan struct{}
}

// NewHub creates an initialized Hub instance.
func NewHub() *Hub {
	return &Hub{
		clients:             make(map[*Client]bool),
		jobSubscriptions:    make(map[string]map[*Client]bool),
		lessonSubscriptions: make(map[string]map[*Client]bool),
		register:            make(chan *Client),
		unregister:          make(chan *Client),
		broadcast:           make(chan []byte, 256),
		stop:                make(chan struct{}),
	}
}

// Run begins the main hub event loop processing registrations and broadcasts.
func (h *Hub) Run() {
	for {
		select {
		case <-h.stop:
			h.mu.Lock()
			for client := range h.clients {
				close(client.Send)
				delete(h.clients, client)
			}
			h.jobSubscriptions = make(map[string]map[*Client]bool)
			h.lessonSubscriptions = make(map[string]map[*Client]bool)
			h.mu.Unlock()
			return

		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			if client.JobID != "" {
				if _, ok := h.jobSubscriptions[client.JobID]; !ok {
					h.jobSubscriptions[client.JobID] = make(map[*Client]bool)
				}
				h.jobSubscriptions[client.JobID][client] = true
			}
			if client.LessonID != "" {
				if _, ok := h.lessonSubscriptions[client.LessonID]; !ok {
					h.lessonSubscriptions[client.LessonID] = make(map[*Client]bool)
				}
				h.lessonSubscriptions[client.LessonID][client] = true
			}
			h.mu.Unlock()

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.Send)

				if client.JobID != "" {
					if subs, ok := h.jobSubscriptions[client.JobID]; ok {
						delete(subs, client)
						if len(subs) == 0 {
							delete(h.jobSubscriptions, client.JobID)
						}
					}
				}
				if client.LessonID != "" {
					if subs, ok := h.lessonSubscriptions[client.LessonID]; ok {
						delete(subs, client)
						if len(subs) == 0 {
							delete(h.lessonSubscriptions, client.LessonID)
						}
					}
				}
			}
			h.mu.Unlock()

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.Send <- message:
				default:
					// Channel is full or blocked; close and remove
					close(client.Send)
					delete(h.clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

// Register adds a client to the hub.
func (h *Hub) Register(client *Client) {
	h.register <- client
}

// Unregister removes a client from the hub.
func (h *Hub) Unregister(client *Client) {
	h.unregister <- client
}

// BroadcastAll broadcasts a message to all connected clients.
func (h *Hub) BroadcastAll(message []byte) {
	h.broadcast <- message
}

// BroadcastProgress sends a structured progress event to clients subscribed to the specific job or lesson.
func (h *Hub) BroadcastProgress(event orchestrator.ProgressBroadcastEvent) {
	message, err := json.Marshal(event)
	if err != nil {
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	sentClients := make(map[*Client]bool)

	// Send to clients subscribed to job_id
	if event.JobID != "" {
		if clients, ok := h.jobSubscriptions[event.JobID]; ok {
			for client := range clients {
				select {
				case client.Send <- message:
					sentClients[client] = true
				default:
				}
			}
		}
	}

	// Send to clients subscribed to lesson_id
	if event.LessonID != "" {
		if clients, ok := h.lessonSubscriptions[event.LessonID]; ok {
			for client := range clients {
				if !sentClients[client] {
					select {
					case client.Send <- message:
						sentClients[client] = true
					default:
					}
				}
			}
		}
	}

	// Also broadcast to global observers who didn't specify job/lesson filter
	for client := range h.clients {
		if client.JobID == "" && client.LessonID == "" && !sentClients[client] {
			select {
			case client.Send <- message:
			default:
			}
		}
	}
}

// ClientCount returns the total number of connected clients.
func (h *Hub) ClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

// SubscribedClientCount returns the number of clients subscribed to a specific job ID.
func (h *Hub) SubscribedClientCount(jobID string) int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	if subs, ok := h.jobSubscriptions[jobID]; ok {
		return len(subs)
	}
	return 0
}

// Close gracefully terminates the hub.
func (h *Hub) Close() {
	close(h.stop)
}
