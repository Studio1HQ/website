import React from "react";
import { CardWithGrid } from "@/components/ui/cards";
import { ArrowRight } from "lucide-react";

const DevRelPricing = () => {
  return (
    <section className="sm:py-10 py-8" id="pricing">
      <div className="container max-w-4xl">
        <div className="text-center mb-6 font-semibold lg:text-5xl text-2xl pb-4">
          Our{" "}
          <span className="font-bold text-transparent bg-clip-text bg-gradient-to-b from-orange-400 via-orange-500 to-orange-600">
            Pricing
          </span>
          <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500">
            We offer our services to match your unique developer relations needs
          </p>
        </div>

        <CardWithGrid>
          <div className="flex flex-col p-8 rounded-[6px] border border-orange-400 bg-black/50 hover:shadow-lg transition-all">
            <div className="text-center mb-6">
              <p className="text-lg text-muted-foreground">
                Every organization has unique requirements for their DevRel
                initiatives. Let's discuss your specific needs and create a
                customized solution that works best for you.
              </p>
            </div>

            <div className="mt-auto">
              <a
                href="mailto:contact@studio1hq.com"
                className="flex items-center justify-center gap-2 w-full px-6 py-3 text-center text-lg font-semibold rounded-md bg-gradient-to-b from-orange-500 to-orange-600 text-white hover:shadow-xl transition duration-200"
              >
                Get Custom Quote <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </div>
        </CardWithGrid>
      </div>
    </section>
  );
};

export default DevRelPricing;
