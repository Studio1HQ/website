import { devRelAsServiceTeam } from "@/data/service-processes";
import Image from "next/image";
import { Github, Linkedin, Twitter, Mail, Calendar, Globe } from "lucide-react";

const team = devRelAsServiceTeam;

export default function Team() {
  return (
    <div id="team" className="py-10 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-6 font-semibold lg:text-5xl text-2xl pb-4">
          Meet Our{" "}
          <span className="font-bold text-transparent bg-clip-text bg-gradient-to-b from-orange-400 via-orange-500 to-orange-600 from">
            Leadership Team
          </span>
          <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500">
            Helping in growth of devtool companies
          </p>
        </div>

        <div className="sm:mt-20 mt-6 flex max-sm:flex-col justify-center gap-12 ">
          {team.map((member) => (
            <div key={member.name} className="space-y-4">
              <div className="flex justify-center items-center">
                <div className="relative h-[300px] w-[300px]">
                  <Image
                    className="object-cover shadow-lg rounded-[6px]"
                    src={member.image}
                    alt={member.name}
                    fill
                    sizes="300px"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-lg leading-6 font-medium space-y-1 text-center">
                  <h3 className="text-orange-500 text-3xl font-semibold">
                    {member.name}
                  </h3>
                  <p className="text-gray-500">{member.role}</p>
                </div>
                <div className="text-base text-gray-500 max-sm:hidden text-center">
                  <p>{member.bio}</p>
                </div>
                <ul className="flex space-x-5 justify-center ">
                  <li>
                    <a
                      href={member.social.twitter}
                      className="text-orange-400 hover:text-orange-500"
                    >
                      <span className="sr-only">Twitter</span>
                      <Twitter className="h-5 w-5" />
                    </a>
                  </li>
                  <li>
                    <a
                      href={member.social.linkedin}
                      className="text-orange-400 hover:text-orange-500"
                    >
                      <span className="sr-only">LinkedIn</span>
                      <Linkedin className="h-5 w-5" />
                    </a>
                  </li>
                  <li>
                    <a
                      href={member.social.website}
                      className="text-orange-400 hover:text-orange-500"
                    >
                      <span className="sr-only">Website</span>
                      <Globe className="h-5 w-5" />
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
