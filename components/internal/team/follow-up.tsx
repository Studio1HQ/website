"use client";

import { useState } from "react";
import { EnvelopeSimple, PaperPlaneTilt } from "@/components/internal/icons";
import { guarded } from "@/components/internal/guarded";
import { Label, TeamDialog, useTeamAction } from "@/components/internal/team/kit";
import { buttonClass, inputClass, textareaClass } from "@/components/internal/ui";
import { sendFollowUp as sendFollowUpAction } from "@/app/internal/(dashboard)/tasks/reports/review/actions";
import { MAX_FOLLOW_UP } from "@/lib/internal/team/review";

// A send that never reached the server answers { ok: false } here, so the open draft stays.
const sendFollowUp = guarded(sendFollowUpAction);

function newKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * "Follow up": a founder's email to someone about their month, drafted from
 * what the review flagged. It's theirs to edit before it goes; it sends from
 * their name and replies come back to them.
 */
export function FollowUpButton({
  email,
  name,
  month,
  draft,
  sender,
  primary,
}: {
  email: string;
  name: string;
  month: string;
  draft: { subject: string; body: string };
  /** "Arindam": who it goes from. */
  sender: string;
  /** Drawn as the main button when the review says to follow up. */
  primary: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.body);
  const [key, setKey] = useState("");
  const { pending, run } = useTeamAction();
  const first = name.split(" ")[0] || name;

  const show = () => {
    setSubject(draft.subject);
    setBody(draft.body);
    setKey(newKey());
    setOpen(true);
  };

  return (
    <>
      <button type="button" onClick={show} className={buttonClass(primary ? "primary" : "secondary")}>
        <EnvelopeSimple size={14} /> Follow up
      </button>
      <TeamDialog
        open={open}
        onOpenChange={(next) => (pending ? null : setOpen(next))}
        title={`Follow up with ${first}`}
        description={`Goes to ${email} from "${sender} at Studio1". Replies come to your inbox.`}
        wide
        footer={
          <>
            <button type="button" disabled={pending} onClick={() => setOpen(false)} className={buttonClass("ghost")}>
              Cancel
            </button>
            <button
              type="button"
              disabled={pending || !subject.trim() || !body.trim()}
              onClick={() => run(() => sendFollowUp({ email, month, subject, body, key }), () => setOpen(false))}
              className={buttonClass("primary")}
            >
              <PaperPlaneTilt size={14} /> {pending ? "Sending…" : `Send to ${first}`}
            </button>
          </>
        }
      >
        <Label label="Subject">
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            maxLength={150}
            className={inputClass()}
          />
        </Label>
        <Label label="Message" hint="drafted from the review; change anything">
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={14}
            maxLength={MAX_FOLLOW_UP}
            className={textareaClass}
          />
        </Label>
      </TeamDialog>
    </>
  );
}
