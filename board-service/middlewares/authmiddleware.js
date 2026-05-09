const jwt = require("jsonwebtoken");

const authMiddleware = (accessSecret) => {
  return (req, res, next) => {
    try {
      let token = null;

      // 1. Check Authorization header
      if (req.headers.authorization) {
        token = req.headers.authorization.split(" ")[1];
      }

      // 2. Fallback to cookies
      if (!token && req.cookies && req.cookies.accessToken) {
        token = req.cookies.accessToken;
      }

      if (!token) {
        return res.status(401).json({ message: "No token provided" });
      }

      // 3. Verify token
      const decoded = jwt.verify(token, accessSecret);

      if (decoded.type !== "access") {
        return res.status(401).json({ message: "Invalid token type" });
      }

      // 4. Attach user info
      const userInfo={
        userId:decoded.sub,
        email:decoded.email,
        name:decoded.name
      }
      req.user = userInfo;
      next();
    } catch (err) {
      return res.status(401).json({
        message: "Invalid or expired token",
        error: err.message,
      });
    }
  };
};

module.exports = authMiddleware;