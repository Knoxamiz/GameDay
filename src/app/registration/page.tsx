"use client";

import Link from "next/link";
import { useState } from "react";
import MvpNav from "../components/MvpNav";

const parentFields = ["First Name", "Last Name", "Email", "Phone Number"];
const athleteFields = [
  "First Name",
  "Last Name",
  "Date of Birth",
  "Grade",
  "School",
  "Jersey Size",
];

const progressByStep = {
  1: "w-1/4",
  2: "w-1/2",
  3: "w-3/4",
  4: "w-full",
};

type RegistrationStep = 1 | 2 | 3 | 4 | 5;
type FormStep = Exclude<RegistrationStep, 5>;

function isFormStep(step: RegistrationStep): step is FormStep {
  return step < 5;
}

function RegistrationHeader({ step }: { step: FormStep }) {
  return (
    <>
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
        <h1 className="text-3xl font-bold">GameDay</h1>
      </div>

      <p className="mt-5 text-slate-300">Black Diamonds Girls Flag Football</p>
      <h2 className="mt-4 text-xl font-bold">Registration</h2>
      <p className="mt-2 text-sm text-slate-400">Step {step} of 4</p>
      <div className="mt-3 h-3 rounded-full bg-slate-800">
        <div
          className={`${progressByStep[step]} h-3 rounded-full bg-blue-500`}
        />
      </div>
    </>
  );
}

function TextField({ label }: { label: string }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-300">{label}</span>
      <input
        className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
        type="text"
      />
    </label>
  );
}

export default function RegistrationHome() {
  const [step, setStep] = useState<RegistrationStep>(1);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav />

        {isFormStep(step) && <RegistrationHeader step={step} />}

        {step === 1 && (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <h3 className="text-lg font-bold">Parent Information</h3>
            <div className="mt-4 space-y-4">
              {parentFields.map((field) => (
                <TextField key={field} label={field} />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="mt-5 w-full rounded-xl bg-blue-500 py-3 font-semibold text-white"
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <h3 className="text-lg font-bold">Athlete Information</h3>
            <div className="mt-4 space-y-4">
              {athleteFields.map((field) => (
                <TextField key={field} label={field} />
              ))}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-xl border border-slate-700 bg-slate-900 py-3 font-semibold text-white"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="rounded-xl bg-blue-500 py-3 font-semibold text-white"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <h3 className="text-lg font-bold">Required Documents</h3>
            <div className="mt-4 space-y-4 text-sm text-slate-300">
              <div className="rounded-xl bg-slate-800 p-4">
                <p className="font-semibold text-white">Birth Certificate</p>
                <button
                  type="button"
                  className="mt-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 font-semibold text-white"
                >
                  Upload File
                </button>
                <p className="mt-3 text-blue-300">Uploaded</p>
              </div>

              <div className="rounded-xl bg-slate-800 p-4">
                <p className="font-semibold text-white">Physical Form</p>
                <button
                  type="button"
                  className="mt-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 font-semibold text-white"
                >
                  Upload File
                </button>
                <p className="mt-3 text-red-300">Missing</p>
              </div>

              <label className="flex items-center gap-3 rounded-xl bg-slate-800 p-4">
                <input type="checkbox" className="h-4 w-4" />
                <span>Waiver - I Agree</span>
              </label>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-xl border border-slate-700 bg-slate-900 py-3 font-semibold text-white"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="rounded-xl bg-blue-500 py-3 font-semibold text-white"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <h3 className="text-lg font-bold">Review</h3>
            <div className="mt-4 space-y-4 text-sm text-slate-300">
              <div>
                <p className="text-slate-400">Parent:</p>
                <p className="mt-1 font-semibold text-white">Jennifer Smith</p>
              </div>
              <div>
                <p className="text-slate-400">Athlete:</p>
                <p className="mt-1 font-semibold text-white">Emma Smith</p>
              </div>
              <div>
                <p className="text-slate-400">Team:</p>
                <p className="mt-1 font-semibold text-white">12U Girls</p>
              </div>
              <div className="space-y-2">
                <p>Birth Certificate Complete</p>
                <p>Physical Complete</p>
                <p>Waiver Complete</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStep(5)}
              className="mt-5 w-full rounded-xl bg-blue-500 py-3 font-semibold text-white"
            >
              Submit Registration
            </button>
          </div>
        )}

        {step === 5 && (
          <>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
              <h1 className="text-3xl font-bold">GameDay</h1>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
              <h2 className="text-2xl font-bold">Registration Submitted</h2>
              <p className="mt-4 text-xl font-semibold">Emma Smith</p>
              <p className="mt-1 text-sm text-slate-300">12U Girls</p>
              <p className="mt-5 text-sm font-semibold text-slate-400">
                Status:
              </p>
              <p className="mt-1 font-semibold text-blue-300">
                Pending Review
              </p>
              <p className="mt-5 text-sm font-semibold text-slate-400">
                Submitted:
              </p>
              <p className="mt-1 text-sm text-slate-300">May 31, 2026</p>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h3 className="text-lg font-bold">What Happens Next?</h3>
              <div className="mt-3 space-y-3 text-sm text-slate-300">
                <p>Admin reviews registration</p>
                <p>Team assignment confirmed</p>
                <p>Parent notified automatically</p>
              </div>
            </div>

            <Link
              href="/"
              className="mt-4 block w-full rounded-xl bg-blue-500 py-3 text-center font-semibold text-white"
            >
              Return Home
            </Link>
          </>
        )}
      </section>
    </main>
  );
}
