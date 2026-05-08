/**
 * Legal disclosure data — surfaced on `/impressum`.
 *
 * Why this lives in a data file instead of the page:
 *   1. The Impressum is the single source of legal truth for the studio.
 *      Centralising it means the footer link, the JSON-LD `Organization`
 *      schema and the page itself all read the same names, addresses and
 *      contact channels — no chance of one going stale.
 *   2. Adding the Handelsregister / VAT-ID later only takes one diff.
 *
 * § 5 DDG (Digitale-Dienste-Gesetz, the law that replaced § 5 TMG in May
 * 2024) requires every commercial site addressing or operating in Germany
 * to publish:
 *   - Name and address of the provider
 *   - Authorised representatives (Geschäftsführer)
 *   - Direct contact details (phone + email)
 *   - For UG/GmbH/AG: the commercial register entry (court + number)
 *   - The VAT identification number, if one has been issued
 *
 * Items #4 and #5 are typed as `string | null` because the studio went
 * through a phase where the HRB number wasn't yet final and the VAT-ID
 * hadn't been issued. The page conditionally renders an "auf Anfrage"
 * placeholder when either is null, which is how the disclosure looked
 * during incorporation. They're filled now — keep the nullable types so
 * a future entity (a sister UG, an Einzelunternehmen) can reuse the
 * structure without touching the page.
 *
 * § 18 Abs. 2 MStV (Medienstaatsvertrag) additionally requires a named
 * person responsible for journalistic-editorial content. The Field Notes
 * section qualifies, so we name the same person.
 */
export interface ImprintAddress {
  street: string
  zip: string
  city: string
  country: string
}

export interface Imprint {
  /** Provider per § 5 (1) Nr. 1 DDG */
  company: {
    legalName: string
    /** Short name used in body copy where the legal form would read clunky */
    shortName: string
    /** Vertretungsberechtigter Geschäftsführer per § 5 (1) Nr. 1 DDG */
    director: string
    address: ImprintAddress
  }
  /** Direct contact channels per § 5 (1) Nr. 2 DDG */
  contact: {
    phone: string
    /** International dial-string used for `tel:` links */
    phoneTel: string
    email: string
  }
  /**
   * Handelsregistereintrag per § 5 (1) Nr. 4 DDG. Required for a UG.
   * Fill from the HRB-Auszug before going public on the marketing site.
   */
  register: {
    court: string | null
    number: string | null
  }
  /** USt-IdNr. per § 5 (1) Nr. 6 DDG. Only required if VAT-registered. */
  vatId: string | null
  /**
   * Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV. Same person as
   * the Geschäftsführer here, but kept as its own block because the law
   * doesn't assume that — and because it might diverge later if a
   * dedicated editor joins the studio.
   */
  responsibleEditor: {
    name: string
    address: ImprintAddress
  }
  /** ISO date the Impressum was last reviewed — surfaced as a stamp. */
  reviewedOn: string
}

const studioAddress: ImprintAddress = {
  street: 'Paulstraße 12',
  zip: '15831',
  city: 'Blankenfelde-Mahlow',
  country: 'Deutschland',
}

export const imprint: Imprint = {
  company: {
    legalName: 'Wolves Software UG (haftungsbeschränkt)',
    shortName: 'Wolves Software UG',
    director: 'Marcel Pfeifer',
    address: studioAddress,
  },
  contact: {
    phone: '03379 590521',
    // E.164 format keeps `tel:` links working from foreign mobile networks.
    phoneTel: '+493379590521',
    email: 'support@wolves.ink',
  },
  register: {
    // Confirmed against the HRB-Auszug: Wolves Software UG is filed at
    // Amtsgericht Potsdam, not Cottbus. The trailing "P" on the HRB
    // number is the court letter — Potsdam still issues registry numbers
    // in its own series alongside Cottbus, so don't "tidy up" by
    // dropping the suffix or swapping the court.
    court: 'Amtsgericht Potsdam',
    number: 'HRB 32136 P',
  },
  vatId: 'DE325458467',
  responsibleEditor: {
    name: 'Marcel Pfeifer',
    address: studioAddress,
  },
  reviewedOn: '2026-04-30',
}
