<script setup lang="ts">
import { imprint } from '~/data/imprint'
import { site } from '~/data/site'

/**
 * /impressum — Pflichtangaben gemäß § 5 DDG.
 *
 * German law (§ 5 DDG, the Digitale-Dienste-Gesetz that replaced § 5 TMG
 * in May 2024) requires every commercial site addressing or operating in
 * Germany to publish a legal-disclosure page that's reachable in two
 * clicks from any other page on the site. The baseline link in
 * `AppFooter.vue` is the second click — this is the page it lands on.
 *
 * Field-journal style: same logbook → numbered ranges → closing marquee
 * register as `/projects` and `/field-notes`, so visitors who arrived
 * from the workbench feel at home rather than dumped into a typeset PDF.
 *
 * Content language: German. The disclosure data must remain in the
 * language of the audience the studio addresses (German law, German
 * tax authorities), so eyebrows and section labels stay in German too.
 * The framing copy is bilingual where it earns its room — a one-line
 * English explainer for visitors who landed here from the English shell,
 * then the legal block in German.
 *
 * Crawler hint: `noindex` keeps Google from ranking the Impressum above
 * the homepage when somebody searches the studio name (it has the most
 * named-entity signal of any page on the site). Reachable for users,
 * skipped for SERPs.
 */

const reviewedDisplay = (() => {
  const d = new Date(imprint.reviewedOn)
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
})()

useSeoMeta({
  title: 'Impressum',
  description:
    'Pflichtangaben gemäß § 5 DDG für Wolves Software UG (haftungsbeschränkt). Anbieterkennzeichnung, Kontakt, Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV.',
  ogTitle: 'Impressum — Wolves',
  ogDescription: 'Pflichtangaben gemäß § 5 DDG.',
  ogType: 'website',
  twitterCard: 'summary',
  // Keep the Impressum out of search results — it's reachable for
  // users via the footer, but Google ranking it for the studio name
  // would be a worse outcome than the homepage ranking for it.
  robots: 'noindex, follow',
})

defineOgImage('Wolves', {
  title: 'Impressum',
  eyebrow: 'For the record',
  description: 'Angaben gemäß § 5 DDG.',
  accent: 'yellow',
})

useSchemaOrg([
  defineBreadcrumb({
    itemListElement: [
      { name: 'Home', item: '/' },
      { name: 'Impressum', item: '/impressum' },
    ],
  }),
  // ContactPage so search engines can attach the phone/email/address
  // to the existing Organization node instead of orphaning them.
  {
    '@type': 'ContactPage',
    name: 'Impressum — Wolves',
    description: 'Pflichtangaben gemäß § 5 DDG.',
    isPartOf: { '@id': '#website' },
    about: { '@id': '#identity' },
  },
])

const fullAddress = (a: typeof imprint.company.address) =>
  `${a.street}, ${a.zip} ${a.city}, ${a.country}`
</script>

