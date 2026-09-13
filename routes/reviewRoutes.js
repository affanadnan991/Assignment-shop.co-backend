const express = require('express');
const router = express.Router();
const { getReviews } = require('../controllers/productController');

router.get('/', getReviews);

module.exports = router;
