/**
 * A presentation order for a question's options.
 *
 * The course was written with the right answer usually typed first, and the
 * assembly tiles listed in the order they belong — which meant two thirds of
 * the questions could be answered by picking the top choice, and every block
 * exercise by tapping left to right without reading a word.
 *
 * Shuffling happens when a question is shown, not in the data: the stored order
 * stays readable for whoever edits the course, and the answer keeps being
 * written next to the option it belongs to.
 */

/** Fisher-Yates over indices, so the caller keeps its own array untouched */
export function shuffledOrder(length: number): number[] {
  const order = Array.from({ length }, (_, index) => index);

  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j] as number, order[i] as number];
  }

  return order;
}

/**
 * The same, but never returning the original order for more than two items.
 *
 * Only for the assembly exercises, where the stored order *is* the answer: an
 * unlucky shuffle would hand it over outright, about one time in twenty-four
 * for four tiles.
 *
 * Not used for multiple choice, and deliberately so. Excluding one permutation
 * skews the rest — with three options an item lands back in its own place a
 * fifth of the time instead of a third — and since the course usually lists the
 * right answer first, that skew would quietly make "first" the least likely
 * correct position. Trading one predictable pattern for another is no gain.
 */
export function jumbledOrder(length: number): number[] {
  if (length < 3) return shuffledOrder(length);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const order = shuffledOrder(length);

    if (order.some((value, index) => value !== index)) {
      // any displacement is enough for the choices; the blocks check below is
      // what insists the whole sequence is not already the answer
      if (!order.every((value, index) => value === index)) return order;
    }
  }

  // eight failures is not going to happen, but a rotation is a safe last resort
  return Array.from({ length }, (_, index) => (index + 1) % length);
}
