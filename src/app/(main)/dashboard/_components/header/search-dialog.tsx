"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import { Search } from "lucide-react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import type { RoleSlug } from "@/domain/constants";
import { type NavGroup, type NavMainItem, sidebarItemsForRole } from "@/navigation/sidebar/sidebar-items";

type SearchItem = {
  id: string;
  group: string;
  label: string;
  url: string;
  icon?: NavMainItem["icon"];
  disabled?: boolean;
  newTab?: boolean;
};

function buildSearchItems(groups: NavGroup[]): SearchItem[] {
  const groupLabels = new Set(groups.flatMap((group) => (group.label ? [group.label] : [])));
  const subGroup = (groupLabel: string | undefined, itemTitle: string) =>
    groupLabels.has(itemTitle) ? (groupLabel ?? "Other") : itemTitle;
  return groups.flatMap((group) =>
    group.items.flatMap((item) => {
      if (item.subItems) {
        return item.subItems.map((sub) => ({
          id: sub.id,
          group: subGroup(group.label, item.title),
          label: sub.title,
          url: sub.url,
          icon: item.icon,
          disabled: sub.disabled,
          newTab: sub.newTab,
        }));
      }
      return [
        {
          id: item.id,
          group: group.label ?? "Other",
          label: item.title,
          url: item.url,
          icon: item.icon,
          disabled: item.disabled,
          newTab: item.newTab,
        },
      ];
    }),
  );
}

function getAvailableItems(items: SearchItem[]) {
  return items.filter((item) => !item.disabled && !item.url.includes("coming-soon"));
}

function groupBy(items: SearchItem[]) {
  const groups = [...new Set(items.map((item) => item.group))];
  return groups.map((group) => ({
    group,
    items: items.filter((item) => item.group === group),
  }));
}

export function SearchDialog({ role }: { role: RoleSlug }) {
  const searchItems = React.useMemo(() => buildSearchItems(sidebarItemsForRole(role)), [role]);
  const recommendations = React.useMemo(() => getAvailableItems(searchItems), [searchItems]);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "j" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value) setQuery("");
  };

  const handleSelect = (item: SearchItem) => {
    if (item.disabled) return;
    handleOpenChange(false);
    if (item.newTab) {
      window.open(item.url, "_blank", "noopener,noreferrer");
    } else {
      router.push(item.url);
    }
  };

  const renderGroups = (items: SearchItem[]) =>
    groupBy(items).map(({ group, items: groupItems }, index) => (
      <React.Fragment key={group}>
        {index > 0 && <CommandSeparator />}
        <CommandGroup heading={group}>
          {groupItems.map((item) => (
            <CommandItem
              disabled={item.disabled}
              key={`${group}-${item.id}`}
              value={`${item.group} ${item.label}`}
              onSelect={() => handleSelect(item)}
            >
              <span className="flex min-w-0 items-center gap-2">
                {item.icon && <item.icon />}
                <span className="truncate">{item.label}</span>
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </React.Fragment>
    ));

  return (
    <>
      {/* On phones a wide field-like trigger (thumb-friendly); on desktop a quiet link with the shortcut. */}
      <button
        type="button"
        onClick={() => handleOpenChange(true)}
        className="text-muted-foreground bg-muted/60 flex h-10 w-full items-center gap-2 rounded-lg border px-3 text-sm md:h-8 md:w-auto md:border-0 md:bg-transparent md:px-0"
        aria-label="Search pages"
      >
        <Search className="size-4 shrink-0" />
        <span className="flex-1 text-left md:flex-none">Search</span>
        <kbd className="bg-muted hidden h-5 items-center gap-1 rounded border px-1.5 text-[10px] font-medium select-none md:inline-flex">
          <span className="text-xs">⌘</span>J
        </kbd>
      </button>
      <CommandDialog open={open} onOpenChange={handleOpenChange}>
        <Command>
          <CommandInput placeholder="Jump to a page…" value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            {query ? renderGroups(searchItems) : renderGroups(recommendations)}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
