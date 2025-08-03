const jwt = require('jsonwebtoken');

const authMiddleware = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded.userId || !decoded.role) {
            return res.status(401).json({ message: 'Unauthorized: Invalid token payload' });
        }
        console.log("name",decoded?.name)
        req.user = {
            _id: decoded.userId,
            role: decoded.role,
            name: decoded.name
        };
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({ message: 'Unauthorized: Invalid or expired token' });
    }
};

const isAdmin = async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied: Admins only' });
  }
  next();
};

module.exports = {authMiddleware,isAdmin};