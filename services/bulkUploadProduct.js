export default async function bulkUploadProduct() {
  try {
    const queryString = `
        {
          mutation productVariantsBulkCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
            productVariantsBulkCreate(productId: $productId, variants: $variants) {
              product {
                id
              }
              productVariants {
                id
                title
                price
                compareAtPrice
              }
              userErrors {
                field
                message
              }
            }
          }
        }
      `;
  } catch (error) {
    console.error(error.response?.data || error.message);
  }
}