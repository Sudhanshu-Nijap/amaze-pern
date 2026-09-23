const crypto = require("crypto");
const { query } = require("../services/db.service");

// Get all wishlists for the authenticated user
const getWishlists = async (req, res) => {
  const user = req.user;
  if (!user || !user.djangoId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const result = await query("SELECT * FROM scraper_wishlist WHERE user_id = $1 ORDER BY id DESC", [user.djangoId]);
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a new wishlist
const createWishlist = async (req, res) => {
  const user = req.user;
  const { name, is_public } = req.body;
  if (!user || !user.djangoId) return res.status(401).json({ error: "Unauthorized" });
  if (!name) return res.status(400).json({ error: "Wishlist name is required" });

  try {
    const shareToken = crypto.randomBytes(16).toString("hex");
    const result = await query(
      "INSERT INTO scraper_wishlist (user_id, name, is_public, share_token) VALUES ($1, $2, $3, $4) RETURNING *",
      [user.djangoId, name, is_public || false, shareToken]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a wishlist
const deleteWishlist = async (req, res) => {
  const user = req.user;
  const { id } = req.params;
  if (!user || !user.djangoId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const result = await query("DELETE FROM scraper_wishlist WHERE id = $1 AND user_id = $2 RETURNING *", [id, user.djangoId]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Wishlist not found or unauthorized" });
    res.status(200).json({ success: true, message: "Wishlist deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add product to wishlist
const addWishlistItem = async (req, res) => {
  const user = req.user;
  const { wishlist_id, product_id } = req.body;
  if (!user || !user.djangoId) return res.status(401).json({ error: "Unauthorized" });

  try {
    // Verify ownership
    const wishlistRes = await query("SELECT id FROM scraper_wishlist WHERE id = $1 AND user_id = $2", [wishlist_id, user.djangoId]);
    if (wishlistRes.rowCount === 0) return res.status(404).json({ error: "Wishlist not found or unauthorized" });

    const result = await query(
      "INSERT INTO scraper_wishlist_item (wishlist_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *",
      [wishlist_id, product_id]
    );
    res.status(201).json(result.rows[0] || { message: "Item already in wishlist" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Remove product from wishlist
const removeWishlistItem = async (req, res) => {
  const user = req.user;
  const { wishlist_id, product_id } = req.params;
  if (!user || !user.djangoId) return res.status(401).json({ error: "Unauthorized" });

  try {
    // Verify ownership
    const wishlistRes = await query("SELECT id FROM scraper_wishlist WHERE id = $1 AND user_id = $2", [wishlist_id, user.djangoId]);
    if (wishlistRes.rowCount === 0) return res.status(404).json({ error: "Wishlist not found or unauthorized" });

    await query("DELETE FROM scraper_wishlist_item WHERE wishlist_id = $1 AND product_id = $2", [wishlist_id, product_id]);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get items for a wishlist (Public or Owned)
const getWishlistItems = async (req, res) => {
  const { id } = req.params;
  const user = req.user; // might be undefined if not logged in
  const djangoId = user ? user.djangoId : null;

  try {
    const wishlistRes = await query("SELECT * FROM scraper_wishlist WHERE id = $1", [id]);
    if (wishlistRes.rowCount === 0) return res.status(404).json({ error: "Wishlist not found" });
    
    const wishlist = wishlistRes.rows[0];
    if (!wishlist.is_public && wishlist.user_id !== djangoId) {
      return res.status(403).json({ error: "This wishlist is private" });
    }

    const itemsRes = await query(`
      SELECT wi.id as item_id, wi.added_at, p.*
      FROM scraper_wishlist_item wi
      JOIN scraper_product p ON wi.product_id = p.id
      WHERE wi.wishlist_id = $1
      ORDER BY wi.added_at DESC
    `, [id]);

    res.status(200).json({ wishlist, items: itemsRes.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get public wishlist by share token
const getPublicWishlist = async (req, res) => {
  const { shareToken } = req.params;
  try {
    const wishlistRes = await query("SELECT * FROM scraper_wishlist WHERE share_token = $1 AND is_public = true", [shareToken]);
    if (wishlistRes.rowCount === 0) return res.status(404).json({ error: "Wishlist not found or private" });
    
    const wishlist = wishlistRes.rows[0];
    const itemsRes = await query(`
      SELECT wi.id as item_id, wi.added_at, p.*
      FROM scraper_wishlist_item wi
      JOIN scraper_product p ON wi.product_id = p.id
      WHERE wi.wishlist_id = $1
      ORDER BY wi.added_at DESC
    `, [wishlist.id]);

    res.status(200).json({ wishlist, items: itemsRes.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getWishlists,
  createWishlist,
  deleteWishlist,
  addWishlistItem,
  removeWishlistItem,
  getWishlistItems,
  getPublicWishlist
};
