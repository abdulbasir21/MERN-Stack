export const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body); // validated + sanitized
    next();
  } catch (error) {
    // Check if this is a ZodError
    let messages = [];

    if (error?.issues && Array.isArray(error.issues)) {
      // Map Zod issues to clean messages
      messages = error.issues.map(
        (issue) => `${issue.path.join('.')}: ${issue.message}`
      );
    } else if (Array.isArray(error.errors)) {
      // fallback for older versions
      messages = error.errors.map(
        (err) => `${err.path.join('.')}: ${err.message}`
      );
    } else {
      messages = [error.message || "Invalid input"];
    }

    return res.status(400).json({
      success: false,
      message: messages.join(" | "), // single string for toast
      errors: messages, // optional array of messages
    });
  }
};
