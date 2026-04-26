const supabase = require("../services/supabase.service");

const register = async (req, res) => {
  const { email, password, firstName, lastName } = req.body;

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });

    if (error) throw error;

    // Create shadow user in scraper_customuser (Django logic)
    // We let the database generate the integer ID, and we match by email
    await supabase.from("scraper_customuser").upsert({
      email,
      first_name: firstName,
      last_name: lastName || "",
      is_active: true,
      is_staff: false,
      is_superuser: false,
      last_login: new Date(),
      password: "supabase_auth_user"
    }, { onConflict: 'email' });

    res.status(201).json({ message: "Registration successful", user: data.user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Ensure user exists in scraper_customuser and update last_login
    await supabase.from("scraper_customuser").upsert({
      email: data.user.email,
      first_name: data.user.user_metadata?.first_name || "User",
      last_name: data.user.user_metadata?.last_name || "",
      is_active: true,
      is_staff: false,
      is_superuser: false,
      last_login: new Date(),
      password: "supabase_auth_user"
    }, { onConflict: 'email' });

    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const logout = async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

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
