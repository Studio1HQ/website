import Image from "next/image";

/** Philip Vollet's public reply on X recommending Studio1. */
const QUOTE = "You will be in good hands! Highly recommended.";

/**
 * Just the reply, cropped from the X thread, sized to sit in a hero flank's
 * selection frame in place of a work card.
 */
export function ReplyCard() {
  return (
    <Image
      src="/assets/endorsements/philip-vollet-x-reply.webp"
      alt={`Philip Vollet replying on X: ${QUOTE}`}
      width={486}
      height={132}
      sizes="(min-width: 1280px) 290px, 620px"
      className="block h-auto w-full"
    />
  );
}
