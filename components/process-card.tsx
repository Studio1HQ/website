import { Icon, IconCircleCheck } from "@tabler/icons-react";

import { IconProps } from "@tabler/icons-react";
import { Num } from "@/components/ui/num";

export default function ProcessCard({
  step,
  index,
}: {
  step: {
    name: string;
    description: string;
    icon: React.ForwardRefExoticComponent<
      IconProps & React.RefAttributes<Icon>
    >;
    details: React.JSX.Element[];
  };
  index: number;
}) {
  return (
    <div
      key={step.name}
      className="relative rounded-[2rem] h-[25rem] p-1 bg-accent"
    >
      <div className="relative rounded-[1.8rem] bg-background w-full h-full">
        <div className="flex flex-col h-full items-start w-full justify-start">
          <div className="flex flex-1 max-h-fit border-b-4 border-accent w-full items-center gap-4 p-4 rounded-t-[1.8rem] justify-start">
            <div className="flex items-center justify-center !size-16 min-w-16 min-h-16 rounded-[6px] text-xl font-extrabold bg-primarySurface text-primary-foreground dark:bg-primary">
              {/* {stepIdx + 1} */}

              <step.icon className="size-8 text-white" />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex flex-col items-start">
                <h3 className="text-xl font-bold">
                  (<Num>{index + 1}</Num>) {step.name.toUpperCase()}
                </h3>

                <p className="text-base text-muted-foreground leading-tight">
                  {step.description}
                </p>
              </div>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-4 w-full rounded-b-[1.5rem] p-4">
            {step.details.map((detail, detailIdx) => (
              <div
                key={detailIdx}
                className="flex rounded-[6px] bg-accent dark:bg-accent/20 flex-col items-center justify-center"
              >
                <div className="flex items-center gap-4 justify-center">
                  <IconCircleCheck className=" size-8 text-primary" />
                </div>
                <h4 className=" font-semibold text-center">{detail}</h4>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
