import { normalizeApiLanguage, type ApiLanguage } from "../../i18n/messages";
import { renderInviteEmailAr } from "./ar";
import { renderInviteEmailEn } from "./en";
import { renderInviteEmailFr } from "./fr";

type InviteEmailInput = {
  language?: string | null;
  inviteUrl: string;
  officeName?: string | null;
};

const renderers: Record<ApiLanguage, (input: InviteEmailInput) => { subject: string; html: string; text: string }> = {
  ar: renderInviteEmailAr,
  en: renderInviteEmailEn,
  fr: renderInviteEmailFr,
};

export function renderInviteEmail(input: InviteEmailInput) {
  return renderers[normalizeApiLanguage(input.language)](input);
}
