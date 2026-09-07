"use client";

import { useEffect } from "react";

/**
 * Liga a revelação por scroll de tudo que tem `.bl-reveal` na página. Fica em um
 * componente único no fim da página, em vez de um wrapper por bloco, para o
 * conteúdo continuar renderizado no servidor. Sem JS nada some: a classe só tem
 * efeito quando o `data-js` do <html> está marcado.
 */
export function RevealOnScroll() {
  useEffect(() => {
    const targets = Array.from(document.querySelectorAll<HTMLElement>(".bl-reveal"));
    if (targets.length === 0) return;

    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      for (const target of targets) target.dataset.in = "";
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.in = "";
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );

    for (const target of targets) observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return null;
}
