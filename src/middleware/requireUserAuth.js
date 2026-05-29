function requireUserAuth(req, res, next) {
  if (req.currentUser) {
    return next();
  }

  return res.status(401).json({ message: 'Session expired. Please sign in again.' });
}

module.exports = requireUserAuth;
