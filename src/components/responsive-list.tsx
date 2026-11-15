import type { ReactNode } from "react";

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
