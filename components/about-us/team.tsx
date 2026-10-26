"use client";
import { TeamCard } from "./team-card";
import { teamMembers } from "@/constants/data";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { Container } from "@/components/home/ui";
import {
  Accent,
  IndexBar,
  PaperSection,
  SectionHead,
} from "@/components/paper/paper-sections";

type TeamProps = {
  showHeader?: boolean;
  className?: string;
};

export const Team = ({ showHeader = true, className }: TeamProps) => {
  const reduceMotion = useReducedMotion();
  return (
    <PaperSection tone="paper" className={cn("py-10 md:py-14", className)}>
      <Container>
        {showHeader ? (
          <>
            <IndexBar index={2} name="Leadership team" />
            <SectionHead
              title={
                <>
                  Meet Our <Accent>Leadership Team</Accent>
                </>
              }
              description="We’re a team of writers, engineers and DevRels who care about clarity, craft and developer outcomes."
            />
          </>
        ) : null}

        <div
          className={cn(
            "grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3",
            showHeader && "mt-10 md:mt-12",
          )}
        >
          {teamMembers.map((member, index) => (
            <motion.div
              key={member.name}
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.06 * (index % 3), duration: 0.3 }}
            >
              <TeamCard member={member} />
            </motion.div>
          ))}
        </div>
      </Container>
    </PaperSection>
  );
};
