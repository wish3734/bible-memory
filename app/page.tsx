"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const courses = [1, 2, 3, 4];

const dayOptions = [5, 6, 1, 2, 3, 4];

export default function Home() {
  const router = useRouter();

  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [includeTopic, setIncludeTopic] = useState(false);

  const canStart = selectedCourse !== null && selectedDays.length > 0;

  function toggleDay(day: number) {
    setSelectedDays((currentDays) => {
      if (currentDays.includes(day)) {
        return currentDays.filter((selectedDay) => selectedDay !== day);
      }

      return [...currentDays, day];
    });
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-12 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <header className="mb-10 text-center">
          <p className="mb-2 text-sm font-semibold text-blue-600">
            말씀 암송 일일시험
          </p>

          <h1 className="text-4xl font-bold tracking-tight">사무엘 학교</h1>

          <p className="mt-4 text-slate-600">
            과정과 시험 범위를 선택하세요.
          </p>
        </header>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold">1. 과정 선택</h2>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {courses.map((course) => {
              const isSelected = selectedCourse === course;

              return (
                <button
                  key={course}
                  type="button"
                  onClick={() => setSelectedCourse(course)}
                  className={`rounded-2xl border p-5 text-center transition ${
                    isSelected
                      ? "border-blue-600 bg-blue-600 text-white shadow-lg"
                      : "border-slate-200 bg-white hover:border-blue-300 hover:shadow"
                  }`}
                >
                  <span className="block text-2xl font-bold">
                    {course}과정
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-2 text-xl font-bold">2. 시험 범위 선택</h2>

          <p className="mb-4 text-sm text-slate-500">
            여러 일차를 함께 선택할 수 있습니다.
          </p>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {dayOptions.map((day) => {
              const isSelected = selectedDays.includes(day);

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`rounded-xl border px-4 py-4 font-semibold transition ${
                    isSelected
                      ? "border-emerald-600 bg-emerald-600 text-white shadow"
                      : "border-slate-200 bg-white hover:border-emerald-300"
                  }`}
                >
                  {day}일차
                </button>
              );
            })}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold">3. 시험 설정</h2>

          <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-violet-300">
            <span>
              <span className="block font-bold text-slate-900">암송별 주제 보기</span>
            </span>

            <input
              type="checkbox"
              checked={includeTopic}
              onChange={(event) => setIncludeTopic(event.target.checked)}
              className="h-5 w-5 cursor-pointer accent-violet-600"
            />
          </label>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold">선택 내용</h2>

          <div className="mt-4 space-y-2 text-slate-600">
            <p>
              과정:{" "}
              <strong className="text-slate-900">
                {selectedCourse ? `${selectedCourse}과정` : "선택하지 않음"}
              </strong>
            </p>

            <p>
              범위:{" "}
              <strong className="text-slate-900">
                {selectedDays.length > 0
                  ? selectedDays.map((day) => `${day}일차`).join(" + ")
                  : "선택하지 않음"}
              </strong>
            </p>

            <p>
              주제:{" "}
              <strong className="text-slate-900">
                {includeTopic ? "보기" : "보지 않기"}
              </strong>
            </p>
          </div>

          <button
            type="button"
            disabled={!canStart}
            onClick={() => {
              if (!selectedCourse || selectedDays.length === 0) return;

              const days = selectedDays.join(",");

              router.push(
                `/test?course=${selectedCourse}&days=${days}&topic=${includeTopic}`
              );
            }}
            className="mt-6 w-full rounded-xl bg-slate-900 px-5 py-4 font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            시험 시작
          </button>
        </section>
      </div>
    </main>
  );
}