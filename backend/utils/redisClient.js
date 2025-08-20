// utils/redisClient.js
const redis = require('redis');

class RedisClient {
  constructor() {
    this.client = null;
    this.connect();
  }

  connect() {
    this.client = redis.createClient({
      url: process.env.REDIS_URL,
      password: process.env.REDIS_PASSWORD
    });

    this.client.on('connect', () => {
      console.log('Redis client connected');
    });

    this.client.on('error', (err) => {
      console.error('Redis client error:', err);
    });

    this.client.connect();
  }

  async set(key, value, expiration = 3600) {
    try {
      await this.client.set(key, value, {
        EX: expiration
      });
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  async get(key) {
    try {
      return await this.client.get(key);
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error('Redis delete error:', error);
    }
  }

  async publish(channel, message) {
    try {
      await this.client.publish(channel, message);
    } catch (error) {
      console.error('Redis publish error:', error);
    }
  }

  async subscribe(channel, callback) {
    try {
      const subscriber = this.client.duplicate();
      await subscriber.connect();
      await subscriber.subscribe(channel, callback);
      return subscriber;
    } catch (error) {
      console.error('Redis subscribe error:', error);
    }
  }
}

module.exports = new RedisClient();