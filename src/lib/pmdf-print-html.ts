/** Printable HTML for Performance Management & Development Form (PMDF). */

import {
  BUSINESS_OBJECTIVE_RATINGS,
  BUSINESS_RATING_BANDS,
  DEVELOPMENT_OBJECTIVE_RATINGS,
} from "@/lib/pmdf-reference";
import { calcPmdfScores } from "@/lib/pmdf-scoring";
import type { PerformanceCycle, PmdfForm } from "@/lib/store/types";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cell(v: string | number | null | undefined): string {
  if (v == null || v === "") return "—";
  return esc(String(v));
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return d;
  }
}

export function buildPmdfPrintHtml(cycle: PerformanceCycle, form: PmdfForm): string {
  const scores = calcPmdfScores(form.businessObjectives, form.developmentObjectives);

  const boRows = form.businessObjectives
    .map(
      (r, i) => `
    <tr>
      <td style="padding:6px;border:1px solid #ccc;text-align:center;">${i + 1}</td>
      <td style="padding:6px;border:1px solid #ccc;">${cell(r.objectiveSmart)}</td>
      <td style="padding:6px;border:1px solid #ccc;">${cell(r.action)}</td>
      <td style="padding:6px;border:1px solid #ccc;">${cell(r.employeeComments)}</td>
      <td style="padding:6px;border:1px solid #ccc;text-align:center;">${r.percentage}%</td>
      <td style="padding:6px;border:1px solid #ccc;text-align:center;">${cell(r.selfScoreFy)}</td>
      <td style="padding:6px;border:1px solid #ccc;text-align:center;">${cell(r.finalScoreFy)}</td>
      <td style="padding:6px;border:1px solid #ccc;">${cell(r.managerCommentsHalfYear)}</td>
      <td style="padding:6px;border:1px solid #ccc;">${cell(r.managerCommentsFullYear)}</td>
    </tr>`,
    )
    .join("");

  const doRows = form.developmentObjectives
    .map(
      (r) => `
    <tr>
      <td style="padding:6px;border:1px solid #ccc;font-weight:600;">${cell(r.pillar)}</td>
      <td style="padding:6px;border:1px solid #ccc;">${cell(r.actionPlan)}</td>
      <td style="padding:6px;border:1px solid #ccc;text-align:center;">${r.percentage}%</td>
      <td style="padding:6px;border:1px solid #ccc;text-align:center;">${cell(r.selfScoreFy)}</td>
      <td style="padding:6px;border:1px solid #ccc;text-align:center;">${cell(r.finalScoreFy)}</td>
      <td style="padding:6px;border:1px solid #ccc;">${cell(r.managerCommentsHalfYear)}</td>
      <td style="padding:6px;border:1px solid #ccc;">${cell(r.managerCommentsFullYear)}</td>
    </tr>`,
    )
    .join("");

  const boScale = BUSINESS_OBJECTIVE_RATINGS.map(
    (r) => `<li><strong>${r.code} (${r.scale})</strong> — ${esc(r.label)}</li>`,
  ).join("");

  const doScale = DEVELOPMENT_OBJECTIVE_RATINGS.map(
    (r) => `<li><strong>${r.code} (${r.scale})</strong> — ${esc(r.label)}</li>`,
  ).join("");

  const ratingBands = BUSINESS_RATING_BANDS.map(
    (b) =>
      `<tr><td style="padding:4px 6px;border:1px solid #ccc;">${esc(b.label)}</td><td style="padding:4px 6px;border:1px solid #ccc;text-align:center;">${b.from} – ${b.till}</td><td style="padding:4px 6px;border:1px solid #ccc;">${esc(b.note)}</td><td style="padding:4px 6px;border:1px solid #ccc;font-size:11px;">${esc(b.description)}</td></tr>`,
  ).join("");

  const locked = form.locked || cycle.locked;

  return `
<div class="pmdf-print-root" style="font-family:Arial,Helvetica,sans-serif;max-width:960px;margin:0 auto;color:#111;font-size:12px;line-height:1.4;">
  <header style="text-align:center;border-bottom:2px solid #1a3d2e;padding-bottom:12px;margin-bottom:16px;">
    <h1 style="margin:0;font-size:18px;color:#1a3d2e;">Performance Management &amp; Development Form</h1>
    <p style="margin:6px 0 0;font-size:13px;">${esc(cycle.title)} · ${fmtDate(cycle.startDate)} – ${fmtDate(cycle.endDate)}</p>
    ${locked ? `<p style="margin:4px 0 0;color:#b45309;font-weight:700;">State: Locked</p>` : `<p style="margin:4px 0 0;color:#166534;">State: Open</p>`}
  </header>

  <section style="margin-bottom:16px;">
    <h2 style="font-size:13px;background:#f3f4f6;padding:6px 8px;margin:0 0 8px;">Employee details</h2>
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="width:22%;padding:4px 6px;color:#555;">Name</td><td style="padding:4px 6px;">${cell(form.employeeName)}</td>
          <td style="width:22%;padding:4px 6px;color:#555;">Emp ID</td><td style="padding:4px 6px;">${cell(form.employeeIdDisplay)}</td></tr>
      <tr><td style="padding:4px 6px;color:#555;">Job Title</td><td style="padding:4px 6px;">${cell(form.jobTitle)}</td>
          <td style="padding:4px 6px;color:#555;">Line Manager</td><td style="padding:4px 6px;">${cell(form.lineManagerName)}</td></tr>
      <tr><td style="padding:4px 6px;color:#555;">Department</td><td style="padding:4px 6px;">${cell(form.department)}</td>
          <td style="padding:4px 6px;color:#555;">Sub Department</td><td style="padding:4px 6px;">${cell(form.subDepartment)}</td></tr>
      <tr><td style="padding:4px 6px;color:#555;">Location</td><td style="padding:4px 6px;">${cell(form.location)}</td>
          <td style="padding:4px 6px;color:#555;">Functional Area</td><td style="padding:4px 6px;">${cell(form.functionalArea)}</td></tr>
      <tr><td style="padding:4px 6px;color:#555;">Location Category</td><td colspan="3" style="padding:4px 6px;">${cell(form.locationCategory)}</td></tr>
    </table>
  </section>

  <section style="margin-bottom:16px;">
    <h2 style="font-size:13px;background:#f3f4f6;padding:6px 8px;margin:0 0 8px;">Overall scores</h2>
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="padding:6px;border:1px solid #ccc;">Overall PMDP Score</td>
        <td style="padding:6px;border:1px solid #ccc;font-weight:700;">${scores.overallPmdpScore.toFixed(2)}</td>
        <td style="padding:6px;border:1px solid #ccc;">BO Final Rating (80%)</td>
        <td style="padding:6px;border:1px solid #ccc;">${scores.businessRating70.toFixed(2)}</td>
        <td style="padding:6px;border:1px solid #ccc;">DO Final Rating (20%)</td>
        <td style="padding:6px;border:1px solid #ccc;">${scores.developmentRating30.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding:6px;border:1px solid #ccc;">BO Self Weightage</td>
        <td style="padding:6px;border:1px solid #ccc;">${scores.businessSelf.toFixed(2)}</td>
        <td style="padding:6px;border:1px solid #ccc;">BO Final Weightage</td>
        <td style="padding:6px;border:1px solid #ccc;">${scores.businessFinal.toFixed(2)}</td>
        <td style="padding:6px;border:1px solid #ccc;">DO Self / Final</td>
        <td style="padding:6px;border:1px solid #ccc;">${scores.developmentSelf.toFixed(2)} / ${scores.developmentFinal.toFixed(2)}</td>
      </tr>
    </table>
  </section>

  <section style="margin-bottom:16px;">
    <h2 style="font-size:13px;background:#f3f4f6;padding:6px 8px;margin:0 0 8px;">Business Objectives (must total 100%)</h2>
    <table style="width:100%;border-collapse:collapse;font-size:11px;">
      <thead>
        <tr style="background:#e5e7eb;">
          <th style="padding:6px;border:1px solid #ccc;">Sr #</th>
          <th style="padding:6px;border:1px solid #ccc;">SMART Objective</th>
          <th style="padding:6px;border:1px solid #ccc;">Action</th>
          <th style="padding:6px;border:1px solid #ccc;">Employee Comments</th>
          <th style="padding:6px;border:1px solid #ccc;">%age</th>
          <th style="padding:6px;border:1px solid #ccc;">Self Score FY (1-5)</th>
          <th style="padding:6px;border:1px solid #ccc;">Manager Score FY (1-5)</th>
          <th style="padding:6px;border:1px solid #ccc;">Mgr HY</th>
          <th style="padding:6px;border:1px solid #ccc;">Mgr FY</th>
        </tr>
      </thead>
      <tbody>${boRows}</tbody>
      <tfoot><tr><td colspan="4" style="padding:6px;border:1px solid #ccc;text-align:right;font-weight:600;">Total</td><td style="padding:6px;border:1px solid #ccc;text-align:center;font-weight:600;">${scores.businessTotalPercentage}%</td><td colspan="4"></td></tr></tfoot>
    </table>
    <div style="margin-top:8px;font-size:11px;"><strong>BO Rating scale:</strong><ul style="margin:4px 0;padding-left:18px;">${boScale}</ul></div>
  </section>

  <section style="margin-bottom:16px;">
    <h2 style="font-size:13px;background:#f3f4f6;padding:6px 8px;margin:0 0 8px;">Development Objectives — minimum 3 traits mandatory (must total 100%)</h2>
    <table style="width:100%;border-collapse:collapse;font-size:11px;">
      <thead>
        <tr style="background:#e5e7eb;">
          <th style="padding:6px;border:1px solid #ccc;">Pillar</th>
          <th style="padding:6px;border:1px solid #ccc;">Action Plan</th>
          <th style="padding:6px;border:1px solid #ccc;">%age</th>
          <th style="padding:6px;border:1px solid #ccc;">Self FY (1-5)</th>
          <th style="padding:6px;border:1px solid #ccc;">Manager FY (1-5)</th>
          <th style="padding:6px;border:1px solid #ccc;">Mgr HY</th>
          <th style="padding:6px;border:1px solid #ccc;">Mgr FY</th>
        </tr>
      </thead>
      <tbody>${doRows}</tbody>
      <tfoot><tr><td colspan="2" style="padding:6px;border:1px solid #ccc;text-align:right;font-weight:600;">Total</td><td style="padding:6px;border:1px solid #ccc;text-align:center;font-weight:600;">${scores.developmentTotalPercentage}%</td><td colspan="4"></td></tr></tfoot>
    </table>
    <div style="margin-top:8px;font-size:11px;"><strong>DO Rating scale:</strong><ul style="margin:4px 0;padding-left:18px;">${doScale}</ul></div>
  </section>

  <section style="margin-bottom:16px;">
    <h2 style="font-size:13px;background:#f3f4f6;padding:6px 8px;margin:0 0 8px;">Performance rating bands</h2>
    <table style="width:100%;border-collapse:collapse;font-size:11px;">
      <thead><tr style="background:#e5e7eb;"><th style="padding:4px 6px;border:1px solid #ccc;">Band</th><th style="padding:4px 6px;border:1px solid #ccc;">Range</th><th style="padding:4px 6px;border:1px solid #ccc;">Note</th><th style="padding:4px 6px;border:1px solid #ccc;">Description</th></tr></thead>
      <tbody>${ratingBands}</tbody>
    </table>
  </section>

  <section style="margin-bottom:16px;">
    <h2 style="font-size:13px;background:#f3f4f6;padding:6px 8px;margin:0 0 8px;">Feedback &amp; signatures</h2>
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="width:50%;padding:8px;border:1px solid #ccc;vertical-align:top;"><strong>Employee Mid Year</strong><br/>${cell(form.employeeFeedbackMidYear)}</td>
          <td style="padding:8px;border:1px solid #ccc;vertical-align:top;"><strong>Manager Mid Year</strong><br/>${cell(form.managerFeedbackMidYear)}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ccc;vertical-align:top;"><strong>Employee Full Year</strong><br/>${cell(form.employeeFeedbackFy)}</td>
          <td style="padding:8px;border:1px solid #ccc;vertical-align:top;"><strong>Manager Full Year</strong><br/>${cell(form.managerFeedbackFy)}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ccc;"><strong>Employee signature</strong><br/>${cell(form.employeeSignature)}<br/><span style="font-size:10px;color:#666;">${fmtDate(form.employeeSignedAt)}</span></td>
          <td style="padding:8px;border:1px solid #ccc;"><strong>Manager signature</strong><br/>${cell(form.managerSignature)}<br/><span style="font-size:10px;color:#666;">${fmtDate(form.managerSignedAt)}</span></td></tr>
    </table>
  </section>

  <footer style="font-size:10px;color:#666;text-align:center;border-top:1px solid #ddd;padding-top:8px;">
  Printed from Kastros HR · ${new Date().toLocaleString()}
  </footer>
</div>`;
}
