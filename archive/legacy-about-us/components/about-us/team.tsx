"use client";
import { TeamCard } from "./team-card";
import { teamMembers } from "@/constants/data";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { SectionIntro } from "@/components/home/ui";

type TeamProps = {
  showHeader?: boolean;
  className?: string;
};

export const Team = ({ showHeader = true, className }: TeamProps) => {
  return (
    <motion.div
      className={cn("relative py-24 md:py-32", className)}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      {showHeader ? (
        <SectionIntro
          className="mb-14 md:mb-16"
          title="Meet Our"
          accent="Leadership Team"
          description="We’re a team of writers, engineers and DevRels who care about clarity, craft and developer outcomes."
        />
      ) : null}

      <div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
        {teamMembers.map((member, index) => (
          <motion.div
            key={member.name}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.06 * (index % 3), duration: 0.3 }}
          >
            <TeamCard member={member} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
