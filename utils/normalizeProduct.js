const normalizeProduct = (p) => {
  if (!p) return null;
  const rawObj = p.toObject ? p.toObject() : { ...p };
  const img = rawObj.imageUrl || rawObj.src || '/assets/new arrivals/tshirt-tape-details.png';
  return {
    ...rawObj,
    id: String(rawObj.id || rawObj._id),
    src: img,
    imageUrl: img,
    gallery: rawObj.gallery && rawObj.gallery.length > 0 ? rawObj.gallery : [img],
    colors: rawObj.colors && rawObj.colors.length > 0 ? rawObj.colors : [
      { name: "Olive Green", hex: "#4F5D4E" },
      { name: "Navy Blue", hex: "#1A2530" },
      { name: "Black", hex: "#111111" }
    ],
    sizes: rawObj.sizes && rawObj.sizes.length > 0 ? rawObj.sizes : ["S", "M", "L", "XL"],
    description: rawObj.description || "Premium apparel built for everyday comfort.",
    style: rawObj.style || "Casual",
    rating: rawObj.rating || 4.5,
    reviewCount: rawObj.reviewCount || 10,
    inStock: rawObj.inStock !== undefined ? rawObj.inStock : true
  };
};

module.exports = normalizeProduct;
