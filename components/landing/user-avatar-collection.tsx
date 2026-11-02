import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { JuliaImg, MarketaImg, JesseImg, DylanImg } from "@/constants/image";
import { IconUser } from "@tabler/icons-react";

export default function UserAvatarCollection() {
  return (
    <>
      <div className="flex z-[120] flex-col items-center justify-center">
        <div className="absolute z-[20] size-16 top-1/2 right-6 flex items-center justify-center rounded-full p-2 backdrop-blur-md bg-primary/20">
          <Avatar className="w-full h-full">
            <AvatarImage src={DylanImg.src} />
            <AvatarFallback>
              <IconUser />
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="absolute z-[20] size-16 top-[55%] left-[55%] flex items-center justify-center rounded-full p-2 backdrop-blur-md bg-primary/20">
          <Avatar className="w-full h-full">
            <AvatarImage src={JesseImg.src} />
            <AvatarFallback>
              <IconUser />
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="absolute z-[20] size-16 bottom-6 left-1/2 flex items-center justify-center rounded-full p-2 backdrop-blur-md bg-primary/20">
          <Avatar className="w-full h-full">
            <AvatarImage src={MarketaImg.src} />
            <AvatarFallback>
              <IconUser />
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="z-[20] absolute size-24 bottom-4 right-4 flex items-center justify-center rounded-full p-2 backdrop-blur-md bg-primary/20">
          <Avatar className="w-full h-full">
            <AvatarImage src={JuliaImg.src} />
            <AvatarFallback>
              <IconUser />
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </>
  );
}
