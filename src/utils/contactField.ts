/** Phone columns stay in the spreadsheet but are not shown or stored on the allocation. */
export function isPrivateContactField(label: string): boolean {
  const normalized = label.toLowerCase().replace(/[^a-z]/g, '');
  return normalized.includes('mobile') || normalized.includes('phone');
}
