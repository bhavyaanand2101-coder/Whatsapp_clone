const { apiError } = require("../utils/response");

/**
 * Higher-order middleware to validate incoming request data using Zod schema
 * @param {import("zod").ZodSchema} schema
 * @param {"body" | "query" | "params"} source
 */
function validateRequest(schema, source = "body") {
  return (req, res, next) => {
    try {
      const parsed = schema.safeParse(req[source]);
      if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        }));
        return apiError(res, "Validation error: " + issues.map((i) => i.message).join(", "), 400, {
          errors: issues,
        });
      }
      // Replace with sanitized/validated data
      req[source] = parsed.data;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { validateRequest };
