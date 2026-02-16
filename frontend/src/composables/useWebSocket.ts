import { ref, onUnmounted } from 'vue';

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'error' | 'reconnecting' | 'disconnected';

export function useWebSocket() {
  const ws = ref<WebSocket | null>(null);
  const isConnected = ref(false);
  const connectionState = ref<ConnectionState>('idle');
  const reconnectAttempts = ref(0);
  const maxReconnectAttempts = 5;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let pingInterval: ReturnType<typeof setInterval> | null = null;
  let onMessageCallback: ((data: any) => void) | null = null;
  let onErrorCallback: ((error: any) => void) | undefined = undefined;
  let onCloseCallback: (() => void) | undefined = undefined;
  let currentUrl: string = '';

  function startPing() {
    // 每30秒发送一次心跳，保持连接
    if (pingInterval) clearInterval(pingInterval);
    pingInterval = setInterval(() => {
      if (ws.value && ws.value.readyState === WebSocket.OPEN) {
        try {
          ws.value.send(JSON.stringify({ type: 'ping' }));
        } catch (error) {
          console.error('Ping failed:', error);
        }
      }
    }, 30000);
  }

  function stopPing() {
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
  }

  function attemptReconnect() {
    if (reconnectAttempts.value >= maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      if (onErrorCallback) {
        onErrorCallback(new Error('无法连接到服务器，请检查网络或刷新页面重试'));
      }
      return;
    }

    reconnectAttempts.value++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.value - 1), 10000);
    console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.value}/${maxReconnectAttempts})`);

    reconnectTimeout = setTimeout(() => {
      if (currentUrl && onMessageCallback) {
        connect(currentUrl, onMessageCallback, onErrorCallback, onCloseCallback).catch(() => {});
      }
    }, delay);
  }

  function connect(
    url: string,
    onMessage: (data: any) => void,
    onError?: (error: any) => void,
    onClose?: () => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false;
      try {
        // 保存回调和 URL 用于重连
        currentUrl = url;
        onMessageCallback = onMessage;
        onErrorCallback = onError;
        onCloseCallback = onClose;

        // 清理旧连接
        if (ws.value) {
          ws.value.close();
        }

        connectionState.value = 'connecting';
        ws.value = new WebSocket(url);

        // 设置连接超时
        const connectTimeout = setTimeout(() => {
          if (ws.value && ws.value.readyState !== WebSocket.OPEN) {
            ws.value.close();
            connectionState.value = 'error';
            if (!settled) { settled = true; reject(new Error('连接超时')); }
          }
        }, 10000);

        ws.value.onopen = () => {
          clearTimeout(connectTimeout);
          isConnected.value = true;
          connectionState.value = 'connected';
          reconnectAttempts.value = 0;
          startPing();
          console.log('WebSocket connected');
          if (!settled) { settled = true; resolve(); }
        };

        ws.value.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            // 忽略 pong 消息
            if (data.type !== 'pong') {
              onMessage(data);
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
            // 如果是纯文本错误消息，包装成错误对象传递
            if (typeof event.data === 'string' && event.data.length > 0) {
              onMessage({
                type: 'error',
                message: event.data
              });
            }
          }
        };

        ws.value.onerror = (error) => {
          clearTimeout(connectTimeout);
          connectionState.value = 'error';
          console.error('WebSocket error:', error);
          if (onError) onError(error);
        };

        ws.value.onclose = (event) => {
          clearTimeout(connectTimeout);
          stopPing();
          isConnected.value = false;
          console.log('WebSocket closed:', event.code, event.reason);

          if (onClose) onClose();

          // 非正常关闭且未达到最大重连次数，尝试重连
          if (!event.wasClean && reconnectAttempts.value < maxReconnectAttempts) {
            connectionState.value = 'reconnecting';
            attemptReconnect();
          } else if (event.code !== 1000) {
            connectionState.value = 'disconnected';
            if (!settled) { settled = true; reject(new Error(event.reason || '连接已断开')); }
          } else {
            connectionState.value = 'idle';
          }
        };
      } catch (error) {
        if (!settled) { settled = true; reject(error); }
      }
    });
  }

  function send(data: any): boolean {
    if (ws.value && ws.value.readyState === WebSocket.OPEN) {
      try {
        ws.value.send(JSON.stringify(data));
        return true;
      } catch (error) {
        console.error('Failed to send message:', error);
        return false;
      }
    }
    console.warn('WebSocket not connected, cannot send message');
    return false;
  }

  function disconnect() {
    stopPing();

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    reconnectAttempts.value = maxReconnectAttempts;

    if (ws.value) {
      ws.value.close(1000, 'User initiated close');
      ws.value = null;
      isConnected.value = false;
      connectionState.value = 'idle';
    }

    // 清理回调
    onMessageCallback = null;
    onErrorCallback = undefined;
    onCloseCallback = undefined;
    currentUrl = '';
  }

  onUnmounted(() => {
    disconnect();
  });

  return {
    connect,
    send,
    disconnect,
    isConnected,
    connectionState,
    reconnectAttempts,
  };
}
