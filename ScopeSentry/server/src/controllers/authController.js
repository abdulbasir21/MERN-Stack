import {
  registerUser,
  loginUser,
  requestPasswordReset,
  resetPassword,
  getUserProfile,
  updateUserSettings
} from '../services/authService.js';
import { issueCsrfToken } from '../middleware/csrf.js';
import { config } from '../config/env.js';

const SESSION_COOKIE_NAME = 'scopesentry_session';

function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: config.cookieSameSite,
    domain: config.cookieDomain,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
}

export async function register(req, res, next) {
  try {
    const { email, password, name } = req.body;
    const { user, sessionToken } = await registerUser({ email, password, name });
    setSessionCookie(res, sessionToken);

    res.status(201).json({
      data: { user }
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const { user, sessionToken } = await loginUser({ email, password });
    setSessionCookie(res, sessionToken);

    res.status(200).json({
      data: { user }
    });
  } catch (err) {
    next(err);
  }
}

export function logout(req, res) {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: config.cookieSameSite,
    domain: config.cookieDomain,
    path: '/'
  });

  res.status(200).json({
    data: { message: 'Logged out successfully' }
  });
}

export async function getMe(req, res, next) {
  try {
    const user = await getUserProfile(req.user.id);
    res.status(200).json({
      data: { user }
    });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const result = await requestPasswordReset(email);
    res.status(200).json({
      data: result
    });
  } catch (err) {
    next(err);
  }
}

export async function resetPasswordHandler(req, res, next) {
  try {
    const { token, newPassword } = req.body;
    const result = await resetPassword({ token, newPassword });
    res.status(200).json({
      data: result
    });
  } catch (err) {
    next(err);
  }
}

export function getCsrfToken(req, res) {
  const token = issueCsrfToken(res);
  res.status(200).json({
    data: { csrfToken: token }
  });
}

export async function getSettings(req, res, next) {
  try {
    const user = await getUserProfile(req.user.id);
    res.status(200).json({
      data: { settings: { id: user.id, name: user.name, email: user.email } }
    });
  } catch (err) {
    next(err);
  }
}

export async function updateSettings(req, res, next) {
  try {
    const { name, currentPassword, newPassword } = req.body;
    const updated = await updateUserSettings(req.user.id, { name, currentPassword, newPassword });
    res.status(200).json({
      data: { settings: { id: updated.id, name: updated.name, email: updated.email } }
    });
  } catch (err) {
    next(err);
  }
}
