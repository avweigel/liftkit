export type SetCode = {
  raw: string;
  letter: string | null;
  number: number | null;
};

const CODE_RE = /^\[([A-Za-z]+)(\d+)\]\s*/;
const LEADING_BRACKET = /^\[([^\]]+)\]\s*/;

export function parseSetCode(notes: string | null): {
  code: SetCode | null;
  cleanNotes: string;
} {
  if (!notes) return { code: null, cleanNotes: "" };
  const structured = notes.match(CODE_RE);
  if (structured) {
    return {
      code: {
        raw: `${structured[1]}${structured[2]}`,
        letter: structured[1].toUpperCase(),
        number: Number(structured[2]),
      },
      cleanNotes: notes.slice(structured[0].length).trim(),
    };
  }
  const loose = notes.match(LEADING_BRACKET);
  if (loose) {
    return {
      code: { raw: loose[1], letter: null, number: null },
      cleanNotes: notes.slice(loose[0].length).trim(),
    };
  }
  return { code: null, cleanNotes: notes };
}

export type WithSetCode<T> = T & {
  code: SetCode | null;
  cleanNotes: string;
};

export type SupersetGroup<T> = {
  id: string;
  letter: string | null;
  items: Array<WithSetCode<T>>;
};

export function groupIntoSupersets<T extends { id: string; notes: string | null; order_index: number }>(
  exercises: T[],
): SupersetGroup<T>[] {
  const decorated: WithSetCode<T>[] = exercises
    .slice()
    .sort((a, b) => a.order_index - b.order_index)
    .map((e) => {
      const { code, cleanNotes } = parseSetCode(e.notes);
      return { ...e, code, cleanNotes };
    });

  const groups: SupersetGroup<T>[] = [];
  for (const ex of decorated) {
    const letter = ex.code?.letter ?? null;
    const lastGroup = groups[groups.length - 1];
    if (letter && lastGroup && lastGroup.letter === letter) {
      lastGroup.items.push(ex);
    } else {
      groups.push({
        id: letter ? `${letter}-${ex.id}` : ex.id,
        letter,
        items: [ex],
      });
    }
  }
  return groups;
}
