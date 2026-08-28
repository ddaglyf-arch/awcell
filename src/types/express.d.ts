import "express-serve-static-core";

declare module "express-serve-static-core" {
  interface Request {
    user: {
      shop_id: string;
      user_id: string;
      user_type: "owner" | "customer";
    };
  }
}