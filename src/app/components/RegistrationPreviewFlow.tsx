"use client";

import Link from "next/link";
import { useState } from "react";
import type { RegistrationInvite } from "../data/invites";
import { blackDiamondsOrganization } from "../data/organizations";
import { registrationForm } from "../data/registrations";

const progressByStep = {
  1: "w-1/4",
  2: "w-1/2",
  3: "w-3/4",
  4: "w-full",
};

type RegistrationStep = 1 | 2 | 3 | 4 | 5;
type FormStep = Exclude<RegistrationStep, 5>;

type RegistrationPreviewFlowProps = {
  primaryInvite?: RegistrationInvite;
};

function isFormStep(step: RegistrationStep): step is FormStep {
  return step < 5;
}

function RegistrationHeader({ step }: { step: FormStep }) {
  return (
    <>
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
        <h1 className="text-3xl font-bold">GameDay</h1>
      </div>

      <p className="mt-5 text-slate-300">{blackDiamondsOrganization.name}</p>
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

export default function RegistrationPreviewFlow({
  primaryInvite,
}: RegistrationPreviewFlowProps) {
  const [step, setStep] = useState<RegistrationStep>(1);

  return (
    <>
      {isFormStep(step) && <RegistrationHeader step={step} />}

      {step === 1 && primaryInvite && (
        <Link
          href={primaryInvite.inviteUrl}
          className="mt-5 block rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5 shadow-lg"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">
            QR / Team Invite
          </p>
          <h3 className="mt-2 text-lg font-bold">{primaryInvite.title}</h3>
          <p className="mt-2 text-sm text-slate-300">
            Add an athlete through the team invite and see what is still
            missing before admin review.
          </p>
        </Link>
      )}

      {step === 1 && (
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h3 className="text-lg font-bold">Parent Information</h3>
          <div className="mt-4 space-y-4">
            {registrationForm.parentFields.map((field) => (
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
            {registrationForm.athleteFields.map((field) => (
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
            {registrationForm.documents.map((document) => (
              <div key={document.label} className="rounded-xl bg-slate-800 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-white">{document.label}</p>
                  <span
                    className={
                      document.tone === "complete"
                        ? "rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300"
                        : "rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-300"
                    }
                  >
                    {document.status}
                  </span>
                </div>
                <p
                  className={
                    document.tone === "complete"
                      ? "mt-3 text-blue-300"
                      : "mt-3 text-red-300"
                  }
                >
                  {document.helperText}
                </p>
              </div>
            ))}

            <label className="flex items-center gap-3 rounded-xl bg-slate-800 p-4">
              <input type="checkbox" className="h-4 w-4" />
              <span>{registrationForm.waiverLabel}</span>
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
              <p className="mt-1 font-semibold text-white">
                {registrationForm.review.parentName}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Athlete:</p>
              <p className="mt-1 font-semibold text-white">
                {registrationForm.review.athleteName}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Team:</p>
              <p className="mt-1 font-semibold text-white">
                {registrationForm.review.teamLabel}
              </p>
            </div>
            <div className="space-y-2">
              {registrationForm.review.requirements.map((requirement) => (
                <p key={requirement}>{requirement}</p>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStep(5)}
            className="mt-5 w-full rounded-xl bg-blue-500 py-3 font-semibold text-white"
          >
            Submit Preview Registration
          </button>
        </div>
      )}

      {step === 5 && (
        <>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <h1 className="text-3xl font-bold">GameDay</h1>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <h2 className="text-2xl font-bold">Preview Registration Submitted</h2>
            <p className="mt-4 text-xl font-semibold">
              {registrationForm.submitted.athleteName}
            </p>
            <p className="mt-1 text-sm text-slate-300">
              {registrationForm.submitted.teamLabel}
            </p>
            <p className="mt-5 text-sm font-semibold text-slate-400">
              Status:
            </p>
            <p className="mt-1 font-semibold text-blue-300">
              {registrationForm.submitted.status}
            </p>
            <p className="mt-5 text-sm font-semibold text-slate-400">
              Submitted:
            </p>
            <p className="mt-1 text-sm text-slate-300">
              {registrationForm.submitted.submittedDate}
            </p>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="text-lg font-bold">What Happens Next?</h3>
            <div className="mt-3 space-y-3 text-sm text-slate-300">
              {registrationForm.submitted.nextSteps.map((stepText) => (
                <p key={stepText}>{stepText}</p>
              ))}
            </div>
          </div>

          <Link
            href="/parent"
            className="mt-4 block w-full rounded-xl bg-blue-500 py-3 text-center font-semibold text-white"
          >
            Return Home
          </Link>
        </>
      )}
    </>
  );
}
