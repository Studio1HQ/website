import { cn } from "@/lib/utils";
import Image from "next/image";
import { Marquee } from "./ui/marquee";
import { trustedbyLogo } from "@/constants/data";
import { whiteLogo } from "@/lib/white-logos";

export const CollaborationIllustration = ({
  className,
}: {
  className?: string;
}) => {
  return (
    <>
      <div
        className={cn(
          "w-full min-h-[1rem] flex items-center justify-center gap-4",
          className,
        )}
      >
        <Marquee>
          {trustedbyLogo.map((item) => {
            const { src, filter } = whiteLogo(item);
            return (
              <div
                key={item.name}
                className="flex h-16 min-w-[150px] items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] px-5 ring-1 ring-inset ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl"
              >
                {item.showNameBeside ? (
                  <div className="flex min-w-0 items-center gap-2">
                    <div className={cn("relative size-7 shrink-0", item.className)}>
                      <Image src={src} className={cn("object-contain", filter)} alt="" fill sizes="36px" />
                    </div>
                    <span className="truncate text-[13px] font-medium text-white/90">
                      {item.name}
                    </span>
                  </div>
                ) : (
                  <Image
                    src={src}
                    className={cn("h-auto max-h-7 w-auto max-w-[120px] object-contain", filter)}
                    alt={item.name}
                    width={120}
                    height={40}
                    style={{ width: "auto", height: "auto" }}
                  />
                )}
              </div>
            );
          })}
        </Marquee>

        {/* <div className="border-2 !w-1/3 h-fit bg-accent/80 backdrop-blur-xl rounded-md aspect-square flex items-center justify-center">
          <Logo />
        </div>
        <div className="border-2 !w-1/3 h-fit bg-accent/80 backdrop-blur-xl rounded-md aspect-square flex items-center justify-center">
          <Logo />
        </div> */}
      </div>
    </>
  );
};