<template>
  <div class="grain">
    <!-- ══════════════════════════════════════════════════════════════════
         LOGBOOK — Impressum
    ══════════════════════════════════════════════════════════════════ -->
    <PageMasthead
      eyebrow="Logbook · Legal · Pflichtangaben"
      :left-orb="{ tone: 'text-pop-yellow' }"
      :right-orb="{ tone: 'text-pop-magenta' }"
    >
      <template #title>
        Impressum.<br>
        <span class="text-pop-yellow">For the record.</span>
      </template>

      <template #body>
        <div class="mt-10 grid grid-cols-12 gap-x-6 gap-y-6">
          <p class="text-editorial col-span-12 max-w-[44ch] text-balance text-2xl text-cream/85 lg:col-span-7 lg:text-3xl">
            Pflichtangaben gemäß <span class="not-italic font-mono text-cream">§ 5 DDG</span>
            — the German Digital Services Act asks every studio with a public
            shop window to leave the lights on and the mailbox labelled.
            Here are ours.
          </p>
          <aside class="col-span-12 flex flex-row flex-wrap items-start gap-3 lg:col-span-5 lg:flex-col lg:items-start lg:gap-4">
            <StickerBadge tone="yellow" :tilt="-5" eyebrow="Per" jiggle>
              § 5 DDG
            </StickerBadge>
            <StickerBadge tone="magenta" :tilt="4" eyebrow="Filed in">
              Brandenburg, DE
            </StickerBadge>
            <StickerBadge tone="cream" :tilt="-3" eyebrow="Reviewed">
              {{ reviewedDisplay }}
            </StickerBadge>
          </aside>
        </div>
      </template>
    </PageMasthead>

    <!-- ══════════════════════════════════════════════════════════════════
         RANGE I — Anbieterkennzeichnung
    ══════════════════════════════════════════════════════════════════ -->
    <section class="relative border-b border-cream/10">
      <div class="mx-auto max-w-[1600px] px-4 py-20 md:px-8 md:py-28">
        <div class="grid grid-cols-12 items-end gap-x-6 gap-y-6 mb-12">
          <div class="col-span-12 lg:col-span-7">
            <span class="text-mono-eyebrow text-cream/60">Range I — Anbieterkennzeichnung</span>
            <h2 class="text-display-xl mt-4 text-cream">
              Wer<br>
              <span class="text-pop-magenta">wir sind.</span>
            </h2>
          </div>
          <div class="col-span-12 lg:col-span-5">
            <p class="text-editorial text-balance text-xl text-cream/85 md:text-2xl">
              Verantwortlicher Anbieter im Sinne des Digitale-Dienste-Gesetzes
              ist die folgende Gesellschaft, vertreten durch den unten
              genannten Geschäftsführer.
            </p>
          </div>
        </div>

        <!-- Disclosure card — definition rows in a two-column grid -->
        <dl class="grid grid-cols-1 gap-x-12 gap-y-10 border-t border-cream/15 pt-12 md:grid-cols-2">
          <!-- Company -->
          <div class="space-y-3">
            <dt class="text-mono-eyebrow text-cream/55">Anbieter</dt>
            <dd class="text-display-md text-3xl text-cream md:text-4xl">
              {{ imprint.company.legalName }}
            </dd>
          </div>

          <!-- Director -->
          <div class="space-y-3">
            <dt class="text-mono-eyebrow text-cream/55">Vertretungsberechtigter Geschäftsführer</dt>
            <dd class="text-display-md text-3xl text-cream md:text-4xl">
              {{ imprint.company.director }}
            </dd>
          </div>

          <!-- Address -->
          <div class="space-y-3">
            <dt class="text-mono-eyebrow text-cream/55">Anschrift</dt>
            <dd class="text-editorial text-xl leading-relaxed text-cream/85 md:text-2xl">
              {{ imprint.company.address.street }}<br>
              {{ imprint.company.address.zip }} {{ imprint.company.address.city }}<br>
              {{ imprint.company.address.country }}
            </dd>
          </div>

          <!-- Register / VAT — collapses gracefully when null -->
          <div class="space-y-3">
            <dt class="text-mono-eyebrow text-cream/55">Handelsregister</dt>
            <dd class="text-editorial text-xl leading-relaxed text-cream/85 md:text-2xl">
              <template v-if="imprint.register.court && imprint.register.number">
                {{ imprint.register.court }}<br>
                <span class="font-mono not-italic text-cream">{{ imprint.register.number }}</span>
              </template>
              <span v-else class="text-cream/55">Eintrag auf Anfrage.</span>
            </dd>
            <dt class="text-mono-eyebrow mt-6 text-cream/55">Umsatzsteuer-ID</dt>
            <dd class="text-editorial text-xl leading-relaxed text-cream/85 md:text-2xl">
              <span v-if="imprint.vatId" class="font-mono not-italic text-cream">{{ imprint.vatId }}</span>
              <span v-else class="text-cream/55">Wird nicht ausgewiesen.</span>
            </dd>
          </div>
        </dl>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════════════
         RANGE II — Kontakt
    ══════════════════════════════════════════════════════════════════ -->
    <section class="relative border-b border-cream/10 bg-ink-soft">
      <div class="mx-auto max-w-[1600px] px-4 py-20 md:px-8 md:py-28">
        <div class="grid grid-cols-12 items-end gap-x-6 gap-y-6 mb-12">
          <div class="col-span-12 lg:col-span-7">
            <span class="text-mono-eyebrow text-cream/60">Range II — Kontakt</span>
            <h2 class="text-display-xl mt-4 text-cream">
              Wo uns<br>
              <span class="text-pop-orange">erreichen.</span>
            </h2>
          </div>
          <div class="col-span-12 lg:col-span-5">
            <p class="text-editorial text-balance text-xl text-cream/85 md:text-2xl">
              Direkter Draht für Anfragen, Pressekontakt oder rechtliche
              Mitteilungen — kein Kontaktformular, kein Ticket-System.
            </p>
          </div>
        </div>

        <ul class="divide-y divide-cream/10 border-y border-cream/10">
          <li>
            <a
              :href="`tel:${imprint.contact.phoneTel}`"
              class="contact-row group grid grid-cols-12 items-center gap-x-6 px-1 py-8 transition-colors duration-500 md:py-10"
            >
              <span class="col-span-12 flex items-center gap-3 md:col-span-3">
                <Icon name="mdi:phone-outline" class="text-2xl text-cream/55 transition-colors group-hover:text-pop-yellow" />
                <span class="text-mono-eyebrow text-cream/55">Telefon</span>
              </span>
              <span class="col-span-9 md:col-span-7">
                <span class="text-display-md text-2xl text-cream transition-colors duration-500 md:text-4xl group-hover:text-pop-yellow">
                  {{ imprint.contact.phone }}
                </span>
              </span>
              <span
                class="col-span-3 justify-self-end text-mono-eyebrow text-cream/40 transition-all duration-500 group-hover:text-pop-yellow md:col-span-2"
              >
                <span class="contact-row__chev">→</span>
              </span>
            </a>
          </li>
          <li>
            <a
              :href="`mailto:${imprint.contact.email}`"
              class="contact-row group grid grid-cols-12 items-center gap-x-6 px-1 py-8 transition-colors duration-500 md:py-10"
            >
              <span class="col-span-12 flex items-center gap-3 md:col-span-3">
                <Icon name="mdi:email-outline" class="text-2xl text-cream/55 transition-colors group-hover:text-pop-magenta" />
                <span class="text-mono-eyebrow text-cream/55">E-Mail</span>
              </span>
              <span class="col-span-9 md:col-span-7">
                <span class="text-display-md text-2xl text-cream transition-colors duration-500 md:text-4xl group-hover:text-pop-magenta">
                  {{ imprint.contact.email }}
                </span>
              </span>
              <span
                class="col-span-3 justify-self-end text-mono-eyebrow text-cream/40 transition-all duration-500 group-hover:text-pop-magenta md:col-span-2"
              >
                <span class="contact-row__chev">→</span>
              </span>
            </a>
          </li>
        </ul>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════════════
         RANGE III — Verantwortlich nach § 18 Abs. 2 MStV
    ══════════════════════════════════════════════════════════════════ -->
    <section class="relative border-b border-cream/10">
      <div class="mx-auto max-w-[1600px] px-4 py-20 md:px-8 md:py-28">
        <div class="grid grid-cols-12 items-end gap-x-6 gap-y-6 mb-12">
          <div class="col-span-12 lg:col-span-7">
            <span class="text-mono-eyebrow text-cream/60">Range III — Verantwortlich für den Inhalt</span>
            <h2 class="text-display-xl mt-4 text-cream">
              Wer den<br>
              <span class="text-pop-magenta">Hut aufhat.</span>
            </h2>
          </div>
          <div class="col-span-12 lg:col-span-5">
            <p class="text-editorial text-balance text-xl text-cream/85 md:text-2xl">
              Verantwortlich für journalistisch-redaktionelle Inhalte gemäß
              <span class="not-italic font-mono text-cream">§ 18 Abs. 2 MStV</span>
              — das umfasst die Field Notes und alle redaktionellen Beiträge
              auf wolves.ink.
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-x-12 gap-y-8 border-t border-cream/15 pt-12 md:grid-cols-2">
          <div class="space-y-3">
            <span class="text-mono-eyebrow text-cream/55">Name</span>
            <p class="text-display-md text-3xl text-cream md:text-4xl">
              {{ imprint.responsibleEditor.name }}
            </p>
          </div>
          <div class="space-y-3">
            <span class="text-mono-eyebrow text-cream/55">Anschrift</span>
            <p class="text-editorial text-xl leading-relaxed text-cream/85 md:text-2xl">
              {{ imprint.responsibleEditor.address.street }}<br>
              {{ imprint.responsibleEditor.address.zip }} {{ imprint.responsibleEditor.address.city }}<br>
              {{ imprint.responsibleEditor.address.country }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════════════
         RANGE IV — Streitschlichtung
    ══════════════════════════════════════════════════════════════════ -->
    <section class="relative border-b border-cream/10 bg-ink-soft">
      <div class="mx-auto max-w-[1600px] px-4 py-20 md:px-8 md:py-28">
        <div class="grid grid-cols-12 items-end gap-x-6 gap-y-6 mb-12">
          <div class="col-span-12 lg:col-span-7">
            <span class="text-mono-eyebrow text-cream/60">Range IV — Streitschlichtung</span>
            <h2 class="text-display-xl mt-4 text-cream">
              Im<br>
              <span class="text-pop-orange">Streitfall.</span>
            </h2>
          </div>
          <div class="col-span-12 lg:col-span-5">
            <p class="text-editorial text-balance text-xl text-cream/85 md:text-2xl">
              Hinweise gemäß Verbraucherstreitbeilegungsgesetz (VSBG)
              und EU-Verordnung Nr. 524/2013.
            </p>
          </div>
        </div>

        <div class="space-y-7 border-t border-cream/15 pt-12 text-pretty leading-relaxed text-lg text-cream/85 md:max-w-[62ch]">
          <p>
            Die Europäische Kommission stellt eine Plattform zur
            Online-Streitbeilegung (OS) bereit, die Sie unter
            <a
              href="https://ec.europa.eu/consumers/odr"
              target="_blank"
              rel="noreferrer noopener"
              class="text-cream underline decoration-pop-yellow decoration-2 underline-offset-4 transition-colors hover:text-pop-yellow"
            >ec.europa.eu/consumers/odr</a>
            finden. Unsere E-Mail-Adresse für rechtliche Mitteilungen lautet
            <a
              :href="`mailto:${imprint.contact.email}`"
              class="text-cream underline decoration-pop-magenta decoration-2 underline-offset-4 transition-colors hover:text-pop-magenta"
            >{{ imprint.contact.email }}</a>.
          </p>
          <p>
            Wir sind weder bereit noch verpflichtet, an Streitbeilegungs­verfahren
            vor einer Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════════════
         RANGE V — Haftungsausschluss
    ══════════════════════════════════════════════════════════════════ -->
    <section class="relative border-b border-cream/10">
      <div class="mx-auto max-w-[1600px] px-4 py-20 md:px-8 md:py-28">
        <div class="grid grid-cols-12 gap-x-6 gap-y-8 mb-12">
          <div class="col-span-12">
            <span class="text-mono-eyebrow text-cream/60">Range V — Haftungsausschluss</span>
            <h2 class="text-display-xl mt-4 text-cream">
              Das<br>
              <span class="text-pop-yellow">Kleingedruckte.</span>
            </h2>
          </div>
          <div class="col-span-12 lg:col-span-5 lg:col-start-8">
            <p class="text-editorial text-balance text-xl text-cream/85 md:text-2xl">
              Standardklauseln zu Inhalten, externen Links und
              Urheberrechten — knapp gehalten, aber juristisch belastbar.
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-12 border-t border-cream/15 pt-12 md:grid-cols-3">
          <article class="space-y-4">
            <span class="text-mono-eyebrow text-cream/55">§ 1 — Inhalt</span>
            <h3 class="text-display-md text-2xl text-cream">
              Haftung für Inhalte
            </h3>
            <p class="text-pretty leading-relaxed text-cream/80">
              Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene
              Inhalte auf diesen Seiten nach den allgemeinen Gesetzen
              verantwortlich. Nach §§ 8 bis 10 DDG sind wir jedoch nicht
              verpflichtet, übermittelte oder gespeicherte fremde
              Informationen zu überwachen oder nach Umständen zu forschen,
              die auf eine rechtswidrige Tätigkeit hinweisen. Bei
              Bekanntwerden von Rechtsverletzungen entfernen wir die
              betreffenden Inhalte umgehend.
            </p>
          </article>

          <article class="space-y-4">
            <span class="text-mono-eyebrow text-cream/55">§ 2 — Links</span>
            <h3 class="text-display-md text-2xl text-cream">
              Haftung für Links
            </h3>
            <p class="text-pretty leading-relaxed text-cream/80">
              Unser Angebot enthält Links zu externen Websites Dritter, auf
              deren Inhalte wir keinen Einfluss haben. Deshalb können wir
              für diese fremden Inhalte auch keine Gewähr übernehmen. Für
              die Inhalte der verlinkten Seiten ist stets der jeweilige
              Anbieter oder Betreiber der Seiten verantwortlich. Bei
              Bekanntwerden von Rechtsverletzungen werden derartige Links
              umgehend entfernt.
            </p>
          </article>

          <article class="space-y-4">
            <span class="text-mono-eyebrow text-cream/55">§ 3 — Urheberrecht</span>
            <h3 class="text-display-md text-2xl text-cream">
              Urheberrecht
            </h3>
            <p class="text-pretty leading-relaxed text-cream/80">
              Die durch die Seitenbetreiber erstellten Inhalte und Werke
              auf diesen Seiten unterliegen dem deutschen Urheberrecht.
              Quellcode, der unter einer Open-Source-Lizenz veröffentlicht
              wird, bleibt von dieser Klausel unberührt — die jeweilige
              Lizenz im Repository regelt die Nutzung. Downloads und Kopien
              der übrigen Inhalte sind nur für den privaten, nicht
              kommerziellen Gebrauch gestattet.
            </p>
          </article>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════════════
         CLOSING — colophon stamp + marquee bookend
    ══════════════════════════════════════════════════════════════════ -->
    <section class="relative">
      <div class="mx-auto max-w-[1600px] px-4 py-16 md:px-8 md:py-20">
        <div class="flex flex-wrap items-center justify-between gap-6 border-y border-cream/15 py-6">
          <p class="text-mono-meta text-cream/60">
            Quelle: <span class="text-cream">{{ site.domain }}/impressum</span>
          </p>
          <p class="text-mono-meta text-cream/60">
            Zuletzt geprüft — {{ reviewedDisplay }}
          </p>
          <p class="text-mono-meta text-cream/60 hidden md:block">
            <span class="text-cream">{{ fullAddress(imprint.company.address) }}</span>
          </p>
        </div>
      </div>
    </section>

    <MarqueeQuote
      text="Filed once · Updated when it earns it · Howl twice"
      tone="yellow-on-ink"
      separator="✺"
      size-class="text-display-lg"
    />
  </div>
</template>

<style scoped>
/* Contact rows — chevron slides on hover, mirrors the earlier-notes pattern
   from /field-notes so the page reads as part of the same publication. */
.contact-row__chev {
  display: inline-block;
  transition: transform 320ms var(--ease-pop);
}
.contact-row:hover .contact-row__chev,
.contact-row:focus-visible .contact-row__chev {
  transform: translateX(4px);
}

@media (prefers-reduced-motion: reduce) {
  .contact-row__chev { transition: none; }
}
</style>
