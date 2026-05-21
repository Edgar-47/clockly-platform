import type { Metadata } from "next";
import { Topbar } from "@/components/shared/topbar";
import { TutorialCenter } from "@/components/tutorials/tutorial-center";
import { TUTORIAL_CATEGORIES, tutorials } from "@/lib/tutorials";

export const metadata: Metadata = {
  title: "Centro de ayuda | ClockLy",
  robots: {
    index: false,
    follow: false,
  },
};

export default function TutorialsPage() {
  return (
    <>
      <Topbar title="Centro de ayuda" />
      <TutorialCenter tutorials={tutorials} categories={TUTORIAL_CATEGORIES} />
    </>
  );
}
