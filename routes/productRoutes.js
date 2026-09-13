const express = require('express');
const router = express.Router();
const {
  getNewArrivals,
  getTopSelling,
  getAllProducts,
  getProductById,
  getRelatedProducts,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/productController');

router.get('/new-arrivals', getNewArrivals);
router.get('/top-selling', getTopSelling);
router.get('/', getAllProducts);
router.get('/:id', getProductById);
router.get('/:id/related', getRelatedProducts);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

module.exports = router;
