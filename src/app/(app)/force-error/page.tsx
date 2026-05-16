// Dev-only: trips the (app) error boundary so we can verify it renders the
// designed state.  Remove this route before final deploy.

export default function ForceErrorPage() {
  throw new Error("Forced error — boundary test. Remove before deploy.");
}
