export function renderInviteEmailFr({ inviteUrl, officeName }: { inviteUrl: string; officeName?: string | null }) {
  const subject = `Activer le compte ${officeName || "de votre bureau"}`;
  const html = `
    <div dir="ltr" lang="fr" style="font-family:Arial,sans-serif;line-height:1.7">
      <h1>Activer le compte du bureau</h1>
      <p>Bonjour,</p>
      <p>Une invitation a été créée pour activer ${officeName || "votre bureau"} sur ArchSaaS.</p>
      <p><a href="${inviteUrl}">Activer le compte</a></p>
      <p>Si vous n’attendiez pas cette invitation, vous pouvez ignorer ce message.</p>
    </div>
  `;
  const text = `Une invitation a été créée pour activer ${officeName || "votre bureau"} sur ArchSaaS : ${inviteUrl}`;
  return { subject, html, text };
}
