import { prisma } from './prisma.js';

export async function notify(
  userId: string,
  type: string,
  message: string,
  link?: string
) {
  try {
    return await prisma.notification.create({
      data: {
        userId,
        type,
        message,
        link: link || null,
        isRead: false,
      },
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
}
