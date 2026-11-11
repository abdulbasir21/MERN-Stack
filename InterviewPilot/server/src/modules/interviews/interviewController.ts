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

// Phase 7 Engine Controller Handlers (ENG-1 to ENG-10)
import {
  startInterviewEngine,
  submitCandidateAnswer,
  submitCandidateInquiry,
  endInterviewEarly,
  retryInterviewErrorState,
  getInterviewOrThrow,
  formatInterviewStateDto,
} from './interviewEngineService.js';
import {
  SubmitAnswerInputSchema,
  SubmitInquiryInputSchema,
} from '@interviewpilot/shared';

function extractClientRequestId(req: Request): string | undefined {
  const headerVal = req.headers['client-request-id'] || req.headers['x-client-request-id'];
  if (typeof headerVal === 'string' && headerVal.trim().length > 0) {
    return headerVal.trim();
  }
  if (req.body && typeof req.body.clientRequestId === 'string' && req.body.clientRequestId.trim().length > 0) {
    return req.body.clientRequestId.trim();
  }
  return undefined;
}

export async function handleStartInterview(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.actor) {
      throw new AppError('UNAUTHENTICATED', 'Authentication required.', 401);
    }

    const clientRequestId = extractClientRequestId(req);
    const state = await startInterviewEngine({
      interviewId: req.params.id as string,
      userId: req.actor.id,
      clientRequestId,
    });

    res.status(200).json({
      data: { state },
    });
  } catch (err) {
    next(err);
  }
}

export async function handleSubmitAnswer(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.actor) {
      throw new AppError('UNAUTHENTICATED', 'Authentication required.', 401);
    }

    const validatedInput = SubmitAnswerInputSchema.parse(req.body);
    const clientRequestId = extractClientRequestId(req);

    const result = await submitCandidateAnswer({
      interviewId: req.params.id as string,
      userId: req.actor.id,
      input: validatedInput,
      clientRequestId,
    });

    res.status(200).json({
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleSubmitInquiry(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.actor) {
      throw new AppError('UNAUTHENTICATED', 'Authentication required.', 401);
    }

    const validatedInput = SubmitInquiryInputSchema.parse(req.body);
    const clientRequestId = extractClientRequestId(req);

    const result = await submitCandidateInquiry({
      interviewId: req.params.id as string,
      userId: req.actor.id,
      input: validatedInput,
      clientRequestId,
    });

    res.status(200).json({
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleEndInterview(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.actor) {
      throw new AppError('UNAUTHENTICATED', 'Authentication required.', 401);
    }

    const state = await endInterviewEarly({
      interviewId: req.params.id as string,
      userId: req.actor.id,
    });

    res.status(200).json({
      data: { state },
    });
  } catch (err) {
    next(err);
  }
}

export async function handleRetryInterview(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.actor) {
      throw new AppError('UNAUTHENTICATED', 'Authentication required.', 401);
    }

    const state = await retryInterviewErrorState({
      interviewId: req.params.id as string,
      userId: req.actor.id,
    });

    res.status(200).json({
      data: { state },
    });
  } catch (err) {
    next(err);
  }
}

export async function handleGetInterviewState(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.actor) {
      throw new AppError('UNAUTHENTICATED', 'Authentication required.', 401);
    }

    const interview = await getInterviewOrThrow(req.params.id as string, req.actor.id);
    const state = formatInterviewStateDto(interview);

    res.status(200).json({
      data: { state },
    });
  } catch (err) {
    next(err);
  }
}
