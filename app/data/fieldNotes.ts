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
 * To add a new note: prepend to the `fieldNotes` array. The first entry is
 * the "latest note" surfaced in the header pill.
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
    slug: 'code-is-cheap-design-isnt',
    number: '07',
    date: '2026-05-09',
    eyebrow: 'Craft',
    title: 'Code is cheap. Design isn\'t.',
    deck: 'When the marginal cost of writing software approaches zero, what separates good engineers from everyone else stops being syntax — and starts being judgement.',
    blurb:
      'LLMs have turned code from a bottleneck into a commodity. That means the hard part of engineering just got harder. It was never writing the code in the first place.',
    readTime: '5 min read',
    accent: 'pop-blue',
    body: [
      "Code is cheap. Not metaphorically cheap — literally cheap. A developer who used to spend three days on a data pipeline ships it in an afternoon. Give it two more months and the afternoon becomes a prompt. The marginal cost of a function is approaching zero, and anyone still treating syntax fluency as their competitive advantage is standing on melting ground.",
      "This should feel liberating, and for a lot of things it is. Boilerplate is dissolving. The surface area a single engineer can maintain has expanded. But the discount comes with a hidden tax: when code stops being the bottleneck, the bottleneck becomes everything underneath it. The architecture. The abstractions. The call about what to build at all. These are design problems, and LLMs are considerably worse at them than they are at closing a bracket.",
      "A good abstraction is a bet on what will change and what won't. It's the argument that these eight things are actually one thing, that this complexity deserves a seam, that this invariant needs a name. You can't prompt your way to that unless you already understand it — which means the model is doing the easy half and leaving the hard half on the table. Engineers who understand that distinction will compound. Everyone else will spend their careers debugging output they don't understand from a system they didn't design.",
      "We've spent thirty years treating code as the hard part because it was the hard part — you had to earn the syntax before you could say anything. That barrier is nearly gone. What remains is the prior question: what are you actually trying to say? That's always been design. It was always the expensive part. It just wasn't the bottleneck.",
    ],
    pullQuote:
      "When code stops being the bottleneck, the bottleneck becomes everything underneath it.",
    tags: ['craft', 'engineering', 'design'],
  },
  {
    slug: 'building-loud',
    number: '01',
    date: '2026-04-22',
    eyebrow: 'House rules',
    title: 'Building loud.',
    deck: 'Why we stream the workbench, push the half-finished commits, and write down the things that didn\'t work.',
    blurb:
      "Most studios polish before they publish. We do the opposite — we publish so we polish. Here's what changed when we stopped hiding the workbench.",
    readTime: '4 min read',
    accent: 'pop-yellow',
    body: [
      "There's a tradition in software that says: ship the demo, hide the rough edges. Cut the commit history. Quote the success metric. The polished surface is the product; the workbench is a liability.",
      "We stopped doing that about a year ago, and the work got better. Not because attention is a virtue — it isn't — but because writing things down forces a kind of honesty the workbench rarely sees on its own. You can't pretend a hack is elegant when you're explaining it to a stranger at 2am on a stream.",
      "So now we ship loud. The repo is public. The Twitch is on. The bad ideas live in the same git tree as the good ones, with the date stamp to prove which came first. Field Notes is the next chapter — the place where we collect what we've learned, what we'd do differently, and the small details we want to remember.",
      "If you're here for the highlight reel, fair warning: there isn't one. There's the work, and there's writing about the work. Everything else is just marketing.",
    ],
    pullQuote:
      "Polish is what happens when you stop hiding. Not the other way round.",
    tags: ['studio', 'process', 'open source'],
  },
  {
    slug: 'why-owlat-is-open',
    number: '02',
    date: '2026-04-08',
    eyebrow: 'Owlat',
    title: 'Why marketing email needed an open-source tool.',
    deck: 'On rebuilding the most captured corner of SaaS — and why we gave the source away.',
    blurb:
      'Ten companies own marketing email. Their interests aren\'t yours. We rebuilt the stack — campaigns, automations, transactional — and put the whole thing under a permissive license.',
    readTime: '7 min read',
    accent: 'pop-magenta',
    body: [
      "Marketing email is one of those product categories that quietly got captured. There are maybe ten companies you'd consider, all of them charge per-seat or per-contact, and every one of them treats your subscriber list like collateral. Try exporting it sometime.",
      "We started Owlat because we needed it for our own newsletters and the math stopped making sense. Why are we paying $400/month to send 18 emails? Why does the export require a sales call? Why is the DSL for an automation flow a proprietary visual builder owned by a company that just got acquired?",
      "Building it is one thing. Open-sourcing it is the bet. The bet is: the next decade of SaaS is people getting tired of renting. We've seen it with auth (BetterAuth, Clerk), with databases (Supabase, Convex), with editors (VS Code, Zed). Marketing email is overdue.",
      "What we shipped: a campaign builder, a multi-step automation engine, a transactional API, contact management, all under MIT. You can self-host it. You can fork it. You can rip out the parts you don't need. We host a managed version for teams who don't want to operate Postgres at 3am, but the managed version is opt-in — not the funnel.",
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
    deck: 'Notes from wrapping a beloved web tool in a native shell — autosave, atomic writes, and the bits that are quietly hard.',
    blurb:
      "What we got right, what we got wrong, and the handful of details that separate a 'works on my machine' wrapper from something that earns the dock.",
    readTime: '6 min read',
    accent: 'pop-yellow',
    body: [
      "Draw started as a one-evening Tauri experiment: wrap Excalidraw in a native shell, save files to disk, see what happens. Six weeks later it's the editor I open every day, and there's a list of things I wish I'd known on day one.",
      "The hardest problem wasn't rendering, or the file format, or even the auto-updater. It was autosave. Specifically: how do you write a file 200 times a minute without ever — not once, not in a power outage, not in the middle of a stroke — leaving the user with a corrupt drawing?",
      "The answer is atomic writes. Every save lands as `<file>.tmp` next to the real file, gets fsync'd, and only then gets renamed over the original. POSIX rename is atomic. macOS gives you APFS clone-and-rename for free. The .tmp guard means the worst case is you lose 500ms of strokes — the file you had a second ago is the file you reopen. We tested this by literally pulling the plug. It works.",
      "Things we got wrong: the first sidebar was too clever. We tried to mirror the folder tree with virtual sections and tags and a quick-switcher. Users wanted a folder. We removed everything except the folder.",
    ],
    pullQuote:
      "The .tmp guard means the worst case is you lose 500ms of strokes — the file you had a second ago is the file you reopen.",
    tags: ['draw', 'tauri', 'local-first'],
  },
  {
    slug: 'three-thousand-cabins',
    number: '04',
    date: '2026-03-11',
    eyebrow: 'Hinterland',
    title: 'Thousands of cabins, one search box.',
    deck: 'How a marketplace for the outdoors learned to ignore the things outdoorsy people don\'t care about.',
    blurb:
      'When you ask people what they want from a cabin search, they\'ll tell you. They\'re wrong. Six years of running Hinterland taught us which filters earn their keep — and which ones we deleted.',
    readTime: '5 min read',
    accent: 'pop-orange',
    body: [
      "The first version of Hinterland's search had 47 filters. We had filters for hot tub, sauna, fire pit, BBQ, parking, electricity, water, dog-friendly, child-friendly, wheelchair access, dishwasher (yes, in a cabin), pet deposit tier, and twelve flavors of view. We cut it to nine.",
      "Here's what we learned. Most filter usage is signal noise — people clicking checkboxes to feel productive in a search session. The filters that actually correlate with bookings are: dates, party size, dogs, water access, off-grid, and price. That's it. The other forty are decorations.",
      "We didn't delete them — they're metadata on the listing page, where they belong. They just don't drive search. Our hypothesis was that fewer levers means better matches, and the booking conversion went up nine points the week we shipped it.",
      "The lesson is older than the marketplace: every filter is a tax on the user's attention. Only charge that tax when the answer changes the result.",
    ],
    pullQuote:
      "Every filter is a tax on the user's attention. Only charge it when the answer changes the result.",
    tags: ['hinterland', 'product', 'search'],
  },
  {
    slug: 'why-riso',
    number: '05',
    date: '2026-02-28',
    eyebrow: 'Studio',
    title: 'Why the site looks like a riso print.',
    deck: 'On choosing a visual language with character, and what we mean by "editorial pop."',
    blurb:
      'The web has a dozen design defaults. We picked one that feels like ink on paper instead of pixels on glass — and here\'s what that gets us.',
    readTime: '3 min read',
    accent: 'pop-magenta',
    body: [
      "The original wolves.ink mock was clean, minimal, and absolutely indistinguishable from every other studio site on the internet. The fonts were Inter. The colours were a kind of off-white. There was a hero section and three feature cards and a CTA. It was fine.",
      "Fine is the worst thing a studio site can be. So we burned it down and started again, this time committing to a single aesthetic with a clear point of view: editorial pop. Anton for the masthead. Fraunces for the asides. Riso pinks and yellows on warm ink. Halftone orbs that drift with the cursor. A stamp in the corner of the footer with the issue date.",
      "The point isn't decoration. The point is that the visuals tell you something about how we work — that we like print, that we read magazines, that we think the web has been getting too quiet. Every time you visit, the page is a publication, not a product page.",
      "If you came here looking for a template, this is the wrong studio.",
    ],
    pullQuote:
      "Fine is the worst thing a studio site can be.",
    tags: ['design', 'studio'],
  },
  {
    slug: 'link-building-honestly',
    number: '06',
    date: '2021-02-15',
    eyebrow: 'SEO',
    title: 'Link building, honestly.',
    deck: 'On the most contested corner of search — what backlinks actually buy you, and why every shortcut eventually rounds back as a penalty.',
    blurb:
      "Half the SEO field swears by it, half thinks it's sleazy growth dressed in a suit. Both are right, depending on how you do it. Notes on the slow way, the fast way, and the time we watched the fast way blow up a domain.",
    readTime: '5 min read',
    accent: 'pop-orange',
    body: [
      "Link building has a reputation problem. In the SEO field, half the people swear by it and the other half think it's a sleazy tactic dressed up as growth. Both are right, depending on how you do it. The mechanic underneath is older than most of the modern web — Google's PageRank, shipped in 1998, ranks pages by counting how many other pages point at them, weighted by how trusted those pages are. That's still the spine of how search works. A backlink, stripped of the marketing, is a small bet on your reputation made by someone else. The sum of those bets is your search position.",
      "There are three honest ways to acquire one. Creating links — submitting to directories, pasting your own URL in the comments, dropping it into a profile bio — is what anyone with a keyboard can do, which is exactly why it doesn't move the needle. Buying links is against Google's webmaster guidelines, runs about $350 per link on the open market, and reliably tanks the buyer's domain when caught. The third option is earning the link by writing something a stranger wants to point at, then asking the right strangers nicely. It is the slowest of the three, and that is why it is the only one that compounds.",
      "Not every earned link is equal, either. The ones that move rankings come from pages relevant to your topic — a tech site linking to a tech post beats a recipe blog linking to the same post, even when the recipe blog is louder — and from pages with their own inherited weight. Authority isn't issued by Google; it's passed along. A page with weight passes some of it through every outbound link it places. The link itself has structure that matters: the URL, the anchor text (the words people actually click), and the 'rel' attribute, which tells the crawler whether to count the vote. 'Nofollow,' 'UGC,' and 'sponsored' all mean don't count. Anything else is a 'follow' link — and a follow link sitting inside an editorial paragraph beats one bolted into the footer every time.",
      "The penalty side is real, and worth saying out loud. Violate the guidelines and you don't get a warning email — you get a ranking collapse, sometimes algorithmically (Penguin still does the rounds), sometimes by a human reviewer issuing a manual action. Recovery is measured in months, occasionally years. We've watched a few sites take that hit, and the math never came out in their favour. There is no faster way to lose a year of compounded work than to spend a weekend buying links.",
    ],
    pullQuote:
      "A backlink, stripped of the marketing, is a small bet on your reputation made by someone else.",
    tags: ['seo', 'marketing', 'process'],
  },
]

/** Convenience: the most recent note, used by the header pill. */
export const latestFieldNote = fieldNotes[0]!
