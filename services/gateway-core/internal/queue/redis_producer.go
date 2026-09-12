// Package queue provides Redis Stream and Pub/Sub producer capabilities
// for orchestrating tasks and dispatching events to worker microservices.
package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// Standard topic and stream names for render pipeline orchestration.
const (
	TopicScriptParse     = "jobs:script:parse"
	TopicTtsSynthesize   = "jobs:tts:synthesize"
	TopicAudioMaster     = "jobs:audio:master"
	TopicProgressEvents  = "msl:events:progress"
	StreamScriptParse    = "msl:stream:script"
	StreamTtsSynthesize  = "msl:stream:tts"
	StreamAudioMaster    = "msl:stream:audio"
	StreamProgressEvents = "msl:stream:progress"
)

// RedisProducer defines capabilities for dispatching jobs and saving state in Redis.
type RedisProducer interface {
	PublishEvent(ctx context.Context, channel string, payload interface{}) error
	DispatchToStream(ctx context.Context, stream string, values map[string]interface{}) (string, error)
	SaveJobState(ctx context.Context, jobID string, payload interface{}, ttl time.Duration) error
	GetJobState(ctx context.Context, jobID string) ([]byte, error)
	Ping(ctx context.Context) error
	Close() error
}

type redisProducer struct {
	client *redis.Client
}

// NewRedisClient creates and initializes a standard go-redis client.
func NewRedisClient(addr string) *redis.Client {
	return redis.NewClient(&redis.Options{
		Addr:         addr,
		PoolSize:     20,
		MinIdleConns: 5,
		DialTimeout:  3 * time.Second,
		ReadTimeout:  3 * time.Second,
		WriteTimeout: 3 * time.Second,
	})
}

// NewRedisProducer creates a RedisProducer wrapping a Redis client instance.
func NewRedisProducer(client *redis.Client) RedisProducer {
	return &redisProducer{
		client: client,
	}
}

// PublishEvent marshals payload to JSON and publishes it to a Redis Pub/Sub channel.
func (p *redisProducer) PublishEvent(ctx context.Context, channel string, payload interface{}) error {
	bytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal event payload: %w", err)
	}

	return p.client.Publish(ctx, channel, bytes).Err()
}

// DispatchToStream appends a structured entry into a Redis Stream.
func (p *redisProducer) DispatchToStream(ctx context.Context, stream string, values map[string]interface{}) (string, error) {
	entryID, err := p.client.XAdd(ctx, &redis.XAddArgs{
		Stream: stream,
		Values: values,
	}).Result()
	if err != nil {
		return "", fmt.Errorf("failed to dispatch to stream %s: %w", stream, err)
	}
	return entryID, nil
}

// SaveJobState stores any serializable job payload with a key and time-to-live.
func (p *redisProducer) SaveJobState(ctx context.Context, jobID string, payload interface{}, ttl time.Duration) error {
	key := fmt.Sprintf("msl:job:%s", jobID)
	bytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to serialize job %s: %w", jobID, err)
	}

	if ttl <= 0 {
		ttl = 24 * time.Hour
	}

	return p.client.Set(ctx, key, bytes, ttl).Err()
}

// GetJobState retrieves raw JSON bytes of a job state by its jobID.
func (p *redisProducer) GetJobState(ctx context.Context, jobID string) ([]byte, error) {
	key := fmt.Sprintf("msl:job:%s", jobID)
	data, err := p.client.Get(ctx, key).Bytes()
	if err != nil {
		return nil, fmt.Errorf("failed to get job state %s: %w", jobID, err)
	}
	return data, nil
}

// Ping verifies connectivity to the Redis broker.
func (p *redisProducer) Ping(ctx context.Context) error {
	return p.client.Ping(ctx).Err()
}

// Close gracefully closes the Redis client connection pool.
func (p *redisProducer) Close() error {
	return p.client.Close()
}
