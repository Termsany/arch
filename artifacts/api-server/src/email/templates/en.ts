export function renderInviteEmailEn({ inviteUrl, officeName }: { inviteUrl: string; officeName?: string | null }) {
  const subject = `Activate ${officeName || "your office"} account`;
  const html = `
    <div dir="ltr" lang="en" style="font-family:Arial,sans-serif;line-height:1.7">
      <h1>Activate your office account</h1>
      <p>Hello,</p>
      <p>An invitation was created to activate ${officeName || "your office"} on ArchSaaS.</p>
      <p><a href="${inviteUrl}">Activate account</a></p>
      <p>If you were not expecting this invitation, you can ignore this message.</p>
    </div>
  `;
  const text = `An invitation was created to activate ${officeName || "your office"} on ArchSaaS: ${inviteUrl}`;
  return { subject, html, text };
}
