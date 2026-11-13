import type { ReactNode } from "react";

/**
 * Same rows, two layouts: a table from the `md` breakpoint up, and one card per row on phones
 * (no horizontal scrolling). Both renderers receive the same items, so logic is not duplicated.
 */
export function ResponsiveList<T>({
  items,
  table,
  card,
  empty,
  cardsClassName = "flex flex-col gap-3",
}: {
  items: T[];
  table: ReactNode;
  card: (item: T, index: number) => ReactNode;
  empty?: ReactNode;
  cardsClassName?: string;
}) {
  return (
    <>
      <div className="hidden md:block">{table}</div>
      <div className="md:hidden">
        {items.length === 0 && empty ? (
          empty
        ) : (
          <ul className={cardsClassName}>{items.map((item, i) => card(item, i))}</ul>
        )}
      </div>
    </>
  );
}
