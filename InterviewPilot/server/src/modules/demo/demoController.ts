import { Request, Response, NextFunction } from 'express';
import { createDemoSession, getSampleDemoFixtures } from '../../services/demo/demoService.js';
import { AUTH_COOKIE_NAME } from '../../config/constants.js';

export async function handleCreateDemoSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || '127.0.0.1';

    const result = await createDemoSession(clientIp);

    // Set HTTP-only cookie
    res.cookie(AUTH_COOKIE_NAME, result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    res.status(201).json({
      data: {
        user: result.user,
        session: result.session,
        limits: {
          maxInterviews: 1,
          maxMinutes: 5,
          maxQuestions: 3,
        },
      },
      meta: {
        requestId: req.requestId,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function handleGetDemoSamples(
  req: Request,
  res: Response
): Promise<void> {
  const samples = getSampleDemoFixtures();
  res.status(200).json({
    data: samples,
    meta: {
      requestId: req.requestId,
    },
  });
}
