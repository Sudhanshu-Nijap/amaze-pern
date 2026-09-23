const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlist.controller');
const { requireAuth } = require('../middleware/auth.middleware');

// Public route for shared wishlists
router.get('/shared/:shareToken', wishlistController.getPublicWishlist);

// Authenticated routes
router.get('/', requireAuth, wishlistController.getWishlists);
router.post('/', requireAuth, wishlistController.createWishlist);
router.delete('/:id', requireAuth, wishlistController.deleteWishlist);

// Wishlist Items routes
router.get('/:id/items', wishlistController.getWishlistItems); // Checks auth inside if private
router.post('/items', requireAuth, wishlistController.addWishlistItem);
router.delete('/:wishlist_id/items/:product_id', requireAuth, wishlistController.removeWishlistItem);

module.exports = router;
