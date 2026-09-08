/**
 * Invokes browser print dialog. When styled with @media print in app.css,
 * this generates a clean, executive PDF / printed mathematical report.
 */
export function printReport(): void {
  window.print();
}
