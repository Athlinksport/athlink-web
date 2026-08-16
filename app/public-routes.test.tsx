import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TermsPage from "./terms/page";
import PrivacyPage from "./privacy/page";
import SafetyPage from "./safety/page";
import ContactPage from "./contact/page";
describe("public launch routes", () => {
  for (const [name, Page] of [["Terms", TermsPage], ["Privacy", PrivacyPage], ["Safety", SafetyPage], ["Contact", ContactPage]] as const) {
    it(`renders ${name}`, () => {
      render(<Page />);
      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
      expect(screen.getByText(/qualified legal professional/i)).toBeInTheDocument();
    });
  }
});
