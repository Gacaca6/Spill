import { adultDare } from '@/data/builders';

/**
 * 18+ dares — a separate content system, never merged into the general pool.
 *
 * The brief's dare list came from a couples' product, where "your partner" means
 * the person you already sleep with and the game is played by two people in
 * private. SPILL is a group of friends round a table with one phone, and the
 * second player is chosen by a wheel. So the verbal and performative material
 * carries over directly, while anything that assumed a bedroom and an existing
 * sexual relationship does not.
 *
 * Two kinds live here.
 *
 * **Solo dares** are performance and confession: say it, describe it, read it
 * out, act it. The filth is in the language, and it lands on the player who was
 * picked and nobody else.
 *
 * **Partner dares** (`partner: true`) involve a second player, who the engine
 * picks and who has to answer before the dare counts as happening. The room
 * reads the card — one phone on a table is not a private prompt — but the person
 * on the receiving end is the one who decides, rather than a shuffle deciding
 * for them. A pass costs them nothing and the dare is redrawn.
 *
 * The ceiling on partner dares is kissing and close contact, fully clothed.
 */
export const adultDares = [
  // ── 1 · flirty, solo ───────────────────────────────────────────────────────
  adultDare('d18-001', 'Describe the perfect night with someone, from the first message to the front door.', 1),
  adultDare('d18-002', 'Give a 30-second pitch for why someone should date you. Be shameless.', 1),
  adultDare('d18-003', 'Describe the type of person you are drawn to without naming a single physical trait.', 1),
  adultDare('d18-004', 'Deliver the smoothest line you know to the room. Full conviction.', 1),
  adultDare('d18-005', 'Do your best impression of yourself trying to be mysterious.', 1),
  adultDare('d18-006', 'Give the room your best sultry look and hold it for ten seconds.', 1),
  adultDare('d18-007', 'Rate your own flirting out of ten and let the group correct you.', 1, { playerMode: 'group', minPlayers: 3 }),
  adultDare('d18-008', 'Act out the exact moment you realised you were into someone.', 1),
  adultDare('d18-009', 'Tell the group the most romantic thing you have done, and whether it worked.', 1),
  adultDare('d18-010', 'Describe your dream partner as if you are filing a missing persons report.', 1),
  adultDare('d18-011', 'Perform your most dramatic "we need to talk" opening line.', 1),
  adultDare('d18-012', 'Explain your entire dating history using only film genres.', 1),
  adultDare('d18-013', 'Give a toast to everyone who has ever left you on read.', 1),
  adultDare('d18-014', 'Act out how you behave in the first five minutes of a date versus the last five.', 1),
  adultDare('d18-015', 'Say the cheesiest romantic line you know, with total sincerity.', 1),
  adultDare('d18-016', 'Dance seductively for ten seconds. There is no music and no excuse.', 1, { physical: true }),
  adultDare('d18-017', 'Describe your love life this year as a film title and a one-line review.', 1),
  adultDare('d18-018', 'Give a completely straight-faced explanation of your worst romantic decision.', 1),
  adultDare('d18-019', 'Point at the most confident person here and explain exactly what gives them away.', 1, { needsOther: true, minPlayers: 3 }),
  adultDare('d18-020', 'Perform the most dramatic "it is not you, it is me" speech you can manage.', 1),
  adultDare('d18-021', 'Give the sexiest compliment you can to the room without naming anyone.', 1),
  adultDare('d18-022', 'Do an impression of someone trying and failing to be seductive.', 1),
  adultDare('d18-023', 'Describe the sexiest outfit you own and when you last wore it.', 1),
  adultDare('d18-024', 'Act out the face you make when someone you want walks in.', 1),
  adultDare('d18-025', 'Give a 20-second lecture on what makes a kiss actually good.', 1),

  // ── 2 · suggestive, solo ───────────────────────────────────────────────────
  adultDare('d18-026', 'Describe your type physically, in detail, with no polite language.', 2),
  adultDare('d18-027', 'Read out the last flirty message you sent — including the part you deleted.', 2),
  adultDare('d18-028', 'Read out the dirtiest text you are willing to read out.', 2),
  adultDare('d18-029', 'Tell the group the exact compliment you would want to hear tonight.', 2),
  adultDare('d18-030', 'Describe the last time someone properly turned your head, with details.', 2),
  adultDare('d18-031', 'Say the boldest thing you would say to someone if there were no consequences.', 2),
  adultDare('d18-032', 'Tell the group the exact thing that ends a night in your favour.', 2),
  adultDare('d18-033', 'Describe the most tension you have ever had with someone, moment by moment.', 2),
  adultDare('d18-034', 'Describe your ideal first kiss in enough detail that it gets uncomfortable.', 2),
  adultDare('d18-035', 'Tell the group what someone would have to do tonight to get your attention.', 2),
  adultDare('d18-036', 'Reenact your worst ever attempt at being seductive.', 2),
  adultDare('d18-037', 'Describe the hottest thing anyone has ever said to you, word for word.', 2),
  adultDare('d18-038', 'Say out loud the exact words you would use to make the first move on someone.', 2),
  adultDare('d18-039', 'Describe the last person who wrecked your composure, without naming them.', 2),
  adultDare('d18-040', 'Tell the group the exact scenario you would never admit to daydreaming about.', 2),
  adultDare('d18-041', 'Demonstrate your dirty talk. The room is your unfortunate audience.', 2),
  adultDare('d18-042', 'Try dirty talk in a language you do not speak.', 2),
  adultDare('d18-043', 'Share your sexiest daydream in as much detail as you can stand.', 2),
  adultDare('d18-044', 'Describe your favourite place to be touched and why it works.', 2),
  adultDare('d18-045', 'Tell the group the most suggestive thing you have ever sent.', 2),
  adultDare('d18-046', 'Describe the sexiest thing you have ever done that involved no sex.', 2),
  adultDare('d18-047', 'Act out a scene where you are meeting a stranger you want to go home with.', 2),
  adultDare('d18-048', 'Describe your favourite kind of foreplay, unhurried and in detail.', 2),
  adultDare('d18-049', 'Tell the group what you find irresistible, then say who here has it.', 2, { needsOther: true, minPlayers: 3 }),
  adultDare('d18-050', 'Do your best seductive whisper, out loud, to nobody in particular.', 2),

  // ── 3 · explicit, solo ─────────────────────────────────────────────────────
  adultDare('d18-051', 'Describe in detail what you would do to someone you were really into. Do not name them.', 3),
  adultDare('d18-052', 'Say the filthiest thing you have ever said to someone, word for word, to the room.', 3),
  adultDare('d18-053', 'Describe exactly what you want done to you. No euphemisms.', 3),
  adultDare('d18-054', 'Talk the group through your ideal night, start to finish, sparing no detail.', 3),
  adultDare('d18-055', 'Describe the best you have ever had, in enough detail that everyone regrets asking.', 3),
  adultDare('d18-056', 'Give the group one piece of advice about sex that you learned the hard way.', 3),
  adultDare('d18-057', 'Say your most specific turn-on out loud and explain how you found out.', 3),
  adultDare('d18-058', 'Describe the riskiest thing you have ever done and how close you came to being caught.', 3),
  adultDare('d18-059', 'Tell the group the thing you would ask for if you knew you would get a yes.', 3),
  adultDare('d18-060', 'Describe, out loud, the fantasy you have never told anyone.', 3),
  adultDare('d18-061', 'Confess the most explicit thing you have ever written down.', 3),
  adultDare('d18-062', 'Describe what you are like the first time with someone, honestly.', 3),
  adultDare('d18-063', 'Say the thing you have always wanted to say in the moment and never have.', 3),
  adultDare('d18-064', 'Describe your hard limits and where exactly the line sits.', 3),
  adultDare('d18-065', 'Tell the group the most experimental thing you have agreed to, and how it went.', 3),
  adultDare('d18-066', 'Describe your favourite position and defend the choice under questioning.', 3, { playerMode: 'group', minPlayers: 3 }),
  adultDare('d18-067', 'Tell the group your most embarrassing sexual moment in full.', 3),
  adultDare('d18-068', 'Describe the most awkward thing that has happened to you mid-hookup.', 3),
  adultDare('d18-069', 'Read out your sexual bucket list. Invent it now if you have to.', 3),
  adultDare('d18-070', 'Describe the wildest place you have ever done it, and how you got away with it.', 3),
  adultDare('d18-071', 'Tell the room the single most explicit sentence you are willing to say out loud.', 3),
  adultDare('d18-072', 'Describe what you sound like. Then demonstrate, briefly.', 3),
  adultDare('d18-073', 'Talk the group through the last time, in as much detail as you dare.', 3),
  adultDare('d18-074', 'Describe the thing you are secretly very good at, and back up the claim.', 3),
  adultDare('d18-075', 'Say out loud the thing you would want whispered to you.', 3),

  // ── 4 · filthy, solo ───────────────────────────────────────────────────────
  adultDare('d18-076', 'Describe your kink to the room like you are explaining it to a confused stranger.', 4),
  adultDare('d18-077', 'Say out loud the thing you would need a lot of persuading to confess to.', 4),
  adultDare('d18-078', 'Describe the most unhinged thing you have ever agreed to at 2am.', 4),
  adultDare('d18-079', 'Tell the group the thing about you that would genuinely shock them.', 4),
  adultDare('d18-080', 'Describe, in full, the fantasy that lives rent-free in your head.', 4),
  adultDare('d18-081', 'Confess the thing you have done that you would deny to your family.', 4),
  adultDare('d18-082', 'Describe exactly what you would do if the night ended the way you wanted.', 4),
  adultDare('d18-083', 'Say the dirtiest thought you have had this week, out loud.', 4),
  adultDare('d18-084', 'Let the group ask you three explicit questions. You answer all of them.', 4, { playerMode: 'group', minPlayers: 3 }),
  adultDare('d18-085', 'Describe the thing you want most and have never asked anyone for.', 4),
  adultDare('d18-086', 'Tell the group the thing you would only ever do with the lights off.', 4),
  adultDare('d18-087', 'Describe the most reckless thing you have done because you wanted someone.', 4),
  adultDare('d18-088', 'Say the thing you have never told a partner about your past.', 4),
  adultDare('d18-089', 'Describe the moment you realised what you were actually into.', 4),
  adultDare('d18-090', 'Confess the thing you have done that you would rate a genuine red flag.', 4),
  adultDare('d18-091', 'Tell the group the thing you would do tonight if nobody ever found out.', 4),
  adultDare('d18-092', 'Describe the most someone has ever begged you for something, and whether they got it.', 4),
  adultDare('d18-093', 'Say the thing you were hoping nobody would ask you tonight.', 4),
  adultDare('d18-094', 'Describe the thing you have only ever admitted to one person.', 4),
  adultDare('d18-095', 'Act out a fantasy scenario as a one-person scene. Commit to it.', 4),
  adultDare('d18-096', 'Describe the kinkiest thing you have ever done, start to finish.', 4),
  adultDare('d18-097', 'Tell the group whether you are dominant or submissive, then prove it with a story.', 4),
  adultDare('d18-098', 'Describe the thing you would try tonight if someone offered.', 4),
  adultDare('d18-099', 'Say the filthiest sentence you can construct about nobody in particular.', 4),
  adultDare('d18-100', 'Describe the most daring thing you have ever done sexually, in detail.', 4),

  // ── 5 · unhinged, solo ─────────────────────────────────────────────────────
  adultDare('d18-101', 'Tell the room the thing you would take to your grave.', 5),
  adultDare('d18-102', 'Let the group ask you the one question about your love life you least want to answer.', 5, { playerMode: 'group', minPlayers: 3 }),
  adultDare('d18-103', 'Say the thing you would say to your last ex if they walked in right now.', 5),
  adultDare('d18-104', 'Describe the thing you want most in the world, honestly, no jokes.', 5),
  adultDare('d18-105', 'Confess the thing you have been holding back all night.', 5),
  adultDare('d18-106', 'Tell the group your wildest sex story. All of it.', 5),
  adultDare('d18-107', 'Say out loud the thing you have only just admitted to yourself.', 5),
  adultDare('d18-108', 'Describe the last time someone completely wrecked you, and whether you are over it.', 5),
  adultDare('d18-109', 'Tell someone here the thing you have wanted to say to them all night.', 5, { needsOther: true, minPlayers: 3 }),
  adultDare('d18-110', 'Say the thing you would confess if you knew everyone would forget it by morning.', 5),

  // ── partner dares · the second player decides first ────────────────────────

  // 1 · flirty
  adultDare('d18-p01', 'Hold eye contact with your partner for thirty seconds. No talking, no laughing.', 1, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p02', 'Give your partner a genuine compliment about something other than their face.', 1, { partner: true, minPlayers: 3 }),
  adultDare('d18-p03', 'Tell your partner the first thing you noticed about them.', 1, { partner: true, minPlayers: 3 }),
  adultDare('d18-p04', 'Deliver your smoothest line directly to your partner, straight-faced.', 1, { partner: true, minPlayers: 3 }),
  adultDare('d18-p05', 'Sit shoulder to shoulder with your partner until your next turn.', 1, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p06', 'Describe your partner as a drink, and make it flattering.', 1, { partner: true, minPlayers: 3 }),
  adultDare('d18-p07', 'Tell your partner one thing about them you have noticed and never mentioned.', 1, { partner: true, minPlayers: 3 }),
  adultDare('d18-p08', 'Guess your partner\'s type out loud. They tell you how close you got.', 1, { partner: true, minPlayers: 3 }),
  adultDare('d18-p09', 'Give your partner a sexy nickname and use it for the rest of the night.', 1, { partner: true, minPlayers: 3 }),
  adultDare('d18-p10', 'Compliment three separate things about your partner without repeating yourself.', 1, { partner: true, minPlayers: 3 }),

  // 2 · suggestive
  adultDare('d18-p11', 'Whisper to your partner the first thing you noticed about them.', 2, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p12', 'Tell your partner exactly what you would compliment to get their attention.', 2, { partner: true, minPlayers: 3 }),
  adultDare('d18-p13', 'Hold your partner\'s hand and keep eye contact while you answer the next question.', 2, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p14', 'Slow dance with your partner for thirty seconds. There is no music.', 2, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p15', 'Whisper something to your partner that you would not say out loud to the room.', 2, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p16', 'Tell your partner the most attractive thing about them, in detail, to their face.', 2, { partner: true, minPlayers: 3 }),
  adultDare('d18-p17', 'Sit close enough to your partner that it is slightly too close, until your next turn.', 2, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p18', 'Give your partner a thirty-second shoulder massage.', 2, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p19', 'Whisper your favourite kind of dirty talk to your partner. Only they hear it.', 2, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p20', 'Describe to your partner, quietly, the last dream you had that you would edit.', 2, { partner: true, physical: true, minPlayers: 3 }),

  // 3 · charged
  adultDare('d18-p21', 'Kiss your partner on the cheek.', 3, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p22', 'Whisper into your partner\'s ear the thing you would say at the end of the night.', 3, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p23', 'Tell your partner, to their face, exactly what you would do if you were into them.', 3, { partner: true, minPlayers: 3 }),
  adultDare('d18-p24', 'Hold your partner\'s gaze while they describe their type. Do not react.', 3, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p25', 'Trace a word on your partner\'s hand. They have to guess it.', 3, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p26', 'Rest your head on your partner\'s shoulder until your next turn.', 3, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p27', 'Kiss your partner on the neck.', 3, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p28', 'Tell your partner the filthiest thought you are willing to say to their face.', 3, { partner: true, minPlayers: 3 }),
  adultDare('d18-p29', 'Trace a slow line down your partner\'s arm while holding eye contact.', 3, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p30', 'Whisper to your partner the thing you would want them to say to you.', 3, { partner: true, physical: true, minPlayers: 3 }),

  // 4 · the ones people spin for
  adultDare('d18-p31', 'Kiss your partner. Ten seconds.', 4, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p32', 'Kiss your partner however you would if nobody else were in the room.', 4, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p33', 'Let your partner decide where they kiss you. They choose, you accept or you pass.', 4, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p34', 'Whisper to your partner the thing you would want them to do. Only they hear it.', 4, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p35', 'Kiss your partner, then tell the group one word to describe it.', 4, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p36', 'Take your partner out of the room for sixty seconds. What happens there stays there.', 4, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p37', 'Tell your partner exactly what you want, out loud, in front of everyone.', 4, { partner: true, minPlayers: 3 }),
  adultDare('d18-p38', 'Kiss your partner with an ice cube in your mouth.', 4, { partner: true, physical: true, minPlayers: 3 }),
  // Deliberately not a mark that outlasts the night — a visible one lands on
  // someone the wheel paired at random, days later, in front of people who were
  // never in the room.
  adultDare('d18-p39', 'Kiss your partner on the hand, then the cheek, then the neck, in that order.', 4, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p40', 'Kiss your partner somewhere other than the mouth. They pick where.', 4, { partner: true, physical: true, minPlayers: 3 }),

  // 5 · unhinged
  adultDare('d18-p41', 'Kiss your partner until the group tells you to stop.', 5, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p42', 'Make out with your partner for a full minute.', 5, { partner: true, physical: true, minPlayers: 3 }),
  adultDare('d18-p43', 'Tell your partner the thing you have wanted to say to them and never have.', 5, { partner: true, minPlayers: 3 }),
  adultDare('d18-p44', 'Swap numbers with your partner and text them one thing before the night ends.', 5, { partner: true, minPlayers: 3 }),
  adultDare('d18-p45', 'Ask your partner the one question you actually want the answer to.', 5, { partner: true, minPlayers: 3 }),
  adultDare('d18-p46', 'Tell your partner honestly whether you have ever thought about them that way.', 5, { partner: true, minPlayers: 3 }),
  adultDare('d18-p47', 'Let your partner ask you anything. You answer it truthfully.', 5, { partner: true, minPlayers: 3 }),
  adultDare('d18-p48', 'Ask your partner out. Properly. They can say no and it stays a game.', 5, { partner: true, minPlayers: 3 }),
  adultDare('d18-p49', 'Tell your partner the one thing that would make you say yes to them.', 5, { partner: true, minPlayers: 3 }),
  adultDare('d18-p50', 'Kiss your partner, then both rate it out of ten at the same time.', 5, { partner: true, physical: true, minPlayers: 3 }),
];
