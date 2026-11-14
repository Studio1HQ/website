"use client";

import { useRef, useState } from "react";
import { Camera } from "@phosphor-icons/react";
import { removeMyPhoto, updateMyEmployeeId, uploadMyPhoto } from "@/app/internal/(dashboard)/me/actions";
import { saveMyProfile } from "@/app/internal/(dashboard)/profile/actions";
import { Label, shrinkImage, useTeamAction } from "@/components/internal/team/kit";
import { useToast } from "@/components/internal/toast";
import { Avatar, buttonClass, inputClass } from "@/components/internal/ui";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL, photoUrl, type TeamPerson } from "@/lib/internal/team/shared";

/**
 * Someone's own name and photo. The photo lives with the team list, so it's
 * offered to people on it; everyone can set their name.
 */
export function ProfileForm({
  email,
  name: shown,
  saved,
  person,
  admin,
}: {
  email: string;
  /** The name the dashboard shows now (may be worked out from the address). */
  name: string;
  /** The name they saved themselves, or "". */
  saved: string;
  person: TeamPerson | null;
  /** Admins set employee IDs, their own included. */
  admin: boolean;
}) {
  const toast = useToast();
  const { pending, run } = useTeamAction();
  const [name, setName] = useState(saved || shown);
  const [code, setCode] = useState(person?.employee_code ?? "");
  const nameChanged = name.trim().length >= 2 && name.trim() !== saved;
  const codeChanged = Boolean(person) && admin && code.trim() !== (person?.employee_code ?? "");
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    const small = await shrinkImage(file, 800);
    if (small.size > MAX_UPLOAD_BYTES) {
      toast("error", `That photo is too big. Try one under ${MAX_UPLOAD_LABEL}.`);
      return;
    }
    const form = new FormData();
    form.set("photo", new File([small], file.name, { type: small.type || file.type }));
    run(() => uploadMyPhoto(form));
  };

  return (
    <form
      className="space-y-4 p-5"
      onSubmit={(event) => {
        event.preventDefault();
        run(async () => {
          if (nameChanged) {
            const named = await saveMyProfile(name);
            if (!named.ok || !codeChanged) return named;
          }
          return codeChanged ? updateMyEmployeeId(code) : { ok: true };
        });
      }}
    >
      <div className="flex items-center gap-4">
        <Avatar name={name || shown} email={email} size={64} src={photoUrl(person)} />
        {person ? (
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              aria-label="Profile photo"
              tabIndex={-1}
              className="sr-only"
              onChange={(event) => {
                void upload(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <button type="button" disabled={pending} onClick={() => fileRef.current?.click()} className={buttonClass("secondary", "sm")}>
              <Camera size={14} /> {person.photo_path ? "Change photo" : "Add a photo"}
            </button>
            {person.photo_path ? (
              <button type="button" disabled={pending} onClick={() => run(() => removeMyPhoto())} className={buttonClass("ghost", "sm")}>
                Remove
              </button>
            ) : null}
          </div>
        ) : (
          <p className="text-[12.5px] leading-relaxed text-[var(--i-muted)]">
            Photos are for people on the team list (employees and interns).
          </p>
        )}
      </div>
      <Label label="Name">
        <input
          value={name}
          maxLength={80}
          autoComplete="name"
          onChange={(event) => setName(event.target.value)}
          className={inputClass()}
        />
      </Label>
      <div className="grid gap-3 sm:grid-cols-2">
        <Label label="Email">
          <input value={email} disabled className={inputClass()} />
        </Label>
        {person && admin ? (
          <Label label="Employee ID">
            <input
              value={code}
              maxLength={24}
              placeholder="e.g. S1-001"
              autoComplete="off"
              onChange={(event) => setCode(event.target.value)}
              className={inputClass()}
            />
          </Label>
        ) : person ? (
          <Label label="Employee ID" hint="set by an admin">
            <input value={person.employee_code ?? "Not set yet"} disabled className={inputClass()} />
          </Label>
        ) : null}
      </div>
      <button type="submit" disabled={pending || (!nameChanged && !codeChanged)} className={buttonClass("primary")}>
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
