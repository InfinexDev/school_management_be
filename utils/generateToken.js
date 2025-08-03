const jwt = require('jsonwebtoken')
require('dotenv').config()

module.exports = generateTokens = (user) => {
    const accessToken = jwt.sign(
        { userId: user._id, role: user.role,name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: '6d' }
    );

    const refreshToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
};