import Image from "next/image";

const brandSizes = {
  sm: { wordmark: "text-sm", separator: "h-5", logo: "size-7" },
  md: { wordmark: "text-lg", separator: "h-7", logo: "size-9" },
} as const;

export function SyntaxLabLogo({ className = "size-9" }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Syntax Lab"
      className={`relative inline-block shrink-0 ${className}`}
    >
      <Image
        src="/brand/syntax-lab-black.png"
        alt=""
        width={512}
        height={512}
        sizes="40px"
        className="absolute inset-0 size-full object-contain"
        style={{ opacity: "var(--syntax-logo-black-opacity)" }}
      />
      <Image
        src="/brand/syntax-lab-white.png"
        alt=""
        width={512}
        height={512}
        sizes="40px"
        className="absolute inset-0 size-full object-contain"
        style={{ opacity: "var(--syntax-logo-white-opacity)" }}
      />
    </span>
  );
}

export function ProductBrand({
  size = "sm",
  className = "",
}: {
  size?: keyof typeof brandSizes;
  className?: string;
}) {
  const styles = brandSizes[size];

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className={`font-display font-bold tracking-[-0.04em] ${styles.wordmark}`}>
        backlog<span className="text-accent">.</span>
      </span>
      <span aria-hidden="true" className={`${styles.separator} w-px bg-line`} />
      <SyntaxLabLogo className={styles.logo} />
    </span>
  );
}
