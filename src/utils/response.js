function apiSuccess(res, data = null, message = null, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

function apiError(res, message = "An error occurred", statusCode = 400, details = null) {
  const payload = {
    success: false,
    error: message,
  };
  if (details && process.env.NODE_ENV !== "production") {
    payload.details = details;
  }
  return res.status(statusCode).json(payload);
}

module.exports = {
  apiSuccess,
  apiError,
};
