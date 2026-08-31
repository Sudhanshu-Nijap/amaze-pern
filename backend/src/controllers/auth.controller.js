const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { query } = require("../services/db.service");

const register = async (req, res) => {
  const { email, password, firstName, lastName } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    // Check if user already exists
    const existingRes = await query("SELECT id FROM scraper_customuser WHERE email = $1 LIMIT 1", [email]);
    if (existingRes.rows.length > 0) {
      return res.status(400).json({ error: "A user with this email already exists." });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user into DB
    const insertRes = await query(
      `INSERT INTO scraper_customuser (email, password, first_name, last_name, is_active, is_staff, is_superuser, last_login)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, email, first_name, last_name`,
      [email, hashedPassword, firstName || "", lastName || "", true, false, false, new Date()]
    );

    const user = insertRes.rows[0];

    const userResponse = {
      id: user.id,
      email: user.email,
      user_metadata: {
        first_name: user.first_name,
        last_name: user.last_name,
      },
    };

    res.status(201).json({ message: "Registration successful", user: userResponse });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(400).json({ error: error.message });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    // Find user in database
    const userRes = await query("SELECT * FROM scraper_customuser WHERE email = $1 LIMIT 1", [email]);
    const dbUser = userRes.rows[0];

    if (!dbUser) {
      return res.status(400).json({ error: "Invalid email or password." });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, dbUser.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password." });
    }

    // Update last login
    await query("UPDATE scraper_customuser SET last_login = $1 WHERE id = $2", [new Date(), dbUser.id]);

    // Sign JWT
    const token = jwt.sign(
      { id: dbUser.id, email: dbUser.email },
      process.env.JWT_SECRET || "super_secret_jwt_key_for_amaze_pern_stack_app",
      { expiresIn: "7d" }
    );

    const userResponse = {
      id: dbUser.id,
      email: dbUser.email,
      user_metadata: {
        first_name: dbUser.first_name,
        last_name: dbUser.last_name,
      },
    };

    const data = {
      session: {
        access_token: token,
        user: userResponse,
      },
      user: userResponse,
    };

    res.status(200).json(data);
  } catch (error) {
    console.error("Login error:", error);
    res.status(400).json({ error: error.message });
  }
};

const logout = async (req, res) => {
  try {
    // With stateless JWT, client deletes the token. Just return success.
    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  register,
  login,
  logout,
};
