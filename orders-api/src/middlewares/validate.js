const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers // Idempotency Key
    });
    next();
  } catch (error) {
    return res.status(400).json({ error: error.errors });
  }
};

module.exports = validate;