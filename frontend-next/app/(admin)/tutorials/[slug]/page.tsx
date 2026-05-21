import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Topbar } from "@/components/shared/topbar";
import { TutorialArticle } from "@/components/tutorials/tutorial-article";
import { getRelatedTutorials, getTutorialBySlug, tutorials } from "@/lib/tutorials";

type TutorialPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return tutorials.map((tutorial) => ({
    slug: tutorial.slug,
  }));
}

export async function generateMetadata({ params }: TutorialPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tutorial = getTutorialBySlug(slug);

  if (!tutorial) {
    return {
      title: "Tutorial no encontrado | ClockLy",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: `${tutorial.title} | ClockLy`,
    description: tutorial.description,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function TutorialDetailPage({ params }: TutorialPageProps) {
  const { slug } = await params;
  const tutorial = getTutorialBySlug(slug);

  if (!tutorial) notFound();

  return (
    <>
      <Topbar title="Tutoriales" />
      <TutorialArticle tutorial={tutorial} relatedTutorials={getRelatedTutorials(tutorial)} />
    </>
  );
}
