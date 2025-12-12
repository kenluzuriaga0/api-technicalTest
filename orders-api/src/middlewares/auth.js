const SERVICE_TOKEN = process.env.SERVICE_TOKEN || 'TOKEN_SUPER_SECRETO_593';

const internalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${SERVICE_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized: Invalid Service Token' });
  }
  next();
};

module.exports = { internalAuth };