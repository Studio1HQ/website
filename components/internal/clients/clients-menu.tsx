"use client";

import Link from "next/link";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { DotsThree } from "@/components/internal/icons";
import { buttonClass, menuContentClass, menuItemClass } from "@/components/internal/ui";

/** The Clients page's quiet extras (Templates, archived companies) behind one ⋯ button. */
export function ClientsMenu({ items }: { items: { label: string; href: string }[] }) {
  if (!items.length) return null;
  return (
    <Menu.Root modal={false}>
      <Menu.Trigger aria-label="More" className={buttonClass("secondary")}>
        <DotsThree size={16} weight="bold" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content align="end" sideOffset={6} className={menuContentClass}>
          {items.map((item) => (
            <Menu.Item key={item.href} asChild className={menuItemClass}>
              <Link href={item.href}>{item.label}</Link>
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
