"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { courseLimits } from "@/data/courseConfig";
import { Verse, versesByDay } from "@/data/verses";
import {
  checkAnswer,
  compareAnswers,
  shuffleArray,
} from "@/utils/testUtils";

type Question = Verse & {
  day: number;
};

type QuestionResult = {
  question: Question;
  answer: string;
  isCorrect: boolean;
};

function TestContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const course = Number(searchParams.get("course"));
  const includeTopic = searchParams.get("topic") === "true";

  const selectedDays = useMemo(() => {
    return (
      searchParams
        .get("days")
        ?.split(",")
        .map(Number)
        .filter((day) => Number.isInteger(day) && day >= 1 && day <= 6) ?? []
    );
  }, [searchParams]);

  const questions = useMemo<Question[]>(() => {
    const limit = courseLimits[course];

    if (!limit) {
      return [];
    }

    const questionList = selectedDays.flatMap((day) => {
      const verses = versesByDay[day] ?? [];

      return verses.slice(0, limit).map((verse) => ({
        ...verse,
        day,
      }));
    });

    return shuffleArray(questionList);
  }, [course, selectedDays]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [isChecked, setIsChecked] = useState(false);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [savedAnswers, setSavedAnswers] = useState<Record<number, string>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentQuestion = questions[currentIndex];

  const currentIsCorrect =
    currentQuestion && checkAnswer(answer, currentQuestion.text);

  const wrongResults = results.filter((result) => !result.isCorrect);

  useEffect(() => {
    if (!textareaRef.current) {
      return;
    }

    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height =
      `${textareaRef.current.scrollHeight}px`;
  }, [answer]);

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

      // 현재 문항 번호 자리에 결과 저장
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

    // 채점하지 않은 채 작성 중이던 내용도 임시 저장
    setSavedAnswers((previousAnswers) => ({
      ...previousAnswers,
      [currentIndex]: answer,
    }));

    const savedResult = results[targetIndex];

    setCurrentIndex(targetIndex);
    setAnswer(
      savedResult?.answer ??
        savedAnswers[targetIndex] ??
        ""
    );
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

  function restartWrongQuestions() {
    const wrongQuestions = wrongResults.map((result) => result.question);

    sessionStorage.setItem(
      "retryQuestions",
      JSON.stringify(wrongQuestions)
    );

    router.push(
      `/test/retry?topic=${includeTopic}`
    );
  }

  if (!courseLimits[course] || selectedDays.length === 0) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-12 text-slate-900">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 text-center">
          <h1 className="text-2xl font-bold">
            시험 정보가 올바르지 않습니다.
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

  if (questions.length === 0) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-12 text-slate-900">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 text-center">
          <h1 className="text-2xl font-bold">등록된 암송이 없습니다.</h1>

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

  if (reviewMode) {
    const reviewResult = wrongResults[reviewIndex];
    const comparison = compareAnswers(
      reviewResult.answer,
      reviewResult.question.text
    );
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-12 text-slate-900">
        <div className="mx-auto max-w-3xl">
          <header className="mb-8">
            <p className="text-sm font-semibold text-red-600">
              틀린 문제 확인
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              {reviewIndex + 1} / {wrongResults.length}
            </h1>
          </header>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            {includeTopic && (
              <p className="mb-2 font-bold text-violet-700">
                {reviewResult.question.topic}
              </p>
            )}

            <h2 className="text-2xl font-bold">
              {reviewResult.question.reference}
            </h2>

            <div className="mt-6">
              <h3 className="mb-3 font-bold text-slate-700">
                정답
              </h3>

              <div className="space-y-5">
                <div>
                  <h3 className="mb-3 font-bold text-slate-700">정답</h3>

                  <p className="rounded-xl bg-emerald-50 p-4 leading-8">
                    {comparison.correct.map((part, index) => (
                      <span
                        key={`review-correct-${part.text}-${index}`}
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
                  <h3 className="mb-3 font-bold text-slate-700">내가 쓴 답</h3>

                  <p className="rounded-xl bg-slate-100 p-4 leading-8">
                    {comparison.user.map((part, index) => (
                      <span
                        key={`review-user-${part.text}-${index}`}
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

              <p className="mt-3 text-sm text-red-600">
                빨간색으로 표시된 부분이 입력한 답과 다른 부분입니다.
              </p>
            </div>

            <div className="mt-8 flex gap-3">
              {reviewIndex > 0 && (
                <button
                  type="button"
                  onClick={() => setReviewIndex((index) => index - 1)}
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-4 font-bold hover:bg-slate-100"
                >
                  이전 문제
                </button>
              )}

              {reviewIndex < wrongResults.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setReviewIndex((index) => index + 1)}
                  className="flex-1 rounded-xl bg-slate-900 px-4 py-4 font-bold text-white hover:bg-slate-700"
                >
                  다음 문제
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setReviewMode(false);
                    setReviewIndex(0);
                  }}
                  className="flex-1 rounded-xl bg-slate-900 px-4 py-4 font-bold text-white hover:bg-slate-700"
                >
                  결과로 돌아가기
                </button>
              )}
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (isFinished) {
    const correctCount = results.filter(
      (result) => result.isCorrect
    ).length;

    return (
      <main className="min-h-screen bg-slate-50 px-5 py-12 text-slate-900">
        <div className="mx-auto max-w-3xl">
          <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-semibold text-blue-600">
              시험 완료
            </p>

            <h1 className="mt-3 text-4xl font-bold">
              {correctCount} / {results.length}
            </h1>

            <p className="mt-3 text-slate-600">
              총 {results.length}문제 중 {correctCount}문제를 맞혔습니다.
            </p>

            <div className="mt-8 space-y-3">
              {wrongResults.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setReviewIndex(0);
                      setReviewMode(true);
                    }}
                    className="w-full rounded-xl bg-red-600 px-5 py-4 font-bold text-white hover:bg-red-500"
                  >
                    틀린 문제 확인하기
                  </button>

                  <button
                    type="button"
                    onClick={restartWrongQuestions}
                    className="w-full rounded-xl bg-blue-600 px-5 py-4 font-bold text-white hover:bg-blue-500"
                  >
                    틀린 문제 다시 풀기
                  </button>
                </>
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

  const comparison =
    currentQuestion && isChecked
      ? compareAnswers(answer, currentQuestion.text)
      : null;

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-12 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-blue-600">
              말씀 암송 일일시험
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
                          <p className="mb-2 font-bold text-slate-700">정답</p>

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
                          <p className="mb-2 font-bold text-slate-700">내가 쓴 답</p>

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
        </section>
      </div>
    </main>
  );
}

export default function TestPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 p-10 text-center">
          시험을 불러오는 중입니다...
        </main>
      }
    >
      <TestContent />
    </Suspense>
  );
}