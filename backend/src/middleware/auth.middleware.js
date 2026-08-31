const jwt = require("jsonwebtoken");
const { query } = require("../services/db.service");

const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization header" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "super_secret_jwt_key_for_amaze_pern_stack_app");
    
    const dbUserRes = await query(
      "SELECT id, email, is_active FROM scraper_customuser WHERE id = $1 LIMIT 1",
      [decoded.id]
    );

    const dbUser = dbUserRes.rows[0];
    if (!dbUser || !dbUser.is_active) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      djangoId: dbUser.id
    };
    
    return next();
  } catch (error) {
    console.error("Auth Middleware Error:", error.message);
    return res.status(401).json({ error: "Unauthorized or invalid token" });
  }
};

module.exports = { requireAuth };
