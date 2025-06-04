import { Server } from 'socket.io';

export const onlineUsers = new Map<string, string>(); // userId -> socketId
export let io: Server;

export function initSocket(server: any): void {
  io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'], credentials: true },
  });
}
