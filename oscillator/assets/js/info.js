/* =============================================================
   OSCILLATOR — the bits that cannot be fetched from anywhere.
   Edit this file by hand; nothing regenerates it.
   ============================================================= */

window.OSCILLATOR_INFO = {

  /* Where the contact form goes. Set ONE of these:
       formspreeEndpoint — create a form at https://formspree.io and paste
         the endpoint; the message is posted without leaving the page.
       contactEmail — the form opens the sender's mail client instead.
     With neither set the form says so rather than pretending to send. */
  formspreeEndpoint: "",
  contactEmail: "",

  /* Add shows here and the Events section appears. Leave it empty and the
     whole section removes itself rather than sitting there saying "no
     upcoming shows", which is the one thing a label page should not say.
     date is ISO (YYYY-MM-DD); anything in the past is dropped. */
  events: [
    // { date: "2026-09-12", what: "Oscillator Night", where: "Tehran" },
  ]
};
