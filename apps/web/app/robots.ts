import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

const privateRoutes = [
  "/entrar",
  "/cadastro",
  "/aceitar-termos",
  "/consent",
  "/recuperar-senha",
  "/onboarding",
  "/w",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: privateRoutes }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
