interface TutorialStepProps {
  step: string;
  index: number;
}

export function TutorialStep({ step, index }: TutorialStepProps) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-primary/15 bg-primary/10 text-[12px] font-bold text-primary">
        {index + 1}
      </span>
      <span className="pt-1 text-sm leading-6 text-ink-muted">{step}</span>
    </li>
  );
}
