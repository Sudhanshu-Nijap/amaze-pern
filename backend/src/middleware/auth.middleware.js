const supabase = require("../services/supabase.service");

const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization header" });
  }

  const token = authHeader.split(" ")[1];

  let retries = 3;
  let delay = 1000;

  while (retries > 0) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { data: dbUser } = await supabase
        .from("scraper_customuser")
        .select("id")
        .eq("email", user.email)
        .single();

      req.user = { ...user, djangoId: dbUser?.id };
      return next();
    } catch (error) {
      retries -= 1;
      if (retries === 0) {
        console.error("Auth Middleware Error after retries:", error.message);
        return res.status(503).json({ error: "Authentication service temporarily unavailable. Please check your internet connection." });
      }
      console.log(`Retrying authentication (${3 - retries}/3)...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
};

module.exports = { requireAuth };
