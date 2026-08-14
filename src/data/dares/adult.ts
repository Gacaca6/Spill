import { adultDare } from '@/data/builders';

/**
 * 18+ dares — a separate content system, never merged into the general pool.
 *
 * These create tension and laughter through performance and confession, not
 * through physical acts. No dare here requires touching anyone, removing
 * anything, photographing anything, or handing over a phone or an account.
 */
export const adultDares = [
  adultDare('d18-001', 'Deliver the smoothest line you know to the person on your right. Full conviction.', 2, { needsOther: true, minPlayers: 3 }),
  adultDare('d18-002', 'Describe your ideal date in enough detail that everyone can picture it.', 1),
  adultDare('d18-003', 'Give the group a masterclass on how you flirt. Demonstrate on nobody.', 2, { playerMode: 'group' }),
  adultDare('d18-004', 'Act out the exact moment you realised you were into someone.', 3),
  adultDare('d18-005', 'Give someone here a genuine compliment about something other than their face.', 2, { needsOther: true, minPlayers: 3 }),
  adultDare('d18-006', 'Reenact your worst ever attempt at being seductive. Play it for laughs.', 3),
  adultDare('d18-007', 'Say the most romantic sentence you can invent, right now, no preparation.', 2),
  adultDare('d18-008', 'Do a dramatic reading of the last flirty message you sent.', 3),
  adultDare('d18-009', 'Pretend the person opposite you is your date and ruin it in three sentences.', 2, { needsOther: true, minPlayers: 3 }),
  adultDare('d18-010', 'Describe the type of person you are attracted to without naming a single physical trait.', 2),
  adultDare('d18-011', 'Give a 30-second speech on why someone should date you. Be shameless.', 3),
  adultDare('d18-012', 'Act out the worst possible way to say "I like you".', 2),
  adultDare('d18-013', 'Let the group ask you one question about your dating life. You answer honestly.', 4, { playerMode: 'group', minPlayers: 3 }),
  adultDare('d18-014', 'Perform your most convincing "I was not staring at you" recovery.', 3),
  adultDare('d18-015', 'Tell the group the exact compliment you would want to hear tonight.', 3),
  adultDare('d18-016', 'Roleplay a cheesy romantic film confession scene, alone, out loud.', 3),
  adultDare('d18-017', 'Rate your own flirting out of ten and let the group correct you.', 3, { playerMode: 'group', minPlayers: 3 }),
  adultDare('d18-018', 'Describe your dream partner as if you are filing a missing persons report.', 2),
  adultDare('d18-019', 'Give the group your genuine, unfiltered opinion on grand romantic gestures.', 2),
  adultDare('d18-020', 'Act out how you behave in the first five minutes of a date versus the last five.', 3),
  adultDare('d18-021', 'Tell everyone the boldest thing you would say to someone if there were no consequences.', 4),
  adultDare('d18-022', 'Do an impression of yourself the last time you were genuinely nervous around someone.', 3),
  adultDare('d18-023', 'Let the person on your left invent a pickup line and you have to deliver it convincingly.', 3, { needsOther: true, minPlayers: 3 }),
  adultDare('d18-024', 'Give a serious, no-jokes answer: what makes someone unforgettable to you?', 3),
  adultDare('d18-025', 'Describe the most attractive thing someone has ever said to you, word for word.', 3),
  adultDare('d18-026', 'Perform a break-up speech for a relationship that never existed.', 3),
  adultDare('d18-027', 'Pitch yourself to the group like a dating profile read aloud by an announcer.', 3, { playerMode: 'group' }),
  adultDare('d18-028', 'Tell the group one thing you would want a partner to never find out from anyone else.', 4),
  adultDare('d18-029', 'Act out your reaction to being asked out by someone completely unexpected.', 2),
  adultDare('d18-030', 'Give the most convincing 20-second argument that you are a catch.', 3),
  adultDare('d18-031', 'Confess the most obvious hint you ever dropped that was completely ignored.', 3),
  adultDare('d18-032', 'Let the group choose one word you must use flirtatiously until your next turn.', 3, { playerMode: 'group', minPlayers: 3 }),
  adultDare('d18-033', 'Describe what a perfect Sunday with someone you like looks like.', 1),
  adultDare('d18-034', 'Deliver a toast to everyone you have ever had a crush on.', 3),
  adultDare('d18-035', 'Say something genuinely charming to the person you know least well here.', 3, { needsOther: true, minPlayers: 3 }),
  adultDare('d18-036', 'Act out the difference between how you flirt sober and how you think you flirt.', 3),
  adultDare('d18-037', 'Tell the group what you find most attractive about confidence, with an example.', 2),
  adultDare('d18-038', 'Give a completely straight-faced explanation of your worst romantic decision.', 4),
  adultDare('d18-039', 'Let the group decide which of your exes you have to describe in three fair words.', 4, { playerMode: 'group', minPlayers: 3 }),
  adultDare('d18-040', 'Say the thing you would say to someone if you knew they felt the same way.', 4),
  adultDare('d18-041', 'Perform the most dramatic possible "it is not you, it is me" speech.', 2),
  adultDare('d18-042', 'Describe your love life this year as a film title and a one-line review.', 2),
];
