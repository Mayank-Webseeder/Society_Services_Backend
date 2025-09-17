const jwt = require("jsonwebtoken");

// Verify JWT and attach user to request
exports.authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ msg: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // contains: { id, role, subrole (optional) }
    next();
  } catch (err) {
    return res.status(401).json({ msg: "Invalid or expired token" });
  }
};

//  Allow only certain roles to access a route
exports.authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ msg: "Forbidden: Role not authorized" });
    }
    next();
  };
};
// By Passing allowedRoles(Admin,Society) now only admin and society can access the route

//  Allow only certain subroles within admin
// Like Mayank Sir Told me about the subroles that SuperAdmin Can assign so it can create sub-admin or admins
exports.authorizeSubrole = (...allowedSubroles) => {
  return (req, res, next) => {
    if (
      req.user.role !== "admin" ||
      !req.user.subrole ||
      !allowedSubroles.includes(req.user.subrole)
    ) {
      return res.status(403).json({ msg: "Forbidden: Subrole not authorized" });
    }
    next();
  };
};
