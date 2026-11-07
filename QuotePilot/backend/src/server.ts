import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { Inquiry } from './models/Inquiry';
import { Message } from './models/Message';
import { createApp } from './app';
import { env } from './config/env';

// In-memory rate limiter for socket messages (30 msgs/min per user)
const socketMessageCounts = new Map<string, { count: number; resetAt: number }>();

export const startServer = async () => {
  const app = createApp();
  const httpServer = http.createServer(app);

  // Initialize Socket.io
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: [env.CLIENT_URL, 'http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 30000,
    pingInterval: 25000,
  });

  // Attach io instance to app for routes that need it
  app.set('io', io);

  // Authenticate socket handshake using JWT
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers.authorization?.startsWith('Bearer ')
        ? socket.handshake.headers.authorization.split(' ')[1]
        : null);

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as {
        id: string;
        role: string;
        companyId?: string;
      };
      socket.data.user = decoded;
      next();
    } catch {
      next(new Error('Invalid or expired socket authentication token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;

    // Join user's private notification room (API Contract §14 & OQ-25)
    if (user?.id) {
      socket.join(`user:${user.id}`);
    }

    // Room join: customer or company desk joining inquiry discussion room
    const handleJoin = async (
      data: { inquiryId: string },
      callback?: (res: { ok: boolean; code?: string; message?: string }) => void
    ) => {
      try {
        if (!data?.inquiryId || !mongoose.Types.ObjectId.isValid(data.inquiryId)) {
          if (callback) callback({ ok: false, code: 'INVALID_ID' });
          return socket.emit('socket_error', { message: 'Valid inquiryId is required' });
        }

        const inquiry = await Inquiry.findById(data.inquiryId);
        if (!inquiry) {
          if (callback) callback({ ok: false, code: 'NOT_FOUND' });
          return socket.emit('socket_error', { message: 'Inquiry docket not found' });
        }

        const isCustomer = user.role === 'customer' && inquiry.customerId.toString() === user.id;
        const isCompanyAdmin =
          user.role === 'company_admin' &&
          user.companyId &&
          inquiry.companyId.toString() === user.companyId;

        if (!isCustomer && !isCompanyAdmin && user.role !== 'platform_admin') {
          if (callback) callback({ ok: false, code: 'FORBIDDEN' });
          return socket.emit('socket_error', { message: 'Tenant isolation: access denied to room' });
        }

        socket.join(`inquiry:${data.inquiryId}`);
        socket.emit('inquiry_joined', { inquiryId: data.inquiryId });
        if (callback) callback({ ok: true });
      } catch (err: any) {
        if (callback) callback({ ok: false, message: err.message });
        socket.emit('socket_error', { message: err.message || 'Failed to join inquiry room' });
      }
    };

    socket.on('inquiry:join', handleJoin);
    socket.on('join_inquiry', handleJoin);

    const handleLeave = (data: { inquiryId: string }) => {
      if (data?.inquiryId) {
        socket.leave(`inquiry:${data.inquiryId}`);
      }
    };

    socket.on('inquiry:leave', handleLeave);
    socket.on('leave_inquiry', handleLeave);

    // Socket message send: message:send (API Contract §14)
    socket.on(
      'message:send',
      async (
        data: { inquiryId: string; text: string; clientId?: string },
        ack?: (res: { ok: boolean; message?: any; error?: string }) => void
      ) => {
        try {
          // Rate limit: 30 messages/min/user
          const now = Date.now();
          const rateData = socketMessageCounts.get(user.id) || { count: 0, resetAt: now + 60000 };
          if (now > rateData.resetAt) {
            rateData.count = 0;
            rateData.resetAt = now + 60000;
          }
          if (rateData.count >= 30) {
            const errRes = { ok: false, error: 'Rate limit exceeded: max 30 messages per minute' };
            if (ack) ack(errRes);
            return socket.emit('socket_error', errRes);
          }
          rateData.count += 1;
          socketMessageCounts.set(user.id, rateData);

          if (!data?.inquiryId || !mongoose.Types.ObjectId.isValid(data.inquiryId)) {
            const errRes = { ok: false, error: 'Valid inquiryId is required' };
            if (ack) ack(errRes);
            return socket.emit('socket_error', errRes);
          }

          if (!data?.text || !data.text.trim()) {
            const errRes = { ok: false, error: 'Message text cannot be empty' };
            if (ack) ack(errRes);
            return socket.emit('socket_error', errRes);
          }

          if (data.text.length > 2000) {
            const errRes = { ok: false, error: 'Message cannot exceed 2000 characters' };
            if (ack) ack(errRes);
            return socket.emit('socket_error', errRes);
          }

          const inquiry = await Inquiry.findById(data.inquiryId);
          if (!inquiry) {
            const errRes = { ok: false, error: 'Inquiry not found' };
            if (ack) ack(errRes);
            return socket.emit('socket_error', errRes);
          }

          const isCustomer = user.role === 'customer' && inquiry.customerId.toString() === user.id;
          const isCompanyAdmin =
            user.role === 'company_admin' &&
            user.companyId &&
            inquiry.companyId.toString() === user.companyId;

          if (!isCustomer && !isCompanyAdmin && user.role !== 'platform_admin') {
            const errRes = { ok: false, error: 'Tenant isolation: forbidden' };
            if (ack) ack(errRes);
            return socket.emit('socket_error', errRes);
          }

          const senderRole = user.role === 'customer' ? 'customer' : 'company_admin';
          const message = await Message.create({
            inquiryId: inquiry._id,
            senderId: new mongoose.Types.ObjectId(user.id),
            senderRole,
            type: 'text',
            text: data.text.trim(),
          });

          inquiry.lastMessageAt = new Date();
          inquiry.lastMessagePreview =
            data.text.trim().length > 100
              ? `${data.text.trim().slice(0, 100)}...`
              : data.text.trim();

          if (inquiry.status === 'submitted') {
            inquiry.status = 'in_discussion';
          }
          await inquiry.save();

          const formattedMessage = {
            id: message._id.toString(),
            inquiryId: message.inquiryId.toString(),
            senderId: user.id,
            senderRole,
            type: message.type,
            text: message.text,
            createdAt: message.createdAt,
            clientId: data.clientId,
          };

          // Broadcast to inquiry room
          io.to(`inquiry:${data.inquiryId}`).emit('message:new', formattedMessage);

          if (ack) {
            ack({ ok: true, message: formattedMessage });
          }
        } catch (err: any) {
          const errRes = { ok: false, error: err.message || 'Failed to send message' };
          if (ack) ack(errRes);
          socket.emit('socket_error', errRes);
        }
      }
    );

    socket.on('disconnect', () => {
      // Disconnect cleanup
    });
  });

  // Connect to MongoDB
  try {
    console.log('[Database] Connecting to MongoDB Atlas...');
    await mongoose.connect(env.MONGOURL, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log('[Database] ✅ MongoDB Atlas connected successfully.');
  } catch (err) {
    console.error('[Database] ❌ MongoDB connection error:', err);
    process.exit(1);
  }

  // Start HTTP Server
  httpServer.listen(env.PORT, () => {
    console.log(`[Server] 🚀 QuotePilot Backend running on http://localhost:${env.PORT}`);
    console.log(`[Server] Health check available at: http://localhost:${env.PORT}/api/v1/health`);
    console.log(`[Server] Environment: ${env.NODE_ENV}`);
  });

  // Graceful Shutdown
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n[Server] Received ${signal}. Gracefully shutting down...`);
    httpServer.close(async () => {
      console.log('[Server] HTTP server closed.');
      try {
        await mongoose.connection.close();
        console.log('[Database] MongoDB connection closed.');
        process.exit(0);
      } catch (err) {
        console.error('[Database] Error during disconnect:', err);
        process.exit(1);
      }
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  return { app, httpServer, io };
};

// Auto-start server when executed directly or in development/production
if (process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    console.error('[Fatal Error] Failed to start server:', err);
    process.exit(1);
  });
}
