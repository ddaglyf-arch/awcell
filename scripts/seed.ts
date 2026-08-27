import supabase from "./src/database";
import { createCategory, createProduct } from "./src/services/productService";

async function seedDatabase() {
  try {
    console.log("🌱 Iniciando seed do banco de dados...");

    // Create categories
    const categories = [
      { name: "Eletrônicos", description: "Produtos eletrônicos diversos" },
      { name: "Livros", description: "Livros e publicações" },
      { name: "Roupas", description: "Roupas e acessórios" },
      { name: "Alimentos", description: "Alimentos e bebidas" },
    ];

    const createdCategories = [];

    for (const category of categories) {
      try {
        const created = await createCategory(category.name, category.description);
        createdCategories.push(created);
        console.log(`✅ Categoria "${category.name}" criada`);
      } catch (error: any) {
        if (error.code !== "23505") {
          // Ignore unique constraint violation
          throw error;
        }
      }
    }

    // Create sample products if categories exist
    if (createdCategories.length > 0) {
      const sampleProducts = [
        {
          name: "Smartphone XYZ",
          description: "Smartphone de última geração com câmera 108MP",
          price: 199900, // R$ 1.999,00
          categoryId: createdCategories[0]?.id,
          stock: 10,
          imageUrl: null,
          deliveryType: "physical" as const,
        },
        {
          name: "Livro TypeScript",
          description: "Aprenda TypeScript do zero",
          price: 8999, // R$ 89,99
          categoryId: createdCategories[1]?.id,
          stock: 50,
          imageUrl: null,
          deliveryType: "physical" as const,
        },
      ];

      for (const product of sampleProducts) {
        try {
          await createProduct(
            product.name,
            product.description,
            product.price,
            product.categoryId,
            product.stock,
            product.imageUrl,
            product.deliveryType
          );
          console.log(`✅ Produto "${product.name}" criado`);
        } catch (error: any) {
          if (error.code !== "23505") {
            throw error;
          }
        }
      }
    }

    console.log("✅ Seed completado com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao fazer seed:", error);
    process.exit(1);
  }
}

seedDatabase();
