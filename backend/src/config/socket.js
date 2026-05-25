import { Server } from 'socket.io';

let io;

const buildAllowedOrigins = () => {
    const origins = new Set([
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://hrms.tectratechnologies.com',
    ]);
    if (process.env.FRONTEND_URL) origins.add(process.env.FRONTEND_URL);
    if (process.env.SOCKET_CORS_ORIGINS) {
        process.env.SOCKET_CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean).forEach((o) => origins.add(o));
    }
    return [...origins];
};

export const initSocket = (server) => {
    const allowedOrigins = buildAllowedOrigins();
    io = new Server(server, {
        cors: {
            origin: (origin, callback) => {
                if (!origin || allowedOrigins.includes(origin) || /\.vercel\.app$/i.test(origin)) {
                    callback(null, true);
                } else {
                    callback(new Error('Socket CORS blocked'));
                }
            },
            methods: ["GET", "POST"],
            credentials: true
        },
        transports: ['polling', 'websocket']
    });

    io.on('connection', (socket) => {
        console.log('New client connected:', socket.id);

        socket.on('join', (userId) => {
            socket.join(`user_${userId}`);
            console.log(`User ${userId} joined their room`);
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected', socket.id);
        });
    });

    return io;
};

export const getIo = () => {
    // Vercel check: If on serverless, io might not be available
    if (!io) {
        console.warn("Socket.io not initialized or running on Serverless environment!");
        return null;
    }
    return io;
};
