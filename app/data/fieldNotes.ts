import type { ProjectAccent } from './projects'

/**
 * Field Notes — the studio's writing.
 *
 * Each entry is a field note from the trail: numbered, dated, with
 * a kicker, a title, a short blurb for the index page,
 * and an optional long-form `body` for the detail page.
 *
 * Why "Field Notes" and not "Blog":
 *   "Blog" is a place where you go to read someone's content strategy.
 *   "Field Notes" is what a working studio actually writes — the marginalia,
 *   the workbench scribbles, the things you'd shout across the room before
 *   you forgot. It matches the voice and the riso/print aesthetic.
 *
 * Order: source entries can be authored in any order — the exported
 * `fieldNotes` array is sorted by `date` descending so the newest note is
 * always first. The header pill, index TOC and prev/next navigation all
 * follow that order.
 */

export interface FieldNote {
  slug: string
  /** Note number — keep zero-padded ("01", "02"). Used as the logbook cue. */
  number: string
  /** ISO date — e.g., "2026-04-22". Drives the chronological ordering and the meta line. */
  date: string
  /** Kicker — one short phrase, fixed length. */
  eyebrow: string
  /** Title of the note. */
  title: string
  /** Optional sub-deck rendered under the title on the detail page. */
  deck?: string
  /** One-paragraph teaser used on the index TOC and the header pill. */
  blurb: string
  /** Estimated read time, freeform — e.g., "5 min read". */
  readTime: string
  /** Riso accent — drives the drop cap, pull-quote bg and active-state colour. */
  accent: ProjectAccent
  /** Long-form body paragraphs. If omitted, the slug page still renders the lead. */
  body?: string[]
  /** Pull quote for the detail spread — set in serif italic. */
  pullQuote?: string
  /** Tags — printed as small pills at the foot of the detail spread. */
  tags?: string[]
}

