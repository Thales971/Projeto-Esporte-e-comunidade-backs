export const authorize = (...roles) => (req, res, next) => {
  if (!req.usuario) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  if (!roles.includes(req.usuario.papel)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  next();
};