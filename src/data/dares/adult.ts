import { adultDare } from '@/data/builders';

/**
 * 18+ dares — a separate content system, never merged into the general pool.
 *
 * Two kinds live here.
 *
 * **Solo dares** are performance and confession: say it, describe it, read it
 * out, act it. The filth is in the language. They land on the player who was
 * picked and nobody else.
 *
 * **Partner dares** (`partner: true`) involve a second player, who the engine
 * picks and who is asked privately, before the card is ever shown to the room,
 * whether they are in. A pass is silent — the room never learns who declined,
 * so declining costs nothing socially and the dare is simply redrawn. This is
 * why these can be physical at all: the person on the receiving end chooses,
 * rather than a shuffle choosing for them.
 *
 * The ceiling on partner dares is kissing and close contact, fully clothed.
 * Nothing here instructs a sexual act, undressing, or anything a group setting
 * cannot walk back.
 */
export const adultDares = [
  // ── 1 · flirty, solo ───────────────────────────────────────────────────────
  adultDare('d18-001', 'Describe your ideal date in enough detail that everyone can picture it.', 1),
  adultDare('d18-002', 'Give a 30-second pitch for why someone should date you. Be shameless.', 1),
  adultDare('d18-003', 'Describe the type of person you are drawn to without naming a single physical trait.', 1),
  adultDare('d18-004', 'Deliver the smoothest line you know to the room. Full conviction.', 1),
  adultDare('d18-005', 'Do your best impression of yourself trying to be mysterious.', 1),
  adultDare('d18-006', 'Describe what a perfect Sunday with someone you like looks like.', 1),
  adultDare('d18-007', 'Rate your own flirting out of ten and let the group correct you.', 1, { playerMode: 'group', minPlayers: 3 }),
  adultDare('d18-008', 'Act out the exact moment you realised you were into someone.', 1),
  adultDare('d18-009', 'Give the group your honest, unfiltered opinion on grand romantic gestures.', 1),
  adultDare('d18-010', 'Describe your dream partner as if you are filing a missing persons report.', 1),
  adultDare('d18-011', 'Perform your most dramatic "we need to talk" opening line.', 1),
  adultDare('d18-012', 'Explain your entire dating history using only film genres.', 1),
  adultDare('d18-013', 'Give a toast to everyone who has ever left you on read.', 1),
  adultDare('d18-014', 'Act out how you behave in the first five minutes of a date versus the last five.', 1),
  adultDare('d18-015', 'Say the cheesiest romantic line you know, with total sincerity, to the room.', 1),
  adultDare('d18-016', 'Do an impression of yourself the last time you were genuinely nervous around someone.', 1),
  adultDare('d18-017', 'Describe your love life this year as a film title and a one-line review.', 1),
  adultDare('d18-018', 'Give a completely straight-faced explanation of your worst romantic decision.', 1),
  adultDare('d18-019', 'Tell the group what you find most attractive about confidence, with an example.', 1),
  adultDare('d18-020', 'Perform the most dramatic "it is not you, it is me" speech you can manage.', 1),

  // ── 2 · suggestive, solo ───────────────────────────────────────────────────
  adultDare('d18-021', 'Describe your type physically, in detail, with no polite language.', 2),
  adultDare('d18-022', 'Read out the last flirty message you sent — including the part you deleted.', 2),
  adultDare('d18-023', 'Tell the group the exact compliment you would want to hear tonight.', 2),
  adultDare('d18-024', 'Describe the last time someone properly turned your head, with details.', 2),
  adultDare('d18-025', 'Say the boldest thing you would say to someone if there were no consequences.', 2),
  adultDare('d18-026', 'Tell the group the exact thing that ends a night in your favour.', 2),
  adultDare('d18-027', 'Describe the most tension you have ever had with someone, moment by moment.', 2),
  adultDare('d18-028', 'Do a dramatic reading of the most forward message you have ever received.', 2),
  adultDare('d18-029', 'Describe what you notice first about someone, and be honest rather than polite.', 2),
  adultDare('d18-030', 'Tell the group the exact moment you know you are into someone.', 2),
  adultDare('d18-031', 'Confess the most obvious hint you ever dropped that was completely ignored.', 2),
  adultDare('d18-032', 'Describe the last dream you had about someone. Leave in the parts you would edit.', 2),
  adultDare('d18-033', 'Say out loud the thing you were thinking when your name came up.', 2),
  adultDare('d18-034', 'Describe your ideal first kiss in enough detail that it gets uncomfortable.', 2),
  adultDare('d18-035', 'Tell the group what someone would have to do tonight to get your attention.', 2),
  adultDare('d18-036', 'Reenact your worst ever attempt at being seductive.', 2),
  adultDare('d18-037', 'Describe the hottest thing anyone has ever said to you, word for word.', 2),
  adultDare('d18-038', 'Say the thing you would say to someone if you knew they felt the same way.', 2),
  adultDare('d18-039', 'Describe the last person who wrecked your composure, without naming them.', 2),
  adultDare('d18-040', 'Tell the group the exact scenario you would never admit to daydreaming about.', 2),

  // ── 3 · explicit, solo ─────────────────────────────────────────────────────
  adultDare('d18-041', 'Describe in detail what you would do to someone you were really into. Do not name them.', 3),
  adultDare('d18-042', 'Say the filthiest thing you have ever said to someone, word for word, to the room.', 3),
  adultDare('d18-043', 'Describe exactly what you want done to you. No euphemisms.', 3),
  adultDare('d18-044', 'Talk the group through your ideal night, start to finish, sparing no detail.', 3),
  adultDare('d18-045', 'Describe the best you have ever had, in enough detail that everyone regrets asking.', 3),
  adultDare('d18-046', 'Say your most specific turn-on out loud and explain how you found out.', 3),
  adultDare('d18-047', 'Describe the riskiest thing you have ever done and how close you came to being caught.', 3),
  adultDare('d18-048', 'Tell the group the thing you would ask for if you knew you would get a yes.', 3),
  adultDare('d18-049', 'Describe, out loud, the fantasy you have never told anyone.', 3),
  adultDare('d18-050', 'Confess the most explicit thing you have ever written down.', 3),
  adultDare('d18-051', 'Describe what you are like the first time with someone, honestly.', 3),
  adultDare('d18-052', 'Say the thing you have always wanted to say in the moment and never have.', 3),
  adultDare('d18-053', 'Describe your hard limits and where exactly the line sits.', 3),
  adultDare('d18-054', 'Tell the group the most experimental thing you have agreed to, and how it went.', 3),
  adultDare('d18-055', 'Describe the sound or the word that gets you instantly, and demonstrate the word.', 3),
  adultDare('d18-056', 'Give the group a genuinely useful piece of advice from your own experience.', 3),
  adultDare('d18-057', 'Describe the most confident you have ever been with someone, and what you did.', 3),
  adultDare('d18-058', 'Say the last thing you thought about someone that you would never repeat.', 3),
  adultDare('d18-059', 'Describe the thing you are secretly very good at, and back up the claim.', 3),
  adultDare('d18-060', 'Tell the room the single most explicit sentence you are willing to say out loud.', 3),

  // ── 4 · filthy, solo ───────────────────────────────────────────────────────
  adultDare('d18-061', 'Describe your kink to the room like you are explaining it to a very confused stranger.', 4),
  adultDare('d18-062', 'Say out loud the thing you would need a drink to confess to.', 4),
  adultDare('d18-063', 'Describe the most unhinged thing you have ever agreed to at 2am.', 4),
  adultDare('d18-064', 'Tell the group the thing about you that would genuinely shock them.', 4),
  adultDare('d18-065', 'Describe, in full, the thing that lives rent-free in your head.', 4),
  adultDare('d18-066', 'Confess the thing you have done that you would deny to your family.', 4),
  adultDare('d18-067', 'Describe exactly what you would do if the night ended the way you wanted.', 4),
  adultDare('d18-068', 'Say the dirtiest thought you have had this week, out loud.', 4),
  adultDare('d18-069', 'Let the group ask you three explicit questions. You answer all of them.', 4, { playerMode: 'group', minPlayers: 3 }),
  adultDare('d18-070', 'Describe the thing you want most and have never asked anyone for.', 4),
  adultDare('d18-071', 'Tell the group the thing you would only ever do with the lights off.', 4),
  adultDare('d18-072', 'Describe the most reckless thing you have done because you wanted someone.', 4),
  adultDare('d18-073', 'Say the thing you have never told a partner about your past.', 4),
  adultDare('d18-074', 'Describe the moment you realised what you were actually into.', 4),
  adultDare('d18-075', 'Confess the thing you have done that you would rate a genuine red flag.', 4),
  adultDare('d18-076', 'Describe your worst decision in the most flattering possible terms.', 4),
  adultDare('d18-077', 'Tell the group the thing you would do tonight if nobody ever found out.', 4),
  adultDare('d18-078', 'Describe the most someone has ever begged you for something, and whether they got it.', 4),
  adultDare('d18-079', 'Say the thing you were hoping nobody would ask you tonight.', 4),
  adultDare('d18-080', 'Describe the thing you have only ever admitted to one person.', 4),

  // ── 5 · unhinged, solo ─────────────────────────────────────────────────────
  adultDare('d18-081', 'Tell the room the thing you would take to your grave.', 5),
  adultDare('d18-082', 'Let the group ask you the one question about your love life you least want to answer.', 5, { playerMode: 'group', minPlayers: 3 }),
  adultDare('d18-083', 'Say the thing you would say to your last ex if they walked in right now.', 5),
  adultDare('d18-084', 'Describe the thing you want most in the world, honestly, no jokes.', 5),
  adultDare('d18-085', 'Confess the thing you have been holding back all night.', 5),
  adultDare('d18-086', 'Tell the group the truest thing you could say about yourself right now.', 5),
  adultDare('d18-087', 'Say out loud the thing you have only just admitted to yourself.', 5),
  adultDare('d18-088', 'Describe the last time someone completely wrecked you, and whether you are over it.', 5),
  adultDare('d18-089', 'Tell someone here the thing you have wanted to say to them all night.', 5, { needsOther: true, minPlayers: 3 }),
  adultDare('d18-090', 'Say the thing you would confess right now if you knew everyone would forget it.', 5),

  // ── partner dares · both players opt in first ──────────────────────────────
  // The engine picks the second player and asks them privately. A pass is
  // silent and free — the room never finds out who said no.

  // 1 · flirty
  adultDare('d18-p01', 'Hold eye contact with your partner for thirty seconds. No talking, no laughing.', 1, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p02', 'Give your partner a genuine compliment about something other than their face.', 1, { partner: true, minPlayers: 3 }),
  adultDare('d18-p03', 'Tell your partner the first thing you noticed about them.', 1, { partner: true, minPlayers: 3 }),
  adultDare('d18-p04', 'Deliver your smoothest line directly to your partner, straight-faced.', 1, { partner: true, minPlayers: 3 }),
  adultDare('d18-p05', 'Sit shoulder to shoulder with your partner until your next turn.', 1, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p06', 'Describe your partner as a drink, and make it flattering.', 1, { partner: true, minPlayers: 3 }),
  adultDare('d18-p07', 'Tell your partner one thing about them you have noticed and never mentioned.', 1, { partner: true, minPlayers: 3 }),
  adultDare('d18-p08', 'Guess your partner\'s type out loud. They tell you how close you got.', 1, { partner: true, minPlayers: 3 }),

  // 2 · suggestive
  adultDare('d18-p09', 'Whisper to your partner the first thing you noticed about them. Nobody else hears it.', 2, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p10', 'Tell your partner exactly what you would compliment if you were trying to get their attention.', 2, { partner: true, minPlayers: 3 }),
  adultDare('d18-p11', 'Hold your partner\'s hand and keep eye contact while you answer the group\'s next question.', 2, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p12', 'Slow dance with your partner for thirty seconds. There is no music.', 2, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p13', 'Whisper something to your partner that you would not say out loud to the room.', 2, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p14', 'Tell your partner the most attractive thing about them, in detail, to their face.', 2, { partner: true, minPlayers: 3 }),
  adultDare('d18-p15', 'Sit close enough to your partner that it is slightly too close, until your next turn.', 2, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p16', 'Give your partner a thirty-second shoulder massage.', 2, { partner: true, physical: true, minPlayers: 3 }),

  // 3 · charged
  adultDare('d18-p17', 'Kiss your partner on the cheek.', 3, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p18', 'Whisper into your partner\'s ear the thing you would say to them at the end of the night.', 3, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p19', 'Tell your partner, to their face, exactly what you would do if you were into them.', 3, { partner: true, minPlayers: 3 }),
  adultDare('d18-p20', 'Hold your partner\'s gaze while they describe their type. Do not react.', 3, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p21', 'Trace a word on your partner\'s hand. They have to guess it.', 3, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p22', 'Rest your head on your partner\'s shoulder until your next turn.', 3, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p23', 'Kiss your partner on the neck.', 3, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p24', 'Tell your partner the filthiest thought you are willing to say to their face.', 3, { partner: true, minPlayers: 3 }),

  // 4 · the ones people actually spin for
  adultDare('d18-p25', 'Kiss your partner. Ten seconds.', 4, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p26', 'Kiss your partner however you would if nobody else were in the room.', 4, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p27', 'Let your partner decide where they kiss you. They choose, you accept or you pass.', 4, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p28', 'Whisper to your partner the thing you would want them to do. Only they hear it.', 4, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p29', 'Sit on the same seat as your partner until your next turn.', 4, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p30', 'Kiss your partner, then tell the group one word to describe it.', 4, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p31', 'Take your partner out of the room for sixty seconds. What happens there stays there.', 4, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p32', 'Tell your partner exactly what you want, out loud, in front of everyone.', 4, { partner: true, minPlayers: 3 }),

  // 5 · unhinged
  adultDare('d18-p33', 'Kiss your partner until the group tells you to stop.', 5, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p34', 'Tell your partner the thing you have wanted to say to them and never have.', 5, { partner: true, minPlayers: 3 }),
  adultDare('d18-p35', 'Swap numbers with your partner and text them one thing before the night ends.', 5, { partner: true, minPlayers: 3 }),
  adultDare('d18-p36', 'Ask your partner the one question you actually want the answer to.', 5, { partner: true, minPlayers: 3 }),
  adultDare('d18-p37', 'Tell your partner honestly whether you have ever thought about them that way.', 5, { partner: true, minPlayers: 3 }),
  adultDare('d18-p38', 'Let your partner ask you anything. You answer it truthfully.', 5, { partner: true, minPlayers: 3 }),
  adultDare('d18-p39', 'Ask your partner out. Properly. They can say no and it stays a game.', 5, { partner: true, minPlayers: 3 }),
  adultDare('d18-p40', 'Tell your partner the one thing that would make you say yes to them.', 5, { partner: true, minPlayers: 3 }),
];
