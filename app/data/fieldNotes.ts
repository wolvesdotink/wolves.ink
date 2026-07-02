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
  /**
   * Key takeaways — short, scannable points distilled from the note.
   * Rendered as a highlighted slab near the top of the detail spread,
   * above the long-form body. Use for article-style notes where the
   * reader wants the gist before the read.
   */
  takeaways?: string[]
  /**
   * Inspirations — set when a note is sparked by or responds to other
   * people's writing. Rendered as a credit line in the colophon, each
   * linking back to the original. Omit for fully self-contained pieces.
   */
  sources?: Array<{
    /** Title of the original article. */
    title: string
    /** Who wrote it. */
    author: string
    /** Canonical link to the original. */
    url: string
  }>
  /** Pull quote for the detail spread — set in serif italic. */
  pullQuote?: string
  /** Tags — printed as small pills at the foot of the detail spread. */
  tags?: string[]
}

const entries: FieldNote[] = [
  {
    slug: 'autocomplete-all-the-way-down',
    number: '17',
    date: '2026-07-02',
    eyebrow: 'AI',
    title: 'Autocomplete all the way down.',
    deck: 'The agent that refactored our codebase this morning runs on the same trick as the keyboard on your phone: guess the next word. On the strangest fact in computing, and the hundred-year-old tally sheet it started on.',
    blurb:
      'Every AI system you have ever talked to is a probability table with excellent manners. From a Russian mathematician hand-counting Pushkin in 1913 to agents that ship working software, the whole story is one move, repeated: guess the next word.',
    readTime: '3 min read',
    accent: 'pop-blue',
    takeaways: [
      'The entire training objective of a modern language model is guess the next word. Everything else, the reasoning, the code, the apology, emerges from that.',
      'The lineage is over a century old: Markov hand-counted 20,000 letters of Pushkin in 1913, Shannon turned next-letter guessing into a science in 1951, your phone keyboard shipped the pocket version.',
      'At every step the model scores roughly a hundred thousand possible next tokens and picks one. There is no second mechanism. That is the whole move.',
      'An agent is that move in a loop with its output wired to tools. A shell command is just a very consequential autocomplete.',
      'Prediction forced understanding: to guess the next line of a program, you have to model what the program does. The probability was never the small part.',
    ],
    body: [
      "Start with the keyboard on your phone. You type 'how are' and it offers 'you', because in the mountain of text it was tuned on, 'you' is what usually comes next. No grammar, no meaning, just a tally of what tends to follow what. The idea is older than the computer: in 1913, the Russian mathematician Andrey Markov sat down with Pushkin's Eugene Onegin and hand-counted 20,000 letters to show that language has statistical structure, that a vowel is more likely after a consonant than after another vowel. The first language model was a tally sheet. In 1951 Claude Shannon turned it into a science with a parlour game, asking people to guess a text one letter at a time, and measured how predictable English actually is: roughly one bit per letter. Language, it turns out, is mostly pattern. That predictability is the entire natural resource this industry runs on.",
      "Here is the part that still reads like a misprint. The models everyone now talks to all day are that same game, and nothing else. Take a neural network, feed it trillions of words, and train it on exactly one objective: given everything so far, guess the next word. The training loss is literally a measure of how surprised the model was by what came next. Nobody bolted on a reasoning module, a coding module, a politeness module. At every step the model produces a probability for each of roughly a hundred thousand possible next tokens, samples one, appends it, and goes again. The essay, the working SQL, the joke that actually lands: all of it is that single move, repeated until a stop token wins the draw.",
      "The jump from keyboard trick to colleague happened when the guesses got chained and given hands. Wire the output to tools, teach the model that a certain shape of text runs a command, and the loop becomes an agent: it predicts a shell command, sees the result, predicts the next step, and keeps going for hours. The systems that now write applications, run their own tests, read the failure, and fix their own code are not running a different algorithm than the autocomplete. They are running it in a loop with consequences. When an agent renames a file on our bench, the decision is a string it found probable. A shell command is just a very consequential autocomplete.",
      "The resolution to the paradox is the interesting bit. Guessing the next word sounds trivial because we imagine guessing it badly. Guessing it well is another matter: to predict the next line of a program, you have to track what the program does, what the variables hold, what the author is trying to build. To predict the next sentence of an argument, you have to follow the argument. Prediction, pushed hard enough, forces a working model of whatever produced the text, and text was produced by people doing things in a world. That is the crazy thought, sat with properly. Not that the machine is secretly more than probability, but that probability, at sufficient scale, was never less than this. The dice got so good at the game that they became the player.",
    ],
    pullQuote:
      'A shell command is just a very consequential autocomplete.',
    tags: ['ai', 'engineering', 'craft'],
  },
  {
    slug: 'no-is-the-toll',
    number: '16',
    date: '2026-06-25',
    eyebrow: 'Nerve',
    title: 'No is the toll, not the verdict.',
    deck: 'Rejection feels like a judgement on you. It is a charge on the road. Every no is the machine pointing you somewhere better, and the only thing more expensive than hearing it is never putting yourself in a position to.',
    blurb:
      'Rejection is not a failure, it is the price of becoming someone who could be chosen. On reading no as redirection, why fear is mostly fiction, and the quiet danger of staying exactly where you are.',
    readTime: '3 min read',
    accent: 'pop-orange',
    takeaways: [
      'Rejection is the toll, not the verdict. It is what you pay to become a better version of yourself, not a ruling on your worth.',
      'No is redirection, not rejection. You cannot be chosen without first being overlooked, and every no readjusts your aim.',
      'Fear is mostly False Evidence Appearing Real. You are scared of a thing that has not happened, and usually never will.',
      'If rejection scares you, staying stuck should terrify you. Comfort has never changed anyone.',
      'Transformation starts the moment you show up. The nerve to be told no is the whole price of admission.',
    ],
    body: [
      'Rejection lands like a verdict. Someone reads your work, your pitch, your face, and the no comes back, and for a second it feels like a ruling on what you are worth. It is not. It is a toll. It is the small, ugly fee you pay at the gate for taking the road at all, and everyone who has ever gotten anywhere has a wallet full of the receipts. The people who look chosen are not the people who were never turned down. They are the people who kept paying.',
      'So read the no as redirection, not rejection. You cannot be chosen without first being overlooked a few times, because being overlooked is how you find out where you actually fit. Every no is the world pointing, telling you to readjust the aim and go again. The yes you are after is on the far side of a pile of them, and the pile is not in your way. The pile is the path.',
      'Most of what stops you from getting there is fiction anyway. Fear is False Evidence Appearing Real: a vivid, convincing movie about a thing that has not happened, playing to an audience of one. You are not scared of the no. You are scared of a no you have invented, in detail, in advance. The actual no, when it finally arrives, is almost always smaller and quieter than the trailer your head cut for it.',
      'And here is the part nobody says out loud. If the idea of being rejected scares you, the idea of staying exactly where you are should terrify you. Comfort is the one place that has never changed a single person. Stuck does not hurt, which is precisely what makes it dangerous, because nothing about it ever forces your hand. The nerve to show up and risk the no is not the cost of transformation. It is the whole of it. Pay the toll. The road is the point.',
    ],
    pullQuote:
      'You cannot be chosen without first being overlooked.',
    tags: ['craft', 'nerve', 'work'],
  },
  {
    slug: 'chat-wont-replace-your-apps',
    number: '15',
    date: '2026-06-25',
    eyebrow: 'Interfaces',
    title: "Chat won't replace your apps.",
    deck: 'One camp says we will talk to our computers and bin the buttons. The other says the buttons are sacred. Both miss the point. The real future is an interface that builds itself for your exact request, then disappears.',
    blurb:
      'Chat will not replace your apps, and your apps will not stay the same. The real question was never chat versus buttons, it is how much the machine should guess. The answer is an interface that builds itself for your request and then throws itself away.',
    readTime: '3 min read',
    accent: 'pop-magenta',
    takeaways: [
      'Chat versus buttons is the wrong fight. The real question is how much the machine should guess, and every task answers it differently.',
      'Buttons win the simple stuff for good. A tap your thumb already knows beats a sentence every time.',
      'Buttons break at the top, not the bottom: too many options turn every tool into a cockpit built for nobody.',
      'The fix is generative UI. The machine builds the few controls your request needs, then throws them away.',
      'Design shifts from drawing fixed screens to designing the parts the machine assembles. The new skill is sending each task to the right tool.',
    ],
    body: [
      'There are two big claims about where computing is headed. One says we will just talk to our computers and throw the buttons away. The other says the buttons are sacred and chat is a fad. The screenless AI gadgets, the lapel pin and the little orange toy, bet everything on the first claim and flopped. Not because the AI was bad, but because talking is a slow way to turn on a light. Both claims are wrong, and they are wrong in the same way.',
      'Buttons win the simple stuff, and always will. You drag a file to the trash. You pinch a photo to zoom. The thing you want is right there and you act on it, with no sentence to be misread. For what you do every day, the coffee order, the ride home, the lamp by the door, a tap your thumb already knows beats a paragraph every time. Wedging a chatbot in there solves a problem nobody has.',
      'But buttons have a limit. They work while the choices fit on the screen. Past that, the screen fills with menus inside menus, and every serious tool ends up looking like a cockpit built for nobody. Open a professional video editor and you see it: hundreds of controls, almost none of them yours. This is where chat sounds smart again, and where it also fails, because a wall of text is not a control panel either. Both ideas break in the same place: the huge middle, where most real work lives.',
      'The real question was never chat versus buttons. It is how much the machine should guess. A button guesses nothing and makes you do everything. A blank chat box guesses everything and makes you describe what you would rather just adjust. The answer sits between them, and it is finally possible: the machine reads your request, decides a control beats a paragraph, and builds the two sliders and one map your question actually needs. Then it throws them away. Designers stop drawing fixed screens and start designing the parts the machine assembles on the spot. It is the biggest shift in interfaces since the desktop was invented at Xerox.',
      'So the future is not one winner. It is all three, matched to the job. A button when the task is one tap you do daily. A built-on-demand interface when the task is specific and would otherwise drown in menus. An agent when the work is big and boring and you would rather not watch. The new skill is routing: knowing which of the three a moment wants, and refusing the other two. That is where we spend our attention now, building fewer finished screens and more kits the machine can draw from. The empty chat box was always a placeholder. The job is to fill it back in, on demand, with exactly the controls the moment needs and nothing it does not.',
    ],
    pullQuote:
      'A conversation is a terrible way to turn on a light.',
    tags: ['design', 'ai', 'interfaces'],
  },
  {
    slug: 'boil-the-ocean',
    number: '14',
    date: '2026-06-07',
    eyebrow: 'AI',
    title: "It's time to boil the ocean.",
    deck: "Don't boil the ocean held up for as long as code was expensive. It was a price list, and the prices just collapsed. On the small crews rebuilding the biggest tools, and what that means for the projects you never started.",
    blurb:
      "Don't boil the ocean: good advice, priced for a world where code was written by hand. What happens to ambition when the price collapses, and why the open-source rebuilds of the giant tools are only the start.",
    readTime: '4 min read',
    accent: 'pop-yellow',
    takeaways: [
      "Don't boil the ocean was a price list for engineering hours. It should not survive the repricing unexamined.",
      'The deadliest moment in a big project is the estimate: the math says three years of nights and weekends, and the doc quietly closes.',
      'The open-source rebuilds of Firebase, Calendly and Figma started before the agents. What the agents changed is who gets to attempt one.',
      'Direction and review are the constraints now, and both respond to practice. The one constraint that never did, affording the build, is the one that fell.',
      'Dig out the idea you filed under too big. It was priced in old money, and nobody has re-run the numbers since.',
    ],
    body: [
      "Don't boil the ocean: you will spend a great deal of effort for a handful of salt. McKinsey put it in print, and software took it up as scripture. Scope it down. Ship the small thing first. For our entire working lives it has been the soundest advice in the trade, and we have given the speech ourselves, more than once, believing it every time.",
      "What we had not noticed until this year is what the advice is actually made of. Strip it down and what is left is a price list. Don't boil the ocean is a statement about what engineering hours cost, written when every feature was hand-typed by someone expensive who could hold one subsystem in their head at a time. At those prices, scoping down was simply correct, the way not buying a boat is correct on a studio budget. But look at where the ambitious projects actually die. Not in the building. In the estimate. Someone opens a doc, sketches the true shape of the thing, multiplies it out to three years of nights and weekends, and closes the doc. Nobody mourns these projects because they never get far enough to have a name. The graveyard of software is mostly spreadsheets. You have one of these docs. Anyone who has shipped software for a decade does.",
      "The price list expired. Simon Willison called it in March 2023, before most people had let the tools near a real repo: the striking thing about AI assistance was that it lowered his bar for which projects were worth starting at all. Ideas he would have shelved as a couple of days of work were suddenly an hour. This February, Garry Tan went further and argued the idiom itself should be retired: if the plan is to do something dramatically bigger, the machine is the best news on offer. The open-source rebuilds of the giant tools tell the same story. Supabase went at Firebase. Cal.com at Calendly. Penpot at Figma. Documenso at DocuSign. That wave started before the agents arrived, fuelled by people tired of renting; we wrote a whole note saying exactly that, back when Owlat was a bet instead of a beta. The agents changed who can afford the attempt. Taking a serious run at one of the giants used to be a funded-company bet. It is turning into a small-crew bet.",
      "Owlat is that bet. A full email platform is six subsystems where you would normally ship one: builder, audiences, campaigns, automations, a transactional API, and the whole deliverability mess underneath. We ran the estimate twice over the years and filed it under someday both times. Under the old arithmetic the project simply does not happen; with agents on the bench we started anyway, and the someday file is one entry lighter. It is in beta now.",
      "The half of the old advice worth keeping was never about cost. An ocean still needs a reason to be boiled, and the failure mode moved upstream: big projects now die of fuzzy goals and output nobody reads. METR measured experienced open-source developers going about a fifth slower with early-2025 tools while feeling faster, which should humble anyone, us included, and review is still the bottleneck we wrote about two notes ago. But those are problems of direction and judgement, and practice fixes those. Price was the constraint practice never touched. So: somewhere in your notes is the idea you marked too big. A bookkeeping suite. An honest CRM. A project tracker that loads in under a second. Open the doc tonight. Hand the ugliest subsystem to an agent over the weekend and see what is standing on Monday. The estimate that killed the idea has an old date on it. Run it again.",
    ],
    pullQuote:
      'The graveyard of software is mostly spreadsheets.',
    sources: [
      {
        title: 'Boil the Ocean',
        author: 'Garry Tan',
        url: 'https://garryslist.org/posts/boil-the-ocean',
      },
      {
        title: 'AI-enhanced development makes me more ambitious with my projects',
        author: 'Simon Willison',
        url: 'https://simonwillison.net/2023/Mar/27/ai-enhanced-development/',
      },
    ],
    tags: ['ai', 'open source', 'process'],
  },
  {
    slug: 'the-good-kind-of-lazy',
    number: '13',
    date: '2026-06-05',
    eyebrow: 'AI',
    title: 'The good kind of lazy.',
    deck: 'Larry Wall called laziness a virtue: the drive to spend real thought now so the system asks less of everyone later. The machine on our bench writes code for free, which means it never feels the one pressure that used to make the code good.',
    blurb:
      'The old programmers prized laziness: not sloth, but the impatience that drives you to build the abstraction so you never write the dull thing twice. A model pays nothing for what it writes, so it never learns to want less of it. Notes on putting the constraint back in the loop on purpose.',
    readTime: '4 min read',
    accent: 'pop-blue',
    takeaways: [
      'Laziness in the old sense is a virtue: spend thought now so the system asks less of everyone later. The agent has no later to be kind to.',
      'Code costs a human something to carry. It costs the model nothing to write, so it sprawls, and sprawl is the default, not the bug.',
      'Lines per day measures the wrong thing. The good edit is usually the one that removes a file, not the one that adds thirty-seven thousand.',
      'Elegance is born of constraint. Our finitude was the constraint; pulling it out of the loop pulled out the thing that made the work good.',
      'Use the model to protect our laziness (pay down debt, hold the line on rigor), not to manufacture the busywork it costs us nothing to accept.',
    ],
    body: [
      "There is an old line, from Larry Wall by way of every greybeard who ever mentored us, that laziness is one of the three great virtues of a programmer. It always reads as a joke until you have done the job long enough to mean it. The lazy programmer is not the one who does less. It is the one who cannot stand to do the dull thing twice, and so spends a hard afternoon building the abstraction that means nobody ever has to. Laziness is what drives you to make the system as simple as it can be and no simpler, because every needless part is a thing you will have to carry up the hill again next quarter. The virtue is not the rest. It is the impatience with future toil that buys the rest.",
      "We rediscovered the definition the week the agents got good, by watching something that had it removed. The model writes code for free. That is the whole of it. A human pays for every line in a currency the model does not hold: you will read this again at two in the morning, you will be the one who carries it when it breaks, the future version of you is real to you and you would like to be kind to him. That ledger is exactly where the good kind of laziness comes from. The machine has no two in the morning and no future self, so it has no reason to want less code, and it sprawls. Eight variants of the same logo, one of them empty. Three test harnesses for a thing that needs none. A whole second editor hidden inside the first. None of that is a bug. It is what building looks like when nothing pushes back toward the simpler shape.",
      "So of course the metric that came with it is volume. Someone we will not embarrass was lately proud of thirty-seven thousand lines in a day, as though the number pointed up. The entire DTrace tree is about sixty. We were taught to read a diff that deleted a file as the better day's work, and we still believe it, and the new tooling is fluent in precisely the opposite. Assessing the work by the pound was always the brogrammer's mistake (the hustle about crushing code, never about what the code crushed down to), and the model is the most productive brogrammer who ever lived. It will hand you the weight you ask it to celebrate, and the weight is the cost, not the yield.",
      "What unsettled us was realising our finitude had been a feature the whole time. The best engineering we have ever done came out of not having enough: not enough hours, not enough memory, not enough patience for the version with seven moving parts when five would do. Constraint was the press that squeezed the work down to something elegant. We spent years thinking of our limits as the tax we paid to ship, and it turns out the limits were doing the design. Take the human out of the inner loop and you do not just lose a reviewer. You lose the one component in the system that was tired enough to insist on simple.",
      "The fix is not to write it all by hand again like penitents; the leverage is real and we are keeping it. The fix is to put the constraint back deliberately, since it no longer arrives for free. We make the model justify lines rather than count them, and we let deletion be the default ask. We point it at the work our laziness actually wants done: the debt nobody has time for, the rigor we are too rushed to enforce, the test that should have existed two refactors ago. And we keep it away from the part where it would happily pour concrete. The model should serve the old virtue, not stand in for it. It is a wonderful tool for being lazy in the right way, and a frictionless engine for the wrong way, and almost the whole of using it well is knowing, every single time, which of the two you have just asked it to be.",
    ],
    pullQuote:
      'The machine has no two in the morning and no future self to be kind to, so the kindness has to come from us.',
    sources: [
      {
        title: 'The Peril of Laziness Lost',
        author: 'Bryan Cantrill',
        url: 'https://bcantrill.dtrace.org/2026/04/12/the-peril-of-laziness-lost/',
      },
    ],
    tags: ['ai', 'craft', 'engineering'],
  },
  {
    slug: 'the-orchestration-tax',
    number: '12',
    date: '2026-05-29',
    eyebrow: 'AI',
    title: 'The orchestration tax.',
    deck: 'We spent a month running the workbench loud, a dozen agents going at once, and the dashboard looked incredible. Almost none of it shipped. Here is what that taught us about the one resource on the bench that refuses to parallelize.',
    blurb:
      'Starting an agent costs nothing now, so we started a lot of them. The work piled up faster than we could read it, and the bottleneck turned out to be the same as it always was: one human holding all the judgement. Notes on building around the serial thread instead of pretending it scales.',
    readTime: '4 min read',
    accent: 'pop-orange',
    takeaways: [
      'Scale the fleet to the rate you can actually review, not to the number the UI will let you launch. Ours sits at three or four.',
      'Keep two piles. Isolated work goes to background agents that only need us at the final gate. Anything that turns on judgement stays single file.',
      'Batch the reviews. Coming back to an agent cold, hours later, costs the full context reload every single time.',
      'Spend attention only on what the machine cannot check itself. Make the agent prove the boring 80% with passing tests and screenshots.',
      'Guard the quiet hours for thinking. Orchestrating is the overhead around the work, not the work.',
    ],
    body: [
      "For a stretch this spring we ran the workbench loud: a dozen, sometimes twenty agents going at once, each chewing on its own branch. It felt like the most productive month of our lives. The board was full, every tile moving, something always finishing. Then we looked at what had actually landed on main, and it was a fraction of the motion. The gap between the two had a shape, and once we saw it we could not unsee it. Starting an agent costs a sentence. Finishing one costs all of our attention, and there is only one of us holding it at a time.",
      "That gap is an asymmetry we kept failing to price in. Opening an agent is a keystroke. Closing the loop on one means reading what came back, deciding whether it is right, and reconciling it against whatever the other agents changed underneath it. Every one of those steps routes through a single head. For a while we thought of the agents as the system and ourselves as the operator standing outside it. The truer picture is that we are a component inside the system, and the slowest one. Anyone who has written concurrent code already has the intuition. Python lets you spawn all the threads you want and still runs only one at a time, because they all queue for a single lock. On our bench that lock is human judgement, and we hold the only copy.",
      "Amdahl's Law put a number on the disappointment. However much of the pipeline you parallelize, the slice that stays serial caps the whole thing. For us the serial slice is the thinking: understanding the architecture, catching the answer that is subtly wrong, resolving the merge. Adding agents did not speed that up by a second. It just made the queue in front of it longer. We had optimised the one stage that was never the constraint, and the unread work stacked up exactly where we had no way to add capacity.",
      "It also explained why we were so tired. Running a single processor flat out with no slack feels precisely like that. Every time we jumped back to an agent we had left, we paid to reload a context that had gone cold, and we never reloaded it perfectly. Five agents was not one workload done five times. It was five cold restarts plus a low background hum of worry about which one we should be checking. Pushing harder bought us no extra capacity. It bought shallower reviews, and eventually a quiet sort of surrender where we started waving code through because forming a real opinion cost attention we had already spent. The tax comes due either way. The only decision left is whether we pay it on purpose or let it erode our grip on our own codebase.",
      "So we stopped treating it as a willpower problem and started treating it as an architecture problem, because that is what it is. Attention is the scarce serial resource, and we design around it now the way we would design around any bottleneck in production. We use backpressure and keep the number of live agents close to the rate we can genuinely review, which for us is three or four rather than twenty. We sort work into two piles and refuse to mix them. Isolated tasks go to background agents that only need us at the final gate. The judgement-heavy work, the strange bug or the shape of a new module, stays single file, because running several of those at once only thrashes the lock and everything comes out worse. We batch the reviews into one sitting instead of grazing on them all day. We spend the lock only on what the machine cannot verify on its own and let the agents prove the rest with tests and screenshots. Spawning agents turned out to be the easy part, and the easy part was never the job. The job is building the system around the one resource we cannot clone, which is our own attention, and giving it the same respect we give anything else we run in production.",
    ],
    pullQuote:
      'The board was full and moving. What reached main was a fraction of the motion.',
    sources: [
      {
        title: 'The Orchestration Tax',
        author: 'Addy Osmani',
        url: 'https://x.com/addyosmani/status/2059844244907696186',
      },
    ],
    tags: ['ai', 'process', 'engineering'],
  },
  {
    slug: 'the-comparison-engine',
    number: '11',
    date: '2026-05-19',
    eyebrow: 'House rules',
    title: 'The comparison engine.',
    deck: 'Watching the people around you is not a vice in moderation. Moderation is just not where most of us end up, and the comparing eventually crowds out everything else that was supposed to be happening in there.',
    blurb:
      "There's a cost to constantly measuring yourself against the people around you, and it never arrives on any visible invoice. The interior life that needs an unoccupied head to grow simply doesn't get one. The audience you're performing for cannot tell you when the rot starts; they don't see that part.",
    readTime: '3 min read',
    accent: 'pop-magenta',
    body: [
      "\"You obsess over your identity in relation to others, while your soul rots inside of you.\" Whoever wrote it was being unkind, and it lands anyway because it's almost always at least a little true. There is a particular state where the head wakes up already comparing (am I where she is, did he get there first, what did they think of the post) and never quite stops for the rest of the day. None of that is unreasonable in moderation. Status is real information, and acting like you do not notice it is a different kind of dishonesty. The trouble is that the comparing rarely stays casual once it gets going, and the hours it occupies come out of the part of you that builds anything lasting.",
      "The bill is a quiet one. From the outside very little changes. The career goes on doing career things. The friendships look intact. What thins is interior: the part of you that needs the head quiet to do long reading, real thinking, building things because the problem is interesting and for no other reason. That part needs room, and the comparing never makes any. Spend enough years that way and you eventually stop being a person with an interior life and become a position in a leaderboard you don't recall entering.",
      "The texture of things changes too. Reading turns into something that needs to be seen happening, conversation becomes small performance, and work starts being shaped for legibility first and quality second. None of this is a conscious decision, which is what makes it so hard to undo. One day you simply notice that the things you would have done if nobody were watching have quietly stopped happening. The question itself, what you would think about if you knew nobody would ever see it, gets harder to answer the longer you have avoided it.",
      "The way out is not to stop caring what people think. That's a pose, and a pretty incoherent one on top of being a pose: we are social animals, and 'I don't care' usually means 'I care and I am furious about it.' The actual move is smaller and harder. Keep a piece of the day, the week, the work, that does not get fed to anyone. A practice with no spectators, a notebook nobody reads, a problem you are working on because it interests you and for no other reason. That space is what the interior part of you runs on. Lose it and you'll keep moving, often busier than before, but the inside hollows out on a schedule nobody warns you about, and the people watching from the outside cannot tell you, because the inside is not what they are watching.",
    ],
    pullQuote:
      "You stop being a person with an interior life and become a position in a leaderboard you don't recall entering.",
    tags: ['craft', 'growth', 'process'],
  },
  {
    slug: 'empty-room-test',
    number: '10',
    date: '2026-05-18',
    eyebrow: 'House rules',
    title: 'The empty room test.',
    deck: 'Imagine you already have the thing and nobody ever finds out. Do you still want it? If you hesitate, the wanting wasn\'t yours; it belonged to the audience.',
    blurb:
      'Status is real and useful. Most ambitions are braided strands of private wanting and public signal, and the two feel identical from the inside. The empty room is where you find out which strand was actually load-bearing.',
    readTime: '3 min read',
    accent: 'pop-yellow',
    body: [
      "Here's a test worth running on your own ambitions, and it's never not embarrassing. Pick a goal: the job, the title, the apartment, the follower count, the thing you've been telling yourself you want for a year. Now imagine you already have it, and nobody ever finds out. Ever. The achievement is real and entirely private. Do you still want it? If you hesitate, you've learned something. The desire wasn't aimed at the thing. It was aimed at the audience that would see you having it, and the audience just left the room.",
      "This isn't a moral failing. Humans are social animals; we're built to read each other for status, and most of what we call motivation is some braid of internal pull and external signal. The signal half is doing useful work. It pushes us through dips, it makes effort visible to people who can help, it gives the work shape. The trouble is that the two strands feel identical from the inside. You can spend a decade chasing something and never notice that the part you were actually chasing was the photograph at the end. The failure isn't having a social motive. It's mistaking it for a private one.",
      "It shows up everywhere once you start looking. The job you'd take in a heartbeat with the title and pass on without it. The book you've been meaning to read versus the book you've been meaning to be seen reading. The trip you'd love if you could post about it, and find a chore if you couldn't. The startup you keep mentioning at parties but never quite work on between them. Some of these are still worth doing with the signal stripped out. You'd want to know that before you spend the next five years on them.",
      "The honest version of any ambition has both strands in it. You want the work and the recognition; the craft and the credit. Pretending otherwise is its own kind of dishonesty. The job is to know which strand is actually load-bearing, not to purge the signal half. When the room goes dark, which one would you still walk toward? Most regrets from people deep into a career run some version of the same answer: they chased the visible version of a thing they didn't really want, and got it. The empty room would have saved them a decade.",
    ],
    pullQuote:
      "When the room goes dark, which one would you still walk toward?",
    tags: ['craft', 'growth', 'process'],
  },
  {
    slug: 'the-bug-flood',
    number: '09',
    date: '2026-05-15',
    eyebrow: 'Security',
    title: 'The bug flood.',
    deck: 'AI found 423 security bugs in Firefox last month. The disclosure timelines that defended the internet for thirty years didn\'t survive it.',
    blurb:
      'In April 2026, one AI model found 271 security bugs in Firefox in a single pass, including race conditions and XSLT bugs that had survived twenty years of human review. The numbers don\'t describe a future threat. They describe this month.',
    readTime: '4 min read',
    accent: 'pop-blue',
    body: [
      "Something changed in software security in the last six months, and the numbers say it better than any argument. In April 2026, Mozilla fixed 423 security bugs in Firefox, up from roughly twenty per month a year earlier. Of those, 271 were found by a single AI model in one pass. Sandbox escapes, JIT flaws, race conditions, bugs sitting in XSLT processors for twenty years. Not discovered over a career. Discovered between lunch and dinner.",
      "Databases are the same story. AI-assisted tooling recently found two critical flaws in PostgreSQL and MariaDB that had been in the codebase since 2005. Both earned near-CVSS-9 severity scores. One was reachable with a single authenticated function call. The code had survived two decades of human review and fuzz testing because nobody was looking with the right eyes, and now those eyes are cheap, fast, and never get tired.",
      "The real casualty isn't the bugs themselves but the rituals we built around them. Coordinated disclosure has been the web's polite agreement for decades: find something, tell the vendor privately, give them ninety days to fix it before going public. That agreement assumed the discoverer was rare. It assumed nobody else would notice. AI models are now scanning the same public commit history simultaneously, which means the ninety-day window is fiction. Two researchers filed the same Linux kernel vulnerability within nine hours of each other, each working with AI tools. There is no embargo long enough to outlast that.",
      "The good news: AI finds bugs faster and patches them faster too. Architectural hardening (changes that eliminate entire exploit classes rather than individual instances) pays off disproportionately when the discovery rate goes up. The bad news: every project that hasn't run its codebase through AI tooling is sitting on a backlog it doesn't know about. Not a hypothetical one. A real one, probably counted in dozens, possibly in hundreds. Daniel Stenberg, creator of curl, puts it plainly: any project that hasn't scanned with AI-powered tooling will likely find a huge number of flaws. The clock has already started.",
    ],
    pullQuote:
      "There is no embargo long enough to outlast AI scanning the same commit history simultaneously.",
    tags: ['ai', 'security', 'engineering'],
  },
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
      "Every AI prompt is a pull of the handle. You get something back, fast, and most of the time it works. That's why the tool is genuinely useful, and it's also why it's worth paying attention to how we're using it. Slot machines aren't addictive because they pay out reliably. They're addictive because the payout lands often enough that you keep pulling without thinking. AI tools have a similar shape, except the payouts are higher and the cost of pulling is almost nothing. The danger isn't in the tool itself but in forgetting to look at what you just got back.",
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
      "The honest read isn't a humblebrag. It's a job description. Most of the job is being uncomfortable in public, on purpose, for years.",
    readTime: '3 min read',
    accent: 'pop-magenta',
    body: [
      "The line is true. It's also one of the most worn-down quotes in circulation, passed around at conferences, on podcasts, in the back half of startup advice columns. The people who repeat it almost never mean it the way it reads. They want the reputation of someone who seeks out smarter rooms while remaining, in their current one, comfortably the smartest. It's a humility posture performed for an audience that already agrees you're clever.",
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
]

export const fieldNotes: FieldNote[] = entries.sort((a, b) => b.date.localeCompare(a.date))

/** Convenience: the most recent note, used by the header pill. */
export const latestFieldNote = fieldNotes[0]!
