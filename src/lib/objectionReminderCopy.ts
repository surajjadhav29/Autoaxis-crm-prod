import { OBJECTION_REMINDER_DAYS } from './objectionReminder';

export function objectionOverdueThresholdText(): string {
  return `${OBJECTION_REMINDER_DAYS} days`;
}

export function objectionOverdueBannerMessage(count: number): string {
  const threshold = objectionOverdueThresholdText();
  if (count === 1) {
    return `1 objection paper has been in Objection for ${threshold} or longer. Review and update status.`;
  }
  return `${count} objection papers have been in Objection for ${threshold} or longer. Review and update status.`;
}

export function objectionReminderModalIntro(count: number): string {
  const threshold = objectionOverdueThresholdText();
  if (count === 1) {
    return `1 file has been in Objection for ${threshold} or longer. Review and update its status.`;
  }
  return `${count} files have been in Objection for ${threshold} or longer. Review and update their status.`;
}
