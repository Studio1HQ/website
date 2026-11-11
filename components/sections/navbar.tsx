"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import Logo from "@/public/assets/site/logo.webp";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="fixed top-2 z-50 w-full overflow-x-hidden">
      <div className="container flex h-20 max-w-screen-2xl items-center justify-between">
        {!isScrolled && (
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src={Logo}
              alt="Studio1 - Technical Content and DevRel Services"
              width={56}
              height={56}
              priority
              className="h-14 w-14 max-md:h-10 max-md:w-10 fill-primary text-primary rounded-full"
            />
            <span className="font-primary text-xl font-bold max-sm:hidden sm:visible">
              Studio1HQ
            </span>
          </Link>
        )}
      </div>
    </header>
  );
}
