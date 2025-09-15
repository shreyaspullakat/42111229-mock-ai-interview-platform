import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
  console.log('Auth middleware called for path:', req.path);
  
  // Check for Authorization header
  const authHeader = req.headers.authorization;
  console.log('Auth headers:', req.headers);
  
  if (!authHeader) {
    console.log('No authorization header found');
    return res.status(401).json({ 
      success: false,
      error: "No token provided",
      code: "NO_TOKEN"
    });
  }

  // Extract token
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    console.log('Invalid token format');
    return res.status(401).json({ 
      success: false,
      error: "Invalid token format. Use 'Bearer <token>'",
      code: "INVALID_TOKEN_FORMAT"
    });
  }

  const token = parts[1];
  
  try {
    console.log('Verifying token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded || !decoded.id) {
      console.log('Token missing required fields:', decoded);
      return res.status(401).json({ 
        success: false,
        error: "Invalid token payload",
        code: "INVALID_TOKEN_PAYLOAD"
      });
    }
    
    console.log('Token verified for user ID:', decoded.id);
    req.user = { id: decoded.id };
    next();
    
  } catch (err) {
    console.error('Token verification failed:', err.name, err.message);
    
    let errorMessage = "Invalid token";
    let statusCode = 401;
    let errorCode = "INVALID_TOKEN";
    
    if (err.name === 'TokenExpiredError') {
      errorMessage = "Token has expired";
      errorCode = "TOKEN_EXPIRED";
    } else if (err.name === 'JsonWebTokenError') {
      errorMessage = "Invalid token";
      errorCode = "MALFORMED_TOKEN";
    }
    
    res.status(statusCode).json({ 
      success: false,
      error: errorMessage,
      code: errorCode
    });
  }
};
