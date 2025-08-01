import { RealtimeChannel } from "@supabase/supabase-js";

interface ConnectionConfig {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  heartbeatInterval?: number;
}

export class ConnectionManager {
  private retryCount = 0;
  private heartbeatTimer?: NodeJS.Timeout;
  private reconnectTimer?: NodeJS.Timeout;
  private lastActivity = Date.now();

  constructor(
    private config: ConnectionConfig = {
      maxRetries: 5,
      baseDelay: 1000,
      maxDelay: 30000,
      heartbeatInterval: 30000,
    }
  ) {}

  startHeartbeat(channel: RealtimeChannel) {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      const idleTime = now - this.lastActivity;

      // Send heartbeat if idle for longer than half the interval
      if (idleTime > this.config.heartbeatInterval! / 2) {
        channel
          .send({
            type: "broadcast",
            event: "heartbeat",
            payload: { timestamp: now },
          })
          .catch((error) => {
            console.warn("Heartbeat failed:", error);
          });
      }
    }, this.config.heartbeatInterval!);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  updateActivity() {
    this.lastActivity = Date.now();
  }

  async reconnect(
    connectFn: () => Promise<RealtimeChannel>,
    onSuccess: (channel: RealtimeChannel) => void,
    onFailure: (error: Error) => void
  ) {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.retryCount >= this.config.maxRetries!) {
      onFailure(new Error("Max reconnection attempts reached"));
      return;
    }

    const delay = Math.min(this.config.baseDelay! * Math.pow(2, this.retryCount), this.config.maxDelay!);

    console.log(`Reconnecting in ${delay}ms (attempt ${this.retryCount + 1}/${this.config.maxRetries})`);

    this.reconnectTimer = setTimeout(async () => {
      try {
        const channel = await connectFn();
        this.retryCount = 0;
        onSuccess(channel);
      } catch (error) {
        this.retryCount++;
        this.reconnect(connectFn, onSuccess, onFailure);
      }
    }, delay);
  }

  reset() {
    this.retryCount = 0;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }

  destroy() {
    this.reset();
  }
}
