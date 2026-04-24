// const axios = require("axios");
// require("dotenv").config();
// const SHOP = process.env.SHOPIFY_STORE;
// const TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

// export async function fetchProductsGraphQL(client) {
//   try {
//     const queryString = `{
//       products (first: 3) {
//         edges {
//           node {
//             id
//             title
//           }
//         }
//       }
//     }`;
    
//     const products = await client.request(queryString);
//     return products;

//   } catch (error) {
//     console.error(error.response?.data || error.message);
//   }
// }


    // const queryString = `{
    //   products (first: 3) {
    //     edges {
    //       node {
    //         id
    //         title
    //       }
    //     }
    //   }
    // }`;

    // const client = new shopify.clients.Graphql({ session });
    // const products = await client.request(queryString);

    // res.json(products);