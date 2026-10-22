import { cn } from "@/lib/utils";
import { SealCheck } from "@phosphor-icons/react/dist/ssr";
import Logo from "./ui/svgs/logo";
import { Badge } from "./ui/badge";
import { Pencil, Users } from "@phosphor-icons/react";

export const ComparisonMetric = ({ className }: { className?: string }) => {
  return (
    <>
      <div
        className={cn(
          "flex items-center justify-center relative gap-14",
          className,
        )}
      >
        <div className="flex translate-y-10 flex-col -rotate-12 items-center gap-4 px-2 justify-center aspect-square rounded-xl h-[11rem] bg-accent/50 border dark:bg-accent/40">
          <Badge className="flex items-center gap-1.5 bg-primary/10 text-foreground py-0.5 px-2.5 text-[10px]">
            <Users className="size-3" /> Devrel
          </Badge>
          <div className="">
            <SealCheck className="size-14 fill-primary drop-shadow-xl" />
          </div>
          <div className="text-xs text-center">
            Build Better <br />
            <span className="serif-accent font-accent font-normal text-primary/75 mr-1">
              Developer
            </span>
            Experiences
          </div>
        </div>
        <div className="flex flex-col items-center gap-4 px-2 justify-center aspect-square rounded-xl h-[11rem] scale-110 bg-accent/50 border dark:bg-accent/40">
          <Badge className="flex items-center gap-1.5 bg-primary/10 text-foreground py-0.5 px-2.5 text-[10px]">
            <Logo className="size-3" />{" "}
            <span className="font-primary">Studio1</span>
          </Badge>
          <div className="">
            <SealCheck className="size-14 fill-primary drop-shadow-xl" />
          </div>
          <div className="text-xs text-center">
            Content that <br />
            <span className="serif-accent font-accent font-normal text-primary/75 mr-1">
              ranks for developer
            </span>
            <br />
            search intent
          </div>
        </div>
        <div className="flex translate-y-10 rotate-12 flex-col items-center gap-4 px-2 justify-center aspect-square rounded-xl h-[11rem] bg-accent/50 border dark:bg-accent/40">
          <Badge className="flex items-center gap-1.5 bg-primary/10 text-foreground py-0.5 px-2.5 text-[10px]">
            <Pencil className="size-3" /> Blogs
          </Badge>
          <div className="">
            <SealCheck className="size-14 fill-primary drop-shadow-xl" />
          </div>
          <div className="text-xs text-center">
            Tutorials and guides <br />
            <span className="serif-accent font-accent font-normal text-primary/75 mr-1">
              developers trust
            </span>
          </div>
        </div>
      </div>
    </>
  );
};
