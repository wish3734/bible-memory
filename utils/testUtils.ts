export type HighlightPart = {
  text: string;
  isWrong: boolean;
};

export type ComparisonResult = {
  correct: HighlightPart[];
  user: HighlightPart[];
};

export function normalizeText(text: string) {
  return text
    .replace(/[.,!?'"“”‘’·…:;()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function checkAnswer(answer: string, correctText: string) {
  return normalizeText(answer) === normalizeText(correctText);
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));

    [shuffled[i], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[i],
    ];
  }

  return shuffled;
}

export function compareAnswers(
  userAnswer: string,
  correctText: string
): ComparisonResult {
  const userWords = normalizeText(userAnswer).split(" ").filter(Boolean);
  const correctWords = normalizeText(correctText).split(" ").filter(Boolean);

  const rows = correctWords.length + 1;
  const columns = userWords.length + 1;

  const dp = Array.from({ length: rows }, () =>
    Array<number>(columns).fill(0)
  );

  for (let correctIndex = 1; correctIndex < rows; correctIndex++) {
    for (let userIndex = 1; userIndex < columns; userIndex++) {
      if (correctWords[correctIndex - 1] === userWords[userIndex - 1]) {
        dp[correctIndex][userIndex] =
          dp[correctIndex - 1][userIndex - 1] + 1;
      } else {
        dp[correctIndex][userIndex] = Math.max(
          dp[correctIndex - 1][userIndex],
          dp[correctIndex][userIndex - 1]
        );
      }
    }
  }

  const correctResult: HighlightPart[] = [];
  const userResult: HighlightPart[] = [];

  let correctIndex = correctWords.length;
  let userIndex = userWords.length;

  while (correctIndex > 0 || userIndex > 0) {
    if (
      correctIndex > 0 &&
      userIndex > 0 &&
      correctWords[correctIndex - 1] === userWords[userIndex - 1]
    ) {
      correctResult.unshift({
        text: correctWords[correctIndex - 1],
        isWrong: false,
      });

      userResult.unshift({
        text: userWords[userIndex - 1],
        isWrong: false,
      });

      correctIndex--;
      userIndex--;
    } else if (
      userIndex > 0 &&
      (correctIndex === 0 ||
        dp[correctIndex][userIndex - 1] >=
          dp[correctIndex - 1][userIndex])
    ) {
      userResult.unshift({
        text: userWords[userIndex - 1],
        isWrong: true,
      });

      userIndex--;
    } else {
      correctResult.unshift({
        text: correctWords[correctIndex - 1],
        isWrong: true,
      });

      correctIndex--;
    }
  }

  return {
    correct: correctResult,
    user: userResult,
  };
}