import { notFound } from "next/navigation";
import LessonPlayer from "@/components/lesson/LessonPlayer";
import { getDeck } from "@/lessons/decks";

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deck = getDeck(id);
  if (!deck) notFound();

  return <LessonPlayer deck={deck} />;
}
