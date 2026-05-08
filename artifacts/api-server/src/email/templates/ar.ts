export function renderInviteEmailAr({ inviteUrl, officeName }: { inviteUrl: string; officeName?: string | null }) {
  const subject = `دعوة تفعيل حساب ${officeName || "المكتب"}`;
  const html = `
    <div dir="rtl" lang="ar" style="font-family:Arial,sans-serif;line-height:1.7">
      <h1>تفعيل حساب المكتب</h1>
      <p>مرحباً،</p>
      <p>تم إنشاء دعوة لتفعيل حساب ${officeName || "مكتبك"} على ArchSaaS.</p>
      <p><a href="${inviteUrl}">تفعيل الحساب</a></p>
      <p>إذا لم تكن تتوقع هذه الدعوة، يمكنك تجاهل هذه الرسالة.</p>
    </div>
  `;
  const text = `تم إنشاء دعوة لتفعيل حساب ${officeName || "مكتبك"} على ArchSaaS: ${inviteUrl}`;
  return { subject, html, text };
}
