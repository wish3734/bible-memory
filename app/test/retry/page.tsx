"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Verse } from "@/data/verses";
import {
  checkAnswer,
  compareAnswers,
  shuffleArray,
} from "@/utils/testUtils";
import { Suspense } from "react";

type Question = Verse & {
  day: number;
};

type QuestionResult = {
  question: Question;
  answer: string;
  isCorrect: boolean;
};

function RetryPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const includeTopic = searchParams.get("topic") === "true";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [isChecked, setIsChecked] = useState(false);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [savedAnswers, setSavedAnswers] = useState<Record<number, string>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [isEarlyFinished, setIsEarlyFinished] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const savedQuestions = sessionStorage.getItem("retryQuestions");

    if (!savedQuestions) {
      setIsLoaded(true);
      return;
    }

    try {
      const parsedQuestions = JSON.parse(savedQuestions) as Question[];

      setQuestions(shuffleArray(parsedQuestions));
    } catch {
      setQuestions([]);
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!textareaRef.current) {
      return;
    }

    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height =
      `${textareaRef.current.scrollHeight}px`;
  }, [answer]);

  const currentQuestion = questions[currentIndex];

  const currentIsCorrect = useMemo(() => {
    if (!currentQuestion) {
      return false;
    }

    return checkAnswer(answer, currentQuestion.text);
  }, [answer, currentQuestion]);

  const comparison =
    currentQuestion && isChecked
      ? compareAnswers(answer, currentQuestion.text)
      : null;

  function submitAnswer() {
    if (!currentQuestion) {
      return;
    }

    const newResult: QuestionResult = {
      question: currentQuestion,
      answer,
      isCorrect: checkAnswer(answer, currentQuestion.text),
    };

    setResults((previousResults) => {
      const updatedResults = [...previousResults];

      updatedResults[currentIndex] = newResult;

      return updatedResults;
    });

    setSavedAnswers((previousAnswers) => ({
      ...previousAnswers,
      [currentIndex]: answer,
    }));

    setIsChecked(true);
  }

  function moveToQuestion(targetIndex: number) {
    if (targetIndex < 0 || targetIndex >= questions.length) {
      return;
    }

    setSavedAnswers((previousAnswers) => ({
      ...previousAnswers,
      [currentIndex]: answer,
    }));

    const savedResult = results[targetIndex];

    setCurrentIndex(targetIndex);
    setAnswer(savedResult?.answer ?? savedAnswers[targetIndex] ?? "");
    setIsChecked(Boolean(savedResult));
  }

  function goToPreviousQuestion() {
    moveToQuestion(currentIndex - 1);
  }

  function goToNextQuestion() {
    if (!currentQuestion) {
      return;
    }

    if (currentIndex === questions.length - 1) {
      setIsFinished(true);
      return;
    }

    moveToQuestion(currentIndex + 1);
  }

  function finishTestEarly() {
    const answeredResults = results.filter(
      (result): result is QuestionResult => Boolean(result)
    );

    if (answeredResults.length === 0) {
      window.alert("아직 채점한 문제가 없습니다.");
      return;
    }

    const shouldFinish = window.confirm(
      "지금까지 채점한 문제만으로 시험을 끝내시겠습니까?"
    );

    if (!shouldFinish) {
      return;
    }

    setIsEarlyFinished(true);
    setIsFinished(true);
  }

  function restartWrongQuestions() {
    const wrongQuestions = results
      .filter((result) => !result.isCorrect)
      .map((result) => result.question);

    sessionStorage.setItem(
      "retryQuestions",
      JSON.stringify(wrongQuestions)
    );

    window.location.reload();
  }

  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-slate-50 p-10 text-center">
        오답 문제를 불러오는 중입니다...
      </main>
    );
  }

  if (questions.length === 0) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-12 text-slate-900">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 text-center">
          <h1 className="text-2xl font-bold">
            다시 풀 오답 문제가 없습니다.
          </h1>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-6 rounded-xl bg-slate-900 px-5 py-3 font-bold text-white"
          >
            홈으로
          </button>
        </div>
      </main>
    );
  }

  if (isFinished) {
    const answeredResults = results.filter(
      (result): result is QuestionResult => Boolean(result)
    );

    const correctCount = answeredResults.filter(
      (result) => result.isCorrect
    ).length;

    const correctRate =
      answeredResults.length > 0
        ? Math.round((correctCount / answeredResults.length) * 100)
        : 0;

    return (
      <main className="min-h-screen bg-slate-50 px-5 py-12 text-slate-900">
        <div className="mx-auto max-w-3xl">
          <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-semibold text-blue-600">
              {isEarlyFinished ? "오답 재시험 종료" : "오답 재시험 완료"}
            </p>

            <h1 className="mt-3 text-4xl font-bold">
              {correctCount} / {answeredResults.length}
            </h1>

            <p className="mt-3 text-slate-600">
              총 {answeredResults.length}문제 중 {correctCount}문제를 맞혔습니다.
            </p>

            <div className="mt-8 flex flex-col items-center">
              <div
                className="relative flex h-48 w-48 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(
                    rgb(37 99 235) ${correctRate}%,
                    rgb(226 232 240) ${correctRate}% 100%
                  )`,
                }}
              >
                <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-white">
                  <span className="text-4xl font-bold text-blue-600">
                    {correctRate}%
                  </span>

                  <span className="mt-1 text-sm font-semibold text-slate-500">
                    정답률
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              {!isEarlyFinished &&
                correctCount < answeredResults.length && (
                <button
                  type="button"
                  onClick={restartWrongQuestions}
                  className="w-full rounded-xl bg-blue-600 px-5 py-4 font-bold text-white hover:bg-blue-500"
                >
                  남은 오답 다시 풀기
                </button>
              )}

              <button
                type="button"
                onClick={() => router.push("/")}
                className="w-full rounded-xl bg-slate-900 px-5 py-4 font-bold text-white hover:bg-slate-700"
              >
                홈으로
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-12 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-blue-600">
              오답 다시 풀기
            </p>

            <p className="text-sm font-semibold text-slate-500">
              {currentIndex + 1} / {questions.length}
            </p>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{
                width: `${((currentIndex + 1) / questions.length) * 100}%`,
              }}
            />
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {includeTopic && (
            <p className="mb-3 font-bold text-violet-700">
              {currentQuestion.topic}
            </p>
          )}

          <p className="text-sm font-semibold text-slate-500">
            {currentQuestion.day}일차
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            {currentQuestion.reference}
          </h1>

          <label
            htmlFor="answer"
            className="mb-2 mt-8 block text-sm font-semibold text-slate-600"
          >
            암송 내용을 모두 적으세요
          </label>

          <textarea
            ref={textareaRef}
            id="answer"
            value={answer}
            readOnly={isChecked}
            onChange={(event) => setAnswer(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();

                if (!isChecked) {
                  submitAnswer();
                } else {
                  goToNextQuestion();
                }
              }
            }}
            rows={2}
            autoFocus
            placeholder="장절에 해당하는 말씀을 입력하세요."
            className="w-full resize-none overflow-hidden rounded-xl border border-slate-300 p-4 text-lg leading-8 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 read-only:bg-slate-100"
          />

          {!isChecked ? (
            <div className="mt-5 flex gap-3">
              {currentIndex > 0 && (
                <button
                  type="button"
                  onClick={goToPreviousQuestion}
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-5 py-4 font-bold hover:bg-slate-100"
                >
                  이전 문제
                </button>
              )}

              <button
                type="button"
                onClick={submitAnswer}
                className="flex-1 rounded-xl bg-slate-900 px-5 py-4 font-bold text-white transition hover:bg-slate-700"
              >
                채점하기
              </button>
            </div>
          ) : (
            <div className="mt-6">
              {currentIsCorrect ? (
                <div className="rounded-xl bg-emerald-100 p-5 text-center">
                  <p className="text-2xl font-bold text-emerald-700">
                    정답
                  </p>
                </div>
              ) : (
                <div>
                  <div className="rounded-xl bg-red-100 p-5 text-center">
                    <p className="text-2xl font-bold text-red-700">
                      오답
                    </p>
                  </div>

                  <div className="mt-5">
                    <p className="mb-2 font-bold text-slate-700">
                      정답과 다른 부분
                    </p>

                    {comparison && (
                      <div className="space-y-5">
                        <div>
                          <p className="mb-2 font-bold text-slate-700">
                            정답
                          </p>

                          <p className="rounded-xl bg-emerald-50 p-4 text-lg leading-9">
                            {comparison.correct.map((part, index) => (
                              <span
                                key={`correct-${part.text}-${index}`}
                                className={
                                  part.isWrong
                                    ? "mr-1 font-bold text-slate-900"
                                    : "mr-1"
                                }
                              >
                                {part.text}
                              </span>
                            ))}
                          </p>
                        </div>

                        <div>
                          <p className="mb-2 font-bold text-slate-700">
                            내가 쓴 답
                          </p>

                          <p className="rounded-xl bg-slate-100 p-4 text-lg leading-9">
                            {comparison.user.map((part, index) => (
                              <span
                                key={`user-${part.text}-${index}`}
                                className={
                                  part.isWrong
                                    ? "mr-1 rounded bg-red-200 px-1 text-red-800"
                                    : "mr-1"
                                }
                              >
                                {part.text}
                              </span>
                            ))}
                          </p>
                        </div>
                      </div>
                    )}

                    <p className="mt-3 text-sm text-red-600">
                      빨간색 부분을 다시 확인하세요.
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-6 flex gap-3">
                {currentIndex > 0 && (
                  <button
                    type="button"
                    onClick={goToPreviousQuestion}
                    className="flex-1 rounded-xl border border-slate-300 bg-white px-5 py-4 font-bold hover:bg-slate-100"
                  >
                    이전 문제
                  </button>
                )}

                <button
                  type="button"
                  onClick={goToNextQuestion}
                  className="flex-1 rounded-xl bg-blue-600 px-5 py-4 font-bold text-white hover:bg-blue-500"
                >
                  {currentIndex === questions.length - 1
                    ? "결과 보기"
                    : "다음 문제"}
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={finishTestEarly}
            className="mt-3 w-full rounded-xl bg-red-600 px-5 py-3 font-bold text-white transition hover:bg-red-500"
          >
            시험 끝내기
          </button>
        </section>
      </div>
    </main>
  );
}

export default function RetryPage() {
  return (
    <Suspense fallback={<div>불러오는 중...</div>}>
      <RetryPageContent />
    </Suspense>
  );
}