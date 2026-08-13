export function isInvitationPasswordSetup(search: string): boolean {
  return new URLSearchParams(search).get("invite") === "1";
}

export function passwordSetupDestination(search: string): string {
  return isInvitationPasswordSetup(search) ? "/account?invited=1" : "/login";
}
