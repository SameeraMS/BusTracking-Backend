const WebSocket = require('ws');
const { gpsProcessingService } = require('./gpsProcessingService');

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // Map of client connections with metadata
    this.rooms = new Map(); // Geographic area-based rooms for efficient broadcasting
    this.isRunning = false;
    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      messagesSent: 0,
      messagesReceived: 0,
      lastBroadcast: null
    };
  }

  initialize(server) {
    try {
      // Create WebSocket server
      this.wss = new WebSocket.Server({ 
        server,
        path: '/ws',
        perMessageDeflate: false
      });

      this.wss.on('connection', (ws, req) => {
        this.handleConnection(ws, req);
      });

      this.wss.on('error', (error) => {
        console.error('WebSocket Server Error:', error);
      });

      // Set up periodic cleanup
      this.setupCleanup();

      this.isRunning = true;
      console.log('WebSocket service initialized successfully');
      
      return true;
    } catch (error) {
      console.error('Failed to initialize WebSocket service:', error);
      return false;
    }
  }

  handleConnection(ws, req) {
    const clientId = this.generateClientId();
    const clientInfo = {
      id: clientId,
      ws: ws,
      isAlive: true,
      connectedAt: new Date(),
      lastPing: new Date(),
      subscriptions: new Set(), // Geographic areas this client is subscribed to
      userAgent: req.headers['user-agent'] || 'Unknown',
      ip: req.connection.remoteAddress || 'Unknown'
    };

    this.clients.set(clientId, clientInfo);
    this.stats.totalConnections++;
    this.stats.activeConnections++;

    console.log(`WebSocket client connected: ${clientId} (Total: ${this.stats.activeConnections})`);

    // Send welcome message with client ID
    this.sendToClient(clientId, {
      type: 'connection',
      clientId: clientId,
      timestamp: new Date().toISOString(),
      message: 'Connected to real-time GPS tracking service'
    });

    // Set up message handlers
    ws.on('message', (data) => {
      this.handleMessage(clientId, data);
    });

    ws.on('close', (code, reason) => {
      this.handleDisconnection(clientId, code, reason);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket client error (${clientId}):`, error);
      this.handleDisconnection(clientId, 1006, 'Connection error');
    });

    // Set up ping/pong for connection health
    ws.on('pong', () => {
      if (this.clients.has(clientId)) {
        this.clients.get(clientId).isAlive = true;
        this.clients.get(clientId).lastPing = new Date();
      }
    });
  }

  handleMessage(clientId, data) {
    try {
      this.stats.messagesReceived++;
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'subscribe':
          this.handleSubscription(clientId, message);
          break;
        case 'unsubscribe':
          this.handleUnsubscription(clientId, message);
          break;
        case 'ping':
          this.sendToClient(clientId, { type: 'pong', timestamp: new Date().toISOString() });
          break;
        default:
          console.warn(`Unknown message type from client ${clientId}:`, message.type);
      }
    } catch (error) {
      console.error(`Error handling message from client ${clientId}:`, error);
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Invalid message format',
        timestamp: new Date().toISOString()
      });
    }
  }

  handleSubscription(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { area, bounds } = message;
    
    if (area && bounds) {
      // Subscribe to geographic area updates
      client.subscriptions.add(area);
      
      // Add client to room
      if (!this.rooms.has(area)) {
        this.rooms.set(area, new Set());
      }
      this.rooms.get(area).add(clientId);

      console.log(`Client ${clientId} subscribed to area: ${area}`);
      
      // Send current bus locations in the area
      this.sendCurrentLocationsInArea(clientId, bounds);
      
      this.sendToClient(clientId, {
        type: 'subscribed',
        area: area,
        timestamp: new Date().toISOString()
      });
    }
  }

  handleUnsubscription(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { area } = message;
    
    if (area && client.subscriptions.has(area)) {
      client.subscriptions.delete(area);
      
      // Remove client from room
      if (this.rooms.has(area)) {
        this.rooms.get(area).delete(clientId);
        if (this.rooms.get(area).size === 0) {
          this.rooms.delete(area);
        }
      }

      console.log(`Client ${clientId} unsubscribed from area: ${area}`);
      
      this.sendToClient(clientId, {
        type: 'unsubscribed',
        area: area,
        timestamp: new Date().toISOString()
      });
    }
  }

  handleDisconnection(clientId, code, reason) {
    const client = this.clients.get(clientId);
    if (client) {
      // Remove from all rooms
      client.subscriptions.forEach(area => {
        if (this.rooms.has(area)) {
          this.rooms.get(area).delete(clientId);
          if (this.rooms.get(area).size === 0) {
            this.rooms.delete(area);
          }
        }
      });

      this.clients.delete(clientId);
      this.stats.activeConnections--;
      
      console.log(`WebSocket client disconnected: ${clientId} (Code: ${code}, Reason: ${reason || 'Unknown'}) (Remaining: ${this.stats.activeConnections})`);
    }
  }

  // Broadcast location update to relevant clients
  broadcastLocationUpdate(locationData) {
    if (!this.isRunning || this.stats.activeConnections === 0) {
      return;
    }

    try {
      const message = {
        type: 'location_update',
        data: {
          driverId: locationData.driverId,
          busId: locationData.busId,
          routeId: locationData.routeId,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          heading: locationData.heading,
          speed: locationData.speed,
          accuracy: locationData.accuracy,
          status: locationData.status,
          timestamp: locationData.timestamp
        },
        timestamp: new Date().toISOString()
      };

      // Broadcast to all connected clients (simplified approach)
      // In production, this should be optimized to only send to clients in relevant geographic areas
      let sentCount = 0;
      this.clients.forEach((client, clientId) => {
        if (client.ws.readyState === WebSocket.OPEN) {
          this.sendToClient(clientId, message);
          sentCount++;
        }
      });

      this.stats.lastBroadcast = new Date();
      console.log(`Broadcasted location update for bus ${locationData.busId} to ${sentCount} clients`);
      
    } catch (error) {
      console.error('Error broadcasting location update:', error);
    }
  }

  // Broadcast driver status change
  broadcastDriverStatusChange(driverId, status, busId, routeId) {
    if (!this.isRunning || this.stats.activeConnections === 0) {
      return;
    }

    const message = {
      type: 'driver_status',
      data: {
        driverId: driverId,
        busId: busId,
        routeId: routeId,
        status: status,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };

    let sentCount = 0;
    this.clients.forEach((client, clientId) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        this.sendToClient(clientId, message);
        sentCount++;
      }
    });

    console.log(`Broadcasted driver status change (${status}) for ${driverId} to ${sentCount} clients`);
  }

  sendCurrentLocationsInArea(clientId, bounds) {
    try {
      // Get current locations from GPS processing service
      gpsProcessingService.getCurrentLocations().then(currentLocations => {
        if (!Array.isArray(currentLocations)) {
          console.log('No current locations available or invalid format');
          return;
        }
        
        // Filter locations within bounds (simplified - in production use proper geospatial queries)
        const locationsInArea = currentLocations.filter(location => {
          return location.latitude >= bounds.south &&
                 location.latitude <= bounds.north &&
                 location.longitude >= bounds.west &&
                 location.longitude <= bounds.east;
        });

        if (locationsInArea.length > 0) {
          this.sendToClient(clientId, {
            type: 'initial_locations',
            data: locationsInArea,
            timestamp: new Date().toISOString()
          });
        }
      }).catch(error => {
        console.error('Error getting current locations:', error);
      });
    } catch (error) {
      console.error('Error sending current locations:', error);
    }
  }

  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
        this.stats.messagesSent++;
        return true;
      } catch (error) {
        console.error(`Error sending message to client ${clientId}:`, error);
        this.handleDisconnection(clientId, 1006, 'Send error');
        return false;
      }
    }
    return false;
  }

  setupCleanup() {
    // Ping clients every 30 seconds to check connection health
    setInterval(() => {
      this.clients.forEach((client, clientId) => {
        if (client.ws.readyState === WebSocket.OPEN) {
          if (!client.isAlive) {
            console.log(`Terminating inactive client: ${clientId}`);
            client.ws.terminate();
            this.handleDisconnection(clientId, 1000, 'Ping timeout');
            return;
          }
          
          client.isAlive = false;
          client.ws.ping();
        } else {
          this.handleDisconnection(clientId, 1006, 'Connection closed');
        }
      });
    }, 30000);

    // Clean up empty rooms every 5 minutes
    setInterval(() => {
      this.rooms.forEach((clients, area) => {
        if (clients.size === 0) {
          this.rooms.delete(area);
        }
      });
    }, 300000);
  }

  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getStats() {
    return {
      ...this.stats,
      activeConnections: this.clients.size,
      totalRooms: this.rooms.size,
      isRunning: this.isRunning
    };
  }

  // Graceful shutdown
  shutdown() {
    if (this.wss) {
      console.log('Shutting down WebSocket service...');
      
      // Notify all clients of shutdown
      this.clients.forEach((client, clientId) => {
        this.sendToClient(clientId, {
          type: 'shutdown',
          message: 'Server is shutting down',
          timestamp: new Date().toISOString()
        });
      });

      // Close all connections
      this.wss.close(() => {
        console.log('WebSocket service shut down successfully');
      });
      
      this.isRunning = false;
    }
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

module.exports = { websocketService };