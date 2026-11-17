import type { Metadata } from "next";
import Image from "next/image";
import { verifyFeedbackLink } from "@/lib/session";
import { fetchCardInQa } from "@/lib/trello";
import { FeedbackForm } from "@/components/FeedbackForm";
import { displayTaskName } from "@/lib/feedback";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Task feedback",
  robots: { index: false, follow: false },
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "var(--sand-10)" }}>
      <div className="card w-full max-w-lg" style={{ boxShadow: "var(--shadow-sm)" }}>
        <Image src="/logo.svg" alt="Hotsourced" width={36} height={36} className="mb-4" />
        {children}
      </div>
    </div>
  );
}

export default async function FeedbackPage({ params }: { params: Promise<{ card: string; sig: string }> }) {
  const { card: cardId, sig } = await params;

  if (!(await verifyFeedbackLink(cardId, sig))) {
    return (
      <Shell>
        <h1 className="page-title-main mb-1">Link not valid</h1>
        <p className="breadcrumb">Check you copied the whole link, or ask for a new one.</p>
      </Shell>
    );
  }

  let card: Awaited<ReturnType<typeof fetchCardInQa>> = null;
  try {
    card = await fetchCardInQa(cardId);
  } catch {
    return (
      <Shell>
        <h1 className="page-title-main mb-1">Couldn&rsquo;t reach Trello</h1>
        <p className="breadcrumb">Please refresh the page in a minute.</p>
      </Shell>
    );
  }

  if (!card) {
    return (
      <Shell>
        <h1 className="page-title-main mb-1">Feedback is closed</h1>
        <p className="breadcrumb">This task is no longer in QA, so it isn&rsquo;t taking feedback.</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <p className="overline mb-1">Feedback for</p>
      <h1 className="page-title-main mb-1">{displayTaskName(card.name)}</h1>
      <p className="breadcrumb mb-6">
        Does it work as expected? New ideas go to the developers or Trello, not here.
      </p>
      <FeedbackForm cardId={cardId} sig={sig} />
    </Shell>
  );
}
