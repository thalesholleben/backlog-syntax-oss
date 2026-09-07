"use client";

import NextLink from "next/link";
import { usePathname as useNextPathname, useRouter as useNextRouter } from "next/navigation";
import { useMemo, type ComponentProps } from "react";
import { useI18n } from "./provider";
import { unlocalizedPath } from "./routing";

export default function Link({ href: destination, ...props }: ComponentProps<typeof NextLink>) {
  const { href } = useI18n();
  return (
    <NextLink
      {...props}
      href={
        typeof destination === "string"
          ? href(destination)
          : { ...destination, pathname: href(destination.pathname ?? "/") }
      }
    />
  );
}
export function useRouter() {
  const router = useNextRouter();
  const { href } = useI18n();
  return useMemo(
    () => ({
      ...router,
      push: (path: string, options?: Parameters<typeof router.push>[1]) =>
        options ? router.push(href(path), options) : router.push(href(path)),
      replace: (path: string, options?: Parameters<typeof router.replace>[1]) =>
        options ? router.replace(href(path), options) : router.replace(href(path)),
      prefetch: (path: string, options?: Parameters<typeof router.prefetch>[1]) =>
        options ? router.prefetch(href(path), options) : router.prefetch(href(path)),
    }),
    [router, href],
  );
}
export function usePathname() {
  return unlocalizedPath(useNextPathname());
}
