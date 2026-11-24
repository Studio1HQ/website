"use client";

import { useState } from "react";
import {
  EnvelopeSimple,
  LinkedinLogo,
  Phone,
  Plus,
  ProhibitInset,
  Star,
  XLogo,
} from "@/components/internal/icons";
import {
  removeContact,
  saveContact,
} from "@/app/internal/(dashboard)/outreach/actions";
import { CONTACT_FIELDS, type OrgContact } from "@/lib/internal/outreach/schema";
import { buttonClass, safeUrl } from "@/components/internal/ui";
import { FieldDialog } from "@/components/internal/outreach/field-dialog";

/**
 * The people at an organisation. Someone who asked not to be contacted has
 * no email or phone link, and says so, so nobody writes to them by habit.
 */
export function ContactList({ orgId, contacts }: { orgId: string; contacts: OrgContact[] }) {
  const [editing, setEditing] = useState<OrgContact | null>(null);
  return (
    <section className="rounded-xl border border-[var(--i-line)] bg-[var(--i-panel)] shadow-[var(--i-shadow-sm)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--i-line)] px-5 py-3">
        <h2 className="text-[13px] font-medium">Contacts</h2>
        <FieldDialog
          fields={CONTACT_FIELDS}
          noun="contact"
          defaults={{ is_primary: contacts.length === 0 }}
          save={(values) => saveContact(orgId, null, values)}
          trigger={
            <button type="button" className={buttonClass("secondary", "sm")}>
              <Plus size={13} /> Contact
            </button>
          }
        />
      </div>
      {contacts.length ? (
        <ul className="divide-y divide-[var(--i-line)]">
          {contacts.map((contact) => {
            const handle = contact.x_handle.replace(/^@/, "").trim();
            return (
              <li key={contact.id} className="px-5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setEditing(contact)}
                    className="min-w-0 text-left hover:text-[var(--i-accent-text)]"
                  >
                    <span className="flex items-center gap-1.5 text-[13px] font-medium">
                      <span className="truncate">{contact.name}</span>
                      {contact.is_primary ? (
                        <Star size={12} weight="fill" className="shrink-0 text-amber-500" aria-label="Main contact" />
                      ) : null}
                    </span>
                    {contact.title ? (
                      <span className="block text-[12px] text-[var(--i-muted)]">{contact.title}</span>
                    ) : null}
                  </button>
                  <span className="flex shrink-0 items-center gap-1">
                    {contact.email && !contact.do_not_contact ? (
                      <a href={`mailto:${contact.email}`} title={contact.email} className={buttonClass("ghost", "sm")}>
                        <EnvelopeSimple size={14} />
                        <span className="sr-only">Email {contact.name}</span>
                      </a>
                    ) : null}
                    {contact.phone && !contact.do_not_contact ? (
                      <a
                        href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}
                        title={contact.phone}
                        className={buttonClass("ghost", "sm")}
                      >
                        <Phone size={14} />
                        <span className="sr-only">Call {contact.name}</span>
                      </a>
                    ) : null}
                    {safeUrl(contact.linkedin) ? (
                      <a
                        href={safeUrl(contact.linkedin)!.toString()}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className={buttonClass("ghost", "sm")}
                      >
                        <LinkedinLogo size={14} />
                        <span className="sr-only">{contact.name} on LinkedIn</span>
                      </a>
                    ) : null}
                    {/^[A-Za-z0-9_]{1,15}$/.test(handle) ? (
                      <a
                        href={`https://x.com/${handle}`}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className={buttonClass("ghost", "sm")}
                      >
                        <XLogo size={14} />
                        <span className="sr-only">{contact.name} on X</span>
                      </a>
                    ) : null}
                  </span>
                </div>
                {contact.do_not_contact ? (
                  <p className="mt-1 flex items-center gap-1 text-[12px] font-medium text-rose-700 dark:text-rose-300">
                    <ProhibitInset size={13} /> Asked not to be contacted
                  </p>
                ) : contact.email || contact.phone ? (
                  <p className="mt-1 truncate text-[12px] text-[var(--i-muted)]">
                    {[contact.email, contact.phone].filter(Boolean).join(" · ")}
                  </p>
                ) : null}
                {contact.notes ? (
                  <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-[12px] text-[var(--i-muted)]">{contact.notes}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="px-5 py-6 text-[13px] text-[var(--i-muted)]">
          No contacts yet. Add the person you&apos;re talking to.
        </p>
      )}
      <FieldDialog
        fields={CONTACT_FIELDS}
        noun="contact"
        record={editing ?? undefined}
        open={editing !== null}
        onOpenChange={(next) => {
          if (!next) setEditing(null);
        }}
        save={(values) => saveContact(orgId, editing?.id ?? null, values)}
        remove={editing ? () => removeContact(editing.id) : undefined}
      />
    </section>
  );
}
