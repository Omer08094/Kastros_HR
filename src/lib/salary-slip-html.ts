/** Printable / preview HTML for salary slips (letterhead is a template until real assets are supplied). */

export type SalarySlipModel = {
  companyName: string;
  companyTagline: string;
  employeeName: string;
  employeeTitle: string;
  department: string;
  employeeEmail: string;
  periodLabel: string;
  baseSalary: number;
  hoursWorked: number;
  hourlyRate: number;
  allowances: { type: string; amount: number }[];
  grossPay: number;
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildSalarySlipHtml(m: SalarySlipModel): string {
  const allowanceRows = m.allowances.length
    ? m.allowances
        .map(
          (a) =>
            `<tr><td style="padding:6px 8px;border-bottom:1px solid #e8e4dc;">${esc(a.type)}</td><td style="padding:6px 8px;border-bottom:1px solid #e8e4dc;text-align:right;">${a.amount.toFixed(2)}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="2" style="padding:6px 8px;color:#6b7c6e;font-size:12px;">No allowances this period</td></tr>`;

  const hourlySubtotal = m.hoursWorked * m.hourlyRate;

  return `
<div class="salary-slip-root" style="font-family:Georgia,ui-serif,serif;max-width:640px;margin:0 auto;color:#1a2e1f;line-height:1.45;">
  <header style="border-bottom:3px solid #b8860b;padding-bottom:14px;margin-bottom:20px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;">
      <div>
        <div style="font-size:10px;letter-spacing:0.25em;text-transform:uppercase;color:#6b7c6e;">Salary statement</div>
        <h1 style="margin:6px 0 0;font-size:24px;font-weight:700;color:#1a3d2e;">${esc(m.companyName)}</h1>
        <p style="margin:4px 0 0;font-size:12px;color:#5c6b5f;">${esc(m.companyTagline)}</p>
      </div>
      <div style="text-align:right;font-size:11px;color:#6b7c6e;border:1px solid #e8e4dc;padding:8px 12px;border-radius:8px;background:#faf8f3;">
        <div style="font-weight:600;color:#1a2e1f;">Period</div>
        <div>${esc(m.periodLabel)}</div>
      </div>
    </div>
    <p style="margin:12px 0 0;font-size:10px;color:#8a9487;">This block is a placeholder letterhead — replace with your official logo and registered address when ready.</p>
  </header>

  <section style="margin-bottom:18px;">
    <h2 style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#b8860b;margin:0 0 8px;">Employee</h2>
    <table style="width:100%;font-size:13px;">
      <tr><td style="color:#6b7c6e;width:38%;">Name</td><td>${esc(m.employeeName)}</td></tr>
      <tr><td style="color:#6b7c6e;">Title</td><td>${esc(m.employeeTitle)}</td></tr>
      <tr><td style="color:#6b7c6e;">Department</td><td>${esc(m.department)}</td></tr>
      <tr><td style="color:#6b7c6e;">Work email</td><td>${esc(m.employeeEmail)}</td></tr>
    </table>
  </section>

  <section style="margin-bottom:18px;">
    <h2 style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#b8860b;margin:0 0 8px;">Earnings</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead>
        <tr style="background:#f3f0e8;">
          <th style="text-align:left;padding:8px;border-bottom:2px solid #cfc7b4;">Component</th>
          <th style="text-align:right;padding:8px;border-bottom:2px solid #cfc7b4;width:28%;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr><td style="padding:6px 8px;border-bottom:1px solid #e8e4dc;">Contract / appointment base</td><td style="padding:6px 8px;border-bottom:1px solid #e8e4dc;text-align:right;">${m.baseSalary.toFixed(2)}</td></tr>
        <tr><td style="padding:6px 8px;border-bottom:1px solid #e8e4dc;">Hourly earnings (${m.hoursWorked} × ${m.hourlyRate})</td><td style="padding:6px 8px;border-bottom:1px solid #e8e4dc;text-align:right;">${hourlySubtotal.toFixed(2)}</td></tr>
        ${allowanceRows}
        <tr style="font-weight:700;background:#faf8f3;">
          <td style="padding:10px 8px;border-top:2px solid #b8860b;">Gross payroll (this period)</td>
          <td style="padding:10px 8px;border-top:2px solid #b8860b;text-align:right;">${m.grossPay.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
  </section>

  <footer style="font-size:10px;color:#8a9487;border-top:1px solid #e8e4dc;padding-top:12px;">
    Generated for internal use. Gross = base + hourly earnings + allowances per Kastros HR. Confidential.
  </footer>
</div>`;
}
