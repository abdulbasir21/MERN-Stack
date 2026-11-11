import type { Request, Response, NextFunction } from 'express';
import {
  createInterview,
  getInterviewById,
  listInterviewsForUser,
} from './interviewService.js';
import { CreateInterviewInputSchema } from '@interviewpilot/shared';
import { AppError } from '../../lib/errors.js';

export async function handleCreateInterview(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.actor) {
      throw new AppError('UNAUTHENTICATED', 'Authentication required.', 401);
    }

    const validatedInput = CreateInterviewInputSchema.parse(req.body);
    const result = await createInterview({
      userId: req.actor.id,
      isDemo: req.actor.isDemo,
      input: validatedInput,
    });

    res.status(201).json({
      data: { interview: result },
    });
  } catch (err) {
    next(err);
  }
}

export async function handleGetInterview(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.actor) {
      throw new AppError('UNAUTHENTICATED', 'Authentication required.', 401);
    }

    const interview = await getInterviewById({
      userId: req.actor.id,
      interviewId: req.params.id as string,
    });

    res.status(200).json({
      data: { interview },
    });
  } catch (err) {
    next(err);
  }
}

export async function handleListInterviews(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.actor) {
      throw new AppError('UNAUTHENTICATED', 'Authentication required.', 401);
    }

    const interviews = await listInterviewsForUser(req.actor.id);

    res.status(200).json({
      data: { interviews },
    });
  } catch (err) {
    next(err);
  }
}