export const fieldNotes: FieldNote[] = [
  {
    slug: 'pull-the-handle',
    number: '08',
    date: '2026-05-11',
    eyebrow: 'AI',
    title: 'Pull the handle.',
    deck: 'AI writes the code now. The remaining job is to read it before you ship.',
    blurb:
      "AI is a slot machine, and the payouts are good. Getting code out and understanding what the code does are not the same thing, though, and only one of those survives contact with production.",
    readTime: '3 min read',
    accent: 'pop-orange',
    body: [
      "Every AI prompt is a pull of the handle. You get something back, fast, and most of the time it works. That's why the tool is genuinely useful, and it's also why it's worth paying attention to how we're using it. Slot machines aren't addictive because they pay out reliably. They're addictive because the payout lands often enough that you keep pulling without thinking. AI tools have a similar shape, except the payouts are higher and the cost of pulling is almost nothing. The danger isn't the tool itself. The danger is forgetting to look at what you just got back.",
      "The tell is in what happens when the output is subtly wrong. A developer who understands the problem reads the generated code, spots the off-by-one error, fixes it and ships. A developer who doesn't reads the same code, can't evaluate it, ships it, and finds out later in production. Both pulled the handle. Only one of them was actually in control of the outcome. The difference isn't access to the tool. It's whether you understood the problem before you reached for it, and whether you read the answer before you shipped it.",
      "Plausible output is the real risk. A blank answer is easy to spot. A confident, well-formatted answer that solves a slightly different problem takes much longer to catch. The model isn't doing anything wrong here. It's doing exactly what it was asked to do. The question is whether anyone is reading the result with the same care they used to write things from scratch. That habit is the thing worth keeping.",
      "The people getting real leverage from AI all share one thing. They bring the understood problem to the tool, not the other way around. They know what right looks like before the output arrives. They read every line that comes back. They use the tool to compress the work, not to skip the thinking. The tool didn't make them better engineers. They made the tool useful.",
    ],
    pullQuote:
      "The tool didn't make them better engineers. They made the tool useful.",
    tags: ['ai', 'craft', 'process'],
  },
  {
    slug: 'wrong-room',
    number: '07',
    date: '2026-05-10',
    eyebrow: 'House rules',
    title: "You're in the wrong room.",
    deck: "If you're the smartest person in the room. Everyone quotes the line. Almost nobody lives by it.",
    blurb:
      "The honest read isn't a humblebrag — it's a job description. Most of the job is being uncomfortable in public, on purpose, for years.",
    readTime: '3 min read',
    accent: 'pop-magenta',
    body: [
      "The line is true. It's also one of the most worn-down quotes in circulation — passed around at conferences, on podcasts, in the back half of startup advice columns. The people who repeat it almost never mean it the way it reads. They want the reputation of someone who seeks out smarter rooms while remaining, in their current one, comfortably the smartest. It's a humility posture performed for an audience that already agrees you're clever.",
      "The practice is uglier. Being the dumbest person in the room isn't a wisdom pose; it's a feeling. It's sitting through a conversation where you can almost follow the argument, occasionally not. It's asking a question the rest of the room answered three steps back. It's writing a take that gets gently corrected by someone who has done this for twenty years. Most people don't pursue the state because it sucks in real time and only pays off later.",
      "But it does pay off, and the mechanism is friction, not osmosis. You don't get smarter by being near smart people. You get smarter by being out of your depth in front of them, and not flinching. Each instance is a small, specific bruise. Over enough years, the bruises become competence. Skip them and you stay where you are, even if the room is full of trophies.",
      "There's a flip side worth naming. The quote assumes rooms run only one direction; they don't. Sometimes you are the smartest in the room, and the right move isn't to leave. It's to notice you've taken a different job. You're not learning anymore; you're holding the floor. You owe the room more clarity, not less. The wrong room isn't the one where you're the most experienced. It's the one where you're the most experienced and still refusing to lead.",
    ],
    pullQuote:
      "You don't get smarter by being near smart people. You get smarter by being out of your depth in front of them, and not flinching.",
    tags: ['craft', 'growth', 'studio'],
  },
  {
    slug: 'code-is-cheap-design-isnt',
    number: '06',
    date: '2026-05-09',
    eyebrow: 'Craft',
    title: 'Code is cheap. Design isn\'t.',
    deck: 'When the marginal cost of writing software approaches zero, what separates good engineers from everyone else stops being syntax, and starts being judgement.',
    blurb:
      'LLMs have turned code from a bottleneck into a commodity. That means the hard part of engineering just got harder. It was never writing the code in the first place.',
    readTime: '5 min read',
    accent: 'pop-blue',
    body: [
      "Code is cheap. Not metaphorically cheap. Literally cheap. A developer who used to spend three days on a data pipeline ships it in an afternoon. Give it two more months and the afternoon becomes a prompt. The marginal cost of a function is approaching zero, and anyone still treating syntax fluency as their competitive advantage is standing on melting ground.",
      "This should feel liberating, and for a lot of things it is. Boilerplate is dissolving. The surface area a single engineer can maintain has expanded. But the discount comes with a hidden tax: when code stops being the bottleneck, the bottleneck becomes everything underneath it. The architecture. The abstractions. The call about what to build at all. These are design problems, and LLMs are considerably worse at them than they are at closing a bracket.",
      "A good abstraction is a bet on what will change and what won't. It's the argument that these eight things are actually one thing, that this complexity deserves a seam, that this invariant needs a name. You can't prompt your way to that unless you already understand it, which means the model is doing the easy half and leaving the hard half on the table. Engineers who understand that distinction will compound. Everyone else will spend their careers debugging output they don't understand from a system they didn't design.",
      "We've spent thirty years treating code as the hard part because it was the hard part. You had to earn the syntax before you could say anything. That barrier is nearly gone. What remains is the prior question: what are you actually trying to say? That's always been design. It was always the expensive part. It just wasn't the bottleneck.",
    ],
    pullQuote:
      "When code stops being the bottleneck, the bottleneck becomes everything underneath it.",
    tags: ['craft', 'engineering', 'design'],
  },
  {
    slug: 'building-loud',
    number: '05',
    date: '2026-04-22',
    eyebrow: 'House rules',
    title: 'Building loud.',
    deck: 'Why we stream the workbench, push the half-finished commits, and write down the things that didn\'t work.',
    blurb:
      "Most studios polish before they publish. We do the opposite. We publish so we polish. Here's what changed when we stopped hiding the workbench.",
    readTime: '4 min read',
    accent: 'pop-yellow',
    body: [
      "There's a tradition in software that says: ship the demo, hide the rough edges. Cut the commit history. Quote the success metric. The polished surface is the product; the workbench is a liability.",
      "We stopped doing that about a year ago, and the work got better. Not because attention is a virtue (it isn't), but because writing things down forces a kind of honesty the workbench rarely sees on its own. You can't pretend a hack is elegant when you're explaining it to a stranger at 2am on a stream.",
      "So now we ship loud. The repo is public. The Twitch is on. The bad ideas live in the same git tree as the good ones, with the date stamp to prove which came first. Field Notes is the next chapter, the place where we collect what we've learned, what we'd do differently, and the small details we want to remember.",
      "If you're here for the highlight reel, fair warning: there isn't one. There's the work, and there's writing about the work. Everything else is just marketing.",
    ],
    pullQuote:
      "Polish is what happens when you stop hiding. Not the other way round.",
    tags: ['studio', 'process', 'open source'],
  },
  {
    slug: 'why-owlat-is-open',
    number: '04',
    date: '2026-04-08',
    eyebrow: 'Owlat',
    title: 'Why marketing email needed an open-source tool.',
    deck: 'On rebuilding the most captured corner of SaaS, and why we gave the source away.',
    blurb:
      'Ten companies own marketing email. Their interests aren\'t yours. We rebuilt the stack (campaigns, automations, transactional) and put the whole thing under a permissive license.',
    readTime: '7 min read',
    accent: 'pop-magenta',
    body: [
      "Marketing email is one of those product categories that quietly got captured. There are maybe ten companies you'd consider, all of them charge per-seat or per-contact, and every one of them treats your subscriber list like collateral. Try exporting it sometime.",
      "We started Owlat because we needed it for our own newsletters and the math stopped making sense. Why are we paying $400/month to send 18 emails? Why does the export require a sales call? Why is the DSL for an automation flow a proprietary visual builder owned by a company that just got acquired?",
      "Building it is one thing. Open-sourcing it is the bet. The bet is: the next decade of SaaS is people getting tired of renting. We've seen it with auth (BetterAuth, Clerk), with databases (Supabase, Convex), with editors (VS Code, Zed). Marketing email is overdue.",
      "What we shipped: a campaign builder, a multi-step automation engine, a transactional API, contact management, all under MIT. You can self-host it. You can fork it. You can rip out the parts you don't need. We host a managed version for teams who don't want to operate Postgres at 3am, but the managed version is opt-in, not the funnel.",
    ],
    pullQuote:
      "The next decade of SaaS is people getting tired of renting.",
    tags: ['owlat', 'open source', 'email'],
  },
  {
    slug: 'local-first-six-weeks',
    number: '03',
    date: '2026-03-24',
    eyebrow: 'Draw',
    title: 'Local-first, six weeks in.',
    deck: 'Notes from wrapping a beloved web tool in a native shell: autosave, atomic writes, and the bits that are quietly hard.',
    blurb:
      "What we got right, what we got wrong, and the handful of details that separate a 'works on my machine' wrapper from something that earns the dock.",
    readTime: '6 min read',
    accent: 'pop-yellow',
    body: [
      "Draw started as a one-evening Tauri experiment: wrap Excalidraw in a native shell, save files to disk, see what happens. Six weeks later it's the editor I open every day, and there's a list of things I wish I'd known on day one.",
      "The hardest problem wasn't rendering, or the file format, or even the auto-updater. It was autosave. Specifically: how do you write a file 200 times a minute without ever (not once, not in a power outage, not in the middle of a stroke) leaving the user with a corrupt drawing?",
      "The answer is atomic writes. Every save lands as `<file>.tmp` next to the real file, gets fsync'd, and only then gets renamed over the original. POSIX rename is atomic. macOS gives you APFS clone-and-rename for free. The .tmp guard means the worst case is you lose 500ms of strokes; the file you had a second ago is the file you reopen. We tested this by literally pulling the plug. It works.",
      "Things we got wrong: the first sidebar was too clever. We tried to mirror the folder tree with virtual sections and tags and a quick-switcher. Users wanted a folder. We removed everything except the folder.",
    ],
    pullQuote:
      "The .tmp guard means the worst case is you lose 500ms of strokes; the file you had a second ago is the file you reopen.",
    tags: ['draw', 'tauri', 'local-first'],
  },
  {
    slug: 'why-riso',
    number: '02',
    date: '2026-02-28',
    eyebrow: 'Studio',
    title: 'Why the site looks like a riso print.',
    deck: 'On choosing a visual language with character, and what we mean by "editorial pop."',
    blurb:
      'The web has a dozen design defaults. We picked one that feels like ink on paper instead of pixels on glass. Here\'s what that gets us.',
    readTime: '3 min read',
    accent: 'pop-magenta',
    body: [
      "The original wolves.ink mock was clean, minimal, and absolutely indistinguishable from every other studio site on the internet. The fonts were Inter. The colours were a kind of off-white. There was a hero section and three feature cards and a CTA. It was fine.",
      "Fine is the worst thing a studio site can be. So we burned it down and started again, this time committing to a single aesthetic with a clear point of view: editorial pop. Anton for the masthead. Fraunces for the asides. Riso pinks and yellows on warm ink. Halftone orbs that drift with the cursor. A stamp in the corner of the footer with the issue date.",
      "The point isn't decoration. The point is that the visuals tell you something about how we work: that we like print, that we read magazines, that we think the web has been getting too quiet. Every time you visit, the page is a publication, not a product page.",
      "If you came here looking for a template, this is the wrong studio.",
    ],
    pullQuote:
      "Fine is the worst thing a studio site can be.",
    tags: ['design', 'studio'],
  },
  {
    slug: 'link-building-honestly',
    number: '01',
    date: '2021-02-15',
    eyebrow: 'SEO',
    title: 'Link building, honestly.',
    deck: 'On the most contested corner of search: what backlinks actually buy you, and why every shortcut eventually rounds back as a penalty.',
    blurb:
      "Half the SEO field swears by it, half thinks it's sleazy growth dressed in a suit. Both are right, depending on how you do it. Notes on the slow way, the fast way, and the time we watched the fast way blow up a domain.",
    readTime: '5 min read',
    accent: 'pop-orange',
    body: [
      "Link building has a reputation problem. In the SEO field, half the people swear by it and the other half think it's a sleazy tactic dressed up as growth. Both are right, depending on how you do it. The mechanic underneath is older than most of the modern web. Google's PageRank, shipped in 1998, ranks pages by counting how many other pages point at them, weighted by how trusted those pages are. That's still the spine of how search works. A backlink, stripped of the marketing, is a small bet on your reputation made by someone else. The sum of those bets is your search position.",
      "There are three honest ways to acquire one. Creating links (submitting to directories, pasting your own URL in the comments, dropping it into a profile bio) is what anyone with a keyboard can do, which is exactly why it doesn't move the needle. Buying links is against Google's webmaster guidelines, runs about $350 per link on the open market, and reliably tanks the buyer's domain when caught. The third option is earning the link by writing something a stranger wants to point at, then asking the right strangers nicely. It is the slowest of the three, and that is why it is the only one that compounds.",
      "Not every earned link is equal, either. The ones that move rankings come from pages relevant to your topic (a tech site linking to a tech post beats a recipe blog linking to the same post, even when the recipe blog is louder), and from pages with their own inherited weight. Authority isn't issued by Google; it's passed along. A page with weight passes some of it through every outbound link it places. The link itself has structure that matters: the URL, the anchor text (the words people actually click), and the 'rel' attribute, which tells the crawler whether to count the vote. 'Nofollow,' 'UGC,' and 'sponsored' all mean don't count. Anything else is a 'follow' link, and a follow link sitting inside an editorial paragraph beats one bolted into the footer every time.",
      "The penalty side is real, and worth saying out loud. Violate the guidelines and you don't get a warning email. You get a ranking collapse, sometimes algorithmically (Penguin still does the rounds), sometimes by a human reviewer issuing a manual action. Recovery is measured in months, occasionally years. We've watched a few sites take that hit, and the math never came out in their favour. There is no faster way to lose a year of compounded work than to spend a weekend buying links.",
    ],
    pullQuote:
      "A backlink, stripped of the marketing, is a small bet on your reputation made by someone else.",
    tags: ['seo', 'marketing', 'process'],
  },
].sort((a, b) => b.date.localeCompare(a.date))

/** Convenience: the most recent note, used by the header pill. */
export const latestFieldNote = fieldNotes[0]!
