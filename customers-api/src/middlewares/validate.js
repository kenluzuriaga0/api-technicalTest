const validate = (schema) => (req, res, next) => {
  try {
    // Validamos body, query y params
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    return res.status(400).json({ error: error.errors });
  }
};

module.exports = validate;